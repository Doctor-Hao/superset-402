import React, { createRef, useEffect, useMemo, useState } from 'react';
import { DataRecord } from '@superset-ui/core';
import { TableChartTransformedProps } from './types';
import { Styles } from './styles';
import { ControlButtons } from './components/ControlButtons';
import AutoResizeTextArea from './components/AutoResizeTextArea';
import { useProjectVariantIds } from './hooks/useProjectVariantIds';

/**
 * Плагин‑таблица «Преимущества / Недостатки».
 * ────────────────────────────────────────────
 * Столбцы — варианты проекта (dev_options)
 * Строка 1  — plus  (Преимущества)
 * Строка 2  — minus (Недостатки)
 * PATCH‑сохранение реализовано в handleSave
 */

interface ProsConsVariant {
  var_id: number;
  var_name: string;
  is_recommended: string | null;
  plus: string | null;
  minus: string | null;
  prerequsites: string | null;
}

// ============ МОКИ ============
const USE_MOCK = false; // ← переключите на false для боевого режима
const mockDevOptions = [
  { var_id: 21, var_name: 'Базовый (БП 2022‑2026)', is_recommended: null },
  { var_id: 22, var_name: 'Нулевой', is_recommended: null },
  { var_id: 23, var_name: 'Максимальный', is_recommended: null },
  { var_id: 24, var_name: 'Альтернативный', is_recommended: null },
  { var_id: 25, var_name: 'Рекомендуемый', is_recommended: 'Y' },
];
const mockProsConsByVar: Record<number, Omit<ProsConsVariant, 'var_id' | 'var_name' | 'is_recommended'>> = {
  21: { plus: 'Преим‑21 Lore, Lore, asd wdaw ad s Lore, asd wdaw ad s Lore, asd wdaw ad s Lore, asd wdaw ad sasd wdaw ad s', minus: 'Минус‑21', prerequsites: null },
  22: { plus: 'Преим‑22', minus: 'Минус‑22', prerequsites: null },
  23: { plus: 'Преим‑23', minus: 'Минус‑23', prerequsites: null },
  24: { plus: 'Преим‑24', minus: 'Минус‑24', prerequsites: null },
  25: { plus: '', minus: '', prerequsites: null },
};
// ===============================

