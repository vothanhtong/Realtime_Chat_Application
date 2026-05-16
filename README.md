# 💬 Realtime Chat Application

<div align="center">

![React](https://img.shields.io/badge/Frontend-ReactJS-blue?style=for-the-badge&logo=react)
![NodeJS](https://img.shields.io/badge/Backend-NodeJS-green?style=for-the-badge&logo=node.js)
![MongoDB](https://img.shields.io/badge/Database-MongoDB-darkgreen?style=for-the-badge&logo=mongodb)
![Socket.IO](https://img.shields.io/badge/Realtime-Socket.IO-black?style=for-the-badge&logo=socketdotio)

A modern fullstack realtime chat application built with MERN Stack & Socket.IO

</div>

---

# 🌐 Live Demo

<p align="center">
  <a href="https://realtime-chat-application-mocha.vercel.app/">
    <img src="https://img.shields.io/badge/Live-Demo-success?style=for-the-badge&logo=vercel" />
  </a>
</p>

<div align="center">

🚀 Try the application here:  
👉 https://realtime-chat-application-mocha.vercel.app/

</div>

---

# 📌 Introduction

This project is a **Fullstack Realtime Chat Application** that allows users to communicate instantly through a modern messaging platform.

The application demonstrates how:

- Frontend communicates with backend
- Authentication works securely
- Realtime messaging is implemented
- MongoDB stores user and chat data
- Socket.IO handles live communication

---

# 🚀 Features

## 🔐 Authentication System
- User Registration (Sign Up)
- User Login (Sign In)
- JWT Authentication
- Password Hashing with bcrypt
- Protected Routes
- Logout Functionality

---

## 💬 Realtime Chat Features
- Instant Messaging
- Online/Offline Status
- Typing Indicator
- Auto Scroll Messages
- Realtime Updates using Socket.IO
- Recent Conversations

---

## 👤 User Features
- User Profile
- Upload Avatar
- Search Users
- Friends / Contact List

---

## 🎨 UI/UX
- Responsive Design
- Modern Chat Interface
- Dark Mode
- Loading Animations
- Mobile Friendly

---

# 🧱 Tech Stack

## Frontend
```bash
- ReactJS
- Vite
- TailwindCSS
- Axios
- React Router DOM
- Socket.IO Client
```

## Backend
```bash
- Node.js
- Express.js
- Socket.IO
- JWT
- bcryptjs
- dotenv
```

## Database
```bash
- MongoDB
- Mongoose
```

---

# 📁 Project Structure

```bash
Realtime-Chat-App/
│
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── context/
│   │   ├── hooks/
│   │   ├── services/
│   │   ├── utils/
│   │   └── App.jsx
│   │
│   └── package.json
│
├── backend/
│   ├── src/
│   │   ├── controllers/
│   │   ├── middleware/
│   │   ├── models/
│   │   ├── routes/
│   │   ├── socket/
│   │   ├── config/
│   │   └── server.js
│   │
│   └── package.json
│
└── README.md
```

---

# ⚙️ Installation & Setup

## 1️⃣ Clone Repository

```bash
git clone https://github.com/vothanhtong/realtime-chat-app.git
cd realtime-chat-app
```

---

# 🔧 Backend Setup

## Install Dependencies

```bash
cd backend
npm install
```

## Create `.env`

```env
PORT=5000
MONGO_URI=your_mongodb_connection
JWT_SECRET=your_secret_key
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

## Run Frontend

```bash
npm run dev
```

---

# 🔌 Realtime Communication

This project uses **Socket.IO** for realtime communication between users.

## Features Powered by Socket.IO

```bash
✔ Instant Messaging
✔ Online Users
✔ Typing Indicator
✔ Live Updates
✔ Message Notifications
```

---

# 🛡️ Authentication Flow

```text
User Register/Login
        ↓
Server Validates Data
        ↓
JWT Token Generated
        ↓
Client Stores Token
        ↓
Protected Routes Access
```

---

# 📸 Screenshots

## 🔑 Authentication Page
- Login Form
- Register Form

## 💬 Chat Interface
- Sidebar Conversations
- Realtime Messages
- Online Status
- Typing Animation

---

# 🌟 Future Improvements

- Group Chat
- Voice Call
- Video Call
- Emoji Picker
- Send Images & Files
- Message Reactions
- Delete/Edit Messages
- Push Notifications
- End-to-End Encryption


<div align="center">

⭐ Don't forget to star this repository if you like it!

</div>