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
  console.log('formData', formData);
  const CASE_NAME_FILTER_KEY = formData.variant_filter_name;

  const endpoint = formData.endpoint;

  const [leftVarId, rightVarId] = React.useMemo(() => {
    const selectedNames: string[] =
      formData[CASE_NAME_FILTER_KEY] ||
      formData.adhoc_filters
        ?.find(f => f.subject === CASE_NAME_FILTER_KEY && f.operator === 'IN')
        ?.comparator || [];

    console.log('selectedNames', selectedNames);
    if (selectedNames.length < 2) return [null, null];

    const ids = selectedNames.slice(0, 2).map(name => {
      const match = chartData.find(d => d.name === name);
      return match?.rank ?? null;
    });
    console.log('ids', ids);


    return ids;
  }, [formData, chartData]);


  useEffect(() => {
    if (endpoint && leftVarId && rightVarId) fetchData();
  }, [endpoint, leftVarId, rightVarId]);

  async function fetchData() {
    setIsLoading(true);
    try {
      const res = await fetch(
        `${process.env.BACKEND_URL}${endpoint}/${leftVarId}/${rightVarId}`,
      );
      const json = await res.json();
      setData(json);
    } catch (err) {
      console.error('GET error:', err);
    }
    setIsLoading(false);
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
                      value={row.value_translate}
                      disabled={true}
                      onChange={e => handleChange(key, 'value_translate', e.target.value)}
                    />
                  </td>
                  <td>
                    <AutoResizeTextArea
                      value={row.description}
                      disabled={!isEditing}
                      onChange={e => handleChange(key, 'description', e.target.value)}
                    />
                  </td>
                  <td>
                    <AutoResizeTextArea
                      value={row.commentary}
                      disabled={!isEditing}
                      onChange={e => handleChange(key, 'commentary', e.target.value)}
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