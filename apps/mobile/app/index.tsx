import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { Redirect } from 'expo-router';
import { getToken, clearToken, isGuestSession } from '@/src/auth';
import { API_BASE } from '@/src/api';

type Destination = '/(tabs)' | '/landing' | '/onboarding' | '/welcome-back';

export default function Index() {
  const [destination, setDestination] = useState<Destination | null>(null);

  useEffect(() => {
    async function check() {
      try {
        const token = await getToken();
        if (!token) {
          if (await isGuestSession()) {
            setDestination('/(tabs)');
          } else {
            setDestination('/landing');
          }
          return;
        }

        const res = await fetch(`${API_BASE}/positions`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!res.ok) {
          // Invalid/expired token or server error — treat as unauthenticated
          await clearToken();
          setDestination('/landing');
          return;
        }

        const positions = await res.json();
        setDestination(positions.length === 0 ? '/onboarding' : '/welcome-back');
      } catch {
        // Network error or any other failure — clear token and go to landing
        await clearToken();
        setDestination('/landing');
      }
    }
    check();
  }, []);

  if (!destination) {
    return <View style={{ flex: 1, backgroundColor: '#F3E7D3' }} />;
  }

  return <Redirect href={destination} />;
}
