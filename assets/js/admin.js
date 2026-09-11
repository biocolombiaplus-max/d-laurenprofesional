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
        document.getElementById("tabProducts").hidden = tab !== "products";
        document.getElementById("tabSalones").hidden = tab !== "salones";
        document.getElementById("tabCrm").hidden = tab !== "crm";
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

  /* =======================================================================
     TAB 4 — Products (Tienda, estilo Shopify)
     ======================================================================= */
  let products = [];
  let editingProductIndex = null;
  let pendingProductImage = "";
  let saveProductsTimer = null;

  function fmtCOPAdmin(n) {
    return n == null ? "Consultar" : new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(n);
  }

  const ADMIN_CURRENCY_LOCALE = { COP: "es-CO", USD: "en-US", EUR: "de-DE" };
  function fmtPriceAdmin(n, currency) {
    if (n == null) return "Consultar";
    const cur = currency || "COP";
    const locale = ADMIN_CURRENCY_LOCALE[cur] || "es-CO";
    return new Intl.NumberFormat(locale, { style: "currency", currency: cur, maximumFractionDigits: cur === "COP" ? 0 : 2 }).format(n);
  }

  async function loadProductsState() {
    try {
      const { data, error } = await supabaseClient.from("site_content").select("data").eq("key", "products").maybeSingle();
      if (error) throw error;
      if (data && Array.isArray(data.data.items)) return data.data.items;
    } catch (e) {
      console.warn("No se pudo leer los productos desde Supabase, usando el contenido local.", e);
    }
    return typeof PRODUCTS !== "undefined" ? JSON.parse(JSON.stringify(PRODUCTS)) : [];
  }

  async function saveProductsNow() {
    setSaveStatus("saving");
    try {
      const { error } = await supabaseClient.from("site_content").upsert({ key: "products", data: { items: products } });
      if (error) throw error;
      setSaveStatus("ok");
    } catch (e) {
      console.error(e);
      setSaveStatus("error");
      showToast("No se pudo guardar. Revisa tu conexión e inténtalo de nuevo.");
    }
  }

  function renderProductsManageList() {
    const list = document.getElementById("productsManageList");
    document.getElementById("productsCount").textContent = products.length;
    if (products.length === 0) {
      list.innerHTML = `<div class="admin-manage-empty">Aún no has agregado productos. Usa el formulario de la izquierda.</div>`;
      return;
    }
    list.innerHTML = products
      .map((p, i) => `
        <div class="admin-manage-item">
          <img src="${p.image || ""}" alt="">
          <div class="mi-info">
            <div class="mi-caption">${escapeHtml(p.name)}</div>
            <div class="mi-meta">${fmtPriceAdmin(p.price, p.currency)}${p.comparePrice != null && p.price != null && p.comparePrice > p.price ? ` (antes ${fmtPriceAdmin(p.comparePrice, p.currency)})` : ""}${p.size ? " · " + escapeHtml(p.size) : ""}${p.badge ? " · " + escapeHtml(p.badge) : ""}</div>
          </div>
          <div class="mi-actions">
            <button data-up="${i}" title="Subir" ${i === 0 ? "disabled" : ""}>↑</button>
            <button data-down="${i}" title="Bajar" ${i === products.length - 1 ? "disabled" : ""}>↓</button>
            <button data-edit="${i}" title="Editar">✎</button>
            <button data-del="${i}" class="mi-delete" title="Eliminar">✕</button>
          </div>
        </div>`)
      .join("");

    list.querySelectorAll("[data-up]").forEach((b) => b.addEventListener("click", () => moveProduct(Number(b.dataset.up), -1)));
    list.querySelectorAll("[data-down]").forEach((b) => b.addEventListener("click", () => moveProduct(Number(b.dataset.down), 1)));
    list.querySelectorAll("[data-edit]").forEach((b) => b.addEventListener("click", () => startEditProduct(Number(b.dataset.edit))));
    list.querySelectorAll("[data-del]").forEach((b) => b.addEventListener("click", () => deleteProduct(Number(b.dataset.del))));
  }

  function renderProductsPreview() {
    const grid = document.getElementById("productsPreviewGrid");
    if (!grid) return;
    grid.innerHTML = products
      .map((p) => {
        const currency = p.currency || "COP";
        const hasDiscount = p.price != null && p.comparePrice != null && p.comparePrice > p.price;
        const discountPct = hasDiscount ? Math.round((1 - p.price / p.comparePrice) * 100) : 0;
        const priceHtml =
          p.price == null
            ? `Consultar<small>escríbenos por WhatsApp</small>`
            : `
              ${hasDiscount ? `<span class="price-compare">${fmtPriceAdmin(p.comparePrice, currency)}</span>` : ""}
              <span class="price-now">${fmtPriceAdmin(p.price, currency)}${hasDiscount ? `<span class="price-discount-chip">-${discountPct}%</span>` : ""}</span>
              <small>${hasDiscount ? "precio especial por tiempo limitado" : "precio de lanzamiento"}</small>
              ${currency !== "COP" ? `<span class="product-currency-note">Precio en ${currency}</span>` : ""}
              ${hasDiscount ? `<span class="launch-offer-tag">Oferta de lanzamiento · primeros 20 clientes</span>` : ""}`;
        return `
        <div class="product-card">
          <div class="product-media">
            ${p.badge ? `<span class="product-badge">${escapeHtml(p.badge)}</span>` : ""}
            ${hasDiscount ? `<span class="product-offer-badge"><b>-${discountPct}%</b><span>Lanzamiento</span></span>` : ""}
            <img src="${p.image || ""}" alt="${escapeHtml(p.name)}">
          </div>
          <div class="product-body">
            <h3>${escapeHtml(p.name)}</h3>
            <p class="tagline">${escapeHtml(p.tagline || "")}</p>
            <ul class="product-bullets">${(p.bullets || []).map((b) => `<li>${escapeHtml(b)}</li>`).join("")}</ul>
            <div class="product-footer">
              <div class="product-price">${priceHtml}</div>
            </div>
          </div>
        </div>`;
      })
      .join("");
  }

  function moveProduct(index, dir) {
    const target = index + dir;
    if (target < 0 || target >= products.length) return;
    [products[index], products[target]] = [products[target], products[index]];
    persistAndRenderProducts();
  }

  async function deleteProduct(index) {
    const p = products[index];
    if (!p) return;
    if (!confirm(`¿Eliminar "${p.name}" de la tienda? Esto se publica de inmediato.`)) return;
    products.splice(index, 1);
    if (editingProductIndex === index) resetProductForm();
    await persistAndRenderProducts();
    showToast("Producto eliminado");
  }

  async function persistAndRenderProducts() {
    renderProductsManageList();
    renderProductsPreview();
    await saveProductsNow();
  }

  function startEditProduct(index) {
    const p = products[index];
    if (!p) return;
    editingProductIndex = index;
    pendingProductImage = "";
    document.getElementById("prodName").value = p.name || "";
    document.getElementById("prodTagline").value = p.tagline || "";
    document.getElementById("prodSize").value = p.size || "";
    document.getElementById("prodPrice").value = p.price != null ? p.price : "";
    document.getElementById("prodCurrency").value = p.currency || "COP";
    document.getElementById("prodComparePrice").value = p.comparePrice != null ? p.comparePrice : "";
    document.getElementById("prodBadge").value = p.badge || "";
    document.getElementById("prodBullets").value = (p.bullets || []).join("\n");
    const previewImg = document.getElementById("prodPreviewImg");
    const previewBox = document.getElementById("prodPreviewBox");
    if (p.image) {
      previewImg.src = p.image;
      previewBox.hidden = false;
    } else {
      previewBox.hidden = true;
    }
    document.getElementById("prodFormTitle").textContent = "Editar producto";
    document.getElementById("addProductBtn").textContent = "Actualizar producto";
    document.getElementById("cancelEditProduct").hidden = false;
  }

  function resetProductForm() {
    editingProductIndex = null;
    pendingProductImage = "";
    document.getElementById("prodName").value = "";
    document.getElementById("prodTagline").value = "";
    document.getElementById("prodSize").value = "";
    document.getElementById("prodPrice").value = "";
    document.getElementById("prodCurrency").value = "COP";
    document.getElementById("prodComparePrice").value = "";
    document.getElementById("prodBadge").value = "";
    document.getElementById("prodBullets").value = "";
    document.getElementById("prodFile").value = "";
    document.getElementById("prodPreviewBox").hidden = true;
    document.getElementById("prodFormTitle").textContent = "Agregar producto";
    document.getElementById("addProductBtn").textContent = "+ Agregar producto";
    document.getElementById("cancelEditProduct").hidden = true;
  }

  function initProductsForm() {
    const fileInput = document.getElementById("prodFile");
    const previewBox = document.getElementById("prodPreviewBox");
    const previewImg = document.getElementById("prodPreviewImg");
    const addBtn = document.getElementById("addProductBtn");
    const progressEl = document.getElementById("prodUploadProgress");

    fileInput.addEventListener("change", async () => {
      const file = fileInput.files[0];
      if (!file) return;
      previewImg.src = URL.createObjectURL(file);
      previewBox.hidden = false;
      progressEl.textContent = "Subiendo foto…";
      try {
        pendingProductImage = await uploadFile("backgrounds", file);
        progressEl.textContent = "Foto lista ✓";
      } catch (e) {
        console.error(e);
        progressEl.textContent = "";
        showToast("No se pudo subir la foto. Inténtalo de nuevo.");
      }
    });

    addBtn.addEventListener("click", async () => {
      const name = document.getElementById("prodName").value.trim();
      const tagline = document.getElementById("prodTagline").value.trim();
      const size = document.getElementById("prodSize").value.trim();
      const priceRaw = document.getElementById("prodPrice").value.trim();
      const price = priceRaw === "" ? null : Number(priceRaw);
      const currency = document.getElementById("prodCurrency").value || "COP";
      const comparePriceRaw = document.getElementById("prodComparePrice").value.trim();
      const comparePrice = comparePriceRaw === "" ? null : Number(comparePriceRaw);
      const badge = document.getElementById("prodBadge").value.trim();
      const bullets = document
        .getElementById("prodBullets")
        .value.split("\n")
        .map((s) => s.trim())
        .filter(Boolean);

      if (!name) {
        showToast("Escribe el nombre del producto");
        return;
      }

      const existingImage = editingProductIndex != null ? products[editingProductIndex].image : "";
      const image = pendingProductImage || existingImage || "";
      if (!image) {
        showToast("Sube una foto del producto");
        return;
      }

      const productData = {
        id: editingProductIndex != null ? products[editingProductIndex].id : uid(),
        name,
        tagline,
        size,
        price,
        currency,
        comparePrice,
        badge: badge || "Disponible",
        image,
        bullets,
      };

      addBtn.disabled = true;
      if (editingProductIndex != null) {
        products[editingProductIndex] = productData;
      } else {
        products.push(productData);
      }

      await persistAndRenderProducts();
      showToast(editingProductIndex != null ? "Producto actualizado ✓" : "Producto agregado a la tienda ✓");
      resetProductForm();
      addBtn.disabled = false;
    });

    document.getElementById("cancelEditProduct").addEventListener("click", resetProductForm);
  }

  /* =======================================================================
     TAB 5 — Salones aliados (directorio con ubicación en Google Maps)
     ======================================================================= */
  const COLOMBIA_DEPARTAMENTOS = [
    "Amazonas", "Antioquia", "Arauca", "Atlántico", "Bogotá D.C.", "Bolívar", "Boyacá", "Caldas",
    "Caquetá", "Casanare", "Cauca", "Cesar", "Chocó", "Córdoba", "Cundinamarca", "Guainía", "Guaviare",
    "Huila", "La Guajira", "Magdalena", "Meta", "Nariño", "Norte de Santander", "Putumayo", "Quindío",
    "Risaralda", "San Andrés y Providencia", "Santander", "Sucre", "Tolima", "Valle del Cauca", "Vaupés", "Vichada",
  ];

  let salones = [];
  let editingSalonIndex = null;
  let pendingSalonLogo = "";
  let saveSalonesTimer = null;

  function salonMapsQuery(s) {
    return [s.direccion, s.ciudad, s.departamento, "Colombia"].filter(Boolean).join(", ");
  }

  function salonPreviewCardHTML(s) {
    const q = encodeURIComponent(salonMapsQuery(s));
    const embedSrc = `https://www.google.com/maps?q=${q}&output=embed`;
    const logoHtml = s.logo
      ? `<img class="salon-logo" src="${s.logo}" alt="">`
      : `<div class="salon-logo" style="display:flex;align-items:center;justify-content:center;color:#fff;font-family:var(--font-display);font-size:18px">${escapeHtml((s.nombre || "?").charAt(0))}</div>`;
    return `
    <div class="salon-card">
      <div class="salon-map"><iframe src="${embedSrc}" loading="lazy" title="Ubicación de ${escapeHtml(s.nombre)}"></iframe></div>
      <div class="salon-body">
        <div class="salon-head">
          ${logoHtml}
          <div>
            <h4>${escapeHtml(s.nombre)}${s.fundador ? '<span class="salon-badge">★ Fundador</span>' : ""}</h4>
            <span class="salon-loc">${escapeHtml(s.ciudad)}, ${escapeHtml(s.departamento)}</span>
          </div>
        </div>
        <p class="salon-address">${escapeHtml(s.direccion || "")}</p>
      </div>
    </div>`;
  }

  async function loadSalonsState() {
    try {
      const { data, error } = await supabaseClient.from("site_content").select("data").eq("key", "salons").maybeSingle();
      if (error) throw error;
      if (data && Array.isArray(data.data.items)) return data.data.items;
    } catch (e) {
      console.warn("No se pudo leer los salones aliados desde Supabase, usando el contenido local.", e);
    }
    return typeof SALONS !== "undefined" ? JSON.parse(JSON.stringify(SALONS)) : [];
  }

  async function saveSalonesNow() {
    setSaveStatus("saving");
    try {
      const { error } = await supabaseClient.from("site_content").upsert({ key: "salons", data: { items: salones } });
      if (error) throw error;
      setSaveStatus("ok");
    } catch (e) {
      console.error(e);
      setSaveStatus("error");
      showToast("No se pudo guardar. Revisa tu conexión e inténtalo de nuevo.");
    }
  }

  function renderSalonesManageList() {
    const list = document.getElementById("salonesManageList");
    document.getElementById("salonesCount").textContent = salones.length;
    document.getElementById("salonesFundadorCount").textContent = Math.min(20, salones.filter((s) => s.fundador).length);
    if (salones.length === 0) {
      list.innerHTML = `<div class="admin-manage-empty">Aún no has agregado salones aliados. Usa el formulario de la izquierda.</div>`;
      return;
    }
    list.innerHTML = salones
      .map((s, i) => `
        <div class="admin-manage-item">
          ${s.logo ? `<img src="${s.logo}" alt="">` : `<div style="width:48px;height:62px;border-radius:6px;background:var(--purple-950);flex-shrink:0"></div>`}
          <div class="mi-info">
            <div class="mi-caption">${escapeHtml(s.nombre)}${s.fundador ? " ★" : ""}</div>
            <div class="mi-meta">${escapeHtml(s.ciudad)}, ${escapeHtml(s.departamento)}</div>
          </div>
          <div class="mi-actions">
            <button data-edit="${i}" title="Editar">✎</button>
            <button data-del="${i}" class="mi-delete" title="Eliminar">✕</button>
          </div>
        </div>`)
      .join("");

    list.querySelectorAll("[data-edit]").forEach((b) => b.addEventListener("click", () => startEditSalon(Number(b.dataset.edit))));
    list.querySelectorAll("[data-del]").forEach((b) => b.addEventListener("click", () => deleteSalon(Number(b.dataset.del))));
  }

  function renderSalonesPreview() {
    const grid = document.getElementById("salonesPreviewGrid");
    if (!grid) return;
    grid.innerHTML = salones.map(salonPreviewCardHTML).join("");
  }

  async function deleteSalon(index) {
    const s = salones[index];
    if (!s) return;
    if (!confirm(`¿Eliminar "${s.nombre}" de los salones aliados? Esto se publica de inmediato.`)) return;
    salones.splice(index, 1);
    if (editingSalonIndex === index) resetSalonForm();
    await persistAndRenderSalones();
    showToast("Salón eliminado");
  }

  async function persistAndRenderSalones() {
    renderSalonesManageList();
    renderSalonesPreview();
    await saveSalonesNow();
  }

  function startEditSalon(index) {
    const s = salones[index];
    if (!s) return;
    editingSalonIndex = index;
    pendingSalonLogo = "";
    document.getElementById("salonNombre").value = s.nombre || "";
    document.getElementById("salonDepto").value = s.departamento || "";
    document.getElementById("salonCiudad").value = s.ciudad || "";
    document.getElementById("salonDireccion").value = s.direccion || "";
    document.getElementById("salonWhatsapp").value = s.whatsapp || "";
    document.getElementById("salonInstagram").value = s.instagram || "";
    document.getElementById("salonFundador").checked = !!s.fundador;
    const previewImg = document.getElementById("salonPreviewImg");
    const previewBox = document.getElementById("salonPreviewBox");
    if (s.logo) {
      previewImg.src = s.logo;
      previewBox.hidden = false;
    } else {
      previewBox.hidden = true;
    }
    document.getElementById("salonFormTitle").textContent = "Editar salón aliado";
    document.getElementById("addSalonBtn").textContent = "Actualizar salón aliado";
    document.getElementById("cancelEditSalon").hidden = false;
  }

  function resetSalonForm() {
    editingSalonIndex = null;
    pendingSalonLogo = "";
    document.getElementById("salonNombre").value = "";
    document.getElementById("salonDepto").selectedIndex = 0;
    document.getElementById("salonCiudad").value = "";
    document.getElementById("salonDireccion").value = "";
    document.getElementById("salonWhatsapp").value = "";
    document.getElementById("salonInstagram").value = "";
    document.getElementById("salonFundador").checked = false;
    document.getElementById("salonFile").value = "";
    document.getElementById("salonPreviewBox").hidden = true;
    document.getElementById("salonFormTitle").textContent = "Agregar salón aliado";
    document.getElementById("addSalonBtn").textContent = "+ Agregar salón aliado";
    document.getElementById("cancelEditSalon").hidden = true;
  }

  function initSalonesForm() {
    const deptoSelect = document.getElementById("salonDepto");
    deptoSelect.innerHTML = COLOMBIA_DEPARTAMENTOS.map((d) => `<option value="${d}">${d}</option>`).join("");

    const fileInput = document.getElementById("salonFile");
    const previewBox = document.getElementById("salonPreviewBox");
    const previewImg = document.getElementById("salonPreviewImg");
    const addBtn = document.getElementById("addSalonBtn");
    const progressEl = document.getElementById("salonUploadProgress");

    fileInput.addEventListener("change", async () => {
      const file = fileInput.files[0];
      if (!file) return;
      previewImg.src = URL.createObjectURL(file);
      previewBox.hidden = false;
      progressEl.textContent = "Subiendo logo…";
      try {
        pendingSalonLogo = await uploadFile("backgrounds", file);
        progressEl.textContent = "Logo listo ✓";
      } catch (e) {
        console.error(e);
        progressEl.textContent = "";
        showToast("No se pudo subir el logo. Inténtalo de nuevo.");
      }
    });

    addBtn.addEventListener("click", async () => {
      const nombre = document.getElementById("salonNombre").value.trim();
      const departamento = document.getElementById("salonDepto").value;
      const ciudad = document.getElementById("salonCiudad").value.trim();
      const direccion = document.getElementById("salonDireccion").value.trim();
      const whatsapp = document.getElementById("salonWhatsapp").value.trim().replace(/[^0-9]/g, "");
      const instagram = document.getElementById("salonInstagram").value.trim();
      const fundador = document.getElementById("salonFundador").checked;

      if (!nombre || !ciudad || !direccion) {
        showToast("Completa nombre, ciudad y dirección");
        return;
      }

      const existingLogo = editingSalonIndex != null ? salones[editingSalonIndex].logo : "";
      const logo = pendingSalonLogo || existingLogo || "";

      const salonData = {
        id: editingSalonIndex != null ? salones[editingSalonIndex].id : uid(),
        nombre, departamento, ciudad, direccion, whatsapp, instagram, logo, fundador,
      };

      addBtn.disabled = true;
      if (editingSalonIndex != null) {
        salones[editingSalonIndex] = salonData;
      } else {
        salones.push(salonData);
      }

      await persistAndRenderSalones();
      showToast(editingSalonIndex != null ? "Salón actualizado ✓" : "Salón agregado — ya está en línea ✓");
      resetSalonForm();
      addBtn.disabled = false;
    });

    document.getElementById("cancelEditSalon").addEventListener("click", resetSalonForm);
  }

  /* =======================================================================
     TAB 6 — CRM (leads de la Reunión Virtual)
     ======================================================================= */
  const STATUS_LABELS = {
    nuevo: "Nuevo",
    contactado: "Contactado",
    confirmado: "Confirmado",
    asistio: "Asistió",
    no_asistio: "No asistió",
  };
  let crmLeads = [];
  let crmError = "";
  const crmNotesTimers = {};

  async function loadCrmLeads() {
    if (!supabaseClient) return [];
    try {
      const { data, error } = await supabaseClient
        .from("webinar_registrations")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      crmError = "";
      return data || [];
    } catch (e) {
      console.warn("No se pudo leer el CRM. ¿Ya creaste la tabla webinar_registrations? Revisa el README.", e);
      crmError = "No se pudo cargar el CRM. Si es la primera vez, revisa el README: falta ejecutar el script SQL de la Reunión Virtual en Supabase.";
      return [];
    }
  }

  function renderCrmStats(leads) {
    const el = document.getElementById("crmStats");
    const counts = { nuevo: 0, contactado: 0, confirmado: 0, asistio: 0, no_asistio: 0 };
    leads.forEach((l) => {
      if (counts[l.status] != null) counts[l.status] += 1;
    });
    const tiles = [
      { l: "Total", n: leads.length },
      { l: "Nuevos", n: counts.nuevo },
      { l: "Contactados", n: counts.contactado },
      { l: "Confirmados", n: counts.confirmado },
      { l: "Asistieron", n: counts.asistio },
    ];
    el.innerHTML = tiles.map((t) => `<div class="crm-stat"><div class="n">${t.n}</div><div class="l">${t.l}</div></div>`).join("");
  }

  function crmWaLink(lead) {
    const phone = (lead.whatsapp || "").replace(/[^0-9]/g, "");
    const fullPhone = phone.startsWith("57") ? phone : `57${phone}`;
    const msg = encodeURIComponent(
      `Hola ${lead.nombre} 👋, soy de D'Laurent Professional. Te escribo por tu registro a la Reunión Virtual del ${lead.day} (${lead.session_date}).`
    );
    return `https://wa.me/${fullPhone}?text=${msg}`;
  }

  function filteredCrmLeads() {
    const q = document.getElementById("crmSearch").value.trim().toLowerCase();
    const statusF = document.getElementById("crmFilterStatus").value;
    const dayF = document.getElementById("crmFilterDay").value;
    return crmLeads.filter((l) => {
      if (statusF !== "todos" && l.status !== statusF) return false;
      if (dayF !== "todos" && l.day !== dayF) return false;
      if (q) {
        const hay = `${l.nombre} ${l.correo} ${l.whatsapp}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }

  function renderCrmTable() {
    const body = document.getElementById("crmTableBody");
    const empty = document.getElementById("crmEmpty");
    const list = filteredCrmLeads();

    if (crmError) {
      body.innerHTML = "";
      empty.hidden = false;
      empty.textContent = crmError;
      return;
    }
    if (list.length === 0) {
      body.innerHTML = "";
      empty.hidden = false;
      empty.textContent = crmLeads.length === 0 ? "Aún no hay registros de la Reunión Virtual." : "Ningún registro coincide con el filtro.";
      return;
    }
    empty.hidden = true;

    body.innerHTML = list
      .map((l) => {
        const created = l.created_at ? new Date(l.created_at).toLocaleDateString("es-CO", { day: "numeric", month: "short", year: "numeric" }) : "";
        const sessionDate = l.session_date ? new Date(l.session_date + "T00:00:00").toLocaleDateString("es-CO", { day: "numeric", month: "short" }) : "";
        return `
        <tr data-id="${l.id}">
          <td>
            <div class="crm-contact">
              <div class="name">${escapeHtml(l.nombre)}</div>
              <div class="sub">${escapeHtml(l.correo)} · <a href="${crmWaLink(l)}" target="_blank" rel="noopener">WhatsApp ↗</a></div>
            </div>
          </td>
          <td class="crm-session"><span class="badge">${escapeHtml(l.day || "")}</span><span class="date">${sessionDate}</span></td>
          <td>
            <select class="status-select st-${l.status}" data-status-for="${l.id}">
              ${Object.keys(STATUS_LABELS).map((s) => `<option value="${s}" ${s === l.status ? "selected" : ""}>${STATUS_LABELS[s]}</option>`).join("")}
            </select>
          </td>
          <td><input type="text" class="crm-notes" data-notes-for="${l.id}" value="${escapeHtml(l.notes || "")}" placeholder="Notas de seguimiento…"></td>
          <td class="reg-date">${created}</td>
        </tr>`;
      })
      .join("");

    body.querySelectorAll("[data-status-for]").forEach((sel) => {
      sel.addEventListener("change", async () => {
        const id = sel.dataset.statusFor;
        const newStatus = sel.value;
        sel.className = `status-select st-${newStatus}`;
        const lead = crmLeads.find((l) => l.id === id);
        if (lead) lead.status = newStatus;
        try {
          const { error } = await supabaseClient.from("webinar_registrations").update({ status: newStatus }).eq("id", id);
          if (error) throw error;
          renderCrmStats(crmLeads);
        } catch (e) {
          console.error(e);
          showToast("No se pudo actualizar el estado. Inténtalo de nuevo.");
        }
      });
    });

    body.querySelectorAll("[data-notes-for]").forEach((input) => {
      input.addEventListener("input", () => {
        const id = input.dataset.notesFor;
        clearTimeout(crmNotesTimers[id]);
        crmNotesTimers[id] = setTimeout(async () => {
          const lead = crmLeads.find((l) => l.id === id);
          if (lead) lead.notes = input.value;
          try {
            const { error } = await supabaseClient.from("webinar_registrations").update({ notes: input.value }).eq("id", id);
            if (error) throw error;
          } catch (e) {
            console.error(e);
            showToast("No se pudo guardar la nota. Inténtalo de nuevo.");
          }
        }, 600);
      });
    });
  }

  function exportCrmCsv() {
    const list = filteredCrmLeads();
    if (list.length === 0) {
      showToast("No hay registros para exportar");
      return;
    }
    const headers = ["nombre", "correo", "whatsapp", "day", "session_date", "status", "notes", "created_at"];
    const rows = list.map((l) => headers.map((h) => `"${String(l[h] ?? "").replace(/"/g, '""')}"`).join(","));
    const csv = [headers.join(","), ...rows].join("\r\n");
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `crm-dlaurent-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  }

  function initCrm() {
    document.getElementById("crmSearch").addEventListener("input", renderCrmTable);
    document.getElementById("crmFilterStatus").addEventListener("change", renderCrmTable);
    document.getElementById("crmFilterDay").addEventListener("change", renderCrmTable);
    document.getElementById("crmExportBtn").addEventListener("click", exportCrmCsv);
    document.getElementById("crmRefreshBtn").addEventListener("click", async () => {
      crmLeads = await loadCrmLeads();
      renderCrmStats(crmLeads);
      renderCrmTable();
      showToast("CRM actualizado");
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

    products = await loadProductsState();
    initProductsForm();
    renderProductsManageList();
    renderProductsPreview();

    salones = await loadSalonsState();
    initSalonesForm();
    renderSalonesManageList();
    renderSalonesPreview();

    initCrm();
    crmLeads = await loadCrmLeads();
    renderCrmStats(crmLeads);
    renderCrmTable();

    setSaveStatus("ok");
  }

  document.addEventListener("DOMContentLoaded", initAuthGate);
})();
