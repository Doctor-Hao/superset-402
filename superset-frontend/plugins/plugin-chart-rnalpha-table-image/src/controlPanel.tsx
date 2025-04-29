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
            name: 'var_id',
            config: {
              type: 'TextControl',
              label: t('id VAR_ID'),
              description: t('Введите VAR_ID, чтобы фильтровать изображения'),
              default: '',
            },
          },
        ],
        [
          {
            name: 'dash_id',
            config: {
              type: 'TextControl',
              label: t('id DASH_ID'),
              description: t('Введите dash_id, чтобы фильтровать изображения'),
              default: '',
            },
          },
        ],
      ],
    },
  ],
};

export default config;