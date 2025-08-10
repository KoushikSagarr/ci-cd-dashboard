import { useEffect, useState } from "react";
import { collection, onSnapshot, query, orderBy } from "firebase/firestore";
import { db } from "../firebase";
import LogCard from "./LogCard";
import LogDetailsModal from "./LogDetailsModal";
import styles from "../styles/Dashboard.module.css";
import { io } from "socket.io-client";

const socket = io("http://localhost:3000"); // Adjust if server is remote

function LogViewer() {
  const [logs, setLogs] = useState<any[]>([]);
  const [selectedLog, setSelectedLog] = useState<any | null>(null);
  const [buildStatus, setBuildStatus] = useState<string>("");

  // Firestore logs subscription
  useEffect(() => {
    const q = query(collection(db, "logs"), orderBy("timestamp", "desc"));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const logList = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setLogs(logList);
      },
      (error) => {
        console.error("Firestore error:", error);
      }
    );

    return () => unsubscribe();
  }, []);

  // Socket.io build status subscription
  useEffect(() => {
    socket.on("buildStatus", (data) => {
      setBuildStatus(data.status);
    });

    return () => {
      socket.off("buildStatus");
    };
  }, []);

  return (
    <div className={styles.dashboardContainer}>
      <div className={styles.contentWrapper}>
        {/* Build Status Section */}
        <div style={{ marginBottom: "1rem", padding: "10px", background: "#f1f5f9", borderRadius: "6px" }}>
          <h3 style={{ margin: 0 }}>Build Status</h3>
          <p style={{ margin: 0, color: buildStatus ? "#000" : "#64748b" }}>
            {buildStatus || "Waiting for updates..."}
          </p>
        </div>

        {/* Logs Section */}
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
