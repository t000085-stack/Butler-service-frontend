import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Animated,
  Easing,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAuth } from '../../contexts/AuthContext';
import type { AuthStackParamList } from '../../navigation/AuthStack';
import { COLORS } from '../../constants/config';

const { width, height } = Dimensions.get('window');
const ORB_SIZE = width * 0.7;

type NavigationProp = NativeStackNavigationProp<AuthStackParamList, 'SignIn'>;

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

// Generate random stars
const generateStars = (count: number) => {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    size: Math.random() * 3 + 1.5,
    top: Math.random() * height * 0.5,
    left: Math.random() * width,
    delay: Math.random() * 2000,
  }));
};

export default function SignInScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { signIn } = useAuth();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Memoize stars so they don't regenerate on re-render
  const stars = useMemo(() => generateStars(30), []);

  // Animations
  const floatAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Initial entrance animations
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 20,
        friction: 7,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        delay: 300,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 800,
        delay: 300,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();

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
  }, []);

  const floatTranslateY = floatAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -15],
  });

  const spin = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const handleSignIn = async () => {
    if (!email.trim() || !password.trim()) {
      setError('Please fill in all fields');
      return;
    }

    setError(null);
    setIsLoading(true);

    try {
      await signIn(email, password);
    } catch (err: any) {
      setError(err.message || 'Something went wrong');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <StatusBar style="dark" />

        {/* Subtle background gradient */}
        <LinearGradient
          colors={['#ffffff', '#faf5ff', '#fdf4ff', '#ffffff']}
          style={styles.backgroundGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        />

        {/* Twinkling Stars */}
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

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Animated Orb */}
          <Animated.View
            style={[
              styles.orbContainer,
              {
                transform: [
                  { translateY: floatTranslateY },
                  { scale: scaleAnim },
                ],
              },
            ]}
          >
            {/* Glowing border */}
            <View style={styles.orbGlowBorder}>
              <View style={styles.orbGlowInner} />
            </View>
            <Animated.Image
              source={require('../../../assets/signinImage.png')}
              style={[styles.orbImage, { transform: [{ rotate: spin }] }]}
              resizeMode="contain"
            />
          </Animated.View>

          {/* Content with fade animation */}
          <Animated.View
            style={[
              styles.content,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }],
              },
            ]}
          >
            <Text style={styles.title}>Welcome Back</Text>
            <Text style={styles.subtitle}>
              Sign in so Simi can assist you{'\n'}
            </Text>

            {/* Minimal Form */}
            <View style={styles.form}>
              <View style={styles.inputWrapper}>
                <TextInput
                  style={styles.input}
                  placeholder="Email"
                  placeholderTextColor={COLORS.textMuted}
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>

              <View style={styles.inputWrapper}>
                <TextInput
                  style={styles.input}
                  placeholder="Password"
                  placeholderTextColor={COLORS.textMuted}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                  autoCapitalize="none"
                />
              </View>

              {/* Forgot Password */}
              <TouchableOpacity
                style={styles.forgotPassword}
                activeOpacity={0.6}
              >
                <Text style={styles.forgotPasswordText}>Forgot password?</Text>
              </TouchableOpacity>

              {error && <Text style={styles.errorText}>{error}</Text>}
            </View>

            {/* Sign In Button */}
            <TouchableOpacity
              style={[
                styles.signInButton,
                isLoading && styles.signInButtonDisabled,
              ]}
              onPress={handleSignIn}
              disabled={isLoading}
              activeOpacity={0.7}
            >
              {isLoading ? (
                <ActivityIndicator color={COLORS.text} size="small" />
              ) : (
                <>
                  <Text style={styles.signInButtonText}>Sign In</Text>
                  <Text style={styles.signInArrow}>→</Text>
                </>
              )}
            </TouchableOpacity>

            {/* Register link */}
            <TouchableOpacity
              style={styles.registerLink}
              onPress={() => navigation.navigate('SignUp')}
              activeOpacity={0.6}
            >
              <Text style={styles.registerText}>
                Don't have an account?{' '}
                <Text style={styles.registerHighlight}>Create one</Text>
              </Text>
            </TouchableOpacity>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 40,
  },
  backgroundGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  starsContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  star: {
    position: 'absolute',
    backgroundColor: COLORS.primaryLight,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
  },
  orbContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: height * 0.08,
    height: ORB_SIZE * 1.1,
  },
  orbGlowBorder: {
    position: 'absolute',
    width: ORB_SIZE + 10,
    height: ORB_SIZE + 10,
    borderRadius: (ORB_SIZE + 10) / 2,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.5)',
    shadowColor: '#ffffff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 15,
    elevation: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  orbGlowInner: {
    width: ORB_SIZE + 4,
    height: ORB_SIZE + 4,
    borderRadius: (ORB_SIZE + 4) / 2,
    borderWidth: 0.5,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    shadowColor: '#ffffff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 10,
  },
  orbImage: {
    width: ORB_SIZE,
    height: ORB_SIZE,
  },
  content: {
    paddingHorizontal: 40,
    paddingTop: 20,
  },
  title: {
    fontSize: 26,
    fontWeight: '600',
    color: COLORS.text,
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 15,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: 10,
    lineHeight: 22,
  },
  form: {
    marginTop: 28,
    gap: 14,
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
  forgotPassword: {
    alignSelf: 'flex-end',
    paddingVertical: 4,
  },
  forgotPasswordText: {
    fontSize: 13,
    color: COLORS.primary,
    fontWeight: '500',
  },
  errorText: {
    color: COLORS.error,
    fontSize: 13,
    textAlign: 'center',
  },
  signInButton: {
    backgroundColor: COLORS.backgroundSecondary,
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    borderWidth: 1,
    borderColor: COLORS.borderDark,
  },
  signInButtonDisabled: {
    opacity: 0.6,
  },
  signInButtonText: {
    fontSize: 15,
    fontWeight: '500',
    color: COLORS.text,
  },
  signInArrow: {
    fontSize: 16,
    marginLeft: 8,
    color: COLORS.text,
  },
  registerLink: {
    marginTop: 20,
    alignItems: 'center',
    paddingVertical: 8,
  },
  registerText: {
    fontSize: 14,
    color: COLORS.textMuted,
  },
  registerHighlight: {
    color: COLORS.primary,
    fontWeight: '500',
  },
});

