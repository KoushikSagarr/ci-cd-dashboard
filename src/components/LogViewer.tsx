import { useEffect, useState } from "react";
import { collection, onSnapshot, query, orderBy } from "firebase/firestore";
import { db } from "../firebase";
import LogCard from "./LogCard";
import LogDetailsModal from "./LogDetailsModal";
import styles from "../styles/Dashboard.module.css";
import { motion, AnimatePresence } from "framer-motion";
import { RingLoader } from 'react-spinners';
import { FiActivity, FiCheckCircle, FiXCircle, FiInfo } from "react-icons/fi";

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
  const [isBuilding, setIsBuilding] = useState(false);
  const [jenkinsOnline, setJenkinsOnline] = useState(true);

  // Calculate statistics
  const stats = {
    total: builds.length,
    success: builds.filter(b => b.status === 'SUCCESS').length,
    failure: builds.filter(b => b.status === 'FAILURE').length,
    unstable: builds.filter(b => b.status === 'UNSTABLE').length,
  };

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
    const checkLiveStatus = async () => {
      try {
        const response = await fetch("http://localhost:8080/job/ci-cd-pipeline/lastBuild/api/json");
        const data = await response.json();
        setIsBuilding(data.building);
        setJenkinsOnline(true);
        setLiveStatus(data.building ? "Build is running..." : "Waiting for build...");
      } catch (error) {
        setJenkinsOnline(false);
        setIsBuilding(false);
        setLiveStatus("Jenkins is offline");
      }
    };
    
    checkLiveStatus();
    const interval = setInterval(checkLiveStatus, 5000);
    return () => clearInterval(interval);
  }, []);

  const getStatusIndicatorClass = () => {
    if (!jenkinsOnline) return styles.offline;
    if (isBuilding) return styles.building;
    return styles.waiting;
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1, 
      transition: { 
        staggerChildren: 0.05
      } 
    },
  };

  return (
    <div className={styles.logListContainer}>
      <div className={styles.sidebar}>
        <motion.div 
          className={styles.liveStatusCard}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div className={styles.liveStatusHeader}>
            <h3 className={styles.liveStatusTitle}>
              <FiActivity size={20} />
              Live Status
            </h3>
            <div className={`${styles.liveStatusIndicator} ${getStatusIndicatorClass()}`}>
              {isBuilding ? (
                <>
                  <RingLoader size={16} color="#fbbf24" />
                  Building
                </>
              ) : jenkinsOnline ? (
                <>
                  <FiCheckCircle size={16} />
                  Online
                </>
              ) : (
                <>
                  <FiXCircle size={16} />
                  Offline
                </>
              )}
            </div>
          </div>
          <p className={styles.liveStatusText}>{liveStatus}</p>
          
          <div className={styles.statsGrid}>
            <motion.div 
              className={styles.statCard}
              whileHover={{ scale: 1.05 }}
              transition={{ type: "spring", stiffness: 400, damping: 17 }}
            >
              <div className={styles.statValue}>{stats.total}</div>
              <div className={styles.statLabel}>Total</div>
            </motion.div>
            <motion.div 
              className={styles.statCard}
              whileHover={{ scale: 1.05 }}
              transition={{ type: "spring", stiffness: 400, damping: 17 }}
            >
              <div className={styles.statValue} style={{ color: 'var(--success)' }}>{stats.success}</div>
              <div className={styles.statLabel}>Success</div>
            </motion.div>
            <motion.div 
              className={styles.statCard}
              whileHover={{ scale: 1.05 }}
              transition={{ type: "spring", stiffness: 400, damping: 17 }}
            >
              <div className={styles.statValue} style={{ color: 'var(--error)' }}>{stats.failure}</div>
              <div className={styles.statLabel}>Failed</div>
            </motion.div>
            <motion.div 
              className={styles.statCard}
              whileHover={{ scale: 1.05 }}
              transition={{ type: "spring", stiffness: 400, damping: 17 }}
            >
              <div className={styles.statValue} style={{ color: 'var(--warning)' }}>{stats.unstable}</div>
              <div className={styles.statLabel}>Unstable</div>
            </motion.div>
          </div>
        </motion.div>
      </div>

      <div className={styles.logList}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <h3 className={styles.logListTitle}>Build History</h3>
          <p className={styles.logListSubtitle}>
            Recent pipeline executions and their status
          </p>
        </motion.div>
        
        {builds.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            <div className={styles.noLogsText}>
              <FiInfo size={24} style={{ marginBottom: '0.5rem' }} />
              <div>No builds found in Firebase</div>
              <small>Builds will appear here once your pipeline runs</small>
            </div>
          </motion.div>
        ) : (
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            <AnimatePresence>
              {builds.map((build, index) => (
                <motion.div
                  key={build.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ delay: index * 0.05 }}
                  layout
                >
                  <LogCard 
                    log={build} 
                    onClick={() => setSelectedBuild(build)} 
                  />
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        )}
      </div>

      <AnimatePresence>
        {selectedBuild && (
          <LogDetailsModal
            log={selectedBuild}
            onClose={() => setSelectedBuild(null)}
            title={`Build #${selectedBuild.buildNumber}`}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

export default LogViewer;