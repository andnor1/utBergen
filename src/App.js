/* eslint-disable */
import { useState, useEffect } from "react";
import { FALLBACK_VENUES, FALLBACK_EVENTS, KNOWN_SUBMITTERS, inp, lbl } from "./constants";
import { supabase, dbFetchVenues, dbFetchEvents, dbFetchRequests, dbUpdateRequestStatus } from "./api";
import UserApp from "./UserApp";
import Pipeline from "./Pipeline";
import AdminQueue from "./AdminQueue";

// ─── ADMIN LOGIN ──────────────────────────────────────────────────────────────

function AdminLogin({ onLogin, onClose }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async () => {
    if (!email || !password) return;
    setLoading(true);
    setError("");
    const { data, error: err } = await supabase.auth.signInWithPassword({ email, password });
    if (err) { setError(err.message); setLoading(false); return; }
    onLogin(data.user);
    setLoading(false);
  };

  return (
    <div style={{ position:"fixed",inset:0,background:"rgba(0,0,0,0.85)",backdropFilter:"blur(12px)",zIndex:500,display:"flex",alignItems:"center",justifyContent:"center",padding:20 }}>
      <div style={{ background:"#0f1a2e",border:"1px solid rgba(99,102,241,0.3)",borderRadius:18,padding:28,width:"100%",maxWidth:380,boxShadow:"0 24px 60px rgba(0,0,0,0.6)" }}>
        <div style={{ textAlign:"center",marginBottom:24 }}>
          <div style={{ fontSize:32,marginBottom:8 }}>🔐</div>
          <div style={{ fontSize:18,fontWeight:800 }}>Admin-innlogging</div>
          <div style={{ color:"#64748b",fontSize:12,marginTop:4 }}>utBergen administrasjon</div>
        </div>
        {error&&<div style={{ background:"rgba(239,68,68,0.1)",border:"1px solid rgba(239,68,68,0.3)",borderRadius:10,padding:"10px 14px",marginBottom:14,color:"#f87171",fontSize:13 }}>{error}</div>}
        <div style={{ display:"flex",flexDirection:"column",gap:12 }}>
          <div><label style={lbl}>E-post</label><input value={email} onChange={e=>setEmail(e.target.value)} placeholder="admin@utbergen.no" type="email" style={inp} onKeyDown={e=>e.key==="Enter"&&handleLogin()}/></div>
          <div><label style={lbl}>Passord</label><input value={password} onChange={e=>setPassword(e.target.value)} placeholder="••••••••" type="password" style={inp} onKeyDown={e=>e.key==="Enter"&&handleLogin()}/></div>
          <button onClick={handleLogin} disabled={loading} style={{ width:"100%",padding:13,background:"linear-gradient(135deg,#6366f1,#8b5cf6)",border:"none",borderRadius:11,color:"#fff",fontSize:14,fontWeight:700,cursor:loading?"not-allowed":"pointer",marginTop:4,boxShadow:"0 4px 16px rgba(99,102,241,0.4)" }}>
            {loading?"⟳ Logger inn...":"Logg inn →"}
          </button>
          <button onClick={onClose} style={{ background:"none",border:"none",color:"#475569",cursor:"pointer",fontSize:12,padding:"4px 0" }}>Avbryt</button>
        </div>
      </div>
    </div>
  );
}

// ─── ADMIN PANEL ──────────────────────────────────────────────────────────────

