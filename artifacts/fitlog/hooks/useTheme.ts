import { useColorScheme } from "react-native";
import Colors from "@/constants/colors";
import { useSettingsStore } from "@/store/settingsStore";

export function useTheme() {
  const systemScheme = useColorScheme();
  const { darkMode } = useSettingsStore();
  
  const isDark = darkMode !== null ? darkMode : systemScheme === "dark";
  const theme = isDark ? Colors.dark : Colors.light;
  
  return { theme, isDark };
}
