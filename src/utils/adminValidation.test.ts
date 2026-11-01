import test from 'node:test';
import assert from 'node:assert/strict';
import {
  slugify,
  formatFileSize,
  validateSlug,
  validatePasswordStrength,
  validateItem,
} from './adminValidation';

test('slugify cleans and formats text correctly', () => {
  assert.equal(slugify('Hollow Knight Mod 60fps!'), 'hollow-knight-mod-60fps');
  assert.equal(slugify('  Stardew   Valley Expanded  '), 'stardew-valley-expanded');
  assert.equal(slugify('Minecraft v1.20'), 'minecraft-v120');
});

test('formatFileSize formats MB and GB units as requested in section 6', () => {
  assert.equal(formatFileSize(850, 'MB'), '850 MB');
  assert.equal(formatFileSize(2.5, 'GB'), '2.5 GB');
  assert.equal(formatFileSize('120', 'MB'), '120 MB');
  assert.equal(formatFileSize('', 'MB'), '0 MB');
});

test('validateSlug checks valid url slugs', () => {
  assert.equal(validateSlug('stardew-falley1'), true);
  assert.equal(validateSlug('hollow-knight'), true);
  assert.equal(validateSlug('minecraft-mod'), true);
  assert.equal(validateSlug('Invalid Slug!'), false);
  assert.equal(validateSlug('-leading-dash'), false);
  assert.equal(validateSlug('trailing-dash-'), false);
  assert.equal(validateSlug('double--dash'), false);
});

test('validatePasswordStrength enforces minimum 8 characters with letters and numbers', () => {
  assert.equal(validatePasswordStrength('short').isValid, false);
  assert.equal(validatePasswordStrength('onlyletters').isValid, false);
  assert.equal(validatePasswordStrength('12345678').isValid, false);
  assert.equal(validatePasswordStrength('axeluf123').isValid, true);
  assert.equal(validatePasswordStrength('superSecret2026').isValid, true);
});

test('validateItem catches missing required fields', () => {
  const invalid = validateItem({ title: '' });
  assert.equal(invalid.isValid, false);
  assert.ok(invalid.errors.length >= 2);

  const valid = validateItem({
    title: 'Hollow Knight',
    slug: 'hollow-knight',
    type: 'game',
    fileSizeValue: 1.2,
    fileSizeUnit: 'GB',
  });
  assert.equal(valid.isValid, true);
  assert.equal(valid.errors.length, 0);
});
