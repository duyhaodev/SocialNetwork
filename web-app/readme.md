<h1 align="center">Threads Clone Frontend ⚛️</h1>

<p align="center">
  <img alt="React" src="https://img.shields.io/badge/React-18-blue?style=flat-square&logo=react" />
  <img alt="Vite" src="https://img.shields.io/badge/Vite-6.0-purple?style=flat-square&logo=vite" />
  <img alt="Redux Toolkit" src="https://img.shields.io/badge/Redux%20Toolkit-State-purple?style=flat-square&logo=redux" />
  <img alt="Tailwind CSS" src="https://img.shields.io/badge/Tailwind_CSS-4.0-cyan?style=flat-square&logo=tailwindcss" />
  <img alt="Shadcn UI" src="https://img.shields.io/badge/Shadcn_UI-Components-black?style=flat-square&logo=shadcnui" />
</p>

> **Project Description**
>
> This is the **Frontend** component of the **Threads Clone** project. Built with React and Vite, it provides a modern, responsive, and interactive user interface. The application features a dark-themed aesthetic inspired by the original Threads app, utilizing Redux for state management and Socket.IO for real-time updates.

## 🔗 Related Repository

- **Backend (Spring Boot):** [MXH_BE Repository](https://github.com/duyhaodev/MXH_BE)

## ✨ Key Features

- **📱 Modern UI/UX:**
  - Fully responsive design (Mobile Navigation & Desktop Sidebar).
  - Dark mode aesthetic (Default).
  - Polished components using **Shadcn UI** & **Radix UI**.
- **🔐 User Authentication:**
  - Login & Registration with form validation.
  - OTP Account Verification.
  - Password Recovery flow.
- **📝 Feed & Interaction:**
  - **Infinite Scroll** news feed.
  - Create threads with **Text, Images, and Video**.
  - Emoji picker integration.
  - **Drag-to-scroll** media previews.
  - Like, Repost, and Multi-level Commenting system.
- **⚡ Real-time Communication:**
  - **Socket.IO** integration for instant messaging.
  - Real-time Notifications (Likes, Replies, Follows).
  - Live User Online/Offline status.
- **🔍 Discovery & Profile:**
  - User and Post Search.
  - Comprehensive User Profiles (Threads, Reposts, Replies).
  - Edit Profile (Avatar, Bio) with Cloudinary upload.

## 🛠 Tech Stack

- **Core:** React 18, Vite 6
- **State Management:** Redux Toolkit
- **Styling:** Tailwind CSS v4, Shadcn UI, Lucide React (Icons)
- **Routing:** React Router Dom v6
- **Networking:** Axios (Interceptors for JWT), Socket.io-client
- **Utilities:** Emoji-mart, Sonner (Toast), React Hook Form

## 📂 Project Structure

```bash
src/
├── api/            # API services (Axios config, Endpoints)
├── assets/         # Static assets (Images, Sounds)
├── components/     # Shared UI components (Shadcn, Custom)
├── context/        # React Context (Socket.IO)
├── features/       # Page-specific components (Feed, Profile, Chat...)
├── store/          # Redux Slices (User, Posts, Chat...)
├── utils/          # Helper functions (Date formatting, etc.)
└── App.jsx         # Main App component & Routes
```

## 🚀 Getting Started

### Prerequisites

- Node.js (v18 or higher recommended)
- npm or yarn

### Installation

To keep the project organized, it is recommended to create a parent folder for both Backend and Frontend:

1.  **Create a parent folder and clone the project**

    ```bash
    mkdir ThreadsClone
    cd ThreadsClone

    # Clone Frontend
    git clone https://github.com/duyhaodev/MXH_FE.git

    # Clone Backend (Recommended for full functionality)
    git clone https://github.com/duyhaodev/MXH_BE.git
    ```

2.  **Navigate to Frontend**

    ```bash
    cd Frontend
    ```

3.  **Install Dependencies**

    ```bash
    npm install
    ```

4.  **Configure Environment Variables**
    Create a `.env` file in the root of the `Frontend` directory (optional if Backend runs on default localhost:8080):

    ```env
    VITE_BACKEND_URL=http://localhost:8080
    ```

5.  **Run the Application**
    ```bash
    npm run dev
    ```
    The application will start at `http://localhost:3000`.

---
