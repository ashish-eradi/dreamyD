import React from 'react';
import { View } from 'react-native';
// No-op Lottie on web
export default function LottieView({ style, ...props }) {
  return <View style={style} />;
}
