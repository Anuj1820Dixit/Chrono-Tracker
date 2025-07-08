import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Keyboard,
  TouchableWithoutFeedback,
  Platform,
  ScrollView,
  Modal,
  Animated,
  Easing,
  LayoutAnimation,
  UIManager,
  Dimensions,
} from 'react-native';
import {
  Text,
  TextInput,
  Button,
  Card,
  IconButton,
  useTheme,
  Snackbar,
  Chip,
  Divider,
  Menu,
  Switch as PaperSwitch,
} from 'react-native-paper';
import { AnimatedCircularProgress } from 'react-native-circular-progress';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Audio } from 'expo-av';
import { AdMobBanner, AdMobInterstitial, AdMobRewarded } from 'expo-ads-admob';

const QUOTES = [
  'Time is what we want most, but what we use worst.',
  'Discipline equals freedom.',
  'Success is the sum of small efforts.',
  'Small steps every day.',
  'Stay focused, stay humble.',
  'The secret of getting ahead is getting started.',
  'You don\'t have to be extreme, just consistent.',
  'Great things are done by a series of small things brought together.',
];

const FOCUS_PRESETS = [
  { label: 'Study Session', focus: 45, break: 15 },
  { label: 'Deep Work', focus: 90, break: 30 },
  { label: 'Quick Task', focus: 15, break: 5 },
];

const FOCUS_OPTIONS = [15, 25, 45, 90, 'Custom'];
const BREAK_OPTIONS = [5, 10, 15, 30, 'Custom'];
const SESSION_TOTAL = 4;
const TIMER_STYLES = [
  { key: 'ring', label: 'Classic Ring', icon: 'progress-clock' },
  { key: 'flip', label: 'Flip Clock', icon: 'clock-digital' },
  { key: 'bar', label: 'Bar', icon: 'progress-bar' },
  { key: 'dots', label: 'Dots', icon: 'dots-horizontal' },
];

const MODES = ['Pomodoro', 'Stopwatch', 'Countdown', 'Multi-Timer'];

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

function getRandomQuote() {
  const idx = Math.floor(Math.random() * QUOTES.length);
  return QUOTES[idx];
}

const SOFT_COLORS = {
  light: {
    background: '#23232a',
    card: '#23232a',
    accent: '#5C6BC0',
    accent2: '#64B5F6',
    text: '#E0E6ED',
    shadow: '#23233a',
    ring: ['#5C6BC0', '#64B5F6'],
    break: ['#81C784', '#64B5F6'],
    success: '#81C784',
    error: '#E57373',
    inactive: '#ECEFF1',
    divider: '#393A44',
    buttonHover: '#3949AB',
  },
  dark: {
    background: '#23232a',
    card: '#23232a',
    accent: '#5C6BC0',
    accent2: '#64B5F6',
    text: '#E0E6ED',
    shadow: '#23233a',
    ring: ['#5C6BC0', '#64B5F6'],
    break: ['#81C784', '#64B5F6'],
    success: '#81C784',
    error: '#E57373',
    inactive: '#ECEFF1',
    divider: '#393A44',
    buttonHover: '#3949AB',
  },
};

