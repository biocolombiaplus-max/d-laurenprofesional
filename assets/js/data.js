/* =========================================================================
   D'LAURENT PROFESSIONAL COLOMBIA — CONFIGURACIÓN DEL SITIO
   -------------------------------------------------------------------------
   Este archivo centraliza todo lo que el distribuidor necesita editar
   sin tocar el diseño: WhatsApp, pagos, productos, precios y reseñas.

   CÓMO EDITAR:
   - Precios: cambia el campo "price" de cada producto (número, sin puntos).
     Mientras no definas precios, deja "price: null" y el sitio mostrará
     "Precio de lanzamiento — consulta por WhatsApp".
   - Wompi: ya está conectada tu llave pública. Si más adelante Wompi te entrega
     un "Secreto de integridad" (panel Wompi > Desarrolladores), puedes pegarlo
     en wompiIntegritySecret para blindar el monto del pago. Nunca pegues aquí
     tu llave PRIVADA: este sitio no tiene backend, así que cualquier dato en
     estos archivos es visible públicamente — la llave privada no debe usarse.
   - Reseñas: agrega, edita o elimina objetos dentro de REVIEWS.
   - Fotos/videos reales: reemplaza los archivos en /assets/img/ y
     /assets/video/ manteniendo los mismos nombres, o actualiza las rutas
     "image"/"video" abajo.
   ========================================================================= */

const SITE_CONFIG = {
  brand: "D'LAURENT",
  brandSuffix: "PROFESSIONAL",
  whatsappNumber: "573505457420", // 57 = Colombia + 3505457420
  whatsappDisplay: "+57 350 545 7420",
  nequiNumber: "3505457420",
  nequiHolder: "Juan Cáceres",
  nequiDiscountPct: 5, // % de descuento al pagar con Nequi vía Wompi
  wompiPublicKey: "pub_prod_ePakM1CIHRH6Cg2Y7XacjvTxmLeJsEG2", // llave PÚBLICA de Wompi (segura para el navegador)
  wompiIntegritySecret: "", // opcional: "Secreto de integridad" de tu panel Wompi (Desarrolladores > Secreto de integridad). NUNCA pegues aquí la llave privada.
  instagram: "#",
  tiktok: "#",
  facebook: "#",
  launchOfferEndsAt: "2026-09-30T23:59:59-05:00", // ajusta la fecha real de tu oferta de lanzamiento
  city: "Colombia",
};

/* PRODUCTS: contenido de respaldo. Ahora puedes agregar, editar, eliminar y
   poner precios a tus productos de forma visual desde la pestaña "Productos"
   del panel administrador (/admin.html) — esta lista solo se usa si aún no
   has publicado nada desde allí, o como respaldo si la conexión falla. */
const PRODUCTS = [
  {
    id: "kit-120",
    name: "Kit Presentación 120ML",
    tagline: "Ideal para probar el resultado D'Laurent",
    size: "120 ML",
    price: null, // ej: 180000
    badge: "Iniciación",
    image: "assets/img/kit-120.svg",
    bullets: [
      "1 tratamiento de alisado profesional",
      "Apto para cabello tinturado",
      "Reduce el tiempo del servicio hasta 70%",
    ],
  },
  {
    id: "kit-250",
    name: "Kit Presentación 250ML",
    tagline: "El favorito de salones que atienden a diario",
    size: "250 ML",
    price: null, // ej: 320000
    badge: "Más vendido",
    image: "assets/img/kit-250.svg",
    bullets: [
      "Hasta 4-5 servicios completos",
      "Sin amoniaco, sin olor",
      "Fórmula orgánica y biodegradable",
    ],
  },
  {
    id: "kit-500",
    name: "Kit Presentación 500ML",
    tagline: "Rendimiento profesional para alto volumen",
    size: "500 ML",
    price: null, // ej: 560000
    badge: "Mejor rendimiento",
    image: "assets/img/kit-500.svg",
    bullets: [
      "Hasta 8-10 servicios completos",
      "Precio preferencial por volumen",
      "Ideal para salones y distribuidores",
    ],
  },
];

/* SALONS: contenido de respaldo para la sección "Salones Aliados". Agrega,
   edita, elimina y marca salones como "Fundador" de forma visual desde la
   pestaña "Salones Aliados" del panel administrador (/admin.html). No hace
   falta llave de Google Maps: el mapa se genera a partir de la dirección. */
const SALONS = [];

/* Reseñas — edítalas libremente. Se muestran en el carrusel de testimonios. */
const REVIEWS = [
  {
    name: "Camila Restrepo",
    role: "Estilista independiente · Medellín",
    stars: 5,
    text: "Reduje el tiempo de cada alisado casi a la mitad. Mis clientas notaron que no quedó olor a amoniaco en el salón y eso marcó la diferencia.",
  },
  {
    name: "Salón Bella Imagen",
    role: "Salón de belleza · Bogotá",
    stars: 5,
    text: "Empezamos a atender más clientas por día sin sacrificar el resultado. El brillo y la caída del cabello son de otro nivel.",
  },
  {
    name: "Jhonatan Pérez",
    role: "Peluquero profesional · Cali",
    stars: 5,
    text: "Lo mejor es que funciona perfecto en cabello tinturado, algo que con otras marcas era un problema. Ahora es mi producto de cabecera.",
  },
  {
    name: "Estudio Laura K.",
    role: "Salón de belleza · Barranquilla",
    stars: 5,
    text: "El proceso sin amoniaco fue clave para clientas con piel sensible que antes no podíamos atender. Excelente producto y excelente soporte.",
  },
];

const FAQS = [
  {
    q: "¿Los productos D'Laurent Professional hacen envíos a toda Colombia?",
    a: "Sí. Como distribuidores exclusivos autorizados enviamos a todas las ciudades y municipios de Colombia a través de transportadoras aliadas.",
  },
  {
    q: "¿El tratamiento funciona en cabello tinturado o con color?",
    a: "Sí, es uno de los diferenciales de la línea: la fórmula fue desarrollada para trabajar de forma segura sobre cabello tinturado sin dañar el color ni la fibra capilar.",
  },
  {
    q: "¿Cuánto dura realmente el proceso?",
    a: "Gracias a la fórmula profesional, el proceso completo puede tomar 1 hora o menos, frente a las 4-5 horas de un alisado tradicional, permitiendo atender más clientas por jornada.",
  },
  {
    q: "¿Tiene amoniaco o químicos agresivos?",
    a: "No. Es una fórmula orgánica, libre de amoniaco y de sustancias nocivas, sin olor fuerte, pensada para clientas y estilistas con piel sensible.",
  },
  {
    q: "¿Cómo puedo ser distribuidor mayorista en mi ciudad?",
    a: "Regístrate en la sección 'Distribuidores' con tus datos y un asesor te contactará por WhatsApp con precios especiales al por mayor.",
  },
  {
    q: "¿Cómo pago mi pedido?",
    a: "Puedes pagar por Nequi o a través de Wompi (tarjeta, PSE y más). Al confirmar tu pedido por WhatsApp te guiamos paso a paso.",
  },
];
