import React, { useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native';
import {
  Text,
  Card,
  Button,
  TextInput,
  useTheme,
  Divider,
  Switch as PaperSwitch,
  Menu,
  Portal,
  Provider as PaperProvider,
} from 'react-native-paper';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ThemeContext, scheduleReminderNotification } from '../../App';
import { AdMobBanner } from 'expo-ads-admob';

const REMINDER_OPTIONS = [1, 5, 10, 15, 30];
const TIMER_MODES = ['Pomodoro', 'Countdown', 'Stopwatch'];
const CLOCK_STYLES = ['Minimal Ring', 'Classic', 'Digital'];
const SOUND_PACKS = ['Gentle Chime', 'Bell', 'Beep'];

export default function SettingsScreen({ navigation }) {
  const theme = useTheme();
  const { themeMode, setThemeMode } = React.useContext(ThemeContext);
  const [darkMode, setDarkMode] = useState(themeMode === 'dark');
  const [focusGoal, setFocusGoal] = useState('120');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [reminderTime, setReminderTime] = useState(5);
  const [loading, setLoading] = useState(true);
  const [timerMode, setTimerMode] = useState('Pomodoro');
  const [autoStartBreaks, setAutoStartBreaks] = useState(false);
  const [clockStyle, setClockStyle] = useState(CLOCK_STYLES[0]);
  const [soundPack, setSoundPack] = useState(SOUND_PACKS[0]);
  const [analytics, setAnalytics] = useState(true);
  const [menuVisible, setMenuVisible] = useState({ timer: false, clock: false, sound: false });

  // Load settings from AsyncStorage
  useEffect(() => {
    (async () => {
      try {
        const storedTheme = await AsyncStorage.getItem('themeMode');
        if (storedTheme) setDarkMode(storedTheme === 'dark');
        const storedGoal = await AsyncStorage.getItem('focusGoal');
        if (storedGoal) setFocusGoal(JSON.parse(storedGoal).value.toString());
        const storedSound = await AsyncStorage.getItem('soundEnabled');
        if (storedSound) setSoundEnabled(storedSound === 'true');
        const storedReminder = await AsyncStorage.getItem('reminderTime');
        if (storedReminder) setReminderTime(Number(storedReminder));
        const storedTimerMode = await AsyncStorage.getItem('timerMode');
        if (storedTimerMode) setTimerMode(storedTimerMode);
        const storedAutoBreaks = await AsyncStorage.getItem('autoStartBreaks');
        if (storedAutoBreaks) setAutoStartBreaks(storedAutoBreaks === 'true');
        const storedClockStyle = await AsyncStorage.getItem('clockStyle');
        if (storedClockStyle) setClockStyle(storedClockStyle);
        const storedSoundPack = await AsyncStorage.getItem('soundPack');
        if (storedSoundPack) setSoundPack(storedSoundPack);
        const storedAnalytics = await AsyncStorage.getItem('analytics');
        if (storedAnalytics) setAnalytics(storedAnalytics === 'true');
      } catch (e) {}
      setLoading(false);
    })();
  }, []);

  // Save theme to AsyncStorage and update theme
  const handleThemeSelect = async (mode) => {
    setDarkMode(mode === 'dark');
    await AsyncStorage.setItem('themeMode', mode);
    setThemeMode(mode);
  };

  const handleGoalSave = async () => {
    const val = parseInt(focusGoal);
    if (!val || val <= 0) return;
    await AsyncStorage.setItem('focusGoal', JSON.stringify({ value: val, type: 'daily', category: 'All' }));
    Alert.alert('Saved', 'Focus goal updated!');
  };

  const handleSoundToggle = async (val) => {
    setSoundEnabled(val);
    await AsyncStorage.setItem('soundEnabled', val ? 'true' : 'false');
  };

  const handleReminderChange = async (val) => {
    setReminderTime(val);
    await AsyncStorage.setItem('reminderTime', val.toString());
    await scheduleReminderNotification(val);
  };

  const handleTimerMode = async (mode) => {
    setTimerMode(mode);
    await AsyncStorage.setItem('timerMode', mode);
  };

  const handleAutoBreaks = async (val) => {
    setAutoStartBreaks(val);
    await AsyncStorage.setItem('autoStartBreaks', val ? 'true' : 'false');
  };

  const handleClockStyle = async (style) => {
    setClockStyle(style);
    await AsyncStorage.setItem('clockStyle', style);
  };

  const handleSoundPack = async (pack) => {
    setSoundPack(pack);
    await AsyncStorage.setItem('soundPack', pack);
  };

  const handleAnalytics = async (val) => {
    setAnalytics(val);
    await AsyncStorage.setItem('analytics', val ? 'true' : 'false');
  };

  const handleReset = async () => {
    Alert.alert(
      'Clear All Data',
      'This will permanently delete all your sessions and settings. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            await AsyncStorage.clear();
            setFocusGoal('120');
            setSoundEnabled(true);
            setReminderTime(5);
            setDarkMode(false);
            setTimerMode('Pomodoro');
            setAutoStartBreaks(false);
            setClockStyle(CLOCK_STYLES[0]);
            setSoundPack(SOUND_PACKS[0]);
            setAnalytics(true);
            Alert.alert('Reset', 'All data has been cleared.');
          },
        },
      ]
    );
  };

  useEffect(() => {
    // On mount, schedule notification with current reminderTime
    scheduleReminderNotification(reminderTime);
  }, [reminderTime]);

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}> 
        <Text>Loading...</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.heading}>Settings</Text>
      <Text style={styles.subheading}>Customize your ChronoTracker experience</Text>
      {/* General Section */}
      <Card style={styles.sectionCard}>
        <Card.Content>
          <Text style={styles.sectionTitle}>General</Text>
          <View style={styles.rowBetween}>
            <Text>Default Timer Mode</Text>
            <Menu
              visible={menuVisible.timer}
              onDismiss={() => setMenuVisible(m => ({ ...m, timer: false }))}
              anchor={<Button mode="outlined" onPress={() => setMenuVisible(m => ({ ...m, timer: true }))}>{timerMode}</Button>}
            >
              {TIMER_MODES.map(mode => (
                <Menu.Item key={mode} onPress={() => { handleTimerMode(mode); setMenuVisible(m => ({ ...m, timer: false })); }} title={mode} />
              ))}
            </Menu>
          </View>
          <View style={styles.rowBetween}>
            <Text>Auto-start breaks</Text>
            <PaperSwitch value={autoStartBreaks} onValueChange={handleAutoBreaks} color={theme.colors.primary} />
          </View>
        </Card.Content>
      </Card>
      {/* Appearance Section */}
      <Card style={styles.sectionCard}>
        <Card.Content>
          <Text style={styles.sectionTitle}>Appearance</Text>
          <Text style={styles.label}>Theme</Text>
          <View style={styles.themeRow}>
            <Button mode={darkMode ? 'outlined' : 'contained'} onPress={() => handleThemeSelect('light')} style={styles.themeBtn}>Light</Button>
            <Button mode={darkMode ? 'contained' : 'outlined'} onPress={() => handleThemeSelect('dark')} style={styles.themeBtn}>Dark</Button>
          </View>
          <Text style={styles.label}>Reminder Notification</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginVertical: 8 }}>
            <View style={{ flexDirection: 'row' }}>
              {REMINDER_OPTIONS.map((min) => (
                <Button
                  key={min}
                  mode={reminderTime === min ? 'contained' : 'outlined'}
                  onPress={() => handleReminderChange(min)}
                  style={styles.themeBtn}
                >
                  {min} min
                </Button>
              ))}
            </View>
          </ScrollView>
        </Card.Content>
      </Card>
      {/* Notifications Section */}
      <Card style={styles.sectionCard}>
        <Card.Content>
          <Text style={styles.sectionTitle}>Notifications</Text>
          <View style={styles.rowBetween}>
            <Text>Session end alerts</Text>
            <PaperSwitch value={soundEnabled} onValueChange={handleSoundToggle} color={theme.colors.primary} />
          </View>
          <View style={styles.rowBetween}>
            <Text>Break reminders</Text>
            <PaperSwitch value={reminderTime > 0} onValueChange={v => handleReminderChange(v ? 5 : 0)} color={theme.colors.primary} />
          </View>
          <Text style={styles.label}>Sound Pack</Text>
          <Menu
            visible={menuVisible.sound}
            onDismiss={() => setMenuVisible(m => ({ ...m, sound: false }))}
            anchor={<Button mode="outlined" onPress={() => setMenuVisible(m => ({ ...m, sound: true }))}>{soundPack}</Button>}
          >
            {SOUND_PACKS.map(pack => (
              <Menu.Item key={pack} onPress={() => { handleSoundPack(pack); setMenuVisible(m => ({ ...m, sound: false })); }} title={pack} />
            ))}
          </Menu>
        </Card.Content>
      </Card>
      {/* Privacy & Data Section */}
      <Card style={styles.sectionCard}>
        <Card.Content>
          <Text style={styles.sectionTitle}>Privacy & Data</Text>
          <View style={styles.rowBetween}>
            <Text>Analytics tracking</Text>
            <PaperSwitch value={analytics} onValueChange={handleAnalytics} color={theme.colors.primary} />
          </View>
          <Button mode="contained" onPress={handleReset} color={theme.colors.error} style={styles.resetBtn}>
            Clear All Data
          </Button>
        </Card.Content>
      </Card>
      <AdMobBanner
        bannerSize="smartBannerPortrait"
        adUnitID="ca-app-pub-3940256099942544/6300978111"
        servePersonalizedAds={false}
        onDidFailToReceiveAdWithError={console.log}
        style={{ alignSelf: 'center', marginTop: 8 }}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: '#f6f6f6',
    flexGrow: 1,
  },
  heading: {
    fontSize: 26,
    fontWeight: 'bold',
    marginBottom: 2,
    marginTop: 8,
    color: '#23232a',
    alignSelf: 'center',
  },
  subheading: {
    fontSize: 15,
    color: '#888',
    marginBottom: 16,
    alignSelf: 'center',
  },
  sectionCard: {
    marginBottom: 18,
    borderRadius: 18,
    elevation: 2,
    backgroundColor: '#fff',
    paddingVertical: 8,
    paddingHorizontal: 10,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#23232a',
  },
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  label: {
    fontSize: 14,
    color: '#888',
    marginTop: 8,
    marginBottom: 2,
  },
  themeRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  themeBtn: {
    marginRight: 10,
    borderRadius: 8,
    minWidth: 90,
  },
  resetBtn: {
    marginTop: 18,
    borderRadius: 8,
    paddingVertical: 6,
  },
}); 