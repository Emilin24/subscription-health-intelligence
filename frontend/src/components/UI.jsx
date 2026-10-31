export function PageTitle({title,subtitle,action}){return <div className="page-title"><div><h1>{title}</h1><p>{subtitle}</p></div>{action}</div>}
export function Card({children,className=''}){return <div className={`card ${className}`}>{children}</div>}
export function Stat({label,value,detail}){return <div className="stat"><span>{label}</span><strong>{value??'—'}</strong><small>{detail||''}</small></div>}
export function ErrorBox({error}){return error?<div className="error-box">{String(error)}</div>:null}
export function Loading({children='Loading…'}){return <div className="loading">{children}</div>}
export function Empty({children='No records found.'}){return <div className="empty">{children}</div>}
