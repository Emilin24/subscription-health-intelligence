import { Link, Navigate } from "react-router-dom";
import { Activity, ArrowRight, BarChart3, CheckCircle2, CreditCard, ShieldCheck, TrendingUp, Zap } from "lucide-react";

const features = [
  { icon: Activity, title: "Health scoring", text: "Turn subscription activity into an easy-to-understand score from 0 to 100." },
  { icon: ShieldCheck, title: "Early risk signals", text: "Spot payment issues, missed renewals and instability before they become bigger problems." },
  { icon: BarChart3, title: "Clear score breakdown", text: "Understand how payment reliability, renewal behaviour and activity affect each score." },
  { icon: TrendingUp, title: "Track changes over time", text: "Review score history and see whether subscription health is improving or declining." },
];

const steps = [
  ["01", "Connect subscription data", "Use customer, subscription, invoice and payment records."],
  ["02", "Calculate health scores", "Evaluate five weighted dimensions to produce a score out of 100."],
  ["03", "Prioritise action", "Group subscriptions by risk level and investigate the ones that need attention."],
];

export default function Landing({ session }) {
  if (session) return <Navigate to="/dashboard" replace />;

  return (
    <div className="site-shell">
      <header className="site-header">
        <Link to="/" className="brand"><span className="brand-mark"><Activity size={20} /></span><span>Brightloop <b>Intelligence</b></span></Link>
        <nav className="header-nav"><a href="#features">Features</a><a href="#how-it-works">How it works</a><Link to="/login" className="nav-login">Log in</Link><Link to="/signup" className="button button-small">Get started <ArrowRight size={15} /></Link></nav>
      </header>

      <main>
        <section className="hero-section">
          <div className="hero-copy">
            <div className="eyebrow"><span className="eyebrow-dot" /> SUBSCRIPTION HEALTH INTELLIGENCE</div>
            <h1>Know the health of every <span>subscription.</span></h1>
            <p className="hero-description">A clearer view of subscription stability. Analyse payment reliability, renewal behaviour and activity to identify accounts that may need attention.</p>
            <div className="hero-actions"><Link to="/signup" className="button">Get started <ArrowRight size={17} /></Link><Link to="/login" className="button button-outline">Sign in</Link></div>
            <div className="hero-note"><CheckCircle2 size={16} /> Scoring insights from 0–100</div>
          </div>

          <div className="score-preview" aria-label="Illustrative subscription health score preview">
            <div className="preview-top"><div><span className="preview-kicker">HEALTH OVERVIEW</span><h3>Subscription health</h3></div><span className="live-pill"><span /> Overview</span></div>
            <div className="preview-score-row"><div className="score-ring"><div><strong>86</strong><small>/ 100</small></div></div><div className="preview-score-copy"><span className="status-chip healthy">Healthy</span><h4>Strong subscription health</h4><p>Illustrative score breakdown</p></div></div>
            <div className="preview-metrics">
              {[ ["Payment reliability", "92%", "92%"], ["Renewal behaviour", "84%", "84%"], ["Subscription activity", "88%", "88%"] ].map(([label,value,width]) => <div className="metric-line" key={label}><div><span>{label}</span><b>{value}</b></div><div className="metric-track"><span style={{ width }} /></div></div>)}
            </div>
            <div className="preview-footer"><span><Zap size={15} /> Risk signals at a glance</span><span>Sample data</span></div>
          </div>
          <div className="hero-orb orb-one" /><div className="hero-orb orb-two" />
        </section>

        <section className="trust-strip"><span>BUILT TO MAKE SUBSCRIPTION PERFORMANCE EASIER TO UNDERSTAND</span><div><span><CreditCard size={16}/> Payments</span><span><Activity size={16}/> Renewals</span><span><BarChart3 size={16}/> Analytics</span></div></section>

        <section className="content-section" id="features">
          <div className="section-heading"><span className="section-label">CORE CAPABILITIES</span><h2>More than a number.<br/><span>Actionable subscription insight.</span></h2><p>Subscription Health Score brings key indicators together so teams can understand which subscriptions are stable and which deserve a closer look.</p></div>
          <div className="feature-grid">{features.map(({icon:Icon,title,text},index)=><article className="feature-card" key={title}><div className="feature-icon"><Icon size={21}/></div><span className="feature-index">0{index+1}</span><h3>{title}</h3><p>{text}</p></article>)}</div>
        </section>

        <section className="how-section" id="how-it-works">
          <div className="section-heading"><span className="section-label">HOW IT WORKS</span><h2>From subscription data<br/><span>to informed decisions.</span></h2></div>
          <div className="steps-grid">{steps.map(([number,title,text])=><article className="step-card" key={number}><span className="step-number">{number}</span><h3>{title}</h3><p>{text}</p></article>)}</div>
        </section>

        <section className="risk-section"><div><span className="section-label">A SIMPLE RISK LANGUAGE</span><h2>Understand the score<br/>at a glance.</h2><p>Each subscription is grouped into a health category based on its calculated score.</p></div><div className="risk-list"><div><span className="risk-dot dot-healthy"/><b>80–100</b><span>Healthy</span></div><div><span className="risk-dot dot-moderate"/><b>60–79</b><span>Moderate risk</span></div><div><span className="risk-dot dot-risk"/><b>40–59</b><span>At risk</span></div><div><span className="risk-dot dot-critical"/><b>0–39</b><span>Critical</span></div></div></section>

        <section className="cta-section"><div><span className="section-label">GET STARTED</span><h2>Make subscription health<br/>easier to see.</h2><p>Sign in to explore the Subscription Health Intelligence dashboard.</p></div><Link to="/signup" className="button button-light">Create an account <ArrowRight size={17}/></Link></section>
      </main>

      <footer className="site-footer"><Link to="/" className="brand"><span className="brand-mark"><Activity size={18}/></span><span>Brightloop <b>Intelligence</b></span></Link><span>Subscription Health Intelligence · Demo application</span></footer>
    </div>
  );
}
