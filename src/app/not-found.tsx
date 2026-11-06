import Link from "next/link";
export default function NotFound() {
  return (
    <main className="standalone-state">
      <span className="date-label">404</span>
      <h1>Diese Seite ist noch unbeschrieben.</h1>
      <p>Vielleicht liegt der nächste Gedanke auf einer anderen Seite.</p>
      <Link href="/" className="button primary">
        Zum Tagebuch
      </Link>
    </main>
  );
}
