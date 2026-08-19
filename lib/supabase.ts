import { createClient } from "@supabase/supabase-js";

// Fallbacks evitam quebrar o build quando as env não estão presentes.
// Em runtime/deploy, as variáveis NEXT_PUBLIC_* são injetadas com os valores reais.
const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co";
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder-anon-key";

export const supabase = createClient(url, anon, {
  auth: { persistSession: true, autoRefreshToken: true },
});

export type Agent = {
  id: string;
  slug: string;
  name: string;
  kind: "orchestrator" | "subagent";
  area: string | null;
  status: string;
  is_active: boolean;
  config: any;
};

export type Task = {
  id: string;
  area: string | null;
  status: string;
  priority: string;
  objective: string;
  created_at: string;
  parent_task_id: string | null;
};

export type TaskLog = {
  id: number;
  task_id: string;
  level: string;
  message: string;
  created_at: string;
};

export type Result = {
  id: string;
  task_id: string;
  type: string;
  content: string;
  created_at: string;
};

export type PostQueue = {
  id: string;
  theme: string | null;
  caption: string | null;
  image_url: string | null;
  platforms: string[] | null;
  scheduled_for: string | null;
  status: string;
  created_at: string;
  published_at: string | null;
  ig_result: string | null;
  fb_result: string | null;
  campaign_id: string | null;
  likes: number | null;
  comments: number | null;
  fb_likes: number | null;
  fb_comments: number | null;
  metrics_at: string | null;
  type: string | null;
  images: string[] | null;
  video_url: string | null;
};

export type InboxConversation = {
  id: string;
  network: string;
  external_id: string;
  name: string | null;
  status: string;
  last_message_at: string | null;
};

export type InboxMessage = {
  id: number;
  conversation_id: string;
  direction: string;
  sender: string;
  text: string | null;
  created_at: string;
};

export type Client = {
  id: string;
  name: string;
  brand_brief: string | null;
  ig_handle: string | null;
  fb_page: string | null;
  status: string | null;
  notes: string | null;
};

export type Knowledge = {
  id: string;
  client_id: string | null;
  title: string | null;
  content: string;
  created_at: string;
};

export type Campaign = {
  id: string;
  name: string;
  objective: string | null;
  status: string;
  starts_on: string | null;
  ends_on: string | null;
  created_at: string;
};
