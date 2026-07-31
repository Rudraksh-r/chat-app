# Real-Time Messaging Platform

A scalable, production-grade real-time messaging platform inspired by communication tools like WhatsApp Web, Slack, and Discord. This application enables users to communicate instantly through secure one-to-one and group conversations.

## 🚀 Features

### Core Messaging
- **Real-Time Communication**: Instant messaging powered by WebSockets (Socket.IO).
- **One-to-One & Group Chats**: Create private conversations or group chats with multiple users.
- **Media Sharing**: Upload and share images and documents (powered by Cloudinary).
- **Typing Indicators**: Real-time "User is typing..." indicators.
- **Read Receipts & Presence Tracking**: Online/offline tracking, last seen timestamps, and message read statuses.

### User, Security & E2EE
- **End-to-End Encryption (E2EE)**: True end-to-end encryption for both 1:1 and Group chats using ECDH key exchange and AES-256-GCM.
- **Advanced Crypto**: Group chats utilize Sender Key distribution with epoch-based key rotation. Private keys are securely stored locally via IndexedDB and encrypted server-side backups for cross-device sync.
- **Authentication**: Secure JWT-based authentication with bcrypt password hashing.
- **User Profiles**: Manage profile avatars, search for other users, and start chats instantly.
- **Security First**: Implemented with API rate limiting, Helmet for security headers, and secure HTTP-only cookies.

### UI/UX
- **Modern Interface**: Clean, dark-mode first UI designed with Tailwind CSS.
- **Smooth Animations**: High-quality micro-interactions and transitions using `motion/react` (Framer Motion).
- **Fully Responsive**: Works seamlessly across desktop, tablet, and mobile devices.

## 🛠️ Tech Stack

### Frontend
- **Framework**: React 18 & Vite
- **Styling**: Tailwind CSS v4
- **State Management**: Zustand
- **Animations**: motion/react (Framer Motion)
- **Routing**: React Router (v7)
- **Real-time**: Socket.IO Client
- **Notifications**: Sonner (Toast notifications)
- **HTTP Client**: Axios

### Backend
- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: MongoDB with Mongoose
- **Real-time**: Socket.IO
- **Authentication**: JSON Web Tokens (JWT) & bcryptjs
- **File Uploads**: Multer & Cloudinary
- **Security**: Helmet, express-rate-limit, cors

## 📁 Project Structure

This repository is structured as a monorepo with separate frontend and backend directories:

```text
chat-app/
 ├── Backend/              # Node.js + Express backend server
 │   ├── src/              # Source code, controllers, models, routes, sockets
 │   ├── package.json
 │   └── ...
 ├── Frontnd/              # React + Vite frontend application
 │   ├── src/              # React components, pages, lib, stores
 │   ├── package.json
 │   └── ...
 └── package.json          # Root configuration for workspace tooling (e.g., Husky)
```

## 🚀 Getting Started

Follow these steps to set up the project locally.

### Prerequisites
- Node.js (v18 or higher)
- MongoDB (local or Atlas)
- Cloudinary account (for media uploads)

### 1. Clone the repository

```bash
git clone https://github.com/your-username/chat-app.git
cd chat-app
```

### 2. Backend Setup

```bash
cd Backend
npm install
```

Create a `.env` file in the `Backend` directory based on `.env.example`:
```env
PORT=5001
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
NODE_ENV=development

# Cloudinary Setup
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

Start the backend server:
```bash
npm run dev
```

### 3. Frontend Setup

Open a new terminal and navigate to the frontend directory:

```bash
cd Frontnd
npm install
```

Create a `.env` file in the `Frontnd` directory (if required) to specify your backend URL, though Vite often proxies requests or uses default ports.

Start the frontend development server:
```bash
npm run dev
```

### 4. Usage
Open your browser and navigate to the local server URL provided by Vite (usually `http://localhost:5173`). Register a new account and start chatting!

## 🤝 Contributing

Contributions, issues, and feature requests are welcome! Feel free to check the issues page.

## 📝 License

This project is licensed under the ISC License.
