-- Seed Data: Default Chat Scripts
-- These are example scripts that will be available to all agencies
-- Run this manually for each agency, replacing the agency_id

-- Note: Replace 'YOUR_AGENCY_ID_HERE' with actual agency UUID
-- To get your agency ID: SELECT id FROM agencies LIMIT 1;

DO $$
DECLARE
  v_agency_id UUID;
  v_user_id UUID;
BEGIN
  -- Get first agency (for development/demo purposes)
  SELECT id INTO v_agency_id FROM agencies LIMIT 1;
  SELECT id INTO v_user_id FROM profiles WHERE agency_id = v_agency_id LIMIT 1;
  
  -- Exit if no agency found
  IF v_agency_id IS NULL THEN
    RAISE NOTICE 'No agency found. Create an agency first.';
    RETURN;
  END IF;

  -- Insert default scripts
  INSERT INTO chat_scripts (agency_id, title, content, category, tags, created_by, updated_by) VALUES
  
  -- OPENERS
  (v_agency_id, 'Morning Motivation', 'Good morning babe 💕 Hope you slept well! Got something special planned for you today...', 'opener', ARRAY['morning', 'casual'], v_user_id, v_user_id),
  (v_agency_id, 'Late Night Check-in', 'Hey you 😏 Still up? I couldn''t sleep... kept thinking about you', 'opener', ARRAY['night', 'flirty'], v_user_id, v_user_id),
  (v_agency_id, 'Weekend Vibes', 'Happy Friday! 🎉 Any fun plans for the weekend? I might need some ideas...', 'opener', ARRAY['weekend', 'casual'], v_user_id, v_user_id),
  (v_agency_id, 'Just Thinking', 'Was just scrolling and saw your name... had to say hi 👋 How''s your day going?', 'opener', ARRAY['casual', 'friendly'], v_user_id, v_user_id),
  
  -- CLOSERS
  (v_agency_id, 'PPV Tease', 'I just posted something REALLY naughty... but it''s locked 🔒 Wanna see what I did? 😈', 'closer', ARRAY['ppv', 'spicy'], v_user_id, v_user_id),
  (v_agency_id, 'Custom Request', 'You know... I love making custom content for my favorite fans 😘 Any special requests?', 'closer', ARRAY['custom', 'personal'], v_user_id, v_user_id),
  (v_agency_id, 'Voice Message Offer', 'Would you like me to send you a voice message? 🎤 I love hearing back from you too!', 'closer', ARRAY['voice', 'personal'], v_user_id, v_user_id),
  (v_agency_id, 'Exclusive Offer', 'I have something exclusive I only show to my VIPs... interested? 👑', 'closer', ARRAY['vip', 'exclusive'], v_user_id, v_user_id),
  
  -- UPSELLS
  (v_agency_id, 'Bundle Deal', 'Special deal just for you! 💎 Get 3 of my hottest sets for the price of 2. Want the link?', 'upsell', ARRAY['bundle', 'discount'], v_user_id, v_user_id),
  (v_agency_id, 'New Content Alert', 'Just dropped some new content in my feed 🔥 You should check it out before it''s gone!', 'upsell', ARRAY['new', 'urgent'], v_user_id, v_user_id),
  (v_agency_id, 'VIP Subscription', 'Hey! Have you thought about joining my VIP tier? You get EVERYTHING unlocked plus daily exclusives 😍', 'upsell', ARRAY['vip', 'subscription'], v_user_id, v_user_id),
  (v_agency_id, 'Limited Time', '⏰ 24-hour special! All my premium content 50% off. This won''t last long...', 'upsell', ARRAY['sale', 'urgent'], v_user_id, v_user_id),
  
  -- OBJECTIONS
  (v_agency_id, 'Price Concern', 'I totally get it! 💕 But think of it this way - it''s less than your coffee habit and WAY more fun 😉', 'objection', ARRAY['price', 'value'], v_user_id, v_user_id),
  (v_agency_id, 'Not Now', 'No worries at all! It''ll be here when you''re ready 😊 In the meantime, I''ll keep sending you sneak peeks!', 'objection', ARRAY['timing', 'soft'], v_user_id, v_user_id),
  (v_agency_id, 'Quality Assurance', 'I promise you won''t be disappointed 🔥 Check my reviews! My fans love what I create for them', 'objection', ARRAY['quality', 'social-proof'], v_user_id, v_user_id),
  (v_agency_id, 'Already Subscribed', 'You''re already amazing for subscribing! 💕 But this is extra special content I don''t post anywhere else...', 'objection', ARRAY['value', 'exclusive'], v_user_id, v_user_id),
  
  -- PPV SPECIFIC
  (v_agency_id, 'Shower Scene', '🚿 Just got out of the shower... The mirror is all steamed up and I''m feeling VERY exposed 💦 Wanna see?', 'ppv', ARRAY['shower', 'nude'], v_user_id, v_user_id),
  (v_agency_id, 'Lingerie Try-On', 'Just got some new lingerie... need help deciding which one looks best 😏 Mind if I model them for you? 💋', 'ppv', ARRAY['lingerie', 'tease'], v_user_id, v_user_id),
  (v_agency_id, 'Bedroom Video', 'Recorded something in my bedroom last night... let''s just say I was thinking of you 🔥 Want it?', 'ppv', ARRAY['video', 'explicit'], v_user_id, v_user_id),
  (v_agency_id, 'Full Length Special', '🎬 This is a FULL 15-minute video... my most explicit yet. But fair warning - it''s HOT 🌶️', 'ppv', ARRAY['video', 'explicit', 'long'], v_user_id, v_user_id);

  RAISE NOTICE 'Successfully seeded % chat scripts for agency %', 20, v_agency_id;
  
END $$;
