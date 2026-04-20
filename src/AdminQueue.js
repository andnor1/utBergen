/* eslint-disable */
import { useState, useMemo } from "react";
import { ROLES, CHANGE_TYPES } from "./constants";
import { Tag, TrustBadge } from "./ui";

export default function AdminQueue({requests,onAction}){
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
