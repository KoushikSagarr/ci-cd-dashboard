// src/components/QuickActions.tsx
import { FiGithub, FiZap } from "react-icons/fi";
import styles from "../styles/Dashboard.module.css";
import { motion } from "framer-motion";

const QuickActions = () => {
    const openGitRepo = () => {
        window.open("https://github.com/KoushikSagarr/ci-cd-pipeline", "_blank");
    };

    const openJenkins = () => {
        window.open("http://localhost:8080/job/ci-cd-pipeline/", "_blank");
    };

    return (
        <div className={styles.quickActionsContainer}>
            <motion.button
                className={styles.quickActionButton}
                onClick={openGitRepo}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
            >
                <FiGithub size={20} />
                <span>Git Repo</span>
            </motion.button>
            <motion.button
                className={styles.quickActionButton}
                onClick={openJenkins}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
            >
                <FiZap size={20} />
                <span>Jenkins Job</span>
            </motion.button>
        </div>
    );
};

export default QuickActions;