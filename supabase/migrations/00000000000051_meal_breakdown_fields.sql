-- Meal-type breakdown fields (matching iPlan's "התחייבות חתומה" panel),
-- alongside the existing kids_meal_count - previously these were only used
-- transiently during image import to compute estimated_guests/kids_meal_count
-- and then discarded (glat/vegetarian/vegan), or dumped into a menu_notes
-- remark (toddlers under 2). Now they're their own persisted, visible fields
-- on the event overview, same as kids_meal_count.
alter table events add column if not exists glat_meal_count text;
alter table events add column if not exists vegetarian_meal_count text;
alter table events add column if not exists vegan_meal_count text;
alter table events add column if not exists gluten_free_meal_count text;
alter table events add column if not exists toddlers_under_2_count text;
