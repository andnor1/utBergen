/* eslint-disable */
import { useState, useEffect } from "react";
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
  const [logoError,setLogoError]=useState(false);
  const vEvents=events[venue.place_id]||[];
  const social=SOCIAL[venue.place_id]||{instagram:[],facebook:[],reviews:[]};

  const hasCover = venue.cover_image && !coverError;
  const hasLogo = venue.logo_url && !logoError;

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

  // Dominant category for theming
  const cats = venue.categories||[];
  const accent = cats.includes("football")?"#22c55e":cats.includes("live_music")?"#f59e0b":cats.includes("cocktail")?"#ec4899":cats.includes("nightclub")?"#8b5cf6":"#6366f1";

  return(
    <div>
      <button onClick={onBack} style={{background:"none",border:"none",color:"#6366f1",cursor:"pointer",fontSize:"12px",fontWeight:600,marginBottom:12,padding:0}}>← Tilbake</button>

      {/* ── HERO ── */}
      <div style={{position:"relative",height:220,borderRadius:16,overflow:"hidden",marginBottom:0,border:`1px solid ${accent}22`}}>
        {/* Cover bilde eller gradient */}
        {hasCover?(
          <img src={`${SERVER}/proxy-image?url=${encodeURIComponent(venue.cover_image)}`}
            alt={venue.name} onError={()=>setCoverError(true)}
            style={{width:"100%",height:"100%",objectFit:"cover"}}/>
        ):(
          <div style={{position:"absolute",inset:0,background:`linear-gradient(135deg,#0f1a35,${accent}22,#0f1a35)`}}>
            <div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",fontSize:"80px",opacity:0.08}}>
              {cats.includes("football")?"⚽":cats.includes("live_music")?"🎸":cats.includes("cocktail")?"🍸":"🍺"}
            </div>
          </div>
        )}

        {/* Gradient overlay */}
        <div style={{position:"absolute",inset:0,background:"linear-gradient(to bottom,rgba(0,0,0,0.1) 0%,rgba(6,11,20,0.85) 100%)"}}/>

        {/* Logo */}
        {hasLogo&&(
          <div style={{position:"absolute",top:12,left:14,background:"rgba(0,0,0,0.55)",borderRadius:10,padding:"6px 10px",backdropFilter:"blur(8px)",border:"1px solid rgba(255,255,255,0.1)"}}>
            <img src={`${SERVER}/proxy-image?url=${encodeURIComponent(venue.logo_url)}`}
              alt={`${venue.name} logo`} onError={()=>setLogoError(true)}
              style={{height:28,maxWidth:110,objectFit:"contain",filter:"brightness(10) saturate(0)"}}/>
          </div>
        )}

        {/* Source badges */}
        <div style={{position:"absolute",top:12,right:12,display:"flex",gap:4}}>
          {hasCover&&<SrcBadge label="Cover" color="#4285F4" icon="🖼"/>}
          {venue.instagram&&<SrcBadge label="IG" color="#ec4899" icon="📱"/>}
        </div>

        {/* Info bottom */}
        <div style={{position:"absolute",bottom:14,left:16,right:16}}>
          <div style={{fontSize:"24px",fontWeight:900,letterSpacing:"-0.02em",textShadow:"0 2px 12px rgba(0,0,0,0.8)"}}>{venue.name}</div>
          <div style={{display:"flex",alignItems:"center",gap:10,marginTop:2}}>
            <span style={{color:"rgba(255,255,255,0.5)",fontSize:"11px"}}>📍 {venue.address}</span>
            <Stars r={venue.rating}/>
            <span style={{color:"rgba(255,255,255,0.3)",fontSize:"10px"}}>{(venue.ratingCount||0).toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* Quick bar */}
      <div style={{background:"rgba(255,255,255,0.03)",borderBottom:"1px solid rgba(255,255,255,0.06)",padding:"8px 14px",display:"flex",gap:10,alignItems:"center",overflowX:"auto",scrollbarWidth:"none",marginBottom:0}}>
        {cats.map(c=><Tag key={c} small label={c.replace("_"," ")}/>)}
        <div style={{marginLeft:"auto",display:"flex",gap:5,flexShrink:0}}>
          {venue.website&&<a href={venue.website} target="_blank" rel="noopener noreferrer" style={{display:"inline-flex",alignItems:"center",gap:3,background:"rgba(34,197,94,0.1)",color:"#4ade80",border:"1px solid rgba(34,197,94,0.2)",borderRadius:999,padding:"3px 9px",fontSize:"10px",fontWeight:700,textDecoration:"none"}}>🌐 ↗</a>}
          {venue.instagram&&<a href={`https://instagram.com/${venue.instagram.replace("@","")}`} target="_blank" rel="noopener noreferrer" style={{display:"inline-flex",alignItems:"center",gap:3,background:"rgba(236,72,153,0.1)",color:"#f472b6",border:"1px solid rgba(236,72,153,0.2)",borderRadius:999,padding:"3px 9px",fontSize:"10px",fontWeight:700,textDecoration:"none"}}>📱 ↗</a>}
        </div>
      </div>

      {/* Section tabs */}
      <div style={{borderBottom:"1px solid rgba(255,255,255,0.05)",display:"flex",gap:2,overflowX:"auto",scrollbarWidth:"none",marginBottom:14}}>
        {SECTIONS.map(s=><button key={s.id} onClick={()=>setSection(s.id)} style={{background:section===s.id?"rgba(99,102,241,0.1)":"transparent",border:"none",borderBottom:section===s.id?"2px solid #6366f1":"2px solid transparent",color:section===s.id?"#a5b4fc":"#64748b",padding:"9px 12px",cursor:"pointer",fontSize:"11px",fontWeight:600,whiteSpace:"nowrap",borderRadius:"5px 5px 0 0"}}>{s.emoji} {s.label}</button>)}
      </div>

      {/* ── OVERVIEW ── */}
      {section==="overview"&&<div style={{animation:"fadeUp 0.3s ease"}}>
        <div onClick={()=>hlMode&&handleHl("description",venue.description)} style={{...card,marginBottom:10,cursor:hlMode?"pointer":"default",border:`1px solid ${hl?.field==="description"?"rgba(245,158,11,0.5)":"rgba(255,255,255,0.07)"}`,transition:"border 0.2s"}}>
          <SecTitle>Om stedet {hlMode&&<span style={{color:"#fbbf24"}}>← klikk</span>}</SecTitle>
          <div style={{color:"#94a3b8",fontSize:"13px",lineHeight:1.7}}>{venue.description||"Ingen beskrivelse ennå."}</div>
        </div>
        <div onClick={()=>hlMode&&handleHl("hours","Åpningstider")} style={{...card,marginBottom:10,cursor:hlMode?"pointer":"default",border:`1px solid ${hl?.field==="hours"?"rgba(245,158,11,0.5)":"rgba(255,255,255,0.07)"}`,transition:"border 0.2s"}}>
          <SecTitle>🕐 Åpningstider {hlMode&&<span style={{color:"#fbbf24"}}>← klikk</span>}</SecTitle>
          {Object.keys(venue.hours||{}).length===0?<div style={{color:"#334155",fontSize:"12px"}}>Ikke registrert</div>:
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"3px 16px"}}>
            {Object.entries(venue.hours||{}).map(([d,h])=><div key={d} style={{display:"flex",justifyContent:"space-between",padding:"3px 0",borderBottom:"1px solid rgba(255,255,255,0.04)"}}><span style={{color:"#64748b",fontSize:"12px"}}>{d}</span><span style={{color:h==="Stengt"?"#334155":"#94a3b8",fontSize:"12px"}}>{h}</span></div>)}
          </div>}
        </div>
        {(venue.phone||venue.email||venue.website)&&<div style={{...card,marginBottom:14}}>
          <SecTitle>📞 Kontakt</SecTitle>
          {venue.phone&&<div style={{color:"#94a3b8",fontSize:"12px",marginBottom:4}}>📞 {venue.phone}</div>}
          {venue.email&&<div style={{color:"#94a3b8",fontSize:"12px",marginBottom:4}}>✉️ {venue.email}</div>}
          {venue.website&&<a href={venue.website} target="_blank" rel="noopener noreferrer" style={{color:"#4ade80",fontSize:"12px",textDecoration:"none"}}>🌐 {venue.website.replace("https://","")}</a>}
        </div>}
        {submitted&&<div style={{background:"rgba(34,197,94,0.1)",border:"1px solid rgba(34,197,94,0.3)",borderRadius:11,padding:"12px 14px",marginBottom:12,display:"flex",gap:10}}><span style={{fontSize:"20px"}}>✅</span><div><div style={{color:"#4ade80",fontWeight:700,fontSize:"13px"}}>Forespørsel sendt!</div><div style={{color:"#64748b",fontSize:"11px"}}>Vi gjennomgår snarest.</div></div></div>}
        {!showForm&&<div style={{display:"flex",gap:8}}>
          <button onClick={()=>{setHlMode(!hlMode);setShowForm(false);}} style={{flex:1,padding:"9px",background:hlMode?"rgba(245,158,11,0.1)":"rgba(255,255,255,0.03)",border:`1px solid ${hlMode?"rgba(245,158,11,0.3)":"rgba(255,255,255,0.08)"}`,borderRadius:10,color:hlMode?"#fbbf24":"#64748b",cursor:"pointer",fontSize:"11px",fontWeight:600}}>{hlMode?"✕ Avbryt":"🖊 Marker feil direkte"}</button>
          <button onClick={()=>{setShowForm(true);setHlMode(false);}} style={{flex:2,padding:"9px",background:"rgba(99,102,241,0.1)",border:"1px solid rgba(99,102,241,0.25)",borderRadius:10,color:"#a5b4fc",cursor:"pointer",fontSize:"11px",fontWeight:600}}>⚠️ Er noe galt? Send endringsforslag</button>
        </div>}
        {showForm&&<div style={{background:"rgba(255,255,255,0.03)",border:"1px solid rgba(99,102,241,0.2)",borderRadius:13,padding:"16px",marginTop:10}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}><span style={{color:"#a5b4fc",fontWeight:700,fontSize:"13px"}}>📝 Send endringsforslag</span><button onClick={()=>{setShowForm(false);setHl(null);}} style={{background:"none",border:"none",color:"#475569",cursor:"pointer",fontSize:"16px"}}>✕</button></div>
          {hl&&<div style={{background:"rgba(245,158,11,0.08)",border:"1px solid rgba(245,158,11,0.25)",borderRadius:8,padding:"7px 10px",marginBottom:10}}><div style={{color:"#fbbf24",fontSize:"10px",fontWeight:600}}>🖊 Markert: "{hl.value}"</div></div>}
          <div style={{display:"flex",flexDirection:"column",gap:9}}>
            <div><label style={lbl}>E-post *</label><input value={form.email} onChange={e=>setForm(p=>({...p,email:e.target.value}))} onBlur={handleEmailBlur} placeholder="din@epost.no" style={inp}/>{lookup&&<div style={{marginTop:4,background:"rgba(34,197,94,0.07)",border:"1px solid rgba(34,197,94,0.2)",borderRadius:7,padding:"5px 9px",display:"flex",alignItems:"center",gap:7}}><span style={{color:"#4ade80",fontSize:"10px"}}>✓ Vi kjenner deg igjen!</span><TrustBadge score={ROLES.find(r=>r.value===lookup.role)?.trust||1} approved={lookup.approved} isKnown={true}/></div>}</div>
            <div><label style={lbl}>Navn *</label><input value={form.name} onChange={e=>setForm(p=>({...p,name:e.target.value}))} placeholder="Ditt navn" style={inp}/></div>
            <div><label style={lbl}>Tilknytning *</label><select value={form.role} onChange={e=>setForm(p=>({...p,role:e.target.value}))} style={{...inp,background:"#0b1627"}}><option value="" disabled>Velg rolle...</option>{ROLES.map(r=><option key={r.value} value={r.value}>{r.label}</option>)}</select></div>
            <div><label style={lbl}>Gjelder *</label><div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:5}}>{CHANGE_TYPES.map(ct=><button key={ct.value} onClick={()=>setForm(p=>({...p,changeType:ct.value}))} style={{padding:"7px 4px",background:form.changeType===ct.value?"rgba(99,102,241,0.15)":"rgba(255,255,255,0.03)",border:`1px solid ${form.changeType===ct.value?"rgba(99,102,241,0.4)":"rgba(255,255,255,0.07)"}`,borderRadius:8,color:form.changeType===ct.value?"#a5b4fc":"#64748b",cursor:"pointer",fontSize:"10px",fontWeight:600,textAlign:"center"}}><div style={{fontSize:"14px",marginBottom:1}}>{ct.emoji}</div>{ct.label}</button>)}</div></div>
            <div><label style={lbl}>Beskriv *</label><textarea value={form.content} onChange={e=>setForm(p=>({...p,content:e.target.value}))} placeholder="Hva er feil og hva skal det stå?" rows={3} style={{...inp,resize:"vertical"}}/></div>
            <button onClick={handleSubmit} style={{width:"100%",padding:"11px",background:"linear-gradient(135deg,#6366f1,#8b5cf6)",border:"none",borderRadius:10,color:"#fff",fontSize:"13px",fontWeight:700,cursor:"pointer"}}>Send endringsforslag →</button>
          </div>
        </div>}
      </div>}

      {/* ── PHOTOS ── */}
      {section==="photos"&&<div style={{animation:"fadeUp 0.3s ease"}}>
        <div style={{display:"flex",justifyContent:"flex-end",marginBottom:8}}><SrcBadge label="Google Places" color="#4285F4" icon="🔍"/></div>
        {venue.photo_references?.length>0?(
          <>
            <div style={{height:240,borderRadius:14,overflow:"hidden",marginBottom:8,position:"relative",border:"1px solid rgba(255,255,255,0.08)"}}>
              <img src={`${SERVER}/places/photo?photo_reference=${venue.photo_references[photoIdx]}&maxwidth=900`}
                alt={venue.name} style={{width:"100%",height:"100%",objectFit:"cover"}}
                onError={e=>{e.target.style.display="none";}}/>
              <div style={{position:"absolute",bottom:10,left:12,color:"rgba(255,255,255,0.5)",fontSize:"10px",background:"rgba(0,0,0,0.5)",padding:"2px 8px",borderRadius:999}}>
                {photoIdx+1} / {venue.photo_references.length} · Google Places
              </div>
              {venue.photo_references.length>1&&<>
                <button onClick={()=>setPhotoIdx((photoIdx-1+venue.photo_references.length)%venue.photo_references.length)} style={{position:"absolute",left:10,top:"50%",transform:"translateY(-50%)",background:"rgba(0,0,0,0.5)",border:"1px solid rgba(255,255,255,0.2)",borderRadius:"50%",width:36,height:36,color:"#fff",cursor:"pointer",fontSize:"18px",display:"flex",alignItems:"center",justifyContent:"center"}}>‹</button>
                <button onClick={()=>setPhotoIdx((photoIdx+1)%venue.photo_references.length)} style={{position:"absolute",right:10,top:"50%",transform:"translateY(-50%)",background:"rgba(0,0,0,0.5)",border:"1px solid rgba(255,255,255,0.2)",borderRadius:"50%",width:36,height:36,color:"#fff",cursor:"pointer",fontSize:"18px",display:"flex",alignItems:"center",justifyContent:"center"}}>›</button>
              </>}
            </div>
            <div style={{display:"flex",gap:6,overflowX:"auto",scrollbarWidth:"none"}}>
              {venue.photo_references.map((ref,i)=>(
                <img key={i} src={`${SERVER}/places/photo?photo_reference=${ref}&maxwidth=200`}
                  alt={`${venue.name} ${i+1}`} onClick={()=>setPhotoIdx(i)}
                  style={{width:60,height:44,borderRadius:8,objectFit:"cover",cursor:"pointer",border:`2px solid ${i===photoIdx?"#6366f1":"rgba(255,255,255,0.08)"}`,opacity:i===photoIdx?1:0.6,flexShrink:0}}
                  onError={e=>{e.target.style.display="none";}}/>
              ))}
            </div>
          </>
        ):<div style={{...card,textAlign:"center",color:"#334155",padding:"40px"}}>Ingen bilder ennå – kjør pipeline</div>}
      </div>}

      {/* ── EVENTS ── */}
      {section==="events"&&<div style={{animation:"fadeUp 0.3s ease"}}>
        <div style={{display:"flex",justifyContent:"flex-end",marginBottom:8}}><SrcBadge label="AI-agent" color="#22c55e" icon="🤖"/></div>
        {vEvents.length===0?<div style={{...card,textAlign:"center",color:"#334155",padding:"40px"}}>Ingen registrerte eventer for {venue.name}</div>:
        <div style={{display:"flex",flexDirection:"column",gap:6}}>
          {vEvents.map((ev)=>{const cfg=EV[ev.type]||{color:"#64748b",emoji:"📅"};return(
            <div key={ev.id} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 12px",background:"rgba(255,255,255,0.02)",borderLeft:`3px solid ${cfg.color}`,borderRadius:"0 10px 10px 0"}}>
              <span style={{fontSize:"16px"}}>{cfg.emoji}</span>
              <div style={{flex:1}}><div style={{color:"#f1f5f9",fontWeight:600,fontSize:"13px"}}>{ev.title}</div>{ev.league&&<span style={{color:cfg.color,fontSize:"10px",fontWeight:700}}>{ev.league}</span>}</div>
              <div style={{textAlign:"right"}}><div style={{color:cfg.color,fontWeight:700,fontSize:"12px"}}>{ev.time}</div><div style={{color:"#475569",fontSize:"10px"}}>{ev.date}</div></div>
            </div>
          );})}
        </div>}
      </div>}

      {/* ── SOCIAL ── */}
      {section==="social"&&<div style={{animation:"fadeUp 0.3s ease"}}>
        <div style={{marginBottom:16}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:8}}>
            <SecTitle>📱 Instagram</SecTitle>
            {venue.instagram&&<a href={`https://instagram.com/${venue.instagram.replace("@","")}`} target="_blank" rel="noopener noreferrer" style={{display:"inline-flex",alignItems:"center",gap:3,background:"rgba(236,72,153,0.1)",color:"#f472b6",border:"1px solid rgba(236,72,153,0.2)",borderRadius:999,padding:"2px 8px",fontSize:"10px",fontWeight:700,textDecoration:"none"}}>{venue.instagram} ↗</a>}
          </div>
          {social.instagram.length===0?<div style={{...card,textAlign:"center",color:"#334155",padding:"24px"}}>{venue.instagram?"Ingen innlegg funnet":"Ingen Instagram registrert"}</div>:
          <div style={{display:"flex",flexDirection:"column",gap:6}}>
            {social.instagram.map(p=>{const cfg=EV[p.type]||EV.general||{color:"#64748b",emoji:"📸"};return(
              <div key={p.id} style={{...card}}>
                <div style={{display:"flex",alignItems:"flex-start",gap:9}}>
                  <div style={{width:40,height:40,borderRadius:8,flexShrink:0,background:`linear-gradient(135deg,${cfg.color}33,${cfg.color}11)`,border:`1px solid ${cfg.color}33`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:"18px"}}>{cfg.emoji}</div>
                  <div style={{flex:1}}><div style={{color:"#e2e8f0",fontSize:"12px",lineHeight:1.5}}>{p.caption}</div><div style={{display:"flex",gap:8,marginTop:4}}><span style={{color:"#475569",fontSize:"10px"}}>{p.time}</span><span style={{color:"#475569",fontSize:"10px"}}>❤️ {p.likes}</span></div></div>
                </div>
              </div>
            );})}
          </div>}
        </div>
        <div>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:8}}>
            <SecTitle>📘 Facebook</SecTitle>
            {venue.facebook&&<a href={`https://facebook.com/${venue.facebook}`} target="_blank" rel="noopener noreferrer" style={{display:"inline-flex",alignItems:"center",gap:3,background:"rgba(24,119,242,0.1)",color:"#60a5fa",border:"1px solid rgba(24,119,242,0.2)",borderRadius:999,padding:"2px 8px",fontSize:"10px",fontWeight:700,textDecoration:"none"}}>Åpne ↗</a>}
          </div>
          {social.facebook.length===0?<div style={{...card,textAlign:"center",color:"#334155",padding:"24px"}}>{venue.facebook?"Ingen innlegg funnet":"Ingen Facebook registrert"}</div>:
          <div style={{display:"flex",flexDirection:"column",gap:6}}>
            {social.facebook.map(p=>{const cfg=EV[p.type]||{color:"#64748b",emoji:"📅"};return(
              <div key={p.id} style={{...card}}>
                <div style={{display:"flex",alignItems:"center",gap:7,marginBottom:7}}>
                  <div style={{width:28,height:28,borderRadius:"50%",background:"linear-gradient(135deg,#1877F2,#0a5dd1)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"12px",color:"#fff",fontWeight:700}}>F</div>
                  <div><div style={{color:"#f1f5f9",fontWeight:600,fontSize:"12px"}}>{venue.name}</div><div style={{color:"#475569",fontSize:"10px"}}>{p.time}</div></div>
                </div>
                <div style={{color:"#94a3b8",fontSize:"12px",lineHeight:1.7,whiteSpace:"pre-line"}}>{p.content}</div>
                <div style={{display:"flex",gap:10,marginTop:7,color:"#475569",fontSize:"11px"}}><span>👍 {p.likes}</span><span>↗ {p.shares} delinger</span></div>
              </div>
            );})}
          </div>}
        </div>
      </div>}

      {/* ── REVIEWS ── */}
      {section==="reviews"&&<div style={{animation:"fadeUp 0.3s ease"}}>
        <div style={{display:"flex",justifyContent:"flex-end",marginBottom:8}}><SrcBadge label="Google" color="#4285F4" icon="🔍"/></div>
        <div style={{display:"flex",alignItems:"center",gap:14,padding:"12px",...card,marginBottom:12}}>
          <div style={{textAlign:"center"}}><div style={{color:"#f59e0b",fontSize:"32px",fontWeight:800,lineHeight:1}}>{venue.rating||0}</div><div style={{color:"#f59e0b",fontSize:"13px"}}>{"★".repeat(Math.round(venue.rating||0))}</div><div style={{color:"#475569",fontSize:"10px"}}>{(venue.ratingCount||0).toLocaleString()} anmeldelser</div></div>
          <div style={{flex:1}}>
            {[5,4,3,2,1].map(n=>{const pct=n===5?60:n===4?25:n===3?10:3;return(<div key={n} style={{display:"flex",alignItems:"center",gap:5,marginBottom:3}}><span style={{color:"#f59e0b",fontSize:"10px",width:8}}>{n}</span><div style={{flex:1,background:"rgba(255,255,255,0.06)",borderRadius:999,height:4,overflow:"hidden"}}><div style={{width:`${pct}%`,height:"100%",background:"#f59e0b",borderRadius:999}}/></div></div>);})}
          </div>
        </div>
        {social.reviews.length===0?<div style={{...card,textAlign:"center",color:"#334155",padding:"28px"}}>Ingen anmeldelser lastet</div>:
        social.reviews.map((r,i)=>(
          <div key={i} style={{...card,marginBottom:7}}>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:5}}>
              <div style={{display:"flex",alignItems:"center",gap:7}}><div style={{width:26,height:26,borderRadius:"50%",background:"linear-gradient(135deg,#6366f1,#8b5cf6)",display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontSize:"10px",fontWeight:700}}>{r.author[0]}</div><span style={{color:"#e2e8f0",fontWeight:600,fontSize:"12px"}}>{r.author}</span></div>
              <div style={{textAlign:"right"}}><div style={{color:"#f59e0b",fontSize:"11px"}}>{"★".repeat(r.rating)}</div><div style={{color:"#334155",fontSize:"9px"}}>{r.time}</div></div>
            </div>
            <div style={{color:"#94a3b8",fontSize:"12px",lineHeight:1.6}}>{r.text}</div>
          </div>
        ))}
      </div>}
    </div>
  );
}
