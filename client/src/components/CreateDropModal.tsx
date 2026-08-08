import React, { useState } from 'react';
import { PlusCircle, Calendar, DollarSign, Package, X } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL || '';

interface CreateDropModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDropCreated: () => void;
}

export const CreateDropModal: React.FC<CreateDropModalProps> = ({ isOpen, onClose, onDropCreated }) => {
  const [name, setName] = useState('');
  const [price, setPrice] = useState('150');
  const [stock, setStock] = useState('10');
  const [startTimeType, setStartTimeType] = useState<'immediate' | 'future'>('immediate');
  const [futureMinutes, setFutureMinutes] = useState('2');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    let startTime = new Date();
    if (startTimeType === 'future') {
      const minutes = parseInt(futureMinutes) || 2;
      startTime = new Date(Date.now() + minutes * 60000);
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE}/api/v1/drops/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          name,
          price: parseFloat(price) || 0,
          total_stock: parseInt(stock) || 0,
          start_time: startTime.toISOString()
        })
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 422 && data.errors) {
          throw new Error(data.errors[0].message);
        }
        throw new Error(data.message || 'Failed to create sneaker drop');
      }

      onDropCreated();
      setName('');
      setPrice('150');
      setStock('10');
      setStartTimeType('immediate');
      onClose();
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-[#121218] border border-white/10 rounded-2xl p-8 w-full max-w-[440px] shadow-[0_20px_50px_rgba(0,0,0,0.6)] relative animate-slide-up" onClick={(e) => e.stopPropagation()}>
        <button className="absolute top-4 right-4 bg-transparent border-none text-white/40 cursor-pointer p-1 rounded hover:text-white hover:bg-white/5" onClick={onClose} aria-label="Close modal">
          <X size={20} />
        </button>

        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-12 h-12 rounded-xl bg-[#8b5cf6]/10 border border-[#8b5cf6]/20 flex items-center justify-center mb-3">
            <PlusCircle size={24} className="text-[#8b5cf6]" />
          </div>
          <h2 className="text-xl font-extrabold m-0 mb-1.5 text-white">Create Sneaker Drop</h2>
          <p className="text-xs m-0 text-white/40">Add a new limited edition release to test concurrency locks</p>
        </div>

        {error && <div className="bg-rose-500/10 border border-rose-500/20 text-rose-500 p-2.5 rounded-lg text-sm text-center mb-4">{error}</div>}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-white/60 tracking-wider" htmlFor="drop-name">Sneaker Model Name</label>
            <div className="relative flex items-center">
              <Package size={18} className="absolute left-3 text-white/25" />
              <input
                id="drop-name"
                type="text"
                placeholder="Air Jordan 1 Retro High OG"
                className="w-full bg-[#09090c] border border-white/10 rounded-lg py-2.5 pl-10 pr-3.5 text-white placeholder-zinc-500 focus:border-[#8b5cf6] focus:ring-1 focus:ring-[#8b5cf6]/50 focus:outline-none transition-all duration-200"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="flex gap-3">
            <div className="flex flex-col gap-1.5 flex-1">
              <label className="text-xs font-bold text-white/60 tracking-wider" htmlFor="drop-price">Retail Price ($)</label>
              <div className="relative flex items-center">
                <DollarSign size={18} className="absolute left-3 text-white/25" />
                <input
                  id="drop-price"
                  type="number"
                  placeholder="180"
                  min="1"
                  className="w-full bg-[#09090c] border border-white/10 rounded-lg py-2.5 pl-10 pr-3.5 text-white placeholder-zinc-500 focus:border-[#8b5cf6] focus:ring-1 focus:ring-[#8b5cf6]/50 focus:outline-none transition-all duration-200"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5 flex-1">
              <label className="text-xs font-bold text-white/60 tracking-wider" htmlFor="drop-stock">Quantity (Stock)</label>
              <div className="relative flex items-center">
                <Package size={18} className="absolute left-3 text-white/25" />
                <input
                  id="drop-stock"
                  type="number"
                  placeholder="5"
                  min="1"
                  className="w-full bg-[#09090c] border border-white/10 rounded-lg py-2.5 pl-10 pr-3.5 text-white placeholder-zinc-500 focus:border-[#8b5cf6] focus:ring-1 focus:ring-[#8b5cf6]/50 focus:outline-none transition-all duration-200"
                  value={stock}
                  onChange={(e) => setStock(e.target.value)}
                  required
                />
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-white/60 tracking-wider">Release Schedule</label>
            <div className="flex gap-2">
              <label className={`flex-1 flex items-center justify-center gap-2 p-2.5 rounded-lg border text-xs font-semibold cursor-pointer transition-all duration-200 ${startTimeType === 'immediate' ? 'border-[#8b5cf6] bg-[#8b5cf6]/5 text-[#c084fc]' : 'border-white/10 bg-[#09090c] text-zinc-400'}`}>
                <input
                  type="radio"
                  name="startTimeType"
                  value="immediate"
                  className="hidden"
                  checked={startTimeType === 'immediate'}
                  onChange={() => setStartTimeType('immediate')}
                />
                Start Immediately
              </label>
              <label className={`flex-1 flex items-center justify-center gap-2 p-2.5 rounded-lg border text-xs font-semibold cursor-pointer transition-all duration-200 ${startTimeType === 'future' ? 'border-[#8b5cf6] bg-[#8b5cf6]/5 text-[#c084fc]' : 'border-white/10 bg-[#09090c] text-zinc-400'}`}>
                <input
                  type="radio"
                  name="startTimeType"
                  value="future"
                  className="hidden"
                  checked={startTimeType === 'future'}
                  onChange={() => setStartTimeType('future')}
                />
                Schedule Future Release
              </label>
            </div>
          </div>

          {startTimeType === 'future' && (
            <div className="flex flex-col gap-1.5 animate-fade-in">
              <label className="text-xs font-bold text-white/60 tracking-wider" htmlFor="drop-future-minutes">Starts in (Minutes)</label>
              <div className="relative flex items-center">
                <Calendar size={18} className="absolute left-3 text-white/25" />
                <input
                  id="drop-future-minutes"
                  type="number"
                  placeholder="2"
                  min="1"
                  className="w-full bg-[#09090c] border border-white/10 rounded-lg py-2.5 pl-10 pr-3.5 text-white placeholder-zinc-500 focus:border-[#8b5cf6] focus:ring-1 focus:ring-[#8b5cf6]/50 focus:outline-none transition-all duration-200"
                  value={futureMinutes}
                  onChange={(e) => setFutureMinutes(e.target.value)}
                  required
                />
              </div>
            </div>
          )}

          <button type="submit" disabled={loading} className="w-full inline-flex items-center justify-center gap-2 font-semibold text-sm px-[18px] py-2.5 rounded-lg cursor-pointer transition-all duration-200 ease-out border border-transparent outline-none bg-[#8b5cf6] text-white shadow-[0_0_15px_rgba(139,92,246,0.3)] hover:bg-[#a78bfa] hover:-translate-y-0.5 hover:shadow-[0_0_22px_rgba(139,92,246,0.4)] disabled:opacity-50 disabled:cursor-not-allowed disabled:-translate-y-0 disabled:shadow-none">
            {loading ? 'Adding Drop...' : 'Launch Product Drop'}
          </button>
        </form>
      </div>
    </div>
  );
};
