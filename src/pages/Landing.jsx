import { Link } from 'react-router-dom';
import FrondDivider from '../components/FrondDivider';
import Logo from '../components/Logo';

export default function Landing() {
  return (
    <div>
      <section className="hero">
        <div className="container">
          <div className="hero-eyebrow">Parent Payment Portal</div>
          <h1>School fees, books and levies — paid in minutes, not in queues.</h1>
          <p className="lead">
            Register your child, choose what you're paying for, and settle it securely online.
            Your receipt is ready the moment payment clears — no waiting on a bursar's stamp.
          </p>
          <div style={{ display: 'flex', gap: 14, marginTop: 28 }}>
            <Link to="/register" className="btn btn-sand">Create parent account</Link>
            <Link to="/login" className="btn btn-ghost" style={{ color: '#fff', borderColor: 'rgba(255,255,255,0.35)' }}>
              I already have an account
            </Link>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="grid-3">
            <div className="card">
              <div style={{ marginBottom: 14 }}><Logo size={30} /></div>
              <h3>1. Add your child</h3>
              <FrondDivider />
              <p>Enter their name and class — from JSS1 through SS3. Add every child on one account.</p>
            </div>
            <div className="card">
              <div style={{ marginBottom: 14 }}><Logo size={30} /></div>
              <h3>2. Choose what to pay</h3>
              <FrondDivider />
              <p>School fees, books, levies and more — pick one or several, and see the total before you pay.</p>
            </div>
            <div className="card">
              <div style={{ marginBottom: 14 }}><Logo size={30} /></div>
              <h3>3. Pay & download receipt</h3>
              <FrondDivider />
              <p>Pay securely by card, bank transfer or USSD. Your receipt is generated automatically and instantly.</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
