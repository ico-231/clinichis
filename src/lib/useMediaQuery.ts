import { useEffect, useState } from 'react'

/** Theo dõi một media query (vd. màn hẹp kiểu điện thoại) */
export function useMediaQuery(query: string) {
  const [matches, setMatches] = useState(() => typeof window !== 'undefined' && window.matchMedia(query).matches)
  useEffect(() => {
    const mql = window.matchMedia(query)
    const onChange = () => setMatches(mql.matches)
    onChange()
    mql.addEventListener('change', onChange)
    // Dự phòng: vài môi trường (giả lập thiết bị, iframe) không bắn sự kiện change của matchMedia
    window.addEventListener('resize', onChange)
    return () => {
      mql.removeEventListener('change', onChange)
      window.removeEventListener('resize', onChange)
    }
  }, [query])
  return matches
}

/** Dưới mốc md của Tailwind (768px): menu trái chuyển thành ngăn kéo phủ lên nội dung */
export const NARROW_QUERY = '(max-width: 767px)'
