import React, { useState, useEffect, useRef, useMemo } from "react";
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
  Animated,
  Easing,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { StatusBar } from "expo-status-bar";
import { COLORS } from "../../constants/config";
import * as butlerApi from "../../api/butler";

const { width, height } = Dimensions.get("window");
const ORB_SIZE = width * 0.4;

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

export default function ConsultScreen() {
  const [rawInput, setRawInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [recommendation, setRecommendation] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Memoize stars so they don't regenerate on re-render
  const stars = useMemo(() => generateStars(30), []);

  // Animations
  const floatAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;

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

  const handleConsult = async () => {
    if (!rawInput.trim()) {
      setError("Please share what's on your mind");
      return;
    }

    setError(null);
    setIsLoading(true);
    setRecommendation(null);

    try {
      const response = await butlerApi.consult({
        current_mood: "neutral", // Default mood since we removed mood selection
        current_energy: 5, // Default energy since we removed energy input
        raw_input: rawInput,
      });
      setRecommendation(response.recommendation);
    } catch (err: any) {
      setError(err.message || "Failed to get recommendation");
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setRawInput("");
    setRecommendation(null);
    setError(null);
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <StatusBar style="dark" />

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

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <Text style={styles.title}>Consult Simi</Text>
            <Text style={styles.subtitle}>
              Share what's on your mind and get a personalized task suggestion.
            </Text>
          </View>

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
            <View style={styles.form}>
              <Text style={styles.label}>What's on your mind?</Text>
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
          </Animated.View>

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
    position: "absolute",
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
    fontWeight: "600",
    color: COLORS.text,
    textAlign: "center",
    letterSpacing: -0.5,
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 15,
    color: COLORS.textSecondary,
    textAlign: "center",
    lineHeight: 22,
  },
  form: {
    gap: 14,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
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
    textAlign: "center",
  },
  button: {
    backgroundColor: COLORS.backgroundSecondary,
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 24,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 20,
    borderWidth: 1,
    borderColor: COLORS.borderDark,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    fontSize: 15,
    fontWeight: "500",
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
    fontWeight: "600",
    color: COLORS.primary,
    marginBottom: 8,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  recommendationText: {
    fontSize: 16,
    color: COLORS.text,
    lineHeight: 24,
  },
  resetButton: {
    marginTop: 16,
    alignSelf: "flex-start",
  },
  resetButtonText: {
    fontSize: 14,
    color: COLORS.primary,
    fontWeight: "500",
  },
  starsContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  star: {
    position: "absolute",
    backgroundColor: COLORS.primaryLight,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
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
