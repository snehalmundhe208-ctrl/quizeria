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

## 🔑 Demo Accounts

For local development and testing, access the separate login portals using these mock credentials:

### 1. Administrator Portal
* **URL**: `/admin/login`
* **Username**: `admin`
* **Password**: `admin123`
* **Role Capabilities**: List registered educators, inspect usage, and deactivate/activate teacher accounts.

### 2. Teacher Portal
* **URL**: `/teacher/login` (Registration at `/teacher/register`)
* **Email/Username**: `teacher@school.edu`
* **Password**: `password123`
* **Role Capabilities**: Upload study materials (PDF/DOCX/PPTX/TXT), generate and manage the AI Question Bank, publish quizzes with shareable codes, generate printable PDF Question Papers (student sheets and admin keys), and review short-answer submissions.

### 3. Student Portal
* **URL**: `/student/login` (Registration at `/student/register`)
* **Email**: `student@school.edu`
* **Password**: `password123`
* **Role Capabilities**: Enroll in shared quizzes, attempt exams under timed conditions, review score report cards, and track historical results on the **My Attempts** dashboard.

---

## 🛡️ Portals & Access Control

* **Admin Portal** (`/admin/login`): Restricted to accounts with `ADMIN` privileges. Non-admins are redirected back to the homepage.
* **Teacher Portal** (`/teacher/login`): Scopes all uploaded documents, question papers, and analytics to the logged-in teacher's account.
* **Student Portal** (`/student/login`): Restricts students from viewing or accessing administrative dashboards. Any attempt to access `/questions`, `/documents`, or other educator panels automatically redirects the student session to `/student/attempts`.
