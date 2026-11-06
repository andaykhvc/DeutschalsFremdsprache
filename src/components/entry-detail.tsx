"use client";
import { useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowUpRight,
  Check,
  PencilLine,
  Quote,
  History,
  Share2,
  X,
} from "lucide-react";
import { api } from "@/lib/api";
import type { Entry, Comment, Correction, Revision, Reader } from "@/lib/types";
import { Dialog } from "./dialog";
export type Detail = {
  entry: Entry;
  comments: Comment[];
  corrections: Correction[];
  revisions: Revision[];
};
type Selection = { quote: string; start_offset: number; end_offset: number };
export function EntryDetail({
  initial,
  user,
  onSignIn,
}: {
  initial: Detail;
  user: Reader | null;
  onSignIn: () => void;
}) {
  const [data, setData] = useState(initial);
  const [selection, setSelection] = useState<Selection | null>(null);
  const [suggest, setSuggest] = useState(false);
  const [history, setHistory] = useState(false);
  const [active, setActive] = useState<string | null>(null);
  const [tab, setTab] = useState("pending");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const textRef = useRef<HTMLDivElement>(null);
  const { entry, comments, corrections, revisions } = data;
  const pending = corrections.filter((c) => c.status === "pending");
  async function reload() {
    setData(await api<Detail>(`entry/${entry.id}`));
  }
  function capture() {
    const s = window.getSelection();
    const root = textRef.current;
    if (
      !s ||
      s.isCollapsed ||
      !root ||
      !root.contains(s.anchorNode) ||
      !root.contains(s.focusNode)
    )
      return;
    const r = s.getRangeAt(0);
    const pre = r.cloneRange();
    pre.selectNodeContents(root);
    pre.setEnd(r.startContainer, r.startOffset);
    const start = pre.toString().length;
    const quote = r.toString();
    if (quote.trim() && quote.length <= 4000)
      setSelection({
        quote,
        start_offset: start,
        end_offset: start + quote.length,
      });
  }
  function startSuggest() {
    if (!user) {
      onSignIn();
      return;
    }
    setSuggest(true);
    setError("");
  }
  async function sendSuggestion(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!selection) return;
    setBusy(true);
    setError("");
    const f = new FormData(e.currentTarget);
    try {
      await api("suggest", {
        entryId: entry.id,
        ...selection,
        replacement: String(f.get("replacement")),
        reason: String(f.get("reason")),
        base_version: entry.version,
      });
      await reload();
      setSuggest(false);
      setSelection(null);
      setNotice("Danke! Dein Vorschlag wurde gespeichert.");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function review(id: string, decision: "accepted" | "rejected") {
    setBusy(true);
    setError("");
    try {
      await api("review", { id, decision });
      await reload();
      setNotice(
        decision === "accepted"
          ? "Korrektur übernommen. Die vorherige Fassung bleibt im Verlauf."
          : "Vorschlag abgelehnt.",
      );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function comment(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!user) {
      onSignIn();
      return;
    }
    const form = e.currentTarget;
    setBusy(true);
    setError("");
    try {
      await api("comment", {
        entryId: entry.id,
        body: String(new FormData(form).get("comment")),
      });
      await reload();
      form.reset();
      setNotice("Dein Kommentar wurde gespeichert.");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function share() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setNotice("Link kopiert.");
    } catch {
      setNotice("Du kannst den Link aus der Adressleiste teilen.");
    }
  }
  const current = corrections
    .filter((c) => c.status === "pending" && c.base_version === entry.version)
    .sort((a, b) => a.start_offset - b.start_offset);
  let cursor = 0;
  const pieces: React.ReactNode[] = [];
  for (const c of current) {
    if (c.start_offset < cursor) continue;
    pieces.push(entry.body.slice(cursor, c.start_offset));
    pieces.push(
      <mark
        key={c.id}
        tabIndex={0}
        role="button"
        aria-label={`Korrektur zu: ${c.quote}`}
        className={active === c.id ? "active" : ""}
        onClick={() => setActive(c.id)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") setActive(c.id);
        }}
      >
        {c.quote}
      </mark>,
    );
    cursor = c.end_offset;
  }
  pieces.push(entry.body.slice(cursor));
  const sentences = [...entry.body.matchAll(/[^.!?\n]+[.!?]?/g)]
    .map((m) => {
      const quote = m[0].trim();
      const start = (m.index || 0) + m[0].indexOf(quote);
      return { quote, start_offset: start, end_offset: start + quote.length };
    })
    .filter((s) => s.quote);
  return (
    <>
      <div className="reading-top">
        <Link href="/" className="back-link">
          <ArrowLeft size={16} /> Alle Einträge
        </Link>
        <div className="reading-actions">
          <button
            className="icon-button"
            aria-label="Link kopieren"
            onClick={share}
          >
            <Share2 size={18} />
          </button>
          <button className="button ghost" onClick={() => setHistory(true)}>
            <History size={17} /> Verlauf
          </button>
          {user?.owner && (
            <Link className="button secondary" href={`/schreiben/${entry.id}`}>
              <PencilLine size={16} /> Bearbeiten
            </Link>
          )}
        </div>
      </div>
      <div className="reading-layout">
        <article className="entry-article">
          <header className="entry-heading">
            <div className="entry-meta">
              <span className="topic">{entry.topic}</span>
              <time>{date(entry.published_at || entry.created_at)}</time>
              {entry.status === "draft" && (
                <span className="status">Entwurf</span>
              )}
            </div>
            <h1>{entry.title}</h1>
            <p className="reading-byline">
              <span className="small-avatar">A</span>{" "}
              {entry.example ? "Beispieleintrag" : "Andays Tagebuch"}
              <span>
                {Math.max(1, Math.ceil(entry.body.split(/\s+/).length / 180))}{" "}
                Min. Lesezeit
              </span>
            </p>
          </header>
          {entry.photos.length > 0 && (
            <div className="article-photos">
              {entry.photos.map((p, i) => (
                <figure key={p.url}>
                  <img src={p.url} alt={p.alt} loading={i ? "lazy" : "eager"} />
                  {p.alt && <figcaption>{p.alt}</figcaption>}
                </figure>
              ))}
            </div>
          )}
          <div className="text-toolbar">
            <span>
              <Quote size={15} /> Ein Gedanke darf noch wachsen.
            </span>
            <button className="text-button" onClick={startSuggest}>
              <PencilLine size={15} /> Korrektur vorschlagen
            </button>
          </div>
          <div
            ref={textRef}
            className="prose entry-body"
            onMouseUp={capture}
            onKeyUp={capture}
          >
            {pieces}
          </div>
          {selection && !suggest && (
            <div className="selection-bar">
              <span>
                „
                {selection.quote.length > 60
                  ? selection.quote.slice(0, 60) + "…"
                  : selection.quote}
                “
              </span>
              <button className="button primary" onClick={startSuggest}>
                <PencilLine size={16} /> Verbessern
              </button>
              <button
                className="icon-button"
                aria-label="Auswahl aufheben"
                onClick={() => setSelection(null)}
              >
                <X size={16} />
              </button>
            </div>
          )}
          <div className="article-end">
            <span>Danke fürs Mitlesen.</span>
            <span className="handwritten">Bis zum nächsten Gedanken.</span>
          </div>
          <section
            className="comments-section"
            aria-labelledby="comments-title"
          >
            <h2 id="comments-title">
              Ein paar Worte zurück <span>{comments.length}</span>
            </h2>
            <p className="muted">
              Eine Frage, ein Gedanke oder einfach ein Hallo.
            </p>
            {comments.length === 0 && (
              <p className="empty-comments">
                Hier ist noch Platz für den ersten Kommentar.
              </p>
            )}
            {comments.map((c) => (
              <div className="comment" key={c.id}>
                <span className="avatar">
                  {c.author_name.charAt(0).toUpperCase()}
                </span>
                <div>
                  <div className="comment-meta">
                    <strong>{c.author_name}</strong>
                    <time>{date(c.created_at)}</time>
                  </div>
                  <p>{c.body}</p>
                </div>
              </div>
            ))}
            {entry.status === "published" &&
              (user ? (
                <form onSubmit={comment} className="comment-form">
                  <label htmlFor="comment">Dein Kommentar</label>
                  <textarea
                    id="comment"
                    name="comment"
                    placeholder="Was möchtest du teilen?"
                    required
                    maxLength={2000}
                    rows={3}
                  />
                  <button className="button primary" disabled={busy}>
                    Kommentar senden
                    <ArrowUpRight size={16} />
                  </button>
                </form>
              ) : (
                <button className="button secondary" onClick={onSignIn}>
                  Anmelden und kommentieren <ArrowUpRight size={16} />
                </button>
              ))}
          </section>
        </article>
        <aside className="annotation-panel">
          <div className="annotation-heading">
            <span className="annotation-icon">
              <PencilLine size={20} />
            </span>
            <h2>Zusammen besser.</h2>
            <p>Kleine Hinweise, die beim Lernen helfen.</p>
          </div>
          <div className="segmented">
            <button
              aria-pressed={tab === "pending"}
              onClick={() => setTab("pending")}
            >
              Offen {pending.length}
            </button>
            <button aria-pressed={tab === "all"} onClick={() => setTab("all")}>
              Alle {corrections.length}
            </button>
          </div>
          {corrections
            .filter((c) => tab === "all" || c.status === "pending")
            .map((c) => (
              <div
                className={`correction-note ${active === c.id ? "selected" : ""}`}
                key={c.id}
              >
                <div className="comment-meta">
                  <strong>{c.author_name}</strong>
                  <span className={`review-status ${c.status}`}>
                    {c.status === "accepted"
                      ? "Übernommen"
                      : c.status === "rejected"
                        ? "Abgelehnt"
                        : "Vorschlag"}
                  </span>
                </div>
                <del>{c.quote}</del>
                <ins>{c.replacement || "(entfernen)"}</ins>
                <p>{c.reason}</p>
                {c.base_version !== entry.version && c.status === "pending" && (
                  <small className="stale-note">
                    Bezieht sich auf eine frühere Fassung. Bitte neu
                    vorschlagen.
                  </small>
                )}
                {user?.owner && c.status === "pending" && (
                  <div className="review-buttons">
                    <button
                      className="button accept"
                      disabled={busy || c.base_version !== entry.version}
                      onClick={() => void review(c.id, "accepted")}
                    >
                      <Check size={15} /> Annehmen
                    </button>
                    <button
                      className="icon-button"
                      disabled={busy}
                      aria-label="Vorschlag ablehnen"
                      onClick={() => void review(c.id, "rejected")}
                    >
                      <X size={17} />
                    </button>
                  </div>
                )}
              </div>
            ))}
          {pending.length === 0 && tab === "pending" && (
            <div className="empty-notes">
              <Quote size={25} />
              <h3>Dein Blick hilft.</h3>
              <p>
                Markiere eine Textstelle und schlage eine bessere Formulierung
                vor.
              </p>
            </div>
          )}
          <button
            className="button secondary full-width"
            onClick={startSuggest}
          >
            <PencilLine size={17} /> Einen Hinweis hinterlassen
          </button>
          <p className="fine-print">
            Vorschläge ändern den Text erst, wenn der Autor sie annimmt.
          </p>
        </aside>
      </div>
      {error && !suggest && (
        <p role="alert" className="toast error">
          {error}
          <button
            className="icon-button"
            onClick={() => setError("")}
            aria-label="Meldung schließen"
          >
            <X size={16} />
          </button>
        </p>
      )}
      {notice && (
        <div role="status" className="toast">
          <Check size={18} />
          {notice}
          <button
            className="icon-button"
            onClick={() => setNotice("")}
            aria-label="Meldung schließen"
          >
            <X size={16} />
          </button>
        </div>
      )}
      {suggest && (
        <Dialog
          title="Ein kleiner Vorschlag."
          onClose={() => setSuggest(false)}
        >
          <p className="muted">
            Hilf mir zu verstehen, was ich besser ausdrücken kann.
          </p>
          <form onSubmit={sendSuggestion} className="form-stack">
            <label>
              Textstelle
              {!selection ? (
                <select
                  required
                  defaultValue=""
                  onChange={(e) =>
                    setSelection(sentences[Number(e.target.value)])
                  }
                >
                  <option value="" disabled>
                    Wähle einen Satz
                  </option>
                  {sentences.map((s, i) => (
                    <option key={i} value={i}>
                      {s.quote}
                    </option>
                  ))}
                </select>
              ) : (
                <blockquote className="selected-quote">
                  {selection.quote}
                </blockquote>
              )}
            </label>
            <label>
              Deine Formulierung
              <textarea
                name="replacement"
                defaultValue={selection?.quote || ""}
                key={selection?.start_offset ?? "none"}
                rows={3}
                maxLength={4000}
              />
            </label>
            <label>
              Warum klingt das besser?
              <textarea
                name="reason"
                placeholder="Zum Beispiel: Nach „weil“ steht das Verb am Ende."
                required
                maxLength={2000}
                rows={3}
              />
            </label>
            {error && (
              <p className="error" role="alert">
                {error}
              </p>
            )}
            <button className="button primary" disabled={busy || !selection}>
              {busy ? "Wird gespeichert …" : "Vorschlag senden"}
              <ArrowUpRight size={17} />
            </button>
          </form>
        </Dialog>
      )}
      {history && (
        <Dialog
          title="Jeder Schritt zählt."
          onClose={() => setHistory(false)}
          wide
        >
          <p className="muted">
            Die aktuelle Fassung ist Version {entry.version}. Frühere Texte
            bleiben hier erhalten.
          </p>
          <details className="revision" open>
            <summary>
              Aktuelle Fassung <span>Version {entry.version}</span>
            </summary>
            <h3>{entry.title}</h3>
            <div className="prose">{entry.body}</div>
          </details>
          {revisions.map((r) => (
            <details className="revision" key={r.id}>
              <summary>
                {date(r.created_at)} <span>Version {r.version}</span>
              </summary>
              <h3>{r.title}</h3>
              <div className="prose">{r.body}</div>
            </details>
          ))}
        </Dialog>
      )}
    </>
  );
}
export function date(value: string) {
  return new Date(value).toLocaleDateString("de-DE", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Europe/Berlin",
  });
}
