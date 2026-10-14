/* =========================================================
   Agir Ensemble Tour - comportements du site

   Écrit en JavaScript « classique » (var, function, XMLHttpRequest)
   pour fonctionner aussi sur les téléphones d'entrée de gamme et
   sur Opera Mini. Chaque fonction vérifie que la section qu'elle
   gère existe : le même fichier sert aux pages légales.

   Plan :
     1. Réglages
     2. Petits outils
     3. Mesure (dataLayer pour Google Tag Manager)
     4. Liens WhatsApp
     5. Calendrier des émissions
     6. Vidéos YouTube en façade
     7. Replays et podcast
     8. Capsules et filtre par thème
     9. Consentement
    10. Démarrage
   ========================================================= */


/* ---------- 1. RÉGLAGES ---------- */

// Compte WhatsApp Business dédié (format international, sans « + »)
var NUMERO_WHATSAPP = "22870087777";

// Mot-clé utilisé par les boutons généraux tant que le calendrier n'est pas chargé
var EMISSION_PAR_DEFAUT = "AET1";

// Calendrier, replays, capsules et plateformes de podcast : tout se met à jour dans ce fichier
var URL_DONNEES = "assets/data/emissions.json";

// Mémorisation du choix de consentement (même clé et même durée que dans le <head> des pages)
var CLE_CONSENTEMENT = "aet-consentement";
var DUREE_CONSENTEMENT = 180 * 24 * 60 * 60 * 1000;   // 6 mois

var UNE_HEURE = 60 * 60 * 1000;
var UN_JOUR = 24 * UNE_HEURE;

// Noms affichés pour chaque thème du fichier JSON
var THEMES = {
  energie:         { court: "Énergie",         complet: "Énergie et connectivité" },
  environnement:   { court: "Environnement",   complet: "Environnement" },
  entrepreneuriat: { court: "Entrepreneuriat", complet: "Entrepreneuriat et jeunesse" },
  culture:         { court: "Culture",         complet: "Culture et industries créatives" }
};


/* ---------- 2. PETITS OUTILS ---------- */

// Crée un élément HTML avec une classe et un texte (tous deux facultatifs)
function creer(balise, classe, texte) {
  var element = document.createElement(balise);
  if (classe) element.className = classe;
  if (texte) element.textContent = texte;
  return element;
}

// Applique une action à chaque élément qui correspond au sélecteur CSS
function pourChaque(selecteur, action) {
  Array.prototype.forEach.call(document.querySelectorAll(selecteur), action);
}

// Ouvre un lien dans un nouvel onglet, sans donner la main à la page ouverte
function ouvrirAilleurs(lien) {
  lien.target = "_blank";
  lien.rel = "noopener";
}

// Nom lisible d'un thème : format "court" (Énergie) ou "complet" (Énergie et connectivité)
function nomTheme(cle, format) {
  return THEMES[cle] ? THEMES[cle][format] : "";
}

// Charge un fichier JSON, puis appelle siSucces(donnees) ou siEchec()
function chargerJson(url, siSucces, siEchec) {
  var requete = new XMLHttpRequest();
  requete.open("GET", url);
  requete.setRequestHeader("Cache-Control", "no-cache");   // le fichier change chaque semaine

  requete.onload = function () {
    if (requete.status !== 200) return siEchec();
    var donnees;
    try {
      donnees = JSON.parse(requete.responseText);
    } catch (erreur) {
      console.error("emissions.json n'est pas un JSON valide :", erreur);
      return siEchec();
    }
    siSucces(donnees);
  };
  requete.onerror = siEchec;
  requete.send();
}

// Paramètres utm_* présents dans l'adresse (liens publicitaires), sous forme d'objet
function lireParametresUtm() {
  var parametres = {};
  location.search.replace(/^\?/, "").split("&").forEach(function (paire) {
    var morceaux = paire.split("=");
    if (morceaux[0].indexOf("utm_") === 0) {
      parametres[morceaux[0]] = decodeURIComponent(morceaux[1] || "");
    }
  });
  return parametres;
}

