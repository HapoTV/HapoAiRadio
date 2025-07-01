import React from 'react';
import { useState, useEffect } from 'react';
import { Dialog } from '@headlessui/react';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import { XMarkIcon, MegaphoneIcon, TrashIcon } from '@heroicons/react/24/outline';
import { supabase } from '../../lib/supabase';
import type { Advertisement } from '../../types';
import toast from 'react-hot-toast';
import CommercialSelector from './CommercialSelector';
import { CommercialLibrary } from '../components/CommercialLibrary';
// Ensure path reflects the correct directory structure

interface Props {
  isOpen: boolean;
  onClose: () => void;
  playlistId: string;
  onUpdate: () => void;
}

interface AdSlot {
  id: string;
  commercial: Advertisement;
  position: number;
}

export default function CommercialPlaylistEditor({ isOpen, onClose, playlistId, onUpdate }: Props) {
  const [adSlots, setAdSlots] = useState<AdSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showCommercialSelector, setShowCommercialSelector] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchAdSlots();
    }
  }, [isOpen, playlistId]);

  const fetchAdSlots = async () => {
    try {
      const { data, error } = await supabase
        .from('ad_slots')
        .select(`
          id,
          position,
          advertisements (*)
        `)
        .eq('ad_schedule_id', playlistId)
        .order('position');

      if (error) throw error;

      const formattedSlots = data.map(item => ({
        id: item.id,
        commercial: item.advertisements as Advertisement,
        position: item.position
      }));

      setAdSlots(formattedSlots);
    } catch (error) {
      console.error('Error fetching ad slots:', error);
      toast.error('Failed to load ad slots');
    } finally {
      setLoading(false);
    }
  };

  const handleDragEnd = async (result: any) => {
    if (!result.destination) return;

    const items = Array.from(adSlots);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    // Update positions
    const updatedSlots = items.map((item, index) => ({
      ...item,
      position: index
    }));

    setAdSlots(updatedSlots);

    try {
      setSaving(true);
      const updates = updatedSlots.map(slot => ({
        id: slot.id,
        ad_schedule_id: playlistId,
        position: slot.position
      }));

      const { error } = await supabase
        .from('ad_slots')
        .upsert(updates);

      if (error) throw error;
      toast.success('Commercial order updated');
      onUpdate();
    } catch (error) {
      console.error('Error updating commercial positions:', error);
      toast.error('Failed to update commercial order');
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveCommercial = async (slotId: string) => {
    try {
      setSaving(true);
      const { error } = await supabase
        .from('ad_slots')
        .delete()
        .eq('id', slotId);

      if (error) throw error;

      setAdSlots(adSlots.filter(s => s.id !== slotId));
      toast.success('Commercial removed from schedule');
      onUpdate();
    } catch (error) {
      console.error('Error removing commercial:', error);
      toast.error('Failed to remove commercial');
    } finally {
      setSaving(false);
    }
  };

  const handleAddCommercials = async (selectedCommercialIds: string[]) => {
    try {
      setSaving(true);
      const newSlots = selectedCommercialIds.map((commercialId, index) => ({
        ad_schedule_id: playlistId,
        advertisement_id: commercialId,
        position: adSlots.length + index
      }));

      const { error } = await supabase
        .from('ad_slots')
        .insert(newSlots);

      if (error) throw error;

      await fetchAdSlots();
      setShowCommercialSelector(false);
      toast.success('Commercials added to schedule');
      onUpdate();
    } catch (error) {
      console.error('Error adding commercials:', error);
      toast.error('Failed to add commercials');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <Dialog
      open={isOpen}
      onClose={onClose}
      className="relative z-50"
    >
      <div className="fixed inset-0 bg-black/80" aria-hidden="true" />

      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel className="mx-auto max-w-2xl w-full rounded-xl bg-primary-800 shadow-xl">
          <div className="flex items-center justify-between p-6 border-b border-primary-700">
            <Dialog.Title className="text-lg font-medium text-primary-50">
              Edit Ad Schedule Commercials
            </Dialog.Title>
            <button
              type="button"
              onClick={onClose}
              className="text-primary-400 hover:text-primary-300"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>

          <div className="p-6">
            {loading ? (
              <div className="animate-pulse space-y-4">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="h-16 bg-primary-700 rounded-lg" />
                ))}
              </div>
            ) : (
              <>
                <div className="mb-4">
                  <button
                    type="button"
                    onClick={() => setShowCommercialSelector(true)}
                    className="inline-flex items-center rounded-md bg-primary-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary-500"
                  >
                    <MegaphoneIcon className="-ml-0.5 mr-1.5 h-5 w-5" />
                    Add Commercials
                  </button>
                </div>

                <DragDropContext onDragEnd={handleDragEnd}>
                  <Droppable droppableId="adSchedule">
                    {(provided) => (
                      <div
                        {...provided.droppableProps}
                        ref={provided.innerRef}
                        className="space-y-2"
                      >
                        {adSlots.map((slot, index) => (
                          <Draggable
                            key={slot.id}
                            draggableId={slot.id}
                            index={index}
                          >
                            {(provided) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                {...provided.dragHandleProps}
                                className="flex items-center justify-between bg-primary-700 p-4 rounded-lg"
                              >
                                <div className="flex items-center space-x-4">
                                  <span className="text-primary-400">{index + 1}</span>
                                  <div>
                                    <p className="text-primary-50 font-medium">{slot.commercial.title}</p>
                                    <p className="text-primary-400 text-sm">
                                      {Math.floor(slot.commercial.duration / 60)}:{String(slot.commercial.duration % 60).padStart(2, '0')}
                                    </p>
                                  </div>
                                </div>
                                <button
                                  onClick={() => handleRemoveCommercial(slot.id)}
                                  disabled={saving}
                                  className="p-2 text-status-error hover:text-status-errorHover disabled:opacity-50"
                                >
                                  <TrashIcon className="h-5 w-5" />
                                </button>
                              </div>
                            )}
                          </Draggable>
                        ))}
                        {provided.placeholder}
                      </div>
                    )}
                  </Droppable>
                </DragDropContext>

                {adSlots.length === 0 && (
                  <div className="text-center py-8">
                    <MegaphoneIcon className="mx-auto h-12 w-12 text-primary-600" />
                    <p className="mt-2 text-sm text-primary-400">
                      No commercials in this schedule. Click "Add Commercials" to get started.
                    </p>
                  </div>
                )}
              </>
            )}
          </div>
        </Dialog.Panel>
      </div>

      {showCommercialSelector && (
        <Dialog
          open={true}
          onClose={() => setShowCommercialSelector(false)}
          className="relative z-[60]"
        >
          <div className="fixed inset-0 bg-black/80" aria-hidden="true" />

          <div className="fixed inset-0 flex items-center justify-center p-4">
            <Dialog.Panel className="mx-auto max-w-xl w-full rounded-xl bg-primary-800 shadow-xl">
              <div className="flex items-center justify-between p-6 border-b border-primary-700">
                <Dialog.Title className="text-lg font-medium text-primary-50">
                  Add Commercials
                </Dialog.Title>
                <button
                  type="button"
                  onClick={() => setShowCommercialSelector(false)}
                  className="text-primary-400 hover:text-primary-300"
                >
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>

              <div className="p-6">
                <CommercialSelector
                  selectedCommercials={[]}
                  onCommercialSelect={handleAddCommercials}
                  mode="multi"
                />
              </div>
            </Dialog.Panel>
          </div>
        </Dialog>
      )}
    </Dialog>
  );
}