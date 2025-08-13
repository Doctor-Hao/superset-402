import React, { useCallback, useMemo } from 'react';
import { MinusSquareOutlined, PlusSquareOutlined } from '@ant-design/icons';
import {
    AdhocMetric,
    BinaryQueryObjectFilterClause,
    CurrencyFormatter,
    DataRecordValue,
    FeatureFlag,
    getNumberFormatter,
    isAdhocColumn,
    isPhysicalColumn,
    NumberFormatter,
    styled,
    t,
    useTheme,
    getColumnLabel
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
        colOrder,
        rowOrder,
        aggregateFunction,
        transposePivot,
        combineMetric,
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
        timeGrainSqla,
        headerTree, // JSON вида { groups: [{ title, subgroups:[{title,count},...] }, ...] }
    } = props;

    console.log("headerTree", headerTree)

    const theme = useTheme();
    const defaultFormatter = useMemo(
        () =>
            currencyFormat?.symbol
                ? new CurrencyFormatter({ currency: currencyFormat, d3Format: valueFormat })
                : getNumberFormatter(valueFormat),
        [valueFormat, currencyFormat],
    );

    // индивидуальные форматтеры метрик (как в исходном компоненте)
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



    // карта форматтеров для конкретных метрик
    const metricFormatterMap = useMemo(
        () =>
            Object.fromEntries(
                customFormatsArray.map(([metric, d3Format, currency]) => [
                    metric,
                    currency
                        ? new CurrencyFormatter({ currency, d3Format })
                        : getNumberFormatter(d3Format),
                ]),
            ),
        [customFormatsArray],
    );

    // порядок метрик из UI
    const metricLabels: string[] = useMemo(
        () => metrics.map(m => (typeof m === 'string' ? m : (m.label as string))),
        [metrics],
    );

    // раскладываем метрики по: Группа -> Подгруппа
    type Slot = { group: string; subgroup: string; metric: string };
    const slots: Slot[] = useMemo(() => {
        const res: Slot[] = [];
        let p = 0;
        (headerTree?.groups ?? []).forEach((g: any) => {
            (g?.subgroups ?? []).forEach((sg: any) => {
                const cnt = Number(sg?.count ?? 0);
                for (let i = 0; i < cnt && p < metricLabels.length; i++, p++) {
                    res.push({ group: g?.title ?? '—', subgroup: sg?.title ?? '—', metric: metricLabels[p] });
                }
            });
        });
        // остаток — в последнюю подгруппу последней группы
        while (p < metricLabels.length) {
            const lastG = headerTree?.groups?.at(-1)?.title ?? 'Прочее';
            const lastSG = headerTree?.groups?.at(-1)?.subgroups?.at(-1)?.title ?? ' ';
            res.push({ group: lastG, subgroup: lastSG, metric: metricLabels[p++] });
        }
        return res;
    }, [headerTree, metricLabels]);

    // детектируем режим 2-уровневой шапки (есть пустые подгруппы)
    const hasEmptySubgroup = useMemo(
        () => slots.some(s => !String(s.subgroup || '').trim()),
        [slots],
    );
    const LEAF_KEY = '__leaf';

    const metricFormatters = useMemo(() => {
        if (!customFormatsArray.length) return undefined;
        return hasEmptySubgroup
            ? { [LEAF_KEY]: metricFormatterMap }   // 2 уровня: лист = подгруппа/метрика
            : { [METRIC_KEY]: metricFormatterMap } // 3 уровня: лист = метрика
    }, [customFormatsArray.length, hasEmptySubgroup, metricFormatterMap]);

    const metricToLevels = useMemo(
        () => Object.fromEntries(slots.map(s => [s.metric, [s.group, s.subgroup] as [string, string]])),
        [slots],
    );

    // добавляем 2 искусственных уровня над метриками
    const METRIC_KEY = t('Metric');

    // 2 режима: три уровня (группа→подгруппа→метрика) ИЛИ два (группа→подгруппа/метрика)
    const LEVEL_KEYS = hasEmptySubgroup
        ? (['__m0', LEAF_KEY] as const)
        : (['__m0', '__m1', METRIC_KEY] as const);

    const unpivotedData = useMemo(
        () =>
            data
                .flatMap(rec =>
                    metricLabels.map(lbl => {
                        const [g, sg] = metricToLevels[lbl] ?? ['—', '—'];
                        if (hasEmptySubgroup) {
                            // ДВЕ СТРОКИ: верх = группа, низ = (подгруппа или метрика)
                            const leaf = String(sg || '').trim() ? sg : lbl;
                            return { ...rec, value: (rec as any)[lbl], __m0: g, [LEAF_KEY]: leaf };
                        }
                        // ТРИ СТРОКИ (как раньше): группа → подгруппа → метрика
                        return {
                            ...rec,
                            value: (rec as any)[lbl],
                            __m0: g,
                            __m1: sg,
                            [METRIC_KEY]: lbl,
                        };
                    }),
                )
                .filter(r => r.value !== null && r.value !== undefined),
        [data, metricLabels, metricToLevels, hasEmptySubgroup],
    );


    const groupbyRows = useMemo(
        () => groupbyRowsRaw.map(getColumnLabel),
        [groupbyRowsRaw],
    );
    const groupbyColumns = useMemo(
        () => groupbyColumnsRaw.map(getColumnLabel),
        [groupbyColumnsRaw],
    );


    const [rows, cols] = useMemo(() => {
        let [rows_, cols_] = transposePivot ? [groupbyColumns, groupbyRows] : [groupbyRows, groupbyColumns];
        if (metricsLayout === MetricsLayoutEnum.ROWS) {
            rows_ = [...rows_, ...LEVEL_KEYS];
        } else {
            cols_ = [...LEVEL_KEYS, ...cols_];
        }
        return [rows_, cols_];
    }, [groupbyColumns, groupbyRows, metricsLayout, transposePivot, LEVEL_KEYS]);



    // сортировка: как в JSON, слева-направо
    const groupOrder = useMemo(
        () => (headerTree?.groups ?? []).map((g: any) => g?.title ?? '—'),
        [headerTree],
    );
    const subgroupOrder = useMemo(() => {
        const out: string[] = [];
        (headerTree?.groups ?? []).forEach((g: any) =>
            (g?.subgroups ?? []).forEach((sg: any) => out.push(sg?.title ?? '—')),
        );
        return out;
    }, [headerTree]);

    const leafOrder = useMemo(() => {
        if (!hasEmptySubgroup) return [];
        const order: string[] = [];
        (headerTree?.groups ?? []).forEach((g: any) => {
            const gTitle = g?.title ?? '—';
            (g?.subgroups ?? []).forEach((sg: any) => {
                const sgTitle = String(sg?.title ?? '').trim();
                if (sgTitle) {
                    order.push(sgTitle);
                } else {
                    // подгруппа без title: подставляем список метрик этой подгруппы по slots
                    slots
                        .filter(s => (s.group ?? '—') === gTitle && !String(s.subgroup || '').trim())
                        .forEach(s => order.push(s.metric));
                }
            });
        });
        return order;
    }, [headerTree, slots, hasEmptySubgroup]);

    const sorters = useMemo(() => {
        if (hasEmptySubgroup) {
            return {
                __m0: sortAs(groupOrder),
                [LEAF_KEY]: sortAs(leafOrder.length ? leafOrder : slots.map(s => s.subgroup || s.metric)),
            };
        }
        return {
            __m0: sortAs(groupOrder),
            __m1: sortAs(
                // порядок подгрупп как в JSON
                (headerTree?.groups ?? []).flatMap((g: any) =>
                    (g?.subgroups ?? []).map((sg: any) => sg?.title ?? '—'),
                ),
            ),
            [METRIC_KEY]: sortAs(metricLabels), // лист: как в UI
        };
    }, [groupOrder, leafOrder, hasEmptySubgroup, headerTree, metricLabels, slots]);


    // cross-filter/контекстное меню — копия из исходного компонента,
    // но исключаем наши искусственные уровни из фильтров
    const handleChange = useCallback(
        (filters: SelectedFiltersType) => {
            const filterKeys = Object.keys(filters);
            const groupby = [...groupbyRowsRaw, ...groupbyColumnsRaw];
            setDataMask({
                extraFormData: {
                    filters:
                        filterKeys.length === 0
                            ? undefined
                            : filterKeys.map(key => {
                                // отбрасываем служебные уровни
                                if (key === '__m0' || key === '__m1') return null as any;
                                const val = filters?.[key];
                                const col =
                                    groupby.find(item => {
                                        if (isPhysicalColumn(item)) return item === key;
                                        if (isAdhocColumn(item)) return (item as any).label === key;
                                        return false;
                                    }) ?? '';
                                if (val === null || val === undefined) return { col, op: 'IS NULL' as const };
                                return { col, op: 'IN' as const, val: val as (string | number | boolean)[] };
                            }).filter(Boolean as any),
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
            const isActive = (key: string, val: DataRecordValue) =>
                !!selectedFilters && selectedFilters[key]?.includes(val);
            if (!value) return undefined;

            const [key, val] = Object.entries(value)[0];
            // не фильтруем по служебным уровням
            if (key === '__m0' || key === '__m1') return undefined;

            let values = { ...selectedFilters };
            if (isActive(key, val)) values = {};
            else values = { [key]: [val] };

            const filterKeys = Object.keys(values);
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
            value: string,
            filters: FilterType,
            pivotData: Record<string, any>,
            isSubtotal: boolean,
            isGrandTotal: boolean,
        ) => {
            if (isSubtotal || isGrandTotal || !emitCrossFilters) return;
            const filtersCopy = { ...filters };
            delete (filtersCopy as any)['__m0'];
            delete (filtersCopy as any)['__m1'];
            const entries = Object.entries(filtersCopy);
            if (entries.length === 0) return;

            const [key, val] = entries[entries.length - 1];
            handleChange({ [key]: [val] } as any);
        },
        [emitCrossFilters, handleChange],
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

    const namesMapping = useMemo(() => {
        return hasEmptySubgroup
            ? ({ ...verboseMap, __m0: ' ', [LEAF_KEY]: ' ' })
            : ({ ...verboseMap, __m0: ' ', __m1: ' ', [METRIC_KEY]: ' ' });
    }, [verboseMap, hasEmptySubgroup]);

    const tableOptions = useMemo(
        () => ({
            clickRowHeaderCallback: toggleFilter,
            clickColumnHeaderCallback: toggleFilter,
            colTotals,
            colSubTotals,
            rowTotals,
            rowSubTotals,
            highlightHeaderCellsOnHover: true,
            highlightedHeaderCells: selectedFilters,
            omittedHighlightHeaderGroups: hasEmptySubgroup
                ? ['__m0', LEAF_KEY]
                : ['__m0', '__m1', METRIC_KEY],
            cellColorFormatters: { value: metricColorFormatters },
            dateFormatters,
        }),
        [
            colTotals,
            colSubTotals,
            dateFormatters,
            metricColorFormatters,
            rowTotals,
            rowSubTotals,
            selectedFilters,
            toggleFilter,
            hasEmptySubgroup,
        ],
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
                    if (col === '__m0' || col === '__m1') return; // пропускаем служебные уровни
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
        [onContextMenu, getCrossFilterDataMask],
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
                    customFormatters={metricFormatters}
                    aggregatorName={aggregateFunction}
                    vals={vals}
                    colOrder={colOrder}
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
