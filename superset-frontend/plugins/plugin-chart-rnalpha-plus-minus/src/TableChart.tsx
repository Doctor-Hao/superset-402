import React, { useEffect, createRef, useState } from 'react';
import { styled } from '@superset-ui/core';
import { useProjectVariantIds } from './hooks/useProjectVariantIds';

// Типы данных для props
interface HeaderColumn {
  label: string;
  colSpan?: number;
  rowSpan?: number;
  children?: HeaderColumn[];
}

interface DataRow {
  [key: string]: string | number | null;
}

const Styles = styled.div`
  padding: ${({ theme }) => theme.gridUnit * 4}px;
  border-radius: ${({ theme }) => theme.gridUnit * 2}px;
  height: ${({ height }) => height}px;
  width: ${({ width }) => width}px;
  overflow: auto; /* Добавляем скроллинг при переполнении */

  table {
    width: 100%;
    border-collapse: collapse;
    border: 1px solid black;

    th, td {
      border: 1px solid white;
      padding: 8px;
      text-align: center;
      vertical-align: middle;
      word-wrap: break-word;
      white-space: normal;
      vertical-align: top;
    }

    th {
      background-color: #f9bd00;
      font-weight: bold;
    }
  }

  tr:nth-of-type(odd) {
    background-color: rgb(226,226,226)
  }

   textarea {
    width: 100%; /* Устанавливаем ширину textarea равной ширине ячейки */
    resize: none; /* Разрешаем вертикальное изменение размера */
    border: none; /* Убираем стандартные границы */
    box-sizing: border-box; /* Учитываем padding в ширине */
    padding: 8px; /* Добавляем отступ внутри textarea */
    font-size: 14px;
    font-family: inherit;
    background-color: rgb(226,226,226);
  }
`;



export default function SupersetPluginChartKpiCards(props) {
  const { data, height, width, queryData, formData, data: chartData } = props;
  const rootElem = createRef<HTMLDivElement>();

  const [tableData, setTableData] = useState<DataRow[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const url = formData.endpoint

  const { projId, variantId } = useProjectVariantIds(formData, chartData);
  console.log("projId", projId, "varId", variantId);

  useEffect(() => {
    console.log('Plugin props', data);

    if (data) {
      setTableData([...data]); // Копируем массив, чтобы избежать мутаций
    }
  }, [data]);

  // Обработчик изменения значения в textarea
  const handleInputChange = (rowIndex, field, value) => {
    setTableData(prevData =>
      prevData.map((row, index) =>
        index === rowIndex ? { ...row, [field]: value } : row,
      ),
    );
  };

  // Отправка данных на сервер
  const handleSave = async () => {
    setIsSaving(true);
    setErrorMessage(null);
    let attempts = 0;
    const maxAttempts = 5;

    const formResult = {
      var_id: variantId,
      proj_id: projId,
      plus: tableData[0].VAR_PLUS,
      minus: tableData[0].VAR_MINUS,
      prerequsites: tableData[0].PREREQUISITES,
    };

    console.log("📤 Отправка данных...", formResult);

    while (attempts < maxAttempts) {
      try {
        const response = await fetch(
          `${process.env.BACKEND_URL}${url}`,
          {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(formResult),
          }
        );

        if (response.ok) {
          console.log('✅ Данные успешно сохранены!');
          setIsSaving(false);
          setErrorMessage(null);
          return; // Если успех, завершаем выполнение
        } else {
          let backendMsg = '';
          try {
            const { message } = await response.clone().json();
            backendMsg = message ? `: ${message}` : '';
          } catch { /* тело не JSON – игнорируем */ }

          if (response.status === 404) {
            setErrorMessage(`Запись не найдена (404)${backendMsg}`); // NEW
            break;                          // прекращаем повторные попытки
          }

          console.warn(`⚠️ Ошибка при сохранении (Попытка ${attempts + 1}/${maxAttempts})`);
        }
      } catch (error) {
        console.error(`🚨 Ошибка сети (Попытка ${attempts + 1}/${maxAttempts}):`, error);
      }

      attempts += 1;
      if (attempts < maxAttempts) {
        console.log(`🔄 Повторная попытка через 2 секунды... (${attempts}/${maxAttempts})`);
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
    if (!errorMessage) {
      alert('❌ Ошибка: Данные не удалось сохранить. Повторите позже…');
    }
    setIsSaving(false);
  };



  // Подстройка высоты textarea
  const adjustHeight = (textarea) => {
    textarea.style.height = 'auto'; // Сбрасываем высоту, чтобы правильно пересчитать
    textarea.style.height = `${textarea.scrollHeight}px`; // Устанавливаем высоту на основе содержимого
  };

  return (
    <Styles ref={rootElem} height={height} width={width}>
      {tableData.length > 1 ? (
        <div style={{ textAlign: 'center', padding: '20px', fontSize: '16px', fontWeight: 'bold' }}>
          Выберите только 1 вариант и 1 проект
        </div>
      ) : (
        <>
          {errorMessage && (
            <p style={{ color: 'red', marginTop: 8 }}>
              {errorMessage}
            </p>
          )}

          <div style={{ marginBottom: '10px', display: 'flex', justifyContent: 'flex-end' }}>
            <button
              onClick={handleSave}
              disabled={isSaving}
              style={{
                padding: '4px 8px',
                backgroundColor: isSaving ? '#aaa' : '#4CAF50',
                color: 'white',
                border: 'none',
                cursor: isSaving ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
              }}
            >
              {isSaving ? (
                <>
                  <div className="spinner" style={{
                    width: '14px',
                    height: '14px',
                    border: '2px solid white',
                    borderTop: '2px solid transparent',
                    borderRadius: '50%',
                    marginRight: '8px',
                    animation: 'spin 0.8s linear infinite'
                  }}></div>
                  Сохранение...
                </>
              ) : (
                'Сохранить значения таблицы'
              )}
            </button>
          </div>

          <div>
            <table>
              <thead>
                <tr>
                  <th>Предпосылки варианта</th>
                </tr>
              </thead>
              <tbody>
                {tableData.map((row, rowIndex) => (
                  <tr key={rowIndex}>
                    <td>
                      <textarea
                        value={row.PREREQUISITES || ''}
                        onChange={e => {
                          handleInputChange(rowIndex, 'PREREQUISITES', e.target.value);
                          adjustHeight(e.target);
                        }}
                        ref={textarea => textarea && adjustHeight(textarea)}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <table>
              <thead>
                <tr>
                  <th>Преимущества</th>
                  <th>Недостатки</th>
                </tr>
              </thead>
              <tbody>
                {tableData.map((row, rowIndex) => (
                  <tr key={rowIndex}>
                    <td>
                      <textarea
                        value={row.VAR_PLUS || ''}
                        onChange={e => {
                          handleInputChange(rowIndex, 'VAR_PLUS', e.target.value);
                          adjustHeight(e.target);
                        }}
                        ref={textarea => textarea && adjustHeight(textarea)}
                      />
                    </td>
                    <td>
                      <textarea
                        value={row.VAR_MINUS || ''}
                        onChange={e => {
                          handleInputChange(rowIndex, 'VAR_MINUS', e.target.value);
                          adjustHeight(e.target);
                        }}
                        ref={textarea => textarea && adjustHeight(textarea)}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <style>
            {`
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          `}
          </style>
        </>
      )}
    </Styles>
  );
}