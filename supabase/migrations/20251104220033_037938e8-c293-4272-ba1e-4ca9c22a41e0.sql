-- Add recurring event fields to events table
ALTER TABLE public.events
ADD COLUMN is_recurring boolean NOT NULL DEFAULT false,
ADD COLUMN recurring_day integer;

-- Add check constraint for recurring_day to be between 1 and 31
ALTER TABLE public.events
ADD CONSTRAINT recurring_day_check CHECK (recurring_day IS NULL OR (recurring_day >= 1 AND recurring_day <= 31));