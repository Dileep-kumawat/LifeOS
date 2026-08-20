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
    <View style={{ flex: 1, backgroundColor: colors.canvasSoft }}>
      <ConflictNoticeBanner />
      <Tab.Navigator
        screenOptions={{
          headerShown: true,
          headerStyle: {
            backgroundColor: colors.surface,
            borderBottomWidth: 1,
            borderBottomColor: colors.hairline,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.03,
            shadowRadius: 2,
            elevation: 1
          },
          headerTitleStyle: {
            color: colors.ink,
            fontWeight: "700",
            fontSize: 18,
            letterSpacing: -0.3
          },
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
            height: 62,
            paddingBottom: 8,
            paddingTop: 6,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: -1 },
            shadowOpacity: 0.03,
            shadowRadius: 2,
            elevation: 2
          },
          tabBarLabelStyle: {
            fontSize: 10.5,
            fontWeight: "600",
            marginTop: -2
          },
          tabBarActiveTintColor: colors.primary,
          tabBarInactiveTintColor: colors.inkMuted
        }}
      >
        <Tab.Screen
          name="Dashboard"
          component={DashboardScreen}
          options={{
            tabBarIcon: ({ color }) => <LayoutDashboard color={color} size={20} />
          }}
        />
        <Tab.Screen
          name="Calendar"
          component={CalendarScreen}
          options={{
            tabBarIcon: ({ color }) => <Calendar color={color} size={20} />
          }}
        />
        <Tab.Screen
          name="Habits & Goals"
          component={HabitsGoalsScreen}
          options={{
            tabBarIcon: ({ color }) => <CheckSquare color={color} size={20} />
          }}
        />
        <Tab.Screen
          name="Notes"
          component={NotesScreen}
          options={{
            tabBarIcon: ({ color }) => <FileText color={color} size={20} />
          }}
        />
        <Tab.Screen
          name="Finance"
          component={FinanceScreen}
          options={{
            tabBarIcon: ({ color }) => <DollarSign color={color} size={20} />
          }}
        />
        <Tab.Screen
          name="Assistant"
          component={ChatScreen}
          options={{
            headerShown: false,
            tabBarIcon: ({ color }) => <Sparkles color={color} size={20} />
          }}
        />
        <Tab.Screen
          name="Settings"
          component={SettingsScreen}
          options={{
            tabBarIcon: ({ color }) => <Settings color={color} size={20} />
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
