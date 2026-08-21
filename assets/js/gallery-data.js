/* =========================================================================
   D'LAURENT PROFESSIONAL COLOMBIA — GALERÍA DE FOTOS Y VIDEOS
   -------------------------------------------------------------------------
   Este archivo alimenta la sección "Resultados" de la landing (fotos,
   antes/después y videos del proceso).

   NO EDITES ESTO A MANO si puedes evitarlo: usa el panel administrador
   en /admin.html, que genera este mismo archivo de forma visual (subir
   fotos/videos, escribir la descripción, elegir categoría, ordenar y
   descargar el archivo actualizado). Ver README.md → "Panel administrador".

   Si prefieres editarlo directamente:
   - type: "image" o "video"
   - category: "antes-despues" | "tinturado" | "video" | "resultado"
   - src: ruta del archivo dentro de assets/img/gallery/ (fotos) o
     assets/video/ (videos)
   - poster: (solo videos) imagen de portada mientras no se reproduce
   - caption: texto corto que se muestra sobre la imagen
   ========================================================================= */

const GALLERY = [
  {
    id: "g1",
    type: "image",
    category: "antes-despues",
    src: "assets/img/gallery/placeholder-1.svg",
    caption: "Antes / Después — Alisado en 1 hora",
  },
  {
    id: "g2",
    type: "video",
    category: "video",
    src: "",
    poster: "assets/img/gallery/placeholder-2.svg",
    caption: "Video: proceso completo en 1 hora",
  },
  {
    id: "g3",
    type: "image",
    category: "tinturado",
    src: "assets/img/gallery/placeholder-3.svg",
    caption: "Resultado profesional en cabello tinturado",
  },
  {
    id: "g4",
    type: "video",
    category: "video",
    src: "",
    poster: "assets/img/gallery/placeholder-4.svg",
    caption: "Video: aplicación paso a paso",
  },
  {
    id: "g5",
    type: "image",
    category: "antes-despues",
    src: "assets/img/gallery/placeholder-5.svg",
    caption: "Brillo y sedosidad de nivel profesional",
  },
  {
    id: "g6",
    type: "image",
    category: "resultado",
    src: "assets/img/gallery/placeholder-6.svg",
    caption: "Caída y suavidad de nivel salón",
  },
];
