import { ROUTES } from './routes'

export const SITE = {
  name: 'Stutr',
  url: (import.meta.env.VITE_SITE_URL || 'http://localhost:5173').replace(/\/$/, ''),
  email: import.meta.env.VITE_CONTACT_EMAIL || 'contact@example.com',
  updated: 'November 1, 2026', // change when you edit the privacy policy or terms
}
export const routeMeta = (path) => ROUTES.find((r) => r.path === path)
