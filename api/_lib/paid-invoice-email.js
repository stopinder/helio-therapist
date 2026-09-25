const LOOPS_TRANSACTIONAL_URL = 'https://app.loops.so/api/v1/transactional';
const HELIOS_PAYMENT_TRANSACTIONAL_ID = 'cmpgtrq0l00fu016wn5dq5d0h';

function invoicePriceIds(invoice) {
  return (invoice.lines?.data || []).map(line =>
    line.pricing?.price_details?.price || line.price?.id || line.price
  );
}

export async function sendPaidInvoiceEmail(invoice, stripe, options = {}) {
  const env = options.env || process.env;
  const expectedPriceId = (env.STRIPE_PRICE_ID || '').trim();
  if (!expectedPriceId) throw new Error('Stripe price configuration missing');

  // Trial invoices are paid in Stripe even though no money changed hands.
  if (invoice.status !== 'paid' || invoice.amount_paid <= 0 ||
      !invoicePriceIds(invoice).includes(expectedPriceId)) return false;

  const apiKey = (env.LOOPS_API_KEY || '').trim();
  const transactionalId = (env.LOOPS_PAYMENT_TRANSACTIONAL_ID || HELIOS_PAYMENT_TRANSACTIONAL_ID).trim();
  if (!apiKey || !transactionalId) throw new Error('Payment email configuration missing');

  let email = invoice.customer_email;
  let name = invoice.customer_name;
  if ((!email || !name) && invoice.customer) {
    const customer = typeof invoice.customer === 'string'
      ? await stripe.customers.retrieve(invoice.customer)
      : invoice.customer;
    if (!customer.deleted) {
      email ||= customer.email;
      name ||= customer.name;
    }
  }
  if (!email) throw new Error('Paid invoice has no customer email');

  const paidAt = invoice.status_transitions?.paid_at || invoice.created;
  const currency = (invoice.currency || '').toUpperCase();
  const dataVariables = {
    userName: name?.trim().split(/\s+/)[0] || 'there',
    companyName: 'Helios',
    amount: new Intl.NumberFormat('en-GB', { style: 'currency', currency }).format(invoice.amount_paid / 100),
    date: new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(paidAt * 1000)),
    invoiceNumber: invoice.number || invoice.id
  };

  const response = await (options.fetchImpl || fetch)(LOOPS_TRANSACTIONAL_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'Idempotency-Key': `helios-invoice-paid-${invoice.id}`
    },
    body: JSON.stringify({ transactionalId, email, dataVariables })
  });
  // Loops returns 409 when a retry reuses an accepted idempotency key.
  if (response.status === 409) return true;
  if (!response.ok) throw new Error(`Loops payment email failed (${response.status})`);
  return true;
}
