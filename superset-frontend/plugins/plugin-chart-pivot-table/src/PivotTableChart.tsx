/**
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */
import React, { useCallback, useMemo, useState, useEffect } from 'react';
import { MinusSquareOutlined, PlusSquareOutlined } from '@ant-design/icons';
import {
  AdhocMetric,
  BinaryQueryObjectFilterClause,
  CurrencyFormatter,
  DataRecordValue,
  FeatureFlag,
  getColumnLabel,
  getNumberFormatter,
  getSelectedText,
  isAdhocColumn,
  isFeatureEnabled,
  isPhysicalColumn,
  NumberFormatter,
  styled,
  t,
  useTheme,
} from '@superset-ui/core';
import { aggregatorTemplates, PivotTable, sortAs } from './react-pivottable';
import {
  FilterType,
  MetricsLayoutEnum,
  PivotTableProps,
  PivotTableStylesProps,
  SelectedFiltersType,
} from './types';
import HeaderTreePivotChart from './HeaderTreePivotChart';
import ApiErrorNotifications, { ApiError } from './components/ApiErrorNotifications';

const Styles = styled.div<PivotTableStylesProps>`
  ${({ height, width, margin }) => `
      margin: ${margin}px;
      height: ${height - margin * 2}px;
      width: ${typeof width === 'string' ? parseInt(width, 10) : width - margin * 2
    }px;
 `}
`;

const PivotTableWrapper = styled.div`
  height: 100%;
  max-width: inherit;
  overflow: auto;
  position: relative;
`;

