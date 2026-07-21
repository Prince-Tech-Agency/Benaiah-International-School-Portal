import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../lib/AuthContext';
import { formatNaira } from '../lib/helpers';
import FrondDivider from '../components/FrondDivider';

export default function PaymentPage() {
  const { studentId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [student, setStudent] = useState(null);
  const [categories, setCategories] = useState([]);
  const [selected, setSelected] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    async function load() {
      const { data: studentRow, error: studentErr } = await supabase
        .from('students')
        .select('*')
        .eq('id', studentId)
        .eq('parent_id', user.id)
        .single();
      if (studentErr || !studentRow) {
        setError('That student could not be found on your account.');
        setLoading(false);
        return;
      }
      setStudent(studentRow);

      const { data: cats } = await supabase
        .from('payment_categories')
        .select('*')
        .eq('is_active', true)
        .order('name', { ascending: true });
      setCategories(cats || []);
      setLoading(false);
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studentId, user.id]);

  function toggle(id) {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  const total = categories
    .filter((c) => selected.includes(c.id))
    .reduce((sum, c) => sum + Number(c.amount), 0);

  async function handlePay() {
    setError('');
    if (selected.length === 0) {
      setError('Select at least one item to pay for.');
      return;
    }
    setSubmitting(true);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const resp = await fetch('/.netlify/functions/initialize-payment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          studentId,
          categoryIds: selected,
          email: user.email,
        }),
      });
      const result = await resp.json();
      if (!resp.ok) throw new Error(result.error || 'Could not start payment.');
      window.location.href = result.authorization_url;
    } catch (e) {
      setError(e.message);
      setSubmitting(false);
    }
  }

  if (loading) return <div className="container section"><p>Loading…</p></div>;
  if (error && !student) {
    return (
      <div className="container section">
        <div className="alert alert-error">{error}</div>
        <Link to="/dashboard" className="btn btn-ghost">Back to dashboard</Link>
      </div>
    );
  }

  return (
    <div className="section">
      <div className="container" style={{ maxWidth: 640 }}>
        <Link to="/dashboard" style={{ fontSize: '0.9rem' }}>&larr; Back to dashboard</Link>
        <h2 style={{ marginTop: 12 }}>Pay for {student.first_name} {student.surname}</h2>
        <p>Class: <strong>{student.class}</strong></p>
        <FrondDivider />

        {error && <div className="alert alert-error">{error}</div>}

        {categories.length === 0 ? (
          <div className="card empty-state">No payment categories are open yet. Please check back soon.</div>
        ) : (
          <div className="card">
            <h3>What are you paying for?</h3>
            {categories.map((c) => (
              <label key={c.id} className={`category-check${selected.includes(c.id) ? ' selected' : ''}`}>
                <div>
                  <div style={{ fontWeight: 600 }}>{c.name}</div>
                  {c.description && <div style={{ fontSize: '0.85rem', color: 'var(--charcoal-soft)' }}>{c.description}</div>}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <strong>{formatNaira(c.amount)}</strong>
                  <input type="checkbox" checked={selected.includes(c.id)} onChange={() => toggle(c.id)} />
                </div>
              </label>
            ))}

            <div style={{ display: 'flex', justifyContent: 'space-between', margin: '20px 0', fontSize: '1.1rem' }}>
              <strong>Total</strong>
              <strong>{formatNaira(total)}</strong>
            </div>

            <button className="btn btn-primary btn-block" onClick={handlePay} disabled={submitting || selected.length === 0}>
              {submitting ? <span className="spinner" /> : `Pay ${formatNaira(total)} with Paystack`}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
