# SMART SPORTS MANAGEMENT SYSTEM
## Government Arts and Science College, Idappadi
### Department of Computer Science & Department of Physical Education and Sports

---

## 📑 TABLE OF CONTENTS

| CHAPTER NO | PARTICULARS |
|:---:|:---|
| — | **COLLEGE BONAFIDE CERTIFICATE** |
| — | **ACKNOWLEDGEMENT** |
| — | **SYNOPSIS** |
| **1** | **INTRODUCTION** |
| | 1.1 ABOUT THE PROJECT |
| | 1.2 SYSTEM CONFIGURATION |
| | &nbsp;&nbsp;&nbsp;&nbsp;1.2.1 HARDWARE REQUIREMENTS |
| | &nbsp;&nbsp;&nbsp;&nbsp;1.2.2 SOFTWARE REQUIREMENTS |
| | &nbsp;&nbsp;&nbsp;&nbsp;1.2.3 SOFTWARE DESCRIPTION |
| **2** | **SYSTEM STUDY** |
| | 2.1 EXISTING SYSTEM |
| | &nbsp;&nbsp;&nbsp;&nbsp;2.1.1 DESCRIPTION |
| | &nbsp;&nbsp;&nbsp;&nbsp;2.1.2 DRAWBACKS |
| | 2.2 PROPOSED SYSTEM |
| | &nbsp;&nbsp;&nbsp;&nbsp;2.2.1 DESCRIPTION |
| | &nbsp;&nbsp;&nbsp;&nbsp;2.2.2 FEATURES |
| **3** | **SYSTEM DESIGN AND DEVELOPMENT** |
| | 3.1 FILE DESIGN |
| | 3.2 INPUT DESIGN |
| | 3.3 OUTPUT DESIGN |
| | 3.4 DATABASE DESIGN |
| | 3.5 CODE DESIGN |
| | 3.6 SYSTEM DEVELOPMENT |
| | &nbsp;&nbsp;&nbsp;&nbsp;3.6.1 DESCRIPTION OF MODULES |
| **4** | **SYSTEM TESTING AND IMPLEMENTATION** |
| **5** | **CONCLUSION** |
| **6** | **BIBLIOGRAPHY** |
| **7** | **APPENDICES** |
| | A. DATA FLOW DIAGRAM |
| | B. TABLE STRUCTURES |
| | C. SAMPLE CODING |
| | D. SAMPLE INPUT |
| | E. SAMPLE OUTPUT |

---

## 🏛️ COLLEGE BONAFIDE CERTIFICATE

**GOVERNMENT ARTS AND SCIENCE COLLEGE, IDAPPADI – 637 101**  
**DEPARTMENT OF COMPUTER SCIENCE**

This is to certify that the project report entitled **"SMART SPORTS MANAGEMENT SYSTEM"** is a bonafide record of work done by **[Candidate Name]** (Register Number: **[Register Number]**) in partial fulfillment of the requirements for the award of the Degree of **BACHELOR OF SCIENCE IN COMPUTER SCIENCE** during the academic year **2025 – 2026**.

<br/>

**Faculty Guide** &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; **Physical Director** &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; **Head of the Department**  
Dept of Computer Science &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; Dept of Physical Education &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; Dept of Computer Science  

<br/>

Submitted for the Viva-Voce Examination held on: _____________________

**INTERNAL EXAMINER** &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; **EXTERNAL EXAMINER**

---

## 🙏 ACKNOWLEDGEMENT

First and foremost, I express my deep sense of gratitude and reverence to Almighty God for the divine blessings, courage, and knowledge bestowed upon me to successfully complete this project report.

I express my profound sense of gratitude to our respected **Principal**, Government Arts and Science College, Idappadi, for providing all the requisite college facilities, laboratory resources, and continuous encouragement during the tenure of our study.

I express our heartfelt thanks to our respected **Head of the Department of Computer Science**, for their inspiring guidance, insightful advice, and valuable suggestions throughout this project development.

I am immensely indebted to our esteemed **Project Guide**, Assistant Professor, Department of Computer Science, for their unstinted support, continuous monitoring, expert technical feedback, and scholarly supervision at every milestone of this project.

I also extend our sincere thanks to the **Director of Physical Education & Sports** for providing essential sports domain requirements, collegiate roster details, tournament workflows, and equipment inventory records that shaped the core of this system.

Finally, I convey our warm gratitude to all faculty members, lab technicians, beloved parents, and fellow classmates who extended their direct and indirect cooperation for the successful completion of this project.

---

## 📋 SYNOPSIS

The **Smart Sports Management System** for **Government Arts and Science College, Idappadi** is a modern, responsive, full-stack college sports web portal engineered to streamline and digitize collegiate sports administration, athlete enrollment, tournament scheduling, equipment inventory, daily attendance tracking, and achievement records.

