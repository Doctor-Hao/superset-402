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
  getMetricLabel,
  getNumberFormatter,
  NumberFormatter,
  rgbToHex,
  SupersetTheme,
  isAdhocColumn,
} from '@superset-ui/core';
import { EChartsOption, BarSeriesOption } from 'echarts';
import {
  EchartsTornadoChartProps,
  ITornadoSeriesData,
  TornadoChartTransformedProps,
  ITornadoCallbackDataParams,
} from './types';
import { getDefaultTooltip } from '../utils/tooltip';
import { defaultGrid } from '../defaults';
import { TORNADO_LEGEND } from './constants';
import { Refs } from '../types';
import { NULL_STRING } from '../constants';

/**
 * Represents a data point in the tornado chart
 * @interface TornadoDataPoint
 */
interface TornadoDataPoint {
  /** Category name for the y-axis */
  category: string;
  /** Value for the left side of the tornado */
  leftValue: number;
  /** Value for the right side of the tornado */
  rightValue: number;
  /** Impact value (absolute difference between left and right) */
  impact: number;
}

/**
 * Formats the tooltip content for tornado chart
 * @param {Object} options - Formatting options
 * @param {SupersetTheme} options.theme - Superset theme configuration
 * @param {ITornadoCallbackDataParams[]} options.params - Chart callback parameters
 * @param {NumberFormatter | CurrencyFormatter} options.defaultFormatter - Number formatter
 * @returns {string} Formatted HTML tooltip content
 */
