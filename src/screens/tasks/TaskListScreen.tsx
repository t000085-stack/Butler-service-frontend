import React, { useEffect, useState, useMemo, useRef } from "react";
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
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { StatusBar } from "expo-status-bar";
import { Feather } from "@expo/vector-icons";
import { useTasks } from "../../contexts/TaskContext";
import { useAuth } from "../../contexts/AuthContext";
import { COLORS, EMOTIONAL_FRICTION } from "../../constants/config";
import MagicTaskInput, {
  ParsedTaskData,
} from "../../components/MagicTaskInput";
import type { Task, EmotionalFriction } from "../../types";

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
const feelingStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
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
  optionsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 12,
    marginBottom: 20,
  },
  optionButton: {
    width: "30%",
    alignItems: "center",
    paddingVertical: 16,
    paddingHorizontal: 8,
    borderRadius: 16,
    backgroundColor: "rgba(240, 235, 245, 0.8)",
    borderWidth: 2,
    borderColor: "rgba(255, 255, 255, 0.6)",
  },
  optionEmoji: {
    fontSize: 28,
    marginBottom: 6,
  },
  optionLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#7a4d84",
  },
  descriptionContainer: {
    marginBottom: 20,
  },
  descriptionLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#3d1e49",
    marginBottom: 8,
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
  actions: {
    flexDirection: "row",
    gap: 12,
  },
  skipButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: "rgba(240, 235, 245, 0.8)",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.6)",
  },
  skipButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#7a4d84",
  },
  continueButton: {
    flex: 2,
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
    Alert.alert("Logout", "Are you sure you want to logout?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Logout",
        style: "destructive",
        onPress: async () => {
          try {
            await signOut();
          } catch (err: any) {
            Alert.alert("Error", err.message || "Failed to logout");
          }
        },
      },
    ]);
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
  const [taskFeeling, setTaskFeeling] = useState("");
  const [feelingDescription, setFeelingDescription] = useState("");
  const [pendingParsedData, setPendingParsedData] =
    useState<ParsedTaskData | null>(null);

  // Full calendar popup state
  const [showCalendarModal, setShowCalendarModal] = useState(false);
  const [calendarViewDate, setCalendarViewDate] = useState(new Date());

  // Calendar strip scroll ref
  const calendarScrollRef = useRef<ScrollView>(null);

  // Calendar days
  const calendarDays = useMemo(
    () => generateCalendarDays(selectedDate),
    [selectedDate]
  );

  // Filtered tasks for selected date
  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => isTaskOnDate(task, selectedDate));
  }, [tasks, selectedDate]);

  useEffect(() => {
    fetchTasks(true); // Include completed tasks
  }, [fetchTasks]);

  const resetForm = () => {
    setTitle("");
    setMotivation(2);
    setDifficulty(2);
    setAssociatedValues([]);
    setDueDate(null);
    setFormError(null);
    setIsAIParsed(false);
    setEditingTask(null);
    setTaskFeeling("");
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
    setTaskFeeling("");
    setFeelingDescription("");
    setShowFeelingModal(true);
  };

  // Feeling options with AI-determined motivation and difficulty mappings
  // motivation: 0=Not Motivated, 4=Highly Motivated
  // difficulty: 0=Easy, 4=Difficult
  const FEELING_OPTIONS = [
    {
      emoji: "😰",
      label: "Anxious",
      color: "#EF4444",
      motivation: 1 as MotivationLevel,
      difficulty: 4 as DifficultyLevel,
    },
    {
      emoji: "😩",
      label: "Overwhelmed",
      color: "#F97316",
      motivation: 0 as MotivationLevel,
      difficulty: 4 as DifficultyLevel,
    },
    {
      emoji: "😐",
      label: "Neutral",
      color: "#6B7280",
      motivation: 2 as MotivationLevel,
      difficulty: 2 as DifficultyLevel,
    },
    {
      emoji: "🤔",
      label: "Uncertain",
      color: "#8B5CF6",
      motivation: 1 as MotivationLevel,
      difficulty: 3 as DifficultyLevel,
    },
    {
      emoji: "😊",
      label: "Confident",
      color: "#10B981",
      motivation: 3 as MotivationLevel,
      difficulty: 1 as DifficultyLevel,
    },
    {
      emoji: "🤩",
      label: "Excited",
      color: "#EC4899",
      motivation: 4 as MotivationLevel,
      difficulty: 0 as DifficultyLevel,
    },
  ];

  // State for feeling submission loading
  const [feelingLoading, setFeelingLoading] = useState(false);

  // Handle feeling selection and create task directly with AI-determined values
  const handleFeelingSubmit = async () => {
    if (!pendingParsedData || !taskFeeling) return;

    // Find the selected feeling option
    const selectedFeeling = FEELING_OPTIONS.find(
      (opt) => opt.label === taskFeeling
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
        user_feeling: taskFeeling,
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

    setTaskFeeling("");
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
    <View style={[styles.card, item.is_completed && styles.cardCompleted]}>
      {/* Completed indicator */}
      {item.is_completed && (
        <View style={styles.completedBadge}>
          <Feather name="check" size={12} color="#fff" />
          <Text style={styles.completedBadgeText}>Done</Text>
        </View>
      )}
      <View style={styles.cardContent}>
        <Text
          style={[
            styles.taskTitle,
            item.is_completed && styles.taskTitleCompleted,
          ]}
        >
          {item.title}
        </Text>
        <View style={styles.taskMeta}>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>Energy: {item.energy_cost}</Text>
          </View>
          <View
            style={[
              styles.badge,
              {
                backgroundColor: frictionColors[item.emotional_friction] + "20",
              },
            ]}
          >
            <Text
              style={[
                styles.badgeText,
                { color: frictionColors[item.emotional_friction] },
              ]}
            >
              {item.emotional_friction}
            </Text>
          </View>
          {item.associated_value && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{item.associated_value}</Text>
            </View>
          )}
        </View>
      </View>
      <View style={styles.cardActions}>
        <TouchableOpacity
          style={styles.editButton}
          onPress={() => handleEdit(item)}
        >
          <Feather name="edit-2" size={16} color="#522861" />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => handleDelete(item)}
        >
          <Text style={styles.deleteButtonText}>×</Text>
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

      {/* Simple Header - Just Signout */}
      <View style={styles.appHeader}>
        <View style={styles.appHeaderLeft} />
        <View style={styles.appHeaderCenter} />
        <TouchableOpacity
          style={styles.appHeaderRight}
          onPress={handleLogout}
          activeOpacity={0.7}
        >
          <LinearGradient
            colors={["rgba(82, 40, 97, 0.15)", "rgba(122, 77, 132, 0.1)"]}
            style={styles.logoutGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Feather name="power" size={18} color="#522861" />
          </LinearGradient>
        </TouchableOpacity>
      </View>

      {/* Title Section */}
      <View style={styles.titleSection}>
        <View style={styles.titleLeft}>
          <Text style={styles.title}>Your Tasks</Text>
          <Text style={styles.subtitle}>
            {filteredTasks.filter((t) => !t.is_completed).length} remaining,{" "}
            {filteredTasks.filter((t) => t.is_completed).length} done for{" "}
            {selectedDate.toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
            })}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => {
            resetForm();
            setDueDate(selectedDate);
            setShowModal(true);
          }}
          activeOpacity={0.7}
        >
          <LinearGradient
            colors={["#522861", "#7a4d84"]}
            style={styles.addButtonGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Feather name="plus" size={18} color="#fff" />
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
            <Feather name="calendar" size={18} color="#522861" />
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
      <MagicTaskInput
        onTaskParsed={handleMagicTaskParsed}
        onError={handleMagicError}
        placeholder="Describe your task... e.g., 'Call mom tomorrow, it's emotionally hard'"
      />

      {error ? (
        <View style={styles.centered}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : (
        <FlatList
          data={filteredTasks}
          keyExtractor={(item) => item._id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#522861"
            />
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Feather name="calendar" size={40} color={COLORS.textMuted} />
              <Text style={styles.emptyText}>No tasks for this day</Text>
              <Text style={styles.emptySubtext}>
                Tap "+ Add" to create a task for{" "}
                {selectedDate.toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                })}
              </Text>
            </View>
          }
        />
      )}

      {/* Feeling Popup Modal */}
      <Modal
        visible={showFeelingModal}
        animationType="fade"
        transparent
        onRequestClose={() => setShowFeelingModal(false)}
      >
        <KeyboardAvoidingView
          style={feelingStyles.overlay}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
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
                <Text style={feelingStyles.subtitle}>
                  "{pendingParsedData?.title}"
                </Text>
              </View>

              {/* Feeling Options */}
              <View style={feelingStyles.optionsGrid}>
                {FEELING_OPTIONS.map((option) => (
                  <TouchableOpacity
                    key={option.label}
                    style={[
                      feelingStyles.optionButton,
                      taskFeeling === option.label && {
                        backgroundColor: option.color + "20",
                        borderColor: option.color,
                      },
                    ]}
                    onPress={() => setTaskFeeling(option.label)}
                    disabled={feelingLoading}
                  >
                    <Text style={feelingStyles.optionEmoji}>
                      {option.emoji}
                    </Text>
                    <Text
                      style={[
                        feelingStyles.optionLabel,
                        taskFeeling === option.label && { color: option.color },
                      ]}
                    >
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

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
                          FEELING_OPTIONS.find((o) => o.label === taskFeeling)
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
                          FEELING_OPTIONS.find((o) => o.label === taskFeeling)
                            ?.difficulty || 2
                        ].title
                      }
                    </Text>
                  </View>
                </View>
              )}

              {/* Description Input */}
              <View style={feelingStyles.descriptionContainer}>
                <Text style={feelingStyles.descriptionLabel}>
                  Tell us more (optional)
                </Text>
                <TextInput
                  style={feelingStyles.descriptionInput}
                  placeholder="Why do you feel this way about the task?"
                  placeholderTextColor={COLORS.textMuted}
                  value={feelingDescription}
                  onChangeText={setFeelingDescription}
                  multiline
                  numberOfLines={3}
                  editable={!feelingLoading}
                />
              </View>

              {/* Action Buttons */}
              <View style={feelingStyles.actions}>
                <TouchableOpacity
                  style={feelingStyles.skipButton}
                  onPress={handleSkipFeeling}
                  disabled={feelingLoading}
                >
                  <Text style={feelingStyles.skipButtonText}>Set Manually</Text>
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
        </KeyboardAvoidingView>
      </Modal>

      {/* Create Task Modal */}
      <Modal
        visible={showModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowModal(false)}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
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
                {generateCalendarDays(selectedDate)
                  .slice(3, 10)
                  .map((day, index) => (
                    <TouchableOpacity
                      key={index}
                      style={[
                        styles.dueDateButton,
                        dueDate &&
                          dueDate.toDateString() === day.date.toDateString() &&
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
                        {day.isToday ? "Today" : day.dayName} {day.dayNumber}
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
                  <ActivityIndicator color={COLORS.background} size="small" />
                ) : (
                  <Text style={styles.createButtonText}>
                    {editingTask ? "Update Task" : "Create Task"}
                  </Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
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
  titleSection: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 12,
    marginBottom: 8,
  },
  titleLeft: {
    flex: 1,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: "#522861",
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 14,
    color: "#7a4d84",
    marginTop: 4,
    fontWeight: "500",
  },
  addButton: {
    overflow: "hidden",
    borderRadius: 14,
    shadowColor: "#522861",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  addButtonGradient: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 14,
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
    marginBottom: 12,
    marginHorizontal: 16,
    backgroundColor: "rgba(255, 255, 255, 0.7)",
    borderRadius: 20,
    padding: 12,
    borderWidth: 1.5,
    borderColor: "rgba(255, 255, 255, 0.8)",
    shadowColor: "#522861",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 6,
  },
  calendarContent: {
    gap: 6,
  },
  calendarDay: {
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 14,
    backgroundColor: "rgba(240, 235, 245, 0.8)",
    minWidth: 50,
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
    fontSize: 11,
    color: "#7a4d84",
    fontWeight: "500",
    marginBottom: 4,
  },
  calendarDayNameSelected: {
    color: "#fff",
  },
  calendarDayNumber: {
    fontSize: 16,
    fontWeight: "600",
    color: "#3d1e49",
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
  list: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 24,
  },
  card: {
    backgroundColor: "rgba(255, 255, 255, 0.7)",
    borderRadius: 20,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1.5,
    borderColor: "rgba(255, 255, 255, 0.8)",
    flexDirection: "row",
    alignItems: "center",
    shadowColor: "#522861",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  cardCompleted: {
    opacity: 0.85,
    backgroundColor: "rgba(232, 245, 233, 0.8)",
    borderColor: "#4CAF50",
  },
  completedBadge: {
    position: "absolute",
    top: 8,
    right: 8,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#4CAF50",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  completedBadgeText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "600",
  },
  cardContent: {
    flex: 1,
  },
  taskTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#3d1e49",
    marginBottom: 8,
  },
  taskTitleCompleted: {
    textDecorationLine: "line-through",
    color: "#9b6fa1",
  },
  taskMeta: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  badge: {
    backgroundColor: "rgba(240, 235, 245, 0.9)",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.6)",
  },
  badgeText: {
    fontSize: 12,
    color: "#7a4d84",
    fontWeight: "500",
  },
  cardActions: {
    flexDirection: "row",
    gap: 8,
    marginLeft: 12,
  },
  editButton: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: "rgba(82, 40, 97, 0.15)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.6)",
  },
  deleteButton: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: "rgba(239, 68, 68, 0.15)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.6)",
  },
  deleteButtonText: {
    fontSize: 22,
    color: COLORS.error,
    fontWeight: "400",
  },
  errorText: {
    color: COLORS.error,
    fontSize: 15,
  },
  empty: {
    alignItems: "center",
    paddingVertical: 40,
    backgroundColor: "rgba(255, 255, 255, 0.5)",
    borderRadius: 20,
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
  },
  modalContent: {
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
    maxHeight: "85%",
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
  // Calendar header styles
  calendarHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  calendarMonthText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#522861",
  },
  calendarExpandButton: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: "rgba(82, 40, 97, 0.1)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(82, 40, 97, 0.15)",
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
});
