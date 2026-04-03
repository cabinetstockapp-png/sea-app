import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import type { SharedValue } from 'react-native-reanimated';
import Animated, {
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { useStore } from '@/context/StoreContext';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle } from 'react-native-svg';

const HOME_BG = require('@/assets/images/home.png');

const ACTIONS = [
  { key: 'scan', label: 'Scan', icon: 'qr-code-scanner' as const },
  { key: 'assign', label: 'Assign', icon: 'assignment' as const },
  { key: 'library', label: 'Library', icon: 'archive' as const },
];

type ActionDef = (typeof ACTIONS)[number];

/** Teal aligned with background horizontal glow (less neon). */
const GLOW_GREEN = '#085244';
/** Atmospheric falloff: wider outer fade, inner glow balanced vs haze. */
const GLOW_LAYERS: { strokeWidth: number; opacity: number }[] = [
  // outer (very soft fade)
  { strokeWidth: 12.5, opacity: 0.006 },
  { strokeWidth: 12, opacity: 0.008 },
  { strokeWidth: 11.5, opacity: 0.01 },
  { strokeWidth: 11, opacity: 0.012 },
  { strokeWidth: 10.5, opacity: 0.014 },
  { strokeWidth: 10, opacity: 0.016 },
  { strokeWidth: 9.5, opacity: 0.018 },
  { strokeWidth: 9, opacity: 0.02 },

  // outer-mid
  { strokeWidth: 8.5, opacity: 0.024 },
  { strokeWidth: 8, opacity: 0.028 },
  { strokeWidth: 7.5, opacity: 0.034 },
  { strokeWidth: 7, opacity: 0.04 },
  { strokeWidth: 6.5, opacity: 0.048 },
  { strokeWidth: 6, opacity: 0.058 },
  { strokeWidth: 5.5, opacity: 0.07 },
  { strokeWidth: 5, opacity: 0.085 },

  // mid glow (main body)
  { strokeWidth: 4.5, opacity: 0.105 },
  { strokeWidth: 4, opacity: 0.13 },
  { strokeWidth: 3.5, opacity: 0.16 },
  { strokeWidth: 3, opacity: 0.19 },
  { strokeWidth: 2.6, opacity: 0.215 },
  { strokeWidth: 2.3, opacity: 0.235 },

  // inner glow (strong but tight)
  { strokeWidth: 2.0, opacity: 0.255 },
  { strokeWidth: 1.8, opacity: 0.27 },
  { strokeWidth: 1.6, opacity: 0.285 },
  { strokeWidth: 1.4, opacity: 0.295 },
  { strokeWidth: 1.2, opacity: 0.305 },
  { strokeWidth: 1.05, opacity: 0.31 },
  { strokeWidth: 0.95, opacity: 0.315 },
  { strokeWidth: 0.85, opacity: 0.32 },
];
const CORE_STROKE = 0.3;
const CORE_GREEN = '#FFFFFF';
const SVG_PAD = 14;
const PRESS_SCALE = 0.97;
const PRESS_IN_MS = 95;
const PRESS_OUT_MS = 170;

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

function AnimatedGlowLayer({
  cx,
  cy,
  rPath,
  strokeWidth,
  baseOpacity,
  press,
  ripple,
  index,
}: {
  cx: number;
  cy: number;
  rPath: number;
  strokeWidth: number;
  baseOpacity: number;
  press: SharedValue<number>;
  ripple: SharedValue<number>;
  index: number;
}) {
  const animatedProps = useAnimatedProps(() => {
    const p = press?.value ?? 0;
    const t = ripple.value + index * 0.035;
    const phase = t - Math.floor(t);
    const wave = Math.exp(-Math.pow((phase - 0.5) * 4, 2));
    return {
      opacity: baseOpacity * (1 + p * 0.6) * (1 + wave * 0.8),
    };
  });
  return (
    <AnimatedCircle
      cx={cx}
      cy={cy}
      r={rPath}
      fill="none"
      stroke={GLOW_GREEN}
      strokeWidth={strokeWidth}
      animatedProps={animatedProps}
    />
  );
}

function AnimatedCoreRing({
  cx,
  cy,
  rPath,
  press,
}: {
  cx: number;
  cy: number;
  rPath: number;
  press: SharedValue<number>;
}) {
  const animatedProps = useAnimatedProps(() => {
    const p = press?.value ?? 0;
    return {
      strokeWidth: CORE_STROKE * (1 + p * 0.1),
    };
  });
  return (
    <AnimatedCircle
      cx={cx}
      cy={cy}
      r={rPath}
      fill="none"
      stroke={CORE_GREEN}
      animatedProps={animatedProps}
    />
  );
}

