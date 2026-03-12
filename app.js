/* =============================================================================
   1. CONSTANTES ET CONFIGURATION
   ============================================================================= */

/* ---- Ordre d'affichage des filtres ---- */
const ORDRE_TYPES = [
  "Vidéo / Film", "Site internet / Blog", "Article / Livre",
  "Podcast", "Conférence", "Applis", "Réseaux sociaux", "Infographie", "Autre"
];
const TROUBLES_ACCOMPAGNES = [
  "Bipolarité", "Schizophrénie", "Trouble schizo-affectif", "Borderline / TPL"
];
const TROUBLES_COMORBIDITES = [
  "Dépression", "Anxiété/Angoisse", "Addictions", "Autres troubles"
];
const TROUBLES_NEURODIV = [
  "TCA", "TDAH adulte", "TSPT / PTSD", "TSA / autisme"
];
const THEMATIQUES_TRANSVERSALES = [
  "Deuil et perte", "Troubles du sommeil", "Santé mentale & précarité", "Fonctions cognitives"
];
const ETRE_ACCOMPAGNE = [
  "Proches aidants"
];
const ORDRE_TROUBLES = [...TROUBLES_ACCOMPAGNES, ...TROUBLES_COMORBIDITES, ...TROUBLES_NEURODIV, ...THEMATIQUES_TRANSVERSALES, ...ETRE_ACCOMPAGNE];

const TITRES_EPINGLES = [
  "Troubles psychiques : lignes d\u2019\u00e9coute pour trouver de l\u2019aide",
  "Fil sant\u00e9 Jeunes : site d\u2019informations sur la sant\u00e9 mentale, l\u2019amour, la sexualit\u00e9 pour les jeunes de 12 \u00e0 25 ans et une ligne d\u2019\u00e9coute : 0 800 235 236",
  "Psycom : un site de ressources sur la sant\u00e9 mentale",
  "Premiers Secours en Sant\u00e9 Mentale",
  "5 mots pour mieux comprendre les troubles psys",
];

const PAGE_SIZE = 24;
const FAVORIS_KEY = "wikip-favoris";
const THEME_KEY = 'wikip-theme';
const ONBOARDING_KEY = "wikip-onboarding-vu";
const TAILLES = { moins: "14px", normal: "16px", plus: "19px" };

/* =============================================================================
   2. ÉTAT DE L'APPLICATION
   ============================================================================= */

let catActive = "tout";
let typeActif = null;
let troubleActif = null;
let recherche = "";
let pageActuelle = 1;
let favoris = new Set(JSON.parse(localStorage.getItem(FAVORIS_KEY) || "[]"));
let vueActive = localStorage.getItem("wikip-vue") || "grille";
let debounceTimer;
let toastTimer = null;
let _itemsFiltresCache = null;
let _isPopstate = false;
let _isInitialLoad = true;

/* =============================================================================
   3. RÉFÉRENCES DOM
   ============================================================================= */

const grille          = document.getElementById("grille");
const grilleEdito     = document.getElementById("grille-edito");
const sectionEdito    = document.getElementById("section-edito");
const compteur        = document.getElementById("compteur");
const inputRecherche  = document.getElementById("recherche");
const zoneSections    = document.getElementById("filtres-sections");
const zoneTypes       = document.getElementById("filtres-types");
const zoneTroubles    = document.getElementById("filtres-troubles");
const resultatsLabel  = document.getElementById("resultats-label");
const btnEffacer      = document.getElementById("btn-effacer");
const btnClearRecherche = document.getElementById("btn-clear-recherche");
const btnMoins        = document.getElementById("btn-police-moins");
const btnNormal       = document.getElementById("btn-police-normal");
const btnPlus         = document.getElementById("btn-police-plus");
const btnEspacement   = document.getElementById("btn-espacement");
const btnTheme        = document.getElementById('theme-toggle');
const themeToggleLabel = document.getElementById('theme-toggle-label');
const btnRetourHaut   = document.getElementById("btn-retour-haut");

/* =============================================================================
   4. DONNÉES : aplatissement et filtrage
   ============================================================================= */

const _tousLesItemsCache = (() => {
  const items = [];
  data.forEach(section => {
    section.items.forEach(item => {
      items.push({ ...item, cat: section.id, labelSection: section.label });
    });
  });
  return items;
})();
function tousLesItems() { return _tousLesItemsCache; }

function itemsFiltres() {
  const terme = recherche.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  return tousLesItems().filter(item => {
    if (catActive === "favoris" && !favoris.has(item.id)) return false;
    if (catActive !== "tout" && catActive !== "favoris" && item.cat !== catActive) return false;
    if (typeActif && item.type !== typeActif) return false;
    if (troubleActif && !item.troubles.includes(troubleActif)) return false;
    if (terme) {
      const haystack = (item.title + " " + item.desc + " " + item.type + " " + item.troubles.join(" "))
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");
      if (!haystack.includes(terme)) return false;
    }
    return true;
  });
}

function mettreAJourCompteursFiltres() {
  const baseItems = tousLesItems().filter(item => {
    if (catActive === "favoris" && !favoris.has(item.id)) return false;
    if (catActive !== "tout" && catActive !== "favoris" && item.cat !== catActive) return false;
    const terme = recherche.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    if (terme) {
      const haystack = (item.title + " " + item.desc + " " + item.type + " " + item.troubles.join(" "))
        .toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      if (!haystack.includes(terme)) return false;
    }
    return true;
  });

  zoneTroubles.querySelectorAll(".chip-trouble").forEach(chip => {
    const t = chip.dataset.trouble;
    const items = typeActif
      ? baseItems.filter(i => i.troubles.includes(t) && i.type === typeActif)
      : baseItems.filter(i => i.troubles.includes(t));
    let countSpan = chip.querySelector(".chip-count");
    if (!countSpan) {
      countSpan = document.createElement("span");
      countSpan.className = "chip-count";
      countSpan.style.cssText = "opacity:0.6;margin-left:4px;font-size:0.7em;";
      chip.appendChild(countSpan);
    }
    countSpan.textContent = `(${items.length})`;
  });

  zoneTypes.querySelectorAll(".chip-type").forEach(chip => {
    const t = chip.dataset.type;
    const items = troubleActif
      ? baseItems.filter(i => i.type === t && i.troubles.includes(troubleActif))
      : baseItems.filter(i => i.type === t);
    let countSpan = chip.querySelector(".chip-count");
    if (!countSpan) {
      countSpan = document.createElement("span");
      countSpan.className = "chip-count";
      countSpan.style.cssText = "opacity:0.6;margin-left:4px;font-size:0.7em;";
      chip.appendChild(countSpan);
    }
    countSpan.textContent = `(${items.length})`;
  });
}

