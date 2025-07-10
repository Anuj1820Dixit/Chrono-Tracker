import React, { useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Platform,
  Dimensions,
} from 'react-native';
import {
  Text,
  Card,
  Button,
  Divider,
  useTheme,
  Switch,
  TextInput,
  IconButton,
} from 'react-native-paper';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { PieChart as ChartKitPieChart, BarChart as ChartKitBarChart } from 'react-native-chart-kit';
import { AnimatedCircularProgress } from 'react-native-circular-progress';

const TASK_COLORS = {
  Study: '#6200ee',
  Work: '#43a047',
  Exercise: '#fbc02d',
  Other: '#90a4ae',
};

function formatMinutesToHHMM(mins) {
  const h = Math.floor(mins / 60).toString().padStart(2, '0');
  const m = (mins % 60).toString().padStart(2, '0');
  return `${h}:${m}`;
}

function getTodayString() {
  const now = new Date();
  return now.toISOString().slice(0, 10); // 'YYYY-MM-DD'
}

function getYesterdayString() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
}

function isSameDay(dateStr, targetStr) {
  return dateStr === targetStr;
}

function getWeekRange(date) {
  // Returns [startDate, endDate] for the week containing 'date'
  const d = new Date(date);
  const day = d.getDay(); // 0 (Sun) - 6 (Sat)
  const diffToMonday = (day + 6) % 7;
  const monday = new Date(d);
  monday.setDate(d.getDate() - diffToMonday);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  return [monday, sunday];
}

function isInWeek(dateStr, weekStart, weekEnd) {
  const d = new Date(dateStr);
  return d >= weekStart && d <= weekEnd;
}

const DEFAULT_GOAL = { type: 'daily', value: 120, category: 'All' }; // 2 hours default

