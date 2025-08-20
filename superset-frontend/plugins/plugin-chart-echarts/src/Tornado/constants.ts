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

import { t } from '@superset-ui/core';

export const TORNADO_LEGEND = {
  LEFT_SIDE: t('Base Cost'),
  RIGHT_SIDE: t('Target Cost'),
};

export const TORNADO_CHART_TYPE = 'echarts-tornado';
export const DEFAULT_IMPACT_THRESHOLD = 0;

export const ECONOMIC_CONSTANTS = {
  DEFAULT_TIME_PERIOD: 20, // years
  CURRENCY_FORMAT: '$,.0f',
  IMPACT_THRESHOLD_PERCENT: 0.05, // 5% minimum impact
};
