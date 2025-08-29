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
/* eslint-disable camelcase */
import { invert } from 'lodash';
import {
  AnnotationLayer,
  AxisType,
  buildCustomFormatters,
  CategoricalColorNamespace,
  CurrencyFormatter,
  ensureIsArray,
  GenericDataType,
  getCustomFormatter,
  getNumberFormatter,
  getXAxisLabel,
  isDefined,
  isEventAnnotationLayer,
  isFormulaAnnotationLayer,
  isIntervalAnnotationLayer,
  isPhysicalColumn,
  isTimeseriesAnnotationLayer,
  QueryFormData,
  QueryFormMetric,
  TimeseriesChartDataResponseResult,
  TimeseriesDataRecord,
  ValueFormatter,
} from '@superset-ui/core';
import { getOriginalSeries } from '@superset-ui/chart-controls';
import { EChartsCoreOption, SeriesOption } from 'echarts';
import {
  DEFAULT_FORM_DATA,
  EchartsMixedTimeseriesChartTransformedProps,
  EchartsMixedTimeseriesFormData,
  EchartsMixedTimeseriesProps,
} from './types';
import {
  EchartsTimeseriesSeriesType,
  ForecastSeriesEnum,
  Refs,
} from '../types';
import { parseAxisBound } from '../utils/controls';
import {
  dedupSeries,
  extractDataTotalValues,
  extractSeries,
  extractShowValueIndexes,
  getAxisType,
  getColtypesMapping,
  getLegendProps,
  getMinAndMaxFromBounds,
  getOverMaxHiddenFormatter,
} from '../utils/series';
import {
  extractAnnotationLabels,
  getAnnotationData,
} from '../utils/annotation';
import {
  extractForecastSeriesContext,
  extractForecastValuesFromTooltipParams,
  formatForecastTooltipSeries,
  rebaseForecastDatum,
} from '../utils/forecast';
import { convertInteger } from '../utils/convertInteger';
import { defaultGrid, defaultYAxis } from '../defaults';
import {
  getPadding,
  transformEventAnnotation,
  transformFormulaAnnotation,
  transformIntervalAnnotation,
  transformSeries,
  transformTimeseriesAnnotation,
} from '../Timeseries/transformers';
import { TIMEGRAIN_TO_TIMESTAMP, TIMESERIES_CONSTANTS } from '../constants';
import { getDefaultTooltip } from '../utils/tooltip';
import {
  getTooltipTimeFormatter,
  getXAxisFormatter,
  getYAxisFormatter,
} from '../utils/formatters';

const VARIANT_METRIC = '__variant_id';
const stripVariantMetric = <T extends Record<string, any>>(rows: T[]) =>
  rows.map(({ [VARIANT_METRIC]: _omit, ...rest }) => rest);

const getFormatter = (
  customFormatters: Record<string, ValueFormatter>,
  defaultFormatter: ValueFormatter,
  metrics: QueryFormMetric[],
  metricLabel?: string,
  isContributionMode?: boolean,
): ValueFormatter => {
  if (isContributionMode) {
    return getNumberFormatter(',.0%');
  }
  if (metricLabel && customFormatters[metricLabel]) {
    return customFormatters[metricLabel];
  }
  return defaultFormatter;
};

