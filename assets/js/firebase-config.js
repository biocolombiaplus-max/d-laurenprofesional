/* =========================================================================
   CONFIGURACIÓN DE FIREBASE — pega aquí las llaves de tu proyecto
   -------------------------------------------------------------------------
   De dónde salen estos valores: Firebase Console → ⚙️ Configuración del
   proyecto → "Tus apps" → tu app web → "SDK setup and configuration".

   Mientras estos valores digan "TU_...", el sitio sigue funcionando
   normalmente usando el contenido local (assets/js/gallery-data.js y
   assets/js/site-images.js) — no se rompe nada por no tenerlos aún.
   ========================================================================= */

const FIREBASE_CONFIG = {
  apiKey: "TU_API_KEY",
  authDomain: "TU_PROYECTO.firebaseapp.com",
  projectId: "TU_PROYECTO",
  storageBucket: "TU_PROYECTO.appspot.com",
  messagingSenderId: "TU_SENDER_ID",
  appId: "TU_APP_ID",
};

const FIREBASE_READY = FIREBASE_CONFIG.apiKey !== "TU_API_KEY";

let firebaseDb = null;
let firebaseStorage = null;
let firebaseAuth = null;

if (FIREBASE_READY && typeof firebase !== "undefined") {
  firebase.initializeApp(FIREBASE_CONFIG);
  firebaseDb = firebase.firestore();
  firebaseStorage = firebase.storage();
  if (firebase.auth) firebaseAuth = firebase.auth();
}
