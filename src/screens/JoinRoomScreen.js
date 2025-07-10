import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Button, TextInput, ActivityIndicator, Snackbar } from 'react-native-paper';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthProvider';

export default function JoinRoomScreen() {
  const { user } = useAuth();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [snackbar, setSnackbar] = useState('');
  const [joined, setJoined] = useState(false);

  const handleJoinRoom = async () => {
    setLoading(true);
    setError('');
    setJoined(false);
    try {
      // Find room by code
      const { data: room, error: roomError } = await supabase
        .from('rooms')
        .select('id')
        .eq('code', code.trim().toUpperCase())
        .single();
      if (roomError || !room) throw new Error('Room not found');
      // Check if already a member
      const { data: member } = await supabase
        .from('room_members')
        .select('id')
        .eq('room_id', room.id)
        .eq('user_id', user.id)
        .maybeSingle();
      if (!member) {
        // Add as member
        const { error: joinError } = await supabase
          .from('room_members')
          .insert([{ room_id: room.id, user_id: user.id }]);
        if (joinError) throw joinError;
      }
      setJoined(true);
      setSnackbar('Joined room!');
    } catch (e) {
      setError(e.message || 'Failed to join room');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Join Study Room</Text>
      <TextInput
        label="Room Code"
        value={code}
        onChangeText={setCode}
        autoCapitalize="characters"
        style={{ marginBottom: 16, width: 200 }}
        maxLength={6}
      />
      <Button mode="contained" onPress={handleJoinRoom} loading={loading} disabled={loading || !code.trim()}>
        Join Room
      </Button>
      {loading && <ActivityIndicator style={{ marginTop: 24 }} />}
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {joined && <Text style={styles.success}>Successfully joined the room!</Text>}
      <Snackbar visible={!!snackbar} onDismiss={() => setSnackbar('')} duration={2000}>{snackbar}</Snackbar>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 24 },
  error: { color: 'red', marginTop: 16 },
  success: { color: 'green', marginTop: 16, fontWeight: 'bold' },
}); 