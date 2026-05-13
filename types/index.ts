// ── Shared risk level used across admin + consumer ────────────────────────────
export type RiskLevel  = 'High' | 'Medium' | 'Low' | 'Normal';

// ── Admin-side case status (what admin sees/updates) ─────────────────────────
export type CaseStatus = 'Open' | 'In Progress' | 'Closed' | 'Rejected';

// ── Consumer-side case status (what ReportScreen writes) ─────────────────────
export type SubmittedCaseStatus =
  | 'Under Investigation'
  | 'In Progress'
  | 'Escalated'
  | 'Resolved';

// ── Consumer profile (Admin dashboard view) ───────────────────────────────────
export interface Consumer {
  id:                 string;
  name:               string;
  meterNumber:        string;
  location:           string;
  riskScore:          number;
  riskLevel:          RiskLevel;
  consumption:        number;
  anomaly:            number;
  address:            string;
  phone:              string;
  lastReading:        string;
  status:             'Active' | 'Inactive';
  consumptionHistory: { date: string; value: number }[];
  theftFlags:         { type: string; date: string; severity: 'High' | 'Medium' | 'Low' }[];
}

// ── Case (Admin dashboard view — read/update by admin) ───────────────────────
export interface Case {
  id:             string;
  caseNumber:     string;
  consumerId:     string;
  consumerName:   string;
  meterNumber:    string;
  status:         CaseStatus;
  priority?:      string;
  category?:      string;
  riskLevel:      RiskLevel;
  description:    string;
  area:           string;
  createdAt:      string;
  inspector?:     string;
  evidences:      number;
  timeline:       { action: string; date: string; time: string }[];
  evidenceImages: { name: string; uploadedBy: string; date: string }[];
}

// ── SubmittedCase (what ReportScreen writes to /cases collection) ─────────────
// Admin reads this too, but this is the exact Firestore document shape
export interface SubmittedCase {
  caseId:            string;           // e.g. "RPT-4821"
  consumerId:        string;           // consumer's consumerId (not uid)
  consumerName:      string;
  consumerEmail:     string;
  issueType:         string;
  issueValue:        string;
  description:       string;
  location:          string;           // plain text meter location
  riskLevel:         'Low' | 'Medium' | 'High';
  currentStatus:     SubmittedCaseStatus;
  assignedInspector: string;
  escalated:         boolean;
  imageUrl:          string;
  resolution:        string;
  createdAt:         Date;
}

// ── Notification ──────────────────────────────────────────────────────────────
export interface Notification {
  id:        string;
  type:      'case_filed' | 'theft_detected' | 'case_resolved' | 'report_filed';
  message:   string;
  consumer:  string;
  timestamp: string;
  read:      boolean;
}

// ── Inspector ─────────────────────────────────────────────────────────────────
export interface Inspector {
  id:        string;
  name:      string;
  area:      string;
  available: boolean;
}