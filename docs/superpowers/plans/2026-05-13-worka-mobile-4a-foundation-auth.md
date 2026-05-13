# Worka Mobile 4A — Foundation + Auth Implementation Plan

> **For agentic workers:** Use this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Scaffold the Expo app inside `apps/mobile`, set up navigation, the design system theme, a JWT-aware API client, and the splash/login/OTP screens. End state: a user can open the app on Expo Go, enter their phone, receive the OTP from staging logs, validate it, and reach a placeholder "Home" screen — fully authenticated against the live Railway backend.

**Architecture:**
- Expo SDK 51+ managed workflow, TypeScript strict
- React Navigation 6 (native-stack as root, bottom tabs added in 4B)
- TanStack Query for server state, JWT in expo-secure-store, auth state in a Zustand store
- Theme tokens from `docs/design/mobile-design-v8-improvements.md` exported in `src/theme.ts`
- API client targets `https://workaapi-production.up.railway.app/api/v1` by default

**Tech Stack:** Expo SDK 51, React Native 0.74, TypeScript 5, React Navigation 6, TanStack Query 5, Zustand, expo-secure-store, expo-font (Sora), zod, react-hook-form.

**Prereq:** Backend MVP live (https://workaapi-production.up.railway.app/api/v1/health → ok).

---

## File structure

```
apps/mobile/
├── app.json                  Expo config (name, icon, splash, plugins)
├── package.json
├── tsconfig.json
├── babel.config.js
├── App.tsx                   Root + providers (QueryClient, AuthGate)
├── index.ts                  registerRootComponent
├── src/
│   ├── theme.ts              Design tokens (colors, fonts, radius...)
│   ├── api/
│   │   ├── client.ts         fetch wrapper with auth interceptor + base URL
│   │   ├── endpoints.ts      typed endpoint functions (sendOtp, verifyOtp, me)
│   │   └── types.ts          DTOs mirroring backend
│   ├── stores/
│   │   └── auth.ts           Zustand store: tokens, user, loading flags
│   ├── lib/
│   │   ├── secure-storage.ts wrapper around expo-secure-store for tokens
│   │   └── hooks/
│   │       ├── useAuth.ts
│   │       └── useMe.ts
│   ├── navigation/
│   │   ├── RootNavigator.tsx switch Auth vs App stacks based on token
│   │   ├── AuthStack.tsx     Splash → Login → Otp
│   │   └── AppStack.tsx      placeholder Home screen (replaced in 4B)
│   └── screens/
│       ├── SplashScreen.tsx
│       ├── LoginScreen.tsx
│       ├── OtpScreen.tsx
│       └── HomePlaceholderScreen.tsx
└── assets/
    └── fonts/                Sora .ttf files (downloaded by expo-font)
```

---

## Task 1 — Scaffold Expo + TS strict

**Files**: `apps/mobile/{package.json,tsconfig.json,babel.config.js,app.json,App.tsx,index.ts}`

- [ ] Step 1: From repo root, run `pnpm create expo-app apps/mobile --template blank-typescript`
- [ ] Step 2: Add to `apps/mobile/tsconfig.json`:
```json
{
  "extends": "expo/tsconfig.base",
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "forceConsistentCasingInFileNames": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"]
    }
  }
}
```
- [ ] Step 3: Patch root `package.json` scripts:
```json
"mobile:start": "pnpm --filter worka-mobile start",
"mobile:android": "pnpm --filter worka-mobile android",
"mobile:ios": "pnpm --filter worka-mobile ios"
```
- [ ] Step 4: Rename `apps/mobile/package.json` `name` field to `worka-mobile`
- [ ] Step 5: Install runtime deps:
```powershell
pnpm --filter worka-mobile add @react-navigation/native @react-navigation/native-stack react-native-screens react-native-safe-area-context @tanstack/react-query expo-secure-store expo-font @expo-google-fonts/sora zustand zod react-hook-form react-native-gesture-handler react-native-reanimated lucide-react-native
```
- [ ] Step 6: Verify `pnpm mobile:start` boots and the default Expo screen shows up on Expo Go (scan QR with phone). Then stop.

---

## Task 2 — Theme tokens + Sora fonts

**Files**: `apps/mobile/src/theme.ts`, `apps/mobile/App.tsx`

- [ ] Step 1: Create `apps/mobile/src/theme.ts` with the tokens from `docs/design/mobile-design-v8-improvements.md`:
```typescript
export const theme = {
  colors: {
    primary: '#1A6FFF',
    primaryDark: '#0038C4',
    primaryLight: '#4A90FF',
    bg: '#F4F7FF',
    surface: '#FFFFFF',
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
  radius: { sm: 8, md: 14, lg: 18, xl: 28, full: 9999 },
  spacing: { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 },
  durations: { fast: 150, base: 200, slow: 300 },
} as const;

export type Theme = typeof theme;
```
- [ ] Step 2: Modify `App.tsx` to load Sora before showing the app:
```tsx
import { useFonts, Sora_300Light, Sora_400Regular, Sora_500Medium, Sora_600SemiBold, Sora_700Bold, Sora_800ExtraBold } from '@expo-google-fonts/sora';
import { View, ActivityIndicator } from 'react-native';
import { theme } from './src/theme';

export default function App() {
  const [loaded] = useFonts({ Sora_300Light, Sora_400Regular, Sora_500Medium, Sora_600SemiBold, Sora_700Bold, Sora_800ExtraBold });
  if (!loaded) {
    return <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.colors.bg }}><ActivityIndicator color={theme.colors.primary} /></View>;
  }
  return <View style={{ flex: 1, backgroundColor: theme.colors.bg, justifyContent: 'center', alignItems: 'center' }}><Text style={{ fontFamily: theme.fonts.bold, fontSize: 32 }}>Worka</Text></View>;
}
```
- [ ] Step 3: Verify fonts load in Expo Go. The word "Worka" should display in Sora Bold.

---

## Task 3 — Secure storage + Auth Zustand store

**Files**: `apps/mobile/src/lib/secure-storage.ts`, `apps/mobile/src/stores/auth.ts`

- [ ] Step 1: `apps/mobile/src/lib/secure-storage.ts`:
```typescript
import * as SecureStore from 'expo-secure-store';

const ACCESS_KEY = 'worka.accessToken';
const REFRESH_KEY = 'worka.refreshToken';

export const tokenStorage = {
  async setTokens(access: string, refresh: string) {
    await SecureStore.setItemAsync(ACCESS_KEY, access);
    await SecureStore.setItemAsync(REFRESH_KEY, refresh);
  },
  async getAccess() {
    return SecureStore.getItemAsync(ACCESS_KEY);
  },
  async getRefresh() {
    return SecureStore.getItemAsync(REFRESH_KEY);
  },
  async clear() {
    await SecureStore.deleteItemAsync(ACCESS_KEY);
    await SecureStore.deleteItemAsync(REFRESH_KEY);
  },
};
```
- [ ] Step 2: `apps/mobile/src/stores/auth.ts`:
```typescript
import { create } from 'zustand';
import { tokenStorage } from '../lib/secure-storage';

interface User {
  id: string;
  phone: string;
  role: 'candidate' | 'recruiter' | 'admin';
  status: string;
  countryCode?: string;
}

interface AuthState {
  user: User | null;
  hydrated: boolean;
  setUser: (u: User | null) => void;
  setTokens: (access: string, refresh: string) => Promise<void>;
  signOut: () => Promise<void>;
  hydrate: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  hydrated: false,
  setUser: (user) => set({ user }),
  setTokens: async (access, refresh) => {
    await tokenStorage.setTokens(access, refresh);
  },
  signOut: async () => {
    await tokenStorage.clear();
    set({ user: null });
  },
  hydrate: async () => {
    const access = await tokenStorage.getAccess();
    set({ hydrated: true, user: access ? { id: '', phone: '', role: 'candidate', status: 'active' } : null });
  },
}));
```

---

## Task 4 — API client

**Files**: `apps/mobile/src/api/{client.ts,endpoints.ts,types.ts}`

- [ ] Step 1: `apps/mobile/src/api/types.ts`:
```typescript
export interface SendOtpResponse { phone: string }
export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: { id: string; phone: string; role: 'candidate' | 'recruiter' | 'admin'; status: string };
}
export interface MeResponse {
  id: string;
  phone: string;
  role: 'candidate' | 'recruiter' | 'admin';
  status: string;
  countryCode?: string | null;
  createdAt: string;
  updatedAt: string;
  lastSeenAt?: string | null;
}
```
- [ ] Step 2: `apps/mobile/src/api/client.ts`:
```typescript
import { tokenStorage } from '../lib/secure-storage';

const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'https://workaapi-production.up.railway.app/api/v1';

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  body?: unknown;
  auth?: boolean;
  signal?: AbortSignal;
}

class ApiError extends Error {
  status: number;
  body: unknown;
  constructor(status: number, body: unknown, message: string) {
    super(message);
    this.status = status;
    this.body = body;
  }
}

async function request<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, auth = true, signal } = opts;
  const headers: Record<string, string> = { 'Content-Type': 'application/json', Accept: 'application/json' };

  if (auth) {
    const token = await tokenStorage.getAccess();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
    signal,
  });

  if (!res.ok) {
    const errBody = await res.json().catch(() => null);
    throw new ApiError(res.status, errBody, errBody?.error ?? `HTTP ${res.status}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export const api = { request, BASE_URL };
export { ApiError };
```
- [ ] Step 3: `apps/mobile/src/api/endpoints.ts`:
```typescript
import { api } from './client';
import type { SendOtpResponse, AuthResponse, MeResponse } from './types';

export const authApi = {
  sendOtp: (phone: string) => api.request<SendOtpResponse>('/auth/send-otp', { method: 'POST', body: { phone }, auth: false }),
  verifyOtp: (phone: string, code: string) => api.request<AuthResponse>('/auth/verify-otp', { method: 'POST', body: { phone, code }, auth: false }),
  refresh: (refreshToken: string) => api.request<{ accessToken: string; refreshToken: string }>('/auth/refresh', { method: 'POST', body: { refreshToken }, auth: false }),
};

export const meApi = {
  get: () => api.request<MeResponse>('/me'),
};
```

---

## Task 5 — TanStack Query provider

**Files**: `apps/mobile/App.tsx`

- [ ] Step 1: Wrap the app with QueryClientProvider:
```tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 30_000 } },
});

