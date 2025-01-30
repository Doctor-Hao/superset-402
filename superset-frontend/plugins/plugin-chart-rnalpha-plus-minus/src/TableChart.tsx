import React, { useEffect, createRef, useState } from 'react';
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

const Styles = styled.div`
  padding: ${({ theme }) => theme.gridUnit * 4}px;
  border-radius: ${({ theme }) => theme.gridUnit * 2}px;
  height: ${({ height }) => height}px;
  width: ${({ width }) => width}px;

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
  const { data, height, width, endpoint } = props;
  const rootElem = createRef<HTMLDivElement>();

  const [tableData, setTableData] = useState<DataRow[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    console.log('Plugin props', data);
    console.log('endpoint', endpoint);

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
    try {
      console.log("handleSave", tableData[0])

      const response = await fetch(
        'http://bnipi-rnc-tst1.rosneft.ru:8098/variant/proscons',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(tableData[0]),
        },
      );


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


  // Подстройка высоты textarea
  const adjustHeight = (textarea) => {
    textarea.style.height = 'auto'; // Сбрасываем высоту, чтобы правильно пересчитать
    textarea.style.height = `${textarea.scrollHeight}px`; // Устанавливаем высоту на основе содержимого
  };

  return (
    <Styles ref={rootElem} height={height} width={width}>
      <div style={{ marginBottom: '15px', display: 'flex', justifyContent: 'flex-end' }}>
        <button
          onClick={handleSave}
          disabled={isSaving}
          style={{
            padding: '8px 16px',
            backgroundColor: isSaving ? '#aaa' : '#4CAF50',
            color: 'white',
            border: 'none',
            cursor: isSaving ? 'not-allowed' : 'pointer',
          }}
        >
          {isSaving ? 'Сохранение...' : 'Сохранить значения таблицы'}
        </button>
      </div>
      <div>
        <table>
          <thead>
            <th>Предпосылки варианта</th>
          </thead>
          <tbody>
            {tableData.map((row, rowIndex) => (
              <tr key={rowIndex}>
                <td>
                  <textarea
                    value={row.prerequsites || ''}
                    onChange={e => {
                      handleInputChange(rowIndex, 'prerequsites', e.target.value);
                      adjustHeight(e.target); // Подстраиваем высоту
                    }}
                    ref={(textarea) => textarea && adjustHeight(textarea)} // Автоподстройка при загрузке
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <table>
          <thead>
            <th>Преимущества</th>
            <th>Недостатки</th>
          </thead>
          <tbody>
            {tableData.map((row, rowIndex) => (
              <tr key={rowIndex}>
                <td>
                  <textarea
                    value={row.plus || ''}
                    onChange={e => {
                      handleInputChange(rowIndex, 'plus', e.target.value);
                      adjustHeight(e.target);
                    }}
                    ref={(textarea) => textarea && adjustHeight(textarea)}
                  />
                </td>
                <td>
                  <textarea
                    value={row.minus || ''}
                    onChange={e => {
                      handleInputChange(rowIndex, 'minus', e.target.value);
                      adjustHeight(e.target);
                    }}
                    ref={(textarea) => textarea && adjustHeight(textarea)}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

    </Styles>
  );
}