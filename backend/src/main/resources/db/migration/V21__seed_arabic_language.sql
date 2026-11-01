INSERT INTO languages (code, name, native_name, is_active)
SELECT 'ar', 'Arabic', 'العربية', TRUE
WHERE NOT EXISTS (SELECT 1 FROM languages WHERE code = 'ar');
