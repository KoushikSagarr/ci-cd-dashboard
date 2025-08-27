import express from "express";
import http from "http";
import { Server } from "socket.io";
import fetch from "node-fetch";
import admin from "firebase-admin";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import ngrok from "ngrok";
import cors from "cors";
import Docker from "dockerode";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*" },
});

// Use the CORS middleware to allow cross-origin requests
app.use(cors());

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
const JENKINS_URL = process.env.JENKINS_URL; // base URL e.g. http://localhost:8080
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
  const jenkinsStatusUrl = `${JENKINS_URL}/api/json`;
  let isJenkinsOnline = false;

  const checkJenkins = setInterval(async () => {
    if (isJenkinsOnline) {
      clearInterval(checkJenkins);
      console.log("Jenkins is now online and connected.");
      return;
    }
    try {
      const response = await fetch(jenkinsStatusUrl, {
        headers: { "Authorization": authHeader },
      });
      if (response.ok) {
        isJenkinsOnline = true;
      } else {
        throw new Error("Connection failed");
      }
    } catch (error) {
      console.log("Waiting for Jenkins to come online...");
    }
  }, 5000); // Check every 5 seconds
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

// ---- Docker Status Endpoint ----
app.get("/api/docker-status", async (req, res) => {
  // Try different socket paths for different OS
  const socketPaths = [
    '//./pipe/docker_engine', // Windows
    '/var/run/docker.sock',   // Linux/Mac
  ];
  
  let docker;
  let dockerConnected = false;
  
  // Try to connect to Docker
  for (const socketPath of socketPaths) {
    try {
      docker = new Docker({ socketPath });
      await docker.ping(); // Test connection
      dockerConnected = true;
      break;
    } catch (error) {
      continue; // Try next socket path
    }
  }
  
  if (!dockerConnected) {
    return res.status(200).json({ 
      running: false, 
      status: 'Docker daemon not accessible'
    });
  }

  try {
    const containers = await docker.listContainers({ all: true });
    
    // Look for the specific container name
    const targetContainer = containers.find(container => {
      const containerNames = container.Names.join(' ');
      return containerNames.includes('adoring_brown') || containerNames.includes('/adoring_brown');
    });
    
    if (targetContainer) {
      res.status(200).json({
        status: targetContainer.Status,
        state: targetContainer.State,
        id: targetContainer.Id,
        name: targetContainer.Names[0],
        image: targetContainer.Image,
        running: targetContainer.State === 'running',
        ports: targetContainer.Ports || []
      });
    } else {
      // Container not found, return debug info
      res.status(200).json({ 
        running: false, 
        status: 'Container "adoring_brown" not found',
        availableContainers: containers.map(c => ({
          name: c.Names[0],
          image: c.Image,
          status: c.Status,
          state: c.State
        }))
      });
    }
  } catch (error) {
    console.error("Docker status check failed:", error);
    res.status(200).json({ 
      running: false, 
      status: `Docker error: ${error.message}`
    });
  }
});

// --- Jenkins Proxy Endpoint ---
app.get("/api/jenkins/last-build-status", async (req, res) => {
  const jenkinsApiUrl = `${JENKINS_URL}/job/${JENKINS_JOB_NAME}/lastBuild/api/json`;
  try {
    const response = await fetch(jenkinsApiUrl, {
      headers: { "Authorization": authHeader },
    });
    if (response.ok) {
      const data = await response.json();
      res.status(200).json(data);
    } else {
      res.status(response.status).send(await response.text());
    }
  } catch (error) {
    console.error("Proxy to Jenkins failed:", error);
    res.status(500).send("Proxy to Jenkins failed.");
  }
});

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

app.post("/api/log-final-status", authenticateRequest, async (req, res) => {
  try {
    const { status, jobName, buildNumber, consoleLink, commitMessage } = req.body;
    if (!status || !jobName || !buildNumber) {
      return res.status(400).send("Missing data in request body.");
    }
    console.log(`Received final build status for ${jobName}#${buildNumber}: ${status}`);
    
    // Prepare the document data, handling undefined values
    const buildData = {
      jobName,
      buildNumber,
      status,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
    };
    
    // Only add optional fields if they have values
    if (consoleLink) {
      buildData.consoleLink = consoleLink;
    }
    if (commitMessage) {
      buildData.commitMessage = commitMessage;
    }
    
    await db.collection("builds").add(buildData);
    io.emit("build-status-update", { jobName, buildNumber, status, consoleLink });
    res.status(200).send("Build status saved to Firebase.");
  } catch (error) {
    console.error("Error saving final build status to Firebase:", error);
    res.status(500).send("Internal server error.");
  }
});

/** ---------------------------
 *  Jenkins CSRF crumb helper
 *  ---------------------------
 */
async function getJenkinsCrumb() {
  const crumbUrl = `${JENKINS_URL}/crumbIssuer/api/json`;
  try {
    const response = await fetch(crumbUrl, {
      headers: { "Authorization": authHeader },
    });

    if (!response.ok) {
      // If crumb issuer is disabled, just return null and proceed without a crumb
      console.warn(`Crumb issuer returned ${response.status}. Proceeding without crumb.`);
      return null;
    }

    const data = await response.json();
    if (!data.crumb || !data.crumbRequestField) {
      console.warn("Crumb issuer response missing fields. Proceeding without crumb.");
      return null;
    }

    return { headerName: data.crumbRequestField, crumb: data.crumb };
  } catch (err) {
    console.warn("Failed to fetch Jenkins crumb, proceeding without crumb:", err.message);
    return null;
  }
}

