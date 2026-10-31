import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export function Login() {
  const { signIn } = useAuth();
  const nav = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();

    setBusy(true);
    setError('');

    try {
      await signIn(email, password);

      // Redirect through HomeRedirect.
      // Customers go to /portal.
      // Admin and staff go to /dashboard.
      nav('/home', { replace: true });

    } catch (x) {
      setError(x.message || 'Unable to sign in. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthFrame
      title="Welcome back"
      subtitle="Sign in to your Brightloop workspace"
    >
      <form onSubmit={submit}>
        <label>Email</label>

        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Enter your email"
        />

        <label>Password</label>

        <input
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Enter your password"
        />

        {error && <p className="error-text">{error}</p>}

        <button
          type="submit"
          className="btn primary full"
          disabled={busy}
        >
          {busy ? 'Signing in…' : 'Sign in'}
        </button>
      </form>

      <p className="auth-switch">
        New customer? <Link to="/signup">Create an account</Link>
      </p>
    </AuthFrame>
  );
}

export function Signup() {
  const { signUp } = useAuth();
  const nav = useNavigate();

  const [form, setForm] = useState({
    full_name: '',
    company_name: '',
    email: '',
    password: ''
  });

  const [error, setError] = useState('');

  function change(e) {
    setForm({
      ...form,
      [e.target.name]: e.target.value
    });
  }

  async function submit(e) {
    e.preventDefault();
    setError('');

    try {
      const result = await signUp(form);

      if (result.session) {
        nav('/portal', { replace: true });
      } else {
        setError(
          'Account created. Check your email to confirm, then sign in.'
        );
      }
    } catch (x) {
      setError(x.message || 'Unable to create account.');
    }
  }

  return (
    <AuthFrame
      title="Create your account"
      subtitle="Register to manage your subscriptions"
    >
      <form onSubmit={submit}>
        {[
          ['full_name', 'Full name', 'text'],
          ['company_name', 'Company name', 'text'],
          ['email', 'Email', 'email'],
          ['password', 'Password', 'password']
        ].map(([name, label, type]) => (
          <div key={name}>
            <label>{label}</label>

            <input
              name={name}
              type={type}
              required={name !== 'company_name'}
              minLength={type === 'password' ? 9 : undefined}
              value={form[name]}
              onChange={change}
            />
          </div>
        ))}

        <small>
          Password must be at least 9 characters.
          Use uppercase, lowercase and a special character.
        </small>

        {error && <p className="error-text">{error}</p>}

        <button type="submit" className="btn primary full">
          Create account
        </button>
      </form>

      <p className="auth-switch">
        Already registered? <Link to="/login">Sign in</Link>
      </p>
    </AuthFrame>
  );
}

function AuthFrame({ title, subtitle, children }) {
  return (
    <div className="auth-page">
      <div className="auth-brand">
        <span className="brand-mark">B</span>
        <b>brightloop</b>
      </div>

      <div className="auth-card">
        <span className="eyebrow">SUBSCRIPTION CLOUD</span>

        <h1>{title}</h1>
        <p>{subtitle}</p>

        {children}
      </div>

      <div className="auth-footer">
        Subscription operations, made clear.
      </div>
    </div>
  );
}
