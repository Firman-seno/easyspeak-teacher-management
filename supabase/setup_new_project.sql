-- ============================================================
-- TEACHFLOW PROGRESS - Complete setup for a NEW Supabase project
-- ============================================================
-- How to use:
--   1) Create a new Supabase project (supabase.com/dashboard)
--   2) Open SQL Editor -> New query
--   3) Paste ALL of this file -> Run
--
-- This is base schema + seed data + the alignment that adds
-- lessons.student_id, lessons.status, projects columns,
-- monthly_reports columns, and the assignments table.
-- Safe to run once on a fresh project. Idempotent where possible.
-- ============================================================

CREATE OR REPLACE FUNCTION public.set_updated_at() RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$ LANGUAGE plpgsql SET search_path = public;

CREATE TABLE public.levels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  description text,
  order_number int NOT NULL
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.levels TO authenticated;
GRANT ALL ON public.levels TO service_role;
ALTER TABLE public.levels ENABLE ROW LEVEL SECURITY;
CREATE POLICY "levels_all" ON public.levels FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE public.students (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id text NOT NULL UNIQUE,
  name text NOT NULL,
  gender text,
  date_of_birth date,
  phone text,
  email text,
  address text,
  program text NOT NULL DEFAULT 'General English',
  current_level text NOT NULL DEFAULT 'A1',
  target_level text NOT NULL DEFAULT 'B1',
  level_start_date date DEFAULT now(),
  level_status text NOT NULL DEFAULT 'In Progress',
  enrollment_date date NOT NULL DEFAULT now(),
  teacher text,
  status text NOT NULL DEFAULT 'Active',
  photo text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.students TO authenticated;
GRANT ALL ON public.students TO service_role;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
CREATE POLICY "students_all" ON public.students FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER students_updated BEFORE UPDATE ON public.students FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.attendance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  date date NOT NULL,
  status text NOT NULL DEFAULT 'Present',
  check_in_time text,
  meeting text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.attendance TO authenticated;
GRANT ALL ON public.attendance TO service_role;
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;
CREATE POLICY "attendance_all" ON public.attendance FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE UNIQUE INDEX attendance_unique ON public.attendance(student_id, date);

CREATE TABLE public.lessons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  date date NOT NULL DEFAULT now(),
  program text,
  level text,
  unit text,
  topic text,
  grammar text,
  vocabulary text,
  speaking_practice text,
  objective text,
  homework text,
  notes text,
  duration int,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lessons TO authenticated;
GRANT ALL ON public.lessons TO service_role;
ALTER TABLE public.lessons ENABLE ROW LEVEL SECURITY;
CREATE POLICY "lessons_all" ON public.lessons FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE public.projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid REFERENCES public.students(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  program text,
  level text,
  type text NOT NULL DEFAULT 'Speaking',
  assigned_date date NOT NULL DEFAULT now(),
  due_date date,
  instructions text,
  status text NOT NULL DEFAULT 'Assigned',
  score int CHECK (score IS NULL OR (score >= 0 AND score <= 100)),
  feedback text,
  completed_date date,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.projects TO authenticated;
GRANT ALL ON public.projects TO service_role;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "projects_all" ON public.projects FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE public.progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL UNIQUE REFERENCES public.students(id) ON DELETE CASCADE,
  speaking int NOT NULL DEFAULT 0 CHECK (speaking BETWEEN 0 AND 100),
  listening int NOT NULL DEFAULT 0 CHECK (listening BETWEEN 0 AND 100),
  reading int NOT NULL DEFAULT 0 CHECK (reading BETWEEN 0 AND 100),
  writing int NOT NULL DEFAULT 0 CHECK (writing BETWEEN 0 AND 100),
  vocabulary int NOT NULL DEFAULT 0 CHECK (vocabulary BETWEEN 0 AND 100),
  grammar int NOT NULL DEFAULT 0 CHECK (grammar BETWEEN 0 AND 100),
  overall_progress int NOT NULL DEFAULT 0,
  teacher_notes text,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.progress TO authenticated;
GRANT ALL ON public.progress TO service_role;
ALTER TABLE public.progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY "progress_all" ON public.progress FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER progress_updated BEFORE UPDATE ON public.progress FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.progress_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  skill text NOT NULL,
  previous_score int,
  new_score int,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.progress_history TO authenticated;
GRANT ALL ON public.progress_history TO service_role;
ALTER TABLE public.progress_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "progress_history_all" ON public.progress_history FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE public.monthly_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  month int NOT NULL,
  year int NOT NULL,
  total_meetings int NOT NULL DEFAULT 0,
  present int NOT NULL DEFAULT 0,
  late int NOT NULL DEFAULT 0,
  excused int NOT NULL DEFAULT 0,
  absent int NOT NULL DEFAULT 0,
  attendance_rate int NOT NULL DEFAULT 0,
  lessons_completed int NOT NULL DEFAULT 0,
  projects_assigned int NOT NULL DEFAULT 0,
  projects_completed int NOT NULL DEFAULT 0,
  overall_progress int NOT NULL DEFAULT 0,
  skills jsonb NOT NULL DEFAULT '{}'::jsonb,
  level text,
  teacher_evaluation text,
  recommendations text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.monthly_reports TO authenticated;
GRANT ALL ON public.monthly_reports TO service_role;
ALTER TABLE public.monthly_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "monthly_reports_all" ON public.monthly_reports FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE public.settings (
  id int PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  school_name text NOT NULL DEFAULT 'EasySpeak English Course',
  teacher_name text NOT NULL DEFAULT 'Teacher',
  address text,
  phone text,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.settings TO authenticated;
GRANT ALL ON public.settings TO service_role;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "settings_all" ON public.settings FOR ALL TO authenticated USING (true) WITH CHECK (true);
INSERT INTO public.settings (id) VALUES (1);

INSERT INTO public.levels (code, name, description, order_number) VALUES
 ('Pre-A1','Absolute Beginner','First contact with English.',1),
 ('A1','Beginner','Basic everyday communication.',2),
 ('A2','Elementary','Simple conversations and familiar situations.',3),
 ('B1','Intermediate','Independent everyday communication.',4),
 ('B2','Upper Intermediate','Confident communication and discussion.',5),
 ('C1','Advanced','Fluent and sophisticated communication.',6),
 ('C2','Proficient','Near-native proficiency.',7);

INSERT INTO public.students (student_id,name,gender,date_of_birth,phone,email,address,program,current_level,target_level,enrollment_date,teacher,status,notes) VALUES
 ('ES-001','Andini Pratiwi','Female','2001-03-14','081234567801','andini@example.com','Jl. Melati 12, Jakarta','General English','A2','B1','2025-09-01','Mr. Rian','Active','Very consistent learner.'),
 ('ES-002','Budi Santoso','Male','1999-07-02','081234567802','budi@example.com','Jl. Kenanga 4, Bandung','Conversation Class','B1','B2','2025-08-15','Mr. Rian','Active','Needs writing practice.'),
 ('ES-003','Citra Ayu','Female','2003-11-21','081234567803','citra@example.com','Jl. Mawar 9, Surabaya','IELTS Preparation','B2','C1','2025-10-05','Ms. Dina','Active',null),
 ('ES-004','Dimas Nugroho','Male','2000-01-30','081234567804','dimas@example.com','Jl. Anggrek 21, Depok','Business English','A2','B1','2025-11-01','Ms. Dina','Active','Often late.'),
 ('ES-005','Eka Lestari','Female','2004-05-18','081234567805','eka@example.com','Jl. Dahlia 7, Bekasi','General English','A1','A2','2026-01-10','Mr. Rian','Active',null),
 ('ES-006','Fajar Ramadhan','Male','1998-09-09','081234567806','fajar@example.com','Jl. Cempaka 3, Tangerang','Conversation Class','B1','B2','2025-06-20','Ms. Dina','Inactive','Paused for work.'),
 ('ES-007','Gita Amelia','Female','2002-12-01','081234567807','gita@example.com','Jl. Flamboyan 15, Bogor','Kids English','Pre-A1','A1','2026-02-01','Mr. Rian','Active',null),
 ('ES-008','Hendra Wijaya','Male','1997-04-25','081234567808','hendra@example.com','Jl. Teratai 8, Jakarta','IELTS Preparation','C1','C2','2025-05-11','Ms. Dina','Completed','Finished advanced track.');

INSERT INTO public.progress (student_id,speaking,listening,reading,writing,vocabulary,grammar,overall_progress,teacher_notes)
SELECT id,
  (55 + (row_number() over (order by student_id))*4)::int,
  (50 + (row_number() over (order by student_id))*5)::int,
  (60 + (row_number() over (order by student_id))*3)::int,
  (45 + (row_number() over (order by student_id))*4)::int,
  (65 + (row_number() over (order by student_id))*3)::int,
  (50 + (row_number() over (order by student_id))*4)::int,
  0, 'Initial assessment.'
FROM public.students;
UPDATE public.progress SET
  speaking=LEAST(speaking,100), listening=LEAST(listening,100), reading=LEAST(reading,100),
  writing=LEAST(writing,100), vocabulary=LEAST(vocabulary,100), grammar=LEAST(grammar,100);
UPDATE public.progress SET overall_progress = ROUND((speaking+listening+reading+writing+vocabulary+grammar)/6.0);

INSERT INTO public.attendance (student_id, date, status, check_in_time, meeting)
SELECT s.id, d::date,
  CASE WHEN (extract(day from d)::int + length(s.name)) % 11 = 0 THEN 'Absent'
       WHEN (extract(day from d)::int + length(s.name)) % 7 = 0 THEN 'Late'
       WHEN (extract(day from d)::int + length(s.name)) % 13 = 0 THEN 'Excused'
       ELSE 'Present' END,
  '09:00', 'Meeting ' || row_number() over (partition by s.id order by d)
FROM public.students s
CROSS JOIN generate_series(date_trunc('month', now()) - interval '1 month', now(), interval '3 days') d
WHERE s.status = 'Active' AND d::date <= now()::date;

INSERT INTO public.lessons (title,date,program,level,unit,topic,grammar,vocabulary,speaking_practice,objective,homework,duration) VALUES
 ('Daily Activities', now()::date - 20, 'General English','A1','Unit 3','Daily Activities','Simple Present','wake up, take a shower, have breakfast, go to work','Students describe their daily routine.','Students can talk about daily routines.','Write 8 sentences about your day.',90),
 ('Talking About the Past', now()::date - 14, 'General English','A2','Unit 5','Last Weekend','Simple Past','visited, travelled, enjoyed, stayed','Students share their last weekend.','Students can narrate past events.','Short paragraph about last holiday.',90),
 ('Giving Opinions', now()::date - 9, 'Conversation Class','B1','Unit 2','Social Media','Linking words','in my opinion, however, moreover','Mini debate about social media.','Students can express and support opinions.','Prepare 3 arguments.',60),
 ('Describing Graphs', now()::date - 5, 'IELTS Preparation','B2','Unit 7','Task 1 Writing','Comparatives & trends','increase, decline, plateau, fluctuate','Students describe a line graph aloud.','Students can describe data trends.','Write a 150-word Task 1.',120),
 ('Business Emails', now()::date - 2, 'Business English','A2','Unit 4','Professional Writing','Modal verbs','request, attach, confirm, regards','Role-play a client call.','Students can write a polite email.','Write a follow-up email.',90);

INSERT INTO public.projects (student_id,title,description,program,level,type,assigned_date,due_date,status,score,feedback,completed_date)
SELECT s.id,
  p.title, p.descr, s.program, s.current_level, p.ptype,
  now()::date - p.offset_days, now()::date - p.offset_days + 14, p.status,
  p.score, p.feedback,
  CASE WHEN p.status = 'Completed' THEN now()::date - p.offset_days + 10 ELSE NULL END
FROM public.students s
CROSS JOIN (VALUES
  ('My Daily Routine Video','Record a 2-minute video about your routine.','Video Project',25,'Completed',88,'Great pronunciation and confidence.'),
  ('Weekend Story Writing','Write 200 words about your last weekend.','Writing',18,'Reviewed',75,'Good structure, watch past tense.'),
  ('Vocabulary Quiz Set 3','Complete the 30-word vocabulary set.','Vocabulary',10,'In Progress',NULL,NULL),
  ('Mini Presentation','Present your favourite city for 3 minutes.','Presentation',4,'Assigned',NULL,NULL)
) AS p(title,descr,ptype,offset_days,status,score,feedback)
WHERE s.status <> 'Inactive';

-- ============================================================
-- SCHEMA ALIGNMENT (adds lessons.student_id, assignments table, etc.)
-- ============================================================

ALTER TABLE public.lessons
  ADD COLUMN IF NOT EXISTS student_id uuid REFERENCES public.students(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'Planned',
  ADD COLUMN IF NOT EXISTS content text,
  ADD COLUMN IF NOT EXISTS attachment text,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

CREATE INDEX IF NOT EXISTS lessons_student_id_idx ON public.lessons(student_id);
DROP TRIGGER IF EXISTS lessons_updated ON public.lessons;
CREATE TRIGGER lessons_updated BEFORE UPDATE ON public.lessons FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS lesson_id uuid REFERENCES public.lessons(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS objective text,
  ADD COLUMN IF NOT EXISTS progress int NOT NULL DEFAULT 0 CHECK (progress BETWEEN 0 AND 100),
  ADD COLUMN IF NOT EXISTS submission_date date,
  ADD COLUMN IF NOT EXISTS teacher_notes text,
  ADD COLUMN IF NOT EXISTS attachment text,
  ADD COLUMN IF NOT EXISTS submission_link text,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

UPDATE public.projects SET status = 'Planned' WHERE status = 'Assigned';

CREATE INDEX IF NOT EXISTS projects_student_id_idx ON public.projects(student_id);
DROP TRIGGER IF EXISTS projects_updated ON public.projects;
CREATE TRIGGER projects_updated BEFORE UPDATE ON public.projects FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  lesson_id uuid REFERENCES public.lessons(id) ON DELETE SET NULL,
  title text NOT NULL,
  type text NOT NULL DEFAULT 'Homework',
  description text,
  instructions text,
  assigned_date date NOT NULL DEFAULT now(),
  due_date date,
  status text NOT NULL DEFAULT 'Assigned',
  score int CHECK (score IS NULL OR (score >= 0 AND score <= 100)),
  max_score int CHECK (max_score IS NULL OR max_score > 0),
  teacher_notes text,
  attachment text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.assignments TO authenticated;
GRANT ALL ON public.assignments TO service_role;
ALTER TABLE public.assignments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "assignments_all" ON public.assignments FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE INDEX IF NOT EXISTS assignments_student_id_idx ON public.assignments(student_id);
DROP TRIGGER IF EXISTS assignments_updated ON public.assignments;
CREATE TRIGGER assignments_updated BEFORE UPDATE ON public.assignments FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.monthly_reports
  ADD COLUMN IF NOT EXISTS strengths text,
  ADD COLUMN IF NOT EXISTS areas_to_improve text,
  ADD COLUMN IF NOT EXISTS next_month_goals text,
  ADD COLUMN IF NOT EXISTS lessons_total int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS lessons_in_progress int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS lessons_planned int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS lessons_completed_percent int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS assignments_total int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS assignments_completed int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS assignments_in_progress int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS assignments_submitted int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS assignments_overdue int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS assignments_avg_score int,
  ADD COLUMN IF NOT EXISTS assignments_completion_percent int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS projects_total int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS projects_in_progress int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS projects_submitted int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS projects_overdue int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS projects_avg_score int,
  ADD COLUMN IF NOT EXISTS projects_completion_percent int NOT NULL DEFAULT 0;

-- Force PostgREST to reload its schema cache so the API sees new columns.
NOTIFY pgrst, 'reload schema';
