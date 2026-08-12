import fs from 'fs';
import path from 'path';

export type OnboardingStatusType = 
  | 'NOT_STARTED' 
  | 'DETAILS_PENDING' 
  | 'DOCUMENTS_GENERATED' 
  | 'AWAITING_APPROVAL' 
  | 'DOCUMENTS_SENT' 
  | 'ONBOARDING_COMPLETED' 
  | 'AUTHORIZATION_REVOKED';

export interface OnboardingDocumentRecord {
  id: string;
  applicationId: string;
  docType: 'OFFER_LETTER' | 'AUTHORIZATION_LETTER' | 'COMMISSION_POLICY' | 'PRICE_CATALOGUE' | 'SALES_GUIDELINES' | 'CODE_OF_CONDUCT' | 'COMPLETE_ONBOARDING_PACK';
  documentNo: string;
  title: string;
  version: number;
  status: 'DRAFT' | 'APPROVED' | 'SENT';
  validFrom?: string;
  validUntil?: string;
  contentSnapshot: string;
  createdBy: string;
  approvedBy?: string;
  approvedAt?: string;
  sentAt?: string;
  createdAt: string;
  updatedAt: string;
}

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
  status: 'APPLIED' | 'REVIEWED' | 'INTERVIEW_SCHEDULED' | 'SELECTED' | 'HIRED' | 'REJECTED' | 'EXITED';
  rating: number;
  interviewDate?: string;
  interviewTime?: string;
  interviewLocation?: string;
  interviewLink?: string;
  whatsAppStatus: 'NOT_SENT' | 'SENT' | 'FAILED';

  // Onboarding & Field Authorization Fields
  onboardingStatus?: OnboardingStatusType;
  joiningDate?: string;
  workingTerritory?: string;
  commissionRate?: string;
  commissionMin?: number;
  commissionMax?: number;
  payoutFrequency?: string;
  reportingManager?: string;
  engagementType?: string;
  additionalTerms?: string;
  authValidFrom?: string;
  authValidUntil?: string;
  isAuthActive?: boolean;

  onboardingDocuments?: OnboardingDocumentRecord[];
  notes: { id: string; author: string; content: string; createdAt: string }[];
  createdAt: string;
  updatedAt: string;
}

// Disk locations: local project dir and Vercel serverless writable /tmp
const TMP_DB_PATH = path.join('/tmp', 'kamadhenu_applications.json');
const LOCAL_DB_PATH = path.join(process.cwd(), 'prisma', 'persistent_applications.json');

// Global memory cache to retain state across lambda re-use and hot reloads
const globalStore = globalThis as unknown as {
  __kamadhenu_apps__?: ApplicationRecord[];
};

function loadApplicationsFromDisk(): ApplicationRecord[] {
  if (globalStore.__kamadhenu_apps__ && globalStore.__kamadhenu_apps__.length > 0) {
    return globalStore.__kamadhenu_apps__;
  }

  const pathsToTry = [TMP_DB_PATH, LOCAL_DB_PATH];

  for (const filePath of pathsToTry) {
    try {
      if (fs.existsSync(filePath)) {
        const raw = fs.readFileSync(filePath, 'utf8');
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          globalStore.__kamadhenu_apps__ = parsed;
          return parsed;
        }
      }
    } catch (e) {
      // Continue checking next path
    }
  }

  if (!globalStore.__kamadhenu_apps__) {
    globalStore.__kamadhenu_apps__ = [];
  }
  return globalStore.__kamadhenu_apps__;
}

function saveApplicationsToDisk(apps: ApplicationRecord[]): void {
  globalStore.__kamadhenu_apps__ = apps;

  const pathsToSave = [TMP_DB_PATH, LOCAL_DB_PATH];

  for (const filePath of pathsToSave) {
    try {
      const dir = path.dirname(filePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(filePath, JSON.stringify(apps, null, 2), 'utf8');
    } catch (e) {
      // Catch read-only filesystem error on Vercel lambda gracefully
    }
  }
}

export function getApplicationsStore(): ApplicationRecord[] {
  return loadApplicationsFromDisk();
}

export function addApplicationStore(
  appData: Omit<ApplicationRecord, 'id' | 'applicationNo' | 'status' | 'rating' | 'whatsAppStatus' | 'notes' | 'createdAt' | 'updatedAt'>
): ApplicationRecord {
  const currentApps = loadApplicationsFromDisk();
  const count = currentApps.length + 1;
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

  const updatedList = [newApp, ...currentApps];
  saveApplicationsToDisk(updatedList);
  return newApp;
}

export function updateApplicationStatusStore(
  id: string, 
  status: ApplicationRecord['status'],
  interviewDetails?: { date?: string; time?: string; location?: string; link?: string }
): ApplicationRecord | null {
  const currentApps = loadApplicationsFromDisk();
  const idx = currentApps.findIndex((a) => a.id === id);
  if (idx === -1) return null;

  currentApps[idx].status = status;
  currentApps[idx].updatedAt = new Date().toISOString();

  if (interviewDetails) {
    if (interviewDetails.date) currentApps[idx].interviewDate = interviewDetails.date;
    if (interviewDetails.time) currentApps[idx].interviewTime = interviewDetails.time;
    if (interviewDetails.location) currentApps[idx].interviewLocation = interviewDetails.location;
    if (interviewDetails.link) currentApps[idx].interviewLink = interviewDetails.link;
  }

  saveApplicationsToDisk(currentApps);
  return currentApps[idx];
}

export function updateApplicationWhatsAppStatusStore(id: string, whatsAppStatus: ApplicationRecord['whatsAppStatus']): ApplicationRecord | null {
  const currentApps = loadApplicationsFromDisk();
  const idx = currentApps.findIndex((a) => a.id === id);
  if (idx === -1) return null;

  currentApps[idx].whatsAppStatus = whatsAppStatus;
  currentApps[idx].updatedAt = new Date().toISOString();
  saveApplicationsToDisk(currentApps);
  return currentApps[idx];
}

export function addApplicationNoteStore(id: string, author: string, content: string): ApplicationRecord | null {
  const currentApps = loadApplicationsFromDisk();
  const idx = currentApps.findIndex((a) => a.id === id);
  if (idx === -1) return null;

  const noteObj = {
    id: `note_${Date.now()}`,
    author,
    content,
    createdAt: new Date().toISOString(),
  };

  currentApps[idx].notes.push(noteObj);
  currentApps[idx].updatedAt = new Date().toISOString();
  saveApplicationsToDisk(currentApps);
  return currentApps[idx];
}

export function findDuplicateApplication(mobileNumber: string, email: string): boolean {
  const currentApps = loadApplicationsFromDisk();
  return currentApps.some(
    (a) => a.mobileNumber === mobileNumber || a.email.toLowerCase() === email.toLowerCase()
  );
}
