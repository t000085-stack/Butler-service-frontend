# 🤵 AI Butler Backend

> A compassionate AI-powered task management system designed to help users with Executive Dysfunction reduce decision fatigue and take action.

## ✨ Overview

AI Butler is an intelligent backend service that understands your emotional state and energy levels to recommend the _right_ task at the _right_ time. Instead of overwhelming you with a todo list, it gently suggests **one task** that matches your current capacity.

### How It Works

1. **You check in** — Share your current mood and energy level (1-10)
2. **Butler analyzes** — AI considers your tasks' difficulty, emotional friction, and your personal values
3. **One recommendation** — Receive a single, gentle suggestion tailored to your state
4. **History tracked** — All consultations are logged to understand patterns over time

---

## 🛠️ Tech Stack

| Technology        | Purpose                           |
| ----------------- | --------------------------------- |
| **Express.js**    | Web framework                     |
| **TypeScript**    | Type safety                       |
| **MongoDB**       | Database (via Mongoose)           |
| **Google Gemini** | AI intelligence (`@google/genai`) |
| **JWT**           | Authentication                    |

---

## 📦 Installation

```bash
# Clone the repository
git clone <your-repo-url>
cd butler-service-backend

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your values

# Start development server
npm run dev
```

---

## ⚙️ Environment Variables

Create a `.env` file in the root directory:

```env
# Server
PORT=3000
NODE_ENV=development

# MongoDB
MONGODB_URI=mongodb://localhost:27017/twins

# JWT Authentication
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_EXPIRES_IN=7d

# Google Gemini AI
GEMINI_API_KEY=your-gemini-api-key-here
```

### Getting a Gemini API Key

