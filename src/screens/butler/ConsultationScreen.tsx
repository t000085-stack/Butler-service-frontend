import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  ActivityIndicator,
  Animated,
  Easing,
  ScrollView,
  Image,
  Alert,
  Modal,
  TextInput,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { StatusBar } from "expo-status-bar";
import { MaterialIcons, Feather } from "@expo/vector-icons";
import { COLORS } from "../../constants/config";
import * as butlerApi from "../../api/butler";
import * as tasksApi from "../../api/tasks";
import type { Task } from "../../types";
import { useAuth } from "../../contexts/AuthContext";
import { useTasks } from "../../contexts/TaskContext";
import { useNavigation } from "@react-navigation/native";

const { width, height } = Dimensions.get("window");

// Twinkling Star Component
const Star = ({
  size,
  top,
  left,
  delay,
}: {
  size: number;
  top: number;
  left: number;
  delay: number;
}) => {
  const twinkleAnim = useRef(new Animated.Value(0.2)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(twinkleAnim, {
          toValue: 0.8,
          duration: 1200 + Math.random() * 800,
          delay,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(twinkleAnim, {
          toValue: 0.15,
          duration: 1200 + Math.random() * 800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  return (
    <Animated.View
      style={[
        styles.star,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          top,
          left,
          opacity: twinkleAnim,
        },
      ]}
    />
  );
};

// Animated Mood Button with grow and glow effect
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
      style={moodSelectorStyles.emojiButton}
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      activeOpacity={1}
    >
      {/* Glow effect behind selected icon */}
      {isSelected && <View style={moodSelectorStyles.glowEffect} />}
      <Animated.View
        style={[
          moodSelectorStyles.emojiCircle,
          {
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        <Animated.Image
          source={mood.image}
          style={[moodSelectorStyles.moodImage, { opacity: opacityAnim }]}
          resizeMode="contain"
        />
      </Animated.View>
      <Text
        style={[
          moodSelectorStyles.label,
          isSelected && moodSelectorStyles.labelActive,
        ]}
        numberOfLines={1}
      >
        {mood.label}
      </Text>
    </TouchableOpacity>
  );
};

// Mood Selector Component with custom images - matching the rating style
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
    <View style={moodSelectorStyles.container}>
      {/* Mood Image Buttons with connecting lines */}
      <View style={moodSelectorStyles.emojisRow}>
        {moods.map((mood, index) => (
          <React.Fragment key={mood.id}>
            <AnimatedMoodImageButton
              mood={mood}
              isSelected={selectedMood === mood.id}
              onPress={() => onSelect(mood.id)}
            />
            {/* Connecting line between icons */}
            {index < moods.length - 1 && (
              <View style={moodSelectorStyles.connectorLine} />
            )}
          </React.Fragment>
        ))}
      </View>
    </View>
  );
};

// Get energy color based on level - using #522861 shades
const getEnergyColor = (level: number) => {
  if (level <= 2) return "#c9a3d1"; // Very light shade - very low
  if (level <= 4) return "#9b6fa1"; // Light shade - low
  if (level <= 6) return "#7a4d84"; // Medium shade - medium
  if (level <= 8) return "#522861"; // Main color - good
  return "#3d1e49"; // Dark shade - excellent
};

// Get energy label based on level
const getEnergyLabel = (level: number) => {
  if (level <= 2) return "Exhausted";
  if (level <= 4) return "Tired";
  if (level <= 6) return "Moderate";
  if (level <= 8) return "Energized";
  return "Supercharged!";
};

// Get energy emoji based on level
const getEnergyEmoji = (level: number) => {
  if (level <= 2) return "🪫";
  if (level <= 4) return "😴";
  if (level <= 6) return "✨";
  if (level <= 8) return "⚡";
  return "🔥";
};

// Simple Energy Level Selector Component
const CreativeEnergySelector = ({
  value,
  onChange,
}: {
  value: number;
  onChange: (level: number) => void;
}) => {
  const label = getEnergyLabel(value);

  return (
    <View style={energyStyles.container}>
      {/* Header */}
      <View style={energyStyles.header}>
        <Feather name="zap" size={20} color="#522861" />
        <Text style={energyStyles.title}>Energy Level</Text>
        <Text style={energyStyles.levelLabel}>{label}</Text>
      </View>

      {/* Number buttons in a row */}
      <View style={energyStyles.numbersRow}>
        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((level) => {
          const isSelected = level === value;

          return (
            <TouchableOpacity
              key={level}
              onPress={() => onChange(level)}
              activeOpacity={0.7}
              style={[
                energyStyles.numberButton,
                isSelected && energyStyles.numberButtonSelected,
              ]}
            >
              <Text
                style={[
                  energyStyles.numberText,
                  isSelected && energyStyles.numberTextSelected,
                ]}
              >
                {level}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Labels */}
      <View style={energyStyles.labelsContainer}>
        <Text style={energyStyles.labelText}>Low</Text>
        <Text style={energyStyles.labelText}>High</Text>
      </View>
    </View>
  );
};

// Styles for the energy selector
const energyStyles = StyleSheet.create({
  container: {
    backgroundColor: "rgba(255, 255, 255, 0.7)",
    borderRadius: 16,
    padding: 14,
    marginTop: 10,
    alignSelf: "stretch",
    width: "100%",
    borderWidth: 1.5,
    borderColor: "rgba(255, 255, 255, 0.8)",
    shadowColor: "#522861",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 10,
    // Inner shadow effect
    borderTopColor: "rgba(255, 255, 255, 0.9)",
    borderLeftColor: "rgba(255, 255, 255, 0.9)",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
    gap: 6,
  },
  title: {
    fontSize: 14,
    fontWeight: "600",
    color: "#522861",
    flex: 1,
  },
  levelLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: COLORS.textSecondary,
  },
  numbersRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  numberButton: {
    width: 28,
    height: 32,
    borderRadius: 10,
    backgroundColor: "rgba(240, 235, 245, 0.8)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.6)",
  },
  numberButtonSelected: {
    backgroundColor: "#522861",
    borderColor: "#522861",
    shadowColor: "#522861",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  numberText: {
    fontSize: 12,
    fontWeight: "600",
    color: COLORS.textSecondary,
  },
  numberTextSelected: {
    color: "#fff",
  },
  labelsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  labelText: {
    fontSize: 11,
    color: COLORS.textMuted,
  },
});

// Styles for the emoji mood selector
const moodSelectorStyles = StyleSheet.create({
  container: {
    paddingVertical: 4,
    paddingHorizontal: 4,
    direction: "ltr",
    marginTop: -8,
  },
  lineContainer: {
    position: "absolute",
    left: 40,
    right: 40,
    top: 36,
    height: 2,
  },
  line: {
    flex: 1,
    height: 2,
    backgroundColor: "#E8E8E8",
    borderRadius: 1,
  },
  emojisRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "flex-start",
    direction: "ltr",
    writingDirection: "ltr",
  },
  connectorLine: {
    height: 2,
    backgroundColor: COLORS.primary + "30",
    flex: 1,
    marginTop: 30,
    marginHorizontal: -4,
    borderRadius: 1,
  },
  emojiButton: {
    alignItems: "center",
    minWidth: 56,
    paddingTop: 2,
  },
  glowEffect: {
    position: "absolute",
    top: 0,
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: COLORS.primary,
    opacity: 0.15,
  },
  emojiCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "transparent",
  },
  moodImage: {
    width: 56,
    height: 56,
  },
  moodImageInactive: {
    opacity: 0.3,
  },
  emoji: {
    fontSize: 36,
  },
  emojiInactive: {
    opacity: 0.4,
  },
  label: {
    fontSize: 11,
    color: "#9CA3AF",
    marginTop: 6,
    fontWeight: "500",
    letterSpacing: 0.2,
    textAlign: "center",
  },
  labelActive: {
    color: "#522861",
    fontWeight: "700",
    fontSize: 11,
  },
});

// Generate random stars
const generateStars = (count: number) => {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    size: Math.random() * 3 + 1.5,
    top: Math.random() * height * 0.3,
    left: Math.random() * width,
    delay: Math.random() * 2000,
  }));
};

