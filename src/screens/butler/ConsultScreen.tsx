import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { COLORS } from '../../constants/config';
import * as butlerApi from '../../api/butler';

export default function ConsultScreen() {
  const [mood, setMood] = useState('');
  const [energy, setEnergy] = useState('5');
  const [rawInput, setRawInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [recommendation, setRecommendation] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleConsult = async () => {
    if (!mood.trim()) {
      setError('Please describe your current mood');
      return;
    }

    const energyNum = parseInt(energy, 10);
    if (isNaN(energyNum) || energyNum < 1 || energyNum > 10) {
      setError('Energy must be between 1 and 10');
      return;
    }

    setError(null);
    setIsLoading(true);
    setRecommendation(null);

    try {
      const response = await butlerApi.consult({
        current_mood: mood,
        current_energy: energyNum,
        raw_input: rawInput || undefined,
      });
      setRecommendation(response.recommendation);
    } catch (err: any) {
      setError(err.message || 'Failed to get recommendation');
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setMood('');
    setEnergy('5');
    setRawInput('');
    setRecommendation(null);
    setError(null);
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <StatusBar style="dark" />
        
        {/* Subtle background gradient */}
        <LinearGradient
          colors={['#ffffff', '#faf5ff', '#fdf4ff', '#ffffff']}
          style={styles.backgroundGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        />

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <Text style={styles.title}>Consult Simi</Text>
            <Text style={styles.subtitle}>
              Share how you're feeling and get a personalized task suggestion.
            </Text>
          </View>

        <View style={styles.form}>
          <Text style={styles.label}>How are you feeling?</Text>
          <View style={styles.inputWrapper}>
            <TextInput
              style={styles.input}
              placeholder="e.g., overwhelmed, tired, motivated"
              placeholderTextColor={COLORS.textMuted}
              value={mood}
              onChangeText={setMood}
            />
          </View>

          <Text style={styles.label}>Energy Level (1-10)</Text>
          <View style={styles.inputWrapper}>
            <TextInput
              style={styles.input}
              placeholder="5"
              placeholderTextColor={COLORS.textMuted}
              value={energy}
              onChangeText={setEnergy}
              keyboardType="number-pad"
              maxLength={2}
            />
          </View>

          <Text style={styles.label}>Anything else on your mind? (optional)</Text>
          <View style={[styles.inputWrapper, styles.textAreaWrapper]}>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Brain dump here..."
              placeholderTextColor={COLORS.textMuted}
              value={rawInput}
              onChangeText={setRawInput}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </View>

          {error && <Text style={styles.errorText}>{error}</Text>}

          <TouchableOpacity
            style={[styles.button, isLoading && styles.buttonDisabled]}
            onPress={handleConsult}
            disabled={isLoading}
            activeOpacity={0.7}
          >
            {isLoading ? (
              <ActivityIndicator color={COLORS.text} size="small" />
            ) : (
              <>
                <Text style={styles.buttonText}>Get Recommendation</Text>
                <Text style={styles.buttonArrow}>→</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {recommendation && (
          <View style={styles.recommendationCard}>
            <Text style={styles.recommendationLabel}>Simi suggests:</Text>
            <Text style={styles.recommendationText}>{recommendation}</Text>
            <TouchableOpacity
              style={styles.resetButton}
              onPress={resetForm}
              activeOpacity={0.7}
            >
              <Text style={styles.resetButtonText}>Ask Again</Text>
            </TouchableOpacity>
          </View>
        )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  backgroundGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: 40,
    paddingTop: 20,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 28,
  },
  title: {
    fontSize: 26,
    fontWeight: '600',
    color: COLORS.text,
    textAlign: 'center',
    letterSpacing: -0.5,
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 15,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  form: {
    gap: 14,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 8,
    marginTop: 12,
  },
  inputWrapper: {
    backgroundColor: COLORS.backgroundSecondary,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  textAreaWrapper: {
    minHeight: 100,
  },
  input: {
    paddingHorizontal: 18,
    paddingVertical: 15,
    fontSize: 15,
    color: COLORS.text,
  },
  textArea: {
    minHeight: 80,
  },
  errorText: {
    color: COLORS.error,
    fontSize: 13,
    textAlign: 'center',
  },
  button: {
    backgroundColor: COLORS.backgroundSecondary,
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    borderWidth: 1,
    borderColor: COLORS.borderDark,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    fontSize: 15,
    fontWeight: '500',
    color: COLORS.text,
  },
  buttonArrow: {
    fontSize: 16,
    marginLeft: 8,
    color: COLORS.text,
  },
  recommendationCard: {
    marginTop: 32,
    backgroundColor: COLORS.backgroundSecondary,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  recommendationLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.primary,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  recommendationText: {
    fontSize: 16,
    color: COLORS.text,
    lineHeight: 24,
  },
  resetButton: {
    marginTop: 16,
    alignSelf: 'flex-start',
  },
  resetButtonText: {
    fontSize: 14,
    color: COLORS.primary,
    fontWeight: '500',
  },
});

