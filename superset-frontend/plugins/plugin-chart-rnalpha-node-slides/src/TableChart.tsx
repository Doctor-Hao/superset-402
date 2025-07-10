import React, { useEffect, useState } from 'react';
import { DataRecord } from '@superset-ui/core';
import { TableChartTransformedProps } from './types';
import { Styles } from './styles';
import { ControlButtons } from './components/ControlButtons';
import AutoResizeTextArea from './components/AutoResizeTextArea';
import { useProjectVariantIds } from './hooks/useProjectVariantIds';

export default function TableChart<D extends DataRecord = DataRecord>(
  props: TableChartTransformedProps<D>,
) {
  const { height, width, formData, data: chartData } = props;

  const CASE_NAME_FILTER_KEY = formData.variant_filter_name;
  const CASE_NAME_VARIANT = formData.variant_name;
  const CASE_NAME_ID = formData.variant_id;
  const slideNumber = formData.slide_number || 'slide_28';

  const { projId, variantId } = useProjectVariantIds(formData, chartData);
  console.log("projId", projId, "varId", variantId);

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
        setIsEmpty(true); // только при 404
        return;
      }
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);

      const json = await res.json();
      if (!json || typeof json.data !== 'string' || json.data === 'null' || json.data.trim() === '') {
        setData({ commentary: '' }); // пустое значение, но редактируемое
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
        slide_number: slideNumber ?? '',
        commentary: data.commentary ?? '',
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
