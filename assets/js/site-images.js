/* =========================================================================
   D'LAURENT PROFESSIONAL COLOMBIA — IMAGEN DEL HERO Y FONDOS DE SECCIÓN
   -------------------------------------------------------------------------
   NO EDITES ESTO A MANO si puedes evitarlo: usa la pestaña "Imagen del
   hero y fondos" del panel administrador (/admin.html), que genera este
   mismo archivo de forma visual. Ver README.md → "Panel administrador".

   - hero.usePhoto: true para reemplazar la ilustración del hero por una
     foto o video real (hero.src). false = usar la ilustración de marca.
   - hero.mediaType: "image" o "video" — se detecta solo al subir el archivo.
   - sectionBackgrounds.<seccion>.enabled: true para mostrar una foto de
     fondo detrás del contenido de esa sección.
   - src: ruta del archivo en assets/img/backgrounds/.
   - tone: "light" (velo crema, para que el texto oscuro siga siendo
     legible) o "dark" (velo morado oscuro).
   - opacity: qué tan cubierta queda la foto por el velo (0-100). Más
     alto = texto más legible pero la foto se nota menos.
   ========================================================================= */

const SITE_IMAGES = {
  hero: {
    usePhoto: false,
    src: "",
    mediaType: "image",
    sizePct: 100,
  },
  sectionBackgrounds: {
    beneficios: { enabled: false, src: "", tone: "light", opacity: 88 },
    resultados: { enabled: false, src: "", tone: "light", opacity: 88 },
    productos: { enabled: false, src: "", tone: "light", opacity: 88 },
    testimonios: { enabled: false, src: "", tone: "light", opacity: 88 },
    registro: { enabled: false, src: "", tone: "dark", opacity: 78 },
    faq: { enabled: false, src: "", tone: "light", opacity: 88 },
  },
};