export default function App() {
  const [loaded] = useFonts({ /* ... */ });
  if (!loaded) return /* loader */;
  return (
    <QueryClientProvider client={queryClient}>
      <RootNavigator />
    </QueryClientProvider>
  );
}
```
(RootNavigator added in next task.)

---

## Task 6 — Navigation (Auth vs App stacks)

**Files**: `apps/mobile/src/navigation/{RootNavigator.tsx,AuthStack.tsx,AppStack.tsx}`

- [ ] Step 1: `RootNavigator.tsx` decides which stack based on auth state:
```tsx
import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { useAuthStore } from '../stores/auth';
import { AuthStack } from './AuthStack';
import { AppStack } from './AppStack';
import { View, ActivityIndicator } from 'react-native';
import { theme } from '../theme';

export function RootNavigator() {
  const { user, hydrated, hydrate } = useAuthStore();
  useEffect(() => { hydrate(); }, [hydrate]);

  if (!hydrated) {
    return <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.colors.bg }}><ActivityIndicator color={theme.colors.primary} /></View>;
  }
  return <NavigationContainer>{user ? <AppStack /> : <AuthStack />}</NavigationContainer>;
}
```
- [ ] Step 2: `AuthStack.tsx`:
```tsx
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SplashScreen } from '../screens/SplashScreen';
import { LoginScreen } from '../screens/LoginScreen';
import { OtpScreen } from '../screens/OtpScreen';

