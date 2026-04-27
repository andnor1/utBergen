/* eslint-disable */
export const SERVER = "https://utbergen-server-production.up.railway.app";

export const GEO_QUERIES = [
  "bar Bergen Norway", "pub Bergen Norway", "nattklubb Bergen",
  "sportsbar Bergen", "cocktailbar Bergen", "live musikk bar Bergen",
  "irish pub Bergen", "studentbar Bergen", "ølbar Bergen",
  "utested Bergen sentrum", "nightclub Bergen", "sports bar Bergen",
  "minigolf Bergen", "shuffleboard bar Bergen", "biljard bar Bergen",
  "dart bar Bergen", "biljardklubb Bergen", "spillbar Bergen",
];

export const ROLES = [
  {value:"owner",label:"Eier",trust:5},
  {value:"manager",label:"Daglig leder",trust:4},
  {value:"staff",label:"Ansatt",trust:3},
  {value:"regular",label:"Fast gjest",trust:2},
  {value:"customer",label:"Gjest/Kunde",trust:1},
  {value:"other",label:"Annet",trust:1},
];

export const CHANGE_TYPES = [
  {value:"event_add",label:"Legg til event",emoji:"📅"},
  {value:"event_edit",label:"Endre event",emoji:"✏️"},
  {value:"hours",label:"Åpningstider",emoji:"🕐"},
  {value:"description",label:"Beskrivelse",emoji:"📝"},
  {value:"contact",label:"Kontaktinfo",emoji:"📞"},
  {value:"other",label:"Annet",emoji:"❓"},
];

export const FILTER_CATS = [
  {id:"all",label:"Alle",emoji:"🍺"},
  {id:"football",label:"Fotball",emoji:"⚽"},
  {id:"live_music",label:"Live musikk",emoji:"🎸"},
  {id:"quiz",label:"Quiz",emoji:"🧠"},
  {id:"cocktail",label:"Cocktail",emoji:"🍸"},
  {id:"sport",label:"Sport",emoji:"🏆"},
  {id:"nightclub",label:"Nattklubb",emoji:"🎉"},
  {id:"games",label:"Spill",emoji:"🎮"},
  {id:"pool",label:"Biljard",emoji:"🎱"},
  {id:"shuffleboard",label:"Shuffleboard",emoji:"🏒"},
  {id:"minigolf",label:"Minigolf",emoji:"⛳"},
  {id:"karaoke",label:"Karaoke",emoji:"🎤"},
  {id:"dart",label:"Dart",emoji:"🎯"},
  {id:"craft_beer",label:"Håndverksøl",emoji:"🍺"},
  {id:"happy_hour",label:"Happy Hour",emoji:"🥂"},
];

export const EV = {
  live_music:{color:"#f59e0b",emoji:"🎸"},
  football:{color:"#22c55e",emoji:"⚽"},
  quiz:{color:"#8b5cf6",emoji:"🧠"},
  games:{color:"#3b82f6",emoji:"🎮"},
  happy_hour:{color:"#ec4899",emoji:"🥂"},
  nightclub:{color:"#06b6d4",emoji:"🎉"},
  terrace:{color:"#f97316",emoji:"☀️"},
  general:{color:"#64748b",emoji:"📸"},
  event:{color:"#a855f7",emoji:"📅"},
};


