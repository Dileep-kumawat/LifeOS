import React, { useEffect, useRef, useCallback, useState, useMemo } from "react";
import {
  View,
  StyleSheet,
  useWindowDimensions,
  Keyboard,
  Platform
} from "react-native";
import { GestureDetector, Gesture } from "react-native-gesture-handler";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  runOnJS
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import {
  createNavigatorFactory,
  TabRouter,
  useNavigationBuilder,
  TabRouterOptions,
  TabActionHelpers,
  TabNavigationState,
  ParamListBase,
  NavigatorTypeBagBase,
  StaticConfig,
  TypedNavigator
} from "@react-navigation/native";
import type {
  BottomTabNavigationOptions,
  BottomTabNavigationEventMap,
  BottomTabNavigationProp,
  BottomTabNavigatorProps,
  BottomTabBarProps
} from "@react-navigation/bottom-tabs";
import { Header, getHeaderTitle } from "@react-navigation/elements";

import { FloatingDock, ITEM_WIDTH } from "./FloatingDock";
import { colors } from "../theme";

const AnimatedView = Animated.View as React.ComponentType<any>;

export interface ActivityPagerProps {
  state: BottomTabBarProps["state"];
  descriptors: BottomTabBarProps["descriptors"];
  navigation: BottomTabBarProps["navigation"];
  scrollX: Animated.SharedValue<number>;
  isContentSwiping: Animated.SharedValue<boolean>;
  isKeyboardVisible?: boolean;
}

/**
 * Swipeable Activity Pager:
 * Provides horizontal pan gestures across the screen content area to switch tabs,
 * in 2-way lock-step sync with FloatingDock via the shared `scrollX` Reanimated value.
 */
