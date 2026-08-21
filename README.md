# D'Laurent Professional Colombia — Landing Page

Landing page de ventas para la línea de **Alisado Profesional D'Laurent**, distribuido en exclusiva en Colombia. Sitio 100% estático (HTML/CSS/JS puro), sin dependencias de build, listo para publicar en cualquier hosting (GitHub Pages, Netlify, Vercel, cPanel, etc.).

## Estructura

```
index.html                 → toda la landing (hero, beneficios, productos, testimonios, formularios, FAQ, footer)
admin.html                 → panel administrador para gestionar la galería de fotos/videos (ver más abajo)
assets/css/style.css       → estilos del sitio (paleta morado + dorado, animaciones, responsive)
assets/css/admin.css       → estilos propios del panel administrador
assets/js/data.js          → CONFIGURACIÓN EDITABLE (WhatsApp, Nequi, Wompi, productos, precios, reseñas, FAQ)
assets/js/gallery-data.js  → contenido EDITABLE de la galería "Resultados" (fotos y videos)
assets/js/gallery-render.js→ lógica compartida para dibujar la galería (sitio público y panel admin)
assets/js/main.js          → lógica del sitio (carrito, formularios, carrusel, countdown, lightbox, etc.)
assets/js/admin.js         → lógica del panel administrador
assets/img/                → imágenes de producto (SVG editables) y assets/img/gallery/ para fotos reales
assets/video/               → carpeta para tus videos reales del proceso
```

## Qué editar primero (`assets/js/data.js`)

1. **Precios**: cambia `price: null` por el valor en pesos (ej. `price: 180000`) en cada producto dentro de `PRODUCTS`. Mientras el precio esté en `null`, el sitio muestra "Consultar" y remite a WhatsApp.
2. **Link de pago Wompi**: pega tu URL de pago en `wompiPaymentLink` dentro de `SITE_CONFIG`. Mientras esté vacío, el botón de Wompi también remite a WhatsApp.
3. **Nequi**: número y titular ya configurados (`3505457420` / Juan Cáceres). Cámbialos si es necesario.
4. **WhatsApp**: número ya configurado (`+57 350 545 7420`). Todos los botones de "WhatsApp" del sitio usan este mismo número.
5. **Fecha de oferta de lanzamiento**: ajusta `launchOfferEndsAt` con la fecha real en que termina tu promoción (el contador de la barra superior se calcula automáticamente).
6. **Reseñas**: agrega, edita o borra objetos dentro de `REVIEWS`.
7. **Preguntas frecuentes**: agrega, edita o borra objetos dentro de `FAQS`.

## Fotos y videos reales

El sitio se entrega con:
- **Imágenes de producto** (hero y tarjetas de producto): ilustraciones vectoriales (SVG) en `assets/img/hero-kit.svg`, `kit-120.svg`, `kit-250.svg`, `kit-500.svg`, con la paleta de marca (frascos, botánicos, numeración de pasos). Puedes reemplazar cualquiera de estos archivos por una fotografía real (mismo nombre de archivo, o cambia la ruta `src`/`image` en `index.html` y `assets/js/data.js`).
- **Sección "Resultados"** (antes/después y videos del proceso): funciona con datos reales desde `assets/js/gallery-data.js`, con filtros por categoría y una ventana emergente (lightbox) para ver cada foto o video en grande. Se entrega con 6 elementos de ejemplo — reemplázalos por tus fotos y videos reales usando el **panel administrador** descrito abajo.

No se usaron fotos del sitio del fabricante porque el acceso a ese dominio no estuvo disponible durante la generación de este sitio — se recomienda usar fotografía y video propios (con autorización de las clientas) para mayor autenticidad y confianza.

## Panel administrador (`/admin.html`)

Para que puedas agregar fotos y videos de resultados sin tocar código, el sitio incluye un panel visual en **`admin.html`**:

1. Ábrelo en tu navegador y entra con el código de acceso (de fábrica: `dlaurent2024`, cámbialo en `assets/js/admin.js` → `ADMIN_PASSCODE`).
2. Agrega una foto o video: sube el archivo, escribe la descripción y elige la categoría (Antes/Después, Cabello tinturado, Video del proceso, Resultado).
3. Ordena los elementos con las flechas ↑ ↓, edítalos o elimínalos, y mira la **vista previa** de cómo se verán exactamente en tu landing.
4. Cuando estés conforme, haz clic en **"⬇ Descargar gallery-data.js"**.

**Importante — cómo funciona (y sus límites):** este es un sitio 100% estático, sin servidor ni base de datos. El panel guarda tu progreso como borrador en el navegador (localStorage/IndexedDB) para que no lo pierdas entre visitas, pero **eso solo lo ves tú, en ese navegador** — no se publica automáticamente para tus visitantes. Para publicar de verdad:
1. Sube tus fotos/videos originales a `assets/img/gallery/` (fotos) o `assets/video/` (videos) de tu proyecto, con el mismo nombre de archivo que se ve en cada tarjeta del panel.
2. Reemplaza `assets/js/gallery-data.js` por el archivo que descargaste del panel.
3. Sube los cambios a tu hosting (o haz commit y push si usas GitHub) para que se vean en el sitio real.

Si en el futuro quieres que la galería se actualice sin este paso manual (por ejemplo, para que varias personas puedan subir fotos desde el celular sin tocar el código), se necesitaría agregar un backend o un servicio de CMS — este panel es la solución más simple sin esos costos adicionales.

## Captura de leads (Capacitación / Distribuidores)

Como el sitio es estático (sin servidor propio), el formulario de registro:
1. Guarda una copia de respaldo en el navegador del usuario (`localStorage`, clave `dlaurent_leads`) — solo visible en ese dispositivo, es un respaldo local, no una base de datos central.
2. Abre WhatsApp automáticamente con todos los datos (nombre, documento, ciudad, WhatsApp, correo) listos para enviar al `+57 350 545 7420`.

Si más adelante quieres centralizar los leads en una hoja de cálculo o CRM, se puede conectar el formulario a un servicio como Google Sheets, Airtable o un backend propio — el HTML ya tiene los campos (`nombre`, `documento`, `ciudad`, `whatsapp`, `correo`) listos para integrarse.

## Pagos

- **Nequi**: se muestra el número y el titular en el modal de pago; el cliente transfiere y envía el comprobante por WhatsApp.
- **Wompi**: en cuanto generes tu link de pago (o tu integración de checkout de Wompi), pégalo en `wompiPaymentLink` (`assets/js/data.js`) y el botón "Pagar con Wompi" quedará activo automáticamente.

## Cómo previsualizar localmente

No requiere instalación. Basta con abrir `index.html` en el navegador, o servirlo con cualquier servidor estático, por ejemplo:

```bash
python3 -m http.server 8080
```

y visitar `http://localhost:8080`.

## Publicar

Sube el contenido de esta carpeta a tu hosting o activa GitHub Pages sobre la rama principal — no hay paso de build, `index.html` es el punto de entrada.
