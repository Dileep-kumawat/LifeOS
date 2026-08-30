import React, { useEffect, useRef, useCallback, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Platform,
  NativeSyntheticEvent,
  NativeScrollEvent,
  useWindowDimensions,
  Keyboard
} from "react-native";
import { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  useAnimatedScrollHandler,
  interpolate,
  Extrapolation,
  withTiming,
  Easing
} from "react-native-reanimated";
import {
  LayoutDashboard,
  Calendar,
  CheckSquare,
  FileText,
  DollarSign,
  Sparkles,
  Settings,
  ShieldAlert,
  Compass,
  GraduationCap,
  Timer,
  Grid,
  LucideIcon
} from "lucide-react-native";
import { colors, radius } from "../theme";

const AnimatedView = Animated.View as React.ComponentType<any>;

// Dimensions & layout constants
export const DOCK_HEIGHT = 64;
export const DOCK_VERTICAL_OFFSET = 6;
export const DOCK_CLEARANCE = 16;
const ITEM_WIDTH = 54;
const INDICATOR_SIZE = 50;
const FADE_WIDTH = 48;

/**
 * Returns the total reserved height of the floating dock including bottom safe area and clearance.
 * Used by tab screens for bottom content padding so items are not occluded.
 */
export function useDockHeight(extraPadding = 0): number {
  const insets = useSafeAreaInsets();
  const bottomOffset = Math.max(insets.bottom, 12) + DOCK_VERTICAL_OFFSET;
  return DOCK_HEIGHT + bottomOffset + DOCK_CLEARANCE + extraPadding;
}

// Fallback icon resolver for dynamically added screens without explicit tabBarIcon
function getFallbackIcon(routeName: string): LucideIcon {
  const name = routeName.toLowerCase();
  if (name.includes("dash") || name.includes("home")) return LayoutDashboard;
  if (name.includes("cal") || name.includes("event") || name.includes("time")) return Calendar;
  if (name.includes("habit") || name.includes("goal") || name.includes("task") || name.includes("check")) return CheckSquare;
  if (name.includes("note") || name.includes("doc") || name.includes("memo")) return FileText;
  if (name.includes("fin") || name.includes("money") || name.includes("budget") || name.includes("pay")) return DollarSign;
  if (name.includes("study") || name.includes("card") || name.includes("syllabus") || name.includes("learn")) return GraduationCap;
  if (name.includes("focus") || name.includes("pomo") || name.includes("timer") || name.includes("clock")) return Timer;
  if (name.includes("chat") || name.includes("ai") || name.includes("assist") || name.includes("spark")) return Sparkles;
  if (name.includes("set") || name.includes("pref") || name.includes("config")) return Settings;
  if (name.includes("conflict") || name.includes("sync") || name.includes("alert")) return ShieldAlert;
  if (name.includes("explore") || name.includes("discover")) return Compass;
  return Grid;
}

// Static gradient color & location arrays to avoid re-instantiation thrash
const LEFT_FADE_COLORS =
  Platform.OS === "ios"
    ? (["rgba(255, 255, 255, 0.95)", "rgba(255, 255, 255, 0.65)", "rgba(255, 255, 255, 0)"] as const)
    : (["rgba(255, 255, 255, 1)", "rgba(255, 255, 255, 0.8)", "rgba(255, 255, 255, 0)"] as const);

const RIGHT_FADE_COLORS =
  Platform.OS === "ios"
    ? (["rgba(255, 255, 255, 0)", "rgba(255, 255, 255, 0.65)", "rgba(255, 255, 255, 0.95)"] as const)
    : (["rgba(255, 255, 255, 0)", "rgba(255, 255, 255, 0.8)", "rgba(255, 255, 255, 1)"] as const);

const LEFT_FADE_LOCATIONS = [0, 0.35, 1] as const;
const RIGHT_FADE_LOCATIONS = [0, 0.65, 1] as const;
const GRADIENT_START = { x: 0, y: 0.5 };
const GRADIENT_END = { x: 1, y: 0.5 };

