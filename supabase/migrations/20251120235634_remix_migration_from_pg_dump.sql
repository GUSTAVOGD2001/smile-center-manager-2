--
-- PostgreSQL database dump
--


-- Dumped from database version 17.6
-- Dumped by pg_dump version 17.7

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



--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


SET default_table_access_method = heap;

--
-- Name: events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.events (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    title text NOT NULL,
    date date NOT NULL,
    is_important boolean DEFAULT false NOT NULL,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    is_recurring boolean DEFAULT false NOT NULL,
    recurring_day integer,
    CONSTRAINT recurring_day_check CHECK (((recurring_day IS NULL) OR ((recurring_day >= 1) AND (recurring_day <= 31))))
);


--
-- Name: events events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.events
    ADD CONSTRAINT events_pkey PRIMARY KEY (id);


--
-- Name: events update_events_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_events_updated_at BEFORE UPDATE ON public.events FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: events Admin users can create events; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admin users can create events" ON public.events FOR INSERT WITH CHECK (true);


--
-- Name: events Admin users can delete events; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admin users can delete events" ON public.events FOR DELETE USING (true);


--
-- Name: events Admin users can update events; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admin users can update events" ON public.events FOR UPDATE USING (true);


--
-- Name: events Admin users can view all events; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admin users can view all events" ON public.events FOR SELECT USING (true);


--
-- Name: events; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

--
-- PostgreSQL database dump complete
--


