import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  PanResponder,
  Dimensions,
  Animated,
  Easing,
  Modal,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { StatusBar } from "expo-status-bar";
import { Feather } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { useAuth } from "../../contexts/AuthContext";
import * as butlerApi from "../../api/butler";

const { width } = Dimensions.get("window");

const CORE_VALUE_TAGS = [
  "Health",
  "Family",
  "Relationships",
  "Work",
  "Integrity",
  "Peace",
  "Growth",
  "Stability",
  "Purpose",
  "Freedom",
  "Joy",
];

const ENERGY_LEVELS = [
  { level: 1, description: "Completely drained, need rest" },
  { level: 2, description: "Very low energy, minimal activity" },
  { level: 3, description: "Low energy, prefer easy tasks" },
  { level: 4, description: "Below average, take it slow" },
  { level: 5, description: "Moderate energy, balanced day" },
  { level: 6, description: "Good energy, ready for action" },
  { level: 7, description: "High energy, feeling productive" },
  { level: 8, description: "Very energetic, can tackle anything" },
  { level: 9, description: "Extremely energetic, peak performance" },
  { level: 10, description: "Maximum energy, unstoppable" },
];

// Floating Particle Component
const FloatingParticle = ({
  delay,
  size,
  startX,
  startY,
}: {
  delay: number;
  size: number;
  startX: number;
  startY: number;
}) => {
  const floatAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const startAnimation = () => {
      floatAnim.setValue(0);
      opacityAnim.setValue(0);

      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.parallel([
            Animated.timing(floatAnim, {
              toValue: 1,
              duration: 8000 + Math.random() * 4000,
              easing: Easing.inOut(Easing.ease),
              useNativeDriver: true,
            }),
            Animated.sequence([
              Animated.timing(opacityAnim, {
                toValue: 0.6,
                duration: 2000,
                useNativeDriver: true,
              }),
              Animated.timing(opacityAnim, {
                toValue: 0,
                duration: 6000,
                useNativeDriver: true,
              }),
            ]),
          ]),
        ])
      ).start();
    };
    startAnimation();
  }, [delay, floatAnim, opacityAnim]);

  return (
    <Animated.View
      style={[
        styles.particle,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          left: startX,
          opacity: opacityAnim,
          transform: [
            {
              translateY: floatAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [startY, startY - 150],
              }),
            },
            {
              translateX: floatAnim.interpolate({
                inputRange: [0, 0.5, 1],
                outputRange: [
                  0,
                  Math.random() * 30 - 15,
                  Math.random() * 20 - 10,
                ],
              }),
            },
          ],
        },
      ]}
    />
  );
};

// Animated Profile Avatar
const AnimatedAvatar = ({ username }: { username: string }) => {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.05,
          duration: 2000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 2000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();

    Animated.loop(
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 20000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();
  }, []);

  const spin = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  return (
    <Animated.View
      style={[styles.avatarContainer, { transform: [{ scale: pulseAnim }] }]}
    >
      <Animated.View
        style={[styles.avatarRing, { transform: [{ rotate: spin }] }]}
      >
        <LinearGradient
          colors={["#522861", "#7a4d84", "#522861"]}
          style={styles.avatarRingGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        />
      </Animated.View>
      <LinearGradient
        colors={["#522861", "#7a4d84"]}
        style={styles.avatar}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <Text style={styles.avatarText}>
          {username ? username.charAt(0).toUpperCase() : "U"}
        </Text>
      </LinearGradient>
    </Animated.View>
  );
};

