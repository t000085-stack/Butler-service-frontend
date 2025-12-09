import { useState } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";
import SignInScreen from "./screens/SignInScreen";
import SignUpScreen from "./screens/sign-upScreen";

type Screen = "signIn" | "signUp";

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<Screen>("signIn");

  const handleSignIn = async (email: string, password: string) => {
    // Replace with your actual backend URL
    const API_URL = "http://localhost:3000/api";

    const response = await fetch(`${API_URL}/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, password }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Login failed");
    }

    // Handle successful login
    // Store token: await AsyncStorage.setItem('token', data.token);
    // Navigate to main app
    console.log("Login successful:", data);
  };

  const handleSignUp = async (
    username: string,
    email: string,
    password: string
  ) => {
    // Replace with your actual backend URL
    const API_URL = "http://localhost:3000/api";

    const response = await fetch(`${API_URL}/auth/register`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ username, email, password }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Registration failed");
    }

    // Handle successful registration
    console.log("Registration successful:", data);
    // Navigate to sign in after successful registration
    setCurrentScreen("signIn");
  };

  if (currentScreen === "signUp") {
    return (
      <SafeAreaProvider>
        <SignUpScreen
          onSignUp={handleSignUp}
          onNavigateToSignIn={() => setCurrentScreen("signIn")}
        />
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <SignInScreen
        onSignIn={handleSignIn}
        onNavigateToRegister={() => setCurrentScreen("signUp")}
      />
    </SafeAreaProvider>
  );
}
