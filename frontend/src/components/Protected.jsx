import {Navigate,Outlet} from 'react-router-dom'
import {useAuth} from '../context/AuthContext'
export default function Protected({roles}){
 const {profile,loading}=useAuth()
 if(loading)return <div className="loading">Loading workspace…</div>
 if(!profile)return <Navigate to="/login" replace/>
 if(roles&&!roles.includes(profile.role))return <Navigate to={profile.role==='customer'?'/portal':'/dashboard'} replace/>
 return <Outlet/>
}
