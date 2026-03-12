# WikiPerché

Bibliothèque de ressources sur la santé mentale, par [La Maison Perchée](https://lamaisonperchee.org).

Plus de 800 ressources (podcasts, livres, vidéos, sites, conférences, applis…) sélectionnées par des personnes concernées, pour les personnes concernées et leurs proches.

## Démarrage

Aucun build nécessaire — ouvrir `index.html` dans un navigateur.

```bash
# ou avec un serveur local
python3 -m http.server 8000
```

## Structure du projet

```
index.html              # Structure HTML (header, filtres, grille, footer)
style.css               # Styles (layout, cartes, dark mode, responsive, accessibilité)
app.js                  # Logique applicative (filtres, rendu, favoris, crise)
wikiperche-data.js      # Base de données des ressources (845 ressources)
```

### Sections

| Section | Description |
|---------|-------------|
| 🌱 Vivre avec | Ressources pour le quotidien, proches aidants (119 ressources) |
| 🌿 Vers le rétablissement | Comprendre et traiter les troubles (686 ressources) |
| 🤝 Maladie psy et société | Regard sociétal, stigmatisation, témoignages (40 ressources) |

### Filtres

- **Troubles** (groupés par catégorie) :
  - *Troubles accompagnés* : Bipolarité, Schizophrénie, Trouble schizo-affectif, Borderline / TPL
  - *Comorbidités fréquentes* : Dépression, Anxiété/Angoisse, Addictions, Autres troubles
  - *Neurodiversité & autres troubles* : TCA, TDAH adulte, TSPT / PTSD, TSA / autisme
  - *Thématiques transversales* : Deuil et perte, Troubles du sommeil, Santé mentale & précarité, Fonctions cognitives
  - *Être accompagné* : Proches aidants
- **Types de contenu** : Vidéo / Film, Site internet / Blog, Article / Livre, Podcast, Conférence, Applis, Réseaux sociaux, Infographie
- **Recherche** texte libre (insensible aux accents)
- **Favoris** sauvegardés en `localStorage`, partageables via URL

## Fonctionnalités

- **Section éditoriale "Pour commencer"** : sélection de ressources recommandées en page d'accueil
- **Pagination** : chargement par tranches de 24 avec barre de progression
- **Vue grille / liste** : basculement entre les deux modes d'affichage
- **Partage de favoris** : génération d'un lien URL contenant les IDs des favoris
- **Bandeau onboarding** : message d'aide à la première visite
- **Recherches fréquentes** : suggestions rapides au focus sur la barre de recherche
- **Synchronisation URL** : les filtres actifs sont reflétés dans les paramètres de l'URL
- **Bouton retour en haut** : apparaît après un scroll de 400px

## Accessibilité

- Taille de police ajustable (A−, A, A+)
- Mode espacement dyslexie
- Thème sombre / clair (+ détection système, sans flash au chargement)
- Respect de `prefers-reduced-motion`
- Cibles tactiles ≥ 44px (WCAG 2.5.5)
- `aria-live`, `aria-pressed`, `aria-controls` sur les éléments interactifs
- Skip link "Aller au contenu principal"
- Bandeau de crise contextuel : détecte les mots-clés de crise dans la recherche (suicide, détresse, etc.) et affiche les numéros d'urgence (3114, SOS Psychiatrie, SOS Amitié) de façon proéminente
- Indicateurs de scroll (fade-out + flèche) sur les zones horizontales scrollables (chips, carrousel édito)
- Bandes latérales colorées par type de contenu sur les cartes

## Données

Chaque ressource suit ce format dans `wikiperche-data.js` :

```js
{
  "id": "slug-du-titre",
  "icon": "🎬",
  "title": "Titre de la ressource",
  "desc": "Description courte",
  "type": "Vidéo / Film",
  "troubles": ["Dépression", "Anxiété/Angoisse"],
  "link": "https://..."
}
```

Pour modifier les données, éditer `wikiperche-data.js` directement ou utiliser le script d'import. Les filtres se mettent à jour dynamiquement — seuls `ORDRE_TYPES` et `ORDRE_TROUBLES` dans `app.js` contrôlent l'ordre d'affichage des chips.
