'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowRight, ShieldAlert, Phone } from 'lucide-react';
import { Button, Card, Input } from '@/components/ui';
import { authApi, meApi } from '@/lib/endpoints';
import { tokens, ApiError } from '@/lib/api';
import { useAuth } from '@/lib/auth-store';

type Step = 'phone' | 'otp';

export default function LoginPage() {
  const router = useRouter();
  const params = useSearchParams();
  const setUser = useAuth((s) => s.setUser);

  const [step, setStep] = useState<Step>('phone');
  const [phone, setPhone] = useState('+224');
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const otpRefs = useRef<Array<HTMLInputElement | null>>([]);

  useEffect(() => {
    if (params.get('denied') === '1') {
      setError("Ton compte n'a pas le rôle administrateur.");
    }
  }, [params]);

  useEffect(() => {
    if (step === 'otp') {
      otpRefs.current[0]?.focus();
    }
  }, [step]);

  async function sendOtp() {
    setError(null);
    const cleaned = phone.replace(/\s/g, '');
    if (!cleaned.startsWith('+') || cleaned.length < 7) {
      setError('Numéro invalide (format E.164 : +224622123456)');
      return;
    }
    setLoading(true);
    try {
      const r = await authApi.sendOtp(cleaned);
      setPhone(r.phone);
      setStep('otp');
    } catch (e) {
      const msg =
        e instanceof ApiError && e.status === 429
          ? 'Trop de tentatives, attends quelques minutes'
          : e instanceof ApiError && e.status === 400
          ? 'Numéro invalide ou pays non supporté'
          : e instanceof Error
          ? e.message
          : 'Erreur réseau';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  async function verifyOtp(joined: string) {
    setError(null);
    setLoading(true);
    try {
      const auth = await authApi.verifyOtp(phone, joined);
      tokens.set(auth.accessToken, auth.refreshToken);
      const me = await meApi.get();
      if (me.role !== 'admin') {
        tokens.clear();
        setError("Ce compte n'a pas le rôle administrateur.");
        setStep('phone');
        setCode(['', '', '', '', '', '']);
        return;
      }
      setUser(me);
      router.replace('/dashboard');
    } catch (e) {
      const msg =
        e instanceof ApiError && e.status === 401
          ? 'Code invalide ou expiré'
          : e instanceof ApiError && e.status === 429
          ? 'Trop de tentatives, attends'
          : e instanceof Error
          ? e.message
          : 'Erreur réseau';
      setError(msg);
      setCode(['', '', '', '', '', '']);
      otpRefs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  }

  function onOtpChange(idx: number, raw: string) {
    let v = raw;
    if (v.length > 1) v = v.slice(-1);
    if (!/^\d?$/.test(v)) return;
    const next = [...code];
    next[idx] = v;
    setCode(next);
    if (v && idx < 5) otpRefs.current[idx + 1]?.focus();
    if (idx === 5 && v && next.every((d) => d)) {
      void verifyOtp(next.join(''));
    }
  }

  function onOtpKey(idx: number, k: string) {
    if (k === 'Backspace' && !code[idx] && idx > 0) otpRefs.current[idx - 1]?.focus();
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-primary-light via-primary to-primary-dark px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="inline-flex items-baseline tracking-tighter text-white">
            <span className="text-5xl font-extrabold">work</span>
            <span className="text-5xl font-extrabold bg-primary-light px-1.5 ml-0.5 rounded">
              a
            </span>
          </div>
          <p className="mt-3 text-white/90 font-semibold tracking-wide text-sm">
            Console d&apos;administration
          </p>
        </div>

        <Card className="p-7">
          {step === 'phone' ? (
            <>
              <h1 className="text-xl font-extrabold text-ink">Se connecter</h1>
              <p className="mt-1.5 text-sm text-ink-secondary">
                Saisis ton numéro admin pour recevoir un code à 6 chiffres.
              </p>

              <div className="mt-6 space-y-4">
                <Input
                  label="Numéro de téléphone"
                  type="tel"
                  inputMode="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+224 622 12 34 56"
                  autoComplete="tel"
                  autoFocus
                />

                {error && (
                  <div className="flex items-start gap-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-danger">
                    <ShieldAlert size={16} className="mt-0.5 shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                <Button
                  size="lg"
                  className="w-full"
                  onClick={sendOtp}
                  loading={loading}
                  iconRight={<ArrowRight size={18} strokeWidth={2.5} />}
                >
                  Recevoir le code par SMS
                </Button>
              </div>
            </>
          ) : (
            <>
              <button
                onClick={() => {
                  setStep('phone');
                  setError(null);
                  setCode(['', '', '', '', '', '']);
                }}
                className="text-sm font-bold text-primary hover:underline"
              >
                ← Changer de numéro
              </button>
              <h1 className="mt-2 text-xl font-extrabold text-ink">Code de vérification</h1>
              <p className="mt-1.5 text-sm text-ink-secondary">
                Code envoyé au <span className="font-bold text-ink">{phone}</span>
              </p>

              <div className="mt-6 flex justify-between gap-2">
                {code.map((d, i) => (
                  <input
                    key={i}
                    ref={(r) => {
                      otpRefs.current[i] = r;
                    }}
                    value={d}
                    onChange={(e) => onOtpChange(i, e.target.value)}
                    onKeyDown={(e) => onOtpKey(i, e.key)}
                    inputMode="numeric"
                    maxLength={1}
                    className={`h-14 w-12 rounded-xl border-2 text-center text-2xl font-extrabold outline-none transition-colors
                      ${d ? 'border-primary bg-surface-bgLight text-ink' : 'border-line bg-white text-ink'}
                      focus:border-primary`}
                  />
                ))}
              </div>

              {error && (
                <div className="mt-4 flex items-start gap-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-danger">
                  <ShieldAlert size={16} className="mt-0.5 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {loading && (
                <div className="mt-4 flex items-center justify-center gap-2 text-sm text-ink-secondary">
                  <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                  Vérification…
                </div>
              )}

              <button
                onClick={() => void authApi.sendOtp(phone).catch(() => null)}
                className="mt-5 w-full text-center text-sm font-bold text-primary hover:underline"
              >
                Renvoyer le code
              </button>
            </>
          )}
        </Card>

        <p className="mt-6 flex items-center justify-center gap-1.5 text-center text-xs text-white/85">
          <Phone size={12} />
          Authentification par SMS · Aucun mot de passe
        </p>
      </div>
    </div>
  );
}