/* =============================================================================
   5. FAVORIS
   ============================================================================= */

function toggleFavori(id) {
  if (favoris.has(id)) favoris.delete(id);
  else favoris.add(id);
  localStorage.setItem(FAVORIS_KEY, JSON.stringify([...favoris]));
}

function mettreAJourBadgeFavoris() {
  const tabFavoris = document.querySelector(".tab-section[data-cat='favoris']");
  if (!tabFavoris) return;
  let badge = tabFavoris.querySelector(".favori-badge");
  if (favoris.size === 0) {
    if (badge) badge.remove();
  } else {
    if (!badge) {
      badge = document.createElement("span");
      badge.className = "favori-badge";
      tabFavoris.appendChild(badge);
    }
    badge.textContent = favoris.size;
  }
}

function afficherToast(msg) {
  const toast = document.getElementById("toast-favori");
  toast.textContent = msg;
  toast.classList.add("visible");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("visible"), 3000);
}

/* =============================================================================
   6. RENDU DES CARTES
   ============================================================================= */

function typeVersColor(type) {
  if (!type) return "autre";
  const t = type.toLowerCase();
  if (t.includes("vid")) return "video";
  if (t.includes("site") || t.includes("blog")) return "site";
  if (t.includes("article") || t.includes("livre")) return "article";
  if (t.includes("podcast")) return "podcast";
  if (t.includes("conf")) return "conference";
  if (t.includes("appli")) return "applis";
  if (t.includes("réseaux") || t.includes("sociaux")) return "reseaux";
  if (t.includes("infographie")) return "infographie";
  return "autre";
}

function rendreCarte(item) {
  const li = document.createElement("li");
  li.style.listStyle = "none";
  const div = document.createElement("article");
  div.className = "carte";
  const titreId = "titre-" + item.id;
  div.setAttribute("aria-labelledby", titreId);

  const bande = document.createElement("div");
  bande.className = "carte-type-bande";
  bande.setAttribute("data-type-color", typeVersColor(item.type));
  bande.setAttribute("aria-hidden", "true");
  div.appendChild(bande);

  const corps = document.createElement("div");
  corps.className = "carte-corps";

  const icone = document.createElement("div");
  icone.className = "carte-icone";
  icone.setAttribute("aria-hidden", "true");
  icone.textContent = item.icon || "📌";

  const contenu = document.createElement("div");
  contenu.className = "carte-contenu";

  const titre = document.createElement("h3");
  titre.className = "carte-titre";
  titre.id = titreId;
  titre.textContent = item.title;

  const desc = document.createElement("p");
  desc.className = "carte-desc";
  const descId = "desc-" + item.id;
  desc.id = descId;
  desc.textContent = item.desc;

  contenu.appendChild(titre);
  contenu.appendChild(desc);

  if (item.desc && item.desc.length > 200) {
    const btnLire = document.createElement("button");
    btnLire.className = "btn-lire-plus";
    btnLire.textContent = "Lire plus";
    btnLire.setAttribute("aria-expanded", "false");
    btnLire.setAttribute("aria-controls", descId);
    btnLire.addEventListener("click", () => {
      const etendu = desc.classList.toggle("etendu");
      btnLire.textContent = etendu ? "Lire moins" : "Lire plus";
      btnLire.setAttribute("aria-expanded", etendu ? "true" : "false");
    });
    contenu.appendChild(btnLire);
  }
  corps.appendChild(icone);
  corps.appendChild(contenu);
  div.appendChild(corps);

  {
    const tagsZone = document.createElement("div");
    tagsZone.className = "carte-tags";
    if (item.type && item.type.trim()) {
      const pillType = document.createElement("button");
      pillType.className = "carte-tag";
      pillType.textContent = item.type;
      pillType.setAttribute("aria-label", `Filtrer par type : ${item.type}`);
      pillType.title = `Filtrer par type : ${item.type}`;
      pillType.addEventListener("click", e => { e.preventDefault(); activerFiltreTag(item.type, true); });
      tagsZone.appendChild(pillType);
    }
    item.troubles.forEach(t => {
      if (!t || !t.trim()) return;
      const pill = document.createElement("button");
      pill.className = "carte-tag";
      pill.textContent = t;
      pill.setAttribute("aria-label", `Filtrer par trouble : ${t}`);
      pill.title = `Filtrer par trouble : ${t}`;
      pill.addEventListener("click", e => { e.preventDefault(); activerFiltreTag(t, false); });
      tagsZone.appendChild(pill);
    });
    const totalTags = 1 + item.troubles.length;
    if (totalTags > 3) {
      const allTags = [item.type, ...item.troubles];
      const hiddenTags = allTags.slice(3).join(", ");
      const more = document.createElement("span");
      more.className = "carte-tag-more";
      more.textContent = `+${totalTags - 3}`;
      more.setAttribute("data-tooltip", hiddenTags);
      more.setAttribute("aria-label", `${totalTags - 3} tags masqués : ${hiddenTags}`);
      tagsZone.appendChild(more);
    }
    div.appendChild(tagsZone);
  }

  const lienBloc = document.createElement("div");
  lienBloc.className = "carte-lien-bloc";
  lienBloc.style.display = "flex";
  lienBloc.style.alignItems = "center";
  lienBloc.style.justifyContent = "space-between";
  if (item.link) {
    const lien = document.createElement("a");
    lien.className = "carte-lien";
    lien.href = item.link;
    lien.target = "_blank";
    lien.rel = "noopener noreferrer";
    lien.innerHTML = 'Voir la ressource <span aria-hidden="true" style="font-size:0.75em;">↗</span>';
    lien.setAttribute("aria-label", `Voir la ressource : ${item.title} (s'ouvre dans un nouvel onglet)`);
    lienBloc.appendChild(lien);
  } else {
    const indispo = document.createElement("span");
    indispo.className = "carte-lien-indispo";
    indispo.textContent = "À venir";
    lienBloc.appendChild(indispo);
  }
  const btnFavori = document.createElement("button");
  btnFavori.className = "btn-favori" + (favoris.has(item.id) ? " actif" : "");
  btnFavori.textContent = favoris.has(item.id) ? "♥" : "♡";
  btnFavori.setAttribute("aria-label", `${favoris.has(item.id) ? "Retirer des" : "Ajouter aux"} favoris : ${item.title}`);
  btnFavori.setAttribute("aria-pressed", favoris.has(item.id) ? "true" : "false");
  btnFavori.addEventListener("click", () => {
    toggleFavori(item.id);
    const estFavori = favoris.has(item.id);
    btnFavori.textContent = estFavori ? "♥" : "♡";
    btnFavori.classList.toggle("actif", estFavori);
    btnFavori.setAttribute("aria-label", `${estFavori ? "Retirer des" : "Ajouter aux"} favoris : ${item.title}`);
    btnFavori.setAttribute("aria-pressed", estFavori ? "true" : "false");
    btnFavori.classList.remove("pulse");
    void btnFavori.offsetWidth;
    btnFavori.classList.add("pulse");
    afficherToast(estFavori ? "Ajouté aux favoris" : "Retiré des favoris");
    mettreAJourBadgeFavoris();
    if (catActive === "favoris") mettreAJourGrille();
  });
  lienBloc.appendChild(btnFavori);
  div.appendChild(lienBloc);

  li.appendChild(div);
  return li;
}

