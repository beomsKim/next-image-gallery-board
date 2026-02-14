interface LoadingProps {
    message?: string;
    progress?: number;
    fullscreen?: boolean;
}

export default function Loading({ message = '로딩 중...', progress, fullscreen = true }: LoadingProps) {
    if (!fullscreen) {
        return (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
                <div className="w-10 h-10 border-[3px] border-indigo-600 border-t-transparent rounded-full spinner" />
                <p className="text-sm text-gray-400">{message}</p>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/80 backdrop-blur-sm">
            <div className="flex flex-col items-center gap-4 bg-white rounded-3xl p-8 shadow-soft min-w-[200px]">
                <div className="relative w-14 h-14">
                    <div className="absolute inset-0 border-4 border-indigo-100 rounded-full" />
                    <div className="absolute inset-0 border-4 border-indigo-600 border-t-transparent rounded-full spinner" />
                </div>
                {progress !== undefined && (
                    <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                        <div className="h-full bg-indigo-600 rounded-full transition-all duration-300"
                            style={{ width: `${progress}%` }} />
                    </div>
                )}
                <p className="text-sm font-medium text-gray-600">{message}</p>
                {progress !== undefined && (
                    <p className="text-xs text-gray-400">{progress}%</p>
                )}
            </div>
        </div>
    );
}