1. Go to [Google AI Studio](https://aistudio.google.com/apikey)
2. Create a new API key
3. Add it to your `.env` file

---

## 🚀 Scripts

```bash
npm run dev      # Start development server with hot reload
npm run build    # Compile TypeScript to JavaScript
npm start        # Run production build
```

---

## 📡 API Reference

### Base URL

```
http://localhost:3000/api
```

### Authentication

All endpoints except `/auth/register`, `/auth/login`, and `/health` require a Bearer token:

```
Authorization: Bearer <your-jwt-token>
```

---

### 🔐 Auth Endpoints

#### Register

```http
POST /api/auth/register
Content-Type: application/json

{
  "username": "johndoe",
  "email": "user@example.com",
  "password": "securepassword",
  "core_values": ["Health", "Creativity", "Family"]  // optional
}
```

#### Login

```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "securepassword"
}
```

**Response:**

```json
{
  "message": "Login successful",
  "user": { "id": "...", "username": "johndoe", "email": "user@example.com" },
  "token": "eyJhbGc..."
}
```

#### Get Profile

```http
GET /api/auth/profile
Authorization: Bearer <token>
```

---

### 📋 Task Endpoints

#### Create Task

```http
POST /api/tasks
Authorization: Bearer <token>
Content-Type: application/json

{
  "title": "Call the dentist",
  "energy_cost": 4,
  "emotional_friction": "High",
  "associated_value": "Health",
  "due_date": "2024-01-20"
}
```

| Field                | Type                        | Required | Description                       |
| -------------------- | --------------------------- | -------- | --------------------------------- |
| `title`              | string                      | ✅       | Task name                         |
| `energy_cost`        | number (1-10)               | ✅       | Mental/physical effort required   |
| `emotional_friction` | `Low` \| `Medium` \| `High` | ✅       | Psychological resistance          |
| `associated_value`   | string                      | ❌       | Matches a value in user's profile |
| `due_date`           | Date (ISO string)           | ❌       | Task deadline                     |

#### List Tasks

```http
GET /api/tasks
GET /api/tasks?includeCompleted=true
Authorization: Bearer <token>
```

#### Get Single Task

```http
GET /api/tasks/:id
Authorization: Bearer <token>
```

#### Update Task

```http
PUT /api/tasks/:id
Authorization: Bearer <token>
Content-Type: application/json

{
  "energy_cost": 3,
  "emotional_friction": "Medium",
  "due_date": "2024-01-25"
}
```

#### Delete Task

```http
DELETE /api/tasks/:id
Authorization: Bearer <token>
```

#### Complete Task

```http
PATCH /api/tasks/:id/complete
Authorization: Bearer <token>
```

---

### 🤵 Butler Endpoints

#### Consult the Butler ⭐

```http
POST /api/butler/consult
Authorization: Bearer <token>
Content-Type: application/json

{
  "current_mood": "overwhelmed",
  "current_energy": 3,
  "raw_input": "I feel stuck and don't know where to start"
}
```

| Field            | Type          | Required | Description                        |
| ---------------- | ------------- | -------- | ---------------------------------- |
| `current_mood`   | string        | ✅       | How you're feeling right now       |
| `current_energy` | number (1-10) | ✅       | Your energy level                  |
| `raw_input`      | string        | ❌       | Free-form expression of your state |

**Response:**

```json
{
  "recommendation": "I hear you — feeling stuck is exhausting. With your energy at 3, let's start tiny. I suggest \"Reply to one email\" — it's low friction and will give you a small win. You've got this. 💙",
  "context_log_id": "507f1f77bcf86cd799439011"
}
```

#### Get Consultation History

```http
GET /api/butler/history
GET /api/butler/history?limit=20
Authorization: Bearer <token>
```

#### Update Butler Profile

```http
PATCH /api/butler/profile
Authorization: Bearer <token>
Content-Type: application/json

{
  "core_values": ["Health", "Career", "Relationships"],
  "baseline_energy": 6
}
```

---

### 🏥 Health Check

```http
GET /api/health
```

**Response:**

```json
{
  "status": "ok",
  "service": "AI Butler API",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

---

## 📊 Data Models (ERD)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              ENTITY RELATIONSHIPS                           │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   USER ||--o{ TASK : "owns"                                                │
│   USER ||--o{ CONTEXT_LOG : "records"                                      │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### User

```typescript
{
  _id: ObjectId,
  username: string,              // unique
  email: string,                 // unique
  password_hash: string,         // hashed
  baseline_energy: number,       // 1-10, default: 5
  core_values: string[],         // e.g., ["Health", "Creativity"]
  created_at: Date
}
```

### Task

```typescript
{
  _id: ObjectId,
  user_id: ObjectId,             // FK → User
  title: string,
  energy_cost: number,           // 1-10
  emotional_friction: "Low" | "Medium" | "High",
  associated_value?: string,     // matches a value in User.core_values
  is_completed: boolean,
  due_date?: Date,
  created_at: Date
}
```

### ContextLog

```typescript
{
  _id: ObjectId,
  user_id: ObjectId,             // FK → User
  raw_input: string,             // user's brain dump text
  mood: string,                  // extracted emotion
  current_energy: number,        // 1-10
  timestamp: Date
}
```

---

## 📁 Project Structure

```
src/
├── config/
│   ├── ai.ts              # Gemini client & system instructions
│   ├── db.ts              # MongoDB connection
│   └── env.ts             # Environment variables
├── controllers/
│   ├── auth.controller.ts
│   ├── butler.controller.ts
│   └── task.controller.ts
├── middlewares/
│   └── auth.middleware.ts # JWT verification
├── models/
│   ├── ContextLog.ts      # Consultation history
│   ├── Task.ts
│   └── User.ts
├── routes/
│   ├── auth.routes.ts
│   ├── butler.routes.ts
│   ├── index.ts
│   └── task.routes.ts
├── services/
│   ├── ai.service.ts      # Gemini API interactions
│   ├── auth.service.ts
│   ├── butler.service.ts  # Orchestration layer
│   └── task.service.ts
├── types/
│   └── index.ts           # TypeScript interfaces
├── validators/
│   └── auth.validator.ts
├── app.ts                 # Express app configuration
└── index.ts               # Entry point
```

---

## 🧠 Understanding the AI Butler

### Energy Cost Scale (1-10)

| Level | Description    | Example Tasks               |
| ----- | -------------- | --------------------------- |
| 1-2   | Effortless     | Drink water, stand up       |
| 3-4   | Light effort   | Reply to text, sort mail    |
| 5-6   | Moderate       | 30-min meeting, grocery run |
| 7-8   | Significant    | Deep work session, exercise |
| 9-10  | Maximum effort | Major presentation, moving  |

### Emotional Friction Levels

| Level      | Description                             |
| ---------- | --------------------------------------- |
| **Low**    | Neutral tasks with no resistance        |
| **Medium** | Slightly uncomfortable, minor avoidance |
| **High**   | Anxiety-inducing, strong avoidance      |

### How Recommendations Work

The AI Butler considers:

1. **Current energy** — Won't suggest a 7-cost task when you're at energy level 2
2. **Emotional friction** — Avoids high-friction tasks when mood is low
3. **Core values** — May suggest a task aligned with values for motivation boost
4. **Task availability** — Only considers incomplete tasks

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📄 License

ISC License

---

## 💬 Philosophy

> "The goal isn't to do everything. The goal is to do _something_ — the right something for right now."

AI Butler doesn't judge. It doesn't push. It simply meets you where you are and helps you take one small step forward.

# butler-service-backend
