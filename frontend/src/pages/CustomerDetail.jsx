import {useEffect,useState} from "react"; import {ArrowLeft,RefreshCw} from "lucide-react";
import {api} from "../lib/api"; import HealthBadge from "../components/HealthBadge"; import HealthTrend from "../components/HealthTrend";
const factors=[["payment_score","Payment reliability","30%"],["renewal_score","Renewal behaviour","25%"],["activity_score","Subscription activity","20%"],["timeliness_score","Payment timeliness","15%"],["stability_score","Subscription stability","10%"]];
export default function CustomerDetail({id,back}){
 const [d,setD]=useState(null),[history,setHistory]=useState([]),[error,setError]=useState(""),[busy,setBusy]=useState(false);
 async function load(){try{const [detail,h]=await Promise.all([api.detail(id),api.history(id)]);setD(detail);setHistory(h);}catch(e){setError(e.message);}}
 useEffect(()=>{load();},[id]);
 async function recalc(){setBusy(true);try{await api.recalculate(id);await load();}catch(e){setError(e.message);}finally{setBusy(false);}}
 if(!d)return <div className="p-8">{error||"Loading…"}</div>;
 return <main className="min-h-screen bg-slate-50"><div className="mx-auto max-w-6xl p-6"><button className="btn-secondary mb-5" onClick={back}><ArrowLeft size={15}/> Back</button>
 {error&&<p className="mb-3 text-rose-600">{error}</p>}<section className="mb-5 flex flex-wrap items-center justify-between gap-4 rounded-xl border bg-white p-6"><div><p className="text-sm text-slate-500">Subscription {(d.subscription||{}).subscription_number||id.slice(0,8)}</p><h1 className="my-2 text-2xl font-semibold">Health assessment</h1><HealthBadge status={d.health_status}/></div><div className="flex items-center gap-4"><p className="text-4xl font-semibold">{d.health_score}<small className="text-base text-slate-400">/100</small></p><button className="btn" onClick={recalc} disabled={busy}><RefreshCw size={15}/>{busy?"Working…":"Recalculate"}</button></div></section>
 <div className="grid gap-5 lg:grid-cols-2"><section className="panel"><h2 className="font-semibold">Score breakdown</h2><div className="mt-5 space-y-5">{factors.map(([key,label,weight])=><div key={key}><div className="mb-2 flex justify-between text-sm"><span>{label} <span className="text-slate-400">({weight})</span></span><b>{d[key]}/100</b></div><div className="h-2 rounded bg-slate-100"><div className="h-2 rounded bg-blue-600" style={{width:`${d[key]}%`}}/></div></div>)}</div></section>
 <section className="panel"><h2 className="font-semibold">Risk signals</h2><ul className="mt-4 list-disc space-y-2 pl-5 text-sm">{(d.risk_reasons||[]).map((x,i)=><li key={i}>{x}</li>)}</ul><h3 className="mt-6 font-semibold">Recommended actions</h3><ul className="mt-3 space-y-2">{(d.recommended_actions||[]).map((x,i)=><li className="rounded bg-blue-50 p-3 text-sm text-blue-900" key={i}>{x}</li>)}</ul></section>
 <section className="panel lg:col-span-2"><h2 className="font-semibold">Health score trend</h2><HealthTrend history={history}/></section></div></div></main>;
}
