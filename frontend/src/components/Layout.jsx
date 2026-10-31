import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

import {
  LogOut,
  LayoutDashboard,
  Package,
  Layers,
  Users,
  FileText,
  Receipt,
  CreditCard,
  Activity,
  BarChart3,
  Tags,
  Percent
} from 'lucide-react';

const adminLinks = [
  ['/dashboard', 'Overview', LayoutDashboard],
  ['/products', 'Products', Package],
  ['/plans', 'Plans', Layers],
  ['/customers', 'Customers', Users],
  ['/quotations', 'Quotations', FileText],
  ['/subscriptions', 'Subscriptions', Receipt],
  ['/invoices', 'Invoices', FileText],
  ['/payments', 'Payments', CreditCard],
  ['/taxes', 'Taxes', Percent],
  ['/discounts', 'Discounts', Tags],
  ['/health', 'Subscription Health', Activity],
  ['/reports', 'Reports', BarChart3]
];

const staffLinks = [
  ['/dashboard', 'Overview', LayoutDashboard],
  ['/products', 'Products', Package],
  ['/plans', 'Plans', Layers],
  ['/customers', 'Customers', Users],
  ['/quotations', 'Quotations', FileText],
  ['/subscriptions', 'Subscriptions', Receipt],
  ['/invoices', 'Invoices', FileText],
  ['/payments', 'Payments', CreditCard],
  ['/taxes', 'Taxes', Percent],
  ['/discounts', 'Discounts', Tags],
  ['/health', 'Subscription Health', Activity],
  ['/reports', 'Reports', BarChart3]
];

const customerLinks = [
  ['/portal', 'My Portal', LayoutDashboard]
];

export default function Layout() {
  const { profile, signOut } = useAuth();
  const nav = useNavigate();

  const role = profile?.role;

  const links =
    role === 'admin'
      ? adminLinks
      : role === 'staff'
        ? staffLinks
        : customerLinks;

  async function logout() {
    try {
      await signOut();
      nav('/login', { replace: true });
    } catch (error) {
      console.error('Sign out failed:', error);
    }
  }

  return (
    <div className="shell">

      <aside className="sidebar">

        <div className="brand">
          <span className="brand-mark">B</span>

          <span>
            brightloop
            <small>SUBSCRIPTION CLOUD</small>
          </span>
        </div>

        <div className="side-label">
          {role === 'admin'
            ? 'ADMINISTRATION'
            : role === 'staff'
              ? 'STAFF WORKSPACE'
              : 'CUSTOMER PORTAL'}
        </div>

        <nav>
          {links.map(([to, label, Icon]) => (
            <NavLink
              key={to}
              to={to}
              end
              className={({ isActive }) =>
                `nav-link ${isActive ? 'active' : ''}`
              }
            >
              <Icon size={17} />
              {label}
            </NavLink>
          ))}
        </nav>

        {role === 'admin' && (
          <div className="side-note">
            Administrator access
          </div>
        )}

        {role === 'staff' && (
          <div className="side-note">
            Operational access
          </div>
        )}

        <button
          type="button"
          className="logout"
          onClick={logout}
        >
          <LogOut size={17} />
          Sign out
        </button>

      </aside>

      <main className="main">

        <header className="topbar">

          <div>
            <span className="eyebrow">
              BRIGHTLOOP / WORKSPACE
            </span>

            <h2>
              {role === 'admin'
                ? 'Administrator Workspace'
                : role === 'staff'
                  ? 'Staff Workspace'
                  : 'Customer Portal'}
            </h2>
          </div>

          <div className="user-chip">

            <div className="avatar">
              {(profile?.full_name || profile?.email || 'U')[0].toUpperCase()}
            </div>

            <span>
              {profile?.full_name || profile?.email}
              <small>{role}</small>
            </span>

          </div>

        </header>

        <section className="content">
          <Outlet />
        </section>

      </main>

    </div>
  );
}
