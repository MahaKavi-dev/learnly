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

import { BottomNavigation } from '@/components/ui/BottomNavigation';
import { LevelChip, StreakChip, XPChip } from '@/components/ui/Chips';
import { LearnlyButton } from '@/components/ui/LearnlyButton';
import { LearnlyCard } from '@/components/ui/LearnlyCard';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { subscribeGamificationState } from '@/services/gamification';
import { UserProgressState } from '@/types/gamification';
import { getLevelProgressDetails } from '@/utils/gamification';

type Language = 'en' | 'ta';

export default function HomeScreen() {
  const theme = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams<{ lang?: string }>();

  const [selectedLanguage, setSelectedLanguage] = useState<Language | null>(
    params.lang === 'ta' ? 'ta' : params.lang === 'en' ? 'en' : null
  );
  const [progressState, setProgressState] = useState<UserProgressState | null>(null);

  useEffect(() => {
    const unsubscribe = subscribeGamificationState((state) => {
      setProgressState(state);
    });
    return unsubscribe;
  }, []);

  const handleSelectLanguage = (lang: Language) => {
    setSelectedLanguage(lang);
  };

  const handleResetLanguage = () => {
    setSelectedLanguage(null);
  };

  const handleReadingPress = () => {
    router.push({
      pathname: '/reading',
      params: { lang: selectedLanguage || 'en' },
    });
  };

  const handleWritingPress = () => {
    router.push({
      pathname: '/writing',
      params: { lang: selectedLanguage || 'en' },
    });
  };

  const handleProgressPress = () => {
    router.push({
      pathname: '/progress',
      params: { lang: selectedLanguage || 'en' },
    });
  };

  const currentLevel = progressState ? getLevelProgressDetails(progressState.xp).currentLevel : 1;
  const currentXP = progressState ? progressState.xp : 0;
  const currentStreak = progressState ? progressState.currentStreak : 0;
  const rawCompleted = progressState ? progressState.readingCompleted : 0;
  const goalCompleted = (rawCompleted % 5 === 0 && rawCompleted > 0) ? 5 : (rawCompleted % 5);

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: '#F8FAFC' }]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.container}>
          {/* Header Branding */}
          <View style={styles.header}>
            <View style={styles.logoBadge}>
              <Text style={styles.logoEmoji}>🌟</Text>
            </View>
            <Text style={styles.appName}>Learnly</Text>
            <Text style={styles.tagline}>Learn • Practice • Grow</Text>
          </View>

          {selectedLanguage === null ? (
            /* --- SCREEN 1: WELCOME / LANGUAGE SELECTION --- */
            <View style={styles.section}>
              <LearnlyCard style={styles.welcomeCard}>
                <Text style={styles.heading}>Choose your language</Text>
                <Text style={styles.subheading}>
                  Select your reading language to begin your journey!
                </Text>

                <View style={styles.cardGrid}>
                  {/* English Selection Card */}
                  <Pressable
                    style={({ pressed }) => [
                      styles.languageCard,
                      pressed && styles.cardPressed,
                    ]}
                    onPress={() => handleSelectLanguage('en')}
                    accessibilityRole="button"
                    accessibilityLabel="Select English language"
                  >
                    <Text style={styles.flagEmoji}>🇬🇧</Text>
                    <Text style={styles.languageTitle}>English</Text>
                    <Text style={styles.languageSubtitle}>English Practice</Text>
                  </Pressable>

                  {/* Tamil Selection Card */}
                  <Pressable
                    style={({ pressed }) => [
                      styles.languageCard,
                      pressed && styles.cardPressed,
                    ]}
                    onPress={() => handleSelectLanguage('ta')}
                    accessibilityRole="button"
                    accessibilityLabel="தமிழ் மொழியைத் தேர்ந்தெடுக்கவும்"
                  >
                    <Text style={styles.flagEmoji}>🇮🇳</Text>
                    <Text style={styles.languageTitle}>தமிழ்</Text>
                    <Text style={styles.languageSubtitle}>தமிழ் பயிற்சி</Text>
                  </Pressable>
                </View>

                <LearnlyButton
                  label="Start Learning 🚀"
                  onPress={() => handleSelectLanguage('en')}
                  style={{ marginTop: 24 }}
                />
              </LearnlyCard>
            </View>
          ) : (
            /* --- SCREEN 2: HOME DASHBOARD --- */
            <View style={styles.section}>
              {/* Top User Bar */}
              <View style={styles.userBar}>
                <View style={styles.userInfo}>
                  <Text style={styles.avatar}>👦</Text>
                  <View>
                    <Text style={styles.greeting}>
                      {selectedLanguage === 'ta' ? 'வணக்கம் Alex! 👋' : 'Hi Alex! 👋'}
                    </Text>
                    <Text style={styles.userSubtext}>Ready to learn today?</Text>
                  </View>
                </View>
                <Pressable style={styles.langPill} onPress={handleResetLanguage}>
                  <Text style={styles.langPillFlag}>
                    {selectedLanguage === 'en' ? '🇬🇧' : '🇮🇳'}
                  </Text>
                  <Text style={styles.langPillText}>
                    {selectedLanguage === 'en' ? 'EN' : 'TA'}
                  </Text>
                </Pressable>
              </View>

              {/* Stats Chips Row */}
              <View style={styles.chipsRow}>
                <LevelChip level={currentLevel} />
                <XPChip xp={currentXP} />
                <StreakChip streak={currentStreak} />
              </View>

              {/* Today's Goal Hero Card */}
              <View style={styles.heroBanner}>
                <View style={styles.heroContent}>
                  <Text style={styles.heroTag}>TODAY'S GOAL</Text>
                  <Text style={styles.heroTitle}>
                    {selectedLanguage === 'ta'
                      ? 'இன்றைய வாசிப்பு இலக்கு'
                      : 'Daily Reading Practice'}
                  </Text>
                  <Text style={styles.heroSubtitle}>
                    {selectedLanguage === 'ta'
                      ? `${progressState?.readingCompleted || 0} / 5 கேள்விகள் முடிவடைந்தன • +30 XP`
                      : `${progressState?.readingCompleted || 0} / 5 exercises completed • +30 XP`}
                  </Text>

                  {/* Goal Progress Section */}
                  <View style={styles.goalProgressBox}>
                    <View style={styles.goalProgressHeader}>
                      <Text style={styles.goalProgressText}>
                        {selectedLanguage === 'ta'
                          ? `${goalCompleted} / 5 கேள்விகள் முடிந்தது`
                          : `${goalCompleted} / 5 questions completed`}
                      </Text>
                      <Text style={styles.goalProgressPercent}>
                        {Math.round((goalCompleted / 5) * 100)}%
                      </Text>
                    </View>
                    <View style={styles.goalProgressTrack}>
                      <View
                        style={[
                          styles.goalProgressFill,
                          { width: `${(goalCompleted / 5) * 100}%` },
                        ]}
                      />
                    </View>
                  </View>

                  <LearnlyButton
                    label={selectedLanguage === 'ta' ? 'பயிற்சியைத் தொடங்கு ▶' : 'Continue Learning ▶'}
                    onPress={handleReadingPress}
                    variant="outline"
                    style={styles.heroCta}
                  />
                </View>
              </View>

              {/* Recommended Practice Modules */}
              <Text style={styles.sectionHeading}>Practice Hub</Text>
              <View style={styles.modulesGrid}>
                {/* 📖 Reading Practice Card */}
                <LearnlyCard
                  accentColor="#4F46E5"
                  onPress={handleReadingPress}
                  style={styles.moduleCard}
                >
                  <View style={styles.moduleRow}>
                    <Text style={styles.moduleEmoji}>📖</Text>
                    <View style={styles.moduleDetails}>
                      <Text style={styles.moduleTitle}>
                        {selectedLanguage === 'ta' ? 'வாசித்தல் பயிற்சி' : 'Reading Practice'}
                      </Text>
                      <Text style={styles.moduleDesc}>
                        AI voice speech assessment & fluency check
                      </Text>
                    </View>
                    <Text style={styles.arrowText}>➔</Text>
                  </View>
                </LearnlyCard>

                {/* ✍️ Writing Practice Card */}
                <LearnlyCard
                  accentColor="#8B5CF6"
                  onPress={handleWritingPress}
                  style={styles.moduleCard}
                >
                  <View style={styles.moduleRow}>
                    <Text style={styles.moduleEmoji}>✍️</Text>
                    <View style={styles.moduleDetails}>
                      <Text style={styles.moduleTitle}>
                        {selectedLanguage === 'ta' ? 'எழுதுதல் பயிற்சி' : 'Writing Practice'}
                      </Text>
                      <Text style={styles.moduleDesc}>
                        Spelling & sentence formation exercises
                      </Text>
                    </View>
                    <Text style={styles.arrowText}>➔</Text>
                  </View>
                </LearnlyCard>

                {/* 📊 Progress Card */}
                <LearnlyCard
                  accentColor="#10B981"
                  onPress={handleProgressPress}
                  style={styles.moduleCard}
                >
                  <View style={styles.moduleRow}>
                    <Text style={styles.moduleEmoji}>📊</Text>
                    <View style={styles.moduleDetails}>
                      <Text style={styles.moduleTitle}>
                        {selectedLanguage === 'ta' ? 'எனது முன்னேற்றம்' : 'My Progress'}
                      </Text>
                      <Text style={styles.moduleDesc}>
                        View accuracy, badges & level stats
                      </Text>
                    </View>
                    <Text style={styles.arrowText}>➔</Text>
                  </View>
                </LearnlyCard>
              </View>
            </View>
          )}
        </View>
      </ScrollView>
      <BottomNavigation activeTab="home" lang={selectedLanguage || 'en'} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.four,
    paddingBottom: 110,
    alignItems: 'center',
  },
  container: {
    width: '100%',
    maxWidth: MaxContentWidth,
  },
  header: {
    alignItems: 'center',
    marginBottom: Spacing.four,
  },
  logoBadge: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#EDE9FE',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.two,
  },
  logoEmoji: {
    fontSize: 32,
  },
  appName: {
    fontSize: 34,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: 0.5,
  },
  tagline: {
    fontSize: 15,
    fontWeight: '600',
    color: '#64748B',
    marginTop: 2,
  },
  section: {
    width: '100%',
  },
  welcomeCard: {
    padding: 24,
    alignItems: 'center',
  },
  heading: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0F172A',
    textAlign: 'center',
    marginBottom: 6,
  },
  subheading: {
    fontSize: 15,
    color: '#475569',
    textAlign: 'center',
    marginBottom: 20,
  },
  cardGrid: {
    flexDirection: 'row',
    gap: 16,
    width: '100%',
  },
  languageCard: {
    flex: 1,
    backgroundColor: '#F1F5F9',
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#E2E8F0',
    minHeight: 150,
  },
  cardPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.98 }],
  },
  flagEmoji: {
    fontSize: 48,
    marginBottom: 10,
  },
  languageTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
  },
  languageSubtitle: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 2,
  },
  userBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatar: {
    fontSize: 40,
  },
  greeting: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
  },
  userSubtext: {
    fontSize: 13,
    fontWeight: '500',
    color: '#64748B',
  },
  langPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  langPillFlag: {
    fontSize: 16,
  },
  langPillText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#334155',
  },
  chipsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  heroBanner: {
    backgroundColor: '#4F46E5',
    borderRadius: 24,
    padding: 24,
    marginBottom: 24,
    shadowColor: '#4338CA',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 4,
  },
  heroContent: {
    width: '100%',
  },
  heroTag: {
    color: '#FEF3C7',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 4,
  },
  heroTitle: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 6,
  },
  heroSubtitle: {
    color: '#E0E7FF',
    fontSize: 15,
    fontWeight: '500',
    marginBottom: 14,
    lineHeight: 22,
  },
  goalProgressBox: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    padding: 12,
    borderRadius: 14,
    marginBottom: 18,
  },
  goalProgressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  goalProgressText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  goalProgressPercent: {
    color: '#FEF3C7',
    fontSize: 13,
    fontWeight: '800',
  },
  goalProgressTrack: {
    height: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  goalProgressFill: {
    height: '100%',
    backgroundColor: '#34A853',
    borderRadius: 4,
  },
  heroCta: {
    backgroundColor: '#FFFFFF',
    borderColor: '#FFFFFF',
  },
  sectionHeading: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 14,
  },
  modulesGrid: {
    gap: 14,
  },
  moduleCard: {
    padding: 18,
  },
  moduleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  moduleEmoji: {
    fontSize: 32,
  },
  moduleDetails: {
    flex: 1,
  },
  moduleTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  moduleDesc: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 2,
  },
  arrowText: {
    fontSize: 20,
    color: '#4F46E5',
    fontWeight: '800',
  },
});
