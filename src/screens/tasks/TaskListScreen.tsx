import React, {
  useEffect,
  useState,
  useMemo,
  useRef,
  useCallback,
} from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Animated,
  GestureResponderEvent,
  Image,
  Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { StatusBar } from "expo-status-bar";
import { Feather, MaterialIcons } from "@expo/vector-icons";
import { useTasks } from "../../contexts/TaskContext";
import { useAuth } from "../../contexts/AuthContext";
import { COLORS, EMOTIONAL_FRICTION } from "../../constants/config";
import { useRoute, useFocusEffect } from "@react-navigation/native";
import MagicTaskInput, {
  ParsedTaskData,
} from "../../components/MagicTaskInput";
import type { Task, EmotionalFriction } from "../../types";

// Speech recognition setup (same as MagicTaskInput)
let ExpoSpeechRecognitionModule: any = null;
let useSpeechRecognitionEvent: any = null;
let voiceAvailable = false;

try {
  const speechModule = require("expo-speech-recognition");
  ExpoSpeechRecognitionModule = speechModule.ExpoSpeechRecognitionModule;
  useSpeechRecognitionEvent = speechModule.useSpeechRecognitionEvent;
  voiceAvailable =
    ExpoSpeechRecognitionModule != null &&
    typeof ExpoSpeechRecognitionModule.requestPermissionsAsync === "function";
} catch (e) {
  console.log(
    "expo-speech-recognition not available (requires development build)"
  );
}

const { width } = Dimensions.get("window");

// Calendar day type
interface CalendarDay {
  date: Date;
  dayName: string;
  dayNumber: number;
  isToday: boolean;
  isSelected: boolean;
}

// Generate calendar days (10 days: 2 past + today + 7 future)
const generateCalendarDays = (selectedDate: Date): CalendarDay[] => {
  const days: CalendarDay[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const selectedDateNormalized = new Date(selectedDate);
  selectedDateNormalized.setHours(0, 0, 0, 0);

  // Generate 10 days: 2 days before today to 7 days after today
  for (let i = -2; i <= 7; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() + i);
    date.setHours(0, 0, 0, 0);

    days.push({
      date,
      dayName: date.toLocaleDateString("en-US", { weekday: "short" }),
      dayNumber: date.getDate(),
      isToday: date.getTime() === today.getTime(),
      isSelected: date.getTime() === selectedDateNormalized.getTime(),
    });
  }
  return days;
};

// Helper to extract date string (YYYY-MM-DD) from ISO string or Date
const getDateString = (date: Date | string): string => {
  if (typeof date === "string") {
    // If it's an ISO string like "2025-12-22T00:00:00.000Z", extract just the date part
    return date.split("T")[0];
  }
  // For Date objects, use local date parts
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

// Helper to convert Date to ISO string preserving local date (avoids timezone shift)
const toLocalISOString = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  // Return ISO format with midnight UTC to preserve the local date
  return `${year}-${month}-${day}T00:00:00.000Z`;
};

// Parse date from text (handles "tomorrow", "on Sunday", "next Monday", etc.)
const parseDateFromText = (text: string): Date | null => {
  const lowerText = text.toLowerCase();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Check for "today"
  if (lowerText.includes("today")) {
    return today;
  }

  // Check for "tomorrow"
  if (lowerText.includes("tomorrow")) {
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    return tomorrow;
  }

  // Check for "day after tomorrow"
  if (lowerText.includes("day after tomorrow")) {
    const dayAfter = new Date(today);
    dayAfter.setDate(today.getDate() + 2);
    return dayAfter;
  }

  // Day name mapping
  const dayNames: Record<string, number> = {
    sunday: 0,
    sun: 0,
    monday: 1,
    mon: 1,
    tuesday: 2,
    tue: 2,
    tues: 2,
    wednesday: 3,
    wed: 3,
    thursday: 4,
    thu: 4,
    thur: 4,
    thurs: 4,
    friday: 5,
    fri: 5,
    saturday: 6,
    sat: 6,
  };

  // Check for "next [day]" or "on [day]" or "this [day]"
  const dayPatterns = [
    /(?:next|on|this)\s+(sunday|sun|monday|mon|tuesday|tue|tues|wednesday|wed|thursday|thu|thur|thurs|friday|fri|saturday|sat)/i,
    /\b(sunday|monday|tuesday|wednesday|thursday|friday|saturday)\b/i,
  ];

  for (const pattern of dayPatterns) {
    const match = lowerText.match(pattern);
    if (match) {
      const dayName = match[1].toLowerCase();
      const targetDay = dayNames[dayName];
      if (targetDay !== undefined) {
        const currentDay = today.getDay();
        let daysToAdd = targetDay - currentDay;

        // If the day has already passed this week, or it's today, go to next week
        if (daysToAdd <= 0) {
          daysToAdd += 7;
        }

        const targetDate = new Date(today);
        targetDate.setDate(today.getDate() + daysToAdd);
        return targetDate;
      }
    }
  }

  // Check for "in X days"
  const inDaysMatch = lowerText.match(/in\s+(\d+)\s+days?/i);
  if (inDaysMatch) {
    const daysToAdd = parseInt(inDaysMatch[1], 10);
    const targetDate = new Date(today);
    targetDate.setDate(today.getDate() + daysToAdd);
    return targetDate;
  }

  // Check for "next week" (7 days from today)
  if (lowerText.includes("next week")) {
    const nextWeek = new Date(today);
    nextWeek.setDate(today.getDate() + 7);
    return nextWeek;
  }

  return null;
};

// Check if task is on selected date (comparing date strings to avoid timezone issues)
const isTaskOnDate = (task: Task, date: Date): boolean => {
  const selectedDateStr = getDateString(date);

  // If task has a due_date, use it for comparison
  if (task.due_date) {
    const taskDateStr = getDateString(task.due_date);
    return taskDateStr === selectedDateStr;
  }

  // Tasks without due_date: show on the day they were created
  if (task.created_at) {
    const createdDateStr = getDateString(task.created_at);
    return createdDateStr === selectedDateStr;
  }

  // Fallback: show on today
  const todayStr = getDateString(new Date());
  return todayStr === selectedDateStr;
};

// Check if a date has any tasks (including completed ones)
const dateHasTasks = (tasks: Task[], date: Date): boolean => {
  return tasks.some((task) => isTaskOnDate(task, date));
};

// Generate full month calendar data
const generateMonthCalendar = (viewDate: Date): Date[][] => {
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();

  // First day of the month
  const firstDay = new Date(year, month, 1);
  // Last day of the month
  const lastDay = new Date(year, month + 1, 0);

  // Start from the Sunday of the week containing the first day
  const startDate = new Date(firstDay);
  startDate.setDate(firstDay.getDate() - firstDay.getDay());

  // Generate 6 weeks (42 days) to cover all possible month layouts
  const weeks: Date[][] = [];
  const currentDate = new Date(startDate);

  for (let week = 0; week < 6; week++) {
    const weekDays: Date[] = [];
    for (let day = 0; day < 7; day++) {
      weekDays.push(new Date(currentDate));
      currentDate.setDate(currentDate.getDate() + 1);
    }
    weeks.push(weekDays);
  }

  return weeks;
};

const frictionColors: Record<string, string> = {
  Low: COLORS.success,
  Medium: "#f59e0b",
  High: COLORS.error,
};

