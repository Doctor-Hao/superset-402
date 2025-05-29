import React, { createRef, useEffect, useState } from 'react';
import { DataRecord } from '@superset-ui/core';
import { TableChartTransformedProps } from './types';
import { AddDescriptionButton, Styles, VariantCell } from './styles';
import { ControlButtons } from './components/ControlButtons';
import AutoResizeTextArea from './components/AutoResizeTextArea';

interface ProjectVariant {
  var_id: number;
  var_name: string;
  descriptions: {
    id: number;
    comm_descrp: string;
  }[];
}

// Моковые данные
const mockData = [
  { PROJ_ID: '12345', project_name: 'Project Alpha' },
  { PROJ_ID: '67890', project_name: 'Project Beta' },
];

const mockApiResponse: ProjectVariant[] = [
  {
    var_id: 21,
    var_name: "Вариант 1",
    descriptions: [
      { id: 1, comm_descrp: "sцвцв фцвфвц string" },
      { id: 2, comm_descrp: "string133333333 string133333333 string133333333 string133333333 string133333333 string133333333 string133333333 string133333333 string133333333 string133333333" },
      { id: 5, comm_descrp: "string13333331233" },
    ],
  },
  {
    var_id: 22,
    var_name: "Вариант Альтернативный 1",
    descriptions: [
      { id: 3, comm_descrp: "string2" },
      { id: 4, comm_descrp: "string2" },
    ],
  },
  {
    var_id: 23,
    var_name: "Вариант Базовый 1",
    descriptions: [
      { id: 3, comm_descrp: "string2" },
      { id: 4, comm_descrp: "string2 string2 string2 string2" },
      { id: 6, comm_descrp: "string2" },
      { id: 7, comm_descrp: "string2" },
    ],
  },
  {
    var_id: 24,
    var_name: "Вариант Базовый 2",
    descriptions: [
      { id: 10, comm_descrp: "string2" },
      { id: 11, comm_descrp: "string2 string2 string2 string2" },
      { id: 12, comm_descrp: "string2" },
      { id: 13, comm_descrp: "string2" },
    ],
  },
];

