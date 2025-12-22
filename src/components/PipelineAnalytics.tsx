import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FiTrendingUp, FiClock, FiCheckCircle, FiXCircle, FiActivity } from 'react-icons/fi';
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import AreaChart from './charts/AreaChart';
import MetricsCard from './MetricsCard';
import styles from '../styles/Dashboard.module.css';
import { format, subDays } from 'date-fns';

interface Build {
    id: string;
    status: string;
    buildNumber: number;
    timestamp: any;
    duration?: string;
}

interface PipelineStats {
    totalBuilds: number;
    successRate: number;
    avgDuration: string;
    failureRate: number;
    buildsToday: number;
    buildsTrend: { name: string; value: number }[];
    successTrend: { name: string; value: number }[];
}

function PipelineAnalytics() {
    const [stats, setStats] = useState<PipelineStats>({
        totalBuilds: 0,
        successRate: 0,
        avgDuration: '0m',
        failureRate: 0,
        buildsToday: 0,
        buildsTrend: [],
        successTrend: []
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const q = query(
            collection(db, 'builds'),
            orderBy('timestamp', 'desc'),
            limit(100)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const builds = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as Build[];

            // Calculate stats
            const total = builds.length;
            const successful = builds.filter(b => b.status === 'SUCCESS').length;
            const failed = builds.filter(b => b.status === 'FAILURE').length;

            // Today's builds
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const todayBuilds = builds.filter(b => {
                const buildDate = b.timestamp?.toDate?.() || new Date();
                return buildDate >= today;
            }).length;

            // Calculate average duration (parse duration strings like "1 min 30 sec")
            const durations = builds
                .filter(b => b.duration)
                .map(b => {
                    const match = b.duration?.match(/(\d+)\s*min/);
                    return match ? parseInt(match[1]) : 0;
                })
                .filter(d => d > 0);

            const avgDurationMin = durations.length > 0
                ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)
                : 0;

            // Build trend data (last 7 days)
            const buildsTrend = [];
            const successTrend = [];
            for (let i = 6; i >= 0; i--) {
                const date = subDays(new Date(), i);
                const dayStart = new Date(date);
                dayStart.setHours(0, 0, 0, 0);
                const dayEnd = new Date(date);
                dayEnd.setHours(23, 59, 59, 999);

                const dayBuilds = builds.filter(b => {
                    const buildDate = b.timestamp?.toDate?.() || new Date();
                    return buildDate >= dayStart && buildDate <= dayEnd;
                });

                const daySuccess = dayBuilds.filter(b => b.status === 'SUCCESS').length;

                buildsTrend.push({
                    name: format(date, 'EEE'),
                    value: dayBuilds.length
                });

                successTrend.push({
                    name: format(date, 'EEE'),
                    value: dayBuilds.length > 0 ? Math.round((daySuccess / dayBuilds.length) * 100) : 0
                });
            }

            setStats({
                totalBuilds: total,
                successRate: total > 0 ? Math.round((successful / total) * 100) : 0,
                avgDuration: `${avgDurationMin}m`,
                failureRate: total > 0 ? Math.round((failed / total) * 100) : 0,
                buildsToday: todayBuilds,
                buildsTrend,
                successTrend
            });

            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    if (loading) {
        return (
            <div className={styles.analyticsLoading}>
                <FiActivity className={styles.spinIcon} />
                <span>Computing analytics...</span>
            </div>
        );
    }

    return (
        <div className={styles.analyticsContainer}>
            {/* Stats Cards Row */}
            <div className={styles.analyticsStatsRow}>
                <MetricsCard
                    title="Success Rate"
                    value={`${stats.successRate}%`}
                    subtitle="Last 100 builds"
                    icon={FiCheckCircle}
                    color="green"
                    trend={stats.successRate >= 80 ? 'up' : 'down'}
                    trendValue={stats.successRate >= 80 ? 'Healthy' : 'Needs attention'}
                />
                <MetricsCard
                    title="Avg Duration"
                    value={stats.avgDuration}
                    subtitle="Build time"
                    icon={FiClock}
                    color="cyan"
                />
                <MetricsCard
                    title="Builds Today"
                    value={stats.buildsToday}
                    subtitle="Deployments"
                    icon={FiTrendingUp}
                    color="purple"
                />
                <MetricsCard
                    title="Failure Rate"
                    value={`${stats.failureRate}%`}
                    subtitle="Last 100 builds"
                    icon={FiXCircle}
                    color="red"
                    trend={stats.failureRate <= 20 ? 'up' : 'down'}
                    trendValue={stats.failureRate <= 20 ? 'Low' : 'High'}
                />
            </div>

            {/* Charts Row */}
            <div className={styles.analyticsChartsRow}>
                <motion.div
                    className={styles.analyticsChartCard}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                >
                    <h4 className={styles.chartTitle}>
                        <FiActivity size={18} />
                        Build Activity (7 Days)
                    </h4>
                    <AreaChart
                        data={stats.buildsTrend}
                        color="#06b6d4"
                        gradientId="buildsTrend"
                        height={180}
                    />
                </motion.div>

                <motion.div
                    className={styles.analyticsChartCard}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                >
                    <h4 className={styles.chartTitle}>
                        <FiCheckCircle size={18} />
                        Success Rate Trend (%)
                    </h4>
                    <AreaChart
                        data={stats.successTrend}
                        color="#10b981"
                        gradientId="successTrend"
                        height={180}
                    />
                </motion.div>
            </div>
        </div>
    );
}

export default PipelineAnalytics;
