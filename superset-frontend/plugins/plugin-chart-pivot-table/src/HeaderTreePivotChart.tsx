import React, { useCallback, useMemo } from 'react';
import { MinusSquareOutlined, PlusSquareOutlined } from '@ant-design/icons';
import {
    BinaryQueryObjectFilterClause,
    CurrencyFormatter,
    DataRecordValue,
    FeatureFlag,
    getColumnLabel,
    getNumberFormatter,
    isAdhocColumn,
    isPhysicalColumn,
    NumberFormatter,
    styled,
    t,
    useTheme,
    isFeatureEnabled,
} from '@superset-ui/core';
import { aggregatorTemplates, PivotTable, sortAs } from './react-pivottable';
import {
    FilterType,
    MetricsLayoutEnum,
    PivotTableProps,
    PivotTableStylesProps,
    SelectedFiltersType,
} from './types';

const vals = ['value'];

const Styles = styled.div<PivotTableStylesProps>`
  ${({ height, width, margin }) => `
      margin: ${margin}px;
      height: ${height - margin * 2}px;
      width: ${typeof width === 'string' ? parseInt(width, 10) : width - margin * 2}px;
  `}
`;

const PivotTableWrapper = styled.div`
  height: 100%;
  max-width: inherit;
  overflow: auto;
`;

const StyledPlusSquareOutlined = styled(PlusSquareOutlined)`
  stroke: ${({ theme }) => theme.colors.grayscale.light2};
  stroke-width: 16px;
`;

const StyledMinusSquareOutlined = styled(MinusSquareOutlined)`
  stroke: ${({ theme }) => theme.colors.grayscale.light2};
  stroke-width: 16px;
`;

const aggregatorsFactory = (formatter: NumberFormatter) => ({
    Count: aggregatorTemplates.count(formatter),
    'Count Unique Values': aggregatorTemplates.countUnique(formatter),
    'List Unique Values': aggregatorTemplates.listUnique(', ', formatter),
    Sum: aggregatorTemplates.sum(formatter),
    Average: aggregatorTemplates.average(formatter),
    Median: aggregatorTemplates.median(formatter),
    'Sample Variance': aggregatorTemplates.var(1, formatter),
    'Sample Standard Deviation': aggregatorTemplates.stdev(1, formatter),
    Minimum: aggregatorTemplates.min(formatter),
    Maximum: aggregatorTemplates.max(formatter),
    First: aggregatorTemplates.first(formatter),
    Last: aggregatorTemplates.last(formatter),
    'Sum as Fraction of Total': aggregatorTemplates.fractionOf(
        aggregatorTemplates.sum(),
        'total',
        formatter,
    ),
    'Sum as Fraction of Rows': aggregatorTemplates.fractionOf(
        aggregatorTemplates.sum(),
        'row',
        formatter,
    ),
    'Sum as Fraction of Columns': aggregatorTemplates.fractionOf(
        aggregatorTemplates.sum(),
        'col',
        formatter,
    ),
    'Count as Fraction of Total': aggregatorTemplates.fractionOf(
        aggregatorTemplates.count(),
        'total',
        formatter,
    ),
    'Count as Fraction of Rows': aggregatorTemplates.fractionOf(
        aggregatorTemplates.count(),
        'row',
        formatter,
    ),
    'Count as Fraction of Columns': aggregatorTemplates.fractionOf(
        aggregatorTemplates.count(),
        'col',
        formatter,
    ),
});

function swapByPairs<T>(arr: T[], swaps: [number, number][], groups?: { [groupKey: string]: number[] }): T[] {
    const a = arr.slice();
    
    if (groups) {
        const validation = validateSwapsWithinGroups(swaps, groups);
        if (!validation.valid) {
            console.warn('Invalid swaps detected:', validation.errors);
            validation.errors.forEach(error => console.warn(error));
            return a;
        }
    }
    
    for (const [from, to] of swaps) {
        if (
            Number.isInteger(from) && Number.isInteger(to) &&
            from >= 0 && to >= 0 && from < a.length && to < a.length
        ) {
            const tmp = a[from];
            a[from] = a[to];
            a[to] = tmp;
        }
    }
    return a;
}

function parseSwaps(input: unknown): [number, number][] {
    try {
        if (!input) return [];
        if (typeof input === 'string') return JSON.parse(input);
        if (Array.isArray(input)) return input as [number, number][];
        return [];
    } catch {
        return [];
    }
}

function parseRelocateRules(input: unknown): { when: Record<string, any>; set: Record<string, any> }[] {
    try {
        if (!input) return [];
        if (typeof input === 'string') return JSON.parse(input);
        if (Array.isArray(input)) return input as any[];
        return [];
    } catch {
        return [];
    }
}

function parseExcludeRules(input: unknown): any[] {
    try {
        if (!input) return [];
        if (typeof input === 'string') return JSON.parse(input);
        if (Array.isArray(input)) return input as any[];
        return [];
    } catch {
        return [];
    }
}


