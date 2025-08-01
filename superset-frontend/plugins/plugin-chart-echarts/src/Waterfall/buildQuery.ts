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
  QueryFormData,
  QueryFormOrderBy,
} from '@superset-ui/core';

export default function buildQuery(formData: QueryFormData) {
  const {
    x_axis,
    granularity_sqla,
    groupby,
    sort_column,
    sort_desc = false,
  } = formData as QueryFormData & {
    sort_column?: string | null;
    sort_desc?: boolean;
  };

  const columns = [
    ...ensureIsArray(x_axis || granularity_sqla),
    ...ensureIsArray(groupby),
  ];
  if (sort_column && !columns.includes(sort_column)) {
    columns.push(sort_column);
  }

  /* основной ORDER BY */
  const orderby: QueryFormOrderBy[] = sort_column
    ? [[sort_column, !sort_desc]]
    : columns.map(col => [col, !sort_desc]);


  return buildQueryContext(formData, base => [
    {
      ...base,
      columns,
      orderby,
    },
  ]);
}

