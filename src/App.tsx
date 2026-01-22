import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
  type FC,
  type ReactNode,
} from "react";

// JWT Decode
import { jwtDecode } from "jwt-decode";

// Shadcn UI Imports
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

// Other UI Imports
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Toaster, toast } from "sonner";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
  ContextMenuSeparator,
} from "@/components/ui/context-menu";

import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { api, API_ROOT } from "./lib/api";
import { LoginPage } from "./pages/Login";
import { ForgotPasswordPage } from "./pages/ForgotPassword";
import { VerifyEmailPage } from "./pages/VerifyEmail";
import { ResetPasswordPage } from "./pages/ResetPassword";
import { Icon } from "@/components/Icon";
import { formatBytes, formatDate, getFileIconName } from "@/lib/utils";

import type {
  AppPath,
  ViewType,
  ViewMode,
  SortKey,
  SortDirection,
  DriveItem,
  Folder,
  FileItem,
  StorageUsage,
  Breadcrumb,
  ModalState,
  Task,
  JwtPayload,
  IconName,
  UploadItem,
  FolderTreeNode,
} from "@/types";

const useUploader = (onUploadComplete: () => void) => {
  const [uploads, setUploads] = useState<UploadItem[]>([]);
  const [isMinimized, setIsMinimized] = useState(false);

  const uploadFiles = (files: File[], folderId: string | null) => {
    const newUploads: UploadItem[] = [];
    const maxFileSize = 1 * 1024 * 1024 * 1024; // 1GB

    for (const file of files) {
      if (file.size > maxFileSize) {
        toast.error(`"${file.name}" is too large (max 1GB).`);
        continue;
      }

      newUploads.push({
        id: Math.random(),
        file,
        progress: 0,
        status: "queued",
        folderId: folderId,
      });
    }

    if (newUploads.length > 0) {
      setUploads((prev) => [...prev, ...newUploads]);
      setIsMinimized(false);
      toast.success(`${newUploads.length} file(s) queued for upload.`);
    }
  };

  const cancelUpload = (uploadId: number) => {
    setUploads((prev) =>
      prev.map((u) => {
        if (u.id === uploadId && u.xhr) {
          u.xhr.abort();
          return { ...u, status: "cancelled" };
        }
        return u;
      })
    );
  };

  const processQueue = useCallback(async () => {
    const nextUpload = uploads.find((u) => u.status === "queued");
    if (!nextUpload) return;

    setUploads((prev) =>
      prev.map((u) =>
        u.id === nextUpload.id ? { ...u, status: "uploading" } : u
      )
    );

    const { xhr, promise } = api.uploadFile(
      nextUpload.file,
      nextUpload.folderId,
      (p) => {
        setUploads((prev) =>
          prev.map((u) => (u.id === nextUpload.id ? { ...u, progress: p } : u))
        );
      }
    );

    setUploads((prev) =>
      prev.map((u) => (u.id === nextUpload.id ? { ...u, xhr } : u))
    );

    try {
      const res = await promise;
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.detail || "Upload failed");
      }
      setUploads((prev) =>
        prev.map((u) =>
          u.id === nextUpload.id
            ? { ...u, status: "complete", progress: 100 }
            : u
        )
      );
      onUploadComplete();
    } catch (error) {
      if ((error as Error).message === "Upload cancelled.") {
        toast.info(`Upload of ${nextUpload.file.name} cancelled.`);
      } else {
        console.error(error);
        setUploads((prev) =>
          prev.map((u) =>
            u.id === nextUpload.id ? { ...u, status: "error" } : u
          )
        );
        toast.error(
          `Failed to upload ${nextUpload.file.name}: ${
            (error as Error).message
          }`
        );
      }
    }
  }, [uploads, onUploadComplete]);

  useEffect(() => {
    const nextUpload = uploads.find((u) => u.status === "queued");
    if (nextUpload) {
      processQueue();
    }
  }, [uploads, processQueue]);

  useEffect(() => {
    const finishedUploads = uploads.filter(
      (u) =>
        u.status === "complete" ||
        u.status === "error" ||
        u.status === "cancelled"
    );
    if (finishedUploads.length > 0) {
      const timer = setTimeout(() => {
        setUploads((prev) =>
          prev.filter((u) => !finishedUploads.some((fu) => fu.id === u.id))
        );
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [uploads]);

  return {
    uploads,
    uploadFiles,
    isMinimized,
    setIsMinimized,
    setUploads,
    cancelUpload,
  };
};

// --- UI COMPONENTS ---

const EmptyState: FC<{
  icon: IconName;
  title: string;
  description: string;
  children?: ReactNode;
}> = ({ icon, title, description, children }) => (
  <div className="text-center py-16 px-6 animate-fade-in">
    <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-gradient-to-br from-indigo-100 to-purple-100 mb-4 animate-bounce-in shadow-lg">
      <Icon name={icon} className="h-8 w-8 text-indigo-600" />
    </div>
    <h3 className="text-lg font-semibold text-slate-800">{title}</h3>
    <p className="text-slate-500 mt-1">{description}</p>
    <div className="mt-6 animate-slide-up">{children}</div>
  </div>
);

const FileListSkeleton: FC = () => (
  <div className="space-y-2 animate-fade-in">
    {[...Array(5)].map((_, i) => (
      <div key={i} className="flex items-center p-4 space-x-4 hover-lift">
        <Skeleton className="h-5 w-5 rounded skeleton-shimmer" />
        <Skeleton className="h-4 w-4/12 rounded skeleton-shimmer" />
        <Skeleton className="h-4 w-2/12 ml-auto rounded skeleton-shimmer" />
        <Skeleton className="h-4 w-3/12 rounded skeleton-shimmer" />
      </div>
    ))}
  </div>
);
const FileGridSkeleton: FC = () => (
  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 animate-fade-in">
    {[...Array(5)].map((_, i) => (
      <Card key={i} className="hover-lift">
        <CardHeader>
          <Skeleton className="h-10 w-10 skeleton-shimmer" />
        </CardHeader>
        <CardContent className="space-y-2">
          <Skeleton className="h-4 w-full skeleton-shimmer" />
          <Skeleton className="h-3 w-3/4 skeleton-shimmer" />
        </CardContent>
      </Card>
    ))}
  </div>
);

const FolderTreeView: FC<{
  nodes: FolderTreeNode[];
  selectedTarget: string | null;
  onSelectTarget: (id: string | null) => void;
  disabledIds?: Set<string>;
}> = ({ nodes, selectedTarget, onSelectTarget, disabledIds = new Set() }) => {
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(
    new Set()
  );

  const toggleFolder = (folderId: string) => {
    setExpandedFolders((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(folderId)) {
        newSet.delete(folderId);
      } else {
        newSet.add(folderId);
      }
      return newSet;
    });
  };

  const renderNodes = (nodes: FolderTreeNode[], level = 0) => {
    return nodes.map((node) => {
      const isExpanded = expandedFolders.has(node._id);
      const isDisabled = disabledIds.has(node._id);
      const hasChildren = node.children && node.children.length > 0;

      return (
        <div key={node._id} className="relative">
          {level > 0 && (
            <span className="absolute left-[-14px] top-0 h-full w-px bg-slate-300" />
          )}
          <div
            className={`flex items-center rounded-md transition-colors ${
              isDisabled
                ? "cursor-not-allowed opacity-50"
                : "cursor-pointer hover:bg-slate-200/60"
            } ${
              selectedTarget === node._id ? "bg-indigo-100 font-semibold" : ""
            }`}
            style={{ paddingLeft: `${level * 20}px` }}
            role="button"
            tabIndex={isDisabled ? -1 : 0}
            onKeyDown={(e) => {
              if (!isDisabled && (e.key === "Enter" || e.key === " ")) {
                e.preventDefault();
                onSelectTarget(node._id);
              }
            }}
            onClick={() => !isDisabled && onSelectTarget(node._id)}
          >
            <div
              className="flex h-7 w-7 items-center justify-center"
              onClick={() => hasChildren && toggleFolder(node._id)}
            >
              {hasChildren ? (
                <Icon
                  name="chevronRight"
                  className={`h-4 w-4 text-slate-500 transition-transform ${
                    isExpanded ? "rotate-90" : ""
                  }`}
                />
              ) : (
                <span className="w-4" />
              )}
            </div>

            <div
              className="flex flex-grow items-center gap-2 py-1.5"
              onClick={() => !isDisabled && onSelectTarget(node._id)}
            >
              <Icon name="folder" className="h-5 w-5 text-indigo-500" />
              <span className="truncate">{node.name}</span>
            </div>
          </div>

          {isExpanded && hasChildren && (
            <div className="relative pl-5">
              <span className="absolute left-[6px] top-0 h-full w-px bg-slate-300" />
              {renderNodes(node.children, level + 1)}
            </div>
          )}
        </div>
      );
    });
  };

  return <>{renderNodes(nodes)}</>;
};

const Sidebar: FC<{
  currentView: ViewType;
  onNavigate: (view: ViewType, folderId?: string | null) => void;
  storageUsage: StorageUsage | null;
  onLogout: () => void;
}> = ({ currentView, onNavigate, storageUsage, onLogout }) => {
  const navItems = [
    { id: "drive", name: "My Drive", icon: "folder" as IconName },
    { id: "starred", name: "Starred", icon: "star" as IconName },
    { id: "bin", name: "Bin", icon: "trash" as IconName },
    { id: "progress", name: "Progress", icon: "activity" as IconName },
  ];
  const totalStorage = 100 * 1024 * 1024 * 1024; // 100 GB mock
  const usagePercent = storageUsage
    ? (storageUsage.total_usage_bytes / totalStorage) * 100
    : 0;

  return (
    <div className="h-full w-full bg-gradient-to-b from-slate-50 to-slate-100 border-r flex flex-col p-4 smooth-transition">
      <div className="flex items-center gap-2.5 mb-8 px-2 animate-fade-in">
        <div className="p-2 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 shadow-lg">
          <Icon name="cloud" className="h-6 w-6 text-white" />
        </div>
        <h1 className="text-2xl font-bold text-slate-800">NetraDrive</h1>
      </div>
      <nav className="flex-grow space-y-1">
        {navItems.map((item, index) => (
          <a
            key={item.id}
            href={`#/${item.id}`}
            onClick={(e) => {
              e.preventDefault();
              onNavigate(item.id as ViewType);
            }}
            className={`flex items-center gap-3 px-3 py-2 rounded-lg text-slate-700 hover:bg-slate-200 smooth-transition hover-lift animate-slide-up ${
              currentView === item.id
                ? "bg-gradient-to-r from-indigo-100 to-purple-100 font-semibold shadow-sm"
                : ""
            }`}
            style={{ animationDelay: `${index * 0.1}s` }}
          >
            <Icon name={item.icon} className="h-5 w-5" />
            <span className="flex-1">{item.name}</span>
          </a>
        ))}
      </nav>
      <div className="px-2 animate-fade-in">
        <p className="text-sm font-medium mb-1 text-slate-700">Storage</p>
        <div className="w-full bg-slate-200 rounded-full h-2 mb-1 overflow-hidden">
          <div
            className="bg-gradient-to-r from-indigo-500 to-purple-600 h-2 rounded-full smooth-transition shadow-sm"
            style={{ width: `${usagePercent}%` }}
          ></div>
        </div>
        <p className="text-xs text-slate-500">
          {formatBytes(storageUsage?.total_usage_bytes || 0)} used
        </p>
      </div>
      <div className="border-t mt-4 pt-4">
        <a
          href="#"
          onClick={(e) => {
            e.preventDefault();
            onLogout();
          }}
          className="flex items-center gap-3 px-3 py-2 rounded-lg text-red-600 hover:bg-red-50 smooth-transition hover-lift"
        >
          <Icon name="logout" className="h-5 w-5" />
          Logout
        </a>
      </div>
    </div>
  );
};

const Header: FC<{
  breadcrumbs: Breadcrumb[];
  onNavigate: (folderId: string, index: number) => void;
  onSearch: (q: string) => void;
  children: ReactNode;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
}> = ({
  breadcrumbs,
  onNavigate,
  onSearch,
  children,
  viewMode,
  onViewModeChange,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const handleSearch = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    onSearch(searchQuery);
  };

  return (
    <header className="h-16 border-b flex items-center justify-between px-4 md:px-6 bg-white shrink-0">
      <div className="flex items-center text-sm min-w-0">
        {children}
        <nav className="flex items-center whitespace-nowrap overflow-auto">
          {breadcrumbs.map((crumb, index) => (
            <React.Fragment key={crumb.id}>
              <a
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  if (index < breadcrumbs.length - 1) {
                    onNavigate(crumb.id, index);
                  }
                }}
                className={`max-w-[100px] md:max-w-xs truncate ${
                  index < breadcrumbs.length - 1
                    ? "text-muted-foreground hover:underline"
                    : "text-slate-800 font-medium"
                }`}
              >
                {crumb.name}
              </a>
              {index < breadcrumbs.length - 1 && (
                <Icon
                  name="chevronRight"
                  className="h-4 w-4 mx-1 text-slate-400 shrink-0"
                />
              )}
            </React.Fragment>
          ))}
        </nav>
      </div>
      <div className="flex items-center gap-2">
        <form onSubmit={handleSearch} className="relative">
          <Icon
            name="search"
            className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400"
          />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search..."
            className="pl-9 w-32 md:w-64"
          />
        </form>
        <Button
          variant="ghost"
          size="icon"
          onClick={() =>
            onViewModeChange(viewMode === "list" ? "grid" : "list")
          }
        >
          <Icon
            name={viewMode === "list" ? "layoutGrid" : "layoutList"}
            className="h-5 w-5"
          />
        </Button>
      </div>
    </header>
  );
};

