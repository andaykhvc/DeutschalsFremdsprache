import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { database } from "@/lib/db";
import { auth } from "@/lib/auth/server";
import { Notebook } from "@/components/notebook";
import type { Detail } from "@/components/entry-detail";
export const dynamic = "force-dynamic";
async function canReadDraft() {
  const { data: s } = await auth().getSession();
  if (!s?.user) return false;
  const r = await database().query(
    "SELECT value FROM site_settings WHERE key='owner_id'",
  );
  return r.rows[0]?.value === s.user.id;
}
export async function generateMetadata({
  params,
}: {
  params: Promise<{ view?: string[] }>;
}): Promise<Metadata> {
  const { view } = await params;
  if (view?.[0] === "eintrag" && /^[0-9a-f-]{36}$/.test(view[1] || "")) {
    const r = await database().query(
      "SELECT title,excerpt FROM entries WHERE id=$1 AND status='published'",
      [view[1]],
    );
    if (r.rows[0])
      return { title: r.rows[0].title, description: r.rows[0].excerpt };
  }
  return view?.length ? { robots: { index: false, follow: false } } : {};
}
export default async function Page({
  params,
}: {
  params: Promise<{ view?: string[] }>;
}) {
  const { view = [] } = await params;
  if (view.length && !["eintrag", "schreiben", "entwuerfe"].includes(view[0]))
    notFound();
  if (
    view.length > 2 ||
    (view[0] === "eintrag" && !view[1]) ||
    (view[1] && !/^[0-9a-f-]{36}$/.test(view[1]))
  )
    notFound();
  const feed = await database().query(
    "SELECT e.*, (SELECT count(*)::int FROM comments c WHERE c.entry_id=e.id) AS comment_count,(SELECT count(*)::int FROM corrections c WHERE c.entry_id=e.id AND c.status='pending') AS correction_count FROM entries e WHERE status='published' ORDER BY published_at DESC LIMIT 100",
  );
  let detail: Detail | undefined;
  if (view[1]) {
    const r = await database().query("SELECT * FROM entries WHERE id=$1", [
      view[1],
    ]);
    if (!r.rows[0]) notFound();
    if (r.rows[0].status !== "published" && !(await canReadDraft())) notFound();
    const [c, s, h] = await Promise.all([
      database().query(
        "SELECT id,author_name,body,created_at FROM comments WHERE entry_id=$1 ORDER BY created_at",
        [view[1]],
      ),
      database().query(
        "SELECT id,author_name,quote,replacement,reason,start_offset,end_offset,base_version,status,created_at FROM corrections WHERE entry_id=$1 ORDER BY created_at DESC",
        [view[1]],
      ),
      database().query(
        "SELECT id,title,body,version,created_at FROM revisions WHERE entry_id=$1 ORDER BY version DESC LIMIT 100",
        [view[1]],
      ),
    ]);
    detail = JSON.parse(
      JSON.stringify({
        entry: r.rows[0],
        comments: c.rows,
        corrections: s.rows,
        revisions: h.rows,
      }),
    );
  }
  return (
    <Notebook
      entries={JSON.parse(JSON.stringify(feed.rows))}
      detail={detail}
      view={view}
    />
  );
}
