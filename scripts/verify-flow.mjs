// Exercises only synthetic accounts and a temporary entry; removes its own data afterwards.
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import pg from "pg";
import { del } from "@vercel/blob";
const base = "http://localhost:3000";
const db = new pg.Client({ connectionString: process.env.DATABASE_URL });
let owner, reader, entryId, blobUrl;
async function call(path, data, account, expected = 200) {
  const r = await fetch(base + "/api/diary/" + path, {
    method: data ? "POST" : "GET",
    headers: {
      Origin: base,
      ...(data ? { "Content-Type": "application/json" } : {}),
      ...(account ? { Cookie: account.cookies } : {}),
    },
    ...(data ? { body: JSON.stringify(data) } : {}),
  });
  const b = await r.json();
  assert.equal(r.status, expected, `${path}: ${JSON.stringify(b)}`);
  return b;
}
async function account(name) {
  const password = randomBytes(24).toString("base64url"),
    email = `qa-${randomBytes(8).toString("hex")}@example.com`;
  const r = await fetch(base + "/api/auth/sign-up/email", {
    method: "POST",
    headers: { Origin: base, "Content-Type": "application/json" },
    body: JSON.stringify({ name, email, password }),
  });
  const b = await r.json();
  assert.equal(r.status, 200, JSON.stringify(b));
  return {
    user: b.user,
    email,
    password,
    cookies: r.headers
      .getSetCookie()
      .map((c) => c.split(";")[0])
      .join("; "),
  };
}
try {
  await db.connect();
  const existing = await db.query(
    "SELECT value FROM site_settings WHERE key='owner_id'",
  );
  assert.equal(
    existing.rowCount,
    0,
    "Run only before the real owner claims this diary.",
  );
  reader = await account("QA Leser");
  owner = await account("QA Autor");
  await call("claim", { secret: process.env.OWNER_SETUP_SECRET }, owner);
  assert.equal((await call("me", null, owner)).user.owner, true);
  assert.equal((await call("me", null, reader)).user.owner, false);
  console.log("PASS: authenticated sessions and owner permissions");
  const payload = {
    title: "QA Eintrag – wird entfernt",
    body: "Heute ich lerne Deutsch. Ich trinke Kaffee.",
    topic: "QA",
    photos: [],
    status: "draft",
  };
  entryId = (await call("write", payload, owner)).id;
  await call("entry/" + entryId, null, null, 401);
  assert.equal(
    (await call("feed")).entries.some((e) => e.id === entryId),
    false,
  );
  await call("write", payload, reader, 403);
  await call("write", payload, null, 401);
  console.log("PASS: drafts remain private and readers cannot publish");
  await call(
    "write",
    { ...payload, id: entryId, version: 1, status: "published" },
    owner,
  );
  await call("comment", { entryId, body: "Ein Testkommentar." }, reader);
  const suggestion = {
    entryId,
    quote: "Heute ich lerne",
    replacement: "Heute lerne ich",
    reason: "Das Verb steht an zweiter Stelle.",
    start_offset: 0,
    end_offset: 15,
    base_version: 2,
  };
  await call("suggest", suggestion, reader);
  await call(
    "suggest",
    { ...suggestion, replacement: "Heute übe ich" },
    reader,
  );
  let detail = await call("entry/" + entryId);
  assert.equal(detail.comments.length, 1);
  assert.equal(detail.corrections.length, 2);
  await call(
    "review",
    { id: detail.corrections[0].id, decision: "accepted" },
    reader,
    403,
  );
  await call(
    "review",
    { id: detail.corrections[0].id, decision: "accepted" },
    owner,
  );
  detail = await call("entry/" + entryId);
  assert.match(detail.entry.body, /^Heute übe ich/);
  assert.equal(detail.revisions[0].body, payload.body);
  await call(
    "review",
    { id: detail.corrections[1].id, decision: "accepted" },
    owner,
    409,
  );
  await call(
    "write",
    { ...payload, id: entryId, version: 2, status: "published" },
    owner,
    409,
  );
  console.log(
    "PASS: comments, correction acceptance, original revisions, stale-edit protection",
  );
  const noOrigin = await fetch(base + "/api/diary/comment", {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: reader.cookies },
    body: JSON.stringify({ entryId, body: "blocked" }),
  });
  assert.equal(noOrigin.status, 403);
  console.log("PASS: cross-origin write protection");
  const form = new FormData();
  form.set(
    "file",
    new Blob([await readFile("public/images/coffee.jpg")], {
      type: "image/jpeg",
    }),
    "qa.jpg",
  );
  const up = await fetch(base + "/api/diary/upload", {
    method: "POST",
    headers: { Origin: base, Cookie: owner.cookies },
    body: form,
  });
  const blob = await up.json();
  assert.equal(up.status, 200, JSON.stringify(blob));
  blobUrl = blob.url;
  assert.equal((await fetch(blobUrl)).status, 200);
  console.log("PASS: real Vercel Blob upload and public image retrieval");
  await writeFile(
    "artifacts/verification.txt",
    "PASS: sessions, roles, private drafts, publish, comments, corrections, revision history, stale versions, CSRF, real photo upload.\n",
  );
} finally {
  if (entryId) await db.query("DELETE FROM entries WHERE id=$1", [entryId]);
  if (owner)
    await db.query(
      "DELETE FROM site_settings WHERE key='owner_id' AND value=$1",
      [owner.user.id],
    );
  if (blobUrl) await del(blobUrl);
  for (const a of [owner, reader].filter(Boolean)) {
    await fetch(base + "/api/auth/sign-out", {
      method: "POST",
      headers: {
        Origin: base,
        "Content-Type": "application/json",
        Cookie: a.cookies,
      },
      body: "{}",
    });
  }
  await db.end();
}
