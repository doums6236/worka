import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ChevronLeft } from 'lucide-react-native';
import { candidateProfileApi } from '../../api/endpoints';
import { ApiError } from '../../api/client';
import { theme } from '../../theme';

export function EditProfileScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['candidate-profile'],
    queryFn: () => candidateProfileApi.get(),
  });

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [location, setLocation] = useState('');
  const [summary, setSummary] = useState('');

  useEffect(() => {
    if (data) {
      setFirstName(data.firstName ?? '');
      setLastName(data.lastName ?? '');
      setLocation(data.location ?? '');
      setSummary(data.summary ?? '');
    }
  }, [data]);

  const update = useMutation({
    mutationFn: candidateProfileApi.update,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['candidate-profile'] });
      navigation.goBack();
    },
    onError: (e: unknown) => {
      const msg = e instanceof ApiError ? e.message : 'Erreur réseau';
      Alert.alert('Erreur', msg);
    },
  });

  function onSave() {
    const payload = {
      firstName: firstName.trim() || undefined,
      lastName: lastName.trim() || undefined,
      location: location.trim() || undefined,
      summary: summary.trim() || undefined,
    };
    update.mutate(payload);
  }

  const dirty =
    (data?.firstName ?? '') !== firstName.trim() ||
    (data?.lastName ?? '') !== lastName.trim() ||
    (data?.location ?? '') !== location.trim() ||
    (data?.summary ?? '') !== summary.trim();

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
    >
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={12}>
          <ChevronLeft size={26} color={theme.colors.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Modifier le profil</Text>
        <View style={{ width: 26 }} />
      </View>

      {isLoading ? (
        <View style={styles.loader}>
          <ActivityIndicator color={theme.colors.primary} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{ padding: 20, paddingBottom: 32 }}
          keyboardShouldPersistTaps="handled"
        >
          <Field
            label="Prénom"
            value={firstName}
            onChangeText={setFirstName}
            placeholder="Mamadou"
            maxLength={60}
          />
          <Field
            label="Nom"
            value={lastName}
            onChangeText={setLastName}
            placeholder="Diallo"
            maxLength={60}
          />
          <Field
            label="Ville"
            value={location}
            onChangeText={setLocation}
            placeholder="Conakry, Guinée"
            maxLength={120}
          />
          <Field
            label="À propos de moi"
            value={summary}
            onChangeText={setSummary}
            placeholder="Décris-toi en quelques phrases pour les recruteurs…"
            maxLength={500}
            multiline
            counter
          />
        </ScrollView>
      )}

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 12) }]}>
        <TouchableOpacity
          style={[styles.saveBtn, (!dirty || update.isPending) && styles.saveBtnDisabled]}
          onPress={onSave}
          disabled={!dirty || update.isPending}
          activeOpacity={0.85}
        >
          {update.isPending ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.saveText}>Enregistrer</Text>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

function Field({
  label,
  value,
  onChangeText,
  placeholder,
  maxLength,
  multiline,
  counter,
}: {
  label: string;
  value: string;
  onChangeText: (s: string) => void;
  placeholder?: string;
  maxLength?: number;
  multiline?: boolean;
  counter?: boolean;
}) {
  return (
    <View style={styles.field}>
      <View style={styles.fieldLabelRow}>
        <Text style={styles.fieldLabel}>{label}</Text>
        {counter && maxLength && (
          <Text style={styles.counter}>
            {value.length} / {maxLength}
          </Text>
        )}
      </View>
      <TextInput
        style={[styles.input, multiline && styles.inputMultiline]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={theme.colors.textMuted}
        maxLength={maxLength}
        multiline={multiline}
        textAlignVertical={multiline ? 'top' : 'auto'}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.colors.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 14,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  headerTitle: { fontFamily: theme.fonts.extrabold, fontSize: 16, color: '#111' },
  loader: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  field: { marginBottom: 16 },
  fieldLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  fieldLabel: {
    fontFamily: theme.fonts.bold,
    fontSize: 11,
    color: theme.colors.textSecondary,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  counter: {
    fontFamily: theme.fonts.medium,
    fontSize: 11,
    color: theme.colors.textMuted,
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontFamily: theme.fonts.medium,
    fontSize: 14,
    color: '#111',
  },
  inputMultiline: { minHeight: 110 },

  footer: {
    padding: 16,
    paddingTop: 8,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  saveBtn: {
    backgroundColor: theme.colors.primary,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  saveBtnDisabled: { backgroundColor: theme.colors.border },
  saveText: { color: '#fff', fontFamily: theme.fonts.extrabold, fontSize: 15, letterSpacing: 0.3 },
});
