/* =========================================================================
   CONFIGURACIÓN DE SUPABASE — pega aquí las llaves de tu proyecto
   -------------------------------------------------------------------------
   De dónde salen estos valores: Supabase → tu proyecto → ⚙️ Project
   Settings → API → "Project URL" y "anon public" key.

   Mientras estos valores digan "TU_...", el sitio sigue funcionando
   normalmente usando el contenido local (assets/js/gallery-data.js y
   assets/js/site-images.js) — no se rompe nada por no tenerlos aún.
   ========================================================================= */

const SUPABASE_URL = "https://tzkodlyldejuciufksqm.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR6a29kbHlsZGVqdWNpdWZrc3FtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODcyODI3ODYsImV4cCI6MjEwMjg1ODc4Nn0.KZ5l5VB_gUoOPUb8vb2nu_gd_YYBnuG0rc-FgzHtc80";

const SUPABASE_READY = SUPABASE_URL !== "TU_SUPABASE_URL" && SUPABASE_ANON_KEY !== "TU_SUPABASE_ANON_KEY";

let supabaseClient = null;

if (SUPABASE_READY && typeof supabase !== "undefined") {
  supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}
