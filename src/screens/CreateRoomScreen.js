import React, { useState, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Button, ActivityIndicator, Snackbar } from 'react-native-paper';
import * as Clipboard from 'expo-clipboard';
import { supabase } from '../lib/supabase';
import { useNavigation } from '@react-navigation/native';

function generateRoomCode(length = 6) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < length; i++) code += chars.charAt(Math.floor(Math.random() * chars.length));
  return code;
}

export default function CreateRoomScreen() {
  const [roomCode, setRoomCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [snackbar, setSnackbar] = useState('');
  const [userId, setUserId] = useState(null);
  const navigation = useNavigation();

  useEffect(() => {
    const getUser = async () => {
      const { data, error } = await supabase.auth.getSession();
      if (error || !data.session) {
        setError('Failed to fetch session.');
        return;
      }
      const uid = data.session.user.id;
      setUserId(uid);
    };

    getUser();
  }, []);

  const handleCreateRoom = async () => {
    setLoading(true);
    setError('');
    setRoomCode('');
    setSnackbar('');

    if (!userId) {
      setError('User not authenticated');
      setLoading(false);
      return;
    }

    try {
      const code = generateRoomCode();

      // Call the create_new_room RPC function
      const { data, error } = await supabase
        .rpc('create_new_room', {
          room_code: code,
          timer_state: { status: 'stopped', duration: 1500 }
        });

      if (error) {
        console.error('Error creating room:', error);
        throw error;
      } else {
        const roomId = data; // data is the UUID returned by your function
        console.log('Created room with ID:', roomId);

        // Step 2: Add to room_members
        const { error: memberError } = await supabase
          .from('room_members')
          .insert([{ room_id: roomId, user_id: userId }]);

        if (memberError) {
          console.error('❌ Failed to insert into room_members:', memberError.message);
          throw memberError;
        }

        setRoomCode(code);
        setSnackbar('✅ Room created successfully!');
        navigation.navigate('RoomScreen', { roomId, roomCode: code });
      }
    } catch (e) {
      console.error('❌ Caught error:', e.message || e);
      setError(e.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    await Clipboard.setStringAsync(roomCode);
    setSnackbar('📋 Room code copied!');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Create Study Room</Text>
      {roomCode ? (
        <View style={styles.codeBox}>
          <Text style={styles.code}>{roomCode}</Text>
          <Button mode="outlined" onPress={handleCopy} style={{ marginTop: 12 }}>
            Copy Code
          </Button>
        </View>
      ) : (
        <Button
          mode="contained"
          onPress={handleCreateRoom}
          loading={loading}
          disabled={loading || !userId}
          style={{ marginTop: 24 }}
        >
          Create Room
        </Button>
      )}
      {loading && <ActivityIndicator style={{ marginTop: 24 }} />}
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Snackbar visible={!!snackbar} onDismiss={() => setSnackbar('')} duration={2000}>
        {snackbar}
      </Snackbar>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 24 },
  codeBox: { alignItems: 'center', marginTop: 24, padding: 16, borderRadius: 12, backgroundColor: '#f3f6fa' },
  code: { fontSize: 32, fontWeight: 'bold', letterSpacing: 4, marginBottom: 8 },
  error: { color: 'red', marginTop: 16 },
});
