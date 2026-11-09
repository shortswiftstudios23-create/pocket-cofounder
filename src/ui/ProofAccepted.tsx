import { useEffect } from 'react';
import { View, Text, AccessibilityInfo } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withSpring, withTiming, withDelay, useReducedMotion, runOnJS, Easing } from 'react-native-reanimated';
import { Check } from 'lucide-react-native';
import { color, type, font, size, space, motion } from '@/theme/tokens';

/** Full-screen celebration. With reduced motion: no scale/ring, just a short fade, then dismiss. */
export function ProofAccepted({ streak, onDone }: { streak: number; onDone: () => void }) {
  const reduce = useReducedMotion();
  const fade = useSharedValue(0), pop = useSharedValue(reduce ? 1 : 0.4), ring = useSharedValue(0), label = useSharedValue(0);
  useEffect(() => {
    AccessibilityInfo.announceForAccessibility(`Proof accepted. Streak ${streak}.`);
    fade.value = withTiming(1, { duration: motion.fast });
    if (!reduce) {
      pop.value = withSpring(1, motion.spring);
      ring.value = withTiming(1, { duration: motion.slow * 2, easing: Easing.out(Easing.cubic) });
    }
    label.value = withDelay(reduce ? 0 : motion.fast, withTiming(1, { duration: motion.fast }));
    fade.value = withDelay(reduce ? 1200 : 1600, withTiming(0, { duration: motion.fast }, done => { if (done) runOnJS(onDone)(); }));
  }, []);
  const bg = useAnimatedStyle(() => ({ opacity: fade.value }));
  const badge = useAnimatedStyle(() => ({ transform: [{ scale: pop.value }] }));
  const halo = useAnimatedStyle(() => ({ opacity: reduce ? 0 : 0.6 * (1 - ring.value), transform: [{ scale: 1 + ring.value * 1.2 }] }));
  const text = useAnimatedStyle(() => ({ opacity: label.value }));
  return (
    <Animated.View pointerEvents="none" style={[{ position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, backgroundColor: color.bg, alignItems: 'center', justifyContent: 'center', gap: space[4] }, bg]}>
      <View style={{ width: size.hero, height: size.hero, alignItems: 'center', justifyContent: 'center' }}>
        <Animated.View style={[{ position: 'absolute', width: size.hero, height: size.hero, borderRadius: size.hero, borderWidth: 2, borderColor: color.lime500 }, halo]} />
        <Animated.View style={[{ width: size.hero, height: size.hero, borderRadius: size.hero, backgroundColor: color.lime500, alignItems: 'center', justifyContent: 'center' }, badge]}>
          <Check size={size.hero / 2} color={color.onLime} strokeWidth={3} />
        </Animated.View>
      </View>
      <Animated.View style={[{ alignItems: 'center' }, text]}>
        <Text style={{ ...type.title, fontFamily: font.bold, color: color.textPrimary }}>Proof accepted</Text>
        <Text style={{ ...type.body, color: color.lime400 }}>{streak} day streak</Text>
      </Animated.View>
    </Animated.View>);
}
