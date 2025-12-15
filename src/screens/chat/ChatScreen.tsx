import React, { useState, useRef, useEffect, useMemo } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Dimensions,
  Animated,
<<<<<<< HEAD
  Image,
  Easing,
=======
  Alert,
  Easing,
  Image,
>>>>>>> 2ae5de19e9eebc9a518bbff27f341e9fb5ddf505
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { StatusBar } from "expo-status-bar";
import { MaterialIcons, Feather, Ionicons } from "@expo/vector-icons";
import { COLORS } from "../../constants/config";
import { useAuth } from "../../contexts/AuthContext";
import * as chatApi from "../../api/chat";

const { width, height } = Dimensions.get("window");

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

// Floating particle component
const FloatingParticle = ({
  size,
  startX,
  startY,
  duration,
  delay,
}: {
  size: number;
  startX: number;
  startY: number;
  duration: number;
  delay: number;
}) => {
  const floatAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.parallel([
          Animated.timing(floatAnim, {
            toValue: 1,
            duration: duration,
            easing: Easing.linear,
            useNativeDriver: true,
          }),
          Animated.sequence([
            Animated.timing(opacityAnim, {
              toValue: 0.6,
              duration: duration * 0.3,
              useNativeDriver: true,
            }),
            Animated.timing(opacityAnim, {
              toValue: 0,
              duration: duration * 0.7,
              useNativeDriver: true,
            }),
          ]),
        ]),
      ])
    ).start();
  }, []);

  const translateY = floatAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [startY, -50],
  });

  return (
    <Animated.View
      style={[
        styles.particle,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          left: startX,
          opacity: opacityAnim,
          transform: [{ translateY }],
        },
      ]}
    />
  );
};

// Generate particles
const generateParticles = (count: number) => {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    size: Math.random() * 6 + 3,
    startX: Math.random() * width,
    startY: height * 0.6 + Math.random() * height * 0.4,
    duration: 4000 + Math.random() * 3000,
    delay: Math.random() * 5000,
  }));
};

const TypingIndicator = () => {
  const dot1 = useRef(new Animated.Value(0)).current;
  const dot2 = useRef(new Animated.Value(0)).current;
  const dot3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animate = (dot: Animated.Value, delay: number) => {
      Animated.loop(
        Animated.sequence([
          Animated.timing(dot, {
            toValue: 1,
            duration: 400,
            delay,
            easing: Easing.bezier(0.4, 0, 0.2, 1),
            useNativeDriver: true,
          }),
          Animated.timing(dot, {
            toValue: 0,
            duration: 400,
            easing: Easing.bezier(0.4, 0, 0.2, 1),
            useNativeDriver: true,
          }),
        ])
      ).start();
    };

    animate(dot1, 0);
    animate(dot2, 200);
    animate(dot3, 400);
  }, []);

  const dotStyle = (anim: Animated.Value) => ({
    opacity: anim.interpolate({
      inputRange: [0, 1],
      outputRange: [0.3, 1],
    }),
    transform: [
      {
        scale: anim.interpolate({
          inputRange: [0, 0.5, 1],
          outputRange: [1, 1.3, 1],
        }),
      },
    ],
  });

  return (
    <View style={styles.typingContainer}>
      <Animated.View style={[styles.typingDot, dotStyle(dot1)]} />
      <Animated.View style={[styles.typingDot, dotStyle(dot2)]} />
      <Animated.View style={[styles.typingDot, dotStyle(dot3)]} />
    </View>
  );
};

<<<<<<< HEAD
// Animated Orb Component (matching SignInScreen style)
const AnimatedOrb = ({ size = 48 }: { size?: number }) => {
  const floatAnim = useRef(new Animated.Value(0)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(0)).current;
  const glowAnim = useRef(new Animated.Value(0.85)).current;

  useEffect(() => {
    // Continuous floating animation
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
        duration: 25000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();

    // Pulse scale animation (breathing effect)
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 3000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0,
          duration: 3000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Glow/opacity animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, {
          toValue: 1,
          duration: 4000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(glowAnim, {
          toValue: 0.8,
          duration: 4000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  const floatTranslateY = floatAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -8],
  });

  const spin = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  const pulseScale = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.05],
  });

  return (
    <Animated.View
      style={[
        styles.avatarOrb,
        {
          transform: [{ translateY: floatTranslateY }, { scale: pulseScale }],
        },
      ]}
    >
      <Animated.Image
        source={require("../../../assets/signinImage.png")}
        style={[
          styles.avatarOrbImage,
          {
            width: size,
            height: size,
            transform: [{ rotate: spin }],
            opacity: glowAnim,
          },
        ]}
        resizeMode="contain"
      />
    </Animated.View>
  );
};

