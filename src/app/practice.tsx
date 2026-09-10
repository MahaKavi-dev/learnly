import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BottomNavigation } from '@/components/ui/BottomNavigation';
import { LanguageChip } from '@/components/ui/Chips';
import { LearnlyButton } from '@/components/ui/LearnlyButton';
import { LearnlyCard } from '@/components/ui/LearnlyCard';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { Language } from '@/types/exercise';

export default function PracticeScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ lang?: string }>();
  const lang: Language = params.lang === 'ta' ? 'ta' : 'en';

  const handleStartReading = () => {
    router.push({
      pathname: '/reading',
      params: { lang },
    });
  };

  const handleStartWriting = () => {
    router.push({
      pathname: '/writing',
      params: { lang },
    });
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: '#F8FAFC' }]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.container}>
          {/* Top Bar */}
          <View style={styles.topBar}>
            <Text style={styles.screenTitle}>
              {lang === 'ta' ? 'பயிற்சி மையம்' : 'Practice Hub'}
            </Text>
            <LanguageChip lang={lang} />
          </View>

          <Text style={styles.subTitle}>
            {lang === 'ta'
              ? 'உங்கள் வாசிப்பு மற்றும் எழுத்து திறனை மேம்படுத்துங்கள்!'
              : 'Choose a practice mode to improve your literacy skills!'}
          </Text>

          {/* Module 1: Reading Practice */}
          <LearnlyCard accentColor="#4F46E5" style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={[styles.iconBox, { backgroundColor: '#EDE9FE' }]}>
                <Text style={styles.cardEmoji}>📖</Text>
              </View>
              <View style={styles.headerText}>
                <Text style={styles.tagText}>READING & SPEECH</Text>
                <Text style={styles.cardTitle}>
                  {lang === 'ta' ? 'வாசித்தல் பயிற்சி' : 'Reading Practice'}
                </Text>
              </View>
            </View>

            <Text style={styles.cardDesc}>
              {lang === 'ta'
                ? 'சத்தமாக வாசித்து AI பேச்சு பகுப்பாய்வு மூலம் உடனடி கருத்து பெறுங்கள்.'
                : 'Read sentences aloud and receive instant AI fluency feedback powered by Speech-to-Text.'}
            </Text>

            <View style={styles.featurePills}>
              <View style={styles.pill}>
                <Text style={styles.pillText}>🎤 STT Speech Recognition</Text>
              </View>
              <View style={styles.pill}>
                <Text style={styles.pillText}>✨ AI Gemini Assessment</Text>
              </View>
            </View>

            <LearnlyButton
              label={lang === 'ta' ? 'வாசிக்கத் தொடங்கு ➔' : 'Start Reading Practice ➔'}
              onPress={handleStartReading}
              variant="primary"
              style={{ marginTop: 16 }}
            />
          </LearnlyCard>

          {/* Module 2: Writing Practice */}
          <LearnlyCard accentColor="#8B5CF6" style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={[styles.iconBox, { backgroundColor: '#F3E8FF' }]}>
                <Text style={styles.cardEmoji}>✍️</Text>
              </View>
              <View style={styles.headerText}>
                <Text style={[styles.tagText, { color: '#8B5CF6' }]}>SPELLING & WRITING</Text>
                <Text style={styles.cardTitle}>
                  {lang === 'ta' ? 'எழுதுதல் பயிற்சி' : 'Writing Practice'}
                </Text>
              </View>
            </View>

            <Text style={styles.cardDesc}>
              {lang === 'ta'
                ? 'சொற்கள் மற்றும் வாக்கியங்களை எழுதி உங்கள் எழுத்துக்கூட்டை பலப்படுத்துங்கள்.'
                : 'Practice spelling, vocabulary, and sentence formation with immediate encouraging scoring.'}
            </Text>

            <View style={styles.featurePills}>
              <View style={styles.pill}>
                <Text style={styles.pillText}>🔤 Spelling Accuracy</Text>
              </View>
              <View style={styles.pill}>
                <Text style={styles.pillText}>💡 Smart Hints</Text>
              </View>
            </View>

            <LearnlyButton
              label={lang === 'ta' ? 'எழுதத் தொடங்கு ➔' : 'Start Writing Practice ➔'}
              onPress={handleStartWriting}
              variant="secondary"
              style={{ marginTop: 16 }}
            />
          </LearnlyCard>
        </View>
      </ScrollView>
      <BottomNavigation activeTab="practice" lang={lang} />
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
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  screenTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: '#0F172A',
  },
  subTitle: {
    fontSize: 15,
    color: '#64748B',
    marginBottom: 20,
  },
  card: {
    marginBottom: 20,
    padding: 22,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 12,
  },
  iconBox: {
    width: 56,
    height: 56,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardEmoji: {
    fontSize: 28,
  },
  headerText: {
    flex: 1,
  },
  tagText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#4F46E5',
    letterSpacing: 1,
    marginBottom: 2,
  },
  cardTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0F172A',
  },
  cardDesc: {
    fontSize: 14,
    color: '#475569',
    lineHeight: 22,
    marginBottom: 14,
  },
  featurePills: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 4,
  },
  pill: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  pillText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
  },
});
