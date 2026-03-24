import { useState, useEffect, useMemo, useRef } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Activity, PlusCircle, List, TrendingDown, Trash2, Download, Upload, CheckCircle, Pencil, AlertCircle } from 'lucide-react';

type SwimStyle = 'Crol' | 'Espalda' | 'Pecho' | 'Mariposa';
type PoolType = 'Corta' | 'Larga';

interface SwimRecord {
  id: string;
  swimmerName: string;
  date: string;
  style: SwimStyle;
  distance: number;
  poolType?: PoolType;
  time: string;
  timeInSeconds: number;
}

const STYLES: SwimStyle[] = ['Crol', 'Espalda', 'Pecho', 'Mariposa'];
const DISTANCES = [25, 50, 100, 200, 400, 800, 1500];
const COLORS = ['#2563eb', '#16a34a', '#dc2626', '#ca8a04', '#9333ea', '#0891b2', '#ea580c', '#be123c', '#1d4ed8', '#047857'];

function parseTimeToSeconds(timeStr: string): number {
  try {
    const [minSec, centi] = timeStr.split('.');
    const [min, sec] = minSec.split(':');
    return parseInt(min, 10) * 60 + parseInt(sec, 10) + (parseInt(centi || '0', 10) / 100);
  } catch (e) {
    return 0;
  }
}

