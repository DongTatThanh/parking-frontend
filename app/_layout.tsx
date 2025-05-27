import React, { useEffect } from 'react';
import { Stack } from 'expo-router';
import '../polyfills'; // Import polyfills before anything else

export default function RootLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ headerShown: false }} />
    </Stack>
  );
} 