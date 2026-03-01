import * as React from 'react';
import { Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { cn } from '../../lib/utils';

// shadcn/ui-inspired ChartContainer – wraps ResponsiveContainer + injects CSS variables for each key in chartConfig
export function ChartContainer({ config = {}, className, children, ...props }) {
    const style = Object.entries(config).reduce((acc, [key, value]) => {
        if (value?.color) acc[`--color-${key}`] = value.color;
        return acc;
    }, {});

    return (
        <div className={cn('relative w-full', className)} style={style} {...props}>
            <ResponsiveContainer width="100%" height="100%">
                {children}
            </ResponsiveContainer>
        </div>
    );
}

// A nicely styled tooltip content that matches shadcn style
export function ChartTooltipContent({ active, payload, label, formatter, labelFormatter, hideLabel, indicator = 'dot' }) {
    if (!active || !payload?.length) return null;

    return (
        <div className="rounded-xl border border-[var(--border)] bg-white dark:bg-slate-900 px-3 py-2 shadow-xl text-xs min-w-[120px]">
            {!hideLabel && (
                <div className="mb-1.5 font-semibold text-gray-700 dark:text-gray-200 text-[11px] uppercase tracking-wide">
                    {labelFormatter ? labelFormatter(label, payload) : label}
                </div>
            )}
            <div className="flex flex-col gap-1">
                {payload.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-1.5">
                            {indicator === 'dot' ? (
                                <span className="h-2 w-2 rounded-full flex-shrink-0" style={{ background: item.color || item.fill }} />
                            ) : indicator === 'line' ? (
                                <span className="h-0.5 w-3 flex-shrink-0 rounded-full" style={{ background: item.color || item.fill }} />
                            ) : (
                                <span className="h-2.5 w-1.5 rounded-sm flex-shrink-0" style={{ background: item.color || item.fill }} />
                            )}
                            <span className="text-gray-500 dark:text-gray-400">{item.name}</span>
                        </div>
                        <span className="font-semibold text-gray-900 dark:text-white tabular-nums">
                            {formatter ? formatter(item.value, item.name, item) : item.value}
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
}

// A styled legend content
export function ChartLegendContent({ payload }) {
    if (!payload?.length) return null;
    return (
        <div className="flex items-center justify-center gap-4 pt-2 flex-wrap">
            {payload.map((item, idx) => (
                <div key={idx} className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                    <span className="h-2 w-2 rounded-full flex-shrink-0" style={{ background: item.color }} />
                    {item.value}
                </div>
            ))}
        </div>
    );
}

export { Tooltip as ChartTooltip, Legend as ChartLegend };