function formatTimeFromSeconds(totalSeconds: number): string {
  const mins = Math.floor(totalSeconds / 60);
  const secs = Math.floor(totalSeconds % 60);
  const centis = Math.round((totalSeconds - Math.floor(totalSeconds)) * 100);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${centis.toString().padStart(2, '0')}`;
}

export default function App() {
  const [records, setRecords] = useState<SwimRecord[]>(() => {
    const saved = localStorage.getItem('swimRecords');
    if (saved) {
      const parsed = JSON.parse(saved);
      return parsed.sort((a: SwimRecord, b: SwimRecord) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }
    return [];
  });

  const [activeTab, setActiveTab] = useState<'add' | 'history' | 'chart'>('add');

  // Form state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [swimmerName, setSwimmerName] = useState('Gabox');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [style, setStyle] = useState<SwimStyle>('Crol');
  const [distance, setDistance] = useState<number>(50);
  const [poolType, setPoolType] = useState<PoolType>('Corta');
  const [timeMin, setTimeMin] = useState('');
  const [timeSec, setTimeSec] = useState('');
  const [timeCen, setTimeCen] = useState('');

  // Filters
  const [chartStyle, setChartStyle] = useState<SwimStyle | 'Todos'>('Crol');
  const [chartDistance, setChartDistance] = useState<number | 'Todos'>(50);
  const [chartPoolType, setChartPoolType] = useState<PoolType | 'Todas'>('Todas');
  
  const [historySwimmer, setHistorySwimmer] = useState<string | 'Todos'>('Todos');
  const [historyPoolType, setHistoryPoolType] = useState<PoolType | 'Todas'>('Todas');

  // UI State
  const [importMessage, setImportMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [recordToDelete, setRecordToDelete] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const uniqueSwimmers = useMemo(() => {
    const names = records.map(r => r.swimmerName || 'Desconocido');
    return Array.from(new Set(names)).sort();
  }, [records]);

  useEffect(() => {
    localStorage.setItem('swimRecords', JSON.stringify(records));
  }, [records]);

  const showError = (msg: string) => {
    setErrorMessage(msg);
    setTimeout(() => setErrorMessage(''), 4000);
  };

  const handleAddRecord = (e: React.FormEvent) => {
    e.preventDefault();
    
    const m = timeMin.padStart(2, '0') || '00';
    const s = timeSec.padStart(2, '0') || '00';
    const c = timeCen.padStart(2, '0') || '00';
    const timeStr = `${m}:${s}.${c}`;
    const timeInSeconds = parseTimeToSeconds(timeStr);

    if (timeInSeconds === 0) {
      showError('Por favor ingresa un tiempo válido.');
      return;
    }

    const recordData: SwimRecord = {
      id: editingId || crypto.randomUUID(),
      swimmerName: swimmerName.trim() || 'Desconocido',
      date,
      style,
      distance,
      poolType,
      time: timeStr,
      timeInSeconds,
    };

    if (editingId) {
      setRecords(prev => prev.map(r => r.id === editingId ? recordData : r).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
      setEditingId(null);
    } else {
      setRecords(prev => [...prev, recordData].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
    }
    
    // Reset time fields
    setTimeMin('');
    setTimeSec('');
    setTimeCen('');
    setActiveTab('history');
  };

  const handleEdit = (record: SwimRecord) => {
    setEditingId(record.id);
    setSwimmerName(record.swimmerName || 'Desconocido');
    setDate(record.date);
    setStyle(record.style);
    setDistance(record.distance);
    setPoolType(record.poolType || 'Corta');
    
    const [minSec, centi] = record.time.split('.');
    const [min, sec] = minSec.split(':');
    setTimeMin(min);
    setTimeSec(sec);
    setTimeCen(centi || '00');
    
    setActiveTab('add');
  };

  const cancelEdit = () => {
    setEditingId(null);
    setTimeMin('');
    setTimeSec('');
    setTimeCen('');
    setActiveTab('history');
  };

  const executeDelete = () => {
    if (recordToDelete) {
      setRecords(prev => prev.filter(r => r.id !== recordToDelete));
      setRecordToDelete(null);
    }
  };

  const handleExport = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(records));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", `swim_records_backup_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const importedRecords = JSON.parse(event.target?.result as string);
        if (Array.isArray(importedRecords)) {
          setRecords(prev => {
            const existingIds = new Set(prev.map(r => r.id));
            const newRecords = importedRecords.filter(r => !existingIds.has(r.id));
            return [...prev, ...newRecords].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
          });
          setImportMessage('¡Datos guardados con éxito!');
          setTimeout(() => setImportMessage(''), 4000);
        } else {
          throw new Error("Formato inválido");
        }
      } catch (error) {
        showError('Error al leer el archivo JSON. Asegúrate de que sea un respaldo válido.');
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const historyData = useMemo(() => {
    let filtered = records;
    if (historySwimmer !== 'Todos') {
      filtered = filtered.filter(r => (r.swimmerName || 'Desconocido') === historySwimmer);
    }
    if (historyPoolType !== 'Todas') {
      filtered = filtered.filter(r => (r.poolType || 'Corta') === historyPoolType);
    }
    return [...filtered].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [records, historySwimmer, historyPoolType]);

  const { chartData, chartSwimmers } = useMemo(() => {
    let filtered = records;
    if (chartStyle !== 'Todos') filtered = filtered.filter(r => r.style === chartStyle);
    if (chartDistance !== 'Todos') filtered = filtered.filter(r => r.distance === chartDistance);
    if (chartPoolType !== 'Todas') filtered = filtered.filter(r => (r.poolType || 'Corta') === chartPoolType);
    
    filtered.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    const activeSwimmers = Array.from(new Set(filtered.map(r => r.swimmerName || 'Desconocido')));
    const groupedByDate: Record<string, any> = {};

    filtered.forEach(r => {
      if (!groupedByDate[r.date]) {
        groupedByDate[r.date] = { date: r.date };
      }
      const swimmer = r.swimmerName || 'Desconocido';
      if (!groupedByDate[r.date][swimmer] || r.timeInSeconds < groupedByDate[r.date][swimmer]) {
        groupedByDate[r.date][swimmer] = r.timeInSeconds;
      }
    });

    return { 
      chartData: Object.values(groupedByDate),
      chartSwimmers: activeSwimmers
    };
  }, [records, chartStyle, chartDistance, chartPoolType]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-gray-200 shadow-lg rounded-lg min-w-[150px]">
          <p className="font-semibold text-gray-800 mb-2 border-b pb-1">
            {new Date(label).toLocaleDateString('es-ES', { month: 'short', day: 'numeric', year: 'numeric' })}
          </p>
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex justify-between items-center gap-4 mb-1">
              <span style={{ color: entry.color }} className="font-medium">{entry.name}</span>
              <span className="font-bold text-gray-900">{formatTimeFromSeconds(entry.value)}</span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans pb-20 md:pb-0">
      
      {/* Global Error Message */}
      {errorMessage && (
        <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-50 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-xl flex items-center gap-2 shadow-lg animate-in fade-in slide-in-from-top-4 w-[90%] max-w-md">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span className="font-medium text-sm">{errorMessage}</span>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {recordToDelete && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl animate-in zoom-in-95">
            <h3 className="text-lg font-bold text-gray-900 mb-2">Eliminar Registro</h3>
            <p className="text-gray-600 mb-6">¿Estás seguro de que deseas eliminar este registro? Esta acción no se puede deshacer.</p>
            <div className="flex justify-end gap-3">
              <button 
                onClick={() => setRecordToDelete(null)} 
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg font-medium transition-colors"
              >
                Cancelar
              </button>
              <button 
                onClick={executeDelete} 
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors"
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="bg-blue-600 text-white p-4 shadow-md sticky top-0 z-10">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="w-6 h-6" />
            <h1 className="text-xl font-bold">Swim Tracker</h1>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto p-4 md:py-8">
        
        {/* Desktop Navigation */}
        <div className="hidden md:flex gap-2 mb-6 bg-white p-1 rounded-xl shadow-sm border border-gray-100">
          <button 
            onClick={() => setActiveTab('add')}
            className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 ${activeTab === 'add' ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:bg-gray-50'}`}
          >
            <PlusCircle className="w-4 h-4" /> {editingId ? 'Editar Registro' : 'Nuevo Registro'}
          </button>
          <button 
            onClick={() => setActiveTab('history')}
            className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 ${activeTab === 'history' ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:bg-gray-50'}`}
          >
            <List className="w-4 h-4" /> Historial & Respaldo
          </button>
          <button 
            onClick={() => setActiveTab('chart')}
            className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 ${activeTab === 'chart' ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:bg-gray-50'}`}
          >
            <TrendingDown className="w-4 h-4" /> Progreso
          </button>
        </div>

        {/* Tab Content */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          
          {/* ADD RECORD TAB */}
          {activeTab === 'add' && (
            <div className="p-6">
              <h2 className="text-lg font-bold mb-4 text-gray-800">{editingId ? 'Editar Registro' : 'Registrar Tiempo'}</h2>
              <form onSubmit={handleAddRecord} className="space-y-5">
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Nadador</label>
                    <input 
                      type="text" 
                      required
                      list="swimmers-list"
                      value={swimmerName}
                      onChange={(e) => setSwimmerName(e.target.value)}
                      placeholder="Ej. Gabox"
                      className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                    />
                    <datalist id="swimmers-list">
                      {uniqueSwimmers.map(s => <option key={s} value={s} />)}
                    </datalist>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Fecha</label>
                    <input 
                      type="date" 
                      required
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Estilo</label>
                    <select 
                      value={style}
                      onChange={(e) => setStyle(e.target.value as SwimStyle)}
                      className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all bg-white"
                    >
                      {STYLES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Distancia (m)</label>
                    <select 
                      value={distance}
                      onChange={(e) => setDistance(Number(e.target.value))}
                      className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all bg-white"
                    >
                      {DISTANCES.map(d => <option key={d} value={d}>{d}m</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Piscina</label>
                    <select 
                      value={poolType}
                      onChange={(e) => setPoolType(e.target.value as PoolType)}
                      className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all bg-white"
                    >
                      <option value="Corta">Corta (25m)</option>
                      <option value="Larga">Larga (50m)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tiempo (MM:SS.cc)</label>
                  <div className="flex items-center gap-2">
                    <input 
                      type="number" 
                      placeholder="00"
                      min="0" max="59"
                      value={timeMin}
                      onChange={(e) => setTimeMin(e.target.value)}
                      className="w-full p-3 border border-gray-300 rounded-xl text-center focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                    />
                    <span className="font-bold text-gray-400">:</span>
                    <input 
                      type="number" 
                      placeholder="00"
                      min="0" max="59"
                      value={timeSec}
                      onChange={(e) => setTimeSec(e.target.value)}
                      className="w-full p-3 border border-gray-300 rounded-xl text-center focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                    />
                    <span className="font-bold text-gray-400">.</span>
                    <input 
                      type="number" 
                      placeholder="00"
                      min="0" max="99"
                      value={timeCen}
                      onChange={(e) => setTimeCen(e.target.value)}
                      className="w-full p-3 border border-gray-300 rounded-xl text-center focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                    />
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  {editingId && (
                    <button 
                      type="button"
                      onClick={cancelEdit}
                      className="w-1/3 bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold py-3 px-4 rounded-xl transition-colors shadow-sm"
                    >
                      Cancelar
                    </button>
                  )}
                  <button 
                    type="submit"
                    className={`${editingId ? 'w-2/3' : 'w-full'} bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-xl transition-colors shadow-sm flex justify-center items-center gap-2`}
                  >
                    <PlusCircle className="w-5 h-5" /> {editingId ? 'Actualizar Registro' : 'Guardar Registro'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* HISTORY TAB */}
          {activeTab === 'history' && (
            <div className="p-4 sm:p-6">
              
              {/* Backup & Restore Controls */}
              <div className="mb-6 pb-6 border-b border-gray-100">
                <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3">Respaldo de Datos</h3>
                <div className="flex flex-wrap gap-3">
                  <button 
                    onClick={handleExport} 
                    className="flex items-center gap-2 text-sm bg-gray-100 hover:bg-gray-200 text-gray-800 font-medium py-2 px-4 rounded-xl transition-colors"
                  >
                    <Download className="w-4 h-4" /> Exportar Datos
                  </button>
                  <button 
                    onClick={() => fileInputRef.current?.click()} 
                    className="flex items-center gap-2 text-sm bg-blue-50 hover:bg-blue-100 text-blue-700 font-medium py-2 px-4 rounded-xl transition-colors"
                  >
                    <Upload className="w-4 h-4" /> Importar Datos
                  </button>
                  <input type="file" accept=".json" ref={fileInputRef} onChange={handleImport} className="hidden" />
                </div>
                
                {importMessage && (
                  <div className="mt-3 p-3 bg-green-50 text-green-700 rounded-xl flex items-center gap-2 text-sm font-medium border border-green-200 animate-in fade-in slide-in-from-top-2">
                    <CheckCircle className="w-5 h-5" /> {importMessage}
                  </div>
                )}
              </div>

              {/* Filters */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                <h2 className="text-lg font-bold text-gray-800">Historial de Tiempos</h2>
                <div className="flex gap-2">
                  <select 
                    value={historySwimmer}
                    onChange={(e) => setHistorySwimmer(e.target.value)}
                    className="p-2 border border-gray-200 rounded-lg text-sm bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    <option value="Todos">Todos los nadadores</option>
                    {uniqueSwimmers.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                  <select 
                    value={historyPoolType}
                    onChange={(e) => setHistoryPoolType(e.target.value as any)}
                    className="p-2 border border-gray-200 rounded-lg text-sm bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    <option value="Todas">Todas las piscinas</option>
                    <option value="Corta">Corta (25m)</option>
                    <option value="Larga">Larga (50m)</option>
                  </select>
                </div>
              </div>
              
              {historyData.length === 0 ? (
                <div className="p-8 text-center text-gray-500 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                  <p>No hay registros que coincidan con los filtros.</p>
                </div>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-gray-200 shadow-sm">
                  <table className="w-full min-w-[600px] text-sm text-left">
                    <thead className="bg-gray-50 text-gray-600 font-medium border-b border-gray-200">
                      <tr>
                        <th className="p-3">Fecha</th>
                        <th className="p-3">Nadador</th>
                        <th className="p-3">Prueba</th>
                        <th className="p-3">Tiempo</th>
                        <th className="p-3 text-right">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 bg-white">
                      {historyData.map((record) => (
                        <tr key={record.id} className="hover:bg-gray-50 transition-colors">
                          <td className="p-3 whitespace-nowrap text-gray-500">
                            {new Date(record.date).toLocaleDateString('es-ES', { year: 'numeric', month: 'short', day: 'numeric' })}
                          </td>
                          <td className="p-3 font-medium text-gray-900">{record.swimmerName || 'Desconocido'}</td>
                          <td className="p-3">
                            <div className="flex items-center gap-1 flex-wrap">
                              <span className="text-[11px] font-medium px-2 py-0.5 bg-blue-100 text-blue-800 rounded-full">{record.style}</span>
                              <span className="text-[11px] font-medium px-2 py-0.5 bg-gray-100 text-gray-800 rounded-full">{record.distance}m</span>
                              <span className="text-[11px] font-medium px-2 py-0.5 bg-teal-100 text-teal-800 rounded-full">{record.poolType || 'Corta'}</span>
                            </div>
                          </td>
                          <td className="p-3 font-bold text-gray-900 text-base">{record.time}</td>
                          <td className="p-3 text-right whitespace-nowrap">
                            <button 
                              onClick={() => handleEdit(record)}
                              className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors inline-flex mr-1"
                              aria-label="Editar registro"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button 
                              onClick={() => setRecordToDelete(record.id)}
                              className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors inline-flex"
                              aria-label="Eliminar registro"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* CHART TAB */}
          {activeTab === 'chart' && (
            <div className="p-4 sm:p-6">
              <h2 className="text-lg font-bold mb-4 text-gray-800">Gráfica de Progreso</h2>
              
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1 uppercase tracking-wider">Filtrar Estilo</label>
                  <select 
                    value={chartStyle}
                    onChange={(e) => setChartStyle(e.target.value as any)}
                    className="w-full p-2 border border-gray-200 rounded-lg text-sm bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    <option value="Todos">Todos</option>
                    {STYLES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1 uppercase tracking-wider">Filtrar Distancia</label>
                  <select 
                    value={chartDistance}
                    onChange={(e) => setChartDistance(e.target.value === 'Todos' ? 'Todos' : Number(e.target.value))}
                    className="w-full p-2 border border-gray-200 rounded-lg text-sm bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    <option value="Todos">Todas</option>
                    {DISTANCES.map(d => <option key={d} value={d}>{d}m</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1 uppercase tracking-wider">Filtrar Piscina</label>
                  <select 
                    value={chartPoolType}
                    onChange={(e) => setChartPoolType(e.target.value as any)}
                    className="w-full p-2 border border-gray-200 rounded-lg text-sm bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    <option value="Todas">Todas</option>
                    <option value="Corta">Corta (25m)</option>
                    <option value="Larga">Larga (50m)</option>
                  </select>
                </div>
              </div>

              {chartData.length === 0 ? (
                <div className="h-64 flex items-center justify-center text-center text-gray-500 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                  <p className="px-4">Añade registros con estos filtros para ver la gráfica de progreso.</p>
                </div>
              ) : (
                <div className="h-80 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                      <XAxis 
                        dataKey="date" 
                        tickFormatter={(val) => new Date(val).toLocaleDateString('es-ES', { month: 'short', day: 'numeric' })}
                        stroke="#9ca3af"
                        fontSize={12}
                        tickMargin={10}
                      />
                      <YAxis 
                        reversed={true} 
                        domain={['auto', 'auto']}
                        tickFormatter={(val) => formatTimeFromSeconds(val).split('.')[0]} // Only show MM:SS on axis
                        stroke="#9ca3af"
                        fontSize={12}
                      />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '20px' }} />
                      
                      {chartSwimmers.map((swimmer, index) => (
                        <Line 
                          key={swimmer}
                          type="monotone" 
                          dataKey={swimmer} 
                          name={swimmer}
                          stroke={COLORS[index % COLORS.length]} 
                          strokeWidth={3}
                          connectNulls={true}
                          dot={{ r: 4, fill: '#fff', strokeWidth: 2 }}
                          activeDot={{ r: 6, strokeWidth: 0 }}
                        />
                      ))}
                    </LineChart>
                  </ResponsiveContainer>
                  <p className="text-center text-xs text-gray-400 mt-6">La gráfica está invertida: los puntos más bajos indican mejores tiempos.</p>
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 pb-4 z-20">
        <div className="flex justify-around items-center h-16">
          <button 
            onClick={() => setActiveTab('add')}
            className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${activeTab === 'add' ? 'text-blue-600' : 'text-gray-500 hover:text-gray-900'}`}
          >
            <PlusCircle className="w-6 h-6" />
            <span className="text-[10px] font-medium">Añadir</span>
          </button>
          <button 
            onClick={() => setActiveTab('history')}
            className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${activeTab === 'history' ? 'text-blue-600' : 'text-gray-500 hover:text-gray-900'}`}
          >
            <List className="w-6 h-6" />
            <span className="text-[10px] font-medium">Historial</span>
          </button>
          <button 
            onClick={() => setActiveTab('chart')}
            className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${activeTab === 'chart' ? 'text-blue-600' : 'text-gray-500 hover:text-gray-900'}`}
          >
            <TrendingDown className="w-6 h-6" />
            <span className="text-[10px] font-medium">Progreso</span>
          </button>
        </div>
      </nav>
    </div>
  );
}
