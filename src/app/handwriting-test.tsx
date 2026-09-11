import React, { useRef, useState } from 'react';
import {
  ActivityIndicator,
  PanResponder,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { API_BASE_URL } from '@/config/api';

interface Point {
  x: number;
  y: number;
}

interface TestResult {
  targetText: string;
  recognizedText: string;
  languageCode: string;
  match: boolean;
  latencySeconds: number;
}

const PRESET_WORDS: Record<'en' | 'ta', string[]> = {
  en: ['CAT', 'DOG', 'APPLE'],
  ta: ['அம்மா', 'அப்பா', 'பூ'],
};

export default function HandwritingTestScreen() {
  const router = useRouter();
  const [lang, setLang] = useState<'en' | 'ta'>('en');
  const [targetWord, setTargetWord] = useState<string>('CAT');
  const [customWord, setCustomWord] = useState<string>('');

  // Canvas Stroke State
  const [paths, setPaths] = useState<Point[][]>([]);
  const currentPath = useRef<Point[]>([]);

  // API Call & Result State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [testResult, setTestResult] = useState<TestResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Touch PanResponder for scribble pad
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt) => {
        const { locationX, locationY } = evt.nativeEvent;
        currentPath.current = [{ x: locationX, y: locationY }];
      },
      onPanResponderMove: (evt) => {
        const { locationX, locationY } = evt.nativeEvent;
        currentPath.current.push({ x: locationX, y: locationY });
        setPaths((prev) => [...prev.slice(0, -1), [...currentPath.current]]);
      },
      onPanResponderRelease: () => {
        if (currentPath.current.length > 0) {
          setPaths((prev) => [...prev, [...currentPath.current]]);
          currentPath.current = [];
        }
      },
    })
  ).current;

  const handleLanguageChange = (newLang: 'en' | 'ta') => {
    setLang(newLang);
    setTargetWord(PRESET_WORDS[newLang][0]);
    setCustomWord('');
    setPaths([]);
    setTestResult(null);
    setErrorMsg(null);
  };

  const handleSelectPreset = (word: string) => {
    setTargetWord(word);
    setCustomWord('');
    setTestResult(null);
    setErrorMsg(null);
  };

  const handleClearCanvas = () => {
    setPaths([]);
    currentPath.current = [];
    setTestResult(null);
    setErrorMsg(null);
  };

  const activeTarget = customWord.trim() || targetWord;

  const handleSubmitHandwriting = async () => {
    if (paths.length === 0) {
      setErrorMsg('Please write something on the canvas first!');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);
    setTestResult(null);

    const languageCode = lang === 'ta' ? 'ta-IN' : 'en-IN';

    try {
      // Create SVG string representation of user stroke paths
      const strokeElements = paths
        .map((stroke) => {
          if (stroke.length === 0) return '';
          if (stroke.length === 1) {
            return `<circle cx="${stroke[0].x}" cy="${stroke[0].y}" r="6" fill="#000" />`;
          }
          const pointsStr = stroke.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
          return `<polyline points="${pointsStr}" fill="none" stroke="#000" stroke-width="12" stroke-linecap="round" stroke-linejoin="round" />`;
        })
        .join('\n');

      const svgContent = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="340" height="220" viewBox="0 0 340 220" style="background-color:#ffffff">
  <rect width="100%" height="100%" fill="#ffffff" />
  ${strokeElements}
</svg>`;

      const formData = new FormData();
      formData.append('image', {
        uri: `data:image/svg+xml;utf8,${encodeURIComponent(svgContent)}`,
        name: 'handwriting.svg',
        type: 'image/svg+xml',
      } as any);
      formData.append('languageCode', languageCode);
      formData.append('targetText', activeTarget);

      const response = await globalThis.fetch(`${API_BASE_URL}/api/handwriting-test`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errTxt = await response.text();
        throw new Error(`Server status ${response.status}: ${errTxt}`);
      }

      const data: TestResult = await response.json();
      setTestResult(data);
    } catch (err: any) {
      console.error('Handwriting API error:', err);
      setErrorMsg(err.message || 'Failed to submit handwriting to Sarvam Vision API.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.topBar}>
            <Pressable style={styles.backButton} onPress={() => router.back()}>
              <Text style={styles.backButtonText}>← Back</Text>
            </Pressable>
            <Text style={styles.title}>HANDWRITING TEST</Text>
            <View style={{ width: 60 }} />
          </View>

          {/* Subtitle */}
          <Text style={styles.subtitle}>
            Sarvam Vision / Document AI Prototype & Feasibility Evaluator
          </Text>

          {/* Language Switcher */}
          <View style={styles.sectionRow}>
            <Text style={styles.label}>Language:</Text>
            <View style={styles.toggleGroup}>
              <Pressable
                style={[styles.toggleBtn, lang === 'en' && styles.toggleBtnActive]}
                onPress={() => handleLanguageChange('en')}
              >
                <Text style={[styles.toggleBtnText, lang === 'en' && styles.toggleBtnTextActive]}>
                  🇬🇧 English
                </Text>
              </Pressable>
              <Pressable
                style={[styles.toggleBtn, lang === 'ta' && styles.toggleBtnActive]}
                onPress={() => handleLanguageChange('ta')}
              >
                <Text style={[styles.toggleBtnText, lang === 'ta' && styles.toggleBtnTextActive]}>
                  🇮🇳 Tamil
                </Text>
              </Pressable>
            </View>
          </View>

          {/* Target Word Presets */}
          <View style={styles.targetSection}>
            <Text style={styles.label}>Target Word:</Text>
            <View style={styles.presetRow}>
              {PRESET_WORDS[lang].map((w) => (
                <Pressable
                  key={w}
                  style={[styles.presetChip, activeTarget === w && styles.presetChipActive]}
                  onPress={() => handleSelectPreset(w)}
                >
                  <Text style={[styles.presetChipText, activeTarget === w && styles.presetChipTextActive]}>
                    {w}
                  </Text>
                </Pressable>
              ))}
            </View>

            <TextInput
              style={styles.customInput}
              placeholder="Or type custom target word..."
              placeholderTextColor="#94A3B8"
              value={customWord}
              onChangeText={setCustomWord}
            />
          </View>

          {/* Display Target Word Hero */}
          <View style={styles.targetBanner}>
            <Text style={styles.targetBannerLabel}>WRITE THIS WORD:</Text>
            <Text style={styles.targetBannerWord}>{activeTarget}</Text>
          </View>

          {/* Touch Canvas Scribble Pad */}
          <View style={styles.canvasContainer} {...panResponder.panHandlers}>
            {paths.length === 0 && (
              <View style={styles.placeholderBox} pointerEvents="none">
                <Text style={styles.placeholderText}>✍️ Draw / Write Here</Text>
              </View>
            )}

            {/* Stroke Line Visualizer */}
            {paths.map((stroke, sIdx) => (
              <React.Fragment key={sIdx}>
                {stroke.map((pt, pIdx) => (
                  <View
                    key={pIdx}
                    style={{
                      position: 'absolute',
                      left: pt.x - 5,
                      top: pt.y - 5,
                      width: 10,
                      height: 10,
                      borderRadius: 5,
                      backgroundColor: '#0F172A',
                    }}
                  />
                ))}
              </React.Fragment>
            ))}
          </View>

          {/* Action Buttons */}
          <View style={styles.actionRow}>
            <Pressable style={styles.clearBtn} onPress={handleClearCanvas} disabled={isSubmitting}>
              <Text style={styles.clearBtnText}>🗑️ Clear Canvas</Text>
            </Pressable>

            <Pressable
              style={[styles.submitBtn, isSubmitting && styles.submitBtnDisabled]}
              onPress={handleSubmitHandwriting}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={styles.submitBtnText}>🔍 Check Writing</Text>
              )}
            </Pressable>
          </View>

          {/* Error Message */}
          {errorMsg && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>⚠️ {errorMsg}</Text>
            </View>
          )}

          {/* Result Display Box */}
          {testResult && (
            <View
              style={[
                styles.resultCard,
                { borderColor: testResult.match ? '#10B981' : '#F59E0B' },
              ]}
            >
              <View style={styles.resultHeaderRow}>
                <Text style={styles.resultHeaderTitle}>Sarvam Vision Result</Text>
                <View
                  style={[
                    styles.matchBadge,
                    { backgroundColor: testResult.match ? '#D1FAE5' : '#FEF3C7' },
                  ]}
                >
                  <Text
                    style={[
                      styles.matchBadgeText,
                      { color: testResult.match ? '#047857' : '#B45309' },
                    ]}
                  >
                    {testResult.match ? 'MATCH ✓' : 'NOT MATCH ✗'}
                  </Text>
                </View>
              </View>

              <View style={styles.resultDetailsGrid}>
                <View style={styles.resultDetailItem}>
                  <Text style={styles.detailLabel}>Target:</Text>
                  <Text style={styles.detailValue}>{testResult.targetText}</Text>
                </View>
                <View style={styles.resultDetailItem}>
                  <Text style={styles.detailLabel}>Recognized:</Text>
                  <Text style={styles.detailValue}>
                    {testResult.recognizedText || '(empty)'}
                  </Text>
                </View>
                <View style={styles.resultDetailItem}>
                  <Text style={styles.detailLabel}>Language:</Text>
                  <Text style={styles.detailValue}>{testResult.languageCode}</Text>
                </View>
                <View style={styles.resultDetailItem}>
                  <Text style={styles.detailLabel}>Latency:</Text>
                  <Text style={styles.detailValue}>{testResult.latencySeconds}s</Text>
                </View>
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
    backgroundColor: '#F8FAFC',
  },
  scrollContent: {
    padding: 16,
    alignItems: 'center',
  },
  container: {
    width: '100%',
    maxWidth: 500,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  backButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#E2E8F0',
    borderRadius: 12,
  },
  backButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#334155',
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  subtitle: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 16,
  },
  sectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '700',
    color: '#334155',
  },
  toggleGroup: {
    flexDirection: 'row',
    backgroundColor: '#E2E8F0',
    borderRadius: 12,
    padding: 3,
  },
  toggleBtn: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 10,
  },
  toggleBtnActive: {
    backgroundColor: '#4F46E5',
  },
  toggleBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#475569',
  },
  toggleBtnTextActive: {
    color: '#FFFFFF',
  },
  targetSection: {
    marginBottom: 16,
  },
  presetRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
    marginBottom: 10,
  },
  presetChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 14,
    backgroundColor: '#EDE9FE',
  },
  presetChipActive: {
    backgroundColor: '#4338CA',
  },
  presetChipText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#4338CA',
  },
  presetChipTextActive: {
    color: '#FFFFFF',
  },
  customInput: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 8,
    fontSize: 14,
    color: '#0F172A',
  },
  targetBanner: {
    backgroundColor: '#4F46E5',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    marginBottom: 16,
  },
  targetBannerLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: '#C7D2FE',
    marginBottom: 4,
  },
  targetBannerWord: {
    fontSize: 32,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 2,
  },
  canvasContainer: {
    width: '100%',
    height: 220,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#94A3B8',
    overflow: 'hidden',
    marginBottom: 16,
    position: 'relative',
  },
  placeholderBox: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#94A3B8',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  clearBtn: {
    flex: 1,
    backgroundColor: '#F1F5F9',
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  clearBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#475569',
  },
  submitBtn: {
    flex: 1.5,
    backgroundColor: '#10B981',
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: 'center',
  },
  submitBtnDisabled: {
    opacity: 0.6,
  },
  submitBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  errorBox: {
    backgroundColor: '#FFE4E6',
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
  },
  errorText: {
    color: '#E11D48',
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
  },
  resultCard: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 16,
    borderWidth: 2,
    marginBottom: 16,
  },
  resultHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  resultHeaderTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  matchBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  matchBadgeText: {
    fontSize: 12,
    fontWeight: '800',
  },
  resultDetailsGrid: {
    gap: 8,
  },
  resultDetailItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  detailLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  detailValue: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
});
