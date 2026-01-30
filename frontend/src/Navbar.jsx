import React from 'react'
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { Menu, X, LogOut, User as UserIcon, Sun, Moon, History } from 'lucide-react';

function Navbar() {
  const navigate = useNavigate();
  const { user, logout, isAuthenticated } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isAccountOpen, setIsAccountOpen] = useState(false);
  const [showBookingHistory, setShowBookingHistory] = useState(false);
  const [bookingHistory, setBookingHistory] = useState([]);
  const [theme, setTheme] = useState(() => {
    if (typeof window === 'undefined') return 'light';
    const saved = localStorage.getItem('theme');
    if (saved === 'light' || saved === 'dark') return saved;
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light';
  });

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') root.classList.add('dark');
    else root.classList.remove('dark');
    localStorage.setItem('theme', theme);
  }, [theme]);

  // Load booking history from localStorage
  useEffect(() => {
    if (user) {
      const savedHistory = localStorage.getItem(`bookingHistory_${user.email}`);
      if (savedHistory) {
        try {
          setBookingHistory(JSON.parse(savedHistory));
        } catch (e) {
          console.log('Error loading booking history');
        }
      }
    }
  }, [user]);

  // // Handle modal backdrop blur
  // useEffect(() => {
  //   if (showBookingHistory) {
  //     document.body.classList.add('modal-open');
  //   } else {
  //     document.body.classList.remove('modal-open');
  //   }
  //   return () => document.body.classList.remove('modal-open');
  // }, [showBookingHistory]);

  const scrollToFeatures = () => {
    const featuresSection = document.getElementById("features-section");
    if (featuresSection) {
      featuresSection.scrollIntoView({ behavior: "smooth" });
    }
  };

  const handleLogout = () => {
    logout();
    navigate("/");
    setIsMenuOpen(false);
    setIsAccountOpen(false);
  };

  const toggleTheme = () => setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));

  return (
    <div className="w-full">
      <header className={`w-full flex justify-between items-center py-6 px-8 max-w-7xl mx-auto transition-all ${showBookingHistory ? 'blur-sm pointer-events-none' : ''}`}>
      {/* <header className="w-full flex justify-between items-center py-6 px-8 max-w-7xl mx-auto"> */}
        {/* Left side - Brand name */}
        <a href="/" className="shrink-0">
          <h1 className="text-2xl font-bold text-[#0b2545]">EzyWork</h1>
        </a>
        
        {/* Right side - Navigation and Auth buttons - Desktop */}
        <div className="hidden md:flex items-center gap-8">
          <nav className="flex gap-8 text-gray-700 items-center">
            <button onClick={scrollToFeatures} className="hover:text-black transition-colors">
              Features
            </button>
          </nav>

          <button
            onClick={toggleTheme}
            className="p-2 rounded-md border border-gray-200 hover:bg-gray-100 transition-colors"
            title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            aria-label="Toggle color mode"
          >
            {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>
          
          {isAuthenticated && user ? (
            <div className="relative">
              <button
                onClick={() => setIsAccountOpen((s) => !s)}
                className="flex items-center gap-2 text-gray-700 hover:text-black transition-colors"
                aria-haspopup="menu"
                aria-expanded={isAccountOpen}
              >
                <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-semibold">
                  {user.name?.charAt(0).toUpperCase() || 'U'}
                </div>
                <span className="text-gray-700 font-medium">{user.name}</span>
              </button>

              {isAccountOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-[#0f172a] border border-gray-200 dark:border-slate-800 rounded-md shadow-lg py-2 z-50">
                  <button
                    onClick={() => {
                      navigate(user.role === 'worker' ? '/worker' : '/user');
                      setIsAccountOpen(false);
                    }}
                    className="w-full px-4 py-2 flex items-center gap-2 text-left text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors"
                  >
                    <UserIcon className="w-4 h-4" />
                    Profile
                  </button>
                  <button
                    onClick={() => {
                      setShowBookingHistory(true);
                      setIsAccountOpen(false);
                    }}
                    className="w-full px-4 py-2 flex items-center gap-2 text-left text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors"
                  >
                    <History className="w-4 h-4" />
                    Booking History
                  </button>
                  <button
                    onClick={handleLogout}
                    className="w-full px-4 py-2 flex items-center gap-2 text-left text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    Logout
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="flex gap-4 items-center">
              <button className="text-gray-700 hover:text-black transition-colors" onClick={() => navigate("/sign")}>
                Login
              </button>
              <button
                className="bg-[#0b2545] text-white px-6 py-2 rounded-md hover:bg-[#14365b] transition-colors"
                onClick={() => navigate("/sign")}
              >
                Sign Up
              </button>
            </div>
          )}
        </div>

        {/* Mobile menu button */}
        <button
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          className="md:hidden text-gray-700 hover:text-black"
        >
          {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </header>

      {/* Mobile menu */}
      {isMenuOpen && (
        <div className="md:hidden bg-white border-t border-gray-200 px-8 py-4 space-y-4">
          <button
            onClick={scrollToFeatures}
            className="block w-full text-left text-gray-700 hover:text-black py-2 transition-colors"
          >
            Features
          </button>

          <button
            onClick={toggleTheme}
            className="flex items-center gap-2 text-gray-700 hover:text-black py-2 transition-colors"
            aria-label="Toggle color mode"
          >
            {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
          </button>
          
          {isAuthenticated && user ? (
            <>
              <div className="border-t border-gray-200 py-2">
                <p className="text-sm text-gray-600 mb-3">Logged in as: <strong>{user.name}</strong></p>
              </div>
              <button
                onClick={() => {
                  navigate(user.role === 'worker' ? '/worker' : '/user');
                  setIsMenuOpen(false);
                }}
                className="block w-full text-left text-gray-700 hover:text-black py-2 transition-colors"
              >
                View Profile
              </button>
              <button
                onClick={handleLogout}
                className="block w-full text-left text-red-600 hover:text-red-700 py-2 transition-colors font-medium"
              >
                Logout
              </button>
            </>
          ) : (
            <>
              <button
                className="block w-full text-left text-gray-700 hover:text-black py-2 transition-colors"
                onClick={() => {
                  navigate("/sign");
                  setIsMenuOpen(false);
                }}
              >
                Login
              </button>
              <button
                className="block w-full text-center bg-[#0b2545] text-white px-4 py-2 rounded-md hover:bg-[#14365b] transition-colors"
                onClick={() => {
                  navigate("/sign");
                  setIsMenuOpen(false);
                }}
              >
                Sign Up
              </button>
            </>
          )}
        </div>
      )}

      {/* Booking History Modal */}
      {showBookingHistory && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-[#0f172a] rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <div className="sticky top-0 bg-white dark:bg-[#0f172a] border-b border-gray-200 dark:border-slate-800 p-6 flex justify-between items-center">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Booking History</h2>
              <button
                onClick={() => setShowBookingHistory(false)}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {bookingHistory.length === 0 ? (
                <p className="text-center text-gray-500 dark:text-gray-400 py-8">No bookings yet</p>
              ) : (
                bookingHistory.map((booking, idx) => (
                  <div key={idx} className="bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg p-5">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 uppercase font-semibold">Worker Name</p>
                        <p className="text-lg font-semibold text-gray-900 dark:text-white">{booking.workerName}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 uppercase font-semibold">Email</p>
                        <p className="text-lg font-semibold text-gray-900 dark:text-white">{booking.workerEmail}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 uppercase font-semibold">Date & Time</p>
                        <p className="text-lg font-semibold text-gray-900 dark:text-white">{booking.dateTime}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 uppercase font-semibold">Problem</p>
                        <p className="text-lg font-semibold text-gray-900 dark:text-white">{booking.problem}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 uppercase font-semibold">Status</p>
                        <p className={`text-lg font-semibold ${booking.status === 'completed' ? 'text-green-600 dark:text-green-400' : 'text-yellow-600 dark:text-yellow-400'}`}>
                          {booking.status}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 uppercase font-semibold">Price</p>
                        <p className="text-lg font-semibold text-gray-900 dark:text-white">{booking.price}</p>
                      </div>
                    </div>
                    
                    {booking.status === 'pending' && (
                      <button
                        onClick={() => {
                          setShowBookingHistory(false);
                          navigate('/payment', { state: { worker: { name: booking.workerName, email: booking.workerEmail }, problem: booking.problem } });
                        }}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-md transition-colors"
                      >
                        Pay Now
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Navbar

