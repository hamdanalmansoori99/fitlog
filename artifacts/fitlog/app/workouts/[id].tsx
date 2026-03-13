import { router } from "expo-router";
import { View } from "react-native";
import { useEffect } from "react";
export default function WorkoutDetail() {
  useEffect(() => { router.back(); }, []);
  return <View />;
}
