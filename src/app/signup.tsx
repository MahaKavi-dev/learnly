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
import { signUp } from '@/services/auth';

export default function SignUpScreen() {
  const router = useRouter();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSignUp = async () => {
    if (!name.trim()) {
      setErrorMessage('Please enter your name.');
      return;
    }
    if (!email.trim()) {
      setErrorMessage('Please enter a valid email address.');
      return;
    }
    if (!password) {
      setErrorMessage('Please enter a password.');
      return;
    }
    if (password.length < 6) {
      setErrorMessage('Password must be at least 6 characters long.');
      return;
    }
    if (password !== confirmPassword) {
      setErrorMessage('Passwords do not match. Please check again.');
      return;
    }

    setLoading(true);
    setErrorMessage(null);

    try {
      await signUp(email, password, name);
      router.replace('/');
    } catch (err: any) {
      setErrorMessage(err.message || 'Could not create account. Please try again.');
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
            {/* Header */}
            <View style={styles.header}>
              <View style={styles.logoBadge}>
                <Text style={styles.logoEmoji}>🌟</Text>
              </View>
              <Text style={styles.appName}>Learnly</Text>
              <Text style={styles.tagline}>Learn • Practice • Grow</Text>
            </View>

            {/* Sign Up Card */}
            <LearnlyCard style={styles.card}>
              <Text style={styles.title}>Create your account 🌟</Text>
              <Text style={styles.subtitle}>
                Start tracking your reading & writing progress today!
              </Text>

              {/* Error Toast Banner */}
              {errorMessage && (
                <View style={styles.errorBox}>
                  <Text style={styles.errorText}>⚠️ {errorMessage}</Text>
                </View>
              )}

              {/* Name Input */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Your Name</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. Alex"
                  placeholderTextColor="#94A3B8"
                  value={name}
                  onChangeText={setName}
                  autoCapitalize="words"
                />
              </View>

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
                  placeholder="At least 6 characters"
                  placeholderTextColor="#94A3B8"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                  autoCapitalize="none"
                />
              </View>

              {/* Confirm Password Input */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Confirm Password</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Re-enter password"
                  placeholderTextColor="#94A3B8"
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry
                  autoCapitalize="none"
                />
              </View>

              <LearnlyButton
                label={loading ? 'Creating Account...' : 'Create Account 🚀'}
                onPress={handleSignUp}
                loading={loading}
                disabled={loading}
                variant="primary"
                style={{ marginTop: 8 }}
              />

              <View style={styles.footerRow}>
                <Text style={styles.footerText}>Already have an account?</Text>
                <Pressable onPress={() => router.push('/signin')}>
                  <Text style={styles.linkText}>Sign In</Text>
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
    paddingTop: Spacing.four,
    paddingBottom: Spacing.five,
    alignItems: 'center',
    justifyContent: 'center',
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
    marginBottom: 14,
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
