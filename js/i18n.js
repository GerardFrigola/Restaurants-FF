// Internationalisation: Catalan (default) and English
const STRINGS = {
  ca: {
    app_title: "Els nostres restaurants",
    login_prompt: "Introdueix la contrasenya compartida",
    enter: "Entrar",
    wrong_pass: "Contrasenya incorrecta",
    add_restaurant: "+ Afegir",
    locate_me: "Centra a la meva ubicació",
    view_list: "Llista",
    view_map: "Mapa",
    export: "Exportar",
    import: "Importar",
    logout: "Sortir",
    search_placeholder: "Cercar per nom...",
    visited: "Visitats",
    wishlist: "Per visitar",
    only_fav: "Només favorits",
    any_price: "Qualsevol preu",
    any_tag: "Qualsevol etiqueta",
    any_rating: "Valoració mínima",
    new_restaurant: "Nou restaurant",
    edit_restaurant: "Editar restaurant",
    name: "Nom",
    status: "Estat",
    address: "Adreça / cerca",
    search: "Cerca",
    lat: "Latitud",
    lng: "Longitud",
    map_click_hint: "Pots clicar al mapa per fixar la ubicació.",
    price: "Preu",
    favorite: "Favorit",
    tags: "Etiquetes (tipus de cuina, etc.)",
    visit_details: "Detalls de la visita",
    visit_date: "Data de visita",
    rating_food: "Menjar",
    rating_ambience: "Ambient",
    rating_service: "Servei",
    comment: "Comentari",
    photo: "Foto",
    delete: "Eliminar",
    save: "Desar",
    confirm_delete: "Segur que vols eliminar aquest restaurant?",
    saved: "Desat correctament",
    error_save: "Error en desar",
    error_load: "Error en carregar les dades",
    no_results: "Cap resultat",
    no_geocode: "No s'ha trobat cap ubicació",
    avg_rating: "Mitjana",
    visited_on: "Visitat el",
    edit: "Editar",
    close: "Tancar",
    photo_too_big: "La foto és massa gran (màx 5MB)",
    import_confirm: "Això reemplaçarà les dades actuals. Continuar?",
    imported_ok: "Dades importades",
    invalid_file: "Fitxer no vàlid",
    suggested_tags: "Suggerides:",
  },
  en: {
    app_title: "Our restaurants",
    login_prompt: "Enter the shared password",
    enter: "Enter",
    wrong_pass: "Wrong password",
    add_restaurant: "+ Add",
    locate_me: "Centre on my location",
    view_list: "List",
    view_map: "Map",
    export: "Export",
    import: "Import",
    logout: "Log out",
    search_placeholder: "Search by name...",
    visited: "Visited",
    wishlist: "Wishlist",
    only_fav: "Only favourites",
    any_price: "Any price",
    any_tag: "Any tag",
    any_rating: "Min rating",
    new_restaurant: "New restaurant",
    edit_restaurant: "Edit restaurant",
    name: "Name",
    status: "Status",
    address: "Address / search",
    search: "Search",
    lat: "Latitude",
    lng: "Longitude",
    map_click_hint: "You can click the map to set the location.",
    price: "Price",
    favorite: "Favourite",
    tags: "Tags (cuisine, etc.)",
    visit_details: "Visit details",
    visit_date: "Visit date",
    rating_food: "Food",
    rating_ambience: "Ambience",
    rating_service: "Service",
    comment: "Comment",
    photo: "Photo",
    delete: "Delete",
    save: "Save",
    confirm_delete: "Are you sure you want to delete this restaurant?",
    saved: "Saved",
    error_save: "Error saving",
    error_load: "Error loading data",
    no_results: "No results",
    no_geocode: "No location found",
    avg_rating: "Average",
    visited_on: "Visited on",
    edit: "Edit",
    close: "Close",
    photo_too_big: "Photo too large (max 5MB)",
    import_confirm: "This will replace current data. Continue?",
    imported_ok: "Data imported",
    invalid_file: "Invalid file",
    suggested_tags: "Suggested:",
  }
};

const I18N = {
  lang: localStorage.getItem("lang") || "ca",
  t(key) { return (STRINGS[this.lang] && STRINGS[this.lang][key]) || key; },
  set(lang) {
    if (!STRINGS[lang]) return;
    this.lang = lang;
    localStorage.setItem("lang", lang);
    document.documentElement.lang = lang;
    this.apply();
    document.dispatchEvent(new CustomEvent("langchange"));
  },
  apply() {
    document.querySelectorAll("[data-i18n]").forEach(el => {
      el.textContent = this.t(el.dataset.i18n);
    });
    document.querySelectorAll("[data-i18n-placeholder]").forEach(el => {
      el.placeholder = this.t(el.dataset.i18nPlaceholder);
    });
    document.querySelectorAll("[data-i18n-title]").forEach(el => {
      el.title = this.t(el.dataset.i18nTitle);
    });
    document.querySelectorAll(".lang-switch").forEach(sw => {
      sw.querySelectorAll("button").forEach(b => {
        b.classList.toggle("active", b.dataset.lang === this.lang);
      });
    });
  }
};

// Wire language switches
document.addEventListener("click", (e) => {
  const btn = e.target.closest(".lang-switch button");
  if (btn && btn.dataset.lang) I18N.set(btn.dataset.lang);
});

// Initial apply on load
document.addEventListener("DOMContentLoaded", () => I18N.apply());

export { I18N };