export default function ProfileScreen() {
  const { user, signOut } = useAuth();
  const [baselineEnergy, setBaselineEnergy] = useState(
    user?.baseline_energy || 5
  );
  const [selectedCoreValues, setSelectedCoreValues] = useState<string[]>(
    user?.core_values || []
  );
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Slider state
  const [sliderWidth, setSliderWidth] = useState(0);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  const thumbPosition = useRef(new Animated.Value(0)).current;
  const isDragging = useRef(false);
  const sliderWidthRef = useRef(0);
  const sliderTrackRef = useRef<View>(null);
  const sliderPageXRef = useRef(0);
  const selectedCoreValuesRef = useRef(selectedCoreValues);

  // Keep refs in sync
  useEffect(() => {
    sliderWidthRef.current = sliderWidth;
  }, [sliderWidth]);

  useEffect(() => {
    selectedCoreValuesRef.current = selectedCoreValues;
  }, [selectedCoreValues]);

  // Initialize from user data
  useEffect(() => {
    if (user) {
      const userEnergy = user.baseline_energy || 5;
      setBaselineEnergy(userEnergy);
      setSelectedCoreValues(user.core_values || []);
    }
  }, [user?.baseline_energy, user?.core_values]);

  // Update thumb position when energy changes (but not while dragging)
  useEffect(() => {
    if (!isDragging.current && sliderWidth > 0) {
      const position = ((baselineEnergy - 1) / 9) * sliderWidth;
      Animated.timing(thumbPosition, {
        toValue: position,
        duration: 200,
        useNativeDriver: false,
      }).start();
    }
  }, [baselineEnergy, sliderWidth]);

  // Reset to saved values when screen comes into focus (discards unsaved changes)
  useFocusEffect(
    useCallback(() => {
      if (user) {
        setBaselineEnergy(user.baseline_energy || 5);
        setSelectedCoreValues(user.core_values || []);
        setHasChanges(false);
      }
    }, [user])
  );

  const checkForChanges = (energy: number, coreValues: string[]) => {
    const energyChanged = energy !== (user?.baseline_energy || 5);
    const coreValuesChanged =
      JSON.stringify(coreValues.sort()) !==
      JSON.stringify((user?.core_values || []).sort());
    setHasChanges(energyChanged || coreValuesChanged);
  };

  // Calculate energy level from X position
  const getEnergyFromX = (x: number, width: number): number => {
    if (width === 0) return baselineEnergy;
    const clampedX = Math.max(0, Math.min(width, x));
    const ratio = clampedX / width;
    const level = Math.round(ratio * 9) + 1;
    return Math.max(1, Math.min(10, level));
  };

  // Pan responder for dragging
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt) => {
        isDragging.current = true;
        if (sliderTrackRef.current) {
          sliderTrackRef.current.measureInWindow((x, y, width, height) => {
            sliderPageXRef.current = x;
            const { pageX } = evt.nativeEvent;
            const currentWidth = sliderWidthRef.current;
            if (currentWidth > 0) {
              const relativeX = pageX - x;
              const clampedX = Math.max(0, Math.min(currentWidth, relativeX));
              const newEnergy = getEnergyFromX(clampedX, currentWidth);
              setBaselineEnergy(newEnergy);
              checkForChanges(newEnergy, selectedCoreValuesRef.current);
              thumbPosition.setValue(clampedX);
            }
          });
        }
      },
      onPanResponderMove: (evt) => {
        const { pageX } = evt.nativeEvent;
        const currentWidth = sliderWidthRef.current;
        const trackX = sliderPageXRef.current;
        if (currentWidth > 0) {
          const relativeX = pageX - trackX;
          const clampedX = Math.max(0, Math.min(currentWidth, relativeX));
          const newEnergy = getEnergyFromX(clampedX, currentWidth);
          setBaselineEnergy(newEnergy);
          checkForChanges(newEnergy, selectedCoreValuesRef.current);
          thumbPosition.setValue(clampedX);
        }
      },
      onPanResponderRelease: () => {
        isDragging.current = false;
        const currentWidth = sliderWidthRef.current;
        setBaselineEnergy((current) => {
          if (currentWidth > 0) {
            const exactPosition = ((current - 1) / 9) * currentWidth;
            Animated.timing(thumbPosition, {
              toValue: exactPosition,
              duration: 150,
              useNativeDriver: false,
            }).start();
          }
          return current;
        });
      },
    })
  ).current;

  const handleTrackLayout = (event: any) => {
    const { width } = event.nativeEvent.layout;
    if (width > 0 && width !== sliderWidth) {
      setSliderWidth(width);
      sliderWidthRef.current = width;
      const position = ((baselineEnergy - 1) / 9) * width;
      thumbPosition.setValue(position);
    }
    if (sliderTrackRef.current) {
      sliderTrackRef.current.measureInWindow((x, y, w, h) => {
        sliderPageXRef.current = x;
      });
    }
  };

  const handleSignOut = () => {
    setShowLogoutModal(true);
  };

  const confirmLogout = async () => {
    setShowLogoutModal(false);
    try {
      await signOut();
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to logout");
    }
  };

  const toggleCoreValue = (value: string) => {
    const newValues = selectedCoreValues.includes(value)
      ? selectedCoreValues.filter((v) => v !== value)
      : [...selectedCoreValues, value];
    setSelectedCoreValues(newValues);
    checkForChanges(baselineEnergy, newValues);
  };

  const handleSaveProfile = async () => {
    setIsSaving(true);
    try {
      await butlerApi.updateButlerProfile({
        baseline_energy: baselineEnergy,
        core_values: selectedCoreValues,
      });
      setHasChanges(false);
      Alert.alert("Success", "Profile updated successfully");
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to update profile");
    } finally {
      setIsSaving(false);
    }
  };

  const getEnergyColor = () => {
    if (baselineEnergy <= 3) return "#522861";
    if (baselineEnergy <= 6) return "#7a4d84";
    return "#522861";
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
      <StatusBar style="dark" />

      {/* Beautiful gradient background */}
      <LinearGradient
        colors={["#ffffff", "#faf5ff", "#fdf4ff", "#ffffff"]}
        style={styles.backgroundGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />

      {/* Floating particles */}
      <View style={styles.particlesContainer}>
        <FloatingParticle
          delay={0}
          size={6}
          startX={width * 0.1}
          startY={200}
        />
        <FloatingParticle
          delay={1500}
          size={4}
          startX={width * 0.3}
          startY={400}
        />
        <FloatingParticle
          delay={3000}
          size={5}
          startX={width * 0.7}
          startY={300}
        />
        <FloatingParticle
          delay={4500}
          size={3}
          startX={width * 0.85}
          startY={500}
        />
        <FloatingParticle
          delay={2000}
          size={4}
          startX={width * 0.5}
          startY={600}
        />
      </View>

      {/* Header with settings */}
      <View style={styles.appHeader}>
        <View style={styles.appHeaderLeft} />
        <View style={styles.appHeaderCenter} />
        <TouchableOpacity
          style={styles.appHeaderRight}
          onPress={() => {
            setShowSettingsModal(true);
            setExpandedSection(null);
          }}
          activeOpacity={0.7}
        >
          <LinearGradient
            colors={["rgba(82, 40, 97, 0.15)", "rgba(122, 77, 132, 0.1)"]}
            style={styles.logoutGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Feather name="settings" size={18} color="#522861" />
          </LinearGradient>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Card */}
        <View style={styles.profileCard}>
          <AnimatedAvatar username={user?.username || "User"} />
          <Text style={styles.username}>{user?.username || "User"}</Text>
          <Text style={styles.email}>{user?.email || ""}</Text>

          {/* Quick Stats */}
          <View style={styles.statsRow}>
            {user?.health && (
              <View style={styles.statBadge}>
                <Feather name="heart" size={14} color="#522861" />
                <Text style={styles.statBadgeText}>{user.health}</Text>
              </View>
            )}
            {user?.career && (
              <View style={styles.statBadge}>
                <Feather name="briefcase" size={14} color="#522861" />
                <Text style={styles.statBadgeText}>{user.career}</Text>
              </View>
            )}
            {user?.relationship && (
              <View style={styles.statBadge}>
                <Feather name="users" size={14} color="#522861" />
                <Text style={styles.statBadgeText}>{user.relationship}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Preferences Section */}
        {user?.preferences && user.preferences.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionIconContainer}>
                <Feather name="sliders" size={16} color="#522861" />
              </View>
              <Text style={styles.sectionTitle}>Preferences</Text>
            </View>
            <View style={styles.sectionCard}>
              <View style={styles.tagsContainer}>
                {user.preferences.map((preference, index) => (
                  <View key={index} style={styles.preferenceBadge}>
                    <Text style={styles.preferenceBadgeText}>{preference}</Text>
                  </View>
                ))}
              </View>
            </View>
          </View>
        )}

        {/* Energy Level Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionIconContainer}>
              <Feather name="zap" size={16} color="#522861" />
            </View>
            <View>
              <Text style={styles.sectionTitle}>Daily Energy Level</Text>
              <Text style={styles.sectionSubtitle}>
                Your typical energy baseline
              </Text>
            </View>
          </View>

          <View style={styles.energyCard}>
            {/* Energy Display */}
            <View style={styles.energyDisplay}>
              <LinearGradient
                colors={["#522861", "#7a4d84"]}
                style={styles.energyValueContainer}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Text style={styles.energyValue}>{baselineEnergy}</Text>
              </LinearGradient>
              <Text style={styles.energyMax}>/ 10</Text>
            </View>

            {/* Slider Track */}
            <View style={styles.sliderContainer}>
              <View
                ref={sliderTrackRef}
                style={styles.sliderTrack}
                onLayout={handleTrackLayout}
                {...panResponder.panHandlers}
              >
                <LinearGradient
                  colors={["rgba(82, 40, 97, 0.2)", "rgba(122, 77, 132, 0.3)"]}
                  style={styles.sliderTrackBackground}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                />
                <Animated.View
                  style={[
                    styles.sliderTrackFill,
                    {
                      width: thumbPosition.interpolate({
                        inputRange: [0, Math.max(sliderWidth, 1)],
                        outputRange: [0, Math.max(sliderWidth, 1)],
                        extrapolate: "clamp",
                      }),
                    },
                  ]}
                >
                  <LinearGradient
                    colors={["#522861", "#7a4d84"]}
                    style={StyleSheet.absoluteFill}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                  />
                </Animated.View>

                {/* Level Markers */}
                {ENERGY_LEVELS.map((item) => (
                  <View
                    key={item.level}
                    style={[
                      styles.sliderMarker,
                      {
                        left: `${((item.level - 1) / 9) * 100}%`,
                      },
                    ]}
                  >
                    <View
                      style={[
                        styles.sliderDot,
                        baselineEnergy >= item.level && styles.sliderDotActive,
                      ]}
                    />
                  </View>
                ))}

                {/* Thumb */}
                <Animated.View
                  style={[
                    styles.sliderThumb,
                    {
                      transform: [
                        {
                          translateX: thumbPosition.interpolate({
                            inputRange: [0, Math.max(sliderWidth, 1)],
                            outputRange: [0, Math.max(sliderWidth, 1)],
                            extrapolate: "clamp",
                          }),
                        },
                      ],
                    },
                  ]}
                >
                  <LinearGradient
                    colors={["#522861", "#7a4d84"]}
                    style={styles.sliderThumbGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  />
                </Animated.View>
              </View>
              <View style={styles.sliderLabels}>
                <Text style={styles.sliderLabelText}>Low</Text>
                <Text style={styles.sliderLabelText}>High</Text>
              </View>
            </View>

            {/* Current Level Description */}
            <View style={styles.energyDescription}>
              <Feather name="info" size={14} color="#522861" />
              <Text style={styles.energyDescriptionText}>
                {ENERGY_LEVELS.find((item) => item.level === baselineEnergy)
                  ?.description || ""}
              </Text>
            </View>
          </View>

          <Text style={styles.energyHint}>
            This helps Simi suggest tasks that match your typical energy level
          </Text>
        </View>

        {/* Save Button */}
        {hasChanges && (
          <TouchableOpacity
            style={[styles.saveButton, isSaving && styles.saveButtonDisabled]}
            onPress={handleSaveProfile}
            disabled={isSaving}
            activeOpacity={0.7}
          >
            <LinearGradient
              colors={["#522861", "#7a4d84"]}
              style={styles.saveButtonGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              {isSaving ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <Feather name="check" size={18} color="#fff" />
                  <Text style={styles.saveButtonText}>Save Changes</Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>
        )}

        {/* Sign Out Button */}
        <TouchableOpacity
          style={styles.signOutButton}
          onPress={handleSignOut}
          activeOpacity={0.7}
        >
          <Feather name="log-out" size={18} color="#dc2626" />
          <Text style={styles.signOutButtonText}>Sign Out</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Settings Modal */}
      <Modal
        visible={showSettingsModal}
        animationType="fade"
        transparent
        onRequestClose={() => setShowSettingsModal(false)}
      >
        <View style={styles.settingsModalOverlay}>
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={() => {
              setShowSettingsModal(false);
              setExpandedSection(null);
            }}
          />
          <View style={styles.settingsModalContent}>
            <View style={styles.settingsModalHeader}>
              <Text style={styles.settingsModalTitle}>Settings</Text>
              <TouchableOpacity
                onPress={() => {
                  setShowSettingsModal(false);
                  setExpandedSection(null);
                }}
                activeOpacity={0.7}
              >
                <Feather name="x" size={24} color="#522861" />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.settingsScrollView}
              showsVerticalScrollIndicator={true}
              contentContainerStyle={styles.settingsScrollContent}
            >
              {/* About App Section */}
              <View style={styles.settingsDropdownSection}>
                <TouchableOpacity
                  style={styles.settingsDropdownHeader}
                  onPress={() =>
                    setExpandedSection(
                      expandedSection === "about" ? null : "about"
                    )
                  }
                  activeOpacity={0.7}
                >
                  <Text style={styles.settingsSectionTitle}>About SIMI</Text>
                  <Feather
                    name={
                      expandedSection === "about"
                        ? "chevron-up"
                        : "chevron-down"
                    }
                    size={20}
                    color="#522861"
                  />
                </TouchableOpacity>
                {expandedSection === "about" && (
                  <View style={styles.settingsDropdownContent}>
                    <ScrollView
                      nestedScrollEnabled={true}
                      showsVerticalScrollIndicator={false}
                    >
                      <Text style={styles.settingsSectionText}>
                        SIMI is your intelligent personal assistant designed to
                        help you manage tasks, understand your emotional state,
                        and make better decisions about your daily activities.
                        SIMI uses advanced AI to parse your tasks, understand
                        your feelings, and provide personalized recommendations
                        that align with your core values and energy levels.
                      </Text>
                      <Text style={styles.settingsSectionText}>
                        Our mission is to help you achieve balance, reduce
                        emotional friction, and make progress on what truly
                        matters to you.
                      </Text>
                    </ScrollView>
                  </View>
                )}
              </View>

              {/* Privacy Policy Section */}
              <View style={styles.settingsDropdownSection}>
                <TouchableOpacity
                  style={styles.settingsDropdownHeader}
                  onPress={() =>
                    setExpandedSection(
                      expandedSection === "privacy" ? null : "privacy"
                    )
                  }
                  activeOpacity={0.7}
                >
                  <Text style={styles.settingsSectionTitle}>
                    Privacy Policy
                  </Text>
                  <Feather
                    name={
                      expandedSection === "privacy"
                        ? "chevron-up"
                        : "chevron-down"
                    }
                    size={20}
                    color="#522861"
                  />
                </TouchableOpacity>
                {expandedSection === "privacy" && (
                  <View style={styles.settingsDropdownContent}>
                    <ScrollView
                      nestedScrollEnabled={true}
                      showsVerticalScrollIndicator={false}
                    >
                      <Text style={styles.settingsSectionText}>
                        <Text style={styles.settingsBoldText}>
                          Information We Collect:
                        </Text>
                        {"\n"}
                        We collect information you provide directly to us,
                        including your name, email address, tasks, energy
                        levels, core values, and emotional feedback. We also
                        collect usage data and device information to improve our
                        services.
                      </Text>
                      <Text style={styles.settingsSectionText}>
                        <Text style={styles.settingsBoldText}>
                          How We Use Your Data:
                        </Text>
                        {"\n"}
                        Your data is used to provide personalized task
                        management, emotional insights, and recommendations. We
                        do not sell your personal information to third parties.
                      </Text>
                      <Text style={styles.settingsSectionText}>
                        <Text style={styles.settingsBoldText}>
                          Data Security:
                        </Text>
                        {"\n"}
                        We implement industry-standard security measures to
                        protect your information. However, no method of
                        transmission over the internet is 100% secure.
                      </Text>
                      <Text style={styles.settingsSectionText}>
                        <Text style={styles.settingsBoldText}>
                          Your Rights:
                        </Text>
                        {"\n"}
                        You have the right to access, update, or delete your
                        personal information at any time through the app
                        settings or by contacting us.
                      </Text>
                    </ScrollView>
                  </View>
                )}
              </View>

              {/* User Agreement Section */}
              <View style={styles.settingsDropdownSection}>
                <TouchableOpacity
                  style={styles.settingsDropdownHeader}
                  onPress={() =>
                    setExpandedSection(
                      expandedSection === "agreement" ? null : "agreement"
                    )
                  }
                  activeOpacity={0.7}
                >
                  <Text style={styles.settingsSectionTitle}>
                    User Agreement
                  </Text>
                  <Feather
                    name={
                      expandedSection === "agreement"
                        ? "chevron-up"
                        : "chevron-down"
                    }
                    size={20}
                    color="#522861"
                  />
                </TouchableOpacity>
                {expandedSection === "agreement" && (
                  <View style={styles.settingsDropdownContent}>
                    <ScrollView
                      nestedScrollEnabled={true}
                      showsVerticalScrollIndicator={false}
                    >
                      <Text style={styles.settingsSectionText}>
                        <Text style={styles.settingsBoldText}>
                          Acceptance of Terms:
                        </Text>
                        {"\n"}
                        By using SIMI, you agree to be bound by this User
                        Agreement. If you do not agree, please do not use the
                        service.
                      </Text>
                      <Text style={styles.settingsSectionText}>
                        <Text style={styles.settingsBoldText}>
                          Account Responsibility:
                        </Text>
                        {"\n"}
                        You are responsible for maintaining the confidentiality
                        of your account credentials and for all activities that
                        occur under your account.
                      </Text>
                      <Text style={styles.settingsSectionText}>
                        <Text style={styles.settingsBoldText}>
                          Acceptable Use:
                        </Text>
                        {"\n"}
                        You agree not to use SIMI for any unlawful purpose or in
                        any way that could damage, disable, or impair the
                        service.
                      </Text>
                      <Text style={styles.settingsSectionText}>
                        <Text style={styles.settingsBoldText}>
                          Service Modifications:
                        </Text>
                        {"\n"}
                        We reserve the right to modify or discontinue the
                        service at any time with or without notice.
                      </Text>
                    </ScrollView>
                  </View>
                )}
              </View>

              {/* Terms of Use Section */}
              <View style={styles.settingsDropdownSection}>
                <TouchableOpacity
                  style={styles.settingsDropdownHeader}
                  onPress={() =>
                    setExpandedSection(
                      expandedSection === "terms" ? null : "terms"
                    )
                  }
                  activeOpacity={0.7}
                >
                  <Text style={styles.settingsSectionTitle}>Terms of Use</Text>
                  <Feather
                    name={
                      expandedSection === "terms"
                        ? "chevron-up"
                        : "chevron-down"
                    }
                    size={20}
                    color="#522861"
                  />
                </TouchableOpacity>
                {expandedSection === "terms" && (
                  <View style={styles.settingsDropdownContent}>
                    <ScrollView
                      nestedScrollEnabled={true}
                      showsVerticalScrollIndicator={false}
                    >
                      <Text style={styles.settingsSectionText}>
                        <Text style={styles.settingsBoldText}>
                          License to Use:
                        </Text>
                        {"\n"}
                        SIMI grants you a limited, non-exclusive,
                        non-transferable license to use the app for personal,
                        non-commercial purposes.
                      </Text>
                      <Text style={styles.settingsSectionText}>
                        <Text style={styles.settingsBoldText}>
                          Intellectual Property:
                        </Text>
                        {"\n"}
                        All content, features, and functionality of SIMI are
                        owned by us and are protected by copyright, trademark,
                        and other intellectual property laws.
                      </Text>
                      <Text style={styles.settingsSectionText}>
                        <Text style={styles.settingsBoldText}>
                          Limitation of Liability:
                        </Text>
                        {"\n"}
                        SIMI is provided "as is" without warranties of any kind.
                        We are not liable for any damages arising from your use
                        of the service.
                      </Text>
                      <Text style={styles.settingsSectionText}>
                        <Text style={styles.settingsBoldText}>
                          Termination:
                        </Text>
                        {"\n"}
                        We may terminate or suspend your access to SIMI at any
                        time for violation of these terms.
                      </Text>
                    </ScrollView>
                  </View>
                )}
              </View>

              {/* How to Use Section */}
              <View style={styles.settingsDropdownSection}>
                <TouchableOpacity
                  style={styles.settingsDropdownHeader}
                  onPress={() =>
                    setExpandedSection(
                      expandedSection === "howto" ? null : "howto"
                    )
                  }
                  activeOpacity={0.7}
                >
                  <Text style={styles.settingsSectionTitle}>
                    How to Use SIMI
                  </Text>
                  <Feather
                    name={
                      expandedSection === "howto"
                        ? "chevron-up"
                        : "chevron-down"
                    }
                    size={20}
                    color="#522861"
                  />
                </TouchableOpacity>
                {expandedSection === "howto" && (
                  <View style={styles.settingsDropdownContent}>
                    <ScrollView
                      nestedScrollEnabled={true}
                      showsVerticalScrollIndicator={false}
                    >
                      <Text style={styles.settingsSectionText}>
                        <Text style={styles.settingsBoldText}>
                          1. Getting Started:
                        </Text>
                        {"\n"}
                        After creating your account, set your baseline energy
                        level and select your core values in the Profile
                        section. This helps SIMI understand your preferences.
                      </Text>
                      <Text style={styles.settingsSectionText}>
                        <Text style={styles.settingsBoldText}>
                          2. Adding Tasks:
                        </Text>
                        {"\n"}
                        Use the "Add Task" button to create tasks. You can
                        describe your task naturally using voice or text. SIMI
                        will parse your task and ask how you feel about it to
                        better understand your emotional state.
                      </Text>
                      <Text style={styles.settingsSectionText}>
                        <Text style={styles.settingsBoldText}>
                          3. Magic Parse:
                        </Text>
                        {"\n"}
                        The Magic Parse feature allows you to describe tasks in
                        natural language. SIMI will extract the task title,
                        estimate energy cost, and identify emotional friction.
                        You can then provide feedback on how you feel about the
                        task.
                      </Text>
                      <Text style={styles.settingsSectionText}>
                        <Text style={styles.settingsBoldText}>
                          4. Task Management:
                        </Text>
                        {"\n"}
                        View all your tasks in the Tasks screen. Mark tasks as
                        done, edit them, or delete them as needed. The calendar
                        view helps you see tasks by date.
                      </Text>
                      <Text style={styles.settingsSectionText}>
                        <Text style={styles.settingsBoldText}>
                          5. Chat with SIMI:
                        </Text>
                        {"\n"}
                        Use the Chat feature to have conversations with SIMI
                        about your tasks, get advice, or ask questions. SIMI can
                        help you prioritize and understand your emotional
                        responses to tasks.
                      </Text>
                      <Text style={styles.settingsSectionText}>
                        <Text style={styles.settingsBoldText}>
                          6. Profile Settings:
                        </Text>
                        {"\n"}
                        Regularly update your baseline energy level and core
                        values as they change. This ensures SIMI's
                        recommendations remain accurate and helpful.
                      </Text>
                    </ScrollView>
                  </View>
                )}
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Logout Confirmation Modal */}
      <Modal
        visible={showLogoutModal}
        animationType="fade"
        transparent
        onRequestClose={() => setShowLogoutModal(false)}
      >
        <TouchableOpacity
          style={styles.logoutModalOverlay}
          activeOpacity={1}
          onPress={() => setShowLogoutModal(false)}
        >
          <View
            style={styles.logoutModalContent}
            onStartShouldSetResponder={() => true}
          >
            <Text style={styles.logoutModalTitle}>Logout</Text>
            <Text style={styles.logoutModalMessage}>
              Are you sure you want to logout?
            </Text>
            <View style={styles.logoutModalButtons}>
              <View style={styles.logoutModalButtonWrapper}>
                <TouchableOpacity
                  style={styles.logoutModalCancelButton}
                  onPress={() => setShowLogoutModal(false)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.logoutModalCancelText}>Cancel</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.logoutModalButtonWrapper}>
                <TouchableOpacity
                  style={styles.logoutModalConfirmButton}
                  onPress={confirmLogout}
                  activeOpacity={0.7}
                >
                  <LinearGradient
                    colors={["#522861", "#7a4d84"]}
                    style={styles.logoutModalConfirmGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  >
                    <Text style={styles.logoutModalConfirmText}>Logout</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#ffffff",
  },
  backgroundGradient: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  particlesContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    pointerEvents: "none",
  },
  particle: {
    position: "absolute",
    backgroundColor: "#522861",
  },
  appHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: "transparent",
  },
  appHeaderLeft: {
    width: 44,
  },
  appHeaderCenter: {
    flex: 1,
  },
  appHeaderRight: {
    alignItems: "center",
    justifyContent: "center",
  },
  logoutGradient: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: "rgba(82, 40, 97, 0.2)",
    shadowColor: "#522861",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  profileCard: {
    backgroundColor: "rgba(255, 255, 255, 0.85)",
    borderRadius: 20,
    padding: 24,
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "rgba(255, 255, 255, 0.8)",
    borderTopColor: "rgba(255, 255, 255, 0.9)",
    borderLeftColor: "rgba(255, 255, 255, 0.9)",
    marginBottom: 20,
    shadowColor: "#522861",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 10,
  },
  avatarContainer: {
    width: 100,
    height: 100,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  avatarRing: {
    position: "absolute",
    width: 100,
    height: 100,
    borderRadius: 50,
    overflow: "hidden",
  },
  avatarRingGradient: {
    width: "100%",
    height: "100%",
    borderRadius: 50,
    opacity: 0.3,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#522861",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  avatarText: {
    fontSize: 32,
    fontWeight: "700",
    color: "#fff",
  },
  username: {
    fontSize: 24,
    fontWeight: "700",
    color: "#522861",
    marginBottom: 4,
    letterSpacing: -0.5,
  },
  email: {
    fontSize: 14,
    color: "#7a4d84",
    marginBottom: 16,
  },
  statsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    justifyContent: "center",
  },
  statBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(82, 40, 97, 0.08)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(82, 40, 97, 0.15)",
  },
  statBadgeText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#522861",
  },
  section: {
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 12,
  },
  sectionIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: "rgba(82, 40, 97, 0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#522861",
    letterSpacing: -0.3,
  },
  sectionSubtitle: {
    fontSize: 12,
    color: "#7a4d84",
    marginTop: 2,
  },
  sectionCard: {
    backgroundColor: "rgba(255, 255, 255, 0.85)",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1.5,
    borderColor: "rgba(255, 255, 255, 0.8)",
    borderTopColor: "rgba(255, 255, 255, 0.9)",
    borderLeftColor: "rgba(255, 255, 255, 0.9)",
    shadowColor: "#522861",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 10,
  },
  tagsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  tag: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.8)",
    borderWidth: 1.5,
    borderColor: "rgba(82, 40, 97, 0.15)",
  },
  tagSelected: {
    backgroundColor: "rgba(82, 40, 97, 0.12)",
    borderColor: "#522861",
    borderWidth: 2,
  },
  tagIcon: {
    marginRight: 4,
  },
  tagText: {
    fontSize: 13,
    fontWeight: "500",
    color: "#7a4d84",
  },
  tagTextSelected: {
    color: "#522861",
    fontWeight: "600",
  },
  preferenceBadge: {
    backgroundColor: "rgba(82, 40, 97, 0.1)",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(82, 40, 97, 0.2)",
  },
  preferenceBadgeText: {
    fontSize: 13,
    color: "#522861",
    fontWeight: "600",
  },
  energyCard: {
    backgroundColor: "rgba(255, 255, 255, 0.85)",
    borderRadius: 16,
    padding: 20,
    borderWidth: 1.5,
    borderColor: "rgba(255, 255, 255, 0.8)",
    borderTopColor: "rgba(255, 255, 255, 0.9)",
    borderLeftColor: "rgba(255, 255, 255, 0.9)",
    shadowColor: "#522861",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 10,
  },
  energyDisplay: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
    gap: 8,
  },
  energyValueContainer: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#522861",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  energyValue: {
    fontSize: 28,
    fontWeight: "700",
    color: "#fff",
  },
  energyMax: {
    fontSize: 18,
    fontWeight: "500",
    color: "#7a4d84",
  },
  sliderContainer: {
    marginBottom: 16,
  },
  sliderTrack: {
    height: 50,
    justifyContent: "center",
    position: "relative",
    paddingVertical: 13,
  },
  sliderTrackBackground: {
    height: 6,
    borderRadius: 3,
    position: "absolute",
    left: 0,
    right: 0,
    top: 22,
  },
  sliderTrackFill: {
    height: 6,
    borderRadius: 3,
    position: "absolute",
    left: 0,
    top: 22,
    overflow: "hidden",
  },
  sliderThumb: {
    width: 28,
    height: 28,
    borderRadius: 14,
    position: "absolute",
    top: 11,
    marginLeft: -14,
    shadowColor: "#522861",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 10,
    overflow: "hidden",
  },
  sliderThumbGradient: {
    width: "100%",
    height: "100%",
    borderRadius: 14,
    borderWidth: 3,
    borderColor: "#fff",
  },
  sliderMarker: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
    top: 21,
    marginLeft: -4,
    width: 8,
    height: 8,
  },
  sliderDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "rgba(82, 40, 97, 0.2)",
  },
  sliderDotActive: {
    backgroundColor: "rgba(82, 40, 97, 0.5)",
  },
  sliderLabels: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 4,
    marginTop: 4,
  },
  sliderLabelText: {
    fontSize: 12,
    color: "#7a4d84",
    fontWeight: "500",
  },
  energyDescription: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(82, 40, 97, 0.08)",
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: "rgba(82, 40, 97, 0.12)",
  },
  energyDescriptionText: {
    flex: 1,
    fontSize: 13,
    color: "#522861",
    lineHeight: 18,
    fontWeight: "500",
  },
  energyHint: {
    fontSize: 12,
    color: "#7a4d84",
    marginTop: 12,
    lineHeight: 18,
    textAlign: "center",
    paddingHorizontal: 20,
  },
  saveButton: {
    marginBottom: 12,
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: "#522861",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 16,
    paddingHorizontal: 24,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
  },
  signOutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "rgba(255, 255, 255, 0.85)",
    borderRadius: 16,
    paddingVertical: 16,
    marginTop: 8,
    borderWidth: 1.5,
    borderColor: "rgba(255, 255, 255, 0.8)",
    borderTopColor: "rgba(255, 255, 255, 0.9)",
    borderLeftColor: "rgba(255, 255, 255, 0.9)",
    shadowColor: "#dc2626",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 4,
  },
  signOutButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#dc2626",
  },
  // Logout Modal Styles
  logoutModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.4)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 16,
  },
  logoutModalContent: {
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    borderRadius: 24,
    padding: 24,
    width: "100%",
    maxWidth: width - 64,
    shadowColor: "#522861",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 24,
    elevation: 12,
    borderWidth: 1.5,
    borderColor: "rgba(255, 255, 255, 0.8)",
    borderTopColor: "rgba(255, 255, 255, 0.9)",
    borderLeftColor: "rgba(255, 255, 255, 0.9)",
  },
  logoutModalTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#522861",
    marginBottom: 12,
    textAlign: "center",
  },
  logoutModalMessage: {
    fontSize: 16,
    color: "#71717a",
    textAlign: "center",
    marginBottom: 24,
    lineHeight: 22,
  },
  logoutModalButtons: {
    flexDirection: "row",
    gap: 12,
  },
  logoutModalButtonWrapper: {
    flex: 1,
  },
  logoutModalCancelButton: {
    width: "100%",
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 16,
    backgroundColor: "rgba(82, 40, 97, 0.08)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: "rgba(82, 40, 97, 0.2)",
  },
  logoutModalCancelText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#522861",
  },
  logoutModalConfirmButton: {
    width: "100%",
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: "#522861",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  logoutModalConfirmGradient: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  logoutModalConfirmText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
  },
  // Settings Modal Styles
  settingsModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  settingsModalContent: {
    width: "100%",
    maxWidth: 500,
    height: Dimensions.get("window").height * 0.85,
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    borderRadius: 24,
    padding: 24,
    shadowColor: "#522861",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 24,
    elevation: 12,
    borderWidth: 1.5,
    borderColor: "rgba(255, 255, 255, 0.8)",
    borderTopColor: "rgba(255, 255, 255, 0.9)",
    borderLeftColor: "rgba(255, 255, 255, 0.9)",
  },
  settingsModalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(82, 40, 97, 0.1)",
  },
  settingsModalTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#522861",
    letterSpacing: -0.5,
  },
  settingsScrollView: {
    height: Dimensions.get("window").height * 0.65,
  },
  settingsScrollContent: {
    paddingBottom: 20,
  },
  settingsDropdownSection: {
    marginBottom: 12,
    backgroundColor: "rgba(240, 235, 245, 0.5)",
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(82, 40, 97, 0.1)",
  },
  settingsDropdownHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 16,
    paddingHorizontal: 20,
    backgroundColor: "rgba(255, 255, 255, 0.8)",
  },
  settingsDropdownContent: {
    maxHeight: 300,
    backgroundColor: "rgba(255, 255, 255, 0.6)",
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 20,
  },
  settingsSection: {
    marginBottom: 28,
  },
  settingsSectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#522861",
    marginBottom: 12,
    letterSpacing: -0.3,
    flex: 1,
  },
  settingsSectionText: {
    fontSize: 15,
    lineHeight: 24,
    color: "#3d1e49",
    marginBottom: 12,
  },
  settingsBoldText: {
    fontWeight: "700",
    color: "#522861",
    fontSize: 15,
  },
});
