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
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);
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
app.use(express.json());

// Firebase Configuration with enhanced error handling
let db;
try {
  const firebaseCredentials = JSON.parse(process.env.FIREBASE_CREDENTIALS);
  admin.initializeApp({
    credential: admin.credential.cert(firebaseCredentials),
  });
  db = admin.firestore();
  console.log("Firebase Admin SDK initialized successfully.");
} catch (error) {
  console.error("Error initializing Firebase Admin SDK:", error.message);
  console.error("Please check your FIREBASE_CREDENTIALS environment variable");
  process.exit(1);
}

// Jenkins Configuration with validation
const JENKINS_URL = process.env.JENKINS_URL;
const JENKINS_USER = process.env.JENKINS_USER;
const JENKINS_TOKEN = process.env.JENKINS_TOKEN;
const JENKINS_JOB_NAME = process.env.JENKINS_JOB_NAME;
const JENKINS_BUILD_TOKEN = process.env.JENKINS_BUILD_TOKEN;

// Validate required Jenkins environment variables
const requiredEnvVars = ['JENKINS_URL', 'JENKINS_USER', 'JENKINS_TOKEN', 'JENKINS_JOB_NAME'];
const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingVars.length > 0) {
  console.error(`Missing required environment variables: ${missingVars.join(', ')}`);
  process.exit(1);
}

const authHeader = `Basic ${Buffer.from(`${JENKINS_USER}:${JENKINS_TOKEN}`).toString("base64")}`;

// Ngrok Setup with enhanced error handling
let NGROK_TUNNEL_URL = null;

async function setupNgrokTunnel() {
  if (!process.env.NGROK_AUTH_TOKEN) {
    console.warn("NGROK_AUTH_TOKEN not provided. Skipping ngrok tunnel setup.");
    return;
  }

  try {
    NGROK_TUNNEL_URL = await ngrok.connect({
      authtoken: process.env.NGROK_AUTH_TOKEN,
      proto: 'http',
      addr: process.env.PORT || 4000
    });
    console.log(`Ngrok tunnel started. Public URL: ${NGROK_TUNNEL_URL}`);
  } catch (error) {
    console.error("Error setting up ngrok tunnel:", error);
    console.warn("Continuing without ngrok tunnel. External webhooks may not work.");
  }
}

