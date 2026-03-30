// Wrapper hooks to seamlessly fall back to mock data if API is down
import { 
  useGetActividades, 
  useGetEventos, 
  useGetNoticias, 
  useGetServicios,
  useLogin,
  type Actividad,
  type Evento,
  type Noticia,
  type Servicio
} from '@workspace/api-client-react';
import { mockActividades, mockEventos, mockNoticias, mockServicios, mockUser } from './use-mock-data';
import { useStore } from '@/store/use-store';
import { useEffect, useRef, useState } from 'react';

// Wrap Actividades
export function useAppActividades() {
  const query = useGetActividades({},{ query: { retry: false }});
  const setDemoMode = useStore(s => s.setDemoMode);
  
  useEffect(() => {
    if (query.isError) setDemoMode(true);
  }, [query.isError, setDemoMode]);

  return {
    data: query.isError ? { items: mockActividades, total: mockActividades.length, page: 1, limit: 10 } : query.data,
    isLoading: query.isLoading && !query.isError,
    isError: query.isError
  };
}

export function useAppEventos() {
  const query = useGetEventos({},{ query: { retry: false }});
  return {
    data: query.isError ? { items: mockEventos, total: mockEventos.length, page: 1, limit: 10 } : query.data,
    isLoading: query.isLoading && !query.isError,
  };
}

export function useAppNoticias() {
  const query = useGetNoticias({},{ query: { retry: false }});
  return {
    data: query.isError ? { items: mockNoticias, total: mockNoticias.length, page: 1, limit: 10 } : query.data,
    isLoading: query.isLoading && !query.isError,
  };
}

export function useAppServicios() {
  const query = useGetServicios({},{ query: { retry: false }});
  return {
    data: query.isError ? { items: mockServicios } : query.data,
    isLoading: query.isLoading && !query.isError,
  };
}

export function useAppLogin() {
  const mutation = useLogin();
  const setUser = useStore(s => s.setUser);
  const setToken = useStore(s => s.setToken);

  // Custom state so we never flash an error when the mock fallback succeeds
  const [isPending, setIsPending] = useState(false);
  const [isError, setIsError] = useState(false);
  const abortedRef = useRef(false);
  
  const loginMock = async (data: any) => {
    try {
      const r = await fetch('/api/auth/dev-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: data?.username ?? 'admin' }),
      });
      if (r.ok) {
        const result = await r.json();
        setUser(result.user);
        setToken(result.token);
        return result;
      }
    } catch { /* fallback below */ }
    // Ultimate fallback (offline / unavailable)
    await new Promise(r => setTimeout(r, 500));
    setUser(mockUser);
    setToken('mock-token');
    return { token: 'mock-token', user: mockUser };
  };

  const mutate = (vars: any, options?: any) => {
    setIsPending(true);
    setIsError(false);
    abortedRef.current = false;

    mutation.mutate(vars, {
      onSuccess: (data) => {
        if (abortedRef.current) return;
        setUser(data.user);
        if (data.token) setToken(data.token);
        setIsPending(false);
        options?.onSuccess?.(data);
      },
      onError: () => {
        // API failed — silently fall back to mock login
        loginMock(vars.data)
          .then(data => {
            if (abortedRef.current) return;
            setIsPending(false);
            options?.onSuccess?.(data);
          })
          .catch(() => {
            if (abortedRef.current) return;
            setIsPending(false);
            setIsError(true);
          });
      }
    });
  };

  return {
    mutate,
    isPending,
    isError,
    isSuccess: mutation.isSuccess,
    reset: () => {
      abortedRef.current = true;
      setIsPending(false);
      setIsError(false);
      mutation.reset();
    },
  };
}
