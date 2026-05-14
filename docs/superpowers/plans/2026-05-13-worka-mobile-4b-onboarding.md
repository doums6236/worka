# Worka Mobile 4B — Onboarding (Welcome + Domain selection + CV) Implementation Plan

> Builds on Plan 4A (foundation + auth).

**Goal:** After successful OTP login, force first-time users through onboarding — a 3-slide welcome carousel introducing Worka, then a 3-domain selection screen (Netflix-style grid), then an optional CV upload. The user lands on the placeholder Home only after onboarding completes.

**Architecture:**
- Add a `needsOnboarding` flag to the auth store (computed from whether the user has `userDomains.length === 3`).
- New `OnboardingStack` that sits between AuthStack and AppStack:
  - `Welcome` (paginated 3 slides)
  - `DomainSelection` (grid)
  - `CvUpload` (skippable)
- Existing endpoints: `GET /domains`, `GET /me/candidate-profile/domains`, `PUT /me/candidate-profile/domains`, `POST /me/candidate-profile/cv-upload-url`, `PATCH /me/candidate-profile/cv`.

**Prereq:** Plan 4A done + 12 domains inserted in Postgres (see admin SQL above).

---

## File structure (additions)

```
apps/mobile/src/
├── api/
│   ├── endpoints.ts             extend with domainsApi + candidateProfileApi
│   └── types.ts                 extend with Domain + CandidateProfile + UserDomain
├── lib/hooks/
│   ├── useDomains.ts            React Query: GET /domains
│   ├── useMyDomains.ts          React Query: GET /me/candidate-profile/domains
│   └── useSetMyDomains.ts       React Query mutation: PUT /me/candidate-profile/domains
├── navigation/
│   └── OnboardingStack.tsx      Welcome → DomainSelection → CvUpload
└── screens/onboarding/
    ├── WelcomeScreen.tsx        3 paginated intro slides
    ├── DomainSelectionScreen.tsx Netflix-style grid, pick 3
    └── CvUploadScreen.tsx       expo-document-picker → signed URL → PATCH
```

---

## Task 1 — Extend API types + endpoints

**Files**: `src/api/types.ts`, `src/api/endpoints.ts`

- [ ] Step 1: Append to `types.ts`:
```typescript
export interface Domain {
  id: string;
  nameFr: string;
  nameEn?: string | null;
  icon?: string | null;
  parentId?: string | null;
  createdAt: string;
}

export interface UserDomain {
  id: string;
  userId: string;
  domainId: string;
  priority: number;
  domain: Domain;
}

export interface CandidateProfile {
  id: string;
  userId: string;
  firstName?: string | null;
  lastName?: string | null;
  cvUrl?: string | null;
  summary?: string | null;
  location?: string | null;
  isPremium: boolean;
  premiumUntil?: string | null;
  aiCreditsRemaining: number;
  autoApplyEnabled: boolean;
  autoApplyMinMatchScore: number;
}

export interface SignedUploadUrl {
  uploadUrl: string;
  publicUrl: string;
}
```

- [ ] Step 2: Append to `endpoints.ts`:
```typescript
import type { Domain, UserDomain, CandidateProfile, SignedUploadUrl } from './types';

export const domainsApi = {
  list: () => api.request<Domain[]>('/domains'),
};

export const candidateProfileApi = {
  get: () => api.request<CandidateProfile>('/me/candidate-profile'),
  getDomains: () => api.request<UserDomain[]>('/me/candidate-profile/domains'),
  setDomains: (domainIds: string[]) =>
    api.request<UserDomain[]>('/me/candidate-profile/domains', {
      method: 'PUT',
      body: { domainIds },
    }),
  cvUploadUrl: () =>
    api.request<SignedUploadUrl>('/me/candidate-profile/cv-upload-url', { method: 'POST' }),
  setCvUrl: (cvUrl: string) =>
    api.request<CandidateProfile>('/me/candidate-profile/cv', {
      method: 'PATCH',
      body: { cvUrl },
    }),
};
```

---

## Task 2 — Add onboarding flag to auth store

**Files**: `src/stores/auth.ts`

- [ ] Step 1: Extend store to fetch user domains during hydrate and expose `needsOnboarding`.
```typescript
import { candidateProfileApi } from '../api/endpoints';

// inside the store interface:
needsOnboarding: boolean;

// inside hydrate():
const me = await meApi.get();
const userDomains = me.role === 'candidate'
  ? await candidateProfileApi.getDomains().catch(() => [])
  : [];
set({
  hydrated: true,
  user: { /* ... */ },
  needsOnboarding: me.role === 'candidate' && userDomains.length < 3,
});

// also after setUser (post verifyOtp):
const userDomains = await candidateProfileApi.getDomains().catch(() => []);
set({ user, needsOnboarding: userDomains.length < 3 });
```

---

## Task 3 — OnboardingStack + routing

**Files**: `src/navigation/OnboardingStack.tsx`, `src/navigation/RootNavigator.tsx`

- [ ] Step 1: Create OnboardingStack with three screens.
- [ ] Step 2: In RootNavigator switch logic:
```
!user             → AuthStack
user + needsOnboarding → OnboardingStack
user + !needsOnboarding → AppStack
```

---

## Task 4 — WelcomeScreen (3 paginated slides)

3 slides with FlatList horizontal + pagination dots. Last slide has CTA "Commencer →" that navigates to DomainSelection.

Slides content:
1. **"Trouve ton emploi en swipant"** — illustration card stack
2. **"L'IA t'aide à postuler"** — illustration robot + CV
3. **"Discute avec les recruteurs"** — illustration chat bubbles

---

## Task 5 — DomainSelectionScreen

- Header: "Choisis 3 domaines qui te passionnent" + counter `2/3`
- Body: 2-column grid of domain cards (emoji + name, selected state with primary border)
- Footer: Sticky button "Continuer (2/3)" — disabled until exactly 3 selected
- On confirm: `candidateProfileApi.setDomains([d1, d2, d3])` → navigate to CvUpload
- Uses `useDomains()` for the list, `useSetMyDomains()` for the mutation

---

## Task 6 — CvUploadScreen

- Title: "Upload ton CV (optionnel)"
- Body: large dashed dropzone "Tape pour choisir un PDF" (uses `expo-document-picker`)
- After file pick → call `cvUploadUrl()` → PUT the file blob to `uploadUrl` → call `setCvUrl(publicUrl)`
- Progress bar during upload
- Footer: "Plus tard" link + "Terminer" button
- On terminé: clear `needsOnboarding` flag → app renders AppStack

---

## Task 7 — Smoke test

1. Sign out from the device
2. Sign in fresh
3. Verify Welcome carousel renders + swipe through 3 slides
4. DomainSelection shows the 12 domains
5. Pick 3 → "Continuer" enables → tap → request PUT /me/candidate-profile/domains
6. CvUpload screen → tap "Plus tard"
7. Land on Home

Commit + tag `mobile-4b-onboarding-done`.
