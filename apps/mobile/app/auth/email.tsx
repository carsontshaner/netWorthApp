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
import { useRouter, useLocalSearchParams } from 'expo-router';
import { requestOtp, requestOtpPhone } from '@/src/auth';
import { harborWordmark } from '@/src/theme';

function detectInputType(input: string): 'email' | 'phone' | 'unknown' {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const phoneRegex = /^[\+]?[\d\s\-\(\)]{10,}$/;
  if (emailRegex.test(input)) return 'email';
  if (phoneRegex.test(input.replace(/\s/g, ''))) return 'phone';
  return 'unknown';
}

export default function EmailScreen() {
  const router = useRouter();
  const { mode, mergeGuest } = useLocalSearchParams<{ mode?: string; mergeGuest?: string }>();
  const isSignIn = mode === 'signin';
  const [contact, setContact] = useState('');
  const [focused, setFocused] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const trimmed = contact.trim();
  const inputType = trimmed.length > 0 ? detectInputType(trimmed) : 'unknown';
  const canSubmit = trimmed.length > 0 && inputType !== 'unknown' && !loading;

  async function handleSend() {
    if (inputType === 'unknown') {
      setError('Enter a valid email or phone number');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const mergeParam = mergeGuest === 'true' ? '&mergeGuest=true' : '';
      if (inputType === 'email') {
        await requestOtp(trimmed);
        router.push(`/auth/otp?contact=${encodeURIComponent(trimmed)}&type=email${mergeParam}`);
      } else {
        await requestOtpPhone(trimmed);
        router.push(`/auth/otp?contact=${encodeURIComponent(trimmed)}&type=phone${mergeParam}`);
      }
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  let hint: { text: string; color: string } | null = null;
  if (trimmed.length > 0) {
    if (inputType === 'email') {
      hint = { text: "We'll send a code to this email", color: 'rgba(39,35,28,0.45)' };
    } else if (inputType === 'phone') {
      hint = { text: "We'll send a code to this number via SMS", color: 'rgba(39,35,28,0.45)' };
    } else if (trimmed.length > 3) {
      hint = { text: 'Enter a valid email or phone number', color: 'rgba(180,60,60,0.70)' };
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
          <Text style={{ ...harborWordmark, textAlign: 'center', marginBottom: 48 }}>
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
            {isSignIn ? 'Welcome back.' : "What's your email?"}
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
            {isSignIn
              ? "Enter your email or phone and we'll send you a code to sign in."
              : "We'll send you a 6-digit code to sign in."}
          </Text>

          {/* Contact input */}
          <TextInput
            value={contact}
            onChangeText={setContact}
            placeholder="Email or phone number"
            placeholderTextColor="rgba(39,35,28,0.35)"
            keyboardType="default"
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
              marginBottom: hint ? 6 : 16,
              backgroundColor: 'transparent',
            }}
          />

          {/* Hint text */}
          {hint && (
            <Text style={{ fontSize: 12, color: hint.color, marginBottom: 16 }}>
              {hint.text}
            </Text>
          )}

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
