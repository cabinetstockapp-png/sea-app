import { openBrowserAsync, WebBrowserPresentationStyle } from 'expo-web-browser';
import { type ReactNode } from 'react';
import { Pressable, Text, type StyleProp, type TextStyle } from 'react-native';

type Props = {
  href: string;
  children?: ReactNode;
  style?: StyleProp<TextStyle>;
};

export function ExternalLink({ href, children, style }: Props) {
  return (
    <Pressable
      onPress={async () => {
        await openBrowserAsync(href, {
          presentationStyle: WebBrowserPresentationStyle.AUTOMATIC,
        });
      }}>
      <Text style={[{ color: '#0a7ea4' }, style]}>{children}</Text>
    </Pressable>
  );
}