export type AuthStackParamList = {
  Splash: undefined;
  Login: undefined;
  Otp: { phone: string };
};

const Stack = createNativeStackNavigator<AuthStackParamList>();

export function AuthStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
      <Stack.Screen name="Splash" component={SplashScreen} />
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Otp" component={OtpScreen} />
    </Stack.Navigator>
  );
}
```
- [ ] Step 3: `AppStack.tsx` (placeholder for 4A, will be replaced by tabs in 4B):
```tsx
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { HomePlaceholderScreen } from '../screens/HomePlaceholderScreen';

const Stack = createNativeStackNavigator();

export function AppStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Home" component={HomePlaceholderScreen} />
    </Stack.Navigator>
  );
}
```

---

## Task 7 — SplashScreen

**Files**: `apps/mobile/src/screens/SplashScreen.tsx`

Replicates the prototype's splash (animated orbs, gradient logo, Worka wordmark, dots loader, then auto-navigates to Login after 1.5s).

- [ ] Step 1: Implement (key bits — full styling mirrors the HTML prototype):
```tsx
import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { theme } from '../theme';
import { AuthStackParamList } from '../navigation/AuthStack';

export function SplashScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<AuthStackParamList>>();

  useEffect(() => {
    const id = setTimeout(() => navigation.replace('Login'), 1500);
    return () => clearTimeout(id);
  }, [navigation]);

  return (
    <View style={styles.root}>
      <View style={styles.iconBox}>
        <Text style={styles.iconText}>W</Text>
      </View>
      <Text style={styles.wordmark}>Work<Text style={{ color: theme.colors.primary }}>a</Text></Text>
      <Text style={styles.tagline}>Trouve ton emploi en swipant</Text>
      <View style={styles.dots}>
        {[0, 1, 2].map((i) => <View key={i} style={styles.dot} />)}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#EEF3FF' },
  iconBox: { width: 96, height: 96, borderRadius: 30, backgroundColor: theme.colors.primary, alignItems: 'center', justifyContent: 'center', marginBottom: 16, shadowColor: theme.colors.primary, shadowOpacity: 0.35, shadowRadius: 20, shadowOffset: { width: 0, height: 8 }, elevation: 8 },
  iconText: { color: '#fff', fontFamily: theme.fonts.extrabold, fontSize: 48 },
  wordmark: { fontFamily: theme.fonts.extrabold, fontSize: 38, color: '#111' },
  tagline: { marginTop: 8, fontFamily: theme.fonts.medium, fontSize: 12, color: 'rgba(0,0,0,0.4)', letterSpacing: 2, textTransform: 'uppercase' },
  dots: { flexDirection: 'row', gap: 8, marginTop: 48 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: theme.colors.primary, opacity: 0.4 },
});
```
(Orb animations skipped in 4A for simplicity, will polish in 4F.)

---

## Task 8 — LoginScreen (phone input)

**Files**: `apps/mobile/src/screens/LoginScreen.tsx`

- [ ] Step 1: Hero gradient + form with phone input. Validation via Zod. Calls `authApi.sendOtp(phone)` then navigates to `Otp` screen with the phone.
- [ ] Step 2: Skeleton:
```tsx
import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { authApi } from '../api/endpoints';
import { ApiError } from '../api/client';
import { theme } from '../theme';
import { AuthStackParamList } from '../navigation/AuthStack';

