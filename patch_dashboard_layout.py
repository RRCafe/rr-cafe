import re

with open('apps/admin/src/layouts/DashboardLayout.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

old_aside = """      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-gray-200 flex flex-col">
        <div className="h-16 flex items-center px-6 border-b border-gray-200">
          <h1 className="text-xl font-bold text-gray-800">RR Cafe Admin</h1>
        </div>
        
        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-colors ${
                  isActive 
                    ? 'bg-blue-50 text-blue-700' 
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                <Icon className="w-5 h-5" />
                {item.name}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-gray-200">
          <button
            onClick={handleSignOut}
            className="w-full flex items-center gap-3 px-4 py-3 text-red-600 hover:bg-red-50 rounded-lg font-medium transition-colors"
          >
            <LogOut className="w-5 h-5" />
            Sign Out
          </button>
        </div>
      </aside>"""

new_aside = """      {/* Sidebar */}
      <aside className="w-20 hover:w-64 transition-all duration-300 ease-in-out bg-white border-r border-gray-200 flex flex-col overflow-hidden group z-50 absolute h-full md:relative">
        <div className="h-16 flex items-center px-6 border-b border-gray-200 shrink-0 whitespace-nowrap">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold shrink-0">
            RR
          </div>
          <h1 className="text-xl font-bold text-gray-800 ml-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300">RR Cafe Admin</h1>
        </div>
        
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto overflow-x-hidden scrollbar-hide">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            
            return (
              <Link
                key={item.path}
                to={item.path}
                title={item.name}
                className={`flex items-center gap-3 px-3 py-3 rounded-lg font-medium transition-colors whitespace-nowrap ${
                  isActive 
                    ? 'bg-blue-50 text-blue-700' 
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                <Icon className="w-6 h-6 shrink-0" />
                <span className="opacity-0 group-hover:opacity-100 transition-opacity duration-300">{item.name}</span>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-gray-200 shrink-0">
          <button
            onClick={handleSignOut}
            title="Sign Out"
            className="w-full flex items-center gap-3 px-3 py-3 text-red-600 hover:bg-red-50 rounded-lg font-medium transition-colors whitespace-nowrap"
          >
            <LogOut className="w-6 h-6 shrink-0" />
            <span className="opacity-0 group-hover:opacity-100 transition-opacity duration-300">Sign Out</span>
          </button>
        </div>
      </aside>"""

content = content.replace(old_aside, new_aside)

with open('apps/admin/src/layouts/DashboardLayout.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
