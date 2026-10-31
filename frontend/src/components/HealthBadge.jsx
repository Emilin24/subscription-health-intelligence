const styles={"Healthy":"bg-emerald-50 text-emerald-700","Moderate Risk":"bg-amber-50 text-amber-700","At Risk":"bg-orange-50 text-orange-700","Critical":"bg-rose-50 text-rose-700"};
export default function HealthBadge({status}) { return <span className={`rounded-full px-3 py-1 text-xs font-semibold ${styles[status]||"bg-slate-100 text-slate-600"}`}>{status||"Not scored"}</span>; }
