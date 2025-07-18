import React, { useEffect, createRef, useState } from 'react';
import { styled } from '@superset-ui/core';
import { useProjectVariantIds } from './hooks/useProjectVariantIds';
import AutoResizeTextArea from './components/AutoResizeTextArea';

// Типы данных для props
interface HeaderColumn {
  label: string;
  colSpan?: number;
  rowSpan?: number;
  children?: HeaderColumn[];
}

interface ProjectVariant {
  var_name: string;
  plus: string;
  minus: string;
  prerequsites: string;
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

  const [isLoading, setIsLoading] = useState(false);
  const [editedData, setEditedData] = useState<ProjectVariant | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const url = formData.endpoint

  const { projId, variantId } = useProjectVariantIds(formData, chartData);
  console.log("projId", projId, "varId", variantId);

  // useEffect(() => {
  // console.log('Plugin props', data);

  // if (data) {
  // setEditedData([...data]);
  // setErrorMessage(null);
  // }
  // }, [data]);

  useEffect(() => {
    if (projId) {
      // mockDATA
      // handleLoadExternalMock(projId)

      handleLoadExternal(projId);
      setErrorMessage(null);
    }
  }, [projId]);

  // Обработчик изменения значения в textarea
  const handleInputChange = (rowIndex, field, value) => {
    setEditedData(prevData =>
      prevData.map((row, index) =>
        index === rowIndex ? { ...row, [field]: value } : row,
      ),
    );
  };

  // ========== GET-логика ==========
  const handleLoadExternal = async (projId: string) => {
    setIsLoading(true);
    setErrorMessage(null);

    const urlGet = `${process.env.BACKEND_URL}${url}/${projId}/${variantId}`;
    console.log(`🔗 GET запрос: ${url}`);

    try {
      const response = await fetch(urlGet, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });
      if (response.ok) {
        const dataFromGet: ProjectVariant = await response.json();
        setEditedData(dataFromGet);
        console.log('✅ Внешние данные получены');
      } else {
        let backendMsg = '';
        try {
          const { message } = await response.clone().json();
          backendMsg = message ? `: ${message}` : '';
        } catch {
          /* тело не JSON — игнорируем */
        }
        if (response.status === 404) {
          setErrorMessage(`Запрошенные данные не найдены (404)${backendMsg}`);
        }
        console.error('Ошибка при GET-запросе, статус:', response.status);
      }
    } catch (error: any) {
      alert(`Ошибка получения GET: ${error.message}`);
    }

    setIsLoading(false);
  };


  // Отправка данных на сервер
  const handleSave = async () => {
    setIsSaving(true);
    setErrorMessage(null);

    const formResult = {
      var_id: variantId,
      proj_id: projId,
      plus: editedData?.plus || '',
      minus: editedData?.minus || '',
      prerequsites: editedData?.prerequsites || '',
    };

    console.log("📤 Отправка данных...", formResult);

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
          setErrorMessage(`Запись не найдена (404)${backendMsg}`);
        }

      }
    } catch (error) {
      console.error('❌ Ошибка при PATCH-запросе:', error);
      setErrorMessage(`Ошибка при сохранении данных: ${error.message}`);
    }

    if (!errorMessage) {
      setErrorMessage(`Ошибка при сохранении данных: ${errorMessage}`);
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
      {isLoading ? (
        <p>Загрузка...</p>
      ) : null}

      {!isLoading && errorMessage && (
        <p style={{ color: 'red', marginTop: 8 }}>
          {errorMessage}
        </p>
      )}

      {!isLoading && editedData ? (
        <>
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
                <tr><th>Предпосылки варианта</th></tr>
              </thead>
              <tbody>
                <tr>
                  <td>
                    <textarea
                      value={editedData.prerequsites}
                      onChange={e =>
                        setEditedData({ ...editedData, prerequsites: e.target.value })
                      }
                    />
                  </td>
                </tr>
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
                <tr>
                  <td>
                    <textarea
                      value={editedData.plus}
                      onChange={e =>
                        setEditedData({ ...editedData, plus: e.target.value })
                      }
                    />
                  </td>
                  <td>
                    <textarea
                      value={editedData.minus}
                      onChange={e =>
                        setEditedData({ ...editedData, minus: e.target.value })
                      }
                    />
                  </td>
                </tr>
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
      ) : null}
    </Styles>
  );
}