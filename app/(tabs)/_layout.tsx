import { Tabs } from 'expo-router';
import { ListChecks, Users, Inbox, MessageCircle, User } from 'lucide-react-native';
import { color, size } from '@/theme/tokens';
import { useUnreadCount } from '@/lib/unread';
import { badgeLabel } from '@/core/social';
const icon = (I: typeof ListChecks) => ({ color: c }: { color: string }) => <I size={size.icon} color={c} />;
export default function TabsLayout() {
  const unread = useUnreadCount();
  return (<Tabs screenOptions={{ headerShown: false, tabBarActiveTintColor: color.lime500, tabBarInactiveTintColor: color.textMuted, tabBarStyle: { backgroundColor: color.surface1, borderTopColor: color.border } }}>
    <Tabs.Screen name="index" options={{ title: 'Today', tabBarIcon: icon(ListChecks) }} />
    <Tabs.Screen name="feed" options={{ title: 'Feed', tabBarIcon: icon(Users) }} />
    <Tabs.Screen name="inbox" options={{ title: 'Inbox', tabBarIcon: icon(Inbox), tabBarBadge: badgeLabel(unread), tabBarBadgeStyle: { backgroundColor: color.lime500, color: color.onLime },
      tabBarAccessibilityLabel: unread > 0 ? `Inbox, ${unread} unread` : 'Inbox' }} />
    <Tabs.Screen name="chat" options={{ title: 'Chat', tabBarIcon: icon(MessageCircle) }} />
    <Tabs.Screen name="profile" options={{ title: 'Profile', tabBarIcon: icon(User) }} />
  </Tabs>);
}
