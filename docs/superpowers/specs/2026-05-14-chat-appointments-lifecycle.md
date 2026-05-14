# Chat — Rendez-vous, lifecycle, notifications

**Date** : 2026-05-14
**Statut** : Spec validée, en cours d'implémentation
**Demandé par** : doums6236

## Règles métier

1. **Initiation par le recruteur uniquement**
   - Seul un recruteur peut créer une conversation
   - Le recruteur initie la conversation parce qu'il s'est intéressé au profil d'un candidat qui a postulé
   - Le candidat ne peut pas DM un recruteur de son propre chef

2. **Lifecycle de la conversation**
   - `status: 'active' | 'closed'`
   - Une conversation est `active` par défaut
   - **Seul le recruteur** peut la fermer (`closed`)
   - Quand fermée :
     - Le candidat **NE peut PLUS écrire** (le composer est désactivé)
     - Le recruteur PEUT toujours écrire
     - Bannière visible : "Le recruteur a clôturé la discussion"
   - Le recruteur peut **réouvrir** une conversation fermée (`active` à nouveau)

3. **Messages structurés — Proposition de rendez-vous**
   - Le recruteur peut proposer un rendez-vous avec :
     - Date + heure (datetime)
     - Lieu (optionnel : ville/adresse OU mode virtuel : Zoom/Meet/Téléphone)
     - Durée prévue (optionnel, défaut 30 min)
     - Note libre
   - Le candidat peut **Confirmer** ou **Décliner** (avec une raison optionnelle)
   - Le recruteur reçoit la confirmation/décline en message système

4. **Rappels de rendez-vous (notifications)**
   - Quand un rendez-vous est confirmé, l'app schedule une notification locale :
     - **24h avant** : "Rendez-vous demain à 14h chez Orange Guinée"
     - **1h avant** : "Rendez-vous dans 1h"
   - Si le rendez-vous est annulé ou la conversation fermée, les notifs sont annulées
   - Push pour nouveau message : à venir en Plan 4F (besoin EAS Build + FCM)

5. **Notifications push (différé Plan 4F)**
   - Nouveau message reçu (si app fermée)
   - Nouveau rendez-vous proposé
   - Confirmation/décline d'un rendez-vous
   - Conversation fermée/réouverte

## Schéma DB — ajouts

```prisma
enum ConversationStatus {
  active
  closed
}

enum MessageType {
  text
  appointment_proposal
  appointment_confirmed
  appointment_declined
  system  // pour "conversation fermée/réouverte"
}

model Conversation {
  // existing fields...
  status         ConversationStatus @default(active)
  closedAt       DateTime?           @map("closed_at")
  closedByUserId String?             @map("closed_by_user_id")
  // initiation: candidateUserId est forcément un user candidat, recruiterUserId un recruteur
}

model Message {
  // existing fields...
  type     MessageType @default(text)
  metadata Json?       // pour appointment: { datetime, location, durationMin, note, status?, declineReason? }
}
```

## Endpoints REST

| Méthode | Route | Rôle | Effet |
|---------|-------|------|-------|
| POST | `/chat/conversations` | recruiter | Crée la conv (existant, restriction ajoutée) |
| POST | `/chat/conversations/:id/close` | recruiter | `status=closed`, message system, annule notifs |
| POST | `/chat/conversations/:id/reopen` | recruiter | `status=active`, message system |
| POST | `/chat/conversations/:id/appointment` | recruiter | crée Message type=appointment_proposal avec metadata |
| POST | `/chat/messages/:id/confirm-appointment` | candidate | crée message appointment_confirmed, retour metadata |
| POST | `/chat/messages/:id/decline-appointment` | candidate | crée message appointment_declined, optionnel raison |

## WebSocket events (en plus des existants)

- `conversation:closed` — broadcast aux 2 participants
- `conversation:reopened`
- `appointment:proposed`
- `appointment:confirmed`
- `appointment:declined`

## Mobile — composants nouveaux

- **AppointmentCard** : carte spéciale dans le thread chat. Affiche date, lieu, durée, boutons Confirmer/Décliner si pending. Tag "Confirmé ✓" ou "Décliné ✗" si statut connu.
- **ClosedBanner** : bannière en haut du chat quand status=closed. Affiche "Le recruteur a clôturé la discussion" + date.
- **DisabledComposer** : remplace le TextInput par un message "Tu ne peux plus écrire dans cette conversation" quand status=closed et que l'utilisateur est candidat.

## Notifications locales

- Lib : `expo-notifications`
- API : `Notifications.scheduleNotificationAsync({ trigger: { date: ... }, content: {...} })`
- IDs stockés en local (AsyncStorage ou SecureStore) pour pouvoir annuler avec `cancelScheduledNotificationAsync` si rendez-vous annulé.

## Push notifications (Plan 4F — différé)

- Lib backend : Firebase Admin SDK ou directement HTTP/2 vers FCM
- Lib mobile : `expo-notifications` (Expo Push Service) OU FCM direct
- Token : enregistrer le push token de chaque user dans `User.pushToken`
- Trigger : à chaque création de message via le `ChatService.sendMessage`, envoyer aux recipients hors ligne
