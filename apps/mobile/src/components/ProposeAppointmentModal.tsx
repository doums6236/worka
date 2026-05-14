import React, { useMemo, useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { X, Calendar, Clock, MapPin, FileText } from 'lucide-react-native';
import { theme } from '../theme';
import type { AppointmentMetadata } from '../api/types';

interface Props {
  visible: boolean;
  onClose: () => void;
  onSubmit: (data: AppointmentMetadata) => Promise<void>;
}

const DURATIONS = [15, 30, 45, 60, 90];

export function ProposeAppointmentModal({ visible, onClose, onSubmit }: Props) {
  const [dayOffset, setDayOffset] = useState(1);
  const [hour, setHour] = useState(10);
  const [minute, setMinute] = useState(0);
  const [duration, setDuration] = useState<number>(30);
  const [location, setLocation] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const datetime = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + dayOffset);
    d.setHours(hour, minute, 0, 0);
    return d;
  }, [dayOffset, hour, minute]);

  const days = useMemo(() => {
    const arr: { offset: number; label: string; sub: string }[] = [];
    for (let i = 0; i < 14; i++) {
      const d = new Date();
      d.setDate(d.getDate() + i);
      arr.push({
        offset: i,
        label:
          i === 0
            ? "Aujourd'hui"
            : i === 1
            ? 'Demain'
            : capitalize(
                d.toLocaleDateString('fr-FR', { weekday: 'short' }),
              ),
        sub: d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }),
      });
    }
    return arr;
  }, []);

  async function submit() {
    setError(null);
    if (datetime.getTime() <= Date.now() + 5 * 60_000) {
      setError('Le rendez-vous doit être au moins 5 minutes dans le futur');
      return;
    }
    setBusy(true);
    try {
      await onSubmit({
        datetime: datetime.toISOString(),
        durationMin: duration,
        location: location.trim() || undefined,
        note: note.trim() || undefined,
      });
      reset();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur réseau');
    } finally {
      setBusy(false);
    }
  }

  function reset() {
    setDayOffset(1);
    setHour(10);
    setMinute(0);
    setDuration(30);
    setLocation('');
    setNote('');
    setError(null);
  }

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.title}>Proposer un rendez-vous</Text>
            <TouchableOpacity onPress={onClose} hitSlop={12}>
              <X size={22} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.body}
            contentContainerStyle={{ paddingBottom: 16 }}
            keyboardShouldPersistTaps="handled"
          >
            <Section icon={<Calendar size={16} color={theme.colors.primary} />} label="Date">
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: 8, paddingVertical: 4 }}
              >
                {days.map((d) => {
                  const sel = d.offset === dayOffset;
                  return (
                    <TouchableOpacity
                      key={d.offset}
                      style={[styles.dayChip, sel && styles.dayChipSel]}
                      onPress={() => setDayOffset(d.offset)}
                      activeOpacity={0.85}
                    >
                      <Text style={[styles.dayLabel, sel && styles.dayLabelSel]}>{d.label}</Text>
                      <Text style={[styles.daySub, sel && styles.daySubSel]}>{d.sub}</Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </Section>

            <Section icon={<Clock size={16} color={theme.colors.primary} />} label="Heure">
              <View style={styles.timeRow}>
                <Stepper value={hour} min={6} max={22} onChange={setHour} pad />
                <Text style={styles.timeColon}>:</Text>
                <Stepper
                  value={minute}
                  min={0}
                  max={45}
                  step={15}
                  onChange={setMinute}
                  pad
                />
              </View>
            </Section>

            <Section icon={<Clock size={16} color={theme.colors.primary} />} label="Durée">
              <View style={styles.durations}>
                {DURATIONS.map((d) => {
                  const sel = d === duration;
                  return (
                    <TouchableOpacity
                      key={d}
                      style={[styles.durChip, sel && styles.durChipSel]}
                      onPress={() => setDuration(d)}
                      activeOpacity={0.85}
                    >
                      <Text style={[styles.durText, sel && styles.durTextSel]}>{d} min</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </Section>

            <Section icon={<MapPin size={16} color={theme.colors.primary} />} label="Lieu (optionnel)">
              <TextInput
                style={styles.input}
                value={location}
                onChangeText={setLocation}
                placeholder="Bureau, Visio Meet, adresse…"
                placeholderTextColor={theme.colors.textMuted}
                maxLength={200}
              />
            </Section>

            <Section icon={<FileText size={16} color={theme.colors.primary} />} label="Note (optionnel)">
              <TextInput
                style={[styles.input, { minHeight: 70, textAlignVertical: 'top' }]}
                value={note}
                onChangeText={setNote}
                placeholder="Apportez votre CV, code d'accès…"
                placeholderTextColor={theme.colors.textMuted}
                multiline
                maxLength={500}
              />
            </Section>

            {error && <Text style={styles.error}>{error}</Text>}
          </ScrollView>

          <View style={styles.footer}>
            <TouchableOpacity
              style={styles.submit}
              onPress={submit}
              disabled={busy}
              activeOpacity={0.85}
            >
              {busy ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.submitText}>Envoyer la proposition</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function Section({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionLabel}>
        {icon}
        <Text style={styles.sectionLabelText}>{label}</Text>
      </View>
      {children}
    </View>
  );
}

function Stepper({
  value,
  min,
  max,
  step = 1,
  onChange,
  pad,
}: {
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (v: number) => void;
  pad?: boolean;
}) {
  return (
    <View style={styles.stepper}>
      <TouchableOpacity
        onPress={() => onChange(Math.max(min, value - step))}
        style={styles.stepBtn}
        activeOpacity={0.7}
      >
        <Text style={styles.stepBtnText}>−</Text>
      </TouchableOpacity>
      <Text style={styles.stepValue}>
        {pad ? String(value).padStart(2, '0') : value}
      </Text>
      <TouchableOpacity
        onPress={() => onChange(Math.min(max, value + step))}
        style={styles.stepBtn}
        activeOpacity={0.7}
      >
        <Text style={styles.stepBtnText}>+</Text>
      </TouchableOpacity>
    </View>
  );
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    maxHeight: '90%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 18,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  title: { fontFamily: theme.fonts.extrabold, fontSize: 17, color: '#111' },
  body: { paddingHorizontal: 18, paddingTop: 8 },

  section: { marginTop: 14 },
  sectionLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  sectionLabelText: {
    fontFamily: theme.fonts.bold,
    fontSize: 12,
    color: theme.colors.textSecondary,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },

  dayChip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: theme.colors.surfaceMuted,
    alignItems: 'center',
    minWidth: 72,
  },
  dayChipSel: { backgroundColor: theme.colors.primary },
  dayLabel: { fontFamily: theme.fonts.bold, fontSize: 13, color: '#111' },
  dayLabelSel: { color: '#fff' },
  daySub: { fontFamily: theme.fonts.medium, fontSize: 11, color: theme.colors.textSecondary, marginTop: 2 },
  daySubSel: { color: 'rgba(255,255,255,0.85)' },

  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 4,
  },
  timeColon: { fontFamily: theme.fonts.extrabold, fontSize: 24, color: '#111' },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surfaceMuted,
    borderRadius: 12,
    paddingHorizontal: 6,
  },
  stepBtn: { width: 36, height: 40, alignItems: 'center', justifyContent: 'center' },
  stepBtnText: { fontFamily: theme.fonts.extrabold, fontSize: 22, color: theme.colors.primary },
  stepValue: {
    minWidth: 36,
    textAlign: 'center',
    fontFamily: theme.fonts.extrabold,
    fontSize: 18,
    color: '#111',
  },

  durations: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  durChip: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 999,
    backgroundColor: theme.colors.surfaceMuted,
  },
  durChipSel: { backgroundColor: theme.colors.primary },
  durText: { fontFamily: theme.fonts.bold, fontSize: 13, color: '#111' },
  durTextSel: { color: '#fff' },

  input: {
    backgroundColor: theme.colors.surfaceMuted,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontFamily: theme.fonts.medium,
    fontSize: 14,
    color: '#111',
  },

  error: {
    marginTop: 12,
    color: theme.colors.danger,
    fontFamily: theme.fonts.semibold,
    fontSize: 12,
    textAlign: 'center',
  },

  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  submit: {
    backgroundColor: theme.colors.primary,
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
  },
  submitText: { color: '#fff', fontFamily: theme.fonts.extrabold, fontSize: 15, letterSpacing: 0.3 },
});
