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
                      label: `project-risk`,
                      value: `/project/risk`,
                    },
                  ],
                };
              },
            },
          },
        ],
        [
          {
            name: 'risk_type',
            config: {
              type: 'SelectControl',
              label: t('Тип таблицы'),
              description: t('Выберите вариант отображения'),
              default: 'risk', // Пусть по умолчанию отображается "Риск"
              choices: [
                ['riskDesignations', 'Условные обозначения'],
                ['risk', 'Вариант 1 (Оценка рисков)'],
                ['risk2', 'Вариант 2 (Риски 3 уровня)'],
                ['risk3', 'Вариант 3 (Карта рисков)'],
                ['risk4', 'Вариант 4 (Риски 3 уровня расширенная таблица)'],
                ['risk5', 'Вариант 5 (Риски 3 уровня расширенная таблица (продолжение))'],
              ],
              clearable: false,
            },
          },
        ],
      ],
    },
  ],
};

export default config;
