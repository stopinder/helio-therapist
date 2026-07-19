function isZoomHost(url) {
  try {
    return new URL(url).hostname === 'zoom.us' || new URL(url).hostname.endsWith('.zoom.us');
  } catch {
    return false;
  }
}

/**
 * Fetches the exact Zoom-provided transcript URL. The first request always
 * carries a Bearer token. A signed cross-host redirect is followed without
 * forwarding OAuth credentials.
 */
export async function downloadZoomTranscript(downloadUrl, accessToken, fetchImpl = fetch) {
  let url = downloadUrl;
  let includeBearer = true;

  for (let redirectCount = 0; redirectCount < 3; redirectCount += 1) {
    const response = await fetchImpl(url, {
      headers: includeBearer ? { Authorization: `Bearer ${accessToken}` } : {},
      redirect: 'manual',
      referrerPolicy: 'no-referrer'
    });

    if (![301, 302, 303, 307, 308].includes(response.status)) return response;

    const location = response.headers.get('location');
    if (!location) return response;
    url = new URL(location, url).toString();
    includeBearer = isZoomHost(url);
  }

  throw new Error('Zoom transcript download exceeded redirect limit');
}

export async function downloadZoomTranscriptWithRetry(downloadUrl, getToken, fetchImpl = fetch) {
  const first = await getToken({ forceRefresh: false });
  let response = await downloadZoomTranscript(downloadUrl, first.accessToken, fetchImpl);
  if (response.status !== 401) return { response, retried: false, refreshState: first.refreshed ? 'pre-expiry' : 'valid' };

  const refreshed = await getToken({ forceRefresh: true });
  response = await downloadZoomTranscript(downloadUrl, refreshed.accessToken, fetchImpl);
  return { response, retried: true, refreshState: '401-retry' };
}
