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
import { mockActividades, mockEventos, mockNoticias, mockServicios } from './use-mock-data';
import { useStore } from '@/store/use-store';
import { useRef, useState } from 'react';

// Wrap Actividades
export function useAppActividades() {
  const query = useGetActividades({},{ query: { retry: false }});

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
  const [errorMessage, setErrorMessage] = useState('');
  const abortedRef = useRef(false);
  
  const mutate = (vars: any, options?: any) => {
    setIsPending(true);
    setIsError(false);
    setErrorMessage('');
    abortedRef.current = false;

    mutation.mutate(vars, {
      onSuccess: (data) => {
        if (abortedRef.current) return;
        setUser(data.user);
        if (data.token) setToken(data.token);
        setIsPending(false);
        options?.onSuccess?.(data);
      },
      onError: (error: any) => {
        if (abortedRef.current) return;
        const apiMessage = String(
          error?.data?.error ??
          error?.message ??
          (mutation.error as any)?.data?.error ??
          ''
        );
        setIsPending(false);
        setIsError(true);
        setErrorMessage(apiMessage || 'No se pudo iniciar sesión');
      }
    });
  };

  return {
    mutate,
    isPending,
    isError,
    errorMessage,
    isSuccess: mutation.isSuccess,
    reset: () => {
      abortedRef.current = true;
      setIsPending(false);
      setIsError(false);
      setErrorMessage('');
      mutation.reset();
    },
  };
}
