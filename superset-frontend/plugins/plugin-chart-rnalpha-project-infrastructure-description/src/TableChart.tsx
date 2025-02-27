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
  oil_description: `Первая строка\nВторая строка\nТретья строка\nЧетвертая строка\nПятая строка`,
  ppd_description: `Первая строка`
};

export default function TableChart<D extends DataRecord = DataRecord>(
  props: TableChartTransformedProps<D> & {
    sticky?: DataTableProps<D>['sticky'];
  },
) {
  const { height, width, data: initialData } = props;
  const [data, setData] = useState<D[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaveLoading, setIsSaveLoading] = useState(false);
  const [editedData, setEditedData] = useState<D>();
  const [projId, setProjId] = useState<string | null>(null);
  const rootElem = createRef<HTMLDivElement>();
  const url = "http://bnipi-rnc-tst1.rosneft.ru:8098/project/infrastructure/description"


  useEffect(() => {
    // TODO mockDATA
    if (mockData.length > 0) {
      const firstProjId = mockData[0].PROJ_ID; // Берем первый PROJ_ID
      setProjId(firstProjId);
      setData(mockApiResponse);
      setEditedData(mockApiResponse);
    }

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
      // handleLoadExternal(projId);
    }
  }, [projId]);


  // ========== GET-логика ==========
  const handleLoadExternal = async (projId: string) => {
    setIsLoading(true);

    const urlGet = `${url}/${projId}`;
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
      oil_description: editedData?.oil_description,
    };

    console.log('📤 Отправка обновленных данных:', requestBody);

    try {
      const response = await fetch(url, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          proj_id: projId,
          oil_description: editedData?.oil_description,
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

  // ========== Обновление данных при редактировании ==========
  const handleChange = (field: keyof typeof mockApiResponse, value: string) => {
    setEditedData(prevData => ({
      ...prevData!,
      [field]: value,
    }));
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
          />
          <table>
            <thead>
              <tr>
                <th>Описание</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>
                  <StyledTextArea
                    value={editedData?.oil_description || ''}
                    onChange={(e) => {
                      handleChange('oil_description', e.target.value);
                      autoResize(e.target as HTMLTextAreaElement)
                    }}
                    ref={textarea => textarea && autoResize(textarea)}
                  />
                </td>
              </tr>
            </tbody>
          </table>
        </>)}
    </Styles>
  );
}
