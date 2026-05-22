// Web-safe mock for react-native-reanimated
import React from 'react';
import { View, ScrollView as RNScrollView, FlatList as RNFlatList, Text as RNText, Image as RNImage } from 'react-native';

const noopEasingFn = (t) => t;
const wrapEasing = (fn) => fn || noopEasingFn;

export const Easing = {
  linear: noopEasingFn,
  ease: noopEasingFn,
  quad: noopEasingFn,
  cubic: noopEasingFn,
  sin: noopEasingFn,
  sine: noopEasingFn,
  circle: noopEasingFn,
  exp: noopEasingFn,
  bounce: noopEasingFn,
  back: (_s) => noopEasingFn,
  elastic: (_b) => noopEasingFn,
  poly: (_n) => noopEasingFn,
  bezier: (_x1, _y1, _x2, _y2) => noopEasingFn,
  in: (fn) => wrapEasing(fn),
  out: (fn) => wrapEasing(fn),
  inOut: (fn) => wrapEasing(fn),
  step0: noopEasingFn,
  step1: noopEasingFn,
};

export const useSharedValue = (init) => ({ value: init });

export const useAnimatedStyle = (fn) => {
  try { const r = fn(); return r || {}; } catch { return {}; }
};

export const withTiming = (toValue) => toValue;
export const withSpring = (toValue) => toValue;
export const withDecay = (config) => 0;
export const withRepeat = (animation) => animation;
export const withSequence = (...anims) => anims[anims.length - 1] ?? 0;
export const withDelay = (_delay, anim) => anim;
export const cancelAnimation = () => {};
export const interpolate = (val, input, output) => {
  if (!input || !output || input.length === 0) return 0;
  const idx = input.findIndex((v, i) => v >= val);
  if (idx <= 0) return output[0];
  if (idx >= output.length) return output[output.length - 1];
  return output[idx];
};
export const Extrapolation = { CLAMP: 'clamp', EXTEND: 'extend', IDENTITY: 'identity' };
export const runOnJS = (fn) => fn;
export const runOnUI = (fn) => fn;
export const useAnimatedGestureHandler = () => ({});
export const useAnimatedScrollHandler = () => () => {};
export const useAnimatedRef = () => React.createRef();
export const useAnimatedReaction = () => {};
export const useDerivedValue = (fn) => ({ value: fn() });
export const useFrameCallback = () => {};
export const useWorkletCallback = (fn) => fn;

const createAnimatedComponent = (Component) =>
  React.forwardRef(({ style, ...rest }, ref) => (
    <Component ref={ref} style={style} {...rest} />
  ));

const AnimatedView = createAnimatedComponent(View);

const Animated = {
  View: AnimatedView,
  Text: createAnimatedComponent(RNText),
  Image: createAnimatedComponent(RNImage),
  ScrollView: createAnimatedComponent(RNScrollView),
  FlatList: createAnimatedComponent(RNFlatList),
  createAnimatedComponent,
};

export { AnimatedView as AnimatedView };

// Layout animation stubs
const makeLayoutAnim = () => {
  const anim = {
    delay: function() { return this; },
    duration: function() { return this; },
    easing: function() { return this; },
    springify: function() { return this; },
    damping: function() { return this; },
    stiffness: function() { return this; },
    withInitialValues: function() { return this; },
    build: () => () => ({}),
  };
  return anim;
};

export const FadeIn = makeLayoutAnim();
export const FadeOut = makeLayoutAnim();
export const FadeInUp = makeLayoutAnim();
export const FadeInDown = makeLayoutAnim();
export const FadeInLeft = makeLayoutAnim();
export const FadeInRight = makeLayoutAnim();
export const FadeOutUp = makeLayoutAnim();
export const FadeOutDown = makeLayoutAnim();
export const SlideInUp = makeLayoutAnim();
export const SlideInDown = makeLayoutAnim();
export const SlideInLeft = makeLayoutAnim();
export const SlideInRight = makeLayoutAnim();
export const SlideOutUp = makeLayoutAnim();
export const SlideOutDown = makeLayoutAnim();
export const ZoomIn = makeLayoutAnim();
export const ZoomOut = makeLayoutAnim();
export const ZoomInDown = makeLayoutAnim();
export const ZoomInUp = makeLayoutAnim();
export const BounceIn = makeLayoutAnim();
export const BounceOut = makeLayoutAnim();
export const LightSpeedInLeft = makeLayoutAnim();
export const LightSpeedInRight = makeLayoutAnim();
export const FlipInEasyX = makeLayoutAnim();
export const FlipInEasyY = makeLayoutAnim();
export const StretchInX = makeLayoutAnim();
export const StretchInY = makeLayoutAnim();
export const Layout = makeLayoutAnim();
export const LinearTransition = makeLayoutAnim();
export const CurvedTransition = makeLayoutAnim();
export const EntryExitTransition = makeLayoutAnim();

export default Animated;