// Enhanced function to poll Jenkins until it's online
async function connectToJenkins() {
  const jenkinsStatusUrl = `${JENKINS_URL}/api/json`;
  let isJenkinsOnline = false;
  let attempts = 0;
  const maxAttempts = 12; // 1 minute with 5-second intervals

  const checkJenkins = setInterval(async () => {
    attempts++;
    
    if (isJenkinsOnline) {
      clearInterval(checkJenkins);
      console.log("Jenkins is now online and connected.");
      return;
    }

    if (attempts >= maxAttempts) {
      clearInterval(checkJenkins);
      console.error("Failed to connect to Jenkins after maximum attempts. Please check Jenkins configuration.");
      return;
    }

    try {
      const response = await fetch(jenkinsStatusUrl, {
        headers: { "Authorization": authHeader },
        timeout: 5000
      });
      
      if (response.ok) {
        isJenkinsOnline = true;
        console.log(`Jenkins connected successfully after ${attempts} attempts.`);
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      console.log(`Attempt ${attempts}/${maxAttempts}: Waiting for Jenkins to come online... (${error.message})`);
    }
  }, 5000);
}

// Security middleware with enhanced validation
const authenticateRequest = (req, res, next) => {
  const expectedToken = process.env.JENKINS_API_TOKEN_BACKEND;
  
  if (!expectedToken) {
    console.error("JENKINS_API_TOKEN_BACKEND not configured");
    return res.status(500).json({ error: "Server configuration error" });
  }

  const authorizationHeader = req.headers['authorization'];

  if (!authorizationHeader) {
    return res.status(401).json({ error: 'Authorization header is missing' });
  }

  const [scheme, token] = authorizationHeader.split(' ');

  if (scheme === 'Bearer' && token === expectedToken) {
    next();
  } else {
    res.status(403).json({ error: 'Invalid or unauthorized API token' });
  }
};

// Enhanced Docker Status Endpoint with comprehensive diagnostics
app.get("/api/docker-status", async (req, res) => {
  const socketPaths = [
    '//./pipe/docker_engine', // Windows
    '/var/run/docker.sock',   // Linux/Mac
  ];
  
  let docker;
  let dockerConnected = false;
  let connectionError = null;
  
  // Try to connect to Docker
  for (const socketPath of socketPaths) {
    try {
      docker = new Docker({ socketPath });
      await docker.ping();
      dockerConnected = true;
      break;
    } catch (error) {
      connectionError = error.message;
      continue;
    }
  }
  
  if (!dockerConnected) {
    return res.status(200).json({ 
      running: false, 
      status: 'Docker daemon not accessible',
      error: connectionError,
      troubleshooting: [
        'Ensure Docker Desktop is running',
        'Check Docker daemon status with: docker info',
        'Verify Docker socket permissions',
        'Try restarting Docker service'
      ]
    });
  }

  try {
    const containers = await docker.listContainers({ all: true });
    const images = await docker.listImages();
    
    // Look for the specific container name
    const targetContainer = containers.find(container => {
      const containerNames = container.Names.join(' ');
      return containerNames.includes('adoring_brown') || containerNames.includes('/adoring_brown');
    });
    
    const dockerSystemInfo = await docker.info();
    
    if (targetContainer) {
      res.status(200).json({
        status: targetContainer.Status,
        state: targetContainer.State,
        id: targetContainer.Id,
        name: targetContainer.Names[0],
        image: targetContainer.Image,
        running: targetContainer.State === 'running',
        ports: targetContainer.Ports || [],
        created: targetContainer.Created,
        dockerInfo: {
          totalContainers: containers.length,
          runningContainers: containers.filter(c => c.State === 'running').length,
          totalImages: images.length,
          dockerVersion: dockerSystemInfo.ServerVersion,
          kernelVersion: dockerSystemInfo.KernelVersion
        }
      });
    } else {
      res.status(200).json({ 
        running: false, 
        status: 'Container "adoring_brown" not found',
        availableContainers: containers.map(c => ({
          name: c.Names[0],
          image: c.Image,
          status: c.Status,
          state: c.State
        })),
        suggestion: 'Check if the container name has changed or if deployment failed',
        dockerInfo: {
          totalContainers: containers.length,
          runningContainers: containers.filter(c => c.State === 'running').length,
          totalImages: images.length
        }
      });
    }
  } catch (error) {
    console.error("Docker status check failed:", error);
    res.status(200).json({ 
      running: false, 
      status: `Docker error: ${error.message}`,
      troubleshooting: [
        'Restart Docker daemon',
        'Check Docker disk space with: docker system df',
        'Verify Docker installation',
        'Run: docker system prune to clean up resources'
      ]
    });
  }
});

// New Kubernetes health check endpoint
app.get("/api/kubernetes-status", async (req, res) => {
  try {
    // Check if kubectl is available
    const { stdout: kubectlVersion } = await execAsync('kubectl version --client --short');
    
    try {
      // Check cluster connectivity
      const { stdout: clusterInfo } = await execAsync('kubectl cluster-info --request-timeout=10s');
      
      // Get node status
      const { stdout: nodeStatus } = await execAsync('kubectl get nodes -o wide');
      
      // Get current context
      const { stdout: currentContext } = await execAsync('kubectl config current-context');
      
      res.status(200).json({
        available: true,
        status: 'Kubernetes cluster is accessible',
        kubectlVersion: kubectlVersion.trim(),
        currentContext: currentContext.trim(),
        clusterInfo: clusterInfo,
        nodeStatus: nodeStatus,
        lastChecked: new Date().toISOString()
      });
      
    } catch (clusterError) {
      res.status(200).json({
        available: false,
        kubectlInstalled: true,
        error: clusterError.message,
        troubleshooting: [
          'Start your Kubernetes cluster (Docker Desktop → Settings → Kubernetes → Enable)',
          'If using Minikube: run "minikube start"',
          'Check kubeconfig: kubectl config view',
          'Verify cluster status: kubectl cluster-info'
        ]
      });
    }
  } catch (error) {
    res.status(200).json({
      available: false,
      kubectlInstalled: false,
      error: 'kubectl not found or not installed',
      troubleshooting: [
        'Install kubectl CLI tool',
        'Add kubectl to your system PATH',
        'For Docker Desktop: Enable Kubernetes in settings',
        'For Minikube: Install minikube and run "minikube start"'
      ]
    });
  }
});

// Enhanced Jenkins proxy endpoint with better error handling
app.get("/api/jenkins/last-build-status", async (req, res) => {
  const jenkinsApiUrl = `${JENKINS_URL}/job/${JENKINS_JOB_NAME}/lastBuild/api/json`;
  
  try {
    const response = await fetch(jenkinsApiUrl, {
      headers: { "Authorization": authHeader },
      timeout: 10000
    });
    
    if (response.ok) {
      const data = await response.json();
      res.status(200).json({
        ...data,
        consoleUrl: `${JENKINS_URL}/job/${JENKINS_JOB_NAME}/${data.number}/console`,
        lastChecked: new Date().toISOString()
      });
    } else if (response.status === 404) {
      res.status(404).json({ 
        error: `Jenkins job '${JENKINS_JOB_NAME}' not found`,
        suggestion: 'Check if the job name is correct'
      });
    } else if (response.status === 401 || response.status === 403) {
      res.status(response.status).json({ 
        error: 'Jenkins authentication failed',
        suggestion: 'Check Jenkins credentials'
      });
    } else {
      const errorText = await response.text();
      res.status(response.status).json({ 
        error: `Jenkins API error: ${response.status}`,
        details: errorText
      });
    }
  } catch (error) {
    console.error("Jenkins API request failed:", error);
    res.status(500).json({ 
      error: "Failed to connect to Jenkins",
      details: error.message,
      troubleshooting: [
        'Check if Jenkins is running',
        'Verify Jenkins URL configuration',
        'Check network connectivity'
      ]
    });
  }
});

// Static file serving
app.use(express.static(path.join(__dirname, '..', 'dist')));

// Enhanced GitHub Webhook Endpoint
app.post("/api/github-webhook", async (req, res) => {
  console.log("Received GitHub webhook payload:", {
    repository: req.body.repository?.name,
    ref: req.body.ref,
    commits: req.body.commits?.length || 0
  });
  
  try {
    const buildInfo = await triggerJenkinsBuild(req.body);
    
    res.status(200).json({
      message: "Webhook received, Jenkins build triggered",
      buildInfo,
      timestamp: new Date().toISOString()
    });
    
    // Emit webhook event to connected clients
    io.emit("webhook-received", {
      source: "github",
      repository: req.body.repository?.name,
      ref: req.body.ref,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error("Failed to trigger Jenkins build via webhook:", error);
    res.status(500).json({ 
      error: "Error triggering Jenkins build",
      details: error.message
    });
  }
});

// Enhanced manual build trigger
app.get("/api/trigger-build", async (req, res) => {
  console.log("Manual build trigger received from:", req.ip);
  
  try {
    const buildInfo = await triggerJenkinsBuild({
      trigger: "manual",
      timestamp: new Date().toISOString(),
      triggeredBy: req.ip
    });
    
    res.status(200).json({
      message: "Build triggered successfully",
      buildInfo,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error("Failed to trigger Jenkins build manually:", error);
    res.status(500).json({ 
      error: "Error triggering Jenkins build",
      details: error.message,
      suggestion: "Check Jenkins connectivity and job configuration"
    });
  }
});

// Enhanced build status logging with failure analysis
app.post("/api/log-final-status", authenticateRequest, async (req, res) => {
  try {
    const { 
      status, 
      jobName, 
      buildNumber, 
      consoleLink, 
      commitMessage, 
      errorDetails,
      duration,
      stages
    } = req.body;
    
    if (!status || !jobName || !buildNumber) {
      return res.status(400).json({ 
        error: "Missing required fields", 
        required: ["status", "jobName", "buildNumber"] 
      });
    }
    
    console.log(`Received final build status for ${jobName}#${buildNumber}: ${status}`);
    
    // Prepare the document data with enhanced tracking
    const buildData = {
      jobName,
      buildNumber: parseInt(buildNumber),
      status,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      serverTimestamp: new Date().toISOString()
    };
    
    // Add optional fields if they have values
    if (consoleLink) buildData.consoleLink = consoleLink;
    if (commitMessage) buildData.commitMessage = commitMessage;
    if (duration) buildData.duration = duration;
    if (stages) buildData.stages = stages;
    
    // Enhanced failure analysis
    if (status === 'FAILURE') {
      if (errorDetails) {
        buildData.errorDetails = errorDetails;
        buildData.failureAnalysis = analyzeFailure(errorDetails);
        buildData.errorSummary = extractErrorSummary(errorDetails);
      }
      
      // Additional failure context
      buildData.troubleshooting = generateTroubleshootingSteps(status, errorDetails);
    }
    
    // Save to Firebase
    const docRef = await db.collection("builds").add(buildData);
    
    // Emit enhanced status update
    const statusUpdate = { 
      id: docRef.id,
      jobName, 
      buildNumber: parseInt(buildNumber), 
      status, 
      consoleLink,
      timestamp: new Date().toISOString(),
      duration
    };
    
    if (status === 'FAILURE' && errorDetails) {
      statusUpdate.errorSummary = extractErrorSummary(errorDetails);
      statusUpdate.failureCategory = analyzeFailure(errorDetails).category;
    }
    
    io.emit("build-status-update", statusUpdate);
    
    res.status(200).json({ 
      message: "Build status saved successfully",
      buildId: docRef.id,
      buildNumber: parseInt(buildNumber),
      status: status
    });
    
  } catch (error) {
    console.error("Error saving final build status to Firebase:", error);
    res.status(500).json({ 
      error: "Internal server error", 
      details: error.message 
    });
  }
});

// Helper function to analyze failure reasons
function analyzeFailure(errorDetails) {
  const analysis = {
    category: 'unknown',
    confidence: 0,
    suggestions: [],
    keywords: []
  };
  
  if (!errorDetails) return analysis;
  
  const errorString = errorDetails.toLowerCase();
  
  // Kubernetes-related failures
  if (errorString.includes('kubernetes') || errorString.includes('kubectl') || 
      errorString.includes('dial tcp') || errorString.includes('connection refused')) {
    analysis.category = 'kubernetes';
    analysis.confidence = 0.9;
    analysis.keywords = ['kubernetes', 'kubectl', 'cluster'];
    analysis.suggestions = [
      'Check if Kubernetes cluster is running',
      'Verify kubectl configuration with: kubectl cluster-info',
      'Ensure proper cluster connectivity',
      'For Docker Desktop: Enable Kubernetes in settings',
      'For Minikube: Run "minikube start"'
    ];
  }
  // Docker-related failures
  else if (errorString.includes('docker') || errorString.includes('registry') || 
           errorString.includes('push') || errorString.includes('pull')) {
    analysis.category = 'docker';
    analysis.confidence = 0.8;
    analysis.keywords = ['docker', 'registry', 'image'];
    analysis.suggestions = [
      'Check Docker daemon status with: docker info',
      'Verify Docker registry credentials',
      'Check network connectivity to Docker registry',
      'Try: docker system prune to free up space',
      'Verify image build process'
    ];
  }
  // Dependency-related failures
  else if (errorString.includes('npm') || errorString.includes('dependencies') || 
           errorString.includes('package') || errorString.includes('install')) {
    analysis.category = 'dependencies';
    analysis.confidence = 0.7;
    analysis.keywords = ['npm', 'dependencies', 'package'];
    analysis.suggestions = [
      'Check package.json for dependency issues',
      'Clear npm cache with: npm cache clean --force',
      'Verify Node.js version compatibility',
      'Check for conflicting dependency versions',
      'Try deleting node_modules and reinstalling'
    ];
  }
  // Test-related failures
  else if (errorString.includes('test') || errorString.includes('jest') || 
           errorString.includes('spec') || errorString.includes('assertion')) {
    analysis.category = 'testing';
    analysis.confidence = 0.8;
    analysis.keywords = ['test', 'testing', 'assertion'];
    analysis.suggestions = [
      'Review specific test failures in console output',
      'Check test environment setup',
      'Verify test data and mocks',
      'Ensure test database is properly configured',
      'Check for timing issues in async tests'
    ];
  }
  // Build/compilation failures
  else if (errorString.includes('compilation') || errorString.includes('syntax') || 
           errorString.includes('build') || errorString.includes('webpack')) {
    analysis.category = 'build';
    analysis.confidence = 0.7;
    analysis.keywords = ['build', 'compilation', 'syntax'];
    analysis.suggestions = [
      'Check for syntax errors in code',
      'Verify build configuration files',
      'Check for missing or incorrect imports',
      'Review webpack or build tool configuration',
      'Ensure all required build dependencies are installed'
    ];
  }
  
  return analysis;
}

// Helper function to extract concise error summary
function extractErrorSummary(errorDetails) {
  if (!errorDetails) return '';
  
  const lines = errorDetails.split('\n');
  const errorLines = lines.filter(line => {
    const lowerLine = line.toLowerCase();
    return lowerLine.includes('error:') || 
           lowerLine.includes('failed:') || 
           lowerLine.includes('unable to') ||
           lowerLine.includes('exception') ||
           lowerLine.includes('fatal:') ||
           (lowerLine.includes('exit code') && lowerLine.includes('1'));
  });
  
  // Get the most relevant error lines (first 2)
  const relevantErrors = errorLines.slice(0, 2).map(line => line.trim());
  return relevantErrors.join(' | ') || 'Build failed - check console logs for details';
}

// Helper function to generate troubleshooting steps
function generateTroubleshootingSteps(status, errorDetails) {
  const steps = ['Review the full console logs for detailed error information'];
  
  if (status === 'FAILURE' && errorDetails) {
    const analysis = analyzeFailure(errorDetails);
    steps.push(...analysis.suggestions);
  }
  
  steps.push(
    'Check recent code changes for potential issues',
    'Verify all required services are running',
    'Contact the development team if issues persist'
  );
  
  return steps;
}

// Enhanced Jenkins CSRF crumb helper
async function getJenkinsCrumb() {
  const crumbUrl = `${JENKINS_URL}/crumbIssuer/api/json`;
  try {
    const response = await fetch(crumbUrl, {
      headers: { "Authorization": authHeader },
      timeout: 5000
    });

    if (!response.ok) {
      console.warn(`Crumb issuer returned ${response.status}. Proceeding without crumb.`);
      return null;
    }

    const data = await response.json();
    if (!data.crumb || !data.crumbRequestField) {
      console.warn("Crumb issuer response missing fields. Proceeding without crumb.");
      return null;
    }

    console.log("Successfully obtained Jenkins CSRF crumb");
    return { headerName: data.crumbRequestField, crumb: data.crumb };
  } catch (err) {
    console.warn("Failed to fetch Jenkins crumb, proceeding without crumb:", err.message);
    return null;
  }
}

// Enhanced Jenkins authentication verification
async function verifyJenkinsAuth() {
  try {
    const response = await fetch(`${JENKINS_URL}/api/json`, {
      headers: { "Authorization": authHeader },
      timeout: 10000
    });
    
    if (response.status === 401) {
      console.error("❌ Jenkins authentication failed. Check your JENKINS_USER and JENKINS_TOKEN.");
      return false;
    } else if (response.status === 403) {
      console.error("❌ Jenkins access forbidden. User may not have sufficient permissions.");
      return false;
    } else if (response.ok) {
      console.log("✅ Jenkins authentication successful.");
      return true;
    } else {
      console.error(`❌ Jenkins returned status ${response.status}: ${response.statusText}`);
      return false;
    }
  } catch (error) {
    console.error("❌ Error verifying Jenkins authentication:", error.message);
    return false;
  }
}

// Enhanced Jenkins job verification
async function verifyJenkinsJob() {
  try {
    const response = await fetch(`${JENKINS_URL}/job/${JENKINS_JOB_NAME}/api/json`, {
      headers: { "Authorization": authHeader },
      timeout: 10000
    });
    
    if (response.status === 404) {
      console.error(`❌ Jenkins job '${JENKINS_JOB_NAME}' not found. Please check the job name.`);
      return false;
    } else if (response.ok) {
      const jobData = await response.json();
      console.log(`✅ Jenkins job '${JENKINS_JOB_NAME}' found. Buildable: ${jobData.buildable}`);
      
      if (!jobData.buildable) {
        console.warn(`⚠️  Job '${JENKINS_JOB_NAME}' is not buildable. Check job configuration.`);
      }
      
      return true;
    } else {
      console.error(`❌ Error checking Jenkins job: ${response.status} ${response.statusText}`);
      return false;
    }
  } catch (error) {
    console.error("❌ Error verifying Jenkins job:", error.message);
    return false;
  }
}

// Enhanced Jenkins build trigger function
async function triggerJenkinsBuild(payload = {}) {
  console.log("🚀 Attempting to trigger Jenkins build...");
  
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
    `${JENKINS_URL}/job/${JENKINS_JOB_NAME}/buildWithParameters`,
    `${JENKINS_URL}/job/${JENKINS_JOB_NAME}/build`
  ];

  for (let i = 0; i < buildEndpoints.length; i++) {
    const jenkinsBuildUrl = JENKINS_BUILD_TOKEN 
      ? `${buildEndpoints[i]}?token=${encodeURIComponent(JENKINS_BUILD_TOKEN)}` 
      : buildEndpoints[i];

    try {
      console.log(`📡 Trying build endpoint ${i + 1}: ${buildEndpoints[i]}`);
      
      // Try to get a crumb
      const crumb = await getJenkinsCrumb();

      const headers = {
        "Authorization": authHeader,
        "Content-Type": "application/x-www-form-urlencoded",
      };
      
      if (crumb) {
        headers[crumb.headerName] = crumb.crumb;
        console.log("🔐 Using CSRF crumb for request");
      }

      // Different body format for different endpoints
      const body = i === 0 
        ? `json=${encodeURIComponent(JSON.stringify(payload))}`
        : '';

      const fetchOptions = {
        method: "POST",
        headers,
        body,
        timeout: 15000
      };

      console.log("📤 Sending request to Jenkins...");
      const response = await fetch(jenkinsBuildUrl, fetchOptions);

      if (response.ok || response.status === 201) {
        console.log(`✅ Jenkins job triggered successfully using endpoint ${i + 1}.`);
        const locationHeader = response.headers.get('location');
        const queueId = locationHeader ? (locationHeader.match(/\/queue\/item\/(\d+)\//) || [])[1] : null;

        if (queueId) {
          console.log(`⏱️  Build queued with ID: ${queueId}`);
          pollForBuildNumber(queueId);
        } else {
          console.log("⚠️  Build triggered but no queue ID found in response");
        }
        
        return { 
          status: "BUILD_TRIGGERED",
          queueId,
          endpoint: buildEndpoints[i],
          timestamp: new Date().toISOString()
        };
      } else {
        const errorText = await response.text();
        console.error(`❌ Endpoint ${i + 1} failed with status ${response.status}: ${errorText.substring(0, 200)}...`);
        
        if (i === buildEndpoints.length - 1) {
          throw new Error(`All build endpoints failed. Last error: ${response.status} - ${errorText.substring(0, 200)}`);
        }
      }
    } catch (error) {
      console.error(`❌ Error with endpoint ${i + 1}:`, error.message);
      
      if (i === buildEndpoints.length - 1) {
        throw error;
      }
    }
  }
}

// Enhanced build number polling
async function pollForBuildNumber(queueId) {
  console.log(`🔍 Polling for build number from queue ID: ${queueId}`);
  let attempts = 0;
  const maxAttempts = 60; // 2 minutes with 2-second intervals
  
  const pollingInterval = setInterval(async () => {
    attempts++;
    
    try {
      const queueItemUrl = `${JENKINS_URL}/queue/item/${queueId}/api/json`;
      const response = await fetch(queueItemUrl, {
        headers: { "Authorization": authHeader },
        timeout: 5000
      });
      
      if (!response.ok) {
        if (response.status === 404) {
          console.log("⚠️  Queue item not found - build may have started already");
          clearInterval(pollingInterval);
          return;
        }
        throw new Error(`HTTP ${response.status}`);
      }
      
      const data = await response.json();

      if (data.executable && data.executable.number) {
        clearInterval(pollingInterval);
        const buildNumber = data.executable.number;
        console.log(`🎯 Build number found: ${buildNumber}`);
        
        // Emit build started event
        io.emit("build-started", {
          buildNumber,
          queueId,
          timestamp: new Date().toISOString()
        });
        
        streamBuildLogs(buildNumber);
      } else if (data.cancelled) {
        clearInterval(pollingInterval);
        console.log("❌ Build was cancelled in queue");
        
        io.emit("build-cancelled", {
          queueId,
          timestamp: new Date().toISOString()
        });
      } else if (attempts >= maxAttempts) {
        clearInterval(pollingInterval);
        console.log("⏰ Timeout waiting for build to start");
        
        io.emit("build-timeout", {
          queueId,
          attempts,
          timestamp: new Date().toISOString()
        });
      }
    } catch (error) {
      console.error(`❌ Error polling for build number (attempt ${attempts}):`, error.message);
      
      if (attempts >= maxAttempts) {
        clearInterval(pollingInterval);
        console.log("⏰ Max attempts reached while polling for build number");
      }
    }
  }, 2000);
}

// Enhanced build log streaming
async function streamBuildLogs(buildNumber) {
  console.log(`📋 Starting to stream logs for build #${buildNumber}`);
  let lastLogLine = 0;
  let attempts = 0;
  const maxAttempts = 300; // 5 minutes with 1-second intervals
  
  const pollingInterval = setInterval(async () => {
    attempts++;
    
    try {
      const jenkinsLogUrl = `${JENKINS_URL}/job/${JENKINS_JOB_NAME}/${buildNumber}/logText/progressiveText?start=${lastLogLine}`;
      const logResponse = await fetch(jenkinsLogUrl, {
        headers: { "Authorization": authHeader },
        timeout: 5000
      });
      
      if (logResponse.ok) {
        const newLogs = await logResponse.text();
        if (newLogs) {
          io.emit("build-log", {
            buildNumber,
            logs: newLogs,
            timestamp: new Date().toISOString()
          });
          lastLogLine += newLogs.length;
        }
      }
      
      // Check build status
      const statusUrl = `${JENKINS_URL}/job/${JENKINS_JOB_NAME}/${buildNumber}/api/json`;
      const statusResponse = await fetch(statusUrl, {
        headers: { "Authorization": authHeader },
        timeout: 5000
      });
      
      if (statusResponse.ok) {
        const statusData = await statusResponse.json();
        
        if (!statusData.building) {
          clearInterval(pollingInterval);
          console.log(`🏁 Build #${buildNumber} finished. Final result: ${statusData.result}`);
          
          // Emit build completion event
          io.emit("build-completed", {
            buildNumber,
            result: statusData.result,
            duration: statusData.duration,
            timestamp: new Date().toISOString(),
            consoleUrl: `${JENKINS_URL}/job/${JENKINS_JOB_NAME}/${buildNumber}/console`
          });
        }
      }
      
      if (attempts >= maxAttempts) {
        clearInterval(pollingInterval);
        console.log(`⏰ Timeout streaming logs for build #${buildNumber}`);
      }
      
    } catch (error) {
      console.error(`❌ Error streaming Jenkins logs (attempt ${attempts}):`, error.message);
      
      if (attempts >= maxAttempts) {
        clearInterval(pollingInterval);
        console.log(`⏰ Max attempts reached while streaming logs for build #${buildNumber}`);
      }
    }
  }, 1000);
}

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.status(200).json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    version: process.env.npm_package_version || '1.0.0',
    services: {
      jenkins: JENKINS_URL ? 'configured' : 'not configured',
      firebase: db ? 'connected' : 'not connected',
      ngrok: NGROK_TUNNEL_URL ? 'connected' : 'not connected'
    }
  });
});

// System info endpoint
app.get("/api/system-info", (req, res) => {
  res.status(200).json({
    nodeVersion: process.version,
    platform: process.platform,
    architecture: process.arch,
    memory: {
      used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + ' MB',
      total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024) + ' MB'
    },
    uptime: Math.round(process.uptime()) + ' seconds',
    environment: {
      nodeEnv: process.env.NODE_ENV || 'development',
      port: process.env.PORT || 4000
    }
  });
});

// WebSocket connection handling
io.on('connection', (socket) => {
  console.log(`🔌 Client connected: ${socket.id}`);
  
  socket.emit('server-status', {
    status: 'connected',
    timestamp: new Date().toISOString(),
    services: {
      jenkins: JENKINS_URL ? 'available' : 'not configured',
      ngrok: NGROK_TUNNEL_URL || 'not available'
    }
  });
  
  socket.on('disconnect', () => {
    console.log(`🔌 Client disconnected: ${socket.id}`);
  });
  
  socket.on('request-build-status', async (data) => {
    try {
      const { buildNumber } = data;
      if (buildNumber) {
        const statusUrl = `${JENKINS_URL}/job/${JENKINS_JOB_NAME}/${buildNumber}/api/json`;
        const response = await fetch(statusUrl, {
          headers: { "Authorization": authHeader }
        });
        
        if (response.ok) {
          const statusData = await response.json();
          socket.emit('build-status-response', {
            buildNumber,
            status: statusData.result,
            building: statusData.building,
            duration: statusData.duration,
            timestamp: new Date().toISOString()
          });
        }
      }
    } catch (error) {
      console.error('Error handling build status request:', error);
      socket.emit('error', { message: 'Failed to fetch build status' });
    }
  });
});

// Graceful shutdown handling
process.on('SIGINT', async () => {
  console.log('\n🛑 Received SIGINT. Graceful shutdown...');
  
  try {
    // Close ngrok tunnel
    if (NGROK_TUNNEL_URL) {
      await ngrok.disconnect();
      console.log('✅ Ngrok tunnel closed');
    }
    
    // Close server
    server.close(() => {
      console.log('✅ HTTP server closed');
      process.exit(0);
    });
    
    // Force exit after 10 seconds
    setTimeout(() => {
      console.log('⚠️  Forced shutdown after timeout');
      process.exit(1);
    }, 10000);
    
  } catch (error) {
    console.error('❌ Error during graceful shutdown:', error);
    process.exit(1);
  }
});

// Enhanced error handling for uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
});

// Start the server
const PORT = process.env.PORT || 4000;

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`❌ Port ${PORT} is already in use. Please stop the other service or use a different port.`);
    process.exit(1);
  } else {
    console.error('❌ Server error:', err);
    throw err;
  }
});

server.listen(PORT, async () => {
  console.log('🚀 ==========================================');
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log('🚀 ==========================================');
  
  try {
    // Setup ngrok tunnel
    await setupNgrokTunnel();
    
    // Connect to Jenkins
    console.log('🔧 Connecting to Jenkins...');
    await connectToJenkins();
    
    // Verify Jenkins setup
    console.log('🔧 Verifying Jenkins configuration...');
    const authSuccess = await verifyJenkinsAuth();
    const jobSuccess = await verifyJenkinsJob();
    
    if (authSuccess && jobSuccess) {
      console.log('✅ Jenkins setup verification completed successfully');
    } else {
      console.log('⚠️  Jenkins setup has issues - check configuration');
    }
    
    console.log('🚀 ==========================================');
    console.log('🚀 Server initialization completed');
    console.log('🚀 ==========================================');
    
  } catch (error) {
    console.error('❌ Error during server initialization:', error);
  }
});