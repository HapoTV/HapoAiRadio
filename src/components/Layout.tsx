import React from 'react';
import React, { Fragment, useState, useEffect } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import {
Bars3Icon,
HomeIcon,
MusicalNoteIcon,
BuildingStorefrontIcon,
XMarkIcon,
ArrowRightOnRectangleIcon,
ChevronDoubleLeftIcon,
ChevronDoubleRightIcon,
RadioIcon,
UsersIcon,
QueueListIcon,
ChartBarIcon,
CalendarIcon,
MegaphoneIcon,
SignalIcon,
} from '@heroicons/react/24/outline';
import { Link, useLocation, useNavigate, Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useAudio } from '../contexts/AudioContext';
import toast from 'react-hot-toast';
import Header from './Header';
import { QueueList } from './QueueManager';

const navigation = [
{ name: 'Dashboard', href: '/', icon: HomeIcon },
{ name: 'Music Library', href: '/library', icon: MusicalNoteIcon },
{ name: 'Commercial Library', href: '/commercials', icon: MegaphoneIcon },
{ name: 'Music Radio', href: '/radio', icon: RadioIcon },
{ name: 'Music Player', href: '/player', icon: QueueListIcon },
{ name: 'Scheduling', href: '/scheduling', icon: CalendarIcon },
{ name: 'Stores', href: '/stores', icon: BuildingStorefrontIcon },
{ name: 'Radio Control', href: '/control', icon: SignalIcon },
{ name: 'Analytics', href: '/analytics', icon: ChartBarIcon },
{ name: 'Individual Subscribers', href: '/subscriber', icon: UsersIcon },
];

