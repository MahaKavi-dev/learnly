import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { LearnlyButton } from '@/components/ui/LearnlyButton';
import { LearnlyCard } from '@/components/ui/LearnlyCard';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { signIn } from '@/services/auth';

export default function SignInScreen() {
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSignIn = async () => {
    if (!email.trim() || !password.trim()) {
      setErrorMessage('Please enter both your email and password.');
      return;
    }

    setLoading(true);
    setErrorMessage(null);

    try {
      await signIn(email, password);
      router.replace('/');
    } catch (err: any) {
      setErrorMessage(err.message || 'Sign in failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: '#F8FAFC' }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.container}>
            {/* Learnly Logo Header */}
            <View style={styles.header}>
              <View style={styles.logoBadge}>
                <Text style={styles.logoEmoji}>🌟</Text>
              </View>
              <Text style={styles.appName}>Learnly</Text>
              <Text style={styles.tagline}>Learn • Practice • Grow</Text>
            </View>

            {/* Sign In Card */}
            <LearnlyCard style={styles.card}>
              <Text style={styles.title}>Welcome back! 👋</Text>
              <Text style={styles.subtitle}>
                Sign in to continue your reading and writing journey.
              </Text>

              {/* Error Toast Banner */}
              {errorMessage && (
                <View style={styles.errorBox}>
                  <Text style={styles.errorText}>⚠️ {errorMessage}</Text>
                </View>
              )}

              {/* Email Input */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Email Address</Text>
                <TextInput
                  style={styles.input}
                  placeholder="child@example.com"
                  placeholderTextColor="#94A3B8"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>

              {/* Password Input */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Password</Text>
                <TextInput
                  style={styles.input}
                  placeholder="••••••••"
                  placeholderTextColor="#94A3B8"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                  autoCapitalize="none"
                />
              </View>

              <LearnlyButton
                label={loading ? 'Signing In...' : 'Sign In 🚀'}
                onPress={handleSignIn}
                loading={loading}
                disabled={loading}
                variant="primary"
                style={{ marginTop: 8 }}
              />

              <View style={styles.footerRow}>
                <Text style={styles.footerText}>Don't have an account?</Text>
                <Pressable onPress={() => router.push('/signup')}>
                  <Text style={styles.linkText}>Create Account</Text>
                </Pressable>
              </View>
            </LearnlyCard>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.five,
    paddingBottom: Spacing.five,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100%',
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
    backgroundColor: '#EDE9FE',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
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
  card: {
    padding: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 4,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 20,
  },
  errorBox: {
    backgroundColor: '#FFE4E6',
    padding: 12,
    borderRadius: 12,
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
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 6,
  },
  input: {
    height: 52,
    paddingHorizontal: 16,
    borderRadius: 16,
    fontSize: 16,
    fontWeight: '600',
    backgroundColor: '#FFFFFF',
    color: '#0F172A',
    borderWidth: 2,
    borderColor: '#E2E8F0',
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 20,
  },
  footerText: {
    fontSize: 14,
    color: '#64748B',
  },
  linkText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#4F46E5',
  },
});
