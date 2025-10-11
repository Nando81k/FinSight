import { ReactNode, Fragment } from 'react';
import { NavLink } from 'react-router-dom';
import { Menu, Transition } from '@headlessui/react';
import { 
  BanknotesIcon, 
  UserCircleIcon,
  ArrowRightOnRectangleIcon,
  CurrencyDollarIcon,
} from '@heroicons/react/24/outline';
import { useAuth } from '../context/AuthContext';

interface LayoutProps {
  children: ReactNode;
}

const navigation = [
  { name: 'Household', href: '/', icon: CurrencyDollarIcon },
  { name: 'Financial Calculator', href: '/salary', icon: BanknotesIcon },
];

export function Layout({ children }: LayoutProps) {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Navigation */}
      <nav className="bg-gray-800 border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex">
              <div className="flex-shrink-0 flex items-center">
                <CurrencyDollarIcon className="h-8 w-8 text-blue-400 mr-2" />
                <h1 className="text-xl font-bold text-white">
                  <span className="text-blue-400">Fin</span>Sight
                </h1>
              </div>
              <div className="hidden md:ml-6 md:flex md:space-x-8">
                {navigation.map((item) => (
                  <NavLink
                    key={item.name}
                    to={item.href}
                    className={({ isActive }) =>
                      `inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${
                        isActive
                          ? 'border-blue-500 text-white'
                          : 'border-transparent text-gray-300 hover:border-gray-300 hover:text-white'
                      }`
                    }
                  >
                    <item.icon className="h-4 w-4 mr-2" />
                    {item.name}
                  </NavLink>
                ))}
              </div>
            </div>
            
            {/* User Menu - Only shows when authenticated */}
            <div className="hidden md:ml-6 md:flex md:items-center md:space-x-4">
              <Menu as="div" className="relative ml-3">
                <div>
                  <Menu.Button className="bg-gray-800 flex text-sm rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-white">
                    <span className="sr-only">Open user menu</span>
                    <div className="h-8 w-8 rounded-full bg-blue-600 flex items-center justify-center">
                      <span className="text-white text-sm font-medium">
                        {user?.firstName?.[0]?.toUpperCase() || '?'}
                      </span>
                    </div>
                  </Menu.Button>
                </div>
                <Transition
                  as={Fragment}
                  enter="transition ease-out duration-200"
                  enterFrom="transform opacity-0 scale-95"
                  enterTo="transform opacity-100 scale-100"
                  leave="transition ease-in duration-75"
                  leaveFrom="transform opacity-100 scale-100"
                  leaveTo="transform opacity-0 scale-95"
                >
                  <Menu.Items className="origin-top-right absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 focus:outline-none">
                    <div className="py-1">
                      <div className="px-4 py-2 border-b border-gray-100">
                        <p className="text-sm font-medium text-gray-900">
                          {user?.firstName} {user?.lastName}
                        </p>
                        <p className="text-sm text-gray-500">{user?.email}</p>
                      </div>
                      <Menu.Item>
                        {({ active }) => (
                          <NavLink
                            to="/profile"
                            className={`${
                              active ? 'bg-gray-100' : ''
                            } flex items-center px-4 py-2 text-sm text-gray-700`}
                          >
                            <UserCircleIcon className="h-4 w-4 mr-3" />
                            Your Profile
                          </NavLink>
                        )}
                      </Menu.Item>
                      <Menu.Item>
                        {({ active }) => (
                          <button
                            onClick={logout}
                            className={`${
                              active ? 'bg-gray-100' : ''
                            } w-full text-left flex items-center px-4 py-2 text-sm text-gray-700`}
                          >
                            <ArrowRightOnRectangleIcon className="h-4 w-4 mr-3" />
                            Sign out
                          </button>
                        )}
                      </Menu.Item>
                    </div>
                  </Menu.Items>
                </Transition>
              </Menu>
              
              <span className="text-gray-300 text-sm hidden lg:block">
                Welcome, {user?.firstName}!
              </span>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {children}
        </div>
      </main>
    </div>
  );
}