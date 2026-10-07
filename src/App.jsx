import React, { useEffect, useState } from "react";
import Icon from "./components/Icon.jsx";
import Card from "./components/Card.jsx";
import Editor from "./components/Editor.jsx";
import Settings from "./components/Settings.jsx";
import { initial } from "./lib/constants.js";
import {
  getCategories,
  getMedia,
  createMedia,
  updateMedia,
  deleteMedia,
} from "./lib/api.js";

export default function App() {
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
    try {
      setCategories(await getCategories());
    } catch {
      /* silenzioso */
    }
  }

  async function load() {
    setLoading(true);
    try {
      setItems(await getMedia({ q: query, type, interest, sort }));
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, type, interest, sort]);

  async function save(data) {
    if (data.id) await updateMedia(data.id, data);
    else await createMedia(data);
    setEditor(null);
    await Promise.all([load(), loadCategories()]);
  }

  async function remove(item) {
    if (!confirm(`Vuoi eliminare “${item.title}”?`)) return;
    try {
      await deleteMedia(item.id);
      await Promise.all([load(), loadCategories()]);
    } catch {
      setError("Impossibile eliminare l'elemento");
    }
  }

  const visibleCats = categories.filter((c) => c.count > 0);

  useEffect(() => {
    if (type !== "all" && !visibleCats.some((c) => c.slug === type)) {
      setType("all");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
                onEdit={() => setEditor({ ...item })}
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