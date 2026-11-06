"use client";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main className="standalone-state">
      <h1>Eine kurze Pause.</h1>
      <p>
        Das Tagebuch ist gerade nicht erreichbar. Deine gespeicherten Einträge
        bleiben erhalten.
      </p>
      <button className="button primary" onClick={reset}>
        Erneut versuchen
      </button>
    </main>
  );
}
