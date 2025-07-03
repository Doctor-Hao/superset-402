/* eslint-disable camelcase */
import { t } from '@superset-ui/core';
import { sharedControls } from '@superset-ui/chart-controls';
import React from 'react';

/**
 * Конфигурация панели управления
 */
const config = {
  controlPanelSections: [
    {
      label: t('Filters'),
      expanded: true,
      controlSetRows: [
        ['adhoc_filters'],
      ],
    },
    {
      label: t('Query'),
      expanded: true,
      controlSetRows: [
        [
          {
            name: 'all_columns',
            config: {
              ...sharedControls.groupby,
              label: t('Колонки'),
              description: t('Выберите колонки для вывода в таблицу'),
              multi: true,
              freeForm: true,
              allowAll: true,
              commaChoosesOption: false,
              optionRenderer: (c: any) => <span>{c.column_name}</span>,
              valueRenderer: (c: any) => <span>{c.column_name}</span>,
              valueKey: 'column_name',
              mapStateToProps: ({ datasource }: { datasource: any }) => ({
                options: datasource?.columns || [],
              }),
              resetOnHide: false,
            },
          },
        ],
        [
          {
            name: 'variant_filter_name',
            config: {
              type: 'SelectControl',
              label: t('Название фильтра варианта'),
              description: t(`Табличное название варианта`),
              default: 'cmp_case_name',
              freeForm: true, // Разрешает ввод вручную
            },
          },
        ],
        [
          {
            name: 'variant_name',
            config: {
              type: 'SelectControl',
              label: t('Название поля варианта'),
              description: t(`Табличное название поля варианта`),
              default: 'cmp_case_name',
              freeForm: true, // Разрешает ввод вручную
            },
          },
        ],
        [
          {
            name: 'variant_id',
            config: {
              type: 'SelectControl',
              label: t('Название поля id варианта'),
              description: t(`Табличное название id варианта`),
              default: 'cmp_sort_order',
              freeForm: true, // Разрешает ввод вручную
            },
          },
        ],
      ],
    },
  ],
};

export default config;