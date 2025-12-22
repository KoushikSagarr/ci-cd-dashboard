import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FiBox, FiCpu, FiHardDrive, FiActivity, FiAlertCircle, FiCheckCircle } from 'react-icons/fi';
import GaugeChart from './charts/GaugeChart';
import styles from '../styles/Dashboard.module.css';

interface Pod {
    name: string;
    status: string;
    ready: boolean;
    restarts: number;
    cpu: number;
    memory: number;
    age: string;
}

interface KubernetesData {
    available: boolean;
    pods: Pod[];
    totalPods: number;
    runningPods: number;
    pendingPods: number;
    failedPods: number;
    clusterInfo?: string;
    error?: string;
}

function KubernetesPods() {
    const [k8sData, setK8sData] = useState<KubernetesData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchK8sStatus = async () => {
            try {
                const response = await fetch('http://localhost:4000/api/metrics/kubernetes');
                const data = await response.json();
                setK8sData(data);
            } catch (error) {
                setK8sData({
                    available: false,
                    pods: [],
                    totalPods: 0,
                    runningPods: 0,
                    pendingPods: 0,
                    failedPods: 0,
                    error: 'Failed to fetch Kubernetes metrics'
                });
            } finally {
                setLoading(false);
            }
        };

        fetchK8sStatus();
        const interval = setInterval(fetchK8sStatus, 10000);
        return () => clearInterval(interval);
    }, []);

    if (loading) {
        return (
            <div className={styles.k8sLoading}>
                <FiActivity className={styles.spinIcon} />
                <span>Loading Kubernetes data...</span>
            </div>
        );
    }

    if (!k8sData?.available) {
        return (
            <motion.div
                className={styles.k8sOffline}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
            >
                <FiAlertCircle size={32} />
                <h4>Kubernetes Unavailable</h4>
                <p>{k8sData?.error || 'Cluster is not accessible'}</p>
            </motion.div>
        );
    }

    return (
        <div className={styles.k8sContainer}>
            {/* Cluster Overview */}
            <div className={styles.k8sOverview}>
                <div className={styles.k8sOverviewItem}>
                    <FiBox size={20} />
                    <div>
                        <span className={styles.k8sOverviewValue}>{k8sData.totalPods}</span>
                        <span className={styles.k8sOverviewLabel}>Total Pods</span>
                    </div>
                </div>
                <div className={styles.k8sOverviewItem}>
                    <FiCheckCircle size={20} style={{ color: '#10b981' }} />
                    <div>
                        <span className={styles.k8sOverviewValue} style={{ color: '#10b981' }}>
                            {k8sData.runningPods}
                        </span>
                        <span className={styles.k8sOverviewLabel}>Running</span>
                    </div>
                </div>
                <div className={styles.k8sOverviewItem}>
                    <FiAlertCircle size={20} style={{ color: '#f59e0b' }} />
                    <div>
                        <span className={styles.k8sOverviewValue} style={{ color: '#f59e0b' }}>
                            {k8sData.pendingPods}
                        </span>
                        <span className={styles.k8sOverviewLabel}>Pending</span>
                    </div>
                </div>
                <div className={styles.k8sOverviewItem}>
                    <FiAlertCircle size={20} style={{ color: '#ef4444' }} />
                    <div>
                        <span className={styles.k8sOverviewValue} style={{ color: '#ef4444' }}>
                            {k8sData.failedPods}
                        </span>
                        <span className={styles.k8sOverviewLabel}>Failed</span>
                    </div>
                </div>
            </div>

            {/* Pod List */}
            <div className={styles.k8sPodList}>
                {k8sData.pods.length > 0 ? (
                    k8sData.pods.map((pod, index) => (
                        <motion.div
                            key={pod.name}
                            className={`${styles.k8sPodCard} ${styles[pod.status.toLowerCase()]}`}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.1 }}
                        >
                            <div className={styles.k8sPodHeader}>
                                <div className={styles.k8sPodName}>
                                    <div className={`${styles.k8sPodStatus} ${styles[pod.status.toLowerCase()]}`} />
                                    <span>{pod.name}</span>
                                </div>
                                <span className={styles.k8sPodAge}>{pod.age}</span>
                            </div>

                            <div className={styles.k8sPodMetrics}>
                                <div className={styles.k8sPodMetric}>
                                    <GaugeChart
                                        value={pod.cpu}
                                        size={70}
                                        label="CPU"
                                        color="#06b6d4"
                                    />
                                </div>
                                <div className={styles.k8sPodMetric}>
                                    <GaugeChart
                                        value={pod.memory}
                                        size={70}
                                        label="Memory"
                                        color="#8b5cf6"
                                    />
                                </div>
                                <div className={styles.k8sPodInfo}>
                                    <div className={styles.k8sPodInfoItem}>
                                        <FiCpu size={14} />
                                        <span>Restarts: {pod.restarts}</span>
                                    </div>
                                    <div className={styles.k8sPodInfoItem}>
                                        <FiHardDrive size={14} />
                                        <span>Ready: {pod.ready ? 'Yes' : 'No'}</span>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    ))
                ) : (
                    <div className={styles.k8sNoPods}>
                        <FiBox size={24} />
                        <span>No pods found in ci-cd-app namespace</span>
                    </div>
                )}
            </div>
        </div>
    );
}

export default KubernetesPods;
