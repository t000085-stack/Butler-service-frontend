import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Alert,
  ScrollView,
  ActivityIndicator,
  Animated,
  Easing,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { StatusBar } from "expo-status-bar";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { useNavigation, useRoute } from "@react-navigation/native";
import type { RouteProp } from "@react-navigation/native";
import { COLORS } from "../../constants/config";
import { logMood } from "../../api/mood";
import * as butlerApi from "../../api/butler";
import type { MoodStackParamList } from "../../navigation/MoodStack";
import type { ContextLog } from "../../types";

const { width, height } = Dimensions.get("window");
const ORB_SIZE = width * 0.4;

// Card dimensions for mood cards (matching ConsultScreen)
const CARD_PADDING = 40 * 2; // horizontal padding
const CARD_GAP = 10;
const CARDS_PER_ROW = 3;
const availableWidth = width - CARD_PADDING - CARD_GAP * (CARDS_PER_ROW - 1);
const CARD_WIDTH = Math.max(80, availableWidth / CARDS_PER_ROW);

// Twinkling Star Component
const Star = ({
  size,
  top,
  left,
  delay,
}: {
  size: number;
  top: number;
  left: number;
  delay: number;
}) => {
  const twinkleAnim = useRef(new Animated.Value(0.2)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(twinkleAnim, {
          toValue: 0.8,
          duration: 1200 + Math.random() * 800,
          delay,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(twinkleAnim, {
          toValue: 0.15,
          duration: 1200 + Math.random() * 800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  return (
    <Animated.View
      style={[
        styles.star,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          top,
          left,
          opacity: twinkleAnim,
        },
      ]}
    />
  );
};

// Generate random stars
const generateStars = (count: number) => {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    size: Math.random() * 3 + 1.5,
    top: Math.random() * height * 0.4,
    left: Math.random() * width,
    delay: Math.random() * 2000,
  }));
};

interface Mood {
  id: string;
  label: string;
  iconName: keyof typeof MaterialIcons.glyphMap;
  color: string;
}

const MOODS: Mood[] = [
  {
    id: "happy",
    label: "Happy",
    iconName: "sentiment-satisfied",
    color: "#FFD93D",
  },
  { id: "calm", label: "Calm", iconName: "self-improvement", color: "#6BCB77" },
  {
    id: "neutral",
    label: "Neutral",
    iconName: "sentiment-neutral",
    color: "#95A5A6",
  },
  {
    id: "stressed",
    label: "Stressed",
    iconName: "sentiment-dissatisfied",
    color: "#FF6B9D",
  },
  {
    id: "sad",
    label: "Sad",
    iconName: "sentiment-very-dissatisfied",
    color: "#4D96FF",
  },
  { id: "anger", label: "Anger", iconName: "mood-bad", color: "#FF4444" },
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
  const [isWaitingForAI, setIsWaitingForAI] = useState(false);

  // Memoize stars so they don't regenerate on re-render
  const stars = useMemo(() => generateStars(30), []);

  // Animations
  const floatAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;

  // Load existing entry if editing
  useEffect(() => {
    if (isEditMode && entryId) {
      loadEntry();
    }
  }, [entryId]);

  // Setup animations
  useEffect(() => {
    // Initial entrance animations
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 20,
        friction: 7,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        delay: 300,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 800,
        delay: 300,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();

    // Continuous floating animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, {
          toValue: 1,
          duration: 3000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(floatAnim, {
          toValue: 0,
          duration: 3000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Slow rotation
    Animated.loop(
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 25000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();
  }, []);

  const floatTranslateY = floatAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -12],
  });

  const spin = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

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

  // Poll for AI recommendation
  const pollForRecommendation = async (
    contextLogId: string,
    maxAttempts: number = 30,
    intervalMs: number = 2000
  ): Promise<string | undefined> => {
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        // Wait before checking
        if (attempt > 0) {
          await new Promise((resolve) => setTimeout(resolve, intervalMs));
        }

        // Try to get the context log entry directly
        const entry = await butlerApi.getContextLog(contextLogId);

        // If we got the entry, check if it has a recommendation
        // (even if not in the type definition, the backend might return it)
        if (entry && (entry as any).recommendation) {
          return (entry as any).recommendation;
        }

        // If direct GET doesn't work, try fetching from history
        const history = await butlerApi.getHistory(10);
        const historyEntry = history.find((e) => e._id === contextLogId);

        // Check if the history entry has a recommendation field
        if (historyEntry && (historyEntry as any).recommendation) {
          return (historyEntry as any).recommendation;
        }
      } catch (error) {
        // Continue polling on error
        console.log("Polling attempt failed:", attempt, error);
      }
    }
    return undefined;
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
          raw_input:
            "I am feeling " +
            selectedMood +
            " with an energy level of " +
            energyLevel,
        });

        // Check if this is a partial success (mood saved but AI unavailable)
        const isPartialSuccess = response.message?.includes("unavailable");
        let recommendation: string | undefined = response.recommendation;

        // If we have a context_log_id but no recommendation, poll for it
        if (response.context_log_id && !recommendation && !isPartialSuccess) {
          setIsWaitingForAI(true);
          try {
            // Poll for the recommendation (max 30 attempts, 2 seconds apart = 60 seconds total)
            recommendation = await pollForRecommendation(
              response.context_log_id
            );
          } catch (error) {
            console.error("Error polling for recommendation:", error);
          } finally {
            setIsWaitingForAI(false);
          }
        }

        // Build the message to display
        let alertMessage = response.message || "Mood logged successfully!";
        if (recommendation) {
          alertMessage += "\n\n" + recommendation;
        }

        Alert.alert(
          isPartialSuccess ? "Mood Logged" : "Success",
          alertMessage,
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

      {/* Subtle background gradient */}
      <LinearGradient
        colors={["#ffffff", "#faf5ff", "#fdf4ff", "#ffffff"]}
        style={styles.backgroundGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />

      {/* Twinkling Stars */}
      <View style={styles.starsContainer}>
        {stars.map((star) => (
          <Star
            key={star.id}
            size={star.size}
            top={star.top}
            left={star.left}
            delay={star.delay}
          />
        ))}
      </View>

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

      {isLoading || isWaitingForAI ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          {isWaitingForAI && (
            <Text style={styles.loadingText}>
              Waiting for AI recommendation...
            </Text>
          )}
        </View>
      ) : (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Animated Orb */}
          <Animated.View
            style={[
              styles.orbContainer,
              {
                transform: [
                  { translateY: floatTranslateY },
                  { scale: scaleAnim },
                ],
              },
            ]}
          >
            {/* Glowing border */}
            <View style={styles.orbGlowBorder}>
              <View style={styles.orbGlowInner} />
            </View>
            <Animated.Image
              source={require("../../../assets/signinImage.png")}
              style={[styles.orbImage, { transform: [{ rotate: spin }] }]}
              resizeMode="contain"
            />
          </Animated.View>

          {/* Content with fade animation */}
          <Animated.View
            style={[
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }],
              },
            ]}
          >
            {/* Mood Selection - Cards */}
            <View style={styles.moodCardsContainer}>
              {MOODS.map((moodOption, index) => (
                <TouchableOpacity
                  key={moodOption.id}
                  style={[
                    styles.moodCard,
                    selectedMood === moodOption.id && styles.moodCardSelected,
                    {
                      borderColor:
                        selectedMood === moodOption.id
                          ? moodOption.color
                          : COLORS.border,
                      marginRight:
                        index % CARDS_PER_ROW !== CARDS_PER_ROW - 1
                          ? CARD_GAP
                          : 0,
                    },
                  ]}
                  onPress={() => setSelectedMood(moodOption.id)}
                  activeOpacity={0.7}
                >
                  <MaterialIcons
                    name={moodOption.iconName}
                    size={36}
                    color={
                      selectedMood === moodOption.id
                        ? moodOption.color
                        : COLORS.textSecondary
                    }
                    style={styles.moodIcon}
                  />
                  <Text
                    style={[
                      styles.moodLabel,
                      selectedMood === moodOption.id &&
                        styles.moodLabelSelected,
                      selectedMood === moodOption.id && {
                        color: moodOption.color,
                      },
                    ]}
                  >
                    {moodOption.label}
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
                        energyLevel === level &&
                          styles.energyButtonTextSelected,
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
          </Animated.View>
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
          disabled={
            !selectedMood || isSubmitting || isLoading || isWaitingForAI
          }
          activeOpacity={0.8}
        >
          {isSubmitting || isLoading || isWaitingForAI ? (
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
  moodCardsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  moodCard: {
    width: CARD_WIDTH,
    maxWidth: CARD_WIDTH,
    backgroundColor: COLORS.backgroundSecondary,
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 4,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: COLORS.border,
    marginBottom: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  moodCardSelected: {
    borderWidth: 3,
    shadowColor: "#000",
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
    fontWeight: "500",
    color: COLORS.textSecondary,
    textAlign: "center",
  },
  moodLabelSelected: {
    fontWeight: "700",
    fontSize: 13,
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
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: "#7F8C8D",
    textAlign: "center",
  },
  star: {
    position: "absolute",
    backgroundColor: COLORS.primaryLight,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
  },
  backgroundGradient: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  starsContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  orbContainer: {
    alignItems: "center",
    justifyContent: "center",
    marginTop: height * 0.02,
    marginBottom: 20,
    height: ORB_SIZE * 1.1,
  },
  orbGlowBorder: {
    position: "absolute",
    width: ORB_SIZE + 10,
    height: ORB_SIZE + 10,
    borderRadius: (ORB_SIZE + 10) / 2,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.5)",
    shadowColor: "#ffffff",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 15,
    elevation: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  orbGlowInner: {
    width: ORB_SIZE + 4,
    height: ORB_SIZE + 4,
    borderRadius: (ORB_SIZE + 4) / 2,
    borderWidth: 0.5,
    borderColor: "rgba(255, 255, 255, 0.3)",
    shadowColor: "#ffffff",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 10,
  },
  orbImage: {
    width: ORB_SIZE,
    height: ORB_SIZE,
  },
});
