import React, { createRef, useEffect, useState } from 'react';
import { DataRecord } from '@superset-ui/core';
import { TableChartTransformedProps } from './types';
import { DataTableProps } from './DataTable';
import { Styles, StyledTextArea, StyledDateInput } from './styles';
import { ControlButtons } from './components/ControlButtons';

// Моковые данные
const mockData = [
  { PROJ_ID: '12345', project_name: 'Project Alpha' },
  { PROJ_ID: '67890', project_name: 'Project Beta' },
];

const mockApiResponse = {
  data: [
    {
      row_num: 1,
      risks_by_direction: `Первая строка\nВторая строка\nТретья строка\nЧетвертая строка\nПятая строка`,
      third_level_risk_count: 1
    },
    { text: 'Событие 2', milestone_date: '2025-03-15' },
  ],
};

export default function TableChart<D extends DataRecord = DataRecord>(
  props: TableChartTransformedProps<D> & {
    sticky?: DataTableProps<D>['sticky'];
  },
) {
  const { height, width, data: initialData, formData } = props;
  const [data, setData] = useState<D[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaveLoading, setIsSaveLoading] = useState(false);
  const [editedData, setEditedData] = useState<D[]>([]);
  const [projId, setProjId] = useState<string | null>(null);
  const rootElem = createRef<HTMLDivElement>();
  const url = formData.endpoint

  useEffect(() => {
    // mockDATA
    //   const firstProjId = mockData[0].PROJ_ID; // Берем первый PROJ_ID
    //   setProjId(firstProjId);
    //   setData(mockApiResponse.data);
    //   setEditedData(mockApiResponse.data);

  }, [initialData]); // Вызываем только при изменении initialData

  // 1️⃣ Обновляем `projId`, когда изменяется `initialData`
  useEffect(() => {
    if (initialData.length > 0) {
      const firstProjId = initialData[0]?.PROJ_ID;
      if (firstProjId && firstProjId !== projId) {
        setProjId(firstProjId); // Обновляем `projId`
      }
    }
  }, [initialData]);

  // 2️⃣ Загружаем данные после обновления `projId`
  useEffect(() => {
    if (projId) {
      handleLoadExternal(projId);
    }
  }, [projId]);


  // ========== GET-логика ==========
  const handleLoadExternal = async (projId: string) => {
    setIsLoading(true);

    const url = `http://bnipi-rnc-tst1.rosneft.ru:8098/project/milestones/${projId}`;
    console.log(`🔗 GET запрос: ${url}`);

    // Пример retry в 5 попыток
    const maxAttempts = 5;
    let attempts = 0;

    while (attempts < maxAttempts) {
      try {
        const response = await fetch(url, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        });
        if (response.ok) {
          const dataFromGet = await response.json();
          setData(dataFromGet.data);
          setEditedData(dataFromGet.data);
          console.log('✅ Внешние данные получены');
          break; // прерываем цикл при успехе
        } else {
          console.error('Ошибка при GET-запросе, статус:', response.status);
        }
      } catch (error) {
        console.error('Ошибка сети при GET-запросе:', error);
      }
      attempts++;
      if (attempts < maxAttempts) {
        console.log(`🔄 Повторная попытка GET-запроса через 2 секунды... (${attempts}/${maxAttempts})`);
        await new Promise(res => setTimeout(res, 2000));
      } else {
        console.error('❌ GET-запрос завершился неудачно после 5 попыток');
      }
    }

    setIsLoading(false);
  };

  // ========== PATCH-логика ==========
  const handleSave = async () => {
    if (!projId) {
      console.error('❌ Ошибка: PROJ_ID не найден');
      return;
    }
    setIsSaveLoading(true)

    const requestBody = {
      proj_id: projId,
      data: editedData,
    };

    console.log('📤 Отправка обновленных данных:', requestBody);

    const url = `http://bnipi-rnc-tst1.rosneft.ru:8098/project/milestones`;

    try {
      const response = await fetch(url, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          proj_id: projId,
          data: editedData,
        }),
      });

      if (response.ok) {
        console.log('✅ Данные успешно обновлены!');
      } else {
        console.error('Ошибка при PATCH-запросе, статус:', response.status);
      }
    } catch (error) {
      console.error('Ошибка сети при PATCH-запросе:', error);
    } finally {
      setIsSaveLoading(false)
    }
  };

  // ========== Добавление новой строки ==========
  const handleAddRow = () => {
    const newRow = { text: '', milestone_date: '' }; // Пустая строка
    setEditedData([...editedData, newRow]); // Добавляем строку в конец массива
  };

  // ========== Обновление данных при редактировании ==========
  const handleChange = (rowIndex: number, field: string, value: string) => {
    setEditedData(prevData =>
      prevData.map((row, index) =>
        index === rowIndex ? { ...row, [field]: value } : row,
      ),
    );
  };

  // Подстройка высоты textarea
  const autoResize = (textarea) => {
    textarea.style.height = 'auto'; // Сбрасываем высоту, чтобы правильно пересчитать
    textarea.style.height = `${textarea.scrollHeight}px`; // Устанавливаем высоту на основе содержимого
  };

  return (
    <Styles ref={rootElem} height={height} width={width}>
      {isLoading ? (
        <p>Загрузка...</p>
      ) : (
        <>
          <ControlButtons
            isSaving={isSaveLoading}
            onSave={handleSave}
            onAddRow={handleAddRow}
          />
          <table>
            <thead>
              <tr>
                <th>№ п/п</th>
                <th>Ключевые вехи проекта</th>
                <th>Дата</th>
              </tr>
            </thead>
            <tbody>
              {editedData.map((row, rowIndex) => (
                <tr key={rowIndex}>
                  <td>
                    {rowIndex + 1}
                  </td>
                  <td>
                    <StyledTextArea
                      value={row.text || ''}
                      onChange={(e) => {
                        handleChange(rowIndex, 'text', e.target.value)
                        autoResize(e.target as HTMLTextAreaElement)
                      }}
                      ref={textarea => textarea && autoResize(textarea)}
                    />
                  </td>
                  <td>
                    <StyledDateInput
                      type="date"
                      value={row.milestone_date || ''}
                      onChange={(e) => handleChange(rowIndex, 'milestone_date', e.target.value)}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </>)}
    </Styles>
  );
}
