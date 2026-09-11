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
import {
  getRecordingPermissionsAsync,
  RecordingPresets,
  requestRecordingPermissionsAsync,
  useAudioRecorder,
} from 'expo-audio';
import { SafeAreaView } from 'react-native-safe-area-context';

import { LanguageChip } from '@/components/ui/Chips';
import { LearnlyButton } from '@/components/ui/LearnlyButton';
import { LearnlyCard } from '@/components/ui/LearnlyCard';
import { MicButtonState, MicrophoneButton } from '@/components/ui/MicrophoneButton';
import { getCurrentChildId } from '@/config/learner';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { READING_EXERCISES } from '@/data/exercises';
import { assessReading, fetchBackendExercises, transcribeAudio } from '@/services/api';
import { recordExerciseCompletion } from '@/services/gamification';
import { AssessmentResponse } from '@/types/assessment';
import { ExerciseItem, Language, ReadingExercise } from '@/types/exercise';

export default function ReadingScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ lang?: string }>();
  const lang: Language = params.lang === 'ta' ? 'ta' : 'en';

  const defaultLocalList: ReadingExercise[] = READING_EXERCISES[lang];
  const SESSION_TARGET_QUESTIONS = 5;

  const audioRecorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);

  const [questionCount, setQuestionCount] = useState(1);
  const [currentDifficulty, setCurrentDifficulty] = useState<number>(1);
  const [usedIds, setUsedIds] = useState<Set<string>>(new Set());
  const [currentExercise, setCurrentExercise] = useState<ReadingExercise>(defaultLocalList[0]);
  const [isLoadingNext, setIsLoadingNext] = useState(false);

  const [micState, setMicState] = useState<MicButtonState>('IDLE');
  const [userTranscript, setUserTranscript] = useState<string | null>(null);
  const [emptyTranscriptWarning, setEmptyTranscriptWarning] = useState<string | null>(null);
  const [isCompleted, setIsCompleted] = useState(false);

  // API Assessment State
  const [isAssessing, setIsAssessing] = useState(false);
  const [assessmentResult, setAssessmentResult] = useState<AssessmentResponse | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);

  const progressPercent = (questionCount / SESSION_TARGET_QUESTIONS) * 100;

  const mapDifficultyToNum = (diff?: string): number => {
    if (diff === 'easy') return 1;
    if (diff === 'hard') return 3;
    return 2;
  };

  useEffect(() => {
    let isMounted = true;
    async function loadInitialExercise() {
      try {
        const fetched = await fetchBackendExercises({
          language: lang,
          type: 'reading',
          difficulty: 'easy',
        });
        if (isMounted && fetched.length > 0) {
          const initialEx = fetched[0] as ReadingExercise;
          setCurrentExercise(initialEx);
          setUsedIds(new Set([initialEx.id]));
        } else if (isMounted) {
          setUsedIds(new Set([defaultLocalList[0].id]));
        }
      } catch (err) {
        if (isMounted) {
          setUsedIds(new Set([defaultLocalList[0].id]));
        }
      }
    }
    loadInitialExercise();
    return () => {
      isMounted = false;
    };
  }, [lang]);

  const startReading = async () => {
    try {
      setMicState('REQUESTING');
      setEmptyTranscriptWarning(null);
      setApiError(null);
      setAssessmentResult(null);
      setUserTranscript(null);

      const currentPerm = await getRecordingPermissionsAsync();
      let hasPermission = currentPerm.granted || currentPerm.status === 'granted';

      if (!hasPermission) {
        const requestResult = await requestRecordingPermissionsAsync();
        hasPermission = requestResult.granted || requestResult.status === 'granted';
      }

      if (hasPermission) {
        await audioRecorder.prepareToRecordAsync();
        audioRecorder.record();
        setMicState('LISTENING');
      } else {
        setMicState('DENIED');
      }
    } catch (error) {
      console.error('Failed to start audio recording:', error);
      setMicState('DENIED');
    }
  };

  const stopReading = async () => {
    try {
      setMicState('TRANSCRIBING');
      setEmptyTranscriptWarning(null);
      setApiError(null);

      await audioRecorder.stop();
      const uri = audioRecorder.uri;

      if (!uri) {
        setMicState('READY');
        setEmptyTranscriptWarning(
          lang === 'ta'
            ? 'தெளிவாக கேட்கவில்லை. தயவுசெய்து மீண்டும் பேசவும்! 🎤'
            : 'Could not hear clearly. Please try speaking again! 🎤'
        );
        return;
      }

      const realTranscript = await transcribeAudio(uri, lang);
      setMicState('READY');

      if (!realTranscript || !realTranscript.trim()) {
        setEmptyTranscriptWarning(
          lang === 'ta'
            ? 'தெளிவாக கேட்கவில்லை. தயவுசெய்து மீண்டும் பேசவும்! 🎤'
            : 'Could not hear clearly. Please try speaking again! 🎤'
        );
      } else {
        const trimmed = realTranscript.trim();
        setUserTranscript(trimmed);
        setEmptyTranscriptWarning(null);
        await submitAssessment(trimmed);
      }
    } catch (error: any) {
      console.error('Failed to transcribe audio:', error);
      setMicState('READY');
      setEmptyTranscriptWarning(
        lang === 'ta'
          ? 'தெளிவாக கேட்கவில்லை. தயவுசெய்து மீண்டும் பேசவும்! 🎤'
          : 'Could not hear clearly. Please try speaking again! 🎤'
      );
    }
  };

  const submitAssessment = async (transcript: string | null) => {
    if (!transcript || !transcript.trim()) {
      setEmptyTranscriptWarning(
        lang === 'ta'
          ? 'தெளிவாக கேட்கவில்லை. தயவுசெய்து மீண்டும் பேசவும்! 🎤'
          : 'Could not hear clearly. Please try speaking again! 🎤'
      );
      return;
    }

    setEmptyTranscriptWarning(null);
    setIsAssessing(true);
    setApiError(null);

    try {
      const result = await assessReading({
        exerciseId: currentExercise.id,
        expectedText: currentExercise.text || currentExercise.content || '',
        userTranscript: transcript.trim(),
        language: currentExercise.language || lang,
        childId: getCurrentChildId(),
      });

      setAssessmentResult(result);

      recordExerciseCompletion({
        type: 'reading',
        difficulty: currentExercise.difficulty,
        score: result.score,
        accuracy: result.accuracy,
        fluency: result.fluency,
        skill: result.skill,
        childId: getCurrentChildId(),
      });
    } catch (error: any) {
      console.error('FastAPI assessment call error:', error);
      setApiError(
        lang === 'ta'
          ? 'இப்போது உங்கள் வாசிப்பை சரிபார்க்க முடியவில்லை. மீண்டும் முயற்சிக்கவும்.'
          : "Couldn't check your reading right now. Please try again."
      );
    } finally {
      setIsAssessing(false);
    }
  };

  const handleNextQuestion = async () => {
    setUserTranscript(null);
    setEmptyTranscriptWarning(null);
    setApiError(null);

    if (questionCount >= SESSION_TARGET_QUESTIONS) {
      setAssessmentResult(null);
      setIsCompleted(true);
      return;
    }

    const nextDiffStr: 'easy' | 'medium' | 'hard' = assessmentResult?.nextDifficulty || 'easy';
    const nextSkill = assessmentResult?.skill;
    const nextDiffNum = mapDifficultyToNum(nextDiffStr);

    setIsLoadingNext(true);

    try {
      let candidates: ExerciseItem[] = [];
      if (nextSkill) {
        candidates = await fetchBackendExercises({
          language: lang,
          type: 'reading',
          difficulty: nextDiffStr,
          skill: nextSkill,
        });
      }

      let unused = candidates.filter((ex) => !usedIds.has(ex.id));

      if (unused.length === 0) {
        candidates = await fetchBackendExercises({
          language: lang,
          type: 'reading',
          difficulty: nextDiffStr,
        });
        unused = candidates.filter((ex) => !usedIds.has(ex.id));
      }

      if (unused.length === 0) {
        const localMatches = defaultLocalList.filter(
          (ex) => ex.difficulty === nextDiffNum && !usedIds.has(ex.id)
        );
        if (localMatches.length > 0) {
          unused = localMatches;
        } else {
          unused = defaultLocalList.filter((ex) => !usedIds.has(ex.id));
        }
      }

      const nextEx = (unused[0] || defaultLocalList[0]) as ReadingExercise;
      const newHistory = new Set(usedIds);
      newHistory.add(nextEx.id);
      setUsedIds(newHistory);

      setCurrentDifficulty(nextDiffNum);
      setCurrentExercise(nextEx);
      setQuestionCount((prev) => prev + 1);
      setAssessmentResult(null);
    } catch (err) {
      console.error('Failed to pick next exercise:', err);
    } finally {
      setIsLoadingNext(false);
    }
  };

  const handleMicTap = () => {
    if (micState === 'LISTENING') {
      stopReading();
    } else if (micState !== 'TRANSCRIBING' && micState !== 'REQUESTING' && !isAssessing && !isLoadingNext) {
      startReading();
    }
  };

  const handleRestart = async () => {
    setIsLoadingNext(true);
    try {
      const fetched = await fetchBackendExercises({
        language: lang,
        type: 'reading',
        difficulty: 'easy',
      });
      const initialEx = (fetched[0] || defaultLocalList[0]) as ReadingExercise;
      setQuestionCount(1);
      setCurrentDifficulty(1);
      setUsedIds(new Set([initialEx.id]));
      setCurrentExercise(initialEx);
      setMicState('IDLE');
      setUserTranscript(null);
      setEmptyTranscriptWarning(null);
      setAssessmentResult(null);
      setApiError(null);
      setIsCompleted(false);
    } finally {
      setIsLoadingNext(false);
    }
  };

  const formatDifficulty = (diff?: string) => {
    if (!diff) return 'Medium';
    return diff.charAt(0).toUpperCase() + diff.slice(1);
  };

  const isBusy = isAssessing || micState === 'TRANSCRIBING' || isLoadingNext;

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
              onPress={() => !isBusy && router.back()}
              disabled={isBusy}
            >
              <Text style={styles.backButtonText}>← Back</Text>
            </Pressable>

            <Text style={styles.screenTitle}>
              {lang === 'ta' ? 'வாசித்தல் பயிற்சி' : 'Reading Practice'}
            </Text>

            <LanguageChip lang={lang} />
          </View>

          {isCompleted ? (
            /* --- SCREEN 5: READING COMPLETION VIEW --- */
            <LearnlyCard style={styles.completionCard}>
              <Text style={styles.completionEmoji}>🎉</Text>
              <Text style={styles.completionTitle}>
                {lang === 'ta' ? 'அற்புதம்!' : 'Awesome Job!'}
              </Text>
              <Text style={styles.completionSubtitle}>
                {lang === 'ta'
                  ? 'எல்லா வாசிப்பு பயிற்சிகளையும் வெற்றிகரமாக முடித்துவிட்டீர்கள்!'
                  : 'You completed all reading practice exercises!'}
              </Text>

              <View style={{ width: '100%', gap: 12 }}>
                <LearnlyButton
                  label={lang === 'ta' ? 'மீண்டும் தொடங்குக' : 'Practice Again'}
                  onPress={handleRestart}
                  variant="primary"
                />
                <LearnlyButton
                  label={lang === 'ta' ? 'முகப்புக்குச் செல்க' : 'Back to Home'}
                  onPress={() => router.back()}
                  variant="outline"
                />
              </View>
            </LearnlyCard>
          ) : (
            /* --- SCREEN 4: MAIN READING EXERCISE FLOW --- */
            <View style={styles.exerciseSection}>
              {/* Progress Indicator Bar */}
              <View style={styles.progressHeader}>
                <View style={styles.progressLabelRow}>
                  <Text style={styles.progressText}>
                    {lang === 'ta'
                      ? `கேள்வி ${questionCount} / ${SESSION_TARGET_QUESTIONS}`
                      : `Question ${questionCount} of ${SESSION_TARGET_QUESTIONS}`}
                  </Text>
                  <Text style={styles.diffBadge}>
                    Level {currentDifficulty}
                  </Text>
                </View>
                <View style={styles.progressBarTrack}>
                  <View style={[styles.progressBarFill, { width: `${progressPercent}%` }]} />
                </View>
              </View>

              {/* Instruction */}
              <Text style={styles.instructionText}>
                {lang === 'ta'
                  ? 'வாக்கியத்தை சத்தமாக வாசிக்கவும்:'
                  : 'Read the sentence aloud:'}
              </Text>

              {/* Readability Sentence Display Card */}
              <LearnlyCard accentColor="#4F46E5" style={styles.sentenceCard}>
                {isLoadingNext ? (
                  <ActivityIndicator color="#4F46E5" size="large" />
                ) : (
                  <Text style={styles.sentenceText}>
                    "{currentExercise.text || currentExercise.content || ''}"
                  </Text>
                )}
              </LearnlyCard>

              {/* Microphone Section */}
              <View style={styles.micSection}>
                <MicrophoneButton
                  state={micState}
                  onPress={handleMicTap}
                  disabled={micState === 'REQUESTING' || isBusy}
                />
              </View>

              {/* Transcript Display Box */}
              {userTranscript && (
                <View style={styles.transcriptBox}>
                  <Text style={styles.transcriptLabel}>
                    {lang === 'ta' ? 'நீங்கள் கூறியது:' : 'You said:'}
                  </Text>
                  <Text style={styles.transcriptText}>
                    "{userTranscript}"
                  </Text>
                </View>
              )}

              {/* Empty Transcript Warning */}
              {emptyTranscriptWarning && (
                <View style={styles.warningBanner}>
                  <Text style={styles.warningText}>⚠️ {emptyTranscriptWarning}</Text>
                </View>
              )}

              {/* Analyzing Indicator */}
              {isAssessing && (
                <View style={styles.loadingBanner}>
                  <ActivityIndicator color="#4F46E5" size="small" style={{ marginRight: 8 }} />
                  <Text style={styles.loadingText}>
                    {lang === 'ta'
                      ? 'உங்கள் வாசிப்பு சரிபார்க்கப்படுகிறது...'
                      : 'Analyzing your reading...'}
                  </Text>
                </View>
              )}

              {/* Error Banner */}
              {apiError && (
                <View style={styles.errorBanner}>
                  <Text style={styles.errorText}>{apiError}</Text>
                </View>
              )}

              {/* --- SCREEN 5: AI ASSESSMENT RESULT CARD --- */}
              {assessmentResult && (
                <LearnlyCard
                  accentColor={assessmentResult.needsPractice ? '#F59E0B' : '#10B981'}
                  style={styles.assessmentCard}
                >
                  <Text
                    style={[
                      styles.assessmentStatusHeader,
                      { color: assessmentResult.needsPractice ? '#D97706' : '#059669' },
                    ]}
                  >
                    {assessmentResult.needsPractice
                      ? lang === 'ta'
                        ? 'மீண்டும் பயிற்சி செய்வோம் 💪'
                        : "Let's practice this skill again 💪"
                      : lang === 'ta'
                      ? 'அற்புதம்! 🎉'
                      : 'Great job! 🎉'}
                  </Text>

                  {/* Metrics Grid */}
                  <View style={styles.metricsRow}>
                    <View style={styles.metricItem}>
                      <Text style={styles.metricValue}>{assessmentResult.score}/100</Text>
                      <Text style={styles.metricLabel}>Score</Text>
                    </View>
                    <View style={styles.metricItem}>
                      <Text style={styles.metricValue}>{assessmentResult.accuracy}%</Text>
                      <Text style={styles.metricLabel}>Accuracy</Text>
                    </View>
                    <View style={styles.metricItem}>
                      <Text style={styles.metricValue}>{assessmentResult.fluency}%</Text>
                      <Text style={styles.metricLabel}>Fluency</Text>
                    </View>
                  </View>

                  <View style={styles.detailsGrid}>
                    <Text style={styles.detailText}>
                      Skill: <Text style={{ fontWeight: '800', color: '#0F172A' }}>{assessmentResult.skill}</Text>
                    </Text>
                    <Text style={styles.detailText}>
                      Next level:{' '}
                      <Text style={{ fontWeight: '800', color: '#4F46E5' }}>
                        {formatDifficulty(assessmentResult.nextDifficulty)}
                      </Text>
                    </Text>
                  </View>

                  {/* AI Feedback */}
                  <View style={styles.aiFeedbackBox}>
                    <Text style={styles.aiFeedbackText}>
                      💬 {assessmentResult.feedback}
                    </Text>
                  </View>
                </LearnlyCard>
              )}

              {/* Next Question CTA */}
              {assessmentResult && (
                <LearnlyButton
                  label={
                    isLoadingNext
                      ? 'Loading...'
                      : questionCount === SESSION_TARGET_QUESTIONS
                      ? (lang === 'ta' ? 'முடிக்கவும் 🎉' : 'Finish Session 🎉')
                      : (lang === 'ta' ? 'அடுத்தது ➔' : 'Next Exercise ➔')
                  }
                  onPress={handleNextQuestion}
                  variant="primary"
                  loading={isLoadingNext}
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
  exerciseSection: {
    width: '100%',
  },
  progressHeader: {
    marginBottom: 20,
  },
  progressLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  progressText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#475569',
  },
  diffBadge: {
    fontSize: 12,
    fontWeight: '800',
    color: '#4F46E5',
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
    backgroundColor: '#4F46E5',
  },
  instructionText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#475569',
    marginBottom: 10,
  },
  sentenceCard: {
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 140,
    marginBottom: 24,
  },
  sentenceText: {
    fontSize: 28,
    fontWeight: '800',
    color: '#0F172A',
    textAlign: 'center',
    lineHeight: 40,
    letterSpacing: 0.6,
  },
  micSection: {
    alignItems: 'center',
    marginBottom: 20,
  },
  transcriptBox: {
    backgroundColor: '#F1F5F9',
    padding: 16,
    borderRadius: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  transcriptLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
    marginBottom: 4,
  },
  transcriptText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
  },
  warningBanner: {
    backgroundColor: '#FEF3C7',
    padding: 14,
    borderRadius: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#F59E0B',
  },
  warningText: {
    color: '#92400E',
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
  },
  loadingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EDE9FE',
    padding: 14,
    borderRadius: 14,
    marginBottom: 16,
  },
  loadingText: {
    color: '#4F46E5',
    fontSize: 14,
    fontWeight: '700',
  },
  errorBanner: {
    backgroundColor: '#FFE4E6',
    padding: 14,
    borderRadius: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#F43F5E',
  },
  errorText: {
    color: '#E11D48',
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
  },
  assessmentCard: {
    padding: 20,
    marginBottom: 16,
  },
  assessmentStatusHeader: {
    fontSize: 20,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 16,
  },
  metricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: '#F1F5F9',
    padding: 14,
    borderRadius: 16,
    marginBottom: 16,
  },
  metricItem: {
    alignItems: 'center',
  },
  metricValue: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
  },
  metricLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
    marginTop: 2,
  },
  detailsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 14,
    paddingHorizontal: 4,
  },
  detailText: {
    fontSize: 13,
    color: '#475569',
  },
  aiFeedbackBox: {
    backgroundColor: '#EDE9FE',
    padding: 14,
    borderRadius: 14,
  },
  aiFeedbackText: {
    color: '#4338CA',
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 20,
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
