# 🛡️ Resilient DevOps Ecosystem & Dashboard

![License](https://img.shields.io/badge/license-MIT-blue.svg) ![React](https://img.shields.io/badge/Frontend-React%20%2B%20Vite-61DAFB) ![Node](https://img.shields.io/badge/Backend-Node.js-green) ![K8s](https://img.shields.io/badge/Orchestration-Kubernetes-326CE5) ![Jenkins](https://img.shields.io/badge/CI%2FCD-Jenkins-D33833)

> **A production-grade CI/CD control plane featuring DevSecOps, Real-time Observability, and Chaos Engineering.**

This project goes beyond simple deployment. It is a **Unified Control Plane** that orchestrates a secure software supply chain, monitors application health in real-time, and proves system resilience through active chaos testing.

---

## 🏗️ Architecture Overview



```text
┌──────────────┐    ┌──────────────┐    ┌──────────────────────┐
│   GitHub     │───▶│   Jenkins    │───▶│  Docker + Kubernetes │
│  (Source)    │    │  (CI/CD)     │    │   (Deployment)       │
└──────────────┘    └──────────────┘    └──────────────────────┘
       │                   │                      │
       ▼                   ▼                      ▼
┌─────────────────────────────────────────────────────────────┐
│                   UNIFIED DASHBOARD                          │
│  ┌─────────┐  ┌───────────┐  ┌───────────┐  ┌────────────┐  │
│  │ Builds  │  │  Metrics  │  │Kubernetes │  │ Analytics  │  │
│  │  (Logs) │  │  (Prom)   │  │   Pods    │  │  Charts    │  │
│  └─────────┘  └───────────┘  └───────────┘  └────────────┘  │
└─────────────────────────────────────────────────────────────┘

```

---

## 🚀 Key Features

### 🛡️ **DevSecOps (Shift-Left Security)**

* **Automated SAST:** Scans source code for vulnerabilities on every commit.
* **Container Security:** Integrates **Trivy** to scan Docker images for CVEs before registry push.
* **Gated Deployments:** Pipeline automatically fails if critical risks are detected.

### 📊 **Deep Observability**

* **Real-Time Telemetry:** Visualizes HTTP throughput, error rates, and latency.
* **Kubernetes Monitoring:** Live tracking of Pod health, CPU usage, and Memory consumption.
* **Socket.IO Streaming:** Instant log updates from Jenkins directly to your browser.

### 💥 **Chaos Engineering**

* **Resilience Testing:** Validates system self-healing by injecting failures (e.g., Pod Kills).
* **Zero Downtime:** Proves High Availability configuration works under stress.

### 🎨 **Modern UI/UX**

* **Tech:** Built with **React**, **Vite**, **ShadCN UI**, and **Recharts**.
* **Interactive:** Draggable charts, live status badges, and responsive layout.

---

## 📦 Tech Stack

| Domain | Technologies |
| --- | --- |
| **Frontend** | React, Vite, TypeScript, Tailwind CSS, ShadCN UI, Recharts |
| **Backend** | Node.js, Express, Socket.IO |
| **Database** | Firebase Firestore (Build History) |
| **DevOps** | Jenkins, Docker, Kubernetes (K3s/Minikube), Ngrok |
| **Security** | Trivy (Container Scan), ESLint (SAST) |
| **Monitoring** | Prometheus, Grafana, Custom Metrics API |

---

## 🛠️ Project Structure

```bash
ci-cd-ecosystem/
├── app/                       # 🟢 The Core Node.js Microservice
│   ├── app.js                 # Exposes /metrics & /health endpoints
│   ├── Dockerfile             # Alpine-based secure container
│   └── package.json
├── k8s/                       # ☸️ Kubernetes Manifests
│   ├── deployment.yaml        # HA Deployment with Probes
│   ├── service.yaml           # NodePort Service
│   └── chaos-experiment.yaml  # Chaos Mesh definition
├── ci-cd-dashboard/           # 💻 The Control Plane
│   ├── src/                   # React Frontend
│   │   ├── components/        # LogViewer, MetricsCharts, PodStatus
│   │   └── styles/
│   └── backend/               # Dashboard Backend API
│       └── server.mjs         # Aggregates data from K8s & Jenkins
└── Jenkinsfile                # ⚙️ The Groovy Pipeline Script

```

---

## ⚡ Getting Started

### 1. Prerequisites

* Docker Desktop (Kubernetes Enabled)
* Jenkins & Node.js installed locally

### 2. Clone the Repo

```bash
git clone [https://github.com/KoushikSagarr/ci-cd-pipeline.git](https://github.com/KoushikSagarr/ci-cd-pipeline.git)
cd ci-cd-pipeline

```

### 3. Start the Dashboard Backend

This acts as the bridge between Jenkins/K8s and the UI.

```bash
cd ci-cd-dashboard/backend
npm install
node server.mjs
# Server running on http://localhost:4000

```

### 4. Start the Frontend

```bash
cd ci-cd-dashboard
npm install
npm run dev
# Dashboard available at http://localhost:5173

```

### 5. Trigger the Pipeline

Push code to GitHub or manually trigger the Jenkins job. Watch the **Builds Tab** for live logs and the **Metrics Tab** for deployment health!

---

## 📸 Usage & Configuration

### **Connecting Jenkins**

Ensure your `Jenkinsfile` is configured to post build results to the dashboard backend:

```groovy
post {
    always {
        sh "curl -X POST [http://host.docker.internal:4000/api/log-final-status](http://host.docker.internal:4000/api/log-final-status) -d @status.json"
    }
}

```

### **Prometheus Metrics**

The app automatically exposes metrics at:
`http://localhost:30080/metrics`

---

## 📃 License

MIT License © 2025 **[KoushikSagarr]**

*Made with ❤️ and too much coffee.*

```

```
