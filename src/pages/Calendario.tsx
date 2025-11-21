import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Plus, Pencil, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';

// 👇 TU NUEVA URL DE APPS SCRIPT YA CONFIGURADA
const WEBAPP_URL = 'https://script.google.com/macros/s/AKfycbyP-AXqFrCCrqt6sn5BIAFHm---nTyYV1j9kr_OQ8_yFDz8z3iErScR5Rl5aIw0PK4E/exec';
const API_KEY = '123Tamarindo';

interface Event {
  id: string;
  title: string;
  date: string;
  is_important: boolean;
  is_recurring: boolean;
  recurring_day: number | null;
  recurring_type?: 'none' | 'every_7_days' | 'every_15_days' | 'monthly' | 'every_2_months' | 'every_4_months' | 'every_6_months' | 'every_year';
  recurring_dates?: string[]; // Multiple dates for the same event
  color?: 'green' | 'red' | 'yellow';
  notes: string | null;
}

// Propiedad para distinguir si es Gerente o Admin
interface CalendarioProps {
  isGerente?: boolean;
}

const Calendario = ({ isGerente = false }: CalendarioProps) => {
  const [events, setEvents] = useState<Event[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEventListOpen, setIsEventListOpen] = useState(false);
  const [selectedDayEvents, setSelectedDayEvents] = useState<Event[]>([]);
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [deletingEventId, setDeletingEventId] = useState<string | null>(null);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  
  const [formData, setFormData] = useState({
    title: '',
    date: '',
    is_important: false,
    is_recurring: false,
    recurring_day: 1,
    recurring_type: 'monthly' as 'none' | 'every_7_days' | 'every_15_days' | 'monthly' | 'every_2_months' | 'every_4_months' | 'every_6_months' | 'every_year',
    recurring_dates: [] as string[],
    color: undefined as 'green' | 'red' | 'yellow' | undefined,
    notes: '',
  });

  const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    try {
      const response = await fetch(WEBAPP_URL, {
        method: 'POST',
        body: JSON.stringify({ action: 'calendar.list', apiKey: API_KEY })
      });
      const result = await response.json();
      
      if (result.ok && Array.isArray(result.data)) {
        let loadedEvents = result.data;
        
        // --- FILTRO DE VISUALIZACIÓN ---
        if (isGerente) {
          // Gerente solo ve eventos 'EveI-'
          loadedEvents = loadedEvents.filter((e: Event) => e.id.startsWith('EveI-'));
        } else {
           // Admin ve eventos 'Eve-' (Si quieres que admin vea TODO, borra este else)
           loadedEvents = loadedEvents.filter((e: Event) => e.id.startsWith('Eve-'));
        }

        // Normalizar fechas
        const formattedEvents = loadedEvents.map((e: any) => ({
          ...e,
          date: e.date ? e.date.substring(0, 10) : '',
          recurring_day: e.recurring_day ? Number(e.recurring_day) : null
        }));
        
        setEvents(formattedEvents);
      }
    } catch (error) {
      toast.error('Error de conexión al cargar eventos');
    }
  };

  const getDaysInMonth = (month: number, year: number) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (month: number, year: number) => new Date(year, month, 1).getDay();

  const getEventsForDay = (day: number, month: number) => {
    const dateStr = `${selectedYear}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const currentDate = new Date(selectedYear, month, day);
    
    return events.filter(event => {
      // Check multi-date events
      if (event.recurring_dates && event.recurring_dates.length > 0) {
        return event.recurring_dates.some(d => d === dateStr);
      }
      
      // Check recurring events
      if (event.is_recurring && event.recurring_type) {
        const eventDate = new Date(event.date);
        const diffTime = currentDate.getTime() - eventDate.getTime();
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        
        switch (event.recurring_type) {
          case 'every_7_days':
            return diffDays >= 0 && diffDays % 7 === 0;
          case 'every_15_days':
            return diffDays >= 0 && diffDays % 15 === 0;
          case 'monthly':
            return event.recurring_day === day;
          case 'every_2_months':
            const monthDiff2 = (selectedYear - eventDate.getFullYear()) * 12 + month - eventDate.getMonth();
            return monthDiff2 >= 0 && monthDiff2 % 2 === 0 && event.recurring_day === day;
          case 'every_4_months':
            const monthDiff4 = (selectedYear - eventDate.getFullYear()) * 12 + month - eventDate.getMonth();
            return monthDiff4 >= 0 && monthDiff4 % 4 === 0 && event.recurring_day === day;
          case 'every_6_months':
            const monthDiff6 = (selectedYear - eventDate.getFullYear()) * 12 + month - eventDate.getMonth();
            return monthDiff6 >= 0 && monthDiff6 % 6 === 0 && event.recurring_day === day;
          case 'every_year':
            const yearDiff = selectedYear - eventDate.getFullYear();
            return yearDiff >= 0 && month === eventDate.getMonth() && event.recurring_day === day;
          default:
            return event.recurring_day === day;
        }
      }
      
      return event.date === dateStr;
    });
  };

  const getUpcomingEvents = () => {
    const today = new Date();
    const upcoming: Array<Event & { displayDate: Date }> = [];
    
    // Check next 365 days
    for (let i = 0; i < 365; i++) {
      const checkDate = new Date(today);
      checkDate.setDate(today.getDate() + i);
      const day = checkDate.getDate();
      const month = checkDate.getMonth();
      const year = checkDate.getFullYear();
      
      const eventsOnDay = getEventsForDay(day, month);
      eventsOnDay.forEach(event => {
        if (upcoming.length < 5) {
          upcoming.push({ ...event, displayDate: new Date(checkDate) });
        }
      });
      
      if (upcoming.length >= 5) break;
    }
    
    return upcoming;
  };

  const handleDayClick = (day: number, month: number) => {
    const dateStr = `${selectedYear}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const dayEvents = getEventsForDay(day, month);
    
    if (dayEvents.length > 0) {
      setSelectedDayEvents(dayEvents);
      setIsEventListOpen(true);
    } else {
      resetForm();
      setFormData(prev => ({ ...prev, date: dateStr, recurring_day: day }));
      setIsDialogOpen(true);
    }
  };

  const resetForm = () => {
    setFormData({ 
      title: '', 
      date: '', 
      is_important: false, 
      is_recurring: false, 
      recurring_day: 1, 
      recurring_type: 'monthly',
      recurring_dates: [],
      color: undefined,
      notes: '' 
    });
    setEditingEventId(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // --- LÓGICA DE ROLES ---
    let action = 'calendar.create'; // Por defecto Admin (Eve-)
    
    if (editingEventId) {
        action = 'calendar.update';
    } else if (isGerente) {
        action = 'calendar.create.gerente'; // Acción especial Gerente (EveI-)
    }

    const payload = {
      action,
      apiKey: API_KEY,
      id: editingEventId,
      ...formData
    };

    try {
      const res = await fetch(WEBAPP_URL, {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      const result = await res.json();
      
      if (result.ok) {
        toast.success(editingEventId ? 'Evento actualizado' : 'Evento creado');
        setIsDialogOpen(false);
        resetForm();
        fetchEvents();
      } else {
        toast.error('Error: ' + result.error);
      }
    } catch (err) {
      toast.error('Error de red al guardar');
    }
  };

  const handleDelete = async () => {
    if (!deletingEventId) return;
    try {
      const res = await fetch(WEBAPP_URL, {
        method: 'POST',
        body: JSON.stringify({ action: 'calendar.delete', apiKey: API_KEY, id: deletingEventId })
      });
      if ((await res.json()).ok) {
        toast.success('Eliminado');
        setDeletingEventId(null);
        setIsEventListOpen(false);
        fetchEvents();
      }
    } catch (e) { toast.error('Error al eliminar'); }
  };

  const renderMonth = (monthIndex: number) => {
    const daysInMonth = getDaysInMonth(monthIndex, selectedYear);
    const firstDay = getFirstDayOfMonth(monthIndex, selectedYear);
    const days = [];
    for (let i = 0; i < firstDay; i++) days.push(<div key={`empty-${i}`} />);
    
    for (let day = 1; day <= daysInMonth; day++) {
      const dayEvents = getEventsForDay(day, monthIndex);
      const hasEv = dayEvents.length > 0;
      const isImp = dayEvents.some(e => e.is_important);
      const isRec = dayEvents.some(e => e.is_recurring || (e.recurring_dates && e.recurring_dates.length > 0));
      
      let bgClass = 'bg-secondary hover:bg-secondary/80';
      if (hasEv) {
          if (isImp) bgClass = 'bg-destructive text-white hover:bg-destructive/90';
          else if (isRec) bgClass = 'bg-blue-600 text-white hover:bg-blue-700';
          else {
            const eventColor = dayEvents[0]?.color;
            if (eventColor === 'green') bgClass = 'bg-green-600 text-white hover:bg-green-700';
            else if (eventColor === 'red') bgClass = 'bg-red-600 text-white hover:bg-red-700';
            else if (eventColor === 'yellow') bgClass = 'bg-yellow-500 text-white hover:bg-yellow-600';
            else bgClass = 'bg-green-600 text-white hover:bg-green-700';
          }
      }
      
      days.push(
        <button key={day} onClick={() => handleDayClick(day, monthIndex)} className={`${bgClass} w-8 h-8 lg:w-10 lg:h-10 rounded-full flex items-center justify-center text-xs lg:text-sm font-medium transition-all hover:scale-110`}>
          {day}
        </button>
      );
    }
    return days;
  };

  const upcomingEvents = getUpcomingEvents();

  return (
    <div className="space-y-6 pb-10">
      <div className="flex justify-between items-center">
         <h1 className="text-3xl font-bold text-primary">{isGerente ? 'Calendario Gerente' : 'Calendario Admin'}</h1>
         <div className="flex gap-2 items-center">
            <Button variant="ghost" onClick={() => setSelectedYear(y => y - 1)}><ChevronLeft /></Button>
            <span className="text-xl font-bold">{selectedYear}</span>
            <Button variant="ghost" onClick={() => setSelectedYear(y => y + 1)}><ChevronRight /></Button>
         </div>
      </div>

      {/* Próximos eventos */}
      <Card className="glass-card border-[rgba(255,255,255,0.1)]">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Próximos 5 Eventos</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {upcomingEvents.length === 0 ? (
              <p className="text-muted-foreground text-sm">No hay eventos próximos</p>
            ) : (
              upcomingEvents.map((event, idx) => (
                <div key={idx} className="flex justify-between items-center p-2 border border-[rgba(255,255,255,0.1)] rounded bg-secondary/20">
                  <div>
                    <p className="font-semibold">{event.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {event.displayDate.toLocaleDateString('es-MX', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                    </p>
                  </div>
                  <div className="flex gap-2 items-center">
                    {event.color === 'green' && <div className="w-3 h-3 rounded-full bg-green-600" />}
                    {event.color === 'red' && <div className="w-3 h-3 rounded-full bg-red-600" />}
                    {event.color === 'yellow' && <div className="w-3 h-3 rounded-full bg-yellow-500" />}
                    {event.is_important && <span className="text-destructive text-xs font-bold">IMPORTANTE</span>}
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
      
      <div className="flex justify-end mb-4">
         <Button onClick={() => { resetForm(); setIsDialogOpen(true); }} className="gap-2"><Plus size={18}/> Añadir Evento</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {monthNames.map((month, idx) => (
          <Card key={month} className="glass-card border-[rgba(255,255,255,0.1)]">
            <CardHeader className="p-4"><CardTitle className="text-center">{month}</CardTitle></CardHeader>
            <CardContent className="p-4">
              <div className="grid grid-cols-7 gap-1 text-center mb-2 text-xs text-muted-foreground">
                <div>D</div><div>L</div><div>M</div><div>M</div><div>J</div><div>V</div><div>S</div>
              </div>
              <div className="grid grid-cols-7 gap-1">
                {renderMonth(idx)}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      
      {/* Modal Crear/Editar */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent>
            <DialogHeader><DialogTitle>{editingEventId ? 'Editar' : 'Nuevo'} Evento</DialogTitle></DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 mt-2">
               <div className="space-y-2">
                 <Label>Título</Label>
                 <Input value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} required className="bg-secondary/50" />
               </div>
               
               <div className="flex items-center space-x-2 p-2 border rounded bg-secondary/20">
                 <Checkbox id="rec" checked={formData.is_recurring} onCheckedChange={(c) => setFormData({...formData, is_recurring: !!c})} />
                 <Label htmlFor="rec">Evento recurrente</Label>
               </div>

               {formData.is_recurring ? (
                 <>
                   <div className="space-y-2">
                     <Label>Tipo de recurrencia</Label>
                      <select 
                        value={formData.recurring_type} 
                        onChange={e => setFormData({...formData, recurring_type: e.target.value as any})}
                        className="w-full p-2 rounded bg-secondary/50 border"
                      >
                        <option value="every_7_days">Cada 7 días</option>
                        <option value="every_15_days">Cada 15 días</option>
                        <option value="monthly">Cada mes</option>
                        <option value="every_2_months">Cada 2 meses</option>
                        <option value="every_4_months">Cada 4 meses</option>
                        <option value="every_6_months">Cada 6 meses</option>
                        <option value="every_year">Cada año</option>
                      </select>
                   </div>
                   <div className="space-y-2">
                     <Label>Día del mes (1-31)</Label>
                     <Input type="number" min="1" max="31" value={formData.recurring_day} onChange={e => setFormData({...formData, recurring_day: parseInt(e.target.value)})} required className="bg-secondary/50"/>
                   </div>
                 </>
               ) : (
                 <>
                   <div className="space-y-2">
                     <Label>Fecha principal</Label>
                     <Input type="date" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} required className="bg-secondary/50"/>
                   </div>
                   
                   <div className="space-y-2">
                     <Label>Fechas adicionales (opcional)</Label>
                     <div className="space-y-2">
                       {formData.recurring_dates.map((d, i) => (
                         <div key={i} className="flex gap-2">
                           <Input type="date" value={d} onChange={e => {
                             const newDates = [...formData.recurring_dates];
                             newDates[i] = e.target.value;
                             setFormData({...formData, recurring_dates: newDates});
                           }} className="bg-secondary/50"/>
                           <Button type="button" size="icon" variant="ghost" onClick={() => {
                             const newDates = formData.recurring_dates.filter((_, idx) => idx !== i);
                             setFormData({...formData, recurring_dates: newDates});
                           }}><Trash2 size={16}/></Button>
                         </div>
                       ))}
                       <Button type="button" variant="outline" size="sm" onClick={() => {
                         setFormData({...formData, recurring_dates: [...formData.recurring_dates, '']});
                       }}>+ Añadir fecha</Button>
                     </div>
                   </div>
                 </>
               )}

               <div className="space-y-2">
                 <Label>Color del evento</Label>
                 <div className="flex gap-2">
                   <button
                     type="button"
                     className={`w-10 h-10 rounded-full bg-green-600 border-2 ${formData.color === 'green' ? 'border-white' : 'border-transparent'}`}
                     onClick={() => setFormData({...formData, color: 'green'})}
                   />
                   <button
                     type="button"
                     className={`w-10 h-10 rounded-full bg-red-600 border-2 ${formData.color === 'red' ? 'border-white' : 'border-transparent'}`}
                     onClick={() => setFormData({...formData, color: 'red'})}
                   />
                   <button
                     type="button"
                     className={`w-10 h-10 rounded-full bg-yellow-500 border-2 ${formData.color === 'yellow' ? 'border-white' : 'border-transparent'}`}
                     onClick={() => setFormData({...formData, color: 'yellow'})}
                   />
                   <button
                     type="button"
                     className={`w-10 h-10 rounded-full bg-secondary border-2 ${!formData.color ? 'border-white' : 'border-transparent'}`}
                     onClick={() => setFormData({...formData, color: undefined})}
                   >
                     <span className="text-xs">Por defecto</span>
                   </button>
                 </div>
               </div>

               <div className="flex items-center space-x-2 mt-2">
                 <Checkbox id="imp" checked={formData.is_important} onCheckedChange={(c) => setFormData({...formData, is_important: !!c})} />
                 <Label htmlFor="imp" className="text-destructive font-bold cursor-pointer">Marcar como Importante</Label>
               </div>
               
               <div className="space-y-2">
                   <Label>Notas</Label>
                   <Textarea value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} className="bg-secondary/50" />
               </div>
               
               <Button type="submit" className="w-full mt-4">Guardar Evento</Button>
            </form>
          </DialogContent>
      </Dialog>

      {/* Modal Lista Eventos */}
      <Dialog open={isEventListOpen} onOpenChange={setIsEventListOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Eventos del día</DialogTitle></DialogHeader>
          <div className="space-y-3 mt-2">
             {selectedDayEvents.map(ev => (
               <div key={ev.id} className="flex justify-between items-center p-3 border border-[rgba(255,255,255,0.1)] rounded-lg bg-secondary/30">
                   <div className="flex items-center gap-2">
                     {ev.color === 'green' && <div className="w-3 h-3 rounded-full bg-green-600" />}
                     {ev.color === 'red' && <div className="w-3 h-3 rounded-full bg-red-600" />}
                     {ev.color === 'yellow' && <div className="w-3 h-3 rounded-full bg-yellow-500" />}
                     <div>
                       <p className="font-bold">{ev.title}</p>
                       <p className="text-xs text-muted-foreground flex gap-2">
                           <span>{ev.id}</span>
                           {ev.is_recurring && <span className="text-blue-400">(Recurrente)</span>}
                           {ev.recurring_dates && ev.recurring_dates.length > 0 && <span className="text-purple-400">(Multi-fecha)</span>}
                       </p>
                     </div>
                   </div>
                  <div className="flex gap-2">
                     <Button size="icon" variant="ghost" onClick={() => { 
                        setFormData({ 
                            title: ev.title, 
                            date: ev.date, 
                            is_important: ev.is_important, 
                            is_recurring: ev.is_recurring, 
                            recurring_day: ev.recurring_day || 1,
                            recurring_type: ev.recurring_type || 'monthly',
                            recurring_dates: ev.recurring_dates || [],
                            color: ev.color,
                            notes: ev.notes || '' 
                        });
                        setEditingEventId(ev.id); setIsEventListOpen(false); setIsDialogOpen(true); 
                    }}><Pencil size={16}/></Button>
                    <Button size="icon" variant="ghost" className="text-destructive hover:bg-destructive/20" onClick={() => { setDeletingEventId(ev.id); handleDelete(); }}><Trash2 size={16}/></Button>
                  </div>
               </div>
             ))}
             <Button variant="outline" className="w-full mt-4" onClick={() => { setIsEventListOpen(false); resetForm(); setIsDialogOpen(true); }}>+ Añadir otro evento</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Calendario;
