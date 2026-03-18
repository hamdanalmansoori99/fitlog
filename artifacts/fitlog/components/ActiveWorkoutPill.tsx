import React, { useEffect, useRef } from "react";
import { Pressable, Text } from "react-native";
import Animated, { useSharedValue, useAnimatedStyle, withSpring, withRepeat, withSequence, withTiming, Easing } from "react-native-reanimated";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import { useTranslation } from "react-i18next";
import { useTheme } from "@/hooks/useTheme";
import { useWorkoutStore } from "@/store/workoutStore";

export function ActiveWorkoutPill() {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const { activeWorkoutTemplateId, activeWorkoutTemplateName } = useWorkoutStore();
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(20);
  const pulseScale = useSharedValue(1);

  useEffect(() => {
    if (activeWorkoutTemplateId) {
      opacity.value = withSpring(1, { damping: 16, stiffness: 200 });
      translateY.value = withSpring(0, { damping: 16, stiffness: 200 });
      pulseScale.value = withRepeat(
        withSequence(
          withTiming(1.06, { duration: 700, easing: Easing.inOut(Easing.ease) }),
          withTiming(1.0, { duration: 700, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        false
      );
    } else {
      opacity.value = withTiming(0, { duration: 200 });
      translateY.value = withTiming(20, { duration: 200 });
    }
  }, [activeWorkoutTemplateId]);

  const containerStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }, { scale: pulseScale.value }],
  }));

  if (!activeWorkoutTemplateId) return null;

  return (
    <Animated.View
      style={[
        {
          position: "absolute",
          bottom: 90,
          alignSelf: "center",
          zIndex: 100,
          shadowColor: "#00e676",
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.35,
          shadowRadius: 12,
          elevation: 10,
        },
        containerStyle,
      ]}
      pointerEvents="box-none"
    >
      <Pressable
        onPress={() =>
          router.push({
            pathname: "/workouts/execute" as any,
            params: { id: activeWorkoutTemplateId },
          })
        }
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 8,
          backgroundColor: theme.primary,
          paddingHorizontal: 18,
          paddingVertical: 11,
          borderRadius: 30,
        }}
      >
        <Feather name="activity" size={15} color="#0f0f1a" />
        <Text
          style={{
            color: "#0f0f1a",
            fontFamily: "Inter_700Bold",
            fontSize: 13,
          }}
          numberOfLines={1}
        >
          {t("workouts.activePill", { name: activeWorkoutTemplateName ?? "" })}
        </Text>
        <Feather name="chevron-right" size={14} color="#0f0f1a" />
      </Pressable>
    </Animated.View>
  );
}
