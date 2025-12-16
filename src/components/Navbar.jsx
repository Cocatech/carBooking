import React from 'react';
import { LogOut, User, Car, Calendar } from 'lucide-react';

export default function Navbar({ session, userProfile, onLogout, currentView, onChangeView }) {
    const isAdmin = userProfile?.role === 'admin';

    return (
        <nav className="bg-white border-b border-gray-200 px-4 py-3 flex justify-between items-center shadow-sm">
            <div className="flex items-center gap-6">
                <div className="flex items-center gap-2 cursor-pointer" onClick={() => onChangeView('timeline')}>
                    <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold">
                        C
                    </div>
                    <h1 className="text-xl font-semibold text-gray-800 tracking-tight">CorporateCar</h1>
                </div>

                <div className="hidden md:flex items-center gap-1">
                    <button
                        onClick={() => onChangeView('timeline')}
                        className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${currentView === 'timeline' ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-50'
                            }`}
                    >
                        <Calendar size={18} />
                        Timeline
                    </button>
                    {isAdmin && (
                        <button
                            onClick={() => onChangeView('vehicles')}
                            className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${currentView === 'vehicles' ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-50'
                                }`}
                        >
                            <Car size={18} />
                            Vehicles
                        </button>
                    )}
                </div>
            </div>

            <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                    <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-gray-500">
                        <User size={18} />
                    </div>
                    <div className="hidden sm:flex flex-col items-end leading-tight">
                        <span>{userProfile?.full_name || session?.user?.email}</span>
                        {isAdmin && <span className="text-[10px] text-blue-600 font-bold uppercase tracking-wider">Admin</span>}
                    </div>
                </div>
                <button
                    onClick={onLogout}
                    className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                    title="Sign out"
                >
                    <LogOut size={20} />
                </button>
            </div>
        </nav>
    );
}
