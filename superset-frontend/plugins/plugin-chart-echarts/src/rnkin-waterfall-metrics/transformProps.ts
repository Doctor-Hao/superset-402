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
import {
  CurrencyFormatter,
  DataRecord,
  ensureIsArray,
  GenericDataType,
  getMetricLabel,
  getNumberFormatter,
  getTimeFormatter,
  isAdhocColumn,
  NumberFormatter,
  rgbToHex,
  SupersetTheme,
  NumberFormats
} from '@superset-ui/core';
import { EChartsOption, BarSeriesOption } from 'echarts';
import {
  EchartsWaterfallChartProps,
  ISeriesData,
  WaterfallChartTransformedProps,
  ICallbackDataParams,
} from './types';
import { getDefaultTooltip } from '../utils/tooltip';
import { defaultGrid, defaultYAxis } from '../defaults';
import { ASSIST_MARK, LEGEND, TOKEN, TOTAL_MARK } from './constants';
import { getColtypesMapping } from '../utils/series';
import { Refs } from '../types';
import { NULL_STRING } from '../constants';

function formatTooltip({
  theme,
  params,
  breakdownName,
  defaultFormatter,
  xAxisFormatter,
}: {
  theme: SupersetTheme;
  params: ICallbackDataParams[];
  breakdownName?: string;
  defaultFormatter: NumberFormatter | CurrencyFormatter;
  xAxisFormatter: (value: number | string, index: number) => string;
}) {
  const series = params.find(
    param => param.seriesName !== ASSIST_MARK && param.data.value !== TOKEN,
  );

  // We may have no matching series depending on the legend state
  if (!series) {
    return '';
  }

  const isTotal = series?.seriesName === LEGEND.TOTAL;
  if (!series) {
    return NULL_STRING;
  }

  const createRow = (name: string, value: string) => `
    <div>
      <span style="
        font-size:${theme.typography.sizes.m}px;
        color:${theme.colors.grayscale.base};
        font-weight:${theme.typography.weights.normal};
        margin-left:${theme.gridUnit * 0.5}px;"
      >
        ${name}:
      </span>
      <span style="
        float:right;
        margin-left:${theme.gridUnit * 5}px;
        font-size:${theme.typography.sizes.m}px;
        color:${theme.colors.grayscale.base};
        font-weight:${theme.typography.weights.bold}"
      >
        ${value}
      </span>
    </div>
  `;

  let result = '';
  if (!isTotal || breakdownName) {
    result = xAxisFormatter(series.name, series.dataIndex);
  }
  if (!isTotal) {
    result += createRow(
      series.seriesName!,
      defaultFormatter(series.data.originalValue),
    );
  }
  result += createRow(TOTAL_MARK, defaultFormatter(series.data.totalSum));
  return result;
}

function transformer({
  data,
  metrics,
}: {
  data: DataRecord[]; // ожидаем, что data содержит одну строку с результатами
  metrics: Array<string | { label: string }>; // массив выбранных метрик
}) {
  // Получаем первую (и единственную) строку данных
  const rowData = data[0] || {};

  // Для каждой метрики формируем объект с именем и значением
  return metrics.map(metric => {
    const metricLabel = typeof metric === 'string' ? metric : metric.label;
    return {
      name: metricLabel,
      value: rowData[metricLabel] || 0,
    };
  });
}

export default function transformProps(chartProps: any) {
  const { formData, queriesData, width, height } = chartProps;
  const {
    metrics,
    yAxisFormat,
    increaseColor = { r: 90, g: 193, b: 137, a: 1 },
    decreaseColor = { r: 224, g: 67, b: 85, a: 1 },
    totalColor = { r: 102, g: 102, b: 102, a: 1 },
    showValue,
    showLegend,
    xAxisLabel,
    xTicksLayout,
    yAxisLabel,
  } = formData;

  // Извлекаем первую строку данных из первого запроса
  const rowData =
    queriesData &&
      queriesData.length > 0 &&
      queriesData[0].data &&
      queriesData[0].data[0]
      ? queriesData[0].data[0]
      : {};

  const numberFormatter = getNumberFormatter(yAxisFormat);

  // Формируем массив объектов { name, value } для каждой метрики
  const seriesData = metrics.map((metric: any) => {
    const metricLabel = typeof metric === 'string' ? metric : metric.label;
    return {
      name: metricLabel,
      value: rowData[metricLabel] || 0,
    };
  });

  // Вычисляем кумулятивную сумму для эффекта Waterfall (без итоговой колонки)
  let cumulative = 0;
  const assistData: number[] = [];
  const changeData: Array<number | { value: number; itemStyle: { color: string } }> = [];
  const categories: string[] = [];

  seriesData.forEach((item) => {
    categories.push(item.name);
    assistData.push(cumulative);
    // Определяем цвет столбца: если значение положительное – increaseColor, иначе decreaseColor
    const barColor =
      item.value >= 0
        ? rgbToHex(increaseColor.r, increaseColor.g, increaseColor.b)
        : rgbToHex(decreaseColor.r, decreaseColor.g, decreaseColor.b);
    changeData.push({
      value: item.value,
      itemStyle: { color: barColor },
    });
    cumulative += item.value;
  });

  // Определяем параметры для оси X, в частности поворот подписей
  let xAxisLabelProps: { rotate?: number; hideOverlap?: boolean } = {};
  if (xTicksLayout === '45°') {
    xAxisLabelProps = { rotate: -45, hideOverlap: false };
  } else if (xTicksLayout === '90°') {
    xAxisLabelProps = { rotate: -90, hideOverlap: false };
  } else if (xTicksLayout === 'staggered') {
    xAxisLabelProps = { rotate: -45, hideOverlap: false };
  } else if (xTicksLayout === 'flat') {
    xAxisLabelProps = { rotate: 0, hideOverlap: false };
  } else {
    // auto
    xAxisLabelProps = { rotate: 0, hideOverlap: false };
  }

  // Формируем опции ECharts для Waterfall-диаграммы с настройками осей
  const echartOptions = {
    legend: {
      show: showLegend,
      data: ['Assist', 'Change'],
    },
    title: {
      text: xAxisLabel, // текст заголовка оси X
      left: 'center',   // по центру по горизонтали
      top: '0%',        // расположить вверху (можно настроить отступы через nameGap или textStyle)
      textStyle: { fontSize: 14 },
    },
    xAxis: {
      type: 'category',
      data: categories,
      axisLabel: {
        ...xAxisLabelProps,
      },
    },
    yAxis: {
      type: 'value',
      name: yAxisLabel,
      axisLabel: {
        formatter: (value: number) => numberFormatter(value),
      },
    },
    series: [
      {
        name: 'Assist',
        type: 'bar',
        stack: 'total',
        itemStyle: { color: 'transparent' },
        emphasis: { itemStyle: { color: 'transparent' } },
        data: assistData,
      },
      {
        name: 'Change',
        type: 'bar',
        stack: 'total',
        label: {
          show: true, // подписи всегда видны
          position: 'top',
          formatter: (params: any) => numberFormatter(params.value),
        },
        data: changeData,
      },
    ],
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      formatter: (params: any) => {
        let tooltipText = '';
        params.forEach((item: any) => {
          tooltipText += `${item.seriesName}: ${numberFormatter(item.value)}<br/>`;
        });
        return tooltipText;
      },
    },
  };

  return {
    width,
    height,
    formData,
    queriesData,
    echartOptions,
  };
}







