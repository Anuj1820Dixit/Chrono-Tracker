import React, { useEffect, useState } from 'react';
import { View, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { Text, Card, ProgressBar, useTheme, IconButton, Divider, Modal, Portal, Button, TextInput as PaperInput } from 'react-native-paper';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { BarChart } from 'react-native-chart-kit';
import { Dimensions } from 'react-native';
import { useFonts, Montserrat_700Bold, Montserrat_400Regular } from '@expo-google-fonts/montserrat';
import { useAuth } from './AuthProvider';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { AdMobBanner } from 'expo-ads-admob';

const screenWidth = Dimensions.get('window').width;

function getDeadlineStatus(dueDate) {
  const today = new Date();
  const due = new Date(dueDate);
  const diff = Math.floor((due - new Date(today.getFullYear(), today.getMonth(), today.getDate())) / (1000 * 60 * 60 * 24));
  if (diff === 0) return { text: 'Due today', color: '#FFD600' };
  if (diff < 0) return { text: `Overdue by ${-diff} day${-diff > 1 ? 's' : ''}`, color: '#FF5252' };
  if (diff === 1) return { text: 'In 1 day', color: '#43A047' };
  return { text: `In ${diff} days`, color: '#43A047' };
}

function getSubtaskProgress(task) {
  if (!task.subtasks || task.subtasks.length === 0) return { done: task.completed ? 1 : 0, total: 1 };
  const done = task.subtasks.filter(s => s.completed).length;
  return { done, total: task.subtasks.length };
}

export default function HomeScreen({ navigation, route }) {
  const theme = useTheme();
  const [tasks, setTasks] = useState([]);
  const [focusHistory, setFocusHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  let [fontsLoaded] = useFonts({ Montserrat_700Bold, Montserrat_400Regular });
  const { user, signOut } = useAuth();
  const [profileVisible, setProfileVisible] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [newName, setNewName] = useState('');
  const [nameChanged, setNameChanged] = useState(false);

  // Get display name: user_metadata name, else before @ in email
  const displayName = user?.user_metadata?.full_name || user?.user_metadata?.name || (user?.email ? user.email.split('@')[0] : 'N/A');

  // Reload data on focus for perfect sync
  useFocusEffect(
    React.useCallback(() => {
      let isActive = true;
      (async () => {
        try {
          const saved = await AsyncStorage.getItem('plannerTasksV2');
          if (isActive) setTasks(saved ? JSON.parse(saved) : []);
          const hist = await AsyncStorage.getItem('focusSessionHistory');
          if (isActive) setFocusHistory(hist ? JSON.parse(hist) : []);
        } catch {}
        if (isActive) setLoading(false);
      })();
      return () => { isActive = false; };
    }, [])
  );

  // Listen for navigation param to open/close modal
  useEffect(() => {
    if (route?.params?.showProfileModal) {
      setProfileVisible(true);
      navigation.setParams({ showProfileModal: false });
    }
  }, [route?.params?.showProfileModal]);

  // Handle name change (Supabase user_metadata update)
  const handleNameChange = async () => {
    if (!newName.trim()) return;
    try {
      // Try to update in Supabase
      const { error } = await user && user.id && user.email &&
        (await import('../lib/supabase')).supabase.auth.updateUser({ data: { full_name: newName } });
      if (!error) {
        setNameChanged(true);
        setEditingName(false);
      }
    } catch {
      // fallback: store in local storage
      await AsyncStorage.setItem('user-custom-name', newName);
      setNameChanged(true);
      setEditingName(false);
    }
  };

  // Upcoming tasks/events (all incomplete with a due date, including overdue)
  const upcoming = tasks
    .filter(t => !t.completed && t.dueDate)
    .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate) || (a.time || '').localeCompare(b.time || ''))
    .slice(0, 3);

  // Streak: count of consecutive days with at least 1 completed focus session
  const todayStr = new Date().toISOString().slice(0, 10);
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  });
  const focusByDay = days.map(dStr => focusHistory.filter(s => s.date === dStr).reduce((sum, s) => sum + (s.duration || 0), 0));
  let streak = 0;
  for (let i = 6; i >= 0; i--) {
    if (focusByDay[i] > 0) streak++;
    else break;
  }
  const focusedToday = focusByDay[6];

  if (!fontsLoaded || loading) {
    return <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.colors.background }}><Text style={{ color: theme.colors.text }}>Loading...</Text></View>;
  }

  return (
    <>
      <Portal>
        <Modal visible={profileVisible} onDismiss={() => setProfileVisible(false)} contentContainerStyle={{ backgroundColor: theme.colors.surface, margin: 32, borderRadius: 16, padding: 24 }}>
          <Text style={{ fontSize: 22, fontWeight: 'bold', color: theme.colors.text, marginBottom: 12 }}>Profile</Text>
          <Text style={{ color: theme.colors.text, marginBottom: 8 }}>Email: {user?.email || 'N/A'}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
            <Text style={{ color: theme.colors.text, marginRight: 8 }}>Name: </Text>
            {editingName ? (
              <PaperInput
                value={newName}
                onChangeText={setNewName}
                style={{ backgroundColor: theme.colors.background, color: theme.colors.text, flex: 1 }}
                dense
                autoFocus
                onSubmitEditing={handleNameChange}
                onBlur={handleNameChange}
                returnKeyType="done"
              />
            ) : (
              <>
                <Text style={{ color: theme.colors.text, fontWeight: 'bold', marginRight: 4 }}>{displayName}</Text>
                {!nameChanged && (
                  <MaterialCommunityIcons
                    name="pencil"
                    size={20}
                    color={theme.colors.primary}
                    style={{ marginLeft: 4 }}
                    onPress={() => { setEditingName(true); setNewName(displayName); }}
                  />
                )}
              </>
            )}
          </View>
          <Button mode="contained" onPress={async () => { setProfileVisible(false); await signOut(); }} style={{ marginTop: 8 }}>
            Logout
          </Button>
          <Button onPress={() => setProfileVisible(false)} style={{ marginTop: 8 }}>
            Close
          </Button>
        </Modal>
      </Portal>
      <ScrollView style={{ flex: 1, backgroundColor: theme.colors.background }} contentContainerStyle={{ padding: 16 }}>
        <Text style={{ fontFamily: 'Montserrat_700Bold', fontSize: 22, color: theme.colors.text, marginBottom: 8 }}>Upcoming Tasks & Events</Text>
        {upcoming.length === 0 ? (
          <View style={[styles.sectionCard, { backgroundColor: theme.colors.surface }] }>
            <Text style={{ color: theme.colors.muted, fontFamily: 'Montserrat_400Regular' }}>No upcoming tasks or events.</Text>
          </View>
        ) : (
          upcoming.map((task, idx) => {
            const { done, total } = getSubtaskProgress(task);
            const progress = total === 0 ? 0 : done / total;
            const deadline = getDeadlineStatus(task.dueDate);
            return (
              <TouchableOpacity key={task.id} onPress={() => navigation.navigate('Planner')}>
                <View style={[styles.taskCardContainer, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
                  <Text style={[styles.taskTitle, { color: theme.colors.text }]}>{task.name}</Text>
                  <View style={styles.progressBarWrap}>
                    <View style={styles.progressBarBg} />
                    <View style={[styles.progressBarFill, { width: `${progress * 100}%`, backgroundColor: theme.colors.primary }]} />
                    <View style={[styles.progressThumb, { left: `${progress * 100}%`, marginLeft: -9, backgroundColor: theme.colors.primary, borderColor: theme.colors.surface }]} />
                  </View>
                  <Text style={[styles.subtaskProgress, { color: theme.colors.muted }]}>{done}/{total} Subtasks Completed</Text>
                  <Text style={[styles.deadlineBadge, { color: deadline.color }]}>{deadline.text}</Text>
                </View>
              </TouchableOpacity>
            );
          })
        )}
        <Text style={{ fontFamily: 'Montserrat_700Bold', fontSize: 22, color: theme.colors.text, marginBottom: 8, marginTop: 10 }}>Streak & Focus Stats</Text>
        <View style={[styles.sectionCard, { backgroundColor: theme.colors.surface }] }>
          <View style={styles.statsRow}>
            <Text style={[styles.statsLabel, { color: theme.colors.text }]}>🔥 Streak Count</Text>
            <Text style={[styles.statsValue, { color: theme.colors.text }]}>{streak} Days</Text>
          </View>
          <View style={styles.statsRow}>
            <Text style={[styles.statsLabel, { color: theme.colors.text }]}>⏱️ Focused Time Today</Text>
            <Text style={[styles.statsValue, { color: theme.colors.text }]}>{Math.floor(focusedToday/60)}h {focusedToday%60}m</Text>
          </View>
          <BarChart
            data={{
              labels: days.map(d => d.slice(5)),
              datasets: [{ data: focusByDay }],
            }}
            width={screenWidth-48}
            height={80}
            yAxisSuffix="m"
            chartConfig={{
              backgroundColor: theme.colors.surface,
              backgroundGradientFrom: theme.colors.surface,
              backgroundGradientTo: theme.colors.surface,
              decimalPlaces: 0,
              color: (opacity = 1) => theme.colors.primary,
              labelColor: (opacity = 1) => theme.colors.text,
              style: { borderRadius: 12 },
              propsForBackgroundLines: { stroke: theme.colors.muted },
            }}
            style={{ marginTop: 8, borderRadius: 12 }}
            fromZero
            showValuesOnTopOfBars={false}
          />
        </View>
      </ScrollView>
      <AdMobBanner
        bannerSize="smartBannerPortrait"
        adUnitID="ca-app-pub-3940256099942544/6300978111"
        servePersonalizedAds={false}
        onDidFailToReceiveAdWithError={console.log}
        style={{ alignSelf: 'center', marginTop: 8 }}
      />
    </>
  );
}

const styles = StyleSheet.create({
  sectionCard: {
    marginBottom: 16,
    borderRadius: 18,
    backgroundColor: '#292933',
    padding: 18,
  },
  taskCardContainer: {
    backgroundColor: '#23232a',
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#292933',
  },
  progressBarWrap: {
    height: 10,
    borderRadius: 8,
    backgroundColor: '#444',
    width: '100%',
    marginTop: 4,
    marginBottom: 2,
    position: 'relative',
    overflow: 'visible',
  },
  progressBarBg: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#444',
    borderRadius: 8,
  },
  progressBarFill: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    backgroundColor: '#4CAF50',
    borderRadius: 8,
    zIndex: 1,
  },
  progressThumb: {
    position: 'absolute',
    top: -4,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#4CAF50',
    borderWidth: 3,
    borderColor: '#fff',
    zIndex: 2,
  },
  taskTitle: {
    fontFamily: 'Montserrat_700Bold',
    fontSize: 16,
    color: '#fff',
    marginBottom: 2,
  },
  subtaskProgress: {
    fontSize: 13,
    color: '#aaa',
    fontFamily: 'Montserrat_400Regular',
    marginTop: 2,
  },
  deadlineBadge: {
    fontWeight: 'bold',
    fontSize: 13,
    marginTop: 2,
    fontFamily: 'Montserrat_700Bold',
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 0,
    marginTop: 0,
  },
  statsLabel: {
    fontFamily: 'Montserrat_700Bold',
    color: '#fff',
    fontSize: 16,
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  statsValue: {
    fontFamily: 'Montserrat_700Bold',
    color: '#fff',
    fontSize: 18,
    textAlign: 'right',
    flex: 1,
  },
}); 