import {useEffect,useState} from "react";
import {supabase} from "./lib/supabase";
import Login from "./pages/Login"; import Dashboard from "./pages/Dashboard";
export default function App(){
 const [session,setSession]=useState(null),[loading,setLoading]=useState(true);
 useEffect(()=>{supabase.auth.getSession().then(({data})=>{setSession(data.session);setLoading(false);});
 const {data:{subscription}}=supabase.auth.onAuthStateChange((_e,s)=>setSession(s));
 return ()=>subscription.unsubscribe();},[]);
 if(loading)return <p className="p-8">Loading…</p>;
 return session?<Dashboard session={session}/>:<Login/>;
}
