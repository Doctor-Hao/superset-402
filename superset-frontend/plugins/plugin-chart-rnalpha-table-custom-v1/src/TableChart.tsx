// TableChart.tsx
import React, { createRef, useEffect, useState } from 'react';
import { DataRecord } from '@superset-ui/core';
import { TableChartTransformedProps } from './types';

import { Styles } from './styles';
import { InternalTable } from './components/InternalTable';
import { ExternalTable } from './components/ExternalTable';
import { ControlButtons } from './components/ControlButtons';

import { useExternalData } from './hooks/useExternalData';
import { useInternalData } from './hooks/useInternalData';
import { useProjectVariantIds } from './hooks/useProjectVariantIds';

interface DataRow {
  [key: string]: string | number | null;
}

export default function TableChart<D extends DataRecord = DataRecord>(
  props: TableChartTransformedProps<D>,
) {
  const { data, height, width, endpoint, formData, data: initialData } = props;
  const rootElem = createRef<HTMLDivElement>();

  const [tableData, setTableData] = useState<DataRow[]>([]);
  // Формирование словаря mappingDict для колонок
  const [mappingDict, setMappingDict] = useState<Record<string, { name: string; api_key: string }>>(
    {},
  );
  const [mappingArray, setMappingArray] = useState<any[]>([]);
  const { isSaving, handleSave } = useInternalData(endpoint);

  const { projId, variantId } = useProjectVariantIds(formData, initialData);
  console.log("projId", projId, "varId", variantId);


  // Загрузка из props
  useEffect(() => {
    if (data) {
      setTableData([...data]);
    }
  }, [data]);

  // Если "использовать внешние данные" - делаем GET
  useEffect(() => {
    if (formData.use_external_data && tableData.length > 0) {
      handleLoadExternal();
    }
  }, [formData.use_external_data, tableData]);

  // Парсим JSON из formData.columns_mapping
  useEffect(() => {
    try {
      const parsed = JSON.parse(formData.columns_mapping || '[]');
      const dict: Record<string, { name: string; api_key: string }> = {};
      parsed.forEach((item: any) => {
        const originalColumn = Object.keys(item)[0];
        if (originalColumn) {
          dict[originalColumn] = item[originalColumn];
        }
      });
      setMappingDict(dict);
      setMappingArray(parsed); // <-- сохраняем сам массив в стейт
    } catch (error) {
      console.error('Ошибка парсинга columns_mapping:', error);
    }
  }, [formData.columns_mapping]);

  // Кастомные хуки
  const {
    externalData,
    setExternalData,
    isLoading,
    handleLoadExternal,
    handleSaveExternal,
  } = useExternalData(endpoint, mappingArray, tableData, projId, variantId);


  // Получаем hiddenIndexes (из formData)
  const hiddenIndexes = formData.hidden_columns_indexes
    ? formData.hidden_columns_indexes
      .split(',')
      .map(idx => parseInt(idx.trim(), 10))
      .filter(idx => !isNaN(idx))
    : [];

  // Определяем список колонок
  const allColumns = tableData.length ? Object.keys(tableData[0]) : [];
  const visibleColumns = allColumns.filter((_, index) => !hiddenIndexes.includes(index));

  // Функция изменения ячейки
  const handleInputChange = (rowIndex: number, columnKey: string, value: string) => {
    setTableData(prevData =>
      prevData.map((row, i) => (i === rowIndex ? { ...row, [columnKey]: value } : row)),
    );
  };

  // Добавление строки (только для внутренней таблицы)
  const handleAddRow = () => {
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

  // Обёртка для сохранения (внутренних) данных
  const onSaveInternalData = async () => {
    // Парсим mapping
    let mappingArray = [];
    try {
      mappingArray = JSON.parse(formData.columns_mapping || '[]');
    } catch (err) {
      alert('Ошибка в формате JSON сопоставления колонок');
      return;
    }
    await handleSave(tableData, mappingArray, formData.send_as_array);
  };

  // Обёртка для сохранения (внешних) данных
  const onSaveExternalData = async () => {
    // Парсим mapping (если нужно передать его в useExternalData)
    let mappingArray = [];
    try {
      mappingArray = JSON.parse(formData.columns_mapping || '[]');
    } catch (err) {
      alert('Ошибка в формате JSON сопоставления колонок');
      return;
    }
    // Можно вызвать напрямую из хука:
    await handleSaveExternal();
  };

  return (
    <Styles ref={rootElem} height={height} width={width}>
      {formData.use_external_data ? (
        <>
          <ControlButtons
            isSaving={isSaving || isLoading}
            onSave={onSaveExternalData}
            onAddRow={handleAddRow}
          />
          <ExternalTable
            externalData={externalData}
            setExternalData={setExternalData}
            mappingDict={mappingDict}
          />
        </>
      ) : (
        <>
          <ControlButtons
            isSaving={isSaving}
            onSave={onSaveInternalData}
          />
          <InternalTable
            tableData={tableData}
            visibleColumns={visibleColumns}
            mappingDict={mappingDict}
            onInputChange={handleInputChange}
          />
        </>
      )}
    </Styles>
  );
}
