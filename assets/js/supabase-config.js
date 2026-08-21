/* =========================================================================
   CONFIGURACIÓN DE SUPABASE — pega aquí las llaves de tu proyecto
   -------------------------------------------------------------------------
   De dónde salen estos valores: Supabase → tu proyecto → ⚙️ Project
   Settings → API → "Project URL" y "anon public" key.

   Mientras estos valores digan "TU_...", el sitio sigue funcionando
   normalmente usando el contenido local (assets/js/gallery-data.js y
   assets/js/site-images.js) — no se rompe nada por no tenerlos aún.
   ========================================================================= */

const SUPABASE_URL = "TU_SUPABASE_URL";
const SUPABASE_ANON_KEY = "TU_SUPABASE_ANON_KEY";

const SUPABASE_READY = SUPABASE_URL !== "TU_SUPABASE_URL" && SUPABASE_ANON_KEY !== "TU_SUPABASE_ANON_KEY";

let supabaseClient = null;

if (SUPABASE_READY && typeof supabase !== "undefined") {
  supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}
