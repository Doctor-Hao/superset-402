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

const vals = ['value'];

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
    } = props;

    const METRIC_KEY = t('Metric');

    const theme = useTheme();
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
                columnFormats[metricName] || valueFormat,
                currencyFormats[metricName] || currencyFormat,
            ]),
        [columnFormats, currencyFormat, currencyFormats, valueFormat],
    );

    const metricFormatterMap = useMemo(
        () =>
            Object.fromEntries(
                customFormatsArray.map(([metric, d3Format, currency]) => [
                    metric,
                    currency ? new CurrencyFormatter({ currency, d3Format }) : getNumberFormatter(d3Format),
                ]),
            ),
        [customFormatsArray],
    );

    const customFormatters = useMemo(() => {
        if (!customFormatsArray.length) return undefined;
        return { [METRIC_KEY]: metricFormatterMap };
    }, [customFormatsArray.length, metricFormatterMap]);

    const metricLabels: string[] = useMemo(
        () => metrics.map(m => (typeof m === 'string' ? m : (m.label as string))),
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

    type Slot = { level1: string; level2: string; level3: string; metric: string };
    const slots: Slot[] = useMemo(() => {
        const res: Slot[] = [];
        let p = 0;
        const groups = Array.isArray((tree as any)?.groups) ? (tree as any).groups : [];
        groups.forEach((g: any) => {
            const l1 = g?.title ?? '—';
            const subgroups = Array.isArray(g?.subgroups) ? g.subgroups : [];

            if (!subgroups.length) {
                const segs = Array.isArray(g?.segments) ? g.segments : [];
                if (segs.length) {
                    if (showSegments) {
                        segs.forEach((seg: any) => {
                            const l3 = seg?.title ?? '';
                            const cnt = Math.max(0, Number(seg?.count ?? 0));
                            for (let i = 0; i < cnt && p < metricLabels.length; i += 1, p += 1) {
                                res.push({ level1: l1, level2: '', level3: l3, metric: metricLabels[p] });
                            }
                        });
                    } else {
                        const total = segs.reduce((acc: number, s: any) => acc + Math.max(0, Number(s?.count ?? 0)), 0);
                        for (let i = 0; i < total && p < metricLabels.length; i += 1, p += 1) {
                            res.push({ level1: l1, level2: '', level3: '', metric: metricLabels[p] });
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
                            const cnt = Math.max(0, Number(seg?.count ?? 0));
                            for (let i = 0; i < cnt && p < metricLabels.length; i += 1, p += 1) {
                                res.push({ level1: l1, level2: l2, level3: l3, metric: metricLabels[p] });
                            }
                        });
                    } else {
                        const total = segs.reduce((acc: number, s: any) => acc + Math.max(0, Number(s?.count ?? 0)), 0);
                        for (let i = 0; i < total && p < metricLabels.length; i += 1, p += 1) {
                            res.push({ level1: l1, level2: l2, level3: '', metric: metricLabels[p] });
                        }
                    }
                } else if (sg?.count !== undefined) {
                    const cnt = Math.max(0, Number(sg.count));
                    for (let i = 0; i < cnt && p < metricLabels.length; i += 1, p += 1) {
                        res.push({ level1: l1, level2: l2, level3: '', metric: metricLabels[p] });
                    }
                }
            });
        });
        if (p < metricLabels.length) {
            for (; p < metricLabels.length; p += 1) {
                const m = metricLabels[p];
                res.push({ level1: m, level2: '', level3: '', metric: m });
            }
        }
        return res;
    }, [tree, metricLabels, showSegments]);

    const groupbyRows = useMemo(() => groupbyRowsRaw.map(getColumnLabel), [groupbyRowsRaw]);
    const groupbyColumns = useMemo(() => groupbyColumnsRaw.map(getColumnLabel), [groupbyColumnsRaw]);

    const LEVEL_KEYS: string[] = useMemo(
        () => (showSegments ? ['__m0', '__m1', '__m2', METRIC_KEY] : ['__m0', '__m1', METRIC_KEY]),
        [showSegments],
    );

    const unpivotedData = useMemo(
        () =>
            data
                .flatMap(rec =>
                    metricLabels.map(lbl => {
                        const slot =
                            slots.find(s => s.metric === lbl) ||
                            ({ level1: '—', level2: '', level3: '' } as Slot);
                        const isOrphan = slot.level1 === lbl && slot.level2 === '' && slot.level3 === '';
                        const metricKeyValue = isOrphan ? '' : lbl;
                        return {
                            ...rec,
                            value: (rec as any)[lbl],
                            __m0: slot.level1,
                            __m1: slot.level2,
                            __m2: slot.level3,
                            [METRIC_KEY]: metricKeyValue,
                            __orphan_header__: isOrphan ? 1 : 0,
                        } as any;
                    }),
                )
                .filter(r => r.value !== null && r.value !== undefined),
        [data, metricLabels, slots],
    );

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

    const level1Order = useMemo(
        () => Array.from(new Set(slots.map(s => s.level1))),
        [slots],
    );
    const level2Order = useMemo(
        () => Array.from(new Set(slots.map(s => s.level2))),
        [slots],
    );
    const level3Order = useMemo(
        () => Array.from(new Set(slots.map(s => s.level3))),
        [slots],
    );
    const metricLeafOrder = useMemo(() => slots.map(s => s.metric), [slots]);

    const sorters = useMemo(() => {
        const base: Record<string, any> = {
            __m0: sortAs(level1Order),
            __m1: sortAs(level2Order),
            [METRIC_KEY]: sortAs(metricLeafOrder),
        };
        if (showSegments) base.__m2 = sortAs(level3Order);
        return base;
    }, [level1Order, level2Order, level3Order, metricLeafOrder, showSegments]);

    const handleChange = useCallback(
        (filters: SelectedFiltersType) => {
            const filterKeys = Object.keys(filters);
            const groupby = [...groupbyRowsRaw, ...groupbyColumnsRaw];
            setDataMask({
                extraFormData: {
                    filters:
                        filterKeys.length === 0
                            ? undefined
                            : filterKeys
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
                                .filter(Boolean as any),
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
            delete filtersCopy.__m0; delete filtersCopy.__m1; delete filtersCopy.__m2; delete filtersCopy[METRIC_KEY];
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

    const namesMapping = useMemo(
        () => ({ ...(verboseMap || {}), __m0: ' ', __m1: ' ', ...(showSegments ? { __m2: ' ' } : {}), [METRIC_KEY]: ' ' }),
        [verboseMap, showSegments],
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
                />
            </PivotTableWrapper>
        </Styles>
    );
}
