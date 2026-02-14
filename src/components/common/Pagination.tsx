interface PaginationProps {
    currentPage: number;
    totalPages: number;
    onPageChange: (page: number) => void;
    maxButtons?: number;
}

export default function Pagination({
    currentPage, totalPages, onPageChange, maxButtons = 5,
}: PaginationProps) {
    const half = Math.floor(maxButtons / 2);
    let start = Math.max(1, currentPage - half);
    let end = Math.min(totalPages, start + maxButtons - 1);
    if (end - start < maxButtons - 1) start = Math.max(1, end - maxButtons + 1);
    const pages = Array.from({ length: end - start + 1 }, (_, i) => start + i);

    const btnClass = (active: boolean, disabled: boolean) =>
        `px-3 py-2 rounded-lg transition-colors text-sm
     ${disabled ? 'opacity-40 cursor-not-allowed bg-gray-100 text-gray-400' :
            active ? 'bg-primary-600 text-white shadow-sm' :
                'bg-gray-100 text-gray-700 hover:bg-gray-200'}`;

    return (
        <div className="flex items-center justify-center gap-1.5 mt-8">
            <button onClick={() => onPageChange(1)} disabled={currentPage === 1}
                className={btnClass(false, currentPage === 1)}>«</button>
            <button onClick={() => onPageChange(currentPage - 1)} disabled={currentPage === 1}
                className={btnClass(false, currentPage === 1)}>‹</button>
            {pages.map((p) => (
                <button key={p} onClick={() => onPageChange(p)}
                    className={btnClass(p === currentPage, false)}>{p}</button>
            ))}
            <button onClick={() => onPageChange(currentPage + 1)} disabled={currentPage === totalPages}
                className={btnClass(false, currentPage === totalPages)}>›</button>
            <button onClick={() => onPageChange(totalPages)} disabled={currentPage === totalPages}
                className={btnClass(false, currentPage === totalPages)}>»</button>
        </div>
    );
}