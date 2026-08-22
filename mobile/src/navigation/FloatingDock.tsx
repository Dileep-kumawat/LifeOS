import React, { useEffect, useRef, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Platform,
  NativeSyntheticEvent,
  NativeScrollEvent,
  useWindowDimensions
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
  FadeIn,
  FadeOut
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
  Grid,
  LucideIcon
} from "lucide-react-native";
import { colors, radius } from "../theme";

const AnimatedView = Animated.View as React.ComponentType<any>;

// Fallback icon resolver for dynamically added screens without explicit tabBarIcon
function getFallbackIcon(routeName: string): LucideIcon {
  const name = routeName.toLowerCase();
  if (name.includes("dash") || name.includes("home")) return LayoutDashboard;
  if (name.includes("cal") || name.includes("event") || name.includes("time")) return Calendar;
  if (name.includes("habit") || name.includes("goal") || name.includes("task") || name.includes("check")) return CheckSquare;
  if (name.includes("note") || name.includes("doc") || name.includes("memo")) return FileText;
  if (name.includes("fin") || name.includes("money") || name.includes("budget") || name.includes("pay")) return DollarSign;
  if (name.includes("chat") || name.includes("ai") || name.includes("assist") || name.includes("spark")) return Sparkles;
  if (name.includes("set") || name.includes("pref") || name.includes("config")) return Settings;
  if (name.includes("conflict") || name.includes("sync") || name.includes("alert")) return ShieldAlert;
  if (name.includes("explore") || name.includes("discover")) return Compass;
  return Grid;
}

// Dimensions & layout constants
const DOCK_HEIGHT = 64;
const ITEM_WIDTH = 54;
const INDICATOR_SIZE = 50;
const FADE_WIDTH = 48;

interface DockItemProps {
  route: BottomTabBarProps["state"]["routes"][number];
  index: number;
  scrollX: Animated.SharedValue<number>;
  options: BottomTabBarProps["descriptors"][string]["options"];
  onPress: () => void;
  onLongPress: () => void;
}

function DockItem({
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

  return (
    <View style={styles.itemWrapper}>
      <AnimatedView style={[styles.itemContainer, animatedItemStyle]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={options.tabBarAccessibilityLabel || label}
          testID={options.tabBarButtonTestID}
          onPress={onPress}
          onLongPress={onLongPress}
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
}

export function FloatingDock({
  state,
  descriptors,
  navigation
}: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const { width: screenWidth } = useWindowDimensions();
  const scrollViewRef = useRef<any>(null);
  const [dockWidth, setDockWidth] = useState<number>(0);
  const lastSettledIndexRef = useRef<number>(state.index);

  // Reanimated scroll tracking
  const scrollX = useSharedValue(state.index * ITEM_WIDTH);

  // Determine max dock width
  const effectiveDockWidth = dockWidth > 0 ? dockWidth : Math.min(screenWidth - 32, state.routes.length * ITEM_WIDTH + 32);
  const sidePadding = Math.max(0, (effectiveDockWidth - ITEM_WIDTH) / 2);

  // Sync scroll position with active route index from React Navigation
  useEffect(() => {
    lastSettledIndexRef.current = state.index;
    scrollX.value = state.index * ITEM_WIDTH;
    if (scrollViewRef.current) {
      scrollViewRef.current.scrollTo({
        x: state.index * ITEM_WIDTH,
        animated: true
      });
    }
  }, [state.index]);

  // Scroll handler for real-time item scale and proximity interpolation
  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollX.value = event.contentOffset.x;
    }
  });

  // Handle scroll settle & route change
  const handleScrollSettle = useCallback(
    (offsetX: number) => {
      const targetIndex = Math.round(offsetX / ITEM_WIDTH);
      const clampedIndex = Math.max(0, Math.min(state.routes.length - 1, targetIndex));

      if (clampedIndex !== lastSettledIndexRef.current) {
        lastSettledIndexRef.current = clampedIndex;

        // Trigger haptic feedback exactly once on snap settle
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

  const onMomentumScrollEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    handleScrollSettle(e.nativeEvent.contentOffset.x);
  };

  const onScrollEndDrag = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    // If momentum scrolling will not occur, settle immediately
    if (Platform.OS === "android") {
      handleScrollSettle(e.nativeEvent.contentOffset.x);
    }
  };

  const handleItemPress = (index: number) => {
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
  };

  const handleItemLongPress = (index: number) => {
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
  };

  // Active route options for top tooltip pill
  const activeRoute = state.routes[state.index];
  const activeOptions = descriptors[activeRoute?.key]?.options;
  const activeLabel =
    typeof activeOptions?.tabBarLabel === "string"
      ? activeOptions.tabBarLabel
      : activeOptions?.title !== undefined
      ? activeOptions.title
      : activeRoute?.name;

  const bottomOffset = Math.max(insets.bottom, 12) + 6;

  return (
    <View
      pointerEvents="box-none"
      style={[
        styles.dockOuterContainer,
        {
          bottom: bottomOffset,
          paddingHorizontal: 16
        }
      ]}
    >
      {/* Floating Dynamic Island Title Pill */}
      {activeLabel && (
        <AnimatedView
          key={activeRoute?.key}
          entering={FadeIn.duration(200)}
          exiting={FadeOut.duration(150)}
          style={styles.labelPill}
        >
          <Text style={styles.labelPillText}>{activeLabel}</Text>
        </AnimatedView>
      )}

      {/* Floating Dock Glass Container */}
      <View style={styles.dockShadowWrapper}>
        <View
          style={styles.dockClipContainer}
          onLayout={(e) => {
            const width = e.nativeEvent.layout.width;
            if (width > 0 && width !== dockWidth) {
              setDockWidth(width);
            }
          }}
        >
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
            onMomentumScrollEnd={onMomentumScrollEnd}
            onScrollEndDrag={onScrollEndDrag}
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
                  onPress={() => handleItemPress(index)}
                  onLongPress={() => handleItemLongPress(index)}
                />
              );
            })}
          </Animated.ScrollView>

          {/* Left Edge Gradient Fade Mask */}
          <LinearGradient
            colors={
              Platform.OS === "ios"
                ? ["rgba(255, 255, 255, 0.95)", "rgba(255, 255, 255, 0.65)", "rgba(255, 255, 255, 0)"]
                : ["rgba(255, 255, 255, 1)", "rgba(255, 255, 255, 0.8)", "rgba(255, 255, 255, 0)"]
            }
            locations={[0, 0.35, 1]}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={[styles.leftEdgeFade, { height: DOCK_HEIGHT }]}
            pointerEvents="none"
          />

          {/* Right Edge Gradient Fade Mask */}
          <LinearGradient
            colors={
              Platform.OS === "ios"
                ? ["rgba(255, 255, 255, 0)", "rgba(255, 255, 255, 0.65)", "rgba(255, 255, 255, 0.95)"]
                : ["rgba(255, 255, 255, 0)", "rgba(255, 255, 255, 0.8)", "rgba(255, 255, 255, 1)"]
            }
            locations={[0, 0.65, 1]}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={[styles.rightEdgeFade, { height: DOCK_HEIGHT }]}
            pointerEvents="none"
          />

          {/* Fixed Static Center Active Indicator (Never scrolls, unaffected by edge fade) */}
          <View style={styles.staticCenterIndicator} pointerEvents="none">
            <View style={styles.activeDot} />
          </View>
        </View>
      </View>
    </View>
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
