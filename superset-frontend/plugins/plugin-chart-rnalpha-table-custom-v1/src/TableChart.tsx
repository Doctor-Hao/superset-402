
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

// Функция для преобразования плоских ключей в иерархию
const generateHeaderData = (data: DataRow[]): HeaderColumn[] => {
  const keys = Object.keys(data[0] || {});
  const result: HeaderColumn[] = [];

  keys.forEach(key => {
    const parts = key.split('.');
    let currentLevel = result;

    parts.forEach((part, index) => {
      let existing = currentLevel.find(item => item.label === part);

      if (!existing) {
        existing = { label: part, colSpan: 1 };
        currentLevel.push(existing);
      }

      if (index === parts.length - 1) {
        existing.rowSpan = 1; // Финальный уровень
      } else {
        existing.children = existing.children || [];
        currentLevel = existing.children;
      }
    });
  });

  // Подсчитаем colSpan для родителей
  const calculateColSpan = (columns: HeaderColumn[]): number => {
    return columns.reduce((colSpan, column) => {
      if (column.children) {
        column.colSpan = calculateColSpan(column.children);
      }
      return colSpan + (column.colSpan || 1);
    }, 0);
  };
  calculateColSpan(result);

  return result;
};

// Расчет максимальной глубины заголовков
const calculateMaxDepth = (columns: HeaderColumn[]): number => {
  return columns.reduce((depth, column) => {
    if (column.children) {
      return Math.max(depth, 1 + calculateMaxDepth(column.children));
    }
    return depth;
  }, 1);
};

const reverseData = (data: DataRow[]) => {
  return [...data].reverse(); // Создаем новый массив и переворачиваем его
};

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
    data, height, width, endpoint
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
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    console.log('Plugin props', data);
    console.log('endpoint', endpoint);

    if (data) {
      setTableData([...data]); // Копируем массив, чтобы избежать мутаций
    }
  }, [data]);


  // Отправка данных на сервер
  const handleSave = async () => {
    setIsSaving(true);
    try {
      console.log("tableData", tableData)
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(tableData),
      });

      if (response.ok) {
        alert('Данные успешно сохранены!');
      } else {
        alert('Ошибка при сохранении данных');
      }
    } catch (error) {
      console.error('Ошибка сети:', error);
      alert('Ошибка сети при сохранении данных');
    } finally {
      setIsSaving(false);
    }
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

  // Отсортированные данные (снизу вверх)
  // const reversedData = reverseData(tableData);
  const reversedData = tableData;

  // Генерация структуры заголовков
  const headerData = generateHeaderData(tableData);

  if (!headerData || !headerData.length) {
    return <div>No header data available</div>;
  }

  // Рендеринг заголовков
  const renderHeaderRows = (columns: HeaderColumn[], level = 0, maxDepth: number): JSX.Element[][] => {
    const rows: JSX.Element[][] = [];
    const processLevel = (cols: HeaderColumn[], depth: number) => {
      rows[depth] = rows[depth] || []; // Создаем уровень, если его еще нет
      cols.forEach((col, index) => {
        rows[depth].push(
          <th
            key={`header-cell-${depth}-${index}`}
            colSpan={col.colSpan || 1}
            rowSpan={col.children ? 1 : maxDepth - depth} // Растягиваем leaf узлы
          >
            {col.label}
          </th>
        );
        if (col.children) {
          processLevel(col.children, depth + 1);
        }
      });
    };

    processLevel(columns, level);
    return rows;
  };

  // Финальный рендеринг заголовков
  const renderHeaders = (columns: HeaderColumn[]): JSX.Element[] => {
    const maxDepth = calculateMaxDepth(columns);
    const headerRows = renderHeaderRows(columns, 0, maxDepth);

    return headerRows.map((row, index) => <tr key={`header-row-${index}`}>{row}</tr>);
  };


  // Рендеринг строк данных
  const renderDataRows = () => {
    return tableData.map((row, rowIndex) => (
      <tr key={`row-${rowIndex}`}>
        {Object.keys(row).map((key, cellIndex) => (
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


  return (
    <Styles ref={rootElem} height={height} width={width}>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '8px' }}>
        <button
          onClick={handleAddRow}
          style={{
            marginRight: '8px',
            padding: '4px 8px',
            backgroundColor: '#4CAF50',
            color: 'white',
            border: 'none',
            cursor: 'pointer',
          }}
        >
          Добавить строку
        </button>
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
        <thead>
          {renderHeaders(headerData)}
        </thead>
        <tbody>
          {renderDataRows(reversedData)}
        </tbody>
      </table>
    </Styles>
  );
}
