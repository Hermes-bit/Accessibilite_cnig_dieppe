# Protocole de Recettage — Accessibilité CNIG Dieppe

**Projet :** Plateforme de gestion d'accessibilité urbaine  
**URL de test :** https://hermes-bit.github.io/Accessibilite_cnig_dieppe/?config=apps/cnig_accessibilite.xml  
**Période de test :** _______________  
**Version testée :** _______________

---

## Membres de l'équipe de test

| Testeur | Appareil | Navigateur | OS |
|---------|----------|------------|----|
| **Aristide** | | | |
| **Eliott** | | | |
| **Parfait** | | | |

> **Important :** Chaque testeur remplit ce tableau avant de commencer.

---

## Comment signaler un retour

La plateforme dispose d'un bouton **"Retour"** (icône 💬) dans la barre de navigation.

1. Cliquer sur 💬 **Retour** dans la barre en haut  
2. Choisir la **sévérité** du problème :
   - 🔴 **Bloquant** — impossible d'utiliser la fonctionnalité
   - 🟠 **Majeur** — fonctionnalité dégradée, contournement difficile
   - 🔵 **Mineur** — bug non bloquant, gêne légère
   - 🟢 **Amélioration** — suggestion ou remarque
3. Choisir la **zone concernée** dans la liste
4. Décrire le problème en détail (voir conseils ci-dessous)
5. Cliquer **Envoyer le retour**

> Les informations sur votre navigateur et votre appareil sont **ajoutées automatiquement**.

### Conseils pour une bonne description

```
❌ Mauvais : "Ça marche pas"

✅ Bon : "Quand je clique sur le bouton 'Itinéraire' sur mon iPhone, 
          la carte se fige et rien ne se passe. Le bouton ne réagit plus.
          J'ai dû fermer et rouvrir la page."
```

Idéalement préciser :
- Ce que vous faisiez au moment du problème
- Les étapes pour reproduire
- Ce que vous attendiez vs ce qui s'est passé
- Si ça arrive à chaque fois ou de façon aléatoire

---

## Scénarios de test

### MODULE 1 — Authentification

| # | Scénario | Procédure | Résultat attendu |
|---|----------|-----------|-----------------|
| A1 | Première connexion | Cliquer "Première connexion ? Recevoir un mot de passe", entrer votre e-mail | Recevoir un message de confirmation |
| A2 | Connexion normale | Entrer e-mail + mot de passe, cliquer "Se connecter" | Accès à la carte avec votre avatar en haut à droite |
| A3 | Mauvais mot de passe | Entrer un mot de passe incorrect | Message d'erreur clair, pas de connexion |
| A4 | Changer de mot de passe | Menu avatar → "Changer de mot de passe" | Formulaire s'ouvre, changement effectif |
| A5 | Déconnexion | Menu avatar → "Déconnexion" | Retour à l'écran de connexion |
| A6 | Fermer le modal | Cliquer la croix (×) sur le modal de connexion | Le modal se ferme, retour à la carte |

---

### MODULE 2 — Carte & Fonds de plan

| # | Scénario | Procédure | Résultat attendu |
|---|----------|-----------|-----------------|
| B1 | Chargement initial | Ouvrir l'URL | La carte s'affiche centrée sur Dieppe |
| B2 | Fond OSM | Sélectionner "OpenStreetMap" dans le sélecteur | Fond de carte OpenStreetMap visible |
| B3 | Fond clair | Sélectionner "Fond clair" | Fond CartoDB (tons gris clairs) visible |
| B4 | Fond satellite | Sélectionner "Satellite" | Vue aérienne/satellite visible |
| B5 | Thumbnail | Ouvrir le sélecteur de fonds | Chaque fond affiche un aperçu de Dieppe |
| B6 | Zoom | Utiliser la molette / pinch-to-zoom | La carte zoome/dézoome normalement |
| B7 | Navigation | Cliquer-glisser sur la carte | La carte se déplace |

---

### MODULE 3 — Couches de données

| # | Scénario | Procédure | Résultat attendu |
|---|----------|-----------|-----------------|
| C1 | Tronçons | Ouvrir le panneau "Cheminements", voir tronçons | Lignes colorées (vert/orange/rouge) sur la carte |
| C2 | Obstacles | Activer la couche "Obstacles" | Points rouges sur la carte |
| C3 | Traversées | Activer la couche "Traversées" | Passages piétons visibles |
| C4 | Nœuds | Activer la couche "Nœuds" | Points de cheminement visibles |
| C5 | Escaliers | Thème "Équipements", activer "Escaliers" | Escaliers visibles en violet |
| C6 | Rampes | Activer "Rampes" | Rampes visibles en vert |
| C7 | Stationnements PMR | Thème "Stationnement PMR" | Places PMR visibles en bleu |
| C8 | Entrées ERP | Thème "Entrées ERP" | Entrées de bâtiments visibles |
| C9 | Clic sur un objet | Cliquer sur un tronçon ou obstacle | Popup avec les informations détaillées |
| C10 | Masquer une couche | Décocher une couche active | Disparaît de la carte |

