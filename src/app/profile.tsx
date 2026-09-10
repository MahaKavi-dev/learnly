import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
// @ts-ignore
import { User } from '@supabase/supabase-js';

import { BottomNavigation } from '@/components/ui/BottomNavigation';
import { LanguageChip, LevelChip, XPChip } from '@/components/ui/Chips';
import { LearnlyButton } from '@/components/ui/LearnlyButton';
import { LearnlyCard } from '@/components/ui/LearnlyCard';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { getCurrentUser, signOut } from '@/services/auth';
import { subscribeGamificationState } from '@/services/gamification';
import { Language } from '@/types/exercise';
import { UserProgressState } from '@/types/gamification';
import { getLevelProgressDetails } from '@/utils/gamification';

export default function ProfileScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ lang?: string }>();
  const [lang, setLang] = useState<Language>(params.lang === 'ta' ? 'ta' : 'en');

  const [user, setUser] = useState<User | null>(null);
  const [progressState, setProgressState] = useState<UserProgressState | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [largeTextEnabled, setLargeTextEnabled] = useState(true);

  useEffect(() => {
    getCurrentUser().then(setUser);
    const unsubscribe = subscribeGamificationState((state) => {
      setProgressState(state);
    });
    return unsubscribe;
  }, []);

  const toggleLanguage = () => {
    const nextLang = lang === 'en' ? 'ta' : 'en';
    setLang(nextLang);
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      router.replace('/signin' as any);
    } catch (err) {
      console.warn('Sign out error:', err);
    }
  };

  const currentLevel = progressState ? getLevelProgressDetails(progressState.xp).currentLevel : 1;
  const currentXP = progressState ? progressState.xp : 0;
  const displayName = user?.user_metadata?.name || 'Alex';
  const email = user?.email || 'child@example.com';

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: '#F8FAFC' }]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.topBar}>
            <Text style={styles.screenTitle}>
              {lang === 'ta' ? 'சுயவிவரம்' : 'My Profile'}
            </Text>
            <LanguageChip lang={lang} onPress={toggleLanguage} />
          </View>

          {/* Profile Hero Card */}
          <LearnlyCard style={styles.profileHeroCard}>
            <View style={styles.avatarCircle}>
              <Text style={styles.avatarEmoji}>👦</Text>
            </View>
            <Text style={styles.profileName}>{displayName}</Text>
            <Text style={styles.profileEmail}>{email}</Text>

            <View style={styles.chipsRow}>
              <LevelChip level={currentLevel} />
              <XPChip xp={currentXP} />
            </View>
          </LearnlyCard>

          {/* Account Settings Section */}
          <Text style={styles.sectionHeading}>
            {lang === 'ta' ? 'அமைப்புகள்' : 'Settings & Account'}
          </Text>

          <LearnlyCard style={styles.settingsCard}>
            {/* Language Selection */}
            <Pressable style={styles.settingRow} onPress={toggleLanguage}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingIcon}>🌐</Text>
                <View>
                  <Text style={styles.settingTitle}>
                    {lang === 'ta' ? 'பயிற்சி மொழி' : 'Practice Language'}
                  </Text>
                  <Text style={styles.settingDesc}>
                    {lang === 'ta' ? 'தற்போது: தமிழ் 🇮🇳' : 'Currently: English 🇬🇧'}
                  </Text>
                </View>
              </View>
              <Text style={styles.arrowText}>Change ➔</Text>
            </Pressable>

            <View style={styles.divider} />

            {/* High Readability Font */}
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingIcon}>🔍</Text>
                <View>
                  <Text style={styles.settingTitle}>
                    {lang === 'ta' ? 'பெரிய உரை வடிவம்' : 'High Readability Font'}
                  </Text>
                  <Text style={styles.settingDesc}>
                    Large text for comfortable dyslexia reading
                  </Text>
                </View>
              </View>
              <Switch
                value={largeTextEnabled}
                onValueChange={setLargeTextEnabled}
                trackColor={{ false: '#CBD5E1', true: '#4F46E5' }}
              />
            </View>

            <View style={styles.divider} />

            {/* Audio Effects Toggle */}
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingIcon}>🔊</Text>
                <View>
                  <Text style={styles.settingTitle}>
                    {lang === 'ta' ? 'ஒலி விளைவுகள்' : 'Sound & Audio Feedback'}
                  </Text>
                  <Text style={styles.settingDesc}>
                    Play reward sounds and audio prompts
                  </Text>
                </View>
              </View>
              <Switch
                value={soundEnabled}
                onValueChange={setSoundEnabled}
                trackColor={{ false: '#CBD5E1', true: '#4F46E5' }}
              />
            </View>
          </LearnlyCard>

          {/* Account Actions */}
          <LearnlyCard style={{ marginBottom: 20 }}>
            <LearnlyButton
              label={lang === 'ta' ? 'வெளியேறு' : 'Sign Out'}
              onPress={handleSignOut}
              variant="retry"
            />
          </LearnlyCard>
        </View>
      </ScrollView>
      <BottomNavigation activeTab="profile" lang={lang} />
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
  screenTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: '#0F172A',
  },
  profileHeroCard: {
    alignItems: 'center',
    padding: 24,
    marginBottom: 24,
  },
  avatarCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#EDE9FE',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  avatarEmoji: {
    fontSize: 44,
  },
  profileName: {
    fontSize: 24,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 2,
  },
  profileEmail: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
    marginBottom: 16,
  },
  chipsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  sectionHeading: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 14,
  },
  settingsCard: {
    padding: 16,
    marginBottom: 20,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  settingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    flex: 1,
  },
  settingIcon: {
    fontSize: 24,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  settingDesc: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  arrowText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#4F46E5',
  },
  divider: {
    height: 1,
    backgroundColor: '#E2E8F0',
    marginVertical: 4,
  },
});
