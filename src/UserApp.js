/* eslint-disable */
import { useState, useMemo } from "react";
import { FILTER_CATS, EV, card, inp } from "./constants";
import { Stars, Tag } from "./ui";
import MapView from "./MapView";
import VenueDetail from "./VenueDetail";

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
      {loading&&<div style={{background:"rgba(99,102,241,0.08)",border:"1px solid rgba(99,102,241,0.2)",borderRadius:10,padding:"10px 14px",marginBottom:12,display:"flex",alignItems:"center",gap:8}}><span style={{animation:"spin 1s linear infinite",display:"inline-block"}}>⟳</span><span style={{color:"#a5b4fc",fontSize:"12px"}}>Laster utesteder fra Supabase...</span></div>}
      
      <div style={{position:"relative",marginBottom:10}}>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Søk etter bar, adresse..." style={{...inp,paddingLeft:36}}/>
        <span style={{position:"absolute",left:12,top:"50%",transform:"translateY(-50%)",color:"#64748b"}}>🔍</span>
      </div>
      
      <div style={{display:"flex",gap:5,overflowX:"auto",paddingBottom:6,marginBottom:10,scrollbarWidth:"none"}}>
        {FILTER_CATS.map(c=><button key={c.id} onClick={()=>setCat(c.id)} style={{background:cat===c.id?"linear-gradient(135deg,#6366f1,#8b5cf6)":"rgba(255,255,255,0.04)",border:cat===c.id?"1px solid transparent":"1px solid rgba(255,255,255,0.08)",borderRadius:999,padding:"5px 12px",color:cat===c.id?"#fff":"#94a3b8",cursor:"pointer",fontSize:"11px",fontWeight:600,whiteSpace:"nowrap",transition:"all 0.2s"}}>{c.emoji} {c.label}</button>)}
      </div>
      
      <div style={{display:"flex",gap:3,marginBottom:12,borderBottom:"1px solid rgba(255,255,255,0.05)"}}>
        {[{id:"list",label:`🍺 Utesteder (${filtered.length})`},{id:"map",label:"🗺 Kart"},{id:"events",label:`📅 Eventer (${allEvents.length})`}].map(t=><button key={t.id} onClick={()=>setSubTab(t.id)} style={{background:subTab===t.id?"rgba(99,102,241,0.1)":"transparent",border:"none",borderBottom:subTab===t.id?"2px solid #6366f1":"2px solid transparent",color:subTab===t.id?"#a5b4fc":"#64748b",padding:"7px 13px",cursor:"pointer",fontSize:"11px",fontWeight:600,borderRadius:"5px 5px 0 0"}}>{t.label}</button>)}
      </div>

      {subTab==="map"&&<div>
        <MapView venues={filtered} events={events} selected={mapSelected} onSelect={v=>setMapSelected(mapSelected?.place_id===v.place_id?null:v)}/>
        {mapSelected?<div style={{marginTop:10,...card,cursor:"pointer",border:"1px solid rgba(99,102,241,0.3)"}} onClick={()=>setDetailVenue(mapSelected)}><div style={{display:"flex",justifyContent:"space-between"}}><div><div style={{fontWeight:700,fontSize:"15px"}}>{mapSelected.name}</div><div style={{color:"#64748b",fontSize:"11px"}}>📍 {mapSelected.address}</div><Stars r={mapSelected.rating}/></div><span style={{color:"#6366f1",fontSize:"12px",alignSelf:"center"}}>Åpne →</span></div></div>:<div style={{textAlign:"center",color:"#334155",marginTop:12,fontSize:"12px"}}>Trykk på en markør</div>}
      </div>}

      {subTab==="list"&&<div style={{display:"flex",flexDirection:"column",gap:7}}>
        {filtered.map((v,i)=>{
          const vEvs=events[v.place_id]||[];
          const hasCover=!!v.cover_image;
          return(
            <div key={v.place_id} onClick={()=>setDetailVenue(v)} style={{...card,cursor:"pointer",animation:`fadeUp 0.3s ease ${i*20}ms both`,transition:"all 0.2s",overflow:"hidden",padding:0}}>
              {/* Mini cover */}
              {hasCover&&<div style={{height:80,position:"relative",overflow:"hidden"}}>
                <img src={`https://utbergen-server-production.up.railway.app/proxy-image?url=${encodeURIComponent(v.cover_image)}`}
                  alt={v.name} style={{width:"100%",height:"100%",objectFit:"cover",opacity:0.7}}
                  onError={e=>{e.target.parentNode.style.display="none";}}/>
                <div style={{position:"absolute",inset:0,background:"linear-gradient(to bottom,transparent,rgba(6,11,20,0.8))"}}/>
              </div>}
              <div style={{padding:"11px 13px"}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:5}}>
                  <div><div style={{fontWeight:700,fontSize:"14px"}}>{v.name}</div><div style={{color:"#64748b",fontSize:"11px"}}>📍 {v.address}</div></div>
                  <div style={{textAlign:"right"}}><Stars r={v.rating}/><div style={{color:"#334155",fontSize:"9px"}}>{(v.ratingCount||0).toLocaleString()}</div></div>
                </div>
                <div style={{display:"flex",flexWrap:"wrap",gap:3,marginBottom:vEvs.length?7:0}}>
                  {(v.categories||[]).slice(0,3).map(c=><Tag key={c} small label={c.replace("_"," ")}/>)}
                  {v.website&&<Tag small label="🌐" color="rgba(34,197,94,0.12)" text="#4ade80"/>}
                  {v.instagram&&<Tag small label="📱" color="rgba(236,72,153,0.12)" text="#f472b6"/>}
                </div>
                {vEvs.length>0&&<div style={{borderTop:"1px solid rgba(255,255,255,0.05)",paddingTop:6}}>
                  {vEvs.slice(0,2).map((e,j)=>{const cfg=EV[e.type]||{color:"#64748b",emoji:"📅"};return(
                    <div key={j} style={{display:"flex",alignItems:"center",gap:5,marginBottom:2}}>
                      <span style={{fontSize:"11px"}}>{cfg.emoji}</span>
                      <span style={{flex:1,color:"#94a3b8",fontSize:"11px"}}>{e.title}</span>
                      <span style={{color:cfg.color,fontSize:"10px",fontWeight:700}}>{e.time}</span>
                      <span style={{color:"#334155",fontSize:"10px"}}>{e.date}</span>
                    </div>
                  );})}
                  {vEvs.length>2&&<div style={{color:"#475569",fontSize:"10px"}}>+{vEvs.length-2} til...</div>}
                </div>}
              </div>
            </div>
          );
        })}
        {filtered.length===0&&!loading&&<div style={{textAlign:"center",color:"#334155",padding:"40px 0",fontSize:"13px"}}>Ingen utesteder funnet</div>}
      </div>}

      {subTab==="events"&&<div style={{display:"flex",flexDirection:"column",gap:5}}>
        {allEvents.length===0&&<div style={{textAlign:"center",color:"#334155",padding:"40px 0",fontSize:"13px"}}>Ingen eventer – kjør AI-pipeline for å hente</div>}
        {allEvents.map((e,i)=>{const cfg=EV[e.type]||{color:"#64748b",emoji:"📅"};return(
          <div key={i} style={{display:"flex",alignItems:"center",gap:9,padding:"10px 12px",background:"rgba(255,255,255,0.025)",borderLeft:`3px solid ${cfg.color}`,borderRadius:"0 10px 10px 0"}}>
            <span style={{fontSize:"16px"}}>{cfg.emoji}</span>
            <div style={{flex:1}}><div style={{color:"#f1f5f9",fontWeight:600,fontSize:"13px"}}>{e.title}</div><div style={{color:"#64748b",fontSize:"10px"}}>📍 {e.venueName}{e.league&&<span style={{marginLeft:7,color:cfg.color,fontWeight:700}}>{e.league}</span>}</div></div>
            <div style={{textAlign:"right"}}><div style={{color:cfg.color,fontWeight:700,fontSize:"12px"}}>{e.time}</div><div style={{color:"#475569",fontSize:"10px"}}>{e.date}</div></div>
          </div>
        );})}
      </div>}
    </div>
  );
}
