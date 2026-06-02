export type UserRole = "LANDOWNER" | "BUYER" | "VERIFIER" | "ADMIN" | "COMMUNITY_PARTNER" | "VIEWER";
export type LandType =
  | "FOREST"
  | "SAVANNA"
  | "GRASSLAND"
  | "FARMLAND"
  | "WETLAND"
  | "MANGROVE";
export type ProjectStatus =
  | "PENDING"
  | "UNDER_REVIEW"
  | "VERIFIED"
  | "REJECTED"
  | "ACTIVE"
  | "COMPLETED";
export type VerificationStatus =
  | "PENDING"
  | "IN_PROGRESS"
  | "APPROVED"
  | "REJECTED";
export type CreditStatus = "AVAILABLE" | "LISTED" | "SOLD" | "RETIRED";
export type ListingStatus = "ACTIVE" | "SOLD" | "CANCELLED";

export interface JwtPayload {
  sub: string;
  role: UserRole;
  walletAddress?: string;
  iat?: number;
  exp?: number;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface ProjectFilters {
  landType?: LandType;
  country?: string;
  status?: ProjectStatus;
  page?: number;
  pageSize?: number;
}

export interface ListingFilters {
  landType?: LandType;
  country?: string;
  minPrice?: number;
  maxPrice?: number;
  page?: number;
  pageSize?: number;
}

export interface QueueJob<T = unknown> {
  id: string;
  type: string;
  payload: T;
}

export interface VerificationJobPayload {
  projectId: string;
  verificationId: string;
}

export interface MintingJobPayload {
  projectId: string;
  verificationId: string;
  carbonTons: number;
  ownerWallet: string;
}

export interface NotificationPayload {
  userId: string;
  type: "email" | "sms";
  template: string;
  data: Record<string, unknown>;
}

export { redisConnectionOptions } from "./redis";
