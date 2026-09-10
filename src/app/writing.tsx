import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { DEMO_CHILD_ID } from '@/config/learner';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { WRITING_EXERCISES } from '@/data/exercises';
import { useTheme } from '@/hooks/use-theme';
import { fetchBackendExercises } from '@/services/api';
import { recordExerciseCompletion } from '@/services/gamification';
import { RewardResult } from '@/types/gamification';
import { Language, WritingExercise } from '@/types/exercise';
import { evaluateWritingAnswer, WritingEvaluation } from '@/utils/evaluation';

export default function WritingScreen() {
  const theme = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams<{ lang?: string }>();

  // Determine current language from route param (defaults to English)
  const lang: Language = params.lang === 'ta' ? 'ta' : 'en';

  const defaultLocalList: WritingExercise[] = WRITING_EXERCISES[lang];

  const [exerciseList, setExerciseList] = useState<WritingExercise[]>(defaultLocalList);
  const [isLoading, setIsLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userAnswer, setUserAnswer] = useState('');
  const [submittedAnswer, setSubmittedAnswer] = useState<string | null>(null);
  const [evaluationResult, setEvaluationResult] = useState<WritingEvaluation | null>(null);
  const [earnedReward, setEarnedReward] = useState<RewardResult | null>(null);
  const [isCompleted, setIsCompleted] = useState(false);

  // Fetch writing exercises from backend on mount or language change
  useEffect(() => {
    let isMounted = true;
    async function loadWritingExercises() {
      setIsLoading(true);
      try {
        const fetched = await fetchBackendExercises({
          language: lang,
          type: 'writing',
        });
        if (isMounted && fetched.length > 0) {
          setExerciseList(fetched as WritingExercise[]);
        } else if (isMounted) {
          setExerciseList(defaultLocalList);
        }
      } catch (err) {
        if (isMounted) {
          setExerciseList(defaultLocalList);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }
    loadWritingExercises();
    return () => {
      isMounted = false;
    };
  }, [lang]);

  const totalQuestions = exerciseList.length;
  const currentExercise: WritingExercise = exerciseList[currentIndex] || defaultLocalList[0];
  const progressPercent = ((currentIndex + 1) / totalQuestions) * 100;

  /**
   * submitWritingAnswer(answer)
   * Evaluates user's answer locally, calculates XP/streaks/badges, and prevents duplicate submissions.
   */
  const submitWritingAnswer = (answer: string) => {
    // Duplicate submit protection: ignore if answer is empty or already submitted
    if (!answer.trim() || submittedAnswer !== null) return;

    // Evaluate answer with normalization and similarity scoring
    const result = evaluateWritingAnswer(answer, currentExercise.expectedAnswer || currentExercise.prompt, lang);

    // Record exercise completion for XP, level, streak, and badges
    const reward = recordExerciseCompletion({
      type: 'writing',
      difficulty: currentExercise.difficulty,
      score: result.score,
      childId: DEMO_CHILD_ID,
      evaluation: result,
    });

    setSubmittedAnswer(answer.trim());
    setEvaluationResult(result);
    setEarnedReward(reward);
  };

  const handleNext = () => {
    setUserAnswer('');
    setSubmittedAnswer(null);
    setEvaluationResult(null);
    setEarnedReward(null);

    if (currentIndex < totalQuestions - 1) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      setIsCompleted(true);
    }
  };

  const handleRestart = () => {
    setCurrentIndex(0);
    setUserAnswer('');
    setSubmittedAnswer(null);
    setEvaluationResult(null);
    setEarnedReward(null);
    setIsCompleted(false);
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
                Writing Practice
              </Text>
            </View>

            <View style={[styles.langBadge, { backgroundColor: theme.backgroundElement }]}>
              <Text style={styles.langBadgeText}>
                {lang === 'ta' ? 'தமிழ் 🇮🇳' : 'English 🇬🇧'}
              </Text>
            </View>
          </View>

          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator color="#4C6EF5" size="large" />
              <Text style={[styles.loadingText, { color: theme.textSecondary }]}>
                {lang === 'ta' ? 'எழுத்துப் பயிற்சிகள் ஏற்றப்படுகின்றன...' : 'Loading writing exercises...'}
              </Text>
            </View>
          ) : isCompleted ? (
            /* --- COMPLETION VIEW --- */
            <View style={[styles.completionCard, { backgroundColor: '#4C6EF5' }]}>
              <Text style={styles.completionEmoji}>🎉</Text>
              <Text style={styles.completionTitle}>
                {lang === 'ta' ? 'அற்புதம்!' : 'Awesome Job!'}
              </Text>
              <Text style={styles.completionSubtitle}>
                {lang === 'ta'
                  ? 'எல்லா எழுத்துப் பயிற்சிகளையும் வெற்றிகரமாக முடித்துவிட்டீர்கள்!'
                  : 'You completed all writing practice exercises!'}
              </Text>

              <View style={styles.completionActions}>
                <Pressable
                  style={({ pressed }) => [
                    styles.primaryButton,
                    styles.whiteButton,
                    pressed && styles.buttonPressed,
                  ]}
                  onPress={handleRestart}
                >
                  <Text style={styles.primaryButtonTextDark}>
                    {lang === 'ta' ? 'மீண்டும் தொடங்குக' : 'Practice Again'}
                  </Text>
                </Pressable>

                <Pressable
                  style={({ pressed }) => [
                    styles.secondaryOutlineButton,
                    pressed && styles.buttonPressed,
                  ]}
                  onPress={() => router.back()}
                >
                  <Text style={styles.secondaryOutlineText}>
                    {lang === 'ta' ? 'முகப்புக்குச் செல்க' : 'Back to Home'}
                  </Text>
                </Pressable>
              </View>
            </View>
          ) : (
            /* --- MAIN EXERCISE FLOW --- */
            <View style={styles.exerciseSection}>
              {/* Progress Indicator */}
              <View style={styles.progressHeader}>
                <Text style={[styles.progressText, { color: theme.textSecondary }]}>
                  {lang === 'ta'
                    ? `கேள்வி ${currentExercise.questionNumber || currentIndex + 1} / ${totalQuestions}`
                    : `Question ${currentExercise.questionNumber || currentIndex + 1} of ${totalQuestions}`}
                </Text>
                <View style={[styles.progressBarTrack, { backgroundColor: theme.backgroundElement }]}>
                  <View
                    style={[
                      styles.progressBarFill,
                      { width: `${progressPercent}%`, backgroundColor: '#4C6EF5' },
                    ]}
                  />
                </View>
              </View>

              {/* Instruction Label */}
              <Text style={[styles.instructionText, { color: theme.textSecondary }]}>
                {lang === 'ta'
                  ? 'பயிற்சியை படித்து பதிலை எழுதவும்:'
                  : 'Read the prompt and write your answer:'}
              </Text>

              {/* Large Exercise Prompt Card */}
              <View style={[styles.promptCard, { backgroundColor: theme.backgroundElement }]}>
                <Text style={[styles.promptText, { color: theme.text }]}>
                  {currentExercise.prompt || currentExercise.content}
                </Text>
              </View>

              {/* Text Input Field */}
              <View style={styles.inputSection}>
                <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>
                  {lang === 'ta' ? 'உங்கள் பதில்:' : 'Your Answer:'}
                </Text>
                <TextInput
                  style={[
                    styles.textInput,
                    {
                      backgroundColor: theme.backgroundElement,
                      color: theme.text,
                      borderColor: submittedAnswer
                        ? evaluationResult?.correct
                          ? '#34A853'
                          : '#EA4335'
                        : '#C7D2FE',
                    },
                  ]}
                  placeholder={
                    lang === 'ta' ? 'இங்கே எழுதவும்...' : 'Type your answer here...'
                  }
                  placeholderTextColor={theme.textSecondary}
                  value={userAnswer}
                  onChangeText={setUserAnswer}
                  editable={!submittedAnswer}
                  autoCapitalize="sentences"
                  autoCorrect={false}
                />
              </View>

              {/* Submitted Answer Display & Result Evaluation Card */}
              {submittedAnswer && evaluationResult && (
                <View
                  style={[
                    styles.resultCard,
                    evaluationResult.correct
                      ? styles.resultCardCorrect
                      : styles.resultCardIncorrect,
                  ]}
                >
                  <View style={styles.resultHeaderRow}>
                    <Text
                      style={[
                        styles.resultStatusTitle,
                        evaluationResult.correct
                          ? styles.textSuccess
                          : styles.textError,
                      ]}
                    >
                      {evaluationResult.correct
                        ? 'Correct! 🎉'
                        : lang === 'ta'
                        ? '✗ மீண்டும் முயற்சிக்கவும்'
                        : '✗ Try again'}
                    </Text>
                    <View
                      style={[
                        styles.scoreBadge,
                        evaluationResult.correct
                          ? styles.scoreBadgeSuccess
                          : styles.scoreBadgeError,
                      ]}
                    >
                      <Text
                        style={[
                          styles.scoreText,
                          evaluationResult.correct
                            ? styles.textSuccess
                            : styles.textError,
                        ]}
                      >
                        Score: {evaluationResult.score}/100
                      </Text>
                    </View>
                  </View>

                  <Text style={[styles.submittedLabel, { color: theme.textSecondary }]}>
                    {lang === 'ta' ? 'உங்கள் பதில்:' : 'Your Answer:'}
                  </Text>
                  <Text style={[styles.submittedText, { color: theme.text, marginBottom: 8 }]}>
                    "{submittedAnswer}"
                  </Text>

                  {!evaluationResult.correct && (
                    <>
                      <Text style={[styles.submittedLabel, { color: theme.textSecondary }]}>
                        {lang === 'ta' ? 'சரியான பதில்:' : 'Correct Answer:'}
                      </Text>
                      <Text style={[styles.submittedText, { color: '#137333', marginBottom: 8 }]}>
                        "{currentExercise.expectedAnswer || currentExercise.prompt}"
                      </Text>
                    </>
                  )}

                  {currentExercise.hint && !evaluationResult.correct && (
                    <View style={styles.hintBox}>
                      <Text style={styles.hintText}>
                        💡 {lang === 'ta' ? 'குறிப்பு:' : 'Hint:'} {currentExercise.hint}
                      </Text>
                    </View>
                  )}
                </View>
              )}

              {/* Dynamic Feedback Banner */}
              {submittedAnswer && evaluationResult && (
                <View
                  style={[
                    styles.feedbackBanner,
                    evaluationResult.correct
                      ? styles.feedbackBannerSuccess
                      : styles.feedbackBannerWarning,
                  ]}
                >
                  <Text
                    style={[
                      styles.feedbackText,
                      evaluationResult.correct
                        ? styles.feedbackTextSuccess
                        : styles.feedbackTextWarning,
                    ]}
                  >
                    {evaluationResult.feedback}
                  </Text>
                </View>
              )}

              {/* XP & Reward Feedback Banner */}
              {earnedReward && earnedReward.xpEarned > 0 && (
                <View style={styles.rewardBox}>
                  <Text style={styles.rewardText}>
                    ✨ +{earnedReward.xpEarned} XP Earned!
                  </Text>
                  {earnedReward.leveledUp && (
                    <Text style={styles.levelUpText}>
                      🎉 Level Up! Reached Level {earnedReward.newLevel}!
                    </Text>
                  )}
                  {earnedReward.newBadges.map((badge) => (
                    <Text key={badge.id} style={styles.badgeRewardText}>
                      {badge.emoji} Unlocked: {badge.name}!
                    </Text>
                  ))}
                </View>
              )}

              {/* Submit / Next Button */}
              {!submittedAnswer ? (
                <Pressable
                  style={({ pressed }) => [
                    styles.primaryButton,
                    !userAnswer.trim() && styles.buttonDisabled,
                    pressed && styles.buttonPressed,
                  ]}
                  onPress={() => submitWritingAnswer(userAnswer)}
                  disabled={!userAnswer.trim()}
                  accessibilityRole="button"
                >
                  <Text style={styles.primaryButtonText}>
                    {lang === 'ta' ? 'பதிலைச் சமர்ப்பி' : 'Submit Answer'}
                  </Text>
                </Pressable>
              ) : (
                <Pressable
                  style={({ pressed }) => [
                    styles.primaryButton,
                    pressed && styles.buttonPressed,
                  ]}
                  onPress={handleNext}
                  accessibilityRole="button"
                >
                  <Text style={styles.primaryButtonText}>
                    {currentIndex === totalQuestions - 1
                      ? lang === 'ta'
                        ? 'முடிக்கவும்'
                        : 'Finish'
                      : lang === 'ta'
                      ? 'அடுத்த கேள்வி ➔'
                      : 'Next ➔'}
                  </Text>
                </Pressable>
              )}
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
  loadingContainer: {
    paddingVertical: Spacing.five * 2,
    alignItems: 'center',
    gap: Spacing.three,
  },
  loadingText: {
    fontSize: 15,
    fontWeight: '600',
  },
  exerciseSection: {
    width: '100%',
  },
  progressHeader: {
    marginBottom: Spacing.four,
  },
  progressText: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: Spacing.one,
  },
  progressBarTrack: {
    height: 10,
    borderRadius: 5,
    overflow: 'hidden',
    width: '100%',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 5,
  },
  instructionText: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: Spacing.two,
  },
  promptCard: {
    padding: Spacing.five,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 120,
    marginBottom: Spacing.four,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  promptText: {
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: 32,
  },
  inputSection: {
    marginBottom: Spacing.four,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: Spacing.one,
  },
  textInput: {
    minHeight: 56,
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
    borderRadius: 16,
    fontSize: 18,
    fontWeight: '600',
    borderWidth: 2,
  },
  resultCard: {
    padding: Spacing.three + 2,
    borderRadius: 16,
    marginBottom: Spacing.four,
    borderLeftWidth: 5,
  },
  resultCardCorrect: {
    backgroundColor: '#E6F4EA',
    borderLeftColor: '#34A853',
  },
  resultCardIncorrect: {
    backgroundColor: '#FCE8E6',
    borderLeftColor: '#EA4335',
  },
  resultHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.two,
  },
  resultStatusTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  scoreBadge: {
    paddingHorizontal: Spacing.two + 2,
    paddingVertical: Spacing.one,
    borderRadius: 8,
  },
  scoreBadgeSuccess: {
    backgroundColor: '#CEEAD6',
  },
  scoreBadgeError: {
    backgroundColor: '#FAD2CF',
  },
  scoreText: {
    fontSize: 14,
    fontWeight: '800',
  },
  textSuccess: {
    color: '#137333',
  },
  textError: {
    color: '#C5221F',
  },
  submittedLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 2,
  },
  submittedText: {
    fontSize: 17,
    fontWeight: '700',
  },
  hintBox: {
    backgroundColor: '#FEF3C7',
    padding: Spacing.three,
    borderRadius: 12,
    marginTop: 4,
    borderWidth: 1,
    borderColor: '#F59E0B',
  },
  hintText: {
    color: '#92400E',
    fontSize: 14,
    fontWeight: '600',
  },
  feedbackBanner: {
    padding: Spacing.three,
    borderRadius: 12,
    marginBottom: Spacing.five,
    borderWidth: 1,
  },
  feedbackBannerSuccess: {
    backgroundColor: '#E6F4EA',
    borderColor: '#34A853',
  },
  feedbackBannerWarning: {
    backgroundColor: '#FEF3C7',
    borderColor: '#F59E0B',
  },
  feedbackText: {
    fontSize: 15,
    fontWeight: '700',
    textAlign: 'center',
  },
  feedbackTextSuccess: {
    color: '#137333',
  },
  feedbackTextWarning: {
    color: '#92400E',
  },
  primaryButton: {
    backgroundColor: '#4C6EF5',
    paddingVertical: Spacing.four,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.98 }],
  },
  completionCard: {
    padding: Spacing.five,
    borderRadius: 24,
    alignItems: 'center',
    marginTop: Spacing.three,
  },
  completionEmoji: {
    fontSize: 56,
    marginBottom: Spacing.two,
  },
  completionTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: Spacing.two,
  },
  completionSubtitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#E0E7FF',
    textAlign: 'center',
    marginBottom: Spacing.five,
    lineHeight: 24,
  },
  completionActions: {
    width: '100%',
    gap: Spacing.three,
  },
  whiteButton: {
    backgroundColor: '#FFFFFF',
  },
  primaryButtonTextDark: {
    color: '#4C6EF5',
    fontSize: 17,
    fontWeight: '700',
  },
  secondaryOutlineButton: {
    borderWidth: 2,
    borderColor: '#FFFFFF',
    paddingVertical: Spacing.three,
    borderRadius: 16,
    alignItems: 'center',
  },
  secondaryOutlineText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  rewardBox: {
    backgroundColor: '#EEF2FF',
    padding: Spacing.three,
    borderRadius: 14,
    marginBottom: Spacing.four,
    borderWidth: 1,
    borderColor: '#C7D2FE',
    alignItems: 'center',
    gap: 4,
  },
  rewardText: {
    color: '#3730A3',
    fontSize: 16,
    fontWeight: '800',
  },
  levelUpText: {
    color: '#059669',
    fontSize: 14,
    fontWeight: '700',
  },
  badgeRewardText: {
    color: '#D97706',
    fontSize: 13,
    fontWeight: '700',
  },
});
