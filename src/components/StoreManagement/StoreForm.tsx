import React from 'react';
import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import type { Store } from '../../types';
import toast from 'react-hot-toast';

interface Props {
  store?: Store;
  onSubmit: () => void;
  onCancel: () => void;
}

export default function StoreForm({ store, onSubmit, onCancel }: Props) {
  const [formData, setFormData] = useState({
    name: '',
    location: '',
    latitude: '',
    longitude: '',
    ip_address: '',
    payment_status: 'inactive',
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (store) {
      setFormData({
        name: store.name,
        location: store.location,
        latitude: store.latitude?.toString() || '',
        longitude: store.longitude?.toString() || '',
        ip_address: store.ip_address || '',
        payment_status: store.payment_status,
      });
    }
  }, [store]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const storeData = {
        name: formData.name,
        location: formData.location,
        latitude: formData.latitude ? parseFloat(formData.latitude) : null,
        longitude: formData.longitude ? parseFloat(formData.longitude) : null,
        ip_address: formData.ip_address || null,
        payment_status: formData.payment_status,
      };

      if (store) {
        const { error } = await supabase
          .from('stores')
          .update(storeData)
          .eq('id', store.id);

        if (error) throw error;
        toast.success('Store updated successfully');
      } else {
        const { error } = await supabase
          .from('stores')
          .insert([storeData]);

        if (error) throw error;
        toast.success('Store created successfully');
      }

      onSubmit();
    } catch (error) {
      console.error('Error saving store:', error);
      toast.error('Failed to save store');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-2">
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-primary-200">
            Store Name
          </label>
          <div className="mt-1">
            <input
              type="text"
              name="name"
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="block w-full rounded-md border-0 bg-primary-700 py-1.5 text-primary-50 shadow-sm ring-1 ring-inset ring-primary-600 focus:ring-2 focus:ring-inset focus:ring-primary-500 sm:text-sm sm:leading-6"
              required
            />
          </div>
        </div>

        <div>
          <label htmlFor="location" className="block text-sm font-medium text-primary-200">
            Location
          </label>
          <div className="mt-1">
            <input
              type="text"
              name="location"
              id="location"
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              className="block w-full rounded-md border-0 bg-primary-700 py-1.5 text-primary-50 shadow-sm ring-1 ring-inset ring-primary-600 focus:ring-2 focus:ring-inset focus:ring-primary-500 sm:text-sm sm:leading-6"
              required
            />
          </div>
        </div>

        <div>
          <label htmlFor="latitude" className="block text-sm font-medium text-primary-200">
            Latitude
          </label>
          <div className="mt-1">
            <input
              type="text"
              name="latitude"
              id="latitude"
              value={formData.latitude}
              onChange={(e) => setFormData({ ...formData, latitude: e.target.value })}
              className="block w-full rounded-md border-0 bg-primary-700 py-1.5 text-primary-50 shadow-sm ring-1 ring-inset ring-primary-600 focus:ring-2 focus:ring-inset focus:ring-primary-500 sm:text-sm sm:leading-6"
              pattern="-?\d*\.?\d*"
            />
          </div>
        </div>

        <div>
          <label htmlFor="longitude" className="block text-sm font-medium text-primary-200">
            Longitude
          </label>
          <div className="mt-1">
            <input
              type="text"
              name="longitude"
              id="longitude"
              value={formData.longitude}
              onChange={(e) => setFormData({ ...formData, longitude: e.target.value })}
              className="block w-full rounded-md border-0 bg-primary-700 py-1.5 text-primary-50 shadow-sm ring-1 ring-inset ring-primary-600 focus:ring-2 focus:ring-inset focus:ring-primary-500 sm:text-sm sm:leading-6"
              pattern="-?\d*\.?\d*"
            />
          </div>
        </div>

        <div>
          <label htmlFor="ip_address" className="block text-sm font-medium text-primary-200">
            IP Address
          </label>
          <div className="mt-1">
            <input
              type="text"
              name="ip_address"
              id="ip_address"
              value={formData.ip_address}
              onChange={(e) => setFormData({ ...formData, ip_address: e.target.value })}
              className="block w-full rounded-md border-0 bg-primary-700 py-1.5 text-primary-50 shadow-sm ring-1 ring-inset ring-primary-600 focus:ring-2 focus:ring-inset focus:ring-primary-500 sm:text-sm sm:leading-6"
              pattern="^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$"
            />
          </div>
        </div>

        <div>
          <label htmlFor="payment_status" className="block text-sm font-medium text-primary-200">
            Payment Status
          </label>
          <div className="mt-1">
            <select
              id="payment_status"
              name="payment_status"
              value={formData.payment_status}
              onChange={(e) => setFormData({ ...formData, payment_status: e.target.value })}
              className="block w-full rounded-md border-0 bg-primary-700 py-1.5 text-primary-50 shadow-sm ring-1 ring-inset ring-primary-600 focus:ring-2 focus:ring-inset focus:ring-primary-500 sm:text-sm sm:leading-6"
            >
              <option value="active">Active</option>
              <option value="suspended">Suspended</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>
      </div>

      <div className="flex justify-end space-x-3">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-md bg-primary-700 px-3 py-2 text-sm font-semibold text-primary-50 shadow-sm hover:bg-primary-600"
          disabled={loading}
        >
          Cancel
        </button>
        <button
          type="submit"
          className="rounded-md bg-primary-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600"
          disabled={loading}
        >
          {loading ? 'Saving...' : (store ? 'Update Store' : 'Create Store')}
        </button>
      </div>
    </form>
  );
}