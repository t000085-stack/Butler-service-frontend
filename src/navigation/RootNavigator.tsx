import React, { useState, useEffect, useRef } from "react";
import { NavigationContainer } from "@react-navigation/native";
import {
  View,
  ActivityIndicator,
  StyleSheet,
  Animated,
  Easing,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAuth } from "../contexts/AuthContext";
import AuthStack from "./AuthStack";
import MainTabs from "./MainTabs";
import SplashScreen from "../screens/splash/SplashScreen";
import { COLORS } from "../constants/config";

const SPLASH_SHOWN_KEY = "@splash_shown_today";

export default function RootNavigator() {
  const { isAuthenticated, isLoading } = useAuth();
  const [showSplash, setShowSplash] = useState(false);
  const [checkingSplash, setCheckingSplash] = useState(true);
  const mainContentFadeAnim = useRef(new Animated.Value(0)).current;
  const [isTransitioning, setIsTransitioning] = useState(false);

  useEffect(() => {
    const checkSplashStatus = async () => {
      if (isAuthenticated && !isLoading) {
        // Always show splash screen for now (can change to once per day later)
        setShowSplash(true);
        setCheckingSplash(false);
      } else {
        setCheckingSplash(false);
      }
    };

    checkSplashStatus();
  }, [isAuthenticated, isLoading]);

  const handleMoodSelected = (mood: string) => {
    // Start transition - render both screens simultaneously
    setIsTransitioning(true);
    // Start fading in main content immediately (overlap with splash fade-out)
    Animated.timing(mainContentFadeAnim, {
      toValue: 1,
      duration: 300,
      easing: Easing.out(Easing.ease),
      useNativeDriver: true,
    }).start(() => {
      // After animation completes, hide splash
      setShowSplash(false);
      setIsTransitioning(false);
    });
  };

  useEffect(() => {
    // Fade in main content when splash is not showing and not transitioning
    if (!showSplash && !isTransitioning && isAuthenticated && !isLoading) {
      Animated.timing(mainContentFadeAnim, {
        toValue: 1,
        duration: 300,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }).start();
    }
  }, [showSplash, isTransitioning, isAuthenticated, isLoading]);

  if (isLoading || checkingSplash) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.background }}>
      {/* Main Content - always rendered but faded */}
      {isAuthenticated && (
        <Animated.View
          style={[
            StyleSheet.absoluteFill,
            {
              opacity: mainContentFadeAnim,
              zIndex: showSplash ? 0 : 1,
              backgroundColor: COLORS.background,
            },
          ]}
        >
          <NavigationContainer>
            <MainTabs />
          </NavigationContainer>
        </Animated.View>
      )}

      {/* Splash Screen - rendered on top during transition */}
      {isAuthenticated && showSplash && (
        <View
          style={StyleSheet.absoluteFill}
          pointerEvents={isTransitioning ? "none" : "auto"}
        >
          <SplashScreen onMoodSelected={handleMoodSelected} />
        </View>
      )}

      {/* Auth Stack */}
      {!isAuthenticated && (
        <NavigationContainer>
          <AuthStack />
        </NavigationContainer>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.background,
  },
});