/* =============================================================================
   7. PAGINATION
   ============================================================================= */

function afficherPage(items, page) {
  const ancienBtnVoirPlus = document.getElementById("btn-voir-plus");
  if (ancienBtnVoirPlus) ancienBtnVoirPlus.remove();

  const debut = (page - 1) * PAGE_SIZE;
  const fin = page * PAGE_SIZE;
  const tranche = items.slice(debut, fin);

  const frag = document.createDocumentFragment();
  const premierNouveau = tranche.length > 0 ? rendreCarte(tranche[0]) : null;
  if (premierNouveau) frag.appendChild(premierNouveau);
  tranche.slice(1).forEach(item => frag.appendChild(rendreCarte(item)));
  grille.appendChild(frag);

  if (page > 1 && premierNouveau) {
    const h3 = premierNouveau.querySelector("h3");
    if (h3) { h3.setAttribute("tabindex", "-1"); h3.focus(); }
  }

  if (fin < items.length) {
    const btnVoirPlus = document.createElement("button");
    btnVoirPlus.id = "btn-voir-plus";
    btnVoirPlus.className = "btn-voir-plus";
    const restant = items.length - fin;
    btnVoirPlus.textContent = `Voir plus (${restant} restantes)`;
    btnVoirPlus.addEventListener("click", () => {
      pageActuelle++;
      afficherPage(_itemsFiltresCache || itemsFiltres(), pageActuelle);
    });
    grille.insertAdjacentElement("afterend", btnVoirPlus);
  }

  const barreWrap = document.getElementById("barre-progression-wrap");
  const chargees = Math.min(fin, items.length);
  if (items.length > PAGE_SIZE) {
    barreWrap.classList.add("visible");
    document.getElementById("barre-progression-fill").style.width = `${(chargees / items.length) * 100}%`;
    document.getElementById("barre-progression-texte").textContent = `${chargees} / ${items.length} chargées`;
  } else {
    barreWrap.classList.remove("visible");
  }
}

/* =============================================================================
   8. GRILLE : mise à jour principale
   ============================================================================= */

