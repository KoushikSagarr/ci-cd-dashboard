import { AreaChart as RechartsAreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface DataPoint {
    name: string;
    value: number;
    [key: string]: string | number;
}

interface AreaChartProps {
    data: DataPoint[];
    dataKey?: string;
    color?: string;
    gradientId?: string;
    height?: number;
    showGrid?: boolean;
    showAxis?: boolean;
}

function AreaChart({
    data,
    dataKey = 'value',
    color = '#06b6d4',
    gradientId = 'colorValue',
    height = 200,
    showGrid = true,
    showAxis = true
}: AreaChartProps) {
    return (
        <ResponsiveContainer width="100%" height={height}>
            <RechartsAreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                    <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={color} stopOpacity={0.4} />
                        <stop offset="95%" stopColor={color} stopOpacity={0} />
                    </linearGradient>
                </defs>
                {showGrid && (
                    <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="rgba(71, 85, 105, 0.3)"
                        vertical={false}
                    />
                )}
                {showAxis && (
                    <>
                        <XAxis
                            dataKey="name"
                            stroke="#64748b"
                            fontSize={11}
                            tickLine={false}
                            axisLine={false}
                        />
                        <YAxis
                            stroke="#64748b"
                            fontSize={11}
                            tickLine={false}
                            axisLine={false}
                            tickFormatter={(value) => `${value}`}
                        />
                    </>
                )}
                <Tooltip
                    contentStyle={{
                        backgroundColor: 'rgba(15, 23, 42, 0.95)',
                        border: '1px solid rgba(51, 65, 85, 0.5)',
                        borderRadius: '12px',
                        boxShadow: '0 10px 40px rgba(0, 0, 0, 0.3)',
                        color: '#f1f5f9'
                    }}
                    labelStyle={{ color: '#94a3b8', marginBottom: '4px' }}
                    itemStyle={{ color: color }}
                />
                <Area
                    type="monotone"
                    dataKey={dataKey}
                    stroke={color}
                    strokeWidth={2}
                    fillOpacity={1}
                    fill={`url(#${gradientId})`}
                    animationDuration={1000}
                />
            </RechartsAreaChart>
        </ResponsiveContainer>
    );
}

export default AreaChart;
