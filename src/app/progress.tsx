import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BottomNavigation } from '@/components/ui/BottomNavigation';
import { LanguageChip } from '@/components/ui/Chips';
import { LearnlyCard } from '@/components/ui/LearnlyCard';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { subscribeGamificationState } from '@/services/gamification';
import { Language } from '@/types/exercise';
import { UserProgressState } from '@/types/gamification';
import { checkBadges, getLevelProgressDetails } from '@/utils/gamification';

export default function ProgressScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ lang?: string }>();
  const lang: Language = params.lang === 'ta' ? 'ta' : 'en';

  const [progressState, setProgressState] = useState<UserProgressState | null>(null);

  useEffect(() => {
    const unsubscribe = subscribeGamificationState((state) => {
      setProgressState(state);
    });
    return unsubscribe;
  }, []);

  if (!progressState) {
    return (
      <SafeAreaView
        style={[styles.safeArea, { backgroundColor: '#F8FAFC', justifyContent: 'center', alignItems: 'center' }]}
      >
        <ActivityIndicator color="#4F46E5" size="large" />
        <Text style={{ marginTop: 12, color: '#64748B', fontWeight: '700' }}>
          {lang === 'ta' ? 'முன்னேற்றம் ஏற்றப்படுகிறது...' : 'Loading progress...'}
        </Text>
      </SafeAreaView>
    );
  }

  const levelDetails = getLevelProgressDetails(progressState.xp);
  const badgesList = checkBadges(progressState);

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: '#F8FAFC' }]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.topBar}>
            <Pressable
              style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}
              onPress={() => router.back()}
            >
              <Text style={styles.backButtonText}>← Back</Text>
            </Pressable>

            <Text style={styles.screenTitle}>
              {lang === 'ta' ? 'எனது முன்னேற்றம்' : 'My Progress'}
            </Text>

            <LanguageChip lang={lang} />
          </View>

          {/* Hero Level Banner */}
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

          {/* Streaks Stats */}
          <View style={styles.statsGrid}>
            <LearnlyCard style={styles.statCard}>
              <Text style={styles.statEmoji}>🔥</Text>
              <Text style={styles.statValue}>
                {progressState.currentStreak} {lang === 'ta' ? 'நாட்கள்' : 'Days'}
              </Text>
              <Text style={styles.statLabel}>
                {lang === 'ta' ? 'தற்போதைய தொடர்' : 'Current Streak'}
              </Text>
            </LearnlyCard>

            <LearnlyCard style={styles.statCard}>
              <Text style={styles.statEmoji}>🏆</Text>
              <Text style={styles.statValue}>
                {progressState.longestStreak} {lang === 'ta' ? 'நாட்கள்' : 'Days'}
              </Text>
              <Text style={styles.statLabel}>
                {lang === 'ta' ? 'மிக நீண்ட தொடர்' : 'Best Streak'}
              </Text>
            </LearnlyCard>
          </View>

          {/* Encouraging Weak Skill Recommendation */}
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

          {/* Skill Performance Breakdown */}
          <Text style={styles.sectionHeading}>
            {lang === 'ta' ? 'திறன் விவரங்கள்' : 'Skill Performance'}
          </Text>

          <View style={styles.performanceGrid}>
            {/* Reading Stats */}
            <LearnlyCard accentColor="#4F46E5" style={styles.skillCard}>
              <View style={styles.skillCardHeader}>
                <Text style={styles.skillCardEmoji}>📖</Text>
                <View>
                  <Text style={styles.skillCardTitle}>
                    {lang === 'ta' ? 'வாசித்தல்' : 'Reading'}
                  </Text>
                  <Text style={styles.skillCardSubtitle}>
                    {progressState.readingCompleted} {lang === 'ta' ? 'பயிற்சிகள்' : 'Exercises done'}
                  </Text>
                </View>
              </View>

              <View style={styles.metricRow}>
                <Text style={styles.metricName}>{lang === 'ta' ? 'துல்லியம்:' : 'Accuracy:'}</Text>
                <Text style={styles.metricVal}>{progressState.readingAccuracy}%</Text>
              </View>

              <View style={styles.metricRow}>
                <Text style={styles.metricName}>{lang === 'ta' ? 'சரளம்:' : 'Fluency:'}</Text>
                <Text style={styles.metricVal}>{progressState.readingFluency}%</Text>
              </View>
            </LearnlyCard>

            {/* Writing Stats */}
            <LearnlyCard accentColor="#8B5CF6" style={styles.skillCard}>
              <View style={styles.skillCardHeader}>
                <Text style={styles.skillCardEmoji}>✍️</Text>
                <View>
                  <Text style={styles.skillCardTitle}>
                    {lang === 'ta' ? 'எழுதுதல்' : 'Writing'}
                  </Text>
                  <Text style={styles.skillCardSubtitle}>
                    {progressState.writingCompleted} {lang === 'ta' ? 'பயிற்சிகள்' : 'Exercises done'}
                  </Text>
                </View>
              </View>

              <View style={styles.metricRow}>
                <Text style={styles.metricName}>{lang === 'ta' ? 'எழுத்துக்கூட்டு:' : 'Spelling:'}</Text>
                <Text style={styles.metricVal}>{progressState.writingSpelling}%</Text>
              </View>

              <View style={styles.metricRow}>
                <Text style={styles.metricName}>{lang === 'ta' ? 'வாக்கியம்:' : 'Sentence:'}</Text>
                <Text style={styles.metricVal}>{progressState.writingSentence}%</Text>
              </View>
            </LearnlyCard>
          </View>

          {/* Badges / Achievements */}
          <Text style={styles.sectionHeading}>
            {lang === 'ta' ? 'விருதுகள்' : 'Badges & Achievements'}
          </Text>

          <View style={styles.badgesList}>
            {badgesList.map((badge) => (
              <LearnlyCard
                key={badge.id}
                style={[
                  styles.badgeCard,
                  badge.unlocked ? null : styles.badgeLocked,
                ]}
              >
                <View style={styles.badgeRow}>
                  <Text style={styles.badgeEmoji}>
                    {badge.unlocked ? badge.emoji : '🔒'}
                  </Text>

                  <View style={styles.badgeInfo}>
                    <Text
                      style={[
                        styles.badgeName,
                        !badge.unlocked && { color: '#64748B' },
                      ]}
                    >
                      {badge.name}
                    </Text>
                    <Text style={styles.badgeDesc}>{badge.description}</Text>
                  </View>

                  {badge.unlocked && (
                    <View style={styles.unlockedTag}>
                      <Text style={styles.unlockedTagText}>✓ Unlocked</Text>
                    </View>
                  )}
                </View>
              </LearnlyCard>
            ))}
          </View>
        </View>
      </ScrollView>
      <BottomNavigation activeTab="progress" lang={lang} />
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
    paddingBottom: 110,
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
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: '#F1F5F9',
    borderRadius: 14,
  },
  backButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#334155',
  },
  pressed: {
    opacity: 0.7,
  },
  screenTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  levelBanner: {
    backgroundColor: '#4F46E5',
    padding: 22,
    borderRadius: 24,
    marginBottom: 20,
    shadowColor: '#4338CA',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 4,
  },
  levelHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  levelBadge: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 12,
  },
  levelBadgeText: {
    color: '#4F46E5',
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
    marginBottom: 6,
  },
  levelProgressLabel: {
    color: '#E0E7FF',
    fontSize: 13,
    fontWeight: '700',
  },
  levelProgressXP: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
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
    backgroundColor: '#10B981',
    borderRadius: 6,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 14,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    padding: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statEmoji: {
    fontSize: 32,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
  },
  weakSkillBox: {
    backgroundColor: '#FEF3C7',
    padding: 18,
    borderRadius: 18,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#F59E0B',
  },
  weakSkillTitle: {
    color: '#92400E',
    fontSize: 13,
    fontWeight: '800',
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
    fontWeight: '600',
  },
  sectionHeading: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 14,
  },
  performanceGrid: {
    flexDirection: 'row',
    gap: 14,
    marginBottom: 24,
  },
  skillCard: {
    flex: 1,
    padding: 16,
  },
  skillCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 14,
  },
  skillCardEmoji: {
    fontSize: 24,
  },
  skillCardTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  skillCardSubtitle: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
  },
  metricRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  metricName: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
  },
  metricVal: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
  },
  badgesList: {
    gap: 12,
  },
  badgeCard: {
    padding: 16,
  },
  badgeLocked: {
    opacity: 0.6,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
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
    color: '#0F172A',
    marginBottom: 2,
  },
  badgeDesc: {
    fontSize: 13,
    color: '#64748B',
  },
  unlockedTag: {
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  unlockedTagText: {
    color: '#059669',
    fontSize: 12,
    fontWeight: '800',
  },
});
