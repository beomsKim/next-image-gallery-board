interface LoadingProps {
    progress?: number;
    message?: string;
}

export default function Loading({ progress, message }: LoadingProps) {
    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-8 max-w-sm w-full mx-4">
                {/* 로딩 스피너 */}
                <div className="flex justify-center mb-4">
                    <div className="w-16 h-16 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin"></div>
                </div>

                {/* 프로그레스 바 */}
                {progress !== undefined && (
                    <div className="mb-4">
                        <div className="w-full bg-gray-200 rounded-full h-2.5">
                            <div
                                className="bg-primary-600 h-2.5 rounded-full transition-all duration-300"
                                style={{ width: `${progress}%` }}
                            ></div>
                        </div>
                        <p className="text-center text-sm text-gray-600 mt-2">
                            {progress}%
                        </p>
                    </div>
                )}

                {/* 메시지 */}
                {message && (
                    <p className="text-center text-gray-700">{message}</p>
                )}
            </div>
        </div>
    );
}