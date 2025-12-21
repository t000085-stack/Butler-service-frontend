import React, { useState, useRef, useEffect } from "react";
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
  Image,
  Alert,
  Easing,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { StatusBar } from "expo-status-bar";
import { MaterialIcons, Feather } from "@expo/vector-icons";
import { COLORS } from "../../constants/config";
import * as chatApi from "../../api/chat";
import { useAuth } from "../../contexts/AuthContext";

const { width } = Dimensions.get("window");

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

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
            duration: 300,
            delay,
            useNativeDriver: true,
          }),
          Animated.timing(dot, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
          }),
        ])
      ).start();
    };

    animate(dot1, 0);
    animate(dot2, 150);
    animate(dot3, 300);
  }, []);

  const dotStyle = (anim: Animated.Value) => ({
    opacity: anim.interpolate({
      inputRange: [0, 1],
      outputRange: [0.3, 1],
    }),
    transform: [
      {
        translateY: anim.interpolate({
          inputRange: [0, 1],
          outputRange: [0, -4],
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

const LoadingAvatarBubble = () => {
  return (
    <View style={styles.loadingBubbleContainer}>
      <View style={[styles.messageBubble, styles.assistantBubble]}>
        <TypingIndicator />
      </View>
    </View>
  );
};

const MessageBubble = ({ message }: { message: Message }) => {
  const isUser = message.role === "user";

  return (
    <View
      style={[
        styles.messageBubbleContainer,
        isUser ? styles.userBubbleContainer : styles.assistantBubbleContainer,
      ]}
    >
      <View
        style={[
          styles.messageBubble,
          isUser ? styles.userBubble : styles.assistantBubble,
        ]}
      >
        <Text
          style={[
            styles.messageText,
            isUser ? styles.userMessageText : styles.assistantMessageText,
          ]}
          selectable
        >
          {message.content}
        </Text>
      </View>
    </View>
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
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  // Handle logout
  const handleLogout = () => {
    setShowLogoutModal(true);
  };

  const confirmLogout = async () => {
    setShowLogoutModal(false);
    try {
      await signOut();
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to logout");
    }
  };

  const scrollToBottom = () => {
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  const handleSend = async () => {
    const text = inputText.trim();
    if (!text || isLoading) return;

    // Add user message
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

      // Log the full response for debugging
      console.log(
        "[ChatScreen] Full API response:",
        JSON.stringify(response, null, 2)
      );
      console.log("[ChatScreen] Response type:", typeof response);
      console.log(
        "[ChatScreen] Response.response type:",
        typeof response?.response
      );
      console.log(
        "[ChatScreen] Response.response length:",
        response?.response?.length
      );

      // Extract the response content - handle different possible response structures
      let responseContent = "";
      if (typeof response === "string") {
        responseContent = response;
      } else if (response?.response) {
        responseContent = response.response;
      } else {
        // Check for other possible properties (type assertion needed for TypeScript)
        const responseAny = response as any;
        if (responseAny?.message) {
          responseContent = responseAny.message;
        } else if (responseAny?.content) {
          responseContent = responseAny.content;
        } else {
          // Fallback: try to stringify the response
          responseContent = JSON.stringify(response);
        }
      }

      console.log(
        "[ChatScreen] Extracted content length:",
        responseContent.length
      );
      console.log(
        "[ChatScreen] Content preview (first 200 chars):",
        responseContent.substring(0, 200)
      );

      // Add assistant response
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: responseContent,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error: any) {
      console.error("Chat error:", error);

      // Add error message
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

  const renderMessage = ({ item }: { item: Message }) => (
    <MessageBubble message={item} />
  );

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

      {/* App Header - matches Tasks page style */}
      <View style={styles.appHeader}>
        <View style={styles.headerLeft}>
          <View style={styles.headerTitleContainer}>
            {/* Simi Orb */}
            <View style={styles.headerOrbContainer}>
              <Image
                source={require("../../../assets/signinImage.png")}
                style={styles.headerOrbImage}
                resizeMode="contain"
              />
            </View>
            <View style={styles.headerTextContainer}>
              <Text style={styles.headerTitle}>Chat with Simi</Text>
              <Text style={styles.headerSubtitle}>Your personal butler</Text>
            </View>
          </View>
        </View>
        <TouchableOpacity
          style={styles.logoutButton}
          onPress={handleLogout}
          activeOpacity={0.7}
        >
          <LinearGradient
            colors={["rgba(82, 40, 97, 0.15)", "rgba(122, 77, 132, 0.1)"]}
            style={styles.logoutGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Feather name="log-out" size={18} color="#522861" />
          </LinearGradient>
        </TouchableOpacity>
      </View>

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
          ListFooterComponent={isLoading ? <LoadingAvatarBubble /> : null}
        />

        {/* Input Area */}
        <View style={styles.inputContainer}>
          <View style={styles.inputWrapper}>
            <TextInput
              style={styles.input}
              placeholder="Type your message..."
              placeholderTextColor={COLORS.textMuted}
              value={inputText}
              onChangeText={setInputText}
              multiline
              maxLength={1000}
              editable={!isLoading}
            />
          </View>
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
              <MaterialIcons name="send" size={22} color="#fff" />
            )}
          </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>

      {/* Logout Confirmation Modal */}
      {showLogoutModal && (
        <View style={styles.logoutModalOverlay}>
          <View
            style={styles.logoutModalContent}
            onStartShouldSetResponder={() => true}
          >
            <Text style={styles.logoutModalTitle}>Logout</Text>
            <Text style={styles.logoutModalMessage}>
              Are you sure you want to logout?
            </Text>
            <View style={styles.logoutModalButtons}>
              <View style={styles.logoutModalButtonWrapper}>
                <TouchableOpacity
                  style={styles.logoutModalCancelButton}
                  onPress={() => setShowLogoutModal(false)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.logoutModalCancelText}>Cancel</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.logoutModalButtonWrapper}>
                <TouchableOpacity
                  style={styles.logoutModalConfirmButton}
                  onPress={confirmLogout}
                  activeOpacity={0.7}
                >
                  <LinearGradient
                    colors={["#522861", "#7a4d84"]}
                    style={styles.logoutModalConfirmGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  >
                    <Text style={styles.logoutModalConfirmText}>Logout</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      )}
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
  container: {
    flex: 1,
  },
  // App Header - matches Tasks page style
  appHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: "transparent",
  },
  headerLeft: {
    flex: 1,
    minWidth: 0,
  },
  headerTitleContainer: {
    flexDirection: "row",
    alignItems: "center",
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
  headerTextContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#522861",
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 14,
    color: "#522861",
    marginTop: 2,
    fontWeight: "500",
  },
  logoutButton: {
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
  messagesList: {
    padding: 16,
    paddingBottom: 8,
  },
  messageBubbleContainer: {
    flexDirection: "row",
    marginBottom: 16,
    maxWidth: width * 0.85,
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
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    overflow: "hidden",
  },
  avatarImage: {
    width: "100%",
    height: "100%",
  },
  messageBubble: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
    maxWidth: width * 0.7,
    flexShrink: 1,
  },
  userBubble: {
    backgroundColor: "#522861",
    borderBottomRightRadius: 4,
  },
  assistantBubble: {
    backgroundColor: "#fff",
    borderBottomLeftRadius: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 22,
    flexShrink: 1,
  },
  userMessageText: {
    color: "#fff",
  },
  assistantMessageText: {
    color: COLORS.text,
  },
  typingContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 4,
  },
  typingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#522861",
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "flex-end",
    padding: 12,
    paddingBottom: Platform.OS === "ios" ? 28 : 12,
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    gap: 10,
  },
  inputWrapper: {
    flex: 1,
    backgroundColor: COLORS.backgroundSecondary,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: COLORS.border,
    maxHeight: 120,
  },
  input: {
    paddingHorizontal: 18,
    paddingVertical: 12,
    fontSize: 15,
    color: COLORS.text,
    maxHeight: 100,
  },
  sendButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#522861",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#522861",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  sendButtonDisabled: {
    backgroundColor: COLORS.textMuted,
    shadowOpacity: 0,
  },
  // Logout Modal Styles
  logoutModalOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.4)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 16,
    zIndex: 1000,
  },
  logoutModalContent: {
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    borderRadius: 28,
    padding: 24,
    width: "100%",
    maxWidth: width - 64,
    shadowColor: "#522861",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.25,
    shadowRadius: 30,
    elevation: 15,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.8)",
  },
  logoutModalTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#522861",
    marginBottom: 12,
    textAlign: "center",
  },
  logoutModalMessage: {
    fontSize: 16,
    color: "#71717a",
    textAlign: "center",
    marginBottom: 24,
    lineHeight: 22,
  },
  logoutModalButtons: {
    flexDirection: "row",
    gap: 12,
  },
  logoutModalButtonWrapper: {
    flex: 1,
  },
  logoutModalCancelButton: {
    width: "100%",
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 16,
    backgroundColor: "rgba(82, 40, 97, 0.08)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: "rgba(82, 40, 97, 0.2)",
  },
  logoutModalCancelText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#522861",
  },
  logoutModalConfirmButton: {
    width: "100%",
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: "#522861",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  logoutModalConfirmGradient: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  logoutModalConfirmText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
  },
});
