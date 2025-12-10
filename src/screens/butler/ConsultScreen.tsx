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
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { MaterialIcons } from '@expo/vector-icons';
import { COLORS } from '../../constants/config';
import * as butlerApi from '../../api/butler';

const { width } = Dimensions.get('window');
const CARD_PADDING = 40 * 2; // horizontal padding
const CARD_GAP = 10;
const CARDS_PER_ROW = 3;
// Calculate card width: (screen width - padding - gaps) / cards per row, with min width of 80
const availableWidth = width - CARD_PADDING - (CARD_GAP * (CARDS_PER_ROW - 1));
const CARD_WIDTH = Math.max(80, availableWidth / CARDS_PER_ROW);

interface Mood {
  id: string;
  label: string;
  iconName: keyof typeof MaterialIcons.glyphMap;
  color: string;
}

const MOODS: Mood[] = [
  { id: "happy", label: "Happy", iconName: "sentiment-satisfied", color: "#FFD93D" },
  { id: "calm", label: "Calm", iconName: "self-improvement", color: "#6BCB77" },
  { id: "neutral", label: "Neutral", iconName: "sentiment-neutral", color: "#95A5A6" },
  { id: "stressed", label: "Stressed", iconName: "sentiment-dissatisfied", color: "#FF6B9D" },
  { id: "sad", label: "Sad", iconName: "sentiment-very-dissatisfied", color: "#4D96FF" },
  { id: "anger", label: "Anger", iconName: "mood-bad", color: "#FF4444" },
];

export default function ConsultScreen() {
  const [mood, setMood] = useState('');
  const [selectedMoodId, setSelectedMoodId] = useState<string | null>(null);
  const [energy, setEnergy] = useState('5');
  const [rawInput, setRawInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [recommendation, setRecommendation] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleConsult = async () => {
    if (!selectedMoodId && !mood.trim()) {
      setError('Please select your current mood');
      return;
    }
    
    // Use selected mood label if available, otherwise use custom mood text
    const moodText = selectedMoodId 
      ? MOODS.find(m => m.id === selectedMoodId)?.label || mood
      : mood;

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
        current_mood: moodText,
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
    setSelectedMoodId(null);
    setEnergy('5');
    setRawInput('');
    setRecommendation(null);
    setError(null);
  };

  const handleMoodSelect = (moodId: string) => {
    setSelectedMoodId(moodId);
    setMood(''); // Clear custom mood text when selecting a card
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
          <View style={styles.moodCardsContainer}>
            {MOODS.map((moodOption, index) => (
              <TouchableOpacity
                key={moodOption.id}
                style={[
                  styles.moodCard,
                  selectedMoodId === moodOption.id && styles.moodCardSelected,
                  { 
                    borderColor: selectedMoodId === moodOption.id ? moodOption.color : COLORS.border,
                    marginRight: (index % CARDS_PER_ROW) !== (CARDS_PER_ROW - 1) ? CARD_GAP : 0,
                  },
                ]}
                onPress={() => handleMoodSelect(moodOption.id)}
                activeOpacity={0.7}
              >
                <MaterialIcons
                  name={moodOption.iconName}
                  size={36}
                  color={selectedMoodId === moodOption.id ? moodOption.color : COLORS.textSecondary}
                  style={styles.moodIcon}
                />
                <Text
                  style={[
                    styles.moodLabel,
                    selectedMoodId === moodOption.id && styles.moodLabelSelected,
                    selectedMoodId === moodOption.id && { color: moodOption.color },
                  ]}
                >
                  {moodOption.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          
          {/* Optional custom mood input */}
          <Text style={styles.label}>Or describe your mood (optional)</Text>
          <View style={styles.inputWrapper}>
            <TextInput
              style={styles.input}
              placeholder="e.g., overwhelmed, tired, motivated"
              placeholderTextColor={COLORS.textMuted}
              value={mood}
              onChangeText={(text) => {
                setMood(text);
                if (text.trim()) {
                  setSelectedMoodId(null); // Clear selection when typing custom mood
                }
              }}
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
  moodCardsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16,
  },
  moodCard: {
    width: CARD_WIDTH,
    maxWidth: CARD_WIDTH,
    backgroundColor: COLORS.backgroundSecondary,
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: COLORS.border,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  moodCardSelected: {
    borderWidth: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 8,
    backgroundColor: COLORS.backgroundSecondary,
  },
  moodIcon: {
    marginBottom: 8,
  },
  moodLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  moodLabelSelected: {
    fontWeight: '700',
    fontSize: 13,
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