// Alle kategorier for admin-panel
export const ALL_CATEGORIES = [
  {id:"football",label:"Fotball",emoji:"⚽"},
  {id:"live_music",label:"Live musikk",emoji:"🎸"},
  {id:"quiz",label:"Quiz",emoji:"🧠"},
  {id:"cocktail",label:"Cocktail",emoji:"🍸"},
  {id:"sport",label:"Sport",emoji:"🏆"},
  {id:"nightclub",label:"Nattklubb",emoji:"🎉"},
  {id:"games",label:"Spill/Brettspill",emoji:"🎮"},
  {id:"pool",label:"Biljard",emoji:"🎱"},
  {id:"shuffleboard",label:"Shuffleboard",emoji:"🏒"},
  {id:"minigolf",label:"Minigolf",emoji:"⛳"},
  {id:"karaoke",label:"Karaoke",emoji:"🎤"},
  {id:"dart",label:"Dart",emoji:"🎯"},
  {id:"craft_beer",label:"Håndverksøl",emoji:"🍺"},
  {id:"happy_hour",label:"Happy Hour",emoji:"🥂"},
  {id:"pub",label:"Pub",emoji:"🍻"},
  {id:"bowling",label:"Bowling",emoji:"🎳"},
  {id:"student",label:"Studentbar",emoji:"🎓"},
  {id:"terrace",label:"Uteservering",emoji:"☀️"},
];
export const KNOWN_SUBMITTERS = {
  "claus@felixbergen.no":{name:"Claus Pedersen",role:"owner",venue:"Felix",approved:4,rejected:0},
  "post@fotballpuben.no":{name:"Lars Eriksen",role:"manager",venue:"Fotballpuben",approved:2,rejected:1},
};

export const FALLBACK_VENUES = [
  {place_id:"p001",name:"Felix",address:"Torget 3",lat:60.3947,lng:5.3259,rating:4.0,ratingCount:980,website:"https://www.felixbergen.no",phone:"+47 41 07 20 00",instagram:"@felixbergen",facebook:"felixbergen",categories:["live_music","football","nightclub"],description:"Felix er Bergens beste bar for live musikk.",hours:{Man:"12:00–03:00",Fre:"12:00–03:00",Lør:"12:00–03:00"}},
  {place_id:"p002",name:"No Stress Bergen",address:"Hollendergaten 11",lat:60.3949,lng:5.3266,rating:4.6,ratingCount:1412,instagram:"@nostressbergen",categories:["cocktail","games"],description:"Koselig cocktailbar med brettspill.",hours:{Fre:"15:00–03:00",Lør:"15:00–03:00"}},
  {place_id:"p013",name:"Fotballpuben",address:"Vaskerelven 1",lat:60.3916,lng:5.3205,rating:3.8,ratingCount:1074,website:"https://www.fotballpuben.no",phone:"+47 55 33 66 66",instagram:"@fotballpuben",categories:["football","quiz"],description:"Bergens beste bar for fotballfans.",hours:{Man:"10:00–03:00",Søn:"12:00–03:00"}},
  {place_id:"p022",name:"Hulen",address:"Olaf Ryes vei 48",lat:60.3820,lng:5.3310,rating:4.4,ratingCount:892,website:"https://www.hulen.no",instagram:"@hulenbergen",categories:["live_music","nightclub"],description:"Legendarisk konsertscene i Bergen.",hours:{Fre:"21:00–03:00",Lør:"21:00–03:00"}},
  {place_id:"p024",name:"Garage",address:"Chr. Michelsens gate 2",lat:60.3925,lng:5.3215,rating:4.1,ratingCount:743,website:"https://www.garage.no",instagram:"@garagebergen",categories:["live_music","nightclub"],description:"Rock og metal-bar med live konserter.",hours:{Fre:"20:00–03:00",Lør:"20:00–03:00"}},
];

export const FALLBACK_EVENTS = {
  p001:[{id:"e1",venue_id:"p001",title:"Live musikk",date:"I kveld",time:"23:00",type:"live_music"}],
  p013:[{id:"e7",venue_id:"p013",title:"Fredagsquiz",date:"Fredag",time:"20:00",type:"quiz"}],
};

// Shared UI styles
export const inp = {width:"100%",background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:9,padding:"9px 12px",color:"#f1f5f9",fontSize:"13px",outline:"none",fontFamily:"inherit",boxSizing:"border-box"};
export const lbl = {color:"#64748b",fontSize:"11px",fontWeight:600,display:"block",marginBottom:4};
export const card = {background:"rgba(255,255,255,0.025)",border:"1px solid rgba(255,255,255,0.07)",borderRadius:12,padding:"13px 14px"};
