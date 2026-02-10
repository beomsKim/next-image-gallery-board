'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from './useAuth';

export const useAdminCheck = () => {
    const router = useRouter();
    const { user, loading } = useAuth();

    useEffect(() => {
        if (!loading && (!user || !user.isAdmin)) {
            alert('관리자만 접근할 수 있습니다.');
            router.push('/');
        }
    }, [user, loading, router]);

    return { user, loading };
};