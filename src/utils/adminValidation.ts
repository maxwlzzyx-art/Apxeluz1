import { Item } from '../types/admin';
import { isValidHttpUrl } from './urlValidation';

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function formatFileSize(value: number | string, unit: 'MB' | 'GB'): string {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num) || num <= 0) {
    return `0 ${unit}`;
  }
  // Format cleanly (e.g. 850 MB or 2.5 GB)
  return `${num} ${unit}`;
}

export function validateSlug(slug: string): boolean {
  if (!slug || slug.trim().length === 0) return false;
  // Allow alphanumeric and single dashes, no consecutive dashes, no leading/trailing dashes
  const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
  return slugRegex.test(slug.trim());
}

export function validatePasswordStrength(password: string): { isValid: boolean; message: string } {
  if (!password || password.length < 8) {
    return { isValid: false, message: 'Password must be at least 8 characters long.' };
  }
  const hasLetter = /[a-zA-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  if (!hasLetter || !hasNumber) {
    return { isValid: false, message: 'Password must include both letters and numbers.' };
  }
  return { isValid: true, message: 'Password meets security requirements.' };
}

export function validateItem(item: Partial<Item>): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!item.title || item.title.trim().length === 0) {
    errors.push('Title is required.');
  }

  if (!item.slug || !validateSlug(item.slug)) {
    errors.push('Valid URL slug is required (lowercase letters, numbers, and hyphens only).');
  }

  if (!item.type || !['game', 'mod', 'app'].includes(item.type)) {
    errors.push('Valid content type (game, mod, or app) is required.');
  }

  if (item.fileSizeValue === undefined || item.fileSizeValue === '' || isNaN(Number(item.fileSizeValue))) {
    errors.push('Valid numeric file size is required.');
  }

  if (item.downloadLinks && Array.isArray(item.downloadLinks)) {
    item.downloadLinks.forEach((link, idx) => {
      if (link.url && !isValidHttpUrl(link.url)) {
        errors.push(`Download mirror #${idx + 1} (${link.name || 'Unnamed'}) must be a valid HTTP or HTTPS destination URL.`);
      }
    });
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

