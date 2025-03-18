import React, { createRef, useEffect, useState } from 'react';
import { DataRecord } from '@superset-ui/core';
import { TableChartTransformedProps } from './types';
import { DataTableProps } from './DataTable';
import { Styles } from './styles';
import Risk1Table from './components/Risk1Table';
import Risk2Table from './components/Risk2Table';


const impactMap: Record<string, string> = {
  "1": "extremely_low",
  "2": "low",
  "3": "medium",
  "4": "high",
  "5": "extremely_high"
};

// Моковые данные
const mockData = [
  { PROJ_ID: '12345', project_name: 'Project Alpha' },
  { PROJ_ID: '67890', project_name: 'Project Beta' },
];

const mockApiResponse = {
  data: [
    {
      "risk_description": "Первая строка\nВторая строка\nТретья строка\nЧетвертая строка\nПятая строка\nШестая строка\nСедьмая строка\nВосьмая строка\nДевятая строка\nДесятая строка",
      "reduction_factors": "Описание проекта\nЕще одна строка описания\nДополнительная информация",
      "probability": {
        "value": "low",
        "value_translate": "string"
      },
      "probability_percentage": 0,
      "impacts": {
        "value": "middle",
        "value_translate": "string"
      },
      "manageability": {
        "value": "high",
        "value_translate": "string"
      },
      "risk_num": "1.1",
      "risk_direction": "Разведка",
      "risk_name": "Неопределенности",
      "changes_in_risk": {
        "value": "new_risk",
        "value_translate": "string"
      },
      "risk_score" {
        "value": "extremely_low",
        "value_translate": "string"
      },
      "responsible_empl": "string",
      "npv": 0,
      "deadline_days": 11,
      "deadline": "11.01.2025",
      "red_flag": true,
      "additional_data": [
        {
          "completed_events": "string",
          "rolling_events": "string",
          "new_events": "string",
          "changes_in_risk": {
            "value": "empty",
            "value_translate": "string"
          },
          "responsible_empl": "string",
          "deadline": "string"
        }
      ]
    }
  ]
}




export default function TableChart<D extends DataRecord = DataRecord>(
  props: TableChartTransformedProps<D> & {
    sticky?: DataTableProps<D>['sticky'];
  },
) {
  const { height, width, data: initialData, formData } = props;
  const [isLoading, setIsLoading] = useState(false);
  const [isSaveLoading, setIsSaveLoading] = useState(false);
  const [editedData, setEditedData] = useState<D[]>([]);
  const [projId, setProjId] = useState<string | null>(null);
  const rootElem = createRef<HTMLDivElement>();
  const url = formData.endpoint
  const { risk_type } = formData;

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
        setProjId(firstProjId); // Обновляем `projId`
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

  const handleLoadExternalMock = async (projId: string) => {
    setIsLoading(true);

    // Симуляция задержки сети 1.5 сек.
    await new Promise((resolve) => setTimeout(resolve, 1500));

    // Используем моковые данные вместо реального запроса
    setEditedData(mockApiResponse.data);
    console.log("✅ Данные успешно загружены (мок)");

    setIsLoading(false);
  };


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
    const formattedData = editedData.map(({ probability, impacts, manageability, changes_in_risk, risk_score, ...rest }) => ({
      ...rest,
      probability: probability?.value,
      impacts: impactMap[impacts?.value],
      manageability: manageability?.value,
      changes_in_risk: changes_in_risk?.value,
      risk_score: risk_score?.value,
    }));


    const requestBody = {
      proj_id: projId,
      data: formattedData,
    };

    console.log('📤 Отправка обновленных данных:', requestBody);

    try {
      const response = await fetch(`${process.env.BACKEND_URL}${url}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
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

  return (
    <Styles ref={rootElem} height={height} width={width}>
      {isLoading ? (
        <p>Загрузка...</p>
      ) : (
        <>
          {risk_type === 'risk' ? (
            <Risk1Table data={editedData} onChange={setEditedData} onSave={handleSave} isSaving={isSaveLoading} />
          ) : (
            <Risk2Table data={editedData} onChange={setEditedData} onSave={handleSave} isSaving={isSaveLoading} />
          )}
        </>
      )}
    </Styles>
  );
}
