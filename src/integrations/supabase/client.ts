// This file is automatically generated. Do not edit it directly.
import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";

const SUPABASE_URL = "https://bjgimiidedxlzhlzjequ.supabase.co";
const SUPABASE_PUBLISHABLE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJqZ2ltaWlkZWR4bHpobHpqZXF1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzc0OTE3NjYsImV4cCI6MjA1MzA2Nzc2Nn0.AEKbBPYh_rHdRBL9POSVD82wvLuIju2dwfPBzTzl4Po";

export const supabase = createClient<Database>(
  SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY
);
