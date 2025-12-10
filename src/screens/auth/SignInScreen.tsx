import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Animated,
  Easing,
  ScrollView,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useAuth } from "../../contexts/AuthContext";
import { useTheme, ThemeColors } from "../../contexts/ThemeContext";
import type { AuthStackParamList } from "../../navigation/AuthStack";

const { width, height } = Dimensions.get("window");
const ORB_SIZE = width * 0.7;

type NavigationProp = NativeStackNavigationProp<AuthStackParamList, "SignIn">;

// Twinkling Star Component
const Star = ({
  size,
  top,
  left,
  delay,
  color,
}: {
  size: number;
  top: number;
  left: number;
  delay: number;
  color: string;
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
          backgroundColor: color,
          shadowColor: color,
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
    top: Math.random() * height * 0.5,
    left: Math.random() * width,
    delay: Math.random() * 2000,
  }));
};

// Theme Toggle Button Component
const ThemeToggleButton = ({
  isDark,
  onToggle,
  theme,
}: {
  isDark: boolean;
  onToggle: () => void;
  theme: ThemeColors;
}) => {
  const rotateAnim = useRef(new Animated.Value(isDark ? 1 : 0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(rotateAnim, {
        toValue: isDark ? 1 : 0,
        useNativeDriver: true,
        tension: 100,
        friction: 10,
      }),
      Animated.sequence([
        Animated.timing(scaleAnim, {
          toValue: 0.8,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          useNativeDriver: true,
          tension: 200,
          friction: 10,
        }),
      ]),
    ]).start();
  }, [isDark]);

  const rotation = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  return (
    <TouchableOpacity
      onPress={onToggle}
      activeOpacity={0.7}
      style={[
        styles.themeToggle,
        {
          backgroundColor: isDark
            ? "rgba(168, 85, 247, 0.2)"
            : "rgba(255, 255, 255, 0.9)",
          borderColor: isDark
            ? "rgba(168, 85, 247, 0.5)"
            : "rgba(168, 85, 247, 0.2)",
        },
      ]}
    >
      <Animated.View
        style={{ transform: [{ rotate: rotation }, { scale: scaleAnim }] }}
      >
        <Ionicons
          name={isDark ? "moon" : "sunny"}
          size={22}
          color={theme.primary}
        />
      </Animated.View>
    </TouchableOpacity>
  );
};

