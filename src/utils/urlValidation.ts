/**
 * Safe URL validation and external redirect utilities for APXELUZ
 * Enforces strict HTTP / HTTPS validation and blocks script schemes
 */

export function isValidHttpUrl(urlString: unknown): boolean {
  if (typeof urlString !== 'string') return false;
  const trimmed = urlString.trim();
  if (!trimmed) return false;

  // Explicitly block dangerous scheme prefixes before and after parsing
  const lower = trimmed.toLowerCase();
  if (
    lower.startsWith('javascript:') ||
    lower.startsWith('data:') ||
    lower.startsWith('vbscript:') ||
    lower.startsWith('blob:') ||
    lower.startsWith('file:')
  ) {
    return false;
  }

  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Safely redirects/opens an external download destination URL in a new browser tab.
 * Does NOT force download, create Blobs, use the download attribute, or fetch via JS.
 * Opens the external hosting service page directly.
 */
export function safeOpenExternalUrl(url: string, target: string = '_blank'): boolean {
  if (!isValidHttpUrl(url)) {
    console.error('Invalid or disallowed download URL scheme:', url);
    return false;
  }

  try {
    const newWindow = window.open(url, target, 'noopener,noreferrer');
    if (!newWindow && typeof window !== 'undefined') {
      // In case popups are blocked, create a temporary anchor without download attribute
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.target = target;
      anchor.rel = 'noopener noreferrer';
      // Never attach the HTML download attribute
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
    }
    return true;
  } catch (err) {
    console.error('Failed to open external download URL:', err);
    return false;
  }
}

export type HostingType = 'drive' | 'mediafire' | 'mega' | 'dropbox' | 'github' | 'cloud' | 'external';

export function getHostingProvider(url: string, name: string = ''): { type: HostingType; label: string } {
  const combined = `${name} ${url}`.toLowerCase();

  if (combined.includes('drive.google.com') || combined.includes('google drive') || combined.includes('gdrive')) {
    return { type: 'drive', label: 'Google Drive' };
  }
  if (combined.includes('mediafire.com') || combined.includes('mediafire')) {
    return { type: 'mediafire', label: 'MediaFire' };
  }
  if (combined.includes('mega.nz') || combined.includes('mega.io') || combined.includes('mega')) {
    return { type: 'mega', label: 'Mega' };
  }
  if (combined.includes('dropbox.com') || combined.includes('dropbox')) {
    return { type: 'dropbox', label: 'Dropbox' };
  }
  if (combined.includes('github.com') || combined.includes('github')) {
    return { type: 'github', label: 'GitHub Releases' };
  }
  return { type: 'cloud', label: 'External Mirror' };
}