// Core values that can be associated with tasks
const CORE_VALUE_OPTIONS = [
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

// Motivation scale with 5 levels
type MotivationLevel = 0 | 1 | 2 | 3 | 4;

interface MotivationPoint {
  level: MotivationLevel;
  label: string;
  shortLabel: string;
  title: string;
  description: string;
  color: string;
  bgColor: string;
  energyCost: number;
}

const MOTIVATION_POINTS: MotivationPoint[] = [
  {
    level: 0,
    label: "Not Motivated",
    shortLabel: "Low",
    title: "Gentle Start Needed",
    description:
      "Like wading through stardust — take it one sparkle at a time.",
    color: "#EC4899",
    bgColor: "#FDF2F8",
    energyCost: 9,
  },
  {
    level: 1,
    label: "Low Energy",
    shortLabel: "",
    title: "Easing Into It",
    description: "A soft breeze of effort — small steps lead to big journeys.",
    color: "#D946EF",
    bgColor: "#FDF4FF",
    energyCost: 7,
  },
  {
    level: 2,
    label: "Neutral",
    shortLabel: "Neutral",
    title: "Floating Along",
    description: "Somewhere between a yawn and a smile — perfectly balanced.",
    color: "#A855F7",
    bgColor: "#FAF5FF",
    energyCost: 5,
  },
  {
    level: 3,
    label: "Energized",
    shortLabel: "",
    title: "Gaining Momentum",
    description: "Your inner spark is catching — ride the wave of motivation!",
    color: "#8B5CF6",
    bgColor: "#F5F3FF",
    energyCost: 3,
  },
  {
    level: 4,
    label: "Highly Motivated",
    shortLabel: "High",
    title: "Sparks Are Flying!",
    description:
      "Your energy is radiating! Channel that magic into accomplishment.",
    color: "#7C3AED",
    bgColor: "#EDE9FE",
    energyCost: 1,
  },
];

// Convert energy cost (1-10) to motivation level (0-4)
const energyCostToMotivation = (cost: number): MotivationLevel => {
  if (cost >= 8) return 0;
  if (cost >= 6) return 1;
  if (cost >= 4) return 2;
  if (cost >= 2) return 3;
  return 4;
};

// Difficulty scale with 5 levels
type DifficultyLevel = 0 | 1 | 2 | 3 | 4;

interface DifficultyPoint {
  level: DifficultyLevel;
  label: string;
  shortLabel: string;
  title: string;
  description: string;
  color: string;
  bgColor: string;
  frictionValue: EmotionalFriction;
}

const DIFFICULTY_POINTS: DifficultyPoint[] = [
  {
    level: 0,
    label: "Very Easy",
    shortLabel: "Easy",
    title: "Smooth Sailing",
    description:
      "Like a gentle breeze — this task flows naturally without resistance.",
    color: "#7C3AED",
    bgColor: "#EDE9FE",
    frictionValue: "Low",
  },
  {
    level: 1,
    label: "Easy",
    shortLabel: "",
    title: "Light Touch",
    description: "A small pebble in the stream — easily navigated with grace.",
    color: "#8B5CF6",
    bgColor: "#F5F3FF",
    frictionValue: "Low",
  },
  {
    level: 2,
    label: "Moderate",
    shortLabel: "Moderate",
    title: "Balanced Challenge",
    description:
      "A mindful climb — requires focus but brings rewarding progress.",
    color: "#A855F7",
    bgColor: "#FAF5FF",
    frictionValue: "Medium",
  },
  {
    level: 3,
    label: "Challenging",
    shortLabel: "",
    title: "Rising Heat",
    description: "Pushing through resistance — each step builds your strength.",
    color: "#D946EF",
    bgColor: "#FDF4FF",
    frictionValue: "High",
  },
  {
    level: 4,
    label: "Very Difficult",
    shortLabel: "Difficult",
    title: "Mountain to Climb",
    description:
      "A significant challenge — break it down and conquer piece by piece.",
    color: "#EC4899",
    bgColor: "#FDF2F8",
    frictionValue: "High",
  },
];

// Convert EmotionalFriction to difficulty level
const frictionToDifficulty = (friction: EmotionalFriction): DifficultyLevel => {
  switch (friction) {
    case "Low":
      return 0;
    case "Medium":
      return 2;
    case "High":
      return 4;
    default:
      return 2;
  }
};

// Simple Button-Based Motivation Selector (matches Home page style)
const MotivationSlider = ({
  value,
  onValueChange,
}: {
  value: MotivationLevel;
  onValueChange: (level: MotivationLevel) => void;
}) => {
  const currentPoint = MOTIVATION_POINTS[value];

  return (
    <View style={simpleSliderStyles.container}>
      <Text style={simpleSliderStyles.currentValue}>
        {currentPoint.shortLabel}
      </Text>
      <View style={simpleSliderStyles.buttonRow}>
        {[0, 1, 2, 3, 4].map((level) => (
          <TouchableOpacity
            key={level}
            style={[
              simpleSliderStyles.button,
              value === level && simpleSliderStyles.buttonActive,
            ]}
            onPress={() => onValueChange(level as MotivationLevel)}
          >
            <Text
              style={[
                simpleSliderStyles.buttonText,
                value === level && simpleSliderStyles.buttonTextActive,
              ]}
            >
              {level + 1}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      <View style={simpleSliderStyles.labels}>
        <Text style={simpleSliderStyles.labelText}>Low</Text>
        <Text style={simpleSliderStyles.labelText}>High</Text>
      </View>
    </View>
  );
};

// Simple Button-Based Difficulty Selector (matches Home page style)
const DifficultySlider = ({
  value,
  onValueChange,
}: {
  value: DifficultyLevel;
  onValueChange: (level: DifficultyLevel) => void;
}) => {
  const currentPoint = DIFFICULTY_POINTS[value];

  return (
    <View style={simpleSliderStyles.container}>
      <Text style={simpleSliderStyles.currentValue}>
        {currentPoint.shortLabel}
      </Text>
      <View style={simpleSliderStyles.buttonRow}>
        {[0, 1, 2, 3, 4].map((level) => (
          <TouchableOpacity
            key={level}
            style={[
              simpleSliderStyles.button,
              value === level && simpleSliderStyles.buttonActive,
            ]}
            onPress={() => onValueChange(level as DifficultyLevel)}
          >
            <Text
              style={[
                simpleSliderStyles.buttonText,
                value === level && simpleSliderStyles.buttonTextActive,
              ]}
            >
              {level + 1}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      <View style={simpleSliderStyles.labels}>
        <Text style={simpleSliderStyles.labelText}>Easy</Text>
        <Text style={simpleSliderStyles.labelText}>Hard</Text>
      </View>
    </View>
  );
};

// Simple slider styles (matching Home page popup)
const simpleSliderStyles = StyleSheet.create({
  container: {
    marginTop: 8,
    marginBottom: 12,
  },
  currentValue: {
    fontSize: 13,
    fontWeight: "600",
    color: "#7a4d84",
    textAlign: "center",
    marginBottom: 8,
  },
  buttonRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 8,
  },
  button: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: "rgba(240, 235, 245, 0.9)",
    borderWidth: 1.5,
    borderColor: "rgba(82, 40, 97, 0.15)",
    alignItems: "center",
  },
  buttonActive: {
    backgroundColor: "#522861",
    borderColor: "#522861",
  },
  buttonText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#522861",
  },
  buttonTextActive: {
    color: "#fff",
  },
  labels: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 6,
  },
  labelText: {
    fontSize: 11,
    color: "#9ca3af",
  },
});

// Feeling Modal Styles
// Animated Mood Image Button Component - matching home page design
const AnimatedMoodImageButton = ({
  mood,
  isSelected,
  onPress,
}: {
  mood: { id: string; image: any; label: string; color: string };
  isSelected: boolean;
  onPress: () => void;
}) => {
  const scaleAnim = useRef(new Animated.Value(isSelected ? 1.2 : 1)).current;
  const opacityAnim = useRef(new Animated.Value(isSelected ? 1 : 0.35)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: isSelected ? 1.2 : 1,
        friction: 5,
        tension: 120,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: isSelected ? 1 : 0.35,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();
  }, [isSelected]);

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.95,
      friction: 8,
      tension: 200,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: isSelected ? 1.2 : 1,
      friction: 5,
      tension: 120,
      useNativeDriver: true,
    }).start();
  };

  return (
    <TouchableOpacity
      style={feelingStyles.emojiButton}
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      activeOpacity={1}
    >
      {/* Glow effect behind selected icon */}
      {isSelected && <View style={feelingStyles.glowEffect} />}
      <Animated.View
        style={[
          feelingStyles.emojiCircle,
          {
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        <Animated.Image
          source={mood.image}
          style={[feelingStyles.moodImage, { opacity: opacityAnim }]}
          resizeMode="contain"
        />
      </Animated.View>
      <Text
        style={[
          feelingStyles.moodLabel,
          isSelected && feelingStyles.moodLabelActive,
        ]}
        numberOfLines={1}
      >
        {mood.label}
      </Text>
    </TouchableOpacity>
  );
};

// Mood Image Selector Component - matching home page design
const MoodImageSelector = ({
  moods,
  selectedMood,
  onSelect,
}: {
  moods: Array<{
    id: string;
    image: any;
    label: string;
    color: string;
  }>;
  selectedMood: string | null;
  onSelect: (id: string) => void;
}) => {
  return (
    <View style={feelingStyles.moodContainer}>
      {/* Mood Image Buttons with connecting lines */}
      <View style={feelingStyles.emojisRow}>
        {moods.map((mood, index) => (
          <React.Fragment key={mood.id}>
            <AnimatedMoodImageButton
              mood={mood}
              isSelected={selectedMood === mood.id}
              onPress={() => onSelect(mood.id)}
            />
            {/* Connecting line between icons */}
            {index < moods.length - 1 && (
              <View style={feelingStyles.connectorLine} />
            )}
          </React.Fragment>
        ))}
      </View>
    </View>
  );
};

const feelingStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
  },
  overlayTouchable: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  modalContentWrapper: {
    width: "100%",
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  container: {
    backgroundColor: COLORS.background,
    borderRadius: 24,
    padding: 24,
    width: "100%",
    maxWidth: 400,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  header: {
    alignItems: "center",
    marginBottom: 24,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    color: "#522861",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: "#7a4d84",
    textAlign: "center",
    fontStyle: "italic",
  },
  // Mood selector styles - matching home page design
  moodContainer: {
    paddingVertical: 12,
    paddingHorizontal: 4,
    marginBottom: 20,
  },
  emojisRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "flex-start",
  },
  connectorLine: {
    height: 2,
    backgroundColor: COLORS.primary + "30",
    flex: 1,
    marginTop: 37.5,
    marginHorizontal: -4,
    borderRadius: 1,
  },
  emojiButton: {
    alignItems: "center",
    minWidth: 75,
    paddingTop: 2,
  },
  glowEffect: {
    position: "absolute",
    top: 0,
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.primary,
    opacity: 0.15,
  },
  emojiCircle: {
    width: 75,
    height: 75,
    borderRadius: 37.5,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "transparent",
  },
  moodImage: {
    width: 70,
    height: 70,
  },
  moodLabel: {
    fontSize: 11,
    color: "#9CA3AF",
    marginTop: 6,
    fontWeight: "500",
    letterSpacing: 0.2,
    textAlign: "center",
  },
  moodLabelActive: {
    color: "#522861",
    fontWeight: "700",
    fontSize: 11,
  },
  descriptionContainer: {
    marginBottom: 20,
  },
  descriptionLabelContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  descriptionLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#522861",
    flex: 1,
  },
  descriptionInputWrapper: {
    position: "relative",
  },
  descriptionInput: {
    backgroundColor: "rgba(240, 235, 245, 0.8)",
    borderRadius: 14,
    padding: 14,
    fontSize: 15,
    color: "#3d1e49",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.6)",
    minHeight: 80,
    textAlignVertical: "top",
  },
  listeningIndicator: {
    position: "absolute",
    top: 14,
    left: 14,
    backgroundColor: "rgba(82, 40, 97, 0.1)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    zIndex: 1,
  },
  listeningText: {
    fontSize: 12,
    color: "#522861",
    fontWeight: "600",
  },
  voiceButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(82, 40, 97, 0.1)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(82, 40, 97, 0.2)",
  },
  voiceButtonActive: {
    backgroundColor: "#522861",
    borderColor: "#522861",
  },
  voiceButtonDisabled: {
    opacity: 0.5,
  },
  actions: {
    flexDirection: "row",
    gap: 12,
  },
  manualButton: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 14,
    backgroundColor: "rgba(82, 40, 97, 0.08)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: "rgba(82, 40, 97, 0.2)",
  },
  manualButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#522861",
  },
  continueButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: "#522861",
    alignItems: "center",
  },
  continueButtonDisabled: {
    opacity: 0.5,
  },
  continueButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
  },
  aiPreview: {
    backgroundColor: "rgba(82, 40, 97, 0.08)",
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "rgba(82, 40, 97, 0.15)",
  },
  aiPreviewTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: "#522861",
    marginBottom: 10,
  },
  aiPreviewRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  aiPreviewLabel: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  aiPreviewValue: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.text,
  },
});

