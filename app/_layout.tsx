import { Stack } from 'expo-router';
export default function Root(){
  return (
    <Stack screenOptions={{ headerShown:false }}>
      <Stack.Screen name='(tabs)' />
      <Stack.Screen name='incomes' />
      <Stack.Screen name='deductions' />
      <Stack.Screen name='review' />
      <Stack.Screen name='declaration' />
      <Stack.Screen name='submit' />
      <Stack.Screen name='pay' />
      <Stack.Screen name='archive' />
    </Stack>
  );
}
