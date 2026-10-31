import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Activity, ArrowLeft, Eye, EyeOff } from "lucide-react";
import { supabase } from "../lib/supabase";

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setError("");
    setBusy(true);
    const { error: loginError } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setBusy(false);
    if (loginError) setError(loginError.message);
    else navigate("/dashboard", { replace: true });
  }

  return (
    <main className="auth-layout">
      <section className="auth-side"><Link to="/" className="brand brand-on-dark"><span className="brand-mark"><Activity size={20}/></span><span>Brightloop <b>Intelligence</b></span></Link><div className="auth-side-copy"><span className="section-label">SUBSCRIPTION HEALTH INTELLIGENCE</span><h1>See the signals.<br/><span>Understand the risk.</span></h1><p>Bring subscription health indicators into one clear view.</p></div><span className="auth-side-foot">A clearer view of subscription stability.</span></section>
      <section className="auth-main"><div className="auth-card"><Link to="/" className="back-link"><ArrowLeft size={16}/> Back to home</Link><span className="section-label">WELCOME BACK</span><h2>Sign in to your account</h2><p className="auth-subtitle">Enter your details to access the dashboard.</p>
        <form onSubmit={submit}>
          <label className="form-label" htmlFor="login-email">Email address</label><input id="login-email" className="auth-input" type="email" autoComplete="email" placeholder="you@example.com" value={email} onChange={e=>setEmail(e.target.value)} required />
          <label className="form-label" htmlFor="login-password">Password</label><div className="password-wrap"><input id="login-password" className="auth-input" type={showPassword?"text":"password"} autoComplete="current-password" placeholder="Enter your password" value={password} onChange={e=>setPassword(e.target.value)} required/><button className="password-toggle" type="button" onClick={()=>setShowPassword(v=>!v)} aria-label={showPassword?"Hide password":"Show password"}>{showPassword?<EyeOff size={17}/>:<Eye size={17}/>}</button></div>
          {error && <div className="form-error" role="alert">{error}</div>}
          <button className="button auth-submit" type="submit" disabled={busy}>{busy?"Signing in…":"Sign in"}</button>
        </form>
        <p className="auth-switch">Don't have an account? <Link to="/signup">Create one</Link></p>
      </div></section>
    </main>
  );
}
