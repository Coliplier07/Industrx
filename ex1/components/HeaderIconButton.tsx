import React from 'react';
import { StyleSheet, TouchableOpacity, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface HeaderIconButtonProps {
  name: React.ComponentProps<typeof Ionicons>['name'];
  onPress: () => void;
  style?: ViewStyle;
}

export default function HeaderIconButton({ name, onPress, style }: HeaderIconButtonProps) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.6}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      style={[styles.button, style]}
    >
      <Ionicons name={name} size={24} color="#fff" />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
