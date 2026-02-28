import React, { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { requestOtp } from '@/src/auth';

export default function EmailScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [focused, setFocused] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const canSubmit = email.trim().length > 0 && !loading;

  async function handleSend() {
    setLoading(true);
    setError('');
    try {
      await requestOtp(email.trim());
      router.push(`/auth/otp?email=${encodeURIComponent(email.trim())}`);
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F3E7D3' }}>
      {/* Back button */}
      <Pressable
        onPress={() => router.back()}
        style={{ position: 'absolute', top: 56, left: 24, zIndex: 10, padding: 8 }}
      >
        <Text style={{ fontSize: 22, color: '#27231C' }}>←</Text>
      </Pressable>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={{ flex: 1, paddingHorizontal: 40, justifyContent: 'center' }}>
          {/* Wordmark */}
          <Text
            style={{
              fontSize: 48,
              fontWeight: '300',
              color: '#27231C',
              letterSpacing: 5.5,
              textAlign: 'center',
              marginBottom: 48,
            }}
          >
            Harbor
          </Text>

          {/* Heading */}
          <Text
            style={{
              fontSize: 28,
              fontWeight: '300',
              color: '#27231C',
              marginBottom: 8,
            }}
          >
            What's your email?
          </Text>

          {/* Subheading */}
          <Text
            style={{
              fontSize: 15,
              fontWeight: '300',
              color: 'rgba(39,35,28,0.60)',
              marginBottom: 32,
              lineHeight: 22,
            }}
          >
            We'll send you a 6-digit code to sign in.
          </Text>

          {/* Email input */}
          <TextInput
            value={email}
            onChangeText={setEmail}
            placeholder="you@example.com"
            placeholderTextColor="rgba(39,35,28,0.35)"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            autoFocus
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            onSubmitEditing={canSubmit ? handleSend : undefined}
            returnKeyType="send"
            style={{
              width: '100%',
              height: 56,
              borderWidth: 1.5,
              borderRadius: 12,
              paddingHorizontal: 16,
              fontSize: 16,
              color: '#27231C',
              borderColor: focused ? '#5B4A3A' : 'rgba(39,35,28,0.20)',
              marginBottom: 16,
              backgroundColor: 'transparent',
            }}
          />

          {/* CTA */}
          <Pressable
            onPress={handleSend}
            disabled={!canSubmit}
            style={{
              width: '100%',
              height: 56,
              backgroundColor: '#5B4A3A',
              borderRadius: 14,
              alignItems: 'center',
              justifyContent: 'center',
              opacity: canSubmit ? 1 : 0.5,
            }}
          >
            {loading ? (
              <ActivityIndicator color="#F3E7D3" />
            ) : (
              <Text
                style={{
                  color: '#F3E7D3',
                  fontSize: 16,
                  fontWeight: '500',
                  letterSpacing: 0.2,
                }}
              >
                Send code
              </Text>
            )}
          </Pressable>

          {/* Inline error */}
          {error ? (
            <Text
              style={{ color: '#C0392B', fontSize: 13, marginTop: 8, textAlign: 'center' }}
            >
              {error}
            </Text>
          ) : null}
        </View>
      </KeyboardAvoidingView>

      {/* Privacy note */}
      <Text
        style={{
          fontSize: 12,
          color: 'rgba(39,35,28,0.40)',
          textAlign: 'center',
          paddingHorizontal: 40,
          paddingBottom: 32,
        }}
      >
        By continuing, you agree to Harbor's Terms and Privacy Policy.
      </Text>
    </SafeAreaView>
  );
}
