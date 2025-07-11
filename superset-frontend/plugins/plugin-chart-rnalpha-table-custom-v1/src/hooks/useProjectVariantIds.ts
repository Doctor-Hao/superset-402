import { useMemo } from 'react';

/**
 * Универсальный хук для извлечения `projId` и `variantId` из formData / chartData.
 * По‑умолчанию ориентируется на поля вашего датасета:
 *   - project   → name: **case_project_name**, id: **case_project_id**
 *   - variant   → name: **case_name**,        id: **case_variant_id**
 *
 * Но при необходимости имена колонок и ключей фильтров можно переопределить
 * через объект `options`.
 */
export interface UseProjectVariantIdsResult {
    projId: string | number | null;
    variantId: string | number | null;
}

export interface UseProjectVariantIdsOptions {
    projectNameField?: string;
    projectIdField?: string;
    variantNameField?: string;
    variantIdField?: string;
    projectFilterKey?: string; // ключ фильтра для project (если отличается от имени колонки)
    variantFilterKey?: string; // ключ фильтра для variant (если отличается от имени колонки)
}

/**
 * Вытаскивает список значений фильтра для указанного ключа, проверяя
 * adhoc_filters → native_filters → extra_form_data (в таком порядке).
 */
function extractFilterValues(formData: any, filterKey: string): string[] {
    let values: string[] = [];

    // ---- 1. adhoc_filters
    if (Array.isArray(formData.adhoc_filters)) {
        formData.adhoc_filters.forEach((flt: any) => {
            const colName = flt.col || flt.subject;
            if (colName === filterKey) {
                if (Array.isArray(flt.val)) {
                    values = flt.val.map(String);
                } else if (Array.isArray(flt.comparator)) {
                    values = flt.comparator.map(String);
                }
            }
        });
    }

    // ---- 2. native_filters
    if (values.length === 0 && formData.native_filters) {
        Object.values<any>(formData.native_filters).forEach(nf => {
            const col = typeof nf.target === 'string' ? nf.target : nf.target?.column || '';
            const valArr: any[] = Array.isArray(nf.value)
                ? nf.value
                : Array.isArray(nf.currentValue)
                    ? nf.currentValue
                    : [];
            if (col === filterKey && valArr.length) {
                values = valArr.map(String);
            }
        });
    }

    // ---- 3. extra_form_data.filters
    if (values.length === 0 && formData.extra_form_data?.filters) {
        formData.extra_form_data.filters.forEach((flt: any) => {
            const col = flt.col || flt.subject || flt.field || '';
            if (col === filterKey && Array.isArray(flt.val)) {
                values = flt.val.map(String);
            }
        });
    }

    return values;
}

/**
 * Находит id по имени (nameField) в массиве chartData.
 */
function findIdByName(
    chartData: Record<string, any>[],
    nameField: string,
    idField: string,
    names: string[],
): string | number | null {
    if (!names.length) return null;
    const match = chartData.find(d => d[nameField] === names[0]);
    return match ? match[idField as keyof typeof match] ?? null : null;
}

/**
 * Основной хук.
 *
 * @param formData   – объект formData из плагина Superset
 * @param chartData  – данные (rows)
 * @param options    – переопределяемые имена колонок/фильтров
 */
export function useProjectVariantIds(
    formData: any,
    chartData: Record<string, any>[],
    options: UseProjectVariantIdsOptions = {},
): UseProjectVariantIdsResult {
    return useMemo(() => {
        const cfg = {
            projectNameField: options.projectNameField ?? formData.project_name ?? 'case_project_name',
            projectIdField: options.projectIdField ?? formData.project_id ?? 'case_project_id',
            variantNameField: options.variantNameField ?? formData.variant_name ?? 'case_name',
            variantIdField: options.variantIdField ?? formData.variant_id ?? 'case_variant_id',
            projectFilterKey: options.projectFilterKey ?? formData.project_filter_name ?? (options.projectNameField ?? 'case_project_name'),
            variantFilterKey: options.variantFilterKey ?? formData.variant_filter_name ?? (options.variantNameField ?? 'case_name'),
        } as Required<UseProjectVariantIdsOptions>;

        // -------- PROJECT --------
        const projId = findIdByName(
            chartData,
            cfg.projectNameField,
            cfg.projectIdField,
            extractFilterValues(formData, cfg.projectFilterKey),
        );

        // -------- VARIANT --------
        const variantId = findIdByName(
            chartData,
            cfg.variantNameField,
            cfg.variantIdField,
            extractFilterValues(formData, cfg.variantFilterKey),
        );

        return { projId, variantId } as UseProjectVariantIdsResult;
    }, [formData, chartData, options]);
}

/**
 * Пример использования:
 * ```tsx
 * const { projId, variantId } = useProjectVariantIds(formData, chartData);
 * ```
 *
 * Или с переопределением полей:
 * ```tsx
 * const { projId, variantId } = useProjectVariantIds(formData, chartData, {
 *   projectNameField: 'my_project_col',
 *   variantNameField: 'my_variant_col',
 * });
 * ```
 */
