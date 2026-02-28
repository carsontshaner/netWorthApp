import React, { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import Svg, { Circle, Path } from 'react-native-svg';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

// Each wave path is doubled (0–750) for a seamless horizontal scroll loop.
// At translateX=0 the viewport shows x=0–375; at translateX=-375 it shows x=375–750.
// The right half is the left half shifted by 375, so the loop is visually continuous.
const WAVE_1 =
  'M0,30 C60,10 120,50 180,30 C240,10 300,50 375,30 ' +
  'C435,10 495,50 555,30 C615,10 675,50 750,30 L750,110 L0,110 Z';
const WAVE_2 =
  'M0,45 C75,25 150,65 225,45 C300,25 340,55 375,45 ' +
  'C450,25 525,65 600,45 C675,25 715,55 750,45 L750,110 L0,110 Z';
const WAVE_3 =
  'M0,60 C80,45 160,72 240,58 C300,48 340,65 375,58 ' +
  'C455,45 535,72 615,58 C675,48 715,65 750,58 L750,110 L0,110 Z';

export default function LandingScreen() {
  const router = useRouter();

  const wave1X = useSharedValue(0);
  const wave2X = useSharedValue(0);
  const wave3X = useSharedValue(0);

  useEffect(() => {
    // Back wave slowest, front wave fastest — mimics perspective depth
    wave1X.value = withRepeat(
      withTiming(-375, { duration: 9000, easing: Easing.linear }),
      -1,
      false,
    );
    wave2X.value = withRepeat(
      withTiming(-375, { duration: 7000, easing: Easing.linear }),
      -1,
      false,
    );
    wave3X.value = withRepeat(
      withTiming(-375, { duration: 5000, easing: Easing.linear }),
      -1,
      false,
    );
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const wave1Style = useAnimatedStyle(() => ({
    transform: [{ translateX: wave1X.value }],
  }));
  const wave2Style = useAnimatedStyle(() => ({
    transform: [{ translateX: wave2X.value }],
  }));
  const wave3Style = useAnimatedStyle(() => ({
    transform: [{ translateX: wave3X.value }],
  }));

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

        <Text style={styles.tagline}>
          {'Your complete financial picture,\ncalm and clear.'}
        </Text>
      </View>

      {/* ─── LAYER 2 — WAVES ─── */}
      <View style={styles.waveLayer}>
        {/* Animated SVG waves */}
        <View style={styles.waveContainer}>
          {/* Wave 1 — back, lightest */}
          <Animated.View style={[styles.waveTile, wave1Style]}>
            <Svg width={750} height={110} viewBox="0 0 750 110">
              <Path d={WAVE_1} fill="#A9D6CF" fillOpacity={0.7} />
            </Svg>
          </Animated.View>

          {/* Wave 2 — mid */}
          <Animated.View style={[styles.waveTile, wave2Style]}>
            <Svg width={750} height={110} viewBox="0 0 750 110">
              <Path d={WAVE_2} fill="#7FB3C8" fillOpacity={0.8} />
            </Svg>
          </Animated.View>

          {/* Wave 3 — front, most solid */}
          <Animated.View style={[styles.waveTile, wave3Style]}>
            <Svg width={750} height={110} viewBox="0 0 750 110">
              <Path d={WAVE_3} fill="#5FA6A6" fillOpacity={1} />
            </Svg>
          </Animated.View>

          {/* Crest highlight lines — static, decorative */}
          <Svg
            style={StyleSheet.absoluteFill}
            width="100%"
            height={110}
            viewBox="0 0 375 110"
            preserveAspectRatio="none"
          >
            <Path
              d="M30,42 Q60,35 90,42"
              stroke="rgba(255,255,255,0.5)"
              strokeWidth={1.5}
              fill="none"
            />
            <Path
              d="M160,38 Q200,30 240,38"
              stroke="rgba(255,255,255,0.4)"
              strokeWidth={1.5}
              fill="none"
            />
            <Path
              d="M290,43 Q320,36 355,43"
              stroke="rgba(255,255,255,0.35)"
              strokeWidth={1.2}
              fill="none"
            />
          </Svg>
        </View>

        {/* Solid teal fill from front wave to bottom of screen */}
        <View style={styles.waveFill} />
      </View>

      {/* ─── LAYER 3 — BOTTOM CTA ─── */}
      <View style={styles.ctaLayer}>
        <Pressable
          style={styles.ctaButton}
          onPress={() => router.push('/auth/email')}
        >
          <Text style={styles.ctaButtonText}>See your Net Worth</Text>
        </Pressable>

        <Text style={styles.signInText}>
          {'Already have an account? '}
          <Text style={styles.signInBold} onPress={() => router.push('/auth/signin')}>
            Sign in
          </Text>
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
    fontSize: 48,
    fontWeight: '300',
    color: '#27231C',
    letterSpacing: 5.5,
    marginBottom: 32,
    textAlign: 'center',
  },
  anchorSvg: {
    marginBottom: 36,
  },
  tagline: {
    fontSize: 15,
    fontWeight: '300',
    color: 'rgba(39,35,28,0.60)',
    textAlign: 'center',
    lineHeight: 24,
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
  signInText: {
    color: 'rgba(243,231,211,0.75)',
    fontSize: 13,
    fontWeight: '300',
  },
  signInBold: {
    color: '#F3E7D3',
    fontWeight: '500',
  },
});
