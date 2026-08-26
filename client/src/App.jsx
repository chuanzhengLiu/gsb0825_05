import React from 'react';
import { BrowserRouter, Routes, Route, Link, Navigate } from 'react-router-dom';
import { Feather, Home, Box, Clock, BarChart3, Heart, Image as ImageIcon, User, LogOut, Menu, X } from 'lucide-react';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './pages/Login';
import Register from './pages/Register';
import Patterns from './pages/Patterns';
import PatternDetail from './pages/PatternDetail';
import Materials from './pages/Materials';
import TimerPage from './pages/TimerPage';
import Stats from './pages/Stats';
import Favorites from './pages/Favorites';
import Gallery from './pages/Gallery';
import Profile from './pages/Profile';

function NavLink({ to, icon: Icon, children }) {
  return (
    <Link
      to={to}
      className="flex items-center gap-2 px-3 py-2 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors"
    >
      <Icon size={18} />
      <span>{children}</span>
    </Link>
  );
}

function Layout() {
  const { user, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = React.useState(false);

  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="bg-flytie-primary p-2 rounded-lg">
              <Feather className="text-white" size={20} />
            </div>
            <span className="text-xl font-bold text-flytie-dark">FlyTie Atlas</span>
          </Link>

          <nav className="hidden md:flex items-center gap-1">
            <NavLink to="/" icon={Home}>毛钩库</NavLink>
            <NavLink to="/materials" icon={Box}>材料库存</NavLink>
            <NavLink to="/timer" icon={Clock}>计时器</NavLink>
            <NavLink to="/stats" icon={BarChart3}>统计</NavLink>
            <NavLink to="/favorites" icon={Heart}>收藏夹</NavLink>
            <NavLink to="/gallery" icon={ImageIcon}>社区</NavLink>
          </nav>

          <div className="hidden md:flex items-center gap-3">
            {user ? (
              <>
                <Link to="/profile" className="flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-flytie-primary">
                  <User size={18} />
                  {user.nickname}
                </Link>
                <button onClick={logout} className="btn-secondary flex items-center gap-1 text-sm">
                  <LogOut size={16} /> 退出
                </button>
              </>
            ) : (
              <Link to="/login" className="btn-primary">登录</Link>
            )}
          </div>

          <button className="md:hidden p-2" onClick={() => setMobileOpen(!mobileOpen)}>
            {mobileOpen ? <X /> : <Menu />}
          </button>
        </div>

        {mobileOpen && (
          <div className="md:hidden border-t border-gray-200 bg-white px-4 py-3 space-y-1">
            <NavLink to="/" icon={Home}>毛钩库</NavLink>
            <NavLink to="/materials" icon={Box}>材料库存</NavLink>
            <NavLink to="/timer" icon={Clock}>计时器</NavLink>
            <NavLink to="/stats" icon={BarChart3}>统计</NavLink>
            <NavLink to="/favorites" icon={Heart}>收藏夹</NavLink>
            <NavLink to="/gallery" icon={ImageIcon}>社区</NavLink>
            {user && <NavLink to="/profile" icon={User}>个人中心</NavLink>}
            {user && (
              <button onClick={logout} className="w-full flex items-center gap-2 px-3 py-2 text-red-600">
                <LogOut size={18} /> 退出登录
              </button>
            )}
          </div>
        )}
      </header>

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-6">
        <Routes>
          <Route path="/" element={<Patterns />} />
          <Route path="/patterns/:slug" element={<PatternDetail />} />
          <Route path="/materials" element={<Materials />} />
          <Route path="/timer" element={<TimerPage />} />
          <Route path="/stats" element={<Stats />} />
          <Route path="/favorites" element={<Favorites />} />
          <Route path="/gallery" element={<Gallery />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </main>

      <footer className="bg-white border-t border-gray-200 py-6">
        <div className="max-w-7xl mx-auto px-4 text-center text-sm text-gray-500">
          © 2026 FlyTie Atlas. 专为飞蝇钓爱好者打造。
        </div>
      </footer>
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Layout />
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
