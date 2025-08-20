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
import React, { useCallback, useEffect, useMemo, useState } from 'react';

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
  obj_name: string;
  data: CommentBody[];
}

export type CommentItem = CommentBody & {
  tempId?: string;
  x_pct: number;
  y_pct: number;
};

interface CommentaryGetResponse {
  var_id: number;
  obj_name: string;
  data: CommentBody[];
}

const ENDPOINT = '/variant/profile_design/commentary';

type HttpMethod = 'GET' | 'POST' | 'PATCH' | 'DELETE';

async function request<T>(method: HttpMethod, endpoint: string, body?: unknown): Promise<T> {
  const fetchOptions: RequestInit = {
    method,
    headers: { 'Content-Type': 'application/json' },
  };
  if (body) fetchOptions.body = JSON.stringify(body);

  const response = await fetch(`${process.env.BACKEND_URL}${endpoint}`, fetchOptions);
  if (!response.ok) {
    let backendMsg = '';
    try {
      const { message } = await response.clone().json();
      backendMsg = message ? `: ${message}` : '';
    } catch { }
    throw new Error(`HTTP ${response.status}${backendMsg}`);
  }
  return response.json();
}

// API
export const getComments = (varId: number, objName: string) =>
  request<{ data: CommentBody[] }>(
    'GET',
    `${ENDPOINT}/${varId}?obj_name=${encodeURIComponent(objName)}`,
  );
const createComments = (payload: CommentaryPayload) =>
  request<{ info: string }>('POST', ENDPOINT, payload);
const patchComments = (payload: CommentaryPayload) =>
  request<{ info: string }>('PATCH', ENDPOINT, payload);
const deleteComment = (commentId: number) =>
  request<void>('DELETE', `${ENDPOINT}/del_comm/${commentId}`);

// --- helpers ---
function valuesFromAdhoc(fd: any, col: string): any[] {
  const adhoc = Array.isArray(fd?.adhoc_filters) ? fd.adhoc_filters : [];
  const out: any[] = [];
  adhoc.forEach((f: any) => {
    if (f?.expressionType === 'SIMPLE' && f?.subject === col) {
      const op = String(f?.operator ?? '').toUpperCase();
      if (op === 'IN' || op === '==' || op === 'EQ' || op === 'EQUALS') {
        if (Array.isArray(f?.comparator)) out.push(...f.comparator);
        else if (f?.comparator != null) out.push(f.comparator);
      }
    }
  });
  return out;
}
function valuesFromExtra(fd: any, col: string): any[] {
  const filters = Array.isArray(fd?.extraFormData?.filters) ? fd.extraFormData.filters : [];
  const out: any[] = [];
  filters.forEach((fl: any) => {
    if (fl?.col === col) {
      if (Array.isArray(fl?.val)) out.push(...fl.val);
      else if (fl?.val != null) out.push(fl.val);
    }
  });
  return out;
}
function uniq<T>(arr: T[]): T[] {
  return Array.from(new Set(arr));
}

