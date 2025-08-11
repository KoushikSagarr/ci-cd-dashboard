// src/components/LogDetailsModal.tsx
import { useEffect, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase";

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
        // Fetch the full document from Firestore to get additional details
        const docRef = doc(db, "builds", log.id);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setDetails(JSON.stringify(docSnap.data(), null, 2));
        }
      }
    };
    fetchDetails();
  }, [log.id]);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0, 0, 0, 0.7)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 50
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#fff",
          borderRadius: "16px",
          padding: "32px",
          maxWidth: "540px",
          width: "100%",
          boxShadow: "0 12px 30px rgba(0,0,0,0.3)"
        }}
      >
        <h2 style={{ marginBottom: "12px" }}>{title}</h2>
        {log.buildNumber && (
            <>
                <p><strong>Build Number:</strong> {log.buildNumber}</p>
                <p><strong>Status:</strong> {log.status}</p>
                <p><strong>Timestamp:</strong> {log.timestamp.toDate().toLocaleString()}</p>
                <p>
                    <a href={log.consoleLink} target="_blank" rel="noopener noreferrer">
                        View Jenkins Console
                    </a>
                </p>
            </>
        )}

        <pre style={{
          background: "#f1f5f9",
          padding: "12px",
          borderRadius: "8px",
          fontSize: "13px",
          marginTop: "14px",
          whiteSpace: "pre-wrap",
          wordWrap: "break-word",
          maxHeight: "300px",
          overflowY: "auto"
        }}>
          {details || "Loading details..."}
        </pre>

        <button
          style={{
            marginTop: "24px",
            background: "#111827",
            color: "#fff",
            border: "none",
            borderRadius: "8px",
            padding: "10px 20px",
            fontWeight: 500,
            cursor: "pointer"
          }}
          onClick={onClose}
        >
          Close
        </button>
      </div>
    </div>
  );
}

export default LogDetailsModal;