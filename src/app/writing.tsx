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

import { LanguageChip } from '@/components/ui/Chips';
import { LearnlyButton } from '@/components/ui/LearnlyButton';
import { LearnlyCard } from '@/components/ui/LearnlyCard';
import { getCurrentChildId } from '@/config/learner';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { WRITING_EXERCISES } from '@/data/exercises';
import { fetchBackendExercises } from '@/services/api';
import { recordExerciseCompletion } from '@/services/gamification';
import { Language, WritingExercise } from '@/types/exercise';
import { RewardResult } from '@/types/gamification';
import { evaluateWritingAnswer, WritingEvaluation } from '@/utils/evaluation';

export default function WritingScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ lang?: string }>();
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

  useEffect(() => {
    let isMounted = true;
    setCurrentIndex(0);
    setUserAnswer('');
    setSubmittedAnswer(null);
    setEvaluationResult(null);
    setEarnedReward(null);
    setIsCompleted(false);

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
      } catch {
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
  const currentExercise: WritingExercise | undefined =
    exerciseList[currentIndex] || defaultLocalList[0];
  const expectedAnswer =
    currentExercise?.expectedAnswer || currentExercise?.expected_answer || '';
  const progressPercent =
    totalQuestions > 0 ? ((currentIndex + 1) / totalQuestions) * 100 : 0;

  const submitWritingAnswer = (answer: string) => {
    if (!answer.trim() || submittedAnswer !== null || !currentExercise || !expectedAnswer) return;

    const result = evaluateWritingAnswer(answer, expectedAnswer, lang);

    let reward: RewardResult | null = null;
    try {
      reward = recordExerciseCompletion({
        type: 'writing',
        difficulty: currentExercise.difficulty,
        score: result.score,
        childId: getCurrentChildId(),
        evaluation: result,
      });
    } catch {
      reward = null;
    }

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
    <SafeAreaView style={[styles.safeArea, { backgroundColor: '#F8FAFC' }]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.container}>
          {/* Top Bar */}
          <View style={styles.topBar}>
            <Pressable
              style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}
              onPress={() => router.back()}
            >
              <Text style={styles.backButtonText}>← Back</Text>
            </Pressable>

            <Text style={styles.screenTitle}>
              {lang === 'ta' ? 'எழுதுதல் பயிற்சி' : 'Writing Practice'}
            </Text>

            <LanguageChip lang={lang} />
          </View>

          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator color="#8B5CF6" size="large" />
              <Text style={styles.loadingText}>
                {lang === 'ta' ? 'எழுத்துப் பயிற்சிகள் ஏற்றப்படுகின்றன...' : 'Loading writing exercises...'}
              </Text>
            </View>
          ) : totalQuestions === 0 || !currentExercise ? (
            <LearnlyCard style={styles.completionCard}>
              <Text style={styles.completionTitle}>
                {lang === 'ta' ? 'பயிற்சிகள் இல்லை' : 'No exercises available'}
              </Text>
              <Text style={styles.completionSubtitle}>
                {lang === 'ta'
                  ? 'எழுத்துப் பயிற்சிகளை ஏற்ற முடியவில்லை. முகப்புக்குத் திரும்பி மீண்டும் முயற்சிக்கவும்.'
                  : 'Writing exercises could not be loaded. Go back home and try again.'}
              </Text>
              <LearnlyButton
                label={lang === 'ta' ? 'முகப்புக்குச் செல்க' : 'Back to Home'}
                onPress={() => router.replace({ pathname: '/', params: { lang } })}
                variant="outline"
              />
            </LearnlyCard>
          ) : isCompleted ? (
            /* --- SCREEN 7: WRITING COMPLETION VIEW --- */
            <LearnlyCard style={styles.completionCard}>
              <Text style={styles.completionEmoji}>🎉</Text>
              <Text style={styles.completionTitle}>
                {lang === 'ta' ? 'அற்புதம்!' : 'Awesome Job!'}
              </Text>
              <Text style={styles.completionSubtitle}>
                {lang === 'ta'
                  ? 'எல்லா எழுத்துப் பயிற்சிகளையும் வெற்றிகரமாக முடித்துவிட்டீர்கள்!'
                  : 'You completed all writing practice exercises!'}
              </Text>

              <View style={{ width: '100%', gap: 12 }}>
                <LearnlyButton
                  label={lang === 'ta' ? 'மீண்டும் தொடங்குக' : 'Practice Again'}
                  onPress={handleRestart}
                  variant="secondary"
                />
                <LearnlyButton
                  label={lang === 'ta' ? 'முகப்புக்குச் செல்க' : 'Back to Home'}
                  onPress={() => router.replace({ pathname: '/', params: { lang } })}
                  variant="outline"
                />
              </View>
            </LearnlyCard>
          ) : (
            /* --- SCREEN 6: MAIN WRITING EXERCISE FLOW --- */
            <View style={styles.exerciseSection}>
              {/* Progress Indicator Bar */}
              <View style={styles.progressHeader}>
                <Text style={styles.progressText}>
                  {lang === 'ta'
                    ? `கேள்வி ${currentExercise.questionNumber || currentIndex + 1} / ${totalQuestions}`
                    : `Question ${currentExercise.questionNumber || currentIndex + 1} of ${totalQuestions}`}
                </Text>
                <View style={styles.progressBarTrack}>
                  <View style={[styles.progressBarFill, { width: `${progressPercent}%` }]} />
                </View>
              </View>

              {/* Instruction */}
              <Text style={styles.instructionText}>
                {lang === 'ta'
                  ? 'பயிற்சியை படித்து பதிலை எழுதவும்:'
                  : 'Read the prompt and write your answer:'}
              </Text>

              {/* Prompt Card */}
              <LearnlyCard accentColor="#8B5CF6" style={styles.promptCard}>
                <Text style={styles.promptText}>
                  {currentExercise.prompt || currentExercise.content}
                </Text>
              </LearnlyCard>

              {/* Text Input Area */}
              <View style={styles.inputSection}>
                <Text style={styles.inputLabel}>
                  {lang === 'ta' ? 'உங்கள் பதில்:' : 'Your Answer:'}
                </Text>
                <TextInput
                  style={[
                    styles.textInput,
                    {
                      borderColor: submittedAnswer
                        ? evaluationResult?.correct
                          ? '#10B981'
                          : '#F43F5E'
                        : '#CBD5E1',
                    },
                  ]}
                  placeholder={
                    lang === 'ta' ? 'இங்கே எழுதவும்...' : 'Type your answer here...'
                  }
                  placeholderTextColor="#94A3B8"
                  value={userAnswer}
                  onChangeText={setUserAnswer}
                  editable={!submittedAnswer}
                  autoCapitalize="sentences"
                  autoCorrect={false}
                />
              </View>

              {/* --- SCREEN 7: WRITING RESULT EVALUATION CARD --- */}
              {submittedAnswer && evaluationResult && (
                <LearnlyCard
                  accentColor={evaluationResult.correct ? '#10B981' : '#F43F5E'}
                  style={styles.resultCard}
                >
                  <View style={styles.resultHeaderRow}>
                    <Text
                      style={[
                        styles.resultStatusTitle,
                        { color: evaluationResult.correct ? '#059669' : '#E11D48' },
                      ]}
                    >
                      {evaluationResult.correct
                        ? 'Great job! 🎉'
                        : lang === 'ta'
                        ? "அடுத்து முயற்சி செய்வோம்! 💪"
                        : "Let's try again! 💪"}
                    </Text>
                    <View
                      style={[
                        styles.scoreBadge,
                        { backgroundColor: evaluationResult.correct ? '#D1FAE5' : '#FFE4E6' },
                      ]}
                    >
                      <Text
                        style={[
                          styles.scoreText,
                          { color: evaluationResult.correct ? '#059669' : '#E11D48' },
                        ]}
                      >
                        Score: {evaluationResult.score}/100
                      </Text>
                    </View>
                  </View>

                  <Text style={styles.submittedLabel}>
                    {lang === 'ta' ? 'உங்கள் பதில்:' : 'Your Answer:'}
                  </Text>
                  <Text style={styles.submittedText}>
                    "{submittedAnswer}"
                  </Text>

                  {!evaluationResult.correct && (
                    <>
                      <Text style={[styles.submittedLabel, { marginTop: 10 }]}>
                        {lang === 'ta' ? 'சரியான பதில்:' : 'Correct Answer:'}
                      </Text>
                      <Text style={[styles.submittedText, { color: '#059669' }]}>
                        "{expectedAnswer}"
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

                  {/* Feedback Message */}
                  <View style={styles.feedbackBox}>
                    <Text style={styles.feedbackText}>{evaluationResult.feedback}</Text>
                  </View>
                </LearnlyCard>
              )}

              {/* XP Reward Notification */}
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
                <LearnlyButton
                  label={lang === 'ta' ? 'பதிலைச் சமர்ப்பி' : 'Submit Answer'}
                  onPress={() => submitWritingAnswer(userAnswer)}
                  variant="secondary"
                  disabled={!userAnswer.trim()}
                  style={{ marginTop: 16 }}
                />
              ) : (
                <LearnlyButton
                  label={
                    currentIndex === totalQuestions - 1
                      ? (lang === 'ta' ? 'முடிக்கவும் 🎉' : 'Finish Session 🎉')
                      : (lang === 'ta' ? 'அடுத்த கேள்வி ➔' : 'Next Exercise ➔')
                  }
                  onPress={handleNext}
                  variant="secondary"
                  style={{ marginTop: 16 }}
                />
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
    paddingBottom: Spacing.five,
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
  loadingContainer: {
    paddingVertical: 80,
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#64748B',
  },
  exerciseSection: {
    width: '100%',
  },
  progressHeader: {
    marginBottom: 20,
  },
  progressText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#475569',
    marginBottom: 6,
  },
  progressBarTrack: {
    height: 10,
    borderRadius: 5,
    backgroundColor: '#E2E8F0',
    overflow: 'hidden',
    width: '100%',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 5,
    backgroundColor: '#8B5CF6',
  },
  instructionText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#475569',
    marginBottom: 10,
  },
  promptCard: {
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 120,
    marginBottom: 20,
  },
  promptText: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0F172A',
    textAlign: 'center',
    lineHeight: 34,
    letterSpacing: 0.5,
  },
  inputSection: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#475569',
    marginBottom: 6,
  },
  textInput: {
    minHeight: 56,
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderRadius: 18,
    fontSize: 18,
    fontWeight: '700',
    backgroundColor: '#FFFFFF',
    color: '#0F172A',
    borderWidth: 2,
    letterSpacing: 0.4,
  },
  resultCard: {
    padding: 20,
    marginBottom: 16,
  },
  resultHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  resultStatusTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  scoreBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 8,
  },
  scoreText: {
    fontSize: 14,
    fontWeight: '800',
  },
  submittedLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
    marginBottom: 2,
  },
  submittedText: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
  },
  hintBox: {
    backgroundColor: '#FEF3C7',
    padding: 12,
    borderRadius: 12,
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#F59E0B',
  },
  hintText: {
    color: '#92400E',
    fontSize: 13,
    fontWeight: '700',
  },
  feedbackBox: {
    backgroundColor: '#EDE9FE',
    padding: 12,
    borderRadius: 12,
    marginTop: 12,
  },
  feedbackText: {
    color: '#6D28D9',
    fontSize: 14,
    fontWeight: '700',
  },
  rewardBox: {
    backgroundColor: '#FEF3C7',
    padding: 14,
    borderRadius: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#F59E0B',
    alignItems: 'center',
    gap: 4,
  },
  rewardText: {
    color: '#B45309',
    fontSize: 16,
    fontWeight: '800',
  },
  levelUpText: {
    color: '#059669',
    fontSize: 14,
    fontWeight: '800',
  },
  badgeRewardText: {
    color: '#6D28D9',
    fontSize: 13,
    fontWeight: '800',
  },
  completionCard: {
    padding: 28,
    alignItems: 'center',
    marginTop: 20,
  },
  completionEmoji: {
    fontSize: 60,
    marginBottom: 12,
  },
  completionTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 8,
  },
  completionSubtitle: {
    fontSize: 16,
    color: '#475569',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 24,
  },
});
