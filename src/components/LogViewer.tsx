// src/components/LogViewer.tsx
import { useEffect, useState } from "react";
import { collection, onSnapshot, query, orderBy } from "firebase/firestore";
import { db } from "../firebase";
import LogCard from "./LogCard";
import LogDetailsModal from "./LogDetailsModal";
import { io } from "socket.io-client";
import styles from "../styles/Dashboard.module.css";
import { FiPlayCircle } from "react-icons/fi";
import { RingLoader } from 'react-spinners';
import { motion } from 'framer-motion';

const socket = io("http://localhost:4000");

interface Build {
  id: string;
  status: string;
  buildNumber: string;
  consoleLink: string;
  timestamp: any;
  jobName: string;
}

function LogViewer() {
  const [builds, setBuilds] = useState<Build[]>([]);
  const [selectedBuild, setSelectedBuild] = useState<Build | null>(null);
  const [liveStatus, setLiveStatus] = useState<string>("Waiting for build...");
  const [liveLogs, setLiveLogs] = useState<string[]>([]);
  const [isLiveModalOpen, setIsLiveModalOpen] = useState(false);
  const [isBuilding, setIsBuilding] = useState(false);

  useEffect(() => {
    const q = query(collection(db, "builds"), orderBy("timestamp", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const buildsList = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setBuilds(buildsList as Build[]);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    socket.on("build-status-update", (data: { status: string }) => {
      setLiveStatus(data.status);
      setIsBuilding(data.status === "IN_PROGRESS");
    });
    socket.on("build-log", (newLogs: string) => {
      setLiveLogs(prevLogs => [...prevLogs, newLogs]);
    });
    return () => {
      socket.off("build-status-update");
      socket.off("build-log");
    };
  }, []);

  const triggerManualBuild = async () => {
    setIsBuilding(true);
    setLiveStatus("Build triggered...");
    setLiveLogs([]);
    try {
      const response = await fetch("http://localhost:4000/api/trigger-build");
      if (!response.ok) {
        setLiveStatus("Failed to trigger build");
      }
    } catch (error) {
      setLiveStatus("Failed to trigger build");
    }
  };

  const openLiveLogsModal = () => {
    setIsLiveModalOpen(true);
  };
  
  const closeLiveLogsModal = () => {
    setIsLiveModalOpen(false);
  };

  return (
    <div className={styles.dashboardContainer}>
      <div className={styles.sidebar}>
        <div className={styles.liveStatusCard}>
          <div className={styles.liveStatusHeader}>
            <h3 className={styles.liveStatusTitle}>Live Build Status</h3>
            {isBuilding ? <RingLoader size={20} color={"#2563eb"} /> : <FiPlayCircle size={20} color={"#16a34a"} />}
          </div>
          <p className={styles.liveStatusText}>{liveStatus}</p>
          <div className={styles.actionButtons}>
            <motion.button 
              className={styles.triggerButton}
              onClick={triggerManualBuild}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              disabled={isBuilding}
            >
              Trigger Build
            </motion.button>
            <motion.button
              className={styles.viewLiveLogsButton}
              onClick={openLiveLogsModal}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              View Live Logs
            </motion.button>
          </div>
        </div>
      </div>
      <div className={styles.logList}>
        <h3 className={styles.logListTitle}>Build History</h3>
        {builds.length === 0 ? (
          <p className={styles.noLogsText}>No builds found in Firebase.</p>
        ) : (
          builds.map((build) => (
            <LogCard key={build.id} log={build} onClick={() => setSelectedBuild(build)} />
          ))
        )}
      </div>
      {selectedBuild && (
        <LogDetailsModal log={selectedBuild} onClose={() => setSelectedBuild(null)} title={`Build #${selectedBuild.buildNumber}`} />
      )}
      {isLiveModalOpen && (
        <LogDetailsModal 
          log={{ details: liveLogs.join("") }} 
          onClose={closeLiveLogsModal} 
          title="Live Build Logs"
        />
      )}
    </div>
  );
}

export default LogViewer;