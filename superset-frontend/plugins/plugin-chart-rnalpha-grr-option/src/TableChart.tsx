import React, { createRef, useEffect, useState } from 'react';
import { DataRecord } from '@superset-ui/core';
import { TableChartTransformedProps } from './types';
import { Styles, StyledTextArea } from './styles';
import { ControlButtons } from './components/ControlButtons';
import AutoResizeTextArea from './components/AutoResizeTextArea';

interface grrOption {
  id: number;
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
      if (typeof firstProjId === 'string' && firstProjId !== projId) {
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
      attempts = +1;
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
      console.error('❌ Ошибка сети', e);
    }

    setIsSaveLoading(false);
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
        opt_name: `Новый ${newId}`,
        oilfield_name: '',
        la_name: '',
        base_B1C1: 0,
        base_extra_reserves: 0,
        base_accum_prod: 0,
        base_VNS_count: 0,
        max_B1C1: 0,
        max_extra_reserves: 0,
        max_accum_prod: 0,
        max_VNS_count: 0,
        prb_srr: '',
        grr_results: '',
        dependent_mining: '',
        dependent_drilling: '',
        commentary: '',
      },
    ]);
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
          <button onClick={() => setIsEditing(!isEditing)} className="icon-button edit">
            ✏️ {isEditing ? 'Выход из редактирования' : 'Редактировать'}
          </button>

          {isEditing && (
            <ControlButtons
              isSaving={isSaveLoading}
              onSave={handleSave}
              onAddRow={handleAdd}
              addRowLabel="Добавить строку"
            />
          )}

          <table cellPadding={4} style={{ width: '100%', borderCollapse: 'collapse', marginTop: 10 }}>
            <thead style={{ backgroundColor: '#f0f0f0' }}>
              <tr>
                <th rowSpan={2}>Опция ГРР</th>
                <th rowSpan={2}>Месторождение</th>
                <th rowSpan={2}>ЛУ</th>

                <th colSpan={4} style={{ maxWidth: '200px' }}>Базовый (на полную выработку)</th>
                <th colSpan={4}>Максимальный (на полную выработку)</th>

                <th rowSpan={2}>Год ПРБ/СРР</th>
                <th rowSpan={2}>Год получения результатов ГРР</th>
                <th rowSpan={2}>Год начала зависимой добычи</th>
                <th rowSpan={2}>Кусты зависимого бурения в ИПРР2024</th>
                <th rowSpan={2}>Примечание</th>
                {isEditing && <th rowSpan={2} style={{ width: '60px' }}>Удалить</th>}
              </tr>
              <tr>
                <th>Прирост запасов нефти кат.B1C1 от опции ГРР млн.тонн</th>
                <th>Извл. /br запасы по опции ГРР (дренируемые запасы от зависимого ЭБ), млн.тонн</th>
                <th>Нак. добыча от зависимого ЭБ млн.тонн</th>
                <th>Кол-во ВНС</th>

                <th>Прирост запасов нефти кат.B1C1 от опции ГРР, млн.тонн</th>
                <th>Извл. запасы по опции ГРР (дренируемые запасы от зависимого ЭБ), млн.т</th>
                <th>Нак. добыча от зависимого ЭБ, млн.тонн</th>
                <th>Кол-во ВНС</th>
              </tr>
            </thead>
            <tbody>
              {editedData.map(row => (
                <tr key={row.id}>
                  <td>{row.id}</td>
                  <td>
                    <AutoResizeTextArea
                      value={row.opt_name}
                      onChange={e => handleChange(row.id, 'opt_name', e.target.value)}
                    />
                  </td>
                  <td>
                    <AutoResizeTextArea
                      value={row.opt_name}
                      onChange={e => handleChange(row.id, 'opt_name', e.target.value)}
                    />
                  </td>
                  <td>
                    <AutoResizeTextArea
                      value={row.opt_name}
                      onChange={e => handleChange(row.id, 'opt_name', e.target.value)}
                    />
                  </td>
                  <td>
                    <AutoResizeTextArea
                      value={row.opt_name}
                      onChange={e => handleChange(row.id, 'opt_name', e.target.value)}
                    />
                  </td>
                  <td>
                    <AutoResizeTextArea
                      value={row.opt_name}
                      onChange={e => handleChange(row.id, 'opt_name', e.target.value)}
                    />
                  </td>
                  <td>
                    <AutoResizeTextArea
                      value={row.opt_name}
                      onChange={e => handleChange(row.id, 'opt_name', e.target.value)}
                    />
                  </td>
                  <td>
                    <AutoResizeTextArea
                      value={row.opt_name}
                      onChange={e => handleChange(row.id, 'opt_name', e.target.value)}
                    />
                  </td>
                  <td>
                    <AutoResizeTextArea
                      value={row.opt_name}
                      onChange={e => handleChange(row.id, 'opt_name', e.target.value)}
                    />
                  </td>
                  <td>
                    <AutoResizeTextArea
                      value={row.opt_name}
                      onChange={e => handleChange(row.id, 'opt_name', e.target.value)}
                    />
                  </td>
                  <td>
                    <AutoResizeTextArea
                      value={row.opt_name}
                      onChange={e => handleChange(row.id, 'opt_name', e.target.value)}
                    />
                  </td>
                  <td>
                    <AutoResizeTextArea
                      value={row.opt_name}
                      onChange={e => handleChange(row.id, 'opt_name', e.target.value)}
                    />
                  </td>
                  <td>
                    <AutoResizeTextArea
                      value={row.opt_name}
                      onChange={e => handleChange(row.id, 'opt_name', e.target.value)}
                    />
                  </td>
                  <td>
                    <AutoResizeTextArea
                      value={row.oilfield_name}
                      onChange={e => handleChange(row.id, 'oilfield_name', e.target.value)}
                    />
                  </td>
                  <td>
                    <AutoResizeTextArea
                      value={row.la_name}
                      onChange={e => handleChange(row.id, 'la_name', e.target.value)}
                    />
                  </td>
                  <td>
                    <AutoResizeTextArea
                      value={row.commentary}
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
