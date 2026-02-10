'use client';

import { useState, useEffect, useCallback } from 'react';
import {
    collection,
    query,
    where,
    orderBy,
    limit,
    startAfter,
    getDocs,
    QueryConstraint,
    DocumentData,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface UseInfiniteScrollOptions {
    collectionName: string;
    pageSize: number;
    orderByField?: string;
    orderDirection?: 'asc' | 'desc';
    whereConditions?: QueryConstraint[];
}

export const useInfiniteScroll = <T extends DocumentData>({
    collectionName,
    pageSize,
    orderByField = 'createdAt',
    orderDirection = 'desc',
    whereConditions = [],
}: UseInfiniteScrollOptions) => {
    const [items, setItems] = useState<T[]>([]);
    const [loading, setLoading] = useState(false);
    const [hasMore, setHasMore] = useState(true);
    const [lastDoc, setLastDoc] = useState<any>(null);
    const [page, setPage] = useState(0);

    const loadMore = useCallback(async () => {
        if (loading || !hasMore) return;

        setLoading(true);

        try {
            const constraints: QueryConstraint[] = [
                ...whereConditions,
                orderBy(orderByField, orderDirection),
                limit(pageSize),
            ];

            if (lastDoc) {
                constraints.push(startAfter(lastDoc));
            }

            const q = query(collection(db, collectionName), ...constraints);
            const snapshot = await getDocs(q);

            if (snapshot.empty) {
                setHasMore(false);
                return;
            }

            // const newItems = snapshot.docs.map((doc) => ({
            //     id: doc.id,
            //     ...doc.data(),
            // })) as T[];
            const newItems = snapshot.docs.map((doc) => ({
                id: doc.id,
                ...doc.data(),
            })) as unknown as T[];

            setItems((prev) => [...prev, ...newItems]);
            setLastDoc(snapshot.docs[snapshot.docs.length - 1]);
            setPage((prev) => prev + 1);

            if (snapshot.docs.length < pageSize) {
                setHasMore(false);
            }
        } catch (error) {
            console.error('데이터 로드 실패:', error);
        } finally {
            setLoading(false);
        }
    }, [collectionName, pageSize, orderByField, orderDirection, whereConditions, lastDoc, loading, hasMore]);

    const reset = useCallback(() => {
        setItems([]);
        setLastDoc(null);
        setPage(0);
        setHasMore(true);
    }, []);

    // 초기 로드
    useEffect(() => {
        loadMore();
    }, []);

    return {
        items,
        loading,
        hasMore,
        page,
        loadMore,
        reset,
    };
};