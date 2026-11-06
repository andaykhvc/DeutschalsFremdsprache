import pg from "pg";
const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
const entries = [
  {
    id: "970e2010-35d0-4dba-bb65-514e842ef001",
    title: "Ein Kaffee, ein Fensterplatz und ein bisschen Mut.",
    topic: "Alltag",
    photo: "cafe",
    alt: "Ein ruhiger Platz im Café – ein Beispielfoto.",
    days: 0,
    body: "Heute habe ich mir einen Platz am Fenster gesucht. Draußen war es grau, aber im Café roch es nach frischem Kaffee. Manchmal braucht ein guter Tag gar nicht so viel.\n\nIch wollte meine Bestellung auf Deutsch sagen, ohne vorher jeden Satz im Kopf zu übersetzen. „Einen Cappuccino, bitte. Zum Hiertrinken.“ Es war nur ein kleiner Satz. Trotzdem habe ich mich danach ein bisschen mutiger gefühlt.\n\nAm Nebentisch hat jemand ein Buch gelesen. Ich habe ein paar Wörter in mein Notizbuch geschrieben: der Fensterplatz, der Milchschaum, sich trauen. Das letzte Wort gefällt mir heute besonders.\n\nVielleicht bedeutet Lernen manchmal einfach, einen Kaffee zu bestellen und nicht auf den perfekten Moment zu warten.\n\nDas ist ein Beispieleintrag. Die nächsten Geschichten schreibe ich selbst.",
  },
  {
    id: "970e2010-35d0-4dba-bb65-514e842ef002",
    title: "Ein Umweg durch die Stadt.",
    topic: "Unterwegs",
    photo: "berlin",
    alt: "Ein Blick über Berlin – ein Beispielfoto.",
    days: 2,
    body: "Heute bin ich eine Station früher ausgestiegen. Ich hatte keinen besonderen Plan. Ich wollte einfach ein Stück zu Fuß gehen und die Stadt ein bisschen besser kennenlernen.\n\nAuf dem Weg habe ich eine kleine Buchhandlung entdeckt. Im Schaufenster lag ein Buch mit einem Titel, den ich sofort verstanden habe. Das passiert mir inzwischen öfter, und ich freue mich jedes Mal darüber.\n\nIch glaube, dass man eine Stadt ähnlich kennenlernt wie eine Sprache: nicht alles auf einmal, sondern Straße für Straße, Wort für Wort.\n\nDas ist ein Beispieleintrag zum Kennenlernen des Tagebuchs.",
  },
  {
    id: "970e2010-35d0-4dba-bb65-514e842ef003",
    title: "Nicht perfekt. Aber ein Anfang.",
    topic: "Kleine Gedanken",
    photo: "coffee",
    alt: "Kaffee und ein ruhiger Moment – ein Beispielfoto.",
    days: 4,
    body: "Ich habe lange darüber nachgedacht, ob mein Deutsch schon gut genug für ein Tagebuch ist. Heute denke ich: Vielleicht wird es gerade durch das Schreiben besser.\n\nEin Text muss nicht fehlerfrei sein, um etwas zu erzählen. Er braucht zuerst einen Gedanken und jemanden, der zuhört.\n\nDeshalb gibt es dieses kleine Tagebuch. Hier möchte ich meinen Alltag festhalten, neue Wörter ausprobieren und aus euren Hinweisen lernen. Wenn euch eine Formulierung auffällt, könnt ihr direkt am Text einen Vorschlag hinterlassen.\n\nDanke fürs Mitlesen. Das ist erst der Anfang.\n\nDieser Beispieleintrag zeigt, wie ein persönlicher Text hier aussehen kann.",
  },
];
try {
  await client.connect();
  await client.query("BEGIN");
  for (const e of entries) {
    await client.query(
      "INSERT INTO entries(id,title,body,excerpt,topic,photos,status,example,published_at) VALUES($1,$2,$3,$4,$5,$6,'published',true,now()-$7::int*interval '1 day') ON CONFLICT(id) DO NOTHING",
      [
        e.id,
        e.title,
        e.body,
        e.body.split("\n\n")[0],
        e.topic,
        JSON.stringify([{ url: `/images/${e.photo}.jpg`, alt: e.alt }]),
        e.days,
      ],
    );
  }
  await client.query("COMMIT");
  console.log("Three clearly labeled example entries ready.");
} catch (e) {
  await client.query("ROLLBACK");
  console.error(e.message);
  process.exitCode = 1;
} finally {
  await client.end();
}
