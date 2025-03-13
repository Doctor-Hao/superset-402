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
              description: t(`api до таблицы, в которую отправлять данные. Пример: /variant/proscons (url:${process.env.BACKEND_URL})`),
              default: '',
              freeForm: true, // Разрешает ввод вручную
              mapStateToProps: ({ datasource }) => {
                return {
                  options: [
                    {
                      label: `first_and_second_level_risks`,
                      value: `/project/risk/first_and_second_level_risks`,
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
