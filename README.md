# Alltagsnotizen

Öffentliches deutsches Tagebuch mit Fotos, Kommentaren und Korrekturvorschlägen direkt am Text.

## Stack

- Next.js 16 / React 19 / TypeScript auf Vercel
- Neon PostgreSQL und Managed Better Auth
- Vercel Blob für Fotos (vor dem Upload im Browser auf maximal 1800 px verkleinert)
- Keine weiteren Backend-Dienste

## Lokal starten

Node.js 24 und pnpm 11 verwenden. Das Projekt mit dem vorgesehenen Vercel-Projekt verknüpfen, dann `vercel env pull .env.local` ausführen. Die Variablennamen stehen in `.env.example`; Secrets niemals committen. Entwicklung über **http://localhost:3000**, weil Neon Auth localhost standardmäßig erlaubt.

```sh
pnpm install
pnpm db:migrate
pnpm dev
```

`pnpm db:seed` fügt drei ausdrücklich als Beispiele gekennzeichnete Einträge hinzu. Es gibt keine fingierten Kommentare oder Benutzer im öffentlichen Tagebuch. Die Bilder sind austauschbare Unsplash-Beispielfotos; Quellen siehe `public/images/SOURCES.md`. Newsreader wird lokal ausgeliefert (OFL-Lizenz unter `public/fonts/OFL.txt`).

## Autor einrichten

1. Auf der Website ein eigenes Konto erstellen und anmelden.
2. Im Seitenmenü „Tagebuch einrichten“ wählen.
3. Den einmaligen `OWNER_SETUP_SECRET` aus der eigenen Vercel-Konfiguration oder lokalen `.env.local` eingeben.

Nur wer diesen Code kennt und angemeldet ist, kann das noch nicht beanspruchte Tagebuch übernehmen. Die Zuordnung wird atomar in `site_settings` gespeichert. Eine zweite Übernahme ist ausgeschlossen. Danach kann `OWNER_SETUP_SECRET` in Vercel entfernt werden. Kein „erster registrierter Benutzer ist Admin“-Verhalten.

## Verhalten

- Alle Besucher können veröffentlichte Texte und deren Feedback lesen.
- Angemeldete Leser können kommentieren und Textkorrekturen vorschlagen.
- Nur der Autor kann schreiben, Fotos hochladen und Vorschläge annehmen oder ablehnen.
- Entwürfe sind für andere Besucher und Leser gesperrt. Fotos liegen in einem öffentlichen Blob-Store und können über ihren Link angesehen werden, auch vor Veröffentlichung eines Textes.
- Themen werden beim Schreiben frei vergeben.
- Der Editor sichert den Text zusätzlich lokal im Browser. „Entwurf speichern“ speichert in Neon. Ein lokaler Entwurf muss ausdrücklich wiederhergestellt werden.
- Jede Textänderung speichert die vorherige Fassung. Korrekturen sind an exakte Auswahlpositionen und die Textversion gebunden. Alte Vorschläge werden sichtbar als veraltet markiert; keine automatische Anwendung auf geänderten Text.
- Schreibzugriffe prüfen Anmeldung, Autorrolle, Origin und Eingaben serverseitig. Leserbeiträge sind pro Konto begrenzt. Datenbankzugriffe laufen ausschließlich auf dem Server.

## Vercel / Neon

GitHub `main` ist mit Vercel verbunden. Den vorgesehenen Produktionsdomain in Neon unter **Auth → Configuration → Domains** erlauben; keine pauschale Freigabe fremder Domains. Individuelle Preview-Domains brauchen eigene Freigaben oder ein enges, projektspezifisches Muster.

Erforderlich: `DATABASE_URL`, `NEON_AUTH_BASE_URL`, `NEON_AUTH_COOKIE_SECRET` (mindestens 32 zufällige Zeichen), `NEXT_PUBLIC_SITE_URL`, `BLOB_READ_WRITE_TOKEN` und für die Erstübernahme `OWNER_SETUP_SECRET`.

Die Migration ist wiederholbar und wird bewusst vor dem Deploy ausgeführt. Preview und Production sollten bei späterer Weiterentwicklung getrennte Neon-Branches erhalten; die erste Einrichtung verwendet eine gemeinsame Datenbank.

## Prüfen

```sh
pnpm typecheck
pnpm test
pnpm build
```

`node --env-file=.env.local scripts/verify-flow.mjs` ist ein Integrationstest mit synthetischen Konten, einem temporären Eintrag und einem echten Foto-Upload. Er ist nur vor der Übernahme durch den echten Autor vorgesehen. Er prüft Rollen, Entwürfe, Kommentare, Korrekturen, Verlauf und Konflikte; temporäre Einträge und hochgeladene Testbilder werden entfernt.

Synthetische QA-Konten können zur Nachprüfung in Neon Auth verbleiben; Testsitzungen werden abgemeldet. Keine Zugangsdaten in Git oder Deployment-Artefakte übernehmen.
