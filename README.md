# Sports Scheduler App ⚽🏀🎾

A complete, production-ready Full-Stack Node.js web application built for the **WD501 Capstone Project**. The app allows users to create sports categories, host match sessions, join available open player slots with team assignment, and view detailed admin analytics reports.

---

## 🚀 Tech Stack & System Architecture

- **Backend Runtime:** Node.js (v18+) with NPM
- **Web Framework:** Express.js
- **Database & ORM:** PostgreSQL & Sequelize ORM (with CLI migrations & models)
- **Templating Engine:** EJS (Embedded JavaScript) for Server-Side Rendering (SSR)
- **Authentication & Security:**
  - Passport.js (Local Strategy with session persistence)
  - bcrypt (Password hashing with salt rounds)
  - express-session & connect-flash (Flash alert messages)
  - csurf (CSRF Protection on form submissions)
- **Testing Framework:** Jest & Supertest (Integration testing suite)
- **Architecture Pattern:** MVC (Model-View-Controller) organized via vertical feature slices.

---

## 📂 Repository File Structure

```
Sports-Tracker/
├── config/
│   ├── config.json         # PostgreSQL environments (development, test, production)
│   └── passport.js        # Passport Local Strategy & Session serialization
├── controllers/
│   ├── authController.js   # User Sign-up, Sign-in, Sign-out logic
│   ├── sportController.js  # Sports category management (Admin)
│   ├── sessionController.js# Match scheduling, joining, past validation, cancellation
│   └── reportController.js # Admin analytics & sport popularity reports
├── middleware/
│   └── auth.js             # ensureAuthenticated & ensureAdmin guards
├── migrations/
│   ├── 20260921000100-create-users.js
│   ├── 20260921000200-create-sports.js
│   ├── 20260921000300-create-sessions.js
│   └── 20260921000400-create-sessionplayers.js
├── models/
│   ├── index.js            # Sequelize initialization with SQLite in-memory test fallback
│   ├── user.js             # User model with role ('admin', 'player')
│   ├── sport.js            # Sport model
│   ├── session.js          # Session (Match) model with cancellation reason
│   └── sessionplayer.js    # SessionPlayer junction model (User <-> Session)
├── public/
│   └── css/
│       └── style.css       # Clean, modern responsive stylesheet
├── routes/
│   ├── auth.js             # /auth/signup, /auth/login, /auth/logout
│   ├── sports.js           # /sports, /sports/new
│   ├── sessions.js         # /sessions/new, /sessions/:id, /sessions/:id/join, /sessions/:id/cancel
│   ├── reports.js          # /reports (Admin dashboard)
│   └── index.js            # /, /dashboard
├── tests/
│   └── app.test.js         # Automated integration tests (Jest & Supertest)
├── views/
│   ├── partials/
│   │   ├── header.ejs      # Navbar & Flash alert messages wrapper
│   │   └── footer.ejs      # Footer partial
│   ├── layout.ejs          # Base EJS layout
│   ├── login.ejs           # Sign in view
│   ├── signup.ejs          # Sign up view (Role selection)
│   ├── dashboard.ejs       # Categorized tabbed dashboard
│   ├── sports/
│   │   ├── index.ejs       # Sports listing
│   │   └── new.ejs         # Create sport form
│   ├── sessions/
│   │   ├── new.ejs         # Host match form
│   │   └── show.ejs        # Match detail, player roster & cancellation prompt
│   ├── reports/
│   │   └── index.ejs       # Admin analytics view
│   └── error.ejs           # Error display page
├── .env.example            # Environment variables template
├── .env                    # Local environment variables
├── app.js                  # Main Express app & route wiring
├── package.json            # Project dependencies & scripts
└── README.md               # Project documentation
```

---

## 🛢️ Database Models & Relationships

1. **User**
   - Fields: `id`, `name`, `email` (unique), `password` (hashed), `role` (`'admin'` or `'player'`), `createdAt`, `updatedAt`.
   - Associations: Has many `Sports` (as admin), `Sessions` (as host/creator), and `SessionPlayers`.

2. **Sport**
   - Fields: `id`, `name` (unique), `adminId` (foreign key to User), `createdAt`, `updatedAt`.
   - Associations: Belongs to `User` (admin), Has many `Sessions`.

3. **Session (Match)**
   - Fields: `id`, `sportId` (foreign key to Sport), `creatorId` (foreign key to User), `venue`, `date`, `time`, `additionalPlayersNeeded`, `isCancelled` (boolean, default `false`), `cancellationReason` (string/text), `createdAt`, `updatedAt`.
   - Associations: Belongs to `Sport`, Belongs to `User` (creator), Has many `SessionPlayers`.

4. **SessionPlayer (Junction Table)**
   - Fields: `id`, `sessionId` (foreign key to Session), `userId` (foreign key to User), `teamName` (string/text), `createdAt`, `updatedAt`.
   - Unique Index: `(sessionId, userId)` to prevent duplicate player entries.

---

## ⚙️ Installation & Setup Guide

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment Variables
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Ensure your local PostgreSQL connection settings in `.env` and `config/config.json` match your database credentials.

### 3. Run Database Migrations
Create the development PostgreSQL database (`sports_scheduler_development`) and run Sequelize migrations:
```bash
npm run db:migrate
```

For the test database (`sports_scheduler_test`):
```bash
npm run db:migrate:test
```

---

## 🧪 Automated Testing

Execute the complete automated integration test suite using Jest and Supertest:

```bash
npm test
```

The test suite validates:
- User signup and login (Admin & Player roles)
- Creation of sports categories by Admins
- Creation of future match sessions by hosts
- Player joining open slots and duplicate join prevention
- Business rule check: PREVENT joining past sessions
- Cancellation of match sessions with mandatory cancellation reasons

---

## 🏃 Running the Application

### Development Mode (with Nodemon hot reloading):
```bash
npm run dev
```

### Production Mode:
```bash
npm start
```

Visit the application in your browser at:
👉 **[http://localhost:3000](http://localhost:3000)**

---

## 🎯 Key Application Features & User Stories

1. **Role-Based Authentication:**
   - Sign up as a **Player** or **Administrator**.
   - Admins gain access to create sport categories and view analytical reports.

2. **Categorized Dashboard:**
   - **Available Upcoming Sessions:** Browse open matches with remaining slot counts.
   - **Sessions Created by Me:** View and manage matches hosted by your account.
   - **Sessions Joined by Me:** Track games you are enrolled in.
   - **Cancelled Sessions:** View cancelled games with mandatory cancellation reasons.

3. **Match Joining & Validation:**
   - Players can join open slots and assign themselves a team name.
   - Validation prevents duplicate joining and blocks joining past or cancelled sessions.

4. **Session Cancellation:**
   - Hosts and Admins can cancel a session by submitting a mandatory cancellation reason.
   - All enrolled players see the cancellation alert and explanation.

5. **Admin Analytics Reports:**
   - Filter matches by custom date range.
   - Track total sessions played, active vs cancelled counts, cancellation rate percentage, and sport popularity breakdown.
