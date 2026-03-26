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
import { useEffect } from 'react';

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
  
  const loginMock = async (data: any) => {
    // Simulate network delay
    await new Promise(r => setTimeout(r, 1000));
    setUser(mockUser);
    return { token: 'mock-token', user: mockUser };
  };

  return {
    ...mutation,
    mutate: (vars: any, options?: any) => {
      mutation.mutate(vars, {
        onSuccess: (data) => {
          setUser(data.user);
          options?.onSuccess?.(data);
        },
        onError: () => {
          // Fallback to mock login on failure
          loginMock(vars.data).then(data => options?.onSuccess?.(data));
        }
      });
    }
  };
}
