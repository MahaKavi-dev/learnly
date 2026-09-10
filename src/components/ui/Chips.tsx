import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

export const XPChip: React.FC<{ xp: number }> = ({ xp }) => (
  <View style={[styles.chip, styles.xpChip]}>
    <Text style={styles.chipIcon}>✨</Text>
    <Text style={styles.xpText}>{xp} XP</Text>
  </View>
);

export const StreakChip: React.FC<{ streak: number; label?: string }> = ({ streak, label }) => (
  <View style={[styles.chip, styles.streakChip]}>
    <Text style={styles.chipIcon}>🔥</Text>
    <Text style={styles.streakText}>{streak} {label || 'Days'}</Text>
  </View>
);

export const LevelChip: React.FC<{ level: number }> = ({ level }) => (
  <View style={[styles.chip, styles.levelChip]}>
    <Text style={styles.chipIcon}>🌟</Text>
    <Text style={styles.levelText}>Lvl {level}</Text>
  </View>
);

export const LanguageChip: React.FC<{ lang: 'en' | 'ta'; onPress?: () => void }> = ({ lang, onPress }) => {
  const isTa = lang === 'ta';
  const content = (
    <View style={[styles.chip, styles.langChip]}>
      <Text style={styles.chipIcon}>{isTa ? '🇮🇳' : '🇬🇧'}</Text>
      <Text style={styles.langText}>{isTa ? 'தமிழ்' : 'English'}</Text>
    </View>
  );

  if (onPress) {
    return <Pressable onPress={onPress}>{content}</Pressable>;
  }

  return content;
};

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 9999,
    gap: 6,
  },
  chipIcon: {
    fontSize: 14,
  },
  xpChip: {
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#F59E0B',
  },
  xpText: {
    color: '#B45309',
    fontSize: 14,
    fontWeight: '800',
  },
  streakChip: {
    backgroundColor: '#FFE4E6',
    borderWidth: 1,
    borderColor: '#F43F5E',
  },
  streakText: {
    color: '#E11D48',
    fontSize: 14,
    fontWeight: '800',
  },
  levelChip: {
    backgroundColor: '#EDE9FE',
    borderWidth: 1,
    borderColor: '#8B5CF6',
  },
  levelText: {
    color: '#6D28D9',
    fontSize: 14,
    fontWeight: '800',
  },
  langChip: {
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  langText: {
    color: '#334155',
    fontSize: 13,
    fontWeight: '700',
  },
});
