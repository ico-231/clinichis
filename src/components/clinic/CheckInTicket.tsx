import { X } from 'lucide-react'
import { useOverlayBehavior } from '@/components/ui/Modal'
import { Portal } from '@/components/ui/Portal'
import { useClinicState } from '@/store/ClinicStore'
import { CLINIC, doctorLabel, GENDER_LABEL, RELATION_LABEL, roomById } from '@/store/catalog'
import { ageLabel, formatDateVN, formatTimeRange } from '@/lib/date'
import { formatPhone } from '@/lib/format'

/**
 * Mã vạch MINH HOẠ: vẽ vạch đen/trắng có độ rộng suy ra từ ký tự (ổn định theo chuỗi),
 * không theo chuẩn Code128 nên không dùng để quét thật.
 */
export function Barcode({ value, height = 34 }: { value: string; height?: number }) {
  const bars: number[] = [2, 1, 1, 2]
  for (const ch of value) {
    const c = ch.charCodeAt(0)
    bars.push((c % 3) + 1, ((c >> 2) % 2) + 1, ((c >> 1) % 3) + 1, (c % 2) + 1)
  }
  bars.push(2, 1, 1, 2, 1)
  const total = bars.reduce((s, n) => s + n, 0)
  let x = 0
  return (
    <div className="flex flex-col items-center">
      <svg viewBox={`0 0 ${total} ${height}`} width={Math.min(total * 1.6, 240)} height={height} aria-label={`Mã vạch ${value}`} preserveAspectRatio="none">
        {bars.map((w, i) => {
          const rect = i % 2 === 0 ? <rect key={i} x={x} y={0} width={w} height={height} fill="black" /> : null
          x += w
          return rect
        })}
      </svg>
      <span className="mt-0.5 font-mono text-[9px] tracking-wide">{value}</span>
    </div>
  )
}

/** Phiếu tiếp nhận dạng in nhiệt (ảnh 030) */
export function CheckInTicket({ visitId, onClose }: { visitId: string | null; onClose: () => void }) {
  if (!visitId) return null
  return <Ticket visitId={visitId} onClose={onClose} />
}

function Ticket({ visitId, onClose }: { visitId: string; onClose: () => void }) {
  useOverlayBehavior(true, onClose)
  const { visits, patients } = useClinicState()
  const visit = visits.find((v) => v.id === visitId)
  const patient = visit ? patients.find((p) => p.id === visit.patientId) : undefined
  if (!visit || !patient) return null
  const rel = patient.relative
  const relName = rel?.fullName || patient.guardianName
  const relPhone = rel?.phone
  const relation = rel?.relation ?? patient.guardianRelation
  const row = (k: string, v: React.ReactNode) => (
    <div className="flex justify-between gap-3">
      <span>{k}</span>
      <span className="text-right uppercase">{v}</span>
    </div>
  )

  return (
    <Portal>
      <div className="fixed inset-0 z-[60] flex animate-fade-in items-center justify-center bg-overlay/50 p-4" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
        <div role="dialog" aria-modal="true" aria-label="Phiếu tiếp nhận" className="w-[240px] animate-pop-in rounded-xl bg-surface p-1.5 shadow-pop">
          <div className="flex justify-end">
            <button type="button" onClick={onClose} className="grid h-6 w-6 place-items-center rounded-md text-ink-4 hover:bg-subtle hover:text-ink" aria-label="Đóng">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="print-area thin-scroll max-h-[70vh] overflow-y-auto border border-line px-2.5 py-2 text-[10.5px] leading-[15px] text-black">
            <p className="text-center font-doc text-[13px] font-bold uppercase">{CLINIC.name}</p>
            <p className="mb-1.5 text-center text-[9px]">{CLINIC.address}</p>
            <Barcode value={visit.code} />
            <div className="my-1.5 flex items-center justify-between border-y border-black py-0.5 text-[13px] font-bold">
              <span>STT:</span>
              <span>{visit.queueNumber}</span>
            </div>
            {row('Bác sĩ', doctorLabel(visit.doctorId))}
            {row('Phòng', roomById(visit.roomId)?.name ?? '—')}
            {row('Ngày khám', `${formatTimeRange(visit.time, visit.endTime)} ${formatDateVN(visit.date)}`)}
            <div className="my-1 border-t border-black" />
            {row('Người bệnh', patient.fullName)}
            {row('ĐT', formatPhone(patient.phone))}
            {row('Tuổi', `${ageLabel(patient.dob, visit.date)} (${GENDER_LABEL[patient.gender]})`)}
            <div className="my-1.5">
              <Barcode value={patient.code} height={24} />
            </div>
            {relName && (
              <>
                <div className="my-1 border-t border-black" />
                {row('Người thân', relName)}
                {relPhone && row('ĐT', `${formatPhone(relPhone)}${relation ? ` (${RELATION_LABEL[relation]})` : ''}`)}
              </>
            )}
          </div>
          <div className="mt-1.5 grid grid-cols-2 gap-1.5">
            <button type="button" onClick={onClose} className="h-8 rounded-md border border-brand text-[12.5px] font-medium text-ink hover:bg-canvas">
              Đóng
            </button>
            <button type="button" onClick={() => window.print()} className="h-8 rounded-md bg-subtle text-[12.5px] font-medium text-ink hover:bg-line">
              In
            </button>
          </div>
        </div>
      </div>
    </Portal>
  )
}
