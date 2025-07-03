import React, { useEffect, useState } from 'react';
import { DataRecord } from '@superset-ui/core';
import { TableChartTransformedProps } from './types';
import { Styles } from './styles';
import { ControlButtons } from './components/ControlButtons';
import AutoResizeTextArea from './components/AutoResizeTextArea';

export default function TableChart<D extends DataRecord = DataRecord>(
  props: TableChartTransformedProps<D>,
) {
  const { height, width, formData, data: chartData } = props;

  const CASE_NAME_FILTER_KEY = formData.variant_filter_name;
  const CASE_NAME_VARIANT = formData.variant_name;
  const CASE_NAME_ID = formData.variant_id;
  const slideNumber = formData.slide_number || 'slide_28';

  const [projId] = React.useMemo(() => {
    let variants: string[] = [];
    if (Array.isArray(formData.adhoc_filters)) {
      formData.adhoc_filters.forEach(flt => {
        const colName = flt.col || flt.subject;
        if (colName === CASE_NAME_FILTER_KEY) {
          if (Array.isArray(flt.val)) {
            variants = flt.val.map(String);
          } else if (Array.isArray(flt.comparator)) {
            variants = flt.comparator.map(String);
          }
        }
      });
    }
    if (variants.length === 0 && formData.native_filters) {
      Object.values<any>(formData.native_filters).forEach(nf => {
        const col = typeof nf.target === 'string' ? nf.target : nf.target?.column || '';
        const valArr: any[] = Array.isArray(nf.value)
          ? nf.value
          : Array.isArray(nf.currentValue)
            ? nf.currentValue
            : [];
        if (col === CASE_NAME_FILTER_KEY && valArr.length) {
          variants = valArr.map(String);
        }
      });
    }
    if (variants.length === 0 && formData.extra_form_data?.filters) {
      formData.extra_form_data.filters.forEach((flt: any) => {
        const col = flt.col || flt.subject || flt.field || '';
        if (col === CASE_NAME_FILTER_KEY && Array.isArray(flt.val)) {
          variants = flt.val.map(String);
        }
      });
    }

    if (variants.length === 0) return [null];
    const name = variants[0];
    const match = chartData.find(d => d[CASE_NAME_VARIANT] === name);
    return [match ? match[CASE_NAME_ID as keyof typeof match] ?? null : null];
  }, [formData, chartData]);

  const [data, setData] = useState<{ commentary: string }>({ commentary: '' });
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [isEmpty, setIsEmpty] = useState(false);

  useEffect(() => {
    if (projId && slideNumber) fetchData();
  }, [projId, slideNumber]);

  async function fetchData() {
    setIsLoading(true);
    setHasError(false);
    setIsEmpty(false);
    try {
      const res = await fetch(`${process.env.BACKEND_URL}/project/node/slide/${projId}/${slideNumber}`);
      if (res.status === 404) {
        setIsEmpty(true);
        return;
      }
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
      const json = await res.json();
      if (!json || typeof json.data !== 'string') {
        setIsEmpty(true);
      } else {
        setData({ commentary: json.data });
      }
    } catch (err) {
      console.error('GET error:', err);
      setHasError(true);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSave() {
    if (!projId) return;
    setIsSaving(true);
    try {
      const payload = {
        proj_id: projId,
        slide_number: slideNumber,
        commentary: data.commentary,
      };
      const res = await fetch(`${process.env.BACKEND_URL}/project/node/slide`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error('PATCH error');
    } catch (err) {
      console.error(err);
      alert('Ошибка при сохранении');
    }
    setIsSaving(false);
    setIsEditing(false);
  }

  return (
    <Styles height={height} width={width}>
      {isLoading ? (
        <p>Загрузка...</p>
      ) : hasError ? (
        <p style={{ color: 'red' }}>Произошла ошибка при загрузке данных.</p>
      ) : isEmpty ? (
        <p>Нет данных для отображения.</p>
      ) : (
        <>
          <div>
            <button
              style={{ marginRight: 10 }}
              onClick={() => setIsEditing(!isEditing)}
              className="icon-button edit"
            >
              ✏️ {isEditing ? 'Выход из редактирования' : 'Редактировать'}
            </button>
            {isEditing && (
              <ControlButtons
                isSaving={isSaving}
                onSave={handleSave}
                addRowLabel="Сохранить"
              />
            )}
          </div>
          <div style={{ marginTop: 12 }}>
            <AutoResizeTextArea
              value={data.commentary}
              disabled={!isEditing}
              onChange={e => setData({ commentary: e.target.value })}
            />
          </div>
        </>
      )}
    </Styles>
  );
}
