'use client';

import { useState, useEffect } from 'react';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { AdminTabProps } from '@/types/admin';
import { formatDate } from '@/utils/format';

interface WithdrawalRecord {
    id: string;
    email: string;
    nickname: string;
    reasons: string[];
    deletedAt: any;
}

export default function WithdrawalTab({ onToast }: AdminTabProps) {
    const [records, setRecords] = useState<WithdrawalRecord[]>([]);

    useEffect(() => { loadRecords(); }, []);

    const loadRecords = async () => {
        const snap = await getDocs(
            query(collection(db, 'withdrawal_reasons'), orderBy('deletedAt', 'desc'))
        );
        setRecords(snap.docs.map((d) => ({ id: d.id, ...d.data() })) as WithdrawalRecord[]);
    };

    return (
        <div>
            <h2 className="text-lg font-bold mb-4">탈퇴 사유 ({records.length}건)</h2>

            {records.length === 0 ? (
                <div className="text-center py-12">
                    <p className="text-4xl mb-3">📊</p>
                    <p className="text-gray-400 text-sm">탈퇴 기록이 없습니다.</p>
                </div>
            ) : (
                <>
                    {/* 모바일 카드 */}
                    <div className="block sm:hidden space-y-3">
                        {records.map((record) => (
                            <div key={record.id} className="card p-4">
                                <p className="font-semibold text-sm mb-1">{record.nickname}</p>
                                <p className="text-xs text-gray-400 mb-2">{record.email}</p>
                                <div className="flex flex-wrap gap-1 mb-2">
                                    {record.reasons.map((reason, i) => (
                                        <span key={i} className="badge badge-danger text-xs">
                                            {reason}
                                        </span>
                                    ))}
                                </div>
                                <p className="text-xs text-gray-400">
                                    {formatDate(record.deletedAt?.toDate?.() || record.deletedAt)}
                                </p>
                            </div>
                        ))}
                    </div>

                    {/* 데스크톱 테이블 */}
                    <div className="hidden sm:block overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-gray-50 text-gray-500 text-xs">
                                <tr>
                                    <th className="px-4 py-3 text-left rounded-l-xl">닉네임</th>
                                    <th className="px-4 py-3 text-left">이메일</th>
                                    <th className="px-4 py-3 text-left">탈퇴 사유</th>
                                    <th className="px-4 py-3 text-left rounded-r-xl">탈퇴일</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {records.map((record) => (
                                    <tr key={record.id} className="hover:bg-gray-50">
                                        <td className="px-4 py-3 text-xs font-medium">{record.nickname}</td>
                                        <td className="px-4 py-3 text-xs text-gray-500">{record.email}</td>
                                        <td className="px-4 py-3 text-xs">
                                            <div className="flex flex-wrap gap-1">
                                                {record.reasons.map((reason, i) => (
                                                    <span key={i} className="badge badge-danger text-xs">
                                                        {reason}
                                                    </span>
                                                ))}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-xs text-gray-400">
                                            {formatDate(record.deletedAt?.toDate?.() || record.deletedAt)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </>
            )}
        </div>
    );
}