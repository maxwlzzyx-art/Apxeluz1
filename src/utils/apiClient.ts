/**
 * Safe API Client
 *
 * Prevents "Unexpected token 'T', 'The page c...' is not valid JSON" errors
 * by checking HTTP status and content-type before parsing JSON.
 * Returns structured error messages for 404, 500, or non-JSON HTML error pages.
 */

export interface ApiResponse<T = any> {
  ok: boolean;
  status: number;
  data?: T;
  error?: string;
  isHtml?: boolean;
}

export async function safeFetchJson<T = any>(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<ApiResponse<T>> {
  try {
    const res = await fetch(input, init);
    const contentType = (res.headers.get('content-type') || '').toLowerCase();
    const isJson = contentType.includes('application/json');

    if (isJson) {
      try {
        const data = await res.json();
        if (!res.ok) {
          return {
            ok: false,
            status: res.status,
            error: data?.error || `Server returned error status ${res.status}`,
            data,
          };
        }
        return {
          ok: true,
          status: res.status,
          data,
        };
      } catch (parseErr: any) {
        return {
          ok: false,
          status: res.status,
          error: `Malformed JSON payload received (${res.status}): ${parseErr?.message}`,
        };
      }
    }

    // Response is NOT JSON (e.g. Vercel 404 HTML page: "The page could not be found")
    const text = await res.text();
    const isHtml =
      text.trim().startsWith('<') ||
      text.toLowerCase().includes('the page could not be found') ||
      contentType.includes('text/html');

    return {
      ok: false,
      status: res.status,
      isHtml,
      error:
        res.status === 404
          ? 'Backend endpoint is not deployed on this server (HTTP 404).'
          : `Server returned non-JSON response (${res.status}).`,
    };
  } catch (netErr: any) {
    return {
      ok: false,
      status: 0,
      error: netErr?.message || 'Network connection failed.',
    };
  }
}