export default function TableChart<D extends DataRecord = DataRecord>(
  props: TableChartTransformedProps<D> & {
    sticky?: any;
  },
) {
  const { height, width, data: initialData, formData } = props;
  const [isLoading, setIsLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaveLoading, setIsSaveLoading] = useState(false);
  const [editedData, setEditedData] = useState<ProjectVariant[]>([]);
  const [projId, setProjId] = useState<string | null>(null);

  const rootElem = createRef<HTMLDivElement>();
  const url = formData.endpoint;

  const handleLoadExternalMock = async (projId: string) => {
    setIsLoading(true);

    // Симуляция задержки сети 1.5 сек.
    await new Promise((resolve) => setTimeout(resolve, 1500));

    // Используем моковые данные вместо реального запроса
    setEditedData(mockApiResponse);
    console.log("✅ Данные успешно загружены (мок)");

    setIsLoading(false);
  };

  useEffect(() => {
    // mockDATA
    if (mockData.length > 0) {
      const firstProjId = mockData[0].PROJ_ID; // Берем первый PROJ_ID
      setProjId(firstProjId);
    }

  }, [initialData]); // Вызываем только при изменении initialData

  // 1️⃣ Обновляем `projId`, когда изменяется `initialData`
  useEffect(() => {
    if (initialData.length > 0) {
      const firstProjId = initialData[0]?.PROJ_ID;
      if (typeof firstProjId && firstProjId !== projId) {
        setProjId(firstProjId);
      }
    }
  }, [initialData]);

  // 2️⃣ Загружаем данные после обновления `projId`
  useEffect(() => {
    if (projId) {
      // mockDATA
      handleLoadExternalMock(projId)

      // handleLoadExternal(projId);
    }
  }, [projId]);


  // ========== GET-логика ==========
  const handleLoadExternal = async (projId: string) => {
    setIsLoading(true);

    const urlGet = `${process.env.BACKEND_URL}${url}/${projId}`;
    console.log(`🔗 GET запрос: ${url}`);

    // Пример retry в 5 попыток
    const maxAttempts = 5;
    let attempts = 0;

    while (attempts < maxAttempts) {
      try {
        const response = await fetch(urlGet, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        });
        if (response.ok) {
          const dataFromGet = await response.json();
          setEditedData(dataFromGet.data);
          console.log('✅ Внешние данные получены');
          break; // прерываем цикл при успехе
        } else {
          console.error('Ошибка при GET-запросе, статус:', response.status);
        }
      } catch (error) {
        console.error('Ошибка сети при GET-запросе:', error);
      }
      attempts += 1;
      if (attempts < maxAttempts) {
        console.log(`🔄 Повторная попытка GET-запроса через 2 секунды... (${attempts}/${maxAttempts})`);
        await new Promise(res => setTimeout(res, 2000));
      } else {
        console.error('❌ GET-запрос завершился неудачно после 5 попыток');
      }
    }

    setIsLoading(false);
  };

  const handleSave = async () => {
    if (!projId) return;
    setIsSaveLoading(true);

    const body = {
      proj_id: projId,
      data: editedData,
    };
    console.log("handleSave", body)

    try {
      const response = await fetch(`${process.env.BACKEND_URL}${url}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (response.ok) {
        console.log('✅ Сохранено');
      } else {
        console.error('❌ Ошибка при сохранении');
      }
    } catch (e) {
      alert(`❌ Ошибка сети: ${e}`)
      console.error('❌ Ошибка сети', e);
    }

    setIsSaveLoading(false);
  };

  const handleChange = (id: number, field: keyof ProjectVariant, value: any) => {
    setEditedData(prev =>
      prev.map(row => (row.id === id ? { ...row, [field]: value } : row)),
    );
  };


  const handleDelete = (id: number) => {
    setEditedData(prev => prev.filter(row => row.id !== id));
  };

  return (
    <Styles ref={rootElem} height={height} width={width}>
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
              <>
                <ControlButtons
                  isSaving={isSaveLoading}
                  onSave={handleSave}
                  // onAddRow={handleAdd}
                  addRowLabel="Добавить строку"
                />
              </>
            )}
          </div>

          <table style={{ width: '100%', border: '1px solid #ccc' }}>
            <thead>
              <tr>
                {editedData.map(variant => (
                  <th
                    key={variant.var_id}
                    className='grey-line'
                  >
                    <span className='grey-line-left'></span>
                    {variant.var_name}
                    <span className='grey-line-right'></span>
                    <span className='yellow-line-bottom'></span>
                    <span className='yellow-line-left'></span>
                    <span className='yellow-line-right'></span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {/* Максимум описаний в вариантах — определим для строк */}
              {Array.from({ length: Math.max(...editedData.map(v => v.descriptions.length)) }).map((_, rowIndex) => (
                <tr key={rowIndex}>
                  {editedData.map((variant, colIndex) => {
                    const description = variant.descriptions[rowIndex];
                    return (
                      <td className='vertical-line' key={colIndex}>
                        {description ? (
                          <div style={{ position: 'relative', paddingRight: '10px', paddingLeft: '10px' }}>
                            <AutoResizeTextArea
                              value={description.comm_descrp}
                              onChange={e => {
                                const newVariants = [...editedData];
                                newVariants[colIndex].descriptions[rowIndex].comm_descrp = e.target.value;
                                setEditedData(newVariants);
                              }}
                            />
                            {isEditing && (
                              <button
                                className="icon-button delete"
                                style={{
                                  position: 'absolute',
                                  top: '4px',
                                  right: '4px',
                                  background: 'transparent',
                                  color: '#f44336',
                                  border: 'none',
                                  fontSize: '14px',
                                  cursor: 'pointer',
                                }}
                                onClick={() => {
                                  const newVariants = [...editedData];
                                  newVariants[colIndex].descriptions = newVariants[colIndex].descriptions.filter(
                                    d => d.id !== description.id,
                                  );
                                  setEditedData(newVariants);
                                }}
                              >
                                ❌
                              </button>
                            )}
                          </div>
                        ) : null}
                      </td>
                    );
                  })}
                </tr>
              ))}
              {isEditing && (
                <tr>
                  {editedData.map((_, colIndex) => (
                    <td key={colIndex}>
                      <button
                        onClick={() => {
                          const newVariants = [...editedData];
                          newVariants[colIndex].descriptions.push({
                            id: Date.now(),
                            comm_descrp: '',
                          });
                          setEditedData(newVariants);
                        }}
                      >
                        ➕ Добавить описание
                      </button>
                    </td>
                  ))}
                </tr>
              )}
            </tbody>
          </table>

        </>
      )}
    </Styles>
  );
}
