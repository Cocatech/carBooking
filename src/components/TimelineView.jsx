import React, { useMemo } from 'react';
import { format, startOfDay, addDays, getHours, getMinutes, differenceInMinutes, isSameDay } from 'date-fns';
import { Clock, ChevronLeft, ChevronRight } from 'lucide-react';

const START_HOUR = 8;
const END_HOUR = 18;
const TOTAL_HOURS = END_HOUR - START_HOUR;
const CELL_WIDTH = 100; // px per hour approx

export default function TimelineView({ vehicles, bookings, onBookSlot, onSelectBooking, currentDate, onDateChange, session }) {

  const timeSlots = useMemo(() => {
    return Array.from({ length: TOTAL_HOURS + 1 }, (_, i) => START_HOUR + i);
  }, []);

  const getBookingStyle = (booking) => {
    const start = new Date(booking.start_time);
    const end = new Date(booking.end_time);

    // Calculate position
    const startHour = getHours(start);
    const startMin = getMinutes(start);
    const offsetMinutes = (startHour - START_HOUR) * 60 + startMin;
    const durationMinutes = differenceInMinutes(end, start);

    // Percentages
    const left = (offsetMinutes / (TOTAL_HOURS * 60)) * 100;
    const width = (durationMinutes / (TOTAL_HOURS * 60)) * 100;

    // Colors
    let bgColor = 'bg-gray-200 text-gray-700';
    if (booking.user_id === session?.user?.id) bgColor = 'bg-slate-500 text-white';
    else if (booking.status === 'pending') bgColor = 'bg-amber-400 text-amber-900 border border-amber-500/30';
    else if (booking.status === 'approved') bgColor = 'bg-emerald-500 text-white';
    else if (booking.status === 'rejected') bgColor = 'bg-red-200 text-red-800 opacity-60 line-through';

    return {
      left: `${Math.max(0, left)}%`,
      width: `${Math.min(100 - Math.max(0, left), width)}%`,
      className: `absolute h-8 top-1/2 -translate-y-1/2 rounded-md uppercase text-[10px] font-bold px-2 flex items-center whitespace-nowrap overflow-hidden z-10 ${bgColor}`
    };
  };

  const getDayBookings = (vehicleId) => {
    return bookings.filter(b =>
      b.vehicle_id === vehicleId &&
      isSameDay(new Date(b.start_time), currentDate) &&
      b.status !== 'rejected'
    );
  };

  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden flex flex-col h-full">
      {/* Header Controls */}
      <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-white sticky top-0 z-20">
        <div className="flex items-center gap-4">
          <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
            <Clock size={20} className="text-blue-600" />
            Schedule
          </h2>
          <div className="flex items-center bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => onDateChange(addDays(currentDate, -1))}
              className="p-1.5 hover:bg-white hover:shadow-sm rounded-md transition-all text-gray-600"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="px-3 text-sm font-medium text-gray-700 min-w-[140px] text-center">
              {format(currentDate, 'EEE, dd MMM yyyy')}
            </span>
            <button
              onClick={() => onDateChange(addDays(currentDate, 1))}
              className="p-1.5 hover:bg-white hover:shadow-sm rounded-md transition-all text-gray-600"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
        <div className="flex gap-4 text-xs font-medium text-gray-500">
          <div className="flex items-center gap-1.5"><div className="w-3 h-3 bg-amber-400 rounded-full"></div>Pending</div>
          <div className="flex items-center gap-1.5"><div className="w-3 h-3 bg-emerald-500 rounded-full"></div>Approved</div>
          <div className="flex items-center gap-1.5"><div className="w-3 h-3 bg-slate-500 rounded-full"></div>My Booking</div>
        </div>
      </div>

      {/* Timeline Grid */}
      <div className="overflow-x-auto flex-1 custom-scrollbar">
        <div className="min-w-[800px] divide-y divide-gray-100">

          {/* Header Row (Hours) */}
          <div className="flex border-b border-gray-100 bg-gray-50/50">
            <div className="w-48 shrink-0 p-3 text-xs font-semibold text-gray-500 uppercase tracking-wider sticky left-0 bg-gray-50/90 backdrop-blur-sm z-10 border-r border-gray-100">
              Vehicle
            </div>
            <div className="flex-1 relative h-10">
              {timeSlots.map(hour => (
                <div key={hour} className="absolute text-xs text-gray-400 font-medium -translate-x-1/2" style={{ left: `${((hour - START_HOUR) / TOTAL_HOURS) * 100}%` }}>
                  {hour}:00
                </div>
              ))}
            </div>
          </div>

          {/* Vehicle Rows */}
          {vehicles.map(vehicle => (
            <div key={vehicle.id} className="flex group hover:bg-gray-50 transition-colors">
              <div className="w-48 shrink-0 p-4 sticky left-0 bg-white group-hover:bg-gray-50 border-r border-gray-100 z-10">
                <div className="font-medium text-gray-800 text-sm">{vehicle.name}</div>
                <div className="text-xs text-gray-400 mt-0.5">{vehicle.plate_number}</div>
                <div className="mt-2 text-[10px] uppercase font-bold text-gray-400 tracking-wider">
                  Cap: {vehicle.capacity}
                </div>
              </div>

              <div className="flex-1 relative h-20 bg-[linear-gradient(90deg,transparent_0.95px,#f3f4f6_1px)]" style={{ backgroundSize: `${100 / TOTAL_HOURS}% 100%` }}>
                {/* Bookings */}
                {getDayBookings(vehicle.id).map(booking => {
                  const style = getBookingStyle(booking);
                  return (
                    <div
                      key={booking.id}
                      style={{ left: style.left, width: style.width }}
                      className={`${style.className} cursor-pointer hover:brightness-95 hover:shadow-md transition-all z-20`}
                      title={`${booking.purpose} (${format(new Date(booking.start_time), 'HH:mm')} - ${format(new Date(booking.end_time), 'HH:mm')})`}
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectBooking(booking);
                      }}
                    >
                      <span className="truncate">{booking.purpose}</span>
                    </div>
                  );
                })}

                {/* Clickable Slots for creation */}
                {timeSlots.slice(0, -1).map(hour => (
                  <div
                    key={hour}
                    className="absolute h-full top-0 hover:bg-blue-50/50 cursor-pointer transition-colors z-0"
                    style={{
                      left: `${((hour - START_HOUR) / TOTAL_HOURS) * 100}%`,
                      width: `${100 / TOTAL_HOURS}%`
                    }}
                    onClick={() => onBookSlot(vehicle.id, hour, currentDate)}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
      <style>{`
        .custom-scrollbar::-webkit-scrollbar { height: 8px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #e5e7eb; border-radius: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #d1d5db; }
      `}</style>
    </div>
  );
}
