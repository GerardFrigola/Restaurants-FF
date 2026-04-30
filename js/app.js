import { I18N } from "./i18n.js";
import { firebaseConfig, SHARED_PASSWORD, DEFAULT_TAGS } from "./firebase-config.js";

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getAuth, signInAnonymously, onAuthStateChanged, signOut
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  getFirestore, collection, doc, addDoc, setDoc, deleteDoc,
  onSnapshot, serverTimestamp, getDocs, writeBatch
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// ---------- Firebase init ----------
const fbApp = initializeApp(firebaseConfig);
const auth = getAuth(fbApp);
const db = getFirestore(fbApp);
const COL = collection(db, "restaurants");

// ---------- State ----------
const state = {
  restaurants: [],
  markers: new Map(),    // id -> Leaflet marker
  filters: {
    search: "",
    visited: true,
    wishlist: true,
    fav: false,
    price: "",
    tag: "",
    rating: ""
  },
  editingId: null,
  pendingPhoto: null,
  view: "map"
};

// ---------- DOM ----------
const $ = (s) => document.querySelector(s);
const loginOverlay = $("#login-overlay");
const loginForm = $("#login-form");
const loginPass = $("#login-pass");
const loginError = $("#login-error");
const appEl = $("#app");
const modal = $("#modal");
const form = $("#rest-form");
const modalClose = $("#modal-close");
const modalTitle = $("#modal-title");
const btnDelete = $("#btn-delete");
const btnAdd = $("#btn-add");
const btnLocate = $("#btn-locate");
const btnListToggle = $("#btn-list-toggle");
const btnExport = $("#btn-export");
const btnImport = $("#btn-import");
const importFile = $("#import-file");
const btnLogout = $("#btn-logout");
const listView = $("#list-view");
const mapEl = $("#map");
const statusSel = $("#status-sel");
const visitedFields = $("#visited-fields");
const photoInput = $("#photo-input");
const photoPreview = $("#photo-preview");
const tagsInput = $("#tags-input");
const tagSuggestions = $("#tag-suggestions");
const addrInput = $("#addr-input");
const addrSearch = $("#addr-search");
const addrResults = $("#addr-results");
const latInput = $("#lat-input");
const lngInput = $("#lng-input");

// ---------- Login ----------
function showApp() {
  loginOverlay.classList.add("hidden");
  appEl.classList.remove("hidden");
  initApp();
}
function showLogin() {
  loginOverlay.classList.remove("hidden");
  appEl.classList.add("hidden");
}

loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  loginError.classList.add("hidden");
  if (loginPass.value !== SHARED_PASSWORD) {
    loginError.classList.remove("hidden");
    return;
  }
  try {
    if (!auth.currentUser) {
      await signInAnonymously(auth);
    }
    sessionStorage.setItem("authed", "1");
    showApp();
  } catch (err) {
    console.error(err);
    alert("Error: " + err.message);
  }
});

btnLogout.addEventListener("click", async () => {
  sessionStorage.removeItem("authed");
  await signOut(auth);
  location.reload();
});

onAuthStateChanged(auth, (user) => {
  if (user && sessionStorage.getItem("authed") === "1") {
    showApp();
  } else {
    showLogin();
  }
});

// ---------- Map ----------
let map, mapClickMarker;
function initMap() {
  map = L.map("map", { zoomControl: true }).setView([41.3874, 2.1686], 12); // Barcelona
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
  }).addTo(map);

  map.on("click", (e) => {
    if (modal.classList.contains("hidden")) return; // only when form open
    setFormLatLng(e.latlng.lat, e.latlng.lng);
  });
}

