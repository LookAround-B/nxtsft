/**
 * Shared Types Across Web & API
 * - Role-based types
 * - Entity types (User, Property, Agent, etc.)
 * - API request/response types
 * - Database types (derived from Prisma)
 */

export type Role =
  | "super-admin"
  | "admin"
  | "supervisor"
  | "sales"
  | "support-admin"
  | "user"
  | "home-seller";

export type PropertyType = "Apartment" | "Villa" | "Plot" | "Commercial" | "PG" | "New" | "Studio";
export type PropertyPurpose = "Sale" | "Rent" | "Buy" | "Lease";
export type PropertyStatus = "Active" | "Sold" | "Rented" | "Inactive" | "Delisted";

export interface User {
  id: string;
  email: string;
  name: string;
  phone: string;
  role: Role;
  verified: boolean;
  city: string;
  joined: Date;
  lastActive: Date;
}

export interface Property {
  id: string;
  title: string;
  description: string;
  type: PropertyType;
  purpose: PropertyPurpose;
  status: PropertyStatus;
  price: number;
  area: number;
  bedrooms: number;
  bathrooms: number;
  city: string;
  locality: string;
  latitude: number;
  longitude: number;
  amenities: string[];
  images: string[]; // R2 URLs
  ownerId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}
