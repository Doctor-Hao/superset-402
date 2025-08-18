import React, { useState, useEffect, useMemo } from 'react';
import { t } from '@superset-ui/core';

interface Slot {
  level1: string;
  level2: string;
  level3: string;
  level4: string;
  metric: string;
}

interface GroupInfo {
  key: string;
  name: string;
  indices: number[];
  metrics: string[];
}

interface ColumnReorderControlProps {
  slots: Slot[];
  showSegments: boolean;
  currentSwaps: [number, number][];
  onChange: (swaps: [number, number][]) => void;
}

export default function ColumnReorderControl({
  slots,
  showSegments,
  currentSwaps,
  onChange
}: ColumnReorderControlProps) {
  const [localSwaps, setLocalSwaps] = useState<[number, number][]>(currentSwaps);

  useEffect(() => {
    setLocalSwaps(currentSwaps);
  }, [currentSwaps]);

  const groups = useMemo((): GroupInfo[] => {
    const groupMap: { [key: string]: { indices: number[]; metrics: string[] } } = {};
    
    slots.forEach((slot, index) => {
      let groupKey: string;
      let groupName: string;
      
      if (showSegments && slot.level4) {
        groupKey = `${slot.level1}|${slot.level2}|${slot.level3}|${slot.level4}`;
        groupName = `${slot.level1} → ${slot.level2} → ${slot.level3} → ${slot.level4}`;
      } else if (showSegments && slot.level3) {
        groupKey = `${slot.level1}|${slot.level2}|${slot.level3}`;
        groupName = `${slot.level1} → ${slot.level2} → ${slot.level3}`;
      } else if (slot.level2) {
        groupKey = `${slot.level1}|${slot.level2}`;
        groupName = `${slot.level1} → ${slot.level2}`;
      } else {
        groupKey = slot.level1;
        groupName = slot.level1;
      }
      
      if (!groupMap[groupKey]) {
        groupMap[groupKey] = { indices: [], metrics: [] };
      }
      groupMap[groupKey].indices.push(index);
      groupMap[groupKey].metrics.push(slot.metric);
    });

    return Object.entries(groupMap).map(([key, data]) => ({
      key,
      name: key,
      indices: data.indices,
      metrics: data.metrics
    }));
  }, [slots, showSegments]);

  const applySwapsToArray = <T,>(arr: T[], swaps: [number, number][]): T[] => {
    const result = [...arr];
    for (const [from, to] of swaps) {
      if (from >= 0 && to >= 0 && from < result.length && to < result.length) {
        const temp = result[from];
        result[from] = result[to];
        result[to] = temp;
      }
    }
    return result;
  };

  const getCurrentOrder = (groupIndices: number[]): string[] => {
    const groupSlots = groupIndices.map(i => slots[i]);
    const reordered = applySwapsToArray(groupSlots, localSwaps);
    return reordered.map(slot => slot.metric);
  };

  const moveMetricInGroup = (groupIndices: number[], metricIndex: number, direction: 'left' | 'right') => {
    const currentOrder = getCurrentOrder(groupIndices);
    const newMetricIndex = direction === 'left' ? metricIndex - 1 : metricIndex + 1;
    
    if (newMetricIndex < 0 || newMetricIndex >= currentOrder.length) {
      return;
    }

    const originalFromIndex = groupIndices[metricIndex];
    const originalToIndex = groupIndices[newMetricIndex];
    
    const newSwaps = [...localSwaps, [originalFromIndex, originalToIndex] as [number, number]];
    setLocalSwaps(newSwaps);
    onChange(newSwaps);
  };

  const resetSwaps = () => {
    setLocalSwaps([]);
    onChange([]);
  };

  const removeLastSwap = () => {
    const newSwaps = localSwaps.slice(0, -1);
    setLocalSwaps(newSwaps);
    onChange(newSwaps);
  };

  return (
    <div style={{ padding: '10px', border: '1px solid #d9d9d9', borderRadius: '4px' }}>
      <div style={{ marginBottom: '10px', display: 'flex', gap: '10px' }}>
        <button 
          type="button" 
          onClick={resetSwaps}
          style={{ padding: '4px 8px', fontSize: '12px' }}
        >
          {t('Reset Order')}
        </button>
        <button 
          type="button" 
          onClick={removeLastSwap}
          disabled={localSwaps.length === 0}
          style={{ padding: '4px 8px', fontSize: '12px' }}
        >
          {t('Undo Last Move')}
        </button>
      </div>

      {groups.map((group) => (
        <div key={group.key} style={{ marginBottom: '15px', padding: '8px', backgroundColor: '#f5f5f5', borderRadius: '4px' }}>
          <div style={{ fontWeight: 'bold', marginBottom: '8px', fontSize: '14px' }}>
            {group.name}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {getCurrentOrder(group.indices).map((metric, metricIndex) => (
              <div key={`${group.key}-${metricIndex}`} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => moveMetricInGroup(group.indices, metricIndex, 'left')}
                  disabled={metricIndex === 0}
                  style={{ 
                    padding: '2px 6px', 
                    fontSize: '12px', 
                    minWidth: '24px',
                    backgroundColor: metricIndex === 0 ? '#f0f0f0' : '#e6f7ff',
                    border: '1px solid #d9d9d9',
                    cursor: metricIndex === 0 ? 'not-allowed' : 'pointer'
                  }}
                >
                  ←
                </button>
                <span style={{ 
                  flex: 1, 
                  padding: '4px 8px', 
                  backgroundColor: 'white', 
                  border: '1px solid #d9d9d9',
                  borderRadius: '2px',
                  fontSize: '13px'
                }}>
                  {metric}
                </span>
                <button
                  type="button"
                  onClick={() => moveMetricInGroup(group.indices, metricIndex, 'right')}
                  disabled={metricIndex === getCurrentOrder(group.indices).length - 1}
                  style={{ 
                    padding: '2px 6px', 
                    fontSize: '12px', 
                    minWidth: '24px',
                    backgroundColor: metricIndex === getCurrentOrder(group.indices).length - 1 ? '#f0f0f0' : '#e6f7ff',
                    border: '1px solid #d9d9d9',
                    cursor: metricIndex === getCurrentOrder(group.indices).length - 1 ? 'not-allowed' : 'pointer'
                  }}
                >
                  →
                </button>
              </div>
            ))}
          </div>
        </div>
      ))}

      {localSwaps.length > 0 && (
        <div style={{ marginTop: '10px', padding: '8px', backgroundColor: '#fff7e6', borderRadius: '4px' }}>
          <div style={{ fontSize: '12px', fontWeight: 'bold', marginBottom: '4px' }}>
            {t('Applied Swaps')}:
          </div>
          <div style={{ fontSize: '11px', fontFamily: 'monospace' }}>
            {JSON.stringify(localSwaps)}
          </div>
        </div>
      )}
    </div>
  );
}