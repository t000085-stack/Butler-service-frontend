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
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { StatusBar } from "expo-status-bar";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useAuth } from "../../contexts/AuthContext";
import type { AuthStackParamList } from "../../navigation/AuthStack";
import { COLORS } from "../../constants/config";

const { width, height } = Dimensions.get("window");
const ORB_SIZE = width * 0.5;

type NavigationProp = NativeStackNavigationProp<AuthStackParamList, "SignUp">;

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

// Validation helpers
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface FieldErrors {
  username?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
}

const validateUsername = (value: string): string | undefined => {
  const trimmed = value.trim();
  if (!trimmed) return "Username is required";
  if (trimmed.length < 3) return "Username must be at least 3 characters";
  return undefined;
};

const validateEmail = (value: string): string | undefined => {
  const trimmed = value.trim();
  if (!trimmed) return "Email is required";
  if (!EMAIL_REGEX.test(trimmed)) return "Please enter a valid email address";
  return undefined;
};

const validatePassword = (value: string): string | undefined => {
  if (!value) return "Password is required";
  if (value.length < 6) return "Password must be at least 6 characters";
  return undefined;
};

const validateConfirmPassword = (
  password: string,
  confirmPassword: string
): string | undefined => {
  if (!confirmPassword) return "Please confirm your password";
  if (password !== confirmPassword) return "Passwords do not match";
  return undefined;
};

