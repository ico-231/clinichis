import { route } from '../server/router'

/** Hàm duy nhất của API (gói Hobby giới hạn 12 hàm). vercel.json viết lại mọi `/api/*` về đây. */
export const GET = route
export const POST = route
export const PUT = route
export const PATCH = route
export const DELETE = route
