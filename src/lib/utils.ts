import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import type { FileItem, IconName } from "@/types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const formatBytes = (bytes: number, decimals = 2): string => {
  if (!+bytes) return "0 Bytes";
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
};

export const formatDate = (dateString: string): string =>
  new Date(dateString).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
    hour12: true,
  });

export const getFileIconName = (item: FileItem): IconName => {
  const mime = item.mime_type;
  if (mime.startsWith("image/")) return "image";
  if (mime.startsWith("video/")) return "video";
  if (mime.startsWith("application/pdf")) return "pdf";
  if (mime.startsWith("application/zip") || mime.includes("archive"))
    return "archive";
  if (
    mime.startsWith("text/") ||
    mime.includes("script") ||
    mime.includes("json")
  )
    return "code";
  return "file";
};
