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

export type ShopStatusType = 
  | 'ACTIVE' 
  | 'FOLLOW_UP_DUE' 
  | 'ORDER_CONFIRMED' 
  | 'WAITING_FOR_RESPONSE' 
  | 'INACTIVE' 
  | 'CLOSED';

export type FollowUpResultType = 
  | 'NEEDS_STOCK' 
  | 'ORDER_CONFIRMED' 
  | 'DOESNT_NEED_STOCK_NOW' 
  | 'CALL_LATER' 
  | 'NO_RESPONSE' 
  | 'NOT_INTERESTED' 
  | 'SHOP_CLOSED' 
  | 'OTHER';

export interface ShopOrderRecord {
  id: string;
  shopId: string;
  orderNo: string;
  orderDate: string;
  product: string;
  quantity: number;
  kg: number;
  orderValue: number;
  paymentStatus: string;
  deliveryStatus: string;
  salesExecutive?: string;
  notes?: string;
  createdAt: string;
}

export interface ShopFollowUpRecord {
  id: string;
  shopId: string;
  author: string;
  date: string;
  type: string;
  result: FollowUpResultType;
  notes?: string;
  nextFollowUpDate?: string;
  createdAt: string;
}

export interface ShopRecord {
  id: string;
  shopNo: string;
  shopName: string;
  contactPerson: string;
  contactNumber: string;
  email?: string;
  address: string;
  area: string;
  city: string;
  state: string;
  pinCode: string;
  assignedSalesExecutiveId?: string;
  assignedSalesExecutiveName?: string;
  status: ShopStatusType;
  reorderIntervalDays: number;
  nextFollowUpDate?: string;
  firstOrderDate?: string;
  lastOrderDate?: string;
  lastOrderQuantity?: number;
  totalOrders: number;
  totalKgPurchased: number;
  totalPurchaseValue: number;
  notes?: string;
  orders?: ShopOrderRecord[];
  followUps?: ShopFollowUpRecord[];
  createdAt: string;
  updatedAt: string;
}

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
  sentTo?: string;
  sentBy?: string;
  sentStatus?: 'NOT_SENT' | 'SENT' | 'FAILED';
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

  hiringEmailStatus?: 'NOT_SENT' | 'SENT' | 'FAILED';
  hiringEmailSentAt?: string;

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

const INITIAL_SEED_APPLICATIONS: ApplicationRecord[] = [
  {
    id: 'app_seed_001',
    applicationNo: 'KHF-2026-001',
    fullName: 'Ramesh Kumar',
    mobileNumber: '9980114675',
    whatsAppNumber: '9980114675',
    email: 'ramesh.kumar@example.com',
    gender: 'Male',
    age: 28,
    city: 'Bangalore',
    state: 'Karnataka',
    pinCode: '560060',
    hasBike: true,
    hasDrivingLicense: true,
    salesExperience: '2-3 years in FMCG / Grocery distribution',
    currentOccupation: 'Field Sales Representative',
    languagesKnown: ['Kannada', 'English', 'Hindi'],
    preferredSalesArea: 'Bangalore South & Magadi Road',
    whyJoin: 'Strong retail network across grocery stores and supermarkets in South Bangalore.',
    declarationAccepted: true,
    status: 'HIRED',
    rating: 5,
    whatsAppStatus: 'SENT',
    onboardingStatus: 'DETAILS_PENDING',
    joiningDate: '16-Aug-2026',
    workingTerritory: 'Bangalore Urban / South',
    commissionRate: '₹100/kg - ₹150/kg',
    commissionMin: 100,
    commissionMax: 150,
    payoutFrequency: 'Weekly',
    reportingManager: 'Area Sales Manager',
    engagementType: 'Sales Executive (Field Sales)',
    authValidFrom: '16-Aug-2026',
    authValidUntil: '15-Feb-2027',
    isAuthActive: true,
    hiringEmailStatus: 'SENT',
    hiringEmailSentAt: new Date().toISOString(),
    notes: [
      {
        id: 'n1',
        author: 'admin@kamadhenuhoneyfarms.in',
        content: 'Experienced field representative with existing grocery retail contacts.',
        createdAt: new Date().toISOString(),
      },
    ],
    createdAt: new Date(Date.now() - 86400000).toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'app_seed_002',
    applicationNo: 'KHF-2026-002',
    fullName: 'Suresh Gowda',
    mobileNumber: '9535134351',
    whatsAppNumber: '9535134351',
    email: 'suresh.gowda@example.com',
    gender: 'Male',
    age: 31,
    city: 'Mandya',
    state: 'Karnataka',
    pinCode: '571401',
    hasBike: true,
    hasDrivingLicense: true,
    salesExperience: '3-5 years in Agriculture & Organic food sales',
    currentOccupation: 'Sales Manager',
    languagesKnown: ['Kannada', 'English'],
    preferredSalesArea: 'Mandya & Mysore District',
    whyJoin: 'Direct access to retail store networks in Mandya region.',
    declarationAccepted: true,
    status: 'SELECTED',
    rating: 4,
    whatsAppStatus: 'SENT',
    onboardingStatus: 'NOT_STARTED',
    joiningDate: '16-Aug-2026',
    workingTerritory: 'Mandya & Surrounding Districts',
    commissionRate: '₹100/kg - ₹150/kg',
    commissionMin: 100,
    commissionMax: 150,
    payoutFrequency: 'Weekly',
    reportingManager: 'Regional Manager',
    engagementType: 'Sales Executive (Field Sales)',
    authValidFrom: '16-Aug-2026',
    authValidUntil: '15-Feb-2027',
    isAuthActive: true,
    hiringEmailStatus: 'NOT_SENT',
    notes: [],
    createdAt: new Date(Date.now() - 172800000).toISOString(),
    updatedAt: new Date(Date.now() - 172800000).toISOString(),
  },
  {
    id: 'app_seed_003',
    applicationNo: 'KHF-2026-003',
    fullName: 'Anitha Rao',
    mobileNumber: '9876543210',
    whatsAppNumber: '9876543210',
    email: 'anitha.rao@example.com',
    gender: 'Female',
    age: 26,
    city: 'Mysore',
    state: 'Karnataka',
    pinCode: '570001',
    hasBike: true,
    hasDrivingLicense: true,
    salesExperience: '1-2 years in Organic food retail',
    currentOccupation: 'Sales Executive',
    languagesKnown: ['Kannada', 'English'],
    preferredSalesArea: 'Mysore Urban',
    whyJoin: 'Passionate about pure raw honey products.',
    declarationAccepted: true,
    status: 'INTERVIEW_SCHEDULED',
    rating: 4,
    interviewDate: '2026-08-15',
    interviewTime: '11:00 AM',
    interviewLocation: 'Phone Interview',
    whatsAppStatus: 'SENT',
    notes: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

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

  globalStore.__kamadhenu_apps__ = [...INITIAL_SEED_APPLICATIONS];
  saveApplicationsToDisk(globalStore.__kamadhenu_apps__);
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