// Improved Jenkins authentication check
async function verifyJenkinsAuth() {
  try {
    const response = await fetch(`${JENKINS_URL}/api/json`, {
      headers: { "Authorization": authHeader },
    });
    
    if (response.status === 401) {
      console.error("Jenkins authentication failed. Check your JENKINS_USER and JENKINS_TOKEN.");
      return false;
    } else if (response.status === 403) {
      console.error("Jenkins access forbidden. User may not have sufficient permissions.");
      return false;
    } else if (response.ok) {
      console.log("Jenkins authentication successful.");
      return true;
    } else {
      console.error(`Jenkins returned status ${response.status}`);
      return false;
    }
  } catch (error) {
    console.error("Error verifying Jenkins authentication:", error.message);
    return false;
  }
}

// Check if job exists
async function verifyJenkinsJob() {
  try {
    const response = await fetch(`${JENKINS_URL}/job/${JENKINS_JOB_NAME}/api/json`, {
      headers: { "Authorization": authHeader },
    });
    
    if (response.status === 404) {
      console.error(`Jenkins job '${JENKINS_JOB_NAME}' not found. Please check the job name.`);
      return false;
    } else if (response.ok) {
      const jobData = await response.json();
      console.log(`Jenkins job '${JENKINS_JOB_NAME}' found. Buildable: ${jobData.buildable}`);
      return true;
    } else {
      console.error(`Error checking Jenkins job: ${response.status}`);
      return false;
    }
  } catch (error) {
    console.error("Error verifying Jenkins job:", error.message);
    return false;
  }
}

async function triggerJenkinsBuild(payload = {}) {
  console.log("Attempting to trigger Jenkins build...");
  
  // Verify authentication and job existence first
  const authOk = await verifyJenkinsAuth();
  if (!authOk) {
    throw new Error("Jenkins authentication failed");
  }
  
  const jobOk = await verifyJenkinsJob();
  if (!jobOk) {
    throw new Error("Jenkins job verification failed");
  }

  // Try different build endpoints based on job configuration
  const buildEndpoints = [
    // If job has parameters, use buildWithParameters
    `${JENKINS_URL}/job/${JENKINS_JOB_NAME}/buildWithParameters`,
    // If job has no parameters, use build
    `${JENKINS_URL}/job/${JENKINS_JOB_NAME}/build`
  ];

  for (let i = 0; i < buildEndpoints.length; i++) {
    const jenkinsBuildUrl = JENKINS_BUILD_TOKEN 
      ? `${buildEndpoints[i]}?token=${encodeURIComponent(JENKINS_BUILD_TOKEN)}` 
      : buildEndpoints[i];

    try {
      console.log(`Trying build endpoint ${i + 1}: ${buildEndpoints[i]}`);
      
      // Try to get a crumb; proceed without if not available
      const crumb = await getJenkinsCrumb();

      const headers = {
        "Authorization": authHeader,
        "Content-Type": "application/x-www-form-urlencoded",
      };
      
      if (crumb) {
        headers[crumb.headerName] = crumb.crumb;
        console.log("Using CSRF crumb for request");
      }

      // Different body format for different endpoints
      const body = i === 0 
        ? `json=${encodeURIComponent(JSON.stringify(payload))}`  // buildWithParameters
        : '';  // build (no parameters)

      const fetchOptions = {
        method: "POST",
        headers,
        body,
      };

      console.log("Sending request to Jenkins...");
      const response = await fetch(jenkinsBuildUrl, fetchOptions);

      if (response.ok || response.status === 201) {
        console.log(`Jenkins job triggered successfully using endpoint ${i + 1}.`);
        const locationHeader = response.headers.get('location');
        const queueId = locationHeader ? (locationHeader.match(/\/queue\/item\/(\d+)\//) || [])[1] : null;

        if (queueId) {
          console.log(`Build queued with ID: ${queueId}`);
          pollForBuildNumber(queueId);
        } else {
          console.log("Build triggered but no queue ID found in response");
        }
        return { status: "BUILD_TRIGGERED" };
      } else {
        const errorText = await response.text();
        console.error(`Endpoint ${i + 1} failed with status ${response.status}: ${errorText.substring(0, 200)}...`);
        
        // If this is the last endpoint, throw the error
        if (i === buildEndpoints.length - 1) {
          throw new Error(`All build endpoints failed. Last error: ${response.status} - ${errorText.substring(0, 200)}`);
        }
        // Otherwise, continue to the next endpoint
      }
    } catch (error) {
      console.error(`Error with endpoint ${i + 1}:`, error.message);
      
      // If this is the last endpoint, re-throw the error
      if (i === buildEndpoints.length - 1) {
        throw error;
      }
      // Otherwise, continue to the next endpoint
    }
  }
}

async function pollForBuildNumber(queueId) {
  console.log(`Polling for build number from queue ID: ${queueId}`);
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
      } else if (data.cancelled) {
        clearInterval(pollingInterval);
        console.log("Build was cancelled in queue");
      }
    } catch (error) {
      console.error("Error polling for build number:", error);
      clearInterval(pollingInterval);
    }
  }, 2000);

  // Timeout after 5 minutes
  setTimeout(() => {
    clearInterval(pollingInterval);
    console.log("Timeout waiting for build to start");
  }, 300000);
}

async function streamBuildLogs(buildNumber) {
  console.log(`Starting to stream logs for build #${buildNumber}`);
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
  
  // Verify Jenkins setup after connection
  console.log("Verifying Jenkins configuration...");
  await verifyJenkinsAuth();
  await verifyJenkinsJob();
});