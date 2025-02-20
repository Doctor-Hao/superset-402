
import React, { useEffect, createRef, useState, useRef, useLayoutEffect } from 'react';
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

const blobToBase64 = async (blob) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(blob);
    reader.onloadend = () => resolve(reader.result);
    reader.onerror = reject;
  });
};

export default function TableChart<D extends DataRecord = DataRecord>(
  props: TableChartTransformedProps<D>,
) {
  const { data, height, width, formData } = props;
  const rootElem = createRef<HTMLDivElement>();

  const [tableData, setTableData] = useState<DataRow[]>([]);
  const [imageData, setImageData] = useState({});
  const [filteredData, setFilteredData] = useState<DataRow[]>([]);

  useEffect(() => {
    if (data) {
      setTableData([...data]);
      fetchImages(data);
    }
  }, [data]);

  // Получаем колонку с картинками и PTC_ID из formData
  const imageColumn = formData.columns_mapping ? JSON.parse(formData.columns_mapping)[0] : null;
  const ptcIdFilter = formData.ptc_id ? formData.ptc_id.trim() : '';

  // Загружаем изображения из BLOB
  const fetchImages = async (tableData) => {
    const newImageData = {};

    tableData.forEach(async (row, rowIndex) => {
      if (imageColumn && row[imageColumn]) {
        try {
          const response = await fetch(`data:image/png;base64,${row[imageColumn]}`);
          const blob = await response.blob();
          const base64Image = await blobToBase64(blob);
          newImageData[rowIndex] = base64Image;
        } catch (error) {
          console.error("Ошибка загрузки изображения:", error);
        }
      }
    });

    setImageData(newImageData);
  };

  // Фильтрация данных по PTC_ID
  useEffect(() => {
    if (ptcIdFilter) {
      setFilteredData(tableData.filter(row => String(row.PTC_ID) === ptcIdFilter));
    } else {
      setFilteredData(tableData);
    }
  }, [tableData, ptcIdFilter]);

  const renderDataRows = () => {
    return filteredData.map((row, rowIndex) => (
      <tr key={`row-${rowIndex}`}>
        <td style={{ textAlign: 'center', padding: '10px' }}>
          {imageData[rowIndex] ? (
            <img src={imageData[rowIndex]} alt="Image" style={{ maxWidth: '100%', height: 'auto' }} />
          ) : (
            "Нет изображения"
          )}
        </td>
      </tr>
    ));
  };

  return (
    <Styles ref={rootElem} height={height} width={width}>
      <table>
        <tbody>{renderDataRows()}</tbody>
      </table>
    </Styles>
  );
}



