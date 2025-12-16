import React, { useState, useEffect } from 'react';
import { X, Calendar as CalendarIcon, Clock, AlertCircle, Check, XCircle, Trash2 } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { format, parseISO, areIntervalsOverlapping } from 'date-fns';
import { sendTeamsNotification } from '../lib/teams';

export default function BookingModal({ isOpen, onClose, selectedSlot, selectedBooking, onBookingSuccess, vehicles, session, existingBookings, userProfile }) {
  if (!isOpen) return null;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Form State
  const [vehicleId, setVehicleId] = useState(selectedSlot?.vehicleId || '');
  const [date, setDate] = useState(selectedSlot?.date ? format(selectedSlot.date, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'));
  const [startTime, setStartTime] = useState(selectedSlot?.hour ? `${selectedSlot.hour.toString().padStart(2, '0')}:00` : '09:00');
  const [endTime, setEndTime] = useState(selectedSlot?.hour ? `${(selectedSlot.hour + 1).toString().padStart(2, '0')}:00` : '10:00');
  const [purpose, setPurpose] = useState('');

  const isReadOnly = !!selectedBooking;
  const isAdmin = userProfile?.role === 'admin';
  const isOwner = selectedBooking?.user_id === session?.user?.id;

  useEffect(() => {
    if (selectedBooking) {
      setVehicleId(selectedBooking.vehicle_id);
      const start = new Date(selectedBooking.start_time);
      const end = new Date(selectedBooking.end_time);
      setDate(format(start, 'yyyy-MM-dd'));
      setStartTime(format(start, 'HH:mm'));
      setEndTime(format(end, 'HH:mm'));
      setPurpose(selectedBooking.purpose);
    } else if (selectedSlot) {
      setVehicleId(selectedSlot.vehicleId);
      setDate(format(selectedSlot.date, 'yyyy-MM-dd'));
      setStartTime(`${selectedSlot.hour.toString().padStart(2, '0')}:00`);
      setEndTime(`${(selectedSlot.hour + 1).toString().padStart(2, '0')}:00`);
      setPurpose('');
    }
  }, [selectedSlot, selectedBooking]);

  const checkForConflict = (vId, start, end) => {
    // Exclude current booking if editing (though we are read-only for now)
    const relevantBookings = existingBookings.filter(
      b => b.vehicle_id == vId && b.status !== 'rejected' && b.id !== selectedBooking?.id
    );

    for (const booking of relevantBookings) {
      const bStart = new Date(booking.start_time);
      const bEnd = new Date(booking.end_time);

      if (areIntervalsOverlapping(
        { start, end },
        { start: bStart, end: bEnd }
      )) {
        return true;
      }
    }
    return false;
  };

  const handleAction = async (action) => {
    if (!selectedBooking) return;
    setLoading(true);
    try {
      if (action === 'delete') {
        if (!confirm('Are you sure you want to cancel this booking?')) {
          setLoading(false);
          return;
        }
        await supabase.from('bookings').delete().eq('id', selectedBooking.id);
      } else {
        const updates = { status: action };
        await supabase.from('bookings').update(updates).eq('id', selectedBooking.id);

        const vehicle = vehicles.find(v => v.id === selectedBooking.vehicle_id);
        await sendTeamsNotification({ ...selectedBooking, status: action }, vehicle?.name || 'Vehicle', 'updated');
      }
      onBookingSuccess();
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isReadOnly) return;

    setLoading(true);
    setError(null);

    try {
      const startDateTime = new Date(`${date}T${startTime}`);
      const endDateTime = new Date(`${date}T${endTime}`);

      if (startDateTime >= endDateTime) {
        throw new Error("End time must be after start time");
      }

      if (checkForConflict(vehicleId, startDateTime, endDateTime)) {
        throw new Error("This slot requires checking, but purely client-side conflict detected overlaps with existing loaded bookings.");
      }

      const { data: overlaps, error: overlapError } = await supabase
        .from('bookings')
        .select('id')
        .eq('vehicle_id', vehicleId)
        .neq('status', 'rejected')
        .lt('start_time', endDateTime.toISOString())
        .gt('end_time', startDateTime.toISOString());

      if (overlapError) throw overlapError;
      if (overlaps && overlaps.length > 0) {
        throw new Error("Vehicle is already booked for this time slot.");
      }

      const newBooking = {
        user_id: session.user.id,
        vehicle_id: vehicleId,
        start_time: startDateTime.toISOString(),
        end_time: endDateTime.toISOString(),
        purpose,
        status: 'pending'
      };

      const { data, error: insertError } = await supabase
        .from('bookings')
        .insert(newBooking)
        .select()
        .single();

      if (insertError) throw insertError;

      const vehicle = vehicles.find(v => v.id == vehicleId);
      await sendTeamsNotification(newBooking, vehicle?.name || 'Vehicle', 'created');

      onBookingSuccess();
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
          <h2 className="text-lg font-semibold text-gray-800">
            {selectedBooking ? 'Booking Details' : 'New Booking'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="bg-red-50 text-red-600 px-4 py-3 rounded-lg text-sm flex items-start gap-2">
              <AlertCircle size={16} className="mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Vehicle</label>
            <select
              value={vehicleId}
              onChange={(e) => setVehicleId(e.target.value)}
              className="w-full rounded-lg border-gray-300 border px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all disabled:bg-gray-100"
              required
              disabled={isReadOnly}
            >
              <option value="">Select a vehicle</option>
              {vehicles.map(v => (
                <option key={v.id} value={v.id}>{v.name} ({v.plate_number})</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
              <div className="relative">
                <CalendarIcon className="absolute left-3 top-2.5 text-gray-400" size={16} />
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full pl-10 rounded-lg border-gray-300 border px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none disabled:bg-gray-100"
                  required
                  disabled={isReadOnly}
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Start Time</label>
              <div className="relative">
                <Clock className="absolute left-3 top-2.5 text-gray-400" size={16} />
                <input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full pl-10 rounded-lg border-gray-300 border px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none disabled:bg-gray-100"
                  required
                  disabled={isReadOnly}
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">End Time</label>
              <div className="relative">
                <Clock className="absolute left-3 top-2.5 text-gray-400" size={16} />
                <input
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="w-full pl-10 rounded-lg border-gray-300 border px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none disabled:bg-gray-100"
                  required
                  disabled={isReadOnly}
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Purpose</label>
            <textarea
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
              className="w-full rounded-lg border-gray-300 border px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none h-24 resize-none disabled:bg-gray-100"
              placeholder="e.g. Client meeting in Rayong"
              required
              disabled={isReadOnly}
            />
          </div>

          <div className="pt-2 flex justify-end gap-3">
            {isReadOnly ? (
              <>
                {isAdmin && selectedBooking.status === 'pending' && (
                  <>
                    <button
                      type="button"
                      onClick={() => handleAction('rejected')}
                      className="px-4 py-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                    >
                      <XCircle size={16} /> Reject
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAction('approved')}
                      className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                    >
                      <Check size={16} /> Approve
                    </button>
                  </>
                )}
                {(isOwner || isAdmin) && (
                  <button
                    type="button"
                    onClick={() => handleAction('delete')}
                    className="px-4 py-2 text-gray-500 hover:bg-red-50 hover:text-red-600 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ml-auto"
                  >
                    <Trash2 size={16} /> Cancel Booking
                  </button>
                )}
                {(!isAdmin && !isOwner) && (
                  <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-lg text-sm font-medium">Close</button>
                )}
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg text-sm font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {loading && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                  {loading ? 'Submitting...' : 'Confirm Booking'}
                </button>
              </>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
