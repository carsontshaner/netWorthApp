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
import { requestOtp, verifyOtp, saveToken } from '@/src/auth';

export default function OtpScreen() {
  const router = useRouter();
  const { email } = useLocalSearchParams<{ email: string }>();

  const [code, setCode] = useState('');
  const [focused, setFocused] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resentMsg, setResentMsg] = useState('');

  const canSubmit = code.length === 6 && !loading;

  async function handleVerify() {
    if (!email) return;
    setLoading(true);
    setError('');
    try {
      const result = await verifyOtp(email, code);
      await saveToken(result.token);
      router.replace('/(tabs)');
    } catch {
      setError("That code didn't work. Try again or request a new one.");
      setCode('');
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    if (!email) return;
    setError('');
    try {
      await requestOtp(email);
      setResentMsg('Code resent!');
      setTimeout(() => setResentMsg(''), 3000);
    } catch {
      setError('Could not resend. Please try again.');
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
            Check your email
          </Text>

          {/* Subheading */}
          <Text
            style={{
              fontSize: 15,
              fontWeight: '300',
              color: 'rgba(39,35,28,0.60)',
              marginBottom: 40,
              lineHeight: 22,
            }}
          >
            We sent a 6-digit code to {email}
          </Text>

          {/* OTP input — single field, spaced digits feel like 6 boxes */}
          <TextInput
            value={code}
            onChangeText={setCode}
            maxLength={6}
            keyboardType="number-pad"
            autoFocus
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            style={{
              width: '100%',
              height: 72,
              borderWidth: 1.5,
              borderRadius: 12,
              fontSize: 32,
              fontWeight: '300',
              color: '#27231C',
              textAlign: 'center',
              letterSpacing: 16,
              borderColor: focused ? '#5B4A3A' : 'rgba(39,35,28,0.20)',
              marginBottom: 24,
              backgroundColor: 'transparent',
            }}
          />

          {/* Verify button */}
          <Pressable
            onPress={handleVerify}
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
                Verify
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

          {/* Resend */}
          <Pressable onPress={handleResend} style={{ marginTop: 16, alignSelf: 'center' }}>
            <Text
              style={{
                color: 'rgba(39,35,28,0.60)',
                fontSize: 14,
              }}
            >
              Didn't get it? Resend
            </Text>
          </Pressable>

          {resentMsg ? (
            <Text
              style={{
                color: 'rgba(39,35,28,0.60)',
                fontSize: 13,
                textAlign: 'center',
                marginTop: 6,
              }}
            >
              {resentMsg}
            </Text>
          ) : null}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
