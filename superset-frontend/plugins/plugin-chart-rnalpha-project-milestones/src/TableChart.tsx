import React, { useEffect, useRef, useState } from 'react';
import { DataRecord } from '@superset-ui/core';
import { TableChartTransformedProps } from './types';
import { DataTableProps } from './DataTable';
import { Styles, StyledTextArea } from './styles';

export function autoResize(element: HTMLTextAreaElement) {
  if (element) {
    element.style.height = 'auto'; // Сбрасываем высоту
    element.style.height = `${element.scrollHeight}px`; // Устанавливаем новую высоту
  }
}

// Моковые данные
const mockData = [
  { PROJ_ID: '12345', project_name: 'Project Alpha' },
  { PROJ_ID: '67890', project_name: 'Project Beta' },
];

const mockApiResponse = {
  data: [
    { text: 'Событие 1', milestone_date: '2025-02-26' },
    { text: 'Событие 2', milestone_date: '2025-03-15' },
  ],
};

export default function TableChart<D extends DataRecord = DataRecord>(
  props: TableChartTransformedProps<D> & {
    sticky?: DataTableProps<D>['sticky'];
  },
) {
  const { height, width, data: initialData } = props;
  const [data, setData] = useState<D[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [editedData, setEditedData] = useState<D[]>([]);
  const textAreasRef = useRef<(HTMLTextAreaElement | null)[]>([]);
  const [projId, setProjId] = useState<string | null>(null);

  useEffect(() => {
    // TODO mockDATA
    if (mockData.length > 0) {
      const firstProjId = mockData[0].PROJ_ID; // Берем первый PROJ_ID
      setProjId(firstProjId);
      setData(mockApiResponse.data);
      setEditedData(mockApiResponse.data);
      handleLoadExternal(projId);
    }
    if (initialData.length > 0) {
      // const projId = initialData[0]?.PROJ_ID; // Получаем первый PROJ_ID
      // if (projId) {
      //   handleLoadExternal(projId);
      // } else {
      //   console.warn('❌ Не найден PROJ_ID в initialData');
      // }
    }
  }, [initialData]); // Вызываем только при изменении initialData

  useEffect(() => {
    // После загрузки данных или их изменения ресайзим все текстовые области
    textAreasRef.current.forEach((textarea) => {
      if (textarea) autoResize(textarea);
    });
  }, [editedData]);

  // ========== GET-логика ==========
  const handleLoadExternal = async (projId: string) => {
    setIsLoading(true);

    const url = `http://bnipi-rnc-tst1.rosneft.ru:8098/project/milestones?${projId}`;
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
        body: JSON.stringify({ data: requestBody }),
      });

      if (response.ok) {
        console.log('✅ Данные успешно обновлены!');
      } else {
        console.error('Ошибка при PATCH-запросе, статус:', response.status);
      }
    } catch (error) {
      console.error('Ошибка сети при PATCH-запросе:', error);
    }
  };

  // ========== Обновление данных при редактировании ==========
  const handleChange = (index: number, field: string, value: string) => {
    const updatedData = [...editedData];
    updatedData[index] = { ...updatedData[index], [field]: value };
    setEditedData(updatedData);
  }

  return (
    <Styles height={height} width={width}>
      {isLoading ? <p>Загрузка...</p> : null}
      <button onClick={handleSave}>Сохранить</button>
      <table>
        <thead>
          <tr>
            <th>Текст</th>
            <th>Дата</th>
          </tr>
        </thead>
        <tbody>
          {editedData.map((row, rowIndex) => (
            <tr key={rowIndex}>
              <td>
                <StyledTextArea
                  ref={(el) => (textAreasRef.current[rowIndex] = el)}
                  value={row.text}
                  onChange={(e) => {
                    handleChange(rowIndex, 'text', e.target.value);
                    autoResize(e.target);
                  }}
                />
              </td>
              <td>
                <StyledTextArea
                  ref={(el) => (textAreasRef.current[rowIndex + editedData.length] = el)}
                  value={row.milestone_date}
                  onChange={(e) => {
                    handleChange(rowIndex, 'milestone_date', e.target.value);
                    autoResize(e.target);
                  }}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Styles>
  );
}
