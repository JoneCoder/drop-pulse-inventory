import { useState, useEffect } from 'react';
import { useSocket } from './context/SocketContext';
import { DropCard } from './components/DropCard';
import type { DropData } from './components/DropCard';
import { AuthModal } from './components/AuthModal';
import { CreateDropModal } from './components/CreateDropModal';
import { 
  Flame, 
  Plus, 
  LogIn, 
  LogOut, 
  User 
} from 'lucide-react';

interface ActivityLog {
  id: string;
  timestamp: string;
  message: string;
  type: 'info' | 'success' | 'warning';
}

const API_BASE = import.meta.env.VITE_API_URL || '';
const APP_NAME = import.meta.env.VITE_APP_NAME || 'SNEAKER DROP';

function App() {
  const [drops, setDrops] = useState<DropData[]>([]);
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [username, setUsername] = useState<string | null>(localStorage.getItem('username'));
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [_socketConnected, setSocketConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [_systemLogs, setSystemLogs] = useState<ActivityLog[]>([]);
  const [currentPath, setCurrentPath] = useState(window.location.pathname);

  const socket = useSocket();

  useEffect(() => {
    const handleLocationChange = () => {
      setCurrentPath(window.location.pathname);
    };
    window.addEventListener('popstate', handleLocationChange);
    return () => window.removeEventListener('popstate', handleLocationChange);
  }, []);


  // Load drops initially
  const fetchDrops = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/api/v1/drops`);
      const data = await response.json();
      if (response.ok) {
        setDrops(data);
      }
    } catch (error) {
      console.error('Error fetching sneaker drops:', error);
      addLog('Failed to fetch product releases from API', 'warning');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDrops();
    addLog('System initialized. Awaiting user events...', 'info');
  }, []);

  // Monitor socket status and stream live events to scrolling terminal log
  useEffect(() => {
    if (!socket) return;

    setSocketConnected(socket.connected);

    const handleConnect = () => {
      setSocketConnected(true);
      addLog('WebSocket channel connected successfully', 'success');
    };

    const handleDisconnect = () => {
      setSocketConnected(false);
      addLog('WebSocket channel disconnected', 'warning');
    };

    const handleStockUpdate = (data: { dropId: string; availableStock: number }) => {
      // Find drop name
      setDrops(prevDrops => {
        const found = prevDrops.find(d => d.id === data.dropId);
        if (found) {
          addLog(`[WS BROADCAST] Stock updated: "${found.name}" -> ${data.availableStock} remaining`, 'info');
        }
        return prevDrops.map(d => 
          d.id === data.dropId ? { ...d, available_stock: data.availableStock } : d
        );
      });
    };

    const handlePurchaseCompleted = (data: { dropId: string; username: string }) => {
      setDrops(prevDrops => {
        const found = prevDrops.find(d => d.id === data.dropId);
        if (found) {
          addLog(`[WS BROADCAST] Checkout complete: ${data.username} secured "${found.name}"`, 'success');
        }
        return prevDrops;
      });
      // Refresh to pull updated recent buyers feed
      fetchDrops();
    };

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.on('stock_updated', handleStockUpdate);
    socket.on('purchase_completed', handlePurchaseCompleted);

    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.off('stock_updated', handleStockUpdate);
      socket.off('purchase_completed', handlePurchaseCompleted);
    };
  }, [socket]);

  const addLog = (message: string, type: 'info' | 'success' | 'warning' = 'info') => {
    const newLog: ActivityLog = {
      id: Math.random().toString(36).substring(7),
      timestamp: new Date().toLocaleTimeString(),
      message,
      type
    };
    setSystemLogs(prev => [newLog, ...prev.slice(0, 49)]);
  };

  const handleAuthSuccess = (newToken: string, newUsername: string) => {
    setToken(newToken);
    setUsername(newUsername);
    addLog(`Signed in as user "${newUsername}"`, 'success');
    fetchDrops();
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('username');
    setToken(null);
    setUsername(null);
    addLog('User signed out. Local session terminated.', 'info');
  };

  if (currentPath !== '/' && currentPath !== '') {
    return (
      <div className="max-w-7xl mx-auto p-6 flex flex-col gap-6 box-border justify-center items-center min-h-[80vh]">
        <div className="bg-[#121218]/70 border border-white/5 rounded-2xl p-12 text-center backdrop-blur-xl animate-slide-up max-w-[500px]">
          <Flame size={48} className="text-rose-500 mx-auto" />
          <h2 className="text-3xl font-extrabold mt-5 mb-2.5 text-white">404 - LOST IN THE DROP</h2>
          <p className="mb-6 text-zinc-400 text-sm">
            The sneaker model or route you are looking for has been released or does not exist.
          </p>
          <a href="/" className="inline-flex items-center justify-center gap-2 font-semibold text-sm px-[18px] py-2.5 rounded-lg cursor-pointer transition-all duration-200 ease-out border border-transparent outline-none bg-[#8b5cf6] text-white shadow-[0_0_15px_rgba(139,92,246,0.3)] hover:bg-[#a78bfa] hover:-translate-y-0.5 hover:shadow-[0_0_22px_rgba(139,92,246,0.4)]" onClick={(e) => {
            e.preventDefault();
            window.history.pushState({}, '', '/');
            setCurrentPath('/');
          }}>
            Back to Dashboard
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6 flex flex-col gap-6 box-border">
      {/* Navigation Header */}
      <header className="flex justify-between items-center pb-5 border-b border-white/5 animate-slide-up">
        <div className="flex items-center gap-3">
          <Flame className="text-[#8b5cf6] animate-flicker" size={28} />
          <h1 className="text-2xl font-black m-0 tracking-widest text-white">
            {APP_NAME.split(' ')[0]}
            <span className="text-[#8b5cf6]">{APP_NAME.split(' ').slice(1).join(' ') ? ' ' + APP_NAME.split(' ').slice(1).join(' ') : ''}</span>
          </h1>
        </div>

        <div className="flex items-center">
          {token && username ? (
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 font-mono text-sm bg-white/3 px-3.5 py-2 rounded-lg border border-white/5 text-white">
                <User size={16} />
                <span>{username}</span>
              </div>
              <button onClick={() => setIsCreateOpen(true)} className="inline-flex items-center justify-center gap-2 font-semibold text-sm px-[18px] py-2.5 rounded-lg cursor-pointer transition-all duration-200 ease-out border border-transparent outline-none bg-white/5 border border-white/10 text-white hover:bg-white/10 hover:border-white/20">
                <Plus size={16} />
                <span>Add Release</span>
              </button>
              <button onClick={handleLogout} className="inline-flex items-center justify-center gap-2 font-semibold text-sm px-3 py-2.5 rounded-lg cursor-pointer transition-all duration-200 ease-out border border-transparent outline-none bg-[#18181b] border border-white/10 text-zinc-400 hover:bg-[#27272a] hover:text-white" title="Logout">
                <LogOut size={16} />
              </button>
            </div>
          ) : (
            <button onClick={() => setIsAuthOpen(true)} className="inline-flex items-center justify-center gap-2 font-semibold text-sm px-[18px] py-2.5 rounded-lg cursor-pointer transition-all duration-200 ease-out border border-transparent outline-none bg-[#8b5cf6] text-white shadow-[0_0_15px_rgba(139,92,246,0.3)] hover:bg-[#a78bfa] hover:-translate-y-0.5 hover:shadow-[0_0_22px_rgba(139,92,246,0.4)]">
              <LogIn size={16} />
              <span>Connect / Register</span>
            </button>
          )}
        </div>
      </header>

      {/* Main Storefront Area */}
      <main className="w-full">
        {/* Drops Grid */}
        <section className="flex flex-col">
          <div className="mb-5">
            <h2 className="text-xl font-extrabold m-0 mb-1 text-white tracking-wide">EXCLUSIVE RELEASES</h2>
            <p className="text-sm m-0 text-zinc-400">Browse our limited sneaker drops and secure your reservation hold.</p>
          </div>

          {loading ? (
            <div className="bg-[#121218]/70 border border-white/5 rounded-2xl p-12 text-center backdrop-blur-xl">
              <div className="w-8 h-8 border-2 border-white/5 border-t-[#8b5cf6] rounded-full mx-auto mb-4 animate-spin"></div>
              <p className="text-sm text-zinc-400">Checking live sneaker vaults...</p>
            </div>
          ) : drops.length === 0 ? (
            <div className="bg-[#121218]/70 border border-white/5 rounded-2xl p-12 text-center backdrop-blur-xl">
              <p className="text-base font-semibold mb-2">No sneaker drops currently active.</p>
              {token ? (
                <button onClick={() => setIsCreateOpen(true)} className="inline-flex items-center justify-center gap-2 font-semibold text-sm px-[18px] py-2.5 rounded-lg cursor-pointer transition-all duration-200 ease-out border border-transparent outline-none bg-[#8b5cf6] text-white shadow-[0_0_15px_rgba(139,92,246,0.3)] hover:bg-[#a78bfa] hover:-translate-y-0.5 hover:shadow-[0_0_22px_rgba(139,92,246,0.4)]">
                  Create First Drop
                </button>
              ) : (
                <p className="text-sm text-white/40 mb-4">Connect your account to launch simulated releases.</p>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-5">
              {drops.map((drop) => (
                <DropCard
                  key={drop.id}
                  drop={drop}
                  isLoggedIn={!!token}
                  onRequireAuth={() => setIsAuthOpen(true)}
                  onPurchaseSuccess={fetchDrops}
                />
              ))}
            </div>
          )}
        </section>
      </main>

      {/* Modals */}
      <AuthModal 
        isOpen={isAuthOpen} 
        onClose={() => setIsAuthOpen(false)} 
        onAuthSuccess={handleAuthSuccess} 
      />
      <CreateDropModal 
        isOpen={isCreateOpen} 
        onClose={() => setIsCreateOpen(false)} 
        onDropCreated={fetchDrops} 
      />
    </div>
  );
}

export default App;
