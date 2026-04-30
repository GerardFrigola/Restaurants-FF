# Els nostres restaurants 🍃

Aplicació web per guardar restaurants visitats i pendents de visitar amb mapa, fotos, valoracions, etiquetes i comentaris. Feta amb HTML + CSS + JS purs i Firebase com a backend gratuït.

## Característiques
- Mapa Leaflet + OpenStreetMap (sense claus d'API).
- Dos estats: **visitats** (verd) i **per visitar** (marró).
- Valoració separada (menjar / ambient / servei) i mitjana automàtica.
- Etiquetes predefinides + lliures, preu €..€€€€, favorits, data, comentari, foto.
- Filtres, cerca, vista mapa/llista, "centra'm aquí", exportar/importar JSON.
- Multilingüe Català/Anglès (per defecte CA).
- Compartit en temps real entre tu i la teva parella via Firestore.
- Hostatjat gratuïtament a GitHub Pages.

---

## 1) Configurar Firebase (gratis)

1. Vés a <https://console.firebase.google.com/> i clica **"Crear un projecte"**. Posa-li el nom que vulguis (p.ex. `restaurantsff`). Pots desactivar Google Analytics.
2. Quan estigui creat, dins el projecte:
   - **Build → Authentication → Get started**. A la pestanya **Sign-in method** activa **Anonymous**.
   - **Build → Firestore Database → Create database**. Tria una regió pròxima (eur3) i comença en **production mode**.
   - (No cal activar Storage: les fotos es desen comprimides dins el mateix document de Firestore.)
3. **Configurar regles de seguretat** (substitueix les regles per defecte):

   **Firestore** (Rules):
   ```
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /restaurants/{doc} {
         allow read, write: if request.auth != null;
       }
     }
   }
   ```


4. **Obtenir la config web**: Configuració del projecte (icona de l'engranatge) → **Els teus apps** → Web (icona `</>`). Dóna-li un sobrenom i clica **Registrar app**. Copia l'objecte `firebaseConfig`.
5. Obre `js/firebase-config.js` i:
   - Substitueix `firebaseConfig` pel que has copiat.
   - Canvia `SHARED_PASSWORD` per la contrasenya que vulguis compartir amb la teva parella (pot ser qualsevol cosa).

> ⚠️ Important: la `SHARED_PASSWORD` és visible al codi font. És només una barrera UX; la seguretat real ve de les regles de Firestore/Storage que requereixen sessió autenticada (anònima en aquest cas). Qualsevol que conegui la URL i tingui ganes de bisbisar pot obrir Firebase i veure les dades. Per a un cas real (vosaltres dos), és més que suficient.

---

## 2) Provar localment

Obre la carpeta amb un servidor estàtic. Per ex., amb Python instal·lat:

```powershell
python -m http.server 8080
```

Després obre <http://localhost:8080>.

(No funcionarà obrint `index.html` directament amb `file://` perquè els mòduls ES requereixen HTTP.)

---

## 3) Publicar a GitHub Pages

1. Crea un repositori nou a GitHub (p.ex. `restaurantsff`) i puja-hi els fitxers:
   ```powershell
   cd "C:\Users\Usuario\Desktop\project"
   git init
   git add .
   git commit -m "Initial"
   git branch -M main
   git remote add origin https://github.com/EL_TEU_USUARI/restaurantsff.git
   git push -u origin main
   ```
2. Al repositori a github.com → **Settings → Pages**. A *Source* selecciona **Deploy from a branch**, branch **main**, carpeta **/ (root)**. Desa.
3. Espera 1-2 minuts. La teva web estarà a:
   `https://EL_TEU_USUARI.github.io/restaurantsff/`
4. **Important**: torna a la consola de Firebase → Authentication → **Settings → Authorized domains** i afegeix `EL_TEU_USUARI.github.io` (i `localhost` si vols seguir provant en local).

Compartiu l'URL i la contrasenya amb la teva parella i ja podeu començar a guardar restaurants 💚

---

## Estructura

```
index.html
styles.css
js/
  firebase-config.js    ← AQUÍ poses la teva config + contrasenya
  i18n.js
  app.js
```

## Costos
Tot el que utilitzem és dins el pla gratuït de Firebase (Spark):
- Firestore: 1 GiB i 50K lectures/dia. Per 20 restaurants/any és residual.
- Fotos: es desen com a base64 dins el document de Firestore (límit 1 MB per document). L'app comprimeix automàticament cada foto fins que cap (~500-700 KB típicament).
- Auth anònima: il·limitada.
- GitHub Pages: gratis per a repos públics.

## Coses que pots personalitzar
- Tags per defecte: edita `DEFAULT_TAGS` a `js/firebase-config.js`.
- Idiomes / textos: `js/i18n.js`.
- Colors: variables CSS al començament de `styles.css`.
- Centre inicial del mapa: a `app.js` cerca `setView([41.3874, 2.1686], 12)` (ara Barcelona).
