// src/lib/api.ts

export const API_BASE_URL = import.meta.env.VITE_NETRA_DRIVE_API_BASE_URL;
export const API_ROOT = API_BASE_URL.replace(/\/api\/v1\/?$/, "");

let refreshTokenPromise: Promise<boolean> | null = null;

export const api = {
  getTokens: (): { access: string | null; refresh: string | null } => {
    return {
      access: localStorage.getItem("accessToken"),
      refresh: localStorage.getItem("refreshToken"),
    };
  },
  setTokens: (access: string, refresh: string): void => {
    localStorage.setItem("accessToken", access);
    localStorage.setItem("refreshToken", refresh);
  },
  clearTokens: (): void => {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
  },

  request: async function (
    endpoint: string,
    options: RequestInit = {}
  ): Promise<Response> {
    const makeRequest = async () => {
      const { access } = this.getTokens();
      const headers = new Headers(options.headers);
      if (!headers.has("Accept")) {
        headers.set("Accept", "application/json");
      }
      if (access) {
        headers.set("Authorization", `Bearer ${access}`);
      }
      return fetch(`${API_BASE_URL}${endpoint}`, { ...options, headers });
    };

    let response = await makeRequest();

    if (response.status === 401 && this.getTokens().refresh) {
      if (!refreshTokenPromise) {
        refreshTokenPromise = this.refreshToken().finally(() => {
          refreshTokenPromise = null;
        });
      }

      const refreshSuccess = await refreshTokenPromise;

      if (refreshSuccess) {
        response = await makeRequest();
      } else {
        this.clearTokens();
        window.location.reload();
      }
    }
    return response;
  },
  refreshToken: async function (): Promise<boolean> {
    const { refresh } = this.getTokens();
    if (!refresh) return false;
    try {
      const response = await fetch(`${API_BASE_URL}/auth/refresh_token`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refresh_token: refresh }),
      });
      if (!response.ok) throw new Error("Refresh failed");
      const data = await response.json();
      this.setTokens(data.access_token, data.refresh_token);
      return true;
    } catch (error) {
      console.error("Token refresh failed:", error);
      return false;
    }
  },
  login: (username: string, password: string): Promise<Response> => {
    const t = new URLSearchParams();
    t.append("username", username);
    t.append("password", password);
    return fetch(`${API_BASE_URL}/auth/token`, {
      method: "POST",
      body: t,
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    });
  },
  signup: (
    username: string,
    email: string,
    password: string
  ): Promise<Response> =>
    api.request("/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, email, password }),
    }),

  verifyEmail: (token: string): Promise<Response> =>
    fetch(`${API_BASE_URL}/auth/verify-email?token=${token}`, {
      method: "GET",
      headers: { Accept: "application/json" },
    }),

  forgotPassword: (email: string): Promise<Response> =>
    api.request("/auth/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    }),

  resetPassword: (token: string, new_password: string): Promise<Response> =>
    api.request("/auth/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, new_password }),
    }),

  getStorageUsage: (): Promise<Response> => api.request("/users/me/storage"),
  getFolderPath: (folderId: string): Promise<Response> =>
    api.request(`/folders/${folderId}/path`),
  listFolders: (
    parentId: string | null,
    includeDeleted = false,
    isStarred = false
  ): Promise<Response> =>
    api.request(
      `/folders/?parent_id=${
        parentId || "root"
      }&include_deleted=${includeDeleted}&is_starred=${isStarred}`
    ),
  createFolder: (name: string, parent_id: string | null): Promise<Response> =>
    api.request("/folders/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, parent_id }),
    }),
  getFolderTree: (): Promise<Response> => api.request("/folders/tree"),
  moveFolderToBin: (folderId: string): Promise<Response> =>
    api.request(`/folders/${folderId}/bin`, { method: "PUT" }),
  restoreFolder: (folderId: string): Promise<Response> =>
    api.request(`/folders/${folderId}/restore`, { method: "PUT" }),
  permanentlyDeleteFolder: (folderId: string): Promise<Response> =>
    api.request(`/folders/${folderId}`, { method: "DELETE" }),
  listFiles: (
    folderId: string | null,
    includeDeleted = false,
    isStarred = false
  ): Promise<Response> =>
    api.request(
      `/files/?folder_id=${
        folderId || "root"
      }&include_deleted=${includeDeleted}&is_starred=${isStarred}`
    ),
  downloadFile: (fileId: string): Promise<Response> =>
    api.request(`/files/${fileId}/download`),
  moveFileToBin: (fileId: string): Promise<Response> =>
    api.request(`/files/${fileId}/bin`, { method: "PUT" }),
  restoreFile: (fileId: string): Promise<Response> =>
    api.request(`/files/${fileId}/restore`, { method: "PUT" }),
  permanentlyDeleteFile: (fileId: string): Promise<Response> =>
    api.request(`/files/${fileId}`, { method: "DELETE" }),
  search: (query: string): Promise<Response> =>
    api.request(`/files/search/?q=${encodeURIComponent(query)}`),
  getPreviewBlob: async (fileId: string): Promise<Blob | null> => {
    try {
      const res = await api.request(`/files/${fileId}/preview`, {
        headers: { Accept: "*/*" },
      });
      if (!res.ok) throw new Error("Failed to fetch preview");
      return await res.blob();
    } catch (error) {
      console.error("Preview fetch error:", error);
      return null;
    }
  },
  uploadFile: (
    file: File,
    folderId: string | null,
    onProgress: (p: number) => void
  ): { xhr: XMLHttpRequest; promise: Promise<Response> } => {
    const xhr = new XMLHttpRequest();
    const promise = new Promise<Response>((resolve, reject) => {
      xhr.upload.addEventListener("progress", (e) => {
        if (e.lengthComputable) {
          onProgress((e.loaded / e.total) * 100);
        }
      });
      xhr.addEventListener("load", () => {
        const response = new Response(xhr.responseText, {
          status: xhr.status,
          statusText: xhr.statusText,
          headers: { "Content-Type": "application/json" },
        });
        resolve(response);
      });
      xhr.addEventListener("error", () => reject(new Error("Upload failed.")));
      xhr.addEventListener("abort", () =>
        reject(new Error("Upload cancelled."))
      );

      let url = `${API_BASE_URL}/files/upload`;
      if (folderId) {
        url += `?folder_id=${folderId}`;
      }

      xhr.open("POST", url);
      const { access } = api.getTokens();
      if (access) xhr.setRequestHeader("Authorization", `Bearer ${access}`);

      const formData = new FormData();
      formData.append("file", file);

      xhr.send(formData);
    });
    return { xhr, promise };
  },
  renameItem: (
    itemType: string,
    itemId: string,
    newName: string
  ): Promise<Response> =>
    api.request(`/${itemType}s/${itemId}/rename`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ new_name: newName }),
    }),
  moveItem: (
    itemType: string,
    itemId: string,
    newParentId: string | null
  ): Promise<Response> =>
    api.request(`/${itemType}s/${itemId}/move`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ new_parent_id: newParentId }),
    }),
  starItem: (itemType: string, itemId: string): Promise<Response> =>
    api.request(`/${itemType}s/${itemId}/star`, { method: "PUT" }),
  unstarItem: (itemType: string, itemId: string): Promise<Response> =>
    api.request(`/${itemType}s/${itemId}/unstar`, { method: "PUT" }),
  getTasks: (userId: string): Promise<Response> =>
    api.request(`/tasks/?user_id=${userId}`),
  cancelTask: (taskId: string): Promise<Response> =>
    api.request(`/tasks/cancel/${taskId}`, { method: "POST" }),
  generateShareLink: (fileId: string): Promise<Response> =>
    api.request(`/share/generate/${fileId}`, { method: "POST" }),
};
