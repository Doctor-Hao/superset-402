import React, { createRef, useEffect, useState } from 'react';
import { DataRecord } from '@superset-ui/core';
import { TableChartTransformedProps } from './types';
import { Styles } from './styles';
import { ControlButtons } from './components/ControlButtons';
import AutoResizeTextArea from './components/AutoResizeTextArea';

interface grrOption {
  id: number;
  isNew?: boolean,
  opt_name: string;
  oilfield_name: string;
  la_name: string;
  base_B1C1: number;
  base_extra_reserves: number;
  base_accum_prod: number;
  base_VNS_count: number;
  max_B1C1: number;
  max_extra_reserves: number;
  max_accum_prod: number;
  max_VNS_count: number;
  prb_srr: string;
  grr_results: string;
  dependent_mining: string;
  dependent_drilling: string;
  commentary: string;
}

// Моковые данные
const mockData = [
  { PROJ_ID: '12345', project_name: 'Project Alpha' },
  { PROJ_ID: '67890', project_name: 'Project Beta' },
];

const mockApiResponse: grrOption[] = [
  {
    id: 3,
    opt_name: 'string2',
    oilfield_name: 'string2',
    la_name: 'string2',
    base_B1C1: 0,
    base_extra_reserves: 0,
    base_accum_prod: 0,
    base_VNS_count: 0,
    max_B1C1: 0,
    max_extra_reserves: 0,
    max_accum_prod: 0,
    max_VNS_count: 0,
    prb_srr: 'string',
    grr_results: 'string',
    dependent_mining: 'string',
    dependent_drilling: 'string',
    commentary: 'string',
  },
  {
    id: 4,
    opt_name: 'string1',
    oilfield_name: 'string1',
    la_name: 'string1',
    base_B1C1: 1,
    base_extra_reserves: 1,
    base_accum_prod: 1,
    base_VNS_count: 1,
    max_B1C1: 1,
    max_extra_reserves: 1,
    max_accum_prod: 1,
    max_VNS_count: 1,
    prb_srr: 'string1',
    grr_results: 'string1',
    dependent_mining: 'string10',
    dependent_drilling: 'string10',
    commentary: 'string10',
  },
];

// Количество столбцов
const NUM_FIELDS = 16;

// парсер числа
const toNumber = (v: string) => {
  const n = Number(v.replace(',', '.'));
  return Number.isFinite(n) ? n : 0;
};

function preprocessLines(text: string): string[][] {
  const rawLines = text.trim().split(/\r?\n/).filter(Boolean);
  const merged: string[][] = [];

  rawLines.forEach(raw => {
    const cells = raw.split('\t');

    const isTail =
      (!cells[0] || !cells[0].trim())      // opt_name

    if (isTail && merged.length) {
      // ✂️ хвост: дописываем данные в предыдущую запись
      const prev = merged[merged.length - 1];
      cells.forEach((val, idx) => {
        if (val && val.trim()) {
          // если это комментарий или текст → склеиваем через перенос строки,
          // иначе просто подменяем пустое
          if (prev[idx] && prev[idx].trim()) {
            prev[idx] += idx >= 11 ? '\n' + val : '; ' + val;
          } else {
            prev[idx] = val;
          }
        }
      });
    } else {
      // 🆕 новая полноценная строка
      merged.push(cells);
    }
  });

  return merged;
}

