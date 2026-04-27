# utBergen 🍺

> Dette prosjektet er primært et lærings- og testprosjekt, og er ikke utviklet med intensjon om lansering. Jeg har tidligere erfaring med andre AI-verktøy, men ønsket å utforske Claude (Anthropic) spesifikt – et verktøy jeg ikke hadde brukt før. utBergen ble derfor til som et konkret og realistisk prosjekt for å lære Claude å kjenne, forstå mulighetene den gir og teste hvor langt man kan komme med AI-assistert utvikling.

**Live:** [ut-bergen.vercel.app](https://ut-bergen.vercel.app)

---

## Hva er utBergen?

utBergen er en webapp som samler alle utesteder i Bergen på ett sted. Appen viser barer, puber, nattklubber og andre utestedstilbud i Bergen, med live informasjon om eventer, åpningstider og hva som skjer i kveld.

Brukeren kan:
- Se alle utesteder i Bergen med rating, adresse og åpningstider
- Filtrere på kategori (fotball, live musikk, quiz, cocktail, nattklubb osv.)
- Se hva som skjer **i kveld** øverst på siden
- Filtrere på **åpent nå**
- Se utesteder på kart
- Bla gjennom kommende eventer på tvers av alle steder
- Sende inn endringsforslag hvis noe er feil

---

## Teknologi

| Lag | Teknologi |
|---|---|
| Frontend | React (Vercel) |
| Backend/proxy | Node.js + Express (Railway) |
| Database | Supabase (PostgreSQL) |
| Kart | Google Maps JavaScript API |
| Stedsdata | Google Places API |
| AI-agent | Claude API (Anthropic) |
| Autentisering | Supabase Auth |

---

## Hvordan fungerer det?

### AI-pipeline
En automatisk pipeline kjøres daglig kl. 06:00 og gjør følgende:

1. **Google Places API** søker etter utesteder i Bergen med 18 ulike søkeord
2. **Open Graph-scraping** henter cover-bilder og beskrivelser fra utestedenes nettsider
3. **AI-agenten (Claude)** crawler nettsidene, følger relevante lenker og ekstraherer kommende eventer automatisk
4. Alt lagres i **Supabase**-databasen og er umiddelbart tilgjengelig i appen

### Admin-panel
Et skjult admin-panel lar administratorer redigere utestedsinformasjon, legge til event-URL-er og godkjenne endringsforslag fra brukere.

---

## Arkitektur

```
Bruker → Vercel (React)
              ↓
         Railway (Node.js proxy)
         ├── Google Places API
         ├── Claude AI (event-scraping)
         └── Supabase (database)
```

---

## Kjente begrensninger

- Bildekvaliteten varierer siden bilder hentes automatisk fra nettsider
- Event-informasjon er avhengig av at utestedene publiserer info på sine nettsider
- Datoformat fra AI-agenten kan variere

---

*Bygget med Claude AI · Google Places · Supabase · Bergen 2026*
