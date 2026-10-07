import { Router } from "express";
import { db } from "../db.js";
import { slugify } from "../lib/slugify.js";
import { categoryExists } from "../lib/validate.js";

const router = Router();

const getCategories = db.prepare(`
 SELECT c.id,c.name,c.slug,COUNT(m.id) AS count
 FROM categories c LEFT JOIN media m ON m.type=c.slug
 GROUP BY c.id ORDER BY c.name COLLATE NOCASE
`);

router.get("/", (_req, res) => res.json(getCategories.all()));

router.post("/", (req, res) => {
  const name = String(req.body.name ?? "").trim();
  if (!name)
    return res.status(400).json({ error: "Inserisci il nome della categoria." });
  let slug = slugify(name);
  const base = slug;
  let n = 2;
  while (categoryExists(slug)) {
    slug = `${base}-${n++}`;
  }
  try {
    const result = db
      .prepare("INSERT INTO categories(name,slug) VALUES(?,?)")
      .run(name, slug);
    res
      .status(201)
      .json(
        db
          .prepare(
            "SELECT id,name,slug,0 AS count FROM categories WHERE id=?"
          )
          .get(result.lastInsertRowid)
      );
  } catch {
    res.status(400).json({ error: "Categoria già esistente." });
  }
});

router.put("/:id", (req, res) => {
  const name = String(req.body.name ?? "").trim();
  if (!name)
    return res.status(400).json({ error: "Il nome non può essere vuoto." });
  const old = db
    .prepare("SELECT * FROM categories WHERE id=?")
    .get(Number(req.params.id));
  if (!old) return res.status(404).json({ error: "Categoria non trovata." });
  try {
    db.prepare("UPDATE categories SET name=? WHERE id=?").run(name, old.id);
    res.json(
      db
        .prepare(
          "SELECT id,name,slug,(SELECT COUNT(*) FROM media WHERE type=categories.slug) AS count FROM categories WHERE id=?"
        )
        .get(old.id)
    );
  } catch {
    res
      .status(400)
      .json({ error: "Esiste già una categoria con questo nome." });
  }
});

router.delete("/:id", (req, res) => {
  const cat = db
    .prepare("SELECT * FROM categories WHERE id=?")
    .get(Number(req.params.id));
  if (!cat) return res.status(404).json({ error: "Categoria non trovata." });
  const count = db
    .prepare("SELECT COUNT(*) AS n FROM media WHERE type=?")
    .get(cat.slug).n;
  if (count)
    return res.status(409).json({
      error:
        "La categoria contiene elementi. Spostali o eliminali prima di rimuoverla.",
    });
  db.prepare("DELETE FROM categories WHERE id=?").run(cat.id);
  res.status(204).end();
});

export default router;