export default function SignUpScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { signUp } = useAuth();

  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  // Memoize stars so they don't regenerate on re-render
  const stars = useMemo(() => generateStars(30), []);

  // Animations
  const floatAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;

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

  // Validate a single field and update errors
  const validateField = (field: keyof FieldErrors, value?: string) => {
    let error: string | undefined;

    switch (field) {
      case "username":
        error = validateUsername(value ?? username);
        break;
      case "email":
        error = validateEmail(value ?? email);
        break;
      case "password":
        error = validatePassword(value ?? password);
        break;
      case "confirmPassword":
        error = validateConfirmPassword(password, value ?? confirmPassword);
        break;
    }

    setFieldErrors((prev) => ({ ...prev, [field]: error }));
    return error;
  };

  // Handle field blur for validation
  const handleBlur = (field: keyof FieldErrors) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    validateField(field);
  };

  // Validate all fields
  const validateAll = (): boolean => {
    const errors: FieldErrors = {
      username: validateUsername(username),
      email: validateEmail(email),
      password: validatePassword(password),
      confirmPassword: validateConfirmPassword(password, confirmPassword),
    };

    setFieldErrors(errors);
    setTouched({
      username: true,
      email: true,
      password: true,
      confirmPassword: true,
    });

    return !Object.values(errors).some((e) => e !== undefined);
  };

  const handleSignUp = async () => {
    // Validate all fields
    if (!validateAll()) {
      return;
    }

    setError(null);
    setIsLoading(true);

    try {
      await signUp(username.trim(), email.trim().toLowerCase(), password);
    } catch (err: any) {
      setError(err.message || "Something went wrong");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <StatusBar style="dark" />

        {/* Back Button */}
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>

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
          contentContainerStyle={styles.scrollContent}
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
              styles.content,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }],
              },
            ]}
          >
            <Text style={styles.title}>Create Account</Text>
            <Text style={styles.subtitle}>
              Join us and let Simi{"\n"}guide your journey.
            </Text>

            {/* Form */}
            <View style={styles.form}>
              <View>
                <View
                  style={[
                    styles.inputWrapper,
                    touched.username &&
                      fieldErrors.username &&
                      styles.inputError,
                  ]}
                >
                  <TextInput
                    style={styles.input}
                    placeholder="Username (min 3 characters)"
                    placeholderTextColor={COLORS.textMuted}
                    value={username}
                    onChangeText={(text) => {
                      setUsername(text);
                      if (touched.username) validateField("username", text);
                    }}
                    onBlur={() => handleBlur("username")}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                </View>
                {touched.username && fieldErrors.username && (
                  <Text style={styles.fieldErrorText}>
                    {fieldErrors.username}
                  </Text>
                )}
              </View>

              <View>
                <View
                  style={[
                    styles.inputWrapper,
                    touched.email && fieldErrors.email && styles.inputError,
                  ]}
                >
                  <TextInput
                    style={styles.input}
                    placeholder="Email"
                    placeholderTextColor={COLORS.textMuted}
                    value={email}
                    onChangeText={(text) => {
                      setEmail(text);
                      if (touched.email) validateField("email", text);
                    }}
                    onBlur={() => handleBlur("email")}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                </View>
                {touched.email && fieldErrors.email && (
                  <Text style={styles.fieldErrorText}>{fieldErrors.email}</Text>
                )}
              </View>

              <View>
                <View
                  style={[
                    styles.inputWrapper,
                    touched.password &&
                      fieldErrors.password &&
                      styles.inputError,
                  ]}
                >
                  <TextInput
                    style={styles.input}
                    placeholder="Password (min 6 characters)"
                    placeholderTextColor={COLORS.textMuted}
                    value={password}
                    onChangeText={(text) => {
                      setPassword(text);
                      if (touched.password) validateField("password", text);
                      // Also revalidate confirm password if it's been touched
                      if (touched.confirmPassword)
                        validateField("confirmPassword", confirmPassword);
                    }}
                    onBlur={() => handleBlur("password")}
                    secureTextEntry
                    autoCapitalize="none"
                  />
                </View>
                {touched.password && fieldErrors.password && (
                  <Text style={styles.fieldErrorText}>
                    {fieldErrors.password}
                  </Text>
                )}
              </View>

              <View>
                <View
                  style={[
                    styles.inputWrapper,
                    touched.confirmPassword &&
                      fieldErrors.confirmPassword &&
                      styles.inputError,
                  ]}
                >
                  <TextInput
                    style={styles.input}
                    placeholder="Confirm Password"
                    placeholderTextColor={COLORS.textMuted}
                    value={confirmPassword}
                    onChangeText={(text) => {
                      setConfirmPassword(text);
                      if (touched.confirmPassword)
                        validateField("confirmPassword", text);
                    }}
                    onBlur={() => handleBlur("confirmPassword")}
                    secureTextEntry
                    autoCapitalize="none"
                  />
                </View>
                {touched.confirmPassword && fieldErrors.confirmPassword && (
                  <Text style={styles.fieldErrorText}>
                    {fieldErrors.confirmPassword}
                  </Text>
                )}
              </View>

              {error && <Text style={styles.errorText}>{error}</Text>}
            </View>

            {/* Sign Up Button */}
            <TouchableOpacity
              style={[
                styles.signUpButton,
                isLoading && styles.signUpButtonDisabled,
              ]}
              onPress={handleSignUp}
              disabled={isLoading}
              activeOpacity={0.7}
            >
              {isLoading ? (
                <ActivityIndicator color={COLORS.text} size="small" />
              ) : (
                <>
                  <Text style={styles.signUpButtonText}>Create Account</Text>
                  <Text style={styles.signUpArrow}>→</Text>
                </>
              )}
            </TouchableOpacity>

            {/* Sign In link */}
            <TouchableOpacity
              style={styles.signInLink}
              onPress={() => navigation.goBack()}
              activeOpacity={0.6}
            >
              <Text style={styles.signInText}>
                Already have an account?{" "}
                <Text style={styles.signInHighlight}>Sign In</Text>
              </Text>
            </TouchableOpacity>
          </Animated.View>
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
  backButton: {
    position: "absolute",
    top: 10,
    left: 20,
    zIndex: 10,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.8)",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  backIcon: {
    fontSize: 20,
    color: COLORS.text,
    fontWeight: "500",
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
  star: {
    position: "absolute",
    backgroundColor: COLORS.primaryLight,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 40,
  },
  orbContainer: {
    alignItems: "center",
    justifyContent: "center",
    marginTop: height * 0.06,
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
  content: {
    flex: 1,
    paddingHorizontal: 40,
    paddingTop: 16,
  },
  title: {
    fontSize: 26,
    fontWeight: "600",
    color: COLORS.text,
    textAlign: "center",
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 15,
    color: COLORS.textSecondary,
    textAlign: "center",
    marginTop: 10,
    lineHeight: 22,
  },
  form: {
    marginTop: 24,
    gap: 12,
  },
  inputWrapper: {
    backgroundColor: COLORS.backgroundSecondary,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  inputError: {
    borderColor: COLORS.error,
  },
  input: {
    paddingHorizontal: 18,
    paddingVertical: 14,
    fontSize: 15,
    color: COLORS.text,
  },
  fieldErrorText: {
    color: COLORS.error,
    fontSize: 12,
    marginTop: 4,
    marginLeft: 4,
  },
  errorText: {
    color: COLORS.error,
    fontSize: 13,
    textAlign: "center",
    marginTop: 4,
  },
  signUpButton: {
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
  signUpButtonDisabled: {
    opacity: 0.6,
  },
  signUpButtonText: {
    fontSize: 15,
    fontWeight: "500",
    color: COLORS.text,
  },
  signUpArrow: {
    fontSize: 16,
    marginLeft: 8,
    color: COLORS.text,
  },
  signInLink: {
    marginTop: 20,
    alignItems: "center",
    paddingVertical: 8,
  },
  signInText: {
    fontSize: 14,
    color: COLORS.textMuted,
  },
  signInHighlight: {
    color: COLORS.primary,
    fontWeight: "500",
  },
});
