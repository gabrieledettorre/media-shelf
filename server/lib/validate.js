import { db } from "../db.js";

const categoryExistsStmt = db.prepare("SELECT 1 FROM categories WHERE slug=?");

export function categoryExists(slug) {
  return categoryExistsStmt.get(slug);
}

export function clean(x) {
  return {
    title: String(x.title ?? "").trim(),
    type: String(x.type ?? ""),
    year:
      x.year === "" || x.year == null ? null : Number(x.year),
    cover: String(x.cover ?? "").trim(),
    interest: Math.max(1, Math.min(5, Number(x.interest) || 3)),
    where_to: String(x.where_to ?? "").trim(),
    link: String(x.link ?? "").trim(),
    notes: String(x.notes ?? "").trim(),
  };
}

export function valid(d) {
  return (
    d.title &&
    categoryExists(d.type) &&
    (d.year === null ||
      (Number.isInteger(d.year) && d.year >= 0 && d.year <= 9999)) &&
    (!d.link || /^https?:\/\//i.test(d.link)) &&
    (!d.cover || /^https?:\/\//i.test(d.cover) || /^data:image\//i.test(d.cover))
  );
}