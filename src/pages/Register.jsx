import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import Logo from '../components/Logo';

export default function Register() {
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    setLoading(true);
    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName, phone, role: 'parent' } },
    });
    if (signUpError) {
      setError(signUpError.message);
      setLoading(false);
      return;
    }

    // No need to insert a profile row here — a database trigger creates it
    // automatically from the full_name/phone/role passed in above, whether or
    // not email confirmation is required.
    setLoading(false);
    if (data.session) {
      navigate('/dashboard');
    } else {
      setDone(true);
    }
  }

  if (done) {
    return (
      <div className="auth-shell">
        <div className="auth-card card">
          <Logo size={36} />
          <h2>Check your email</h2>
          <p>We've sent a confirmation link to <strong>{email}</strong>. Confirm your address, then log in.</p>
          <Link to="/login" className="btn btn-primary btn-block">Go to login</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-shell">
      <div className="auth-card card">
        <Logo size={36} />
        <h2>Create your parent account</h2>
        <p style={{ marginBottom: 20 }}>One account covers all your children at Benaiah International School.</p>
        {error && <div className="alert alert-error">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="field">
            <label htmlFor="fullName">Your full name</label>
            <input id="fullName" required value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="e.g. Mrs. Ade Johnson" />
          </div>
          <div className="field">
            <label htmlFor="phone">Phone number</label>
            <input id="phone" required value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="080..." />
          </div>
          <div className="field">
            <label htmlFor="email">Email address</label>
            <input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
          </div>
          <div className="field">
            <label htmlFor="password">Password</label>
            <input id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 6 characters" />
          </div>
          <button className="btn btn-primary btn-block" disabled={loading}>
            {loading ? <span className="spinner" /> : 'Create account'}
          </button>
        </form>
        <p style={{ marginTop: 16, fontSize: '0.9rem' }}>
          Already registered? <Link to="/login">Log in</Link>
        </p>
      </div>
    </div>
  );
}
