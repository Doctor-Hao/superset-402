import React, { createRef, useEffect, useState } from 'react';
import { DataRecord } from '@superset-ui/core';
import { TableChartTransformedProps } from './types';
import { Styles, StyledTextArea } from './styles';

interface Variant {
  var_id: number;
  var_name: string;
  note: string | null;
}

// Моковые данные
const mockData = [
  { PROJ_ID: '12345', project_name: 'Project Alpha' },
  { PROJ_ID: '67890', project_name: 'Project Beta' },
];

const mockApiResponse = [
  {
    var_id: 1,
    var_name: "Базовый 1",
    note: `Описание 1 LoremLoremLoremLorem LoremLoremLoremLorem 
    LoremLoremLoremLorem LoremLoremLoremLorem LoremLoremLoremLorem LoremLoremLoremLorem
    LoremLoremLoremLorem LoremLoremLoremLorem LoremLoremLoremLorem
    LoremLoremLoremLorem`
  },
  {
    var_id: 2,
    var_name: "Альтернативный",
    note: 'Описание 1'
  }
]


export default function TableChart<D extends DataRecord = DataRecord>(
  props: TableChartTransformedProps<D> & {
    sticky?: any;
  },
) {
  const { height, width, data: initialData, formData } = props;
  const [isLoading, setIsLoading] = useState(false);
  const [editedData, setEditedData] = useState<Variant[]>([]);
  const [projId, setProjId] = useState<string | null>(null);
  const rootElem = createRef<HTMLDivElement>();
  const url = formData.endpoint

  // const handleLoadExternalMock = async (projId: string) => {
  //   setIsLoading(true);

  //   // Симуляция задержки сети 1.5 сек.
  //   await new Promise((resolve) => setTimeout(resolve, 1500));

  //   // Используем моковые данные вместо реального запроса
  //   setEditedData(mockApiResponse);
  //   console.log("✅ Данные успешно загружены (мок)");

  //   setIsLoading(false);
  // };

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
          const { data } = await response.json();
          setEditedData(data);
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

  return (
    <Styles ref={rootElem} height={height} width={width}>
      {isLoading ? (
        <p>Загрузка...</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {editedData.length > 0 ? (
            editedData.map((item, index) => (
              <div key={item.var_id ?? index}>
                <strong>Вариант «{item.var_name}»</strong> — {item.note ? item.note : ''}
              </div>
            ))
          ) : (
            <p>Нет данных для отображения</p>
          )}
        </div>
      )}
    </Styles>
  );
}
