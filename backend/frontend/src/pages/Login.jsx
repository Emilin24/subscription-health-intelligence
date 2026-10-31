import {useState} from "react"; import {supabase} from "../lib/supabase";
export default function Login(){
 const [email,setEmail]=useState(""),[password,setPassword]=useState(""),[error,setError]=useState("");
 async function submit(e){e.preventDefault();setError("");const {error}=await supabase.auth.signInWithPassword({email,password});if(error)setError(error.message);}
 return <main className="grid min-h-screen place-items-center bg-slate-100 p-4"><form onSubmit={submit} className="w-full max-w-sm rounded-2xl bg-white p-8 shadow">
 <p className="text-xs font-bold uppercase tracking-widest text-blue-600">Brightloop Intelligence</p><h1 className="my-3 text-2xl font-semibold">Subscription health</h1>
 <label className="label">Email</label><input className="field" type="email" value={email} onChange={e=>setEmail(e.target.value)} required/>
 <label className="label">Password</label><input className="field" type="password" value={password} onChange={e=>setPassword(e.target.value)} required/>
 {error&&<p className="my-3 text-sm text-rose-600">{error}</p>}<button className="btn mt-5 w-full">Sign in</button></form></main>;
}