---

### MODULE 4 — Itinéraire

| # | Scénario | Procédure | Résultat attendu |
|---|----------|-----------|-----------------|
| D1 | Ouvrir | Cliquer bouton "Itinéraire" dans la barre | Panneau de calcul s'ouvre |
| D2 | Calcul simple | Cliquer deux points sur la carte comme départ/arrivée | Itinéraire calculé et affiché |
| D3 | Résultat | Vérifier le tracé | Chemin accessible visible sur la carte |

---

### MODULE 5 — Explorateur de données

| # | Scénario | Procédure | Résultat attendu |
|---|----------|-----------|-----------------|
| E1 | Ouvrir | Cliquer "Base de données" dans la barre | Panneau avec liste de tables |
| E2 | Voir une table | Cliquer sur "v_troncons" | Données du tableau affichées |
| E3 | Requête SQL | Écrire une requête SELECT simple | Résultats affichés |
| E4 | Export CSV | Cliquer "Exporter CSV" | Fichier téléchargé |

---

### MODULE 6 — Affichage Mobile

| # | Scénario | Procédure | Résultat attendu |
|---|----------|-----------|-----------------|
| F1 | Chargement mobile | Ouvrir l'URL sur smartphone | Carte visible, barre de navigation adaptée |
| F2 | Barre de navigation | Observer la barre du haut | Icônes seulement (pas de texte) |
| F3 | Menu avatar mobile | Cliquer sur votre avatar (initiale) | Menu centré sur l'écran |
| F4 | Modal connexion | Ouvrir le modal de connexion | Centré, pas coupé sur les bords |
| F5 | Fermeture modal | Cliquer la croix × sur mobile | Se ferme correctement |
| F6 | Saisie clavier | Taper dans un champ | Pas de zoom automatique (iOS) |
| F7 | Dynamic Island | Sur iPhone avec Dynamic Island | Pas de contenu caché sous l'encoche |
| F8 | Signaler un retour | Cliquer 💬 "Retour" sur mobile | Formulaire adapté, envoi fonctionnel |

---

### MODULE 7 — Retours de test (Admins seulement)

| # | Scénario | Procédure | Résultat attendu |
|---|----------|-----------|-----------------|
| G1 | Badge retours | Se connecter en admin, regarder bouton 💬 | Badge rouge avec le nombre de nouveaux retours |
| G2 | Voir les retours | Cliquer 💬 → onglet "Tous les retours" | Liste de tous les retours soumis |
| G3 | Résoudre | Cliquer "Résoudre" sur un retour | Statut passe à "Résolu" |
| G4 | Informations auto | Vérifier les retours soumis | Navigateur, OS, taille d'écran bien détectés |

---

## Grille de résultats (à remplir par chaque testeur)

**Testeur :** _______________  
**Date :** _______________  
**Appareil :** _______________

| # Test | ✅ OK | ⚠️ Partiel | ❌ Échec | Notes |
|--------|-------|-----------|---------|-------|
| A1 | | | | |
| A2 | | | | |
| A3 | | | | |
| A4 | | | | |
| A5 | | | | |
| A6 | | | | |
| B1 | | | | |
| B2 | | | | |
| B3 | | | | |
| B4 | | | | |
| B5 | | | | |
| B6 | | | | |
| B7 | | | | |
| C1 | | | | |
| C2 | | | | |
| C3 | | | | |
| C4 | | | | |
| C5 | | | | |
| C6 | | | | |
| C7 | | | | |
| C8 | | | | |
| C9 | | | | |
| C10 | | | | |
| D1 | | | | |
| D2 | | | | |
| D3 | | | | |
| E1 | | | | |
| E2 | | | | |
| E3 | | | | |
| E4 | | | | |
| F1 | | | | |
| F2 | | | | |
| F3 | | | | |
| F4 | | | | |
| F5 | | | | |
| F6 | | | | |
| F7 | | | | |
| F8 | | | | |

---

## Observations générales

> *Espace libre pour remarques, impressions, suggestions non liées à un test précis.*

_______________________________________________  
_______________________________________________  
_______________________________________________  
_______________________________________________  

---

*Document généré pour le projet CNIG Accessibilité Dieppe — Testeurs : Aristide, Eliott, Parfait*
