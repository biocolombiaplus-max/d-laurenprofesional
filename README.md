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
assets/js/site-images.js   → contenido EDITABLE: foto del hero y fondos de sección
assets/js/main.js          → lógica del sitio (carrito, formularios, carrusel, countdown, lightbox, etc.)
assets/js/admin.js         → lógica del panel administrador
assets/img/                → imágenes de producto (SVG editables) y assets/img/gallery/ para fotos reales
assets/img/backgrounds/    → carpeta para la foto del hero y los fondos de sección
assets/video/               → carpeta para tus videos reales del proceso
assets/docs/                → instructivo técnico de aplicación en PDF (descargable desde la sección de Capacitación)
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

## Panel administrador (`/admin.html`) — publicación instantánea con Supabase

El panel en **`admin.html`** está conectado a [Supabase](https://supabase.com/) (gratis, sin tarjeta de crédito) para que subir una foto o video se vea reflejado **al instante para todos tus visitantes**, sin descargar archivos ni hacer push a GitHub. Si ya publicaste el sitio (por ejemplo en Vercel), entras agregando `/admin.html` al final de tu dominio: `https://tu-sitio.vercel.app/admin.html`.

### Configuración inicial (una sola vez)

1. Crea una cuenta gratis en [supabase.com](https://supabase.com/) → "New Project" (no pide tarjeta).
2. Ve a **SQL Editor** (menú izquierdo) → "New query" → pega y ejecuta (▶ Run) este script completo — crea la tabla de contenido, el bucket de archivos y los permisos correctos en un solo paso:

   ```sql
   create table if not exists site_content (
     key text primary key,
     data jsonb not null,
     updated_at timestamptz default now()
   );
   alter table site_content enable row level security;
   create policy "Public can read site content" on site_content for select using (true);
   create policy "Authenticated can insert site content" on site_content for insert with check (auth.role() = 'authenticated');
   create policy "Authenticated can update site content" on site_content for update using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

   insert into storage.buckets (id, name, public) values ('media', 'media', true) on conflict (id) do nothing;
   create policy "Public can view media" on storage.objects for select using (bucket_id = 'media');
   create policy "Authenticated can upload media" on storage.objects for insert with check (bucket_id = 'media' and auth.role() = 'authenticated');
   create policy "Authenticated can update media" on storage.objects for update using (bucket_id = 'media' and auth.role() = 'authenticated');
   ```

3. Ve a **Authentication → Users** → "Add user" → pon tu correo y una contraseña → activa **"Auto Confirm User"** → Create user. Ese será tu login del panel.
4. Ve a ⚙️ **Project Settings → API** → copia el "Project URL" y la llave "anon public".
5. Pega esos 2 valores en `assets/js/supabase-config.js` (reemplaza los `"TU_..."`).

Mientras `supabase-config.js` tenga los valores de fábrica (`"TU_SUPABASE_URL"`, etc.), el sitio sigue funcionando normal con el contenido local de `gallery-data.js` y `site-images.js`, y `admin.html` muestra un aviso de "panel no conectado" en vez del login — no se rompe nada por no tenerlo configurado todavía.

### Uso diario

Una vez conectado, inicias sesión con tu correo/contraseña y el panel tiene **dos pestañas**:
- **📸 Fotos y videos (Resultados)**: sube el archivo, escribe la descripción y categoría, ordena con las flechas ↑ ↓. Cada cambio se sube a Supabase Storage y se guarda en la base de datos de inmediato — no hay botón de "publicar", ya queda en línea.
- **🖼️ Imagen del hero y fondos**: reemplaza la ilustración del hero por una foto real, y/o activa una foto de fondo en cualquier sección (Beneficios, Resultados, Productos, Testimonios, Capacitación/Distribuidores, Preguntas frecuentes), con un velo claro/oscuro ajustable para mantener el texto legible. También se publica al instante.

Los archivos `gallery-data.js` y `site-images.js` locales quedan como **contenido de respaldo** (se usan solo si Supabase no está configurado o falla la conexión), así el sitio nunca se rompe por completo.

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
