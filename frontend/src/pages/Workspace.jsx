import {useEffect,useState} from 'react'
import {get,post,patch} from '../lib/api'
import {PageTitle,Card,Stat,ErrorBox,Loading,Empty} from '../components/UI'

export function Dashboard(){
 const [data,setData]=useState(null),[err,setErr]=useState('')
 useEffect(()=>{get('/reports/overview').then(setData).catch(e=>setErr(e.message))},[])
 if(err)return <ErrorBox error={err}/>
 if(!data)return <Loading/>
 return <><PageTitle title="Overview" subtitle="A snapshot of subscription operations."/><div className="stat-grid"><Stat label="Active subscriptions" value={data.subscriptions_active} detail={`${data.subscriptions_total} total`}/><Stat label="Payments received" value={`₹${Number(data.revenue_received).toLocaleString('en-IN')}`}/><Stat label="Outstanding" value={`₹${Number(data.outstanding).toLocaleString('en-IN')}`}/><Stat label="Overdue invoices" value={data.overdue_invoices}/></div><Card><h3>Operations at a glance</h3><p className="muted">Use the navigation to manage catalogue, subscriptions, billing and customer accounts.</p><div className="quick-grid"><div><b>{data.invoices_total}</b><span>Invoices created</span></div><div><b>{data.subscriptions_active}</b><span>Currently active</span></div></div></Card></>
}

const config={
 products:{title:'Products',subtitle:'Manage subscription products and add-ons.',endpoint:'/products',fields:[['name','Product name','text'],['product_type','Type','text'],['sales_price','Sales price','number'],['cost_price','Cost price','number'],['notes','Notes','text']],columns:['name','product_type','sales_price','cost_price','is_active'],admin:true},
 plans:{title:'Plans',subtitle:'Configure recurring intervals and subscription rules.',endpoint:'/plans',fields:[['name','Plan name','text'],['description','Description','text'],['billing_interval','Billing interval (daily/weekly/monthly/yearly)','text'],['price','Price','number'],['minimum_quantity','Minimum quantity','number']],columns:['name','billing_interval','price','minimum_quantity','is_active'],admin:true},
 customers:{title:'Customers',subtitle:'Customer records and billing details.',endpoint:'/customers',fields:[['name','Customer name','text'],['email','Email','email'],['company_name','Company name','text'],['contact_name','Contact name','text'],['phone','Phone','text']],columns:['name','email','phone','created_at']},
 taxes:{title:'Taxes',subtitle:'Configure tax rates applied to invoice line items.',endpoint:'/taxes',fields:[['name','Tax name','text'],['tax_rate','Rate (%)','number']],columns:['name','tax_rate','is_active'],admin:true},
 discounts:{title:'Discounts',subtitle:'Create fixed or percentage promotions.',endpoint:'/discounts',fields:[['name','Discount name','text'],['discount_type','Type (fixed/percentage)','text'],['discount_value','Value','number'],['minimum_purchase','Minimum purchase','number'],['minimum_quantity','Minimum quantity','number']],columns:['name','discount_type','discount_value','start_date','end_date','is_active'],admin:true}
}
export function CataloguePage({kind}){
 const c=config[kind], [rows,setRows]=useState([]),[form,setForm]=useState({}),[error,setError]=useState(''),[busy,setBusy]=useState(false)
 async function refresh(){try{setRows(await get(c.endpoint)||[]);setError('')}catch(e){setError(e.message)}}
 useEffect(()=>{refresh()},[kind])
 async function submit(e){e.preventDefault();setBusy(true);setError('');try{
  const payload={...form}
  for(const k of ['sales_price','cost_price','price','minimum_quantity','discount_value','minimum_purchase'])if(payload[k]!==undefined&&payload[k]!=='')payload[k]=Number(payload[k])
  if(kind==='plans'){payload.minimum_quantity=payload.minimum_quantity||1}
  await post(c.endpoint,payload);setForm({});await refresh()
 }catch(e){setError(e.message)}finally{setBusy(false)}}
 return <><PageTitle title={c.title} subtitle={c.subtitle}/><ErrorBox error={error}/><div className="two-col"><Card><h3>Add {kind.slice(0,-1)}</h3><form className="stack-form" onSubmit={submit}>{c.fields.map(([name,label,type])=><label key={name}>{label}<input type={type} required={!['notes','description','cost_price','minimum_purchase'].includes(name)} step={type==='number'?'0.01':undefined} value={form[name]??''} onChange={e=>setForm({...form,[name]:e.target.value})}/></label>)}<button className="btn primary" disabled={busy}>{busy?'Saving…':'Save'}</button></form></Card><Card><h3>Existing {c.title.toLowerCase()}</h3><DataTable rows={rows} columns={c.columns}/></Card></div></>
}

