import React from "react";

export default function Icon({ name, size = 18 }) {
  return (
    <i
      className={`ri-${name}`}
      style={{ fontSize: size }}
      aria-hidden="true"
    />
  );
}