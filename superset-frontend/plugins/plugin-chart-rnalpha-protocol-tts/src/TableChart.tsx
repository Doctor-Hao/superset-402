import React, { createRef, useEffect, useState } from 'react';
import { DataRecord } from '@superset-ui/core';
import { TableChartTransformedProps } from './types';
import { Styles } from './styles';
import { ControlButtons } from './components/ControlButtons';
import AutoResizeTextArea from './components/AutoResizeTextArea';

// Новый тип данных
interface Paragraph {
  id: number;
  decision_desc: string;
  deadline: string;
  responsible_empl: string;
  decision_status: string;
  comment_protocol: string;
  isNew?: boolean;
}
interface ProtocolRow {
  id: number;
  description: string;
  paragraphs: Paragraph[];
  isNew?: boolean;
}
interface ProtocolData {
  proj_id: number;
  data: ProtocolRow[];
}

// Моковые данные
const mockData: ProtocolData = {
  proj_id: 123,
  data: [
    {
      id: 1,
      description: 'Протокол 1',
      paragraphs: [
        {
          id: 101,
          decision_desc: 'Решение 1',
          deadline: '2024-07-01',
          responsible_empl: 'Иванов',
          decision_status: 'Выполнено',
          comment_protocol: 'Комментарий 1',
        },
      ],
    },
    {
      id: 2,
      description: 'Протокол 2',
      paragraphs: [
        {
          id: 222,
          decision_desc: 'Решение 2',
          deadline: '2024-07-01',
          responsible_empl: 'Иванов',
          decision_status: 'Выполнено',
          comment_protocol: 'Комментарий 1',
        },
      ],
    }
  ],
};

