import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Activity, ArrowLeft, Eye, EyeOff } from "lucide-react";
import { supabase } from "../lib/supabase";

export default function Signup() {
  const navigate = useNavigate();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setError("");
    setMessage("");
    if (password.length < 8) return setError("Use a password with at least 8 characters.");
    if (password !== confirmPassword) return setError("The passwords do not match.");

    setBusy(true);
    const { data, error: signupError } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: { data: { full_name: fullName.trim() } },
    });
    setBusy(false);

    if (signupError) return setError(signupError.message);
    if (data.session) {
      navigate("/dashboard", { replace: true });
    } else {
      setMessage("Your account has been created. Check your email for a confirmation link, then sign in.");
    }
  }

  return (
    <main className="auth-layout">
      <section className="auth-side"><Link to="/" className="brand brand-on-dark"><span className="brand-mark"><Activity size={20}/></span><span>Brightloop <b>Intelligence</b></span></Link><div className="auth-side-copy"><span className="section-label">GET STARTED</span><h1>Bring your<br/><span>subscriptions into focus.</span></h1><p>Create an account to access Subscription Health Intelligence.</p></div><span className="auth-side-foot">A clearer view of subscription stability.</span></section>
      <section className="auth-main"><div className="auth-card"><Link to="/" className="back-link"><ArrowLeft size={16}/> Back to home</Link><span className="section-label">CREATE ACCOUNT</span><h2>Get started</h2><p className="auth-subtitle">Enter your details to create your account.</p>
        <form onSubmit={submit}>
          <label className="form-label" htmlFor="signup-name">Full name</label><input id="signup-name" className="auth-input" type="text" autoComplete="name" placeholder="Your name" value={fullName} onChange={e=>setFullName(e.target.value)} required />
          <label className="form-label" htmlFor="signup-email">Email address</label><input id="signup-email" className="auth-input" type="email" autoComplete="email" placeholder="you@example.com" value={email} onChange={e=>setEmail(e.target.value)} required />
          <label className="form-label" htmlFor="signup-password">Password</label><div className="password-wrap"><input id="signup-password" className="auth-input" type={showPassword?"text":"password"} autoComplete="new-password" placeholder="At least 8 characters" value={password} onChange={e=>setPassword(e.target.value)} required/><button className="password-toggle" type="button" onClick={()=>setShowPassword(v=>!v)} aria-label={showPassword?"Hide password":"Show password"}>{showPassword?<EyeOff size={17}/>:<Eye size={17}/>}</button></div>
          <label className="form-label" htmlFor="signup-confirm">Confirm password</label><input id="signup-confirm" className="auth-input" type={showPassword?"text":"password"} autoComplete="new-password" placeholder="Re-enter your password" value={confirmPassword} onChange={e=>setConfirmPassword(e.target.value)} required />
          {error && <div className="form-error" role="alert">{error}</div>}
          {message && <div className="form-success" role="status">{message}</div>}
          <button className="button auth-submit" type="submit" disabled={busy}>{busy?"Creating account…":"Create account"}</button>
        </form>
        <p className="auth-switch">Already have an account? <Link to="/login">Sign in</Link></p>
      </div></section>
    </main>
  );
}
