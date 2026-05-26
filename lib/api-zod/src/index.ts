export * from "./generated/api";

// Re-export tipos generados. `LoginResponse` se omite porque api.ts ya
// exporta el zod schema con el mismo nombre; quien necesite el tipo TS
// puede importarlo directamente desde `./generated/types/loginResponse`.
export type {
  Actividad,
  ActividadesList,
  ActividadEstado,
  ContactoRequest,
  ErrorResponse,
  Evento,
  EventosList,
  GetActividadesParams,
  GetEventosParams,
  GetNoticiasParams,
  HealthStatus,
  InscripcionResponse,
  LoginRequest,
  Noticia,
  NoticiasList,
  Servicio,
  ServiciosList,
  SuccessResponse,
  SugerenciaRequest,
  UserProfile,
  UserProfileRole,
} from "./generated/types";
