
-- labs
CREATE TABLE public.labs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  value TEXT NOT NULL,
  unit TEXT,
  ref_range TEXT,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_labs_user_date ON public.labs(user_id, date DESC);
ALTER TABLE public.labs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users select own labs" ON public.labs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own labs" ON public.labs FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own labs" ON public.labs FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users delete own labs" ON public.labs FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Admins all labs" ON public.labs FOR ALL USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE TRIGGER labs_updated_at BEFORE UPDATE ON public.labs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- medications
CREATE TABLE public.medications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  dosage TEXT,
  frequency TEXT,
  times_of_day TEXT[] DEFAULT '{}',
  start_date DATE DEFAULT CURRENT_DATE,
  end_date DATE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_meds_user ON public.medications(user_id, created_at DESC);
ALTER TABLE public.medications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users select own meds" ON public.medications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own meds" ON public.medications FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own meds" ON public.medications FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users delete own meds" ON public.medications FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Admins all meds" ON public.medications FOR ALL USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE TRIGGER meds_updated_at BEFORE UPDATE ON public.medications FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- health_profiles
CREATE TABLE public.health_profiles (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  age INTEGER,
  sex TEXT,
  weight_kg NUMERIC,
  height_cm NUMERIC,
  bmi NUMERIC,
  conditions TEXT[] DEFAULT '{}',
  family_history TEXT[] DEFAULT '{}',
  allergies TEXT[] DEFAULT '{}',
  diet TEXT[] DEFAULT '{}',
  lifestyle TEXT,
  notes TEXT,
  onboarded BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.health_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users select own hp" ON public.health_profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own hp" ON public.health_profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own hp" ON public.health_profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users delete own hp" ON public.health_profiles FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Admins all hp" ON public.health_profiles FOR ALL USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE TRIGGER hp_updated_at BEFORE UPDATE ON public.health_profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
