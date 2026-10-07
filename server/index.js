import express from "express";
import fs from "node:fs";
import path from "node:path";
import "./db.js";
import { root } from "./db.js";
import categoriesRouter from "./routes/categories.js";
import mediaRouter from "./routes/media.js";
import previewRouter from "./routes/preview.js";

const app = express();
app.use(express.json({ limit: "2mb" }));

app.get("/api/health", (_req, res) => res.json({ ok: true }));
app.use("/api/categories", categoriesRouter);
app.use("/api/media", mediaRouter);
app.use("/api/preview", previewRouter);

const dist = path.join(root, "dist");
if (fs.existsSync(dist)) {
  app.use(express.static(dist));
  app.get("/*splat", (_req, res) => res.sendFile(path.join(dist, "index.html")));
}

app.listen(Number(process.env.PORT || 3001), "0.0.0.0", () =>
  console.log("Media Shelf API su http://localhost:3001")
);