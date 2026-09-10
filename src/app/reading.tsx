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

import { DEMO_CHILD_ID } from '@/config/learner';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { READING_EXERCISES } from '@/data/exercises';
import { useTheme } from '@/hooks/use-theme';
import { assessReading, fetchBackendExercises, transcribeAudio } from '@/services/api';
import { recordExerciseCompletion } from '@/services/gamification';
import { AssessmentResponse } from '@/types/assessment';
import { ExerciseItem, Language, ReadingExercise } from '@/types/exercise';

type MicState = 'IDLE' | 'REQUESTING' | 'READY' | 'LISTENING' | 'TRANSCRIBING' | 'DENIED';

export default function ReadingScreen() {
  const theme = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams<{ lang?: string }>();

  // Determine current language from route param (defaults to English)
  const lang: Language = params.lang === 'ta' ? 'ta' : 'en';

  const defaultLocalList: ReadingExercise[] = READING_EXERCISES[lang];
  const SESSION_TARGET_QUESTIONS = 5;

  const audioRecorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);

  const [questionCount, setQuestionCount] = useState(1);
  const [currentDifficulty, setCurrentDifficulty] = useState<number>(1);
  const [usedIds, setUsedIds] = useState<Set<string>>(new Set());
  const [currentExercise, setCurrentExercise] = useState<ReadingExercise>(defaultLocalList[0]);
  const [isLoadingNext, setIsLoadingNext] = useState(false);

  const [micState, setMicState] = useState<MicState>('IDLE');
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

  // Initial load of exercises from backend for selected language
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

  /**
   * 1. startReading()
   * Verifies microphone permission via expo-audio, prepares recorder, and starts audio recording.
   */
  const startReading = async () => {
    try {
      setMicState('REQUESTING');
      setEmptyTranscriptWarning(null);
      setApiError(null);
      setAssessmentResult(null);
      setUserTranscript(null);

      // Check existing recording permission
      const currentPerm = await getRecordingPermissionsAsync();
      let hasPermission = currentPerm.granted || currentPerm.status === 'granted';

      if (!hasPermission) {
        // Request recording permission from device OS
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

  /**
   * 2. stopReading()
   * Stops audio recorder, sends recording URI to STT server endpoint, updates transcript,
   * AND IMMEDIATELY invokes assessReading without extra clicks.
   */
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

      // Send audio URI + language code to backend Speech-to-Text endpoint
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

        // Immediately trigger assessment!
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

  /**
   * 3. submitAssessment(transcript)
   * Validates transcript and sends payload to POST /api/assess
   */
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
        expectedText: currentExercise.text,
        userTranscript: transcript.trim(),
        language: currentExercise.language || lang,
        childId: DEMO_CHILD_ID,
      });

      setAssessmentResult(result);

      // Record reading exercise completion for XP, level, streak, and badges
      recordExerciseCompletion({
        type: 'reading',
        difficulty: currentExercise.difficulty,
        score: result.score,
        accuracy: result.accuracy,
        fluency: result.fluency,
        skill: result.skill,
        childId: DEMO_CHILD_ID,
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

  /**
   * Advances to the next question or completes exercise, using server's nextDifficulty & weak skill
   */
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
      // 1. Try backend fetch matching both nextDifficulty and weak skill
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

      // 2. If no unused matching skill, fetch by nextDifficulty tier
      if (unused.length === 0) {
        candidates = await fetchBackendExercises({
          language: lang,
          type: 'reading',
          difficulty: nextDiffStr,
        });
        unused = candidates.filter((ex) => !usedIds.has(ex.id));
      }

      // 3. Fallback to local exercise list filtering if needed
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

  /**
   * Toggle handler for microphone button tap
   */
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
                (pressed || isBusy) && styles.buttonPressed,
              ]}
              onPress={() => !isBusy && router.back()}
              disabled={isBusy}
              accessibilityRole="button"
              accessibilityLabel="Back to Home"
            >
              <Text style={[styles.backButtonText, { color: theme.text }]}>← Back</Text>
            </Pressable>

            <View style={styles.titleContainer}>
              <Text style={[styles.screenTitle, { color: theme.text }]}>
                Reading Practice
              </Text>
            </View>

            <View style={[styles.langBadge, { backgroundColor: theme.backgroundElement }]}>
              <Text style={styles.langBadgeText}>
                {lang === 'ta' ? 'தமிழ் 🇮🇳' : 'English 🇬🇧'}
              </Text>
            </View>
          </View>

          {isCompleted ? (
            /* --- COMPLETION VIEW --- */
            <View style={[styles.completionCard, { backgroundColor: '#4C6EF5' }]}>
              <Text style={styles.completionEmoji}>🎉</Text>
              <Text style={styles.completionTitle}>
                {lang === 'ta' ? 'அற்புதம்!' : 'Awesome Job!'}
              </Text>
              <Text style={styles.completionSubtitle}>
                {lang === 'ta'
                  ? 'எல்லா வாசிப்பு பயிற்சிகளையும் வெற்றிகரமாக முடித்துவிட்டீர்கள்!'
                  : 'You completed all reading practice exercises!'}
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
                    ? `கேள்வி ${questionCount} / ${SESSION_TARGET_QUESTIONS}`
                    : `Question ${questionCount} of ${SESSION_TARGET_QUESTIONS}`}
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
                  ? 'வாக்கியத்தை சத்தமாக வாசிக்கவும்:'
                  : 'Read the sentence aloud:'}
              </Text>

              {/* High-Readability Exercise Card */}
              <View style={[styles.sentenceCard, { backgroundColor: theme.backgroundElement }]}>
                {isLoadingNext ? (
                  <ActivityIndicator color="#4C6EF5" size="large" />
                ) : (
                  <Text style={[styles.sentenceText, { color: theme.text }]}>
                    "{currentExercise.text}"
                  </Text>
                )}
              </View>

              {/* Microphone Permission & Interaction Area */}
              <View style={styles.micSection}>
                <Pressable
                  style={({ pressed }) => [
                    styles.micButton,
                    micState === 'IDLE' && styles.micIdle,
                    micState === 'REQUESTING' && styles.micRequesting,
                    micState === 'LISTENING' && styles.micListening,
                    micState === 'TRANSCRIBING' && styles.micRequesting,
                    micState === 'READY' && styles.micReady,
                    micState === 'DENIED' && styles.micDenied,
                    (pressed || isBusy) && styles.buttonPressed,
                  ]}
                  onPress={handleMicTap}
                  disabled={micState === 'REQUESTING' || isBusy}
                  accessibilityRole="button"
                  accessibilityLabel="Tap to read aloud"
                >
                  <Text style={styles.micEmoji}>
                    {micState === 'REQUESTING' || micState === 'TRANSCRIBING' || isLoadingNext || isAssessing ? '⏳' : micState === 'DENIED' ? '🔒' : '🎤'}
                  </Text>
                </Pressable>

                {/* Clear Status Labels */}
                <Text style={[styles.micStatusText, { color: theme.text }]}>
                  {micState === 'IDLE' && !isAssessing && !assessmentResult && (lang === 'ta' ? 'பேசத் தட்டவும் 🎤' : 'Tap to Read 🎤')}
                  {micState === 'REQUESTING' && (lang === 'ta' ? 'அணுகல் கேட்கப்படுகிறது...' : 'Requesting microphone access...')}
                  {micState === 'LISTENING' && (lang === 'ta' ? 'கேட்கிறது... (நிறுத்த தட்டவும்)' : 'Listening... (Tap to stop)')}
                  {micState === 'TRANSCRIBING' && (lang === 'ta' ? 'பேச்சு செயலாக்கப்படுகிறது...' : 'Transcribing...')}
                  {isAssessing && (lang === 'ta' ? 'உங்கள் வாசிப்பு சரிபார்க்கப்படுகிறது...' : 'Analyzing your reading...')}
                  {!isAssessing && assessmentResult && (lang === 'ta' ? 'மதிப்பீட்டு முடிவு 👇' : 'Assessment Result 👇')}
                  {micState === 'DENIED' && (lang === 'ta' ? 'மைக்ரோஃபோன் அனுமதி தேவை' : 'Microphone permission needed')}
                </Text>

                {/* Status Banner / Permission Result */}
                {micState === 'DENIED' && (
                  <View style={styles.permDeniedBanner}>
                    <Text style={styles.permDeniedText}>
                      Microphone permission is required to practice reading.
                    </Text>
                    <Pressable
                      style={({ pressed }) => [
                        styles.retryButton,
                        pressed && styles.buttonPressed,
                      ]}
                      onPress={startReading}
                    >
                      <Text style={styles.retryButtonText}>Try Requesting Again</Text>
                    </Pressable>
                  </View>
                )}
              </View>

              {/* Transcript Display Card */}
              {userTranscript && (
                <View style={[styles.transcriptBox, { backgroundColor: theme.backgroundElement }]}>
                  <Text style={[styles.transcriptLabel, { color: theme.textSecondary }]}>
                    {lang === 'ta' ? 'நீங்கள் கூறியது:' : 'You said:'}
                  </Text>
                  <Text style={[styles.transcriptText, { color: theme.text }]}>
                    "{userTranscript}"
                  </Text>
                </View>
              )}

              {/* Empty Transcript Warning Banner */}
              {emptyTranscriptWarning && (
                <View style={styles.warningBanner}>
                  <Text style={styles.warningText}>⚠️ {emptyTranscriptWarning}</Text>
                </View>
              )}

              {/* Loading State Banner */}
              {isAssessing && (
                <View style={styles.loadingBanner}>
                  <ActivityIndicator color="#4C6EF5" size="small" style={{ marginRight: 8 }} />
                  <Text style={styles.loadingText}>
                    {lang === 'ta'
                      ? 'உங்கள் வாசிப்பு சரிபார்க்கப்படுகிறது...'
                      : 'Analyzing your reading...'}
                  </Text>
                </View>
              )}

              {/* API Network / Server Error Banner with Retry */}
              {apiError && (
                <View style={styles.errorBanner}>
                  <Text style={styles.errorText}>{apiError}</Text>
                  {userTranscript && (
                    <Pressable
                      style={({ pressed }) => [
                        styles.retryButton,
                        { marginTop: 8, alignSelf: 'center' },
                        pressed && styles.buttonPressed,
                      ]}
                      onPress={() => submitAssessment(userTranscript)}
                    >
                      <Text style={styles.retryButtonText}>
                        {lang === 'ta' ? 'மீண்டும் முயற்சிக்கவும்' : 'Retry Assessment'}
                      </Text>
                    </Pressable>
                  )}
                </View>
              )}

              {/* Real Backend Assessment Results Card */}
              {assessmentResult && (
                <View style={[styles.assessmentCard, { backgroundColor: theme.backgroundElement }]}>
                  {/* Child-Friendly Status Banner */}
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

                  {/* Primary Metrics Row */}
                  <View style={styles.metricsRow}>
                    <View style={styles.metricItem}>
                      <Text style={styles.metricValue}>{assessmentResult.score}/100</Text>
                      <Text style={[styles.metricLabel, { color: theme.textSecondary }]}>Score</Text>
                    </View>
                    <View style={styles.metricItem}>
                      <Text style={styles.metricValue}>{assessmentResult.accuracy}%</Text>
                      <Text style={[styles.metricLabel, { color: theme.textSecondary }]}>Accuracy</Text>
                    </View>
                    <View style={styles.metricItem}>
                      <Text style={styles.metricValue}>{assessmentResult.fluency}%</Text>
                      <Text style={[styles.metricLabel, { color: theme.textSecondary }]}>Fluency</Text>
                    </View>
                  </View>

                  {/* Secondary Details */}
                  <View style={styles.detailsGrid}>
                    <Text style={[styles.detailText, { color: theme.textSecondary }]}>
                      Skill: <Text style={{ color: theme.text, fontWeight: '700' }}>{assessmentResult.skill}</Text>
                    </Text>
                    <Text style={[styles.detailText, { color: theme.textSecondary }]}>
                      Next level:{' '}
                      <Text style={{ color: '#4C6EF5', fontWeight: '700' }}>
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
                </View>
              )}

              {/* Dynamic Action Button */}
              {assessmentResult && (
                <Pressable
                  style={({ pressed }) => [
                    styles.primaryButton,
                    isLoadingNext && styles.buttonDisabled,
                    (pressed || isLoadingNext) && styles.buttonPressed,
                  ]}
                  onPress={handleNextQuestion}
                  disabled={isLoadingNext}
                  accessibilityRole="button"
                >
                  <Text style={styles.primaryButtonText}>
                    {isLoadingNext
                      ? lang === 'ta'
                        ? 'ஏற்றுகிறது...'
                        : 'Loading...'
                      : questionCount === SESSION_TARGET_QUESTIONS
                      ? lang === 'ta'
                        ? 'முடிக்கவும்'
                        : 'Finish'
                      : lang === 'ta'
                      ? 'அடுத்தது ➔'
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
  sentenceCard: {
    padding: Spacing.five,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 140,
    marginBottom: Spacing.four,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  sentenceText: {
    fontSize: 28,
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: 38,
  },
  micSection: {
    alignItems: 'center',
    marginBottom: Spacing.four,
  },
  micButton: {
    width: 84,
    height: 84,
    borderRadius: 42,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.two,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  micIdle: {
    backgroundColor: '#EEF2FF',
    borderWidth: 2,
    borderColor: '#C7D2FE',
  },
  micRequesting: {
    backgroundColor: '#FEF3C7',
    borderWidth: 2,
    borderColor: '#F59E0B',
  },
  micListening: {
    backgroundColor: '#FFE4E6',
    borderWidth: 3,
    borderColor: '#F43F5E',
  },
  micReady: {
    backgroundColor: '#E6F4EA',
    borderWidth: 3,
    borderColor: '#34A853',
  },
  micDenied: {
    backgroundColor: '#FCE8E6',
    borderWidth: 3,
    borderColor: '#EA4335',
  },
  micEmoji: {
    fontSize: 38,
  },
  micStatusText: {
    fontSize: 15,
    fontWeight: '700',
    textAlign: 'center',
  },
  permDeniedBanner: {
    marginTop: Spacing.two,
    backgroundColor: '#FCE8E6',
    padding: Spacing.three,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#EA4335',
    alignItems: 'center',
    width: '100%',
  },
  permDeniedText: {
    color: '#C5221F',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: Spacing.two,
  },
  retryButton: {
    backgroundColor: '#4C6EF5',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one + 2,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  transcriptBox: {
    padding: Spacing.three,
    borderRadius: 14,
    marginBottom: Spacing.four,
    borderLeftWidth: 4,
    borderLeftColor: '#4C6EF5',
  },
  transcriptLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 4,
  },
  transcriptText: {
    fontSize: 18,
    fontWeight: '700',
    fontStyle: 'italic',
  },
  warningBanner: {
    backgroundColor: '#FEF3C7',
    padding: Spacing.three,
    borderRadius: 12,
    marginBottom: Spacing.four,
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
    backgroundColor: '#EEF2FF',
    padding: Spacing.three,
    borderRadius: 12,
    marginBottom: Spacing.four,
    borderWidth: 1,
    borderColor: '#C7D2FE',
  },
  loadingText: {
    color: '#3730A3',
    fontSize: 15,
    fontWeight: '700',
  },
  errorBanner: {
    backgroundColor: '#FCE8E6',
    padding: Spacing.three,
    borderRadius: 12,
    marginBottom: Spacing.four,
    borderWidth: 1,
    borderColor: '#EA4335',
  },
  errorText: {
    color: '#C5221F',
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
  },
  assessmentCard: {
    padding: Spacing.four,
    borderRadius: 16,
    marginBottom: Spacing.five,
    borderLeftWidth: 5,
    borderLeftColor: '#4C6EF5',
  },
  assessmentStatusHeader: {
    fontSize: 20,
    fontWeight: '800',
    marginBottom: Spacing.three,
    textAlign: 'center',
  },
  metricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: Spacing.four,
    backgroundColor: '#EEF2FF',
    paddingVertical: Spacing.three,
    borderRadius: 12,
  },
  metricItem: {
    alignItems: 'center',
  },
  metricValue: {
    fontSize: 20,
    fontWeight: '800',
    color: '#4C6EF5',
  },
  metricLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
  detailsGrid: {
    gap: Spacing.one + 2,
    marginBottom: Spacing.three,
  },
  detailText: {
    fontSize: 14,
  },
  aiFeedbackBox: {
    backgroundColor: '#FEF3C7',
    padding: Spacing.three,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#F59E0B',
  },
  aiFeedbackText: {
    color: '#92400E',
    fontSize: 14,
    fontWeight: '700',
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
});
