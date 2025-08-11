// src/components/LogCard.tsx
import { FiAlertTriangle, FiInfo, FiCheckCircle, FiXCircle } from "react-icons/fi";
import type { ReactNode } from "react";
import styles from "../styles/Dashboard.module.css";
import { motion } from 'framer-motion';

type BuildStatus = "SUCCESS" | "UNSTABLE" | "FAILURE" | "ABORTED";

const statusIcons: Record<BuildStatus, ReactNode> = {
  SUCCESS: <FiCheckCircle className={styles.successIcon} />,
  UNSTABLE: <FiAlertTriangle className={styles.unstableIcon} />,
  FAILURE: <FiXCircle className={styles.failureIcon} />,
  ABORTED: <FiInfo className={styles.abortedIcon} />
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

  return (
    <motion.div
      className={`${styles.logCard} ${styles[status.toLowerCase()]}`}
      onClick={onClick}
      whileHover={{ scale: 1.02, boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }}
      whileTap={{ scale: 0.98 }}
    >
      <div className={styles.logCardHeader}>
        <div className={styles.logCardStatus}>
          {statusIcons[status] || <FiInfo className={styles.infoIcon} />}
          <strong className={styles.logCardStatusText}>{log.status}</strong>
        </div>
        <span className={styles.logCardTimestamp}>
          {log.timestamp?.toDate().toLocaleString()}
        </span>
      </div>

      <div className={styles.logCardJobName}>
        Job: {log.jobName}
      </div>

      <div className={styles.logCardBuildNumber}>
        Build Number: #{log.buildNumber}
      </div>
    </motion.div>
  );
}

export default LogCard;