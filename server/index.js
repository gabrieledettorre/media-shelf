import express from "express";
import Database from "better-sqlite3";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const dataDir = path.join(root, "data");
fs.mkdirSync(dataDir, { recursive: true });
const db = new Database(path.join(dataDir, "media-shelf.db"));
db.pragma("journal_mode = WAL");
db.exec(`
  CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE COLLATE NOCASE,
    slug TEXT NOT NULL UNIQUE,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS media (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    type TEXT NOT NULL,
    year INTEGER,
    cover TEXT NOT NULL DEFAULT '',
    interest INTEGER NOT NULL DEFAULT 3,
    where_to TEXT NOT NULL DEFAULT '',
    link TEXT NOT NULL DEFAULT '',
    notes TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
`);
const defaults = [["Film","movie"],["Serie","series"],["Libri","book"],["Giochi","game"],["Musica","music"]];
const insertCategory = db.prepare("INSERT OR IGNORE INTO categories(name,slug) VALUES(?,?)");
for (const c of defaults) insertCategory.run(...c);

const app = express();
app.use(express.json({limit:"2mb"}));
const slugify = s => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").trim().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"") || "categoria";
const getCategories = db.prepare(`
 SELECT c.id,c.name,c.slug,COUNT(m.id) AS count
 FROM categories c LEFT JOIN media m ON m.type=c.slug
 GROUP BY c.id ORDER BY c.name COLLATE NOCASE
`);
const categoryExists = slug => db.prepare("SELECT 1 FROM categories WHERE slug=?").get(slug);
const clean = x => ({
 title:String(x.title??"").trim(), type:String(x.type??""),
 year:x.year===""||x.year==null?null:Number(x.year),
 cover:String(x.cover??"").trim(), interest:Math.max(1,Math.min(5,Number(x.interest)||3)),
 where_to:String(x.where_to??"").trim(), link:String(x.link??"").trim(), notes:String(x.notes??"").trim()
});
const valid = d => d.title && categoryExists(d.type) &&
 (d.year===null||(Number.isInteger(d.year)&&d.year>=0&&d.year<=9999)) &&
 (!d.link||/^https?:\/\//i.test(d.link)) && (!d.cover||/^https?:\/\//i.test(d.cover));

app.get("/api/health",(_req,res)=>res.json({ok:true}));
app.get("/api/categories",(_req,res)=>res.json(getCategories.all()));
app.post("/api/categories",(req,res)=>{
 const name=String(req.body.name??"").trim();
 if(!name) return res.status(400).json({error:"Inserisci il nome della categoria."});
 let slug=slugify(name), base=slug, n=2;
 while(categoryExists(slug)){slug=`${base}-${n++}`;}
 try {
  const result=db.prepare("INSERT INTO categories(name,slug) VALUES(?,?)").run(name,slug);
  res.status(201).json(db.prepare("SELECT id,name,slug,0 AS count FROM categories WHERE id=?").get(result.lastInsertRowid));
 } catch { res.status(400).json({error:"Categoria già esistente."}); }
});
app.put("/api/categories/:id",(req,res)=>{
 const name=String(req.body.name??"").trim();
 if(!name) return res.status(400).json({error:"Il nome non può essere vuoto."});
 const old=db.prepare("SELECT * FROM categories WHERE id=?").get(Number(req.params.id));
 if(!old) return res.status(404).json({error:"Categoria non trovata."});
 try {
  db.prepare("UPDATE categories SET name=? WHERE id=?").run(name,old.id);
  res.json(db.prepare("SELECT id,name,slug,(SELECT COUNT(*) FROM media WHERE type=categories.slug) AS count FROM categories WHERE id=?").get(old.id));
 } catch { res.status(400).json({error:"Esiste già una categoria con questo nome."}); }
});
app.delete("/api/categories/:id",(req,res)=>{
 const cat=db.prepare("SELECT * FROM categories WHERE id=?").get(Number(req.params.id));
 if(!cat) return res.status(404).json({error:"Categoria non trovata."});
 const count=db.prepare("SELECT COUNT(*) AS n FROM media WHERE type=?").get(cat.slug).n;
 if(count) return res.status(409).json({error:"La categoria contiene elementi. Spostali o eliminali prima di rimuoverla."});
 db.prepare("DELETE FROM categories WHERE id=?").run(cat.id);
 res.status(204).end();
});
app.get("/api/media",(req,res)=>{
 const q=String(req.query.q??"").trim(), type=String(req.query.type??"all"), interest=String(req.query.interest??"all");
 const sort=String(req.query.sort??"interest-desc");
 let sql="SELECT * FROM media WHERE 1=1", args=[];
 if(q){sql+=" AND (title LIKE ? OR notes LIKE ? OR where_to LIKE ?)";const l=`%${q}%`;args.push(l,l,l);}
 if(type!=="all"&&categoryExists(type)){sql+=" AND type=?";args.push(type);}
 if(/^[1-5]$/.test(interest)){sql+=" AND interest=?";args.push(Number(interest));}
 const order={
  "interest-desc":"interest DESC, updated_at DESC, id DESC",
  "interest-asc":"interest ASC, updated_at DESC, id DESC",
  "title-asc":"title COLLATE NOCASE ASC",
  "title-desc":"title COLLATE NOCASE DESC",
  "newest":"created_at DESC, id DESC",
  "oldest":"created_at ASC, id ASC"
 }[sort]||"interest DESC, updated_at DESC, id DESC";
 sql+=` ORDER BY ${order}`;
 res.json(db.prepare(sql).all(...args));
});
app.get("/api/media/:id",(req,res)=>{
 const item=db.prepare("SELECT * FROM media WHERE id=?").get(Number(req.params.id));
 if(!item)return res.status(404).json({error:"Elemento non trovato"});
 res.json(item);
});
app.post("/api/media",(req,res)=>{
 const d=clean(req.body);
 if(!valid(d))return res.status(400).json({error:"Titolo e categoria sono obbligatori. Controlla anno, cover e link."});
 const r=db.prepare("INSERT INTO media(title,type,year,cover,interest,where_to,link,notes) VALUES(@title,@type,@year,@cover,@interest,@where_to,@link,@notes)").run(d);
 res.status(201).json(db.prepare("SELECT * FROM media WHERE id=?").get(r.lastInsertRowid));
});
app.put("/api/media/:id",(req,res)=>{
 const d=clean(req.body);
 if(!valid(d))return res.status(400).json({error:"Titolo e categoria sono obbligatori. Controlla anno, cover e link."});
 const r=db.prepare("UPDATE media SET title=@title,type=@type,year=@year,cover=@cover,interest=@interest,where_to=@where_to,link=@link,notes=@notes,updated_at=CURRENT_TIMESTAMP WHERE id=@id").run({...d,id:Number(req.params.id)});
 if(!r.changes)return res.status(404).json({error:"Elemento non trovato"});
 res.json(db.prepare("SELECT * FROM media WHERE id=?").get(Number(req.params.id)));
});
app.delete("/api/media/:id",(req,res)=>{
 const r=db.prepare("DELETE FROM media WHERE id=?").run(Number(req.params.id));
 if(!r.changes)return res.status(404).json({error:"Elemento non trovato"});
 res.status(204).end();
});
app.get("/api/lookup",async(req,res)=>{
 const q=String(req.query.q??"").trim(), type=String(req.query.type??"");
 if(!q)return res.json([]);
 try {
  if(type==="book"){
   const r=await fetch(`https://openlibrary.org/search.json?q=${encodeURIComponent(q)}&limit=10`);
   if(!r.ok)throw Error();
   const j=await r.json();
   return res.json((j.docs??[]).map(x=>({title:x.title??"",year:x.first_publish_year??null,creator:(x.author_name??[]).slice(0,2).join(", "),cover:x.cover_i?`https://covers.openlibrary.org/b/id/${x.cover_i}-L.jpg`:""})));
  }
  if(type==="music"){
   const r=await fetch(`https://musicbrainz.org/ws/2/release/?query=${encodeURIComponent(q)}&fmt=json&limit=10`,{headers:{"User-Agent":"MediaShelf/1.1 (personal local catalog)"}});
   if(!r.ok)throw Error();
   const j=await r.json();
   return res.json((j.releases??[]).map(x=>({title:x.title??"",year:x.date?Number(x.date.slice(0,4))||null:null,creator:(x["artist-credit"]??[]).map(a=>a.name).join(", "),cover:x.id?`https://coverartarchive.org/release/${x.id}/front-500`:""})));
  }
  if(type==="movie"||type==="series"){
   const key=String(process.env.TMDB_API_KEY??"").trim();
   if(!key)return res.status(400).json({error:"Per cercare film e serie imposta TMDB_API_KEY. Puoi comunque inserire la scheda manualmente."});
   const endpoint=type==="movie"?"movie":"tv";
   const r=await fetch(`https://api.themoviedb.org/3/search/${endpoint}?api_key=${encodeURIComponent(key)}&query=${encodeURIComponent(q)}&include_adult=false&language=it-IT`);
   if(!r.ok)throw Error();
   const j=await r.json();
   return res.json((j.results??[]).slice(0,10).map(x=>({title:x.title??x.name??"",year:Number((x.release_date??x.first_air_date??"").slice(0,4))||null,creator:"",cover:x.poster_path?`https://image.tmdb.org/t/p/w500${x.poster_path}`:""})));
  }
  if(type==="game")return res.status(400).json({error:"La ricerca automatica dei giochi non è configurata. Puoi inserire titolo e copertina manualmente."});
  res.json([]);
 } catch { res.status(502).json({error:"Ricerca non disponibile in questo momento. Puoi compilare la scheda manualmente."}); }
});
const dist=path.join(root,"dist");
if(fs.existsSync(dist)){app.use(express.static(dist));app.get("*",(_req,res)=>res.sendFile(path.join(dist,"index.html")));}
app.listen(Number(process.env.PORT||3001),"0.0.0.0",()=>console.log("Media Shelf API su http://localhost:3001"));