const LoadingOverlay = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(255, 255, 255, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  font-size: 14px;
  color: #666;
`;

const METRIC_KEY = t('Metric');
const vals = ['value'];

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

function swapArrayByPairs<T>(arr: T[], swaps: [number, number][]): T[] {
  const a = arr.slice();
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

/* If you change this logic, please update the corresponding Python
 * function (https://github.com/apache/superset/blob/master/superset/charts/post_processing.py),
 * or reach out to @betodealmeida.
 */
export default function PivotTableChart(props: PivotTableProps) {
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
    headerTree,
    dragAndDropConfig,
    columnsIndexSwaps,
    onColumnOrderChange,
    onRowOrderChange,
    externalApiColumns,
  } = props;

  const [enrichedData, setEnrichedData] = useState(data);
  const [isLoadingApi, setIsLoadingApi] = useState(false);
  const [updatingCells, setUpdatingCells] = useState<Set<string>>(new Set());
  const [apiConfig, setApiConfig] = useState<any>(null);
  const [apiErrors, setApiErrors] = useState<ApiError[]>([]);

  const addApiError = useCallback((error: Omit<ApiError, 'id' | 'timestamp'>) => {
    const newError: ApiError = {
      ...error,
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
    };
    setApiErrors(prev => [...prev, newError]);
  }, []);

  const dismissApiError = useCallback((errorId: string) => {
    setApiErrors(prev => prev.filter(error => error.id !== errorId));
  }, []);

  const dismissAllApiErrors = useCallback(() => {
    setApiErrors([]);
  }, []);

  const fetchExternalData = useCallback(async (apiConfig: any, uniqueIds: string[]): Promise<Record<string, any>> => {
    const { apiUrl, headers = {}, timeout = 10000, retryCount = 3 } = apiConfig;
    const cache: Record<string, any> = {};

    const fetchWithRetry = async (id: string, attempts: number = 0): Promise<any> => {
      try {
        const url = apiUrl.replace('{id}', encodeURIComponent(id));
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        const response = await fetch(url, {
          headers: {
            'Content-Type': 'application/json',
            ...headers,
          },
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const result = await response.json();
        return result;
      } catch (error) {
        if (attempts < retryCount) {
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempts) * 1000));
          return fetchWithRetry(id, attempts + 1);
        }
        
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        const isNetworkError = error instanceof TypeError || errorMessage.includes('Failed to fetch');
        const is404Error = errorMessage.includes('HTTP 404');
        
        let errorType: ApiError['type'] = 'network_error';
        let displayMessage = errorMessage;
        
        if (is404Error) {
          errorType = 'load_error';
          displayMessage = `Data not found for ID ${id}`;
        } else if (isNetworkError) {
          errorType = 'network_error';
          displayMessage = `Network error while loading data for ID ${id}`;
        } else {
          errorType = 'load_error';
          displayMessage = `Failed to load data for ID ${id}: ${errorMessage}`;
        }
        
        console.warn(`Failed to fetch data for ID ${id}:`, error);
        return null;
      }
    };

    const failedIds: string[] = [];
    const promises = uniqueIds.map(async id => {
      const result = await fetchWithRetry(id);
      if (result === null) {
        failedIds.push(id);
      } else {
        cache[id] = result;
      }
    });

    await Promise.allSettled(promises);
    
    if (failedIds.length > 0) {
      addApiError({
        type: 'load_error',
        message: `Failed to load data for ${failedIds.length} record${failedIds.length > 1 ? 's' : ''}`,
        details: `IDs: ${failedIds.join(', ')}`,
      });
    }
    
    return cache;
  }, [addApiError]);

  const updateExternalData = useCallback(async (id: string, columnName: string, newValue: string): Promise<void> => {
    if (!apiConfig || !apiConfig.patchApiUrl) {
      throw new Error('PATCH API URL not configured');
    }

    const cellKey = `${id}-${columnName}`;
    setUpdatingCells(prev => new Set([...prev, cellKey]));

    try {
      const { patchApiUrl, headers = {}, timeout = 10000, retryCount = 3, patchMethod = 'PATCH' } = apiConfig;
      const url = patchApiUrl.replace('{id}', encodeURIComponent(id));

      const column = apiConfig.columns.find((col: any) => col.name === columnName);
      if (!column) {
        throw new Error(`Column ${columnName} not found in configuration`);
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      const response = await fetch(url, {
        method: patchMethod,
        headers: {
          'Content-Type': 'application/json',
          ...headers,
        },
        body: JSON.stringify({
          [column.apiKey]: newValue,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      setEnrichedData(prevData => 
        prevData.map(row => 
          row[apiConfig.idColumn] === id 
            ? { ...row, [columnName]: newValue }
            : row
        )
      );

      if (apiConfig.refreshAfterUpdate) {
        const cache = await fetchExternalData(apiConfig, [id]);
        const updatedData = enrichDataWithExternalColumns(
          enrichedData.filter(row => row[apiConfig.idColumn] !== id),
          apiConfig,
          cache
        );
        const existingData = enrichedData.filter(row => row[apiConfig.idColumn] !== id);
        setEnrichedData([...existingData, ...updatedData]);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const isNetworkError = error instanceof TypeError || errorMessage.includes('Failed to fetch');
      const is404Error = errorMessage.includes('HTTP 404');
      const is400Error = errorMessage.includes('HTTP 400');
      const is403Error = errorMessage.includes('HTTP 403');
      
      let errorType: ApiError['type'] = 'save_error';
      let displayMessage = errorMessage;
      
      if (is404Error) {
        displayMessage = `Record not found (ID: ${id})`;
      } else if (is400Error) {
        errorType = 'validation_error';
        displayMessage = `Invalid data format for ${columnName}`;
      } else if (is403Error) {
        displayMessage = `Access denied for updating ${columnName}`;
      } else if (isNetworkError) {
        errorType = 'network_error';
        displayMessage = `Network error while saving ${columnName}`;
      } else {
        displayMessage = `Failed to save ${columnName}: ${errorMessage}`;
      }
      
      addApiError({
        type: errorType,
        message: displayMessage,
        details: errorMessage,
        columnName,
        recordId: id,
      });
      
      console.error(`Failed to update ${columnName} for ID ${id}:`, error);
      throw error;
    } finally {
      setUpdatingCells(prev => {
        const newSet = new Set(prev);
        newSet.delete(cellKey);
        return newSet;
      });
    }
  }, [apiConfig, enrichedData, fetchExternalData, addApiError]);

  const enrichDataWithExternalColumns = useCallback((originalData: any[], apiConfig: any, externalCache: Record<string, any>): any[] => {
    const { idColumn, columns } = apiConfig;

    if (!idColumn || !columns || columns.length === 0) {
      return originalData;
    }

    return originalData.map(row => {
      const enrichedRow = { ...row };
      const id = row[idColumn];

      if (id && externalCache[id]) {
        const apiData = externalCache[id];
        columns.forEach((col: any) => {
          const { name, apiKey, defaultValue = 'N/A' } = col;
          enrichedRow[name] = apiData[apiKey] || defaultValue;
        });
      } else {
        columns.forEach((col: any) => {
          const { name, defaultValue = 'N/A' } = col;
          enrichedRow[name] = defaultValue;
        });
      }

      return enrichedRow;
    });
  }, []);

  useEffect(() => {
    const loadExternalApiData = async () => {
      try {
        if (!externalApiColumns) {
          setEnrichedData(data);
          return;
        }

        const parsedConfig = JSON.parse(externalApiColumns);
        setApiConfig(parsedConfig);
        
        if (!parsedConfig.apiUrl || !parsedConfig.idColumn || !parsedConfig.columns?.length) {
          setEnrichedData(data);
          return;
        }

        const uniqueIds = Array.from(new Set(
          data
            .map(row => row[parsedConfig.idColumn])
            .filter(id => id !== null && id !== undefined && id !== '')
        ));

        if (uniqueIds.length === 0) {
          setEnrichedData(data);
          return;
        }

        setIsLoadingApi(true);
        
        const cache = await fetchExternalData(parsedConfig, uniqueIds as string[]);
        const enriched = enrichDataWithExternalColumns(data, parsedConfig, cache);
        
        setEnrichedData(enriched);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        addApiError({
          type: 'load_error',
          message: 'Failed to load external API data',
          details: errorMessage,
        });
        console.error('Failed to load external API data:', error);
        setEnrichedData(data);
      } finally {
        setIsLoadingApi(false);
      }
    };

    loadExternalApiData();
  }, [data, externalApiColumns, fetchExternalData, enrichDataWithExternalColumns, addApiError]);

  const hasHeaderTree =
    !!headerTree &&
    Array.isArray((headerTree as any).groups) &&
    (headerTree as any).groups.length > 0;

  if (hasHeaderTree) {
    // передаём все пропсы как есть в новый компонент
    return <HeaderTreePivotChart {...(props as any)} />;
  }

  const theme = useTheme();
  const defaultFormatter = useMemo(
    () =>
      currencyFormat?.symbol
        ? new CurrencyFormatter({
          currency: currencyFormat,
          d3Format: valueFormat,
        })
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
  const hasCustomMetricFormatters = customFormatsArray.length > 0;
  const metricFormatters = useMemo(
    () =>
      hasCustomMetricFormatters
        ? {
          [METRIC_KEY]: Object.fromEntries(
            customFormatsArray.map(([metric, d3Format, currency]) => [
              metric,
              currency
                ? new CurrencyFormatter({
                  currency,
                  d3Format,
                })
                : getNumberFormatter(d3Format),
            ]),
          ),
        }
        : undefined,
    [customFormatsArray, hasCustomMetricFormatters],
  );

  const metricNames = useMemo(
    () =>
      metrics.map((metric: string | AdhocMetric) =>
        typeof metric === 'string' ? metric : (metric.label as string),
      ),
    [metrics],
  );

  // Apply column swaps to metric names for regular pivot table
  const swaps = useMemo(() => parseSwaps(columnsIndexSwaps), [columnsIndexSwaps]);
  const reorderedMetricNames = useMemo(() => {
    if (swaps.length > 0) {
      console.log('%cApplying column swaps to metrics:', 'color:#1890ff', swaps, 'Original order:', metricNames);
      const reordered = swapArrayByPairs(metricNames, swaps);
      console.log('%cReordered metrics:', 'color:#52c41a', reordered);
      return reordered;
    }
    return metricNames;
  }, [metricNames, swaps]);

  const unpivotedData = useMemo(
    () =>
      enrichedData.reduce(
        (acc: Record<string, any>[], record: Record<string, any>) => [
          ...acc,
          ...reorderedMetricNames
            .map((name: string) => ({
              ...record,
              [METRIC_KEY]: name,
              value: record[name],
            }))
            .filter(record => record.value !== null),
        ],
        [],
      ),
    [enrichedData, reorderedMetricNames],
  );
  const groupbyRows = useMemo(
    () => groupbyRowsRaw.map(getColumnLabel),
    [groupbyRowsRaw],
  );
  const groupbyColumns = useMemo(
    () => groupbyColumnsRaw.map(getColumnLabel),
    [groupbyColumnsRaw],
  );

  const sorters = useMemo(
    () => ({
      [METRIC_KEY]: sortAs(reorderedMetricNames),
    }),
    [reorderedMetricNames],
  );

  const [rows, cols] = useMemo(() => {
    let [rows_, cols_] = transposePivot
      ? [groupbyColumns, groupbyRows]
      : [groupbyRows, groupbyColumns];

    if (metricsLayout === MetricsLayoutEnum.ROWS) {
      rows_ = combineMetric ? [...rows_, METRIC_KEY] : [METRIC_KEY, ...rows_];
    } else {
      cols_ = combineMetric ? [...cols_, METRIC_KEY] : [METRIC_KEY, ...cols_];
    }
    return [rows_, cols_];
  }, [
    combineMetric,
    groupbyColumns,
    groupbyRows,
    metricsLayout,
    transposePivot,
  ]);

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
                const val = filters?.[key];
                const col =
                  groupby.find(item => {
                    if (isPhysicalColumn(item)) {
                      return item === key;
                    }
                    if (isAdhocColumn(item)) {
                      return item.label === key;
                    }
                    return false;
                  }) ?? '';
                if (val === null || val === undefined)
                  return {
                    col,
                    op: 'IS NULL',
                  };
                return {
                  col,
                  op: 'IN',
                  val: val as (string | number | boolean)[],
                };
              }),
        },
        filterState: {
          value:
            filters && Object.keys(filters).length
              ? Object.values(filters)
              : null,
          selectedFilters:
            filters && Object.keys(filters).length ? filters : null,
        },
      });
    },
    [groupbyColumnsRaw, groupbyRowsRaw, setDataMask],
  );

  const getCrossFilterDataMask = useCallback(
    (value: { [key: string]: string }) => {
      const isActiveFilterValue = (key: string, val: DataRecordValue) =>
        !!selectedFilters && selectedFilters[key]?.includes(val);

      if (!value) {
        return undefined;
      }

      const [key, val] = Object.entries(value)[0];
      let values = { ...selectedFilters };
      if (isActiveFilterValue(key, val)) {
        values = {};
      } else {
        values = { [key]: [val] };
      }

      const filterKeys = Object.keys(values);
      const groupby = [...groupbyRowsRaw, ...groupbyColumnsRaw];
      return {
        dataMask: {
          extraFormData: {
            filters:
              filterKeys.length === 0
                ? undefined
                : filterKeys.map(key => {
                  const val = values?.[key];
                  const col =
                    groupby.find(item => {
                      if (isPhysicalColumn(item)) {
                        return item === key;
                      }
                      if (isAdhocColumn(item)) {
                        return item.label === key;
                      }
                      return false;
                    }) ?? '';
                  if (val === null || val === undefined)
                    return {
                      col,
                      op: 'IS NULL' as const,
                    };
                  return {
                    col,
                    op: 'IN' as const,
                    val: val as (string | number | boolean)[],
                  };
                }),
          },
          filterState: {
            value:
              values && Object.keys(values).length
                ? Object.values(values)
                : null,
            selectedFilters:
              values && Object.keys(values).length ? values : null,
          },
        },
        isCurrentValueSelected: isActiveFilterValue(key, val),
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
      if (isSubtotal || isGrandTotal || !emitCrossFilters) {
        return;
      }

      // allow selecting text in a cell
      if (getSelectedText()) {
        return;
      }

      const isActiveFilterValue = (key: string, val: DataRecordValue) =>
        !!selectedFilters && selectedFilters[key]?.includes(val);

      const filtersCopy = { ...filters };
      delete filtersCopy[METRIC_KEY];

      const filtersEntries = Object.entries(filtersCopy);
      if (filtersEntries.length === 0) {
        return;
      }

      const [key, val] = filtersEntries[filtersEntries.length - 1];

      let updatedFilters = { ...(selectedFilters || {}) };
      // multi select
      // if (selectedFilters && isActiveFilterValue(key, val)) {
      //   updatedFilters[key] = selectedFilters[key].filter((x: DataRecordValue) => x !== val);
      // } else {
      //   updatedFilters[key] = [...(selectedFilters?.[key] || []), val];
      // }
      // single select
      if (selectedFilters && isActiveFilterValue(key, val)) {
        updatedFilters = {};
      } else {
        updatedFilters = {
          [key]: [val],
        };
      }
      if (
        Array.isArray(updatedFilters[key]) &&
        updatedFilters[key].length === 0
      ) {
        delete updatedFilters[key];
      }
      handleChange(updatedFilters);
    },
    [emitCrossFilters, selectedFilters, handleChange],
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
      omittedHighlightHeaderGroups: [METRIC_KEY],
      cellColorFormatters: { [METRIC_KEY]: metricColorFormatters },
      dateFormatters,
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
      if (onContextMenu) {
        e.preventDefault();
        e.stopPropagation();
        const drillToDetailFilters: BinaryQueryObjectFilterClause[] = [];
        if (colKey && colKey.length > 1) {
          colKey.forEach((val, i) => {
            const col = cols[i];
            const formatter = dateFormatters[col];
            const formattedVal = formatter?.(val as number) || String(val);
            if (i > 0) {
              drillToDetailFilters.push({
                col,
                op: '==',
                val,
                formattedVal,
                grain: formatter ? timeGrainSqla : undefined,
              });
            }
          });
        }
        if (rowKey) {
          rowKey.forEach((val, i) => {
            const col = rows[i];
            const formatter = dateFormatters[col];
            const formattedVal = formatter?.(val as number) || String(val);
            drillToDetailFilters.push({
              col,
              op: '==',
              val,
              formattedVal,
              grain: formatter ? timeGrainSqla : undefined,
            });
          });
        }
        onContextMenu(e.clientX, e.clientY, {
          drillToDetail: drillToDetailFilters,
          crossFilter: getCrossFilterDataMask(dataPoint),
          drillBy: dataPoint && {
            filters: [
              {
                col: Object.keys(dataPoint)[0],
                op: '==',
                val: Object.values(dataPoint)[0],
              },
            ],
            groupbyFieldName: rowKey ? 'groupbyRows' : 'groupbyColumns',
          },
        });
      }
    },
    [
      cols,
      dateFormatters,
      getCrossFilterDataMask,
      onContextMenu,
      rows,
      timeGrainSqla,
    ],
  );

  return (
    <Styles height={height} width={width} margin={theme.gridUnit * 4}>
      {apiConfig?.columns?.length > 0 && (
        <ApiErrorNotifications
          errors={apiErrors}
          onDismiss={dismissApiError}
          onDismissAll={dismissAllApiErrors}
        />
      )}
      <PivotTableWrapper>
        {isLoadingApi && (
          <LoadingOverlay>
            Loading external data...
          </LoadingOverlay>
        )}
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
          namesMapping={verboseMap}
          onContextMenu={handleContextMenu}
          dragAndDropConfig={dragAndDropConfig}
          onColumnOrderChange={onColumnOrderChange}
          onRowOrderChange={onRowOrderChange}
        />
      </PivotTableWrapper>
    </Styles>
  );
}
