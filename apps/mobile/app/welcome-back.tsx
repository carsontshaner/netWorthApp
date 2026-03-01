import React, { useEffect, useRef } from 'react';
import { Alert, Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import Svg, { Circle, Path } from 'react-native-svg';
import { clearToken } from '@/src/auth';
import { harborWordmark } from '@/src/theme';

// Each wave path covers 0–375, doubled to 0–750 for seamless horizontal scroll.
const WAVE_1 =
  'M0,20 C60,-10 120,60 180,20 C240,-10 300,60 375,20 ' +
  'C435,-10 495,60 555,20 C615,-10 675,60 750,20 L750,110 L0,110 Z';
const WAVE_2 =
  'M0,40 C75,5 150,75 225,40 C300,5 340,65 375,40 ' +
  'C450,5 525,75 600,40 C675,5 715,65 750,40 L750,110 L0,110 Z';
const WAVE_3 =
  'M0,55 C80,25 160,82 240,55 C300,35 340,72 375,55 ' +
  'C455,25 535,82 615,55 C675,35 715,72 750,55 L750,110 L0,110 Z';

export default function WelcomeBackScreen() {
  const router = useRouter();
  const wave1Offset = useRef(new Animated.Value(0)).current;
  const wave2Offset = useRef(new Animated.Value(0)).current;
  const wave3Offset = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(Animated.timing(wave1Offset, {
      toValue: 1,
      duration: 8000,
      easing: Easing.linear,
      useNativeDriver: true,
    })).start();

    Animated.loop(Animated.timing(wave2Offset, {
      toValue: 1,
      duration: 6000,
      easing: Easing.linear,
      useNativeDriver: true,
    })).start();

    Animated.loop(Animated.timing(wave3Offset, {
      toValue: 1,
      duration: 4500,
      easing: Easing.linear,
      useNativeDriver: true,
    })).start();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const wave1TranslateX = wave1Offset.interpolate({ inputRange: [0, 1], outputRange: [0, -375] });
  const wave2TranslateX = wave2Offset.interpolate({ inputRange: [0, 1], outputRange: [0, -375] });
  const wave3TranslateX = wave3Offset.interpolate({ inputRange: [0, 1], outputRange: [0, -375] });

  function handleSignOut() {
    Alert.alert(
      'Sign out',
      'Are you sure you want to sign out of Harbor?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign out',
          style: 'destructive',
          onPress: async () => {
            await clearToken();
            router.replace('/landing');
          },
        },
      ],
    );
  }

  return (
    <View style={styles.root}>
      {/* ─── LAYER 1 — TOP CONTENT ─── */}
      <View style={styles.topContent}>
        <Text style={styles.harborText}>Harbor</Text>

        {/* Anchor */}
        <Svg width={110} height={100} style={styles.anchorSvg}>
          {/* Ring */}
          <Circle cx={55} cy={10} r={10} fill="#4C6A8A" />
          <Circle cx={55} cy={10} r={5.5} fill="#F3E7D3" />
          {/* Stock (trapezoid) */}
          <Path d="M41,17 L69,17 L77,27 L33,27 Z" fill="#4C6A8A" />
          {/* Shaft */}
          <Path
            d="M50,26 C49,40 48,55 46,72 L52,78 L58,78 L64,72 C62,55 61,40 60,26 Z"
            fill="#4C6A8A"
          />
          {/* Flukes */}
          <Path
            d={
              'M55,78 C57,80 58,82 55,85 C52,82 53,80 55,78 ' +
              'C48,78 38,76 28,71 C16,64 8,54 10,44 ' +
              'C11,37 17,34 23,36 C19,38 18,43 22,47 ' +
              'C26,52 36,57 48,62 C51,63 53,65 55,67 ' +
              'C55,74 55,76 55,78 ' +
              'C57,76 57,74 57,67 ' +
              'C59,65 61,63 64,62 C76,57 86,52 90,47 ' +
              'C94,43 93,38 89,36 C95,34 101,37 102,44 ' +
              'C104,54 96,64 84,71 C74,76 64,78 57,78 Z'
            }
            fill="#4C6A8A"
          />
          {/* Left tip */}
          <Path d="M23,36 C17,30 10,30 8,36 C10,38 14,38 18,40 Z" fill="#4C6A8A" />
          {/* Right tip */}
          <Path d="M89,36 C95,30 102,30 104,36 C102,38 98,38 94,40 Z" fill="#4C6A8A" />
        </Svg>

        <Text style={styles.tagline}>Welcome back.</Text>
      </View>

      {/* ─── LAYER 2 — WAVES ─── */}
      <View style={styles.waveLayer}>
        <View style={styles.waveContainer}>
          {/* Wave 1 — back, lightest */}
          <Animated.View style={[styles.waveTile, { transform: [{ translateX: wave1TranslateX }] }]}>
            <Svg width={750} height={110} viewBox="0 0 750 110">
              <Path d={WAVE_1} fill="#A9D6CF" fillOpacity={0.7} />
            </Svg>
          </Animated.View>

          {/* Wave 2 — mid */}
          <Animated.View style={[styles.waveTile, { transform: [{ translateX: wave2TranslateX }] }]}>
            <Svg width={750} height={110} viewBox="0 0 750 110">
              <Path d={WAVE_2} fill="#7FB3C8" fillOpacity={0.8} />
            </Svg>
          </Animated.View>

          {/* Wave 3 — front, most solid */}
          <Animated.View style={[styles.waveTile, { transform: [{ translateX: wave3TranslateX }] }]}>
            <Svg width={750} height={110} viewBox="0 0 750 110">
              <Path d={WAVE_3} fill="#5FA6A6" fillOpacity={1} />
            </Svg>
          </Animated.View>

          {/* Crest highlight lines — animated with wave2 */}
          <Animated.View style={[styles.waveTile, { transform: [{ translateX: wave2TranslateX }] }]}>
            <Svg width={750} height={110} viewBox="0 0 750 110">
              <Path d="M10,25 Q40,15 70,25"   stroke="rgba(255,255,255,0.5)" strokeWidth={1.5} fill="none" />
              <Path d="M160,35 Q190,25 220,35" stroke="rgba(255,255,255,0.5)" strokeWidth={1.5} fill="none" />
              <Path d="M310,22 Q340,12 370,22" stroke="rgba(255,255,255,0.5)" strokeWidth={1.2} fill="none" />
              <Path d="M385,25 Q415,15 445,25"  stroke="rgba(255,255,255,0.5)" strokeWidth={1.5} fill="none" />
              <Path d="M535,35 Q565,25 595,35"  stroke="rgba(255,255,255,0.5)" strokeWidth={1.5} fill="none" />
              <Path d="M685,22 Q715,12 745,22"  stroke="rgba(255,255,255,0.5)" strokeWidth={1.2} fill="none" />
            </Svg>
          </Animated.View>
        </View>

        {/* Solid teal fill from front wave to bottom of screen */}
        <View style={styles.waveFill} />
      </View>

      {/* ─── LAYER 3 — BOTTOM CTA ─── */}
      <View style={styles.ctaLayer}>
        <Pressable
          style={styles.ctaButton}
          onPress={() => router.replace('/(tabs)')}
        >
          <Text style={styles.ctaButtonText}>See my Net Worth →</Text>
        </Pressable>

        <Text style={styles.signOutText} onPress={handleSignOut}>
          Not you? Sign out
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#F3E7D3',
  },

  // Layer 1 — top content
  topContent: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 2,
    paddingTop: 90,
    paddingHorizontal: 40,
    alignItems: 'center',
  },
  harborText: {
    ...harborWordmark,
    marginBottom: 32,
    textAlign: 'center',
  },
  anchorSvg: {
    marginBottom: 36,
  },
  tagline: {
    fontSize: 28,
    fontWeight: '300',
    color: '#27231C',
    textAlign: 'center',
  },

  // Layer 2 — waves
  waveLayer: {
    position: 'absolute',
    top: '59%',
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1,
  },
  waveContainer: {
    width: '100%',
    height: 110,
    overflow: 'hidden',
  },
  waveTile: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 750,
    height: 110,
  },
  waveFill: {
    flex: 1,
    backgroundColor: '#5FA6A6',
  },

  // Layer 3 — CTA
  ctaLayer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 3,
    paddingHorizontal: 40,
    paddingBottom: 52,
    paddingTop: 32,
    alignItems: 'center',
    gap: 16,
  },
  ctaButton: {
    backgroundColor: '#5B4A3A',
    borderRadius: 14,
    paddingVertical: 18,
    paddingHorizontal: 24,
    width: '100%',
    alignItems: 'center',
  },
  ctaButtonText: {
    color: '#F3E7D3',
    fontSize: 16,
    fontWeight: '500',
    letterSpacing: 0.3,
    textAlign: 'center',
  },
  signOutText: {
    color: 'rgba(243,231,211,0.75)',
    fontSize: 13,
    fontWeight: '300',
  },
});
