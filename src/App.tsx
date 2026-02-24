/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, ReactNode, FormEvent } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { 
  Search, 
  UserPlus, 
  Wrench, 
  FileText, 
  CreditCard, 
  History, 
  Plus, 
  ChevronRight,
  Filter,
  Calendar,
  Car,
  Phone,
  User,
  CheckCircle2,
  AlertCircle,
  Edit
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { SearchResult, Service, AccountPayable, Customer } from './types';

type Tab = 'search' | 'customers' | 'services' | 'payable' | 'reports';

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('search');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<SearchResult | null>(null);
  const [history, setHistory] = useState<Service[]>([]);
  const [isNewCustomerModalOpen, setIsNewCustomerModalOpen] = useState(false);
  const [isNewServiceModalOpen, setIsNewServiceModalOpen] = useState(false);
  const [isNewPayableModalOpen, setIsNewPayableModalOpen] = useState(false);
  const [viewingHistoryCustomer, setViewingHistoryCustomer] = useState<Customer | null>(null);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [refreshCustomersKey, setRefreshCustomersKey] = useState(0);

  // Search logic
  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      if (searchQuery.length > 1) {
        fetch(`/api/search?q=${searchQuery}`)
          .then(res => res.json())
          .then(data => setSearchResults(data));
      } else {
        setSearchResults([]);
      }
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery]);

  const fetchHistory = async (customerId: number) => {
    const res = await fetch(`/api/customers/${customerId}/history`);
    const data = await res.json();
    setHistory(data);
  };

  const toggleServiceStatus = async (id: number, customerId?: number) => {
    try {
      const res = await fetch(`/api/services/${id}/toggle-status`, { method: 'PATCH' });
      if (res.ok) {
        if (customerId) {
          fetchHistory(customerId);
        }
      }
    } catch (error) {
      console.error("Error toggling status:", error);
    }
  };

  const handleSelectCustomer = (result: SearchResult) => {
    setSelectedCustomer(result);
    fetchHistory(result.customer_id);
  };

  return (
    <div className="min-h-screen bg-[#F5F5F5] text-[#1A1A1A] font-sans">
      {/* Sidebar */}
      <nav className="fixed left-0 top-0 h-full w-64 bg-white border-r border-black/5 p-6 flex flex-col gap-8 z-10">
        <div className="flex items-center gap-3 px-2">
          <div className="w-10 h-10 bg-emerald-600 rounded-xl flex items-center justify-center text-white">
            <Wrench size={24} />
          </div>
          <h1 className="font-bold text-xl tracking-tight">EletroAr</h1>
        </div>

        <div className="flex flex-col gap-2">
          <NavButton 
            active={activeTab === 'search'} 
            onClick={() => setActiveTab('search')}
            icon={<Search size={20} />}
            label="Buscar"
          />
          <NavButton 
            active={activeTab === 'customers'} 
            onClick={() => setActiveTab('customers')}
            icon={<User size={20} />}
            label="Clientes"
          />
          <NavButton 
            active={activeTab === 'services'} 
            onClick={() => setActiveTab('services')}
            icon={<Wrench size={20} />}
            label="Serviços"
          />
          <NavButton 
            active={activeTab === 'payable'} 
            onClick={() => setActiveTab('payable')}
            icon={<CreditCard size={20} />}
            label="Contas a Pagar"
          />
          <NavButton 
            active={activeTab === 'reports'} 
            onClick={() => setActiveTab('reports')}
            icon={<FileText size={20} />}
            label="Relatórios"
          />
        </div>
      </nav>

      {/* Main Content */}
      <main className="ml-64 p-10">
        <AnimatePresence mode="wait">
          {activeTab === 'search' && (
            <motion.div 
              key="search"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="max-w-4xl mx-auto"
            >
              <header className="mb-10">
                <h2 className="text-3xl font-bold tracking-tight mb-2">Busca Inteligente</h2>
                <p className="text-black/50">Localize clientes por nome, placa, telefone ou modelo.</p>
              </header>

              <div className="relative mb-8">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-black/30" size={24} />
                <input 
                  type="text"
                  placeholder="Ex: ABC-1234, João Silva, Corolla..."
                  className="w-full bg-white border border-black/5 rounded-2xl py-5 pl-14 pr-6 text-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              <div className="grid gap-4">
                {searchResults.map((result) => (
                  <button
                    key={`${result.customer_id}-${result.vehicle_id}`}
                    onClick={() => handleSelectCustomer(result)}
                    className="w-full bg-white p-6 rounded-2xl border border-black/5 hover:border-emerald-500/50 transition-all flex items-center justify-between group text-left"
                  >
                    <div className="flex gap-6 items-center">
                      <div className="w-12 h-12 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600">
                        <Car size={24} />
                      </div>
                      <div>
                        <div className="font-bold text-lg">{result.plate}</div>
                        <div className="text-black/50 text-sm">{result.brand} {result.model} • {result.color}</div>
                      </div>
                      <div className="h-10 w-px bg-black/5" />
                      <div>
                        <div className="font-medium">{result.name}</div>
                        <div className="text-black/50 text-sm">{result.phone}</div>
                      </div>
                    </div>
                    <ChevronRight className="text-black/20 group-hover:text-emerald-500 transition-colors" />
                  </button>
                ))}
              </div>

              {selectedCustomer && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="mt-12 bg-white rounded-3xl border border-black/5 overflow-hidden shadow-xl"
                >
                  <div className="bg-emerald-600 p-8 text-white flex justify-between items-start">
                    <div>
                      <div className="text-emerald-100 text-sm uppercase tracking-wider font-bold mb-1">Cliente Selecionado</div>
                      <h3 className="text-3xl font-bold">{selectedCustomer.name}</h3>
                      <div className="flex gap-4 mt-4 text-emerald-50">
                        <span className="flex items-center gap-2 bg-white/10 px-3 py-1 rounded-full text-sm">
                          <Phone size={14} /> {selectedCustomer.phone}
                        </span>
                        <span className="flex items-center gap-2 bg-white/10 px-3 py-1 rounded-full text-sm">
                          <Car size={14} /> {selectedCustomer.plate}
                        </span>
                      </div>
                    </div>
                    <button 
                      onClick={() => setIsNewServiceModalOpen(true)}
                      className="bg-white text-emerald-600 px-6 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-emerald-50 transition-colors"
                    >
                      <Plus size={20} /> Novo Serviço
                    </button>
                  </div>

                  <div className="p-8">
                    <div className="flex items-center gap-2 mb-6 text-black/40 font-bold text-sm uppercase tracking-widest">
                      <History size={16} /> Histórico de Serviços
                    </div>
                    
                    <div className="space-y-4">
                      {history.length === 0 ? (
                        <div className="text-center py-10 text-black/30 italic">
                          Nenhum serviço registrado para este veículo.
                        </div>
                      ) : (
                        history.map((s) => (
                          <div key={s.id} className="flex gap-6 p-4 rounded-xl hover:bg-black/[0.02] transition-colors border border-transparent hover:border-black/5">
                            <div className="text-sm font-mono text-black/40 pt-1">
                              {new Date(s.service_date).toLocaleDateString('pt-BR')}
                            </div>
                            <div className="flex-1">
                              <div className="font-bold">{s.description}</div>
                              <div className="text-sm text-black/50 mt-1">
                                <button 
                                  onClick={() => toggleServiceStatus(s.id, selectedCustomer.customer_id)}
                                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold transition-colors ${
                                    s.status === 'completed' 
                                      ? 'text-emerald-600 bg-emerald-50 hover:bg-emerald-100' 
                                      : 'text-amber-600 bg-amber-50 hover:bg-amber-100'
                                  }`}
                                >
                                  {s.status === 'completed' ? <CheckCircle2 size={10} /> : <AlertCircle size={10} />}
                                  {s.status === 'completed' ? 'Concluído' : 'Pendente'}
                                </button>
                              </div>
                            </div>
                            <div className="font-mono font-bold text-emerald-600">
                              R$ {s.total_price.toFixed(2)}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </motion.div>
              )}
            </motion.div>
          )}

          {activeTab === 'payable' && <PayableTab onOpenModal={() => setIsNewPayableModalOpen(true)} />}
          {activeTab === 'reports' && <ReportsTab />}
          {activeTab === 'customers' && (
            <CustomersTab 
              refreshTrigger={refreshCustomersKey}
              onOpenModal={() => setIsNewCustomerModalOpen(true)} 
              onViewHistory={(c) => setViewingHistoryCustomer(c)}
              onEdit={(c) => setEditingCustomer(c)}
            />
          )}
          {activeTab === 'services' && <ServicesTab />}
        </AnimatePresence>
      </main>

      <NewCustomerModal 
        isOpen={isNewCustomerModalOpen} 
        onClose={() => setIsNewCustomerModalOpen(false)}
        onSuccess={() => setActiveTab('search')}
      />

      <NewServiceModal 
        isOpen={isNewServiceModalOpen} 
        vehicleId={selectedCustomer?.vehicle_id || 0}
        onClose={() => setIsNewServiceModalOpen(false)}
        onSuccess={() => selectedCustomer && fetchHistory(selectedCustomer.customer_id)}
      />

      <NewPayableModal 
        isOpen={isNewPayableModalOpen}
        onClose={() => setIsNewPayableModalOpen(false)}
        onSuccess={() => setActiveTab('payable')}
      />

      <CustomerHistoryModal 
        isOpen={!!viewingHistoryCustomer}
        customer={viewingHistoryCustomer}
        onClose={() => setViewingHistoryCustomer(null)}
      />

      <EditCustomerModal 
        isOpen={!!editingCustomer}
        customer={editingCustomer}
        onClose={() => setEditingCustomer(null)}
        onSuccess={() => {
          setRefreshCustomersKey(prev => prev + 1);
          setActiveTab('customers');
        }}
      />
    </div>
  );
}

function CustomerHistoryModal({ isOpen, customer, onClose }: { isOpen: boolean, customer: Customer | null, onClose: () => void }) {
  const [history, setHistory] = useState<Service[]>([]);

  const fetchHistory = async () => {
    if (!customer) return;
    const res = await fetch(`/api/customers/${customer.id}/history`);
    const data = await res.json();
    setHistory(data);
  };

  const toggleStatus = async (id: number) => {
    const res = await fetch(`/api/services/${id}/toggle-status`, { method: 'PATCH' });
    if (res.ok) {
      fetchHistory();
    }
  };

  useEffect(() => {
    if (isOpen && customer) {
      fetchHistory();
    }
  }, [isOpen, customer]);

  if (!isOpen || !customer) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden"
      >
        <div className="bg-emerald-600 p-6 text-white flex justify-between items-center">
          <div>
            <h3 className="text-xl font-bold">{customer.name}</h3>
            <p className="text-emerald-100 text-sm">{customer.phone}</p>
          </div>
          <button onClick={onClose} className="hover:bg-white/10 p-2 rounded-lg transition-colors">
            <Plus className="rotate-45" size={24} />
          </button>
        </div>
        
        <div className="p-8 max-h-[60vh] overflow-y-auto">
          <div className="flex items-center gap-2 mb-6 text-black/40 font-bold text-sm uppercase tracking-widest">
            <History size={16} /> Histórico de Serviços
          </div>
          
          <div className="space-y-4">
            {history.length === 0 ? (
              <div className="text-center py-10 text-black/30 italic">
                Nenhum serviço registrado para este cliente.
              </div>
            ) : (
              history.map((s) => (
                <div key={s.id} className="flex gap-6 p-4 rounded-xl border border-black/5 items-center">
                  <div className="text-sm font-mono text-black/40">
                    {new Date(s.service_date).toLocaleDateString('pt-BR')}
                  </div>
                  <div className="flex-1">
                    <div className="font-bold">{s.description}</div>
                    <div className="text-xs text-black/40">{s.plate} • {s.model}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-mono font-bold text-emerald-600 mb-1">
                      R$ {s.total_price.toFixed(2)}
                    </div>
                    <button 
                      onClick={() => toggleStatus(s.id)}
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold transition-colors ${
                        s.status === 'completed' 
                          ? 'text-emerald-600 bg-emerald-50 hover:bg-emerald-100' 
                          : 'text-amber-600 bg-amber-50 hover:bg-amber-100'
                      }`}
                    >
                      {s.status === 'completed' ? <CheckCircle2 size={10} /> : <AlertCircle size={10} />}
                      {s.status === 'completed' ? 'Concluído' : 'Pendente'}
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
        <div className="p-6 bg-black/[0.02] border-t border-black/5 flex justify-end">
          <button 
            onClick={onClose}
            className="bg-black text-white px-6 py-2 rounded-xl font-bold hover:bg-black/80 transition-colors"
          >
            Fechar
          </button>
        </div>
      </motion.div>
    </div>
  );
}

function NewServiceModal({ isOpen, vehicleId, onClose, onSuccess }: { isOpen: boolean, vehicleId: number, onClose: () => void, onSuccess: () => void }) {
  const [formData, setFormData] = useState({
    vehicle_id: vehicleId,
    description: '',
    total_price: 0,
    parts: [] as { name: string, quantity: number, price: number }[]
  });

  useEffect(() => {
    setFormData(prev => ({ ...prev, vehicle_id: vehicleId }));
  }, [vehicleId]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const res = await fetch('/api/services', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData)
    });
    if (res.ok) {
      onSuccess();
      onClose();
      setFormData({ vehicle_id: vehicleId, description: '', total_price: 0, parts: [] });
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white w-full max-w-xl rounded-3xl shadow-2xl overflow-hidden"
      >
        <div className="bg-emerald-600 p-6 text-white flex justify-between items-center">
          <h3 className="text-xl font-bold">Lançar Novo Serviço</h3>
          <button onClick={onClose} className="hover:bg-white/10 p-2 rounded-lg transition-colors">
            <Plus className="rotate-45" size={24} />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          <div>
            <label className="block text-sm font-medium mb-1">Descrição do Serviço</label>
            <textarea 
              required
              rows={3}
              className="w-full border border-black/10 rounded-xl px-4 py-2 focus:ring-2 focus:ring-emerald-500/20 outline-none resize-none"
              placeholder="Ex: Carga de gás, troca de compressor..."
              value={formData.description}
              onChange={e => setFormData({...formData, description: e.target.value})}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Valor Total (R$)</label>
            <input 
              type="number"
              step="0.01"
              required
              className="w-full border border-black/10 rounded-xl px-4 py-2 focus:ring-2 focus:ring-emerald-500/20 outline-none"
              value={formData.total_price}
              onChange={e => setFormData({...formData, total_price: parseFloat(e.target.value)})}
            />
          </div>

          <div className="flex justify-end gap-4 mt-6">
            <button 
              type="button"
              onClick={onClose}
              className="px-6 py-2 text-black/50 font-bold hover:text-black transition-colors"
            >
              Cancelar
            </button>
            <button 
              type="submit"
              className="bg-emerald-600 text-white px-8 py-2 rounded-xl font-bold hover:bg-emerald-700 transition-colors"
            >
              Finalizar Serviço
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

function NewPayableModal({ isOpen, onClose, onSuccess }: { isOpen: boolean, onClose: () => void, onSuccess: () => void }) {
  const [formData, setFormData] = useState({
    supplier: '',
    description: '',
    amount: 0,
    due_date: ''
  });

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const res = await fetch('/api/accounts-payable', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData)
    });
    if (res.ok) {
      onSuccess();
      onClose();
      setFormData({ supplier: '', description: '', amount: 0, due_date: '' });
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden"
      >
        <div className="bg-emerald-600 p-6 text-white flex justify-between items-center">
          <h3 className="text-xl font-bold">Nova Conta a Pagar</h3>
          <button onClick={onClose} className="hover:bg-white/10 p-2 rounded-lg transition-colors">
            <Plus className="rotate-45" size={24} />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          <div>
            <label className="block text-sm font-medium mb-1">Fornecedor</label>
            <input 
              required
              className="w-full border border-black/10 rounded-xl px-4 py-2 focus:ring-2 focus:ring-emerald-500/20 outline-none"
              value={formData.supplier}
              onChange={e => setFormData({...formData, supplier: e.target.value})}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Descrição</label>
            <input 
              className="w-full border border-black/10 rounded-xl px-4 py-2 focus:ring-2 focus:ring-emerald-500/20 outline-none"
              value={formData.description}
              onChange={e => setFormData({...formData, description: e.target.value})}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Valor (R$)</label>
              <input 
                type="number"
                step="0.01"
                required
                className="w-full border border-black/10 rounded-xl px-4 py-2 focus:ring-2 focus:ring-emerald-500/20 outline-none"
                value={formData.amount}
                onChange={e => setFormData({...formData, amount: parseFloat(e.target.value)})}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Vencimento</label>
              <input 
                type="date"
                required
                className="w-full border border-black/10 rounded-xl px-4 py-2 focus:ring-2 focus:ring-emerald-500/20 outline-none"
                value={formData.due_date}
                onChange={e => setFormData({...formData, due_date: e.target.value})}
              />
            </div>
          </div>

          <div className="col-span-2 flex justify-end gap-4 mt-6">
            <button 
              type="button"
              onClick={onClose}
              className="px-6 py-2 text-black/50 font-bold hover:text-black transition-colors"
            >
              Cancelar
            </button>
            <button 
              type="submit"
              className="bg-emerald-600 text-white px-8 py-2 rounded-xl font-bold hover:bg-emerald-700 transition-colors"
            >
              Salvar Conta
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

function NavButton({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: ReactNode, label: string }) {
  return (
    <button 
      onClick={onClick}
      className={`flex items-center gap-4 px-4 py-3 rounded-xl font-medium transition-all ${
        active 
          ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/20' 
          : 'text-black/50 hover:bg-black/5 hover:text-black'
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

function PayableTab({ onOpenModal }: { onOpenModal: () => void }) {
  const [payables, setPayables] = useState<AccountPayable[]>([]);
  const [filter, setFilter] = useState({ start: '', end: '', supplier: '' });

  const fetchPayables = async () => {
    const params = new URLSearchParams(filter);
    const res = await fetch(`/api/accounts-payable?${params}`);
    const data = await res.json();
    setPayables(data);
  };

  const togglePaid = async (id: number) => {
    const res = await fetch(`/api/accounts-payable/${id}/toggle-paid`, { method: 'PATCH' });
    if (res.ok) {
      fetchPayables();
    }
  };

  useEffect(() => {
    fetchPayables();
  }, [filter]);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-5xl mx-auto"
    >
      <header className="flex justify-between items-end mb-10">
        <div>
          <h2 className="text-3xl font-bold tracking-tight mb-2">Contas a Pagar</h2>
          <p className="text-black/50">Gerencie seus compromissos financeiros com fornecedores.</p>
        </div>
        <button 
          onClick={onOpenModal}
          className="bg-emerald-600 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-emerald-700 transition-colors"
        >
          <Plus size={20} /> Nova Conta
        </button>
      </header>

      <div className="bg-white p-6 rounded-2xl border border-black/5 mb-8 flex gap-4 items-end">
        <button 
          onClick={() => {
            const today = new Date().toISOString().split('T')[0];
            setFilter({...filter, start: today, end: today });
          }}
          className="bg-emerald-50 text-emerald-600 px-4 py-2 rounded-lg text-sm font-bold hover:bg-emerald-100 transition-colors"
        >
          Hoje
        </button>
        <div className="flex-1">
          <label className="block text-xs font-bold text-black/40 uppercase mb-2">Fornecedor</label>
          <input 
            type="text" 
            className="w-full bg-[#F9F9F9] border border-black/5 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            placeholder="Filtrar por nome..."
            value={filter.supplier}
            onChange={(e) => setFilter({...filter, supplier: e.target.value})}
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-black/40 uppercase mb-2">Início</label>
          <input 
            type="date" 
            className="bg-[#F9F9F9] border border-black/5 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            value={filter.start}
            onChange={(e) => setFilter({...filter, start: e.target.value})}
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-black/40 uppercase mb-2">Fim</label>
          <input 
            type="date" 
            className="bg-[#F9F9F9] border border-black/5 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            value={filter.end}
            onChange={(e) => setFilter({...filter, end: e.target.value})}
          />
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-black/5 overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-black/[0.02] border-bottom border-black/5">
              <th className="px-6 py-4 text-xs font-bold text-black/40 uppercase">Vencimento</th>
              <th className="px-6 py-4 text-xs font-bold text-black/40 uppercase">Fornecedor</th>
              <th className="px-6 py-4 text-xs font-bold text-black/40 uppercase">Descrição</th>
              <th className="px-6 py-4 text-xs font-bold text-black/40 uppercase text-right">Valor</th>
              <th className="px-6 py-4 text-xs font-bold text-black/40 uppercase text-center">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-black/5">
            {payables.map((p) => (
              <tr key={p.id} className="hover:bg-black/[0.01] transition-colors">
                <td className="px-6 py-4 font-mono text-sm">{new Date(p.due_date).toLocaleDateString('pt-BR')}</td>
                <td className="px-6 py-4 font-bold">{p.supplier}</td>
                <td className="px-6 py-4 text-black/50">{p.description}</td>
                <td className="px-6 py-4 text-right font-mono font-bold">R$ {p.amount.toFixed(2)}</td>
                <td className="px-6 py-4 text-center">
                  <button 
                    onClick={() => togglePaid(p.id)}
                    className="group focus:outline-none"
                    title="Clique para alterar o status"
                  >
                    {p.paid ? (
                      <span className="inline-flex items-center gap-1 text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full text-xs font-bold group-hover:bg-emerald-100 transition-colors">
                        <CheckCircle2 size={12} /> Pago
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-amber-600 bg-amber-50 px-2 py-1 rounded-full text-xs font-bold group-hover:bg-amber-100 transition-colors">
                        <AlertCircle size={12} /> Pendente
                      </span>
                    )}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </motion.div>
  );
}

function ReportsTab() {
  const [reportData, setReportData] = useState<Service[]>([]);
  const [range, setRange] = useState({ start: '', end: '' });

  const fetchReport = async () => {
    const res = await fetch(`/api/reports/services?start=${range.start}&end=${range.end}`);
    const data = await res.json();
    setReportData(data);
  };

  const generatePDF = () => {
    const doc = new jsPDF();
    
    // Header
    doc.setFontSize(20);
    doc.setTextColor(16, 185, 129); // Emerald-600
    doc.text('EletroAr - Relatório de Serviços', 14, 22);
    
    doc.setFontSize(10);
    doc.setTextColor(100);
    const periodText = range.start && range.end 
      ? `Período: ${new Date(range.start).toLocaleDateString('pt-BR')} até ${new Date(range.end).toLocaleDateString('pt-BR')}`
      : 'Relatório Geral';
    doc.text(periodText, 14, 30);
    
    // Stats
    const totalRevenue = reportData.reduce((acc, s) => acc + s.total_price, 0);
    doc.setFontSize(12);
    doc.setTextColor(0);
    doc.text(`Total de Serviços: ${reportData.length}`, 14, 40);
    doc.text(`Faturamento Total: R$ ${totalRevenue.toFixed(2)}`, 14, 46);
    
    // Table
    const tableData = reportData.map(s => [
      new Date(s.service_date).toLocaleDateString('pt-BR'),
      s.customer_name,
      s.plate,
      s.description,
      `R$ ${s.total_price.toFixed(2)}`
    ]);

    autoTable(doc, {
      startY: 55,
      head: [['Data', 'Cliente', 'Placa', 'Descrição', 'Valor']],
      body: tableData,
      headStyles: { fillColor: [16, 185, 129] },
      alternateRowStyles: { fillColor: [245, 245, 245] },
    });

    doc.save(`relatorio-eletroar-${new Date().toISOString().split('T')[0]}.pdf`);
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-5xl mx-auto"
    >
      <header className="mb-10 flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-bold tracking-tight mb-2">Relatórios</h2>
          <p className="text-black/50">Análise detalhada de serviços e faturamento.</p>
        </div>
        {reportData.length > 0 && (
          <button 
            onClick={generatePDF}
            className="flex items-center gap-2 bg-emerald-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-emerald-700 transition-colors shadow-lg shadow-emerald-600/20"
          >
            <FileText size={20} /> Exportar PDF
          </button>
        )}
      </header>

      <div className="grid grid-cols-3 gap-6 mb-10">
        <div className="bg-white p-6 rounded-3xl border border-black/5 shadow-sm">
          <div className="text-black/40 text-xs font-bold uppercase tracking-widest mb-2">Total de Serviços</div>
          <div className="text-4xl font-bold">{reportData.length}</div>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-black/5 shadow-sm">
          <div className="text-black/40 text-xs font-bold uppercase tracking-widest mb-2">Faturamento Total</div>
          <div className="text-4xl font-bold text-emerald-600">
            R$ {reportData.reduce((acc, s) => acc + s.total_price, 0).toFixed(2)}
          </div>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-black/5 shadow-sm">
          <div className="text-black/40 text-xs font-bold uppercase tracking-widest mb-2">Ticket Médio</div>
          <div className="text-4xl font-bold">
            R$ {reportData.length ? (reportData.reduce((acc, s) => acc + s.total_price, 0) / reportData.length).toFixed(2) : '0.00'}
          </div>
        </div>
      </div>

      <div className="bg-white p-8 rounded-3xl border border-black/5">
        <div className="flex justify-between items-center mb-8">
          <h3 className="font-bold text-xl">Serviços Realizados</h3>
          <div className="flex gap-4">
            <button 
              onClick={() => {
                const today = new Date().toISOString().split('T')[0];
                setRange({ start: today, end: today });
                // We can't call fetchReport directly because state hasn't updated yet
                // But we can trigger it via useEffect or just pass the values
                fetch(`/api/reports/services?start=${today}&end=${today}`)
                  .then(res => res.json())
                  .then(data => setReportData(data));
              }}
              className="bg-emerald-50 text-emerald-600 px-4 py-2 rounded-lg text-sm font-bold hover:bg-emerald-100 transition-colors"
            >
              Hoje
            </button>
            <input 
              type="date" 
              className="bg-[#F9F9F9] border border-black/5 rounded-lg px-4 py-2 text-sm"
              value={range.start}
              onChange={(e) => setRange({...range, start: e.target.value})}
            />
            <input 
              type="date" 
              className="bg-[#F9F9F9] border border-black/5 rounded-lg px-4 py-2 text-sm"
              value={range.end}
              onChange={(e) => setRange({...range, end: e.target.value})}
            />
            <button 
              onClick={() => {
                setRange({ start: '', end: '' });
                setReportData([]);
              }}
              className="px-4 py-2 text-sm font-bold text-black/40 hover:text-black transition-colors"
            >
              Limpar
            </button>
            <button 
              onClick={fetchReport}
              className="bg-black text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-black/80 transition-colors"
            >
              Gerar Relatório
            </button>
          </div>
        </div>

        <div className="space-y-4">
          {reportData.map((s) => (
            <div key={s.id} className="flex items-center justify-between p-4 rounded-xl border border-black/5">
              <div className="flex gap-6 items-center">
                <div className="text-sm font-mono text-black/40">{new Date(s.service_date).toLocaleDateString('pt-BR')}</div>
                <div>
                  <div className="font-bold">{s.customer_name}</div>
                  <div className="text-sm text-black/50">{s.plate} • {s.description}</div>
                </div>
              </div>
              <div className="font-mono font-bold">R$ {s.total_price.toFixed(2)}</div>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

function CustomersTab({ onOpenModal, onViewHistory, onEdit, refreshTrigger }: { onOpenModal: () => void, onViewHistory: (c: Customer) => void, onEdit: (c: Customer) => void, refreshTrigger?: number }) {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchCustomers = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/customers');
      const data = await res.json();
      setCustomers(data);
    } catch (error) {
      console.error("Error fetching customers:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, [refreshTrigger]);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-5xl mx-auto"
    >
      <header className="flex justify-between items-end mb-10">
        <div>
          <h2 className="text-3xl font-bold tracking-tight mb-2">Gestão de Clientes</h2>
          <p className="text-black/50">Visualize e gerencie todos os clientes cadastrados.</p>
        </div>
        <div className="flex gap-4">
          <button 
            onClick={fetchCustomers}
            className="bg-black text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-black/80 transition-colors"
          >
            <User size={20} /> Listar Todos
          </button>
          <button 
            onClick={onOpenModal}
            className="bg-emerald-600 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-emerald-700 transition-colors shadow-lg shadow-emerald-600/20"
          >
            <Plus size={20} /> Novo Cliente
          </button>
        </div>
      </header>

      {customers.length > 0 ? (
        <div className="bg-white rounded-2xl border border-black/5 overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-black/[0.02] border-bottom border-black/5">
                <th className="px-6 py-4 text-xs font-bold text-black/40 uppercase">Nome</th>
                <th className="px-6 py-4 text-xs font-bold text-black/40 uppercase">Telefone</th>
                <th className="px-6 py-4 text-xs font-bold text-black/40 uppercase">E-mail</th>
                <th className="px-6 py-4 text-xs font-bold text-black/40 uppercase text-center">Veículos</th>
                <th className="px-6 py-4 text-xs font-bold text-black/40 uppercase text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/5">
              {customers.map((c) => (
                <tr key={c.id} className="hover:bg-black/[0.01] transition-colors">
                  <td className="px-6 py-4 font-bold">{c.name}</td>
                  <td className="px-6 py-4">{c.phone}</td>
                  <td className="px-6 py-4 text-black/50">{c.email || '-'}</td>
                  <td className="px-6 py-4 text-center">
                    <span className="bg-emerald-50 text-emerald-600 px-2 py-1 rounded-full text-xs font-bold">
                      {c.vehicle_count}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-3">
                      <button 
                        onClick={() => onEdit(c)}
                        className="text-black/40 hover:text-black font-bold text-sm flex items-center gap-1"
                      >
                        <Edit size={14} /> Editar
                      </button>
                      <button 
                        onClick={() => onViewHistory(c)}
                        className="text-emerald-600 hover:text-emerald-700 font-bold text-sm flex items-center gap-1"
                      >
                        <History size={14} /> Histórico
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="text-center py-20 bg-white rounded-3xl border border-black/5">
          <UserPlus className="mx-auto text-black/10 mb-4" size={64} />
          <h3 className="text-xl font-bold mb-2">Nenhum cliente listado</h3>
          <p className="text-black/50 mb-8">Clique em "Listar Todos" para ver a base de clientes ou cadastre um novo.</p>
        </div>
      )}
    </motion.div>
  );
}

function NewCustomerModal({ isOpen, onClose, onSuccess }: { isOpen: boolean, onClose: () => void, onSuccess: () => void }) {
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    vehicle: {
      plate: '',
      brand: '',
      model: '',
      year: '',
      color: ''
    }
  });

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const res = await fetch('/api/customers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData)
    });
    if (res.ok) {
      onSuccess();
      onClose();
      setFormData({
        name: '', phone: '', email: '',
        vehicle: { plate: '', brand: '', model: '', year: '', color: '' }
      });
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden"
      >
        <div className="bg-emerald-600 p-6 text-white flex justify-between items-center">
          <h3 className="text-xl font-bold">Novo Cliente & Veículo</h3>
          <button onClick={onClose} className="hover:bg-white/10 p-2 rounded-lg transition-colors">
            <Plus className="rotate-45" size={24} />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-8 grid grid-cols-2 gap-6">
          <div className="col-span-2">
            <h4 className="text-xs font-bold text-black/30 uppercase tracking-widest mb-4">Dados do Cliente</h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="block text-sm font-medium mb-1">Nome Completo</label>
                <input 
                  required
                  className="w-full border border-black/10 rounded-xl px-4 py-2 focus:ring-2 focus:ring-emerald-500/20 outline-none"
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Telefone</label>
                <input 
                  required
                  className="w-full border border-black/10 rounded-xl px-4 py-2 focus:ring-2 focus:ring-emerald-500/20 outline-none"
                  value={formData.phone}
                  onChange={e => setFormData({...formData, phone: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">E-mail</label>
                <input 
                  type="email"
                  className="w-full border border-black/10 rounded-xl px-4 py-2 focus:ring-2 focus:ring-emerald-500/20 outline-none"
                  value={formData.email}
                  onChange={e => setFormData({...formData, email: e.target.value})}
                />
              </div>
            </div>
          </div>

          <div className="col-span-2 mt-4">
            <h4 className="text-xs font-bold text-black/30 uppercase tracking-widest mb-4">Dados do Veículo</h4>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Placa</label>
                <input 
                  required
                  className="w-full border border-black/10 rounded-xl px-4 py-2 focus:ring-2 focus:ring-emerald-500/20 outline-none"
                  value={formData.vehicle.plate}
                  onChange={e => setFormData({...formData, vehicle: {...formData.vehicle, plate: e.target.value}})}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Marca</label>
                <input 
                  required
                  className="w-full border border-black/10 rounded-xl px-4 py-2 focus:ring-2 focus:ring-emerald-500/20 outline-none"
                  value={formData.vehicle.brand}
                  onChange={e => setFormData({...formData, vehicle: {...formData.vehicle, brand: e.target.value}})}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Modelo</label>
                <input 
                  required
                  className="w-full border border-black/10 rounded-xl px-4 py-2 focus:ring-2 focus:ring-emerald-500/20 outline-none"
                  value={formData.vehicle.model}
                  onChange={e => setFormData({...formData, vehicle: {...formData.vehicle, model: e.target.value}})}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Ano</label>
                <input 
                  type="number"
                  className="w-full border border-black/10 rounded-xl px-4 py-2 focus:ring-2 focus:ring-emerald-500/20 outline-none"
                  value={formData.vehicle.year}
                  onChange={e => setFormData({...formData, vehicle: {...formData.vehicle, year: e.target.value}})}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Cor</label>
                <input 
                  className="w-full border border-black/10 rounded-xl px-4 py-2 focus:ring-2 focus:ring-emerald-500/20 outline-none"
                  value={formData.vehicle.color}
                  onChange={e => setFormData({...formData, vehicle: {...formData.vehicle, color: e.target.value}})}
                />
              </div>
            </div>
          </div>

          <div className="col-span-2 flex justify-end gap-4 mt-6">
            <button 
              type="button"
              onClick={onClose}
              className="px-6 py-2 text-black/50 font-bold hover:text-black transition-colors"
            >
              Cancelar
            </button>
            <button 
              type="submit"
              className="bg-emerald-600 text-white px-8 py-2 rounded-xl font-bold hover:bg-emerald-700 transition-colors"
            >
              Salvar Cadastro
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

function ServicesTab() {
  const [services, setServices] = useState<Service[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [filter, setFilter] = useState({ start: '', end: '' });

  const fetchServices = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams(filter);
      const res = await fetch(`/api/services?${params}`);
      const data = await res.json();
      setServices(data);
    } catch (error) {
      console.error("Error fetching services:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleStatus = async (id: number) => {
    try {
      const res = await fetch(`/api/services/${id}/toggle-status`, { method: 'PATCH' });
      if (res.ok) {
        fetchServices();
      }
    } catch (error) {
      console.error("Error toggling status:", error);
    }
  };

  useEffect(() => {
    fetchServices();
  }, [filter]);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-5xl mx-auto"
    >
      <header className="flex justify-between items-end mb-10">
        <div>
          <h2 className="text-3xl font-bold tracking-tight mb-2">Ordens de Serviço</h2>
          <p className="text-black/50">Acompanhe todos os serviços realizados e em andamento.</p>
        </div>
        <button 
          onClick={fetchServices}
          className="bg-black text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-black/80 transition-colors"
        >
          <History size={20} /> Atualizar Lista
        </button>
      </header>

      <div className="bg-white p-6 rounded-2xl border border-black/5 mb-8 flex gap-4 items-end">
        <button 
          onClick={() => {
            const today = new Date().toISOString().split('T')[0];
            setFilter({...filter, start: today, end: today });
          }}
          className="bg-emerald-50 text-emerald-600 px-4 py-2 rounded-lg text-sm font-bold hover:bg-emerald-100 transition-colors"
        >
          Hoje
        </button>
        <div>
          <label className="block text-xs font-bold text-black/40 uppercase mb-2">Início</label>
          <input 
            type="date" 
            className="bg-[#F9F9F9] border border-black/5 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            value={filter.start}
            onChange={(e) => setFilter({...filter, start: e.target.value})}
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-black/40 uppercase mb-2">Fim</label>
          <input 
            type="date" 
            className="bg-[#F9F9F9] border border-black/5 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            value={filter.end}
            onChange={(e) => setFilter({...filter, end: e.target.value})}
          />
        </div>
        <button 
          onClick={() => setFilter({ start: '', end: '' })}
          className="px-4 py-2 text-sm font-bold text-black/40 hover:text-black transition-colors"
        >
          Limpar Filtros
        </button>
      </div>

      {services.length > 0 ? (
        <div className="bg-white rounded-2xl border border-black/5 overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-black/[0.02] border-bottom border-black/5">
                <th className="px-6 py-4 text-xs font-bold text-black/40 uppercase">Data</th>
                <th className="px-6 py-4 text-xs font-bold text-black/40 uppercase">Cliente</th>
                <th className="px-6 py-4 text-xs font-bold text-black/40 uppercase">Veículo</th>
                <th className="px-6 py-4 text-xs font-bold text-black/40 uppercase">Descrição</th>
                <th className="px-6 py-4 text-xs font-bold text-black/40 uppercase text-right">Valor</th>
                <th className="px-6 py-4 text-xs font-bold text-black/40 uppercase text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/5">
              {services.map((s) => (
                <tr key={s.id} className="hover:bg-black/[0.01] transition-colors">
                  <td className="px-6 py-4 font-mono text-sm">{new Date(s.service_date).toLocaleDateString('pt-BR')}</td>
                  <td className="px-6 py-4 font-bold">{s.customer_name}</td>
                  <td className="px-6 py-4 text-sm">{s.plate} • {s.model}</td>
                  <td className="px-6 py-4 text-black/50 text-sm">{s.description}</td>
                  <td className="px-6 py-4 text-right font-mono font-bold">R$ {s.total_price.toFixed(2)}</td>
                  <td className="px-6 py-4 text-center">
                    <button 
                      onClick={() => toggleStatus(s.id)}
                      className="group focus:outline-none"
                      title="Clique para alterar o status"
                    >
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold transition-colors ${
                        s.status === 'completed' 
                          ? 'text-emerald-600 bg-emerald-50 group-hover:bg-emerald-100' 
                          : 'text-amber-600 bg-amber-50 group-hover:bg-amber-100'
                      }`}>
                        {s.status === 'completed' ? <CheckCircle2 size={12} /> : <AlertCircle size={12} />}
                        {s.status === 'completed' ? 'Concluído' : 'Pendente'}
                      </span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="text-center py-20 bg-white rounded-3xl border border-black/5">
          <Wrench className="mx-auto text-black/10 mb-4" size={64} />
          <h3 className="text-xl font-bold mb-2">Nenhuma O.S. encontrada</h3>
          <p className="text-black/50">Utilize a busca inicial para selecionar um cliente e abrir uma nova O.S.</p>
        </div>
      )}
    </motion.div>
  );
}

function EditCustomerModal({ isOpen, customer, onClose, onSuccess }: { isOpen: boolean, customer: Customer | null, onClose: () => void, onSuccess: () => void }) {
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: ''
  });

  useEffect(() => {
    if (customer) {
      setFormData({
        name: customer.name,
        phone: customer.phone,
        email: customer.email || ''
      });
    }
  }, [customer]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!customer) return;
    const res = await fetch(`/api/customers/${customer.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData)
    });
    if (res.ok) {
      onSuccess();
      onClose();
    }
  };

  if (!isOpen || !customer) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden"
      >
        <div className="bg-emerald-600 p-6 text-white flex justify-between items-center">
          <h3 className="text-xl font-bold">Editar Cliente</h3>
          <button onClick={onClose} className="hover:bg-white/10 p-2 rounded-lg transition-colors">
            <Plus className="rotate-45" size={24} />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          <div>
            <label className="block text-sm font-medium mb-1">Nome Completo</label>
            <input 
              required
              className="w-full border border-black/10 rounded-xl px-4 py-2 focus:ring-2 focus:ring-emerald-500/20 outline-none"
              value={formData.name}
              onChange={e => setFormData({...formData, name: e.target.value})}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Telefone</label>
            <input 
              required
              className="w-full border border-black/10 rounded-xl px-4 py-2 focus:ring-2 focus:ring-emerald-500/20 outline-none"
              value={formData.phone}
              onChange={e => setFormData({...formData, phone: e.target.value})}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">E-mail</label>
            <input 
              type="email"
              className="w-full border border-black/10 rounded-xl px-4 py-2 focus:ring-2 focus:ring-emerald-500/20 outline-none"
              value={formData.email}
              onChange={e => setFormData({...formData, email: e.target.value})}
            />
          </div>

          <div className="flex justify-end gap-4 mt-6">
            <button 
              type="button"
              onClick={onClose}
              className="px-6 py-2 text-black/50 font-bold hover:text-black transition-colors"
            >
              Cancelar
            </button>
            <button 
              type="submit"
              className="bg-emerald-600 text-white px-8 py-2 rounded-xl font-bold hover:bg-emerald-700 transition-colors"
            >
              Salvar Alterações
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
