import React, { useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type Language = 'en' | 'ta';

export default function HomeScreen() {
  const theme = useTheme();
  const router = useRouter();

  // Simple local React state to manage language selection
  const [selectedLanguage, setSelectedLanguage] = useState<Language | null>(null);
  const [featureMessage, setFeatureMessage] = useState<string | null>(null);

  const handleSelectLanguage = (lang: Language) => {
    setSelectedLanguage(lang);
    setFeatureMessage(null);
  };

  const handleResetLanguage = () => {
    setSelectedLanguage(null);
    setFeatureMessage(null);
  };

  const handleReadingPress = () => {
    setFeatureMessage(null);
    router.push({
      pathname: '/reading',
      params: { lang: selectedLanguage || 'en' },
    });
  };

  const handleWritingPress = () => {
    setFeatureMessage(null);
    router.push({
      pathname: '/writing',
      params: { lang: selectedLanguage || 'en' },
    });
  };

  const handleProgressPress = () => {
    setFeatureMessage(null);
    router.push({
      pathname: '/progress' as any,
      params: { lang: selectedLanguage || 'en' },
    });
  };

  const handleFeaturePress = (message: string) => {
    setFeatureMessage(message);
  };

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
          {/* App Branding Header */}
          <View style={styles.header}>
            <View style={styles.logoBadge}>
              <Text style={styles.logoEmoji}>🌟</Text>
            </View>
            <Text style={[styles.appName, { color: theme.text }]}>Learnly</Text>
            <Text style={[styles.tagline, { color: theme.textSecondary }]}>
              Learn • Practice • Grow
            </Text>
          </View>

          {selectedLanguage === null ? (
            /* --- LANGUAGE SELECTION SCREEN --- */
            <View style={styles.section}>
              <Text style={[styles.heading, { color: theme.text }]}>
                Choose your language
              </Text>
              <Text style={[styles.subheading, { color: theme.textSecondary }]}>
                Select a language to get started!
              </Text>

              <View style={styles.cardGrid}>
                {/* English Language Card */}
                <Pressable
                  style={({ pressed }) => [
                    styles.languageCard,
                    { backgroundColor: theme.backgroundElement },
                    pressed && styles.cardPressed,
                  ]}
                  onPress={() => handleSelectLanguage('en')}
                  accessibilityRole="button"
                  accessibilityLabel="Select English language"
                >
                  <Text style={styles.flagEmoji}>🇬🇧</Text>
                  <Text style={[styles.languageTitle, { color: theme.text }]}>
                    English
                  </Text>
                  <Text style={[styles.languageSubtitle, { color: theme.textSecondary }]}>
                    English Practice
                  </Text>
                </Pressable>

                {/* Tamil Language Card */}
                <Pressable
                  style={({ pressed }) => [
                    styles.languageCard,
                    { backgroundColor: theme.backgroundElement },
                    pressed && styles.cardPressed,
                  ]}
                  onPress={() => handleSelectLanguage('ta')}
                  accessibilityRole="button"
                  accessibilityLabel="தமிழ் மொழியைத் தேர்ந்தெடுக்கவும்"
                >
                  <Text style={styles.flagEmoji}>🇮🇳</Text>
                  <Text style={[styles.languageTitle, { color: theme.text }]}>
                    தமிழ்
                  </Text>
                  <Text style={[styles.languageSubtitle, { color: theme.textSecondary }]}>
                    தமிழ் பயிற்சி
                  </Text>
                </Pressable>
              </View>
            </View>
          ) : (
            /* --- TEMPORARY HOME SCREEN --- */
            <View style={styles.section}>
              {/* Selected Language Indicator Banner */}
              <View style={[styles.langBanner, { backgroundColor: theme.backgroundElement }]}>
                <View style={styles.langBannerInfo}>
                  <Text style={styles.langBannerFlag}>
                    {selectedLanguage === 'en' ? '🇬🇧' : '🇮🇳'}
                  </Text>
                  <View>
                    <Text style={[styles.langBannerLabel, { color: theme.textSecondary }]}>
                      Selected Language / மொழி
                    </Text>
                    <Text style={[styles.langBannerValue, { color: theme.text }]}>
                      {selectedLanguage === 'en' ? 'English' : 'தமிழ்'}
                    </Text>
                  </View>
                </View>
                <Pressable
                  style={({ pressed }) => [
                    styles.changeLangButton,
                    pressed && styles.buttonPressed,
                  ]}
                  onPress={handleResetLanguage}
                >
                  <Text style={styles.changeLangText}>Change</Text>
                </Pressable>
              </View>

              {/* Welcome Card */}
              <View style={[styles.welcomeBox, { backgroundColor: '#4C6EF5' }]}>
                <Text style={styles.welcomeTitle}>
                  {selectedLanguage === 'ta' ? 'வணக்கம்!' : 'Welcome to Learnly!'}
                </Text>
                <Text style={styles.welcomeSubtitle}>
                  {selectedLanguage === 'ta'
                    ? 'வாருங்கள்! வாசித்தல் மற்றும் எழுதுதல் பயிற்சிகளைத் தொடங்குவோம்.'
                    : 'Let’s practice reading and writing together!'}
                </Text>
              </View>

              {/* Dynamic Language Practice Card */}
              <View style={[styles.langPracticeCard, { backgroundColor: theme.backgroundElement }]}>
                <Text style={[styles.langPracticeHeader, { color: theme.text }]}>
                  {selectedLanguage === 'ta' ? 'தமிழ் உரை சான்று' : 'English Practice'}
                </Text>
                <View style={styles.langPracticeList}>
                  {selectedLanguage === 'ta' ? (
                    <>
                      <Text style={[styles.langPracticeItem, { color: theme.text }]}>• "வணக்கம்!"</Text>
                      <Text style={[styles.langPracticeItem, { color: theme.text }]}>• "பூனை ஓடுகிறது."</Text>
                      <Text style={[styles.langPracticeItem, { color: theme.text }]}>• "அம்மா புத்தகம் படிக்கிறார்."</Text>
                    </>
                  ) : (
                    <>
                      <Text style={[styles.langPracticeItem, { color: theme.text }]}>• "Hello!"</Text>
                      <Text style={[styles.langPracticeItem, { color: theme.text }]}>• "The cat is running."</Text>
                      <Text style={[styles.langPracticeItem, { color: theme.text }]}>• "Mother is reading a book."</Text>
                    </>
                  )}
                </View>
              </View>

              {/* Feature Tap Feedback Toast / Message */}
              {featureMessage && (
                <View style={styles.noticeBox}>
                  <Text style={styles.noticeText}>💡 {featureMessage}</Text>
                </View>
              )}

              {/* Three Main Feature Cards */}
              <Text style={[styles.featuresHeading, { color: theme.text }]}>
                Practice Modules
              </Text>
              <View style={styles.featuresList}>
                {/* 📖 Reading Card */}
                <Pressable
                  style={({ pressed }) => [
                    styles.featureCard,
                    { backgroundColor: theme.backgroundElement },
                    pressed && styles.cardPressed,
                  ]}
                  onPress={handleReadingPress}
                  accessibilityRole="button"
                >
                  <Text style={styles.featureIcon}>📖</Text>
                  <View style={styles.featureInfo}>
                    <Text style={[styles.featureTitle, { color: theme.text }]}>
                      Reading
                    </Text>
                    <Text style={[styles.featureDesc, { color: theme.textSecondary }]}>
                      Practice reading words & sentences
                    </Text>
                  </View>
                  <Text style={[styles.arrowIcon, { color: theme.textSecondary }]}>➔</Text>
                </Pressable>

                {/* ✍️ Writing Card */}
                <Pressable
                  style={({ pressed }) => [
                    styles.featureCard,
                    { backgroundColor: theme.backgroundElement },
                    pressed && styles.cardPressed,
                  ]}
                  onPress={handleWritingPress}
                  accessibilityRole="button"
                >
                  <Text style={styles.featureIcon}>✍️</Text>
                  <View style={styles.featureInfo}>
                    <Text style={[styles.featureTitle, { color: theme.text }]}>
                      Writing
                    </Text>
                    <Text style={[styles.featureDesc, { color: theme.textSecondary }]}>
                      Practice spelling & sentence writing
                    </Text>
                  </View>
                  <Text style={[styles.arrowIcon, { color: theme.textSecondary }]}>➔</Text>
                </Pressable>

                {/* 📊 Progress Card */}
                <Pressable
                  style={({ pressed }) => [
                    styles.featureCard,
                    { backgroundColor: theme.backgroundElement },
                    pressed && styles.cardPressed,
                  ]}
                  onPress={handleProgressPress}
                  accessibilityRole="button"
                >
                  <Text style={styles.featureIcon}>📊</Text>
                  <View style={styles.featureInfo}>
                    <Text style={[styles.featureTitle, { color: theme.text }]}>
                      Progress
                    </Text>
                    <Text style={[styles.featureDesc, { color: theme.textSecondary }]}>
                      Track learning streaks & stars
                    </Text>
                  </View>
                  <Text style={[styles.arrowIcon, { color: theme.textSecondary }]}>➔</Text>
                </Pressable>
              </View>
            </View>
          )}
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
    paddingTop: Spacing.four,
    paddingBottom: BottomTabInset + Spacing.five,
    alignItems: 'center',
  },
  container: {
    width: '100%',
    maxWidth: MaxContentWidth,
  },
  header: {
    alignItems: 'center',
    marginBottom: Spacing.five,
  },
  logoBadge: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.two,
  },
  logoEmoji: {
    fontSize: 32,
  },
  appName: {
    fontSize: 36,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  tagline: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: Spacing.one,
  },
  section: {
    width: '100%',
  },
  heading: {
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: Spacing.one,
  },
  subheading: {
    fontSize: 15,
    textAlign: 'center',
    marginBottom: Spacing.four,
  },
  cardGrid: {
    flexDirection: 'row',
    gap: Spacing.three,
    justifyContent: 'center',
  },
  languageCard: {
    flex: 1,
    paddingVertical: Spacing.five,
    paddingHorizontal: Spacing.three,
    borderRadius: 20,
    alignItems: 'center',
    minHeight: 160,
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
  flagEmoji: {
    fontSize: 48,
    marginBottom: Spacing.two,
  },
  languageTitle: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: Spacing.one,
  },
  languageSubtitle: {
    fontSize: 13,
    fontWeight: '500',
  },
  langBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.three,
    borderRadius: 16,
    marginBottom: Spacing.four,
  },
  langBannerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  langBannerFlag: {
    fontSize: 28,
  },
  langBannerLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  langBannerValue: {
    fontSize: 16,
    fontWeight: '700',
  },
  changeLangButton: {
    backgroundColor: '#E2E8F0',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: 12,
  },
  buttonPressed: {
    opacity: 0.7,
  },
  changeLangText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
  },
  welcomeBox: {
    padding: Spacing.four,
    borderRadius: 20,
    marginBottom: Spacing.four,
  },
  welcomeTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: Spacing.one,
  },
  welcomeSubtitle: {
    fontSize: 15,
    fontWeight: '500',
    color: '#E0E7FF',
    lineHeight: 22,
  },
  langPracticeCard: {
    padding: Spacing.three,
    borderRadius: 16,
    marginBottom: Spacing.four,
    borderLeftWidth: 4,
    borderLeftColor: '#4C6EF5',
  },
  langPracticeHeader: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: Spacing.two,
  },
  langPracticeList: {
    gap: Spacing.one,
  },
  langPracticeItem: {
    fontSize: 16,
    fontWeight: '600',
  },
  noticeBox: {
    backgroundColor: '#FEF3C7',
    padding: Spacing.three,
    borderRadius: 12,
    marginBottom: Spacing.four,
    borderWidth: 1,
    borderColor: '#F59E0B',
  },
  noticeText: {
    color: '#92400E',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  featuresHeading: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: Spacing.three,
  },
  featuresList: {
    gap: Spacing.three,
  },
  featureCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.four,
    borderRadius: 16,
    gap: Spacing.three,
  },
  featureIcon: {
    fontSize: 32,
  },
  featureInfo: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 2,
  },
  featureDesc: {
    fontSize: 13,
    fontWeight: '500',
  },
  arrowIcon: {
    fontSize: 18,
    fontWeight: '600',
  },
});
