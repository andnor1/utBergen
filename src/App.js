/* eslint-disable */
import { useState, useEffect } from "react";
import { FALLBACK_VENUES, FALLBACK_EVENTS, KNOWN_SUBMITTERS } from "./constants";
import { supabase, dbFetchVenues, dbFetchEvents, dbFetchRequests, dbUpdateRequestStatus } from "./api";
import UserApp from "./UserApp";
import Pipeline from "./Pipeline";
import AdminQueue from "./AdminQueue";

export default function NattBergen(){
  const [tab,setTab]=useState("app");
  const [venues,setVenues]=useState(FALLBACK_VENUES);
  const [events,setEvents]=useState(FALLBACK_EVENTS);
  const [requests,setRequests]=useState([]);
  const [knownSubmitters,setKnownSubmitters]=useState({...KNOWN_SUBMITTERS});
  const [isLive,setIsLive]=useState(false);
  const [loading,setLoading]=useState(true);
  const [toast,setToast]=useState(null);

  useEffect(()=>{
    async function loadFromDB(){
      setLoading(true);
      const [dbVenues,dbEvents,dbRequests]=await Promise.all([dbFetchVenues(),dbFetchEvents(),dbFetchRequests()]);
      if(dbVenues.length>0){setVenues(dbVenues);setIsLive(true);}
      if(Object.keys(dbEvents).length>0) setEvents(dbEvents);
      if(dbRequests.length>0) setRequests(dbRequests);
      setLoading(false);
    }
    loadFromDB();
  },[]);

  const showToast=(msg,type="info")=>{setToast({msg,type});setTimeout(()=>setToast(null),3500);};
  const handleRequestChange=(req)=>{setRequests(p=>[req,...p]);showToast(`Ny forespørsel fra ${req.submitterName}`,"info");};
  const handleAction=async(id,status)=>{
    await dbUpdateRequestStatus(id,status);
    setRequests(p=>p.map(r=>{
      if(r.id!==id) return r;
      if(status==="approved"){const prev=knownSubmitters[r.submitterEmail]||{approved:0};setKnownSubmitters(k=>({...k,[r.submitterEmail]:{...prev,approved:prev.approved+1}}));}
      return{...r,status};
    }));
    showToast(status==="approved"?"✓ Endring godkjent!":"✕ Avvist.",status==="approved"?"success":"error");
  };
  const handlePipelineComplete=async()=>{
    const [dbVenues,dbEvents]=await Promise.all([dbFetchVenues(),dbFetchEvents()]);
    if(dbVenues.length>0) setVenues(dbVenues);
    if(Object.keys(dbEvents).length>0) setEvents(dbEvents);
    setIsLive(true);
    showToast(`✅ Pipeline ferdig – appen er oppdatert!`,"success");
  };

  const pending=requests.filter(r=>r.status==="pending").length;
  const toastColors={info:"#6366f1",success:"#22c55e",error:"#ef4444"};

  return(
    <div style={{minHeight:"100vh",background:"#060b14",fontFamily:"'Segoe UI',system-ui,sans-serif",color:"#f1f5f9"}}>
      <style>{`
        @keyframes fadeUp{from{opacity:0;transform:translateY(8px);}to{opacity:1;transform:translateY(0);}}
        @keyframes slideDown{from{opacity:0;transform:translateY(-12px);}to{opacity:1;transform:translateY(0);}}
        @keyframes spin{from{transform:rotate(0deg);}to{transform:rotate(360deg);}}
        @keyframes pulse{0%,100%{box-shadow:0 0 0 0 rgba(99,102,241,0.5);}50%{box-shadow:0 0 0 10px rgba(99,102,241,0);}}
        *{box-sizing:border-box;}
        ::-webkit-scrollbar{width:3px;height:3px;}::-webkit-scrollbar-thumb{background:#1e293b;border-radius:2px;}
        input::placeholder,textarea::placeholder{color:#334155;}
        select option{background:#0b1627;}
        a{text-decoration:none;}
      `}</style>

      {toast&&<div style={{position:"fixed",top:14,right:14,zIndex:999,background:`${toastColors[toast.type]}18`,border:`1px solid ${toastColors[toast.type]}44`,borderRadius:11,padding:"10px 16px",color:toast.type==="success"?"#4ade80":toast.type==="error"?"#f87171":"#a5b4fc",fontWeight:600,fontSize:"13px",animation:"slideDown 0.3s ease",boxShadow:"0 8px 24px rgba(0,0,0,0.4)",backdropFilter:"blur(12px)"}}>{toast.msg}</div>}

      {/* HEADER */}
      <div style={{background:"linear-gradient(180deg,rgba(99,102,241,0.1) 0%,transparent 100%)",borderBottom:"1px solid rgba(255,255,255,0.06)",padding:"13px 18px",position:"sticky",top:0,zIndex:100,backdropFilter:"blur(24px)"}}>
        <div style={{maxWidth:900,margin:"0 auto"}}>
          <div style={{display:"flex",alignItems:"center",gap:11,marginBottom:11}}>
            <div style={{background:"linear-gradient(135deg,#6366f1,#8b5cf6)",borderRadius:11,width:38,height:38,display:"flex",alignItems:"center",justifyContent:"center",fontSize:"18px",boxShadow:"0 4px 14px rgba(99,102,241,0.4)",flexShrink:0}}>🍺</div>
            <div>
              <div style={{fontSize:"18px",fontWeight:800,letterSpacing:"-0.02em"}}>utBergen</div>
              <div style={{color:"#334155",fontSize:"10px",letterSpacing:"0.05em"}}>BERGEN · GOOGLE PLACES · CLAUDE AI · SUPABASE</div>
            </div>
            <div style={{marginLeft:"auto",display:"flex",alignItems:"center",gap:6}}>
              {loading&&<span style={{color:"#64748b",fontSize:"10px",animation:"spin 1s linear infinite",display:"inline-block"}}>⟳</span>}
              <span style={{width:6,height:6,borderRadius:"50%",background:isLive?"#22c55e":"#f59e0b",display:"inline-block",boxShadow:isLive?"0 0 6px #22c55e":"0 0 6px #f59e0b"}}/>
              <span style={{color:isLive?"#4ade80":"#fbbf24",fontSize:"10px",fontWeight:600}}>{isLive?"Live data":"Fallback data"}</span>
            </div>
          </div>
          <div style={{display:"flex",gap:3}}>
            {[
              {id:"app",icon:"🍺",label:"Appen",sub:`${venues.length} utesteder`},
              {id:"pipeline",icon:"⚙️",label:"AI-pipeline",sub:"Oppdater fra Google"},
              {id:"admin",icon:"🔔",label:"Admin",sub:pending>0?`${pending} venter`:"Ingen nye",badge:pending},
            ].map(t=>(
              <button key={t.id} onClick={()=>setTab(t.id)} style={{background:tab===t.id?"rgba(99,102,241,0.12)":"transparent",border:"none",borderBottom:tab===t.id?"2px solid #6366f1":"2px solid transparent",color:tab===t.id?"#a5b4fc":"#64748b",padding:"7px 13px",cursor:"pointer",borderRadius:"6px 6px 0 0",textAlign:"left",position:"relative",transition:"all 0.2s"}}>
                <div style={{fontSize:"12px",fontWeight:700}}>{t.icon} {t.label}</div>
                <div style={{fontSize:"9px",color:tab===t.id?"#6366f1":"#334155"}}>{t.sub}</div>
                {t.badge>0&&<div style={{position:"absolute",top:-3,right:-3,width:15,height:15,borderRadius:"50%",background:"#f59e0b",color:"#000",fontSize:"9px",fontWeight:800,display:"flex",alignItems:"center",justifyContent:"center"}}>{t.badge}</div>}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div style={{maxWidth:900,margin:"0 auto",padding:"18px"}}>
        {tab==="app"&&<UserApp venues={venues} events={events} onRequestChange={handleRequestChange} knownSubmitters={knownSubmitters} loading={loading}/>}
        {tab==="pipeline"&&<Pipeline onComplete={handlePipelineComplete}/>}
        {tab==="admin"&&<AdminQueue requests={requests} onAction={handleAction}/>}
      </div>

      <div style={{textAlign:"center",padding:"16px 0 28px",color:"#1e293b",fontSize:"10px"}}>
        utBergen v5.0 · Google Places · Claude AI · Supabase · Bergen 2026
      </div>
    </div>
  );
}
