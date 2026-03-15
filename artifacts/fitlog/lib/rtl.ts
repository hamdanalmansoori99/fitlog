import { I18nManager } from "react-native";

type DirectionalIcon = "chevron-right" | "chevron-left" | "arrow-right" | "arrow-left";

const RTL_FLIP_MAP: Record<DirectionalIcon, DirectionalIcon> = {
  "chevron-right": "chevron-left",
  "chevron-left": "chevron-right",
  "arrow-right": "arrow-left",
  "arrow-left": "arrow-right",
};

export function rtlIcon(icon: DirectionalIcon): DirectionalIcon {
  if (I18nManager.isRTL && icon in RTL_FLIP_MAP) {
    return RTL_FLIP_MAP[icon];
  }
  return icon;
}
