import { Router } from "express";

const router = Router();

const PRIVATE_HOST_RE =
  /^(localhost|127\.|0\.|10\.|169\.254\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|\[?::1\]?$|.*\.local$|.*\.internal$)/i;

function isSafeUrl(raw) {
  let u;
  try {
    u = new URL(raw);
  } catch {
    return null;
  }
  if (!/^https?:$/i.test(u.protocol)) return null;
  if (PRIVATE_HOST_RE.test(u.hostname)) return null;
  return u;
}

function decodeEntities(s) {
  return String(s)
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) =>
      String.fromCharCode(parseInt(n, 16))
    );
}

function pickMeta(html, names) {
  for (const name of names) {
    const re1 = new RegExp(
      `<meta[^>]+(?:property|name)=["']${name}["'][^>]*content=["']([^"']+)["']`,
      "i"
    );
    const re2 = new RegExp(
      `<meta[^>]+content=["']([^"']+)["'][^>]*(?:property|name)=["']${name}["']`,
      "i"
    );
    const m = html.match(re1) || html.match(re2);
    if (m && m[1]) return decodeEntities(m[1].trim());
  }
  return "";
}

function absolutize(base, href) {
  try {
    return new URL(href, base).toString();
  } catch {
    return "";
  }
}

function parsePreview(html, baseUrl) {
  const title =
    pickMeta(html, ["og:title", "twitter:title"]) ||
    (html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] || "").trim();

  const description = pickMeta(html, [
    "og:description",
    "twitter:description",
    "description",
  ]);
  const siteName = pickMeta(html, ["og:site_name"]);

  let cover = pickMeta(html, [
    "og:image:secure_url",
    "og:image:url",
    "og:image",
    "twitter:image",
    "twitter:image:src",
  ]);

  if (!cover) {
    const imgRe = /<img[^>]+>/gi;
    let m;
    let best = "";
    while ((m = imgRe.exec(html))) {
      const tag = m[0];
      const src = tag.match(/\bsrc=["']([^"']+)["']/i)?.[1];
      if (!src) continue;
      const w = Number(tag.match(/\bwidth=["']?(\d+)/i)?.[1] || 0);
      const h = Number(tag.match(/\bheight=["']?(\d+)/i)?.[1] || 0);
      if ((w && w < 200) || (h && h < 200)) continue;
      if (/cover|poster|thumb|image/i.test(src) || (w >= 300 && h >= 300)) {
        best = src;
        break;
      }
      if (!best) best = src;
    }
    cover = best;
  }

  if (!cover) {
    const icon = html.match(
      /<link[^>]+rel=["'][^"']*icon[^"']*["'][^>]*href=["']([^"']+)["']/i
    )?.[1];
    if (icon) cover = icon;
  }

  return {
    title: decodeEntities(title || "").slice(0, 300),
    description: decodeEntities(description || "").slice(0, 500),
    site: decodeEntities(siteName || "").slice(0, 100),
    cover: cover ? absolutize(baseUrl, cover) : "",
    url: baseUrl,
  };
}

router.get("/", async (req, res) => {
  const raw = String(req.query.url ?? "").trim();
  const target = isSafeUrl(raw);
  if (!target) {
    return res.status(400).json({ error: "URL non valido o non consentito." });
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);

  try {
    const r = await fetch(target.toString(), {
      redirect: "follow",
      signal: controller.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "it-IT,it;q=0.9,en;q=0.8",
      },
    });

    if (!r.ok) {
      const isImdb = /(^|\.)imdb\.com$/i.test(target.hostname);
      return res.status(502).json({
        error: isImdb
          ? "IMDb blocca il download automatico. Apri la pagina, clicca con il tasto destro sulla copertina, scegli “Copia indirizzo immagine” e incollalo in “URL copertina”."
          : `Il sito ha risposto ${r.status}. Puoi inserire i dati a mano.`,
        imdb: isImdb,
      });
    }

    const ctype = r.headers.get("content-type") || "";
    if (!/text\/html|application\/xhtml/i.test(ctype)) {
      return res.status(415).json({ error: "Il link non è una pagina HTML." });
    }

    const reader = r.body.getReader();
    const chunks = [];
    let size = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      chunks.push(value);
      if (size > 1_000_000) {
        try {
          await reader.cancel();
        } catch {}
        break;
      }
    }
    const buf = Buffer.concat(chunks.map((c) => Buffer.from(c)));
    const html = buf.toString("utf8");

    const data = parsePreview(html, r.url || target.toString());

    const isImdb = /(^|\.)imdb\.com$/i.test(target.hostname);
    if (isImdb && !data.cover) {
      return res.status(200).json({
        ...data,
        warning:
          "IMDb non espone la copertina via Open Graph. Copiala manualmente con “Copia indirizzo immagine”.",
        imdb: true,
      });
    }

    res.json(data);
  } catch (e) {
    const msg =
      e?.name === "AbortError"
        ? "Il sito ci ha messo troppo tempo a rispondere."
        : "Impossibile leggere il link.";
    res.status(502).json({ error: msg });
  } finally {
    clearTimeout(timer);
  }
});

export default router;