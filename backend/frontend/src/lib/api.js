import { supabase } from "./supabase";
const BASE = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000/api";
async function call(path, options={}) {
  const {data} = await supabase.auth.getSession();
  if (!data.session?.access_token) throw new Error("Please sign in first.");
  const response = await fetch(`${BASE}${path}`, { ...options, headers:{
    "Content-Type":"application/json", Authorization:`Bearer ${data.session.access_token}`,
    ...(options.headers || {}) }});
  if (!response.ok) { const body=await response.json().catch(()=>({})); throw new Error(body.detail || `HTTP ${response.status}`); }
  return response.json();
}
export const api = {
  summary:()=>call("/health/summary"),
  list:(search="",status="")=>call(`/health/subscriptions?${new URLSearchParams({search,status})}`),
  recalculateAll:()=>call("/health/recalculate-all",{method:"POST"}),
  detail:(id)=>call(`/health/subscriptions/${id}`),
  recalculate:(id)=>call(`/health/subscriptions/${id}/recalculate`,{method:"POST"}),
  history:(id)=>call(`/health/subscriptions/${id}/history`)
};
