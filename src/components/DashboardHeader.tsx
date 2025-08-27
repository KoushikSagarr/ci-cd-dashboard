import { motion } from "framer-motion";
import { FiActivity, FiCheckCircle, FiXCircle} from "react-icons/fi";
import { RingLoader } from 'react-spinners';
import styles from "../styles/Dashboard.module.css";

interface Stats {
  total: number;
  success: number;
  failure: number;
  unstable: number;
}

interface DashboardHeaderProps {
  liveStatus: string;
  isBuilding: boolean;
  jenkinsOnline: boolean;
  stats: Stats;
}

const DashboardHeader = ({ liveStatus, isBuilding, jenkinsOnline, stats }: DashboardHeaderProps) => {
  const getStatusIndicatorClass = () => {
    if (!jenkinsOnline) return styles.offline;
    if (isBuilding) return styles.building;
    return styles.waiting;
  };

  return (
    <motion.div
      className={styles.dashboardHeader}
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div className={styles.liveStatusCard}>
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
      </div>

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
  );
};

export default DashboardHeader;