const { getSupabaseAdmin } = require('./_supabaseAdmin');

function generateReceiptNumber(payment) {
  return `RCPT-${payment.created_at.slice(0, 10).replace(/-/g, '')}-${payment.id.slice(0, 6).toUpperCase()}`;
}

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  try {
    const { reference } = JSON.parse(event.body || '{}');
    if (!reference) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Missing payment reference.' }) };
    }

    const supabaseAdmin = getSupabaseAdmin();

    const fetchFullPayment = async () => {
      const { data } = await supabaseAdmin
        .from('payments')
        .select('*, students(first_name, surname, class), payment_items(*)')
        .eq('reference', reference)
        .single();
      return data;
    };

    let payment = await fetchFullPayment();
    if (!payment) {
      return { statusCode: 404, body: JSON.stringify({ error: 'Payment record not found.' }) };
    }

    // Already confirmed (e.g. the webhook beat us to it) — nothing more to do.
    if (payment.status === 'success') {
      return { statusCode: 200, body: JSON.stringify({ payment }) };
    }

    const verifyResp = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
      headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}` },
    });
    const verifyData = await verifyResp.json();

    if (!verifyResp.ok || !verifyData.status) {
      throw new Error(verifyData.message || 'Could not reach Paystack to verify this payment.');
    }

    const paystackStatus = verifyData.data.status; // 'success' | 'failed' | 'abandoned'

    if (paystackStatus === 'success') {
      const receiptNumber = generateReceiptNumber(payment);
      await supabaseAdmin
        .from('payments')
        .update({
          status: 'success',
          paid_at: verifyData.data.paid_at || new Date().toISOString(),
          receipt_number: receiptNumber,
          paystack_data: verifyData.data,
        })
        .eq('reference', reference)
        .eq('status', 'pending'); // idempotent: only flips it once
    } else {
      await supabaseAdmin
        .from('payments')
        .update({ status: 'failed', paystack_data: verifyData.data })
        .eq('reference', reference)
        .eq('status', 'pending');
    }

    payment = await fetchFullPayment();
    return { statusCode: 200, body: JSON.stringify({ payment }) };
  } catch (err) {
    console.error('verify-payment error:', err);
    return { statusCode: 500, body: JSON.stringify({ error: err.message || 'Something went wrong.' }) };
  }
};
