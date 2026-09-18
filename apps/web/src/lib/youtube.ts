// Normalize a user-pasted video URL into an embeddable iframe src. Handles the
// common YouTube shapes (watch?v=, youtu.be/, /shorts/, /embed/) plus Vimeo, and
// returns other URLs unchanged so an already-embeddable link still works.
// A raw youtube.com/watch?v=… link does NOT render in an <iframe> — it must be
// the /embed/ form — which is why sellers' pasted links otherwise show nothing.
export function toEmbedUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  const raw = url.trim();
  if (!raw) return null;

  try {
    const u = new URL(raw);
    const host = u.hostname.replace(/^www\./, "").toLowerCase();

    // youtu.be/<id>
    if (host === "youtu.be") {
      const id = u.pathname.slice(1).split("/")[0];
      return id ? `https://www.youtube.com/embed/${id}` : raw;
    }

    if (host === "youtube.com" || host === "m.youtube.com" || host === "youtube-nocookie.com") {
      // Already an embed URL
      if (u.pathname.startsWith("/embed/")) return raw;
      // youtube.com/shorts/<id>
      if (u.pathname.startsWith("/shorts/")) {
        const id = u.pathname.split("/")[2];
        return id ? `https://www.youtube.com/embed/${id}` : raw;
      }
      // youtube.com/watch?v=<id>
      const v = u.searchParams.get("v");
      if (v) return `https://www.youtube.com/embed/${v}`;
      return raw;
    }

    // vimeo.com/<id> → player.vimeo.com/video/<id>
    if (host === "vimeo.com") {
      const id = u.pathname.split("/").filter(Boolean)[0];
      return id && /^\d+$/.test(id) ? `https://player.vimeo.com/video/${id}` : raw;
    }

    return raw;
  } catch {
    // Not a parseable URL — leave it to the caller/validation.
    return raw;
  }
}
