import test from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeTrxId,
  isValidTrxId,
  normalizeBdMobile,
  parsePositiveBdtAmount,
  isProviderConfigured,
  createEmptyProviderConfigs,
  isPaymentsMigrationMissingError,
} from '../manualPayments';

test('normalizeTrxId strips whitespace, uppercases, and validates alphanumeric TrxID', () => {
  assert.equal(normalizeTrxId('  8n7a 2b9c 1d  '), '8N7A2B9C1D');
  assert.equal(isValidTrxId('8n7a2b9c1d'), true);
  assert.equal(isValidTrxId('ABC123'), true);
  assert.equal(isValidTrxId('ab-12345'), false);
  assert.equal(isValidTrxId('12345'), false);
});

test('normalizeBdMobile supports 01..., 8801..., +8801..., spaces, and Bengali digits', () => {
  assert.equal(normalizeBdMobile('01712345678'), '01712345678');
  assert.equal(normalizeBdMobile('+880 1712-345678'), '01712345678');
  assert.equal(normalizeBdMobile('8801911223344'), '01911223344');
  assert.equal(normalizeBdMobile('০১৭১২৩৪৫৬৭৮'), '01712345678');
  assert.equal(normalizeBdMobile('01112345678'), null);
  assert.equal(normalizeBdMobile('0171234567'), null);
});

test('parsePositiveBdtAmount parses positive integers including Bengali numerals and rejects decimals/zero', () => {
  assert.equal(parsePositiveBdtAmount('2650'), 2650);
  assert.equal(parsePositiveBdtAmount('৳ ২,৬৫০'), 2650);
  assert.equal(parsePositiveBdtAmount(1500), 1500);
  assert.equal(parsePositiveBdtAmount('0'), null);
  assert.equal(parsePositiveBdtAmount('-500'), null);
  assert.equal(parsePositiveBdtAmount('2650.50'), null);
  assert.equal(parsePositiveBdtAmount('abc'), null);
});

test('isProviderConfigured keeps unconfigured or disabled options closed', () => {
  const defaults = createEmptyProviderConfigs();
  assert.equal(isProviderConfigured(defaults.bkash), false);
  assert.equal(isProviderConfigured(defaults.nagad), false);

  assert.equal(
    isProviderConfigured({
      provider: 'bkash',
      is_enabled: true,
      price_bdt: 2650,
      recipient_number: '01712345678',
      payment_method: '',
      instructions: '',
    }),
    false
  );

  assert.equal(
    isProviderConfigured({
      provider: 'bkash',
      is_enabled: true,
      price_bdt: 2650,
      recipient_number: '01712345678',
      payment_method: 'send_money',
      instructions: '',
    }),
    true
  );

  assert.equal(
    isProviderConfigured({
      provider: 'nagad',
      is_enabled: false,
      price_bdt: 2650,
      recipient_number: '01812345678',
      payment_method: 'payment',
      instructions: '',
    }),
    false
  );
});

test('isPaymentsMigrationMissingError identifies Postgres/PostgREST missing schema errors', () => {
  assert.equal(isPaymentsMigrationMissingError({ code: '42P01', message: 'relation does not exist' }), true);
  assert.equal(isPaymentsMigrationMissingError({ code: 'PGRST205', message: 'Could not find the table' }), true);
  assert.equal(isPaymentsMigrationMissingError({ code: 'P0001', message: 'Custom validation error' }), false);
});
