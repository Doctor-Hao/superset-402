/* eslint-disable camelcase */
import { t } from '@superset-ui/core';
import { sharedControls } from '@superset-ui/chart-controls';

/**
 * Конфигурация панели управления
 */
const config = {
  controlPanelSections: [
    {
      label: t('Query'),
      expanded: true,
      controlSetRows: [
        [
          {
            name: 'endpoint',
            config: {
              type: 'SelectControl',
              label: t('Endpoint'),
              description: t('В какую таблицу отправлять данные '),
              default: '',
              freeForm: true, // Разрешает ввод вручную
              mapStateToProps: ({ datasource }) => {
                const tableName = datasource?.table_name || 'default_table';
                return {
                  options: [
                    {
                      label: `Таблица: ${tableName}`,
                      value: `http://bnipi-rnc-tst1.rosneft.ru:8098/variant/${tableName}`,
                    },
                  ],
                };
              },
            },
          },
        ],
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
