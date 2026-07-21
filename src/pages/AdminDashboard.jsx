import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { CLASSES, formatNaira, formatDate, statusBadgeClass } from '../lib/helpers';
import FrondDivider from '../components/FrondDivider';

export default function AdminDashboard() {
  const [tab, setTab] = useState('payments');
  const [categories, setCategories] = useState([]);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [classFilter, setClassFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const [newName, setNewName] = useState('');
  const [newAmount, setNewAmount] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [savingCategory, setSavingCategory] = useState(false);
  const [catError, setCatError] = useState('');

  async function loadAll() {
    setLoading(true);
    const { data: cats } = await supabase.from('payment_categories').select('*').order('created_at', { ascending: true });
    setCategories(cats || []);

    const { data: pays } = await supabase
      .from('payments')
      .select('*, students(first_name, surname, class), payment_items(*), profiles(full_name, phone)')
      .order('created_at', { ascending: false });
    setPayments(pays || []);
    setLoading(false);
  }

  useEffect(() => {
    loadAll();
  }, []);

  async function handleAddCategory(e) {
    e.preventDefault();
    setCatError('');
    if (!newName.trim() || !newAmount || Number(newAmount) <= 0) {
      setCatError('Enter a name and a valid amount.');
      return;
    }
    setSavingCategory(true);
    const { error } = await supabase.from('payment_categories').insert({
      name: newName.trim(),
      amount: Number(newAmount),
      description: newDescription.trim() || null,
      is_active: true,
    });
    setSavingCategory(false);
    if (error) {
      setCatError(error.message);
      return;
    }
    setNewName('');
    setNewAmount('');
    setNewDescription('');
    loadAll();
  }

  async function toggleActive(cat) {
    await supabase.from('payment_categories').update({ is_active: !cat.is_active }).eq('id', cat.id);
    loadAll();
  }

  function exportCSV() {
    const header = ['Student', 'Class', 'Parent', 'Items', 'Amount', 'Reference', 'Status', 'Date'];
    const rows = filteredPayments.map((p) => [
      `${p.students?.first_name || ''} ${p.students?.surname || ''}`,
      p.students?.class || '',
      p.profiles?.full_name || '',
      (p.payment_items || []).map((i) => i.category_name).join('; '),
      p.amount,
      p.reference,
      p.status,
      formatDate(p.paid_at || p.created_at),
    ]);
    const csv = [header, ...rows].map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `benaiah-payments-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const filteredPayments = payments.filter((p) => {
    if (classFilter && p.students?.class !== classFilter) return false;
    if (statusFilter && p.status !== statusFilter) return false;
    return true;
  });

  const totalCollected = filteredPayments.filter((p) => p.status === 'success').reduce((s, p) => s + Number(p.amount), 0);

  return (
    <div className="section">
      <div className="container">
        <h2>Admin panel</h2>
        <FrondDivider />

        <div style={{ display: 'flex', gap: 10, marginBottom: 28 }}>
          <button className={`btn ${tab === 'payments' ? 'btn-primary' : 'btn-ghost'} btn-sm`} onClick={() => setTab('payments')}>Payments</button>
          <button className={`btn ${tab === 'categories' ? 'btn-primary' : 'btn-ghost'} btn-sm`} onClick={() => setTab('categories')}>Payment categories</button>
        </div>

        {loading && <p>Loading…</p>}

        {!loading && tab === 'categories' && (
          <>
            <div className="card" style={{ marginBottom: 24 }}>
              <h3>Add a payment category</h3>
              {catError && <div className="alert alert-error">{catError}</div>}
              <form onSubmit={handleAddCategory}>
                <div className="form-row">
                  <div className="field">
                    <label>Name</label>
                    <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="e.g. Second Term Fees" />
                  </div>
                  <div className="field">
                    <label>Amount (₦)</label>
                    <input type="number" min="1" value={newAmount} onChange={(e) => setNewAmount(e.target.value)} placeholder="e.g. 85000" />
                  </div>
                </div>
                <div className="field">
                  <label>Description (optional)</label>
                  <input value={newDescription} onChange={(e) => setNewDescription(e.target.value)} placeholder="Shown to parents under the item name" />
                </div>
                <button className="btn btn-primary" disabled={savingCategory}>
                  {savingCategory ? <span className="spinner" /> : 'Add category'}
                </button>
              </form>
            </div>

            <div className="card" style={{ padding: 0 }}>
              <table>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Description</th>
                    <th>Amount</th>
                    <th>Status</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {categories.map((c) => (
                    <tr key={c.id}>
                      <td>{c.name}</td>
                      <td>{c.description || '—'}</td>
                      <td>{formatNaira(c.amount)}</td>
                      <td><span className={c.is_active ? 'badge badge-success' : 'badge badge-failed'}>{c.is_active ? 'Active' : 'Hidden'}</span></td>
                      <td>
                        <button className="btn btn-ghost btn-sm" onClick={() => toggleActive(c)}>
                          {c.is_active ? 'Hide from parents' : 'Reactivate'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {!loading && tab === 'payments' && (
          <>
            <div className="grid-3" style={{ marginBottom: 24 }}>
              <div className="card card-tight">
                <div style={{ fontSize: '0.8rem', color: 'var(--charcoal-soft)' }}>Total collected (filtered)</div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.6rem', fontWeight: 700 }}>{formatNaira(totalCollected)}</div>
              </div>
              <div className="card card-tight">
                <div style={{ fontSize: '0.8rem', color: 'var(--charcoal-soft)' }}>Successful payments</div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.6rem', fontWeight: 700 }}>{filteredPayments.filter((p) => p.status === 'success').length}</div>
              </div>
              <div className="card card-tight">
                <div style={{ fontSize: '0.8rem', color: 'var(--charcoal-soft)' }}>Pending</div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.6rem', fontWeight: 700 }}>{filteredPayments.filter((p) => p.status === 'pending').length}</div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
              <select value={classFilter} onChange={(e) => setClassFilter(e.target.value)} style={{ padding: '9px 12px', borderRadius: 8, border: '1.5px solid var(--line)' }}>
                <option value="">All classes</option>
                {CLASSES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={{ padding: '9px 12px', borderRadius: 8, border: '1.5px solid var(--line)' }}>
                <option value="">All statuses</option>
                <option value="success">Success</option>
                <option value="pending">Pending</option>
                <option value="failed">Failed</option>
              </select>
              <button className="btn btn-ghost btn-sm" onClick={exportCSV} style={{ marginLeft: 'auto' }}>Export CSV</button>
            </div>

            <div className="card" style={{ padding: 0, overflowX: 'auto' }}>
              {filteredPayments.length === 0 ? (
                <div className="empty-state">No payments match this filter.</div>
              ) : (
                <table>
                  <thead>
                    <tr>
                      <th>Student</th>
                      <th>Parent</th>
                      <th>Items</th>
                      <th>Amount</th>
                      <th>Date</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPayments.map((p) => (
                      <tr key={p.id}>
                        <td>{p.students?.first_name} {p.students?.surname} <span style={{ color: 'var(--charcoal-soft)' }}>({p.students?.class})</span></td>
                        <td>{p.profiles?.full_name}<br /><span style={{ fontSize: '0.8rem', color: 'var(--charcoal-soft)' }}>{p.profiles?.phone}</span></td>
                        <td>{(p.payment_items || []).map((i) => i.category_name).join(', ')}</td>
                        <td>{formatNaira(p.amount)}</td>
                        <td>{formatDate(p.paid_at || p.created_at)}</td>
                        <td><span className={statusBadgeClass(p.status)}>{p.status}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
