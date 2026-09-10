import React, { useEffect, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { subscribeGamificationState } from '@/services/gamification';
import { Language } from '@/types/exercise';
import { UserProgressState } from '@/types/gamification';
import { checkBadges, getLevelProgressDetails } from '@/utils/gamification';

export default function ProgressScreen() {
  const theme = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams<{ lang?: string }>();

  // Determine current language from route param (defaults to English)
  const lang: Language = params.lang === 'ta' ? 'ta' : 'en';

  const [progressState, setProgressState] = useState<UserProgressState | null>(null);

  useEffect(() => {
    const unsubscribe = subscribeGamificationState((state) => {
      setProgressState(state);
    });
    return unsubscribe;
  }, []);

  if (!progressState) return null;

  const levelDetails = getLevelProgressDetails(progressState.xp);
  const badgesList = checkBadges(progressState);

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: theme.background }]}
      edges={['top', 'left', 'right']}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.container}>
          {/* Top Header Bar */}
          <View style={styles.topBar}>
            <Pressable
              style={({ pressed }) => [
                styles.backButton,
                { backgroundColor: theme.backgroundElement },
                pressed && styles.buttonPressed,
              ]}
              onPress={() => router.back()}
              accessibilityRole="button"
              accessibilityLabel="Back to Home"
            >
              <Text style={[styles.backButtonText, { color: theme.text }]}>← Back</Text>
            </Pressable>

            <View style={styles.titleContainer}>
              <Text style={[styles.screenTitle, { color: theme.text }]}>
                {lang === 'ta' ? 'முன்னேற்றம்' : 'My Progress'}
              </Text>
            </View>

            <View style={[styles.langBadge, { backgroundColor: theme.backgroundElement }]}>
              <Text style={styles.langBadgeText}>
                {lang === 'ta' ? 'தமிழ் 🇮🇳' : 'English 🇬🇧'}
              </Text>
            </View>
          </View>

          {/* Level & XP Hero Banner */}
          <View style={styles.levelBanner}>
            <View style={styles.levelHeaderRow}>
              <View style={styles.levelBadge}>
                <Text style={styles.levelBadgeText}>
                  {lang === 'ta' ? `நிலை ${levelDetails.currentLevel}` : `Level ${levelDetails.currentLevel}`}
                </Text>
              </View>
              <Text style={styles.xpText}>
                ✨ {progressState.xp} XP
              </Text>
            </View>

            {/* Level XP Progress Bar */}
            <View style={styles.levelProgressContainer}>
              <View style={styles.levelProgressLabelRow}>
                <Text style={styles.levelProgressLabel}>
                  {levelDetails.currentLevel < 3
                    ? lang === 'ta'
                      ? `அடுத்த நிலை ${levelDetails.nextLevel} பெற`
                      : `Progress to Level ${levelDetails.nextLevel}`
                    : lang === 'ta'
                    ? 'உச்ச நிலை எட்டப்பட்டது!'
                    : 'Max Level Reached!'}
                </Text>
                <Text style={styles.levelProgressXP}>
                  {levelDetails.currentLevel < 3
                    ? `${progressState.xp} / ${levelDetails.maxXP} XP`
                    : `${progressState.xp} XP`}
                </Text>
              </View>
              <View style={styles.progressBarTrack}>
                <View
                  style={[
                    styles.progressBarFill,
                    { width: `${levelDetails.percent}%` },
                  ]}
                />
              </View>
            </View>
          </View>

          {/* Streaks Stats Grid */}
          <View style={styles.statsGrid}>
            <View style={[styles.statCard, { backgroundColor: theme.backgroundElement }]}>
              <Text style={styles.statEmoji}>🔥</Text>
              <Text style={[styles.statValue, { color: theme.text }]}>
                {progressState.currentStreak} {lang === 'ta' ? 'நாட்கள்' : 'Days'}
              </Text>
              <Text style={[styles.statLabel, { color: theme.textSecondary }]}>
                {lang === 'ta' ? 'தற்போதைய தொடர்' : 'Current Streak'}
              </Text>
            </View>

            <View style={[styles.statCard, { backgroundColor: theme.backgroundElement }]}>
              <Text style={styles.statEmoji}>🏆</Text>
              <Text style={[styles.statValue, { color: theme.text }]}>
                {progressState.longestStreak} {lang === 'ta' ? 'நாட்கள்' : 'Days'}
              </Text>
              <Text style={[styles.statLabel, { color: theme.textSecondary }]}>
                {lang === 'ta' ? 'மிக நீண்ட தொடர்' : 'Best Streak'}
              </Text>
            </View>
          </View>

          {/* Weak Skill Recommendation Banner */}
          {progressState.weakSkill && (
            <View style={styles.weakSkillBox}>
              <Text style={styles.weakSkillTitle}>
                💡 {lang === 'ta' ? 'பயிற்சி தேவைப்படும் திறன்:' : 'Needs Practice:'}
              </Text>
              <Text style={styles.weakSkillName}>
                {progressState.weakSkill}
              </Text>
              <Text style={styles.weakSkillSubtext}>
                {lang === 'ta'
                  ? 'இந்தத் திறனில் மேலும் பயிற்சி செய்து புள்ளிகளை உயர்த்தவும்!'
                  : 'Keep practicing this skill to improve your score!'}
              </Text>
            </View>
          )}

          {/* Performance Breakdown Section */}
          <Text style={[styles.sectionHeading, { color: theme.text }]}>
            {lang === 'ta' ? 'திறன் விவரங்கள்' : 'Skill Performance'}
          </Text>

          <View style={styles.performanceGrid}>
            {/* Reading Stats Card */}
            <View style={[styles.skillCard, { backgroundColor: theme.backgroundElement }]}>
              <View style={styles.skillCardHeader}>
                <Text style={styles.skillCardEmoji}>📖</Text>
                <View>
                  <Text style={[styles.skillCardTitle, { color: theme.text }]}>
                    {lang === 'ta' ? 'வாசித்தல்' : 'Reading'}
                  </Text>
                  <Text style={[styles.skillCardSubtitle, { color: theme.textSecondary }]}>
                    {progressState.readingCompleted} {lang === 'ta' ? 'பயிற்சிகள் முடிந்தது' : 'Exercises done'}
                  </Text>
                </View>
              </View>

              <View style={styles.metricRow}>
                <Text style={[styles.metricName, { color: theme.textSecondary }]}>
                  {lang === 'ta' ? 'துல்லியம்:' : 'Accuracy:'}
                </Text>
                <Text style={[styles.metricVal, { color: theme.text }]}>
                  {progressState.readingAccuracy}%
                </Text>
              </View>

              <View style={styles.metricRow}>
                <Text style={[styles.metricName, { color: theme.textSecondary }]}>
                  {lang === 'ta' ? 'சரளம்:' : 'Fluency:'}
                </Text>
                <Text style={[styles.metricVal, { color: theme.text }]}>
                  {progressState.readingFluency}%
                </Text>
              </View>
            </View>

            {/* Writing Stats Card */}
            <View style={[styles.skillCard, { backgroundColor: theme.backgroundElement }]}>
              <View style={styles.skillCardHeader}>
                <Text style={styles.skillCardEmoji}>✍️</Text>
                <View>
                  <Text style={[styles.skillCardTitle, { color: theme.text }]}>
                    {lang === 'ta' ? 'எழுதுதல்' : 'Writing'}
                  </Text>
                  <Text style={[styles.skillCardSubtitle, { color: theme.textSecondary }]}>
                    {progressState.writingCompleted} {lang === 'ta' ? 'பயிற்சிகள் முடிந்தது' : 'Exercises done'}
                  </Text>
                </View>
              </View>

              <View style={styles.metricRow}>
                <Text style={[styles.metricName, { color: theme.textSecondary }]}>
                  {lang === 'ta' ? 'எழுத்துக்கூட்டு:' : 'Spelling:'}
                </Text>
                <Text style={[styles.metricVal, { color: theme.text }]}>
                  {progressState.writingSpelling}%
                </Text>
              </View>

              <View style={styles.metricRow}>
                <Text style={[styles.metricName, { color: theme.textSecondary }]}>
                  {lang === 'ta' ? 'வாக்கியம்:' : 'Sentence:'}
                </Text>
                <Text style={[styles.metricVal, { color: theme.text }]}>
                  {progressState.writingSentence}%
                </Text>
              </View>
            </View>
          </View>

          {/* Badges / Achievements Section */}
          <Text style={[styles.sectionHeading, { color: theme.text }]}>
            {lang === 'ta' ? 'விருதுகள்' : 'Badges & Achievements'}
          </Text>

          <View style={styles.badgesList}>
            {badgesList.map((badge) => (
              <View
                key={badge.id}
                style={[
                  styles.badgeCard,
                  { backgroundColor: theme.backgroundElement },
                  !badge.unlocked && styles.badgeLocked,
                ]}
              >
                <Text style={styles.badgeEmoji}>
                  {badge.unlocked ? badge.emoji : '🔒'}
                </Text>

                <View style={styles.badgeInfo}>
                  <Text
                    style={[
                      styles.badgeName,
                      { color: badge.unlocked ? theme.text : theme.textSecondary },
                    ]}
                  >
                    {badge.name}
                  </Text>
                  <Text style={[styles.badgeDesc, { color: theme.textSecondary }]}>
                    {badge.description}
                  </Text>
                </View>

                {badge.unlocked && (
                  <View style={styles.unlockedTag}>
                    <Text style={styles.unlockedTagText}>✓ Unlocked</Text>
                  </View>
                )}
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
    paddingBottom: BottomTabInset + Spacing.five,
    alignItems: 'center',
  },
  container: {
    width: '100%',
    maxWidth: MaxContentWidth,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.four,
  },
  backButton: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: 12,
  },
  backButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  titleContainer: {
    alignItems: 'center',
  },
  screenTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  langBadge: {
    paddingHorizontal: Spacing.two + 4,
    paddingVertical: Spacing.one + 2,
    borderRadius: 12,
  },
  langBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  levelBanner: {
    backgroundColor: '#4C6EF5',
    padding: Spacing.four,
    borderRadius: 20,
    marginBottom: Spacing.four,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  levelHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.three,
  },
  levelBadge: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one + 2,
    borderRadius: 12,
  },
  levelBadgeText: {
    color: '#4C6EF5',
    fontSize: 16,
    fontWeight: '800',
  },
  xpText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '800',
  },
  levelProgressContainer: {
    width: '100%',
  },
  levelProgressLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.one,
  },
  levelProgressLabel: {
    color: '#E0E7FF',
    fontSize: 13,
    fontWeight: '600',
  },
  levelProgressXP: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  progressBarTrack: {
    height: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 6,
    overflow: 'hidden',
    width: '100%',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#34A853',
    borderRadius: 6,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: Spacing.three,
    marginBottom: Spacing.four,
  },
  statCard: {
    flex: 1,
    padding: Spacing.four,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  statEmoji: {
    fontSize: 32,
    marginBottom: Spacing.one,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  weakSkillBox: {
    backgroundColor: '#FEF3C7',
    padding: Spacing.four,
    borderRadius: 16,
    marginBottom: Spacing.four,
    borderWidth: 1,
    borderColor: '#F59E0B',
  },
  weakSkillTitle: {
    color: '#92400E',
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 2,
  },
  weakSkillName: {
    color: '#B45309',
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 4,
  },
  weakSkillSubtext: {
    color: '#78350F',
    fontSize: 13,
    fontWeight: '500',
  },
  sectionHeading: {
    fontSize: 18,
    fontWeight: '800',
    marginBottom: Spacing.three,
  },
  performanceGrid: {
    flexDirection: 'row',
    gap: Spacing.three,
    marginBottom: Spacing.five,
  },
  skillCard: {
    flex: 1,
    padding: Spacing.three + 2,
    borderRadius: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#4C6EF5',
  },
  skillCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    marginBottom: Spacing.three,
  },
  skillCardEmoji: {
    fontSize: 24,
  },
  skillCardTitle: {
    fontSize: 15,
    fontWeight: '800',
  },
  skillCardSubtitle: {
    fontSize: 11,
    fontWeight: '500',
  },
  metricRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.one,
  },
  metricName: {
    fontSize: 12,
    fontWeight: '600',
  },
  metricVal: {
    fontSize: 13,
    fontWeight: '800',
  },
  badgesList: {
    gap: Spacing.three,
  },
  badgeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.three + 2,
    borderRadius: 16,
    gap: Spacing.three,
  },
  badgeLocked: {
    opacity: 0.6,
  },
  badgeEmoji: {
    fontSize: 32,
  },
  badgeInfo: {
    flex: 1,
  },
  badgeName: {
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 2,
  },
  badgeDesc: {
    fontSize: 13,
    fontWeight: '500',
  },
  unlockedTag: {
    backgroundColor: '#E6F4EA',
    paddingHorizontal: Spacing.two + 2,
    paddingVertical: Spacing.one,
    borderRadius: 8,
  },
  unlockedTagText: {
    color: '#137333',
    fontSize: 12,
    fontWeight: '700',
  },
  buttonPressed: {
    opacity: 0.7,
  },
});
