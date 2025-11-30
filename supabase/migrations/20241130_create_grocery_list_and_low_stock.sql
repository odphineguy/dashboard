-- Create grocery_list_items table for personal grocery lists
CREATE TABLE public.grocery_list_items (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id text NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    name text NOT NULL,
    quantity numeric DEFAULT 1,
    unit text,
    category text,
    is_checked boolean DEFAULT false,
    notes text,
    source text DEFAULT 'manual' CHECK (source IN ('manual', 'low_stock')),
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- Add low stock columns to pantry_items
ALTER TABLE public.pantry_items 
ADD COLUMN IF NOT EXISTS low_stock_threshold integer DEFAULT 1,
ADD COLUMN IF NOT EXISTS is_low_stock_marked boolean DEFAULT false;

-- Enable RLS on grocery_list_items
ALTER TABLE public.grocery_list_items ENABLE ROW LEVEL SECURITY;

-- RLS policies for grocery_list_items
CREATE POLICY "Users can view their own grocery list items"
ON public.grocery_list_items FOR SELECT
TO authenticated
USING (user_id = (SELECT auth.jwt() ->> 'sub'));

CREATE POLICY "Users can insert their own grocery list items"
ON public.grocery_list_items FOR INSERT
TO authenticated
WITH CHECK (user_id = (SELECT auth.jwt() ->> 'sub'));

CREATE POLICY "Users can update their own grocery list items"
ON public.grocery_list_items FOR UPDATE
TO authenticated
USING (user_id = (SELECT auth.jwt() ->> 'sub'))
WITH CHECK (user_id = (SELECT auth.jwt() ->> 'sub'));

CREATE POLICY "Users can delete their own grocery list items"
ON public.grocery_list_items FOR DELETE
TO authenticated
USING (user_id = (SELECT auth.jwt() ->> 'sub'));

-- Create index for faster queries
CREATE INDEX idx_grocery_list_items_user_id ON public.grocery_list_items(user_id);
CREATE INDEX idx_grocery_list_items_is_checked ON public.grocery_list_items(is_checked);

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_grocery_list_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER grocery_list_items_updated_at
    BEFORE UPDATE ON public.grocery_list_items
    FOR EACH ROW
    EXECUTE FUNCTION update_grocery_list_updated_at();

