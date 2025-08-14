import { View, Text, StyleSheet } from 'react-native'
import React from 'react'
import { useTheme } from '../contexts'

const NearbyScreen = () => {
  const { theme } = useTheme();
  const styles = createStyles(theme);

  return (
    <View style={styles.container}>
      <Text style={styles.text}>NearbyScreen</Text>
    </View>
  )
}

const createStyles = (theme: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
    fontSize: 18,
    color: theme.colors.text,
    fontWeight: '600',
  },
});

export default NearbyScreen