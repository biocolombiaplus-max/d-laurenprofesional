# D'Laurent Professional Colombia — Landing Page

Landing page de ventas para la línea de **Alisado Profesional D'Laurent**, distribuido en exclusiva en Colombia. Sitio 100% estático (HTML/CSS/JS puro), sin dependencias de build, listo para publicar en cualquier hosting (GitHub Pages, Netlify, Vercel, cPanel, etc.).

## Estructura

```
index.html                 → toda la landing (hero, beneficios, productos, testimonios, formularios, FAQ, footer)
assets/css/style.css       → estilos (paleta morado + dorado, animaciones, responsive)
assets/js/data.js          → CONFIGURACIÓN EDITABLE (WhatsApp, Nequi, Wompi, productos, precios, reseñas, FAQ)
assets/js/main.js          → lógica del sitio (carrito, formularios, carrusel, countdown, etc.)
assets/img/                → imágenes de productos (SVG editables) y espacio para fotos/videos reales
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
- **Imágenes de producto**: ilustraciones vectoriales (SVG) en `assets/img/kit-120.svg`, `kit-250.svg`, `kit-500.svg` con la paleta de marca. Puedes reemplazarlas por fotografías reales de los empaques (mismo nombre de archivo, o actualiza la ruta `image` en `data.js`).
- **Sección "Resultados" (antes/después y videos)**: quedó con tarjetas de marcador de posición (`index.html`, sección `id="resultados"`) listas para recibir tus fotos y videos reales de clientas y salones. No se usaron fotos del sitio del fabricante porque el acceso a ese dominio no estuvo disponible durante la generación de este sitio — se recomienda usar fotografía propia (con autorización) para mayor autenticidad y confianza.

Para agregar una foto o video real:
1. Coloca el archivo en `assets/img/` (fotos) o `assets/video/` (videos).
2. En `index.html`, dentro de `.gallery-grid`, reemplaza el `<div class="gallery-item">` correspondiente por una imagen (`<img src="assets/img/tu-foto.jpg">`) o un video.

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
