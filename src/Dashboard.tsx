import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { 
  BookOpen, ChevronLeft, ChevronRight, Clock, Plus, X, Trash2, FileText, CheckCircle, TrendingUp
} from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, startOfWeek, endOfWeek, parseISO, addMonths, subMonths, addDays, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ComposedChart, Line, Legend } from 'recharts';

export default function Dashboard() {
  const [view, setView] = useState('dashboard');
  const [books, setBooks] = useState([]);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState(new Date(2026, 0, 1));
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLibModalOpen, setIsLibModalOpen] = useState(false);
  const [isReportOpen, setIsReportOpen] = useState(false);
  
  // NOVO ESTADO: Para visualizar o progresso minimalista do livro
  const [viewBook, setViewBook] = useState<any | null>(null);
  
  const [pagesRead, setPagesRead] = useState('');
  const [selectedBookId, setSelectedBookId] = useState('');
  const [newBook, setNewBook] = useState({ title: '', author: '', total_pages: '', quarter: '1' });

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);
    const { data: bData } = await supabase.from('books').select('*').order('quarter');
    const { data: lData } = await supabase.from('reading_logs').select('*, books(title)').order('date', { ascending: true });
    
    if (bData) setBooks(bData);
    if (lData) setLogs(lData);
    setLoading(false);
  };

  const totalPagesRead = logs.reduce((acc: any, curr: any) => acc + (curr.pages_read || 0), 0);
  const uniqueReadingDays = [...new Set(logs.map((l: any) => l.date))].length;
  const dailyAvg = uniqueReadingDays > 0 ? totalPagesRead / uniqueReadingDays : 0;
  const daysRemainingQ1 = differenceInDays(new Date(2026, 2, 31), new Date());

  const currentMonthIdx = new Date().getMonth();
  const isQuarterEnd = [2, 5, 8, 11].includes(currentMonthIdx);
  const currentQuarter = Math.floor(currentMonthIdx / 3) + 1;
  const booksThisQuarter = books.filter((b: any) => b.quarter === currentQuarter);
  const quarterGoalMet = booksThisQuarter.length > 0 && booksThisQuarter.every((b: any) => b.status === 'completed');

  const handleSaveReading = async () => {
    if (!selectedBookId || !pagesRead || !selectedDate) return;
    
    const { error } = await supabase.from('reading_logs').insert({
      book_id: selectedBookId, 
      pages_read: parseInt(pagesRead), 
      date: format(selectedDate, 'yyyy-MM-dd')
    });

    if (!error) {
      const book: any = books.find((x: any) => x.id === selectedBookId);
      if (book) {
        const newTotal = Math.min(book.total_pages, (book.current_page || 0) + parseInt(pagesRead));
        const newStatus = newTotal >= book.total_pages ? 'completed' : 'reading';
        
        await supabase.from('books')
          .update({ current_page: newTotal, status: newStatus })
          .eq('id', selectedBookId);
      }
      setIsModalOpen(false); 
      setPagesRead(''); 
      fetchData();
    }
  };

  const handleAddBook = async () => {
    if (!newBook.title || !newBook.total_pages) return;
    const { error } = await supabase.from('books').insert({
      title: newBook.title, 
      author: newBook.author, 
      total_pages: parseInt(newBook.total_pages),
      quarter: parseInt(newBook.quarter), 
      status: 'to_read', 
      current_page: 0
    });
    if (!error) { 
      fetchData(); 
      setIsLibModalOpen(false); 
      setNewBook({ title: '', author: '', total_pages: '', quarter: '1' }); 
    }
  };

  const handleDeleteBook = async (id: any, e: any) => {
    e.stopPropagation(); // Impede abrir o modal ao deletar
    if (window.confirm("Remover obra da biblioteca?")) {
      await supabase.from('books').delete().eq('id', id);
      fetchData();
    }
  };

  const getForecastDate = (book: any) => {
    if (book.status === 'completed') return 'Concluído';
    if (dailyAvg <= 0) return '--';
    const remaining = book.total_pages - (book.current_page || 0);
    return format(addDays(new Date(), Math.ceil(remaining / dailyAvg)), "dd/MM", { locale: ptBR });
  };

  const getComparativeData = () => {
    const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    return months.map((name, index) => {
      const mLogs = logs.filter((l: any) => new Date(l.date).getMonth() === index);
      const pages = mLogs.reduce((sum: any, l: any) => sum + l.pages_read, 0);
      const completed = books.filter((b: any) => b.status === 'completed' && b.updated_at && new Date(b.updated_at).getMonth() === index).length;
      return { name, pages, completed };
    });
  };

  if (loading) return <div className="p-10 text-center text-blue-500 italic font-black animate-pulse">Sincronizando Ciclo Acadêmico...</div>;

  return (
    <div className="min-h-screen w-full bg-[#F8FAFC] text-[#1E293B]" style={{ fontFamily: 'system-ui', fontSize: '18px' }}>
      
      <nav className="w-full bg-white border-b border-slate-300 px-8 py-6 flex justify-between items-center sticky top-0 z-50 shadow-sm">
        <div className="flex items-center gap-12">
          <div className="flex items-center gap-4 font-bold italic" style={{ fontFamily: 'Calibri' }}>
            <div className="w-12 h-12 bg-blue-500 rounded-2xl flex items-center justify-center text-white italic shadow-lg"><BookOpen size={28} /></div>
            <span className="text-3xl text-slate-900 tracking-tight">Leitura 2026</span>
          </div>
          <div className="flex bg-slate-100 p-2 rounded-3xl border border-slate-200">
            <NavBtn label="Painel" active={view === 'dashboard'} onClick={() => setView('dashboard')} />
            <NavBtn label="Estante" active={view === 'library'} onClick={() => setView('library')} />
            <NavBtn label="Dados" active={view === 'stats'} onClick={() => setView('stats')} />
          </div>
        </div>
        <div className="flex items-center gap-6">
          {quarterGoalMet && isQuarterEnd && (
            <button onClick={() => setIsReportOpen(true)} className="flex items-center gap-3 bg-emerald-100 text-emerald-700 px-6 py-3 rounded-2xl font-black italic animate-bounce border border-emerald-200">
              <FileText size={20}/> RELATÓRIO Q{currentQuarter} PRONTO
            </button>
          )}
          <div className="w-16 h-16 bg-blue-50 rounded-[1.5rem] flex items-center justify-center text-blue-700 font-black italic border border-blue-100 text-2xl">LT</div>
        </div>
      </nav>

      <main className="w-full p-8 lg:p-12 xl:p-16">
        {view === 'dashboard' && (
          <div className="animate-in fade-in duration-700 w-full">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
              <StatCard title="Volume Lido" value={totalPagesRead} unit="pág" color="blue" />
              <StatCard title="Média Diária" value={dailyAvg.toFixed(1)} unit="p/d" color="emerald" />
              <StatCard title="Concluídos" value={books.filter((b: any) => b.status === 'completed').length} unit="livros" color="amber" />
              <StatCard title="Fim Q1" value={daysRemainingQ1} unit="dias" color="rose" />
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-12 gap-12 w-full">
              
              <div className="xl:col-span-12 bg-white rounded-[4rem] p-12 shadow-xl">
                <div className="flex justify-between items-center mb-10 px-4 text-2xl font-bold italic text-slate-800">
                  <span>Diário Acadêmico</span>
                  <div className="flex items-center gap-6">
                    <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} className="p-3 bg-slate-50 rounded-2xl hover:bg-blue-50 transition-all"><ChevronLeft size={28}/></button>
                    <span className="text-slate-800 w-56 text-center text-xl" style={{ fontFamily: 'Calibri' }}>{format(currentMonth, 'MMMM yyyy', { locale: ptBR })}</span>
                    <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} className="p-3 bg-slate-50 rounded-2xl hover:bg-blue-50 transition-all"><ChevronRight size={28}/></button>
                  </div>
                </div>
                <div className="grid grid-cols-7 gap-8 rounded-[2rem] bg-slate-50 p-8 shadow-inner">
                  {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map(d => <div key={d} className="py-4 text-center text-sm font-black text-slate-400 italic tracking-widest">{d}</div>)}
                  {eachDayOfInterval({ start: startOfWeek(startOfMonth(currentMonth)), end: endOfWeek(endOfMonth(currentMonth)) }).map((day, i) => {
                    const logsDay = logs.filter((l: any) => isSameDay(parseISO(l.date), day));
                    const tot = logsDay.reduce((s: any, l: any) => s + l.pages_read, 0);
                    const isToday = isSameDay(day, new Date());
                    const isSelectedMonth = isSameDay(day, startOfMonth(currentMonth)) || (day > startOfMonth(currentMonth) && day < endOfMonth(currentMonth));
                    return (
                      // ADICIONADO: hover:shadow-blue-200
                      <div key={i} onClick={() => { setSelectedDate(day); setIsModalOpen(true); }} 
                        className={`bg-white h-64 p-6 rounded-[2rem] cursor-pointer transition-all flex flex-col justify-between
                        ${isSelectedMonth ? 'shadow-sm hover:scale-[1.02] hover:shadow-2xl hover:shadow-blue-200' : 'opacity-20 grayscale pointer-events-none'}`}>
                        <span className={`text-3xl font-black italic w-14 h-14 flex items-center justify-center rounded-2xl ${isToday ? 'bg-blue-500 text-white shadow-xl' : 'text-slate-600'}`} style={{ fontFamily: 'Calibri' }}>{format(day, 'd')}</span>
                        {tot > 0 && <div className="bg-emerald-50 text-emerald-700 text-sm font-black px-4 py-2 rounded-2xl self-start italic">+{tot}p</div>}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="xl:col-span-12 bg-white rounded-[4rem] p-12 shadow-xl h-fit">
                <h2 className="font-black text-sm text-slate-500 uppercase tracking-[0.3em] mb-12 italic border-b-2 border-slate-100 pb-4">Análise de Término</h2>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                  {books.filter((b: any) => b.quarter === currentQuarter).map((book: any) => (
                    <div key={book.id}>
                      <div className="flex justify-between items-start mb-4">
                        <h4 className="text-slate-700 italic uppercase tracking-tight text-lg leading-snug" style={{ fontFamily: 'Calibri' }}>{book.title}</h4>
                        <span className="text-slate-900 italic text-lg">{Math.round(((book.current_page || 0) / book.total_pages) * 100)}%</span>
                      </div>
                      <div className="flex items-center gap-3 text-sm text-blue-600 mb-4 uppercase italic tracking-tighter">
                        <Clock size={18}/> Estimativa: {getForecastDate(book)}
                      </div>
                      <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden shadow-inner">
                        <div className="bg-blue-500 h-full transition-all duration-1000 shadow-lg" style={{ width: `${((book.current_page || 0) / book.total_pages) * 100}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {view === 'library' && (
          <div className="animate-in slide-in-from-bottom-6 duration-700 w-full">
            <div className="flex justify-between items-center mb-16 border-b-8 border-slate-300 pb-12">
               <h1 className="text-6xl font-bold text-slate-900 italic leading-none uppercase tracking-tighter" style={{ fontFamily: 'Calibri' }}>Estante Acadêmica</h1>
               <button onClick={() => setIsLibModalOpen(true)} className="bg-blue-600 text-white px-12 py-6 rounded-[3rem] font-bold hover:bg-blue-700 shadow-2xl transition-all uppercase italic tracking-widest text-lg">
                  <Plus size={24} className="inline mr-3"/> Novo Livro
               </button>
            </div>
            <div className="space-y-24">
               {[1, 2, 3, 4].map(q => (
                 <div key={q}>
                   <h3 className="font-black text-lg text-slate-400 uppercase tracking-[0.6em] mb-12 flex items-center gap-10 italic">
                     <div className="h-1 bg-slate-300 flex-1 rounded-full"></div> TRIMESTRE {q} <div className="h-1 bg-slate-300 flex-1 rounded-full"></div>
                   </h3>
                   <div className="grid grid-cols-1 xl:grid-cols-2 gap-10">
                     {books.filter((b: any) => b.quarter === q).map((book: any) => (
                       // ADICIONADO: onClick para abrir visualização e hover:shadow-blue-200
                       <div key={book.id} onClick={() => setViewBook(book)} className="bg-white p-10 rounded-[3rem] shadow-xl relative group hover:shadow-2xl hover:shadow-blue-200 transition-all flex flex-row items-center justify-between gap-8 h-auto min-h-[180px] cursor-pointer">
                         <button onClick={(e) => handleDeleteBook(book.id, e)} className="absolute top-8 right-8 text-slate-200 hover:text-rose-600 opacity-0 group-hover:opacity-100 transition-all scale-125 z-10"><Trash2 size={24}/></button>
                         
                         <div className="flex-1 text-left">
                           <h4 className="font-bold text-2xl italic text-slate-900 mb-3 uppercase tracking-tight leading-snug">{book.title}</h4>
                           <p className="font-bold text-slate-500 uppercase italic text-sm tracking-wide">{book.author} • {book.total_pages} pág</p>
                         </div>

                         <div className="w-1/3 flex flex-col items-end justify-center pl-6 border-l-2 border-slate-100">
                           {book.status === 'completed' && <CheckCircle className="text-emerald-500 mb-2" size={32}/>}
                           <span className="text-4xl font-black text-slate-900 italic tracking-tighter mb-2">{Math.round(((book.current_page || 0)/book.total_pages)*100)}%</span>
                           <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden shadow-inner">
                             <div className="bg-blue-500 h-full shadow-md transition-all duration-1000" style={{ width: `${((book.current_page || 0)/book.total_pages)*100}%` }} />
                           </div>
                         </div>
                       </div>
                     ))}
                   </div>
                 </div>
               ))}
            </div>
          </div>
        )}

        {view === 'stats' && (
          <div className="animate-in zoom-in-95 duration-700 w-full space-y-24">
             <div className="bg-white p-16 rounded-[4rem] shadow-2xl">
                <h3 className="font-black text-xl text-slate-400 uppercase tracking-[0.4em] mb-16 italic text-center">Análise Comparativa Simultânea</h3>
                <div className="h-[600px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={getComparativeData()}>
                      <defs><linearGradient id="colorPages" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2}/><stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/></linearGradient></defs>
                      <CartesianGrid strokeDasharray="0" vertical={true} stroke="#CBD5E1" strokeOpacity={0.8} />
                      <XAxis dataKey="name" tick={{fontSize: 14, fill: '#64748b', fontStyle: 'italic', fontWeight: 900}} axisLine={{stroke: '#64748B', strokeWidth: 3}} />
                      <YAxis yAxisId="left" orientation="left" stroke="#3b82f6" tick={{fontSize: 14, fill: '#3b82f6', fontWeight: 900}} />
                      <YAxis yAxisId="right" orientation="right" stroke="#10b981" tick={{fontSize: 14, fill: '#10b981', fontWeight: 900}} />
                      <Tooltip contentStyle={{borderRadius: '30px', border: 'none', padding: '20px', boxShadow: '0 20px 40px -10px rgba(0,0,0,0.2)'}} />
                      <Legend verticalAlign="top" height={36}/>
                      <Area yAxisId="left" type="monotone" name="Volume de Páginas" dataKey="pages" stroke="#3b82f6" strokeWidth={6} fillOpacity={1} fill="url(#colorPages)" dot={{ r: 6, fill: '#1e40af', strokeWidth: 3, stroke: '#fff' }} />
                      <Line yAxisId="right" type="step" name="Obras Consolidadas" dataKey="completed" stroke="#10b981" strokeWidth={6} dot={{ r: 8, fill: '#059669', strokeWidth: 3, stroke: '#fff' }} />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
             </div>
          </div>
        )}
      </main>

      {/* MODAIS (Novo Livro, Registro e Relatório) */}
      {isReportOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xl flex items-center justify-center z-[300] p-10 animate-in fade-in">
          <div className="bg-white rounded-[4rem] w-full max-w-3xl p-16 shadow-2xl relative border border-blue-100">
            <button onClick={() => setIsReportOpen(false)} className="absolute top-10 right-10 text-slate-300 hover:text-slate-900 transition-all"><X size={32}/></button>
            <div className="text-center mb-12">
              <TrendingUp size={48} className="mx-auto text-emerald-500 mb-4"/>
              <h2 className="text-4xl font-black italic text-slate-900 uppercase tracking-tighter">Consagração Acadêmica</h2>
              <p className="text-lg text-slate-400 font-bold uppercase tracking-widest mt-2">Relatório do Ciclo Q{currentQuarter} • 2026</p>
            </div>
            <div className="prose prose-lg text-slate-700 italic leading-relaxed text-justify" style={{ fontFamily: 'Calibri' }}>
              <p>Prezado Lucas Teodoro, é com satisfação acadêmica e reverência pastoral que registramos o cumprimento integral da meta deste trimestre. Sua diligência fidedigna revela um volume de <strong>{totalPagesRead} páginas</strong> consolidadas no fundamento da verdade teológica.</p>
            </div>
          </div>
        </div>
      )}

      {isLibModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md flex items-center justify-center z-[200] p-6 animate-in zoom-in-95">
          <div className="bg-white rounded-[3rem] w-full max-w-[600px] p-16 shadow-2xl relative">
            <button onClick={() => setIsLibModalOpen(false)} className="absolute top-8 right-8 text-slate-300 hover:text-slate-900"><X size={32}/></button>
            <h3 className="font-black text-2xl text-slate-900 uppercase italic mb-12 text-center tracking-tighter">Catalogar Nova Obra</h3>
            <div className="space-y-6">
              <input type="text" placeholder="TÍTULO DA OBRA" value={newBook.title} onChange={e => setNewBook({...newBook, title: e.target.value})} className="w-full p-6 bg-slate-50 border-2 border-slate-100 rounded-[1.5rem] font-bold italic text-lg focus:border-blue-400 outline-none uppercase"/>
              <input type="text" placeholder="AUTOR" value={newBook.author} onChange={e => setNewBook({...newBook, author: e.target.value})} className="w-full p-6 bg-slate-50 border-2 border-slate-100 rounded-[1.5rem] font-bold italic text-lg focus:border-blue-400 outline-none uppercase"/>
              <div className="grid grid-cols-2 gap-6">
                <input type="number" placeholder="TOTAL PÁG" value={newBook.total_pages} onChange={e => setNewBook({...newBook, total_pages: e.target.value})} className="w-full p-6 bg-slate-50 border-2 border-slate-100 rounded-[1.5rem] font-bold italic text-lg focus:border-blue-400 outline-none text-center"/>
                <select value={newBook.quarter} onChange={e => setNewBook({...newBook, quarter: e.target.value})} className="w-full p-6 bg-slate-50 border-2 border-slate-100 rounded-[1.5rem] font-bold italic text-lg focus:border-blue-400 outline-none">
                  <option value="1">TRIMESTRE 1</option><option value="2">TRIMESTRE 2</option><option value="3">TRIMESTRE 3</option><option value="4">TRIMESTRE 4</option>
                </select>
              </div>
              <button onClick={handleAddBook} className="w-full bg-slate-900 text-white py-8 rounded-[2rem] font-black text-xl italic hover:bg-blue-600 transition-all shadow-xl">ADICIONAR À ESTANTE</button>
            </div>
          </div>
        </div>
      )}

      {/* NOVO MODAL MINIMALISTA DE VISUALIZAÇÃO DE LIVRO */}
      {viewBook && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-[300] p-6 animate-in fade-in">
          <div className="bg-white rounded-[3rem] p-12 shadow-2xl relative w-full max-w-md text-center">
            <button onClick={() => setViewBook(null)} className="absolute top-8 right-8 text-slate-300 hover:text-slate-900 transition-all"><X size={32}/></button>
            
            <div className="w-32 h-32 bg-blue-50 rounded-[2rem] mx-auto flex items-center justify-center text-blue-500 mb-8 shadow-inner">
               <BookOpen size={48} />
            </div>
            
            <h3 className="font-bold text-2xl text-slate-900 italic uppercase leading-tight mb-2 px-4">{viewBook.title}</h3>
            <p className="text-slate-400 font-bold uppercase tracking-widest text-sm mb-10">{viewBook.author}</p>
            
            <div className="text-6xl font-black text-slate-900 italic tracking-tighter mb-4 text-blue-600">{Math.round(((viewBook.current_page || 0) / viewBook.total_pages) * 100)}%</div>
            <p className="text-slate-400 font-bold uppercase tracking-widest text-xs mb-8">{viewBook.current_page || 0} / {viewBook.total_pages} PÁGINAS</p>
            
            <div className="w-full bg-slate-100 h-6 rounded-full overflow-hidden shadow-inner">
               <div className="bg-blue-500 h-full transition-all duration-1000" style={{ width: `${((viewBook.current_page || 0) / viewBook.total_pages) * 100}%` }}></div>
            </div>
          </div>
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md flex items-center justify-center z-[200] p-6 animate-in fade-in">
          <div className="bg-white rounded-[3rem] w-full max-w-[400px] p-12 shadow-2xl text-center relative">
            <button onClick={() => setIsModalOpen(false)} className="absolute top-8 right-8 text-slate-300 hover:text-slate-900 transition-all"><X size={32}/></button>
            <h3 className="font-black text-slate-500 uppercase tracking-widest italic mb-6">Fruto do Estudo</h3>
            <p className="text-xl font-black italic text-blue-600 mb-8 uppercase">{format(selectedDate, "dd 'de' MMMM", {locale: ptBR})}</p>
            <div className="space-y-6">
              <select value={selectedBookId} onChange={e => setSelectedBookId(e.target.value)} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-black italic text-lg focus:border-blue-400 outline-none">
                <option value="">LIVRO...</option>{books.map((b: any) => <option key={b.id} value={b.id}>{b.title}</option>)}
              </select>
              <input type="number" value={pagesRead} onChange={e => setPagesRead(e.target.value)} placeholder="0" className="w-full p-6 bg-slate-100 border-none rounded-[1.5rem] font-black text-5xl text-center italic text-slate-900 focus:ring-4 focus:ring-blue-100 outline-none"/>
              <button onClick={handleSaveReading} className="w-full bg-blue-600 text-white font-black py-6 rounded-[1.5rem] text-xl italic hover:bg-blue-700 shadow-xl transition-all uppercase">GUARDAR FRUTO</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function NavBtn({ label, active, onClick }: any) {
  return (
    <button onClick={onClick} className={`px-10 py-4 rounded-[1.5rem] font-black transition-all uppercase tracking-[0.2em] italic text-xs ${active ? 'bg-slate-900 text-white shadow-xl' : 'text-slate-500 hover:text-slate-900'}`}>
      {label}
    </button>
  );
}

function StatCard({ title, value, unit, color }: any) {
  const colors: any = { blue: "bg-blue-100 text-blue-900 border-blue-200", emerald: "bg-emerald-100 text-emerald-800 border-emerald-200", amber: "bg-amber-100 text-amber-800 border-amber-200", rose: "bg-rose-100 text-rose-800 border-rose-200" };
  return (
    // ADICIONADO: hover:shadow-blue-200
    <div className="bg-white p-10 rounded-[3rem] shadow-lg transition-all hover:scale-[1.02] hover:shadow-2xl hover:shadow-blue-200">
      <p className="text-slate-500 text-xs font-black uppercase tracking-[0.25em] mb-6 italic">{title}</p>
      <div className="flex items-end gap-4">
        <h3 className="text-5xl font-black text-slate-900 leading-none italic tracking-tighter" style={{ fontFamily: 'Calibri' }}>{value}</h3>
        <span className={`text-sm font-bold uppercase italic px-4 py-1.5 rounded-xl border ${colors[color]}`}>{unit}</span>
      </div>
    </div>
  );
}