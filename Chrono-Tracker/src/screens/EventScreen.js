import React, { useState, useEffect, useMemo } from 'react';
import { View, StyleSheet, ScrollView, FlatList, TouchableOpacity, Modal as RNModal, Pressable } from 'react-native';
import { Text, Card, Button, FAB, IconButton, useTheme } from 'react-native-paper';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MaterialIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';

const TAGS = [
  { label: 'Work', value: 'Work', color: '#FFE082' },
  { label: 'Study', value: 'Study', color: '#90CAF9' },
  { label: 'Personal', value: 'Personal', color: '#A5D6A7' },
  { label: 'Health', value: 'Health', color: '#FFAB91' },
];

const getTagColor = (tag) => TAGS.find(t => t.value === tag)?.color || '#E0E0E0';

function getMonthDays(year, month) {
  // Returns array of Date objects for all days in the month
  const days = [];
  const first = new Date(year, month, 1);
  const last = new Date(year, month + 1, 0);
  for (let d = 1; d <= last.getDate(); d++) {
    days.push(new Date(year, month, d));
  }
  return days;
}

function formatDate(date) {
  return date.getFullYear() + '-' + String(date.getMonth()+1).padStart(2, '0') + '-' + String(date.getDate()).padStart(2, '0');
}

function formatHour(h) {
  return h.toString().padStart(2, '0') + ':00';
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

// Define color palette for tags
const TAG_COLORS = {
  Work: { pastel: '#FFF3E0', solid: '#FFA726', accent: '#FFA726' }, // orange
  Study: { pastel: '#E3F2FD', solid: '#1976D2', accent: '#1976D2' }, // blue
  Reading: { pastel: '#E3F2FD', solid: '#1976D2', accent: '#1976D2' }, // blue (same as Study)
  Personal: { pastel: '#FFFDE7', solid: '#FFD600', accent: '#FFD600' }, // yellow
  Health: { pastel: '#FFEBEE', solid: '#E53935', accent: '#E53935' }, // red
  Other: { pastel: '#ECEFF1', solid: '#90A4AE', accent: '#90A4AE' }, // gray
};

export default function EventScreen({ navigation }) {
  const theme = useTheme();
  const [tasks, setTasks] = useState([]);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [month, setMonth] = useState(selectedDate.getMonth());
  const [year, setYear] = useState(selectedDate.getFullYear());
  const [showMonthPicker, setShowMonthPicker] = useState(false);

  // Load tasks from Planner (AsyncStorage) on mount and when screen is focused
  useFocusEffect(
    React.useCallback(() => {
      let isActive = true;
      (async () => {
        try {
          const saved = await AsyncStorage.getItem('plannerTasksV2');
          if (saved && isActive) setTasks(JSON.parse(saved));
        } catch {}
      })();
      return () => { isActive = false; };
    }, [])
  );

  // All days in the current month
  const monthDays = useMemo(() => getMonthDays(year, month), [year, month]);

  // Group tasks for the selected date by hour and completion
  const agenda = useMemo(() => {
    const dStr = formatDate(selectedDate);
    const scheduled = tasks.filter(t => t.time && t.dueDate === dStr && !t.completed);
    const completed = tasks.filter(t => t.time && t.dueDate === dStr && t.completed);
    const slots = Array.from({ length: 24 }, (_, h) => ({
      hour: h,
      scheduled: scheduled.filter(task => parseInt((task.time || '00:00').split(':')[0], 10) === h),
      completed: completed.filter(task => parseInt((task.time || '00:00').split(':')[0], 10) === h),
    }));
    return slots;
  }, [tasks, selectedDate]);

  // Month/year label
  const monthLabel = `${MONTHS[month]} ${year}`;
  const years = Array.from({ length: 10 }, (_, i) => year - 5 + i);

  // Scrollable month calendar
  const handleDayPress = (date) => {
    setSelectedDate(date);
    setMonth(date.getMonth());
    setYear(date.getFullYear());
  };

  const handlePrevMonth = () => {
    let newMonth = month - 1;
    let newYear = year;
    if (newMonth < 0) {
      newMonth = 11;
      newYear--;
    }
    setMonth(newMonth);
    setYear(newYear);
    setSelectedDate(new Date(newYear, newMonth, 1));
  };
  const handleNextMonth = () => {
    let newMonth = month + 1;
    let newYear = year;
    if (newMonth > 11) {
      newMonth = 0;
      newYear++;
    }
    setMonth(newMonth);
    setYear(newYear);
    setSelectedDate(new Date(newYear, newMonth, 1));
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}> 
      {/* Month/Year and month calendar navigation */}
      <View style={styles.monthRow}>
        <IconButton icon="chevron-left" size={22} onPress={handlePrevMonth} color={theme.colors.primary} style={{ margin: 0 }} />
        <Pressable onPress={() => setShowMonthPicker(true)} style={styles.monthLabelWrap}>
          <Text style={styles.monthLabel}>{monthLabel}</Text>
          <MaterialIcons name="arrow-drop-down" size={22} color={theme.colors.primary} />
        </Pressable>
        <IconButton icon="chevron-right" size={22} onPress={handleNextMonth} color={theme.colors.primary} style={{ margin: 0 }} />
      </View>
      {/* Month/Year Picker Modal */}
      <RNModal visible={showMonthPicker} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.monthPickerModal}>
            <Text style={{ fontWeight: 'bold', fontSize: 16, marginBottom: 8 }}>Select Month & Year</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
              <FlatList
                data={MONTHS}
                horizontal
                keyExtractor={item => item}
                renderItem={({ item, index }) => (
                  <Pressable onPress={() => setMonth(index)} style={[styles.monthPickerItem, month === index && { backgroundColor: theme.colors.primary }]}> 
                    <Text style={{ color: month === index ? '#fff' : theme.colors.text }}>{item}</Text>
                  </Pressable>
                )}
                showsHorizontalScrollIndicator={false}
              />
            </View>
            <FlatList
              data={years}
              horizontal
              keyExtractor={item => item.toString()}
              renderItem={({ item }) => (
                <Pressable onPress={() => setYear(item)} style={[styles.yearPickerItem, year === item && { backgroundColor: theme.colors.primary }]}> 
                  <Text style={{ color: year === item ? '#fff' : theme.colors.text }}>{item}</Text>
                </Pressable>
              )}
              showsHorizontalScrollIndicator={false}
            />
            <Button mode="contained" style={{ marginTop: 16 }} onPress={() => {
              setSelectedDate(new Date(year, month, 1));
              setShowMonthPicker(false);
            }}>Select</Button>
            <Button onPress={() => setShowMonthPicker(false)} style={{ marginTop: 4 }}>Cancel</Button>
          </View>
        </View>
      </RNModal>
      {/* Scrollable month calendar */}
      <View style={styles.weekRow}>
        <FlatList
          data={monthDays}
          horizontal
          showsHorizontalScrollIndicator={false}
          keyExtractor={item => formatDate(item)}
          renderItem={({ item }) => {
            const isToday = formatDate(item) === formatDate(new Date());
            const isSelected = formatDate(item) === formatDate(selectedDate);
            return (
              <TouchableOpacity onPress={() => handleDayPress(item)} style={styles.weekDayWrap}>
                <Text style={styles.weekDayLabel}>{item.toLocaleString('default', { weekday: 'short' })}</Text>
                <View style={[styles.weekDayCircle, isSelected && { backgroundColor: theme.colors.primary }, isToday && !isSelected && { borderColor: theme.colors.primary, borderWidth: 2 }]}> 
                  <Text style={{ color: isSelected ? '#fff' : theme.colors.text, fontWeight: 'bold', fontSize: 16 }}>{item.getDate()}</Text>
                </View>
              </TouchableOpacity>
            );
          }}
        />
      </View>
      {/* Agenda: vertical time slots, two columns with divider */}
      <View style={styles.agendaHeaderRow}>
        <Text style={styles.agendaHeaderColScheduled}>Scheduled</Text>
        <View style={styles.agendaHeaderDivider} />
        <Text style={styles.agendaHeaderColCompleted}>Completed</Text>
      </View>
      <ScrollView style={styles.agendaScroll} contentContainerStyle={{ paddingBottom: 80 }}>
        {agenda.map(slot => (
          <View key={slot.hour} style={styles.timeRow}>
            <Text style={styles.timeLabel}>{formatHour(slot.hour)}</Text>
            <View style={styles.eventCols}>
              {/* Scheduled column */}
              <View style={styles.eventCol}>
                {slot.scheduled.map((task, idx) => {
                  const tagColor = TAG_COLORS[task.tag] || TAG_COLORS.Other;
                  return (
                    <Card key={idx} style={[styles.eventCard, { backgroundColor: tagColor.pastel, borderColor: tagColor.accent, borderWidth: 0.5 }]}> 
                      <Card.Content style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 4 }}>
                        <View style={{ flex: 1 }}>
                          <Text style={{ color: tagColor.accent, fontWeight: 'bold', fontSize: 13 }}>{task.name}</Text>
                        </View>
                        <IconButton icon="play-circle-outline" size={18} onPress={() => navigation.navigate('Timer', { taskName: task.name })} color={tagColor.accent} />
                      </Card.Content>
                    </Card>
                  );
                })}
              </View>
              <View style={styles.agendaColDivider} />
              {/* Completed column */}
              <View style={styles.eventCol}>
                {slot.completed.map((task, idx) => {
                  const tagColor = TAG_COLORS[task.tag] || TAG_COLORS.Other;
                  return (
                    <Card key={idx} style={[styles.eventCard, { backgroundColor: tagColor.solid, borderColor: tagColor.solid, borderWidth: 0.5 }]}> 
                      <Card.Content style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 4 }}>
                        <View style={{ flex: 1 }}>
                          <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 13 }}>{task.name}</Text>
                        </View>
                      </Card.Content>
                    </Card>
                  );
                })}
              </View>
            </View>
          </View>
        ))}
      </ScrollView>
      {/* FAB to add event */}
      <FAB
        icon="plus"
        style={styles.fab}
        onPress={() => navigation.navigate('Planner', { prefillDate: formatDate(selectedDate) })}
        color={theme.colors.background}
        accessibilityLabel="Add Event"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 0, backgroundColor: '#fff' },
  monthRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 0, backgroundColor: '#fff', marginBottom: 0 },
  monthLabelWrap: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  monthLabel: { fontWeight: 'bold', fontSize: 16, color: '#222', marginRight: 2 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.2)', justifyContent: 'center', alignItems: 'center' },
  monthPickerModal: { backgroundColor: '#fff', borderRadius: 12, padding: 20, minWidth: 320, alignItems: 'center' },
  monthPickerItem: { padding: 8, marginHorizontal: 2, borderRadius: 8 },
  yearPickerItem: { padding: 8, marginHorizontal: 2, borderRadius: 8 },
  weekRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', marginBottom: 0, paddingHorizontal: 0, borderBottomWidth: 0.5, borderColor: '#eee', height: 60 },
  weekDayWrap: { alignItems: 'center', width: 44, paddingVertical: 2 },
  weekDayLabel: { color: '#888', fontSize: 12, marginBottom: 2 },
  weekDayCircle: { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginBottom: 2 },
  agendaHeaderRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fafafa', borderBottomWidth: 1, borderColor: '#eee', height: 32 },
  agendaHeaderColScheduled: { flex: 1, textAlign: 'center', color: '#888', fontWeight: 'bold', fontSize: 15 },
  agendaHeaderColCompleted: { flex: 1, textAlign: 'center', color: '#888', fontWeight: 'bold', fontSize: 15 },
  agendaHeaderDivider: { width: 1, height: 20, backgroundColor: '#eee' },
  agendaScroll: { flex: 1, backgroundColor: '#fff' },
  timeRow: { flexDirection: 'row', alignItems: 'flex-start', minHeight: 48, borderBottomWidth: 0.5, borderColor: '#eee', paddingHorizontal: 0 },
  timeLabel: { width: 48, color: '#bbb', fontSize: 13, textAlign: 'right', paddingTop: 12, paddingRight: 8 },
  eventCols: { flex: 1, flexDirection: 'row', alignItems: 'flex-start' },
  eventCol: { flex: 1, minHeight: 36 },
  agendaColDivider: { width: 1, backgroundColor: '#eee', marginVertical: 4 },
  eventCard: { marginHorizontal: 4, marginVertical: 2, borderRadius: 8, elevation: 0, minHeight: 36, justifyContent: 'center', backgroundColor: '#fff' },
  fab: { position: 'absolute', alignSelf: 'center', bottom: 24, backgroundColor: '#FF5252', zIndex: 10 },
}); 