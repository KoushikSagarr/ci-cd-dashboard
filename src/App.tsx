// src/App.tsx
import Navbar from "./components/Navbar";
import LogViewer from "./components/LogViewer";
import LogDetailsModal from "./components/LogDetailsModal";
import "./styles/Dashboard.module.css";
import { io } from "socket.io-client";
import { useEffect, useState } from "react";

// Connect to the backend server on port 4000
const socket = io("http://localhost:4000");

function App() {
  const [liveLogs, setLiveLogs] = useState<string[]>([]);
  const [isLiveModalOpen, setIsLiveModalOpen] = useState(false);

  useEffect(() => {
    socket.on("connect", () => console.log("Socket connected!"));
    socket.on("disconnect", () => console.log("Socket disconnected!"));
    
    // Listen for live build logs
    socket.on("build-log", (newLogs: string) => {
      setLiveLogs(prevLogs => [...prevLogs, newLogs]);
    });

    return () => {
      socket.off("build-log");
    };
  }, []);

  const openLiveLogsModal = () => {
    setIsLiveModalOpen(true);
  };
  
  const closeLiveLogsModal = () => {
    setIsLiveModalOpen(false);
  };

  return (
    <>
      <Navbar />
      <LogViewer onLiveLogClick={openLiveLogsModal} />
      {isLiveModalOpen && (
        <LogDetailsModal 
          log={{ details: liveLogs.join("") }} 
          onClose={closeLiveLogsModal} 
          title="Live Build Logs"
        />
      )}
    </>
  );
}

export default App;