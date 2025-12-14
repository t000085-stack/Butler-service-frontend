import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
} from "react-native";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { LinearGradient } from "expo-linear-gradient";
import { StatusBar } from "expo-status-bar";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import Button from "../../components/common/Button";
import { COLORS } from "../../constants/config";
import type { MoodStackParamList } from "../../navigation/MoodStack";
import * as butlerApi from "../../api/butler";
import type { ContextLog } from "../../types";

type NavigationProp = NativeStackNavigationProp<
  MoodStackParamList,
  "MoodEntry"
>;

interface MoodCalendarDay {
  date: Date;
  dayName: string;
  dayNumber: string;
  mood: ContextLog | null;
}

interface MoodInfo {
  iconName: keyof typeof MaterialIcons.glyphMap;
  color: string;
}

const MOOD_INFO: Record<string, MoodInfo> = {
  happy: { iconName: "sentiment-satisfied", color: "#FFD93D" },
  calm: { iconName: "self-improvement", color: "#6BCB77" },
  neutral: { iconName: "sentiment-neutral", color: "#95A5A6" },
  stressed: { iconName: "sentiment-dissatisfied", color: "#FF6B9D" },
  sad: { iconName: "sentiment-very-dissatisfied", color: "#4D96FF" },
  anger: { iconName: "mood-bad", color: "#FF4444" },
};

