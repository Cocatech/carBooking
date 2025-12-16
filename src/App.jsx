import React, { useState, useEffect } from 'react';
import { supabase } from './lib/supabaseClient';
import Navbar from './components/Navbar';
import TimelineView from './components/TimelineView';
import BookingModal from './components/BookingModal';
import VehicleManager from './components/VehicleManager';
import { Loader2 } from 'lucide-react';
import { startOfDay } from 'date-fns';

function App() {
  const [session, setSession] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const [vehicles, setVehicles] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [currentDate, setCurrentDate] = useState(startOfDay(new Date()));

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [selectedBooking, setSelectedBooking] = useState(null);

  const [currentView, setCurrentView] = useState('timeline'); // 'timeline' or 'vehicles'

  // Auth State
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (!session) setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (!session) {
        setUserProfile(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Fetch Profile
  useEffect(() => {
    if (session?.user) {
      const fetchProfile = async () => {
        const { data } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();

        if (data) setUserProfile(data);
        setLoading(false);
      };
      fetchProfile();
    }
  }, [session]);

  // Data Fetching
  useEffect(() => {
    if (session) {
      fetchVehicles();
      fetchBookings();
    }
  }, [session, currentDate, currentView]);

  const fetchVehicles = async () => {
    let query = supabase.from('vehicles').select('*').order('id');
    const { data, error } = await query;
    if (error) console.error('Error fetching vehicles:', error);
    else setVehicles(data || []);
  };

  const fetchBookings = async () => {
    const start = new Date(currentDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(currentDate);
    end.setHours(23, 59, 59, 999);

    const { data, error } = await supabase
      .from('bookings')
      .select('*')
      .gte('start_time', start.toISOString())
      .lte('end_time', end.toISOString());

    if (error) console.error('Error fetching bookings:', error);
    else setBookings(data || []);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  const handleBookSlot = (vehicleId, hour, date) => {
    setSelectedSlot({ vehicleId, hour, date });
    setSelectedBooking(null);
    setIsModalOpen(true);
  };

  const handleBookingSuccess = () => {
    fetchBookings();
  };

  const handleLogin = async (provider) => {
    if (provider === 'azure') {
      await supabase.auth.signInWithOAuth({ provider: 'azure', options: { scopes: 'email' } });
    }
  };

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');

  const handleEmailLogin = async (e) => {
    e.preventDefault();
    setAuthError('');

    let finalEmail = email;
    if (!email.includes('@')) {
      finalEmail = `${email}@carbooking.com`;
    }

    const { error } = await supabase.auth.signInWithPassword({ email: finalEmail, password });
    if (error) setAuthError(error.message);
  };

  if (loading) {
    return <div className="h-screen w-screen flex items-center justify-center bg-gray-50"><Loader2 className="animate-spin text-blue-600" size={48} /></div>;
  }

  if (!session) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-gray-50">
        <div className="w-full max-w-md bg-white p-8 rounded-2xl shadow-xl">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-blue-600 rounded-2xl mx-auto flex items-center justify-center text-white text-2xl font-bold mb-4">C</div>
            <h1 className="text-2xl font-bold text-gray-900">Corporate Car Booking</h1>
            <p className="text-gray-500 mt-2">Sign in to manage vehicle bookings</p>
          </div>

          <div className="space-y-4">
            <button
              onClick={() => handleLogin('azure')}
              className="w-full py-2.5 px-4 border border-gray-300 rounded-lg flex items-center justify-center gap-2 hover:bg-gray-50 transition-colors font-medium text-gray-700"
            >
              <svg className="w-5 h-5" viewBox="0 0 23 23">
                <path fill="#f35325" d="M1 1h10v10H1z" />
                <path fill="#81bc06" d="M12 1h10v10H12z" />
                <path fill="#05a6f0" d="M1 12h10v10H1z" />
                <path fill="#ffba08" d="M12 12h10v10H12z" />
              </svg>
              Sign in with Microsoft 365
            </button>

            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-200"></div></div>
              <div className="relative flex justify-center text-sm"><span className="px-2 bg-white text-gray-500">Or use credentials</span></div>
            </div>

            <form onSubmit={handleEmailLogin} className="space-y-3">
              {authError && <div className="text-red-600 text-sm bg-red-50 p-2 rounded">{authError}</div>}
              <div>
                <input
                  type="text"
                  placeholder="Email or Keyword (e.g. admin)"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
              <div>
                <input
                  type="password"
                  placeholder="Password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
              <button type="submit" className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors">
                Sign In
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  const activeVehicles = vehicles.filter(v => v.status === 'active');

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Navbar
        session={session}
        userProfile={userProfile}
        onLogout={handleLogout}
        currentView={currentView}
        onChangeView={setCurrentView}
      />

      <main className="flex-1 p-4 md:p-6 overflow-hidden">
        <div className="h-full flex flex-col max-w-7xl mx-auto">
          {currentView === 'timeline' && (
            <TimelineView
              vehicles={activeVehicles}
              bookings={bookings}
              currentDate={currentDate}
              onDateChange={setCurrentDate}
              onBookSlot={handleBookSlot}
              onSelectBooking={(booking) => {
                setSelectedBooking(booking);
                setSelectedSlot(null);
                setIsModalOpen(true);
              }}
              session={session}
            />
          )}
          {currentView === 'vehicles' && (
            <VehicleManager
              vehicles={vehicles}
              onUpdate={fetchVehicles}
            />
          )}
        </div>
      </main>

      <BookingModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        selectedSlot={selectedSlot}
        selectedBooking={selectedBooking}
        onBookingSuccess={handleBookingSuccess}
        vehicles={activeVehicles}
        session={session}
        existingBookings={bookings}
        userProfile={userProfile}
      />
    </div>
  );
}

export default App;
