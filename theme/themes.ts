import { palette } from "./colors";

export interface AppTheme {
  background: string;
  card: string;
  text: string;
  subText: string;
  border: string;
  primary: string;
  onPrimary: string;
  inputBg: string;
  statusBar: "light-content" | "dark-content";
  nav: string;
  charcoal: string;
  success: string;
  warning: string;
  error: string;
  info: string;
}

export const lightTheme: AppTheme = {
  background: palette.grey,
  card: palette.white,
  text: palette.black,
  subText: palette.info,
  border: palette.soft,
  primary: palette.blue,
  onPrimary: palette.white,
  inputBg: palette.grey,
  statusBar: "dark-content",
  nav: palette.white,
  charcoal: palette.navy,
  success: palette.success,
  warning: palette.warning,
  error: palette.error,
  info: palette.info,
};

export const darkTheme: AppTheme = {
  background: "#1C1C1E",
  card: "#2C2C2E",
  text: palette.white,
  subText: palette.soft,
  border: palette.darkBorder,
  primary: palette.blue,
  onPrimary: palette.white,
  inputBg: "#2C2C2E",
  statusBar: "light-content",
  nav: "#1C1C1E",
  charcoal: palette.navy,
  success: palette.success,
  warning: palette.warning,
  error: palette.error,
  info: palette.soft,
};
