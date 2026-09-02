import { useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

/** TablePage pagination.searchParams + setSearchParams：挂载快照读 URL，navigate replace 写回，避免 useSearchParams 整树重渲染把表格卸掉 */
const useTablePaginationSearchParams = () => {
  const navigate = useNavigate();
  const searchParamsRef = useRef(null);
  if (searchParamsRef.current === null) {
    searchParamsRef.current = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '');
  }
  const setSearchParams = useCallback(
    (next, opts) => {
      const current = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '');
      const incoming = typeof next === 'function' ? next(current) : next;
      if (incoming && typeof incoming.get === 'function') {
        ['currentPage', 'perPage'].forEach(key => {
          if (incoming.has(key)) {
            current.set(key, incoming.get(key));
          }
        });
      }
      const raw = current.toString();
      navigate({ search: raw ? `?${raw}` : '' }, { replace: opts?.replace !== false });
    },
    [navigate]
  );
  return { searchParams: searchParamsRef.current, setSearchParams };
};

export default useTablePaginationSearchParams;
