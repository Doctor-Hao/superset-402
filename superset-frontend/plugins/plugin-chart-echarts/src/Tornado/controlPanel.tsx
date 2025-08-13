/**
 * Tornado controlPanel.tsx
 */
import React from 'react';
import {
  ControlPanelConfig,
  ControlSubSectionHeader,
  sharedControls,
  formatSelectOptions,
} from '@superset-ui/chart-controls';
import { t, validateNonEmpty } from '@superset-ui/core';

const config: ControlPanelConfig = {
  controlPanelSections: [
    /* ====== ДАННЫЕ / ЗАПРОС ====== */
    {
      label: t('Query'),
      expanded: true,
      controlSetRows: [
        [
          {
            // фактор (категория)
            name: 'groupby',
            config: {
              ...sharedControls.groupby,
              label: t('Фактор'),
              description: t('Столбец с названиями факторов'),
              multi: false,
              validators: [validateNonEmpty],
            },
          },
        ],
        [
          {
            // левая граница
            name: 'metric_min',
            config: {
              ...sharedControls.metric,
              label: t('Метрика (минимум)'),
              description: t('Значение при нижнем сценарии / −Δ'),
            },
          },
        ],
        [
          {
            // правая граница
            name: 'metric_max',
            config: {
              ...sharedControls.metric,
              label: t('Метрика (максимум)'),
              description: t('Значение при верхнем сценарии / +Δ'),
            },
          },
        ],
        // стандартная фильтрация
        ['adhoc_filters'],

        // сортировка по min/max (простая и надёжная)
        [
          {
            name: 'sort_by_edge',
            config: {
              type: 'SelectControl',
              label: t('Сортировать по'),
              choices: formatSelectOptions(['min', 'max']),
              default: 'max',
              clearable: false,
              renderTrigger: true,
              description: t('Какой край использовать для сортировки стобиков'),
            },
          },
        ],
        [
          {
            name: 'sort_desc',
            config: {
              type: 'CheckboxControl',
              label: t('По убыванию'),
              default: true,
              renderTrigger: true,
            },
          },
        ],
        ['row_limit'],
      ],
    },

    /* ====== ОПЦИИ ЧАРТА ====== */
    {
      label: t('Chart Options'),
      expanded: true,
      controlSetRows: [
        [
          {
            name: 'baseline',
            config: {
              type: 'TextControl',
              label: t('Базис'),
              description: t('Число, относительно которого строятся плечи. На графике это вертикальная линия посередине.'),
              default: '0',
              renderTrigger: true,
            },
          },
        ],
        [
          {
            name: 'show_labels',
            config: {
              type: 'CheckboxControl',
              label: t('Подписи значений'),
              default: true,
              renderTrigger: true,
            },
          },
          {
            name: 'show_legend',
            config: {
              type: 'CheckboxControl',
              label: t('Легенда'),
              default: false,
              renderTrigger: true,
            },
          },
        ],
        [
          {
            name: 'bar_color',
            config: {
              type: 'ColorPickerControl',
              label: t('Цвет баров'),
              renderTrigger: true,
            },
          },
          {
            name: 'y_axis_label_width',
            config: {
              type: 'TextControl',
              label: t('Ширина подписей по Y'),
              description: t('Чтобы длинные названия факторов помещались'),
              default: '220',
              isInt: true,
              renderTrigger: true,
            },
          },
        ],
        [
          <ControlSubSectionHeader key="x">{t('X Axis')}</ControlSubSectionHeader>,
        ],
        [
          {
            name: 'x_axis_label',
            config: {
              type: 'TextControl',
              label: t('Подпись оси X'),
              default: '',
              renderTrigger: true,
            },
          },
        ],
        [
          <ControlSubSectionHeader key="y">{t('Y Axis')}</ControlSubSectionHeader>,
        ],
        [
          {
            name: 'y_axis_label',
            config: {
              type: 'TextControl',
              label: t('Подпись оси Y'),
              default: '',
              renderTrigger: true,
            },
          },
        ],
      ],
    },
  ],

  /* мелкая правка стандартных контролов */
  controlOverrides: {
    groupby: {
      label: t('Фактор'),
      multi: false,
    },
  },
};

export default config;
