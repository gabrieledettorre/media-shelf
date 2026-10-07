import React, { useState } from "react";
import Icon from "./Icon.jsx";
import { categoryRequest } from "../lib/api.js";

export default function Settings({ categories, refresh, onClose }) {
  const [name, setName] = useState("");
  const [renaming, setRenaming] = useState(null);
  const [error, setError] = useState("");

  async function request(url, method, body) {
    await categoryRequest(url, method, body);
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
          <button className="close" onClick={onClose} aria-label="Chiudi">
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