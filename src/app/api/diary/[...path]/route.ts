import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { timingSafeEqual } from "node:crypto";
import { put } from "@vercel/blob";
import { database, transaction } from "@/lib/db";
import { auth } from "@/lib/auth/server";
import { applyCorrection } from "@/lib/corrections";
export const dynamic = "force-dynamic";
class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
const uuid = z.string().uuid();
const entrySchema = z.object({
  id: uuid.optional(),
  version: z.number().int().positive().optional(),
  title: z.string().trim().min(1).max(180),
  body: z.string().trim().min(1).max(100000),
  topic: z.string().trim().min(1).max(40),
  status: z.enum(["draft", "published"]),
  photos: z
    .array(
      z.object({
        url: z
          .string()
          .max(2000)
          .refine(
            (s) =>
              /^https:\/\/[a-zA-Z0-9-]+\.public\.blob\.vercel-storage\.com\//.test(
                s,
              ) || /^\/images\/[a-zA-Z0-9._-]+$/.test(s),
          ),
        alt: z.string().trim().min(1).max(300),
      }),
    )
    .max(12),
});
async function reader() {
  const { data: session } = await auth().getSession();
  if (!session?.user) return null;
  const { rows } = await database().query(
    "SELECT value FROM site_settings WHERE key='owner_id'",
  );
  return {
    id: session.user.id,
    name: session.user.name || "Leser:in",
    email: session.user.email,
    owner: rows[0]?.value === session.user.id,
  };
}
async function requireReader(owner = false) {
  const user = await reader();
  if (!user) throw new HttpError(401, "Bitte melde dich zuerst an.");
  if (owner && !user.owner)
    throw new HttpError(403, "Nur der Autor kann diese Aktion ausführen.");
  return user;
}
async function limit(user: string, action: string, max = 12) {
  const key = `${action}:${user}:${Math.floor(Date.now() / 60000)}`;
  const result = await database().query(
    "INSERT INTO rate_limits(key,count,expires_at) VALUES($1,1,now()+interval '2 minutes') ON CONFLICT(key) DO UPDATE SET count=rate_limits.count+1 WHERE rate_limits.count<$2 RETURNING count",
    [key, max],
  );
  if (!result.rowCount)
    throw new HttpError(429, "Zu viele Versuche. Bitte warte eine Minute.");
  await database().query("DELETE FROM rate_limits WHERE expires_at<now()");
}
function fail(error: unknown) {
  if (error instanceof HttpError)
    return NextResponse.json(
      { error: error.message },
      { status: error.status },
    );
  if (error instanceof z.ZodError)
    return NextResponse.json(
      { error: "Bitte prüfe die Eingaben und die Länge deiner Texte." },
      { status: 400 },
    );
  console.error(
    "Diary request failed:",
    error instanceof Error ? error.name : "unknown",
  );
  return NextResponse.json(
    { error: "Das hat gerade nicht geklappt. Bitte versuche es erneut." },
    { status: 500 },
  );
}
export async function GET(
  req: NextRequest,
  context: { params: Promise<{ path: string[] }> },
) {
  try {
    const { path } = await context.params;
    const action = path[0];
    if (action === "me") {
      const user = await reader();
      const result = await database().query(
        "SELECT EXISTS(SELECT 1 FROM site_settings WHERE key='owner_id') AS claimed",
      );
      return NextResponse.json({ user, claimed: result.rows[0].claimed });
    }
    if (action === "feed") {
      const drafts = req.nextUrl.searchParams.get("drafts") === "1";
      if (drafts) await requireReader(true);
      const { rows } = await database().query(
        `SELECT e.*, (SELECT count(*)::int FROM comments c WHERE c.entry_id=e.id) AS comment_count,(SELECT count(*)::int FROM corrections c WHERE c.entry_id=e.id AND c.status='pending') AS correction_count FROM entries e WHERE status=$1 ORDER BY COALESCE(published_at,created_at) DESC LIMIT 100`,
        [drafts ? "draft" : "published"],
      );
      return NextResponse.json({ entries: rows });
    }
    if (action === "entry") {
      const id = uuid.parse(path[1]);
      const { rows } = await database().query(
        "SELECT * FROM entries WHERE id=$1",
        [id],
      );
      const entry = rows[0];
      if (!entry)
        throw new HttpError(404, "Dieser Eintrag wurde nicht gefunden.");
      if (entry.status !== "published") await requireReader(true);
      const [comments, corrections, revisions] = await Promise.all([
        database().query(
          "SELECT id,author_name,body,created_at FROM comments WHERE entry_id=$1 ORDER BY created_at",
          [id],
        ),
        database().query(
          "SELECT id,author_name,quote,replacement,reason,start_offset,end_offset,base_version,status,created_at FROM corrections WHERE entry_id=$1 ORDER BY created_at DESC",
          [id],
        ),
        database().query(
          "SELECT id,title,body,version,created_at FROM revisions WHERE entry_id=$1 ORDER BY version DESC LIMIT 100",
          [id],
        ),
      ]);
      return NextResponse.json({
        entry,
        comments: comments.rows,
        corrections: corrections.rows,
        revisions: revisions.rows,
      });
    }
    throw new HttpError(404, "Nicht gefunden.");
  } catch (error) {
    return fail(error);
  }
}
export async function POST(
  req: NextRequest,
  context: { params: Promise<{ path: string[] }> },
) {
  try {
    const origin = req.headers.get("origin");
    if (
      !origin ||
      ![req.nextUrl.origin, process.env.NEXT_PUBLIC_SITE_URL].includes(origin)
    )
      throw new HttpError(403, "Diese Anfrage ist nicht erlaubt.");
    const { path } = await context.params;
    const action = path[0];
    if (action === "upload") {
      const user = await requireReader(true);
      await limit(user.id, "upload", 15);
      if (Number(req.headers.get("content-length") || 0) > 3500000)
        throw new HttpError(413, "Das Foto darf höchstens 3 MB groß sein.");
      const data = await req.formData();
      const file = data.get("file");
      if (
        !(file instanceof File) ||
        file.size > 3000000 ||
        !["image/jpeg", "image/png", "image/webp"].includes(file.type)
      )
        throw new HttpError(
          400,
          "Bitte ein JPEG-, PNG- oder WebP-Foto bis 3 MB wählen.",
        );
      const bytes = new Uint8Array(await file.arrayBuffer());
      const jpeg = bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
      const png =
        bytes[0] === 137 &&
        bytes[1] === 80 &&
        bytes[2] === 78 &&
        bytes[3] === 71;
      const webp =
        String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" &&
        String.fromCharCode(...bytes.slice(8, 12)) === "WEBP";
      if (!(
        (file.type === "image/jpeg" && jpeg) ||
        (file.type === "image/png" && png) ||
        (file.type === "image/webp" && webp)
      ))
        throw new HttpError(400, "Die Datei ist kein unterstütztes Foto.");
      const ext = file.type === "image/jpeg" ? "jpg" : file.type.split("/")[1];
      const blob = await put(
        `diary/${crypto.randomUUID()}.${ext}`,
        Buffer.from(bytes),
        { access: "public", contentType: file.type, addRandomSuffix: true },
      );
      return NextResponse.json({ url: blob.url });
    }
    if (Number(req.headers.get("content-length") || 0) > 450000)
      throw new HttpError(413, "Der Text ist zu lang.");
    const data = await req.json();
    if (action === "claim") {
      const user = await requireReader();
      await limit(user.id, "claim", 5);
      const input = z
        .object({ secret: z.string().min(20).max(200) })
        .parse(data);
      const expected = process.env.OWNER_SETUP_SECRET;
      if (
        !expected ||
        Buffer.byteLength(input.secret) !== Buffer.byteLength(expected) ||
        !timingSafeEqual(Buffer.from(input.secret), Buffer.from(expected))
      )
        throw new HttpError(403, "Der Einrichtungscode stimmt nicht.");
      const result = await database().query(
        "INSERT INTO site_settings(key,value) VALUES('owner_id',$1) ON CONFLICT(key) DO NOTHING RETURNING value",
        [user.id],
      );
      if (!result.rowCount)
        throw new HttpError(409, "Das Tagebuch hat bereits einen Autor.");
      return NextResponse.json({ ok: true });
    }
    if (action === "write") {
      const user = await requireReader(true);
      await limit(user.id, "write", 60);
      const input = entrySchema.parse(data);
      const excerpt = input.body.replace(/\s+/g, " ").slice(0, 190);
      const id = await transaction(async (c) => {
        if (input.id) {
          const old = await c.query(
            "SELECT * FROM entries WHERE id=$1 FOR UPDATE",
            [input.id],
          );
          const entry = old.rows[0];
          if (!entry) throw new HttpError(404, "Eintrag nicht gefunden.");
          if (input.version !== entry.version)
            throw new HttpError(
              409,
              "Der Eintrag wurde inzwischen geändert. Bitte neu laden; dein Entwurf bleibt lokal erhalten.",
            );
          await c.query(
            "INSERT INTO revisions(entry_id,title,body,version) VALUES($1,$2,$3,$4) ON CONFLICT DO NOTHING",
            [input.id, entry.title, entry.body, entry.version],
          );
          await c.query(
            "UPDATE entries SET title=$2,body=$3,excerpt=$4,topic=$5,photos=$6,status=$7,version=version+1,updated_at=now(),published_at=CASE WHEN $7='published' THEN COALESCE(published_at,now()) ELSE published_at END,example=false WHERE id=$1",
            [
              input.id,
              input.title,
              input.body,
              excerpt,
              input.topic,
              JSON.stringify(input.photos),
              input.status,
            ],
          );
          return input.id;
        }
        const result = await c.query(
          "INSERT INTO entries(title,body,excerpt,topic,photos,status,published_at) VALUES($1,$2,$3,$4,$5,$6,CASE WHEN $6='published' THEN now() END) RETURNING id",
          [
            input.title,
            input.body,
            excerpt,
            input.topic,
            JSON.stringify(input.photos),
            input.status,
          ],
        );
        return result.rows[0].id;
      });
      return NextResponse.json({ id });
    }
    if (action === "comment" || action === "suggest") {
      const user = await requireReader();
      await limit(user.id, action);
      const id = uuid.parse(data.entryId);
      if (action === "comment") {
        const body = z.string().trim().min(1).max(2000).parse(data.body);
        const result = await database().query(
          "INSERT INTO comments(entry_id,user_id,author_name,body) SELECT id,$2,$3,$4 FROM entries WHERE id=$1 AND status='published' RETURNING id",
          [id, user.id, user.name.slice(0, 100), body],
        );
        if (!result.rowCount)
          throw new HttpError(404, "Eintrag nicht gefunden.");
        return NextResponse.json({ ok: true });
      }
      const input = z
        .object({
          quote: z.string().min(1).max(4000),
          replacement: z.string().max(4000),
          reason: z.string().trim().min(1).max(2000),
          start_offset: z.number().int().nonnegative(),
          end_offset: z.number().int().positive(),
          base_version: z.number().int().positive(),
        })
        .parse(data);
      await transaction(async (c) => {
        const result = await c.query(
          "SELECT * FROM entries WHERE id=$1 AND status='published' FOR SHARE",
          [id],
        );
        const entry = result.rows[0];
        if (!entry) throw new HttpError(404, "Eintrag nicht gefunden.");
        try {
          applyCorrection(entry.body, entry.version, input);
        } catch (e) {
          throw new HttpError(409, (e as Error).message);
        }
        await c.query(
          "INSERT INTO corrections(entry_id,user_id,author_name,quote,replacement,reason,start_offset,end_offset,base_version) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)",
          [
            id,
            user.id,
            user.name.slice(0, 100),
            input.quote,
            input.replacement,
            input.reason,
            input.start_offset,
            input.end_offset,
            input.base_version,
          ],
        );
      });
      return NextResponse.json({ ok: true });
    }
    if (action === "review") {
      const user = await requireReader(true);
      await limit(user.id, "review", 60);
      const input = z
        .object({ id: uuid, decision: z.enum(["accepted", "rejected"]) })
        .parse(data);
      await transaction(async (c) => {
        // Always lock the entry before its corrections, including edits and concurrent reviews.
        const info = await c.query(
          "SELECT entry_id FROM corrections WHERE id=$1",
          [input.id],
        );
        if (!info.rows[0])
          throw new HttpError(404, "Vorschlag nicht gefunden.");
        const old = await c.query(
          "SELECT * FROM entries WHERE id=$1 FOR UPDATE",
          [info.rows[0].entry_id],
        );
        const entry = old.rows[0];
        const result = await c.query(
          "SELECT * FROM corrections WHERE id=$1 FOR UPDATE",
          [input.id],
        );
        const correction = result.rows[0];
        if (correction.status !== "pending")
          throw new HttpError(
            409,
            "Dieser Vorschlag wurde bereits bearbeitet.",
          );
        if (input.decision === "accepted") {
          let body;
          try {
            body = applyCorrection(entry.body, entry.version, correction);
          } catch (e) {
            throw new HttpError(409, (e as Error).message);
          }
          await c.query(
            "INSERT INTO revisions(entry_id,title,body,version) VALUES($1,$2,$3,$4) ON CONFLICT DO NOTHING",
            [entry.id, entry.title, entry.body, entry.version],
          );
          await c.query(
            "UPDATE entries SET body=$2,excerpt=$3,version=version+1,updated_at=now() WHERE id=$1",
            [entry.id, body, body.replace(/\s+/g, " ").slice(0, 190)],
          );
        }
        await c.query(
          "UPDATE corrections SET status=$2,reviewed_at=now() WHERE id=$1",
          [input.id, input.decision],
        );
      });
      return NextResponse.json({ ok: true });
    }
    throw new HttpError(404, "Nicht gefunden.");
  } catch (error) {
    return fail(error);
  }
}
