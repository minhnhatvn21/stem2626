# 🔥 STEM26 - Năng Lượng Xanh | Green Energy Battle

A full-stack web application for elementary school students to participate in a STEM "Green Energy" competition with a fiery game battle interface.

---

## 🚀 Tech Stack

- **Next.js 15** (App Router) + TypeScript
- **TailwindCSS** + Custom fire theme CSS
- **Framer Motion** – animations
- **Firebase Authentication** (Email/Password)
- **Firebase Firestore** (realtime)
- **react-hot-toast**, **lucide-react**

---

## 📋 Features

### 👤 Roles
| Role | Access |
|------|--------|
| `student` | Dashboard, Practice, Team Battle, Flash |
| `admin` | All student pages + Admin panel |

### 🎮 Three Battle Modules
1. **CHIẾN BINH** (`/battle/warrior`) – Solo practice with difficulty levels, timer, and score tracking
2. **HỢP SỨC TÁC CHIẾN** (`/battle/team-battle`) – Real-time team map conquest (4x4 grid)
3. **NHANH NHƯ CHỚP** (`/battle/flash`) – Speed quiz, first correct answer wins the question

### 🛠️ Admin Panel
- `/admin` – System overview & live session alert
- `/admin/questions` – Question bank (add/edit/delete/publish), AI generator, demo seed
- `/admin/sessions` – Create sessions, start/stop, advance questions in realtime
- `/admin/teams` – Create teams, add members
- `/admin/results` – Leaderboard, per-session scoreboard, top-3 podium

---

## ⚙️ Firebase Setup

### 1. Create Firebase Project
1. Go to [console.firebase.google.com](https://console.firebase.google.com)
2. Create a new project (e.g. `stem26-app`)

### 2. Enable Authentication
- Go to **Authentication → Sign-in method**
- Enable **Email/Password**

### 3. Enable Firestore
- Go to **Firestore Database → Create database**
- Start in **test mode** (or use the security rules below)

### 4. Get Config
- Go to **Project Settings → Your apps → Web app**
- Copy the config values

### 5. Set Admin Role
After a user registers, go to **Firestore → users → {uid}** and set `role: "admin"` to promote them to admin.

---

## 🔐 Firestore Security Rules

Paste these in **Firestore → Rules**:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can read/write their own data
    match /users/{userId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && request.auth.uid == userId;
      allow update: if request.auth != null && 
        (request.auth.uid == userId || 
         get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin');
    }

    // Questions: anyone authenticated can read published, admin can write
    match /questions/{questionId} {
      allow read: if request.auth != null && (resource.data.status == 'published' || 
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin');
      allow write: if request.auth != null && 
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }

    // Sessions: authenticated can read live/ended, admin can write
    match /sessions/{sessionId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && 
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }

    // Teams: all authenticated can read, admin can write
    match /teams/{teamId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && 
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }

    // Answers: users can create their own answers, read all
    match /answers/{answerId} {
      allow read: if request.auth != null;
      allow create: if request.auth != null && request.resource.data.userId == request.auth.uid;
    }

    // Practice attempts: user can read/write own data
    match /practiceAttempts/{userId}/attempts/{attemptId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

---

## 🛠️ Local Development

### 1. Clone & Install
```bash
git clone <your-repo>
cd stem26-app
npm install
```

### 2. Environment Variables
```bash
cp .env.local.example .env.local
# Edit .env.local with your Firebase config
```

### 3. Run Dev Server
```bash
npm run dev
# Open http://localhost:3000
```

### 4. Load Demo Data
1. Login/register an account
2. Set `role: "admin"` in Firestore for that user
3. Go to `/admin/questions` → click **"Seed Demo"** to load 12 sample questions

---

## 🚀 Deploy on Vercel

1. Push code to GitHub
2. Import repo in [vercel.com](https://vercel.com)
3. Add **Environment Variables** (same as `.env.local`)
4. Click **Deploy**

---

## 🧪 Testing Realtime Features

### Module 2 (Team Battle) & Module 3 (Flash):
1. Open **2-3 browser tabs** (or use incognito)
2. Register different accounts
3. Admin creates a session and goes to `/admin/sessions`
4. Click "Bắt Đầu LIVE" to start the session
5. Students join from `/battle/team-battle` or `/battle/flash`
6. Admin clicks "Câu Tiếp" to advance questions

### Using Server Timestamps:
All answer timestamps use `serverTimestamp()` from Firestore to ensure fairness. The earliest correct answer timestamp wins each question.

---

## 📁 Project Structure

```
src/
├── app/
│   ├── (auth) /auth/login, /auth/register
│   ├── dashboard/
│   ├── battle/warrior, team-battle, flash
│   ├── admin/ (overview, questions, sessions, teams, results)
│   ├── unauthorized/
│   └── globals.css
├── components/
│   ├── ui/     Button, Card, Input, Modal, Badge, Countdown, NavHeader
│   ├── effects/ FireBackgroundCanvas
│   └── auth/   AuthGuard, RoleGuard
├── lib/
│   ├── firebase.ts, auth.tsx, firestore.ts, roles.ts
│   └── ai-question-generator.ts (mock + API hook)
├── data/
│   └── demoQuestions.ts (12 sample questions)
└── types/
    └── user.ts, question.ts, session.ts, answer.ts
```

---

## 🤖 AI Question Generation

Currently uses **mock data** with 12+ sample questions. To integrate real AI:

1. Get a [Gemini API Key](https://aistudio.google.com/)
2. Add to `.env.local`: `GEMINI_API_KEY=your_key`
3. Create `/src/app/api/generate-questions/route.ts` and call Gemini API
4. Update `callAIAPI()` in `src/lib/ai-question-generator.ts` to call your API route

---

## 🎨 UI Theme

| Color | Hex | Usage |
|-------|-----|-------|
| Fire Red | `#ff2a2a` | Primary/danger |
| Fire Orange | `#ff7a00` | Hover/active/accent |
| Fire Yellow | `#ffc400` | Highlight/score |
| Bg Dark | `#0a0a0a` | Background |
| Bg Card | `#1a1a1a` | Cards |

Fonts: **Orbitron** (headings) + **Inter** (body)

---

*Built with ❤️ for STEM26 - Năng Lượng Xanh 2025*