// Garde les paramètres de l'adresse (utm_*, gclid…) quand on passe d'une page du site à l'autre
function conserverParametresDansLiensInternes() {
  if (!location.search) return;

  pourChaque("a[href]", function (lien) {
    var adresse = lien.getAttribute("href");
    var estPageInterne = !/^(#|https?:|mailto:|tel:)/.test(adresse);
    if (!estPageInterne) return;

    var morceaux = adresse.split("#");
    var ancre = morceaux[1] ? "#" + morceaux[1] : "";
    lien.setAttribute("href", morceaux[0] + location.search + ancre);
  });
}


/* ---------- 3. MESURE ----------
   On pousse toujours les événements dans le dataLayer :
   c'est Google Tag Manager qui décide, selon le consentement,
   quelles balises (GA4, pixel Meta, Google Ads) se déclenchent. */

window.dataLayer = window.dataLayer || [];

// Tous les paramètres possibles des événements. GTM garde en mémoire la dernière valeur
// de chaque paramètre : on les remet à zéro à chaque envoi pour qu'un événement
// n'hérite pas des valeurs du précédent.
var PARAMETRES_MESURE = ["emission", "placement", "format", "capsule_id", "theme", "platform", "url", "label", "consent_status"];

function mesurer(evenement, parametres) {
  var donnees = { event: evenement };
  PARAMETRES_MESURE.forEach(function (nom) { donnees[nom] = undefined; });
  for (var cle in parametres) donnees[cle] = parametres[cle];
  window.dataLayer.push(donnees);
}

// Clic vers un site externe
function suivreLienSortant(lien) {
  lien.addEventListener("click", function () {
    mesurer("outbound_click", { url: lien.href, label: lien.textContent.trim() });
  });
}

// Événement unique quand le visiteur atteint la moitié de la page
function suivreDefilement() {
  function verifier() {
    var basDeLEcran = window.pageYOffset + window.innerHeight;
    if (basDeLEcran >= document.documentElement.scrollHeight / 2) {
      mesurer("scroll_50");
      window.removeEventListener("scroll", verifier);
    }
  }
  window.addEventListener("scroll", verifier);
}


/* ---------- 4. LIENS WHATSAPP ----------
   Conversion principale du site. Le mot-clé (AET1 à AET4) ouvre le
   message pour attribuer chaque conversation à son émission. */

// Si la visite vient d'une publicité, on ajoute la source et la campagne après le mot-clé.
// Exemple : « AET1 [meta/aet_e1_teasing] Bonjour, ma question pour l'émission : »
function referencePublicitaire() {
  var utm = lireParametresUtm();
  var morceaux = [utm.utm_source, utm.utm_campaign].filter(Boolean);
  return morceaux.length ? " [" + morceaux.join("/") + "]" : "";
}

function lienWhatsApp(motCle) {
  var message = motCle + referencePublicitaire() + " Bonjour, ma question pour l'émission :";
  return "https://wa.me/" + NUMERO_WHATSAPP + "?text=" + encodeURIComponent(message);
}

// Change l'émission visée par un lien WhatsApp
function viserEmission(lien, motCle) {
  lien.setAttribute("data-emission", motCle);
  lien.href = lienWhatsApp(motCle);
}

// Prépare un lien WhatsApp : bon message, nouvel onglet, et événement poussé avant l'ouverture.
// placement : hero | calendrier | sticky | section_question
function brancherWhatsApp(lien, motCle, placement) {
  viserEmission(lien, motCle);
  ouvrirAilleurs(lien);
  lien.addEventListener("click", function () {
    mesurer("click_whatsapp", {
      emission: lien.getAttribute("data-emission"),
      placement: placement
    });
  });
}

// Les boutons généraux visent l'émission en direct, sinon la prochaine à venir, sinon la dernière
function emissionCourante(emissions) {
  function premiere(statut) {
    return emissions.filter(function (emission) { return emission.statut === statut; })[0];
  }
  return premiere("en_direct") || premiere("a_venir") || emissions[emissions.length - 1];
}


/* ---------- 5. CALENDRIER DES ÉMISSIONS ---------- */

// Date et heure du JSON en objet Date. Le Togo est à l'heure GMT toute l'année :
// on lit donc l'heure en temps universel, ce qui reste juste pour un visiteur à l'étranger.
function dateEmission(emission) {
  return new Date(emission.date + "T" + (emission.heure || "00:00") + ":00Z");
}

// Exemple : « jeudi 5 novembre 2026 à 18:00 »
function dateLisible(emission, avecJourEtHeure) {
  var options = { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" };
  if (avecJourEtHeure) {
    options.weekday = "long";
    if (emission.heure) {
      options.hour = "2-digit";
      options.minute = "2-digit";
    }
  }
  var date = dateEmission(emission).toLocaleString("fr-FR", options);
  return date.replace(/\b1 /, "1er ");   // en français, le premier du mois s'écrit « 1er »
}

// Exemple : « Dans 12 jours », « Dans 5 h »
function compteARebours(emission) {
  var reste = dateEmission(emission) - new Date();
  if (reste <= 0) return "Bientôt en direct";

  var jours = Math.floor(reste / UN_JOUR);
  if (jours >= 1) return "Dans " + jours + (jours > 1 ? " jours" : " jour");
  return "Dans " + Math.ceil(reste / UNE_HEURE) + " h";
}

function creerPastilleStatut(statut) {
  if (statut === "en_direct") return creer("span", "tag tag-live", "● En direct maintenant");
  if (statut === "terminee") return creer("span", "tag tag-done", "Terminée");
  return creer("span", "tag", "À venir");
}

// Bouton en bas de fiche : il dépend du statut de l'émission
function creerActionEmission(emission) {
  var bouton = creer("a", "btn");

  if (emission.statut === "en_direct") {
    bouton.className += " btn-accent";   // la fiche en direct est sur fond bleu
    bouton.textContent = "Poser ma question";
    brancherWhatsApp(bouton, emission.id, "calendrier");
  } else if (emission.statut === "terminee") {
    bouton.className += " btn-outline";
    bouton.textContent = "Réécouter";
    bouton.href = "#replay-" + emission.id;
  } else {
    bouton.className += " btn-outline";
    bouton.textContent = "Me rappeler";
    brancherWhatsApp(bouton, emission.id, "calendrier");
  }
  return bouton;
}

// Exemple : 1 devient « 01 »
function numeroSurDeuxChiffres(numero) {
  return numero < 10 ? "0" + numero : String(numero);
}

function creerFicheEmission(emission) {
  var fiche = creer("article", "episode");
  if (emission.statut === "en_direct") fiche.className += " is-live";

  // En-tête : grand numéro (lu « Émission 01 » par les lecteurs d'écran) et pastille de statut
  var entete = creer("div", "episode-head");
  var numero = creer("p", "episode-number");
  numero.appendChild(creer("span", "sr-only", "Émission "));
  numero.appendChild(document.createTextNode(numeroSurDeuxChiffres(emission.numero)));
  entete.appendChild(numero);
  entete.appendChild(creerPastilleStatut(emission.statut));
  fiche.appendChild(entete);

  fiche.appendChild(creer("h3", "", nomTheme(emission.theme, "complet")));

  // Ville, radio, fréquence et date : affichées seulement une fois renseignées
  if (emission.ville) fiche.appendChild(creer("p", "meta", emission.ville));
  if (emission.radio) {
    var radio = emission.radio + (emission.frequence ? " · " + emission.frequence : "");
    fiche.appendChild(creer("p", "meta", radio));
  }
  if (emission.date) {
    fiche.appendChild(creer("p", "meta", dateLisible(emission, true)));
  } else if (emission.statut === "a_venir") {
    fiche.appendChild(creer("p", "meta", "Dates bientôt annoncées"));
  }

  if (emission.statut === "a_venir" && emission.date) {
    fiche.appendChild(creer("p", "countdown", compteARebours(emission)));
  }
  if (emission.resume) fiche.appendChild(creer("p", "summary muted", emission.resume));

  var actions = creer("div", "actions");
  actions.appendChild(creerActionEmission(emission));
  fiche.appendChild(actions);

  return fiche;
}

function afficherCalendrier(emissions) {
  var conteneur = document.getElementById("liste-emissions");
  conteneur.innerHTML = "";
  emissions.forEach(function (emission) {
    conteneur.appendChild(creerFicheEmission(emission));
  });

  // La note « Les dates du Tour seront annoncées… » disparaît dès qu'une date est connue
  var uneDateAnnoncee = emissions.some(function (emission) { return emission.date; });
  document.getElementById("note-dates").hidden = uneDateAnnoncee;
}


/* ---------- 6. VIDÉOS YOUTUBE EN FAÇADE ----------
   Au premier affichage : une vignette locale (assets/img/thumb-<id>.webp)
   et un bouton. Le lecteur YouTube, sur le domaine sans cookie,
   n'est inséré qu'au clic. auLancement sert à mesurer la lecture. */

function creerFacadeVideo(youtubeId, titre, auLancement) {
  var facade = creer("div", "yt");

  var vignette = creer("img");
  vignette.setAttribute("loading", "lazy");
  vignette.width = 480;
  vignette.height = 270;
  vignette.alt = titre;
  // Vignette absente du dossier : on garde le fond uni plutôt qu'une image cassée
  vignette.onerror = function () { vignette.style.visibility = "hidden"; };
  vignette.src = "assets/img/thumb-" + youtubeId + ".webp";

  var bouton = creer("button", "yt-play");
  bouton.type = "button";
  bouton.setAttribute("aria-label", "Lire la vidéo : " + titre);

  bouton.addEventListener("click", function () {
    var lecteur = document.createElement("iframe");
    lecteur.src = "https://www.youtube-nocookie.com/embed/" + youtubeId + "?autoplay=1";
    lecteur.title = titre;
    lecteur.setAttribute("allow", "autoplay; encrypted-media; picture-in-picture; fullscreen");
    lecteur.setAttribute("allowfullscreen", "");

    facade.innerHTML = "";
    facade.appendChild(lecteur);
    lecteur.focus();
    auLancement();
  });

  facade.appendChild(vignette);
  facade.appendChild(bouton);
  return facade;
}


/* ---------- 7. REPLAYS ET PODCAST ---------- */

// Élément grisé pour un lien pas encore fourni par l'AESA
function creerIndisponible(classe, texte) {
  var element = creer("span", classe + " is-soon", texte);
  element.title = "Bientôt disponible";
  element.appendChild(creer("span", "soon-label", "Bientôt disponible"));
  return element;
}

function afficherPlateformes(plateformes) {
  var conteneur = document.getElementById("liste-plateformes");

  plateformes.forEach(function (plateforme) {
    if (!plateforme.url) {
      conteneur.appendChild(creerIndisponible("card platform", plateforme.nom));
      return;
    }
    var lien = creer("a", "card platform", plateforme.nom);
    lien.href = plateforme.url;
    ouvrirAilleurs(lien);
    lien.addEventListener("click", function () {
      mesurer("click_podcast", { platform: plateforme.nom });
    });
    conteneur.appendChild(lien);
  });
}

// Carte replay. Titre au format « Émission 1 - Entrepreneuriat - Kara »
function creerCarteReplay(emission) {
  var carte = creer("article", "replay");
  carte.id = "replay-" + emission.id;

  var titre = ["Émission " + emission.numero, nomTheme(emission.theme, "court"), emission.ville]
    .filter(Boolean)
    .join(" - ");

  var facade = null;
  if (emission.replay_youtube_id) {
    facade = creerFacadeVideo(emission.replay_youtube_id, titre, function () {
      mesurer("play_replay", { emission: emission.id, format: "video" });
    });
    carte.appendChild(facade);
  } else {
    carte.appendChild(creer("p", "unavailable muted", "Cette vidéo n'est pas accessible pour le moment."));
  }

  carte.appendChild(creer("h3", "", titre));

  var details = [emission.replay_duree, emission.date ? "Diffusée le " + dateLisible(emission, false) : ""];
  var meta = details.filter(Boolean).join(" · ");
  if (meta) carte.appendChild(creer("p", "meta muted", meta));
  if (emission.resume) carte.appendChild(creer("p", "summary", emission.resume));

  var actions = creer("div", "actions");

  // « Regarder » lance simplement la façade vidéo de la carte
  if (facade) {
    var regarder = creer("button", "btn btn-primary", "Regarder");
    regarder.type = "button";
    regarder.addEventListener("click", function () {
      var lecture = facade.querySelector(".yt-play");
      if (lecture) lecture.click();
    });
    actions.appendChild(regarder);
  }

  if (emission.podcast_url) {
    var ecouter = creer("a", "btn btn-outline", "Écouter");
    ecouter.href = emission.podcast_url;
    ouvrirAilleurs(ecouter);
    ecouter.addEventListener("click", function () {
      mesurer("play_replay", { emission: emission.id, format: "audio" });
    });
    actions.appendChild(ecouter);
  } else {
    actions.appendChild(creerIndisponible("btn btn-outline", "Écouter"));
  }

  carte.appendChild(actions);
  return carte;
}

function afficherReplays(emissions) {
  var conteneur = document.getElementById("liste-replays");
  var terminees = emissions.filter(function (emission) { return emission.statut === "terminee"; });

  terminees.forEach(function (emission) {
    conteneur.appendChild(creerCarteReplay(emission));
  });
  document.getElementById("replays-vide").hidden = terminees.length > 0;
}


/* ---------- 8. CAPSULES ET FILTRE PAR THÈME ---------- */

// Rassemble les capsules des émissions (les plus récentes d'abord) puis les vidéos de la campagne
function listerCapsules(donnees) {
  var capsules = [];

  donnees.emissions.slice().reverse().forEach(function (emission) {
    (emission.capsules || []).forEach(function (capsule) {
      capsules.push({
        youtube_id: capsule.youtube_id,
        titre: capsule.titre,
        theme: emission.theme,
        emission: emission.id
      });
    });
  });

  (donnees.videos_campagne || []).forEach(function (video) {
    capsules.push({
      youtube_id: video.youtube_id,
      titre: video.titre,
      theme: video.theme,
      emission: "campagne"
    });
  });

  return capsules;
}

function creerCarteCapsule(capsule) {
  var carte = creer("article", "capsule");
  carte.setAttribute("data-theme", capsule.theme);

  carte.appendChild(creerFacadeVideo(capsule.youtube_id, capsule.titre, function () {
    mesurer("view_capsule", {
      capsule_id: capsule.youtube_id,
      theme: capsule.theme,
      emission: capsule.emission
    });
  }));
  carte.appendChild(creer("p", "eyebrow", nomTheme(capsule.theme, "court") || "Agir Ensemble"));
  carte.appendChild(creer("h3", "", capsule.titre));
  return carte;
}

function afficherCapsules(capsules) {
  var conteneur = document.getElementById("liste-capsules");
  capsules.forEach(function (capsule) {
    conteneur.appendChild(creerCarteCapsule(capsule));
  });
  filtrerCapsules("tous");
}

// Affiche les capsules d'un thème ("tous" pour tout voir) et met à jour les boutons de filtre
function filtrerCapsules(theme) {
  pourChaque("[data-filtre]", function (bouton) {
    var actif = bouton.getAttribute("data-filtre") === theme;
    bouton.setAttribute("aria-pressed", actif ? "true" : "false");
  });

  var nombreVisibles = 0;
  pourChaque("#liste-capsules .capsule", function (carte) {
    var visible = theme === "tous" || carte.getAttribute("data-theme") === theme;
    carte.hidden = !visible;
    if (visible) nombreVisibles++;
  });

  document.getElementById("capsules-vide").hidden = nombreVisibles > 0;
}

// Boutons de filtre et liens « Voir les vidéos » des thématiques
function brancherFiltres() {
  pourChaque("[data-filtre]", function (bouton) {
    bouton.addEventListener("click", function () {
      var theme = bouton.getAttribute("data-filtre");
      filtrerCapsules(theme);
      mesurer("select_theme", { theme: theme });
    });
  });

  pourChaque("[data-voir-theme]", function (lien) {
    lien.addEventListener("click", function () {
      var theme = lien.getAttribute("data-voir-theme");
      filtrerCapsules(theme);
      mesurer("select_theme", { theme: theme });
    });
  });
}


/* ---------- 9. CONSENTEMENT ---------- */

// Renvoie "granted", "denied", ou null si aucun choix valable n'est mémorisé
function lireConsentement() {
  try {
    var choix = JSON.parse(localStorage.getItem(CLE_CONSENTEMENT));
    if (choix && Date.now() - choix.date < DUREE_CONSENTEMENT) return choix.statut;
  } catch (erreur) { /* stockage indisponible : on redemandera */ }
  return null;
}

function enregistrerConsentement(statut) {
  try {
    localStorage.setItem(CLE_CONSENTEMENT, JSON.stringify({ statut: statut, date: Date.now() }));
  } catch (erreur) { /* stockage indisponible : le bandeau reviendra à la prochaine visite */ }

  // Le refus renvoie aussi la mise à jour : utile quand on retire un accord donné plus tôt
  gtag("consent", "update", {
    ad_storage: statut,
    ad_user_data: statut,
    ad_personalization: statut,
    analytics_storage: statut
  });
  mesurer("consent_update", { consent_status: statut });

  document.getElementById("bandeau-consentement").hidden = true;
}

function brancherConsentement() {
  var bandeau = document.getElementById("bandeau-consentement");
  if (!bandeau) return;

  document.getElementById("consent-accepter").addEventListener("click", function () {
    enregistrerConsentement("granted");
  });
  document.getElementById("consent-refuser").addEventListener("click", function () {
    enregistrerConsentement("denied");
  });

  // « Gérer mes préférences » dans le pied de page rouvre le bandeau
  var gerer = document.getElementById("gerer-preferences");
  if (gerer) {
    gerer.addEventListener("click", function () {
      bandeau.hidden = false;
      document.getElementById("consent-accepter").focus();
    });
  }

  if (lireConsentement() === null) bandeau.hidden = false;
}


/* ---------- 10. DÉMARRAGE ---------- */

function afficherDonnees(donnees) {
  var emissions = donnees.emissions || [];

  afficherCalendrier(emissions);
  afficherReplays(emissions);
  afficherPlateformes(donnees.plateformes_podcast || []);
  afficherCapsules(listerCapsules(donnees));

  // Les boutons WhatsApp généraux suivent désormais l'émission en cours
  var courante = emissionCourante(emissions);
  if (courante) {
    pourChaque("[data-whatsapp-placement]", function (lien) {
      viserEmission(lien, courante.id);
    });
  }
}

// Fichier injoignable : on retire « Chargement… », la note d'attente reste visible
function signalerEchecChargement() {
  document.getElementById("liste-emissions").innerHTML = "";
}

conserverParametresDansLiensInternes();

pourChaque("[data-whatsapp-placement]", function (lien) {
  brancherWhatsApp(lien, EMISSION_PAR_DEFAUT, lien.getAttribute("data-whatsapp-placement"));
});
pourChaque('a[href^="http"]:not([data-whatsapp-placement])', suivreLienSortant);

brancherFiltres();
brancherConsentement();
suivreDefilement();

// Seule la page d'accueil a un calendrier à remplir
if (document.getElementById("liste-emissions")) {
  chargerJson(URL_DONNEES, afficherDonnees, signalerEchecChargement);
}
