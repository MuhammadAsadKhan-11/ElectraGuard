# ⚡ ElectraGuard — AI-Powered Electricity Theft Detection System

<div align="center">

![ElectraGuard Banner](https://img.shields.io/badge/ElectraGuard-AI%20Powered-blue?style=for-the-badge&logo=lightning)

[![Status](https://img.shields.io/badge/Status-Deployed%20%26%20Live-brightgreen?style=flat-square)]()
[![Platform](https://img.shields.io/badge/Platform-Android%20%7C%20iOS-blue?style=flat-square&logo=react)]()
[![Python](https://img.shields.io/badge/Python-3.8%2B-blue?style=flat-square&logo=python)]()
[![TensorFlow](https://img.shields.io/badge/TensorFlow-2.x-orange?style=flat-square&logo=tensorflow)]()
[![React Native](https://img.shields.io/badge/React%20Native-Expo-61DAFB?style=flat-square&logo=react)]()
[![Firebase](https://img.shields.io/badge/Firebase-Firestore-FFCA28?style=flat-square&logo=firebase)]()
[![License](https://img.shields.io/badge/License-MIT-green?style=flat-square)]()

**A full-stack, AI-powered mobile application that detects electricity theft in real time, alerts homeowners instantly, and provides intelligent assistance through a built-in AI chatbot.**

[Features](#-features) • [Architecture](#-system-architecture) • [Tech Stack](#-tech-stack) • [Installation](#-installation) • [API Docs](#-api-documentation) • [Portals](#-portals) • [Screenshots](#-screenshots)

</div>

---

## 📌 Table of Contents

- [Overview](#-overview)
- [Features](#-features)
- [System Architecture](#-system-architecture)
- [Tech Stack](#-tech-stack)
- [Project Structure](#-project-structure)
- [Portals](#-portals)
- [AI & Machine Learning](#-ai--machine-learning)
- [AI Chatbot](#-ai-chatbot)
- [Authentication & Security](#-authentication--security)
- [Installation](#-installation)
- [Environment Variables](#-environment-variables)
- [API Documentation](#-api-documentation)
- [Deployment](#-deployment)
- [Screenshots](#-screenshots)
- [Contributing](#-contributing)
- [Author](#-author)

---

## 🔍 Overview

Electricity theft is a **billion-dollar global problem** affecting utility companies and honest consumers alike. Traditional detection methods are slow, manual, and reactive. **ElectraGuard** flips the script.

ElectraGuard is a **deployed, production-grade system** that combines an anomaly detection AI model with a cross-platform mobile app to give residential users and administrators the power to detect, monitor, and respond to electricity theft — in real time, from anywhere.

> Built as part of the DecodeLabs AI Engineering Industrial Training Kit — Batch 2026.

---

## ✨ Features

### 🧠 AI-Powered Detection
- Anomaly detection model with **94% accuracy**
- Identifies irregular consumption patterns that indicate theft or unauthorized usage
- Proactive fault prediction before a confirmed theft event

### 📱 Cross-Platform Mobile App
- Available on **Android & iOS** via React Native Expo
- Real-time electricity consumption monitoring dashboard
- Instant push notifications & alerts on anomaly detection
- Clean, intuitive UI designed for non-technical residential users

### 🤖 Built-in AI Chatbot
- Powered by **Google Gemini API**
- Answers user questions about electricity usage in natural language
- Helps interpret alerts and guides users on next steps
- Always-on availability via dedicated Render deployment

### 👥 Dual Portal System
- **Admin Portal** — full system oversight, user management, analytics
- **Consumer Portal** — personal dashboard, alerts, usage history

### 🔐 Security
- Secure user authentication
- Password hashing & encryption
- Role-based access control (Admin vs Consumer)

### ☁️ Cloud Infrastructure
- AI model API deployed on **Render**
- Chatbot API deployed on **Render**
- Database & file storage on **Firebase**

---

## 🏗 System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     ELECTRAGUARD SYSTEM                      │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│   📱 React Native Expo App (Android & iOS)                  │
│        │                                                     │
│        ├──── Consumer Portal                                 │
│        └──── Admin Portal                                    │
│              │                                               │
│        ┌─────┴──────────────────────────────┐               │
│        │          Node.js Backend            │               │
│        │    (App API & Business Logic)       │               │
│        └─────┬──────────────────────────────┘               │
│              │                                               │
│    ┌─────────┼──────────────┐                               │
│    │         │              │                               │
│  ┌─▼──────┐ ┌▼───────────┐ ┌▼────────────┐                │
│  │Firebase │ │Flask API   │ │ Gemini API  │                │
│  │Firestore│ │(AI Model)  │ │  Chatbot    │                │
│  │Storage  │ │on Render   │ │  on Render  │                │
│  └─────────┘ └────────────┘ └─────────────┘                │
│                    │                                         │
│             ┌──────▼──────┐                                 │
│             │  Python ML  │                                  │
│             │  Model Core │                                  │
│             │ TensorFlow  │                                  │
│             │  sklearn    │                                  │
│             │  Pickle     │                                  │
│             └─────────────┘                                  │
└──────────────────────────────────────────────────────────────┘
```

---

## 🛠 Tech Stack

### AI & Machine Learning
| Technology | Purpose |
|---|---|
| Python | Core language for ML model development |
| TensorFlow | Deep learning model training |
| scikit-learn | Anomaly detection algorithms & preprocessing |
| Pickle | Model serialization for production deployment |
| Hugging Face | Model pipeline management |

### Backend
| Technology | Purpose |
|---|---|
| Flask | AI model API & serving pipeline |
| Node.js | App backend, API layer & business logic |
| Firebase Firestore | Real-time database |
| Firebase Storage | File & media storage |

### Mobile Application
| Technology | Purpose |
|---|---|
| React Native Expo | Cross-platform mobile app (Android & iOS) |
| Gemini API | AI-powered chatbot integration |

### Deployment & Infrastructure
| Technology | Purpose |
|---|---|
| Render | Flask AI model API deployment |
| Render | Gemini chatbot API deployment |
| Firebase | Database, storage & authentication |

---

## 📁 Project Structure

```
ElectraGuard/
│
├── 📁 ml-model/                    # AI & Machine Learning
│   ├── model.py                    # Anomaly detection model training
│   ├── preprocess.py               # Data preprocessing pipeline
│   ├── electraguard_model.pkl      # Serialized trained model
│   └── requirements.txt           # Python dependencies
│
├── 📁 flask-api/                   # AI Model API Server
│   ├── app.py                      # Flask application entry point
│   ├── routes/
│   │   ├── predict.py              # Prediction endpoint
│   │   └── health.py               # Health check endpoint
│   ├── utils/
│   │   └── model_loader.py         # Model loading utilities
│   └── requirements.txt
│
├── 📁 chatbot-api/                 # Gemini Chatbot API Server
│   ├── app.py                      # Chatbot Flask server
│   ├── gemini_handler.py           # Gemini API integration
│   └── requirements.txt
│
├── 📁 node-backend/                # App Backend Server
│   ├── server.js                   # Node.js entry point
│   ├── routes/
│   │   ├── auth.js                 # Authentication routes
│   │   ├── users.js                # User management routes
│   │   └── alerts.js              # Alert management routes
│   ├── middleware/
│   │   ├── auth.js                 # JWT middleware
│   │   └── encryption.js          # Password hashing
│   ├── firebase/
│   │   └── config.js              # Firebase configuration
│   └── package.json
│
├── 📁 mobile-app/                  # React Native Expo App
│   ├── App.js                      # App entry point
│   ├── 📁 screens/
│   │   ├── 📁 consumer/
│   │   │   ├── Dashboard.js        # Consumer dashboard
│   │   │   ├── Alerts.js           # Real-time alerts screen
│   │   │   ├── Analytics.js        # Usage analytics
│   │   │   └── Chatbot.js          # AI chatbot screen
│   │   ├── 📁 admin/
│   │   │   ├── AdminDashboard.js   # Admin overview
│   │   │   ├── UserManagement.js   # Manage all users
│   │   │   └── SystemAnalytics.js  # System-wide analytics
│   │   └── 📁 auth/
│   │       ├── Login.js            # Login screen
│   │       └── Register.js         # Registration screen
│   ├── 📁 components/              # Reusable UI components
│   ├── 📁 navigation/              # App navigation setup
│   ├── 📁 services/                # API service calls
│   ├── 📁 context/                 # Global state management
│   └── package.json
│
└── README.md
```

---

## 👥 Portals

### 🔴 Admin Portal
The Admin Portal provides complete system oversight and control.

**Features:**
- View and manage all registered consumer accounts
- Monitor electricity consumption across all users
- View system-wide anomaly detection alerts and history
- Access full analytics dashboard with usage trends
- Manage user roles and permissions
- System health and API status monitoring

### 🔵 Consumer Portal
The Consumer Portal gives homeowners direct access to their electricity data.

**Features:**
- Personal real-time electricity consumption dashboard
- Instant push notifications when anomalies are detected
- Historical usage data and trend analysis
- AI chatbot for natural language queries about usage and alerts
- View and manage personal alert history
- Profile management and account settings

---

## 🧠 AI & Machine Learning

### Model Overview

ElectraGuard's core intelligence is an **anomaly detection model** that learns normal electricity consumption patterns for a household and flags deviations that suggest theft or unauthorized usage.

**Model Performance:**
- ✅ Accuracy: **94%**
- Built with TensorFlow & scikit-learn
- Serialized using Pickle for production deployment
- Served via Flask REST API on Render

### How It Works

```
Raw Consumption Data
        │
        ▼
┌───────────────────┐
│   Preprocessing   │  ← Normalization, feature engineering
└───────────────────┘
        │
        ▼
┌───────────────────┐
│  Anomaly Detection │  ← TensorFlow + scikit-learn model
│      Model        │
└───────────────────┘
        │
        ▼
┌───────────────────┐
│  Anomaly Score    │  ← Threshold-based classification
└───────────────────┘
        │
     ┌──┴──┐
   Normal  Anomaly
             │
             ▼
      🚨 Alert Triggered
      Push Notification
      Sent to User
```

### Hugging Face Integration
Hugging Face pipelines are integrated for additional model management and potential NLP feature extensions.

---

## 🤖 AI Chatbot

The built-in chatbot is powered by **Google Gemini API** and is context-aware about electricity usage and ElectraGuard alerts.

**Capabilities:**
- Answer questions about current and historical electricity usage
- Explain what a detected anomaly means in plain language
- Guide users on what to do when an alert is triggered
- General electricity saving tips and advice
- Always available — deployed independently on Render

**Example Interactions:**
```
User: "Why did I get an alert at 3am?"
Bot:  "An unusual spike in consumption was detected between
       2:45am - 3:10am, which is outside your normal usage
       pattern. This could indicate unauthorized usage.
       Would you like me to generate a report?"

User: "How much electricity did I use this week?"
Bot:  "This week you consumed 47.3 kWh, which is 12% higher
       than your weekly average of 42.1 kWh."
```

---

## 🔐 Authentication & Security

ElectraGuard implements multiple layers of security to protect user data and system integrity.

- **Password Hashing** — All passwords are hashed before storage using industry-standard algorithms. Plain text passwords are never stored.
- **Encryption** — Sensitive data is encrypted in transit and at rest.
- **JWT Authentication** — JSON Web Tokens for secure, stateless session management.
- **Role-Based Access Control** — Admin and Consumer roles with strictly separated permissions. Consumers cannot access admin routes and vice versa.
- **Firebase Security Rules** — Firestore and Storage access is protected by Firebase security rules.

---

## 🚀 Installation

### Prerequisites

- Node.js v18+
- Python 3.8+
- Expo CLI
- Firebase account
- Render account
- Google Gemini API key

---

### 1. Clone the Repository

```bash
git clone https://github.com/MuhammadAsadKhan-11/ElectraGuard.git
cd ElectraGuard
```

---

### 2. Set Up the ML Model & Flask API

```bash
cd flask-api
pip install -r requirements.txt
```

Create a `.env` file in `flask-api/`:
```env
MODEL_PATH=../ml-model/electraguard_model.pkl
PORT=5000
```

Run locally:
```bash
python app.py
```

---

### 3. Set Up the Chatbot API

```bash
cd chatbot-api
pip install -r requirements.txt
```

Create a `.env` file in `chatbot-api/`:
```env
GEMINI_API_KEY=your_gemini_api_key_here
PORT=5001
```

Run locally:
```bash
python app.py
```

---

### 4. Set Up the Node.js Backend

```bash
cd node-backend
npm install
```

Create a `.env` file in `node-backend/`:
```env
PORT=3000
JWT_SECRET=your_jwt_secret_here
FLASK_API_URL=http://localhost:5000
CHATBOT_API_URL=http://localhost:5001
FIREBASE_PROJECT_ID=your_firebase_project_id
FIREBASE_PRIVATE_KEY=your_firebase_private_key
FIREBASE_CLIENT_EMAIL=your_firebase_client_email
```

Run locally:
```bash
node server.js
```

---

### 5. Set Up the Mobile App

```bash
cd mobile-app
npm install
```

Create a `.env` file in `mobile-app/`:
```env
API_BASE_URL=http://localhost:3000
CHATBOT_URL=http://localhost:5001
```

Run on Expo:
```bash
npx expo start
```

Scan the QR code with the **Expo Go** app on your phone, or press `a` for Android emulator / `i` for iOS simulator.

---

## 🔑 Environment Variables

| Variable | Service | Description |
|---|---|---|
| `MODEL_PATH` | Flask API | Path to the serialized .pkl model |
| `GEMINI_API_KEY` | Chatbot API | Google Gemini API key |
| `JWT_SECRET` | Node.js | Secret key for JWT token signing |
| `FLASK_API_URL` | Node.js | URL of the deployed Flask model API |
| `CHATBOT_API_URL` | Node.js | URL of the deployed chatbot API |
| `FIREBASE_PROJECT_ID` | Node.js | Firebase project ID |
| `FIREBASE_PRIVATE_KEY` | Node.js | Firebase service account private key |
| `FIREBASE_CLIENT_EMAIL` | Node.js | Firebase service account email |
| `API_BASE_URL` | Mobile App | Node.js backend base URL |

---

## 📡 API Documentation

### Flask Model API

**Base URL:** `https://your-flask-api.onrender.com`

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/predict` | Submit consumption data, get anomaly prediction |
| `GET` | `/health` | API health check |

**POST /predict — Request Body:**
```json
{
  "consumption_data": [45.2, 43.1, 47.8, 120.5, 44.2],
  "user_id": "user_123",
  "timestamp": "2026-05-10T03:00:00Z"
}
```

**POST /predict — Response:**
```json
{
  "status": "anomaly_detected",
  "confidence": 0.94,
  "anomaly_score": 0.87,
  "message": "Unusual consumption pattern detected",
  "timestamp": "2026-05-10T03:00:01Z"
}
```

---

### Chatbot API

**Base URL:** `https://your-chatbot-api.onrender.com`

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/chat` | Send a message, receive AI response |
| `GET` | `/health` | API health check |

**POST /chat — Request Body:**
```json
{
  "message": "Why did I get an alert last night?",
  "user_id": "user_123",
  "context": "anomaly_detected"
}
```

**POST /chat — Response:**
```json
{
  "reply": "An unusual spike in consumption was detected...",
  "timestamp": "2026-05-10T10:00:00Z"
}
```

---

### Node.js Backend API

**Base URL:** `https://your-node-backend.onrender.com`

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/auth/register` | Register new user |
| `POST` | `/auth/login` | Login and receive JWT token |
| `GET` | `/alerts` | Get all alerts for authenticated user |
| `GET` | `/alerts/:id` | Get specific alert details |
| `GET` | `/users` | Get all users (Admin only) |
| `DELETE` | `/users/:id` | Delete a user (Admin only) |
| `GET` | `/analytics` | Get usage analytics |

---

## ☁️ Deployment

### Deploy Flask API to Render

1. Push your `flask-api/` folder to GitHub
2. Go to [render.com](https://render.com) → New → Web Service
3. Connect your GitHub repo
4. Set **Build Command:** `pip install -r requirements.txt`
5. Set **Start Command:** `python app.py`
6. Add environment variables from `.env`
7. Deploy

### Deploy Chatbot API to Render

Repeat the same steps above for the `chatbot-api/` folder.

### Deploy Node.js Backend

1. Push `node-backend/` to GitHub
2. Go to Render → New → Web Service
3. Set **Build Command:** `npm install`
4. Set **Start Command:** `node server.js`
5. Add all environment variables
6. Deploy

### Firebase Setup

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Create a new project → Enable **Firestore** and **Storage**
3. Go to Project Settings → Service Accounts → Generate new private key
4. Use the credentials in your Node.js `.env` file

---



---

## 🤝 Contributing

Contributions are welcome! To contribute:

1. Fork the repository
2. Create a feature branch
```bash
git checkout -b feature/your-feature-name
```
3. Commit your changes
```bash
git commit -m "Add: your feature description"
```
4. Push to the branch
```bash
git push origin feature/your-feature-name
```
5. Open a Pull Request

---

## 📄 License

This project is licensed under the MIT License.

---

## 👨‍💻 Author

**Muhammad Asad Khan**
AI Engineer & Full-Stack Developer

[![GitHub](https://img.shields.io/badge/GitHub-MuhammadAsadKhan--11-181717?style=flat-square&logo=github)](https://github.com/MuhammadAsadKhan-11)
[![LinkedIn](https://img.shields.io/badge/LinkedIn-Connect-0077B5?style=flat-square&logo=linkedin)]()

> *Built with ❤️ as part of the DecodeLabs AI Engineering Industrial Training Kit — Batch 2026*