export function ActivityPager({
  state,
  descriptors,
  navigation,
  scrollX,
  isContentSwiping,
  isKeyboardVisible = false
}: ActivityPagerProps) {
  const { width: screenWidth } = useWindowDimensions();
  const lastSettledIndexRef = useRef<number>(state.index);
  const startScrollX = useSharedValue(state.index * ITEM_WIDTH);

  // Lazy windowing: keep visited screens, and preload current - 1, current, current + 1
  const [loadedIndices, setLoadedIndices] = useState<Set<number>>(() => {
    const initial = new Set<number>([state.index]);
    if (state.index > 0) initial.add(state.index - 1);
    if (state.index < state.routes.length - 1) initial.add(state.index + 1);
    return initial;
  });

  useEffect(() => {
    setLoadedIndices((prev) => {
      const next = new Set(prev);
      next.add(state.index);
      if (state.index > 0) next.add(state.index - 1);
      if (state.index < state.routes.length - 1) next.add(state.index + 1);
      return next;
    });
  }, [state.index, state.routes.length]);

  // Handle external navigation (e.g. dock taps, deep link, button calls)
  useEffect(() => {
    lastSettledIndexRef.current = state.index;
    if (!isContentSwiping.value) {
      const targetScrollX = state.index * ITEM_WIDTH;
      const diff = Math.abs(scrollX.value - targetScrollX);

      if (diff > ITEM_WIDTH * 1.5) {
        // Multi-tab jump (e.g. Tab 0 -> Tab 5): jump immediately to prevent intermediate screen flicker
        scrollX.value = targetScrollX;
      } else if (diff > 0.5) {
        // Adjacent tab: spring smoothly
        scrollX.value = withSpring(targetScrollX, {
          damping: 24,
          stiffness: 220,
          mass: 0.8
        });
      }
    }
  }, [state.index, isContentSwiping, scrollX]);

  // Settle callback invoked on the JS thread after content swipe spring completes
  const onSettleOnJS = useCallback(
    (targetIndex: number) => {
      isContentSwiping.value = false;
      const clampedIndex = Math.max(0, Math.min(state.routes.length - 1, targetIndex));

      if (clampedIndex !== lastSettledIndexRef.current) {
        lastSettledIndexRef.current = clampedIndex;

        try {
          Haptics.selectionAsync();
        } catch {
          // Haptics fallback on unsupported platforms
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
    [state.routes, navigation, isContentSwiping]
  );

  // Pan gesture for horizontal screen content swiping
  const panGesture = useMemo(() => {
    return Gesture.Pan()
      .enabled(!isKeyboardVisible)
      .activeOffsetX([-15, 15])
      .failOffsetY([-15, 15])
      .onStart(() => {
        isContentSwiping.value = true;
        startScrollX.value = scrollX.value;
      })
      .onUpdate((e) => {
        const deltaX = e.translationX;
        // deltaX < 0 (swipe left) moves to next tab, increasing scrollX
        const dockDelta = -(deltaX / screenWidth) * ITEM_WIDTH;
        let newScrollX = startScrollX.value + dockDelta;

        const maxScrollX = (state.routes.length - 1) * ITEM_WIDTH;

        // Rubber-band resistance at edges (tabs 0 and N - 1)
        if (newScrollX < 0) {
          newScrollX = newScrollX * 0.25;
        } else if (newScrollX > maxScrollX) {
          const over = newScrollX - maxScrollX;
          newScrollX = maxScrollX + over * 0.25;
        }

        scrollX.value = newScrollX;
      })
      .onEnd((e) => {
        const maxIndex = state.routes.length - 1;
        const basePage = Math.round(startScrollX.value / ITEM_WIDTH);

        let targetIndex = basePage;
        const threshold = 50; // px
        const velocityThreshold = 500; // px/s

        if (e.translationX < -threshold || e.velocityX < -velocityThreshold) {
          targetIndex = basePage + 1;
        } else if (e.translationX > threshold || e.velocityX > velocityThreshold) {
          targetIndex = basePage - 1;
        }

        targetIndex = Math.max(0, Math.min(maxIndex, targetIndex));
        const targetScrollX = targetIndex * ITEM_WIDTH;

        scrollX.value = withSpring(
          targetScrollX,
          {
            damping: 24,
            stiffness: 220,
            mass: 0.8
          },
          (finished) => {
            if (finished) {
              runOnJS(onSettleOnJS)(targetIndex);
            }
          }
        );
      });
  }, [
    isKeyboardVisible,
    screenWidth,
    state.routes.length,
    isContentSwiping,
    startScrollX,
    scrollX,
    onSettleOnJS
  ]);

  const animatedPagesStyle = useAnimatedStyle(() => {
    const translateX = -(scrollX.value / ITEM_WIDTH) * screenWidth;
    return {
      transform: [{ translateX }]
    };
  });

  return (
    <GestureDetector gesture={panGesture}>
      <View style={styles.pagerContainer}>
        <AnimatedView
          style={[
            styles.pagesStrip,
            { width: screenWidth * state.routes.length },
            animatedPagesStyle
          ]}
        >
          {state.routes.map((route, index) => {
            const isLoaded = loadedIndices.has(index);
            const isCurrent = state.index === index;
            const descriptor = descriptors[route.key];

            return (
              <View
                key={route.key}
                style={[
                  styles.pageSlot,
                  {
                    width: screenWidth,
                    left: index * screenWidth
                  }
                ]}
                pointerEvents={isCurrent ? "auto" : "none"}
              >
                {isLoaded && descriptor ? descriptor.render() : null}
              </View>
            );
          })}
        </AnimatedView>
      </View>
    </GestureDetector>
  );
}

/**
 * ActivityTabNavigator:
 * Custom Tab Navigator wiring ActivityPager + FloatingDock with React Navigation's TabRouter.
 */
function ActivityTabNavigator({
  id,
  initialRouteName,
  backBehavior,
  UNSTABLE_routeNamesChangeBehavior,
  children,
  layout,
  screenListeners,
  screenOptions,
  screenLayout,
  UNSTABLE_router,
  tabBar
}: BottomTabNavigatorProps) {
  const { state, descriptors, navigation, NavigationContent } = useNavigationBuilder<
    TabNavigationState<ParamListBase>,
    TabRouterOptions,
    TabActionHelpers<ParamListBase>,
    BottomTabNavigationOptions,
    BottomTabNavigationEventMap
  >(TabRouter, {
    id,
    initialRouteName,
    backBehavior,
    UNSTABLE_routeNamesChangeBehavior,
    children,
    layout,
    screenListeners,
    screenOptions,
    screenLayout,
    UNSTABLE_router
  });

  const scrollX = useSharedValue(state.index * ITEM_WIDTH);
  const isContentSwiping = useSharedValue(false);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);

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

  const activeRoute = state.routes[state.index];
  const activeDescriptor = descriptors[activeRoute?.key];
  const activeOptions = activeDescriptor?.options;
  const isHeaderShown = activeOptions?.headerShown !== false;

  const defaultInsets = { top: 0, right: 0, bottom: 0, left: 0 };

  return (
    <NavigationContent>
      <View style={styles.rootContainer}>
        {isHeaderShown && (
          <Header
            {...activeOptions}
            title={getHeaderTitle(activeOptions || {}, activeRoute?.name || "")}
          />
        )}
        <ActivityPager
          state={state}
          descriptors={descriptors}
          navigation={navigation}
          scrollX={scrollX}
          isContentSwiping={isContentSwiping}
          isKeyboardVisible={isKeyboardVisible}
        />
        {tabBar ? (
          tabBar({
            state,
            descriptors,
            navigation,
            insets: defaultInsets,
            sharedScrollX: scrollX,
            isContentSwiping
          } as any)
        ) : (
          <FloatingDock
            state={state}
            descriptors={descriptors}
            navigation={navigation}
            insets={defaultInsets}
            sharedScrollX={scrollX}
            isContentSwiping={isContentSwiping}
          />
        )}
      </View>
    </NavigationContent>
  );
}

export type ActivityTabTypeBag<
  ParamList extends ParamListBase = ParamListBase,
  NavigatorID extends string | undefined = string | undefined
> = {
  ParamList: ParamList;
  NavigatorID: NavigatorID;
  State: TabNavigationState<ParamList>;
  ScreenOptions: BottomTabNavigationOptions;
  EventMap: BottomTabNavigationEventMap;
  NavigationList: {
    [RouteName in keyof ParamList]: BottomTabNavigationProp<ParamList, RouteName, NavigatorID>;
  };
  Navigator: typeof ActivityTabNavigator;
};

export function createActivityTabNavigator<
  const ParamList extends ParamListBase = ParamListBase,
  const NavigatorID extends string | undefined = string | undefined,
  const TypeBag extends NavigatorTypeBagBase = ActivityTabTypeBag<ParamList, NavigatorID>,
  const Config extends StaticConfig<TypeBag> = StaticConfig<TypeBag>
>(config?: Config): TypedNavigator<TypeBag, Config> {
  return createNavigatorFactory(ActivityTabNavigator)(config);
}

const styles = StyleSheet.create({
  rootContainer: {
    flex: 1,
    backgroundColor: colors.canvasSoft
  },
  pagerContainer: {
    flex: 1,
    overflow: "hidden"
  },
  pagesStrip: {
    flex: 1,
    flexDirection: "row"
  },
  pageSlot: {
    position: "absolute",
    top: 0,
    bottom: 0
  }
});