function useFlameAnimation(fireState) {
  const scale = React.useRef(new Animated.Value(1)).current;
  const opacity = React.useRef(new Animated.Value(1)).current;
  React.useEffect(() => {
    if (fireState === 'strong') {
      Animated.loop(
        Animated.sequence([
          Animated.timing(scale, { toValue: 1.08, duration: 900, useNativeDriver: true, easing: Easing.inOut(Easing.ease) }),
          Animated.timing(scale, { toValue: 1, duration: 900, useNativeDriver: true, easing: Easing.inOut(Easing.ease) }),
        ])
      ).start();
      Animated.timing(opacity, { toValue: 1, duration: 400, useNativeDriver: true }).start();
    } else if (fireState === 'flicker') {
      Animated.loop(
        Animated.sequence([
          Animated.timing(scale, { toValue: 1.12, duration: 120, useNativeDriver: true }),
          Animated.timing(scale, { toValue: 0.95, duration: 80, useNativeDriver: true }),
          Animated.timing(scale, { toValue: 1.05, duration: 100, useNativeDriver: true }),
          Animated.timing(scale, { toValue: 1, duration: 100, useNativeDriver: true }),
        ])
      ).start();
      Animated.timing(opacity, { toValue: 0.7, duration: 300, useNativeDriver: true }).start();
    } else if (fireState === 'burst') {
      Animated.sequence([
        Animated.timing(scale, { toValue: 1.4, duration: 300, useNativeDriver: true }),
        Animated.timing(scale, { toValue: 0, duration: 300, useNativeDriver: true }),
      ]).start(() => {
        scale.setValue(1);
        opacity.setValue(1);
      });
    } else if (fireState === 'smoke') {
      Animated.timing(opacity, { toValue: 0.4, duration: 400, useNativeDriver: true }).start();
      Animated.timing(scale, { toValue: 0.95, duration: 400, useNativeDriver: true }).start();
    }
    return () => {
      scale.stopAnimation();
      opacity.stopAnimation();
    };
  }, [fireState]);
  return { scale, opacity };
}