const LeftFadeMask = React.memo(() => (
  <LinearGradient
    colors={LEFT_FADE_COLORS as any}
    locations={LEFT_FADE_LOCATIONS as any}
    start={GRADIENT_START}
    end={GRADIENT_END}
    style={styles.leftEdgeFade}
    pointerEvents="none"
  />
));

const RightFadeMask = React.memo(() => (
  <LinearGradient
    colors={RIGHT_FADE_COLORS as any}
    locations={RIGHT_FADE_LOCATIONS as any}
    start={GRADIENT_START}
    end={GRADIENT_END}
    style={styles.rightEdgeFade}
    pointerEvents="none"
  />
));

const CenterIndicator = React.memo(() => (
  <View style={styles.staticCenterIndicator} pointerEvents="none">
    <View style={styles.activeDot} />
  </View>
));

interface DockItemProps {
  route: BottomTabBarProps["state"]["routes"][number];
  index: number;
  scrollX: Animated.SharedValue<number>;
  options: BottomTabBarProps["descriptors"][string]["options"];
  onPress: (index: number) => void;
  onLongPress: (index: number) => void;
}

const DockItem = React.memo(function DockItem({
  route,
  index,
  scrollX,
  options,
  onPress,
  onLongPress
}: DockItemProps) {
  // Compute continuous proximity to the fixed dock center based on scrollX
  const animatedItemStyle = useAnimatedStyle(() => {
    const itemCenterOffset = index * ITEM_WIDTH;
    const distanceFromCenter = Math.abs(scrollX.value - itemCenterOffset);

    // 1 when exactly centered, linearly drops to 0 at 1 item distance away
    const proximity = interpolate(
      distanceFromCenter,
      [0, ITEM_WIDTH],
      [1, 0],
      Extrapolation.CLAMP
    );

    const scale = interpolate(proximity, [0, 1], [1, 1.15], Extrapolation.CLAMP);
    const translateY = interpolate(proximity, [0, 1], [0, -3], Extrapolation.CLAMP);
    const opacity = interpolate(proximity, [0, 1], [0.55, 1], Extrapolation.CLAMP);

    return {
      opacity,
      transform: [
        { translateY },
        { scale }
      ]
    };
  });

  const label =
    typeof options.tabBarLabel === "string"
      ? options.tabBarLabel
      : options.title !== undefined
      ? options.title
      : route.name;

  // Icon rendering
  let IconNode: React.ReactNode = null;
  if (options.tabBarIcon) {
    IconNode = options.tabBarIcon({
      focused: true,
      color: colors.primary,
      size: 22
    });
  } else {
    const FallbackComponent = getFallbackIcon(route.name);
    IconNode = <FallbackComponent color={colors.primary} size={22} />;
  }

  const handlePress = useCallback(() => {
    onPress(index);
  }, [onPress, index]);

  const handleLongPress = useCallback(() => {
    onLongPress(index);
  }, [onLongPress, index]);

  return (
    <View style={styles.itemWrapper}>
      <AnimatedView style={[styles.itemContainer, animatedItemStyle]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={options.tabBarAccessibilityLabel || label}
          testID={options.tabBarButtonTestID}
          onPress={handlePress}
          onLongPress={handleLongPress}
          style={styles.pressable}
          hitSlop={8}
        >
          {IconNode}

          {/* Badge if present */}
          {options.tabBarBadge !== undefined && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{options.tabBarBadge}</Text>
            </View>
          )}
        </Pressable>
      </AnimatedView>
    </View>
  );
});

