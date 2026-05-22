// Web-safe mock for react-native-gesture-handler
export const GestureHandlerRootView = ({ children, style, ...props }) => {
  const React = require('react');
  const { View } = require('react-native');
  return React.createElement(View, { style, ...props }, children);
};
export const Gesture = {
  Pan: () => ({ onUpdate: function(cb) { this._onUpdate = cb; return this; }, onEnd: function(cb) { this._onEnd = cb; return this; } }),
  Pinch: () => ({ onUpdate: function(cb) { this._onUpdate = cb; return this; }, onEnd: function(cb) { this._onEnd = cb; return this; } }),
  Simultaneous: (...gs) => gs[0],
  Race: (...gs) => gs[0],
  Exclusive: (...gs) => gs[0],
};
export const GestureDetector = ({ children }) => children;
export const PanGestureHandler = ({ children }) => children;
export const TapGestureHandler = ({ children }) => children;
export const PinchGestureHandler = ({ children }) => children;
export const State = {};
export const ScrollView = require('react-native').ScrollView;
export const FlatList = require('react-native').FlatList;
export const TextInput = require('react-native').TextInput;
export default { GestureHandlerRootView, Gesture, GestureDetector };
