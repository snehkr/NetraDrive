# 🌩️ NetraDrive

A modern, secure, and feature-rich **cloud drive** built with **React + TypeScript** frontend and a **FastAPI** backend.  
NetraDrive provides seamless file management, real-time uploads, previewing, and secure authentication — all wrapped in a beautiful UI powered by **Shadcn UI**.

---

## ✨ Features

- 🔐 **Authentication**

  - JWT-based login & signup
  - Secure token refresh and session handling
  - Persistent login with local storage

- 📂 **File & Folder Management**

  - Create, rename, move, and delete folders
  - Upload and download files with progress tracking
  - Restore or permanently delete items from the bin
  - Drag-and-drop uploads with instant feedback

- ⭐ **Organization Tools**

  - Star important files/folders for quick access
  - Search by filename or content
  - Sort by name, size, or date

- 🖼️ **Previews**

  - Image, video, and PDF preview support
  - Code/text file detection with icons

- 🔄 **Transfers & Progress**

  - Real-time task monitoring for uploads & downloads
  - Cancel running tasks with one click
  - Transfer speed, ETA, and progress percentage

- 🗑️ **Recycle Bin**

  - Soft-delete files and folders
  - Restore within 30 days before permanent deletion

- 📊 **Storage Tracking**

  - Clean usage bar with total space & used storage
  - Default mock storage: **100 GB**

- 🎨 **Modern UI**
  - Shadcn UI components
  - Grid and list views
  - Context menus for quick actions
  - Responsive design (desktop & mobile)

---

## 🛠️ Tech Stack

**Frontend:**

- React + TypeScript
- Shadcn UI (Tailwind CSS components)
- Sonner (toast notifications)

**Backend:**

- FastAPI (Python)
- JWT Authentication
- File & Folder APIs

**Other:**

- LocalStorage for tokens
- Polling for background tasks
- Drag-and-drop support

---

## 🚀 Getting Started

### 1️⃣ Clone the Repository

```bash
git clone https://github.com/snehkr/netradrive.git
cd netradrive
```

### 2️⃣ Install Dependencies

```bash
npm install
```

### 3️⃣ Setup Environment Variables

Create a `.env` file in the root:

```env
VITE_NETRA_DRIVE_API_BASE_URL=http://localhost:8000/api/v1
```

### 4️⃣ Run the Development Server

```bash
npm run dev
```

The app will be available at **http://localhost:5173**

---

## 📸 Screenshots

_(Add your UI screenshots here – login, dashboard, file manager, etc.)_

---

## 🔮 Roadmap

- [ ] Mobile app (React Native / Flutter)
- [ ] File sharing with links
- [ ] Real-time collaboration features
- [ ] End-to-end encryption

---

## 🤝 Contributing

Contributions are welcome! Please fork the repo and submit a pull request with your changes.

---

## 📜 License

MIT License © 2025 Sneh Kr.
