"use client";
import { useState, type FormEvent } from "react";
import { ArrowRight, Mail } from "lucide-react";
import { Dialog } from "./dialog";
import { authClient } from "@/lib/auth/client";
export function AuthDialog({
  onClose,
  onSuccess,
}: {
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setBusy(true);
    const data = new FormData(e.currentTarget);
    try {
      const args = {
        email: String(data.get("email")).trim(),
        password: String(data.get("password")),
      };
      const result =
        mode === "signup"
          ? await authClient.signUp.email({
              ...args,
              name: String(data.get("name")).trim(),
            })
          : await authClient.signIn.email(args);
      if (result.error)
        throw new Error(
          mode === "signin"
            ? "Anmeldung fehlgeschlagen. Prüfe E-Mail und Passwort."
            : "Das Konto konnte nicht erstellt werden. Bitte prüfe deine Angaben.",
        );
      onSuccess();
      onClose();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Dialog
      title={
        mode === "signin"
          ? "Schön, dich zu sehen."
          : "Lass uns zusammen lernen."
      }
      onClose={onClose}
    >
      <p className="muted">
        Lesen geht ohne Konto. Mit einem Konto kannst du kommentieren und beim
        Deutschlernen helfen.
      </p>
      <div className="segmented">
        <button
          aria-pressed={mode === "signin"}
          onClick={() => {
            setMode("signin");
            setError("");
          }}
        >
          Anmelden
        </button>
        <button
          aria-pressed={mode === "signup"}
          onClick={() => {
            setMode("signup");
            setError("");
          }}
        >
          Konto erstellen
        </button>
      </div>
      <form onSubmit={submit} className="form-stack">
        {mode === "signup" && (
          <label>
            Dein Name
            <input
              name="name"
              autoComplete="name"
              required
              minLength={2}
              maxLength={100}
            />
          </label>
        )}
        <label>
          E-Mail-Adresse
          <input
            name="email"
            type="email"
            autoComplete="email"
            required
            maxLength={254}
            placeholder="du@beispiel.de"
          />
        </label>
        <label>
          Passwort
          <input
            name="password"
            type="password"
            autoComplete={
              mode === "signup" ? "new-password" : "current-password"
            }
            minLength={mode === "signup" ? 12 : 1}
            maxLength={128}
            required
          />
          {mode === "signup" && <small>Mindestens 12 Zeichen.</small>}
        </label>
        {error && (
          <p role="alert" className="error">
            {error}
          </p>
        )}
        <button className="button primary" disabled={busy}>
          {busy
            ? "Einen Moment …"
            : mode === "signin"
              ? "Anmelden"
              : "Konto erstellen"}
          <ArrowRight size={17} />
        </button>
      </form>
      <p className="fine-print">
        <Mail size={14} /> Deine E-Mail-Adresse wird nicht öffentlich angezeigt.
      </p>
    </Dialog>
  );
}
