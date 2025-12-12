import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  ActivityIndicator,
  Animated,
  Easing,
  ScrollView,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { StatusBar } from "expo-status-bar";
import { MaterialIcons, Feather } from "@expo/vector-icons";
import { COLORS } from "../../constants/config";
import * as butlerApi from "../../api/butler";
import * as tasksApi from "../../api/tasks";
import type { Task } from "../../types";
import { useAuth } from "../../contexts/AuthContext";
import { useTasks } from "../../contexts/TaskContext";
import { useNavigation } from "@react-navigation/native";

const { width, height } = Dimensions.get("window");

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
    top: Math.random() * height * 0.3,
    left: Math.random() * width,
    delay: Math.random() * 2000,
  }));
};

// Get greeting based on time of day
const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
};

// Format today's date
const formatDate = () => {
  const today = new Date();
  const options: Intl.DateTimeFormatOptions = {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  };
  return today.toLocaleDateString("en-US", options);
};

interface ConsultationResult {
  empathyStatement: string;
  microStep: string;
  reasoning: string;
  chosenTaskId: string | null;
  contextLogId: string;
}

// Mood options for tracker (using Feather icons for thin elegant style)
const MOODS = [
  { id: "happy", icon: "smile" as const, label: "Happy", color: "#FFD93D" },
  { id: "calm", icon: "sun" as const, label: "Calm", color: "#6BCB77" },
  { id: "neutral", icon: "meh" as const, label: "Okay", color: "#95A5A6" },
  {
    id: "stressed",
    icon: "cloud" as const,
    label: "Stressed",
    color: "#FF6B9D",
  },
  { id: "sad", icon: "frown" as const, label: "Sad", color: "#4D96FF" },
];

// Face images for each mood
const MOOD_FACES: Record<string, any> = {
  happy: require("../../../assets/happy1.png"),
  calm: require("../../../assets/normal1.png"),
  neutral: require("../../../assets/normal1.png"),
  stressed: require("../../../assets/normal1.png"),
  sad: require("../../../assets/sad1.png"),
};

// Filter tasks based on current mood - be gentle when feeling down
const getFilteredTasks = (allTasks: Task[], mood: string | null) => {
  const incompleteTasks = allTasks.filter((t) => !t.is_completed);

  switch (mood) {
    case "sad":
      // When sad: only show very easy, low-friction tasks
      return incompleteTasks.filter(
        (t) => t.energy_cost <= 3 && t.emotional_friction === "Low"
      );
    case "stressed":
      // When stressed: show easy to medium tasks, avoid high friction
      return incompleteTasks.filter(
        (t) => t.energy_cost <= 5 && t.emotional_friction !== "High"
      );
    case "calm":
    case "happy":
    case "neutral":
    default:
      // Show all tasks
      return incompleteTasks;
  }
};

