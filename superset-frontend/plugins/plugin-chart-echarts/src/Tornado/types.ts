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
  ChartDataResponseResult,
  ChartProps,
  QueryFormColumn,
  QueryFormData,
  QueryFormMetric,
  RgbaColor,
} from '@superset-ui/core';
import { BarDataItemOption } from 'echarts/types/src/chart/bar/BarSeries';
import { CallbackDataParams } from 'echarts/types/src/util/types';
import { BaseTransformedProps, LegendFormData } from '../types';

export type TornadoFormXTicksLayout =
  | '45°'
  | '90°'
  | 'auto'
  | 'flat'
  | 'staggered';

/**
 * Extended bar data item with tornado-specific properties
 */
export type ITornadoSeriesData = {
  /** Original value before transformation */
  originalValue?: number;
  /** Category name */
  category?: string;
  /** Impact value (difference between metrics) */
  impact?: number;
} & BarDataItemOption;

/**
 * Callback data parameters for tornado chart interactions
 */
export type ITornadoCallbackDataParams = CallbackDataParams & {
  /** Label for axis value */
  axisValueLabel: string;
  /** Tornado-specific data */
  data: ITornadoSeriesData;
};

/**
 * Form data configuration for Tornado chart
 */
export type EchartsTornadoFormData = QueryFormData &
  LegendFormData & {
    /** Color for left side bars */
    leftColor: RgbaColor;
    /** Color for right side bars */
    rightColor: RgbaColor;
    /** Metric displayed on left side */
    left_metric: QueryFormMetric;
    /** Metric displayed on right side */
    right_metric: QueryFormMetric;
    /** Column used for categories */
    category_column: QueryFormColumn;
    /** Custom label for categories */
    category_label: string;
    /** Custom label for x-axis */
    x_axis_label: string;
    /** Custom title for x-axis */
    x_axis_title?: string;
    /** Custom label for y-axis */
    y_axis_label: string;
    /** Format string for y-axis values */
    y_axis_format: string;
    /** Custom name for left legend */
    left_legend_name?: string;
    /** Custom name for right legend */
    right_legend_name?: string;
    /** Whether to sort by impact */
    sort_by_impact: boolean;
    /** Whether to show absolute values */
    show_absolute_values: boolean;
    /** Minimum impact threshold */
    impact_threshold?: number;
  };

export const DEFAULT_FORM_DATA: Partial<EchartsTornadoFormData> = {
  showLegend: true,
  sort_by_impact: true,
  show_absolute_values: true,
};

/**
 * Props interface for Tornado chart component
 */
export interface EchartsTornadoChartProps extends ChartProps {
  /** Form configuration data */
  formData: EchartsTornadoFormData;
  /** Query results data */
  queriesData: ChartDataResponseResult[];
}

/**
 * Transformed properties for Tornado chart rendering
 */
export type TornadoChartTransformedProps =
  BaseTransformedProps<EchartsTornadoFormData>;
