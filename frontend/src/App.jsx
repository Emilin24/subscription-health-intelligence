import {BrowserRouter,Routes,Route,Navigate} from 'react-router-dom'
import {AuthProvider,useAuth} from './context/AuthContext'
import Protected from './components/Protected'
import Layout from './components/Layout'
import Landing from './pages/Landing'
import {Login,Signup} from './pages/Auth'
import {Dashboard,CataloguePage,Subscriptions,Billing,Quotations,Health,Reports,Portal} from './pages/Workspace'
import './styles.css'

function HomeRedirect(){
 const {profile,loading}=useAuth()
 if(loading)return <div className="loading">Loading…</div>
 return <Navigate to={!profile?'/':profile.role==='customer'?'/portal':'/dashboard'} replace/>
}
function AppRoutes(){return <Routes>
 <Route path="/" element={<Landing/>}/>
 <Route path="/login" element={<Login/>}/>
 <Route path="/signup" element={<Signup/>}/>
 <Route element={<Protected/>}>
  <Route element={<Layout/>}>
   <Route path="/dashboard" element={<Protected roles={['admin','staff']}/> }><Route index element={<Dashboard/>}/></Route>
   <Route path="/products" element={<Protected roles={['admin','staff']}/> }><Route index element={<CataloguePage kind="products"/>}/></Route>
   <Route path="/plans" element={<Protected roles={['admin','staff']}/> }><Route index element={<CataloguePage kind="plans"/>}/></Route>
   <Route path="/customers" element={<Protected roles={['admin','staff']}/> }><Route index element={<CataloguePage kind="customers"/>}/></Route>
   <Route path="/taxes" element={<Protected roles={["admin","staff"]}/> }><Route index element={<CataloguePage kind="taxes"/>}/></Route>
   <Route path="/discounts" element={<Protected roles={['admin','staff']}/> }><Route index element={<CataloguePage kind="discounts"/>}/></Route>
   <Route path="/subscriptions" element={<Protected roles={['admin','staff']}/> }><Route index element={<Subscriptions/>}/></Route>
   <Route path="/quotations" element={<Protected roles={['admin','staff']}/> }><Route index element={<Quotations/>}/></Route>
   <Route path="/invoices" element={<Protected roles={['admin','staff']}/> }><Route index element={<Billing/>}/></Route>
   <Route path="/payments" element={<Protected roles={['admin','staff']}/> }><Route index element={<Billing/>}/></Route>
   <Route path="/health" element={<Protected roles={['admin','staff']}/> }><Route index element={<Health/>}/></Route>
   <Route path="/reports" element={<Protected roles={['admin','staff']}/> }><Route index element={<Reports/>}/></Route>
   <Route path="/portal" element={<Protected roles={['customer']}/> }><Route index element={<Portal/>}/></Route>
  </Route>
 </Route>
 <Route path="/home" element={<HomeRedirect/>}/>
 <Route path="*" element={<Navigate to="/home" replace/>}/>
 </Routes>}
export default function App(){return <BrowserRouter><AuthProvider><AppRoutes/></AuthProvider></BrowserRouter>}
