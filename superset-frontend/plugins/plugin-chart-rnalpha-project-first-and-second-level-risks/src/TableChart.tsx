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
    {
      row_num: 2,
      risks_by_direction: `Первая строка\nВторая строка\nТретья строка\nЧетвертая строка\nПятая строка`,
      third_level_risk_count: 2
    },
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
    // const firstProjId = mockData[0].PROJ_ID; // Берем первый PROJ_ID
    // setProjId(firstProjId);
    // setData(mockApiResponse.data);
    // setEditedData(mockApiResponse.data);

  }, [initialData]); // Вызываем только при изменении initialData

  // 1️⃣ Обновляем `projId`, когда изменяется `initialData`
  useEffect(() => {
    if (initialData.length > 0) {
      const firstProjId = initialData[0]?.PROJ_ID;
      if (firstProjId) {
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

    const payload_url = `${process.env.BACKEND_URL}${url}/${projId}`;
    console.log(`🔗 GET запрос: ${payload_url}`);

    // Пример retry в 5 попыток
    const maxAttempts = 5;
    let attempts = 0;

    while (attempts < maxAttempts) {
      try {
        const response = await fetch(payload_url, {
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

  const getRiskWord = (count) => {
    if (count % 100 >= 11 && count % 100 <= 14) return 'рисков';
    switch (count % 10) {
      case 1:
        return 'риск';
      case 2:
      case 3:
      case 4:
        return 'риска';
      default:
        return 'рисков';
    }
  };


  return (
    <Styles ref={rootElem} height={height} width={width}>
      {isLoading ? (
        <p>Загрузка...</p>
      ) : (
        <>
          <table>
            <thead>
              <tr>
                <th>№</th>
                <th>Ключевые Риски 1 и 2 Уровня по направлениям</th>
                <th>Количество Рисков 3 Уровня</th>
              </tr>
            </thead>
            <tbody>
              {editedData.map((row, rowIndex) => (
                <tr key={rowIndex}>
                  <td>
                    {row.row_num}
                  </td>
                  <td>
                    {row.risks_by_direction}
                  </td>
                  <td>
                    {row.third_level_risk_count} {getRiskWord(row.third_level_risk_count)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </>)}
    </Styles>
  );
}
