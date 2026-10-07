import React, { useEffect, useRef, useState } from "react";
import Icon from "./Icon.jsx";
import { previewUrl } from "../lib/api.js";

export default function Editor({ item, categories, onClose, onSave }) {
  const [form, setForm] = useState(item);
  const [previewing, setPreviewing] = useState(false);
  const [previewMsg, setPreviewMsg] = useState("");
  const [previewErr, setPreviewErr] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const set = (k, v) => setForm((old) => ({ ...old, [k]: v }));

  const lastPreviewed = useRef("");
  const pasteTimer = useRef(null);

  async function runPreview(url, { silentIfAlreadyTried = true } = {}) {
    const cleanUrl = (url || "").trim();
    if (!cleanUrl) {
      setPreviewMsg("Incolla prima un link.");
      setPreviewErr(true);
      return;
    }
    if (silentIfAlreadyTried && lastPreviewed.current === cleanUrl) return;
    lastPreviewed.current = cleanUrl;

    setPreviewing(true);
    setPreviewMsg("");
    setPreviewErr(false);
    try {
      const d = await previewUrl(cleanUrl);

      const updates = {};
      if (!form.title.trim() && d.title) updates.title = d.title;
      if (!form.cover.trim() && d.cover) updates.cover = d.cover;

      if (Object.keys(updates).length) {
        setForm((old) => ({ ...old, ...updates }));
        const got = [];
        if (updates.title) got.push("titolo");
        if (updates.cover) got.push("copertina");
        setPreviewMsg(`Ho preso ${got.join(" e ")} dal link.`);
        setPreviewErr(false);
      } else if (d.warning) {
        setPreviewMsg(d.warning);
        setPreviewErr(true);
      } else {
        setPreviewMsg(
          "Il link non ha fornito nulla di nuovo (i campi erano già pieni)."
        );
        setPreviewErr(false);
      }
    } catch (e) {
      setPreviewMsg(e.message);
      setPreviewErr(true);
    } finally {
      setPreviewing(false);
    }
  }

  useEffect(() => {
    const url = (form.link || "").trim();
    if (!/^https?:\/\//i.test(url)) return;
    if (pasteTimer.current) clearTimeout(pasteTimer.current);
    pasteTimer.current = setTimeout(() => {
      runPreview(url);
    }, 600);
    return () => {
      if (pasteTimer.current) clearTimeout(pasteTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.link]);

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
      <form className="dialog editor-dialog" onSubmit={submit}>
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

        <div className="editor-body">
          <aside className="editor-cover">
            <div className="cover-frame">
              {form.cover ? (
                <img
                  src={form.cover}
                  alt="Anteprima copertina"
                  onError={(e) => {
                    e.currentTarget.style.display = "none";
                    e.currentTarget.nextSibling.style.display = "grid";
                  }}
                />
              ) : null}
              <div
                className="cover-placeholder"
                style={{ display: form.cover ? "none" : "grid" }}
              >
                <Icon name="image-line" size={32} />
                <small>Nessuna copertina</small>
              </div>
              {previewing && (
                <div className="cover-loading">
                  <Icon name="loader-4-line" size={22} />
                </div>
              )}
            </div>

            <div className="cover-actions">
              <label className="button outline small upload">
                <Icon name="upload-line" />
                Carica
                <input
                  type="file"
                  accept="image/*"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    if (file.size > 900_000) {
                      setPreviewMsg(
                        "Immagine troppo grande (max ~900 KB). Usa un URL."
                      );
                      setPreviewErr(true);
                      return;
                    }
                    const reader = new FileReader();
                    reader.onload = () => {
                      set("cover", String(reader.result));
                      setPreviewMsg("Copertina caricata dal file.");
                      setPreviewErr(false);
                    };
                    reader.readAsDataURL(file);
                  }}
                />
              </label>
              {form.cover && (
                <button
                  type="button"
                  className="button outline small"
                  onClick={() => {
                    set("cover", "");
                    lastPreviewed.current = "";
                    setPreviewMsg("Copertina rimossa.");
                    setPreviewErr(false);
                  }}
                  title="Rimuovi copertina"
                >
                  <Icon name="delete-bin-6-line" />
                </button>
              )}
            </div>

            <label className="field">
              <span>URL copertina</span>
              <input
                type="text"
                value={form.cover.startsWith("data:") ? "" : form.cover}
                onChange={(e) => set("cover", e.target.value)}
                placeholder={
                  form.cover.startsWith("data:")
                    ? "(immagine caricata da file)"
                    : "https://..."
                }
              />
            </label>
          </aside>

          <div className="editor-fields">
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
                  onChange={(e) => set("type", e.target.value)}
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.slug}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>

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
                <span>Dove lo trovo?</span>
                <input
                  value={form.where_to}
                  onChange={(e) => set("where_to", e.target.value)}
                  placeholder="Netflix, Steam, biblioteca..."
                />
              </label>
            </div>

            <label className="field">
              <span>Link</span>
              <div className="link-row">
                <input
                  type="url"
                  value={form.link}
                  onChange={(e) => set("link", e.target.value)}
                  placeholder="https://..."
                />
                <button
                  type="button"
                  className="button outline small"
                  onClick={() =>
                    runPreview(form.link, { silentIfAlreadyTried: false })
                  }
                  disabled={previewing}
                  title="Riprova a ricavare titolo e copertina da questa pagina"
                >
                  <Icon name="magic-line" />
                  {previewing ? "Leggo..." : "Anteprima"}
                </button>
              </div>
              {previewMsg && (
                <span
                  className={
                    previewErr ? "preview-msg err" : "preview-msg ok"
                  }
                >
                  {previewMsg}
                </span>
              )}
            </label>

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

            <label className="field">
              <span>Note</span>
              <textarea
                rows="4"
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
        </div>

        <div className="dialog-foot">
          <span className="db-note"></span>
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