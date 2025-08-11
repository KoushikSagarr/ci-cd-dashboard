import { useEffect, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase";
import { FiX, FiExternalLink, FiClock, FiHash, FiActivity } from "react-icons/fi";
import styles from "../styles/Dashboard.module.css";
import { motion, AnimatePresence } from "framer-motion";

type LogDetailsModalProps = {
  log: any;
  onClose: () => void;
  title: string;
};

function LogDetailsModal({ log, onClose, title }: LogDetailsModalProps) {
  const [details, setDetails] = useState<string | null>(null);

  useEffect(() => {
    const fetchDetails = async () => {
      if (log.id) {
        try {
          const docRef = doc(db, "builds", log.id);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            setDetails(JSON.stringify(docSnap.data(), null, 2));
          }
        } catch (error) {
          setDetails("Error loading details...");
        }
      }
    };
    fetchDetails();
  }, [log.id]);

  return (
    <AnimatePresence>
      <motion.div
        className={styles.modalOverlay}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <motion.div
          className={styles.modalContent}
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className={styles.modalHeader}>
            <h2 className={styles.modalTitle}>{title}</h2>
            <button className={styles.modalCloseButton} onClick={onClose}>
              <FiX size={20} />
            </button>
          </div>

          {log.buildNumber && (
            <div className={styles.modalInfo}>
              <div className={styles.modalInfoItem}>
                <div className={styles.modalInfoLabel}>
                  <FiHash size={12} /> Build Number
                </div>
                <div className={styles.modalInfoValue}>#{log.buildNumber}</div>
              </div>
              <div className={styles.modalInfoItem}>
                <div className={styles.modalInfoLabel}>
                  <FiActivity size={12} /> Status
                </div>
                <div className={styles.modalInfoValue}>{log.status}</div>
              </div>
              <div className={styles.modalInfoItem}>
                <div className={styles.modalInfoLabel}>
                  <FiClock size={12} /> Timestamp
                </div>
                <div className={styles.modalInfoValue}>
                  {log.timestamp?.toDate().toLocaleString()}
                </div>
              </div>
              <div className={styles.modalInfoItem}>
                <div className={styles.modalInfoLabel}>
                  <FiExternalLink size={12} /> Jenkins Console
                </div>
                <div className={styles.modalInfoValue}>
                  <a 
                    href={log.consoleLink} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className={styles.modalLink}
                  >
                    View Console Output
                  </a>
                </div>
              </div>
            </div>
          )}

          <div className={styles.modalDetails}>
            {details || "Loading details..."}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

export default LogDetailsModal;