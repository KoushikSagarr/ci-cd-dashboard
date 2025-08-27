// src/components/Navbar.tsx
import { FiActivity, FiDatabase } from "react-icons/fi";
import styles from "../styles/Dashboard.module.css";
import QuickActions from "./QuickActions";

function Navbar() {
  return (
    <nav className={styles.navbar}>
      <div className={styles.navbarContent}>
        <div className={styles.logo}>
          <div className={styles.logoIcon}>
            <FiActivity />
          </div>
          CI/CD Pipeline Dashboard
        </div>
        <div className={styles.navbarActions}>
            <div className={styles.navbarStatus}>
                <div className={styles.pulseDot}></div>
                <FiDatabase size={16} />
                Connected to Firebase
            </div>
            <QuickActions />
        </div>
      </div>
    </nav>
  );
}

export default Navbar;