import { useEffect, useState } from "react";
import { collection, onSnapshot, query, orderBy } from "firebase/firestore";
import { db } from "../firebase";
import LogCard from "./LogCard";
import LogDetailsModal from "./LogDetailsModal";
import styles from "../styles/Dashboard.module.css";

function LogViewer() {
  const [logs, setLogs] = useState<any[]>([]);
  const [selectedLog, setSelectedLog] = useState<any | null>(null);

  useEffect(() => {
    const q = query(collection(db, "logs"), orderBy("timestamp", "desc"));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const logList = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data()
        }));
        setLogs(logList);
      },
      (error) => {
        console.error("Firestore error:", error);
      }
    );

    return () => unsubscribe();
  }, []);

  return (
    <div className={styles.dashboardContainer}>
      <div className={styles.contentWrapper}>
        <div className={styles.logWindow}>
          {logs.length === 0 ? (
            <p style={{ color: "#64748b" }}>No logs yet.</p>
          ) : (
            logs.map((log) => (
              <LogCard key={log.id} log={log} onClick={() => setSelectedLog(log)} />
            ))
          )}
          {selectedLog && (
            <LogDetailsModal log={selectedLog} onClose={() => setSelectedLog(null)} />
          )}
        </div>
      </div>
    </div>
  );
}

export default LogViewer;
