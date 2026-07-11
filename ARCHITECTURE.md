# AUTO_LOCATION — Architecture

> Analyse produite par le "Prompt 0" du pack d'amélioration. Aucun code métier n'a été modifié.
> Date : 2026-07-02.

## 1. Stack détectée

| Élément | Valeur |
|---|---|
| Framework | **Vite 6 + React 19** (SPA, pas de SSR) — `react-router-dom` v7 pour le routage |
| Langage | **TypeScript** (`tsconfig.json`, strict non activé, `noEmit`) |
| Package manager | **npm** (seul `package-lock.json` présent) |
| Styling | **Tailwind CSS v4** via `@tailwindcss/vite` (pas de `tailwind.config.*` — thème défini dans `src/index.css` avec `@theme`) |
| shadcn/ui | **Absent** (pas de `components.json`, pas de `components/ui/`) |
| Animations | **`motion` v12** (le successeur de framer-motion) — importé partout via `motion/react`. `framer-motion` est présent dans `node_modules` uniquement comme dépendance transitive. **Ne pas installer framer-motion en plus.** |
| 3D | `three` + `@react-three/fiber` + `@react-three/drei` déjà installés (non encore utilisés dans `src/`) |
| Icônes | `lucide-react` (mais beaucoup d'emojis utilisés comme icônes dans l'admin) |
| Alias import | `@/` → **racine du repo** (défini dans `vite.config.ts` et `tsconfig.json`). Le code existant utilise surtout des imports relatifs `../` |
| Backend | **Supabase** (Postgres + Auth + Storage) via `src/supabase.ts` (`VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY`) |
| Extras | `express`/`better-sqlite3`/`send-contract-proxy.cjs` = proxy local d'envoi d'e-mails de contrats ; `api/send-contract-email.ts` = fonction serverless Vercel ; `supabase/functions/send-contract-email` = edge function. `@google/genai` (clé `GEMINI_API_KEY`) |
| Déploiement | Vercel (`vercel.json`), `npm run dev` = Vite port 3000 |

### Thème actuel — point important
- **L'admin est déjà en light mode** (tokens `--color-saas-*`, fond `#f8fafc`, cartes blanches).
- **Le site public (`/website`) est en DARK mode** : palette "Midnight Velocity" (`--color-vel-*`, fond `#080C14`) + accents néon cyan `#22D3EE` / violet `#8B5CF6` codés en dur dans les composants `src/components/website/*`. La refonte light (Prompts 4+) devra remplacer cette palette et les nombreux styles inline.
- Pas de `next-themes` ni de stratégie `dark:` — le "dark" du site public est simplement sa palette par défaut.

## 2. Carte des routes

Routage React Router dans [src/App.tsx](src/App.tsx) — toutes les routes rendent le même `<App>` :

### PUBLIC (site vitrine client)
- **`/website`** → `Website` ([src/components/Website.tsx](src/components/Website.tsx)). Pas de sous-routes : navigation interne par état `currentPage`:
  - `home` → `website/Welcome.tsx` (hero animé, anneaux rotatifs, CTA)
  - `offers` → `website/OffersListing.tsx` (liste des voitures/offres)
  - `special` → `website/SpecialOffersListing.tsx` (promotions)
  - `orders` → `website/OrdersPage.tsx` (**le flux de réservation**)
  - `contacts` → `website/ContactsWebsite.tsx`
  - Écran de remerciement : `website/ThankYouPage.tsx` (overlay plein écran, auto-retour après 10 s)
  - Détails voiture : `website/CarDetailsModal.tsx`

