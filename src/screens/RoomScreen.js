import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, FlatList, TextInput, Button } from 'react-native';
import { supabase } from '../lib/supabase';

// NOTE: This is a collaborative timer. All users in this room see the same timer. When anyone starts, pauses, or resets, it syncs for everyone in real time.

export default function RoomScreen({ route }) {
  const { roomId, roomCode } = route.params;
  const [notes, setNotes] = useState([]);
  const [input, setInput] = useState('');

  // Timer state
  const [timerState, setTimerState] = useState({ status: 'stopped', duration: 1500, started_at: null });
  const [displayTime, setDisplayTime] = useState(1500); // seconds
  const intervalRef = useRef(null);

  // Fetch initial timer state
  useEffect(() => {
    const fetchTimer = async () => {
      const { data, error } = await supabase
        .from('rooms')
        .select('timer_state')
        .eq('id', roomId)
        .single();
      if (data && data.timer_state) {
        setTimerState(data.timer_state);
        setDisplayTime(data.timer_state.duration);
      }
    };
    fetchTimer();
  }, [roomId]);

  // Subscribe to timer_state changes
  useEffect(() => {
    const channel = supabase
      .channel('room-timer-' + roomId)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'rooms',
          filter: `id=eq.${roomId}`,
        },
        (payload) => {
          if (payload.new && payload.new.timer_state) {
            setTimerState(payload.new.timer_state);
            setDisplayTime(payload.new.timer_state.duration);
          }
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [roomId]);

  // Timer countdown logic
  useEffect(() => {
    if (timerState.status === 'running') {
      if (intervalRef.current) clearInterval(intervalRef.current);
      intervalRef.current = setInterval(() => {
        setDisplayTime((prev) => {
          if (prev > 0) return prev - 1;
          else {
            clearInterval(intervalRef.current);
            return 0;
          }
        });
      }, 1000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [timerState.status]);

  // When displayTime hits 0, pause timer
  useEffect(() => {
    if (displayTime === 0 && timerState.status === 'running') {
      handlePause();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [displayTime]);

  // Timer controls
  const handleStart = async () => {
    const newState = { ...timerState, status: 'running', duration: displayTime };
    setTimerState(newState);
    await supabase.from('rooms').update({ timer_state: newState }).eq('id', roomId);
  };
  const handlePause = async () => {
    const newState = { ...timerState, status: 'paused', duration: displayTime };
    setTimerState(newState);
    await supabase.from('rooms').update({ timer_state: newState }).eq('id', roomId);
  };
  const handleReset = async () => {
    const newState = { status: 'stopped', duration: 1500, started_at: null };
    setTimerState(newState);
    setDisplayTime(1500);
    await supabase.from('rooms').update({ timer_state: newState }).eq('id', roomId);
  };

  // Notes/messages (local only)
  const handleSend = () => {
    if (input.trim()) {
      setNotes([...notes, { id: Date.now().toString(), text: input }]);
      setInput('');
    }
  };

  // Format seconds as mm:ss
  const formatTime = (secs) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Room Code: <Text style={styles.code}>{roomCode}</Text></Text>
      <Text style={styles.subheader}>Share notes/messages and study together with a shared timer!</Text>
      <View style={styles.timerBox}>
        <Text style={styles.timer}>{formatTime(displayTime)}</Text>
        <View style={styles.timerControls}>
          <Button title="Start" onPress={handleStart} disabled={timerState.status === 'running' || displayTime === 0} />
          <Button title="Pause" onPress={handlePause} disabled={timerState.status !== 'running'} />
          <Button title="Reset" onPress={handleReset} />
        </View>
        <Text style={styles.timerStatus}>Status: {timerState.status}</Text>
      </View>
      <FlatList
        data={notes}
        keyExtractor={item => item.id}
        renderItem={({ item }) => <Text style={styles.note}>{item.text}</Text>}
        style={styles.list}
      />
      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          value={input}
          onChangeText={setInput}
          placeholder="Type a note or message..."
        />
        <Button title="Send" onPress={handleSend} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, backgroundColor: '#fff' },
  header: { fontSize: 20, fontWeight: 'bold', marginBottom: 8 },
  code: { fontFamily: 'monospace', fontSize: 20 },
  subheader: { fontSize: 14, color: '#666', marginBottom: 16 },
  timerBox: { alignItems: 'center', marginBottom: 24 },
  timer: { fontSize: 48, fontWeight: 'bold', marginBottom: 8 },
  timerControls: { flexDirection: 'row', gap: 8, marginBottom: 4 },
  timerStatus: { fontSize: 14, color: '#888' },
  list: { flex: 1, marginBottom: 12 },
  note: { padding: 8, backgroundColor: '#f3f6fa', borderRadius: 8, marginBottom: 6 },
  inputRow: { flexDirection: 'row', alignItems: 'center' },
  input: { flex: 1, borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 8, marginRight: 8 },
}); 