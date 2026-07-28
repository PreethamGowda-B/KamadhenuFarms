import { z } from 'zod';

export const personalInfoSchema = z.object({
  fullName: z.string().min(2, 'Full name must be at least 2 characters'),
  mobileNumber: z.string().regex(/^[6-9]\d{9}$/, 'Enter a valid 10-digit Indian mobile number'),
  whatsAppNumber: z.string().regex(/^[6-9]\d{9}$/, 'Enter a valid 10-digit WhatsApp number'),
  email: z.string().email('Please enter a valid email address'),
  gender: z.enum(['male', 'female', 'other'], {
    errorMap: () => ({ message: 'Please select a gender' }),
  }),
  age: z.coerce.number().min(18, 'Must be at least 18 years old').max(70, 'Age limit is 70'),
  city: z.string().min(2, 'City is required'),
  state: z.string().min(2, 'State is required'),
  pinCode: z.string().regex(/^\d{6}$/, 'Enter a valid 6-digit PIN code'),
});

export const professionalDetailsSchema = z.object({
  hasBike: z.boolean({ required_error: 'Please specify if you own a bike' }),
  hasDrivingLicense: z.boolean({ required_error: 'Please specify driving license status' }),
  salesExperience: z.string().min(1, 'Please select your sales experience level'),
  currentOccupation: z.string().min(2, 'Current occupation is required'),
  languagesKnown: z.array(z.string()).min(1, 'Select at least one language'),
  preferredSalesArea: z.string().min(2, 'Preferred sales area/district is required'),
});

export const documentsSchema = z.object({
  resumeUrl: z.string().optional(),
  aadhaarUrl: z.string().optional(),
  profilePhotoUrl: z.string().optional(),
});

export const finalStepSchema = z.object({
  whyJoin: z.string().min(20, 'Please write at least 20 characters explaining why you wish to join'),
  declarationAccepted: z.boolean().refine((val: boolean) => val === true, {
    message: 'You must accept the declaration to submit your application',
  }),
});

export const fullApplicationSchema = personalInfoSchema
  .merge(professionalDetailsSchema)
  .merge(documentsSchema)
  .merge(finalStepSchema);

export type PersonalInfoData = z.infer<typeof personalInfoSchema>;
export type ProfessionalDetailsData = z.infer<typeof professionalDetailsSchema>;
export type DocumentsData = z.infer<typeof documentsSchema>;
export type FinalStepData = z.infer<typeof finalStepSchema>;
export type FullApplicationData = z.infer<typeof fullApplicationSchema>;
