import React, { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  Text,
  View,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import {
  requestOtp,
  requestOtpPhone,
  verifyOtp,
  verifyOtpPhone,
  saveToken,
  getGuestData,
  clearGuestSession,
} from '@/src/auth';
import { API_BASE } from '@/src/api';
import { harborWordmark } from '@/src/theme';
import OtpInput from '@/components/OtpInput';

export default function OtpScreen() {
  const router = useRouter();
  const { contact, type, mergeGuest } = useLocalSearchParams<{
    contact: string;
    type?: string;
    mergeGuest?: string;
  }>();
  const isPhone = type === 'phone';

  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resentMsg, setResentMsg] = useState('');

  const canSubmit = code.length === 6 && !loading;

  async function handleVerify() {
    if (!contact) return;
    setLoading(true);
    setError('');
    try {
      const result = isPhone
        ? await verifyOtpPhone(contact, code)
        : await verifyOtp(contact, code);
      await saveToken(result.token);

      if (mergeGuest === 'true') {
        const guestData = await getGuestData();
        if (guestData && guestData.positions.length > 0) {
          const payload = guestData.positions.map(p => ({
            category: p.category,
            side: p.side,
            label: p.label,
            value: p.value,
          }));
          await fetch(`${API_BASE}/onboarding/complete`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${result.token}`,
            },
            body: JSON.stringify(payload),
          });
        }
        await clearGuestSession();
      }

      router.replace('/(tabs)');
    } catch {
      setError("That code didn't work. Try again or request a new one.");
      setCode('');
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    if (!contact) return;
    setError('');
    try {
      if (isPhone) {
        await requestOtpPhone(contact);
      } else {
        await requestOtp(contact);
      }
      setResentMsg('Code resent.');
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
            {isPhone ? 'Check your phone' : 'Check your email'}
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
            We sent a 6-digit code to {contact}
          </Text>

          {/* OTP input */}
          <View style={{ marginBottom: 24 }}>
            <OtpInput value={code} onChange={setCode} autoFocus />
          </View>

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
