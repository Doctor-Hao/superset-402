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
                      label: `project-infrastructure-description prod`,
                      value: `http://10.205.110.50:8098/project/infrastructure/description`,
                    },
                    {
                      label: `project-infrastructure-description rnc-tst1`,
                      value: `http://bnipi-rnc-tst1.rosneft.ru:8098/project/infrastructure/description`,
                    },
                  ],
                };
              },
            },
          },
        ],
        [
          {
            name: 'property_name',
            config: {
              type: 'TextControl',
              label: t('Наименование свойста'),
              description: t('Название свойства которое будет отображаться и отправляться'),
              default: 'oil_description',
              renderTrigger: true,
            },
          },
        ],
        [
          {
            name: 'header_name',
            config: {
              type: 'TextControl',
              label: t('Наименование шапки'),
              description: t('Название шапки которое отображается в колонке'),
              default: 'Описание',
              renderTrigger: true,
            },
          },
        ],
      ],
    },
  ],
};

export default config;
