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
import { t } from '@superset-ui/core';
import {
  ColumnOption,
  ControlPanelConfig,
  ControlSubSectionHeader,
  D3_TIME_FORMAT_DOCS,
  DEFAULT_TIME_FORMAT,
  formatSelectOptions,
  sharedControls,
} from '@superset-ui/chart-controls';
import { showValueControl } from '../controls';

const config: ControlPanelConfig = {
  controlPanelSections: [
    {
      label: t('Настройки для сравнения вариантов'),
      expanded: false,
      controlSetRows: [
        [
          {
            name: 'compareTwoVariants',
            config: {
              type: 'CheckboxControl',
              label: t('Режим сравнения 2-х вариантов'),
              description: t(
                'Если включено, первый и последний выбранные вариант ' +
                'будут стоять по краям, а факторы — между ними',
              ),
              default: false,
              renderTrigger: true,
            },
          },
        ],
        [
          {
            name: 'compareThreeVariants',
            config: {
              type: 'CheckboxControl',
              label: t('Режим сравнения 3-х вариантов'),
              description: t(
                'Если включено, будут сравниваться три варианта: первый, последний и средний',
              ),
              default: false,
              renderTrigger: true,
            },
          },
        ],
      ],
    },
    {
      label: t('Настройки для Δ'),
      expanded: false,
      controlSetRows: [
        [
          {
            name: 'showDeltaArrow',
            config: {
              type: 'CheckboxControl',
              label: t('Показывать стрелку суммирующую дельту'),
              description: t(
                'Если включено, будут стрелки суммирующую дельту',
              ),
              default: true,
              renderTrigger: true,
            },
          },
        ],
        [
          {
            name: 'deltaDecimals',
            config: {
              type: 'TextControl', // вводим число знаков
              isInt: true,
              default: '2',
              label: t('Δ: знаков после запятой'),
              description: t('Сколько цифр оставлять после запятой в значении Δ и процентах'),
              renderTrigger: true,
            },
          },
        ],
        [
          {
            name: 'deltaUnit',
            config: {
              type: 'TextControl',
              default: 'руб.',
              label: t('Δ: единица измерения'),
              description: t('Например «млн руб.» — будет добавлено сразу после числа'),
              renderTrigger: true,
            },
          },
        ],
      ],
    },
    // {
    //   label: t('Настройки'),
    //   expanded: false,
    //   controlSetRows: [
    //     [
    //       {
    //         name: 'hideTotalColumn',
    //         config: {
    //           type: 'CheckboxControl',
    //           label: t('Скрыть последнюю колонку Total'),
    //           description: t(
    //             'Если отмечено, финальная суммарная колонка не будет отображаться на графике.',
    //           ),
    //           default: false,
    //           renderTrigger: true,
    //         },
    //       },
    //     ],
    //     [
    //       {
    //         name: 'useCustomTemplate',
    //         config: {
    //           type: 'CheckboxControl',
    //           label: t('Использовать шаблон для сравнения двух вариантов'),
    //           description: t(
    //             'Если отмечено, будет применен предопределенный шаблон для ECharts'
    //           ),
    //           default: false,
    //           renderTrigger: true,
    //         },
    //       },
    //     ],
    //     [
    //       {
    //         name: 'comparisonColumn1',
    //         config: {
    //           type: 'TextControl', // Можно заменить на NumberControl, если он у вас доступен
    //           label: t('Индекс первого столбца'),
    //           renderTrigger: true,
    //           default: '0',
    //           description: t('Введите индекс столбца, который будет отображаться первым.'),
    //         },
    //       },
    //       {
    //         name: 'comparisonColumn2',
    //         config: {
    //           type: 'TextControl', // Аналогично, можно использовать NumberControl
    //           label: t('Индекс второго столбца'),
    //           renderTrigger: true,
    //           default: '0',
    //           description: t('Введите индекс столбца, который будет отображаться последним.'),
    //         },
    //       },
    //     ],
    //   ],
    // },
    {
      label: t('Customize'),
      expanded: true,
      controlSetRows: [
      ],
    },
    {
      label: t('Query'),
      expanded: true,
      controlSetRows: [
        ['x_axis'],
        ['time_grain_sqla'],
        ['groupby'],
        ['metric'],
        ['adhoc_filters'],
        [
          {
            name: 'sort_column',
            config: {
              type: 'DndColumnSelect',
              label: t('Колонка сортировки'),
              description: t(
                'Выберите колонку или метрику, по значениям которой будут '
                + 'отсортированы столбики waterfall-графика.',
              ),
              multi: false,
              default: null,
              optionRenderer: c => <ColumnOption showType column={c} />,
              valueRenderer: c => <ColumnOption column={c} />,
              mapStateToProps: ({ datasource }) => ({
                options: datasource?.columns || [],
              }),
              renderTrigger: true,
            },
          },
        ],
        [
          {
            name: 'sort_desc',
            config: {
              type: 'CheckboxControl',
              label: t('По убыванию'),
              default: false,
              renderTrigger: true,
            },
          },
        ],
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
              label: t('Show legend'),
              renderTrigger: true,
              default: false,
              description: t('Whether to display a legend for the chart'),
            },
          },
        ],
        [
          <ControlSubSectionHeader>
            {t('Series colors')}
          </ControlSubSectionHeader>,
        ],
        [
          {
            name: 'increase_color',
            config: {
              label: t('Increase'),
              type: 'ColorPickerControl',
              default: { r: 90, g: 193, b: 137, a: 1 },
              renderTrigger: true,
            },
          },
          {
            name: 'decrease_color',
            config: {
              label: t('Decrease'),
              type: 'ColorPickerControl',
              default: { r: 224, g: 67, b: 85, a: 1 },
              renderTrigger: true,
            },
          },
          {
            name: 'total_color',
            config: {
              label: t('Total'),
              type: 'ColorPickerControl',
              default: { r: 102, g: 102, b: 102, a: 1 },
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
        [
          {
            name: 'x_axis_time_format',
            config: {
              ...sharedControls.x_axis_time_format,
              default: DEFAULT_TIME_FORMAT,
              description: `${D3_TIME_FORMAT_DOCS}.`,
            },
          },
        ],
        [
          {
            name: 'x_ticks_layout',
            config: {
              type: 'SelectControl',
              label: t('X Tick Layout'),
              choices: formatSelectOptions([
                'auto',
                'flat',
                '45°',
                '90°',
                'staggered',
              ]),
              default: 'auto',
              clearable: false,
              renderTrigger: true,
              description: t('The way the ticks are laid out on the X-axis'),
            },
          },
        ],
        [<ControlSubSectionHeader>{t('Y Axis')}</ControlSubSectionHeader>],
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
    groupby: {
      label: t('Breakdowns'),
      description:
        t(`Breaks down the series by the category specified in this control.
      This can help viewers understand how each category affects the overall value.`),
      multi: false,
    },
  },
};

export default config;
