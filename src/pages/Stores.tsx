import React from 'react';
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import type { Store } from '../types';
import { PlusIcon, PencilIcon, TrashIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';
import { StorePlayerStatus } from '../components/StoreManagement';

interface StoreForm {
  name: string;
  location: string;
  latitude: string;
  longitude: string;
  ip_address: string;
}

export default function Stores() {
  const [stores, setStores] = useState<Store[]>([]);
  const [filteredStores, setFilteredStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddStore, setShowAddStore] = useState(false);
  const [editingStore, setEditingStore] = useState<Store | null>(null);
  const [formData, setFormData] = useState<StoreForm>({
    name: '',
    location: '',
    latitude: '',
    longitude: '',
    ip_address: '',
  });
  const [searchQuery, setSearchQuery] = useState('');
  const { user } = useAuth();

  useEffect(() => {
    fetchStores();
  }, []);

  // Filter stores when search query or stores change
  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredStores(stores);
    } else {
      const query = searchQuery.toLowerCase();
      const filtered = stores.filter(store => 
        store.name.toLowerCase().includes(query) || 
        store.location.toLowerCase().includes(query) ||
        (store.formatted_address && store.formatted_address.toLowerCase().includes(query))
      );
      setFilteredStores(filtered);
    }
  }, [searchQuery, stores]);

  async function fetchStores() {
    try {
      const { data, error } = await supabase
        .from('stores')
        .select('*')
        .order('name');
      
      if (error) throw error;
      setStores(data || []);
      setFilteredStores(data || []);
    } catch (error) {
      console.error('Error fetching stores:', error);
      toast.error('Failed to load stores');
    } finally {
      setLoading(false);
    }
  }

  async function handleDeleteStore(storeId: string) {
    try {
      // First, verify the store exists and get its data
      const { data: store, error: fetchError } = await supabase
        .from('stores')
        .select('*')
        .eq('id', storeId)
        .single();

      if (fetchError) throw fetchError;
      if (!store) {
        toast.error('Store not found');
        return { success: false, message: 'Store not found' };
      }

      // Create audit log entry
      const { error: auditError } = await supabase
        .from('store_audit_logs')
        .insert({
          action: 'delete',
          store_id: storeId,
          store_data: store,
          performed_by: user?.id,
        });

      if (auditError) throw auditError;

      // Delete the store (cascading will handle related records)
      const { error: deleteError } = await supabase
        .from('stores')
        .delete()
        .eq('id', storeId);

      if (deleteError) throw deleteError;

      // Update local state
      setStores(stores.filter(s => s.id !== storeId));
      setFilteredStores(filteredStores.filter(s => s.id !== storeId));
      toast.success('Store deleted successfully');
      return { success: true, message: 'Store deleted successfully' };

    } catch (error: any) {
      console.error('Error deleting store:', error);
      toast.error(error.message || 'Failed to delete store');
      return { success: false, message: error.message || 'Failed to delete store' };
    }
  }

  const validateForm = () => {
    if (!formData.name.trim()) {
      toast.error('Store name is required');
      return false;
    }
    if (!formData.location.trim()) {
      toast.error('Location address is required');
      return false;
    }
    if (formData.latitude && (isNaN(Number(formData.latitude)) || Number(formData.latitude) < -90 || Number(formData.latitude) > 90)) {
      toast.error('Invalid latitude value');
      return false;
    }
    if (formData.longitude && (isNaN(Number(formData.longitude)) || Number(formData.longitude) < -180 || Number(formData.longitude) > 180)) {
      toast.error('Invalid longitude value');
      return false;
    }
    if (formData.ip_address && !/^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/.test(formData.ip_address)) {
      toast.error('Invalid IP address format');
      return false;
    }
    return true;
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validateForm()) return;

    try {
      const storeData = {
        name: formData.name,
        location: formData.location,
        latitude: formData.latitude ? Number(formData.latitude) : null,
        longitude: formData.longitude ? Number(formData.longitude) : null,
        ip_address: formData.ip_address || null,
        status: 'offline',
      };

      if (editingStore) {
        const { error } = await supabase
          .from('stores')
          .update(storeData)
          .eq('id', editingStore.id);

        if (error) throw error;
        toast.success('Store updated successfully');
      } else {
        const { error } = await supabase
          .from('stores')
          .insert([storeData]);

        if (error) throw error;
        toast.success('Store added successfully');
      }

      setFormData({
        name: '',
        location: '',
        latitude: '',
        longitude: '',
        ip_address: '',
      });
      setShowAddStore(false);
      setEditingStore(null);
      fetchStores();
    } catch (error) {
      console.error('Error saving store:', error);
      toast.error('Failed to save store');
    }
  }

  function handleEdit(store: Store) {
    setEditingStore(store);
    setFormData({
      name: store.name,
      location: store.location,
      latitude: store.latitude?.toString() || '',
      longitude: store.longitude?.toString() || '',
      ip_address: store.ip_address || '',
    });
    setShowAddStore(true);
  }

  if (loading) {
    return (
      <div className="animate-pulse">
        <div className="h-8 bg-gray-800 rounded w-1/4 mb-6"></div>
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-16 bg-gray-800 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="sm:flex sm:items-center sm:justify-between mb-8">
        <h1 className="text-2xl font-semibold text-white">Stores</h1>
        
        <div className="mt-4 sm:mt-0">
          <button
            type="button"
            onClick={() => {
              setEditingStore(null);
              setFormData({
                name: '',
                location: '',
                latitude: '',
                longitude: '',
                ip_address: '',
              });
              setShowAddStore(true);
            }}
            className="inline-flex items-center rounded-md bg-gray-800 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-gray-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-700"
          >
            <PlusIcon className="-ml-0.5 mr-1.5 h-5 w-5" aria-hidden="true" />
            Add Store
          </button>
        </div>
      </div>

      {/* Search input */}
      <div className="relative mb-6">
        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
          <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
        </div>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search stores by name or location..."
          className="block w-full rounded-md border-0 bg-gray-900 py-1.5 pl-10 pr-3 text-white shadow-sm ring-1 ring-inset ring-gray-700 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-gray-600 sm:text-sm sm:leading-6"
        />
      </div>

      {showAddStore && (
        <div className="mb-8">
          <form onSubmit={handleSubmit} className="bg-gray-800 p-6 shadow-sm ring-1 ring-gray-700 rounded-xl">
            <div className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
              <div>
                <label htmlFor="name" className="block text-sm font-medium leading-6 text-white">
                  Store Name *
                </label>
                <div className="mt-2">
                  <input
                    type="text"
                    name="name"
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="block w-full rounded-md border-0 bg-gray-900 py-1.5 text-white shadow-sm ring-1 ring-inset ring-gray-700 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-gray-600 sm:text-sm sm:leading-6"
                    required
                  />
                </div>
              </div>

              <div>
                <label htmlFor="location" className="block text-sm font-medium leading-6 text-white">
                  Location Address *
                </label>
                <div className="mt-2">
                  <input
                    type="text"
                    name="location"
                    id="location"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    className="block w-full rounded-md border-0 bg-gray-900 py-1.5 text-white shadow-sm ring-1 ring-inset ring-gray-700 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-gray-600 sm:text-sm sm:leading-6"
                    required
                  />
                </div>
              </div>

              <div>
                <label htmlFor="latitude" className="block text-sm font-medium leading-6 text-white">
                  Latitude
                </label>
                <div className="mt-2">
                  <input
                    type="text"
                    name="latitude"
                    id="latitude"
                    value={formData.latitude}
                    onChange={(e) => setFormData({ ...formData, latitude: e.target.value })}
                    className="block w-full rounded-md border-0 bg-gray-900 py-1.5 text-white shadow-sm ring-1 ring-inset ring-gray-700 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-gray-600 sm:text-sm sm:leading-6"
                    placeholder="e.g., 51.5074"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="longitude" className="block text-sm font-medium leading-6 text-white">
                  Longitude
                </label>
                <div className="mt-2">
                  <input
                    type="text"
                    name="longitude"
                    id="longitude"
                    value={formData.longitude}
                    onChange={(e) => setFormData({ ...formData, longitude: e.target.value })}
                    className="block w-full rounded-md border-0 bg-gray-900 py-1.5 text-white shadow-sm ring-1 ring-inset ring-gray-700 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-gray-600 sm:text-sm sm:leading-6"
                    placeholder="e.g., -0.1278"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="ip_address" className="block text-sm font-medium leading-6 text-white">
                  Radio IP Address
                </label>
                <div className="mt-2">
                  <input
                    type="text"
                    name="ip_address"
                    id="ip_address"
                    value={formData.ip_address}
                    onChange={(e) => setFormData({ ...formData, ip_address: e.target.value })}
                    className="block w-full rounded-md border-0 bg-gray-900 py-1.5 text-white shadow-sm ring-1 ring-inset ring-gray-700 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-gray-600 sm:text-sm sm:leading-6"
                    placeholder="xxx.xxx.xxx.xxx"
                  />
                </div>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-x-4">
              <button
                type="button"
                onClick={() => {
                  setShowAddStore(false);
                  setEditingStore(null);
                  setFormData({
                    name: '',
                    location: '',
                    latitude: '',
                    longitude: '',
                    ip_address: '',
                  });
                }}
                className="text-sm font-semibold leading-6 text-white"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="rounded-md bg-gray-700 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-gray-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-600"
              >
                {editingStore ? 'Update' : 'Save'}
              </button>
            </div>
          </form>
        </div>
      )}

      {filteredStores.length === 0 ? (
        <div className="text-center py-8 bg-gray-800 rounded-xl">
          <p className="text-gray-400">
            {searchQuery ? 'No stores match your search criteria' : 'No stores found. Add your first store to get started.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {filteredStores.map((store) => (
            <div key={store.id} className="bg-gray-800 shadow-sm ring-1 ring-gray-700 rounded-xl overflow-hidden">
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-medium text-white">{store.name}</h2>
                  <span
                    className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      store.status === 'online'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                    }`}
                  >
                    {store.status}
                  </span>
                </div>
                
                <p className="text-sm text-gray-300 mb-4">{store.location}</p>
                
                <StorePlayerStatus store={store} />
                
                <div className="mt-6 flex items-center justify-end space-x-2">
                  <button
                    type="button"
                    onClick={() => handleEdit(store)}
                    className="text-gray-400 hover:text-white"
                  >
                    <PencilIcon className="h-5 w-5" />
                    <span className="sr-only">Edit</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (window.confirm('Are you sure you want to delete this store? This action cannot be undone.')) {
                        handleDeleteStore(store.id);
                      }
                    }}
                    className="text-red-400 hover:text-red-300"
                  >
                    <TrashIcon className="h-5 w-5" />
                    <span className="sr-only">Delete</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}