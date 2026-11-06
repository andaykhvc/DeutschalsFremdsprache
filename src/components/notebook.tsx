"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  BookOpen,
  ArrowUpRight,
  ArrowRight,
  Search,
  MessageCircle,
  PencilLine,
  PenLine,
  Bookmark,
  Folder,
  LogOut,
  Menu,
  X,
  Leaf,
  Check,
  Globe,
  Heart,
} from "lucide-react";
import type { Entry, Reader } from "@/lib/types";
import { api } from "@/lib/api";
import { authClient } from "@/lib/auth/client";
import { AuthDialog } from "./auth-dialog";
import { EntryDetail, date, type Detail } from "./entry-detail";
import { Editor } from "./editor";
import { Dialog } from "./dialog";
export function Notebook({
  entries,
  detail,
  view,
}: {
  entries: Entry[];
  detail?: Detail;
  view: string[];
}) {
  const router = useRouter();
  const [user, setUser] = useState<Reader | null>(null);
  const [authOpen, setAuthOpen] = useState(false);
  const [mobile, setMobile] = useState(false);
  const [topic, setTopic] = useState("Alle Einträge");
  const [search, setSearch] = useState("");
  const [drafts, setDrafts] = useState<Entry[]>([]);
  const [error, setError] = useState("");
  const [claimed, setClaimed] = useState(true);
  const [setup, setSetup] = useState(false);
  const [info, setInfo] = useState(false);
  const [busy, setBusy] = useState(false);
  const current = view[0] || "home";
  const { data: session } = authClient.useSession();
  useEffect(() => {
    if (!mobile) return;
    const close = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobile(false);
    };
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, [mobile]);
  const refreshUser = useCallback(async () => {
    try {
      const result = await api<{ user: Reader | null; claimed: boolean }>("me");
      setUser(result.user);
      setClaimed(result.claimed);
    } catch {
      setError(
        "Die Anmeldung ist gerade nicht erreichbar. Bitte versuche es später erneut.",
      );
    }
  }, []);
  useEffect(() => {
    void refreshUser();
  }, [refreshUser, session?.user?.id]);
  useEffect(() => {
    if (current === "entwuerfe" && user?.owner)
      api<{ entries: Entry[] }>("feed?drafts=1")
        .then((d) => setDrafts(d.entries))
        .catch((e) => setError(e.message));
  }, [current, user?.owner]);
  async function signOut() {
    await authClient.signOut();
    setUser(null);
    router.push("/");
    router.refresh();
  }
  async function claim(form: HTMLFormElement) {
    setBusy(true);
    setError("");
    try {
      await api("claim", { secret: String(new FormData(form).get("secret")) });
      await refreshUser();
      setSetup(false);
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  const topics = [...new Set(entries.map((e) => e.topic))];
  const all = current === "entwuerfe" ? drafts : entries;
  const filtered = all.filter(
    (e) =>
      (topic === "Alle Einträge" || e.topic === topic) &&
      `${e.title} ${e.body} ${e.topic}`
        .toLocaleLowerCase("de")
        .includes(search.toLocaleLowerCase("de")),
  );
  const feature = filtered[0];
  const goHome = () => {
    setMobile(false);
    setTopic("Alle Einträge");
    setSearch("");
  };
  return (
    <div className="app-shell">
      <a className="skip-link" href="#main">
        Zum Inhalt
      </a>
      <div className="mobile-header">
        <Link href="/" className="wordmark" onClick={goHome}>
          <span className="logo-mark">
            <BookOpen size={21} />
          </span>
          alltagsnotizen<span className="brand-dot">.</span>
        </Link>
        <button
          className="icon-button"
          aria-label={mobile ? "Menü schließen" : "Menü öffnen"}
          aria-expanded={mobile}
          onClick={() => setMobile(!mobile)}
        >
          {mobile ? <X /> : <Menu />}
        </button>
      </div>
      {mobile && (
        <button
          className="sidebar-backdrop"
          aria-label="Menü schließen"
          onClick={() => setMobile(false)}
        />
      )}
      <aside className={`sidebar ${mobile ? "open" : ""}`}>
        <Link className="wordmark" href="/" onClick={goHome}>
          <span className="logo-mark">
            <BookOpen size={22} />
          </span>
          <span>
            alltagsnotizen<span className="brand-dot">.</span>
          </span>
        </Link>
        <p className="brand-caption">Mein Leben. Auf Deutsch.</p>
        <div className="notebook-owner">
          <span className="owner-avatar">
            a<span />
          </span>
          <div>
            <strong>Andays Tagebuch</strong>
            <span>Ein Wort nach dem anderen.</span>
          </div>
        </div>
        <nav aria-label="Hauptnavigation">
          <Link
            href="/"
            onClick={goHome}
            className={`nav-link ${current === "home" ? "active" : ""}`}
          >
            <BookOpen size={18} />
            Tagebuch<span className="nav-count">{entries.length}</span>
          </Link>
          <button
            className="nav-link"
            onClick={() => {
              setInfo(true);
              setMobile(false);
            }}
          >
            <MessageCircle size={18} />
            Zusammen lernen
          </button>
          {user?.owner && (
            <Link
              href="/entwuerfe"
              onClick={() => setMobile(false)}
              className={`nav-link ${current === "entwuerfe" ? "active" : ""}`}
            >
              <Folder size={18} />
              Meine Entwürfe
            </Link>
          )}
        </nav>
        <div className="sidebar-topics">
          <p>Meine Themen</p>
          {topics.map((t) => (
            <Link
              href="/"
              key={t}
              onClick={() => {
                setTopic(t);
                setMobile(false);
              }}
              className={`topic-link ${topic === t && current === "home" ? "selected" : ""}`}
            >
              <span className={`topic-dot topic-${topics.indexOf(t) % 4}`} />
              {t}
              <span>{entries.filter((e) => e.topic === t).length}</span>
            </Link>
          ))}
        </div>
        <div className="sidebar-note">
          <span className="sketch-star">✳</span>
          <p>
            Fehler gehören dazu.
            <br />
            Danke, dass du mir
            <br />
            beim Wachsen hilfst.
          </p>
          <span className="note-signature">— Anday</span>
        </div>
        <div className="sidebar-bottom">
          <span>
            <Globe size={14} /> Öffentliches Tagebuch
          </span>
          {user ? (
            <>
              <div className="signed-in">
                <span className="avatar">{user.name[0].toUpperCase()}</span>
                <span>{user.name}</span>
                <button
                  className="icon-button"
                  aria-label="Abmelden"
                  onClick={() => void signOut()}
                >
                  <LogOut size={17} />
                </button>
              </div>
              {!claimed && (
                <button className="text-button" onClick={() => setSetup(true)}>
                  Tagebuch einrichten
                </button>
              )}
            </>
          ) : (
            <button
              className="sidebar-signin"
              onClick={() => setAuthOpen(true)}
            >
              Anmelden
              <ArrowRight size={17} />
            </button>
          )}
        </div>
      </aside>
      <main
        id="main"
        inert={mobile}
        className={`main-content ${current === "eintrag" ? "detail-main" : ""}`}
      >
        <header className="topbar">
          <span className="breadcrumb">
            <BookOpen size={15} /> Tagebuch{" "}
            {current === "eintrag" && (
              <>
                <span>/</span> Eintrag
              </>
            )}
            {current === "schreiben" && (
              <>
                <span>/</span> Schreiben
              </>
            )}
            {current === "entwuerfe" && (
              <>
                <span>/</span> Entwürfe
              </>
            )}
          </span>
          <div>
            <span className="topbar-note">Ein kleines Stück Alltag.</span>
            {user?.owner ? (
              <Link href="/schreiben" className="button primary small">
                <PenLine size={16} /> Eintrag schreiben
              </Link>
            ) : (
              <button
                className="button secondary small"
                onClick={() => (user ? setInfo(true) : setAuthOpen(true))}
              >
                {user ? "Mithelfen" : "Anmelden"}
                <ArrowUpRight size={15} />
              </button>
            )}
          </div>
        </header>
        {error && (
          <p className="notice error" role="alert">
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
        {(current === "home" || current === "entwuerfe") && (
          <div className="journal-home">
            <div className="welcome-line">
              <span className="welcome-symbol">
                <Leaf size={17} />
              </span>{" "}
              Ein offenes Tagebuch. Ein gemeinsamer Lernweg.
            </div>
            <div className="home-heading">
              <div>
                <h1>
                  {current === "entwuerfe"
                    ? "Gedanken im Werden."
                    : "Alltag, aufgeschrieben."}
                </h1>
                <p>
                  {current === "entwuerfe"
                    ? "Manche Geschichten brauchen noch einen Moment."
                    : "Geschichten aus meinem Leben. Auf Deutsch erzählt, mit eurer Hilfe ein bisschen besser."}
                </p>
              </div>
              <span className="little-drawing" aria-hidden="true">
                hallo!
              </span>
            </div>
            <div className="journal-filter">
              <div className="filter-tabs" aria-label="Einträge filtern">
                {["Alle Einträge", ...topics].map((t) => (
                  <button
                    aria-pressed={topic === t}
                    key={t}
                    onClick={() => setTopic(t)}
                  >
                    {t}
                  </button>
                ))}
              </div>
              <label className="search-box">
                <Search size={17} />
                <span className="sr-only">Einträge durchsuchen</span>
                <input
                  type="search"
                  placeholder="Suchen …"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </label>
            </div>
            {feature ? (
              <>
                <Link
                  href={`/eintrag/${feature.id}`}
                  className="featured-entry"
                >
                  <div className="featured-image">
                    {feature.photos[0] ? (
                      <img
                        src={feature.photos[0].url}
                        alt={feature.photos[0].alt}
                        fetchPriority="high"
                      />
                    ) : (
                      <div className="no-photo">
                        <BookOpen size={48} />
                        <span>Ein neuer Gedanke.</span>
                      </div>
                    )}
                    <span className="photo-label">
                      <Bookmark size={13} /> Neu im Tagebuch
                    </span>
                  </div>
                  <div className="featured-copy">
                    <div className="entry-meta">
                      <span className="topic">{feature.topic}</span>
                      <time>
                        {date(feature.published_at || feature.created_at)}
                      </time>
                    </div>
                    <h2>{feature.title}</h2>
                    <p>{feature.excerpt}</p>
                    <div className="entry-card-footer">
                      <span>
                        Weiterlesen <ArrowUpRight size={17} />
                      </span>
                      <span className="feedback-count">
                        <MessageCircle size={15} />
                        {feature.comment_count || 0}
                      </span>
                    </div>
                    {feature.example && (
                      <small className="example-label">
                        Beispieleintrag zum Kennenlernen
                      </small>
                    )}
                  </div>
                </Link>
                <div className="older-heading">
                  <h2>Noch ein paar Seiten.</h2>
                  <span>
                    {filtered.length - 1} weitere{" "}
                    {filtered.length === 2 ? "Geschichte" : "Geschichten"}
                  </span>
                </div>
                <div className="entries-grid">
                  {filtered.slice(1).map((e) => (
                    <Link
                      href={`/eintrag/${e.id}`}
                      key={e.id}
                      className="entry-card"
                    >
                      {e.photos[0] ? (
                        <div className="card-image">
                          <img
                            src={e.photos[0].url}
                            alt={e.photos[0].alt}
                            loading="lazy"
                          />
                        </div>
                      ) : (
                        <div className="card-image no-photo">
                          <BookOpen size={32} />
                        </div>
                      )}
                      <div className="card-copy">
                        <div className="entry-meta">
                          <span className="topic">{e.topic}</span>
                          <time>{date(e.published_at || e.created_at)}</time>
                        </div>
                        <h2>{e.title}</h2>
                        <p>{e.excerpt}</p>
                        <div className="entry-card-footer">
                          <span>
                            {e.example ? "Beispieleintrag" : "Weiterlesen"}
                            <ArrowUpRight size={16} />
                          </span>
                          <span className="feedback-count">
                            <MessageCircle size={15} />
                            {e.comment_count || 0}
                            <PencilLine size={15} />
                            {e.correction_count || 0}
                          </span>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </>
            ) : (
              <div className="empty-feed">
                <BookOpen size={38} />
                <h2>
                  {search
                    ? "Keine Geschichte gefunden."
                    : current === "entwuerfe"
                      ? "Noch keine Entwürfe."
                      : "Die erste Seite wartet."}
                </h2>
                <p>
                  {search
                    ? "Versuche einen anderen Suchbegriff."
                    : "Ein kleiner Moment ist ein guter Anfang."}
                </p>
                {search ? (
                  <button
                    className="button secondary"
                    onClick={() => setSearch("")}
                  >
                    Suche zurücksetzen
                  </button>
                ) : (
                  user?.owner && (
                    <Link className="button primary" href="/schreiben">
                      Ersten Eintrag schreiben
                    </Link>
                  )
                )}
              </div>
            )}
            <div className="learning-invitation">
              <span className="invitation-icon">
                <PencilLine size={23} />
              </span>
              <div>
                <h3>Ein zweiter Blick macht den Unterschied.</h3>
                <p>
                  Ein Artikel, eine Endung, ein besseres Wort. Deine Hinweise
                  helfen mir weiter.
                </p>
              </div>
              <button
                className="button secondary"
                onClick={() => setInfo(true)}
              >
                So funktioniert’s <ArrowRight size={16} />
              </button>
            </div>
            <footer className="site-footer">
              <span>Mit kleinen Schritten, jeden Tag.</span>
              <span>
                Geschrieben von Anday <Heart size={13} />
              </span>
            </footer>
          </div>
        )}
        {current === "eintrag" && detail && (
          <EntryDetail
            key={detail.entry.id + ":" + detail.entry.version}
            initial={detail}
            user={user}
            onSignIn={() => setAuthOpen(true)}
          />
        )}
        {current === "schreiben" &&
          (user?.owner ? (
            <Editor key={detail?.entry.id || "new"} entry={detail?.entry} />
          ) : (
            <div className="empty-feed">
              <PenLine size={36} />
              <h1>Ein Platz für meine Gedanken.</h1>
              <p>Nur der Autor kann hier schreiben.</p>
              {!user && (
                <button
                  className="button primary"
                  onClick={() => setAuthOpen(true)}
                >
                  Anmelden
                </button>
              )}
              {user && !claimed && (
                <button
                  className="button primary"
                  onClick={() => setSetup(true)}
                >
                  Tagebuch einrichten
                </button>
              )}
            </div>
          ))}
      </main>
      {authOpen && (
        <AuthDialog
          onClose={() => setAuthOpen(false)}
          onSuccess={() => {
            void refreshUser();
            router.refresh();
          }}
        />
      )}
      {info && (
        <Dialog title="Zusammen besser Deutsch." onClose={() => setInfo(false)}>
          <p className="muted">
            Das hier ist mein Alltag auf Deutsch. Nicht jeder Satz sitzt schon.
            Genau dafür seid ihr da.
          </p>
          <div className="help-steps">
            <div>
              <QuoteIcon />
              <h3>Eine Stelle entdecken</h3>
              <p>
                Öffne einen Eintrag und markiere die Wörter, die du verbessern
                möchtest. Du kannst auch über „Korrektur vorschlagen“ einen Satz
                auswählen.
              </p>
            </div>
            <div>
              <PencilLine size={23} />
              <h3>Eine Idee hinterlassen</h3>
              <p>
                Schreib deine Formulierung dazu und erkläre kurz, warum sie
                besser passt.
              </p>
            </div>
            <div>
              <Check size={23} />
              <h3>Gemeinsam weiterkommen</h3>
              <p>
                Ich schaue mir jeden Vorschlag an. Wenn ich ihn annehme, bleibt
                die erste Fassung im Verlauf erhalten.
              </p>
            </div>
          </div>
          {!user && (
            <button
              className="button primary full-width"
              onClick={() => {
                setInfo(false);
                setAuthOpen(true);
              }}
            >
              Anmelden und mithelfen <ArrowUpRight size={16} />
            </button>
          )}
        </Dialog>
      )}
      {setup && (
        <Dialog
          title="Dein Tagebuch einrichten"
          onClose={() => setSetup(false)}
        >
          <p className="muted">
            Melde dich mit deinem eigenen Konto an und gib den einmaligen
            Einrichtungscode aus deiner Vercel-Konfiguration ein.
          </p>
          <form
            className="form-stack"
            onSubmit={(e) => {
              e.preventDefault();
              void claim(e.currentTarget);
            }}
          >
            <label>
              Einrichtungscode
              <input
                name="secret"
                type="password"
                required
                autoComplete="off"
                minLength={20}
              />
            </label>
            {error && (
              <p role="alert" className="error">
                {error}
              </p>
            )}
            <button className="button primary" disabled={busy}>
              {busy ? "Wird eingerichtet …" : "Als Autor übernehmen"}
            </button>
          </form>
        </Dialog>
      )}
    </div>
  );
}
function QuoteIcon() {
  return <MessageCircle size={23} />;
}
