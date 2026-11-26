import { useMemo, useRef, useState } from "react";
import { Check, PlusCircle, Search, X } from "lucide-react";
import { Popover } from "@/components/ui/Popover";
import { ICD10 } from "@/store/icd10";
import { normalizeText } from "@/lib/format";
import { cn } from "@/lib/cn";
import { Section, type DraftUpdate } from "./ExamSections";
import type { ExamDraft } from "./examDraft";
import type { Diagnosis } from "@/store/types";

const sameDx = (a: Diagnosis, b: Diagnosis) =>
  a.code ? a.code === b.code : !b.code && a.name === b.name;

/** Chẩn đoán ICD-10 trong màn khám */
export function DiagnosisSection({ draft, update }: { draft: ExamDraft; update: DraftUpdate }) {
  return (
    <Section id="sec-diagnosis" title="Chẩn đoán">
      <DiagnosisInput value={draft.diagnoses} onChange={(diagnoses) => update({ diagnoses })} />
    </Section>
  );
}

/** Ô chọn chẩn đoán ICD-10: tìm theo mã hoặc tên (không dấu), cho phép thêm chẩn đoán tự do */
export function DiagnosisInput({
  value,
  onChange,
  placeholder = "Tìm hoặc thêm chẩn đoán (mã ICD-10 / tên bệnh)",
  compact,
}: {
  value: Diagnosis[];
  onChange: (v: Diagnosis[]) => void;
  placeholder?: string;
  /** Bố cục dọc gọn (dùng trong form bệnh án) */
  compact?: boolean;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const anchorRef = useRef<HTMLDivElement>(null);
  const selected = value;

  const results = useMemo(() => {
    const q = normalizeText(query);
    const list = q ? ICD10.filter((d) => normalizeText(`${d.code} ${d.name}`).includes(q)) : ICD10;
    return list.slice(0, 40);
  }, [query]);

  const toggle = (d: Diagnosis) => {
    onChange(
      selected.some((x) => sameDx(x, d)) ? selected.filter((x) => !sameDx(x, d)) : [...selected, d],
    );
  };
  const addFreeText = () => {
    const name = query.trim();
    if (!name) return;
    if (!selected.some((x) => !x.code && x.name === name))
      onChange([...selected, { code: "", name }]);
    setQuery("");
  };

  return (
    <div
      className={cn(
        "grid grid-cols-1 gap-2",
        !compact && "gap-3 md:grid-cols-[minmax(240px,1fr)_2fr]",
      )}
    >
      <div ref={anchorRef} className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-ink-4" />
        <input
          aria-label={placeholder}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setActive(0);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setActive((i) => Math.min(i + 1, results.length - 1));
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setActive((i) => Math.max(i - 1, 0));
            } else if (e.key === "Enter") {
              e.preventDefault();
              if (results[active]) {
                toggle(results[active]);
                setQuery("");
              } else addFreeText();
            } else if (e.key === "Tab") {
              setOpen(false);
            }
          }}
          placeholder={placeholder}
          className="h-9 w-full pr-3 pl-9 rounded-[10px] border border-line-strong bg-surface text-[13px] text-ink outline-none transition placeholder:text-ink-5 hover:border-ink-5 focus:border-brand focus:ring-2 focus:ring-brand/15"
        />
        <Popover
          open={open}
          onClose={() => setOpen(false)}
          anchorRef={anchorRef}
          matchWidth
          className="py-1"
        >
          <ul className="max-h-72 w-[min(520px,90vw)] overflow-auto" role="listbox">
            {results.map((d, i) => {
              const isSel = selected.some((x) => sameDx(x, d));
              return (
                <li key={d.code}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={isSel}
                    onMouseEnter={() => setActive(i)}
                    onClick={() => toggle(d)}
                    className={cn(
                      "flex w-full items-start gap-2 px-3 py-1.5 text-left text-[13px]",
                      i === active && "bg-subtle",
                    )}
                  >
                    <span
                      className={cn(
                        "mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border",
                        isSel ? "border-brand bg-brand text-white" : "border-line-strong",
                      )}
                    >
                      {isSel && <Check className="h-3 w-3" />}
                    </span>
                    <span>
                      <b className="font-semibold text-ink">{d.code}</b> – {d.name}
                    </span>
                  </button>
                </li>
              );
            })}
            {query.trim() && (
              <li className="border-t border-line-soft">
                <button
                  type="button"
                  onClick={addFreeText}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-[13px] text-brand-ink hover:bg-brand-tint"
                >
                  <PlusCircle className="h-4 w-4" />
                  Thêm chẩn đoán “{query.trim()}” (không mã ICD)
                </button>
              </li>
            )}
          </ul>
        </Popover>
      </div>

      <div
        className={cn(
          "flex min-h-9 flex-wrap items-center gap-1.5 rounded-md border border-dashed px-2 py-1.5",
          selected.length ? "border-line" : "border-line-strong",
        )}
      >
        {selected.length === 0 ? (
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="flex w-full items-center justify-center gap-1.5 text-[13px] text-ink-5"
          >
            <PlusCircle className="h-3.5 w-3.5" />
            Thêm chẩn đoán
          </button>
        ) : (
          selected.map((d, i) => (
            <span
              key={`${d.code}-${d.name}`}
              className={cn(
                "inline-flex max-w-full items-center gap-1.5 rounded-md px-2 py-1 text-[12.5px]",
                i === 0
                  ? "bg-brand-tint text-brand-ink ring-1 ring-brand-line"
                  : "bg-subtle text-ink",
              )}
            >
              {i === 0 && (
                <span className="rounded bg-brand px-1 text-[10px] font-semibold text-white uppercase">
                  Chính
                </span>
              )}
              <span className="truncate">
                {d.code ? <b>{d.code}</b> : null} {d.name}
              </span>
              <button
                type="button"
                onClick={() => toggle(d)}
                className="text-ink-5 hover:text-danger-ink"
                aria-label={`Bỏ ${d.name}`}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </span>
          ))
        )}
      </div>
    </div>
  );
}
