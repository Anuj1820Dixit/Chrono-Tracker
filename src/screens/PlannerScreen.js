import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Alert,
  Platform,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import {
  Text,
  TextInput,
  Button,
  Card,
  Menu,
  IconButton,
  Chip,
  Divider,
  Snackbar,
  Checkbox,
  HelperText,
  Searchbar,
  SegmentedButtons,
  Modal,
  Portal,
  useTheme,
  FAB,
} from 'react-native-paper';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DatePickerModal, TimePickerModal } from 'react-native-paper-dates';
import * as Notifications from 'expo-notifications';
import { MaterialCommunityIcons } from '@expo/vector-icons';

const TAGS = [
  { label: 'Work', value: 'Work', color: '#5C6BC0' },
  { label: 'Study', value: 'Study', color: '#43A047' },
  { label: 'Personal', value: 'Personal', color: '#FBC02D' },
  { label: 'Health', value: 'Health', color: '#E57373' },
];
const PRIORITIES = [
  { label: 'Low', value: 'Low', color: '#B0BEC5' },
  { label: 'Medium', value: 'Medium', color: '#FFD600' },
  { label: 'High', value: 'High', color: '#E53935' },
];
const RECURRENCE = [
  { label: 'None', value: 'none' },
  { label: 'Daily', value: 'daily' },
  { label: 'Weekly', value: 'weekly' },
];

const chipStyle = (bg, border, textColor) => ({
  backgroundColor: bg,
  borderColor: border,
  borderWidth: 1,
  borderRadius: 8,
  minWidth: 70,
  paddingHorizontal: 12,
  paddingVertical: 6,
  marginRight: 8,
  marginBottom: 4,
});

function groupTasksByTag(tasks) {
  const groups = {};
  tasks.forEach((task) => {
    const tag = task.tag || 'Other';
    if (!groups[tag]) groups[tag] = [];
    groups[tag].push(task);
  });
  return groups;
}

// Helper to get next notification Date object from dueDate and time string
function getTaskNotificationDate(dueDate, time) {
  let date = new Date(dueDate);
  if (time) {
    const [h, m] = time.split(':');
    date.setHours(Number(h), Number(m), 0, 0);
  } else {
    date.setHours(9, 0, 0, 0); // Default to 9:00 AM
  }
  // If the time is in the past, don't schedule
  if (date < new Date()) return null;
  return date;
}

// Custom CircularCheckbox component
function CircularCheckbox({ checked, onPress, color, style }) {
  return (
    <TouchableOpacity onPress={onPress} style={[{
      width: 24,
      height: 24,
      borderRadius: 12,
      borderWidth: 2,
      borderColor: color,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: checked ? color + '22' : '#fff',
    }, style]}
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
    >
      {checked && (
        <MaterialCommunityIcons name="check" size={18} color={color} />
      )}
    </TouchableOpacity>
  );
}

