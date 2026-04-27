/* eslint-disable */
import { createClient } from "@supabase/supabase-js";
import { SERVER, GEO_QUERIES } from "./constants";

export const supabase = createClient(
  process.env.REACT_APP_SUPABASE_URL,
  process.env.REACT_APP_SUPABASE_KEY
);

// ─── SUPABASE ────────────────────────────────────────────────────────────────

export async function dbFetchVenues() {
  const { data, error } = await supabase.from("venues").select("*").order("rating", { ascending: false });
  if (error) { console.error("fetchVenues:", error); return []; }
  return (data || []).map(v => ({ ...v, ratingCount: v.rating_count, categories: v.categories || [], hours: v.hours || {} }));
}

export async function dbFetchEvents() {
  const { data, error } = await supabase.from("events").select("*");
  if (error) { console.error("fetchEvents:", error); return {}; }
  const grouped = {};
  (data || []).forEach(ev => {
    if (!grouped[ev.venue_id]) grouped[ev.venue_id] = [];
    grouped[ev.venue_id].push(ev);
  });
  return grouped;
}

export async function dbFetchRequests() {
  const { data, error } = await supabase.from("change_requests").select("*").order("created_at", { ascending: false });
  if (error) { console.error("fetchRequests:", error); return []; }
  return (data || []).map(r => ({
    ...r, venueId: r.venue_id, venueName: r.venue_name,
    submitterName: r.submitter_name, submitterEmail: r.submitter_email,
    changeType: r.change_type, trustScore: r.trust_score,
    approvedBefore: r.approved_before, isKnown: r.is_known || false, createdAt: r.created_at,
  }));
}

export async function dbInsertRequest(req) {
  const { error } = await supabase.from("change_requests").insert([{
    id: req.id, venue_id: req.venueId, venue_name: req.venueName,
    submitter_name: req.submitterName, submitter_email: req.submitterEmail,
    role: req.role, change_type: req.changeType, content: req.content,
    status: req.status, trust_score: req.trustScore,
    approved_before: req.approvedBefore, is_known: req.isKnown,
  }]);
  if (error) console.error("insertRequest:", error);
}

export async function dbUpdateRequestStatus(id, status) {
  const { error } = await supabase.from("change_requests").update({ status }).eq("id", id);
  if (error) console.error("updateRequest:", error);
}

export async function dbUpsertVenues(venues) {
  const rows = venues.map(v => ({
    place_id: v.place_id, name: v.name, address: v.address,
    lat: v.lat, lng: v.lng, rating: v.rating,
    rating_count: v.ratingCount || v.rating_count || 0,
    website: v.website || null, phone: v.phone || null,
    email: v.email || null, instagram: v.instagram || null,
    facebook: v.facebook || null, categories: v.categories || [],
    description: v.description || "", hours: v.hours || {},
    photo_references: v.photo_references || null,
    cover_image: v.cover_image || null, logo_url: v.logo_url || null,
  }));
  const { error } = await supabase.from("venues").upsert(rows, { onConflict: "place_id" });
  if (error) console.error("upsertVenues:", error);
}

export async function dbUpsertEvents(events) {
  if (!events.length) return;
  // Kun behold kolonner som finnes i databasen
  const clean = events.map(e => ({
    id: e.id,
    venue_id: e.venue_id,
    title: e.title,
    date: e.date,
    time: e.time,
    type: e.type,
    league: e.league || null,
  }));
  // Dedupliser
  const unique = Object.values(clean.reduce((acc, e) => { acc[e.id] = e; return acc; }, {}));
  const { error } = await supabase.from("events").upsert(unique, { onConflict: "id" });
  if (error) console.error("upsertEvents:", error);
}

// ─── GOOGLE PLACES ───────────────────────────────────────────────────────────

export function mapGoogleTypes(types = []) {
  const map = { bar:"cocktail", night_club:"nightclub", pub:"pub", sports_bar:"sport", bowling_alley:"bowling", live_music_venue:"live_music" };
  const cats = new Set();
  types.forEach(t => { if (map[t]) cats.add(map[t]); });
  if (types.includes("sports_bar") || types.includes("stadium")) cats.add("football");
  if (cats.size === 0) cats.add("bar");
  return Array.from(cats);
}

export async function googleTextSearch(query) {
  try {
    const res = await fetch(`${SERVER}/places/search?query=${encodeURIComponent(query)}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return data.results || [];
  } catch (err) { console.error("googleTextSearch error:", err); return []; }
}

export async function googlePlaceDetails(placeId) {
  try {
    const res = await fetch(`${SERVER}/places/details?place_id=${placeId}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return data.result || null;
  } catch (err) { console.error("googlePlaceDetails error:", err); return null; }
}

export function parseHours(openingHours) {
  if (!openingHours?.weekday_text) return {};
  const days = ["Man", "Tir", "Ons", "Tor", "Fre", "Lør", "Søn"];
  const result = {};
  openingHours.weekday_text.forEach((text, i) => {
    const parts = text.split(": ");
    result[days[i]] = parts[1] || "Stengt";
  });
  return result;
}

// ─── CLAUDE AI ───────────────────────────────────────────────────────────────

export async function fetchWebsiteContent(venue) {
  if (!venue.website) return null;
  try {
    const res = await fetch(`${SERVER}/crawl-venue?url=${encodeURIComponent(venue.website)}`);
    if (!res.ok) return null;
    const data = await res.json();
    return data.text || null;
  } catch { return null; }
}

export async function claudeScrapeEvents(venue, content) {
  try {
    const res = await fetch(`${SERVER}/claude/scrape-events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ venue, content })
    });
    const data = await res.json();
    let events = data.events || [];
    events = events.map((e) => ({
      ...e,
      id: `${venue.place_id}_${(e.title||'').toLowerCase().replace(/\s+/g,'_').slice(0,30)}_${(e.date||'').replace(/\s+/g,'')}`,
      venue_id: venue.place_id,
      league: e.league || null,
    }));
    return events;
  } catch { return []; }
}
