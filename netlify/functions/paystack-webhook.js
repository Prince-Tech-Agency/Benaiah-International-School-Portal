const crypto = require('crypto');
const { getSupabaseAdmin } = require('./_supabaseAdmin');

function generateReceiptNumber(payment) {
  return `RCPT-${payment.created_at.slice(0, 10).replace(/-/g, '')}-${payment.id.slice(0, 6).toUpperCase()}`;
}

// This is the endpoint you paste into your Paystack dashboard under
// Settings -> API Keys & Webhooks -> Webhook URL:
//   https://<your-site>.netlify.app/.netlify/functions/paystack-webhook
//
// Paystack calls this automatically the moment a payment clears — this is what makes
// confirmation "automatic" instead of relying on the parent's browser staying open.
exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method not allowed' };
  }

  const secret = process.env.PAYSTACK_SECRET_KEY;
  const signature = event.headers['x-paystack-signature'];
  const rawBody = event.isBase64Encoded ? Buffer.from(event.body || '', 'base64').toString('utf8') : (event.body || '');

  const expectedHash = crypto.createHmac('sha512', secret).update(rawBody).digest('hex');
  if (!signature || signature !== expectedHash) {
    console.warn('paystack-webhook: signature mismatch — rejecting.');
    return { statusCode: 401, body: 'Invalid signature' };
  }

  let payload;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return { statusCode: 400, body: 'Invalid JSON' };
  }

  // Acknowledge anything that isn't a successful charge and stop — no action needed.
  if (payload.event !== 'charge.success') {
    return { statusCode: 200, body: 'ignored' };
  }

  try {
    const supabaseAdmin = getSupabaseAdmin();
    const reference = payload.data.reference;

    const { data: payment } = await supabaseAdmin.from('payments').select('*').eq('reference', reference).single();
    if (!payment) {
      console.warn(`paystack-webhook: no payment found for reference ${reference}`);
      return { statusCode: 200, body: 'no matching payment' };
    }

    if (payment.status === 'success') {
      // Already confirmed, likely by the callback-page verification — nothing more to do.
      return { statusCode: 200, body: 'already processed' };
    }

    const receiptNumber = generateReceiptNumber(payment);
    await supabaseAdmin
      .from('payments')
      .update({
        status: 'success',
        paid_at: payload.data.paid_at || new Date().toISOString(),
        receipt_number: receiptNumber,
        paystack_data: payload.data,
      })
      .eq('reference', reference)
      .eq('status', 'pending');

    return { statusCode: 200, body: 'ok' };
  } catch (err) {
    console.error('paystack-webhook error:', err);
    // Return 200 anyway so Paystack doesn't hammer retries for an internal bug;
    // the payment can still be reconciled manually from the Paystack dashboard.
    return { statusCode: 200, body: 'error logged' };
  }
};
