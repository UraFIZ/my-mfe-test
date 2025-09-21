import { useEffect, useRef } from 'react';
import { useLazyCurrentUserQuery } from './services/auth-api';
import { clearSession, selectCurrentUser, selectToken } from './store/auth-slice';
import { useAppDispatch, useAppSelector } from './store/hooks';

export const SessionManager: React.FC = () => {
  const token = useAppSelector(selectToken);
  const user = useAppSelector(selectCurrentUser);
  const dispatch = useAppDispatch();
  const [fetchCurrentUser] = useLazyCurrentUserQuery();
  const hasAttempted = useRef(false);

  useEffect(() => {
    if (token && !user && !hasAttempted.current) {
      hasAttempted.current = true;
      fetchCurrentUser()
        .unwrap()
        .catch(() => {
          dispatch(clearSession());
        });
    }
  }, [token, user, fetchCurrentUser, dispatch]);

  useEffect(() => {
    if (!token) {
      hasAttempted.current = false;
    }
  }, [token]);

  return null;
};
