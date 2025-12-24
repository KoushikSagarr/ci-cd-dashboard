import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';

interface GaugeChartProps {
    value: number;
    maxValue?: number;
    color?: string;
    backgroundColor?: string;
    size?: number;
    label?: string;
    unit?: string;
    invertColors?: boolean; // When true, high values show green (for uptime/health)
}

function GaugeChart({
    value,
    maxValue = 100,
    color = '#06b6d4',
    backgroundColor = 'rgba(51, 65, 85, 0.4)',
    size = 120,
    label,
    unit = '%',
    invertColors = false
}: GaugeChartProps) {
    const percentage = Math.min((value / maxValue) * 100, 100);

    const data = [
        { name: 'value', value: percentage },
        { name: 'remaining', value: 100 - percentage }
    ];

    // Color gradient based on value
    const getColor = () => {
        if (invertColors) {
            // For uptime/health: high is good (green), low is bad (red)
            if (percentage > 80) return '#10b981'; // Green for high uptime
            if (percentage > 60) return '#f59e0b'; // Yellow for medium
            return '#ef4444'; // Red for low
        } else {
            // For CPU/Memory: high is bad (red), low is good
            if (percentage > 80) return '#ef4444'; // Red for high usage
            if (percentage > 60) return '#f59e0b'; // Yellow for medium
            return color; // Default color for low
        }
    };

    return (
        <div style={{
            position: 'relative',
            width: size,
            height: size,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
        }}>
            <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                    <Pie
                        data={data}
                        cx="50%"
                        cy="50%"
                        startAngle={180}
                        endAngle={0}
                        innerRadius="70%"
                        outerRadius="90%"
                        paddingAngle={0}
                        dataKey="value"
                        animationDuration={1000}
                        animationBegin={0}
                    >
                        <Cell fill={getColor()} />
                        <Cell fill={backgroundColor} />
                    </Pie>
                </PieChart>
            </ResponsiveContainer>
            <div style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -30%)',
                textAlign: 'center'
            }}>
                <div style={{
                    fontSize: size * 0.22,
                    fontWeight: 700,
                    color: getColor(),
                    lineHeight: 1
                }}>
                    {Math.round(value)}{unit}
                </div>
                {label && (
                    <div style={{
                        fontSize: size * 0.1,
                        color: '#94a3b8',
                        marginTop: 4,
                        fontWeight: 500,
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em'
                    }}>
                        {label}
                    </div>
                )}
            </div>
        </div>
    );
}

export default GaugeChart;
