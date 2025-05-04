import React from 'react';
import { StyleSheet, View, SafeAreaView, StatusBar, Platform } from 'react-native';

/**
 * ScreenContainer - A wrapper component for all screens that provides:
 * - Safe area padding
 * - Consistent top margin for all content
 * - Proper handling of the status bar
 */
export default function ScreenContainer({ children, style }) {
  // Calculate safe top padding based on platform
  const STATUSBAR_HEIGHT = Platform.OS === 'ios' ? 44 : StatusBar.currentHeight || 24;
  
  return (
    <View style={[styles.container, { paddingTop: STATUSBAR_HEIGHT }]}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      <View style={[styles.content, style]}>
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f7f7f7',
  },
  content: {
    flex: 1,
    padding: 16,
  }
});
