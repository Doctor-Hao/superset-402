import { useState, useCallback } from 'react';

/**
 * Универсальный хук для CRUD‑запросов.
 *
 * 1. **GET**  ➜   fetchData()
 * 2. **POST** ➜   postData()
 * 3. **PATCH**➜   saveData()
 * 4. **DELETE**➜ deleteByIds(ids)
 *
 * Каждый билдер payload может вернуть **объект** (один запрос) **или массив** (много
 * запросов).  Для PATCH / POST можно включить `individually = true`, чтобы
 * автоматически слать каждую «часть» отдельно.
 */

// -------------------------- types -------------------------- //

export interface UseRemoteDataOptions<T> {
    /* GET settings */
    get?: {
        buildUrl: () => string;
        parseResponse?: (raw: any) => T;
    };

    /* PATCH settings */
    patch?: {
        buildUrl: () => string;
        buildPayload: () => any | any[];
        individually?: boolean; // если true и payload‑массив — PATCH на каждый
    };

    /* POST settings */
    post?: {
        buildUrl: () => string;
        buildPayload: () => any | any[];
        individually?: boolean; // как для patch
    };

    /* DELETE settings */
    del?: {
        buildUrl: (id: number | string) => string;
    };
}

// -------------------------- hook -------------------------- //

export function useRemoteData<T = any>(options: UseRemoteDataOptions<T>) {
    const [data, setData] = useState<T | null>(null);

    /* flags */
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false); // PATCH
    const [isPosting, setIsPosting] = useState(false); // POST
    const [isDeleting, setIsDeleting] = useState(false); // DELETE

    /* error flags */
    const [hasError, setHasError] = useState(false); // GET
    const [patchError, setPatchError] = useState<string | null>(null);
    const [postError, setPostError] = useState<string | null>(null);
    const [deleteError, setDeleteError] = useState<string | null>(null);

    const [isEmpty, setIsEmpty] = useState(false);

    // -------------------------- GET -------------------------- //

    const fetchData = useCallback(async () => {
        if (!options.get) return;
        const { buildUrl, parseResponse } = options.get;

        setIsLoading(true);
        setHasError(false);
        setIsEmpty(false);

        try {
            const res = await fetch(buildUrl());
            if (res.status === 404) {
                setIsEmpty(true);
                return;
            }
            if (!res.ok) throw new Error(`GET ${res.status}`);

            const raw = await res.json();
            const parsed = parseResponse ? parseResponse(raw) : raw;
            if (!parsed || (Array.isArray(parsed) && parsed.length === 0)) {
                setIsEmpty(true);
            } else {
                setData(parsed);
            }
        } catch (e) {
            console.error('GET error', e);
            setHasError(true);
        } finally {
            setIsLoading(false);
        }
    }, [options.get]);

    // -------------------------- PATCH -------------------------- //

    const saveData = useCallback(async () => {
        if (!options.patch) return;
        const { buildUrl, buildPayload, individually } = options.patch;

        setIsSaving(true);
        setPatchError(null);

        try {
            const payload = buildPayload();
            const chunks = individually && Array.isArray(payload) ? payload : [payload];

            for (const chunk of chunks) {
                if (chunk == null) continue;
                const res = await fetch(buildUrl(), {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(chunk),
                });
                if (res.status === 404) {
                    const body = await res.json().catch(() => ({}));
                    throw new Error(body?.message || '404 Not Found');
                }
                if (!res.ok) {
                    const text = await res.text();
                    throw new Error(`PATCH ${res.status}: ${text}`);
                }
            }
        } catch (e: any) {
            console.error('PATCH error', e);
            setPatchError(e?.message ?? 'PATCH error');
        } finally {
            setIsSaving(false);
        }
    }, [options.patch]);

    // -------------------------- POST -------------------------- //

    const postData = useCallback(async () => {
        if (!options.post) return;
        const { buildUrl, buildPayload, individually } = options.post;

        setIsPosting(true);
        setPostError(null);

        try {
            const payload = buildPayload();
            const chunks = individually && Array.isArray(payload) ? payload : [payload];

            for (const chunk of chunks) {
                if (chunk == null) continue;
                const res = await fetch(buildUrl(), {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(chunk),
                });
                if (!res.ok) {
                    const text = await res.text();
                    throw new Error(`POST ${res.status}: ${text}`);
                }
            }
        } catch (e: any) {
            console.error('POST error', e);
            setPostError(e?.message ?? 'POST error');
        } finally {
            setIsPosting(false);
        }
    }, [options.post]);

    // -------------------------- DELETE -------------------------- //

    const deleteByIds = useCallback(async (ids: Array<number | string>) => {
        if (!options.del) return;
        const { buildUrl } = options.del;

        setIsDeleting(true);
        setDeleteError(null);

        try {
            for (const id of ids) {
                const res = await fetch(buildUrl(id), { method: 'DELETE' });
                if (!res.ok) {
                    const text = await res.text();
                    throw new Error(`DELETE ${id} ${res.status}: ${text}`);
                }
            }
        } catch (e: any) {
            console.error('DELETE error', e);
            setDeleteError(e?.message ?? 'DELETE error');
        } finally {
            setIsDeleting(false);
        }
    }, [options.del]);

    // -------------------------- exports -------------------------- //

    return {
        /* data */
        data,
        setData,

        /* flags */
        isLoading,
        isSaving,
        isPosting,
        isDeleting,
        hasError,
        isEmpty,

        /* error strings */
        patchError,
        postError,
        deleteError,

        /* actions */
        fetchData,
        saveData,
        postData,
        deleteByIds,
    } as const;
}