const MessageBubble = ({ message }: { message: Message }) => {
=======
const MessageBubble = ({ message, index }: { message: Message; index: number }) => {
>>>>>>> 2ae5de19e9eebc9a518bbff27f341e9fb5ddf505
  const isUser = message.role === "user";
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(isUser ? 30 : -30)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        delay: 50,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        friction: 8,
        tension: 100,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <Animated.View
      style={[
        styles.messageBubbleContainer,
        isUser ? styles.userBubbleContainer : styles.assistantBubbleContainer,
        {
          opacity: fadeAnim,
          transform: [{ translateX: slideAnim }],
        },
      ]}
    >
      {!isUser && (
        <View style={styles.avatarContainer}>
<<<<<<< HEAD
          <AnimatedOrb size={48} />
=======
          <LinearGradient
            colors={["#522861", "#7a4d84", "#9b6fa1"]}
            style={styles.avatar}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Text style={styles.avatarText}>✨</Text>
          </LinearGradient>
>>>>>>> 2ae5de19e9eebc9a518bbff27f341e9fb5ddf505
        </View>
      )}
      {isUser ? (
        <LinearGradient
          colors={["#522861", "#6b3a7d", "#7a4d84"]}
          style={[styles.messageBubble, styles.userBubble]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <Text style={[styles.messageText, styles.userMessageText]}>
            {message.content}
          </Text>
        </LinearGradient>
      ) : (
        <View style={[styles.messageBubble, styles.assistantBubble]}>
          <Text style={[styles.messageText, styles.assistantMessageText]}>
            {message.content}
          </Text>
        </View>
      )}
    </Animated.View>
  );
};

// Animated header orb
const AnimatedOrb = () => {
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 20000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.1,
          duration: 2000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 2000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  const spin = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  return (
    <Animated.View
      style={[
        styles.headerOrbContainer,
        { transform: [{ scale: pulseAnim }] },
      ]}
    >
      <Animated.Image
        source={require("../../../assets/signinImage.png")}
        style={[styles.headerOrbImage, { transform: [{ rotate: spin }] }]}
        resizeMode="contain"
      />
    </Animated.View>
  );
};

export default function ChatScreen() {
  const { signOut } = useAuth();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content:
        "Hey there! I'm Simi, your butler. What's on your mind? You can vent, ask for advice, or just chat. I'm here for you. 💜",
      timestamp: new Date(),
    },
  ]);
  const [inputText, setInputText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  const particles = useMemo(() => generateParticles(15), []);

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

  const scrollToBottom = () => {
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  const handleSend = async () => {
    const text = inputText.trim();
    if (!text || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: text,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputText("");
    setIsLoading(true);
    scrollToBottom();

    try {
      const response = await chatApi.sendMessage(text);

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: response.response,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error: any) {
      console.error("Chat error:", error);

      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content:
          "I'm having trouble connecting right now. Please try again in a moment. 💫",
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
      scrollToBottom();
    }
  };

  const renderMessage = ({ item, index }: { item: Message; index: number }) => (
    <MessageBubble message={item} index={index} />
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <StatusBar style="dark" />

      {/* Background gradient */}
      <LinearGradient
        colors={["#faf5ff", "#f5f0fa", "#fdf4ff", "#fff5fc", "#ffffff"]}
        style={styles.backgroundGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />

<<<<<<< HEAD
      {/* Header */}
      <View style={styles.header}></View>
=======
      {/* Floating particles */}
      <View style={styles.particlesContainer}>
        {particles.map((particle) => (
          <FloatingParticle
            key={particle.id}
            size={particle.size}
            startX={particle.startX}
            startY={particle.startY}
            duration={particle.duration}
            delay={particle.delay}
          />
        ))}
      </View>

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

      {/* Chat Title Section */}
      <View style={styles.titleSection}>
        <AnimatedOrb />
        <View style={styles.titleTextContainer}>
          <Text style={styles.titleText}>Simi</Text>
          <View style={styles.onlineIndicator}>
            <View style={styles.onlineDot} />
            <Text style={styles.subtitleText}>Online • Ready to chat</Text>
          </View>
        </View>
      </View>
>>>>>>> 2ae5de19e9eebc9a518bbff27f341e9fb5ddf505

      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
      >
        {/* Messages */}
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.messagesList}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={scrollToBottom}
          ListFooterComponent={
            isLoading ? (
              <View style={styles.loadingBubbleContainer}>
                <View style={styles.avatarContainer}>
<<<<<<< HEAD
                  <AnimatedOrb size={48} />
=======
                  <LinearGradient
                    colors={["#522861", "#7a4d84", "#9b6fa1"]}
                    style={styles.avatar}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  >
                    <Text style={styles.avatarText}>✨</Text>
                  </LinearGradient>
>>>>>>> 2ae5de19e9eebc9a518bbff27f341e9fb5ddf505
                </View>
                <View style={[styles.messageBubble, styles.assistantBubble]}>
                  <TypingIndicator />
                </View>
              </View>
            ) : null
          }
        />

        {/* Creative Input Area */}
        <View style={styles.inputContainer}>
          <View style={styles.inputWrapper}>
            <TextInput
              style={styles.input}
              placeholder="Type a message..."
              placeholderTextColor="#9b6fa1"
              value={inputText}
              onChangeText={setInputText}
              multiline
              maxLength={1000}
              editable={!isLoading}
            />
            <TouchableOpacity
              style={[
                styles.sendButton,
                (!inputText.trim() || isLoading) && styles.sendButtonDisabled,
              ]}
              onPress={handleSend}
              disabled={!inputText.trim() || isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <LinearGradient
                  colors={inputText.trim() ? ["#522861", "#7a4d84"] : ["#ccc", "#aaa"]}
                  style={styles.sendButtonGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <Ionicons name="send" size={18} color="#fff" />
                </LinearGradient>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
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
  particlesContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    overflow: "hidden",
  },
  particle: {
    position: "absolute",
    backgroundColor: "#522861",
  },
  container: {
    flex: 1,
  },
<<<<<<< HEAD
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    backgroundColor: "rgba(255, 255, 255, 0.9)",
=======
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
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 12,
  },
  headerOrbContainer: {
    width: 48,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  headerOrbImage: {
    width: 48,
    height: 48,
  },
  titleTextContainer: {
    flex: 1,
  },
  titleText: {
    fontSize: 24,
    fontWeight: "700",
    color: "#522861",
    letterSpacing: -0.5,
  },
  onlineIndicator: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 2,
  },
  onlineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#22c55e",
  },
  subtitleText: {
    fontSize: 13,
    color: "#7a4d84",
    fontWeight: "500",
  },
  logoutButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: "rgba(240, 235, 245, 0.8)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.8)",
    shadowColor: "#522861",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
>>>>>>> 2ae5de19e9eebc9a518bbff27f341e9fb5ddf505
  },
  messagesList: {
    padding: 16,
    paddingBottom: 8,
  },
  messageBubbleContainer: {
    flexDirection: "row",
    marginBottom: 16,
    maxWidth: width * 0.82,
  },
  userBubbleContainer: {
    alignSelf: "flex-end",
    justifyContent: "flex-end",
  },
  assistantBubbleContainer: {
    alignSelf: "flex-start",
  },
  loadingBubbleContainer: {
    flexDirection: "row",
    marginBottom: 16,
    alignSelf: "flex-start",
  },
  avatarContainer: {
    marginRight: 10,
    marginTop: 4,
  },
<<<<<<< HEAD
  avatarOrb: {
=======
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
>>>>>>> 2ae5de19e9eebc9a518bbff27f341e9fb5ddf505
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#522861",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  avatarOrbImage: {
    // Size is controlled by the AnimatedOrb component
  },
  messageBubble: {
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderRadius: 24,
    maxWidth: width * 0.7,
  },
  userBubble: {
    borderBottomRightRadius: 6,
    shadowColor: "#522861",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 6,
  },
  assistantBubble: {
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    borderBottomLeftRadius: 6,
    shadowColor: "#522861",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 3,
    borderWidth: 1,
    borderColor: "rgba(82, 40, 97, 0.06)",
  },
  messageText: {
    fontSize: 15,
    lineHeight: 22,
  },
  userMessageText: {
    color: "#fff",
    fontWeight: "500",
  },
  assistantMessageText: {
    color: "#3d1e49",
  },
  typingContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  typingDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#7a4d84",
  },
  inputContainer: {
    padding: 12,
    paddingBottom: Platform.OS === "ios" ? 28 : 12,
    marginHorizontal: 16,
    marginBottom: 8,
    backgroundColor: "rgba(255, 255, 255, 0.7)",
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: "rgba(255, 255, 255, 0.8)",
    shadowColor: "#522861",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 8,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "flex-end",
    backgroundColor: "rgba(240, 235, 245, 0.8)",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.8)",
    paddingLeft: 18,
    paddingRight: 6,
    paddingVertical: 6,
    gap: 8,
  },
  input: {
    flex: 1,
    paddingVertical: 10,
    fontSize: 15,
    color: "#3d1e49",
    maxHeight: 100,
  },
  sendButton: {
    marginBottom: 2,
  },
  sendButtonGradient: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#522861",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
});
