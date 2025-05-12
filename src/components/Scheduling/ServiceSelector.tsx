import React from 'react';
import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import type { Service, ServiceProvider } from '../../types/scheduling';

interface ServiceSelectorProps {
  onSelectService: (service: Service) => void;
  onSelectProvider: (provider: ServiceProvider) => void;
  selectedServiceId?: string;
  selectedProviderId?: string;
}

export default function ServiceSelector({
  onSelectService,
  onSelectProvider,
  selectedServiceId,
  selectedProviderId
}: ServiceSelectorProps) {
  const [services, setServices] = useState<Service[]>([]);
  const [providers, setProviders] = useState<ServiceProvider[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchServicesAndProviders();
  }, []);

  const fetchServicesAndProviders = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Fetch services
      const { data: servicesData, error: servicesError } = await supabase
        .from('services')
        .select('*')
        .order('name');
      
      if (servicesError) throw servicesError;
      
      // Fetch providers
      const { data: providersData, error: providersError } = await supabase
        .from('service_providers')
        .select(`
          *,
          services(*),
          availability:availabilities(*)
        `);
      
      if (providersError) throw providersError;
      
      setServices(servicesData || []);
      setProviders(providersData || []);
      
      // Auto-select first service and provider if none selected
      if (!selectedServiceId && servicesData && servicesData.length > 0) {
        onSelectService(servicesData[0]);
      }
      
      if (!selectedProviderId && providersData && providersData.length > 0) {
        onSelectProvider(providersData[0]);
      }
    } catch (error) {
      console.error('Error fetching services and providers:', error);
      setError('Failed to load services and providers. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-primary-800 rounded-lg p-4">
        <h3 className="text-lg font-medium text-primary-50 mb-4">Select a Service</h3>
        <div className="animate-pulse space-y-4">
          <div className="h-10 bg-primary-700 rounded"></div>
          <div className="h-10 bg-primary-700 rounded"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-primary-800 rounded-lg p-4">
        <h3 className="text-lg font-medium text-primary-50 mb-4">Select a Service</h3>
        <div className="text-status-error p-4 text-center">
          {error}
          <button
            onClick={fetchServicesAndProviders}
            className="block mx-auto mt-2 px-4 py-2 bg-primary-700 text-primary-50 rounded-lg hover:bg-primary-600"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-primary-800 rounded-lg p-4">
      <h3 className="text-lg font-medium text-primary-50 mb-4">Select a Service</h3>
      
      <div className="space-y-4">
        <div>
          <label htmlFor="service" className="block text-sm font-medium text-primary-200 mb-2">
            Service
          </label>
          <select
            id="service"
            value={selectedServiceId || ''}
            onChange={(e) => {
              const service = services.find(s => s.id === e.target.value);
              if (service) onSelectService(service);
            }}
            className="block w-full rounded-md border-0 bg-primary-700 py-1.5 text-primary-50 shadow-sm ring-1 ring-inset ring-primary-600 focus:ring-2 focus:ring-inset focus:ring-primary-500 sm:text-sm sm:leading-6"
          >
            {services.map((service) => (
              <option key={service.id} value={service.id}>
                {service.name} ({service.duration} min) - ${service.price}
              </option>
            ))}
          </select>
        </div>
        
        <div>
          <label htmlFor="provider" className="block text-sm font-medium text-primary-200 mb-2">
            Provider
          </label>
          <select
            id="provider"
            value={selectedProviderId || ''}
            onChange={(e) => {
              const provider = providers.find(p => p.id === e.target.value);
              if (provider) onSelectProvider(provider);
            }}
            className="block w-full rounded-md border-0 bg-primary-700 py-1.5 text-primary-50 shadow-sm ring-1 ring-inset ring-primary-600 focus:ring-2 focus:ring-inset focus:ring-primary-500 sm:text-sm sm:leading-6"
          >
            {providers.map((provider) => (
              <option key={provider.id} value={provider.id}>
                {provider.name}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}