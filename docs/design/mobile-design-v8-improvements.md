# Worka Mobile — Améliorations Design v8

Référence : prototype actuel `docs/prototypes/worka_mobile.html` (v7 blue).

Palette conservée :
- Primary : `#1A6FFF` (bleu Worka)
- Dark blue : `#0038C4`
- Light blue : `#4A90FF`
- Background : `#F4F7FF`
- Surface : `#FFFFFF`
- Success : `#00C47C`
- Warning : `#FFB800`
- Gold premium : `#F5A623`
- Font : **Sora** (300-800)

## 🎯 12 améliorations à intégrer

### 1. Onboarding wizard avec barre de progression

**Avant** : Login → Domaines (2 écrans, peu visuel)
**Après** : Wizard 4 étapes avec barre de progression en haut
```
●━━━━○━━━━○━━━━○
Tél    Code   Domaines   Profil
```
- Anime la barre lors du passage à l'étape suivante
- Possibilité de revenir en arrière (sauf après vérification OTP)
- Réduit l'abandon : l'utilisateur sait combien il reste

### 2. Match Score visuel (anneau de progression autour du logo)

**Avant** : pastille "94% match" en haut à gauche de la carte
**Après** : anneau circulaire autour du logo de l'entreprise
```
       ╭─────╮
      ╱  94%  ╲
     │  ┌───┐ │
     │  │ ⊕ │ │   ← logo
     │  └───┘ │
      ╲       ╱
       ╰─────╯
```
- Couleur de l'anneau varie : >85% vert, 60-85% bleu, <60% gris
- Rotation animée à l'arrivée de chaque nouvelle carte (effet "scanner")
- Plus impactant visuellement, moins de texte

### 3. Card stack avec profondeur visible

**Avant** : 1 seule carte visible
**Après** : 3 cartes en pile (la principale + 2 dessous, dépassant légèrement)
- Donne un effet de "deck of cards" comme Tinder/Bumble
- L'utilisateur voit qu'il y a du contenu derrière
- Lors du swipe, la carte du dessous se redimensionne pour devenir la principale (transition spring)

### 4. Skill chips interactives (tap to filter)

**Avant** : chips en lecture seule
**Après** : tap sur un chip = filtre instantanément le feed par cette skill
- Hint visuel : underline animé au tap
- Badge "Filtré par : Node.js [×]" en haut du feed
- Réduit la friction pour explorer des offres similaires

### 5. Status timeline sur les candidatures

**Avant** : badge texte (Pending, Viewed, Shortlisted, etc.)
**Après** : timeline horizontale avec étapes éclairées
```
○━━━━━━●━━━━━━○━━━━━━○━━━━━━○
Envoyée Vue   Shortlist Entretien Embauché
```
- Step active en bleu plein
- Steps futurs en gris
- Indicateur de date sous chaque étape complétée
- Visuellement engageant, donne un sentiment de progression

### 6. Activity banner sur la home

**Nouveau écran** : bandeau discret en haut du feed
```
┌─────────────────────────────────────────┐
│ 🔔  Orange Guinée a vu ton CV il y a 2h │
└─────────────────────────────────────────┘
```
- 3 types d'activité : CV vu, candidature shortlisted, nouvelle offre match >85%
- Tap → ouvre la conversation / l'offre
- Augmente l'engagement quotidien

### 7. Filtres avancés sur Explorer

**Avant** : Explorer est vide dans le prototype
**Après** : page de recherche avancée
- **Salaire** : slider bi-directionnel (min/max GNF)
- **Localisation** : ville + rayon (km)
- **Type contrat** : chips CDI / CDD / Stage / Freelance
- **Skills** : autocomplete avec ajout/suppression
- **Deadline** : "urgent (< 7j)" / "ce mois" / "tous"
- Bouton "Appliquer" sticky en bas avec count : `47 résultats →`

### 8. Auto-Apply control panel (Premium)

**Nouveau écran** dans Premium :
```
Auto-postuler intelligent (IA)        [○━━●]
─────────────────────────────────────────────
Seuil de match minimum                 [88%]
Domaines actifs :
  ✓ Tech             ✓ Finance
  ○ Santé            ○ Marketing
─────────────────────────────────────────────
Quota journalier : 12 / 20 applications
Vu cette semaine : 47 offres analysées
```
- Toggle on/off
- Slider pour ajuster le seuil
- Domaines à activer
- Compteur visible

### 9. Empty state designs

**Avant** : pas d'empty state visible
**Après** : design soigné pour :
- Aucune offre : illustration + "Reviens demain, on cherche pour toi" + bouton "Modifier mes domaines"
- Pas de candidature : illustration + "Swipe pour postuler" + bouton "Voir le feed"
- Pas de messages : illustration + "Pas encore de conversation" + lien "Comment ça marche ?"

### 10. Quick actions sur les cartes (long press)

**Nouveau geste** : long press sur une carte
→ menu radial avec 4 actions :
- Partager (génère un lien `/jobs/:id`)
- Signaler
- Voir entreprise (toutes les offres de cette boîte)
- Masquer entreprise (filtrer toutes leurs offres)

### 11. Haptic feedback

Vibrations courtes (50ms) sur :
- Swipe validation (right = pattern doux, left = pattern simple)
- Touch CTA principal
- Match Score qui dépasse 90%

Via `expo-haptics`. Désactivable dans Paramètres.

### 12. Toast notifications subtiles

**Avant** : pas de feedback après action
**Après** : toasts bleus en haut, 2 secondes
- "✓ Candidature envoyée à Orange Guinée"
- "★ Sauvegardée"
- "↩ Action annulée"

