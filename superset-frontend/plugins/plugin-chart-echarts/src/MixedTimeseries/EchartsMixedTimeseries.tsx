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
// import Draggable from 'react-draggable';

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

  &:hover {
    resize: vertical; /* При наведении появляется возможность вертикального ресайза */
  }
`;

type CommentItem = {
  comm_id: number;
  var_id: number;
  comm_type: string;
  description: string;
  x: number;
  y: number;
};

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
}: EchartsMixedTimeseriesChartTransformedProps) {
  const isFirstQuery = useCallback(
    (seriesIndex: number) => seriesIndex < seriesBreakdown,
    [seriesBreakdown],
  );

  // const [comments, setComments] = useState<CommentItem[]>([]);

  // useEffect(() => {
  //   if (formData.showComments) {
  //     fetch('/api/comments')
  //       .then(res => res.json())
  //       .then(data => {
  //         if (Array.isArray(data)) {
  //           setComments(data);
  //         } else {
  //           console.warn('⚠️ Комментарии не массив:', data);
  //           setComments([]); // fallback
  //         }
  //       })
  //       .catch(err => {
  //         console.error('Ошибка загрузки комментариев:', err);
  //         setComments([]); // fallback на ошибку
  //       });
  //   }
  // }, [formData.showComments]);




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

  // Подстройка высоты textarea
  // const autoResize = (textarea: HTMLTextAreaElement) => {
  //   textarea.style.height = 'auto';
  //   textarea.style.height = `${textarea.scrollHeight}px`;
  // };

  return (
    <div style={{ position: 'relative', height, width }}>
      {/* {formData.showComments && (
        <div style={{ marginBottom: 8 }}>
          <button
            style={{
              padding: '4px 8px',
              backgroundColor: '#4CAF50',
              color: 'white',
              border: 'none',
              marginLeft: '8px',
            }}
            onClick={() => {
              const newComment = {
                comm_id: Math.random(),
                var_id: 0,
                comm_type: 'note',
                description: 'Комментарий',
                x: 0,
                y: -100,
              };
              setComments([...comments, newComment]);

            }}>
            Добавить комментарий
          </button>
        </div>
      )} */}
      <Echart
        refs={refs}
        height={height}
        width={width}
        echartOptions={echartOptions}
        eventHandlers={eventHandlers}
        selectedValues={selectedValues}
      />
      {/* {formData.showComments && Array.isArray(comments) && comments.map((c, idx) => (
        <Draggable
          key={c.comm_id}
          defaultPosition={{ x: c.x, y: c.y }}
          onStop={(e, data) => {
            const updated = [...comments];
            updated[idx] = { ...updated[idx], x: data.x, y: data.y };
            setComments(updated);
          }}
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
            }}
          >
            <StyledTextArea
              defaultValue={c.description}
              onChange={e => {
                const textarea = e.target as HTMLTextAreaElement;
                textarea.style.height = 'auto';
                textarea.style.height = `${textarea.scrollHeight}px`;
              }}
              onBlur={e => {
                const updated = { ...c, description: e.target.value };
                fetch(`/api/comments/${c.comm_id}`, {
                  method: 'PUT',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(updated),
                })
                  .then(res => {
                    if (res.ok) {
                      alert('✅ Комментарий сохранён');
                    } else {
                      alert('❌ Ошибка при сохранении');
                    }
                  });
              }}
            />
          </div>
        </Draggable>
      ))} */}
    </div>
  );
}
