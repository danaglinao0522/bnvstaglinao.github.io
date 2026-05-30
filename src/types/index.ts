export type Theme = 'light' | 'dark';

export type TeamCategory =
  | 'Music Team'
  | 'Hospitality Team'
  | 'Tech Team'
  | string;

export type UserRole = 'master_admin' | 'admin' | 'member';

export type Privilege = 'delete_post' | 'delete_comment' | 'approve_photos';

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  nickname: string;
  photoURL: string;
  role: UserRole;
  teams: string[];
  privileges: Privilege[];
  theme: Theme;
  pinnedItemId?: string;
  pinnedItemType?: 'prayer' | 'bible';
  createdAt: any;
  isDeleted?: boolean;
  deletedAt?: any;
}

export interface PrayerRequest {
  id: string;
  authorId: string;
  authorName: string;
  authorPhoto: string;
  content: string;
  createdAt: any;
  updatedAt?: any;
  reactions: { [userId: string]: string };
  commentCount: number;
  isDeleted?: boolean;
  deletedAt?: any;
  deletedBy?: string;
  isPinned?: boolean;
}

export interface Comment {
  id: string;
  postId: string;
  authorId: string;
  authorName: string;
  authorPhoto: string;
  content: string;
  createdAt: any;
  isDeleted?: boolean;
  deletedAt?: any;
  deletedBy?: string;
}

export interface BiblePassage {
  id: string;
  authorId: string;
  authorName: string;
  authorPhoto: string;
  reference: string;
  text: string;
  notes: string;
  createdAt: any;
  updatedAt?: any;
  reactions: { [userId: string]: string };
  commentCount: number;
  isDeleted?: boolean;
  deletedAt?: any;
  isPinned?: boolean;
}

export interface Photo {
  id: string;
  authorId: string;
  authorName: string;
  authorPhoto: string;
  imageUrl: string;
  caption: string;
  createdAt: any;
  approved: boolean;
  approvedBy?: string;
  approvedAt?: any;
  isDeleted?: boolean;
  deletedAt?: any;
}

export interface ImportantMessage {
  id: string;
  authorId: string;
  authorName: string;
  authorPhoto: string;
  content: string;
  createdAt: any;
  isRead: { [userId: string]: boolean };
}

export interface AppSettings {
  appName: string;
  appIcon: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  teams: string[];
}

export interface DeletedRecord {
  id: string;
  type: 'account' | 'post' | 'comment' | 'photo';
  originalData: any;
  deletedAt: any;
  deletedBy: string;
  deletedByName: string;
}
