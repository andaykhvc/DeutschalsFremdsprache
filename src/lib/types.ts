export type Entry = {
  id: string;
  title: string;
  body: string;
  excerpt: string;
  topic: string;
  photos: { url: string; alt: string }[];
  status: "draft" | "published";
  version: number;
  created_at: string;
  updated_at: string;
  published_at: string | null;
  comment_count: number;
  correction_count: number;
  example: boolean;
};
export type Comment = {
  id: string;
  author_name: string;
  body: string;
  created_at: string;
};
export type Correction = {
  id: string;
  author_name: string;
  quote: string;
  replacement: string;
  reason: string;
  start_offset: number;
  end_offset: number;
  base_version: number;
  status: "pending" | "accepted" | "rejected";
  created_at: string;
};
export type Revision = {
  id: string;
  title: string;
  body: string;
  version: number;
  created_at: string;
};
export type Reader = {
  id: string;
  name: string;
  email: string;
  owner: boolean;
};
