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
                      label: `/project/node/slide`,
                      value: `/project/node/slide`,
                    },
                  ],
                };
              },
            },
          },
        ],
        [
          {
            name: 'slide_number',
            config: {
              type: 'SelectControl',
              label: t('Номер слайда'),
              description: t('Выберите номер слайда'),
              default: 'slide_28',
              choices: [
                ['slide_28', 'slide_28'],
                ['slide_29', 'slide_29'],
                ['slide_75', 'slide_75'],
                ['slide_77', 'slide_77'],
                ['slide_107', 'slide_107'],
              ],
            },
          },
        ],
        [
          {
            name: 'variant_filter_name',
            config: {
              type: 'SelectControl',
              label: t('Название фильтра варианта'),
              description: t(`Табличное название варианта`),
              default: 'cmp_case_name',
              freeForm: true, // Разрешает ввод вручную
            },
          },
        ],
        [
          {
            name: 'variant_name',
            config: {
              type: 'SelectControl',
              label: t('Название поля варианта'),
              description: t(`Табличное название поля варианта`),
              default: 'cmp_case_name',
              freeForm: true, // Разрешает ввод вручную
            },
          },
        ],
        [
          {
            name: 'variant_id',
            config: {
              type: 'SelectControl',
              label: t('Название поля id варианта'),
              description: t(`Табличное название id варианта`),
              default: 'cmp_sort_order',
              freeForm: true, // Разрешает ввод вручную
            },
          },
        ],
      ],
    },
  ],
};

export default config;
