import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { TextInput, Button, Text, Card, useTheme, Snackbar } from 'react-native-paper';
import { useAuth } from './AuthProvider';
import { useNavigation } from '@react-navigation/native';

export default function LoginScreen() {
  const { signIn, signUp, signInAsGuest } = useAuth();
  const navigation = useNavigation();
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const theme = useTheme();

  const handleAuth = async () => {
    setLoading(true);
    setError('');
    setInfo('');
    try {
      if (isRegister) {
        await signUp(email, password);
        setInfo('Registration successful! Please check your email to confirm your account before logging in.');
        setIsRegister(false);
        setPassword('');
      } else {
        await signIn(email, password);
      }
      // Navigation to Home is handled by Root after auth state changes
    } catch (e) {
      setError(e.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Card style={styles.card}>
        <Card.Title title={isRegister ? 'Register' : 'Login'} />
        <Card.Content>
          <TextInput
            label="Email"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            style={styles.input}
          />
          <TextInput
            label="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            style={styles.input}
          />
          <Button
            mode="contained"
            onPress={handleAuth}
            loading={loading}
            style={styles.button}
          >
            {isRegister ? 'Register' : 'Login'}
          </Button>
          <Button
            onPress={() => setIsRegister(r => !r)}
            disabled={loading}
            style={styles.switchButton}
          >
            {isRegister ? 'Already have an account? Login' : "Don't have an account? Register"}
          </Button>
          <Button
            mode="contained-tonal"
            onPress={signInAsGuest}
            style={[styles.button, { marginTop: 16 }]}
            disabled={loading}
          >
            Continue as Guest
          </Button>
        </Card.Content>
      </Card>
      <Snackbar
        visible={!!error}
        onDismiss={() => setError('')}
        duration={3000}
        style={{ backgroundColor: theme.colors.error }}
      >
        {error}
      </Snackbar>
      <Snackbar
        visible={!!info}
        onDismiss={() => setInfo('')}
        duration={5000}
        style={{ backgroundColor: theme.colors.primary }}
      >
        {info}
      </Snackbar>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f6f6f6',
  },
  card: {
    width: '90%',
    maxWidth: 400,
    elevation: 4,
  },
  input: {
    marginBottom: 16,
  },
  button: {
    marginTop: 8,
  },
  switchButton: {
    marginTop: 8,
  },
}); 