import { buildQueryContext, QueryFormData } from '@superset-ui/core';

export default function buildQuery(formData: QueryFormData) {
  // Предполагаем, что в formData теперь есть поле "metrics" (список метрик)
  const { metrics } = formData;

  return buildQueryContext(formData, baseQueryObject => [
    {
      ...baseQueryObject,
      is_timeseries: false, // Отключаем помесячную/посуточную разбивку
      groupby: [],         // Нет группировок, нужна одна строка
      metrics,             // Пробрасываем сразу список метрик
      // limit: 1 — если хотите подстраховаться, но обычно в Superset и так лимит идет
    },
  ]);
}