export function LoginScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<AuthStackParamList>>();
  const [phone, setPhone] = useState('+224');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit() {
    setError(null);
    setLoading(true);
    try {
      const res = await authApi.sendOtp(phone.replace(/\s/g, ''));
      navigation.navigate('Otp', { phone: res.phone });
    } catch (e) {
      if (e instanceof ApiError && e.status === 429) setError('Trop de tentatives, attends quelques minutes');
      else setError(e instanceof Error ? e.message : 'Erreur réseau');
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.root}>
      <View style={styles.hero}>
        <Text style={styles.heroTitle}>Bienvenue sur{'\n'}<Text style={styles.heroTitleEm}>Worka</Text></Text>
        <Text style={styles.heroSub}>Trouve ton emploi en quelques swipes.</Text>
      </View>
      <View style={styles.body}>
        <Text style={styles.label}>Numéro de téléphone</Text>
        <TextInput
          style={styles.input}
          value={phone}
          onChangeText={setPhone}
          placeholder="+224 622 12 34 56"
          placeholderTextColor="#aaa"
          keyboardType="phone-pad"
          autoComplete="tel"
        />
        {error && <Text style={styles.error}>{error}</Text>}
        <TouchableOpacity style={[styles.btn, loading && { opacity: 0.6 }]} onPress={onSubmit} disabled={loading} activeOpacity={0.85}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Recevoir le code</Text>}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.colors.bg },
  hero: { height: 260, padding: 28, justifyContent: 'flex-end', backgroundColor: theme.colors.primaryDark },
  heroTitle: { color: '#fff', fontFamily: theme.fonts.extrabold, fontSize: 30, lineHeight: 33, letterSpacing: -1 },
  heroTitleEm: { color: 'rgba(255,255,255,0.85)' },
  heroSub: { marginTop: 6, color: 'rgba(255,255,255,0.7)', fontFamily: theme.fonts.medium, fontSize: 12 },
  body: { flex: 1, padding: 24 },
  label: { fontFamily: theme.fonts.bold, fontSize: 11, color: '#666', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8 },
  input: { backgroundColor: '#fff', borderWidth: 1.5, borderColor: theme.colors.border, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 13, fontSize: 14, fontFamily: theme.fonts.medium, color: '#111' },
  btn: { marginTop: 20, backgroundColor: theme.colors.primary, paddingVertical: 15, borderRadius: 16, alignItems: 'center' },
  btnText: { color: '#fff', fontFamily: theme.fonts.extrabold, fontSize: 15, letterSpacing: 0.3 },
  error: { color: theme.colors.danger, fontFamily: theme.fonts.semibold, fontSize: 11, textAlign: 'center', marginTop: 6 },
});
```

---

## Task 9 — OtpScreen (6-digit code)

**Files**: `apps/mobile/src/screens/OtpScreen.tsx`

- [ ] Step 1: 6 individual digit inputs with auto-focus chain. Validates against `authApi.verifyOtp(phone, code)`. On success, stores tokens, fetches /me, sets auth state → triggers AppStack swap.
```tsx
import React, { useState, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { RouteProp, useRoute } from '@react-navigation/native';
import { authApi, meApi } from '../api/endpoints';
import { useAuthStore } from '../stores/auth';
import { theme } from '../theme';
import { AuthStackParamList } from '../navigation/AuthStack';

export function OtpScreen() {
  const route = useRoute<RouteProp<AuthStackParamList, 'Otp'>>();
  const setUser = useAuthStore((s) => s.setUser);
  const setTokens = useAuthStore((s) => s.setTokens);
  const [digits, setDigits] = useState(['', '', '', '', '', '']);
  const inputs = useRef<(TextInput | null)[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function onChange(idx: number, value: string) {
    if (value.length > 1) value = value.slice(-1);
    if (!/^\d?$/.test(value)) return;
    const next = [...digits]; next[idx] = value; setDigits(next);
    if (value && idx < 5) inputs.current[idx + 1]?.focus();
    if (idx === 5 && value && next.every((d) => d)) onSubmit(next.join(''));
  }

  async function onSubmit(code: string) {
    setError(null); setLoading(true);
    try {
      const res = await authApi.verifyOtp(route.params.phone, code);
      await setTokens(res.accessToken, res.refreshToken);
      const me = await meApi.get();
      setUser({ id: me.id, phone: me.phone, role: me.role, status: me.status, countryCode: me.countryCode ?? undefined });
    } catch (e) {
      setError('Code invalide ou expiré');
      setDigits(['', '', '', '', '', '']);
      inputs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.root}>
      <Text style={styles.title}>Code reçu par SMS</Text>
      <Text style={styles.subtitle}>Entre les 6 chiffres envoyés au{'\n'}{route.params.phone}</Text>
      <View style={styles.digits}>
        {digits.map((d, i) => (
          <TextInput
            key={i}
            ref={(r) => { inputs.current[i] = r; }}
            value={d}
            onChangeText={(v) => onChange(i, v)}
            keyboardType="number-pad"
            maxLength={1}
            style={styles.digit}
          />
        ))}
      </View>
      {error && <Text style={styles.error}>{error}</Text>}
      {loading && <ActivityIndicator color={theme.colors.primary} style={{ marginTop: 16 }} />}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.colors.bg, padding: 24, paddingTop: 80 },
  title: { fontFamily: theme.fonts.extrabold, fontSize: 24, color: '#111', textAlign: 'center' },
  subtitle: { marginTop: 8, fontFamily: theme.fonts.medium, fontSize: 13, color: theme.colors.textSecondary, textAlign: 'center' },
  digits: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 32 },
  digit: { width: 48, height: 56, borderRadius: 14, borderWidth: 1.5, borderColor: theme.colors.border, backgroundColor: '#fff', textAlign: 'center', fontFamily: theme.fonts.bold, fontSize: 22, color: '#111' },
  error: { color: theme.colors.danger, fontFamily: theme.fonts.semibold, fontSize: 12, textAlign: 'center', marginTop: 16 },
});
```

---

## Task 10 — HomePlaceholderScreen + e2e test

**Files**: `apps/mobile/src/screens/HomePlaceholderScreen.tsx`

- [ ] Step 1: Minimal screen confirming auth works:
```tsx
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useAuthStore } from '../stores/auth';
import { theme } from '../theme';

