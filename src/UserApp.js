/* eslint-disable */
import { useState, useMemo } from "react";
import { FILTER_CATS, EV, card, inp } from "./constants";
import { Stars, Tag } from "./ui";
import MapView from "./MapView";
import VenueDetail from "./VenueDetail";

const SERVER = "https://utbergen-server-production.up.railway.app";

const catAccent = (categories=[]) => {
  if(categories.includes("football")||categories.includes("sport")) return "#22c55e";
  if(categories.includes("live_music")) return "#f59e0b";
  if(categories.includes("cocktail")) return "#ec4899";
  if(categories.includes("nightclub")) return "#8b5cf6";
  if(categories.includes("quiz")) return "#6366f1";
  return "#6366f1";
};

const catEmoji = (categories=[]) => {
  if(categories.includes("football")||categories.includes("sport")) return "⚽";
  if(categories.includes("live_music")) return "🎸";
  if(categories.includes("cocktail")) return "🍸";
  if(categories.includes("nightclub")) return "🎉";
  if(categories.includes("bowling")) return "🎳";
  if(categories.includes("games")||categories.includes("pool")) return "🎱";
  return "🍺";
};

export default function UserApp({venues,events,onRequestChange,knownSubmitters,loading}){
  const [cat,setCat]=useState("all");
  const [search,setSearch]=useState("");
  const [subTab,setSubTab]=useState("list");
  const [mapSelected,setMapSelected]=useState(null);
  const [detailVenue,setDetailVenue]=useState(null);

  const filtered=useMemo(()=>venues.filter(v=>{
    const matchCat=cat==="all"||(v.categories||[]).includes(cat)||(["live_music","football","quiz","games","happy_hour"].includes(cat)&&(events[v.place_id]||[]).some(e=>e.type===cat));
    const matchSearch=!search||v.name.toLowerCase().includes(search.toLowerCase())||(v.address||"").toLowerCase().includes(search.toLowerCase());
    return matchCat&&matchSearch;
  }),[cat,search,venues,events]);

  const allEvents=useMemo(()=>venues.flatMap(v=>(events[v.place_id]||[]).map(e=>({...e,venueName:v.name}))).sort((a,b)=>(a.date||"").localeCompare(b.date||"")||(a.time||"").localeCompare(b.time||"")),[venues,events]);

  if(detailVenue) return <VenueDetail venue={detailVenue} events={events} onBack={()=>setDetailVenue(null)} onRequestChange={onRequestChange} knownSubmitters={knownSubmitters}/>;

  return(
    <div>
      {loading&&<div style={{background:"rgba(99,102,241,0.08)",border:"1px solid rgba(99,102,241,0.2)",borderRadius:10,padding:"10px 14px",marginBottom:12,display:"flex",alignItems:"center",gap:8}}><span style={{animation:"spin 1s linear infinite",display:"inline-block"}}>⟳</span><span style={{color:"#a5b4fc",fontSize:"12px"}}>Laster utesteder...</span></div>}

      <div style={{position:"relative",marginBottom:12}}>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Søk etter bar, adresse..." style={{...inp,paddingLeft:42,height:46,fontSize:"14px",borderRadius:12,background:"rgba(255,255,255,0.07)",border:"1px solid rgba(255,255,255,0.12)"}}/>
        <span style={{position:"absolute",left:14,top:"50%",transform:"translateY(-50%)",color:"#64748b",fontSize:"16px"}}>🔍</span>
      </div>

      <div style={{display:"flex",gap:6,overflowX:"auto",paddingBottom:8,marginBottom:12,scrollbarWidth:"none"}}>
        {FILTER_CATS.map(c=>(
          <button key={c.id} onClick={()=>setCat(c.id)} style={{background:cat===c.id?"linear-gradient(135deg,#6366f1,#8b5cf6)":"rgba(255,255,255,0.05)",border:cat===c.id?"1px solid rgba(99,102,241,0.5)":"1px solid rgba(255,255,255,0.08)",borderRadius:999,padding:"6px 14px",color:cat===c.id?"#fff":"#94a3b8",cursor:"pointer",fontSize:"12px",fontWeight:600,whiteSpace:"nowrap",transition:"all 0.2s",boxShadow:cat===c.id?"0 3px 12px rgba(99,102,241,0.35)":"none"}}>
            {c.emoji} {c.label}
          </button>
        ))}
      </div>

      <div style={{display:"flex",gap:3,marginBottom:14,borderBottom:"1px solid rgba(255,255,255,0.06)"}}>
        {[{id:"list",label:`🍺 Utesteder (${filtered.length})`},{id:"map",label:"🗺 Kart"},{id:"events",label:`📅 Eventer (${allEvents.length})`}].map(t=>(
          <button key={t.id} onClick={()=>setSubTab(t.id)} style={{background:subTab===t.id?"rgba(99,102,241,0.1)":"transparent",border:"none",borderBottom:subTab===t.id?"2px solid #6366f1":"2px solid transparent",color:subTab===t.id?"#a5b4fc":"#64748b",padding:"8px 14px",cursor:"pointer",fontSize:"12px",fontWeight:600,borderRadius:"6px 6px 0 0",transition:"all 0.2s"}}>
            {t.label}
          </button>
        ))}
      </div>

      {subTab==="map"&&<div>
        <MapView venues={filtered} events={events} selected={mapSelected} onSelect={v=>setMapSelected(mapSelected?.place_id===v.place_id?null:v)}/>
        {mapSelected?(
          <div style={{marginTop:10,background:"rgba(255,255,255,0.04)",border:"1px solid rgba(99,102,241,0.3)",borderRadius:14,padding:"14px",cursor:"pointer"}} onClick={()=>setDetailVenue(mapSelected)}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <div><div style={{fontWeight:700,fontSize:"16px"}}>{mapSelected.name}</div><div style={{color:"#64748b",fontSize:"12px",marginTop:2}}>📍 {mapSelected.address}</div><div style={{marginTop:4}}><Stars r={mapSelected.rating}/></div></div>
              <div style={{background:"linear-gradient(135deg,#6366f1,#8b5cf6)",borderRadius:10,padding:"8px 14px",color:"#fff",fontSize:"12px",fontWeight:700}}>Åpne →</div>
            </div>
          </div>
        ):<div style={{textAlign:"center",color:"#334155",marginTop:16,fontSize:"13px"}}>Trykk på en markør for detaljer</div>}
      </div>}

      {subTab==="list"&&<div style={{display:"flex",flexDirection:"column",gap:10}}>
        {filtered.map((v,i)=>{
          const vEvs=events[v.place_id]||[];
          const hasCover=!!v.cover_image;
          const accent=catAccent(v.categories);
          const emoji=catEmoji(v.categories);
          const hasEvents=vEvs.length>0;
          return(
            <div key={v.place_id} onClick={()=>setDetailVenue(v)}
              style={{cursor:"pointer",borderRadius:16,overflow:"hidden",border:`1px solid ${accent}28`,background:"rgba(255,255,255,0.025)",animation:`fadeUp 0.3s ease ${i*20}ms both`,transition:"border 0.2s",position:"relative"}}>
              {hasCover&&(
                <div style={{height:110,position:"relative",overflow:"hidden"}}>
                  <img src={`${SERVER}/proxy-image?url=${encodeURIComponent(v.cover_image)}`}
                    alt={v.name} style={{width:"100%",height:"100%",objectFit:"cover",objectPosition:"center"}}
                    onError={e=>{e.target.parentElement.style.display="none";}}/>
                  <div style={{position:"absolute",inset:0,background:"linear-gradient(to bottom,rgba(0,0,0,0.05),rgba(6,11,20,0.9))"}}/>
                </div>
              )}
              <div style={{padding:"12px 14px"}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:7}}>
                  <div style={{display:"flex",alignItems:"center",gap:10}}>
                    <div style={{width:40,height:40,borderRadius:10,background:`${accent}18`,border:`1px solid ${accent}33`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:"20px",flexShrink:0}}>{emoji}</div>
                    <div>
                      <div style={{fontWeight:800,fontSize:"15px",letterSpacing:"-0.01em"}}>{v.name}</div>
                      <div style={{color:"#64748b",fontSize:"11px",marginTop:1}}>📍 {v.address}</div>
                    </div>
                  </div>
                  <div style={{textAlign:"right",flexShrink:0}}>
                    <Stars r={v.rating}/>
                    <div style={{color:"#334155",fontSize:"9px",marginTop:1}}>{(v.ratingCount||0).toLocaleString()}</div>
                  </div>
                </div>
                <div style={{display:"flex",flexWrap:"wrap",gap:4,marginBottom:hasEvents?8:0}}>
                  {(v.categories||[]).slice(0,3).map(c=>(
                    <span key={c} style={{background:`${accent}15`,color:accent,borderRadius:999,padding:"2px 9px",fontSize:"10px",fontWeight:700,border:`1px solid ${accent}25`}}>{c.replace(/_/g," ")}</span>
                  ))}
                  {v.website&&<span style={{background:"rgba(34,197,94,0.1)",color:"#4ade80",borderRadius:999,padding:"2px 9px",fontSize:"10px",fontWeight:700}}>🌐</span>}
                  {v.instagram&&<span style={{background:"rgba(236,72,153,0.1)",color:"#f472b6",borderRadius:999,padding:"2px 9px",fontSize:"10px",fontWeight:700}}>📱</span>}
                </div>
                {hasEvents&&<div style={{borderTop:`1px solid ${accent}18`,paddingTop:8}}>
                  {vEvs.slice(0,2).map((e,j)=>{const cfg=EV[e.type]||{color:"#64748b",emoji:"📅"};return(
                    <div key={j} style={{display:"flex",alignItems:"center",gap:6,marginBottom:3}}>
                      <span style={{fontSize:"12px"}}>{cfg.emoji}</span>
                      <span style={{flex:1,color:"#94a3b8",fontSize:"11px",fontWeight:500}}>{e.title}</span>
                      <span style={{color:cfg.color,fontSize:"11px",fontWeight:700}}>{e.time}</span>
                      <span style={{color:"#475569",fontSize:"10px",marginLeft:4}}>{e.date}</span>
                    </div>
                  );})}
                  {vEvs.length>2&&<div style={{color:"#475569",fontSize:"10px",marginTop:2}}>+{vEvs.length-2} flere eventer</div>}
                </div>}
              </div>
              <div style={{position:"absolute",bottom:14,right:14,color:`${accent}66`,fontSize:"16px",fontWeight:700}}>›</div>
            </div>
          );
        })}
        {filtered.length===0&&!loading&&<div style={{textAlign:"center",color:"#334155",padding:"60px 0",fontSize:"14px"}}>Ingen utesteder funnet</div>}
      </div>}

      {subTab==="events"&&<div style={{display:"flex",flexDirection:"column",gap:6}}>
        {allEvents.length===0&&<div style={{textAlign:"center",color:"#334155",padding:"60px 0",fontSize:"14px"}}>Ingen eventer – kjør AI-pipeline for å hente</div>}
        {allEvents.map((e,i)=>{const cfg=EV[e.type]||{color:"#64748b",emoji:"📅"};return(
          <div key={i} style={{display:"flex",alignItems:"center",gap:10,padding:"11px 14px",background:"rgba(255,255,255,0.025)",borderLeft:`3px solid ${cfg.color}`,borderRadius:"0 12px 12px 0"}}>
            <div style={{width:36,height:36,borderRadius:10,background:`${cfg.color}18`,border:`1px solid ${cfg.color}30`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:"16px",flexShrink:0}}>{cfg.emoji}</div>
            <div style={{flex:1}}>
              <div style={{color:"#f1f5f9",fontWeight:600,fontSize:"13px"}}>{e.title}</div>
              <div style={{color:"#64748b",fontSize:"10px",marginTop:1}}>📍 {e.venueName}{e.league&&<span style={{marginLeft:8,color:cfg.color,fontWeight:700,fontSize:"10px"}}>{e.league}</span>}</div>
            </div>
            <div style={{textAlign:"right",flexShrink:0}}>
              <div style={{color:cfg.color,fontWeight:700,fontSize:"13px"}}>{e.time}</div>
              <div style={{color:"#475569",fontSize:"10px",marginTop:1}}>{e.date}</div>
            </div>
          </div>
        );})}
      </div>}
    </div>
  );
}
