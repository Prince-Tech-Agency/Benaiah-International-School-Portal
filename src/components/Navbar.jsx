import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/AuthContext';
import Logo from './Logo';

export default function Navbar() {
  const { user, profile, signOut } = useAuth();
  const navigate = useNavigate();

  async function handleSignOut() {
    await signOut();
    navigate('/');
  }

  return (
    <nav className="navbar">
      <div className="container">
        <Link to="/" className="brand">
          <Logo size={34} light />
          <div>
            <div className="brand-name">Benaiah International School</div>
            <div className="brand-motto">Courage · Initiative · Success</div>
          </div>
        </Link>
        <div className="nav-links">
          {!user && (
            <>
              <Link to="/login">Log in</Link>
              <Link to="/register" className="btn btn-sand btn-sm">Get started</Link>
            </>
          )}
          {user && profile?.role === 'parent' && (
            <>
              <span className="pill-badge">Parent</span>
              <Link to="/dashboard">My children</Link>
              <button className="linklike" onClick={handleSignOut}>Log out</button>
            </>
          )}
          {user && profile?.role === 'admin' && (
            <>
              <span className="pill-badge">Admin</span>
              <Link to="/admin">Admin panel</Link>
              <button className="linklike" onClick={handleSignOut}>Log out</button>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
