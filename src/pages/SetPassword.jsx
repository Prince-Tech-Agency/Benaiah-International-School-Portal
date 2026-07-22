import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../lib/AuthContext';
import Logo from '../components/Logo';

export default function SetPassword() {
  const { user, profile } = useAuth();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }
    setLoading(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    navigate(profile?.role === 'admin' ? '/admin' : '/dashboard');
  }

  if (!user) {
    return (
      <div className="auth-shell">
        <div className="auth-card card">
          <Logo size={36} />
          <h2>This link has expired</h2>
          <p>Invitation links only work once and expire after a while. Ask whoever invited you to send a new one.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-shell">
      <div className="auth-card card">
        <Logo size={36} />
        <h2>Welcome to Benaiah International School</h2>
        <p style={{ marginBottom: 20 }}>
          Set a password for <strong>{user.email}</strong> to finish setting up your account.
        </p>
        {error && <div className="alert alert-error">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="field">
            <label htmlFor="password">New password</label>
            <PasswordInput id="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 6 characters" required />
          </div>
          <div className="field">
            <label htmlFor="confirm">Confirm password</label>
            <PasswordInput id="confirm" value={confirm} onChange={(e) => setConfirm(e.target.value)} required />
          </div>
          <button className="btn btn-primary btn-block" disabled={loading}>
            {loading ? <span className="spinner" /> : 'Save password & continue'}
          </button>
        </form>
      </div>
    </div>
  );
}