export default function EchartsMixedTimeseries(props: EchartsMixedTimeseriesChartTransformedProps) {
  const {
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
  } = props;

  const isFirstQuery = useCallback((seriesIndex: number) => seriesIndex < seriesBreakdown, [seriesBreakdown]);
  const containerRef = React.useRef<HTMLDivElement>(null);

  const [comments, setComments] = useState<CommentItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // 1) Вариант
  const { variantId: rawVariantId, hint: variantHint } = useProjectVariantIds(queriesData);
  const variantId = useMemo<number | undefined>(() => {
    if (rawVariantId == null) return undefined;
    return typeof rawVariantId === 'string' ? Number(rawVariantId) : rawVariantId;
  }, [rawVariantId]);

  // 2) Объект (из фильтра fclt_name)
  const objectSelections = useMemo<string[]>(() => {
    const vals = uniq<string>([
      ...valuesFromAdhoc(formData, 'fclt_name'),
      ...valuesFromExtra(formData, 'fclt_name'),
    ].map(String));
    return vals;
  }, [formData]);

  const objName: string | undefined = useMemo(() => {
    return objectSelections.length === 1 ? String(objectSelections[0]) : undefined;
  }, [objectSelections]);

  const objectHint: string | undefined = useMemo(() => {
    if (objectSelections.length === 0) return 'Выберите 1 объект в фильтре.';
    if (objectSelections.length > 1) return `Выбрано ${objectSelections.length} объектов. Нужен ровно 1.`;
    return undefined;
  }, [objectSelections]);

  const commentsAllowed =
    Boolean(formData?.comments) &&
    variantId !== undefined &&
    objName !== undefined;

  const combinedHint = useMemo(() => {
    const parts = [variantHint, objectHint].filter(Boolean) as string[];
    return parts.length ? parts.join(' ') : undefined;
  }, [variantHint, objectHint]);

  const toItem = (c: CommentBody): CommentItem => ({
    ...c,
    x_pct: c.x_coord,
    y_pct: c.y_coord,
  });

  const fetchAndSet = async (varId: number, name: string) => {
    try {
      setLoading(true);
      const resp = await getComments(varId, name); // сервер сам вернёт подходящий obj_name
      setComments(resp.data.map(toItem));
    } catch (err) {
      console.error('❌ Ошибка загрузки комментариев:', err);
    } finally {
      setLoading(false);
    }
  };

  // грузим только когда разрешено (1 вариант и 1 объект)
  useEffect(() => {
    if (!commentsAllowed) return;
    fetchAndSet(variantId!, objName);
  }, [commentsAllowed, variantId, objName]); // objName влияет на разрешение

  // следим за ресайзом контейнера
  const [, force] = useState({});
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => force({}));
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
      const values = selected.includes(seriesName)
        ? selected.filter(v => v !== seriesName)
        : [seriesName];

      const currentGroupBy = isFirstQuery(seriesIndex) ? groupby : groupbyB;
      const currentLabelMap = isFirstQuery(seriesIndex) ? labelMap : labelMapB;
      const groupbyValues = values.map(value => currentLabelMap?.[value]).filter(Boolean) as any[];

      return {
        dataMask: {
          extraFormData: {
            // @ts-ignore
            filters:
              values.length === 0
                ? []
                : currentGroupBy.map((col, idx) => {
                  const val: DataRecordValue[] = groupbyValues.map(v => v[idx]);
                  if (val === null || val === undefined)
                    return { col, op: 'IS NULL' as const };
                  return { col, op: 'IN' as const, val: val as (string | number | boolean)[] };
                }),
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
      if (!emitCrossFilters) return;
      setDataMask(getCrossFilterDataMask(seriesName, seriesIndex).dataMask);
    },
    [emitCrossFilters, setDataMask, getCrossFilterDataMask],
  );

  const eventHandlers: EventHandlers = {
    click: params => {
      const { seriesName, seriesIndex } = params;
      handleChange(seriesName, seriesIndex);
    },
    mouseout: () => onFocusedSeries(null),
    mouseover: params => onFocusedSeries(params.seriesName),
    contextmenu: async eventParams => {
      if (!onContextMenu) return;
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
          col: xAxis.label === DTTM_ALIAS ? (formData as any).granularitySqla : xAxis.label,
          grain: (formData as any).timeGrainSqla,
          op: '==',
          val: data[0],
          formattedVal: xValueFormatter(data[0]),
        });
      }
      [
        ...(data && xAxis.type === AxisType.Category ? [xAxis.label] : []),
        ...(isFirst ? (formData as any).groupby : (formData as any).groupbyB),
      ].forEach((dimension, i) =>
        drillToDetailFilters.push({
          col: dimension,
          op: '==',
          val: values[i],
          formattedVal: String(values[i]),
        }),
      );

      [...(isFirst ? (formData as any).groupby : (formData as any).groupbyB)].forEach((dimension, i) =>
        drillByFilters.push({
          col: dimension,
          op: '==',
          val: values[i],
          formattedVal: formatSeriesName(values[i], {
            timeFormatter: getTimeFormatter((formData as any).dateFormat),
            numberFormatter: getNumberFormatter((formData as any).numberFormat),
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
    },
  };

  const addEmptyComment = () => {
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

    // Просто добавляем локально, без сети.
    setComments(prev => [...prev, temp]);
  };


  const handleSave = async () => {
    if (variantId === undefined || !objName) return;

    setSaving(true);
    try {
      const toPost = comments
        .filter(c => !c.id)
        .map(({ x_pct, y_pct, tempId, id, ...rest }) => ({
          ...rest,
          x_coord: x_pct,
          y_coord: y_pct,
        }));

      const toPatch = comments
        .filter(c => c.id)
        .map(({ x_pct, y_pct, tempId, ...rest }) => ({
          ...rest,
          x_coord: x_pct,
          y_coord: y_pct,
        }));

      // 1) создаём новые (без id)
      if (toPost.length) {
        await createComments({
          var_id: variantId,
          obj_name: objName,
          data: toPost, // без id!
        });
      }

      // 2) обновляем существующие (с id)
      if (toPatch.length) {
        await patchComments({
          var_id: variantId,
          obj_name: objName,
          data: toPatch, // с id внутри
        });
      }

      // 3) перечитать актуальные данные
      await fetchAndSet(variantId, objName);
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

      if (target.id) {
        deleteComment(target.id).catch(err => {
          alert(`❌ Не удалось удалить: ${err.message}`);
          setComments(prev => [...prev.slice(0, idx), target, ...prev.slice(idx)]);
        });
      }
      return rest;
    });
  };

  const onDragStop = (idx: number, pos: { x: number; y: number }) => {
    const el = containerRef.current;
    if (!el) return;
    const { width: w, height: h } = el.getBoundingClientRect();
    setComments(cs => {
      const copy = [...cs];
      copy[idx] = { ...copy[idx], x_pct: pos.x / w, y_pct: pos.y / h };
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

  return (
    <div ref={containerRef} style={{ position: 'relative', height, width }}>
      {/* График */}
      <Echart
        refs={refs}
        height={height}
        width={width}
        echartOptions={echartOptions}
        eventHandlers={eventHandlers}
        selectedValues={selectedValues}
      />

      {/* Подсказка, если нельзя показывать комментарии */}
      {formData.comments && !commentsAllowed && (
        <div
          style={{
            position: 'absolute',
            top: 8,
            left: 8,
            maxWidth: 420,
            padding: '6px 10px',
            background: '#fff8d1',
            border: '1px solid #e6d48c',
            borderRadius: 4,
            fontSize: 13,
            lineHeight: 1.4,
            zIndex: 30,
            boxShadow: '0 2px 4px rgb(0 0 0 / .15)',
          }}
        >
          {combinedHint ||
            'Чтобы работать с комментариями, выберите ровно 1 вариант и ровно 1 объект в фильтре «fclt_name».'
          }
        </div>
      )}

      {/* Панель действий — абсолютная, не двигает график */}
      {formData.comments && commentsAllowed && (
        <div
          style={{
            position: 'absolute',
            top: 8,
            right: 8,
            display: 'flex',
            gap: 8,
            zIndex: 30,
            pointerEvents: 'none',
          }}
        >
          <button
            onClick={addEmptyComment}
            style={{
              padding: '2px 10px',
              background: '#4CAF50',
              color: '#fff',
              border: 'none',
              borderRadius: 4,
              cursor: 'pointer',
              pointerEvents: 'auto',
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
              pointerEvents: 'auto',
            }}
          >
            {saving ? 'Сохранение…' : 'Сохранить'}
          </button>
        </div>
      )}

      {/* Иконка загрузки — абсолютная */}
      {loading && commentsAllowed && (
        <div
          style={{
            position: 'absolute',
            bottom: 8,
            left: 8,
            padding: '2px 8px',
            background: '#ffffffcc',
            borderRadius: 4,
            fontSize: 12,
            zIndex: 30,
          }}
        >
          Загрузка…
        </div>
      )}

      {/* Комментарии — только если разрешено */}
      {formData.comments &&
        commentsAllowed &&
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
                  zIndex: 25,
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
            </Draggable>
          );
        })}
    </div>
  );
}
