// ⚠️  CONFIGURACIÓ DE FIREBASE
// Substitueix els valors de baix pels de la teva consola Firebase.
// Veure README.md per la guia completa.

export const firebaseConfig = {
  apiKey: "AIzaSyAJ36pqgrKu65oqYO9kbIj3S3gYBmAEegM",
  authDomain: "restaurantsff.firebaseapp.com",
  projectId: "restaurantsff",
  storageBucket: "restaurantsff.firebasestorage.app",
  messagingSenderId: "896923093251",
  appId: "1:896923093251:web:0bd406cbabc2f02ff80136"
};

// Contrasenya compartida que heu d'introduir tu i la teva parella per entrar.
// (És només una barrera UX; les regles de Firestore també exigeixen sessió anònima.)
export const SHARED_PASSWORD = "Etretat22";

// Etiquetes predefinides suggerides (es poden afegir de noves des del formulari)
export const DEFAULT_TAGS = [
  "italià", "japonès", "mexicà", "tapes", "vegetarià",
  "vegà", "pizza", "hamburguesa", "asiàtic", "mediterrani",
  "marisc", "carn", "brunch", "cafè", "postres",
  "romàntic", "terrassa", "barat", "amb amics", "especial", "ramen",
  "menu", "català", "francès", "xines", "indi", "thai"
];
