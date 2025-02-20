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
            name: 'ptc_id',
            config: {
              type: 'TextControl',
              label: t('Фильтр по PTC_ID'),
              description: t('Введите PTC_ID, чтобы фильтровать изображения'),
              default: '',
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
              label: t('Сопоставление колонок'),
              description: t(
                'Введите JSON-массив объектов вида: ' +
                '[ "Название колонки с картинкой" ]'
              ),
              default: '["nameColumn"]',
            },
          },
        ],
      ],
    },
  ],
};

export default config;
