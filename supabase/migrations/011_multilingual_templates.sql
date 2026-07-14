-- Migration: 011_multilingual_templates
-- Description: Adds preferred_language metadata column and inserts extensible multilingual reminder templates.
-- Transaction: Yes. Runs inside a transaction.

BEGIN;

-- 1. Add preferred_language to student personal records
ALTER TABLE public.student_personal ADD COLUMN IF NOT EXISTS preferred_language VARCHAR(10) NOT NULL DEFAULT 'en';

COMMENT ON COLUMN public.student_personal.preferred_language IS 'Preferred language code for communication alerts (e.g. en, hi, es).';


-- 2. Insert Extensible Multilingual Templates (code = 'EXPIRY_ALERT', version = 1)
INSERT INTO public.notification_templates (code, language_code, version, is_active, title, subject_template, body_template) VALUES
-- Hindi (hi)
('EXPIRY_ALERT', 'hi', 1, true, 'दस्तावेज़ समाप्ति चेतावनी', 'ISCMS अलर्ट: {{document_type}} दस्तावेज़ समाप्ति चेतावनी', 'प्रिय {{student_name}},\n\nआपका {{document_type}} दस्तावेज {{expiry_date}} को समाप्त हो रहा है। नियमों का अनुपालन बनाए रखने के लिए कृपया तुरंत पोर्टल में नया दस्तावेज अपलोड करें।\n\nसादर,\nअंतरराष्ट्रीय अनुपालन कार्यालय (NFSU)'),

-- French (fr)
('EXPIRY_ALERT', 'fr', 1, true, 'Alerte Expiration', 'Alerte ISCMS : Expiration du document {{document_type}}', 'Cher {{student_name}},\n\nVotre {{document_type}} expire le {{expiry_date}}. Veuillez téléverser une copie renouvelée sur le portail ISCMS immédiatement pour rester en conformité.\n\nCordialement,\nBureau de la conformité internationale (NFSU)'),

-- Arabic (ar)
('EXPIRY_ALERT', 'ar', 1, true, 'تنبيه انتهاء صلاحية المستند', 'تنبيه ISCMS: تحذير انتهاء صلاحية {{document_type}}', 'عزيزي {{student_name}}،\n\nستنتهي صلاحية {{document_type}} الخاص بك في {{expiry_date}}. يرجى تحميل النسخة المجددة على بوابة ISCMS فورًا للحفاظ على وضعك القانوني.\n\nمع أطيب التحيات،\nمكتب الامتثال الدولي (NFSU)'),

-- Chinese (zh)
('EXPIRY_ALERT', 'zh', 1, true, '文件过期提醒', 'ISCMS 提醒：您的 {{document_type}} 即将过期', '尊敬的 {{student_name}}，\n\n您的 {{document_type}} 将于 {{expiry_date}} 过期。请立即登录 ISCMS 门户网站上传更新后的文件，以维持合规身份。\n\n顺致商祺，\n国际事务合规办公室 (NFSU)'),

-- Russian (ru)
('EXPIRY_ALERT', 'ru', 1, true, 'Срок действия документа истекает', 'Предупреждение ISCMS: Истекает срок действия {{document_type}}', 'Уважаемый {{student_name}},\n\nСрок действия вашего документа {{document_type}} истекает {{expiry_date}}. Пожалуйста, немедленно загрузите обновленную версию на портал ISCMS для сохранения статуса соответствия.\n\nС уважением,\nОтдел международной комплаенс-службы (NFSU)'),

-- Portuguese (pt)
('EXPIRY_ALERT', 'pt', 1, true, 'Alerta de Expiração de Documento', 'Alerta ISCMS: Expiração do {{document_type}}', 'Prezado {{student_name}},\n\nO seu {{document_type}} expira em {{expiry_date}}. Por favor, envie uma cópia atualizada através do portal ISCMS imediatamente para manter a sua conformidade.\n\nAtenciosamente,\nEscritório de Conformidade Internacional (NFSU)'),

-- Japanese (ja)
('EXPIRY_ALERT', 'ja', 1, true, '書類有効期限警告', 'ISCMSアラート：{{document_type}}の有効期限警告', '{{student_name}} 様、\n\nお客様の{{document_type}}の有効期限は {{expiry_date}} に終了いたします。有効な状態を維持するため、直ちにISCMSポータルから新しい書類をアップロードしてください。\n\n敬具、\n国際コンプライアンス管理室 (NFSU)'),

-- Korean (ko)
('EXPIRY_ALERT', 'ko', 1, true, '서류 만료 경고', 'ISCMS 알림: {{document_type}} 만료 예정 경고', '{{student_name}} 귀하,\n\n귀하의 {{document_type}} 서류가 {{expiry_date}}에 만료될 예정입니다. 합법적 체류 상태 유지를 위해 신속히 ISCMS 포털에 갱신 서류를 업로드해 주시기 바랍니다.\n\n NFSU 국제협력처 배상'),

-- Nepali (ne)
('EXPIRY_ALERT', 'ne', 1, true, 'कागजात समाप्ति चेतावनी', 'ISCMS चेतावनी: {{document_type}} समाप्त हुने सूचना', 'प्रिय {{student_name}},\n\nतपाईंको {{document_type}} कागजात {{expiry_date}} मा समाप्त हुँदैछ। अनुपालन कायम राख्न कृपया तुरुन्तै नयाँ कागजात ISCMS पोर्टलमा अपलोड गर्नुहोस्।\n\nशुभकामना सहित,\nअन्तर्राष्ट्रिय अनुपालन शाखा (NFSU)'),

-- Bengali (bn)
('EXPIRY_ALERT', 'bn', 1, true, 'নথির মেয়াদ উত্তীর্ণের সতর্কতা', 'ISCMS সতর্কতা: আপনার {{document_type}} এর মেয়াদ শেষ হতে চলেছে', 'প্রিয় {{student_name}},\n\nআপনার {{document_type}} এর মেয়াদ {{expiry_date}} তারিখে শেষ হতে চলেছে। অনুগত থাকার জন্য অনুগ্রহ করে অবিলম্বে ISCMS পোর্টালে আপনার নবায়িত নথি আপলোড করুন।\n\nবিনীত,\nআন্তর্জাতিক অনুপালন বিভাগ (NFSU)')
ON CONFLICT (code, language_code, version) DO NOTHING;

COMMIT;
