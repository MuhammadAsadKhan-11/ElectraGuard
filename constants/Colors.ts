export const Colors = {
  primary: '#007AFF',
  danger: '#FF3B30',
  warning: '#FF9500',
  success: '#34C759',
  purple: '#AF52DE',
  teal: '#32ADE6',
  bg: '#F2F2F7',
  white: '#FFFFFF',
  card: '#FFFFFF',
  text: '#1C1C1E',
  textSecondary: '#8E8E93',
  border: '#E5E5EA',
  highRisk: '#FF3B30',
  mediumRisk: '#FF9500',
  lowRisk: '#007AFF',
  normal: '#34C759',
};

export const getRiskColor = (level: string) => {
  switch (level) {
    case 'High': return Colors.highRisk;
    case 'Medium': return Colors.warning;
    case 'Low': return Colors.lowRisk;
    default: return Colors.normal;
  }
};

export const getCaseStatusColor = (status: string) => {
  switch (status) {
    case 'Open': return Colors.warning;
    case 'In Progress': return Colors.primary;
    case 'Closed': return Colors.success;
    case 'Rejected': return Colors.danger;
    default: return Colors.textSecondary;
  }
};
