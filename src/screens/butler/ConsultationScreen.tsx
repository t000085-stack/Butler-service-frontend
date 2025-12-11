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
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { StatusBar } from "expo-status-bar";
import { MaterialIcons } from "@expo/vector-icons";
import { COLORS } from "../../constants/config";
import * as butlerApi from "../../api/butler";
import * as tasksApi from "../../api/tasks";
import type { Task } from "../../types";

const { width, height } = Dimensions.get("window");
const ORB_SIZE = width * 0.28;

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

interface ConsultationResult {
  empathyStatement: string;
  microStep: string;
  reasoning: string;
  chosenTaskId: string | null;
  contextLogId: string;
}

export default function ConsultationScreen() {
  const [isLoading, setIsLoading] = useState(true);
  const [result, setResult] = useState<ConsultationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isCompleting, setIsCompleting] = useState(false);
  const [isRerolling, setIsRerolling] = useState(false);

  // Memoize stars
  const stars = useMemo(() => generateStars(25), []);

  // Animations
  const cardAnim = useRef(new Animated.Value(0)).current;
  const floatAnim = useRef(new Animated.Value(0)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    fetchConsultation();
    startAnimations();
  }, []);

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
        duration: 30000,
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

      <View style={styles.content}>
        {/* Header with Orb */}
        <View style={styles.header}>
          <Animated.View
            style={[
              styles.orbContainer,
              { transform: [{ translateY: floatTranslateY }] },
            ]}
          >
            <View style={styles.orbGlow} />
            <Animated.Image
              source={require("../../../assets/signinImage.png")}
              style={[styles.orbImage, { transform: [{ rotate: spin }] }]}
              resizeMode="contain"
            />
          </Animated.View>
          <Text style={styles.title}>SIMI Suggests</Text>
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
      </View>
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
    paddingHorizontal: 24,
  },
  header: {
    alignItems: "center",
    paddingTop: 20,
    paddingBottom: 16,
  },
  orbContainer: {
    width: ORB_SIZE,
    height: ORB_SIZE,
    marginBottom: 16,
  },
  orbGlow: {
    position: "absolute",
    width: ORB_SIZE + 20,
    height: ORB_SIZE + 20,
    borderRadius: (ORB_SIZE + 20) / 2,
    backgroundColor: "rgba(168, 85, 247, 0.1)",
    top: -10,
    left: -10,
  },
  orbImage: {
    width: ORB_SIZE,
    height: ORB_SIZE,
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
});
