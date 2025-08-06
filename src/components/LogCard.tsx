import { FiAlertTriangle, FiInfo,FiCheckCircle } from "react-icons/fi";
import type { ReactNode } from "react";

type LogLevel = "INFO" | "WARN" | "ERROR"| "SUCCESS";

const levelIcons: Record<LogLevel, ReactNode> = {
  INFO: <FiInfo color="#2563eb" />,
  WARN: <FiAlertTriangle color="#f59e0b" />,
  ERROR: <FiAlertTriangle color="#ef4444" />,
  SUCCESS: <FiCheckCircle color="#16a34a" /> 
};

const bgColor: Record<LogLevel, string> = {
  INFO: "#e0f2fe",   
  WARN: "#fef3c7",   
  ERROR: "#fee2e2",   
  SUCCESS: "#dcfce7"
};

type LogCardProps = {
  log: {
    level: string;
    timestamp: string;
    message: string;
    pipelineId: string;
  };
  onClick: () => void;
};

function LogCard({ log, onClick }: LogCardProps) {
  const level = log.level as LogLevel;

  return (
    <div
      onClick={onClick}
      style={{
        background: bgColor[level] || "#f1f5f9",
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
          {levelIcons[level] || <FiInfo />}
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