function mettreAJourGrille() {
  _itemsFiltresCache = itemsFiltres();
  const items = _itemsFiltresCache;
  pageActuelle = 1;
  grille.innerHTML = "";

  const filtreActif = catActive !== "tout" || typeActif !== null || troubleActif !== null || recherche.trim() !== "";
  const masquerEdito = typeActif !== null || troubleActif !== null || recherche.trim() !== "" || catActive === "favoris";
  sectionEdito.style.display = masquerEdito ? "none" : "";

  const panelAffiner = document.getElementById("filtres-avances");
  const btnAffiner = document.getElementById("btn-affiner");
  if (panelAffiner && btnAffiner && typeActif !== null && panelAffiner.hidden) {
    panelAffiner.hidden = false;
    btnAffiner.setAttribute("aria-expanded", "true");
  }

  if (btnEffacer) {
    btnEffacer.classList.toggle("visible", filtreActif);
  }

  if (items.length === 0) {
    const vide = document.createElement("div");
    vide.className = "etat-vide";
    vide.setAttribute("role", "status");
    if (catActive === "favoris") {
      vide.innerHTML = `
        <span class="etat-vide-emoji">♡</span>
        <p class="etat-vide-titre">Pas encore de favoris</p>
        <p class="etat-vide-msg">Ajoute ♡ sur les ressources qui t'intéressent pour les retrouver ici.</p>
      `;
    } else {
      vide.innerHTML = `
        <span class="etat-vide-emoji">🌿</span>
        <p class="etat-vide-titre">Aucune ressource trouvée</p>
        <p class="etat-vide-msg">Essaie d'élargir les filtres ou d'effacer ta recherche&nbsp;—<br>il y a forcément quelque chose pour toi ici.</p>
      `;
    }
    grille.appendChild(vide);
    resultatsLabel.textContent = catActive === "favoris" ? "Pas encore de favoris" : "Aucune ressource trouvée";
    resultatsLabel.classList.add("vide");
    const ancienBtn = document.getElementById("btn-voir-plus");
    if (ancienBtn) ancienBtn.remove();
    document.getElementById("barre-progression-wrap").classList.remove("visible");
  } else {
    afficherPage(items, pageActuelle);
  }

  const partageWrap = document.getElementById("partage-wrap");
  if (catActive === "favoris" && items.length > 0) {
    partageWrap.style.display = "";
    partageWrap.innerHTML = "";
    const btnPartager = document.createElement("button");
    btnPartager.className = "btn-partager-favoris";
    btnPartager.textContent = "\uD83D\uDD17 Partager ma s\u00e9lection";
    btnPartager.setAttribute("aria-label", "Copier un lien vers mes favoris");
    btnPartager.addEventListener("click", () => {
      const ids = [...favoris].join(",");
      const url = `${location.origin}${location.pathname}?favoris=${encodeURIComponent(ids)}`;
      navigator.clipboard.writeText(url).then(() => {
        btnPartager.textContent = "\u2713 Lien copi\u00e9 !";
        btnPartager.classList.add("copie");
        setTimeout(() => {
          btnPartager.textContent = "\uD83D\uDD17 Partager ma s\u00e9lection";
          btnPartager.classList.remove("copie");
        }, 2500);
      }).catch(() => {
        const input = document.createElement("input");
        input.value = url;
        input.style.cssText = "position:fixed;top:-9999px;";
        document.body.appendChild(input);
        input.select();
        document.execCommand("copy");
        input.remove();
        btnPartager.textContent = "\u2713 Lien copi\u00e9 !";
        btnPartager.classList.add("copie");
        setTimeout(() => {
          btnPartager.textContent = "\uD83D\uDD17 Partager ma s\u00e9lection";
          btnPartager.classList.remove("copie");
        }, 2500);
      });
    });
    partageWrap.appendChild(btnPartager);
  } else {
    partageWrap.style.display = "none";
  }

  const total = tousLesItems().length;
  if (filtreActif) {
    compteur.textContent = `${items.length} / ${total} ressources`;
  } else {
    compteur.textContent = `${total} ressources`;
  }
  compteur.style.display = "";

  resultatsLabel.textContent = "";
  resultatsLabel.classList.remove("vide");

  const partiesFiltres = [];
  if (catActive !== "tout") {
    const tabBtn = document.querySelector(`.tab-section[data-cat="${catActive}"]`);
    if (tabBtn) partiesFiltres.push(tabBtn.textContent.trim());
  }
  if (typeActif) partiesFiltres.push(typeActif);
  if (troubleActif) partiesFiltres.push(troubleActif);
  if (recherche.trim()) partiesFiltres.push(`"${recherche.trim()}"`);
  document.title = partiesFiltres.length > 0
    ? `${partiesFiltres.join(" · ")} — WikiPerché`
    : "WikiPerché — par La Maison Perchée";

  mettreAJourResumeFiltres();
  mettreAJourCompteursFiltres();
  syncURL();

  /* Scroll vers les résultats après un changement de filtre sur mobile (pas au chargement ni popstate) */
  if (!_isInitialLoad && !_isPopstate && window.innerWidth <= 600 && (typeActif || troubleActif || recherche.trim())) {
    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const cible = document.getElementById("resultats-label") || grille;
    cible.scrollIntoView({ behavior: prefersReduced ? "auto" : "smooth", block: "start" });
  }
}

function mettreAJourResumeFiltres() {
  const resume = document.getElementById("filtres-resume");
  resume.innerHTML = "";
  function ajouterChipResume(label, onRemove) {
    const chip = document.createElement("button");
    chip.className = "chip-resume";
    chip.setAttribute("aria-label", `Retirer le filtre ${label}`);
    chip.innerHTML = `${label} <span class="chip-resume-x" aria-hidden="true">✕</span>`;
    chip.addEventListener("click", onRemove);
    resume.appendChild(chip);
  }
  if (typeActif) {
    ajouterChipResume(typeActif, () => activerFiltreTag(typeActif, true));
  }
  if (troubleActif) {
    ajouterChipResume(troubleActif, () => activerFiltreTag(troubleActif, false));
  }
  if (recherche.trim()) {
    ajouterChipResume(`"${recherche.trim()}"`, () => {
      inputRecherche.value = "";
      recherche = "";
      majClearBtn();
      mettreAJourGrille();
    });
  }
}

/* =============================================================================
   9. FILTRES : construction et logique
   ============================================================================= */

function activerFiltreTag(valeur, estType) {
  if (estType) {
    typeActif = typeActif === valeur ? null : valeur;
    zoneTypes.querySelectorAll(".chip-type").forEach(c => {
      const match = c.dataset.type === typeActif;
      c.classList.toggle("actif", match);
      c.setAttribute("aria-pressed", match ? "true" : "false");
    });
  } else {
    troubleActif = troubleActif === valeur ? null : valeur;
    zoneTroubles.querySelectorAll(".chip-trouble").forEach(c => {
      const match = c.dataset.trouble === troubleActif;
      c.classList.toggle("actif", match);
      c.setAttribute("aria-pressed", match ? "true" : "false");
    });
  }
  if (estType) {
    const panelAffiner = document.getElementById("filtres-avances");
    const btnAffiner = document.getElementById("btn-affiner");
    if (panelAffiner && panelAffiner.hidden) {
      panelAffiner.hidden = false;
      btnAffiner.setAttribute("aria-expanded", "true");
    }
  }
  mettreAJourGrille();
}

function construireFiltresSections() {
  zoneSections.innerHTML = "";

  const btnTout = document.createElement("button");
  btnTout.className = "tab-section actif";
  btnTout.textContent = "Toutes les ressources";
  btnTout.dataset.cat = "tout";
  btnTout.setAttribute("aria-pressed", "true");
  zoneSections.appendChild(btnTout);

  data.forEach(section => {
    const btn = document.createElement("button");
    btn.className = "tab-section";
    btn.textContent = section.label;
    btn.dataset.cat = section.id;
    btn.setAttribute("aria-pressed", "false");
    zoneSections.appendChild(btn);
  });

  const btnFavoris = document.createElement("button");
  btnFavoris.className = "tab-section";
  btnFavoris.dataset.cat = "favoris";
  btnFavoris.setAttribute("aria-pressed", "false");
  btnFavoris.innerHTML = "♥ Mes favoris";
  zoneSections.appendChild(btnFavoris);

  zoneSections.addEventListener("click", e => {
    const btn = e.target.closest(".tab-section");
    if (!btn) return;
    catActive = btn.dataset.cat;
    zoneSections.querySelectorAll(".tab-section").forEach(b => {
      b.classList.toggle("actif", b === btn);
      b.setAttribute("aria-pressed", b === btn ? "true" : "false");
    });
    mettreAJourGrille();
  });
}