const BulkActionBar: FC<{
  selectedCount: number;
  onAction: (action: string) => void;
  onClear: () => void;
}> = ({ selectedCount, onAction, onClear }) => {
  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40">
      <Card className="shadow-2xl flex items-center gap-4 px-4 py-2">
        <p className="text-sm font-semibold whitespace-nowrap">
          {selectedCount} selected
        </p>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="gap-2"
            onClick={() => onAction("star")}
          >
            <Icon name="star" className="h-4 w-4" /> Star
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="gap-2"
            onClick={() => onAction("move")}
          >
            <Icon name="move" className="h-4 w-4" /> Move
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="gap-2 text-red-600 hover:text-red-700 hover:bg-red-50"
            onClick={() => onAction("bin")}
          >
            <Icon name="trash" className="h-4 w-4" /> Delete
          </Button>
        </div>
        <ContextMenuSeparator className="h-6" />
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={onClear}
        >
          <Icon name="x" className="h-4 w-4" />
        </Button>
      </Card>
    </div>
  );
};

const FileGridView: FC<{
  items: DriveItem[];
  onItemClick: (item: DriveItem) => void;
  onAction: (action: string, item: DriveItem) => void;
  selectedItems: Set<string>;
  onSelectionChange: (itemId: string, isSelected: boolean) => void;
}> = ({ items, onItemClick, onAction, selectedItems, onSelectionChange }) => {
  const renderContextMenu = (item: DriveItem) => (
    <ContextMenuContent>
      {item.type === "file" && (
        <ContextMenuItem onSelect={() => onAction("preview", item)}>
          <Icon name="eye" className="h-4 w-4 mr-2" /> Preview
        </ContextMenuItem>
      )}
      {item.type === "file" && (
        <ContextMenuItem onSelect={() => onAction("download", item)}>
          <Icon name="download" className="h-4 w-4 mr-2" /> Download
        </ContextMenuItem>
      )}
      {item.type === "file" && (
        <ContextMenuItem onSelect={() => onAction("share", item)}>
          <Icon name="share" className="h-4 w-4 mr-2" /> Share
        </ContextMenuItem>
      )}
      <ContextMenuItem onSelect={() => onAction("rename", item)}>
        <Icon name="edit" className="h-4 w-4 mr-2" /> Rename
      </ContextMenuItem>
      <ContextMenuItem onSelect={() => onAction("move", item)}>
        <Icon name="move" className="h-4 w-4 mr-2" /> Move
      </ContextMenuItem>
      <ContextMenuItem
        onSelect={() => onAction(item.is_starred ? "unstar" : "star", item)}
      >
        <Icon
          name="star"
          className={`h-4 w-4 mr-2 ${
            item.is_starred ? "fill-yellow-400 text-yellow-500" : ""
          }`}
        />
        {item.is_starred ? "Unstar" : "Star"}
      </ContextMenuItem>
      <ContextMenuSeparator />
      {!item.is_deleted ? (
        <ContextMenuItem
          onSelect={() => onAction("bin", item)}
          className="text-red-600 focus:text-red-600"
        >
          <Icon name="trash" className="h-4 w-4 mr-2" /> Move to Bin
        </ContextMenuItem>
      ) : (
        <>
          <ContextMenuItem onSelect={() => onAction("restore", item)}>
            <Icon name="restore" className="h-4 w-4 mr-2" /> Restore
          </ContextMenuItem>
          <ContextMenuItem
            onSelect={() => onAction("delete_permanent", item)}
            className="text-red-600 focus:text-red-600"
          >
            <Icon name="trash" className="h-4 w-4 mr-2" /> Delete Forever
          </ContextMenuItem>
        </>
      )}
    </ContextMenuContent>
  );

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
      {items.map((item) => (
        <ContextMenu key={item._id}>
          <ContextMenuTrigger>
            <Card
              className={`group transition-all duration-300 relative hover-lift ${
                selectedItems.has(item._id)
                  ? "bg-gradient-to-br from-indigo-50 to-purple-50 border-indigo-200 shadow-lg"
                  : "hover:bg-gradient-to-br hover:from-slate-50 hover:to-blue-50 hover:shadow-md"
              }`}
              onDoubleClick={() => onItemClick(item)}
            >
              <div
                className="absolute top-2 left-2 z-10"
                onClick={(e) => e.stopPropagation()}
              >
                <Checkbox
                  checked={selectedItems.has(item._id)}
                  onCheckedChange={(checked) =>
                    onSelectionChange(item._id, !!checked)
                  }
                />
              </div>
              <CardContent className="pt-6 flex flex-col items-center justify-center text-center cursor-pointer">
                <div className="p-3 rounded-lg bg-gradient-to-br from-slate-100 to-slate-200 mb-4 group-hover:from-indigo-100 group-hover:to-purple-100 smooth-transition shadow-sm">
                  <Icon
                    name={
                      item.type === "folder"
                        ? "folder"
                        : getFileIconName(item as FileItem)
                    }
                    className="h-12 w-12 text-slate-600 group-hover:text-indigo-600 smooth-transition"
                  />
                </div>
                <p
                  className="font-medium text-sm truncate w-full text-slate-800"
                  title={item.name}
                >
                  {item.name}
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  {formatBytes(item.size)}
                </p>
              </CardContent>
            </Card>
          </ContextMenuTrigger>
          {renderContextMenu(item)}
        </ContextMenu>
      ))}
    </div>
  );
};

