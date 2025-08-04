type LogDetailsModalProps = {
  log: any;
  onClose: () => void;
};

function LogDetailsModal({ log, onClose }: LogDetailsModalProps) {
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
        <h2 style={{ marginBottom: "12px" }}>{log.message}</h2>
        <p><strong>Level:</strong> {log.level}</p>
        <p><strong>Timestamp:</strong> {new Date(log.timestamp).toLocaleString()}</p>
        <p><strong>Pipeline:</strong> {log.pipelineId}</p>

        <pre style={{
          background: "#f1f5f9",
          padding: "12px",
          borderRadius: "8px",
          fontSize: "13px",
          marginTop: "14px"
        }}>
          {JSON.stringify(log.details, null, 2)}
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