function construireFiltresTypes() {
  const label = zoneTypes.querySelector(".filtre-label");
  zoneTypes.innerHTML = "";
  if (label) zoneTypes.appendChild(label);

  const typesDansData = new Set();
  tousLesItems().forEach(item => {
    if (item.type) typesDansData.add(item.type);
  });

  ORDRE_TYPES.forEach(type => {
    if (!typesDansData.has(type)) return;
    const chip = document.createElement("button");
    chip.className = "chip chip-type";
    chip.textContent = type;
    chip.dataset.type = type;
    chip.setAttribute("aria-pressed", "false");
    zoneTypes.appendChild(chip);
  });

  zoneTypes.addEventListener("click", e => {
    const chip = e.target.closest(".chip-type");
    if (!chip) return;
    if (typeActif === chip.dataset.type) {
      typeActif = null;
      chip.classList.remove("actif");
      chip.setAttribute("aria-pressed", "false");
    } else {
      typeActif = chip.dataset.type;
      zoneTypes.querySelectorAll(".chip-type").forEach(c => {
        c.classList.toggle("actif", c === chip);
        c.setAttribute("aria-pressed", c === chip ? "true" : "false");
      });
    }
    mettreAJourGrille();
  });
}

function construireFiltresTroubles() {
  zoneTroubles.innerHTML = "";

  const troublesDansData = new Set();
  tousLesItems().forEach(item => {
    item.troubles.forEach(t => troublesDansData.add(t));
  });

  const LABELS_COURTS = { "Trouble schizo-affectif": "Schizo-affectif" };

  const wrapper = document.createElement("div");
  wrapper.className = "filtres-troubles-groupes";

  const groupes = [
    { label: "Troubles accompagnés", troubles: TROUBLES_ACCOMPAGNES },
    { label: "Être accompagné", troubles: ETRE_ACCOMPAGNE },
    { label: "Comorbidités fréquentes", troubles: TROUBLES_COMORBIDITES },
    { label: "Neurodiversité & autres troubles", troubles: TROUBLES_NEURODIV },
    { label: "Thématiques transversales", troubles: THEMATIQUES_TRANSVERSALES }
  ];

  groupes.forEach(({ label: groupeLabel, troubles }) => {
    const filtres = troubles.filter(t => troublesDansData.has(t));
    if (filtres.length === 0) return;

    const groupe = document.createElement("div");
    const isMobile = window.innerWidth <= 600;
    groupe.className = isMobile ? "filtres-groupe" : "filtres-groupe ouvert";

    const lbl = document.createElement("button");
    lbl.className = "filtres-groupe-label";
    lbl.type = "button";
    lbl.textContent = groupeLabel;
    lbl.setAttribute("aria-label", `${groupeLabel} (${filtres.length} filtres)`);
    lbl.setAttribute("aria-expanded", isMobile ? "false" : "true");
    lbl.addEventListener("click", () => {
      const ouvert = groupe.classList.toggle("ouvert");
      lbl.setAttribute("aria-expanded", String(ouvert));
    });
    groupe.appendChild(lbl);

    const chipsRow = document.createElement("div");
    chipsRow.className = "chips-troubles-groupe";
    const groupeId = "groupe-" + groupeLabel.toLowerCase().replace(/[^a-zà-ÿ0-9]+/g, "-").replace(/-+$/, "");
    chipsRow.id = groupeId;
    chipsRow.setAttribute("role", "group");
    chipsRow.setAttribute("aria-label", groupeLabel);
    lbl.setAttribute("aria-controls", groupeId);

    filtres.forEach(trouble => {
      const chip = document.createElement("button");
      chip.className = "chip chip-trouble";
      chip.textContent = LABELS_COURTS[trouble] || trouble;
      chip.dataset.trouble = trouble;
      chip.setAttribute("aria-pressed", "false");
      chipsRow.appendChild(chip);
    });

    groupe.appendChild(chipsRow);
    wrapper.appendChild(groupe);
  });

  zoneTroubles.appendChild(wrapper);

  zoneTroubles.addEventListener("click", e => {
    const chip = e.target.closest(".chip-trouble");
    if (!chip) return;
    if (troubleActif === chip.dataset.trouble) {
      troubleActif = null;
      chip.classList.remove("actif");
      chip.setAttribute("aria-pressed", "false");
    } else {
      troubleActif = chip.dataset.trouble;
      zoneTroubles.querySelectorAll(".chip-trouble").forEach(c => {
        c.classList.toggle("actif", c === chip);
        c.setAttribute("aria-pressed", c === chip ? "true" : "false");
      });
    }
    mettreAJourGrille();
  });
}

function ouvrirGroupeDuTrouble(trouble) {
  const chip = zoneTroubles.querySelector(`.chip-trouble[data-trouble="${trouble}"]`);
  if (!chip) return;
  const groupe = chip.closest(".filtres-groupe");
  if (groupe && !groupe.classList.contains("ouvert")) {
    groupe.classList.add("ouvert");
    const lbl = groupe.querySelector(".filtres-groupe-label");
    if (lbl) lbl.setAttribute("aria-expanded", "true");
  }
}

function toutEffacer() {
  catActive = "tout";
  typeActif = null;
  troubleActif = null;
  recherche = "";
  inputRecherche.value = "";
  zoneSections.querySelectorAll(".tab-section").forEach(b => {
    const isAll = b.dataset.cat === "tout";
    b.classList.toggle("actif", isAll);
    b.setAttribute("aria-pressed", isAll ? "true" : "false");
  });
  zoneTypes.querySelectorAll(".chip-type").forEach(c => {
    c.classList.remove("actif");
    c.setAttribute("aria-pressed", "false");
  });
  zoneTroubles.querySelectorAll(".chip-trouble").forEach(c => {
    c.classList.remove("actif");
    c.setAttribute("aria-pressed", "false");
  });
  mettreAJourGrille();
}