function AdminPanel({ user, venues, onRefresh, showToast, onClose }) {
  const [view, setView] = useState("queue");
  const [requests, setRequests] = useState([]);
  const [editVenue, setEditVenue] = useState(null);
  const [venueSearch, setVenueSearch] = useState("");
  const [venueUrls, setVenueUrls] = useState([]);
  const [newUrl, setNewUrl] = useState({ url:"", description:"" });
  const [saving, setSaving] = useState(false);

  useEffect(()=>{ loadRequests(); },[]);

  const loadRequests = async () => {
    const { data } = await supabase.from("change_requests").select("*").order("created_at",{ascending:false});
    setRequests(data||[]);
  };

  const handleAction = async (id, status) => {
    await supabase.from("change_requests").update({status}).eq("id",id);
    setRequests(p=>p.map(r=>r.id===id?{...r,status}:r));
    showToast(status==="approved"?"✓ Godkjent!":"✕ Avvist.",status==="approved"?"success":"error");
  };

  const openVenueEditor = async (venue) => {
    setEditVenue({...venue});
    const { data } = await supabase.from("venue_urls").select("*").eq("venue_id",venue.place_id);
    setVenueUrls(data||[]);
    setNewUrl({url:"",description:""});
  };

  const saveVenue = async () => {
    if(!editVenue) return;
    setSaving(true);
    await supabase.from("venues").update({
      name:editVenue.name, address:editVenue.address,
      website:editVenue.website||null, phone:editVenue.phone||null,
      instagram:editVenue.instagram||null, facebook:editVenue.facebook||null,
      description:editVenue.description||null, hours:editVenue.hours||{},
    }).eq("place_id",editVenue.place_id);
    setSaving(false);
    showToast("✓ Utested lagret!","success");
    onRefresh();
  };

  const addUrl = async () => {
    if(!newUrl.url||!editVenue) return;
    await supabase.from("venue_urls").insert([{venue_id:editVenue.place_id,url:newUrl.url,description:newUrl.description||newUrl.url,url_type:"events",active:true}]);
    const { data } = await supabase.from("venue_urls").select("*").eq("venue_id",editVenue.place_id);
    setVenueUrls(data||[]);
    setNewUrl({url:"",description:""});
    showToast("✓ URL lagt til!","success");
  };

  const deleteUrl = async (id) => {
    await supabase.from("venue_urls").delete().eq("id",id);
    setVenueUrls(p=>p.filter(u=>u.id!==id));
  };

  const toggleUrl = async (id, active) => {
    await supabase.from("venue_urls").update({active:!active}).eq("id",id);
    setVenueUrls(p=>p.map(u=>u.id===id?{...u,active:!active}:u));
  };

  const filteredVenues = venues.filter(v=>!venueSearch||v.name?.toLowerCase().includes(venueSearch.toLowerCase())||v.address?.toLowerCase().includes(venueSearch.toLowerCase()));
  const pending = requests.filter(r=>r.status==="pending").length;

  return (
    <div style={{ minHeight:"100vh",background:"#060b14",color:"#f1f5f9",fontFamily:"'Segoe UI',system-ui,sans-serif" }}>
      <style>{`@keyframes fadeUp{from{opacity:0;transform:translateY(8px);}to{opacity:1;transform:translateY(0);}}@keyframes spin{from{transform:rotate(0deg);}to{transform:rotate(360deg);}}*{box-sizing:border-box;}::-webkit-scrollbar{width:3px;}::-webkit-scrollbar-thumb{background:#1e293b;border-radius:2px;}input::placeholder,textarea::placeholder{color:#334155;}a{text-decoration:none;}`}</style>

      {/* Admin header */}
      <div style={{ background:"linear-gradient(180deg,rgba(239,68,68,0.1) 0%,transparent 100%)",borderBottom:"1px solid rgba(239,68,68,0.2)",padding:"13px 18px",position:"sticky",top:0,zIndex:100,backdropFilter:"blur(24px)" }}>
        <div style={{ maxWidth:900,margin:"0 auto",display:"flex",alignItems:"center",gap:12 }}>
          <div style={{ background:"linear-gradient(135deg,#ef4444,#dc2626)",borderRadius:10,width:34,height:34,display:"flex",alignItems:"center",justifyContent:"center",fontSize:16 }}>🛠</div>
          <div><div style={{ fontWeight:800,fontSize:16 }}>Admin-panel</div><div style={{ color:"#64748b",fontSize:10 }}>{user?.email}</div></div>
          <div style={{ marginLeft:"auto",display:"flex",gap:8 }}>
            <button onClick={onClose} style={{ background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:8,color:"#94a3b8",cursor:"pointer",fontSize:12,fontWeight:600,padding:"6px 12px" }}>← Tilbake</button>
            <button onClick={async()=>{await supabase.auth.signOut();onClose();}} style={{ background:"rgba(239,68,68,0.1)",border:"1px solid rgba(239,68,68,0.2)",borderRadius:8,color:"#f87171",cursor:"pointer",fontSize:12,fontWeight:600,padding:"6px 12px" }}>Logg ut</button>
          </div>
        </div>
        <div style={{ maxWidth:900,margin:"10px auto 0",display:"flex",gap:3 }}>
          {[{id:"queue",label:`🔔 Køen (${pending})`},{id:"venues",label:"🏙 Utesteder"},{id:"pipeline",label:"⚙️ Pipeline"}].map(t=>(
            <button key={t.id} onClick={()=>setView(t.id)} style={{ background:view===t.id?"rgba(239,68,68,0.1)":"transparent",border:"none",borderBottom:view===t.id?"2px solid #ef4444":"2px solid transparent",color:view===t.id?"#f87171":"#64748b",padding:"7px 14px",cursor:"pointer",fontSize:12,fontWeight:600,borderRadius:"5px 5px 0 0" }}>{t.label}</button>
          ))}
        </div>
      </div>

      <div style={{ maxWidth:900,margin:"0 auto",padding:18 }}>

        {/* KØEN */}
        {view==="queue"&&<div>
          {requests.length===0&&<div style={{ textAlign:"center",color:"#334155",padding:"60px 0" }}>Ingen forespørsler</div>}
          {requests.map(req=>(
            <div key={req.id} style={{ background:"rgba(255,255,255,0.025)",border:`1px solid ${req.status==="pending"?"rgba(245,158,11,0.3)":"rgba(255,255,255,0.07)"}`,borderRadius:14,padding:"14px 16px",marginBottom:10 }}>
              <div style={{ display:"flex",justifyContent:"space-between",marginBottom:8 }}>
                <div><span style={{ fontWeight:700,fontSize:14 }}>{req.submitter_name}</span><span style={{ color:"#64748b",fontSize:12,marginLeft:8 }}>{req.role} · {req.venue_name}</span></div>
                <span style={{ color:req.status==="pending"?"#fbbf24":req.status==="approved"?"#4ade80":"#f87171",fontSize:11,fontWeight:700 }}>{req.status==="pending"?"⏳ Venter":req.status==="approved"?"✓ Godkjent":"✕ Avvist"}</span>
              </div>
              <div style={{ background:"rgba(0,0,0,0.2)",borderRadius:8,padding:"8px 12px",color:"#94a3b8",fontSize:12,marginBottom:req.status==="pending"?10:0 }}>{req.content}</div>
              {req.status==="pending"&&<div style={{ display:"flex",gap:8 }}>
                <button onClick={()=>handleAction(req.id,"approved")} style={{ flex:1,padding:"8px",background:"rgba(34,197,94,0.12)",border:"1px solid rgba(34,197,94,0.3)",borderRadius:9,color:"#4ade80",cursor:"pointer",fontSize:12,fontWeight:700 }}>✓ Godkjenn</button>
                <button onClick={()=>handleAction(req.id,"rejected")} style={{ flex:1,padding:"8px",background:"rgba(239,68,68,0.1)",border:"1px solid rgba(239,68,68,0.25)",borderRadius:9,color:"#f87171",cursor:"pointer",fontSize:12,fontWeight:700 }}>✕ Avvis</button>
              </div>}
            </div>
          ))}
        </div>}

        {/* UTESTEDER */}
        {view==="venues"&&<div style={{ display:"grid",gridTemplateColumns:editVenue?"1fr 1fr":"1fr",gap:16 }}>
          <div>
            <input value={venueSearch} onChange={e=>setVenueSearch(e.target.value)} placeholder="Søk utested..." style={{ ...inp,marginBottom:12 }}/>
            <div style={{ maxHeight:600,overflowY:"auto" }}>
              {filteredVenues.map(v=>(
                <div key={v.place_id} onClick={()=>openVenueEditor(v)}
                  style={{ background:editVenue?.place_id===v.place_id?"rgba(99,102,241,0.1)":"rgba(255,255,255,0.025)",border:`1px solid ${editVenue?.place_id===v.place_id?"rgba(99,102,241,0.4)":"rgba(255,255,255,0.07)"}`,borderRadius:11,padding:"10px 13px",marginBottom:6,cursor:"pointer",transition:"all 0.2s" }}>
                  <div style={{ fontWeight:700,fontSize:13 }}>{v.name}</div>
                  <div style={{ color:"#64748b",fontSize:11 }}>{v.address}</div>
                  <div style={{ display:"flex",gap:4,marginTop:4 }}>
                    {v.website&&<span style={{ color:"#4ade80",fontSize:9 }}>🌐</span>}
                    {v.instagram&&<span style={{ color:"#f472b6",fontSize:9 }}>📱</span>}
                    {v.cover_image&&<span style={{ color:"#f59e0b",fontSize:9 }}>🖼</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>
          {editVenue&&<div style={{ background:"rgba(255,255,255,0.02)",border:"1px solid rgba(255,255,255,0.07)",borderRadius:16,padding:18,maxHeight:700,overflowY:"auto" }}>
            <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16 }}>
              <div style={{ fontWeight:700,fontSize:15 }}>{editVenue.name}</div>
              <button onClick={()=>setEditVenue(null)} style={{ background:"none",border:"none",color:"#475569",cursor:"pointer",fontSize:18 }}>✕</button>
            </div>
            <div style={{ display:"flex",flexDirection:"column",gap:10 }}>
              <div style={{ color:"#6366f1",fontSize:10,fontWeight:700,letterSpacing:"0.1em",textTransform:"uppercase",borderBottom:"1px solid rgba(99,102,241,0.2)",paddingBottom:5 }}>Basis info</div>
              <div><label style={lbl}>Navn</label><input value={editVenue.name||""} onChange={e=>setEditVenue(p=>({...p,name:e.target.value}))} style={inp}/></div>
              <div><label style={lbl}>Adresse</label><input value={editVenue.address||""} onChange={e=>setEditVenue(p=>({...p,address:e.target.value}))} style={inp}/></div>
              <div><label style={lbl}>Beskrivelse</label><textarea value={editVenue.description||""} onChange={e=>setEditVenue(p=>({...p,description:e.target.value}))} rows={3} style={{ ...inp,resize:"vertical" }}/></div>
              <div style={{ color:"#6366f1",fontSize:10,fontWeight:700,letterSpacing:"0.1em",textTransform:"uppercase",borderBottom:"1px solid rgba(99,102,241,0.2)",paddingBottom:5,marginTop:4 }}>Kontakt</div>
              <div><label style={lbl}>Nettside</label><input value={editVenue.website||""} onChange={e=>setEditVenue(p=>({...p,website:e.target.value}))} placeholder="https://..." style={inp}/></div>
              <div><label style={lbl}>Telefon</label><input value={editVenue.phone||""} onChange={e=>setEditVenue(p=>({...p,phone:e.target.value}))} placeholder="+47 xx xx xx xx" style={inp}/></div>
              <div><label style={lbl}>Instagram</label><input value={editVenue.instagram||""} onChange={e=>setEditVenue(p=>({...p,instagram:e.target.value}))} placeholder="@handle" style={inp}/></div>
              <div><label style={lbl}>Facebook</label><input value={editVenue.facebook||""} onChange={e=>setEditVenue(p=>({...p,facebook:e.target.value}))} placeholder="facebook-side" style={inp}/></div>
              <div style={{ color:"#6366f1",fontSize:10,fontWeight:700,letterSpacing:"0.1em",textTransform:"uppercase",borderBottom:"1px solid rgba(99,102,241,0.2)",paddingBottom:5,marginTop:4 }}>Åpningstider</div>
              {["Man","Tir","Ons","Tor","Fre","Lør","Søn"].map(day=>(
                <div key={day} style={{ display:"flex",alignItems:"center",gap:8 }}>
                  <span style={{ color:"#64748b",fontSize:12,width:28,flexShrink:0 }}>{day}</span>
                  <input value={editVenue.hours?.[day]||""} onChange={e=>setEditVenue(p=>({...p,hours:{...p.hours,[day]:e.target.value}}))} placeholder="Stengt" style={{ ...inp,padding:"6px 10px",fontSize:12 }}/>
                </div>
              ))}
              <div style={{ color:"#6366f1",fontSize:10,fontWeight:700,letterSpacing:"0.1em",textTransform:"uppercase",borderBottom:"1px solid rgba(99,102,241,0.2)",paddingBottom:5,marginTop:4 }}>Event-URL-er</div>
              {venueUrls.map(u=>(
                <div key={u.id} style={{ background:"rgba(255,255,255,0.03)",border:`1px solid ${u.active?"rgba(34,197,94,0.2)":"rgba(255,255,255,0.05)"}`,borderRadius:9,padding:"8px 10px",display:"flex",alignItems:"center",gap:8 }}>
                  <div style={{ flex:1,minWidth:0 }}>
                    <div style={{ color:"#94a3b8",fontSize:11,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>{u.url}</div>
                    {u.description&&<div style={{ color:"#475569",fontSize:10 }}>{u.description}</div>}
                  </div>
                  <button onClick={()=>toggleUrl(u.id,u.active)} style={{ background:u.active?"rgba(34,197,94,0.12)":"rgba(100,116,139,0.12)",border:`1px solid ${u.active?"rgba(34,197,94,0.3)":"rgba(100,116,139,0.2)"}`,borderRadius:6,color:u.active?"#4ade80":"#64748b",cursor:"pointer",fontSize:10,fontWeight:600,padding:"3px 8px",whiteSpace:"nowrap" }}>{u.active?"Aktiv":"Av"}</button>
                  <button onClick={()=>deleteUrl(u.id)} style={{ background:"rgba(239,68,68,0.1)",border:"1px solid rgba(239,68,68,0.2)",borderRadius:6,color:"#f87171",cursor:"pointer",fontSize:11,padding:"3px 8px" }}>✕</button>
                </div>
              ))}
              {venueUrls.length===0&&<div style={{ color:"#334155",fontSize:12 }}>Ingen URL-er registrert</div>}
              <div style={{ background:"rgba(99,102,241,0.06)",border:"1px solid rgba(99,102,241,0.15)",borderRadius:10,padding:10 }}>
                <div style={{ color:"#a5b4fc",fontSize:11,fontWeight:600,marginBottom:7 }}>+ Legg til URL</div>
                <input value={newUrl.url} onChange={e=>setNewUrl(p=>({...p,url:e.target.value}))} placeholder="https://utested.no/eventer" style={{ ...inp,marginBottom:6 }}/>
                <input value={newUrl.description} onChange={e=>setNewUrl(p=>({...p,description:e.target.value}))} placeholder="Beskrivelse (valgfritt)" style={{ ...inp,marginBottom:8 }}/>
                <button onClick={addUrl} disabled={!newUrl.url} style={{ width:"100%",padding:"8px",background:newUrl.url?"linear-gradient(135deg,#6366f1,#8b5cf6)":"rgba(99,102,241,0.2)",border:"none",borderRadius:8,color:"#fff",cursor:newUrl.url?"pointer":"not-allowed",fontSize:12,fontWeight:700 }}>Legg til URL</button>
              </div>
              <button onClick={saveVenue} disabled={saving} style={{ width:"100%",padding:"12px",background:"linear-gradient(135deg,#059669,#10b981)",border:"none",borderRadius:11,color:"#fff",fontSize:13,fontWeight:700,cursor:saving?"not-allowed":"pointer",marginTop:4 }}>
                {saving?"⟳ Lagrer...":"✓ Lagre endringer"}
              </button>
            </div>
          </div>}
        </div>}

        {/* PIPELINE */}
        {view==="pipeline"&&<Pipeline onComplete={()=>{showToast("✅ Pipeline ferdig!","success");onRefresh();}}/>}
      </div>
    </div>
  );
}

// ─── ROOT ─────────────────────────────────────────────────────────────────────

export default function NattBergen() {
  const [tab, setTab] = useState("app");
  const [venues, setVenues] = useState(FALLBACK_VENUES);
  const [events, setEvents] = useState(FALLBACK_EVENTS);
  const [requests, setRequests] = useState([]);
  const [knownSubmitters, setKnownSubmitters] = useState({...KNOWN_SUBMITTERS});
  const [isLive, setIsLive] = useState(false);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [adminMode, setAdminMode] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [adminUser, setAdminUser] = useState(null);
  const [adminClickCount, setAdminClickCount] = useState(0);

  useEffect(() => {
    loadFromDB();
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) setAdminUser(session.user);
    });
  }, []);

  async function loadFromDB() {
    setLoading(true);
    const [dbVenues, dbEvents, dbRequests] = await Promise.all([dbFetchVenues(), dbFetchEvents(), dbFetchRequests()]);
    if (dbVenues.length > 0) { setVenues(dbVenues); setIsLive(true); }
    if (Object.keys(dbEvents).length > 0) setEvents(dbEvents);
    if (dbRequests.length > 0) setRequests(dbRequests);
    setLoading(false);
  }

  const showToast = (msg, type="info") => { setToast({msg,type}); setTimeout(()=>setToast(null),3500); };
  const handleRequestChange = (req) => { setRequests(p=>[req,...p]); showToast(`Ny forespørsel fra ${req.submitterName}`,"info"); };
  const handleAction = async (id, status) => {
    await dbUpdateRequestStatus(id, status);
    setRequests(p=>p.map(r=>{
      if(r.id!==id) return r;
      if(status==="approved"){const prev=knownSubmitters[r.submitterEmail]||{approved:0};setKnownSubmitters(k=>({...k,[r.submitterEmail]:{...prev,approved:prev.approved+1}}));}
      return{...r,status};
    }));
    showToast(status==="approved"?"✓ Endring godkjent!":"✕ Avvist.",status==="approved"?"success":"error");
  };
  const handlePipelineComplete = async () => {
    const [dbVenues, dbEvents] = await Promise.all([dbFetchVenues(), dbFetchEvents()]);
    if (dbVenues.length > 0) setVenues(dbVenues);
    if (Object.keys(dbEvents).length > 0) setEvents(dbEvents);
    setIsLive(true);
    showToast("✅ Pipeline ferdig – appen er oppdatert!","success");
  };

  // Skjult admin-aktivering: trykk 5 ganger på versjonsnummeret
  const handleVersionClick = () => {
    const count = adminClickCount + 1;
    setAdminClickCount(count);
    if (count >= 5) {
      setAdminClickCount(0);
      if (adminUser) setAdminMode(true);
      else setShowLogin(true);
    }
  };

  const pending = requests.filter(r=>r.status==="pending").length;
  const toastColors = {info:"#6366f1",success:"#22c55e",error:"#ef4444"};

  if (adminMode && adminUser) {
    return <AdminPanel user={adminUser} venues={venues} onRefresh={loadFromDB} showToast={showToast} onClose={()=>setAdminMode(false)}/>;
  }

  return (
    <div style={{ minHeight:"100vh",background:"#060b14",fontFamily:"'Segoe UI',system-ui,sans-serif",color:"#f1f5f9" }}>
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

      {showLogin&&<AdminLogin onLogin={user=>{setAdminUser(user);setShowLogin(false);setAdminMode(true);}} onClose={()=>setShowLogin(false)}/>}

      {toast&&<div style={{ position:"fixed",top:14,right:14,zIndex:999,background:`${toastColors[toast.type]}18`,border:`1px solid ${toastColors[toast.type]}44`,borderRadius:11,padding:"10px 16px",color:toast.type==="success"?"#4ade80":toast.type==="error"?"#f87171":"#a5b4fc",fontWeight:600,fontSize:13,animation:"slideDown 0.3s ease",boxShadow:"0 8px 24px rgba(0,0,0,0.4)",backdropFilter:"blur(12px)" }}>{toast.msg}</div>}

      {/* HEADER */}
      <div style={{ background:"linear-gradient(180deg,rgba(99,102,241,0.1) 0%,transparent 100%)",borderBottom:"1px solid rgba(255,255,255,0.06)",padding:"13px 18px",position:"sticky",top:0,zIndex:100,backdropFilter:"blur(24px)" }}>
        <div style={{ maxWidth:900,margin:"0 auto" }}>
          <div style={{ display:"flex",alignItems:"center",gap:11,marginBottom:11 }}>
            <div style={{ background:"linear-gradient(135deg,#6366f1,#8b5cf6)",borderRadius:11,width:38,height:38,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,boxShadow:"0 4px 14px rgba(99,102,241,0.4)",flexShrink:0 }}>🍺</div>
            <div>
              <div style={{ fontSize:18,fontWeight:800,letterSpacing:"-0.02em" }}>utBergen</div>
              <div style={{ color:"#334155",fontSize:10,letterSpacing:"0.05em" }}>BERGEN · GOOGLE PLACES · CLAUDE AI · SUPABASE</div>
            </div>
            <div style={{ marginLeft:"auto",display:"flex",alignItems:"center",gap:6 }}>
              {loading&&<span style={{ color:"#64748b",fontSize:10,animation:"spin 1s linear infinite",display:"inline-block" }}>⟳</span>}
              <span style={{ width:6,height:6,borderRadius:"50%",background:isLive?"#22c55e":"#f59e0b",display:"inline-block",boxShadow:isLive?"0 0 6px #22c55e":"0 0 6px #f59e0b" }}/>
              <span style={{ color:isLive?"#4ade80":"#fbbf24",fontSize:10,fontWeight:600 }}>{isLive?"Live data":"Fallback data"}</span>
            </div>
          </div>
          <div style={{ display:"flex",gap:3 }}>
            {[
              {id:"app",icon:"🍺",label:"Appen",sub:`${venues.length} utesteder`},
              {id:"pipeline",icon:"⚙️",label:"Pipeline",sub:"Oppdater data"},
              {id:"admin",icon:"🔔",label:"Admin",sub:pending>0?`${pending} venter`:"Ingen nye",badge:pending},
            ].map(t=>(
              <button key={t.id} onClick={()=>setTab(t.id)} style={{ background:tab===t.id?"rgba(99,102,241,0.12)":"transparent",border:"none",borderBottom:tab===t.id?"2px solid #6366f1":"2px solid transparent",color:tab===t.id?"#a5b4fc":"#64748b",padding:"7px 13px",cursor:"pointer",borderRadius:"6px 6px 0 0",textAlign:"left",position:"relative",transition:"all 0.2s" }}>
                <div style={{ fontSize:12,fontWeight:700 }}>{t.icon} {t.label}</div>
                <div style={{ fontSize:9,color:tab===t.id?"#6366f1":"#334155" }}>{t.sub}</div>
                {t.badge>0&&<div style={{ position:"absolute",top:-3,right:-3,width:15,height:15,borderRadius:"50%",background:"#f59e0b",color:"#000",fontSize:9,fontWeight:800,display:"flex",alignItems:"center",justifyContent:"center" }}>{t.badge}</div>}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div style={{ maxWidth:900,margin:"0 auto",padding:18 }}>
        {tab==="app"&&<UserApp venues={venues} events={events} onRequestChange={handleRequestChange} knownSubmitters={knownSubmitters} loading={loading}/>}
        {tab==="pipeline"&&<Pipeline onComplete={handlePipelineComplete}/>}
        {tab==="admin"&&<AdminQueue requests={requests} onAction={handleAction}/>}
      </div>

      {/* Footer – klikk 5 ganger for admin */}
      <div style={{ textAlign:"center",padding:"16px 0 28px" }}>
        <span onClick={handleVersionClick} style={{ color:"#1e293b",fontSize:10,cursor:"default",userSelect:"none" }}>
          utBergen v5.1 · Google Places · Claude AI · Supabase · Bergen 2026
          {adminClickCount>0&&adminClickCount<5&&<span style={{ color:"#334155" }}> {'·'.repeat(adminClickCount)}</span>}
        </span>
      </div>
    </div>
  );
}
