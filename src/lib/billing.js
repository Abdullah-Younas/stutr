// Browser side of buying a plan. Loaded only when someone clicks a Subscribe button, so the public pages stay light.
export const BUY_KEY = 'stutr-buy' // the plan someone chose before signing in; Pricing resumes it after they return

const WORDS = {
  student_email: 'The Student plan needs an account with a .edu (or .ac) email. Sign in with your school address, or pick Pro.',
  already_paid: 'You already have an active plan.',
  signin: 'Please sign in first.',
  not_configured: 'Checkout is not set up yet. Please try again later.',
}

// Returns 'login' when the person must sign in first, otherwise sends the browser to Polar's checkout.
export async function startCheckout(plan) {
  const { configured, supabase } = await import('./supabase')
  if (!configured) throw new Error(WORDS.not_configured)
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) { sessionStorage.setItem(BUY_KEY, plan); return 'login' }
  sessionStorage.removeItem(BUY_KEY)
  const { data, error } = await supabase.functions.invoke('polar-checkout', { body: { plan } })
  if (error) {
    const body = await error.context?.json?.().catch(() => null)
    throw new Error(WORDS[body?.error] || 'Could not open checkout. Please try again.')
  }
  window.location.assign(data.url)
  return 'redirect'
}
