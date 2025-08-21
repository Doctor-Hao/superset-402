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
import {
  ensureIsArray,
  isAdhocColumn,
  isPhysicalColumn,
  QueryFormMetric,
  smartDateFormatter,
  t,
  validateNonEmpty,
} from '@superset-ui/core';
import {
  ControlPanelConfig,
  D3_TIME_FORMAT_OPTIONS,
  sharedControls,
  Dataset,
  getStandardizedControls,
} from '@superset-ui/chart-controls';
import { MetricsLayoutEnum } from '../types';

const config: ControlPanelConfig = {
  controlPanelSections: [
    {
      label: t('Query'),
      expanded: true,
      controlSetRows: [
        [
          {
            name: 'groupbyColumns',
            config: {
              ...sharedControls.groupby,
              label: t('Columns'),
              description: t('Columns to group by on the columns'),
            },
          },
        ],
        [
          {
            name: 'groupbyRows',
            config: {
              ...sharedControls.groupby,
              label: t('Rows'),
              description: t('Columns to group by on the rows'),
            },
          },
        ],
        [
          {
            name: 'time_grain_sqla',
            config: {
              ...sharedControls.time_grain_sqla,
              visibility: ({ controls }) => {
                const dttmLookup = Object.fromEntries(
                  ensureIsArray(controls?.groupbyColumns?.options).map(
                    option => [option.column_name, option.is_dttm],
                  ),
                );

                return [
                  ...ensureIsArray(controls?.groupbyColumns.value),
                  ...ensureIsArray(controls?.groupbyRows.value),
                ]
                  .map(selection => {
                    if (isAdhocColumn(selection)) {
                      return true;
                    }
                    if (isPhysicalColumn(selection)) {
                      return !!dttmLookup[selection];
                    }
                    return false;
                  })
                  .some(Boolean);
              },
            },
          },
          'temporal_columns_lookup',
        ],
        [
          {
            name: 'metrics',
            config: {
              ...sharedControls.metrics,
              validators: [validateNonEmpty],
              rerender: ['conditional_formatting'],
            },
          },
        ],
        [
          {
            name: 'metricsLayout',
            config: {
              type: 'RadioButtonControl',
              renderTrigger: true,
              label: t('Apply metrics on'),
              default: MetricsLayoutEnum.COLUMNS,
              options: [
                [MetricsLayoutEnum.COLUMNS, t('Columns')],
                [MetricsLayoutEnum.ROWS, t('Rows')],
              ],
              description: t(
                'Use metrics as a top level group for columns or for rows',
              ),
            },
          },
        ],
        ['adhoc_filters'],
        ['series_limit'],
        [
          {
            name: 'row_limit',
            config: {
              ...sharedControls.row_limit,
              label: t('Cell limit'),
              description: t('Limits the number of cells that get retrieved.'),
            },
          },
        ],
        // TODO(kgabryje): add series_columns control after control panel is redesigned to avoid clutter
        [
          {
            name: 'series_limit_metric',
            config: {
              ...sharedControls.series_limit_metric,
              description: t(
                'Metric used to define how the top series are sorted if a series or cell limit is present. ' +
                'If undefined reverts to the first metric (where appropriate).',
              ),
            },
          },
        ],
        [
          {
            name: 'order_desc',
            config: {
              type: 'CheckboxControl',
              label: t('Sort Descending'),
              default: true,
              description: t('Whether to sort descending or ascending'),
            },
          },
        ],
      ],
    },
    {
      label: t('Pivot Options'),
      expanded: false,
      controlSetRows: [
        [
          {
            name: 'aggregateFunction',
            config: {
              type: 'SelectControl',
              label: t('Aggregation function'),
              clearable: false,
              choices: [
                ['Count', t('Count')],
                ['Count Unique Values', t('Count Unique Values')],
                ['List Unique Values', t('List Unique Values')],
                ['Sum', t('Sum')],
                ['Average', t('Average')],
                ['Median', t('Median')],
                ['Sample Variance', t('Sample Variance')],
                ['Sample Standard Deviation', t('Sample Standard Deviation')],
                ['Minimum', t('Minimum')],
                ['Maximum', t('Maximum')],
                ['First', t('First')],
                ['Last', t('Last')],
                ['Sum as Fraction of Total', t('Sum as Fraction of Total')],
                ['Sum as Fraction of Rows', t('Sum as Fraction of Rows')],
                ['Sum as Fraction of Columns', t('Sum as Fraction of Columns')],
                ['Count as Fraction of Total', t('Count as Fraction of Total')],
                ['Count as Fraction of Rows', t('Count as Fraction of Rows')],
                [
                  'Count as Fraction of Columns',
                  t('Count as Fraction of Columns'),
                ],
              ],
              default: 'Sum',
              description: t(
                'Aggregate function to apply when pivoting and computing the total rows and columns',
              ),
              renderTrigger: true,
            },
          },
        ],
        [
          {
            name: 'rowTotals',
            config: {
              type: 'CheckboxControl',
              label: t('Show rows total'),
              default: false,
              renderTrigger: true,
              description: t('Display row level total'),
            },
          },
        ],
        [
          {
            name: 'rowSubTotals',
            config: {
              type: 'CheckboxControl',
              label: t('Show rows subtotal'),
              default: false,
              renderTrigger: true,
              description: t('Display row level subtotal'),
            },
          },
        ],
        [
          {
            name: 'colTotals',
            config: {
              type: 'CheckboxControl',
              label: t('Show columns total'),
              default: false,
              renderTrigger: true,
              description: t('Display column level total'),
            },
          },
        ],
        [
          {
            name: 'colSubTotals',
            config: {
              type: 'CheckboxControl',
              label: t('Show columns subtotal'),
              default: false,
              renderTrigger: true,
              description: t('Display column level subtotal'),
            },
          },
        ],
        [
          {
            name: 'transposePivot',
            config: {
              type: 'CheckboxControl',
              label: t('Transpose pivot'),
              default: false,
              description: t('Swap rows and columns'),
              renderTrigger: true,
            },
          },
        ],
        [
          {
            name: 'combineMetric',
            config: {
              type: 'CheckboxControl',
              label: t('Combine metrics'),
              default: false,
              description: t(
                'Display metrics side by side within each column, as ' +
                'opposed to each column being displayed side by side for each metric.',
              ),
              renderTrigger: true,
            },
          },
        ],
        [
          {
            name: 'dragAndDropConfig',
            config: {
              type: 'TextAreaControl',
              label: t('Drag and Drop Configuration'),
              default: JSON.stringify({ enabled: false, columnsDragEnabled: true, rowsDragEnabled: true }, null, 2),
              description: t(
                'JSON configuration for drag and drop functionality. Example: {"enabled": true, "columnsDragEnabled": true, "rowsDragEnabled": true}'
              ),
              renderTrigger: true,
              resetOnHide: false,
              language: 'json',
              validators: [
                (value: string) => {
                  try {
                    const parsed = JSON.parse(value || '{}');
                    if (typeof parsed !== 'object' || parsed === null) {
                      return t('Must be a valid JSON object');
                    }
                    if (parsed.enabled !== undefined && typeof parsed.enabled !== 'boolean') {
                      return t('enabled must be a boolean');
                    }
                    if (parsed.columnsDragEnabled !== undefined && typeof parsed.columnsDragEnabled !== 'boolean') {
                      return t('columnsDragEnabled must be a boolean');
                    }
                    if (parsed.rowsDragEnabled !== undefined && typeof parsed.rowsDragEnabled !== 'boolean') {
                      return t('rowsDragEnabled must be a boolean');
                    }
                    return false;
                  } catch (e) {
                    return t('Invalid JSON format');
                  }
                }
              ]
            },
          },
        ],
      ],
    },
    {
      label: t('Chart Options'),
      expanded: false,
      controlSetRows: [
        [
          {
            name: 'metricHeaderTreeJson',
            config: {
              type: 'TextAreaControl',
              label: t('Header (2 levels) JSON'),
              default: ``,
              description: t('JSON with { groups: [{ title, subgroups:[{title,count}] }] }'),
              renderTrigger: true,
              resetOnHide: false,
              language: 'json',
            },
          }
        ],
        [
          {
            name: 'platformMapping',
            config: {
              type: 'TextAreaControl',
              label: t('Platform to Header Mapping'),
              description: t('Platform to Header Mapping with "from → to" format. Array of rules: [{"from": {"level1": "Начальные запасы", "level3": "Геологические", "platform": "PS2"}, "to": {"level2": "Другой газ"}}]. "from" specifies source location (level1-3, platform, metric, conditions), "to" specifies target (level1-3). Note: level4 = metrics, order preserved from Header JSON.'),
              default: '[]',
              language: 'json',
              renderTrigger: true,
              resetOnHide: false,
              validators: [
                (value: string) => {
                  try {
                    const parsed = JSON.parse(value || '[]');
                    if (!Array.isArray(parsed)) {
                      return t('Must be a valid JSON array');
                    }
                    return false;
                  } catch (e) {
                    return t('Invalid JSON format');
                  }
                }
              ]
            },
          },
        ],
        [
          {
            name: 'excludeColumnsRules',
            config: {
              type: 'TextAreaControl',
              label: t('Exclude columns rules'),
              description: t('JSON: [{"when": {...}, "set": {...}}].'),
              default: '[]',
              language: 'json',
              renderTrigger: true,
              resetOnHide: false,
            },
          },
        ],
        [
          {
            name: 'columnReorderHelper',
            config: {
              type: 'InfoTooltipControl',
              label: t('Column Reordering Rules'),
              tooltip: t('You can only move columns within the same group. Groups are determined by the header tree structure (level1 → level2 → level3). Moving columns between different groups is not allowed and will show warnings in the browser console.'),
              placement: 'right',
              trigger: 'click'
            },
          },
        ],
      ],
    },
    {
      label: t('Formatting'),
      expanded: false,
      controlSetRows: [
        [
          {
            name: 'valueFormat',
            config: {
              ...sharedControls.y_axis_format,
              label: t('Value format'),
            },
          },
        ],
        ['currency_format'],
        [
          {
            name: 'date_format',
            config: {
              type: 'SelectControl',
              freeForm: true,
              label: t('Date format'),
              default: smartDateFormatter.id,
              renderTrigger: true,
              choices: D3_TIME_FORMAT_OPTIONS,
              description: t('D3 time format for datetime columns'),
            },
          },
        ],
        [
          {
            name: 'rowOrder',
            config: {
              type: 'SelectControl',
              label: t('Sort rows by'),
              default: 'key_a_to_z',
              choices: [
                // [value, label]
                ['key_a_to_z', t('key a-z')],
                ['key_z_to_a', t('key z-a')],
                ['value_a_to_z', t('value ascending')],
                ['value_z_to_a', t('value descending')],
              ],
              renderTrigger: true,
              description: (
                <>
                  <div>{t('Change order of rows.')}</div>
                  <div>{t('Available sorting modes:')}</div>
                  <ul>
                    <li>{t('By key: use row names as sorting key')}</li>
                    <li>{t('By value: use metric values as sorting key')}</li>
                  </ul>
                </>
              ),
            },
          },
        ],
        [
          {
            name: 'colOrder',
            config: {
              type: 'SelectControl',
              label: t('Sort columns by'),
              default: 'key_a_to_z',
              choices: [
                // [value, label]
                ['key_a_to_z', t('key a-z')],
                ['key_z_to_a', t('key z-a')],
                ['value_a_to_z', t('value ascending')],
                ['value_z_to_a', t('value descending')],
              ],
              renderTrigger: true,
              description: (
                <>
                  <div>{t('Change order of columns.')}</div>
                  <div>{t('Available sorting modes:')}</div>
                  <ul>
                    <li>{t('By key: use column names as sorting key')}</li>
                    <li>{t('By value: use metric values as sorting key')}</li>
                  </ul>
                </>
              ),
            },
          },
        ],
        [
          {
            name: 'rowSubtotalPosition',
            config: {
              type: 'SelectControl',
              label: t('Rows subtotal position'),
              default: false,
              choices: [
                // [value, label]
                [true, t('Top')],
                [false, t('Bottom')],
              ],
              renderTrigger: true,
              description: t('Position of row level subtotal'),
            },
          },
        ],
        [
          {
            name: 'colSubtotalPosition',
            config: {
              type: 'SelectControl',
              label: t('Columns subtotal position'),
              default: false,
              choices: [
                // [value, label]
                [true, t('Left')],
                [false, t('Right')],
              ],
              renderTrigger: true,
              description: t('Position of column level subtotal'),
            },
          },
        ],
        [
          {
            name: 'conditional_formatting',
            config: {
              type: 'ConditionalFormattingControl',
              renderTrigger: true,
              label: t('Conditional formatting'),
              description: t('Apply conditional color formatting to metrics'),
              mapStateToProps(explore, _, chart) {
                const values =
                  (explore?.controls?.metrics?.value as QueryFormMetric[]) ??
                  [];
                const verboseMap = explore?.datasource?.hasOwnProperty(
                  'verbose_map',
                )
                  ? (explore?.datasource as Dataset)?.verbose_map
                  : explore?.datasource?.columns ?? {};
                const chartStatus = chart?.chartStatus;
                const metricColumn = values.map(value => {
                  if (typeof value === 'string') {
                    return { value, label: verboseMap[value] ?? value };
                  }
                  return { value: value.label, label: value.label };
                });
                return {
                  removeIrrelevantConditions: chartStatus === 'success',
                  columnOptions: metricColumn,
                  verboseMap,
                };
              },
            },
          },
        ],
      ],
    },
    {
      label: t('External API Columns'),
      expanded: false,
      controlSetRows: [
        [
          {
            name: 'externalApiColumns',
            config: {
              type: 'TextAreaControl',
              label: t('External API Columns Configuration'),
              description: t('JSON configuration for external API columns with editable fields support. Example with editable columns: {"apiUrl": "https://api.example.com/data/{id}", "patchApiUrl": "https://api.example.com/data/{id}", "idColumn": "user_id", "columns": [{"name": "user_name", "label": "Name", "apiKey": "name", "editable": true, "inputType": "text", "placeholder": "Enter name"}, {"name": "user_email", "label": "Email", "apiKey": "email", "editable": true, "inputType": "email", "validation": {"required": true, "pattern": "^[^@]+@[^@]+\\.[^@]+$"}}]}'),
              default: JSON.stringify({
                apiUrl: "",
                patchApiUrl: "",
                idColumn: "",
                columns: [],
                headers: {},
                timeout: 10000,
                retryCount: 3,
                patchMethod: "PATCH",
                refreshAfterUpdate: false
              }, null, 2),
              renderTrigger: true,
              resetOnHide: false,
              language: 'json',
              validators: [
                (value: string) => {
                  try {
                    const parsed = JSON.parse(value || '{}');
                    if (typeof parsed !== 'object' || parsed === null) {
                      return t('Must be a valid JSON object');
                    }
                    if (parsed.apiUrl && typeof parsed.apiUrl !== 'string') {
                      return t('apiUrl must be a string');
                    }
                    if (parsed.idColumn && typeof parsed.idColumn !== 'string') {
                      return t('idColumn must be a string');
                    }
                    if (parsed.columns && !Array.isArray(parsed.columns)) {
                      return t('columns must be an array');
                    }
                    if (parsed.columns) {
                      for (const col of parsed.columns) {
                        if (!col.name || typeof col.name !== 'string') {
                          return t('Each column must have a name (string)');
                        }
                        if (!col.label || typeof col.label !== 'string') {
                          return t('Each column must have a label (string)');
                        }
                        if (!col.apiKey || typeof col.apiKey !== 'string') {
                          return t('Each column must have an apiKey (string)');
                        }
                      }
                    }
                    if (parsed.timeout && (typeof parsed.timeout !== 'number' || parsed.timeout <= 0)) {
                      return t('timeout must be a positive number');
                    }
                    if (parsed.retryCount && (typeof parsed.retryCount !== 'number' || parsed.retryCount < 0)) {
                      return t('retryCount must be a non-negative number');
                    }
                    if (parsed.patchMethod && !['PATCH', 'PUT', 'POST'].includes(parsed.patchMethod)) {
                      return t('patchMethod must be one of: PATCH, PUT, POST');
                    }
                    return false;
                  } catch (e) {
                    return t('Invalid JSON format');
                  }
                }
              ]
            },
          },
        ],
        [
          {
            name: 'externalApiInfo',
            config: {
              type: 'InfoTooltipControl',
              label: t('External API Configuration Help'),
              tooltip: t(`
                Configure external API columns with editable fields support:
                
                • apiUrl: GET endpoint with {id} placeholder for fetching data
                • patchApiUrl: PATCH/PUT/POST endpoint for updating data (optional)
                • idColumn: Column name containing IDs for API requests
                • columns: Array of column definitions with:
                  - name: Internal column name
                  - label: Display name in table
                  - apiKey: Key in API response
                  - editable: Enable inline editing (boolean)
                  - inputType: Input type (text, number, email)
                  - placeholder: Input placeholder text
                  - validation: Validation rules (required, minLength, maxLength, pattern)
                  - defaultValue: Value when API fails
                • headers: HTTP headers for requests (optional)
                • timeout: Request timeout in milliseconds (default: 10000)
                • retryCount: Number of retry attempts (default: 3)
                • patchMethod: HTTP method for updates (PATCH, PUT, POST)
                • refreshAfterUpdate: Refresh data after successful update
                
                Example URLs:
                - GET: https://api.example.com/user/{id}
                - PATCH: https://api.example.com/user/{id}
              `),
              placement: 'right',
              trigger: 'click'
            },
          },
        ],
      ],
    },
  ],
  controlOverrides: {
    // Убедимся, что платформенные контролы не попадают в data tab
  },
  formDataOverrides: formData => {
    const groupbyColumns = getStandardizedControls().controls.columns.filter(
      col => !ensureIsArray(formData.groupbyRows).includes(col),
    );
    getStandardizedControls().controls.columns =
      getStandardizedControls().controls.columns.filter(
        col => !groupbyColumns.includes(col),
      );
    return {
      ...formData,
      metrics: getStandardizedControls().popAllMetrics(),
      groupbyColumns,
    };
  },
};

export default config;