export default function MoodScreen() {
  const navigation = useNavigation<NavigationProp>();
  const [moodHistory, setMoodHistory] = useState<ContextLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [calendarDays, setCalendarDays] = useState<MoodCalendarDay[]>([]);

  const fetchMoodHistory = async () => {
    try {
      const history = await butlerApi.getHistory(30); // Get last 30 entries
      setMoodHistory(history);
      generateCalendar(history);
    } catch (error: any) {
      console.error("Failed to fetch mood history:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const generateCalendar = (history: ContextLog[]) => {
    const days: MoodCalendarDay[] = [];
    const today = new Date();

    // Get last 7 days
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);

      const dayName = date.toLocaleDateString("en-US", { weekday: "short" });
      const dayNumber = date.getDate().toString();

      // Find mood entry for this date
      const moodEntry = history.find((entry) => {
        const entryDate = new Date(entry.timestamp);
        entryDate.setHours(0, 0, 0, 0);
        return entryDate.getTime() === date.getTime();
      });

      days.push({
        date,
        dayName,
        dayNumber,
        mood: moodEntry || null,
      });
    }

    setCalendarDays(days);
  };

  useFocusEffect(
    useCallback(() => {
      fetchMoodHistory();
    }, [])
  );

  const handleOpenMoodEntry = () => {
    navigation.navigate("MoodEntry");
  };

  const handleEditMood = (entry: ContextLog) => {
    navigation.navigate("MoodEntry", { entryId: entry._id });
  };

  const handleDeleteMood = (entry: ContextLog) => {
    Alert.alert(
      "Delete Mood Entry",
      "Are you sure you want to delete this mood entry?",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await butlerApi.deleteContextLog(entry._id);
              fetchMoodHistory(); // Refresh the list
            } catch (error: any) {
              Alert.alert(
                "Error",
                error?.message || "Failed to delete mood entry"
              );
            }
          },
        },
      ]
    );
  };

  const getMoodInfo = (mood: string): MoodInfo => {
    const moodLower = mood.toLowerCase();
    return MOOD_INFO[moodLower] || MOOD_INFO.neutral;
  };

  const formatDate = (date: Date): string => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dateCopy = new Date(date);
    dateCopy.setHours(0, 0, 0, 0);

    if (dateCopy.getTime() === today.getTime()) {
      return "Today";
    }

    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    if (dateCopy.getTime() === yesterday.getTime()) {
      return "Yesterday";
    }

    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  const formatDateTime = (date: Date): string => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dateCopy = new Date(date);
    dateCopy.setHours(0, 0, 0, 0);

    const timeString = date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });

    if (dateCopy.getTime() === today.getTime()) {
      return `Today at ${timeString}`;
    }

    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    if (dateCopy.getTime() === yesterday.getTime()) {
      return `Yesterday at ${timeString}`;
    }

    const dateString = date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: date.getFullYear() !== today.getFullYear() ? "numeric" : undefined,
    });

    return `${dateString} at ${timeString}`;
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />

      {/* Subtle background gradient */}
      <LinearGradient
        colors={["#ffffff", "#faf5ff", "#fdf4ff", "#ffffff"]}
        style={styles.backgroundGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={styles.title}>Mood Tracker</Text>
          <Text style={styles.subtitle}>
            Track your mood and energy levels to get personalized
            recommendations
          </Text>
        </View>

        <View style={styles.buttonContainer}>
          <Button
            title="Log Your Mood"
            onPress={handleOpenMoodEntry}
            variant="primary"
          />
        </View>

        {/* Mood Calendar */}
        <View style={styles.calendarSection}>
          <Text style={styles.calendarTitle}>Last 7 Days</Text>
          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color={COLORS.primary} />
            </View>
          ) : (
            <View style={styles.calendar}>
              {calendarDays.map((day, index) => (
                <View key={index} style={styles.calendarDay}>
                  <Text style={styles.dayName}>{day.dayName}</Text>
                  <View
                    style={[
                      styles.dayCircle,
                      day.mood && {
                        backgroundColor:
                          getMoodInfo(day.mood.mood).color + "20",
                        borderColor: getMoodInfo(day.mood.mood).color,
                      },
                      index === 6 && styles.todayCircle,
                    ]}
                  >
                    <Text style={styles.dayNumber}>{day.dayNumber}</Text>
                    {day.mood && (
                      <View style={styles.moodIconContainer}>
                        <MaterialIcons
                          name={getMoodInfo(day.mood.mood).iconName}
                          size={20}
                          color={getMoodInfo(day.mood.mood).color}
                        />
                      </View>
                    )}
                  </View>
                  {day.mood && (
                    <Text style={styles.energyText}>
                      {day.mood.current_energy}/10
                    </Text>
                  )}
                </View>
              ))}
            </View>
          )}

          {/* Recent Entries List */}
          {!isLoading && moodHistory.length > 0 && (
            <View style={styles.recentSection}>
              <Text style={styles.recentTitle}>Recent Entries</Text>
              {moodHistory.slice(0, 5).map((entry) => (
                <View key={entry._id} style={styles.entryCard}>
                  <View style={styles.entryHeader}>
                    <View style={styles.entryInfo}>
                      <View style={styles.entryMoodRow}>
                        <MaterialIcons
                          name={getMoodInfo(entry.mood).iconName}
                          size={24}
                          color={getMoodInfo(entry.mood).color}
                          style={styles.entryMoodIcon}
                        />
                        <Text
                          style={[
                            styles.entryMood,
                            { color: getMoodInfo(entry.mood).color },
                          ]}
                        >
                          {entry.mood.charAt(0).toUpperCase() +
                            entry.mood.slice(1)}
                        </Text>
                      </View>
                      <Text style={styles.entryEnergy}>
                        Energy: {entry.current_energy}/10
                      </Text>
                      <Text style={styles.entryDate}>
                        {formatDateTime(new Date(entry.timestamp))}
                      </Text>
                    </View>
                    <View style={styles.entryActions}>
                      <TouchableOpacity
                        onPress={() => handleEditMood(entry)}
                        activeOpacity={0.7}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                      >
                        <Ionicons
                          name="create-outline"
                          size={18}
                          color={COLORS.textMuted}
                        />
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => handleDeleteMood(entry)}
                        activeOpacity={0.7}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                        style={styles.deleteButton}
                      >
                        <Ionicons
                          name="trash-outline"
                          size={18}
                          color={COLORS.textMuted}
                        />
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          )}

          {!isLoading && moodHistory.length === 0 && (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>
                No mood entries yet. Start tracking your mood!
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 40,
    paddingTop: 20,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 30,
    alignItems: "center",
  },
  title: {
    fontSize: 26,
    fontWeight: "600",
    color: COLORS.text,
    marginBottom: 10,
    textAlign: "center",
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 15,
    color: COLORS.textSecondary,
    textAlign: "center",
    lineHeight: 22,
  },
  buttonContainer: {
    marginBottom: 30,
  },
  calendarSection: {
    marginTop: 20,
  },
  calendarTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: COLORS.text,
    marginBottom: 16,
  },
  loadingContainer: {
    padding: 20,
    alignItems: "center",
  },
  calendar: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 30,
  },
  calendarDay: {
    alignItems: "center",
    flex: 1,
  },
  dayName: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: 8,
    fontWeight: "500",
  },
  dayCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: COLORS.backgroundSecondary,
    borderWidth: 2,
    borderColor: COLORS.border,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 6,
    position: "relative",
  },
  todayCircle: {
    borderWidth: 3,
  },
  dayNumber: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.text,
  },
  moodIconContainer: {
    position: "absolute",
    bottom: -10,
    backgroundColor: COLORS.background,
    borderRadius: 12,
    padding: 2,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  energyText: {
    fontSize: 10,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  recentSection: {
    marginTop: 20,
  },
  recentTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: COLORS.text,
    marginBottom: 12,
  },
  entryCard: {
    backgroundColor: COLORS.backgroundSecondary,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  entryHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  entryInfo: {
    flex: 1,
    marginRight: 16,
  },
  entryMoodRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  entryMoodIcon: {
    marginRight: 8,
  },
  entryMood: {
    fontSize: 16,
    fontWeight: "600",
  },
  entryEnergy: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  entryDate: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
  entryActions: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    flexShrink: 0,
    paddingLeft: 8,
    gap: 16,
  },
  deleteButton: {
    marginLeft: 0,
  },
  emptyState: {
    padding: 40,
    alignItems: "center",
  },
  emptyText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: "center",
  },
});
