/* eslint-disable camelcase */
import { t } from '@superset-ui/core';
import { sharedControls } from '@superset-ui/chart-controls';

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
        [
          {
            name: 'endpoint',
            config: {
              type: 'SelectControl',
              label: t('Endpoint'),
              description: t('Адрес до таблицы, в которую отправлять данные. Пример: http://bnipi-rnc-tst1.rosneft.ru:8098/'),
              default: '',
              freeForm: true, // Разрешает ввод вручную
              mapStateToProps: ({ datasource }) => {
                return {
                  options: [
                    {
                      label: `project/milestones prod`,
                      value: `https://10.205.110.50:8098/project/milestones`,
                    },
                    {
                      label: `project/milestones rnc-tst1`,
                      value: `http://bnipi-rnc-tst1.rosneft.ru:8098/project/milestones`,
                    },
                  ],
                };
              },
            },
          },
        ],

      ],
    },
  ],
};

export default config;
