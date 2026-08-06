'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  fullApplicationSchema, 
  FullApplicationData 
} from '@/lib/validations/application';
import { 
  User, 
  Briefcase, 
  FileCheck, 
  CheckCircle2, 
  ArrowRight, 
  ArrowLeft, 
  Upload, 
  ShieldAlert, 
  Loader2, 
  Sparkles,
  Bike,
  FileText,
  MapPin
} from 'lucide-react';

const STEPS = [
  { id: 1, name: 'Personal Information', icon: User },
  { id: 2, name: 'Professional Details', icon: Briefcase },
  { id: 3, name: 'Documents Upload', icon: FileCheck },
  { id: 4, name: 'Declaration & Submit', icon: CheckCircle2 },
];

export default function ApplicationForm() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  // File Upload State Simulation
  const [resumeName, setResumeName] = useState<string | null>(null);
  const [aadhaarName, setAadhaarName] = useState<string | null>(null);
  const [photoName, setPhotoName] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    trigger,
    control,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FullApplicationData>({
    resolver: zodResolver(fullApplicationSchema),
    defaultValues: {
      fullName: '',
      mobileNumber: '',
      whatsAppNumber: '',
      email: '',
      gender: 'male',
      age: 25,
      city: 'Bangalore',
      state: 'Karnataka',
      pinCode: '560010',
      hasBike: true,
      hasDrivingLicense: true,
      salesExperience: 'Fresher',
      currentOccupation: '',
      languagesKnown: ['Kannada'],
      preferredSalesArea: '',
      resumeUrl: '',
      aadhaarUrl: '',
      profilePhotoUrl: '',
      whyJoin: '',
      declarationAccepted: false,
    },
  });

  const nextStep = async () => {
    let fieldsToValidate: (keyof FullApplicationData)[] = [];

    if (currentStep === 1) {
      fieldsToValidate = ['fullName', 'mobileNumber', 'whatsAppNumber', 'email', 'gender', 'age', 'city', 'state', 'pinCode'];
    } else if (currentStep === 2) {
      fieldsToValidate = ['hasBike', 'hasDrivingLicense', 'salesExperience', 'currentOccupation', 'languagesKnown', 'preferredSalesArea'];
    } else if (currentStep === 3) {
      fieldsToValidate = ['resumeUrl', 'aadhaarUrl', 'profilePhotoUrl'];
    }

    const isValid = await trigger(fieldsToValidate);
    if (isValid) {
      setServerError(null);
      setCurrentStep((prev) => Math.min(prev + 1, 4));
    }
  };

  const prevStep = () => {
    setServerError(null);
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  };

  const onSubmit = async (data: FullApplicationData) => {
    setIsSubmitting(true);
    setServerError(null);

    try {
      const response = await fetch('/api/careers/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Failed to submit application.');
      }

      // Redirect to thank you page with application number, candidate name, mobile, and position
      const params = new URLSearchParams({
        appNo: result.data.applicationNo,
        name: result.data.fullName,
        mobile: result.data.mobileNumber,
        position: 'Sales Partner'
      });
      router.push(`/careers/thank-you?${params.toString()}`);
    } catch (err: any) {
      setServerError(err.message || 'Something went wrong. Please check your data and retry.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedLanguages = watch('languagesKnown') || [];

  const handleLanguageToggle = (lang: string) => {
    if (selectedLanguages.includes(lang)) {
      setValue('languagesKnown', selectedLanguages.filter((l) => l !== lang), { shouldValidate: true });
    } else {
      setValue('languagesKnown', [...selectedLanguages, lang], { shouldValidate: true });
    }
  };

  const [uploadingState, setUploadingState] = useState<{ [key: string]: boolean }>({});

  const handleFileUpload = async (type: 'resume' | 'aadhaar' | 'photo', e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      alert('File size exceeds 10MB limit');
      return;
    }

    setUploadingState((prev) => ({ ...prev, [type]: true }));

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('folder', `kamadhenu_${type}s`);

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const json = await res.json();
      if (!res.ok || !json.success || !json.url) {
        throw new Error(json.message || 'File upload failed');
      }

      if (type === 'resume') {
        setResumeName(file.name);
        setValue('resumeUrl', json.url, { shouldValidate: true });
      } else if (type === 'aadhaar') {
        setAadhaarName(file.name);
        setValue('aadhaarUrl', json.url, { shouldValidate: true });
      } else if (type === 'photo') {
        setPhotoName(file.name);
        setValue('profilePhotoUrl', json.url, { shouldValidate: true });
      }
    } catch (err: any) {
      alert(`Failed to upload ${file.name}: ${err.message || 'Upload error'}`);
    } finally {
      setUploadingState((prev) => ({ ...prev, [type]: false }));
    }
  };

  return (
    <div className="max-w-3xl mx-auto glass-panel p-6 sm:p-10 rounded-3xl border-2 border-gold-300 shadow-luxury">
      
      {/* Wizard Progress Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between gap-2 mb-4">
          {STEPS.map((step) => {
            const Icon = step.icon;
            const isActive = currentStep === step.id;
            const isCompleted = currentStep > step.id;
            return (
              <div key={step.id} className="flex flex-col items-center flex-1">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-all duration-300 ${
                    isCompleted
                      ? 'bg-emerald-500 text-white shadow-md'
                      : isActive
                      ? 'bg-gold-500 text-white shadow-gold-glow ring-4 ring-gold-200'
                      : 'bg-gold-100 text-gray-400'
                  }`}
                >
                  {isCompleted ? <CheckCircle2 className="w-5 h-5" /> : <Icon className="w-4 h-4" />}
                </div>
                <span className={`text-[11px] font-medium mt-1 text-center hidden sm:block ${isActive ? 'text-gold-700 font-bold' : 'text-gray-400'}`}>
                  {step.name}
                </span>
              </div>
            );
          })}
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-gold-100 h-2 rounded-full overflow-hidden">
          <motion.div
            className="bg-gradient-to-r from-gold-500 to-gold-600 h-full"
            initial={{ width: '25%' }}
            animate={{ width: `${(currentStep / 4) * 100}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
      </div>

      {/* Global Server Error Message */}
      {serverError && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm flex items-start gap-3">
          <ShieldAlert className="w-5 h-5 shrink-0 mt-0.5 text-red-500" />
          <div>
            <p className="font-semibold">Submission Error</p>
            <p>{serverError}</p>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)}>
        <AnimatePresence mode="wait">
          
          {/* STEP 1: PERSONAL INFORMATION */}
          {currentStep === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
              className="space-y-6"
            >
              <div className="border-b border-gold-200 pb-3">
                <h2 className="text-xl font-serif font-bold text-charcoal">Step 1: Personal Information</h2>
                <p className="text-xs text-gray-500">Provide your basic contact details for recruitment communication.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                
                {/* Full Name */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-charcoal mb-1">Full Name *</label>
                  <input
                    type="text"
                    placeholder="e.g. Ramesh Gowda"
                    {...register('fullName')}
                    className="w-full px-4 py-2.5 rounded-xl border border-gold-300 focus:border-gold-500 focus:ring-2 focus:ring-gold-200 outline-none text-sm bg-white"
                  />
                  {errors.fullName && <p className="text-xs text-red-500 mt-1">{errors.fullName.message}</p>}
                </div>

                {/* Mobile Number */}
                <div>
                  <label className="block text-xs font-semibold text-charcoal mb-1">Mobile Number *</label>
                  <input
                    type="tel"
                    placeholder="10-digit number"
                    {...register('mobileNumber')}
                    className="w-full px-4 py-2.5 rounded-xl border border-gold-300 focus:border-gold-500 focus:ring-2 focus:ring-gold-200 outline-none text-sm bg-white"
                  />
                  {errors.mobileNumber && <p className="text-xs text-red-500 mt-1">{errors.mobileNumber.message}</p>}
                </div>

                {/* WhatsApp Number */}
                <div>
                  <label className="block text-xs font-semibold text-charcoal mb-1">WhatsApp Number *</label>
                  <input
                    type="tel"
                    placeholder="10-digit WhatsApp number"
                    {...register('whatsAppNumber')}
                    className="w-full px-4 py-2.5 rounded-xl border border-gold-300 focus:border-gold-500 focus:ring-2 focus:ring-gold-200 outline-none text-sm bg-white"
                  />
                  {errors.whatsAppNumber && <p className="text-xs text-red-500 mt-1">{errors.whatsAppNumber.message}</p>}
                </div>

                {/* Email Address */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-charcoal mb-1">Email Address *</label>
                  <input
                    type="email"
                    placeholder="your.email@gmail.com"
                    {...register('email')}
                    className="w-full px-4 py-2.5 rounded-xl border border-gold-300 focus:border-gold-500 focus:ring-2 focus:ring-gold-200 outline-none text-sm bg-white"
                  />
                  {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email.message}</p>}
                </div>

                {/* Gender */}
                <div>
                  <label className="block text-xs font-semibold text-charcoal mb-1">Gender *</label>
                  <select
                    {...register('gender')}
                    className="w-full px-4 py-2.5 rounded-xl border border-gold-300 focus:border-gold-500 focus:ring-2 focus:ring-gold-200 outline-none text-sm bg-white"
                  >
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                {/* Age */}
                <div>
                  <label className="block text-xs font-semibold text-charcoal mb-1">Age *</label>
                  <input
                    type="number"
                    {...register('age')}
                    className="w-full px-4 py-2.5 rounded-xl border border-gold-300 focus:border-gold-500 focus:ring-2 focus:ring-gold-200 outline-none text-sm bg-white"
                  />
                  {errors.age && <p className="text-xs text-red-500 mt-1">{errors.age.message}</p>}
                </div>

                {/* City */}
                <div>
                  <label className="block text-xs font-semibold text-charcoal mb-1">City *</label>
                  <input
                    type="text"
                    placeholder="Bangalore"
                    {...register('city')}
                    className="w-full px-4 py-2.5 rounded-xl border border-gold-300 focus:border-gold-500 focus:ring-2 focus:ring-gold-200 outline-none text-sm bg-white"
                  />
                  {errors.city && <p className="text-xs text-red-500 mt-1">{errors.city.message}</p>}
                </div>

                {/* State */}
                <div>
                  <label className="block text-xs font-semibold text-charcoal mb-1">State *</label>
                  <input
                    type="text"
                    placeholder="Karnataka"
                    {...register('state')}
                    className="w-full px-4 py-2.5 rounded-xl border border-gold-300 focus:border-gold-500 focus:ring-2 focus:ring-gold-200 outline-none text-sm bg-white"
                  />
                  {errors.state && <p className="text-xs text-red-500 mt-1">{errors.state.message}</p>}
                </div>

                {/* PIN Code */}
                <div>
                  <label className="block text-xs font-semibold text-charcoal mb-1">PIN Code *</label>
                  <input
                    type="text"
                    placeholder="560010"
                    {...register('pinCode')}
                    className="w-full px-4 py-2.5 rounded-xl border border-gold-300 focus:border-gold-500 focus:ring-2 focus:ring-gold-200 outline-none text-sm bg-white"
                  />
                  {errors.pinCode && <p className="text-xs text-red-500 mt-1">{errors.pinCode.message}</p>}
                </div>

              </div>
            </motion.div>
          )}

          {/* STEP 2: PROFESSIONAL DETAILS */}
          {currentStep === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
              className="space-y-6"
            >
              <div className="border-b border-gold-200 pb-3">
                <h2 className="text-xl font-serif font-bold text-charcoal">Step 2: Professional Details</h2>
                <p className="text-xs text-gray-500">Tell us about your field sales experience and area preferences.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                
                {/* Own Bike */}
                <div className="p-4 rounded-xl border border-gold-200 bg-gold-50/50">
                  <label className="block text-xs font-semibold text-charcoal mb-2 flex items-center gap-1.5">
                    <Bike className="w-4 h-4 text-gold-600" /> Do you own a bike/two-wheeler? *
                  </label>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 text-sm text-charcoal cursor-pointer">
                      <input
                        type="radio"
                        value="true"
                        checked={watch('hasBike') === true}
                        onChange={() => setValue('hasBike', true)}
                        className="accent-gold-500"
                      /> Yes
                    </label>
                    <label className="flex items-center gap-2 text-sm text-charcoal cursor-pointer">
                      <input
                        type="radio"
                        value="false"
                        checked={watch('hasBike') === false}
                        onChange={() => setValue('hasBike', false)}
                        className="accent-gold-500"
                      /> No
                    </label>
                  </div>
                </div>

                {/* Driving License */}
                <div className="p-4 rounded-xl border border-gold-200 bg-gold-50/50">
                  <label className="block text-xs font-semibold text-charcoal mb-2 flex items-center gap-1.5">
                    <FileText className="w-4 h-4 text-gold-600" /> Do you have a Driving License? *
                  </label>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 text-sm text-charcoal cursor-pointer">
                      <input
                        type="radio"
                        value="true"
                        checked={watch('hasDrivingLicense') === true}
                        onChange={() => setValue('hasDrivingLicense', true)}
                        className="accent-gold-500"
                      /> Yes
                    </label>
                    <label className="flex items-center gap-2 text-sm text-charcoal cursor-pointer">
                      <input
                        type="radio"
                        value="false"
                        checked={watch('hasDrivingLicense') === false}
                        onChange={() => setValue('hasDrivingLicense', false)}
                        className="accent-gold-500"
                      /> No
                    </label>
                  </div>
                </div>

                {/* Previous Sales Experience */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-charcoal mb-1">Previous Sales Experience *</label>
                  <select
                    {...register('salesExperience')}
                    className="w-full px-4 py-2.5 rounded-xl border border-gold-300 focus:border-gold-500 focus:ring-2 focus:ring-gold-200 outline-none text-sm bg-white"
                  >
                    <option value="Fresher">Fresher (No Prior Experience)</option>
                    <option value="1-2 Years">1 - 2 Years</option>
                    <option value="2-5 Years">2 - 5 Years (FMCG / Retail)</option>
                    <option value="5+ Years">5+ Years (Distribution Lead)</option>
                  </select>
                </div>

                {/* Current Occupation */}
                <div>
                  <label className="block text-xs font-semibold text-charcoal mb-1">Current Occupation *</label>
                  <input
                    type="text"
                    placeholder="e.g. Retail Agent / Student"
                    {...register('currentOccupation')}
                    className="w-full px-4 py-2.5 rounded-xl border border-gold-300 focus:border-gold-500 focus:ring-2 focus:ring-gold-200 outline-none text-sm bg-white"
                  />
                  {errors.currentOccupation && <p className="text-xs text-red-500 mt-1">{errors.currentOccupation.message}</p>}
                </div>

                {/* Preferred Sales Area */}
                <div>
                  <label className="block text-xs font-semibold text-charcoal mb-1">Preferred Sales Area / District *</label>
                  <input
                    type="text"
                    placeholder="e.g. Magadi Road & Rajajinagar"
                    {...register('preferredSalesArea')}
                    className="w-full px-4 py-2.5 rounded-xl border border-gold-300 focus:border-gold-500 focus:ring-2 focus:ring-gold-200 outline-none text-sm bg-white"
                  />
                  {errors.preferredSalesArea && <p className="text-xs text-red-500 mt-1">{errors.preferredSalesArea.message}</p>}
                </div>

                {/* Languages Known */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-charcoal mb-2">Languages Known * (Select all that apply)</label>
                  <div className="flex flex-wrap gap-2">
                    {['Kannada', 'English', 'Hindi', 'Telugu', 'Tamil', 'Marathi'].map((lang) => {
                      const isSelected = selectedLanguages.includes(lang);
                      return (
                        <button
                          key={lang}
                          type="button"
                          onClick={() => handleLanguageToggle(lang)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                            isSelected
                              ? 'bg-gold-500 text-white border-gold-600 shadow-sm'
                              : 'bg-white text-gray-600 border-gold-200 hover:border-gold-400'
                          }`}
                        >
                          {lang} {isSelected ? '✓' : '+'}
                        </button>
                      );
                    })}
                  </div>
                  {errors.languagesKnown && <p className="text-xs text-red-500 mt-1">{errors.languagesKnown.message}</p>}
                </div>

              </div>
            </motion.div>
          )}

          {/* STEP 3: DOCUMENTS */}
          {currentStep === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
              className="space-y-6"
            >
              <div className="border-b border-gold-200 pb-3">
                <h2 className="text-xl font-serif font-bold text-charcoal">Step 3: Document Uploads</h2>
                <p className="text-xs text-gray-500">Upload identity verification and optional resume files (Max size: 5MB).</p>
              </div>

              <div className="space-y-4">
                
                {/* Upload Resume (Optional) */}
                <div className="border-2 border-dashed border-gold-300 rounded-2xl p-5 bg-gold-50/30 text-center hover:bg-gold-50/70 transition-colors">
                  <Upload className="w-8 h-8 text-gold-600 mx-auto mb-2" />
                  <p className="text-sm font-semibold text-charcoal">Upload Resume (Optional)</p>
                  <p className="text-xs text-gray-500 mb-3">PDF or DOCX format (Max 10MB)</p>
                  <label className="cursor-pointer inline-flex items-center px-4 py-2 bg-white text-gold-700 text-xs font-semibold rounded-lg border border-gold-300 hover:bg-gold-100 shadow-sm">
                    {uploadingState['resume'] ? 'Uploading to Cloudinary...' : 'Choose File'}
                    <input type="file" accept=".pdf,.doc,.docx" onChange={(e) => handleFileUpload('resume', e)} className="hidden" />
                  </label>
                  {uploadingState['resume'] && <p className="text-xs text-gold-600 font-semibold mt-2 animate-pulse">⏳ Uploading to Cloudinary CDN...</p>}
                  {resumeName && !uploadingState['resume'] && <p className="text-xs text-emerald-600 font-semibold mt-2">✓ Uploaded: {resumeName}</p>}
                </div>

                {/* Upload Aadhaar */}
                <div className="border-2 border-dashed border-gold-300 rounded-2xl p-5 bg-gold-50/30 text-center hover:bg-gold-50/70 transition-colors">
                  <Upload className="w-8 h-8 text-gold-600 mx-auto mb-2" />
                  <p className="text-sm font-semibold text-charcoal">Upload Aadhaar Card Copy *</p>
                  <p className="text-xs text-gray-500 mb-3">JPG, PNG or PDF format</p>
                  <label className="cursor-pointer inline-flex items-center px-4 py-2 bg-white text-gold-700 text-xs font-semibold rounded-lg border border-gold-300 hover:bg-gold-100 shadow-sm">
                    {uploadingState['aadhaar'] ? 'Uploading to Cloudinary...' : 'Choose File'}
                    <input type="file" accept=".jpg,.jpeg,.png,.pdf" onChange={(e) => handleFileUpload('aadhaar', e)} className="hidden" />
                  </label>
                  {uploadingState['aadhaar'] && <p className="text-xs text-gold-600 font-semibold mt-2 animate-pulse">⏳ Uploading to Cloudinary CDN...</p>}
                  {aadhaarName && !uploadingState['aadhaar'] && <p className="text-xs text-emerald-600 font-semibold mt-2">✓ Uploaded: {aadhaarName}</p>}
                </div>

                {/* Upload Photo */}
                <div className="border-2 border-dashed border-gold-300 rounded-2xl p-5 bg-gold-50/30 text-center hover:bg-gold-50/70 transition-colors">
                  <Upload className="w-8 h-8 text-gold-600 mx-auto mb-2" />
                  <p className="text-sm font-semibold text-charcoal">Upload Passport Photo *</p>
                  <p className="text-xs text-gray-500 mb-3">JPG or PNG image format</p>
                  <label className="cursor-pointer inline-flex items-center px-4 py-2 bg-white text-gold-700 text-xs font-semibold rounded-lg border border-gold-300 hover:bg-gold-100 shadow-sm">
                    {uploadingState['photo'] ? 'Uploading to Cloudinary...' : 'Choose File'}
                    <input type="file" accept=".jpg,.jpeg,.png" onChange={(e) => handleFileUpload('photo', e)} className="hidden" />
                  </label>
                  {uploadingState['photo'] && <p className="text-xs text-gold-600 font-semibold mt-2 animate-pulse">⏳ Uploading to Cloudinary CDN...</p>}
                  {photoName && !uploadingState['photo'] && <p className="text-xs text-emerald-600 font-semibold mt-2">✓ Uploaded: {photoName}</p>}
                </div>

              </div>
            </motion.div>
          )}

          {/* STEP 4: FINAL DECLARATION */}
          {currentStep === 4 && (
            <motion.div
              key="step4"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
              className="space-y-6"
            >
              <div className="border-b border-gold-200 pb-3">
                <h2 className="text-xl font-serif font-bold text-charcoal">Step 4: Motivation & Declaration</h2>
                <p className="text-xs text-gray-500">Why do you want to join our sales partner network?</p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-charcoal mb-1">
                    Why do you want to join Kamadhenu Honey Farm? *
                  </label>
                  <textarea
                    rows={4}
                    placeholder="Write a brief statement about your interest in pure honey sales, local network connections, or income goals..."
                    {...register('whyJoin')}
                    className="w-full px-4 py-3 rounded-xl border border-gold-300 focus:border-gold-500 focus:ring-2 focus:ring-gold-200 outline-none text-sm bg-white"
                  />
                  {errors.whyJoin && <p className="text-xs text-red-500 mt-1">{errors.whyJoin.message}</p>}
                </div>

                <div className="p-4 rounded-xl border border-gold-300 bg-gold-50/70 space-y-3">
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      {...register('declarationAccepted')}
                      className="mt-1 w-4 h-4 accent-gold-600 rounded"
                    />
                    <span className="text-xs text-gray-700 leading-relaxed">
                      I hereby declare that all information provided in this application is true and correct. I agree to uphold Kamadhenu Honey Farm's 100% pure raw product quality principles.
                    </span>
                  </label>
                  {errors.declarationAccepted && (
                    <p className="text-xs text-red-500 font-semibold">{errors.declarationAccepted.message}</p>
                  )}
                </div>
              </div>
            </motion.div>
          )}

        </AnimatePresence>

        {/* Wizard Controls */}
        <div className="mt-8 pt-6 border-t border-gold-200 flex justify-between items-center">
          {currentStep > 1 ? (
            <button
              type="button"
              onClick={prevStep}
              className="inline-flex items-center px-5 py-2.5 text-sm font-semibold text-charcoal bg-white border border-gold-300 rounded-full hover:bg-gold-50 transition-colors"
            >
              <ArrowLeft className="w-4 h-4 mr-2" /> Back
            </button>
          ) : <div />}

          {currentStep < 4 ? (
            <button
              type="button"
              onClick={nextStep}
              className="inline-flex items-center px-6 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-gold-500 to-gold-600 rounded-full shadow-md hover:shadow-gold-500/30 transition-all"
            >
              Next Step <ArrowRight className="w-4 h-4 ml-2" />
            </button>
          ) : (
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center px-8 py-3 text-base font-semibold text-white bg-gradient-to-r from-emerald-600 to-emerald-700 rounded-full shadow-lg hover:shadow-emerald-600/30 disabled:opacity-50 transition-all"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" /> Submitting...
                </>
              ) : (
                <>
                  Submit Application <Sparkles className="w-5 h-5 ml-2" />
                </>
              )}
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
