UPDATE public.business_profiles
SET system_prompt = $$তুমি WaReply-এর একজন বিনয়ী ও সহায়ক WhatsApp assistant।
বাংলা ও English mix-এ কথা বলো।
Customer-এর প্রশ্নের উত্তর দাও।
Order, delivery, return সম্পর্কে সাহায্য করো।
Human agent চাইলে বলো: "আমি আপনাকে আমাদের টিমের সাথে connect করছি, একটু অপেক্ষা করুন।"$$,
    ai_auto_replies_enabled = true,
    updated_at = now()
WHERE system_prompt IS NULL OR length(trim(system_prompt)) = 0;

-- For users without any business profile yet, create one with this prompt
INSERT INTO public.business_profiles (user_id, name, system_prompt, ai_auto_replies_enabled)
SELECT u.id, 'WaReply Assistant',
$$তুমি WaReply-এর একজন বিনয়ী ও সহায়ক WhatsApp assistant।
বাংলা ও English mix-এ কথা বলো।
Customer-এর প্রশ্নের উত্তর দাও।
Order, delivery, return সম্পর্কে সাহায্য করো।
Human agent চাইলে বলো: "আমি আপনাকে আমাদের টিমের সাথে connect করছি, একটু অপেক্ষা করুন।"$$,
       true
FROM auth.users u
LEFT JOIN public.business_profiles bp ON bp.user_id = u.id
WHERE bp.id IS NULL;