import { useRef, useState } from 'react';
import {
  View, Text, TextInput, Pressable, StyleSheet
} from 'react-native';

interface Props {
  value: string;
  onChange: (val: string) => void;
  autoFocus?: boolean;
}

export default function OtpInput({ value, onChange, autoFocus }: Props) {
  const inputRef = useRef<TextInput>(null);
  const [focused, setFocused] = useState(false);

  const slots = Array.from({ length: 6 }, (_, i) => {
    const char = value[i];
    const isNext = i === value.length;
    const showCursor = focused && isNext;
    return { char, showCursor };
  });

  return (
    <Pressable
      style={styles.container}
      onPress={() => inputRef.current?.focus()}
    >
      {/* Hidden real input */}
      <TextInput
        ref={inputRef}
        value={value}
        onChangeText={v => onChange(v.replace(/[^0-9]/g, '').slice(0, 6))}
        keyboardType="number-pad"
        maxLength={6}
        autoFocus={autoFocus}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={styles.hiddenInput}
        caretHidden
      />

      {/* Visual slots */}
      <View style={[styles.slots, focused && styles.slotsFocused]}>
        {slots.map((slot, i) => (
          <View key={i} style={styles.slot}>
            {slot.char ? (
              <Text style={styles.digit}>{slot.char}</Text>
            ) : slot.showCursor ? (
              <Text style={styles.cursor}>|</Text>
            ) : (
              <Text style={styles.placeholder}>_</Text>
            )}
          </View>
        ))}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    height: 72,
    position: 'relative',
  },
  hiddenInput: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    opacity: 0,
  },
  slots: {
    flexDirection: 'row',
    width: '100%',
    height: 72,
    borderWidth: 1.5,
    borderColor: 'rgba(39,35,28,0.20)',
    borderRadius: 12,
    overflow: 'hidden',
  },
  slotsFocused: {
    borderColor: '#5B4A3A',
  },
  slot: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  digit: {
    fontSize: 28,
    fontWeight: '300',
    color: '#27231C',
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  cursor: {
    fontSize: 28,
    color: '#5B4A3A',
  },
  placeholder: {
    fontSize: 20,
    color: 'rgba(39,35,28,0.20)',
    textAlignVertical: 'center',
  },
});
