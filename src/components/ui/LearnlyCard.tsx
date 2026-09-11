import React from 'react';
import { Pressable, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';

interface LearnlyCardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  accentColor?: string;
  onPress?: () => void;
  variant?: 'elevated' | 'outlined' | 'flat';
  radius?: number;
}

export const LearnlyCard: React.FC<LearnlyCardProps> = ({
  children,
  style,
  accentColor,
  onPress,
  variant = 'elevated',
  radius = 20,
}) => {
  const cardStyle = [
    styles.card,
    { borderRadius: radius },
    variant === 'elevated' && styles.elevated,
    variant === 'outlined' && styles.outlined,
    variant === 'flat' && styles.flat,
    accentColor ? { borderLeftWidth: 5, borderLeftColor: accentColor } : null,
    style,
  ];

  if (onPress) {
    return (
      <Pressable
        style={({ pressed }) => [cardStyle, pressed && styles.pressed]}
        onPress={onPress}
      >
        {children}
      </Pressable>
    );
  }

  return <View style={cardStyle}>{children}</View>;
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    width: '100%',
  },
  elevated: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  outlined: {
    borderWidth: 2,
    borderColor: '#E2E8F0',
  },
  flat: {
    backgroundColor: '#F1F5F9',
  },
  pressed: {
    opacity: 0.92,
    transform: [{ scale: 0.985 }, { translateY: 1 }],
  },
});
