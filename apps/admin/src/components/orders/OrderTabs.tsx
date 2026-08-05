'use client';

import type { OrderType } from './types';

interface OrderTabsProps {
    activeType: OrderType;
    orderCount?: number;
    resinCount?: number;
    onTypeChange: (type: OrderType) => void;
}

export function OrderTabs({ activeType, orderCount, resinCount, onTypeChange }: OrderTabsProps) {
    const tabs = [
        { type: 'ORDER' as OrderType, label: 'Đơn Order', count: orderCount },
        { type: 'RESIN' as OrderType, label: 'Đơn Resin', count: resinCount }
    ];

    return (
        <div className="inline-flex items-center gap-1 p-1 bg-gray-100 rounded-xl">
            {tabs.map((tab) => {
                const isActive = activeType === tab.type;

                return (
                    <button
                        key={tab.type}
                        type="button"
                        onClick={() => onTypeChange(tab.type)}
                        className={`
              relative px-5 py-2.5 rounded-lg font-semibold text-sm transition-all duration-200
              ${isActive
                                ? 'bg-white text-[#d6382f] shadow-sm'
                                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                            }
            `}
                    >
                        {tab.label}
                        {tab.count !== undefined && (
                            <span
                                className={`
                  ml-2 px-2 py-0.5 rounded-full text-xs font-bold
                  ${isActive
                                        ? 'bg-red-50 text-[#d6382f]'
                                        : 'bg-gray-200 text-gray-600'
                                    }
                `}
                            >
                                {tab.count}
                            </span>
                        )}
                    </button>
                );
            })}
        </div>
    );
}
