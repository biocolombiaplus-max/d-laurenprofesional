/* =========================================================================
   PANEL ADMINISTRADOR — lógica (100% en el navegador, sin backend)
   ========================================================================= */
(function () {
  "use strict";

  /* Cambia este código para restringir el acceso al panel. No es seguridad
     real (el código vive en el navegador): es solo un filtro básico. */
  const ADMIN_PASSCODE = "dlaurent2024";
  const DRAFT_KEY = "dlaurent_gallery_draft";
  const AUTH_KEY = "dlaurent_admin_auth";

  /* ---------------------------------------------------------------------
     IndexedDB — guarda los archivos subidos para que la vista previa
     sobreviva a un refresco de página (solo en este navegador).
     --------------------------------------------------------------------- */
  const DB_NAME = "dlaurent_admin";
  const STORE = "files";
  let dbPromise = null;

  function getDB() {
    if (dbPromise) return dbPromise;
    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => req.result.createObjectStore(STORE);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    return dbPromise;
  }

  async function saveBlob(key, blob) {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite");
      tx.objectStore(STORE).put(blob, key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  async function getBlob(key) {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, "readonly");
      const req = tx.objectStore(STORE).get(key);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  }

  async function deleteBlob(key) {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite");
      tx.objectStore(STORE).delete(key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  /* ---------------------------------------------------------------------
     Gate
     --------------------------------------------------------------------- */
  function initGate() {
    const gate = document.getElementById("adminGate");
    const app = document.getElementById("adminApp");
    function unlock() {
      gate.hidden = true;
      app.hidden = false;
      initApp();
    }
    if (sessionStorage.getItem(AUTH_KEY) === "1") {
      unlock();
      return;
    }
    document.getElementById("gateSubmit").addEventListener("click", tryUnlock);
    document.getElementById("gatePasscode").addEventListener("keydown", (e) => {
      if (e.key === "Enter") tryUnlock();
    });
    function tryUnlock() {
      const val = document.getElementById("gatePasscode").value;
      if (val === ADMIN_PASSCODE) {
        sessionStorage.setItem(AUTH_KEY, "1");
        unlock();
      } else {
        document.getElementById("gatePasscode").style.borderColor = "#c94b4b";
        document.getElementById("gatePasscode").value = "";
        document.getElementById("gatePasscode").placeholder = "Código incorrecto, intenta de nuevo";
      }
    }
  }

  /* ---------------------------------------------------------------------
     App state
     --------------------------------------------------------------------- */
  let items = [];
  let toastTimer;

  function showToast(text) {
    const toast = document.getElementById("toast");
    document.getElementById("toastText").textContent = text;
    toast.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove("show"), 2600);
  }

  function loadInitialState() {
    const draft = localStorage.getItem(DRAFT_KEY);
    if (draft) {
      try {
        return JSON.parse(draft);
      } catch (e) {
        /* borrador corrupto: usar el archivo original */
      }
    }
    return typeof GALLERY !== "undefined" ? JSON.parse(JSON.stringify(GALLERY)) : [];
  }

  function saveDraft() {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(items));
  }

  function slugify(name) {
    const parts = name.split(".");
    const ext = parts.length > 1 ? parts.pop() : "";
    const base = parts
      .join(".")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
    return ext ? `${base}.${ext.toLowerCase()}` : base;
  }

  function uid() {
    return "item-" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }

  /* ---------------------------------------------------------------------
     Resolve a display src for an item: uploaded blob (this session/device)
     takes priority over the plain path, so previews work immediately.
     --------------------------------------------------------------------- */
  const blobUrlCache = new Map();

  async function resolveDisplaySrc(item, field /* 'src' | 'poster' */) {
    const blobKey = `${item.id}:${field}`;
    if (blobUrlCache.has(blobKey)) return blobUrlCache.get(blobKey);
    const blob = await getBlob(blobKey);
    if (blob) {
      const url = URL.createObjectURL(blob);
      blobUrlCache.set(blobKey, url);
      return url;
    }
    return item[field] || "";
  }

  async function renderManageList() {
    const list = document.getElementById("manageList");
    document.getElementById("itemCount").textContent = items.length;
    if (items.length === 0) {
      list.innerHTML = `<div class="admin-manage-empty">Aún no has agregado fotos o videos. Usa el formulario de la izquierda.</div>`;
      return;
    }
    const rows = await Promise.all(
      items.map(async (item, i) => {
        const thumb = await resolveDisplaySrc(item, item.type === "video" ? "poster" : "src");
        const label = GALLERY_CATEGORIES[item.category] || item.category;
        const pathShown = item.type === "video" ? item.src || "(sin video aún)" : item.src;
        return `
        <div class="admin-manage-item">
          <img src="${thumb || item.poster || item.src}" alt="">
          <div class="mi-info">
            <div class="mi-caption">${item.caption || "(sin descripción)"}</div>
            <div class="mi-meta">${item.type === "video" ? "🎬 Video" : "🖼️ Foto"} · ${label} · <code>${pathShown}</code></div>
          </div>
          <div class="mi-actions">
            <button data-up="${i}" title="Subir" ${i === 0 ? "disabled" : ""}>↑</button>
            <button data-down="${i}" title="Bajar" ${i === items.length - 1 ? "disabled" : ""}>↓</button>
            <button data-del="${i}" class="mi-delete" title="Eliminar">✕</button>
          </div>
        </div>`;
      })
    );
    list.innerHTML = rows.join("");

    list.querySelectorAll("[data-up]").forEach((b) =>
      b.addEventListener("click", () => moveItem(Number(b.dataset.up), -1))
    );
    list.querySelectorAll("[data-down]").forEach((b) =>
      b.addEventListener("click", () => moveItem(Number(b.dataset.down), 1))
    );
    list.querySelectorAll("[data-del]").forEach((b) =>
      b.addEventListener("click", () => deleteItem(Number(b.dataset.del)))
    );
  }

  async function renderPreview() {
    const grid = document.getElementById("previewGrid");
    renderGalleryGrid(grid, items);
    // swap in blob previews where available
    const cards = grid.querySelectorAll(".gallery-item");
    for (const card of cards) {
      const item = items[Number(card.dataset.index)];
      if (!item) continue;
      const field = item.type === "video" ? "poster" : "src";
      const src = await resolveDisplaySrc(item, field);
      const img = card.querySelector("img");
      if (img && src) img.src = src;
    }
  }

  function moveItem(index, dir) {
    const target = index + dir;
    if (target < 0 || target >= items.length) return;
    [items[index], items[target]] = [items[target], items[index]];
    persistAndRender();
  }

  async function deleteItem(index) {
    const item = items[index];
    if (!item) return;
    if (!confirm(`¿Eliminar "${item.caption || "este elemento"}" de la galería?`)) return;
    await deleteBlob(`${item.id}:src`);
    await deleteBlob(`${item.id}:poster`);
    items.splice(index, 1);
    persistAndRender();
    showToast("Elemento eliminado");
  }

  function persistAndRender() {
    saveDraft();
    renderManageList();
    renderPreview();
  }

  /* ---------------------------------------------------------------------
     Add-item form
     --------------------------------------------------------------------- */
  function initForm() {
    const typeRadios = document.querySelectorAll('input[name="itemType"]');
    const fileFieldLabel = document.getElementById("fileFieldLabel");
    const fileHint = document.getElementById("fileHint");
    const itemFile = document.getElementById("itemFile");
    const posterFieldWrap = document.getElementById("posterFieldWrap");
    const posterPathWrap = document.getElementById("posterPathWrap");
    const srcPathInput = document.getElementById("itemSrcPath");
    const srcPathLabel = document.getElementById("srcPathLabel");
    const previewBox = document.getElementById("itemPreviewBox");
    const previewImg = document.getElementById("itemPreviewImg");
    const previewLabel = document.getElementById("itemPreviewLabel");

    let currentType = "image";
    let pendingFile = null;
    let pendingPoster = null;

    function currentFolder() {
      return currentType === "video" ? "assets/video/" : "assets/img/gallery/";
    }

    typeRadios.forEach((r) =>
      r.addEventListener("change", () => {
        currentType = r.value;
        const isVideo = currentType === "video";
        fileFieldLabel.textContent = isVideo ? "Video (MP4)" : "Foto (JPG, PNG o WEBP)";
        itemFile.accept = isVideo ? "video/*" : "image/*";
        fileHint.textContent = isVideo
          ? "Sube el video en formato vertical (9:16) y peso ligero (ideal menos de 15 MB) para que cargue rápido."
          : "Se recomienda que ya esté recortada en formato vertical (3:4) para verse igual que en la landing.";
        posterFieldWrap.hidden = !isVideo;
        posterPathWrap.hidden = !isVideo;
        srcPathLabel.textContent = isVideo
          ? "Ruta del video (se autocompleta al elegir el archivo)"
          : "Ruta del archivo (se autocompleta al elegir el archivo)";
        pendingFile = null;
        pendingPoster = null;
        itemFile.value = "";
        srcPathInput.value = "";
        previewBox.hidden = true;
      })
    );

    itemFile.addEventListener("change", () => {
      const file = itemFile.files[0];
      if (!file) return;
      pendingFile = file;
      const slug = slugify(file.name);
      srcPathInput.value = currentFolder() + slug;
      if (currentType === "image") {
        const url = URL.createObjectURL(file);
        previewImg.src = url;
        previewLabel.textContent = file.name;
        previewBox.hidden = false;
      } else {
        previewBox.hidden = true;
        showToast("Video seleccionado: " + file.name);
      }
    });

    document.getElementById("itemPoster").addEventListener("change", (e) => {
      const file = e.target.files[0];
      if (!file) return;
      pendingPoster = file;
      document.getElementById("itemPosterPath").value = "assets/img/gallery/" + slugify(file.name);
      const url = URL.createObjectURL(file);
      previewImg.src = url;
      previewLabel.textContent = file.name + " (miniatura)";
      previewBox.hidden = false;
    });

    document.getElementById("addItemBtn").addEventListener("click", async () => {
      const caption = document.getElementById("itemCaption").value.trim();
      const category = document.getElementById("itemCategory").value;
      const srcPath = srcPathInput.value.trim();
      const posterPath = document.getElementById("itemPosterPath").value.trim();

      if (!caption) {
        showToast("Escribe una descripción antes de agregar");
        return;
      }
      if (currentType === "image" && !srcPath) {
        showToast("Selecciona una foto o escribe la ruta del archivo");
        return;
      }

      const id = uid();
      const newItem = {
        id,
        type: currentType,
        category,
        caption,
        src: currentType === "video" ? "" : srcPath,
        poster: currentType === "video" ? posterPath : undefined,
      };
      if (currentType === "video" && srcPath) newItem.src = srcPath;

      if (pendingFile) await saveBlob(`${id}:src`, pendingFile);
      if (pendingPoster) await saveBlob(`${id}:poster`, pendingPoster);

      items.push(newItem);
      persistAndRender();
      showToast("Agregado a la galería ✓");

      // reset form
      document.getElementById("itemCaption").value = "";
      srcPathInput.value = "";
      document.getElementById("itemPosterPath").value = "";
      itemFile.value = "";
      document.getElementById("itemPoster").value = "";
      pendingFile = null;
      pendingPoster = null;
      previewBox.hidden = true;
    });
  }

  /* ---------------------------------------------------------------------
     Export gallery-data.js
     --------------------------------------------------------------------- */
  function buildExportSource() {
    const clean = items.map((it) => {
      const out = { id: it.id, type: it.type, category: it.category, src: it.src, caption: it.caption };
      if (it.type === "video") out.poster = it.poster || "";
      return out;
    });
    const body = clean
      .map((it) => {
        const lines = [
          `    id: ${JSON.stringify(it.id)},`,
          `    type: ${JSON.stringify(it.type)},`,
          `    category: ${JSON.stringify(it.category)},`,
          `    src: ${JSON.stringify(it.src)},`,
        ];
        if (it.type === "video") lines.push(`    poster: ${JSON.stringify(it.poster)},`);
        lines.push(`    caption: ${JSON.stringify(it.caption)},`);
        return "  {\n" + lines.join("\n") + "\n  }";
      })
      .join(",\n");
    return `/* Generado por el Panel administrador — assets/js/gallery-data.js */\n\nconst GALLERY = [\n${body}\n];\n`;
  }

  function initDownload() {
    document.getElementById("downloadBtn").addEventListener("click", () => {
      const blob = new Blob([buildExportSource()], { type: "text/javascript" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "gallery-data.js";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      showToast("Archivo descargado — sigue las instrucciones para publicarlo");
    });
  }

  function initResetDraft() {
    document.getElementById("resetDraftBtn").addEventListener("click", () => {
      if (!confirm("Esto descarta tus cambios sin publicar y vuelve a cargar el archivo actual. ¿Continuar?")) return;
      localStorage.removeItem(DRAFT_KEY);
      items = typeof GALLERY !== "undefined" ? JSON.parse(JSON.stringify(GALLERY)) : [];
      persistAndRender();
      showToast("Borrador descartado");
    });
  }

  /* ---------------------------------------------------------------------
     Init
     --------------------------------------------------------------------- */
  function initApp() {
    items = loadInitialState();
    initForm();
    initDownload();
    initResetDraft();
    renderManageList();
    renderPreview();
  }

  document.addEventListener("DOMContentLoaded", initGate);
})();
