const { getSupabaseAdmin, getUserFromAuthHeader } = require('./_supabaseAdmin');

function generateReference() {
  const random = Math.random().toString(36).slice(2, 10).toUpperCase();
  return `BIS-${Date.now()}-${random}`;
}

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  try {
    const supabaseAdmin = getSupabaseAdmin();
    const user = await getUserFromAuthHeader(supabaseAdmin, event.headers.authorization);
    if (!user) {
      return { statusCode: 401, body: JSON.stringify({ error: 'You must be logged in to make a payment.' }) };
    }

    const { studentId, categoryIds, email } = JSON.parse(event.body || '{}');
    if (!studentId || !Array.isArray(categoryIds) || categoryIds.length === 0) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Select a student and at least one payment category.' }) };
    }

    // Confirm the student actually belongs to this parent.
    const { data: student, error: studentError } = await supabaseAdmin
      .from('students')
      .select('*')
      .eq('id', studentId)
      .eq('parent_id', user.id)
      .single();
    if (studentError || !student) {
      return { statusCode: 404, body: JSON.stringify({ error: 'Student not found on your account.' }) };
    }

    // Never trust a client-supplied amount — recompute from the database.
    const { data: categories, error: catError } = await supabaseAdmin
      .from('payment_categories')
      .select('*')
      .in('id', categoryIds)
      .eq('is_active', true);
    if (catError || !categories || categories.length === 0) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Selected payment categories are no longer available.' }) };
    }

    const amount = categories.reduce((sum, c) => sum + Number(c.amount), 0);
    const reference = generateReference();

    const { data: payment, error: paymentError } = await supabaseAdmin
      .from('payments')
      .insert({
        student_id: student.id,
        parent_id: user.id,
        amount,
        currency: 'NGN',
        reference,
        status: 'pending',
      })
      .select()
      .single();
    if (paymentError) throw paymentError;

    const items = categories.map((c) => ({
      payment_id: payment.id,
      category_id: c.id,
      category_name: c.name,
      amount: c.amount,
    }));
    const { error: itemsError } = await supabaseAdmin.from('payment_items').insert(items);
    if (itemsError) throw itemsError;

    const siteUrl = process.env.URL || process.env.DEPLOY_PRIME_URL || 'http://localhost:5173';

    const paystackResp = await fetch('https://api.paystack.co/transaction/initialize', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: email || user.email,
        amount: Math.round(amount * 100), // Paystack expects kobo
        reference,
        currency: 'NGN',
        callback_url: `${siteUrl}/payment/callback`,
        metadata: {
          student_id: student.id,
          parent_id: user.id,
          student_name: `${student.first_name} ${student.surname}`,
        },
      }),
    });

    const paystackData = await paystackResp.json();
    if (!paystackResp.ok || !paystackData.status) {
      throw new Error(paystackData.message || 'Paystack could not initialize this transaction.');
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        authorization_url: paystackData.data.authorization_url,
        reference,
      }),
    };
  } catch (err) {
    console.error('initialize-payment error:', err);
    return { statusCode: 500, body: JSON.stringify({ error: err.message || 'Something went wrong.' }) };
  }
};
