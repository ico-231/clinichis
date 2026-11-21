import type { ResultFile } from '@/store/types'

/** Giới hạn tệp kết quả (lưu trong localStorage nên giữ nhỏ) */
export const MAX_RESULT_FILES = 5
export const MAX_FILE_BYTES = 2 * 1024 * 1024

const newId = () => `f_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`

export function readAsDataUrl(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader()
    r.onload = () => resolve(String(r.result))
    r.onerror = () => reject(r.error)
    r.readAsDataURL(file)
  })
}

/** Thu nhỏ ảnh (cạnh dài tối đa maxSide) và nén JPEG để tiết kiệm bộ nhớ */
export async function compressImage(source: Blob | HTMLVideoElement | HTMLCanvasElement, maxSide = 960, quality = 0.72): Promise<string> {
  let w: number
  let h: number
  let draw: CanvasImageSource
  if (source instanceof Blob) {
    const url = URL.createObjectURL(source)
    const img = new Image()
    await new Promise<void>((res, rej) => {
      img.onload = () => res()
      img.onerror = () => rej(new Error('Không đọc được ảnh'))
      img.src = url
    })
    URL.revokeObjectURL(url)
    w = img.naturalWidth
    h = img.naturalHeight
    draw = img
  } else if (source instanceof HTMLVideoElement) {
    w = source.videoWidth
    h = source.videoHeight
    draw = source
  } else {
    w = source.width
    h = source.height
    draw = source
  }
  const scale = Math.min(1, maxSide / Math.max(w, h))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(w * scale)
  canvas.height = Math.round(h * scale)
  canvas.getContext('2d')!.drawImage(draw, 0, 0, canvas.width, canvas.height)
  return canvas.toDataURL('image/jpeg', quality)
}

/** Chuyển File người dùng chọn thành ResultFile (ảnh được nén, PDF giữ nguyên) */
export async function toResultFile(file: File): Promise<ResultFile> {
  const isImage = file.type.startsWith('image/')
  if (!isImage && file.type !== 'application/pdf') throw new Error(`${file.name}: chỉ hỗ trợ ảnh (jpg, jpeg, png) hoặc PDF`)
  if (!isImage && file.size > MAX_FILE_BYTES) throw new Error(`${file.name}: tệp PDF vượt quá 2MB (bản demo lưu trong trình duyệt)`)
  const dataUrl = isImage ? await compressImage(file) : await readAsDataUrl(file)
  return {
    id: newId(),
    name: isImage ? file.name.replace(/\.\w+$/, '.jpg') : file.name,
    type: isImage ? 'image/jpeg' : file.type,
    size: Math.round((dataUrl.length * 3) / 4),
    dataUrl,
    at: new Date().toISOString(),
  }
}

export const imageResult = (dataUrl: string, name: string): ResultFile => ({
  id: newId(),
  name,
  type: 'image/jpeg',
  size: Math.round((dataUrl.length * 3) / 4),
  dataUrl,
  at: new Date().toISOString(),
})

export const formatBytes = (n: number) => (n >= 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`)
