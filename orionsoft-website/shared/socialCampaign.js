export const CHANNELS={facebook:{label:'Facebook',url:'https://www.facebook.com/',limit:63206},instagram:{label:'Instagram',url:'https://www.instagram.com/',limit:2200},linkedin:{label:'LinkedIn',url:'https://www.linkedin.com/',limit:3000},x:{label:'X',url:'https://x.com/',limit:280},tiktok:{label:'TikTok',url:'https://www.tiktok.com/',limit:2200},youtube:{label:'YouTube',url:'https://studio.youtube.com/',limit:5000}};
export function campaignCaptions({title,benefit,url,cta='Request a demonstration',tags='#OrionSoftLimited',campaign=''}){
 const headline=String(title||'').trim(),body=String(benefit||'').trim();
 return Object.entries(CHANNELS).map(([platform,p])=>{
  let link=String(url||'').trim();try{const u=new URL(link);u.searchParams.set('utm_source',platform);u.searchParams.set('utm_medium','organic_social');u.searchParams.set('utm_campaign',campaign.toLowerCase().replace(/[^a-z0-9]+/g,'_')||'orion_campaign');link=u.href;}catch{/* Optional state or invalid URL: continue with the explicit fallback. */}
  const clip=(s,n)=>s.length>n?s.slice(0,n-1).replace(/\s+\S*$/,'')+'…':s;
  const short=platform==='x',heading=short?clip(headline,70):headline;
  if(short){try{const u=new URL(url);link=u.origin+u.pathname;if(link.length>100)link='';}catch{link='';}}
  const action=short?clip(String(cta),60):cta,hashtags=short?String(tags).split(/\s+/)[0].slice(0,24):tags;
  const tail=platform==='instagram'||platform==='tiktok'?`${action}. See our profile link or contact Orion Soft Limited.`:`${action}${link?'\n'+link:''}`;
  const fixed=`\n\n${tail}${hashtags?'\n\n'+hashtags:''}`;
  const available=Math.max(0,p.limit-fixed.length-heading.length-2);
  const excerpt=available>12?clip(body,available):'';
  const text=`${heading}${excerpt?'\n\n'+excerpt:''}${fixed}`.trim();
  return {platform,body:text};
 });
}
