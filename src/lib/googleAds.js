const GOOGLE_ADS_ID = 'AW-18483094940'
const TRIAL_STARTED_SEND_TO = 'AW-18483094940/guOKCLj57IodEJzLtu1E'

let configured = false

export function installGoogleAdsTag() {
  if (typeof window === 'undefined' || typeof document === 'undefined') return false

  window.dataLayer = window.dataLayer || []
  window.gtag = window.gtag || function gtag() { window.dataLayer.push(arguments) }

  if (!document.querySelector(`script[data-helios-google-ads="${GOOGLE_ADS_ID}"]`)) {
    const script = document.createElement('script')
    script.async = true
    script.src = `https://www.googletagmanager.com/gtag/js?id=${GOOGLE_ADS_ID}`
    script.dataset.heliosGoogleAds = GOOGLE_ADS_ID
    document.head.appendChild(script)
  }

  if (!configured) {
    window.gtag('js', new Date())
    window.gtag('config', GOOGLE_ADS_ID)
    configured = true
  }

  return true
}

export function trackTrialStarted(userId) {
  if (!userId || typeof window === 'undefined') return false

  const storageKey = `helios:google-ads:trial-started:${userId}`
  try {
    if (window.localStorage.getItem(storageKey) === '1') return false
  } catch {
    // Tracking should still work when storage is unavailable.
  }

  if (!installGoogleAdsTag()) return false

  window.gtag('event', 'conversion', {
    send_to: TRIAL_STARTED_SEND_TO,
    value: 0,
    currency: 'EUR'
  })

  try {
    window.localStorage.setItem(storageKey, '1')
  } catch {
    // The Google Ads action is configured to count one conversion per ad click.
  }

  return true
}
