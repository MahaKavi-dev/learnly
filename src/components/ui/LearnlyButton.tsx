import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  View,
  ViewStyle,
  TextStyle,
} from 'react-native';

export type ButtonVariant = 'primary' | 'secondary' | 'success' | 'retry' | 'outline';

interface LearnlyButtonProps {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: 'normal' | 'large';
  icon?: string;
  disabled?: boolean;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
  labelStyle?: TextStyle;
  accessibilityLabel?: string;
}

export const LearnlyButton: React.FC<LearnlyButtonProps> = ({
  label,
  onPress,
  variant = 'primary',
  size = 'large',
  icon,
  disabled = false,
  loading = false,
  style,
  labelStyle,
  accessibilityLabel,
}) => {
  const getVariantStyles = () => {
    switch (variant) {
      case 'secondary':
        return {
          bg: '#8B5CF6',
          borderBottom: '#7C3AED',
          text: '#FFFFFF',
        };
      case 'success':
        return {
          bg: '#10B981',
          borderBottom: '#059669',
          text: '#FFFFFF',
        };
      case 'retry':
        return {
          bg: '#F43F5E',
          borderBottom: '#E11D48',
          text: '#FFFFFF',
        };
      case 'outline':
        return {
          bg: '#FFFFFF',
          borderBottom: '#CBD5E1',
          text: '#4F46E5',
          borderWidth: 2,
          borderColor: '#E2E8F0',
        };
      case 'primary':
      default:
        return {
          bg: '#4F46E5',
          borderBottom: '#4338CA',
          text: '#FFFFFF',
        };
    }
  };

  const colors = getVariantStyles();

  return (
    <Pressable
      style={({ pressed }) => [
        styles.button,
        size === 'large' ? styles.large : styles.normal,
        {
          backgroundColor: colors.bg,
          borderBottomColor: colors.borderBottom,
          borderWidth: colors.borderWidth || 0,
          borderColor: colors.borderColor || 'transparent',
        },
        disabled && styles.disabled,
        pressed && !disabled && styles.pressed,
        style,
      ]}
      onPress={onPress}
      disabled={disabled || loading}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel || label}
    >
      {loading ? (
        <ActivityIndicator color={colors.text} size="small" />
      ) : (
        <View style={styles.contentRow}>
          {icon && <Text style={styles.icon}>{icon}</Text>}
          <Text
            style={[
              styles.label,
              size === 'large' ? styles.labelLarge : styles.labelNormal,
              { color: colors.text },
              labelStyle,
            ]}
          >
            {label}
          </Text>
        </View>
      )}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  button: {
    borderRadius: 20,
    borderBottomWidth: 4,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  normal: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    minHeight: 48,
  },
  large: {
    paddingHorizontal: 24,
    paddingVertical: 16,
    minHeight: 56,
    width: '100%',
  },
  disabled: {
    opacity: 0.5,
  },
  pressed: {
    transform: [{ translateY: 2 }],
    borderBottomWidth: 2,
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  icon: {
    fontSize: 20,
  },
  label: {
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: 0.3,
  },
  labelNormal: {
    fontSize: 16,
  },
  labelLarge: {
    fontSize: 18,
  },
});
