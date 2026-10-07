# Media Shelf
Wishlist personale per film, serie, libri, giochi e musica. Non è un tracker.

## Avvio locale (senza Docker)
Richiede Node.js 20 o successivo. Apri il terminale nella cartella ed esegui:

```sh
npm install
npm run dev
```

Apri http://localhost:5173. Il database SQLite viene creato in `data/media-shelf.db` e conserva gli elementi tra un avvio e l'altro.

Sono disponibili inserimento manuale, creazione, visualizzazione, modifica, eliminazione, ricerca per titolo/note/piattaforma, filtri per categoria e interesse, cover e link opzionali. La ricerca automatica è disponibile per libri (Open Library) e musica (MusicBrainz/Cover Art Archive); per film, serie e giochi i dati si possono inserire manualmente.

Il font Lyon Text OSF Web viene usato se installato localmente. È proprietario e non viene incluso; in caso contrario si usa Georgia. Remix Icons è caricato da CDN.

## Build e Docker (per un deploy futuro)
```sh
docker compose pull 
docker compose up -d 
```
Il server serve la build su http://localhost:3001. In Docker il database va mantenuto nel volume `./data`.