const FileListView: FC<{
  items: DriveItem[];
  onItemClick: (item: DriveItem) => void;
  onAction: (action: string, item: DriveItem) => void;
  sortKey: SortKey;
  sortDirection: SortDirection;
  onSort: (key: SortKey) => void;
  selectedItems: Set<string>;
  onSelectionChange: (itemId: string, isSelected: boolean) => void;
  onSelectAll: (isSelected: boolean) => void;
}> = ({
  items,
  onItemClick,
  onAction,
  sortKey,
  sortDirection,
  onSort,
  selectedItems,
  onSelectionChange,
  onSelectAll,
}) => {
  const isAllSelected = items.length > 0 && selectedItems.size === items.length;

  const SortableHeader: FC<{ headerKey: SortKey; children: ReactNode }> = ({
    headerKey,
    children,
  }) => (
    <th
      className="font-medium p-4 cursor-pointer hover:bg-slate-50"
      onClick={() => onSort(headerKey)}
    >
      <div className="flex items-center gap-2">
        {children}
        {sortKey === headerKey ? (
          sortDirection === "asc" ? (
            <Icon name="chevronUp" className="h-4 w-4" />
          ) : (
            <Icon name="chevronDown" className="h-4 w-4" />
          )
        ) : (
          <Icon name="chevronDown" className="h-4 w-4 text-transparent" />
        )}
      </div>
    </th>
  );

  const renderContextMenu = (item: DriveItem) => (
    <ContextMenuContent>
      {item.type === "file" && (
        <ContextMenuItem onSelect={() => onAction("preview", item)}>
          <Icon name="eye" className="h-4 w-4 mr-2" /> Preview
        </ContextMenuItem>
      )}
      {item.type === "file" && (
        <ContextMenuItem onSelect={() => onAction("download", item)}>
          <Icon name="download" className="h-4 w-4 mr-2" /> Download
        </ContextMenuItem>
      )}
      {item.type === "file" && (
        <ContextMenuItem onSelect={() => onAction("share", item)}>
          <Icon name="share" className="h-4 w-4 mr-2" /> Share
        </ContextMenuItem>
      )}
      <ContextMenuItem onSelect={() => onAction("rename", item)}>
        <Icon name="edit" className="h-4 w-4 mr-2" /> Rename
      </ContextMenuItem>
      <ContextMenuItem onSelect={() => onAction("move", item)}>
        <Icon name="move" className="h-4 w-4 mr-2" /> Move
      </ContextMenuItem>
      <ContextMenuItem
        onSelect={() => onAction(item.is_starred ? "unstar" : "star", item)}
      >
        <Icon
          name="star"
          className={`h-4 w-4 mr-2 ${
            item.is_starred ? "fill-yellow-400 text-yellow-500" : ""
          }`}
        />
        {item.is_starred ? "Unstar" : "Star"}
      </ContextMenuItem>
      <ContextMenuSeparator />
      {!item.is_deleted ? (
        <ContextMenuItem
          onSelect={() => onAction("bin", item)}
          className="text-red-600 focus:text-red-600"
        >
          <Icon name="trash" className="h-4 w-4 mr-2" /> Move to Bin
        </ContextMenuItem>
      ) : (
        <>
          <ContextMenuItem onSelect={() => onAction("restore", item)}>
            <Icon name="restore" className="h-4 w-4 mr-2" /> Restore
          </ContextMenuItem>
          <ContextMenuItem
            onSelect={() => onAction("delete_permanent", item)}
            className="text-red-600 focus:text-red-600"
          >
            <Icon name="trash" className="h-4 w-4 mr-2" /> Delete Forever
          </ContextMenuItem>
        </>
      )}
    </ContextMenuContent>
  );

  return (
    <>
      <div className="hidden md:block">
        <table className="w-full text-sm">
          <thead className="text-left text-muted-foreground">
            <tr>
              <th className="p-4 w-12">
                <Checkbox
                  checked={isAllSelected}
                  onCheckedChange={(checked) => onSelectAll(!!checked)}
                />
              </th>
              <SortableHeader headerKey="name">Name</SortableHeader>
              <SortableHeader headerKey="size">Size</SortableHeader>
              <SortableHeader headerKey="created_at">Created</SortableHeader>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <ContextMenu key={item._id}>
                <ContextMenuTrigger asChild>
                  <tr
                    className={`border-b group transition-colors cursor-pointer ${
                      selectedItems.has(item._id)
                        ? "bg-indigo-50"
                        : "hover:bg-slate-50"
                    }`}
                    onDoubleClick={() => onItemClick(item)}
                  >
                    <td className="p-4" onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        checked={selectedItems.has(item._id)}
                        onCheckedChange={(checked) =>
                          onSelectionChange(item._id, !!checked)
                        }
                      />
                    </td>
                    <td className="p-4 font-medium flex items-center gap-3">
                      <Icon
                        name={
                          item.type === "folder"
                            ? "folder"
                            : getFileIconName(item as FileItem)
                        }
                        className="h-5 w-5 text-slate-600 shrink-0"
                      />
                      <span className="truncate">{item.name}</span>
                    </td>
                    <td className="p-4 text-muted-foreground">
                      {formatBytes(item.size)}
                    </td>
                    <td className="p-4 text-muted-foreground">
                      {formatDate(item.created_at)}
                    </td>
                  </tr>
                </ContextMenuTrigger>
                {renderContextMenu(item)}
              </ContextMenu>
            ))}
          </tbody>
        </table>
      </div>
      <div className="md:hidden">
        <FileGridView
          items={items}
          onItemClick={onItemClick}
          onAction={onAction}
          selectedItems={selectedItems}
          onSelectionChange={onSelectionChange}
        />
      </div>
    </>
  );
};

