'use client';

import { Database, Zap, HardDrive, Cpu, MemoryStick } from 'lucide-react';
import { useEffect, useState } from 'react';

type HealthMetric = {
    label: string;
    status: 'online' | 'offline' | 'warning';
    value?: string;
    icon: typeof Database;
    color: string;
};

export function SystemHealth() {
    const [metrics, setMetrics] = useState<HealthMetric[]>([
        {
            label: 'Database',
            status: 'online',
            icon: Database,
            color: 'green'
        },
        {
            label: 'Redis',
            status: 'online',
            icon: Zap,
            color: 'green'
        },
        {
            label: 'Storage',
            status: 'online',
            value: '72%',
            icon: HardDrive,
            color: 'yellow'
        },
        {
            label: 'CPU',
            status: 'online',
            value: '32%',
            icon: Cpu,
            color: 'green'
        },
        {
            label: 'RAM',
            status: 'online',
            value: '61%',
            icon: MemoryStick,
            color: 'yellow'
        }
    ]);

    return (
        <div className="dashboard-card system-health-widget">
            <h2 className="card-title">System Health</h2>
            <p className="card-subtitle">Trạng thái hệ thống</p>

            <div className="health-metrics">
                {metrics.map((metric) => {
                    const Icon = metric.icon;
                    return (
                        <div key={metric.label} className="health-metric">
                            <div className="health-metric-header">
                                <div className={`health-icon health-icon-${metric.color}`}>
                                    <Icon size={16} />
                                </div>
                                <span className="health-label">{metric.label}</span>
                            </div>

                            <div className="health-status">
                                <span className={`health-badge badge-${metric.color}`}>
                                    {metric.status === 'online' ? 'Online' : metric.status === 'offline' ? 'Offline' : 'Warning'}
                                </span>
                                {metric.value && (
                                    <>
                                        <span className="health-value">{metric.value}</span>
                                        <div className="health-progress">
                                            <div
                                                className={`health-progress-fill progress-${metric.color}`}
                                                style={{ width: metric.value }}
                                            />
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