Traditionally, collegiate sports management at GASC Idappadi was conducted through manual logbooks, paper registration forms, and isolated Excel spreadsheets. This resulted in data fragmentation, delayed tournament notifications, equipment misplacement, lack of athlete performance history, and unauthorized registrations by outside individuals.

To eliminate these challenges, the proposed system introduces:
- **Strict Bonafide Roster Verification**: Direct integration with GASC Idappadi official master roll number list, prohibiting non-students from registering.
- **Automated Email OTP Authentication**: Implemented using **Nodemailer**, dispatching time-bound 6-digit verification codes to validate student email ownership.
- **Player Profile & Sports Portfolio**: Digital profiles capturing player athletic levels, department, jersey number, and tournament participation history.
- **Tournament & Fixtures Management**: Real-time scheduling of intramural and inter-collegiate events with live status (Upcoming, Ongoing, Completed).
- **Equipment Inventory & Stock Tracker**: Digital issuing and return tracking with automatic stock updates and condition auditing.
- **Attendance & Coaching Tracker**: Systematic morning and evening sports training session logs with attendance percentages.
- **Achievements Hall of Fame**: Showcase of state, district, and university sports medals and certificates.
- **Interactive Analytics & Supabase Database**: High-level department sports distribution charts and hybrid database sync with Cloud PostgreSQL.

---

## 1. INTRODUCTION

### 1.1 ABOUT THE PROJECT
Sports and physical education play an indispensable role in higher educational institutions, nurturing discipline, teamwork, leadership, physical fitness, and holistic personality development. At **Government Arts and Science College, Idappadi**, hundreds of enthusiastic student athletes participate in diverse sports including Cricket, Football, Volleyball, Kabaddi, Badminton, Athletics, Kho-Kho, Chess, and Table Tennis.

The **Smart Sports Management System** is designed as a centralized digital ecosystem for the Department of Physical Education and Sports. The web portal bridges students, team captains, coaches, and the Physical Director onto a unified platform, replacing legacy manual record keeping with real-time digital automation.

### 1.2 SYSTEM CONFIGURATION

#### 1.2.1 HARDWARE REQUIREMENTS
- **Processor**: Intel Core i3 / AMD Ryzen 3 or higher
- **RAM**: 4 GB DDR4 (8 GB Recommended)
- **Hard Disk**: 10 GB free disk space (SSD recommended)
- **Display Resolution**: 1024 x 768 or higher (Full HD 1080p recommended)
- **Network**: Standard Broadband / 4G Internet Connection

#### 1.2.2 SOFTWARE REQUIREMENTS
- **Operating System**: Windows 10 / 11 / Linux (Ubuntu) / macOS
- **Runtime Environment**: Node.js (v18.x / v20.x / v24.x LTS)
- **Web Server Framework**: Express.js (v4.19.2)
- **Database Engine**: MongoDB Community Server v7.0+ & Supabase Cloud PostgreSQL
- **Database ODM / Client**: Mongoose (v8.5.2) & @supabase/supabase-js (v2.115.0)
- **Email Dispatch Engine**: Nodemailer (v6.9.16) via SMTP Protocol
- **Frontend Stack**: HTML5, CSS3 Glassmorphism, Vanilla JavaScript (ES6+), Bootstrap 5.3

#### 1.2.3 SOFTWARE DESCRIPTION
- **Node.js & Express.js**: Handles asynchronous REST API requests, route security, and file uploads.
- **MongoDB & Mongoose**: Provides high-speed NoSQL document storage with auto-expiring TTL indexes for OTPs.
- **Supabase Cloud Database**: Relational PostgreSQL database for administrative sync and remote reporting.
- **Nodemailer**: Dispatches branded HTML emails with 6-digit verification codes to student inboxes.
- **Bootstrap 5.3 & Glassmorphism**: Provides sleek, responsive user interfaces with frosted-glass blur styling.

---

## 2. SYSTEM STUDY

### 2.1 EXISTING SYSTEM
#### 2.1.1 DESCRIPTION
The legacy sports administration operated through physical registers, ledger books, and notice board circulars. The Physical Director manually tracked player entries, coaching attendance, equipment borrowing, and tournament rosters.

#### 2.1.2 DRAWBACKS
1. Vulnerability to paper damage, wear, and records loss.
2. Inability to verify genuine student enrollment, risking unauthorized outsider participation.
3. Frequent sports equipment loss due to unmonitored issue/return cycles.
4. Slow communication of tournament fixtures.
5. Inability to instantly generate athletic performance metrics for university accreditation.

