/* =========================================================================
   PANEL ADMINISTRADOR — lógica (conectado a Firebase: Auth + Firestore + Storage)
   Los cambios se publican al instante para todos los visitantes del sitio.
   ========================================================================= */
(function () {
  "use strict";

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

  function escapeHtml(str) {
    return String(str || "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }

  let toastTimer;
  function showToast(text) {
    const toast = document.getElementById("toast");
    document.getElementById("toastText").textContent = text;
    toast.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove("show"), 2600);
  }

  function setSaveStatus(state) {
    const el = document.getElementById("saveStatus");
    if (!el) return;
    el.classList.remove("saving", "error");
    if (state === "saving") {
      el.textContent = "Guardando…";
      el.classList.add("saving");
    } else if (state === "error") {
      el.textContent = "⚠ Error al guardar";
      el.classList.add("error");
    } else {
      el.textContent = "✓ En línea";
    }
  }

  /* ---------------------------------------------------------------------
     Firebase Storage upload
     --------------------------------------------------------------------- */
  async function uploadFile(folder, file) {
    const path = `${folder}/${Date.now()}-${slugify(file.name)}`;
    const ref = firebaseStorage.ref(path);
    await ref.put(file);
    return ref.getDownloadURL();
  }

  /* ---------------------------------------------------------------------
     Auth gate
     --------------------------------------------------------------------- */
  function initAuthGate() {
    if (typeof firebaseAuth === "undefined" || !firebaseAuth) {
      document.getElementById("adminNotConfigured").hidden = false;
      return;
    }

    firebaseAuth.onAuthStateChanged((user) => {
      const gate = document.getElementById("adminGate");
      const app = document.getElementById("adminApp");
      if (user) {
        gate.hidden = true;
        app.hidden = false;
        initApp();
      } else {
        app.hidden = true;
        gate.hidden = false;
      }
    });

    function tryLogin() {
      const email = document.getElementById("gateEmail").value.trim();
      const pass = document.getElementById("gatePasscode").value;
      const errorEl = document.getElementById("gateError");
      errorEl.textContent = "";
      firebaseAuth.signInWithEmailAndPassword(email, pass).catch((err) => {
        errorEl.textContent = "No se pudo iniciar sesión: correo o contraseña incorrectos.";
        console.warn(err);
      });
    }
    document.getElementById("gateSubmit").addEventListener("click", tryLogin);
    document.getElementById("gatePasscode").addEventListener("keydown", (e) => {
      if (e.key === "Enter") tryLogin();
    });
    document.getElementById("gateEmail").addEventListener("keydown", (e) => {
      if (e.key === "Enter") tryLogin();
    });
  }

  function initLogout() {
    document.getElementById("logoutBtn").addEventListener("click", () => firebaseAuth.signOut());
  }

  /* ---------------------------------------------------------------------
     Tabs
     --------------------------------------------------------------------- */
  function initTabs() {
    const tabs = document.querySelectorAll(".admin-tab");
    tabs.forEach((btn) => {
      btn.addEventListener("click", () => {
        const tab = btn.dataset.tab;
        tabs.forEach((b) => b.classList.toggle("active", b === btn));
        document.getElementById("tabGallery").hidden = tab !== "gallery";
        document.getElementById("tabImages").hidden = tab !== "images";
      });
    });
  }

  /* =======================================================================
     TAB 1 — Gallery (Resultados)
     ======================================================================= */
  const galleryDocRef = () => firebaseDb.collection("siteContent").doc("gallery");
  let items = [];

  async function loadGalleryState() {
    try {
      const snap = await galleryDocRef().get();
      if (snap.exists && Array.isArray(snap.data().items)) return snap.data().items;
    } catch (e) {
      console.warn("No se pudo leer la galería desde Firestore, usando el contenido local.", e);
    }
    return typeof GALLERY !== "undefined" ? JSON.parse(JSON.stringify(GALLERY)) : [];
  }

  async function saveGallery() {
    setSaveStatus("saving");
    try {
      await galleryDocRef().set({ items });
      setSaveStatus("ok");
    } catch (e) {
      console.error(e);
      setSaveStatus("error");
      showToast("No se pudo guardar. Revisa tu conexión e inténtalo de nuevo.");
    }
  }

  function renderManageList() {
    const list = document.getElementById("manageList");
    document.getElementById("itemCount").textContent = items.length;
    if (items.length === 0) {
      list.innerHTML = `<div class="admin-manage-empty">Aún no has agregado fotos o videos. Usa el formulario de la izquierda.</div>`;
      return;
    }
    list.innerHTML = items
      .map((item, i) => {
        const thumb = item.type === "video" ? item.poster || "" : item.src || "";
        const label = GALLERY_CATEGORIES[item.category] || item.category;
        const statusShown = item.type === "video" ? (item.src ? "Video listo" : "Sin video aún") : "Foto lista";
        return `
        <div class="admin-manage-item">
          <img src="${thumb}" alt="">
          <div class="mi-info">
            <div class="mi-caption">${escapeHtml(item.caption) || "(sin descripción)"}</div>
            <div class="mi-meta">${item.type === "video" ? "🎬 Video" : "🖼️ Foto"} · ${label} · ${statusShown}</div>
          </div>
          <div class="mi-actions">
            <button data-up="${i}" title="Subir" ${i === 0 ? "disabled" : ""}>↑</button>
            <button data-down="${i}" title="Bajar" ${i === items.length - 1 ? "disabled" : ""}>↓</button>
            <button data-del="${i}" class="mi-delete" title="Eliminar">✕</button>
          </div>
        </div>`;
      })
      .join("");

    list.querySelectorAll("[data-up]").forEach((b) => b.addEventListener("click", () => moveItem(Number(b.dataset.up), -1)));
    list.querySelectorAll("[data-down]").forEach((b) => b.addEventListener("click", () => moveItem(Number(b.dataset.down), 1)));
    list.querySelectorAll("[data-del]").forEach((b) => b.addEventListener("click", () => deleteItem(Number(b.dataset.del))));
  }

  function renderGalleryPreview() {
    renderGalleryGrid(document.getElementById("previewGrid"), items);
  }

  function moveItem(index, dir) {
    const target = index + dir;
    if (target < 0 || target >= items.length) return;
    [items[index], items[target]] = [items[target], items[index]];
    persistAndRenderGallery();
  }

  async function deleteItem(index) {
    const item = items[index];
    if (!item) return;
    if (!confirm(`¿Eliminar "${item.caption || "este elemento"}" de la galería? Esto se publica de inmediato.`)) return;
    items.splice(index, 1);
    await persistAndRenderGallery();
    showToast("Elemento eliminado");
  }

  async function persistAndRenderGallery() {
    renderManageList();
    renderGalleryPreview();
    await saveGallery();
  }

  function initGalleryForm() {
    const typeRadios = document.querySelectorAll('input[name="itemType"]');
    const fileFieldLabel = document.getElementById("fileFieldLabel");
    const fileHint = document.getElementById("fileHint");
    const itemFile = document.getElementById("itemFile");
    const posterFieldWrap = document.getElementById("posterFieldWrap");
    const previewBox = document.getElementById("itemPreviewBox");
    const previewImg = document.getElementById("itemPreviewImg");
    const previewLabel = document.getElementById("itemPreviewLabel");
    const addBtn = document.getElementById("addItemBtn");
    const progressEl = document.getElementById("uploadProgress");

    let currentType = "image";

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
        itemFile.value = "";
        previewBox.hidden = true;
      })
    );

    itemFile.addEventListener("change", () => {
      const file = itemFile.files[0];
      if (!file) return;
      if (currentType === "image") {
        previewImg.src = URL.createObjectURL(file);
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
      previewImg.src = URL.createObjectURL(file);
      previewLabel.textContent = file.name + " (miniatura)";
      previewBox.hidden = false;
    });

    addBtn.addEventListener("click", async () => {
      const caption = document.getElementById("itemCaption").value.trim();
      const category = document.getElementById("itemCategory").value;
      const file = itemFile.files[0];
      const posterFile = document.getElementById("itemPoster").files[0];

      if (!caption) {
        showToast("Escribe una descripción antes de agregar");
        return;
      }
      if (currentType === "image" && !file) {
        showToast("Selecciona una foto");
        return;
      }

      addBtn.disabled = true;
      progressEl.textContent = "Subiendo archivo… esto puede tardar unos segundos.";
      try {
        const id = uid();
        const newItem = { id, type: currentType, category, caption, src: "" };
        if (currentType === "image") {
          newItem.src = await uploadFile("gallery", file);
        } else {
          if (file) newItem.src = await uploadFile("gallery", file);
          if (posterFile) newItem.poster = await uploadFile("gallery", posterFile);
        }

        items.push(newItem);
        await persistAndRenderGallery();
        showToast("Agregado a la galería — ya está en línea ✓");

        document.getElementById("itemCaption").value = "";
        itemFile.value = "";
        document.getElementById("itemPoster").value = "";
        previewBox.hidden = true;
      } catch (e) {
        console.error(e);
        showToast("No se pudo subir el archivo. Verifica tu conexión e inténtalo de nuevo.");
      } finally {
        addBtn.disabled = false;
        progressEl.textContent = "";
      }
    });
  }

  /* =======================================================================
     TAB 2 — Hero image + section backgrounds
     ======================================================================= */
  const imagesDocRef = () => firebaseDb.collection("siteContent").doc("images");
  const SECTION_DEFS = [
    { key: "beneficios", label: "Beneficios" },
    { key: "resultados", label: "Resultados" },
    { key: "productos", label: "Productos" },
    { key: "testimonios", label: "Testimonios" },
    { key: "registro", label: "Capacitación / Distribuidores" },
    { key: "faq", label: "Preguntas frecuentes" },
  ];
  let siteImages = null;
  let saveImagesTimer = null;

  async function loadSiteImagesState() {
    try {
      const snap = await imagesDocRef().get();
      if (snap.exists) return snap.data();
    } catch (e) {
      console.warn("No se pudo leer la configuración de imágenes desde Firestore, usando el contenido local.", e);
    }
    return typeof SITE_IMAGES !== "undefined"
      ? JSON.parse(JSON.stringify(SITE_IMAGES))
      : { hero: { usePhoto: false, src: "" }, sectionBackgrounds: {} };
  }

  function scheduleSaveSiteImages() {
    setSaveStatus("saving");
    clearTimeout(saveImagesTimer);
    saveImagesTimer = setTimeout(async () => {
      try {
        await imagesDocRef().set(siteImages);
        setSaveStatus("ok");
      } catch (e) {
        console.error(e);
        setSaveStatus("error");
        showToast("No se pudo guardar. Revisa tu conexión e inténtalo de nuevo.");
      }
    }, 500);
  }

  function initHeroForm() {
    const radios = document.querySelectorAll('input[name="heroMode"]');
    const photoFields = document.getElementById("heroPhotoFields");
    const fileInput = document.getElementById("heroFile");
    const previewBox = document.getElementById("heroPreviewBox");
    const previewImg = document.getElementById("heroPreviewImg");

    const isPhoto = !!siteImages.hero.usePhoto;
    document.querySelector(`input[name="heroMode"][value="${isPhoto ? "photo" : "illustration"}"]`).checked = true;
    photoFields.hidden = !isPhoto;

    if (siteImages.hero.src) {
      previewImg.src = siteImages.hero.src;
      previewBox.hidden = false;
    }

    radios.forEach((r) =>
      r.addEventListener("change", () => {
        siteImages.hero.usePhoto = r.value === "photo";
        photoFields.hidden = r.value !== "photo";
        scheduleSaveSiteImages();
      })
    );

    fileInput.addEventListener("change", async () => {
      const file = fileInput.files[0];
      if (!file) return;
      showToast("Subiendo foto del hero…");
      try {
        const url = await uploadFile("backgrounds", file);
        siteImages.hero.src = url;
        previewImg.src = url;
        previewBox.hidden = false;
        scheduleSaveSiteImages();
        showToast("Foto del hero publicada ✓");
      } catch (e) {
        console.error(e);
        showToast("No se pudo subir la foto. Inténtalo de nuevo.");
      }
    });
  }

  function renderSectionBgList() {
    const container = document.getElementById("sectionBgList");
    container.innerHTML = SECTION_DEFS.map((def) => {
      const conf = siteImages.sectionBackgrounds[def.key] || { enabled: false, src: "", tone: "light", opacity: 85 };
      return `
      <div class="admin-bg-block${conf.enabled ? " enabled" : ""}" data-sec="${def.key}">
        <div class="admin-bg-head">
          <label><input type="checkbox" class="bg-enable" ${conf.enabled ? "checked" : ""}> ${def.label}</label>
        </div>
        <div class="admin-bg-fields">
          <div class="field">
            <label>Foto de fondo</label>
            <input type="file" class="bg-file" accept="image/*">
            <p class="admin-hint bg-filename">${conf.src ? "Foto cargada ✓" : "Sin foto aún"}</p>
          </div>
          <div class="field">
            <label>Velo e intensidad</label>
            <div class="admin-tone-row">
              <label><input type="radio" name="tone-${def.key}" class="bg-tone" value="light" ${conf.tone !== "dark" ? "checked" : ""}> Claro</label>
              <label><input type="radio" name="tone-${def.key}" class="bg-tone" value="dark" ${conf.tone === "dark" ? "checked" : ""}> Oscuro</label>
            </div>
            <div class="admin-range-row" style="margin-top:8px">
              <input type="range" class="bg-opacity" min="0" max="100" value="${conf.opacity ?? 85}">
              <span class="range-val">${conf.opacity ?? 85}%</span>
            </div>
          </div>
          <img class="admin-bg-thumb bg-thumb" src="${conf.src || ""}" alt="">
        </div>
      </div>`;
    }).join("");
  }

  function initSectionBackgrounds() {
    const container = document.getElementById("sectionBgList");

    container.addEventListener("change", async (e) => {
      const block = e.target.closest(".admin-bg-block");
      if (!block) return;
      const key = block.dataset.sec;
      if (!siteImages.sectionBackgrounds[key]) {
        siteImages.sectionBackgrounds[key] = { enabled: false, src: "", tone: "light", opacity: 85 };
      }
      const conf = siteImages.sectionBackgrounds[key];

      if (e.target.classList.contains("bg-enable")) {
        conf.enabled = e.target.checked;
        block.classList.toggle("enabled", conf.enabled);
        scheduleSaveSiteImages();
      } else if (e.target.classList.contains("bg-file")) {
        const file = e.target.files[0];
        if (!file) return;
        showToast("Subiendo foto de fondo…");
        try {
          const url = await uploadFile("backgrounds", file);
          conf.src = url;
          block.querySelector(".bg-thumb").src = url;
          block.querySelector(".bg-filename").textContent = "Foto cargada ✓";
          scheduleSaveSiteImages();
          showToast("Fondo publicado ✓");
        } catch (err) {
          console.error(err);
          showToast("No se pudo subir la foto. Inténtalo de nuevo.");
        }
      } else if (e.target.classList.contains("bg-tone")) {
        conf.tone = e.target.value;
        scheduleSaveSiteImages();
      }
    });

    container.addEventListener("input", (e) => {
      if (!e.target.classList.contains("bg-opacity")) return;
      const block = e.target.closest(".admin-bg-block");
      const key = block.dataset.sec;
      const conf = siteImages.sectionBackgrounds[key];
      conf.opacity = Number(e.target.value);
      block.querySelector(".range-val").textContent = conf.opacity + "%";
      scheduleSaveSiteImages();
    });
  }

  /* ---------------------------------------------------------------------
     Init
     --------------------------------------------------------------------- */
  async function initApp() {
    initLogout();
    initTabs();

    items = await loadGalleryState();
    initGalleryForm();
    renderManageList();
    renderGalleryPreview();

    siteImages = await loadSiteImagesState();
    initHeroForm();
    renderSectionBgList();
    initSectionBackgrounds();

    setSaveStatus("ok");
  }

  document.addEventListener("DOMContentLoaded", initAuthGate);
})();
