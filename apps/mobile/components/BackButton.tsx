import { Pressable, Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';

interface Props {
  onPress?: () => void;
  label?: string;
}

export default function BackButton({ onPress, label }: Props) {
  const router = useRouter();
  return (
    <Pressable
      onPress={onPress ?? (() => router.back())}
      style={styles.container}
      hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
    >
      <Text style={styles.arrow}>←</Text>
      {label && <Text style={styles.label}>{label}</Text>}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  arrow: {
    fontSize: 20,
    color: '#27231C',
    opacity: 0.6,
  },
  label: {
    fontSize: 14,
    color: '#27231C',
    opacity: 0.6,
    fontWeight: '400',
  },
});
