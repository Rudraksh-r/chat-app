# Real-Time Chat Application UI/UX

A complete, production-level real-time chat web application UI/UX system built with React, Vite, and Tailwind CSS. Designed with a modern, minimal, and premium SaaS aesthetic, drawing inspiration from leading communication platforms like WhatsApp Web, Slack, and Discord.

## 🚀 Features

### 🔐 Authentication Flows
- **Login Page**: Clean UI with email/password inputs, "Remember me" functionality, and smooth entry animations.
- **Signup Page**: Intuitive registration flow featuring an avatar upload placeholder and secure password fields.
- Both flows use custom styled inputs and feature a dark, premium SaaS backdrop with subtle gradient blurs.

### 💬 Main Chat Layout
- **Responsive Sidebar**: 
  - Displays the current user's profile mini-card.
  - A search bar for filtering conversations.
  - A scrollable list of active chats with unread badges, timestamps, and active state highlights.
  - Fully collapsible on mobile screens using a smooth off-canvas overlay.
- **Chat Window**: 
  - Sticky header showing chat name, online status, and quick action icons (Video, Phone, Search, More).
  - Smooth-scrolling message area displaying left/right aligned chat bubbles.
  - Animated typing indicators ("User is typing...").
  - Message read receipts (`✓` and `✓✓`).
- **Message Input Area**: 
  - Auto-expanding text area.
  - Action buttons for attachments and emojis.
  - Seamless send interactions.

## 🎨 Global Design System

- **Theme**: Deep dark mode (`#0F172A` background, `#111827` surface).
- **Primary Color**: Indigo (`#4F46E5` to `#6366F1`) used for primary actions, badges, and accents.
- **Typography**: `Inter` font family for clean, highly legible text.
- **Spacing**: Consistent 8px grid system implemented via Tailwind CSS.
- **Micro-interactions**: Powered by `motion/react` for smooth page transitions, hover states, and typing animations.

## 🛠️ Tech Stack & Libraries

- **Framework**: React 18 & Vite
- **Routing**: `react-router` (v7) using the Data Mode pattern.
- **Styling**: Tailwind CSS v4 + `clsx` & `tailwind-merge` for dynamic class handling.
- **Icons**: `lucide-react`
- **Animations**: `motion/react` (Framer Motion)
- **Toast Notifications**: `sonner`
- **Date Formatting**: `date-fns`

## 📁 Project Structure

```text
/src
 ├── app/
 │   ├── components/
 │   │   └── ui/
 │   │       └── index.tsx      # Reusable UI components (Button, Input, Avatar)
 │   ├── data/
 │   │   └── mock.ts            # Mock data for users, chats, and messages
 │   ├── lib/
 │   │   └── utils.ts           # Utility functions (cn, formatTime)
 │   ├── pages/
 │   │   ├── ChatLayout.tsx     # Main application layout & chat interface
 │   │   ├── Login.tsx          # Authentication - Login view
 │   │   └── Signup.tsx         # Authentication - Registration view
 │   ├── App.tsx                # App entry with Providers (Router, Toaster)
 │   └── routes.tsx             # React Router configuration
 ├── styles/
 │   ├── fonts.css              # Global font imports (Inter)
 │   └── theme.css              # Global CSS & Tailwind configuration
```

## 🧩 Key Components

### `Button`
A polymorphic button component with support for multiple variants (`primary`, `secondary`, `ghost`, `danger`) and sizes. Includes built-in focus rings and disabled states.

### `Input`
A flexible text input component featuring an optional left-aligned icon. Styled for dark mode with subtle borders and smooth focus transitions.

### `Avatar`
Displays user profile pictures with optional `online`/`offline` status indicator dots. Supports multiple sizing tiers.

## 📱 Responsiveness

The application is built desktop-first but fully supports mobile and tablet devices. On screens smaller than `md` (768px), the sidebar transitions into a slide-over drawer with a semi-transparent backdrop, ensuring the chat interface remains usable and clean on small screens.
