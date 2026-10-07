export async function getCategories() {
  const r = await fetch("/api/categories");
  if (!r.ok) throw new Error("Impossibile caricare le categorie");
  return r.json();
}

export async function getMedia({ q, type, interest, sort }) {
  const p = new URLSearchParams({ q, type, interest, sort });
  const r = await fetch(`/api/media?${p}`);
  if (!r.ok) throw new Error("Impossibile caricare la lista");
  return r.json();
}

export async function createMedia(data) {
  const r = await fetch("/api/media", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!r.ok) {
    const e = await r.json().catch(() => ({}));
    throw new Error(e.error || "Errore durante il salvataggio");
  }
  return r.json();
}

export async function updateMedia(id, data) {
  const r = await fetch(`/api/media/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!r.ok) {
    const e = await r.json().catch(() => ({}));
    throw new Error(e.error || "Errore durante il salvataggio");
  }
  return r.json();
}

export async function deleteMedia(id) {
  const r = await fetch(`/api/media/${id}`, { method: "DELETE" });
  if (!r.ok) throw new Error("Impossibile eliminare l'elemento");
}

export async function previewUrl(url) {
  const r = await fetch(`/api/preview?url=${encodeURIComponent(url)}`);
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(d.error || "Anteprima non disponibile");
  return d;
}

export async function categoryRequest(url, method, body) {
  const r = await fetch(url, {
    method,
    headers: { "Content-Type": "application/json" },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  if (!r.ok) {
    const d = await r.json().catch(() => ({}));
    throw new Error(d.error || "Operazione non riuscita");
  }
}