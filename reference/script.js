/* =========================================================
   Agir Ensemble Tour - comportements du site
   Plan : 1 Réglages · 2 WhatsApp · 3 Calendrier · 4 Consentement
   ========================================================= */

/* ---------- 1. RÉGLAGES À COMPLÉTER ---------- */

// Numéro WhatsApp Business dédié (format international, sans « + »)
const NUMERO_WHATSAPP = "22870087777";

// Les 4 émissions. AESA fournit ville, radio, fréquence, date et heure.
//   statut : "a_venir" | "en_direct" | "terminee"
//   date   : format "2026-11-05T18:00:00" (laisser "" tant que non annoncée)
const EMISSIONS = [
  { numero: 1, id: "AET1", theme: "Entrepreneuriat", ville: "", radio: "", frequence: "", date: "", statut: "a_venir", resume: "" },
  { numero: 2, id: "AET2", theme: "Énergie",         ville: "", radio: "", frequence: "", date: "", statut: "a_venir", resume: "" },
  { numero: 3, id: "AET3", theme: "Environnement",   ville: "", radio: "", frequence: "", date: "", statut: "a_venir", resume: "" },
  { numero: 4, id: "AET4", theme: "Culture",         ville: "", radio: "", frequence: "", date: "", statut: "a_venir", resume: "" }
];

// Identifiants des outils de mesure (laisser vide = outil non chargé)
const ID_GOOGLE_ANALYTICS = "";   // exemple : "G-XXXXXXXXXX"
const ID_PIXEL_META       = "";   // exemple : "1234567890"
const ID_GOOGLE_ADS       = "";   // exemple : "AW-XXXXXXXXX"

/* ---------- 2. LIENS WHATSAPP ---------- */

// Construit le lien WhatsApp avec le mot-clé de l'émission (AET1 à AET4)
function lienWhatsApp(motCle) {
  const message = motCle + " Bonjour, ma question pour l'émission :";
  return "https://wa.me/" + NUMERO_WHATSAPP + "?text=" + encodeURIComponent(message);
}

// Tous les éléments portant data-whatsapp="AETx" reçoivent leur lien
document.querySelectorAll("[data-whatsapp]").forEach(function (element) {
  element.href = lienWhatsApp(element.dataset.whatsapp);
  element.target = "_blank";
  element.rel = "noopener";
});

/* ---------- 3. CALENDRIER DES ÉMISSIONS ---------- */

// Petit utilitaire : crée un élément avec classe et texte
function creer(balise, classe, texte) {
  const element = document.createElement(balise);
  if (classe) element.className = classe;
  if (texte)  element.textContent = texte;
  return element;
}

// Texte du compte à rebours (jours ou heures restantes)
function compteARebours(dateIso) {
  const reste = new Date(dateIso) - new Date();
  if (reste <= 0) return "Bientôt en direct";
  const jours = Math.floor(reste / 86400000);
  if (jours >= 1) return "Dans " + jours + (jours > 1 ? " jours" : " jour");
  return "Dans " + Math.ceil(reste / 3600000) + " h";
}

// Construit une fiche d'émission selon son statut
function creerFiche(emission) {
  const fiche = creer("article", "card episode");

  // Pastille de statut
  if (emission.statut === "en_direct") {
    fiche.appendChild(creer("span", "tag tag-live", "● En direct maintenant"));
  } else if (emission.statut === "terminee") {
    fiche.appendChild(creer("span", "tag tag-done", "Terminée"));
  } else {
    fiche.appendChild(creer("span", "tag", "À venir"));
  }

  fiche.appendChild(creer("h3", "", "Émission " + emission.numero));
  fiche.appendChild(creer("p", "theme-name muted", emission.theme));

  // Ville, radio, fréquence, date : affichés seulement si renseignés
  if (emission.ville)     fiche.appendChild(creer("p", "meta", emission.ville));
  if (emission.radio)     fiche.appendChild(creer("p", "meta", emission.radio + (emission.frequence ? " · " + emission.frequence : "")));
  if (emission.date) {
    const dateLisible = new Date(emission.date).toLocaleString("fr-FR", { dateStyle: "long", timeStyle: "short" });
    fiche.appendChild(creer("p", "meta", dateLisible));
  } else if (emission.statut === "a_venir") {
    fiche.appendChild(creer("p", "meta", "Dates bientôt annoncées"));
  }
  if (emission.resume) fiche.appendChild(creer("p", "summary muted", emission.resume));

  // Action selon l'état d'affichage
  const lien = creer("a");
  if (emission.statut === "a_venir") {
    if (emission.date) fiche.appendChild(creer("p", "countdown", compteARebours(emission.date)));
    lien.textContent = "Me rappeler →";
    lien.href = lienWhatsApp(emission.id);
    lien.target = "_blank";
    lien.rel = "noopener";
  } else if (emission.statut === "en_direct") {
    lien.className = "btn btn-primary";
    lien.textContent = "Poser ma question";
    lien.href = lienWhatsApp(emission.id);
    lien.target = "_blank";
    lien.rel = "noopener";
  } else {
    lien.textContent = "Réécouter →";
    lien.href = "#replays";
  }
  fiche.appendChild(lien);

  return fiche;
}

