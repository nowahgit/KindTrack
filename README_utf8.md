# 🌱 KindTrack

**Track Kindness. See the Impact.**

KindTrack is a modern web application designed to help people build a sustainable habit of kindness. By logging small acts of daily kindness, users can visualize their positive impact on the world, receive AI-driven reflections, and stay motivated through community goals.

[![Firebase](https://img.shields.io/badge/Live-Demo-orange?style=flat-square&logo=firebase)](https://kindtrack.web.app)
[![Tech](https://img.shields.io/badge/Tech-Vanilla_JS-yellow?style=flat-square)](#technology-stack)
[![Design](https://img.shields.io/badge/Design-Premium-blue?style=flat-square)](#design-philosophy)

---

## ✨ Key Features

- **Premium Dashboard:** A high-end user interface with dark sidebar navigation, real-time statistics, and activity heatmaps.
- **Impact Tracking:** Visualize your contribution over time with beautiful interactive charts (Chart.js).
- **AI Reflections:** Get personalized insights and reflections based on your acts of kindness (powered by simulated AI logic).
- **Visual Log:** Log your kindness acts with an intuitive category picker using visual cards and emojis.
- **Authentication:** Secure sign-in and sign-up powered by Firebase Authentication with Indonesian/English error messaging.
- **Responsive Design:** Fully optimized for mobile, tablet, and desktop viewing.

---

## 🛠️ Technology Stack

- **Frontend:** HTML5, Vanilla CSS3 (Custom Design System), Vanilla JavaScript (ES6+).
- **Backend:** 
  - **Firebase Auth:** Secure user management.
  - **Firebase Firestore:** Scalable NoSQL database for activity logs.
- **Hosting:** Firebase Hosting.
- **Libraries:**
  - **Chart.js:** For data visualization.
  - **Font Awesome:** For premium iconography.
  - **Google Fonts:** Using the *Mulish* family for a clean, professional look.

---

## 📁 Project Structure

```text
KindTrack/
├── public/
│   ├── assets/           # Images and static assets
│   ├── css/
│   │   └── style.css     # Main Design System & UI styles
│   ├── js/
│   │   ├── ai.js         # AI logic and simulations
│   │   ├── auth.js       # Firebase Auth handlers & guards
│   │   ├── dashboard.js  # Dashboard interactivity & data fetching
│   │   ├── kindness.js   # Log entry logic
│   │   ├── utils.js      # Shared helper functions
│   │   └── firebase-init.js
│   ├── pages/
│   │   ├── activity.html
│   │   ├── add-kindness.html
│   │   ├── dashboard.html
│   │   └── login.html
│   └── index.html        # Premium Landing Page
├── firestore.rules       # Database security rules
├── firestore.indexes.json
├── firebase.json         # Deployment configuration
└── README.md
```

---

## � Getting Started

### Prerequisites
- Node.js installed
- Firebase CLI (`npm install -g firebase-tools`)

### Local Setup
1. Clone the repository:
   ```bash
   git clone https://github.com/nowahgit/KindTrack.git
   cd KindTrack
   ```

2. Initialize Firebase (if not already done):
   ```bash
   firebase login
   firebase use <your-project-id>
   ```

3. Open `public/index.html` in your browser (preferably via a local server like VS Code Live Server).

### Deployment
To deploy your changes to the live site:
```bash
firebase deploy
```

---

## 🎨 Design Philosophy

KindTrack is built with a **Human-Centered** and **Premium** aesthetic. 
- **Typography:** We use *Mulish* to provide modern readability with a touch of elegance.
- **Glassmorphism:** Subtle background blurs and borders to create depth.
- **Micro-interactions:** Smooth transitions and fade-up animations (0.3s-0.5s) to make the app feel alive.
- **Sidebar Navigation:** A deep navy/slate sidebar inspired by modern SaaS applications for a professional feel.

---

## 📝 License

Distributed under the MIT License. See `LICENSE` for more information.

---

**Kindness is a ripple. Start yours today.**
