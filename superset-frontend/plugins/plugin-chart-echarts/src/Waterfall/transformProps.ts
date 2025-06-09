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
  CurrencyFormatter,
  DataRecord,
  ensureIsArray,
  GenericDataType,
  getMetricLabel,
  getNumberFormatter,
  getTimeFormatter,
  isAdhocColumn,
  NumberFormatter,
  rgbToHex,
  SupersetTheme,
} from '@superset-ui/core';
import { EChartsOption, BarSeriesOption } from 'echarts';
import {
  EchartsWaterfallChartProps,
  ISeriesData,
  WaterfallChartTransformedProps,
  ICallbackDataParams,
} from './types';
import { getDefaultTooltip } from '../utils/tooltip';
import { defaultGrid, defaultYAxis } from '../defaults';
import { ASSIST_MARK, LEGEND, TOKEN, TOTAL_MARK } from './constants';
import { getColtypesMapping } from '../utils/series';
import { Refs } from '../types';
import { NULL_STRING } from '../constants';

function formatTooltip({
  theme,
  params,
  breakdownName,
  defaultFormatter,
  xAxisFormatter,
}: {
  theme: SupersetTheme;
  params: ICallbackDataParams[];
  breakdownName?: string;
  defaultFormatter: NumberFormatter | CurrencyFormatter;
  xAxisFormatter: (value: number | string, index: number) => string;
}) {
  const series = params.find(
    param => param.seriesName !== ASSIST_MARK && param.data.value !== TOKEN,
  );

  // We may have no matching series depending on the legend state
  if (!series) {
    return '';
  }

  const isTotal = series?.seriesName === LEGEND.TOTAL;
  if (!series) {
    return NULL_STRING;
  }

  const createRow = (name: string, value: string) => `
    <div>
      <span style="
        font-size:${theme.typography.sizes.m}px;
        color:${theme.colors.grayscale.base};
        font-weight:${theme.typography.weights.normal};
        margin-left:${theme.gridUnit * 0.5}px;"
      >
        ${name}:
      </span>
      <span style="
        float:right;
        margin-left:${theme.gridUnit * 5}px;
        font-size:${theme.typography.sizes.m}px;
        color:${theme.colors.grayscale.base};
        font-weight:${theme.typography.weights.bold}"
      >
        ${value}
      </span>
    </div>
  `;

  let result = '';
  if (!isTotal || breakdownName) {
    result = xAxisFormatter(series.name, series.dataIndex);
  }
  if (!isTotal) {
    result += createRow(
      series.seriesName!,
      defaultFormatter(series.data.originalValue),
    );
  }
  result += createRow(TOTAL_MARK, defaultFormatter(series.data.totalSum));
  return result;
}

function transformer({
  data,
  xAxis,
  metric,
  breakdown,
}: {
  data: DataRecord[];
  xAxis: string;
  metric: string;
  breakdown?: string;
}) {
  // Group by series (temporary map)
  const groupedData = data.reduce((acc, cur) => {
    const categoryLabel = cur[xAxis] as string;
    const categoryData = acc.get(categoryLabel) || [];
    categoryData.push(cur);
    acc.set(categoryLabel, categoryData);
    return acc;
  }, new Map<string, DataRecord[]>());

  const transformedData: DataRecord[] = [];

  if (breakdown) {
    groupedData.forEach((value, key) => {
      const tempValue = value;
      // Calc total per period
      const sum = tempValue.reduce(
        (acc, cur) => acc + ((cur[metric] as number) ?? 0),
        0,
      );
      // Push total per period to the end of period values array
      tempValue.push({
        [xAxis]: key,
        [breakdown]: TOTAL_MARK,
        [metric]: sum,
      });
      transformedData.push(...tempValue);
    });
  } else {
    let total = 0;
    groupedData.forEach((value, key) => {
      const sum = value.reduce(
        (acc, cur) => acc + ((cur[metric] as number) ?? 0),
        0,
      );
      transformedData.push({
        [xAxis]: key,
        [metric]: sum,
      });
      total += sum;
    });
    transformedData.push({
      [xAxis]: TOTAL_MARK,
      [metric]: total,
    });
  }

  return transformedData;
}

