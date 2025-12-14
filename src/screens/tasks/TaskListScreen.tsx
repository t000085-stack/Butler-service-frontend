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

// Touch-Based Motivation Slider Component
const MotivationSlider = ({
  value,
  onValueChange,
}: {
  value: MotivationLevel;
  onValueChange: (level: MotivationLevel) => void;
}) => {
  const currentPoint = MOTIVATION_POINTS[value];
  const trackRef = useRef<View>(null);
  const [trackLayout, setTrackLayout] = useState({ x: 0, width: 0 });
  const thumbAnim = useRef(new Animated.Value(value)).current;

  // Update animation when value changes
  useEffect(() => {
    Animated.spring(thumbAnim, {
      toValue: value,
      friction: 8,
      tension: 100,
      useNativeDriver: false,
    }).start();
  }, [value]);

  // Handle track layout measurement
  const onTrackLayout = () => {
    trackRef.current?.measure((x, y, width, height, pageX, pageY) => {
      setTrackLayout({ x: pageX, width });
    });
  };

  // Calculate level from touch position
  const getLevelFromTouch = (pageX: number): MotivationLevel => {
    const relativeX = pageX - trackLayout.x;
    const percentage = Math.max(0, Math.min(1, relativeX / trackLayout.width));
    const level = Math.round(percentage * 4) as MotivationLevel;
    return level;
  };

  // Handle touch events
  const handleTouchStart = (e: GestureResponderEvent) => {
    const level = getLevelFromTouch(e.nativeEvent.pageX);
    onValueChange(level);
  };

  const handleTouchMove = (e: GestureResponderEvent) => {
    const level = getLevelFromTouch(e.nativeEvent.pageX);
    onValueChange(level);
  };

  // Calculate thumb position
  const thumbPosition = thumbAnim.interpolate({
    inputRange: [0, 1, 2, 3, 4],
    outputRange: ["0%", "25%", "50%", "75%", "100%"],
  });

  return (
    <View style={sliderStyles.container}>
      {/* Slider Track Area */}
      <View
        ref={trackRef}
        style={sliderStyles.trackWrapper}
        onLayout={onTrackLayout}
        onStartShouldSetResponder={() => true}
        onMoveShouldSetResponder={() => true}
        onResponderGrant={handleTouchStart}
        onResponderMove={handleTouchMove}
      >
        {/* Gradient Track */}
        <LinearGradient
          colors={["#EC4899", "#D946EF", "#A855F7", "#8B5CF6", "#7C3AED"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={sliderStyles.track}
        />

        {/* Track Points */}
        <View style={sliderStyles.pointsContainer}>
          {MOTIVATION_POINTS.map((point, index) => (
            <TouchableOpacity
              key={point.level}
              style={[sliderStyles.point, { left: `${index * 25}%` }]}
              onPress={() => onValueChange(point.level)}
              activeOpacity={0.7}
            >
              <View
                style={[
                  sliderStyles.pointDot,
                  value === point.level && {
                    backgroundColor: point.color,
                    transform: [{ scale: 1.4 }],
                  },
                ]}
              />
            </TouchableOpacity>
          ))}
        </View>

        {/* Animated Thumb */}
        <Animated.View
          style={[sliderStyles.thumbWrapper, { left: thumbPosition }]}
          pointerEvents="none"
        >
          <View
            style={[sliderStyles.thumb, { borderColor: currentPoint.color }]}
          >
            <View
              style={[
                sliderStyles.thumbInner,
                { backgroundColor: currentPoint.color },
              ]}
            />
          </View>
        </Animated.View>
      </View>

      {/* Labels Row */}
      <View style={sliderStyles.labelsRow}>
        {MOTIVATION_POINTS.filter((p) => p.shortLabel).map((point) => (
          <TouchableOpacity
            key={point.level}
            style={[
              sliderStyles.labelButton,
              point.level === 0 && { alignItems: "flex-start" },
              point.level === 2 && { alignItems: "center" },
              point.level === 4 && { alignItems: "flex-end" },
            ]}
            onPress={() => onValueChange(point.level)}
            activeOpacity={0.7}
          >
            <Text
              style={[
                sliderStyles.labelText,
                value === point.level && {
                  color: point.color,
                  fontWeight: "700",
                },
              ]}
            >
              {point.shortLabel}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Description Card */}
      <View
        style={[
          sliderStyles.descriptionCard,
          {
            backgroundColor: currentPoint.bgColor,
            borderLeftColor: currentPoint.color,
          },
        ]}
      >
        <Text style={[sliderStyles.cardTitle, { color: currentPoint.color }]}>
          {currentPoint.title}
        </Text>
        <Text style={sliderStyles.cardDescription}>
          {currentPoint.description}
        </Text>
      </View>
    </View>
  );
};

// Touch-Based Difficulty Slider Component
const DifficultySlider = ({
  value,
  onValueChange,
}: {
  value: DifficultyLevel;
  onValueChange: (level: DifficultyLevel) => void;
}) => {
  const currentPoint = DIFFICULTY_POINTS[value];
  const trackRef = useRef<View>(null);
  const [trackLayout, setTrackLayout] = useState({ x: 0, width: 0 });
  const thumbAnim = useRef(new Animated.Value(value)).current;

  // Update animation when value changes
  useEffect(() => {
    Animated.spring(thumbAnim, {
      toValue: value,
      friction: 8,
      tension: 100,
      useNativeDriver: false,
    }).start();
  }, [value]);

  // Handle track layout measurement
  const onTrackLayout = () => {
    trackRef.current?.measure((x, y, width, height, pageX, pageY) => {
      setTrackLayout({ x: pageX, width });
    });
  };

  // Calculate level from touch position
  const getLevelFromTouch = (pageX: number): DifficultyLevel => {
    const relativeX = pageX - trackLayout.x;
    const percentage = Math.max(0, Math.min(1, relativeX / trackLayout.width));
    const level = Math.round(percentage * 4) as DifficultyLevel;
    return level;
  };

  // Handle touch events
  const handleTouchStart = (e: GestureResponderEvent) => {
    const level = getLevelFromTouch(e.nativeEvent.pageX);
    onValueChange(level);
  };

  const handleTouchMove = (e: GestureResponderEvent) => {
    const level = getLevelFromTouch(e.nativeEvent.pageX);
    onValueChange(level);
  };

  // Calculate thumb position
  const thumbPosition = thumbAnim.interpolate({
    inputRange: [0, 1, 2, 3, 4],
    outputRange: ["0%", "25%", "50%", "75%", "100%"],
  });

  return (
    <View style={sliderStyles.container}>
      {/* Slider Track Area */}
      <View
        ref={trackRef}
        style={sliderStyles.trackWrapper}
        onLayout={onTrackLayout}
        onStartShouldSetResponder={() => true}
        onMoveShouldSetResponder={() => true}
        onResponderGrant={handleTouchStart}
        onResponderMove={handleTouchMove}
      >
        {/* Gradient Track */}
        <LinearGradient
          colors={["#7C3AED", "#8B5CF6", "#A855F7", "#D946EF", "#EC4899"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={sliderStyles.track}
        />

        {/* Track Points */}
        <View style={sliderStyles.pointsContainer}>
          {DIFFICULTY_POINTS.map((point, index) => (
            <TouchableOpacity
              key={point.level}
              style={[sliderStyles.point, { left: `${index * 25}%` }]}
              onPress={() => onValueChange(point.level)}
              activeOpacity={0.7}
            >
              <View
                style={[
                  sliderStyles.pointDot,
                  value === point.level && {
                    backgroundColor: point.color,
                    transform: [{ scale: 1.4 }],
                  },
                ]}
              />
            </TouchableOpacity>
          ))}
        </View>

        {/* Animated Thumb */}
        <Animated.View
          style={[sliderStyles.thumbWrapper, { left: thumbPosition }]}
          pointerEvents="none"
        >
          <View
            style={[sliderStyles.thumb, { borderColor: currentPoint.color }]}
          >
            <View
              style={[
                sliderStyles.thumbInner,
                { backgroundColor: currentPoint.color },
              ]}
            />
          </View>
        </Animated.View>
      </View>

      {/* Labels Row */}
      <View style={sliderStyles.labelsRow}>
        {DIFFICULTY_POINTS.filter((p) => p.shortLabel).map((point) => (
          <TouchableOpacity
            key={point.level}
            style={[
              sliderStyles.labelButton,
              point.level === 0 && { alignItems: "flex-start" },
              point.level === 2 && { alignItems: "center" },
              point.level === 4 && { alignItems: "flex-end" },
            ]}
            onPress={() => onValueChange(point.level)}
            activeOpacity={0.7}
          >
            <Text
              style={[
                sliderStyles.labelText,
                value === point.level && {
                  color: point.color,
                  fontWeight: "700",
                },
              ]}
            >
              {point.shortLabel}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Description Card */}
      <View
        style={[
          sliderStyles.descriptionCard,
          {
            backgroundColor: currentPoint.bgColor,
            borderLeftColor: currentPoint.color,
          },
        ]}
      >
        <Text style={[sliderStyles.cardTitle, { color: currentPoint.color }]}>
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
    marginTop: 12,
    marginBottom: 8,
  },
  trackWrapper: {
    height: 60,
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  track: {
    height: 8,
    borderRadius: 4,
  },
  pointsContainer: {
    position: "absolute",
    left: 20,
    right: 20,
    height: 60,
    justifyContent: "center",
  },
  point: {
    position: "absolute",
    width: 44,
    height: 44,
    marginLeft: -22,
    alignItems: "center",
    justifyContent: "center",
  },
  pointDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: "rgba(255,255,255,0.95)",
    borderWidth: 2,
    borderColor: "rgba(0,0,0,0.1)",
  },
  thumbWrapper: {
    position: "absolute",
    top: "50%",
    marginTop: -24,
    marginLeft: -4,
  },
  thumb: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.background,
    borderWidth: 4,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  thumbInner: {
    width: 16,
    height: 16,
    borderRadius: 8,
  },
  labelsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    marginTop: 8,
  },
  labelButton: {
    flex: 1,
    paddingVertical: 4,
  },
  labelText: {
    fontSize: 13,
    fontWeight: "500",
    color: COLORS.textSecondary,
  },
  descriptionCard: {
    marginTop: 16,
    padding: 16,
    borderRadius: 16,
    borderLeftWidth: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 0.3,
    marginBottom: 8,
  },
  cardDescription: {
    fontSize: 14,
    color: COLORS.textSecondary,
    lineHeight: 22,
    fontStyle: "italic",
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
  const [associatedValue, setAssociatedValue] = useState("");
  const [dueDate, setDueDate] = useState<Date | null>(null);
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [isAIParsed, setIsAIParsed] = useState(false);

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
    setAssociatedValue("");
    setDueDate(null);
    setFormError(null);
    setIsAIParsed(false);
    setEditingTask(null);
  };

  const handleEdit = (task: Task) => {
    setEditingTask(task);
    setTitle(task.title);
    setEnergyCost(task.energy_cost.toString());
    setFriction(task.emotional_friction);
    setAssociatedValue(task.associated_value || '');
    setDueDate(task.due_date ? new Date(task.due_date) : null);
    setFormError(null);
    setIsAIParsed(false);
    setShowModal(true);
  };

  // Handle AI-parsed task data from MagicTaskInput
  const handleMagicTaskParsed = (data: ParsedTaskData) => {
    setTitle(data.title);
    setMotivation(energyCostToMotivation(data.energy_cost));
    setDifficulty(frictionToDifficulty(data.emotional_friction));
    setAssociatedValue("");
    // Use the AI-parsed due_date if provided
    if (data.due_date) {
      setDueDate(new Date(data.due_date));
    } else {
      setDueDate(null);
    }
    setFormError(null);
    setIsAIParsed(true);
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
        associated_value: associatedValue.trim() || undefined,
        due_date: dueDate ? dueDate.toISOString() : undefined,
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
        {!item.is_completed && (
          <TouchableOpacity
            style={styles.completeButton}
            onPress={() => handleComplete(item)}
          >
            <Text style={styles.completeButtonText}>✓</Text>
          </TouchableOpacity>
        )}
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
                  {isAIParsed ? "✨ AI Parsed Task" : "New Task"}
                </Text>
                {isAIParsed && (
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

              <Text style={styles.label}>Associated Value (optional)</Text>
              <View style={styles.inputWrapper}>
                <TextInput
                  style={styles.input}
                  placeholder="e.g., Health, Career, Family"
                  placeholderTextColor={COLORS.textMuted}
                  value={associatedValue}
                  onChangeText={setAssociatedValue}
                />
              </View>

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
                    {editingTask ? 'Update Task' : 'Create Task'}
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
  completeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.success + "20",
    alignItems: "center",
    justifyContent: "center",
  },
  completeButtonText: {
    fontSize: 18,
    color: COLORS.success,
    fontWeight: "600",
  },
  editButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.primary + '20',
    alignItems: 'center',
    justifyContent: 'center',
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