export default function ProsConsTable<D extends DataRecord = DataRecord>(
  props: TableChartTransformedProps<D>,
) {
  const { height, width, data: initialData, formData } = props;
  const rootElem = createRef<HTMLDivElement>();

  /** === локальные состояния === */
  const [isLoading, setIsLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaveLoading, setIsSaveLoading] = useState(false);
  const [variants, setVariants] = useState<ProsConsVariant[]>([]);
  const [originalVariants, setOriginalVariants] = useState<ProsConsVariant[]>([]);
  const [selectedVariants, setSelectedVariants] = useState<string[] | undefined>(undefined);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  /** IDs из Superset */
  const { projId } = useProjectVariantIds(formData, initialData);
  console.log('[ProsCons] projId:', projId);

  useEffect(() => {
    if (initialData && (initialData as any[]).length > 0) {
      const names = (initialData as any[]).map(r => r.CASE_NAME).filter(Boolean);
      setSelectedVariants(names);
    }
  }, [initialData]);


  /**
   * =========================================
   * handleLoadExternal — GET‑логика
   * =========================================
   */
  const handleLoadExternal = async (projectId: string | 'mock') => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      // 1) dev_options
      let devOptions: { var_id: number; var_name: string; is_recommended: string | null }[];
      if (USE_MOCK || projectId === 'mock') {
        await new Promise(r => setTimeout(r, 400));
        devOptions = mockDevOptions;
      } else {
        const res = await fetch(`${process.env.BACKEND_URL}/variant/dev_options/${projectId}`);
        if (!res.ok) throw new Error(`dev_options HTTP ${res.status}`);
        const { data } = await res.json();
        devOptions = data;
      }

      // 2) pros/cons по каждому варианту
      const prosConsFull = await Promise.all(
        devOptions.map(async v => {
          if (USE_MOCK || projectId === 'mock') {
            return { ...v, ...mockProsConsByVar[v.var_id] } as ProsConsVariant;
          }
          const res = await fetch(`${process.env.BACKEND_URL}/variant/proscons/${projectId}/${v.var_id}`);
          if (!res.ok) throw new Error(`proscons ${v.var_id} HTTP ${res.status}`);
          const data = await res.json();
          return {
            var_id: v.var_id,
            var_name: data.var_name ?? v.var_name,
            is_recommended: v.is_recommended,
            plus: data.plus,
            minus: data.minus,
            prerequsites: data.prerequsites,
          } as ProsConsVariant;
        }),
      );

      setVariants(prosConsFull);
      setOriginalVariants(prosConsFull);
    } catch (err: any) {
      console.error('[ProsCons] load error:', err);
      setErrorMessage(err.message ?? 'Не удалось загрузить данные');
    }
    setIsLoading(false);
  };

  /** вызов загрузки */
  useEffect(() => {
    const effectiveProjId = projId || (USE_MOCK ? 'mock' : undefined);
    if (effectiveProjId) handleLoadExternal(effectiveProjId);
  }, [projId]);

  /** есть ли изменения */
  const hasChanges = useMemo(
    () => JSON.stringify(variants) !== JSON.stringify(originalVariants),
    [variants, originalVariants],
  );

  /**
   * ===========================
   * handleSave — PATCH‑логика
   * ===========================
   */
  const handleSave = async () => {
    if (!projId && !USE_MOCK) return; // safety
    if (!hasChanges) {
      setIsEditing(false);
      return;
    }

    setIsSaveLoading(true);
    try {
      // 1. определяем изменённые варианты
      const changed = variants.filter((v, idx) => {
        const orig = originalVariants[idx];
        return (
          v.plus !== orig.plus ||
          v.minus !== orig.minus ||
          v.prerequsites !== orig.prerequsites
        );
      });

      if (changed.length === 0) {
        setIsSaveLoading(false);
        setIsEditing(false);
        setOriginalVariants(variants);
        return;
      }

      if (USE_MOCK) {
        console.log('📝 PATCH payload (mock):', changed.map(c => ({
          var_id: c.var_id,
          proj_id: projId ?? 0,
          plus: c.plus,
          minus: c.minus,
          prerequsites: c.prerequsites,
        })));
        await new Promise(r => setTimeout(r, 500));
      } else {
        // 2. отправляем PATCH для каждого изменённого варианта
        for (const v of changed) {
          const res = await fetch(`${process.env.BACKEND_URL}/variant/proscons`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              var_id: v.var_id,
              proj_id: projId,
              plus: v.plus,
              minus: v.minus,
              prerequsites: v.prerequsites,
            }),
          });
          if (!res.ok) throw new Error(`PATCH ${v.var_id} HTTP ${res.status}`);
        }
      }

      // 3. фиксируем новое состояние как оригинальное
      setOriginalVariants(variants);
      setIsEditing(false);
    } catch (err: any) {
      console.error('[ProsCons] save error:', err);
      alert(`Ошибка сохранения: ${err.message}`);
    }
    setIsSaveLoading(false);
  };

  /** utils */
  const renderCell = (value: string | null, onChange: (val: string) => void) =>
    isEditing ? (
      <AutoResizeTextArea value={value ?? ''} onChange={e => onChange(e.target.value)} />
    ) : (
      <div style={{ whiteSpace: 'pre-wrap' }}>{value}</div>
    );


  const filteredVariants: ProsConsVariant[] = !selectedVariants || selectedVariants.length === 0
    ? variants
    : variants.filter(v => selectedVariants!.includes(v.var_name));

  return (
    <Styles ref={rootElem} height={height} width={width}>
      {isLoading && <p>Загрузка...</p>}
      {errorMessage && <p style={{ color: 'red' }}>{errorMessage}</p>}

      {!isLoading && !errorMessage && filteredVariants.length > 0 && (
        <>
          <div style={{ marginBottom: 8 }}>
            <button
              className="icon-button edit"
              style={{ marginRight: 10 }}
              onClick={() => setIsEditing(prev => !prev)}
            >
              ✏️ {isEditing ? 'Выход из редактирования' : 'Редактировать'}
            </button>
            {isEditing && (
              <ControlButtons isSaving={isSaveLoading} onSave={handleSave} addRowLabel={undefined} />
            )}
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {filteredVariants.map(v => (
                  <th
                    key={v.var_id}
                    className={`${v.is_recommended === 'Y' ? 'recommended-column' : ''}`}
                  >
                    <p>
                      {v.var_name}
                      {v.is_recommended === 'Y' && ' (Рекомендуемый)'}
                    </p>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                <td
                  colSpan={filteredVariants.length}
                  style={{ fontWeight: 'bold', padding: '5px 0' }}
                >
                  Преимущества
                </td>
              </tr>
              <tr>
                {filteredVariants.map((v, idx) => (
                  <td
                    key={v.var_id}
                    className={`${v.is_recommended === 'Y' ? 'recommended-column' : ''}`}
                  >
                    {renderCell(v.plus, val => {
                      const upd = [...filteredVariants];
                      upd[idx] = { ...upd[idx], plus: val };
                      setVariants(upd);
                    })}
                  </td>
                ))}
              </tr>
              <tr>
                <td colSpan={filteredVariants.length} style={{ fontWeight: 'bold', padding: '5px 0' }}>
                  Недостатки
                </td>
              </tr>
              <tr>
                {filteredVariants.map((v, idx) => (
                  <td
                    key={v.var_id}
                    className={`${v.is_recommended === 'Y' ? 'recommended-column' : ''}`}
                  >
                    {renderCell(v.minus, val => {
                      const upd = [...filteredVariants];
                      upd[idx] = { ...upd[idx], minus: val };
                      setVariants(upd);
                    })}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </>
      )
      }
    </Styles >
  );
}
