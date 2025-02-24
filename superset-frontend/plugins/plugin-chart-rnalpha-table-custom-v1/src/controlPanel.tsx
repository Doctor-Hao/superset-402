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
      controlSetRows: [['adhoc_filters']],
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
              description: t('Адрес до таблицы, в которую отправлять данные'),
              default: '',
              freeForm: true, // Разрешает ввод вручную
              mapStateToProps: ({ datasource }) => {
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
                    {
                      label: `variant/factories`,
                      value: `http://bnipi-rnc-tst1.rosneft.ru:8098/variant/factories`,
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
              type: 'TextControl',
              label: t('Сопоставление колонок для API'),
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
        [
          {
            name: 'use_external_data',
            config: {
              type: 'CheckboxControl',
              label: t('Получать данные из другого источника'),
              description: t('Если установлено, данные будут загружаться по GET-запросу'),
              default: false,
            },
          },
        ],
      ],
    },
  ],
};

export default config;