export default function AnalysisScreen() {
  const theme = useTheme();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState('day'); // 'day' or 'week'
  const [selectedDate, setSelectedDate] = useState(getTodayString());
  const [goal, setGoal] = useState(DEFAULT_GOAL);
  const [goalInput, setGoalInput] = useState('120');
  const [goalType, setGoalType] = useState('daily');
  const [showGoalEdit, setShowGoalEdit] = useState(false);
  const [compareMode, setCompareMode] = useState('yesterday'); // 'yesterday' or 'average'

  // Load tasks and goal from AsyncStorage
  useEffect(() => {
    (async () => {
      try {
        const saved = await AsyncStorage.getItem('plannerTasks');
        if (saved) setTasks(JSON.parse(saved));
        const savedGoal = await AsyncStorage.getItem('focusGoal');
        if (savedGoal) setGoal(JSON.parse(savedGoal));
      } catch (e) {}
      setLoading(false);
    })();
  }, []);

  // Save goal to AsyncStorage
  useEffect(() => {
    AsyncStorage.setItem('focusGoal', JSON.stringify(goal));
  }, [goal]);

  // Date options for picker
  const dateOptions = Array.from({ length: 14 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - i);
    return d.toISOString().slice(0, 10);
  });

  // Filtered tasks for selected day/week
  let filteredTasks = [];
  if (filterType === 'day') {
    filteredTasks = tasks.filter(
      (t) => t.completed && isSameDay((t.completedDate || t.startTimeDate || getTodayString()), selectedDate)
    );
  } else {
    const [weekStart, weekEnd] = getWeekRange(selectedDate);
    filteredTasks = tasks.filter(
      (t) => t.completed && isInWeek((t.completedDate || t.startTimeDate || getTodayString()), weekStart, weekEnd)
    );
  }

  // --- Productivity Score ---
  // For demo, assume "Total App Time" is sum of all durations for today (could be tracked separately)
  const todayStr = getTodayString();
  const todayTasks = tasks.filter(
    (t) => t.completed && isSameDay((t.completedDate || t.startTimeDate || todayStr), todayStr)
  );
  const totalFocusMins = todayTasks.reduce((sum, t) => sum + (t.duration || 0), 0);
  const totalAppMins = todayTasks.reduce((sum, t) => sum + (t.duration || 0), 0); // For now, same as focus
  const productivityScore = totalAppMins > 0 ? Math.round((totalFocusMins / totalAppMins) * 100) : 0;
  let prodColor = '#43a047';
  if (productivityScore < 60) prodColor = '#e53935';
  else if (productivityScore < 80) prodColor = '#fbc02d';

  // --- Streak Tracker ---
  // Count consecutive days user hit goal
  let streak = 0;
  let streaking = true;
  for (let i = 0; i < 30; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dStr = d.toISOString().slice(0, 10);
    const dayTotal = tasks.filter(
      (t) => t.completed && isSameDay((t.completedDate || t.startTimeDate || dStr), dStr)
    ).reduce((sum, t) => sum + (t.duration || 0), 0);
    if (dayTotal >= (goal.type === 'daily' ? goal.value : goal.value / 7)) streak++;
    else break;
  }

  // --- Goal Tracker ---
  let goalPeriodTotal = 0;
  if (goal.type === 'daily') {
    goalPeriodTotal = todayTasks.reduce((sum, t) => sum + (t.duration || 0), 0);
  } else {
    // weekly
    const [weekStart, weekEnd] = getWeekRange(todayStr);
    goalPeriodTotal = tasks.filter(
      (t) => t.completed && isInWeek((t.completedDate || t.startTimeDate || todayStr), weekStart, weekEnd)
    ).reduce((sum, t) => sum + (t.duration || 0), 0);
  }
  const goalPercent = goal.value > 0 ? Math.min(100, Math.round((goalPeriodTotal / goal.value) * 100)) : 0;
  let goalColor = '#43a047';
  if (goalPercent < 60) goalColor = '#e53935';
  else if (goalPercent < 80) goalColor = '#fbc02d';

  // --- Compare Days ---
  const yesterdayStr = getYesterdayString();
  const yesterdayTotal = tasks.filter(
    (t) => t.completed && isSameDay((t.completedDate || t.startTimeDate || yesterdayStr), yesterdayStr)
  ).reduce((sum, t) => sum + (t.duration || 0), 0);
  const avgTotal = (() => {
    const focusByDay = {};
    tasks.forEach((t) => {
      if (t.completed) {
        const day = (t.completedDate || t.startTimeDate || getTodayString());
        focusByDay[day] = (focusByDay[day] || 0) + (t.duration || 0);
      }
    });
    return Object.values(focusByDay).length > 0
      ? Math.round(Object.values(focusByDay).reduce((a, b) => a + b, 0) / Object.values(focusByDay).length)
      : 0;
  })();
  const compareValue = compareMode === 'yesterday' ? yesterdayTotal : avgTotal;
  const compareLabel = compareMode === 'yesterday' ? "Yesterday" : "Avg";

  // --- Pie chart data ---
  const categoryTotals = {};
  todayTasks.forEach((t) => {
    categoryTotals[t.type] = (categoryTotals[t.type] || 0) + (t.duration || 0);
  });
  const pieData = Object.keys(categoryTotals).map((key, idx) => ({
    name: key,
    population: categoryTotals[key],
    color: TASK_COLORS[key] || '#ccc',
    legendFontColor: theme.dark ? '#fff' : '#222',
    legendFontSize: 14,
  }));

  const chartWidth = Math.min(Dimensions.get('window').width - 32, 400);

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <ScrollView contentContainerStyle={[styles.container, { backgroundColor: theme.colors.background }]}> 
        <Text style={{ fontWeight: 'bold', fontSize: 28, marginBottom: 2, color: theme.colors.text }}>Analysis</Text>
        <Text style={{ color: '#888', fontSize: 16, marginBottom: 18 }}>Track your progress and insights</Text>
        {/* Top 4 Cards: 2x2 grid, smaller */}
        <View style={styles.topGridRow}>
          <View style={styles.progressCardSmall}><Text style={[styles.progressValueSmall, { color: '#6c47ff' }]}>{formatMinutesToHHMM(totalFocusMins)}</Text><Text style={styles.progressLabelSmall}>Total Focus Time</Text></View>
          <View style={styles.progressCardSmall}><Text style={[styles.progressValueSmall, { color: '#43a047' }]}>{todayTasks.length}</Text><Text style={styles.progressLabelSmall}>Sessions Completed</Text></View>
        </View>
        <View style={styles.topGridRow}>
          <View style={styles.progressCardSmall}><Text style={[styles.progressValueSmall, { color: '#a047ff' }]}>{formatMinutesToHHMM(todayTasks.reduce((max, t) => Math.max(max, t.duration || 0), 0))}</Text><Text style={styles.progressLabelSmall}>Longest Session</Text></View>
          <View style={styles.progressCardSmall}><Text style={[styles.progressValueSmall, { color: prodColor }]}>{productivityScore}%</Text><Text style={styles.progressLabelSmall}>Productive Score</Text></View>
        </View>
        {/* Compare Card */}
        <View style={styles.compareCard}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <Text style={styles.sectionTitle}>Compare</Text>
            <View style={{ flexDirection: 'row', marginBottom: 10 }}>
              {['yesterday', 'average'].map((mode) => (
                <Button
                  key={mode}
                  mode={compareMode === (mode === 'yesterday' ? 'contained' : 'average') ? 'contained' : 'outlined'}
                  onPress={() => setCompareMode(mode === 'yesterday' ? 'yesterday' : 'average')}
                  style={{
                    minWidth: 80,
                    paddingHorizontal: 16,
                    borderRadius: 20,
                    marginRight: 8,
                  }}
                  labelStyle={{
                    color: compareMode === (mode === 'yesterday' ? 'yesterday' : 'average') ? '#fff' : theme.colors.text,
                    fontWeight: 'bold',
                    fontSize: 15,
                  }}
                >
                  {mode === 'yesterday' ? 'Yesterday' : 'Avg'}
                </Button>
              ))}
            </View>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 2 }}>
            <Text style={{ fontSize: 18, color: '#6c47ff', fontWeight: 'bold' }}>{compareLabel}:</Text>
            <Text style={{ fontSize: 18, fontWeight: 'bold', marginLeft: 8 }}>{formatMinutesToHHMM(compareValue)}</Text>
            <Text style={{ fontSize: 18, marginLeft: 16, color: '#43a047', fontWeight: 'bold' }}>Today:</Text>
            <Text style={{ fontSize: 18, fontWeight: 'bold', marginLeft: 8 }}>{formatMinutesToHHMM(totalFocusMins)}</Text>
          </View>
        </View>
        {/* Weekly Focus Time Chart (full width) */}
        <View style={styles.sectionCardFull}>
          <Text style={styles.sectionTitle}>Weekly Focus Time</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 10 }}>
            <ChartKitBarChart
              data={{
                labels: ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'],
                datasets: [{ data: Array.from({length: 7}, (_, i) => {
                  const d = new Date();
                  d.setDate(d.getDate() - (6 - i));
                  const dStr = d.toISOString().slice(0, 10);
                  return tasks.filter(t => t.completed && isSameDay((t.completedDate || t.startTimeDate || dStr), dStr)).reduce((sum, t) => sum + (t.duration || 0), 0);
                }) }],
              }}
              width={Math.max(chartWidth, 420)}
              height={120}
              yAxisSuffix="m"
              chartConfig={{
                backgroundColor: '#fff',
                backgroundGradientFrom: '#fff',
                backgroundGradientTo: '#fff',
                decimalPlaces: 1,
                color: (opacity = 1) => `rgba(76, 71, 255, ${opacity})`,
                labelColor: (opacity = 1) => theme.colors.text,
                style: { borderRadius: 12 },
                propsForLabels: { fontSize: 12 },
              }}
              style={{ borderRadius: 12, paddingHorizontal: 8 }}
              fromZero
              showValuesOnTopOfBars={false}
            />
          </ScrollView>
        </View>
        {/* This Week Card (full width) */}
        <View style={styles.sectionCardFull}>
          <Text style={styles.sectionTitle}>This Week</Text>
          <View style={styles.sidebarRow}><Text style={styles.sidebarLabel}>Most Used Mode</Text><Text style={styles.sidebarValue}>{'None'}</Text></View>
          <View style={styles.sidebarRow}><Text style={styles.sidebarLabel}>Average Session</Text><Text style={styles.sidebarValue}>{avgTotal} min</Text></View>
          <View style={styles.sidebarRow}><Text style={styles.sidebarLabel}>Weekly Goal</Text><Text style={[styles.sidebarValue, { color: goalColor }]}>{goalPercent}%</Text></View>
          <Divider style={{ marginVertical: 8, backgroundColor: '#eee' }} />
          <View style={styles.sidebarRow}><Text style={styles.sidebarLabel}>Total Time</Text><Text style={styles.sidebarValue}>{formatMinutesToHHMM(goalPeriodTotal)}</Text></View>
          <View style={styles.sidebarRow}><Text style={styles.sidebarLabel}>Sessions</Text><Text style={styles.sidebarValue}>{tasks.filter(t => t.completed && isInWeek((t.completedDate || t.startTimeDate || todayStr), ...getWeekRange(todayStr))).length}</Text></View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    flexGrow: 1,
    backgroundColor: '#f8fafc',
  },
  topGridRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 0,
  },
  progressCardSmall: {
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 10,
    marginBottom: 10,
    width: '48%',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  progressValueSmall: {
    fontWeight: 'bold',
    fontSize: 26,
    marginBottom: 2,
  },
  progressLabelSmall: {
    color: '#888',
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  },
  compareCard: {
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 18,
    marginBottom: 18,
    marginTop: 0,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  toggleBtn: {
    borderRadius: 20,
    marginHorizontal: 2,
    borderWidth: 1,
    borderColor: '#a047ff',
    backgroundColor: '#fff',
    minWidth: 70,
    height: 38,
  },
  toggleBtnActive: {
    borderRadius: 20,
    marginHorizontal: 2,
    backgroundColor: '#a047ff',
    minWidth: 70,
    height: 38,
  },
  toggleLabel: {
    color: '#a047ff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  toggleLabelActive: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  toggleContent: {
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionCardFull: {
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 18,
    marginBottom: 14,
    width: '100%',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  sectionTitle: {
    fontWeight: 'bold',
    fontSize: 18,
    color: '#222',
    marginBottom: 8,
  },
  sidebarCard: {
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 18,
    marginBottom: 12,
    width: 160,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  sidebarRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  sidebarLabel: {
    color: '#888',
    fontSize: 14,
  },
  sidebarValue: {
    color: '#222',
    fontWeight: 'bold',
    fontSize: 15,
  },
}); 