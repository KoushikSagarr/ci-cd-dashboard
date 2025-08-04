import { FiAlertTriangle, FiCheckCircle, FiInfo } from "react-icons/fi";

const levelIcons = {
  INFO: <FiInfo color="#2563eb" />,       // blue-600
  WARN: <FiAlertTriangle color="#f59e0b" />, // amber-500
  ERROR: <FiAlertTriangle color="#ef4444" /> // red-500
};

type LogCardProps = {
  log: any;
  onClick: () => void;
};

function LogCard({ log, onClick }: LogCardProps) {
  const bgColor = {
    INFO: "#e0f2fe",   // light blue
    WARN: "#fef3c7",   // soft yellow
    ERROR: "#fee2e2"   // soft red
  };

  return (
    <div
      onClick={onClick}
      style={{
        background: bgColor[log.level] || "#f1f5f9",
        borderRadius: "10px",
        padding: "16px",
        marginBottom: "16px",
        cursor: "pointer",
        transition: "transform 0.2s ease-in-out",
        boxShadow: "0 2px 6px rgba(0,0,0,0.04)"
      }}
      onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.01)")}
      onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          {levelIcons[log.level] || <FiInfo />}
          <strong style={{ fontSize: "14px" }}>{log.level}</strong>
        </div>
        <span style={{ fontSize: "12px", color: "#475569" }}>
          {new Date(log.timestamp).toLocaleString()}
        </span>
      </div>

      <div style={{ marginTop: "10px", fontWeight: 500, fontSize: "15px" }}>
        {log.message}
      </div>

      <div style={{ fontSize: "12px", color: "#64748b", marginTop: "6px" }}>
        Pipeline ID: {log.pipelineId}
      </div>
    </div>
  );
}

export default LogCard;
