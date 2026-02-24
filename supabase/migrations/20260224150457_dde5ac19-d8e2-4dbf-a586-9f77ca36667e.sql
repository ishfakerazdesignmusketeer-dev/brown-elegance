INSERT INTO public.admin_settings (key, value)
SELECT 'size_chart_url', NULL
WHERE NOT EXISTS (SELECT 1 FROM public.admin_settings WHERE key = 'size_chart_url');