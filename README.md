# ⚙️ CI/CD Log Monitoring Dashboard

A real-time dashboard to visualize and monitor logs from your CI/CD pipeline. Built with **React**, **Vite**, **Firebase Firestore**, and styled with **ShadCN UI + CSS Modules**.

---
## 🔍 Features

- 📡 **Real-time Firestore log updates**
- 🧾 Clickable log cards with detailed modal view
- 🔁 Automatically reflects logs from Jenkins or any CI system
- 🎨 Clean, responsive UI with custom scrollbars and animations
- ☁️ Firebase backend integration for seamless cloud logging

---

## 📦 Tech Stack

| Technology    | Usage                        |
|---------------|------------------------------|
| React + Vite  | Frontend Framework & Bundler |
| Firebase      | Firestore for log storage    |
| ShadCN UI     | UI Components                |
| CSS Modules   | Component-scoped styling     |

---

## 🚀 Getting Started

### 1. Clone the Repo

```bash
git clone https://github.com/your-username/ci-cd-dashboard.git
cd ci-cd-dashboard
```

2. Install Dependencies
   
```bash
Copy
Edit
npm install
```

4. Configure Firebase
Create a Firebase project at firebase.google.com

Enable Firestore (test mode)

In src/firebase.ts, add your Firebase config:

ts
Copy
Edit
const firebaseConfig = {
  apiKey: "...",
  authDomain: "...",
  projectId: "...",
  ...
};

4. Run the Dev Server
```bash
Copy
Edit
npm run dev
App runs at: http://localhost:5173
```

## 🧱 Firestore Log Structure
Logs are stored in a Firestore collection called logs. Each log document should follow this format:
```
json
Copy
Edit
{
  "timestamp": "2025-08-02T15:10:00Z",
  "level": "INFO",
  "message": "Docker image pushed to registry.",
  "pipelineId": "build-xyz123",
  "details": {
    "step": "docker_push",
    "status": "success"
  }
}
```
## 🛠 Project Structure
```
css
Copy
Edit
src/
├── components/
│   ├── App.tsx
│   ├── Navbar.tsx
│   ├── LogViewer.tsx
│   ├── LogCard.tsx
│   └── LogDetailsModal.tsx
├── styles/
│   └── Dashboard.module.css
├── firebase.ts
└── main.tsx
```

# 🔗 Integrate with Jenkins (Optional)
You can send logs from Jenkins into Firestore using a Node.js script + Firebase Admin SDK.


📃 License
MIT License © 2025 [KoushikSagarr]