export function GenericTable({title,subtitle,endpoint,columns,action}){
 const [rows,setRows]=useState([]),[error,setError]=useState('')
 async function refresh(){try{setRows(await get(endpoint)||[])}catch(e){setError(e.message)}}
 useEffect(()=>{refresh()},[endpoint])
 return <><PageTitle title={title} subtitle={subtitle} action={action}/><ErrorBox error={error}/><Card><DataTable rows={rows} columns={columns}/></Card></>
}
export function DataTable({rows,columns}){
 if(!rows?.length)return <Empty/>
 return <div className="table-wrap"><table><thead><tr>{columns.map(c=><th key={c}>{c.replaceAll('_',' ')}</th>)}</tr></thead><tbody>{rows.map((r,i)=><tr key={r.id||i}>{columns.map(c=><td key={c}>{typeof r[c]==='object'&&r[c]!==null?JSON.stringify(r[c]):String(r[c]??'—')}</td>)}</tr>)}</tbody></table></div>
}

export function Subscriptions(){
 const [rows,setRows]=useState([]),[customers,setCustomers]=useState([]),[plans,setPlans]=useState([]),[customer,setCustomer]=useState(''),[plan,setPlan]=useState(''),[error,setError]=useState('')
 async function refresh(){try{setRows(await get('/subscriptions')||[]);setCustomers(await get('/customers')||[]);setPlans(await get('/plans')||[])}catch(e){setError(e.message)}}
 useEffect(()=>{refresh()},[])
 async function create(e){e.preventDefault();try{await post('/subscriptions',{customer_id:customer,plan_id:plan||null,items:[]});setCustomer('');setPlan('');await refresh()}catch(e){setError(e.message)}}
 return <><PageTitle title="Subscriptions" subtitle="Create and monitor customer subscription contracts."/><ErrorBox error={error}/><Card><h3>Create subscription</h3><form className="inline-form" onSubmit={create}><select required value={customer} onChange={e=>setCustomer(e.target.value)}><option value="">Select customer</option>{customers.map(x=><option value={x.id} key={x.id}>{x.name}</option>)}</select><select value={plan} onChange={e=>setPlan(e.target.value)}><option value="">No plan selected</option>{plans.map(x=><option value={x.id} key={x.id}>{x.name} — ₹{x.price}/{x.billing_interval}</option>)}</select><button className="btn primary">Create</button></form></Card><Card><DataTable rows={rows} columns={['subscription_number','status','start_date','end_date','next_billing_date','renewal_count']}/></Card></>
}

export function Billing(){
 const [rows,setRows]=useState([]),[payments,setPayments]=useState([]),[error,setError]=useState(''),[busy,setBusy]=useState(false),[invoice,setInvoice]=useState(''),[amount,setAmount]=useState('')
 async function refresh(){try{setRows(await get('/invoices')||[]);setPayments(await get('/payments')||[])}catch(e){setError(e.message)}}
 useEffect(()=>{refresh()},[])
 async function run(){setBusy(true);try{const r=await post('/billing/run',{});setError(`Billing run complete: ${r.count} invoice(s) created.`);await refresh()}catch(e){setError(e.message)}finally{setBusy(false)}}
 async function pay(e){e.preventDefault();try{await post('/payments',{invoice_id:invoice,amount:Number(amount),payment_method:'manual'});setInvoice('');setAmount('');await refresh()}catch(e){setError(e.message)}}
 return <><PageTitle title="Invoices & payments" subtitle="Generate recurring invoices and record received payments." action={<button className="btn primary" onClick={run} disabled={busy}>{busy?'Running…':'Run billing'}</button>}/><ErrorBox error={error}/><Card><h3>Record payment</h3><form className="inline-form" onSubmit={pay}><select required value={invoice} onChange={e=>setInvoice(e.target.value)}><option value="">Select invoice</option>{rows.filter(x=>x.status!=='paid'&&x.status!=='cancelled').map(x=><option key={x.id} value={x.id}>{x.invoice_number} · ₹{x.balance_due??x.total}</option>)}</select><input type="number" min="0.01" step="0.01" placeholder="Amount" required value={amount} onChange={e=>setAmount(e.target.value)}/><button className="btn">Record payment</button></form></Card><Card><h3>Invoices</h3><DataTable rows={rows} columns={['invoice_number','status','invoice_date','due_date','total','amount_paid','balance_due']}/></Card><Card><h3>Payments</h3><DataTable rows={payments} columns={['amount','method','status','paid_at','transaction_reference']}/></Card></>
}

