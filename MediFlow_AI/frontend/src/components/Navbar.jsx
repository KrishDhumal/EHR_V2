import React from 'react';
import { Bell, Search, Sun, Moon, User } from 'lucide-react';
import { useThemeStore } from '../store/useThemeStore';
import { useUserStore } from '../store/useUserStore';

const Navbar = () => {
  const { theme, toggleTheme } = useThemeStore();
  const { user, logout } = useUserStore();

  return (
    <header className="h-16 glass-panel border-b border-l-0 flex items-center justify-between px-6 z-10 sticky top-0">
      <div className="flex items-center flex-1">
        <h2 className="font-display font-semibold text-text-primary md:hidden">MediFlow AI</h2>
      </div>

      <div className="flex items-center space-x-4">
        {user && (
          <div className="text-sm font-medium px-3 py-1 bg-primary/20 text-primary rounded-full">
            {user.role}
          </div>
        )}

        <button className="text-text-secondary hover:text-text-primary transition-colors">
          <Bell className="h-5 w-5" />
        </button>

        <button onClick={toggleTheme} className="text-text-secondary hover:text-primary transition-colors">
          {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
        </button>

        <div className="relative group cursor-pointer flex items-center">
          <div className="h-8 w-8 rounded-full bg-surface-secondary flex items-center justify-center border border-border-color">
            <User className="h-5 w-5 text-text-secondary" />
          </div>
          <button onClick={logout} className="ml-2 text-sm font-medium text-emergency hover:underline hidden md:block">
            Logout
          </button>
        </div>
      </div>
    </header>
  );
};

export default Navbar;

