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
  notes: { id: string; author: string; content: string; createdAt: string }[];
  createdAt: string;
  updatedAt: string;
}

// Pre-seeded high quality candidates for immediate demo & preview
const MOCK_APPLICATIONS: ApplicationRecord[] = [
  {
    id: 'app_1',
    applicationNo: 'KHF-2026-001',
    fullName: 'Ramesh Gowda',
    mobileNumber: '9845123456',
    whatsAppNumber: '9845123456',
    email: 'ramesh.gowda@gmail.com',
    gender: 'male',
    age: 29,
    city: 'Bangalore',
    state: 'Karnataka',
    pinCode: '560010',
    hasBike: true,
    hasDrivingLicense: true,
    salesExperience: '2-5 Years (FMCG Sales)',
    currentOccupation: 'Field Sales Executive',
    languagesKnown: ['Kannada', 'English', 'Hindi'],
    preferredSalesArea: 'Rajajinagar & Magadi Road Area',
    resumeUrl: 'https://res.cloudinary.com/demo/image/upload/sample.pdf',
    aadhaarUrl: 'https://res.cloudinary.com/demo/image/upload/sample.jpg',
    profilePhotoUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&h=300&fit=crop&crop=faces',
    whyJoin: 'I have 4 years of retail FMCG sales experience in West Bangalore. I love pure natural products and believe Kamadhenu Honey has high market potential.',
    declarationAccepted: true,
    status: 'INTERVIEW_SCHEDULED',
    rating: 5,
    notes: [
      { id: 'n1', author: 'Hiring Manager', content: 'Strong retail network in Magadi Road shopkeepers.', createdAt: '2026-07-27T10:30:00Z' }
    ],
    createdAt: '2026-07-26T14:20:00Z',
    updatedAt: '2026-07-27T10:30:00Z'
  },
  {
    id: 'app_2',
    applicationNo: 'KHF-2026-002',
    fullName: 'Priya Sharma',
    mobileNumber: '9900887766',
    whatsAppNumber: '9900887766',
    email: 'priya.sharma@yahoo.com',
    gender: 'female',
    age: 26,
    city: 'Mysore',
    state: 'Karnataka',
    pinCode: '570001',
    hasBike: true,
    hasDrivingLicense: true,
    salesExperience: '1-2 Years (Organic Food)',
    currentOccupation: 'Store Promoter',
    languagesKnown: ['Kannada', 'English'],
    preferredSalesArea: 'Mysore Central & VV Puram',
    resumeUrl: 'https://res.cloudinary.com/demo/image/upload/sample.pdf',
    profilePhotoUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=300&h=300&fit=crop&crop=faces',
    whyJoin: 'Passionate about organic honey and health products. Keen on earning through high commission performance.',
    declarationAccepted: true,
    status: 'SELECTED',
    rating: 4,
    notes: [
      { id: 'n2', author: 'Recruiter', content: 'Passed phone screening. Excellent communication in Kannada.', createdAt: '2026-07-27T15:00:00Z' }
    ],
    createdAt: '2026-07-25T09:15:00Z',
    updatedAt: '2026-07-27T15:00:00Z'
  },
  {
    id: 'app_3',
    applicationNo: 'KHF-2026-003',
    fullName: 'Manjunath K',
    mobileNumber: '9731234567',
    whatsAppNumber: '9731234567',
    email: 'manju.k@gmail.com',
    gender: 'male',
    age: 32,
    city: 'Tumkur',
    state: 'Karnataka',
    pinCode: '572101',
    hasBike: true,
    hasDrivingLicense: true,
    salesExperience: '5+ Years',
    currentOccupation: 'Distribution Agent',
    languagesKnown: ['Kannada', 'Telugu'],
    preferredSalesArea: 'Tumkur Rural & Highway Outlets',
    whyJoin: 'I own a distribution vehicle network across Tumkur district and want to distribute pure farm honey.',
    declarationAccepted: true,
    status: 'APPLIED',
    rating: 0,
    notes: [],
    createdAt: '2026-07-28T08:00:00Z',
    updatedAt: '2026-07-28T08:00:00Z'
  },
  {
    id: 'app_4',
    applicationNo: 'KHF-2026-004',
    fullName: 'Suresh Patil',
    mobileNumber: '9123456789',
    whatsAppNumber: '9123456789',
    email: 'suresh.patil@rediffmail.com',
    gender: 'male',
    age: 24,
    city: 'Hubli',
    state: 'Karnataka',
    pinCode: '580020',
    hasBike: false,
    hasDrivingLicense: false,
    salesExperience: 'Fresher',
    currentOccupation: 'Student / Part-time',
    languagesKnown: ['Kannada', 'Marathi'],
    preferredSalesArea: 'Hubli City',
    whyJoin: 'Looking for a flexible commission based job while continuing my evening studies.',
    declarationAccepted: true,
    status: 'REJECTED',
    rating: 2,
    notes: [
      { id: 'n3', author: 'Recruiter', content: 'No personal vehicle for field sales coverage.', createdAt: '2026-07-27T11:00:00Z' }
    ],
    createdAt: '2026-07-24T11:00:00Z',
    updatedAt: '2026-07-27T11:00:00Z'
  }
];

// Global in-memory persistence for standard server runtime
let globalApplications = [...MOCK_APPLICATIONS];

export function getApplicationsStore(): ApplicationRecord[] {
  return globalApplications;
}

export function addApplicationStore(appData: Omit<ApplicationRecord, 'id' | 'applicationNo' | 'status' | 'rating' | 'notes' | 'createdAt' | 'updatedAt'>): ApplicationRecord {
  const count = globalApplications.length + 1;
  const numStr = String(count).padStart(3, '0');
  const applicationNo = `KHF-2026-${numStr}`;
  const id = `app_${Date.now()}`;
  
  const newApp: ApplicationRecord = {
    ...appData,
    id,
    applicationNo,
    status: 'APPLIED',
    rating: 0,
    notes: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  globalApplications = [newApp, ...globalApplications];
  return newApp;
}

export function updateApplicationStatusStore(id: string, status: ApplicationRecord['status']): ApplicationRecord | null {
  const idx = globalApplications.findIndex((a) => a.id === id);
  if (idx === -1) return null;
  globalApplications[idx].status = status;
  globalApplications[idx].updatedAt = new Date().toISOString();
  return globalApplications[idx];
}

export function addApplicationNoteStore(id: string, author: string, content: string): ApplicationRecord | null {
  const idx = globalApplications.findIndex((a) => a.id === id);
  if (idx === -1) return null;
  const noteObj = {
    id: `note_${Date.now()}`,
    author,
    content,
    createdAt: new Date().toISOString(),
  };
  globalApplications[idx].notes.push(noteObj);
  globalApplications[idx].updatedAt = new Date().toISOString();
  return globalApplications[idx];
}

export function findDuplicateApplication(mobileNumber: string, email: string): boolean {
  return globalApplications.some(
    (a) => a.mobileNumber === mobileNumber || a.email.toLowerCase() === email.toLowerCase()
  );
}