export function Quotations(){
 const [rows,setRows]=useState([]),[customers,setCustomers]=useState([]),[customer,setCustomer]=useState(''),[error,setError]=useState('')
 async function refresh(){try{setRows(await get('/quotations')||[]);setCustomers(await get('/customers')||[])}catch(e){setError(e.message)}}
 useEffect(()=>{refresh()},[])
 async function create(e){e.preventDefault();try{await post('/quotations',{customer_id:customer,items:[{quantity:1,unit_price:0}]});await refresh()}catch(e){setError(e.message)}}
 async function convert(id){try{await post(`/quotations/${id}/convert`,{});await refresh()}catch(e){setError(e.message)}}
 return <><PageTitle title="Quotations" subtitle="Prepare quotations and convert accepted quotes into subscriptions."/><ErrorBox error={error}/><Card><form className="inline-form" onSubmit={create}><select required value={customer} onChange={e=>setCustomer(e.target.value)}><option value="">Select customer</option>{customers.map(x=><option key={x.id} value={x.id}>{x.name}</option>)}</select><button className="btn primary">Create draft quotation</button></form></Card><Card><div className="table-wrap"><table><thead><tr><th>Quotation</th><th>Customer</th><th>Status</th><th>Total</th><th>Action</th></tr></thead><tbody>{rows.map(x=><tr key={x.id}><td>{x.quotation_number}</td><td>{x.customers?.name||'—'}</td><td>{x.status}</td><td>{x.total_amount}</td><td><button className="btn small" onClick={()=>convert(x.id)}>Convert</button></td></tr>)}</tbody></table></div></Card></>
}

export function Health() {
  const [summary, setSummary] = useState(null);
  const [rows, setRows] = useState([]);
  const [error, setError] = useState('');

  async function refresh() {
    try {
      const [a, b] = await Promise.all([
        get('/health/summary'),
        get('/health/list')
      ]);

      setSummary(a);
      setRows(b || []);
    } catch (e) {
      setError(e.message);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  async function recalc() {
    try {
      await post('/health/recalculate', {});
      await refresh();
      setError('Health scores recalculated.');
    } catch (e) {
      setError(e.message);
    }
  }

  return (
    <>
      <PageTitle
        title="Subscription Health"
        subtitle="Operational risk signals across payment, renewal, activity, timeliness and stability."
        action={
          <button className="btn primary" onClick={recalc}>
            Recalculate scores
          </button>
        }
      />

      <ErrorBox error={error} />

      {summary && (
        <div className="stat-grid">
          <Stat label="Scored subscriptions" value={summary.total} />
          <Stat label="Average health score" value={`${summary.average}/100`} />

          {Object.entries(summary.counts).map(([k, v]) => (
            <Stat key={k} label={k} value={v} />
          ))}
        </div>
      )}

      <Card>
        <DataTable
          rows={rows}
          columns={[
            'subscription_id',
            'health_score',
            'health_status',
            'calculated_at'
          ]}
        />
      </Card>
    </>
  );
}
export function Reports(){
 const [data,setData]=useState(null),[error,setError]=useState('')
 useEffect(()=>{get('/reports/overview').then(setData).catch(e=>setError(e.message))},[])
 return <><PageTitle title="Reports" subtitle="Revenue, subscription and receivables summary."/><ErrorBox error={error}/>{data&&<div className="stat-grid">{Object.entries(data).map(([k,v])=><Stat key={k} label={k.replaceAll('_',' ')} value={typeof v==='number'&&k.includes('revenue')||k==='outstanding'?`₹${Number(v).toLocaleString('en-IN')}`:v}/>)}</div>}<Card><p className="muted">This report is a current operational snapshot. Date-range exports and cohort analysis can be added as a later reporting enhancement.</p></Card></>
}

export function Portal(){
 const [subs,setSubs]=useState([]),[invoices,setInvoices]=useState([]),[payments,setPayments]=useState([]),[error,setError]=useState('')
 useEffect(()=>{Promise.all([get('/portal/subscriptions'),get('/portal/invoices'),get('/portal/payments')]).then(([a,b,c])=>{setSubs(a||[]);setInvoices(b||[]);setPayments(c||[])}).catch(e=>setError(e.message))},[])
 return <><PageTitle title="My portal" subtitle="Your subscriptions, invoices and payment history."/><ErrorBox error={error}/><Card><h3>My subscriptions</h3><DataTable rows={subs} columns={['subscription_number','status','start_date','expiry_date','next_billing_date']}/></Card><Card><h3>My invoices</h3><DataTable rows={invoices} columns={['invoice_number','status','invoice_date','due_date','total','balance_due']}/></Card><Card><h3>My payments</h3><DataTable rows={payments} columns={['amount','payment_method','method','status','payment_date']}/></Card></>
}
