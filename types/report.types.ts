// Re-export from index for convenience, and add report-screen-specific types

export type UrgencyLevel = 'Low' | 'Medium' | 'High';

// Issue type document from /issueTypes collection
export interface IssueType {
  id:    string;
  label: string;
  value: string;
}

// Shape used inside ReportScreen's local state for displaying previous reports
export interface ReportDisplayItem {
  id:            string;
  referenceId:   string;   // caseId
  issueType:     string;
  description:   string;
  meterLocation: string;   // maps to Firestore "location"
  urgencyLevel:  UrgencyLevel;
  status:        string;
  resolution:    string;
  createdAt:     Date;
  imageUrl:      string;
}