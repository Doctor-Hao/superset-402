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
            name: 'endpoint',
            config: {
              type: 'SelectControl',
              label: t('Endpoint'),
              description: t('Адрес до таблицы в которую отправлять данные'),
              default: '',
              freeForm: true, // Разрешает ввод вручную
              mapStateToProps: ({ datasource }) => {
                const tableName = datasource?.table_name || 'default_table';
                return {
                  options: [
                    {
                      label: `tasks_and_goals`,
                      value: `http://bnipi-rnc-tst1.rosneft.ru:8098/project/tasks_and_goals`,
                    },
                    {
                      label: `general_overview`,
                      value: `http://bnipi-rnc-tst1.rosneft.ru:8098/project/general_overview`,
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
              label: t('Колонки'),
              description: t('Выберите колонки для вывода в таблицу'),
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
            name: 'hidden_columns_indexes',
            config: {
              type: 'TextControl',
              label: t('Спрятать колонки по индексу'),
              description: t('Пример "0,2,4"'),
              default: '',
            },
          },
        ],
        [
          {
            name: 'columns_mapping',
            config: {
              type: 'TextControl', // используем многострочный контрол
              label: t('Сопоставление колонок'),
              description: t(
                'Введите JSON-массив объектов вида: ' +
                '[ { "название_колонки": { "name": "Название в шапке", "api_key": "ключ для API" } } ]'
              ),
              default: '[{"nameColumn": {"name": "Колонка 1","api_key": "поле_для_API"}}]',
            },
          },
        ],
        [
          {
            name: 'send_as_array',
            config: {
              type: 'CheckboxControl',
              label: t('Отправлять массив json'),
              description: t('Если галочка установлена, отправляется все строки, иначе – только первая строка'),
              default: false,
            },
          },
        ],
      ],
    },
  ],
};

export default config;
