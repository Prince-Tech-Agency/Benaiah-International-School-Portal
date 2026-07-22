import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../lib/AuthContext';
import { CLASSES, formatNaira, formatDate, statusBadgeClass } from '../lib/helpers';
import FrondDivider from '../components/FrondDivider';
import { downloadReceipt } from '../lib/receipt';

export default function ParentDashboard() {
  const { user, profile } = useAuth();
  const [students, setStudents] = useState([]);
  const [payments, setPayments] = useState([]);
  const [showAddChild, setShowAddChild] = useState(false);
  const [loading, setLoading] = useState(true);

  const [firstName, setFirstName] = useState('');
  const [surname, setSurname] = useState('');
  const [otherName, setOtherName] = useState('');
  const [studentClass, setStudentClass] = useState(CLASSES[0]);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  async function loadData() {
    setLoading(true);
    const { data: studentRows } = await supabase
      .from('students')
      .select('*')
      .eq('parent_id', user.id)
      .order('created_at', { ascending: true });
    setStudents(studentRows || []);

    const { data: paymentRows } = await supabase
      .from('payments')
      .select('*, students(first_name, surname, class), payment_items(*)')
      .eq('parent_id', user.id)
      .order('created_at', { ascending: false });
    setPayments(paymentRows || []);
    setLoading(false);
  }

  useEffect(() => {
    if (user) loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  async function handleRemoveChild(student) {
    const confirmed = window.confirm(
      `Remove ${student.first_name} ${student.surname}? This will also permanently delete their payment history and receipts.`
    );
    if (!confirmed) return;
    const { error } = await supabase.from('students').delete().eq('id', student.id);
    if (error) {
      alert(`Could not remove this child: ${error.message}`);
      return;
    }
    loadData();
  }
  
  async function handleAddChild(e) {
    e.preventDefault();
    setFormError('');
    if (!firstName.trim() || !surname.trim()) {
      setFormError('First name and surname are required.');
      return;
    }
    setSaving(true);
    const { error } = await supabase.from('students').insert({
      parent_id: user.id,
      first_name: firstName.trim(),
      surname: surname.trim(),
      other_name: otherName.trim() || null,
      class: studentClass,
    });
    setSaving(false);
    if (error) {
      setFormError(error.message);
      return;
    }
    setFirstName('');
    setSurname('');
    setOtherName('');
    setStudentClass(CLASSES[0]);
    setShowAddChild(false);
    loadData();
  }

  return (
    <div className="section">
      <div className="container">
        <h2>Welcome, {profile?.full_name?.split(' ')[0] || 'Parent'}</h2>
        <FrondDivider />

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
          <h3 style={{ margin: 0 }}>My children</h3>
          <button className="btn btn-primary btn-sm" onClick={() => setShowAddChild((s) => !s)}>
            {showAddChild ? 'Cancel' : '+ Add a child'}
          </button>
        </div>

        {showAddChild && (
          <div className="card" style={{ marginBottom: 24 }}>
            {formError && <div className="alert alert-error">{formError}</div>}
            <form onSubmit={handleAddChild}>
              <div className="form-row">
                <div className="field">
                  <label>First name</label>
                  <input value={firstName} onChange={(e) => setFirstName(e.target.value)} required />
                </div>
                <div className="field">
                  <label>Surname</label>
                  <input value={surname} onChange={(e) => setSurname(e.target.value)} required />
                </div>
              </div>
              <div className="form-row">
                <div className="field">
                  <label>Other name (optional)</label>
                  <input value={otherName} onChange={(e) => setOtherName(e.target.value)} />
                </div>
                <div className="field">
                  <label>Class</label>
                  <select value={studentClass} onChange={(e) => setStudentClass(e.target.value)}>
                    {CLASSES.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </div>
              <button className="btn btn-primary" disabled={saving}>
                {saving ? <span className="spinner" /> : 'Save child'}
              </button>
            </form>
          </div>
        )}

        {loading && <p>Loading…</p>}

        {!loading && students.length === 0 && !showAddChild && (
          <div className="card empty-state">
            <p>No children added yet. Add your first child to make a payment.</p>
            <button className="btn btn-primary" onClick={() => setShowAddChild(true)}>+ Add a child</button>
          </div>
        )}

        <div className="grid-3">
          {students.map((s) => (
            <div className="card" key={s.id}>
              <h3 style={{ marginBottom: 4 }}>{s.first_name} {s.surname}</h3>
              <p style={{ marginBottom: 16 }}>Class: <strong>{s.class}</strong></p>
              <Link to={`/dashboard/pay/${s.id}`} className="btn btn-sand btn-block">Make a payment</Link>
            </div>
          ))}
        </div>

        <h3 style={{ marginTop: 44 }}>Payment history</h3>
        <FrondDivider />
        <div className="card" style={{ padding: 0, overflowX: 'auto' }}>
          {payments.length === 0 ? (
            <div className="empty-state">No payments yet.</div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Child</th>
                  <th>Items</th>
                  <th>Amount</th>
                  <th>Date</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {payments.map((p) => (
                  <tr key={p.id}>
                    <td>{p.students?.first_name} {p.students?.surname} <span style={{ color: 'var(--charcoal-soft)' }}>({p.students?.class})</span></td>
                    <td>{p.payment_items?.map((i) => i.category_name).join(', ')}</td>
                    <td>{formatNaira(p.amount)}</td>
                    <td>{formatDate(p.paid_at || p.created_at)}</td>
                    <td><span className={statusBadgeClass(p.status)}>{p.status}</span></td>
                    <td>
                      {p.status === 'success' && (
                        <button className="btn btn-ghost btn-sm" onClick={() => downloadReceipt(p)}>Download receipt</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
