import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import ConsultationScreen from "../screens/butler/ConsultationScreen";
import TaskListScreen from "../screens/tasks/TaskListScreen";
import ChatScreen from "../screens/chat/ChatScreen";
import ProfileScreen from "../screens/profile/ProfileScreen";
import { COLORS } from "../constants/config";

export type MainTabsParamList = {
  Home: undefined;
  Chat: undefined;
  Tasks: undefined;
  Profile: undefined;
};

const Tab = createBottomTabNavigator<MainTabsParamList>();

function TabIcon({ label, focused }: { label: string; focused: boolean }) {
  const iconMap: Record<string, keyof typeof MaterialIcons.glyphMap> = {
    Home: "home",
    Chat: "chat-bubble",
    Tasks: "checklist",
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
          paddingTop: 8,
        },
        tabBarLabelStyle: styles.tabLabel,
      })}
    >
      <Tab.Screen
        name="Home"
        component={ConsultationScreen}
        options={{ tabBarLabel: "Home" }}
      />
      <Tab.Screen
        name="Chat"
        component={ChatScreen}
        options={{ tabBarLabel: "Chat" }}
      />
      <Tab.Screen
        name="Tasks"
        component={TaskListScreen}
        options={{ tabBarLabel: "Tasks" }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{ tabBarLabel: "Profile" }}
      />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: COLORS.background,
    borderTopColor: COLORS.border,
    borderTopWidth: 0,
    paddingTop: 8,
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: "500",
    marginTop: 2,
  },
});
