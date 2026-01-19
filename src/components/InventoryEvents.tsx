import { useState } from 'react';
import { Truck, Plus, Calendar, User, X, Search } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { useToastStore } from '@/store/useToastStore';
import { InventoryEvent, formatDate } from '@/types';
import { ImageUpload } from './ImageUpload';
import { UploadedImage } from '@/lib/imageUtils';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { softDeleteEntity } from '../lib/softDelete';
import { db } from '@/lib/firebase';
import { ImageViewer, ImageThumbnail } from './ImageViewer';
import { fuzzySearchEvents } from '../lib/searchUtils';

const EVENT_TYPES = {
    shipment: 'Truck Load / Shipment',
    visit: 'Site Visit',
    audit: 'Stock Audit',
    other: 'Other Event'
};

export const InventoryEvents = () => {
    const { inventoryEvents, userProfile, user, role, addInventoryEvent, updateInventoryEvent, softDeleteInventoryEvent, isFirebaseConfigured } = useStore();
    const { addToast } = useToastStore();
    const APP_ID = import.meta.env.VITE_FIREBASE_APP_ID;

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [viewingImage, setViewingImage] = useState<{ url: string; title: string } | null>(null);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');

    // Form State
    const [formData, setFormData] = useState({
        type: 'shipment' as keyof typeof EVENT_TYPES,
        description: '',
        imageUrl: '',
        thumbnailUrl: ''
    });

    const handleImageUpload = (image: UploadedImage) => {
        setFormData(prev => ({
            ...prev,
            imageUrl: image.url,
            thumbnailUrl: image.thumbnailUrl
        }));
    };

    const handleStartLog = () => {
        setEditingId(null);
        setFormData({
            type: 'shipment',
            description: '',
            imageUrl: '',
            thumbnailUrl: ''
        });
        setIsModalOpen(true);
    };

    const handleEditEvent = (event: InventoryEvent) => {
        setEditingId(event.id);
        setFormData({
            type: event.type,
            description: event.description,
            imageUrl: event.imageUrl || '',
            thumbnailUrl: event.thumbnailUrl || ''
        });
        setIsModalOpen(true);
    };

    const handleDeleteEvent = async (id: string) => {
        if (confirm('Are you sure you want to delete this event?')) {
            try {
                if (isFirebaseConfigured && user) {
                    // Soft delete in Firebase
                    await softDeleteEntity('events', id, user.uid);
                } else {
                    // Soft delete in local store
                    softDeleteInventoryEvent(id, 'local-user');
                }
                addToast('Event moved to trash', 'success');
            } catch (err) {
                console.error('Delete error:', err);
                addToast('Failed to delete event', 'error');
            }
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.description.trim()) {
            addToast('Please enter a description', 'error');
            return;
        }

        const now = new Date().toISOString();
        const isOnline = navigator.onLine;

        if (editingId) {
            // Update existing
            const updates = {
                type: formData.type,
                description: formData.description,
                imageUrl: formData.imageUrl,
                thumbnailUrl: formData.thumbnailUrl,
                // Don't update timestamp or user for edits usually, or update timestamp to 'modified'
            };
            updateInventoryEvent(editingId, updates);
            addToast('Event updated successfully', 'success');
        } else {
            // Create new
            try {
                if (isFirebaseConfigured && isOnline) {
                    // Firebase mode - let realtime listener handle local store updates
                    await addDoc(collection(db, 'artifacts', APP_ID, 'public', 'data', 'events'), {
                        type: formData.type,
                        description: formData.description,
                        imageUrl: formData.imageUrl,
                        thumbnailUrl: formData.thumbnailUrl,
                        timestamp: serverTimestamp(),
                        user: userProfile?.name || 'Local User',
                        isDeleted: false
                    });
                    addToast('Event logged successfully', 'success');
                } else {
                    // Offline/local mode - add directly to local store
                    const newEvent: InventoryEvent = {
                        id: `evt_${Date.now()}`,
                        type: formData.type,
                        description: formData.description,
                        imageUrl: formData.imageUrl,
                        thumbnailUrl: formData.thumbnailUrl,
                        timestamp: now,
                        user: userProfile?.name || 'Local User',
                        isDeleted: false
                    };
                    addInventoryEvent(newEvent);
                    addToast('Event logged successfully', 'success');
                }
            } catch (error) {
                console.error('Failed to create event:', error);
                addToast('Failed to create event', 'error');
            }
        }
        setIsModalOpen(false);
    };

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Inventory Events</h2>
                    <p className="text-slate-500 dark:text-slate-400">Log shipments, truck loads, and visits</p>
                </div>
                <button
                    onClick={handleStartLog}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-indigo-200 dark:shadow-indigo-900/30 transition-all"
                >
                    <Plus size={20} />
                    Log Event
                </button>
            </div>

            {/* Search Bar */}
            <div className="mb-4">
                <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                    <input
                        type="text"
                        placeholder="Search events by type, description, or user..."
                        className="w-full pl-12 pr-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 dark:text-white"
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                    />
                </div>
            </div>

            <div className="space-y-4">
                {fuzzySearchEvents(inventoryEvents.filter(event => !event.isDeleted), searchQuery).length === 0 ? (
                    <div className="text-center py-16 bg-white dark:bg-slate-800 rounded-3xl border border-dashed border-slate-300 dark:border-slate-700">
                        <Truck size={48} className="mx-auto text-slate-300 dark:text-slate-600 mb-4" />
                        <h3 className="text-lg font-bold text-slate-700 dark:text-slate-300">{searchQuery ? 'No matching events' : 'No events logged yet'}</h3>
                        <p className="text-slate-500 dark:text-slate-400 max-w-sm mx-auto mt-2">
                            {searchQuery ? 'Try a different search term.' : 'Keep track of truck loads, daily shipments, and site visits here.'}
                        </p>
                    </div>
                ) : (
                    fuzzySearchEvents(inventoryEvents.filter(event => !event.isDeleted), searchQuery).map(event => (
                        <div key={event.id} className="bg-white dark:bg-slate-800 p-5 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 flex flex-col md:flex-row gap-5 animate-fade-in hover:shadow-md transition-shadow">
                            {/* Image Section */}
                            <div className="w-full md:w-48 shrink-0">
                                {event.thumbnailUrl ? (
                                    <>
                                        <ImageThumbnail
                                            imageUrl={event.imageUrl}
                                            thumbnailUrl={event.thumbnailUrl}
                                            alt={event.type}
                                            size="lg"
                                            onClick={() => event.imageUrl && setViewingImage({ url: event.imageUrl, title: event.description })}
                                        />
                                        {/* The original code had a duplicate md:hidden block here, which is incorrect.
                                            Assuming ImageThumbnail is the primary display, or if a separate mobile image is needed,
                                            it should be structured differently. For now, keeping the ImageThumbnail as the main display.
                                            The provided diff includes a specific md:hidden block, so I'll re-add it as per the diff.
                                        */}
                                        <div className="md:hidden w-full h-32 mt-2">
                                            <img
                                                src={event.thumbnailUrl || event.imageUrl}
                                                alt={event.type}
                                                className="w-full h-full object-cover rounded-xl"
                                                onClick={() => event.imageUrl && setViewingImage({ url: event.imageUrl, title: event.description })}
                                            />
                                        </div>
                                    </>
                                ) : (
                                    <div className="w-full h-32 md:h-full bg-slate-100 dark:bg-slate-700 rounded-xl flex items-center justify-center text-slate-300 dark:text-slate-500">
                                        <Truck size={32} />
                                    </div>
                                )}
                            </div>

                            {/* Content Section */}
                            <div className="flex-1 min-w-0">
                                <div className="flex flex-wrap items-center gap-3 mb-2">
                                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider
                    ${event.type === 'shipment' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400' :
                                            event.type === 'visit' ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400' :
                                                'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'}`}>
                                        {EVENT_TYPES[event.type]}
                                    </span>
                                    <span className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400 font-medium">
                                        <Calendar size={12} />
                                        {formatDate(event.timestamp, 'datetime')}
                                    </span>
                                </div>

                                <p className="text-slate-800 dark:text-white font-medium text-lg mb-3">
                                    {event.description}
                                </p>

                                <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                                    <div className="w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-600 flex items-center justify-center text-[10px] font-bold text-slate-600 dark:text-slate-300">
                                        <User size={12} />
                                    </div>
                                    Logged by <span className="font-semibold text-slate-700 dark:text-slate-300">{event.user}</span>
                                </div>

                                {/* Action Buttons - Admin Only */}
                                {role === 'admin' && (
                                    <div className="flex justify-end gap-2 mt-3 pt-3 border-t border-slate-100 dark:border-slate-700/50">
                                        <button
                                            onClick={() => handleEditEvent(event)}
                                            className="text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:underline"
                                        >
                                            Edit
                                        </button>
                                        <button
                                            onClick={() => handleDeleteEvent(event.id)}
                                            className="text-xs font-medium text-rose-600 dark:text-rose-400 hover:underline"
                                        >
                                            Delete
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* NEW/EDIT EVENT MODAL */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
                    <div className="bg-white dark:bg-slate-800 rounded-3xl w-full max-w-lg p-8 shadow-2xl relative animate-scale-in">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-2xl font-bold text-slate-800 dark:text-white">
                                {editingId ? 'Edit Inventory Event' : 'Log Inventory Event'}
                            </h3>
                            <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full">
                                <X size={20} className="text-slate-600 dark:text-slate-300" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-5">
                            <ImageUpload
                                currentImageUrl={formData.imageUrl}
                                onUpload={handleImageUpload}
                                onRemove={() => setFormData({ ...formData, imageUrl: '', thumbnailUrl: '' })}
                                label="Photo Evidence (Truck/Docs)"
                            />

                            <div>
                                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Event Type</label>
                                <select
                                    className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-xl focus:bg-white dark:focus:bg-slate-800 focus:border-indigo-500 outline-none font-medium text-slate-800 dark:text-white"
                                    value={formData.type}
                                    onChange={e => setFormData({ ...formData, type: e.target.value as any })}
                                >
                                    <option value="shipment">Truck Load / Shipment</option>
                                    <option value="visit">Site Visit</option>
                                    <option value="audit">Stock Audit</option>
                                    <option value="other">Other</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Description / Notes</label>
                                <textarea
                                    className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-xl focus:bg-white dark:focus:bg-slate-800 focus:border-indigo-500 outline-none font-medium text-slate-800 dark:text-white h-32 resize-none"
                                    placeholder="e.g. Received weekly supply from HQ, truck number TN-01-AB-1234..."
                                    value={formData.description}
                                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                                    autoFocus
                                />
                            </div>

                            <button
                                type="submit"
                                className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-lg shadow-indigo-200 dark:shadow-indigo-900/30 transition-all"
                            >
                                {editingId ? 'Update Event' : 'Save Event Log'}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* Image Viewer Modal */}
            {viewingImage && (
                <ImageViewer
                    isOpen={true}
                    onClose={() => setViewingImage(null)}
                    imageUrl={viewingImage.url}
                    title={viewingImage.title}
                />
            )}
        </div>
    );
};

