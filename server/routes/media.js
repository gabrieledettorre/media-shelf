import { Router } from "express";
import { db } from "../db.js";
import { categoryExists, clean, valid } from "../lib/validate.js";

const router = Router();

router.get("/", (req, res) => {
  const q = String(req.query.q ?? "").trim();
  const type = String(req.query.type ?? "all");
  const interest = String(req.query.interest ?? "all");
  const sort = String(req.query.sort ?? "interest-desc");

  let sql = "SELECT * FROM media WHERE 1=1";
  const args = [];

  if (q) {
    sql += " AND (title LIKE ? OR notes LIKE ? OR where_to LIKE ?)";
    const l = `%${q}%`;
    args.push(l, l, l);
  }
  if (type !== "all" && categoryExists(type)) {
    sql += " AND type=?";
    args.push(type);
  }
  if (/^[1-5]$/.test(interest)) {
    sql += " AND interest=?";
    args.push(Number(interest));
  }

  const order =
    {
      "interest-desc": "interest DESC, updated_at DESC, id DESC",
      "interest-asc": "interest ASC, updated_at DESC, id DESC",
      "title-asc": "title COLLATE NOCASE ASC",
      "title-desc": "title COLLATE NOCASE DESC",
      newest: "created_at DESC, id DESC",
      oldest: "created_at ASC, id ASC",
    }[sort] || "interest DESC, updated_at DESC, id DESC";

  sql += ` ORDER BY ${order}`;
  res.json(db.prepare(sql).all(...args));
});

router.get("/:id", (req, res) => {
  const item = db
    .prepare("SELECT * FROM media WHERE id=?")
    .get(Number(req.params.id));
  if (!item) return res.status(404).json({ error: "Elemento non trovato" });
  res.json(item);
});

router.post("/", (req, res) => {
  const d = clean(req.body);
  if (!valid(d))
    return res.status(400).json({
      error: "Titolo e categoria sono obbligatori. Controlla cover e link.",
    });
  const r = db
    .prepare(
      "INSERT INTO media(title,type,cover,interest,where_to,link,notes) VALUES(@title,@type,@cover,@interest,@where_to,@link,@notes)"
    )
    .run(d);
  res
    .status(201)
    .json(db.prepare("SELECT * FROM media WHERE id=?").get(r.lastInsertRowid));
});

router.put("/:id", (req, res) => {
  const d = clean(req.body);
  if (!valid(d))
    return res.status(400).json({
      error: "Titolo e categoria sono obbligatori. Controlla cover e link.",
    });
  const r = db
    .prepare(
      "UPDATE media SET title=@title,type=@type,cover=@cover,interest=@interest,where_to=@where_to,link=@link,notes=@notes,updated_at=CURRENT_TIMESTAMP WHERE id=@id"
    )
    .run({ ...d, id: Number(req.params.id) });
  if (!r.changes)
    return res.status(404).json({ error: "Elemento non trovato" });
  res.json(db.prepare("SELECT * FROM media WHERE id=?").get(Number(req.params.id)));
});

router.delete("/:id", (req, res) => {
  const r = db
    .prepare("DELETE FROM media WHERE id=?")
    .run(Number(req.params.id));
  if (!r.changes)
    return res.status(404).json({ error: "Elemento non trovato" });
  res.status(204).end();
});

export default router;