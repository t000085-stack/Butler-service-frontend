import SignInScreen from "./screens/SignInScreen";

export default function App() {
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

  const handleNavigateToRegister = () => {
    // Navigate to registration screen
    console.log("Navigate to register");
  };

  return (
    <SignInScreen
      onSignIn={handleSignIn}
      onNavigateToRegister={handleNavigateToRegister}
    />
  );
}
