# Cashual Call (Frontend) 📞💬

> Connect instantly with real people anonymously via high-quality voice call or text chat. Earn rewards just by engaging in meaningful conversations.

[![Next.js](https://img.shields.io/badge/Next.js-15.3-black?style=flat-square&logo=next.js)](https://nextjs.org)
[![React](https://img.shields.io/badge/React-19.0-blue?style=flat-square&logo=react)](https://react.dev)
[![Redux Toolkit](https://img.shields.io/badge/Redux-Toolkit-purple?style=flat-square&logo=redux)](https://redux-toolkit.js.org)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-v4.0-38B2AC?style=flat-square&logo=tailwind-css)](https://tailwindcss.com)
[![WebRTC](https://img.shields.io/badge/WebRTC-Audio-orange?style=flat-square&logo=webrtc)](https://webrtc.org)
[![Socket.IO](https://img.shields.io/badge/Socket.IO-Client-010101?style=flat-square&logo=socket.io)](https://socket.io)

---

## 🌟 Key Features

*   **⚡ Instant Matchmaking Routing**: Automatically handles redirecting matched users to custom `/chat` or `/call` routes.
*   **🎙️ WebRTC Voice Calls**: Seamless, zero-latency voice calling with integrated mute controls, active duration tracking, and call status logging.
*   **💬 Real-Time Chat Experience**: Supports rich typing indicators, instant messaging updates, and seen tracking (read receipts).
*   **🕵️ Anonymous Browser Fingerprinting**: Minimizes user friction by automatically generating stable guest IDs via FingerprintJS.
*   **🔒 Optional Authentication**: Integrates dedicated modals for secure registration and JWT login, storing auth state in Redux.

---

## 🏗️ Technical Highlights & Architecture

The frontend is built on **Next.js 15 (App Router)** and optimized for performance using **Turbopack**:

*   **Socket.IO Client Provider**: A persistent socket connection is established once and shared across pages using standard React context (`SocketProvider`).
*   **State Management**: Redux Toolkit coordinates the open/closed states of auth modals and user session configurations.
*   **WebRTC Peer Negotiation Hook**: `useWebRTC.ts` coordinates signaling events (Offers, Answers, ICE Candidates) using a polite/impolite collision mitigation protocol.
*   **Typing & Seen Hooks**: Encapsulates state synchronization for user indicators to keep page components clean.

---

## ⚙️ Local Setup Instructions

### Prerequisites
*   Node.js (v18.x or later)
*   npm (v10.x or later)

### Step-by-Step Installation
1.  **Clone the repository** and navigate to the project directory:
    ```bash
    cd chatcall-frontend
    ```
2.  **Install dependencies**:
    ```bash
    npm install
    ```
3.  **Configure environment variables**:
    Create a `.env` file in the root of the project (copying from `.env.example`):
    ```bash
    cp .env.example .env
    ```
4.  **Run the development server**:
    ```bash
    npm run dev
    ```
5.  Open [http://localhost:3000](http://localhost:3000) in your browser to view the application.

---

## 🔌 Environment Variables

```env
# The base URL of the Cashual Call backend API
NEXT_PUBLIC_API_BASE_URL=http://localhost:3001/
```
