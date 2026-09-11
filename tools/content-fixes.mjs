// Corrections de contenu appliquées au HTML rendu, page par page.
// Le site en ligne vient d'un gabarit Wix « dentiste » : la page Rendez-vous listait encore six
// prestations dentaires du gabarit (détartrage, couronne, carie...), chacune renvoyant à une page
// de service vide (« Décrivez votre service ici »). On les remplace par les prestations d'orthoptie
// annoncées sur l'accueil, avec renvoi vers la section correspondante de « L'orthoptie en détail ».
// Aucune durée ni tarif n'est affiché : le site n'en donne pas pour ces prestations.

const SERVICES = [
  { nom: 'Bilan orthoptique', ancre: 'comp-j756npsa' },
  { nom: 'Bilan neurovisuel', ancre: 'comp-j90z67t7' },
  { nom: 'Bébé vision', ancre: 'comp-j90z5mma' },
  { nom: 'Champ visuel automatisé Humphrey', ancre: 'comp-j90z78fd' },
  { nom: 'Vision des couleurs', ancre: 'comp-j90z6nb5' },
  { nom: 'Rééducations', ancre: 'comp-j756o6od' },
  { nom: 'Dépistage rétino-diabétique', ancre: 'comp-jrompcco' },
];
const DETAIL = '/l-orthoptie-en-detail/';
const CONTACT = '/#comp-ihenviaz';

function carte({ nom, ancre }, i) {
  const id = `service-${i + 1}`;
  return `<li tabindex="-1" data-hook="Grid-item" class="sUoizMF" style="grid-column-end:span 1;grid-row-end:span 1" data-row-span="1" data-column-span="1">` +
    `<section data-hook="service-card-default-card" class="s__7kVV4s o__7ja_Wg--stacked sfsqcY5 oyp1KcV--isGrid oyp1KcV--even" data-stacked="true">` +
    `<div class="scQbOkP sNZZ5Mb" data-hook="card-info"><div data-id="${id}" data-hook="service-info-root" aria-labelledby="service-info-aria-section-title" role="group" class="s_mb2l6">` +
    `<div class="s__09DsOi"><div class="sl0vyJX"><div class="sTTuGNA" data-hook="service-info-title-root">` +
    `<a href="${DETAIL}#${ancre}" data-hook="service-info-title-link" class="sk3GcZh" role="link" tabindex="-1" aria-label="${nom}">` +
    `<h2 class="s__38MnCt onJQ88M---typography-10-smallTitle onJQ88M---priority-7-primary sK8oMUK" aria-hidden="false" data-hook="service-info-title-text" id="${id}">${nom}</h2></a></div>` +
    `<a data-hook="more-info-button-root" data-mobile="false" data-priority="link" class="sgzSiFV suELGuy s__8l69uC oVWn_f5---priority-4-link sEKkcNI" href="${DETAIL}#${ancre}" tabindex="0"><span class="sqQSaw2">Lire plus</span></a></div>` +
    `<div class="sPX_PkC"><p class="s__38MnCt onJQ88M---typography-8-listText onJQ88M---priority-7-primary s__8v7Zit" data-hook="details-root" data-type="duration">Sur prescription médicale</p></div></div>` +
    `<div class="stvCX6m"><div data-hook="book-button-root" class="siwkEfz ok_jLJC---theme-11-SQUARE_FILL ok_jLJC--shouldWorkWithAppSettings">` +
    `<a data-fullwidth="false" data-mobile="false" data-hook="book-button-button" aria-label="Prendre RDV" aria-describedby="${id}" role="button" tabindex="0" href="${CONTACT}" class="sgzSiFV suELGuy sqW7Hgy oHS1A9s---priority-7-primary oHS1A9s---size-6-medium oHS1A9s---paddingMode-15-dynamicPaddings oHS1A9s---hoverStyle-9-underline s_kRbyv"><span class="sqQSaw2">Prendre RDV</span></a>` +
    `</div></div></div></div></section></li>`;
}

export function applyContentFixes(html, route) {
  if (route === '/rendez-vous/') {
    const cartes = SERVICES.map(carte).join('');
    const avant = html;
    html = html.replace(/<li tabindex="-1" data-hook="Grid-item"[\s\S]*?<\/li>(?=<\/ul>)/, cartes);
    if (html === avant) throw new Error('rendez-vous : grille de services introuvable');
    html = html.replace(/<meta name="description" content="[^"]*"\s*\/?>/, '');
    html = html.replace('</title>', '</title>\n  <meta name="description" content="Prendre rendez-vous avec Caroline Roche, orthoptiste à Villeparisis et Claye-Souilly : bilans, rééducation, champ visuel, vision des couleurs, dépistage."/>');
  }
  return html;
}
