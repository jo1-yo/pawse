/**
 * The onboarding hero — Pawse herself, big and tappable. Each tap switches
 * her to the next performance and she STAYS in that pose (no reset to the
 * heart-hugging idle — that's just the opening state): chomp a fish, wink,
 * sip milk, cycling via a shuffled bag so all three show up across any three
 * taps and never repeat back-to-back. Frames are stacked pre-decoded images
 * so swaps are instant; motion is plain RN Animated (web + native identical).
 *
 * Every tap also launches a few small bits (fish/milk/hearts matching the
 * action) outward from around her body — a quick decelerating toss with a
 * slight droop at the end, gentle rather than an explosion.
 */

import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Platform,
  Pressable,
  StyleSheet,
  View,
  type ViewStyle,
} from 'react-native';

import catFish from '../../assets/images/pawse-cat-fish.png';
import catMilk from '../../assets/images/pawse-cat-milk.png';
import catOpen from '../../assets/images/pawse-cat-open.png';
import catWink from '../../assets/images/pawse-cat-wink.png';
import catIdle from '../../assets/images/pawse-cat.png';
import { C, Text } from '@/components/ui';
import { Spacing } from '@/constants/theme';

const NATIVE = Platform.OS !== 'web';

type Action = 'eat' | 'wink' | 'milk';
const ACTIONS: Action[] = ['eat', 'wink', 'milk'];

// Kill the browser focus ring on the tap target (web only).
const NO_FOCUS_RING =
  Platform.OS === 'web' ? ({ outlineStyle: 'none' } as unknown as ViewStyle) : undefined;

type FrameName = 'idle' | 'open' | 'fish' | 'wink' | 'milk';
const FRAMES: Record<FrameName, number> = {
  idle: catIdle,
  open: catOpen,
  fish: catFish,
  wink: catWink,
  milk: catMilk,
};
const FRAME_NAMES = Object.keys(FRAMES) as FrameName[];

// The little things she sheds when tapped. The lead bit matches the action
// (fish when she eats, milk when she sips); the rest are hearts and paws.
const DRIFT_POOL: Record<Action | 'idle', { lead: string; rest: string[] }> = {
  eat: { lead: '🐟', rest: ['💗', '🐾', '💗'] },
  milk: { lead: '🥛', rest: ['💗', '🐾', '💗'] },
  wink: { lead: '💗', rest: ['💖', '🐾', '💗'] },
  idle: { lead: '💗', rest: ['💖', '🐾', '💗'] },
};

type Drifter = {
  id: number;
  emoji: string;
  left: number;
  top: number;
  fontSize: number;
  dx: number;
  dy: number;
  droop: number;
  spin: number;
  delay: number;
  duration: number;
};

/**
 * One drifting bit. Owns its progress value and starts the animation on
 * mount — starting before mount lets a re-render detach the value and
 * freeze the animation one frame in.
 */
function DrifterBit({ drifter, onDone }: { drifter: Drifter; onDone: (id: number) => void }) {
  const [progress] = useState(() => new Animated.Value(0));

  useEffect(() => {
    const anim = Animated.timing(progress, {
      toValue: 1,
      duration: drifter.duration,
      delay: drifter.delay,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: NATIVE,
    });
    anim.start(({ finished }) => {
      if (finished) onDone(drifter.id);
    });
    return () => anim.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once per bit
  }, []);

  const style = useMemo(
    () => ({
      position: 'absolute' as const,
      left: drifter.left,
      top: drifter.top,
      fontSize: drifter.fontSize,
      opacity: progress.interpolate({ inputRange: [0, 0.06, 0.62, 1], outputRange: [0, 1, 1, 0] }),
      transform: [
        {
          translateX: progress.interpolate({ inputRange: [0, 1], outputRange: [0, drifter.dx] }),
        },
        {
          // Outward along the launch angle, sagging slightly at the end so
          // the toss reads as physical rather than a straight ray.
          translateY: progress.interpolate({
            inputRange: [0, 0.7, 1],
            outputRange: [0, drifter.dy * 0.8, drifter.dy + drifter.droop],
          }),
        },
        { scale: progress.interpolate({ inputRange: [0, 0.12, 1], outputRange: [0.3, 1, 0.85] }) },
        {
          rotate: progress.interpolate({
            inputRange: [0, 1],
            outputRange: ['0deg', `${drifter.spin}deg`],
          }),
        },
      ],
    }),
    [drifter, progress],
  );

  return <Animated.Text style={style}>{drifter.emoji}</Animated.Text>;
}

