/* =========================================================================
   PANEL ADMINISTRADOR — lógica (conectado a Supabase: Auth + Database + Storage)
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
     Supabase Storage upload
     --------------------------------------------------------------------- */
  async function uploadFile(folder, file) {
    const path = `${folder}/${Date.now()}-${slugify(file.name)}`;
    const { error } = await supabaseClient.storage.from("media").upload(path, file, { upsert: true });
    if (error) throw error;
    const { data } = supabaseClient.storage.from("media").getPublicUrl(path);
    return data.publicUrl;
  }

  /* ---------------------------------------------------------------------
     Auth gate
     --------------------------------------------------------------------- */
  function initAuthGate() {
    if (typeof supabaseClient === "undefined" || !supabaseClient) {
      document.getElementById("adminNotConfigured").hidden = false;
      return;
    }

    let appStarted = false;
    function showApp() {
      document.getElementById("adminGate").hidden = true;
      document.getElementById("adminApp").hidden = false;
      if (!appStarted) {
        appStarted = true;
        initApp();
      }
    }
    function showGate() {
      document.getElementById("adminApp").hidden = true;
      document.getElementById("adminGate").hidden = false;
    }

    supabaseClient.auth.onAuthStateChange((_event, session) => {
      if (session) showApp();
      else showGate();
    });

    function tryLogin() {
      const email = document.getElementById("gateEmail").value.trim();
      const pass = document.getElementById("gatePasscode").value;
      const errorEl = document.getElementById("gateError");
      errorEl.textContent = "";
      supabaseClient.auth.signInWithPassword({ email, password: pass }).then(({ error }) => {
        if (error) {
          errorEl.textContent = "No se pudo iniciar sesión: correo o contraseña incorrectos.";
          console.warn(error);
        }
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
    document.getElementById("logoutBtn").addEventListener("click", () => supabaseClient.auth.signOut());
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
        document.getElementById("tabBenefits").hidden = tab !== "benefits";
      });
    });
  }

  /* =======================================================================
     TAB 1 — Gallery (Resultados)
     ======================================================================= */
  let items = [];

  async function loadGalleryState() {
    try {
      const { data, error } = await supabaseClient.from("site_content").select("data").eq("key", "gallery").maybeSingle();
      if (error) throw error;
      if (data && Array.isArray(data.data.items)) return data.data.items;
    } catch (e) {
      console.warn("No se pudo leer la galería desde Supabase, usando el contenido local.", e);
    }
    return typeof GALLERY !== "undefined" ? JSON.parse(JSON.stringify(GALLERY)) : [];
  }

  async function saveGallery() {
    setSaveStatus("saving");
    try {
      const { error } = await supabaseClient.from("site_content").upsert({ key: "gallery", data: { items } });
      if (error) throw error;
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
        const label = GALLERY_CATEGORIES[item.category] || item.category;
        const statusShown = item.type === "video" ? (item.src ? "Video listo" : "Sin video aún") : "Foto lista";
        let thumbHtml;
        if (item.type === "video" && item.poster) {
          thumbHtml = `<img src="${item.poster}" alt="">`;
        } else if (item.type === "video" && item.src) {
          thumbHtml = `<video src="${item.src}#t=0.5" muted preload="metadata" playsinline></video>`;
        } else {
          thumbHtml = `<img src="${item.src || ""}" alt="">`;
        }
        return `
        <div class="admin-manage-item">
          ${thumbHtml}
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
      const { data, error } = await supabaseClient.from("site_content").select("data").eq("key", "images").maybeSingle();
      if (error) throw error;
      if (data) return data.data;
    } catch (e) {
      console.warn("No se pudo leer la configuración de imágenes desde Supabase, usando el contenido local.", e);
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
        const { error } = await supabaseClient.from("site_content").upsert({ key: "images", data: siteImages });
        if (error) throw error;
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
    const previewVideo = document.getElementById("heroPreviewVideo");
    const fileWarning = document.getElementById("heroFileWarning");
    const sizeRange = document.getElementById("heroSizeRange");
    const sizeVal = document.getElementById("heroSizeVal");

    const isPhoto = !!siteImages.hero.usePhoto;
    document.querySelector(`input[name="heroMode"][value="${isPhoto ? "photo" : "illustration"}"]`).checked = true;
    photoFields.hidden = !isPhoto;

    function showPreview(url, mediaType) {
      if (mediaType === "video") {
        previewVideo.src = url;
        previewVideo.hidden = false;
        previewImg.hidden = true;
      } else {
        previewImg.src = url;
        previewImg.hidden = false;
        previewVideo.hidden = true;
      }
      previewBox.hidden = false;
    }

    if (siteImages.hero.src) {
      showPreview(siteImages.hero.src, siteImages.hero.mediaType);
    }

    sizeRange.value = siteImages.hero.sizePct || 100;
    sizeVal.textContent = sizeRange.value + "%";
    sizeRange.addEventListener("input", () => {
      siteImages.hero.sizePct = Number(sizeRange.value);
      sizeVal.textContent = sizeRange.value + "%";
      scheduleSaveSiteImages();
    });

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
      const mediaType = file.type.startsWith("video/") ? "video" : "image";
      const MAX_VIDEO_MB = 15;
      fileWarning.hidden = true;
      if (mediaType === "video" && file.size > MAX_VIDEO_MB * 1024 * 1024) {
        fileWarning.textContent = `⚠ Este video pesa ${(file.size / 1024 / 1024).toFixed(1)} MB — más de ${MAX_VIDEO_MB} MB puede hacer que tu página cargue lenta. Se subirá igual, pero considera comprimirlo.`;
        fileWarning.hidden = false;
      }
      showToast(mediaType === "video" ? "Subiendo video…" : "Subiendo foto del hero…");
      try {
        const url = await uploadFile("backgrounds", file);
        siteImages.hero.src = url;
        siteImages.hero.mediaType = mediaType;
        showPreview(url, mediaType);
        scheduleSaveSiteImages();
        showToast(mediaType === "video" ? "Video publicado ✓" : "Foto del hero publicada ✓");
      } catch (e) {
        console.error(e);
        showToast("No se pudo subir el archivo. Inténtalo de nuevo.");
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

  /* =======================================================================
     TAB 3 — Benefits icons
     ======================================================================= */
  let benefits = [];
  let saveBenefitsTimer = null;

  async function loadBenefitsState() {
    try {
      const { data, error } = await supabaseClient.from("site_content").select("data").eq("key", "benefits").maybeSingle();
      if (error) throw error;
      if (data && Array.isArray(data.data.items)) return data.data.items;
    } catch (e) {
      console.warn("No se pudo leer los beneficios desde Supabase, usando el contenido local.", e);
    }
    return typeof BENEFITS !== "undefined" ? JSON.parse(JSON.stringify(BENEFITS)) : [];
  }

  function scheduleSaveBenefits() {
    setSaveStatus("saving");
    clearTimeout(saveBenefitsTimer);
    saveBenefitsTimer = setTimeout(async () => {
      try {
        const { error } = await supabaseClient.from("site_content").upsert({ key: "benefits", data: { items: benefits } });
        if (error) throw error;
        setSaveStatus("ok");
      } catch (e) {
        console.error(e);
        setSaveStatus("error");
        showToast("No se pudo guardar. Revisa tu conexión e inténtalo de nuevo.");
      }
    }, 500);
  }

  function renderBenefitsList() {
    const container = document.getElementById("benefitsList");
    container.innerHTML = benefits
      .map((b, i) => {
        const thumb = b.image || "";
        return `
        <div class="admin-bg-block enabled" data-idx="${i}">
          <div class="admin-bg-head">
            <label style="cursor:default">${escapeHtml(b.icon)} Beneficio ${i + 1}</label>
          </div>
          <div class="admin-bg-fields" style="display:grid">
            <div class="field">
              <label>Título</label>
              <input type="text" class="benefit-title" value="${escapeHtml(b.title)}">
              <label style="margin-top:10px">Descripción</label>
              <input type="text" class="benefit-desc" value="${escapeHtml(b.description)}">
            </div>
            <div class="field">
              <label>Logo / ícono propio (opcional, fondo transparente ideal)</label>
              <input type="file" class="benefit-file" accept="image/*">
              <p class="admin-hint benefit-filename">${thumb ? "Logo cargado ✓" : "Usando emoji por defecto: " + b.icon}</p>
              ${thumb ? `<button type="button" class="admin-link-btn benefit-clear">Quitar logo y volver al emoji</button>` : ""}
            </div>
            <img class="admin-bg-thumb benefit-thumb" src="${thumb}" alt="" style="${thumb ? "" : "background:#f3ede0"}">
          </div>
        </div>`;
      })
      .join("");
  }

  function initBenefitsForm() {
    const container = document.getElementById("benefitsList");
    container.addEventListener("input", (e) => {
      const block = e.target.closest(".admin-bg-block");
      if (!block) return;
      const idx = Number(block.dataset.idx);
      if (e.target.classList.contains("benefit-title")) {
        benefits[idx].title = e.target.value;
        scheduleSaveBenefits();
      } else if (e.target.classList.contains("benefit-desc")) {
        benefits[idx].description = e.target.value;
        scheduleSaveBenefits();
      }
    });

    container.addEventListener("click", (e) => {
      if (!e.target.classList.contains("benefit-clear")) return;
      const block = e.target.closest(".admin-bg-block");
      const idx = Number(block.dataset.idx);
      benefits[idx].image = "";
      renderBenefitsList();
      scheduleSaveBenefits();
      showToast("Logo eliminado, volviendo al emoji");
    });

    container.addEventListener("change", async (e) => {
      if (!e.target.classList.contains("benefit-file")) return;
      const block = e.target.closest(".admin-bg-block");
      const idx = Number(block.dataset.idx);
      const file = e.target.files[0];
      if (!file) return;
      showToast("Subiendo logo…");
      try {
        const url = await uploadFile("backgrounds", file);
        benefits[idx].image = url;
        renderBenefitsList();
        scheduleSaveBenefits();
        showToast("Logo publicado ✓");
      } catch (err) {
        console.error(err);
        showToast("No se pudo subir el logo. Inténtalo de nuevo.");
      }
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

    benefits = await loadBenefitsState();
    renderBenefitsList();
    initBenefitsForm();

    setSaveStatus("ok");
  }

  document.addEventListener("DOMContentLoaded", initAuthGate);
})();
