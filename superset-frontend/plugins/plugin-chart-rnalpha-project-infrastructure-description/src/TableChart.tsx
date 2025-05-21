import React, { createRef, useEffect, useState } from 'react';
import { DataRecord } from '@superset-ui/core';
import { TableChartTransformedProps } from './types';
import { Styles, StyledTextArea } from './styles';
import { ControlButtons } from './components/ControlButtons';




// Моковые данные
const mockData = [
  { PROJ_ID: '12345', project_name: 'Project Alpha' },
  { PROJ_ID: '67890', project_name: 'Project Beta' },
];

const mockApiResponse = {
  "oil_description": "Первая строка\nВторая строка\nТретья строка\nЧетвертая строка\nПятая строка\nШестая строка\nСедьмая строка\nВосьмая строка\nДевятая строка\nДесятая строка",
  "ppd_description": "Описание проекта\nЕще одна строка описания\nДополнительная информация"
}


export default function TableChart<D extends DataRecord = DataRecord>(
  props: TableChartTransformedProps<D> & {
    sticky?: any;
  },
) {
  const { height, width, data: initialData, formData } = props;
  const [isLoading, setIsLoading] = useState(false);
  const [isSaveLoading, setIsSaveLoading] = useState(false);
  const [editedData, setEditedData] = useState<Record<string, any> | undefined>();
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
      if (typeof firstProjId && firstProjId !== projId) {
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
          const dataFromGet = await response.json();
          setEditedData(dataFromGet);
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
      [formData.property_name]: editedData?.[formData.property_name],
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

  // ========== Обновление данных при редактировании ==========
  const handleChange = (field: string, value: string) => {
    setEditedData(prevData => ({
      ...prevData!,
      [field]: value,
    }));
  };

  // Подстройка высоты textarea
  const autoResize = (textarea: HTMLTextAreaElement) => {
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
                <th>{[formData.header_name]}</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>
                  <StyledTextArea
                    value={editedData?.[formData.property_name] || ''}
                    onChange={(e) => {
                      handleChange(formData.property_name, e.target.value);
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