// Affiche les 4 fiches (même vides, comme demandé par le brief)
const conteneurEmissions = document.getElementById("liste-emissions");
EMISSIONS.forEach(function (emission) {
  conteneurEmissions.appendChild(creerFiche(emission));
});

/* ---------- 4. CONSENTEMENT ET MESURE D'AUDIENCE ---------- */

const CLE_CONSENTEMENT = "aet-consentement";
const DUREE_CHOIX_MS   = 6 * 30 * 24 * 3600 * 1000;   // 6 mois, comme dans la politique de confidentialité

const bandeau = document.getElementById("bandeau-consentement");

// Lit le choix mémorisé ("oui" / "non") ou null s'il est absent ou expiré
function lireChoix() {
  try {
    const sauvegarde = JSON.parse(localStorage.getItem(CLE_CONSENTEMENT));
    if (sauvegarde && Date.now() - sauvegarde.date < DUREE_CHOIX_MS) return sauvegarde.choix;
  } catch (erreur) { /* stockage indisponible : on redemande */ }
  return null;
}

function enregistrerChoix(choix) {
  try {
    localStorage.setItem(CLE_CONSENTEMENT, JSON.stringify({ choix: choix, date: Date.now() }));
  } catch (erreur) { /* ignoré */ }
  bandeau.hidden = true;
  if (choix === "oui") chargerOutilsDeMesure();
}

// Charge un script externe
function chargerScript(url) {
  const script = document.createElement("script");
  script.async = true;
  script.src = url;
  document.head.appendChild(script);
}

// Chargé UNIQUEMENT après acceptation
function chargerOutilsDeMesure() {
  // Google Analytics 4
  if (ID_GOOGLE_ANALYTICS) {
    window.dataLayer = window.dataLayer || [];
    window.gtag = function () { window.dataLayer.push(arguments); };
    chargerScript("https://www.googletagmanager.com/gtag/js?id=" + ID_GOOGLE_ANALYTICS);
    gtag("js", new Date());
    gtag("config", ID_GOOGLE_ANALYTICS);
    if (ID_GOOGLE_ADS) gtag("config", ID_GOOGLE_ADS);   // balise Google Ads
  }
  // Pixel Meta : à ajouter ici avec le code fourni par Meta (utiliser ID_PIXEL_META)

  // Événement au clic sur un bouton WhatsApp (conversion principale)
  document.querySelectorAll("[data-whatsapp]").forEach(function (bouton) {
    bouton.addEventListener("click", function () {
      if (window.gtag) gtag("event", "clic_whatsapp", { emission: bouton.dataset.whatsapp });
      if (window.fbq)  fbq("trackCustom", "ClicWhatsApp", { emission: bouton.dataset.whatsapp });
    });
  });
}

document.getElementById("consent-accepter").addEventListener("click", function () { enregistrerChoix("oui"); });
document.getElementById("consent-refuser").addEventListener("click",  function () { enregistrerChoix("non"); });
document.getElementById("gerer-preferences").addEventListener("click", function () { bandeau.hidden = false; });

// Au chargement : afficher le bandeau si aucun choix, sinon appliquer le choix
const choix = lireChoix();
if (choix === null)      bandeau.hidden = false;
else if (choix === "oui") chargerOutilsDeMesure();
