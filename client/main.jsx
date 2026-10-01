import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import "./style.css";

const initial = {
  title: "",
  type: "movie",
  year: "",
  cover: "",
  interest: 3,
  where_to: "",
  link: "",
  notes: "",
};

const icons = {
  movie: "clapperboard-line",
  series: "tv-line",
  book: "book-2-line",
  game: "gamepad-line",
  music: "music-2-line",
};

function Icon({ name, size = 18 }) {
  return (
    <i
      className={`ri-${name}`}
      style={{ fontSize: size }}
      aria-hidden="true"
    />
  );
}

function App() {
  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [query, setQuery] = useState("");
  const [type, setType] = useState("all");
  const [interest, setInterest] = useState("all");
  const [sort, setSort] = useState("interest-desc");
  const [editor, setEditor] = useState(null);
  const [settings, setSettings] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadCategories() {
    const r = await fetch("/api/categories");
    if (r.ok) setCategories(await r.json());
  }

  async function load() {
    setLoading(true);
    try {
      const p = new URLSearchParams({ q: query, type, interest, sort });
      const r = await fetch(`/api/media?${p}`);
      if (!r.ok) throw Error("Impossibile caricare la lista");
      setItems(await r.json());
      setError("");
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadCategories();
  }, []);

  useEffect(() => {
    load();
  }, [query, type, interest, sort]);

  async function save(data) {
    const edit = Boolean(data.id);
    const r = await fetch(edit ? `/api/media/${data.id}` : "/api/media", {
      method: edit ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (!r.ok) {
      const e = await r.json().catch(() => ({}));
      throw Error(e.error || "Errore durante il salvataggio");
    }

    setEditor(null);
    await Promise.all([load(), loadCategories()]);
  }

  async function remove(item) {
    if (!confirm(`Vuoi eliminare “${item.title}”?`)) return;
    const r = await fetch(`/api/media/${item.id}`, { method: "DELETE" });
    if (!r.ok) {
      setError("Impossibile eliminare l'elemento");
      return;
    }
    await Promise.all([load(), loadCategories()]);
  }

  const visibleCats = categories.filter((c) => c.count > 0);

  useEffect(() => {
    if (type !== "all" && !visibleCats.some((c) => c.slug === type)) {
      setType("all");
    }
  }, [categories]);

  return (
    <div className="shell">
      <header className="topbar">
        <a className="brand" href="/">
          <span className="brand-icon">
            <Icon name="stack-line" size={21} />
          </span>
          <span>
            <b>Media Shelf</b>
            <small>Il tuo scaffale personale</small>
          </span>
        </a>
        <div className="top-actions">
          <button
            className="button outline settings-button"
            onClick={() => setSettings(true)}
          >
            <Icon name="settings-3-line" /> <span>Impostazioni</span>
          </button>
          <button
            className="button dark"
            onClick={() => setEditor({ ...initial })}
          >
            <Icon name="add-line" /> Aggiungi
          </button>
        </div>
      </header>

      <main>
        <section className="heading">
          <div>
            <h1>Cosa ti va oggi?</h1>
          </div>
          <span className="count">
            {items.length} {items.length === 1 ? "elemento" : "elementi"}
          </span>
        </section>

        <section className="controls">
  <label className="search">
    <Icon name="search-line" size={19} />
    <input
      value={query}
      onChange={(e) => setQuery(e.target.value)}
      placeholder="Cerca nella tua lista..."
    />
    {query && (
      <button
        className="clear"
        onClick={() => setQuery("")}
        aria-label="Pulisci ricerca"
      >
        <Icon name="close-line" />
      </button>
    )}
  </label>

  <div className="tabs">
    <button
      className={type === "all" ? "tab selected" : "tab"}
      onClick={() => setType("all")}
    >
      Tutto
    </button>

    {visibleCats.map((c) => (
      <button
        key={c.id}
        className={type === c.slug ? "tab selected" : "tab"}
        onClick={() => setType(c.slug)}
      >
        {c.name}
      </button>
    ))}
  </div>

  <details className="filter-menu">
    <summary aria-label="Filtri" title="Filtri">
      <Icon name="filter-3-line" />
    </summary>

    <div className="filter-dropdown">
      <label className="filter-field">
        <span>Interesse</span>
        <select
          value={interest}
          onChange={(e) => setInterest(e.target.value)}
        >
          <option value="all">Tutti</option>
          {[5, 4, 3, 2, 1].map((n) => (
            <option key={n} value={n}>
              {"★".repeat(n)}
              {"☆".repeat(5 - n)}
            </option>
          ))}
        </select>
      </label>

      <label className="filter-field">
        <span>Ordina</span>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value)}
        >
          <option value="interest-desc">Più interessanti</option>
          <option value="interest-asc">Meno interessanti</option>
          <option value="newest">Aggiunti di recente</option>
          <option value="oldest">Aggiunti per primi</option>
          <option value="title-asc">Titolo A–Z</option>
          <option value="title-desc">Titolo Z–A</option>
        </select>
      </label>
    </div>
  </details>
</section>

        {error && (
          <div className="error">
            <Icon name="error-warning-line" />
            {error}
          </div>
        )}

        {loading ? (
          <div className="empty">Caricamento...</div>
        ) : items.length ? (
          <section className="grid">
            {items.map((item) => (
              <Card
                key={item.id}
                item={item}
                categories={categories}
                onEdit={() =>
                  setEditor({ ...item, year: item.year ?? "" })
                }
                onDelete={() => remove(item)}
              />
            ))}
          </section>
        ) : (
          <section className="empty">
            <div className="empty-icon">
              <Icon name="archive-line" size={26} />
            </div>
            <h2>
              {categories.length && !visibleCats.length
                ? "Lo scaffale è vuoto"
                : "Nessun elemento trovato"}
            </h2>
            <p>Aggiungi qualcosa o modifica i filtri.</p>
            <button
              className="button outline"
              onClick={() => setEditor({ ...initial })}
            >
              <Icon name="add-line" /> Aggiungi un elemento
            </button>
          </section>
        )}
      </main>

      {editor && (
        <Editor
          item={editor}
          categories={categories}
          onClose={() => setEditor(null)}
          onSave={save}
        />
      )}

      {settings && (
        <Settings
          categories={categories}
          refresh={loadCategories}
          onClose={() => setSettings(false)}
        />
      )}
    </div>
  );
}

