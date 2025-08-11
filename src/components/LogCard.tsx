import { FiAlertTriangle, FiInfo, FiCheckCircle, FiXCircle, FiClock, FiHash } from "react-icons/fi";
import type { ReactNode } from "react";
import styles from "../styles/Dashboard.module.css";
import { motion } from 'framer-motion';

type BuildStatus = "SUCCESS" | "UNSTABLE" | "FAILURE" | "ABORTED";

const statusIcons: Record<BuildStatus, ReactNode> = {
  SUCCESS: <FiCheckCircle />,
  UNSTABLE: <FiAlertTriangle />,
  FAILURE: <FiXCircle />,
  ABORTED: <FiInfo />
};

const statusClasses: Record<BuildStatus, string> = {
  SUCCESS: styles.successIcon,
  UNSTABLE: styles.unstableIcon,
  FAILURE: styles.failureIcon,
  ABORTED: styles.abortedIcon
};

type LogCardProps = {
  log: {
    status: string;
    timestamp: any;
    buildNumber: string;
    jobName: string;
  };
  onClick: () => void;
};

function LogCard({ log, onClick }: LogCardProps) {
  const status = log.status as BuildStatus;
  const formatDuration = (timestamp: any) => {
    const now = new Date();
    const logTime = timestamp?.toDate();
    if (!logTime) return "Unknown";
    
    const diff = now.getTime() - logTime.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return "Just now";
  };

  return (
    <motion.div
      className={`${styles.logCard} ${styles[status.toLowerCase()]}`}
      onClick={onClick}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ 
        scale: 1.02, 
        transition: { duration: 0.2 } 
      }}
      whileTap={{ scale: 0.98 }}
      layout
    >
      <div className={styles.logCardHeader}>
        <div className={styles.logCardStatus}>
          <div className={`${styles.statusIcon} ${statusClasses[status]}`}>
            {statusIcons[status] || <FiInfo />}
          </div>
          <div>
            <div className={styles.logCardStatusText}>{log.status}</div>
          </div>
        </div>
        <div className={styles.logCardTimestamp}>
          <FiClock size={12} />
          {formatDuration(log.timestamp)}
        </div>
      </div>

      <div className={styles.logCardContent}>
        <div className={styles.logCardField}>
          <div className={styles.logCardLabel}>Job Name</div>
          <div className={`${styles.logCardValue} ${styles.logCardJobName}`}>
            {log.jobName}
          </div>
        </div>
        <div className={styles.logCardField}>
          <div className={styles.logCardLabel}>Build Number</div>
          <div className={`${styles.logCardValue} ${styles.logCardBuildNumber}`}>
            <FiHash size={12} />
            {log.buildNumber}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export default LogCard;