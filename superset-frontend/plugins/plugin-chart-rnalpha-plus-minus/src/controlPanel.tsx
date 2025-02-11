/* eslint-disable camelcase */
import { t } from '@superset-ui/core';
import { sharedControls } from '@superset-ui/chart-controls';

/**
 * Конфигурация панели управления
 */
const config = {
  controlPanelSections: [
    // {
    //   label: t('Filters'),
    //   expanded: true,
    //   controlSetRows: [
    //     ['adhoc_filters'],
    //     [
    //       {
    //         name: 'custom_filter_1',
    //         config: {
    //           type: 'SelectControl',
    //           label: t('Custom Filter 1'),
    //           description: t('Select a value for filtering'),
    //           multi: true,
    //           freeForm: true,
    //           choices: [], // Можно заменить на доступные опции
    //           renderTrigger: true,
    //           mapStateToProps: ({ datasource }) => ({
    //             options: datasource?.columns?.map(col => [col.column_name, col.verbose_name || col.column_name]) || [],
    //           }),
    //         },
    //       },
    //     ],
    //   ],
    // },
    {
      label: t('Query'),
      expanded: true,
      controlSetRows: [
        [
          {
            name: 'all_columns',
            config: {
              ...sharedControls.groupby,
              label: t('Columns'),
              description: t('Select columns to display in the table'),
              multi: true,
              freeForm: true,
              allowAll: true,
              commaChoosesOption: false,
              optionRenderer: c => <span>{c.column_name}</span>,
              valueRenderer: c => <span>{c.column_name}</span>,
              valueKey: 'column_name',
              mapStateToProps: ({ datasource }) => ({
                options: datasource?.columns || [],
              }),
              resetOnHide: false,
            },
          },
        ],
      ],
    },
  ],
};


export default config;