export default function ConsultationScreen() {
  const { user } = useAuth();
  const { tasks, fetchTasks, completeTask: completeTaskContext } = useTasks();
  const navigation = useNavigation();
  const [isLoading, setIsLoading] = useState(true);
  const [result, setResult] = useState<ConsultationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isCompleting, setIsCompleting] = useState(false);
  const [isRerolling, setIsRerolling] = useState(false);
  const [selectedMood, setSelectedMood] = useState<string | null>("neutral");
  const [displayedMood, setDisplayedMood] = useState<string>("neutral");

  // Memoize stars
  const stars = useMemo(() => generateStars(25), []);

  // Animations
  const cardAnim = useRef(new Animated.Value(0)).current;
  const floatAnim = useRef(new Animated.Value(0)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const faceOpacity = useRef(new Animated.Value(1)).current;
  const faceScale = useRef(new Animated.Value(1)).current;
  const faceRotate = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    fetchConsultation();
    startAnimations();
    fetchTasks(false); // Fetch incomplete tasks
  }, []);

  // Smooth face transition when mood changes - realistic morph effect
  useEffect(() => {
    if (selectedMood && selectedMood !== displayedMood) {
      // Phase 1: Shrink, fade, and rotate out
      Animated.parallel([
        Animated.timing(faceOpacity, {
          toValue: 0,
          duration: 180,
          easing: Easing.bezier(0.4, 0, 0.2, 1),
          useNativeDriver: true,
        }),
        Animated.timing(faceScale, {
          toValue: 0.6,
          duration: 200,
          easing: Easing.bezier(0.4, 0, 0.2, 1),
          useNativeDriver: true,
        }),
        Animated.timing(faceRotate, {
          toValue: 1,
          duration: 200,
          easing: Easing.bezier(0.4, 0, 0.2, 1),
          useNativeDriver: true,
        }),
      ]).start(() => {
        // Change the face image
        setDisplayedMood(selectedMood);
        // Reset rotation
        faceRotate.setValue(-1);

        // Phase 2: Grow back with elastic bounce
        Animated.parallel([
          Animated.spring(faceOpacity, {
            toValue: 1,
            tension: 60,
            friction: 6,
            useNativeDriver: true,
          }),
          Animated.spring(faceScale, {
            toValue: 1,
            tension: 80,
            friction: 5,
            useNativeDriver: true,
          }),
          Animated.spring(faceRotate, {
            toValue: 0,
            tension: 60,
            friction: 6,
            useNativeDriver: true,
          }),
        ]).start();
      });
    }
  }, [selectedMood]);

  // Rotation interpolation for face transition
  const faceRotateInterpolate = faceRotate.interpolate({
    inputRange: [-1, 0, 1],
    outputRange: ["-15deg", "0deg", "15deg"],
  });

  const startAnimations = () => {
    // Card entrance
    Animated.spring(cardAnim, {
      toValue: 1,
      tension: 20,
      friction: 7,
      useNativeDriver: true,
    }).start();

    // Floating orb
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
        duration: 12000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();
  };

  const fetchConsultation = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await butlerApi.consult({
        current_mood: "neutral",
        current_energy: 5,
        raw_input: "I need help deciding what to do next",
      });

      setResult({
        empathyStatement:
          response.empathy_statement || "I'm here to help you get started.",
        microStep:
          response.micro_step ||
          "Take a deep breath and just start with the smallest step.",
        reasoning: response.reasoning || "",
        chosenTaskId: response.chosen_task_id || null,
        contextLogId: response.context_log_id,
      });
    } catch (err: any) {
      console.error("Consultation error:", err);
      setError(err.message || "Failed to get recommendation");
    } finally {
      setIsLoading(false);
    }
  };

  const handleComplete = async () => {
    if (!result?.chosenTaskId) {
      // If no specific task, just reset and get new recommendation
      setResult(null);
      fetchConsultation();
      return;
    }

    setIsCompleting(true);
    try {
      await tasksApi.completeTask(result.chosenTaskId);
      setResult(null);
      fetchConsultation();
    } catch (err: any) {
      setError(err.message || "Failed to complete task");
    } finally {
      setIsCompleting(false);
    }
  };

  const handleReroll = async () => {
    setIsRerolling(true);
    cardAnim.setValue(0);

    try {
      const response = await butlerApi.consult({
        current_mood: "neutral",
        current_energy: 5,
        raw_input:
          "Give me a different suggestion, I can't do the previous one right now",
      });

      setResult({
        empathyStatement:
          response.empathy_statement ||
          "I understand, let me suggest something else.",
        microStep:
          response.micro_step || "Take a deep breath and try this instead.",
        reasoning: response.reasoning || "",
        chosenTaskId: response.chosen_task_id || null,
        contextLogId: response.context_log_id,
      });

      // Animate new card in
      Animated.spring(cardAnim, {
        toValue: 1,
        tension: 20,
        friction: 7,
        useNativeDriver: true,
      }).start();
    } catch (err: any) {
      setError(err.message || "Failed to get new recommendation");
    } finally {
      setIsRerolling(false);
    }
  };

  const floatTranslateY = floatAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -8],
  });

  const spin = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  const cardScale = cardAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.8, 1],
  });

  const cardOpacity = cardAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
      <StatusBar style="dark" />

      {/* Background */}
      <LinearGradient
        colors={["#ffffff", "#faf5ff", "#fdf4ff", "#ffffff"]}
        style={styles.backgroundGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />

      {/* Stars */}
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

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>SIMI</Text>
        </View>

        {/* Greeting Section */}
        <View style={styles.greetingSection}>
          <Text style={styles.greetingText}>
            {getGreeting()}, {user?.username || "there"}
          </Text>
          <Text style={styles.dateText}>Today is {formatDate()}</Text>
        </View>

        {/* Mood Tracker */}
        <View style={styles.moodSection}>
          <LinearGradient
            colors={[
              "rgba(168, 85, 247, 0.08)",
              "rgba(236, 72, 153, 0.05)",
              "rgba(255, 255, 255, 0.9)",
            ]}
            style={styles.moodGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          />
          <Text style={styles.moodQuestion}>How are you feeling today?</Text>

          {/* Centered Orb Image with Face */}
          <Animated.View
            style={[
              styles.moodOrbContainer,
              { transform: [{ translateY: floatTranslateY }] },
            ]}
          >
            <Animated.Image
              source={require("../../../assets/signinImage.png")}
              style={[styles.moodOrbImage, { transform: [{ rotate: spin }] }]}
              resizeMode="contain"
            />
            {/* Face overlay - changes based on selected mood with smooth transition */}
            <Animated.Image
              source={MOOD_FACES[displayedMood]}
              style={[
                styles.moodFaceOverlay,
                {
                  opacity: faceOpacity,
                  transform: [
                    { scale: faceScale },
                    { rotate: faceRotateInterpolate },
                  ],
                },
              ]}
              resizeMode="contain"
            />
          </Animated.View>

          <View style={styles.moodOptions}>
            {MOODS.map((mood) => (
              <TouchableOpacity
                key={mood.id}
                style={[
                  styles.moodButton,
                  selectedMood === mood.id && styles.moodButtonSelected,
                  selectedMood === mood.id && { borderColor: mood.color },
                ]}
                onPress={() => setSelectedMood(mood.id)}
                activeOpacity={0.7}
              >
                <Feather
                  name={mood.icon}
                  size={28}
                  color={
                    selectedMood === mood.id ? mood.color : COLORS.textSecondary
                  }
                  strokeWidth={1.5}
                />
                <Text
                  style={[
                    styles.moodLabel,
                    selectedMood === mood.id && styles.moodLabelSelected,
                    selectedMood === mood.id && { color: mood.color },
                  ]}
                >
                  {mood.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* My Tasks Today Section */}
        <View style={styles.tasksSection}>
          <View style={styles.tasksSectionHeader}>
            <View>
              <Text style={styles.tasksSectionTitle}>My Tasks Today</Text>
              {selectedMood === "sad" && (
                <Text style={styles.moodTaskHint}>
                  💜 Showing gentle tasks only
                </Text>
              )}
              {selectedMood === "stressed" && (
                <Text style={styles.moodTaskHint}>
                  💛 Showing lighter tasks
                </Text>
              )}
            </View>
            <TouchableOpacity
              style={styles.addTaskButton}
              onPress={() => navigation.navigate("Tasks" as never)}
              activeOpacity={0.7}
            >
              <Feather name="plus" size={18} color="#fff" />
              <Text style={styles.addTaskButtonText}>Add Task</Text>
            </TouchableOpacity>
          </View>

          {getFilteredTasks(tasks, selectedMood).length === 0 ? (
            <View style={styles.noTasksContainer}>
              <Feather name="check-circle" size={40} color={COLORS.textMuted} />
              <Text style={styles.noTasksText}>No tasks for today</Text>
              <Text style={styles.noTasksSubtext}>
                Tap "Add Task" to create one
              </Text>
            </View>
          ) : (
            <View style={styles.tasksList}>
              {getFilteredTasks(tasks, selectedMood)
                .slice(0, 5)
                .map((task) => (
                  <TouchableOpacity
                    key={task._id}
                    style={styles.taskItem}
                    onPress={() => completeTaskContext(task._id)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.taskCheckbox}>
                      <Feather name="circle" size={22} color={COLORS.primary} />
                    </View>
                    <View style={styles.taskContent}>
                      <Text style={styles.taskTitle} numberOfLines={1}>
                        {task.title}
                      </Text>
                      <View style={styles.taskMeta}>
                        <View
                          style={[
                            styles.taskEnergy,
                            {
                              backgroundColor:
                                task.energy_cost <= 3
                                  ? "#E8F5E9"
                                  : task.energy_cost <= 6
                                  ? "#FFF3E0"
                                  : "#FFEBEE",
                            },
                          ]}
                        >
                          <Text
                            style={[
                              styles.taskEnergyText,
                              {
                                color:
                                  task.energy_cost <= 3
                                    ? "#4CAF50"
                                    : task.energy_cost <= 6
                                    ? "#FF9800"
                                    : "#F44336",
                              },
                            ]}
                          >
                            ⚡ {task.energy_cost}
                          </Text>
                        </View>
                        <Text style={styles.taskFriction}>
                          {task.emotional_friction}
                        </Text>
                      </View>
                    </View>
                    <Feather
                      name="chevron-right"
                      size={20}
                      color={COLORS.textMuted}
                    />
                  </TouchableOpacity>
                ))}
              {getFilteredTasks(tasks, selectedMood).length > 5 && (
                <TouchableOpacity
                  style={styles.viewAllTasksButton}
                  onPress={() => navigation.navigate("Tasks" as never)}
                >
                  <Text style={styles.viewAllTasksText}>
                    View all {getFilteredTasks(tasks, selectedMood).length}{" "}
                    tasks
                  </Text>
                  <Feather
                    name="arrow-right"
                    size={16}
                    color={COLORS.primary}
                  />
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>

        {/* Main Content */}
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={styles.loadingText}>Consulting SIMI...</Text>
          </View>
        ) : error ? (
          <View style={styles.errorContainer}>
            <MaterialIcons
              name="error-outline"
              size={48}
              color={COLORS.error}
            />
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity
              style={styles.retryButton}
              onPress={fetchConsultation}
            >
              <Text style={styles.retryButtonText}>Try Again</Text>
            </TouchableOpacity>
          </View>
        ) : result ? (
          <Animated.View
            style={[
              styles.heroCard,
              {
                transform: [{ scale: cardScale }],
                opacity: cardOpacity,
              },
            ]}
          >
            {/* Empathy Statement */}
            <View style={styles.empathySection}>
              <MaterialIcons name="favorite" size={20} color={COLORS.primary} />
              <Text style={styles.empathyText}>{result.empathyStatement}</Text>
            </View>

            {/* Divider */}
            <View style={styles.divider} />

            {/* Micro Step - THE HERO */}
            <View style={styles.microStepSection}>
              <Text style={styles.microStepLabel}>JUST DO THIS:</Text>
              <Text style={styles.microStepText}>{result.microStep}</Text>
            </View>

            {/* Reasoning */}
            {result.reasoning ? (
              <View style={styles.reasoningSection}>
                <Text style={styles.reasoningText}>{result.reasoning}</Text>
              </View>
            ) : null}
          </Animated.View>
        ) : null}

        {/* Action Buttons */}
        {result && !isLoading && (
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={[styles.actionButton, styles.completeButton]}
              onPress={handleComplete}
              disabled={isCompleting || isRerolling}
              activeOpacity={0.8}
            >
              {isCompleting ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <MaterialIcons name="check" size={22} color="#fff" />
                  <Text style={styles.completeButtonText}>I'll do it</Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, styles.rerollButton]}
              onPress={handleReroll}
              disabled={isCompleting || isRerolling}
              activeOpacity={0.8}
            >
              {isRerolling ? (
                <ActivityIndicator color={COLORS.text} size="small" />
              ) : (
                <>
                  <MaterialIcons name="refresh" size={22} color={COLORS.text} />
                  <Text style={styles.rerollButtonText}>I can't</Text>
                </>
              )}
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
    height: height * 0.3,
  },
  star: {
    position: "absolute",
    backgroundColor: COLORS.primaryLight,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  header: {
    alignItems: "center",
    paddingTop: 12,
    paddingBottom: 8,
  },
  title: {
    fontSize: 22,
    fontWeight: "600",
    color: COLORS.text,
    letterSpacing: -0.3,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: COLORS.textSecondary,
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  errorText: {
    marginTop: 12,
    fontSize: 15,
    color: COLORS.textSecondary,
    textAlign: "center",
  },
  retryButton: {
    marginTop: 20,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: COLORS.primary,
    borderRadius: 12,
  },
  retryButtonText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "600",
  },
  heroCard: {
    backgroundColor: "#fff",
    borderRadius: 24,
    padding: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  empathySection: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    marginBottom: 16,
  },
  empathyText: {
    flex: 1,
    fontSize: 15,
    color: COLORS.textSecondary,
    lineHeight: 22,
    fontStyle: "italic",
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: 16,
  },
  microStepSection: {
    marginBottom: 20,
  },
  microStepLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: COLORS.primary,
    letterSpacing: 1.5,
    marginBottom: 8,
  },
  microStepText: {
    fontSize: 20,
    fontWeight: "600",
    color: COLORS.text,
    lineHeight: 28,
  },
  reasoningSection: {
    backgroundColor: COLORS.backgroundSecondary,
    borderRadius: 12,
    padding: 16,
  },
  reasoningText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    lineHeight: 21,
  },
  actionButtons: {
    flexDirection: "row",
    gap: 12,
    marginTop: 24,
    paddingBottom: 24,
  },
  actionButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    borderRadius: 16,
    gap: 8,
  },
  completeButton: {
    backgroundColor: COLORS.success,
  },
  completeButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  rerollButton: {
    backgroundColor: COLORS.backgroundSecondary,
    borderWidth: 1,
    borderColor: COLORS.borderDark,
  },
  rerollButtonText: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: "600",
  },
  greetingSection: {
    marginBottom: 20,
    paddingHorizontal: 4,
  },
  greetingText: {
    fontSize: 32,
    fontWeight: "300",
    color: COLORS.text,
    marginBottom: 6,
    letterSpacing: 0.5,
    fontStyle: "italic",
  },
  dateText: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  moodSection: {
    marginBottom: 24,
    borderRadius: 28,
    padding: 24,
    paddingTop: 20,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
    overflow: "hidden",
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "rgba(168, 85, 247, 0.1)",
  },
  moodGradient: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 28,
  },
  moodQuestion: {
    fontSize: 18,
    fontWeight: "300",
    color: COLORS.text,
    textAlign: "center",
    letterSpacing: 0.5,
    fontStyle: "italic",
  },
  moodOrbContainer: {
    width: 240,
    height: 240,
    alignSelf: "center",
    marginVertical: 24,
  },
  moodOrbImage: {
    width: 240,
    height: 240,
  },
  moodFaceOverlay: {
    position: "absolute",
    width: 220,
    height: 220,
    top: "50%",
    left: "50%",
    marginTop: -110,
    marginLeft: -110,
  },
  moodOptions: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 4,
  },
  moodButton: {
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.8)",
    minWidth: 56,
    borderWidth: 1.5,
    borderColor: "rgba(168, 85, 247, 0.1)",
  },
  moodButtonSelected: {
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    borderColor: COLORS.primary,
    transform: [{ scale: 1.08 }],
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  moodIcon: {
    marginBottom: 6,
  },
  moodLabel: {
    fontSize: 10,
    color: COLORS.textSecondary,
    fontWeight: "500",
    letterSpacing: 0.3,
  },
  moodLabelSelected: {
    color: COLORS.primary,
    fontWeight: "700",
  },
  // Tasks Section Styles
  tasksSection: {
    marginBottom: 24,
    backgroundColor: "#fff",
    borderRadius: 24,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 6,
  },
  tasksSectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  tasksSectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: COLORS.text,
  },
  moodTaskHint: {
    fontSize: 12,
    color: COLORS.primary,
    marginTop: 4,
    fontStyle: "italic",
  },
  addTaskButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.primary,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  addTaskButtonText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "600",
  },
  noTasksContainer: {
    alignItems: "center",
    paddingVertical: 30,
  },
  noTasksText: {
    fontSize: 16,
    color: COLORS.textSecondary,
    marginTop: 12,
    fontWeight: "500",
  },
  noTasksSubtext: {
    fontSize: 13,
    color: COLORS.textMuted,
    marginTop: 4,
  },
  tasksList: {
    gap: 10,
  },
  taskItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.backgroundSecondary,
    padding: 14,
    borderRadius: 16,
    gap: 12,
  },
  taskCheckbox: {
    width: 24,
    height: 24,
    justifyContent: "center",
    alignItems: "center",
  },
  taskContent: {
    flex: 1,
  },
  taskTitle: {
    fontSize: 15,
    fontWeight: "500",
    color: COLORS.text,
    marginBottom: 4,
  },
  taskMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  taskEnergy: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  taskEnergyText: {
    fontSize: 11,
    fontWeight: "600",
  },
  taskFriction: {
    fontSize: 11,
    color: COLORS.textSecondary,
  },
  viewAllTasksButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    gap: 6,
  },
  viewAllTasksText: {
    fontSize: 14,
    color: COLORS.primary,
    fontWeight: "500",
  },
});
