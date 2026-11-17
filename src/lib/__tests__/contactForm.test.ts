import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CONTACT_LIMITS,
  isValidContactIdentifier,
  validateContactForm,
} from '../contactForm';

test('isValidContactIdentifier accepts valid emails and phone numbers and rejects garbage', () => {
  assert.equal(isValidContactIdentifier('parent@example.com'), true);
  assert.equal(isValidContactIdentifier('01712345678'), true);
  assert.equal(isValidContactIdentifier('+880 1712-345678'), true);
  assert.equal(isValidContactIdentifier('abc'), false);
  assert.equal(isValidContactIdentifier('123456'), false);
  assert.equal(isValidContactIdentifier('not-an-email@'), false);
});

test('validateContactForm enforces bounds, honeypot, and sanitizes control chars', () => {
  const valid = validateContactForm({
    name: '  আরিফ\nহোসেন ',
    contact: '01712345678',
    message: 'আমি কোর্স সম্পর্কে বিস্তারিত জানতে চাই।',
    website: '',
  });
  assert.equal(valid.ok, true);
  if (valid.ok) {
    assert.equal(valid.value.name, 'আরিফ হোসেন');
  }

  assert.equal(
    validateContactForm({
      name: 'অ',
      contact: '01712345678',
      message: 'আমি কোর্স সম্পর্কে বিস্তারিত জানতে চাই।',
    }).ok,
    false
  );

  assert.equal(
    validateContactForm({
      name: 'অভিভাবক',
      contact: '01712345678',
      message: 'ছোট',
    }).ok,
    false
  );

  assert.equal(
    validateContactForm({
      name: 'অভিভাবক',
      contact: '01712345678',
      message: 'ব'.repeat(CONTACT_LIMITS.MESSAGE_MAX + 1),
    }).ok,
    false
  );

  assert.equal(
    validateContactForm({
      name: 'অভিভাবক',
      contact: '01712345678',
      message: 'আমি কোর্স সম্পর্কে বিস্তারিত জানতে চাই।',
      website: 'https://spam.example.com',
    }).ok,
    false
  );
});