export default function TimerScreen({ navigation }) {
  const theme = useTheme();
  const isDark = theme.dark;
  const colors = isDark ? SOFT_COLORS.dark : SOFT_COLORS.light;
  const windowWidth = Dimensions.get('window').width;
  // --- State ---
  const [quote, setQuote] = useState(getRandomQuote());
  const [mode, setMode] = useState('Pomodoro');
  const [modeMenuVisible, setModeMenuVisible] = useState(false);
  const [task, setTask] = useState('');
  const [focusDuration, setFocusDuration] = useState(25);
  const [breakDuration, setBreakDuration] = useState(5);
  const [customFocus, setCustomFocus] = useState('');
  const [customBreak, setCustomBreak] = useState('');
  const [showCustomFocus, setShowCustomFocus] = useState(false);
  const [showCustomBreak, setShowCustomBreak] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [isBreak, setIsBreak] = useState(false);
  const [remaining, setRemaining] = useState(focusDuration * 60);
  const [session, setSession] = useState(1);
  const [soundOn, setSoundOn] = useState(true);
  const [snackbar, setSnackbar] = useState({ visible: false, msg: '' });
  const [presetScrollX] = useState(new Animated.Value(0));
  const [distractions, setDistractions] = useState([]);
  const [showDistraction, setShowDistraction] = useState(false);
  const [distractionInput, setDistractionInput] = useState('');
  const [pulseAnim] = useState(new Animated.Value(1));
  const [timerStyle, setTimerStyle] = useState('ring');
  const [timerMenuVisible, setTimerMenuVisible] = useState(false);
  const [showThemeSwitch, setShowThemeSwitch] = useState(false);
  const [fireState, setFireState] = useState('strong'); // strong, flicker, burst, smoke
  const [showCelebration, setShowCelebration] = useState(false);
  const [stopwatchTime, setStopwatchTime] = useState(0);
  const [countdownTime, setCountdownTime] = useState(60);
  const [customCountdown, setCustomCountdown] = useState('');
  const [showCustomCountdown, setShowCustomCountdown] = useState(false);
  const intervalRef = useRef(null);
  const soundRef = useRef(null);
  const [focusMenuVisible, setFocusMenuVisible] = useState(false);
  const [breakMenuVisible, setBreakMenuVisible] = useState(false);
  // Add state for skip breaks
  const [skipCount, setSkipCount] = useState(0);
  const MAX_FREE_SKIPS = 2;

  // --- Dynamic Quote ---
  useEffect(() => {
    const today = new Date().toISOString().slice(0, 10);
    AsyncStorage.getItem('quoteDay').then((savedDay) => {
      if (savedDay !== today) {
        const newQuote = getRandomQuote();
        setQuote(newQuote);
        AsyncStorage.setItem('quoteDay', today);
        AsyncStorage.setItem('quoteText', newQuote);
      } else {
        AsyncStorage.getItem('quoteText').then((q) => q && setQuote(q));
      }
    });
  }, []);

  // --- Fire Animation State Logic ---
  useEffect(() => {
    if (isRunning && !isBreak) setFireState('strong');
    else if (!isRunning && !isBreak) setFireState('flicker');
    else if (isBreak) setFireState('smoke');
  }, [isRunning, isBreak]);

  // --- Timer Logic (simplified for scaffold) ---
  useEffect(() => {
    let interval;
    if (isRunning) {
      if (mode === 'Pomodoro' && remaining > 0) {
        interval = setInterval(() => setRemaining((prev) => prev - 1), 1000);
      } else if (mode === 'Stopwatch') {
        interval = setInterval(() => setStopwatchTime((prev) => prev + 1), 1000);
      } else if (mode === 'Countdown' && countdownTime > 0) {
        interval = setInterval(() => setCountdownTime((prev) => prev - 1), 1000);
      }
    }
    return () => clearInterval(interval);
  }, [isRunning, mode, remaining, countdownTime]);

  // --- Pulse animation for Start button ---
  useEffect(() => {
    if (!isRunning) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.08, duration: 900, useNativeDriver: true, easing: Easing.inOut(Easing.ease) }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 900, useNativeDriver: true, easing: Easing.inOut(Easing.ease) }),
        ])
      ).start();
    } else {
      pulseAnim.setValue(1);
    }
    return () => pulseAnim.setValue(1);
  }, [isRunning]);

  // --- Animate layout changes ---
  useEffect(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
  }, [mode, timerStyle, isRunning, isBreak]);

  // --- Sound notification (expo-av) ---
  async function playChime() {
    try {
      if (soundRef.current) {
        await soundRef.current.unloadAsync();
      }
      const { sound } = await Audio.Sound.createAsync(
        require('../../assets/chime.mp3'),
        { shouldPlay: true }
      );
      soundRef.current = sound;
      await sound.playAsync();
    } catch (e) {}
  }

  // --- Handlers ---
  const handleStart = () => {
    setIsRunning(true);
    setFireState('strong');
  };
  const handlePause = () => {
    setIsRunning(false);
    setFireState('flicker');
  };
  const handleReset = () => {
    setIsRunning(false);
    setIsBreak(false);
    setSession(1);
    setRemaining(focusDuration * 60);
    setFireState('strong');
    setStopwatchTime(0);
    if (mode === 'Countdown') {
      setCountdownTime(countdownTime); // reset to selected countdown time
    }
  };
  const handlePreset = (focus, brk) => {
    setFocusDuration(focus);
    setBreakDuration(brk);
    setIsRunning(false);
    setIsBreak(false);
    setSession(1);
    setRemaining(focus * 60);
    setFireState('strong');
  };
  const handleLogDistraction = () => {
    setIsRunning(false);
    setFireState('flicker');
    setSnackbar({ visible: true, msg: 'Distraction logged!' });
  };
  const handleSaveDistraction = () => {
    if (distractionInput.trim()) {
      setDistractions((prev) => [...prev, { text: distractionInput, time: new Date().toISOString() }]);
      setDistractionInput('');
      setShowDistraction(false);
      setSnackbar({ visible: true, msg: 'Distraction logged!' });
    }
  };
  const handleSavePreset = () => {
    setSnackbar({ visible: true, msg: 'Preset saved! (Not implemented)' });
  };
  // Show interstitial after session complete
  const handleSessionComplete = async () => {
    try {
      await AdMobInterstitial.requestAdAsync({ servePersonalizedAds: false });
      await AdMobInterstitial.showAdAsync();
    } catch (e) {
      console.log('Interstitial ad failed:', e);
    }
  };

  // Skip break logic
  const handleSkipBreak = async () => {
    if (skipCount < MAX_FREE_SKIPS) {
      setSkipCount(skipCount + 1);
      setIsBreak(false);
      setRemaining(focusDuration * 60);
      setSnackbar({ visible: true, msg: 'Break skipped! Focus session started.' });
    } else {
      // Require rewarded ad
      try {
        await AdMobRewarded.requestAdAsync();
        await AdMobRewarded.showAdAsync();
        // Only increment skip if ad watched
        setSkipCount(skipCount + 1);
        setIsBreak(false);
        setRemaining(focusDuration * 60);
        setSnackbar({ visible: true, msg: 'Break skipped! Focus session started.' });
      } catch (e) {
        console.log('Rewarded ad failed or not watched:', e);
      }
    }
  };

  // --- Timer display ---
  const minutes = Math.floor(remaining / 60).toString().padStart(2, '0');
  const seconds = (remaining % 60).toString().padStart(2, '0');
  const progress = isBreak ? (remaining / (breakDuration * 60)) * 100 : (remaining / (focusDuration * 60)) * 100;
  const statusText = !isRunning ? 'Ready to start' : isBreak ? 'On Break' : 'Focusing...';
  const timerDisplay = mode === 'Pomodoro' ? `${minutes}:${seconds}` : mode === 'Stopwatch' ? `${Math.floor(stopwatchTime/60).toString().padStart(2,'0')}:${(stopwatchTime%60).toString().padStart(2,'0')}` : mode === 'Countdown' ? `${Math.floor(countdownTime/60).toString().padStart(2,'0')}:${(countdownTime%60).toString().padStart(2,'0')}` : '--:--';

  // --- Custom time modal logic ---
  const handleCustomFocus = () => {
    if (!customFocus || isNaN(customFocus) || customFocus < 1 || customFocus > 300) return;
    setFocusDuration(Number(customFocus));
    setShowCustomFocus(false);
    setCustomFocus('');
  };
  const handleCustomBreak = () => {
    if (!customBreak || isNaN(customBreak) || customBreak < 1 || customBreak > 300) return;
    setBreakDuration(Number(customBreak));
    setShowCustomBreak(false);
    setCustomBreak('');
  };

  // --- Timer Visuals ---
  function renderTimerVisual() {
    if (timerStyle === 'ring') {
      return (
        <AnimatedCircularProgress
          size={220}
          width={18}
          fill={progress}
          tintColor={isBreak ? colors.break[0] : colors.ring[0]}
          tintColorSecondary={isBreak ? colors.break[1] : colors.ring[1]}
          backgroundColor={isDark ? '#23233a' : '#e6eaf3'}
          rotation={0}
          lineCap="round"
          style={styles.circular}
        >
          {() => (
            <View style={styles.timerCenter}>
              <Text style={[styles.timerText, { color: colors.text }]}>{minutes}:{seconds}</Text>
              <Text style={[styles.statusText, { color: isBreak ? colors.break[0] : colors.accent }]}>{statusText}</Text>
              <Text style={[styles.sessionText, { color: colors.accent2 }]}>Session {session} of {SESSION_TOTAL}</Text>
              <IconButton
                icon={soundOn ? 'volume-high' : 'volume-off'}
                size={28}
                onPress={() => setSoundOn((v) => !v)}
                style={styles.soundBtn}
                accessibilityLabel="Toggle sound"
                color={colors.accent}
              />
            </View>
          )}
        </AnimatedCircularProgress>
      );
    }
    if (timerStyle === 'flip') {
      return (
        <View style={[styles.flipClock, { backgroundColor: isDark ? '#23233a' : '#e6eaf3' }]}> 
          <Text style={[styles.flipClockText, { color: colors.accent }]}>{minutes}</Text>
          <Text style={[styles.flipClockColon, { color: colors.accent2 }]}>:</Text>
          <Text style={[styles.flipClockText, { color: colors.accent }]}>{seconds}</Text>
        </View>
      );
    }
    if (timerStyle === 'bar') {
      return (
        <View style={styles.barTimerWrap}>
          <View style={[styles.barTimerBg, { backgroundColor: isDark ? '#23233a' : '#e6eaf3' }] }>
            <Animated.View style={[styles.barTimerFill, {
              width: `${progress}%`,
              backgroundColor: isBreak ? colors.break[0] : colors.accent,
            }]} />
          </View>
          <Text style={[styles.barTimerText, { color: colors.text }]}>{minutes}:{seconds}</Text>
        </View>
      );
    }
    if (timerStyle === 'dots') {
      const totalDots = 12;
      const filledDots = Math.round((progress / 100) * totalDots);
      return (
        <View style={styles.dotsTimerWrap}>
          {[...Array(totalDots)].map((_, i) => (
            <View
              key={i}
              style={[styles.dot, i < filledDots ? { backgroundColor: colors.accent } : styles.dotEmpty]}
            />
          ))}
          <Text style={[styles.dotsTimerText, { color: colors.text }]}>{minutes}:{seconds}</Text>
        </View>
      );
    }
    return null;
  }

  // --- Render ---
  return (
    <ScrollView style={{ flex: 1, backgroundColor: theme.colors.background }} contentContainerStyle={{ padding: 0 }}>
      <View style={{ flex: 1, padding: 0, backgroundColor: theme.colors.background }}>
        <View style={styles.container}>
          <Card style={[styles.card, { backgroundColor: colors.card, shadowColor: colors.shadow }] }>
            {/* Quote */}
            <View style={styles.quoteWrap}>
              <Text style={styles.quoteText}>“{quote}”</Text>
            </View>
            {/* Mode Dropdown */}
            <View style={styles.modeRow}>
              <Text style={styles.modeLabel}>Choose your mode</Text>
              <Menu
                visible={modeMenuVisible}
                onDismiss={() => setModeMenuVisible(false)}
                anchor={
                  <Button
                    mode="contained"
                    icon="chevron-down"
                    onPress={() => setModeMenuVisible(true)}
                    style={styles.modeBtn}
                    labelStyle={{ color: colors.text, fontWeight: 'bold' }}
                  >
                    {mode}
                  </Button>
                }
              >
                {MODES.map((m) => (
                  <Menu.Item key={m} onPress={() => { setMode(m); setModeMenuVisible(false); }} title={m} />
                ))}
              </Menu>
            </View>
            {/* Task Input */}
            <TextInput
              label="What will you focus on?"
              value={task}
              onChangeText={setTask}
              style={styles.input}
              mode="outlined"
              theme={{ colors: { background: colors.card, text: colors.text, placeholder: colors.inactive, primary: colors.text } }}
              placeholderTextColor={colors.text}
            />
            {/* Duration/Break Pickers */}
            <View style={styles.pickerRow}>
              <View style={styles.pickerCol}>
                <Text style={styles.pickerLabel}>Duration:</Text>
                <Menu
                  visible={focusMenuVisible}
                  onDismiss={() => setFocusMenuVisible(false)}
                  anchor={
                    <Button
                      mode="contained"
                      onPress={() => setFocusMenuVisible(true)}
                      style={[styles.pickerDropdown, { backgroundColor: colors.card }]}
                      labelStyle={{ color: colors.text }}
                    >
                      {mode === 'Countdown' && !FOCUS_OPTIONS.includes(countdownTime/60) ? `${Math.floor(countdownTime/60)}m ${countdownTime%60}s` : FOCUS_OPTIONS.includes(focusDuration) ? `${focusDuration}m` : `${focusDuration}m`}
                    </Button>
                  }
                  contentStyle={{ backgroundColor: colors.card }}
                >
                  {[15, 25, 45, 90, 'Custom'].map((min) => (
                    <Menu.Item
                      key={min}
                      onPress={() => {
                        setFocusMenuVisible(false);
                        if (min === 'Custom') setShowCustomCountdown(true);
                        else if (mode === 'Countdown') setCountdownTime(min * 60);
                        else setFocusDuration(min);
                      }}
                      title={min === 'Custom' ? 'Custom…' : `${min}m`}
                      titleStyle={{ color: colors.text }}
                    />
                  ))}
                </Menu>
              </View>
              <View style={styles.pickerCol}>
                <Text style={styles.pickerLabel}>Break:</Text>
                <Menu
                  visible={breakMenuVisible}
                  onDismiss={() => setBreakMenuVisible(false)}
                  anchor={
                    <Button
                      mode="contained"
                      onPress={() => setBreakMenuVisible(true)}
                      style={[styles.pickerDropdown, { backgroundColor: colors.card }]}
                      labelStyle={{ color: colors.text }}
                    >
                      {BREAK_OPTIONS.includes(breakDuration) ? `${breakDuration}m` : `${breakDuration}m`}
                    </Button>
                  }
                  contentStyle={{ backgroundColor: colors.card }}
                >
                  {[5, 10, 15, 30, 'Custom'].map((min) => (
                    <Menu.Item
                      key={min}
                      onPress={() => {
                        setBreakMenuVisible(false);
                        if (min === 'Custom') setShowCustomBreak(true);
                        else setBreakDuration(min);
                      }}
                      title={min === 'Custom' ? 'Custom…' : `${min}m`}
                      titleStyle={{ color: colors.text }}
                    />
                  ))}
                </Menu>
              </View>
            </View>
            {/* Fire Animation (Custom Animated Flame) */}
            <View style={styles.fireWrapCentered}>
              <AnimatedFlame fireState={fireState} />
              <View style={styles.timerOverlayCentered}>
                <Text style={styles.timerText}>{timerDisplay}</Text>
                <Text style={styles.sessionText}>{mode === 'Pomodoro' ? `Ready to start • Session ${session} of 4` : mode === 'Stopwatch' ? 'Stopwatch' : mode === 'Countdown' ? 'Countdown' : ''}</Text>
              </View>
              {showCelebration && (
                <View style={styles.celebrateBadge}>
                  <Text style={styles.celebrateText}>🔥 You survived the session!</Text>
                </View>
              )}
            </View>
            {/* Action Buttons */}
            <View style={styles.buttonRow}>
              {!isRunning ? (
                <Button
                  mode="contained"
                  onPress={handleStart}
                  style={[styles.actionBtn, { backgroundColor: colors.accent }]}
                  labelStyle={{ color: '#fff', fontWeight: 'bold' }}
                >
                  Start / Pause
                </Button>
              ) : (
                <Button
                  mode="contained"
                  onPress={handlePause}
                  style={[styles.actionBtn, { backgroundColor: colors.accent2 }]}
                  labelStyle={{ color: '#fff', fontWeight: 'bold' }}
                >
                  Pause
                </Button>
              )}
              <Button
                mode="outlined"
                onPress={handleReset}
                style={[styles.actionBtn, { borderColor: colors.divider }]}
                labelStyle={{ color: colors.text, fontWeight: 'bold' }}
              >
                Reset
              </Button>
              <Button
                mode="outlined"
                onPress={handleSkipBreak}
                style={[styles.actionBtn, { borderColor: colors.accent2 }]}
                labelStyle={{ color: colors.accent2, fontWeight: 'bold' }}
              >
                Skip Break
              </Button>
            </View>
            {/* Quick Presets */}
            <View style={styles.presetsRow}>
              {FOCUS_PRESETS.map((preset) => (
                <Chip
                  key={preset.label}
                  style={[styles.presetChip, { backgroundColor: colors.accent2, color: colors.text }]}
                  icon="lightning-bolt"
                  onPress={() => handlePreset(preset.focus, preset.break)}
                  textStyle={{ color: colors.text }}
                >
                  {preset.label}: {preset.focus}m/{preset.break}m
                </Chip>
              ))}
            </View>
          </Card>
        </View>
        <Snackbar
          visible={snackbar.visible}
          onDismiss={() => setSnackbar({ ...snackbar, visible: false })}
          duration={2000}
        >
          {snackbar.msg}
        </Snackbar>
        <Modal visible={showCustomFocus} transparent animationType="fade">
          <View style={styles.modalBg}>
            <Card style={styles.modalCard}>
              <Card.Content>
                <Text style={{ color: colors.text }}>Enter custom focus time (1–300 min):</Text>
                <TextInput
                  value={customFocus}
                  onChangeText={setCustomFocus}
                  keyboardType="numeric"
                  style={{ marginVertical: 12, color: colors.text }}
                  mode="outlined"
                  autoFocus
                  theme={{ colors: { background: colors.card, text: colors.text, placeholder: colors.inactive } }}
                />
                <Button mode="contained" onPress={handleCustomFocus}>Set</Button>
                <Button onPress={() => setShowCustomFocus(false)} style={{ marginTop: 8 }}>Cancel</Button>
              </Card.Content>
            </Card>
          </View>
        </Modal>
        <Modal visible={showCustomBreak} transparent animationType="fade">
          <View style={styles.modalBg}>
            <Card style={styles.modalCard}>
              <Card.Content>
                <Text style={{ color: colors.text }}>Enter custom break time (1–300 min):</Text>
                <TextInput
                  value={customBreak}
                  onChangeText={setCustomBreak}
                  keyboardType="numeric"
                  style={{ marginVertical: 12, color: colors.text }}
                  mode="outlined"
                  autoFocus
                  theme={{ colors: { background: colors.card, text: colors.text, placeholder: colors.inactive } }}
                />
                <Button mode="contained" onPress={handleCustomBreak}>Set</Button>
                <Button onPress={() => setShowCustomBreak(false)} style={{ marginTop: 8 }}>Cancel</Button>
              </Card.Content>
            </Card>
          </View>
        </Modal>
        <Modal visible={showCustomCountdown} transparent animationType="fade">
          <View style={styles.modalBg}>
            <Card style={styles.modalCard}>
              <Card.Content>
                <Text style={{ color: colors.text }}>Enter custom countdown (mm:ss):</Text>
                <TextInput
                  value={customCountdown}
                  onChangeText={setCustomCountdown}
                  placeholder="e.g. 2:30 for 2 min 30 sec"
                  keyboardType="numeric"
                  style={{ marginVertical: 12, color: colors.text }}
                  mode="outlined"
                  autoFocus
                  theme={{ colors: { background: colors.card, text: colors.text, placeholder: colors.inactive } }}
                />
                <Button mode="contained" onPress={() => {
                  // Parse mm:ss
                  let min = 0, sec = 0;
                  if (customCountdown.includes(':')) {
                    const [m, s] = customCountdown.split(':');
                    min = parseInt(m, 10) || 0;
                    sec = parseInt(s, 10) || 0;
                  } else {
                    min = parseInt(customCountdown, 10) || 0;
                  }
                  setCountdownTime(min * 60 + sec);
                  setShowCustomCountdown(false);
                  setCustomCountdown('');
                }}>Set</Button>
                <Button onPress={() => setShowCustomCountdown(false)} style={{ marginTop: 8 }}>Cancel</Button>
              </Card.Content>
            </Card>
          </View>
        </Modal>
        <AdMobBanner
          bannerSize="smartBannerPortrait"
          adUnitID="ca-app-pub-3940256099942544/6300978111"
          servePersonalizedAds={false}
          onDidFailToReceiveAdWithError={console.log}
          style={{ alignSelf: 'center', marginTop: 8 }}
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 12,
    minHeight: 600,
  },
  card: {
    width: '100%',
    maxWidth: 370,
    borderRadius: 24,
    padding: 16,
    alignSelf: 'center',
    marginTop: 18,
    marginBottom: 18,
    elevation: 4,
    shadowOpacity: 0.12,
    shadowRadius: 12,
  },
  quoteWrap: {
    marginBottom: 10,
    alignItems: 'center',
  },
  quoteText: {
    fontSize: 15,
    color: '#bbb',
    fontStyle: 'italic',
    textAlign: 'center',
    marginBottom: 2,
  },
  modeRow: {
    alignItems: 'center',
    marginBottom: 10,
  },
  modeLabel: {
    color: '#bbb',
    fontSize: 14,
    marginRight: 8,
  },
  modeBtn: {
    borderRadius: 16,
    backgroundColor: '#23232a',
    marginTop: 2,
    marginBottom: 2,
    minWidth: 140,
    alignSelf: 'center',
  },
  input: {
    borderRadius: 12,
    marginBottom: 10,
    backgroundColor: '#23232a',
    color: '#fff',
  },
  pickerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
    gap: 8,
  },
  pickerCol: {
    flex: 1,
    alignItems: 'center',
  },
  pickerLabel: {
    color: '#bbb',
    fontSize: 14,
    marginBottom: 2,
  },
  pickerDropdown: {
    borderRadius: 10,
    minWidth: 90,
    marginTop: 4,
    marginBottom: 4,
    elevation: 1,
  },
  fireWrapCentered: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 18,
    position: 'relative',
    width: '100%',
    minHeight: 220,
    flex: 1,
  },
  fireLottie: {
    width: 180,
    height: 180,
    alignSelf: 'center',
    backgroundColor: 'transparent',
  },
  timerOverlayCentered: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: 180,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
    flexDirection: 'column',
    display: 'flex',
  },
  timerText: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#fff',
    textShadowColor: '#000',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 6,
  },
  sessionText: {
    fontSize: 14,
    color: '#fff',
    marginTop: 6,
    textShadowColor: '#000',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  celebrateBadge: {
    position: 'absolute',
    bottom: -32,
    left: 0,
    right: 0,
    alignItems: 'center',
    backgroundColor: '#23232a',
    borderRadius: 16,
    padding: 8,
    elevation: 2,
  },
  celebrateText: {
    color: '#FFD700',
    fontWeight: 'bold',
    fontSize: 16,
  },
  buttonRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 8,
    marginTop: 8,
  },
  actionBtn: {
    marginHorizontal: 6,
    marginVertical: 4,
    borderRadius: 10,
    minWidth: 110,
    elevation: 2,
  },
  presetsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 10,
    gap: 8,
    flexWrap: 'wrap',
  },
  presetChip: {
    marginRight: 8,
    marginBottom: 4,
    borderRadius: 16,
    elevation: 1,
  },
  modalBg: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCard: {
    backgroundColor: '#23232a',
    padding: 20,
    borderRadius: 10,
    width: '80%',
    maxWidth: 300,
  },
});

