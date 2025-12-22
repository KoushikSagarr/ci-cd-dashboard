import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FiServer, FiZap, FiAlertTriangle, FiClock, FiGlobe } from 'react-icons/fi';
import MetricsCard from './MetricsCard';
import AreaChart from './charts/AreaChart';
import GaugeChart from './charts/GaugeChart';
import KubernetesPods from './KubernetesPods';
import PipelineAnalytics from './PipelineAnalytics';
import styles from '../styles/Dashboard.module.css';
import { API } from '../config/api';

interface AppMetrics {
    httpRequestsTotal: number;
    httpRequestRate: number;
    errorRate: number;
    avgResponseTime: number;
    uptime: number;
    requestHistory: { name: string; value: number }[];
}

function MetricsDashboard() {
    const [appMetrics, setAppMetrics] = useState<AppMetrics | null>(null);
    const [activeSection, setActiveSection] = useState<'overview' | 'kubernetes' | 'pipeline'>('overview');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchMetrics = async () => {
            try {
                const response = await fetch(API.metrics.application);
                if (response.ok) {
                    const data = await response.json();
                    setAppMetrics(data);
                }
            } catch (error) {
                console.error('Failed to fetch app metrics:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchMetrics();
        const interval = setInterval(fetchMetrics, 5000);
        return () => clearInterval(interval);
    }, []);

    const sectionTabs = [
        { id: 'overview', label: 'Overview', icon: FiGlobe },
        { id: 'kubernetes', label: 'Kubernetes', icon: FiServer },
        { id: 'pipeline', label: 'Pipeline Analytics', icon: FiZap },
    ];

    return (
        <div className={styles.metricsDashboard}>
            {/* Section Tabs */}
            <div className={styles.metricsTabs}>
                {sectionTabs.map((tab) => (
                    <motion.button
                        key={tab.id}
                        className={`${styles.metricsTab} ${activeSection === tab.id ? styles.active : ''}`}
                        onClick={() => setActiveSection(tab.id as typeof activeSection)}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                    >
                        <tab.icon size={18} />
                        {tab.label}
                    </motion.button>
                ))}
            </div>

            {/* Overview Section */}
            {activeSection === 'overview' && (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={styles.metricsSection}
                >
                    <h3 className={styles.sectionTitle}>Application Metrics</h3>

                    {/* Metrics Cards Grid */}
                    <div className={styles.metricsGrid}>
                        <MetricsCard
                            title="Request Rate"
                            value={appMetrics ? `${appMetrics.httpRequestRate.toFixed(1)}/s` : '--'}
                            subtitle="Requests per second"
                            icon={FiZap}
                            color="cyan"
                        >
                            {appMetrics && (
                                <AreaChart
                                    data={appMetrics.requestHistory}
                                    height={80}
                                    showAxis={false}
                                    showGrid={false}
                                    color="#06b6d4"
                                    gradientId="requestRate"
                                />
                            )}
                        </MetricsCard>

                        <MetricsCard
                            title="Error Rate"
                            value={appMetrics ? `${appMetrics.errorRate.toFixed(2)}%` : '--'}
                            subtitle="5xx responses"
                            icon={FiAlertTriangle}
                            color={appMetrics && appMetrics.errorRate > 5 ? 'red' : 'green'}
                        />

                        <MetricsCard
                            title="Avg Response"
                            value={appMetrics ? `${appMetrics.avgResponseTime}ms` : '--'}
                            subtitle="Response time"
                            icon={FiClock}
                            color="purple"
                        />

                        <div className={styles.gaugeCard}>
                            <h4 className={styles.gaugeTitle}>System Health</h4>
                            <div className={styles.gaugeContainer}>
                                <GaugeChart
                                    value={appMetrics?.uptime || 0}
                                    maxValue={100}
                                    size={140}
                                    label="Uptime"
                                    color="#10b981"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Request History Chart */}
                    {appMetrics && (
                        <motion.div
                            className={styles.chartPanel}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2 }}
                        >
                            <h4 className={styles.chartTitle}>
                                <FiZap size={18} />
                                Request History (Last Hour)
                            </h4>
                            <AreaChart
                                data={appMetrics.requestHistory}
                                height={200}
                                color="#06b6d4"
                                gradientId="requestHistory"
                            />
                        </motion.div>
                    )}

                    {loading && (
                        <div className={styles.metricsLoading}>
                            <span>Loading metrics...</span>
                            <p>Make sure the ci-cd-app is running and expose /metrics endpoint</p>
                        </div>
                    )}
                </motion.div>
            )}

            {/* Kubernetes Section */}
            {activeSection === 'kubernetes' && (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={styles.metricsSection}
                >
                    <h3 className={styles.sectionTitle}>Kubernetes Cluster</h3>
                    <KubernetesPods />
                </motion.div>
            )}

            {/* Pipeline Analytics Section */}
            {activeSection === 'pipeline' && (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={styles.metricsSection}
                >
                    <h3 className={styles.sectionTitle}>Pipeline Analytics</h3>
                    <PipelineAnalytics />
                </motion.div>
            )}
        </div>
    );
}

export default MetricsDashboard;
