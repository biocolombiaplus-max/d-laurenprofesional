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

1. **Precios**: cambia `price: null` por el valor en pesos (ej. `price: 180000`) en cada producto dentro de `PRODUCTS`. Mientras el precio esté en `null`, el sitio muestra "Consultar" y remite a WhatsApp. Todo esto también se puede editar visualmente desde la pestaña "Productos" del panel administrador (`/admin.html`), incluyendo:
   - **Moneda** (`currency`: COP, USD o EUR) — si eliges una distinta a COP, el botón de compra directa se reemplaza por "Escríbenos por WhatsApp", porque Wompi solo procesa pagos en pesos colombianos.
   - **Precio antes** (`comparePrice`) — si es mayor al precio actual, la landing muestra el precio tachado, el % de descuento y una insignia de "Oferta" sobre la foto del producto.
2. **Wompi**: ya está conectada la llave pública (`wompiPublicKey`) en `SITE_CONFIG` — los botones de pago abren el Checkout de Wompi automáticamente con el total del carrito. Nunca pegues aquí tu llave PRIVADA (este sitio es 100% estático y no tiene backend, así que cualquier dato en estos archivos queda visible públicamente). Si Wompi te entrega un "Secreto de integridad" (panel Wompi → Desarrolladores), puedes pegarlo en `wompiIntegritySecret` para blindar el monto contra manipulación.
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
6. **Solo si quieres activar la Reunión Virtual semanal y el CRM** (ver más abajo): en el mismo **SQL Editor**, pega y ejecuta también este segundo script — crea la tabla de registros, la función que cuenta los cupos disponibles sin exponer datos de contacto al público, y el límite real de 10 cupos por sesión:

   ```sql
   create table if not exists webinar_registrations (
     id uuid primary key default gen_random_uuid(),
     created_at timestamptz not null default now(),
     day text not null check (day in ('martes','jueves')),
     session_date date not null,
     nombre text not null,
     correo text not null,
     whatsapp text not null,
     status text not null default 'nuevo',
     notes text not null default ''
   );
   alter table webinar_registrations enable row level security;
   create policy "Public can register for webinars" on webinar_registrations for insert with check (true);
   create policy "Authenticated can view registrations" on webinar_registrations for select using (auth.role() = 'authenticated');
   create policy "Authenticated can update registrations" on webinar_registrations for update using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

   create or replace function get_webinar_spots(p_day text, p_session_date date)
   returns integer language sql security definer set search_path = public as $$
     select count(*)::int from webinar_registrations where day = p_day and session_date = p_session_date;
   $$;
   grant execute on function get_webinar_spots(text, date) to anon, authenticated;

   create or replace function enforce_webinar_capacity()
   returns trigger language plpgsql security definer as $$
   begin
     if (select count(*) from webinar_registrations where day = new.day and session_date = new.session_date) >= 10 then
       raise exception 'Cupo lleno para esta sesión';
     end if;
     return new;
   end;
   $$;
   drop trigger if exists trg_webinar_capacity on webinar_registrations;
   create trigger trg_webinar_capacity before insert on webinar_registrations for each row execute function enforce_webinar_capacity();
   ```

Mientras `supabase-config.js` tenga los valores de fábrica (`"TU_SUPABASE_URL"`, etc.), el sitio sigue funcionando normal con el contenido local de `gallery-data.js` y `site-images.js`, y `admin.html` muestra un aviso de "panel no conectado" en vez del login — no se rompe nada por no tenerlo configurado todavía.

### Uso diario

Una vez conectado, inicias sesión con tu correo/contraseña y el panel tiene **cinco pestañas**:
- **📸 Fotos y videos (Resultados)**: sube el archivo, escribe la descripción y categoría, ordena con las flechas ↑ ↓. Cada cambio se sube a Supabase Storage y se guarda en la base de datos de inmediato — no hay botón de "publicar", ya queda en línea.
- **🖼️ Imagen del hero y fondos**: reemplaza la ilustración del hero por una foto real, y/o activa una foto de fondo en cualquier sección (Beneficios, Resultados, Productos, Testimonios, Capacitación/Distribuidores, Preguntas frecuentes), con un velo claro/oscuro ajustable para mantener el texto legible. También se publica al instante.
- **🏅 Íconos de beneficios**: reemplaza los emojis de "Por qué D'Laurent" por tus propios logos/íconos, y edita el título/texto de cada beneficio.
- **🛍️ Productos (Tienda)**: agrega, edita, reordena y elimina productos como en una tienda Shopify — foto, nombre, tagline, tamaño, precio en COP, insignia y características. Se publica al instante en la sección "Productos" de tu landing y alimenta el carrito de compra y los botones de pago de Wompi.
- **📍 Salones Aliados**: agrega, edita y elimina los salones de tu red de distribución — nombre, departamento, ciudad/municipio, dirección, WhatsApp e Instagram opcionales, logo y la insignia "★ Fundador" para los primeros 20 del lanzamiento. No necesitas ninguna llave de Google Maps: el mapa de cada salón se genera automáticamente a partir de la dirección. Se publica al instante en la sección "Salones Aliados" de tu landing, con filtros por departamento y ciudad para tus clientas.

La landing también incluye una **calculadora de rentabilidad** (sección "Calculadora", antes de "Resultados") para que estilistas y salones vean en pesos cuánto pueden ganar al reducir el tiempo de aplicación — no requiere configuración, funciona sola con los datos que el visitante ingresa.

Los archivos `gallery-data.js` y `site-images.js` locales quedan como **contenido de respaldo** (se usan solo si Supabase no está configurado o falla la conexión), así el sitio nunca se rompe por completo.

## Captura de leads (Capacitación / Distribuidores)

Como el sitio es estático (sin servidor propio), el formulario de registro:
1. Guarda una copia de respaldo en el navegador del usuario (`localStorage`, clave `dlaurent_leads`) — solo visible en ese dispositivo, es un respaldo local, no una base de datos central.
2. Abre WhatsApp automáticamente con todos los datos (nombre, documento, ciudad, WhatsApp, correo) listos para enviar al `+57 350 545 7420`.

Si más adelante quieres centralizar los leads en una hoja de cálculo o CRM, se puede conectar el formulario a un servicio como Google Sheets, Airtable o un backend propio — el HTML ya tiene los campos (`nombre`, `documento`, `ciudad`, `whatsapp`, `correo`) listos para integrarse.

## Pagos

- **Nequi**: se muestra el número y el titular en el modal de pago; el cliente transfiere y envía el comprobante por WhatsApp.
- **Wompi**: los botones "Pagar con tarjeta o cuenta" y "Pagar con Nequi (5% dcto)" abren el Checkout de Wompi con el total del carrito (el de Nequi aplica el descuento configurado en `nequiDiscountPct`). Ambos usan solo la llave pública de Wompi.

## Cómo previsualizar localmente

No requiere instalación. Basta con abrir `index.html` en el navegador, o servirlo con cualquier servidor estático, por ejemplo:

```bash
python3 -m http.server 8080
```

y visitar `http://localhost:8080`.

## Publicar

Sube el contenido de esta carpeta a tu hosting o activa GitHub Pages sobre la rama principal — no hay paso de build, `index.html` es el punto de entrada.
