// src/types.ts
export type ViewType = "drive" | "starred" | "bin" | "search" | "progress";
export type ViewMode = "list" | "grid";
export type SortKey = "name" | "size" | "created_at";
export type SortDirection = "asc" | "desc";

export interface AppPath {
  view: ViewType;
  folderId: string | null;
  searchQuery?: string;
}

export type IconName =
  | "folder"
  | "file"
  | "share"
  | "copy"
  | "upload"
  | "search"
  | "user"
  | "logout"
  | "star"
  | "trash"
  | "more"
  | "chevronRight"
  | "x"
  | "spinner"
  | "cloud"
  | "plus"
  | "move"
  | "edit"
  | "download"
  | "restore"
  | "eye"
  | "menu"
  | "checkCircle"
  | "alertCircle"
  | "arrowUpDown"
  | "chevronUp"
  | "chevronDown"
  | "activity"
  | "image"
  | "video"
  | "pdf"
  | "archive"
  | "code"
  | "layoutGrid"
  | "layoutList";

export interface Folder {
  _id: string;
  id: string; // for compatibility if needed
  name: string;
  parent_id: string | null;
  size: number;
  owner_id: string;
  created_at: string;
  is_deleted: boolean;
  is_starred: boolean;
  deleted_at: string | null;
  type: "folder";
}

export interface FileItem {
  _id: string;
  id: string;
  name: string;
  mime_type: string;
  size: number;
  folder_id: string | null;
  owner_id: string;
  created_at: string;
  is_deleted: boolean;
  is_starred: boolean;
  deleted_at: string | null;
  type: "file";
}

export type DriveItem = Folder | FileItem;

export interface FolderTreeNode extends Folder {
  children: FolderTreeNode[];
}

export interface StorageUsage {
  total_usage_bytes: number;
}

export interface Breadcrumb {
  id: string;
  name: string;
}

export interface ModalState {
  type: string | null;
  data: DriveItem | DriveItem[] | null;
}

export interface UploadItem {
  id: number;
  file: File;
  progress: number;
  status: "queued" | "uploading" | "complete" | "error" | "cancelled";
  folderId: string | null;
  xhr?: XMLHttpRequest;
}

export interface Task {
  task_id: string;
  file_name: string;
  status: string;
  type: string;
  progress_percent: number;
  transferred: number;
  transferred_hr: string;
  total: number;
  total_hr: string;
  speed_bytes_per_sec: number;
  eta_seconds: number | null;
  eta_friendly: string;
  can_cancel: boolean;
}

export interface JwtPayload {
  sub: string;
  exp: number;
}
