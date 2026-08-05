'use client';

import { RESIN_TIMELINE_STAGES } from './constants';
import type { ResinTimelineItem } from './types';

interface ResinTimelineProps {
    timeline: ResinTimelineItem[];
    currentStatus: string;
}

export function ResinTimeline({ timeline, currentStatus }: ResinTimelineProps) {
    function getStageStatus(stageKey: string): 'completed' | 'current' | 'pending' {
        const timelineItem = timeline.find((item) => item.stage === stageKey);

        if (timelineItem?.status === 'COMPLETED') return 'completed';
        if (timelineItem?.status === 'IN_PROGRESS' || currentStatus === stageKey) return 'current';
        return 'pending';
    }

    return (
        <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl p-6 border border-indigo-100">
            <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
                ⏱️ Timeline sản xuất Resin
            </h3>

            <div className="relative">
                {/* Timeline Line */}
                <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gray-200" />

                <div className="space-y-4">
                    {RESIN_TIMELINE_STAGES.map((stage, index) => {
                        const status = getStageStatus(stage.key);
                        const timelineItem = timeline.find((item) => item.stage === stage.key);

                        return (
                            <div key={stage.key} className="relative flex items-start gap-4">
                                {/* Icon/Status Indicator */}
                                <div
                                    className={`
                    relative z-10 w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold transition-all
                    ${status === 'completed'
                                            ? 'bg-green-500 text-white shadow-lg'
                                            : status === 'current'
                                                ? 'bg-[#d6382f] text-white shadow-lg ring-4 ring-red-100 animate-pulse'
                                                : 'bg-white border-2 border-gray-300 text-gray-400'
                                        }
                  `}
                                >
                                    {status === 'completed' ? '✓' : stage.icon}
                                </div>

                                {/* Content */}
                                <div className="flex-1 pt-2">
                                    <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
                                        <div className="flex items-start justify-between gap-3">
                                            <div>
                                                <p
                                                    className={`font-bold ${status === 'current' ? 'text-[#d6382f]' : 'text-gray-900'
                                                        }`}
                                                >
                                                    {stage.label}
                                                </p>
                                                {timelineItem?.startDate && (
                                                    <p className="text-xs text-gray-500 mt-1">
                                                        Bắt đầu: {new Date(timelineItem.startDate).toLocaleDateString('vi-VN')}
                                                    </p>
                                                )}
                                                {timelineItem?.completedDate && (
                                                    <p className="text-xs text-green-600 mt-1 font-semibold">
                                                        Hoàn thành: {new Date(timelineItem.completedDate).toLocaleDateString('vi-VN')}
                                                    </p>
                                                )}
                                            </div>

                                            {status === 'completed' && (
                                                <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-bold rounded-full">
                                                    ✓ Xong
                                                </span>
                                            )}
                                            {status === 'current' && (
                                                <span className="px-2 py-1 bg-red-100 text-[#d6382f] text-xs font-bold rounded-full">
                                                    ● Đang thực hiện
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