function parsePlatformMapping(input: unknown): Array<{ 
  from: { 
    level1?: string; 
    level2?: string; 
    level3?: string; 
    platform?: string; 
    metric?: string; 
    conditions?: Record<string, any> 
  }; 
  to: { 
    level1?: string; 
    level2?: string; 
    level3?: string; 
  } 
}> {
    try {
        if (!input) return [];
        if (typeof input === 'string') return JSON.parse(input);
        if (Array.isArray(input)) return input as any;
        return [];
    } catch {
        return [];
    }
}

function parseGroupedSwaps(input: unknown): Record<string, [number, number][]> {
    try {
        if (!input) return {};
        if (typeof input === 'string') return JSON.parse(input);
        if (typeof input === 'object' && input !== null) return input as any;
        return {};
    } catch {
        return {};
    }
}

function convertGroupedSwapsToGlobalSwaps(
    groupedSwaps: Record<string, [number, number][]>,
    groups: { [groupKey: string]: number[] }
): [number, number][] {
    const globalSwaps: [number, number][] = [];
    
    Object.entries(groupedSwaps).forEach(([groupName, swaps]) => {
        // Find matching group by level1 name
        const matchingGroupKey = Object.keys(groups).find(key => key.startsWith(groupName));
        if (matchingGroupKey) {
            const groupIndices = groups[matchingGroupKey];
            
            swaps.forEach(([localFrom, localTo]) => {
                // Convert local indices within group to global indices
                const globalFrom = groupIndices[localFrom];
                const globalTo = groupIndices[localTo];
                
                if (globalFrom !== undefined && globalTo !== undefined) {
                    globalSwaps.push([globalFrom, globalTo]);
                }
            });
        }
    });
    
    return globalSwaps;
}

function groupMetricsByParent(slots: { level1: string; level2: string; level3: string; level4: string; metric: string }[], showSegments: boolean): { [groupKey: string]: number[] } {
    const groups: { [groupKey: string]: number[] } = {};
    
    slots.forEach((slot, index) => {
        let groupKey: string;
        
        // Build key from most specific to least specific level
        if (showSegments && slot.level4) {
            groupKey = `${slot.level1}|${slot.level2}|${slot.level3}|${slot.level4}`;
        } else if (showSegments && slot.level3) {
            groupKey = `${slot.level1}|${slot.level2}|${slot.level3}`;
        } else if (slot.level2) {
            groupKey = `${slot.level1}|${slot.level2}`;
        } else {
            groupKey = slot.level1;
        }
        
        if (!groups[groupKey]) {
            groups[groupKey] = [];
        }
        groups[groupKey].push(index);
    });
    
    return groups;
}

function validateSwapsWithinGroups(swaps: [number, number][], groups: { [groupKey: string]: number[] }): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    for (const [from, to] of swaps) {
        let fromGroup = '';
        let toGroup = '';
        
        for (const [groupKey, indices] of Object.entries(groups)) {
            if (indices.includes(from)) fromGroup = groupKey;
            if (indices.includes(to)) toGroup = groupKey;
        }
        
        if (fromGroup !== toGroup) {
            errors.push(`Cannot move metric from group "${fromGroup}" to group "${toGroup}". Swaps only allowed within the same group.`);
        }
    }
    
    return {
        valid: errors.length === 0,
        errors
    };
}

function logPivotBuild(tag: string, payload: Record<string, unknown>) {
    console.group(`%cPivot build ▶ ${tag}`, 'color:#7f54b3;font-weight:bold');
    Object.entries(payload).forEach(([k, v]) => {
        console.log(`%c${k}:`, 'color:#999', v);
    });
    console.groupEnd();
}

