export const CLIENT_CONTENT_ROLE = 'client_content_manager';
export const CLIENT_CONTENT_KEYS = new Set([
  'orionsoft_homepage_v1','orionsoft_testimonials_v1','orionsoft_faqs_v1',
  'orionsoft_blog_v1','orionsoft_portfolio_v1','orionsoft_team_v1',
  'orionsoft_seo_v1','orionsoft_announce_v1','orionsoft_events_v1',
]);
const MANAGER_ROUTES = new Set([
  '/api/admin/renewals','/api/admin/social-content','/api/admin/newsletter','/api/admin/media','/api/admin/media-ticket','/api/admin/blog',
  '/api/admin/content','/api/admin/analytics','/api/admin/change-password',
  '/api/admin/security-pin','/api/auth/me',
]);
export function managerRouteAllowed(session,path){
  return session?.adminRole!==CLIENT_CONTENT_ROLE || MANAGER_ROUTES.has(path);
}
export function publicRenewal(row){
  const out={};
  for(const key of ['id','customer','product','paid_through','payment_status','source','days_remaining','status','exception'])if(row[key]!==undefined)out[key]=row[key];
  out.automatic_renewal=!!row.recurring?.enabled;
  out.can_remind=!!row.billing_email&&!!row.renewal_url;
  return out;
}
