import express from "express";
import http from "http";
import { Server } from "socket.io";
import fetch from "node-fetch";
import admin from "firebase-admin";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import ngrok from "ngrok";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*" },
});

// Use a unified Firebase credentials variable for a cleaner setup.
try {
  const firebaseCredentials = JSON.parse(process.env.FIREBASE_CREDENTIALS);
  admin.initializeApp({
    credential: admin.credential.cert(firebaseCredentials),
  });
  console.log("Firebase Admin SDK initialized successfully.");
} catch (error) {
  console.error("Error initializing Firebase Admin SDK:", error.message);
  process.exit(1);
}
const db = admin.firestore();

// Jenkins Configuration
const JENKINS_URL = process.env.JENKINS_URL;
const JENKINS_USER = process.env.JENKINS_USER;
const JENKINS_TOKEN = process.env.JENKINS_TOKEN;
const JENKINS_JOB_NAME = process.env.JENKINS_JOB_NAME;
const JENKINS_BUILD_TOKEN = process.env.JENKINS_BUILD_TOKEN;

const authHeader = `Basic ${Buffer.from(`${JENKINS_USER}:${JENKINS_TOKEN}`).toString("base64")}`;

// Ngrok Setup
let NGROK_TUNNEL_URL = null;

async function setupNgrokTunnel() {
  try {
    NGROK_TUNNEL_URL = await ngrok.connect({
      authtoken: process.env.NGROK_AUTH_TOKEN,
      proto: 'http',
      addr: process.env.PORT || 4000
    });
    console.log(`Ngrok tunnel started. Public URL: ${NGROK_TUNNEL_URL}`);
  } catch (error) {
    console.error("Error setting up ngrok tunnel:", error);
    process.exit(1);
  }
}

// Function to poll Jenkins until it's online
async function connectToJenkins() {
  console.log("Jenkins is now online and connected.");
  return;
}

app.use(express.json());

// --- Security Middleware to handle Jenkins API token ---
const authenticateRequest = (req, res, next) => {
  const expectedToken = process.env.JENKINS_API_TOKEN_BACKEND;
  const authorizationHeader = req.headers['authorization'];

  if (!authorizationHeader) {
    return res.status(401).send('Authorization header is missing.');
  }

  const [scheme, token] = authorizationHeader.split(' ');

  if (scheme === 'Bearer' && token === expectedToken) {
    next();
  } else {
    res.status(403).send('Invalid or unauthorized API token.');
  }
};

// --- Serve the static frontend files from the 'dist' folder ---
app.use(express.static(path.join(__dirname, '..', 'dist')));

// --- GitHub Webhook Endpoint ---
app.post("/api/github-webhook", async (req, res) => {
  console.log("Received GitHub webhook. Triggering Jenkins build...");
  try {
    const buildInfo = await triggerJenkinsBuild(req.body);
    res.status(200).send("Webhook received, Jenkins build triggered.");
  } catch (error) {
    console.error("Failed to trigger Jenkins build via webhook:", error);
    res.status(500).send("Error triggering Jenkins build.");
  }
});

// --- Manual Trigger Endpoint ---
app.get("/api/trigger-build", async (req, res) => {
  console.log("Manual build trigger received.");
  try {
    const buildInfo = await triggerJenkinsBuild({});
    res.status(200).json(buildInfo);
  } catch (error) {
    console.error("Failed to trigger Jenkins build manually:", error);
    res.status(500).send("Error triggering Jenkins build.");
  }
});

// --- NEW ENDPOINT to receive final build status from Jenkins ---
app.post("/api/log-final-status", authenticateRequest, async (req, res) => {
  try {
    const { status, jobName, buildNumber, consoleLink } = req.body;
    if (!status || !jobName || !buildNumber) {
      return res.status(400).send("Missing data in request body.");
    }
    console.log(`Received final build status for ${jobName}#${buildNumber}: ${status}`);
    await db.collection("builds").add({
      jobName,
      buildNumber,
      status,
      consoleLink,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
    });
    io.emit("build-status-update", { jobName, buildNumber, status, consoleLink });
    res.status(200).send("Build status saved to Firebase.");
  } catch (error) {
    console.error("Error saving final build status to Firebase:", error);
    res.status(500).send("Internal server error.");
  }
});

// --- Jenkins Build and Log Streaming Functions ---
async function triggerJenkinsBuild(payload = {}) {
  const jenkinsBuildUrl = `${JENKINS_URL}/job/${JENKINS_JOB_NAME}/buildWithParameters?token=${JENKINS_BUILD_TOKEN}`;

  try {
    const fetchOptions = {
        method: "POST",
        headers: {
            "Authorization": authHeader,
            "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
    };

    const response = await fetch(jenkinsBuildUrl, fetchOptions);

    if (response.ok) {
      console.log("Jenkins job triggered successfully.");
      const locationHeader = response.headers.get('location');
      const queueId = locationHeader ? locationHeader.match(/\/queue\/item\/(\d+)\//)[1] : null;

      if (queueId) {
        pollForBuildNumber(queueId);
      }
      return { status: "BUILD_TRIGGERED" };
    } else {
      const errorText = await response.text();
      throw new Error(`Failed to trigger Jenkins job: ${response.status} - ${errorText}`);
    }
  } catch (error) {
    console.error("Error triggering Jenkins job:", error);
    throw error;
  }
}

async function pollForBuildNumber(queueId) {
  const pollingInterval = setInterval(async () => {
    try {
      const queueItemUrl = `${JENKINS_URL}/queue/item/${queueId}/api/json`;
      const response = await fetch(queueItemUrl, {
        headers: { "Authorization": authHeader },
      });
      const data = await response.json();

      if (data.executable && data.executable.number) {
        clearInterval(pollingInterval);
        const buildNumber = data.executable.number;
        console.log(`Build number found: ${buildNumber}`);
        streamBuildLogs(buildNumber);
      }
    } catch (error) {
      console.error("Error polling for build number:", error);
    }
  }, 2000);
}

async function streamBuildLogs(buildNumber) {
  let lastLogLine = 0;
  const pollingInterval = setInterval(async () => {
    try {
      const jenkinsLogUrl = `${JENKINS_URL}/job/${JENKINS_JOB_NAME}/${buildNumber}/logText/progressiveText?start=${lastLogLine}`;
      const logResponse = await fetch(jenkinsLogUrl, {
        headers: { "Authorization": authHeader },
      });

      const newLogs = await logResponse.text();
      if (newLogs) {
        io.emit("build-log", newLogs);
        lastLogLine += newLogs.length;
      }

      const statusUrl = `${JENKINS_URL}/job/${JENKINS_JOB_NAME}/${buildNumber}/api/json`;
      const statusResponse = await fetch(statusUrl, {
        headers: { "Authorization": authHeader },
      });
      const statusData = await statusResponse.json();

      if (!statusData.building) {
        clearInterval(pollingInterval);
        console.log("Build finished. Final result:", statusData.result);
      }
    } catch (error) {
      console.error("Error streaming Jenkins logs:", error);
      clearInterval(pollingInterval);
    }
  }, 1000);
}

// --- WebSocket Connection ---
io.on("connection", (socket) => {
  console.log("Client connected:", socket.id);
});

// --- Server Start ---
const PORT = process.env.PORT || 4000;
server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} is already in use. Please stop the other service or use a different port.`);
    process.exit(1);
  } else {
    throw err;
  }
});
server.listen(PORT, async () => {
  console.log(`Server running on http://localhost:${PORT}`);
  await setupNgrokTunnel();
  await connectToJenkins();
});