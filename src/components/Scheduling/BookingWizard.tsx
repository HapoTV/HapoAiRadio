import React from 'react';
import { useState } from 'react';
import { format } from 'date-fns';
import type { 
  Service, 
  ServiceProvider, 
  TimeSlot 
} from '../../types/scheduling';
import ServiceSelector from './ServiceSelector';
import AvailabilityCalendar from './AvailabilityCalendar';
import TimeSlotPicker from './TimeSlotPicker';
import BookingForm from './BookingForm';
import { ChevronRightIcon } from '@heroicons/react/24/outline';

interface BookingWizardProps {
  onComplete: () => void;
}

export default function BookingWizard({ onComplete }: BookingWizardProps) {
  const [step, setStep] = useState(1);
  const [service, setService] = useState<Service | null>(null);
  const [provider, setProvider] = useState<ServiceProvider | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<TimeSlot | null>(null);
  const [timezone, setTimezone] = useState<string>(
    Intl.DateTimeFormat().resolvedOptions().timeZone
  );

  const handleServiceSelect = (selectedService: Service) => {
    setService(selectedService);
  };

  const handleProviderSelect = (selectedProvider: ServiceProvider) => {
    setProvider(selectedProvider);
  };

  const handleDateSelect = (date: Date) => {
    setSelectedDate(date);
    setSelectedTimeSlot(null);
  };

  const handleTimeSlotSelect = (timeSlot: TimeSlot) => {
    setSelectedTimeSlot(timeSlot);
  };

  const handleNext = () => {
    setStep(step + 1);
  };

  const handleBack = () => {
    setStep(step - 1);
  };

  const handleBookingComplete = () => {
    // Reset form and notify parent
    setStep(1);
    setService(null);
    setProvider(null);
    setSelectedDate(null);
    setSelectedTimeSlot(null);
    onComplete();
  };

  return (
    <div className="bg-primary-800 rounded-xl p-6">
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-primary-50">Book an Appointment</h2>
        
        <div className="flex items-center mt-4">
          {[1, 2, 3, 4].map((stepNumber) => (
            <div key={stepNumber} className="flex items-center">
              <div className={`
                flex items-center justify-center h-8 w-8 rounded-full
                ${step === stepNumber
                  ? 'bg-primary-600 text-primary-50'
                  : step > stepNumber
                    ? 'bg-primary-500 text-primary-50'
                    : 'bg-primary-700 text-primary-400'
                }
              `}>
                {step > stepNumber ? (
                  <CheckIcon className="h-5 w-5" />
                ) : (
                  stepNumber
                )}
              </div>
              
              {stepNumber < 4 && (
                <div className={`
                  h-1 w-10
                  ${step > stepNumber ? 'bg-primary-500' : 'bg-primary-700'}
                `} />
              )}
            </div>
          ))}
        </div>
        
        <div className="mt-2">
          {step === 1 && <p className="text-primary-400">Select a service and provider</p>}
          {step === 2 && <p className="text-primary-400">Choose a date</p>}
          {step === 3 && <p className="text-primary-400">Pick a time slot</p>}
          {step === 4 && <p className="text-primary-400">Confirm your booking</p>}
        </div>
      </div>
      
      <div>
        {step === 1 && (
          <div className="space-y-6">
            <ServiceSelector
              onSelectService={handleServiceSelect}
              onSelectProvider={handleProviderSelect}
              selectedServiceId={service?.id}
              selectedProviderId={provider?.id}
            />
            
            <div className="flex justify-between">
              <div></div>
              <button
                onClick={handleNext}
                disabled={!service || !provider}
                className="px-4 py-2 bg-primary-600 text-primary-50 rounded-lg hover:bg-primary-500 disabled:opacity-50 flex items-center"
              >
                Next
                <ChevronRightIcon className="h-4 w-4 ml-1" />
              </button>
            </div>
          </div>
        )}
        
        {step === 2 && (
          <div className="space-y-6">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h3 className="text-primary-50 font-medium">{service?.name}</h3>
                <p className="text-sm text-primary-400">with {provider?.name}</p>
              </div>
              
              <div>
                <label htmlFor="timezone" className="block text-sm font-medium text-primary-400 mb-1">
                  Timezone
                </label>
                <select
                  id="timezone"
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                  className="block w-full rounded-md border-0 bg-primary-700 py-1 text-primary-50 text-sm shadow-sm ring-1 ring-inset ring-primary-600 focus:ring-2 focus:ring-inset focus:ring-primary-500"
                >
                  {Intl.supportedValuesOf('timeZone').map((tz) => (
                    <option key={tz} value={tz}>
                      {tz.replace(/_/g, ' ')}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            
            <AvailabilityCalendar
              providerId={provider!.id}
              timezone={timezone}
              onSelectDate={handleDateSelect}
              selectedDate={selectedDate || undefined}
            />
            
            <div className="flex justify-between">
              <button
                onClick={handleBack}
                className="px-4 py-2 bg-primary-700 text-primary-200 rounded-lg hover:bg-primary-600"
              >
                Back
              </button>
              <button
                onClick={handleNext}
                disabled={!selectedDate}
                className="px-4 py-2 bg-primary-600 text-primary-50 rounded-lg hover:bg-primary-500 disabled:opacity-50 flex items-center"
              >
                Next
                <ChevronRightIcon className="h-4 w-4 ml-1" />
              </button>
            </div>
          </div>
        )}
        
        {step === 3 && selectedDate && (
          <div className="space-y-6">
            <div className="mb-4">
              <h3 className="text-primary-50 font-medium">{service?.name}</h3>
              <p className="text-sm text-primary-400">with {provider?.name}</p>
              <p className="text-sm text-primary-400">
                {format(selectedDate, 'EEEE, MMMM d, yyyy')}
              </p>
            </div>
            
            <TimeSlotPicker
              date={selectedDate}
              providerId={provider!.id}
              serviceId={service!.id}
              timezone={timezone}
              onSelectTimeSlot={handleTimeSlotSelect}
              selectedTimeSlot={selectedTimeSlot || undefined}
            />
            
            <div className="flex justify-between">
              <button
                onClick={handleBack}
                className="px-4 py-2 bg-primary-700 text-primary-200 rounded-lg hover:bg-primary-600"
              >
                Back
              </button>
              <button
                onClick={handleNext}
                disabled={!selectedTimeSlot}
                className="px-4 py-2 bg-primary-600 text-primary-50 rounded-lg hover:bg-primary-500 disabled:opacity-50 flex items-center"
              >
                Next
                <ChevronRightIcon className="h-4 w-4 ml-1" />
              </button>
            </div>
          </div>
        )}
        
        {step === 4 && service && provider && selectedDate && selectedTimeSlot && (
          <BookingForm
            service={service}
            provider={provider}
            selectedDate={selectedDate}
            selectedTimeSlot={selectedTimeSlot}
            timezone={timezone}
            onBookingComplete={handleBookingComplete}
            onCancel={handleBack}
          />
        )}
      </div>
    </div>
  );
}