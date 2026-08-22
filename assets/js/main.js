/* =========================================================================
   D'LAURENT PROFESSIONAL COLOMBIA — LÓGICA DEL SITIO
   ========================================================================= */
(function () {
  "use strict";

  const fmtCOP = (n) =>
    n == null ? null : new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(n);

  const waBase = `https://wa.me/${SITE_CONFIG.whatsappNumber}`;
  const waLink = (msg) => `${waBase}?text=${encodeURIComponent(msg)}`;

  /* ---------------------------------------------------------------------
     Live content from Supabase (set from /admin.html). Falls back to the
     local assets/js/gallery-data.js and assets/js/site-images.js if
     Supabase isn't configured yet, or the fetch fails for any reason —
     the site must never break because of this.
     --------------------------------------------------------------------- */
  async function loadLiveContent() {
    if (typeof supabaseClient === "undefined" || !supabaseClient) return;
    try {
      const { data, error } = await supabaseClient.from("site_content").select("key,data").in("key", ["gallery", "images", "benefits"]);
      if (error) throw error;

      const galleryRow = (data || []).find((r) => r.key === "gallery");
      const imagesRow = (data || []).find((r) => r.key === "images");
      const benefitsRow = (data || []).find((r) => r.key === "benefits");

      if (galleryRow && Array.isArray(galleryRow.data.items)) {
        GALLERY.length = 0;
        GALLERY.push(...galleryRow.data.items);
      }
      if (imagesRow) {
        const d = imagesRow.data;
        if (d.hero) Object.assign(SITE_IMAGES.hero, d.hero);
        if (d.sectionBackgrounds) {
          Object.keys(d.sectionBackgrounds).forEach((key) => {
            SITE_IMAGES.sectionBackgrounds[key] = Object.assign(
              SITE_IMAGES.sectionBackgrounds[key] || {},
              d.sectionBackgrounds[key]
            );
          });
        }
      }
      if (benefitsRow && Array.isArray(benefitsRow.data.items) && typeof BENEFITS !== "undefined") {
        BENEFITS.length = 0;
        BENEFITS.push(...benefitsRow.data.items);
      }
    } catch (err) {
      console.warn("No se pudo cargar el contenido en vivo desde Supabase, usando el contenido local.", err);
    }
  }

  /* ---------------------------------------------------------------------
     Site images: hero photo swap + per-section background photos
     (configured from /admin.html → assets/js/site-images.js)
     --------------------------------------------------------------------- */
  function applySiteImages() {
    if (typeof SITE_IMAGES === "undefined") return;

    if (SITE_IMAGES.hero) {
      let heroImg = document.getElementById("heroKitImg");
      const sizePct = SITE_IMAGES.hero.sizePct || 100;
      const maxWidthPx = Math.round(6.2 * sizePct) + "px";

      if (SITE_IMAGES.hero.usePhoto && SITE_IMAGES.hero.src && heroImg) {
        const heroVisual = document.querySelector(".hero-visual");
        const isVideo = SITE_IMAGES.hero.mediaType === "video";
        const wantsVideoTag = isVideo && heroImg.tagName !== "VIDEO";
        const wantsImgTag = !isVideo && heroImg.tagName === "VIDEO";

        if (wantsVideoTag) {
          const video = document.createElement("video");
          video.id = heroImg.id;
          video.className = heroImg.className;
          video.muted = true;
          video.autoplay = true;
          video.loop = true;
          video.setAttribute("playsinline", "");
          heroImg.replaceWith(video);
          heroImg = video;
        } else if (wantsImgTag) {
          const img = document.createElement("img");
          img.id = heroImg.id;
          img.className = heroImg.className;
          img.alt = "Alisado profesional D'Laurent Professional";
          heroImg.replaceWith(img);
          heroImg = img;
        }

        heroImg.src = SITE_IMAGES.hero.src;
        heroImg.classList.add("is-photo");
        if (isVideo) heroImg.play?.().catch(() => {});
        // La foto/video propio trae su propio diseño (marco, insignias, etc.):
        // ocultamos las insignias flotantes de la plantilla para no duplicar texto.
        if (heroVisual) heroVisual.classList.add("hero-visual--photo");
      }

      if (heroImg) heroImg.style.maxWidth = maxWidthPx;
    }

    const bg = SITE_IMAGES.sectionBackgrounds || {};
    Object.keys(bg).forEach((key) => {
      const conf = bg[key];
      const el = document.getElementById(key);
      if (!el || !conf || !conf.enabled || !conf.src) return;
      const overlayRGB = conf.tone === "dark" ? "21,12,38" : "248,244,236";
      const alpha = Math.max(0, Math.min(100, conf.opacity ?? 85)) / 100;
      el.style.backgroundImage = `linear-gradient(rgba(${overlayRGB},${alpha}), rgba(${overlayRGB},${alpha})), url("${conf.src}")`;
      el.style.backgroundSize = "cover";
      el.style.backgroundPosition = "center";
      el.style.backgroundRepeat = "no-repeat";
    });
  }

  /* ---------------------------------------------------------------------
     WhatsApp links across the page
     --------------------------------------------------------------------- */
  function wireWhatsappLinks() {
    const genericMsg = "Hola D'Laurent Professional 👋, quiero más información sobre la línea de alisado profesional.";
    ["headerWhatsapp", "heroWhatsapp", "ctaWhatsapp", "fabWhatsapp", "footerWhatsapp"].forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.href = waLink(genericMsg);
    });
    const topbarLink = document.getElementById("topbarLink");
    if (topbarLink) {
      topbarLink.href = waLink("Hola D'Laurent Professional 👋, vi el precio de lanzamiento en la página y quiero aprovecharlo.");
    }
  }

  /* ---------------------------------------------------------------------
     Countdown (launch offer)
     --------------------------------------------------------------------- */
  function startCountdown() {
    const el = document.getElementById("countdown");
    if (!el) return;
    const end = new Date(SITE_CONFIG.launchOfferEndsAt).getTime();
    function tick() {
      const now = Date.now();
      let diff = end - now;
      if (isNaN(end) || diff <= 0) {
        el.textContent = "¡Consulta disponibilidad!";
        return;
      }
      const d = Math.floor(diff / 86400000);
      diff -= d * 86400000;
      const h = Math.floor(diff / 3600000);
      diff -= h * 3600000;
      const m = Math.floor(diff / 60000);
      diff -= m * 60000;
      const s = Math.floor(diff / 1000);
      el.textContent = `${d}d ${String(h).padStart(2, "0")}h ${String(m).padStart(2, "0")}m ${String(s).padStart(2, "0")}s`;
    }
    tick();
    setInterval(tick, 1000);
  }

  /* ---------------------------------------------------------------------
     Scroll reveal
     --------------------------------------------------------------------- */
  function observeReveal(items) {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("in-view");
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15 }
    );
    items.forEach((el) => io.observe(el));
  }

  function initReveal() {
    observeReveal(document.querySelectorAll(".reveal, .reveal-scale"));
  }

  function initTimeBars() {
    const bars = document.querySelectorAll(".time-bar-fill");
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.style.width = entry.target.dataset.width + "%";
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.4 }
    );
    bars.forEach((b) => io.observe(b));
  }

  /* ---------------------------------------------------------------------
     Mobile nav
     --------------------------------------------------------------------- */
  function initMobileNav() {
    const burger = document.getElementById("burgerBtn");
    const nav = document.getElementById("mobileNav");
    const overlay = document.getElementById("mobileOverlay");
    function close() {
      nav.classList.remove("show");
      overlay.classList.remove("show");
    }
    burger.addEventListener("click", () => {
      nav.classList.add("show");
      overlay.classList.add("show");
    });
    overlay.addEventListener("click", close);
    nav.querySelectorAll("a").forEach((a) => a.addEventListener("click", close));
  }

  /* ---------------------------------------------------------------------
     Benefits (value props) render
     --------------------------------------------------------------------- */
  function renderBenefits() {
    const grid = document.getElementById("valuesGrid");
    if (!grid || typeof BENEFITS === "undefined") return;
    grid.innerHTML = BENEFITS.map((b, i) => {
      const iconHtml = b.image
        ? `<img class="value-icon-img" src="${b.image}" alt="">`
        : `<div class="value-icon">${b.icon}</div>`;
      return `
      <div class="value-card reveal" style="--i:${i}">
        ${iconHtml}
        <h3>${b.title}</h3>
        <p>${b.description}</p>
      </div>`;
    }).join("");
    observeReveal(grid.querySelectorAll(".reveal"));
  }

  /* ---------------------------------------------------------------------
     Products render + Cart
     --------------------------------------------------------------------- */
  let cart = [];

  function renderProducts() {
    const grid = document.getElementById("productGrid");
    grid.innerHTML = PRODUCTS.map(
      (p, i) => `
      <div class="product-card reveal" style="--i:${i}">
        <div class="product-media">
          <span class="product-badge">${p.badge}</span>
          <img src="${p.image}" alt="${p.name}">
        </div>
        <div class="product-body">
          <h3>${p.name}</h3>
          <p class="tagline">${p.tagline}</p>
          <ul class="product-bullets">
            ${p.bullets.map((b) => `<li>${b}</li>`).join("")}
          </ul>
          <div class="product-footer">
            <div class="product-price">
              ${p.price != null ? fmtCOP(p.price) : "Consultar"}
              <small>${p.price != null ? "precio de lanzamiento" : "escríbenos por WhatsApp"}</small>
            </div>
            <button class="btn btn-dark btn-sm" data-add="${p.id}">Agregar</button>
          </div>
        </div>
      </div>`
    ).join("");

    grid.querySelectorAll("[data-add]").forEach((btn) => {
      btn.addEventListener("click", () => addToCart(btn.dataset.add));
    });

    observeReveal(grid.querySelectorAll(".reveal"));
  }

  function addToCart(id) {
    const product = PRODUCTS.find((p) => p.id === id);
    if (!product) return;
    const existing = cart.find((c) => c.id === id);
    if (existing) existing.qty += 1;
    else cart.push({ id, qty: 1 });
    renderCart();
    showToast(`${product.name} agregado al carrito`);
    openCart();
  }

  function changeQty(id, delta) {
    const item = cart.find((c) => c.id === id);
    if (!item) return;
    item.qty += delta;
    if (item.qty <= 0) cart = cart.filter((c) => c.id !== id);
    renderCart();
  }

  function removeFromCart(id) {
    cart = cart.filter((c) => c.id !== id);
    renderCart();
  }

  function cartTotal() {
    return cart.reduce((sum, c) => {
      const p = PRODUCTS.find((pr) => pr.id === c.id);
      return sum + (p && p.price ? p.price * c.qty : 0);
    }, 0);
  }

  function renderCart() {
    const wrap = document.getElementById("cartItems");
    const countEl = document.getElementById("cartCount");
    const totalEl = document.getElementById("cartTotal");
    const totalQty = cart.reduce((s, c) => s + c.qty, 0);
    countEl.textContent = totalQty;

    if (cart.length === 0) {
      wrap.innerHTML = `<div class="cart-empty">Tu carrito está vacío.<br>Agrega productos desde la sección de alisado profesional.</div>`;
    } else {
      wrap.innerHTML = cart
        .map((c) => {
          const p = PRODUCTS.find((pr) => pr.id === c.id);
          return `
          <div class="cart-item">
            <img src="${p.image}" alt="${p.name}">
            <div class="cart-item-info">
              <h4>${p.name}</h4>
              <div class="price">${p.price != null ? fmtCOP(p.price) : "Precio a confirmar"}</div>
              <div class="qty-control">
                <button data-dec="${p.id}">−</button>
                <span>${c.qty}</span>
                <button data-inc="${p.id}">+</button>
              </div>
              <div class="remove" data-remove="${p.id}">Eliminar</div>
            </div>
          </div>`;
        })
        .join("");

      wrap.querySelectorAll("[data-inc]").forEach((b) => b.addEventListener("click", () => changeQty(b.dataset.inc, 1)));
      wrap.querySelectorAll("[data-dec]").forEach((b) => b.addEventListener("click", () => changeQty(b.dataset.dec, -1)));
      wrap.querySelectorAll("[data-remove]").forEach((b) => b.addEventListener("click", () => removeFromCart(b.dataset.remove)));
    }

    const total = cartTotal();
    const hasUnpriced = cart.some((c) => {
      const p = PRODUCTS.find((pr) => pr.id === c.id);
      return p && p.price == null;
    });
    totalEl.textContent = hasUnpriced ? `${fmtCOP(total)} + productos a cotizar` : fmtCOP(total);

    updateCartWhatsapp();
  }

  function buildOrderMessage() {
    if (cart.length === 0) return "Hola D'Laurent Professional 👋, quiero hacer un pedido.";
    let lines = ["Hola D'Laurent Professional 👋, quiero confirmar este pedido:", ""];
    cart.forEach((c) => {
      const p = PRODUCTS.find((pr) => pr.id === c.id);
      lines.push(`• ${p.name} x${c.qty} — ${p.price != null ? fmtCOP(p.price * c.qty) : "precio a confirmar"}`);
    });
    lines.push("", `Total estimado: ${fmtCOP(cartTotal())}`, "", "Quedo atento(a) para coordinar el pago y el envío.");
    return lines.join("\n");
  }

  function updateCartWhatsapp() {
    const el = document.getElementById("cartWhatsapp");
    const modalEl = document.getElementById("modalWhatsapp");
    const msg = waLink(buildOrderMessage());
    if (el) el.href = msg;
    if (modalEl) modalEl.href = msg;
  }

  function openCart() {
    document.getElementById("cartDrawer").classList.add("show");
    document.getElementById("overlay").classList.add("show");
  }
  function closeCart() {
    document.getElementById("cartDrawer").classList.remove("show");
    document.getElementById("overlay").classList.remove("show");
  }

  function initCart() {
    document.getElementById("cartBtn").addEventListener("click", (e) => {
      e.preventDefault();
      openCart();
    });
    document.getElementById("cartClose").addEventListener("click", closeCart);
    document.getElementById("overlay").addEventListener("click", () => {
      closeCart();
      closePayModal();
      document.getElementById("mobileNav").classList.remove("show");
    });
    document.getElementById("checkoutBtn").addEventListener("click", () => {
      if (cart.length === 0) {
        showToast("Agrega al menos un producto para continuar");
        return;
      }
      openPayModal();
    });
    renderCart();
  }

  /* ---------------------------------------------------------------------
     Payment modal
     --------------------------------------------------------------------- */
  function openPayModal() {
    document.getElementById("payModal").classList.add("show");
    document.getElementById("overlay").classList.add("show");
  }
  function closePayModal() {
    document.getElementById("payModal").classList.remove("show");
  }

  function initPayModal() {
    document.getElementById("payModalClose").addEventListener("click", closePayModal);
    document.getElementById("nequiNumberText").textContent = SITE_CONFIG.nequiNumber.replace(/(\d{3})(\d{3})(\d{4})/, "$1 $2 $3");

    const wompiLink = document.getElementById("wompiLink");
    const wompiText = document.getElementById("wompiText");
    if (SITE_CONFIG.wompiPaymentLink) {
      wompiLink.href = SITE_CONFIG.wompiPaymentLink;
      wompiText.textContent = "Paga de forma segura en línea con tarjeta, PSE o billetera digital.";
    } else {
      wompiLink.href = waLink("Hola D'Laurent Professional 👋, quiero pagar mi pedido con Wompi.");
    }

    document.getElementById("copyNequi").addEventListener("click", () => {
      navigator.clipboard?.writeText(SITE_CONFIG.nequiNumber).then(() => showToast("Número Nequi copiado"));
    });
  }

  /* ---------------------------------------------------------------------
     Toast
     --------------------------------------------------------------------- */
  let toastTimer;
  function showToast(text) {
    const toast = document.getElementById("toast");
    document.getElementById("toastText").textContent = text;
    toast.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove("show"), 3200);
  }

  /* ---------------------------------------------------------------------
     Testimonials carousel
     --------------------------------------------------------------------- */
  let testiIndex = 0;
  function renderTestimonials() {
    const slidesEl = document.getElementById("testiSlides");
    const dotsEl = document.getElementById("testiDots");
    slidesEl.innerHTML = REVIEWS.map(
      (r) => `
      <div class="testi-slide">
        <div class="testi-card">
          <div class="testi-stars">${"★".repeat(r.stars)}${"☆".repeat(5 - r.stars)}</div>
          <p class="testi-text">"${r.text}"</p>
          <div class="testi-name">${r.name}</div>
          <div class="testi-role">${r.role}</div>
        </div>
      </div>`
    ).join("");
    dotsEl.innerHTML = REVIEWS.map((_, i) => `<span class="testi-dot${i === 0 ? " active" : ""}" data-dot="${i}"></span>`).join("");

    dotsEl.querySelectorAll("[data-dot]").forEach((dot) => {
      dot.addEventListener("click", () => goToTesti(Number(dot.dataset.dot)));
    });

    document.getElementById("testiPrev").addEventListener("click", () => goToTesti(testiIndex - 1));
    document.getElementById("testiNext").addEventListener("click", () => goToTesti(testiIndex + 1));

    updateTestiPosition();
    setInterval(() => goToTesti(testiIndex + 1), 6000);
  }

  function goToTesti(i) {
    testiIndex = (i + REVIEWS.length) % REVIEWS.length;
    updateTestiPosition();
  }

  function updateTestiPosition() {
    const slidesEl = document.getElementById("testiSlides");
    slidesEl.style.transform = `translateX(-${testiIndex * 100}%)`;
    document.querySelectorAll(".testi-dot").forEach((d, i) => d.classList.toggle("active", i === testiIndex));
  }

  /* ---------------------------------------------------------------------
     FAQ accordion
     --------------------------------------------------------------------- */
  function renderFaq() {
    const list = document.getElementById("faqList");
    list.innerHTML = FAQS.map(
      (f, i) => `
      <div class="faq-item${i === 0 ? " open" : ""}">
        <button class="faq-q" type="button">
          <span>${f.q}</span>
          <span class="plus">+</span>
        </button>
        <div class="faq-a"><p>${f.a}</p></div>
      </div>`
    ).join("");

    list.querySelectorAll(".faq-item").forEach((item) => {
      const q = item.querySelector(".faq-q");
      const a = item.querySelector(".faq-a");
      if (item.classList.contains("open")) a.style.maxHeight = a.scrollHeight + "px";
      q.addEventListener("click", () => {
        const isOpen = item.classList.contains("open");
        list.querySelectorAll(".faq-item").forEach((other) => {
          other.classList.remove("open");
          other.querySelector(".faq-a").style.maxHeight = null;
        });
        if (!isOpen) {
          item.classList.add("open");
          a.style.maxHeight = a.scrollHeight + "px";
        }
      });
    });
  }

  /* ---------------------------------------------------------------------
     Registration form tabs + WhatsApp submit
     --------------------------------------------------------------------- */
  function initForms() {
    const tabs = document.querySelectorAll(".form-tab");
    tabs.forEach((tab) => {
      tab.addEventListener("click", () => {
        tabs.forEach((t) => t.classList.remove("active"));
        tab.classList.add("active");
        document.querySelectorAll(".form-panel").forEach((p) => p.classList.remove("active"));
        document.getElementById(`form-${tab.dataset.tab}`).classList.add("active");
        document.getElementById("formSuccess").classList.remove("show");
      });
    });

    document.querySelectorAll("form.form-panel").forEach((form) => {
      form.addEventListener("submit", (e) => {
        e.preventDefault();
        const data = Object.fromEntries(new FormData(form).entries());
        const tipo = form.dataset.tipo;
        const msg = [
          `Hola D'Laurent Professional 👋, quiero registrarme para: ${tipo}`,
          "",
          `Nombre: ${data.nombre}`,
          `Documento: ${data.documento}`,
          `Ciudad: ${data.ciudad}`,
          `WhatsApp: ${data.whatsapp}`,
          `Correo: ${data.correo}`,
        ].join("\n");

        // Guardar copia local como respaldo de leads
        try {
          const leads = JSON.parse(localStorage.getItem("dlaurent_leads") || "[]");
          leads.push({ tipo, ...data, fecha: new Date().toISOString() });
          localStorage.setItem("dlaurent_leads", JSON.stringify(leads));
        } catch (err) {
          /* localStorage no disponible: continuar sin bloquear el envío */
        }

        document.querySelectorAll(".form-panel").forEach((p) => p.classList.remove("active"));
        document.getElementById("formSuccess").classList.add("show");
        form.reset();

        window.open(waLink(msg), "_blank", "noopener");
      });
    });
  }

  /* ---------------------------------------------------------------------
     Gallery: render, filter by category, lightbox
     --------------------------------------------------------------------- */
  let galleryFiltered = GALLERY.slice();

  function applyGalleryFilter(cat) {
    galleryFiltered = cat === "todos" ? GALLERY.slice() : GALLERY.filter((g) => g.category === cat);
    renderGalleryGrid(document.getElementById("galleryGrid"), galleryFiltered);
  }

  function initGallery() {
    applyGalleryFilter("todos");
    document.querySelectorAll(".gallery-tab").forEach((tab) => {
      tab.addEventListener("click", () => {
        document.querySelectorAll(".gallery-tab").forEach((t) => t.classList.remove("active"));
        tab.classList.add("active");
        applyGalleryFilter(tab.dataset.cat);
      });
    });
    initGalleryLightbox(document.getElementById("galleryGrid"), () => galleryFiltered, () =>
      showToast("Este video estará disponible muy pronto")
    );
  }

  /* ---------------------------------------------------------------------
     Header shrink on scroll
     --------------------------------------------------------------------- */
  function initHeaderScroll() {
    const header = document.querySelector("header.site-header");
    let lastY = 0;
    window.addEventListener("scroll", () => {
      const y = window.scrollY;
      header.style.boxShadow = y > 20 ? "0 10px 30px rgba(0,0,0,.25)" : "none";
      lastY = y;
    });
  }

  /* ---------------------------------------------------------------------
     Init
     --------------------------------------------------------------------- */
  document.addEventListener("DOMContentLoaded", async () => {
    document.getElementById("year").textContent = new Date().getFullYear();
    await loadLiveContent();
    applySiteImages();
    wireWhatsappLinks();
    startCountdown();
    initReveal();
    initTimeBars();
    initMobileNav();
    renderBenefits();
    renderProducts();
    initCart();
    initPayModal();
    renderTestimonials();
    renderFaq();
    initForms();
    initGallery();
    initHeaderScroll();

    setTimeout(() => {
      document.getElementById("fabTooltip").classList.add("show");
      setTimeout(() => document.getElementById("fabTooltip").classList.remove("show"), 4000);
    }, 2500);
  });
})();
