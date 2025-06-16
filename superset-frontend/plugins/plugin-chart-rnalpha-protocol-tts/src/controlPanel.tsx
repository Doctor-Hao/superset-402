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
            name: 'endpoint',
            config: {
              type: 'SelectControl',
              label: t('Endpoint'),
              description: t(`api до таблицы, в которую отправлять данные. Пример: /variant/proscons (url:${process.env.BACKEND_URL})`),
              default: '/project/grr/option',
              freeForm: true, // Разрешает ввод вручную
              mapStateToProps: () => {
                return {
                  options: [
                    {
                      label: `/project/grr/option`,
                      value: `/project/grr/option`,
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
