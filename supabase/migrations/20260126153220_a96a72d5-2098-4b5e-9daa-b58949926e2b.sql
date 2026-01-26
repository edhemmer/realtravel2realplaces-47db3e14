-- Add additional sub-categories for better expense tracking and reporting
-- Adding: alcohol, beverages, rental_car for more granular reporting

ALTER TYPE expense_sub_category ADD VALUE IF NOT EXISTS 'alcohol';
ALTER TYPE expense_sub_category ADD VALUE IF NOT EXISTS 'beverages';
ALTER TYPE expense_sub_category ADD VALUE IF NOT EXISTS 'rental_car';