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
              default: '',
              freeForm: true, // Разрешает ввод вручную
              mapStateToProps: () => {
                return {
                  options: [
                    {
                      label: `/project-infrastructure-description`,
                      value: `/project/infrastructure/description`,
                    },
                    {
                      label: `/project/energy/description`,
                      value: `/proscons_api/project/energy/description`,
                    },
                    {
                      label: `/project/tasks_and_goals`,
                      value: `/project/tasks_and_goals`,
                    },
                    {
                      label: `/project/low_efficiency/oilfield`,
                      value: `/project/low_efficiency/oilfield`,
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