/* =============================================================================
   10. ROUTING : synchronisation URL ↔ état
   ============================================================================= */

function syncURL() {
  const params = new URLSearchParams();
  if (catActive !== "tout") params.set("section", catActive);
  if (typeActif) params.set("type", typeActif);
  if (troubleActif) params.set("trouble", troubleActif);
  if (recherche.trim()) params.set("q", recherche.trim());
  const nouvelleURL = params.toString()
    ? `${location.pathname}?${params}`
    : location.pathname;
  const state = { catActive, typeActif, troubleActif, recherche };
  if (_isPopstate || _isInitialLoad) {
    history.replaceState(state, "", nouvelleURL);
  } else {
    history.pushState(state, "", nouvelleURL);
  }
}

window.addEventListener("popstate", e => {
  _isPopstate = true;
  const s = e.state;
  if (s) {
    catActive = s.catActive || "tout";
    typeActif = s.typeActif || null;
    troubleActif = s.troubleActif || null;
    recherche = s.recherche || "";
  } else {
    catActive = "tout";
    typeActif = null;
    troubleActif = null;
    recherche = "";
  }
  inputRecherche.value = recherche;
  majClearBtn();
  document.querySelectorAll(".tab-section").forEach(b => {
    const actif = b.dataset.cat === catActive;
    b.classList.toggle("actif", actif);
    b.setAttribute("aria-pressed", actif ? "true" : "false");
  });
  zoneTypes.querySelectorAll(".chip-type").forEach(c => {
    const actif = c.dataset.type === typeActif;
    c.classList.toggle("actif", actif);
    c.setAttribute("aria-pressed", actif ? "true" : "false");
  });
  zoneTroubles.querySelectorAll(".chip-trouble").forEach(c => {
    const actif = c.dataset.trouble === troubleActif;
    c.classList.toggle("actif", actif);
    c.setAttribute("aria-pressed", actif ? "true" : "false");
  });
  /* Ouvrir le groupe contenant le trouble actif si nécessaire */
  if (troubleActif) {
    ouvrirGroupeDuTrouble(troubleActif);
  }
  mettreAJourGrille();
  _isPopstate = false;
});

function lireURL() {
  const params = new URLSearchParams(location.search);
  if (params.has("favoris")) {
    const ids = params.get("favoris").split(",").filter(s => s.length > 0);
    if (ids.length > 0) {
      ids.forEach(id => favoris.add(id));
      localStorage.setItem(FAVORIS_KEY, JSON.stringify([...favoris]));
      catActive = "favoris";
      mettreAJourBadgeFavoris();
    }
  }
  if (params.has("section")) catActive = params.get("section");
  if (params.has("type")) typeActif = params.get("type");
  if (params.has("trouble")) troubleActif = params.get("trouble");
  if (params.has("q")) {
    recherche = params.get("q");
    const inputRecherche = document.getElementById("recherche");
    if (inputRecherche) inputRecherche.value = recherche;
  }
  document.querySelectorAll(".tab-section").forEach(b => {
    const actif = b.dataset.cat === catActive;
    b.classList.toggle("actif", actif);
    b.setAttribute("aria-pressed", actif ? "true" : "false");
  });
  document.querySelectorAll(".chip-type").forEach(c => {
    const actif = c.dataset.type === typeActif;
    c.classList.toggle("actif", actif);
    c.setAttribute("aria-pressed", actif ? "true" : "false");
  });
  document.querySelectorAll(".chip-trouble").forEach(c => {
    const actif = c.dataset.trouble === troubleActif;
    c.classList.toggle("actif", actif);
    c.setAttribute("aria-pressed", actif ? "true" : "false");
  });
}

/* =============================================================================
   11. ACCESSIBILITÉ : taille de police, espacement, thème
   ============================================================================= */

function appliquerTaille(clé) {
  document.documentElement.style.fontSize = TAILLES[clé];
  const btns = { moins: btnMoins, normal: btnNormal, plus: btnPlus };
  [btnMoins, btnNormal, btnPlus].forEach(b => {
    const isActive = b === btns[clé];
    b.classList.toggle("actif", isActive);
    b.setAttribute("aria-pressed", isActive ? "true" : "false");
  });
  localStorage.setItem("wikip-fontsize", clé);
}

function appliquerEspacement(actif) {
  document.body.classList.toggle("dys-actif", actif);
  btnEspacement.classList.toggle("actif", actif);
  btnEspacement.setAttribute("aria-pressed", String(actif));
  localStorage.setItem("wikip-spacing", actif ? "1" : "0");
}

function themeEffectif() {
  const saved = localStorage.getItem(THEME_KEY);
  if (saved) return saved;
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function appliquerTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  if (theme === 'dark') {
    btnTheme.childNodes[0].textContent = '☀️ ';
    themeToggleLabel.textContent = 'Clair';
    btnTheme.setAttribute('aria-label', 'Passer en mode clair');
  } else {
    btnTheme.childNodes[0].textContent = '🌙 ';
    themeToggleLabel.textContent = 'Sombre';
    btnTheme.setAttribute('aria-label', 'Passer en mode sombre');
  }
}

function appliquerVue(vue) {
  vueActive = vue;
  localStorage.setItem("wikip-vue", vue);
  grille.setAttribute("data-vue", vue);
  grilleEdito.setAttribute("data-vue", vue);
  const btnGrille = document.getElementById("btn-vue-grille");
  const btnListe  = document.getElementById("btn-vue-liste");
  btnGrille.classList.toggle("actif", vue === "grille");
  btnGrille.setAttribute("aria-pressed", vue === "grille" ? "true" : "false");
  btnListe.classList.toggle("actif", vue === "liste");
  btnListe.setAttribute("aria-pressed", vue === "liste" ? "true" : "false");
}

