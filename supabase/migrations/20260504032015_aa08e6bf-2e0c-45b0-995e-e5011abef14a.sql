INSERT INTO public.headadmin (auth_user_id, name, email, is_active)
VALUES ('9112aca7-fd96-4f6f-938a-9f3340652a99', 'Admin', 'jakirstock62@gmail.com', true)
ON CONFLICT DO NOTHING;