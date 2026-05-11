--
-- PostgreSQL database dump
--

\restrict noOIMXRMwLF2vY0S0shG0saATvdXbPJmuglc9xGtQK13gN0YnNfOJV1b1R1MWWC

-- Dumped from database version 17.9 (Ubuntu 17.9-0ubuntu0.25.10.1)
-- Dumped by pg_dump version 17.9 (Ubuntu 17.9-0ubuntu0.25.10.1)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--

-- *not* creating schema, since initdb creates it


--
-- Name: pgcrypto; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA public;


--
-- Name: EXTENSION pgcrypto; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION pgcrypto IS 'cryptographic functions';


--
-- Name: set_updated_at_db_hojas_informativas(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.set_updated_at_db_hojas_informativas() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: db_actividad_detalle; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.db_actividad_detalle (
    id integer NOT NULL,
    actividad_id integer,
    slug character varying(50) NOT NULL,
    monitor character varying(255),
    monitor_eu character varying(255),
    horario_detalle text,
    calendario text,
    estado character varying(30) DEFAULT 'prevista'::character varying,
    precio_inscripcion numeric(10,2) DEFAULT 0,
    participantes text,
    memoria text,
    proxima_fecha date,
    foto_url text,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


--
-- Name: db_actividad_detalle_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.db_actividad_detalle_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: db_actividad_detalle_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.db_actividad_detalle_id_seq OWNED BY public.db_actividad_detalle.id;


--
-- Name: db_actividades; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.db_actividades (
    id integer NOT NULL,
    odoo_id integer,
    nombre character varying(255) NOT NULL,
    nombre_eu character varying(255),
    descripcion text,
    descripcion_eu text,
    categoria character varying(100),
    horario character varying(255),
    plazas_total integer DEFAULT 0,
    plazas_disponibles integer DEFAULT 0,
    precio numeric(10,2) DEFAULT 0,
    estado character varying(20) DEFAULT 'disponible'::character varying,
    foto_url text,
    odoo_synced_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


--
-- Name: db_actividades_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.db_actividades_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: db_actividades_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.db_actividades_id_seq OWNED BY public.db_actividades.id;


--
-- Name: db_articulos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.db_articulos (
    id integer NOT NULL,
    titulo character varying(255) NOT NULL,
    titulo_eu character varying(255),
    pdf_url text,
    descripcion text,
    descripcion_eu text,
    categoria character varying(100),
    anio integer,
    mes integer,
    estado character varying(20) DEFAULT 'borrador'::character varying,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


--
-- Name: db_articulos_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.db_articulos_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: db_articulos_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.db_articulos_id_seq OWNED BY public.db_articulos.id;


--
-- Name: db_cargos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.db_cargos (
    id integer NOT NULL,
    codigo character varying(100) NOT NULL,
    nombre character varying(255) NOT NULL,
    nombre_eu character varying(255),
    ambito character varying(30) DEFAULT 'directivo'::character varying NOT NULL,
    activo integer DEFAULT 1 NOT NULL,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


--
-- Name: db_cargos_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.db_cargos_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: db_cargos_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.db_cargos_id_seq OWNED BY public.db_cargos.id;


--
-- Name: db_config; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.db_config (
    clave character varying(100) NOT NULL,
    valor text,
    descripcion text,
    updated_at timestamp without time zone DEFAULT now()
);


--
-- Name: db_equipo; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.db_equipo (
    id integer NOT NULL,
    nombre character varying(255) NOT NULL,
    cargo character varying(255),
    cargo_eu character varying(255),
    tipo character varying(50) DEFAULT 'directivo'::character varying,
    grupo character varying(100),
    foto_url text,
    orden integer DEFAULT 0,
    activo boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: db_equipo_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.db_equipo_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: db_equipo_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.db_equipo_id_seq OWNED BY public.db_equipo.id;


--
-- Name: db_eventos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.db_eventos (
    id integer NOT NULL,
    odoo_id integer,
    nombre character varying(255) NOT NULL,
    nombre_eu character varying(255),
    descripcion text,
    descripcion_eu text,
    fecha_inicio timestamp without time zone NOT NULL,
    fecha_fin timestamp without time zone,
    lugar character varying(255),
    plazas_total integer DEFAULT 0,
    plazas_disponibles integer DEFAULT 0,
    precio numeric(10,2) DEFAULT 0,
    estado character varying(20) DEFAULT 'borrador'::character varying,
    foto_url text,
    odoo_synced_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


--
-- Name: db_eventos_fotos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.db_eventos_fotos (
    id integer NOT NULL,
    tipo_evento character varying(20) NOT NULL,
    evento_id integer NOT NULL,
    subitem_id integer,
    tipo_media character varying(20) DEFAULT 'foto'::character varying,
    url text NOT NULL,
    nombre_archivo character varying(500),
    mime_type character varying(100),
    orden integer DEFAULT 0,
    descripcion text,
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: db_eventos_fotos_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.db_eventos_fotos_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: db_eventos_fotos_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.db_eventos_fotos_id_seq OWNED BY public.db_eventos_fotos.id;


--
-- Name: db_eventos_full; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.db_eventos_full (
    id integer NOT NULL,
    odoo_id integer,
    tipo character varying(30) DEFAULT 'excursion'::character varying NOT NULL,
    estado character varying(30) DEFAULT 'prevista'::character varying NOT NULL,
    nombre character varying(255) NOT NULL,
    nombre_eu character varying(255),
    descripcion text,
    descripcion_eu text,
    fecha_inicio date,
    fecha_fin date,
    fecha_fin_inscripcion date,
    precio_inscripcion numeric(10,2),
    precio_suplemento numeric(10,2),
    subacts_inscripcion text,
    subacts_suplemento text,
    lugar character varying(500),
    menu text,
    bus1 character varying(255),
    bus2 character varying(255),
    hora_regreso character varying(10),
    plazas_total integer DEFAULT 0,
    plazas_disponibles integer DEFAULT 0,
    foto_url text,
    memoria_participantes text,
    resumen text,
    extra jsonb,
    publicado boolean DEFAULT false,
    created_by integer,
    odoo_synced_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


--
-- Name: db_eventos_full_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.db_eventos_full_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: db_eventos_full_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.db_eventos_full_id_seq OWNED BY public.db_eventos_full.id;


--
-- Name: db_eventos_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.db_eventos_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: db_eventos_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.db_eventos_id_seq OWNED BY public.db_eventos.id;


--
-- Name: db_eventos_media; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.db_eventos_media (
    id integer NOT NULL,
    evento_id integer NOT NULL,
    subact_id integer,
    tipo_media character varying(20) DEFAULT 'foto'::character varying,
    url text NOT NULL,
    nombre_archivo character varying(500),
    mime_type character varying(100),
    tamano_bytes integer,
    orden integer DEFAULT 0,
    descripcion text,
    descripcion_eu text,
    subido_por integer,
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: db_eventos_media_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.db_eventos_media_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: db_eventos_media_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.db_eventos_media_id_seq OWNED BY public.db_eventos_media.id;


--
-- Name: db_eventos_subacts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.db_eventos_subacts (
    id integer NOT NULL,
    evento_id integer NOT NULL,
    orden integer DEFAULT 1 NOT NULL,
    nombre character varying(255),
    nombre_eu character varying(255),
    foto_url text,
    memoria text,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


--
-- Name: db_eventos_subacts_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.db_eventos_subacts_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: db_eventos_subacts_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.db_eventos_subacts_id_seq OWNED BY public.db_eventos_subacts.id;


--
-- Name: db_excursiones; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.db_excursiones (
    id integer NOT NULL,
    nombre character varying(255) NOT NULL,
    nombre_eu character varying(255),
    descripcion text,
    descripcion_eu text,
    destino character varying(255),
    fecha date,
    fecha_regreso date,
    lugar_comida text,
    menu text,
    precio numeric(10,2) DEFAULT 0,
    plazas_total integer DEFAULT 0,
    plazas_disponibles integer DEFAULT 0,
    paradas_bus text,
    estado character varying(30) DEFAULT 'prevista'::character varying,
    foto_urls text,
    memoria text,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    foto_url text,
    precio_inscripcion numeric(10,2),
    precio_suplemento numeric(10,2),
    subacts_inscripcion text,
    subacts_suplemento text,
    fecha_fin_inscripcion date,
    bus1 character varying(255),
    bus2 character varying(255),
    hora_regreso character varying(10),
    observaciones text,
    memoria_participantes text,
    resumen text,
    publicado boolean DEFAULT false
);


--
-- Name: db_excursiones_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.db_excursiones_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: db_excursiones_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.db_excursiones_id_seq OWNED BY public.db_excursiones.id;


--
-- Name: db_excursiones_subacts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.db_excursiones_subacts (
    id integer NOT NULL,
    excursion_id integer NOT NULL,
    orden integer DEFAULT 1 NOT NULL,
    nombre character varying(255),
    nombre_eu character varying(255),
    foto_url text,
    memoria text,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


--
-- Name: db_excursiones_subacts_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.db_excursiones_subacts_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: db_excursiones_subacts_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.db_excursiones_subacts_id_seq OWNED BY public.db_excursiones_subacts.id;


--
-- Name: db_fiestas; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.db_fiestas (
    id integer NOT NULL,
    nombre character varying(255) NOT NULL,
    nombre_eu character varying(255),
    descripcion text,
    descripcion_eu text,
    fecha date,
    lugar character varying(500),
    foto_url text,
    programa text,
    memoria text,
    plazas_total integer DEFAULT 0,
    plazas_disponibles integer DEFAULT 0,
    estado character varying(30) DEFAULT 'proxima'::character varying,
    publicado boolean DEFAULT false,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    menu text,
    bus1 character varying(255),
    bus2 character varying(255),
    hora_inicio character varying(10),
    hora_fin character varying(10),
    precio numeric(10,2) DEFAULT 0
);


--
-- Name: db_fiestas_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.db_fiestas_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: db_fiestas_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.db_fiestas_id_seq OWNED BY public.db_fiestas.id;


--
-- Name: db_galeria; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.db_galeria (
    id integer NOT NULL,
    titulo character varying(255) NOT NULL,
    titulo_eu character varying(255),
    descripcion text,
    imagen_url text NOT NULL,
    miniatura_url text,
    categoria character varying(100),
    tema character varying(50),
    anio integer,
    mes integer,
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: db_galeria_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.db_galeria_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: db_galeria_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.db_galeria_id_seq OWNED BY public.db_galeria.id;


--
-- Name: db_grupos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.db_grupos (
    id integer NOT NULL,
    nombre character varying(255) NOT NULL,
    nombre_eu character varying(255),
    delegado_id integer,
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: db_grupos_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.db_grupos_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: db_grupos_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.db_grupos_id_seq OWNED BY public.db_grupos.id;


--
-- Name: db_historico_cargos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.db_historico_cargos (
    id integer NOT NULL,
    socio_id integer NOT NULL,
    cargo_id integer NOT NULL,
    fecha_inicio date NOT NULL,
    fecha_fin date,
    descripcion text,
    descripcion_eu text,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


--
-- Name: db_historico_cargos_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.db_historico_cargos_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: db_historico_cargos_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.db_historico_cargos_id_seq OWNED BY public.db_historico_cargos.id;


--
-- Name: db_hojas_informativas; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.db_hojas_informativas (
    id integer NOT NULL,
    titulo character varying(255) NOT NULL,
    titulo_eu character varying(255),
    estado character varying(20) DEFAULT 'borrador'::character varying,
    publicado_por integer,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    anio integer,
    mes integer,
    dia integer,
    descripcion text,
    descripcion_eu text,
    foto_url text,
    pdf_url text
);


--
-- Name: db_hojas_informativas_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.db_hojas_informativas_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: db_hojas_informativas_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.db_hojas_informativas_id_seq OWNED BY public.db_hojas_informativas.id;


--
-- Name: db_inscripciones; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.db_inscripciones (
    id integer NOT NULL,
    socio_id integer,
    evento_id integer,
    actividad_id integer,
    tipo character varying(20) NOT NULL,
    estado character varying(30) DEFAULT 'pendiente'::character varying,
    parada_bus character varying(255),
    subactividad character varying(255),
    observaciones text,
    fecha_inscripcion timestamp without time zone DEFAULT now(),
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    CONSTRAINT db_inscripciones_tipo_check CHECK (((tipo)::text = ANY (ARRAY[('evento'::character varying)::text, ('actividad'::character varying)::text, ('fiesta'::character varying)::text, ('excursion'::character varying)::text, ('viaje'::character varying)::text])))
);


--
-- Name: db_inscripciones_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.db_inscripciones_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: db_inscripciones_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.db_inscripciones_id_seq OWNED BY public.db_inscripciones.id;


--
-- Name: db_nosotros; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.db_nosotros (
    id integer NOT NULL,
    seccion character varying(50) NOT NULL,
    titulo character varying(255),
    contenido text,
    pdf_url text,
    orden integer DEFAULT 0,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


--
-- Name: db_nosotros_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.db_nosotros_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: db_nosotros_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.db_nosotros_id_seq OWNED BY public.db_nosotros.id;


--
-- Name: db_noticias; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.db_noticias (
    id integer NOT NULL,
    titulo character varying(255) NOT NULL,
    titulo_eu character varying(255),
    categoria character varying(100) DEFAULT 'General'::character varying,
    fecha date NOT NULL,
    resumen text,
    resumen_eu text,
    contenido text NOT NULL,
    contenido_eu text,
    imagenes_json text,
    publicado boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


--
-- Name: db_noticias_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.db_noticias_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: db_noticias_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.db_noticias_id_seq OWNED BY public.db_noticias.id;


--
-- Name: db_pagos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.db_pagos (
    id integer NOT NULL,
    odoo_id integer,
    socio_id integer,
    inscripcion_id integer,
    concepto character varying(255) NOT NULL,
    importe numeric(10,2) NOT NULL,
    metodo character varying(50),
    estado character varying(30) DEFAULT 'pendiente'::character varying,
    fecha_pago timestamp without time zone,
    referencia character varying(100),
    odoo_synced_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


--
-- Name: db_pagos_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.db_pagos_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: db_pagos_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.db_pagos_id_seq OWNED BY public.db_pagos.id;


--
-- Name: db_pulunpe; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.db_pulunpe (
    id integer NOT NULL,
    titulo character varying(255) NOT NULL,
    titulo_eu character varying(255),
    pdf_url text,
    descripcion text,
    anio integer,
    mes integer,
    estado character varying(20) DEFAULT 'borrador'::character varying,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    foto_url text,
    descripcion_eu text
);


--
-- Name: db_pulunpe_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.db_pulunpe_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: db_pulunpe_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.db_pulunpe_id_seq OWNED BY public.db_pulunpe.id;


--
-- Name: db_socios; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.db_socios (
    id integer NOT NULL,
    odoo_id integer,
    nombre character varying(255) NOT NULL,
    apellidos character varying(255),
    email character varying(255),
    telefono character varying(50),
    direccion text,
    dni character varying(20),
    fecha_nacimiento date,
    fecha_alta date,
    numero_socio character varying(50),
    genero character(1),
    estado character varying(20) DEFAULT 'activo'::character varying,
    grupo_id integer,
    avatar_url text,
    odoo_synced_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    grupo_id_fk integer,
    poblacion character varying(255),
    provincia character varying(255),
    fecha_fallecimiento date,
    tipologia character varying(30),
    usuario_id integer,
    tipo_socio character varying(30) DEFAULT 'ordinario'::character varying,
    membership_estado character varying(50),
    membership_desde date,
    membership_hasta date,
    membership_cuota numeric(10,2)
);


--
-- Name: db_socios_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.db_socios_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: db_socios_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.db_socios_id_seq OWNED BY public.db_socios.id;


--
-- Name: db_sugerencias; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.db_sugerencias (
    id integer NOT NULL,
    socio_id integer,
    categoria character varying(100),
    texto text NOT NULL,
    estado character varying(30) DEFAULT 'pendiente'::character varying,
    respuesta text,
    fecha_respuesta timestamp without time zone,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


--
-- Name: db_sugerencias_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.db_sugerencias_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: db_sugerencias_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.db_sugerencias_id_seq OWNED BY public.db_sugerencias.id;


--
-- Name: db_sync_log; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.db_sync_log (
    id integer NOT NULL,
    modelo character varying(100) NOT NULL,
    operacion character varying(50) NOT NULL,
    registros_procesados integer DEFAULT 0,
    errores integer DEFAULT 0,
    mensaje text,
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: db_sync_log_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.db_sync_log_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: db_sync_log_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.db_sync_log_id_seq OWNED BY public.db_sync_log.id;


--
-- Name: db_users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.db_users (
    id integer NOT NULL,
    odoo_uid integer NOT NULL,
    socio_id integer,
    username character varying(255) NOT NULL,
    nombre character varying(255) NOT NULL,
    email character varying(255),
    rol character varying(50) DEFAULT 'usuario'::character varying,
    avatar_url text,
    ultimo_acceso timestamp without time zone,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    apellidos character varying(255),
    telefono character varying(50),
    password_hash text
);


--
-- Name: db_users_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.db_users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: db_users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.db_users_id_seq OWNED BY public.db_users.id;


--
-- Name: db_viajes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.db_viajes (
    id integer NOT NULL,
    nombre character varying(255) NOT NULL,
    nombre_eu character varying(255),
    descripcion text,
    descripcion_eu text,
    destinos text,
    fecha_inicio date,
    fecha_fin date,
    alojamiento text,
    precio numeric(10,2) DEFAULT 0,
    plazas_total integer DEFAULT 0,
    plazas_disponibles integer DEFAULT 0,
    estado character varying(30) DEFAULT 'previsto'::character varying,
    foto_urls text,
    memoria text,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    foto_url text,
    precio_inscripcion numeric(10,2),
    precio_suplemento numeric(10,2),
    fecha_fin_inscripcion date,
    bus1 character varying(255),
    bus2 character varying(255),
    publicado boolean DEFAULT false,
    observaciones text,
    memoria_participantes text,
    resumen text,
    itinerario text
);


--
-- Name: db_viajes_dias; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.db_viajes_dias (
    id integer NOT NULL,
    viaje_id integer NOT NULL,
    dia integer DEFAULT 1 NOT NULL,
    titulo character varying(255),
    titulo_eu character varying(255),
    descripcion text,
    foto_url text,
    memoria text,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


--
-- Name: db_viajes_dias_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.db_viajes_dias_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: db_viajes_dias_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.db_viajes_dias_id_seq OWNED BY public.db_viajes_dias.id;


--
-- Name: db_viajes_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.db_viajes_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: db_viajes_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.db_viajes_id_seq OWNED BY public.db_viajes.id;


--
-- Name: db_actividad_detalle id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.db_actividad_detalle ALTER COLUMN id SET DEFAULT nextval('public.db_actividad_detalle_id_seq'::regclass);


--
-- Name: db_actividades id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.db_actividades ALTER COLUMN id SET DEFAULT nextval('public.db_actividades_id_seq'::regclass);


--
-- Name: db_articulos id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.db_articulos ALTER COLUMN id SET DEFAULT nextval('public.db_articulos_id_seq'::regclass);


--
-- Name: db_cargos id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.db_cargos ALTER COLUMN id SET DEFAULT nextval('public.db_cargos_id_seq'::regclass);


--
-- Name: db_equipo id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.db_equipo ALTER COLUMN id SET DEFAULT nextval('public.db_equipo_id_seq'::regclass);


--
-- Name: db_eventos id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.db_eventos ALTER COLUMN id SET DEFAULT nextval('public.db_eventos_id_seq'::regclass);


--
-- Name: db_eventos_fotos id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.db_eventos_fotos ALTER COLUMN id SET DEFAULT nextval('public.db_eventos_fotos_id_seq'::regclass);


--
-- Name: db_eventos_full id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.db_eventos_full ALTER COLUMN id SET DEFAULT nextval('public.db_eventos_full_id_seq'::regclass);


--
-- Name: db_eventos_media id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.db_eventos_media ALTER COLUMN id SET DEFAULT nextval('public.db_eventos_media_id_seq'::regclass);


--
-- Name: db_eventos_subacts id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.db_eventos_subacts ALTER COLUMN id SET DEFAULT nextval('public.db_eventos_subacts_id_seq'::regclass);


--
-- Name: db_excursiones id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.db_excursiones ALTER COLUMN id SET DEFAULT nextval('public.db_excursiones_id_seq'::regclass);


--
-- Name: db_excursiones_subacts id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.db_excursiones_subacts ALTER COLUMN id SET DEFAULT nextval('public.db_excursiones_subacts_id_seq'::regclass);


--
-- Name: db_fiestas id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.db_fiestas ALTER COLUMN id SET DEFAULT nextval('public.db_fiestas_id_seq'::regclass);


--
-- Name: db_galeria id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.db_galeria ALTER COLUMN id SET DEFAULT nextval('public.db_galeria_id_seq'::regclass);


--
-- Name: db_grupos id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.db_grupos ALTER COLUMN id SET DEFAULT nextval('public.db_grupos_id_seq'::regclass);


--
-- Name: db_historico_cargos id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.db_historico_cargos ALTER COLUMN id SET DEFAULT nextval('public.db_historico_cargos_id_seq'::regclass);


--
-- Name: db_hojas_informativas id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.db_hojas_informativas ALTER COLUMN id SET DEFAULT nextval('public.db_hojas_informativas_id_seq'::regclass);


--
-- Name: db_inscripciones id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.db_inscripciones ALTER COLUMN id SET DEFAULT nextval('public.db_inscripciones_id_seq'::regclass);


--
-- Name: db_nosotros id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.db_nosotros ALTER COLUMN id SET DEFAULT nextval('public.db_nosotros_id_seq'::regclass);


--
-- Name: db_noticias id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.db_noticias ALTER COLUMN id SET DEFAULT nextval('public.db_noticias_id_seq'::regclass);


--
-- Name: db_pagos id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.db_pagos ALTER COLUMN id SET DEFAULT nextval('public.db_pagos_id_seq'::regclass);


--
-- Name: db_pulunpe id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.db_pulunpe ALTER COLUMN id SET DEFAULT nextval('public.db_pulunpe_id_seq'::regclass);


--
-- Name: db_socios id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.db_socios ALTER COLUMN id SET DEFAULT nextval('public.db_socios_id_seq'::regclass);


--
-- Name: db_sugerencias id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.db_sugerencias ALTER COLUMN id SET DEFAULT nextval('public.db_sugerencias_id_seq'::regclass);


--
-- Name: db_sync_log id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.db_sync_log ALTER COLUMN id SET DEFAULT nextval('public.db_sync_log_id_seq'::regclass);


--
-- Name: db_users id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.db_users ALTER COLUMN id SET DEFAULT nextval('public.db_users_id_seq'::regclass);


--
-- Name: db_viajes id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.db_viajes ALTER COLUMN id SET DEFAULT nextval('public.db_viajes_id_seq'::regclass);


--
-- Name: db_viajes_dias id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.db_viajes_dias ALTER COLUMN id SET DEFAULT nextval('public.db_viajes_dias_id_seq'::regclass);


--
-- Data for Name: db_actividad_detalle; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.db_actividad_detalle (id, actividad_id, slug, monitor, monitor_eu, horario_detalle, calendario, estado, precio_inscripcion, participantes, memoria, proxima_fecha, foto_url, created_at, updated_at) FROM stdin;
1	1	yoga	Amaia Larrea	Amaia Larrea	Lunes y Miércoles 10:00-11:00h	Todo el año salvo agosto y festivos	en_curso	0.00	María G., José M., Ana F., Luis G., Carmen L., Pedro R., Marta S., Juan P., Elena K., Rosa B.	\N	\N	\N	2026-03-30 06:56:47.543133	2026-03-30 06:56:47.543133
2	2	senderismo	Jon Eguia	Jon Eguia	Sábados 9:00-13:00h	Primer y tercer sábado de cada mes	abierta	5.00	\N	\N	\N	\N	2026-03-30 06:56:47.543133	2026-03-30 06:56:47.543133
3	3	informatica	Begoña Urrutia	Begoña Urrutia	Martes y Jueves 16:00-17:30h	Septiembre a junio	en_curso	0.00	Ana F., Luis G., Carmen L., Pedro R., Marta S., Juan P.	\N	\N	\N	2026-03-30 06:56:47.543133	2026-03-30 06:56:47.543133
4	4	pintura	Iñaki Garitano	Iñaki Garitano	Viernes 10:00-12:00h	Todo el año	en_curso	10.00	María G., Ana F., Elena K., Rosa B., Carmen V., Lola P., Mikel A., Ane T., Gorka L., Jon E., Amaia Z., Patxi U.	\N	\N	\N	2026-03-30 06:56:47.543133	2026-03-30 06:56:47.543133
5	5	idiomas	Sarah Johnson	Sarah Johnson	Lunes y Jueves 11:00-12:00h	Octubre a junio	abierta	15.00	\N	\N	\N	\N	2026-03-30 06:56:47.543133	2026-03-30 06:56:47.543133
\.


--
-- Data for Name: db_actividades; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.db_actividades (id, odoo_id, nombre, nombre_eu, descripcion, descripcion_eu, categoria, horario, plazas_total, plazas_disponibles, precio, estado, foto_url, odoo_synced_at, created_at, updated_at) FROM stdin;
2	\N	Senderismo	Mendizaletasuna	Rutas por los alrededores del municipio	Udalerriko ibilaldiak	Deporte	Sábados 9:00-13:00	30	12	0.00	disponible	\N	\N	2026-03-30 06:50:37.756593	2026-03-30 06:50:37.756593
3	\N	Informática básica	Oinarrizko informatika	Aprende a usar el ordenador y el móvil	Ordenagailua eta mugikorra erabiltzen ikasi	Formación	Martes y Jueves 16:00-17:30	15	3	0.00	disponible	\N	\N	2026-03-30 06:50:37.756593	2026-03-30 06:50:37.756593
4	\N	Pintura	Margolaritza	Taller de pintura creativa	Margolari tailer sortzailea	Cultura	Viernes 10:00-12:00	12	0	0.00	lista_espera	\N	\N	2026-03-30 06:50:37.756593	2026-03-30 06:50:37.756593
5	\N	Idiomas: Inglés	Hizkuntzak: Ingelesa	Inglés para principiantes	Ingelesa hasiberrientzat	Formación	Lunes y Jueves 11:00-12:00	15	5	0.00	disponible	\N	\N	2026-03-30 06:50:37.756593	2026-03-30 06:50:37.756593
6	\N	Cocina saludable	Sukalde osasuntsua	Talleres de cocina mediterránea	Sukalde mediterraneoaren tailerrak	Salud	Miércoles 17:00-19:00	10	4	0.00	disponible	\N	\N	2026-03-30 06:50:37.756593	2026-03-30 06:50:37.756593
7	\N	Gimnasia	Gimnasia	Ejercicios físicos adaptados para mantener la movilidad y la fuerza	Mugikortasuna eta indarra mantentzeko gorputz-ariketa moldatuak	Salud	Martes y Viernes 9:30-10:30h	25	8	0.00	en_curso	\N	\N	2026-03-30 06:56:47.543133	2026-03-30 06:56:47.543133
9	\N	Mus	Mus	Torneo y partidas de mus, el juego de cartas tradicional vasco	Mus txapelketa eta partida, euskal karta-joko tradizionala	Cultura	Jueves y Sábado 16:00-19:00h	40	12	0.00	abierta	\N	\N	2026-03-30 06:56:47.543133	2026-03-30 06:56:47.543133
1	\N	Yoga	Yoga	Clases de yoga para todos los niveles	Yoga klaseak maila guztientzat	Salud	Lunes y Miércoles 10:00-11:00	20	6	0.00	disponible	\N	\N	2026-03-30 06:50:37.756593	2026-04-16 11:03:29.197
10	\N	Gimnasio	GimnasiokoK			kIROLA	16:00-17:00	10	8	10.00	abierta	/uploads/actividades/actividad-1776328222822-e30fcee7-57e2-491c-9c89-e3074db234d0.png	\N	2026-04-16 10:28:19.265752	2026-04-17 07:04:14.493
8	\N	Tai Chi	Tai Chi	El taichi para mayores es una disciplina terapéutica basada en movimientos lentos, fluidos y conscientes, acompañados de respiración profunda y meditación, a menudo llamada "meditación en movimiento". Es un ejercicio seguro de bajo impacto que mejora el equilibrio, la fuerza, la flexibilidad y la agilidad mental, reduciendo el riesgo de caídas. \nAspectos clave del Taichi para la tercera edad:\n\n    Enfoque en la salud: Se centra en la circulación energética (qi), la coordinación y la relajación en lugar de la fuerza física intensa.\n    Seguridad: Los ejercicios siguen la "regla del 70%", animando a realizar movimientos dentro de un rango cómodo y sin dolor.\n    Beneficios principales: Mejora el equilibrio, reduce el estrés y la ansiedad, fortalece músculos y articulaciones, y mejora la calidad del sueño.\n    Formato de práctica: Se practica preferiblemente en grupo, lo que fomenta la socialización, y combina movimientos suaves con atención plena.\n    Meditación en movimiento: Ayuda a calmar la mente y mejorar la concentración, conectando la respiración con cada postura. \n\nEs considerado uno de los mejores ejercicios físicos probados por la ciencia para adultos mayores, ideal para personas con rigidez o dolores articulares	Adinekoentzako tai chi mugimendu motel, fluido eta kontzienteetan oinarritutako diziplina terapeutikoa da, arnasketa sakon eta meditazioarekin batera, askotan "mugimendu meditazioa" deitzen dena. Ariketa seguru eta inpaktu txikikoa da, oreka, indarra, malgutasuna eta bizkortasun mentala hobetzen dituena, erortzeko arriskua murriztuz.\n\n\nAdinekoentzako tai chi-ren alderdi nagusiak:\n\n\nOsasunean zentratzen da: Energiaren fluxuan (qi), koordinazioan eta erlaxazioan zentratzen da, indar fisiko bizian baino gehiago.\n\n\nSegurtasuna: Ariketek "% 70eko araua" jarraitzen dute, mugimenduak eroso eta minik gabeko tarte batean sustatuz.\n\n\nOnura nagusiak: Oreka hobetzen du, estresa eta antsietatea murrizten ditu, muskuluak eta artikulazioak indartzen ditu eta loaren kalitatea hobetzen du.\n\n\nPraktika formatua: Taldean praktikatzen da hobe, sozializazioa sustatzen duena eta mugimendu leunak arreta osoaz konbinatzen dituena.\n\n\nMugimendu meditazioa: Adimena lasaitzen eta kontzentrazioa hobetzen laguntzen du, arnasketa postura bakoitzarekin lotuz.\n\n\nAdinekoentzako zientifikoki frogatutako ariketa fisiko onenetakotzat hartzen da, zurruntasuna edo artikulazioetako mina duten pertsonentzat aproposa.	Salud	Miércoles 12:00-13:00h	16	12	5.00	abierta	/uploads/actividades/actividad-1776322177212-3b8d40c8-07b4-42d0-8b7b-bea00d15dbb9.png	\N	2026-03-30 06:56:47.543133	2026-04-16 11:04:34.788
11	5	Culture	\N	\N	\N	Activity	\N	0	0	0.00	disponible	\N	2026-04-27 12:31:04.996	2026-04-27 14:31:05.000216	2026-04-27 14:31:05.000216
12	6	Music	\N	\N	\N	Activity	\N	0	0	0.00	disponible	\N	2026-04-27 12:31:05.001	2026-04-27 14:31:05.003129	2026-04-27 14:31:05.003129
13	7	Sport	\N	\N	\N	Activity	\N	0	0	0.00	disponible	\N	2026-04-27 12:31:05.003	2026-04-27 14:31:05.004502	2026-04-27 14:31:05.004502
14	8	Online	\N	\N	\N	Type	\N	0	0	0.00	disponible	\N	2026-04-27 12:31:05.005	2026-04-27 14:31:05.005887	2026-04-27 14:31:05.005887
15	9	Conference	\N	\N	\N	Type	\N	0	0	0.00	disponible	\N	2026-04-27 12:31:05.006	2026-04-27 14:31:05.00801	2026-04-27 14:31:05.00801
16	1	5-10	\N	\N	\N	Age	\N	0	0	0.00	disponible	\N	2026-04-27 12:31:05.008	2026-04-27 14:31:05.009594	2026-04-27 14:31:05.009594
17	2	10-14	\N	\N	\N	Age	\N	0	0	0.00	disponible	\N	2026-04-27 12:31:05.009	2026-04-27 14:31:05.010848	2026-04-27 14:31:05.010848
18	3	15-18	\N	\N	\N	Age	\N	0	0	0.00	disponible	\N	2026-04-27 12:31:05.011	2026-04-27 14:31:05.01184	2026-04-27 14:31:05.01184
19	4	18+	\N	\N	\N	Age	\N	0	0	0.00	disponible	\N	2026-04-27 12:31:05.012	2026-04-27 14:31:05.013096	2026-04-27 14:31:05.013096
\.


--
-- Data for Name: db_articulos; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.db_articulos (id, titulo, titulo_eu, pdf_url, descripcion, descripcion_eu, categoria, anio, mes, estado, created_at, updated_at) FROM stdin;
1	Manual de Políticas Sociales: Envejecimiento Activo, Género y Corresponsabilidad	Gizarte Politikaren Eskuliburua: Zahartze Aktiboa, Generoa eta Erantzukizun Bateratua	/uploads/articulos/pdf-1776147781030-f42fddc8-4ee6-4113-a97d-15c9d25aae39.pdf	{"fotoUrl":"/uploads/articulos/foto-1776147781032-89740578-99ac-4aeb-b14b-2dce291aa545.png","pdfUrlEs":"/uploads/articulos/pdf-1776147781030-f42fddc8-4ee6-4113-a97d-15c9d25aae39.pdf","pdfUrlEu":"/uploads/articulos/pdf-1776147781031-737b19ce-711a-426a-9a47-8cc461c1859f.pdf"}	{"fotoUrl":"/uploads/articulos/foto-1776147781032-89740578-99ac-4aeb-b14b-2dce291aa545.png","pdfUrlEs":"/uploads/articulos/pdf-1776147781030-f42fddc8-4ee6-4113-a97d-15c9d25aae39.pdf","pdfUrlEu":"/uploads/articulos/pdf-1776147781031-737b19ce-711a-426a-9a47-8cc461c1859f.pdf"}	General	2026	4	publicado	2026-04-14 08:23:01.044101	2026-04-14 08:23:01.044101
2	Vivifrail, Guía de Prescripción	Vivifrail, Errezeta Gida	/uploads/articulos/pdf-1776153335128-6fd605f0-8b4f-40e3-a783-1dab73cba777.pdf	{"fotoUrl":"/uploads/articulos/foto-1776153335142-57dbb4bb-afb2-4e1d-aa6f-63cc841e4c56.png","pdfUrlEs":"/uploads/articulos/pdf-1776153335128-6fd605f0-8b4f-40e3-a783-1dab73cba777.pdf","pdfUrlEu":"/uploads/articulos/pdf-1776153335136-39b483e7-5c02-4b48-bec9-f2aa9ed09d35.pdf"}	{"fotoUrl":"/uploads/articulos/foto-1776153335142-57dbb4bb-afb2-4e1d-aa6f-63cc841e4c56.png","pdfUrlEs":"/uploads/articulos/pdf-1776153335128-6fd605f0-8b4f-40e3-a783-1dab73cba777.pdf","pdfUrlEu":"/uploads/articulos/pdf-1776153335136-39b483e7-5c02-4b48-bec9-f2aa9ed09d35.pdf"}	Acividad Física	2026	4	publicado	2026-04-14 09:55:35.160598	2026-04-14 09:55:35.160598
\.


--
-- Data for Name: db_cargos; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.db_cargos (id, codigo, nombre, nombre_eu, ambito, activo, created_at, updated_at) FROM stdin;
1	fundador	Fundador/a	Sortzailea	fundador	1	2026-04-15 10:00:24.107902	2026-04-15 10:00:24.107902
2	presidencia	Presidencia	Presidentzia	directivo	1	2026-04-15 10:00:24.107902	2026-04-15 10:00:24.107902
3	vicepresidencia	Vicepresidencia	Presidenteordetza	directivo	1	2026-04-15 10:00:24.107902	2026-04-15 10:00:24.107902
4	secretaria	Secretaria	Idazkaria	directivo	1	2026-04-15 10:00:24.107902	2026-04-15 10:00:24.107902
5	tesoreria	Tesoreria	Diruzaintza	directivo	1	2026-04-15 10:00:24.107902	2026-04-15 10:00:24.107902
7	delegado_zona	Delegado/a de zona	Zona ordezkaria	delegado	1	2026-04-15 10:00:24.107902	2026-04-15 10:00:24.107902
6	vocal	Vocal	Kidea	directivo	1	2026-04-15 10:00:24.107902	2026-04-24 09:24:14.724
\.


--
-- Data for Name: db_config; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.db_config (clave, valor, descripcion, updated_at) FROM stdin;
sync_socios_enabled	true	Activar sincronización de socios con Odoo	2026-03-30 06:42:41.677166
sync_eventos_enabled	true	Activar sincronización de eventos con Odoo	2026-03-30 06:42:41.677166
sync_actividades_enabled	true	Activar sincronización de actividades con Odoo	2026-03-30 06:42:41.677166
sync_pagos_enabled	true	Activar sincronización de pagos con Odoo	2026-03-30 06:42:41.677166
sync_interval_minutes	60	Intervalo de sincronización en minutos	2026-03-30 06:42:41.677166
app_nombre	Denok Bat	Nombre de la aplicación	2026-03-30 06:42:41.677166
app_nombre_eu	Denok Bat	Nombre en euskara	2026-03-30 06:42:41.677166
actividad.8.card_text_eu	Adinekoentzako tai chi mugimendu motel, fluido eta kontzienteetan oinarritutako diziplina terapeutikoa da, arnasketa sakon eta meditazioarekin batera, askotan "mugimendu meditazioa" deitzen dena. Ariketa seguru eta inpaktu txikikoa da, oreka, indarra, malgutasuna eta bizkortasun mentala hobetzen dituena, erortzeko arriskua murriztuz.\n\n\nAdinekoentzako tai chi-ren alderdi nagusiak:\n\n\nOsasunean zentratzen da: Energiaren fluxuan (qi), koordinazioan eta erlaxazioan zentratzen da, indar fisiko bizian baino gehiago.\n\n\nSegurtasuna: Ariketek "% 70eko araua" jarraitzen dute, mugimenduak eroso eta minik gabeko tarte batean sustatuz.\n\n\nOnura nagusiak: Oreka hobetzen du, estresa eta antsietatea murrizten ditu, muskuluak eta artikulazioak indartzen ditu eta loaren kalitatea hobetzen du.\n\n\nPraktika formatua: Taldean praktikatzen da hobe, sozializazioa sustatzen duena eta mugimendu leunak arreta osoaz konbinatzen dituena.\n\n\nMugimendu meditazioa: Adimena lasaitzen eta kontzentrazioa hobetzen laguntzen du, arnasketa postura bakoitzarekin lotuz.\n\n\nAdinekoentzako zientifikoki frogatutako ariketa fisiko onenetakotzat hartzen da, zurruntasuna edo artikulazioetako mina duten pertsonentzat aproposa.	\N	2026-04-16 10:21:37.177
actividad.8.calendar_text		\N	2026-04-16 10:21:37.177
actividad.8.calendar_text_eu		\N	2026-04-16 10:21:37.178
actividad.8.schedule_text_eu		\N	2026-04-16 10:21:37.179
actividad.8.calendar_start_month		\N	2026-04-16 10:21:37.179
actividad.8.calendar_days_json	["2026-05-06","2026-05-13","2026-05-20","2026-05-25"]	\N	2026-04-16 10:21:37.179
footer.logo_text	Bienvenido a Denok Bat. Disfruta de actividades, eventos y servicios pensados para tu bienestar. Agradeceremos tus sugerencias que nos ayudarán a mejorar	\N	2026-04-15 06:18:10.098
home.hero_title	ASOCIACIÓN DENOK BAT ELKARTEA	\N	2026-04-14 11:03:44.537
home.hero_subtitle	Asociación de las personas jubiladas de Anue, Atetz, Basaburua, Imotz, Lantz, Odieta y Ultzama	\N	2026-04-14 11:03:44.546
home.hero_subtitle_eu	Anue, Atetz, Basaburua, Imotz, Lantz, Odieta eta Ultzamako jubilatuen elkartea	\N	2026-04-14 11:03:44.551
home.hero_image	data:image/jpeg;base64,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	\N	2026-04-14 11:03:44.557
footer.logo_text_eu	Ongi etorria Denok Bat-era. Gozatu zure ongizaterako diseinatutako jarduera, ekitaldi eta zerbitzuez. Zure iradokizunak ongi etorriak dira, hobetzen lagunduko digutelako.	\N	2026-04-15 06:18:10.109
footer.contact.address	San Pedro, 2-1º  \n31797 - Larraintzar(NA)	\N	2026-04-15 06:18:10.114
footer.contact.phone	948305353	\N	2026-04-15 06:18:10.119
footer.contact.email	info@denokbat.org	\N	2026-04-15 06:18:10.123
footer.contact.whatsapp	621191311	\N	2026-04-15 06:18:10.128
footer.contact.hours	Lun–Vie / Asl–Osr: 9:00–14:00	\N	2026-04-15 06:18:10.133
footer.contact.map_embed	<iframe src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d2918.9039467576818!2d-1.6923226233478716!3d42.98029697114196!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0xd50f1000f6706e3%3A0x5c2fcd1e730630c7!2sAsociaci%C3%B3n%20Denok%20Bat%20Elkartea!5e0!3m2!1ses!2ses!4v1776233836983!5m2!1ses!2ses" width="600" height="450" style="border:0;" allowfullscreen="" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>	\N	2026-04-15 06:18:10.137
actividad.10.calendar_start_month		\N	2026-04-17 06:40:58.862
actividad.10.card_text		\N	2026-04-17 06:40:58.859
actividad.10.card_text_eu		\N	2026-04-17 06:40:58.86
actividad.10.calendar_text		\N	2026-04-17 06:40:58.861
actividad.10.calendar_text_eu		\N	2026-04-17 06:40:58.861
actividad.10.schedule_text_eu		\N	2026-04-17 06:40:58.862
actividad.10.calendar_days_json	["2026-04-20","2026-04-27","2026-05-04","2026-05-11","2026-05-18","2026-05-25","2026-06-01","2026-06-08","2026-06-15","2026-06-22","2026-06-29","2026-07-13","2026-07-20","2026-07-27","2026-09-07","2026-09-14","2026-09-21","2026-09-28","2026-10-05","2026-10-19","2026-10-26","2026-11-02","2026-11-09","2026-11-16","2026-11-23","2026-11-30","2026-12-07","2026-12-14"]	\N	2026-04-17 06:40:58.863
actividad.10.monitor_nombre		\N	2026-04-17 06:40:58.863
actividad.10.monitor_nif		\N	2026-04-17 06:40:58.864
actividad.10.monitor_direccion		\N	2026-04-17 06:40:58.864
actividad.10.monitor_telefono		\N	2026-04-17 06:40:58.866
actividad.10.monitor_email		\N	2026-04-17 06:40:58.866
actividad.10.local_nombre		\N	2026-04-17 06:40:58.867
actividad.8.card_text	El taichi para mayores es una disciplina terapéutica basada en movimientos lentos, fluidos y conscientes, acompañados de respiración profunda y meditación, a menudo llamada "meditación en movimiento". Es un ejercicio seguro de bajo impacto que mejora el equilibrio, la fuerza, la flexibilidad y la agilidad mental, reduciendo el riesgo de caídas. \nAspectos clave del Taichi para la tercera edad:\n\n    Enfoque en la salud: Se centra en la circulación energética (qi), la coordinación y la relajación en lugar de la fuerza física intensa.\n    Seguridad: Los ejercicios siguen la "regla del 70%", animando a realizar movimientos dentro de un rango cómodo y sin dolor.\n    Beneficios principales: Mejora el equilibrio, reduce el estrés y la ansiedad, fortalece músculos y articulaciones, y mejora la calidad del sueño.\n    Formato de práctica: Se practica preferiblemente en grupo, lo que fomenta la socialización, y combina movimientos suaves con atención plena.\n    Meditación en movimiento: Ayuda a calmar la mente y mejorar la concentración, conectando la respiración con cada postura. \n\nEs considerado uno de los mejores ejercicios físicos probados por la ciencia para adultos mayores, ideal para personas con rigidez o dolores articulares	\N	2026-04-16 10:21:37.175
actividad.10.local_ubicacion		\N	2026-04-17 06:40:58.868
actividad.10.local_concesor_nombre		\N	2026-04-17 06:40:58.869
actividad.10.local_concesor_telefono		\N	2026-04-17 06:40:58.869
actividad.10.local_concesor_email		\N	2026-04-17 06:40:58.87
actividad.10.local_contrato_pdf_url		\N	2026-04-17 06:40:58.871
actividad.10.facturas_monitor_json	[]	\N	2026-04-17 06:40:58.871
\.


--
-- Data for Name: db_equipo; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.db_equipo (id, nombre, cargo, cargo_eu, tipo, grupo, foto_url, orden, activo, created_at) FROM stdin;
1	María Etxebarria	Presidenta	Presidentea	directivo	\N	\N	1	t	2026-03-30 06:56:59.694179
2	Jose Aguirre	Vicepresidente	Presidenteordea	directivo	\N	\N	2	t	2026-03-30 06:56:59.694179
3	Ana Goikoetxea	Secretaria	Idazkaria	directivo	\N	\N	3	t	2026-03-30 06:56:59.694179
4	Luis Zabala	Tesorero	Diruzaina	directivo	\N	\N	4	t	2026-03-30 06:56:59.694179
5	Ane Larrinaga	Vocal de Actividades	Jardueretako Bozeramailea	directivo	\N	\N	5	t	2026-03-30 06:56:59.694179
6	Mikel Uriarte	Vocal de Eventos	Ekitaldietako Bozeramailea	directivo	\N	\N	6	t	2026-03-30 06:56:59.694179
7	Elena Bilbao	Delegada Zona Norte	Ipar Zonako Ordezkaria	delegado	\N	\N	7	t	2026-03-30 06:56:59.694179
8	Pedro Iturriaga	Delegado Zona Sur	Hego Zonako Ordezkaria	delegado	\N	\N	8	t	2026-03-30 06:56:59.694179
9	Carmen Zubizarreta	Delegada Zona Este	Ekialde Zonako Ordezkaria	delegado	\N	\N	9	t	2026-03-30 06:56:59.694179
\.


--
-- Data for Name: db_eventos; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.db_eventos (id, odoo_id, nombre, nombre_eu, descripcion, descripcion_eu, fecha_inicio, fecha_fin, lugar, plazas_total, plazas_disponibles, precio, estado, foto_url, odoo_synced_at, created_at, updated_at) FROM stdin;
1	\N	Fiesta de Primavera	Udaberriko Jaia	Gran celebración anual de primavera con música y baile tradicional	Udaberriko ospakizun handia musika eta dantza tradizionalarekin	2026-04-15 10:00:00	2026-04-15 20:00:00	Plaza Mayor	200	200	0.00	publicado	\N	\N	2026-03-30 06:50:33.576003	2026-03-30 06:50:33.576003
2	\N	Excursión a Donostia	Donostiako Irteera	Visita cultural a San Sebastián con visita al museo	Kulturaldia San Sebastianen museora bisita eginez	2026-05-10 08:00:00	2026-05-10 20:00:00	Autobús desde sede	45	45	15.00	publicado	\N	\N	2026-03-30 06:50:33.576003	2026-03-30 06:50:33.576003
3	\N	Conferencia: Salud y Bienestar	Hitzaldia: Osasuna eta Ongizatea	Charla con expertos en medicina y nutrición para mayores	Adinekoentzako medikuntza eta nutrizioan adituak	2026-04-28 16:00:00	2026-04-28 18:00:00	Sala de actos, sede central	80	80	0.00	publicado	\N	\N	2026-03-30 06:50:33.576003	2026-03-30 06:50:33.576003
4	\N	Taller de Tecnología	Teknologia Tailerra	Aprende a usar smartphone y aplicaciones útiles	Ikasi telefono adimenduna eta aplikazio erabilgarriak erabiltzen	2026-05-05 10:00:00	2026-05-05 12:00:00	Aula informática	15	15	0.00	publicado	\N	\N	2026-03-30 06:50:33.576003	2026-03-30 06:50:33.576003
5	\N	Almuerzo de Hermandad	Anaiarteko Bazkaria	Encuentro anual de todos los socios con comida tradicional vasca	Bazkide guztien urteko topaketa euskal janari tradizionalarekin	2026-06-20 13:00:00	2026-06-20 17:00:00	Restaurante Kaia	120	120	25.00	publicado	\N	\N	2026-03-30 06:50:33.576003	2026-03-30 06:50:33.576003
6	2	Great Reno Ballon Race	\N	<section class="s_text_block">\n            <h5>Join us for this 24 hours Event</h5>\n            <p>Every year we invite our community, partners and end-users to come and meet us! It's the ideal event to get together and present new features, roadmap of future versions, achievements of the software, workshops, training sessions, etc...\n            This event is also an opportunity to showcase our partners' case studies, methodology or developments. Be there and see directly from the source the features of the new version!</p>\n        </section>	\N	2026-06-19 18:15:00	2026-06-19 22:30:00	Reno Airfield	0	0	0.00	publicado	\N	2026-04-27 12:31:05.023	2026-04-27 14:31:05.025968	2026-04-27 14:31:05.025968
7	4	Live Music Festival	\N	<section class="s_text_block">\n            <h5>Join us for this 24 hours Event</h5>\n            <p>Every year we invite our community, partners and end-users to come and meet us! It's the ideal event to get together and present new features, roadmap of future versions, achievements of the software, workshops, training sessions, etc...\n            This event is also an opportunity to showcase our partners' case studies, methodology or developments. Be there and see directly from the source the features of the new version!</p>\n        </section>	\N	2026-07-19 18:15:00	2026-07-21 22:30:00	Wembley Stadium	0	0	0.00	publicado	\N	2026-04-27 12:31:05.027	2026-04-27 14:31:05.027731	2026-04-27 14:31:05.027731
8	6	Hockey Tournament	\N	<section class="s_text_block">\n            <h5>Join us for this 24 hours Event</h5>\n            <p>Every year we invite our community, partners and end-users to come and meet us! It's the ideal event to get together and present new features, roadmap of future versions, achievements of the software, workshops, training sessions, etc...\n            This event is also an opportunity to showcase our partners' case studies, methodology or developments. Be there and see directly from the source the features of the new version!</p>\n        </section>	\N	2027-03-16 08:00:00	2027-03-17 16:00:00	Wembley Stadium	0	0	0.00	publicado	\N	2026-04-27 12:31:05.028	2026-04-27 14:31:05.028826	2026-04-27 14:31:05.028826
\.


--
-- Data for Name: db_eventos_fotos; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.db_eventos_fotos (id, tipo_evento, evento_id, subitem_id, tipo_media, url, nombre_archivo, mime_type, orden, descripcion, created_at) FROM stdin;
\.


--
-- Data for Name: db_eventos_full; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.db_eventos_full (id, odoo_id, tipo, estado, nombre, nombre_eu, descripcion, descripcion_eu, fecha_inicio, fecha_fin, fecha_fin_inscripcion, precio_inscripcion, precio_suplemento, subacts_inscripcion, subacts_suplemento, lugar, menu, bus1, bus2, hora_regreso, plazas_total, plazas_disponibles, foto_url, memoria_participantes, resumen, extra, publicado, created_by, odoo_synced_at, created_at, updated_at) FROM stdin;
1	\N	excursion	proxima	Donostia y el Peine del Viento	Donostia eta Haizearen Orrazia	Visita cultural a San Sebastián con paseo por la Parte Vieja y visita al Peine del Viento de Chillida.	\N	2026-05-10	\N	\N	18.00	\N	\N	\N	\N	\N	Sede Central 08:00	Calle Mayor 08:15	20:00	45	32	\N	\N	\N	\N	t	\N	\N	2026-03-30 10:32:44.926836	2026-03-30 10:32:44.926836
2	\N	excursion	prevista	Laguardia y Bodegas Ysios	Laguardia eta Ysios Bodegak	La medieval Laguardia con visita a la bodega Ysios diseñada por Calatrava.	\N	2026-06-14	\N	\N	25.00	\N	\N	\N	\N	\N	Sede Central 08:30	Calle Mayor 08:45	20:30	48	48	\N	\N	\N	\N	t	\N	\N	2026-03-30 10:32:44.926836	2026-03-30 10:32:44.926836
3	\N	excursion	prevista	Pamplona medieval	Erdi Aroko Iruñea	Casco histórico, ciudadela y Museo de Navarra.	\N	2026-07-19	\N	\N	22.00	\N	\N	\N	\N	\N	Sede Central 07:45		20:00	50	50	\N	\N	\N	\N	f	\N	\N	2026-03-30 10:32:44.926836	2026-03-30 10:32:44.926836
4	\N	excursion	realizada	Bilbao: Guggenheim y Casco Viejo	Bilbao: Guggenheim eta Alde Zaharra	Visita guiada al Guggenheim Bilbao y paseo por el casco viejo con pintxos.	\N	2026-03-08	\N	\N	12.00	\N	\N	\N	\N	\N	Sede Central 09:00	Polideportivo 09:15	20:00	55	0	\N	\N	\N	\N	t	\N	\N	2026-03-30 10:32:44.926836	2026-03-30 10:32:44.926836
\.


--
-- Data for Name: db_eventos_media; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.db_eventos_media (id, evento_id, subact_id, tipo_media, url, nombre_archivo, mime_type, tamano_bytes, orden, descripcion, descripcion_eu, subido_por, created_at) FROM stdin;
\.


--
-- Data for Name: db_eventos_subacts; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.db_eventos_subacts (id, evento_id, orden, nombre, nombre_eu, foto_url, memoria, created_at, updated_at) FROM stdin;
1	1	1	Visita al Peine del Viento	Haizearen Orrazia bisita	\N	\N	2026-03-30 10:32:48.980031	2026-03-30 10:32:48.980031
2	1	2	Paseo por la Parte Vieja	Alde Zaharreko pasealdia	\N	\N	2026-03-30 10:32:48.980031	2026-03-30 10:32:48.980031
3	1	3	Comida en Kaia-Kaipe	Bazkaria Kaia-Kaipe-n	\N	\N	2026-03-30 10:32:48.980031	2026-03-30 10:32:48.980031
4	1	4	Tiempo libre en el Boulevard	Denbora librea Boulevardean	\N	\N	2026-03-30 10:32:48.980031	2026-03-30 10:32:48.980031
\.


--
-- Data for Name: db_excursiones; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.db_excursiones (id, nombre, nombre_eu, descripcion, descripcion_eu, destino, fecha, fecha_regreso, lugar_comida, menu, precio, plazas_total, plazas_disponibles, paradas_bus, estado, foto_urls, memoria, created_at, updated_at, foto_url, precio_inscripcion, precio_suplemento, subacts_inscripcion, subacts_suplemento, fecha_fin_inscripcion, bus1, bus2, hora_regreso, observaciones, memoria_participantes, resumen, publicado) FROM stdin;
1	Donostia y el Peine del Viento	Donostia eta Haizearen Orrazia	Visita cultural a San Sebastián con paseo por la Parte Vieja y visita al Peine del Viento de Chillida	Kulturaldia San Sebastianen Alde Zaharra eta Chillida-ren Haizearen Orrazia ikusiz	San Sebastián (Gipuzkoa)	2026-05-10	\N	Restaurante Kaia-Kaipe	Menú degustación pintxos + postre + vino	18.00	50	32	Sede Central 08:00, Calle Mayor 08:15, Polideportivo 08:25	proxima	\N	\N	2026-03-30 06:56:51.576629	2026-03-30 06:56:51.576629	\N	18.00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	t
2	Laguardia y Bodegas Ysios	Laguardia eta Ysios Bodegak	Excursión a la medieval Laguardia con visita a la bodega Ysios diseñada por Calatrava	Erdi Aroko Laguardiari bisita Calatravak diseinatutako Ysios upategirekin	Laguardia (Álava)	2026-06-14	\N	Restaurante El Bodegón	Comida típica alavesa + cata de vinos	25.00	45	45	Sede Central 08:30, Calle Mayor 08:45	prevista	\N	\N	2026-03-30 06:56:51.576629	2026-03-30 06:56:51.576629	\N	25.00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	t
3	Pamplona medieval	Erdi Aroko Iruñea	Un día en Pamplona conociendo su casco histórico, la ciudadela y el Museo de Navarra	Egun bat Iruñean bere hiri historikoa, gotorlekua eta Nafarroako Museoa ezagutuz	Pamplona (Navarra)	2026-07-19	\N	Restaurante Túbal	Menú navarro completo	22.00	48	48	Sede Central 07:45, Calle Mayor 08:00, Polideportivo 08:10	prevista	\N	\N	2026-03-30 06:56:51.576629	2026-03-30 06:56:51.576629	\N	22.00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	t
4	Bilbao: Guggenheim y Casco Viejo	Bilbao: Guggenheim eta Alde Zaharra	Visita guiada al Guggenheim Bilbao y paseo por el casco viejo con pintxos	Guggenheim Bilbaoko bisita gidatua eta Alde Zaharreko pasealdia pintxoekin	Bilbao (Bizkaia)	2026-03-08	\N	Siete Calles	Pintxos en el Casco Viejo	12.00	55	0	Sede Central 09:00, Polideportivo 09:15	realizada	\N	\N	2026-03-30 06:56:51.576629	2026-03-30 06:56:51.576629	\N	12.00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	t
5	Donostia y el Peine del Viento	Donostia eta Haizearen Orrazia	Visita cultural a San Sebastián con paseo por la Parte Vieja y el Peine del Viento de Chillida.	\N	\N	2026-05-10	\N	\N	\N	0.00	45	32	\N	proxima	\N	\N	2026-03-30 10:39:14.947705	2026-03-30 10:39:14.947705	\N	18.00	\N	\N	\N	\N	Sede Central 08:00	Calle Mayor 08:15	20:00	\N	\N	\N	t
6	Laguardia y Bodegas Ysios	Laguardia eta Ysios Bodegak	La medieval Laguardia con visita a la bodega Ysios diseñada por Calatrava.	\N	\N	2026-06-14	\N	\N	\N	0.00	48	48	\N	prevista	\N	\N	2026-03-30 10:39:14.947705	2026-03-30 10:39:14.947705	\N	25.00	\N	\N	\N	\N	Sede Central 08:30	Calle Mayor 08:45	20:30	\N	\N	\N	t
7	Pamplona medieval	Erdi Aroko Iruñea	Casco histórico, ciudadela y Museo de Navarra.	\N	\N	2026-07-19	\N	\N	\N	0.00	50	50	\N	prevista	\N	\N	2026-03-30 10:39:14.947705	2026-03-30 10:39:14.947705	\N	22.00	\N	\N	\N	\N	Sede Central 07:45	\N	20:00	\N	\N	\N	f
8	Bilbao: Guggenheim y Casco Viejo	Bilbao: Guggenheim eta Alde Zaharra	Visita guiada al Guggenheim Bilbao y paseo por el casco viejo con pintxos.	\N	\N	2026-03-08	\N	\N	\N	0.00	55	0	\N	realizada	\N	\N	2026-03-30 10:39:14.947705	2026-03-30 10:39:14.947705	\N	12.00	\N	\N	\N	\N	Sede Central 09:00	Polideportivo 09:15	20:00	\N	\N	\N	t
9	San Martin de Unx	San Martin de Unx	\N	\N	\N	2026-04-22	\N	\N	\N	0.00	0	0	\N	prevista	\N	\N	2026-04-07 13:48:07.264272	2026-04-07 13:48:07.264272	\N	40.00	15.00	1, 2 y 4	3	2026-04-12	\N	\N	\N	\N	\N	\N	t
\.


--
-- Data for Name: db_excursiones_subacts; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.db_excursiones_subacts (id, excursion_id, orden, nombre, nombre_eu, foto_url, memoria, created_at, updated_at) FROM stdin;
1	9	1	Autobus	\N	\N	\N	2026-04-07 13:48:07.267721	2026-04-07 13:48:07.267721
2	9	2	Iglesia	\N	\N	\N	2026-04-07 13:48:07.267721	2026-04-07 13:48:07.267721
3	9	3	Bodega	\N	\N	\N	2026-04-07 13:48:07.267721	2026-04-07 13:48:07.267721
4	9	4	Comida	\N	\N	\N	2026-04-07 13:48:07.267721	2026-04-07 13:48:07.267721
\.


--
-- Data for Name: db_fiestas; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.db_fiestas (id, nombre, nombre_eu, descripcion, descripcion_eu, fecha, lugar, foto_url, programa, memoria, plazas_total, plazas_disponibles, estado, publicado, created_at, updated_at, menu, bus1, bus2, hora_inicio, hora_fin, precio) FROM stdin;
3	Día de Santa Águeda 2026	Santa Ageda Eguna 2026	Celebración tradicional con coros que recorren el pueblo cantando y recaudando para los jubilados. Acaba con bazkari tradicional en la sede.	Ospakizun tradizionala herriko kaleak zeharkatzen dituzten abeslari taldeekin. Egoitzan ohiko bazkaria egiten da amaieran.	2026-02-04	Casco histórico y Sede social	\N	\N	Participaron 87 socios y familiares. Los coros recorrieron 12 calles del casco histórico bajo una mañana luminosa. La recaudación ascendió a 430€. El bazkari fue un éxito con el bacalao al pil-pil como plato estrella.	0	0	realizada	t	2026-03-30 10:50:41.5493	2026-03-30 10:50:41.5493	Bazkari tradicional: alubias, morcilla, chorizo + vino + postre casero	Sede Central 09:00	Polideportivo 09:10	09:30	15:00	8.00
1	Fiesta de Primavera 2026	Udaberriko Jaia 2026	Gran celebración de primavera con música tradicional vasca, bailes y comida popular. Una jornada de convivencia entre todos los socios.	Udaberriko ospakizun handia euskal musika tradizionalarekin, dantzarekin eta herri janariarekin. Bazkide guztien arteko egonaldi bat.	2026-04-25	Plaza Mayor	\N	\N	\N	0	1	proxima	t	2026-03-30 10:39:18.891281	2026-03-30 12:22:40.388	Pintxos variados + Bebida + Postre	Sede Central 09:30	Plaza Mayor 09:45	10:00	18:00	15.00
2	San Juan 	Sanjuanak	Hogueras de San Juan con txikiteo popular, música en directo y celebración en la plaza municipal.	\N	2026-06-23	Orgi	\N	\N	\N	0	0	proxima	t	2026-03-30 10:39:18.891281	2026-03-30 12:25:31.378	\N	\N	\N	20:00	00:00	10.00
4	Calderete	Kalderetea			2026-07-09	Kuartelenea - Lizaso	blob:https://1fbd3eff-f012-4fdf-9e55-2ce787928a59-00-1vigbtajw1q6c.worf.replit.dev/a52525f6-5a27-41b4-adfb-d78045ee4e9f			0	0	prevista	f	2026-03-30 11:51:24.349656	2026-03-30 12:25:38.601				10:00	20:00	10.00
5	Calderete	Kalderete			2026-07-09	Lizaso				0	0	prevista	t	2026-04-07 13:51:00.922731	2026-04-07 13:51:00.922731				19:00	18:00	10.00
\.


--
-- Data for Name: db_galeria; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.db_galeria (id, titulo, titulo_eu, descripcion, imagen_url, miniatura_url, categoria, tema, anio, mes, created_at) FROM stdin;
13	Día de Denok Bat	Denok Baten eguna	{"fecha":"2026-03-28","folder":"evento-2026-03-28-dia-de-denok-bat"}	/uploads/galeria/evento-2026-03-28-dia-de-denok-bat/foto-1776155343812-4abd0913-27f7-4cec-89b1-095951a48ce8.jpg	/uploads/galeria/foto-1776152745521-c64c5ad9-bdf4-45ae-9444-92de37a70594.jpg	General	Evento	2026	3	2026-04-14 10:29:03.827734
2	Día de Denok Bat	Denok Baten eguna	{"fecha":"2026-03-28","folder":"evento-2026-03-28-dia-de-denok-bat"}	/uploads/galeria/evento-2026-03-28-dia-de-denok-bat/foto-1776154966026-eeec617f-a3d1-4cc2-81b8-a8c6b08b8a9a.jpg	/uploads/galeria/foto-1776152745521-c64c5ad9-bdf4-45ae-9444-92de37a70594.jpg	General	Evento	2026	3	2026-04-14 10:22:46.030234
3	Día de Denok Bat	Denok Baten eguna	{"fecha":"2026-03-28","folder":"evento-2026-03-28-dia-de-denok-bat"}	/uploads/galeria/evento-2026-03-28-dia-de-denok-bat/foto-1776154966026-4d7d6937-986d-4b80-b4ae-99f226755958.jpg	/uploads/galeria/foto-1776152745521-c64c5ad9-bdf4-45ae-9444-92de37a70594.jpg	General	Evento	2026	3	2026-04-14 10:22:46.031054
4	Día de Denok Bat	Denok Baten eguna	{"fecha":"2026-03-28","folder":"evento-2026-03-28-dia-de-denok-bat"}	/uploads/galeria/evento-2026-03-28-dia-de-denok-bat/foto-1776154966026-9572ce22-4073-4ecc-b618-94569928c67a.jpg	/uploads/galeria/foto-1776152745521-c64c5ad9-bdf4-45ae-9444-92de37a70594.jpg	General	Evento	2026	3	2026-04-14 10:22:46.031657
5	Día de Denok Bat	Denok Baten eguna	{"fecha":"2026-03-28","folder":"evento-2026-03-28-dia-de-denok-bat"}	/uploads/galeria/evento-2026-03-28-dia-de-denok-bat/foto-1776154966026-9bdb2506-dea9-4ddc-9f2e-829bd33ce32b.jpg	/uploads/galeria/foto-1776152745521-c64c5ad9-bdf4-45ae-9444-92de37a70594.jpg	General	Evento	2026	3	2026-04-14 10:22:46.032331
6	Día de Denok Bat	Denok Baten eguna	{"fecha":"2026-03-28","folder":"evento-2026-03-28-dia-de-denok-bat"}	/uploads/galeria/evento-2026-03-28-dia-de-denok-bat/foto-1776154966026-50130d43-fc66-4adc-bcd7-42093615febf.jpg	/uploads/galeria/foto-1776152745521-c64c5ad9-bdf4-45ae-9444-92de37a70594.jpg	General	Evento	2026	3	2026-04-14 10:22:46.032981
1	Día de Denok Bat	Denok Baten eguna	{"fecha":"2026-03-28","folder":"evento-2026-03-28-dia-de-denok-bat"}	/uploads/galeria/evento-2026-03-28-dia-de-denok-bat/foto-1776155077792-de8e3fc6-f85e-45f7-b071-415b52170234.jpg	/uploads/galeria/foto-1776152745521-c64c5ad9-bdf4-45ae-9444-92de37a70594.jpg	General	Evento	2026	3	2026-04-14 09:45:45.538809
7	Día de Denok Bat	Denok Baten eguna	{"fecha":"2026-03-28","folder":"evento-2026-03-28-dia-de-denok-bat"}	/uploads/galeria/evento-2026-03-28-dia-de-denok-bat/foto-1776155343813-bd28fdde-a636-48d9-a23e-c6b522836495.jpg	/uploads/galeria/foto-1776152745521-c64c5ad9-bdf4-45ae-9444-92de37a70594.jpg	General	Evento	2026	3	2026-04-14 10:22:46.033577
8	Día de Denok Bat	Denok Baten eguna	{"fecha":"2026-03-28","folder":"evento-2026-03-28-dia-de-denok-bat"}	/uploads/galeria/evento-2026-03-28-dia-de-denok-bat/foto-1776155343811-485a3038-5898-4208-938d-18219c96fcb2.jpg	/uploads/galeria/foto-1776152745521-c64c5ad9-bdf4-45ae-9444-92de37a70594.jpg	General	Evento	2026	3	2026-04-14 10:29:03.82515
9	Día de Denok Bat	Denok Baten eguna	{"fecha":"2026-03-28","folder":"evento-2026-03-28-dia-de-denok-bat"}	/uploads/galeria/evento-2026-03-28-dia-de-denok-bat/foto-1776155343812-5d828583-338e-4440-8826-89d4d4ab49ed.jpg	/uploads/galeria/foto-1776152745521-c64c5ad9-bdf4-45ae-9444-92de37a70594.jpg	General	Evento	2026	3	2026-04-14 10:29:03.825984
10	Día de Denok Bat	Denok Baten eguna	{"fecha":"2026-03-28","folder":"evento-2026-03-28-dia-de-denok-bat"}	/uploads/galeria/evento-2026-03-28-dia-de-denok-bat/foto-1776155343812-2e02e1ed-2306-4cf8-8ac2-d3c7e9d2f8aa.jpg	/uploads/galeria/foto-1776152745521-c64c5ad9-bdf4-45ae-9444-92de37a70594.jpg	General	Evento	2026	3	2026-04-14 10:29:03.82656
11	Día de Denok Bat	Denok Baten eguna	{"fecha":"2026-03-28","folder":"evento-2026-03-28-dia-de-denok-bat"}	/uploads/galeria/evento-2026-03-28-dia-de-denok-bat/foto-1776155343812-4f64fdea-768a-4f31-864c-aaf8adce43c2.jpg	/uploads/galeria/foto-1776152745521-c64c5ad9-bdf4-45ae-9444-92de37a70594.jpg	General	Evento	2026	3	2026-04-14 10:29:03.827009
12	Día de Denok Bat	Denok Baten eguna	{"fecha":"2026-03-28","folder":"evento-2026-03-28-dia-de-denok-bat"}	/uploads/galeria/evento-2026-03-28-dia-de-denok-bat/foto-1776155343812-62635e47-6b36-4e66-a0a9-25f0ec43ef59.jpg	/uploads/galeria/foto-1776152745521-c64c5ad9-bdf4-45ae-9444-92de37a70594.jpg	General	Evento	2026	3	2026-04-14 10:29:03.827395
15	LIV campeonato de MUS	MUSaren LIV. txapelketa	{"fecha":"2025-12-05","folder":"actividad-2025-12-05-liv-campeonato-de-mus"}	/uploads/galeria/actividad-2025-12-05-liv-campeonato-de-mus/foto-1776156029277-e19c8632-d5f3-4b06-88de-7b5179aeff8e.jpg	/uploads/galeria/actividad-2025-12-05-liv-campeonato-de-mus/foto-1776156029277-e19c8632-d5f3-4b06-88de-7b5179aeff8e.jpg	General	Actividad	2025	12	2026-04-14 10:40:29.29237
16	LIV campeonato de MUS	MUSaren LIV. txapelketa	{"fecha":"2025-12-05","folder":"actividad-2025-12-05-liv-campeonato-de-mus"}	/uploads/galeria/actividad-2025-12-05-liv-campeonato-de-mus/foto-1776156029277-2a3601d8-4e59-4f9a-9916-e4fc5832b2cf.jpg	/uploads/galeria/actividad-2025-12-05-liv-campeonato-de-mus/foto-1776156029277-2a3601d8-4e59-4f9a-9916-e4fc5832b2cf.jpg	General	Actividad	2025	12	2026-04-14 10:40:29.292842
17	LIV campeonato de MUS	MUSaren LIV. txapelketa	{"fecha":"2025-12-05","folder":"actividad-2025-12-05-liv-campeonato-de-mus"}	/uploads/galeria/actividad-2025-12-05-liv-campeonato-de-mus/foto-1776156029278-cb709ec9-b366-452f-abf7-f5ee7195b85f.jpg	/uploads/galeria/actividad-2025-12-05-liv-campeonato-de-mus/foto-1776156029278-cb709ec9-b366-452f-abf7-f5ee7195b85f.jpg	General	Actividad	2025	12	2026-04-14 10:40:29.293232
18	LIV campeonato de MUS	MUSaren LIV. txapelketa	{"fecha":"2025-12-05","folder":"actividad-2025-12-05-liv-campeonato-de-mus"}	/uploads/galeria/actividad-2025-12-05-liv-campeonato-de-mus/foto-1776156029278-1f8012b9-e010-4d32-ba23-8fcd459d7aae.jpg	/uploads/galeria/actividad-2025-12-05-liv-campeonato-de-mus/foto-1776156029278-1f8012b9-e010-4d32-ba23-8fcd459d7aae.jpg	General	Actividad	2025	12	2026-04-14 10:40:29.293669
19	LIV campeonato de MUS	MUSaren LIV. txapelketa	{"fecha":"2025-12-05","folder":"actividad-2025-12-05-liv-campeonato-de-mus"}	/uploads/galeria/actividad-2025-12-05-liv-campeonato-de-mus/foto-1776156029278-313571b8-74ef-49a3-be08-5e588aca691e.jpg	/uploads/galeria/actividad-2025-12-05-liv-campeonato-de-mus/foto-1776156029278-313571b8-74ef-49a3-be08-5e588aca691e.jpg	General	Actividad	2025	12	2026-04-14 10:40:29.294136
20	LIV campeonato de MUS	MUSaren LIV. txapelketa	{"fecha":"2025-12-05","folder":"actividad-2025-12-05-liv-campeonato-de-mus"}	/uploads/galeria/actividad-2025-12-05-liv-campeonato-de-mus/foto-1776156029278-feab5664-ea78-44e9-a0b7-6414662f126d.jpg	/uploads/galeria/actividad-2025-12-05-liv-campeonato-de-mus/foto-1776156029278-feab5664-ea78-44e9-a0b7-6414662f126d.jpg	General	Actividad	2025	12	2026-04-14 10:40:29.294557
21	LIV campeonato de MUS	MUSaren LIV. txapelketa	{"fecha":"2025-12-05","folder":"actividad-2025-12-05-liv-campeonato-de-mus"}	/uploads/galeria/actividad-2025-12-05-liv-campeonato-de-mus/foto-1776156029278-3fa9e3f4-cfc3-45d5-9ea7-683474460ec6.jpg	/uploads/galeria/actividad-2025-12-05-liv-campeonato-de-mus/foto-1776156029278-3fa9e3f4-cfc3-45d5-9ea7-683474460ec6.jpg	General	Actividad	2025	12	2026-04-14 10:40:29.2952
14	LIV campeonato de MUS	MUSaren LIV. txapelketa	{"fecha":"2025-12-05","folder":"actividad-2025-12-05-liv-campeonato-de-mus"}	/uploads/galeria/actividad-2025-12-05-liv-campeonato-de-mus/foto-1776156071851-c783546a-2814-42c2-a7d6-41c5d7a06e6d.jpg	/uploads/galeria/actividad-2025-12-05-liv-campeonato-de-mus/foto-1776156029277-366351e8-3586-4eab-ae20-df15092bae99.jpg	General	Actividad	2025	12	2026-04-14 10:40:29.290919
22	LIV campeonato de MUS	MUSaren LIV. txapelketa	{"fecha":"2025-12-05","folder":"actividad-2025-12-05-liv-campeonato-de-mus"}	/uploads/galeria/actividad-2025-12-05-liv-campeonato-de-mus/foto-1776156071850-47c9d3d7-8293-40d4-91da-11f47c4f66ca.jpg	/uploads/galeria/actividad-2025-12-05-liv-campeonato-de-mus/foto-1776156029277-366351e8-3586-4eab-ae20-df15092bae99.jpg	General	Actividad	2025	12	2026-04-14 10:41:11.862458
23	LIV campeonato de MUS	MUSaren LIV. txapelketa	{"fecha":"2025-12-05","folder":"actividad-2025-12-05-liv-campeonato-de-mus"}	/uploads/galeria/actividad-2025-12-05-liv-campeonato-de-mus/foto-1776156071850-b9f53b9e-c908-4dbe-8c50-a55bab38bc52.jpg	/uploads/galeria/actividad-2025-12-05-liv-campeonato-de-mus/foto-1776156029277-366351e8-3586-4eab-ae20-df15092bae99.jpg	General	Actividad	2025	12	2026-04-14 10:41:11.863204
24	LIV campeonato de MUS	MUSaren LIV. txapelketa	{"fecha":"2025-12-05","folder":"actividad-2025-12-05-liv-campeonato-de-mus"}	/uploads/galeria/actividad-2025-12-05-liv-campeonato-de-mus/foto-1776156071850-0655cd24-aa55-4468-9e35-bb9d21251018.jpg	/uploads/galeria/actividad-2025-12-05-liv-campeonato-de-mus/foto-1776156029277-366351e8-3586-4eab-ae20-df15092bae99.jpg	General	Actividad	2025	12	2026-04-14 10:41:11.863818
25	LIV campeonato de MUS	MUSaren LIV. txapelketa	{"fecha":"2025-12-05","folder":"actividad-2025-12-05-liv-campeonato-de-mus"}	/uploads/galeria/actividad-2025-12-05-liv-campeonato-de-mus/foto-1776156071850-5ba48cb6-0aa8-4500-a143-f5a3213c38ef.jpg	/uploads/galeria/actividad-2025-12-05-liv-campeonato-de-mus/foto-1776156029277-366351e8-3586-4eab-ae20-df15092bae99.jpg	General	Actividad	2025	12	2026-04-14 10:41:11.864527
26	LIV campeonato de MUS	MUSaren LIV. txapelketa	{"fecha":"2025-12-05","folder":"actividad-2025-12-05-liv-campeonato-de-mus"}	/uploads/galeria/actividad-2025-12-05-liv-campeonato-de-mus/foto-1776156071850-b9276cb9-562e-4d98-b19d-b093d8450611.jpg	/uploads/galeria/actividad-2025-12-05-liv-campeonato-de-mus/foto-1776156029277-366351e8-3586-4eab-ae20-df15092bae99.jpg	General	Actividad	2025	12	2026-04-14 10:41:11.86525
27	LIV campeonato de MUS	MUSaren LIV. txapelketa	{"fecha":"2025-12-05","folder":"actividad-2025-12-05-liv-campeonato-de-mus"}	/uploads/galeria/actividad-2025-12-05-liv-campeonato-de-mus/foto-1776156071850-2791d1f7-d98c-484e-9656-230c80198924.jpg	/uploads/galeria/actividad-2025-12-05-liv-campeonato-de-mus/foto-1776156029277-366351e8-3586-4eab-ae20-df15092bae99.jpg	General	Actividad	2025	12	2026-04-14 10:41:11.865924
28	LIV campeonato de MUS	MUSaren LIV. txapelketa	{"fecha":"2025-12-05","folder":"actividad-2025-12-05-liv-campeonato-de-mus"}	/uploads/galeria/actividad-2025-12-05-liv-campeonato-de-mus/foto-1776156500735-36429604-5e37-448f-be9c-13cd1dc68b3b.jpg	/uploads/galeria/actividad-2025-12-05-liv-campeonato-de-mus/foto-1776156029277-366351e8-3586-4eab-ae20-df15092bae99.jpg	General	Actividad	2025	12	2026-04-14 10:41:11.866587
29	LIV campeonato de MUS	MUSaren LIV. txapelketa	{"fecha":"2025-12-05","folder":"actividad-2025-12-05-liv-campeonato-de-mus"}	/uploads/galeria/actividad-2025-12-05-liv-campeonato-de-mus/foto-1776156500734-dd4e1afe-f794-452d-b8f3-8c1110629828.jpg	/uploads/galeria/actividad-2025-12-05-liv-campeonato-de-mus/foto-1776156029277-366351e8-3586-4eab-ae20-df15092bae99.jpg	General	Actividad	2025	12	2026-04-14 10:48:20.73685
30	LIV campeonato de MUS	MUSaren LIV. txapelketa	{"fecha":"2025-12-05","folder":"actividad-2025-12-05-liv-campeonato-de-mus"}	/uploads/galeria/actividad-2025-12-05-liv-campeonato-de-mus/foto-1776156500734-621a0aea-98e0-4464-8afc-3d5f7a64a4e1.jpg	/uploads/galeria/actividad-2025-12-05-liv-campeonato-de-mus/foto-1776156029277-366351e8-3586-4eab-ae20-df15092bae99.jpg	General	Actividad	2025	12	2026-04-14 10:48:20.737644
31	LIV campeonato de MUS	MUSaren LIV. txapelketa	{"fecha":"2025-12-05","folder":"actividad-2025-12-05-liv-campeonato-de-mus"}	/uploads/galeria/actividad-2025-12-05-liv-campeonato-de-mus/foto-1776156500734-79ac084c-e4b5-4073-b010-1db3e559d82a.jpg	/uploads/galeria/actividad-2025-12-05-liv-campeonato-de-mus/foto-1776156029277-366351e8-3586-4eab-ae20-df15092bae99.jpg	General	Actividad	2025	12	2026-04-14 10:48:20.73879
32	LIV campeonato de MUS	MUSaren LIV. txapelketa	{"fecha":"2025-12-05","folder":"actividad-2025-12-05-liv-campeonato-de-mus"}	/uploads/galeria/actividad-2025-12-05-liv-campeonato-de-mus/foto-1776156500734-c5a4eccd-9bdc-4409-ae61-f0665b3c1a84.jpg	/uploads/galeria/actividad-2025-12-05-liv-campeonato-de-mus/foto-1776156029277-366351e8-3586-4eab-ae20-df15092bae99.jpg	General	Actividad	2025	12	2026-04-14 10:48:20.739464
33	LIV campeonato de MUS	MUSaren LIV. txapelketa	{"fecha":"2025-12-05","folder":"actividad-2025-12-05-liv-campeonato-de-mus"}	/uploads/galeria/actividad-2025-12-05-liv-campeonato-de-mus/foto-1776156500734-92ff11e1-f6c2-4959-9daa-382927fa4d3d.jpg	/uploads/galeria/actividad-2025-12-05-liv-campeonato-de-mus/foto-1776156029277-366351e8-3586-4eab-ae20-df15092bae99.jpg	General	Actividad	2025	12	2026-04-14 10:48:20.74016
34	LIV campeonato de MUS	MUSaren LIV. txapelketa	{"fecha":"2025-12-05","folder":"actividad-2025-12-05-liv-campeonato-de-mus"}	/uploads/galeria/actividad-2025-12-05-liv-campeonato-de-mus/foto-1776156500734-4a91b74c-05f6-413e-b6c3-94ceb41eb4a5.jpg	/uploads/galeria/actividad-2025-12-05-liv-campeonato-de-mus/foto-1776156029277-366351e8-3586-4eab-ae20-df15092bae99.jpg	General	Actividad	2025	12	2026-04-14 10:48:20.740752
35	LIV campeonato de MUS	MUSaren LIV. txapelketa	{"fecha":"2025-12-05","folder":"actividad-2025-12-05-liv-campeonato-de-mus"}	/uploads/galeria/actividad-2025-12-05-liv-campeonato-de-mus/foto-1776156626045-1d288aa5-7c58-40c4-b36a-20b291397e35.jpg	/uploads/galeria/actividad-2025-12-05-liv-campeonato-de-mus/foto-1776156029277-366351e8-3586-4eab-ae20-df15092bae99.jpg	General	Actividad	2025	12	2026-04-14 10:48:20.741411
36	LIV campeonato de MUS	MUSaren LIV. txapelketa	{"fecha":"2025-12-05","folder":"actividad-2025-12-05-liv-campeonato-de-mus"}	/uploads/galeria/actividad-2025-12-05-liv-campeonato-de-mus/foto-1776156670839-2969b92c-6432-49a9-abf3-96091445a73a.jpg	/uploads/galeria/actividad-2025-12-05-liv-campeonato-de-mus/foto-1776156029277-366351e8-3586-4eab-ae20-df15092bae99.jpg	General	Actividad	2025	12	2026-04-14 10:51:10.842153
37	LIV campeonato de MUS	MUSaren LIV. txapelketa	{"fecha":"2025-12-05","folder":"actividad-2025-12-05-liv-campeonato-de-mus"}	/uploads/galeria/actividad-2025-12-05-liv-campeonato-de-mus/foto-1776156670839-fca2c8d8-a35c-4387-9dd8-d5eed85789bd.jpg	/uploads/galeria/actividad-2025-12-05-liv-campeonato-de-mus/foto-1776156029277-366351e8-3586-4eab-ae20-df15092bae99.jpg	General	Actividad	2025	12	2026-04-14 10:51:10.842889
38	LIV campeonato de MUS	MUSaren LIV. txapelketa	{"fecha":"2025-12-05","folder":"actividad-2025-12-05-liv-campeonato-de-mus"}	/uploads/galeria/actividad-2025-12-05-liv-campeonato-de-mus/foto-1776156670839-16248d6c-0084-4e85-b9c4-8f3d569625b4.jpg	/uploads/galeria/actividad-2025-12-05-liv-campeonato-de-mus/foto-1776156029277-366351e8-3586-4eab-ae20-df15092bae99.jpg	General	Actividad	2025	12	2026-04-14 10:51:10.843388
39	LIV campeonato de MUS	MUSaren LIV. txapelketa	{"fecha":"2025-12-05","folder":"actividad-2025-12-05-liv-campeonato-de-mus"}	/uploads/galeria/actividad-2025-12-05-liv-campeonato-de-mus/foto-1776156670839-003e045a-8784-4b50-abe4-e6f652344923.jpg	/uploads/galeria/actividad-2025-12-05-liv-campeonato-de-mus/foto-1776156029277-366351e8-3586-4eab-ae20-df15092bae99.jpg	General	Actividad	2025	12	2026-04-14 10:51:10.843873
40	LIV campeonato de MUS	MUSaren LIV. txapelketa	{"fecha":"2025-12-05","folder":"actividad-2025-12-05-liv-campeonato-de-mus"}	/uploads/galeria/actividad-2025-12-05-liv-campeonato-de-mus/foto-1776156670839-7910c6f2-3ad3-4d5e-add2-c87017250848.jpg	/uploads/galeria/actividad-2025-12-05-liv-campeonato-de-mus/foto-1776156029277-366351e8-3586-4eab-ae20-df15092bae99.jpg	General	Actividad	2025	12	2026-04-14 10:51:10.844248
41	LIV campeonato de MUS	MUSaren LIV. txapelketa	{"fecha":"2025-12-05","folder":"actividad-2025-12-05-liv-campeonato-de-mus"}	/uploads/galeria/actividad-2025-12-05-liv-campeonato-de-mus/foto-1776156670839-0d58055b-b946-4788-8ec9-7740717ce4a1.jpg	/uploads/galeria/actividad-2025-12-05-liv-campeonato-de-mus/foto-1776156029277-366351e8-3586-4eab-ae20-df15092bae99.jpg	General	Actividad	2025	12	2026-04-14 10:51:10.844644
42	LIV campeonato de MUS	MUSaren LIV. txapelketa	{"fecha":"2025-12-05","folder":"actividad-2025-12-05-liv-campeonato-de-mus"}	/uploads/galeria/actividad-2025-12-05-liv-campeonato-de-mus/foto-1776156670840-95a1bf39-05a1-4b39-ad2d-896153857c75.jpg	/uploads/galeria/actividad-2025-12-05-liv-campeonato-de-mus/foto-1776156029277-366351e8-3586-4eab-ae20-df15092bae99.jpg	General	Actividad	2025	12	2026-04-14 10:51:10.845057
43	Día de Denok Bat	Denok Baten eguna	{"fecha":"2026-03-28","folder":"evento-2026-03-28-dia-de-denok-bat"}	/uploads/galeria/evento-2026-03-28-dia-de-denok-bat/foto-1776156698765-77454a88-afbe-4571-86b1-1dd104316c0d.jpg	/uploads/galeria/foto-1776152745521-c64c5ad9-bdf4-45ae-9444-92de37a70594.jpg	General	Evento	2026	3	2026-04-14 10:51:38.767915
44	Día de Denok Bat	Denok Baten eguna	{"fecha":"2026-03-28","folder":"evento-2026-03-28-dia-de-denok-bat"}	/uploads/galeria/evento-2026-03-28-dia-de-denok-bat/foto-1776156698765-5ce74e67-816b-495b-ab6b-8565769c4fd2.jpg	/uploads/galeria/foto-1776152745521-c64c5ad9-bdf4-45ae-9444-92de37a70594.jpg	General	Evento	2026	3	2026-04-14 10:51:38.768755
45	Día de Denok Bat	Denok Baten eguna	{"fecha":"2026-03-28","folder":"evento-2026-03-28-dia-de-denok-bat"}	/uploads/galeria/evento-2026-03-28-dia-de-denok-bat/foto-1776156698765-c9cfdbde-3743-40d4-bfcf-11407c6c26c0.jpg	/uploads/galeria/foto-1776152745521-c64c5ad9-bdf4-45ae-9444-92de37a70594.jpg	General	Evento	2026	3	2026-04-14 10:51:38.76931
46	Día de Denok Bat	Denok Baten eguna	{"fecha":"2026-03-28","folder":"evento-2026-03-28-dia-de-denok-bat"}	/uploads/galeria/evento-2026-03-28-dia-de-denok-bat/foto-1776156698765-82225729-1d8a-43d9-b972-00df0f46b202.jpg	/uploads/galeria/foto-1776152745521-c64c5ad9-bdf4-45ae-9444-92de37a70594.jpg	General	Evento	2026	3	2026-04-14 10:51:38.769777
47	Día de Denok Bat	Denok Baten eguna	{"fecha":"2026-03-28","folder":"evento-2026-03-28-dia-de-denok-bat"}	/uploads/galeria/evento-2026-03-28-dia-de-denok-bat/foto-1776156698765-aeb5e693-8ff5-445b-b007-7865f6457936.jpg	/uploads/galeria/foto-1776152745521-c64c5ad9-bdf4-45ae-9444-92de37a70594.jpg	General	Evento	2026	3	2026-04-14 10:51:38.770148
48	Día de Denok Bat	Denok Baten eguna	{"fecha":"2026-03-28","folder":"evento-2026-03-28-dia-de-denok-bat"}	/uploads/galeria/evento-2026-03-28-dia-de-denok-bat/foto-1776156698765-cc0e8abe-713b-49e4-a9db-4800f6a813b8.jpg	/uploads/galeria/foto-1776152745521-c64c5ad9-bdf4-45ae-9444-92de37a70594.jpg	General	Evento	2026	3	2026-04-14 10:51:38.770737
\.


--
-- Data for Name: db_grupos; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.db_grupos (id, nombre, nombre_eu, delegado_id, created_at) FROM stdin;
\.


--
-- Data for Name: db_historico_cargos; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.db_historico_cargos (id, socio_id, cargo_id, fecha_inicio, fecha_fin, descripcion, descripcion_eu, created_at, updated_at) FROM stdin;
8	921	6	2026-04-21	\N	Vocal	Bokala	2026-04-21 14:33:25.365357	2026-04-23 17:11:24.015
9	804	6	2026-04-21	\N	Vocal	Bokala	2026-04-21 14:34:14.662675	2026-04-23 17:11:38.257
11	809	2	2026-04-21	\N	Presidencia	Lehendakaritza	2026-04-21 14:35:32.995191	2026-04-23 17:11:59.444
12	970	7	2026-04-21	\N	Delegada	Delegatua	2026-04-21 14:35:43.541277	2026-04-23 17:12:22.215
14	809	7	2026-04-21	\N	Delegado	Delegatua	2026-04-21 14:46:49.855016	2026-04-23 17:12:44.46
10	891	6	2026-04-21	\N	Vocal	Bokala	2026-04-21 14:34:55.482052	2026-04-23 17:13:08.751
2	831	6	2026-04-21	\N	Vocal	Bokala	2026-04-21 14:31:27.044223	2026-04-23 17:13:13.799
1	922	6	2026-04-21	\N	Vocal	Bokala	2026-04-21 14:29:22.846953	2026-04-23 17:13:20.9
3	875	6	2026-04-21	\N	Vocal	Bokala	2026-04-21 14:31:47.598977	2026-04-23 17:13:23.642
4	639	6	2026-04-21	\N	Vocal	Bokala	2026-04-21 14:32:11.411545	2026-04-23 17:13:28.107
5	819	5	2026-04-21	\N	Tesorería	Diruzaintza	2026-04-21 14:32:20.204399	2026-04-23 17:13:51.282
6	759	6	2026-04-21	\N	Secretaria	Idazkaria	2026-04-21 14:32:44.611271	2026-04-23 17:13:56.677
7	633	3	2026-04-21	\N	Vicepresidencia	Lehendakari ordea	2026-04-21 14:32:58.755083	2026-04-23 17:13:59.115
15	819	7	2020-02-10	\N	\N	\N	2026-04-24 10:50:44.650261	2026-04-24 08:50:44.649
16	606	7	2010-02-10	\N	\N	\N	2026-04-24 10:53:15.084937	2026-04-24 08:53:15.084
\.


--
-- Data for Name: db_hojas_informativas; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.db_hojas_informativas (id, titulo, titulo_eu, estado, publicado_por, created_at, updated_at, anio, mes, dia, descripcion, descripcion_eu, foto_url, pdf_url) FROM stdin;
2	EXCURSIÓN a SAN MARTIN de UNX TXANGOA	EXCURSIÓN a SAN MARTIN de UNX TXANGOA	borrador	\N	2026-04-09 11:04:50.322087	2026-04-09 11:10:49.044243	2026	4	\N	Excursión a SAN MARTIN de UNX, salidas al monte y viaje a EXTREMADURA	SAN MARTIN de UNX era txangoa, mendi ireteerak eta EXTREMADURA alderako bidaia	/uploads/hojas/foto-1775725849037-a8c9c348-ed9e-40d5-b119-51089cb86de7.png	/uploads/hojas/pdf-1775725849038-f3dbd8da-b162-423b-8a4c-744925cd7a57.pdf
3	JUBILATUEN EGUNA – DÍA DEL JUBILADO/A	JUBILATUEN EGUNA – DÍA DEL JUBILADO/A	borrador	\N	2026-04-09 11:17:09.033736	2026-04-09 12:02:44.379289	2026	3	\N	Día del jubilado/a y salidas al monte	Jubilatuen eguna eta mendi ireteerak	/uploads/hojas/foto-1775728964367-6c71abf4-d149-452c-8d20-6cc018648921.png	/uploads/hojas/pdf-1775728964370-b1b710e4-d0b7-4895-8ec7-9c78f3749345.pdf
4	Delegatuekin bilera	Delegatuekin bilera	borrador	\N	2026-04-09 12:18:55.392176	2026-04-09 12:18:55.392176	2026	2	\N	Reunión con delegados/as, Excursión a Etxalar y sidrería, Salidas al monte y senderismo y Viaje a Benidorm	Delegatuekin bilera, Etxalar eta sagardotegiko txangoa, Mendi irteerak eta Benidormeko bidaia	/uploads/hojas/foto-1775729935385-23aaf2b6-00d8-4471-9116-b9d2f56dba21.png	/uploads/hojas/pdf-1775729935387-7650963f-db70-406e-af93-4bcc15808079.pdf
5	ASAMBLEA GENERAL	BATZAR OROKORRA	borrador	\N	2026-04-09 12:23:21.912161	2026-04-09 12:23:21.912161	2026	1	\N	Asamblea general, cuota anual, campeonato de mus y salidas al monte	Batzar orokorra, urteko kuota, mus txapelketa eta mendi irteerak	/uploads/hojas/foto-1775730201906-963ef09a-f002-461a-b399-7c588859a986.png	/uploads/hojas/pdf-1775730201907-9d19e970-74a6-4e71-b6fb-0d6a1edf1127.pdf
\.


--
-- Data for Name: db_inscripciones; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.db_inscripciones (id, socio_id, evento_id, actividad_id, tipo, estado, parada_bus, subactividad, observaciones, fecha_inscripcion, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: db_nosotros; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.db_nosotros (id, seccion, titulo, contenido, pdf_url, orden, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: db_noticias; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.db_noticias (id, titulo, titulo_eu, categoria, fecha, resumen, resumen_eu, contenido, contenido_eu, imagenes_json, publicado, created_at, updated_at) FROM stdin;
2	Alsasua fortalece el bienestar de su población mayor con el proceso “Komunitatea Ehuntzen - Tejiendo Comunidad”	Alsasua fortalece el bienestar de su población mayor con el proceso “Komunitatea Ehuntzen - Tejiendo Comunidad”	General	2026-04-10	Bajo el nombre “Komunitatea Ehuntzen - Tejiendo Comunidad”, la localidad de Altsasu/Alsasua ha dado un paso decisivo para mejorar el bienestar de sus vecinos y vecinas mayores d...	“Komunitatea Ehuntzen” izenpean, Altsasuko herriak urrats erabakigarria eman du 60 urtetik gorako bizilagunen ongizatea hobetzeko. Bi urteko lankidetza-lanaren ondoren, komunita...	Bajo el nombre “Komunitatea Ehuntzen - Tejiendo Comunidad”, la localidad de Altsasu/Alsasua ha dado un paso decisivo para mejorar el bienestar de sus vecinos y vecinas mayores de 60 años. Tras dos años de trabajo cooperativo, el proceso de acción comunitaria se presentó oficialmente el 25 de marzo ante la población en un acto que invitó a la participación activa de toda su comunidad.\n\nEl proyecto nació de una necesidad detectada entre el centro de salud y la propia comunidad para mejorar la calidad de vida y el bienestar de las personas mayores de la zona mediante un abordaje conjunto. No se trata de ofrecer servicios a las personas mayores, sino de construir con ellos y ellas las vías que les hagan sentirse bien y mejorar su salud. \n\n\nPara dar respuesta a este reto, se constituyó un grupo motor de trabajo compuesto por la comunidad (personas mayores a título individual y diversas asociaciones locales), personal técnico (profesionales del centro de salud, del Servicio Social de Base, del proyecto Teknoadineko, etc.) y responsables políticos del Ayuntamiento de Altsasu/Alsasua.\n\nEste equipo cuenta, además, con el apoyo de profesionales de la Estrategia de Salud Comunitaria en Atención Primaria de Navarra, quienes aportan el asesoramiento metodológico y las herramientas técnicas para facilitar que se vaya construyendo un proceso de desarrollo comunitario con la participación de la ciudadanía y en especial, de su población mayor.\nTres pilares para su comunidad “Komunitatea Ehuntzen - Tejiendo Comunidad” ha definido tres líneas estratégicas de actuación que marcarán la actividad de los próximos meses: \n\n\n    Fomento de la actividad física: desarrollo de paseos saludables que buscan combatir el sedentarismo y fomentar el encuentro al aire libre. Se realizarán los lunes a las 11:30h desde el centro de salud, iniciándose el 13 de abril.\n    Relaciones Intergeneracionales: creación de espacios de convivencia entre diferentes edades, destacando la celebración de torneos conjuntos donde niños, niñas y personas mayores comparten juegos y experiencias. Como primera actividad, se celebrará un torneo intergeneracional de parchís el 15 de mayo, a las 17h en Gure Etxea.\n    Cohesión Intercultural: impulso de la convivencia entre personas de distintos orígenes que residen en Altsasu/Alsasua, poniendo en valor sus culturas a través de la celebración de sus fiestas y días significativos. La actividad comenzará con la presentación de la cultura de varios pueblos marroquíes el 23 de abril a las 18h en el Club de Jubilados.\nLa presentación pública realizada el pasado 25 de marzo marcó el inicio de la participación de otras personas de la comunidad en las iniciativas propuestas. Desde el grupo motor se hace un llamamiento a cualquier persona interesada en participar, aportar ideas o simplemente sumarse a las actividades programadas.	“Komunitatea Ehuntzen” izenpean, Altsasuko herriak urrats erabakigarria eman du 60 urtetik gorako bizilagunen ongizatea hobetzeko. Bi urteko lankidetza-lanaren ondoren, komunitate-ekintza prozesua ofizialki aurkeztu zitzaion jendaurrean martxoaren 25ean, komunitate osoaren parte-hartze aktiboa bultzatu zuen ekitaldi batean.\n\nProiektua osasun-zentroak eta komunitateak berak identifikatu zuten behar batetik sortu zen, inguruko adinekoen bizi-kalitatea eta ongizatea hobetzeko, ikuspegi bateratu baten bidez. Helburua ez da adinekoei zerbitzuak eskaintzea soilik, baizik eta haiekin batera lan egitea haien ongizatea sustatu eta osasuna hobetuko duten bideak sortzeko.\n\nErronka horri aurre egiteko, lan-talde nagusi bat eratu zen, komunitateko kideek (banakako adinekoak eta tokiko hainbat elkarte), langile teknikoek (osasun-zentroko, Oinarrizko Gizarte Zerbitzuetako, Teknoadineko proiektuko, etab.) eta Altsasuko Udaleko ordezkari politikoek osatua.\nTalde honek, gainera, Nafarroan Lehen Mailako Arretako Osasun Komunitarioaren Estrategiako profesionalen laguntza du, eta hauek aholkularitza metodologikoa eta tresna teknikoak eskaintzen dituzte herritarren parte-hartzearekin, eta batez ere adinekoen populazioaren parte-hartzearekin, komunitate-prozesu bat garatzeko.\n\nHiru zutabe beren komunitatearentzat: “Komunitatea Ehuntzen”-ek hiru ekintza-ildo estrategiko definitu ditu, datozen hilabeteetan bere jarduerak moldatuko dituztenak:\nJarduera fisikoa sustatzea: bizimodu sedentarioari aurre egiteko eta kanpoko elkarrekintza sustatzeko ibilaldi osasungarriak garatzea. Ibilaldi hauek astelehenetan izango dira, goizeko 11:30ean, apirilaren 13an osasun zentrotik abiatuta.\n\nBelaunaldien arteko harremanak: adin-talde desberdinen arteko elkarrekintzarako espazioak sortzea, haur eta adinekoek jolasak eta esperientziak partekatzen dituzten txapelketa bateratuak azpimarratuz. Lehenengo jarduera belaunaldien arteko partxis txapelketa izango da maiatzaren 15ean, arratsaldeko 5:00etan, Gure Etxean.\n\nKultura arteko kohesioa: Altsasun bizi diren jatorri anitzeko pertsonen arteko bizikidetza sustatzea, beren kulturak ospatuz beren jaialdien eta egun esanguratsuen bidez. Jarduera hau hainbat Marokoko komunitateren kulturari buruzko aurkezpen batekin hasiko da apirilaren 23an, arratsaldeko 6:00etan, Adinekoen Klubean. Martxoaren 25ean egindako aurkezpen publikoak komunitateko beste kide batzuen parte-hartzea markatu zuen proposatutako ekimenetan. Antolakuntza taldeak parte hartzeko, ideiak emateko edo, besterik gabe, programatutako jardueretan bat egiteko interesa duen edonori dei egiten dio.	[{"src":"/uploads/noticias/noticia-1775817399695-244359ae-2441-4fce-a8bc-a48236189378.png","side":"left","anchorBlock":1},{"src":"/uploads/noticias/noticia-1775817399696-9394bce1-7c6c-4b3d-85b3-9808e1f35fce.png","side":"right","anchorBlock":7}]	t	2026-04-10 12:36:39.701593	2026-04-10 10:54:27.494
1	Servicio de taxi subvencionado en Basaburua	Diruz lagundutako taxi zerbitzua Basaburuan	General	2026-04-10	En Basaburua habrá un servicio de taxi para conectar con los autobuses de Auza e Irurtzun. El primer viaje será mañana y las reservas deberán realizarse el día anterior, es deci...	Auza eta Irurtzungo autobusarekin lotura egiteko taxi zerbitzua izanen da Basaburuan. Bihar eginen du lehenengo bidaia eta erreserbatzeko aurreko egunean egin behar da, 19:00ak ...	En Basaburua habrá un servicio de taxi para conectar con los autobuses de Auza e Irurtzun. El primer viaje será mañana y las reservas deberán realizarse el día anterior, es decir, hoy.\nEl servicio transportará a los usuarios desde los municipios hasta las estaciones de autobuses de Auza e Irurtzun. Los taxis los recogerán en su localidad y los llevarán a la estación correspondiente. El precio será de unos 3 euros, ya que estará subvencionado gracias al acuerdo firmado con el Gobierno de Navarra. El taxi deberá reservarse el día anterior, antes de las 19:00. El primer viaje será mañana y las reservas deberán realizarse hoy para poder utilizarlo.\nAdemás del servicio regular que se prestará de lunes a viernes, todos los martes, a las 10:30, se habilitará la opción de ir desde los municipios a Irurtzun para asistir a la feria. El día de la feria, habrá opción de regresar desde Irurtzun a las 13:30. Además, este horario también los conecta con el servicio regular de autobús entre la ciudad y Pamplona.\nPara poner en marcha este servicio de taxi, el Ayuntamiento de Basaburu ha firmado un convenio con el Gobierno de Navarra y recibirá un presupuesto de 15.000 euros. Asimismo, la Dirección General de Transportes y Movilidad Sostenible está diseñando los servicios de la concesión Pamplona-Donostia. Estos servicios integrarán un modelo de transporte a demanda que dará servicio a los valles de Basaburu, Larraun e Imotz.	Auza eta Irurtzungo autobusarekin lotura egiteko taxi zerbitzua izanen da Basaburuan. Bihar eginen du lehenengo bidaia eta erreserbatzeko aurreko egunean egin behar da, 19:00ak aino lehen, kasu honetan, gaur.\n\nZerbitzuak erabiltzaileak kontzejuetatik Auza eta Irurtzungo autobus geltokietara eramanen ditu. Taxiak beren herrian jasoko baititu eta dagokion autobus geltokira eraman. Prezioa 3 euroren baitan egonen da, diruz lagunduta egonen baita Nafarroako Gobernuarekin sinatutako hitzarmenari esker. Taxia aurreko egunean erreserbatu beharko da, 19:00ak baino lehen. Bihar eginen du lehenengo bidaia eta erabiltzeko gaur erreserbatu beharko da. \nAstelehenetik ostiralera emango den zerbitzu erregularraz gain, asteartero, 10:30ean, herrietatik Irurtzunera joateko aukera zabalduko da, azoka-egunean bertaratzeko. Azoka egun horretan, Irurtzundik 13:30ean itzultzeko aukera egonen da. Gainera, ordutegi horrek herriaren eta Iruñearen arteko autobus-zerbitzu erregularrarekin ere lotzen ditu. \nTaxi zerbitzu hau martxan jartzeko, Basaburuko Udalak hitzarmena sinatu du Nafarroako Gobernuarekin eta 15.000 euroko aurrekontu-saila jasoko du. Gaur egun, gainera, Garraioen eta Mugikortasun Iraunkorraren Zuzendaritza Nagusia Iruña-Donostia kontzesioaren zerbitzuak diseinatzen ari da. Zerbitzu horietan, Basaburua, Larraun eta Imotz bailarei erantzungo dien eskariaren modalitatea integratuko da.	[{"src":"/uploads/noticias/noticia-1775815641421-dc50a20d-e757-4735-a0f3-99769d1003eb.png","side":"right","anchorBlock":3},{"src":"/uploads/noticias/noticia-1775815641429-d9813a8c-15a9-420d-8c6b-9bec120aacd3.png","side":"left","anchorBlock":1}]	t	2026-04-10 10:49:17.222128	2026-04-10 11:04:41.483
\.


--
-- Data for Name: db_pagos; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.db_pagos (id, odoo_id, socio_id, inscripcion_id, concepto, importe, metodo, estado, fecha_pago, referencia, odoo_synced_at, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: db_pulunpe; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.db_pulunpe (id, titulo, titulo_eu, pdf_url, descripcion, anio, mes, estado, created_at, updated_at, foto_url, descripcion_eu) FROM stdin;
1	Sagardotegia	Sagardotegia	/uploads/pulunpes/pdf-1775715061667-5b88ed2b-6f04-4618-881d-196ceaea54cb.pdf	Edición de primavera con reportaje sobre el torneo de mus y la excursión a Donostia.	2026	3	borrador	2026-04-08 12:09:54.276222	2026-04-09 06:11:01.66	/uploads/pulunpes/foto-1775715061661-6db5ef95-d0bf-4c58-8c19-0d649e038b7a.png	Etxalar ikusi eta Lesakan bazkaldu
3	Urteko azken ekimenak, 2025ari agur esan baino lehen	Urteko azken ekimenak, 2025ari agur esan baino lehen	/uploads/pulunpes/pdf-1775715731986-ef0b8452-5402-411b-bdcf-20efbf27e5fb.pdf	En diciembre celebramos la fiesta de fin de año. En Auza, oficiamos una misa en honor a los fallecidos durante el año y luego comimos y bailamos en el restaurante Beola de Almandoz. Despedimos el 2025 en un ambiente perfecto.	2026	1	borrador	2026-04-09 08:22:11.995825	2026-04-09 08:22:11.995825	/uploads/pulunpes/foto-1775715731980-50d253b2-7542-495a-a0e0-961a11581034.png	Abenduan urte amaierako festa ospatu genuen Auzan, urtean hildakoen omenezko meza egin genuen eta ondoren Almandozko Beola jatetxean bazkaria eta dantza saioa izan genituen. Giro ezin hobean agurtu dugu 2025. urtea
4	Batzar Orokorrak emandakoak eta urtarrileko ibilaldiak	Batzar Orokorrak emandakoak eta urtarrileko ibilaldiak	/uploads/pulunpes/pdf-1775715960368-de56c4a6-bae9-406a-a5e5-21fe29a30b5c.pdf	2026 urteko lehenengo kronikan, batzar orokorraren inguruko xehetasunak eta azken hilabete honetan egin ditugun ibilaldien berri emanen dizuegu	2026	2	borrador	2026-04-09 08:26:00.378765	2026-04-09 08:26:00.378765	/uploads/pulunpes/foto-1775715960365-275448e9-4f93-4de3-962c-b0890df2cba6.png	2026 urteko lehenengo kronikan, batzar orokorraren inguruko xehetasunak eta azken hilabete honetan egin ditugun ibilaldien berri emanen dizuegu
2	Albaola eta Orgiko basoa	Albaola eta Orgiko basoa	/uploads/pulunpes/pdf-1775715410941-24ff0fc8-10a7-4b5c-95f8-cc784998a5ef.pdf	En noviembre, fuimos miembros de la asociación de jubilados Denok Bat en la Albaola Itsas Kultur Faktoria de Pasaia. Además de visitar el museo, disfrutamos de un delicioso almuerzo en Tolosa. Más cerca de casa, este mes también visitamos el bosque de Orgi en Ultzama. ¡Y también hicimos una excursión al monte Leurtza!	2025	12	borrador	2026-04-09 08:16:50.952411	2026-04-09 06:44:18.369	/uploads/pulunpes/foto-1775715410938-1d7207a1-eafe-4f2d-9d8b-1d4d605fa29f.png	Pasaiko Albaola Itsas Kultur Faktorian izan gara azaroan Denok Bat jubilatuen elkarteko kideak. Museoaz gain, bazkari ederra egin genuen Tolosan. Hurbilago, hilabete honetan Ultzamako Orgi oihanean ere izan gara. Eta Leurtzara ere egin dugu mendi irteera!
\.


--
-- Data for Name: db_socios; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.db_socios (id, odoo_id, nombre, apellidos, email, telefono, direccion, dni, fecha_nacimiento, fecha_alta, numero_socio, genero, estado, grupo_id, avatar_url, odoo_synced_at, created_at, updated_at, grupo_id_fk, poblacion, provincia, fecha_fallecimiento, tipologia, usuario_id, tipo_socio, membership_estado, membership_desde, membership_hasta, membership_cuota) FROM stdin;
2	\N	María	Huarte Alsua	\N	\N	\N	72610791K	1933-06-10	1991-03-01	2	F	Activo	2	\N	\N	\N	2026-04-23 16:53:00.39	\N	Igoa	\N	\N	Fundadora	\N	ordinario	\N	\N	\N	\N
4	\N	Tomasa	Goñi Telletxea	\N	\N	\N	15861545D	1926-09-17	1991-03-01	4	F	Baja	\N	\N	\N	\N	2026-04-23 16:53:00.394	\N	Auza	\N	2023-05-01	Fundadora	\N	ordinario	\N	\N	\N	\N
5	\N	Martín	Gascue Olague	\N	\N	\N	15861540G	1913-09-23	1991-03-01	5	H	Baja	\N	\N	\N	\N	2026-04-23 16:53:00.396	\N	Auza	\N	1998-06-17	Fundadora	\N	ordinario	\N	\N	\N	\N
6	\N	Paula	Ibero Insausti	\N	\N	\N	15650480S	1915-03-02	1991-03-01	6	F	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.397	\N	Eritze	\N	\N	Fundadora	\N	ordinario	\N	\N	\N	\N
7	\N	María	Huarte Insausti	\N	\N	\N	15646939Q	1920-05-15	1991-03-01	7	F	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.399	\N	Gelbentzu	\N	\N	Fundadora	\N	ordinario	\N	\N	\N	\N
8	\N	José M	Beunza Roncal	\N	\N	\N	12194170F	1924-04-24	1991-03-01	8	H	Baja	\N	\N	\N	\N	2026-04-23 16:53:00.4	\N	Gerendiain	\N	\N	Fundadora	\N	ordinario	\N	\N	\N	\N
9	\N	Raimundo	Oskoz Arístegi	\N	\N	\N	15861051K	1912-03-15	1991-03-01	9	H	Baja	\N	\N	\N	\N	2026-04-23 16:53:00.402	\N	Larraintzar	\N	\N	Fundadora	\N	ordinario	\N	\N	\N	\N
10	\N	Martín	 Barbería	\N	\N	\N	15548685H	1919-03-13	1991-03-01	10	H	Baja	\N	\N	\N	\N	2026-04-23 16:53:00.403	\N	Igoa	\N	\N	Fundadora	\N	ordinario	\N	\N	\N	\N
11	\N	Victoria	Alsúa Arretxea	\N	\N	\N	15657941R	1930-04-30	1991-03-01	11	F	Baja	\N	\N	\N	\N	2026-04-23 16:53:00.405	\N	Igoa	\N	\N	Fundadora	\N	ordinario	\N	\N	\N	\N
12	\N	Jesús	Huarte Alsua	\N	\N	\N	15657920A	1931-09-28	1991-03-01	12	H	Baja	\N	\N	\N	\N	2026-04-23 16:53:00.406	\N	Igoa	\N	\N	Fundadora	\N	ordinario	\N	\N	\N	\N
14	\N	Clemente	Larrayoz Etxarri	\N	\N	\N	15861403M	1918-09-22	1991-03-01	14	H	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.408	\N	Eltzaburu	\N	\N	Fundadora	\N	ordinario	\N	\N	\N	\N
15	\N	Felisa	Barberena Goñi	\N	\N	\N	15861329T	1924-10-30	1991-03-01	15	F	Baja	\N	\N	\N	\N	2026-04-23 16:53:00.409	\N	Eltzaburu	\N	\N	Fundadora	\N	ordinario	\N	\N	\N	\N
16	\N	Timoteo	Arce Zabaleta	\N	\N	\N	15862079Z	\N	1991-03-01	16	H	Baja	\N	\N	\N	\N	2026-04-23 16:53:00.41	\N	Suarbe	\N	\N	Fundadora	\N	ordinario	\N	\N	\N	\N
17	\N	Marcial	Etxeberria Orquin	\N	\N	\N	15861331W	1927-10-06	1991-03-01	17	H	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.411	\N	Eltzaburu	\N	\N	Fundadora	\N	ordinario	\N	\N	\N	\N
18	\N	Lucía	Etxenike Barberena	\N	\N	\N	15861745W	1933-09-19	1991-03-01	18	F	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.412	\N	Eltzaburu	\N	\N	Fundadora	\N	ordinario	\N	\N	\N	\N
19	\N	Luisa	De Carlos Garaikoetxea	\N	\N	\N	15632577Y	1915-10-09	1991-03-01	19	F	Baja	\N	\N	\N	\N	2026-04-23 16:53:00.413	\N	Ostitz	\N	\N	Fundadora	\N	ordinario	\N	\N	\N	\N
21	\N	domingo	Ciganda Ilarregi	\N	\N	\N	15861009W	1919-02-19	1991-03-01	21	H	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.415	\N	Larraintzar	\N	\N	Fundadora	\N	ordinario	\N	\N	\N	\N
22	\N	Francisco	Aranguren Juancorena	\N	\N	\N	15528703T	1928-05-06	1991-03-01	22	H	Baja	\N	\N	\N	\N	2026-04-23 16:53:00.416	\N	Beruete	\N	\N	Fundadora	\N	ordinario	\N	\N	\N	\N
23	\N	M Soledad	Aranguren Juancorena	\N	\N	\N	15745962R	1925-04-11	1991-03-01	23	F	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.417	\N	Beruete	\N	\N	Fundadora	\N	ordinario	\N	\N	\N	\N
24	\N	Nieves	Nuin Gorrosterazu	\N	\N	\N	72624623F	1926-08-03	1991-03-01	24	F	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.418	\N	auza	\N	\N	Fundadora	\N	ordinario	\N	\N	\N	\N
25	\N	Ignacio	Gascue Olasagarra	\N	\N	\N	15861019N	1927-04-12	1991-03-01	25	H	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.418	\N	Larraintzar	\N	\N	Fundadora	\N	ordinario	\N	\N	\N	\N
26	\N	Juan	Larrayoz Etxarri	\N	\N	\N	15861340B	1921-11-07	1991-03-01	26	H	Baja	\N	\N	\N	\N	2026-04-23 16:53:00.419	\N	Eltzaburu	\N	1994-12-22	Fundadora	\N	ordinario	\N	\N	\N	\N
27	\N	Felisa	Azcarate Oscoz	\N	\N	\N	15861359F	1930-01-27	1991-03-01	27	F	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.42	\N	Eltzaburu	\N	\N	Fundadora	\N	ordinario	\N	\N	\N	\N
29	\N	Isabel	Etxeverz Mikeltorena	\N	\N	\N	15723518M	1931-02-25	1991-03-01	29	F	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.422	\N	Olague	\N	\N	Fundadora	\N	ordinario	\N	\N	\N	\N
30	\N	Gregorio	Eugui Ciganda	\N	\N	\N	15650613X	1913-04-12	1991-03-01	30	H	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.423	\N	Beuntza	\N	\N	Fundadora	\N	ordinario	\N	\N	\N	\N
31	\N	Graciana	Arce Ciaurriz	\N	\N	\N	15861350K	1923-10-24	1991-03-01	31	F	Baja	\N	\N	\N	\N	2026-04-23 16:53:00.424	\N	Eltzaburu	\N	\N	Fundadora	\N	ordinario	\N	\N	\N	\N
32	\N	Antonio	Arce Ciaurriz	\N	\N	\N	15623957B	1916-10-19	1991-03-01	32	H	Baja	\N	\N	\N	\N	2026-04-23 16:53:00.424	\N	Eltzaburu	\N	1992-01-01	Fundadora	\N	ordinario	\N	\N	\N	\N
33	\N	José	Arce Larraintzar	\N	\N	\N	15746234C	1932-05-27	1991-03-01	33	H	Baja	\N	\N	\N	\N	2026-04-23 16:53:00.425	\N	Eltzaburu	\N	1999-02-14	Fundadora	\N	ordinario	\N	\N	\N	\N
34	\N	Juan	Guelbenzu Goñi	\N	\N	\N	15556113V	1921-10-15	1991-03-01	34	H	Baja	\N	\N	\N	\N	2026-04-23 16:53:00.426	\N	Arraitz	\N	\N	Fundadora	\N	ordinario	\N	\N	\N	\N
35	\N	M. Carmen	Morote Yoldi	\N	\N	\N	15526802P	1926-09-19	1991-09-01	35	F	Baja	\N	\N	\N	\N	2026-04-23 16:53:00.426	\N	Burutain	\N	\N	Fundadora	\N	ordinario	\N	\N	\N	\N
37	\N	Antonio	Larrayoz Goya	\N	\N	\N	15862683C	1922-06-10	1991-03-01	37	H	Baja	\N	\N	\N	\N	2026-04-23 16:53:00.428	\N	Arraitz	\N	\N	Fundadora	\N	ordinario	\N	\N	\N	\N
38	\N	Mikaela	Cía Arraras	\N	\N	\N	15657767B	1912-12-16	1991-03-01	38	F	Baja	\N	\N	\N	\N	2026-04-23 16:53:00.428	\N	Eltzaburu	\N	\N	Fundadora	\N	ordinario	\N	\N	\N	\N
39	\N	Sabino	Arangoa Irañeta	\N	\N	\N	15657758W	1912-02-09	1991-03-01	39	H	Baja	\N	\N	\N	\N	2026-04-23 16:53:00.429	\N	Beruete	\N	\N	Fundadora	\N	ordinario	\N	\N	\N	\N
40	\N	Isidoro	Navarro Begiristain	\N	\N	\N	15657790B	1918-02-05	1991-03-01	40	H	Baja	\N	\N	\N	\N	2026-04-23 16:53:00.43	\N	Iruña	\N	\N	Fundadora	\N	ordinario	\N	\N	\N	\N
41	\N	Viviriana	Aguirre Leciaga	\N	\N	\N	15657846K	1918-10-30	1991-03-01	41	F	Baja	\N	\N	\N	\N	2026-04-23 16:53:00.43	\N	Iruña	\N	\N	Fundadora	\N	ordinario	\N	\N	\N	\N
42	\N	M Camino	Tornaría Bengoetxea	\N	\N	\N	15855360B	1939-09-20	1991-03-01	42	F	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.431	\N	Auza	\N	\N	Fundadora	\N	ordinario	\N	\N	\N	\N
44	\N	Sofía	Iribarren Arangoa	\N	\N	\N	15861398T	1934-10-08	1991-03-01	44	F	Baja	\N	\N	\N	\N	2026-04-23 16:53:00.432	\N	Eltzaburu	\N	\N	Fundadora	\N	ordinario	\N	\N	\N	\N
45	\N	Modesto	Aguirre Laseca	\N	\N	\N	15861347H	1923-02-24	1991-03-01	45	H	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.433	\N	Eltzaburu	\N	\N	Fundadora	\N	ordinario	\N	\N	\N	\N
46	\N	María	Aldaz Ostiz	\N	\N	\N	15861348L	1913-08-03	1991-03-01	46	F	Baja	\N	\N	\N	\N	2026-04-23 16:53:00.433	\N	Eltzaburu	\N	\N	Fundadora	\N	ordinario	\N	\N	\N	\N
47	\N	Basilio	Arce Igoa	\N	\N	\N	15597031H	1918-02-24	1991-03-01	47	H	Baja	\N	\N	\N	\N	2026-04-23 16:53:00.434	\N	Eltzaburu	\N	\N	Fundadora	\N	ordinario	\N	\N	\N	\N
48	\N	M Angeles	Olaverría Ripa	\N	\N	\N	15724601F	1933-01-25	1996-01-01	48	F	Baja	\N	\N	\N	\N	2026-04-23 16:53:00.435	\N	Gendulain	\N	\N	Fundadora	\N	ordinario	\N	\N	\N	\N
49	\N	Manuel	Gurbindo Larrayoz	\N	\N	\N	72623771Y	1919-12-21	1991-03-01	49	H	Baja	\N	\N	\N	\N	2026-04-23 16:53:00.435	\N	Eltzaburu	\N	\N	Fundadora	\N	ordinario	\N	\N	\N	\N
50	\N	Pilar	Gurbindo Larrayoz	\N	\N	\N	15121491A	1927-01-30	1991-03-01	50	F	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.436	\N	Eltzaburu	\N	\N	Fundadora	\N	ordinario	\N	\N	\N	\N
52	\N	Juan	Esain Aguirre	\N	\N	\N	15861373K	1916-08-30	1991-03-01	52	H	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.437	\N	Eltzaburu	\N	1993-04-01	Fundadora	\N	ordinario	\N	\N	\N	\N
53	\N	Teresa	Ezcurra Erbiti	\N	\N	\N	15861382F	1922-10-15	1991-03-01	53	F	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.438	\N	Eltzaburu	\N	\N	Fundadora	\N	ordinario	\N	\N	\N	\N
54	\N	Miguel	Larrayoz Etxarri	\N	\N	\N	15861404Y	1909-11-30	1991-03-01	54	H	Baja	\N	\N	\N	\N	2026-04-23 16:53:00.439	\N	Eltzaburu	\N	\N	Fundadora	\N	ordinario	\N	\N	\N	\N
55	\N	Pilar	Cia Mutuberría	\N	\N	\N	15861366Z	1922-10-10	1991-03-01	55	F	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.439	\N	Eltzaburu	\N	\N	Fundadora	\N	ordinario	\N	\N	\N	\N
56	\N	José	Mutuberría Arce	\N	\N	\N	15861342J	1916-07-02	1991-03-01	56	H	Baja	\N	\N	\N	\N	2026-04-23 16:53:00.44	\N	Eltzaburu	\N	\N	Fundadora	\N	ordinario	\N	\N	\N	\N
57	\N	José	Zabalo Gascue	\N	\N	\N	15621311X	1921-01-20	1991-03-01	57	H	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.441	\N	Eltzaburu	\N	1998-11-23	Fundadora	\N	ordinario	\N	\N	\N	\N
58	\N	Luisa	Calzado Urroz	\N	\N	\N	15861362X	1928-09-01	1991-03-01	58	F	Baja	\N	\N	\N	\N	2026-04-23 16:53:00.442	\N	Eltzaburu	\N	\N	Fundadora	\N	ordinario	\N	\N	\N	\N
60	\N	Antonio	Martilla Expósito	\N	\N	\N	15628443N	1923-01-17	1991-03-01	60	H	Baja	\N	\N	\N	\N	2026-04-23 16:53:00.443	\N	Larraintzar	\N	\N	Fundadora	\N	ordinario	\N	\N	\N	\N
61	\N	Magdalena	Arce Zabaleta	\N	\N	\N	15861077R	1926-09-14	1991-03-01	61	F	Baja	\N	\N	\N	\N	2026-04-23 16:53:00.444	\N	Ilarregi	\N	\N	Fundadora	\N	ordinario	\N	\N	\N	\N
62	\N	Gregorio	Andonegui Lizarraga	\N	\N	\N	15703689W	1925-10-18	1991-03-01	62	H	Baja	\N	\N	\N	\N	2026-04-23 16:53:00.445	\N	Ilarregi	\N	\N	Fundadora	\N	ordinario	\N	\N	\N	\N
63	\N	Eusebio	Altuna Erice	\N	\N	\N	15861211C	1925-08-16	1991-03-01	63	H	Baja	\N	\N	\N	\N	2026-04-23 16:53:00.446	\N	Ilarregi	\N	\N	Fundadora	\N	ordinario	\N	\N	\N	\N
64	\N	Miguel Angel	Tornaría Bengoetxea	\N	\N	\N	72624632Q	1945-05-10	1991-03-01	64	H	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.447	\N	Auza	\N	\N	Fundadora	\N	ordinario	\N	\N	\N	\N
65	\N	Mikaela	Ripa Iraizoz	\N	\N	\N	15860977Q	1929-09-13	1991-03-01	65	F	Baja	\N	\N	\N	\N	2026-04-23 16:53:00.448	\N	Auza	\N	\N	Fundadora	\N	ordinario	\N	\N	\N	\N
66	\N	Josefa	Berasain Cía	\N	\N	\N	72624624P	1910-02-26	1991-03-01	66	F	Baja	\N	\N	\N	\N	2026-04-23 16:53:00.448	\N	Auza	\N	\N	Fundadora	\N	ordinario	\N	\N	\N	\N
67	\N	Nemesia	Azanza Larrión	\N	\N	\N	15861520F	1925-02-19	1991-03-01	67	F	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.449	\N	Auza	\N	\N	Fundadora	\N	ordinario	\N	\N	\N	\N
69	\N	Esteban	Ibero Insausti	\N	\N	\N	15624156A	1923-03-20	1991-03-01	69	H	Baja	\N	\N	\N	\N	2026-04-23 16:53:00.451	\N	Alkotz	\N	\N	Fundadora	\N	ordinario	\N	\N	\N	\N
71	\N	Juan	Oyarzun Macaya	\N	\N	\N	15862796H	1922-02-27	1991-03-01	71	H	Baja	\N	\N	\N	\N	2026-04-23 16:53:00.452	\N	Alkotz	\N	\N	Fundadora	\N	ordinario	\N	\N	\N	\N
72	\N	José Antonio	Arregui Arraras	\N	\N	\N	15218782G	1916-12-31	1991-03-01	72	H	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.453	\N	Alkotz	\N	\N	Fundadora	\N	ordinario	\N	\N	\N	\N
73	\N	Francisca	Elcano Esain	\N	\N	\N	15861746A	1919-08-17	1991-03-01	73	F	Baja	\N	\N	\N	\N	2026-04-23 16:53:00.454	\N	Alkotz	\N	\N	Fundadora	\N	ordinario	\N	\N	\N	\N
74	\N	Josefa	Olague Oskoz	\N	\N	\N	73623705S	1927-09-16	1991-03-01	74	F	Baja	\N	\N	\N	\N	2026-04-23 16:53:00.454	\N	Alkotz	\N	\N	Fundadora	\N	ordinario	\N	\N	\N	\N
75	\N	Mercedes	Barberena Ventura	\N	\N	\N	15721460V	1931-08-20	1991-03-01	75	F	Baja	\N	\N	\N	\N	2026-04-23 16:53:00.455	\N	Alkotz	\N	\N	Fundadora	\N	ordinario	\N	\N	\N	\N
77	\N	Pascasio	Barberena Olague	\N	\N	\N	15689689D	1918-11-18	1991-03-01	77	H	Baja	\N	\N	\N	\N	2026-04-23 16:53:00.456	\N	Alkotz	\N	\N	Fundadora	\N	ordinario	\N	\N	\N	\N
78	\N	Modesta	Galarza Garro	\N	\N	\N	15657859B	1920-06-15	1991-03-01	78	F	Baja	\N	\N	\N	\N	2026-04-23 16:53:00.456	\N	Beruete	\N	\N	Fundadora	\N	ordinario	\N	\N	\N	\N
79	\N	Miguel	Gastearena Churruca	\N	\N	\N	\N	1935-03-12	1991-03-01	79	H	Baja	\N	\N	\N	\N	2026-04-23 16:53:00.457	\N	Alkotz	\N	\N	Fundadora	\N	ordinario	\N	\N	\N	\N
80	\N	Eulalia	Recalde Ostiz	\N	\N	\N	15861055W	1937-02-05	1991-03-01	80	F	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.457	\N	Larraintzar	\N	\N	Fundadora	\N	ordinario	\N	\N	\N	\N
81	\N	Francisco	Ariztegi Elgorriaga	\N	\N	\N	15861003L	1924-11-05	1991-03-01	81	H	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.458	\N	Larraintzar	\N	\N	Fundadora	\N	ordinario	\N	\N	\N	\N
82	\N	Pedro	Larrainzar Erviti	\N	\N	\N	15861680Y	1928-06-11	1991-03-01	82	H	Baja	\N	\N	\N	\N	2026-04-23 16:53:00.458	\N	Arraitz	\N	2007-02-24	Fundadora	\N	ordinario	\N	\N	\N	\N
83	\N	Crescencia	Irañeta Zabala	\N	\N	\N	15658098C	1919-05-05	1991-03-01	83	F	Baja	\N	\N	\N	\N	2026-04-23 16:53:00.459	\N	Ola	\N	\N	Fundadora	\N	ordinario	\N	\N	\N	\N
84	\N	Juan	Barbería Balda	\N	\N	\N	15663171X	1919-11-04	1991-03-01	84	H	Baja	\N	\N	\N	\N	2026-04-23 16:53:00.459	\N	Orokieta	\N	\N	Fundadora	\N	ordinario	\N	\N	\N	\N
86	\N	Julian	Villanueva Sagardía	\N	\N	\N	15861589F	1917-11-09	1991-03-01	86	H	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.461	\N	Auza	\N	\N	Fundadora	\N	ordinario	\N	\N	\N	\N
87	\N	Juan	Berasain Arribillaga	\N	\N	\N	15717617S	1928-05-22	1991-03-01	87	H	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.461	\N	Auza	\N	\N	Fundadora	\N	ordinario	\N	\N	\N	\N
88	\N	Carmen	Ripa Iraizoz	\N	\N	\N	15527649G	1933-07-23	1991-03-01	88	F	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.462	\N	Arraitz	\N	\N	Fundadora	\N	ordinario	\N	\N	\N	\N
89	\N	Pedro	Alsúa Urkiola	\N	\N	\N	15628236N	1927-03-06	1991-03-01	89	H	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.462	\N	Ola	\N	\N	Fundadora	\N	ordinario	\N	\N	\N	\N
90	\N	M Teresa	Elizalde Insausti	\N	\N	\N	15657837N	1930-10-11	1991-03-01	90	F	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.463	\N	Beruete	\N	\N	Fundadora	\N	ordinario	\N	\N	\N	\N
91	\N	Manuel	Recondo Erbiti	\N	\N	\N	15657838J	1920-03-29	1991-03-01	91	H	Baja	\N	\N	\N	\N	2026-04-23 16:53:00.464	\N	Beruete	\N	\N	Fundadora	\N	ordinario	\N	\N	\N	\N
93	\N	Carmen	Irurita Zalba	\N	\N	\N	15641070N	1919-07-16	1991-03-01	93	F	Baja	\N	\N	\N	\N	2026-04-23 16:53:00.465	\N	Ostitz	\N	\N	Fundadora	\N	ordinario	\N	\N	\N	\N
94	\N	domingo	Otxotorena Barberena	\N	\N	\N	15657877Y	1911-07-07	1991-03-01	94	H	Baja	\N	\N	\N	\N	2026-04-23 16:53:00.465	\N	Beruete	\N	1994-12-31	Fundadora	\N	ordinario	\N	\N	\N	\N
95	\N	Simón	Altuna Erice	\N	\N	\N	15861073C	1919-09-03	1991-03-01	95	H	Baja	\N	\N	\N	\N	2026-04-23 16:53:00.466	\N	Suarbe	\N	1998-03-19	Fundadora	\N	ordinario	\N	\N	\N	\N
96	\N	Saturnino 	Irurita Zalba	\N	\N	\N	15628303X	1922-10-22	1991-03-01	96	H	Baja	\N	\N	\N	\N	2026-04-23 16:53:00.466	\N	Ostitz	\N	1997-01-26	Fundadora	\N	ordinario	\N	\N	\N	\N
97	\N	Javier	Begino Gastearena	\N	\N	\N	18210511P	1965-12-17	1991-03-01	97	H	Baja	\N	\N	\N	\N	2026-04-23 16:53:00.467	\N	Auza	\N	\N	Fundadora	\N	ordinario	\N	\N	\N	\N
98	\N	Nemesio	Oteiza Insausti	\N	\N	\N	15635831V	1909-02-20	1991-03-01	98	H	Baja	\N	\N	\N	\N	2026-04-23 16:53:00.467	\N	Ziaurritz	\N	\N	Fundadora	\N	ordinario	\N	\N	\N	\N
99	\N	Eugenio	Elcano Esain	\N	\N	\N	15730901M	1923-12-30	1991-03-01	99	H	Baja	\N	\N	\N	\N	2026-04-23 16:53:00.468	\N	Ziaurritz	\N	\N	Fundadora	\N	ordinario	\N	\N	\N	\N
101	\N	Antonio	Antaño Suescun	\N	\N	\N	15636970Y	1919-03-15	1991-03-01	101	H	Baja	\N	\N	\N	\N	2026-04-23 16:53:00.469	\N	Ziaurritz	\N	\N	Fundadora	\N	ordinario	\N	\N	\N	\N
102	\N	Isabel	Antaño Suescun	\N	\N	\N	15636487Y	1930-07-08	1991-03-01	102	F	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.47	\N	Ziaurritz	\N	\N	Fundadora	\N	ordinario	\N	\N	\N	\N
103	\N	Beatriz	Noain Insausti	\N	\N	\N	15697912K	1940-06-29	1991-03-01	103	F	Baja	\N	\N	\N	\N	2026-04-23 16:53:00.47	\N	Ziaurritz	\N	\N	Fundadora	\N	ordinario	\N	\N	\N	\N
104	\N	Jesús	Ozcoidi Soto	\N	\N	\N	15724521L	1934-07-01	1991-03-01	104	H	Baja	\N	\N	\N	\N	2026-04-23 16:53:00.471	\N	Ziaurritz	\N	\N	Fundadora	\N	ordinario	\N	\N	\N	\N
105	\N	Martín	Ozcoidi Soto	\N	\N	\N	15737940Y	1928-11-12	1991-03-01	105	H	Baja	\N	\N	\N	\N	2026-04-23 16:53:00.472	\N	Ziaurritz	\N	\N	Fundadora	\N	ordinario	\N	\N	\N	\N
106	\N	Cristina	Espelosín Olague	\N	\N	\N	15861644Q	1927-07-22	1991-03-01	106	F	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.472	\N	Arraitz	\N	\N	Fundadora	\N	ordinario	\N	\N	\N	\N
107	\N	Felipe	Egozcue Hualde	\N	\N	\N	15857115H	1913-08-24	1991-03-01	107	H	Baja	\N	\N	\N	\N	2026-04-23 16:53:00.473	\N	Olague	\N	\N	Fundadora	\N	ordinario	\N	\N	\N	\N
109	\N	Pedro	Senosiain Etxarri	\N	\N	\N	15857141K	1925-07-11	1991-03-01	109	H	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.474	\N	Olague	\N	\N	Fundadora	\N	ordinario	\N	\N	\N	\N
110	\N	Cesareo	Seminario Arrieta	\N	\N	\N	15857228Q	1925-08-31	1991-03-01	110	H	Baja	\N	\N	\N	\N	2026-04-23 16:53:00.474	\N	Olague	\N	\N	Fundadora	\N	ordinario	\N	\N	\N	\N
111	\N	José M	Juanbeltz Garmendia	\N	\N	\N	15657880D	1921-09-28	1991-03-01	111	H	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.475	\N	Beruete	\N	\N	Fundadora	\N	ordinario	\N	\N	\N	\N
112	\N	Fidel	Barberena Descarga	\N	\N	\N	15657817S	1917-04-24	1991-03-01	112	H	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.475	\N	Beruete	\N	\N	Fundadora	\N	ordinario	\N	\N	\N	\N
113	\N	Ignacia	Etxarri Lopez	\N	\N	\N	15533264F	1925-08-31	1991-03-01	113	F	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.476	\N	Beruete	\N	\N	Fundadora	\N	ordinario	\N	\N	\N	\N
114	\N	Joaquina	Etxegia Lasarte	\N	\N	\N	15657938K	1935-02-17	1991-03-01	114	F	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.476	\N	Beruete	\N	\N	Fundadora	\N	ordinario	\N	\N	\N	\N
116	\N	Francisco	Mariezcurrena 	\N	\N	\N	15861372C	1924-09-03	1991-03-01	116	H	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.478	\N	Auza	\N	\N	Fundadora	\N	ordinario	\N	\N	\N	\N
117	\N	Pedro M	Alvarez garbisu	\N	\N	\N	15857145W	1930-10-24	1991-03-01	117	H	Baja	\N	\N	\N	\N	2026-04-23 16:53:00.478	\N	Olague	\N	\N	Fundadora	\N	ordinario	\N	\N	\N	\N
118	\N	Isabel	Aguirre garbisu	\N	\N	\N	15861272N	1939-06-13	1991-03-01	118	F	Baja	\N	\N	\N	\N	2026-04-23 16:53:00.479	\N	Olague	\N	\N	Fundadora	\N	ordinario	\N	\N	\N	\N
119	\N	Martín	Elizondo Aragón	\N	\N	\N	15545590M	1922-08-14	1991-03-01	119	H	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.479	\N	Latasa	\N	\N	Fundadora	\N	ordinario	\N	\N	\N	\N
120	\N	Rosa	Oronoz Ibarra	\N	\N	\N	15861294B	1926-09-13	1991-03-01	120	F	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.48	\N	Guerendiain	\N	\N	Fundadora	\N	ordinario	\N	\N	\N	\N
121	\N	Isabel	Anduaga Anduaga	\N	\N	\N	15544347G	1927-07-08	1991-03-01	121	F	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.48	\N	Auza	\N	\N	Fundadora	\N	ordinario	\N	\N	\N	\N
122	\N	Lucio	Esain Alsua	\N	\N	\N	15658090N	1921-08-08	1991-03-01	122	H	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.48	\N	Orokieta	\N	\N	Fundadora	\N	ordinario	\N	\N	\N	\N
124	\N	Carmen	Aguirre Etxeberría	\N	\N	\N	15861271B	1934-11-03	1991-03-01	124	F	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.481	\N	Gerendiain	\N	\N	Fundadora	\N	ordinario	\N	\N	\N	\N
125	\N	José Miguel	Picabea Erice	\N	\N	\N	15861297Z	1924-04-15	1991-03-01	125	H	Baja	\N	\N	\N	\N	2026-04-23 16:53:00.482	\N	Gerendiain	\N	\N	Fundadora	\N	ordinario	\N	\N	\N	\N
126	\N	Mercedes 	Aguirre Etxeberría	\N	\N	\N	15681273B	1932-02-19	1991-03-01	126	F	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.482	\N	Gerendiain	\N	\N	Fundadora	\N	ordinario	\N	\N	\N	\N
127	\N	Daniel	Navas Salas	\N	\N	\N	15861267F	1926-09-12	1991-03-01	127	H	Baja	\N	\N	\N	\N	2026-04-23 16:53:00.483	\N	Gerendiain	\N	\N	Fundadora	\N	ordinario	\N	\N	\N	\N
128	\N	Josefa	Esain Narvaez	\N	\N	\N	15861378A	1930-12-19	1991-03-01	128	F	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.484	\N	Auza	\N	\N	Fundadora	\N	ordinario	\N	\N	\N	\N
129	\N	Fermina	Azpilche Almirantearena	\N	\N	\N	15207862D	1926-02-22	1991-03-01	129	F	Baja	\N	\N	\N	\N	2026-04-23 16:53:00.485	\N	Alkotz	\N	\N	Fundadora	\N	ordinario	\N	\N	\N	\N
130	\N	Josefa 	Tornaría Aldaz	\N	\N	\N	15861580K	1912-02-22	1991-03-01	130	F	Baja	\N	\N	\N	\N	2026-04-23 16:53:00.486	\N	Auza	\N	\N	Fundadora	\N	ordinario	\N	\N	\N	\N
132	\N	José	Erasun Urriza	\N	\N	\N	15861533C	1918-03-03	1991-03-01	132	H	Baja	\N	\N	\N	\N	2026-04-23 16:53:00.487	\N	Auza	\N	\N	Fundadora	\N	ordinario	\N	\N	\N	\N
133	\N	Teresa	Etulain Orrio	\N	\N	\N	15655230G	1917-03-28	1991-03-01	133	F	Baja	\N	\N	\N	\N	2026-04-23 16:53:00.487	\N	Gelbentzu	\N	\N	Fundadora	\N	ordinario	\N	\N	\N	\N
134	\N	Presentación	Perez Galilea	\N	\N	\N	15662787V	1915-11-21	1991-03-01	134	F	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.488	\N	Orokieta	\N	\N	Fundadora	\N	ordinario	\N	\N	\N	\N
135	\N	Lucasa	Arano Olano	\N	\N	\N	15657824E	1918-10-18	1991-03-01	135	F	Baja	\N	\N	\N	\N	2026-04-23 16:53:00.489	\N	Beruete	\N	\N	Fundadora	\N	ordinario	\N	\N	\N	\N
136	\N	M Pilar	Arangoa Arangoa	\N	\N	\N	15657887Q	1934-04-20	1991-03-01	136	F	Baja	\N	\N	\N	\N	2026-04-23 16:53:00.49	\N	Beruete	\N	\N	Fundadora	\N	ordinario	\N	\N	\N	\N
137	\N	Micaela	Urtasun Iribarren	\N	\N	\N	15861260T	1931-12-17	1991-03-01	137	F	Baja	\N	\N	\N	\N	2026-04-23 16:53:00.49	\N	Ilarregi	\N	\N	Fundadora	\N	ordinario	\N	\N	\N	\N
141	\N	Benita	Sasturain Alberro	\N	\N	\N	15657538N	1923-11-25	1991-03-01	141	F	Baja	\N	\N	\N	\N	2026-04-23 16:53:00.492	\N	Jauntsarats 	\N	\N	Fundadora	\N	ordinario	\N	\N	\N	\N
142	\N	Alfonso	Cestau Goikoetxea	\N	\N	\N	15856696J	1935-04-15	1991-03-01	142	H	Baja	\N	\N	\N	\N	2026-04-23 16:53:00.493	\N	Jauntsarats 	\N	\N	Fundadora	\N	ordinario	\N	\N	\N	\N
143	\N	Francisca	Sasturain Alberro	\N	\N	\N	15657540Z	1925-12-03	1991-03-01	143	F	Baja	\N	\N	\N	\N	2026-04-23 16:53:00.493	\N	Jauntsarats 	\N	\N	Fundadora	\N	ordinario	\N	\N	\N	\N
144	\N	M. Pilar	Latasa Iriarte	\N	\N	\N	15657585J	1934-10-12	1991-03-01	144	F	Baja	\N	\N	\N	\N	2026-04-23 16:53:00.494	\N	Jauntsarats 	\N	\N	Fundadora	\N	ordinario	\N	\N	\N	\N
145	\N	Juan	Cestau Goikoetxea	\N	\N	\N	15856697Z	1926-01-12	1991-03-01	145	H	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.495	\N	\N	\N	\N	Fundadora	\N	ordinario	\N	\N	\N	\N
146	\N	Juan	Redín Iragui	\N	\N	\N	15567135E	1927-11-04	1991-03-01	146	H	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.495	\N	Arraitz	\N	\N	Fundadora	\N	ordinario	\N	\N	\N	\N
147	\N	Eusebia	Aríztegui Iragui	\N	\N	\N	15861612F	1927-03-06	1991-03-01	147	F	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.496	\N	Arraitz	\N	\N	Fundadora	\N	ordinario	\N	\N	\N	\N
149	\N	Ambrosio	Elizalde Villanueva	\N	\N	\N	15861217A	1924-07-19	1991-03-01	149	H	Baja	\N	\N	\N	\N	2026-04-23 16:53:00.497	\N	Ilarregi	\N	\N	Fundadora	\N	ordinario	\N	\N	\N	\N
150	\N	luis	Gascue Olague	\N	\N	\N	15861539A	1923-11-29	1991-03-01	150	H	Baja	\N	\N	\N	\N	2026-04-23 16:53:00.497	\N	Auza	\N	\N	Fundadora	\N	ordinario	\N	\N	\N	\N
151	\N	Juan	Esandia Lopez	\N	\N	\N	15861595J	1925-12-27	1991-03-01	151	H	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.498	\N	Arraitz	\N	\N	Fundadora	\N	ordinario	\N	\N	\N	\N
152	\N	Goñi	Etulain Azcarate	\N	\N	\N	15857173F	1924-12-24	1991-03-01	152	H	Baja	\N	\N	\N	\N	2026-04-23 16:53:00.498	\N	Olague	\N	\N	Fundadora	\N	ordinario	\N	\N	\N	\N
153	\N	Mariano	Ciganda Ostiz	\N	\N	\N	15646873L	1910-06-06	1991-03-01	153	H	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.498	\N	Latasa	\N	\N	Fundadora	\N	ordinario	\N	\N	\N	\N
154	\N	Ignacio	Astearan Oyarzun	\N	\N	\N	15861820P	1912-02-10	1991-03-01	154	H	Baja	\N	\N	\N	\N	2026-04-23 16:53:00.499	\N	Auza	\N	\N	Fundadora	\N	ordinario	\N	\N	\N	\N
155	\N	Martín	Elizalde Urtasun	\N	\N	\N	15839225E	1958-10-14	1991-03-01	155	H	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.499	\N	Ilarregi	\N	\N	Fundadora	\N	ordinario	\N	\N	\N	\N
157	\N	Martín	Olaberria Ripa	\N	\N	\N	72622881J	1928-12-11	1991-03-01	157	H	Baja	\N	\N	\N	\N	2026-04-23 16:53:00.5	\N	Gendulain	\N	2007-02-21	Fundadora	\N	ordinario	\N	\N	\N	\N
158	\N	Martina	Olaberria Ripa	\N	\N	\N	37700924Z	1923-11-27	1991-03-01	158	F	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.501	\N	Gendulain	\N	\N	Fundadora	\N	ordinario	\N	\N	\N	\N
159	\N	Alfonsa	Etxarri Lopez	\N	\N	\N	15657827W	1927-08-04	1991-03-01	159	F	Baja	\N	\N	\N	\N	2026-04-23 16:53:00.502	\N	Beruete	\N	\N	Fundadora	\N	ordinario	\N	\N	\N	\N
160	\N	Concepción	Arangoa Goizueta	\N	\N	\N	15657715M	1939-12-08	1991-03-01	160	F	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.502	\N	Beruete	\N	\N	Fundadora	\N	ordinario	\N	\N	\N	\N
161	\N	Pedro	Telletxea Munarriz	\N	\N	\N	15657818Q	1925-04-26	1991-03-01	161	H	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.503	\N	Beruete	\N	\N	Fundadora	\N	ordinario	\N	\N	\N	\N
162	\N	Miguel	Tellechea Arangoa	\N	\N	\N	15657752L	1919-09-07	1991-03-01	162	H	Baja	\N	\N	\N	\N	2026-04-23 16:53:00.503	\N	Beruete	\N	\N	Fundadora	\N	ordinario	\N	\N	\N	\N
163	\N	Francisco	Erice Etxaleku	\N	\N	\N	15631807H	1914-03-07	1991-03-01	163	H	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.504	\N	Gendulain	\N	\N	Fundadora	\N	ordinario	\N	\N	\N	\N
165	\N	Dolores	Muguiro Urquiola	\N	\N	\N	15861190E	1926-03-25	1991-03-01	165	F	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.504	\N	Iraizotz	\N	\N	Fundadora	\N	ordinario	\N	\N	\N	\N
166	\N	José	Anduaga Anduaga	\N	\N	\N	15544136T	1925-07-08	1991-03-01	166	H	Baja	\N	\N	\N	\N	2026-04-23 16:53:00.505	\N	Auza	\N	1998-09-05	Fundadora	\N	ordinario	\N	\N	\N	\N
167	\N	Gregoria	Diez de Ulzurrun 	\N	\N	\N	70624625C	1925-09-30	1991-03-01	167	F	Baja	\N	\N	\N	\N	2026-04-23 16:53:00.505	\N	Auza	\N	\N	Fundadora	\N	ordinario	\N	\N	\N	\N
168	\N	M. Asunción	Arce Olaetxea	\N	\N	\N	15861276Q	1923-11-15	1991-03-01	168	F	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.506	\N	Gerendiain	\N	\N	Fundadora	\N	ordinario	\N	\N	\N	\N
169	\N	M. Luisa	Mutuberría Cia	\N	\N	\N	72634217X	1945-02-28	1991-03-01	169	F	Baja	\N	\N	\N	\N	2026-04-23 16:53:00.507	\N	Alkotz	\N	\N	Fundadora	\N	ordinario	\N	\N	\N	\N
170	\N	Cándida	Ilarregui Lerindegu	\N	\N	\N	15756432Y	1940-07-20	1991-03-01	170	F	Baja	\N	\N	\N	\N	2026-04-23 16:53:00.507	\N	Alkotz	\N	\N	Fundadora	\N	ordinario	\N	\N	\N	\N
172	\N	Ascensión	Aranburu Lasaga	\N	\N	\N	15861610M	1920-05-11	1991-03-01	172	F	Baja	\N	\N	\N	\N	2026-04-23 16:53:00.508	\N	Arraitz	\N	\N	Fundadora	\N	ordinario	\N	\N	\N	\N
173	\N	Antonio	Aldaz Ibero	\N	\N	\N	15861510C	1924-12-09	1991-03-01	173	H	Baja	\N	\N	\N	\N	2026-04-23 16:53:00.509	\N	Auza	\N	\N	Fundadora	\N	ordinario	\N	\N	\N	\N
174	\N	Miguel	Ezcurra Erviti	\N	\N	\N	15623869S	1927-07-16	1991-03-01	174	H	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.509	\N	Arraitz	\N	\N	Fundadora	\N	ordinario	\N	\N	\N	\N
175	\N	Graciana	Hualde Lopez	\N	\N	\N	15861249N	1925-09-08	1991-03-01	175	F	Baja	\N	\N	\N	\N	2026-04-23 16:53:00.51	\N	Ilarregi	\N	\N	Fundadora	\N	ordinario	\N	\N	\N	\N
176	\N	Mercedes	Balda Mariezcuurrena	\N	\N	\N	15658082G	1914-09-24	1991-03-01	176	F	Baja	\N	\N	\N	\N	2026-04-23 16:53:00.51	\N	Orokieta	\N	\N	Fundadora	\N	ordinario	\N	\N	\N	\N
177	\N	Juanita	Bildarraz Arregui	\N	\N	\N	15756935A	1930-04-25	1991-03-01	177	F	Baja	\N	\N	\N	\N	2026-04-23 16:53:00.511	\N	Beruete	\N	\N	Fundadora	\N	ordinario	\N	\N	\N	\N
178	\N	Martín	Arrarats Aguirre	\N	\N	\N	15657799C	1919-12-11	1991-03-01	178	H	Baja	\N	\N	\N	\N	2026-04-23 16:53:00.512	\N	Beruete	\N	\N	Fundadora	\N	ordinario	\N	\N	\N	\N
179	\N	Concepción	Esain Garro	\N	\N	\N	15861242M	1926-10-19	1991-03-01	179	F	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.512	\N	Ostitz	\N	\N	Fundadora	\N	ordinario	\N	\N	\N	\N
181	\N	Victoriano	Erice Esain	\N	\N	\N	15738785T	1919-09-18	1991-03-01	181	H	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.513	\N	Ostitz	\N	\N	Fundadora	\N	ordinario	\N	\N	\N	\N
182	\N	Rosa	Vizcarrondo Imaz	\N	\N	\N	72618868W	1941-02-23	1991-03-01	182	F	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.514	\N	Etulain	\N	\N	Fundadora	\N	ordinario	\N	\N	\N	\N
183	\N	Meltxor	Vizcarrondo Imaz	\N	\N	\N	72642154N	1928-05-29	1991-03-01	183	H	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.514	\N	Etulain	\N	\N	Fundadora	\N	ordinario	\N	\N	\N	\N
184	\N	Antonio	Mariñelarena Lusarreta	\N	\N	\N	15857389Q	1915-07-01	1991-03-01	184	H	Baja	\N	\N	\N	\N	2026-04-23 16:53:00.515	\N	Etulain	\N	\N	Fundadora	\N	ordinario	\N	\N	\N	\N
185	\N	Sabino	Cenoz Barbería	\N	\N	\N	15861620S	1926-01-26	1991-03-01	185	H	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.515	\N	Arraitz	\N	\N	Fundadora	\N	ordinario	\N	\N	\N	\N
187	\N	Francisco	Aizpurua Descarga	\N	\N	\N	72609491D	1928-07-07	1991-03-01	187	H	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.516	\N	Auza	\N	\N	Fundadora	\N	ordinario	\N	\N	\N	\N
188	\N	M Carmen	Larrainzar Ostiz	\N	\N	\N	15861562A	1931-02-27	1991-03-01	188	F	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.517	\N	Auza	\N	\N	Fundadora	\N	ordinario	\N	\N	\N	\N
189	\N	Prudencio	Erasun Urriza	\N	\N	\N	15861534K	1914-09-15	1991-03-01	189	H	Baja	\N	\N	\N	\N	2026-04-23 16:53:00.517	\N	Auza	\N	\N	Fundadora	\N	ordinario	\N	\N	\N	\N
190	\N	M Paz	Aizpurua Descarga	\N	\N	\N	15861507V	1924-05-10	1991-03-01	190	F	Baja	\N	\N	\N	\N	2026-04-23 16:53:00.518	\N	Auza	\N	\N	Fundadora	\N	ordinario	\N	\N	\N	\N
191	\N	Micaela	Oricain Landa	\N	\N	\N	15657006D	1927-05-08	1991-03-01	191	F	Baja	\N	\N	\N	\N	2026-04-23 16:53:00.518	\N	Erbiti	\N	\N	Fundadora	\N	ordinario	\N	\N	\N	\N
192	\N	Martín	Goya Goñi	\N	\N	\N	15728272K	1929-03-29	1991-10-01	192	H	Baja	\N	\N	\N	\N	2026-04-23 16:53:00.519	\N	Eltzaburu	\N	\N	Fundadora	\N	ordinario	\N	\N	\N	\N
193	\N	M Angeles	Echeberria Orkin	\N	\N	\N	15861370H	1932-02-06	1991-10-01	193	F	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.519	\N	Eltzaburu	\N	\N	Fundadora	\N	ordinario	\N	\N	\N	\N
194	\N	Francisca	Garro Landa	\N	\N	\N	15657994P	1929-10-24	1991-03-01	194	F	Baja	\N	\N	\N	\N	2026-04-23 16:53:00.52	\N	Erbiti	\N	\N	Fundadora	\N	ordinario	\N	\N	\N	\N
196	\N	M.Visitación	Lizarraga Goizueta	\N	\N	\N	72639343F	1920-04-15	1991-10-01	196	F	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.521	\N	Beramendi	\N	\N	Fundadora	\N	ordinario	\N	\N	\N	\N
197	\N	Manuela	Barrenetxea Latasa	\N	\N	\N	72610779D	1931-09-29	1991-10-01	197	F	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.521	\N	Udabe	\N	\N	Fundadora	\N	ordinario	\N	\N	\N	\N
198	\N	Elias	Goñi Gelbenzu	\N	\N	\N	15851117T	1907-12-08	1991-10-01	198	H	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.522	\N	Iraizotz	\N	1992-08-26	Fundadora	\N	ordinario	\N	\N	\N	\N
199	\N	Martín	Azpiroz Iriarte	\N	\N	\N	15657793Z	1924-08-21	1991-03-01	199	H	Baja	\N	\N	\N	\N	2026-04-23 16:53:00.522	\N	Beruete	\N	\N	Fundadora	\N	ordinario	\N	\N	\N	\N
200	\N	Mikaela	Miqueo Zabaleta	\N	\N	\N	15657798L	1926-05-23	1991-03-01	200	F	Baja	\N	\N	\N	\N	2026-04-23 16:53:00.523	\N	Beruete	\N	\N	Fundadora	\N	ordinario	\N	\N	\N	\N
201	\N	Rosalía	Elcano Irigoyen	\N	\N	\N	15860962R	1926-09-02	1991-03-01	201	F	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.523	\N	Urritzola	\N	\N	Fundadora	\N	ordinario	\N	\N	\N	\N
202	\N	Pedro	Cía Herrera	\N	\N	\N	15860958C	1921-06-28	1991-03-01	202	H	Baja	\N	\N	\N	\N	2026-04-23 16:53:00.523	\N	Urritzola	\N	\N	Fundadora	\N	ordinario	\N	\N	\N	\N
204	\N	Florencio	Villabona Balda	\N	\N	\N	15861206S	1922-10-22	1991-03-01	204	H	Baja	\N	\N	\N	\N	2026-04-23 16:53:00.524	\N	Iraizotz	\N	2007-01-23	Fundadora	\N	ordinario	\N	\N	\N	\N
205	\N	Pedro	Landiribar Cenoz	\N	\N	\N	16860969Z	1923-12-17	1991-03-01	205	H	Baja	\N	\N	\N	\N	2026-04-23 16:53:00.525	\N	Urritzola	\N	\N	Fundadora	\N	ordinario	\N	\N	\N	\N
206	\N	Matilde	Barberena Erroizarena	\N	\N	\N	15860952Z	1928-08-30	1991-03-01	206	F	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.526	\N	Urritzola	\N	\N	Fundadora	\N	ordinario	\N	\N	\N	\N
207	\N	José Manuel	San Miguel Ripa	\N	\N	\N	15742737L	1934-01-04	1991-03-01	207	H	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.526	\N	Anotzibar	\N	\N	Fundadora	\N	ordinario	\N	\N	\N	\N
209	\N	Angeles	Altuna Erice	\N	\N	\N	15861072L	1930-10-10	1991-03-01	209	F	Baja	\N	\N	\N	\N	2026-04-23 16:53:00.527	\N	Suarbe	\N	\N	Fundadora	\N	ordinario	\N	\N	\N	\N
210	\N	Francisco	Iribarren Toval	\N	\N	\N	15861093V	1926-10-22	1991-03-01	210	H	Baja	\N	\N	\N	\N	2026-04-23 16:53:00.528	\N	Suarbe	\N	\N	Fundadora	\N	ordinario	\N	\N	\N	\N
211	\N	María	Mendikoa Esposito	\N	\N	\N	15657858X	1928-07-16	1991-03-01	211	F	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.529	\N	Eltso	\N	\N	Fundadora	\N	ordinario	\N	\N	\N	\N
213	\N	Isabel	Iraizoz Mariezcurrena	\N	\N	\N	15861475P	1920-04-17	1991-03-01	213	F	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.53	\N	zenotz	\N	\N	Fundadora	\N	ordinario	\N	\N	\N	\N
214	\N	Elvira	Irurita Esain	\N	\N	\N	15875366F	1922-02-05	1991-03-01	214	F	Baja	\N	\N	\N	\N	2026-04-23 16:53:00.531	\N	Aritzu	\N	\N	Fundadora	\N	ordinario	\N	\N	\N	\N
215	\N	José	Urdaniz Lizarraga	\N	\N	\N	15857375W	1913-11-25	1991-03-01	215	H	Baja	\N	\N	\N	\N	2026-04-23 16:53:00.532	\N	Aritzu	\N	\N	Fundadora	\N	ordinario	\N	\N	\N	\N
216	\N	Julian	Urteaga Ihaben	\N	\N	\N	15857377G	1937-03-26	1991-03-01	216	H	Baja	\N	\N	\N	\N	2026-04-23 16:53:00.532	\N	Aritzu	\N	2007-05-11	Fundadora	\N	ordinario	\N	\N	\N	\N
217	\N	Francisco	Landa Iribarren	\N	\N	\N	15861556C	1928-07-11	1992-01-01	217	H	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.533	\N	Auza	\N	\N	Fundadora	\N	ordinario	\N	\N	\N	\N
218	\N	Matías	Larrainzar Erbiti	\N	\N	\N	15861679M	1933-01-15	1991-03-01	218	H	Baja	\N	\N	\N	\N	2026-04-23 16:53:00.533	\N	Eltso	\N	\N	Fundadora	\N	ordinario	\N	\N	\N	\N
220	\N	Josefa	Azpiroz Lizaso	\N	\N	\N	15698505Q	1921-04-15	1991-03-01	220	F	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.534	\N	Erripa	\N	\N	Fundadora	\N	ordinario	\N	\N	\N	\N
221	\N	Benita	Zarranz Aguinaga	\N	\N	\N	15638506R	1939-12-15	1991-03-01	221	F	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.534	\N	Erripa	\N	\N	Fundadora	\N	ordinario	\N	\N	\N	\N
222	\N	Restituto	Oyarzun Gracinena	\N	\N	\N	15860877P	1912-12-08	1992-01-01	222	H	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.535	\N	Iruña	\N	\N	Fundadora	\N	ordinario	\N	\N	\N	\N
223	\N	Rosario	Echandi Lizaso	\N	\N	\N	15860900P	1926-10-05	1992-01-01	223	F	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.536	\N	Iruña	\N	2023-01-01	Fundadora	\N	ordinario	\N	\N	\N	\N
224	\N	Josefa	Sala Huarte	\N	\N	\N	15657562J	1930-06-21	1991-03-01	224	F	Baja	\N	\N	\N	\N	2026-04-23 16:53:00.536	\N	Itsaso	\N	\N	Fundadora	\N	ordinario	\N	\N	\N	\N
225	\N	Manuel	Ansorena Balda	\N	\N	\N	15657564S	1925-01-01	1991-03-01	225	H	Baja	\N	\N	\N	\N	2026-04-23 16:53:00.537	\N	Itsaso	\N	\N	Fundadora	\N	ordinario	\N	\N	\N	\N
227	\N	Marino	Ruiz Hernando	\N	\N	\N	15165492M	1923-01-31	1991-03-01	227	H	Baja	\N	\N	\N	\N	2026-04-23 16:53:00.538	\N	Ilarregi	\N	2018-01-01	Fundadora	\N	ordinario	\N	\N	\N	\N
228	\N	M. Isabel	Elizondo Beruete	\N	\N	\N	15860902X	1925-04-15	1991-03-01	228	F	Baja	\N	\N	\N	\N	2026-04-23 16:53:00.538	\N	Lizaso	\N	\N	Fundadora	\N	ordinario	\N	\N	\N	\N
229	\N	Pedro M.	Ancizu Eguaras	\N	\N	\N	15860881N	1923-12-17	1991-03-01	229	H	Baja	\N	\N	\N	\N	2026-04-23 16:53:00.539	\N	Lizaso	\N	\N	Fundadora	\N	ordinario	\N	\N	\N	\N
230	\N	M. Carmen	Goldaraz Lizaso	\N	\N	\N	72623729X	1926-12-09	1992-01-01	230	F	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.539	\N	Iraizotz	\N	\N	Fundadora	\N	ordinario	\N	\N	\N	\N
231	\N	Bautista	Arangoa Oreja	\N	\N	\N	15640802C	1923-05-27	1991-03-01	231	F	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.539	\N	Arrarats	\N	\N	Fundadora	\N	ordinario	\N	\N	\N	\N
232	\N	Maritxu	Garro Iribarren	\N	\N	\N	15657989A	1931-11-24	1992-01-01	232	F	Baja	\N	\N	\N	\N	2026-04-23 16:53:00.54	\N	Alkotz	\N	\N	Fundadora	\N	ordinario	\N	\N	\N	\N
234	\N	José M.	Goñi Gelbenzu	\N	\N	\N	15861118L	1912-03-08	1991-03-01	234	H	Baja	\N	\N	\N	\N	2026-04-23 16:53:00.541	\N	Iraizotz	\N	\N	Fundadora	\N	ordinario	\N	\N	\N	\N
235	\N	Julian	Aguirre Arce	\N	\N	\N	15861130P	1924-03-22	1991-03-01	235	H	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.541	\N	Iraizotz	\N	\N	Fundadora	\N	ordinario	\N	\N	\N	\N
236	\N	Martín	Juanena Iribarren	\N	\N	\N	15859864F	1939-04-27	1992-04-01	236	H	Baja	\N	\N	\N	\N	2026-04-23 16:53:00.542	\N	Oronoz	\N	\N	Fundadora	\N	ordinario	\N	\N	\N	\N
237	\N	Crescen	Noain Insausti	\N	\N	\N	72618718J	1946-12-18	1992-04-01	237	F	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.542	\N	Orokieta	\N	\N	Fundadora	\N	ordinario	\N	\N	\N	\N
238	\N	M.Pilar	Legarrea Irure	\N	\N	\N	15861044Z	1927-04-21	1992-05-01	238	F	Baja	\N	\N	\N	\N	2026-04-23 16:53:00.543	\N	Larraintzar	\N	2023-01-01	Fundadora	\N	ordinario	\N	\N	\N	\N
240	\N	Martina	Landa Martiarena	\N	\N	\N	15851298C	1911-11-12	1992-10-01	240	F	Baja	\N	\N	\N	\N	2026-04-23 16:53:00.544	\N	Erbiti	\N	\N	Fundadora	\N	ordinario	\N	\N	\N	\N
241	\N	Daniel	Aranburu Goikoetxea	\N	\N	\N	15635443C	1912-12-10	1992-10-01	241	H	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.544	\N	Erbiti	\N	1993-01-05	Fundadora	\N	ordinario	\N	\N	\N	\N
242	\N	M Angeles	Echandi Lizaso	\N	\N	\N	15861145T	1928-03-01	1991-03-01	242	F	Baja	\N	\N	\N	\N	2026-04-23 16:53:00.545	\N	Iraizotz	\N	\N	Fundadora	\N	ordinario	\N	\N	\N	\N
243	\N	Julian	Urrutia Lasaga	\N	\N	\N	15861202B	1923-07-30	1991-03-01	243	H	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.545	\N	Iraizotz	\N	\N	Fundadora	\N	ordinario	\N	\N	\N	\N
244	\N	Purificación	Urrutia Lasaga	\N	\N	\N	15861203N	1925-02-02	1991-03-01	244	F	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.545	\N	Iraizotz	\N	\N	Fundadora	\N	ordinario	\N	\N	\N	\N
245	\N	Julian	Zenoz                         Urteaga	\N	\N	\N	15637929E	1925-02-16	1992-05-01	245	H	Baja	\N	\N	\N	\N	2026-04-23 16:53:00.546	\N	Latasa	\N	\N	Fundadora	\N	ordinario	\N	\N	\N	\N
247	\N	Francisco	Sala Elizondo	\N	\N	\N	15861798D	1931-03-09	1992-06-01	247	H	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.547	\N	Alkotz	\N	\N	Fundadora	\N	ordinario	\N	\N	\N	\N
248	\N	María	Oronoz Ibarra	\N	\N	\N	15861443E	1933-06-08	1992-07-01	248	F	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.547	\N	Aritzu	\N	\N	Fundadora	\N	ordinario	\N	\N	\N	\N
249	\N	Cruz	Echeverz Barberena	\N	\N	\N	15651361E	1925-05-01	1992-07-01	249	H	Baja	\N	\N	\N	\N	2026-04-23 16:53:00.548	\N	Aritzu	\N	\N	Fundadora	\N	ordinario	\N	\N	\N	\N
250	\N	Isidoro	Lizarraga Aranguren	\N	\N	\N	15857283W	1921-02-04	1992-07-01	250	H	Baja	\N	\N	\N	\N	2026-04-23 16:53:00.548	\N	Burutain	\N	\N	Fundadora	\N	ordinario	\N	\N	\N	\N
251	\N	Valeriana	Eslava Setuain	\N	\N	\N	15650513W	1921-04-14	1992-07-01	251	F	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.549	\N	Eguaras	\N	\N	Fundadora	\N	ordinario	\N	\N	\N	\N
252	\N	Jesús	Rodriguez Redín	\N	\N	\N	15856350N	1929-10-13	1992-07-01	252	H	Baja	\N	\N	\N	\N	2026-04-23 16:53:00.55	\N	Aritzu	\N	\N	Fundadora	\N	ordinario	\N	\N	\N	\N
253	\N	M. Jesus	Villanueva Ilarregi	\N	\N	\N	15523268Q	1931-12-26	1992-07-01	253	F	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.55	\N	Aritzu	\N	\N	Fundadora	\N	ordinario	\N	\N	\N	\N
255	\N	Laura	Martinez Bengoetxea	\N	\N	\N	15587775P	1934-09-02	1992-07-01	255	F	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.552	\N	Etsain	\N	\N	Fundadora	\N	ordinario	\N	\N	\N	\N
256	\N	María	Gubia Iriberri	\N	\N	\N	15861655G	1935-07-19	1992-10-15	256	F	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.554	\N	Arraitz	\N	\N	Fundadora	\N	ordinario	\N	\N	\N	\N
257	\N	M. Emelda	Riezu Beramendi	\N	\N	\N	15773963B	1927-03-16	1993-01-01	257	F	Baja	\N	\N	\N	\N	2026-04-23 16:53:00.555	\N	Arrarats	\N	1994-12-01	Fundadora	\N	ordinario	\N	\N	\N	\N
258	\N	Dionisio	Ariztegi Ciga	\N	\N	\N	15857000H	1927-11-16	1993-01-01	258	H	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.556	\N	Lantz	\N	\N	Fundadora	\N	ordinario	\N	\N	\N	\N
259	\N	Aurelia	Oyaregui Goñi	\N	\N	\N	15857093L	1925-09-23	1993-01-01	259	F	Baja	\N	\N	\N	\N	2026-04-23 16:53:00.556	\N	Lantz	\N	2019-03-20	Fundadora	\N	ordinario	\N	\N	\N	\N
260	\N	Visitación	Iraizoz Iragui	\N	\N	\N	15857060D	1913-06-30	1993-01-01	260	F	Baja	\N	\N	\N	\N	2026-04-23 16:53:00.557	\N	Lantz	\N	\N	Fundadora	\N	ordinario	\N	\N	\N	\N
261	\N	luis	Ariztegi Ciga	\N	\N	\N	15857003K	1926-01-06	1993-01-01	261	H	Baja	\N	\N	\N	\N	2026-04-23 16:53:00.558	\N	Lantz	\N	\N	Fundadora	\N	ordinario	\N	\N	\N	\N
262	\N	Fermín	Astiz Marticorena	\N	\N	\N	15857009G	1921-07-07	1993-01-01	262	H	Baja	\N	\N	\N	\N	2026-04-23 16:53:00.558	\N	Lantz	\N	\N	Fundadora	\N	ordinario	\N	\N	\N	\N
264	\N	Brígida	Bizkarrondo Imaz	\N	\N	\N	15532943P	1925-08-10	1993-01-01	264	F	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.559	\N	Etulain	\N	\N	Fundadora	\N	ordinario	\N	\N	\N	\N
265	\N	Carmen	Martinez Mesas	\N	\N	\N	2126688Q	1933-04-08	1993-01-01	265	F	Baja	\N	\N	\N	\N	2026-04-23 16:53:00.56	\N	Iraizotz	\N	\N	Fundadora	\N	ordinario	\N	\N	\N	\N
266	\N	Pedro	Landiribar Galain	\N	\N	\N	15626865K	1925-04-02	1993-01-01	266	H	Baja	\N	\N	\N	\N	2026-04-23 16:53:00.56	\N	Iraizotz	\N	\N	Fundadora	\N	ordinario	\N	\N	\N	\N
267	\N	Elena	Echeverz Azcárate	\N	\N	\N	15753527E	1929-05-22	1993-01-01	267	F	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.561	\N	Arraitz	\N	\N	Fundadora	\N	ordinario	\N	\N	\N	\N
268	\N	Sole	Arangoa Goizueta	\N	\N	\N	72610766L	1940-04-28	1993-01-01	268	F	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.561	\N	Beruete	\N	\N	Fundadora	\N	ordinario	\N	\N	\N	\N
270	\N	Esperanza	Egozcue Oyaregui	\N	\N	\N	72617367L	1932-02-19	1993-01-01	270	F	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.562	\N	Burutain	\N	\N	Fundadora	\N	ordinario	\N	\N	\N	\N
271	\N	Francisco	Osinaga Gurbindo	\N	\N	\N	15640627Y	1930-12-12	1993-01-01	271	H	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.563	\N	Ostitz	\N	\N	Fundadora	\N	ordinario	\N	\N	\N	\N
272	\N	Carmen	Urtasun Suescun	\N	\N	\N	15857290D	1935-07-16	1993-01-01	272	F	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.563	\N	Ostitz	\N	\N	Fundadora	\N	ordinario	\N	\N	\N	\N
273	\N	Juan	Larrainzar Erbiti	\N	\N	\N	72649359H	1930-10-19	1993-03-01	273	H	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.564	\N	Arraitz	\N	\N	Fundadora	\N	ordinario	\N	\N	\N	\N
274	\N	Gregoria	Echeberria Olague	\N	\N	\N	\N	1939-03-25	1993-04-01	274	F	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.564	\N	Gelbentzu	\N	\N	Fundadora	\N	ordinario	\N	\N	\N	\N
275	\N	Martín	Ancizu Eguaras	\N	\N	\N	15860861S	1912-02-18	1991-03-01	275	H	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.564	\N	Auza	\N	1994-01-01	Fundadora	\N	ordinario	\N	\N	\N	\N
276	\N	Valeriano	Sanchotega Videgain	\N	\N	\N	15817112N	1926-11-28	1993-04-01	276	H	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.565	\N	Alkotz	\N	\N	Fundadora	\N	ordinario	\N	\N	\N	\N
278	\N	Flora	Seminario Arbilla	\N	\N	\N	15861257C	1932-07-29	1993-04-01	278	F	Baja	\N	\N	\N	\N	2026-04-23 16:53:00.566	\N	Ilarregi	\N	\N	Fundadora	\N	ordinario	\N	\N	\N	\N
279	\N	José	Erviti Yaben	\N	\N	\N	15647050N	1926-03-03	1993-04-01	279	H	Baja	\N	\N	\N	\N	2026-04-23 16:53:00.566	\N	Igoa	\N	\N	Fundadora	\N	ordinario	\N	\N	\N	\N
281	\N	Felipe	Oskoz Recondo	\N	\N	\N	15657650D	1918-10-23	1993-04-01	281	H	Baja	\N	\N	\N	\N	2026-04-23 16:53:00.567	\N	Arrarats	\N	\N	Fundadora	\N	ordinario	\N	\N	\N	\N
282	\N	Santos	Cenoz Murguia	\N	\N	\N	15861461V	1914-06-23	1991-03-01	282	H	Baja	\N	\N	\N	\N	2026-04-23 16:53:00.568	\N	Zenotz	\N	\N	Fundadora	\N	ordinario	\N	\N	\N	\N
283	\N	M Dolores	Machain Ilarregi	\N	\N	\N	15657697X	1930-06-02	1991-03-01	283	F	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.568	\N	Igoa	\N	\N	Fundadora	\N	ordinario	\N	\N	\N	\N
284	\N	M Carmen	Anzizar Ansa	\N	\N	\N	15857146A	1917-05-23	1991-03-01	284	F	Baja	\N	\N	\N	\N	2026-04-23 16:53:00.569	\N	Olague	\N	\N	Fundadora	\N	ordinario	\N	\N	\N	\N
285	\N	Juan Martín	Iraizoz Egozcue	\N	\N	\N	15857190R	1912-02-08	1991-03-01	285	H	Baja	\N	\N	\N	\N	2026-04-23 16:53:00.569	\N	Olague	\N	1997-01-10	Fundadora	\N	ordinario	\N	\N	\N	\N
286	\N	Flora	Ezcurra Alsua	\N	\N	\N	15657914C	1934-05-21	1991-03-01	286	F	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.569	\N	Igoa	\N	\N	Fundadora	\N	ordinario	\N	\N	\N	\N
287	\N	José	Oiz Nuin	\N	\N	\N	15658061Y	1912-04-17	1991-03-01	287	H	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.57	\N	Orokieta	\N	\N	Fundadora	\N	ordinario	\N	\N	\N	\N
289	\N	Ines	Ortabe Monaut	\N	\N	\N	76618883H	1923-01-19	1991-03-01	289	F	Baja	\N	\N	\N	\N	2026-04-23 16:53:00.571	\N	Etulain	\N	\N	Fundadora	\N	ordinario	\N	\N	\N	\N
290	\N	José	Villanueva Sagardía	\N	\N	\N	15861102A	1916-11-19	1991-03-01	290	H	Baja	\N	\N	\N	\N	2026-04-23 16:53:00.572	\N	Suarbe	\N	\N	Fundadora	\N	ordinario	\N	\N	\N	\N
291	\N	María	Cenoz Senosiain	\N	\N	\N	\N	1926-09-18	1991-03-01	291	F	Baja	\N	\N	\N	\N	2026-04-23 16:53:00.572	\N	Arraitz	\N	\N	Fundadora	\N	ordinario	\N	\N	\N	\N
292	\N	M Luisa	Goyenaga Villabona	\N	\N	\N	15533187E	1928-02-28	1993-04-01	292	F	Baja	\N	\N	\N	\N	2026-04-23 16:53:00.572	\N	Aritzu	\N	\N	Fundadora	\N	ordinario	\N	\N	\N	\N
293	\N	Sabino	Olague Oskoz	\N	\N	\N	15722651N	1926-11-19	1993-04-01	293	H	Baja	\N	\N	\N	\N	2026-04-23 16:53:00.573	\N	Aritzu	\N	\N	Fundadora	\N	ordinario	\N	\N	\N	\N
294	\N	Miguel	Mariezcurrena Etxeguia	\N	\N	\N	\N	1923-02-02	1991-03-01	294	H	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.573	\N	Arrarats	\N	\N	Fundadora	\N	ordinario	\N	\N	\N	\N
295	\N	Martina	Nuin Azpiroz	\N	\N	\N	\N	1923-06-18	1991-03-01	295	F	Baja	\N	\N	\N	\N	2026-04-23 16:53:00.574	\N	Arrarats	\N	\N	Fundadora	\N	ordinario	\N	\N	\N	\N
297	\N	Juana	Goñi Olague	\N	\N	\N	15862501E	1920-01-21	1991-03-01	297	F	Baja	\N	\N	\N	\N	2026-04-23 16:53:00.575	\N	Iraizotz	\N	2022-12-25	Fundadora	\N	ordinario	\N	\N	\N	\N
298	\N	Benjamin 	Olaiz Lizaso	\N	\N	\N	15628361E	1930-03-30	1991-03-01	298	H	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.576	\N	Iraizotz	\N	\N	Fundadora	\N	ordinario	\N	\N	\N	\N
299	\N	Celestina	Hualde Lopez	\N	\N	\N	15861220Y	1915-04-06	1991-03-01	299	F	Baja	\N	\N	\N	\N	2026-04-23 16:53:00.576	\N	Ilarregi	\N	\N	Fundadora	\N	ordinario	\N	\N	\N	\N
300	\N	Casimira	Arregui Egozcue	\N	\N	\N	15637515E	1927-03-09	1993-06-01	300	F	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.577	\N	Iraizotz	\N	\N	Fundadora	\N	ordinario	\N	\N	\N	\N
301	\N	Francisco	Dorai Alberro	\N	\N	\N	15657663E	1917-02-18	1991-03-01	301	H	Baja	\N	\N	\N	\N	2026-04-23 16:53:00.577	\N	Beramendi	\N	\N	Fundadora	\N	ordinario	\N	\N	\N	\N
303	\N	Teodoro	Esain Seminario	\N	\N	\N	15857168W	1918-05-04	1991-03-01	303	H	Baja	\N	\N	\N	\N	2026-04-23 16:53:00.578	\N	Olague	\N	1997-03-08	Fundadora	\N	ordinario	\N	\N	\N	\N
304	\N	Milagros	Ilarregui Egozcue	\N	\N	\N	15857360X	1935-06-11	1991-03-01	304	F	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.578	\N	Olague	\N	\N	Fundadora	\N	ordinario	\N	\N	\N	\N
305	\N	Carmen	Irurita Zalba	\N	\N	\N	15641070N	1919-07-16	1991-03-01	305	F	Baja	\N	\N	\N	\N	2026-04-23 16:53:00.579	\N	Ostitz	\N	\N	Fundadora	\N	ordinario	\N	\N	\N	\N
306	\N	María	Osacar Orkin	\N	\N	\N	15860934L	1920-12-20	1991-03-01	306	F	Baja	\N	\N	\N	\N	2026-04-23 16:53:00.579	\N	Lizaso	\N	\N	Fundadora	\N	ordinario	\N	\N	\N	\N
307	\N	Antonia	Otermin Aguirre	\N	\N	\N	15738687V	1931-08-20	1991-03-01	307	F	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.58	\N	Eltzaburu	\N	\N	Fundadora	\N	ordinario	\N	\N	\N	\N
308	\N	Basilio	Arce Igoa	\N	\N	\N	15597031H	1918-02-24	1993-09-01	308	H	Baja	\N	\N	\N	\N	2026-04-23 16:53:00.58	\N	Eltzaburu	\N	\N	Honorifica	\N	ordinario	\N	\N	\N	\N
309	\N	Pablo	Olaverría Ripa	\N	\N	\N	15724601F	1933-01-25	1993-09-01	309	H	Baja	\N	\N	\N	\N	2026-04-23 16:53:00.581	\N	Gendulain	\N	\N	Honorifica	\N	ordinario	\N	\N	\N	\N
311	\N	Francisca	Muguruza Lazcano	\N	\N	\N	15657516J	1935-02-20	1993-11-01	311	F	Baja	\N	\N	\N	\N	2026-04-23 16:53:00.582	\N	Jauntsarats 	\N	\N	Honorifica	\N	ordinario	\N	\N	\N	\N
312	\N	Lorenzo	Iraizoz Muskiz	\N	\N	\N	15857061X	1932-07-21	1994-01-01	312	H	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.582	\N	Lantz	\N	\N	Honorifica	\N	ordinario	\N	\N	\N	\N
313	\N	Juan José	Ariztegi Cia	\N	\N	\N	15857002C	1930-03-14	1994-01-01	313	H	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.583	\N	Lantz	\N	\N	Honorifica	\N	ordinario	\N	\N	\N	\N
314	\N	Miguel	Astiz Marticorena	\N	\N	\N	15857011Y	1929-05-11	1994-01-01	314	H	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.583	\N	Lantz	\N	\N	Honorifica	\N	ordinario	\N	\N	\N	\N
315	\N	Simona	Esain Garro	\N	\N	\N	72609339H	1934-05-06	1994-01-01	315	F	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.584	\N	Eltzaburu	\N	\N	Honorifica	\N	ordinario	\N	\N	\N	\N
316	\N	Antonio	Narvaez Laseca	\N	\N	\N	15861408X	1935-05-25	1994-01-01	316	H	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.584	\N	Eltzaburu	\N	\N	Honorifica	\N	ordinario	\N	\N	\N	\N
318	\N	Francisco J.	Osacain Huarte	\N	\N	\N	15095664M	1931-12-13	1994-01-01	318	H	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.585	\N	Eltso	\N	\N	Honorifica	\N	ordinario	\N	\N	\N	\N
319	\N	Encarnación	Aldues Allorta	\N	\N	\N	15095477W	1932-07-02	1994-01-01	319	F	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.586	\N	Eltso	\N	\N	Honorifica	\N	ordinario	\N	\N	\N	\N
320	\N	M Concepción	Villabona Mezau	\N	\N	\N	15861299Q	1937-10-03	1994-01-01	320	F	Baja	\N	\N	\N	\N	2026-04-23 16:53:00.587	\N	Olague	\N	\N	Honorifica	\N	ordinario	\N	\N	\N	\N
321	\N	Juan	Eleta Larrayoz	\N	\N	\N	15723775D	1928-10-10	1994-01-01	321	H	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.587	\N	Olague	\N	\N	Honorifica	\N	ordinario	\N	\N	\N	\N
322	\N	Martina	Eugui Arraiza	\N	\N	\N	15861432B	1934-08-01	1994-03-01	322	F	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.588	\N	Eltso	\N	\N	Honorifica	\N	ordinario	\N	\N	\N	\N
323	\N	José	Oronoz Ibarra	\N	\N	\N	15861442K	1928-03-16	1994-03-01	323	H	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.588	\N	Eltso	\N	\N	Honorifica	\N	ordinario	\N	\N	\N	\N
324	\N	Francisco	Olague Lizaso	\N	\N	\N	15861193W	1920-11-07	1994-01-01	324	H	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.589	\N	Iraizotz	\N	\N	Honorifica	\N	ordinario	\N	\N	\N	\N
325	\N	María	Cia Goñi	\N	\N	\N	15657576G	1935-08-28	1994-06-01	325	F	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.589	\N	Itsaso	\N	\N	Honorifica	\N	ordinario	\N	\N	\N	\N
327	\N	Rufina	Barrenetxea Latasa	\N	\N	\N	15771629T	1937-06-04	1994-08-01	327	F	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.59	\N	Udabe	\N	\N	Honorifica	\N	ordinario	\N	\N	\N	\N
328	\N	Juan	Bildarraz Iribarren	\N	\N	\N	72610732P	1936-09-23	1994-08-01	328	H	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.59	\N	Udabe	\N	\N	Honorifica	\N	ordinario	\N	\N	\N	\N
329	\N	Juan	Insausti Oyarzun	\N	\N	\N	15861121E	1912-11-15	1994-09-01	329	H	Baja	\N	\N	\N	\N	2026-04-23 16:53:00.591	\N	Iraizotz	\N	\N	Honorifica	\N	ordinario	\N	\N	\N	\N
330	\N	Vicente	Elizalde Vergara	\N	\N	\N	15861015P	1937-04-05	1995-02-01	330	H	Baja	\N	\N	\N	\N	2026-04-23 16:53:00.591	\N	Larraintzar	\N	\N	Honorifica	\N	ordinario	\N	\N	\N	\N
331	\N	Juan	Larrayoz Larrión	\N	\N	\N	15627954Y	1925-05-25	1995-03-01	331	H	Baja	\N	\N	\N	\N	2026-04-23 16:53:00.592	\N	Ziaurritz	\N	\N	Honorifica	\N	ordinario	\N	\N	\N	\N
332	\N	Ines	García Nunita	\N	\N	\N	15481416R	1935-05-12	1995-03-01	332	F	Baja	\N	\N	\N	\N	2026-04-23 16:53:00.592	\N	Ziaurritz	\N	\N	Honorifica	\N	ordinario	\N	\N	\N	\N
334	\N	Benita	Gubia Iriberri	\N	\N	\N	15861652R	1932-08-01	1995-03-01	334	F	Baja	\N	\N	\N	\N	2026-04-23 16:53:00.593	\N	Ziaurritz	\N	\N	Honorifica	\N	ordinario	\N	\N	\N	\N
335	\N	Julian	Sala Elizondo	\N	\N	\N	15861800B	1937-01-02	1995-04-18	335	H	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.594	\N	Alkotz	\N	\N	Honorifica	\N	ordinario	\N	\N	\N	\N
336	\N	Javier	Echandi Lizaso	\N	\N	\N	\N	1930-01-26	1995-06-29	336	H	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.594	\N	Iraizotz	\N	\N	Honorifica	\N	ordinario	\N	\N	\N	\N
337	\N	M Isabel	Iñarrea Goñi	\N	\N	\N	\N	1934-11-18	1995-06-29	337	F	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.595	\N	Iraizotz	\N	\N	Honorifica	\N	ordinario	\N	\N	\N	\N
338	\N	Isabel	Micheltorena Yaben	\N	\N	\N	\N	1941-01-03	1995-06-29	338	F	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.595	\N	Olague	\N	\N	Numeraria	\N	ordinario	\N	\N	\N	\N
339	\N	Florencio	Olague Aguerre	\N	\N	\N	15857217M	1930-11-22	1995-06-29	339	H	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.596	\N	Olague	\N	\N	Honorifica	\N	ordinario	\N	\N	\N	\N
341	\N	Consuelo	Larrea Leiza	\N	\N	\N	13861440F	1937-04-01	1995-07-20	341	F	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.596	\N	Eltso	\N	\N	Honorifica	\N	ordinario	\N	\N	\N	\N
342	\N	Mercedes	Echandi Lizaso	\N	\N	\N	15861186H	1936-03-26	1991-03-01	342	F	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.597	\N	Iraizotz	\N	\N	Honorifica	\N	ordinario	\N	\N	\N	\N
343	\N	Dominica	Elizalde Vergara	\N	\N	\N	44617154Y	1939-02-19	1996-01-01	343	F	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.597	\N	Larraintzar	\N	\N	Honorifica	\N	ordinario	\N	\N	\N	\N
344	\N	Bononia	Eslava Igoa	\N	\N	\N	15640306F	1923-08-30	1996-01-01	344	F	Baja	\N	\N	\N	\N	2026-04-23 16:53:00.598	\N	Ostitz	\N	\N	Honorifica	\N	ordinario	\N	\N	\N	\N
345	\N	Joaquin 	Miqueo Zabaleta	\N	\N	\N	15663321E	1921-10-25	1996-01-01	345	H	Baja	\N	\N	\N	\N	2026-04-23 16:53:00.598	\N	Beruete	\N	\N	Honorifica	\N	ordinario	\N	\N	\N	\N
346	\N	Jesusa	Arrarats Zubillaga	\N	\N	\N	15651345Y	1930-08-11	1996-01-01	346	F	Baja	\N	\N	\N	\N	2026-04-23 16:53:00.599	\N	Beruete	\N	\N	Honorifica	\N	ordinario	\N	\N	\N	\N
348	\N	Águeda	Baraibar 	\N	\N	\N	15620232N	1931-04-05	1996-01-01	348	F	Baja	\N	\N	\N	\N	2026-04-23 16:53:00.6	\N	Arraitz	\N	2007-03-09	Honorifica	\N	ordinario	\N	\N	\N	\N
349	\N	Matéo	Aliende Viniegra	\N	\N	\N	15638373Y	1937-04-05	1996-01-01	349	H	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.6	\N	Eltso	\N	\N	Honorifica	\N	ordinario	\N	\N	\N	\N
350	\N	M Mercedes	Larrea Leiza	\N	\N	\N	15632606N	1934-09-20	1996-01-01	350	F	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.601	\N	Eltso	\N	\N	Honorifica	\N	ordinario	\N	\N	\N	\N
352	\N	M Lidia	Manjadez Parada	\N	\N	\N	29143730Q	1947-11-28	1996-01-01	352	F	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.602	\N	Itsaso	\N	\N	Numeraria	\N	ordinario	\N	\N	\N	\N
353	\N	Francisco	Perez Iribarren	\N	\N	\N	15707829W	1929-08-04	1996-01-01	353	H	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.602	\N	Arraitz	\N	\N	Honorifica	\N	ordinario	\N	\N	\N	\N
354	\N	Agustin	Larraya Echeverría	\N	\N	\N	15623850L	1928-12-17	1996-01-01	354	H	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.603	\N	Arraitz	\N	1998-01-01	Honorifica	\N	ordinario	\N	\N	\N	\N
355	\N	Juan	Aznar Mur	\N	\N	\N	15723645V	1926-11-24	1996-01-01	355	H	Baja	\N	\N	\N	\N	2026-04-23 16:53:00.603	\N	Iruña	\N	\N	Honorifica	\N	ordinario	\N	\N	\N	\N
356	\N	M. Esther	Goñi Goñi	\N	\N	\N	15724348F	1939-06-06	1996-10-01	356	F	Baja	\N	\N	\N	\N	2026-04-23 16:53:00.604	\N	Iruña	\N	\N	Honorifica	\N	ordinario	\N	\N	\N	\N
357	\N	Bonifacia	Noain Irañeta	\N	\N	\N	72620599P	1945-07-14	1996-10-01	357	F	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.604	\N	Orokieta	\N	\N	Numeraria	\N	ordinario	\N	\N	\N	\N
358	\N	Anselmo 	Irurita Esain	\N	\N	\N	15739348B	1927-10-18	1997-01-01	358	H	Baja	\N	\N	\N	\N	2026-04-23 16:53:00.605	\N	Aritzu	\N	\N	Honorifica	\N	ordinario	\N	\N	\N	\N
360	\N	José	Irurita Zalba	\N	\N	\N	15756585K	1942-03-14	1997-01-01	360	H	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.606	\N	Lantz	\N	\N	Numeraria	\N	ordinario	\N	\N	\N	\N
361	\N	Plácida	Iñarrea Goñi	\N	\N	\N	15861027C	1926-10-05	1997-03-01	361	F	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.607	\N	Larraintzar	\N	\N	Honorifica	\N	ordinario	\N	\N	\N	\N
362	\N	Josefa	Saralegui Goñi	\N	\N	\N	15657511P	1936-04-04	1997-01-01	362	F	Baja	\N	\N	\N	\N	2026-04-23 16:53:00.607	\N	Gerendiain	\N	\N	Honorifica	\N	ordinario	\N	\N	\N	\N
363	\N	Meltxora	Lanpreabe Segura	\N	\N	\N	15657814N	1927-09-08	1991-03-01	363	F	Baja	\N	\N	\N	\N	2026-04-23 16:53:00.608	\N	Beruete	\N	\N	Honorifica	\N	ordinario	\N	\N	\N	\N
364	\N	Miguel	Arano Barberena	\N	\N	\N	15657898G	1919-05-29	1991-03-01	364	H	Baja	\N	\N	\N	\N	2026-04-23 16:53:00.608	\N	Beruete	\N	\N	Honorifica	\N	ordinario	\N	\N	\N	\N
365	\N	M Angeles	Azanza Larrión	\N	\N	\N	15732768D	1941-03-31	1997-08-01	365	F	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.609	\N	Auza	\N	\N	Numeraria	\N	ordinario	\N	\N	\N	\N
366	\N	Pilar	Erice Yarnoz	\N	\N	\N	14744744L	1918-08-19	1998-01-01	366	F	Baja	\N	\N	\N	\N	2026-04-23 16:53:00.61	\N	Gerendiain	\N	\N	Honorifica	\N	ordinario	\N	\N	\N	\N
367	\N	Isabel	Moreno Churío	\N	\N	\N	15638018L	1922-11-19	1998-01-01	367	F	Baja	\N	\N	\N	\N	2026-04-23 16:53:00.61	\N	Gerendiain	\N	\N	Honorifica	\N	ordinario	\N	\N	\N	\N
368	\N	Miguel	Vidan Aguerre	\N	\N	\N	15857232C	1933-05-18	1998-01-01	368	H	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.611	\N	Alkotz	\N	\N	Honorifica	\N	ordinario	\N	\N	\N	\N
370	\N	José	Senosiain Gascue	\N	\N	\N	15727104A	1934-02-09	1998-01-01	370	H	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.612	\N	Ziaurritz	\N	\N	Honorifica	\N	ordinario	\N	\N	\N	\N
371	\N	M Eugenia	Eslava Igoa	\N	\N	\N	29145240P	1926-04-03	1998-01-01	371	F	Baja	\N	\N	\N	\N	2026-04-23 16:53:00.613	\N	Ostitz	\N	\N	Honorifica	\N	ordinario	\N	\N	\N	\N
372	\N	Francisco	Gastearena Churruca	\N	\N	\N	15757043L	1938-03-28	1998-03-01	372	H	Baja	\N	\N	\N	\N	2026-04-23 16:53:00.613	\N	Auza	\N	\N	Honorifica	\N	ordinario	\N	\N	\N	\N
373	\N	Margarita	Mutuberría Cía	\N	\N	\N	72617778Q	1944-01-04	1998-03-01	373	F	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.614	\N	Auza	\N	\N	Numeraria	\N	ordinario	\N	\N	\N	\N
374	\N	Miguel	Sagues Erasun	\N	\N	\N	15860980L	1928-09-20	1998-04-01	374	H	Baja	\N	\N	\N	\N	2026-04-23 16:53:00.614	\N	Urritzola	\N	\N	Honorifica	\N	ordinario	\N	\N	\N	\N
375	\N	M Catalina	Huarritz Oteiza	\N	\N	\N	72623736V	1942-02-05	1998-04-01	375	F	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.615	\N	Urritzola	\N	\N	Numeraria	\N	ordinario	\N	\N	\N	\N
376	\N	José M	Apellaniz Moreno	\N	\N	\N	15736251L	1943-09-22	1998-05-01	376	H	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.616	\N	Etulain	\N	\N	Numeraria	\N	ordinario	\N	\N	\N	\N
378	\N	Escolástica	Biurrarena Aldanondo	\N	\N	\N	72610769E	1928-01-21	1999-01-01	378	F	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.617	\N	Orokieta	\N	\N	Honorifica	\N	ordinario	\N	\N	\N	\N
379	\N	Damasa	Arrarats Yeregui	\N	\N	\N	15650670K	1911-02-02	1999-01-01	379	F	Baja	\N	\N	\N	\N	2026-04-23 16:53:00.617	\N	Gerendiain	\N	\N	Honorifica	\N	ordinario	\N	\N	\N	\N
380	\N	Ignacio	Telletxea Leceaga	\N	\N	\N	15638982V	1933-11-19	1999-01-01	380	H	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.618	\N	Igoa	\N	\N	Honorifica	\N	ordinario	\N	\N	\N	\N
381	\N	Juan Martín	Echandi Lizaso	\N	\N	\N	15700645V	1934-04-18	1999-01-01	381	H	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.618	\N	Iraizotz	\N	\N	Honorifica	\N	ordinario	\N	\N	\N	\N
382	\N	Socorro	Serrano Esain	\N	\N	\N	15646928M	1939-06-27	1999-01-01	382	F	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.619	\N	Iraizotz	\N	\N	Honorifica	\N	ordinario	\N	\N	\N	\N
383	\N	Pedro	Iraizoz Ollcarizqueta	\N	\N	\N	15861315D	1932-04-06	1999-01-01	383	H	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.62	\N	Gorrontz	\N	\N	Honorifica	\N	ordinario	\N	\N	\N	\N
385	\N	M Josefa	Berasain Lasarte	\N	\N	\N	72624621M	1943-03-12	1999-01-01	385	F	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.621	\N	Auza	\N	\N	Numeraria	\N	ordinario	\N	\N	\N	\N
386	\N	Tomás	Berasain Arribillaga	\N	\N	\N	15861525N	1937-09-12	1999-01-01	386	H	Baja	\N	\N	\N	\N	2026-04-23 16:53:00.622	\N	Auza	\N	\N	Honorifica	\N	ordinario	\N	\N	\N	\N
387	\N	Isidoro	Eugui Oyarzun	\N	\N	\N	15637584E	1930-12-28	1999-01-01	387	H	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.622	\N	Anotzibar	\N	\N	Honorifica	\N	ordinario	\N	\N	\N	\N
388	\N	Ana M	Sagues Erasun	\N	\N	\N	15860979H	1931-09-13	1999-01-01	388	F	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.623	\N	Ziaurritz	\N	\N	Honorifica	\N	ordinario	\N	\N	\N	\N
389	\N	José M	Aríztegui Mariezcurrena	\N	\N	\N	15687767L	1933-10-13	1999-01-01	389	H	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.623	\N	Ziaurritz	\N	\N	Honorifica	\N	ordinario	\N	\N	\N	\N
390	\N	Atanasio	San Miguel Ripa	\N	\N	\N	15753037S	1932-04-28	1999-01-01	390	H	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.624	\N	Anotzibar	\N	\N	Honorifica	\N	ordinario	\N	\N	\N	\N
391	\N	M Isabel	Ilarregui Villlanueva	\N	\N	\N	72616371N	1942-10-11	1999-06-15	391	F	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.625	\N	Arraitz	\N	\N	Numeraria	\N	ordinario	\N	\N	\N	\N
392	\N	Joaquín	Burguete Pagola	\N	\N	\N	15750604C	1942-12-26	1999-06-15	392	H	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.625	\N	Arraitz	\N	\N	Numeraria	\N	ordinario	\N	\N	\N	\N
393	\N	M Rosario	Lakunza Ostiz	\N	\N	\N	15861320Z	1937-07-07	1999-06-22	393	F	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.626	\N	Ziaurritz	\N	\N	Honorifica	\N	ordinario	\N	\N	\N	\N
394	\N	Jesús	Narrica Ollo	\N	\N	\N	15857090Q	1938-02-24	1999-06-22	394	H	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.626	\N	Lantz	\N	\N	Honorifica	\N	ordinario	\N	\N	\N	\N
396	\N	Maritxu	Arce 	\N	\N	\N	15861351E	1940-05-02	2000-02-10	396	F	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.627	\N	Arraitz	\N	\N	Honorifica	\N	ordinario	\N	\N	\N	\N
397	\N	Felipe	Beunza Cía	\N	\N	\N	15721436Q	1941-04-11	2000-02-10	397	H	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.628	\N	Urritzola	\N	\N	Numeraria	\N	ordinario	\N	\N	\N	\N
398	\N	M Luisa	Urrutia Irigoyen	\N	\N	\N	15743128L	1943-08-30	2000-02-01	398	F	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.628	\N	Urritzola	\N	\N	Numeraria	\N	ordinario	\N	\N	\N	\N
399	\N	Juan	Esteban Gerendiáin	\N	\N	\N	15861660D	1936-07-09	2000-02-14	399	H	Baja	\N	\N	\N	\N	2026-04-23 16:53:00.629	\N	Arraitz	\N	\N	Honorifica	\N	ordinario	\N	\N	\N	\N
400	\N	Margarita	Ciga Irurita	\N	\N	\N	15857012F	1936-04-23	2000-02-14	400	F	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.629	\N	Lantz	\N	\N	Honorifica	\N	ordinario	\N	\N	\N	\N
401	\N	Matías	Eugui Larramendi	\N	\N	\N	15633904E	1930-06-18	2000-02-14	401	H	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.63	\N	Lantz	\N	\N	Honorifica	\N	ordinario	\N	\N	\N	\N
403	\N	M Carmen	Elizalde Vergara	\N	\N	\N	15863582E	1934-12-05	2000-05-15	403	F	Baja	\N	\N	\N	\N	2026-04-23 16:53:00.631	\N	Larraintzar	\N	\N	Honorifica	\N	ordinario	\N	\N	\N	\N
404	\N	Belén	Noain Irañeta	\N	\N	\N	15750181B	1950-05-12	2000-05-15	404	F	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.632	\N	Berriozar	\N	\N	Numeraria	\N	ordinario	\N	\N	\N	\N
405	\N	Rosario	Zalba Goñi	\N	\N	\N	15721639N	1936-02-14	2000-05-15	405	F	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.632	\N	Etulain	\N	\N	Honorifica	\N	ordinario	\N	\N	\N	\N
406	\N	M Josefa	Huarritz Oteiza	\N	\N	\N	72625019N	1943-04-09	2000-05-15	406	F	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.633	\N	Arraitz	\N	\N	Numeraria	\N	ordinario	\N	\N	\N	\N
407	\N	Martín	Goñi Villanueva	\N	\N	\N	15626810N	1935-05-29	2000-05-15	407	H	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.633	\N	Arraitz	\N	\N	Honorifica	\N	ordinario	\N	\N	\N	\N
408	\N	José	Lozarte Goñi	\N	\N	\N	72611498S	1943-10-09	2000-09-12	408	H	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.634	\N	Lantz	\N	\N	Numeraria	\N	ordinario	\N	\N	\N	\N
410	\N	Josefina	Aguinaga Azcarate	\N	\N	\N	15828661S	1928-07-27	2000-10-11	410	F	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.635	\N	Larraintzar	\N	\N	Honorifica	\N	ordinario	\N	\N	\N	\N
411	\N	Pacífico	Balda Urteaga	\N	\N	\N	15861726Y	1933-09-24	2001-01-01	411	H	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.636	\N	Alkotz	\N	\N	Honorifica	\N	ordinario	\N	\N	\N	\N
412	\N	Salvadora	Larraya Villanueva	\N	\N	\N	15627095K	\N	2001-01-01	412	F	Baja	\N	\N	\N	\N	2026-04-23 16:53:00.637	\N	Arraitz	\N	\N	Honorifica	\N	ordinario	\N	\N	\N	\N
413	\N	M Jesús	Telletxea Lizeaga	\N	\N	\N	15657965W	1939-09-27	2001-01-01	413	F	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.637	\N	Igoa	\N	\N	Honorifica	\N	ordinario	\N	\N	\N	\N
414	\N	Antonio	Etxeberria Orkin	\N	\N	\N	15862369M	1928-12-20	2001-01-01	414	H	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.638	\N	Gerendiain	\N	\N	Honorifica	\N	ordinario	\N	\N	\N	\N
417	\N	M Rosa 	Sola Arriazu	\N	\N	\N	15598667K	1938-09-15	2001-01-01	417	F	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.639	\N	Alkotz	\N	\N	Honorifica	\N	ordinario	\N	\N	\N	\N
418	\N	Bautista	Ariztegi Mariezcurrena	\N	\N	\N	15636718F	1938-04-09	2003-01-01	418	H	Baja	\N	\N	\N	\N	2026-04-23 16:53:00.64	\N	Ziaurritz	\N	\N	Honorifica	\N	ordinario	\N	\N	\N	\N
419	\N	José M	Lopez García	\N	\N	\N	15720971B	1936-08-11	2003-01-01	419	H	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.64	\N	Arrarats	\N	2026-02-01	Honorifica	\N	ordinario	\N	\N	\N	\N
420	\N	M Lourdes	Iturralde Lasarte	\N	\N	\N	15735158F	1937-04-27	2003-01-01	420	F	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.641	\N	Arrarats	\N	\N	Honorifica	\N	ordinario	\N	\N	\N	\N
421	\N	M Carmen	Serrano Esain	\N	\N	\N	15861198F	1935-12-05	2003-01-01	421	F	Baja	\N	\N	\N	\N	2026-04-23 16:53:00.642	\N	Iraizotz	\N	\N	Honorifica	\N	ordinario	\N	\N	\N	\N
422	\N	Antonio	Mariñelarena Urtasun	\N	\N	\N	15664030H	1930-08-19	2003-01-01	422	H	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.642	\N	Olague	\N	\N	Honorifica	\N	ordinario	\N	\N	\N	\N
424	\N	Javier	Ezcurra Sarasibar	\N	\N	\N	15650560A	1938-02-24	2003-01-01	424	H	Baja	\N	\N	\N	\N	2026-04-23 16:53:00.643	\N	Ziaurritz	\N	\N	Honorifica	\N	ordinario	\N	\N	\N	\N
425	\N	Ines	Erleta Espelosin	\N	\N	\N	29151096E	\N	2003-01-01	425	F	Baja	\N	\N	\N	\N	2026-04-23 16:53:00.644	\N	Lizaso	\N	\N	Honorifica	\N	ordinario	\N	\N	\N	\N
426	\N	Micaela	Goldaraz Arce	\N	\N	\N	15640024R	1929-05-27	2003-01-01	426	F	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.644	\N	Gendulain	\N	\N	Honorifica	\N	ordinario	\N	\N	\N	\N
427	\N	Mercedes	Cenoz Oyaregui	\N	\N	\N	15861622V	1929-12-11	2003-01-01	427	F	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.645	\N	Arraitz	\N	\N	Honorifica	\N	ordinario	\N	\N	\N	\N
428	\N	M Carmen	Huertas Senda	\N	\N	\N	37393089B	1926-05-13	2003-01-01	428	F	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.645	\N	Lizaso	\N	2025-07-31	Honorifica	\N	ordinario	\N	\N	\N	\N
429	\N	Juan José	Lopez Lista	\N	\N	\N	15650478J	1936-11-16	2003-01-01	429	H	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.646	\N	Arostegi	\N	\N	Honorifica	\N	ordinario	\N	\N	\N	\N
431	\N	Martín	Echaide Arístegi	\N	\N	\N	15624033H	1924-09-29	2003-01-01	431	H	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.647	\N	Lantz	\N	\N	Honorifica	\N	ordinario	\N	\N	\N	\N
432	\N	Joaquin 	Echenique Lacunza	\N	\N	\N	15686972Y	1941-08-04	2003-01-01	432	H	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.648	\N	Burutain	\N	\N	Numeraria	\N	ordinario	\N	\N	\N	\N
433	\N	M Anunciacion	Echart Lizaso	\N	\N	\N	15861149G	1936-03-23	2003-01-01	433	F	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.648	\N	Lizaso	\N	\N	Honorifica	\N	ordinario	\N	\N	\N	\N
434	\N	Francisco	Echart Insausti	\N	\N	\N	15820149J	1934-10-09	2003-01-01	434	H	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.649	\N	Lizaso	\N	\N	Honorifica	\N	ordinario	\N	\N	\N	\N
435	\N	M Teresa	Unanua Arrechea	\N	\N	\N	72621382D	1940-08-10	2003-01-01	435	F	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.649	\N	Arrarats	\N	\N	Honorifica	\N	ordinario	\N	\N	\N	\N
436	\N	Luis 	Mariezcurrena Etxeguia	\N	\N	\N	15657652B	1931-08-25	2003-01-01	436	H	Baja	\N	\N	\N	\N	2026-04-23 16:53:00.65	\N	Arrarats	\N	\N	Honorifica	\N	ordinario	\N	\N	\N	\N
437	\N	Miguel	Marticorena Lasarte	\N	\N	\N	72609331X	1937-01-30	2003-01-01	437	H	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.65	\N	Igoa	\N	\N	Honorifica	\N	ordinario	\N	\N	\N	\N
438	\N	Juan	Macaya Eslava	\N	\N	\N	15861770G	1929-06-24	2003-01-01	438	H	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.651	\N	Alkotz	\N	\N	Honorifica	\N	ordinario	\N	\N	\N	\N
440	\N	Crescencia	Gárate Balda	\N	\N	\N	72610770T	1941-09-25	2003-01-01	440	F	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.652	\N	Zenotz	\N	\N	Numeraria	\N	ordinario	\N	\N	\N	\N
441	\N	Catalina	Cenoz Aldaya	\N	\N	\N	72613716W	1943-05-09	2003-01-01	441	F	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.653	\N	Latasa	\N	\N	Numeraria	\N	ordinario	\N	\N	\N	\N
442	\N	Benito	Villabona Balda	\N	\N	\N	15861205Z	1936-03-03	2003-01-01	442	H	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.653	\N	Latasa	\N	\N	Honorifica	\N	ordinario	\N	\N	\N	\N
443	\N	José M	Ariztegi Ciga	\N	\N	\N	15857001L	1935-10-21	2003-01-01	443	H	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.654	\N	Lantz	\N	\N	Honorifica	\N	ordinario	\N	\N	\N	\N
444	\N	M Isabel	Mariñelarena Lozano	\N	\N	\N	15732099F	1942-02-05	2003-01-01	444	F	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.654	\N	Gerendiain	\N	\N	Numeraria	\N	ordinario	\N	\N	\N	\N
445	\N	M Isabel	Baraibar Elizaga	\N	\N	\N	72616754G	1944-08-08	2003-01-01	445	F	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.655	\N	Olague	\N	\N	Numeraria	\N	ordinario	\N	\N	\N	\N
447	\N	Vicente	Gurbindo Aldaz	\N	\N	\N	15861390S	1941-09-09	2003-01-01	447	H	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.655	\N	Eltzaburu	\N	\N	Numeraria	\N	ordinario	\N	\N	\N	\N
448	\N	Simón	Iraizoz Ollcarizqueta	\N	\N	\N	15861316X	1938-03-01	2003-01-01	448	H	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.656	\N	Latasa	\N	\N	Honorifica	\N	ordinario	\N	\N	\N	\N
449	\N	Consolación	Beunza Urriza	\N	\N	\N	15861738H	1938-02-15	2003-01-01	449	F	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.656	\N	Alkotz	\N	\N	Honorifica	\N	ordinario	\N	\N	\N	\N
450	\N	Agustin	Telletxea Oskoz	\N	\N	\N	15658055T	1939-10-19	2003-01-01	450	H	Baja	\N	\N	\N	\N	2026-04-23 16:53:00.657	\N	Gartzaron	\N	\N	Honorifica	\N	ordinario	\N	\N	\N	\N
451	\N	Mercedes	Mutuberría Cía	\N	\N	\N	15773281L	1948-04-03	2003-01-01	451	F	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.657	\N	Eltzaburu	\N	\N	Numeraria	\N	ordinario	\N	\N	\N	\N
452	\N	Isidro	Iribarren Toral	\N	\N	\N	15861094H	1936-05-08	2003-01-01	452	H	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.658	\N	Eltzaburu	\N	\N	Honorifica	\N	ordinario	\N	\N	\N	\N
453	\N	Gregorio	Arangoa Ilarregi	\N	\N	\N	15724884Z	1938-03-13	2003-01-01	453	H	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.658	\N	Iraizotz	\N	\N	Honorifica	\N	ordinario	\N	\N	\N	\N
455	\N	Rufino	Gainza Oroz	\N	\N	\N	15658054E	1937-02-13	2003-01-01	455	H	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.659	\N	Gartzaron	\N	\N	Honorifica	\N	ordinario	\N	\N	\N	\N
456	\N	Virginia Catal	García Gobeo	\N	\N	\N	15749289Q	1946-04-22	2003-01-01	456	F	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.66	\N	Zenotz	\N	\N	Numeraria	\N	ordinario	\N	\N	\N	\N
457	\N	Lourdes	Beunza Urriza	\N	\N	\N	15737840K	1941-09-12	2003-01-01	457	F	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.66	\N	Lizaso	\N	\N	Numeraria	\N	ordinario	\N	\N	\N	\N
458	\N	José	Domeño Beunza	\N	\N	\N	15861279L	1938-05-24	2003-01-01	458	H	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.661	\N	Lizaso	\N	\N	Honorifica	\N	ordinario	\N	\N	\N	\N
459	\N	Victoriano	Gelbenzu Goyenaga	\N	\N	\N	15861550Z	1996-11-02	2003-01-01	459	H	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.661	\N	Auza	\N	\N	Numeraria	\N	ordinario	\N	\N	\N	\N
460	\N	M Angeles	Domeño Beunza	\N	\N	\N	15861280C	1931-02-26	2003-01-01	460	F	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.662	\N	Iraizotz	\N	\N	Honorifica	\N	ordinario	\N	\N	\N	\N
462	\N	Francisco	Goñi Ezcurra	\N	\N	\N	15861650E	1938-08-09	2003-01-01	462	H	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.663	\N	Arraitz	\N	\N	Honorifica	\N	ordinario	\N	\N	\N	\N
463	\N	M Asunción	Gubío Iriberri	\N	\N	\N	72623739C	1942-05-11	2003-01-01	463	F	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.664	\N	Arraitz	\N	\N	Numeraria	\N	ordinario	\N	\N	\N	\N
464	\N	Florencio	Mutiloa Eguaras	\N	\N	\N	15730744D	1933-03-23	2003-01-01	464	H	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.664	\N	Arraitz	\N	\N	Honorifica	\N	ordinario	\N	\N	\N	\N
465	\N	M Josefa	Villabona Balda	\N	\N	\N	15861210L	1937-06-24	2003-01-01	465	F	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.665	\N	Arraitz	\N	\N	Honorifica	\N	ordinario	\N	\N	\N	\N
466	\N	Juan José	Gubia Iriberri	\N	\N	\N	15861654A	1937-10-15	2003-01-01	466	H	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.665	\N	Arraitz	\N	\N	Honorifica	\N	ordinario	\N	\N	\N	\N
467	\N	Josefina 	Goñi Oyarzun	\N	\N	\N	15860909V	1937-04-22	2004-01-01	467	F	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.666	\N	Lizaso	\N	\N	Honorifica	\N	ordinario	\N	\N	\N	\N
469	\N	Antonio Ja	Villabona Mezquiriz	\N	\N	\N	15747421B	1935-06-01	2004-01-01	469	H	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.667	\N	Gerendiain	\N	\N	Honorifica	\N	ordinario	\N	\N	\N	\N
470	\N	M Dolores	Alberro Iraizoz	\N	\N	\N	15861274Z	1940-05-13	2004-01-01	470	F	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.667	\N	Gerendiain	\N	\N	Honorifica	\N	ordinario	\N	\N	\N	\N
471	\N	Andrés	Olague Roncal	\N	\N	\N	15861478B	1934-12-15	2004-01-01	471	H	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.668	\N	Gerendiain	\N	\N	Honorifica	\N	ordinario	\N	\N	\N	\N
472	\N	Serafín	Aguirre Echeverría	\N	\N	\N	72615571V	1943-05-29	2004-01-01	472	H	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.668	\N	Gerendiain	\N	\N	Numeraria	\N	ordinario	\N	\N	\N	\N
473	\N	M Mercedes	Echeberria Olague	\N	\N	\N	72623714H	1944-11-18	2004-01-01	473	F	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.669	\N	Zenotz	\N	\N	Numeraria	\N	ordinario	\N	\N	\N	\N
474	\N	M Carmen	Beunza Urriza	\N	\N	\N	15861831L	1940-03-07	2004-01-01	474	F	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.67	\N	Gerendiain	\N	\N	Honorifica	\N	ordinario	\N	\N	\N	\N
475	\N	Luisa	Victorio Sierra	\N	\N	\N	1153047B	1939-05-04	2004-01-01	475	F	Baja	\N	\N	\N	\N	2026-04-23 16:53:00.67	\N	Iraizotz	\N	\N	Honorifica	\N	ordinario	\N	\N	\N	\N
476	\N	Doroteo	Orrio Iraizoz	\N	\N	\N	15732234G	1944-03-22	2004-01-01	476	H	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.671	\N	Gaskue	\N	\N	Numeraria	\N	ordinario	\N	\N	\N	\N
478	\N	Martín	Mariezcurrena Hualde	\N	\N	\N	15722674N	1940-08-18	2004-01-01	478	H	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.672	\N	Lantz	\N	\N	Honorifica	\N	ordinario	\N	\N	\N	\N
479	\N	M Rosario	Andueza Lusarreta	\N	\N	\N	15772287Z	1947-10-14	2004-01-01	479	F	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.673	\N	Olague	\N	\N	Numeraria	\N	ordinario	\N	\N	\N	\N
480	\N	M Santos	Arce Zabaleta	\N	\N	\N	15861080G	1936-11-01	2004-01-01	480	F	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.673	\N	Auza	\N	\N	Honorifica	\N	ordinario	\N	\N	\N	\N
481	\N	Anselmo 	Alberro Oroyein	\N	\N	\N	15745308Z	1943-06-28	2004-01-01	481	H	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.674	\N	Auza	\N	\N	Numeraria	\N	ordinario	\N	\N	\N	\N
482	\N	Luis 	Arroyo Ereña	\N	\N	\N	15334299S	1947-09-11	2004-01-01	482	H	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.674	\N	Auza	\N	\N	Numeraria	\N	ordinario	\N	\N	\N	\N
484	\N	Mª Jesus	Arostegui Larraza	\N	\N	\N	15736466G	1943-06-22	2004-01-01	484	F	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.675	\N	Beuntza	\N	\N	Numeraria	\N	ordinario	\N	\N	\N	\N
485	\N	Juan	Yaben Mariñelarena	\N	\N	\N	15734067C	1941-12-27	2004-01-01	485	H	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.676	\N	Beuntza	\N	\N	Numeraria	\N	ordinario	\N	\N	\N	\N
487	\N	Ignacio	Irurita Ibarrola	\N	\N	\N	15650595S	1925-07-31	2004-01-01	487	H	Baja	\N	\N	\N	\N	2026-04-23 16:53:00.677	\N	Beuntza	\N	\N	Honorifica	\N	ordinario	\N	\N	\N	\N
488	\N	Ignacia	Erviti Ibarrola	\N	\N	\N	15650561G	1937-04-01	2004-01-01	488	F	Baja	\N	\N	\N	\N	2026-04-23 16:53:00.678	\N	Beuntza	\N	\N	Honorifica	\N	ordinario	\N	\N	\N	\N
489	\N	Román	Irurita Ibarrola	\N	\N	\N	15650600C	1928-02-13	2004-01-01	489	H	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.678	\N	Beuntza	\N	\N	Honorifica	\N	ordinario	\N	\N	\N	\N
490	\N	Francisco	Lanzas Fernandez	\N	\N	\N	15636334Z	1929-05-31	2004-01-01	490	H	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.679	\N	Berasain	\N	\N	Honorifica	\N	ordinario	\N	\N	\N	\N
491	\N	Catalina	Cobo German	\N	\N	\N	15543355R	1929-07-22	2004-01-01	491	F	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.679	\N	Berasain	\N	\N	Honorifica	\N	ordinario	\N	\N	\N	\N
493	\N	M Antonia	Goñi Oyarzun	\N	\N	\N	15757183K	1946-10-08	2004-01-01	493	F	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.68	\N	Berasain	\N	\N	Numeraria	\N	ordinario	\N	\N	\N	\N
494	\N	Mary Carmen	Mariñelarena Oyarzun	\N	\N	\N	15771085P	1950-06-12	2004-01-01	494	F	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.681	\N	Gaskue	\N	\N	Numeraria	\N	ordinario	\N	\N	\N	\N
495	\N	José	Lopez Undiano	\N	\N	\N	15650698A	1940-05-21	2004-01-01	495	H	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.682	\N	Berasain	\N	\N	Honorifica	\N	ordinario	\N	\N	\N	\N
496	\N	Miguel M	Gerendiáin Erice	\N	\N	\N	72609892L	1941-11-25	2004-01-01	496	H	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.682	\N	Berasain	\N	\N	Numeraria	\N	ordinario	\N	\N	\N	\N
497	\N	M José Blanca	Gerendiáin Erice	\N	\N	\N	72652743K	1945-01-17	2004-01-01	497	F	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.683	\N	Berasain	\N	\N	Numeraria	\N	ordinario	\N	\N	\N	\N
499	\N	Dionisio	Bergera Azcárate	\N	\N	\N	15650492G	1928-10-09	2004-01-01	499	H	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.684	\N	Eritze	\N	\N	Honorifica	\N	ordinario	\N	\N	\N	\N
500	\N	Werner	Warmbrodt Signer	\N	\N	\N	2321358Z	1931-08-10	2004-01-01	500	H	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.684	\N	Arostegi	\N	\N	Honorifica	\N	ordinario	\N	\N	\N	\N
501	\N	Ana M	Quintana Lopez	\N	\N	\N	14998359J	1934-01-18	2004-01-01	501	F	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.685	\N	Arostegi	\N	\N	Honorifica	\N	ordinario	\N	\N	\N	\N
502	\N	José	Oyarzun Goñi	\N	\N	\N	15650633F	1932-09-22	2004-01-01	502	H	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.685	\N	Beuntza	\N	\N	Honorifica	\N	ordinario	\N	\N	\N	\N
503	\N	Jose Manuel	Yaben Mariñelarena	\N	\N	\N	15650562	1936-05-29	2004-01-01	503	H	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.685	\N	Egillor	\N	\N	Honorifica	\N	ordinario	\N	\N	\N	\N
504	\N	M Asunción	Echenique Lacunza	\N	\N	\N	29147256T	1934-11-15	2004-01-01	504	F	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.686	\N	Arraitz	\N	\N	Honorifica	\N	ordinario	\N	\N	\N	\N
505	\N	M Gloria	Yaben Mariñelarena	\N	\N	\N	15647794C	1938-04-15	2004-01-01	505	F	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.686	\N	Egillor	\N	\N	Honorifica	\N	ordinario	\N	\N	\N	\N
507	\N	Antonio Gabriel 	Ripa Paternain	\N	\N	\N	72618869A	1940-05-08	2004-01-01	507	H	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.687	\N	Egozkue	\N	\N	Honorifica	\N	ordinario	\N	\N	\N	\N
508	\N	M Josefa	Ollo Lizaso	\N	\N	\N	72644590X	1948-08-23	2004-01-01	508	F	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.688	\N	Gaskue	\N	\N	Numeraria	\N	ordinario	\N	\N	\N	\N
509	\N	Rufina	Sarasibar Ibarrola	\N	\N	\N	72609884B	1942-04-07	2004-01-01	509	F	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.688	\N	Beuntza	\N	\N	Numeraria	\N	ordinario	\N	\N	\N	\N
510	\N	Constantino	Yaben Mariñelarena	\N	\N	\N	15650563Y	1940-01-08	2004-01-01	510	H	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.689	\N	Beuntza	\N	\N	Honorifica	\N	ordinario	\N	\N	\N	\N
511	\N	Petra	Yaben Mariñelarena	\N	\N	\N	15650569N	1935-04-29	2004-01-01	511	F	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.69	\N	Beuntza	\N	\N	Honorifica	\N	ordinario	\N	\N	\N	\N
513	\N	M Consuelo	Villegas Olazaran	\N	\N	\N	15758165Z	1945-09-02	2005-01-01	513	F	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.692	\N	Ostitz	\N	\N	Numeraria	\N	ordinario	\N	\N	\N	\N
514	\N	Miguel M	Juvera Irurita	\N	\N	\N	15857204S	1938-05-08	2005-01-01	514	H	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.692	\N	Ostitz	\N	\N	Honorifica	\N	ordinario	\N	\N	\N	\N
515	\N	Florencia	Arano Lampreabe	\N	\N	\N	15840601H	1959-05-29	2005-01-01	515	F	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.693	\N	Beruete	\N	\N	Numeraria	\N	ordinario	\N	\N	\N	\N
516	\N	Meltxora	Lampreabe Segura	\N	\N	\N	15657814N	1927-09-08	2005-01-01	516	F	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.693	\N	Beruete	\N	\N	Honorifica	\N	ordinario	\N	\N	\N	\N
517	\N	M Ascensión	Perez Iribarren	\N	\N	\N	15633364B	1939-05-04	2005-01-01	517	F	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.694	\N	Iraizotz	\N	\N	Honorifica	\N	ordinario	\N	\N	\N	\N
518	\N	M Angeles	Espelosín Olague	\N	\N	\N	15861643S	1933-05-15	2005-01-01	518	F	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.694	\N	Arraitz	\N	\N	Honorifica	\N	ordinario	\N	\N	\N	\N
519	\N	Francisco	Orrio San Martín	\N	\N	\N	15634964R	1932-02-19	2005-01-01	519	H	Baja	\N	\N	\N	\N	2026-04-23 16:53:00.695	\N	Arraitz	\N	\N	Honorifica	\N	ordinario	\N	\N	\N	\N
520	\N	M Pilar	Goñi Ibero	\N	\N	\N	72651260X	1952-06-22	2005-01-01	520	F	Baja	\N	\N	\N	\N	2026-04-23 16:53:00.695	\N	Gelbentzu	\N	\N	Numeraria	\N	ordinario	\N	\N	\N	\N
522	\N	Juan	Arangoa Ilarregi	\N	\N	\N	15663983V	1935-06-19	2005-01-01	522	H	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.696	\N	Gartzaron	\N	\N	Honorifica	\N	ordinario	\N	\N	\N	\N
523	\N	Alicia Esther	Legarra Iriarte	\N	\N	\N	72623061D	1943-02-24	2005-01-01	523	F	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.697	\N	Gartzaron	\N	\N	Numeraria	\N	ordinario	\N	\N	\N	\N
524	\N	M J Gregoria	Goldaraz Orrio	\N	\N	\N	72618531X	1945-04-12	2005-01-01	524	F	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.697	\N	Beuntza	\N	\N	Numeraria	\N	ordinario	\N	\N	\N	\N
525	\N	Vicente	Azpiroz Gartzaron	\N	\N	\N	15714591W	1938-11-12	2005-01-01	525	H	Baja	\N	\N	\N	\N	2026-04-23 16:53:00.697	\N	Beuntza	\N	\N	Honorifica	\N	ordinario	\N	\N	\N	\N
526	\N	José Luis	Viniegra Andueza	\N	\N	\N	15736042V	1941-07-29	2005-01-01	526	H	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.698	\N	Arraitz	\N	\N	Numeraria	\N	ordinario	\N	\N	\N	\N
528	\N	M Sagrario	Perez Arregui	\N	\N	\N	29149635X	1970-01-27	2005-01-01	528	F	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.699	\N	Iraizotz	\N	\N	Numeraria	\N	ordinario	\N	\N	\N	\N
529	\N	Irene	Zalba Goñi	\N	\N	\N	15703808Y	1933-10-06	2005-01-01	529	F	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.699	\N	Etulain	\N	\N	Honorifica	\N	ordinario	\N	\N	\N	\N
530	\N	M Gloria	Oronoz Huarte	\N	\N	\N	15657962E	1933-04-15	2005-01-01	530	F	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.699	\N	Igoa	\N	\N	Honorifica	\N	ordinario	\N	\N	\N	\N
531	\N	M Isabel	Huarriz Oteiza	\N	\N	\N	15861664J	1935-08-02	2005-01-01	531	F	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.7	\N	Arraitz	\N	\N	Honorifica	\N	ordinario	\N	\N	\N	\N
532	\N	Lázaro	Esain Garro	\N	\N	\N	15635449A	1927-10-31	2005-01-01	532	H	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.7	\N	Ilarregi	\N	\N	Honorifica	\N	ordinario	\N	\N	\N	\N
533	\N	M Dolores	Tornaría Echeverría	\N	\N	\N	15861582T	1938-01-20	2005-01-01	533	F	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.701	\N	Alkotz	\N	\N	Honorifica	\N	ordinario	\N	\N	\N	\N
534	\N	Francisco	Balda Erviti	\N	\N	\N	15861720T	1933-02-15	2005-01-01	534	H	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.701	\N	Alkotz	\N	\N	Honorifica	\N	ordinario	\N	\N	\N	\N
536	\N	M Dolores	Juvera Irurita	\N	\N	\N	15741784D	1940-09-10	2005-01-01	536	F	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.702	\N	Olague	\N	\N	Honorifica	\N	ordinario	\N	\N	\N	\N
537	\N	Sagrario	Ollo Lizaso	\N	\N	\N	72659773J	1951-06-07	2005-01-01	537	F	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.702	\N	Berasain	\N	\N	Numeraria	\N	ordinario	\N	\N	\N	\N
538	\N	Evaristo	Erviti Beramendi	\N	\N	\N	15862923F	1935-06-13	2005-01-01	538	H	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.703	\N	Alkotz	\N	\N	Honorifica	\N	ordinario	\N	\N	\N	\N
539	\N	Jesús M	Barberena Erroizarena	\N	\N	\N	15624467S	1933-06-03	2005-01-01	539	H	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.703	\N	Alkotz	\N	\N	Honorifica	\N	ordinario	\N	\N	\N	\N
540	\N	Juan	Ariztegi Mariezcurrena	\N	\N	\N	15861081M	1939-07-14	2005-01-01	540	H	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.704	\N	Suarbe	\N	\N	Honorifica	\N	ordinario	\N	\N	\N	\N
541	\N	M Joaquina	Ilarregui Arce	\N	\N	\N	72623693C	1943-04-17	2005-01-01	541	F	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.704	\N	Suarbe	\N	\N	Numeraria	\N	ordinario	\N	\N	\N	\N
543	\N	Juan José	Leciaga Arrechea	\N	\N	\N	72610744C	1940-04-17	2006-01-01	543	H	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.705	\N	Arrarats	\N	\N	Honorifica	\N	ordinario	\N	\N	\N	\N
544	\N	José Ignacio	Ariztegi Ciga	\N	\N	\N	72613553T	1940-11-08	2006-01-01	544	H	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.705	\N	Lantz	\N	\N	Honorifica	\N	ordinario	\N	\N	\N	\N
545	\N	M Tomasa	Zubieta Iraizoz	\N	\N	\N	15773651K	1950-02-24	2006-01-01	545	F	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.706	\N	Arrarats	\N	\N	Numeraria	\N	ordinario	\N	\N	\N	\N
546	\N	Justino	Egozcue Oyaregui	\N	\N	\N	15852032H	1939-09-13	2006-01-01	546	H	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.706	\N	Lantz	\N	\N	Honorifica	\N	ordinario	\N	\N	\N	\N
547	\N	M Carmen	Echeguia Lasarte	\N	\N	\N	72610793T	1941-03-11	2006-01-01	547	F	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.706	\N	Igoa	\N	\N	Numeraria	\N	ordinario	\N	\N	\N	\N
548	\N	Pedro M	Ezcurra Alsua	\N	\N	\N	15662831S	1935-12-25	2006-01-01	548	H	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.707	\N	Igoa	\N	\N	Honorifica	\N	ordinario	\N	\N	\N	\N
550	\N	Florentino	Larrayoz Gelbenzu	\N	\N	\N	15861040X	1939-10-02	2006-01-01	550	H	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.708	\N	Larraintzar	\N	\N	Honorifica	\N	ordinario	\N	\N	\N	\N
553	\N	Alicia  	Zalba Goñi	\N	\N	\N	15749403S	1938-10-13	2006-01-01	553	F	Baja	\N	\N	\N	\N	2026-04-23 16:53:00.709	\N	Arraitz	\N	\N	Honorifica	\N	ordinario	\N	\N	\N	\N
554	\N	M Jesús	Zalba Goñi	\N	\N	\N	15762819E	1930-12-18	2006-01-01	554	F	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.71	\N	Arraitz	\N	\N	Honorifica	\N	ordinario	\N	\N	\N	\N
555	\N	José	Arriaga Sarriguren	\N	\N	\N	15751507A	1945-11-12	2006-01-01	555	H	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.71	\N	Arostegi	\N	\N	Numeraria	\N	ordinario	\N	\N	\N	\N
556	\N	M Nieves	Arano Lampreabe	\N	\N	\N	15795203E	1953-08-15	2006-01-01	556	F	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.71	\N	Beruete	\N	\N	Numeraria	\N	ordinario	\N	\N	\N	\N
557	\N	Martín	Liceaga Susperregui	\N	\N	\N	72610748R	1944-07-13	2006-01-01	557	H	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.711	\N	Beruete	\N	\N	Numeraria	\N	ordinario	\N	\N	\N	\N
558	\N	Javier	Churraut Burguete	\N	\N	\N	15714902Z	1935-12-03	2006-01-01	558	H	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.711	\N	Arostegi	\N	\N	Honorifica	\N	ordinario	\N	\N	\N	\N
559	\N	Ignacia	Aguirre Laseca	\N	\N	\N	15040209A	1928-11-30	2006-01-01	559	F	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.712	\N	Eltzaburu	\N	\N	Honorifica	\N	ordinario	\N	\N	\N	\N
560	\N	Martín Ign	Goyenaga Villabona	\N	\N	\N	15726664T	1931-08-17	2006-01-01	560	H	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.712	\N	Alkotz	\N	2025-12-24	Honorifica	\N	ordinario	\N	\N	\N	\N
562	\N	Nartxi	Navarro Arribillaga	\N	\N	\N	15745924D	1943-12-14	2006-01-01	562	F	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.713	\N	Gerendiain	\N	\N	Numeraria	\N	ordinario	\N	\N	\N	\N
563	\N	M Pilar	Urriza Iriarte	\N	\N	\N	15728196Z	1942-10-14	2006-01-01	563	F	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.714	\N	Lantz	\N	\N	Numeraria	\N	ordinario	\N	\N	\N	\N
564	\N	M Angeles	Diez de Ulzurrun Elizalde	\N	\N	\N	15730050M	1942-07-23	2006-01-01	564	F	Baja	\N	\N	\N	\N	2026-04-23 16:53:00.715	\N	Lantz	\N	2023-01-01	Numeraria	\N	ordinario	\N	\N	\N	\N
565	\N	Magdalena	Larrrañeta Arraras	\N	\N	\N	15058910M	1939-05-24	2006-01-01	565	F	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.715	\N	Beuntza	\N	\N	Honorifica	\N	ordinario	\N	\N	\N	\N
566	\N	M Pilar	Oses Muru	\N	\N	\N	72613807R	1945-10-11	2006-01-01	566	F	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.716	\N	Larraintzar	\N	\N	Numeraria	\N	ordinario	\N	\N	\N	\N
567	\N	Juan	Altuna Erice	\N	\N	\N	15861070V	1933-01-25	2007-01-01	567	H	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.716	\N	Auza	\N	\N	Honorifica	\N	ordinario	\N	\N	\N	\N
568	\N	Pedro José	Ilarregui Arce	\N	\N	\N	72623749F	1946-03-01	2007-01-01	568	H	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.717	\N	Auza	\N	\N	Numeraria	\N	ordinario	\N	\N	\N	\N
569	\N	M Jesús	Lajos Olaverri	\N	\N	\N	72624357V	1943-03-31	2007-01-01	569	F	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.717	\N	Auza	\N	\N	Numeraria	\N	ordinario	\N	\N	\N	\N
570	\N	José Luis	Tornaría Bengoetxea	\N	\N	\N	15746246D	1942-02-25	2007-01-01	570	H	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.718	\N	Auza	\N	\N	Numeraria	\N	ordinario	\N	\N	\N	\N
572	\N	M Angeles	Elizondo Erasun	\N	\N	\N	15813575V	1954-02-12	2007-01-01	572	F	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.719	\N	Arostegi	\N	\N	Numeraria	\N	ordinario	\N	\N	\N	\N
573	\N	M Milagros	Lasarte Tornaría	\N	\N	\N	15784659N	1952-03-21	2007-01-01	573	F	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.72	\N	Auza	\N	\N	Numeraria	\N	ordinario	\N	\N	\N	\N
574	\N	Ana M	Gubia Oyaregui	\N	\N	\N	72613206K	1942-03-04	2007-01-01	574	F	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.72	\N	Auza	\N	\N	Numeraria	\N	ordinario	\N	\N	\N	\N
575	\N	M Carmen	Lasarte Tornaría	\N	\N	\N	15757038Z	1944-02-09	2007-01-01	575	F	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.72	\N	Auza	\N	\N	Numeraria	\N	ordinario	\N	\N	\N	\N
576	\N	Fermina	Arregui Lasarte	\N	\N	\N	15775115J	1948-10-14	2007-01-01	576	F	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.721	\N	Igoa	\N	\N	Numeraria	\N	ordinario	\N	\N	\N	\N
577	\N	Ascencio	Alsúa Huarte	\N	\N	\N	15657967G	1939-06-06	2007-01-01	577	H	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.721	\N	Igoa	\N	\N	Honorifica	\N	ordinario	\N	\N	\N	\N
578	\N	Juana M	Mezquiriz Berasain	\N	\N	\N	72623710Z	1939-03-06	2007-01-01	578	F	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.722	\N	Alkotz	\N	\N	Honorifica	\N	ordinario	\N	\N	\N	\N
580	\N	Miguel	Lopez Garro	\N	\N	\N	15737872F	1940-09-17	2007-01-01	580	H	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.723	\N	Beruete	\N	\N	Honorifica	\N	ordinario	\N	\N	\N	\N
581	\N	M Josefa	Tellechea Leceaga	\N	\N	\N	72610794R	1941-11-06	2007-01-01	581	F	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.723	\N	Lantz	\N	\N	Numeraria	\N	ordinario	\N	\N	\N	\N
582	\N	Juana 	Baleztena Indakoetxea	\N	\N	\N	15217171A	1929-08-31	2007-01-01	582	F	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.723	\N	Gerendiain	\N	\N	Honorifica	\N	ordinario	\N	\N	\N	\N
583	\N	Ines	Etulain Azcarate	\N	\N	\N	15857169A	1922-01-21	1991-03-01	583	F	Baja	\N	\N	\N	\N	2026-04-23 16:53:00.724	\N	Olague	\N	\N	Honorifica	\N	ordinario	\N	\N	\N	\N
584	\N	Crescencia	Noain Insausti	\N	\N	\N	72618718J	1946-12-18	2007-08-13	584	F	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.724	\N	Oronoz	\N	\N	Numeraria	\N	ordinario	\N	\N	\N	\N
585	\N	Martín	Juanena Iribarren	\N	\N	\N	18859864W	1929-08-31	2007-08-13	585	H	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.725	\N	Oronoz	\N	\N	Honorifica	\N	ordinario	\N	\N	\N	\N
587	\N	M Sagrario	Ariztegi Narvaez	\N	\N	\N	15745355S	1941-12-22	2007-08-14	587	F	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.726	\N	Alkotz	\N	\N	Numeraria	\N	ordinario	\N	\N	\N	\N
588	\N	Graciano	Ciaurriz Elizondo	\N	\N	\N	15861741K	1933-01-01	2007-08-14	588	H	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.726	\N	Alkotz	\N	\N	Honorifica	\N	ordinario	\N	\N	\N	\N
589	\N	Micaela	Olague Oskoz	\N	\N	\N	15861778N	1930-11-26	2007-08-14	589	F	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.726	\N	Alkotz	\N	\N	Honorifica	\N	ordinario	\N	\N	\N	\N
590	\N	Martín	Sala Iribarren	\N	\N	\N	16208995K	1942-03-18	2007-11-02	590	H	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.727	\N	Udabe	\N	\N	Numeraria	\N	ordinario	\N	\N	\N	\N
591	\N	Juan Jesús	Aríztegui Mariezcurrena	\N	\N	\N	15770305X	1949-08-30	2007-11-26	591	H	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.727	\N	Ziaurritz	\N	\N	Numeraria	\N	ordinario	\N	\N	\N	\N
592	\N	Juan Martín	Oyaregui Goñi	\N	\N	\N	15857095K	1940-06-14	2008-01-16	592	H	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.728	\N	Lantz	\N	\N	Honorifica	\N	ordinario	\N	\N	\N	\N
594	\N	Jose Mª 	Villanueva Berasain	\N	\N	\N	72624633V	1945-04-13	2008-01-16	594	H	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.729	\N	Auza	\N	\N	Numeraria	\N	ordinario	\N	\N	\N	\N
595	\N	M Pilar	Aldaya Iribarren	\N	\N	\N	72694626K	1945-04-27	2008-01-16	595	F	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.73	\N	Auza	\N	\N	Numeraria	\N	ordinario	\N	\N	\N	\N
596	\N	Ángeles del	Campo Senosiain	\N	\N	\N	15759763W	1947-01-01	2008-01-01	596	F	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.73	\N	Iruña	\N	\N	Numeraria	\N	ordinario	\N	\N	\N	\N
597	\N	Pedro	Iraizoz Iragui	\N	\N	\N	15857191W	1919-03-26	1991-03-01	597	H	Baja	\N	\N	\N	\N	2026-04-23 16:53:00.731	\N	Olague	\N	\N	Honorifica	\N	ordinario	\N	\N	\N	\N
598	\N	Carmelo	Zalba Ortabe	\N	\N	\N	15759453Z	1947-03-31	2008-01-22	598	H	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.731	\N	Iruña	\N	\N	Numeraria	\N	ordinario	\N	\N	\N	\N
599	\N	Teodoro	Goñi Villanueva	\N	\N	\N	15657645G	1934-01-24	2008-01-22	599	H	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.732	\N	Burlata	\N	\N	Honorifica	\N	ordinario	\N	\N	\N	\N
600	\N	Rosa M	Iraizoz Etuláin	\N	\N	\N	72642604W	1947-05-25	2008-01-22	600	F	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.732	\N	Burutain	\N	\N	Numeraria	\N	ordinario	\N	\N	\N	\N
601	\N	M Mercedes	Troyas Itoiz	\N	\N	\N	15758623N	1947-01-03	2008-01-22	601	F	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.733	\N	Iruña	\N	\N	Numeraria	\N	ordinario	\N	\N	\N	\N
603	\N	Francisca	Vergara Echeguia	\N	\N	\N	15657709E	1938-05-30	2008-01-22	603	F	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.734	\N	Burlata	\N	\N	Honorifica	\N	ordinario	\N	\N	\N	\N
604	\N	Juana M 	Cizur Gurbindo	\N	\N	\N	72646735Q	1945-11-01	2008-01-22	604	F	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.734	\N	Etsain	\N	2023-12-01	Numeraria	\N	ordinario	\N	\N	\N	\N
605	\N	Epifanio	Zaro Beraza	\N	\N	\N	15749374D	1942-11-28	2008-01-22	605	H	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.734	\N	Burutain	\N	\N	Numeraria	\N	ordinario	\N	\N	\N	\N
606	\N	M Luz Franc	Iraola Larramendi	\N	\N	\N	72616878J	1946-01-25	2008-01-22	606	F	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.735	\N	Burutain	\N	\N	Numeraria	\N	ordinario	\N	\N	\N	\N
607	\N	Beatriz	Echeguia Cenoz	\N	\N	\N	72610777F	1941-05-10	2008-02-04	607	F	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.735	\N	Zenotz	\N	\N	Numeraria	\N	ordinario	\N	\N	\N	\N
608	\N	Juan	Zandio Jaunsaras	\N	\N	\N	15857311F	1932-09-25	2008-03-06	608	H	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.736	\N	Etsain	\N	\N	Honorifica	\N	ordinario	\N	\N	\N	\N
610	\N	David	Eleta Larrayoz	\N	\N	\N	15647386A	1938-09-30	2008-03-06	610	H	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.737	\N	Olague	\N	\N	Honorifica	\N	ordinario	\N	\N	\N	\N
611	\N	M Carmen	Morondo Ciordia	\N	\N	\N	15707958Q	1941-03-24	2008-04-18	611	F	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.737	\N	Eltso	\N	\N	Numeraria	\N	ordinario	\N	\N	\N	\N
612	\N	M Sagrario	Arangoa Riezu	\N	\N	\N	15798684F	1953-07-09	2008-04-21	612	F	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.738	\N	Beruete	\N	\N	Numeraria	\N	ordinario	\N	\N	\N	\N
613	\N	José	Navarro Arribillaga	\N	\N	\N	72610724T	1942-04-16	2008-04-21	613	H	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.738	\N	Beruete	\N	\N	Numeraria	\N	ordinario	\N	\N	\N	\N
614	\N	M Gracia	Echábarri Munita	\N	\N	\N	15663460T	1940-05-15	2008-04-21	614	F	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.739	\N	Burlata	\N	\N	Honorifica	\N	ordinario	\N	\N	\N	\N
615	\N	Gumersindo	Berasain Arribillaga	\N	\N	\N	15728208A	1930-03-13	2008-04-21	615	H	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.739	\N	Alkotz	\N	\N	Honorifica	\N	ordinario	\N	\N	\N	\N
617	\N	Richard Ernest 	Josep Rice	\N	\N	\N	302356332B	1938-08-21	2008-04-21	617	H	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.74	\N	Lizaso	\N	\N	Honorifica	\N	ordinario	\N	\N	\N	\N
618	\N	Agustín	Iribarren Huarriz	\N	\N	\N	15857066S	1935-08-28	2008-06-30	618	H	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.741	\N	Lantz	\N	\N	Honorifica	\N	ordinario	\N	\N	\N	\N
619	\N	Rosa M Magda	García Legarrea	\N	\N	\N	15155096M	1946-07-22	2008-06-30	619	F	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.741	\N	Iraizotz	\N	\N	Numeraria	\N	ordinario	\N	\N	\N	\N
620	\N	M Lourdes	García Legarrea	\N	\N	\N	72649524E	1944-08-22	2008-06-30	620	F	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.742	\N	Iraizotz	\N	\N	Numeraria	\N	ordinario	\N	\N	\N	\N
621	\N	Andres	Azanza Ezcaray	\N	\N	\N	15736026R	1943-11-30	2008-06-30	621	H	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.742	\N	Iraizotz	\N	\N	Numeraria	\N	ordinario	\N	\N	\N	\N
622	\N	M Magdalena	Aguinaga 	\N	\N	\N	15748295B	1946-04-23	2008-07-21	622	F	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.743	\N	Erripa	\N	\N	Numeraria	\N	ordinario	\N	\N	\N	\N
623	\N	Gregorio	Elizondo 	\N	\N	\N	15747531Y	1941-04-03	2008-07-21	623	H	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.744	\N	Erripa	\N	\N	Numeraria	\N	ordinario	\N	\N	\N	\N
624	\N	Angel	Oyarzun Goñi	\N	\N	\N	15650634P	1928-09-11	2008-11-01	624	H	Baja	\N	\N	\N	\N	2026-04-23 16:53:00.744	\N	Egillor	\N	2023-01-01	Honorifica	\N	ordinario	\N	\N	\N	\N
626	\N	M Josefina	Oyaregui Senosiain	\N	\N	\N	15800610R	1953-07-23	2008-11-01	626	F	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.745	\N	Latasa	\N	\N	Numeraria	\N	ordinario	\N	\N	\N	\N
627	\N	Agustín	Ciganda Gerendiáin	\N	\N	\N	72617541D	1942-05-05	2008-11-01	627	H	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.746	\N	Latasa	\N	\N	Numeraria	\N	ordinario	\N	\N	\N	\N
628	\N	Roberto	Apesteguia Barberena	\N	\N	\N	72639269W	1948-01-22	2008-11-01	628	H	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.746	\N	Iraizotz	\N	2014-05-01	Numeraria	\N	ordinario	\N	\N	\N	\N
629	\N	M.Mercedes	Mezquiriz Berasain	\N	\N	\N	72617236A	1943-09-02	1991-03-01	629	F	Baja	\N	\N	\N	\N	2026-04-23 16:53:00.747	\N	Alkotz	\N	\N	Numeraria	\N	ordinario	\N	\N	\N	\N
630	\N	Engracia	Armendariz Oyarzun	\N	\N	\N	15860882J	1918-04-16	1999-03-01	630	F	Baja	\N	\N	\N	\N	2026-04-23 16:53:00.747	\N	Lizaso	\N	\N	Honorifica	\N	ordinario	\N	\N	\N	\N
631	\N	M Amparo	Arbilla Ezcurra	\N	\N	\N	72623732J	1944-03-11	2008-11-01	631	F	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.748	\N	Alkotz	\N	\N	Numeraria	\N	ordinario	\N	\N	\N	\N
634	\N	José Fermín	Latasa Urtasun	\N	\N	\N	72613617H	1944-06-05	2009-01-20	634	H	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.749	\N	Iraizotz	\N	\N	Numeraria	\N	ordinario	\N	\N	\N	\N
635	\N	M Josefa Genoveva	Echart Lizaso	\N	\N	\N	72646150Y	1949-03-16	2009-01-20	635	F	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.75	\N	Iraizotz	\N	\N	Numeraria	\N	ordinario	\N	\N	\N	\N
636	\N	Andres	Recalde Ostiz	\N	\N	\N	15861054R	1933-04-07	2009-01-20	636	H	Baja	\N	\N	\N	\N	2026-04-23 16:53:00.751	\N	Larraintzar	\N	2023-01-01	Honorifica	\N	ordinario	\N	\N	\N	\N
637	\N	Modesta	Balda Erviti	\N	\N	\N	15641022X	1936-11-04	2009-01-20	637	F	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.751	\N	Alkotz	\N	\N	Honorifica	\N	ordinario	\N	\N	\N	\N
638	\N	Rosa Rita	Balda Erviti	\N	\N	\N	15748399T	1945-12-09	2009-01-20	638	F	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.752	\N	Alkotz	\N	\N	Numeraria	\N	ordinario	\N	\N	\N	\N
640	\N	M Josefa	Aramendía Erro 	\N	\N	\N	15775675K	1949-03-04	2009-01-20	640	F	Baja	\N	\N	\N	\N	2026-04-23 16:53:00.753	\N	Iraizotz	\N	\N	Numeraria	\N	ordinario	\N	\N	\N	\N
641	\N	Felix M	Gurbindo Garbisu	\N	\N	\N	15746220Y	1945-02-11	2009-01-20	641	H	Baja	\N	\N	\N	\N	2026-04-23 16:53:00.753	\N	Iraizotz	\N	\N	Numeraria	\N	ordinario	\N	\N	\N	\N
643	\N	Luciana	Mendiburu Zubieta	\N	\N	\N	15731887W	1944-04-21	2009-01-20	643	F	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.755	\N	Arraitz	\N	\N	Numeraria	\N	ordinario	\N	\N	\N	\N
644	\N	José M	Alberro Orayen	\N	\N	\N	72619173P	1946-01-03	2009-01-20	644	H	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.755	\N	Auza	\N	\N	Numeraria	\N	ordinario	\N	\N	\N	\N
645	\N	M Soledad	Berasain Armendariz	\N	\N	\N	72647847R	1948-01-21	2009-01-20	645	F	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.756	\N	Auza	\N	\N	Numeraria	\N	ordinario	\N	\N	\N	\N
646	\N	Joaquin G	Perez Paternain	\N	\N	\N	72615657B	1942-11-17	2009-02-01	646	H	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.756	\N	Egozkue	\N	\N	Numeraria	\N	ordinario	\N	\N	\N	\N
647	\N	M Jesús	Loperena Goñi	\N	\N	\N	15773410X	1950-01-20	2009-02-01	647	F	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.757	\N	Egozkue	\N	\N	Numeraria	\N	ordinario	\N	\N	\N	\N
648	\N	M Concepción	Estella Janaria	\N	\N	\N	15805217P	1955-12-24	2009-01-01	648	F	Baja	\N	\N	\N	\N	2026-04-23 16:53:00.757	\N	Beuntza	\N	\N	Numeraria	\N	ordinario	\N	\N	\N	\N
650	\N	Mª Angeles 	Osta Villar	\N	\N	\N	15752660	1945-06-12	2008-02-01	650	F	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.758	\N	Zenotz	\N	\N	Numeraria	\N	ordinario	\N	\N	\N	\N
651	\N	Dámaso	Azcárate Oskoz	\N	\N	\N	15527561P	1932-02-10	2009-02-01	651	H	Baja	\N	\N	\N	\N	2026-04-23 16:53:00.759	\N	Gaskue	\N	\N	Honorifica	\N	ordinario	\N	\N	\N	\N
652	\N	José M	Lacunza Lizaso	\N	\N	\N	15771236K	1950-09-09	2009-02-01	652	H	Baja	\N	\N	\N	\N	2026-04-23 16:53:00.759	\N	Gaskue	\N	\N	Numeraria	\N	ordinario	\N	\N	\N	\N
653	\N	José	Cía Larrayoz	\N	\N	\N	15730167F	1934-04-16	2009-03-23	653	H	Baja	\N	\N	\N	\N	2026-04-23 16:53:00.76	\N	Larraintzar	\N	\N	Honorifica	\N	ordinario	\N	\N	\N	\N
654	\N	M Carmen	Lajos Olaberría	\N	\N	\N	15638114T	1937-09-15	2009-03-23	654	F	Baja	\N	\N	\N	\N	2026-04-23 16:53:00.76	\N	Larraintzar	\N	\N	Honorifica	\N	ordinario	\N	\N	\N	\N
655	\N	M Jesús	Goñi Goikoetxea	\N	\N	\N	72632020K	1947-11-30	2009-03-23	655	F	Baja	\N	\N	\N	\N	2026-04-23 16:53:00.76	\N	Gartzaron	\N	\N	Numeraria	\N	ordinario	\N	\N	\N	\N
656	\N	Arturo	Asarta Navascues	\N	\N	\N	15142378Y	1946-09-06	2009-03-23	656	H	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.761	\N	Gartzaron	\N	\N	Numeraria	\N	ordinario	\N	\N	\N	\N
658	\N	Santos	Egozcue Legarrea	\N	\N	\N	15857396T	1922-11-01	1991-03-01	658	H	Baja	\N	\N	\N	\N	2026-04-23 16:53:00.762	\N	Etulain	\N	1993-01-01	Honorifica	\N	ordinario	\N	\N	\N	\N
659	\N	M Ignacia	García Legarrea	\N	\N	\N	72645358L	1943-05-30	2009-01-01	659	F	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.763	\N	Iraizotz	\N	\N	Numeraria	\N	ordinario	\N	\N	\N	\N
660	\N	José Angel	Azpiroz Garzaron	\N	\N	\N	15647550Y	1933-02-27	2009-01-01	660	H	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.763	\N	Beuntza	\N	\N	Honorifica	\N	ordinario	\N	\N	\N	\N
661	\N	Juana 	Micheo Indakoetxea	\N	\N	\N	15821336G	1939-03-13	2009-01-01	661	F	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.763	\N	Beuntza	\N	\N	Honorifica	\N	ordinario	\N	\N	\N	\N
662	\N	M Teresa	Ciganda Etxeberría	\N	\N	\N	72623727P	1944-11-23	2009-01-01	662	F	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.764	\N	Iraizotz	\N	\N	Numeraria	\N	ordinario	\N	\N	\N	\N
663	\N	Miguel	Orbegozo Ezcurra	\N	\N	\N	15657763F	\N	1991-03-01	663	H	Baja	\N	\N	\N	\N	2026-04-23 16:53:00.764	\N	Eltso	\N	\N	Honorifica	\N	ordinario	\N	\N	\N	\N
664	\N	Enucio	Ortiz Rice	\N	\N	\N	8718394Z	1943-01-18	2009-01-01	664	H	Baja	\N	\N	\N	\N	2026-04-23 16:53:00.765	\N	Berasain	\N	\N	Numeraria	\N	ordinario	\N	\N	\N	\N
666	\N	Francisco	Torres Cintas	\N	\N	\N	25893361F	1948-08-14	2009-01-01	666	H	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.766	\N	Iraizotz	\N	\N	Numeraria	\N	ordinario	\N	\N	\N	\N
667	\N	Eusebio	Ezcurra Eugui	\N	\N	\N	72620998Q	1943-03-29	2010-01-01	667	H	Baja	\N	\N	\N	\N	2026-04-23 16:53:00.766	\N	Orokieta	\N	\N	Numeraria	\N	ordinario	\N	\N	\N	\N
668	\N	Ecarnación	Martikorena Lasarte	\N	\N	\N	72647999S	1947-10-26	2010-01-01	668	F	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.766	\N	Igoa	\N	\N	Numeraria	\N	ordinario	\N	\N	\N	\N
669	\N	Carmen	Erro Azanza	\N	\N	\N	15780264X	1952-07-15	2010-01-01	669	F	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.767	\N	Auza	\N	\N	Numeraria	\N	ordinario	\N	\N	\N	\N
670	\N	Angel	Berasain Arribillaga	\N	\N	\N	72624629J	1939-10-12	2010-01-01	670	H	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.767	\N	auza	\N	\N	Honorifica	\N	ordinario	\N	\N	\N	\N
671	\N	Ignacio	Iribarren Arangoa	\N	\N	\N	15861395C	1940-03-26	2010-01-01	671	H	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.768	\N	Eltzaburu	\N	2017-07-13	Honorifica	\N	ordinario	\N	\N	\N	\N
672	\N	Javier	Narvaez Laseca	\N	\N	\N	15861410N	1939-03-26	2010-01-01	672	H	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.769	\N	Eltzaburu	\N	\N	Honorifica	\N	ordinario	\N	\N	\N	\N
674	\N	Jesús Angel	Martín Rodriguez	\N	\N	\N	15843466P	1960-03-04	2010-01-01	674	H	Baja	\N	\N	\N	\N	2026-04-23 16:53:00.77	\N	arraitz	\N	\N	Numeraria	\N	ordinario	\N	\N	\N	\N
675	\N	Jose Mª 	Marturet Armendariz	\N	\N	\N	72646718E	1949-10-22	2010-01-01	675	H	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.77	\N	Lizaso	\N	\N	Numeraria	\N	ordinario	\N	\N	\N	\N
676	\N	M Luz 	Mostajo Luyando	\N	\N	\N	17351856N	1936-05-22	2010-01-24	676	F	Baja	\N	\N	\N	\N	2026-04-23 16:53:00.771	\N	Iraizotz	\N	\N	Honorifica	\N	ordinario	\N	\N	\N	\N
677	\N	Indalecio	Fernandez de  Retana Martinez de Esti,	\N	\N	\N	15194699W	1930-11-14	2010-01-24	677	H	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.771	\N	Iraizotz	\N	2025-01-07	Honorifica	\N	ordinario	\N	\N	\N	\N
678	\N	Antonio Tomás	Gorostieta Irigoyen	\N	\N	\N	72650846X	1950-09-02	2011-02-04	678	H	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.772	\N	Iraizotz	\N	\N	Numeraria	\N	ordinario	\N	\N	\N	\N
680	\N	Benita 	Iraizoz Ancizar	\N	\N	\N	15828900R	1947-04-29	2011-02-04	680	F	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.774	\N	Olague	\N	\N	Numeraria	\N	ordinario	\N	\N	\N	\N
681	\N	Miguel Mª	Larrayoz  Guelbenzu	\N	\N	\N	72624350X	1945-06-20	2011-02-04	681	H	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.774	\N	Larraintzar	\N	\N	Numeraria	\N	ordinario	\N	\N	\N	\N
682	\N	José	Cenoz Cía	\N	\N	\N	14521927A	1943-08-01	2011-02-04	682	H	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.775	\N	Alkotz	\N	\N	Numeraria	\N	ordinario	\N	\N	\N	\N
683	\N	Juan Ignacio	Retegui Petricorena	\N	\N	\N	15746040X	1943-06-24	2010-01-01	683	H	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.775	\N	Igoa	\N	\N	Numeraria	\N	ordinario	\N	\N	\N	\N
684	\N	Esteban	Satrustegui Oscoz	\N	\N	\N	72610753Y	1944-12-18	2010-01-01	684	H	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.776	\N	Gartzaron	\N	\N	Numeraria	\N	ordinario	\N	\N	\N	\N
685	\N	M Soledad	Balda Erbiti	\N	\N	\N	72623709J	1944-04-25	2017-02-28	685	F	Baja	\N	\N	\N	\N	2026-04-23 16:53:00.776	\N	Arraitz	\N	\N	Numeraria	\N	ordinario	\N	\N	\N	\N
686	\N	Fidel	Berasain Villanueva	\N	\N	\N	15861617N	1938-12-09	2018-08-15	686	H	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.777	\N	Arraitz	\N	\N	Honorifica	\N	ordinario	\N	\N	\N	\N
688	\N	Luis 	Larrainzar Erviti	\N	\N	\N	\N	1937-10-01	2012-01-01	688	H	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.777	\N	Arraitz	\N	\N	Honorifica	\N	ordinario	\N	\N	\N	\N
689	\N	M Micaela	Ciganda Echeverría	\N	\N	\N	72623731N	1943-02-21	2012-07-20	689	F	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.778	\N	Iraizotz	\N	\N	Numeraria	\N	ordinario	\N	\N	\N	\N
690	\N	Nicasio	Dorai Bengoechea	\N	\N	\N	15789600P	1952-07-25	2012-01-19	690	H	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.778	\N	Iraizotz	\N	\N	Numeraria	\N	ordinario	\N	\N	\N	\N
691	\N	Mercedes	Insausti Nuin	\N	\N	\N	15784801Q	1950-12-13	2012-01-19	691	F	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.779	\N	Iraizotz	\N	\N	Numeraria	\N	ordinario	\N	\N	\N	\N
693	\N	Felisa	Mariñelarena Oyarzun	\N	\N	\N	\N	1934-05-01	1991-01-01	693	F	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.78	\N	Ihaben	\N	\N	Honorifica	\N	ordinario	\N	\N	\N	\N
694	\N	Asunción	Iguelz Azpiroz	\N	\N	\N	\N	1945-09-02	2012-01-20	694	F	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.78	\N	Auza	\N	\N	Numeraria	\N	ordinario	\N	\N	\N	\N
695	\N	M. Cecilia	Perez 	\N	\N	\N	\N	1927-02-01	2012-01-01	695	F	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.781	\N	Iraizotz	\N	\N	Honorifica	\N	ordinario	\N	\N	\N	\N
696	\N	M Josefa	Ezcurra Aramburu	\N	\N	\N	\N	\N	2012-01-01	696	F	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.781	\N	Arraitz	\N	\N	Numeraria	\N	ordinario	\N	\N	\N	\N
697	\N	M Encarnación	Olague Iraizoz	\N	\N	\N	72623697R	1946-06-11	2012-03-16	697	F	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.781	\N	Alkotz	\N	\N	Numeraria	\N	ordinario	\N	\N	\N	\N
699	\N	Martina	Juvera Irurita	\N	\N	\N	15857203Z	1934-12-17	2012-04-10	699	F	Baja	\N	\N	\N	\N	2026-04-23 16:53:00.782	\N	Olague	\N	\N	Honorifica	\N	ordinario	\N	\N	\N	\N
700	\N	Jesús M. 	García Olias	\N	\N	\N	72638539P	1947-05-05	1912-04-13	700	H	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.783	\N	Ihaben	\N	2020-12-23	Numeraria	\N	ordinario	\N	\N	\N	\N
701	\N	José Domingo	Cilveti Gelbenzu	\N	\N	\N	72613711C	1944-07-30	2007-11-26	701	H	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.783	\N	Ziaurritz	\N	\N	Numeraria	\N	ordinario	\N	\N	\N	\N
702	\N	Rosario	Oyarzun Olasagarre	\N	\N	\N	72659776Q	1955-06-23	2007-11-26	702	F	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.784	\N	Ziaurritz	\N	\N	Numeraria	\N	ordinario	\N	\N	\N	\N
703	\N	M Pilar	Azpiroz Arrechea	\N	\N	\N	15775004V	1948-10-14	2007-11-26	703	F	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.784	\N	Ziaurritz	\N	\N	Numeraria	\N	ordinario	\N	\N	\N	\N
704	\N	Pedro	Gerendiáin Cilveti	\N	\N	\N	72613712K	1945-02-28	2017-11-26	704	H	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.784	\N	Ziaurritz	\N	\N	Numeraria	\N	ordinario	\N	\N	\N	\N
705	\N	Mª Pilar	Ariztegui Narvaez	\N	\N	\N	72613488G	1945-04-05	2012-01-01	705	F	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.785	\N	Jauntsarats	\N	\N	Numeraria	\N	ordinario	\N	\N	\N	\N
707	\N	Maravillas	San Martín Villanueva	\N	\N	\N	15745312H	1944-03-28	2012-09-03	707	F	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.786	\N	Eltzaburu	\N	\N	Numeraria	\N	ordinario	\N	\N	\N	\N
708	\N	José M	Gelbenzu Goyenaga	\N	\N	\N	15745708T	1942-05-12	2013-01-02	708	H	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.786	\N	Auza	\N	\N	Numeraria	\N	ordinario	\N	\N	\N	\N
709	\N	José Justino	Altuna Espinal	\N	\N	\N	15724378Z	1942-05-14	2013-10-02	709	H	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.787	\N	Eltzaburu	\N	\N	Numeraria	\N	ordinario	\N	\N	\N	\N
710	\N	Pedro M	Gorostieta Irigoyen	\N	\N	\N	72624763D	1943-06-30	2013-01-18	710	H	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.787	\N	Iraizotz	\N	\N	Numeraria	\N	ordinario	\N	\N	\N	\N
711	\N	Antonio	Recalde Ostiz	\N	\N	\N	72624351B	1945-06-18	2013-01-18	711	H	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.788	\N	Iraizotz	\N	\N	Numeraria	\N	ordinario	\N	\N	\N	\N
712	\N	M Dolores	Apesteguia Egozcue	\N	\N	\N	72645525W	1949-01-12	2013-01-18	712	F	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.788	\N	Iraizotz	\N	\N	Numeraria	\N	ordinario	\N	\N	\N	\N
713	\N	Mercedes	Arregui Lasarte	\N	\N	\N	72610796A	1943-09-22	2013-01-22	713	F	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.788	\N	Lantz	\N	\N	Numeraria	\N	ordinario	\N	\N	\N	\N
715	\N	Luisa	Artozqui Marillar	\N	\N	\N	\N	1930-03-15	1991-03-01	715	F	Baja	\N	\N	\N	\N	2026-04-23 16:53:00.789	\N	Olague	\N	\N	Honorifica	\N	ordinario	\N	\N	\N	\N
716	\N	M Victoria	Ciganda Echeverría	\N	\N	\N	15774243S	1948-09-05	2013-01-28	716	F	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.79	\N	Iraizotz	\N	\N	Numeraria	\N	ordinario	\N	\N	\N	\N
717	\N	Jesus	Huarte Osacar	\N	\N	\N	15757910	1946-12-19	2013-01-28	717	H	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.79	\N	Iraizoz	\N	\N	Numeraria	\N	ordinario	\N	\N	\N	\N
718	\N	José M	García Legarrea	\N	\N	\N	72649293K	1947-10-07	2013-01-28	718	H	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.791	\N	Iraizotz	\N	\N	Numeraria	\N	ordinario	\N	\N	\N	\N
719	\N	Juan José	Ezcurra Barberena	\N	\N	\N	15737824M	1943-02-01	2013-02-06	719	H	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.791	\N	Arrarats	\N	\N	Numeraria	\N	ordinario	\N	\N	\N	\N
720	\N	M Jesús	Mariezcurrena Nuin	\N	\N	\N	15760685G	1947-09-19	2013-02-06	720	F	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.792	\N	Arrarats	\N	\N	Numeraria	\N	ordinario	\N	\N	\N	\N
722	\N	M. Cruz	Baraibar Carrera	\N	\N	\N	72620605Z	1946-09-14	2013-02-06	722	F	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.793	\N	Egillor	\N	\N	Numeraria	\N	ordinario	\N	\N	\N	\N
723	\N	M Joaquina	Echarri Goikoetxea	\N	\N	\N	72622598Y	1946-05-04	2013-02-06	723	F	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.793	\N	Erripa	\N	\N	Numeraria	\N	ordinario	\N	\N	\N	\N
724	\N	M Josefa	Bengoetxea Doray	\N	\N	\N	15780595L	1952-02-22	2013-02-06	724	F	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.794	\N	Erripa	\N	\N	Numeraria	\N	ordinario	\N	\N	\N	\N
725	\N	M Trinidad	Recalde Ostiz	\N	\N	\N	15772874A	1950-12-28	2013-02-06	725	F	Baja	\N	\N	\N	\N	2026-04-23 16:53:00.794	\N	Larraintzar	\N	\N	Numeraria	\N	ordinario	\N	\N	\N	\N
726	\N	José M	Musitu Ochoa	\N	\N	\N	15831293W	1958-04-17	2013-02-06	726	H	Baja	\N	\N	\N	\N	2026-04-23 16:53:00.794	\N	Olague	\N	2023-01-01	Numeraria	\N	ordinario	\N	\N	\N	\N
727	\N	Miguel Martín	Tellechea Mutuberría	\N	\N	\N	15773341X	1951-08-20	2013-02-06	727	H	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.795	\N	Orokieta	\N	\N	Numeraria	\N	ordinario	\N	\N	\N	\N
728	\N	M Lourdes	Arregui Machain	\N	\N	\N	15839386E	1958-02-17	2013-02-06	728	F	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.795	\N	Orokieta	\N	\N	Numeraria	\N	ordinario	\N	\N	\N	\N
730	\N	M Resurrección	Mutilva Eguaras	\N	\N	\N	15779143Q	1948-01-06	2013-02-06	730	F	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.796	\N	Ostitz	\N	\N	Numeraria	\N	ordinario	\N	\N	\N	\N
731	\N	Alfonso M	Ibañez Zapata	\N	\N	\N	15756972V	1943-03-12	2013-02-20	731	H	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.797	\N	Eltso	\N	\N	Numeraria	\N	ordinario	\N	\N	\N	\N
732	\N	M Eugenia	Oskoz Oroz	\N	\N	\N	72624094F	1947-05-27	2013-02-20	732	F	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.797	\N	Eltso	\N	\N	Numeraria	\N	ordinario	\N	\N	\N	\N
733	\N	Manuel	Ciganda Egozcue	\N	\N	\N	15782786W	1951-12-31	2013-10-14	733	H	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.797	\N	Arraitz	\N	\N	Numeraria	\N	ordinario	\N	\N	\N	\N
734	\N	Juan José	Gorostieta Irigoyen	\N	\N	\N	15763904A	1948-02-09	2014-01-09	734	H	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.798	\N	Iraizotz	\N	\N	Numeraria	\N	ordinario	\N	\N	\N	\N
735	\N	Santiago	Pacha Oteiza	\N	\N	\N	\N	1950-04-11	2014-01-16	735	H	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.799	\N	Iraizotz	\N	\N	Numeraria	\N	ordinario	\N	\N	\N	\N
736	\N	M Belen	Noain Irañeta	\N	\N	\N	15780181L	1950-01-12	2014-01-22	736	F	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.799	\N	Orokieta	\N	\N	Numeraria	\N	ordinario	\N	\N	\N	\N
738	\N	Ignacio	Miguelañez Arribas	\N	\N	\N	70229719R	1948-10-29	2014-01-31	738	H	Baja	\N	\N	\N	\N	2026-04-23 16:53:00.8	\N	Eltzaburu	\N	\N	Numeraria	\N	ordinario	\N	\N	\N	\N
739	\N	Francisca	Arregui Lasarte	\N	\N	\N	15657957V	1934-11-04	2014-02-01	739	F	Baja	\N	\N	\N	\N	2026-04-23 16:53:00.801	\N	Igoa	\N	\N	Honorifica	\N	ordinario	\N	\N	\N	\N
740	\N	Julia	Sarasola Esquizabal	\N	\N	\N	15657522L	1935-01-28	2014-01-01	740	F	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.801	\N	Beramendi	\N	\N	Honorifica	\N	ordinario	\N	\N	\N	\N
741	\N	Cecilia	Elizalde Oroz	\N	\N	\N	15795094M	1953-01-16	2014-02-12	741	F	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.802	\N	Iraizotz	\N	\N	Numeraria	\N	ordinario	\N	\N	\N	\N
742	\N	M Begoña	Rípodas Ibarrola	\N	\N	\N	15747212D	1945-07-08	2014-04-12	742	F	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.802	\N	Lantz	\N	\N	Numeraria	\N	ordinario	\N	\N	\N	\N
743	\N	M Carmela	Osta Villar	\N	\N	\N	15793694P	1954-11-22	2014-06-01	743	F	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.803	\N	Gerendiain	\N	\N	Numeraria	\N	ordinario	\N	\N	\N	\N
744	\N	M Teresa	Imaz Alcaide	\N	\N	\N	15760562L	1946-11-17	2014-06-18	744	F	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.803	\N	Lantz	\N	\N	Numeraria	\N	ordinario	\N	\N	\N	\N
746	\N	M Emilia	Iraizoz Ancizar	\N	\N	\N	15771697E	1949-11-02	2014-06-30	746	F	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.805	\N	Olague	\N	\N	Numeraria	\N	ordinario	\N	\N	\N	\N
747	\N	José Javier	Torrea Zubiri	\N	\N	\N	15763610P	1949-03-15	2014-06-30	747	H	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.805	\N	Olague	\N	\N	Numeraria	\N	ordinario	\N	\N	\N	\N
748	\N	José joaquin	Zubiri Zabalza	\N	\N	\N	\N	1933-09-22	2014-06-30	748	H	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.806	\N	Olague	\N	\N	Honorifica	\N	ordinario	\N	\N	\N	\N
749	\N	M Milagros	García Olias	\N	\N	\N	15746841Y	1944-01-25	2014-06-30	749	F	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.806	\N	Olague	\N	\N	Numeraria	\N	ordinario	\N	\N	\N	\N
750	\N	Julián	Esnaola Saldise	\N	\N	\N	15724258D	1943-11-23	2014-01-01	750	H	Baja	\N	\N	\N	\N	2026-04-23 16:53:00.807	\N	Beuntza	\N	\N	Numeraria	\N	ordinario	\N	\N	\N	\N
751	\N	Francisco J	Oyarzun Guelbenzu	\N	\N	\N	15857468A	1939-02-06	2014-01-01	751	H	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.807	\N	Gerendiain	\N	\N	Honorifica	\N	ordinario	\N	\N	\N	\N
753	\N	Angel M	Ilarregui Arce	\N	\N	\N	15767441K	1949-04-17	2014-09-10	753	H	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.808	\N	Gelbentzu	\N	\N	Numeraria	\N	ordinario	\N	\N	\N	\N
754	\N	Fernanda	Fernandez  Freije	\N	\N	\N	15812951Z	1957-05-29	2014-11-01	754	F	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.809	\N	Beruete	\N	\N	Numeraria	\N	ordinario	\N	\N	\N	\N
820	\N	Miguel Angel	Ezcurra Aramburu	\N	\N	\N	72609648M	1946-10-04	2018-02-01	820	H	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.845	\N	Urritzola	\N	\N	Numeraria	\N	ordinario	\N	\N	\N	\N
755	\N	José	Echarri Barberena	\N	\N	\N	15773603L	1948-07-27	2014-11-01	755	H	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.809	\N	Beruete	\N	\N	Numeraria	\N	ordinario	\N	\N	\N	\N
756	\N	M. Luisa	Arano Lampreabe	\N	\N	\N	15836400A	1958-05-18	2014-11-01	756	F	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.81	\N	Beruete	\N	\N	Numeraria	\N	ordinario	\N	\N	\N	\N
757	\N	José M.	Indakoetxea Arangoa	\N	\N	\N	15773675E	1948-09-11	2014-11-01	757	H	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.81	\N	Beruete	\N	2023-02-11	Numeraria	\N	ordinario	\N	\N	\N	\N
758	\N	José Ramón	Barberena Muguiro	\N	\N	\N	72650277Q	1949-10-03	2015-01-01	758	H	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.811	\N	Iraizotz	\N	\N	Numeraria	\N	ordinario	\N	\N	\N	\N
760	\N	M Mercedes	Erro Eslava	\N	\N	\N	15771512K	1945-07-05	2015-01-30	760	F	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.813	\N	Arrarats	\N	\N	Numeraria	\N	ordinario	\N	\N	\N	\N
761	\N	Joaquin 	Ezcurra Barberena	\N	\N	\N	15856519C	1938-03-23	2015-01-30	761	H	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.813	\N	Arrarats	\N	\N	Honorifica	\N	ordinario	\N	\N	\N	\N
762	\N	M Dominica	Leonet Oronoz	\N	\N	\N	15114861C	1941-04-16	2015-01-30	762	F	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.814	\N	Arrarats	\N	\N	Numeraria	\N	ordinario	\N	\N	\N	\N
764	\N	Pedro	Ezcurra Barberena	\N	\N	\N	15657968M	1937-01-24	2015-01-30	764	H	Baja	\N	\N	\N	\N	2026-04-23 16:53:00.815	\N	Arrarats	\N	\N	Honorifica	\N	ordinario	\N	\N	\N	\N
765	\N	M Concepción	Zubieta Iraizoz	\N	\N	\N	15773650C	1951-11-08	2015-02-01	765	F	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.816	\N	Auza	\N	\N	Numeraria	\N	ordinario	\N	\N	\N	\N
766	\N	M Pilar	Ilarregui Arce	\N	\N	\N	15861092Q	1940-04-28	2015-02-01	766	F	Baja	\N	\N	\N	\N	2026-04-23 16:53:00.817	\N	Ilarregi	\N	\N	Honorifica	\N	ordinario	\N	\N	\N	\N
767	\N	Santiago	Ciganda Tornaría	\N	\N	\N	15771802N	1950-10-30	2015-02-01	767	H	Baja	\N	\N	\N	\N	2026-04-23 16:53:00.818	\N	Eltzaburu	\N	\N	Numeraria	\N	ordinario	\N	\N	\N	\N
768	\N	Pedro	Navarro Bastarrica	\N	\N	\N	72610725R	1944-10-19	2015-04-04	768	H	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.819	\N	Beruete	\N	\N	Numeraria	\N	ordinario	\N	\N	\N	\N
770	\N	Angel	Beunza Urriza	\N	\N	\N	15861737V	1937-03-14	2015-04-01	770	H	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.82	\N	Alkotz	\N	\N	Honorifica	\N	ordinario	\N	\N	\N	\N
771	\N	Jesús M	Ilundáin Iturmendi	\N	\N	\N	18201142T	1958-12-16	2015-05-20	771	H	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.821	\N	Iraizotz	\N	\N	Numeraria	\N	ordinario	\N	\N	\N	\N
772	\N	M Ignacia	Narvaez Esain	\N	\N	\N	18194759B	1962-12-06	2015-05-20	772	F	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.821	\N	Iraizotz	\N	\N	Numeraria	\N	ordinario	\N	\N	\N	\N
773	\N	Marina	Bindela Balero	\N	\N	\N	73505488H	1958-01-12	2015-09-10	773	F	Baja	\N	\N	\N	\N	2026-04-23 16:53:00.822	\N	Olague	\N	\N	Numeraria	\N	ordinario	\N	\N	\N	\N
774	\N	M Rosario	Arregui Lasarte	\N	\N	\N	15638113E	1938-01-03	2015-09-24	774	F	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.823	\N	Igoa	\N	\N	Honorifica	\N	ordinario	\N	\N	\N	\N
775	\N	M Purificación	Echeberria Iztueta	\N	\N	\N	78046323D	\N	2016-01-20	775	F	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.823	\N	Auza	\N	\N	Numeraria	\N	ordinario	\N	\N	\N	\N
776	\N	José M	Berasain Lasarte	\N	\N	\N	72624631S	1945-11-18	2016-01-20	776	H	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.824	\N	auza	\N	\N	Numeraria	\N	ordinario	\N	\N	\N	\N
777	\N	José Ignacio	Irure Etuláin	\N	\N	\N	72613786A	\N	2016-01-25	777	H	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.824	\N	Gelbentzu	\N	\N	Honorifica	\N	ordinario	\N	\N	\N	\N
779	\N	Juan José	Jaunarena Ezcurra	\N	\N	\N	15787169S	1951-09-11	2016-02-22	779	H	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.825	\N	Gartzaron	\N	\N	Numeraria	\N	ordinario	\N	\N	\N	\N
780	\N	Lucía	Eugui Galduroz	\N	\N	\N	15857434S	1926-12-13	1991-03-01	780	F	Baja	\N	\N	\N	\N	2026-04-23 16:53:00.826	\N	Egozkue	\N	\N	Honorifica	\N	ordinario	\N	\N	\N	\N
781	\N	Anselmo	Irurita Cenoz	\N	\N	\N	15658253Z	1921-12-14	1991-03-01	781	H	Baja	\N	\N	\N	\N	2026-04-23 16:53:00.826	\N	Egozkue	\N	\N	Honorifica	\N	ordinario	\N	\N	\N	\N
782	\N	Escolástica	Gurbindo Gurbindo	\N	\N	\N	15861248B	1917-12-16	1991-03-01	782	F	Baja	\N	\N	\N	\N	2026-04-23 16:53:00.827	\N	Ilarregi	\N	1993-01-01	Honorifica	\N	ordinario	\N	\N	\N	\N
783	\N	Concepción	Diez de Ulzurrun Elso	\N	\N	\N	72623712Q	1908-04-25	1991-03-01	783	F	Baja	\N	\N	\N	\N	2026-04-23 16:53:00.827	\N	Urritzola	\N	\N	Honorifica	\N	ordinario	\N	\N	\N	\N
784	\N	Fermin	Barandiain Goikoetxea	\N	\N	\N	15854239V	1935-07-01	1991-03-01	784	H	Baja	\N	\N	\N	\N	2026-04-23 16:53:00.827	\N	Zenotz	\N	\N	Honorifica	\N	ordinario	\N	\N	\N	\N
785	\N	Veremunda	Arregui Aldaya	\N	\N	\N	15657926D	1934-03-11	1991-03-01	785	F	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.828	\N	Igoa	\N	\N	Honorifica	\N	ordinario	\N	\N	\N	\N
786	\N	Teófila	Azpiroz Garro	\N	\N	\N	\N	1931-03-05	1991-03-01	786	F	Baja	\N	\N	\N	\N	2026-04-23 16:53:00.828	\N	Beruete	\N	\N	Honorifica	\N	ordinario	\N	\N	\N	\N
788	\N	Ramón	Barberena Goñi	\N	\N	\N	15861111N	1920-04-23	1991-03-01	788	H	Baja	\N	\N	\N	\N	2026-04-23 16:53:00.829	\N	Iraizotz	\N	\N	Honorifica	\N	ordinario	\N	\N	\N	\N
789	\N	M. Josefa	Erice Etxaleku	\N	\N	\N	15634192B	1923-10-14	1991-03-01	789	F	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.83	\N	Erripa	\N	\N	Honorifica	\N	ordinario	\N	\N	\N	\N
790	\N	Claudio	Cabrero Echandi	\N	\N	\N	15861112J	1913-11-06	1991-03-01	790	H	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.83	\N	Iraizotz	\N	1995-08-01	Honorifica	\N	ordinario	\N	\N	\N	\N
791	\N	Vicente	Marturet Sagues	\N	\N	\N	15860874M	1911-04-05	1991-03-01	791	H	Baja	\N	\N	\N	\N	2026-04-23 16:53:00.831	\N	Eltzaburu	\N	\N	Honorifica	\N	ordinario	\N	\N	\N	\N
792	\N	Engracia	Armendariz Oyarzun	\N	\N	\N	15860882J	1918-04-16	1991-03-01	792	F	Baja	\N	\N	\N	\N	2026-04-23 16:53:00.831	\N	Lizaso	\N	\N	Honorifica	\N	ordinario	\N	\N	\N	\N
793	\N	M.josefa	Iraizoz Zabaleta	\N	\N	\N	15860917W	1927-12-31	1991-03-01	793	F	Baja	\N	\N	\N	\N	2026-04-23 16:53:00.832	\N	Lizaso	\N	\N	Honorifica	\N	ordinario	\N	\N	\N	\N
795	\N	Marina	Barbería Aguirre	\N	\N	\N	15861521P	1916-03-21	1991-03-01	795	F	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.833	\N	Auza	\N	1992-08-06	Honorifica	\N	ordinario	\N	\N	\N	\N
796	\N	Pedro	Mezquiriz Berasain	\N	\N	\N	15861774P	1924-06-29	1991-03-01	796	H	Baja	\N	\N	\N	\N	2026-04-23 16:53:00.833	\N	Alkotz	\N	\N	Honorifica	\N	ordinario	\N	\N	\N	\N
797	\N	José Miguel	Mariñelarena Oyarzun	\N	\N	\N	15657624Y	1924-03-17	1991-03-01	797	H	Baja	\N	\N	\N	\N	2026-04-23 16:53:00.834	\N	Ihaben	\N	\N	Honorifica	\N	ordinario	\N	\N	\N	\N
798	\N	M. Eugenia	Zubillaga Pellejero	\N	\N	\N	15657572T	1929-06-02	1991-03-01	798	F	Baja	\N	\N	\N	\N	2026-04-23 16:53:00.834	\N	Ihaben	\N	\N	Honorifica	\N	ordinario	\N	\N	\N	\N
799	\N	Rosa	Oronoz Ibarra	\N	\N	\N	15861294B	1926-09-13	1991-03-01	799	F	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.835	\N	Gerendiain	\N	\N	Honorifica	\N	ordinario	\N	\N	\N	\N
800	\N	Jesús M	Ostiz Javerri	\N	\N	\N	15799661H	1953-05-15	2016-03-01	800	H	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.835	\N	Olague	\N	\N	Numeraria	\N	ordinario	\N	\N	\N	\N
802	\N	M Resurrección	Estrada Ochoa	\N	\N	\N	15795356Z	1955-04-10	2016-08-01	802	F	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.836	\N	Auza	\N	\N	Numeraria	\N	ordinario	\N	\N	\N	\N
803	\N	José Vicente	Gascue Goñi	\N	\N	\N	15772367W	1950-10-28	2016-08-01	803	H	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.837	\N	Auza	\N	\N	Numeraria	\N	ordinario	\N	\N	\N	\N
805	\N	M Asunción	Villanueva Urtasun	\N	\N	\N	72656082W	1952-09-01	2016-09-20	805	F	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.837	\N	Iraizotz	\N	\N	Numeraria	\N	ordinario	\N	\N	\N	\N
806	\N	Marcelo	Azpiroz Recondo	\N	\N	\N	15657549T	1925-09-28	1991-03-01	806	H	Baja	\N	\N	\N	\N	2026-04-23 16:53:00.838	\N	Jauntsarats 	\N	\N	Honorifica	\N	ordinario	\N	\N	\N	\N
807	\N	Francisco	Legarra Iriarte	\N	\N	\N	72622322Y	1945-05-27	2017-02-28	807	H	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.838	\N	Gartzaron	\N	\N	Numeraria	\N	ordinario	\N	\N	\N	\N
808	\N	M. Luisa	Astiz Olague	\N	\N	\N	18196807N	1961-08-06	2017-02-28	808	F	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.839	\N	Beruete	\N	\N	Numeraria	\N	ordinario	\N	\N	\N	\N
811	\N	M. Victoria	Arano Hualde	\N	\N	\N	15774454L	1950-01-07	2017-02-10	811	F	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.84	\N	Aizarotz	\N	\N	Numeraria	\N	ordinario	\N	\N	\N	\N
812	\N	Miguel Vicente	Oiz Gurbindo	\N	\N	\N	15797961C	1955-08-21	2017-03-01	812	H	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.841	\N	Eltzaburu	\N	\N	Numeraria	\N	ordinario	\N	\N	\N	\N
813	\N	M Angeles	Zunzarren Baigorri	\N	\N	\N	18200609L	1963-03-01	2017-03-01	813	F	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.841	\N	Eltzaburu	\N	\N	Numeraria	\N	ordinario	\N	\N	\N	\N
814	\N	Mabel Noemí	Schia Hino	\N	\N	\N	5471778T	1952-04-22	2017-08-29	814	F	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.842	\N	Olague	\N	\N	Numeraria	\N	ordinario	\N	\N	\N	\N
815	\N	M Gabina	Urdiroz Perez	\N	\N	\N	15812712M	1957-03-09	2017-08-29	815	F	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.842	\N	Iraizotz	\N	\N	Numeraria	\N	ordinario	\N	\N	\N	\N
816	\N	Rosa Esther	Medrano Lainez	\N	\N	\N	73488421V	1940-08-13	2017-10-10	816	F	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.843	\N	Olague	\N	\N	Honorifica	\N	ordinario	\N	\N	\N	\N
818	\N	Martín	Osinaga Sala	\N	\N	\N	15773260K	1948-10-30	2018-03-02	818	H	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.844	\N	Ihaben	\N	\N	Numeraria	\N	ordinario	\N	\N	\N	\N
819	\N	Leoncio	Huarte Alsua				15780727J	1951-01-07	2018-02-03	819	H	activo	\N	\N	\N	\N	2026-04-23 16:53:00.844	\N	Igoa	Nafarroa	\N	directiva	\N	ordinario	\N	\N	\N	\N
821	\N	M Juana	Osacar Diez de Ulzurrun	\N	\N	\N	72623711S	1945-04-24	2018-02-01	821	F	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.845	\N	Urritzola	\N	\N	Numeraria	\N	ordinario	\N	\N	\N	\N
822	\N	Antonio  	Ziganda Lacunza	\N	\N	\N	15777606C	1952-03-27	2018-06-20	822	H	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.846	\N	Larraintzar	\N	\N	Numeraria	\N	ordinario	\N	\N	\N	\N
804	\N	Santiago	Iraizoz Etuláin				15794901L	1954-02-11	2016-08-20	804	H	activo	\N	\N	\N	\N	2026-04-23 17:03:38.314	\N	Etsain	Nafarroa	\N	directiva	\N	ordinario	\N	\N	\N	\N
824	\N	Magdalena	Sanpedro Linazasoro	\N	\N	\N	15788324C	1960-07-21	2019-02-02	824	F	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.846	\N	Iraizotz	\N	\N	Numeraria	\N	ordinario	\N	\N	\N	\N
825	\N	Marcelino	Echeberria Aizcorbe	\N	\N	\N	15788324C	1952-08-04	2019-02-02	825	H	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.847	\N	Iraizotz	\N	\N	Numeraria	\N	ordinario	\N	\N	\N	\N
826	\N	Miguel José	Erice Saldías	\N	\N	\N	15778529T	1951-03-26	2019-02-02	826	H	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.847	\N	Zenotz	\N	\N	Numeraria	\N	ordinario	\N	\N	\N	\N
827	\N	Bernardino	Balda Erviti	\N	\N	\N	15861719E	1940-10-22	2019-02-02	827	H	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.848	\N	alkotz	\N	\N	Honorifica	\N	ordinario	\N	\N	\N	\N
829	\N	Juan Pedro	Garro Echarri	\N	\N	\N	72610723E	1945-11-06	2019-01-31	829	H	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.849	\N	Beruete	\N	\N	Numeraria	\N	ordinario	\N	\N	\N	\N
830	\N	M Soledad Felipe	Ollo Lizaso	\N	\N	\N	15812522E	1956-12-16	2019-01-31	830	F	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.849	\N	Erripa	\N	\N	Numeraria	\N	ordinario	\N	\N	\N	\N
832	\N	Esteban	Jaunarena Ezcurra	\N	\N	\N	72650229Z	1947-02-23	2019-05-31	832	H	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.85	\N	Gartzaron	\N	\N	Numeraria	\N	ordinario	\N	\N	\N	\N
833	\N	Juan José	Beunza Astiz	\N	\N	\N	15811427P	1957-10-11	2019-04-03	833	H	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.85	\N	Gartzaron	\N	\N	Numeraria	\N	ordinario	\N	\N	\N	\N
834	\N	Martín Antonio	Ansorena Sala	\N	\N	\N	15812487X	1956-12-17	2019-04-03	834	H	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.851	\N	Itsaso	\N	\N	Numeraria	\N	ordinario	\N	\N	\N	\N
836	\N	M Teresa	Olague Ollobarren	\N	\N	\N	15852342Y	1960-10-15	2019-04-15	836	F	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.852	\N	Lantz	\N	\N	Numeraria	\N	ordinario	\N	\N	\N	\N
837	\N	Francisco Javier	Arano Lasarte	\N	\N	\N	15813588F	1956-01-29	2019-01-01	837	H	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.852	\N	Igoa	\N	\N	Numeraria	\N	ordinario	\N	\N	\N	\N
838	\N	M Luz 	Nagore Leoz	\N	\N	\N	15808390F	1957-04-01	2019-01-01	838	F	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.853	\N	Igoa	\N	\N	Numeraria	\N	ordinario	\N	\N	\N	\N
839	\N	Jesús M	Esain Aldaz	\N	\N	\N	15846788H	1961-12-23	2019-04-15	839	H	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.853	\N	Lantz	\N	\N	Numeraria	\N	ordinario	\N	\N	\N	\N
840	\N	Martín	Sala Iribarren	\N	\N	\N	16208999W	1942-03-13	2019-01-01	840	H	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.854	\N	Udabe	\N	\N	Numeraria	\N	ordinario	\N	\N	\N	\N
841	\N	M. Cruz	Ayensa Azcona	\N	\N	\N	15782931D	1953-05-03	2019-08-20	841	F	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.854	\N	Beruete	\N	\N	Numeraria	\N	ordinario	\N	\N	\N	\N
842	\N	M Rosario	Beunza Larumbe	\N	\N	\N	15836673T	1957-11-05	2019-01-01	842	F	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.855	\N	Igoa	\N	\N	Numeraria	\N	ordinario	\N	\N	\N	\N
843	\N	Antonio	Mariezcurrena Arregui	\N	\N	\N	15787459Y	1952-09-02	2019-01-01	843	H	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.855	\N	Igoa	\N	\N	Numeraria	\N	ordinario	\N	\N	\N	\N
845	\N	Balbino  E	Goñi Ibero	\N	\N	\N	15808185D	1957-04-10	2019-10-01	845	H	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.856	\N	Gelbentzu	\N	2019-11-22	Numeraria	\N	ordinario	\N	\N	\N	\N
846	\N	Angel	Marticorena Lasarte	\N	\N	\N	15328393C	1943-03-01	2019-10-01	846	H	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.856	\N	Igoa	\N	\N	Numeraria	\N	ordinario	\N	\N	\N	\N
847	\N	Martín	Zalba Ortabe	\N	\N	\N	15765065Z	1949-06-29	2020-01-10	847	H	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.857	\N	Erripa	\N	\N	Numeraria	\N	ordinario	\N	\N	\N	\N
848	\N	Mari Paz	Iragui Ciganda	\N	\N	\N	15788821B	1952-03-20	2020-01-10	848	F	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.857	\N	Erripa	\N	\N	Numeraria	\N	ordinario	\N	\N	\N	\N
849	\N	Milagros	Marina Marina	\N	\N	\N	15791506M	1950-11-27	2020-01-10	849	F	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.858	\N	Orokieta	\N	\N	Numeraria	\N	ordinario	\N	\N	\N	\N
850	\N	Jesús M. 	Oyarzun Olasagarre	\N	\N	\N	72650838W	1948-02-03	2020-01-10	850	H	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.858	\N	Egillor	\N	\N	Numeraria	\N	ordinario	\N	\N	\N	\N
852	\N	M Sagrario	Goñi Ibero	\N	\N	\N	15775330K	1950-08-07	2020-02-10	852	F	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.859	\N	Alkotz	\N	\N	Numeraria	\N	ordinario	\N	\N	\N	\N
853	\N	M. Pilar	Ochotorena Arangoa	\N	\N	\N	15798528N	1951-08-26	2019-01-31	853	F	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.86	\N	Beruete	\N	\N	Numeraria	\N	ordinario	\N	\N	\N	\N
854	\N	M. Pilar	Indakoetxea Arangoa	\N	\N	\N	15806295M	1956-10-23	2020-01-31	854	F	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.86	\N	Beruete	\N	\N	Numeraria	\N	ordinario	\N	\N	\N	\N
855	\N	M Carmen	Santos Hontoria	\N	\N	\N	15798981M	1954-06-15	2021-09-30	855	F	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.861	\N	Arraitz	\N	\N	Numeraria	\N	ordinario	\N	\N	\N	\N
856	\N	Immaculada	Goñi Ibero	\N	\N	\N	15786457Q	1953-11-15	2021-11-10	856	F	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.861	\N	Alkotz	\N	\N	Numeraria	\N	ordinario	\N	\N	\N	\N
857	\N	Angel M	Lopez Garro	\N	\N	\N	15782970W	1953-04-21	2021-11-10	857	H	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.861	\N	Alkotz	\N	\N	Numeraria	\N	ordinario	\N	\N	\N	\N
858	\N	Benita Jesusa	Cenoz Cenoz	\N	\N	\N	15803096A	1956-04-08	2022-01-17	858	F	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.862	\N	Arraitz	\N	\N	Numeraria	\N	ordinario	\N	\N	\N	\N
860	\N	M Jesús	Salinas Arístegui	\N	\N	\N	15777571P	1952-06-20	2022-03-03	860	F	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.863	\N	Eltso	\N	\N	Numeraria	\N	ordinario	\N	\N	\N	\N
861	\N	Juana 	Solana Martín	\N	\N	\N	7426656W	1952-05-27	2022-03-03	861	F	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.863	\N	Eltso	\N	\N	Numeraria	\N	ordinario	\N	\N	\N	\N
862	\N	Lourdes 	Osacain Agoues	\N	\N	\N	15922912N	1958-03-04	2022-03-03	862	F	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.864	\N	Eltso	\N	\N	Numeraria	\N	ordinario	\N	\N	\N	\N
863	\N	Jesús M	Beunza Baleztena	\N	\N	\N	15813630A	1958-01-21	2022-03-03	863	H	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.864	\N	Eltso	\N	\N	Numeraria	\N	ordinario	\N	\N	\N	\N
864	\N	Mercedes	Ariztegui Osacar	\N	\N	\N	15780194D	1952-09-18	2022-03-03	864	F	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.865	\N	Lizaso	\N	\N	Numeraria	\N	ordinario	\N	\N	\N	\N
865	\N	Timoteo	Lopez Garro	\N	\N	\N	72638637Z	1947-03-22	2022-03-03	865	H	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.865	\N	Beruete	\N	\N	Numeraria	\N	ordinario	\N	\N	\N	\N
866	\N	José M	Iraizoz Recalde	\N	\N	\N	15805176J	1953-11-01	2022-01-01	866	H	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.866	\N	Gaskue	\N	\N	Numeraria	\N	ordinario	\N	\N	\N	\N
868	\N	Juan Miguel	Gascue Goñi	\N	\N	\N	15807522J	1957-03-06	2022-03-01	868	H	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.867	\N	Auza	\N	\N	Numeraria	\N	ordinario	\N	\N	\N	\N
869	\N	Jesús M. 	Arano lampreabe	\N	\N	\N	15806777G	1955-10-16	2022-03-15	869	H	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.867	\N	Beruete	\N	\N	Numeraria	\N	ordinario	\N	\N	\N	\N
870	\N	Bernardo	Lazcano Garro	\N	\N	\N	15831448L	1958-06-04	2022-03-04	870	H	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.868	\N	Erbiti	\N	\N	Numeraria	\N	ordinario	\N	\N	\N	\N
871	\N	Loli	Itoiz Gorricho	\N	\N	\N	15782028A	1951-12-16	2022-04-08	871	F	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.868	\N	Lizaso	\N	\N	Numeraria	\N	ordinario	\N	\N	\N	\N
872	\N	Imanol	Rekondo Elizalde	\N	\N	\N	18418531Q	1961-09-12	2022-05-30	872	H	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.869	\N	Arrarats	\N	\N	Numeraria	\N	ordinario	\N	\N	\N	\N
873	\N	Serafin	Zalduendo Orella	\N	\N	\N	15778031P	1951-01-27	2022-06-06	873	H	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.869	\N	Eltzaburu	\N	\N	Numeraria	\N	ordinario	\N	\N	\N	\N
831	\N	Nicolas	Iragui Ciganda				15790799B	1953-01-01	2019-01-31	831	H	activo	\N	\N	\N	\N	2026-04-23 17:01:28.575	\N	Erripa	Nafarroa	\N	directiva	\N	ordinario	\N	\N	\N	\N
876	\N	Juana M	Zudaire Subiza	\N	\N	\N	18194441S	1961-09-08	2022-07-14	876	F	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.87	\N	Auza	\N	\N	Numeraria	\N	ordinario	\N	\N	\N	\N
877	\N	Koro	Marturet Armendariz	\N	\N	\N	15771136J	1951-01-25	2022-08-09	877	F	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.871	\N	Lizaso	\N	\N	Numeraria	\N	ordinario	\N	\N	\N	\N
878	\N	M Amparo	Iribar  Anduaga	\N	\N	\N	15840482Z	1960-03-29	2022-10-15	878	F	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.871	\N	Auza	\N	\N	Numeraria	\N	ordinario	\N	\N	\N	\N
879	\N	Tomas Javier	Goñi Baleztena	\N	\N	\N	15811358P	1957-02-18	2022-10-15	879	H	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.872	\N	Auza	\N	\N	Numeraria	\N	ordinario	\N	\N	\N	\N
880	\N	M Antonia	Iribar  Anduaga	\N	\N	\N	15810870A	1957-08-26	2022-10-15	880	F	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.872	\N	Auza	\N	\N	Numeraria	\N	ordinario	\N	\N	\N	\N
881	\N	José Joaquín	Ansorena Sala	\N	\N	\N	15832142T	1958-04-13	2022-11-17	881	H	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.873	\N	Itsaso	\N	\N	Numeraria	\N	ordinario	\N	\N	\N	\N
883	\N	Mariano Luis	Morrondo  Decimavilla	\N	\N	\N	15776736R	1951-08-25	2023-03-01	883	H	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.874	\N	Erripa	\N	\N	Numeraria	\N	ordinario	\N	\N	\N	\N
884	\N	M Angeles	Oyarzun Azpiroz	\N	\N	\N	15788056M	1953-11-28	2023-03-01	884	F	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.874	\N	Erripa	\N	\N	Numeraria	\N	ordinario	\N	\N	\N	\N
885	\N	Francisca	Osinaga Artazcoz	\N	\N	\N	15755521S	1939-01-05	2023-03-01	885	F	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.875	\N	Latasa	\N	\N	Honorifica	\N	ordinario	\N	\N	\N	\N
886	\N	M Nieves	Osinaga Artazcoz	\N	\N	\N	15756612W	1945-01-06	2023-03-01	886	F	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.875	\N	Latasa	\N	\N	Numeraria	\N	ordinario	\N	\N	\N	\N
887	\N	Nekane	Larrayoz Azcárate	\N	\N	\N	15841997B	1959-07-25	2023-03-01	887	F	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.876	\N	Udabe	\N	\N	Numeraria	\N	ordinario	\N	\N	\N	\N
888	\N	Agustin M	Ancizu Elizondo	\N	\N	\N	15811454N	1957-03-22	2023-03-01	888	H	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.877	\N	Lizaso	\N	\N	Numeraria	\N	ordinario	\N	\N	\N	\N
890	\N	Yolanda	Arias García	\N	\N	\N	18194417Z	1963-08-18	2023-03-01	890	F	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.878	\N	Jauntsarats 	\N	\N	Numeraria	\N	ordinario	\N	\N	\N	\N
875	\N	Gurutz	Urzelai Iribarren				72565052Y	1955-09-14	2022-06-15	875	H	activo	\N	\N	\N	\N	2026-04-23 16:59:22.354	\N	Lizaso	Nafarroa	\N	directiva	\N	ordinario	\N	\N	\N	\N
892	\N	M Lourdes	Goñi Larraya	\N	\N	\N	15848315G	1961-02-14	2023-03-01	892	F	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.879	\N	Lizaso	\N	\N	Numeraria	\N	ordinario	\N	\N	\N	\N
893	\N	Juan Antonio	Cuesta Sanchez	\N	\N	\N	15810468S	1957-05-25	2023-03-01	893	H	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.879	\N	Lizaso	\N	\N	Numeraria	\N	ordinario	\N	\N	\N	\N
895	\N	M Carmen	Arizaleta Barbería	\N	\N	\N	72644217M	1949-01-13	2023-03-01	895	F	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.88	\N	Gartzaron	\N	\N	Numeraria	\N	ordinario	\N	\N	\N	\N
896	\N	M Lourdes	Arangoa Aguirre	\N	\N	\N	15810337E	1958-12-04	2023-03-01	896	F	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.88	\N	Arraitz	\N	\N	Numeraria	\N	ordinario	\N	\N	\N	\N
897	\N	Juan Emilio	Izco Herrero	\N	\N	\N	15741056V	1943-06-06	2023-03-01	897	H	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.881	\N	Zenotz	\N	\N	Numeraria	\N	ordinario	\N	\N	\N	\N
898	\N	M Idoya	Astiz Landiribar	\N	\N	\N	15828673G	1956-06-11	2023-03-01	898	F	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.881	\N	Etxaleku	\N	\N	Numeraria	\N	ordinario	\N	\N	\N	\N
899	\N	M Carmen	Beloqui Percaz	\N	\N	\N	72652294D	1949-07-17	2023-03-01	899	F	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.882	\N	Etxaleku	\N	\N	Numeraria	\N	ordinario	\N	\N	\N	\N
901	\N	José Ramón	Beloqui Iriarte	\N	\N	\N	72651763F	1948-12-30	2023-03-01	901	H	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.882	\N	Etxaleku	\N	\N	Numeraria	\N	ordinario	\N	\N	\N	\N
902	\N	M Francisca	Glodaracena Arrizurieta	\N	\N	\N	72638228L	1947-05-26	2023-03-01	902	F	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.883	\N	Etxaleku	\N	\N	Numeraria	\N	ordinario	\N	\N	\N	\N
903	\N	M Nieves	Iriarte Aranguren	\N	\N	\N	15771752P	1951-04-30	2023-03-01	903	F	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.883	\N	Etxaleku	\N	\N	Numeraria	\N	ordinario	\N	\N	\N	\N
905	\N	M Angeles	Solana Martín	\N	\N	\N	7437267X	1957-07-17	2023-04-01	905	F	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.884	\N	Eltso	\N	\N	Numeraria	\N	ordinario	\N	\N	\N	\N
906	\N	Pedro	Tellez Mateo	\N	\N	\N	15798086F	1954-04-27	2023-04-01	906	H	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.884	\N	Aizarotz	\N	\N	Numeraria	\N	ordinario	\N	\N	\N	\N
907	\N	M Pilar	Sanchez Hermosa	\N	\N	\N	15796032T	1954-12-22	2023-04-01	907	F	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.885	\N	Aizarotz	\N	\N	Numeraria	\N	ordinario	\N	\N	\N	\N
908	\N	Roslyn	Irurita Goñi	\N	\N	\N	73509215L	1958-03-20	2023-05-01	908	F	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.886	\N	Alkotz	\N	\N	Numeraria	\N	ordinario	\N	\N	\N	\N
910	\N	Mª Jesus 	Saez de Albeniz Echalecu	\N	\N	\N	15767144T	1948-01-29	2023-05-01	910	F	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.886	\N	Oskotz	\N	\N	Numeraria	\N	ordinario	\N	\N	\N	\N
911	\N	Arantza	Garaikoetxea Garaikoetxea	\N	\N	\N	15766084K	1950-02-01	2023-06-01	911	F	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.887	\N	Muskitz	\N	\N	Numeraria	\N	ordinario	\N	\N	\N	\N
912	\N	Mikel	Ollo Gorriti	\N	\N	\N	15827330H	1956-07-15	2023-06-01	912	H	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.887	\N	Goldaraz	\N	\N	Numeraria	\N	ordinario	\N	\N	\N	\N
913	\N	Begoña	Rastrilla Gomez	\N	\N	\N	15765350T	1948-11-04	2023-01-01	913	F	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.888	\N	Muskitz	\N	\N	Numeraria	\N	ordinario	\N	\N	\N	\N
914	\N	Jose Antonio	Garbisu Orayen	\N	\N	\N	72617545J	1941-11-16	2023-01-01	914	H	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.888	\N	Muskitz	\N	\N	Numeraria	\N	ordinario	\N	\N	\N	\N
915	\N	Fermin 	Galarza Larrayoz	\N	\N	\N	72644568B	1949-06-01	2023-08-01	915	H	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.888	\N	Igoa	\N	\N	Numeraria	\N	ordinario	\N	\N	\N	\N
917	\N	Santiago	Ezcurra Unzu	\N	\N	\N	15720826G	1942-07-05	2023-09-01	917	H	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.889	\N	Arraitz	\N	\N	Numeraria	\N	ordinario	\N	\N	\N	\N
918	\N	Juan Miguel	Larrayoz Barberena	\N	\N	\N	15802031L	1955-07-20	2023-09-01	918	H	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.89	\N	Eltzaburu	\N	\N	Numeraria	\N	ordinario	\N	\N	\N	\N
919	\N	Mikaela	Guelbenzu Arce	\N	\N	\N	18211659Y	\N	2023-01-01	919	F	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.89	\N	Iraizotz	\N	\N	Honorifica	\N	ordinario	\N	\N	\N	\N
920	\N	Javier	Goñi Aguirre	\N	\N	\N	15827697V	\N	2023-01-01	920	H	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.891	\N	Iraizotz	\N	\N	Honorifica	\N	ordinario	\N	\N	\N	\N
921	\N	Javier	Aguinaga Aldareguia				15811750D	1957-04-17	2023-09-01	921	H	activo	\N	\N	\N	\N	2026-04-23 17:00:46	\N	Eritze	Nafarroa	\N	directiva	\N	ordinario	\N	\N	\N	\N
923	\N	Julia	Larrayoz Arregui	\N	\N	\N	15841263J	1960-01-12	2023-09-01	923	F	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.892	\N	Lantz	\N	\N	Numeraria	\N	ordinario	\N	\N	\N	\N
925	\N	Bakartxo	Ripalda Zubieta	\N	\N	\N	44611507V	1975-03-15	2023-09-01	925	F	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.893	\N	Beruete	\N	\N	Numeraria	\N	ordinario	\N	\N	\N	\N
926	\N	Jesus Manuel 	Arangoa Cia	\N	\N	\N	15769575Q	1949-12-13	2023-09-01	926	H	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.893	\N	Beruete	\N	\N	Numeraria	\N	ordinario	\N	\N	\N	\N
927	\N	Maria Josefa	Satrustegui Oscoz	\N	\N	\N	15795393M	1955-02-15	2023-01-01	927	F	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.894	\N	Lizaso	\N	\N	Numeraria	\N	ordinario	\N	\N	\N	\N
928	\N	Miguel Angel	Mariñelarena Oyarzun	\N	\N	\N	15780127B	1951-12-13	2024-01-01	928	H	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.895	\N	Berasain	\N	\N	Numeraria	\N	ordinario	\N	\N	\N	\N
929	\N	Mª Concepcion	Goñi Oyarzun	\N	\N	\N	15781407A	1952-05-09	2024-01-01	929	F	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.895	\N	Berasain	\N	\N	Numeraria	\N	ordinario	\N	\N	\N	\N
930	\N	Iñaki	Elizondo Osinaga	\N	\N	\N	15849852T	1961-08-30	2024-01-01	930	H	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.896	\N	Latasa	\N	\N	Numeraria	\N	ordinario	\N	\N	\N	\N
932	\N	M Teresa	Abaurrea Elizalde	\N	\N	\N	15726847E	1943-01-24	2023-09-01	932	F	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.897	\N	Lantz	\N	\N	Numeraria	\N	ordinario	\N	\N	\N	\N
933	\N	M.Luisa	Beunza Larumbe	\N	\N	\N	15809213W	1956-04-30	2024-01-01	933	F	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.897	\N	Gartzaron	\N	\N	Numeraria	\N	ordinario	\N	\N	\N	\N
934	\N	Jesus	Latasa Urtasun	\N	\N	\N	72646714H	1949-07-23	2024-01-01	934	H	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.897	\N	Alkotz	\N	\N	Numeraria	\N	ordinario	\N	\N	\N	\N
935	\N	Juana	Barberena Elcano	\N	\N	\N	15780274C	1952-12-27	2024-01-01	935	F	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.898	\N	Alkotz	\N	\N	Numeraria	\N	ordinario	\N	\N	\N	\N
936	\N	Jose Antonio	Larrayoz Arregui	\N	\N	\N	15813050K	1957-11-10	2024-01-01	936	H	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.898	\N	Arraitz	\N	\N	Numeraria	\N	ordinario	\N	\N	\N	\N
937	\N	M.Sol	Larrayoz Arregui	\N	\N	\N	15801808A	1954-11-22	2024-01-01	937	F	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.899	\N	Arraitz	\N	\N	Numeraria	\N	ordinario	\N	\N	\N	\N
938	\N	Juan	Barberena Otermin	\N	\N	\N	15778079X	1952-06-12	2024-01-01	938	H	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.899	\N	Arraitz	\N	\N	Numeraria	\N	ordinario	\N	\N	\N	\N
939	\N	M.Josefa	Zazpe Oyarzun	\N	\N	\N	15845405S	1960-09-21	2024-01-01	939	F	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.9	\N	Igoa	\N	\N	Numeraria	\N	ordinario	\N	\N	\N	\N
941	\N	Juan Bautista	Arrarats Bildarratz	\N	\N	\N	15863642J	1962-03-24	2024-01-01	941	H	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.901	\N	Beruete	\N	\N	Numeraria	\N	ordinario	\N	\N	\N	\N
942	\N	Lourdes	Rekondo Elizalde	\N	\N	\N	15829003N	1957-10-22	2024-01-01	942	F	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.901	\N	Beruete	\N	\N	Numeraria	\N	ordinario	\N	\N	\N	\N
943	\N	M. Carmen	Ochotorena Arangoa	\N	\N	\N	15829004J	1957-08-05	2024-01-01	943	F	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.902	\N	Beruete	\N	\N	Numeraria	\N	ordinario	\N	\N	\N	\N
944	\N	Pedro Mª	Zubillaga Sagües	\N	\N	\N	15800284C	1955-11-14	2024-01-01	944	H	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.902	\N	Gerendiain	\N	\N	Numeraria	\N	ordinario	\N	\N	\N	\N
945	\N	Mª Carmen	Navas Aguirre	\N	\N	\N	15836588F	1958-03-29	2024-01-01	945	F	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.903	\N	Gerendiain	\N	\N	Numeraria	\N	ordinario	\N	\N	\N	\N
947	\N	Camino 	Telechea Jaunarena	\N	\N	\N	\N	\N	2024-01-01	947	F	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.903	\N	Gartzaron	\N	\N	Honorifica	\N	ordinario	\N	\N	\N	\N
948	\N	Mª José	Altuna Arce	\N	\N	\N	\N	\N	2024-01-01	948	F	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.904	\N	Olague	\N	\N	Honorifica	\N	ordinario	\N	\N	\N	\N
949	\N	Angel Mª	Mariñelarena Erice	\N	\N	\N	15804363M	1956-09-27	2024-01-01	949	H	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.904	\N	Aritzu	\N	\N	Numeraria	\N	ordinario	\N	\N	\N	\N
950	\N	Mª Isabel	Urdaniz Irurita	\N	\N	\N	15830243X	1958-07-08	2024-01-01	950	F	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.905	\N	Aritzu	\N	\N	Numeraria	\N	ordinario	\N	\N	\N	\N
951	\N	Mª Angeles 	Urdaniz Irurita	\N	\N	\N	15808481Y	1957-02-27	2024-01-01	951	F	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.905	\N	Aritzu	\N	\N	Numeraria	\N	ordinario	\N	\N	\N	\N
952	\N	Mª Jesus 	Mujika Gamborena	\N	\N	\N	\N	\N	2024-04-01	952	F	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.906	\N	Beruete	\N	\N	Honorifica	\N	ordinario	\N	\N	\N	\N
954	\N	Mª Rosario	Legarrea Razquin	\N	\N	\N	15792646H	1953-10-26	2024-04-01	954	F	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.907	\N	Urritzola	\N	\N	Numeraria	\N	ordinario	\N	\N	\N	\N
955	\N	Miguel Angel	Iribarren Altuna	\N	\N	\N	15853835G	1961-02-26	2024-08-01	955	H	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.908	\N	Auza	\N	\N	Numeraria	\N	ordinario	\N	\N	\N	\N
956	\N	Miguel	Villava Angel	\N	\N	\N	15790770M	1954-07-07	2024-08-01	956	H	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.908	\N	Lizaso	\N	\N	Numeraria	\N	ordinario	\N	\N	\N	\N
957	\N	Mª Carmen	Ariztegui Osacar	\N	\N	\N	15809300C	1957-06-19	2024-08-01	957	F	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.908	\N	Lizaso	\N	\N	Numeraria	\N	ordinario	\N	\N	\N	\N
958	\N	Elvira	Blanco Lumbier	\N	\N	\N	15764605Z	1949-01-25	2025-01-01	958	F	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.909	\N	Iraizotz	\N	\N	Numeraria	\N	ordinario	\N	\N	\N	\N
959	\N	Fco.Javier 	Erice Goldaraz	\N	\N	\N	15846940D	1960-09-12	2025-01-01	959	H	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.909	\N	Ripa	\N	\N	Numeraria	\N	ordinario	\N	\N	\N	\N
960	\N	Jesus Mª	Torres Cuesta	\N	\N	\N	15929726H	1958-06-16	2025-01-01	960	H	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.91	\N	Eltso	\N	\N	Numeraria	\N	ordinario	\N	\N	\N	\N
1	\N	Araceli	Eleta Larrayoz	\N	\N	\N	15861637D	1936-12-10	1991-03-01	1	F	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.386	\N	Olague	\N	\N	Fundadora	\N	ordinario	\N	\N	\N	\N
3	\N	Gloria	Gastearena Churruca	\N	\N	\N	72624620G	1926-09-30	1991-03-01	3	F	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.392	\N	Auza	\N	\N	Fundadora	\N	ordinario	\N	\N	\N	\N
13	\N	José M	Urriza Machain	\N	\N	\N	15662829J	1930-04-10	1991-03-01	13	H	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.407	\N	Igoa	\N	\N	Fundadora	\N	ordinario	\N	\N	\N	\N
20	\N	M. Josefa	Lacunza 	\N	\N	\N	15861034G	1925-01-29	1991-03-01	20	F	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.414	\N	Larraintzar	\N	\N	Fundadora	\N	ordinario	\N	\N	\N	\N
28	\N	José	Judez Martinez	\N	\N	\N	15373118X	1916-10-21	1991-03-01	28	H	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.421	\N	Olague	\N	\N	Fundadora	\N	ordinario	\N	\N	\N	\N
36	\N	Pedro M	Loperena Setuain	\N	\N	\N	15857254L	1921-10-21	1991-03-01	36	H	Baja	\N	\N	\N	\N	2026-04-23 16:53:00.427	\N	Burutain	\N	\N	Fundadora	\N	ordinario	\N	\N	\N	\N
43	\N	Faustino	Gurbindo Larrayoz	\N	\N	\N	15861392V	1925-02-28	1991-03-01	43	H	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.431	\N	Eltzaburu	\N	\N	Fundadora	\N	ordinario	\N	\N	\N	\N
51	\N	Francisco	Gurbindo Esain	\N	\N	\N	15746328E	1910-10-01	1991-03-01	51	H	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.436	\N	Eltzaburu	\N	1994-02-06	Fundadora	\N	ordinario	\N	\N	\N	\N
59	\N	José	Calzado Urroz	\N	\N	\N	15627767A	1916-10-01	1991-03-01	59	H	Baja	\N	\N	\N	\N	2026-04-23 16:53:00.443	\N	Eltzaburu	\N	1996-04-01	Fundadora	\N	ordinario	\N	\N	\N	\N
68	\N	Asunción	Villanueva Sagardía	\N	\N	\N	15861101W	1919-08-08	1991-03-01	68	F	Baja	\N	\N	\N	\N	2026-04-23 16:53:00.45	\N	Suarbe	\N	\N	Fundadora	\N	ordinario	\N	\N	\N	\N
70	\N	M Asunción	Baraibar Astovereta	\N	\N	\N	15626529F	1929-04-13	1991-03-01	70	F	Baja	\N	\N	\N	\N	2026-04-23 16:53:00.451	\N	Alkotz	\N	2007-11-14	Fundadora	\N	ordinario	\N	\N	\N	\N
76	\N	Guillermo	Ibarrola Ilarregi	\N	\N	\N	15857185L	1925-03-17	1991-03-01	76	H	Baja	\N	\N	\N	\N	2026-04-23 16:53:00.455	\N	Alkotz	\N	\N	Fundadora	\N	ordinario	\N	\N	\N	\N
85	\N	Fermin	Mariezcurrena 	\N	\N	\N	15861571N	1918-03-25	1991-03-01	85	H	Baja	\N	\N	\N	\N	2026-04-23 16:53:00.46	\N	Auza	\N	\N	Fundadora	\N	ordinario	\N	\N	\N	\N
92	\N	M. Josefa	Noain Insausti	\N	\N	\N	15697911C	1934-10-03	1991-03-01	92	F	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.464	\N	Orokieta	\N	\N	Fundadora	\N	ordinario	\N	\N	\N	\N
100	\N	Ana M	Vizcay Armendariz	\N	\N	\N	15857797X	1933-10-08	1991-03-01	100	F	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.468	\N	Ziaurritz	\N	\N	Fundadora	\N	ordinario	\N	\N	\N	\N
639	\N	Francisco J.	Goñi Bravo				72637778Y	1946-12-04	2009-01-20	639	H	activo	\N	\N	\N	\N	2026-04-23 16:53:00.752	\N	Alkotz	Nafarroa	\N	directiva	\N	ordinario	\N	\N	\N	\N
759	\N	M Cruz	Iráizoz Gonzalo				15774526E	1951-05-03	2015-01-01	759	F	activo	\N	\N	\N	\N	2026-04-23 16:53:00.812	\N	Iraizotz	Nafarroa	\N	directiva	\N	ordinario	\N	\N	\N	\N
961	\N	Rosa 	Etxarri Barberena	\N	\N	\N	15832771P	1958-01-23	2025-01-01	961	F	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.91	\N	Auza	\N	\N	Numeraria	\N	ordinario	\N	\N	\N	\N
962	\N	Pedro 	Zunzarren Baigorri	\N	\N	\N	15809494F	1957-06-29	2025-01-01	962	H	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.911	\N	Gorronz	\N	\N	Numeraria	\N	ordinario	\N	\N	\N	\N
963	\N	Mª Victoria	Cueli Erice	\N	\N	\N	15830018S	1958-03-20	2025-01-01	963	F	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.911	\N	Ripa	\N	\N	Numeraria	\N	ordinario	\N	\N	\N	\N
964	\N	Mª Milagros	Arregui Machain	\N	\N	\N	15851389L	1961-02-13	2025-01-01	964	F	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.912	\N	Eltzaburu	\N	\N	Numeraria	\N	ordinario	\N	\N	\N	\N
965	\N	José Mª	Larrayoz  Azcarate	\N	\N	\N	15827310K	1958-03-11	2025-01-01	965	H	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.912	\N	Eltzaburu	\N	\N	Numeraria	\N	ordinario	\N	\N	\N	\N
966	\N	M. Angeles	Labat Martinez	\N	\N	\N	\N	\N	2025-01-01	966	H	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.913	\N	Erripa	\N	\N	Honorifica	\N	ordinario	\N	\N	\N	\N
968	\N	Juan Ignacio	Larrayoz  Azcarate	\N	\N	\N	\N	\N	2025-04-01	968	H	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.914	\N	Eltzaburu	\N	\N	Honorifica	\N	ordinario	\N	\N	\N	\N
969	\N	Txaro	Herranz Alonso	\N	\N	\N	\N	\N	2025-04-01	969	F	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.914	\N	Eltzaburu	\N	\N	Honorifica	\N	ordinario	\N	\N	\N	\N
970	\N	Ana Isabel	Alberro Goñi	\N	\N	\N	18204500T	1965-01-10	2025-04-01	970	F	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.915	\N	Eltzaburu	\N	\N	Numeraria	\N	ordinario	\N	\N	\N	\N
971	\N	Lourdes	Gorostieta Irigoyen	\N	\N	\N	15837415Y	1958-06-24	2025-04-01	971	F	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.915	\N	Iraizotz	\N	\N	Numeraria	\N	ordinario	\N	\N	\N	\N
972	\N	Mª Lourdes	Aranguren Barberia	\N	\N	\N	15829661A	1958-07-07	2025-05-01	972	F	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.916	\N	Eltzaburu	\N	\N	Numeraria	\N	ordinario	\N	\N	\N	\N
973	\N	Ceferina	Bailon Iriarte	\N	\N	\N	15832147M	1958-09-17	2025-06-01	973	F	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.916	\N	Itsaso	\N	\N	Numeraria	\N	ordinario	\N	\N	\N	\N
974	\N	Victoriano	Iriarte Ansorena	\N	\N	\N	15773446T	1950-12-09	2025-06-01	974	H	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.916	\N	Itsaso	\N	\N	Numeraria	\N	ordinario	\N	\N	\N	\N
975	\N	Mª Puy	Arano Arregui	\N	\N	\N	\N	\N	2025-08-01	975	F	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.917	\N	Beruete	\N	\N	Honorifica	\N	ordinario	\N	\N	\N	\N
976	\N	Mª Rosario	Erro Azanza	\N	\N	\N	15842591F	1959-10-22	2025-09-01	976	F	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.918	\N	Auza	\N	\N	Numeraria	\N	ordinario	\N	\N	\N	\N
978	\N	Reyes	Soba Garcia	\N	\N	\N	15853395R	1961-08-30	2026-01-01	978	F	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.919	\N	Gascue	\N	\N	Numeraria	\N	ordinario	\N	\N	\N	\N
979	\N	Mª Sagrario	Beunza Baleztena	\N	\N	\N	15850361A	1961-06-09	2026-01-01	979	F	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.92	\N	Eltso	\N	\N	Numeraria	\N	ordinario	\N	\N	\N	\N
980	\N	Jose Miguel	San Martin Preboste	\N	\N	\N	15800954T	1955-07-23	2026-01-01	980	H	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.921	\N	Eltso	\N	\N	Numeraria	\N	ordinario	\N	\N	\N	\N
981	\N	Peio Mikel	Dorai Bengoetxea	\N	\N	\N	15853847Q	1961-07-11	2026-01-01	981	H	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.922	\N	Beramendi	\N	\N	Numeraria	\N	ordinario	\N	\N	\N	\N
982	\N	Frantziska	Urritza Satrustegi	\N	\N	\N	18199743G	1964-05-06	2026-01-01	982	F	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.923	\N	Beramendi	\N	\N	Numeraria	\N	ordinario	\N	\N	\N	\N
983	\N	Jorge	Biurrarena Barrenetxea	\N	\N	\N	18198363G	1962-06-15	2026-01-01	983	H	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.924	\N	Beramendi	\N	\N	Numeraria	\N	ordinario	\N	\N	\N	\N
985	\N	Jesus Mª	Egea Olano	\N	\N	\N	15841891C	1959-06-18	2026-01-01	985	H	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.926	\N	Anocibar	\N	\N	Numeraria	\N	ordinario	\N	\N	\N	\N
986	\N	Marta	Alegria Iturri	\N	\N	\N	15841383H	1960-06-14	2026-01-01	986	F	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.927	\N	Anocibar	\N	\N	Numeraria	\N	ordinario	\N	\N	\N	\N
987	\N	Itziar	Mariezcurrena Nuin	\N	\N	\N	15831389Y	1958-11-20	2026-01-01	987	F	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.927	\N	Eltso	\N	\N	Numeraria	\N	ordinario	\N	\N	\N	\N
988	\N	Mª Reyes	Perez Oyarzun	\N	\N	\N	15833359K	1959-01-06	2026-01-01	988	F	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.928	\N	Etsain	\N	\N	Numeraria	\N	ordinario	\N	\N	\N	\N
989	\N	Jose Ignacio	Iragui Lizarraga	\N	\N	\N	15792015P	1954-07-31	2026-01-01	989	H	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.929	\N	Burutain	\N	\N	Numeraria	\N	ordinario	\N	\N	\N	\N
990	\N	Manuel	Igoa Loidi	\N	\N	\N	15793048Y	1954-08-24	2026-01-01	990	H	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.929	\N	Udabe	\N	\N	Numeraria	\N	ordinario	\N	\N	\N	\N
991	\N	Milagros	Munarriz Larrion	\N	\N	\N	15847338Q	1951-10-21	2026-01-01	991	F	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.929	\N	Urrizola	\N	\N	Numeraria	\N	ordinario	\N	\N	\N	\N
993	\N	Pilar	Otero Ortigosa	\N	\N	\N	18204487X	1964-09-21	2026-01-01	993	F	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.93	\N	Lizaso	\N	\N	Numeraria	\N	ordinario	\N	\N	\N	\N
994	\N	Juan	Roanes Galan	\N	\N	\N	15844952E	1962-08-03	2026-01-01	994	H	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.931	\N	Lizaso	\N	\N	Numeraria	\N	ordinario	\N	\N	\N	\N
995	\N	Cecilia	Lecuona Lizaso	\N	\N	\N	15905122R	1954-04-28	2026-01-01	995	F	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.931	\N	Burutain	\N	\N	Numeraria	\N	ordinario	\N	\N	\N	\N
996	\N	Simon	Juanbeltz Lopez	\N	\N	\N	15840600V	1960-03-16	2026-01-01	996	H	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.932	\N	Beruete	\N	\N	Numeraria	\N	ordinario	\N	\N	\N	\N
997	\N	Miguel	Larrayoz Ezcurra	\N	\N	\N	\N	\N	2026-01-01	997	H	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.932	\N	Eltzaburu	\N	\N	Honorifica	\N	ordinario	\N	\N	\N	\N
998	\N	Ana	Olaetxea Otermin	\N	\N	\N	\N	\N	2026-01-01	998	F	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.933	\N	Eltzaburu	\N	\N	Honorifica	\N	ordinario	\N	\N	\N	\N
1000	\N	Gema	Jaunsaras Arano	\N	\N	\N	18194414B	1961-09-10	2026-01-01	1000	F	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.934	\N	Gartzaron	\N	\N	Numeraria	\N	ordinario	\N	\N	\N	\N
1001	\N	Jesus Mª	Altuna Villanueva	\N	\N	\N	15803364H	1955-09-10	2026-01-01	1001	H	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.934	\N	Suarbe	\N	\N	Numeraria	\N	ordinario	\N	\N	\N	\N
1002	\N	Mª José	Picabea Aguirre	\N	\N	\N	15833365G	1959-02-15	2026-01-01	1002	F	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.935	\N	Suarbe	\N	\N	Numeraria	\N	ordinario	\N	\N	\N	\N
1003	\N	Manuel D	Delgado Echeverria	\N	\N	\N	17830213S	1949-05-08	2026-01-01	1003	H	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.935	\N	Arrarats	\N	\N	Numeraria	\N	ordinario	\N	\N	\N	\N
1004	\N	Blanca 	Gurbindo Bomba	\N	\N	\N	15842077E	1960-01-22	2026-01-01	1004	F	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.936	\N	Aizarotz	\N	\N	Numeraria	\N	ordinario	\N	\N	\N	\N
1005	\N	Irene	Marturet Armendariz				15804305Q	1956-03-26	2014-02-03	9999	F	activo	\N	\N	\N	\N	2026-04-23 16:53:00.936	\N	Lizaso	Nafarroa	\N	numeraria	\N	ordinario	\N	\N	\N	\N
108	\N	Carmen	Huarritz Regueiro	\N	\N	\N	15857183V	1927-07-07	1991-03-01	108	F	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.473	\N	Olague	\N	\N	Fundadora	\N	ordinario	\N	\N	\N	\N
115	\N	Claudia	Lopez Aguirre	\N	\N	\N	15008205S	1927-02-18	1991-03-01	115	F	Baja	\N	\N	\N	\N	2026-04-23 16:53:00.477	\N	Beruete	\N	\N	Fundadora	\N	ordinario	\N	\N	\N	\N
123	\N	M.Jesús	Larequi Herrera	\N	\N	\N	15861289Y	1926-06-11	1991-03-01	123	F	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.481	\N	Gerendiain	\N	\N	Fundadora	\N	ordinario	\N	\N	\N	\N
131	\N	M.Josefa	Armendariz Oyarzun	\N	\N	\N	15860883Z	1925-10-12	1991-03-01	131	F	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.486	\N	Auza	\N	\N	Fundadora	\N	ordinario	\N	\N	\N	\N
138	\N	Gabriel	Mitxelena García	\N	\N	\N	15686459E	1924-10-20	1991-03-01	138	H	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.491	\N	Alkotz	\N	\N	Fundadora	\N	ordinario	\N	\N	\N	\N
139	\N	Francisco	Guelbenzu Goyenaga	\N	\N	\N	15861547B	1929-06-18	1991-03-01	139	H	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.491	\N	Auza	\N	\N	Fundadora	\N	ordinario	\N	\N	\N	\N
140	\N	Avelina	Garro Iribarren	\N	\N	\N	15657995D	1934-03-15	1991-03-01	140	F	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.492	\N	Auza	\N	\N	Fundadora	\N	ordinario	\N	\N	\N	\N
148	\N	Mª Jesús	Ariztegi Iragui	\N	\N	\N	15632417F	1923-10-23	1991-03-01	148	F	Baja	\N	\N	\N	\N	2026-04-23 16:53:00.496	\N	Arraitz	\N	\N	Fundadora	\N	ordinario	\N	\N	\N	\N
156	\N	Joaquina	Baraibar Igoa	\N	\N	\N	15650647K	1924-02-17	1991-03-01	156	F	Baja	\N	\N	\N	\N	2026-04-23 16:53:00.5	\N	Ziganda	\N	\N	Fundadora	\N	ordinario	\N	\N	\N	\N
164	\N	María	Huarte Villanueva	\N	\N	\N	15658971L	1914-05-02	1991-03-01	164	F	Baja	\N	\N	\N	\N	2026-04-23 16:53:00.504	\N	Orokieta	\N	\N	Fundadora	\N	ordinario	\N	\N	\N	\N
171	\N	Santos	Indakoetxea Ripa	\N	\N	\N	15657891C	1911-11-01	1991-03-01	171	H	Baja	\N	\N	\N	\N	2026-04-23 16:53:00.508	\N	Beruete	\N	\N	Fundadora	\N	ordinario	\N	\N	\N	\N
180	\N	Carmen	Arangoa Arangoa	\N	\N	\N	15657881X	1921-07-16	1991-03-01	180	F	Baja	\N	\N	\N	\N	2026-04-23 16:53:00.512	\N	Beruete	\N	\N	Fundadora	\N	ordinario	\N	\N	\N	\N
186	\N	Luisa	Etxeverz Azcarate	\N	\N	\N	72623758Q	1923-08-12	1991-03-01	186	F	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.516	\N	Arraitz	\N	\N	Fundadora	\N	ordinario	\N	\N	\N	\N
195	\N	Catalina	Bengoetxea Etxeguia	\N	\N	\N	15657682H	1920-06-22	1991-03-01	195	F	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.52	\N	Beramendi	\N	\N	Fundadora	\N	ordinario	\N	\N	\N	\N
203	\N	María	Machiñena Gorrosterazu	\N	\N	\N	15861186H	1926-09-27	1991-03-01	203	F	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.524	\N	Iraizotz	\N	\N	Fundadora	\N	ordinario	\N	\N	\N	\N
208	\N	Esperanza	Zarranz Aguinaga	\N	\N	\N	15638970M	1926-06-21	1991-03-01	208	F	Baja	\N	\N	\N	\N	2026-04-23 16:53:00.527	\N	Erripa	\N	1998-01-01	Fundadora	\N	ordinario	\N	\N	\N	\N
212	\N	Pablo	Cenoz Murguia	\N	\N	\N	15861446W	1912-05-05	1991-03-01	212	H	Baja	\N	\N	\N	\N	2026-04-23 16:53:00.53	\N	Zenotz	\N	1998-09-05	Fundadora	\N	ordinario	\N	\N	\N	\N
219	\N	Eulalia	Ciganda Ilarregi	\N	\N	\N	15638529R	1912-02-12	1991-03-01	219	F	Baja	\N	\N	\N	\N	2026-04-23 16:53:00.533	\N	Erripa	\N	\N	Fundadora	\N	ordinario	\N	\N	\N	\N
226	\N	M Carmen	Alcubilla Abajo	\N	\N	\N	15165491G	1923-12-17	1991-03-01	226	F	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.537	\N	Ilarregi	\N	\N	Fundadora	\N	ordinario	\N	\N	\N	\N
233	\N	Dolores	Gonzalez Ardanaz	\N	\N	\N	15857178N	1915-03-15	1992-01-01	233	F	Baja	\N	\N	\N	\N	2026-04-23 16:53:00.54	\N	Ostitz	\N	\N	Fundadora	\N	ordinario	\N	\N	\N	\N
239	\N	Josefina	Aguinaga Azcárate	\N	\N	\N	15532866T	1928-07-25	1992-05-01	239	F	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.543	\N	Larraintzar	\N	\N	Fundadora	\N	ordinario	\N	\N	\N	\N
246	\N	Julia	Biurrarena Aldanondo	\N	\N	\N	15756907K	1926-10-01	1992-06-01	246	F	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.546	\N	Beramendi	\N	\N	Fundadora	\N	ordinario	\N	\N	\N	\N
254	\N	Sabino	Ripalda Agorreta	\N	\N	\N	72619078M	1934-06-20	1992-07-01	254	H	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.551	\N	Etsain	\N	\N	Fundadora	\N	ordinario	\N	\N	\N	\N
263	\N	María	Cia Mariñelarena	\N	\N	\N	15860899F	1926-11-24	1993-01-01	263	F	Baja	\N	\N	\N	\N	2026-04-23 16:53:00.559	\N	Lantz	\N	\N	Fundadora	\N	ordinario	\N	\N	\N	\N
269	\N	Antonio	San Martín Erbiti	\N	\N	\N	15857259R	1928-12-22	1993-01-01	269	H	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.562	\N	Burutain	\N	\N	Fundadora	\N	ordinario	\N	\N	\N	\N
277	\N	M.Pilar	Arano Huarte	\N	\N	\N	15750096H	1928-01-29	1993-04-01	277	F	Baja	\N	\N	\N	\N	2026-04-23 16:53:00.565	\N	Igoa	\N	\N	Fundadora	\N	ordinario	\N	\N	\N	\N
280	\N	Juan Luis	Perez Iribarren	\N	\N	\N	15626604J	1925-08-25	1993-04-01	280	H	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.567	\N	Iraizotz	\N	\N	Fundadora	\N	ordinario	\N	\N	\N	\N
288	\N	Mikaela	Otxandorena Belarra	\N	\N	\N	15658059G	1912-05-02	1991-03-01	288	F	Baja	\N	\N	\N	\N	2026-04-23 16:53:00.57	\N	Orokieta	\N	\N	Fundadora	\N	ordinario	\N	\N	\N	\N
296	\N	Lucía	Goñi Olague	\N	\N	\N	72623722A	1926-01-11	1991-03-01	296	F	Baja	\N	\N	\N	\N	2026-04-23 16:53:00.574	\N	Iraizotz	\N	2023-09-01	Fundadora	\N	ordinario	\N	\N	\N	\N
302	\N	M Teresa	Huarriz Oteiza	\N	\N	\N	15861655G	1937-03-10	1991-03-01	302	F	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.577	\N	Arraitz	\N	\N	Fundadora	\N	ordinario	\N	\N	\N	\N
310	\N	Kayo	Astiriz Huarriz	\N	\N	\N	15857207H	1936-07-22	1993-10-01	310	H	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.581	\N	Olague	\N	\N	Honorifica	\N	ordinario	\N	\N	\N	\N
317	\N	Rosario	Maquirriain Malaya	\N	\N	\N	15638046R	1936-10-08	1994-01-01	317	F	Baja	\N	\N	\N	\N	2026-04-23 16:53:00.585	\N	Gendulain	\N	\N	Honorifica	\N	ordinario	\N	\N	\N	\N
326	\N	Josefina	Apeztegia Gascue	\N	\N	\N	15705006P	1924-03-21	1994-07-01	326	F	Baja	\N	\N	\N	\N	2026-04-23 16:53:00.589	\N	Alkotz	\N	\N	Honorifica	\N	ordinario	\N	\N	\N	\N
333	\N	Enna Lucía	Iriberri Delfante	\N	\N	\N	15735499A	1929-03-29	1995-03-01	333	F	Baja	\N	\N	\N	\N	2026-04-23 16:53:00.593	\N	Gelbentzu	\N	\N	Honorifica	\N	ordinario	\N	\N	\N	\N
340	\N	Miguel	Oronoz Ibarra	\N	\N	\N	15861444T	1930-11-11	1995-07-20	340	H	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.596	\N	Eltso	\N	\N	Honorifica	\N	ordinario	\N	\N	\N	\N
347	\N	José M	Oyaregui Goñi	\N	\N	\N	15857094C	1930-07-30	1996-01-01	347	H	Baja	\N	\N	\N	\N	2026-04-23 16:53:00.599	\N	Lantz	\N	2021-11-11	Honorifica	\N	ordinario	\N	\N	\N	\N
351	\N	José	Ilarregui Aldareguia	\N	\N	\N	15657573R	1928-05-25	1996-01-01	351	H	Baja	\N	\N	\N	\N	2026-04-23 16:53:00.601	\N	Itsaso	\N	\N	Honorifica	\N	ordinario	\N	\N	\N	\N
359	\N	Escolástico	Satrustegui Oronoz	\N	\N	\N	15623030G	1929-02-22	1997-01-01	359	H	Baja	\N	\N	\N	\N	2026-04-23 16:53:00.606	\N	Gerendiain	\N	\N	Honorifica	\N	ordinario	\N	\N	\N	\N
369	\N	M Ascensión	Berasain Arribillaga	\N	\N	\N	33432284J	1932-05-05	1998-01-01	369	F	Baja	\N	\N	\N	\N	2026-04-23 16:53:00.611	\N	Auza	\N	\N	Honorifica	\N	ordinario	\N	\N	\N	\N
377	\N	Felipe	Mendioz Luquin	\N	\N	\N	15857287Y	1930-08-22	1999-01-01	377	H	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.616	\N	Ostitz	\N	\N	Honorifica	\N	ordinario	\N	\N	\N	\N
384	\N	Juana Josefa	Sasturain Alberro	\N	\N	\N	15657541S	1934-07-11	1999-01-01	384	F	Baja	\N	\N	\N	\N	2026-04-23 16:53:00.62	\N	Jauntsarats 	\N	2023-01-01	Honorifica	\N	ordinario	\N	\N	\N	\N
395	\N	Ceferina	Fontellas Campezo	\N	\N	\N	15632607J	1927-08-26	1999-09-23	395	F	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.627	\N	Eltso	\N	\N	Honorifica	\N	ordinario	\N	\N	\N	\N
402	\N	Margarita	Goñi Cía	\N	\N	\N	15702570X	1935-11-29	2000-03-20	402	F	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.631	\N	Itsaso	\N	\N	Honorifica	\N	ordinario	\N	\N	\N	\N
409	\N	Pascuala	Rodriguez Rodriguez	\N	\N	\N	73059790Z	1929-07-04	2000-09-12	409	F	Baja	\N	\N	\N	\N	2026-04-23 16:53:00.635	\N	Burlata	\N	\N	Honorifica	\N	ordinario	\N	\N	\N	\N
415	\N	M Teresa	Vicente Hernandez	\N	\N	\N	15688916H	1938-01-12	2001-01-01	415	F	Baja	\N	\N	\N	\N	2026-04-23 16:53:00.638	\N	Etulain	\N	\N	Honorifica	\N	ordinario	\N	\N	\N	\N
416	\N	Ana M	Sarasola Arregui	\N	\N	\N	15714870M	1935-05-12	2001-01-01	416	F	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.638	\N	Jauntsarats 	\N	\N	Honorifica	\N	ordinario	\N	\N	\N	\N
423	\N	Carmen	Huarritz Oteiza	\N	\N	\N	15861663N	1939-06-30	2003-01-01	423	F	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.643	\N	Arraitz	\N	\N	Honorifica	\N	ordinario	\N	\N	\N	\N
430	\N	M Victoria	Echenique Lacunza	\N	\N	\N	15861633M	1939-09-15	2003-01-01	430	F	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.646	\N	Burutain	\N	\N	Honorifica	\N	ordinario	\N	\N	\N	\N
439	\N	M Concepción	Zandio Jaunsaras	\N	\N	\N	72609708L	1940-09-15	2003-01-01	439	F	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.651	\N	Alkotz	\N	\N	Honorifica	\N	ordinario	\N	\N	\N	\N
446	\N	Urbana	Maisterrena Inda	\N	\N	\N	15862423J	1942-03-23	2003-01-01	446	F	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.655	\N	Eltzaburu	\N	\N	Numeraria	\N	ordinario	\N	\N	\N	\N
454	\N	Rosa M	Goñi Oyarzun	\N	\N	\N	72623734S	1946-06-12	2003-01-01	454	F	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.659	\N	Iraizotz	\N	\N	Numeraria	\N	ordinario	\N	\N	\N	\N
461	\N	José Luis	Echandi Lizaso	\N	\N	\N	15621678D	1931-12-15	2003-01-01	461	H	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.663	\N	Iraizotz	\N	2023-01-01	Honorifica	\N	ordinario	\N	\N	\N	\N
468	\N	Francisco	Mindeguia Irigoyen	\N	\N	\N	15862458W	1925-11-28	2004-01-01	468	H	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.666	\N	Gerendiain	\N	\N	Honorifica	\N	ordinario	\N	\N	\N	\N
477	\N	Mª Josefa	Goizueta  Elgorriaga	\N	\N	\N	72646332G	1948-08-28	2004-01-01	477	F	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.672	\N	Lantz	\N	\N	Numeraria	\N	ordinario	\N	\N	\N	\N
483	\N	Doroteo	Goldaraz Orrio	\N	\N	\N	15737727T	1943-04-09	2004-01-01	483	H	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.675	\N	Beuntza	\N	\N	Numeraria	\N	ordinario	\N	\N	\N	\N
486	\N	Pedro	Erviti Ibarrola	\N	\N	\N	15650593J	1932-06-29	2004-01-01	486	H	Baja	\N	\N	\N	\N	2026-04-23 16:53:00.676	\N	Beuntza	\N	\N	Honorifica	\N	ordinario	\N	\N	\N	\N
492	\N	Emilio	Cabeza Cabrero	\N	\N	\N	15734761R	1936-04-25	2004-01-01	492	H	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.68	\N	Berasain	\N	\N	Honorifica	\N	ordinario	\N	\N	\N	\N
498	\N	Silvina	Apeztegi  Alzorriz	\N	\N	\N	15628441X	1932-08-25	2004-01-01	498	F	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.683	\N	Eritze	\N	\N	Honorifica	\N	ordinario	\N	\N	\N	\N
506	\N	M Angeles 	Oyarzun Goñi	\N	\N	\N	72609842S	1943-05-30	2004-01-01	506	F	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.687	\N	Egillor	\N	\N	Numeraria	\N	ordinario	\N	\N	\N	\N
512	\N	M Concepción	Echeberria Oskoz	\N	\N	\N	15865526B	1948-03-01	2004-01-01	512	F	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.691	\N	Alkotz	\N	\N	Numeraria	\N	ordinario	\N	\N	\N	\N
521	\N	Bernardo	Echeberria Olague	\N	\N	\N	72645009S	1949-04-15	2005-01-01	521	H	Baja	\N	\N	\N	\N	2026-04-23 16:53:00.696	\N	Gelbentzu	\N	\N	Numeraria	\N	ordinario	\N	\N	\N	\N
527	\N	M. Angeles	Ilarregui Villanueva	\N	\N	\N	72617504H	1946-01-28	2005-01-01	527	F	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.698	\N	Arraitz	\N	\N	Numeraria	\N	ordinario	\N	\N	\N	\N
535	\N	Gregorio	Irurita Lekunberri	\N	\N	\N	15726229W	1940-11-05	2005-01-01	535	H	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.701	\N	Olague	\N	\N	Honorifica	\N	ordinario	\N	\N	\N	\N
542	\N	Martín	Buldáin Miqueo	\N	\N	\N	15771353T	1948-05-21	2005-01-01	542	H	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.704	\N	Beruete	\N	\N	Numeraria	\N	ordinario	\N	\N	\N	\N
549	\N	M Ines	Tornaría Echeverría	\N	\N	\N	72624627B	1944-12-28	2006-01-01	549	F	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.707	\N	Larraintzar	\N	\N	Numeraria	\N	ordinario	\N	\N	\N	\N
551	\N	Felix	Baraibar Ascobereta	\N	\N	\N	15721500B	1940-10-02	2006-01-01	551	H	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.708	\N	Arraitz	\N	\N	Honorifica	\N	ordinario	\N	\N	\N	\N
552	\N	M Josefa	Fernandez  Urrutia	\N	\N	\N	72637637A	1948-01-13	2006-01-01	552	F	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.709	\N	Arraitz	\N	\N	Numeraria	\N	ordinario	\N	\N	\N	\N
561	\N	Francisco M	Larrayoz Gerendiáin	\N	\N	\N	15861041B	1937-11-06	2006-01-01	561	H	Baja	\N	\N	\N	\N	2026-04-23 16:53:00.713	\N	Gerendiain	\N	\N	Honorifica	\N	ordinario	\N	\N	\N	\N
571	\N	Luis M Cruz	Gerendiáin Erice	\N	\N	\N	72646834T	1947-06-26	2007-01-01	571	H	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.718	\N	Berasain	\N	\N	Numeraria	\N	ordinario	\N	\N	\N	\N
579	\N	M Carmen	Osinaga Sala	\N	\N	\N	15790116H	1951-06-03	2007-01-01	579	F	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.722	\N	Beruete	\N	\N	Numeraria	\N	ordinario	\N	\N	\N	\N
586	\N	M Gloria	Elizalde Insausti	\N	\N	\N	15658106M	1939-04-04	2007-08-14	586	F	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.725	\N	Orokieta	\N	\N	Honorifica	\N	ordinario	\N	\N	\N	\N
593	\N	M Gloria	Irigoyen Mariñelarena	\N	\N	\N	72623724M	1934-03-26	2008-01-16	593	F	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.728	\N	Iraizotz	\N	\N	Honorifica	\N	ordinario	\N	\N	\N	\N
602	\N	Juan Martín	Santesteban Echeto	\N	\N	\N	72618191S	1941-03-22	2008-01-22	602	H	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.733	\N	Etsain	\N	\N	Numeraria	\N	ordinario	\N	\N	\N	\N
609	\N	M Josefa	Gurbindo Garbisu	\N	\N	\N	72618882Q	1943-05-22	2008-03-06	609	F	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.736	\N	Olague	\N	\N	Numeraria	\N	ordinario	\N	\N	\N	\N
616	\N	M Rosa 	Teresa Rice	\N	\N	\N	303701916A	1942-10-09	2008-04-21	616	F	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.74	\N	Lizaso	\N	\N	Numeraria	\N	ordinario	\N	\N	\N	\N
625	\N	Vicenta	Okiñena Ros	\N	\N	\N	72617661Z	1932-12-12	2008-11-01	625	F	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.745	\N	Oskotz	\N	\N	Honorifica	\N	ordinario	\N	\N	\N	\N
632	\N	M Reyes Jesús	Olague Ollobarren	\N	\N	\N	15806330V	1956-01-04	2008-11-01	632	F	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.748	\N	Lantz	\N	\N	Numeraria	\N	ordinario	\N	\N	\N	\N
633	\N	M Lourdes	Eugui Arraiza				15769982D	1949-02-09	2004-01-01	633	F	activo	\N	\N	\N	\N	2026-04-23 16:53:00.749	\N	Iraizotz	Nafarroa	\N	directiva	\N	ordinario	\N	\N	\N	\N
642	\N	Juan M 	Iraola Azparren	\N	\N	\N	15744750P	1945-01-28	2009-01-20	642	H	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.754	\N	Arraitz	\N	\N	Numeraria	\N	ordinario	\N	\N	\N	\N
649	\N	Luis Miguel	Asurmendi Aguirre	\N	\N	\N	15761840D	1948-10-01	2009-01-01	649	H	Baja	\N	\N	\N	\N	2026-04-23 16:53:00.758	\N	Beuntza	\N	\N	Numeraria	\N	ordinario	\N	\N	\N	\N
657	\N	Benita	García Alvarez	\N	\N	\N	15781672S	1952-03-21	2022-03-03	657	F	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.761	\N	Olague	\N	\N	Numeraria	\N	ordinario	\N	\N	\N	\N
665	\N	M Begoña	Ciganda Tornaría	\N	\N	\N	72645387W	1948-01-15	2009-01-01	665	F	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.765	\N	Eltzaburu	\N	\N	Numeraria	\N	ordinario	\N	\N	\N	\N
673	\N	Ana M	Zunzarren Baigorri	\N	\N	\N	15766860S	1950-03-01	2010-01-01	673	F	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.769	\N	Eltzaburu	\N	\N	Numeraria	\N	ordinario	\N	\N	\N	\N
679	\N	M Carmen	Gorostieta Irigoyen	\N	\N	\N	72618463B	1945-05-10	2011-02-04	679	F	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.773	\N	Iraizotz	\N	\N	Numeraria	\N	ordinario	\N	\N	\N	\N
687	\N	M Dolores	Balda Erviti	\N	\N	\N	\N	1934-06-01	2012-02-08	687	F	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.777	\N	Alkotz	\N	\N	Honorifica	\N	ordinario	\N	\N	\N	\N
692	\N	Vicente	Martinez 	\N	\N	\N	\N	1939-12-13	1991-01-01	692	H	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.779	\N	Ihaben	\N	\N	Honorifica	\N	ordinario	\N	\N	\N	\N
698	\N	Pedro	Espinal Moreno	\N	\N	\N	15732695M	1942-06-27	2012-03-16	698	H	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.782	\N	Alkotz	\N	1921-11-08	Numeraria	\N	ordinario	\N	\N	\N	\N
706	\N	José	Olague Oskoz	\N	\N	\N	15861777B	1929-07-22	2012-09-01	706	H	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.785	\N	Alkotz	\N	2014-06-20	Honorifica	\N	ordinario	\N	\N	\N	\N
714	\N	Angel M	Marticorena Lasarte	\N	\N	\N	15857080Y	1935-08-17	2013-01-22	714	H	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.789	\N	Lantz	\N	\N	Honorifica	\N	ordinario	\N	\N	\N	\N
721	\N	Ignacio	Oyarzun Olasagarre	\N	\N	\N	15650630G	1939-01-17	2013-02-06	721	H	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.792	\N	Egillor	\N	\N	Honorifica	\N	ordinario	\N	\N	\N	\N
729	\N	Juan	Juvera Irurita	\N	\N	\N	72614518E	1946-02-07	2013-02-06	729	H	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.796	\N	Ostitz	\N	\N	Numeraria	\N	ordinario	\N	\N	\N	\N
737	\N	M Josefa	Esain Garro	\N	\N	\N	72622455R	1949-03-17	2014-01-31	737	F	Baja	\N	\N	\N	\N	2026-04-23 16:53:00.8	\N	Eltzaburu	\N	\N	Numeraria	\N	ordinario	\N	\N	\N	\N
745	\N	M Jesús	Iriarte Labalde	\N	\N	\N	15750864G	1946-01-27	2014-06-24	745	F	Baja	\N	\N	\N	\N	2026-04-23 16:53:00.804	\N	Olague	\N	\N	Numeraria	\N	ordinario	\N	\N	\N	\N
752	\N	M Carmen	Irure Etuláin	\N	\N	\N	15787048D	1953-11-16	2014-09-10	752	F	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.808	\N	Gelbentzu	\N	\N	Numeraria	\N	ordinario	\N	\N	\N	\N
763	\N	Tomás	Ezcurra Barberena	\N	\N	\N	15695513Z	1934-01-21	2015-01-30	763	H	Baja	\N	\N	\N	\N	2026-04-23 16:53:00.814	\N	Arrarats	\N	\N	Honorifica	\N	ordinario	\N	\N	\N	\N
769	\N	Luis Francisco	Barbudo Gutierrez	\N	\N	\N	12693772A	1950-08-25	2015-04-01	769	H	Baja	\N	\N	\N	\N	2026-04-23 16:53:00.82	\N	Olague	\N	\N	Numeraria	\N	ordinario	\N	\N	\N	\N
778	\N	Silvestre	Huarte Villn¡anueva	\N	\N	\N	15858305N	1936-07-05	2016-01-28	778	H	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.825	\N	Igoa	\N	\N	Honorifica	\N	ordinario	\N	\N	\N	\N
787	\N	Antonio	Villabona Balda	\N	\N	\N	15624506P	1921-07-27	1991-03-01	787	H	Baja	\N	\N	\N	\N	2026-04-23 16:53:00.829	\N	Iraizotz	\N	\N	Honorifica	\N	ordinario	\N	\N	\N	\N
794	\N	Miguel	Elizondo Beruete	\N	\N	\N	15860903B	1928-01-18	1991-03-01	794	H	Baja	\N	\N	\N	\N	2026-04-23 16:53:00.832	\N	Lizaso	\N	\N	Honorifica	\N	ordinario	\N	\N	\N	\N
801	\N	Antonio	García Benitez	\N	\N	\N	8662472M	1947-02-19	2016-05-01	801	H	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.836	\N	Berasain	\N	2018-09-01	Numeraria	\N	ordinario	\N	\N	\N	\N
810	\N	M. Jesús	Arano Hualde	\N	\N	\N	72656071Z	1951-11-11	2017-02-10	810	F	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.84	\N	Aizarotz	\N	\N	Numeraria	\N	ordinario	\N	\N	\N	\N
817	\N	Margarita 	Urriza Ayerdi	\N	\N	\N	15803332D	1956-01-03	2018-02-02	817	F	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.843	\N	Lizaso	\N	\N	Numeraria	\N	ordinario	\N	\N	\N	\N
823	\N	M. Petra	Villanueva Ilundáin	\N	\N	\N	15730393A	1940-08-07	2018-05-05	823	F	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.846	\N	Beuntza	\N	\N	Honorifica	\N	ordinario	\N	\N	\N	\N
828	\N	M. Esther	Barberena Tellechea	\N	\N	\N	15933219S	1958-10-04	2019-01-31	828	F	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.848	\N	Beruete	\N	\N	Numeraria	\N	ordinario	\N	\N	\N	\N
835	\N	M. José	Mariñelarena Cía	\N	\N	\N	18204126V	1964-05-13	2019-04-03	835	F	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.851	\N	Itsaso	\N	\N	Numeraria	\N	ordinario	\N	\N	\N	\N
844	\N	Juan Fermín	Ibero Baraibar	\N	\N	\N	15799031D	1954-01-15	2019-10-01	844	H	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.855	\N	Ziganda	\N	\N	Numeraria	\N	ordinario	\N	\N	\N	\N
851	\N	Jesús M 	Jaunarena Ezcurra	\N	\N	\N	15801560P	1954-04-19	2020-01-31	851	H	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.859	\N	Gartzaron	\N	\N	Numeraria	\N	ordinario	\N	\N	\N	\N
859	\N	M Pilar	Abadiano Abadiano	\N	\N	\N	15765094C	1947-10-10	2022-03-03	859	F	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.862	\N	Eltso	\N	\N	Numeraria	\N	ordinario	\N	\N	\N	\N
867	\N	José Miguel	Loidi Goñi	\N	\N	\N	15810118X	1956-07-18	2022-03-18	867	H	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.866	\N	Udabe	\N	\N	Numeraria	\N	ordinario	\N	\N	\N	\N
874	\N	M.José	Ancizu Elizondo	\N	\N	\N	15836522X	1959-06-03	2022-06-15	874	F	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.869	\N	Lizaso	\N	\N	Numeraria	\N	ordinario	\N	\N	\N	\N
882	\N	Conchita	García Alvarez	\N	\N	\N	10588672R	1958-09-11	2022-09-19	882	F	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.873	\N	Gerendiain	\N	\N	Numeraria	\N	ordinario	\N	\N	\N	\N
889	\N	José Javier	Barbajero Diez	\N	\N	\N	15840594B	1960-05-16	2023-03-01	889	H	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.877	\N	Jauntsarats 	\N	\N	Numeraria	\N	ordinario	\N	\N	\N	\N
894	\N	José	Ciganda Ibarrola	\N	\N	\N	15730505T	1939-01-01	2023-03-01	894	H	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.88	\N	Beuntza	\N	\N	Honorifica	\N	ordinario	\N	\N	\N	\N
900	\N	M Rosario	Astiz Landiribar	\N	\N	\N	15770567L	1949-10-07	2023-03-01	900	F	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.882	\N	Etxaleku	\N	\N	Numeraria	\N	ordinario	\N	\N	\N	\N
909	\N	M Soledad Margarita	Irurita Goñi	\N	\N	\N	73462909N	1951-07-20	2023-05-01	909	F	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.886	\N	Alkotz	\N	\N	Numeraria	\N	ordinario	\N	\N	\N	\N
916	\N	Mª Angeles	Beunza Larumbe	\N	\N	\N	15805884P	1954-02-26	2023-08-01	916	F	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.889	\N	Igoa	\N	\N	Numeraria	\N	ordinario	\N	\N	\N	\N
924	\N	Martin Mª 	Etxarri Etxegia	\N	\N	\N	15845782R	1961-06-13	2023-09-01	924	H	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.893	\N	Beruete	\N	\N	Numeraria	\N	ordinario	\N	\N	\N	\N
931	\N	Mª Jesus 	San Martin Egozcue	\N	\N	\N	18195769D	1962-10-25	2024-01-01	931	F	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.896	\N	Latasa	\N	\N	Numeraria	\N	ordinario	\N	\N	\N	\N
940	\N	Asensio	Arano Lasarte	\N	\N	\N	15839853Y	1959-10-03	2024-01-01	940	H	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.9	\N	Igoa	\N	\N	Numeraria	\N	ordinario	\N	\N	\N	\N
946	\N	Esther	Garijo Madoz	\N	\N	\N	15832042S	1958-11-14	2024-01-01	946	F	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.903	\N	Beruete	\N	\N	Numeraria	\N	ordinario	\N	\N	\N	\N
953	\N	Mª Asunción	Cires Blanco	\N	\N	\N	72121160Z	1959-04-24	2024-04-01	953	F	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.906	\N	Eltso	\N	\N	Numeraria	\N	ordinario	\N	\N	\N	\N
967	\N	Jesús Mª	Larretxea Lazcano	\N	\N	\N	72661039Z	1957-09-30	2025-03-01	967	H	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.913	\N	Iraizotz	\N	\N	Numeraria	\N	ordinario	\N	\N	\N	\N
977	\N	Jose Maria	Ibero Baraibar	\N	\N	\N	15830358X	1957-01-22	2025-09-01	977	H	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.918	\N	Ciganda	\N	\N	Numeraria	\N	ordinario	\N	\N	\N	\N
984	\N	Inmaculada	Fernandez  Vicuña	\N	\N	\N	15809830K	1957-12-08	2026-01-01	984	F	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.925	\N	Beramendi	\N	\N	Numeraria	\N	ordinario	\N	\N	\N	\N
992	\N	Lourdes	Munarriz Larrion	\N	\N	\N	15842345Z	1958-05-18	2026-01-01	992	F	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.93	\N	Ihaben	\N	\N	Numeraria	\N	ordinario	\N	\N	\N	\N
999	\N	Jesus Gaspar	Oscoz Oricain	\N	\N	\N	15842011W	1960-03-20	2026-01-01	999	H	Activo	\N	\N	\N	\N	2026-04-23 16:53:00.933	\N	Garzaron	\N	\N	Numeraria	\N	ordinario	\N	\N	\N	\N
922	\N	Enrique	Oscoz Amatriain				15830370E	1958-06-28	2023-09-01	922	H	activo	\N	\N	\N	\N	2026-04-23 16:59:52.899	\N	Lantz	Nafarroa	\N	directiva	\N	ordinario	\N	\N	\N	\N
891	\N	Violeta	Tarazaga Boudón				38044664L	1951-05-15	2023-03-01	891	F	activo	\N	\N	\N	\N	2026-04-23 17:02:31.912	\N	Ziaurritz	Nafarroa	\N	directiva	\N	ordinario	\N	\N	\N	\N
809	\N	Benito	Alberro Goñi	balberro@gmail.com	665731600		15789483Y	1954-05-20	2017-02-10	809	H	activo	\N	\N	\N	\N	2026-04-23 16:53:00.839	\N	Aizarotz	Nafarroa	\N	directiva	1	ordinario	\N	\N	\N	\N
1006	116	Ayuntamiento de Ultzama	\N	ayuntamiento@ultzama.es	948305115	San Pedro, 8	P3123600C	\N	\N	\N	\N	activo	\N	\N	2026-04-27 12:31:05.155	2026-04-27 14:24:38.855786	2026-04-27 12:31:05.157	\N	Larraintzar	Navarra (Nafarroa) (ES)	\N	numeraria	\N	ordinario	\N	\N	\N	0.00
\.


--
-- Data for Name: db_sugerencias; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.db_sugerencias (id, socio_id, categoria, texto, estado, respuesta, fecha_respuesta, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: db_sync_log; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.db_sync_log (id, modelo, operacion, registros_procesados, errores, mensaje, created_at) FROM stdin;
\.


--
-- Data for Name: db_users; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.db_users (id, odoo_uid, socio_id, username, nombre, email, rol, avatar_url, ultimo_acceso, created_at, updated_at, apellidos, telefono, password_hash) FROM stdin;
3	-1945535336	\N	usuario31	Usuario	usuario@denokbat.com	usuario		\N	\N	2026-04-27 08:48:01.448772	de pagina	665544332	af00faf682fd818a17de9cb175b3ca5d0e3db26b8ad92c6d3b899d97f740171f
1	-809	809	socio_809	Benito	\N	administrador	\N	\N	2026-04-21 14:46:09.229627	2026-04-27 09:25:29.127832	\N	\N	9ce73d4867c5f1a2b63f9b86d64d440e0190c54996b4c6a9452129b861d4cc37
4	-678995177	\N	bazkide31	socio De la Página	socio@denokbat.com	socio	\N	\N	\N	2026-04-28 14:41:35.180157	De la Página	662233445	c7fc8627da2b2d3c68ec2dc7d4fe93298f4c40e3a04d5a7eb5d6b28d4c9ff2f2
\.


--
-- Data for Name: db_viajes; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.db_viajes (id, nombre, nombre_eu, descripcion, descripcion_eu, destinos, fecha_inicio, fecha_fin, alojamiento, precio, plazas_total, plazas_disponibles, estado, foto_urls, memoria, created_at, updated_at, foto_url, precio_inscripcion, precio_suplemento, fecha_fin_inscripcion, bus1, bus2, publicado, observaciones, memoria_participantes, resumen, itinerario) FROM stdin;
1	Galicia: Rías Bajas y Santiago	Galizia: Rias Baixas eta Santiago	Viaje de 5 días por las Rías Bajas gallegas y visita a Santiago de Compostela	5 eguneko bidaia Galiziar Rias Baixetatik eta Santiagora bisita	Vigo, Cambados, Pontevedra, Santiago de Compostela	2026-09-15	2026-09-19	Hotel Parador de Santiago (4*)	450.00	40	28	proximo	\N	\N	2026-03-30 06:56:55.738037	2026-03-30 06:56:55.738037	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	\N
2	Cantabria: Picos de Europa	Kantabria: Europako Mendilerroa	Escapada de 4 días por Santander, Picos de Europa y la Cueva de Altamira	4 eguneko ihesa Santander, Europako Mendilerroa eta Altamirako kobazulotik	Santander, Potes, Altamira, Comillas	2026-10-08	2026-10-11	Hotel Picos de Europa (3*)	320.00	35	35	previsto	\N	\N	2026-03-30 06:56:55.738037	2026-03-30 06:56:55.738037	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	\N
3	Portugal: Oporto y el Duero	Portugal: Porto eta Duero	Viaje de 5 días por Oporto y la región vinícola del Duero	5 eguneko bidaia Porto eta Duero mahats-ardo eskualdetik	Oporto, Valle del Duero, Guimarães	2026-06-02	2026-06-06	Hotel Infante de Sagres (4*)	490.00	38	0	realizado	\N	\N	2026-03-30 06:56:55.738037	2026-03-30 06:56:55.738037	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	\N
4	Portugal: Lisboa y Óbidos	Portugal: Lisboa eta Óbidos	Viaje cultural de 5 días por las joyas de Portugal.	\N	Lisboa, Óbidos, Sintra	2026-09-14	2026-09-18	\N	0.00	40	40	previsto	\N	\N	2026-03-30 10:39:22.914085	2026-03-30 10:39:22.914085	\N	380.00	\N	\N	\N	\N	t	\N	\N	\N	\N
5	Extremadura	Extremadura	\N	\N	Badajoz	2026-05-04	2026-05-09		0.00	0	0	previsto	\N	\N	2026-04-07 13:49:43.018375	2026-04-07 11:52:59.83		865.00	\N	\N			t	\N	\N	\N	
\.


--
-- Data for Name: db_viajes_dias; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.db_viajes_dias (id, viaje_id, dia, titulo, titulo_eu, descripcion, foto_url, memoria, created_at, updated_at) FROM stdin;
\.


--
-- Name: db_actividad_detalle_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.db_actividad_detalle_id_seq', 5, true);


--
-- Name: db_actividades_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.db_actividades_id_seq', 19, true);


--
-- Name: db_articulos_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.db_articulos_id_seq', 2, true);


--
-- Name: db_cargos_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.db_cargos_id_seq', 1351, true);


--
-- Name: db_equipo_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.db_equipo_id_seq', 9, true);


--
-- Name: db_eventos_fotos_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.db_eventos_fotos_id_seq', 1, false);


--
-- Name: db_eventos_full_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.db_eventos_full_id_seq', 4, true);


--
-- Name: db_eventos_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.db_eventos_id_seq', 8, true);


--
-- Name: db_eventos_media_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.db_eventos_media_id_seq', 1, false);


--
-- Name: db_eventos_subacts_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.db_eventos_subacts_id_seq', 4, true);


--
-- Name: db_excursiones_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.db_excursiones_id_seq', 9, true);


--
-- Name: db_excursiones_subacts_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.db_excursiones_subacts_id_seq', 4, true);


--
-- Name: db_fiestas_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.db_fiestas_id_seq', 5, true);


--
-- Name: db_galeria_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.db_galeria_id_seq', 48, true);


--
-- Name: db_grupos_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.db_grupos_id_seq', 1, false);


--
-- Name: db_historico_cargos_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.db_historico_cargos_id_seq', 16, true);


--
-- Name: db_hojas_informativas_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.db_hojas_informativas_id_seq', 5, true);


--
-- Name: db_inscripciones_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.db_inscripciones_id_seq', 14, true);


--
-- Name: db_nosotros_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.db_nosotros_id_seq', 1, false);


--
-- Name: db_noticias_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.db_noticias_id_seq', 2, true);


--
-- Name: db_pagos_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.db_pagos_id_seq', 9, true);


--
-- Name: db_pulunpe_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.db_pulunpe_id_seq', 4, true);


--
-- Name: db_socios_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.db_socios_id_seq', 1006, true);


--
-- Name: db_sugerencias_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.db_sugerencias_id_seq', 1, false);


--
-- Name: db_sync_log_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.db_sync_log_id_seq', 1, false);


--
-- Name: db_users_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.db_users_id_seq', 4, true);


--
-- Name: db_viajes_dias_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.db_viajes_dias_id_seq', 1, false);


--
-- Name: db_viajes_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.db_viajes_id_seq', 5, true);


--
-- Name: db_actividad_detalle db_actividad_detalle_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.db_actividad_detalle
    ADD CONSTRAINT db_actividad_detalle_pkey PRIMARY KEY (id);


--
-- Name: db_actividad_detalle db_actividad_detalle_slug_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.db_actividad_detalle
    ADD CONSTRAINT db_actividad_detalle_slug_key UNIQUE (slug);


--
-- Name: db_actividades db_actividades_odoo_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.db_actividades
    ADD CONSTRAINT db_actividades_odoo_id_key UNIQUE (odoo_id);


--
-- Name: db_actividades db_actividades_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.db_actividades
    ADD CONSTRAINT db_actividades_pkey PRIMARY KEY (id);


--
-- Name: db_articulos db_articulos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.db_articulos
    ADD CONSTRAINT db_articulos_pkey PRIMARY KEY (id);


--
-- Name: db_cargos db_cargos_codigo_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.db_cargos
    ADD CONSTRAINT db_cargos_codigo_key UNIQUE (codigo);


--
-- Name: db_cargos db_cargos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.db_cargos
    ADD CONSTRAINT db_cargos_pkey PRIMARY KEY (id);


--
-- Name: db_config db_config_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.db_config
    ADD CONSTRAINT db_config_pkey PRIMARY KEY (clave);


--
-- Name: db_equipo db_equipo_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.db_equipo
    ADD CONSTRAINT db_equipo_pkey PRIMARY KEY (id);


--
-- Name: db_eventos_fotos db_eventos_fotos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.db_eventos_fotos
    ADD CONSTRAINT db_eventos_fotos_pkey PRIMARY KEY (id);


--
-- Name: db_eventos_full db_eventos_full_odoo_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.db_eventos_full
    ADD CONSTRAINT db_eventos_full_odoo_id_key UNIQUE (odoo_id);


--
-- Name: db_eventos_full db_eventos_full_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.db_eventos_full
    ADD CONSTRAINT db_eventos_full_pkey PRIMARY KEY (id);


--
-- Name: db_eventos_media db_eventos_media_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.db_eventos_media
    ADD CONSTRAINT db_eventos_media_pkey PRIMARY KEY (id);


--
-- Name: db_eventos db_eventos_odoo_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.db_eventos
    ADD CONSTRAINT db_eventos_odoo_id_key UNIQUE (odoo_id);


--
-- Name: db_eventos db_eventos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.db_eventos
    ADD CONSTRAINT db_eventos_pkey PRIMARY KEY (id);


--
-- Name: db_eventos_subacts db_eventos_subacts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.db_eventos_subacts
    ADD CONSTRAINT db_eventos_subacts_pkey PRIMARY KEY (id);


--
-- Name: db_excursiones db_excursiones_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.db_excursiones
    ADD CONSTRAINT db_excursiones_pkey PRIMARY KEY (id);


--
-- Name: db_excursiones_subacts db_excursiones_subacts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.db_excursiones_subacts
    ADD CONSTRAINT db_excursiones_subacts_pkey PRIMARY KEY (id);


--
-- Name: db_fiestas db_fiestas_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.db_fiestas
    ADD CONSTRAINT db_fiestas_pkey PRIMARY KEY (id);


--
-- Name: db_galeria db_galeria_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.db_galeria
    ADD CONSTRAINT db_galeria_pkey PRIMARY KEY (id);


--
-- Name: db_grupos db_grupos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.db_grupos
    ADD CONSTRAINT db_grupos_pkey PRIMARY KEY (id);


--
-- Name: db_historico_cargos db_historico_cargos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.db_historico_cargos
    ADD CONSTRAINT db_historico_cargos_pkey PRIMARY KEY (id);


--
-- Name: db_hojas_informativas db_hojas_informativas_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.db_hojas_informativas
    ADD CONSTRAINT db_hojas_informativas_pkey PRIMARY KEY (id);


--
-- Name: db_inscripciones db_inscripciones_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.db_inscripciones
    ADD CONSTRAINT db_inscripciones_pkey PRIMARY KEY (id);


--
-- Name: db_nosotros db_nosotros_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.db_nosotros
    ADD CONSTRAINT db_nosotros_pkey PRIMARY KEY (id);


--
-- Name: db_noticias db_noticias_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.db_noticias
    ADD CONSTRAINT db_noticias_pkey PRIMARY KEY (id);


--
-- Name: db_pagos db_pagos_odoo_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.db_pagos
    ADD CONSTRAINT db_pagos_odoo_id_key UNIQUE (odoo_id);


--
-- Name: db_pagos db_pagos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.db_pagos
    ADD CONSTRAINT db_pagos_pkey PRIMARY KEY (id);


--
-- Name: db_pulunpe db_pulunpe_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.db_pulunpe
    ADD CONSTRAINT db_pulunpe_pkey PRIMARY KEY (id);


--
-- Name: db_socios db_socios_odoo_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.db_socios
    ADD CONSTRAINT db_socios_odoo_id_key UNIQUE (odoo_id);


--
-- Name: db_socios db_socios_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.db_socios
    ADD CONSTRAINT db_socios_pkey PRIMARY KEY (id);


--
-- Name: db_sugerencias db_sugerencias_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.db_sugerencias
    ADD CONSTRAINT db_sugerencias_pkey PRIMARY KEY (id);


--
-- Name: db_sync_log db_sync_log_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.db_sync_log
    ADD CONSTRAINT db_sync_log_pkey PRIMARY KEY (id);


--
-- Name: db_users db_users_odoo_uid_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.db_users
    ADD CONSTRAINT db_users_odoo_uid_key UNIQUE (odoo_uid);


--
-- Name: db_users db_users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.db_users
    ADD CONSTRAINT db_users_pkey PRIMARY KEY (id);


--
-- Name: db_viajes_dias db_viajes_dias_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.db_viajes_dias
    ADD CONSTRAINT db_viajes_dias_pkey PRIMARY KEY (id);


--
-- Name: db_viajes db_viajes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.db_viajes
    ADD CONSTRAINT db_viajes_pkey PRIMARY KEY (id);


--
-- Name: db_socios_usuario_id_unique_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX db_socios_usuario_id_unique_idx ON public.db_socios USING btree (usuario_id) WHERE (usuario_id IS NOT NULL);


--
-- Name: db_users_username_unique_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX db_users_username_unique_idx ON public.db_users USING btree (username);


--
-- Name: idx_db_cargos_activo; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_db_cargos_activo ON public.db_cargos USING btree (activo);


--
-- Name: idx_db_cargos_ambito; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_db_cargos_ambito ON public.db_cargos USING btree (ambito);


--
-- Name: idx_db_historico_cargos_cargo_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_db_historico_cargos_cargo_id ON public.db_historico_cargos USING btree (cargo_id);


--
-- Name: idx_db_historico_cargos_fecha_fin; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_db_historico_cargos_fecha_fin ON public.db_historico_cargos USING btree (fecha_fin);


--
-- Name: idx_db_historico_cargos_fecha_inicio; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_db_historico_cargos_fecha_inicio ON public.db_historico_cargos USING btree (fecha_inicio);


--
-- Name: idx_db_historico_cargos_socio_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_db_historico_cargos_socio_id ON public.db_historico_cargos USING btree (socio_id);


--
-- Name: idx_hojas_informativas_anio_mes_dia; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_hojas_informativas_anio_mes_dia ON public.db_hojas_informativas USING btree (anio DESC, mes DESC, dia DESC);


--
-- Name: idx_hojas_informativas_titulo; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_hojas_informativas_titulo ON public.db_hojas_informativas USING btree (titulo);


--
-- Name: db_hojas_informativas trg_set_updated_at_db_hojas_informativas; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_set_updated_at_db_hojas_informativas BEFORE UPDATE ON public.db_hojas_informativas FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_db_hojas_informativas();


--
-- Name: db_actividad_detalle db_actividad_detalle_actividad_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.db_actividad_detalle
    ADD CONSTRAINT db_actividad_detalle_actividad_id_fkey FOREIGN KEY (actividad_id) REFERENCES public.db_actividades(id);


--
-- Name: db_eventos_media db_eventos_media_evento_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.db_eventos_media
    ADD CONSTRAINT db_eventos_media_evento_id_fkey FOREIGN KEY (evento_id) REFERENCES public.db_eventos_full(id) ON DELETE CASCADE;


--
-- Name: db_eventos_media db_eventos_media_subact_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.db_eventos_media
    ADD CONSTRAINT db_eventos_media_subact_id_fkey FOREIGN KEY (subact_id) REFERENCES public.db_eventos_subacts(id) ON DELETE CASCADE;


--
-- Name: db_eventos_subacts db_eventos_subacts_evento_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.db_eventos_subacts
    ADD CONSTRAINT db_eventos_subacts_evento_id_fkey FOREIGN KEY (evento_id) REFERENCES public.db_eventos_full(id) ON DELETE CASCADE;


--
-- Name: db_excursiones_subacts db_excursiones_subacts_excursion_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.db_excursiones_subacts
    ADD CONSTRAINT db_excursiones_subacts_excursion_id_fkey FOREIGN KEY (excursion_id) REFERENCES public.db_excursiones(id) ON DELETE CASCADE;


--
-- Name: db_grupos db_grupos_delegado_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.db_grupos
    ADD CONSTRAINT db_grupos_delegado_id_fkey FOREIGN KEY (delegado_id) REFERENCES public.db_users(id);


--
-- Name: db_historico_cargos db_historico_cargos_cargo_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.db_historico_cargos
    ADD CONSTRAINT db_historico_cargos_cargo_fk FOREIGN KEY (cargo_id) REFERENCES public.db_cargos(id) ON DELETE CASCADE;


--
-- Name: db_inscripciones db_inscripciones_actividad_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.db_inscripciones
    ADD CONSTRAINT db_inscripciones_actividad_id_fkey FOREIGN KEY (actividad_id) REFERENCES public.db_actividades(id);


--
-- Name: db_inscripciones db_inscripciones_evento_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.db_inscripciones
    ADD CONSTRAINT db_inscripciones_evento_id_fkey FOREIGN KEY (evento_id) REFERENCES public.db_eventos(id);


--
-- Name: db_inscripciones db_inscripciones_socio_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.db_inscripciones
    ADD CONSTRAINT db_inscripciones_socio_id_fkey FOREIGN KEY (socio_id) REFERENCES public.db_socios(id);


--
-- Name: db_pagos db_pagos_inscripcion_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.db_pagos
    ADD CONSTRAINT db_pagos_inscripcion_id_fkey FOREIGN KEY (inscripcion_id) REFERENCES public.db_inscripciones(id);


--
-- Name: db_pagos db_pagos_socio_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.db_pagos
    ADD CONSTRAINT db_pagos_socio_id_fkey FOREIGN KEY (socio_id) REFERENCES public.db_socios(id);


--
-- Name: db_socios db_socios_grupo_id_fk_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.db_socios
    ADD CONSTRAINT db_socios_grupo_id_fk_fkey FOREIGN KEY (grupo_id_fk) REFERENCES public.db_grupos(id);


--
-- Name: db_socios db_socios_usuario_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.db_socios
    ADD CONSTRAINT db_socios_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES public.db_users(id) ON DELETE SET NULL;


--
-- Name: db_sugerencias db_sugerencias_socio_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.db_sugerencias
    ADD CONSTRAINT db_sugerencias_socio_id_fkey FOREIGN KEY (socio_id) REFERENCES public.db_socios(id);


--
-- Name: db_users db_users_socio_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.db_users
    ADD CONSTRAINT db_users_socio_id_fkey FOREIGN KEY (socio_id) REFERENCES public.db_socios(id);


--
-- Name: db_viajes_dias db_viajes_dias_viaje_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.db_viajes_dias
    ADD CONSTRAINT db_viajes_dias_viaje_id_fkey FOREIGN KEY (viaje_id) REFERENCES public.db_viajes(id) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

\unrestrict noOIMXRMwLF2vY0S0shG0saATvdXbPJmuglc9xGtQK13gN0YnNfOJV1b1R1MWWC