export default function TableChart<D extends DataRecord = DataRecord>(
  props: TableChartTransformedProps<D> & {
    sticky?: any;
  },
) {
  const { height, width, data: initialData, formData } = props;
  const [isLoading, setIsLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaveLoading, setIsSaveLoading] = useState(false);
  const [editedData, setEditedData] = useState<grrOption[]>([]);
  const [projId, setProjId] = useState<string | null>(null);

  const [deletedIds, setDeletedIds] = useState<number[]>([]);

  const [showPastePopup, setShowPastePopup] = useState(false);
  const [clipboardInput, setClipboardInput] = useState('');

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
    // if (mockData.length > 0) {
    //   const firstProjId = mockData[0].PROJ_ID; // Берем первый PROJ_ID
    //   setProjId(firstProjId);
    // }

  }, [initialData]); // Вызываем только при изменении initialData

  // 1️⃣ Обновляем `projId`, когда изменяется `initialData`
  useEffect(() => {
    console.log('init', { initialData });
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

    // DELETE 
    try {

      if (deletedIds.length) {
        for (const id of deletedIds) {
          await fetch(`${process.env.BACKEND_URL}${url}/${id}`, {
            method: 'DELETE',
          });
        }
      }
    } catch (e) {
      console.error('❌ Ошибка при удалении:', e);
    } finally {
      setDeletedIds([]);
    }

    // a) новые строки → POST
    const newRows = editedData.filter(r => (r as any).isNew);
    // b) отредактированные → PATCH
    const updatedRows = editedData.filter(r => !(r as any).isNew);

    try {
      // --- POST для добавленных --------------------------------------
      if (newRows.length) {
        const postResp = await fetch(`${process.env.BACKEND_URL}${url}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            proj_id: projId,
            data: newRows.map(({ isNew, ...row }) => row), // убираем служебный флаг
          }),
        });
        if (postResp.ok) {
          setEditedData(prev =>
            prev.map(r => (r as any).isNew ? { ...r, isNew: undefined } : r),
          );
        }
        if (!postResp.ok) throw new Error('POST failed');
      }

      // --- PATCH для остальных --------------------------------------
      const patchResp = await fetch(`${process.env.BACKEND_URL}${url}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          proj_id: projId,
          data: updatedRows,
        }),
      });
      if (!patchResp.ok) throw new Error('PATCH failed');

      console.log('✅ Всё сохранено');
      // после удачного POST/PATCH перезагружаем свежие данные,
      // чтобы получить окончательные id из бэка
      handleLoadExternal(projId);
    } catch (e) {
      console.error('❌ Ошибка при сохранении:', e);
    } finally {
      setIsSaveLoading(false);
    }
  };


  const handleChange = (id: number, field: keyof grrOption, value: any) => {
    setEditedData(prev =>
      prev.map(row => (row.id === id ? { ...row, [field]: value } : row)),
    );
  };

  const handleAdd = () => {
    const newId = Date.now();
    setEditedData(prev => [
      ...prev,
      {
        id: newId,
        isNew: true,
        opt_name: `-`,
        oilfield_name: '-',
        la_name: '-',
        base_B1C1: 0,
        base_extra_reserves: 0,
        base_accum_prod: 0,
        base_VNS_count: 0,
        max_B1C1: 0,
        max_extra_reserves: 0,
        max_accum_prod: 0,
        max_VNS_count: 0,
        prb_srr: '-',
        grr_results: '-',
        dependent_mining: '-',
        dependent_drilling: '-',
        commentary: '-',
      },
    ]);
  };

  const handleDelete = (id: number) => {
    // запоминаем id для DELETE
    setDeletedIds(prev => [...prev, id]);

    setEditedData(prev => prev.filter(row => row.id !== id));
  };

  const parseTextAndInsert = (text: string) => {
    const mergedLines = preprocessLines(text);

    const parsed: grrOption[] = mergedLines.map((cells, rowIdx) => {
      // дополняем/обрезаем до строго 16 полей
      if (cells.length < NUM_FIELDS) {
        cells.push(...Array(NUM_FIELDS - cells.length).fill(''));
      }

      return {
        id: Date.now() + rowIdx,
        isNew: true,

        opt_name: cells[0] || '',
        oilfield_name: cells[1] || '',
        la_name: cells[2] || '',

        base_B1C1: toNumber(cells[3]),
        base_extra_reserves: toNumber(cells[4]),
        base_accum_prod: toNumber(cells[5]),
        base_VNS_count: toNumber(cells[6]),

        max_B1C1: toNumber(cells[7]),
        max_extra_reserves: toNumber(cells[8]),
        max_accum_prod: toNumber(cells[9]),
        max_VNS_count: toNumber(cells[10]),

        prb_srr: cells[11] || '',
        grr_results: cells[12] || '',
        dependent_mining: cells[13] || '',
        dependent_drilling: cells[14] || '',
        commentary: cells[15] || '',
      };
    });

    setEditedData(prev => [...prev, ...parsed]);
    setClipboardInput('');
    setShowPastePopup(false);
  }


  return (
    <Styles ref={rootElem} height={height} width={width}>
      {isLoading ? (
        <p>Загрузка...</p>
      ) : (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex' }}>
              <button
                style={{ marginRight: 10 }}
                onClick={() => setIsEditing(!isEditing)}
                className="icon-button edit"
              >
                ✏️ {isEditing ? 'Выход из редактирования' : 'Редактировать'}
              </button>
              {isEditing && (
                <>
                  <button
                    onClick={() => setShowPastePopup(true)}
                    className="icon-button edit"
                  >
                    📋 Вставить из Excel
                  </button>
                </>
              )}
            </div>

            <div>
              {isEditing && (
                <>
                  {showPastePopup && (
                    <>
                      {/* Затемнение фона */}
                      <div
                        style={{
                          position: 'fixed',
                          top: 0,
                          left: 0,
                          right: 0,
                          bottom: 0,
                          backgroundColor: 'rgba(0,0,0,0.5)',
                          zIndex: 9998,
                        }}
                        onClick={() => setShowPastePopup(false)} // закрытие при клике вне
                      />
                      <div
                        style={{
                          position: 'fixed',
                          top: '50%',
                          left: '50%',
                          transform: 'translate(-50%, -50%)',
                          zIndex: 9999,
                          backgroundColor: '#fff',
                          padding: '20px',
                          borderRadius: '8px',
                          boxShadow: '0 0 10px rgba(0,0,0,0.25)',
                          width: '600px',
                          maxHeight: '400px',
                        }}
                        onClick={e => e.stopPropagation()} // блокируем всплытие клика
                      >
                        <h4>📥 Вставка данных из Excel</h4>
                        <p style={{ fontSize: '14px', color: '#333', marginBottom: '6px' }}>
                          Скопируйте таблицу из Excel (без заголовков), нажмите <kbd>Ctrl+V</kbd> в поле ниже, затем нажмите "Добавить".
                        </p>
                        <textarea
                          value={clipboardInput}
                          onChange={e => setClipboardInput(e.target.value)}
                          placeholder="Вставьте сюда строки из Excel..."
                          rows={6}
                          style={{ width: '100%', marginBottom: '12px' }}
                        />
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                          <button onClick={() => setShowPastePopup(false)}>Отмена</button>
                          <button onClick={() => parseTextAndInsert(clipboardInput)}>Добавить</button>
                        </div>
                      </div>
                    </>
                  )}

                  <ControlButtons
                    isSaving={isSaveLoading}
                    onSave={handleSave}
                    onAddRow={handleAdd}
                    addRowLabel="Добавить строку"
                  />
                </>
              )}
            </div>
          </div>

          <table cellPadding={4} style={{ width: '100%', borderCollapse: 'collapse', marginTop: 10 }}>
            <thead style={{ backgroundColor: '#f0f0f0' }}>
              <tr>
                <th rowSpan={2}>Опция ГРР</th>
                <th rowSpan={2}>Месторождение</th>
                <th rowSpan={2} style={{ minWidth: '60px' }}>ЛУ</th>

                <th colSpan={4} style={{ maxWidth: '200px' }}>Базовый (на полную выработку)</th>
                <th colSpan={4}>Максимальный (на полную выработку)</th>

                <th rowSpan={2}>Год ПРБ/СРР</th>
                <th rowSpan={2}>Год получения результатов ГРР</th>
                <th rowSpan={2}>Год начала зависимой добычи</th>
                <th rowSpan={2}>Кусты зависимого бурения</th>
                <th rowSpan={2}>Примечание</th>
                {isEditing && <th rowSpan={2} style={{ width: '60px' }}>Удалить</th>}
              </tr>
              <tr>
                <th style={{ width: '50px' }}>Прирост запасов нефти кат.B1C1 от опции ГРР млн.тонн</th>
                <th style={{ width: '50px' }}>Извл. запасы по опции ГРР (дренируемые запасы от зависимого ЭБ), млн.тонн</th>
                <th style={{ width: '50px' }}>Нак. добыча от зависимого ЭБ млн.тонн</th>
                <th style={{ width: '50px' }}>Кол-во ВНС</th>

                <th style={{ width: '50px' }}>Прирост запасов нефти кат.B1C1 от опции ГРР, млн.тонн</th>
                <th style={{ width: '50px' }}>Извл. запасы по опции ГРР (дренируемые запасы от зависимого ЭБ), млн.т</th>
                <th style={{ width: '50px' }}>Нак. добыча от зависимого ЭБ, млн.тонн</th>
                <th style={{ width: '50px' }}>Кол-во ВНС</th>
              </tr>
            </thead>
            <tbody>
              {editedData.map(row => (
                <tr key={row.id}>
                  <td>
                    <AutoResizeTextArea
                      value={row.opt_name ?? ''}
                      onChange={e => handleChange(row.id, 'opt_name', e.target.value)}
                    />
                  </td>
                  <td>
                    <AutoResizeTextArea
                      value={row.oilfield_name ?? ''}
                      onChange={e => handleChange(row.id, 'oilfield_name', e.target.value)}
                    />
                  </td>
                  <td>
                    <AutoResizeTextArea
                      value={row.la_name ?? ''}
                      onChange={e => handleChange(row.id, 'la_name', e.target.value)}
                    />
                  </td>
                  <td>
                    <AutoResizeTextArea
                      value={row.base_B1C1 ?? 0}
                      onChange={e => handleChange(row.id, 'base_B1C1', e.target.value)}
                    />
                  </td>
                  <td>
                    <AutoResizeTextArea
                      value={row.base_extra_reserves ?? 0}
                      onChange={e => handleChange(row.id, 'base_extra_reserves', e.target.value)}
                    />
                  </td>
                  <td>
                    <AutoResizeTextArea
                      value={row.base_accum_prod ?? 0}
                      onChange={e => handleChange(row.id, 'base_accum_prod', e.target.value)}
                    />
                  </td>
                  <td>
                    <AutoResizeTextArea
                      value={row.base_VNS_count ?? 0}
                      onChange={e => handleChange(row.id, 'base_VNS_count', e.target.value)}
                    />
                  </td>
                  <td>
                    <AutoResizeTextArea
                      value={row.max_B1C1 ?? 0}
                      onChange={e => handleChange(row.id, 'max_B1C1', e.target.value)}
                    />
                  </td>
                  <td>
                    <AutoResizeTextArea
                      value={row.max_extra_reserves ?? 0}
                      onChange={e => handleChange(row.id, 'max_extra_reserves', e.target.value)}
                    />
                  </td>
                  <td>
                    <AutoResizeTextArea
                      value={row.max_accum_prod ?? 0}
                      onChange={e => handleChange(row.id, 'max_accum_prod', e.target.value)}
                    />
                  </td>
                  <td>
                    <AutoResizeTextArea
                      value={row.max_VNS_count ?? 0}
                      onChange={e => handleChange(row.id, 'max_VNS_count', e.target.value)}
                    />
                  </td>
                  <td>
                    <AutoResizeTextArea
                      value={row.prb_srr ?? ''}
                      onChange={e => handleChange(row.id, 'prb_srr', e.target.value)}
                    />
                  </td>
                  <td>
                    <AutoResizeTextArea
                      value={row.grr_results ?? ''}
                      onChange={e => handleChange(row.id, 'grr_results', e.target.value)}
                    />
                  </td>
                  <td>
                    <AutoResizeTextArea
                      value={row.dependent_mining ?? ''}
                      onChange={e => handleChange(row.id, 'dependent_mining', e.target.value)}
                    />
                  </td>
                  <td>
                    <AutoResizeTextArea
                      value={row.dependent_drilling ?? ''}
                      onChange={e => handleChange(row.id, 'dependent_drilling', e.target.value)}
                    />
                  </td>
                  <td>
                    <AutoResizeTextArea
                      value={row.commentary ?? ''}
                      onChange={e => handleChange(row.id, 'commentary', e.target.value)}
                    />
                  </td>
                  {isEditing && (
                    <td>
                      <button className="icon-button delete" onClick={() => handleDelete(row.id)}>❌</button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </Styles>
  );
}