function formatTooltip({
  theme,
  params,
  defaultFormatter,
}: {
  theme: SupersetTheme;
  params: ITornadoCallbackDataParams[];
  defaultFormatter: NumberFormatter | CurrencyFormatter;
}) {
  const series = params.find(param => param.data.value !== undefined);
  
  if (!series) {
    return '';
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

  let result = `<strong>${series.name}</strong><br/>`;
  result += createRow('Category', series.data.category || '');
  result += createRow('Value', defaultFormatter(Math.abs(series.data.originalValue || 0)));
  
  if (series.data.impact !== undefined) {
    result += createRow('Impact', defaultFormatter(series.data.impact));
  }
  
  return result;
}

/**
 * Transforms raw data into tornado chart format
 * @param {Object} options - Transformation options
 * @param {DataRecord[]} options.data - Raw data from query
 * @param {string} options.leftMetricLabel - Label for left metric
 * @param {string} options.rightMetricLabel - Label for right metric
 * @param {string} options.categoryField - Category field name
 * @param {boolean} options.sortByImpact - Whether to sort by impact
 * @param {number} options.impactThreshold - Minimum impact to include
 * @returns {TornadoDataPoint[]} Transformed data points
 */
function transformTornadoData({
  data,
  leftMetricLabel,
  rightMetricLabel,
  categoryField,
  sortByImpact,
  impactThreshold,
}: {
  data: DataRecord[];
  leftMetricLabel: string;
  rightMetricLabel: string;
  categoryField: string;
  sortByImpact: boolean;
  impactThreshold: number;
}): TornadoDataPoint[] {
  const transformedData: TornadoDataPoint[] = data.map(row => {
    const category = String(row[categoryField] || NULL_STRING);
    const leftValue = Number(row[leftMetricLabel]) || 0;
    const rightValue = Number(row[rightMetricLabel]) || 0;
    const impact = Math.abs(rightValue - leftValue);
    
    console.log('Processing row:', {
      category,
      leftValue,
      rightValue,
      impact,
      rawRow: row
    });
    
    return {
      category,
      leftValue,
      rightValue,
      impact,
    };
  }).filter(item => item.impact >= impactThreshold);
  
  console.log('Transformed data:', transformedData);
  
  if (transformedData.length === 0) {
    console.warn('Tornado Chart: No data after filtering. Check impact_threshold:', impactThreshold);
    
    // If filtering by impact results in no data, try showing all data regardless of impact
    const allData = data.map(row => {
      const category = String(row[categoryField] || NULL_STRING);
      const leftValue = Number(row[leftMetricLabel]) || 0;
      const rightValue = Number(row[rightMetricLabel]) || 0;
      const impact = Math.abs(rightValue - leftValue);
      
      return {
        category,
        leftValue,
        rightValue,
        impact,
      };
    });
    
    console.log('Showing all data (ignoring threshold):', allData);
    return allData.length > 0 ? allData : transformedData;
  }

  if (sortByImpact) {
    transformedData.sort((a, b) => b.impact - a.impact);
  }

  return transformedData;
}

/**
 * Main transformation function that converts chart properties to ECharts options
 * @param {EchartsTornadoChartProps} chartProps - Raw chart properties from Superset
 * @returns {TornadoChartTransformedProps} Transformed properties for ECharts rendering
 */
export default function transformProps(
  chartProps: EchartsTornadoChartProps,
): TornadoChartTransformedProps {
  console.log('transformProps called with:', chartProps);
  const {
    width,
    height,
    formData,
    legendState,
    queriesData,
    hooks,
    theme,
    inContextMenu,
  } = chartProps;

  const refs: Refs = {};
  const { data = [] } = queriesData[0];
  const { setDataMask = () => {}, onContextMenu, onLegendStateChanged } = hooks;
  const {
    currencyFormat,
    leftColor = { r: 224, g: 67, b: 85 },
    rightColor = { r: 90, g: 193, b: 137 },
    left_metric,
    right_metric,
    leftMetric, // camelCase version
    rightMetric, // camelCase version
    category_column,
    categoryColumn, // camelCase version
    category_label,
    x_axis_label,
    x_axis_title,
    xAxisTitle, // camelCase version
    y_axis_label,
    y_axis_format,
    left_legend_name = 'Base Cost',
    leftLegendName, // camelCase version
    right_legend_name = 'Target Cost', 
    rightLegendName, // camelCase version
    showLegend,
    sort_by_impact = true,
    show_absolute_values = true,
    impact_threshold = 0,
    showValue,
  } = formData;
  
  // Handle both snake_case and camelCase field names
  const categoryCol = category_column || categoryColumn;
  const categoryField = typeof categoryCol === 'string' 
    ? categoryCol 
    : isAdhocColumn(categoryCol)
    ? categoryCol?.label || 'category'
    : 'category';
    
  // Handle legend names and axis titles
  const finalXAxisTitle = x_axis_title || xAxisTitle || x_axis_label;
  const finalLeftLegendName = left_legend_name || leftLegendName || 'Base Cost';
  const finalRightLegendName = right_legend_name || rightLegendName || 'Target Cost';

  console.log('Form data extracted:', {
    left_metric,
    right_metric, 
    category_column,
    categoryColumn,
    x_axis_title,
    xAxisTitle,
    left_legend_name,
    leftLegendName,
    right_legend_name,
    rightLegendName,
    currencyFormat,
    y_axis_format,
    data_sample: data.slice(0, 2)
  });
  
  console.log('Final values:', {
    finalXAxisTitle,
    finalLeftLegendName,
    finalRightLegendName
  });

  const defaultFormatter = currencyFormat?.symbol
    ? new CurrencyFormatter({ d3Format: y_axis_format, currency: currencyFormat })
    : getNumberFormatter(y_axis_format);

  // Handle both snake_case and camelCase field names for metrics
  const leftMetricValue = left_metric || leftMetric;
  const rightMetricValue = right_metric || rightMetric;
  
  let leftMetricLabel = leftMetricValue ? getMetricLabel(leftMetricValue) : '';
  let rightMetricLabel = rightMetricValue ? getMetricLabel(rightMetricValue) : '';
  
  // If metrics are not configured, try to auto-detect from data columns
  if (!leftMetricLabel && !rightMetricLabel && data.length > 0) {
    const numericColumns = Object.keys(data[0]).filter(key => 
      key !== categoryField && typeof data[0][key] === 'number'
    );
    
    console.log('Auto-detecting metrics from columns:', numericColumns);
    
    if (numericColumns.length >= 2) {
      leftMetricLabel = numericColumns[0];
      rightMetricLabel = numericColumns[1];
      console.log('Using auto-detected metrics:', { leftMetricLabel, rightMetricLabel });
    }
  }

  if (!leftMetricLabel || !rightMetricLabel) {
    console.warn('Tornado Chart: Missing metrics', { 
      leftMetricLabel, 
      rightMetricLabel, 
      left_metric, 
      right_metric,
      availableColumns: data.length > 0 ? Object.keys(data[0]) : []
    });
    return {
      refs,
      formData,
      width,
      height,
      echartOptions: {},
      setDataMask,
      onContextMenu,
      onLegendStateChanged,
    };
  }

  console.log('Tornado Chart Data:', {
    dataLength: data.length,
    leftMetricLabel,
    rightMetricLabel,
    categoryField,
    sampleData: data.slice(0, 3)
  });

  const tornadoData = transformTornadoData({
    data,
    leftMetricLabel,
    rightMetricLabel,
    categoryField,
    sortByImpact: sort_by_impact,
    impactThreshold: impact_threshold,
  });

  // Create series data - align bars at the same level (zero baseline)
  const categories = tornadoData.map(item => item.category);
  const leftSideData: ITornadoSeriesData[] = tornadoData.map(item => ({
    value: -Math.abs(item.leftValue), // Always negative for left side
    originalValue: item.leftValue,
    category: item.category,
    impact: item.impact,
  }));
  const rightSideData: ITornadoSeriesData[] = tornadoData.map(item => ({
    value: Math.abs(item.rightValue), // Always positive for right side
    originalValue: item.rightValue,
    category: item.category,
    impact: item.impact,
  }));

  const seriesformatter = (params: ITornadoCallbackDataParams) => {
    const { data } = params;
    const value = show_absolute_values 
      ? Math.abs(data.originalValue || 0)
      : (data.originalValue || 0);
    return defaultFormatter(value);
  };

  const barSeries: BarSeriesOption[] = [
    {
      name: finalLeftLegendName,
      type: 'bar',
      stack: 'tornado', // Same stack to align on same level
      data: leftSideData,
      itemStyle: {
        color: rgbToHex(leftColor.r, leftColor.g, leftColor.b),
      },
      label: {
        show: showValue,
        position: 'left',
        formatter: seriesformatter,
      },
    },
    {
      name: finalRightLegendName,
      type: 'bar',
      stack: 'tornado', // Same stack to align on same level
      data: rightSideData,
      itemStyle: {
        color: rgbToHex(rightColor.r, rightColor.g, rightColor.b),
      },
      label: {
        show: showValue,
        position: 'right',
        formatter: seriesformatter,
      },
    },
  ];

  const echartOptions: EChartsOption = {
    grid: {
      ...defaultGrid,
      top: theme.gridUnit * 7,
      bottom: theme.gridUnit * 7,
      left: theme.gridUnit * 20, // More space for category labels
      right: theme.gridUnit * 7,
    },
    legend: {
      show: showLegend,
      selected: legendState,
      data: [finalLeftLegendName, finalRightLegendName],
    },
    xAxis: {
      type: 'value',
      name: finalXAxisTitle,
      nameTextStyle: {
        padding: [theme.gridUnit * 4, 0, 0, 0],
      },
      nameLocation: 'middle',
      axisLabel: {
        formatter: (value: number) => {
          const absValue = show_absolute_values ? Math.abs(value) : value;
          return defaultFormatter(absValue);
        },
      },
      splitLine: {
        show: true,
        lineStyle: {
          type: 'dashed',
        },
      },
    },
    yAxis: {
      type: 'category',
      data: categories,
      name: category_label || y_axis_label,
      nameTextStyle: {
        padding: [0, 0, 0, theme.gridUnit * 5],
      },
      nameLocation: 'start', // Position name at the top
      axisLabel: {
        interval: 0, // Show all labels
      },
      inverse: false, // Categories from top to bottom
    },
    tooltip: {
      ...getDefaultTooltip(refs),
      appendToBody: true,
      trigger: 'axis',
      show: !inContextMenu,
      formatter: (params: any) =>
        formatTooltip({
          theme,
          params,
          defaultFormatter,
        }),
    },
    series: barSeries,
  };

  return {
    refs,
    formData,
    width,
    height,
    echartOptions,
    setDataMask,
    onContextMenu,
    onLegendStateChanged,
  };
}