export default function PlannerScreen({ navigation }) {
  // --- State ---
  const [name, setName] = useState('');
  const [tag, setTag] = useState('Work');
  const [priority, setPriority] = useState('Medium');
  const [time, setTime] = useState('');
  const [notes, setNotes] = useState('');
  const [recurrence, setRecurrence] = useState('none');
  const [subtasks, setSubtasks] = useState([]);
  const [subtaskInput, setSubtaskInput] = useState('');
  const [tasks, setTasks] = useState([]);
  const [showTagMenu, setShowTagMenu] = useState(false);
  const [showPriorityMenu, setShowPriorityMenu] = useState(false);
  const [showRecurrenceMenu, setShowRecurrenceMenu] = useState(false);
  const [snackbar, setSnackbar] = useState({ visible: false, msg: '' });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterTag, setFilterTag] = useState('All');
  const [groupBy, setGroupBy] = useState('tag');
  const [viewMode, setViewMode] = useState('list');
  const theme = useTheme();
  const [showAddModal, setShowAddModal] = useState(false);
  const [dueDate, setDueDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const saveTimeout = useRef();
  // Add state for expanded tasks
  const [expandedTasks, setExpandedTasks] = useState([]);
  // --- Edit Task ---
  const [editTask, setEditTask] = useState(null);

  const toggleExpand = (taskId) => {
    setExpandedTasks((prev) =>
      prev.includes(taskId) ? prev.filter((id) => id !== taskId) : [...prev, taskId]
    );
  };

  const PRIORITY_COLORS = {
    High: '#E53935',
    Medium: '#FFD600',
    Low: '#43A047',
  };

  // --- Load tasks ---
  useEffect(() => {
    (async () => {
      try {
        const saved = await AsyncStorage.getItem('plannerTasksV2');
        if (saved) setTasks(JSON.parse(saved));
      } catch {}
      setLoading(false);
    })();
  }, []);
  useEffect(() => {
    if (!loading) {
      if (saveTimeout.current) clearTimeout(saveTimeout.current);
      saveTimeout.current = setTimeout(() => {
        AsyncStorage.setItem('plannerTasksV2', JSON.stringify(tasks));
      }, 500);
    }
    return () => {
      if (saveTimeout.current) clearTimeout(saveTimeout.current);
    };
  }, [tasks, loading]);

  // --- Add Task ---
  const handleAddTask = () => {
    if (!name.trim()) {
      setSnackbar({ visible: true, msg: 'Task name required.' });
      return;
    }
    const localDueDate = dueDate.getFullYear() + '-' + String(dueDate.getMonth()+1).padStart(2, '0') + '-' + String(dueDate.getDate()).padStart(2, '0');
    const newTask = {
      id: Date.now() + Math.random(),
      name: name.trim(),
      tag,
      priority,
      time,
      dueDate: localDueDate,
      notes,
      recurrence,
      subtasks: subtasks.map((t) => ({ ...t })),
      completed: false,
      created: new Date().toISOString(),
    };
    setTasks((prev) => [newTask, ...prev]);
    setName('');
    setTag('Work');
    setPriority('Medium');
    setTime('');
    setDueDate(new Date());
    setNotes('');
    setRecurrence('none');
    setSubtasks([]);
    setSnackbar({ visible: true, msg: 'Task added!' });
  };

  // --- Add Subtask ---
  const handleAddSubtask = () => {
    if (!subtaskInput.trim()) return;
    setSubtasks((prev) => [...prev, { id: Date.now() + Math.random(), name: subtaskInput.trim(), completed: false }]);
    setSubtaskInput('');
  };

  // --- Complete Task/Subtask ---
  const handleComplete = (id) => {
    setTasks((prev) => prev.map((t) => t.id === id ? { ...t, completed: !t.completed } : t));
  };
  const handleCompleteSubtask = (taskId, subId) => {
    setTasks((prev) => prev.map((t) => t.id === taskId ? {
      ...t,
      subtasks: t.subtasks.map((s) => s.id === subId ? { ...s, completed: !s.completed } : s),
    } : t));
  };

  // --- Start Focus (Timer) ---
  const handleStartFocus = (task) => {
    navigation.navigate('Timer', { taskName: task.name });
  };

  // --- Filter/Search/Group ---
  const filteredTasks = tasks.filter((t) =>
    (filterTag === 'All' || t.tag === filterTag) &&
    (search.trim() === '' || t.name.toLowerCase().includes(search.trim().toLowerCase()))
  );
  const grouped = groupBy === 'tag' ? groupTasksByTag(filteredTasks) : { All: filteredTasks };

  // --- Edit Task ---
  const openEditModal = (task) => {
    setEditTask(task);
    setShowAddModal(true);
    setName(task.name);
    setTag(task.tag);
    setPriority(task.priority);
    setTime(task.time);
    setDueDate(new Date(task.dueDate));
    setNotes(task.notes);
    setRecurrence(task.recurrence);
    setSubtasks(task.subtasks || []);
  };
  const handleSaveTask = () => {
    if (editTask) {
      setTasks((prev) => prev.map((t) => t.id === editTask.id ? {
        ...t,
        name,
        tag,
        priority,
        time,
        dueDate: dueDate.toISOString().split('T')[0],
        notes,
        recurrence,
        subtasks,
      } : t));
      setEditTask(null);
    } else {
      handleAddTask();
    }
    setShowAddModal(false);
  };
  const handleCancelEdit = () => {
    setEditTask(null);
    setShowAddModal(false);
  };

  // --- Delete Task with Confirmation ---
  const handleDeleteTask = (id) => {
    Alert.alert('Delete Task', 'Are you sure you want to delete this task?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => {
        setTasks((prev) => prev.filter((t) => t.id !== id));
        setSnackbar({ visible: true, msg: 'Task deleted.' });
      } },
    ]);
  };

  // --- Schedule/Cancel Notification Robustly ---
  const handleToggleReminder = async (id, isSubtask, parentId, taskName, dueDate, time) => {
    // Request permission if needed
    const { status } = await Notifications.getPermissionsAsync();
    if (status !== 'granted') {
      const ask = await Notifications.requestPermissionsAsync();
      if (ask.status !== 'granted') {
        setSnackbar({ visible: true, msg: 'Notification permission denied.' });
        return;
      }
    }
    setTasks((prev) =>
      prev.map((t) => {
        if (isSubtask && t.id === parentId) {
          return {
            ...t,
            subtasks: t.subtasks.map((s) => {
              if (s.id === id) {
                if (!s.reminder) {
                  const notifDate = getTaskNotificationDate(dueDate, time);
                  if (!notifDate) {
                    setSnackbar({ visible: true, msg: 'Cannot set reminder for past time.' });
                    return { ...s, reminder: false };
                  }
                  Notifications.scheduleNotificationAsync({
                    content: {
                      title: 'Task Reminder',
                      body: `It's time for: ${s.name}`,
                      sound: true,
                    },
                    trigger: notifDate,
                  }).then(notificationId => {
                    s.notificationId = notificationId;
                  });
                  return { ...s, reminder: true, notificationId: s.notificationId };
                } else if (s.notificationId) {
                  Notifications.cancelScheduledNotificationAsync(s.notificationId);
                  return { ...s, reminder: false, notificationId: undefined };
                }
              }
              return s;
            }),
          };
        } else if (!isSubtask && t.id === id) {
          if (!t.reminder) {
            const notifDate = getTaskNotificationDate(dueDate, time);
            if (!notifDate) {
              setSnackbar({ visible: true, msg: 'Cannot set reminder for past time.' });
              return { ...t, reminder: false };
            }
            Notifications.scheduleNotificationAsync({
              content: {
                title: 'Task Reminder',
                body: `It's time for: ${taskName}`,
                sound: true,
              },
              trigger: notifDate,
            }).then(notificationId => {
              t.notificationId = notificationId;
            });
            return { ...t, reminder: true, notificationId: t.notificationId };
          } else if (t.notificationId) {
            Notifications.cancelScheduledNotificationAsync(t.notificationId);
            return { ...t, reminder: false, notificationId: undefined };
          }
        }
        return t;
      })
    );
  };

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center', backgroundColor: theme.colors.background }]}> 
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  const TaskCard = React.memo(({ task, handleComplete, handleCompleteSubtask, handleStartFocus, handleDeleteTask, isSubtask }) => {
    const isExpanded = expandedTasks.includes(task.id);
    const priorityColor = PRIORITY_COLORS[task.priority] || '#5C6BC0';
    return (
      <Card style={[styles.taskCard, isSubtask && styles.subtaskCard]}> 
        <View style={styles.taskRow}>
          <CircularCheckbox
            checked={task.completed}
            onPress={() => isSubtask ? handleCompleteSubtask(task.parentId, task.id) : handleComplete(task.id)}
            color={priorityColor}
            style={styles.roundCheckbox}
          />
          <View style={styles.taskContent}>
            <View style={styles.titleRow}>
              <Text style={styles.taskTitle}>{task.name}</Text>
              <View style={[styles.priorityBadge, { backgroundColor: priorityColor }]} />
              {task.recurrence !== 'none' && (
                <IconButton icon="repeat" size={16} style={styles.metaIcon} />
              )}
              <IconButton
                icon={task.reminder ? 'bell' : 'bell-outline'}
                size={18}
                style={styles.metaIcon}
                onPress={() => handleToggleReminder(task.id, isSubtask, task.parentId, task.name, task.dueDate, task.time)}
              />
              <IconButton
                icon="pencil"
                size={18}
                style={styles.metaIcon}
                onPress={() => openEditModal(task)}
              />
              <IconButton
                icon="delete"
                size={18}
                style={styles.metaIcon}
                onPress={() => handleDeleteTask(task.id)}
              />
              {task.subtasks && task.subtasks.length > 0 && (
                <IconButton
                  icon={isExpanded ? 'chevron-up' : 'chevron-down'}
                  size={20}
                  style={styles.metaIcon}
                  onPress={() => toggleExpand(task.id)}
                />
              )}
            </View>
            {/* Optional: Progress/Pomodoro icons here */}
          </View>
          <IconButton icon="play-circle" size={28} onPress={() => handleStartFocus(task)} style={styles.playButton} />
        </View>
        {/* Subtasks */}
        {isExpanded && task.subtasks && task.subtasks.length > 0 && (
          <View style={styles.subtaskList}>
            {task.subtasks.map((s) => (
              <TaskCard
                key={s.id}
                task={{ ...s, parentId: task.id }}
                handleComplete={handleComplete}
                handleCompleteSubtask={handleCompleteSubtask}
                handleStartFocus={handleStartFocus}
                handleDeleteTask={handleDeleteTask}
                isSubtask
              />
            ))}
          </View>
        )}
      </Card>
    );
  });

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="always">
        {/* Filters/Search/GroupBy */}
        <View style={styles.filterRow}>
          <Searchbar
            placeholder="Search tasks..."
            value={search}
            onChangeText={setSearch}
            style={{ backgroundColor: theme.colors.surface, color: theme.colors.text }}
            inputStyle={{ color: theme.colors.text }}
            placeholderTextColor={theme.colors.muted}
          />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 10 }}>
            <View style={{ flexDirection: 'row' }}>
              {['All', ...TAGS.map(t => t.value)].map((tagValue) => {
                const selected = filterTag === tagValue;
                return (
                  <Button
                    key={tagValue}
                    mode={selected ? 'contained' : 'outlined'}
                    onPress={() => setFilterTag(tagValue)}
                    style={{
                      backgroundColor: selected ? theme.colors.primary : theme.colors.surface,
                      borderColor: selected ? theme.colors.primary : theme.colors.border,
                      borderWidth: 1,
                      borderRadius: 20,
                      marginRight: 8,
                      minWidth: 60,
                    }}
                    labelStyle={{
                      color: selected ? '#fff' : theme.colors.text,
                      fontWeight: selected ? 'bold' : 'normal',
                    }}
                  >
                    {tagValue}
                  </Button>
                );
              })}
            </View>
          </ScrollView>
        </View>
        {/* Task List */}
        {Object.keys(grouped).map((group) => (
          <View key={group} style={styles.groupSection}>
            <Text style={styles.groupHeader}>{group}</Text>
            {grouped[group].map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                handleComplete={handleComplete}
                handleCompleteSubtask={handleCompleteSubtask}
                handleStartFocus={handleStartFocus}
                handleDeleteTask={handleDeleteTask}
              />
            ))}
          </View>
        ))}
      </ScrollView>
      {/* Add Task Modal */}
      <Portal>
        <Modal visible={showAddModal} onDismiss={() => setShowAddModal(false)} contentContainerStyle={{ backgroundColor: theme.colors.surface, borderRadius: 16, padding: 18, minWidth: 320 }}>
          <Text style={{ fontWeight: 'bold', fontSize: 20, marginBottom: 10, color: theme.colors.text }}>Add Task</Text>
          <TextInput
            label="Task Name"
            value={name}
            onChangeText={setName}
            style={{ backgroundColor: theme.colors.surface, color: theme.colors.text, marginBottom: 10 }}
            mode="outlined"
            returnKeyType="done"
            placeholderTextColor={theme.colors.muted}
          />
          <View style={{ flexDirection: 'row', marginBottom: 10 }}>
            <Menu
              visible={showTagMenu}
              onDismiss={() => setShowTagMenu(false)}
              anchor={
                <Button
                  mode="contained"
                  onPress={() => setShowTagMenu(true)}
                  style={chipStyle(theme.colors.accent, theme.colors.border, theme.colors.text)}
                  labelStyle={{ color: theme.colors.text, fontWeight: 'bold', fontSize: 13 }}
                >{tag}</Button>
              }
            >
              {TAGS.map((t) => (
                <Menu.Item key={t.value} onPress={() => { setTag(t.value); setShowTagMenu(false); }} title={t.label} />
              ))}
            </Menu>
            <Menu
              visible={showPriorityMenu}
              onDismiss={() => setShowPriorityMenu(false)}
              anchor={
                <Button
                  mode="contained"
                  onPress={() => setShowPriorityMenu(true)}
                  style={chipStyle('#ffe066', theme.colors.border, theme.colors.text)}
                  labelStyle={{ color: theme.colors.text, fontWeight: 'bold', fontSize: 13 }}
                >{priority}</Button>
              }
            >
              {PRIORITIES.map((p) => (
                <Menu.Item key={p.value} onPress={() => { setPriority(p.value); setShowPriorityMenu(false); }} title={p.label} />
              ))}
            </Menu>
          </View>
          <View style={{ flexDirection: 'row', marginBottom: 10 }}>
            <Button icon="calendar" mode="outlined" style={{ flex: 1, marginRight: 6 }} onPress={() => setShowDatePicker(true)}>{dueDate ? dueDate.toLocaleDateString() : 'Pick Date'}</Button>
            <Button icon="clock" mode="outlined" style={{ flex: 1, marginLeft: 6 }} onPress={() => setShowTimePicker(true)}>{time || 'Pick Time'}</Button>
            <Menu
              visible={showRecurrenceMenu}
              onDismiss={() => setShowRecurrenceMenu(false)}
              anchor={
                <Button mode="outlined" style={{ marginLeft: 6 }} onPress={() => setShowRecurrenceMenu(true)}>{RECURRENCE.find(r => r.value === recurrence)?.label || 'None'}</Button>
              }
            >
              {RECURRENCE.map((r) => (
                <Menu.Item key={r.value} onPress={() => { setRecurrence(r.value); setShowRecurrenceMenu(false); }} title={r.label} />
              ))}
            </Menu>
          </View>
          <DatePickerModal
            visible={showDatePicker}
            onDismiss={() => setShowDatePicker(false)}
            date={dueDate}
            onConfirm={({ date }) => {
              setDueDate(date);
              setShowDatePicker(false);
            }}
            mode="single"
            saveLabel="Pick"
            label="Pick date"
            animationType="slide"
          />
          <TimePickerModal
            visible={showTimePicker}
            onDismiss={() => setShowTimePicker(false)}
            onConfirm={({ hours, minutes }) => {
              setTime(`${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`);
              setShowTimePicker(false);
            }}
            hours={time ? parseInt(time.split(':')[0], 10) : 12}
            minutes={time ? parseInt(time.split(':')[1], 10) : 0}
            label="Pick time"
            animationType="slide"
          />
          <TextInput
            label="Notes"
            value={notes}
            onChangeText={setNotes}
            style={{ backgroundColor: theme.colors.surface, color: theme.colors.text, marginBottom: 10 }}
            mode="outlined"
            multiline
            numberOfLines={2}
            returnKeyType="done"
            placeholderTextColor={theme.colors.muted}
          />
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
            <TextInput
              label="Add subtask"
              value={subtaskInput}
              onChangeText={setSubtaskInput}
              style={{ backgroundColor: theme.colors.surface, color: theme.colors.text, flex: 1, marginRight: 8 }}
              mode="outlined"
              returnKeyType="done"
              onSubmitEditing={handleAddSubtask}
              placeholderTextColor={theme.colors.muted}
            />
            <Button mode="contained" onPress={handleAddSubtask} style={{ minWidth: 60, alignSelf: 'stretch' }}>Add</Button>
          </View>
          <Button mode="contained" onPress={handleSaveTask} style={{ marginTop: 10 }}>
            {editTask ? 'Save Changes' : 'Add Task'}
          </Button>
          {editTask && (
            <Button
              onPress={handleCancelEdit}
              style={{ marginTop: 6 }}
            >
              Cancel
            </Button>
          )}
        </Modal>
      </Portal>
      {/* Floating Action Button */}
      <FAB
        icon="plus"
        style={styles.fab}
        onPress={() => setShowAddModal(true)}
        color={theme.dark ? '#fff' : '#000'}
        accessibilityLabel="Add Task"
      />
      <Snackbar
        visible={snackbar.visible}
        onDismiss={() => setSnackbar({ ...snackbar, visible: false })}
        duration={2000}
      >
        {snackbar.msg}
      </Snackbar>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 16,
  },
  scrollContent: {
    paddingBottom: 32,
  },
  modalContainer: {
    margin: 24,
    borderRadius: 18,
    padding: 0,
    justifyContent: 'center',
  },
  fab: {
    position: 'absolute',
    right: 24,
    bottom: 32,
    backgroundColor: '#7C4DFF',
    zIndex: 10,
  },
  card: {
    marginBottom: 16,
    borderRadius: 16,
    elevation: 2,
  },
  input: {
    marginBottom: 8,
    backgroundColor: '#23232a',
    color: '#fff',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  menuBtn: {
    borderRadius: 8,
    marginRight: 8,
  },
  addBtn: {
    marginTop: 8,
    borderRadius: 8,
    backgroundColor: '#5C6BC0',
  },
  addSubBtn: {
    marginLeft: 8,
    borderRadius: 8,
    backgroundColor: '#64B5F6',
  },
  subtaskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  subtaskList: {
    marginLeft: 24,
    marginBottom: 8,
  },
  subtaskItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  filterRow: {
    marginBottom: 8,
  },
  searchBar: {
    marginBottom: 8,
    borderRadius: 8,
    backgroundColor: '#292933',
  },
  filterChips: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  chip: {
    marginRight: 8,
    borderRadius: 16,
    backgroundColor: '#f5f5fa',
    minWidth: 64,
    paddingHorizontal: 14,
    maxWidth: '60%',
    flexShrink: 1,
    flexWrap: 'wrap',
  },
  segmented: {
    marginBottom: 8,
    alignSelf: 'center',
  },
  groupSection: {
    marginBottom: 18,
  },
  groupHeader: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#aaa',
    marginTop: 18,
    marginBottom: 6,
    marginLeft: 8,
    letterSpacing: 0.5,
    fontFamily: 'Roboto', // or 'Inter' if loaded
  },
  taskCard: {
    borderRadius: 16,
    backgroundColor: '#fff',
    marginVertical: 6,
    elevation: 2,
    shadowColor: '#a259ff22',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    borderWidth: 1,
    borderColor: '#f0f0f5',
    paddingVertical: 2,
    paddingHorizontal: 4,
  },
  subtaskCard: {
    marginLeft: 32,
    backgroundColor: '#f8f8fc',
  },
  taskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 2,
  },
  taskContent: {
    flex: 1,
    flexDirection: 'column',
    justifyContent: 'center',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  taskTitle: {
    fontWeight: 'bold',
    fontSize: 16,
    color: '#22223b',
    fontFamily: 'Roboto', // or 'Inter'
    flexShrink: 1,
  },
  priorityBadge: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginLeft: 8,
    marginRight: 2,
  },
  metaIcon: {
    marginLeft: 2,
    marginRight: 2,
    marginTop: 0,
    marginBottom: 0,
  },
  playButton: {
    marginLeft: 4,
  },
  subtaskList: {
    marginTop: 2,
    marginLeft: 8,
  },
  roundCheckbox: {
    borderRadius: 12,
    overflow: 'hidden',
  },
}); 