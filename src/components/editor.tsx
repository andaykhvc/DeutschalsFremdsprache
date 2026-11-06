"use client";
import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  ImagePlus,
  ArrowUpRight,
  Trash2,
  Check,
  ArrowLeft,
  Eye,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import type { Entry } from "@/lib/types";
import { Dialog } from "./dialog";
export function Editor({ entry }: { entry?: Entry }) {
  const router = useRouter();
  const key = `diary-draft:${entry?.id || "new"}`;
  const [title, setTitle] = useState(entry?.title || "");
  const [body, setBody] = useState(entry?.body || "");
  const [topic, setTopic] = useState(entry?.topic || "Alltag");
  const [photos, setPhotos] = useState<Entry["photos"]>(entry?.photos || []);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [preview, setPreview] = useState(false);
  const [restorable, setRestorable] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const ready = useRef(false);
  useEffect(() => {
    setRestorable(Boolean(localStorage.getItem(key)));
    ready.current = true;
  }, [key]);
  useEffect(() => {
    if (!ready.current || restorable || (!title && !body)) return;
    const timer = setTimeout(() => {
      try {
        localStorage.setItem(
          key,
          JSON.stringify({
            title,
            body,
            topic,
            photos,
            baseVersion: entry?.version,
          }),
        );
        setSaved(true);
      } catch {
        setSaved(false);
      }
    }, 700);
    setSaved(false);
    return () => clearTimeout(timer);
  }, [title, body, topic, photos, key, entry?.version, restorable]);
  function restore() {
    try {
      const data = JSON.parse(localStorage.getItem(key) || "{}");
      setTitle(data.title || "");
      setBody(data.body || "");
      setTopic(data.topic || "Alltag");
      setPhotos(data.photos || []);
      setRestorable(false);
    } catch {
      setError("Der lokale Entwurf konnte nicht geöffnet werden.");
    }
  }
  async function upload(file: File) {
    setUploading(true);
    setError("");
    try {
      const bitmap = await createImageBitmap(file);
      const scale = Math.min(1, 1800 / Math.max(bitmap.width, bitmap.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(bitmap.width * scale);
      canvas.height = Math.round(bitmap.height * scale);
      canvas
        .getContext("2d")!
        .drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      bitmap.close();
      const blob = await new Promise<Blob>((resolve, reject) =>
        canvas.toBlob(
          (b) =>
            b
              ? resolve(b)
              : reject(new Error("Das Foto konnte nicht verarbeitet werden.")),
          "image/webp",
          0.85,
        ),
      );
      const form = new FormData();
      form.set("file", blob, "foto.webp");
      const res = await fetch("/api/diary/upload", {
        method: "POST",
        body: form,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setPhotos((p) => [...p, { url: data.url, alt: "" }]);
    } catch (e) {
      setError(
        (e as Error).message || "Dieses Foto konnte nicht geladen werden.",
      );
    } finally {
      setUploading(false);
      if (fileInput.current) fileInput.current.value = "";
    }
  }
  async function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const status =
      (e.nativeEvent as SubmitEvent).submitter?.getAttribute("value") ||
      "draft";
    setBusy(true);
    setError("");
    try {
      const data = await api<{ id: string }>("write", {
        id: entry?.id,
        version: entry?.version,
        title,
        body,
        topic,
        photos,
        status,
      });
      localStorage.removeItem(key);
      router.push(`/eintrag/${data.id}`);
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="editor-page">
      <Link className="back-link" href="/">
        <ArrowLeft size={16} /> Zum Tagebuch
      </Link>
      <div className="section-heading">
        <div>
          <p className="date-label">Ein neuer Gedanke</p>
          <h1>{entry ? "Eintrag bearbeiten" : "Was ist heute passiert?"}</h1>
        </div>
        <span className="save-state">
          <Check size={14} />
          {saved ? "Lokal gesichert" : "Dein Entwurf"}
        </span>
      </div>
      {restorable && (
        <div className="notice">
          Hier liegt ein lokaler Entwurf bereit.{" "}
          <button className="text-button" onClick={restore}>
            Wiederherstellen
          </button>
          <button
            className="text-button"
            onClick={() => {
              localStorage.removeItem(key);
              setRestorable(false);
            }}
          >
            Verwerfen
          </button>
        </div>
      )}
      <form onSubmit={save} className="editor-form">
        <label className="sr-only" htmlFor="title">
          Titel
        </label>
        <input
          id="title"
          className="title-input"
          placeholder="Eine Überschrift für deinen Tag …"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          maxLength={180}
        />
        <div className="editor-tools">
          <label className="topic-label">
            Thema
            <input
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              required
              maxLength={40}
              list="topics"
            />
            <datalist id="topics">
              {["Alltag", "Unterwegs", "Kleine Gedanken", "Deutsch lernen"].map(
                (t) => (
                  <option key={t}>{t}</option>
                ),
              )}
            </datalist>
          </label>
          <button
            type="button"
            className="button secondary"
            onClick={() => fileInput.current?.click()}
            disabled={uploading || photos.length >= 12}
          >
            <ImagePlus size={17} />
            {uploading ? "Foto wird geladen …" : "Foto hinzufügen"}
          </button>
          <input
            ref={fileInput}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="sr-only"
            aria-label="Foto auswählen"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void upload(file);
            }}
          />
        </div>
        {photos.length > 0 && (
          <div className="editor-photos">
            {photos.map((p, i) => (
              <div key={p.url}>
                <img src={p.url} alt={p.alt || "Hochgeladenes Foto"} />
                <label>
                  Bildbeschreibung
                  <input
                    value={p.alt}
                    placeholder="Was ist auf dem Foto zu sehen?"
                    onChange={(e) =>
                      setPhotos((ps) =>
                        ps.map((p, j) =>
                          i === j ? { ...p, alt: e.target.value } : p,
                        ),
                      )
                    }
                    required
                    maxLength={300}
                  />
                </label>
                <button
                  type="button"
                  className="icon-button"
                  aria-label={`Foto ${i + 1} entfernen`}
                  onClick={() =>
                    setPhotos((ps) => ps.filter((_, j) => j !== i))
                  }
                >
                  <Trash2 size={17} />
                </button>
              </div>
            ))}
          </div>
        )}
        <label className="sr-only" htmlFor="body">
          Dein Text
        </label>
        <textarea
          id="body"
          className="body-input"
          placeholder="Du musst nicht perfekt schreiben. Fang einfach an.\n\nDein Alltag hat genug Geschichten."
          value={body}
          onChange={(e) => setBody(e.target.value)}
          required
          maxLength={100000}
        />
        {error && (
          <p role="alert" className="error">
            {error}
          </p>
        )}
        <div className="editor-footer">
          <span>
            {body.trim() ? body.trim().split(/\s+/).length : 0} Wörter
          </span>
          <div>
            <button
              type="button"
              className="button ghost"
              onClick={() => setPreview(true)}
            >
              <Eye size={17} /> Vorschau
            </button>
            <button
              className="button secondary"
              value="draft"
              disabled={busy || uploading}
            >
              Entwurf speichern
            </button>
            <button
              className="button primary"
              value="published"
              disabled={busy || uploading}
            >
              {busy ? "Wird gespeichert …" : "Veröffentlichen"}
              <ArrowUpRight size={17} />
            </button>
          </div>
        </div>
      </form>
      {preview && (
        <Dialog
          title={title || "Deine Vorschau"}
          onClose={() => setPreview(false)}
          wide
        >
          <div className="prose preview-body">
            {body || "Hier erscheint dein Text."}
          </div>
        </Dialog>
      )}
    </div>
  );
}
