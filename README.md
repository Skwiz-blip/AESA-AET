# Agir Ensemble Tour - site

Page unique de la campagne « Agir Ensemble Tour » (Union européenne au Togo), plus deux pages légales.
Site statique : HTML, CSS, un peu de JavaScript. Aucune dépendance, aucune étape de construction.

## Fichiers

```
index.html                 page principale (ancres : #haut #partenariat #calendrier #themes #replays #capsules #question #voix)
mentions-legales.html
confidentialite.html
404.html                   page introuvable (activée par .htaccess)
assets/css/style.css       couleurs, police et arrondis réglés en haut du fichier (variables --c-*)
assets/js/app.js           WhatsApp, calendrier, vidéos, filtre, consentement, mesure
assets/data/emissions.json calendrier, replays, capsules, liens podcast
assets/img/                images WebP (emblème provisoire, vignettes YouTube)
reference/                 brief, contenu et première maquette (non publiés)
```

Les identifiants d'ancre sont utilisés dans les publicités : ne pas les renommer après la mise en ligne.

## Mise à jour hebdomadaire : uniquement `assets/data/emissions.json`

Champs d'une émission :

| Champ | Exemple | Remarque |
|---|---|---|
| `id` | `"AET1"` | Mot-clé WhatsApp. Ne pas changer. |
| `theme` | `"energie"` | `energie`, `environnement`, `entrepreneuriat` ou `culture` |
| `ville`, `radio`, `frequence` | `"Kara"`, `"Radio Kara"`, `"FM 98.5"` | Laisser `""` tant que non confirmé |
| `date` | `"2026-11-05"` | Format année-mois-jour |
| `heure` | `"18:00"` | Heure de Lomé |
| `statut` | `"a_venir"` | `a_venir`, `en_direct` ou `terminee` : à changer à la main |
| `resume` | `"..."` | Deux ou trois lignes |
| `replay_youtube_id` | `"af74Yb1eGBQ"` | Identifiant de la vidéo YouTube du replay |
| `replay_duree` | `"1 h 30"` | Affiché sur la carte replay |
| `podcast_url` | `"https://..."` | Lien du bouton « Écouter » |
| `capsules` | voir ci-dessous | Extraits courts de l'émission |

Ajouter une capsule à une émission :

```json
"capsules": [
  { "youtube_id": "ABCDEFGHIJK", "titre": "Titre court de l'extrait" }
]
```

Chaque vidéo (replay ou capsule) a besoin de sa vignette locale, `assets/img/thumb-<youtube_id>.webp`, en 480 x 270.
On la fabrique à partir de `https://i.ytimg.com/vi/<youtube_id>/hqdefault.jpg` en coupant les bandes noires.

Les liens des plateformes de podcast se renseignent dans `plateformes_podcast`. Un lien vide affiche « Bientôt disponible ».

Vérifier que le fichier reste un JSON valide avant de l'envoyer : une virgule en trop et le calendrier ne s'affiche plus.

## Tester en local

Le calendrier est lu avec une requête : ouvrir `index.html` en double-cliquant ne suffit pas.

```
python -m http.server 8000
```

Puis ouvrir http://localhost:8000.

## À renseigner avant la mise en ligne

- Identifiant Google Tag Manager : `ID_GTM` dans le `<head>` des trois pages.
- Numéro WhatsApp Business : `NUMERO_WHATSAPP` dans `app.js` et les trois liens `wa.me` de `index.html`.
- Emblème officiel de l'UE à la place de `embleme-ue-provisoire.webp`.
- Image de partage, favicon, réseaux de la Délégation : emplacements commentés dans `index.html`.
- Date de mise en ligne dans les deux pages légales.

