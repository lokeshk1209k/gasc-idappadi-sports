# 🚀 VS Code-ல் இந்த Project-ஐ Run செய்யும் எளிய வழிகள் (How to Run in VS Code)

Government Arts and Science College, Idappadi — Smart Sports Management System

---

## 🌟 முறை 1: VS Code-ல் `F5` அழுத்தி Run செய்வது (Super Easy / Recommended)

1. **VS Code-ல் இந்த Folder-ஐ திறக்கவும்** (`File` > `Open Folder...` > `gasc-idappadi-sports`).
2. உங்கள் Keyboard-ல் **`F5`** பட்டனை அழுத்தவும் (அல்லது இடதுபக்கமுள்ள **Run & Debug** ஐகானை கிளிக் செய்து **"🏆 Run GASC Sports Server (F5)"** என்பதை இயக்கவும்).
3. கீழேயுள்ள Terminal-ல் Server இயங்கத் தொடங்கும்:
   ```
   🚀 Server running on: http://localhost:5000
   🌐 Public Website:    http://localhost:5000/index.html
   ```
4. உங்கள் Browser-ல் **[http://localhost:5000](http://localhost:5000)** என்ற முகவரியைத் திறக்கவும்.

---

## 🌟 முறை 2: VS Code Integrated Terminal மூலம் Run செய்வது

1. VS Code-ல் Terminal திறக்க **`Ctrl + \``** (Ctrl + Backtick) அழுத்தவும்.
2. பின்வரும் command-ஐ type செய்து Enter அழுத்தவும்:
   ```bash
   npm start
   ```
   *(அல்லது `node server/server.js`)*
3. Browser-ல் **[http://localhost:5000](http://localhost:5000)** திறந்து பயன்படுத்தலாம்.

---

## 🌟 முறை 3: Single-Click Batch Script (`start.bat`)

1. Project folder-ல் உள்ள **`start.bat`** என்ற file-ஐ double-click செய்யவும்.
2. இது தானாகவே dependencies சரிபார்த்து, Server-ஐ start செய்து, தானாக Browser-ல் Website-ஐ திறந்துவிடும்!

---

## 🔑 டெமோ உள்நுழைவு விவரங்கள் (Login Credentials for Viva / Demo)

### 1. 🛡️ Sports Incharge / Admin Login:
- **Username / Role:** `admin`
- **Password:** `admin123`
- **URL:** [http://localhost:5000/login.html?role=admin](http://localhost:5000/login.html?role=admin)

### 2. 🎓 Student Athlete Login:
- **Register Number:** `23UGCS101`
- **Password:** `student123`
- **URL:** [http://localhost:5000/login.html](http://localhost:5000/login.html)

---

## 🛡️ Error வராமல் தடுக்கும் சிறப்பம்சங்கள் (Built-in Error Protection):

1. **Port Conflict Protection**: Port 5000 ஏற்கனவே பயன்பாட்டில் இருந்தால், Server தானாகவே அடுத்த port-க்கு (5001) மாறிவிடும்.
2. **Auto Seed System**: புதிய Database கண்டறியப்பட்டால் தானாகவே விளையாட்டு விவரங்கள், மாணவர்கள் மற்றும் உபகரணங்களின் Demo data ஏற்றப்படும்.
3. **Responsive Glassmorphism UI**: கல்லூரி லோகோவுடன் கூடிய பிரீமியம் இடைமுகம்.
