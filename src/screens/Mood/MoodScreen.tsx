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
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
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

const MOOD_EMOJIS: Record<string, string> = {
  happy: "😊",
  calm: "😌",
  neutral: "😐",
  stressed: "😰",
  sad: "😔",
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

  const getMoodEmoji = (mood: string): string => {
    const moodLower = mood.toLowerCase();
    return MOOD_EMOJIS[moodLower] || "😐";
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
      <StatusBar style="auto" />
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
                      day.mood && styles.dayCircleFilled,
                      index === 6 && styles.todayCircle,
                    ]}
                  >
                    <Text style={styles.dayNumber}>{day.dayNumber}</Text>
                    {day.mood && (
                      <Text style={styles.moodEmoji}>
                        {getMoodEmoji(day.mood.mood)}
                      </Text>
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
                      <Text style={styles.entryMood}>
                        {getMoodEmoji(entry.mood)} {entry.mood}
                      </Text>
                      <Text style={styles.entryEnergy}>
                        Energy: {entry.current_energy}/10
                      </Text>
                      <Text style={styles.entryDate}>
                        {formatDateTime(new Date(entry.timestamp))}
                      </Text>
                    </View>
                    <View style={styles.entryActions}>
                      <TouchableOpacity
                        style={styles.actionButton}
                        onPress={() => handleEditMood(entry)}
                        activeOpacity={0.7}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                      >
                        <Ionicons
                          name="create-outline"
                          size={24}
                          color={COLORS.primary}
                        />
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.actionButton, styles.deleteButton]}
                        onPress={() => handleDeleteMood(entry)}
                        activeOpacity={0.7}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                      >
                        <Ionicons
                          name="trash-outline"
                          size={24}
                          color={COLORS.error}
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 30,
    alignItems: "center",
  },
  title: {
    fontSize: 32,
    fontWeight: "bold",
    color: COLORS.text,
    marginBottom: 12,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.textSecondary,
    textAlign: "center",
    lineHeight: 24,
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
  dayCircleFilled: {
    backgroundColor: COLORS.primary + "15",
    borderColor: COLORS.primary,
  },
  todayCircle: {
    borderWidth: 3,
    borderColor: COLORS.primary,
  },
  dayNumber: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.text,
  },
  moodEmoji: {
    position: "absolute",
    bottom: -8,
    fontSize: 20,
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
  entryMood: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.text,
    marginBottom: 4,
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
  },
  actionButton: {
    borderRadius: 10,
    backgroundColor: "#FFFFFF",
    marginLeft: 8,
    borderWidth: 2,
    borderColor: COLORS.primary,
    width: 50,
    height: 50,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  deleteButton: {
    backgroundColor: "#FEE2E2",
    borderColor: COLORS.error,
    shadowColor: COLORS.error,
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
