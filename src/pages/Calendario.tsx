import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Plus, AlertCircle, Pencil, Trash2, ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface Event {
  id: string;
  title: string;
  date: string;
  is_important: boolean;
  is_recurring: boolean;
  recurring_day: number | null;
  notes: string | null;
}

const Calendario = () => {
  const [events, setEvents] = useState<Event[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEventListOpen, setIsEventListOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
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
    notes: '',
  });

  const currentMonth = new Date().getMonth();
  const today = new Date();

  const monthNames = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .order('date', { ascending: true });

    if (error) {
      toast.error('Error al cargar eventos');
      console.error(error);
    } else {
      setEvents(data || []);
    }
  };

  const getDaysInMonth = (month: number, year: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (month: number, year: number) => {
    return new Date(year, month, 1).getDay();
  };

  const upcomingEvents = useMemo(() => {
    const todayStr = format(today, 'yyyy-MM-dd');
    return events
      .filter(event => event.date >= todayStr)
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(0, 10);
  }, [events]);

  const getEventsForDay = (day: number, month: number) => {
    const dateStr = `${selectedYear}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return events.filter(event => event.date === dateStr);
  };

  const hasEvent = (day: number, month: number) => {
    const dayEvents = getEventsForDay(day, month);
    return dayEvents.length > 0 ? dayEvents[0] : null;
  };

  const handleDayClick = (day: number, month: number) => {
    const date = new Date(selectedYear, month, day);
    setSelectedDate(date);
    const dateStr = `${selectedYear}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const dayEvents = getEventsForDay(day, month);
    
    if (dayEvents.length > 0) {
      setSelectedDayEvents(dayEvents);
      setIsEventListOpen(true);
    } else {
      setFormData({ title: '', date: dateStr, is_important: false, is_recurring: false, recurring_day: 1, notes: '' });
      setEditingEventId(null);
      setIsDialogOpen(true);
    }
  };

  const handleEditEvent = (event: Event) => {
    setFormData({
      title: event.title,
      date: event.date,
      is_important: event.is_important,
      is_recurring: event.is_recurring,
      recurring_day: event.recurring_day || 1,
      notes: event.notes || '',
    });
    setEditingEventId(event.id);
    setIsEventListOpen(false);
    setIsDialogOpen(true);
  };

  const handleDeleteEvent = async () => {
    if (!deletingEventId) return;

    const { error } = await supabase
      .from('events')
      .delete()
      .eq('id', deletingEventId);

    if (error) {
      toast.error('Error al eliminar evento');
      console.error(error);
    } else {
      toast.success('Evento eliminado exitosamente');
      setDeletingEventId(null);
      fetchEvents();
      setIsEventListOpen(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title) {
      toast.error('Por favor completa el título');
      return;
    }

    if (formData.is_recurring && !formData.recurring_day) {
      toast.error('Por favor selecciona el día del mes');
      return;
    }

    if (!formData.is_recurring && !formData.date) {
      toast.error('Por favor selecciona una fecha');
      return;
    }

    if (editingEventId) {
      const { error } = await supabase
        .from('events')
        .update({
          title: formData.title,
          date: formData.date,
          is_important: formData.is_important,
          is_recurring: formData.is_recurring,
          recurring_day: formData.is_recurring ? formData.recurring_day : null,
          notes: formData.notes || null,
        })
        .eq('id', editingEventId);

      if (error) {
        toast.error('Error al actualizar evento');
        console.error(error);
      } else {
        toast.success('Evento actualizado exitosamente');
        setIsDialogOpen(false);
        setFormData({ title: '', date: '', is_important: false, is_recurring: false, recurring_day: 1, notes: '' });
        setEditingEventId(null);
        fetchEvents();
      }
    } else {
      // Si es recurrente, crear eventos para todos los meses del año
      if (formData.is_recurring) {
        const eventsToInsert = [];
        for (let month = 0; month < 12; month++) {
          const daysInMonth = getDaysInMonth(month, selectedYear);
          // Solo crear el evento si el día existe en ese mes
          if (formData.recurring_day <= daysInMonth) {
            const dateStr = `${selectedYear}-${String(month + 1).padStart(2, '0')}-${String(formData.recurring_day).padStart(2, '0')}`;
            eventsToInsert.push({
              title: formData.title,
              date: dateStr,
              is_important: formData.is_important,
              is_recurring: true,
              recurring_day: formData.recurring_day,
              notes: formData.notes || null,
            });
          }
        }

        const { error } = await supabase
          .from('events')
          .insert(eventsToInsert);

        if (error) {
          toast.error('Error al crear eventos recurrentes');
          console.error(error);
        } else {
          toast.success(`${eventsToInsert.length} eventos recurrentes creados exitosamente`);
          setIsDialogOpen(false);
          setFormData({ title: '', date: '', is_important: false, is_recurring: false, recurring_day: 1, notes: '' });
          fetchEvents();
        }
      } else {
        const { error } = await supabase
          .from('events')
          .insert([{
            title: formData.title,
            date: formData.date,
            is_important: formData.is_important,
            is_recurring: false,
            recurring_day: null,
            notes: formData.notes || null,
          }]);

        if (error) {
          toast.error('Error al crear evento');
          console.error(error);
        } else {
          toast.success('Evento creado exitosamente');
          setIsDialogOpen(false);
          setFormData({ title: '', date: '', is_important: false, is_recurring: false, recurring_day: 1, notes: '' });
          fetchEvents();
        }
      }
    }
  };

  const renderMonth = (monthIndex: number) => {
    const daysInMonth = getDaysInMonth(monthIndex, selectedYear);
    const firstDay = getFirstDayOfMonth(monthIndex, selectedYear);
    const days = [];
    const isPastMonth = selectedYear < today.getFullYear() || 
                        (selectedYear === today.getFullYear() && monthIndex < currentMonth);

    // Add empty cells for days before the first day of the month
    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} />);
    }

    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const event = hasEvent(day, monthIndex);
      const isPastDay = isPastMonth || 
                        (selectedYear === today.getFullYear() && monthIndex === currentMonth && day < today.getDate());
      
      days.push(
        <button
          key={day}
          onClick={() => handleDayClick(day, monthIndex)}
          className={`
            w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium
            transition-all duration-200 hover:scale-110
            ${isPastDay 
              ? 'bg-muted/30 text-muted-foreground/50' 
              : event 
                ? event.is_recurring
                  ? 'bg-blue-500 text-white hover:bg-blue-600'
                  : event.is_important 
                    ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90' 
                    : 'bg-primary text-primary-foreground hover:bg-primary/90'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }
          `}
        >
          {day}
        </button>
      );
    }

    return days;
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-4">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              Calendario
            </h1>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={() => setSelectedYear(selectedYear - 1)}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-2xl font-semibold min-w-[80px] text-center">{selectedYear}</span>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setSelectedYear(selectedYear + 1)}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <p className="text-muted-foreground mt-2">Gestiona eventos y fechas importantes</p>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus size={18} />
              Añadir Evento
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingEventId ? 'Editar Evento' : 'Nuevo Evento'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="title">Título *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Título del evento"
                  required
                />
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="recurring"
                  checked={formData.is_recurring}
                  onCheckedChange={(checked) => 
                    setFormData({ ...formData, is_recurring: checked as boolean })
                  }
                />
                <Label htmlFor="recurring" className="flex items-center gap-2 cursor-pointer">
                  Evento recurrente (se repite cada mes)
                </Label>
              </div>

              {formData.is_recurring ? (
                <div>
                  <Label htmlFor="recurring_day">Día del mes *</Label>
                  <Input
                    id="recurring_day"
                    type="number"
                    min="1"
                    max="31"
                    value={formData.recurring_day}
                    onChange={(e) => setFormData({ ...formData, recurring_day: parseInt(e.target.value) })}
                    placeholder="Día del mes (1-31)"
                    required
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    El evento se creará en todos los meses del año {selectedYear} en el día {formData.recurring_day}
                  </p>
                </div>
              ) : (
                <div>
                  <Label htmlFor="date">Fecha *</Label>
                  <Input
                    id="date"
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    required
                  />
                </div>
              )}

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="important"
                  checked={formData.is_important}
                  onCheckedChange={(checked) => 
                    setFormData({ ...formData, is_important: checked as boolean })
                  }
                />
                <Label htmlFor="important" className="flex items-center gap-2 cursor-pointer">
                  <AlertCircle size={16} className="text-destructive" />
                  Marcar como importante
                </Label>
              </div>

              <div>
                <Label htmlFor="notes">Notas</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Notas adicionales..."
                  rows={4}
                />
              </div>

              <div className="flex gap-2 justify-end">
                <Button type="button" variant="outline" onClick={() => {
                  setIsDialogOpen(false);
                  setEditingEventId(null);
                  setFormData({ title: '', date: '', is_important: false, is_recurring: false, recurring_day: 1, notes: '' });
                }}>
                  Cancelar
                </Button>
                <Button type="submit">
                  {editingEventId ? 'Actualizar Evento' : 'Guardar Evento'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* Event List Dialog */}
        <Dialog open={isEventListOpen} onOpenChange={setIsEventListOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Eventos del día</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              {selectedDayEvents.map((event) => (
                <Card key={event.id} className="glass-card border-[rgba(255,255,255,0.1)]">
                  <CardContent className="pt-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-semibold">{event.title}</h3>
                          {event.is_important && (
                            <AlertCircle size={16} className="text-destructive" />
                          )}
                        </div>
                        {event.notes && (
                          <p className="text-sm text-muted-foreground">{event.notes}</p>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => handleEditEvent(event)}
                        >
                          <Pencil size={16} />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => setDeletingEventId(event.id)}
                        >
                          <Trash2 size={16} />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
              <Button
                className="w-full gap-2"
                onClick={() => {
                  setIsEventListOpen(false);
                  setFormData({ 
                    title: '', 
                    date: selectedDayEvents[0]?.date || '', 
                    is_important: false,
                    is_recurring: false,
                    recurring_day: 1,
                    notes: '' 
                  });
                  setEditingEventId(null);
                  setIsDialogOpen(true);
                }}
              >
                <Plus size={18} />
                Añadir otro evento
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={!!deletingEventId} onOpenChange={() => setDeletingEventId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>¿Eliminar evento?</AlertDialogTitle>
              <AlertDialogDescription>
                Esta acción no se puede deshacer. El evento será eliminado permanentemente.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={handleDeleteEvent}>
                Eliminar
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Legend */}
        <Card className="glass-card border-[rgba(255,255,255,0.1)]">
          <CardHeader>
            <CardTitle className="text-lg">Leyenda</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-muted" />
              <span className="text-sm">Sin evento</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-primary" />
              <span className="text-sm">Evento normal</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-blue-500" />
              <span className="text-sm">Evento recurrente</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-destructive" />
              <span className="text-sm">Evento importante</span>
            </div>
          </CardContent>
        </Card>

        {/* Upcoming Events */}
        <Card className="glass-card border-[rgba(255,255,255,0.1)] lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <CalendarIcon className="h-5 w-5" />
              Próximos Eventos
            </CardTitle>
          </CardHeader>
          <CardContent>
            {upcomingEvents.length === 0 ? (
              <p className="text-muted-foreground text-sm">No hay eventos próximos</p>
            ) : (
              <div className="space-y-3">
                {upcomingEvents.map((event) => (
                  <div
                    key={event.id}
                    className="flex items-start justify-between gap-3 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-semibold">{event.title}</h4>
                        {event.is_important && (
                          <AlertCircle size={14} className="text-destructive" />
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(event.date), "d 'de' MMMM 'de' yyyy", { locale: es })}
                      </p>
                      {event.notes && (
                        <p className="text-xs text-muted-foreground mt-1">{event.notes}</p>
                      )}
                    </div>
                    <div className="flex gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8"
                        onClick={() => handleEditEvent(event)}
                      >
                        <Pencil size={14} />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8"
                        onClick={() => setDeletingEventId(event.id)}
                      >
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Year Calendar Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {monthNames.map((monthName, monthIndex) => (
          <Card key={monthIndex} className="glass-card border-[rgba(255,255,255,0.1)]">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg text-center">{monthName}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-7 gap-1 text-xs text-muted-foreground mb-2 text-center">
                <div>D</div>
                <div>L</div>
                <div>M</div>
                <div>M</div>
                <div>J</div>
                <div>V</div>
                <div>S</div>
              </div>
              <div className="grid grid-cols-7 gap-1">
                {renderMonth(monthIndex)}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default Calendario;