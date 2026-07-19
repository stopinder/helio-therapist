function isZoomHost(url) {
  try {
    return new URL(url).hostname === 'zoom.us' || new URL(url).hostname.endsWith('.zoom.us');
  } catch {
    return false;
  }
}

/**
 * Fetches the exact Zoom-provided transcript URL. The first request always
 * uses the OAuth Bearer token. For a signed cross-host redirect, the signed
 * URL itself carries authorisation and we intentionally do not forward OAuth.
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
