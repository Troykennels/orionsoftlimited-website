export default function ArticleMedia({post}){
 return <div className="article-media" style={{display:'grid',gap:20,marginBottom:28}}>
  {post.videoUrl&&<video controls playsInline preload="metadata" poster={post.coverImage||undefined} src={post.videoUrl} style={{width:'100%',maxHeight:560,borderRadius:14,background:'#07121d'}} aria-label={`${post.title} video`}>Your browser cannot play this video. <a href={post.videoUrl}>Open video</a></video>}
  {(post.gallery||[]).map((image,i)=><figure key={`${image.url}-${i}`} style={{margin:0}}><img src={image.url} alt={image.alt||post.title||'Article image'} loading="lazy" style={{display:'block',width:'100%',maxHeight:640,objectFit:'contain',borderRadius:12}}/>{image.alt&&<figcaption style={{fontSize:13,marginTop:8,opacity:.75}}>{image.alt}</figcaption>}</figure>)}
 </div>;
}
