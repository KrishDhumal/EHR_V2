import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Users, UserPlus, Stethoscope, Bed, Receipt, ActivitySquare } from 'lucide-react';
import clsx from 'clsx';

const navItems = [
  { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
  { name: 'Registration', path: '/registration', icon: UserPlus },
  { name: 'Doctors & Queue', path: '/doctors', icon: Stethoscope },
  { name: 'Diagnostics', path: '/diagnostics', icon: ActivitySquare },
  { name: 'Bed Management', path: '/beds', icon: Bed },
  { name: 'Billing', path: '/billing', icon: Receipt },
];

const Sidebar = () => {
  return (
    <aside className="w-64 glass-panel border-r shrink-0 flex flex-col hidden md:flex z-20 h-full">
      <div className="h-16 flex items-center px-6 border-b border-border-color">
        <ActivitySquare className="h-8 w-8 text-primary mr-3" />
        <span className="font-display font-bold text-xl text-primary tracking-tight">MediFlow AI</span>
      </div>
      <div className="flex-1 overflow-y-auto py-4">
        <nav className="space-y-1 px-3">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.name}
                to={item.path}
                className={({ isActive }) => clsx(
                  "group flex items-center px-3 py-2 text-sm font-medium rounded-md transition-all duration-200",
                  isActive 
                    ? "bg-primary/10 text-primary border-l-4 border-primary" 
                    : "text-text-secondary hover:bg-surface-secondary hover:text-text-primary"
                )}
              >
                <Icon className={clsx("mr-3 flex-shrink-0 h-5 w-5")} aria-hidden="true" />
                {item.name}
              </NavLink>
            );
          })}
        </nav>
      </div>
    </aside>
  );
};

export default Sidebar;

