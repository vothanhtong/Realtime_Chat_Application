# 💬 Realtime Chat Application

<div align="center">

![React](https://img.shields.io/badge/Frontend-ReactJS-blue?style=for-the-badge\&logo=react)
![TypeScript](https://img.shields.io/badge/Language-TypeScript-blue?style=for-the-badge\&logo=typescript)
![NodeJS](https://img.shields.io/badge/Backend-NodeJS-green?style=for-the-badge\&logo=node.js)
![MongoDB](https://img.shields.io/badge/Database-MongoDB-darkgreen?style=for-the-badge\&logo=mongodb)
![Socket.IO](https://img.shields.io/badge/Realtime-Socket.IO-black?style=for-the-badge\&logo=socketdotio)
![Firebase](https://img.shields.io/badge/Auth-Firebase-orange?style=for-the-badge\&logo=firebase)
![Cloudinary](https://img.shields.io/badge/Media-Cloudinary-blue?style=for-the-badge\&logo=cloudinary)
![Vercel](https://img.shields.io/badge/Frontend-Vercel-black?style=for-the-badge\&logo=vercel)
![Render](https://img.shields.io/badge/Backend-Render-purple?style=for-the-badge\&logo=render)

A modern fullstack realtime chat application inspired by Messenger, Discord, and Telegram.

</div>

---

# 🌐 Live Demo

<div align="center">

🚀 Live Application:

https://realtime-chat-application-frontend-ruby.vercel.app

</div>

---

# 📌 Introduction

Realtime Chat Application is a modern fullstack realtime messaging platform built with the MERN Stack and Socket.IO.

The application allows users to communicate instantly through realtime messaging, group chats, image sharing, friend systems, online presence tracking, and modern social communication features.

This project demonstrates:

* Fullstack MERN architecture
* Realtime communication with Socket.IO
* JWT & Firebase Authentication
* Responsive modern UI/UX
* Media optimization with Cloudinary
* Realtime online presence tracking
* Modern scalable chat system architecture

---

# 🚀 Features

# 🔐 Authentication System

* User Registration (Sign Up)
* User Login (Sign In)
* JWT Authentication
* Password Hashing with bcrypt
* Protected Routes
* Session Persistence
* Logout Functionality

## Firebase OAuth Authentication

* Google Login
* GitHub Login
* Firebase Authentication Integration

---

# 👤 User Management

* User Profiles
* Update avatar and personal information
* Search users by username
* Online / Offline realtime status
* Hide online status (Incognito Mode)
* Multi-tab realtime presence tracking

---

# 👥 Friend System

* Send Friend Requests
* Accept / Reject Requests
* Remove Friends
* Friend List Management
* Realtime Friend Notifications

---

# 💬 Realtime Messaging

## Direct Messages

* 1-to-1 chat
* Instant realtime messaging
* Infinite scrolling messages
* Auto scroll to latest message
* Unread message counter
* Conversation sorting by latest activity

## Group Chat

* Create group conversations
* Add multiple members
* Group avatars
* Group realtime messaging

---

# 📨 Message Features

* Send Text Messages
* Send Images
* Delete Messages (for self)
* Recall Messages (delete for everyone)
* Message status:

  * Sent
  * Delivered
  * Seen
* Realtime message synchronization
* Read Receipts
* Typing Indicators

---

# 😊 Emoji & Media

* Emoji Picker
* Image Upload
* Image Preview Modal
* Fullscreen Image Viewer
* Optimized Cloudinary Image Delivery
* Blur-up Progressive Image Loading
* Lazy Loading Images
* Skeleton Loading UI

---

# ⚡ Realtime Features (Socket.IO)

* Instant Messaging
* Live Online Presence
* Typing Indicator
* Read Receipts
* Friend Request Updates
* Message Recall Sync
* Profile Updates Sync
* Auto Reconnection
* Connection Recovery

---

# 🎨 UI/UX Features

* Responsive Design
* Mobile Friendly
* Dark Mode / Light Mode
* Modern Chat Layout
* Smooth Animations
* Toast Notifications
* Glassmorphism Effects
* Modern Sidebar Navigation

---

# 🧱 Tech Stack

# Frontend

```bash
- ReactJS
- TypeScript
- Vite
- TailwindCSS
- Zustand
- Axios
- React Router DOM
- Socket.IO Client
- Framer Motion
- Emoji Mart
```

---

# Backend

```bash
- Node.js
- Express.js
- MongoDB
- Mongoose
- Socket.IO
- JWT
- bcryptjs
- Firebase Admin SDK
- Multer
- Cloudinary
```

---

# Database

```bash
- MongoDB Atlas
```

---

# Cloud & Deployment

```bash
- Vercel (Frontend)
- Render (Backend)
- Cloudinary (Media Storage)
- Firebase Authentication
```

---

# 🔌 Realtime Architecture

This project uses Socket.IO for realtime communication between users.

## Socket.IO Powers:

* Instant Messaging
* Online Presence Tracking
* Typing Indicators
* Read Receipts
* Realtime Notifications
* Group Chat Synchronization
* Conversation Updates

---

# 🛡️ Authentication Flow

```text
User Login/Register
        ↓
Server Validates Credentials
        ↓
JWT Token Generated
        ↓
Frontend Stores Token
        ↓
Protected Routes Access
        ↓
Socket Authentication
        ↓
Realtime Connection Established
```

---

# 📁 Project Structure

```bash
Realtime-Chat-App/
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── stores/
│   │   ├── services/
│   │   ├── hooks/
│   │   ├── utils/
│   │   └── App.tsx
│   │
│   └── package.json
│
├── Backend/
│   ├── src/
│   │   ├── controllers/
│   │   ├── models/
│   │   ├── routes/
│   │   ├── middleware/
│   │   ├── socket/
│   │   ├── services/
│   │   ├── config/
│   │   └── server.js
│   │
│   └── package.json
│
└── README.md
```

---

# ⚙️ Installation & Setup

# 1️⃣ Clone Repository

```bash
git clone https://github.com/vothanhtong/realtime-chat-app.git
cd realtime-chat-app
```

---

# 🔧 Backend Setup

## Install Dependencies

```bash
cd Backend
npm install
```

## Create `.env`

```env
PORT=5001
MONGO_URI=your_mongodb_uri
JWT_SECRET=your_secret

CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
```

## Run Backend

```bash
npm run dev
```

---

# 🎨 Frontend Setup

## Install Dependencies

```bash
cd frontend
npm install
```

## Create `.env`

```env
VITE_API_URL=http://localhost:5001/api
VITE_SOCKET_URL=http://localhost:5001
```

## Run Frontend

```bash
npm run dev
```

---

# 🚀 Deployment

# Frontend Deployment

* Vercel

# Backend Deployment

* Render

# Database

* MongoDB Atlas

# Media Storage

* Cloudinary

---

# 🌟 Future Improvements

* Edit Messages
* Reply Messages
* Message Reactions
* Push Notifications
* File Sharing
* Voice Messages
* Voice/Video Calls
* End-to-End Encryption
* AI Chatbot Assistant

---

# 📸 Screenshots

## Authentication Page

* Login
* Register
* OAuth Login

## Chat Interface

* Realtime Messages
* Online Users
* Typing Indicator
* Group Chat

## Responsive Mobile UI

* Mobile Chat Layout
* Responsive Sidebar

---

# 👨‍💻 Author

Developed by Võ Thanh Tòng

GitHub:
https://github.com/vothanhtong

---

<div align="center">

⭐ If you like this project, don't forget to star the repository!

</div>
