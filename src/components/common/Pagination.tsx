interface PaginationProps {
    currentPage: number;
    totalPages: number;
    onPageChange: (page: number) => void;
    maxButtons?: number;
}

export default function Pagination({
    currentPage,
    totalPages,
    onPageChange,
    maxButtons = 5,
}: PaginationProps) {
    const getPageNumbers = () => {
        const pages: number[] = [];
        const half = Math.floor(maxButtons / 2);

        let start = Math.max(1, currentPage - half);
        let end = Math.min(totalPages, start + maxButtons - 1);

        if (end - start < maxButtons - 1) {
            start = Math.max(1, end - maxButtons + 1);
        }

        for (let i = start; i <= end; i++) {
            pages.push(i);
        }

        return pages;
    };

    const pages = getPageNumbers();

    return (
        <div className="flex items-center justify-center gap-2 mt-8">
            {/* 맨 앞으로 */}
            <button
                onClick={() => onPageChange(1)}
                disabled={currentPage === 1}
                className="px-3 py-2 rounded-lg bg-gray-200 text-gray-700 hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
            >
                ≪
            </button>

            {/* 이전 */}
            <button
                onClick={() => onPageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="px-3 py-2 rounded-lg bg-gray-200 text-gray-700 hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
            >
                ﹤
            </button>

            {/* 페이지 번호 */}
            {pages.map((page) => (
                <button
                    key={page}
                    onClick={() => onPageChange(page)}
                    className={`px-4 py-2 rounded-lg transition-colors ${currentPage === page
                            ? 'bg-primary-600 text-white'
                            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                        }`}
                >
                    {page}
                </button>
            ))}

            {/* 다음 */}
            <button
                onClick={() => onPageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="px-3 py-2 rounded-lg bg-gray-200 text-gray-700 hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
            >
                ﹥
            </button>

            {/* 맨 뒤로 */}
            <button
                onClick={() => onPageChange(totalPages)}
                disabled={currentPage === totalPages}
                className="px-3 py-2 rounded-lg bg-gray-200 text-gray-700 hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
            >
                ≫
            </button>
        </div>
    );
}