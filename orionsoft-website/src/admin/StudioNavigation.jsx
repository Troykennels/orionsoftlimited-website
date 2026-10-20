export default function StudioNavigation({current,navigate}){
 return <nav className="studio-tabs" aria-label="Media studio sections">{[['blog','Blog articles'],['social-content','Social campaigns'],['media','Media library']].map(([id,label])=><button type="button" key={id} className={current===id?'active':''} aria-current={current===id?'page':undefined} onClick={()=>navigate?.(id)} disabled={current===id}>{label}</button>)}</nav>;
}
