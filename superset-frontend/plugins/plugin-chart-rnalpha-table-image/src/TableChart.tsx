
import React, { useEffect, createRef, useState } from 'react';
import {
  DataRecord,
} from '@superset-ui/core';
import { TableChartTransformedProps } from './types';
import { styled } from '@superset-ui/core';


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
    border: 0px solid black;

  }

`;


export default function TableChart<D extends DataRecord = DataRecord>(
  props: TableChartTransformedProps<D>,
) {
  const { data, height, width, formData } = props;
  const rootElem = createRef<HTMLDivElement>();

  const [isLoading, setIsLoading] = useState(false);
  const [tableData, setTableData] = useState<DataRow[]>([]);
  const variant_id = formData.var_id
  const dashboard_id = formData.dash_id

  useEffect(() => {
    if (data) {
      fetchImages();
    }

    // Тестовая mini-картинка (dataURL в base64):
    // const testBase64Image = 'iVBORw0KGgoAAAANSUhEUgAAAAUAAAASCAYAAABa3+D9AAAABHNCSVQICAgIfAhkiAAAAAlwSFlzAAALEwAACxMBAJqcGAAAACZ0RVh0Q3JlYXRpb24gVGltZQAwOS8xOS8yM9ccVHoAAAExSURBVDiNlZNLTsUwEEaTr3/bQGgQwpHaXAwdvzwog2C2B4cIXHrDn1Knx63toTqboNf4FwMn2eBHHGKT5H1lz4qaw2w5/IScLwC3wn3w9oWQj/3AUxWWkWZhkXqQBMKqECQUtAJkDhhCAlKEbLyOsOReHo6+ezabnqgbwfSFSJ5Sz2XuJVk6D2daAZAHXYzl88Iu5HLZL74CRqAWJAbQPxGuhby0h1Ea0QZ0B94lU9X6NlzX0H4FG94JdjrUn7Ep5zpWkS1+lQC0LlxUNew4bImODmSJ5hZEkRfOw+V3hy+S1HJ1h/Skef5moctRdCbRn3zaOvtY3y9zqkTkv9id5X+I8zOuE6eHIZeQAAAABJRU5ErkJggg==';

    // Эмулируем «результат запроса» – т.е. кладём в массив единственный элемент,
    // setTableData([{ image: testBase64Image }]);
  }, [data]);

  // Загружаем изображения из BLOB
  const fetchImages = async () => {
    setIsLoading(true);

    // Пример retry в 5 попыток
    const maxAttempts = 5;
    let attempts = 0;

    while (attempts < maxAttempts) {
      try {
        const response = await fetch(`http://10.205.110.59:443/picture/foto/download/${variant_id}/${dashboard_id}`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        });
        if (response.ok) {
          const json = await response.json();

          setTableData([{ image: json.image }]);
          console.log("tableData", tableData)
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
        setTableData([{ image: null }]);
      }
    }

    setIsLoading(false);
  };

  const renderDataRows = () => {
    return tableData.map((row, index) => (
      <tr key={index}>
        <td>
          {row.image ? (
            <img
              src={`data:image/png;base64,${row.image}`}
              alt="SomeImage"
              style={{ maxWidth: '100%', height: 'auto' }}
            />
          ) : (
            'Нет изображения'
          )}
        </td>
      </tr>
    ));
  };

  return (
    <Styles ref={rootElem} height={height} width={width}>
      {isLoading && <div>Загрузка изображения...</div>}

      <table>
        <tbody>{renderDataRows()}</tbody>
      </table>
    </Styles>
  );
}



