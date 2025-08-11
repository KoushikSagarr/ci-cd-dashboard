// src/components/LogViewer.tsx
import { useEffect, useState } from "react";
import { collection, onSnapshot, query, orderBy } from "firebase/firestore";
import { db } from "../firebase";
import LogCard from "./LogCard";
import LogDetailsModal from "./LogDetailsModal";
import styles from "../styles/Dashboard.module.css";
import { motion } from "framer-motion";
import { FiPlayCircle } from "react-icons/fi";

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

  useEffect(() => {
    // Fetches historical build logs from Firestore
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

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1, 
      transition: { 
        staggerChildren: 0.1
      } 
    },
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { y: 0, opacity: 1 },
  };

  return (
    <div className={styles.logListContainer}>
      <div className={styles.sidebar}>
        <div className={styles.liveStatusCard}>
          <div className={styles.liveStatusHeader}>
            <h3 className={styles.liveStatusTitle}>Live Build Status</h3>
            <FiPlayCircle size={20} color={"#16a34a"} />
          </div>
          <p className={styles.liveStatusText}>Jenkins is now online and connected.</p>
        </div>
      </div>
      <div className={styles.logList}>
        <h3 className={styles.logListTitle}>Build History</h3>
        {builds.length === 0 ? (
          <p className={styles.noLogsText}>No builds found in Firebase.</p>
        ) : (
          <motion.div
            className={styles.logList}
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            {builds.map((build) => (
              <motion.div key={build.id} variants={itemVariants}>
                <LogCard log={build} onClick={() => setSelectedBuild(build)} />
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>
      {selectedBuild && (
        <LogDetailsModal
          log={selectedBuild}
          onClose={() => setSelectedBuild(null)}
          title={`Build #${selectedBuild.buildNumber}`}
        />
      )}
    </div>
  );
}

export default LogViewer;