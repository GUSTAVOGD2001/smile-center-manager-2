
-- Migration: 20251104200313
-- Create events table for calendar
CREATE TABLE IF NOT EXISTS public.events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  date DATE NOT NULL,
  is_important BOOLEAN NOT NULL DEFAULT false,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

-- Create policies for events (admin only access)
CREATE POLICY "Admin users can view all events" 
ON public.events 
FOR SELECT 
USING (true);

CREATE POLICY "Admin users can create events" 
ON public.events 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Admin users can update events" 
ON public.events 
FOR UPDATE 
USING (true);

CREATE POLICY "Admin users can delete events" 
ON public.events 
FOR DELETE 
USING (true);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_events_updated_at
BEFORE UPDATE ON public.events
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Migration: 20251104220030
-- Add recurring event fields to events table
ALTER TABLE public.events
ADD COLUMN is_recurring boolean NOT NULL DEFAULT false,
ADD COLUMN recurring_day integer;

-- Add check constraint for recurring_day to be between 1 and 31
ALTER TABLE public.events
ADD CONSTRAINT recurring_day_check CHECK (recurring_day IS NULL OR (recurring_day >= 1 AND recurring_day <= 31));