// Get greeting based on time of day
const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
};

// Format today's date
const formatDate = () => {
  const today = new Date();
  const options: Intl.DateTimeFormatOptions = {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  };
  return today.toLocaleDateString("en-US", options);
};

interface ConsultationResult {
  empathyStatement: string;
  microStep: string;
  reasoning: string;
  chosenTaskId: string | null;
  contextLogId: string;
}

// Mood options with custom face images (Great to Terrible for RTL display)
const MOODS = [
  {
    id: "great",
    image: require("../../../assets/great.png"),
    label: "Great",
    color: "#10B981",
  },
  {
    id: "good",
    image: require("../../../assets/good.png"),
    label: "good",
    color: "#22C55E",
  },
  {
    id: "okay",
    image: require("../../../assets/okey.png"),
    label: "okay",
    color: "#EAB308",
  },
  {
    id: "bad",
    image: require("../../../assets/bad.png"),
    label: "bad",
    color: "#F97316",
  },
  {
    id: "terrible",
    image: require("../../../assets/terrible.png"),
    label: "terrible",
    color: "#EF4444",
  },
];

// Face images for each mood
const MOOD_FACES: Record<string, any> = {
  great: require("../../../assets/Great1.png"),
  good: require("../../../assets/good1.png"),
  okay: require("../../../assets/Okey1.png"),
  bad: require("../../../assets/Sad11.png"),
  terrible: require("../../../assets/Terrible1.png"),
};

// Check if a task is for today (comparing date strings to avoid timezone issues)
const isTaskForToday = (task: Task) => {
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(
    today.getMonth() + 1
  ).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

  if (task.due_date) {
    // Extract just the date part from due_date (YYYY-MM-DD) to avoid timezone issues
    // This handles both "2024-12-17" and "2024-12-17T00:00:00.000Z" formats
    const taskDateStr = task.due_date.substring(0, 10);
    return taskDateStr === todayStr;
  }

  // Tasks without due_date: only count if created today (consistent with getDailyStats)
  if (task.created_at) {
    const createdDateStr = task.created_at.substring(0, 10);
    return createdDateStr === todayStr;
  }

  // No date info, don't count as today
  return false;
};

// Filter tasks for "My Tasks Today" - shows only today's incomplete tasks
// When mood is low, filter to show only low energy tasks
const getFilteredTasks = (allTasks: Task[], mood: string | null) => {
  // Get today's incomplete tasks only
  const todayIncompleteTasks = allTasks.filter(
    (t) => !t.is_completed && isTaskForToday(t)
  );

  switch (mood) {
    case "terrible":
    case "bad":
      // When feeling bad or terrible: only show low energy tasks (energy_cost <= 3)
      return todayIncompleteTasks.filter((t) => t.energy_cost <= 3);
    case "great":
    case "good":
    case "okay":
    default:
      // Great/Good/Okay mood: Show all today's incomplete tasks
      return todayIncompleteTasks;
  }
};

// Get today's task stats only
const getDailyStats = (allTasks: Task[]) => {
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(
    today.getMonth() + 1
  ).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

  // Filter tasks for today only
  const todayTasks = allTasks.filter((t) => {
    if (t.due_date) {
      const taskDateStr = t.due_date.substring(0, 10);
      return taskDateStr === todayStr;
    }
    // Tasks without due_date: only count if created today
    if (t.created_at) {
      const createdDateStr = t.created_at.substring(0, 10);
      return createdDateStr === todayStr;
    }
    return false; // No date info, don't count
  });

  const completed = todayTasks.filter((t) => t.is_completed).length;
  const total = todayTasks.length;
  const remaining = todayTasks.filter((t) => !t.is_completed).length;
  const energySpent = todayTasks
    .filter((t) => t.is_completed)
    .reduce((sum, t) => sum + t.energy_cost, 0);
  const totalEnergy = todayTasks.reduce((sum, t) => sum + t.energy_cost, 0);

  return { completed, total, remaining, energySpent, totalEnergy };
};

// Get AI suggestion based on mood
const getAISuggestion = (
  mood: string | null,
  stats: { completed: number; total: number }
) => {
  const { completed, total } = stats;
  const remaining = total - completed;

  if (remaining === 0 && total > 0) {
    return {
      icon: "🎉",
      title: "All done!",
      message:
        "Amazing work today! You've completed all your tasks. Time to relax!",
    };
  }

  if (total === 0) {
    return {
      icon: "📝",
      title: "Fresh start",
      message:
        "No tasks scheduled for today. Add some goals to stay productive!",
    };
  }

  switch (mood) {
    case "great":
      return {
        icon: "🚀",
        title: "You're on fire!",
        message: `Great energy! Perfect time to tackle ${remaining} remaining task${
          remaining > 1 ? "s" : ""
        }. Go for the challenging ones!`,
      };
    case "good":
      return {
        icon: "🧘",
        title: "Steady progress",
        message: `You're in a good flow. ${remaining} task${
          remaining > 1 ? "s" : ""
        } left - take them one at a time.`,
      };
    case "okay":
      return {
        icon: "💪",
        title: "Keep going",
        message: `${remaining} task${
          remaining > 1 ? "s" : ""
        } remaining. Start with something easy to build momentum.`,
      };
    case "bad":
      return {
        icon: "🌿",
        title: "Take it slow",
        message:
          "Focus on just one small task. I've filtered out the overwhelming ones for you.",
      };
    case "terrible":
      return {
        icon: "💜",
        title: "Be gentle with yourself",
        message:
          "It's okay to do less today. I'm only showing gentle tasks. One small step is enough.",
      };
    default:
      return {
        icon: "✨",
        title: "Ready to go",
        message: `You have ${remaining} task${
          remaining > 1 ? "s" : ""
        } waiting. Pick what feels right!`,
      };
  }
};

