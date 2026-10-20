export const mediaSize=n=>n<1048576?`${Math.ceil(n/1024)} KB`:`${(n/1048576).toFixed(1)} MB`;
export async function studioRequest(url,options){const r=await fetch(url,options);const j=await r.json().catch(()=>({}));if(!r.ok)throw Error(j.error||'The request could not be completed. Please try again.');return j;}
