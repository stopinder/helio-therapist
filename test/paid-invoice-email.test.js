import test from 'node:test';
import assert from 'node:assert/strict';
import { sendPaidInvoiceEmail } from '../api/_lib/paid-invoice-email.js';

const env = {
  STRIPE_PRICE_ID: 'price_helios',
  LOOPS_API_KEY: 'test-key',
  LOOPS_PAYMENT_TRANSACTIONAL_ID: 'test-template'
};
const invoice = {
  id: 'in_123', number: 'HEL-001', status: 'paid', amount_paid: 2900,
  currency: 'gbp', created: 1789819200,
  status_transitions: { paid_at: 1789905600 },
  customer_email: 'therapist@example.com', customer_name: 'Ada Lovelace',
  lines: { data: [{ pricing: { price_details: { price: 'price_helios' } } }] }
};

test('sends a positive Helios invoice once with its receipt details', async () => {
  let request;
  const send = async (_, options) => { request = options; return { ok: true, status: 200 }; };
  assert.equal(await sendPaidInvoiceEmail(invoice, {}, { env, fetchImpl: send }), true);
  const body = JSON.parse(request.body);
  assert.equal(body.transactionalId, 'test-template');
  assert.equal(body.email, 'therapist@example.com');
  assert.deepEqual(body.dataVariables, {
    userName: 'Ada', companyName: 'Helios', amount: '£29.00',
    date: '20 September 2026', invoiceNumber: 'HEL-001'
  });
  assert.equal(request.headers['Idempotency-Key'], 'helios-invoice-paid-in_123');
});

test('ignores free trials and invoices for other prices', async () => {
  const fetchImpl = () => { throw new Error('Should not send'); };
  assert.equal(await sendPaidInvoiceEmail({ ...invoice, amount_paid: 0 }, {}, { env, fetchImpl }), false);
  assert.equal(await sendPaidInvoiceEmail({ ...invoice, lines: { data: [{ price: { id: 'price_other' } }] } }, {}, { env, fetchImpl }), false);
});

test('uses the Helios payment template when no template override is configured', async () => {
  let payload;
  await sendPaidInvoiceEmail(invoice, {}, {
    env: { STRIPE_PRICE_ID: env.STRIPE_PRICE_ID, LOOPS_API_KEY: env.LOOPS_API_KEY },
    fetchImpl: async (_, options) => {
      payload = JSON.parse(options.body);
      return { ok: true, status: 200 };
    }
  });
  assert.equal(payload.transactionalId, 'cmpgtrq0l00fu016wn5dq5d0h');
});

test('retries failed sends and accepts an idempotent replay', async () => {
  await assert.rejects(sendPaidInvoiceEmail(invoice, {}, {
    env, fetchImpl: async () => ({ ok: false, status: 503 })
  }), /Loops payment email failed \(503\)/);
  assert.equal(await sendPaidInvoiceEmail(invoice, {}, {
    env, fetchImpl: async () => ({ ok: false, status: 409 })
  }), true);
});