// Generate week days for overview
const getWeekDays = () => {
  const days = [];
  const today = new Date();

  for (let i = 6; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(today.getDate() - i);
    date.setHours(0, 0, 0, 0);

    days.push({
      date,
      dayName: date.toLocaleDateString("en-US", { weekday: "short" }),
      dayNumber: date.getDate(),
      isToday: i === 0,
    });
  }

  return days;
};

// Get tasks for a specific day
const getTasksForDay = (allTasks: Task[], date: Date) => {
  const normalizedDate = new Date(date);
  normalizedDate.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return allTasks.filter((t) => {
    if (t.due_date) {
      const taskDate = new Date(t.due_date);
      taskDate.setHours(0, 0, 0, 0);
      return taskDate.getTime() === normalizedDate.getTime();
    }
    // Tasks without due_date only show on today
    return normalizedDate.getTime() === today.getTime();
  });
};

export default function ConsultationScreen() {
  const { user } = useAuth();
  const {
    tasks,
    fetchTasks,
    completeTask: completeTaskContext,
    updateTask,
  } = useTasks();
  const navigation = useNavigation();
  const [isLoading, setIsLoading] = useState(true);
  const [result, setResult] = useState<ConsultationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isCompleting, setIsCompleting] = useState(false);
  const [isRerolling, setIsRerolling] = useState(false);
  const [selectedMood, setSelectedMood] = useState<string | null>("okay");
  const [displayedMood, setDisplayedMood] = useState<string | null>("okay");
  const [completingTaskId, setCompletingTaskId] = useState<string | null>(null);
  const [energyLevel, setEnergyLevel] = useState<number>(5);

  // Edit task state
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editMotivation, setEditMotivation] = useState(2); // 0-4 scale
  const [editDifficulty, setEditDifficulty] = useState(2); // 0-4 scale
  const [isUpdating, setIsUpdating] = useState(false);

  // Motivation and difficulty mappings
  const MOTIVATION_LABELS = [
    "Not Motivated",
    "Low",
    "Moderate",
    "Motivated",
    "Highly Motivated",
  ];
  const MOTIVATION_ENERGY = [9, 7, 5, 3, 1]; // Energy cost for each level
  const DIFFICULTY_LABELS = [
    "Very Easy",
    "Easy",
    "Moderate",
    "Hard",
    "Very Hard",
  ];
  const DIFFICULTY_FRICTION: ("Low" | "Medium" | "High")[] = [
    "Low",
    "Low",
    "Medium",
    "High",
    "High",
  ];

  // Memoize stars
  const stars = useMemo(() => generateStars(25), []);

  // Animations
  const cardAnim = useRef(new Animated.Value(0)).current;
  const floatAnim = useRef(new Animated.Value(0)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;

  // Container entrance animations
  const moodSectionAnim = useRef(new Animated.Value(0)).current;
  const tasksSectionAnim = useRef(new Animated.Value(0)).current;
  const aiSectionAnim = useRef(new Animated.Value(0)).current;

  // Scroll-based animations
  const scrollY = useRef(new Animated.Value(0)).current;
  const tasksScrollAnim = useRef(new Animated.Value(0)).current;
  const weeklyScrollAnim = useRef(new Animated.Value(0)).current;
  const [tasksVisible, setTasksVisible] = useState(false);
  const [weeklyVisible, setWeeklyVisible] = useState(false);

  // Handle scroll to trigger animations
  const handleScroll = Animated.event(
    [{ nativeEvent: { contentOffset: { y: scrollY } } }],
    {
      useNativeDriver: false,
      listener: (event: any) => {
        const offsetY = event.nativeEvent.contentOffset.y;

        // Trigger weekly section animation when scrolled past 400px
        if (offsetY > 350 && !weeklyVisible) {
          setWeeklyVisible(true);
          Animated.spring(weeklyScrollAnim, {
            toValue: 1,
            friction: 6,
            tension: 50,
            useNativeDriver: true,
          }).start();
        }
      },
    }
  );

  useEffect(() => {
    fetchConsultation();
    startAnimations();
    fetchTasks(false); // Fetch incomplete tasks

    // Staggered entrance animations for containers
    Animated.stagger(150, [
      Animated.spring(moodSectionAnim, {
        toValue: 1,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }),
      Animated.spring(tasksSectionAnim, {
        toValue: 1,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }),
      Animated.spring(aiSectionAnim, {
        toValue: 1,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  // Update displayed mood immediately when selected mood changes (no animation)
  useEffect(() => {
    if (selectedMood) {
      setDisplayedMood(selectedMood);
    }
  }, [selectedMood]);

  const startAnimations = () => {
    // Card entrance
    Animated.spring(cardAnim, {
      toValue: 1,
      tension: 20,
      friction: 7,
      useNativeDriver: true,
    }).start();

    // Floating orb
    Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, {
          toValue: 1,
          duration: 3000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(floatAnim, {
          toValue: 0,
          duration: 3000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Slow rotation
    Animated.loop(
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 12000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();
  };

  const fetchConsultation = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await butlerApi.consult({
        current_mood: "okay",
        current_energy: 5,
        raw_input: "I need help deciding what to do next",
      });

      setResult({
        empathyStatement:
          response.empathy_statement || "I'm here to help you get started.",
        microStep:
          response.micro_step ||
          "Take a deep breath and just start with the smallest step.",
        reasoning: response.reasoning || "",
        chosenTaskId: response.chosen_task_id || null,
        contextLogId: response.context_log_id,
      });
    } catch (err: any) {
      console.error("Consultation error:", err);
      setError(err.message || "Failed to get recommendation");
    } finally {
      setIsLoading(false);
    }
  };

  const handleComplete = async () => {
    if (!result?.chosenTaskId) {
      // If no specific task, just reset and get new recommendation
      setResult(null);
      fetchConsultation();
      return;
    }

    setIsCompleting(true);
    try {
      await tasksApi.completeTask(result.chosenTaskId);
      setResult(null);
      fetchConsultation();
    } catch (err: any) {
      setError(err.message || "Failed to complete task");
    } finally {
      setIsCompleting(false);
    }
  };

  const handleReroll = async () => {
    setIsRerolling(true);
    cardAnim.setValue(0);

    try {
      const response = await butlerApi.consult({
        current_mood: "okay",
        current_energy: 5,
        raw_input:
          "Give me a different suggestion, I can't do the previous one right now",
      });

      setResult({
        empathyStatement:
          response.empathy_statement ||
          "I understand, let me suggest something else.",
        microStep:
          response.micro_step || "Take a deep breath and try this instead.",
        reasoning: response.reasoning || "",
        chosenTaskId: response.chosen_task_id || null,
        contextLogId: response.context_log_id,
      });

      // Animate new card in
      Animated.spring(cardAnim, {
        toValue: 1,
        tension: 20,
        friction: 7,
        useNativeDriver: true,
      }).start();
    } catch (err: any) {
      setError(err.message || "Failed to get new recommendation");
    } finally {
      setIsRerolling(false);
    }
  };

  // Handle completing a task from the task list with proper error handling
  const handleCompleteTask = async (taskId: string) => {
    setCompletingTaskId(taskId);
    try {
      await completeTaskContext(taskId);
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to complete task");
    } finally {
      setCompletingTaskId(null);
    }
  };

  // Convert energy cost to motivation level (reverse mapping)
  const energyToMotivation = (energy: number): number => {
    if (energy >= 8) return 0;
    if (energy >= 6) return 1;
    if (energy >= 4) return 2;
    if (energy >= 2) return 3;
    return 4;
  };

  // Convert emotional friction to difficulty level
  const frictionToDifficulty = (friction: string): number => {
    if (friction === "Low") return 1;
    if (friction === "Medium") return 2;
    if (friction === "High") return 3;
    return 2;
  };

  // Open edit modal for a task
  const handleEditTask = (task: Task) => {
    setEditingTask(task);
    setEditTitle(task.title);
    setEditMotivation(energyToMotivation(task.energy_cost));
    setEditDifficulty(frictionToDifficulty(task.emotional_friction));
    setShowEditModal(true);
  };

  // Helper to get tomorrow's date as ISO string
  const getTomorrowDateString = (): string => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const year = tomorrow.getFullYear();
    const month = String(tomorrow.getMonth() + 1).padStart(2, "0");
    const day = String(tomorrow.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}T00:00:00.000`;
  };

  // Update task
  const handleUpdateTask = async () => {
    if (!editingTask || !editTitle.trim()) return;

    const isHighDifficulty = editDifficulty >= 3; // Hard or Very Hard
    const isLowMood = selectedMood === "terrible" || selectedMood === "bad";

    // If mood is low and task is high difficulty, ask to transfer to tomorrow
    if (isHighDifficulty && isLowMood) {
      Alert.alert(
        "💜 Take Care of Yourself",
        "This task seems difficult. Would you like to transfer it to tomorrow?",
        [
          {
            text: "Yes, transfer",
            onPress: async () => {
              setIsUpdating(true);
              try {
                await updateTask(editingTask._id, {
                  title: editTitle.trim(),
                  energy_cost: MOTIVATION_ENERGY[editMotivation],
                  emotional_friction: DIFFICULTY_FRICTION[editDifficulty],
                  due_date: getTomorrowDateString(),
                });
                setShowEditModal(false);
                setEditingTask(null);
                setEditTitle("");
                setEditMotivation(2);
                setEditDifficulty(2);
                Alert.alert(
                  "✨ Task Transferred",
                  "The task has been moved to tomorrow. Take care of yourself today!"
                );
              } catch (err: any) {
                Alert.alert("Error", err.message || "Failed to update task");
              } finally {
                setIsUpdating(false);
              }
            },
          },
          {
            text: "No, keep it",
            onPress: () => {
              Alert.alert(
                "💪 Be Gentle",
                "Your mood is not at its best right now. This task might be hard for you today. Remember to take breaks and be kind to yourself!"
              );
            },
            style: "cancel",
          },
        ]
      );
      return;
    }

    // Normal update without mood warning
    setIsUpdating(true);
    try {
      await updateTask(editingTask._id, {
        title: editTitle.trim(),
        energy_cost: MOTIVATION_ENERGY[editMotivation],
        emotional_friction: DIFFICULTY_FRICTION[editDifficulty],
      });
      setShowEditModal(false);
      setEditingTask(null);
      setEditTitle("");
      setEditMotivation(2);
      setEditDifficulty(2);
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to update task");
    } finally {
      setIsUpdating(false);
    }
  };

  const floatTranslateY = floatAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -8],
  });

  const spin = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  const cardScale = cardAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.8, 1],
  });

  const cardOpacity = cardAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <StatusBar style="dark" />

      {/* Background */}
      <LinearGradient
        colors={["#ffffff", "#faf5ff", "#fdf4ff", "#ffffff"]}
        style={styles.backgroundGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />

      {/* Stars */}
      <View style={styles.starsContainer}>
        {stars.map((star) => (
          <Star
            key={star.id}
            size={star.size}
            top={star.top}
            left={star.left}
            delay={star.delay}
          />
        ))}
      </View>

      {/* App Header */}
      <View style={styles.appHeader}>
        <View style={styles.appHeaderLeft}>
          <Text style={styles.headerGreeting} numberOfLines={2}>
            {getGreeting()}, {user?.username || "there"}
          </Text>
        </View>
        <View style={styles.appHeaderCenter} />
        <View style={styles.appHeaderRight} />
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
      >
        {/* Greeting & Mood Section - Centralized */}
        <Animated.View
          style={[
            styles.headerSection,
            {
              opacity: moodSectionAnim,
              transform: [
                {
                  translateY: moodSectionAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [20, 0],
                  }),
                },
              ],
            },
          ]}
        >
          {/* Centered Orb Image with Face */}
          <Animated.View
            style={[
              styles.moodOrbContainer,
              { transform: [{ translateY: floatTranslateY }] },
            ]}
          >
            <Animated.Image
              source={require("../../../assets/signinImage.png")}
              style={[styles.moodOrbImage, { transform: [{ rotate: spin }] }]}
              resizeMode="contain"
            />
            {/* Face overlay - instant display without animation */}
            {displayedMood && MOOD_FACES[displayedMood] && (
              <Image
                source={MOOD_FACES[displayedMood]}
                style={styles.moodFaceOverlay}
                resizeMode="contain"
              />
            )}
          </Animated.View>

          <MoodImageSelector
            moods={MOODS}
            selectedMood={selectedMood}
            onSelect={setSelectedMood}
          />

          {/* Creative Energy Level Section */}
          <CreativeEnergySelector
            value={energyLevel}
            onChange={setEnergyLevel}
          />
        </Animated.View>

        {/* My Tasks Today Section */}
        <View style={[styles.tasksSection, styles.glassContainer]}>
          <View style={styles.tasksSectionHeader}>
            <View>
              <Text style={styles.tasksSectionTitle}>My Tasks Today</Text>
              <Text style={styles.tasksSectionDate}>{formatDate()}</Text>
              {selectedMood === "great" && (
                <Text style={styles.moodTaskHint}>
                  🚀 Great energy! All tasks visible
                </Text>
              )}
              {selectedMood === "good" && (
                <Text style={styles.moodTaskHint}>
                  🧘 Good flow! All tasks visible
                </Text>
              )}
              {selectedMood === "okay" && (
                <Text style={styles.moodTaskHint}>
                  💪 Keep going! All tasks visible
                </Text>
              )}
              {selectedMood === "bad" && (
                <Text style={styles.moodTaskHint}>
                  💜 Showing low energy tasks only
                </Text>
              )}
              {selectedMood === "terrible" && (
                <Text style={styles.moodTaskHint}>
                  💜 Showing low energy tasks only
                </Text>
              )}
            </View>
            <TouchableOpacity
              style={styles.addTaskButton}
              onPress={() => {
                (navigation as any).navigate("Tasks", { openModal: true });
              }}
              activeOpacity={0.7}
            >
              <Feather name="plus" size={18} color="#fff" />
              <Text style={styles.addTaskButtonText}>Add Task</Text>
            </TouchableOpacity>
          </View>

          {getFilteredTasks(tasks, selectedMood).length === 0 ? (
            <View style={styles.noTasksContainer}>
              <Feather name="check-circle" size={40} color={COLORS.textMuted} />
              <Text style={styles.noTasksText}>No tasks for today</Text>
              <Text style={styles.noTasksSubtext}>
                Tap "Add Task" to create one
              </Text>
            </View>
          ) : (
            <View style={styles.tasksList}>
              {getFilteredTasks(tasks, selectedMood)
                .slice(0, 5)
                .map((task) => (
                  <View key={task._id} style={styles.taskItem}>
                    {/* Checkbox - marks task as done */}
                    <TouchableOpacity
                      style={styles.taskCheckbox}
                      onPress={() => handleCompleteTask(task._id)}
                      disabled={completingTaskId === task._id}
                      activeOpacity={0.7}
                    >
                      {completingTaskId === task._id ? (
                        <Feather
                          name="check-circle"
                          size={22}
                          color="#522861"
                        />
                      ) : (
                        <Feather name="circle" size={22} color="#522861" />
                      )}
                    </TouchableOpacity>
                    {/* Task content - opens edit modal */}
                    <TouchableOpacity
                      style={styles.taskContentTouchable}
                      onPress={() => handleEditTask(task)}
                      activeOpacity={0.7}
                    >
                      <View style={styles.taskContent}>
                        <Text style={styles.taskTitle} numberOfLines={1}>
                          {task.title}
                        </Text>
                        <View style={styles.taskMeta}>
                          <View
                            style={[
                              styles.taskEnergy,
                              {
                                backgroundColor:
                                  task.energy_cost <= 3
                                    ? "#E8F5E9"
                                    : task.energy_cost <= 6
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
                                    task.energy_cost <= 3
                                      ? "#4CAF50"
                                      : task.energy_cost <= 6
                                      ? "#FF9800"
                                      : "#F44336",
                                },
                              ]}
                            >
                              ⚡ {task.energy_cost}
                            </Text>
                          </View>
                          <Text style={styles.taskFriction}>
                            {task.emotional_friction}
                          </Text>
                        </View>
                      </View>
                    </TouchableOpacity>
                  </View>
                ))}
              {getFilteredTasks(tasks, selectedMood).length > 5 && (
                <TouchableOpacity
                  style={styles.viewAllTasksButton}
                  onPress={() => {
                    (navigation as any).navigate("Tasks");
                  }}
                >
                  <Text style={styles.viewAllTasksText}>
                    View all {getFilteredTasks(tasks, selectedMood).length}{" "}
                    tasks
                  </Text>
                  <Feather
                    name="arrow-right"
                    size={16}
                    color={COLORS.primary}
                  />
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>

        {/* Today's Progress Section */}
        <View style={styles.progressSection}>
          <Text style={styles.progressSectionTitle}>Today's Progress</Text>

          {/* Stats Row */}
          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <View style={styles.statIconContainer}>
                <Feather name="list" size={20} color="#522861" />
              </View>
              <Text style={styles.statValue}>{getDailyStats(tasks).total}</Text>
              <Text style={styles.statLabel}>Today's Tasks</Text>
            </View>

            <View style={styles.statCard}>
              <View
                style={[
                  styles.statIconContainer,
                  { backgroundColor: "#E8F5E9" },
                ]}
              >
                <Feather name="check-circle" size={20} color={COLORS.success} />
              </View>
              <Text style={styles.statValue}>
                {getDailyStats(tasks).completed}
              </Text>
              <Text style={styles.statLabel}>Completed</Text>
            </View>

            <View style={styles.statCard}>
              <View
                style={[
                  styles.statIconContainer,
                  { backgroundColor: "#FFF3E0" },
                ]}
              >
                <Feather name="clock" size={20} color="#FF9800" />
              </View>
              <Text style={styles.statValue}>
                {getDailyStats(tasks).remaining}
              </Text>
              <Text style={styles.statLabel}>Remaining</Text>
            </View>
          </View>

          {/* Progress Bar */}
          <View style={styles.progressBarContainer}>
            <View style={styles.progressBarBackground}>
              <View
                style={[
                  styles.progressBarFill,
                  {
                    width: `${Math.round(
                      (getDailyStats(tasks).completed /
                        Math.max(getDailyStats(tasks).total, 1)) *
                        100
                    )}%`,
                  },
                ]}
              />
            </View>
            <Text style={styles.progressPercentage}>
              {Math.round(
                (getDailyStats(tasks).completed /
                  Math.max(getDailyStats(tasks).total, 1)) *
                  100
              )}
              % Complete
            </Text>
          </View>

          {/* AI Suggestion */}
          <View style={styles.aiSuggestionCard}>
            <Text style={styles.aiSuggestionIcon}>
              {getAISuggestion(selectedMood, getDailyStats(tasks)).icon}
            </Text>
            <View style={styles.aiSuggestionContent}>
              <Text style={styles.aiSuggestionTitle}>
                {getAISuggestion(selectedMood, getDailyStats(tasks)).title}
              </Text>
              <Text style={styles.aiSuggestionMessage}>
                {getAISuggestion(selectedMood, getDailyStats(tasks)).message}
              </Text>
            </View>
          </View>
        </View>

        {/* Weekly Overview Section */}
        <Animated.View
          style={[
            styles.weeklySection,
            styles.glassContainer,
            {
              opacity: weeklyScrollAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [0, 1],
              }),
              transform: [
                {
                  translateY: weeklyScrollAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [50, 0],
                  }),
                },
                {
                  scale: weeklyScrollAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.9, 1],
                  }),
                },
              ],
            },
          ]}
        >
          <Text style={styles.weeklySectionTitle}>This Week</Text>

          <View style={styles.weekDaysRow}>
            {getWeekDays().map((day, index) => {
              const dayTasks = getTasksForDay(tasks, day.date);
              const completedCount = dayTasks.filter(
                (t) => t.is_completed
              ).length;
              const totalCount = dayTasks.length;
              const progress = totalCount > 0 ? completedCount / totalCount : 0;

              return (
                <View
                  key={index}
                  style={[
                    styles.weekDayCard,
                    day.isToday && styles.weekDayCardToday,
                  ]}
                >
                  <Text
                    style={[
                      styles.weekDayName,
                      day.isToday && styles.weekDayNameToday,
                    ]}
                  >
                    {day.dayName}
                  </Text>
                  <Text
                    style={[
                      styles.weekDayNumber,
                      day.isToday && styles.weekDayNumberToday,
                    ]}
                  >
                    {day.dayNumber}
                  </Text>

                  {/* Progress indicator */}
                  <View style={styles.weekDayProgress}>
                    <View
                      style={[
                        styles.weekDayProgressFill,
                        {
                          height: `${Math.max(
                            progress * 100,
                            totalCount > 0 ? 10 : 0
                          )}%`,
                          backgroundColor:
                            progress === 1 ? COLORS.success : COLORS.primary,
                        },
                      ]}
                    />
                  </View>

                  <Text style={styles.weekDayTaskCount}>
                    {totalCount > 0 ? `${completedCount}/${totalCount}` : "-"}
                  </Text>
                </View>
              );
            })}
          </View>

          {/* Weekly Summary */}
          <View style={styles.weeklySummary}>
            <Feather name="trending-up" size={16} color={COLORS.primary} />
            <Text style={styles.weeklySummaryText}>
              {tasks.filter((t) => t.is_completed).length} tasks completed this
              week
            </Text>
          </View>
        </Animated.View>

        {/* Main Content */}
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={styles.loadingText}>Consulting SIMI...</Text>
          </View>
        ) : error ? (
          <View style={styles.errorContainer}>
            <MaterialIcons
              name="error-outline"
              size={48}
              color={COLORS.error}
            />
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity
              style={styles.retryButton}
              onPress={fetchConsultation}
            >
              <Text style={styles.retryButtonText}>Try Again</Text>
            </TouchableOpacity>
          </View>
        ) : result ? (
          <Animated.View
            style={[
              styles.heroCard,
              {
                transform: [{ scale: cardScale }],
                opacity: cardOpacity,
              },
            ]}
          >
            {/* Empathy Statement */}
            <View style={styles.empathySection}>
              <MaterialIcons name="favorite" size={20} color={COLORS.primary} />
              <Text style={styles.empathyText}>{result.empathyStatement}</Text>
            </View>

            {/* Divider */}
            <View style={styles.divider} />

            {/* Micro Step - THE HERO */}
            <View style={styles.microStepSection}>
              <Text style={styles.microStepLabel}>JUST DO THIS:</Text>
              <Text style={styles.microStepText}>{result.microStep}</Text>
            </View>

            {/* Reasoning */}
            {result.reasoning ? (
              <View style={styles.reasoningSection}>
                <Text style={styles.reasoningText}>{result.reasoning}</Text>
              </View>
            ) : null}
          </Animated.View>
        ) : null}

        {/* Action Buttons */}
        {result && !isLoading && (
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={[styles.actionButton, styles.completeButton]}
              onPress={handleComplete}
              disabled={isCompleting || isRerolling}
              activeOpacity={0.8}
            >
              {isCompleting ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <MaterialIcons name="check" size={22} color="#fff" />
                  <Text style={styles.completeButtonText}>I'll do it</Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, styles.rerollButton]}
              onPress={handleReroll}
              disabled={isCompleting || isRerolling}
              activeOpacity={0.8}
            >
              {isRerolling ? (
                <ActivityIndicator color={COLORS.text} size="small" />
              ) : (
                <>
                  <MaterialIcons name="refresh" size={22} color={COLORS.text} />
                  <Text style={styles.rerollButtonText}>I can't</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* Edit Task Modal */}
      <Modal
        visible={showEditModal}
        animationType="fade"
        transparent
        onRequestClose={() => setShowEditModal(false)}
      >
        <TouchableOpacity
          style={styles.editModalOverlay}
          activeOpacity={1}
          onPress={() => setShowEditModal(false)}
        >
          <TouchableOpacity
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
            style={styles.editModalScrollContent}
          >
            <View style={styles.editModalContent}>
              <View style={styles.editModalHeader}>
                <View>
                  <Text style={styles.editModalTitle}>✏️ Edit Task</Text>
                </View>
                <TouchableOpacity
                  onPress={() => {
                    setShowEditModal(false);
                    setEditingTask(null);
                    setEditTitle("");
                  }}
                  style={styles.editModalCloseButton}
                >
                  <Feather name="x" size={20} color="#522861" />
                </TouchableOpacity>
              </View>

              <ScrollView
                showsVerticalScrollIndicator={false}
                style={styles.editModalScroll}
              >
                {/* Task Title */}
                <Text style={styles.editModalLabel}>Task Title</Text>
                <TextInput
                  style={styles.editModalInput}
                  value={editTitle}
                  onChangeText={setEditTitle}
                  placeholder="What needs to be done?"
                  placeholderTextColor="#9ca3af"
                />

                {/* Motivation Level */}
                <Text style={styles.editModalLabel}>
                  💪 Motivation: {MOTIVATION_LABELS[editMotivation]}
                </Text>
                <View style={styles.editSliderRow}>
                  {[0, 1, 2, 3, 4].map((level) => (
                    <TouchableOpacity
                      key={level}
                      style={[
                        styles.editSliderButton,
                        editMotivation === level &&
                          styles.editSliderButtonActive,
                      ]}
                      onPress={() => setEditMotivation(level)}
                    >
                      <Text
                        style={[
                          styles.editSliderButtonText,
                          editMotivation === level &&
                            styles.editSliderButtonTextActive,
                        ]}
                      >
                        {level + 1}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <View style={styles.editSliderLabels}>
                  <Text style={styles.editSliderLabelText}>Low</Text>
                  <Text style={styles.editSliderLabelText}>High</Text>
                </View>

                {/* Difficulty Level */}
                <Text style={styles.editModalLabel}>
                  🎯 Difficulty: {DIFFICULTY_LABELS[editDifficulty]}
                </Text>
                <View style={styles.editSliderRow}>
                  {[0, 1, 2, 3, 4].map((level) => (
                    <TouchableOpacity
                      key={level}
                      style={[
                        styles.editSliderButton,
                        editDifficulty === level &&
                          styles.editSliderButtonActive,
                      ]}
                      onPress={() => setEditDifficulty(level)}
                    >
                      <Text
                        style={[
                          styles.editSliderButtonText,
                          editDifficulty === level &&
                            styles.editSliderButtonTextActive,
                        ]}
                      >
                        {level + 1}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <View style={styles.editSliderLabels}>
                  <Text style={styles.editSliderLabelText}>Easy</Text>
                  <Text style={styles.editSliderLabelText}>Hard</Text>
                </View>
              </ScrollView>

              {/* Buttons */}
              <View style={styles.editModalButtons}>
                <TouchableOpacity
                  style={styles.editModalCancelButton}
                  onPress={() => {
                    setShowEditModal(false);
                    setEditingTask(null);
                    setEditTitle("");
                  }}
                >
                  <Text style={styles.editModalCancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.editModalSaveButton,
                    (!editTitle.trim() || isUpdating) &&
                      styles.editModalSaveButtonDisabled,
                  ]}
                  onPress={handleUpdateTask}
                  disabled={!editTitle.trim() || isUpdating}
                >
                  {isUpdating ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Text style={styles.editModalSaveText}>Save</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  glassContainer: {
    backgroundColor: "rgba(255, 255, 255, 0.85)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.5)",
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 8,
  },
  backgroundGradient: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  starsContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: height * 0.3,
  },
  star: {
    position: "absolute",
    backgroundColor: COLORS.primaryLight,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
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
    flex: 1,
    minWidth: 0,
  },
  headerGreeting: {
    fontSize: 20,
    fontWeight: "600",
    color: "#522861",
    letterSpacing: 0.3,
  },
  appHeaderCenter: {
    flex: 1,
  },
  appHeaderRight: {
    alignItems: "center",
    justifyContent: "center",
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  header: {
    alignItems: "center",
    paddingTop: 12,
    paddingBottom: 8,
  },
  title: {
    fontSize: 22,
    fontWeight: "600",
    color: COLORS.text,
    letterSpacing: -0.3,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: COLORS.textSecondary,
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  errorText: {
    marginTop: 12,
    fontSize: 15,
    color: COLORS.textSecondary,
    textAlign: "center",
  },
  retryButton: {
    marginTop: 20,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: COLORS.primary,
    borderRadius: 12,
  },
  retryButtonText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "600",
  },
  heroCard: {
    backgroundColor: "#fff",
    borderRadius: 24,
    padding: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  empathySection: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    marginBottom: 16,
  },
  empathyText: {
    flex: 1,
    fontSize: 15,
    color: COLORS.textSecondary,
    lineHeight: 22,
    fontStyle: "italic",
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: 16,
  },
  microStepSection: {
    marginBottom: 20,
  },
  microStepLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#522861",
    letterSpacing: 1.5,
    marginBottom: 8,
  },
  microStepText: {
    fontSize: 20,
    fontWeight: "600",
    color: COLORS.text,
    lineHeight: 28,
  },
  reasoningSection: {
    backgroundColor: COLORS.backgroundSecondary,
    borderRadius: 12,
    padding: 16,
  },
  reasoningText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    lineHeight: 21,
  },
  actionButtons: {
    flexDirection: "row",
    gap: 12,
    marginTop: 24,
    paddingBottom: 24,
  },
  actionButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    borderRadius: 16,
    gap: 8,
  },
  completeButton: {
    backgroundColor: COLORS.success,
  },
  completeButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  rerollButton: {
    backgroundColor: COLORS.backgroundSecondary,
    borderWidth: 1,
    borderColor: COLORS.borderDark,
  },
  rerollButtonText: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: "600",
  },
  headerSection: {
    alignItems: "center",
    marginBottom: 10,
    marginTop: -40,
    paddingHorizontal: 0,
  },
  greetingSection: {
    marginBottom: 20,
    paddingHorizontal: 4,
  },
  greetingText: {
    fontSize: 22,
    fontWeight: "300",
    color: COLORS.text,
    marginBottom: 4,
    letterSpacing: 0.5,
    fontStyle: "italic",
    textAlign: "center",
  },
  dateText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 6,
    textAlign: "center",
  },
  moodSection: {
    marginBottom: 24,
    borderRadius: 28,
    padding: 24,
    paddingTop: 20,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
    overflow: "hidden",
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "rgba(168, 85, 247, 0.1)",
  },
  moodSectionSimple: {
    marginBottom: 24,
    paddingHorizontal: 8,
  },
  moodGradient: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 28,
  },
  moodQuestion: {
    fontSize: 15,
    fontWeight: "300",
    color: "#522861",
    textAlign: "center",
    letterSpacing: 0.5,
    fontStyle: "italic",
  },
  moodOrbContainer: {
    width: 350,
    height: 350,
    alignSelf: "center",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
    marginTop: 8,
  },
  moodOrbImage: {
    width: 280,
    height: 280,
    alignSelf: "center",
  },
  moodFaceOverlay: {
    position: "absolute",
    width: 280,
    height: 280,
    top: "50%",
    left: "50%",
    marginTop: -140,
    marginLeft: -140,
  },
  moodOptions: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 2,
    marginTop: 8,
    gap: 6,
  },
  moodCard: {
    flex: 1,
    borderRadius: 16,
    overflow: "hidden",
  },
  moodCardSelected: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  moodCardGradient: {
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 6,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: "#EBEBEB",
  },
  moodIconWrapper: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  moodCardLabel: {
    fontSize: 11,
    fontWeight: "500",
    color: "#888",
    letterSpacing: 0.1,
    textAlign: "center",
  },
  moodButton: {
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.8)",
    minWidth: 56,
    borderWidth: 1.5,
    borderColor: "rgba(168, 85, 247, 0.1)",
  },
  moodButtonSelected: {
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    borderColor: COLORS.primary,
    transform: [{ scale: 1.08 }],
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  moodIcon: {
    marginBottom: 6,
  },
  moodLabel: {
    fontSize: 10,
    color: COLORS.textSecondary,
    fontWeight: "500",
    letterSpacing: 0.3,
  },
  moodLabelSelected: {
    color: "#522861",
    fontWeight: "700",
  },
  // Tasks Section Styles
  tasksSection: {
    marginBottom: 16,
    backgroundColor: "rgba(255, 255, 255, 0.7)",
    borderRadius: 16,
    padding: 14,
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
  tasksSectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  tasksSectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#522861",
    letterSpacing: 0.3,
  },
  tasksSectionDate: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  moodTaskHint: {
    fontSize: 12,
    color: "#522861",
    marginTop: 4,
    fontStyle: "italic",
  },
  addTaskButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#522861",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
    gap: 4,
  },
  addTaskButtonText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "600",
  },
  noTasksContainer: {
    alignItems: "center",
    paddingVertical: 30,
  },
  noTasksText: {
    fontSize: 16,
    color: COLORS.textSecondary,
    marginTop: 12,
    fontWeight: "500",
  },
  noTasksSubtext: {
    fontSize: 13,
    color: COLORS.textMuted,
    marginTop: 4,
  },
  tasksList: {
    gap: 8,
  },
  taskItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(240, 235, 245, 0.8)",
    padding: 10,
    borderRadius: 12,
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
    color: "#522861",
    marginBottom: 2,
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
  viewAllTasksButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    gap: 6,
  },
  viewAllTasksText: {
    fontSize: 14,
    color: "#522861",
    fontWeight: "500",
  },
  // Daily Progress Section Styles
  progressSection: {
    marginBottom: 24,
    backgroundColor: "rgba(255, 255, 255, 0.7)",
    borderRadius: 24,
    padding: 20,
    borderWidth: 1.5,
    borderColor: "rgba(255, 255, 255, 0.8)",
    borderTopColor: "rgba(255, 255, 255, 0.9)",
    borderLeftColor: "rgba(255, 255, 255, 0.9)",
    shadowColor: "#522861",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 10,
  },
  progressSectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: COLORS.text,
    marginBottom: 16,
  },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    alignItems: "center",
    padding: 12,
    marginHorizontal: 4,
    backgroundColor: "rgba(240, 235, 245, 0.8)",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.6)",
  },
  statIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#E8F5E9",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  statValue: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.text,
  },
  statLabel: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  progressBarContainer: {
    marginTop: 16,
    alignItems: "center",
  },
  progressBarBackground: {
    width: "100%",
    height: 8,
    backgroundColor: "rgba(82, 40, 97, 0.1)",
    borderRadius: 4,
    overflow: "hidden",
  },
  progressBarFill: {
    height: "100%",
    backgroundColor: "#522861",
    borderRadius: 4,
  },
  progressPercentage: {
    marginTop: 8,
    fontSize: 13,
    fontWeight: "600",
    color: "#522861",
  },
  aiSuggestionCard: {
    flexDirection: "row",
    backgroundColor: "rgba(168, 85, 247, 0.08)",
    borderRadius: 16,
    padding: 16,
    alignItems: "flex-start",
    borderWidth: 1,
    borderColor: "rgba(168, 85, 247, 0.15)",
  },
  aiSuggestionIcon: {
    fontSize: 28,
    marginRight: 12,
  },
  aiSuggestionContent: {
    flex: 1,
  },
  aiSuggestionTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: COLORS.text,
    marginBottom: 4,
  },
  aiSuggestionMessage: {
    fontSize: 13,
    color: COLORS.textSecondary,
    lineHeight: 18,
  },
  // Weekly Overview Section Styles
  weeklySection: {
    marginBottom: 24,
    backgroundColor: "rgba(255, 255, 255, 0.7)",
    borderRadius: 24,
    padding: 20,
    borderWidth: 1.5,
    borderColor: "rgba(255, 255, 255, 0.8)",
    borderTopColor: "rgba(255, 255, 255, 0.9)",
    borderLeftColor: "rgba(255, 255, 255, 0.9)",
    shadowColor: "#522861",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 10,
  },
  weeklySectionTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#522861",
    marginBottom: 16,
    letterSpacing: 0.3,
  },
  weekDaysRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  weekDayCard: {
    alignItems: "center",
    flex: 1,
    marginHorizontal: 2,
  },
  weekDayCardToday: {
    backgroundColor: "rgba(82, 40, 97, 0.1)",
    borderRadius: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: "rgba(82, 40, 97, 0.15)",
  },
  weekDayName: {
    fontSize: 10,
    color: COLORS.textSecondary,
    fontWeight: "500",
    marginBottom: 2,
  },
  weekDayNameToday: {
    color: "#522861",
    fontWeight: "600",
  },
  weekDayNumber: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.text,
    marginBottom: 8,
  },
  weekDayNumberToday: {
    color: "#522861",
  },
  weekDayProgress: {
    width: 8,
    height: 40,
    backgroundColor: COLORS.backgroundSecondary,
    borderRadius: 4,
    overflow: "hidden",
    justifyContent: "flex-end",
  },
  weekDayProgressFill: {
    width: "100%",
    borderRadius: 4,
  },
  weekDayTaskCount: {
    fontSize: 9,
    color: COLORS.textMuted,
    marginTop: 4,
  },
  weeklySummary: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    gap: 6,
  },
  weeklySummaryText: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  // Edit Modal Styles
  editModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.4)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 16,
  },
  editModalScrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    width: "100%",
    maxWidth: width - 32,
  },
  editModalContent: {
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    borderRadius: 28,
    padding: 20,
    width: "100%",
    shadowColor: "#522861",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.25,
    shadowRadius: 30,
    elevation: 15,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.8)",
  },
  editModalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(82, 40, 97, 0.1)",
  },
  editModalTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#522861",
  },
  editModalCloseButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(82, 40, 97, 0.08)",
    alignItems: "center",
    justifyContent: "center",
  },
  editModalScroll: {
    maxHeight: 350,
  },
  editModalLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#522861",
    marginBottom: 8,
    marginTop: 14,
  },
  editModalInput: {
    backgroundColor: "rgba(240, 235, 245, 0.9)",
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: "#1f2937",
    borderWidth: 1.5,
    borderColor: "rgba(82, 40, 97, 0.15)",
  },
  editSliderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 6,
  },
  editSliderButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: "rgba(240, 235, 245, 0.9)",
    borderWidth: 1.5,
    borderColor: "rgba(82, 40, 97, 0.15)",
    alignItems: "center",
  },
  editSliderButtonActive: {
    backgroundColor: "#522861",
    borderColor: "#522861",
  },
  editSliderButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#522861",
  },
  editSliderButtonTextActive: {
    color: "#fff",
  },
  editSliderLabels: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 4,
    marginBottom: 4,
  },
  editSliderLabelText: {
    fontSize: 11,
    color: "#9ca3af",
  },
  editDateScroll: {
    marginBottom: 16,
  },
  editDateButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: "rgba(240, 235, 245, 0.9)",
    borderWidth: 1.5,
    borderColor: "rgba(82, 40, 97, 0.15)",
    marginRight: 6,
  },
  editDateButtonActive: {
    backgroundColor: "#522861",
    borderColor: "#522861",
  },
  editDateButtonText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#522861",
  },
  editDateButtonTextActive: {
    color: "#fff",
  },
  editModalButtons: {
    flexDirection: "row",
    gap: 10,
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "rgba(82, 40, 97, 0.1)",
  },
  editModalCancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: "rgba(82, 40, 97, 0.08)",
    alignItems: "center",
  },
  editModalCancelText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#522861",
  },
  editModalSaveButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: "#522861",
    alignItems: "center",
    shadowColor: "#522861",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  editModalSaveButtonDisabled: {
    opacity: 0.5,
  },
  editModalSaveText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#fff",
  },
});
