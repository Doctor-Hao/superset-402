import React, { createRef, useEffect, useState } from 'react';
import { DataRecord } from '@superset-ui/core';
import { TableChartTransformedProps } from './types';
import { AddDescriptionButton, Styles, VariantCell } from './styles';
import { ControlButtons } from './components/ControlButtons';
import AutoResizeTextArea from './components/AutoResizeTextArea';

interface ProjectVariant {
  var_id: number;
  var_name: string;
  is_recomended: string | null;
  descriptions: {
    id: number;
    comm_descrp: string;
    __isNew?: boolean;
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
    is_recomended: 'Y',
    descriptions: [
      { id: 1, comm_descrp: "sцвцв фцвфвц string" },
      { id: 2, comm_descrp: "string133333333 string133333333 string133333333 string133333333 string133333333 string133333333 string133333333 string133333333 string133333333 string133333333" },
      { id: 5, comm_descrp: "string13333331233" },
    ],
  },
  {
    var_id: 22,
    var_name: "Вариант Альтернативный 1",
    is_recomended: 'N',
    descriptions: [
      { id: 3, comm_descrp: "string2" },
      { id: 4, comm_descrp: "string2" },
    ],
  },
  {
    var_id: 23,
    var_name: "Вариант Базовый 1 (Копия Базовый)",
    is_recomended: null,
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
    is_recomended: 'N',
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
  const [selectedVariants, setSelectedVariants] = useState<string[] | undefined>(undefined);
  const [idsToDelete, setIdsToDelete] = useState<number[]>([]);

  const rootElem = createRef<HTMLDivElement>();
  const url = formData.endpoint;

  useEffect(() => {
    if (initialData.length > 0) {
      const allNames = initialData.map(row => row.VAR_NAME).filter(Boolean);
      setSelectedVariants(allNames);
    }
  }, [initialData]);


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
    // if (mockData.length > 0) {
    //   const firstProjId = mockData[0].PROJ_ID; // Берем первый PROJ_ID
    //   setProjId(firstProjId);
    // }

  }, [initialData]); // Вызываем только при изменении initialData

  // 1️⃣ Обновляем `projId`, когда изменяется `initialData`
  useEffect(() => {
    if (initialData.length > 0) {
      const firstProjId = initialData[0]?.PROJ_ID;
      if (firstProjId && firstProjId !== projId) {
        setProjId(firstProjId);
      }
    }
  }, [initialData]);

  // 2️⃣ Загружаем данные после обновления `projId`
  useEffect(() => {
    if (projId) {
      // mockDATA
      // handleLoadExternalMock(projId)

      handleLoadExternal(projId);
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
          const sorted: ProjectVariant[] = dataFromGet.data.map((variant: ProjectVariant) => ({
            ...variant,
            descriptions: [...variant.descriptions].sort((a, b) => a.id - b.id),
          }));
          setEditedData(sorted);
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

    // 0. DELETE — если есть idsToDelete
    if (idsToDelete.length > 0) {
      try {
        for (const id of idsToDelete) {
          const delRes = await fetch(`${process.env.BACKEND_URL}${url}/del_comm/${id}`, {
            method: 'DELETE',
          });

          if (!delRes.ok) {
            console.error(`❌ Ошибка удаления комментария id=${id}`);
          } else {
            console.log(`🗑 Удалён комментарий id=${id}`);
          }
        }
      } catch (err) {
        console.error('❌ Ошибка удаления:', err);
        alert('Ошибка при удалении записей');
      }
    }


    const postPayload = editedData
      .map(variant => {
        const newDescs = variant.descriptions.filter(d => d.__isNew);
        if (newDescs.length === 0) return null;
        return {
          var_id: variant.var_id,
          var_name: variant.var_name,
          description: newDescs.map(({ comm_descrp }) => ({ comm_descrp })),
        };
      })
      .filter(Boolean); // убираем null
    console.log("POST", postPayload)

    // 1. POST для новых описаний
    if (postPayload.length > 0) {
      try {
        const resPost = await fetch(`${process.env.BACKEND_URL}${url}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ proj_id: projId, data: postPayload }),
        });

        if (!resPost.ok) throw new Error('POST failed');
        console.log('✅ Новые ячейки успешно отправлены (POST)');
      } catch (err) {
        console.error('❌ Ошибка POST:', err);
        alert('Ошибка при добавлении новых записей');
      }
    }

    // ======= PATCH =======
    const patchPayload = editedData
      .map(variant => {
        const existingDescs = variant.descriptions.filter(d => !d.__isNew);
        if (existingDescs.length === 0) return null;
        return {
          var_id: variant.var_id,
          var_name: variant.var_name,
          description: existingDescs.map(({ id, comm_descrp }) => ({ id, comm_descrp })),
        };
      })
      .filter(Boolean);
    console.log("PATCH", patchPayload)

    for (const patchItem of patchPayload) {
      try {
        const resPatch = await fetch(`${process.env.BACKEND_URL}${url}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(patchItem),
        });

        if (!resPatch.ok) throw new Error('PATCH failed');
        console.log('✅ PATCH отправлен:', patchItem);
      } catch (err) {
        console.error('❌ PATCH error:', err);
        alert('Ошибка при обновлении записей');
      }
    }

    // ========== Очистка всех __isNew в состоянии ==========
    const cleaned = editedData.map(variant => ({
      ...variant,
      descriptions: variant.descriptions.map(({ id, comm_descrp }) => ({
        id,
        comm_descrp,
      })),
    }));
    setEditedData(cleaned);
    setIdsToDelete([]);

    setIsSaveLoading(false);
    setIsEditing(false);
  };

  const handleChange = (id: number, field: keyof ProjectVariant, value: any) => {
    setEditedData(prev =>
      prev.map(row => (row.id === id ? { ...row, [field]: value } : row)),
    );
  };


  const handleDelete = (id: number) => {
    setEditedData(prev => prev.filter(row => row.id !== id));
  };


  const filteredVariants = !selectedVariants || selectedVariants.length === 0
    ? editedData
    : editedData.filter(v => selectedVariants.includes(v.var_name));

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

          <table style={{ width: '100%', border: '1px solid #ccc', marginTop: '10px' }}>
            <thead>
              <tr>
                {filteredVariants.map(variant => (
                  <th
                    key={variant.var_id}
                    className={`grey-line ${variant.is_recomended === 'Y' ? 'recommended-column' : ''}`}
                  >
                    <span className='grey-line-left'></span>
                    <p>
                      {variant.var_name}
                      <br />
                      {variant.is_recomended === 'Y' && (
                        <span> (Рекомендуемый)</span>
                      )}
                    </p>
                    <span className='grey-line-right'></span>
                    <span className='yellow-line-bottom'></span>
                    <span className='yellow-line-left'></span>
                    <span className='yellow-line-right'></span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isEditing && (
                <tr>
                  {filteredVariants.map((_, colIndex) => (
                    <td key={colIndex}>
                      <button
                        onClick={() => {
                          const targetId = filteredVariants[colIndex].var_id;
                          const updated = editedData.map(variant => {
                            if (variant.var_id !== targetId) return variant;
                            return {
                              ...variant,
                              descriptions: [
                                ...variant.descriptions,
                                { id: Date.now(), comm_descrp: '', __isNew: true },
                              ],
                            };
                          });
                          setEditedData(updated);
                        }}
                      >
                        ➕ Добавить описание
                      </button>
                    </td>
                  ))}
                </tr>
              )}
              {/* Максимум описаний в вариантах — определим для строк */}
              {Array.from({ length: Math.max(...filteredVariants.map(v => v.descriptions.length)) }).map((_, rowIndex) => (
                <tr key={rowIndex}>
                  {filteredVariants.map((variant, colIndex) => {
                    const description = variant.descriptions[rowIndex];
                    return (
                      <td
                        className={`vertical-line ${variant.is_recomended === 'Y' ? 'recommended-column' : ''}`}
                        key={colIndex}
                      >
                        {description ? (
                          <div style={{ position: 'relative', paddingRight: '10px', paddingLeft: '10px' }}>
                            <AutoResizeTextArea
                              value={description.comm_descrp}
                              onChange={e => {
                                const targetId = filteredVariants[colIndex].var_id;
                                const updated = editedData.map(variant => {
                                  if (variant.var_id !== targetId) return variant;
                                  const newDescriptions = [...variant.descriptions];
                                  newDescriptions[rowIndex].comm_descrp = e.target.value;
                                  return { ...variant, descriptions: newDescriptions };
                                });
                                setEditedData(updated);
                              }}
                              disabled={!isEditing}
                            />
                            {isEditing && (
                              <button
                                className="icon-button delete"
                                style={{
                                  position: 'absolute',
                                  top: '0px',
                                  right: '10px',
                                  background: 'transparent',
                                  color: '#f44336',
                                  border: 'none',
                                  fontSize: '14px',
                                  cursor: 'pointer',
                                }}
                                onClick={() => {
                                  const targetId = filteredVariants[colIndex].var_id;
                                  const descId = description.id;

                                  const updated = editedData.map(variant => {
                                    if (variant.var_id !== targetId) return variant;
                                    return {
                                      ...variant,
                                      descriptions: variant.descriptions.filter(d => d.id !== descId),
                                    };
                                  });

                                  setEditedData(updated);

                                  // Запоминаем id для удаления (если не isNew)
                                  if (!description.__isNew && typeof descId === 'number') {
                                    setIdsToDelete(prev => [...prev, descId]);
                                  }
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
            </tbody>
          </table>
          <div className='description-footer'>
            Рекомендуемый вариант
          </div>
        </>
      )}
    </Styles>
  );
}
