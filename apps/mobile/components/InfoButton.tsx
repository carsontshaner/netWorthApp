import { useState } from 'react';
import {
  View, Text, Pressable, StyleSheet,
  TouchableWithoutFeedback,
} from 'react-native';
import { useRouter } from 'expo-router';

const MENU_ITEMS = [
  { label: 'Profile', key: 'profile' },
  { label: 'Settings', key: 'settings' },
  { label: 'Information', key: 'information' },
  { label: 'Disclosures', key: 'disclosures' },
];

interface Props {
  onSelect: (key: string) => void;
}

export default function InfoButton({ onSelect }: Props) {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  return (
    <>
      {/* Floating button */}
      <Pressable
        style={styles.button}
        onPress={() => setOpen(true)}
      >
        <Text style={styles.icon}>i</Text>
      </Pressable>

      {/* Popup menu */}
      {open && (
        <>
          {/* Invisible backdrop to close on tap outside */}
          <TouchableWithoutFeedback
            onPress={() => setOpen(false)}
          >
            <View style={styles.backdrop} />
          </TouchableWithoutFeedback>

          {/* Menu card — appears above the button */}
          <View style={styles.menu}>
            {MENU_ITEMS.map((item, i) => (
              <Pressable
                key={item.key}
                style={[
                  styles.menuItem,
                  styles.menuItemBorder,
                ]}
                onPress={() => {
                  setOpen(false);
                  onSelect(item.key);
                }}
              >
                <Text style={styles.menuLabel}>
                  {item.label}
                </Text>
              </Pressable>
            ))}
            <Pressable
              key="delete-account"
              style={styles.menuItem}
              onPress={() => {
                setOpen(false);
                router.push('/account-deletion');
              }}
            >
              <Text style={[styles.menuLabel, { color: '#C62828' }]}>
                Delete account
              </Text>
            </Pressable>
          </View>
        </>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  button: {
    position: 'absolute',
    bottom: 32,
    right: 24,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(39,35,28,0.08)',
    borderWidth: 1.5,
    borderColor: 'rgba(39,35,28,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100,
  },
  icon: {
    fontSize: 16,
    fontWeight: '400',
    fontStyle: 'italic',
    color: 'rgba(39,35,28,0.55)',
    lineHeight: 20,
  },
  backdrop: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    zIndex: 98,
  },
  menu: {
    position: 'absolute',
    bottom: 76,
    right: 16,
    width: 180,
    backgroundColor: '#F3E7D3',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(39,35,28,0.12)',
    shadowColor: '#27231C',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.10,
    shadowRadius: 12,
    elevation: 8,
    zIndex: 99,
    overflow: 'hidden',
  },
  menuItem: {
    paddingVertical: 14,
    paddingHorizontal: 18,
  },
  menuItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(39,35,28,0.08)',
  },
  menuLabel: {
    fontSize: 15,
    fontWeight: '400',
    color: '#27231C',
    letterSpacing: 0.1,
  },
});
