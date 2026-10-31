export default function ScoreBar({score=0}) {
 const n=Number(score), color=n>=80?"bg-emerald-500":n>=60?"bg-amber-500":n>=40?"bg-orange-500":"bg-rose-500";
 return <div className="flex items-center gap-2"><div className="h-2 w-20 rounded bg-slate-100"><div className={`h-2 rounded ${color}`} style={{width:`${n}%`}}/></div><b>{n}</b></div>;
}
