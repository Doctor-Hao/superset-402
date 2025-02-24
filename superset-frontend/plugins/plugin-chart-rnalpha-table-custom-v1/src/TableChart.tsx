
import React, { useEffect, createRef, useState, useRef, useLayoutEffect } from 'react';
import {
  DataRecord,
} from '@superset-ui/core';
import { TableChartTransformedProps } from './types';
import { styled } from '@superset-ui/core';


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

const Styles = styled.div<{ height: number; width: number }>`
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
    }

    th {
      background-color: #f9bd00;
      font-weight: bold;
    }
  }

  tr:nth-of-type(odd) {
    background-color: rgb(226,226,226);
  }
`;

// Styled-компонент для textarea
const StyledTextArea = styled.textarea`
  width: 100%;
  min-height: 40px;
  resize: none; /* По умолчанию ресайз отключён */
  border: none;
  padding: 4px;
  font-size: 14px;
  box-sizing: border-box;
  display: block;
  overflow: hidden;
  background: transparent;
  outline: none;

  &:hover {
    resize: vertical; /* При наведении появляется возможность вертикального ресайза */
  }
`;

// Функция автоизменения высоты textarea
const autoResize = (element: HTMLTextAreaElement) => {
  if (element) {
    element.style.height = 'auto'; // Сбрасываем высоту
    element.style.height = `${element.scrollHeight}px`; // Устанавливаем новую высоту
  }
};