### ADMIN (gestion, protégé par login Supabase + sessionService)
`/login`, puis routes protégées rendues par `DashboardLayout` (sidebar → switch sur `activeTab`) :
- `/dashboard` → DashboardPage · `/planificateur` → PlannerPage · `/vehicules` → **CarsPage** · `/maintenance` → MaintenancePage · `/clients` → ClientsPage · `/agences` → AgenciesPage · `/equipe` → EquipePage · `/depenses` → ExpensesPage · `/gains-vehicule` → CarGainsPage · `/reservations` → ReservationsPage · `/rapports` → ReportsPage · `/configuration` → ConfigPage
- **`/website-management`** → `WebsiteManagementPage` (**c'est ici que les offres sont créées**)
- `/website-commandes` → `WebsiteOrders` (commandes venant du site public)

## 3. Modèles de données (définis dans [src/types.ts](src/types.ts))

### Car (voiture) — `types.ts:21`
`id, brand, model, registration, year, color, vin, energy, transmission, seats, doors, priceDay, priceWeek, priceMonth, deposit, images[], mileage, fuelLevel?, status?`
- `status` est **dérivé** des réservations (`disponible | reserve | louer | maintenance`) ; seul `maintenance` est stocké en base.
- Table Supabase `cars` : colonnes snake_case (`plate_number`, `price_per_day`, `price_week`, `price_month`, `image_url` — **une seule image**, mappée vers `images[0]`). Mapping : `DatabaseService.mapDbCar()` ([src/services/DatabaseService.ts:9](src/services/DatabaseService.ts#L9)).
- **Aucun champ de visibilité site** (`isHiddenFromSite` n'existe pas encore → à ajouter au Prompt 1).

### Offer (offre ordinaire) — `types.ts:236`
`id, carId, car (joint), price, note?, createdAt` — table `offers`. C'est une simple référence voiture + prix affiché.

### SpecialOffer (offre spéciale) — `types.ts:245`
`id, carId, car (joint), oldPrice, newPrice, note?, isActive, createdAt` — table `special_offers`. `isActive` sert déjà de toggle (via `toggleSpecialOfferStatus`). **Pas de dates de début/fin, pas de champ "masqué du site" distinct.**

### Reservation — deux formes
- `Reservation` / `WebsiteOrder` (`types.ts:225` / `types.ts:430`) : enveloppes UI avec `step1` (dates/agences), `step2` (infos client), `step3.additionalServices`, `totalDays`, `totalPrice`, `status`.
- `ReservationDetails` (`types.ts:345`) : la forme complète admin (client joint, inspections, paiements, remise, TVA…).
- **Une seule table Supabase `reservations`** pour tout : commandes du site publiques (status `pending`) ET réservations admin. Colonnes clés : `client_id, car_id, departure_date/time, departure_agency_id, return_date/time, return_agency_id, price_per_day, total_days, total_price, deposit, discount_*, advance_payment, remaining_payment, status, notes, caution_*, assurance_*, created_by*`.
- Statuts observés : `pending → accepted → confirmed → active → completed / cancelled`.

### Agency (agence) — `types.ts:71`
`id, name, address, city, createdAt?` — table `agencies` (CRUD dans DatabaseService).

### Service — pas d'interface dédiée (traité en `any` + `AdditionalService` `types.ts:336`)
Table `services` : `id, category ('decoration'|'equipment'|'insurance'|'service'), service_name → name, description, price, is_active`. Lecture : `DatabaseService.getServices()` ([DatabaseService.ts:1758](src/services/DatabaseService.ts#L1758)) — filtre `is_active = true`.

### Autres tables Supabase
`clients, workers (+ worker_advances/absences/payments), store_expenses, vehicle_expenses, maintenance_alerts, payments, vehicle_inspections, inspection_checklist_items, inspection_responses, website_contacts, website_settings, agency_settings`.

## 4. Couche de données

- **Source unique : Supabase** (`src/supabase.ts` crée le client ; `supabaseConfigured` affiche un avertissement si les env vars manquent).
- Deux façades service :
  - [src/services/DatabaseService.ts](src/services/DatabaseService.ts) (~1865 lignes) : CRUD voitures, clients, agences, workers, dépenses, alertes, **offres (`getOffers/createOffer/updateOffer/deleteOffer`)**, **offres spéciales (`getSpecialOffers/createSpecialOffer/updateSpecialOffer/toggleSpecialOfferStatus/deleteSpecialOffer`)**, commandes site (`getWebsiteOrders/createWebsiteOrder/...` → table `reservations`), services, contacts/settings site.
  - [src/services/ReservationsService.ts](src/services/ReservationsService.ts) (~1230 lignes) : cycle de vie complet des réservations (`createReservation` ligne 10, activation/complétion avec inspections, paiements, services d'une réservation via `updateReservationServices`).
- Disponibilité voitures :
  - `getCarsWithRealStatus(referenceDate?)` ([DatabaseService.ts:58](src/services/DatabaseService.ts#L58)) : statut réel calculé depuis les réservations `active/confirmed/pending`.
  - `getAvailableCars(departureDate?, returnDate?)` ([DatabaseService.ts:100](src/services/DatabaseService.ts#L100)) : exclut les chevauchements de période — **base idéale pour les dates bloquées du calendrier (Prompt 2)**.
  - `getReservedCarsForPeriod` ([DatabaseService.ts:136](src/services/DatabaseService.ts#L136)).
- **State management : React state local uniquement** (useState/useEffect + props drilling depuis `App.tsx`). Pas de Zustand/Redux/React Query. `App.tsx` charge cars/offers/specialOffers/contacts/settings/agencies au mount et les passe à `Website`. Fallback sur des données mock si la base est vide/inaccessible.
- **Aucune librairie calendrier/date-picker installée** — les dates sont des `<input type="date">` natifs. (Prompt 2 : prévoir `react-day-picker`.)

## 5. Flux "créer une offre" actuel (à démonter au Prompt 1)

Tout est dans [src/components/WebsiteManagementPage.tsx](src/components/WebsiteManagementPage.tsx) (onglet admin "Gestion Site Web") :
- Bouton "➕ Nouvelle offre" (ligne ~494) → formulaire inline (lignes ~575-720) : choix d'une voiture existante, **prix saisi manuellement**, note → `DatabaseService.createOffer` (ligne 113 → [DatabaseService.ts:1154](src/services/DatabaseService.ts#L1154), table `offers`).
- Bouton "⭐ Nouvelle offre spéciale" (lignes ~874-1037) : voiture + `oldPrice`/`newPrice` + note → `DatabaseService.createSpecialOffer` (ligne 192 → [DatabaseService.ts:1299](src/services/DatabaseService.ts#L1299), table `special_offers`). Toggle actif/inactif déjà présent (`toggleSpecialOfferStatus`).
- Côté public, `OffersListing` affiche `offers` (fallback : les 6 premières voitures si la table est vide) ; `SpecialOffersListing` affiche les `special_offers` actives.
- **Il n'y a pas de notion de "voiture masquée du site"** : aujourd'hui une voiture apparaît sur le site si une offre la référence (ou via le fallback).

## 6. Cartes voiture & listes

- **Admin** : [src/components/CarCard.tsx](src/components/CarCard.tsx) — carte riche (statut dérivé, actions Détails/Edit/Historique/Dépenses/Rapports/Supprimer, toggle maintenance). Rendue par [src/components/CarsPage.tsx:465](src/components/CarsPage.tsx#L465) en grille `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4`. `CarsList.tsx` = variante liste. `CarDetailsModal.tsx` (admin) et `website/CarDetailsModal.tsx` (public) sont deux modales distinctes.
- **Public** : la "carte" est codée **inline** dans `OffersListing.tsx` (lignes 52-157) et `SpecialOffersListing.tsx` — grille `grid-cols-1 md:grid-cols-2 lg:grid-cols-3` ⇒ **1 seule carte par écran sur téléphone** (le problème visé par le Prompt 3). Grandes cartes : image h-56, pills specs, bloc prix (uniquement `priceDay`), boutons "Détails" + "Réserver". Pas de carte partagée entre admin et public.

## 7. Flux de réservation public actuel (à réécrire au Prompt 2)

Fichier : [src/components/website/OrdersPage.tsx](src/components/website/OrdersPage.tsx) (1166 lignes, monolithique).
- Entrées : bouton "Réserver" d'une carte (`Website.handleReserveClick` → `selectedCar` → étape `step1`) ou onglet "Commander" (étape `search` : barre de recherche + grille de voitures issues des offres/offres spéciales actives, fallback toutes les voitures).
- Étapes actuelles (état local `currentStep`) : `search → step1 → step2 → step3 → step4`, stepper visuel 4 étapes (Réservation / Informations / Services / Tarifs) :
  1. **step1** — dates + heures départ/retour (`<input type="date/time">` natifs, **aucun blocage des dates déjà réservées**, seulement min=aujourd'hui), agence de départ `<select>`, case "agence de retour différente" (`differentReturnAgency`) qui révèle un second select. Validation `isStep1Valid` (OrdersPage.tsx:263).
  2. **step2** — infos personnelles complètes (photo de profil + documents scannés uploadés vers Supabase Storage via `uploadClientImage.ts`, nom/prénom/tél/email, permis, doc additionnel, wilaya parmi `ALGERIAN_WILAYAS`, adresse). Validation `isStep2Valid` (ligne 268).
  3. **step3** — services additionnels (checkbox/cartes depuis `DatabaseService.getServices()`), optionnels, ajoutés au total.
  4. **step4** — récapitulatif tarifs + `advancePercentage` + notes.
- Soumission `handleConfirmReservation` (OrdersPage.tsx:281) : crée le **client** (`DatabaseService.createClient`) puis la **réservation** (`ReservationsService.createReservation`, `status: 'pending'`) puis lie les services (`updateReservationServices`). Prix = `priceDay × jours` + services (pas de tarif semaine/mois, pas de remise offre spéciale appliquée). Garde anti double-submit via `isSubmitting`.
- Succès → `ThankYouPage` (overlay dark, retour auto 10 s). Erreur → `alert()`.
- Les commandes apparaissent ensuite côté admin dans `WebsiteOrders` (`getWebsiteOrders` filtre `status in (pending, accepted)`).

## 8. Points d'attention pour les prompts suivants

1. **Palette public = dark codée en dur** (styles inline `#22D3EE`, `#050B18`…) dans tous les fichiers `website/*` → la refonte light demandera de toucher chaque composant, pas seulement les tokens.
2. `motion` (pas `framer-motion`) est la lib d'animation — importer depuis `motion/react`.
3. Alias `@/` pointe sur la **racine** (pas `src/`) — les composants shadcn générés devront en tenir compte (`@/components/ui/...` = `<racine>/components/ui/`, ou ajuster l'alias).
4. Une voiture n'a qu'**une** image en base (`image_url`), le type expose `images[]`.
5. Le fallback mock dans `App.tsx` masque les erreurs de chargement — attention en debug.
6. Les montants sont en **DZD** (DA), langue FR/AR avec support RTL (`lang`), garder les deux.
7. `getAvailableCars`/`getReservedCarsForPeriod` fournissent déjà la logique de chevauchement pour le futur calendrier à dates bloquées.
8. Skill design : `~/.claude/skills/ui-ux-pro-max/scripts/search.py` (chemin **global**, réparé — utiliser `python`, pas `python3`, sous Windows).
9. **Bug pré-existant (non corrigé, hors périmètre Prompt 0)** : [src/components/DocumentTemplateEditor.tsx:893](src/components/DocumentTemplateEditor.tsx#L893) a une erreur de syntaxe (`}` en trop, introduite par le commit `4505c53`). `npx tsc --noEmit` échoue sur ce seul fichier. L'app compile quand même car son unique importeur, `BillingPage.tsx`, est du **code mort** (jamais importé). À corriger ou supprimer lors d'un prompt ultérieur. Vérifié : `npm run build` passe (✓ 5.6 s, bundle 2.7 MB — code-splitting recommandé plus tard).
