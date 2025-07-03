import React, { createRef, useEffect, useState } from 'react';
import { DataRecord } from '@superset-ui/core';
import { TableChartTransformedProps } from './types';
import { Styles } from './styles';
import { ControlButtons } from './components/ControlButtons';
import AutoResizeTextArea from './components/AutoResizeTextArea';

interface FactorRow {
  id: number;
  value_translate: string;
  description: string;
  commentary: string;
}

export default function TableChart<D extends DataRecord = DataRecord>(
  props: TableChartTransformedProps<D>,
) {
  const { height, width, formData, data: chartData } = props;
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [data, setData] = useState<Record<string, FactorRow>>({});
  const [hasError, setHasError] = useState(false);
  const [isEmpty, setIsEmpty] = useState(false);

  const CASE_NAME_FILTER_KEY = formData.variant_filter_name;
  const CASE_NAME_VARIANT = formData.variant_name;
  const CASE_NAME_ID = formData.variant_id;

  const endpoint = formData.endpoint;

  const [leftVarId, rightVarId] = React.useMemo(() => {
    let variants: string[] = [];

    // 1. из adhoc_filters
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


    // 2. из native_filters
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

    // 3. из extra_form_data.filters
    if (variants.length === 0 && formData.extra_form_data?.filters) {
      formData.extra_form_data.filters.forEach((flt: any) => {
        const col = flt.col || flt.subject || flt.field || '';
        if (col === CASE_NAME_FILTER_KEY && Array.isArray(flt.val)) {
          variants = flt.val.map(String);
        }
      });
    }


    console.log('variants', variants);
    if (variants.length < 2) return [null, null];


    const ids = variants.slice(0, 2).map(name => {
      const match = chartData.find(d => d[CASE_NAME_VARIANT] === name);
      return match ? match[CASE_NAME_ID as keyof typeof match] ?? null : null;
    });
    console.log('ids', ids);

    return ids;
  }, [formData, chartData]);



  useEffect(() => {
    if (endpoint && leftVarId && rightVarId) fetchData();
  }, [endpoint, leftVarId, rightVarId]);

  async function fetchData() {
    setIsLoading(true);
    setHasError(false);
    setIsEmpty(false);

    try {
      const res = await fetch(
        `${process.env.BACKEND_URL}${endpoint}/${leftVarId}/${rightVarId}`,
      );

      if (res.status === 404) {
        setIsEmpty(true);
        return;
      }

      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }

      const json = await res.json();
      if (!json || Object.keys(json).length === 0) {
        setIsEmpty(true);
      } else {
        setData(json);
      }
    } catch (err) {
      console.error('GET error:', err);
      setHasError(true);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSave() {
    if (!leftVarId || !rightVarId) return;
    setIsSaving(true);
    try {
      const payload = {
        left_var_id: leftVarId,
        right_var_id: rightVarId,
        data: Object.fromEntries(
          Object.entries(data).map(([key, row]) => [key, {
            description: row.description,
            commentary: row.commentary,
          }])
        ),
      };

      const res = await fetch(`${process.env.BACKEND_URL}${endpoint}`, {
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


  const handleChange = (key: string, field: keyof FactorRow, value: string) => {
    setData(prev => ({
      ...prev,
      [key]: {
        ...prev[key],
        [field]: value,
      },
    }));
  };

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

          <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '10px' }}>
            <thead>
              <tr>
                <th>Значение</th>
                <th>Описание</th>
                <th>Комментарий</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(data).map(([key, row]) => (
                <tr key={key}>
                  <td>
                    <AutoResizeTextArea
                      value={row?.value_translate || ''}
                      disabled={true}
                      onChange={e =>
                        handleChange(key, 'value_translate', e?.target?.value || '')
                      }
                    />
                  </td>
                  <td>
                    <AutoResizeTextArea
                      value={row?.description || ''}
                      disabled={!isEditing}
                      onChange={e =>
                        handleChange(key, 'description', e?.target?.value || '')
                      }
                    />
                  </td>
                  <td>
                    <AutoResizeTextArea
                      value={row?.commentary || ''}
                      disabled={!isEditing}
                      onChange={e =>
                        handleChange(key, 'commentary', e?.target?.value || '')
                      }
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </Styles>
  );

}