'use client';

export default function GlobalError({ reset }: { reset: () => void }) {
    return (
        <html lang="ko">
            <body style={{ fontFamily: 'sans-serif', background: '#f8fafc', margin: 0 }}>
                <main style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ textAlign: 'center' }}>
                        <p style={{ fontSize: 64, marginBottom: 16 }}>💥</p>
                        <h1 style={{ fontSize: 24, fontWeight: 'bold', marginBottom: 8 }}>심각한 오류가 발생했어요</h1>
                        <p style={{ color: '#9ca3af', marginBottom: 24 }}>페이지를 새로고침하거나 다시 시도해주세요.</p>
                        <button onClick={reset}
                            style={{ background: '#4f46e5', color: 'white', padding: '12px 24px', borderRadius: 12, border: 'none', cursor: 'pointer', fontSize: 15 }}>
                            다시 시도
                        </button>
                    </div>
                </main>
            </body>
        </html>
    );
}