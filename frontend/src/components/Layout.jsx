import {NavLink,Outlet,useNavigate} from 'react-router-dom'
import {useAuth} from '../context/AuthContext'
import {LogOut,LayoutDashboard,Package,Layers,Users,FileText,Receipt,CreditCard,Activity,BarChart3,Tags,Percent} from 'lucide-react'
const links=[
 ['/dashboard','Overview',LayoutDashboard,['admin','staff']],
 ['/products','Products',Package,['admin','staff']],
 ['/plans','Plans',Layers,['admin','staff']],
 ['/customers','Customers',Users,['admin','staff']],
 ['/quotations','Quotations',FileText,['admin','staff']],
 ['/subscriptions','Subscriptions',Receipt,['admin','staff']],
 ['/invoices','Invoices',FileText,['admin','staff']],
 ['/payments','Payments',CreditCard,['admin','staff']],
 ['/taxes','Taxes',Percent,['admin','staff']],
 ['/discounts','Discounts',Tags,['admin','staff']],
 ['/health','Subscription Health',Activity,['admin','staff']],
 ['/reports','Reports',BarChart3,['admin','staff']],
 ['/portal','My Portal',LayoutDashboard,['customer']]
]
export default function Layout(){
 const {profile,signOut}=useAuth(),nav=useNavigate()
 const role=profile?.role
 return <div className="shell">
  <aside className="sidebar"><div className="brand"><span className="brand-mark">B</span><span>brightloop<small>SUBSCRIPTION CLOUD</small></span></div>
   <div className="side-label">WORKSPACE</div>
   {links.filter(x=>x[3].includes(role)).map(([to,label,Icon])=><NavLink key={to} to={to} className={({isActive})=>`nav-link ${isActive?'active':''}`}><Icon size={17}/>{label}</NavLink>)}
   {role==='admin'&&<div className="side-note">Administrator access</div>}
   <button className="logout" onClick={async()=>{await signOut();nav('/login')}}><LogOut size={17}/> Sign out</button>
  </aside>
  <main className="main"><header className="topbar"><div><span className="eyebrow">BRIGHTLOOP / WORKSPACE</span><h2>{profile?.role==='customer'?'Customer portal':'Subscription operations'}</h2></div><div className="user-chip"><div className="avatar">{(profile?.full_name||profile?.email||'U')[0].toUpperCase()}</div><span>{profile?.full_name||profile?.email}<small>{profile?.role}</small></span></div></header><section className="content"><Outlet/></section></main>
 </div>
}
