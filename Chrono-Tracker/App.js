import 'react-native-gesture-handler';
import { enableScreens } from 'react-native-screens';
import * as React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import BottomTabNavigator from './src/navigation/BottomTabNavigator';
import { Provider as PaperProvider, DefaultTheme, DarkTheme } from 'react-native-paper';
import { AuthProvider, useAuth } from './src/screens/AuthProvider';
import { View, Text, Platform } from 'react-native';
import LoginScreen from './src/screens/LoginScreen';
import * as Notifications from 'expo-notifications';
import { en, registerTranslation } from 'react-native-paper-dates';
import EmailConfirmedScreen from './src/screens/EmailConfirmedScreen';
import * as Linking from 'expo-linking';

registerTranslation('en', en);

// Notification handler: show alert when app is foregrounded
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

enableScreens();

const Stack = createNativeStackNavigator();

const ThemeContext = React.createContext({ themeMode: 'light', setThemeMode: () => {} });

// Custom modern, soft, and readable theme
const CalmLightTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: '#a259ff', // soft purple
    accent: '#6ec1e4', // soft blue
    background: '#fff', // pure white
    surface: '#f3f6fa', // very light blue-gray
    text: '#22223b', // deep charcoal
    onBackground: '#22223b',
    onSurface: '#22223b',
    error: '#ff6b6b',
    success: '#7ed6a2',
    muted: '#bfc8d6',
    card: '#fff',
    border: '#e3e8ff',
    tabBar: '#fff',
    header: '#fff',
  },
};

const linking = {
  prefixes: ['chronotracker://'],
  config: {
    screens: {
      Login: 'login',
      EmailConfirmed: 'email-confirmed',
    },
  },
};

// Request notification permissions on app start
async function requestNotificationPermission() {
  const { status } = await Notifications.getPermissionsAsync();
  if (status !== 'granted') {
    await Notifications.requestPermissionsAsync();
  }
}

// Helper to schedule a reminder notification
export async function scheduleReminderNotification(minutes) {
  // Cancel all previous reminders
  await Notifications.cancelAllScheduledNotificationsAsync();
  if (!minutes || minutes <= 0) return;
  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'ChronoTracker Reminder',
      body: 'Time to focus on your next task!',
      sound: true,
    },
    trigger: {
      seconds: minutes * 60,
      repeats: true,
    },
  });
}

function AuthStack() {
  return (
    <NavigationContainer theme={CalmLightTheme} linking={linking}>
      <Stack.Navigator>
        <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
        <Stack.Screen name="EmailConfirmed" component={EmailConfirmedScreen} options={{ headerShown: false }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

function MainApp({ theme }) {
  return <NavigationContainer theme={theme}>
    <BottomTabNavigator />
  </NavigationContainer>;
}

function Root({ themeMode, setThemeMode }) {
  const { user, loading } = useAuth();
  const theme = CalmLightTheme;
  React.useEffect(() => {
    requestNotificationPermission();
  }, []);
  if (loading) return <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}><Text>Loading...</Text></View>;
  return (
    <ThemeContext.Provider value={{ themeMode, setThemeMode }}>
      {user ? <MainApp theme={theme} /> : <AuthStack />}
    </ThemeContext.Provider>
  );
}

export { ThemeContext, CalmLightTheme };

export default function App() {
  const [themeMode, setThemeMode] = React.useState('light');
  React.useEffect(() => {
    // Try to load theme from AsyncStorage
    import('react-native').then(({ Appearance }) => {
      setThemeMode('light'); // Always use light theme for calm look
    });
  }, []);
  const theme = CalmLightTheme;
  return (
    <PaperProvider theme={theme}>
      <AuthProvider>
        <Root themeMode={themeMode} setThemeMode={setThemeMode} />
      </AuthProvider>
    </PaperProvider>
  );
}
