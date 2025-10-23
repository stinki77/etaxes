import React from 'react';
import { Tabs } from 'expo-router';
export default function TabsLayout(){
  return (
    <Tabs screenOptions={{ headerShadowVisible:false, tabBarLabelStyle:{fontSize:12} }}>
      <Tabs.Screen name='start' options={{ title:'Декларация' }} />
      <Tabs.Screen name='language' options={{ title:'Език' }} />
    </Tabs>
  );
}
