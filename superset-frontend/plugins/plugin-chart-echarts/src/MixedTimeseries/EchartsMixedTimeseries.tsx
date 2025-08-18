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
import React, { useCallback, useEffect, useState } from 'react';

import {
  AxisType,
  BinaryQueryObjectFilterClause,
  DTTM_ALIAS,
  DataRecordValue,
  getColumnLabel,
  getNumberFormatter,
  getTimeFormatter,
  styled,
} from '@superset-ui/core';
import { EchartsMixedTimeseriesChartTransformedProps } from './types';
import Echart from '../components/Echart';
import { EventHandlers } from '../types';
import { formatSeriesName } from '../utils/series';
import { useProjectVariantIds } from './hooks/useProjectVariantIds';
import Draggable from './components/Draggable';

const StyledTextArea = styled.textarea`
  width: 100%;
  min-height: 40px;
  resize: none; /* По умолчанию ресайз отключён */
  border: none;
  padding: 4px;
  font-size: 14px;
  box-sizing: border-box;
  display: block;
  overflow: hidden;
  background: transparent;
  outline: none;
`;

let uid = 0;

export const genTempId = () =>
  `t${Date.now().toString(36)}_${(uid++).toString(36)}_${Math.random()
    .toString(36)
    .slice(2, 6)}`;

export interface CommentBody {
  id?: number;
  x_coord: number;
  y_coord: number;
  prof_design_type: 'ppn' | 'ppv' | 'other';
  description: string;
}

export interface CommentaryPayload {
  var_id: number;
  data: CommentBody[];
}

export type CommentItem = CommentBody & {
  tempId?: string;
  x_pct: number;
  y_pct: number;
}

const ENDPOINT = '/variant/profile_design/commentary';

type HttpMethod = 'GET' | 'POST' | 'PATCH' | 'DELETE';

export async function request<T>(
  method: HttpMethod,
  endpoint: string,
  body?: unknown,
): Promise<T> {
  const fetchOptions: RequestInit = {
    method,
    headers: { 'Content-Type': 'application/json' },
  };
  if (body) {
    fetchOptions.body = JSON.stringify(body);
  }
  const response = await fetch(`${process.env.BACKEND_URL}${endpoint}`, fetchOptions);

  if (!response.ok) {
    let backendMsg = '';
    try {
      const { message } = await response.clone().json();
      backendMsg = message ? `: ${message}` : '';
    } catch {
      /* тело не JSON – игнор */
    }
    throw new Error(`HTTP ${response.status}${backendMsg}`);
  }

  return response.json();
}

export const getComments = (varId: number) =>
  request<{ data: CommentBody[] }>('GET', `${ENDPOINT}/${varId}`);

export const createComments = (payload: CommentaryPayload) =>
  request<{ info: string }>('POST', ENDPOINT, payload);

export const patchComments = (payload: CommentaryPayload) =>
  request<{ info: string }>('PATCH', ENDPOINT, payload);

export const deleteComment = (commentId: number) =>
  request<void>('DELETE', `${ENDPOINT}/del_comm/${commentId}`);

