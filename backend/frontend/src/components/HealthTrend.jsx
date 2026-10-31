import {LineChart,Line,XAxis,YAxis,Tooltip,ResponsiveContainer,CartesianGrid} from "recharts";
export default function HealthTrend({history=[]}) {
 const data=history.map(x=>({date:new Date(x.calculated_at).toLocaleDateString(),score:x.health_score}));
 if(!data.length) return <p className="py-8 text-sm text-slate-500">No history yet. Recalculate to create the first point.</p>;
 return <div className="h-64"><ResponsiveContainer><LineChart data={data}><CartesianGrid strokeDasharray="3 3"/><XAxis dataKey="date"/><YAxis domain={[0,100]}/><Tooltip/><Line dataKey="score" stroke="#2563eb" strokeWidth={2} dot/></LineChart></ResponsiveContainer></div>;
}