/* =============================================================================
   12. SECTION ÉDITORIALE
   ============================================================================= */

function construireEdito() {
  const tousItems = tousLesItems();
  const epingles = TITRES_EPINGLES
    .map(titre => tousItems.find(it => it.title.trim() === titre.trim()))
    .filter(Boolean);
  const frag = document.createDocumentFragment();
  epingles.forEach(item => frag.appendChild(rendreCarte(item)));
  grilleEdito.appendChild(frag);
}

/* =============================================================================
   13. INITIALISATION
   ============================================================================= */

function initToggleAccès() {
  const btn = document.getElementById("btn-accès-toggle");
  const panel = document.getElementById("barre-accès-panel");
  btn.addEventListener("click", () => {
    const ouvert = !panel.hidden;
    panel.hidden = ouvert;
    btn.setAttribute("aria-expanded", String(!ouvert));
    btn.classList.toggle("actif", !ouvert);
  });
}

function initToggleAffiner() {
  const btn = document.getElementById("btn-affiner");
  const panel = document.getElementById("filtres-avances");
  btn.addEventListener("click", () => {
    const ouvert = !panel.hidden;
    panel.hidden = ouvert;
    btn.setAttribute("aria-expanded", String(!ouvert));
  });
}

/* ---- Recherche live ---- */
function majClearBtn() { btnClearRecherche.style.display = inputRecherche.value ? "" : "none"; }
inputRecherche.addEventListener("input", () => {
  majClearBtn();
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    recherche = inputRecherche.value;
    mettreAJourGrille();
  }, 300);
});
btnClearRecherche.addEventListener("click", () => {
  inputRecherche.value = "";
  recherche = "";
  majClearBtn();
  inputRecherche.focus();
  mettreAJourGrille();
});

/* ---- Taille de police ---- */
btnMoins.addEventListener("click",  () => appliquerTaille("moins"));
btnNormal.addEventListener("click", () => appliquerTaille("normal"));
btnPlus.addEventListener("click",   () => appliquerTaille("plus"));
const tailleStockée = localStorage.getItem("wikip-fontsize");
if (tailleStockée && TAILLES[tailleStockée]) appliquerTaille(tailleStockée);

/* ---- Espacement ---- */
btnEspacement.addEventListener("click", () => {
  appliquerEspacement(!document.body.classList.contains("dys-actif"));
});
if (localStorage.getItem("wikip-spacing") === "1") appliquerEspacement(true);

/* ---- Thème ---- */
appliquerTheme(themeEffectif());
btnTheme.addEventListener('click', () => {
  const actuel = document.documentElement.getAttribute('data-theme');
  const nouveau = actuel === 'dark' ? 'light' : 'dark';
  localStorage.setItem(THEME_KEY, nouveau);
  appliquerTheme(nouveau);
});

/* ---- Vue grille / liste ---- */
document.getElementById("btn-vue-grille").addEventListener("click", () => appliquerVue("grille"));
document.getElementById("btn-vue-liste").addEventListener("click", () => appliquerVue("liste"));

/* ---- Bootstrap ---- */
construireFiltresSections();
construireFiltresTypes();
construireFiltresTroubles();
construireEdito();
initToggleAccès();
initToggleAffiner();
btnEffacer.addEventListener("click", toutEffacer);
lireURL();
appliquerVue(vueActive);
mettreAJourBadgeFavoris();
mettreAJourGrille();
_isInitialLoad = false;

/* ---- Bandeau onboarding (première visite) ---- */
if (!localStorage.getItem(ONBOARDING_KEY) && !localStorage.getItem(FAVORIS_KEY)) {
  const bandeau = document.getElementById("bandeau-onboarding");
  bandeau.style.display = "";
  document.getElementById("bandeau-onboarding-close").addEventListener("click", () => {
    bandeau.style.display = "none";
    localStorage.setItem(ONBOARDING_KEY, "1");
  });
  const masquerOnboarding = () => {
    bandeau.style.display = "none";
    localStorage.setItem(ONBOARDING_KEY, "1");
  };
  document.querySelectorAll(".chip-trouble, .chip-type, .tab-section").forEach(el => {
    el.addEventListener("click", masquerOnboarding, { once: true });
  });
}

/* ---- Recherches fréquentes au focus ---- */
(function() {
  const input = document.getElementById("recherche");
  const panel = document.getElementById("recherches-rapides");
  const TOP_TROUBLES = ORDRE_TROUBLES.slice(0, 5);
  const label = document.createElement("span");
  label.className = "recherches-rapides-label";
  label.textContent = "Suggestions :";
  panel.appendChild(label);
  TOP_TROUBLES.forEach(t => {
    const chip = document.createElement("button");
    chip.className = "chip-rapide";
    chip.setAttribute("role", "option");
    chip.setAttribute("aria-selected", "false");
    chip.textContent = t;
    chip.addEventListener("mousedown", e => {
      e.preventDefault();
      setPanelVisible(false);
      /* Activer le filtre trouble au lieu de remplir la recherche textuelle */
      activerFiltreTag(t, false);
    });
    panel.appendChild(chip);
  });
  function setPanelVisible(show) {
    panel.classList.toggle("visible", show);
    input.setAttribute("aria-expanded", show ? "true" : "false");
  }
  input.addEventListener("focus", () => {
    if (!input.value.trim()) setPanelVisible(true);
  });
  input.addEventListener("blur", () => {
    setTimeout(() => setPanelVisible(false), 150);
  });
  input.addEventListener("input", () => {
    setPanelVisible(!input.value.trim() && document.activeElement === input);
  });
  input.addEventListener("keydown", e => {
    if (!panel.classList.contains("visible")) return;
    const chips = [...panel.querySelectorAll(".chip-rapide")];
    if (!chips.length) return;
    const idx = chips.findIndex(c => c.getAttribute("aria-selected") === "true");
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      const next = e.key === "ArrowDown" ? (idx + 1) % chips.length : (idx <= 0 ? chips.length - 1 : idx - 1);
      chips.forEach(c => c.setAttribute("aria-selected", "false"));
      chips[next].setAttribute("aria-selected", "true");
      chips[next].focus();
    } else if (e.key === "Enter" && idx >= 0) {
      e.preventDefault();
      chips[idx].click();
    } else if (e.key === "Escape") {
      setPanelVisible(false);
      input.focus();
    }
  });
})();

