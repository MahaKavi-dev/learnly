import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

export type MicButtonState = 'IDLE' | 'REQUESTING' | 'READY' | 'LISTENING' | 'TRANSCRIBING' | 'DENIED';

interface MicrophoneButtonProps {
  state: MicButtonState;
  onPress: () => void;
  disabled?: boolean;
}

export const MicrophoneButton: React.FC<MicrophoneButtonProps> = ({
  state,
  onPress,
  disabled = false,
}) => {
  const getMicStyles = () => {
    switch (state) {
      case 'LISTENING':
        return {
          bg: '#FFE4E6',
          border: '#F43F5E',
          depth: '#E11D48',
          emoji: '🎙️',
          label: 'Listening...',
        };
      case 'TRANSCRIBING':
      case 'REQUESTING':
        return {
          bg: '#FEF3C7',
          border: '#F59E0B',
          depth: '#D97706',
          emoji: '⏳',
          label: 'Processing...',
        };
      case 'READY':
        return {
          bg: '#D1FAE5',
          border: '#10B981',
          depth: '#059669',
          emoji: '✨',
          label: 'Tap to Read',
        };
      case 'DENIED':
        return {
          bg: '#FFE4E6',
          border: '#F43F5E',
          depth: '#E11D48',
          emoji: '🔒',
          label: 'Mic Denied',
        };
      case 'IDLE':
      default:
        return {
          bg: '#EEF2FF',
          border: '#4F46E5',
          depth: '#4338CA',
          emoji: '🎤',
          label: 'Tap to Speak',
        };
    }
  };

  const styleConfig = getMicStyles();
  const isLoading = state === 'REQUESTING' || state === 'TRANSCRIBING';

  return (
    <View style={styles.container}>
      <Pressable
        style={({ pressed }) => [
          styles.button,
          {
            backgroundColor: styleConfig.bg,
            borderColor: styleConfig.border,
            borderBottomColor: styleConfig.depth,
          },
          pressed && !disabled && styles.pressed,
          disabled && styles.disabled,
        ]}
        onPress={onPress}
        disabled={disabled || isLoading}
        accessibilityRole="button"
        accessibilityLabel={styleConfig.label}
      >
        {isLoading ? (
          <ActivityIndicator color={styleConfig.border} size="large" />
        ) : (
          <Text style={styles.emoji}>{styleConfig.emoji}</Text>
        )}
      </Pressable>
      <Text style={styles.statusLabel}>{styleConfig.label}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: 8,
  },
  button: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 3,
    borderBottomWidth: 6,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 5,
  },
  pressed: {
    transform: [{ translateY: 3 }],
    borderBottomWidth: 3,
  },
  disabled: {
    opacity: 0.6,
  },
  emoji: {
    fontSize: 42,
  },
  statusLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
});
