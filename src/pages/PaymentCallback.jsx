import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { formatNaira } from '../lib/helpers';
import { downloadReceipt } from '../lib/receipt';

export default function PaymentCallback() {
  const [searchParams] = useSearchParams();
  const reference = searchParams.get('reference') || searchParams.get('trxref');
  const [status, setStatus] = useState('checking'); // checking | success | failed | error
  const [payment, setPayment] = useState(null);
  const [message, setMessage] = useState('');

  useEffect(() => {
    async function verify() {
      if (!reference) {
        setStatus('error');
        setMessage('No payment reference was provided.');
        return;
      }
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        const resp = await fetch('/.netlify/functions/verify-payment', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(session ? { Authorization: `Bearer ${session.access_token}` } : {}),
          },
          body: JSON.stringify({ reference }),
        });
        const result = await resp.json();
        if (!resp.ok) throw new Error(result.error || 'Could not verify payment.');

        setPayment(result.payment);
        setStatus(result.payment.status === 'success' ? 'success' : 'failed');
      } catch (e) {
        setStatus('error');
        setMessage(e.message);
      }
    }
    verify();
  }, [reference]);

  return (
    <div className="section">
      <div className="container" style={{ maxWidth: 560 }}>
        <div className="card" style={{ textAlign: 'center' }}>
          {status === 'checking' && (
            <>
              <div className="spinner dark" style={{ margin: '0 auto 16px' }} />
              <h2>Confirming your payment…</h2>
              <p>This usually takes a few seconds. Please don't close this page.</p>
            </>
          )}
          {status === 'success' && payment && (
            <>
              <h2 style={{ color: 'var(--palm-deep)' }}>Payment successful 🎉</h2>
              <p>
                {formatNaira(payment.amount)} received for {payment.students?.first_name} {payment.students?.surname}.
              </p>
              <p style={{ fontSize: '0.85rem' }}>Reference: {payment.reference}</p>
              <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginTop: 20 }}>
                <button className="btn btn-primary" onClick={() => downloadReceipt(payment)}>Download receipt</button>
                <Link to="/dashboard" className="btn btn-ghost">Back to dashboard</Link>
              </div>
            </>
          )}
          {status === 'failed' && (
            <>
              <h2 style={{ color: 'var(--rust)' }}>Payment not completed</h2>
              <p>We couldn't confirm this payment. If money left your account, it will reflect once Paystack confirms it — check back shortly.</p>
              <Link to="/dashboard" className="btn btn-ghost">Back to dashboard</Link>
            </>
          )}
          {status === 'error' && (
            <>
              <h2>Something went wrong</h2>
              <p>{message}</p>
              <Link to="/dashboard" className="btn btn-ghost">Back to dashboard</Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