export default function EchartsMixedTimeseries({
  height,
  width,
  echartOptions,
  setDataMask,
  labelMap,
  labelMapB,
  groupby,
  groupbyB,
  selectedValues,
  formData,
  emitCrossFilters,
  seriesBreakdown,
  onContextMenu,
  onFocusedSeries,
  xValueFormatter,
  xAxis,
  refs,
  coltypeMapping,
  queriesData,
}: EchartsMixedTimeseriesChartTransformedProps) {
  const isFirstQuery = useCallback(
    (seriesIndex: number) => seriesIndex < seriesBreakdown,
    [seriesBreakdown],
  );
  const containerRef = React.useRef<HTMLDivElement>(null);

  const [comments, setComments] = useState<CommentItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const { variantId: rawVariantId, hint } = useProjectVariantIds(queriesData);
  const variantId = React.useMemo<number | undefined>(() => {
    if (rawVariantId == null) return undefined;
    return typeof rawVariantId === 'string' ? Number(rawVariantId) : rawVariantId;
  }, [rawVariantId]);

  console.log("varId", variantId);


  useEffect(() => {
    if (!formData.comments || variantId === undefined) return;

    const fetchComments = async () => {
      setLoading(true);
      try {
        const { data } = await getComments(variantId);

        const items: CommentItem[] = data.map(c => ({
          ...c,
          x_pct: c.x_coord,
          y_pct: c.y_coord,
        }));

        setComments(items);
      } catch (err) {
        console.error('❌ Ошибка загрузки комментариев:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchComments();
  }, [variantId, formData.comments]);

  const [, force] = useState({});
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const ro = new ResizeObserver(() => force({})); // триггерит перерисовку
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const toPixels = (c: CommentItem) => {
    const el = containerRef.current;
    if (!el) return { x: 0, y: 0 };
    const { width: w, height: h } = el.getBoundingClientRect();
    return { x: c.x_pct * w, y: c.y_pct * h };
  };

  const toPercents = (x: number, y: number) => {
    const el = containerRef.current;
    if (!el) return { x_pct: 0, y_pct: 0 };
    const { width: w, height: h } = el.getBoundingClientRect();
    return { x_pct: x / w, y_pct: y / h };
  };


  const getCrossFilterDataMask = useCallback(
    (seriesName, seriesIndex) => {
      const selected: string[] = Object.values(selectedValues || {});
      let values: string[];
      if (selected.includes(seriesName)) {
        values = selected.filter(v => v !== seriesName);
      } else {
        values = [seriesName];
      }

      const currentGroupBy = isFirstQuery(seriesIndex) ? groupby : groupbyB;
      const currentLabelMap = isFirstQuery(seriesIndex) ? labelMap : labelMapB;
      const groupbyValues = values
        .map(value => currentLabelMap?.[value])
        .filter(value => !!value);

      return {
        dataMask: {
          extraFormData: {
            // @ts-ignore
            filters:
              values.length === 0
                ? []
                : [
                  ...currentGroupBy.map((col, idx) => {
                    const val: DataRecordValue[] = groupbyValues.map(
                      v => v[idx],
                    );
                    if (val === null || val === undefined)
                      return {
                        col,
                        op: 'IS NULL' as const,
                      };
                    return {
                      col,
                      op: 'IN' as const,
                      val: val as (string | number | boolean)[],
                    };
                  }),
                ],
          },
          filterState: {
            value: !groupbyValues.length ? null : groupbyValues,
            selectedValues: values.length ? values : null,
          },
        },
        isCurrentValueSelected: selected.includes(seriesName),
      };
    },
    [groupby, groupbyB, isFirstQuery, labelMap, labelMapB, selectedValues],
  );

  const handleChange = useCallback(
    (seriesName: string, seriesIndex: number) => {
      if (!emitCrossFilters) {
        return;
      }

      setDataMask(getCrossFilterDataMask(seriesName, seriesIndex).dataMask);
    },
    [emitCrossFilters, setDataMask, getCrossFilterDataMask],
  );

  const eventHandlers: EventHandlers = {
    click: props => {
      const { seriesName, seriesIndex } = props;
      handleChange(seriesName, seriesIndex);
    },
    mouseout: () => {
      onFocusedSeries(null);
    },
    mouseover: params => {
      onFocusedSeries(params.seriesName);
    },
    contextmenu: async eventParams => {
      if (onContextMenu) {
        eventParams.event.stop();
        const { data, seriesName, seriesIndex } = eventParams;
        const pointerEvent = eventParams.event.event;
        const drillToDetailFilters: BinaryQueryObjectFilterClause[] = [];
        const drillByFilters: BinaryQueryObjectFilterClause[] = [];
        const isFirst = isFirstQuery(seriesIndex);
        const values = [
          ...(eventParams.name ? [eventParams.name] : []),
          ...(isFirst ? labelMap : labelMapB)[eventParams.seriesName],
        ];
        if (data && xAxis.type === AxisType.Time) {
          drillToDetailFilters.push({
            col:
              xAxis.label === DTTM_ALIAS
                ? formData.granularitySqla
                : xAxis.label,
            grain: formData.timeGrainSqla,
            op: '==',
            val: data[0],
            formattedVal: xValueFormatter(data[0]),
          });
        }
        [
          ...(data && xAxis.type === AxisType.Category ? [xAxis.label] : []),
          ...(isFirst ? formData.groupby : formData.groupbyB),
        ].forEach((dimension, i) =>
          drillToDetailFilters.push({
            col: dimension,
            op: '==',
            val: values[i],
            formattedVal: String(values[i]),
          }),
        );

        [...(isFirst ? formData.groupby : formData.groupbyB)].forEach(
          (dimension, i) =>
            drillByFilters.push({
              col: dimension,
              op: '==',
              val: values[i],
              formattedVal: formatSeriesName(values[i], {
                timeFormatter: getTimeFormatter(formData.dateFormat),
                numberFormatter: getNumberFormatter(formData.numberFormat),
                coltype: coltypeMapping?.[getColumnLabel(dimension)],
              }),
            }),
        );
        onContextMenu(pointerEvent.clientX, pointerEvent.clientY, {
          drillToDetail: drillToDetailFilters,
          crossFilter: getCrossFilterDataMask(seriesName, seriesIndex),
          drillBy: {
            filters: drillByFilters,
            groupbyFieldName: isFirst ? 'groupby' : 'groupby_b',
            adhocFilterFieldName: isFirst ? 'adhoc_filters' : 'adhoc_filters_b',
          },
        });
      }
    },
  };

  const addEmptyComment = async () => {
    if (variantId === undefined) return;

    const { x_pct, y_pct } = toPercents(20, 20);
    const temp: CommentItem = {
      tempId: genTempId(),
      x_coord: x_pct,
      y_coord: y_pct,
      x_pct,
      y_pct,
      prof_design_type: 'ppn',
      description: 'Новый комментарий',
    };

    // оптимистично добавляем на экран
    setComments(prev => [...prev, temp]);

    try {
      await createComments({ var_id: variantId, data: [temp] }); // вернёт {info: "Успех"}
      await fetchAndSet(variantId); // перечитываем актуальные данные с id от сервера
    } catch (err) {
      console.error('❌ Ошибка создания комментария:', err);
      // откат оптимистичного добавления
      setComments(prev => prev.filter(c => c.tempId !== temp.tempId));
      alert(`Не удалось создать комментарий: ${err}`);
    }
  };


  const toItem = (c: CommentBody): CommentItem => ({
    ...c,
    x_pct: c.x_coord,
    y_pct: c.y_coord,
  });

  const fetchAndSet = async (varId: number) => {
    try {
      const { data } = await getComments(varId);
      setComments(data.map(toItem));
    } catch (err) {
      console.error('❌ Ошибка загрузки комментариев:', err);
    }
  };


  const handleSave = async () => {
    if (variantId === undefined) return;

    setSaving(true);
    try {
      const payload: CommentaryPayload = {
        var_id: variantId,
        data: comments.map(({ x_pct, y_pct, ...rest }) => ({
          ...rest,
          x_coord: x_pct,
          y_coord: y_pct,
        })),
      };

      await patchComments(payload);   // если дошли сюда – сохранение прошло
      await fetchAndSet(variantId);   // перечитываем - всегда актуальные данные
    } catch (err) {
      alert(`❌ Не удалось сохранить комментарии: ${err}`);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (idx: number) => {
    setComments(cs => {
      const target = cs[idx];
      const rest = cs.filter((_, i) => i !== idx);

      // optimistic UI: убираем сразу
      if (target.id) {
        deleteComment(target.id).catch(err => {
          alert(`❌ Не удалось удалить: ${err.message}`);
          // откатываем, если сервер упал
          setComments(prev => [...prev.slice(0, idx), target, ...prev.slice(idx)]);
        });
      }
      return rest;
    });
  };

  const onDragStop = (idx: number, pos: { x: number; y: number }) => {
    const { width: w, height: h } = containerRef.current!.getBoundingClientRect();
    setComments(cs => {
      const copy = [...cs];
      copy[idx] = {
        ...copy[idx],
        x_pct: pos.x / w,
        y_pct: pos.y / h,
      };
      return copy;
    });
  };


  const onBlur = (idx: number, text: string) => {
    setComments(cs => {
      const copy = [...cs];
      copy[idx] = { ...copy[idx], description: text };
      return copy;
    });
  };


  // Подстройка высоты textarea
  // const autoResize = (textarea: HTMLTextAreaElement) => {
  //   textarea.style.height = 'auto';
  //   textarea.style.height = `${textarea.scrollHeight}px`;
  // };

  return (
    <div ref={containerRef} style={{ position: 'relative', height, width }}>
      {loading ? (
        <p>Загрузка...</p>
      ) : (
        <>
          {hint && formData.comments && (
            <div
              style={{
                position: 'absolute',
                top: 8,
                left: 8,
                maxWidth: 320,
                padding: '2px 10px',
                background: '#fff8d1',
                border: '1px solid #e6d48c',
                borderRadius: 4,
                fontSize: 13,
                lineHeight: 1.4,
                zIndex: 20,
                boxShadow: '0 2px 4px rgb(0 0 0 / .15)',
              }}
            >
              {hint}
            </div>
          )}

          {!hint && formData.comments && (
            <div style={{ marginBottom: 0 }}>
              <button
                onClick={addEmptyComment}
                style={{
                  padding: '2px 10px',
                  background: '#4CAF50',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 4,
                  cursor: 'pointer',
                  marginRight: '10px',
                }}
              >
                Добавить комментарий
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                style={{
                  padding: '2px 10px',
                  background: '#4CAF50',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 4,
                  opacity: saving ? 0.6 : 1,
                }}
              >
                {saving ? 'Сохранение…' : 'Сохранить'}
              </button>
            </div>
          )}
        </>
      )}
      <Echart
        refs={refs}
        height={height}
        width={width}
        echartOptions={echartOptions}
        eventHandlers={eventHandlers}
        selectedValues={selectedValues}
      />
      {!hint && formData.comments &&
        comments.map((c, idx) => {
          const { x, y } = toPixels(c);
          return (
            <Draggable
              key={c.id ?? c.tempId}
              defaultPosition={{ x, y }}
              onStop={(_, data) => onDragStop(idx, data)}
            >
              <div
                style={{
                  position: 'absolute',
                  background: '#fffbe8',
                  border: '1px solid #ccc',
                  padding: 6,
                  borderRadius: 4,
                  width: 250,
                  zIndex: 10,
                  boxShadow: '0 2px 4px rgb(0 0 0 / .15)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start' }}>
                  <StyledTextArea
                    defaultValue={c.description}
                    onBlur={e => onBlur(idx, e.target.value)}
                    onInput={e => {
                      const ta = e.currentTarget;
                      ta.style.height = 'auto';
                      ta.style.height = `${ta.scrollHeight}px`;
                    }}
                  />
                  <button
                    onClick={() => handleDelete(idx)}
                    title="Удалить"
                    style={{
                      marginLeft: 4,
                      border: 'none',
                      background: 'transparent',
                      cursor: 'pointer',
                      fontSize: 16,
                      lineHeight: 1,
                    }}
                  >
                    ❌
                  </button>
                </div>
              </div>
            </Draggable>)
        })}
    </div>
  );
}
