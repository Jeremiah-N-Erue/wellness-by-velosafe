export type UserRole = "CLIENT" | "PROVIDER" | "ADMIN";

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
}

export interface ServiceCategory {
  id: string;
  slug: string;
  name: string;
  description: string;
  requiresVerification: boolean;
  hasProgressTracking: boolean;
}

export interface Country {
  id: string;
  slug: string;
  name: string;
  isoCode: string;
  currency: string;
  isActive: boolean;
}

export interface Service {
  id: string;
  title: string;
  description: string;
  durationMins: number;
  creditCost: number;
}

export interface VerificationRecord {
  idDocumentVerified: boolean;
  certificationVerified: boolean;
  referenceContactName: string | null;
  referenceContactPhone: string | null;
  referenceContactStatus: "PENDING" | "CONTACTED" | "CONFIRMED" | "FAILED";
  codeOfConductSignedAt: string | null;
  waiverSignedAt: string | null;
  notes: string | null;
  tier1CompletedAt: string | null;
}

export interface ProviderProfile {
  id: string;
  userId: string;
  city: string;
  headline: string;
  bio: string;
  yearsExperience: number;
  verificationTier: "NONE" | "TIER_1_BASELINE" | "TIER_2_VERIFIED" | "TIER_3_TRUSTED";
  trustScore: number;
  sessionCount: number;
  user: { name: string; email?: string };
  category: ServiceCategory;
  country: Country;
  services: Service[];
  verificationRecord: VerificationRecord | null;
}

export interface CreditPack {
  id: string;
  name: string;
  credits: number;
  price: number;
  validityDays: number;
  country: Country;
}

export interface Booking {
  id: string;
  status: "PENDING" | "CONFIRMED" | "COMPLETED" | "CANCELLED" | "NO_SHOW";
  scheduledAt: string;
  creditsCharged: number;
  goalText: string | null;
  service: Service;
  provider?: { user: { name: string } };
  client?: { name: string };
  progressLog: ProgressLog | null;
}

export interface ProgressLog {
  id: string;
  sessionNotes: string;
  goalProgressSummary: string;
  recommendedNextSessions: number | null;
  recommendationRationale: string | null;
  clientAcknowledgedAt: string | null;
  createdAt: string;
  provider?: { user: { name: string } };
  booking?: { service: Service };
}

export interface Conversation {
  id: string;
  stage: "PRE_BOOKING" | "POST_BOOKING";
  client: { name: string };
  provider: { user: { name: string } };
  messages: Message[];
}

export interface Message {
  id: string;
  senderId: string;
  recipientId: string;
  body: string;
  filteredBody: string;
  wasFiltered: boolean;
  createdAt: string;
}
