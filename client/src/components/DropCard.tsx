import React, { useState, useEffect, useRef } from 'react';
import { useSocket } from '../context/SocketContext';
import { ShoppingBag, Timer, ShieldAlert, Award } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL || '';

export interface DropData {
  id: string;
  name: string;
  price: number;
  total_stock: number;
  available_stock: number;
  start_time: string;
  purchases?: Array<{
    id: string;
    user?: {
      username: string;
    };
  }>;
}

interface DropCardProps {
  drop: DropData;
  isLoggedIn: boolean;
  onRequireAuth: () => void;
  onPurchaseSuccess?: () => void;
}

export const DropCard: React.FC<DropCardProps> = ({ drop, isLoggedIn, onRequireAuth, onPurchaseSuccess }) => {
  const [stock, setStock] = useState(drop.available_stock);
  const [purchasers, setPurchasers] = useState<Array<string>>(() => {
    return drop.purchases?.map((p) => p.user?.username || 'Buyer') || [];
  });
  const [reservationId, setReservationId] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [timeUntilStart, setTimeUntilStart] = useState<number>(0);

  const socket = useSocket();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync initial stock & purchasers when drop changes
  useEffect(() => {
    setStock(drop.available_stock);
    setPurchasers(drop.purchases?.map((p) => p.user?.username || 'Buyer') || []);
  }, [drop]);

  // Socket listener for real-time changes
  useEffect(() => {
    if (!socket) return;

    const onStockUpdate = (data: { dropId: string; availableStock: number }) => {
      if (data.dropId === drop.id) {
        setStock(data.availableStock);
        // If stock goes up, it means someone's reservation expired
        if (data.availableStock > stock) {
          showToast('Reservation expired. Sneaker returned to pool.', 'error');
        }
      }
    };

    const onPurchaseCompleted = (data: { dropId: string; username: string }) => {
      if (data.dropId === drop.id) {
        setPurchasers((prev) => [data.username, ...prev.slice(0, 2)]);
        showToast(`⚡ ${data.username} secured a pair!`, 'success');
      }
    };

    socket.on('stock_updated', onStockUpdate);
    socket.on('purchase_completed', onPurchaseCompleted);

    return () => {
      socket.off('stock_updated', onStockUpdate);
      socket.off('purchase_completed', onPurchaseCompleted);
    };
  }, [socket, drop.id, stock]);

  // Countdown timer for drop launch
  useEffect(() => {
    const calculateTimeRemaining = () => {
      const diff = new Date(drop.start_time).getTime() - Date.now();
      setTimeUntilStart(diff > 0 ? diff : 0);
    };

    calculateTimeRemaining();
    const interval = setInterval(calculateTimeRemaining, 1000);

    return () => clearInterval(interval);
  }, [drop.start_time]);

  // Countdown timer for reservation holds (60 seconds)
  useEffect(() => {
    if (timeLeft <= 0) {
      if (reservationId) {
        setReservationId(null);
        showToast('Hold expired! The pair was released.', 'error');
      }
      return;
    }

    timerRef.current = setTimeout(() => {
      setTimeLeft((prev) => prev - 1);
    }, 1000);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [timeLeft, reservationId]);

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const handleReserve = async () => {
    if (!isLoggedIn) {
      onRequireAuth();
      return;
    }

    if (stock <= 0) {
      showToast('This drop is sold out!', 'error');
      return;
    }

    if (timeUntilStart > 0) {
      showToast('This drop is scheduled for release soon!', 'error');
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE}/api/v1/drops/reserve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ drop_id: drop.id })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Reservation failed');
      }

      setReservationId(data.reservation_id);
      setTimeLeft(60);
      showToast('Sneaker reserved! Secure your order within 60s.', 'success');
    } catch (err: any) {
      showToast(err.message || 'Error creating hold', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handlePurchase = async () => {
    if (!reservationId) return;

    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE}/api/v1/drops/purchase`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ reservation_id: reservationId })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Purchase checkout failed');
      }

      setReservationId(null);
      setTimeLeft(0);
      showToast('Order confirmed! Check your profile.', 'success');
      if (onPurchaseSuccess) {
        onPurchaseSuccess();
      }
    } catch (err: any) {
      showToast(err.message || 'Error processing purchase', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Stock levels percentages for custom colored gauge
  const stockRatio = stock / drop.total_stock;
  const isSoldOut = stock <= 0;
  const isIncoming = timeUntilStart > 0;
  const isLowStock = stock > 0 && stock <= 3;

  // Format incoming schedule timer
  const formatStartCountdown = (ms: number) => {
    const totalSecs = Math.floor(ms / 1000);
    const hours = Math.floor(totalSecs / 3600);
    const minutes = Math.floor((totalSecs % 3600) / 60);
    const seconds = totalSecs % 60;

    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className={`bg-[#121218]/70 border rounded-2xl overflow-hidden flex flex-col backdrop-blur-xl transition-all duration-300 relative hover:-translate-y-1 hover:border-white/15 hover:shadow-[0_10px_30px_rgba(0,0,0,0.5)] ${isSoldOut ? 'opacity-85' : ''} ${reservationId ? 'border-amber-500 shadow-[0_0_20px_rgba(245,158,11,0.15)]' : 'border-white/5'}`}>
      {toast && (
        <div className={`absolute top-3 left-3 right-3 z-10 text-xs font-semibold p-2 rounded-lg backdrop-blur-md text-center shadow-[0_4px_15px_rgba(0,0,0,0.3)] animate-fade-in ${toast.type === 'success' ? 'bg-emerald-500/95 text-white' : 'bg-rose-500/95 text-white'}`}>
          {toast.message}
        </div>
      )}

      {/* Sneaker Visual Asset Mock (SVG/CSS illustration of premium shoe box) */}
      <div className="h-[140px] bg-gradient-to-br from-white/[0.01] to-white/[0.03] border-b border-white/5 flex items-center justify-center relative overflow-hidden">
        <div className="w-20 h-20 rounded-2xl bg-white/[0.03] border border-white/[0.05] flex items-center justify-center relative z-10">
          <div className="absolute w-[120px] h-[120px] bg-[radial-gradient(circle,rgba(139,92,246,0.15)_0%,transparent_70%)] z-0"></div>
          <ShoppingBag size={48} className="text-[#8b5cf6] drop-shadow-[0_4px_10px_rgba(139,92,246,0.4)] relative z-10" />
          <div className="absolute bottom-2 right-2 text-[8px] font-mono bg-white/5 px-1.5 py-0.5 rounded tracking-widest text-white/60">RETAIL</div>
        </div>
      </div>

      <div className="p-5 flex flex-col gap-4 flex-1">
        <h3 className="text-lg font-bold m-0 leading-snug text-white line-clamp-2 h-12">{drop.name}</h3>
        <div className="text-2xl font-black text-[#c084fc]">${drop.price.toFixed(2)}</div>

        {/* Release Status or Inventory details */}
        {isIncoming ? (
          <div className="flex items-center gap-2 font-mono text-xs bg-blue-500/8 border border-blue-500/20 text-blue-400 px-3 py-2 rounded-lg">
            <Timer size={14} />
            <span>Launches in: {formatStartCountdown(timeUntilStart)}</span>
          </div>
        ) : isSoldOut ? (
          <div className="flex items-center gap-2 font-mono text-xs bg-rose-500/8 border border-rose-500/20 text-rose-400 px-3 py-2 rounded-lg">
            <ShieldAlert size={14} />
            <span>SOLDOUT</span>
          </div>
        ) : (
          <div className="flex flex-col gap-1.5">
            <div className="flex justify-between text-xs font-semibold text-white/50">
              <span>Inventory available:</span>
              <span className={`font-mono font-bold ${isLowStock ? 'text-rose-500 animate-pulse-breathing' : 'text-emerald-400'}`}>
                {stock} / {drop.total_stock}
              </span>
            </div>
            {/* Progress stock bar */}
            <div className="h-1.5 bg-white/[0.03] rounded-full overflow-hidden border border-white/[0.02]">
              <div 
                className={`h-full rounded-full transition-all duration-400 ease-out ${isLowStock ? 'bg-gradient-to-r from-rose-500 to-rose-400' : 'bg-gradient-to-r from-emerald-500 to-emerald-400'}`} 
                style={{ width: `${stockRatio * 100}%` }}
              ></div>
            </div>
          </div>
        )}

        {/* Live purchasers stream */}
        <div className="flex flex-col gap-1.5 pt-3 border-t border-white/5">
          <span className="text-[10px] font-bold tracking-wider text-white/30">LATEST BUYERS</span>
          <div className="flex flex-wrap gap-1 min-h-[24px] items-center">
            {purchasers.length > 0 ? (
              purchasers.map((p, index) => (
                <div key={index} className="flex items-center gap-1 bg-white/[0.03] border border-white/5 px-2 py-0.5 rounded-full text-[10px] font-mono text-zinc-400">
                  <Award size={10} />
                  <span>{p}</span>
                </div>
              ))
            ) : (
              <span className="text-xs text-white/25 italic">Waiting for reservations...</span>
            )}
          </div>
        </div>

        {/* Actions (Reserve or Buy) */}
        <div className="flex flex-col mt-2">
          {reservationId ? (
            <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-3 flex flex-col gap-2.5 animate-pulse-glow">
              <div className="flex items-center justify-center gap-2 text-xs text-amber-500">
                <Timer size={16} />
                <span>Hold expires: <b className="font-mono">{timeLeft}s</b></span>
              </div>
              <button 
                onClick={handlePurchase} 
                disabled={loading} 
                className="w-full inline-flex items-center justify-center gap-2 font-semibold text-sm px-[18px] py-2.5 rounded-lg cursor-pointer transition-all duration-200 ease-out border border-transparent outline-none bg-[#10b981] text-white shadow-[0_0_15px_rgba(16,185,129,0.2)] hover:bg-[#34d399] hover:-translate-y-0.5"
              >
                {loading ? 'Processing Order...' : 'Confirm Checkout & Pay'}
              </button>
            </div>
          ) : (
            <button
              onClick={handleReserve}
              disabled={loading || isSoldOut || isIncoming}
              className={`w-full inline-flex items-center justify-center gap-2 font-semibold text-sm px-[18px] py-2.5 rounded-lg cursor-pointer transition-all duration-200 ease-out border border-transparent outline-none ${isSoldOut ? 'bg-white/5 text-white/20 border-white/5 cursor-not-allowed shadow-none transform-none' : isIncoming ? 'bg-blue-500/15 text-blue-400 border-blue-500/30 cursor-not-allowed transform-none' : 'bg-[#8b5cf6] text-white shadow-[0_0_15px_rgba(139,92,246,0.3)] hover:bg-[#a78bfa] hover:-translate-y-0.5 hover:shadow-[0_0_22px_rgba(139,92,246,0.4)]'}`}
            >
              {loading 
                ? 'Securing Hold...' 
                : isSoldOut 
                  ? 'SOLD OUT' 
                  : isIncoming 
                    ? 'COMING SOON' 
                    : 'RESERVE SNEAKER'
              }
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
