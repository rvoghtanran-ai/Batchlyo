
export interface PinMetadata {
  title: string;
  description: string;
  tags: string[];
}

export interface Pin {
  id: string;
  imageUrl: string;
  title: string;
  description: string;
  tags: string[]; // Added tags
  destinationLink: string;
  board: string;
  scheduledTime?: string; // ISO String for scheduling
  status: 'draft' | 'processing' | 'ready' | 'error';
  source: 'scraped' | 'upload' | 'generated';
  selected: boolean;
  originalImageUrl: string; // The raw source before account-specific cropping
  accountOptimizedImages?: Record<string, string>; // Mapping: accountId -> croppedImageUrl
  originalTitle?: string; // AI Source of Truth: Title
  originalDescription?: string; // AI Source of Truth: Description
  originalTags?: string[]; // AI Source of Truth: Tags
  accountMetadata?: Record<string, PinMetadata>; // Mapping: accountId -> { title, description, tags }
  createdAt: number;
}

export interface Board {
  id: string;
  name: string;
  accountId?: string; // Linked to WebhookAccount.id
  externalId?: string; // For future use (e.g. Pinterest Board ID)
}

export interface WebhookAccount {
  id: string;
  name: string;
  url: string;
}

export interface ScrapeResult {
  url: string;
  success: boolean;
  images: string[];
}

export interface UserSubscription {
    plan: 'starter' | 'pro' | 'agency';
    status: 'active' | 'past_due' | 'cancelled' | 'lifetime';
    periodEnd: number;
}

export interface UserUsage {
    generatedImages: number;
    scrapedUrls: number;
    exportedPins: number;
    aiCalls: number;
    remixUsage?: Record<string, number>; // accountId -> count
}

export type UserRole = 'super_admin' | 'admin' | 'editor' | 'user';

export interface UserProfile {
    uid: string;
    email: string;
    displayName: string;
    role: UserRole;
    status: 'active' | 'banned';
    createdAt: number;
    lastLogin: number;
    subscription?: UserSubscription; // New
    usage?: UserUsage; // New
}

// Global System Config stored in Firestore 'settings/global'
export interface PricingTier {
    monthly: number;
    yearly: number;
}

export interface GlobalSettings {
    pricing: {
        pro: PricingTier;
        agency: PricingTier;
    };
    maintenanceMode: boolean;
    announcement?: {
        message: string;
        enabled: boolean;
        type: 'info' | 'warning' | 'error';
    };
    features?: {
        enableStealthMode: boolean;
        enableImageGeneration: boolean;
        enableScraping: boolean;
    };
    featuredPosts?: string[]; // Array of blog post slugs
    paypal?: {
        email?: string;
        clientId?: string;
    };
}

export enum AIServiceProvider {
  GROQ = 'GROQ',
  GEMINI = 'GEMINI',
  OPENAI = 'OPENAI',
  CLAUDE = 'CLAUDE',
  CLOUDFLARE = 'CLOUDFLARE',
  POLLINATIONS = 'POLLINATIONS', // New Free Provider
  OPENROUTER = 'OPENROUTER' // New OpenRouter Provider
}

export enum ImageHostProvider {
  IMGBB = 'IMGBB',
  CLOUDINARY = 'CLOUDINARY',
  FREEIMAGE = 'FREEIMAGE'
}

export interface ImageHostSettings {
  provider: ImageHostProvider;
  apiKey?: string;       // ImgBB, FreeImage
  cloudName?: string;    // Cloudinary
  uploadPreset?: string; // Cloudinary
}

export type PlatformType = 'blogger' | 'wordpress' | 'shopify' | 'etsy' | 'custom';

export interface SmartLinkSettings {
  enabled: boolean;
  platform: PlatformType;
  baseUrl: string;
  customPath: string;
}

export type ExportFormat = 'default' | 'publer' | 'custom' | 'webhook' | 'google-sheet' | 'json';

export interface CsvExportSettings {
  // Mapping Internal Field -> Custom Header Name
  titleHeader: string;
  descriptionHeader: string;
  linkHeader: string;
  imageHeader: string;
  boardHeader: string;
  boardIdHeader?: string; // NEW: Header for the Board ID
  tagsHeader: string;
  dateHeader: string;
  statusHeader?: string; // NEW: Header for Status column
}

export type AspectRatio = '1:1' | '9:16' | '16:9' | '3:4' | '4:3';
