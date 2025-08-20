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
import React from 'react';
import { t, validateNonEmpty } from '@superset-ui/core';
import {
  ControlPanelConfig,
  ControlSubSectionHeader,
  sharedControls,
} from '@superset-ui/chart-controls';
import { showValueControl } from '../controls';

const config: ControlPanelConfig = {
  controlPanelSections: [
    {
      label: t('Query'),
      expanded: true,
      controlSetRows: [
        [
          {
            name: 'category_column',
            config: {
              ...sharedControls.groupby,
              label: t('Category Column'),
              description: t('Column containing category names for the tornado chart'),
              multi: false,
              validators: [validateNonEmpty],
            },
          },
        ],
        [
          {
            name: 'left_metric',
            config: {
              ...sharedControls.metric,
              label: t('Left Side Metric'),
              description: t('Metric for the left side of the tornado chart'),
              validators: [validateNonEmpty],
            },
          },
        ],
        [
          {
            name: 'right_metric',
            config: {
              ...sharedControls.metric,
              label: t('Right Side Metric'),
              description: t('Metric for the right side of the tornado chart'),
              validators: [validateNonEmpty],
            },
          },
        ],
        ['adhoc_filters'],
        ['row_limit'],
      ],
    },
    {
      label: t('Chart Options'),
      expanded: true,
      controlSetRows: [
        [showValueControl],
        [
          {
            name: 'show_legend',
            config: {
              type: 'CheckboxControl',
              label: t('Show Legend'),
              renderTrigger: true,
              default: true,
              description: t('Whether to display a legend for the chart'),
            },
          },
        ],
        [
          {
            name: 'sort_by_impact',
            config: {
              type: 'CheckboxControl',
              label: t('Sort by Impact'),
              renderTrigger: true,
              default: true,
              description: t('Sort categories by impact (difference between metrics)'),
            },
          },
        ],
        [
          {
            name: 'show_absolute_values',
            config: {
              type: 'CheckboxControl',
              label: t('Show Absolute Values'),
              renderTrigger: true,
              default: true,
              description: t('Display absolute values on the X-axis'),
            },
          },
        ],
        [
          {
            name: 'impact_threshold',
            config: {
              type: 'TextControl',
              label: t('Impact Threshold'),
              renderTrigger: true,
              default: '0',
              description: t('Minimum impact to display a category'),
              isInt: true,
            },
          },
        ],
        [
          <ControlSubSectionHeader>
            {t('Axis Labels')}
          </ControlSubSectionHeader>,
        ],
        [
          {
            name: 'x_axis_title',
            config: {
              type: 'TextControl',
              label: t('X Axis Title'),
              renderTrigger: true,
              default: '',
              description: t('Custom title for X axis'),
            },
          },
        ],
        [
          {
            name: 'left_legend_name',
            config: {
              type: 'TextControl',
              label: t('Left Legend Name'),
              renderTrigger: true,
              default: 'Base Cost',
              description: t('Custom name for left side legend'),
            },
          },
        ],
        [
          {
            name: 'right_legend_name',
            config: {
              type: 'TextControl',
              label: t('Right Legend Name'),
              renderTrigger: true,
              default: 'Target Cost',
              description: t('Custom name for right side legend'),
            },
          },
        ],
        [
          <ControlSubSectionHeader>
            {t('Chart Colors')}
          </ControlSubSectionHeader>,
        ],
        [
          {
            name: 'left_color',
            config: {
              label: t('Left Side Color'),
              type: 'ColorPickerControl',
              default: { r: 224, g: 67, b: 85, a: 1 },
              renderTrigger: true,
            },
          },
          {
            name: 'right_color',
            config: {
              label: t('Right Side Color'),
              type: 'ColorPickerControl',
              default: { r: 90, g: 193, b: 137, a: 1 },
              renderTrigger: true,
            },
          },
        ],
        [<ControlSubSectionHeader>{t('X Axis')}</ControlSubSectionHeader>],
        [
          {
            name: 'x_axis_label',
            config: {
              type: 'TextControl',
              label: t('X Axis Label'),
              renderTrigger: true,
              default: '',
            },
          },
        ],
        [<ControlSubSectionHeader>{t('Y Axis')}</ControlSubSectionHeader>],
        [
          {
            name: 'category_label',
            config: {
              type: 'TextControl',
              label: t('Category Label'),
              renderTrigger: true,
              default: '',
            },
          },
        ],
        [
          {
            name: 'y_axis_label',
            config: {
              type: 'TextControl',
              label: t('Y Axis Label'),
              renderTrigger: true,
              default: '',
            },
          },
        ],
        ['y_axis_format'],
        ['currency_format'],
      ],
    },
  ],
  controlOverrides: {
    category_column: {
      label: t('Category'),
      description: t('Select the column that contains category names'),
      multi: false,
    },
  },
};

export default config;
