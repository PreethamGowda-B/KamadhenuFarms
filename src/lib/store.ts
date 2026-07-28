import fs from 'fs';
import path from 'path';

export interface ApplicationRecord {
  id: string;
  applicationNo: string;
  fullName: string;
  mobileNumber: string;
  whatsAppNumber: string;
  email: string;
  gender: string;
  age: number;
  city: string;
  state: string;
  pinCode: string;
  hasBike: boolean;
  hasDrivingLicense: boolean;
  salesExperience: string;
  currentOccupation: string;
  languagesKnown: string[];
  preferredSalesArea: string;
  resumeUrl?: string;
  aadhaarUrl?: string;
  profilePhotoUrl?: string;
  whyJoin: string;
  declarationAccepted: boolean;
  status: 'APPLIED' | 'REVIEWED' | 'INTERVIEW_SCHEDULED' | 'SELECTED' | 'REJECTED';
  rating: number;
  interviewDate?: string;
  interviewTime?: string;
  interviewLocation?: string;
  interviewLink?: string;
  whatsAppStatus: 'NOT_SENT' | 'SENT' | 'FAILED';
  notes: { id: string; author: string; content: string; createdAt: string }[];
  createdAt: string;
  updatedAt: string;
}

// Persistent DB File Path for reliable environment persistence
const DB_FILE_PATH = path.join(process.cwd(), 'prisma', 'persistent_applications.json');

function loadApplicationsFromDisk(): ApplicationRecord[] {
  try {
    if (fs.existsSync(DB_FILE_PATH)) {
      const raw = fs.readFileSync(DB_FILE_PATH, 'utf8');
      return JSON.parse(raw);
    }
  } catch (e) {
    console.error('Failed to read database file:', e);
  }
  return [];
}

function saveApplicationsToDisk(apps: ApplicationRecord[]): void {
  try {
    const dir = path.dirname(DB_FILE_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(DB_FILE_PATH, JSON.stringify(apps, null, 2), 'utf8');
  } catch (e) {
    console.error('Failed to save to database file:', e);
  }
}

// Clean in-memory DB initialized directly from disk storage (ZERO mock/dummy data)
let dbApplications: ApplicationRecord[] = loadApplicationsFromDisk();

export function getApplicationsStore(): ApplicationRecord[] {
  dbApplications = loadApplicationsFromDisk();
  return dbApplications;
}

export function addApplicationStore(
  appData: Omit<ApplicationRecord, 'id' | 'applicationNo' | 'status' | 'rating' | 'whatsAppStatus' | 'notes' | 'createdAt' | 'updatedAt'>
): ApplicationRecord {
  dbApplications = loadApplicationsFromDisk();
  const count = dbApplications.length + 1;
  const numStr = String(count).padStart(3, '0');
  const applicationNo = `KHF-2026-${numStr}`;
  const id = `app_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  
  const newApp: ApplicationRecord = {
    ...appData,
    id,
    applicationNo,
    status: 'APPLIED',
    rating: 0,
    whatsAppStatus: 'NOT_SENT',
    notes: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  dbApplications.unshift(newApp);
  saveApplicationsToDisk(dbApplications);
  return newApp;
}

export function updateApplicationStatusStore(
  id: string, 
  status: ApplicationRecord['status'],
  interviewDetails?: { date?: string; time?: string; location?: string; link?: string }
): ApplicationRecord | null {
  dbApplications = loadApplicationsFromDisk();
  const idx = dbApplications.findIndex((a) => a.id === id);
  if (idx === -1) return null;

  dbApplications[idx].status = status;
  dbApplications[idx].updatedAt = new Date().toISOString();

  if (interviewDetails) {
    if (interviewDetails.date) dbApplications[idx].interviewDate = interviewDetails.date;
    if (interviewDetails.time) dbApplications[idx].interviewTime = interviewDetails.time;
    if (interviewDetails.location) dbApplications[idx].interviewLocation = interviewDetails.location;
    if (interviewDetails.link) dbApplications[idx].interviewLink = interviewDetails.link;
  }

  saveApplicationsToDisk(dbApplications);
  return dbApplications[idx];
}

export function updateApplicationWhatsAppStatusStore(id: string, whatsAppStatus: ApplicationRecord['whatsAppStatus']): ApplicationRecord | null {
  dbApplications = loadApplicationsFromDisk();
  const idx = dbApplications.findIndex((a) => a.id === id);
  if (idx === -1) return null;

  dbApplications[idx].whatsAppStatus = whatsAppStatus;
  dbApplications[idx].updatedAt = new Date().toISOString();
  saveApplicationsToDisk(dbApplications);
  return dbApplications[idx];
}

export function addApplicationNoteStore(id: string, author: string, content: string): ApplicationRecord | null {
  dbApplications = loadApplicationsFromDisk();
  const idx = dbApplications.findIndex((a) => a.id === id);
  if (idx === -1) return null;

  const noteObj = {
    id: `note_${Date.now()}`,
    author,
    content,
    createdAt: new Date().toISOString(),
  };

  dbApplications[idx].notes.push(noteObj);
  dbApplications[idx].updatedAt = new Date().toISOString();
  saveApplicationsToDisk(dbApplications);
  return dbApplications[idx];
}

export function findDuplicateApplication(mobileNumber: string, email: string): boolean {
  dbApplications = loadApplicationsFromDisk();
  return dbApplications.some(
    (a) => a.mobileNumber === mobileNumber || a.email.toLowerCase() === email.toLowerCase()
  );
}