export default function transformProps(
  chartProps: EchartsMixedTimeseriesProps,
): EchartsMixedTimeseriesChartTransformedProps {
  const {
    width,
    height,
    formData,
    queriesData,
    hooks,
    filterState,
    inContextMenu,
    theme,
    verboseMap,
    currencyFormats,
    columnFormats,
  } = chartProps;
  const { emitCrossFilters }: any = hooks;
  let focusedSeries: string | null = null;
  const labelMap = (queriesData[0] as TimeseriesChartDataResponseResult)
    ?.label_map;
  const labelMapB = (queriesData[1] as TimeseriesChartDataResponseResult)
    ?.label_map;

  const data1Raw = (queriesData[0].data || []) as TimeseriesDataRecord[];
  const data2Raw = (queriesData[1].data || []) as TimeseriesDataRecord[];
  let data3Raw: TimeseriesDataRecord[] = [];


  let labelMapC: Record<string, unknown> | undefined;
  if (queriesData.length > 2 && queriesData[2]?.data) {
    data3Raw = queriesData.length > 2 ? ((queriesData[2].data || []) as TimeseriesDataRecord[]) : [];
    labelMapC = (queriesData[2] as TimeseriesChartDataResponseResult).label_map;
  }

  // ⚠️ Для построения серий берём «очищенные» массивы
  let data1 = stripVariantMetric(data1Raw);
  let data2 = stripVariantMetric(data2Raw);
  let data3 = stripVariantMetric(data3Raw);
  

  const annotationData = getAnnotationData(chartProps);
  const coltypeMapping = {
    ...getColtypesMapping(queriesData[0]),
    ...getColtypesMapping(queriesData[1]),
  };

  // Добавляем C — но только если действительно есть queriesData[2]
  if (queriesData.length > 2) {
    Object.assign(coltypeMapping, getColtypesMapping(queriesData[2]));
  }
  const {
    area,
    areaB,
    areaC,
    annotationLayers,
    colorScheme,
    contributionMode,
    legendOrientation,
    legendType,
    logAxis,
    logAxisSecondary,
    markerEnabled,
    markerEnabledB,
    markerEnabledC,
    markerSize,
    markerSizeB,
    markerSizeC,
    opacity,
    opacityB,
    opacityC,
    minorSplitLine,
    minorTicks,
    seriesType,
    seriesTypeB,
    seriesTypeC,
    showLegend,
    showValue,
    showValueB,
    showValueC,
    stack,
    stackB,
    stackC,
    truncateXAxis,
    truncateYAxis,
    tooltipTimeFormat,
    yAxisFormat,
    currencyFormat,
    yAxisFormatSecondary,
    currencyFormatSecondary,
    xAxisTimeFormat,
    yAxisBounds,
    yAxisBoundsSecondary,
    yAxisIndex,
    yAxisIndexB,
    yAxisIndexC,
    yAxisTitleSecondary,
    zoomable,
    richTooltip,
    tooltipSortByMetric,
    xAxisBounds,
    xAxisLabelRotation,
    groupby,
    groupbyB,
    xAxis: xAxisOrig,
    xAxisForceCategorical,
    xAxisTitle,
    yAxisTitle,
    xAxisTitleMargin,
    yAxisTitleMargin,
    yAxisTitlePosition,
    sliceId,
    timeGrainSqla,
    percentageThreshold,
    metrics = [],
    metricsB = [],
    metricsC = [],
    disable_time_grain = false,
    custom_date_format_monthly = 'smart_date',
    custom_date_format_yearly = '%Y',
  }: EchartsMixedTimeseriesFormData = { ...DEFAULT_FORM_DATA, ...formData };

  // Исправляем: берем настройки из rawFormData если они там есть
  const actualDisableTimeGrain = chartProps.rawFormData?.disable_time_grain || disable_time_grain;
  const actualMonthlyFormat = chartProps.rawFormData?.custom_date_format_monthly || custom_date_format_monthly;
  const actualYearlyFormat = chartProps.rawFormData?.custom_date_format_yearly || custom_date_format_yearly;

  // Функция для гибкого форматирования дат с использованием D3/Superset форматтеров
  const formatCustomDate = (timestamp: number, isYearly: boolean): string => {
    const format = isYearly ? actualYearlyFormat : actualMonthlyFormat;
    
    // Если используется smart_date, применяем адаптивное форматирование
    if (format === 'smart_date') {
      const date = new Date(timestamp);
      const year = date.getFullYear();
      const month = date.getMonth() + 1;
      
      if (isYearly) {
        return year.toString();
      } else {
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 
                           'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        return `${monthNames[month - 1]} ${year}`;
      }
    }
    
    // Проверяем, содержит ли формат русские элементы или %B - используем fallback
    const hasRussianElements = format.includes('г.') || format.includes('%B');
    
    if (!hasRussianElements) {
      // Для стандартных D3 форматов без русских элементов используем встроенное форматирование
      try {
        const formatter = getXAxisFormatter(format);
        if (typeof formatter === 'function') {
          return formatter(timestamp);
        }
      } catch (error) {
        console.warn('Error formatting date with D3 formatter:', error);
      }
    }
    
    // Fallback форматирование для всех остальных случаев (включая русские форматы)
    const date = new Date(timestamp);
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                       'July', 'August', 'September', 'October', 'November', 'December'];
    const monthNamesRu = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
                         'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];
    
    let formattedDate = format
      .replace('%Y', date.getFullYear().toString())
      .replace('%y', date.getFullYear().toString().slice(-2))
      .replace('%m', (date.getMonth() + 1).toString().padStart(2, '0'))
      .replace('%d', date.getDate().toString().padStart(2, '0'))
      .replace('%H', '00')
      .replace('%M', '00') 
      .replace('%S', '00');
    
    // Для русских форматов используем русские названия месяцев
    if (format.includes('%B %Y г.') || format.includes('%B') && format.includes('г.')) {
      formattedDate = formattedDate.replace('%B', monthNamesRu[date.getMonth()]);
    } else if (format.includes('%B')) {
      // Для %B %Y (без "г.") используем русские названия тоже, если это yearly формат
      formattedDate = formattedDate.replace('%B', 
        isYearly ? monthNamesRu[date.getMonth()] : monthNames[date.getMonth()]);
    }
    
    return formattedDate;
  };

  console.log('=== MixedTimeseries transformProps DEBUG ===');
  console.log('formData disable_time_grain:', disable_time_grain);
  console.log('rawFormData disable_time_grain:', chartProps.rawFormData?.disable_time_grain);
  console.log('actualDisableTimeGrain:', actualDisableTimeGrain);
  console.log('actualMonthlyFormat:', actualMonthlyFormat);
  console.log('actualYearlyFormat:', actualYearlyFormat);
  console.log('timeGrainSqla:', timeGrainSqla);
  console.log('data1 length:', data1.length);
  console.log('data2 length:', data2.length);
  if (data1.length > 0) {
    console.log('First data1 record:', data1[0]);
  }
  if (data2.length > 0) {
    console.log('First data2 record:', data2[0]);
  }

  const refs: Refs = {};
  const colorScale = CategoricalColorNamespace.getScale(colorScheme as string);

  let xAxisLabel = getXAxisLabel(
    chartProps.rawFormData as QueryFormData,
  ) as string;
  if (
    isPhysicalColumn(chartProps.rawFormData?.x_axis) &&
    verboseMap &&
    isDefined(verboseMap[xAxisLabel])
  ) {
    xAxisLabel = verboseMap[xAxisLabel];
  }

  // Temporary debug to check xAxisLabel vs actual data field
  if (data1Raw.length > 0) {
    console.log('DEBUG: xAxisLabel =', xAxisLabel);
    console.log('DEBUG: Available keys =', Object.keys(data1Raw[0]));
    console.log('DEBUG: data1Raw[0][xAxisLabel] =', data1Raw[0][xAxisLabel]);
    console.log('DEBUG: data1Raw[0].month =', data1Raw[0].month);
  }

  const rebasedDataA = rebaseForecastDatum(data1, verboseMap || {});
  const [rawSeriesA] = extractSeries(rebasedDataA, {
    fillNeighborValue: stack ? 0 : undefined,
    xAxis: xAxisLabel,
  });
  const rebasedDataB = rebaseForecastDatum(data2, verboseMap || {});
  const [rawSeriesB] = extractSeries(rebasedDataB, {
    fillNeighborValue: stackB ? 0 : undefined,
    xAxis: xAxisLabel,
  });
  const rebasedDataC = rebaseForecastDatum(data3, verboseMap || {});
  const [rawSeriesC] = extractSeries(rebasedDataC, {
    fillNeighborValue: stackC ? 0 : undefined,
    xAxis: xAxisLabel,
  });

  const dataTypes = getColtypesMapping(queriesData[0]);
  const xAxisDataType = dataTypes?.[xAxisLabel] ?? dataTypes?.[xAxisOrig];
  const xAxisType = getAxisType(stack, xAxisForceCategorical, xAxisDataType);

  // Определяем форматтеры раньше для использования в трансформации
  const tooltipFormatter =
    xAxisDataType === GenericDataType.Temporal
      ? getTooltipTimeFormatter(tooltipTimeFormat)
      : String;
  const xAxisFormatter =
    xAxisDataType === GenericDataType.Temporal
      ? getXAxisFormatter(xAxisTimeFormat)
      : String;

  let transformedXAxisType = xAxisType;

  // Если disable_time_grain включен, принудительно используем категориальную ось
  if (actualDisableTimeGrain && xAxisType === AxisType.Time) {
    transformedXAxisType = AxisType.Category;
    console.log('=== Forcing Category Axis ===');
    console.log('Changed X-axis type from Time to Category due to disable_time_grain');
  }

  const series: SeriesOption[] = [];
  const formatter = contributionMode
    ? getNumberFormatter(',.0%')
    : currencyFormat?.symbol
      ? new CurrencyFormatter({
        d3Format: yAxisFormat,
        currency: currencyFormat,
      })
      : getNumberFormatter(yAxisFormat);
  const formatterSecondary = contributionMode
    ? getNumberFormatter(',.0%')
    : currencyFormatSecondary?.symbol
      ? new CurrencyFormatter({
        d3Format: yAxisFormatSecondary,
        currency: currencyFormatSecondary,
      })
      : getNumberFormatter(yAxisFormatSecondary);
  const customFormatters = buildCustomFormatters(
    [...ensureIsArray(metrics), ...ensureIsArray(metricsB)],
    currencyFormats,
    columnFormats,
    yAxisFormat,
    currencyFormat,
  );
  const customFormattersSecondary = buildCustomFormatters(
    [...ensureIsArray(metrics), ...ensureIsArray(metricsB)],
    currencyFormats,
    columnFormats,
    yAxisFormatSecondary,
    currencyFormatSecondary,
  );

  const primarySeries = new Set<string>();
  const secondarySeries = new Set<string>();
  const mapSeriesIdToAxis = (
    seriesOption: SeriesOption,
    index?: number,
  ): void => {
    if (index === 1) {
      secondarySeries.add(seriesOption.id as string);
    } else {
      primarySeries.add(seriesOption.id as string);
    }
  };
  rawSeriesA.forEach(seriesOption =>
    mapSeriesIdToAxis(seriesOption, yAxisIndex),
  );
  rawSeriesB.forEach(seriesOption =>
    mapSeriesIdToAxis(seriesOption, yAxisIndexB),
  );
  const showValueIndexesA = extractShowValueIndexes(rawSeriesA, {
    stack,
  });
  const showValueIndexesB = extractShowValueIndexes(rawSeriesB, {
    stack,
  });
  const showValueIndexesC = extractShowValueIndexes(rawSeriesC, { stack: stackC });

  const { totalStackedValues, thresholdValues } = extractDataTotalValues(
    rebasedDataA,
    {
      stack,
      percentageThreshold,
      xAxisCol: xAxisLabel,
    },
  );
  const {
    totalStackedValues: totalStackedValuesB,
    thresholdValues: thresholdValuesB,
  } = extractDataTotalValues(rebasedDataB, {
    stack: Boolean(stackB),
    percentageThreshold,
    xAxisCol: xAxisLabel,
  });

  const { totalStackedValues: totalStackedValuesC, thresholdValues: thresholdValuesC } =
    extractDataTotalValues(rebasedDataC, {
      stack: Boolean(stackC),
      percentageThreshold,
      xAxisCol: xAxisLabel,
    });

  annotationLayers
    .filter((layer: AnnotationLayer) => layer.show)
    .forEach((layer: AnnotationLayer) => {
      if (isFormulaAnnotationLayer(layer))
        series.push(
          transformFormulaAnnotation(
            layer,
            data1,
            xAxisLabel,
            xAxisType,
            colorScale,
            sliceId,
          ),
        );
      else if (isIntervalAnnotationLayer(layer)) {
        series.push(
          ...transformIntervalAnnotation(
            layer,
            data1,
            annotationData,
            colorScale,
            theme,
            sliceId,
          ),
        );
      } else if (isEventAnnotationLayer(layer)) {
        series.push(
          ...transformEventAnnotation(
            layer,
            data1,
            annotationData,
            colorScale,
            theme,
            sliceId,
          ),
        );
      } else if (isTimeseriesAnnotationLayer(layer)) {
        series.push(
          ...transformTimeseriesAnnotation(
            layer,
            markerSize,
            data1,
            annotationData,
            colorScale,
            sliceId,
          ),
        );
      }
    });

  // yAxisBounds need to be parsed to replace incompatible values with undefined
  const [xAxisMin, xAxisMax] = (xAxisBounds || []).map(parseAxisBound);
  
  // Debug информация для понимания проблем с пустыми пространствами
  // console.log('=== AXIS BOUNDS DEBUG ===');
  // console.log('Original xAxisBounds:', xAxisBounds);
  // console.log('Parsed xAxisMin:', xAxisMin, 'xAxisMax:', xAxisMax);
  // console.log('data1 length:', data1.length);
  // console.log('hideEmptyMonths:', hideEmptyMonths);
  // console.log('data1Raw length before transformation:', data1Raw.length);
  // console.log('mixedTimeTransformation result:', mixedTimeTransformation ? {
  //   useCategoryAxis: mixedTimeTransformation.useCategoryAxis,
  //   transformedDataLength: mixedTimeTransformation.transformedData.length,
  //   originalDataLength: data1Raw.length
  // } : 'no transformation applied');
  
  if (data1.length > 0) {
    // console.log('First 3 data1 points:', data1.slice(0, 3).map(row => ({
    //   date: row[xAxisLabel],
    //   values: Object.keys(row).filter(key => key !== xAxisLabel).map(key => `${key}: ${row[key]}`)
    // })));
    // console.log('Last 3 data1 points:', data1.slice(-3).map(row => ({
    //   date: row[xAxisLabel],
    //   values: Object.keys(row).filter(key => key !== xAxisLabel).map(key => `${key}: ${row[key]}`)
    // })));
  }
  // console.log('transformedXAxisType:', transformedXAxisType);
  // console.log('mixedTimeTransformation?.useCategoryAxis:', mixedTimeTransformation?.useCategoryAxis);
  // console.log('truncateXAxis:', truncateXAxis);
  let [yAxisMin, yAxisMax] = (yAxisBounds || []).map(parseAxisBound);
  let [minSecondary, maxSecondary] = (yAxisBoundsSecondary || []).map(
    parseAxisBound,
  );

  const array = ensureIsArray(chartProps.rawFormData?.time_compare);
  const inverted = invert(verboseMap || {});

  rawSeriesA.forEach(entry => {
    const entryName = String(entry.name || '');
    const seriesName = inverted[entryName] || entryName;
    const colorScaleKey = getOriginalSeries(seriesName, array);

    const seriesFormatter = getFormatter(
      customFormatters,
      formatter,
      metrics,
      labelMap?.[seriesName]?.[0],
      !!contributionMode,
    );

    const transformedSeries = transformSeries(
      entry,
      colorScale,
      colorScaleKey,
      {
        area,
        markerEnabled,
        markerSize,
        areaOpacity: opacity,
        seriesType,
        showValue,
        stack: Boolean(stack),
        stackIdSuffix: '\na',
        yAxisIndex,
        filterState,
        seriesKey: entry.name,
        sliceId,
        queryIndex: 0,
        formatter:
          seriesType === EchartsTimeseriesSeriesType.Bar
            ? getOverMaxHiddenFormatter({
              max: yAxisMax,
              formatter: seriesFormatter,
            })
            : seriesFormatter,
        showValueIndexes: showValueIndexesA,
        totalStackedValues,
        thresholdValues,
      },
    );
    if (transformedSeries) series.push(transformedSeries);
  });

  rawSeriesB.forEach(entry => {
    const entryName = String(entry.name || '');
    const seriesEntry = inverted[entryName] || entryName;
    const seriesName = `${seriesEntry} (1)`;
    const colorScaleKey = getOriginalSeries(seriesEntry, array);

    const seriesFormatter = getFormatter(
      customFormattersSecondary,
      formatterSecondary,
      metricsB,
      labelMapB?.[seriesName]?.[0],
      !!contributionMode,
    );

    const transformedSeries = transformSeries(
      entry,
      colorScale,
      colorScaleKey,
      {
        area: areaB,
        markerEnabled: markerEnabledB,
        markerSize: markerSizeB,
        areaOpacity: opacityB,
        seriesType: seriesTypeB,
        showValue: showValueB,
        stack: Boolean(stackB),
        stackIdSuffix: '\nb',
        yAxisIndex: yAxisIndexB,
        filterState,
        seriesKey: primarySeries.has(entry.name as string)
          ? `${entry.name} (1)`
          : entry.name,
        sliceId,
        queryIndex: 1,
        formatter:
          seriesTypeB === EchartsTimeseriesSeriesType.Bar
            ? getOverMaxHiddenFormatter({
              max: maxSecondary,
              formatter: seriesFormatter,
            })
            : seriesFormatter,
        showValueIndexes: showValueIndexesB,
        totalStackedValues: totalStackedValuesB,
        thresholdValues: thresholdValuesB,
      },
    );
    if (transformedSeries) series.push(transformedSeries);
  });

  // Код для C
  rawSeriesC.forEach(entry => {
    const entryName = String(entry.name || '');
    const seriesEntry = inverted[entryName] || entryName;
    const seriesName = `${seriesEntry} (2)`;
    const colorScaleKey = getOriginalSeries(seriesEntry, array);

    const seriesFormatter = getFormatter(
      customFormattersSecondary,
      formatterSecondary,
      metricsC,
      Array.isArray(labelMapC?.[seriesName]) ? labelMapC?.[seriesName]?.[0] : undefined,
      !!contributionMode,
    );

    const transformedSeries = transformSeries(entry, colorScale, colorScaleKey, {
      area: areaC,
      markerEnabled: markerEnabledC,
      markerSize: markerSizeC,
      areaOpacity: opacityC,
      seriesType: seriesTypeC,
      showValue: showValueC,
      stack: Boolean(stackC),
      stackIdSuffix: '\nc',
      yAxisIndex: yAxisIndexC, // если хотите отдельную ось Y, иначе можно reuse
      filterState,
      seriesKey: entry.name,
      sliceId,
      queryIndex: 2, // для C
      formatter: seriesFormatter,
      showValueIndexes: showValueIndexesC,
      totalStackedValues: totalStackedValuesC,
      thresholdValues: thresholdValuesC,
    });
    if (transformedSeries) series.push(transformedSeries);
  });

  // default to 0-100% range when doing row-level contribution chart
  if (contributionMode === 'row' && stack) {
    if (yAxisMin === undefined) yAxisMin = 0;
    if (yAxisMax === undefined) yAxisMax = 1;
    if (minSecondary === undefined) minSecondary = 0;
    if (maxSecondary === undefined) maxSecondary = 1;
  }


  const addYAxisTitleOffset = !!(yAxisTitle || yAxisTitleSecondary);
  const addXAxisTitleOffset = !!xAxisTitle;

  const chartPadding = getPadding(
    showLegend,
    legendOrientation,
    addYAxisTitleOffset,
    zoomable,
    null,
    addXAxisTitleOffset,
    yAxisTitlePosition,
    convertInteger(yAxisTitleMargin),
    convertInteger(xAxisTitleMargin),
  );

  const { setDataMask = () => { }, onContextMenu } = hooks;
  const alignTicks = yAxisIndex !== yAxisIndexB;


  const echartOptions: EChartsCoreOption = {
    useUTC: true,
    grid: {
      ...defaultGrid,
      ...chartPadding,
    },
    xAxis: {
      type: transformedXAxisType,
      name: xAxisTitle,
      nameGap: convertInteger(xAxisTitleMargin),
      nameLocation: 'middle',
      axisLabel: (() => {
        // Специальная обработка для actualDisableTimeGrain
        if (actualDisableTimeGrain && transformedXAxisType === AxisType.Category) {
          return {
            formatter: (value: any) => {
              const timestamp = parseInt(value);
              if (isNaN(timestamp)) return value;
              
              const date = new Date(timestamp);
              const month = date.getMonth() + 1;
              
              // Определяем это годовые данные (январь) или месячные
              const isYearly = month === 1 && date.getDate() === 1;
              
              return formatCustomDate(timestamp, isYearly);
            },
            rotate: xAxisLabelRotation,
            interval: 0,
            showMinLabel: false,
            showMaxLabel: false,
          };
        }

        return {
          formatter: typeof xAxisFormatter === 'function' ? xAxisFormatter : undefined,
          rotate: xAxisLabelRotation,
          interval: 'auto',
          showMinLabel: false,
          showMaxLabel: false,
        };
      })(),
      minorTick: { show: minorTicks },
      minInterval:
        transformedXAxisType === AxisType.Time &&
          timeGrainSqla &&
          !actualDisableTimeGrain &&
          TIMEGRAIN_TO_TIMESTAMP.hasOwnProperty(timeGrainSqla)
          ? (() => {
              const interval = TIMEGRAIN_TO_TIMESTAMP[timeGrainSqla as keyof typeof TIMEGRAIN_TO_TIMESTAMP];
              console.log('=== minInterval calculation ===');
              console.log('transformedXAxisType:', transformedXAxisType);
              console.log('timeGrainSqla:', timeGrainSqla);
              console.log('actualDisableTimeGrain:', actualDisableTimeGrain);
              console.log('Final interval:', interval);
              return interval;
            })()
          : (() => {
              console.log('=== minInterval set to 0 ===');
              console.log('Conditions not met or actualDisableTimeGrain is true');
              return 0;
            })(),
      ...(() => {
        const bounds = getMinAndMaxFromBounds(
          transformedXAxisType,
          truncateXAxis,
          xAxisMin,
          xAxisMax,
          seriesType === EchartsTimeseriesSeriesType.Bar ||
            seriesTypeB === EchartsTimeseriesSeriesType.Bar
            ? EchartsTimeseriesSeriesType.Bar
            : undefined,
        );
        
        // Для временных осей автоматически устанавливаем границы по фактическим данным
        if (transformedXAxisType === AxisType.Time && data1.length > 0) {
          try {
            const firstDate = data1[0]?.[xAxisLabel];
            const lastDate = data1[data1.length - 1]?.[xAxisLabel];
            
            if (!firstDate || !lastDate) {
              console.warn('Missing date values in data1:', { firstDate, lastDate });
              return bounds;
            }
            
            const actualMin = new Date(firstDate as string).getTime();
            const actualMax = new Date(lastDate as string).getTime();
            
            if (isNaN(actualMin) || isNaN(actualMax)) {
              console.warn('Invalid dates:', { firstDate, lastDate, actualMin, actualMax });
              return bounds;
            }
            
            return {
              ...bounds,
              min: bounds.min !== undefined ? bounds.min : actualMin,
              max: bounds.max !== undefined ? bounds.max : actualMax,
              boundaryGap: false,
            };
          } catch (error) {
            console.error('Error processing time bounds:', error);
            return bounds;
          }
        }
        
        return bounds;
      })(),
    },
    yAxis: [
      {
        ...defaultYAxis,
        type: logAxis ? 'log' : 'value',
        min: yAxisMin,
        max: yAxisMax,
        minorTick: { show: minorTicks },
        minorSplitLine: { show: minorSplitLine },
        axisLabel: {
          formatter: getYAxisFormatter(
            metrics,
            !!contributionMode,
            customFormatters,
            formatter,
            yAxisFormat,
          ),
        },
        scale: truncateYAxis,
        name: yAxisTitle,
        nameGap: convertInteger(yAxisTitleMargin),
        nameLocation: yAxisTitlePosition === 'Left' ? 'middle' : 'end',
        alignTicks,
      },
      {
        ...defaultYAxis,
        type: logAxisSecondary ? 'log' : 'value',
        min: minSecondary,
        max: maxSecondary,
        minorTick: { show: minorTicks },
        splitLine: { show: false },
        minorSplitLine: { show: minorSplitLine },
        axisLabel: {
          formatter: getYAxisFormatter(
            metricsB,
            !!contributionMode,
            customFormattersSecondary,
            formatterSecondary,
            yAxisFormatSecondary,
          ),
        },
        scale: truncateYAxis,
        name: yAxisTitleSecondary,
        alignTicks,
      },
    ],
    tooltip: {
      ...getDefaultTooltip(refs),
      show: !inContextMenu,
      trigger: richTooltip ? 'axis' : 'item',
      formatter: (params: any) => {
        const xValue: number = richTooltip
          ? params[0].value[0]
          : params.value[0];
        const forecastValue: any[] = richTooltip ? params : [params];

        if (richTooltip && tooltipSortByMetric) {
          forecastValue.sort((a, b) => b.data[1] - a.data[1]);
        }

        const formattedValue = tooltipFormatter(xValue);
        
        const rows: Array<string> = [`${formattedValue}`];
        const forecastValues =
          extractForecastValuesFromTooltipParams(forecastValue);

        Object.keys(forecastValues).forEach(key => {
          const value = forecastValues[key];
          // if there are no dimensions, key is a verbose name of a metric,
          // otherwise it is a comma separated string where the first part is metric name
          let formatterKey;
          if (primarySeries.has(key)) {
            formatterKey =
              groupby.length === 0 ? inverted[key] : labelMap[key]?.[0];
          } else {
            formatterKey =
              groupbyB.length === 0 ? inverted[key] : labelMapB[key]?.[0];
          }
          const metricTooltipFormatter = getFormatter(
            customFormatters,
            formatter,
            metrics,
            formatterKey,
            !!contributionMode,
          );
          const metricTooltipFormatterSecondary = getFormatter(
            customFormattersSecondary,
            formatterSecondary,
            metricsB,
            formatterKey,
            !!contributionMode,
          );
          const content = formatForecastTooltipSeries({
            ...value,
            seriesName: key,
            formatter: primarySeries.has(key)
              ? metricTooltipFormatter
              : metricTooltipFormatterSecondary,
          });
          const contentStyle =
            key === focusedSeries ? 'font-weight: 700' : 'opacity: 0.7';
          rows.push(`<span style="${contentStyle}">${content}</span>`);
        });
        return rows.join('<br />');
      },
    },
    legend: {
      ...getLegendProps(
        legendType,
        legendOrientation,
        showLegend,
        theme,
        zoomable,
      ),
      // @ts-ignore
      data: rawSeriesA
        .concat(rawSeriesB)
        .concat(rawSeriesC)
        .filter(
          entry =>
            extractForecastSeriesContext((entry.name || '') as string).type ===
            ForecastSeriesEnum.Observation,
        )
        .map(entry => entry.name || '')
        .concat(extractAnnotationLabels(annotationLayers, annotationData)),
    },
    series: dedupSeries(series),
    toolbox: {
      show: zoomable,
      top: TIMESERIES_CONSTANTS.toolboxTop,
      right: TIMESERIES_CONSTANTS.toolboxRight,
      feature: {
        dataZoom: {
          yAxisIndex: false,
          title: {
            zoom: 'zoom area',
            back: 'restore zoom',
          },
        },
      },
    },
    dataZoom: zoomable
      ? [
        {
          type: 'slider',
          start: TIMESERIES_CONSTANTS.dataZoomStart,
          end: TIMESERIES_CONSTANTS.dataZoomEnd,
          bottom: TIMESERIES_CONSTANTS.zoomBottom,
        },
      ]
      : [],
  };


  const onFocusedSeries = (seriesName: string | null) => {
    focusedSeries = seriesName;
  };

  return {
    queriesData,
    formData,
    width,
    height,
    echartOptions,
    setDataMask,
    emitCrossFilters,
    labelMap,
    labelMapB,
    labelMapC,
    groupby,
    groupbyB,
    seriesBreakdown: rawSeriesA.length,
    selectedValues: filterState.selectedValues || [],
    onContextMenu,
    onFocusedSeries,
    xValueFormatter: tooltipFormatter,
    xAxis: {
      label: xAxisLabel,
      type: transformedXAxisType,
    },
    refs,
    coltypeMapping,
  };
}
