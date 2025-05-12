import { supabase } from './supabase';

export interface Permission {
  id: string;
  name: string;
  description: string;
  resource: string;
  action: string;
}

export interface Role {
  id: string;
  name: string;
  description: string;
  is_system_role: boolean;
}

export interface UserRole {
  id: string;
  user_id: string;
  role_id: string;
  role?: Role;
}

export interface StorePermission {
  id: string;
  user_id: string;
  store_id: string;
  can_upload_music: boolean;
  can_edit_playlists: boolean;
  can_edit_schedules: boolean;
  can_control_playback: boolean;
  can_send_emergency: boolean;
  can_view_analytics: boolean;
}

// Check if the current user has a specific permission
export async function hasPermission(
  permissionName: string,
  storeId?: string
): Promise<boolean> {
  try {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData?.user) return false;
    
    const userId = userData.user.id;
    
    // First check if user has role-based permission
    const { data: userRoles, error: rolesError } = await supabase
      .from('user_roles')
      .select(`
        role_id,
        roles (
          name
        )
      `)
      .eq('user_id', userId);
    
    if (rolesError) throw rolesError;
    
    // Check if user is admin (admins have all permissions)
    const isAdmin = userRoles?.some(ur => ur.roles?.name === 'admin');
    if (isAdmin) return true;
    
    // Check if user has the permission through roles
    const { data: hasRolePermission, error: permError } = await supabase
      .from('role_permissions')
      .select(`
        permissions (
          name
        )
      `)
      .in('role_id', userRoles?.map(ur => ur.role_id) || [])
      .eq('permissions.name', permissionName);
    
    if (permError) throw permError;
    
    if (hasRolePermission && hasRolePermission.length > 0) {
      return true;
    }
    
    // If no store ID provided, return false (no store-specific permission)
    if (!storeId) return false;
    
    // Check store-specific permissions
    const { data: storePerms, error: storeError } = await supabase
      .from('store_permissions')
      .select('*')
      .eq('user_id', userId)
      .eq('store_id', storeId)
      .single();
    
    if (storeError) {
      if (storeError.code === 'PGRST116') return false; // No permissions found
      throw storeError;
    }
    
    // Map permission name to store permission field
    switch (permissionName) {
      case 'manage_music':
        return storePerms.can_upload_music;
      case 'manage_playlists':
        return storePerms.can_edit_playlists;
      case 'manage_schedules':
        return storePerms.can_edit_schedules;
      case 'control_playback':
        return storePerms.can_control_playback;
      case 'send_emergency':
        return storePerms.can_send_emergency;
      case 'view_analytics':
        return storePerms.can_view_analytics;
      default:
        return false;
    }
  } catch (error) {
    console.error('Error checking permission:', error);
    return false;
  }
}

// Get all roles
export async function getRoles(): Promise<Role[]> {
  try {
    const { data, error } = await supabase
      .from('roles')
      .select('*')
      .order('name');
    
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching roles:', error);
    throw error;
  }
}

// Get all permissions
export async function getPermissions(): Promise<Permission[]> {
  try {
    const { data, error } = await supabase
      .from('permissions')
      .select('*')
      .order('resource', { ascending: true })
      .order('name', { ascending: true });
    
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching permissions:', error);
    throw error;
  }
}

// Get user roles
export async function getUserRoles(userId: string): Promise<UserRole[]> {
  try {
    const { data, error } = await supabase
      .from('user_roles')
      .select(`
        id,
        user_id,
        role_id,
        roles (
          id,
          name,
          description,
          is_system_role
        )
      `)
      .eq('user_id', userId);
    
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching user roles:', error);
    throw error;
  }
}

// Assign role to user
export async function assignRoleToUser(userId: string, roleId: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('user_roles')
      .insert([{ user_id: userId, role_id: roleId }]);
    
    if (error) throw error;
  } catch (error) {
    console.error('Error assigning role to user:', error);
    throw error;
  }
}

// Remove role from user
export async function removeRoleFromUser(userRoleId: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('user_roles')
      .delete()
      .eq('id', userRoleId);
    
    if (error) throw error;
  } catch (error) {
    console.error('Error removing role from user:', error);
    throw error;
  }
}

// Get store permissions for a user
export async function getStorePermissions(userId: string, storeId?: string): Promise<StorePermission[]> {
  try {
    let query = supabase
      .from('store_permissions')
      .select('*')
      .eq('user_id', userId);
    
    if (storeId) {
      query = query.eq('store_id', storeId);
    }
    
    const { data, error } = await query;
    
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching store permissions:', error);
    throw error;
  }
}

// Update store permissions
export async function updateStorePermissions(
  storePermission: Partial<StorePermission> & { id?: string; user_id: string; store_id: string }
): Promise<void> {
  try {
    // Check if permission already exists
    const { data: existing, error: checkError } = await supabase
      .from('store_permissions')
      .select('id')
      .eq('user_id', storePermission.user_id)
      .eq('store_id', storePermission.store_id)
      .maybeSingle();
    
    if (checkError) throw checkError;
    
    if (existing) {
      // Update existing permission
      const { error } = await supabase
        .from('store_permissions')
        .update(storePermission)
        .eq('id', existing.id);
      
      if (error) throw error;
    } else {
      // Insert new permission
      const { error } = await supabase
        .from('store_permissions')
        .insert([storePermission]);
      
      if (error) throw error;
    }
  } catch (error) {
    console.error('Error updating store permissions:', error);
    throw error;
  }
}