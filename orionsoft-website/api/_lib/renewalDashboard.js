const SOURCES = [
  ['olm','https://olm-api-production-85fe.up.railway.app/api/v1/billing/service/overview'],
  ['schoolcore',process.env.SCHOOLCORE_RENEWAL_OVERVIEW_URL],
  ['compliancecore','https://compliancecore-api-production.up.railway.app/api/payments/renewal-overview'],
  ['crm','https://orion-crm-app.vercel.app/api/platform-billing/renewal-overview'],
];
export async function loadRenewalDashboard(){
  const key=process.env.RENEWAL_DASHBOARD_API_KEY;
  if(!key)throw Error('The renewal dashboard connection is not configured.');
  const results=await Promise.all(SOURCES.map(async([name,url])=>{
    if(!url)return {name,customers:[],unavailable:true};
    try{
      const r=await fetch(url,{headers:{'X-Renewal-Dashboard-Key':key},signal:AbortSignal.timeout(8000)});
      if(!r.ok)throw Error();const data=await r.json();
      if(!Array.isArray(data.customers))throw Error();
      return {name,customers:data.customers};
    }catch{return {name,customers:[],unavailable:true};}
  }));
  return {customers:results.flatMap(x=>x.customers),sources:results.map(({name,unavailable})=>({name,available:!unavailable}))};
}