export default function transformProps(
  chartProps: EchartsWaterfallChartProps,
): WaterfallChartTransformedProps {
  const {
    width,
    height,
    formData,
    legendState,
    queriesData,
    hooks,
    theme,
    inContextMenu,
  } = chartProps;

  const refs: Refs = {};
  const { data = [] } = queriesData[0];
  const coltypeMapping = getColtypesMapping(queriesData[0]);
  const { setDataMask = () => { }, onContextMenu, onLegendStateChanged } = hooks;
  const {
    currencyFormat,
    granularitySqla = '',
    groupby,
    increaseColor = { r: 90, g: 193, b: 137 },
    decreaseColor = { r: 224, g: 67, b: 85 },
    totalColor = { r: 102, g: 102, b: 102 },
    metric = '',
    xAxis,
    xTicksLayout,
    xAxisTimeFormat,
    showLegend,
    yAxisLabel,
    xAxisLabel,
    yAxisFormat,
    showValue,
  } = formData;
  const defaultFormatter = currencyFormat?.symbol
    ? new CurrencyFormatter({ d3Format: yAxisFormat, currency: currencyFormat })
    : getNumberFormatter(yAxisFormat);

  const seriesformatter = (params: ICallbackDataParams) => {
    const { data } = params;
    const { originalValue } = data;
    return defaultFormatter(originalValue as number);
  };
  const groupbyArray = ensureIsArray(groupby);
  const breakdownColumn = groupbyArray.length ? groupbyArray[0] : undefined;
  const breakdownName = isAdhocColumn(breakdownColumn)
    ? breakdownColumn.label!
    : breakdownColumn;
  const xAxisColumn = xAxis || granularitySqla;
  const xAxisName = isAdhocColumn(xAxisColumn)
    ? xAxisColumn.label!
    : xAxisColumn;
  const metricLabel = getMetricLabel(metric);

  const transformedData = transformer({
    data,
    breakdown: breakdownName,
    xAxis: xAxisName,
    metric: metricLabel,
  });

  const assistData: ISeriesData[] = [];
  const increaseData: ISeriesData[] = [];
  const decreaseData: ISeriesData[] = [];
  const totalData: ISeriesData[] = [];

  let previousTotal = 0;

  transformedData.forEach((datum, index, self) => {
    const totalSum = self.slice(0, index + 1).reduce((prev, cur, i) => {
      if (breakdownName) {
        if (cur[breakdownName] !== TOTAL_MARK || i === 0) {
          return prev + ((cur[metricLabel] as number) ?? 0);
        }
      } else if (cur[xAxisName] !== TOTAL_MARK) {
        return prev + ((cur[metricLabel] as number) ?? 0);
      }
      return prev;
    }, 0);

    const isTotal =
      (breakdownName && datum[breakdownName] === TOTAL_MARK) ||
      datum[xAxisName] === TOTAL_MARK;

    const originalValue = datum[metricLabel] as number;
    let value = originalValue;
    const oppositeSigns = Math.sign(previousTotal) !== Math.sign(totalSum);
    if (oppositeSigns) {
      value = Math.sign(value) * (Math.abs(value) - Math.abs(previousTotal));
    }

    if (isTotal) {
      increaseData.push({ value: TOKEN });
      decreaseData.push({ value: TOKEN });
      totalData.push({
        value: totalSum,
        originalValue: totalSum,
        totalSum,
      });
    } else if (value < 0) {
      increaseData.push({ value: TOKEN });
      decreaseData.push({
        value: totalSum < 0 ? value : -value,
        originalValue,
        totalSum,
      });
      totalData.push({ value: TOKEN });
    } else {
      increaseData.push({
        value: totalSum > 0 ? value : -value,
        originalValue,
        totalSum,
      });
      decreaseData.push({ value: TOKEN });
      totalData.push({ value: TOKEN });
    }

    const color = oppositeSigns
      ? value > 0
        ? rgbToHex(increaseColor.r, increaseColor.g, increaseColor.b)
        : rgbToHex(decreaseColor.r, decreaseColor.g, decreaseColor.b)
      : 'transparent';

    let opacity = 1;
    if (legendState?.[LEGEND.INCREASE] === false && value > 0) {
      opacity = 0;
    } else if (legendState?.[LEGEND.DECREASE] === false && value < 0) {
      opacity = 0;
    }

    if (isTotal) {
      assistData.push({ value: TOKEN });
    } else if (index === 0) {
      assistData.push({
        value: 0,
      });
    } else if (oppositeSigns || Math.abs(totalSum) > Math.abs(previousTotal)) {
      assistData.push({
        value: previousTotal,
        itemStyle: { color, opacity },
      });
    } else {
      assistData.push({
        value: totalSum,
        itemStyle: { color, opacity },
      });
    }

    previousTotal = totalSum;
  });

  const xAxisColumns: string[] = [];
  const xAxisData = transformedData.map(row => {
    let column = xAxisName;
    let value = row[xAxisName];
    if (breakdownName && row[breakdownName] !== TOTAL_MARK) {
      column = breakdownName;
      value = row[breakdownName];
    }
    if (!value) {
      value = NULL_STRING;
    }
    if (typeof value !== 'string' && typeof value !== 'number') {
      value = String(value);
    }
    xAxisColumns.push(column);
    return value;
  });

  const xAxisFormatter = (value: number | string, index: number) => {
    if (value === TOTAL_MARK) {
      return TOTAL_MARK;
    }
    if (coltypeMapping[xAxisColumns[index]] === GenericDataType.Temporal) {
      if (typeof value === 'string') {
        return getTimeFormatter(xAxisTimeFormat)(Number.parseInt(value, 10));
      }
      return getTimeFormatter(xAxisTimeFormat)(value);
    }
    return String(value);
  };

  let axisLabel: {
    rotate?: number;
    hideOverlap?: boolean;
    show?: boolean;
    formatter?: typeof xAxisFormatter;
  };
  if (xTicksLayout === '45°') {
    axisLabel = { rotate: -45 };
  } else if (xTicksLayout === '90°') {
    axisLabel = { rotate: -90 };
  } else if (xTicksLayout === 'flat') {
    axisLabel = { rotate: 0 };
  } else if (xTicksLayout === 'staggered') {
    axisLabel = { rotate: -45 };
  } else {
    axisLabel = { show: true };
  }
  axisLabel.formatter = xAxisFormatter;
  axisLabel.hideOverlap = false;

  const seriesProps: Pick<BarSeriesOption, 'type' | 'stack' | 'emphasis'> = {
    type: 'bar',
    stack: 'stack',
    emphasis: {
      disabled: true,
    },
  };

  const barSeries: BarSeriesOption[] = [
    {
      ...seriesProps,
      name: ASSIST_MARK,
      data: assistData,
    },
    {
      ...seriesProps,
      name: LEGEND.INCREASE,
      label: {
        show: showValue,
        position: 'top',
        formatter: seriesformatter,
      },
      itemStyle: {
        color: rgbToHex(increaseColor.r, increaseColor.g, increaseColor.b),
      },
      data: increaseData,
    },
    {
      ...seriesProps,
      name: LEGEND.DECREASE,
      label: {
        show: showValue,
        position: 'bottom',
        formatter: seriesformatter,
      },
      itemStyle: {
        color: rgbToHex(decreaseColor.r, decreaseColor.g, decreaseColor.b),
      },
      data: decreaseData,
    },
    {
      ...seriesProps,
      name: LEGEND.TOTAL,
      label: {
        show: showValue,
        position: 'top',
        formatter: seriesformatter,
      },
      itemStyle: {
        color: rgbToHex(totalColor.r, totalColor.g, totalColor.b),
      },
      data: totalData,
    },
  ];

  // скрыть последний Total-бар
  if (formData.hideTotalColumn) {
    // Находим индекс последнего ненулевого значения в totalData
    const lastTotalIndex = totalData
      .map(d => d.value !== TOKEN)
      .lastIndexOf(true);

    if (lastTotalIndex !== -1) {
      xAxisData.splice(lastTotalIndex, 1);
      assistData.splice(lastTotalIndex, 1);
      increaseData.splice(lastTotalIndex, 1);
      decreaseData.splice(lastTotalIndex, 1);
      totalData.splice(lastTotalIndex, 1);
    }
  }

  let echartOptions: EChartsOption = {
    grid: {
      ...defaultGrid,
      top: theme.gridUnit * 7,
      bottom: theme.gridUnit * 7,
      left: theme.gridUnit * 5,
      right: theme.gridUnit * 7,
    },
    legend: {
      show: showLegend,
      selected: legendState,
      data: [LEGEND.INCREASE, LEGEND.DECREASE, LEGEND.TOTAL],
    },
    xAxis: {
      data: xAxisData,
      type: 'category',
      name: xAxisLabel,
      nameTextStyle: {
        padding: [theme.gridUnit * 4, 0, 0, 0],
      },
      nameLocation: 'middle',
      axisLabel,
    },
    yAxis: {
      ...defaultYAxis,
      type: 'value',
      nameTextStyle: {
        padding: [0, 0, theme.gridUnit * 5, 0],
      },
      nameLocation: 'middle',
      name: yAxisLabel,
      axisLabel: { formatter: defaultFormatter },
    },
    tooltip: {
      ...getDefaultTooltip(refs),
      appendToBody: true,
      trigger: 'axis',
      show: !inContextMenu,
      formatter: (params: any) =>
        formatTooltip({
          theme,
          params,
          breakdownName,
          defaultFormatter,
          xAxisFormatter,
        }),
    },
    series: barSeries,
  };


  /*─────────────────────────────────────────────────────────────
   Режим «2 варианта + тоталы по краям»
 ─────────────────────────────────────────────────────────────*/
  if (formData.compareTwoVariants) {
    // 1) Читаем имя поля X-AXIS, из которого будем брать “левый/правый” варианты
    const xAxisField = isAdhocColumn(xAxis)
      ? (xAxis as any).label!
      : (xAxis || granularitySqla);

    // 2) Читаем поле фильтра, введённое пользователем
    const filterColUser = String(formData.compareFilterColumn || '').trim();
    let variants: string[] = [];

    // 2.a) Пробуем достать из formData.adhocFilters
    if (Array.isArray(formData.adhocFilters)) {
      formData.adhocFilters.forEach(flt => {
        const colName = flt.col || flt.subject;
        if (colName === filterColUser) {
          if (Array.isArray(flt.val)) {
            variants = flt.val.map(String);
          } else if (Array.isArray(flt.comparator)) {
            variants = flt.comparator.map(String);
          }
        }
      });
    }

    // 2.b) Если не нашли в adhocFilters, пробуем formData.native_filters
    if (variants.length === 0 && formData.native_filters) {
      Object.values<any>(formData.native_filters).forEach(nf => {
        const col =
          typeof nf.target === 'string'
            ? nf.target
            : nf.target?.column || '';
        const valArr: any[] =
          Array.isArray(nf.value)
            ? nf.value
            : Array.isArray(nf.currentValue)
              ? nf.currentValue
              : [];
        if (col === filterColUser && valArr.length) {
          variants = valArr.map(String);
        }
      });
    }

    // 2.c) Если ещё пусто, пробуем formData.extraFormData.filters (Dashboard)
    if (variants.length === 0 && formData.extraFormData?.filters) {
      formData.extraFormData.filters.forEach((flt: any) => {
        const col =
          flt.col || flt.subject || flt.field || '';
        if (col === filterColUser && Array.isArray(flt.val)) {
          variants = flt.val.map(String);
        }
      });
    }

    console.log('compareFilterColumn =', filterColUser, 'variants =', variants);

    // 3) Если ровно два варианта и есть breakdownName + metricLabel, запускаем сравнение
    if (variants.length === 2 && breakdownName && metricLabel) {
      const [leftName, rightName] = variants;

      // 4) Группируем суммы по (breakdownName, X-AXIS)
      const sumsByFactor: Record<string, { left: number; right: number }> = {};
      const uniqueFactors: string[] = [];

      data.forEach(row => {
        const factorValue = String(row[breakdownName] ?? '');
        const filterVal = String(row[xAxisField] || '');
        const val = Number(row[metricLabel]) || 0;

        if (
          (filterVal === leftName || filterVal === rightName) &&
          !uniqueFactors.includes(factorValue)
        ) {
          uniqueFactors.push(factorValue);
        }

        if (!sumsByFactor[factorValue]) {
          sumsByFactor[factorValue] = { left: 0, right: 0 };
        }
        if (filterVal === leftName) {
          sumsByFactor[factorValue].left += val;
        } else if (filterVal === rightName) {
          sumsByFactor[factorValue].right += val;
        }
      });

      console.log('uniqueFactors:', uniqueFactors);
      console.log('sumsByFactor:', sumsByFactor);

      // 5) Новая ось X: [leftName, ...факторы..., rightName]
      const factors = uniqueFactors;
      const newXAxisData = [leftName, ...factors, rightName];

      // 6) Считаем общий тотал для каждого варианта
      let leftTotal = 0,
        rightTotal = 0;
      Object.values(sumsByFactor).forEach(obj => {
        leftTotal += obj.left;
        rightTotal += obj.right;
      });
      console.log(`leftTotal = ${leftTotal}, rightTotal = ${rightTotal}`);

      // 7) Собираем массивы для waterfall
      const EMPTY = { value: TOKEN };
      const newAssist: any[] = [];
      const newIncrease: any[] = [];
      const newDecrease: any[] = [];
      const newTotalArr: any[] = [];

      // 7.a) Левый тотал (база = 0)
      newAssist.push(0);
      newIncrease.push(EMPTY);
      newDecrease.push(EMPTY);
      newTotalArr.push({
        value: leftTotal,
        originalValue: leftTotal,
        totalSum: leftTotal,
      });

      // 7.b) Факторные дельты
      let cumulative = leftTotal;
      factors.forEach(factor => {
        const { left, right } = sumsByFactor[factor];
        const delta = right - left;

        if (delta >= 0) {
          newAssist.push({ value: cumulative });
          newIncrease.push({ value: delta, originalValue: delta, totalSum: delta });
          newDecrease.push({ value: TOKEN });
          cumulative += delta;
        } else {
          newAssist.push({ value: cumulative + delta });
          newIncrease.push({ value: TOKEN });
          newDecrease.push({
            value: -delta,
            originalValue: delta,
            totalSum: delta,
          });
          cumulative += delta;
        }
        newTotalArr.push({ value: TOKEN });
      });

      // 7.c) Правый тотал (база = 0)
      newAssist.push(0);
      newIncrease.push(EMPTY);
      newDecrease.push(EMPTY);
      newTotalArr.push({
        value: rightTotal,
        originalValue: rightTotal,
        totalSum: rightTotal,
      });

      console.log('newXAxisData:', newXAxisData);
      console.log('newAssist:', newAssist);
      console.log('newIncrease:', newIncrease);
      console.log('newDecrease:', newDecrease);
      console.log('newTotalArr:', newTotalArr);

      // 8) Подмена исходных массивов
      xAxisData.splice(0, xAxisData.length, ...newXAxisData);
      assistData.splice(0, assistData.length, ...newAssist);
      increaseData.splice(0, increaseData.length, ...newIncrease);
      decreaseData.splice(0, decreaseData.length, ...newDecrease);
      totalData.splice(0, totalData.length, ...newTotalArr);

      // 9) Синхронизируем barSeries
      barSeries.forEach(s => {
        if (s.name === ASSIST_MARK) {
          s.data = newAssist;
          s.itemStyle = { color: 'transparent' };
          s.label = { show: false };
        }
        if (s.name === LEGEND.INCREASE) {
          s.data = newIncrease;
          s.itemStyle = {
            color: rgbToHex(increaseColor.r, increaseColor.g, increaseColor.b),
          };
          s.label = { show: showValue, position: 'top', formatter: seriesformatter };
        }
        if (s.name === LEGEND.DECREASE) {
          s.data = newDecrease;
          s.itemStyle = {
            color: rgbToHex(decreaseColor.r, decreaseColor.g, decreaseColor.b),
          };
          s.label = { show: showValue, position: 'bottom', formatter: seriesformatter };
        }
        if (s.name === LEGEND.TOTAL) {
          s.data = newTotalArr;
          s.itemStyle = {
            color: rgbToHex(totalColor.r, totalColor.g, totalColor.b),
          };
          s.label = { show: showValue, position: 'top', formatter: seriesformatter };
        }
      });

      // 10) Рисуем Δ-стрелку между крайними total
      const diff = rightTotal - leftTotal;
      const pct = leftTotal !== 0 ? (diff / Math.abs(leftTotal)) * 100 : 0;
      const dec = Math.max(0, Number(formData.deltaDecimals) || 0);
      const unit = (formData.deltaUnit || '').trim();
      const diffLabel = `${diff.toFixed(dec)}${unit ? ' ' + unit : ''} (${pct.toFixed(dec)}%)`;

      const midValue = (leftTotal + rightTotal) / 2;
      const lastIdx = newXAxisData.length - 1;

      if (formData.showDeltaArrow) {
        barSeries.forEach(s => {
          if (s.name === LEGEND.TOTAL) {
            s.markLine = {
              symbol: ['arrow', 'arrow'],
              label: {
                show: true,
                position: 'middle',
                formatter: `Δ = ${diffLabel}`,
                fontSize: 16,
                fontWeight: 'bold',
                backgroundColor: 'rgba(249, 189, 0, 0.9)', // полупрозрачный жёлтый
                padding: [4, 8],       // отступы [вертикальный, горизонтальный]
                borderRadius: 4,       // скругление углов
              },
              lineStyle: { color: '#000', width: 2 },
              data: [[{ coord: [0, midValue] }, { coord: [lastIdx, midValue] }]],
              zlevel: 10,
            };
          }
        });
      }
    }
  }


  /*─────────────────────────────────────────────────────────────
  Режим «Сравнение 3х вариантов»
─────────────────────────────────────────────────────────────*/
  if (formData.compareThreeVariants && breakdownName && metricLabel) {
    // 1) Читаем имя поля X-AXIS, из которого будем брать три варианта
    const xAxisField = isAdhocColumn(xAxis)
      ? (xAxis as any).label!
      : (xAxis || granularitySqla);

    // 2) Поле фильтра, введённое пользователем (compareFilterColumn)
    const filterColUser = String(formData.compareFilterColumn || '').trim();
    let variants: string[] = [];

    // 2.a) Пробуем достать из formData.adhocFilters
    if (Array.isArray(formData.adhocFilters)) {
      formData.adhocFilters.forEach(flt => {
        const colName = flt.col || flt.subject;
        if (colName === filterColUser) {
          if (Array.isArray(flt.val)) {
            variants = flt.val.map(String);
          } else if (Array.isArray(flt.comparator)) {
            variants = flt.comparator.map(String);
          }
        }
      });
    }

    // 2.b) Если не нашли в adhocFilters, пробуем formData.native_filters
    if (variants.length === 0 && formData.native_filters) {
      Object.values<any>(formData.native_filters).forEach(nf => {
        const col =
          typeof nf.target === 'string'
            ? nf.target
            : nf.target?.column || '';
        const valArr: any[] =
          Array.isArray(nf.value)
            ? nf.value
            : Array.isArray(nf.currentValue)
              ? nf.currentValue
              : [];
        if (col === filterColUser && valArr.length) {
          variants = valArr.map(String);
        }
      });
    }

    // 2.c) Если ещё пусто, пробуем formData.extraFormData.filters
    if (variants.length === 0 && formData.extraFormData?.filters) {
      formData.extraFormData.filters.forEach((flt: any) => {
        const col = flt.col || flt.subject || flt.field || '';
        if (col === filterColUser && Array.isArray(flt.val)) {
          variants = flt.val.map(String);
        }
      });
    }

    console.log('compareFilterColumn =', filterColUser, 'variants =', variants);

    // 3) Убедимся, что получили ровно три значения
    if (variants.length === 3) {
      const [firstName, secondName, thirdName] = variants;

      // 4) Группируем суммы по (breakdownName, X-AXIS) для трёх вариантов
      const sumsByFactor: Record<string, { a: number; b: number; c: number }> = {};
      const uniqueFactors: string[] = [];

      data.forEach(row => {
        const factorValue = String(row[breakdownName] ?? '');
        const filterVal = String(row[xAxisField] || '');
        const val = Number(row[metricLabel]) || 0;

        if (
          (filterVal === firstName ||
            filterVal === secondName ||
            filterVal === thirdName) &&
          !uniqueFactors.includes(factorValue)
        ) {
          uniqueFactors.push(factorValue);
        }

        if (!sumsByFactor[factorValue]) {
          sumsByFactor[factorValue] = { a: 0, b: 0, c: 0 };
        }
        if (filterVal === firstName) {
          sumsByFactor[factorValue].a += val;
        } else if (filterVal === secondName) {
          sumsByFactor[factorValue].b += val;
        } else if (filterVal === thirdName) {
          sumsByFactor[factorValue].c += val;
        }
      });

      console.log('uniqueFactors (3var):', uniqueFactors);
      console.log('sumsByFactor (3var):', sumsByFactor);

      // 5) Новая ось X: [firstName, ...факторы..., secondName, ...факторы..., thirdName]
      const factors = uniqueFactors;
      const newXAxisData = [
        firstName,
        ...factors,
        secondName,
        ...factors,
        thirdName,
      ];

      // 6) Считаем общие тоталы для каждого варианта
      let totalA = 0,
        totalB = 0,
        totalC = 0;
      Object.values(sumsByFactor).forEach(obj => {
        totalA += obj.a;
        totalB += obj.b;
        totalC += obj.c;
      });
      console.log(
        `totalA = ${totalA}, totalB = ${totalB}, totalC = ${totalC}`
      );

      // 7) Готовим массивы для waterfall
      const EMPTY = { value: TOKEN };
      const newAssist: any[] = [];
      const newIncrease: any[] = [];
      const newDecrease: any[] = [];
      const newTotalArr: any[] = [];

      // 7.a) Первичный тотал (вариант A, база = 0)
      newAssist.push(0);
      newIncrease.push(EMPTY);
      newDecrease.push(EMPTY);
      newTotalArr.push({
        value: totalA,
        originalValue: totalA,
        totalSum: totalA,
      });

      // 7.b) Дельты между A и B
      let cumAB = totalA;
      factors.forEach(factor => {
        const { a, b } = sumsByFactor[factor];
        const deltaAB = b - a;
        if (deltaAB >= 0) {
          newAssist.push({ value: cumAB });
          newIncrease.push({
            value: deltaAB,
            originalValue: deltaAB,
            totalSum: deltaAB,
          });
          newDecrease.push({ value: TOKEN });
          cumAB += deltaAB;
        } else {
          newAssist.push({ value: cumAB + deltaAB });
          newIncrease.push({ value: TOKEN });
          newDecrease.push({
            value: -deltaAB,
            originalValue: deltaAB,
            totalSum: deltaAB,
          });
          cumAB += deltaAB;
        }
        newTotalArr.push({ value: TOKEN });
      });

      // 7.c) Вторичный тотал (вариант B, база = 0)
      newAssist.push(0);
      newIncrease.push(EMPTY);
      newDecrease.push(EMPTY);
      newTotalArr.push({
        value: totalB,
        originalValue: totalB,
        totalSum: totalB,
      });

      // 7.d) Дельты между B и C
      let cumBC = totalB;
      factors.forEach(factor => {
        const { b, c } = sumsByFactor[factor];
        const deltaBC = c - b;
        if (deltaBC >= 0) {
          newAssist.push({ value: cumBC });
          newIncrease.push({
            value: deltaBC,
            originalValue: deltaBC,
            totalSum: deltaBC,
          });
          newDecrease.push({ value: TOKEN });
          cumBC += deltaBC;
        } else {
          newAssist.push({ value: cumBC + deltaBC });
          newIncrease.push({ value: TOKEN });
          newDecrease.push({
            value: -deltaBC,
            originalValue: deltaBC,
            totalSum: deltaBC,
          });
          cumBC += deltaBC;
        }
        newTotalArr.push({ value: TOKEN });
      });

      // 7.e) Третичный тотал (вариант C, база = 0)
      newAssist.push(0);
      newIncrease.push(EMPTY);
      newDecrease.push(EMPTY);
      newTotalArr.push({
        value: totalC,
        originalValue: totalC,
        totalSum: totalC,
      });

      console.log('newXAxisData (3var):', newXAxisData);
      console.log('newAssist (3var):', newAssist);
      console.log('newIncrease (3var):', newIncrease);
      console.log('newDecrease (3var):', newDecrease);
      console.log('newTotalArr (3var):', newTotalArr);

      // 8) Подмена исходных массивов
      xAxisData.splice(0, xAxisData.length, ...newXAxisData);
      assistData.splice(0, assistData.length, ...newAssist);
      increaseData.splice(0, increaseData.length, ...newIncrease);
      decreaseData.splice(0, decreaseData.length, ...newDecrease);
      totalData.splice(0, totalData.length, ...newTotalArr);

      // 9) Синхронизируем barSeries
      barSeries.forEach(s => {
        if (s.name === ASSIST_MARK) {
          s.data = newAssist;
          s.itemStyle = { color: 'transparent' };
          s.label = { show: false };
        }
        if (s.name === LEGEND.INCREASE) {
          s.data = newIncrease;
          s.itemStyle = {
            color: rgbToHex(increaseColor.r, increaseColor.g, increaseColor.b),
          };
          s.label = { show: showValue, position: 'top', formatter: seriesformatter };
        }
        if (s.name === LEGEND.DECREASE) {
          s.data = newDecrease;
          s.itemStyle = {
            color: rgbToHex(decreaseColor.r, decreaseColor.g, decreaseColor.b),
          };
          s.label = { show: showValue, position: 'bottom', formatter: seriesformatter };
        }
        if (s.name === LEGEND.TOTAL) {
          s.data = newTotalArr;
          s.itemStyle = {
            color: rgbToHex(totalColor.r, totalColor.g, totalColor.b),
          };
          s.label = { show: showValue, position: 'top', formatter: seriesformatter };
        }
      });

      // 10) Рисуем Δ-стрелки между A→B и B→C
      const diffAB = totalB - totalA;
      const pctAB = totalA !== 0 ? (diffAB / Math.abs(totalA)) * 100 : 0;
      const diffLabelAB = `${diffAB.toFixed(
        Math.max(0, Number(formData.deltaDecimals) || 0)
      )}${formData.deltaUnit ? ' ' + formData.deltaUnit : ''} (${pctAB.toFixed(
        Math.max(0, Number(formData.deltaDecimals) || 0)
      )}%)`;

      const diffBC = totalC - totalB;
      const pctBC = totalB !== 0 ? (diffBC / Math.abs(totalB)) * 100 : 0;
      const diffLabelBC = `${diffBC.toFixed(
        Math.max(0, Number(formData.deltaDecimals) || 0)
      )}${formData.deltaUnit ? ' ' + formData.deltaUnit : ''} (${pctBC.toFixed(
        Math.max(0, Number(formData.deltaDecimals) || 0)
      )}%)`;

      const midValueAB = (totalA + totalB) / 2;
      const midValueBC = (totalB + totalC) / 2;
      const idxB = 1 + factors.length; // позиция второго total в newXAxisData
      const idxC = idxB + 1 + factors.length; // позиция третьего total

      if (formData.showDeltaArrow) {
        barSeries.forEach(s => {
          if (s.name === LEGEND.TOTAL) {
            s.markLine = {
              symbol: ['arrow', 'arrow'],
              lineStyle: { color: '#000', width: 2 },
              zlevel: 10,
              data: [
                // 1-я стрелка: A → B
                [
                  { coord: [0, midValueAB] },
                  { coord: [idxB, midValueAB] },
                ],
                // 2-я стрелка: B → C
                [
                  { coord: [idxB, midValueBC] },
                  { coord: [idxC, midValueBC] },
                ],
              ],
              label: {
                show: true,
                position: 'middle',
                fontSize: 16,
                fontWeight: 'bold',
                // по dataIndex выбираем, какую подпись рисовать
                formatter: (params: any) =>
                  params.dataIndex === 0
                    ? `Δ₁ = ${diffLabelAB}`
                    : `Δ₂ = ${diffLabelBC}`,
                backgroundColor: 'rgba(249, 189, 0, 0.9)', // полупрозрачный жёлтый
                padding: [4, 8],       // отступы [вертикальный, горизонтальный]
                borderRadius: 4,       // скругление углов
              },
            };
          }
        });
      }


    }
  }



  // Если галочка включена, объединяем с предопределенным шаблоном
  if (formData.useCustomTemplate) {
    // Получаем индексы для сравнения из формы (приводим к числу)
    const compareStart = Number(formData.comparisonColumn1);
    const compareEnd = Number(formData.comparisonColumn2);
    const totalColumns = Array.isArray(xAxisData) ? xAxisData.length : 0;



    // Проверяем корректность введённых индексов:
    if (
      isNaN(compareStart) ||
      isNaN(compareEnd) ||
      compareStart < 0 ||
      compareEnd >= totalColumns ||
      compareStart >= compareEnd
    ) {
      console.error('Некорректные индексы сравнения');
    } else {
      // 1. Формируем новый порядок для оси X.
      // Новый массив начинается со столбца с индексом compareStart,
      // затем идут все остальные столбцы (оставляем их на своих местах),
      // за исключением выбранных, и завершается столбцом с индексом compareEnd.
      const newXAxisData: string[] = [];
      newXAxisData.push(xAxisData[compareStart]);
      for (let i = 0; i < xAxisData.length; i++) {
        if (i !== compareStart && i !== compareEnd) {
          newXAxisData.push(xAxisData[i]);
        }
      }
      newXAxisData.push(xAxisData[compareEnd]);

      // 2. Переставляем данные для каждой серии согласно новому порядку.
      // Для каждого ряда создаём новый массив, где элемент с индексом compareStart станет первым,
      // элемент с индексом compareEnd – последним, а остальные остаются на своих местах.
      barSeries.forEach(series => {
        const originalData = series.data;
        const newData = [];
        newData.push(originalData[compareStart]);
        for (let i = 0; i < originalData.length; i++) {
          if (i !== compareStart && i !== compareEnd) {
            newData.push(originalData[i]);
          }
        }
        newData.push(originalData[compareEnd]);
        series.data = newData;
      });

      // Обновляем ось X в конфигурации чарта
      echartOptions.xAxis = {
        ...echartOptions.xAxis,
        data: newXAxisData,
      };

      // 3. Опционально: делаем промежуточные столбцы полупрозрачными.
      const newTotalColumns = newXAxisData.length;
      barSeries.forEach(series => {
        series.data = series.data.map((dataPoint, index) => {
          // Если не первый (индекс 0) и не последний (индекс newTotalColumns - 1)
          if (index > 0 && index < newTotalColumns - 1) {
            return {
              ...dataPoint,
              itemStyle: {
                ...(dataPoint.itemStyle || {}),
                opacity: 0.7, // Полупрозрачность для промежуточных столбцов
              },
            };
          }
          return dataPoint;
        });
      });

      // 4. Вычисляем значения для выбранных столбцов.
      // Здесь для расчёта берём исходные данные из transformedData.
      const firstValue = Number(transformedData[compareStart][metricLabel]);
      const lastValue = Number(transformedData[compareEnd][metricLabel]);
      const difference = lastValue - firstValue;
      const pct =
        firstValue !== 0 ? (difference / Math.abs(firstValue)) * 100 : 0; // % от первого

      const dec = Math.max(0, Number(formData.deltaDecimals) || 0);
      const unitLabel = formData.deltaUnit.trim() ? ` ${formData.deltaUnit.trim()}` : '';

      const diffLabel = `${difference.toFixed(dec)}${unitLabel} (${pct.toFixed(dec)}%)`;

      const midValue = (firstValue + lastValue) / 2;
      const newLastIndex = newXAxisData.length - 1;

      // 5. Добавляем стрелку (markLine) для серии "Total"
      if (formData.showDeltaArrow) {
        barSeries.forEach(series => {
          if (series.name === LEGEND.TOTAL) {
            series.markLine = {
              symbol: ['arrow', 'arrow'], // Стрелка появляется на конце линии
              label: {
                show: true,
                position: 'middle',
                formatter: `Δ = ${diffLabel}`,
                fontSize: 18,                  // размер шрифта (px)
                fontWeight: 'bold',            // жирность шрифта
                color: '#000',                 // цвет
              },
              lineStyle: {
                color: '#000',
                width: 2,
              },
              data: [
                [
                  { coord: [0, midValue] },
                  { coord: [newLastIndex, midValue] },
                ],
              ],
              zlevel: 10, // Отрисовка поверх остальных элементов
            };
          }
        });
      }
    }
  }




  return {
    refs,
    formData,
    width,
    height,
    echartOptions,
    setDataMask,
    onContextMenu,
    onLegendStateChanged,
  };
}
