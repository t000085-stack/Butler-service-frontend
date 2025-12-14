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

// Generate calendar days (7 days starting from today)
const generateCalendarDays = (selectedDate: Date): CalendarDay[] => {
  const days: CalendarDay[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Start from 3 days ago to show context
  for (let i = -3; i <= 10; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() + i);
    date.setHours(0, 0, 0, 0);

    const selectedDateNormalized = new Date(selectedDate);
    selectedDateNormalized.setHours(0, 0, 0, 0);

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

// Check if task is on selected date
const isTaskOnDate = (task: Task, date: Date): boolean => {
  if (!task.due_date) {
    // Tasks without due_date show on "today" only
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const normalizedDate = new Date(date);
    normalizedDate.setHours(0, 0, 0, 0);
    return today.getTime() === normalizedDate.getTime();
  }

  const taskDate = new Date(task.due_date);
  taskDate.setHours(0, 0, 0, 0);
  const normalizedDate = new Date(date);
  normalizedDate.setHours(0, 0, 0, 0);
  return taskDate.getTime() === normalizedDate.getTime();
};

// Check if a date has any tasks
const dateHasTasks = (tasks: Task[], date: Date): boolean => {
  return tasks.some((task) => isTaskOnDate(task, date) && !task.is_completed);
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

// Touch-Based Motivation Slider Component (Profile Style)
const MotivationSlider = ({
  value,
  onValueChange,
}: {
  value: MotivationLevel;
  onValueChange: (level: MotivationLevel) => void;
}) => {
  const currentPoint = MOTIVATION_POINTS[value];
  const trackRef = useRef<View>(null);
  const [trackWidth, setTrackWidth] = useState(0);
  const thumbPosition = useRef(new Animated.Value(0)).current;

  // Update thumb position when value or width changes
  useEffect(() => {
    if (trackWidth > 0) {
      const position = (value / 4) * trackWidth;
      Animated.spring(thumbPosition, {
        toValue: position,
        friction: 8,
        tension: 100,
        useNativeDriver: false,
      }).start();
    }
  }, [value, trackWidth]);

  const handleTrackLayout = (event: any) => {
    const { width } = event.nativeEvent.layout;
    if (width > 0) {
      setTrackWidth(width);
    }
  };

  // Calculate level from touch position
  const getLevelFromTouch = (
    pageX: number,
    trackX: number
  ): MotivationLevel => {
    const relativeX = pageX - trackX;
    const percentage = Math.max(0, Math.min(1, relativeX / trackWidth));
    const level = Math.round(percentage * 4) as MotivationLevel;
    return level;
  };

  // Handle touch events
  const handleTouch = (e: GestureResponderEvent) => {
    trackRef.current?.measureInWindow((x) => {
      const level = getLevelFromTouch(e.nativeEvent.pageX, x);
      onValueChange(level);
    });
  };

  return (
    <View style={sliderStyles.container}>
      {/* Slider Track */}
      <View style={sliderStyles.sliderContainer}>
        <View
          ref={trackRef}
          style={sliderStyles.sliderTrack}
          onLayout={handleTrackLayout}
          onStartShouldSetResponder={() => true}
          onMoveShouldSetResponder={() => true}
          onResponderGrant={handleTouch}
          onResponderMove={handleTouch}
        >
          {/* Track Background */}
          <View style={sliderStyles.sliderTrackBackground}>
            <Animated.View
              style={[
                sliderStyles.sliderTrackFill,
                {
                  width: thumbPosition.interpolate({
                    inputRange: [0, Math.max(trackWidth, 1)],
                    outputRange: [0, Math.max(trackWidth, 1)],
                    extrapolate: "clamp",
                  }),
                },
              ]}
            />
          </View>

          {/* Level Markers */}
          {MOTIVATION_POINTS.map((point, index) => (
            <TouchableOpacity
              key={point.level}
              style={[
                sliderStyles.sliderMarker,
                { left: `${(index / 4) * 100}%` },
              ]}
              onPress={() => onValueChange(point.level)}
              activeOpacity={0.7}
            >
              <View
                style={[
                  sliderStyles.sliderDot,
                  value >= point.level && sliderStyles.sliderDotActive,
                ]}
              />
            </TouchableOpacity>
          ))}

          {/* Thumb */}
          <Animated.View
            style={[
              sliderStyles.sliderThumb,
              {
                transform: [
                  {
                    translateX: thumbPosition.interpolate({
                      inputRange: [0, Math.max(trackWidth, 1)],
                      outputRange: [0, Math.max(trackWidth, 1)],
                      extrapolate: "clamp",
                    }),
                  },
                ],
              },
            ]}
          />
        </View>

        {/* Labels */}
        <View style={sliderStyles.sliderLabels}>
          <Text style={sliderStyles.sliderLabelText}>Low</Text>
          <Text style={sliderStyles.sliderLabelText}>High</Text>
        </View>
      </View>

      {/* Description Card */}
      <View
        style={[
          sliderStyles.descriptionCard,
          { borderColor: COLORS.primary + "20" },
        ]}
      >
        <Text style={[sliderStyles.cardTitle, { color: COLORS.primary }]}>
          {currentPoint.title}
        </Text>
        <Text style={sliderStyles.cardDescription}>
          {currentPoint.description}
        </Text>
      </View>
    </View>
  );
};

// Touch-Based Difficulty Slider Component (Profile Style)
const DifficultySlider = ({
  value,
  onValueChange,
}: {
  value: DifficultyLevel;
  onValueChange: (level: DifficultyLevel) => void;
}) => {
  const currentPoint = DIFFICULTY_POINTS[value];
  const trackRef = useRef<View>(null);
  const [trackWidth, setTrackWidth] = useState(0);
  const thumbPosition = useRef(new Animated.Value(0)).current;

  // Update thumb position when value or width changes
  useEffect(() => {
    if (trackWidth > 0) {
      const position = (value / 4) * trackWidth;
      Animated.spring(thumbPosition, {
        toValue: position,
        friction: 8,
        tension: 100,
        useNativeDriver: false,
      }).start();
    }
  }, [value, trackWidth]);

  const handleTrackLayout = (event: any) => {
    const { width } = event.nativeEvent.layout;
    if (width > 0) {
      setTrackWidth(width);
    }
  };

  // Calculate level from touch position
  const getLevelFromTouch = (
    pageX: number,
    trackX: number
  ): DifficultyLevel => {
    const relativeX = pageX - trackX;
    const percentage = Math.max(0, Math.min(1, relativeX / trackWidth));
    const level = Math.round(percentage * 4) as DifficultyLevel;
    return level;
  };

  // Handle touch events
  const handleTouch = (e: GestureResponderEvent) => {
    trackRef.current?.measureInWindow((x) => {
      const level = getLevelFromTouch(e.nativeEvent.pageX, x);
      onValueChange(level);
    });
  };

  return (
    <View style={sliderStyles.container}>
      {/* Slider Track */}
      <View style={sliderStyles.sliderContainer}>
        <View
          ref={trackRef}
          style={sliderStyles.sliderTrack}
          onLayout={handleTrackLayout}
          onStartShouldSetResponder={() => true}
          onMoveShouldSetResponder={() => true}
          onResponderGrant={handleTouch}
          onResponderMove={handleTouch}
        >
          {/* Track Background */}
          <View style={sliderStyles.sliderTrackBackground}>
            <Animated.View
              style={[
                sliderStyles.sliderTrackFill,
                {
                  width: thumbPosition.interpolate({
                    inputRange: [0, Math.max(trackWidth, 1)],
                    outputRange: [0, Math.max(trackWidth, 1)],
                    extrapolate: "clamp",
                  }),
                },
              ]}
            />
          </View>

          {/* Level Markers */}
          {DIFFICULTY_POINTS.map((point, index) => (
            <TouchableOpacity
              key={point.level}
              style={[
                sliderStyles.sliderMarker,
                { left: `${(index / 4) * 100}%` },
              ]}
              onPress={() => onValueChange(point.level)}
              activeOpacity={0.7}
            >
              <View
                style={[
                  sliderStyles.sliderDot,
                  value >= point.level && sliderStyles.sliderDotActive,
                ]}
              />
            </TouchableOpacity>
          ))}

          {/* Thumb */}
          <Animated.View
            style={[
              sliderStyles.sliderThumb,
              {
                transform: [
                  {
                    translateX: thumbPosition.interpolate({
                      inputRange: [0, Math.max(trackWidth, 1)],
                      outputRange: [0, Math.max(trackWidth, 1)],
                      extrapolate: "clamp",
                    }),
                  },
                ],
              },
            ]}
          />
        </View>

        {/* Labels */}
        <View style={sliderStyles.sliderLabels}>
          <Text style={sliderStyles.sliderLabelText}>Easy</Text>
          <Text style={sliderStyles.sliderLabelText}>Difficult</Text>
        </View>
      </View>

      {/* Description Card */}
      <View
        style={[
          sliderStyles.descriptionCard,
          { borderColor: COLORS.primary + "20" },
        ]}
      >
        <Text style={[sliderStyles.cardTitle, { color: COLORS.primary }]}>
          {currentPoint.title}
        </Text>
        <Text style={sliderStyles.cardDescription}>
          {currentPoint.description}
        </Text>
      </View>
    </View>
  );
};

const sliderStyles = StyleSheet.create({
  container: {
    marginTop: 8,
    marginBottom: 8,
  },
  sliderContainer: {
    marginBottom: 12,
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
  descriptionCard: {
    backgroundColor: COLORS.primary + "10",
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
    borderWidth: 1,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: "600",
    marginBottom: 4,
  },
  cardDescription: {
    fontSize: 13,
    color: COLORS.textSecondary,
    lineHeight: 20,
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
    color: COLORS.text,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: COLORS.textSecondary,
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
    backgroundColor: COLORS.backgroundSecondary,
    borderWidth: 2,
    borderColor: COLORS.border,
  },
  optionEmoji: {
    fontSize: 28,
    marginBottom: 6,
  },
  optionLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.textSecondary,
  },
  descriptionContainer: {
    marginBottom: 20,
  },
  descriptionLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.text,
    marginBottom: 8,
  },
  descriptionInput: {
    backgroundColor: COLORS.backgroundSecondary,
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    color: COLORS.text,
    borderWidth: 1,
    borderColor: COLORS.border,
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
    borderRadius: 12,
    backgroundColor: COLORS.backgroundSecondary,
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  skipButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.textSecondary,
  },
  continueButton: {
    flex: 2,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
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
    backgroundColor: COLORS.primary + "10",
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.primary + "20",
  },
  aiPreviewTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.primary,
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
    fetchTasks();
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

      // Create task directly with AI-determined values
      await createTask({
        title: pendingParsedData.title,
        energy_cost: energyCost,
        emotional_friction: emotionalFriction,
        due_date: pendingParsedData.due_date || undefined,
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

    if (pendingParsedData.due_date) {
      setDueDate(new Date(pendingParsedData.due_date));
    } else {
      setDueDate(null);
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
        due_date: dueDate ? dueDate.toISOString() : undefined,
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
    await fetchTasks();
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
          <Feather name="edit-2" size={16} color={COLORS.primary} />
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
        <ActivityIndicator size="large" color={COLORS.primary} />
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

      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Your Tasks</Text>
          <Text style={styles.subtitle}>
            {filteredTasks.filter((t) => !t.is_completed).length} tasks for{" "}
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
          <Text style={styles.addButtonText}>+ Add</Text>
        </TouchableOpacity>
      </View>

      {/* Calendar Strip */}
      <View style={styles.calendarContainer}>
        <ScrollView
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
                style={[styles.calendarDayName, day.isSelected && styles.edit]}
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
              tintColor={COLORS.primary}
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

              <Text style={styles.label}>
                Associated Values (optional - select multiple)
              </Text>
              <View style={styles.valuesGrid}>
                {CORE_VALUE_OPTIONS.map((value) => (
                  <TouchableOpacity
                    key={value}
                    style={[
                      styles.valueButton,
                      associatedValues.includes(value) &&
                        styles.valueButtonActive,
                    ]}
                    onPress={() => toggleAssociatedValue(value)}
                  >
                    <Text
                      style={[
                        styles.valueButtonText,
                        associatedValues.includes(value) &&
                          styles.valueButtonTextActive,
                      ]}
                    >
                      {value}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              {associatedValues.length > 0 && (
                <TouchableOpacity
                  style={styles.clearValuesButton}
                  onPress={() => setAssociatedValues([])}
                >
                  <Text style={styles.clearValuesText}>Clear all</Text>
                </TouchableOpacity>
              )}

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
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.background,
  },
  header: {
    paddingHorizontal: 40,
    paddingVertical: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  title: {
    fontSize: 26,
    fontWeight: "600",
    color: COLORS.text,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 15,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  addButton: {
    backgroundColor: COLORS.backgroundSecondary,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.borderDark,
  },
  edit: {
    color: COLORS.primary,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.borderDark,
  },
  addButtonText: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: "500",
  },
  // Calendar styles
  calendarContainer: {
    marginBottom: 12,
  },
  calendarContent: {
    paddingHorizontal: 24,
    gap: 8,
  },
  calendarDay: {
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 16,
    backgroundColor: COLORS.backgroundSecondary,
    minWidth: 52,
  },
  calendarDaySelected: {
    backgroundColor: COLORS.primary,
  },
  calendarDayToday: {
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  calendarDayName: {
    fontSize: 11,
    color: COLORS.textSecondary,
    fontWeight: "500",
    marginBottom: 4,
  },
  calendarDayNameSelected: {
    color: "#fff",
  },
  calendarDayNumber: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.text,
  },
  calendarDayNumberSelected: {
    color: "#fff",
  },
  calendarDayNumberToday: {
    color: COLORS.primary,
  },
  calendarDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: COLORS.primary,
    marginTop: 4,
  },
  calendarDotSelected: {
    backgroundColor: "#fff",
  },
  list: {
    paddingHorizontal: 40,
    paddingTop: 8,
    paddingBottom: 24,
  },
  card: {
    backgroundColor: COLORS.backgroundSecondary,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    flexDirection: "row",
    alignItems: "center",
  },
  cardCompleted: {
    opacity: 0.6,
  },
  cardContent: {
    flex: 1,
  },
  taskTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.text,
    marginBottom: 8,
  },
  taskTitleCompleted: {
    textDecorationLine: "line-through",
    color: COLORS.textMuted,
  },
  taskMeta: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  badge: {
    backgroundColor: COLORS.border,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 12,
    color: COLORS.textSecondary,
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
    borderRadius: 18,
    backgroundColor: COLORS.primary + "20",
    alignItems: "center",
    justifyContent: "center",
  },
  deleteButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.error + "20",
    alignItems: "center",
    justifyContent: "center",
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
  },
  emptyText: {
    fontSize: 16,
    color: COLORS.textSecondary,
    fontWeight: "500",
  },
  emptySubtext: {
    fontSize: 14,
    color: COLORS.textMuted,
    marginTop: 4,
    textAlign: "center",
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: COLORS.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: "85%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: COLORS.text,
  },
  modalSubtitle: {
    fontSize: 13,
    color: COLORS.primary,
    marginTop: 2,
  },
  modalClose: {
    fontSize: 20,
    color: COLORS.textMuted,
    padding: 4,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.text,
    marginBottom: 8,
    marginTop: 12,
  },
  inputWrapper: {
    backgroundColor: COLORS.backgroundSecondary,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  input: {
    paddingHorizontal: 18,
    paddingVertical: 15,
    fontSize: 15,
    color: COLORS.text,
  },
  frictionRow: {
    flexDirection: "row",
    gap: 12,
  },
  frictionButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: COLORS.backgroundSecondary,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: "center",
  },
  frictionButtonActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  frictionButtonText: {
    fontSize: 14,
    fontWeight: "500",
    color: COLORS.textSecondary,
  },
  frictionButtonTextActive: {
    color: COLORS.background,
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
    backgroundColor: COLORS.backgroundSecondary,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  valueButtonActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  valueButtonText: {
    fontSize: 13,
    fontWeight: "500",
    color: COLORS.textSecondary,
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
    color: COLORS.primary,
    fontWeight: "500",
  },
  dueDateScroll: {
    marginBottom: 8,
  },
  dueDateButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: COLORS.backgroundSecondary,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginRight: 10,
  },
  dueDateButtonActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  dueDateButtonText: {
    fontSize: 13,
    fontWeight: "500",
    color: COLORS.textSecondary,
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
    backgroundColor: COLORS.backgroundSecondary,
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 24,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: COLORS.borderDark,
  },
  createButtonDisabled: {
    opacity: 0.6,
  },
  createButtonText: {
    fontSize: 15,
    fontWeight: "500",
    color: COLORS.text,
  },
});