/* ---- Raccourci clavier "/" pour focus recherche ---- */
document.addEventListener("keydown", e => {
  if (e.key === "/" && !["INPUT", "TEXTAREA", "SELECT"].includes(document.activeElement.tagName) && !document.activeElement.isContentEditable) {
    e.preventDefault();
    inputRecherche.focus();
  }
});

/* ---- Bouton retour en haut ---- */
window.addEventListener("scroll", () => {
  const visible = window.scrollY > 400;
  btnRetourHaut.classList.toggle("visible", visible);
  btnRetourHaut.setAttribute("tabindex", visible ? "0" : "-1");
}, { passive: true });
btnRetourHaut.setAttribute("tabindex", "-1");
btnRetourHaut.addEventListener("click", () => {
  const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  window.scrollTo({ top: 0, behavior: prefersReduced ? "auto" : "smooth" });
});

/* ---- Bandeau crise ---- */
(function() {
  const bandeau = document.getElementById("bandeau-crise");
  const CRISE_KEY = "wikip-crise-ferme";
  function majPaddingCrise() {
    if (bandeau.style.display === "none") {
      document.body.style.paddingBottom = "0";
    } else {
      document.body.style.paddingBottom = bandeau.offsetHeight + "px";
    }
  }
  window.addEventListener("resize", majPaddingCrise);
  majPaddingCrise();

  const MOTS_CRISE = [
    "suicide", "suicidaire", "mourir", "mourant", "en finir", "me tuer",
    "urgence", "crise", "automutilation", "scarification",
    "détresse", "desespoir", "désespoir", "plus envie", "mal de vivre",
    "sos", "3114", "aide immédiate", "aide maintenant"
  ];
  if (sessionStorage.getItem(CRISE_KEY)) {
    bandeau.style.display = "none";
    majPaddingCrise();
  }
  document.getElementById("bandeau-crise-close").addEventListener("click", () => {
    bandeau.classList.remove("crise-alerte");
    bandeau.style.display = "none";
    majPaddingCrise();
    sessionStorage.setItem(CRISE_KEY, "1");
  });

  /* Détection de mots-clés de crise dans la recherche */
  function verifierCrise(terme) {
    if (!terme) {
      bandeau.classList.remove("crise-alerte");
      return;
    }
    const t = terme.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const estCrise = MOTS_CRISE.some(mot => {
      const m = mot.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      return t.includes(m);
    });
    const alerteSr = document.getElementById("crise-alerte-sr");
    if (estCrise) {
      bandeau.style.display = "";
      majPaddingCrise();
      bandeau.classList.add("crise-alerte");
      sessionStorage.removeItem(CRISE_KEY);
      if (alerteSr) alerteSr.textContent = "Si tu es en détresse, appelle le 3114 maintenant. Numéro national de prévention du suicide, disponible 24h/24.";
    } else {
      bandeau.classList.remove("crise-alerte");
      if (alerteSr) alerteSr.textContent = "";
    }
  }

  inputRecherche.addEventListener("input", () => {
    verifierCrise(inputRecherche.value);
  });
  /* Vérifier aussi au chargement si un terme de crise est dans l'URL */
  verifierCrise(inputRecherche.value);
})();

/* ---- Indicateur scroll carrousel éditorial ---- */
(function() {
  const edito = document.getElementById("grille-edito");
  const editoSection = document.getElementById("section-edito");
  if (edito && editoSection) {
    const verifierScrollEdito = () => {
      const atEnd = edito.scrollLeft + edito.clientWidth >= edito.scrollWidth - 8;
      editoSection.classList.toggle("scrolled-end", atEnd);
    };
    edito.addEventListener("scroll", verifierScrollEdito, { passive: true });
    verifierScrollEdito();
  }
})();

/* ---- Réaction en temps réel au changement de prefers-color-scheme ---- */
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => {
  if (!localStorage.getItem(THEME_KEY)) {
    appliquerTheme(e.matches ? 'dark' : 'light');
  }
});

/* ---- Dots du carrousel éditorial ---- */
(function() {
  const edito = document.getElementById("grille-edito");
  const dotsContainer = document.getElementById("edito-dots");
  if (!edito || !dotsContainer) return;
  function initDots() {
    const items = edito.querySelectorAll("li, .carte");
    dotsContainer.innerHTML = "";
    items.forEach((_, i) => {
      const dot = document.createElement("button");
      dot.className = "edito-dot" + (i === 0 ? " actif" : "");
      dot.setAttribute("aria-label", `Aller à la ressource ${i + 1}`);
      dot.addEventListener("click", () => {
        items[i].scrollIntoView({ behavior: "smooth", inline: "start", block: "nearest" });
      });
      dotsContainer.appendChild(dot);
    });
  }
  initDots();
  edito.addEventListener("scroll", () => {
    const dots = dotsContainer.querySelectorAll(".edito-dot");
    const items = edito.querySelectorAll("li, .carte");
    let closest = 0;
    let minDist = Infinity;
    items.forEach((item, i) => {
      const dist = Math.abs(item.getBoundingClientRect().left - edito.getBoundingClientRect().left);
      if (dist < minDist) { minDist = dist; closest = i; }
    });
    dots.forEach((d, i) => d.classList.toggle("actif", i === closest));
  }, { passive: true });
})();

/* ---- Indicateur scroll chips ---- */
document.querySelectorAll(".chips-barre-wrap").forEach(wrap => {
  const barre = wrap.querySelector(".chips-barre");
  if (!barre) return;
  const verifierScroll = () => {
    const atEnd = barre.scrollLeft + barre.clientWidth >= barre.scrollWidth - 8;
    wrap.classList.toggle("scrolled-end", atEnd);
  };
  barre.addEventListener("scroll", verifierScroll, { passive: true });
  verifierScroll();
});
