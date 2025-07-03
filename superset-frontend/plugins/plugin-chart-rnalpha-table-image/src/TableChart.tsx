import React, { useEffect, createRef, useState } from 'react';
import { DataRecord } from '@superset-ui/core';
import { TableChartTransformedProps } from './types';
import { styled } from '@superset-ui/core';

interface DataRow {
  image: string | null;
}

const Styles = styled.div<{ height: number; width: number }>`
  padding: ${({ theme }) => theme.gridUnit * 4}px;
  border-radius: ${({ theme }) => theme.gridUnit * 2}px;
  height: ${({ height }) => height}px;
  width: ${({ width }) => width}px;
  overflow: auto;

  table {
    width: 100%;
    border-collapse: collapse;
  }
`;

export default function TableChart<D extends DataRecord = DataRecord>(
  props: TableChartTransformedProps<D>,
) {
  const { data: chartData, height, width, formData } = props;
  const rootElem = createRef<HTMLDivElement>();

  const [isLoading, setIsLoading] = useState(false);
  const [tableData, setTableData] = useState<DataRow[]>([]);

  const CASE_NAME_FILTER_KEY = formData.variant_filter_name;
  const CASE_NAME_VARIANT = formData.variant_name;
  const CASE_NAME_ID = formData.variant_id;

  // 🧠 Извлечение variant_name из фильтров
  const selectedVariantName: string | null = React.useMemo(() => {
    let variant: string | null = null;

    if (formData.adhoc_filters?.length) {
      for (const flt of formData.adhoc_filters) {
        const col = flt.col || flt.subject;
        if (col === CASE_NAME_FILTER_KEY) {
          if (Array.isArray(flt.val)) {
            variant = flt.val[0];
          } else if (Array.isArray(flt.comparator)) {
            variant = flt.comparator[0];
          }
        }
      }
    }

    if (!variant && formData.native_filters) {
      Object.values<any>(formData.native_filters).forEach(nf => {
        const col = nf.target?.column || nf.target;
        const valArr = Array.isArray(nf.value)
          ? nf.value
          : Array.isArray(nf.currentValue)
            ? nf.currentValue
            : [];
        if (col === CASE_NAME_FILTER_KEY && valArr.length) {
          variant = valArr[0];
        }
      });
    }

    if (!variant && formData.extra_form_data?.filters?.length) {
      for (const flt of formData.extra_form_data.filters) {
        const col = flt.col || flt.subject || flt.field;
        if (col === CASE_NAME_FILTER_KEY && Array.isArray(flt.val)) {
          variant = flt.val[0];
        }
      }
    }

    return variant || null;
  }, [formData]);
  console.log("selectedVariantName", selectedVariantName);


  // 🧠 Поиск ID варианта
  const variantId = React.useMemo(() => {
    if (!selectedVariantName) return null;
    const found = chartData.find(d => d[CASE_NAME_VARIANT] === selectedVariantName);
    return found ? found[CASE_NAME_ID as keyof typeof found] : null;
  }, [selectedVariantName, chartData]);

  // 🧠 Получение ID дашборда
  const dashboardId = React.useMemo(() => {
    return (
      formData.dashboardId ||
      formData.dashboards?.[0] ||
      formData.url_params?.dashboard_page_id ||
      null
    );
  }, [formData]);
  console.log("dashboardId", dashboardId);

  // 🔃 Загрузка изображения
  useEffect(() => {
    if (variantId && dashboardId) {
      fetchImages();
    }
  }, [variantId, dashboardId]);

  const fetchImages = async () => {
    setIsLoading(true);

    const maxAttempts = 5;
    let attempts = 0;

    while (attempts < maxAttempts) {
      try {
        const res = await fetch(
          `http://10.205.110.59:443/picture/foto/download/${variantId}/${dashboardId}`,
        );

        if (res.ok) {
          const json = await res.json();
          setTableData([{ image: json.image }]);
          break;
        } else {
          console.warn('Fetch error status:', res.status);
        }
      } catch (err) {
        console.error('Fetch error:', err);
      }

      attempts++;
      await new Promise(res => setTimeout(res, 2000));
    }

    if (attempts === maxAttempts) {
      setTableData([{ image: null }]);
    }

    setIsLoading(false);
  };

  return (
    <Styles ref={rootElem} height={height} width={width}>
      {isLoading ? (
        <div>Загрузка изображения...</div>
      ) : (
        <table>
          <tbody>
            {tableData.map((row, index) => (
              <tr key={index}>
                <td>
                  {row.image ? (
                    <img
                      src={`data:image/png;base64,${row.image}`}
                      alt="Изображение"
                      style={{ maxWidth: '100%', height: 'auto' }}
                    />
                  ) : (
                    'Нет изображения'
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Styles>
  );
}
