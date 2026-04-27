/* eslint-disable */
import { useState } from "react";
import { Stars, Tag, TrustBadge, SecTitle, SrcBadge } from "./ui";
import { ROLES, CHANGE_TYPES, EV, card, inp, lbl } from "./constants";
import { dbInsertRequest } from "./api";
import { SERVER } from "./constants";

const SOCIAL = {
  p001:{
    instagram:[
      {id:"ig1",caption:"⚽ I kveld: Champions League på alle skjermer! Book bord nå 🍺 #felix #bergen",time:"2 timer siden",likes:142,type:"football"},
      {id:"ig2",caption:"🎸 TOTTO er tilbake på Felix fredag! Gratis inngang 🎶 #livemusikk #felixbergen",time:"1 dag siden",likes:287,type:"live_music"},
    ],
    facebook:[
      {id:"fb1",content:"🎸 Ukens musikk-program:\nTors: Øystein Eckhoff | Fre: Totto | Lør: Totto\nGratis inngang. Live fra kl 23:00.",time:"I dag 10:30",likes:89,shares:23,type:"event"},
    ],
    reviews:[
      {author:"James O.",rating:5,text:"Best place in Bergen for football! Electric atmosphere.",time:"1 uke siden"},
      {author:"Maria K.",rating:4,text:"Really cool music place. Dancing from 23:00 until closing!",time:"2 uker siden"},
    ],
  },
  p013:{
    instagram:[
      {id:"ig1",caption:"⚽ Vi viser ALLE kampene! PL, CL, Eliteserien 📺 #fotballpuben #bergen",time:"1 dag siden",likes:201,type:"football"},
    ],
    facebook:[],
    reviews:[{author:"Peter S.",rating:5,text:"Best bar in Bergen for football fans!",time:"2 uker siden"}],
  },
};

const catAccent = (cats=[]) => {
  if(cats.includes("football")||cats.includes("sport")) return "#22c55e";
  if(cats.includes("live_music")) return "#f59e0b";
  if(cats.includes("cocktail")) return "#ec4899";
  if(cats.includes("nightclub")) return "#8b5cf6";
  return "#6366f1";
};

const catEmoji = (cats=[]) => {
  if(cats.includes("football")||cats.includes("sport")) return "⚽";
  if(cats.includes("live_music")) return "🎸";
  if(cats.includes("cocktail")) return "🍸";
  if(cats.includes("nightclub")) return "🎉";
  if(cats.includes("bowling")) return "🎳";
  return "🍺";
};

