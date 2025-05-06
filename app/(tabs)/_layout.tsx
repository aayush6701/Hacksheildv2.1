
import { Tabs } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export default function Layout() {
  return (
    <Tabs screenOptions={{ tabBarShowLabel: false, tabBarActiveTintColor: '#00fff7', headerShown: false }}>
      <Tabs.Screen
        name="index"
        options={{
          tabBarIcon: ({ color }) => (
            <MaterialCommunityIcons name="shield-lock" size={28} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="decode"
        options={{
          tabBarIcon: ({ color }) => (
            <MaterialCommunityIcons name="key-wireless" size={28} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="blocks/index"
        options={{
          tabBarIcon: ({ color }) => (
            <MaterialCommunityIcons name="cube-scan" size={28} color={color} />
          ),
        }}
      />
    </Tabs>
    
  );
}
