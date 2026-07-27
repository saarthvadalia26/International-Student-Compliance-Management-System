-- Migration: 015_iso_countries
-- Description: Registers ISO 3166-1 country reference category and seeds initial reference data.
-- Dependencies: 002_reference_data.sql
-- Transaction: Yes

BEGIN;

-- 1. Update reference_data category constraint to include 'country'
ALTER TABLE public.reference_data DROP CONSTRAINT IF EXISTS check_valid_category;

ALTER TABLE public.reference_data ADD CONSTRAINT check_valid_category CHECK (category IN (
    'sponsorship_category',
    'visa_type',
    'gender',
    'marital_status',
    'blood_group',
    'school',
    'course',
    'fee_type',
    'document_status',
    'notification_channel',
    'notification_status',
    'country'
));

-- 2. Seed ISO 3166-1 Countries into reference_data
INSERT INTO public.reference_data (category, code, display_name, description, display_order, is_active)
VALUES
    ('country', 'IND', 'India', 'ISO-3166-1: IN / 356 | Demonym: Indian | Region: Asia', 1, true),
    ('country', 'USA', 'United States', 'ISO-3166-1: US / 840 | Demonym: American | Region: Americas', 2, true),
    ('country', 'GBR', 'United Kingdom', 'ISO-3166-1: GB / 826 | Demonym: British | Region: Europe', 3, true),
    ('country', 'NPL', 'Nepal', 'ISO-3166-1: NP / 524 | Demonym: Nepalese | Region: Asia', 4, true),
    ('country', 'BGD', 'Bangladesh', 'ISO-3166-1: BD / 050 | Demonym: Bangladeshi | Region: Asia', 5, true),
    ('country', 'BTN', 'Bhutan', 'ISO-3166-1: BT / 064 | Demonym: Bhutanese | Region: Asia', 6, true),
    ('country', 'LKA', 'Sri Lanka', 'ISO-3166-1: LK / 144 | Demonym: Sri Lankan | Region: Asia', 7, true),
    ('country', 'AFG', 'Afghanistan', 'ISO-3166-1: AF / 004 | Demonym: Afghan | Region: Asia', 8, true),
    ('country', 'DEU', 'Germany', 'ISO-3166-1: DE / 276 | Demonym: German | Region: Europe', 9, true),
    ('country', 'FRA', 'France', 'ISO-3166-1: FR / 250 | Demonym: French | Region: Europe', 10, true),
    ('country', 'JPN', 'Japan', 'ISO-3166-1: JP / 392 | Demonym: Japanese | Region: Asia', 11, true),
    ('country', 'CHN', 'China', 'ISO-3166-1: CN / 156 | Demonym: Chinese | Region: Asia', 12, true),
    ('country', 'AUS', 'Australia', 'ISO-3166-1: AU / 036 | Demonym: Australian | Region: Oceania', 13, true),
    ('country', 'CAN', 'Canada', 'ISO-3166-1: CA / 124 | Demonym: Canadian | Region: Americas', 14, true),
    ('country', 'KEN', 'Kenya', 'ISO-3166-1: KE / 404 | Demonym: Kenyan | Region: Africa', 15, true),
    ('country', 'NGA', 'Nigeria', 'ISO-3166-1: NG / 566 | Demonym: Nigerian | Region: Africa', 16, true),
    ('country', 'ZAF', 'South Africa', 'ISO-3166-1: ZA / 710 | Demonym: South African | Region: Africa', 17, true),
    ('country', 'ARE', 'United Arab Emirates', 'ISO-3166-1: AE / 784 | Demonym: Emirati | Region: Asia', 18, true),
    ('country', 'SAU', 'Saudi Arabia', 'ISO-3166-1: SA / 682 | Demonym: Saudi | Region: Asia', 19, true),
    ('country', 'RUS', 'Russia', 'ISO-3166-1: RU / 643 | Demonym: Russian | Region: Europe', 20, true)
ON CONFLICT (code) DO UPDATE 
SET display_name = EXCLUDED.display_name,
    description = EXCLUDED.description,
    is_active = true,
    updated_at = now();

COMMIT;
