/* =========================================================================
   Render compartido de la galería — usado por index.html (sitio público)
   y por admin.html (vista previa del panel administrador).
   ========================================================================= */
const GALLERY_CATEGORIES = {
  "antes-despues": "Antes / Después",
  tinturado: "Cabello tinturado",
  video: "Videos del proceso",
  resultado: "Resultado",
};

function galleryCardHTML(item, index) {
  const label = item.caption || "";
  const isVideo = item.type === "video";
  const playBtn = isVideo ? `<span class="play">▶</span>` : "";

  let media;
  if (isVideo && item.poster) {
    // Video con miniatura subida manualmente.
    media = `<img src="${item.poster}" alt="${label}" loading="lazy">`;
  } else if (isVideo && item.src) {
    // Sin miniatura: usamos el propio video y lo posicionamos en el
    // segundo 0.5 para que se vea un fotograma real como "portada",
    // sin necesidad de que el video se reproduzca.
    media = `<video class="gallery-thumb-video" src="${item.src}#t=0.5" muted preload="metadata" playsinline></video>`;
  } else if (!isVideo && item.src) {
    media = `<img src="${item.src}" alt="${label}" loading="lazy">`;
  } else {
    media = `<span class="g-icon">${isVideo ? "🎬" : "✨"}</span>`;
  }

  return `
    <div class="gallery-item" data-index="${index}" data-category="${item.category}" tabindex="0" role="button" aria-label="${label}">
      ${media}
      ${playBtn}
      <span class="g-label">${label}</span>
    </div>`;
}

function renderGalleryGrid(container, items) {
  if (!container) return;
  if (items.length === 0) {
    container.innerHTML = `<p class="gallery-note" style="grid-column:1/-1">Aún no hay fotos o videos en esta categoría.</p>`;
    return;
  }
  container.innerHTML = items.map((item, i) => galleryCardHTML(item, i)).join("");
}

/* ---------------------------------------------------------------------
   Lightbox (usado solo en el sitio público)
   --------------------------------------------------------------------- */
function initGalleryLightbox(container, getItems, onMissingVideo) {
  const modal = document.getElementById("lightboxModal");
  if (!modal) return;
  const body = document.getElementById("lightboxBody");
  const captionEl = document.getElementById("lightboxCaption");
  const closeBtn = document.getElementById("lightboxClose");

  function open(item) {
    if (item.type === "video" && !item.src) {
      if (onMissingVideo) onMissingVideo();
      return;
    }
    body.innerHTML =
      item.type === "video"
        ? `<video src="${item.src}" poster="${item.poster || ""}" controls autoplay playsinline></video>`
        : `<img src="${item.src}" alt="${item.caption || ""}">`;
    captionEl.textContent = item.caption || "";
    modal.classList.add("show");
  }
  function close() {
    modal.classList.remove("show");
    body.innerHTML = "";
  }

  container.addEventListener("click", (e) => {
    const card = e.target.closest(".gallery-item");
    if (!card) return;
    const items = getItems();
    open(items[Number(card.dataset.index)]);
  });
  container.addEventListener("keydown", (e) => {
    if (e.key !== "Enter" && e.key !== " ") return;
    const card = e.target.closest(".gallery-item");
    if (!card) return;
    e.preventDefault();
    const items = getItems();
    open(items[Number(card.dataset.index)]);
  });
  closeBtn.addEventListener("click", close);
  modal.addEventListener("click", (e) => {
    if (e.target === modal) close();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") close();
  });
}
