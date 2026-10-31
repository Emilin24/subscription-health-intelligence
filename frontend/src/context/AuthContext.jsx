import {createContext,useContext,useEffect,useState} from 'react'
import {supabase} from '../lib/supabase'
import {api} from '../lib/api'
const AuthContext=createContext(null)
export function AuthProvider({children}){
  const [session,setSession]=useState(null),[profile,setProfile]=useState(null),[loading,setLoading]=useState(true)
 async function load(s) {
  setSession(s);

  if (s?.access_token) {
    try {
      const userProfile = await api('/auth/me');
      console.log('Profile loaded:', userProfile);
      setProfile(userProfile);
    } catch (error) {
      console.error('Failed to load profile:', error);
      setProfile(null);
    }
  } else {
    setProfile(null);
  }

  setLoading(false);
}
  useEffect(()=>{
    if(!supabase){setLoading(false);return}
    supabase.auth.getSession().then(({data})=>load(data.session))
    const {data:{subscription}}=supabase.auth.onAuthStateChange((_event,s)=>{setTimeout(()=>load(s),0)})
    return ()=>subscription.unsubscribe()
  },[])
  async function signIn(email,password){
    const {data,error}=await supabase.auth.signInWithPassword({email,password})
    if(error)throw error
    await load(data.session)
  }
  async function signUp({email,password,full_name,company_name}){
    const {data,error}=await supabase.auth.signUp({email,password,options:{data:{full_name,company_name}}})
    if(error)throw error
    if(data.session) await load(data.session)
    return data
  }
  async function signOut(){await supabase.auth.signOut();setSession(null);setProfile(null)}
  return <AuthContext.Provider value={{session,profile,loading,signIn,signUp,signOut}}>{children}</AuthContext.Provider>
}
export const useAuth=()=>useContext(AuthContext)
