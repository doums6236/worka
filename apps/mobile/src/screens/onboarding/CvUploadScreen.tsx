import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { candidateProfileApi } from '../../api/endpoints';
import { ApiError } from '../../api/client';
import { useAuthStore } from '../../stores/auth';
import { theme } from '../../theme';

export function CvUploadScreen() {
  const refreshOnboardingStatus = useAuthStore((s) => s.refreshOnboardingStatus);

  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadedName, setUploadedName] = useState<string | null>(null);

  async function pickAndUpload() {
    setError(null);
    const result = await DocumentPicker.getDocumentAsync({
      type: 'application/pdf',
      multiple: false,
      copyToCacheDirectory: true,
    });
    if (result.canceled) return;
    const file = result.assets[0];
    if (!file) return;

    if (file.size && file.size > 5_000_000) {
      setError('Le fichier est trop gros (max 5 Mo)');
      return;
    }

    setUploading(true);
    try {
      const { uploadUrl, publicUrl } = await candidateProfileApi.cvUploadUrl();

      // In mock storage mode, the uploadUrl starts with "mock://" — we can't actually
      // upload to it, but we can still save the publicUrl as the CV reference.
      if (uploadUrl.startsWith('mock://')) {
        await candidateProfileApi.setCvUrl(publicUrl);
        setUploadedName(file.name);
        return;
      }

      // Real R2 upload
      const blob = await fetch(file.uri).then((r) => r.blob());
      const putRes = await fetch(uploadUrl, {
        method: 'PUT',
        body: blob,
        headers: { 'Content-Type': 'application/pdf' },
      });
      if (!putRes.ok) throw new Error(`Upload failed: HTTP ${putRes.status}`);

      await candidateProfileApi.setCvUrl(publicUrl);
      setUploadedName(file.name);
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : e instanceof Error ? e.message : 'Erreur';
      setError(msg);
    } finally {
      setUploading(false);
    }
  }

  function finish() {
    void refreshOnboardingStatus();
    // After refreshOnboardingStatus, needsOnboarding flips to false and the RootNavigator
    // switches us to AppStack automatically.
  }

  function skipForNow() {
    Alert.alert(
      'Passer pour maintenant ?',
      "Tu pourras uploader ton CV plus tard depuis ton profil.",
      [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Passer', onPress: finish },
      ],
    );
  }

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <Text style={styles.step}>ÉTAPE 3 / 3</Text>
        <Text style={styles.title}>
          Upload <Text style={styles.titleEm}>ton CV</Text>
        </Text>
        <Text style={styles.subtitle}>
          PDF, max 5 Mo. Optionnel — tu peux le faire plus tard.
        </Text>
      </View>

      <View style={styles.body}>
        {uploadedName ? (
          <View style={styles.success}>
            <Text style={styles.successIcon}>✅</Text>
            <Text style={styles.successText}>CV uploadé</Text>
            <Text style={styles.fileName}>{uploadedName}</Text>
          </View>
        ) : (
          <TouchableOpacity
            style={styles.dropzone}
            onPress={pickAndUpload}
            disabled={uploading}
            activeOpacity={0.7}
          >
            {uploading ? (
              <ActivityIndicator color={theme.colors.primary} size="large" />
            ) : (
              <>
                <Text style={styles.dropzoneIcon}>📄</Text>
                <Text style={styles.dropzoneTitle}>Tape pour choisir un PDF</Text>
                <Text style={styles.dropzoneHint}>Format PDF · max 5 Mo</Text>
              </>
            )}
          </TouchableOpacity>
        )}

        {error && <Text style={styles.error}>{error}</Text>}
      </View>

      <View style={styles.footer}>
        {!uploadedName && (
          <TouchableOpacity onPress={skipForNow} style={styles.skipBtn}>
            <Text style={styles.skipText}>Passer pour maintenant</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={[styles.cta, !uploadedName && styles.ctaSecondary]}
          onPress={finish}
          activeOpacity={0.85}
        >
          <Text style={[styles.ctaText, !uploadedName && styles.ctaTextSecondary]}>
            {uploadedName ? 'Terminer →' : "C'est parti →"}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.colors.bg, padding: 24, paddingTop: 60 },
  header: { alignItems: 'center', marginBottom: 32 },
  step: {
    fontFamily: theme.fonts.bold,
    fontSize: 10,
    color: theme.colors.primary,
    letterSpacing: 2,
    marginBottom: 12,
  },
  title: {
    fontFamily: theme.fonts.extrabold,
    fontSize: 24,
    color: '#111',
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  titleEm: { color: theme.colors.primary },
  subtitle: {
    fontFamily: theme.fonts.medium,
    fontSize: 13,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: 16,
  },
  body: { flex: 1, justifyContent: 'center' },
  dropzone: {
    borderWidth: 2,
    borderColor: theme.colors.border,
    borderStyle: 'dashed',
    borderRadius: 24,
    paddingVertical: 60,
    paddingHorizontal: 24,
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  dropzoneIcon: { fontSize: 64, marginBottom: 16 },
  dropzoneTitle: {
    fontFamily: theme.fonts.bold,
    fontSize: 16,
    color: '#111',
    marginBottom: 6,
    textAlign: 'center',
  },
  dropzoneHint: {
    fontFamily: theme.fonts.medium,
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
  success: {
    backgroundColor: 'rgba(0,196,124,0.1)',
    borderColor: theme.colors.success,
    borderWidth: 2,
    borderRadius: 24,
    paddingVertical: 40,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  successIcon: { fontSize: 56, marginBottom: 12 },
  successText: {
    fontFamily: theme.fonts.extrabold,
    fontSize: 16,
    color: theme.colors.success,
    marginBottom: 6,
  },
  fileName: {
    fontFamily: theme.fonts.medium,
    fontSize: 12,
    color: '#333',
    textAlign: 'center',
  },
  error: {
    color: theme.colors.danger,
    fontFamily: theme.fonts.semibold,
    fontSize: 13,
    textAlign: 'center',
    marginTop: 16,
  },
  footer: { paddingTop: 12 },
  skipBtn: { alignSelf: 'center', marginBottom: 12, padding: 8 },
  skipText: {
    fontFamily: theme.fonts.semibold,
    fontSize: 13,
    color: theme.colors.textSecondary,
  },
  cta: {
    paddingVertical: 15,
    borderRadius: 16,
    alignItems: 'center',
    backgroundColor: theme.colors.primary,
    shadowColor: theme.colors.primary,
    shadowOpacity: 0.35,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  ctaSecondary: {
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: theme.colors.primary,
    shadowOpacity: 0,
    elevation: 0,
  },
  ctaText: {
    color: '#fff',
    fontFamily: theme.fonts.extrabold,
    fontSize: 15,
    letterSpacing: 0.3,
  },
  ctaTextSecondary: { color: theme.colors.primary },
});
