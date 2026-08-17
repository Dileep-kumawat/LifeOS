import { useEffect } from "react";
import { View, ActivityIndicator, StyleSheet } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import {
  LayoutDashboard,
  Calendar,
  CheckSquare,
  FileText,
  DollarSign,
  Settings,
  Sparkles
} from "lucide-react-native";

import { useAuthStore } from "../store/authStore";
import { authApi } from "../services/apiClient";
import { getDatabase } from "../db/database";
import { colors } from "../theme";

import { LoginScreen } from "../screens/auth/LoginScreen";
import { RegisterScreen } from "../screens/auth/RegisterScreen";
import { ForgotPasswordScreen } from "../screens/auth/ForgotPasswordScreen";

import { DashboardScreen } from "../screens/main/DashboardScreen";
import { CalendarScreen } from "../screens/main/CalendarScreen";
import { HabitsGoalsScreen } from "../screens/main/HabitsGoalsScreen";
import { NotesScreen } from "../screens/main/NotesScreen";
import { FinanceScreen } from "../screens/main/FinanceScreen";
import { ChatScreen } from "../screens/main/ChatScreen";
import { SettingsScreen } from "../screens/main/SettingsScreen";
import { ConflictResolutionScreen } from "../screens/main/ConflictResolutionScreen";

import { SyncStatusIndicator } from "../components/ui/SyncStatusIndicator";
import { ConflictNoticeBanner } from "../components/ui/ConflictNoticeBanner";
import { syncEngine } from "../services/syncEngine";
import { notificationService } from "../services/notificationService";

const AuthStack = createNativeStackNavigator();
const AppStack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function AuthNavigator() {
  return (
    <AuthStack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.canvasSoft }
      }}
    >
      <AuthStack.Screen name="Login" component={LoginScreen} />
      <AuthStack.Screen name="Register" component={RegisterScreen} />
      <AuthStack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
    </AuthStack.Navigator>
  );
}

function MainTabNavigator() {
  return (
    <View style={{ flex: 1 }}>
      <ConflictNoticeBanner />
      <Tab.Navigator
        screenOptions={{
          headerShown: true,
          headerStyle: { backgroundColor: colors.surface },
          headerTitleStyle: { color: colors.ink, fontWeight: "600" },
          headerShadowVisible: false,
          headerRight: () => (
            <View style={{ marginRight: 16 }}>
              <SyncStatusIndicator />
            </View>
          ),
          tabBarStyle: {
            backgroundColor: colors.surface,
            borderTopColor: colors.hairline,
            borderTopWidth: 1,
            height: 60,
            paddingBottom: 8,
            paddingTop: 6
          },
          tabBarActiveTintColor: colors.primary,
          tabBarInactiveTintColor: colors.inkFaint
        }}
      >
        <Tab.Screen
          name="Dashboard"
          component={DashboardScreen}
          options={{
            tabBarIcon: ({ color, size }) => <LayoutDashboard color={color} size={size} />
          }}
        />
        <Tab.Screen
          name="Calendar"
          component={CalendarScreen}
          options={{
            tabBarIcon: ({ color, size }) => <Calendar color={color} size={size} />
          }}
        />
        <Tab.Screen
          name="Habits & Goals"
          component={HabitsGoalsScreen}
          options={{
            tabBarIcon: ({ color, size }) => <CheckSquare color={color} size={size} />
          }}
        />
        <Tab.Screen
          name="Notes"
          component={NotesScreen}
          options={{
            tabBarIcon: ({ color, size }) => <FileText color={color} size={size} />
          }}
        />
        <Tab.Screen
          name="Finance"
          component={FinanceScreen}
          options={{
            tabBarIcon: ({ color, size }) => <DollarSign color={color} size={size} />
          }}
        />
        <Tab.Screen
          name="Assistant"
          component={ChatScreen}
          options={{
            tabBarIcon: ({ color, size }) => <Sparkles color={color} size={size} />
          }}
        />
        <Tab.Screen
          name="Settings"
          component={SettingsScreen}
          options={{
            tabBarIcon: ({ color, size }) => <Settings color={color} size={size} />
          }}
        />
      </Tab.Navigator>
    </View>
  );
}

function AuthenticatedNavigator() {
  return (
    <AppStack.Navigator screenOptions={{ headerShown: false }}>
      <AppStack.Screen name="MainTabs" component={MainTabNavigator} />
      <AppStack.Screen
        name="Chat"
        component={ChatScreen}
        options={{
          headerShown: true,
          headerStyle: { backgroundColor: colors.surface },
          headerTitleStyle: { color: colors.ink, fontWeight: "600" },
          headerShadowVisible: false
        }}
      />
      <AppStack.Screen
        name="ConflictResolution"
        component={ConflictResolutionScreen}
        options={{
          presentation: "modal",
          headerShown: false
        }}
      />
    </AppStack.Navigator>
  );
}

export function RootNavigator() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const isInitializing = useAuthStore((state) => state.isInitializing);

  useEffect(() => {
    async function bootstrap() {
      // Initialize local SQLite tables
      await getDatabase();
      // Attempt silent session restore from SecureStore
      await authApi.restoreSession();
      // Initialize notification handlers
      await notificationService.initialize();
    }
    bootstrap();
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      syncEngine.startSyncEngine();
      notificationService.initialize().catch(() => {});
    } else {
      syncEngine.stopSyncEngine();
    }
    return () => {
      syncEngine.stopSyncEngine();
    };
  }, [isAuthenticated]);

  if (isInitializing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <NavigationContainer>
      {isAuthenticated ? <AuthenticatedNavigator /> : <AuthNavigator />}
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: colors.canvasSoft
  }
});
