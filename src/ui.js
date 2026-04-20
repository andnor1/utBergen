/* eslint-disable */
import { ROLES, EV } from "./constants";

export const Stars = ({r}) => (
  <span style={{color:"#f59e0b",fontSize:"11px"}}>
    {"★".repeat(Math.round(r||0))}{"☆".repeat(5-Math.round(r||0))}
    <span style={{color:"#475569",marginLeft:3}}>{(r||0).toFixed(1)}</span>
  </span>
);

export const Tag = ({label,color="rgba(99,102,241,0.15)",text="#a5b4fc",small}) => (
  <span style={{background:color,color:text,borderRadius:999,padding:small?"1px 6px":"3px 9px",fontSize:small?"9px":"11px",fontWeight:700}}>{label}</span>
);

export const TrustBadge = ({score,approved,isKnown}) => {
  if(score>=4&&approved>=2) return <Tag small label={`⭐ Betrodd · ${approved} godkjent`} color="rgba(34,197,94,0.15)" text="#4ade80"/>;
  if(score>=3&&isKnown) return <Tag small label={`✓ Kjent · ${approved} godkjent`} color="rgba(59,130,246,0.15)" text="#60a5fa"/>;
  if(!isKnown||approved===0) return <Tag small label="⚠️ Ny avsender" color="rgba(245,158,11,0.15)" text="#fbbf24"/>;
  return <Tag small label="Lav tillit" color="rgba(100,116,139,0.15)" text="#94a3b8"/>;
};

export const ProgressBar = ({pct,color="#6366f1"}) => (
  <div style={{background:"rgba(255,255,255,0.06)",borderRadius:999,height:3}}>
    <div style={{width:`${pct}%`,height:"100%",borderRadius:999,background:`linear-gradient(90deg,${color},${color}88)`,transition:"width 0.3s ease",boxShadow:`0 0 6px ${color}55`}}/>
  </div>
);

export const SecTitle = ({children}) => (
  <div style={{color:"#475569",fontSize:"10px",fontWeight:700,letterSpacing:"0.12em",textTransform:"uppercase",marginBottom:8,paddingBottom:5,borderBottom:"1px solid rgba(255,255,255,0.05)"}}>{children}</div>
);

export const SrcBadge = ({label,color,icon}) => (
  <span style={{display:"inline-flex",alignItems:"center",gap:4,background:`${color}18`,color,border:`1px solid ${color}33`,borderRadius:999,padding:"2px 8px",fontSize:"10px",fontWeight:700}}>{icon} {label}</span>
);

export const EventRow = ({ev, onClick, style={}}) => {
  const cfg = EV[ev.type]||{color:"#64748b",emoji:"📅"};
  return (
    <div onClick={onClick} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 12px",background:"rgba(255,255,255,0.02)",borderLeft:`3px solid ${cfg.color}`,borderRadius:"0 10px 10px 0",...style}}>
      <span style={{fontSize:"16px"}}>{cfg.emoji}</span>
      <div style={{flex:1}}>
        <div style={{color:"#f1f5f9",fontWeight:600,fontSize:"13px"}}>{ev.title}</div>
        {ev.league&&<span style={{color:cfg.color,fontSize:"10px",fontWeight:700}}>{ev.league}</span>}
      </div>
      <div style={{textAlign:"right"}}>
        <div style={{color:cfg.color,fontWeight:700,fontSize:"12px"}}>{ev.time}</div>
        <div style={{color:"#475569",fontSize:"10px"}}>{ev.date}</div>
      </div>
    </div>
  );
};
