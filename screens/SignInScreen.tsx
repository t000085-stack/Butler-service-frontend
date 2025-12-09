import React, { useState } from "react";
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
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { StatusBar } from "expo-status-bar";

const { width, height } = Dimensions.get("window");
const ORB_SIZE = width * 0.65;

interface SignInScreenProps {
  onSignIn?: (email: string, password: string) => Promise<void>;
  onNavigateToRegister?: () => void;
}

export default function SignInScreen({
  onSignIn,
  onNavigateToRegister,
}: SignInScreenProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSignIn = async () => {
    if (!email.trim() || !password.trim()) {
      setError("Please fill in all fields");
      return;
    }

    setError(null);
    setIsLoading(true);

    try {
      if (onSignIn) {
        await onSignIn(email, password);
      } else {
        // Default implementation - connect to your backend
        const response = await fetch("http://localhost:3000/api/auth/login", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ email, password }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || "Login failed");
        }

        console.log("Login successful:", data);
        // Handle successful login - store token, navigate, etc.
      }
    } catch (err: any) {
      setError(err.message || "Something went wrong");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <StatusBar style="dark" />

      {/* Background gradient glow */}
      <View style={styles.backgroundGlow}>
        <LinearGradient
          colors={[
            "rgba(216, 180, 254, 0.15)",
            "rgba(251, 207, 232, 0.1)",
            "transparent",
          ]}
          style={styles.backgroundGlowGradient}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
        />
      </View>

      {/* Ethereal Orb */}
      <View style={styles.orbContainer}>
        {/* Outer glow */}
        <View style={styles.outerGlow}>
          <LinearGradient
            colors={[
              "rgba(192, 132, 252, 0.2)",
              "rgba(244, 114, 182, 0.1)",
              "transparent",
            ]}
            style={styles.outerGlowGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          />
        </View>

        {/* Arc ring */}
        <View style={styles.arcContainer}>
          <View style={styles.arc} />
        </View>

        {/* Main orb */}
        <View style={styles.orb}>
          <LinearGradient
            colors={["#c084fc", "#e879f9", "#f9a8d4", "#fce7f3"]}
            style={styles.orbGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          />

          {/* Inner highlight */}
          <View style={styles.orbHighlight}>
            <LinearGradient
              colors={[
                "rgba(255, 255, 255, 0.6)",
                "rgba(255, 255, 255, 0.1)",
                "transparent",
              ]}
              style={styles.highlightGradient}
              start={{ x: 0.3, y: 0 }}
              end={{ x: 0.7, y: 1 }}
            />
          </View>

          {/* Subtle inner glow */}
          <View style={styles.innerGlow}>
            <LinearGradient
              colors={[
                "transparent",
                "rgba(251, 191, 36, 0.15)",
                "rgba(252, 211, 77, 0.2)",
              ]}
              style={styles.innerGlowGradient}
              start={{ x: 0.5, y: 0 }}
              end={{ x: 0.5, y: 1 }}
            />
          </View>

          {/* Reflection line */}
          <View style={styles.reflectionLine} />
        </View>
      </View>

      {/* Content */}
      <View style={styles.content}>
        <Text style={styles.title}>Welcome Back</Text>
        <Text style={styles.subtitle}>
          Sign in to let your AI Butler help you take the next step.
        </Text>

        {/* Form */}
        <View style={styles.form}>
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              placeholder="Email"
              placeholderTextColor="#9ca3af"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              placeholder="Password"
              placeholderTextColor="#9ca3af"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoCapitalize="none"
            />
          </View>

          {error && <Text style={styles.errorText}>{error}</Text>}

          <TouchableOpacity
            style={[
              styles.signInButton,
              isLoading && styles.signInButtonDisabled,
            ]}
            onPress={handleSignIn}
            disabled={isLoading}
            activeOpacity={0.8}
          >
            {isLoading ? (
              <ActivityIndicator color="#1f2937" />
            ) : (
              <>
                <Text style={styles.signInButtonText}>Sign In</Text>
                <Text style={styles.signInIcon}>→</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Register link */}
        <TouchableOpacity
          style={styles.registerLink}
          onPress={onNavigateToRegister}
          activeOpacity={0.7}
        >
          <Text style={styles.registerText}>
            Don't have an account?{" "}
            <Text style={styles.registerTextBold}>Create one</Text>
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fafafa",
  },
  backgroundGlow: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: height * 0.5,
  },
  backgroundGlowGradient: {
    flex: 1,
  },
  orbContainer: {
    alignItems: "center",
    justifyContent: "center",
    marginTop: height * 0.1,
    height: ORB_SIZE * 1.2,
  },
  outerGlow: {
    position: "absolute",
    width: ORB_SIZE * 1.4,
    height: ORB_SIZE * 1.4,
    borderRadius: ORB_SIZE * 0.7,
    overflow: "hidden",
  },
  outerGlowGradient: {
    flex: 1,
  },
  arcContainer: {
    position: "absolute",
    width: ORB_SIZE * 1.15,
    height: ORB_SIZE * 1.15,
    alignItems: "center",
    justifyContent: "center",
  },
  arc: {
    position: "absolute",
    width: ORB_SIZE * 1.1,
    height: ORB_SIZE * 1.1,
    borderRadius: ORB_SIZE * 0.55,
    borderWidth: 2,
    borderColor: "transparent",
    borderLeftColor: "rgba(167, 139, 250, 0.6)",
    borderTopColor: "rgba(167, 139, 250, 0.3)",
    transform: [{ rotate: "-45deg" }],
  },
  orb: {
    width: ORB_SIZE,
    height: ORB_SIZE,
    borderRadius: ORB_SIZE / 2,
    overflow: "hidden",
    shadowColor: "#c084fc",
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.3,
    shadowRadius: 40,
    elevation: 20,
  },
  orbGradient: {
    flex: 1,
  },
  orbHighlight: {
    position: "absolute",
    top: ORB_SIZE * 0.05,
    left: ORB_SIZE * 0.15,
    width: ORB_SIZE * 0.5,
    height: ORB_SIZE * 0.4,
    borderRadius: ORB_SIZE * 0.25,
    overflow: "hidden",
    transform: [{ rotate: "-20deg" }],
  },
  highlightGradient: {
    flex: 1,
  },
  innerGlow: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: ORB_SIZE * 0.4,
    overflow: "hidden",
  },
  innerGlowGradient: {
    flex: 1,
  },
  reflectionLine: {
    position: "absolute",
    top: ORB_SIZE * 0.25,
    left: ORB_SIZE * 0.55,
    width: ORB_SIZE * 0.15,
    height: 2,
    backgroundColor: "rgba(255, 255, 255, 0.5)",
    borderRadius: 1,
    transform: [{ rotate: "45deg" }],
  },
  content: {
    flex: 1,
    paddingHorizontal: 32,
    paddingTop: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: "#1f2937",
    textAlign: "center",
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 15,
    color: "#6b7280",
    textAlign: "center",
    marginTop: 8,
    lineHeight: 22,
    paddingHorizontal: 20,
  },
  form: {
    marginTop: 32,
    gap: 16,
  },
  inputContainer: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 2,
  },
  input: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    fontSize: 16,
    color: "#1f2937",
  },
  errorText: {
    color: "#ef4444",
    fontSize: 14,
    textAlign: "center",
    marginTop: -8,
  },
  signInButton: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    paddingVertical: 18,
    paddingHorizontal: 24,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    marginTop: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 3,
  },
  signInButtonDisabled: {
    opacity: 0.7,
  },
  signInButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1f2937",
    letterSpacing: 0.3,
  },
  signInIcon: {
    fontSize: 18,
    marginLeft: 8,
    color: "#1f2937",
  },
  registerLink: {
    marginTop: 24,
    alignItems: "center",
  },
  registerText: {
    fontSize: 14,
    color: "#6b7280",
  },
  registerTextBold: {
    color: "#7c3aed",
    fontWeight: "600",
  },
});
