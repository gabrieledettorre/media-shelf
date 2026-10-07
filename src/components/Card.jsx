import React from "react";
import Icon from "./Icon.jsx";
import { typeIcons } from "../lib/icons.js";

const palette = [
  ["#e9efff", "#405da8"],
  ["#f7e8ed", "#9b4965"],
  ["#e7f2e9", "#39744a"],
  ["#fff0d9", "#98631e"],
  ["#eee8fa", "#7252a3"],
  ["#e2f1f1", "#35777a"],
];

export default function Card({ item, onEdit, onDelete, categories = [] }) {
  const category = categories.find((c) => c.slug === item.type);
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
          <Icon name={typeIcons[item.type] || "bookmark-line"} size={12} />
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