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

const getFormatter = (
  customFormatters: Record<string, ValueFormatter>,
  defaultFormatter: ValueFormatter,
  metrics: QueryFormMetric[],
  formatterKey: string,
  forcePercentFormat: boolean,
) => {
  if (forcePercentFormat) {
    return getNumberFormatter(',.0%');
  }
  return (
    getCustomFormatter(customFormatters, metrics, formatterKey) ??
    defaultFormatter
  );
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
    datasource,
    theme,
    inContextMenu,
    emitCrossFilters,
  } = chartProps;

  let focusedSeries: string | null = null;

  const {
    verboseMap = {},
    currencyFormats = {},
    columnFormats = {},
  } = datasource;
  const { label_map: labelMap } =
    queriesData[0] as TimeseriesChartDataResponseResult;
  const { label_map: labelMapB } =
    queriesData[1] as TimeseriesChartDataResponseResult;

  const data1 = (queriesData[0].data || []) as TimeseriesDataRecord[];
  const data2 = (queriesData[1].data || []) as TimeseriesDataRecord[];

  let data3: TimeseriesDataRecord[] = [];
  let labelMapC: Record<string, unknown> | undefined;
  if (queriesData.length > 2 && queriesData[2]?.data) {
    data3 = queriesData[2].data as TimeseriesDataRecord[];
    labelMapC = (queriesData[2] as TimeseriesChartDataResponseResult).label_map;
  }
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
    groupbyC,
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
    chartComments,
  }: EchartsMixedTimeseriesFormData = { ...DEFAULT_FORM_DATA, ...formData };

  const refs: Refs = {};
  const colorScale = CategoricalColorNamespace.getScale(colorScheme as string);

  let xAxisLabel = getXAxisLabel(
    chartProps.rawFormData as QueryFormData,
  ) as string;
  if (
    isPhysicalColumn(chartProps.rawFormData?.x_axis) &&
    isDefined(verboseMap[xAxisLabel])
  ) {
    xAxisLabel = verboseMap[xAxisLabel];
  }

  const rebasedDataA = rebaseForecastDatum(data1, verboseMap);
  const [rawSeriesA] = extractSeries(rebasedDataA, {
    fillNeighborValue: stack ? 0 : undefined,
    xAxis: xAxisLabel,
  });
  const rebasedDataB = rebaseForecastDatum(data2, verboseMap);
  const [rawSeriesB] = extractSeries(rebasedDataB, {
    fillNeighborValue: stackB ? 0 : undefined,
    xAxis: xAxisLabel,
  });
  const rebasedDataC = rebaseForecastDatum(data3, verboseMap);
  const [rawSeriesC] = extractSeries(rebasedDataC, {
    fillNeighborValue: stackC ? 0 : undefined,
    xAxis: xAxisLabel,
  });

  const dataTypes = getColtypesMapping(queriesData[0]);
  const xAxisDataType = dataTypes?.[xAxisLabel] ?? dataTypes?.[xAxisOrig];
  const xAxisType = getAxisType(stack, xAxisForceCategorical, xAxisDataType);
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
  let [yAxisMin, yAxisMax] = (yAxisBounds || []).map(parseAxisBound);
  let [minSecondary, maxSecondary] = (yAxisBoundsSecondary || []).map(
    parseAxisBound,
  );

  const array = ensureIsArray(chartProps.rawFormData?.time_compare);
  const inverted = invert(verboseMap);

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
      labelMapC?.[seriesName]?.[0],
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

  const tooltipFormatter =
    xAxisDataType === GenericDataType.Temporal
      ? getTooltipTimeFormatter(tooltipTimeFormat)
      : String;
  const xAxisFormatter =
    xAxisDataType === GenericDataType.Temporal
      ? getXAxisFormatter(xAxisTimeFormat)
      : String;

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
      type: xAxisType,
      name: xAxisTitle,
      nameGap: convertInteger(xAxisTitleMargin),
      nameLocation: 'middle',
      axisLabel: {
        formatter: xAxisFormatter,
        rotate: xAxisLabelRotation,
      },
      minorTick: { show: minorTicks },
      minInterval:
        xAxisType === AxisType.Time && timeGrainSqla
          ? TIMEGRAIN_TO_TIMESTAMP[timeGrainSqla]
          : 0,
      ...getMinAndMaxFromBounds(
        xAxisType,
        truncateXAxis,
        xAxisMin,
        xAxisMax,
        seriesType === EchartsTimeseriesSeriesType.Bar ||
          seriesTypeB === EchartsTimeseriesSeriesType.Bar
          ? EchartsTimeseriesSeriesType.Bar
          : undefined,
      ),
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

        const rows: Array<string> = [`${tooltipFormatter(xValue)}`];
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
          const tooltipFormatter = getFormatter(
            customFormatters,
            formatter,
            metrics,
            formatterKey,
            !!contributionMode,
          );
          const tooltipFormatterSecondary = getFormatter(
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
              ? tooltipFormatter
              : tooltipFormatterSecondary,
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

  // парсинг JSON из chartComments
  let commentsArray: Array<{ text: string; x: number; y: number }> = [];
  if (chartComments) {
    try {
      commentsArray = JSON.parse(chartComments);
      if (!Array.isArray(commentsArray)) {
        // Если пользователь ввёл не массив — игнорируем
        commentsArray = [];
      }
    } catch (err) {
      // Ошибка парсинга, значит оставляем пустой массив
      commentsArray = [];
    }
  }

  // Формируем массив "graphic" для каждого комментария
  // Каждый комментарий — это group из прямоугольника + текста
  const commentGraphics = commentsArray.map((comment, idx) => {
    const { text, x, y } = comment;

    // Ширину/высоту прямоугольника можно делать динамически,
    // но для простоты берём фиксированные 200x40
    return {
      type: 'group',
      // Позиция всей группы относительно левого/верхнего угла:
      left: x,  // px
      top: y,   // px
      // Массив элементов внутри
      children: [
        {
          type: 'rect',
          shape: { x: 0, y: 0, width: 200, height: 40 },
          style: {
            fill: '#fff',
            stroke: '#000',
            lineWidth: 1,
          },
        },
        {
          type: 'text',
          style: {
            text,
            x: 10,
            y: 10,
            fill: '#000',
          },
        },
      ],
    };
  });

  const onFocusedSeries = (seriesName: string | null) => {
    focusedSeries = seriesName;
  };

  // 💡 если позиции переданы через перетаскивание — приоритетнее
  const updatedPositions = Array.isArray(filterState.value)
    ? filterState.value
    : [
      { text: formData.comment1 || '', x: 100, y: -100 },
      { text: formData.comment2 || '', x: 100, y: -200 },
    ];

  const commentPositions = updatedPositions;

  echartOptions.graphic = (echartOptions.graphic || []).concat(commentGraphics);
  return {
    formData: {
      ...formData,
      commentPositions,
    },
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
      type: xAxisType,
    },
    refs,
    coltypeMapping,
  };
}
