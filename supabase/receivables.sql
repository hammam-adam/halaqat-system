-- السماح بحفظ المستحقات في جدول docs (طُبّق على قاعدة البيانات)
alter table public.docs drop constraint docs_collection_check;
alter table public.docs add constraint docs_collection_check check (collection = any (array['halaqat','students','teachers','transactions','settings','receivables']));
