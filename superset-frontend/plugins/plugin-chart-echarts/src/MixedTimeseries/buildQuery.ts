/**
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */
import {
  buildQueryContext,
  ensureIsArray,
  normalizeOrderBy,
  PostProcessingPivot,
  QueryFormData,
  QueryObject,
  isXAxisSet,
  getXAxisColumn,
} from '@superset-ui/core';
import {
  pivotOperator,
  renameOperator,
  flattenOperator,
  isTimeComparison,
  timeComparePivotOperator,
  rollingWindowOperator,
  timeCompareOperator,
  resampleOperator,
} from '@superset-ui/chart-controls';
import {
  retainFormDataSuffix,
  removeFormDataSuffix,
} from '../utils/formDataSuffix';

export default function buildQuery(formData: QueryFormData) {
  const baseFormData = {
    ...formData,
  };

  // 1) Query A — убираем все суффиксы _b и _c
  const formDataA = removeFormDataSuffix(removeFormDataSuffix(baseFormData, '_b'), '_c');
  // 2) Query B — оставляем только поля с суффиксом _b, убираем _c
  const formDataB = retainFormDataSuffix(removeFormDataSuffix(baseFormData, '_c'), '_b');
  // 3) Query C — оставляем поля с суффиксом _c, убираем _b
  const formDataC = retainFormDataSuffix(removeFormDataSuffix(baseFormData, '_b'), '_c');

  /** ---------- Вариант-query (только __variant_id) ---------- */
  let formDataVariant: QueryFormData | null = null;
  if (formData.comments && formData.variantIdField) {
    formDataVariant = {
      ...formDataA,
      metrics: [
        {
          label: '__variant_id',
          expressionType: 'SQL',
          sqlExpression: `MAX(${formData.variantIdField})::bigint`,
        },
      ],
      groupby: [],
      orderDesc: false,
      rowLimit: 1,
    };
  }

  const formDatas = [formDataA, formDataB];
  if (Array.isArray(formDataC.metrics) && formDataC.metrics.length > 0) {
    formDatas.push(formDataC);
  }
  if (baseFormData.comments && formDataVariant) {
    formDatas.push(formDataVariant);
  }

  const queryContexts = formDatas.map(fd =>
    buildQueryContext(fd, baseQueryObject => {
      const queryObject = {
        ...baseQueryObject,
        columns: [
          ...(isXAxisSet(formData)
            ? ensureIsArray(getXAxisColumn(formData))
            : []),
          ...ensureIsArray(fd.groupby),
        ],
        series_columns: fd.groupby,
        ...(isXAxisSet(formData) ? {} : { is_timeseries: true }),
      };

      const pivotOperatorInRuntime: PostProcessingPivot = isTimeComparison(
        fd,
        queryObject,
      )
        ? timeComparePivotOperator(fd, queryObject)
        : pivotOperator(fd, queryObject);

      const tmpQueryObject = {
        ...queryObject,
        time_offsets: isTimeComparison(fd, queryObject) ? fd.time_compare : [],
        post_processing: [
          pivotOperatorInRuntime,
          rollingWindowOperator(fd, queryObject),
          timeCompareOperator(fd, queryObject),
          resampleOperator(fd, queryObject),
          renameOperator(fd, queryObject),
          flattenOperator(fd, queryObject),
        ],
      } as QueryObject;
      return [normalizeOrderBy(tmpQueryObject)];
    }),
  );

  const finalQueries = queryContexts.flatMap(qc => qc.queries);

  return {
    ...queryContexts[0],
    queries: finalQueries,
  };
}