export default function Layout({ children }: { children?: React.ReactNode }) {
const [sidebarOpen, setSidebarOpen] = useState(false);
const [isCollapsed, setIsCollapsed] = useState(false);
const [showQueue, setShowQueue] = useState(false);
const location = useLocation();
const navigate = useNavigate();
const { user, signOut } = useAuth();
const { currentTrack } = useAudio();

// Adjust bottom padding when music is playing
const [contentPadding, setContentPadding] = useState('pb-0');

useEffect(() => {
// Add padding to the bottom of the content when music is playing
if (currentTrack) {
setContentPadding('pb-20');
} else {
setContentPadding('pb-0');
}
}, [currentTrack]);

const handleSignOut = async () => {
try {
if (!user) {
navigate('/login');
return;
}


  await signOut();
  navigate('/login');
  toast.success('Successfully signed out');
} catch (error: any) {
  if (error.message?.includes('Auth session missing') || 
      error.message?.includes('session_not_found')) {
    navigate('/login');
    toast.success('Signed out');
  } else {
    console.error('Error signing out:', error);
    toast.error('Failed to sign out');
  }
}
};

return (
<>
<div className="flex h-screen bg-black">
{/* Mobile sidebar */}
<Transition.Root show={sidebarOpen} as={Fragment}>
<Dialog as="div" className="relative z-50 lg:hidden" onClose={setSidebarOpen}>
<Transition.Child
as={Fragment}
enter="transition-opacity ease-linear duration-300"
enterFrom="opacity-0"
enterTo="opacity-100"
leave="transition-opacity ease-linear duration-300"
leaveFrom="opacity-100"
leaveTo="opacity-0"
>
<div className="fixed inset-0 bg-black/80" aria-hidden="true" />
</Transition.Child>


Collapse
        <div className="fixed inset-0 flex">
          <Transition.Child
            as={Fragment}
            enter="transition ease-in-out duration-300 transform"
            enterFrom="-translate-x-full"
            enterTo="translate-x-0"
            leave="transition ease-in-out duration-300 transform"
            leaveFrom="translate-x-0"
            leaveTo="-translate-x-full"
          >
            <Dialog.Panel className="relative mr-16 flex w-full max-w-xs flex-1">
              <div className="flex grow flex-col gap-y-5 overflow-y-auto bg-black px-6 pb-4">
                <div className="flex h-16 shrink-0 items-center justify-between">
                  <h1 className="text-2xl font-bold text-white tracking-tight font-serif">HAPO RADIO</h1>
                  <button
                    type="button"
                    className="-m-2.5 p-2.5"
                    onClick={() => setSidebarOpen(false)}
                  >
                    <XMarkIcon className="h-6 w-6 text-gray-400" />
                  </button>
                </div>
                <nav className="flex-1">
                  {navigation.map((item) => (
                    <Link
                      key={item.name}
                      to={item.href}
                      className={`
                        flex items-center px-4 py-3 rounded-lg transition-colors
                        ${location.pathname === item.href
                          ? 'bg-gray-800 text-white'
                          : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                        }
                      `}
                    >
                      <item.icon className="h-5 w-5 shrink-0" />
                      <span className="ml-3 font-medium">{item.name}</span>
                    </Link>
                  ))}
                </nav>
                <div className="border-t border-gray-800 pt-4">
                  <button
                    onClick={handleSignOut}
                    className="flex w-full items-center px-4 py-3 rounded-lg text-gray-400 hover:bg-gray-800 hover:text-red-500 transition-colors"
                  >
                    <ArrowRightOnRectangleIcon className="h-5 w-5 shrink-0" />
                    <span className="ml-3 font-medium">Sign out</span>
                  </button>
                </div>
              </div>
            </Dialog.Panel>
          </Transition.Child>
        </div>
      </Dialog>
    </Transition.Root>

    {/* Desktop sidebar */}
    <div
      className={`hidden lg:fixed lg:inset-y-0 lg:flex lg:flex-col transition-all duration-300 ease-in-out
        ${isCollapsed ? 'lg:w-20' : 'lg:w-64'}
      `}
    >
      <div className="flex grow flex-col gap-y-5 overflow-y-auto bg-black border-r border-gray-800">
        <div className="flex h-16 shrink-0 items-center justify-between px-6">
          {!isCollapsed && (
            <h1 className="text-2xl font-bold text-white tracking-tight font-serif">HAPO RADIO</h1>
          )}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className={`p-2 hover:bg-gray-800 rounded-lg transition-colors ${isCollapsed ? 'w-full flex justify-center' : ''}`}
            title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {isCollapsed ? (
              <ChevronDoubleRightIcon className="h-5 w-5 text-gray-400" />
            ) : (
              <ChevronDoubleLeftIcon className="h-5 w-5 text-gray-400" />
            )}
          </button>
        </div>

        <nav className="flex-1 px-4">
          {navigation.map((item) => (
            <Link
              key={item.name}
              to={item.href}
              className={`
                group relative flex items-center px-4 py-3 rounded-lg transition-colors
                ${location.pathname === item.href
                  ? 'bg-gray-800 text-white'
                  : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                }
                ${isCollapsed ? 'justify-center' : ''}
              `}
              title={isCollapsed ? item.name : undefined}
            >
              <item.icon className={`h-5 w-5 shrink-0 ${isCollapsed ? 'transition-transform group-hover:scale-110' : ''}`} />
              {!isCollapsed && <span className="ml-3 font-medium">{item.name}</span>}
              {isCollapsed && (
                <span className="absolute left-full ml-2 w-auto min-w-max rounded bg-gray-800 px-2 py-1 text-xs font-medium text-white opacity-0 translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all">
                  {item.name}
                </span>
              )}
            </Link>
          ))}
        </nav>

        <div className="border-t border-gray-800 p-4">
          <button
            onClick={handleSignOut}
            className={`
              group relative flex w-full items-center px-4 py-3 rounded-lg text-gray-400 
              hover:bg-gray-800 hover:text-red-500 transition-colors
              ${isCollapsed ? 'justify-center' : ''}
            `}
            title={isCollapsed ? 'Sign out' : undefined}
          >
            <ArrowRightOnRectangleIcon className={`h-5 w-5 shrink-0 ${isCollapsed ? 'transition-transform group-hover:scale-110' : ''}`} />
            {!isCollapsed && <span className="ml-3 font-medium">Sign out</span>}
            {isCollapsed && (
              <span className="absolute left-full ml-2 w-auto min-w-max rounded bg-gray-800 px-2 py-1 text-xs font-medium text-white opacity-0 translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all">
                Sign out
              </span>
            )}
          </button>
        </div>
      </div>
    </div>

    {/* Main content */}
    <div className={`flex flex-1 flex-col transition-all duration-300 ease-in-out ${isCollapsed ? 'lg:pl-20' : 'lg:pl-64'}`}>
      <Header />

      <div className="sticky top-0 z-40 flex h-16 shrink-0 items-center gap-x-4 border-b border-gray-800 bg-black px-4 shadow-sm sm:gap-x-6 sm:px-6 lg:px-8">
        <button
          type="button"
          className="-m-2.5 p-2.5 text-gray-400 lg:hidden"
          onClick={() => setSidebarOpen(true)}
        >
          <span className="sr-only">Open sidebar</span>
          <Bars3Icon className="h-6 w-6" aria-hidden="true" />
        </button>

        <div className="h-6 w-px bg-gray-800 lg:hidden" aria-hidden="true" />

        <div className="flex flex-1 gap-x-4 self-stretch lg:gap-x-6">
          <div className="flex flex-1" />
          <div className="flex items-center gap-x-4 lg:gap-x-6">
            <button
              className="p-2 text-gray-400 hover:text-gray-300"
              onClick={() => setShowQueue(!showQueue)}
              aria-label="Toggle queue"
            >
              <QueueListIcon className="h-6 w-6" />
            </button>
          </div>
        </div>
      </div>

      <main className={`flex-1 p-8 bg-gray-900 ${contentPadding}`}>
        {children || <Outlet />}
      </main>
    </div>

    {/* Queue sidebar */}
    <Transition
      show={showQueue}
      as={Fragment}
      enter="transform transition ease-in-out duration-300"
      enterFrom="translate-x-full"
      enterTo="translate-x-0"
      leave="transform transition ease-in-out duration-300"
      leaveFrom="translate-x-0"
      leaveTo="translate-x-full"
    >
      <div className="fixed inset-y-0 right-0 w-96 bg-primary-800 shadow-xl z-40">
        <div className="h-full flex flex-col">
          <div className="flex items-center justify-between p-4 border-b border-primary-700">
            <h2 className="text-lg font-medium text-primary-50">Queue</h2>
            <button
              onClick={() => setShowQueue(false)}
              className="p-2 text-primary-400 hover:text-primary-300"
              aria-label="Close queue"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>
          <QueueList />
        </div>
      </div>
    </Transition>
  </div>
</>
);
}