export function FloatingDock({
  state,
  descriptors,
  navigation
}: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const { width: screenWidth } = useWindowDimensions();
  const scrollViewRef = useRef<any>(null);
  const lastSettledIndexRef = useRef<number>(state.index);
  const isProgrammaticScrollRef = useRef<boolean>(false);
  const programmaticScrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const labelFadeTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState<boolean>(false);

  // Auto-hide floating dock when virtual keyboard is active (via opacity to keep state mounted)
  useEffect(() => {
    const showSub = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow",
      () => setIsKeyboardVisible(true)
    );
    const hideSub = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide",
      () => setIsKeyboardVisible(false)
    );
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  // Deterministic dock width and side padding computed directly from screen width and route count
  const dockWidth = Math.min(
    screenWidth - 32,
    Math.max(ITEM_WIDTH * 3, state.routes.length * ITEM_WIDTH + 32)
  );
  const sidePadding = Math.max(0, (dockWidth - ITEM_WIDTH) / 2);

  // Reanimated scroll tracking initialized to current active index
  const scrollX = useSharedValue(state.index * ITEM_WIDTH);

  // Reanimated opacity for the transient active title pill label
  const labelOpacity = useSharedValue(1);

  // Reanimated opacity for the dock container during keyboard visibility transitions
  const dockOpacity = useSharedValue(1);

  useEffect(() => {
    dockOpacity.value = withTiming(isKeyboardVisible ? 0 : 1, {
      duration: 180,
      easing: Easing.out(Easing.ease)
    });
  }, [isKeyboardVisible, dockOpacity]);

  const animatedDockContainerStyle = useAnimatedStyle(() => {
    return {
      opacity: dockOpacity.value,
      transform: [
        {
          translateY: interpolate(dockOpacity.value, [0, 1], [16, 0], Extrapolation.CLAMP)
        }
      ]
    };
  });

  const setProgrammaticScroll = useCallback((isProgrammatic: boolean) => {
    isProgrammaticScrollRef.current = isProgrammatic;
    if (programmaticScrollTimeoutRef.current) {
      clearTimeout(programmaticScrollTimeoutRef.current);
      programmaticScrollTimeoutRef.current = null;
    }
    if (isProgrammatic) {
      // Safety fallback: auto-clear after 600ms in case onMomentumScrollEnd does not fire
      programmaticScrollTimeoutRef.current = setTimeout(() => {
        isProgrammaticScrollRef.current = false;
        programmaticScrollTimeoutRef.current = null;
      }, 600);
    }
  }, []);

  // Sync scroll position with active route index from React Navigation
  useEffect(() => {
    lastSettledIndexRef.current = state.index;
    setProgrammaticScroll(true);
    if (scrollViewRef.current) {
      scrollViewRef.current.scrollTo({
        x: state.index * ITEM_WIDTH,
        animated: true
      });
    }
  }, [state.index, setProgrammaticScroll]);

  // Auto-fade the active screen title pill after hold duration on index change
  useEffect(() => {
    if (labelFadeTimeoutRef.current) {
      clearTimeout(labelFadeTimeoutRef.current);
      labelFadeTimeoutRef.current = null;
    }

    // Immediately show label at full opacity on confirmed screen change
    labelOpacity.value = 1;

    // Hold for 1300ms, then smoothly fade out over 280ms
    labelFadeTimeoutRef.current = setTimeout(() => {
      labelOpacity.value = withTiming(0, {
        duration: 280,
        easing: Easing.out(Easing.ease)
      });
    }, 1300);

    return () => {
      if (labelFadeTimeoutRef.current) {
        clearTimeout(labelFadeTimeoutRef.current);
        labelFadeTimeoutRef.current = null;
      }
    };
  }, [state.index, labelOpacity]);

  // Scroll handler for real-time item scale and proximity interpolation
  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollX.value = event.contentOffset.x;
    }
  });

  // Dynamic animated style for the auto-fading title pill
  const animatedLabelStyle = useAnimatedStyle(() => {
    return {
      opacity: labelOpacity.value,
      transform: [
        {
          translateY: interpolate(labelOpacity.value, [0, 1], [4, 0], Extrapolation.CLAMP)
        }
      ]
    };
  });

  // Handle scroll settle & route change for manual user gestures only
  const handleScrollSettle = useCallback(
    (offsetX: number) => {
      const targetIndex = Math.round(offsetX / ITEM_WIDTH);
      const clampedIndex = Math.max(0, Math.min(state.routes.length - 1, targetIndex));

      if (clampedIndex !== lastSettledIndexRef.current) {
        lastSettledIndexRef.current = clampedIndex;

        // Trigger single-fire haptic feedback on snap settle
        try {
          Haptics.selectionAsync();
        } catch {
          // Fallback
        }

        const targetRoute = state.routes[clampedIndex];
        if (targetRoute) {
          const event = navigation.emit({
            type: "tabPress",
            target: targetRoute.key,
            canPreventDefault: true
          });

          if (!event.defaultPrevented) {
            navigation.navigate(targetRoute.name, targetRoute.params);
          }
        }
      }
    },
    [state.routes, navigation]
  );

  const onScrollBeginDrag = useCallback(() => {
    // User is manually interacting with the dock; disable programmatic mode immediately
    setProgrammaticScroll(false);
  }, [setProgrammaticScroll]);

  const onMomentumScrollEnd = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      if (isProgrammaticScrollRef.current) {
        setProgrammaticScroll(false);
        return;
      }
      handleScrollSettle(e.nativeEvent.contentOffset.x);
    },
    [handleScrollSettle, setProgrammaticScroll]
  );

  const onScrollEndDrag = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      if (isProgrammaticScrollRef.current) return;
      if (Platform.OS === "android") {
        handleScrollSettle(e.nativeEvent.contentOffset.x);
      }
    },
    [handleScrollSettle]
  );

  const handleItemPress = useCallback(
    (index: number) => {
      // Mark as programmatic scroll so intermediate positions do NOT trigger navigation
      setProgrammaticScroll(true);
      lastSettledIndexRef.current = index;

      if (scrollViewRef.current) {
        scrollViewRef.current.scrollTo({
          x: index * ITEM_WIDTH,
          animated: true
        });
      }

      if (index !== state.index) {
        try {
          Haptics.selectionAsync();
        } catch {
          // Fallback
        }

        const targetRoute = state.routes[index];
        if (targetRoute) {
          const event = navigation.emit({
            type: "tabPress",
            target: targetRoute.key,
            canPreventDefault: true
          });

          if (!event.defaultPrevented) {
            navigation.navigate(targetRoute.name, targetRoute.params);
          }
        }
      }
    },
    [state.index, state.routes, navigation, setProgrammaticScroll]
  );

  const handleItemLongPress = useCallback(
    (index: number) => {
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      } catch {
        // Fallback
      }

      const targetRoute = state.routes[index];
      if (targetRoute) {
        navigation.emit({
          type: "tabLongPress",
          target: targetRoute.key
        });
      }
    },
    [state.routes, navigation]
  );

  // Active route options for top tooltip pill
  const activeRoute = state.routes[state.index];
  const activeOptions = descriptors[activeRoute?.key]?.options;
  const activeLabel =
    typeof activeOptions?.tabBarLabel === "string"
      ? activeOptions.tabBarLabel
      : activeOptions?.title !== undefined
      ? activeOptions.title
      : activeRoute?.name;

  const bottomOffset = Math.max(insets.bottom, 12) + DOCK_VERTICAL_OFFSET;

  return (
    <AnimatedView
      pointerEvents={isKeyboardVisible ? "none" : "box-none"}
      style={[
        styles.dockOuterContainer,
        {
          bottom: bottomOffset,
          paddingHorizontal: 16
        },
        animatedDockContainerStyle
      ]}
    >
      {/* Floating Dynamic Island Title Pill (Transient auto-fading label) */}
      {Boolean(activeLabel) && (
        <AnimatedView
          pointerEvents="none"
          style={[styles.labelPill, animatedLabelStyle]}
        >
          <Text style={styles.labelPillText}>{activeLabel}</Text>
        </AnimatedView>
      )}

      {/* Floating Dock Glass Container */}
      <View style={styles.dockShadowWrapper}>
        <View style={[styles.dockClipContainer, { width: dockWidth }]}>
          {Platform.OS === "ios" ? (
            <BlurView intensity={90} tint="light" style={styles.blurAbsoluteFill} />
          ) : (
            <View style={styles.androidGlassFallback} />
          )}

          {/* Horizontally Draggable / Scrollable Icon Row */}
          <Animated.ScrollView
            ref={scrollViewRef}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentOffset={{ x: state.index * ITEM_WIDTH, y: 0 }}
            contentContainerStyle={[
              styles.scrollContent,
              {
                paddingHorizontal: sidePadding
              }
            ]}
            snapToInterval={ITEM_WIDTH}
            snapToAlignment="start"
            decelerationRate="fast"
            bounces={true}
            scrollEventThrottle={16}
            onScroll={scrollHandler}
            onScrollBeginDrag={onScrollBeginDrag}
            onScrollEndDrag={onScrollEndDrag}
            onMomentumScrollEnd={onMomentumScrollEnd}
            keyboardShouldPersistTaps="handled"
          >
            {state.routes.map((route, index) => {
              const { options } = descriptors[route.key];

              return (
                <DockItem
                  key={route.key}
                  route={route}
                  index={index}
                  scrollX={scrollX}
                  options={options}
                  onPress={handleItemPress}
                  onLongPress={handleItemLongPress}
                />
              );
            })}
          </Animated.ScrollView>

          {/* Left Edge Gradient Fade Mask */}
          <LeftFadeMask />

          {/* Right Edge Gradient Fade Mask */}
          <RightFadeMask />

          {/* Fixed Static Center Active Indicator (Never scrolls, unaffected by edge fade) */}
          <CenterIndicator />
        </View>
      </View>
    </AnimatedView>
  );
}

