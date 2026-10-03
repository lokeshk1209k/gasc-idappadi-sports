# GASC Idappadi — Smart Sports Management System
### Government Arts and Science College, Idappadi
**Department of Physical Education & Sports**

> “Empowering Students Through Sports, Discipline and Excellence”

---

## 📖 Project Overview

**GASC Idappadi – Smart Sports Management System** is a modern, responsive, full-stack college sports web application designed specifically for **Government Arts and Science College, Idappadi**. 

The application digitally replaces paper logs, physical registers, notebooks, and Excel spreadsheets with a centralized database-driven web application tailored for:
1. **Sports Admin / Sports Incharge**: Complete oversight of player directories, sports disciplines, real-time equipment inventory (automated stock subtraction, damaged/lost records, low-stock alerts), collegiate competitions, registration approvals, team rosters, training schedules, attendance tracking, awards, official printable reports, and AI-powered sports insights.
2. **Student / Player**: Self-service enrollment using college register numbers, personal sports profiles, tournament registrations with live approval status, equipment issuance tracking (with overdue return warnings), practice schedules, attendance compliance percentage, and Wall of Fame honours.

---

## 🎨 UI & Aesthetics: Sports Glassmorphism

Built with a custom **Sports Glassmorphism** design system:
- **Frosted Glass Components**: `backdrop-filter: blur(16px)`, translucent white surfaces (`rgba(255, 255, 255, 0.82)`), gradient borders, and soft elevation shadows.
- **Vibrant Sports Colors**: College Deep Navy (`#0d253f`), Royal Blue (`#0f4c81`), Electric Sports Emerald (`#05c46b`), and Flame Amber/Gold (`#f39c12`).
- **Interactive Micro-Animations**: Card tilt lifts, pulse warning badges for **⚠️ Low Stock Equipment**, and animated toast notifications.
- **Print Stylesheet**: Automated clean layout for printing master college reports with official header, signature blocks, and department seal.

---

## 🛠️ Technology Stack

### Frontend
- **HTML5 & CSS3**: Semantic structure with modern CSS custom properties.
- **Bootstrap 5.3 & Bootstrap Icons**: Responsive grid, offcanvas navigation, and modal dialogues.
- **Vanilla JavaScript (ES6+)**: Clean, decoupled MVC client scripts (`api.js`, `auth.js`, `public.js`, `student.js`, `admin.js`, `charts.js`).
- **Chart.js**: Interactive visualizations (Doughnut charts, Bar charts) for sports analytics.

### Backend
- **Node.js & Express.js**: RESTful API architecture with centralized error handling.
- **Mongoose & MongoDB**: Schema-validated data models with compound indexes and pre-save hooks.
- **Authentication**: Role-based access control (RBAC), bcrypt password hashing, and JWT tokens.
- **File Uploads**: Multer middleware for profile pictures, sports equipment photos, and certificates.
- **Dotenv**: Environment variable configuration.

---

## 🗄️ Database Collections (Mongoose Models)

1. **User**: Credentials, role (`admin` vs `student`), registerNumber, department, year, section, contact, status.
2. **Sport**: Sports catalog (Cricket, Volleyball, Football, Kabaddi, Badminton, Athletics, Chess, Basketball, etc.).
3. **PlayerProfile**: Position, jersey number, playing level, statistics (matches played, won, points scored).
4. **Equipment**: Automatic stock calculation (`available = total - issued - damaged - lost`), minimum reserve thresholds, purchase details, location.
5. **EquipmentTransaction**: Student gear issuance, return dates, condition assessment (`Good`, `Damaged`, `Lost`), fines, audit history.
6. **Competition**: Inter-department, inter-college, district, and university sports meets.
7. **CompetitionRegistration**: Student applications with approval status (`Pending`, `Approved`, `Rejected`) and remarks.
8. **Team & TeamMember**: College team rosters, Captains, Vice-Captains, and Coaches.
9. **PracticeSession**: Morning and evening training sessions, venues, focus areas.
10. **Attendance**: Session-wise attendance records (`Present`, `Absent`, `Late`, `Excused`) with student compliance calculation.
11. **Achievement**: Medals (🥇 Gold, 🥈 Silver, 🥉 Bronze), tournament titles, certificates, and Wall of Fame entries.
12. **Notification**: Broadcast alerts, event-triggered notifications (application approval, gear overdue, low stock warning).
13. **Gallery**: Photo highlights of tournaments, Annual Sports Day, and trophy presentations.
14. **AdminSettings**: Department contact details and physical director office timings.

