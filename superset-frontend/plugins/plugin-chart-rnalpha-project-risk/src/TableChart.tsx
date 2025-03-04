import React, { createRef, useEffect, useRef, useState } from 'react';
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
      "risk_description": "Первая строка\nВторая строка\nТретья строка\nЧетвертая строка\nПятая строка\nШестая строка\nСедьмая строка\nВосьмая строка\nДевятая строка\nДесятая строка",
      "reduction_factors": "Описание проекта\nЕще одна строка описания\nДополнительная информация",
      "probability": {
        "value": "low",
        "value_translate": "string"
      },
      "impacts": {
        "value": "middle",
        "value_translate": "string"
      },
      "manageability": {
        "value": "high",
        "value_translate": "string"
      }
    }
  ]
}

const colorMap = {
  low: 'green',
  medium: 'yellow',
  hight: 'red',
};

const riskLabels = {
  low: 'Низкая',
  medium: 'Средняя',
  hight: 'Высокая',
};

const RiskCell = ({ value, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <td onClick={() => setIsOpen(!isOpen)} style={{ cursor: 'pointer', position: 'relative', textAlign: 'center', width: '100px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
        <span
          style={{
            display: 'inline-block',
            width: '50px',
            height: '50px',
            borderRadius: '50%',
            backgroundColor: colorMap[value] || 'gray',
            boxShadow: '0px 4px 6px rgba(0,0,0,0.2)'
          }}
        ></span>
      </div>
      {isOpen && (
        <div
          style={{
            position: 'absolute',
            background: 'white',
            border: '1px solid #ccc',
            borderRadius: '4px',
            boxShadow: '0px 2px 5px rgba(0,0,0,0.2)',
            padding: '4px',
            zIndex: 10,
            width: '120px',
            textAlign: 'center'
          }}
        >
          {Object.keys(colorMap).map((key) => (
            <div
              key={key}
              onClick={() => {
                onChange(key);
                setIsOpen(false);
              }}
              style={{
                padding: '6px',
                cursor: 'pointer',
                backgroundColor: key === value ? '#ddd' : 'white',
                transition: 'background-color 0.2s',
              }}
              onMouseEnter={(e) => (e.target.style.backgroundColor = '#f0f0f0')}
              onMouseLeave={(e) => (e.target.style.backgroundColor = key === value ? '#ddd' : 'white')}
            >
              {riskLabels[key]}
            </div>
          ))}
        </div>
      )}
    </td>
  );
};


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

    const formattedData = editedData.map(({ probability, impacts, manageability, ...rest }) => ({
      ...rest,
      probability: probability?.value,
      impacts: impacts?.value,
      manageability: manageability?.value,
    }));


    const requestBody = {
      proj_id: projId,
      data: formattedData,
    };

    console.log('📤 Отправка обновленных данных:', requestBody);

    try {
      const response = await fetch(url, {
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

  // ========== Добавление новой строки ==========
  const handleAddRow = () => {
    setEditedData([...editedData, { risk_description: '', reduction_factors: '', probability: { value: '' }, impacts: { value: '' }, manageability: { value: '' } }]);
  };
  // ========== Обновление данных при редактировании ==========
  const handleChange = (rowIndex: number, field: string, value: string) => {
    setEditedData((prevData) =>
      prevData.map((row, index) =>
        index === rowIndex
          ? { ...row, [field]: typeof row[field] === 'object' ? { value } : value }
          : row
      )
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
          <div style={{ position: 'relative' }}>
            <table style={{ paddingBottom: '50px' }}>
              <thead>
                <tr>
                  <th>Риски</th>
                  <th>Описание</th>
                  <th>Факторы снижения риска</th>
                  <th>Вероятность</th>
                  <th>Масштаб действия</th>
                  <th>Управляемость</th>
                </tr>
              </thead>
              <tbody>
                {editedData.map((row, rowIndex) => (
                  <tr key={rowIndex}>
                    <td>
                      Риск {rowIndex + 1}
                    </td>
                    <td>
                      <StyledTextArea
                        value={row.risk_description || ''}
                        onChange={(e) => {
                          handleChange(rowIndex, 'risk_description', e.target.value)
                          autoResize(e.target as HTMLTextAreaElement)
                        }}
                        ref={textarea => textarea && autoResize(textarea)}
                      />
                    </td>
                    <td>
                      <StyledTextArea
                        value={row.reduction_factors || ''}
                        onChange={(e) => {
                          handleChange(rowIndex, 'reduction_factors', e.target.value)
                          autoResize(e.target as HTMLTextAreaElement)
                        }}
                        ref={textarea => textarea && autoResize(textarea)}
                      />
                    </td>
                    <RiskCell value={row.probability?.value} onChange={(val) => handleChange(rowIndex, 'probability', val)} />
                    <RiskCell value={row.impacts?.value} onChange={(val) => handleChange(rowIndex, 'impacts', val)} />
                    <RiskCell value={row.manageability?.value} onChange={(val) => handleChange(rowIndex, 'manageability', val)} />
                  </tr>
                ))}
              </tbody>
            </table>
            <div
              style={{
                position: 'relative',
                bottom: '0',
                width: '100%',
                backgroundColor: '#ffffff',
                padding: '10px',
                textAlign: 'left',
                borderTop: '1px solid #ccc',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: '10px' }}>
                <span
                  style={{
                    display: 'inline-block',
                    width: '25px',
                    height: '25px',
                    borderRadius: '50%',
                    backgroundColor: 'green',
                    boxShadow: '0px 4px 6px rgba(0,0,0,0.2)',
                    marginRight: '15px'
                  }}
                ></span>
                <span>Низкая вероятность/незначительные последствия/хорошо управляемый</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: '10px' }}>
                <span
                  style={{
                    display: 'inline-block',
                    width: '25px',
                    height: '25px',
                    borderRadius: '50%',
                    backgroundColor: 'yellow',
                    boxShadow: '0px 4px 6px rgba(0,0,0,0.2)',
                    marginRight: '15px'
                  }}
                ></span>
                <span>Средняя вероятность/средние последствия/средне управляемый</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: '10px' }}>
                <span
                  style={{
                    display: 'inline-block',
                    width: '25px',
                    height: '25px',
                    borderRadius: '50%',
                    backgroundColor: 'red',
                    boxShadow: '0px 4px 6px rgba(0,0,0,0.2)',
                    marginRight: '15px'
                  }}
                ></span>
                <span>Высокая вероятность/значительные последствия/слабо управляемый</span>
              </div>
            </div>
          </div>
        </>)}
    </Styles>
  );
}