export function HomePlaceholderScreen() {
  const { user, signOut } = useAuthStore();
  return (
    <View style={styles.root}>
      <Text style={styles.title}>👋 Connecté</Text>
      <Text style={styles.body}>id: {user?.id}</Text>
      <Text style={styles.body}>tél: {user?.phone}</Text>
      <Text style={styles.body}>rôle: {user?.role}</Text>
      <TouchableOpacity style={styles.btn} onPress={() => signOut()}>
        <Text style={styles.btnText}>Se déconnecter</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, padding: 24, paddingTop: 80, backgroundColor: theme.colors.bg },
  title: { fontFamily: theme.fonts.extrabold, fontSize: 28, color: '#111', marginBottom: 16 },
  body: { fontFamily: theme.fonts.medium, fontSize: 14, color: '#333', marginBottom: 4 },
  btn: { marginTop: 24, backgroundColor: theme.colors.danger, paddingVertical: 12, borderRadius: 14, alignItems: 'center' },
  btnText: { color: '#fff', fontFamily: theme.fonts.bold, fontSize: 14 },
});
```

- [ ] Step 2: Smoke test on Expo Go:
  1. `pnpm mobile:start` → scan QR with phone
  2. Splash → Login appears
  3. Enter `+224622123456` → "Recevoir le code"
  4. On Railway logs, copy the OTP code (look for `[MOCK SMS] to +224622123456: Your Worka code is XXXXXX`)
  5. Type the code into the 6 digit inputs
  6. Expect navigation to HomePlaceholder showing id, phone, role
  7. Tap "Se déconnecter" → return to Login

- [ ] Step 3: Commit:
```powershell
git add apps/mobile pnpm-lock.yaml package.json
git commit -m "feat(mobile): plan 4A — Expo scaffold + auth flow against staging"
git tag -a mobile-4a-auth-done -m "Mobile 4A: foundation + auth complete"
```

---

## Done criteria for Plan 4A

- `pnpm mobile:start` boots and renders Splash → Login on Expo Go
- Sora fonts render correctly
- `POST /auth/send-otp` succeeds on tap (OTP visible in Railway logs)
- 6-digit code entry on the second screen
- `POST /auth/verify-otp` returns tokens; tokens persist in expo-secure-store
- App restart keeps the user signed in (token rehydrated on boot)
- `GET /me` returns the user; HomePlaceholder displays it
- Sign-out clears tokens and bounces back to Login

Next: Plan 4B — Onboarding (intro splash + 3 domain selection + CV upload).
