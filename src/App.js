/* eslint-disable */
import { useState, useMemo, useRef, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";

// ═══════════════════════════════════════════════════════════════════════════════
// SUPABASE + API CONFIG
// ═══════════════════════════════════════════════════════════════════════════════

const supabase = createClient(
  process.env.REACT_APP_SUPABASE_URL,
  process.env.REACT_APP_SUPABASE_KEY
)

const GOOGLE_KEY = process.env.REACT_APP_GOOGLE_KEY;
const CLAUDE_KEY = process.env.REACT_APP_CLAUDE_KEY;

// ═══════════════════════════════════════════════════════════════════════════════
// SUPABASE HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

async function dbFetchVenues() {
  const { data, error } = await supabase.from("venues").select("*").order("rating", { ascending: false });
  if (error) { console.error("fetchVenues:", error); return []; }
  return (data || []).map(v => ({
    ...v,
    ratingCount: v.rating_count,
    categories: v.categories || [],
    hours: v.hours || {},
  }));
}

async function dbFetchEvents() {
  const { data, error } = await supabase.from("events").select("*");
  if (error) { console.error("fetchEvents:", error); return {}; }
  const grouped = {};
  (data || []).forEach(ev => {
    const key = ev.venue_id;
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push({ ...ev, id: ev.id });
  });
  return grouped;
}

async function dbFetchRequests() {
  const { data, error } = await supabase.from("change_requests").select("*").order("created_at", { ascending: false });
  if (error) { console.error("fetchRequests:", error); return []; }
  return (data || []).map(r => ({
    ...r,
    venueId: r.venue_id,
    venueName: r.venue_name,
    submitterName: r.submitter_name,
    submitterEmail: r.submitter_email,
    changeType: r.change_type,
    trustScore: r.trust_score,
    approvedBefore: r.approved_before,
    isKnown: r.is_known || false,
    createdAt: r.created_at,
  }));
}

async function dbInsertRequest(req) {
  const { error } = await supabase.from("change_requests").insert([{
    id: req.id,
    venue_id: req.venueId,
    venue_name: req.venueName,
    submitter_name: req.submitterName,
    submitter_email: req.submitterEmail,
    role: req.role,
    change_type: req.changeType,
    content: req.content,
    status: req.status,
    trust_score: req.trustScore,
    approved_before: req.approvedBefore,
    is_known: req.isKnown,
  }]);
  if (error) console.error("insertRequest:", error);
}

async function dbUpdateRequestStatus(id, status) {
  const { error } = await supabase.from("change_requests").update({ status }).eq("id", id);
  if (error) console.error("updateRequest:", error);
}

async function dbUpsertVenues(venues) {
  const rows = venues.map(v => ({
    place_id: v.place_id,
    name: v.name,
    address: v.address,
    lat: v.lat,
    lng: v.lng,
    rating: v.rating,
    rating_count: v.ratingCount || v.rating_count || 0,
    website: v.website || null,
    phone: v.phone || null,
    email: v.email || null,
    instagram: v.instagram || null,
    facebook: v.facebook || null,
    categories: v.categories || [],
    description: v.description || "",
    hours: v.hours || {},
    photo_references: v.photo_references || null,
    cover_image: v.cover_image || null,
    logo_url: v.logo_url || null,
  }));
  const { error } = await supabase.from("venues").upsert(rows, { onConflict: "place_id" });
  if (error) console.error("upsertVenues:", error);
}

async function dbUpsertEvents(events) {
  if (!events.length) return;
  const { error } = await supabase.from("events").upsert(events, { onConflict: "id" });
  if (error) console.error("upsertEvents:", error);
}

// ═══════════════════════════════════════════════════════════════════════════════
// GOOGLE PLACES API
// ═══════════════════════════════════════════════════════════════════════════════

const GEO_QUERIES = [
  "bar Bergen Norway",
  "pub Bergen Norway",
  "nattklubb Bergen",
  "sportsbar Bergen",
  "cocktailbar Bergen",
  "live musikk bar Bergen",
  "irish pub Bergen",
  "studentbar Bergen",
  "ølbar Bergen",
  "utested Bergen sentrum",
  "nightclub Bergen",
  "sports bar Bergen",
  "minigolf Bergen",
  "shuffleboard bar Bergen",
  "biljard bar Bergen",
  "dart bar Bergen",
  "biljardklubb Bergen",
  "spillbar Bergen",
];

function mapGoogleTypes(types = []) {
  const map = { bar:"cocktail", night_club:"nightclub", pub:"pub", sports_bar:"sport", bowling_alley:"bowling", live_music_venue:"live_music" };
  const cats = new Set();
  types.forEach(t => { if (map[t]) cats.add(map[t]); });
  if (types.includes("sports_bar") || types.includes("stadium")) cats.add("football");
  if (cats.size === 0) cats.add("bar");
  return Array.from(cats);
}

async function googleTextSearch(query) {
  try {
    const res = await fetch(`https://utbergen-server-production.up.railway.app/places/search?query=${encodeURIComponent(query)}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return data.results || [];
  } catch (err) {
    console.error("googleTextSearch error:", err);
    return [];
  }
}

async function googlePlaceDetails(placeId) {
  try {
    const res = await fetch(`https://utbergen-server-production.up.railway.app/places/details?place_id=${placeId}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return data.result || null;
  } catch (err) {
    console.error("googlePlaceDetails error:", err);
    return null;
  }
}

function parseHours(openingHours) {
  if (!openingHours?.weekday_text) return {};
  const days = ["Man", "Tir", "Ons", "Tor", "Fre", "Lør", "Søn"];
  const result = {};
  openingHours.weekday_text.forEach((text, i) => {
    const parts = text.split(": ");
    result[days[i]] = parts[1] || "Stengt";
  });
  return result;
}

// ═══════════════════════════════════════════════════════════════════════════════
// CLAUDE AI EVENT SCRAPING
// ═══════════════════════════════════════════════════════════════════════════════

async function fetchWebsiteContent(venue) {
  if (!venue.website) return null;
  try {
    const res = await fetch(
      `https://utbergen-server-production.up.railway.app/crawl-venue?url=${encodeURIComponent(venue.website)}`
    );
    if (!res.ok) return null;
    const data = await res.json();
    if (data.links?.length > 0) {
      console.log(`${venue.name}: crawlet ${data.links.length} undersider`);
    }
    return data.text || null;
  } catch {
    return null;
  }
}

async function claudeScrapeEvents(venue, content) {
  try {
    const res = await fetch('https://utbergen-server-production.up.railway.app/claude/scrape-events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ venue, content })
    });
    const data = await res.json();
    let events = data.events || [];
    
    // Generer unike IDer basert på innhold
    events = events.map((e) => ({
      ...e,
      id: `${venue.place_id}_${(e.title||'').toLowerCase().replace(/\s+/g,'_').slice(0,30)}_${(e.date||'').replace(/\s+/g,'')}`,
      venue_id: venue.place_id,
      league: e.league || null,
    }));
    
    return events;
  } catch {
    return [];
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// STATIC FALLBACK DATA (vises mens Supabase er tom)
// ═══════════════════════════════════════════════════════════════════════════════

const FALLBACK_VENUES = [
  { place_id:"p001", name:"Felix", address:"Torget 3", lat:60.3947, lng:5.3259, rating:4.0, ratingCount:980, website:"https://www.felixbergen.no", phone:"+47 41 07 20 00", email:"post@felixbergen.no", instagram:"@felixbergen", facebook:"felixbergen", categories:["live_music","football","nightclub"], description:"Felix er Bergens beste bar for live musikk. Åpent hver dag med ulike musikere. Vi viser også fotballkamper på mange skjermer.", hours:{Man:"12:00–03:00",Tir:"12:00–03:00",Ons:"12:00–03:00",Tor:"12:00–03:00",Fre:"12:00–03:00",Lør:"12:00–03:00",Søn:"12:00–03:00"} },
  { place_id:"p002", name:"No Stress Bergen", address:"Hollendergaten 11", lat:60.3949, lng:5.3266, rating:4.6, ratingCount:1412, website:null, phone:null, instagram:"@nostressbergen", categories:["cocktail","games"], description:"Koselig cocktailbar med Nintendo 64 og brettspill.", hours:{Man:"17:00–01:30",Fre:"15:00–03:00",Lør:"15:00–03:00"} },
  { place_id:"p003", name:"LAST monkey", address:"Bankgaten 6", lat:60.3941, lng:5.3274, rating:4.7, ratingCount:458, phone:"+47 93 83 79 89", instagram:"@lastmonkeybergen", categories:["cocktail"], description:"Kreative cocktails i hyggelige omgivelser.", hours:{Fre:"19:00–02:30",Lør:"19:00–02:30"} },
  { place_id:"p013", name:"Fotballpuben", address:"Vaskerelven 1", lat:60.3916, lng:5.3205, rating:3.8, ratingCount:1074, website:"https://www.fotballpuben.no", phone:"+47 55 33 66 66", instagram:"@fotballpuben", facebook:"fotballpuben", categories:["football","quiz"], description:"Bergens beste bar for fotballfans.", hours:{Man:"10:00–03:00",Søn:"12:00–03:00"} },
  { place_id:"p014", name:"Scruffy Murphys", address:"Torget 15", lat:60.3953, lng:5.3263, rating:4.1, ratingCount:972, phone:"+47 55 30 09 20", categories:["football","irish_pub"], description:"Klassisk irsk pub ved Torget.", hours:{Man:"13:00–00:00",Fre:"13:00–03:00"} },
  { place_id:"p015", name:"Finnegans", address:"Chr. Michelsens Gate 10", lat:60.3927, lng:5.3207, rating:4.2, ratingCount:271, phone:"+47 55 55 31 39", categories:["pub","quiz"], description:"Populær pub kjent for pub quiz.", hours:{Man:"15:00–00:30",Fre:"15:00–03:00"} },
  { place_id:"p020", name:"Vaskeriet", address:"Magnus Barfots gate 4", lat:60.3915, lng:5.3199, rating:4.1, ratingCount:468, categories:["nightclub"], description:"Nattklubb med silent disco.", hours:{Tor:"22:00–03:00",Fre:"22:00–03:00",Lør:"22:00–03:00"} },
  { place_id:"p022", name:"Hulen", address:"Olaf Ryes vei 48", lat:60.3820, lng:5.3310, rating:4.4, ratingCount:892, website:"https://www.hulen.no", phone:"+47 55 32 87 78", instagram:"@hulenbergen", categories:["live_music","nightclub"], description:"Legendarisk konsertscene i Bergen.", hours:{Fre:"21:00–03:00",Lør:"21:00–03:00"} },
  { place_id:"p024", name:"Garage", address:"Chr. Michelsens gate 2", lat:60.3925, lng:5.3215, rating:4.1, ratingCount:743, website:"https://www.garage.no", phone:"+47 55 32 19 80", instagram:"@garagebergen", categories:["live_music","nightclub"], description:"Rock og metal-bar med live konserter.", hours:{Tor:"20:00–01:00",Fre:"20:00–03:00"} },
  { place_id:"p029", name:"Game Sportsbar", address:"Torget", lat:60.3953, lng:5.3249, rating:4.1, ratingCount:103, phone:"+47 55 55 31 30", categories:["sport","pool","football"], description:"Sportsbar med biljard og mange skjermer.", hours:{Man:"16:00–02:30",Lør:"12:00–02:30"} },
];

const FALLBACK_EVENTS = {
  p001:[{id:"e1",venue_id:"p001",title:"Øystein Eckhoff – Live",date:"9. apr",time:"23:00",type:"live_music"},{id:"e2",venue_id:"p001",title:"Bologna vs Aston Villa",date:"9. apr",time:"21:00",type:"football",league:"EUROPA LEAGUE"},{id:"e3",venue_id:"p001",title:"Arsenal vs Bournemouth",date:"11. apr",time:"13:30",type:"football",league:"PREMIER LEAGUE"}],
  p013:[{id:"e7",venue_id:"p013",title:"Fredagsquiz",date:"11. apr",time:"20:00",type:"quiz"},{id:"e8",venue_id:"p013",title:"Europa League",date:"9. apr",time:"20:00",type:"football",league:"EUROPA LEAGUE"}],
  p015:[{id:"e12",venue_id:"p015",title:"Pub Quiz – Torsdag",date:"9. apr",time:"20:00",type:"quiz"}],
  p020:[{id:"e19",venue_id:"p020",title:"Silent Disco",date:"11. apr",time:"23:00",type:"nightclub"}],
  p022:[{id:"e23",venue_id:"p022",title:"Konsert: The Cords",date:"10. apr",time:"21:00",type:"live_music"}],
  p024:[{id:"e24",venue_id:"p024",title:"Rock Night",date:"12. apr",time:"22:00",type:"live_music"}],
};

const KNOWN_SUBMITTERS = {
  "claus@felixbergen.no":{name:"Claus Pedersen",role:"owner",venue:"Felix",approved:4,rejected:0},
  "post@fotballpuben.no":{name:"Lars Eriksen",role:"manager",venue:"Fotballpuben",approved:2,rejected:1},
};

// Social media (static for now)
const SOCIAL = {
  p001:{
    instagram:[
      {id:"ig1",caption:"⚽ I kveld: Champions League på alle skjermer! Book bord nå 🍺 #felix #bergen",time:"2 timer siden",likes:142,type:"football"},
      {id:"ig2",caption:"🎸 TOTTO er tilbake på Felix fredag! Gratis inngang 🎶 #livemusikk #felixbergen",time:"1 dag siden",likes:287,type:"live_music"},
      {id:"ig3",caption:"☀️ Torgets beste bakgård er åpen! Sol og øl 🌞 #bergen #torget",time:"2 dager siden",likes:203,type:"terrace"},
    ],
    facebook:[
      {id:"fb1",content:"🎸 Ukens musikk-program:\nTors: Øystein Eckhoff | Fre: Totto | Lør: Totto\nGratis inngang. Live fra kl 23:00.",time:"I dag 10:30",likes:89,shares:23,type:"event"},
      {id:"fb2",content:"⚽ Ukens sendeskjema:\n→ Tor 9. apr: Europa League 21:00\n→ Lør 11. apr: PL 13:30 & 18:30\n→ Søn 12. apr: Brann 19:15",time:"I går 14:15",likes:134,shares:45,type:"football"},
    ],
    googlePhotos:[{label:"Interiør",color:"#1a2744",emoji:"🍺"},{label:"Storskjerm",color:"#1a3020",emoji:"⚽"},{label:"Live musikk",color:"#2a1a10",emoji:"🎸"},{label:"Bakgård",color:"#1a1a2e",emoji:"☀️"}],
    reviews:[{author:"James O.",rating:5,text:"Best place in Bergen for football! Electric atmosphere.",time:"1 uke siden"},{author:"Maria K.",rating:4,text:"Really cool music place. Dancing from 23:00 until closing!",time:"2 uker siden"}],
  },
  p013:{
    instagram:[
      {id:"ig1",caption:"⚽ Vi viser ALLE kampene! PL, CL, Eliteserien 📺 #fotballpuben #bergen",time:"1 dag siden",likes:201,type:"football"},
      {id:"ig2",caption:"🧠 FREDAGSQUIZ hver fredag kl 20:00 – gratis! Maks 6 på laget 🏆 #quiz",time:"3 dager siden",likes:143,type:"quiz"},
    ],
    facebook:[{id:"fb1",content:"⚽ Vi viser ALLE kampene denne helgen!\nLør: 13:30, 16:00, 18:30 | Søn: 15:00, 17:30\nKom tidlig for god plass! 🍺",time:"I dag 09:00",likes:112,shares:34,type:"football"}],
    googlePhotos:[{label:"TV-skjermer",color:"#0f2010",emoji:"📺"},{label:"Fotball-stemning",color:"#1a2010",emoji:"⚽"}],
    reviews:[{author:"Peter S.",rating:5,text:"Best bar in Bergen for football fans!",time:"2 uker siden"}],
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════════

const ROLES=[{value:"owner",label:"Eier",trust:5},{value:"manager",label:"Daglig leder",trust:4},{value:"staff",label:"Ansatt",trust:3},{value:"regular",label:"Fast gjest",trust:2},{value:"customer",label:"Gjest/Kunde",trust:1},{value:"other",label:"Annet",trust:1}];
const CHANGE_TYPES=[{value:"event_add",label:"Legg til event",emoji:"📅"},{value:"event_edit",label:"Endre event",emoji:"✏️"},{value:"hours",label:"Åpningstider",emoji:"🕐"},{value:"description",label:"Beskrivelse",emoji:"📝"},{value:"contact",label:"Kontaktinfo",emoji:"📞"},{value:"other",label:"Annet",emoji:"❓"}];
const FILTER_CATS=[{id:"all",label:"Alle",emoji:"🍺"},{id:"football",label:"Fotball",emoji:"⚽"},{id:"live_music",label:"Live musikk",emoji:"🎸"},{id:"quiz",label:"Quiz",emoji:"🧠"},{id:"cocktail",label:"Cocktail",emoji:"🍸"},{id:"sport",label:"Sport",emoji:"🏆"},{id:"nightclub",label:"Nattklubb",emoji:"🎉"},{id:"games",label:"Spill",emoji:"🎮"},{id:"craft_beer",label:"Håndverksøl",emoji:"🍺"},{id:"happy_hour",label:"Happy Hour",emoji:"🥂"}];
const EV={live_music:{color:"#f59e0b",emoji:"🎸"},football:{color:"#22c55e",emoji:"⚽"},quiz:{color:"#8b5cf6",emoji:"🧠"},games:{color:"#3b82f6",emoji:"🎮"},happy_hour:{color:"#ec4899",emoji:"🥂"},nightclub:{color:"#06b6d4",emoji:"🎉"},terrace:{color:"#f97316",emoji:"☀️"},general:{color:"#64748b",emoji:"📸"},event:{color:"#a855f7",emoji:"📅"}};

// ═══════════════════════════════════════════════════════════════════════════════
// SHARED UI
// ═══════════════════════════════════════════════════════════════════════════════
const inp={width:"100%",background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:9,padding:"9px 12px",color:"#f1f5f9",fontSize:"13px",outline:"none",fontFamily:"inherit",boxSizing:"border-box"};
const lbl={color:"#64748b",fontSize:"11px",fontWeight:600,display:"block",marginBottom:4};
const card={background:"rgba(255,255,255,0.025)",border:"1px solid rgba(255,255,255,0.07)",borderRadius:12,padding:"13px 14px"};

const Stars=({r})=><span style={{color:"#f59e0b",fontSize:"11px"}}>{"★".repeat(Math.round(r||0))}{"☆".repeat(5-Math.round(r||0))}<span style={{color:"#475569",marginLeft:3}}>{(r||0).toFixed(1)}</span></span>;
const Tag=({label,color="rgba(99,102,241,0.15)",text="#a5b4fc",small})=><span style={{background:color,color:text,borderRadius:999,padding:small?"1px 6px":"3px 9px",fontSize:small?"9px":"11px",fontWeight:700}}>{label}</span>;
const TrustBadge=({score,approved,isKnown})=>{
  if(score>=4&&approved>=2) return <Tag small label={`⭐ Betrodd · ${approved} godkjent`} color="rgba(34,197,94,0.15)" text="#4ade80"/>;
  if(score>=3&&isKnown) return <Tag small label={`✓ Kjent · ${approved} godkjent`} color="rgba(59,130,246,0.15)" text="#60a5fa"/>;
  if(!isKnown||approved===0) return <Tag small label="⚠️ Ny avsender" color="rgba(245,158,11,0.15)" text="#fbbf24"/>;
  return <Tag small label="Lav tillit" color="rgba(100,116,139,0.15)" text="#94a3b8"/>;
};
const ProgressBar=({pct,color="#6366f1"})=><div style={{background:"rgba(255,255,255,0.06)",borderRadius:999,height:3}}><div style={{width:`${pct}%`,height:"100%",borderRadius:999,background:`linear-gradient(90deg,${color},${color}88)`,transition:"width 0.3s ease",boxShadow:`0 0 6px ${color}55`}}/></div>;
const SecTitle=({children})=><div style={{color:"#475569",fontSize:"10px",fontWeight:700,letterSpacing:"0.12em",textTransform:"uppercase",marginBottom:8,paddingBottom:5,borderBottom:"1px solid rgba(255,255,255,0.05)"}}>{children}</div>;
const SrcBadge=({label,color,icon})=><span style={{display:"inline-flex",alignItems:"center",gap:4,background:`${color}18`,color,border:`1px solid ${color}33`,borderRadius:999,padding:"2px 8px",fontSize:"10px",fontWeight:700}}>{icon} {label}</span>;

// ═══════════════════════════════════════════════════════════════════════════════
// MAP
// ═══════════════════════════════════════════════════════════════════════════════

function MapView({venues,events,selected,onSelect}){
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef([]);

  useEffect(()=>{
    if(!mapRef.current || !window.google) return;
    
    mapInstanceRef.current = new window.google.maps.Map(mapRef.current, {
      center: { lat: 60.3928, lng: 5.3244 },
      zoom: 14,
      styles: [
        { elementType:"geometry", stylers:[{color:"#0f1a2e"}] },
        { elementType:"labels.text.fill", stylers:[{color:"#8ec3b9"}] },
        { elementType:"labels.text.stroke", stylers:[{color:"#1a3646"}] },
        { featureType:"water", elementType:"geometry", stylers:[{color:"#0e1626"}] },
        { featureType:"road", elementType:"geometry", stylers:[{color:"#1a2a3a"}] },
        { featureType:"road", elementType:"geometry.stroke", stylers:[{color:"#255763"}] },
        { featureType:"poi", stylers:[{visibility:"off"}] },
        { featureType:"transit", stylers:[{visibility:"off"}] },
        { featureType:"landscape", elementType:"geometry", stylers:[{color:"#0f1a2e"}] },
        { featureType:"administrative", elementType:"geometry.stroke", stylers:[{color:"#334155"}] },
      ],
      disableDefaultUI: false,
      zoomControl: true,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: true,
    });
  },[]);

  useEffect(()=>{
    if(!mapInstanceRef.current || !window.google) return;
    
    // Fjern gamle markører
    markersRef.current.forEach(m => m.setMap(null));
    markersRef.current = [];

    venues.forEach(v => {
      if(!v.lat || !v.lng) return;
      const hasEv = (events[v.place_id]||[]).length > 0;
      const isSelected = selected?.place_id === v.place_id;

      const marker = new window.google.maps.Marker({
        position: { lat: v.lat, lng: v.lng },
        map: mapInstanceRef.current,
        title: v.name,
        icon: {
          path: window.google.maps.SymbolPath.CIRCLE,
          scale: isSelected ? 12 : 8,
          fillColor: isSelected ? '#6366f1' : hasEv ? '#22c55e' : '#334155',
          fillOpacity: 1,
          strokeColor: isSelected ? '#a5b4fc' : hasEv ? '#4ade80' : '#6366f1',
          strokeWeight: 2,
        },
        zIndex: isSelected ? 10 : 1,
      });

      marker.addListener('click', () => onSelect(v));
      markersRef.current.push(marker);
    });
  },[venues, events, selected]);

  // Sentrér kart på valgt markør
  useEffect(()=>{
    if(!mapInstanceRef.current || !selected) return;
    mapInstanceRef.current.panTo({ lat: selected.lat, lng: selected.lng });
  },[selected]);

  return(
    <div style={{position:"relative"}}>
      <div ref={mapRef} style={{
        width:"100%", height:320, borderRadius:14,
        border:"1px solid rgba(99,102,241,0.3)",
        overflow:"hidden",
      }}/>
      {!window.google && (
        <div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",background:"rgba(6,11,20,0.9)",borderRadius:14}}>
          <div style={{color:"#64748b",fontSize:"13px"}}>Laster kart...</div>
        </div>
      )}
      <div style={{position:"absolute",bottom:12,left:12,display:"flex",gap:8,pointerEvents:"none"}}>
        <div style={{display:"flex",alignItems:"center",gap:4,background:"rgba(6,11,20,0.8)",padding:"4px 8px",borderRadius:999}}>
          <div style={{width:8,height:8,borderRadius:"50%",background:"#22c55e"}}/><span style={{color:"#94a3b8",fontSize:"10px"}}>Har eventer</span>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:4,background:"rgba(6,11,20,0.8)",padding:"4px 8px",borderRadius:999}}>
          <div style={{width:8,height:8,borderRadius:"50%",background:"#334155",border:"1px solid #6366f1"}}/><span style={{color:"#94a3b8",fontSize:"10px"}}>Ingen eventer</span>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// VENUE DETAIL
// ═══════════════════════════════════════════════════════════════════════════════
function VenueDetail({venue,events,onBack,onRequestChange,knownSubmitters}){
  const [section,setSection]=useState("overview");
  const [igLoading,setIgLoading]=useState(true);
  const [fbLoading,setFbLoading]=useState(true);
  const [hlMode,setHlMode]=useState(false);
  const [hl,setHl]=useState(null);
  const [showForm,setShowForm]=useState(false);
  const [form,setForm]=useState({name:"",email:"",role:"",changeType:"",content:""});
  const [submitted,setSubmitted]=useState(false);
  const [lookup,setLookup]=useState(null);
  const [photoIdx,setPhotoIdx]=useState(0);
  const vEvents=events[venue.place_id]||[];
  const social=SOCIAL[venue.place_id]||{instagram:[],facebook:[],googlePhotos:[{label:"Exteriør",color:"#0f1a35",emoji:"🏠"}],reviews:[]};

  useEffect(()=>{
    setIgLoading(true);setFbLoading(true);
    const t1=setTimeout(()=>setIgLoading(false),1800);
    const t2=setTimeout(()=>setFbLoading(false),1200);
    return()=>{clearTimeout(t1);clearTimeout(t2);};
  },[venue.place_id]);

  const handleEmailBlur=()=>{const k=knownSubmitters[form.email];setLookup(k||null);if(k)setForm(p=>({...p,name:k.name,role:k.role}));};
  const handleHl=(field,value)=>{setHl({field,value});setForm(p=>({...p,changeType:field==="event"?"event_edit":field==="hours"?"hours":"description",content:`Feil i: "${value}" – `}));setShowForm(true);setHlMode(false);};
  const handleSubmit=()=>{
    if(!form.name||!form.email||!form.role||!form.changeType||!form.content) return;
    const k=knownSubmitters[form.email];const r=ROLES.find(x=>x.value===form.role);
    const req={id:`r${Date.now()}`,venueId:venue.place_id,venueName:venue.name,submitterName:form.name,submitterEmail:form.email,role:form.role,changeType:form.changeType,content:form.content,status:"pending",createdAt:new Date().toISOString(),trustScore:r?.trust||1,approvedBefore:k?.approved||0,isKnown:!!k};
    onRequestChange(req);
    dbInsertRequest(req);
    setSubmitted(true);setShowForm(false);setForm({name:"",email:"",role:"",changeType:"",content:""});setHl(null);
    setTimeout(()=>setSubmitted(false),4000);
  };

  const SECTIONS=[{id:"overview",label:"Oversikt",emoji:"🏠"},{id:"photos",label:"Bilder",emoji:"📸"},{id:"events",label:"Eventer",emoji:"📅"},{id:"social",label:"Sosiale medier",emoji:"📱"},{id:"reviews",label:"Anmeldelser",emoji:"⭐"}];

  return(
    <div>
      <button onClick={onBack} style={{background:"none",border:"none",color:"#6366f1",cursor:"pointer",fontSize:"12px",fontWeight:600,marginBottom:12,padding:0}}>← Tilbake</button>
      <div style={{position:"relative",height:150,background:"linear-gradient(135deg,#0f1a35,#1a0f30,#0f2020)",borderRadius:14,overflow:"hidden",marginBottom:0}}>
        <div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",fontSize:"60px",opacity:0.06}}>{(venue.categories||[]).includes("football")?"⚽":(venue.categories||[]).includes("live_music")?"🎸":(venue.categories||[]).includes("cocktail")?"🍸":"🍺"}</div>
        <div style={{position:"absolute",top:10,right:10,display:"flex",gap:4}}>
          <SrcBadge label="Google" color="#4285F4" icon="🔍"/>
          {venue.instagram&&<SrcBadge label="Instagram" color="#ec4899" icon="📱"/>}
          {venue.facebook&&<SrcBadge label="Facebook" color="#1877F2" icon="📘"/>}
        </div>
        <div style={{position:"absolute",bottom:0,left:0,right:0,height:70,background:"linear-gradient(transparent,#060b14)"}}/>
        <div style={{position:"absolute",bottom:14,left:16}}>
          <div style={{fontSize:"22px",fontWeight:900,letterSpacing:"-0.02em"}}>{venue.name}</div>
          <div style={{color:"rgba(255,255,255,0.4)",fontSize:"11px"}}>📍 {venue.address}</div>
        </div>
      </div>
      <div style={{background:"rgba(255,255,255,0.03)",borderBottom:"1px solid rgba(255,255,255,0.06)",padding:"8px 14px",display:"flex",gap:12,alignItems:"center",overflowX:"auto",scrollbarWidth:"none"}}>
        <Stars r={venue.rating}/><span style={{color:"#475569",fontSize:"11px"}}>{"kr".repeat(2)}</span>
        {(venue.categories||[]).map(c=><Tag key={c} small label={c.replace("_"," ")}/>)}
        <div style={{marginLeft:"auto",display:"flex",gap:5,flexShrink:0}}>
          {venue.website&&<a href={venue.website} target="_blank" rel="noopener noreferrer" style={{display:"inline-flex",alignItems:"center",gap:3,background:"rgba(34,197,94,0.1)",color:"#4ade80",border:"1px solid rgba(34,197,94,0.2)",borderRadius:999,padding:"3px 9px",fontSize:"10px",fontWeight:700,textDecoration:"none"}}>🌐 ↗</a>}
          {venue.instagram&&<a href={`https://instagram.com/${venue.instagram.replace("@","")}`} target="_blank" rel="noopener noreferrer" style={{display:"inline-flex",alignItems:"center",gap:3,background:"rgba(236,72,153,0.1)",color:"#f472b6",border:"1px solid rgba(236,72,153,0.2)",borderRadius:999,padding:"3px 9px",fontSize:"10px",fontWeight:700,textDecoration:"none"}}>📱 ↗</a>}
        </div>
      </div>
      <div style={{borderBottom:"1px solid rgba(255,255,255,0.05)",display:"flex",gap:2,overflowX:"auto",scrollbarWidth:"none",marginBottom:14}}>
        {SECTIONS.map(s=><button key={s.id} onClick={()=>setSection(s.id)} style={{background:section===s.id?"rgba(99,102,241,0.1)":"transparent",border:"none",borderBottom:section===s.id?"2px solid #6366f1":"2px solid transparent",color:section===s.id?"#a5b4fc":"#64748b",padding:"9px 12px",cursor:"pointer",fontSize:"11px",fontWeight:600,whiteSpace:"nowrap",borderRadius:"5px 5px 0 0"}}>{s.emoji} {s.label}</button>)}
      </div>

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

      {section==="photos"&&<div style={{animation:"fadeUp 0.3s ease"}}>
  <div style={{display:"flex",justifyContent:"flex-end",marginBottom:8}}>
    <SrcBadge label="Google Places" color="#4285F4" icon="🔍"/>
  </div>
  {venue.photo_references?.length>0?(
    <>
      <div style={{height:220,borderRadius:14,overflow:"hidden",marginBottom:8,position:"relative",border:"1px solid rgba(255,255,255,0.08)"}}>
        <img
          src={`https://utbergen-server-production.up.railway.app/places/photo?photo_reference=${venue.photo_references[photoIdx]}&maxwidth=800`}
          alt={venue.name}
          style={{width:"100%",height:"100%",objectFit:"cover"}}
          onError={e=>{e.target.style.display="none";}}
        />
        <div style={{position:"absolute",bottom:10,left:12,color:"rgba(255,255,255,0.5)",fontSize:"10px",background:"rgba(0,0,0,0.5)",padding:"2px 8px",borderRadius:999}}>
          {photoIdx+1} / {venue.photo_references.length} · Google Places
        </div>
        {venue.photo_references.length>1&&<>
          <button onClick={()=>setPhotoIdx((photoIdx-1+venue.photo_references.length)%venue.photo_references.length)} style={{position:"absolute",left:10,top:"50%",transform:"translateY(-50%)",background:"rgba(0,0,0,0.5)",border:"1px solid rgba(255,255,255,0.2)",borderRadius:"50%",width:32,height:32,color:"#fff",cursor:"pointer",fontSize:"16px",display:"flex",alignItems:"center",justifyContent:"center"}}>‹</button>
          <button onClick={()=>setPhotoIdx((photoIdx+1)%venue.photo_references.length)} style={{position:"absolute",right:10,top:"50%",transform:"translateY(-50%)",background:"rgba(0,0,0,0.5)",border:"1px solid rgba(255,255,255,0.2)",borderRadius:"50%",width:32,height:32,color:"#fff",cursor:"pointer",fontSize:"16px",display:"flex",alignItems:"center",justifyContent:"center"}}>›</button>
        </>}
      </div>
      <div style={{display:"flex",gap:6,overflowX:"auto",scrollbarWidth:"none"}}>
        {venue.photo_references.map((ref,i)=>(
          <img
            key={i}
            src={`https://utbergen-server-production.up.railway.app/places/photo?photo_reference=${ref}&maxwidth=200`}
            alt={`${venue.name} ${i+1}`}
            onClick={()=>setPhotoIdx(i)}
            style={{width:52,height:40,borderRadius:8,objectFit:"cover",cursor:"pointer",border:`2px solid ${i===photoIdx?"#6366f1":"rgba(255,255,255,0.08)"}`,opacity:i===photoIdx?1:0.6,flexShrink:0}}
            onError={e=>{e.target.style.display="none";}}
          />
        ))}
      </div>
    </>
  ):<div style={{...card,textAlign:"center",color:"#334155",padding:"40px"}}>
    Ingen bilder ennå – kjør pipeline for å hente
  </div>}
</div>}

      {section==="events"&&<div style={{animation:"fadeUp 0.3s ease"}}>
        <div style={{display:"flex",justifyContent:"flex-end",marginBottom:8}}><SrcBadge label="AI-agent" color="#22c55e" icon="🤖"/></div>
        {vEvents.length===0?<div style={{...card,textAlign:"center",color:"#334155",padding:"40px"}}>Ingen registrerte eventer for {venue.name}</div>:
        <div style={{display:"flex",flexDirection:"column",gap:6}}>
          {vEvents.map((ev,i)=>{const cfg=EV[ev.type]||{color:"#64748b",emoji:"📅"};return(
            <div key={ev.id} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 12px",background:"rgba(255,255,255,0.02)",borderLeft:`3px solid ${cfg.color}`,borderRadius:"0 10px 10px 0"}}>
              <span style={{fontSize:"16px"}}>{cfg.emoji}</span>
              <div style={{flex:1}}><div style={{color:"#f1f5f9",fontWeight:600,fontSize:"13px"}}>{ev.title}</div>{ev.league&&<span style={{color:cfg.color,fontSize:"10px",fontWeight:700}}>{ev.league}</span>}</div>
              <div style={{textAlign:"right"}}><div style={{color:cfg.color,fontWeight:700,fontSize:"12px"}}>{ev.time}</div><div style={{color:"#475569",fontSize:"10px"}}>{ev.date}</div></div>
            </div>
          );})}
        </div>}
      </div>}

      {section==="social"&&<div style={{animation:"fadeUp 0.3s ease"}}>
        <div style={{marginBottom:16}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:8}}>
            <SecTitle>📱 Instagram</SecTitle>
            <div style={{display:"flex",gap:4,marginBottom:4}}>
              <SrcBadge label="AI-hentet" color="#8b5cf6" icon="🤖"/>
              {venue.instagram&&<a href={`https://instagram.com/${venue.instagram.replace("@","")}`} target="_blank" rel="noopener noreferrer" style={{display:"inline-flex",alignItems:"center",gap:3,background:"rgba(236,72,153,0.1)",color:"#f472b6",border:"1px solid rgba(236,72,153,0.2)",borderRadius:999,padding:"2px 8px",fontSize:"10px",fontWeight:700,textDecoration:"none"}}>{venue.instagram} ↗</a>}
            </div>
          </div>
          {igLoading?<div style={{...card,textAlign:"center",padding:"20px"}}><div style={{fontSize:"18px",animation:"spin 1.5s linear infinite",display:"inline-block",marginBottom:4}}>⟳</div><div style={{color:"#64748b",fontSize:"11px"}}>Henter Instagram...</div></div>:
          social.instagram.length===0?<div style={{...card,textAlign:"center",color:"#334155",padding:"24px"}}>{venue.instagram?"Ingen innlegg funnet":"Ingen Instagram registrert"}</div>:
          <div style={{display:"flex",flexDirection:"column",gap:6}}>
            {social.instagram.map(p=>{const cfg=EV[p.type]||EV.general;return(
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
            <div style={{display:"flex",gap:4,marginBottom:4}}>
              <SrcBadge label="Graph API" color="#1877F2" icon="📘"/>
              {venue.facebook&&<a href={`https://facebook.com/${venue.facebook}`} target="_blank" rel="noopener noreferrer" style={{display:"inline-flex",alignItems:"center",gap:3,background:"rgba(24,119,242,0.1)",color:"#60a5fa",border:"1px solid rgba(24,119,242,0.2)",borderRadius:999,padding:"2px 8px",fontSize:"10px",fontWeight:700,textDecoration:"none"}}>Åpne ↗</a>}
            </div>
          </div>
          {fbLoading?<div style={{...card,textAlign:"center",padding:"20px"}}><div style={{fontSize:"18px",animation:"spin 1.5s linear infinite",display:"inline-block",marginBottom:4}}>⟳</div><div style={{color:"#64748b",fontSize:"11px"}}>Henter Facebook...</div></div>:
          social.facebook.length===0?<div style={{...card,textAlign:"center",color:"#334155",padding:"24px"}}>{venue.facebook?"Ingen innlegg funnet":"Ingen Facebook registrert"}</div>:
          <div style={{display:"flex",flexDirection:"column",gap:6}}>
            {social.facebook.map(p=>{const cfg=EV[p.type]||EV.general;return(
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

// ═══════════════════════════════════════════════════════════════════════════════
// USER APP
// ═══════════════════════════════════════════════════════════════════════════════
function UserApp({venues,events,onRequestChange,knownSubmitters,loading}){
  const [cat,setCat]=useState("all");
  const [search,setSearch]=useState("");
  const [subTab,setSubTab]=useState("list");
  const [mapSelected,setMapSelected]=useState(null);
  const [detailVenue,setDetailVenue]=useState(null);

  const filtered=useMemo(()=>venues.filter(v=>{
    const matchCat=cat==="all"||(v.categories||[]).includes(cat)||(["live_music","football","quiz","games","happy_hour"].includes(cat)&&(events[v.place_id]||[]).some(e=>e.type===cat));
    const matchSearch=!search||v.name.toLowerCase().includes(search.toLowerCase())||v.address.toLowerCase().includes(search.toLowerCase());
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
          return(
            <div key={v.place_id} onClick={()=>setDetailVenue(v)} style={{...card,cursor:"pointer",animation:`fadeUp 0.3s ease ${i*20}ms both`,transition:"all 0.2s"}}>
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

// ═══════════════════════════════════════════════════════════════════════════════
// ADMIN QUEUE
// ═══════════════════════════════════════════════════════════════════════════════
function AdminQueue({requests,onAction}){
  const [filter,setFilter]=useState("pending");
  const [expanded,setExpanded]=useState(null);
  const sorted=useMemo(()=>[...requests].filter(r=>filter==="all"||r.status===filter).sort((a,b)=>{if(a.status==="pending"&&b.status!=="pending")return -1;if(b.status==="pending"&&a.status!=="pending")return 1;return(b.trustScore||0)-(a.trustScore||0);}),[requests,filter]);
  const pending=requests.filter(r=>r.status==="pending").length;
  const trusted=requests.filter(r=>r.status==="pending"&&(r.trustScore||0)>=4&&(r.approvedBefore||0)>=2).length;
  const ctLabel=val=>CHANGE_TYPES.find(c=>c.value===val)?.label||val;
  const ctEmoji=val=>CHANGE_TYPES.find(c=>c.value===val)?.emoji||"❓";
  const fmt=iso=>{try{return new Date(iso).toLocaleString("nb-NO",{day:"numeric",month:"short",hour:"2-digit",minute:"2-digit"});}catch{return iso;}};
  const statusColor={pending:"#f59e0b",approved:"#22c55e",rejected:"#ef4444"};
  const statusLabel={pending:"Venter",approved:"Godkjent",rejected:"Avvist"};
  return(
    <div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:8,marginBottom:14}}>
        {[{label:"Venter",val:pending,color:"#f59e0b",icon:"⏳"},{label:"Betrodde",val:trusted,color:"#22c55e",icon:"⭐"},{label:"Godkjent",val:requests.filter(r=>r.status==="approved").length,color:"#6366f1",icon:"✓"},{label:"Avvist",val:requests.filter(r=>r.status==="rejected").length,color:"#ef4444",icon:"✕"}].map(s=>(
          <div key={s.label} style={{background:"rgba(255,255,255,0.03)",border:`1px solid ${s.color}22`,borderRadius:10,padding:"10px 8px",textAlign:"center"}}>
            <div>{s.icon}</div><div style={{color:s.color,fontSize:"20px",fontWeight:800,lineHeight:1}}>{s.val}</div><div style={{color:"#475569",fontSize:"9px",marginTop:2}}>{s.label}</div>
          </div>
        ))}
      </div>
      {trusted>0&&<div style={{background:"rgba(34,197,94,0.07)",border:"1px solid rgba(34,197,94,0.2)",borderRadius:10,padding:"9px 13px",marginBottom:12,display:"flex",alignItems:"center",gap:9}}><span>🤖</span><div><div style={{color:"#4ade80",fontWeight:700,fontSize:"12px"}}>AI-anbefaling</div><div style={{color:"#64748b",fontSize:"11px"}}>{trusted} betrodde forespørsler – trygge å godkjenne raskt.</div></div></div>}
      <div style={{display:"flex",gap:3,marginBottom:12,borderBottom:"1px solid rgba(255,255,255,0.05)"}}>
        {[{id:"pending",label:`Venter (${pending})`},{id:"approved",label:"Godkjent"},{id:"rejected",label:"Avvist"},{id:"all",label:"Alle"}].map(f=><button key={f.id} onClick={()=>setFilter(f.id)} style={{background:filter===f.id?"rgba(99,102,241,0.1)":"transparent",border:"none",borderBottom:filter===f.id?"2px solid #6366f1":"2px solid transparent",color:filter===f.id?"#a5b4fc":"#64748b",padding:"7px 13px",cursor:"pointer",fontSize:"11px",fontWeight:600,borderRadius:"5px 5px 0 0"}}>{f.label}</button>)}
      </div>
      <div style={{display:"flex",flexDirection:"column",gap:7}}>
        {sorted.map(req=>{
          const isExp=expanded===req.id;
          return(
            <div key={req.id} onClick={()=>setExpanded(isExp?null:req.id)} style={{background:isExp?"rgba(99,102,241,0.07)":"rgba(255,255,255,0.025)",border:`1px solid ${isExp?"rgba(99,102,241,0.35)":"rgba(255,255,255,0.07)"}`,borderLeft:`3px solid ${statusColor[req.status]||"#64748b"}`,borderRadius:"0 12px 12px 0",padding:"11px 13px",cursor:"pointer",transition:"all 0.2s"}}>
              <div style={{display:"flex",alignItems:"flex-start",gap:9,marginBottom:6}}>
                <span style={{fontSize:"16px",flexShrink:0}}>{ctEmoji(req.changeType)}</span>
                <div style={{flex:1}}>
                  <div style={{display:"flex",alignItems:"center",gap:7,flexWrap:"wrap",marginBottom:3}}>
                    <span style={{color:"#f1f5f9",fontWeight:700,fontSize:"13px"}}>{req.submitterName}</span>
                    <span style={{color:req.role==="owner"||req.role==="manager"?"#f59e0b":"#64748b",fontSize:"11px",fontWeight:600}}>{ROLES.find(r=>r.value===req.role)?.label}</span>
                    <span style={{color:"#475569",fontSize:"11px"}}>→ {req.venueName}</span>
                  </div>
                  <div style={{display:"flex",gap:5,flexWrap:"wrap",alignItems:"center"}}>
                    <TrustBadge score={req.trustScore||0} approved={req.approvedBefore||0} isKnown={req.isKnown}/>
                    <Tag small label={statusLabel[req.status]||req.status} color={`${statusColor[req.status]||"#64748b"}18`} text={statusColor[req.status]||"#94a3b8"}/>
                    <span style={{color:"#334155",fontSize:"10px"}}>{ctLabel(req.changeType)}</span>
                    <span style={{color:"#334155",fontSize:"10px",marginLeft:"auto"}}>{fmt(req.createdAt)}</span>
                  </div>
                </div>
              </div>
              <div style={{background:"rgba(0,0,0,0.2)",borderRadius:7,padding:"7px 10px",color:"#94a3b8",fontSize:"12px",lineHeight:1.5}}>"{req.content}"</div>
              {isExp&&req.status==="pending"&&<div style={{marginTop:9,display:"flex",gap:7}}>
                <button onClick={e=>{e.stopPropagation();onAction(req.id,"approved");setExpanded(null);}} style={{flex:1,padding:"9px",background:"rgba(34,197,94,0.12)",border:"1px solid rgba(34,197,94,0.35)",borderRadius:9,color:"#4ade80",cursor:"pointer",fontSize:"12px",fontWeight:700}}>✓ Godkjenn</button>
                <button onClick={e=>{e.stopPropagation();onAction(req.id,"rejected");setExpanded(null);}} style={{flex:1,padding:"9px",background:"rgba(239,68,68,0.1)",border:"1px solid rgba(239,68,68,0.28)",borderRadius:9,color:"#f87171",cursor:"pointer",fontSize:"12px",fontWeight:700}}>✕ Avvis</button>
              </div>}
              {isExp&&req.status!=="pending"&&<div style={{marginTop:7,color:"#475569",fontSize:"11px"}}>{req.status==="approved"?"✓ Godkjent og publisert.":"✕ Avvist."}</div>}
            </div>
          );
        })}
        {sorted.length===0&&<div style={{textAlign:"center",color:"#334155",padding:"40px 0",fontSize:"13px"}}>Ingen forespørsler her</div>}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// AI PIPELINE (med ekte Google Places + Claude + Supabase)
// ═══════════════════════════════════════════════════════════════════════════════
function Pipeline({onComplete}){
  const [phase,setPhase]=useState("idle");
  const [log,setLog]=useState([]);
  const [pct,setPct]=useState(0);
  const [counts,setCounts]=useState({venues:0,websites:0,scanned:0,events:0});
  const logRef=useRef(null);
  const addLog=(txt,color="#64748b")=>setLog(p=>[...p.slice(-40),{txt,color}]);
  useEffect(()=>{if(logRef.current)logRef.current.scrollTop=logRef.current.scrollHeight;},[log]);

  const run=async()=>{
    if(phase!=="idle") return;
  // Test Railway-tilkobling
  try {
    const test = await fetch('https://utbergen-server-production.up.railway.app/test');
    const data = await test.json();
    console.log('Railway test:', data);
  } catch(err) {
    console.error('Railway ikke tilgjengelig:', err);
  }
    if(phase!=="idle") return;
    setPhase("running");setLog([]);setPct(0);setCounts({venues:0,websites:0,scanned:0,events:0});
    const delay=ms=>new Promise(r=>setTimeout(r,ms));
    addLog("🚀 Starter pipeline...","#a78bfa");

    // ── Fase 1: Google Places ──
    addLog("🔍 Søker etter utesteder i Bergen via Google Places API...","#60a5fa");
    await delay(300);

    const seen=new Set();
    const foundVenues=[];

    for(let i=0;i<GEO_QUERIES.length;i++){
      const q=GEO_QUERIES[i];
      addLog(`  Søker: "${q}"...`);
      const results=await googleTextSearch(q);
      let newCount=0;
      for(const place of results){
        if(seen.has(place.place_id)) continue;
        seen.add(place.place_id);
        newCount++;
        foundVenues.push({
          place_id:place.place_id,
          name:place.name,
          address:(place.formatted_address||"").replace(", Norway","").replace(", Norge",""),
          lat:place.geometry?.location?.lat||0,
          lng:place.geometry?.location?.lng||0,
          rating:place.rating||0,
          ratingCount:place.user_ratings_total||0,
          website:null,phone:null,email:null,instagram:null,facebook:null,
          categories:mapGoogleTypes(place.types||[]),
          description:`${place.name} – ${place.vicinity||"Bergen"}`,
          hours:{},
        });
      }
      setCounts(p=>({...p,venues:foundVenues.length}));
      addLog(`  ✓ ${results.length} treff → ${newCount} nye`,"#4ade80");
      setPct(((i+1)/GEO_QUERIES.length)*35);
      await delay(1500);
    }

    addLog(`✅ Fant ${foundVenues.length} unike utesteder i Bergen`,"#4ade80");

    // ── Fase 2: Hent detaljer for topp-utesteder ──
    addLog("📋 Henter detaljer (åpningstider, nettside, telefon)...","#60a5fa");
    const topVenues=foundVenues.slice(0,100); // Begrens API-kall
    for(let i=0;i<topVenues.length;i++){
      const v=topVenues[i];
      const details=await googlePlaceDetails(v.place_id);
     if(details){
        v.phone=details.formatted_phone_number||null;
        v.website=details.website||null;
        v.hours=parseHours(details.opening_hours);
        if(details.rating) v.rating=details.rating;
        if(details.user_ratings_total) v.ratingCount=details.user_ratings_total;
        if(details.photos) v.photo_references=details.photos.slice(0,6).map(p=>p.photo_reference);
      }
      // Hent OG-bilder fra nettside
      if(v.website){
        try{
          const ogRes = await fetch(`https://utbergen-server-production.up.railway.app/og-images?url=${encodeURIComponent(v.website)}`);
          const og = await ogRes.json();
          if(og.cover) v.cover_image = og.cover;
          if(og.logo) v.logo_url = og.logo;
          if(og.description && !v.description) v.description = og.description;
          addLog(`  🖼 ${v.name}: cover og logo hentet`,"#4ade80");
        }catch{}
      }
      if(v.website){setCounts(p=>({...p,websites:p.websites+1}));addLog(`  🌐 ${v.name}: ${v.website.replace("https://","").slice(0,40)}`,"#4ade80");}
      setPct(35+((i+1)/topVenues.length)*25);
      await delay(1500);
    }

    // ── Fase 3: Lagre i Supabase ──
    addLog("💾 Lagrer utesteder i Supabase...","#34d399");
    await dbUpsertVenues(foundVenues);
    addLog(`✅ ${foundVenues.length} utesteder lagret`,"#4ade80");
    setPct(60);

    // ── Fase 4: AI-skann nettsider for eventer ──
    addLog("🤖 AI-agent skanner nettsider for eventer...","#a78bfa");
    const allEvents=[];
    const venuesWithSite=foundVenues.filter(v=>v.website);
    setCounts(p=>({...p,websites:venuesWithSite.length}));

    for(let i=0;i<venuesWithSite.length;i++){
      const v=venuesWithSite[i];
      addLog(`🤖 Skanner ${v.name}...`);
      const content=await fetchWebsiteContent(v);
      if(content){
        const events=await claudeScrapeEvents(v,content);
        if(events.length>0){
          allEvents.push(...events);
          setCounts(p=>({...p,events:p.events+events.length}));
          addLog(`  ✓ ${events.length} eventer funnet`,"#4ade80");
        }
      }
      setCounts(p=>({...p,scanned:i+1}));
      setPct(60+((i+1)/venuesWithSite.length)*20);
      await delay(1500);
    }

    // ── Fase 5: Skann venue_urls-tabellen ──
    addLog("🔗 Sjekker spesifikke event-URL-er fra databasen...","#60a5fa");
    const { data: venueUrls } = await supabase
      .from('venue_urls')
      .select('*, venues(name, place_id)')
      .eq('active', true);

    if(venueUrls?.length>0){
      addLog(`📋 Fant ${venueUrls.length} registrerte event-URL-er`,"#4ade80");
      for(let i=0;i<venueUrls.length;i++){
        const vu=venueUrls[i];
        const venueName=vu.venues?.name||vu.venue_id;
        addLog(`🤖 Skanner ${venueName}: ${vu.url.replace('https://','').slice(0,40)}...`);
        const content=await fetchWebsiteContent({website:vu.url});
        if(content){
          const events=await claudeScrapeEvents(
            {name:venueName, place_id:vu.venue_id},
            content
          );
          if(events.length>0){
            allEvents.push(...events);
            setCounts(p=>({...p,events:p.events+events.length}));
            addLog(`  ✓ ${events.length} eventer funnet`,"#4ade80");
          }
        }
        setPct(80+((i+1)/venueUrls.length)*15);
        await delay(1500);
      }
    } else {
      addLog("— Ingen venue_urls registrert – kjør insert_venue_urls() i Supabase","#475569");
    }

    // ── Fase 6: Lagre eventer ──
    if(allEvents.length>0){
  addLog(`🗑 Sletter gamle eventer...`,"#f59e0b");
  await supabase.from('events').delete().neq('id', 'placeholder');
  addLog(`💾 Lagrer ${allEvents.length} nye eventer...`,"#34d399");
  await dbUpsertEvents(allEvents);
}

    setPct(100);
    addLog(`\n✅ PIPELINE FERDIG!`,"#4ade80");
    addLog(`📊 ${foundVenues.length} utesteder · ${venuesWithSite.length} nettsider · ${allEvents.length} eventer`,"#4ade80");
    setPhase("done");
    onComplete();
  };

  return(
    <div>
      <div style={{background:"rgba(255,255,255,0.02)",border:"1px solid rgba(255,255,255,0.06)",borderRadius:12,padding:"12px 14px",marginBottom:14}}>
        <div style={{color:"#475569",fontSize:"10px",fontWeight:700,letterSpacing:"0.1em",textTransform:"uppercase",marginBottom:8}}>Hva pipeline gjør</div>
        {[{icon:"🔍",step:"Google Places API",desc:`Søker med ${GEO_QUERIES.length} norske søkeord, deduplicerer med place_id`,color:"#4285F4"},{icon:"📋",step:"Venue-detaljer",desc:"Henter åpningstider, nettside og telefon for hvert sted",color:"#f59e0b"},{icon:"💾",step:"Supabase",desc:"Lagrer alle utesteder i databasen",color:"#22c55e"},{icon:"🤖",step:"Claude AI",desc:"Besøker nettsider og henter eventer med AI",color:"#8b5cf6"}].map(item=>(
          <div key={item.step} style={{display:"flex",gap:10,padding:"7px 0",borderBottom:"1px solid rgba(255,255,255,0.04)"}}>
            <span style={{fontSize:"14px"}}>{item.icon}</span>
            <div><div style={{color:item.color,fontWeight:600,fontSize:"12px"}}>{item.step}</div><div style={{color:"#475569",fontSize:"11px"}}>{item.desc}</div></div>
          </div>
        ))}
      </div>

      {phase!=="idle"&&<div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:8,marginBottom:12}}>
        {[{icon:"🏙",label:"Funnet",val:counts.venues,color:"#6366f1"},{icon:"🌐",label:"Nettsider",val:counts.websites,color:"#3b82f6"},{icon:"🤖",label:"Skannet",val:counts.scanned,color:"#8b5cf6"},{icon:"📅",label:"Eventer",val:counts.events,color:"#22c55e"}].map(s=>(
          <div key={s.label} style={{background:"rgba(255,255,255,0.03)",border:`1px solid ${s.color}22`,borderRadius:10,padding:"9px 6px",textAlign:"center"}}>
            <div>{s.icon}</div><div style={{color:s.color,fontSize:"20px",fontWeight:800,lineHeight:1}}>{s.val}</div><div style={{color:"#475569",fontSize:"9px",marginTop:1}}>{s.label}</div>
          </div>
        ))}
      </div>}

      {phase!=="idle"&&<div style={{marginBottom:12}}><ProgressBar pct={pct} color={pct<35?"#4285F4":pct<65?"#f59e0b":pct<95?"#8b5cf6":"#22c55e"}/></div>}

      <div style={{background:"rgba(0,0,0,0.4)",border:"1px solid rgba(255,255,255,0.04)",borderRadius:10,padding:"10px",height:280,fontFamily:"monospace",fontSize:"10px",lineHeight:1.8,overflowY:"auto",marginBottom:14}} ref={logRef}>
        {log.length===0?<span style={{color:"#1e293b"}}>Trykk "Kjør pipeline" for å starte med ekte API-kall...</span>:log.map((l,i)=><div key={i} style={{color:l.color}}>{l.txt}</div>)}
      </div>

      <button onClick={phase==="idle"?run:phase==="done"?()=>{setPhase("idle");setPct(0);setLog([]);setCounts({venues:0,websites:0,scanned:0,events:0});}:undefined}
        disabled={phase==="running"}
        style={{width:"100%",padding:"13px",background:phase==="done"?"linear-gradient(135deg,#059669,#10b981)":"linear-gradient(135deg,#6366f1,#8b5cf6)",border:"none",borderRadius:12,color:"#fff",fontSize:"13px",fontWeight:700,cursor:phase==="running"?"not-allowed":"pointer",animation:phase==="idle"?"pulse 2s infinite":"none",boxShadow:phase==="idle"?"0 4px 16px rgba(99,102,241,0.3)":"none"}}>
        {phase==="idle"&&"▶  Kjør pipeline – ekte Google Places + Claude AI + Supabase"}
        {phase==="running"&&"⟳  Henter ekte data fra Bergen..."}
        {phase==="done"&&"✅ Ferdig! Kjør igjen for å oppdatere"}
      </button>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ROOT
// ═══════════════════════════════════════════════════════════════════════════════
export default function NattBergen(){
  const [tab,setTab]=useState("app");
  const [venues,setVenues]=useState(FALLBACK_VENUES);
  const [events,setEvents]=useState(FALLBACK_EVENTS);
  const [requests,setRequests]=useState([]);
  const [knownSubmitters,setKnownSubmitters]=useState({...KNOWN_SUBMITTERS});
  const [isLive,setIsLive]=useState(false);
  const [loading,setLoading]=useState(true);
  const [toast,setToast]=useState(null);

  // Last inn fra Supabase ved oppstart
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

  const handleRequestChange=(req)=>{
    setRequests(p=>[req,...p]);
    showToast(`Ny forespørsel fra ${req.submitterName}`,"info");
  };

  const handleAction=async(id,status)=>{
    await dbUpdateRequestStatus(id,status);
    setRequests(p=>p.map(r=>{
      if(r.id!==id) return r;
      if(status==="approved"){
        const prev=knownSubmitters[r.submitterEmail]||{approved:0};
        setKnownSubmitters(k=>({...k,[r.submitterEmail]:{...prev,approved:prev.approved+1}}));
      }
      return{...r,status};
    }));
    showToast(status==="approved"?"✓ Endring godkjent!":"✕ Avvist.",status==="approved"?"success":"error");
  };

  const handlePipelineComplete=async()=>{
    // Reload from Supabase after pipeline
    const [dbVenues,dbEvents]=await Promise.all([dbFetchVenues(),dbFetchEvents()]);
    if(dbVenues.length>0) setVenues(dbVenues);
    if(Object.keys(dbEvents).length>0) setEvents(dbEvents);
    setIsLive(true);
    showToast(`✅ Pipeline ferdig – appen er oppdatert med live data!`,"success");
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

      <div style={{background:"linear-gradient(180deg,rgba(99,102,241,0.1) 0%,transparent 100%)",borderBottom:"1px solid rgba(255,255,255,0.06)",padding:"13px 18px",position:"sticky",top:0,zIndex:100,backdropFilter:"blur(24px)"}}>
        <div style={{maxWidth:900,margin:"0 auto"}}>
          <div style={{display:"flex",alignItems:"center",gap:11,marginBottom:11}}>
            <div style={{background:"linear-gradient(135deg,#6366f1,#8b5cf6)",borderRadius:11,width:38,height:38,display:"flex",alignItems:"center",justifyContent:"center",fontSize:"18px",boxShadow:"0 4px 14px rgba(99,102,241,0.4)",flexShrink:0}}>🍺</div>
            <div>
              <div style={{fontSize:"18px",fontWeight:800,letterSpacing:"-0.02em"}}>NattBergen</div>
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
        NattBergen v4.0 · Google Places API · Claude AI · Supabase · Bergen 2026
      </div>
    </div>
  );
}