export default function SignInScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { signIn } = useAuth();
  const { theme, isDark, toggleTheme } = useTheme();
  const insets = useSafeAreaInsets();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Memoize stars so they don't regenerate on re-render
  const stars = useMemo(() => generateStars(30), []);

  // Animations
  const floatAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(0)).current;
  const glowAnim = useRef(new Animated.Value(0.85)).current;

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

    // Pulse scale animation for orb (breathing effect)
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 3000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0,
          duration: 3000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Glow/opacity animation for orb
    Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, {
          toValue: 1,
          duration: 4000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(glowAnim, {
          toValue: 0.8,
          duration: 4000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  const floatTranslateY = floatAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -15],
  });

  // Pulse scale interpolation for subtle breathing effect
  const pulseScale = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.03],
  });

  const spin = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  const handleSignIn = async () => {
    if (!email.trim() || !password.trim()) {
      setError("Please fill in all fields");
      return;
    }

    setError(null);
    setIsLoading(true);

    try {
      await signIn(email, password);
    } catch (err: any) {
      setError(err.message || "Something went wrong");
    } finally {
      setIsLoading(false);
    }
  };

  // Dynamic styles based on theme
  const dynamicStyles = useMemo(
    () => ({
      safeArea: {
        flex: 1,
        backgroundColor: theme.background,
      },
      glassCardContainer: {
        borderRadius: 28,
        overflow: "hidden" as const,
        shadowColor: theme.shadowColor,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: isDark ? 0.5 : 0.15,
        shadowRadius: 24,
        elevation: 12,
        margin: -10,
      },
      glassCardInner: {
        padding: 28,
        backgroundColor: theme.backgroundGlass,
      },
      glassCard: {
        borderRadius: 28,
        overflow: "hidden" as const,
        borderWidth: 1.5,
        borderColor: theme.borderGlass,
      },
      title: {
        fontSize: 32,
        fontWeight: "700" as const,
        color: theme.text,
        textAlign: "center" as const,
        letterSpacing: -0.5,
        marginTop: 10,
      },
      subtitle: {
        fontSize: 15,
        color: theme.textSecondary,
        textAlign: "center" as const,
        marginTop: 10,
        lineHeight: 22,
      },
      inputWrapper: {
        backgroundColor: theme.backgroundInput,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: theme.borderInput,
        shadowColor: theme.shadowColor,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
        elevation: 2,
      },
      input: {
        paddingHorizontal: 18,
        paddingVertical: 16,
        fontSize: 15,
        color: theme.text,
      },
      forgotPasswordText: {
        fontSize: 13,
        color: theme.primary,
        fontWeight: "600" as const,
      },
      errorText: {
        color: theme.error,
        fontSize: 13,
        textAlign: "center" as const,
      },
      signInButton: {
        backgroundColor: theme.primary,
        borderRadius: 14,
        paddingVertical: 16,
        paddingHorizontal: 24,
        flexDirection: "row" as const,
        alignItems: "center" as const,
        justifyContent: "center" as const,
        marginTop: 20,
        shadowColor: theme.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
        elevation: 6,
      },
      registerText: {
        fontSize: 14,
        color: theme.textMuted,
      },
      registerHighlight: {
        color: theme.primary,
        fontWeight: "500" as const,
      },
      orbGlowBorder: {
        position: "absolute" as const,
        width: isDark ? ORB_SIZE + 20 : ORB_SIZE + 10,
        height: isDark ? ORB_SIZE + 20 : ORB_SIZE + 10,
        borderRadius: isDark ? (ORB_SIZE + 20) / 2 : (ORB_SIZE + 10) / 2,
        borderWidth: 0,
        borderColor: "transparent",
        backgroundColor: "transparent",
        shadowColor: isDark ? "#a855f7" : "#ffffff",
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: isDark ? 0.6 : 0.4,
        shadowRadius: isDark ? 30 : 15,
        elevation: isDark ? 10 : 8,
        alignItems: "center" as const,
        justifyContent: "center" as const,
      },
      orbGlowInner: {
        width: isDark ? ORB_SIZE + 8 : ORB_SIZE + 4,
        height: isDark ? ORB_SIZE + 8 : ORB_SIZE + 4,
        borderRadius: isDark ? (ORB_SIZE + 8) / 2 : (ORB_SIZE + 4) / 2,
        borderWidth: 0,
        borderColor: "transparent",
        backgroundColor: "transparent",
        shadowColor: isDark ? "#c084fc" : "#ffffff",
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: isDark ? 0.5 : 0.4,
        shadowRadius: isDark ? 15 : 10,
      },
    }),
    [theme, isDark]
  );

  return (
    <SafeAreaView style={dynamicStyles.safeArea} edges={["top", "bottom"]}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <StatusBar style={isDark ? "light" : "dark"} />

        {/* Background gradient */}
        <LinearGradient
          colors={[...theme.gradientColors]}
          style={styles.backgroundGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        />

        {/* Dark mode ambient glow overlay */}
        {isDark && (
          <>
            <LinearGradient
              colors={[
                "rgba(168, 85, 247, 0.15)",
                "rgba(139, 92, 246, 0.08)",
                "transparent",
              ]}
              style={styles.ambientGlowTop}
              start={{ x: 0.5, y: 0 }}
              end={{ x: 0.5, y: 1 }}
            />
            <LinearGradient
              colors={[
                "transparent",
                "rgba(124, 58, 237, 0.1)",
                "rgba(168, 85, 247, 0.12)",
              ]}
              style={styles.ambientGlowBottom}
              start={{ x: 0.5, y: 0 }}
              end={{ x: 0.5, y: 1 }}
            />
          </>
        )}

        {/* Twinkling Stars */}
        <View style={styles.starsContainer}>
          {stars.map((star) => (
            <Star
              key={star.id}
              size={star.size}
              top={star.top}
              left={star.left}
              delay={star.delay}
              color={theme.starColor}
            />
          ))}
        </View>

        {/* Theme Toggle Button - Top Right */}
        <ThemeToggleButton
          isDark={isDark}
          onToggle={toggleTheme}
          theme={theme}
        />

        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: Math.max(40, insets.bottom + 20) },
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
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
            <View style={dynamicStyles.orbGlowBorder}>
              <View style={dynamicStyles.orbGlowInner} />
            </View>
            <Animated.Image
              source={require("../../../assets/signinImage.png")}
              style={[
                styles.orbImage,
                {
                  transform: [{ rotate: spin }, { scale: pulseScale }],
                  opacity: isDark
                    ? Animated.multiply(glowAnim, 0.75)
                    : glowAnim,
                },
              ]}
              resizeMode="contain"
            />
          </Animated.View>

          {/* Content with fade animation */}
          <Animated.View
            style={[
              styles.content,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }],
              },
            ]}
          >
            {/* Glass Card Container */}
            <View style={dynamicStyles.glassCardContainer}>
              <BlurView
                intensity={isDark ? 60 : 40}
                tint={isDark ? "dark" : "light"}
                style={dynamicStyles.glassCard}
              >
                <View style={dynamicStyles.glassCardInner}>
                  <Text style={dynamicStyles.subtitle}>Welcome to</Text>
                  <Text style={dynamicStyles.title}>SIMI</Text>
                  <Text style={dynamicStyles.subtitle}>
                    Sign in so Simi can assist you
                  </Text>

                  {/* Minimal Form */}
                  <View style={styles.form}>
                    <View style={dynamicStyles.inputWrapper}>
                      <TextInput
                        style={dynamicStyles.input}
                        placeholder="Email"
                        placeholderTextColor={theme.textMuted}
                        value={email}
                        onChangeText={setEmail}
                        keyboardType="email-address"
                        autoCapitalize="none"
                        autoCorrect={false}
                      />
                    </View>

                    <View style={dynamicStyles.inputWrapper}>
                      <TextInput
                        style={dynamicStyles.input}
                        placeholder="Password"
                        placeholderTextColor={theme.textMuted}
                        value={password}
                        onChangeText={setPassword}
                        secureTextEntry
                        autoCapitalize="none"
                      />
                    </View>

                    {/* Forgot Password */}
                    <TouchableOpacity
                      style={styles.forgotPassword}
                      activeOpacity={0.6}
                    >
                      <Text style={dynamicStyles.forgotPasswordText}>
                        Forgot password?
                      </Text>
                    </TouchableOpacity>

                    {error && (
                      <Text style={dynamicStyles.errorText}>{error}</Text>
                    )}
                  </View>

                  {/* Sign In Button */}
                  <TouchableOpacity
                    style={[
                      dynamicStyles.signInButton,
                      isLoading && styles.signInButtonDisabled,
                    ]}
                    onPress={handleSignIn}
                    disabled={isLoading}
                    activeOpacity={0.7}
                  >
                    {isLoading ? (
                      <ActivityIndicator color="#ffffff" size="small" />
                    ) : (
                      <>
                        <Text style={styles.signInButtonText}>Sign In</Text>
                        <Text style={styles.signInArrow}>→</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              </BlurView>
            </View>

            {/* Register link */}
            <TouchableOpacity
              style={styles.registerLink}
              onPress={() => navigation.navigate("SignUp")}
              activeOpacity={0.6}
            >
              <Text style={dynamicStyles.registerText}>
                Don't have an account?{" "}
                <Text style={dynamicStyles.registerHighlight}>Create one</Text>
              </Text>
            </TouchableOpacity>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 40,
  },
  backgroundGradient: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  ambientGlowTop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: height * 0.5,
  },
  ambientGlowBottom: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: height * 0.4,
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
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
  },
  themeToggle: {
    position: "absolute",
    top: 60,
    right: 20,
    zIndex: 100,
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  orbContainer: {
    alignItems: "center",
    justifyContent: "center",
    marginTop: height * 0.08,
    height: ORB_SIZE * 1.1,
  },
  orbImage: {
    width: ORB_SIZE,
    height: ORB_SIZE,
  },
  orbImageDark: {
    width: ORB_SIZE * 1.1,
    height: ORB_SIZE * 1.1,
  },
  content: {
    paddingHorizontal: 24,
    paddingTop: 10,
  },
  form: {
    marginTop: 24,
    gap: 14,
  },
  forgotPassword: {
    alignSelf: "flex-end",
    paddingVertical: 4,
  },
  signInButtonDisabled: {
    opacity: 0.6,
  },
  signInButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#ffffff",
  },
  signInArrow: {
    fontSize: 18,
    marginLeft: 8,
    color: "#ffffff",
  },
  registerLink: {
    marginTop: 20,
    alignItems: "center",
    paddingVertical: 8,
  },
});