export default function HeaderTreePivotChart(props: PivotTableProps) {
    const {
        data,
        height,
        width,
        groupbyRows: groupbyRowsRaw,
        groupbyColumns: groupbyColumnsRaw,
        metrics,
        rowOrder,
        aggregateFunction,
        transposePivot,
        rowSubtotalPosition,
        colSubtotalPosition,
        colTotals,
        colSubTotals,
        rowTotals,
        rowSubTotals,
        valueFormat,
        currencyFormat,
        emitCrossFilters,
        setDataMask,
        selectedFilters,
        verboseMap,
        columnFormats,
        currencyFormats,
        metricsLayout,
        metricColorFormatters,
        dateFormatters,
        onContextMenu,
        headerTree,
        formData,
        dragAndDropConfig,
        onColumnOrderChange
    } = props as any;

    const METRIC_KEY = t('Metric');
    const norm = (x: any) => String(x ?? '').replace(/[^A-Za-zА-Яа-я0-9]+/g, '').toLowerCase();
    const resolveMetricKey = (wanted: string, rec: Record<string, any>) => {
        if (!wanted) return wanted;
        const target = norm(wanted);
        const found = Object.keys(rec).find(k => norm(k) === target);
        return found ?? wanted;
    };
    const theme = useTheme();

    const columnsIndexSwapsRaw = (props as any).columnsIndexSwaps ?? formData?.columnsIndexSwaps;
    const relocateRulesRaw = (props as any).relocateRules ?? formData?.relocateRules;
    const excludeColumnsRulesRaw = (props as any).excludeColumnsRules ?? formData?.excludeColumnsRules;
    const platformMappingRaw = (props as any).platformMapping ?? formData?.platformMapping;
    const groupedSwapsRaw = (props as any).groupedSwaps ?? formData?.groupedSwaps;

    console.groupCollapsed('HeaderTreePivotChart ▶ inputs');
    console.log('formData', formData);
    console.log('columnsIndexSwapsRaw', columnsIndexSwapsRaw);
    console.log('relocateRulesRaw', relocateRulesRaw);
    console.log('excludeColumnsRulesRaw', excludeColumnsRulesRaw);
    console.log('platformMappingRaw', platformMappingRaw);
    console.log('groupedSwapsRaw', groupedSwapsRaw);
    console.groupEnd();

    const swaps = useMemo(() => parseSwaps(columnsIndexSwapsRaw), [columnsIndexSwapsRaw]);
    const relocateRules = useMemo(() => parseRelocateRules(relocateRulesRaw), [relocateRulesRaw]);
    const excludeRules = useMemo(() => parseExcludeRules(excludeColumnsRulesRaw), [excludeColumnsRulesRaw]);
    const platformMapping = useMemo(() => parsePlatformMapping(platformMappingRaw), [platformMappingRaw]);
    const groupedSwaps = useMemo(() => parseGroupedSwaps(groupedSwapsRaw), [groupedSwapsRaw]);

    console.groupCollapsed('HeaderTreePivotChart ▶ parsed');
    console.log('swaps', swaps);
    console.log('relocateRules', relocateRules);
    console.log('excludeRules', excludeRules);
    console.log('platformMapping', platformMapping);
    console.log('groupedSwaps', groupedSwaps);
    console.groupEnd();

    const defaultFormatter = useMemo(
        () =>
            currencyFormat?.symbol
                ? new CurrencyFormatter({ currency: currencyFormat, d3Format: valueFormat })
                : getNumberFormatter(valueFormat),
        [valueFormat, currencyFormat],
    );

    const customFormatsArray = useMemo(
        () =>
            Array.from(
                new Set([
                    ...Object.keys(columnFormats || {}),
                    ...Object.keys(currencyFormats || {}),
                ]),
            ).map(metricName => [
                metricName,
                columnFormats?.[metricName] || valueFormat,
                currencyFormats?.[metricName] || currencyFormat,
            ]),
        [columnFormats, currencyFormat, currencyFormats, valueFormat],
    );

    const metricFormatterMap = useMemo(
        () =>
            Object.fromEntries(
                customFormatsArray.map(([metric, d3Format, currency]) => [
                    metric,
                    currency ? new CurrencyFormatter({ currency, d3Format }) : getNumberFormatter(d3Format as string),
                ]),
            ),
        [customFormatsArray],
    );

    const metricLabels: string[] = useMemo(
        () => metrics.map((m: any) => (typeof m === 'string' ? m : (m.label as string))),
        [metrics],
    );

    const tree = useMemo(() => {
        if (!headerTree) return { groups: [] as any[] };
        if (typeof headerTree === 'string') {
            try { return JSON.parse(headerTree); } catch { return { groups: [] as any[] }; }
        }
        return headerTree;
    }, [headerTree]);

    const showSegments: boolean = useMemo(() => {
        const st = (tree as any)?.showSegments;
        const hide = (tree as any)?.hideSegments;
        if (typeof st === 'boolean') return st && !hide;
        if (typeof hide === 'boolean') return !hide;
        return true;
    }, [tree]);

    type Slot = { level1: string; level2: string; level3: string; level4: string; metric: string };

    const slots: Slot[] = useMemo(() => {
        const res: Slot[] = [];
        let p = 0;
        const groups = Array.isArray((tree as any)?.groups) ? (tree as any).groups : [];
        
        groups.forEach((g: any) => {
            const l1 = g?.title ?? '—';
            const subgroups = Array.isArray(g?.subgroups) ? g.subgroups : [];

            if (!subgroups.length) {
                // Direct segments under group (no subgroups)
                const segs = Array.isArray(g?.segments) ? g.segments : [];
                if (segs.length) {
                    if (showSegments) {
                        segs.forEach((seg: any) => {
                            const l3 = seg?.title ?? '';
                            const subsegments = Array.isArray(seg?.subsegments) ? seg.subsegments : [];
                            
                            if (subsegments.length) {
                                // 4-level: group → segment → subsegment → metric
                                subsegments.forEach((subseg: any) => {
                                    const l4 = subseg?.title ?? '';
                                    const cnt = Math.max(1, Number(subseg?.count ?? 1));
                                    for (let i = 0; i < cnt && p < metricLabels.length; i += 1, p += 1) {
                                        res.push({ level1: l1, level2: '', level3: l3, level4: l4, metric: metricLabels[p] });
                                    }
                                });
                            } else {
                                // 3-level: group → segment → metric
                                const cnt = Math.max(1, Number(seg?.count ?? 1));
                                for (let i = 0; i < cnt && p < metricLabels.length; i += 1, p += 1) {
                                    res.push({ level1: l1, level2: '', level3: l3, level4: '', metric: metricLabels[p] });
                                }
                            }
                        });
                    } else {
                        const total = segs.reduce((acc: number, s: any) => {
                            const subsegments = Array.isArray(s?.subsegments) ? s.subsegments : [];
                            if (subsegments.length) {
                                return acc + subsegments.reduce((subAcc: number, sub: any) => subAcc + Math.max(1, Number(sub?.count ?? 1)), 0);
                            }
                            return acc + Math.max(1, Number(s?.count ?? 1));
                        }, 0);
                        for (let i = 0; i < total && p < metricLabels.length; i += 1, p += 1) {
                            res.push({ level1: l1, level2: '', level3: '', level4: '', metric: metricLabels[p] });
                        }
                    }
                }
            }

            subgroups.forEach((sg: any) => {
                const l2 = sg?.title ?? '';
                const segs = Array.isArray(sg?.segments) ? sg.segments : [];
                
                if (segs.length) {
                    if (showSegments) {
                        segs.forEach((seg: any) => {
                            const l3 = seg?.title ?? '';
                            const subsegments = Array.isArray(seg?.subsegments) ? seg.subsegments : [];
                            
                            if (subsegments.length) {
                                // 4-level: group → subgroup → segment → subsegment → metric
                                subsegments.forEach((subseg: any) => {
                                    const l4 = subseg?.title ?? '';
                                    const cnt = Math.max(1, Number(subseg?.count ?? 1));
                                    for (let i = 0; i < cnt && p < metricLabels.length; i += 1, p += 1) {
                                        res.push({ level1: l1, level2: l2, level3: l3, level4: l4, metric: metricLabels[p] });
                                    }
                                });
                            } else {
                                // 3-level: group → subgroup → segment → metric
                                const cnt = Math.max(1, Number(seg?.count ?? 1));
                                for (let i = 0; i < cnt && p < metricLabels.length; i += 1, p += 1) {
                                    res.push({ level1: l1, level2: l2, level3: l3, level4: '', metric: metricLabels[p] });
                                }
                            }
                        });
                    } else {
                        const total = segs.reduce((acc: number, s: any) => {
                            const subsegments = Array.isArray(s?.subsegments) ? s.subsegments : [];
                            if (subsegments.length) {
                                return acc + subsegments.reduce((subAcc: number, sub: any) => subAcc + Math.max(1, Number(sub?.count ?? 1)), 0);
                            }
                            return acc + Math.max(1, Number(s?.count ?? 1));
                        }, 0);
                        for (let i = 0; i < total && p < metricLabels.length; i += 1, p += 1) {
                            res.push({ level1: l1, level2: l2, level3: '', level4: '', metric: metricLabels[p] });
                        }
                    }
                } else if (sg?.count !== undefined) {
                    // Direct count in subgroup
                    const cnt = Math.max(1, Number(sg.count ?? 1));
                    for (let i = 0; i < cnt && p < metricLabels.length; i += 1, p += 1) {
                        res.push({ level1: l1, level2: l2, level3: '', level4: '', metric: metricLabels[p] });
                    }
                }
            });
        });
        
        // Add remaining metrics as orphans
        if (p < metricLabels.length) {
            for (; p < metricLabels.length; p += 1) {
                const m = metricLabels[p];
                res.push({ level1: m, level2: '', level3: '', level4: '', metric: m });
            }
        }
        
        return res;
    }, [tree, metricLabels, showSegments]);

    // порядок m2 из header JSON в исходной последовательности
    const m2HeaderOrder = useMemo(() => {
        const order: string[] = [];
        const push = (v?: string) => {
            const t = String(v ?? '');
            if (t && !order.includes(t)) order.push(t);
        };

        const groups = Array.isArray((tree as any)?.groups) ? (tree as any).groups : [];
        groups.forEach((g: any) => {
            const subgroups = Array.isArray(g?.subgroups) ? g.subgroups : [];
            if (!subgroups.length) {
                const segs = Array.isArray(g?.segments) ? g.segments : [];
                segs.forEach((s: any) => push(s?.title));
            } else {
                subgroups.forEach((sg: any) => {
                    const segs = Array.isArray(sg?.segments) ? sg.segments : [];
                    segs.forEach((s: any) => push(s?.title));
                });
            }
        });

        return order;
    }, [tree]);


    const metricGroups = useMemo(() => {
        const groups = groupMetricsByParent(slots, showSegments);
        console.group('%cColumn Groups Info', 'color:#2eb85c;font-weight:bold');
        Object.entries(groups).forEach(([groupKey, indices]) => {
            const groupMetrics = indices.map(i => slots[i]?.metric).filter(Boolean);
            console.log(`%c${groupKey}:`, 'color:#1890ff', `indices=[${indices.join(',')}]`, `metrics=[${groupMetrics.join(', ')}]`);
        });
        console.groupEnd();
        return groups;
    }, [slots, showSegments]);
    
    // Combine regular swaps with grouped swaps
    const finalSwaps = useMemo(() => {
        const groupedToGlobalSwaps = convertGroupedSwapsToGlobalSwaps(groupedSwaps, metricGroups);
        const combinedSwaps = [...swaps, ...groupedToGlobalSwaps];
        
        console.group('%cSwaps Combination', 'color:#fa8c16;font-weight:bold');
        console.log('Regular swaps:', swaps);
        console.log('Grouped swaps:', groupedSwaps);
        console.log('Converted to global:', groupedToGlobalSwaps);
        console.log('Final combined swaps:', combinedSwaps);
        console.groupEnd();
        
        return combinedSwaps;
    }, [swaps, groupedSwaps, metricGroups]);
    
    const slotsReordered = useMemo(() => swapByPairs(slots, finalSwaps, metricGroups), [slots, finalSwaps, metricGroups]);

    const groupbyRows = useMemo(() => groupbyRowsRaw.map(getColumnLabel), [groupbyRowsRaw]);
    const groupbyColumns = useMemo(() => groupbyColumnsRaw.map(getColumnLabel), [groupbyColumnsRaw]);

    const LEVEL_KEYS: string[] = useMemo(() => {
        // Check if any slot has level4 to determine if we need __m3
        const hasLevel4 = slots.some(slot => slot.level4);
        
        if (showSegments) {
            return hasLevel4 ? ['__m0', '__m1', '__m2', '__m3', METRIC_KEY] : ['__m0', '__m1', '__m2', METRIC_KEY];
        } else {
            return ['__m0', '__m1', METRIC_KEY];
        }
    }, [showSegments, slots]);

    function applyRelocate(tuple: Record<string, any>, gb: Record<string, any>, ctx: { lbl: string; rec: any }) {
        const keyAlias = (k: string) => (String(k).toLowerCase() === 'metric' ? METRIC_KEY : k);
        
        // Apply platformMapping using new "from → to" format
        if (Array.isArray(platformMapping) && platformMapping.length > 0) {
            for (const rule of platformMapping) {
                if (!rule.from || !rule.to) continue;
                
                let matched = false;
                
                // Check if current column matches "from" criteria
                const currentLevels = {
                    level1: tuple.__m0,
                    level2: tuple.__m1,
                    level3: tuple.__m2
                };
                
                // Check level matching
                const levelsMatch = Object.entries(rule.from).every(([key, value]) => {
                    if (!value) return true; // undefined/null means "any"
                    
                    switch (key) {
                        case 'level1':
                        case 'level2':
                        case 'level3':
                            return norm(currentLevels[key as keyof typeof currentLevels]) === norm(value);
                        case 'metric':
                            return norm(ctx.lbl) === norm(value);
                        case 'platform':
                            // Check if any groupby column matches the platform value
                            return groupbyColumns.some(col => norm(gb[col]) === norm(value));
                        default:
                            return true;
                    }
                });
                
                // Check additional conditions if specified
                let conditionsMatch = true;
                if (rule.from.conditions) {
                    conditionsMatch = Object.entries(rule.from.conditions).every(([condKey, condValue]) => {
                        if (condKey === 'metric') {
                            return norm(ctx.lbl) === norm(condValue);
                        }
                        // Check if condition key exists in groupby columns
                        const gbValue = gb[condKey];
                        return gbValue && norm(gbValue) === norm(condValue);
                    });
                }
                
                matched = levelsMatch && conditionsMatch;
                
                if (matched) {
                    console.groupCollapsed('platform mapping applied (from → to format)');
                    console.log('mapping rule', rule);
                    console.log('current state', { 
                        levels: currentLevels,
                        metric: ctx.lbl, 
                        groupby: { ...gb } 
                    });
                    console.log('before mapping', { tuple: { ...tuple } });
                    
                    // Apply "to" mapping (level1-3 only, level4 are metrics)
                    if (rule.to.level1) tuple.__m0 = rule.to.level1;
                    if (rule.to.level2) tuple.__m1 = rule.to.level2;
                    if (rule.to.level3) tuple.__m2 = rule.to.level3;
                    
                    console.log('after mapping', { tuple: { ...tuple } });
                    console.groupEnd();
                    break; // Apply only first matching rule
                }
            }
        }
        
        // Apply relocateRules (advanced approach)
        for (const raw of relocateRules) {
            const r = {
                when: Object.fromEntries(Object.entries(raw.when || {}).map(([k, v]) => [keyAlias(k), v])),
                set: Object.fromEntries(Object.entries(raw.set || {}).map(([k, v]) => [keyAlias(k), v])),
            };
            const ok = Object.entries(r.when).every(([k, v]) => {
                const source = k in gb ? gb : tuple;
                return norm(source[k]) === norm(v);
            });
            if (ok) {
                console.groupCollapsed('relocate rule match');
                console.log('rule', r);
                console.log('before', { tuple: { ...tuple }, gb: { ...gb }, metricLbl: ctx.lbl });
                Object.entries(r.set).forEach(([k, v]) => { if (k in gb) gb[k] = v; else tuple[k] = v; });
                console.log('after', { tuple: { ...tuple }, gb: { ...gb } });
                console.groupEnd();
            }
        }
    }

    const unpivotedData = useMemo(
        () =>
            data
                .flatMap((rec: any) =>
                    metricLabels.map(lbl => {
                        const slot =
                            slotsReordered.find(s => s.metric === lbl) ||
                            ({ level1: '—', level2: '', level3: '', level4: '' } as Slot);
                        const isOrphan = slot.level1 === lbl && slot.level2 === '' && slot.level3 === '' && slot.level4 === '';
                        const metricKeyValue = isOrphan ? '' : lbl;

                        const tuple: Record<string, any> = { __m0: slot.level1, __m1: slot.level2, __m2: slot.level3, __m3: slot.level4, [METRIC_KEY]: metricKeyValue };
                        const gb: Record<string, any> = Object.fromEntries(groupbyColumns.map(k => [k, (rec as any)[k]]));

                        applyRelocate(tuple, gb, { lbl, rec });

                        const keyAlias = (k: string) => (String(k).toLowerCase() === 'metric' ? METRIC_KEY : k);
                        const simpleList = Array.isArray(excludeRules) && excludeRules.every(r => typeof r === 'string');
                        let excluded = false;
                        if (simpleList) {
                            const setLC = new Set((excludeRules as string[]).map(v => norm(v)));
                            for (const k of groupbyColumns) {
                                if (setLC.has(norm(gb[k]))) { excluded = true; break; }
                            }
                        } else if (Array.isArray(excludeRules)) {
                            for (const r of excludeRules) {
                                if (r && typeof r === 'object') {
                                    const key = keyAlias(r.key || r.column || r.path);
                                    const vals: any[] = r.values || r.vals || [];
                                    const source = key in gb ? gb : tuple;
                                    if (vals.map((v: any) => norm(v)).includes(norm(source[key]))) { excluded = true; break; }
                                }
                            }
                        }
                        if (excluded) {
                            console.log('excluded', { tuple, gb, lbl });
                            return null as any;
                        }

                        const metricForValue = resolveMetricKey(tuple[METRIC_KEY] || lbl, rec);

                        const row = {
                            ...rec,
                            value: (rec as any)[metricForValue],
                            __m0: tuple.__m0,
                            __m1: tuple.__m1,
                            __m2: tuple.__m2,
                            __m3: tuple.__m3,
                            [METRIC_KEY]: tuple[METRIC_KEY],
                            __orphan_header__: isOrphan ? 1 : 0,
                            ...gb,
                        } as any;

                        console.log('row built', row);
                        return row;
                    }),
                )
                .filter((r: any) => r && r.value !== null && r.value !== undefined),
        [data, metricLabels, slotsReordered, groupbyColumns, relocateRules, excludeRules, platformMapping],
    );

    useMemo(() => {
        const sample = unpivotedData.slice(0, 10);
        const orders = {
            m0: Array.from(new Set(unpivotedData.map((r: any) => r.__m0))),
            m1: Array.from(new Set(unpivotedData.map((r: any) => r.__m1))),
            m2: Array.from(new Set(unpivotedData.map((r: any) => r.__m2))),
            metric: Array.from(new Set(unpivotedData.map((r: any) => r[METRIC_KEY]))),
        };
        logPivotBuild('unpivot summary', { count: unpivotedData.length, orders, sample });
    }, [unpivotedData]);

    const [rows, cols] = useMemo(() => {
        let rows_ = transposePivot ? groupbyColumns : groupbyRows;
        let cols_ = transposePivot ? groupbyRows : groupbyColumns;
        if (metricsLayout === MetricsLayoutEnum.ROWS) {
            rows_ = [...rows_, ...LEVEL_KEYS, ...cols_];
            cols_ = [];
        } else {
            cols_ = [...LEVEL_KEYS, ...cols_];
        }
        return [rows_, cols_];
    }, [groupbyColumns, groupbyRows, metricsLayout, transposePivot, LEVEL_KEYS]);

    const lvl0Order = useMemo(() => Array.from(new Set(unpivotedData.map((r: any) => r.__m0))), [unpivotedData]);
    const lvl1Order = useMemo(() => Array.from(new Set(unpivotedData.map((r: any) => r.__m1))), [unpivotedData]);
    const lvl2Order = useMemo(() => Array.from(new Set(unpivotedData.map((r: any) => r.__m2))), [unpivotedData]);
    const metricLeafOrder = useMemo(() => Array.from(new Set(unpivotedData.map((r: any) => r[METRIC_KEY]))), [unpivotedData]);

    const perAttrOrder = useMemo(() => {
        const map: Record<string, (string | number | boolean)[]> = {};
        const seen: Record<string, Set<string>> = {} as any;
        const attrKeys = cols || [];
        unpivotedData.forEach((row: any) => {
            attrKeys.forEach(k => {
                const v = row[k];
                const s = (seen[k] ||= new Set<string>());
                const key = String(v);
                if (!s.has(key)) {
                    s.add(key);
                    (map[k] ||= []).push(v);
                }
            });
        });
        return map;
    }, [unpivotedData, cols]);

    const sorters = useMemo(() => {
        const base: Record<string, any> = {
            __m0: sortAs(lvl0Order),
            __m1: sortAs(lvl1Order),
            [METRIC_KEY]: sortAs(metricLeafOrder),
        };

        // вместо порядка из данных — жёстко по JSON Header
        if (showSegments) base.__m2 = sortAs(m2HeaderOrder);
        
        // ВАЖНО: Сохраняем исходный порядок уровней из Header JSON, даже после Platform Mapping
        // Порядок должен оставаться таким, как определен в структуре заголовков

        (cols || []).forEach(k => {
            // не трогаем фиксированные уровни и Metric — их порядок задаём вручную
            if (k === '__m0' || k === '__m1' || k === '__m2' || k === METRIC_KEY) return;
            const order = (perAttrOrder as any)[k];
            if (order && order.length) base[k] = sortAs(order);
        });

        logPivotBuild('sorters', { lvl0Order, lvl1Order, m2HeaderOrder, metricLeafOrder, perAttrOrder });
        return base;
    }, [lvl0Order, lvl1Order, m2HeaderOrder, metricLeafOrder, showSegments, perAttrOrder, cols]);


    const namesMapping = useMemo(
        () => ({ ...(verboseMap || {}), __m0: ' ', __m1: ' ', ...(showSegments ? { __m2: ' ' } : {}), [METRIC_KEY]: ' ' }),
        [verboseMap, showSegments],
    );

    const handleChange = useCallback(
        (filters: SelectedFiltersType) => {
            const filterKeys = Object.keys(filters);
            const groupby = [...groupbyRowsRaw, ...groupbyColumnsRaw];
            setDataMask({
                extraFormData: {
                    filters:
                        filterKeys.length === 0
                            ? undefined
                            : (filterKeys
                                .map(key => {
                                    if (key === '__m0' || key === '__m1' || key === '__m2' || key === METRIC_KEY) return null as any;
                                    const val = (filters as any)?.[key];
                                    const col =
                                        groupby.find(item => {
                                            if (isPhysicalColumn(item)) return item === key;
                                            if (isAdhocColumn(item)) return (item as any).label === key;
                                            return false;
                                        }) ?? '';
                                    if (val === null || val === undefined) return { col, op: 'IS NULL' as const };
                                    return { col, op: 'IN' as const, val: val as (string | number | boolean)[] };
                                })
                                .filter(Boolean as any) as any),
                },
                filterState: {
                    value: filters && Object.keys(filters).length ? Object.values(filters) : null,
                    selectedFilters: filters && Object.keys(filters).length ? filters : null,
                },
            });
        },
        [groupbyColumnsRaw, groupbyRowsRaw, setDataMask],
    );

    const getCrossFilterDataMask = useCallback(
        (value: { [key: string]: string }) => {
            const isActive = (key: string, val: DataRecordValue) => !!selectedFilters && selectedFilters[key]?.includes(val);
            if (!value) return undefined;
            const [key, val] = Object.entries(value)[0];
            if (key === '__m0' || key === '__m1' || key === '__m2' || key === METRIC_KEY) return undefined;

            let values = { ...selectedFilters } as SelectedFiltersType;
            if (isActive(key, val)) values = {} as any; else values = { [key]: [val] } as any;

            const filterKeys = Object.keys(values || {});
            const groupby = [...groupbyRowsRaw, ...groupbyColumnsRaw];
            return {
                dataMask: {
                    extraFormData: {
                        filters:
                            filterKeys.length === 0
                                ? undefined
                                : filterKeys.map(k => {
                                    const v = (values as any)?.[k];
                                    const col =
                                        groupby.find(item => {
                                            if (isPhysicalColumn(item)) return item === k;
                                            if (isAdhocColumn(item)) return (item as any).label === k;
                                            return false;
                                        }) ?? '';
                                    if (v === null || v === undefined) return { col, op: 'IS NULL' as const };
                                    return { col, op: 'IN' as const, val: v as (string | number | boolean)[] };
                                }),
                    },
                    filterState: {
                        value: values && Object.keys(values).length ? Object.values(values) : null,
                        selectedFilters: values && Object.keys(values).length ? values : null,
                    },
                },
                isCurrentValueSelected: isActive(key, val),
            };
        },
        [groupbyColumnsRaw, groupbyRowsRaw, selectedFilters],
    );

    const toggleFilter = useCallback(
        (
            e: MouseEvent,
            _value: string,
            filters: FilterType,
            _pivotData: Record<string, any>,
            isSubtotal: boolean,
            isGrandTotal: boolean,
        ) => {
            if (isSubtotal || isGrandTotal || !emitCrossFilters) return;
            const filtersCopy = { ...filters } as any;
            delete (filtersCopy as any).__m0; delete (filtersCopy as any).__m1; delete (filtersCopy as any).__m2; delete (filtersCopy as any)[METRIC_KEY];
            const entries = Object.entries(filtersCopy);
            if (entries.length === 0) return;
            const [key, val] = entries[entries.length - 1];
            handleChange({ [key]: [val] } as any);
        },
        [emitCrossFilters, handleChange],
    );

    const tableOptions = useMemo(
        () => ({
            clickRowHeaderCallback: toggleFilter,
            clickColumnHeaderCallback: toggleFilter,
            colTotals,
            colSubTotals,
            rowTotals,
            rowSubTotals,
            highlightHeaderCellsOnHover:
                emitCrossFilters ||
                isFeatureEnabled(FeatureFlag.DrillBy) ||
                isFeatureEnabled(FeatureFlag.DrillToDetail),
            highlightedHeaderCells: selectedFilters,
            omittedHighlightHeaderGroups: showSegments ? ['__m0', '__m1', '__m2', METRIC_KEY] : ['__m0', '__m1', METRIC_KEY],
            cellColorFormatters: { value: metricColorFormatters },
            dateFormatters,
            orphanHeader: {
                enabled: true,
                attrKeys: { group: '__m0', subgroup: '__m1', subsubgroup: '__m2', metric: METRIC_KEY },
                flagField: '__orphan_header__',
                rowSpan: showSegments ? 5 : 4,
            },
        }),
        [
            colTotals,
            colSubTotals,
            dateFormatters,
            emitCrossFilters,
            metricColorFormatters,
            rowTotals,
            rowSubTotals,
            selectedFilters,
            toggleFilter,
            showSegments,
        ],
    );

    const subtotalOptions = useMemo(
        () => ({
            colSubtotalDisplay: { displayOnTop: colSubtotalPosition },
            rowSubtotalDisplay: { displayOnTop: rowSubtotalPosition },
            arrowCollapsed: <StyledPlusSquareOutlined />,
            arrowExpanded: <StyledMinusSquareOutlined />,
        }),
        [colSubtotalPosition, rowSubtotalPosition],
    );

    const handleContextMenu = useCallback(
        (
            e: MouseEvent,
            colKey: (string | number | boolean)[] | undefined,
            rowKey: (string | number | boolean)[] | undefined,
            dataPoint: { [key: string]: string },
        ) => {
            if (!onContextMenu) return;
            e.preventDefault();
            e.stopPropagation();

            const drillToDetailFilters: BinaryQueryObjectFilterClause[] = [];
            if (colKey && colKey.length > 1) {
                colKey.forEach((val, i) => {
                    const col = cols[i];
                    if (col === '__m0' || col === '__m1' || col === '__m2' || col === METRIC_KEY) return;
                    drillToDetailFilters.push({ col, op: '==', val, formattedVal: String(val) });
                });
            }
            if (rowKey) {
                rowKey.forEach((val, i) => {
                    const col = rows[i];
                    drillToDetailFilters.push({ col, op: '==', val, formattedVal: String(val) });
                });
            }

            onContextMenu(e.clientX, e.clientY, {
                drillToDetail: drillToDetailFilters,
                crossFilter: getCrossFilterDataMask(dataPoint),
            });
        },
        [onContextMenu, getCrossFilterDataMask, rows, cols],
    );

    // Handler for column reordering via drag-and-drop
    const handleColumnReorder = useCallback((newOrder: string[]) => {
        // Convert new order to swaps array
        const swapPairs: [number, number][] = [];
        const currentOrder = slotsReordered.map(slot => slot.metric);
        
        for (let i = 0; i < newOrder.length; i++) {
            const currentIndex = currentOrder.indexOf(newOrder[i]);
            if (currentIndex !== -1 && currentIndex !== i) {
                swapPairs.push([currentIndex, i]);
                // Update currentOrder for next iteration
                [currentOrder[currentIndex], currentOrder[i]] = [currentOrder[i], currentOrder[currentIndex]];
            }
        }

        // Call the callback with swaps in the format expected by HeaderTreePivotChart
        if (onColumnOrderChange && swapPairs.length > 0) {
            onColumnOrderChange(JSON.stringify(swapPairs));
        }
    }, [slotsReordered, onColumnOrderChange]);

    return (
        <Styles height={height} width={width} margin={theme.gridUnit * 4}>
            <PivotTableWrapper>
                <PivotTable
                    data={unpivotedData}
                    rows={rows}
                    cols={cols}
                    aggregatorsFactory={aggregatorsFactory}
                    defaultFormatter={defaultFormatter}
                    customFormatters={{ [METRIC_KEY]: metricFormatterMap }}
                    aggregatorName={aggregateFunction}
                    vals={vals}
                    colOrder="key_a_to_z"
                    rowOrder={rowOrder}
                    sorters={sorters}
                    tableOptions={tableOptions}
                    subtotalOptions={subtotalOptions}
                    namesMapping={namesMapping}
                    onContextMenu={handleContextMenu}
                    dragAndDropConfig={dragAndDropConfig}
                    onColumnOrderChange={handleColumnReorder}
                />
            </PivotTableWrapper>
        </Styles>
    );
}
