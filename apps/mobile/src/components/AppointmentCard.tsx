import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  TextInput,
} from 'react-native';
import { Calendar, Clock, MapPin, Check, X } from 'lucide-react-native';
import { theme } from '../theme';
import type { AppointmentMetadata } from '../api/types';

interface Props {
  meta: AppointmentMetadata;
  canRespond: boolean;
  onConfirm?: () => Promise<void> | void;
  onDecline?: (reason?: string) => Promise<void> | void;
}

export function AppointmentCard({ meta, canRespond, onConfirm, onDecline }: Props) {
  const [busy, setBusy] = useState<'confirm' | 'decline' | null>(null);
  const [declineOpen, setDeclineOpen] = useState(false);
  const [reason, setReason] = useState('');

  const status = meta.status ?? 'pending';
  const date = new Date(meta.datetime);
  const dateLabel = date.toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
  const timeLabel = date.toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
  });

  async function handleConfirm() {
    if (!onConfirm) return;
    setBusy('confirm');
    try {
      await onConfirm();
    } finally {
      setBusy(null);
    }
  }

  async function submitDecline() {
    if (!onDecline) return;
    setBusy('decline');
    try {
      await onDecline(reason.trim() || undefined);
      setDeclineOpen(false);
      setReason('');
    } finally {
      setBusy(null);
    }
  }

  return (
    <View
      style={[
        styles.card,
        status === 'confirmed' && styles.cardConfirmed,
        status === 'declined' && styles.cardDeclined,
      ]}
    >
      <View style={styles.head}>
        <View style={styles.iconWrap}>
          <Calendar size={18} color={theme.colors.primary} />
        </View>
        <Text style={styles.title}>Proposition de rendez-vous</Text>
      </View>

      <Text style={styles.date}>{capitalize(dateLabel)}</Text>

      <View style={styles.metaRow}>
        <Clock size={14} color={theme.colors.textSecondary} />
        <Text style={styles.metaText}>
          {timeLabel}
          {meta.durationMin ? ` · ${meta.durationMin} min` : ''}
        </Text>
      </View>

      {meta.location ? (
        <View style={styles.metaRow}>
          <MapPin size={14} color={theme.colors.textSecondary} />
          <Text style={styles.metaText}>{meta.location}</Text>
        </View>
      ) : null}

      {meta.note ? <Text style={styles.note}>{meta.note}</Text> : null}

      {status === 'confirmed' && (
        <View style={styles.statusBanner}>
          <Check size={14} color={theme.colors.success} />
          <Text style={[styles.statusText, { color: theme.colors.success }]}>
            Confirmé
          </Text>
        </View>
      )}

      {status === 'declined' && (
        <View style={styles.statusBanner}>
          <X size={14} color={theme.colors.danger} />
          <Text style={[styles.statusText, { color: theme.colors.danger }]}>
            Décliné
            {meta.declineReason ? ` · ${meta.declineReason}` : ''}
          </Text>
        </View>
      )}

      {canRespond && status === 'pending' && (
        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.btn, styles.btnDecline]}
            onPress={() => setDeclineOpen(true)}
            disabled={busy !== null}
            activeOpacity={0.85}
          >
            <Text style={styles.btnDeclineText}>Décliner</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.btn, styles.btnConfirm]}
            onPress={handleConfirm}
            disabled={busy !== null}
            activeOpacity={0.85}
          >
            {busy === 'confirm' ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.btnConfirmText}>Confirmer</Text>
            )}
          </TouchableOpacity>
        </View>
      )}

      <Modal
        visible={declineOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setDeclineOpen(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Pourquoi décliner ?</Text>
            <Text style={styles.modalSub}>Optionnel — aide le recruteur à reprogrammer</Text>
            <TextInput
              style={styles.modalInput}
              value={reason}
              onChangeText={setReason}
              placeholder="Ex: indisponible ce jour-là"
              placeholderTextColor={theme.colors.textMuted}
              multiline
              maxLength={300}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity
                onPress={() => setDeclineOpen(false)}
                style={[styles.btn, styles.btnCancel]}
              >
                <Text style={styles.btnCancelText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={submitDecline}
                style={[styles.btn, styles.btnDeclineSolid]}
                disabled={busy === 'decline'}
              >
                {busy === 'decline' ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.btnDeclineSolidText}>Décliner</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
    marginVertical: 6,
    borderWidth: 1,
    borderColor: theme.colors.border,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  cardConfirmed: {
    borderColor: theme.colors.success,
    backgroundColor: '#F0FDF7',
  },
  cardDeclined: {
    borderColor: theme.colors.danger,
    backgroundColor: '#FEF3F5',
  },
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  iconWrap: {
    width: 28,
    height: 28,
    borderRadius: 10,
    backgroundColor: theme.colors.bgLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontFamily: theme.fonts.bold,
    fontSize: 13,
    color: theme.colors.primary,
    letterSpacing: 0.2,
  },
  date: {
    fontFamily: theme.fonts.extrabold,
    fontSize: 16,
    color: '#111',
    marginBottom: 6,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  metaText: {
    fontFamily: theme.fonts.medium,
    fontSize: 13,
    color: theme.colors.textSecondary,
  },
  note: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    fontFamily: theme.fonts.medium,
    fontSize: 13,
    color: '#333',
    lineHeight: 18,
  },
  statusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  statusText: {
    fontFamily: theme.fonts.bold,
    fontSize: 12,
    letterSpacing: 0.3,
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  btn: {
    flex: 1,
    paddingVertical: 11,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnConfirm: { backgroundColor: theme.colors.primary },
  btnConfirmText: { color: '#fff', fontFamily: theme.fonts.extrabold, fontSize: 13 },
  btnDecline: { borderWidth: 1.5, borderColor: theme.colors.border, backgroundColor: '#fff' },
  btnDeclineText: { color: theme.colors.textSecondary, fontFamily: theme.fonts.bold, fontSize: 13 },
  btnDeclineSolid: { backgroundColor: theme.colors.danger },
  btnDeclineSolidText: { color: '#fff', fontFamily: theme.fonts.extrabold, fontSize: 13 },
  btnCancel: { borderWidth: 1.5, borderColor: theme.colors.border, backgroundColor: '#fff' },
  btnCancelText: { color: theme.colors.textSecondary, fontFamily: theme.fonts.bold, fontSize: 13 },

  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  modalCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    width: '100%',
    maxWidth: 360,
  },
  modalTitle: {
    fontFamily: theme.fonts.extrabold,
    fontSize: 17,
    color: '#111',
    marginBottom: 4,
  },
  modalSub: {
    fontFamily: theme.fonts.medium,
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginBottom: 12,
  },
  modalInput: {
    backgroundColor: theme.colors.surfaceMuted,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 10,
    padding: 12,
    minHeight: 80,
    textAlignVertical: 'top',
    fontFamily: theme.fonts.medium,
    fontSize: 14,
    color: '#111',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 16,
  },
});
