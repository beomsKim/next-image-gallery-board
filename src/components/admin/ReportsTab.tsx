'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { collection, getDocs, query, orderBy, updateDoc, doc, deleteDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { AdminTabProps } from '@/types/admin';
import { formatDate } from '@/utils/format';

interface Report {
    id: string;
    postId: string;
    postTitle: string;
    reporterId: string;
    reporterNickname: string;
    reason: string;
    etcContent?: string;
    status: 'pending' | 'processing' | 'resolved' | 'dismissed';
    createdAt: any;
}

export default function ReportsTab({ onToast }: AdminTabProps) {
    const router = useRouter();
    const [reports, setReports] = useState<Report[]>([]);

    useEffect(() => { loadReports(); }, []);

    const loadReports = async () => {
        const snap = await getDocs(query(collection(db, 'reports'), orderBy('createdAt', 'desc')));
        setReports(snap.docs.map((d) => ({ id: d.id, ...d.data() })) as Report[]);
    };

    const handleReportAction = async (reportId: string, status: 'processing' | 'resolved' | 'dismissed' | 'pending') => {
        await updateDoc(doc(db, 'reports', reportId), { status });
        const msg = {
            processing: '처리 중으로 변경됐습니다.',
            resolved: '처리 완료됐습니다.',
            dismissed: '기각됐습니다.',
            pending: '미처리로 되돌렸습니다.',
        }[status];
        onToast({ message: msg, type: 'success' });
        loadReports();
    };

    const handleDeleteReport = async (reportId: string) => {
        if (!confirm('신고 기록을 삭제하시겠습니까?')) return;
        await deleteDoc(doc(db, 'reports', reportId));
        onToast({ message: '삭제됐습니다.', type: 'success' });
        loadReports();
    };

    return (
        <div>
            <h2 className="text-lg font-bold mb-4">
                🚨 신고 목록
                <span className="ml-2 text-sm font-normal text-red-500">
                    미처리 {reports.filter((r) => r.status === 'pending').length}건
                </span>
            </h2>

            {reports.length === 0 ? (
                <div className="text-center py-12">
                    <p className="text-4xl mb-3">✅</p>
                    <p className="text-gray-400 text-sm">신고가 없습니다.</p>
                </div>
            ) : (
                <>
                    {/* 모바일 카드 */}
                    <div className="block sm:hidden space-y-3">
                        {reports.map((report) => (
                            <div
                                key={report.id}
                                className={`border rounded-2xl p-4
                  ${report.status === 'pending' ? 'border-red-200 bg-red-50' :
                                        report.status === 'processing' ? 'border-amber-200 bg-amber-50' :
                                            'border-gray-100 bg-white'}`}
                            >
                                <div className="flex justify-between items-start mb-2 gap-2">
                                    <div className="min-w-0">
                                        <p className="font-semibold text-sm truncate">{report.postTitle}</p>
                                        <p className="text-xs text-gray-400 mt-0.5">
                                            신고자: {report.reporterNickname}
                                        </p>
                                    </div>
                                    <StatusBadge status={report.status} />
                                </div>

                                <div className="bg-white rounded-xl px-3 py-2 mb-2 border border-gray-100">
                                    <p className="text-xs font-medium text-gray-700">{report.reason}</p>
                                    {report.etcContent && (
                                        <p className="text-xs text-gray-500 mt-1 whitespace-pre-wrap">
                                            {report.etcContent}
                                        </p>
                                    )}
                                </div>

                                <div className="flex flex-wrap gap-2">
                                    <button
                                        onClick={() => router.push(`/posts/${report.postId}`)}
                                        className="text-xs bg-gray-100 text-gray-600 px-3 py-1.5 rounded-lg">
                                        게시글 보기
                                    </button>
                                    {report.status !== 'processing' && (
                                        <button
                                            onClick={() => handleReportAction(report.id, 'processing')}
                                            className="text-xs bg-amber-100 text-amber-700 px-3 py-1.5 rounded-lg font-medium">
                                            처리 중
                                        </button>
                                    )}
                                    {report.status !== 'resolved' && (
                                        <button
                                            onClick={() => handleReportAction(report.id, 'resolved')}
                                            className="text-xs bg-indigo-100 text-indigo-700 px-3 py-1.5 rounded-lg font-medium">
                                            처리 완료
                                        </button>
                                    )}
                                    {report.status !== 'dismissed' && (
                                        <button
                                            onClick={() => handleReportAction(report.id, 'dismissed')}
                                            className="text-xs bg-gray-100 text-gray-500 px-3 py-1.5 rounded-lg font-medium">
                                            기각
                                        </button>
                                    )}
                                    {report.status === 'resolved' && (
                                        <button
                                            onClick={() => handleReportAction(report.id, 'pending')}
                                            className="text-xs bg-orange-100 text-orange-600 px-3 py-1.5 rounded-lg font-medium">
                                            완료 취소
                                        </button>
                                    )}
                                    <button
                                        onClick={() => handleDeleteReport(report.id)}
                                        className="text-xs bg-red-50 text-red-500 px-3 py-1.5 rounded-lg font-medium">
                                        삭제
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* 데스크톱 테이블 */}
                    <div className="hidden sm:block overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-gray-50 text-gray-500 text-xs">
                                <tr>
                                    <th className="px-4 py-3 text-left rounded-l-xl">게시글</th>
                                    <th className="px-4 py-3 text-left">신고자</th>
                                    <th className="px-4 py-3 text-left">사유 / 기타내용</th>
                                    <th className="px-4 py-3 text-center">상태</th>
                                    <th className="px-4 py-3 text-center rounded-r-xl">작업</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {reports.map((report) => (
                                    <tr
                                        key={report.id}
                                        className={
                                            report.status === 'pending' ? 'bg-red-50' :
                                                report.status === 'processing' ? 'bg-amber-50' :
                                                    'hover:bg-gray-50'
                                        }
                                    >
                                        <td className="px-4 py-3 max-w-[160px] truncate text-xs font-medium">
                                            {report.postTitle}
                                        </td>
                                        <td className="px-4 py-3 text-xs text-gray-500">
                                            {report.reporterNickname}
                                        </td>
                                        <td className="px-4 py-3 text-xs max-w-[200px]">
                                            <p className="font-medium text-gray-700">{report.reason}</p>
                                            {report.etcContent && (
                                                <p className="text-gray-400 mt-0.5 line-clamp-2">{report.etcContent}</p>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            <StatusBadge status={report.status} />
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex flex-col gap-1 items-center">
                                                {report.status !== 'processing' && (
                                                    <button
                                                        onClick={() => handleReportAction(report.id, 'processing')}
                                                        className="text-[11px] text-amber-600 hover:underline whitespace-nowrap">
                                                        처리 중
                                                    </button>
                                                )}
                                                {report.status !== 'resolved' && (
                                                    <button
                                                        onClick={() => handleReportAction(report.id, 'resolved')}
                                                        className="text-[11px] text-indigo-600 hover:underline whitespace-nowrap">
                                                        처리 완료
                                                    </button>
                                                )}
                                                {report.status === 'resolved' && (
                                                    <button
                                                        onClick={() => handleReportAction(report.id, 'pending')}
                                                        className="text-[11px] text-orange-500 hover:underline whitespace-nowrap">
                                                        완료 취소
                                                    </button>
                                                )}
                                                {report.status !== 'dismissed' && (
                                                    <button
                                                        onClick={() => handleReportAction(report.id, 'dismissed')}
                                                        className="text-[11px] text-gray-400 hover:underline whitespace-nowrap">
                                                        기각
                                                    </button>
                                                )}
                                                <button
                                                    onClick={() => handleDeleteReport(report.id)}
                                                    className="text-[11px] text-red-400 hover:underline whitespace-nowrap">
                                                    삭제
                                                </button>
                                            </div>
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

function StatusBadge({ status }: { status: string }) {
    const config: Record<string, { label: string; className: string }> = {
        pending: { label: '미처리', className: 'bg-red-100 text-red-600' },
        processing: { label: '처리 중', className: 'bg-amber-100 text-amber-700' },
        resolved: { label: '처리완료', className: 'bg-green-100 text-green-600' },
        dismissed: { label: '기각', className: 'bg-gray-100 text-gray-500' },
    };
    const c = config[status] || config.pending;
    return (
        <span className={`text-[10px] px-2 py-1 rounded-full font-bold whitespace-nowrap ${c.className}`}>
            {c.label}
        </span>
    );
}