Animation slide-down/slide-up. Sans bloquer l'interface.

---

## 🆕 Nouvelles features (au-delà du prototype)

### A. **Quick Apply mode**
Mode "rafale" où l'utilisateur ne voit qu'une carte minimaliste (logo + titre + salaire) et swipe rapide. Utile en transport, pause café.

### B. **Smart suggestions chips**
Sous chaque carte, 3 chips de skills "Tu as ça ? Tap pour confirmer" → enrichit le profil au fur et à mesure.

### C. **Daily digest**
Notification push 8h du matin : "Bonne nouvelle, 5 offres parfaites pour toi t'attendent". Augmente la rétention.

### D. **Voice messages dans le chat**
Bouton micro à côté du clavier. Beaucoup utilisé en Guinée. `expo-av` pour record/play.

### E. **PDF preview du CV** dans le profil
L'utilisateur peut voir/télécharger son CV uploadé directement dans l'app. `expo-print` ou WebView.

### F. **Mode hors-ligne (lecture seule)**
Les 10 dernières cartes du feed cachées en local. Permet de swiper même sans connexion (les actions sont mises en queue). Critique en Guinée où la connexion est instable.

### G. **Référent**
Section "Mes recommandations" : un user peut référencer un job à un ami. Si l'ami est embauché, badge "ambassadeur" + crédits IA bonus.

### H. **Statistiques personnelles**
Sur le profil, dashboard :
- Nombre de candidatures
- Taux de réponse moyen
- Profession la plus demandée par les recruteurs sur ton profil
- Match score moyen de ton feed

### I. **Dark mode**
Le prototype actuel est light only. Ajouter un dark mode (préfère-couleurs) :
- Background `#0B0F1A` (même que l'admin)
- Surface `#111827`
- Texte `#F0F4FF`
- Primary reste `#1A6FFF`

---

## ⚙️ Bonnes pratiques UI/UX à respecter (de la skill)

- ✅ **Touch targets minimum 44×44px** (boutons d'action, chips)
- ✅ **Contraste texte 4.5:1 minimum** (vérifier sous-titres gris sur fond clair)
- ✅ **Pas d'emojis comme icônes UI** → utiliser SVG (lucide-react-native, react-native-vector-icons)
- ✅ **Animations 150-300ms** sur micro-interactions, easing standard
- ✅ **Respect de `prefers-reduced-motion`** (option dans Paramètres)
- ✅ **Skeleton screens** pendant les chargements (pas de spinners blancs)
- ✅ **Focus states** sur tous les inputs (border bleu, outline)
- ✅ **Pull-to-refresh** sur les listes (Candidatures, Messages, Feed)
- ✅ **Empty states** pour chaque liste vide
- ✅ **Error states** avec retry button

---

## 📦 Stack tech recommandée (React Native via Expo)

| Concern | Lib |
|---------|-----|
| Navigation | `@react-navigation/native-stack` + `@react-navigation/bottom-tabs` |
| Gestures + animations | `react-native-gesture-handler` + `react-native-reanimated` |
| Server state | `@tanstack/react-query` |
| Local state | `zustand` (léger, pas de boilerplate) |
| Forms | `react-hook-form` + `zod` |
| Storage sécurisé | `expo-secure-store` (JWT) |
| Storage standard | `@react-native-async-storage/async-storage` |
| WebSocket chat | `socket.io-client` |
| File picker (CV) | `expo-document-picker` |
| Camera (avatar) | `expo-image-picker` |
| Push notifications | `expo-notifications` + Firebase |
| Haptics | `expo-haptics` |
| Icons | `lucide-react-native` ou `@expo/vector-icons` |
| Charts (stats profil) | `react-native-svg` + composants custom |
| Voice messages | `expo-av` (record + play) |
| Pubs | `react-native-google-mobile-ads` (AdMob) |
| WebView (paiement CinetPay) | `react-native-webview` |

## 📐 Tokens du design system (à exporter en theme.ts)

```typescript
// theme.ts
export const theme = {
  colors: {
    primary: '#1A6FFF',
    primaryDark: '#0038C4',
    primaryLight: '#4A90FF',
    bg: '#F4F7FF',
    bgDark: '#0B0F1A', // dark mode
    surface: '#FFFFFF',
    surfaceDark: '#111827',
    text: '#111111',
    textSecondary: '#8A8A8A',
    border: '#E0E8FF',
    success: '#00C47C',
    warning: '#FFB800',
    danger: '#FF4040',
    premium: '#F5A623',
  },
  fonts: {
    light: 'Sora_300Light',
    regular: 'Sora_400Regular',
    medium: 'Sora_500Medium',
    semibold: 'Sora_600SemiBold',
    bold: 'Sora_700Bold',
    extrabold: 'Sora_800ExtraBold',
  },
  radius: {
    sm: 8,
    md: 14,
    lg: 18,
    xl: 28,
    full: 9999,
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
  },
  shadows: {
    sm: { shadowColor: '#1A6FFF', shadowOpacity: 0.08, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 2 },
    md: { shadowColor: '#1A6FFF', shadowOpacity: 0.12, shadowRadius: 16, shadowOffset: { width: 0, height: 8 }, elevation: 4 },
    lg: { shadowColor: '#1A6FFF', shadowOpacity: 0.16, shadowRadius: 24, shadowOffset: { width: 0, height: 12 }, elevation: 8 },
  },
  durations: {
    fast: 150,
    base: 200,
    slow: 300,
  },
};
```

Ce theme.ts sera la **source unique de vérité** pour le design dans toute l'app mobile. Toutes les couleurs, fonts, radius doivent venir de là — pas de valeur magique dans les composants.