export default function VenueDetail({venue,events,onBack,onRequestChange,knownSubmitters}){
  const [section,setSection]=useState("overview");
  const [hlMode,setHlMode]=useState(false);
  const [hl,setHl]=useState(null);
  const [showForm,setShowForm]=useState(false);
  const [form,setForm]=useState({name:"",email:"",role:"",changeType:"",content:""});
  const [submitted,setSubmitted]=useState(false);
  const [lookup,setLookup]=useState(null);
  const [photoIdx,setPhotoIdx]=useState(0);
  const [coverError,setCoverError]=useState(false);
  const vEvents=events[venue.place_id]||[];
  const social=SOCIAL[venue.place_id]||{instagram:[],facebook:[],reviews:[]};
  const cats=venue.categories||[];
  const accent=catAccent(cats);
  const emoji=catEmoji(cats);
  const hasCover=venue.cover_image&&!coverError;

  const handleEmailBlur=()=>{const k=knownSubmitters[form.email];setLookup(k||null);if(k)setForm(p=>({...p,name:k.name,role:k.role}));};
  const handleHl=(field,value)=>{setHl({field,value});setForm(p=>({...p,changeType:field==="event"?"event_edit":field==="hours"?"hours":"description",content:`Feil i: "${value}" – `}));setShowForm(true);setHlMode(false);};
  const handleSubmit=()=>{
    if(!form.name||!form.email||!form.role||!form.changeType||!form.content) return;
    const k=knownSubmitters[form.email];const r=ROLES.find(x=>x.value===form.role);
    const req={id:`r${Date.now()}`,venueId:venue.place_id,venueName:venue.name,submitterName:form.name,submitterEmail:form.email,role:form.role,changeType:form.changeType,content:form.content,status:"pending",createdAt:new Date().toISOString(),trustScore:r?.trust||1,approvedBefore:k?.approved||0,isKnown:!!k};
    onRequestChange(req);dbInsertRequest(req);
    setSubmitted(true);setShowForm(false);setForm({name:"",email:"",role:"",changeType:"",content:""});setHl(null);
    setTimeout(()=>setSubmitted(false),4000);
  };

  const SECTIONS=[{id:"overview",label:"Oversikt",emoji:"🏠"},{id:"photos",label:"Bilder",emoji:"📸"},{id:"events",label:"Eventer",emoji:"📅"},{id:"social",label:"Sosiale medier",emoji:"📱"},{id:"reviews",label:"Anmeldelser",emoji:"⭐"}];

  return(
    <div>
      {/* Tilbake */}
      <button onClick={onBack} style={{background:"none",border:"none",color:accent,cursor:"pointer",fontSize:"12px",fontWeight:700,marginBottom:14,padding:0,display:"flex",alignItems:"center",gap:4}}>
        ← Tilbake til oversikten
      </button>

      {/* ── HERO ── */}
      <div style={{position:"relative",borderRadius:18,overflow:"hidden",marginBottom:0}}>
        {hasCover?(
          <img src={`${SERVER}/proxy-image?url=${encodeURIComponent(venue.cover_image)}`}
            alt={venue.name} onError={()=>setCoverError(true)}
            style={{width:"100%",height:"auto",display:"block",maxHeight:380,objectFit:"cover",objectPosition:"center top"}}/>
        ):(
          <div style={{position:"absolute",inset:0,background:`linear-gradient(135deg,#0a1220,${accent}22,#0a1220)`}}>
            <div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",fontSize:"100px",opacity:0.07}}>{emoji}</div>
          </div>
        )}
        {/* Gradient overlay */}
        <div style={{position:"absolute",inset:0,background:"linear-gradient(to bottom,rgba(0,0,0,0.1) 0%,rgba(6,11,20,0.5) 50%,rgba(6,11,20,0.97) 100%)"}}/>

        {/* Top badges */}
        <div style={{position:"absolute",top:14,right:14,display:"flex",gap:5}}>
          {venue.website&&<a href={venue.website} target="_blank" rel="noopener noreferrer" style={{background:"rgba(0,0,0,0.5)",backdropFilter:"blur(8px)",border:"1px solid rgba(255,255,255,0.15)",borderRadius:999,padding:"4px 10px",color:"#4ade80",fontSize:"11px",fontWeight:700,textDecoration:"none"}}>🌐</a>}
          {venue.instagram&&<a href={`https://instagram.com/${venue.instagram.replace("@","")}`} target="_blank" rel="noopener noreferrer" style={{background:"rgba(0,0,0,0.5)",backdropFilter:"blur(8px)",border:"1px solid rgba(255,255,255,0.15)",borderRadius:999,padding:"4px 10px",color:"#f472b6",fontSize:"11px",fontWeight:700,textDecoration:"none"}}>📱</a>}
        </div>

        {/* Bottom info */}
        <div style={{position:"absolute",bottom:0,left:0,right:0,padding:"20px 18px 16px"}}>
          {/* Rating */}
          <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:6}}>
            <Stars r={venue.rating}/>
            <span style={{color:"rgba(255,255,255,0.35)",fontSize:"11px"}}>{(venue.ratingCount||0).toLocaleString()} anmeldelser</span>
          </div>
          {/* Name */}
          <div style={{fontSize:"28px",fontWeight:900,letterSpacing:"-0.03em",lineHeight:1.1,textShadow:"0 2px 20px rgba(0,0,0,0.8)",marginBottom:4}}>{venue.name}</div>
          {/* Address */}
          <div style={{color:"rgba(255,255,255,0.45)",fontSize:"12px",marginBottom:10}}>📍 {venue.address}</div>
          {/* Categories */}
          <div style={{display:"flex",gap:5,flexWrap:"wrap"}}>
            {cats.slice(0,4).map(c=>(
              <span key={c} style={{background:`${accent}25`,color:accent,border:`1px solid ${accent}40`,borderRadius:999,padding:"3px 10px",fontSize:"11px",fontWeight:700,backdropFilter:"blur(4px)"}}>{c.replace(/_/g," ")}</span>
            ))}
          </div>
        </div>
      </div>

      {/* Quick actions bar */}
      <div style={{background:`${accent}0a`,border:`1px solid ${accent}20`,borderTop:"none",borderRadius:"0 0 14px 14px",padding:"10px 16px",display:"flex",gap:8,marginBottom:16,overflowX:"auto",scrollbarWidth:"none"}}>
        {venue.website&&<a href={venue.website} target="_blank" rel="noopener noreferrer" style={{display:"inline-flex",alignItems:"center",gap:5,background:"rgba(34,197,94,0.1)",color:"#4ade80",border:"1px solid rgba(34,197,94,0.25)",borderRadius:10,padding:"6px 12px",fontSize:"11px",fontWeight:700,textDecoration:"none",whiteSpace:"nowrap"}}>🌐 Nettside ↗</a>}
        {venue.phone&&<a href={`tel:${venue.phone}`} style={{display:"inline-flex",alignItems:"center",gap:5,background:"rgba(99,102,241,0.1)",color:"#a5b4fc",border:"1px solid rgba(99,102,241,0.25)",borderRadius:10,padding:"6px 12px",fontSize:"11px",fontWeight:700,textDecoration:"none",whiteSpace:"nowrap"}}>📞 {venue.phone}</a>}
        {venue.instagram&&<a href={`https://instagram.com/${venue.instagram.replace("@","")}`} target="_blank" rel="noopener noreferrer" style={{display:"inline-flex",alignItems:"center",gap:5,background:"rgba(236,72,153,0.1)",color:"#f472b6",border:"1px solid rgba(236,72,153,0.25)",borderRadius:10,padding:"6px 12px",fontSize:"11px",fontWeight:700,textDecoration:"none",whiteSpace:"nowrap"}}>📱 {venue.instagram} ↗</a>}
      </div>

      {/* Section tabs */}
      <div style={{display:"flex",gap:2,overflowX:"auto",scrollbarWidth:"none",marginBottom:16,borderBottom:`1px solid ${accent}20`}}>
        {SECTIONS.map(s=>(
          <button key={s.id} onClick={()=>setSection(s.id)} style={{background:section===s.id?`${accent}15`:"transparent",border:"none",borderBottom:section===s.id?`2px solid ${accent}`:"2px solid transparent",color:section===s.id?accent:"#64748b",padding:"9px 13px",cursor:"pointer",fontSize:"11px",fontWeight:700,whiteSpace:"nowrap",borderRadius:"6px 6px 0 0",transition:"all 0.2s"}}>
            {s.emoji} {s.label}
          </button>
        ))}
      </div>

      {/* ── OVERVIEW ── */}
      {section==="overview"&&<div style={{animation:"fadeUp 0.3s ease"}}>
        {/* Description */}
        {venue.description&&<div onClick={()=>hlMode&&handleHl("description",venue.description)}
          style={{background:`${accent}08`,border:`1px solid ${hl?.field==="description"?accent:accent+"20"}`,borderRadius:14,padding:"14px 16px",marginBottom:12,cursor:hlMode?"pointer":"default",transition:"border 0.2s"}}>
          <div style={{color:accent,fontSize:"10px",fontWeight:700,letterSpacing:"0.1em",textTransform:"uppercase",marginBottom:6}}>Om stedet</div>
          <div style={{color:"#cbd5e1",fontSize:"13px",lineHeight:1.75}}>{venue.description}</div>
        </div>}

        {/* Åpningstider */}
        {Object.keys(venue.hours||{}).length>0&&(
          <div onClick={()=>hlMode&&handleHl("hours","Åpningstider")}
            style={{background:"rgba(255,255,255,0.025)",border:`1px solid ${hl?.field==="hours"?"rgba(245,158,11,0.5)":"rgba(255,255,255,0.07)"}`,borderRadius:14,padding:"14px 16px",marginBottom:12,cursor:hlMode?"pointer":"default"}}>
            <div style={{color:"#475569",fontSize:"10px",fontWeight:700,letterSpacing:"0.1em",textTransform:"uppercase",marginBottom:10}}>🕐 Åpningstider</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"4px 20px"}}>
              {Object.entries(venue.hours||{}).map(([d,h])=>(
                <div key={d} style={{display:"flex",justifyContent:"space-between",padding:"4px 0",borderBottom:"1px solid rgba(255,255,255,0.04)"}}>
                  <span style={{color:"#64748b",fontSize:"12px",fontWeight:500}}>{d}</span>
                  <span style={{color:h==="Stengt"?"#334155":"#e2e8f0",fontSize:"12px",fontWeight:h!=="Stengt"?600:400}}>{h}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Kommende eventer preview */}
        {vEvents.length>0&&(
          <div style={{background:"rgba(255,255,255,0.025)",border:"1px solid rgba(255,255,255,0.07)",borderRadius:14,padding:"14px 16px",marginBottom:12}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
              <div style={{color:"#475569",fontSize:"10px",fontWeight:700,letterSpacing:"0.1em",textTransform:"uppercase"}}>📅 Kommende eventer</div>
              <button onClick={()=>setSection("events")} style={{background:"none",border:"none",color:accent,cursor:"pointer",fontSize:"11px",fontWeight:700}}>Se alle →</button>
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:5}}>
              {vEvents.slice(0,3).map(ev=>{const cfg=EV[ev.type]||{color:"#64748b",emoji:"📅"};return(
                <div key={ev.id} style={{display:"flex",alignItems:"center",gap:10,padding:"8px 10px",background:`${cfg.color}0a`,borderLeft:`3px solid ${cfg.color}`,borderRadius:"0 10px 10px 0"}}>
                  <span style={{fontSize:"15px"}}>{cfg.emoji}</span>
                  <div style={{flex:1}}><div style={{color:"#f1f5f9",fontWeight:600,fontSize:"12px"}}>{ev.title}</div>{ev.league&&<span style={{color:cfg.color,fontSize:"10px",fontWeight:700}}>{ev.league}</span>}</div>
                  <div style={{textAlign:"right"}}><div style={{color:cfg.color,fontWeight:700,fontSize:"12px"}}>{ev.time}</div><div style={{color:"#475569",fontSize:"10px"}}>{ev.date}</div></div>
                </div>
              );})}
            </div>
          </div>
        )}

        {/* Endringsforslag */}
        {submitted&&<div style={{background:"rgba(34,197,94,0.1)",border:"1px solid rgba(34,197,94,0.3)",borderRadius:12,padding:"12px 14px",marginBottom:12,display:"flex",gap:10}}><span style={{fontSize:"20px"}}>✅</span><div><div style={{color:"#4ade80",fontWeight:700,fontSize:"13px"}}>Forespørsel sendt!</div><div style={{color:"#64748b",fontSize:"11px"}}>Vi gjennomgår snarest.</div></div></div>}
        {!showForm&&<div style={{display:"flex",gap:8,marginTop:4}}>
          <button onClick={()=>{setHlMode(!hlMode);setShowForm(false);}} style={{flex:1,padding:"10px",background:hlMode?"rgba(245,158,11,0.1)":"rgba(255,255,255,0.03)",border:`1px solid ${hlMode?"rgba(245,158,11,0.3)":"rgba(255,255,255,0.08)"}`,borderRadius:11,color:hlMode?"#fbbf24":"#64748b",cursor:"pointer",fontSize:"11px",fontWeight:600}}>{hlMode?"✕ Avbryt":"🖊 Marker feil direkte"}</button>
          <button onClick={()=>{setShowForm(true);setHlMode(false);}} style={{flex:2,padding:"10px",background:"rgba(99,102,241,0.1)",border:"1px solid rgba(99,102,241,0.25)",borderRadius:11,color:"#a5b4fc",cursor:"pointer",fontSize:"11px",fontWeight:600}}>⚠️ Er noe galt? Send endringsforslag</button>
        </div>}
        {showForm&&<div style={{background:"rgba(255,255,255,0.03)",border:"1px solid rgba(99,102,241,0.2)",borderRadius:14,padding:"16px",marginTop:10}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}><span style={{color:"#a5b4fc",fontWeight:700,fontSize:"13px"}}>📝 Send endringsforslag</span><button onClick={()=>{setShowForm(false);setHl(null);}} style={{background:"none",border:"none",color:"#475569",cursor:"pointer",fontSize:"18px"}}>✕</button></div>
          {hl&&<div style={{background:"rgba(245,158,11,0.08)",border:"1px solid rgba(245,158,11,0.25)",borderRadius:9,padding:"7px 10px",marginBottom:10}}><div style={{color:"#fbbf24",fontSize:"10px",fontWeight:600}}>🖊 Markert: "{hl.value}"</div></div>}
          <div style={{display:"flex",flexDirection:"column",gap:9}}>
            <div><label style={lbl}>E-post *</label><input value={form.email} onChange={e=>setForm(p=>({...p,email:e.target.value}))} onBlur={handleEmailBlur} placeholder="din@epost.no" style={inp}/>{lookup&&<div style={{marginTop:4,background:"rgba(34,197,94,0.07)",border:"1px solid rgba(34,197,94,0.2)",borderRadius:7,padding:"5px 9px",display:"flex",alignItems:"center",gap:7}}><span style={{color:"#4ade80",fontSize:"10px"}}>✓ Vi kjenner deg igjen!</span><TrustBadge score={ROLES.find(r=>r.value===lookup.role)?.trust||1} approved={lookup.approved} isKnown={true}/></div>}</div>
            <div><label style={lbl}>Navn *</label><input value={form.name} onChange={e=>setForm(p=>({...p,name:e.target.value}))} placeholder="Ditt navn" style={inp}/></div>
            <div><label style={lbl}>Tilknytning *</label><select value={form.role} onChange={e=>setForm(p=>({...p,role:e.target.value}))} style={{...inp,background:"#0b1627"}}><option value="" disabled>Velg rolle...</option>{ROLES.map(r=><option key={r.value} value={r.value}>{r.label}</option>)}</select></div>
            <div><label style={lbl}>Gjelder *</label><div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:5}}>{CHANGE_TYPES.map(ct=><button key={ct.value} onClick={()=>setForm(p=>({...p,changeType:ct.value}))} style={{padding:"7px 4px",background:form.changeType===ct.value?`${accent}18`:"rgba(255,255,255,0.03)",border:`1px solid ${form.changeType===ct.value?accent+"44":"rgba(255,255,255,0.07)"}`,borderRadius:8,color:form.changeType===ct.value?accent:"#64748b",cursor:"pointer",fontSize:"10px",fontWeight:600,textAlign:"center"}}><div style={{fontSize:"14px",marginBottom:1}}>{ct.emoji}</div>{ct.label}</button>)}</div></div>
            <div><label style={lbl}>Beskriv *</label><textarea value={form.content} onChange={e=>setForm(p=>({...p,content:e.target.value}))} placeholder="Hva er feil og hva skal det stå?" rows={3} style={{...inp,resize:"vertical"}}/></div>
            <button onClick={handleSubmit} style={{width:"100%",padding:"12px",background:`linear-gradient(135deg,${accent},${accent}cc)`,border:"none",borderRadius:11,color:"#fff",fontSize:"13px",fontWeight:700,cursor:"pointer",boxShadow:`0 4px 14px ${accent}40`}}>Send endringsforslag →</button>
          </div>
        </div>}
      </div>}

      {/* ── PHOTOS ── */}
      {section==="photos"&&<div style={{animation:"fadeUp 0.3s ease"}}>
        <div style={{display:"flex",justifyContent:"flex-end",marginBottom:10}}><SrcBadge label="Google Places" color="#4285F4" icon="🔍"/></div>
        {venue.photo_references?.length>0?(
          <>
            <div style={{borderRadius:16,overflow:"hidden",marginBottom:10,position:"relative",boxShadow:"0 8px 32px rgba(0,0,0,0.4)"}}>
              <img src={`${SERVER}/places/photo?photo_reference=${venue.photo_references[photoIdx]}&maxwidth=900`}
                alt={venue.name} style={{width:"100%",height:"auto",display:"block",maxHeight:400,objectFit:"cover"}}
                onError={e=>{e.target.style.display="none";}}/>
              <div style={{position:"absolute",bottom:10,left:12,color:"rgba(255,255,255,0.5)",fontSize:"10px",background:"rgba(0,0,0,0.5)",padding:"2px 10px",borderRadius:999,backdropFilter:"blur(4px)"}}>
                {photoIdx+1} / {venue.photo_references.length} · Google Places
              </div>
              {venue.photo_references.length>1&&<>
                <button onClick={()=>setPhotoIdx((photoIdx-1+venue.photo_references.length)%venue.photo_references.length)} style={{position:"absolute",left:12,top:"50%",transform:"translateY(-50%)",background:"rgba(0,0,0,0.5)",border:"1px solid rgba(255,255,255,0.2)",borderRadius:"50%",width:38,height:38,color:"#fff",cursor:"pointer",fontSize:"18px",display:"flex",alignItems:"center",justifyContent:"center",backdropFilter:"blur(4px)"}}>‹</button>
                <button onClick={()=>setPhotoIdx((photoIdx+1)%venue.photo_references.length)} style={{position:"absolute",right:12,top:"50%",transform:"translateY(-50%)",background:"rgba(0,0,0,0.5)",border:"1px solid rgba(255,255,255,0.2)",borderRadius:"50%",width:38,height:38,color:"#fff",cursor:"pointer",fontSize:"18px",display:"flex",alignItems:"center",justifyContent:"center",backdropFilter:"blur(4px)"}}>›</button>
              </>}
            </div>
            <div style={{display:"flex",gap:6,overflowX:"auto",scrollbarWidth:"none"}}>
              {venue.photo_references.map((ref,i)=>(
                <img key={i} src={`${SERVER}/places/photo?photo_reference=${ref}&maxwidth=200`}
                  alt={`${venue.name} ${i+1}`} onClick={()=>setPhotoIdx(i)}
                  style={{width:64,height:48,borderRadius:10,objectFit:"cover",cursor:"pointer",border:`2px solid ${i===photoIdx?accent:"rgba(255,255,255,0.08)"}`,opacity:i===photoIdx?1:0.55,flexShrink:0,transition:"all 0.2s"}}
                  onError={e=>{e.target.style.display="none";}}/>
              ))}
            </div>
          </>
        ):<div style={{...card,textAlign:"center",color:"#334155",padding:"50px"}}>Ingen bilder ennå – kjør pipeline</div>}
      </div>}

      {/* ── EVENTS ── */}
      {section==="events"&&<div style={{animation:"fadeUp 0.3s ease"}}>
        <div style={{display:"flex",justifyContent:"flex-end",marginBottom:10}}><SrcBadge label="AI-agent" color="#22c55e" icon="🤖"/></div>
        {vEvents.length===0?<div style={{...card,textAlign:"center",color:"#334155",padding:"50px"}}>Ingen registrerte eventer for {venue.name}</div>:
        <div style={{display:"flex",flexDirection:"column",gap:6}}>
          {vEvents.map((ev)=>{const cfg=EV[ev.type]||{color:"#64748b",emoji:"📅"};return(
            <div key={ev.id} style={{display:"flex",alignItems:"center",gap:12,padding:"12px 14px",background:`${cfg.color}0a`,borderLeft:`3px solid ${cfg.color}`,borderRadius:"0 12px 12px 0",border:`1px solid ${cfg.color}18`,borderLeft:`3px solid ${cfg.color}`}}>
              <div style={{width:40,height:40,borderRadius:10,background:`${cfg.color}18`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:"18px",flexShrink:0}}>{cfg.emoji}</div>
              <div style={{flex:1}}>
                <div style={{color:"#f1f5f9",fontWeight:700,fontSize:"13px"}}>{ev.title}</div>
                {ev.league&&<span style={{color:cfg.color,fontSize:"10px",fontWeight:700,marginTop:2,display:"block"}}>{ev.league}</span>}
              </div>
              <div style={{textAlign:"right",flexShrink:0}}>
                <div style={{color:cfg.color,fontWeight:800,fontSize:"14px"}}>{ev.time}</div>
                <div style={{color:"#475569",fontSize:"11px",marginTop:1}}>{ev.date}</div>
              </div>
            </div>
          );})}
        </div>}
      </div>}

      {/* ── SOCIAL ── */}
      {section==="social"&&<div style={{animation:"fadeUp 0.3s ease"}}>
        <div style={{marginBottom:20}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}>
            <div style={{color:"#475569",fontSize:"10px",fontWeight:700,letterSpacing:"0.12em",textTransform:"uppercase"}}>📱 Instagram</div>
            {venue.instagram&&<a href={`https://instagram.com/${venue.instagram.replace("@","")}`} target="_blank" rel="noopener noreferrer" style={{display:"inline-flex",alignItems:"center",gap:4,background:"rgba(236,72,153,0.1)",color:"#f472b6",border:"1px solid rgba(236,72,153,0.2)",borderRadius:999,padding:"3px 10px",fontSize:"10px",fontWeight:700,textDecoration:"none"}}>{venue.instagram} ↗</a>}
          </div>
          {social.instagram.length===0?<div style={{...card,textAlign:"center",color:"#334155",padding:"28px"}}>{venue.instagram?"Ingen innlegg funnet":"Ingen Instagram registrert"}</div>:
          <div style={{display:"flex",flexDirection:"column",gap:8}}>
            {social.instagram.map(p=>{const cfg=EV[p.type]||{color:"#64748b",emoji:"📸"};return(
              <div key={p.id} style={{background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.07)",borderRadius:14,padding:"12px 14px"}}>
                <div style={{display:"flex",alignItems:"flex-start",gap:10}}>
                  <div style={{width:42,height:42,borderRadius:10,flexShrink:0,background:`linear-gradient(135deg,${cfg.color}33,${cfg.color}11)`,border:`1px solid ${cfg.color}33`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:"19px"}}>{cfg.emoji}</div>
                  <div style={{flex:1}}><div style={{color:"#e2e8f0",fontSize:"12px",lineHeight:1.6}}>{p.caption}</div><div style={{display:"flex",gap:10,marginTop:6}}><span style={{color:"#475569",fontSize:"10px"}}>{p.time}</span><span style={{color:"#475569",fontSize:"10px"}}>❤️ {p.likes}</span></div></div>
                </div>
              </div>
            );})}
          </div>}
        </div>
        <div>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}>
            <div style={{color:"#475569",fontSize:"10px",fontWeight:700,letterSpacing:"0.12em",textTransform:"uppercase"}}>📘 Facebook</div>
            {venue.facebook&&<a href={`https://facebook.com/${venue.facebook}`} target="_blank" rel="noopener noreferrer" style={{display:"inline-flex",alignItems:"center",gap:4,background:"rgba(24,119,242,0.1)",color:"#60a5fa",border:"1px solid rgba(24,119,242,0.2)",borderRadius:999,padding:"3px 10px",fontSize:"10px",fontWeight:700,textDecoration:"none"}}>Åpne ↗</a>}
          </div>
          {social.facebook.length===0?<div style={{...card,textAlign:"center",color:"#334155",padding:"28px"}}>{venue.facebook?"Ingen innlegg funnet":"Ingen Facebook registrert"}</div>:
          <div style={{display:"flex",flexDirection:"column",gap:8}}>
            {social.facebook.map(p=>{const cfg=EV[p.type]||{color:"#64748b",emoji:"📅"};return(
              <div key={p.id} style={{background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.07)",borderRadius:14,padding:"12px 14px"}}>
                <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
                  <div style={{width:30,height:30,borderRadius:"50%",background:"linear-gradient(135deg,#1877F2,#0a5dd1)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"13px",color:"#fff",fontWeight:800}}>f</div>
                  <div><div style={{color:"#f1f5f9",fontWeight:600,fontSize:"12px"}}>{venue.name}</div><div style={{color:"#475569",fontSize:"10px"}}>{p.time}</div></div>
                </div>
                <div style={{color:"#94a3b8",fontSize:"12px",lineHeight:1.7,whiteSpace:"pre-line"}}>{p.content}</div>
                <div style={{display:"flex",gap:12,marginTop:8,color:"#475569",fontSize:"11px"}}><span>👍 {p.likes}</span><span>↗ {p.shares} delinger</span></div>
              </div>
            );})}
          </div>}
        </div>
      </div>}

      {/* ── REVIEWS ── */}
      {section==="reviews"&&<div style={{animation:"fadeUp 0.3s ease"}}>
        <div style={{display:"flex",justifyContent:"flex-end",marginBottom:10}}><SrcBadge label="Google" color="#4285F4" icon="🔍"/></div>
        <div style={{display:"flex",alignItems:"center",gap:16,background:"rgba(245,158,11,0.06)",border:"1px solid rgba(245,158,11,0.15)",borderRadius:14,padding:"16px",marginBottom:14}}>
          <div style={{textAlign:"center",minWidth:70}}>
            <div style={{color:"#f59e0b",fontSize:"40px",fontWeight:900,lineHeight:1}}>{venue.rating||0}</div>
            <div style={{color:"#f59e0b",fontSize:"14px",marginTop:2}}>{"★".repeat(Math.round(venue.rating||0))}</div>
            <div style={{color:"#475569",fontSize:"10px",marginTop:2}}>{(venue.ratingCount||0).toLocaleString()}</div>
          </div>
          <div style={{flex:1}}>
            {[5,4,3,2,1].map(n=>{const pct=n===5?60:n===4?25:n===3?10:3;return(
              <div key={n} style={{display:"flex",alignItems:"center",gap:6,marginBottom:4}}>
                <span style={{color:"#f59e0b",fontSize:"10px",width:8}}>{n}</span>
                <div style={{flex:1,background:"rgba(255,255,255,0.06)",borderRadius:999,height:5,overflow:"hidden"}}>
                  <div style={{width:`${pct}%`,height:"100%",background:"linear-gradient(90deg,#f59e0b,#fbbf24)",borderRadius:999}}/>
                </div>
                <span style={{color:"#334155",fontSize:"9px",width:20}}>{pct}%</span>
              </div>
            );})}
          </div>
        </div>
        {social.reviews.length===0?<div style={{...card,textAlign:"center",color:"#334155",padding:"32px"}}>Ingen anmeldelser lastet</div>:
        social.reviews.map((r,i)=>(
          <div key={i} style={{background:"rgba(255,255,255,0.025)",border:"1px solid rgba(255,255,255,0.07)",borderRadius:14,padding:"14px",marginBottom:8}}>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:8}}>
              <div style={{display:"flex",alignItems:"center",gap:8}}>
                <div style={{width:30,height:30,borderRadius:"50%",background:`linear-gradient(135deg,${accent},${accent}88)`,display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontSize:"12px",fontWeight:700}}>{r.author[0]}</div>
                <span style={{color:"#e2e8f0",fontWeight:600,fontSize:"13px"}}>{r.author}</span>
              </div>
              <div style={{textAlign:"right"}}>
                <div style={{color:"#f59e0b",fontSize:"12px"}}>{"★".repeat(r.rating)}</div>
                <div style={{color:"#334155",fontSize:"9px",marginTop:1}}>{r.time}</div>
              </div>
            </div>
            <div style={{color:"#94a3b8",fontSize:"12px",lineHeight:1.7}}>{r.text}</div>
          </div>
        ))}
      </div>}
    </div>
  );
}
