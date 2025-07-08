import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text, useTheme, Divider } from 'react-native-paper';
import { AdMobBanner } from 'expo-ads-admob';

const OPTIONS = [
  { label: 'Create Room', screen: 'CreateRoom' },
  { label: 'Join Room', screen: 'JoinRoom' },
  { label: 'Analysis', screen: 'Analysis' },
  { label: 'Settings', screen: 'Settings' },
];

export default function MoreScreen({ navigation }) {
  const theme = useTheme();
  return (
    <View style={styles.container}>
      {OPTIONS.map((opt, idx) => (
        <React.Fragment key={opt.screen}>
          <TouchableOpacity
            style={styles.option}
            onPress={() => navigation.navigate(opt.screen)}
            activeOpacity={0.7}
          >
            <Text style={[styles.label, { color: theme.colors.onBackground }]}>{opt.label}</Text>
          </TouchableOpacity>
          {idx < OPTIONS.length - 1 && <Divider style={styles.divider} />}
        </React.Fragment>
      ))}
      <AdMobBanner
        bannerSize="smartBannerPortrait"
        adUnitID="ca-app-pub-3940256099942544/6300978111"
        servePersonalizedAds={false}
        onDidFailToReceiveAdWithError={console.log}
        style={{ alignSelf: 'center', marginTop: 8 }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingVertical: 32,
    paddingHorizontal: 24,
    backgroundColor: 'transparent',
    justifyContent: 'center',
  },
  option: {
    paddingVertical: 22,
    paddingHorizontal: 8,
  },
  label: {
    fontSize: 19,
    fontWeight: '500',
    letterSpacing: 0.2,
  },
  divider: {
    marginLeft: 0,
    marginRight: 0,
    opacity: 0.12,
  },
}); 