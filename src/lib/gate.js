// What the Free plan includes and what needs a paid plan. Nothing is locked until payments are switched on
// (VITE_BILLING_ON=1), so an unfinished setup never traps anyone behind a paywall they cannot pay.
export const GATING = import.meta.env.VITE_BILLING_ON === '1'
export const FREE_PROJECTS = 5 // saved projects on the Free plan
export const FREE_SCREEN = 64 // biggest LED screen side on the Free plan
export const unlocked = (pro) => !GATING || !!pro

export const THEMES = [
  ['midnight', 'Midnight', false], ['terminal', 'Terminal', true], ['ember', 'Ember', true], ['violet', 'Violet', true],
] // [id, name, needs a paid plan]