const styles = StyleSheet.create({
  dockOuterContainer: {
    position: "absolute",
    left: 0,
    right: 0,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 9999
  },
  labelPill: {
    backgroundColor: "rgba(26, 26, 26, 0.88)",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: radius.full,
    marginBottom: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3
  },
  labelPillText: {
    color: "#ffffff",
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: -0.1
  },
  dockShadowWrapper: {
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 10,
    borderRadius: radius.full
  },
  dockClipContainer: {
    height: DOCK_HEIGHT,
    flexDirection: "row",
    alignItems: "center",
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.9)",
    backgroundColor: Platform.OS === "ios" ? "rgba(255, 255, 255, 0.75)" : "rgba(255, 255, 255, 0.95)",
    overflow: "hidden",
    maxWidth: "100%",
    position: "relative"
  },
  androidGlassFallback: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(255, 255, 255, 0.95)"
  },
  blurAbsoluteFill: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0
  },
  leftEdgeFade: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    height: DOCK_HEIGHT,
    width: FADE_WIDTH,
    zIndex: 3,
    borderTopLeftRadius: radius.full,
    borderBottomLeftRadius: radius.full
  },
  rightEdgeFade: {
    position: "absolute",
    right: 0,
    top: 0,
    bottom: 0,
    height: DOCK_HEIGHT,
    width: FADE_WIDTH,
    zIndex: 3,
    borderTopRightRadius: radius.full,
    borderBottomRightRadius: radius.full
  },
  staticCenterIndicator: {
    position: "absolute",
    width: INDICATOR_SIZE,
    height: INDICATOR_SIZE,
    borderRadius: INDICATOR_SIZE / 2,
    backgroundColor: "rgba(0, 0, 0, 0.055)",
    borderWidth: 1,
    borderColor: "rgba(0, 0, 0, 0.04)",
    top: (DOCK_HEIGHT - INDICATOR_SIZE) / 2,
    left: "50%",
    marginLeft: -INDICATOR_SIZE / 2,
    alignItems: "center",
    justifyContent: "flex-end",
    paddingBottom: 4,
    zIndex: 4
  },
  activeDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.primary
  },
  scrollContent: {
    flexDirection: "row",
    alignItems: "center",
    height: DOCK_HEIGHT,
    zIndex: 2
  },
  itemWrapper: {
    width: ITEM_WIDTH,
    height: DOCK_HEIGHT,
    alignItems: "center",
    justifyContent: "center"
  },
  itemContainer: {
    width: ITEM_WIDTH,
    height: DOCK_HEIGHT,
    alignItems: "center",
    justifyContent: "center"
  },
  pressable: {
    width: ITEM_WIDTH,
    height: DOCK_HEIGHT,
    alignItems: "center",
    justifyContent: "center",
    position: "relative"
  },
  badge: {
    position: "absolute",
    top: 10,
    right: 8,
    backgroundColor: colors.error,
    borderRadius: radius.full,
    minWidth: 16,
    height: 16,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 3,
    borderWidth: 1.5,
    borderColor: colors.surface
  },
  badgeText: {
    color: "#ffffff",
    fontSize: 9,
    fontWeight: "700"
  }
});
