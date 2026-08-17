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
