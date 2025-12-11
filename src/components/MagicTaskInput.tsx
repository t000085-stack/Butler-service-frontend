import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Animated,
  Alert,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { COLORS } from '../constants/config';
import * as tasksApi from '../api/tasks';

// Note: expo-speech-recognition needs to be installed
// Run: npx expo install expo-speech-recognition
let ExpoSpeechRecognitionModule: any = null;
let useSpeechRecognitionEvent: any = null;

try {
  const speechModule = require('expo-speech-recognition');
  ExpoSpeechRecognitionModule = speechModule.ExpoSpeechRecognitionModule;
  useSpeechRecognitionEvent = speechModule.useSpeechRecognitionEvent;
} catch (e) {
  console.log('expo-speech-recognition not installed');
}

export interface ParsedTaskData {
  title: string;
  energy_cost: number;
  emotional_friction: 'Low' | 'Medium' | 'High';
  due_date?: string;
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
  const [text, setText] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [transcript, setTranscript] = useState('');
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
    if (!ExpoSpeechRecognitionModule) {
      Alert.alert(
        'Voice Not Available',
        'Please install expo-speech-recognition:\nnpx expo install expo-speech-recognition'
      );
      return;
    }

    try {
      const result = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
      if (!result.granted) {
        Alert.alert('Permission Denied', 'Microphone permission is required for voice input');
        return;
      }

      setIsListening(true);
      setTranscript('');

      ExpoSpeechRecognitionModule.start({
        lang: 'en-US',
        interimResults: true,
        maxAlternatives: 1,
      });
    } catch (error: any) {
      console.error('Speech recognition error:', error);
      setIsListening(false);
      onError?.('Failed to start voice recognition');
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
      onError?.('Please enter or speak a task description');
      return;
    }

    setIsParsing(true);

    try {
      const parsedData = await tasksApi.parseTask(inputText);
      onTaskParsed(parsedData);
      setText('');
      setTranscript('');
    } catch (error: any) {
      console.error('Parse error:', error);
      onError?.(error.message || 'Failed to parse task');
    } finally {
      setIsParsing(false);
    }
  };

  // Handle speech recognition results
  if (useSpeechRecognitionEvent) {
    useSpeechRecognitionEvent('result', (event: any) => {
      const newTranscript = event.results?.[0]?.transcript || '';
      setTranscript(newTranscript);
      if (event.isFinal) {
        setText(newTranscript);
        setIsListening(false);
      }
    });

    useSpeechRecognitionEvent('end', () => {
      setIsListening(false);
    });

    useSpeechRecognitionEvent('error', (event: any) => {
      console.error('Speech error:', event);
      setIsListening(false);
      onError?.('Voice recognition error');
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
            multiline
            editable={!isListening && !isParsing}
          />
          {isListening && (
            <View style={styles.listeningIndicator}>
              <Text style={styles.listeningText}>Listening...</Text>
            </View>
          )}
        </View>

        <View style={styles.buttons}>
          {/* Mic Button */}
          <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
            <TouchableOpacity
              style={[
                styles.micButton,
                isListening && styles.micButtonActive,
              ]}
              onPress={isListening ? stopListening : startListening}
              disabled={isParsing}
            >
              <MaterialIcons
                name={isListening ? 'mic' : 'mic-none'}
                size={24}
                color={isListening ? '#fff' : COLORS.primary}
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
              <MaterialIcons name="send" size={20} color="#fff" />
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
    padding: 16,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 12,
  },
  inputWrapper: {
    flex: 1,
    backgroundColor: COLORS.backgroundSecondary,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    minHeight: 56,
    maxHeight: 120,
  },
  input: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: COLORS.text,
    minHeight: 56,
  },
  listeningIndicator: {
    position: 'absolute',
    bottom: 8,
    right: 12,
  },
  listeningText: {
    fontSize: 11,
    color: COLORS.primary,
    fontWeight: '500',
  },
  buttons: {
    flexDirection: 'row',
    gap: 8,
  },
  micButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.backgroundSecondary,
    borderWidth: 2,
    borderColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  micButtonActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  sendButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: COLORS.textMuted,
  },
  hint: {
    marginTop: 8,
    fontSize: 12,
    color: COLORS.textMuted,
    textAlign: 'center',
  },
});

