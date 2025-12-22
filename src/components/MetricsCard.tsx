import { motion } from 'framer-motion';
import type { IconType } from 'react-icons';
import styles from '../styles/Dashboard.module.css';

interface MetricsCardProps {
    title: string;
    value: string | number;
    subtitle?: string;
    icon?: IconType;
    trend?: 'up' | 'down' | 'neutral';
    trendValue?: string;
    color?: 'cyan' | 'green' | 'red' | 'yellow' | 'purple';
    children?: React.ReactNode;
}

function MetricsCard({
    title,
    value,
    subtitle,
    icon: Icon,
    trend,
    trendValue,
    color = 'cyan',
    children
}: MetricsCardProps) {
    const colorMap = {
        cyan: '#06b6d4',
        green: '#10b981',
        red: '#ef4444',
        yellow: '#f59e0b',
        purple: '#8b5cf6'
    };

    const getTrendIcon = () => {
        if (trend === 'up') return '↑';
        if (trend === 'down') return '↓';
        return '→';
    };

    const getTrendColor = () => {
        if (trend === 'up') return '#10b981';
        if (trend === 'down') return '#ef4444';
        return '#64748b';
    };

    return (
        <motion.div
            className={styles.metricsCard}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={{ scale: 1.02, y: -4 }}
            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            style={{ '--card-accent': colorMap[color] } as React.CSSProperties}
        >
            <div className={styles.metricsCardHeader}>
                <div className={styles.metricsCardTitleRow}>
                    {Icon && (
                        <div
                            className={styles.metricsCardIcon}
                            style={{ backgroundColor: `${colorMap[color]}20`, color: colorMap[color] }}
                        >
                            <Icon size={18} />
                        </div>
                    )}
                    <span className={styles.metricsCardTitle}>{title}</span>
                </div>
                {trend && trendValue && (
                    <div
                        className={styles.metricsCardTrend}
                        style={{ color: getTrendColor() }}
                    >
                        <span>{getTrendIcon()}</span>
                        <span>{trendValue}</span>
                    </div>
                )}
            </div>

            <div className={styles.metricsCardValue} style={{ color: colorMap[color] }}>
                {value}
            </div>

            {subtitle && (
                <div className={styles.metricsCardSubtitle}>{subtitle}</div>
            )}

            {children && (
                <div className={styles.metricsCardContent}>
                    {children}
                </div>
            )}
        </motion.div>
    );
}

export default MetricsCard;