---

## 🚀 Quick Start & Installation

### Prerequisites
- [Node.js](https://nodejs.org/) (v16 or higher)
- [MongoDB](https://www.mongodb.com/) (Local service or MongoDB Atlas connection string)

### 1. Clone or Navigate to Project
```bash
cd C:\Users\ELCOT\.gemini\antigravity-ide\scratch\gasc-idappadi-sports
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Configure Environment Variables
Verify or edit `.env`:
```env
PORT=5000
MONGO_URI=mongodb://127.0.0.1:27017/gasc_sports_db
JWT_SECRET=gasc_idappadi_sports_super_secret_jwt_key_2026
COLLEGE_NAME="Government Arts and Science College, Idappadi"
ADMIN_USERNAME=admin
ADMIN_PASSWORD=admin123
```

### 4. Run Server
```bash
npm start
```
*Note: On first startup, the database automatically seeds with realistic sample sports, equipment inventory (including low-stock demo items), student profiles, competitions, and medals.*

---

## 🔑 Default Demonstration Credentials (For Viva / Evaluation)

### 1. Sports Incharge / Admin
- **Username / Identifier**: `admin` *(or `sportsincharge` / `admin@gascidappadi.edu.in`)*
- **Password**: `admin123`
- **Dashboard**: `http://localhost:5000/admin-dashboard.html`

### 2. Sample Student Player
- **Register Number**: `23UGCS101`
- **Password**: `student123`
- **Dashboard**: `http://localhost:5000/student-dashboard.html`

*(Quick 1-click credential filler buttons are embedded on the login page for instant demonstration).*

---

## 📑 Application Site Map

- **Public Landing Page**: `http://localhost:5000/index.html`
- **About Department**: `http://localhost:5000/about.html`
- **Sports Disciplines**: `http://localhost:5000/sports.html`
- **Collegiate Competitions**: `http://localhost:5000/competitions.html`
- **Hall of Fame & Medalists**: `http://localhost:5000/achievements.html`
- **Campus Gallery**: `http://localhost:5000/gallery.html`
- **Department Contact**: `http://localhost:5000/contact.html`
- **Login Portal**: `http://localhost:5000/login.html`
- **Student Registration**: `http://localhost:5000/register.html`
- **Student Portal**: `http://localhost:5000/student-dashboard.html`
- **Admin Portal**: `http://localhost:5000/admin-dashboard.html`

---

## 📊 Official Department Reports
The Admin Portal includes a built-in report generator supporting 7 master reports:
1. **Player Directory Report**
2. **Equipment Stock & Reserve Health Report**
3. **Equipment Issue & Return Audit Log**
4. **Competitions & Tournaments Summary**
5. **College Teams & Squad Rosters**
6. **Practice Attendance Compliance Report**
7. **Hall of Fame & Medalists Honours Report**

Each report can be viewed in tabular form and printed directly (`Ctrl + P` / Print button) with official college header, department address, seal area, and signature lines for the Physical Director and Principal.

---

## 🔮 Future Enhancements
- Biometric & QR-code attendance scanner for practice grounds.
- SMS / WhatsApp automated notification gateways for emergency practice cancellations.
- Real-time tournament match scorecards and live ball-by-ball commentary for campus cricket and football finals.

---
**Government Arts and Science College, Idappadi**  
*Department of Physical Education & Sports*
