import { palette } from "../theme";

export const Colors = {
  primary: palette.blue,
  onPrimary: palette.white,
  danger: palette.error,
  warning: palette.warning,
  success: palette.success,
  purple: "#AF52DE",
  teal: "#32ADE6",
  info: palette.info,
  bg: palette.grey,
  white: palette.white,
  card: palette.white,
  text: palette.black,
  textSecondary: palette.info,
  border: palette.soft,
  highRisk: palette.error,
  mediumRisk: palette.warning,
  lowRisk: palette.blue,
  normal: palette.success,
  nav: palette.navy,
};

export const getRiskColor = (level: string) => {
  switch (level) {
    case "High":
      return Colors.highRisk;
    case "Medium":
      return Colors.warning;
    case "Low":
      return Colors.lowRisk;
    default:
      return Colors.normal;
  }
};

export const getCaseStatusColor = (status: string) => {
  switch (status) {
    case "Open":
      return Colors.warning;
    case "In Progress":
      return Colors.primary;
    case "Closed":
      return Colors.success;
    case "Rejected":
      return Colors.danger;
    default:
      return Colors.textSecondary;
  }
};
