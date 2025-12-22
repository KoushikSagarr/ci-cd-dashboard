import { useState } from "react";
import Navbar from "./components/Navbar";
import LogViewer from "./components/LogViewer";
import MetricsDashboard from "./components/MetricsDashboard";
import { motion, AnimatePresence } from "framer-motion";
import "./styles/Dashboard.module.css";

type TabType = 'builds' | 'metrics';

function App() {
  const [activeTab, setActiveTab] = useState<TabType>('builds');

  return (
    <>
      <Navbar activeTab={activeTab} onTabChange={setActiveTab} />
      <AnimatePresence mode="wait">
        {activeTab === 'builds' ? (
          <motion.div
            key="builds"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.3 }}
          >
            <LogViewer />
          </motion.div>
        ) : (
          <motion.div
            key="metrics"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
          >
            <MetricsDashboard />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

export default App;