function makeIcon(status, fav) {
  const star = fav ? "★" : "";
  return L.divIcon({
    className: "",
    html: `<div class="marker-pin ${status}"><span>${star}</span></div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 28],
    popupAnchor: [0, -28]
  });
}

function popupHtml(r) {
  const ratings = [r.ratingFood, r.ratingAmbience, r.ratingService].filter(n => Number.isFinite(n));
  const avg = ratings.length ? (ratings.reduce((a,b)=>a+b,0) / ratings.length).toFixed(1) : null;
  const stars = avg ? "★".repeat(Math.round(avg)) + "☆".repeat(5 - Math.round(avg)) : "";
  const tags = (r.tags || []).map(t => `<span class="tag">${escapeHtml(t)}</span>`).join(" ");
  const photo = r.photoUrl ? `<img src="${r.photoUrl}" alt="">` : "";
  const date = r.visitDate ? `<div class="meta">${I18N.t("visited_on")}: ${r.visitDate}</div>` : "";
  const price = r.price ? `<span class="tag brown">${r.price}</span>` : "";
  const fav = r.favorite ? `<span class="fav-star">★</span> ` : "";
  const comment = r.comment ? `<p>${escapeHtml(r.comment)}</p>` : "";
  return `
    <div class="popup-card">
      <h3>${fav}${escapeHtml(r.name)}</h3>
      <div class="meta">
        <span class="badge-status ${r.status}">${I18N.t(r.status)}</span>
        ${price}
        ${avg ? `<span>${stars} (${avg})</span>` : ""}
      </div>
      ${photo}
      ${date}
      ${comment}
      <div class="tags">${tags}</div>
      <div class="actions">
        <button data-action="edit" data-id="${r.id}">${I18N.t("edit")}</button>
      </div>
    </div>`;
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
  }[c]));
}

function refreshMarkers() {
  // Remove existing markers
  for (const m of state.markers.values()) m.remove();
  state.markers.clear();

  for (const r of filteredRestaurants()) {
    if (!Number.isFinite(r.lat) || !Number.isFinite(r.lng)) continue;
    const m = L.marker([r.lat, r.lng], { icon: makeIcon(r.status, r.favorite) })
      .addTo(map)
      .bindPopup(() => popupHtml(r));
    m.on("popupopen", () => {
      const node = m.getPopup().getElement();
      node.querySelector('[data-action="edit"]')?.addEventListener("click", () => openForm(r));
    });
    state.markers.set(r.id, m);
  }
}

// ---------- Filters / search ----------
function filteredRestaurants() {
  const f = state.filters;
  const term = f.search.trim().toLowerCase();
  return state.restaurants.filter(r => {
    if (r.status === "visited" && !f.visited) return false;
    if (r.status === "wishlist" && !f.wishlist) return false;
    if (f.fav && !r.favorite) return false;
    if (f.price && r.price !== f.price) return false;
    if (f.tag && !(r.tags || []).includes(f.tag)) return false;
    if (f.rating) {
      const ratings = [r.ratingFood, r.ratingAmbience, r.ratingService].filter(n => Number.isFinite(n));
      const avg = ratings.length ? ratings.reduce((a,b)=>a+b,0)/ratings.length : 0;
      if (avg < Number(f.rating)) return false;
    }
    if (term) {
      const hay = (r.name + " " + (r.tags || []).join(" ") + " " + (r.address || "")).toLowerCase();
      if (!hay.includes(term)) return false;
    }
    return true;
  });
}

function bindFilters() {
  $("#search").addEventListener("input", e => { state.filters.search = e.target.value; render(); });
  $("#f-visited").addEventListener("change", e => { state.filters.visited = e.target.checked; render(); });
  $("#f-wishlist").addEventListener("change", e => { state.filters.wishlist = e.target.checked; render(); });
  $("#f-fav").addEventListener("change", e => { state.filters.fav = e.target.checked; render(); });
  $("#f-price").addEventListener("change", e => { state.filters.price = e.target.value; render(); });
  $("#f-tag").addEventListener("change", e => { state.filters.tag = e.target.value; render(); });
  $("#f-rating").addEventListener("change", e => { state.filters.rating = e.target.value; render(); });
}

function refreshTagFilter() {
  const sel = $("#f-tag");
  const current = sel.value;
  const tags = new Set();
  state.restaurants.forEach(r => (r.tags || []).forEach(t => tags.add(t)));
  sel.innerHTML = `<option value="">${I18N.t("any_tag")}</option>` +
    [...tags].sort().map(t => `<option value="${escapeHtml(t)}">${escapeHtml(t)}</option>`).join("");
  if ([...tags].includes(current)) sel.value = current;
}

// ---------- List view ----------
function renderList() {
  const items = filteredRestaurants();
  if (!items.length) {
    listView.innerHTML = `<p style="color:var(--muted)">${I18N.t("no_results")}</p>`;
    return;
  }
  listView.innerHTML = items.map(r => {
    const ratings = [r.ratingFood, r.ratingAmbience, r.ratingService].filter(n => Number.isFinite(n));
    const avg = ratings.length ? (ratings.reduce((a,b)=>a+b,0) / ratings.length).toFixed(1) : null;
    const stars = avg ? "★".repeat(Math.round(avg)) + "☆".repeat(5 - Math.round(avg)) : "";
    const tags = (r.tags || []).map(t => `<span class="tag">${escapeHtml(t)}</span>`).join(" ");
    const fav = r.favorite ? `<span class="fav-star">★</span> ` : "";
    return `
      <article class="rest-card" data-id="${r.id}">
        ${r.photoUrl ? `<img src="${r.photoUrl}" alt="">` : ""}
        <div class="body">
          <h3>${fav}${escapeHtml(r.name)}</h3>
          <div class="meta">
            <span class="badge-status ${r.status}">${I18N.t(r.status)}</span>
            ${r.price ? `<span class="tag brown">${r.price}</span>` : ""}
            ${avg ? `<span>${stars} (${avg})</span>` : ""}
            ${r.visitDate ? `<span>${r.visitDate}</span>` : ""}
          </div>
          <div class="tags">${tags}</div>
        </div>
      </article>`;
  }).join("");

  listView.querySelectorAll(".rest-card").forEach(el => {
    el.addEventListener("click", () => {
      const r = state.restaurants.find(x => x.id === el.dataset.id);
      if (r) openForm(r);
    });
  });
}

function render() {
  refreshTagFilter();
  if (state.view === "map") refreshMarkers();
  else renderList();
}

// ---------- Form ----------
function openForm(restaurant) {
  state.editingId = restaurant?.id || null;
  state.pendingPhoto = null;
  form.reset();
  photoPreview.classList.add("hidden");
  photoPreview.removeAttribute("src");
  addrResults.classList.add("hidden");
  btnDelete.classList.toggle("hidden", !restaurant);
  modalTitle.textContent = I18N.t(restaurant ? "edit_restaurant" : "new_restaurant");

  if (restaurant) {
    form.elements.name.value = restaurant.name || "";
    form.elements.status.value = restaurant.status || "wishlist";
    form.elements.address.value = restaurant.address || "";
    form.elements.lat.value = restaurant.lat ?? "";
    form.elements.lng.value = restaurant.lng ?? "";
    form.elements.price.value = restaurant.price || "";
    form.elements.favorite.checked = !!restaurant.favorite;
    form.elements.tags.value = (restaurant.tags || []).join(", ");
    form.elements.visitDate.value = restaurant.visitDate || "";
    form.elements.ratingFood.value = restaurant.ratingFood ?? "";
    form.elements.ratingAmbience.value = restaurant.ratingAmbience ?? "";
    form.elements.ratingService.value = restaurant.ratingService ?? "";
    form.elements.comment.value = restaurant.comment || "";
    if (restaurant.photoUrl) {
      photoPreview.src = restaurant.photoUrl;
      photoPreview.classList.remove("hidden");
    }
  }
  toggleVisitedFields();
  renderTagSuggestions();
  modal.classList.remove("hidden");
  setTimeout(() => form.elements.name.focus(), 50);
}

function closeForm() { modal.classList.add("hidden"); }
modalClose.addEventListener("click", closeForm);
modal.addEventListener("click", (e) => { if (e.target === modal) closeForm(); });

statusSel.addEventListener("change", toggleVisitedFields);
function toggleVisitedFields() {
  visitedFields.style.display = (statusSel.value === "visited") ? "" : "none";
}

btnAdd.addEventListener("click", () => openForm(null));

btnDelete.addEventListener("click", async () => {
  if (!state.editingId) return;
  if (!confirm(I18N.t("confirm_delete"))) return;
  try {
    await deleteDoc(doc(db, "restaurants", state.editingId));
    closeForm();
  } catch (err) {
    console.error(err); alert(I18N.t("error_save"));
  }
});

// Photo (stored as base64 inside the Firestore document; max ~700KB to stay
// well under Firestore's 1MB document limit)
const PHOTO_MAX_BYTES = 700 * 1024;

photoInput.addEventListener("change", async (e) => {
  const file = e.target.files?.[0];
  if (!file) return;
  if (file.size > 10 * 1024 * 1024) { alert(I18N.t("photo_too_big")); photoInput.value = ""; return; }
  try {
    const dataUrl = await compressImageToDataUrl(file, PHOTO_MAX_BYTES);
    state.pendingPhoto = dataUrl;
    photoPreview.src = dataUrl;
    photoPreview.classList.remove("hidden");
  } catch (err) {
    console.error(err); alert(I18N.t("photo_too_big"));
    photoInput.value = "";
  }
});

// Try several quality/size combinations until the resulting base64 fits.
async function compressImageToDataUrl(file, maxBytes) {
  const img = await loadImage(file);
  const attempts = [
    { size: 1100, q: 0.78 },
    { size: 900,  q: 0.72 },
    { size: 800,  q: 0.65 },
    { size: 700,  q: 0.6  },
    { size: 600,  q: 0.55 },
    { size: 500,  q: 0.5  },
  ];
  for (const a of attempts) {
    const dataUrl = drawToJpegDataUrl(img, a.size, a.q);
    // base64 length * 0.75 ≈ bytes
    const approxBytes = Math.ceil(dataUrl.length * 0.75);
    if (approxBytes <= maxBytes) return dataUrl;
  }
  throw new Error("photo too large after compression");
}

function loadImage(file) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
    img.onerror = (e) => { URL.revokeObjectURL(url); reject(e); };
    img.src = url;
  });
}

function drawToJpegDataUrl(img, maxSize, quality) {
  let { width, height } = img;
  if (width > height && width > maxSize) { height = height * maxSize / width; width = maxSize; }
  else if (height > maxSize) { width = width * maxSize / height; height = maxSize; }
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(width); canvas.height = Math.round(height);
  canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", quality);
}

// Tag suggestions
function renderTagSuggestions() {
  const used = new Set();
  state.restaurants.forEach(r => (r.tags || []).forEach(t => used.add(t)));
  const all = [...new Set([...DEFAULT_TAGS, ...used])].sort();
  tagSuggestions.innerHTML = `<small style="color:var(--muted);width:100%">${I18N.t("suggested_tags")}</small>` +
    all.map(t => `<span class="tag" data-tag="${escapeHtml(t)}">${escapeHtml(t)}</span>`).join("");
  tagSuggestions.querySelectorAll("[data-tag]").forEach(el => {
    el.addEventListener("click", () => {
      const current = tagsInput.value.split(",").map(s => s.trim()).filter(Boolean);
      if (!current.includes(el.dataset.tag)) {
        current.push(el.dataset.tag);
        tagsInput.value = current.join(", ");
      }
    });
  });
}

// Save form
form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const fd = new FormData(form);
  const data = {
    name: fd.get("name").trim(),
    status: fd.get("status"),
    address: (fd.get("address") || "").trim() || null,
    lat: parseFloat(fd.get("lat")),
    lng: parseFloat(fd.get("lng")),
    price: fd.get("price") || null,
    favorite: form.elements.favorite.checked,
    tags: (fd.get("tags") || "").split(",").map(s => s.trim()).filter(Boolean),
    visitDate: fd.get("visitDate") || null,
    ratingFood: numOrNull(fd.get("ratingFood")),
    ratingAmbience: numOrNull(fd.get("ratingAmbience")),
    ratingService: numOrNull(fd.get("ratingService")),
    comment: (fd.get("comment") || "").trim() || null,
    updatedAt: serverTimestamp()
  };
  if (!data.name || !Number.isFinite(data.lat) || !Number.isFinite(data.lng)) return;

  if (state.pendingPhoto) {
    data.photoUrl = state.pendingPhoto; // base64 data URL stored in Firestore
  }

  try {
    if (state.editingId) {
      await setDoc(doc(db, "restaurants", state.editingId), data, { merge: true });
    } else {
      data.createdAt = serverTimestamp();
      await addDoc(COL, data);
    }
    closeForm();
  } catch (err) {
    console.error(err); alert(I18N.t("error_save") + ": " + err.message);
  }
});

function numOrNull(v) { const n = parseFloat(v); return Number.isFinite(n) ? n : null; }

function setFormLatLng(lat, lng) {
  latInput.value = lat.toFixed(6);
  lngInput.value = lng.toFixed(6);
  if (mapClickMarker) mapClickMarker.remove();
  mapClickMarker = L.circleMarker([lat, lng], { radius: 8, color: "#2d4a3a", fillColor: "#2d4a3a", fillOpacity: 0.5 }).addTo(map);
  setTimeout(() => { if (mapClickMarker) { mapClickMarker.remove(); mapClickMarker = null; } }, 4000);
}

// Geocoding (Nominatim)
addrSearch.addEventListener("click", () => doGeocode(addrInput.value));
addrInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") { e.preventDefault(); doGeocode(addrInput.value); }
});

async function doGeocode(query) {
  query = (query || "").trim();
  if (!query) return;
  addrResults.innerHTML = `<li>...</li>`;
  addrResults.classList.remove("hidden");
  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&limit=5&addressdetails=0&q=${encodeURIComponent(query)}`;
    const res = await fetch(url, { headers: { "Accept-Language": I18N.lang } });
    const data = await res.json();
    if (!data.length) {
      addrResults.innerHTML = `<li>${I18N.t("no_geocode")}</li>`;
      return;
    }
    addrResults.innerHTML = data.map(d =>
      `<li data-lat="${d.lat}" data-lon="${d.lon}">${escapeHtml(d.display_name)}</li>`
    ).join("");
    addrResults.querySelectorAll("li[data-lat]").forEach(li => {
      li.addEventListener("click", () => {
        setFormLatLng(parseFloat(li.dataset.lat), parseFloat(li.dataset.lon));
        addrInput.value = li.textContent;
        addrResults.classList.add("hidden");
        map.setView([parseFloat(li.dataset.lat), parseFloat(li.dataset.lon)], 16);
      });
    });
  } catch (err) {
    addrResults.innerHTML = `<li>${escapeHtml(err.message)}</li>`;
  }
}

// Locate me
btnLocate.addEventListener("click", () => {
  if (!navigator.geolocation) return;
  navigator.geolocation.getCurrentPosition(p => {
    map.setView([p.coords.latitude, p.coords.longitude], 15);
  }, err => alert(err.message));
});

// View toggle
btnListToggle.addEventListener("click", () => {
  state.view = state.view === "map" ? "list" : "map";
  if (state.view === "list") {
    mapEl.classList.add("hidden");
    listView.classList.remove("hidden");
    btnListToggle.textContent = I18N.t("view_map");
  } else {
    mapEl.classList.remove("hidden");
    listView.classList.add("hidden");
    btnListToggle.textContent = I18N.t("view_list");
    setTimeout(() => map.invalidateSize(), 50);
  }
  render();
});

// Export
btnExport.addEventListener("click", () => {
  const data = state.restaurants.map(({ id, ...rest }) => rest);
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `restaurants-${new Date().toISOString().slice(0,10)}.json`;
  a.click();
});

// Import
btnImport.addEventListener("click", () => importFile.click());
importFile.addEventListener("change", async (e) => {
  const file = e.target.files?.[0];
  if (!file) return;
  if (!confirm(I18N.t("import_confirm"))) { importFile.value = ""; return; }
  try {
    const text = await file.text();
    const data = JSON.parse(text);
    if (!Array.isArray(data)) throw new Error("not array");
    // Delete existing
    const existing = await getDocs(COL);
    const batch = writeBatch(db);
    existing.forEach(d => batch.delete(d.ref));
    await batch.commit();
    // Add new
    for (const r of data) {
      const { id, ...rest } = r;
      await addDoc(COL, { ...rest, importedAt: serverTimestamp() });
    }
    alert(I18N.t("imported_ok"));
  } catch (err) {
    console.error(err); alert(I18N.t("invalid_file") + ": " + err.message);
  } finally {
    importFile.value = "";
  }
});

// ---------- Realtime data ----------
function subscribe() {
  onSnapshot(COL, snap => {
    state.restaurants = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    render();
  }, err => {
    console.error(err); alert(I18N.t("error_load") + ": " + err.message);
  });
}

// ---------- Init ----------
let inited = false;
function initApp() {
  if (inited) return;
  inited = true;
  initMap();
  bindFilters();
  subscribe();
  document.addEventListener("langchange", () => {
    btnListToggle.textContent = I18N.t(state.view === "map" ? "view_list" : "view_map");
    render();
  });
}
