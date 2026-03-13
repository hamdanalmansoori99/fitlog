import React, { useEffect, useRef } from "react";
import { View, Text, StyleSheet, Animated } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useTheme } from "@/hooks/useTheme";

interface SuccessViewProps {
  title?: string;
  subtitle?: string;
}

export function SuccessView({
  title = "Done!",
  subtitle,
}: SuccessViewProps) {
  const { theme } = useTheme();
  const scale = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const ringScale = useRef(new Animated.Value(0.6)).current;
  const ringOpacity = useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.delay(60),
      Animated.parallel([
        Animated.spring(scale, {
          toValue: 1,
          friction: 5,
          tension: 120,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]),
    ]).start();

    Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(ringScale, { toValue: 1.5, duration: 900, useNativeDriver: true }),
          Animated.timing(ringOpacity, { toValue: 0, duration: 900, useNativeDriver: true }),
        ]),
        Animated.parallel([
          Animated.timing(ringScale, { toValue: 0.6, duration: 0, useNativeDriver: true }),
          Animated.timing(ringOpacity, { toValue: 0.8, duration: 0, useNativeDriver: true }),
        ]),
        Animated.delay(600),
      ])
    ).start();
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.circleWrap}>
        <Animated.View
          style={[
            styles.ring,
            { borderColor: theme.primary, transform: [{ scale: ringScale }], opacity: ringOpacity },
          ]}
        />
        <Animated.View
          style={[
            styles.circle,
            { backgroundColor: theme.primaryDim, borderColor: theme.primary, transform: [{ scale }], opacity },
          ]}
        >
          <Feather name="check" size={44} color={theme.primary} />
        </Animated.View>
      </View>

      <Animated.Text
        style={[styles.title, { color: theme.text, fontFamily: "Inter_700Bold", opacity }]}
      >
        {title}
      </Animated.Text>

      {subtitle ? (
        <Animated.Text
          style={[styles.subtitle, { color: theme.textMuted, fontFamily: "Inter_400Regular", opacity }]}
        >
          {subtitle}
        </Animated.Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 16,
    paddingHorizontal: 40,
  },
  circleWrap: {
    width: 110,
    height: 110,
    alignItems: "center",
    justifyContent: "center",
  },
  ring: {
    position: "absolute",
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 2,
  },
  circle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 26,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 15,
    textAlign: "center",
    lineHeight: 22,
  },
});
