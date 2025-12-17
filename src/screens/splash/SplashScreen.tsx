import React, { useEffect, useRef, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
  Easing,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { COLORS } from "../../constants/config";

const { width, height } = Dimensions.get("window");

// Floating Dot Component
const FloatingDot = ({
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
  const floatAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(0.15)).current;

  useEffect(() => {
    // Floating animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, {
          toValue: 1,
          duration: 2000 + Math.random() * 2000,
          delay,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(floatAnim, {
          toValue: 0,
          duration: 2000 + Math.random() * 2000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Opacity pulse - subtle animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(opacityAnim, {
          toValue: 0.35,
          duration: 1500 + Math.random() * 1000,
          delay,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 0.15,
          duration: 1500 + Math.random() * 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  const translateY = floatAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -30],
  });

  return (
    <Animated.View
      style={[
        styles.floatingDot,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          top,
          left,
          opacity: opacityAnim,
          transform: [{ translateY }],
        },
      ]}
    />
  );
};

// Generate random floating dots - smaller sizes
const generateDots = (count: number) => {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    size: Math.random() * 3 + 2, // Smaller dots: 2-5px (was 4-12px)
    top: Math.random() * height,
    left: Math.random() * width,
    delay: Math.random() * 2000,
  }));
};

interface SplashScreenProps {
  onMoodSelected: (mood: string) => void;
}

export default function SplashScreen({ onMoodSelected }: SplashScreenProps) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const fadeOutAnim = useRef(new Animated.Value(1)).current;
  const dots = useMemo(() => generateDots(30), []);

  useEffect(() => {
    // Fade in animation
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1000,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
    ]).start();

    // Auto proceed after 3 seconds with smooth fade-out
    const timer = setTimeout(() => {
      // Fade out animation before transitioning
      Animated.timing(fadeOutAnim, {
        toValue: 0,
        duration: 300,
        easing: Easing.in(Easing.ease),
        useNativeDriver: true,
      }).start(() => {
        onMoodSelected("neutral");
      });
    }, 3000);

    return () => clearTimeout(timer);
  }, []);

  return (
    <Animated.View
      style={[
        { flex: 1, backgroundColor: "#faf5ff" },
        {
          opacity: fadeOutAnim,
        },
      ]}
    >
      <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
        {/* Background Gradient */}
        <LinearGradient
          colors={["#ffffff", "#faf5ff", "#fdf4ff", "#ffffff"]}
          style={styles.backgroundGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        />

        {/* Floating Dots */}
        {dots.map((dot) => (
          <FloatingDot
            key={dot.id}
            size={dot.size}
            top={dot.top}
            left={dot.left}
            delay={dot.delay}
          />
        ))}

        {/* Question Text */}
        <Animated.View
          style={[
            styles.content,
            {
              opacity: fadeAnim,
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          <Text style={styles.questionText}>How are you feeling today?</Text>
        </Animated.View>
      </SafeAreaView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },
  backgroundGradient: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  floatingDot: {
    position: "absolute",
    backgroundColor: "#522861",
    shadowColor: "#522861",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
  },
  content: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
  },
  questionText: {
    fontSize: 32,
    fontWeight: "300",
    color: "#522861",
    letterSpacing: 0.5,
    fontStyle: "italic",
    textAlign: "center",
    lineHeight: 42,
  },
});