/** Concentric stroke stack only — no SVG filters. */
function HomeIconRing({
  D,
  ringId: _ringId,
  press,
}: {
  D: number;
  ringId: string;
  press?: SharedValue<number>;
}) {
  const cx = D / 2;
  const cy = D / 2;
  const rPath = D / 2 - CORE_STROKE / 2;
  const ripple = useSharedValue(0);

  useEffect(() => {
    ripple.value = withRepeat(withTiming(1, { duration: 2200 }), -1, false);
  }, [ripple]);

  return (
    <View style={{ width: D, height: D }} pointerEvents="none">
      <Svg
        width={D}
        height={D}
        viewBox={`${-SVG_PAD} ${-SVG_PAD} ${D + 2 * SVG_PAD} ${D + 2 * SVG_PAD}`}>
        {GLOW_LAYERS.map((layer, i) =>
          press ? (
            <AnimatedGlowLayer
              key={i}
              cx={cx}
              cy={cy}
              rPath={rPath}
              strokeWidth={layer.strokeWidth}
              baseOpacity={layer.opacity}
              press={press}
              ripple={ripple}
              index={i}
            />
          ) : (
            <Circle
              key={i}
              cx={cx}
              cy={cy}
              r={rPath}
              fill="none"
              stroke={GLOW_GREEN}
              strokeWidth={layer.strokeWidth}
              opacity={layer.opacity}
            />
          ),
        )}
        {press ? (
          <AnimatedCoreRing cx={cx} cy={cy} rPath={rPath} press={press} />
        ) : (
          <Circle
            cx={cx}
            cy={cy}
            r={rPath}
            fill="none"
            stroke={CORE_GREEN}
            strokeWidth={CORE_STROKE}
          />
        )}
      </Svg>
    </View>
  );
}

function HomeAction({ action, ringSize }: { action: ActionDef; ringSize: number }) {
  const { lastScannedBarcode } = useStore();
  const D = ringSize;
  const touchW = D + 8;
  const press = useSharedValue(0);

  const ringSlotStyle = useAnimatedStyle(() => {
    const p = press.value;
    return {
      transform: [{ scale: 1 + p * (PRESS_SCALE - 1) }],
    };
  });

  const onPressIn = () => {
    press.value = withTiming(1, { duration: PRESS_IN_MS });
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const onPressOut = () => {
    press.value = withTiming(0, { duration: PRESS_OUT_MS });
  };

  const onPress = () => {
    switch (action.key) {
      case 'assign':
        router.push({
          pathname: '/Assign',
          params: { barcode: lastScannedBarcode ?? '' },
        });
        break;
      case 'scan':
        router.push({ pathname: '/Scan' });
        break;
      case 'library':
        router.push('/library');
        break;
    }
  };

  return (
    <View style={styles.actionSlot} pointerEvents="box-none">
      <Pressable
        style={[styles.actionHit, { width: touchW }]}
        accessibilityRole="button"
        accessibilityLabel={action.label}
        onPress={onPress}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        hitSlop={{ top: 6, bottom: 12 }}
        android_ripple={{ color: '#00000000', borderless: true }}>
        <View style={[styles.hitOuter, { width: touchW, height: D + 32 }]}>
          <Animated.View style={[styles.ringSlot, { width: D, height: D }, ringSlotStyle]}>
            <HomeIconRing D={D} ringId={action.key} press={press} />
            <View style={styles.iconSlot} pointerEvents="none">
              <View style={[styles.iconFrame, { width: D * 0.5, height: D * 0.5 }]}>
                <MaterialIcons name={action.icon} size={D * 0.4} color="#F5F5F5" />
              </View>
            </View>
          </Animated.View>
        </View>
        <Text style={[styles.caption, { maxWidth: touchW }]}>{action.label}</Text>
      </Pressable>
    </View>
  );
}

export default function HomeScreen() {
  const { width } = useWindowDimensions();
  const ringSize = Math.min(width * 0.2, 78) * 1.03 * 1.02 * 1.05;

  return (
    <View style={styles.root}>
      <Image
        source={HOME_BG}
        style={styles.background}
        contentFit="cover"
        pointerEvents="none"
      />
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.column}>
          <View style={styles.flexTop} />
          <View style={styles.row}>
            {ACTIONS.map((action) => (
              <HomeAction key={action.key} action={action} ringSize={ringSize} />
            ))}
          </View>
          <View style={styles.flexBottom} />
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#000',
  },
  background: {
    ...StyleSheet.absoluteFillObject,
  },
  safe: {
    flex: 1,
  },
  column: {
    flex: 1,
  },
  flexTop: {
    flex: 3.45,
    minHeight: 0,
  },
  flexBottom: {
    flex: 0.92,
    minHeight: 0,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'center',
    gap: 20,
    paddingHorizontal: 12,
  },
  actionSlot: {
    flex: 1,
    alignItems: 'center',
  },
  actionHit: {
    alignItems: 'center',
    alignSelf: 'center',
    gap: 12,
    overflow: 'visible',
  },
  hitOuter: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringSlot: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconSlot: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconFrame: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  caption: {
    color: '#ECECEC',
    fontSize: 15,
    fontWeight: '400',
    letterSpacing: 0.2,
    textAlign: 'center',
  },
});
