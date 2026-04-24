export type RiskLevel = 'High' | 'Medium' | 'Low' | 'Normal';
export type CaseStatus = 'Open' | 'In Progress' | 'Closed' | 'Rejected';

export interface Consumer {
  id: string;
  name: string;
  meterNumber: string;
  location: string;
  riskScore: number;
  riskLevel: RiskLevel;
  consumption: number;
  anomaly: number;
  address: string;
  phone: string;
  lastReading: string;
  status: 'Active' | 'Inactive';
  consumptionHistory: { date: string; value: number }[];
  theftFlags: { type: string; date: string; severity: 'High' | 'Medium' | 'Low' }[];
}

export interface Case {
  id: string;
  caseNumber: string;
  consumerId: string;
  consumerName: string;
  meterNumber: string;
  status: CaseStatus;
  riskLevel: RiskLevel;
  description: string;
  area: string;
  createdAt: string;
  inspector?: string;
  evidences: number;
  timeline: { action: string; date: string; time: string }[];
  evidenceImages: { name: string; uploadedBy: string; date: string }[];
}

export interface Notification {
  id: string;
  type: 'case_filed' | 'theft_detected' | 'case_resolved' | 'report_filed';
  message: string;
  consumer: string;
  timestamp: string;
  read: boolean;
}

export interface Inspector {
  id: string;
  name: string;
  area: string;
  available: boolean;
}
