import { Pressable } from 'react-native';
import { BottomTabBarButtonProps } from '@react-navigation/bottom-tabs';
import * as Haptics from 'expo-haptics';

export default function HapticTab(props: BottomTabBarButtonProps) {
  return (
    <Pressable
      {...(props as any)}
      onPressIn={(e) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        props.onPressIn?.(e);
      }}
    />
  );
}
