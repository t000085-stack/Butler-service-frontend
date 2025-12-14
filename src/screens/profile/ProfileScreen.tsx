import React, { useState, useEffect, useRef } from "react";
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
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { StatusBar } from "expo-status-bar";
import { useAuth } from "../../contexts/AuthContext";
import { COLORS } from "../../constants/config";
import * as butlerApi from "../../api/butler";

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
  const thumbPosition = useRef(new Animated.Value(0)).current;
  const isDragging = useRef(false);
  const sliderWidthRef = useRef(0);
  const sliderTrackRef = useRef<View>(null);
  const sliderPageXRef = useRef(0); // Absolute X position of track on screen
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

  // Pan responder for dragging - uses true touch position (pageX)
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt) => {
        isDragging.current = true;
        // Update track position before calculating
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
          // Calculate position relative to track using stored pageX
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

  // Handle track layout to get actual width and store position
  const handleTrackLayout = (event: any) => {
    const { width } = event.nativeEvent.layout;
    if (width > 0 && width !== sliderWidth) {
      setSliderWidth(width);
      sliderWidthRef.current = width;
      // Set initial position based on current energy
      const position = ((baselineEnergy - 1) / 9) * width;
      thumbPosition.setValue(position);
    }
    // Store track's absolute position
    if (sliderTrackRef.current) {
      sliderTrackRef.current.measureInWindow((x, y, w, h) => {
        sliderPageXRef.current = x;
      });
    }
  };

  const handleSignOut = () => {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: signOut,
      },
    ]);
  };

  const adjustEnergy = (delta: number) => {
    const newValue = Math.max(1, Math.min(10, baselineEnergy + delta));
    setBaselineEnergy(newValue);
    checkForChanges(newValue, selectedCoreValues);
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

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
      <StatusBar style="dark" />

      {/* Subtle background gradient */}
      <LinearGradient
        colors={["#ffffff", "#faf5ff", "#fdf4ff", "#ffffff"]}
        style={styles.backgroundGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={styles.title}>Profile</Text>
        </View>

        <View style={styles.card}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {user?.username?.charAt(0).toUpperCase() || "?"}
            </Text>
          </View>
          <Text style={styles.username}>{user?.username || "User"}</Text>
          <Text style={styles.email}>{user?.email || ""}</Text>
        </View>

        <View style={styles.section}>
          {user?.health && (
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Health</Text>
              <Text style={styles.infoValue}>{user.health}</Text>
            </View>
          )}

          {user?.career && (
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Career</Text>
              <Text style={styles.infoValue}>{user.career}</Text>
            </View>
          )}

          {user?.relationship && (
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Relationship</Text>
              <Text style={styles.infoValue}>{user.relationship}</Text>
            </View>
          )}
        </View>

        {user?.preferences && user.preferences.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Preferences</Text>
            <View style={styles.valuesRow}>
              {user.preferences.map((preference, index) => (
                <View key={index} style={styles.preferenceBadge}>
                  <Text style={styles.preferenceBadgeText}>{preference}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Core Values</Text>
          <Text style={styles.sectionSubtitle}>
            Select the values that matter most to you
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.tagsContainer}
            style={styles.tagsScrollView}
          >
            {CORE_VALUE_TAGS.map((tag) => {
              const isSelected = selectedCoreValues.includes(tag);
              return (
                <TouchableOpacity
                  key={tag}
                  style={[styles.tag, isSelected && styles.tagSelected]}
                  onPress={() => toggleCoreValue(tag)}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.tagText,
                      isSelected && styles.tagTextSelected,
                    ]}
                  >
                    {tag}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Settings</Text>

          <View style={styles.settingItem}>
            <View style={styles.energyHeader}>
              <Text style={styles.settingLabel}>Daily Energy Level</Text>
              <Text style={styles.energySubLabel}>
                How energetic do you usually feel?
              </Text>
            </View>
            <View style={styles.energyDisplay}>
              <Text style={styles.energyValue}>{baselineEnergy}</Text>
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
                {/* Track Background */}
                <View style={styles.sliderTrackBackground}>
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
                  />
                </View>

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
                />
              </View>
              <View style={styles.sliderLabels}>
                <Text style={styles.sliderLabelText}>Low</Text>
                <Text style={styles.sliderLabelText}>High</Text>
              </View>
            </View>

            {/* Current Level Description */}
            <View style={styles.energyDescription}>
              <Text style={styles.energyDescriptionText}>
                {ENERGY_LEVELS.find((item) => item.level === baselineEnergy)
                  ?.description || ""}
              </Text>
            </View>
          </View>

          <Text style={styles.energyHint}>
            This helps Simi understand your typical energy level to suggest
            tasks that match how you usually feel
          </Text>
        </View>

        {hasChanges && (
          <TouchableOpacity
            style={[styles.saveButton, isSaving && styles.saveButtonDisabled]}
            onPress={handleSaveProfile}
            disabled={isSaving}
            activeOpacity={0.7}
          >
            {isSaving ? (
              <ActivityIndicator color={COLORS.text} size="small" />
            ) : (
              <Text style={styles.saveButtonText}>Save Changes</Text>
            )}
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={styles.signOutButton}
          onPress={handleSignOut}
          activeOpacity={0.7}
        >
          <Text style={styles.signOutButtonText}>Sign Out</Text>
        </TouchableOpacity>
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
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 40,
    paddingTop: 20,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 24,
    alignItems: "center",
  },
  title: {
    fontSize: 26,
    fontWeight: "600",
    color: COLORS.text,
    letterSpacing: -0.5,
  },
  card: {
    backgroundColor: COLORS.backgroundSecondary,
    borderRadius: 16,
    padding: 24,
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 24,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  avatarText: {
    fontSize: 40,
    fontWeight: "700",
    color: COLORS.background,
  },
  username: {
    fontSize: 22,
    fontWeight: "700",
    color: COLORS.text,
    marginBottom: 4,
  },
  email: {
    fontSize: 15,
    color: COLORS.textSecondary,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.text,
    marginBottom: 16,
  },
  infoItem: {
    backgroundColor: COLORS.backgroundSecondary,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  infoLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.textSecondary,
    marginBottom: 6,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  infoValue: {
    fontSize: 16,
    fontWeight: "500",
    color: COLORS.text,
  },
  textInput: {
    fontSize: 16,
    fontWeight: "500",
    color: COLORS.text,
    padding: 0,
    marginTop: 4,
  },
  valuesRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  valueBadge: {
    backgroundColor: COLORS.primary + "20",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  valueBadgeText: {
    fontSize: 14,
    color: COLORS.primary,
    fontWeight: "500",
  },
  sectionSubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 16,
    marginTop: -8,
  },
  tagsScrollView: {
    marginHorizontal: -40,
    paddingHorizontal: 40,
  },
  tagsContainer: {
    flexDirection: "row",
    paddingRight: 40,
    gap: 10,
  },
  tag: {
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 24,
    backgroundColor: COLORS.backgroundSecondary,
    borderWidth: 2,
    borderColor: COLORS.border,
  },
  tagSelected: {
    backgroundColor: COLORS.primary + "15",
    borderColor: COLORS.primary,
    borderWidth: 2,
  },
  tagText: {
    fontSize: 14,
    fontWeight: "500",
    color: COLORS.text,
  },
  tagTextSelected: {
    color: COLORS.primary,
    fontWeight: "600",
  },
  preferenceBadge: {
    backgroundColor: COLORS.primaryLight + "30",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.primaryLight,
  },
  preferenceBadgeText: {
    fontSize: 14,
    color: COLORS.primary,
    fontWeight: "600",
  },
  settingItem: {
    backgroundColor: COLORS.backgroundSecondary,
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.text,
    marginBottom: 4,
  },
  energyHeader: {
    marginBottom: 16,
  },
  energySubLabel: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  energyDisplay: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "center",
    marginBottom: 24,
  },
  energyValue: {
    fontSize: 36,
    fontWeight: "700",
    color: COLORS.primary,
  },
  energyMax: {
    fontSize: 20,
    fontWeight: "500",
    color: COLORS.textSecondary,
    marginLeft: 4,
  },
  sliderContainer: {
    marginBottom: 20,
  },
  sliderTrack: {
    height: 50,
    justifyContent: "center",
    position: "relative",
    paddingVertical: 13,
  },
  sliderTrackBackground: {
    height: 4,
    backgroundColor: COLORS.border,
    borderRadius: 2,
    position: "absolute",
    left: 0,
    right: 0,
    top: 23,
  },
  sliderTrackFill: {
    height: 4,
    backgroundColor: COLORS.primary,
    borderRadius: 2,
  },
  sliderThumb: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
    borderWidth: 3,
    borderColor: COLORS.background,
    position: "absolute",
    top: 11,
    marginLeft: -12,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
    zIndex: 10,
  },
  sliderMarker: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
    top: 19,
    marginLeft: -6,
    width: 12,
    height: 12,
  },
  sliderDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.border,
  },
  sliderDotActive: {
    backgroundColor: COLORS.primary,
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  sliderLabels: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 4,
  },
  sliderLabelText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: "500",
  },
  energyDescription: {
    backgroundColor: COLORS.primary + "10",
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
    borderWidth: 1,
    borderColor: COLORS.primary + "20",
  },
  energyDescriptionText: {
    fontSize: 14,
    color: COLORS.text,
    textAlign: "center",
    lineHeight: 20,
    fontWeight: "500",
  },
  energyHint: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 12,
    lineHeight: 18,
    textAlign: "center",
  },
  saveButton: {
    backgroundColor: COLORS.backgroundSecondary,
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 24,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.borderDark,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    fontSize: 15,
    fontWeight: "500",
    color: COLORS.text,
  },
  signOutButton: {
    backgroundColor: COLORS.error + "15",
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 16,
    borderWidth: 1,
    borderColor: COLORS.error + "30",
  },
  signOutButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.error,
  },
});