export function InteractiveCat({ size = 200 }: { size?: number }) {
  // Lazy state (not refs): stable across renders and safe to read in render.
  const [scale] = useState(() => new Animated.Value(1));
  const [float] = useState(() => new Animated.Value(0));
  const [tilt] = useState(() => new Animated.Value(0));
  const [feeds, setFeeds] = useState(0);
  const [frame, setFrame] = useState<FrameName>('idle');
  const [drifters, setDrifters] = useState<Drifter[]>([]);
  const drifterId = useRef(0);
  const busy = useRef(false);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  // Shuffled bag: every 3 taps she does all 3 actions, order random,
  // never the same action twice in a row.
  const bag = useRef<Action[]>([]);
  const lastAction = useRef<Action | null>(null);

  useEffect(() => {
    const pending = timers.current;
    return () => pending.forEach(clearTimeout);
  }, []);

  // Idle "breathing" float so she feels alive before the first tap.
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(float, {
          toValue: 1,
          duration: 1700,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: NATIVE,
        }),
        Animated.timing(float, {
          toValue: 0,
          duration: 1700,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: NATIVE,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [float]);

  function after(ms: number, fn: () => void) {
    timers.current.push(setTimeout(fn, ms));
  }

  function nextAction(): Action {
    if (bag.current.length === 0) {
      const acts = [...ACTIONS];
      for (let i = acts.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [acts[i], acts[j]] = [acts[j], acts[i]];
      }
      // Don't let a new bag open with the action that just played.
      if (acts[0] === lastAction.current) [acts[0], acts[acts.length - 1]] = [acts[acts.length - 1], acts[0]];
      bag.current = acts;
    }
    const action = bag.current.shift() as Action;
    lastAction.current = action;
    return action;
  }

  /** Switch to the action's pose and hold it. Returns the settle time. */
  function act(action: Action): number {
    if (action === 'wink') {
      setFrame('wink');
      return 350;
    }
    if (action === 'milk') {
      setFrame('milk');
      return 350;
    }
    setFrame('open');
    after(550, () => {
      setFrame('fish');
      // A little gulp when the fish lands.
      Animated.sequence([
        Animated.timing(scale, { toValue: 0.92, duration: 90, useNativeDriver: NATIVE }),
        Animated.spring(scale, { toValue: 1, friction: 4, tension: 140, useNativeDriver: NATIVE }),
      ]).start();
    });
    return 950;
  }

  /**
   * Launch a handful of small bits outward from around her body. Angles are
   * drawn independently (not divided evenly around the circle) with just a
   * light nudge apart when two land too close, so the burst reads as an
   * organic scatter rather than a fixed geometric pattern. All randomness is
   * precomputed into the drifter at spawn time.
   */
  function releaseDrifters(action: Action | 'idle') {
    const pool = DRIFT_POOL[action];
    const born: Drifter[] = [];
    const count = 5 + Math.floor(Math.random() * 3); // 5–7, varies per tap
    const leadIndex = Math.floor(Math.random() * count);
    const angles: number[] = [];
    for (let i = 0; i < count; i++) {
      let angle = Math.random() * Math.PI * 2;
      for (const a of angles) {
        const diff = Math.abs(((angle - a + Math.PI) % (Math.PI * 2)) - Math.PI);
        if (diff < 0.35) angle += 0.35 + Math.random() * 0.3;
      }
      angles.push(angle);
    }
    for (let i = 0; i < count; i++) {
      const angle = angles[i]!;
      const startR = size * (0.28 + Math.random() * 0.14);
      const dist = size * (0.45 + Math.random() * 0.5);
      born.push({
        id: drifterId.current++,
        emoji: i === leadIndex ? pool.lead : pool.rest[Math.floor(Math.random() * pool.rest.length)],
        left: size * 0.5 + Math.cos(angle) * startR,
        top: size * 0.46 + Math.sin(angle) * startR,
        fontSize: size * (0.13 + Math.random() * 0.09),
        dx: Math.cos(angle) * dist,
        dy: Math.sin(angle) * dist,
        droop: size * (0.05 + Math.random() * 0.08),
        spin: (Math.random() * 2 - 1) * 40,
        delay: Math.random() * 180,
        duration: 700 + Math.random() * 350,
      });
    }
    setDrifters((cur) => [...cur, ...born]);
  }

  function removeDrifter(id: number) {
    setDrifters((cur) => cur.filter((d) => d.id !== id));
  }

  function feed() {
    void Haptics.selectionAsync();
    // One switch at a time: while a transition settles, taps still shed
    // hearts so every tap answers back — just no pose change.
    if (busy.current) {
      releaseDrifters('idle');
      return;
    }
    setFeeds((n) => n + 1);
    const action = nextAction();
    releaseDrifters(action);
    const settle = act(action);
    busy.current = true;
    after(settle, () => {
      busy.current = false;
    });

    // Happy squash-and-stretch…
    Animated.sequence([
      Animated.timing(scale, { toValue: 0.82, duration: 90, useNativeDriver: NATIVE }),
      Animated.spring(scale, { toValue: 1, friction: 3, tension: 180, useNativeDriver: NATIVE }),
    ]).start();
    // …with a little wiggle.
    Animated.sequence([
      Animated.timing(tilt, { toValue: 1, duration: 80, useNativeDriver: NATIVE }),
      Animated.timing(tilt, { toValue: -1, duration: 130, useNativeDriver: NATIVE }),
      Animated.timing(tilt, { toValue: 0, duration: 110, useNativeDriver: NATIVE }),
    ]).start();
  }

  const floatY = useMemo(
    () => float.interpolate({ inputRange: [0, 1], outputRange: [0, -7] }),
    [float],
  );
  const rotate = useMemo(
    () => tilt.interpolate({ inputRange: [-1, 1], outputRange: ['-5deg', '5deg'] }),
    [tilt],
  );

  return (
    <View style={styles.wrap}>
      <Pressable onPress={feed} hitSlop={12} accessibilityLabel="Feed Pawse" style={NO_FOCUS_RING}>
        <Animated.View style={{ transform: [{ translateY: floatY }, { scale }, { rotate }] }}>
          {/* All frames stay mounted (pre-decoded) so swaps never flash. */}
          <View style={{ width: size, height: size }}>
            {FRAME_NAMES.map((f) => (
              <Image
                key={f}
                source={FRAMES[f]}
                contentFit="contain"
                style={[StyleSheet.absoluteFill, { opacity: frame === f ? 1 : 0 }]}
              />
            ))}
          </View>
        </Animated.View>
        {/* Drifting bits float above her, outside the squash-and-stretch. */}
        <View pointerEvents="none" style={StyleSheet.absoluteFill}>
          {drifters.map((d) => (
            <DrifterBit key={d.id} drifter={d} onDone={removeDrifter} />
          ))}
        </View>
      </Pressable>
      <Text variant="caption" color={C.textMuted} center>
        {feeds === 0 ? 'Tap to feed Pawse 🐟' : 'purrrr 💗'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', gap: Spacing.three },
});