export default function TableChart<D extends DataRecord = DataRecord>(
  props: TableChartTransformedProps<D>,
) {
  const {
    data, height, width, endpoint, formData
  } = props;
  const rootElem = createRef<HTMLDivElement>();
  const textAreaRefs = useRef<(HTMLTextAreaElement | null)[][]>([]);

  // Используем useLayoutEffect для корректного обновления высоты
  useLayoutEffect(() => {
    setTimeout(() => {
      textAreaRefs.current.forEach(row => {
        row.forEach(textarea => {
          if (textarea) {
            autoResize(textarea);
          }
        });
      });
    }, 0);
  }, [data]); // Срабатывает при загрузке данных

  const [tableData, setTableData] = useState<DataRow[]>([]);
  const [externalData, setExternalData] = useState<any>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    console.log('Plugin props', data);
    console.log('endpoint', endpoint);

    if (data) {
      setTableData([...data]); // Копируем массив, чтобы избежать мутаций
    }
  }, [data]);

  // При наличии галочки "Получать данные из другого источника" загружаем GET данные автоматически
  useEffect(() => {
    if (formData.use_external_data && tableData.length > 0) {
      handleLoadExternal();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.use_external_data, tableData]);

  // Получаем скрытые индексы из formData
  const hiddenIndexes = formData.hidden_columns_indexes
    ? formData.hidden_columns_indexes.split(',').map(idx => parseInt(idx.trim(), 10)).filter(idx => !isNaN(idx))
    : [];

  // Определяем порядок колонок
  const allColumns = tableData.length ? Object.keys(tableData[0]) : [];
  const visibleColumns = allColumns.filter((_, index) => !hiddenIndexes.includes(index));

  // Отправка данных на сервер
  const handleSave = async () => {
    setIsSaving(true);
    let attempts = 0;
    const maxAttempts = 5;
    while (attempts < maxAttempts) {

      try {
        // Парсим JSON из сопоставления колонок
        let mapping = [];
        try {
          mapping = JSON.parse(formData.columns_mapping || '[]');
        } catch (err) {
          alert('Ошибка в формате JSON сопоставления колонок');
          return;
        }

        // Формируем новый массив данных, где для каждой строки:
        // ключом будет значение из mapping.api_key, а значением – данные из таблицы
        const mappedData = tableData.map(row => {
          const mappedRow: { [key: string]: any } = {};
          mapping.forEach(item => {
            // item — это объект, где ключом является название колонки из таблицы,
            // а значением объект с описанием (в т.ч. с полем api_key)
            const originalColumn = Object.keys(item)[0];
            const { api_key } = item[originalColumn];
            if (api_key && row[originalColumn] !== undefined) {
              mappedRow[api_key] = row[originalColumn];
            }
          });
          return mappedRow;
        });

        const payload = formData.send_as_array ? mappedData : mappedData[0];

        console.log("payload", payload)

        // Пример отправки всех строк, можно изменить логику, если требуется отправлять только одну строку
        const response = await fetch(endpoint, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        });

        if (response.ok) {
          console.log('✅ Данные успешно сохранены!');
          setIsSaving(false);
          return; // Если успех, завершаем выполнение
        } else {
          console.error('Ошибка при сохранении данных');
        }
      } catch (error) {
        console.error('Ошибка сети:', error);
      }

      attempts += 1;
      if (attempts < maxAttempts) {
        console.log(`🔄 Повторная попытка через 2 секунды... (${attempts}/${maxAttempts})`);
        await new Promise(resolve => setTimeout(resolve, 2000));
      }

    }
    alert('❌ Ошибка: Данные не удалось сохранить. Повторите попытку позднее...');
    setIsSaving(false);
  };


  // Обновляем значение в ячейке
  const handleInputChange = (rowIndex: number, columnKey: string, value: string) => {
    setTableData(prevData =>
      prevData.map((row, index) =>
        index === rowIndex ? { ...row, [columnKey]: value } : row,
      ),
    );
  };

  // Добавление новой строки
  const handleAddRow = () => {
    if (!tableData.length) return; // Если таблица пустая, ничего не делаем

    const newRow = Object.keys(tableData[0]).reduce((acc, key) => {
      acc[key] = ''; // Создаём пустое значение для каждого столбца
      return acc;
    }, {} as DataRow);

    setTableData(prevData => [...prevData, newRow]);
  };

  // Финальный рендеринг заголовков
  const renderHeaders = () => {
    let mappingDict: Record<string, { name: string; api_key: string }> = {};

    // Находим русское имя поля columns_mapping
    try {
      const mappingArray = JSON.parse(formData.columns_mapping || '[]');
      mappingDict = mappingArray.reduce((acc: any, item: any) => {
        const originalColumn = Object.keys(item)[0];
        if (originalColumn) {
          acc[originalColumn] = item[originalColumn];
        }
        return acc;
      }, {});
    } catch (error) {
      console.error('Ошибка парсинга columns_mapping:', error);
    }

    return (
      <tr>
        {visibleColumns.map((column, index) => {
          // Если для колонки есть сопоставление, берём свойство name, иначе оставляем исходное название
          const headerLabel = mappingDict[column]?.name || column;
          return <th key={`header-${index}`}>{headerLabel}</th>;
        })}
      </tr>
    );
  };


  // **Обновленный рендер строк данных с фильтрацией по индексам**
  const renderDataRows = () => {
    return tableData.map((row, rowIndex) => (
      <tr key={`row-${rowIndex}`}>
        {visibleColumns.map((key, cellIndex) => (
          <td key={`cell-${rowIndex}-${cellIndex}`} style={{ padding: '4px', boxSizing: 'border-box' }}>
            <StyledTextArea
              ref={el => {
                if (!textAreaRefs.current[rowIndex]) {
                  textAreaRefs.current[rowIndex] = [];
                }
                textAreaRefs.current[rowIndex][cellIndex] = el;
              }}
              value={row[key] || ''}
              onChange={e => handleInputChange(rowIndex, key, e.target.value)}
              onInput={e => autoResize(e.target as HTMLTextAreaElement)}
            />
          </td>
        ))}
      </tr>
    ));
  };

  // Загрузка внешних данных через GET. Используем только columns_mapping[0] для формирования параметра.
  const handleLoadExternal = async () => {
    setIsLoading(true);
    let mapping = [];
    try {
      mapping = JSON.parse(formData.columns_mapping || '[]');
    } catch (err) {
      alert('Ошибка в формате JSON сопоставления колонок');
      setIsLoading(false);
      return;
    }
    if (!tableData.length) {
      alert('Нет данных в таблице для формирования GET-запроса');
      setIsLoading(false);
      return;
    }
    const firstRow = tableData[0];
    let urlWithValue = endpoint;
    if (mapping.length > 0) {
      const firstMapping = mapping[0];
      const originalColumn = Object.keys(firstMapping)[0];
      if (firstRow.hasOwnProperty(originalColumn)) {
        // Формируем URL вида: endpoint/{значение}
        urlWithValue = `${endpoint}/${firstRow[originalColumn]}`;
      }
    }

    const maxAttempts = 5;
    let attempts = 0;
    while (attempts < maxAttempts) {
      try {
        const response = await fetch(urlWithValue, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });
        if (response.ok) {
          const dataFromGet = await response.json();
          // Сохраняем полученные данные – динамические колонки определим при рендеринге
          setExternalData(dataFromGet);
          console.log('✅ Внешние данные успешно получены!');
          break;
        } else {
          console.error('Ошибка при выполнении GET-запроса');
        }
      } catch (error) {
        console.error('Ошибка сети при GET-запросе:', error);
      }
      attempts++;
      if (attempts < maxAttempts) {
        console.log(`🔄 Повторная попытка GET-запроса через 2 секунды... (${attempts}/${maxAttempts})`);
        await new Promise(resolve => setTimeout(resolve, 2000));
      } else {
        console.error('❌ GET-запрос завершился неудачно после 5 попыток');
      }
    }
    setIsLoading(false);
  };


  // Рендер внешней таблицы с динамическими колонками, используя mapping для заголовков
  const renderExternalTable = () => {
    if (!externalData) return null;

    // Получаем сопоставление из columns_mapping
    let mappingDict: Record<string, { name: string; api_key: string }> = {};
    try {
      const mappingArray = JSON.parse(formData.columns_mapping || '[]');
      mappingDict = mappingArray.reduce((acc: any, item: any) => {
        const originalColumn = Object.keys(item)[0];
        if (originalColumn) {
          acc[originalColumn] = item[originalColumn];
        }
        return acc;
      }, {});
    } catch (error) {
      console.error('Ошибка парсинга columns_mapping:', error);
    }

    // Определяем динамические колонки: ключи, значения которых являются массивами
    const dynamicColumns = Object.keys(externalData).filter(key => Array.isArray(externalData[key]));
    if (dynamicColumns.length === 0) return <div>Нет данных для отображения</div>;

    // Определяем количество строк – берем максимум длин массивов (предполагается, что длины совпадают)
    const rowCount = Math.max(...dynamicColumns.map(col => externalData[col].length));

    return (
      <table>
        <thead>
          <tr>
            {dynamicColumns.map(col => (
              <th key={col}>
                {mappingDict[col] && mappingDict[col].name ? mappingDict[col].name : col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rowCount }).map((_, i) => (
            <tr key={`external-row-${i}`}>
              {dynamicColumns.map(col => (
                <td key={`${col}-${i}`}>
                  <StyledTextArea
                    value={externalData[col][i] || ''}
                    onChange={e => {
                      const newVal = e.target.value;
                      // Обновляем значение в массиве для данного столбца
                      const newExternalData = { ...externalData };
                      newExternalData[col] = [...externalData[col]];
                      newExternalData[col][i] = newVal;
                      setExternalData(newExternalData);
                    }}
                    onInput={e => autoResize(e.target as HTMLTextAreaElement)}
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    );
  };


  // Сохранение внешних данных через PATCH
  const handleSaveExternal = async () => {
    setIsSaving(true);
    if (!externalData) {
      alert('Нет внешних данных для сохранения');
      setIsSaving(false);
      return;
    }
    let mapping = [];
    try {
      mapping = JSON.parse(formData.columns_mapping || '[]');
    } catch (err) {
      alert('Ошибка в формате JSON сопоставления колонок');
      setIsSaving(false);
      return;
    }

    // Клонируем externalData, чтобы не мутировать state напрямую
    const payload = { ...externalData };

    // Если сопоставление существует и таблица содержит данные,
    // добавляем поле с ключом из mapping[0].api_key и значением из соответствующей колонки
    if (mapping.length > 0 && tableData.length > 0) {
      const firstMapping = mapping[0];
      const originalColumn = Object.keys(firstMapping)[0];
      const { api_key } = firstMapping[originalColumn];
      if (tableData[0].hasOwnProperty(originalColumn)) {
        payload[api_key] = tableData[0][originalColumn];
      }
    }

    const maxAttempts = 5;
    let attempts = 0;
    while (attempts < maxAttempts) {
      try {
        const response = await fetch(endpoint, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        });
        if (response.ok) {
          console.log('✅ Внешние данные успешно сохранены!');
          break;
        } else {
          console.error('Ошибка при сохранении внешних данных');
        }
      } catch (error) {
        console.error('Ошибка сети при PATCH-запросе для внешних данных:', error);
      }
      attempts++;
      if (attempts < maxAttempts) {
        console.log(`🔄 Повторная попытка PATCH-запроса через 2 секунды... (${attempts}/${maxAttempts})`);
        await new Promise(resolve => setTimeout(resolve, 2000));
      } else {
        console.error('❌ PATCH-запрос завершился неудачно после 5 попыток');
      }
    }
    setIsSaving(false);
  };


  // Функция добавления новой строки в режимe внешних данных
  const handleAddExternalRow = () => {
    if (!externalData) {
      alert('Нет внешних данных для добавления строки');
      return;
    }
    // Для каждого ключа, значение которого является массивом, добавляем пустую строку
    const newExternalData = { ...externalData };
    Object.keys(newExternalData).forEach(key => {
      if (Array.isArray(newExternalData[key])) {
        newExternalData[key] = [...newExternalData[key], ''];
      }
    });
    setExternalData(newExternalData);
  };

  return (
    <Styles ref={rootElem} height={height} width={width}>
      {formData.use_external_data ? (
        <>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '8px' }}>
            <button
              onClick={handleSaveExternal}
              disabled={isSaving}
              style={{
                padding: '4px 8px',
                backgroundColor: isSaving ? '#aaa' : '#4CAF50',
                color: 'white',
                border: 'none',
                cursor: isSaving ? 'not-allowed' : 'pointer',
                marginLeft: '8px',
              }}
            >
              {isSaving ? 'Сохранение...' : 'Сохранить'}
            </button>
            <button
              onClick={handleAddExternalRow}
              disabled={isSaving}
              style={{
                padding: '4px 8px',
                backgroundColor: isSaving ? '#aaa' : '#4CAF50',
                color: 'white',
                border: 'none',
                cursor: isSaving ? 'not-allowed' : 'pointer',
                marginLeft: '8px',
              }}
            >
              Добавить строку
            </button>
          </div>
          {renderExternalTable()}
        </>
      ) : (
        <>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '8px' }}>
            <button
              onClick={handleSave}
              disabled={isSaving}
              style={{
                padding: '4px 8px',
                backgroundColor: isSaving ? '#aaa' : '#4CAF50',
                color: 'white',
                border: 'none',
                cursor: isSaving ? 'not-allowed' : 'pointer',
              }}
            >
              {isSaving ? 'Сохранение...' : 'Сохранить'}
            </button>
          </div>
          <table>
            <thead>{renderHeaders()}</thead>
            <tbody>{renderDataRows()}</tbody>
          </table>
        </>
      )}
    </Styles>
  );
}