export default function TaskListScreen() {
  const { signOut } = useAuth();
  const route = useRoute();
  const {
    tasks,
    isLoading,
    error,
    fetchTasks,
    completeTask,
    deleteTask,
    createTask,
  } = useTasks();
  const [refreshing, setRefreshing] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());

  // Handle logout
  const handleLogout = () => {
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

  // Form state
  const [title, setTitle] = useState("");
  const [motivation, setMotivation] = useState<MotivationLevel>(2);
  const [difficulty, setDifficulty] = useState<DifficultyLevel>(2);
  const [associatedValues, setAssociatedValues] = useState<string[]>([]);
  const [dueDate, setDueDate] = useState<Date | null>(null);
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [isAIParsed, setIsAIParsed] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  // Feeling popup state
  const [showFeelingModal, setShowFeelingModal] = useState(false);
  const [taskFeeling, setTaskFeeling] = useState<string | null>(null);
  const [feelingDescription, setFeelingDescription] = useState("");
  const [pendingParsedData, setPendingParsedData] =
    useState<ParsedTaskData | null>(null);
  const [isListeningFeeling, setIsListeningFeeling] = useState(false);
  const [feelingTranscript, setFeelingTranscript] = useState("");
  const feelingPulseAnim = useRef(new Animated.Value(1)).current;

  // Full calendar popup state
  const [showCalendarModal, setShowCalendarModal] = useState(false);
  const [calendarViewDate, setCalendarViewDate] = useState(new Date());
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  // Calendar strip scroll ref
  const calendarScrollRef = useRef<ScrollView>(null);

  // Calendar days
  const calendarDays = useMemo(
    () => generateCalendarDays(selectedDate),
    [selectedDate]
  );

  // Filtered tasks for selected date - includes both completed and non-completed tasks
  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => isTaskOnDate(task, selectedDate));
  }, [tasks, selectedDate]);

  useEffect(() => {
    fetchTasks(true); // Include completed tasks
  }, [fetchTasks]);

  // Check for navigation params to open modal
  useFocusEffect(
    useCallback(() => {
      const params = route.params as { openModal?: boolean } | undefined;
      if (params?.openModal) {
        setShowModal(true);
        // Clear the param to prevent reopening on subsequent focuses
        if (route.params) {
          (route.params as any).openModal = false;
        }
      }
    }, [route.params])
  );

  const resetForm = () => {
    setTitle("");
    setMotivation(2);
    setDifficulty(2);
    setAssociatedValues([]);
    setDueDate(null);
    setFormError(null);
    setIsAIParsed(false);
    setEditingTask(null);
    setTaskFeeling(null);
    setFeelingDescription("");
    setPendingParsedData(null);
  };

  // Toggle a value in the associated values array
  const toggleAssociatedValue = (value: string) => {
    setAssociatedValues((prev) =>
      prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]
    );
  };

  const handleEdit = (task: Task) => {
    setEditingTask(task);
    setTitle(task.title);
    setMotivation(energyCostToMotivation(task.energy_cost));
    setDifficulty(frictionToDifficulty(task.emotional_friction));
    // Handle associated_value as string or array
    const values = task.associated_value
      ? task.associated_value
          .split(",")
          .map((v) => v.trim())
          .filter(Boolean)
      : [];
    setAssociatedValues(values);
    setDueDate(task.due_date ? new Date(task.due_date) : null);
    setFormError(null);
    setIsAIParsed(false);
    setShowModal(true);
  };

  // Handle AI-parsed task data from MagicTaskInput
  const handleMagicTaskParsed = (data: ParsedTaskData) => {
    // Store parsed data and show feeling popup first
    setPendingParsedData(data);
    setTaskFeeling(null);
    setFeelingDescription("");
    setShowFeelingModal(true);
  };

  // Feeling options with AI-determined motivation and difficulty mappings
  // Matching the moods from the home page (ConsultationScreen) with both emojis and images
  // motivation: 0=Not Motivated, 4=Highly Motivated
  // difficulty: 0=Easy, 4=Difficult
  const FEELING_OPTIONS = [
    {
      id: "great",
      image: require("../../../assets/great.png"),
      label: "Great",
      color: "#10B981",
      motivation: 4 as MotivationLevel,
      difficulty: 0 as DifficultyLevel,
    },
    {
      id: "good",
      image: require("../../../assets/good.png"),
      label: "Good",
      color: "#22C55E",
      motivation: 3 as MotivationLevel,
      difficulty: 1 as DifficultyLevel,
    },
    {
      id: "okay",
      image: require("../../../assets/okey.png"),
      label: "Okay",
      color: "#EAB308",
      motivation: 2 as MotivationLevel,
      difficulty: 2 as DifficultyLevel,
    },
    {
      id: "bad",
      image: require("../../../assets/bad.png"),
      label: "Bad",
      color: "#F97316",
      motivation: 1 as MotivationLevel,
      difficulty: 3 as DifficultyLevel,
    },
    {
      id: "terrible",
      image: require("../../../assets/terrible.png"),
      label: "Terrible",
      color: "#EF4444",
      motivation: 0 as MotivationLevel,
      difficulty: 4 as DifficultyLevel,
    },
  ];

  // State for feeling submission loading
  const [feelingLoading, setFeelingLoading] = useState(false);

  // Handle feeling selection and create task directly with AI-determined values
  const handleFeelingSubmit = async () => {
    if (!pendingParsedData || !taskFeeling) return;

    // Find the selected feeling option
    const selectedFeeling = FEELING_OPTIONS.find(
      (opt) => opt.id === taskFeeling
    );
    if (!selectedFeeling) return;

    setFeelingLoading(true);

    try {
      // Get motivation and difficulty from the feeling
      const motivationLevel = selectedFeeling.motivation;
      const difficultyLevel = selectedFeeling.difficulty;
      const energyCost = MOTIVATION_POINTS[motivationLevel].energyCost;
      const emotionalFriction =
        DIFFICULTY_POINTS[difficultyLevel].frictionValue;

      // Parse date from original text using frontend parser (more reliable)
      // Priority: 1) Frontend-parsed date from text, 2) Backend-parsed date, 3) Selected calendar date
      let taskDueDate: string;
      const frontendParsedDate = pendingParsedData.originalText
        ? parseDateFromText(pendingParsedData.originalText)
        : null;

      if (frontendParsedDate) {
        taskDueDate = toLocalISOString(frontendParsedDate);
      } else if (pendingParsedData.due_date) {
        taskDueDate = pendingParsedData.due_date;
      } else {
        taskDueDate = toLocalISOString(selectedDate);
      }

      // Create task directly with AI-determined values
      await createTask({
        title: pendingParsedData.title,
        energy_cost: energyCost,
        emotional_friction: emotionalFriction,
        due_date: taskDueDate,
        user_feeling: selectedFeeling.label,
        feeling_description: feelingDescription.trim() || undefined,
      });

      // Reset and close
      resetForm();
      setShowFeelingModal(false);

      // Show success feedback
      Alert.alert(
        "✨ Task Added!",
        `"${pendingParsedData.title}" has been added based on how you feel.`,
        [{ text: "OK" }]
      );
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to create task");
    } finally {
      setFeelingLoading(false);
    }
  };

  // Voice input for feeling description (same as MagicTaskInput)
  useEffect(() => {
    if (!useSpeechRecognitionEvent) return;

    useSpeechRecognitionEvent("result", (event: any) => {
      if (!isListeningFeeling) return;
      const newTranscript = event.results?.[0]?.transcript || "";
      setFeelingTranscript(newTranscript);
      if (event.isFinal) {
        setFeelingDescription(newTranscript);
        setIsListeningFeeling(false);
      }
    });

    useSpeechRecognitionEvent("end", () => {
      setIsListeningFeeling(false);
    });

    useSpeechRecognitionEvent("error", (event: any) => {
      console.error("Speech error:", event);
      setIsListeningFeeling(false);
      Alert.alert("Voice recognition error", "Failed to process voice input");
    });
  }, [isListeningFeeling]);

  // Pulse animation for mic button when listening
  useEffect(() => {
    if (isListeningFeeling) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(feelingPulseAnim, {
            toValue: 1.2,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.timing(feelingPulseAnim, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      feelingPulseAnim.setValue(1);
    }
  }, [isListeningFeeling]);

  const startListeningFeeling = async () => {
    if (!voiceAvailable) {
      Alert.alert(
        "Voice Not Available",
        "Voice input requires a development build.\n\nTo enable:\n1. Run: npx expo run:android\n\nFor now, type your description instead."
      );
      return;
    }

    try {
      const result =
        await ExpoSpeechRecognitionModule.requestPermissionsAsync();
      if (!result.granted) {
        Alert.alert(
          "Permission Denied",
          "Microphone permission is required for voice input"
        );
        return;
      }

      setIsListeningFeeling(true);
      setFeelingTranscript("");

      ExpoSpeechRecognitionModule.start({
        lang: "en-US",
        interimResults: true,
        maxAlternatives: 1,
      });
    } catch (error: any) {
      console.error("Speech recognition error:", error);
      setIsListeningFeeling(false);
      Alert.alert("Error", "Failed to start voice recognition");
    }
  };

  const stopListeningFeeling = () => {
    if (ExpoSpeechRecognitionModule) {
      ExpoSpeechRecognitionModule.stop();
    }
    setIsListeningFeeling(false);

    // Use transcript if available
    if (feelingTranscript) {
      setFeelingDescription(feelingTranscript);
    }
  };

  // Skip feeling popup and go directly to form for manual input
  const handleSkipFeeling = () => {
    if (!pendingParsedData) return;

    setTitle(pendingParsedData.title);
    setMotivation(energyCostToMotivation(pendingParsedData.energy_cost));
    setDifficulty(frictionToDifficulty(pendingParsedData.emotional_friction));
    setAssociatedValues([]);

    // Parse date from original text using frontend parser (more reliable)
    // Priority: 1) Frontend-parsed date from text, 2) Backend-parsed date, 3) Selected calendar date
    const frontendParsedDate = pendingParsedData.originalText
      ? parseDateFromText(pendingParsedData.originalText)
      : null;

    if (frontendParsedDate) {
      setDueDate(frontendParsedDate);
    } else if (pendingParsedData.due_date) {
      setDueDate(new Date(pendingParsedData.due_date));
    } else {
      // Use selected calendar date as fallback
      setDueDate(selectedDate);
    }

    setTaskFeeling(null);
    setFeelingDescription("");
    setFormError(null);
    setIsAIParsed(true);
    setShowFeelingModal(false);
    setShowModal(true);
  };

  const handleMagicError = (error: string) => {
    Alert.alert("Magic Input Error", error);
  };

  const handleCreateTask = async () => {
    if (!title.trim()) {
      setFormError("Please enter a task title");
      return;
    }

    // Get energy cost from motivation level
    const energyCost = MOTIVATION_POINTS[motivation].energyCost;

    setFormError(null);
    setFormLoading(true);

    try {
      await createTask({
        title: title.trim(),
        energy_cost: energyCost,
        emotional_friction: DIFFICULTY_POINTS[difficulty].frictionValue,
        associated_value:
          associatedValues.length > 0 ? associatedValues.join(", ") : undefined,
        due_date: dueDate ? toLocalISOString(dueDate) : undefined,
        user_feeling: taskFeeling || undefined,
        feeling_description: feelingDescription.trim() || undefined,
      });
      resetForm();
      setShowModal(false);
    } catch (err: any) {
      setFormError(err.message || "Failed to create task");
    } finally {
      setFormLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchTasks(true); // Include completed tasks
    setRefreshing(false);
  };

  const handleComplete = async (task: Task) => {
    try {
      await completeTask(task._id);
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to complete task");
    }
  };

  const handleDelete = (task: Task) => {
    Alert.alert(
      "Delete Task",
      `Are you sure you want to delete "${task.title}"?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteTask(task._id);
            } catch (err: any) {
              Alert.alert("Error", err.message || "Failed to delete task");
            }
          },
        },
      ]
    );
  };

  const renderItem = ({ item }: { item: Task }) => (
    <View style={styles.taskItem}>
      {/* Checkbox - marks task as done */}
      <TouchableOpacity
        style={styles.taskCheckbox}
        onPress={() => handleComplete(item)}
        activeOpacity={0.7}
      >
        {item.is_completed ? (
          <Feather name="check-circle" size={22} color="#4CAF50" />
        ) : (
          <Feather name="circle" size={22} color="#522861" />
        )}
      </TouchableOpacity>
      {/* Task content - opens edit modal */}
      <TouchableOpacity
        style={styles.taskContentTouchable}
        onPress={() => handleEdit(item)}
        activeOpacity={0.7}
      >
        <View style={styles.taskContent}>
          <Text
            style={[
              styles.taskTitle,
              item.is_completed && styles.taskTitleCompleted,
            ]}
            numberOfLines={1}
          >
            {item.title}
          </Text>
          <View style={styles.taskMeta}>
            <View
              style={[
                styles.taskEnergy,
                {
                  backgroundColor:
                    item.energy_cost <= 3
                      ? "#E8F5E9"
                      : item.energy_cost <= 6
                      ? "#FFF3E0"
                      : "#FFEBEE",
                },
              ]}
            >
              <Text
                style={[
                  styles.taskEnergyText,
                  {
                    color:
                      item.energy_cost <= 3
                        ? "#4CAF50"
                        : item.energy_cost <= 6
                        ? "#FF9800"
                        : "#F44336",
                  },
                ]}
              >
                ⚡ {item.energy_cost}
              </Text>
            </View>
            <Text style={styles.taskFriction}>{item.emotional_friction}</Text>
            {item.associated_value && (
              <Text style={styles.taskAssociatedValue}>
                {item.associated_value}
              </Text>
            )}
          </View>
        </View>
      </TouchableOpacity>
      {/* Edit and Delete buttons */}
      <View style={styles.taskActions}>
        <TouchableOpacity
          style={styles.taskEditButton}
          onPress={() => handleEdit(item)}
          activeOpacity={0.7}
        >
          <Feather name="edit-2" size={16} color="#522861" />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.taskDeleteButton}
          onPress={() => handleDelete(item)}
          activeOpacity={0.7}
        >
          <Text style={styles.taskDeleteButtonText}>×</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  if (isLoading && tasks.length === 0) {
    return (
      <SafeAreaView style={styles.centered} edges={["top"]}>
        <StatusBar style="dark" />
        <ActivityIndicator size="large" color="#522861" />
      </SafeAreaView>
    );
  }

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

      {/* Header with Title and Add Button */}
      <View style={styles.appHeader}>
        <View style={styles.headerLeft}>
          <Text style={styles.headerTitle}>Your Tasks</Text>
          <Text style={styles.headerSubtitle}>
            {filteredTasks.filter((t) => !t.is_completed).length} remaining,{" "}
            {filteredTasks.filter((t) => t.is_completed).length} done for{" "}
            {selectedDate.toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
            })}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.headerAddButton}
          onPress={() => {
            resetForm();
            setDueDate(selectedDate);
            setShowModal(true);
          }}
          activeOpacity={0.7}
        >
          <LinearGradient
            colors={["rgba(82, 40, 97, 0.15)", "rgba(122, 77, 132, 0.1)"]}
            style={styles.headerAddButtonGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Feather name="plus" size={18} color="#522861" />
          </LinearGradient>
        </TouchableOpacity>
      </View>

      {/* Calendar Strip */}
      <View style={styles.calendarContainer}>
        <View style={styles.calendarHeader}>
          <Text style={styles.calendarMonthText}>
            {selectedDate.toLocaleDateString("en-US", {
              month: "long",
              year: "numeric",
            })}
          </Text>
          <TouchableOpacity
            style={styles.calendarExpandButton}
            onPress={() => {
              setCalendarViewDate(selectedDate);
              setShowCalendarModal(true);
            }}
            activeOpacity={0.7}
          >
            <Feather name="calendar" size={16} color="#522861" />
          </TouchableOpacity>
        </View>
        <ScrollView
          ref={calendarScrollRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.calendarContent}
        >
          {calendarDays.map((day, index) => (
            <TouchableOpacity
              key={index}
              style={[
                styles.calendarDay,
                day.isSelected && styles.calendarDaySelected,
                day.isToday && !day.isSelected && styles.calendarDayToday,
              ]}
              onPress={() => setSelectedDate(day.date)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.calendarDayName,
                  day.isSelected && styles.calendarDayNameSelected,
                ]}
              >
                {day.dayName}
              </Text>
              <Text
                style={[
                  styles.calendarDayNumber,
                  day.isSelected && styles.calendarDayNumberSelected,
                  day.isToday &&
                    !day.isSelected &&
                    styles.calendarDayNumberToday,
                ]}
              >
                {day.dayNumber}
              </Text>
              {dateHasTasks(tasks, day.date) && (
                <View
                  style={[
                    styles.calendarDot,
                    day.isSelected && styles.calendarDotSelected,
                  ]}
                />
              )}
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Magic Task Input - AI-powered voice/text task creation */}
      <View style={styles.magicInputSection}>
        <Text style={styles.magicInputTitle}>Add your task using SIMI</Text>
        <MagicTaskInput
          onTaskParsed={handleMagicTaskParsed}
          onError={handleMagicError}
          placeholder="Describe your task... e.g., 'Call mom tomorrow, it's emotionally hard'"
        />
      </View>

      {/* Tasks List - Scrollable */}
      {error ? (
        <View style={styles.centered}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : filteredTasks.length === 0 ? (
        <View style={styles.empty}>
          <Feather name="calendar" size={32} color={COLORS.textMuted} />
          <Text style={styles.emptyText}>No tasks for this day</Text>
          <Text style={styles.emptySubtext}>
            Tap "+ Add" to create a task for{" "}
            {selectedDate.toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
            })}
          </Text>
        </View>
      ) : (
        <ScrollView
          style={styles.tasksScrollView}
          contentContainerStyle={styles.tasksScrollContent}
          showsVerticalScrollIndicator={true}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#522861"
            />
          }
        >
          <View style={styles.list}>
            {filteredTasks.map((item) => (
              <View key={item._id}>{renderItem({ item })}</View>
            ))}
          </View>
        </ScrollView>
      )}

      {/* Feeling Popup Modal */}
      <Modal
        visible={showFeelingModal}
        animationType="fade"
        transparent
        onRequestClose={() => {
          setShowFeelingModal(false);
          setTaskFeeling(null);
          setFeelingDescription("");
        }}
      >
        <KeyboardAvoidingView
          style={feelingStyles.overlay}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <TouchableOpacity
            activeOpacity={1}
            style={feelingStyles.overlayTouchable}
            onPress={() => {
              setShowFeelingModal(false);
              setTaskFeeling(null);
              setFeelingDescription("");
            }}
          >
            <View
              style={feelingStyles.modalContentWrapper}
              onStartShouldSetResponder={() => true}
            >
              <ScrollView
                contentContainerStyle={feelingStyles.scrollContent}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
              >
                <View style={feelingStyles.container}>
                  <View style={feelingStyles.header}>
                    <Text style={feelingStyles.title}>
                      How Do You Feel About It?
                    </Text>
                  </View>

                  {/* Feeling Options - Matching home page design */}
                  <MoodImageSelector
                    moods={FEELING_OPTIONS}
                    selectedMood={taskFeeling}
                    onSelect={setTaskFeeling}
                  />

                  {/* AI-Determined Values Preview */}
                  {taskFeeling && (
                    <View style={feelingStyles.aiPreview}>
                      <Text style={feelingStyles.aiPreviewTitle}>
                        🤖 AI will set based on your feeling:
                      </Text>
                      <View style={feelingStyles.aiPreviewRow}>
                        <Text style={feelingStyles.aiPreviewLabel}>
                          Motivation:
                        </Text>
                        <Text style={feelingStyles.aiPreviewValue}>
                          {
                            MOTIVATION_POINTS[
                              FEELING_OPTIONS.find((o) => o.id === taskFeeling)
                                ?.motivation || 2
                            ].title
                          }
                        </Text>
                      </View>
                      <View style={feelingStyles.aiPreviewRow}>
                        <Text style={feelingStyles.aiPreviewLabel}>
                          Difficulty:
                        </Text>
                        <Text style={feelingStyles.aiPreviewValue}>
                          {
                            DIFFICULTY_POINTS[
                              FEELING_OPTIONS.find((o) => o.id === taskFeeling)
                                ?.difficulty || 2
                            ].title
                          }
                        </Text>
                      </View>
                    </View>
                  )}

                  {/* Description Input */}
                  <View style={feelingStyles.descriptionContainer}>
                    <View style={feelingStyles.descriptionLabelContainer}>
                      <Text style={feelingStyles.descriptionLabel}>
                        Tell us more (optional)
                      </Text>
                      <Animated.View
                        style={{ transform: [{ scale: feelingPulseAnim }] }}
                      >
                        <TouchableOpacity
                          style={[
                            feelingStyles.voiceButton,
                            isListeningFeeling &&
                              feelingStyles.voiceButtonActive,
                            !voiceAvailable &&
                              feelingStyles.voiceButtonDisabled,
                          ]}
                          onPress={
                            isListeningFeeling
                              ? stopListeningFeeling
                              : startListeningFeeling
                          }
                          disabled={feelingLoading}
                          activeOpacity={0.7}
                        >
                          <MaterialIcons
                            name={isListeningFeeling ? "mic" : "mic-none"}
                            size={18}
                            color={
                              isListeningFeeling
                                ? "#fff"
                                : voiceAvailable
                                ? "#522861"
                                : COLORS.textMuted
                            }
                          />
                        </TouchableOpacity>
                      </Animated.View>
                    </View>
                    <View style={feelingStyles.descriptionInputWrapper}>
                      <TextInput
                        style={feelingStyles.descriptionInput}
                        placeholder="Why do you feel this way about the task?"
                        placeholderTextColor={COLORS.textMuted}
                        value={
                          isListeningFeeling && feelingTranscript
                            ? feelingTranscript
                            : feelingDescription
                        }
                        onChangeText={setFeelingDescription}
                        multiline
                        numberOfLines={3}
                        editable={!feelingLoading && !isListeningFeeling}
                      />
                      {isListeningFeeling && (
                        <View style={feelingStyles.listeningIndicator}>
                          <Text style={feelingStyles.listeningText}>
                            Listening...
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>

                  {/* Action Buttons */}
                  <View style={feelingStyles.actions}>
                    <TouchableOpacity
                      style={feelingStyles.manualButton}
                      onPress={handleSkipFeeling}
                      disabled={feelingLoading}
                      activeOpacity={0.7}
                    >
                      <Text style={feelingStyles.manualButtonText}>
                        Manually Edit
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        feelingStyles.continueButton,
                        (!taskFeeling || feelingLoading) &&
                          feelingStyles.continueButtonDisabled,
                      ]}
                      onPress={handleFeelingSubmit}
                      disabled={!taskFeeling || feelingLoading}
                    >
                      {feelingLoading ? (
                        <ActivityIndicator color="#fff" size="small" />
                      ) : (
                        <Text style={feelingStyles.continueButtonText}>
                          ✨ Add Task
                        </Text>
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
              </ScrollView>
            </View>
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </Modal>

      {/* Create Task Modal */}
      <Modal
        visible={showModal}
        animationType="slide"
        transparent
        onRequestClose={() => {
          setShowModal(false);
          resetForm();
        }}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <TouchableOpacity
            activeOpacity={1}
            style={styles.modalOverlayTouchable}
            onPress={() => {
              setShowModal(false);
              resetForm();
            }}
          >
            <View
              style={styles.modalContentWrapper}
              onStartShouldSetResponder={() => true}
            >
              <View style={styles.modalContent}>
                <View style={styles.modalHeader}>
                  <View>
                    <Text style={styles.modalTitle}>
                      {editingTask
                        ? "Edit Task"
                        : isAIParsed
                        ? "✨ AI Parsed Task"
                        : "New Task"}
                    </Text>
                    {isAIParsed && !editingTask && (
                      <Text style={styles.modalSubtitle}>
                        Review and adjust if needed
                      </Text>
                    )}
                  </View>
                  <TouchableOpacity
                    onPress={() => {
                      setShowModal(false);
                      resetForm();
                    }}
                  >
                    <Text style={styles.modalClose}>✕</Text>
                  </TouchableOpacity>
                </View>

                <ScrollView showsVerticalScrollIndicator={false}>
                  <Text style={styles.label}>Task Title</Text>
                  <View style={styles.inputWrapper}>
                    <TextInput
                      style={styles.input}
                      placeholder="What needs to be done?"
                      placeholderTextColor={COLORS.textMuted}
                      value={title}
                      onChangeText={setTitle}
                    />
                  </View>

                  <Text style={styles.label}>
                    How Motivated Are You To Complete This Task?
                  </Text>
                  <MotivationSlider
                    value={motivation}
                    onValueChange={setMotivation}
                  />

                  <Text style={styles.label}>
                    How Difficult Is It To Do This Task?
                  </Text>
                  <DifficultySlider
                    value={difficulty}
                    onValueChange={setDifficulty}
                  />

                  <Text style={styles.label}>Due Date</Text>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={styles.dueDateScroll}
                  >
                    <TouchableOpacity
                      style={[
                        styles.dueDateButton,
                        !dueDate && styles.dueDateButtonActive,
                      ]}
                      onPress={() => setDueDate(null)}
                    >
                      <Text
                        style={[
                          styles.dueDateButtonText,
                          !dueDate && styles.dueDateButtonTextActive,
                        ]}
                      >
                        No date
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.dueDateButton,
                        dueDate &&
                          getDateString(dueDate) ===
                            getDateString(new Date()) &&
                          styles.dueDateButtonActive,
                      ]}
                      onPress={() => {
                        const today = new Date();
                        today.setHours(0, 0, 0, 0);
                        setDueDate(today);
                      }}
                    >
                      <Text
                        style={[
                          styles.dueDateButtonText,
                          dueDate &&
                            getDateString(dueDate) ===
                              getDateString(new Date()) &&
                            styles.dueDateButtonTextActive,
                        ]}
                      >
                        Today
                      </Text>
                    </TouchableOpacity>
                    {generateCalendarDays(selectedDate)
                      .slice(3, 10)
                      .map((day, index) => (
                        <TouchableOpacity
                          key={index}
                          style={[
                            styles.dueDateButton,
                            dueDate &&
                              dueDate.toDateString() ===
                                day.date.toDateString() &&
                              styles.dueDateButtonActive,
                          ]}
                          onPress={() => setDueDate(day.date)}
                        >
                          <Text
                            style={[
                              styles.dueDateButtonText,
                              dueDate &&
                                dueDate.toDateString() ===
                                  day.date.toDateString() &&
                                styles.dueDateButtonTextActive,
                            ]}
                          >
                            {day.isToday ? "Today" : day.dayName}{" "}
                            {day.dayNumber}
                          </Text>
                        </TouchableOpacity>
                      ))}
                  </ScrollView>

                  {formError && (
                    <Text style={styles.formErrorText}>{formError}</Text>
                  )}

                  <TouchableOpacity
                    style={[
                      styles.createButton,
                      formLoading && styles.createButtonDisabled,
                    ]}
                    onPress={handleCreateTask}
                    disabled={formLoading}
                    activeOpacity={0.7}
                  >
                    {formLoading ? (
                      <ActivityIndicator
                        color={COLORS.background}
                        size="small"
                      />
                    ) : (
                      <Text style={styles.createButtonText}>
                        {editingTask ? "Update Task" : "Create Task"}
                      </Text>
                    )}
                  </TouchableOpacity>
                </ScrollView>
              </View>
            </View>
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </Modal>

      {/* Full Calendar Modal */}
      <Modal
        visible={showCalendarModal}
        animationType="fade"
        transparent
        onRequestClose={() => setShowCalendarModal(false)}
      >
        <View style={styles.calendarModalOverlay}>
          <View style={styles.calendarModalContent}>
            {/* Modal Header */}
            <View style={styles.calendarModalHeader}>
              <TouchableOpacity
                onPress={() => {
                  const newDate = new Date(calendarViewDate);
                  newDate.setMonth(newDate.getMonth() - 1);
                  setCalendarViewDate(newDate);
                }}
                style={styles.calendarNavButton}
              >
                <Feather name="chevron-left" size={24} color="#522861" />
              </TouchableOpacity>
              <Text style={styles.calendarModalTitle}>
                {calendarViewDate.toLocaleDateString("en-US", {
                  month: "long",
                  year: "numeric",
                })}
              </Text>
              <TouchableOpacity
                onPress={() => {
                  const newDate = new Date(calendarViewDate);
                  newDate.setMonth(newDate.getMonth() + 1);
                  setCalendarViewDate(newDate);
                }}
                style={styles.calendarNavButton}
              >
                <Feather name="chevron-right" size={24} color="#522861" />
              </TouchableOpacity>
            </View>

            {/* Week Day Headers */}
            <View style={styles.calendarWeekHeader}>
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                <Text key={day} style={styles.calendarWeekDayText}>
                  {day}
                </Text>
              ))}
            </View>

            {/* Calendar Grid */}
            <View style={styles.calendarGrid}>
              {generateMonthCalendar(calendarViewDate).map(
                (week, weekIndex) => (
                  <View key={weekIndex} style={styles.calendarWeekRow}>
                    {week.map((date, dayIndex) => {
                      const isCurrentMonth =
                        date.getMonth() === calendarViewDate.getMonth();
                      const isToday =
                        getDateString(date) === getDateString(new Date());
                      const isSelected =
                        getDateString(date) === getDateString(selectedDate);
                      const hasTasks = dateHasTasks(tasks, date);

                      return (
                        <TouchableOpacity
                          key={dayIndex}
                          style={[
                            styles.calendarGridDay,
                            isSelected && styles.calendarGridDaySelected,
                            isToday &&
                              !isSelected &&
                              styles.calendarGridDayToday,
                          ]}
                          onPress={() => {
                            setSelectedDate(date);
                            setShowCalendarModal(false);
                          }}
                          activeOpacity={0.7}
                        >
                          <Text
                            style={[
                              styles.calendarGridDayText,
                              !isCurrentMonth &&
                                styles.calendarGridDayTextMuted,
                              isSelected && styles.calendarGridDayTextSelected,
                              isToday &&
                                !isSelected &&
                                styles.calendarGridDayTextToday,
                            ]}
                          >
                            {date.getDate()}
                          </Text>
                          {hasTasks && (
                            <View
                              style={[
                                styles.calendarGridDot,
                                isSelected && styles.calendarGridDotSelected,
                              ]}
                            />
                          )}
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                )
              )}
            </View>

            {/* Today Button */}
            <TouchableOpacity
              style={styles.calendarTodayButton}
              onPress={() => {
                const today = new Date();
                setSelectedDate(today);
                setCalendarViewDate(today);
                setShowCalendarModal(false);
              }}
            >
              <Text style={styles.calendarTodayButtonText}>Go to Today</Text>
            </TouchableOpacity>

            {/* Close Button */}
            <TouchableOpacity
              style={styles.calendarCloseButton}
              onPress={() => setShowCalendarModal(false)}
            >
              <Text style={styles.calendarCloseButtonText}>Close</Text>
            </TouchableOpacity>
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
    backgroundColor: "#faf5ff",
  },
  backgroundGradient: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#faf5ff",
  },
  appHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: "transparent",
  },
  headerLeft: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#522861",
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 14,
    color: "#522861",
    marginTop: 2,
    fontWeight: "500",
  },
  headerAddButton: {
    alignItems: "center",
    justifyContent: "center",
  },
  headerAddButtonGradient: {
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
  titleSection: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginBottom: 6,
  },
  titleLeft: {
    flex: 1,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    color: "#522861",
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 12,
    color: "#7a4d84",
    marginTop: 2,
    fontWeight: "500",
  },
  addButton: {
    overflow: "hidden",
    borderRadius: 12,
    shadowColor: "#522861",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  addButtonGradient: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
  },
  edit: {
    color: "#522861",
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(82, 40, 97, 0.2)",
  },
  // Calendar styles - Glass effect
  calendarContainer: {
    marginBottom: 8,
    marginHorizontal: 16,
    backgroundColor: "rgba(255, 255, 255, 0.7)",
    borderRadius: 16,
    padding: 10,
    borderWidth: 1.5,
    borderColor: "rgba(255, 255, 255, 0.8)",
    shadowColor: "#522861",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  calendarHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  calendarMonthText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#522861",
  },
  calendarExpandButton: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: "rgba(82, 40, 97, 0.08)",
    alignItems: "center",
    justifyContent: "center",
  },
  // Magic Input Section
  magicInputSection: {
    marginHorizontal: 16,
    marginBottom: 8,
  },
  magicInputTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#522861",
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  calendarContent: {
    gap: 6,
  },
  calendarDay: {
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 12,
    backgroundColor: "rgba(240, 235, 245, 0.8)",
    minWidth: 48,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.6)",
  },
  calendarDaySelected: {
    backgroundColor: "#522861",
    borderColor: "#522861",
    shadowColor: "#522861",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  calendarDayToday: {
    borderWidth: 2,
    borderColor: "#522861",
    backgroundColor: "rgba(82, 40, 97, 0.1)",
  },
  calendarDayName: {
    fontSize: 10,
    color: "#522861",
    fontWeight: "500",
    marginBottom: 3,
  },
  calendarDayNameSelected: {
    color: "#fff",
  },
  calendarDayNumber: {
    fontSize: 14,
    fontWeight: "600",
    color: "#522861",
  },
  calendarDayNumberSelected: {
    color: "#fff",
  },
  calendarDayNumberToday: {
    color: "#522861",
  },
  calendarDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: "#522861",
    marginTop: 4,
  },
  calendarDotSelected: {
    backgroundColor: "#fff",
  },
  tasksScrollView: {
    flex: 1,
  },
  tasksScrollContent: {
    paddingBottom: 16,
  },
  list: {
    paddingHorizontal: 16,
    paddingTop: 8,
    gap: 8,
  },
  taskItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(240, 235, 245, 0.8)",
    padding: 10,
    borderRadius: 12,
    marginBottom: 8,
    gap: 10,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.6)",
  },
  taskCheckbox: {
    width: 24,
    height: 24,
    justifyContent: "center",
    alignItems: "center",
  },
  taskContentTouchable: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
  },
  taskContent: {
    flex: 1,
  },
  taskTitle: {
    fontSize: 13,
    fontWeight: "500",
    color: COLORS.text,
    marginBottom: 2,
  },
  taskTitleCompleted: {
    textDecorationLine: "line-through",
    opacity: 0.6,
  },
  taskMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  taskEnergy: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  taskEnergyText: {
    fontSize: 10,
    fontWeight: "600",
  },
  taskFriction: {
    fontSize: 10,
    color: "#522861",
  },
  taskAssociatedValue: {
    fontSize: 10,
    color: "#522861",
  },
  taskActions: {
    flexDirection: "row",
    gap: 6,
    alignItems: "center",
  },
  taskEditButton: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: "rgba(82, 40, 97, 0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  taskDeleteButton: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: "rgba(239, 68, 68, 0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  taskDeleteButtonText: {
    fontSize: 20,
    color: COLORS.error,
    fontWeight: "400",
  },
  errorText: {
    color: COLORS.error,
    fontSize: 15,
  },
  empty: {
    alignItems: "center",
    paddingVertical: 32,
    backgroundColor: "rgba(255, 255, 255, 0.5)",
    borderRadius: 16,
    marginHorizontal: 16,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.6)",
  },
  emptyText: {
    fontSize: 16,
    color: "#7a4d84",
    fontWeight: "500",
    marginTop: 12,
  },
  emptySubtext: {
    fontSize: 14,
    color: "#9b6fa1",
    marginTop: 4,
    textAlign: "center",
  },
  // Modal styles - Glass effect
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(61, 30, 73, 0.4)",
    justifyContent: "flex-end",
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  modalOverlayTouchable: {
    flex: 1,
    justifyContent: "flex-end",
    width: "100%",
  },
  modalContentWrapper: {
    width: "100%",
  },
  modalContent: {
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
    paddingBottom: 40,
    maxHeight: "100%",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.8)",
    shadowColor: "#522861",
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.2,
    shadowRadius: 24,
    elevation: 16,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#522861",
  },
  modalSubtitle: {
    fontSize: 13,
    color: "#7a4d84",
    marginTop: 2,
  },
  modalClose: {
    fontSize: 24,
    color: "#9b6fa1",
    padding: 4,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#3d1e49",
    marginBottom: 8,
    marginTop: 12,
  },
  inputWrapper: {
    backgroundColor: "rgba(240, 235, 245, 0.8)",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.6)",
  },
  input: {
    paddingHorizontal: 18,
    paddingVertical: 15,
    fontSize: 15,
    color: "#3d1e49",
  },
  frictionRow: {
    flexDirection: "row",
    gap: 12,
  },
  frictionButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: "rgba(240, 235, 245, 0.8)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.6)",
    alignItems: "center",
  },
  frictionButtonActive: {
    backgroundColor: "#522861",
    borderColor: "#522861",
  },
  frictionButtonText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#7a4d84",
  },
  frictionButtonTextActive: {
    color: "#fff",
  },
  valuesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 8,
  },
  valueButton: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: "rgba(240, 235, 245, 0.8)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.6)",
  },
  valueButtonActive: {
    backgroundColor: "#522861",
    borderColor: "#522861",
  },
  valueButtonText: {
    fontSize: 13,
    fontWeight: "500",
    color: "#7a4d84",
  },
  valueButtonTextActive: {
    color: "#fff",
  },
  clearValuesButton: {
    alignSelf: "flex-start",
    paddingVertical: 6,
    paddingHorizontal: 12,
    marginBottom: 12,
  },
  clearValuesText: {
    fontSize: 13,
    color: "#522861",
    fontWeight: "500",
  },
  dueDateScroll: {
    marginBottom: 8,
  },
  dueDateButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 14,
    backgroundColor: "rgba(240, 235, 245, 0.8)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.6)",
    marginRight: 10,
  },
  dueDateButtonActive: {
    backgroundColor: "#522861",
    borderColor: "#522861",
  },
  dueDateButtonText: {
    fontSize: 13,
    fontWeight: "500",
    color: "#7a4d84",
  },
  dueDateButtonTextActive: {
    color: "#fff",
  },
  formErrorText: {
    color: COLORS.error,
    fontSize: 13,
    textAlign: "center",
    marginTop: 12,
  },
  createButton: {
    backgroundColor: "#522861",
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 24,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 20,
    marginBottom: 20,
    shadowColor: "#522861",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  createButtonDisabled: {
    opacity: 0.6,
  },
  createButtonText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#fff",
  },
  // Full calendar modal styles
  calendarModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  calendarModalContent: {
    backgroundColor: "#fff",
    borderRadius: 24,
    padding: 20,
    width: "100%",
    maxWidth: 380,
    shadowColor: "#522861",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 24,
    elevation: 10,
  },
  calendarModalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  calendarNavButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "rgba(82, 40, 97, 0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  calendarModalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#522861",
  },
  calendarWeekHeader: {
    flexDirection: "row",
    marginBottom: 8,
  },
  calendarWeekDayText: {
    flex: 1,
    textAlign: "center",
    fontSize: 12,
    fontWeight: "600",
    color: "#7a4d84",
  },
  calendarGrid: {
    gap: 4,
  },
  calendarWeekRow: {
    flexDirection: "row",
  },
  calendarGridDay: {
    flex: 1,
    aspectRatio: 1,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    margin: 2,
  },
  calendarGridDaySelected: {
    backgroundColor: "#522861",
  },
  calendarGridDayToday: {
    backgroundColor: "rgba(82, 40, 97, 0.1)",
    borderWidth: 2,
    borderColor: "#522861",
  },
  calendarGridDayText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#1f2937",
  },
  calendarGridDayTextMuted: {
    color: "#d1d5db",
  },
  calendarGridDayTextSelected: {
    color: "#fff",
    fontWeight: "600",
  },
  calendarGridDayTextToday: {
    color: "#522861",
    fontWeight: "700",
  },
  calendarGridDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#522861",
    marginTop: 2,
  },
  calendarGridDotSelected: {
    backgroundColor: "#fff",
  },
  calendarTodayButton: {
    backgroundColor: "rgba(82, 40, 97, 0.1)",
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
    marginTop: 16,
    borderWidth: 1,
    borderColor: "rgba(82, 40, 97, 0.2)",
  },
  calendarTodayButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#522861",
  },
  calendarCloseButton: {
    paddingVertical: 12,
    alignItems: "center",
    marginTop: 8,
  },
  calendarCloseButtonText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#7a4d84",
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
    borderRadius: 28,
    padding: 24,
    width: "100%",
    maxWidth: width - 64,
    shadowColor: "#522861",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.25,
    shadowRadius: 30,
    elevation: 15,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.8)",
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
});