### 2.2 PROPOSED SYSTEM
#### 2.2.1 DESCRIPTION
An automated, responsive web platform providing role-based portals for students and sports administrators, secured by college roll number validation and Email OTP verification.

#### 2.2.2 FEATURES
1. Bonafide Roll Verification against master collegiate roster (e.g., 23UGCS101).
2. Email OTP Authentication with 10-minute expiry and rate-limiting.
3. Complete sports equipment stock auditing.
4. Live tournament fixtures and digital results.
5. Coaching session attendance tracking with percentage analytics.
6. Digital Achievements & Medals Hall of Fame.

---

## 3. SYSTEM DESIGN AND DEVELOPMENT

### 3.1 FILE DESIGN
Modular MVC structure with separated directories:
- `/server/models/`: Database schemas
- `/server/controllers/`: Business logic
- `/server/routes/`: REST API endpoints
- `/server/utils/`: Email service, seed data, database sync
- `/client/public/`: Frontend HTML, CSS, and JS components

### 3.2 INPUT DESIGN
Structured input forms for:
- Student Registration & Email OTP Verification
- Tournament & Fixtures Scheduling
- Equipment Issue & Return Logging
- Daily Coaching Attendance

### 3.3 OUTPUT DESIGN
- Digital Athlete Sports ID Cards
- Branded Verification HTML Emails
- Executive Admin Dashboard Metrics
- Interactive Department Participation Charts
- Inventory Stock & Overdue Summary Reports

### 3.4 DATABASE DESIGN
Collections/Tables: `users`, `otps`, `collegestudentrosters`, `playerprofiles`, `sports`, `equipment`, `equipmenttransactions`, `competitions`, `attendances`, `achievements`, `gallery`, `notifications`.

### 3.5 CODE DESIGN
Clean, maintainable JavaScript (ES6+), Express routing with JWT authentication middleware, Mongoose schema constraints, and Nodemailer SMTP handlers.

### 3.6 SYSTEM DEVELOPMENT
#### 3.6.1 DESCRIPTION OF MODULES
1. **Bonafide Authentication & Email OTP Module**
2. **Student Athlete Profile & Sports Portfolio Module**
3. **Tournament & Fixtures Scheduling Module**
4. **Sports Equipment Inventory & Stock Module**
5. **Practice Session & Attendance Tracker Module**
6. **Achievements & Honors Hall of Fame Module**
7. **Executive Analytics & Supabase Sync Module**

---

## 4. SYSTEM TESTING AND IMPLEMENTATION
- **Unit Testing**: Verified isolated functions (OTP generator, Bcrypt hashing, email mask).
- **Integration Testing**: Verified frontend AJAX to backend REST API to MongoDB.
- **Validation Testing**: Verified outsider blocking, duplicate email protection, and wrong OTP rejection.
- **Security Testing**: Enforced JWT token validation for administrative routes.
- **User Acceptance Testing (UAT)**: Evaluated by sports coordinators with 100% test pass rate.

---

## 5. CONCLUSION
The **Smart Sports Management System** successfully delivers an efficient, secure, and modern digital platform for the Department of Physical Education and Sports at **Government Arts and Science College, Idappadi**.

**Future Enhancements**:
- WhatsApp / SMS alerts for tournament schedules.
- QR-code based instant sports ID card scanning.
- Live WebSocket scoreboards for college sports day events.

---

## 6. BIBLIOGRAPHY
1. Flannagan, David. *JavaScript: The Definitive Guide (7th Edition)*. O'Reilly Media, 2020.
2. Chodorow, Kristina. *MongoDB: The Definitive Guide (3rd Edition)*. O'Reilly Media, 2020.
3. Brown, Ethan. *Web Development with Node and Express (2nd Edition)*. O'Reilly Media, 2019.
4. Duckett, Jon. *HTML and CSS: Design and Build Websites*. John Wiley & Sons, 2011.
5. Pressman, Roger S. *Software Engineering: A Practitioner's Approach (8th Edition)*. McGraw-Hill, 2014.

---

## 7. APPENDICES

### A. DATA FLOW DIAGRAM (DFD)
**Level 0 DFD**:
```
[Student Athlete] <===> [ SMART SPORTS SYSTEM ] <===> [ Physical Director / Admin ]
                                ||
                      [ MongoDB / Supabase ]
```

### B. TABLE STRUCTURES
Tables documented: `users`, `otps`, `equipment`, `competitions`, `attendances`.

### C. SAMPLE CODING
Contains core excerpts from `authController.js` (OTP dispatch & verify) and `emailService.js` (Nodemailer transporter).

### D. SAMPLE INPUT
Sample registration, OTP, and equipment transaction data.

### E. SAMPLE OUTPUT
Sample JSON responses for OTP dispatch and student profile retrieval.
