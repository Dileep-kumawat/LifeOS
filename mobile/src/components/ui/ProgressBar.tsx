import { View, StyleSheet, ViewStyle } from "react-native";
import { colors } from "../../theme";

interface ProgressBarProps {
  progress: number; // 0 to 100
  height?: number;
  color?: string;
  backgroundColor?: string;
  style?: ViewStyle;
  enableThresholdColors?: boolean; // Changes to amber at 80% and red at 100%+
}

export function ProgressBar({
  progress,
  height = 8,
  color = colors.primary,
  backgroundColor = colors.canvasSoft,
  style,
  enableThresholdColors = false
}: ProgressBarProps) {
  const clamped = Math.max(0, Math.min(100, progress));

  let barColor = color;
  if (enableThresholdColors) {
    if (progress >= 100) {
      barColor = colors.error;
    } else if (progress >= 80) {
      barColor = colors.warning;
    } else {
      barColor = colors.success;
    }
  }

  return (
    <View style={[styles.track, { height, backgroundColor, borderRadius: height / 2 }, style]}>
      <View
        style={[
          styles.fill,
          {
            width: `${clamped}%`,
            backgroundColor: barColor,
            borderRadius: height / 2
          }
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    width: "100%",
    overflow: "hidden"
  },
  fill: {
    height: "100%"
  }
});
