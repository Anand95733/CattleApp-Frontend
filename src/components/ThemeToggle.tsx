import React from 'react';
import { TouchableOpacity, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useTheme } from '../contexts';

interface ThemeToggleProps {
  size?: number;
  style?: any;
}

const ThemeToggle: React.FC<ThemeToggleProps> = ({ size = 24, style }) => {
  const { theme, isDark, toggleTheme } = useTheme();

  return (
    <TouchableOpacity
      style={[styles.container, style]}
      onPress={toggleTheme}
      activeOpacity={0.7}
    >
      <Icon
        name={isDark ? 'sunny' : 'moon'}
        size={size}
        color={theme.colors.primary}
      />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 8,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default ThemeToggle;