export const DEFAULTS = { hz: 2, snap: true, grid: true, pinLabels: true, names: true, wires: 'elbow', autosave: true, confirmNew: true }
export const HZ = [1, 2, 5, 10, 20]
const FLAGS = ['snap', 'grid', 'pinLabels', 'names', 'autosave', 'confirmNew']

// Anything that comes from storage or the database is checked here before the app uses it.
export const sanitize = (o) => {
  const s = { ...DEFAULTS }
  if (!o || typeof o !== 'object') return s
  if (HZ.includes(Number(o.hz))) s.hz = Number(o.hz)
  for (const k of FLAGS) if (typeof o[k] === 'boolean') s[k] = o[k]
  if (o.wires === 'elbow' || o.wires === 'straight') s.wires = o.wires
  return s
}

const KEY = 'stutr-settings'
export const readLocalSettings = () => {
  try { return sanitize(JSON.parse(localStorage.getItem(KEY))) } catch { return { ...DEFAULTS } }
}
export const writeLocalSettings = (s) => {
  try { localStorage.setItem(KEY, JSON.stringify(s)) } catch { /* storage blocked */ }
}
