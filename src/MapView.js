/* eslint-disable */
import { useRef, useEffect } from "react";

export default function MapView({venues,events,selected,onSelect}){
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef([]);

  useEffect(()=>{
    if(!mapRef.current) return;
    const initMap = () => {
      if(!window.google?.maps){ setTimeout(initMap,100); return; }
      mapInstanceRef.current = new window.google.maps.Map(mapRef.current, {
        center:{lat:60.3928,lng:5.3244}, zoom:14,
        styles:[
          {elementType:"geometry",stylers:[{color:"#0f1a2e"}]},
          {elementType:"labels.text.fill",stylers:[{color:"#8ec3b9"}]},
          {elementType:"labels.text.stroke",stylers:[{color:"#1a3646"}]},
          {featureType:"water",elementType:"geometry",stylers:[{color:"#0e1626"}]},
          {featureType:"road",elementType:"geometry",stylers:[{color:"#1a2a3a"}]},
          {featureType:"road",elementType:"geometry.stroke",stylers:[{color:"#255763"}]},
          {featureType:"poi",stylers:[{visibility:"off"}]},
          {featureType:"transit",stylers:[{visibility:"off"}]},
          {featureType:"landscape",elementType:"geometry",stylers:[{color:"#0f1a2e"}]},
          {featureType:"administrative",elementType:"geometry.stroke",stylers:[{color:"#334155"}]},
        ],
        disableDefaultUI:false,zoomControl:true,mapTypeControl:false,streetViewControl:false,fullscreenControl:true,
      });
    };
    initMap();
  },[]);

  useEffect(()=>{
    if(!mapInstanceRef.current||!window.google) return;
    markersRef.current.forEach(m=>m.setMap(null));
    markersRef.current=[];
    venues.filter(v=>v.lat&&v.lng).forEach(v=>{
      const hasEv=(events[v.place_id]||[]).length>0;
      const isSel=selected?.place_id===v.place_id;
      const marker=new window.google.maps.Marker({
        position:{lat:v.lat,lng:v.lng},map:mapInstanceRef.current,title:v.name,
        icon:{path:window.google.maps.SymbolPath.CIRCLE,scale:isSel?12:8,fillColor:isSel?'#6366f1':hasEv?'#22c55e':'#334155',fillOpacity:1,strokeColor:isSel?'#a5b4fc':hasEv?'#4ade80':'#6366f1',strokeWeight:2},
        zIndex:isSel?10:1,
      });
      marker.addListener('click',()=>onSelect(v));
      markersRef.current.push(marker);
    });
  },[venues,events,selected]);

  useEffect(()=>{
    if(!mapInstanceRef.current||!selected) return;
    mapInstanceRef.current.panTo({lat:selected.lat,lng:selected.lng});
  },[selected]);

  return(
    <div style={{position:"relative"}}>
      <div ref={mapRef} style={{width:"100%",height:320,borderRadius:14,border:"1px solid rgba(99,102,241,0.3)",overflow:"hidden"}}/>
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
