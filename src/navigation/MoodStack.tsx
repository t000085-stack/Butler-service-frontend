import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import MoodScreen from "../screens/Mood/MoodScreen";
import MoodEntryScreen from "../screens/Mood/MoodEntryScreen";

export type MoodStackParamList = {
  Mood: undefined;
  MoodEntry: { entryId?: string } | undefined;
};

const Stack = createNativeStackNavigator<MoodStackParamList>();

export default function MoodStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="Mood" component={MoodScreen} />
      <Stack.Screen name="MoodEntry" component={MoodEntryScreen} />
    </Stack.Navigator>
  );
}
