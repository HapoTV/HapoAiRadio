/*
  # Access Control & Permissions System
  
  1. New Tables
    - `roles` - Defines user roles in the system
    - `permissions` - Defines available permissions
    - `role_permissions` - Maps permissions to roles
    - `user_roles` - Assigns roles to users
    - `store_permissions` - Store-specific permissions for users
  
  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users
    - Set up proper constraints and relationships
*/

-- Create roles table
CREATE TABLE IF NOT EXISTS roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  description text,
  is_system_role boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create permissions table
CREATE TABLE IF NOT EXISTS permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  description text,
  resource text NOT NULL,
  action text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create role_permissions table
CREATE TABLE IF NOT EXISTS role_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role_id uuid NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  permission_id uuid NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(role_id, permission_id)
);

-- Create user_roles table
CREATE TABLE IF NOT EXISTS user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role_id uuid NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, role_id)
);

-- Create store_permissions table
CREATE TABLE IF NOT EXISTS store_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  store_id uuid NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  can_upload_music boolean DEFAULT false,
  can_edit_playlists boolean DEFAULT false,
  can_edit_schedules boolean DEFAULT false,
  can_control_playback boolean DEFAULT false,
  can_send_emergency boolean DEFAULT false,
  can_view_analytics boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, store_id)
);

-- Enable RLS
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE store_permissions ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Allow authenticated users to read roles"
  ON roles FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to read permissions"
  ON permissions FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to read role_permissions"
  ON role_permissions FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to read user_roles"
  ON user_roles FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to read store_permissions"
  ON store_permissions FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Allow users to view their own store permissions"
  ON store_permissions FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- Create function to update updated_at column
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers
CREATE TRIGGER update_roles_timestamp
  BEFORE UPDATE ON roles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_store_permissions_timestamp
  BEFORE UPDATE ON store_permissions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Insert default roles
INSERT INTO roles (name, description, is_system_role)
VALUES 
  ('admin', 'System administrator with full access', true),
  ('manager', 'Store manager with access to manage stores', true),
  ('staff', 'Staff member with limited access', true),
  ('subscriber', 'Individual subscriber', true)
ON CONFLICT (name) DO NOTHING;

-- Insert default permissions
INSERT INTO permissions (name, description, resource, action)
VALUES
  ('manage_users', 'Create, update, and delete users', 'users', 'manage'),
  ('view_users', 'View user information', 'users', 'read'),
  ('manage_stores', 'Create, update, and delete stores', 'stores', 'manage'),
  ('view_stores', 'View store information', 'stores', 'read'),
  ('manage_music', 'Upload and manage music tracks', 'tracks', 'manage'),
  ('view_music', 'View and play music tracks', 'tracks', 'read'),
  ('manage_playlists', 'Create and manage playlists', 'playlists', 'manage'),
  ('view_playlists', 'View playlists', 'playlists', 'read'),
  ('manage_schedules', 'Create and manage schedules', 'schedules', 'manage'),
  ('view_schedules', 'View schedules', 'schedules', 'read'),
  ('manage_commercials', 'Upload and manage commercials', 'commercials', 'manage'),
  ('view_commercials', 'View commercials', 'commercials', 'read'),
  ('control_playback', 'Control music playback', 'playback', 'manage'),
  ('send_emergency', 'Send emergency broadcasts', 'emergency', 'manage'),
  ('view_analytics', 'View analytics data', 'analytics', 'read'),
  ('manage_analytics', 'Manage analytics data', 'analytics', 'manage')
ON CONFLICT (name) DO NOTHING;

-- Assign permissions to admin role
INSERT INTO role_permissions (role_id, permission_id)
SELECT 
  (SELECT id FROM roles WHERE name = 'admin'),
  id
FROM permissions
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Assign permissions to manager role
INSERT INTO role_permissions (role_id, permission_id)
SELECT 
  (SELECT id FROM roles WHERE name = 'manager'),
  id
FROM permissions
WHERE name IN (
  'view_users',
  'manage_stores',
  'view_stores',
  'manage_music',
  'view_music',
  'manage_playlists',
  'view_playlists',
  'manage_schedules',
  'view_schedules',
  'manage_commercials',
  'view_commercials',
  'control_playback',
  'send_emergency',
  'view_analytics'
)
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Assign permissions to staff role
INSERT INTO role_permissions (role_id, permission_id)
SELECT 
  (SELECT id FROM roles WHERE name = 'staff'),
  id
FROM permissions
WHERE name IN (
  'view_stores',
  'view_music',
  'view_playlists',
  'view_schedules',
  'view_commercials',
  'control_playback'
)
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Assign permissions to subscriber role
INSERT INTO role_permissions (role_id, permission_id)
SELECT 
  (SELECT id FROM roles WHERE name = 'subscriber'),
  id
FROM permissions
WHERE name IN (
  'view_music',
  'view_playlists'
)
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Create function to check if user has permission
CREATE OR REPLACE FUNCTION has_permission(
  user_id_param uuid,
  permission_name_param text,
  store_id_param uuid DEFAULT NULL
)
RETURNS boolean AS $$
DECLARE
  has_role_permission boolean;
  has_store_permission boolean;
  permission_resource text;
  permission_action text;
BEGIN
  -- Check if user has permission through roles
  SELECT EXISTS (
    SELECT 1
    FROM user_roles ur
    JOIN role_permissions rp ON ur.role_id = rp.role_id
    JOIN permissions p ON rp.permission_id = p.id
    WHERE ur.user_id = user_id_param
    AND p.name = permission_name_param
  ) INTO has_role_permission;
  
  -- If user has role-based permission, return true
  IF has_role_permission THEN
    RETURN true;
  END IF;
  
  -- If no store_id provided, return false (no store-specific permission)
  IF store_id_param IS NULL THEN
    RETURN false;
  END IF;
  
  -- Get resource and action for the permission
  SELECT resource, action
  INTO permission_resource, permission_action
  FROM permissions
  WHERE name = permission_name_param;
  
  -- Check store-specific permissions
  IF permission_resource = 'tracks' AND permission_action = 'manage' THEN
    SELECT can_upload_music INTO has_store_permission
    FROM store_permissions
    WHERE user_id = user_id_param AND store_id = store_id_param;
  ELSIF permission_resource = 'playlists' AND permission_action = 'manage' THEN
    SELECT can_edit_playlists INTO has_store_permission
    FROM store_permissions
    WHERE user_id = user_id_param AND store_id = store_id_param;
  ELSIF permission_resource = 'schedules' AND permission_action = 'manage' THEN
    SELECT can_edit_schedules INTO has_store_permission
    FROM store_permissions
    WHERE user_id = user_id_param AND store_id = store_id_param;
  ELSIF permission_resource = 'playback' AND permission_action = 'manage' THEN
    SELECT can_control_playback INTO has_store_permission
    FROM store_permissions
    WHERE user_id = user_id_param AND store_id = store_id_param;
  ELSIF permission_resource = 'emergency' AND permission_action = 'manage' THEN
    SELECT can_send_emergency INTO has_store_permission
    FROM store_permissions
    WHERE user_id = user_id_param AND store_id = store_id_param;
  ELSIF permission_resource = 'analytics' AND permission_action = 'read' THEN
    SELECT can_view_analytics INTO has_store_permission
    FROM store_permissions
    WHERE user_id = user_id_param AND store_id = store_id_param;
  ELSE
    has_store_permission = false;
  END IF;
  
  RETURN COALESCE(has_store_permission, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;