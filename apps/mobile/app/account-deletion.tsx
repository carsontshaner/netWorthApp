import { useState } from 'react';
import {
  View, Text, Pressable, StyleSheet, Alert, SafeAreaView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { clearToken, clearGuestSession, getToken, API_BASE } from '@/src/auth';
import { harborWordmark } from '@/src/theme';

export default function AccountDeletionScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function confirmDelete() {
    Alert.alert(
      'Are you sure?',
      'Your account and all financial data will be permanently deleted. This cannot be undone.',
      [
        { text: 'Never mind', style: 'cancel' },
        { text: 'Delete everything', style: 'destructive', onPress: runDelete },
      ],
    );
  }

  async function runDelete() {
    setLoading(true);
    setError(null);
    try {
      const token = await getToken();
      const res = await fetch(`${API_BASE}/account`, {
        method: 'DELETE',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error('Server error');
      await clearToken();
      await clearGuestSession();
      router.replace('/landing');
    } catch {
      setLoading(false);
      setError(
        'Something went wrong. Please try again or contact harbornetworthapp@gmail.com',
      );
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      {/* Back button */}
      <Pressable style={styles.backButton} onPress={() => router.back()}>
        <Text style={styles.backLabel}>Back</Text>
      </Pressable>

      {/* Wordmark */}
      <Text style={[harborWordmark, styles.wordmark]}>HARBOR</Text>

      {/* Content */}
      <View style={styles.content}>
        <Text style={styles.heading}>Delete your account</Text>

        <Text style={styles.body}>
          This will permanently delete your Harbor account and all associated
          data, including your complete net worth history. This cannot be undone.
        </Text>

        <View style={styles.spacer} />

        <Pressable
          style={[styles.deleteButton, loading && styles.deleteButtonDisabled]}
          onPress={confirmDelete}
          disabled={loading}
        >
          <Text style={styles.deleteLabel}>
            {loading ? 'Deleting…' : 'Delete my account'}
          </Text>
        </Pressable>

        {error && <Text style={styles.errorText}>{error}</Text>}

        <Text style={styles.goBackText}>
          Changed your mind?{' '}
          <Text style={styles.goBackLink} onPress={() => router.back()}>
            Go back
          </Text>
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#F3E7D3',
  },
  backButton: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 4,
    alignSelf: 'flex-start',
  },
  backLabel: {
    fontSize: 16,
    fontWeight: '400',
    color: '#27231C',
  },
  wordmark: {
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 8,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  heading: {
    fontSize: 24,
    fontWeight: '500',
    color: '#27231C',
    textAlign: 'center',
  },
  body: {
    fontSize: 15,
    fontWeight: '300',
    color: '#5B4A3A',
    textAlign: 'center',
    maxWidth: 300,
    marginTop: 16,
  },
  spacer: {
    height: 48,
  },
  deleteButton: {
    width: '100%',
    borderWidth: 1.5,
    borderColor: '#C62828',
    borderRadius: 8,
    paddingVertical: 16,
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  deleteButtonDisabled: {
    opacity: 0.5,
  },
  deleteLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#C62828',
  },
  errorText: {
    fontSize: 13,
    fontWeight: '300',
    color: '#C62828',
    textAlign: 'center',
    marginTop: 12,
    maxWidth: 300,
  },
  goBackText: {
    fontSize: 13,
    fontWeight: '300',
    color: '#5B4A3A',
    marginTop: 20,
    textAlign: 'center',
  },
  goBackLink: {
    color: '#5B4A3A',
    textDecorationLine: 'underline',
  },
});
