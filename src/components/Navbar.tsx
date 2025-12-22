import { FiActivity, FiDatabase, FiLayers, FiBarChart2 } from "react-icons/fi";
import { motion } from "framer-motion";
import styles from "../styles/Dashboard.module.css";
import QuickActions from "./QuickActions";

interface NavbarProps {
  activeTab: 'builds' | 'metrics';
  onTabChange: (tab: 'builds' | 'metrics') => void;
}

function Navbar({ activeTab, onTabChange }: NavbarProps) {
  return (
    <nav className={styles.navbar}>
      <div className={styles.navbarContent}>
        <div className={styles.navbarLeft}>
          <div className={styles.logo}>
            <div className={styles.logoIcon}>
              <FiActivity />
            </div>
            <span className={styles.logoText}>CI/CD Pipeline Dashboard</span>
          </div>

          {/* Navigation Tabs */}
          <div className={styles.navTabs}>
            <motion.button
              className={`${styles.navTab} ${activeTab === 'builds' ? styles.active : ''}`}
              onClick={() => onTabChange('builds')}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <FiLayers size={16} />
              <span>Builds</span>
              {activeTab === 'builds' && (
                <motion.div
                  className={styles.navTabIndicator}
                  layoutId="navIndicator"
                />
              )}
            </motion.button>
            <motion.button
              className={`${styles.navTab} ${activeTab === 'metrics' ? styles.active : ''}`}
              onClick={() => onTabChange('metrics')}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <FiBarChart2 size={16} />
              <span>Metrics</span>
              {activeTab === 'metrics' && (
                <motion.div
                  className={styles.navTabIndicator}
                  layoutId="navIndicator"
                />
              )}
            </motion.button>
          </div>
        </div>

        <div className={styles.navbarActions}>
          <div className={styles.navbarStatus}>
            <div className={styles.pulseDot}></div>
            <FiDatabase size={16} />
            Firebase Connected
          </div>
          <QuickActions />
        </div>
      </div>
    </nav>
  );
}

export default Navbar;