const ProgressSkeleton: FC = () => (
  <div className="space-y-4 animate-fade-in">
    {[...Array(3)].map((_, i) => (
      <Card key={i} className="p-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex-grow min-w-0">
            <div className="flex items-center gap-3 mb-2">
              <Skeleton className="h-5 w-5 rounded shrink-0" />
              <Skeleton className="h-5 w-48 rounded" />
            </div>
            <div className="w-full bg-slate-200 rounded-full h-2 mb-2 overflow-hidden">
              <Skeleton className="h-2 w-3/4 rounded-full skeleton-shimmer" />
            </div>
            <div className="flex flex-wrap justify-between text-xs gap-x-4 gap-y-1">
              <Skeleton className="h-3 w-16 rounded" />
              <Skeleton className="h-3 w-8 rounded" />
              <Skeleton className="h-3 w-12 rounded" />
              <Skeleton className="h-3 w-20 rounded" />
            </div>
          </div>
          <div className="flex-shrink-0 flex sm:flex-col items-center justify-between">
            <Skeleton className="h-6 w-20 rounded-full" />
            <Skeleton className="h-8 w-16 rounded mt-0 sm:mt-2" />
          </div>
        </div>
      </Card>
    ))}
  </div>
);

const ProgressPage: FC<{ children: ReactNode }> = ({ children }) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const { access } = api.getTokens();
  const [user, setUser] = useState<JwtPayload | null>(null);
  const isInitialLoad = useRef(true);

  useEffect(() => {
    if (access) {
      const decoded: JwtPayload = jwtDecode(access) as JwtPayload;
      setUser(decoded);
    }
  }, [access]);

  const fetchTasks = useCallback(async () => {
    if (!user?.sub) {
      if (isInitialLoad.current) setLoading(false);
      return;
    }
    try {
      const res = await api.getTasks(user.sub);
      if (!res.ok) throw new Error("Failed to fetch tasks");
      const data = await res.json();
      setTasks(data);
    } catch (error) {
      console.error(error);
      if (!isInitialLoad.current) toast.error("Could not update tasks.");
    } finally {
      if (isInitialLoad.current) {
        setLoading(false);
        isInitialLoad.current = false;
      }
    }
  }, [user?.sub]);

  useEffect(() => {
    if (!user?.sub) return;

    isInitialLoad.current = true;
    setLoading(true);

    // Use a local variable to track if the component is still mounted
    let mounted = true;
    let timeoutId: number;

    const pollTasks = async () => {
      await fetchTasks();
      if (mounted) {
        timeoutId = window.setTimeout(pollTasks, 2000);
      }
    };

    pollTasks();

    return () => {
      mounted = false;
      window.clearTimeout(timeoutId);
    };
  }, [user?.sub, fetchTasks]);

  const handleCancel = async (taskId: string) => {
    try {
      const res = await api.cancelTask(taskId);
      if (!res.ok) throw new Error("Failed to cancel task");
      toast.success("Task cancellation requested.");
      fetchTasks();
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (err) {
      toast.error("Failed to cancel task.");
    }
  };

  const TaskCard: FC<{ task: Task }> = ({ task }) => (
    <Card className="p-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex-grow min-w-0">
          <div className="flex items-center gap-3 mb-2">
            <Icon name="file" className="h-5 w-5 text-slate-600 shrink-0" />
            <p className="font-semibold truncate" title={task.file_name}>
              {task.file_name}
            </p>
          </div>
          <div className="w-full bg-slate-200 rounded-full h-2 mb-2">
            <div
              className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${task.progress_percent}%` }}
            ></div>
          </div>
          <div className="flex flex-wrap justify-between text-xs text-muted-foreground gap-x-4 gap-y-1">
            <span>{`${task.transferred_hr} / ${task.total_hr}`}</span>
            <span>{Math.round(task.progress_percent)}%</span>
            <span>{formatBytes(task.speed_bytes_per_sec)}/s</span>
            <span>ETA: {task.eta_friendly}</span>
          </div>
        </div>
        <div className="flex-shrink-0 flex sm:flex-col items-center justify-between">
          <span className="text-sm font-medium capitalize px-2 py-1 rounded-full bg-slate-100 text-slate-700">
            {task.status.replace("_", " ")}
          </span>
          {task.can_cancel && (
            <Button
              variant="destructive"
              size="sm"
              className="mt-0 sm:mt-2"
              onClick={() => handleCancel(task.task_id)}
            >
              Cancel
            </Button>
          )}
        </div>
      </div>
    </Card>
  );

  return (
    <div className="h-full flex flex-col min-w-0 bg-white w-full">
      <header className="h-16 border-b flex items-center justify-between px-4 md:px-6 bg-white shrink-0">
        <div className="flex items-center text-sm min-w-0">
          {children}
          <h2 className="text-xl font-semibold">Transfer Progress</h2>
        </div>
      </header>
      <main className="flex-grow p-4 md:p-6 overflow-auto">
        {loading ? (
          <ProgressSkeleton />
        ) : tasks.length > 0 ? (
          <div className="space-y-4">
            {tasks.map((task) => (
              <TaskCard key={task.task_id} task={task} />
            ))}
          </div>
        ) : (
          <EmptyState
            icon="checkCircle"
            title="No Active Transfers"
            description="All your transfers are complete."
          />
        )}
      </main>
    </div>
  );
};

const DrivePage: FC<{
  path: AppPath;
  onNavigate: (view: ViewType, folderId?: string | null) => void;
  onSearch: (query: string) => void;
  refreshKey: number;
  children: ReactNode;
  uploadFiles: (files: File[], folderId: string | null) => void;
}> = ({ path, onNavigate, onSearch, refreshKey, children, uploadFiles }) => {
  const [items, setItems] = useState<DriveItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [breadcrumbs, setBreadcrumbs] = useState<Breadcrumb[]>([]);
  const [modal, setModal] = useState<ModalState>({ type: null, data: null });
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [isDragging, setIsDragging] = useState(false);

  const { view, folderId } = path;
  const isBin = view === "bin";
  const isStarred = view === "starred";

  const fetchData = useCallback(
    async (currentFolderId: string | null) => {
      setLoading(true);
      setSelectedItems(new Set());
      try {
        const [foldersRes, filesRes] = await Promise.all([
          api.listFolders(currentFolderId, isBin, isStarred),
          api.listFiles(currentFolderId, isBin, isStarred),
        ]);
        if (!foldersRes.ok || !filesRes.ok)
          throw new Error("Failed to fetch data.");

        const foldersData = (await foldersRes.json()) as Folder[];
        const filesData = (await filesRes.json()) as FileItem[];

        setItems([
          ...foldersData.map((f) => ({
            ...f,
            type: "folder" as const,
            id: f._id,
          })),
          ...filesData.map((f) => ({ ...f, type: "file" as const, id: f._id })),
        ]);
      } catch (error) {
        console.error(error);
        toast.error("Failed to load files.");
      } finally {
        setLoading(false);
      }
    },
    [isBin, isStarred]
  );

  useEffect(() => {
    if (view === "drive") {
      fetchData(folderId);
    } else if (view === "starred" || view === "bin") {
      fetchData(null);
    }
  }, [folderId, view, fetchData, refreshKey]);

  useEffect(() => {
    const fetchPath = async (currentFolderId: string) => {
      try {
        setBreadcrumbs([
          { id: "root", name: "My Drive" },
          { id: currentFolderId, name: "Loading..." },
        ]);
        const res = await api.getFolderPath(currentFolderId);
        if (!res.ok) throw new Error("Failed to fetch path");
        const pathData = (await res.json()) as Breadcrumb[];
        const newCrumbs = [{ id: "root", name: "My Drive" }, ...pathData];
        setBreadcrumbs(newCrumbs);
      } catch (error) {
        console.error("Breadcrumb path fetch failed:", error);
        toast.error("Could not load the full folder path.");
        setBreadcrumbs([
          { id: "root", name: "My Drive" },
          { id: currentFolderId, name: "..." },
        ]);
      }
    };

    if (view === "drive") {
      if (folderId && folderId !== "root") {
        fetchPath(folderId);
      } else if (!folderId || folderId === "root") {
        setBreadcrumbs([{ id: "root", name: "My Drive" }]);
      }
    } else if (view === "starred") {
      setBreadcrumbs([{ id: "starred", name: "Starred" }]);
    } else if (view === "bin") {
      setBreadcrumbs([{ id: "bin", name: "Bin" }]);
    } else if (view === "search" && path.searchQuery) {
      setBreadcrumbs([
        { id: "search", name: `Search for "${path.searchQuery}"` },
      ]);
    }
  }, [view, folderId, path.searchQuery]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDirection("asc");
    }
  };

  const sortedItems = useMemo(() => {
    return [...items].sort((a, b) => {
      if (a.type !== b.type) return a.type === "folder" ? -1 : 1;
      const aVal = a[sortKey],
        bVal = b[sortKey];
      let comparison = 0;
      if (aVal === undefined || aVal === null) comparison = 1;
      else if (bVal === undefined || bVal === null) comparison = -1;
      else if (typeof aVal === "string" && typeof bVal === "string")
        comparison = aVal.localeCompare(bVal);
      else if (typeof aVal === "number" && typeof bVal === "number")
        comparison = aVal - bVal;
      return sortDirection === "asc" ? comparison : -comparison;
    });
  }, [items, sortKey, sortDirection]);

  const handleItemClick = (item: DriveItem) => {
    if (item.type === "folder" && view === "drive") {
      setBreadcrumbs((prev) => [...prev, { id: item._id, name: item.name }]);
      onNavigate("drive", item._id);
    } else {
      handleAction("preview", [item]);
    }
  };

  const handleBreadcrumbNavigate = (crumbId: string, index: number) => {
    if (view !== "drive") return;
    setBreadcrumbs((prev) => prev.slice(0, index + 1));
    onNavigate("drive", crumbId === "root" ? null : crumbId);
  };

  const handleAction = async (
    action: string,
    item: DriveItem | DriveItem[]
  ) => {
    const targetItems = Array.isArray(item) ? item : [item];
    if (targetItems.length === 0) return;

    switch (action) {
      case "rename":
      case "delete_permanent":
        setModal({ type: action, data: targetItems[0] });
        break;
      case "move":
        setModal({ type: action, data: targetItems });
        break;
      case "download":
        if (targetItems.length > 1) {
          toast.info("Bulk download is not yet supported.");
          return;
        }
        try {
          if (targetItems[0].type !== "file") return;
          const toastId = toast.loading("Preparing download...");

          // Generate a direct link instead of downloading to Blob
          const res = await api.generateShareLink(targetItems[0]._id);
          if (!res.ok) throw new Error("Could not generate download link");

          const linkData = await res.json();
          const downloadUrl = `${API_ROOT}/s/${linkData._id}`;

          // Create a temporary link element to force download
          const link = document.createElement("a");
          link.href = downloadUrl;
          link.setAttribute("download", targetItems[0].name);
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);

          toast.dismiss(toastId);
          toast.success("Download started.");
        } catch (e) {
          toast.error(`Download failed: ${(e as Error).message}`);
        }
        break;
      case "preview": {
        if (targetItems[0].type !== "file") return;

        // Open the specialized Preview Modal (logic moved to Modals component)
        setModal({ type: "preview", data: targetItems[0] });
        break;
      }
      case "share":
        setModal({ type: "share", data: targetItems[0] });
        break;
      case "star":
      case "unstar":
        await Promise.all(
          targetItems.map((i) =>
            action === "star"
              ? api.starItem(i.type, i._id)
              : api.unstarItem(i.type, i._id)
          )
        );
        toast.success(
          `${targetItems.length} item(s) ${
            action === "star" ? "starred" : "unstarred"
          }.`
        );
        fetchData(folderId);
        break;
      case "bin": {
        const promises = targetItems.map((i) =>
          i.type === "folder"
            ? api.moveFolderToBin(i._id)
            : api.moveFileToBin(i._id)
        );
        await Promise.all(promises);

        toast(`${targetItems.length} item(s) moved to bin.`, {
          action: {
            label: "Undo",
            onClick: async () => {
              const restorePromises = targetItems.map((i) =>
                i.type === "folder"
                  ? api.restoreFolder(i._id)
                  : api.restoreFile(i._id)
              );
              await Promise.all(restorePromises);
              toast.success(`${targetItems.length} item(s) restored.`);
              fetchData(folderId);
            },
          },
          duration: 5000,
        });
        fetchData(folderId);
        break;
      }
      case "restore":
        await Promise.all(
          targetItems.map((i) =>
            i.type === "folder"
              ? api.restoreFolder(i._id)
              : api.restoreFile(i._id)
          )
        );
        toast.success(`${targetItems.length} item(s) restored.`);
        fetchData(folderId);
        break;
    }
  };
  const handleModalClose = (refresh = false) => {
    setModal({ type: null, data: null });
    if (refresh) fetchData(folderId);
  };

  const handleSearch = async (query: string) => {
    if (!query) {
      onNavigate("drive");
      return;
    }
    setLoading(true);
    try {
      const res = await api.search(query);
      if (res?.ok) {
        const data = await res.json();
        setItems([
          ...data.folders.map((f: Folder) => ({
            ...f,
            type: "folder",
            id: f._id,
          })),
          ...data.files.map((f: FileItem) => ({
            ...f,
            type: "file",
            id: f._id,
          })),
        ]);
        onSearch(query);
      } else {
        const error = await res.json();
        throw new Error(error.detail || "Search failed");
      }
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const openUploadModal = () => setModal({ type: "upload", data: null });

  const handleSelectionChange = (itemId: string, isSelected: boolean) => {
    setSelectedItems((prev) => {
      const newSet = new Set(prev);
      if (isSelected) newSet.add(itemId);
      else newSet.delete(itemId);
      return newSet;
    });
  };
  const handleSelectAll = (isSelected: boolean) => {
    if (isSelected) {
      setSelectedItems(new Set(items.map((item) => item._id)));
    } else {
      setSelectedItems(new Set());
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (view === "drive" && !isBin) setIsDragging(true);
  };
  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (view === "drive" && !isBin) {
      const files = Array.from(e.dataTransfer.files);
      if (files.length > 0) {
        uploadFiles(files, folderId || "root");
      }
    }
  };

  const handleBulkAction = (action: string) => {
    const itemsToAction = items.filter((item) => selectedItems.has(item._id));
    handleAction(action, itemsToAction);
  };

  const getEmptyState = () => {
    if (view === "starred")
      return {
        icon: "star" as IconName,
        title: "No Starred Files",
        description: "Add stars to files and folders to easily find them here.",
      };
    if (view === "bin")
      return {
        icon: "trash" as IconName,
        title: "Bin is Empty",
        description:
          "Items in the bin will be permanently deleted after 30 days.",
      };
    return {
      icon: "folder" as IconName,
      title: "Folder is empty",
      description: "Drag and drop files here or use the buttons to upload.",
    };
  };
  const emptyState = getEmptyState();

  return (
    <div className="h-full flex flex-col min-w-0 bg-white w-full">
      <Header
        breadcrumbs={breadcrumbs}
        onNavigate={handleBreadcrumbNavigate}
        onSearch={handleSearch}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
      >
        {children}
      </Header>
      <main
        className="flex-grow p-4 md:p-6 overflow-auto relative bg-white/50 backdrop-blur-sm"
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {isDragging && (
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/20 to-purple-600/20 border-4 border-dashed border-indigo-500 rounded-xl flex items-center justify-center z-30 pointer-events-none animate-bounce-in">
            <div className="text-center text-indigo-700 font-semibold">
              <div className="p-4 rounded-full bg-white/80 backdrop-blur-sm shadow-xl">
                <Icon
                  name="upload"
                  className="h-16 w-16 mx-auto animate-pulse"
                />
              </div>
              <p className="text-xl mt-4 text-slate-800">
                Drop files to upload
              </p>
              <p className="text-sm mt-2 opacity-80 text-slate-600">
                Release to start uploading
              </p>
            </div>
          </div>
        )}
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">
            {breadcrumbs[breadcrumbs.length - 1]?.name}
          </h2>
          {view === "drive" && (
            <div className="flex gap-2">
              <Button
                onClick={openUploadModal}
                variant="outline"
                className="gap-2"
              >
                <Icon name="upload" className="h-4 w-4" />
                <span className="hidden sm:inline">Upload</span>
              </Button>
              <Button
                onClick={() => setModal({ type: "create_folder", data: null })}
                className="gap-2"
              >
                <Icon name="plus" className="h-4 w-4" />
                <span className="hidden sm:inline">Create Folder</span>
              </Button>
            </div>
          )}
        </div>
        {loading ? (
          viewMode === "list" ? (
            <FileListSkeleton />
          ) : (
            <FileGridSkeleton />
          )
        ) : items.length > 0 ? (
          viewMode === "list" ? (
            <FileListView
              items={sortedItems}
              onItemClick={handleItemClick}
              onAction={(action, item) => handleAction(action, [item])}
              sortKey={sortKey}
              sortDirection={sortDirection}
              onSort={handleSort}
              selectedItems={selectedItems}
              onSelectionChange={handleSelectionChange}
              onSelectAll={handleSelectAll}
            />
          ) : (
            <FileGridView
              items={sortedItems}
              onItemClick={handleItemClick}
              onAction={(action, item) => handleAction(action, [item])}
              selectedItems={selectedItems}
              onSelectionChange={handleSelectionChange}
            />
          )
        ) : (
          <EmptyState
            icon={emptyState.icon}
            title={emptyState.title}
            description={emptyState.description}
          >
            {view === "drive" && (
              <Button onClick={openUploadModal} className="gap-2">
                <Icon name="upload" className="h-4 w-4" />
                Upload File
              </Button>
            )}
          </EmptyState>
        )}
      </main>
      <Modals
        modal={modal}
        onClose={handleModalClose}
        currentFolderId={folderId || "root"}
        uploadFiles={uploadFiles}
      />
      {selectedItems.size > 0 && (
        <BulkActionBar
          selectedCount={selectedItems.size}
          onAction={handleBulkAction}
          onClear={() => setSelectedItems(new Set())}
        />
      )}
    </div>
  );
};

const Modals: FC<{
  modal: ModalState;
  onClose: (refresh?: boolean) => void;
  currentFolderId: string;
  uploadFiles: (files: File[], folderId: string | null) => void;
}> = ({ modal, onClose, currentFolderId, uploadFiles }) => {
  const [folderTree, setFolderTree] = useState<FolderTreeNode[]>([]);
  const [selectedMoveTarget, setSelectedMoveTarget] = useState<string | null>(
    null
  );
  const [shareLink, setShareLink] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const getDisabledIds = useMemo(() => {
    if (modal.type !== "move" || !modal.data) return new Set<string>();

    const items = Array.isArray(modal.data) ? modal.data : [modal.data];
    const folderItems = items.filter((i) => i.type === "folder");
    if (folderItems.length === 0) return new Set<string>();

    const disabled = new Set<string>();
    const queue: DriveItem[] = [...folderItems];

    const allFolders = new Map<string, FolderTreeNode>();
    const flattenTree = (nodes: FolderTreeNode[]) => {
      for (const node of nodes) {
        allFolders.set(node._id, node);
        if (node.children) flattenTree(node.children);
      }
    };
    flattenTree(folderTree);

    while (queue.length > 0) {
      const current = queue.shift();
      if (!current) continue;

      disabled.add(current._id);
      const treeNode = allFolders.get(current._id);
      if (treeNode && treeNode.children) {
        queue.push(...treeNode.children);
      }
    }
    return disabled;
  }, [modal.type, modal.data, folderTree]);

  const copyToClipboard = () => {
    if (shareLink) {
      navigator.clipboard.writeText(shareLink);
      toast.success("Link copied!");
    }
  };

  useEffect(() => {
    if (modal.type === "move" && modal.data) {
      const fetchTree = async () => {
        try {
          const res = await api.getFolderTree();
          if (res?.ok) setFolderTree(await res.json());
        } catch {
          toast.error("Could not load folder tree.");
        }
      };
      fetchTree();
      const firstItem = Array.isArray(modal.data) ? modal.data[0] : modal.data;
      if (firstItem) {
        setSelectedMoveTarget(
          firstItem.type === "folder"
            ? (firstItem as Folder).parent_id
            : (firstItem as FileItem).folder_id
        );
      }
    }

    // Fetch streaming link for Share/Preview
    if (modal.type === "share" || modal.type === "preview") {
      const item = modal.data as FileItem;
      if (item && item.type === "file") {
        api
          .generateShareLink(item._id)
          .then((res) => res.json())
          .then((data) => {
            const url = `${API_ROOT}/s/${data._id}`;
            setShareLink(url);
            if (modal.type === "preview") setPreviewUrl(url);
          })
          .catch(() => toast.error("Failed to generate link."));
      }
    } else {
      setShareLink(null);
      setPreviewUrl(null);
    }
  }, [modal.type, modal.data]);

  const handleCreateFolder = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const folderName = (
      e.currentTarget.elements.namedItem("folderName") as HTMLInputElement
    ).value;
    const res = await api.createFolder(
      folderName,
      currentFolderId === "root" ? null : currentFolderId
    );
    if (res?.ok) {
      toast.success(`Folder "${folderName}" created.`);
      onClose(true);
    } else {
      toast.error("Failed to create folder.");
    }
  };
  const handleRename = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const newName = (
      e.currentTarget.elements.namedItem("newName") as HTMLInputElement
    ).value;
    const item = modal.data as DriveItem;
    const res = await api.renameItem(item.type, item._id, newName);
    if (res?.ok) {
      toast.success("Item renamed.");
      onClose(true);
    } else {
      toast.error("Rename failed.");
    }
  };
  const handleDeletePermanent = async () => {
    const item = modal.data as DriveItem;
    if (item.type === "folder") await api.permanentlyDeleteFolder(item._id);
    else await api.permanentlyDeleteFile(item._id);
    toast.success("Item permanently deleted.");
    onClose(true);
  };
  const handleMove = async () => {
    const itemsToMove = modal.data as DriveItem[];
    const promises = itemsToMove.map((item) =>
      api.moveItem(item.type, item._id, selectedMoveTarget)
    );
    const results = await Promise.allSettled(promises);

    const successfulMoves = results.filter(
      (r) => r.status === "fulfilled"
    ).length;
    if (successfulMoves > 0) {
      toast.success(`${successfulMoves} item(s) moved.`);
    }
    if (successfulMoves < itemsToMove.length) {
      toast.error(
        `${itemsToMove.length - successfulMoves} item(s) failed to move.`
      );
    }
    onClose(true);
  };

  const modalDataAsArray = useMemo(() => {
    if (!modal.data) return [];
    return Array.isArray(modal.data) ? modal.data : [modal.data];
  }, [modal.data]);

  return (
    <>
      <UploadModal
        isOpen={modal.type === "upload"}
        onClose={onClose}
        currentFolderId={currentFolderId}
        uploadFiles={uploadFiles}
      />
      <Dialog
        open={modal.type === "create_folder"}
        onOpenChange={() => onClose()}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Folder</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateFolder}>
            <Input
              name="folderName"
              placeholder="Folder name"
              required
              autoFocus
            />
            <DialogFooter className="mt-4">
              <Button type="button" variant="outline" onClick={() => onClose()}>
                Cancel
              </Button>
              <Button type="submit">Create</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      <Dialog open={modal.type === "rename"} onOpenChange={() => onClose()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename {(modal.data as DriveItem)?.type}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleRename}>
            <Input
              name="newName"
              defaultValue={(modal.data as DriveItem)?.name}
              required
              autoFocus
            />
            <DialogFooter className="mt-4">
              <Button type="button" variant="outline" onClick={() => onClose()}>
                Cancel
              </Button>
              <Button type="submit">Rename</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      <Dialog open={modal.type === "move"} onOpenChange={() => onClose()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Move {modalDataAsArray.length} Item(s)</DialogTitle>
          </DialogHeader>
          <div className="max-h-64 overflow-y-auto border rounded-md p-2 bg-slate-50/50">
            <div
              onClick={() => setSelectedMoveTarget(null)}
              className={`flex cursor-pointer items-center gap-2 rounded-md py-1.5 pl-2 pr-2 transition-colors hover:bg-slate-200/60 ${
                selectedMoveTarget === null ? "bg-indigo-100 font-semibold" : ""
              }`}
            >
              <Icon name="folder" className="h-5 w-5 text-indigo-500" />
              My Drive (root)
            </div>
            <FolderTreeView
              nodes={folderTree}
              selectedTarget={selectedMoveTarget}
              onSelectTarget={setSelectedMoveTarget}
              disabledIds={getDisabledIds}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onClose()}>
              Cancel
            </Button>
            <Button onClick={handleMove}>Move Here</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog
        open={modal.type === "delete_permanent"}
        onOpenChange={() => onClose()}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Deletion</DialogTitle>
          </DialogHeader>
          <p>
            Are you sure you want to permanently delete "
            {(modal.data as DriveItem)?.name}"? This action cannot be undone.
          </p>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onClose()}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeletePermanent}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 3. ADD SHARE MODAL */}
      <Dialog open={modal.type === "share"} onOpenChange={() => onClose()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Share File</DialogTitle>
          </DialogHeader>
          <div className="flex gap-2 mt-4">
            <Input value={shareLink || "Generating..."} readOnly />
            <Button
              size="icon"
              variant="outline"
              onClick={copyToClipboard}
              disabled={!shareLink}
            >
              <Icon name="copy" className="h-4 w-4" />
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* 4. ADD PREVIEW MODAL (With Video Support) */}
      <Dialog open={modal.type === "preview"} onOpenChange={() => onClose()}>
        <DialogContent className="max-w-4xl w-full h-[80vh] p-0 bg-black border-none flex flex-col">
          <div className="flex justify-between items-center p-2 bg-slate-900 text-white">
            <span className="truncate pl-2">
              {(modal.data as DriveItem)?.name}
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="text-white"
              onClick={() => onClose()}
            >
              <Icon name="x" className="h-5 w-5" />
            </Button>
          </div>
          <div className="flex-grow flex items-center justify-center bg-black overflow-hidden">
            {!previewUrl ? (
              <Icon
                name="spinner"
                className="h-10 w-10 text-white animate-spin"
              />
            ) : (modal.data as FileItem)?.mime_type.startsWith("video/") ? (
              <video
                controls
                autoPlay
                className="max-h-full max-w-full"
                src={previewUrl}
              />
            ) : (modal.data as FileItem)?.mime_type.startsWith("image/") ? (
              <img
                src={previewUrl}
                alt="Preview"
                className="max-h-full max-w-full object-contain"
              />
            ) : (
              <iframe
                src={previewUrl}
                className="w-full h-full border-none bg-white"
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

const UploadModal: FC<{
  isOpen: boolean;
  onClose: (refresh?: boolean) => void;
  currentFolderId: string;
  uploadFiles: (files: File[], folderId: string | null) => void;
}> = ({ isOpen, onClose, currentFolderId, uploadFiles }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [folderTree, setFolderTree] = useState<FolderTreeNode[]>([]);
  const [selectedUploadTarget, setSelectedUploadTarget] = useState<
    string | null
  >(null);

  useEffect(() => {
    if (isOpen) {
      const initialTarget = currentFolderId === "root" ? null : currentFolderId;
      setSelectedUploadTarget(initialTarget);

      const fetchTree = async () => {
        try {
          const res = await api.getFolderTree();
          if (res?.ok) {
            setFolderTree(await res.json());
          } else {
            throw new Error("Failed to fetch folder tree");
          }
        } catch (error) {
          console.error(error);
          toast.error("Could not load folder structure for upload selection.");
        }
      };
      fetchTree();
    }
  }, [isOpen, currentFolderId]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      uploadFiles(files, selectedUploadTarget);
      onClose(true);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={() => onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Upload Files</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          Select a destination folder for your upload. The current folder is
          selected by default.
        </p>
        <div className="my-4 max-h-64 overflow-y-auto rounded-md border bg-slate-50/50 p-2">
          <div
            onClick={() => setSelectedUploadTarget(null)}
            className={`flex cursor-pointer items-center gap-2 rounded-md py-1.5 pl-2 pr-2 transition-colors hover:bg-slate-200/60 ${
              selectedUploadTarget === null ? "bg-indigo-100 font-semibold" : ""
            }`}
          >
            <Icon name="folder" className="h-5 w-5 text-indigo-500" />
            My Drive (root)
          </div>

          <FolderTreeView
            nodes={folderTree}
            selectedTarget={selectedUploadTarget}
            onSelectTarget={setSelectedUploadTarget}
          />
        </div>
        <input
          type="file"
          multiple
          ref={fileInputRef}
          onChange={handleFileSelect}
          className="hidden"
        />
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onClose()}>
            Cancel
          </Button>
          <Button onClick={() => fileInputRef.current?.click()}>
            Select Files to Upload
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// --- LOGOUT CONFIRMATION MODAL ---
// ====================================
const LogoutConfirmationModal: FC<{
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}> = ({ isOpen, onClose, onConfirm }) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Confirm Logout</DialogTitle>
        </DialogHeader>
        <p>Are you sure you want to log out of NetraDrive?</p>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={onConfirm}>
            Logout
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// --- MAIN APP ---
// ============================================================================
const getPathFromHash = (): AppPath => {
  const hash = window.location.hash.replace(/^#\/?/, "");

  // Ignore auth routes
  if (
    hash.startsWith("forgot-password") ||
    hash.startsWith("verify-email") ||
    hash.startsWith("reset-password")
  ) {
    return { view: "drive", folderId: null };
  }

  const [view, ...rest] = hash.split("/");
  const folderId = rest.join("/") || null;

  const newPath: AppPath = {
    view: (view as ViewType) || "drive",
    folderId: folderId,
  };

  if (view === "search") {
    return {
      view: "search",
      folderId: null,
      searchQuery: decodeURIComponent(rest.join("/") || ""),
    };
  }

  if (
    !["drive", "starred", "bin", "search", "progress"].includes(newPath.view)
  ) {
    newPath.view = "drive";
  }
  return newPath;
};
export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(
    !!api.getTokens().access
  );
  const [path, setPath] = useState<AppPath>(getPathFromHash());
  const [storageUsage, setStorageUsage] = useState<StorageUsage | null>(null);
  const [isMobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);

  const {
    uploads,
    uploadFiles,
    isMinimized,
    setIsMinimized,
    setUploads,
    cancelUpload,
  } = useUploader(() => {
    setRefreshKey((k) => k + 1);
  });

  const handleNavigate = (view: ViewType, folderId: string | null = null) => {
    let newPath = `/${view}`;
    if (view === "drive" && folderId && folderId !== "root") {
      newPath += `/${folderId}`;
    }
    window.location.hash = newPath;
  };

  const handleSearch = (query: string) => {
    if (!query) {
      window.location.hash = "#/drive";
    } else {
      window.location.hash = `#/search/${encodeURIComponent(query)}`;
    }
  };

  useEffect(() => {
    const parseHash = () => {
      setPath(getPathFromHash());
    };

    window.addEventListener("hashchange", parseHash);
    return () => {
      window.removeEventListener("hashchange", parseHash);
    };
  }, []);

  const fetchStorage = useCallback(async () => {
    try {
      const res = await api.getStorageUsage();
      if (res?.ok) setStorageUsage(await res.json());
    } catch {
      toast.error("Could not fetch storage usage.");
    }
  }, []);

  const authRoute = (() => {
    const hash = window.location.hash.replace(/^#\/?/, "");
    if (hash.startsWith("forgot-password")) return "forgot-password";
    if (hash.startsWith("verify-email")) return "verify-email";
    if (hash.startsWith("reset-password")) return "reset-password";
    return null;
  })();

  useEffect(() => {
    if (isAuthenticated && !authRoute) fetchStorage();
  }, [isAuthenticated, authRoute, fetchStorage, refreshKey]);

  const handleLogout = () => {
    api.clearTokens();
    setIsAuthenticated(false);
    setIsLogoutModalOpen(false);
  };

  // --- ROUTING LOGIC ---

  // Forgot Password Route
  if (authRoute === "forgot-password") {
    return <ForgotPasswordPage onBack={() => (window.location.hash = "#/")} />;
  }

  // Verify Email Route
  if (authRoute === "verify-email") {
    return <VerifyEmailPage onContinue={() => (window.location.hash = "#/")} />;
  }

  // Reset Password Route
  if (authRoute === "reset-password") {
    return (
      <ResetPasswordPage onSuccess={() => (window.location.hash = "#/")} />
    );
  }

  // Login / Main App
  if (!isAuthenticated) {
    return (
      <>
        <Toaster richColors position="top-center" />
        <LoginPage
          onLoginSuccess={() => {
            setIsAuthenticated(true);
            window.location.hash = "#/";
          }}
          onNavigateForgot={() => {
            window.location.hash = "#/forgot-password";
          }}
        />
      </>
    );
  }

  const mobileSidebarTrigger = (
    <Sheet open={isMobileSidebarOpen} onOpenChange={setMobileSidebarOpen}>
      <SheetTrigger asChild className="md:hidden mr-2">
        <Button variant="ghost" className="p-2 h-auto">
          <Icon name="menu" className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="p-0 w-72">
        <Sidebar
          currentView={path.view}
          onNavigate={(v, fId) => {
            handleNavigate(v, fId);
            setMobileSidebarOpen(false);
          }}
          storageUsage={storageUsage}
          onLogout={() => setIsLogoutModalOpen(true)}
        />
      </SheetContent>
    </Sheet>
  );

  return (
    <div className="h-screen w-screen flex bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 font-sans text-slate-900 overflow-hidden smooth-transition">
      <Toaster richColors position="top-center" />
      <LogoutConfirmationModal
        isOpen={isLogoutModalOpen}
        onClose={() => setIsLogoutModalOpen(false)}
        onConfirm={handleLogout}
      />
      <div className="hidden md:block w-64 flex-shrink-0">
        <Sidebar
          currentView={path.view}
          onNavigate={handleNavigate}
          storageUsage={storageUsage}
          onLogout={() => setIsLogoutModalOpen(true)}
        />
      </div>

      {path.view === "progress" ? (
        <ProgressPage>{mobileSidebarTrigger}</ProgressPage>
      ) : (
        <DrivePage
          path={path}
          onNavigate={handleNavigate}
          onSearch={handleSearch}
          refreshKey={refreshKey}
          uploadFiles={uploadFiles}
        >
          {mobileSidebarTrigger}
        </DrivePage>
      )}

      {uploads.length > 0 && (
        <div className="fixed bottom-4 right-4 w-80 z-50 animate-slide-up">
          <Card className="shadow-2xl glass-effect">
            <div className="p-3 border-b bg-gradient-to-r from-slate-50 to-blue-50 flex justify-between items-center">
              <p className="text-sm font-semibold text-slate-800">
                {uploads.every(
                  (u) =>
                    u.status === "complete" ||
                    u.status === "error" ||
                    u.status === "cancelled"
                )
                  ? "Uploads Complete"
                  : "Uploading..."}
              </p>
              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 hover-lift"
                  onClick={() => setIsMinimized(!isMinimized)}
                >
                  <Icon
                    name={isMinimized ? "chevronUp" : "chevronDown"}
                    className="h-4 w-4 smooth-transition"
                  />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 hover-lift"
                  onClick={() => setUploads([])}
                >
                  <Icon name="x" className="h-4 w-4" />
                </Button>
              </div>
            </div>
            {!isMinimized && (
              <div className="p-3 space-y-2 max-h-48 overflow-y-auto">
                {uploads.map((upload) => (
                  <div key={upload.id}>
                    <div className="flex justify-between text-xs mb-1 items-center">
                      <p className="font-medium truncate pr-2">
                        {upload.file.name}
                      </p>
                      {upload.status === "uploading" ? (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => cancelUpload(upload.id)}
                        >
                          <Icon name="x" className="h-3 w-3" />
                        </Button>
                      ) : (
                        <p className="text-muted-foreground">{upload.status}</p>
                      )}
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                      <div
                        className={`h-2 rounded-full transition-all duration-500 ease-out ${
                          upload.status === "error"
                            ? "bg-gradient-to-r from-red-500 to-red-600"
                            : upload.status === "complete"
                            ? "bg-gradient-to-r from-green-500 to-green-600"
                            : "bg-gradient-to-r from-indigo-500 to-purple-600"
                        }`}
                        style={{ width: `${upload.progress}%` }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}
