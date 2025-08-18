import React from 'react';
import { ControlComponentProps } from '@superset-ui/chart-controls';
import ColumnReorderControl from './ColumnReorderControl';

interface ColumnReorderControlWrapperProps extends ControlComponentProps {
  onChange: (value: string) => void;
  value: string;
}

export default function ColumnReorderControlWrapper({
  onChange,
  value,
  formData
}: ColumnReorderControlWrapperProps) {
  // Parse headerTree to get slots
  const parseHeaderTree = (headerTreeJson: string) => {
    try {
      if (!headerTreeJson) return { groups: [] };
      return JSON.parse(headerTreeJson);
    } catch {
      return { groups: [] };
    }
  };

  // Generate slots from headerTree and metrics (simplified version)
  const generateSlots = (tree: any, metrics: string[]) => {
    const slots: Array<{ level1: string; level2: string; level3: string; metric: string }> = [];
    let p = 0;
    
    const groups = Array.isArray(tree?.groups) ? tree.groups : [];
    
    groups.forEach((g: any) => {
      const l1 = g?.title ?? '—';
      const subgroups = Array.isArray(g?.subgroups) ? g.subgroups : [];

      if (!subgroups.length) {
        const segs = Array.isArray(g?.segments) ? g.segments : [];
        if (segs.length) {
          segs.forEach((seg: any) => {
            const l3 = seg?.title ?? '';
            const cnt = Math.max(0, Number(seg?.count ?? 0));
            for (let i = 0; i < cnt && p < metrics.length; i += 1, p += 1) {
              slots.push({ level1: l1, level2: '', level3: l3, metric: metrics[p] });
            }
          });
        }
      }

      subgroups.forEach((sg: any) => {
        const l2 = sg?.title ?? '';
        const segs = Array.isArray(sg?.segments) ? sg.segments : [];
        if (segs.length) {
          segs.forEach((seg: any) => {
            const l3 = seg?.title ?? '';
            const cnt = Math.max(0, Number(seg?.count ?? 0));
            for (let i = 0; i < cnt && p < metrics.length; i += 1, p += 1) {
              slots.push({ level1: l1, level2: l2, level3: l3, metric: metrics[p] });
            }
          });
        } else if (sg?.count !== undefined) {
          const cnt = Math.max(0, Number(sg.count));
          for (let i = 0; i < cnt && p < metrics.length; i += 1, p += 1) {
            slots.push({ level1: l1, level2: l2, level3: '', metric: metrics[p] });
          }
        }
      });
    });

    // Add remaining metrics as standalone
    while (p < metrics.length) {
      const m = metrics[p];
      slots.push({ level1: m, level2: '', level3: '', metric: m });
      p += 1;
    }

    return slots;
  };

  const tree = parseHeaderTree(formData?.metricHeaderTreeJson || '');
  const metrics = (formData?.metrics || []).map((m: any) => 
    typeof m === 'string' ? m : (m.label || 'Unknown')
  );
  const slots = generateSlots(tree, metrics);
  const showSegments = !tree?.hideSegments && tree?.showSegments !== false;

  const currentSwaps = (() => {
    try {
      return JSON.parse(value || '[]');
    } catch {
      return [];
    }
  })();

  const handleSwapsChange = (newSwaps: [number, number][]) => {
    onChange(JSON.stringify(newSwaps));
  };

  if (slots.length === 0) {
    return (
      <div style={{ padding: '10px', backgroundColor: '#f9f9f9', borderRadius: '4px' }}>
        <p style={{ margin: 0, fontSize: '14px', color: '#666' }}>
          No header tree or metrics configured. Please set up "Header (2 levels) JSON" and metrics first.
        </p>
      </div>
    );
  }

  return (
    <ColumnReorderControl
      slots={slots}
      showSegments={showSegments}
      currentSwaps={currentSwaps}
      onChange={handleSwapsChange}
    />
  );
}