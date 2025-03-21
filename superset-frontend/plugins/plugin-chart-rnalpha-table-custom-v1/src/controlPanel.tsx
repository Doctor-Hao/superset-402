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
              description: t(`api до таблицы, в которую отправлять данные. Пример: /variant/proscons (url:${process.env.BACKEND_URL})`),
              default: '',
              freeForm: true, // Разрешает ввод вручную
              mapStateToProps: ({ datasource }) => {
                return {
                  options: [
                    {
                      label: `tasks_and_goals`,
                      value: `/project/tasks_and_goals`,
                    },
                    {
                      label: `general_overview`,
                      value: `/project/general_overview`,
                    },
                    {
                      label: `variant/factories`,
                      value: `/variant/factories`,
                    },
                    {
                      label: `project/infrastructure/description`,
                      value: `/project/infrastructure/description`,
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
              type: 'TextAreaControl',
              label: t('Сопоставление колонок для API'),
              description: t(
                'Введите JSON-массив объектов вида: ' +
                '[ { "название_колонки": { "name": "Название в шапке", "api_key": "ключ для API", "get_response": true, "column_color": true } } ].\n\n' +
                'Где для каждого объекта:\n' +
                '• "название_колонки" — это оригинальное имя столбца (как в исходных данных).\n' +
                '• "name" — человекочитаемое название, которое будет отображаться в шапке таблицы.\n' +
                '• "api_key" — ключ, по которому данные этого столбца будут отправляться в PATCH-запросе.\n' +
                '• "get_response" (boolean) — если true, значение из этого столбца попадёт в путь GET-запроса (например, /endpoint/value).\n' +
                '• "column_color" (boolean) — если true, плагин интерпретирует текст в ячейке как цвет (например, "green", "yellow") и выводит цветной индикатор.'
              ),

              default:
                `
[
  {"nameColumn": 
    {"name": "Колонка 1","api_key": "поле_для_API", "get_response": true}
  },
  {"nameColumn2": 
    {"name": "Колонка 2","api_key": "поле_для_API", "column_color": true}
  }
]`,
              language: 'plaintext',    // Чтобы не включалась логика модального JSON-редактора
              // freeForm: true,         // Если хотите разрешить любую строку (не только JSON)
            },
          }

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
