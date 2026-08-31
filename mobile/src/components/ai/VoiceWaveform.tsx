import React from "react";
import { View, StyleSheet, TouchableOpacity } from "react-native";
import { X, Check } from "lucide-react-native";
import { colors, radius } from "../../theme";

export interface VoiceWaveformProps {
  audioLevels: number[];
  onCancel: () => void;
  onConfirm: () => void;
}

export const VoiceWaveform: React.FC<VoiceWaveformProps> = React.memo(
  ({ audioLevels, onCancel, onConfirm }) => {
    return (
      <View style={styles.container} accessibilityRole="toolbar" accessibilityLabel="Voice recording controls">
        {/* Animated Waveform Bars */}
        <View style={styles.waveformContainer}>
          {audioLevels.map((level, idx) => {
            const barHeight = Math.max(4, Math.round(level * 22));
            const isCenter = idx >= 5 && idx <= audioLevels.length - 6;
            const barColor = isCenter ? colors.ink : colors.inkMuted;

            return (
              <View
                key={idx}
                style={[
                  styles.bar,
                  {
                    height: barHeight,
                    backgroundColor: barColor
                  }
                ]}
              />
            );
          })}
        </View>

        {/* Action Controls: Cancel (X) and Finish (Check) */}
        <View style={styles.actionsContainer}>
          {/* Cancel / Discard Button */}
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={onCancel}
            style={styles.cancelButton}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityLabel="Discard recording"
          >
            <X size={18} color={colors.inkMuted} strokeWidth={2.2} />
          </TouchableOpacity>

          {/* Confirm / Finish Button */}
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={onConfirm}
            style={styles.confirmButton}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityLabel="Finish recording and transcribe"
          >
            <Check size={16} color="#FFFFFF" strokeWidth={2.6} />
          </TouchableOpacity>
        </View>
      </View>
    );
  }
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 6,
    height: 44
  },
  waveformContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 3,
    paddingHorizontal: 8,
    height: "100%"
  },
  bar: {
    width: 2.5,
    borderRadius: radius.full
  },
  actionsContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginLeft: 6
  },
  cancelButton: {
    width: 32,
    height: 32,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center"
  },
  confirmButton: {
    width: 32,
    height: 32,
    borderRadius: radius.full,
    backgroundColor: "#0F172A",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    elevation: 2
  }
});
