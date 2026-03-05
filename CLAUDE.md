# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

WikiPerché is a **zero-build, single-file web app** (`index.html`) — no npm, no framework, no bundler. To "run" it, open `index.html` directly in a browser (or use any static file server).

## Architecture

The project has exactly two source files:

- **`wikiperche-data.js`** — the dataset: a single `const data = [...]` declaration with 3 section objects (`vivre`, `retablissement`, `societe`), each containing an `items` array of resource objects.
- **`index.html`** — the entire application: inline CSS, the data script embedded verbatim, and the app logic as a second inline `<script>`.

### Data structure

Each item in `data[n].items`:
```js
{ id, icon, title, desc, type, troubles: [...], link? }
```
`type` is the content type (e.g. "Vidéo / Film"); `troubles` is an array of mental health topics.

### App logic (inside `index.html`)

State variables: `catActive` (section), `typeActif` (content type chip), `troubleActif` (disorder chip), `recherche` (search string).

Key functions:
- `tousLesItems()` — flattens `data` into a single array
- `itemsFiltres()` — applies all four filters; search normalises accents via `NFD`
- `mettreAJourGrille()` — re-renders cards, updates counter (hidden when no filter active, shows "X / total" when filtered); handles empty states (distinct for Favoris vs filter/search); updates summary chips via `mettreAJourResumeFiltres()`
- `mettreAJourResumeFiltres()` — renders read-only chips with "x" button in `#filtres-resume` showing active type filter (trouble is always visible at top level)
- `rendreCarte(item)` — builds an `<article>` card with icon, title, desc, "Lire plus" toggle (with `aria-controls`), tags, link (with `aria-label` mentioning new tab), and favorite button
- `afficherPage(items, page)` — renders a page of `PAGE_SIZE` (24) cards with "Voir plus" pagination; moves focus to the first new card on subsequent pages
- `construireEdito()` — renders the "Pour commencer" editorial section from `TITRES_EPINGLES`
- `construireFiltres*()` — build section tabs and chips dynamically from `ORDRE_TYPES` / `ORDRE_TROUBLES` constants
- `activerFiltreTag(valeur, estType)` — activates a filter from an in-card tag click; opens the "Affiner" panel only for type filters (trouble is top-level)
- `appliquerTaille(clé)` — sets `document.documentElement.style.fontSize` (keys: `moins`/`normal`/`plus`), persisted in `localStorage["wikip-fontsize"]`
- `appliquerEspacement(actif)` — toggles `body.dys-actif` class for dyslexia-friendly spacing, persisted in `localStorage["wikip-spacing"]`
- `appliquerVue(vue)` — switches between `"grille"` and `"liste"` display, persisted in `localStorage["wikip-vue"]`
- `syncURL()` / `lireURL()` — keeps URL query params in sync with filter state

Filter chips use `aria-pressed` toggle semantics; a second click on an active chip deactivates it.

### Filter layout

Trouble chips are at **top level** (visible without clicking "Affiner"), directly below the section tabs. The "Type de contenu" button expands the type chips panel. When the panel is closed but a type filter is active, a summary chip with "x" button appears in `#filtres-resume`.

The counter (`#compteur`) is **hidden by default** and only appears when a filter is active, showing "X / total ressources".

The "Pour commencer" editorial section stays visible when only a section tab is selected. It hides when a type, trouble, or search filter is active (or on Favoris).

Empty state: when no results match, only the central `.etat-vide` block is shown (the `resultats-label` is cleared to avoid duplicate messaging).

### Favorites

Stored in `localStorage["wikip-favoris"]` as a JSON array of item IDs. The `"favoris"` section tab shows only favorited items. Empty favorites state shows a dedicated empathetic message (distinct from "no results found").

### Accessibility bar (`.barre-accès`)

Rendered as a `<div role="region">` between `</header>` and `<nav class="filtres-zone">`. Contains:

- Three font-size buttons (`A−` / `A` / `A+`) — 14 / 16 / 19 px on `html`
- A dyslexia spacing toggle (`⇔ Espacement`) — adds `letter-spacing`, `word-spacing`, `line-height: 1.8` via the `body.dys-actif` class on `.carte-desc`, `.carte-titre`, `.carte-tag`

Both preferences are restored from `localStorage` on page load.

### Accessibility & WCAG compliance

- `@media (prefers-reduced-motion: reduce)` disables all transitions and animations
- `scroll-padding-top: 80px` on `html` accounts for the sticky header
- Touch targets: all interactive buttons (`.btn-favori`, `.btn-vue`, `.btn-affiner`, `.btn-accès`) have `min-height: 44px` for WCAG 2.5.5
- Search input has `outline` on focus (not just `border-color`) for WCAG 2.4.7
- `.filtre-label` uses `--texte-doux` (not `--texte-tres-doux`) for AA contrast compliance
- Dark mode error text (`.resultats-label.vide`) uses `#f07060` for sufficient contrast on dark backgrounds
- `#compteur` has `aria-live="polite" aria-atomic="true"`
- `.btn-vue` buttons have `aria-label` (not just `title`)
- `.btn-lire-plus` has `aria-controls` pointing to the description `id`
- External links include "(s'ouvre dans un nouvel onglet)" in their `aria-label`
- Search input has `enterkeyhint="search"` and `autocomplete="off"`
- A `<h2 class="sr-only">Toutes les ressources</h2>` precedes `#grille` for screen reader navigation
- "Pour commencer" section includes a subtitle explaining the editorial selection

### Dark mode & theme toggle

Theme is controlled by a `data-theme` attribute on `<html>` (`"dark"` or `"light"`), set by an inline IIFE in `<head>` before first render (no flash).

Priority: `localStorage["wikip-theme"]` > `prefers-color-scheme`.

CSS uses two complementary rules:

- `@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) { ... } }` — system dark unless user forced light
- `:root[data-theme="dark"] { ... }` — user-forced dark regardless of system

A `#theme-toggle` button in `.header-inner` (between `#compteur` and `.recherche-wrap`) toggles the theme and persists the choice. Icon: `☀️` in dark mode, `🌙` in light mode.

Key JS functions added: `themeEffectif()`, `appliquerTheme(theme)`. The `THEME_KEY` constant is `'wikip-theme'`.

## Modifying the data

Edit `wikiperche-data.js` only, then re-embed it in `index.html` by replacing everything between the two `<script>` tags (the data one and the app one). The app derives all filter options dynamically, so adding new tags or sections requires no JS changes — only `ORDRE_TYPES` / `ORDRE_TROUBLES` arrays in `index.html` may need updating to control sort order.

### HTML structure (inside `<main>`)

1. `.vue-toggle-wrap` — grid/list view toggle
2. `section.section-edito` — "Pour commencer" editorial picks (h2 + subtitle + `#grille-edito`)
3. `h2.sr-only` — "Toutes les ressources" (screen reader only)
4. `p.resultats-label` — live filter results count
5. `div#grille` — main card grid (paginated via "Voir plus" button inserted after `#grille`)
