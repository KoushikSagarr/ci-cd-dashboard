import express from "express";
import http from "http";
import { Server } from "socket.io";
import fetch from "node-fetch";
import admin from "firebase-admin";
import dotenv from "dotenv";

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
  // It's good practice to exit if a critical dependency fails to load.
  process.exit(1);
}
const db = admin.firestore();

// Jenkins Configuration
const JENKINS_URL = process.env.JENKINS_URL;
const JENKINS_USER = process.env.JENKINS_USER;
const JENKINS_TOKEN = process.env.JENKINS_TOKEN;
const JENKINS_JOB_NAME = process.env.JENKINS_JOB_NAME;

const authHeader = `Basic ${Buffer.from(`${JENKINS_USER}:${JENKINS_TOKEN}`).toString("base64")}`;

app.use(express.json());

// --- GitHub Webhook Endpoint ---
// This is what GitHub will call when a new commit is pushed.
app.post("/github-webhook", async (req, res) => {
  console.log("Received GitHub webhook. Triggering Jenkins build...");
  try {
    const buildInfo = await triggerJenkinsBuild();
    res.status(200).send("Webhook received, Jenkins build triggered.");
  } catch (error) {
    console.error("Failed to trigger Jenkins build via webhook:", error);
    res.status(500).send("Error triggering Jenkins build.");
  }
});

// --- Manual Trigger Endpoint ---
// A simple endpoint to trigger a build from your dashboard.
app.get("/trigger-build", async (req, res) => {
  console.log("Manual build trigger received.");
  try {
    const buildInfo = await triggerJenkinsBuild();
    res.status(200).json(buildInfo);
  } catch (error) {
    console.error("Failed to trigger Jenkins build manually:", error);
    res.status(500).send("Error triggering Jenkins build.");
  }
});

// --- Jenkins Build and Log Streaming Functions ---
async function triggerJenkinsBuild() {
  const jenkinsBuildUrl = `${JENKINS_URL}/job/${JENKINS_JOB_NAME}/build`;
  try {
    const response = await fetch(jenkinsBuildUrl, {
      method: "POST",
      headers: {
        "Authorization": authHeader,
      },
    });

    if (response.ok) {
      console.log("Jenkins job triggered successfully.");
      
      // Get the queue item ID and poll for the build number.
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
        // Now that we have the build number, we can start streaming its specific logs.
        streamBuildLogs(buildNumber);
      }
    } catch (error) {
      console.error("Error polling for build number:", error);
    }
  }, 2000); // Poll the queue every 2 seconds.
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
      // Check the build status
      const statusUrl = `${JENKINS_URL}/job/${JENKINS_JOB_NAME}/${buildNumber}/api/json`;
      const statusResponse = await fetch(statusUrl, {
        headers: { "Authorization": authHeader },
      });
      const statusData = await statusResponse.json();

      if (!statusData.building) {
        clearInterval(pollingInterval);
        console.log("Build finished. Final result:", statusData.result);
        io.emit("build-status", statusData.result);

        // Store the final status in Firebase
        await db.collection("logs").add({
          buildNumber,
          status: statusData.result,
          timestamp: admin.firestore.FieldValue.serverTimestamp(),
        });
      }
    } catch (error) {
      console.error("Error streaming Jenkins logs:", error);
      clearInterval(pollingInterval);
    }
  }, 1000); // Poll for logs every second.
}

// --- WebSocket Connection ---
io.on("connection", (socket) => {
  console.log("Client connected:", socket.id);
});

// --- Server Start ---
const PORT = process.env.PORT || 4000; // Use port 4000 as a default

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} is already in use. Please stop the other service or use a different port.`);
    process.exit(1);
  } else {
    throw err;
  }
});

server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});