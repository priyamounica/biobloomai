-- Enum
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');

-- user_roles
CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- has_role
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

-- Policies for user_roles
CREATE POLICY "Users view own roles" ON public.user_roles
  FOR SELECT USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins insert roles" ON public.user_roles
  FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins update roles" ON public.user_roles
  FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins delete roles" ON public.user_roles
  FOR DELETE USING (public.has_role(auth.uid(), 'admin'));

-- Admin policies for profiles
CREATE POLICY "Admins view all profiles" ON public.profiles
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins update all profiles" ON public.profiles
  FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins delete profiles" ON public.profiles
  FOR DELETE USING (public.has_role(auth.uid(), 'admin'));

-- ai_logs
CREATE TABLE public.ai_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  kind text NOT NULL,
  model text NOT NULL,
  input_preview text,
  output_preview text,
  status text NOT NULL DEFAULT 'ok',
  error text,
  flagged boolean NOT NULL DEFAULT false,
  flag_reason text,
  tokens_in int,
  tokens_out int,
  duration_ms int,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.ai_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins view ai_logs" ON public.ai_logs
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins update ai_logs" ON public.ai_logs
  FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins delete ai_logs" ON public.ai_logs
  FOR DELETE USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX idx_ai_logs_created_at ON public.ai_logs (created_at DESC);
CREATE INDEX idx_ai_logs_flagged ON public.ai_logs (flagged) WHERE flagged = true;
CREATE INDEX idx_user_roles_user ON public.user_roles (user_id);