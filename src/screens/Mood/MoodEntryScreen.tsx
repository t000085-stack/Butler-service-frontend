import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Alert,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRoute } from "@react-navigation/native";
import type { RouteProp } from "@react-navigation/native";
import { COLORS } from "../../constants/config";
import { logMood } from "../../api/mood";
import * as butlerApi from "../../api/butler";
import type { MoodStackParamList } from "../../navigation/MoodStack";
import type { ContextLog } from "../../types";

const { width } = Dimensions.get("window");

interface Mood {
  id: string;
  label: string;
  emoji: string;
  color: string;
}

const MOODS: Mood[] = [
  { id: "happy", label: "Happy", emoji: "😊", color: "#FFD93D" },
  { id: "calm", label: "Calm", emoji: "😌", color: "#6BCB77" },
  { id: "neutral", label: "Neutral", emoji: "😐", color: "#95A5A6" },
  { id: "stressed", label: "Stressed", emoji: "😰", color: "#FF6B9D" },
  { id: "sad", label: "Sad", emoji: "😔", color: "#4D96FF" },
];

type MoodEntryRouteProp = RouteProp<MoodStackParamList, "MoodEntry">;

export default function MoodEntryScreen() {
  const navigation = useNavigation();
  const route = useRoute<MoodEntryRouteProp>();
  const entryId = route.params?.entryId;
  const isEditMode = !!entryId;

  const [selectedMood, setSelectedMood] = useState<string | null>(null);
  const [energyLevel, setEnergyLevel] = useState<number>(5);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Load existing entry if editing
  useEffect(() => {
    if (isEditMode && entryId) {
      loadEntry();
    }
  }, [entryId]);

  const loadEntry = async () => {
    setIsLoading(true);
    try {
      const history = await butlerApi.getHistory(100);
      const entry = history.find((e) => e._id === entryId);
      if (entry) {
        setSelectedMood(entry.mood.toLowerCase());
        // Ensure energy level is between 1 and 10
        const energy = Math.max(1, Math.min(10, entry.current_energy));
        setEnergyLevel(energy);
      }
    } catch (error: any) {
      Alert.alert("Error", "Failed to load mood entry");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!selectedMood) {
      Alert.alert("Missing Information", "Please select a mood");
      return;
    }

    setIsSubmitting(true);

    try {
      if (isEditMode && entryId) {
        // Update existing entry
        await butlerApi.updateContextLog(entryId, {
          mood: selectedMood,
          current_energy: energyLevel,
        });
        Alert.alert("Success", "Mood updated successfully!", [
          {
            text: "OK",
            onPress: () => {
              navigation.goBack();
            },
          },
        ]);
      } else {
        // Create new entry
        const response = await logMood({
          current_mood: selectedMood,
          current_energy: energyLevel,
        });

        // Check if this is a partial success (mood saved but AI unavailable)
        const isPartialSuccess = response.message?.includes("unavailable");

        Alert.alert(
          isPartialSuccess ? "Mood Logged" : "Success",
          response.message || "Mood logged successfully!",
          [
            {
              text: "OK",
              onPress: () => {
                setSelectedMood(null);
                setEnergyLevel(5);
                navigation.goBack();
              },
            },
          ]
        );
      }
    } catch (error: any) {
      if (isEditMode) {
        Alert.alert(
          "Error",
          error?.message || "Failed to update mood. Please try again."
        );
      } else {
        // Check if error might indicate mood was still saved
        const errorMessage = error?.message || "";
        const isAIModelError =
          errorMessage?.toLowerCase()?.includes("ai model") || false;

        if (isAIModelError) {
          Alert.alert(
            "Mood Logged",
            "Your mood has been logged. AI recommendation is currently unavailable.",
            [
              {
                text: "OK",
                onPress: () => {
                  setSelectedMood(null);
                  setEnergyLevel(5);
                  navigation.goBack();
                },
              },
            ]
          );
        } else {
          Alert.alert(
            "Error",
            errorMessage || "Failed to log mood. Please try again."
          );
        }
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="auto" />
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.title}>
          {isEditMode ? "Edit Mood Entry" : "How are you feeling?"}
        </Text>
        <Text style={styles.subtitle}>
          {isEditMode
            ? "Update your mood and energy level"
            : "Select your current mood"}
        </Text>
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Mood Selection */}
          <View style={styles.moodContainer}>
            {MOODS.map((mood) => (
              <TouchableOpacity
                key={mood.id}
                style={[
                  styles.moodButton,
                  selectedMood === mood.id && styles.moodButtonSelected,
                  { borderColor: mood.color },
                ]}
                onPress={() => setSelectedMood(mood.id)}
                activeOpacity={0.7}
              >
                <Text style={styles.moodEmoji}>{mood.emoji}</Text>
                <Text
                  style={[
                    styles.moodLabel,
                    selectedMood === mood.id && styles.moodLabelSelected,
                  ]}
                >
                  {mood.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Energy Level Slider */}
          <View style={styles.energyContainer}>
            <Text style={styles.energyTitle}>Energy Level</Text>
            <View style={styles.energyValueContainer}>
              <Text style={styles.energyValue}>{energyLevel}</Text>
              <Text style={styles.energyMaxValue}>/ 10</Text>
            </View>

            {/* Simple energy level selector using buttons */}
            <View style={styles.energyButtonsContainer}>
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((level) => (
                <TouchableOpacity
                  key={level}
                  style={[
                    styles.energyButton,
                    energyLevel === level && styles.energyButtonSelected,
                  ]}
                  onPress={() => setEnergyLevel(level)}
                >
                  <Text
                    style={[
                      styles.energyButtonText,
                      energyLevel === level && styles.energyButtonTextSelected,
                    ]}
                  >
                    {level}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.energyLabels}>
              <Text style={styles.energyLabelText}>Low</Text>
              <Text style={styles.energyLabelText}>High</Text>
            </View>
          </View>
        </ScrollView>
      )}

      {/* Submit Button - Fixed at bottom */}
      <View style={styles.submitButtonContainer}>
        <TouchableOpacity
          style={[
            styles.submitButton,
            (!selectedMood || isSubmitting) && styles.submitButtonDisabled,
          ]}
          onPress={handleSubmit}
          disabled={!selectedMood || isSubmitting || isLoading}
          activeOpacity={0.8}
        >
          {isSubmitting || isLoading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.submitButtonText}>
              {isEditMode ? "Update" : "Submit"}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8F9FA",
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  backButton: {
    marginBottom: 16,
    padding: 8,
    alignSelf: "flex-start",
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#2C3E50",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: "#7F8C8D",
  },
  moodContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginBottom: 40,
  },
  moodButton: {
    width: (width - 60) / 3,
    aspectRatio: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 2,
    borderColor: "#E0E0E0",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 15,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  moodButtonSelected: {
    borderWidth: 3,
    transform: [{ scale: 1.05 }],
  },
  moodEmoji: {
    fontSize: 48,
    marginBottom: 8,
  },
  moodLabel: {
    fontSize: 14,
    color: "#7F8C8D",
    fontWeight: "600",
  },
  moodLabelSelected: {
    color: "#2C3E50",
    fontWeight: "bold",
  },
  energyContainer: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 20,
    marginBottom: 30,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  energyTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#2C3E50",
    marginBottom: 12,
  },
  energyValueContainer: {
    flexDirection: "row",
    alignItems: "baseline",
    marginBottom: 10,
  },
  energyValue: {
    fontSize: 36,
    fontWeight: "bold",
    color: "#4A90E2",
  },
  energyMaxValue: {
    fontSize: 20,
    color: "#95A5A6",
    marginLeft: 4,
  },
  energyButtonsContainer: {
    flexDirection: "row",
    flexWrap: "nowrap",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
    width: "100%",
    paddingHorizontal: 0,
  },
  energyButton: {
    flex: 1,
    height: 36,
    minWidth: 0,
    backgroundColor: "#F0F0F0",
    borderRadius: 6,
    justifyContent: "center",
    alignItems: "center",
    marginHorizontal: 1,
  },
  energyButtonSelected: {
    backgroundColor: "#4A90E2",
  },
  energyButtonText: {
    fontSize: 14,
    color: "#7F8C8D",
    fontWeight: "600",
  },
  energyButtonTextSelected: {
    color: "#FFFFFF",
    fontWeight: "bold",
  },
  energyLabels: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 8,
  },
  energyLabelText: {
    fontSize: 14,
    color: "#7F8C8D",
  },
  submitButton: {
    backgroundColor: "#2C3E50",
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  submitButtonDisabled: {
    backgroundColor: "#BDC3C7",
  },
  submitButtonText: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "bold",
  },
  submitButtonContainer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: "#F8F9FA",
    borderTopWidth: 1,
    borderTopColor: "#E0E0E0",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
});
