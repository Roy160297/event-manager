-- Lets a single checklist_key carry more than one distinctly-labeled photo
-- slot (e.g. the summary report's "תמונת קאונטר" and "תמונה של אורחים
-- נוספים", each tied to a specific field, separate from its general
-- end-of-checklist photo gallery). Existing rows get slot = null, which
-- keeps meaning "the general/unlabeled gallery" - no behavior change for
-- the 4 checklists that don't use slots.
alter table checklist_photos add column if not exists slot text;
