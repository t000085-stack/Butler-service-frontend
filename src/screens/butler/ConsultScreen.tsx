import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
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
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <StatusBar style="dark" />
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.title}>Consult Your Butler</Text>
        <Text style={styles.subtitle}>
          Share how you're feeling and get a personalized task suggestion.
        </Text>

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
              <ActivityIndicator color={COLORS.background} size="small" />
            ) : (
              <Text style={styles.buttonText}>Get Recommendation</Text>
            )}
          </TouchableOpacity>
        </View>

        {recommendation && (
          <View style={styles.recommendationCard}>
            <Text style={styles.recommendationLabel}>Butler suggests:</Text>
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
  content: {
    padding: 24,
    paddingBottom: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: COLORS.textSecondary,
    marginBottom: 24,
    lineHeight: 22,
  },
  form: {
    gap: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: -8,
  },
  inputWrapper: {
    backgroundColor: COLORS.backgroundSecondary,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  textAreaWrapper: {
    minHeight: 100,
  },
  input: {
    paddingHorizontal: 16,
    paddingVertical: 14,
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
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.background,
  },
  recommendationCard: {
    marginTop: 32,
    backgroundColor: '#faf5ff',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: COLORS.primaryLight,
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

