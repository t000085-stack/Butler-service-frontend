import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import ConsultScreen from "../screens/butler/ConsultScreen";
import TaskListScreen from "../screens/tasks/TaskListScreen";
import ProfileScreen from "../screens/profile/ProfileScreen";
import MoodStack from "./MoodStack";
import { COLORS } from "../constants/config";

export type MainTabsParamList = {
  Simi: undefined;
  Tasks: undefined;
  Mood: undefined;
  Profile: undefined;
};

const Tab = createBottomTabNavigator<MainTabsParamList>();

function TabIcon({ label, focused }: { label: string; focused: boolean }) {
  const iconMap: Record<string, keyof typeof MaterialIcons.glyphMap> = {
    Simi: "support-agent",
    Tasks: "checklist",
    Mood: "mood",
    Profile: "person",
  };

  const iconName = iconMap[label] || "help";

  return (
    <MaterialIcons
      name={iconName}
      size={24}
      color={focused ? COLORS.primary : COLORS.textMuted}
    />
  );
}

export default function MainTabs() {
  const insets = useSafeAreaInsets();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ focused }) => (
          <TabIcon label={route.name} focused={focused} />
        ),
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.textMuted,
        tabBarStyle: {
          ...styles.tabBar,
          height: 60 + insets.bottom,
          paddingBottom: insets.bottom,
        },
        tabBarLabelStyle: styles.tabLabel,
      })}
    >
      <Tab.Screen name="Simi" component={ConsultScreen} />
      <Tab.Screen name="Tasks" component={TaskListScreen} />
      <Tab.Screen name="Mood" component={MoodStack} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: COLORS.background,
    borderTopColor: COLORS.border,
    paddingTop: 8,
  },
  tabLabel: {
    fontSize: 12,
    fontWeight: "500",
    marginTop: 4,
  },
});
