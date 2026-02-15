import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const size = { width: 1200, height: 630 };

export default async function OGImage({ params }: { params: { id: string } }) {
    return new ImageResponse(
        (
            <div style={{
                background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
                width: '100%', height: '100%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
                <div style={{ color: 'white', fontSize: 60, fontWeight: 'bold' }}>
                    🖼 갤러리
                </div>
            </div>
        ),
        { ...size }
    );
}