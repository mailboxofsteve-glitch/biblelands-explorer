
-- 1. Create role enum and user_roles table
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- 2. Security definer function to check roles (avoids RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- 3. RLS policies for user_roles
CREATE POLICY "Users can view own roles"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all roles"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert roles"
  ON public.user_roles FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete roles"
  ON public.user_roles FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- 4. Add is_featured to lessons
ALTER TABLE public.lessons ADD COLUMN IF NOT EXISTS is_featured boolean NOT NULL DEFAULT false;

-- 5. Admin can read all profiles (for Users tab)
CREATE POLICY "Admins can view all profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- 6. Admin can manage all locations
ALTER TABLE public.locations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read locations"
  ON public.locations FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Admins can insert locations"
  ON public.locations FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update locations"
  ON public.locations FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete locations"
  ON public.locations FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- 7. Admin can manage all preloaded overlays
CREATE POLICY "Admins can insert preloaded overlays"
  ON public.overlays FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update all overlays"
  ON public.overlays FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete all overlays"
  ON public.overlays FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can view all overlays"
  ON public.overlays FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- 8. Admin function to list users with emails (security definer to access auth.users)
CREATE OR REPLACE FUNCTION public.admin_list_users()
RETURNS TABLE(user_id uuid, email text, created_at timestamptz, display_name text, lesson_count bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    au.id AS user_id,
    au.email::text,
    au.created_at,
    p.display_name,
    COALESCE(lc.cnt, 0) AS lesson_count
  FROM auth.users au
  LEFT JOIN public.profiles p ON p.user_id = au.id
  LEFT JOIN (
    SELECT teacher_id, COUNT(*) AS cnt
    FROM public.lessons
    GROUP BY teacher_id
  ) lc ON lc.teacher_id = au.id
  WHERE public.has_role(auth.uid(), 'admin')
  ORDER BY au.created_at DESC
$$;

-- 9. Admin can manage lessons (update is_featured, etc)
CREATE POLICY "Admins can update all lessons"
  ON public.lessons FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can view all lessons"
  ON public.lessons FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