function Card({ item, onEdit, onDelete, categories = [] }) {
  const category = categories.find((c) => c.slug === item.type);
  const palette = [
    ["#e9efff", "#405da8"],
    ["#f7e8ed", "#9b4965"],
    ["#e7f2e9", "#39744a"],
    ["#fff0d9", "#98631e"],
    ["#eee8fa", "#7252a3"],
    ["#e2f1f1", "#35777a"],
  ];
  const colors = palette[(category?.id ?? 0) % palette.length];

  return (
    <article className="item">
      <div className="art">
        {item.cover ? (
          <img
            src={item.cover}
            alt={`Copertina di ${item.title}`}
            onError={(e) => {
              e.currentTarget.style.display = "none";
              e.currentTarget.nextSibling.style.display = "grid";
            }}
          />
        ) : null}
        <div
          className="art-placeholder"
          style={{ display: item.cover ? "none" : "grid" }}
        >
          <Icon name="image-line" size={28} />
        </div>
        <span
          className="type-pill"
          style={{ background: colors[0], color: colors[1] }}
        >
          <Icon
            name={icons[item.type] || "bookmark-line"}
            size={12}
          />
          {category?.name || item.category_name || item.type_name || item.type}
        </span>
        <div className="actions">
          <button title="Modifica" aria-label="Modifica" onClick={onEdit}>
            <Icon name="edit-line" />
          </button>
          <button title="Elimina" aria-label="Elimina" onClick={onDelete}>
            <Icon name="delete-bin-6-line" />
          </button>
        </div>
      </div>

      <div className="item-info">
        
        <h2>{item.title}</h2>
        <div className="subline">
          {item.year || ""}
          {item.where_to && (
            <>
              <span className="dot">·</span>
              <span className="where">
                <Icon name="map-pin-2-line" />
                {item.where_to}
              </span>
            </>
          )}
        </div>
        <div className="item-bottom">
          <span
            className="stars"
            aria-label={`Interesse ${item.interest} su 5`}
          >
            {"★".repeat(item.interest)}
            <span>{"☆".repeat(5 - item.interest)}</span>
          </span>
          {item.link && (
            <a
              href={item.link}
              target="_blank"
              rel="noreferrer"
              aria-label="Apri link"
              title="Apri link"
            >
              <Icon name="external-link-line" />
            </a>
          )}
        </div>
        {item.notes && <p className="notes">{item.notes}</p>}
      </div>
    </article>
  );
}

