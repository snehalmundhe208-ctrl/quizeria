# StudyForge AI — AI-Powered Educational Assessment SaaS

StudyForge AI is a multi-tenant education platform designed to turn academic lecture notes, slides, and textbooks into structured, auto-evaluated student assessments, printable question papers, and mastery metrics in minutes.

---

## 🛠️ Tech Stack

* **Frontend**: React (Vite), Tailwind CSS (Light-Theme Redesign), Lucide Icons
* **Backend**: Express (Node.js), Multer (File Uploading), PDF-parse / Mammoth (Document extraction)
* **Database**: PostgreSQL, Prisma ORM
* **AI Engine**: Gemini 1.5 Flash (via `@google/generative-ai` with structured JSON configurations)

---

## 🚀 Setup & Local Installation

### 1. Environment Variable Config
Create a `.env` file inside the `backend/` folder:
```env
PORT=5000
DATABASE_URL="postgresql://postgres:postgres123@localhost:5432/studyforge?schema=public"
JWT_SECRET="c6d1cf9c9e5e783cb2ef8da38d5db32501a3cfb4eb4a9bb5debc89ba6e8c7db3"
GEMINI_API_KEY="AIzaSyYourGeminiApiKeyHere"
ADMIN_USERNAME=admin
ADMIN_PASSWORD=admin123
```

Create a `.env` file inside the `frontend/` folder:
```env
# Optional client configs
VITE_API_URL=http://localhost:5000
```

### 2. Install Dependencies
Run in both the `frontend/` and `backend/` directories:
```bash
npm install
```

### 3. Setup Database Schema
Execute in the `backend/` folder to create tables and generate type bindings:
```bash
npx prisma db push
```

### 4. Seed Admin Credentials
Run database seeds in the `backend/` folder to bootstrap the default System Administrator:
```bash
npx prisma db seed
```

### 5. Start Development Servers
* **Backend** (port `5000`):
  ```bash
  cd backend
  npm run dev
  ```
* **Frontend** (port `5173`):
  ```bash
  cd frontend
  npm run dev
  ```

---

## 🔑 Unified Login & Demo Accounts

All roles (Admin, Teacher, Student) log in from a single unified portal at **/login**. The system automatically detects the user's role upon authentication and redirects them to their respective dashboard:

* **Single Login URL**: `/login`

### Demo Credentials:

#### 1. Administrator Account
* **Username/Email**: `Snehal`
* **Password**: `Snehal20`
* **Dashboard**: `/admin/dashboard`
* **Role Capabilities**: Platform-wide metrics dashboard, manage teacher credentials, and activate/deactivate accounts.

#### 2. Educator / Teacher Account
* **Username/Email**: `teacher@school.edu`
* **Password**: `password123`
* **Dashboard**: `/teacher/dashboard`
* **Role Capabilities**: Upload study materials (PDF/DOCX/PPTX/TXT), generate and manage the AI Question Bank, publish quizzes with shareable codes, generate printable PDF Question Papers, and review submissions.

#### 3. Student Account
* **Username/Email**: `student@school.edu`
* **Password**: `password123`
* **Dashboard**: `/student/dashboard` (Self-registration available at `/student/register`)
* **Role Capabilities**: Enroll in shared quizzes, attempt exams under timed conditions, review score cards, and track historical results on the **My Attempts** dashboard.

---

## 🛡️ Portals & Access Control

* **Unified Portal** (`/login`): Accessible to all users. Authenticates credentials against the database, issues a role-embedded JWT token, and routes to the appropriate dashboard.
* **Student Self-Registration** (`/student/register`): Allows students to create new accounts.
* **Educator Account Creation**: Admin-only privilege via the `/admin/teachers` management page.
* **Access Control**: Users are restricted to their authorized routes (`RoleRoute`). Students attempting to view educator pages (`/documents`, `/questions`, etc.) are redirected to `/student/dashboard`.