// Custom Animated Flame Component
function AnimatedFlame({ fireState }) {
  const { scale, opacity } = useFlameAnimation(fireState);
  // Colors for the flame
  const flameColors = [
    ['#FFD700', '#FFA500'], // outer
    ['#FF9800', '#FF5722'], // mid
    ['#FFFDE4', '#FFD700'], // inner
  ];
  return (
    <Animated.View style={[styles.fireLottie, { transform: [{ scale }], opacity }]}> 
      {/* Outer flame */}
      <View style={{
        position: 'absolute',
        top: 30, left: 30, right: 30, bottom: 30,
        borderRadius: 60,
        backgroundColor: flameColors[0][0],
        opacity: 0.4,
        zIndex: 1,
      }} />
      {/* Mid flame */}
      <View style={{
        position: 'absolute',
        top: 45, left: 45, right: 45, bottom: 45,
        borderRadius: 45,
        backgroundColor: flameColors[1][0],
        opacity: 0.7,
        zIndex: 2,
      }} />
      {/* Inner flame */}
      <View style={{
        position: 'absolute',
        top: 60, left: 60, right: 60, bottom: 60,
        borderRadius: 30,
        backgroundColor: flameColors[2][0],
        opacity: 0.95,
        zIndex: 3,
      }} />
    </Animated.View>
  );
} 