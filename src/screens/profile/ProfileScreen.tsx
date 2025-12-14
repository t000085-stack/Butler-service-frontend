import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  TextInput,
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

export default function ProfileScreen() {
  const { user, signOut } = useAuth();
  const [baselineEnergy, setBaselineEnergy] = useState(
    user?.baseline_energy || 5
  );
  const [personalValue, setPersonalValue] = useState(
    user?.personal_value || ""
  );
  const [selectedCoreValues, setSelectedCoreValues] = useState<string[]>(
    user?.core_values || []
  );
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    setPersonalValue(user?.personal_value || "");
    setBaselineEnergy(user?.baseline_energy || 5);
    setSelectedCoreValues(user?.core_values || []);
    setHasChanges(false);
  }, [user?.personal_value, user?.baseline_energy, user?.core_values]);

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
    checkForChanges(newValue, personalValue, selectedCoreValues);
  };

  const handlePersonalValueChange = (value: string) => {
    setPersonalValue(value);
    checkForChanges(baselineEnergy, value, selectedCoreValues);
  };

  const checkForChanges = (
    energy: number,
    value: string,
    coreValues: string[]
  ) => {
    const energyChanged = energy !== (user?.baseline_energy || 5);
    const valueChanged = value !== (user?.personal_value || "");
    const coreValuesChanged =
      JSON.stringify(coreValues.sort()) !==
      JSON.stringify((user?.core_values || []).sort());
    setHasChanges(energyChanged || valueChanged || coreValuesChanged);
  };

  const toggleCoreValue = (value: string) => {
    const newValues = selectedCoreValues.includes(value)
      ? selectedCoreValues.filter((v) => v !== value)
      : [...selectedCoreValues, value];
    setSelectedCoreValues(newValues);
    checkForChanges(baselineEnergy, personalValue, newValues);
  };

  const handleSaveProfile = async () => {
    setIsSaving(true);
    try {
      await butlerApi.updateButlerProfile({
        baseline_energy: baselineEnergy,
        personal_value: personalValue,
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
          <Text style={styles.sectionTitle}>Personal Information</Text>

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

          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Personal Values</Text>
            <TextInput
              style={styles.textInput}
              value={personalValue}
              onChangeText={handlePersonalValueChange}
              placeholder="Enter your personal values"
              placeholderTextColor={COLORS.textMuted}
            />
          </View>
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
            <Text style={styles.settingLabel}>Baseline Energy</Text>
            <View style={styles.energyControl}>
              <TouchableOpacity
                style={styles.energyButton}
                onPress={() => adjustEnergy(-1)}
                disabled={baselineEnergy <= 1}
              >
                <Text
                  style={[
                    styles.energyButtonText,
                    baselineEnergy <= 1 && styles.energyButtonDisabled,
                  ]}
                >
                  −
                </Text>
              </TouchableOpacity>
              <Text style={styles.energyValue}>{baselineEnergy}</Text>
              <TouchableOpacity
                style={styles.energyButton}
                onPress={() => adjustEnergy(1)}
                disabled={baselineEnergy >= 10}
              >
                <Text
                  style={[
                    styles.energyButtonText,
                    baselineEnergy >= 10 && styles.energyButtonDisabled,
                  ]}
                >
                  +
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          <Text style={styles.energyHint}>
            Your typical energy level on a normal day
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
    padding: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  settingLabel: {
    fontSize: 15,
    color: COLORS.text,
  },
  energyControl: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  energyButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.primary + "20",
    alignItems: "center",
    justifyContent: "center",
  },
  energyButtonText: {
    fontSize: 22,
    color: COLORS.primary,
    fontWeight: "500",
  },
  energyButtonDisabled: {
    color: COLORS.textMuted,
  },
  energyValue: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.text,
    minWidth: 30,
    textAlign: "center",
  },
  energyHint: {
    fontSize: 13,
    color: COLORS.textMuted,
    marginTop: 8,
    marginLeft: 4,
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
