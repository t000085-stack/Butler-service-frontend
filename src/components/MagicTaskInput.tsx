import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Animated,
  Alert,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { COLORS } from "../constants/config";
import * as tasksApi from "../api/tasks";

// expo-speech-recognition requires a development build (not Expo Go)
// Run: npx expo install expo-speech-recognition
// Then: npx expo run:android (or eas build)
let ExpoSpeechRecognitionModule: any = null;
let useSpeechRecognitionEvent: any = null;
let voiceAvailable = false;

try {
  const speechModule = require("expo-speech-recognition");
  ExpoSpeechRecognitionModule = speechModule.ExpoSpeechRecognitionModule;
  useSpeechRecognitionEvent = speechModule.useSpeechRecognitionEvent;
  // Check if the native module is actually available
  voiceAvailable =
    ExpoSpeechRecognitionModule != null &&
    typeof ExpoSpeechRecognitionModule.requestPermissionsAsync === "function";
} catch (e) {
  console.log(
    "expo-speech-recognition not available (requires development build)"
  );
}

export interface ParsedTaskData {
  title: string;
  energy_cost: number;
  emotional_friction: "Low" | "Medium" | "High";
  due_date?: string;
  originalText?: string; // Original input text for frontend date parsing
}

interface MagicTaskInputProps {
  onTaskParsed: (data: ParsedTaskData) => void;
  onError?: (error: string) => void;
  placeholder?: string;
}

export default function MagicTaskInput({
  onTaskParsed,
  onError,
  placeholder = "Describe your task or tap the mic...",
}: MagicTaskInputProps) {
  const [text, setText] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [transcript, setTranscript] = useState("");
  const pulseAnim = useState(new Animated.Value(1))[0];

  // Setup speech recognition events if available
  useEffect(() => {
    if (!useSpeechRecognitionEvent) return;

    // This will be set up when the component mounts
  }, []);

  // Pulse animation for mic button when listening
  useEffect(() => {
    if (isListening) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.2,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      pulseAnim.setValue(1);
    }
  }, [isListening]);

  const startListening = async () => {
    if (!voiceAvailable) {
      Alert.alert(
        "Voice Not Available",
        "Voice input requires a development build.\n\nTo enable:\n1. Run: npx expo run:android\n\nFor now, type your task description instead."
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

      setIsListening(true);
      setTranscript("");

      ExpoSpeechRecognitionModule.start({
        lang: "en-US",
        interimResults: true,
        maxAlternatives: 1,
      });
    } catch (error: any) {
      console.error("Speech recognition error:", error);
      setIsListening(false);
      onError?.("Failed to start voice recognition");
    }
  };

  const stopListening = () => {
    if (ExpoSpeechRecognitionModule) {
      ExpoSpeechRecognitionModule.stop();
    }
    setIsListening(false);

    // Use transcript if available
    if (transcript) {
      setText(transcript);
    }
  };

  const handleSend = async () => {
    const inputText = text.trim();
    if (!inputText) {
      onError?.("Please enter or speak a task description");
      return;
    }

    setIsParsing(true);

    try {
      const parsedData = await tasksApi.parseTask(inputText);
      // Include original text for frontend date parsing
      onTaskParsed({ ...parsedData, originalText: inputText });
      setText("");
      setTranscript("");
    } catch (error: any) {
      console.error("Parse error:", error);
      onError?.(error.message || "Failed to parse task");
    } finally {
      setIsParsing(false);
    }
  };

  // Handle speech recognition results
  if (useSpeechRecognitionEvent) {
    useSpeechRecognitionEvent("result", (event: any) => {
      const newTranscript = event.results?.[0]?.transcript || "";
      setTranscript(newTranscript);
      if (event.isFinal) {
        setText(newTranscript);
        setIsListening(false);
      }
    });

    useSpeechRecognitionEvent("end", () => {
      setIsListening(false);
    });

    useSpeechRecognitionEvent("error", (event: any) => {
      console.error("Speech error:", event);
      setIsListening(false);
      onError?.("Voice recognition error");
    });
  }

  const displayText = isListening && transcript ? transcript : text;

  return (
    <View style={styles.container}>
      <View style={styles.inputRow}>
        <View style={styles.inputWrapper}>
          <TextInput
            style={styles.input}
            placeholder={placeholder}
            placeholderTextColor={COLORS.textMuted}
            value={displayText}
            onChangeText={setText}
            multiline={true}
            numberOfLines={2}
            editable={!isListening && !isParsing}
            textAlignVertical="top"
          />
          {isListening && (
            <View style={styles.listeningIndicator}>
              <Text style={styles.listeningText}>Listening...</Text>
            </View>
          )}
        </View>

        <View style={styles.buttons}>
          {/* Mic Button - shown but disabled if voice not available */}
          <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
            <TouchableOpacity
              style={[
                styles.micButton,
                isListening && styles.micButtonActive,
                !voiceAvailable && styles.micButtonDisabled,
              ]}
              onPress={isListening ? stopListening : startListening}
              disabled={isParsing}
            >
              <MaterialIcons
                name={isListening ? "mic" : "mic-none"}
                size={20}
                color={
                  isListening
                    ? "#fff"
                    : voiceAvailable
                    ? COLORS.primary
                    : COLORS.textMuted
                }
              />
            </TouchableOpacity>
          </Animated.View>

          {/* Send Button */}
          <TouchableOpacity
            style={[
              styles.sendButton,
              (!displayText.trim() || isParsing) && styles.sendButtonDisabled,
            ]}
            onPress={handleSend}
            disabled={!displayText.trim() || isParsing}
          >
            {isParsing ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <MaterialIcons name="send" size={18} color="#fff" />
            )}
          </TouchableOpacity>
        </View>
      </View>

      <Text style={styles.hint}>
        ✨ AI will extract task details from your description
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 0,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  inputWrapper: {
    flex: 1,
    backgroundColor: "rgba(240, 235, 245, 0.9)",
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "rgba(255, 255, 255, 0.7)",
    minHeight: 50,
    maxHeight: 80,
  },
  input: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: COLORS.text,
    minHeight: 50,
    maxHeight: 80,
    textAlignVertical: "top",
  },
  listeningIndicator: {
    position: "absolute",
    top: 6,
    right: 10,
    backgroundColor: "rgba(82, 40, 97, 0.1)",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  listeningText: {
    fontSize: 10,
    color: COLORS.primary,
    fontWeight: "600",
  },
  buttons: {
    flexDirection: "row",
    gap: 8,
  },
  micButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "rgba(82, 40, 97, 0.1)",
    borderWidth: 1.5,
    borderColor: "rgba(82, 40, 97, 0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  micButtonActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  micButtonDisabled: {
    borderColor: COLORS.textMuted,
    opacity: 0.5,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  sendButtonDisabled: {
    backgroundColor: COLORS.textMuted,
    shadowOpacity: 0,
    elevation: 0,
  },
  hint: {
    marginTop: 8,
    fontSize: 12,
    color: COLORS.textMuted,
    textAlign: "center",
  },
});
