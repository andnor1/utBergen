/* eslint-disable */
import { useState, useRef, useEffect } from "react";
import { GEO_QUERIES, SERVER } from "./constants";
import { ProgressBar } from "./ui";
import { supabase, googleTextSearch, googlePlaceDetails, parseHours, mapGoogleTypes, fetchWebsiteContent, claudeScrapeEvents, dbUpsertVenues, dbUpsertEvents } from "./api";

export default function Pipeline({onComplete}){
  const [phase,setPhase]=useState("idle");
  const [log,setLog]=useState([]);
  const [pct,setPct]=useState(0);
  const [counts,setCounts]=useState({venues:0,websites:0,scanned:0,events:0});
  const logRef=useRef(null);
  const addLog=(txt,color="#64748b")=>setLog(p=>[...p.slice(-40),{txt,color}]);
  useEffect(()=>{if(logRef.current)logRef.current.scrollTop=logRef.current.scrollHeight;},[log]);

  const run=async()=>{
    if(phase!=="idle") return;
    setPhase("running");setLog([]);setPct(0);setCounts({venues:0,websites:0,scanned:0,events:0});
    const delay=ms=>new Promise(r=>setTimeout(r,ms));
    addLog("🚀 Starter pipeline...","#a78bfa");

    // ── Fase 1: Google Places ──
    addLog("🔍 Søker etter utesteder i Bergen...","#60a5fa");
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
          place_id:place.place_id,name:place.name,
          address:(place.formatted_address||"").replace(", Norway","").replace(", Norge",""),
          lat:place.geometry?.location?.lat||0,lng:place.geometry?.location?.lng||0,
          rating:place.rating||0,ratingCount:place.user_ratings_total||0,
          website:null,phone:null,email:null,instagram:null,facebook:null,
          categories:mapGoogleTypes(place.types||[]),
          description:`${place.name} – ${place.vicinity||"Bergen"}`,hours:{},
        });
      }
      setCounts(p=>({...p,venues:foundVenues.length}));
      addLog(`  ✓ ${results.length} treff → ${newCount} nye`,"#4ade80");
      setPct(((i+1)/GEO_QUERIES.length)*35);
      await delay(300);
    }

    addLog(`✅ Fant ${foundVenues.length} unike utesteder`,"#4ade80");

    // ── Fase 2: Hent detaljer ──
    addLog("📋 Henter detaljer, bilder og OG-data...","#60a5fa");
    for(let i=0;i<foundVenues.length;i++){
      const v=foundVenues[i];
      const details=await googlePlaceDetails(v.place_id);
      if(details){
        v.phone=details.formatted_phone_number||null;
        v.website=details.website||null;
        v.hours=parseHours(details.opening_hours);
        if(details.rating) v.rating=details.rating;
        if(details.user_ratings_total) v.ratingCount=details.user_ratings_total;
        if(details.photos) v.photo_references=details.photos.slice(0,6).map(p=>p.photo_reference);
      }
      if(v.website){
        setCounts(p=>({...p,websites:p.websites+1}));
        addLog(`  🌐 ${v.name}`,"#4ade80");
        try{
          const ogRes=await fetch(`${SERVER}/og-images?url=${encodeURIComponent(v.website)}`);
          const og=await ogRes.json();
          if(og.cover) v.cover_image=og.cover;
          if(og.logo) v.logo_url=og.logo;
          if(og.description&&!v.description) v.description=og.description;
        }catch{}
      }
      setPct(35+((i+1)/foundVenues.length)*25);
      await delay(200);
    }

    // ── Fase 3: Lagre i Supabase ──
    addLog("💾 Lagrer utesteder i Supabase...","#34d399");
    await dbUpsertVenues(foundVenues);
    addLog(`✅ ${foundVenues.length} utesteder lagret`,"#4ade80");
    setPct(60);

    // ── Fase 4: AI-skann nettsider ──
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
        console.log(`${v.name}: ${events.length} eventer funnet`, events.slice(0,1));
        if(events.length>0){allEvents.push(...events);setCounts(p=>({...p,events:p.events+events.length}));addLog(`  ✓ ${events.length} eventer`,"#4ade80");}
      } else {
        console.log(`${v.name}: ingen innhold hentet`);
      }
      setCounts(p=>({...p,scanned:i+1}));
      setPct(60+((i+1)/venuesWithSite.length)*20);
      await delay(1500);
    }

    // ── Fase 5: venue_urls ──
    addLog("🔗 Sjekker registrerte event-URL-er...","#60a5fa");
    const { data: venueUrls } = await supabase.from('venue_urls').select('*, venues(name,place_id)').eq('active',true);
    if(venueUrls?.length>0){
      addLog(`📋 Fant ${venueUrls.length} URL-er`,"#4ade80");
      for(let i=0;i<venueUrls.length;i++){
        const vu=venueUrls[i];
        const venueName=vu.venues?.name||vu.venue_id;
        addLog(`🤖 Skanner ${venueName}...`);
        const content=await fetchWebsiteContent({website:vu.url});
        if(content){
          const events=await claudeScrapeEvents({name:venueName,place_id:vu.venue_id},content);
          if(events.length>0){allEvents.push(...events);setCounts(p=>({...p,events:p.events+events.length}));addLog(`  ✓ ${events.length} eventer`,"#4ade80");}
        }
        setPct(80+((i+1)/venueUrls.length)*15);
        await delay(1500);
      }
    }

    // ── Fase 6: Lagre eventer ──
    console.log('Total events å lagre:', allEvents.length);
    if(allEvents.length>0){
      addLog(`🗑 Sletter gamle eventer...`,"#f59e0b");
      await supabase.from('events').delete().neq('id','placeholder');
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
        {[{icon:"🔍",step:"Google Places API",desc:`${GEO_QUERIES.length} søkeord, dedup med place_id`,color:"#4285F4"},{icon:"🖼",step:"OG + bilder",desc:"Cover, logo og Google Places bilder",color:"#f59e0b"},{icon:"💾",step:"Supabase",desc:"Lagrer alle utesteder",color:"#22c55e"},{icon:"🤖",step:"Claude AI",desc:"Crawler nettsider og henter eventer",color:"#8b5cf6"}].map(item=>(
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
        {log.length===0?<span style={{color:"#1e293b"}}>Trykk "Kjør pipeline" for å starte...</span>:log.map((l,i)=><div key={i} style={{color:l.color}}>{l.txt}</div>)}
      </div>

      <button onClick={phase==="idle"?run:phase==="done"?()=>{setPhase("idle");setPct(0);setLog([]);setCounts({venues:0,websites:0,scanned:0,events:0});}:undefined}
        disabled={phase==="running"}
        style={{width:"100%",padding:"13px",background:phase==="done"?"linear-gradient(135deg,#059669,#10b981)":"linear-gradient(135deg,#6366f1,#8b5cf6)",border:"none",borderRadius:12,color:"#fff",fontSize:"13px",fontWeight:700,cursor:phase==="running"?"not-allowed":"pointer",animation:phase==="idle"?"pulse 2s infinite":"none",boxShadow:phase==="idle"?"0 4px 16px rgba(99,102,241,0.3)":"none"}}>
        {phase==="idle"&&"▶  Kjør pipeline – Google Places + OG-bilder + Claude AI + Supabase"}
        {phase==="running"&&"⟳  Henter live data fra Bergen..."}
        {phase==="done"&&"✅ Ferdig! Kjør igjen for å oppdatere"}
      </button>
    </div>
  );
}
