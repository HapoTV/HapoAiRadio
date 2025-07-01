import React from 'react';
import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { setScheduleSettings } from '../../lib/scheduling';
import type { ScheduleSettings as ScheduleSettingsType, BreakTime } from '../../types/scheduling';
import toast from 'react-hot-toast';
import { PlusIcon, TrashIcon } from '@heroicons/react/24/outline';

interface ScheduleSettingsProps {
  providerId: string;
  onUpdate: () => void;
}

export default function ScheduleSettings({
  providerId,
  onUpdate
}: ScheduleSettingsProps) {
  const [settings, setSettings] = useState<Partial<ScheduleSettingsType>>({
    providerId,
    minAdvanceTime: 60, // 1 hour
    maxAdvanceTime: 30, // 30 days
    allowCancellation: true,
    cancellationTimeLimit: 24, // 24 hours
    workingHours: {
      0: { start: '09:00', end: '17:00', isWorkingDay: false }, // Sunday
      1: { start: '09:00', end: '17:00', isWorkingDay: true }, // Monday
      2: { start: '09:00', end: '17:00', isWorkingDay: true }, // Tuesday
      3: { start: '09:00', end: '17:00', isWorkingDay: true }, // Wednesday
      4: { start: '09:00', end: '17:00', isWorkingDay: true }, // Thursday
      5: { start: '09:00', end: '17:00', isWorkingDay: true }, // Friday
      6: { start: '09:00', end: '17:00', isWorkingDay: false }, // Saturday
    },
    breakTimes: [],
    holidayDates: []
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showAddBreak, setShowAddBreak] = useState(false);
  const [newBreak, setNewBreak] = useState<Partial<BreakTime>>({
    providerId,
    dayOfWeek: 1,
    startTime: '12:00',
    endTime: '13:00',
    isRecurring: true
  });
  const [showAddHoliday, setShowAddHoliday] = useState(false);
  const [newHoliday, setNewHoliday] = useState('');

  useEffect(() => {
    fetchSettings();
  }, [providerId]);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('schedule_settings')
        .select(`
          *,
          break_times:break_times(*)
        `)
        .eq('provider_id', providerId)
        .single();
      
      if (error && error.code !== 'PGRST116') throw error;
      
      if (data) {
        setSettings({
          id: data.id,
          providerId,
          minAdvanceTime: data.min_advance_time,
          maxAdvanceTime: data.max_advance_time,
          allowCancellation: data.allow_cancellation,
          cancellationTimeLimit: data.cancellation_time_limit,
          workingHours: data.working_hours,
          breakTimes: data.break_times || [],
          holidayDates: data.holiday_dates || []
        });
      }
    } catch (error) {
      console.error('Error fetching schedule settings:', error);
      toast.error('Failed to load schedule settings');
    } finally {
      setLoading(false);
    }
  };

  const handleAddBreak = () => {
    // Validate
    if (!newBreak.startTime || !newBreak.endTime) {
      toast.error('Please provide both start and end times');
      return;
    }
    
    if (newBreak.startTime >= newBreak.endTime) {
      toast.error('End time must be after start time');
      return;
    }
    
    // Add to list
    const breakTime: BreakTime = {
      id: crypto.randomUUID(),
      providerId,
      dayOfWeek: newBreak.dayOfWeek || 1,
      startTime: newBreak.startTime,
      endTime: newBreak.endTime,
      isRecurring: newBreak.isRecurring || true,
      date: newBreak.date
    };
    
    setSettings({
      ...settings,
      breakTimes: [...(settings.breakTimes || []), breakTime]
    });
    
    // Reset form
    setNewBreak({
      providerId,
      dayOfWeek: 1,
      startTime: '12:00',
      endTime: '13:00',
      isRecurring: true
    });
    
    setShowAddBreak(false);
  };

  const handleRemoveBreak = (id: string) => {
    setSettings({
      ...settings,
      breakTimes: (settings.breakTimes || []).filter(b => b.id !== id)
    });
  };

  const handleAddHoliday = () => {
    if (!newHoliday) {
      toast.error('Please select a date');
      return;
    }
    
    setSettings({
      ...settings,
      holidayDates: [...(settings.holidayDates || []), newHoliday]
    });
    
    setNewHoliday('');
    setShowAddHoliday(false);
  };

  const handleRemoveHoliday = (date: string) => {
    setSettings({
      ...settings,
      holidayDates: (settings.holidayDates || []).filter(d => d !== date)
    });
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      
      await setScheduleSettings(providerId, settings as ScheduleSettingsType);
      
      toast.success('Schedule settings saved');
      onUpdate();
    } catch (error) {
      console.error('Error saving schedule settings:', error);
      toast.error('Failed to save schedule settings');
    } finally {
      setSaving(false);
    }
  };

  const getDayName = (dayOfWeek: number) => {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days[dayOfWeek];
  };

  if (loading) {
    return (
      <div className="bg-primary-800 rounded-lg p-4">
        <h3 className="text-lg font-medium text-primary-50 mb-4">Schedule Settings</h3>
        <div className="animate-pulse space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-16 bg-primary-700 rounded-lg"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-primary-800 rounded-lg p-4">
      <h3 className="text-lg font-medium text-primary-50 mb-4">Schedule Settings</h3>
      
      <div className="space-y-6">
        <div>
          <h4 className="text-md font-medium text-primary-200 mb-2">Booking Rules</h4>
          <div className="bg-primary-700 p-4 rounded-lg space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="minAdvanceTime" className="block text-sm font-medium text-primary-400 mb-1">
                  Minimum Advance Time (minutes)
                </label>
                <input
                  type="number"
                  id="minAdvanceTime"
                  value={settings.minAdvanceTime}
                  onChange={(e) => setSettings({
                    ...settings,
                    minAdvanceTime: parseInt(e.target.value)
                  })}
                  min="0"
                  className="block w-full rounded-md border-0 bg-primary-800 py-1.5 text-primary-50 shadow-sm ring-1 ring-inset ring-primary-600 focus:ring-2 focus:ring-inset focus:ring-primary-500 sm:text-sm sm:leading-6"
                />
              </div>
              
              <div>
                <label htmlFor="maxAdvanceTime" className="block text-sm font-medium text-primary-400 mb-1">
                  Maximum Advance Time (days)
                </label>
                <input
                  type="number"
                  id="maxAdvanceTime"
                  value={settings.maxAdvanceTime}
                  onChange={(e) => setSettings({
                    ...settings,
                    maxAdvanceTime: parseInt(e.target.value)
                  })}
                  min="1"
                  className="block w-full rounded-md border-0 bg-primary-800 py-1.5 text-primary-50 shadow-sm ring-1 ring-inset ring-primary-600 focus:ring-2 focus:ring-inset focus:ring-primary-500 sm:text-sm sm:leading-6"
                />
              </div>
            </div>
            
            <div className="flex items-center">
              <input
                id="allowCancellation"
                type="checkbox"
                checked={settings.allowCancellation}
                onChange={(e) => setSettings({
                  ...settings,
                  allowCancellation: e.target.checked
                })}
                className="h-4 w-4 text-primary-500 focus:ring-primary-500 border-primary-600 bg-primary-800 rounded"
              />
              <label htmlFor="allowCancellation" className="ml-2 block text-sm text-primary-200">
                Allow cancellations
              </label>
            </div>
            
            {settings.allowCancellation && (
              <div>
                <label htmlFor="cancellationTimeLimit" className="block text-sm font-medium text-primary-400 mb-1">
                  Cancellation Time Limit (hours)
                </label>
                <input
                  type="number"
                  id="cancellationTimeLimit"
                  value={settings.cancellationTimeLimit}
                  onChange={(e) => setSettings({
                    ...settings,
                    cancellationTimeLimit: parseInt(e.target.value)
                  })}
                  min="1"
                  className="block w-full rounded-md border-0 bg-primary-800 py-1.5 text-primary-50 shadow-sm ring-1 ring-inset ring-primary-600 focus:ring-2 focus:ring-inset focus:ring-primary-500 sm:text-sm sm:leading-6"
                />
              </div>
            )}
          </div>
        </div>
        
        <div>
          <h4 className="text-md font-medium text-primary-200 mb-2">Working Hours</h4>
          <div className="bg-primary-700 p-4 rounded-lg space-y-4">
            {Object.entries(settings.workingHours || {}).map(([day, hours]) => (
              <div key={day} className="flex items-center space-x-4">
                <div className="w-24">
                  <span className="text-primary-200">{getDayName(parseInt(day))}</span>
                </div>
                
                <div className="flex items-center">
                  <input
                    id={`workingDay-${day}`}
                    type="checkbox"
                    checked={hours.isWorkingDay}
                    onChange={(e) => setSettings({
                      ...settings,
                      workingHours: {
                        ...settings.workingHours,
                        [day]: {
                          ...hours,
                          isWorkingDay: e.target.checked
                        }
                      }
                    })}
                    className="h-4 w-4 text-primary-500 focus:ring-primary-500 border-primary-600 bg-primary-800 rounded"
                  />
                  <label htmlFor={`workingDay-${day}`} className="ml-2 block text-sm text-primary-200">
                    Working day
                  </label>
                </div>
                
                {hours.isWorkingDay && (
                  <div className="flex items-center space-x-2">
                    <input
                      type="time"
                      value={hours.start}
                      onChange={(e) => setSettings({
                        ...settings,
                        workingHours: {
                          ...settings.workingHours,
                          [day]: {
                            ...hours,
                            start: e.target.value
                          }
                        }
                      })}
                      className="rounded-md border-0 bg-primary-800 py-1.5 text-primary-50 shadow-sm ring-1 ring-inset ring-primary-600 focus:ring-2 focus:ring-inset focus:ring-primary-500 sm:text-sm sm:leading-6"
                    />
                    <span className="text-primary-400">to</span>
                    <input
                      type="time"
                      value={hours.end}
                      onChange={(e) => setSettings({
                        ...settings,
                        workingHours: {
                          ...settings.workingHours,
                          [day]: {
                            ...hours,
                            end: e.target.value
                          }
                        }
                      })}
                      className="rounded-md border-0 bg-primary-800 py-1.5 text-primary-50 shadow-sm ring-1 ring-inset ring-primary-600 focus:ring-2 focus:ring-inset focus:ring-primary-500 sm:text-sm sm:leading-6"
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
        
        <div>
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-md font-medium text-primary-200">Break Times</h4>
            <button
              onClick={() => setShowAddBreak(true)}
              className="inline-flex items-center px-2 py-1 bg-primary-600 text-primary-50 rounded hover:bg-primary-500 text-sm"
            >
              <PlusIcon className="h-4 w-4 mr-1" />
              Add Break
            </button>
          </div>
          
          {showAddBreak && (
            <div className="bg-primary-700 p-4 rounded-lg mb-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-primary-400 mb-1">
                    Type
                  </label>
                  <div className="flex space-x-4">
                    <label className="inline-flex items-center">
                      <input
                        type="radio"
                        checked={newBreak.isRecurring}
                        onChange={() => setNewBreak({
                          ...newBreak,
                          isRecurring: true,
                          date: undefined
                        })}
                        className="h-4 w-4 text-primary-500 focus:ring-primary-500 border-primary-600 bg-primary-800"
                      />
                      <span className="ml-2 text-primary-200">Weekly</span>
                    </label>
                    <label className="inline-flex items-center">
                      <input
                        type="radio"
                        checked={!newBreak.isRecurring}
                        onChange={() => setNewBreak({
                          ...newBreak,
                          isRecurring: false,
                          dayOfWeek: undefined
                        })}
                        className="h-4 w-4 text-primary-500 focus:ring-primary-500 border-primary-600 bg-primary-800"
                      />
                      <span className="ml-2 text-primary-200">Specific Date</span>
                    </label>
                  </div>
                </div>
                
                {newBreak.isRecurring ? (
                  <div>
                    <label htmlFor="breakDayOfWeek" className="block text-sm font-medium text-primary-400 mb-1">
                      Day of Week
                    </label>
                    <select
                      id="breakDayOfWeek"
                      value={newBreak.dayOfWeek}
                      onChange={(e) => setNewBreak({
                        ...newBreak,
                        dayOfWeek: parseInt(e.target.value)
                      })}
                      className="block w-full rounded-md border-0 bg-primary-800 py-1.5 text-primary-50 shadow-sm ring-1 ring-inset ring-primary-600 focus:ring-2 focus:ring-inset focus:ring-primary-500 sm:text-sm sm:leading-6"
                    >
                      {[0, 1, 2, 3, 4, 5, 6].map((day) => (
                        <option key={day} value={day}>
                          {getDayName(day)}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div>
                    <label htmlFor="breakDate" className="block text-sm font-medium text-primary-400 mb-1">
                      Date
                    </label>
                    <input
                      type="date"
                      id="breakDate"
                      value={newBreak.date || ''}
                      onChange={(e) => setNewBreak({
                        ...newBreak,
                        date: e.target.value
                      })}
                      className="block w-full rounded-md border-0 bg-primary-800 py-1.5 text-primary-50 shadow-sm ring-1 ring-inset ring-primary-600 focus:ring-2 focus:ring-inset focus:ring-primary-500 sm:text-sm sm:leading-6"
                    />
                  </div>
                )}
                
                <div>
                  <label htmlFor="breakStartTime" className="block text-sm font-medium text-primary-400 mb-1">
                    Start Time
                  </label>
                  <input
                    type="time"
                    id="breakStartTime"
                    value={newBreak.startTime}
                    onChange={(e) => setNewBreak({
                      ...newBreak,
                      startTime: e.target.value
                    })}
                    className="block w-full rounded-md border-0 bg-primary-800 py-1.5 text-primary-50 shadow-sm ring-1 ring-inset ring-primary-600 focus:ring-2 focus:ring-inset focus:ring-primary-500 sm:text-sm sm:leading-6"
                  />
                </div>
                
                <div>
                  <label htmlFor="breakEndTime" className="block text-sm font-medium text-primary-400 mb-1">
                    End Time
                  </label>
                  <input
                    type="time"
                    id="breakEndTime"
                    value={newBreak.endTime}
                    onChange={(e) => setNewBreak({
                      ...newBreak,
                      endTime: e.target.value
                    })}
                    className="block w-full rounded-md border-0 bg-primary-800 py-1.5 text-primary-50 shadow-sm ring-1 ring-inset ring-primary-600 focus:ring-2 focus:ring-inset focus:ring-primary-500 sm:text-sm sm:leading-6"
                  />
                </div>
              </div>
              
              <div className="flex justify-end space-x-2">
                <button
                  onClick={() => setShowAddBreak(false)}
                  className="px-3 py-1.5 bg-primary-600 text-primary-50 rounded-lg hover:bg-primary-500"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddBreak}
                  className="px-3 py-1.5 bg-primary-500 text-primary-50 rounded-lg hover:bg-primary-400"
                >
                  Add
                </button>
              </div>
            </div>
          )}
          
          <div className="bg-primary-700 p-4 rounded-lg">
            {(settings.breakTimes || []).length === 0 ? (
              <div className="text-primary-400 text-center py-2">
                No break times configured
              </div>
            ) : (
              <div className="space-y-2">
                {(settings.breakTimes || []).map((breakTime) => (
                  <div key={breakTime.id} className="flex justify-between items-center p-2 bg-primary-600/50 rounded">
                    <div>
                      {breakTime.isRecurring ? (
                        <p className="text-primary-200">
                          {getDayName(breakTime.dayOfWeek)}
                        </p>
                      ) : (
                        <p className="text-primary-200">
                          {new Date(breakTime.date!).toLocaleDateString()}
                        </p>
                      )}
                      <p className="text-sm text-primary-400">
                        {breakTime.startTime} - {breakTime.endTime}
                      </p>
                    </div>
                    <button
                      onClick={() => handleRemoveBreak(breakTime.id)}
                      className="p-1 text-primary-400 hover:text-status-error"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        
        <div>
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-md font-medium text-primary-200">Holidays</h4>
            <button
              onClick={() => setShowAddHoliday(true)}
              className="inline-flex items-center px-2 py-1 bg-primary-600 text-primary-50 rounded hover:bg-primary-500 text-sm"
            >
              <PlusIcon className="h-4 w-4 mr-1" />
              Add Holiday
            </button>
          </div>
          
          {showAddHoliday && (
            <div className="bg-primary-700 p-4 rounded-lg mb-4">
              <div className="mb-4">
                <label htmlFor="holidayDate" className="block text-sm font-medium text-primary-400 mb-1">
                  Date
                </label>
                <input
                  type="date"
                  id="holidayDate"
                  value={newHoliday}
                  onChange={(e) => setNewHoliday(e.target.value)}
                  className="block w-full rounded-md border-0 bg-primary-800 py-1.5 text-primary-50 shadow-sm ring-1 ring-inset ring-primary-600 focus:ring-2 focus:ring-inset focus:ring-primary-500 sm:text-sm sm:leading-6"
                />
              </div>
              
              <div className="flex justify-end space-x-2">
                <button
                  onClick={() => setShowAddHoliday(false)}
                  className="px-3 py-1.5 bg-primary-600 text-primary-50 rounded-lg hover:bg-primary-500"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddHoliday}
                  className="px-3 py-1.5 bg-primary-500 text-primary-50 rounded-lg hover:bg-primary-400"
                >
                  Add
                </button>
              </div>
            </div>
          )}
          
          <div className="bg-primary-700 p-4 rounded-lg">
            {(settings.holidayDates || []).length === 0 ? (
              <div className="text-primary-400 text-center py-2">
                No holidays configured
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {(settings.holidayDates || []).map((date) => (
                  <div key={date} className="flex justify-between items-center p-2 bg-primary-600/50 rounded">
                    <span className="text-primary-200">
                      {new Date(date).toLocaleDateString()}
                    </span>
                    <button
                      onClick={() => handleRemoveHoliday(date)}
                      className="p-1 text-primary-400 hover:text-status-error"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        
        <div className="flex justify-end">
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 bg-primary-600 text-primary-50 rounded-lg hover:bg-primary-500 disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </div>
    </div>
  );
}