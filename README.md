# Site local de caroline-roche.fr

Copie autonome du site Wix https://www.caroline-roche.fr/ (aspiré le 11 septembre 2026), débarrassée des
restes du gabarit « dentiste » de Wix : le site ne parle plus que d'orthoptie.

## Lancer

    cd projets/site-local
    node tools/serve.mjs 8765      # puis ouvrir http://localhost:8765/

Aucune dépendance : Node 22 suffit. Le site fonctionne sans accès réseau (tout est dans `www/`).
Toute autre solution de serveur statique convient aussi (`python3 -m http.server 8765` depuis `www/`).

## Pages

- `/` : accueil (diaporama, à propos, services, cabinet, contact)
- `/l-orthoptie-en-detail/` : présentation détaillée des prestations
- `/rendez-vous/` : liste des prestations, bouton « Prendre RDV » qui renvoie aux coordonnées

Les six pages de service du gabarit Wix (détartrage, couronne, carie, blanchiment, examen et urgence
dentaires) n'ont pas été reprises : elles ne contenaient que le texte d'exemple de Wix.

## Arborescence

- `source/` : pages HTML et JSON Wix bruts, tels qu'aspirés (trace, ne pas éditer)
- `tools/build.mjs` : construit `www/` à partir de `source/` (nettoyage du runtime Wix, téléchargement
  des images, polices et formes, réécriture des liens, diaporama local, corrections de contenu)
- `tools/content-fixes.mjs` : corrections éditoriales (page Rendez-vous)
- `tools/local.css`, `tools/local.js` : compléments locaux (diaporama, animations d'apparition, menu)
- `tools/serve.mjs` : serveur statique
- `www/` : le site prêt à servir (`assets/manifest.json` = correspondance URL d'origine, fichier local)

## Publication (GitHub Pages)

Dépôt : https://github.com/thomasbroussard/caroline-roche-site. Chaque push sur `main` lance
`.github/workflows/pages.yml`, qui reconstruit `www/` avec le préfixe `/caroline-roche-site/` et le publie sur
https://thomasbroussard.github.io/caroline-roche-site/. Pour publier sous un domaine propre : ajouter le domaine
dans les réglages Pages du dépôt (GitHub crée le fichier `CNAME`) et passer `--base` à `/` dans le workflow.

## Reconstruire

    node tools/build.mjs            # retélécharge les ressources manquantes
    node tools/build.mjs --offline  # sans réseau, réutilise www/assets/
    node tools/build.mjs --offline --base=/caroline-roche-site/   # variante servie sous un sous-chemin

Pour modifier un texte, passer par `tools/content-fixes.mjs` (pas par `www/`, qui est régénéré).