export default function TableChart<D extends DataRecord = DataRecord>(
  props: TableChartTransformedProps<D> & { sticky?: any },
) {
  const { height, width, data: initialData, formData } = props;
  const [isLoading, setIsLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaveLoading, setIsSaveLoading] = useState(false);
  const [editedData, setEditedData] = useState<ProtocolRow[]>([]);
  const [projId, setProjId] = useState<number | null>(null);

  const [deletedIds, setDeletedIds] = useState<number[]>([]);
  const [showPastePopup, setShowPastePopup] = useState(false);
  const [clipboardInput, setClipboardInput] = useState('');

  const rootElem = createRef<HTMLDivElement>();
  const url = formData.endpoint;

  // Загрузка данных
  const handleLoadExternal = async (projId: number) => {
    setIsLoading(true);
    const urlGet = `${process.env.BACKEND_URL}${url}/${projId}`;
    const maxAttempts = 5;
    let attempts = 0;
    while (attempts < maxAttempts) {
      try {
        const response = await fetch(urlGet, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        });
        if (response.ok) {
          const dataFromGet: ProtocolData = await response.json();
          setEditedData(dataFromGet.data);
          break;
        }
      } catch (error) {
        console.error('Ошибка загрузки данных:', error);
      }
      attempts += 1;
      if (attempts < maxAttempts) await new Promise(res => setTimeout(res, 2000));
    }
    setIsLoading(false);
  };

  // Сохранение данных
  const handleSave = async () => {
    if (projId === null) return;
    setIsSaveLoading(true);
    try {
      // DELETE
      if (deletedIds.length) {
        for (const id of deletedIds) {
          try {
            await fetch(`${process.env.BACKEND_URL}${url}/${id}`, { method: 'DELETE' });
          } catch (err) {
            console.error('Ошибка удаления протокола:', id, err);
          }
        }
      }
      setDeletedIds([]);

      // POST новые строки
      const newRows = editedData.filter(r => r.isNew);
      if (newRows.length) {
        try {
          await fetch(`${process.env.BACKEND_URL}${url}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              proj_id: projId,
              data: newRows.map(({ isNew, ...row }) => row),
            }),
          });
          setEditedData(prev =>
            prev.map(row =>
              row.isNew ? { ...row, isNew: false } : row
            )
          );
        } catch (err) {
          console.error('Ошибка создания протокола (POST):', err);
        }
      }

      // PATCH — отправляем каждый протокол отдельно
      const updatedRows = editedData.map(row => ({
        ...row,
        paragraphs: row.paragraphs.filter(p => !p.isNew),
      }));
      console.log("PATCH", updatedRows)
      for (const row of updatedRows) {
        const patchBody = {
          id: row.id,
          proj_id: projId,
          description: row.description,
          paragraphs: row.paragraphs,
        };
        try {
          await fetch(`${process.env.BACKEND_URL}${url}/${row.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(patchBody),
          });
        } catch (err) {
          console.error('Ошибка обновления протокола (PATCH):', patchBody, err);
        }
      }
    } catch (err) {
      console.error('Ошибка при сохранении:', err);
    } finally {
    }

    setIsEditing(false);
    setIsSaveLoading(false);
  };

  // Обработка изменения полей
  const handleChange = (rowId: number, field: keyof ProtocolRow, value: any) => {
    setEditedData(prev =>
      prev.map(row => (row.id === rowId ? { ...row, [field]: value } : row)),
    );
  };

  // Удалить параграф
  const handleDeleteParagraph = (rowId: number, paragraphId: number) => {
    console.log('Удаление параграфа:', { rowId, paragraphId });
    setEditedData(prev =>
      prev.map(row =>
        row.id === rowId
          ? {
            ...row,
            paragraphs: row.paragraphs.filter(p => p.id !== paragraphId),
          }
          : row,
      ),
    );
  };

  // Изменение параграфа
  const handleParagraphChange = (
    rowId: number,
    paragraphId: number,
    field: keyof Paragraph,
    value: any,
  ) => {
    setEditedData(prev =>
      prev.map(row =>
        row.id === rowId
          ? {
            ...row,
            paragraphs: row.paragraphs.map(p =>
              p.id === paragraphId ? { ...p, [field]: value } : p,
            ),
          }
          : row,
      ),
    );
  };

  // Вставка из Excel
  const handlePaste = () => {
    setShowPastePopup(true);
    setClipboardInput('');
  };

  const handlePasteApply = () => {
    const rows = clipboardInput
      .split('\n')
      .map(line => line.trim())
      .filter(Boolean);

    const newParagraphs: Paragraph[] = rows.map((line, idx) => {
      const arr = line.split('\t');
      return {
        id: Date.now() + idx,
        decision_desc: arr[0] || '-',
        deadline: arr[1] || '-',
        responsible_empl: arr[2] || '-',
        decision_status: arr[3] || '-',
        comment_protocol: arr[4] || '-',
        isNew: true,
      };
    });

    if (editedData.length === 1) {
      console.log('Вставка из Excel, новые параграфы:', newParagraphs);
      setEditedData(prev =>
        prev.map(row => ({
          ...row,
          paragraphs: [...row.paragraphs, ...newParagraphs],
        })),
      );
    }

    setShowPastePopup(false);
    setClipboardInput('');
  };

  // useEffect для загрузки данных
  useEffect(() => {
    if (initialData.length > 0 && typeof initialData[0]?.proj_id === 'number') {
      setProjId(initialData[0].proj_id);
      setEditedData(
        Array.isArray(initialData[0].data)
          ? initialData[0].data
          : mockData.data,
      );
    } else {
      setProjId(mockData.proj_id);
      setEditedData(mockData.data);
    }
  }, [initialData]);

  useEffect(() => {
    if (projId !== null) {
      // handleLoadExternal(projId); // Раскомментируйте если нужно подгружать с сервера
    }
  }, [projId]);

  return (
    <Styles ref={rootElem} height={height} width={width}>
      {isLoading ? (
        <p>Загрузка...</p>
      ) : (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex' }}>
              <button
                style={{ marginBottom: 10 }}
                onClick={() => setIsEditing(!isEditing)}
                className="icon-button edit"
              >
                ✏️ {isEditing ? 'Выход из редактирования' : 'Редактировать'}
              </button>
            </div>
            <div>
              {isEditing && (
                <ControlButtons
                  isSaving={isSaveLoading}
                  onSave={handleSave}
                />
              )}
            </div>
          </div>
          {showPastePopup && (
            <div style={{
              position: 'fixed',
              left: 0, top: 0, width: '100vw', height: '100vh',
              background: 'rgba(0,0,0,0.2)', zIndex: 1000,
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <div style={{ background: '#fff', padding: 20, borderRadius: 8, minWidth: 400 }}>
                <h4>Вставьте данные из Excel</h4>
                <textarea
                  style={{ width: '100%', minHeight: 120 }}
                  value={clipboardInput}
                  onChange={e => setClipboardInput(e.target.value)}
                  placeholder={'Описание\tРешение 1||2024-07-01||Иванов||Выполнено||Комментарий 1'}
                />
                <div style={{ marginTop: 10, textAlign: 'right' }}>
                  <button onClick={() => setShowPastePopup(false)} style={{ marginRight: 10 }}>Отмена</button>
                  <button onClick={handlePasteApply}>Добавить</button>
                </div>
              </div>
            </div>
          )}
          {editedData.map(row => (
            <div key={row.id} style={{ marginBottom: 30 }}>
              {isEditing && (
                <div style={{ margin: '15px 0 10px 0', display: 'flex', gap: 8 }}>
                  <button
                    className="icon-button edit"
                    onClick={() => {
                      const newParagraphId = Date.now();
                      setEditedData(prev =>
                        prev.map(r =>
                          r.id === row.id
                            ? {
                              ...r,
                              paragraphs: [
                                ...r.paragraphs,
                                {
                                  isNew: true,
                                  id: newParagraphId,
                                  decision_desc: '-',
                                  deadline: '-',
                                  responsible_empl: '-',
                                  decision_status: '-',
                                  comment_protocol: '-',
                                },
                              ],
                            }
                            : r,
                        ),
                      );
                    }}
                  >
                    ➕ Добавить строку
                  </button>
                  <button
                    className="icon-button edit"
                    onClick={() => setShowPastePopup(row.id)}
                  >
                    📋 Вставить из Excel
                  </button>
                  {/* Popup для вставки из Excel только для этой таблицы */}
                  {showPastePopup === row.id && (
                    <div style={{
                      position: 'fixed',
                      left: 0, top: 0, width: '100vw', height: '100vh',
                      background: 'rgba(0,0,0,0.2)', zIndex: 1000,
                      display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}>
                      <div style={{ background: '#fff', padding: 20, borderRadius: 8, minWidth: 400 }}>
                        <h4>Вставьте данные из Excel</h4>
                        <textarea
                          style={{ width: '100%', minHeight: 120 }}
                          value={clipboardInput}
                          onChange={e => setClipboardInput(e.target.value)}
                          placeholder={'Описание решения\tДедлайн\tОтветственный\tСтатус\tКомментарий'}
                        />
                        <div style={{ marginTop: 10, textAlign: 'right' }}>
                          <button onClick={() => setShowPastePopup(false)} style={{ marginRight: 10 }}>Отмена</button>
                          <button onClick={() => {
                            // Вставка только в paragraphs текущего row
                            const rows = clipboardInput
                              .split('\n')
                              .map(line => line.trim())
                              .filter(Boolean);

                            const newParagraphs: Paragraph[] = rows.map((line, idx) => {
                              const arr = line.split('\t');
                              return {
                                id: Date.now() + idx,
                                decision_desc: arr[0] || '-',
                                deadline: arr[1] || '-',
                                responsible_empl: arr[2] || '-',
                                decision_status: arr[3] || '-',
                                comment_protocol: arr[4] || '-',
                              };
                            });

                            setEditedData(prev =>
                              prev.map(r =>
                                r.id === row.id
                                  ? { ...r, paragraphs: [...r.paragraphs, ...newParagraphs] }
                                  : r,
                              ),
                            );
                            setShowPastePopup(false);
                            setClipboardInput('');
                          }}>Добавить</button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
              <table>
                <thead>
                  <tr>
                    <th colSpan={isEditing ? 5 : 4} style={{ textAlign: 'center', fontSize: 18, }}>
                      {row.description}
                    </th>
                  </tr>
                  <tr>
                    <th>Описание решения</th>
                    <th>Дедлайн</th>
                    <th>Ответственный</th>
                    <th>Статус</th>
                    {isEditing && <th>Удалить</th>}
                  </tr>
                </thead>
                <tbody>
                  {row.paragraphs.map(paragraph => (
                    <tr key={paragraph.id}>
                      <td>
                        <AutoResizeTextArea
                          value={paragraph.decision_desc}
                          onChange={e =>
                            handleParagraphChange(row.id, paragraph.id, 'decision_desc', e.target.value)
                          }
                          disabled={!isEditing}
                        />
                      </td>
                      <td>
                        <AutoResizeTextArea
                          value={paragraph.deadline}
                          onChange={e =>
                            handleParagraphChange(row.id, paragraph.id, 'deadline', e.target.value)
                          }
                          disabled={!isEditing}
                        />
                      </td>
                      <td>
                        <AutoResizeTextArea
                          value={paragraph.responsible_empl}
                          onChange={e =>
                            handleParagraphChange(row.id, paragraph.id, 'responsible_empl', e.target.value)
                          }
                          disabled={!isEditing}
                        />
                      </td>
                      <td>
                        <AutoResizeTextArea
                          value={paragraph.decision_status}
                          onChange={e =>
                            handleParagraphChange(row.id, paragraph.id, 'decision_status', e.target.value)
                          }
                          disabled={!isEditing}
                        />
                      </td>
                      {isEditing && (
                        <td>
                          <button
                            className="icon-button delete"
                            onClick={() => handleDeleteParagraph(row.id, paragraph.id)}
                            title="Удалить параграф"
                          >
                            ❌
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>

            </div>
          ))}
        </>
      )}
    </Styles>
  );
}