function Editor({ item, categories, onClose, onSave }) {
  const [form, setForm] = useState(item);
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const set = (k, v) => setForm((old) => ({ ...old, [k]: v }));

  async function lookup() {
    if (!form.title.trim()) {
      setError("Inserisci prima un titolo.");
      return;
    }
    setSearching(true);
    setError("");
    setResults([]);
    try {
      const r = await fetch(
        `/api/lookup?type=${encodeURIComponent(
          form.type
        )}&q=${encodeURIComponent(form.title)}`
      );
      const d = await r.json();
      if (!r.ok) throw Error(d.error || "Ricerca non disponibile");
      setResults(d);
      if (!d.length)
        setError("Nessun risultato. Puoi compilare i campi manualmente.");
    } catch (e) {
      setError(e.message);
    } finally {
      setSearching(false);
    }
  }

  function choose(r) {
    setForm((old) => ({
      ...old,
      title: r.title || old.title,
      year: r.year || "",
      cover: r.cover || old.cover,
    }));
    setResults([]);
  }

  async function submit(e) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      await onSave({
        ...form,
        year: form.year === "" ? null : Number(form.year),
        interest: Number(form.interest),
      });
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="overlay"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <form className="dialog" onSubmit={submit}>
        <div className="dialog-head">
          <div>
            <div className="eyebrow">SCHEDA</div>
            <h2>{form.id ? "Modifica elemento" : "Aggiungi allo scaffale"}</h2>
          </div>
          <button
            type="button"
            className="close"
            onClick={onClose}
            aria-label="Chiudi"
          >
            <Icon name="close-line" size={22} />
          </button>
        </div>

        <div className="form-body">
          <div className="field-row">
            <label className="field grow">
              <span>
                Titolo <b>*</b>
              </span>
              <input
                required
                autoFocus
                value={form.title}
                onChange={(e) => set("title", e.target.value)}
                placeholder="Titolo"
              />
            </label>
            <label className="field type-field">
              <span>Categoria</span>
              <select
                value={form.type}
                onChange={(e) => {
                  set("type", e.target.value);
                  setResults([]);
                }}
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.slug}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="lookup-row">
            <button
              type="button"
              className="button outline small"
              onClick={lookup}
              disabled={searching}
            >
              <Icon name="search-line" />
              {searching ? "Ricerca..." : "Cerca titolo e copertina"}
            </button>
            <span className="lookup-hint">
              {["book", "music"].includes(form.type)
                ? "Ricerca gratuita"
                : ["movie", "series"].includes(form.type)
                ? "Richiede una chiave TMDB"
                : "Inserimento manuale"}
            </span>
          </div>

          {results.length > 0 && (
            <div className="results">
              {results.map((r, i) => (
                <button
                  type="button"
                  className="result"
                  key={`${r.title}-${i}`}
                  onClick={() => choose(r)}
                >
                  {r.cover ? (
                    <img src={r.cover} alt="" />
                  ) : (
                    <span className="result-placeholder">
                      <Icon name="image-line" />
                    </span>
                  )}
                  <span>
                    <b>{r.title}</b>
                    <small>
                      {r.creator}
                      {r.year ? ` · ${r.year}` : ""}
                    </small>
                  </span>
                  <Icon name="add-line" />
                </button>
              ))}
            </div>
          )}

          <div className="field-row">
            <label className="field year-field">
              <span>Anno</span>
              <input
                type="number"
                min="0"
                max="9999"
                value={form.year}
                onChange={(e) => set("year", e.target.value)}
                placeholder="2026"
              />
            </label>
            <label className="field grow">
              <span>URL copertina</span>
              <input
                type="url"
                value={form.cover}
                onChange={(e) => set("cover", e.target.value)}
                placeholder="https://..."
              />
            </label>
          </div>

          <div className="interest-panel">
            <div>
              <b>Interesse</b>
              <small>Quanto ti va di recuperarlo?</small>
            </div>
            <div className="star-picker">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  type="button"
                  key={n}
                  className={n <= Number(form.interest) ? "on" : ""}
                  onClick={() => set("interest", n)}
                  aria-label={`${n} su 5`}
                >
                  ★
                </button>
              ))}
            </div>
          </div>

          <div className="field-row">
            <label className="field grow">
              <span>Dove lo trovo?</span>
              <input
                value={form.where_to}
                onChange={(e) => set("where_to", e.target.value)}
                placeholder="Netflix, Steam, biblioteca..."
              />
            </label>
            <label className="field grow">
              <span>Link</span>
              <input
                type="url"
                value={form.link}
                onChange={(e) => set("link", e.target.value)}
                placeholder="https://..."
              />
            </label>
          </div>

          <label className="field">
            <span>Note</span>
            <textarea
              rows="3"
              value={form.notes}
              onChange={(e) => set("notes", e.target.value)}
              placeholder="Un dettaglio da ricordare..."
            />
          </label>

          {error && (
            <p className="form-error">
              <Icon name="error-warning-line" />
              {error}
            </p>
          )}
        </div>

        <div className="dialog-foot">
          <span className="db-note">
            
          </span>
          <div>
            <button
              type="button"
              className="button outline"
              onClick={onClose}
            >
              Annulla
            </button>
            <button className="button dark" disabled={saving}>
              {saving ? "Salvataggio..." : "Salva"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

function Settings({ categories, refresh, onClose }) {
  const [name, setName] = useState("");
  const [renaming, setRenaming] = useState(null);
  const [error, setError] = useState("");

  async function request(url, method, body) {
    const r = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    if (!r.ok) {
      const d = await r.json().catch(() => ({}));
      throw Error(d.error || "Operazione non riuscita");
    }
    await refresh();
    setError("");
  }

  async function add(e) {
    e.preventDefault();
    try {
      await request("/api/categories", "POST", { name });
      setName("");
    } catch (e) {
      setError(e.message);
    }
  }

  async function rename(id, value) {
    try {
      await request(`/api/categories/${id}`, "PUT", { name: value });
      setRenaming(null);
    } catch (e) {
      setError(e.message);
    }
  }

  async function del(c) {
    if (!confirm(`Eliminare la categoria “${c.name}”?`)) return;
    try {
      await request(`/api/categories/${c.id}`, "DELETE");
    } catch (e) {
      setError(e.message);
    }
  }

  return (
    <div
      className="overlay"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <section className="dialog settings-dialog">
        <div className="dialog-head">
          <div>
            
            <h2>Impostazioni</h2>
          </div>
          <button
            className="close"
            onClick={onClose}
            aria-label="Chiudi"
          >
            <Icon name="close-line" size={22} />
          </button>
        </div>

        <div className="form-body">
          <div>
            <h3 className="settings-title">Categorie</h3>
            <p className="settings-copy">
              Aggiungi o rinomina le categorie del tuo scaffale. Nel menu
              appariranno solo quelle che contengono elementi.
            </p>
          </div>

          <form className="add-category" onSubmit={add}>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nuova categoria"
              aria-label="Nuova categoria"
            />
            <button className="button dark">
              <Icon name="add-line" /> Aggiungi
            </button>
          </form>

          <div className="category-list">
            {categories.map((c) => (
              <div className="category-row" key={c.id}>
                {renaming?.id === c.id ? (
                  <form
                    className="rename-form"
                    onSubmit={(e) => {
                      e.preventDefault();
                      rename(c.id, renaming.name);
                    }}
                  >
                    <input
                      autoFocus
                      value={renaming.name}
                      onChange={(e) =>
                        setRenaming({ ...renaming, name: e.target.value })
                      }
                    />
                    <button className="icon-action" title="Salva">
                      <Icon name="check-line" />
                    </button>
                    <button
                      type="button"
                      className="icon-action"
                      onClick={() => setRenaming(null)}
                      title="Annulla"
                    >
                      <Icon name="close-line" />
                    </button>
                  </form>
                ) : (
                  <>
                    <span className="category-name">{c.name}</span>
                    <span className="category-count">
                      {c.count} {c.count === 1 ? "elemento" : "elementi"}
                    </span>
                    <button
                      className="icon-action"
                      onClick={() => setRenaming({ id: c.id, name: c.name })}
                      title="Rinomina"
                    >
                      <Icon name="edit-line" />
                    </button>
                    <button
                      className="icon-action"
                      onClick={() => del(c)}
                      title="Elimina"
                      disabled={c.count > 0}
                    >
                      <Icon name="delete-bin-6-line" />
                    </button>
                  </>
                )}
              </div>
            ))}
          </div>

          {error && (
            <p className="form-error">
              <Icon name="error-warning-line" />
              {error}
            </p>
          )}
        </div>

        <div className="dialog-foot">
          <span></span>
          <div>
            <button className="button dark" onClick={onClose}>
              Fine
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}

createRoot(document.getElementById("root")).render(<App />);