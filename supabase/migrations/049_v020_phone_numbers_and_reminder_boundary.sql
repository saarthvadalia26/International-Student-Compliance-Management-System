-- Migration: 049_v020_phone_numbers_and_reminder_boundary.sql
-- Description: v0.2.0 Schema Enhancements:
--              1. Adds phone_code to countries master table with standard international dial codes.
--              2. Adds structured phone fields (country code and number) to student_contact.
--              3. Preserves existing numbers and provides safe backfill.
-- Dependencies: 004_student_details.sql, 045_countries_master_system.sql
-- Transaction: Yes

BEGIN;

-- 1. Add phone_code to countries master table
ALTER TABLE public.countries 
    ADD COLUMN IF NOT EXISTS phone_code VARCHAR(10) DEFAULT NULL;

CREATE INDEX IF NOT EXISTS idx_countries_phone_code ON public.countries (phone_code);

-- 2. Populate Standard International Dial Codes for Master Countries
UPDATE public.countries SET phone_code = '+93' WHERE iso_alpha3 = 'AFG';
UPDATE public.countries SET phone_code = '+355' WHERE iso_alpha3 = 'ALB';
UPDATE public.countries SET phone_code = '+213' WHERE iso_alpha3 = 'DZA';
UPDATE public.countries SET phone_code = '+376' WHERE iso_alpha3 = 'AND';
UPDATE public.countries SET phone_code = '+244' WHERE iso_alpha3 = 'AGO';
UPDATE public.countries SET phone_code = '+54' WHERE iso_alpha3 = 'ARG';
UPDATE public.countries SET phone_code = '+374' WHERE iso_alpha3 = 'ARM';
UPDATE public.countries SET phone_code = '+61' WHERE iso_alpha3 = 'AUS';
UPDATE public.countries SET phone_code = '+43' WHERE iso_alpha3 = 'AUT';
UPDATE public.countries SET phone_code = '+994' WHERE iso_alpha3 = 'AZE';
UPDATE public.countries SET phone_code = '+1-242' WHERE iso_alpha3 = 'BHS';
UPDATE public.countries SET phone_code = '+973' WHERE iso_alpha3 = 'BHR';
UPDATE public.countries SET phone_code = '+880' WHERE iso_alpha3 = 'BGD';
UPDATE public.countries SET phone_code = '+375' WHERE iso_alpha3 = 'BLR';
UPDATE public.countries SET phone_code = '+32' WHERE iso_alpha3 = 'BEL';
UPDATE public.countries SET phone_code = '+975' WHERE iso_alpha3 = 'BTN';
UPDATE public.countries SET phone_code = '+591' WHERE iso_alpha3 = 'BOL';
UPDATE public.countries SET phone_code = '+55' WHERE iso_alpha3 = 'BRA';
UPDATE public.countries SET phone_code = '+673' WHERE iso_alpha3 = 'BRN';
UPDATE public.countries SET phone_code = '+359' WHERE iso_alpha3 = 'BGR';
UPDATE public.countries SET phone_code = '+855' WHERE iso_alpha3 = 'KHM';
UPDATE public.countries SET phone_code = '+237' WHERE iso_alpha3 = 'CMR';
UPDATE public.countries SET phone_code = '+1' WHERE iso_alpha3 = 'CAN';
UPDATE public.countries SET phone_code = '+56' WHERE iso_alpha3 = 'CHL';
UPDATE public.countries SET phone_code = '+86' WHERE iso_alpha3 = 'CHN';
UPDATE public.countries SET phone_code = '+57' WHERE iso_alpha3 = 'COL';
UPDATE public.countries SET phone_code = '+506' WHERE iso_alpha3 = 'CRI';
UPDATE public.countries SET phone_code = '+385' WHERE iso_alpha3 = 'HRV';
UPDATE public.countries SET phone_code = '+53' WHERE iso_alpha3 = 'CUB';
UPDATE public.countries SET phone_code = '+357' WHERE iso_alpha3 = 'CYP';
UPDATE public.countries SET phone_code = '+420' WHERE iso_alpha3 = 'CZE';
UPDATE public.countries SET phone_code = '+45' WHERE iso_alpha3 = 'DNK';
UPDATE public.countries SET phone_code = '+593' WHERE iso_alpha3 = 'ECU';
UPDATE public.countries SET phone_code = '+20' WHERE iso_alpha3 = 'EGY';
UPDATE public.countries SET phone_code = '+251' WHERE iso_alpha3 = 'ETH';
UPDATE public.countries SET phone_code = '+679' WHERE iso_alpha3 = 'FJI';
UPDATE public.countries SET phone_code = '+358' WHERE iso_alpha3 = 'FIN';
UPDATE public.countries SET phone_code = '+33' WHERE iso_alpha3 = 'FRA';
UPDATE public.countries SET phone_code = '+995' WHERE iso_alpha3 = 'GEO';
UPDATE public.countries SET phone_code = '+49' WHERE iso_alpha3 = 'DEU';
UPDATE public.countries SET phone_code = '+233' WHERE iso_alpha3 = 'GHA';
UPDATE public.countries SET phone_code = '+30' WHERE iso_alpha3 = 'GRC';
UPDATE public.countries SET phone_code = '+502' WHERE iso_alpha3 = 'GTM';
UPDATE public.countries SET phone_code = '+504' WHERE iso_alpha3 = 'HND';
UPDATE public.countries SET phone_code = '+36' WHERE iso_alpha3 = 'HUN';
UPDATE public.countries SET phone_code = '+354' WHERE iso_alpha3 = 'ISL';
UPDATE public.countries SET phone_code = '+91' WHERE iso_alpha3 = 'IND';
UPDATE public.countries SET phone_code = '+62' WHERE iso_alpha3 = 'IDN';
UPDATE public.countries SET phone_code = '+98' WHERE iso_alpha3 = 'IRN';
UPDATE public.countries SET phone_code = '+964' WHERE iso_alpha3 = 'IRQ';
UPDATE public.countries SET phone_code = '+353' WHERE iso_alpha3 = 'IRL';
UPDATE public.countries SET phone_code = '+972' WHERE iso_alpha3 = 'ISR';
UPDATE public.countries SET phone_code = '+39' WHERE iso_alpha3 = 'ITA';
UPDATE public.countries SET phone_code = '+1-876' WHERE iso_alpha3 = 'JAM';
UPDATE public.countries SET phone_code = '+81' WHERE iso_alpha3 = 'JPN';
UPDATE public.countries SET phone_code = '+962' WHERE iso_alpha3 = 'JOR';
UPDATE public.countries SET phone_code = '+7' WHERE iso_alpha3 = 'KAZ';
UPDATE public.countries SET phone_code = '+254' WHERE iso_alpha3 = 'KEN';
UPDATE public.countries SET phone_code = '+965' WHERE iso_alpha3 = 'KWT';
UPDATE public.countries SET phone_code = '+996' WHERE iso_alpha3 = 'KGZ';
UPDATE public.countries SET phone_code = '+856' WHERE iso_alpha3 = 'LAO';
UPDATE public.countries SET phone_code = '+371' WHERE iso_alpha3 = 'LVA';
UPDATE public.countries SET phone_code = '+961' WHERE iso_alpha3 = 'LBN';
UPDATE public.countries SET phone_code = '+231' WHERE iso_alpha3 = 'LBR';
UPDATE public.countries SET phone_code = '+218' WHERE iso_alpha3 = 'LBY';
UPDATE public.countries SET phone_code = '+423' WHERE iso_alpha3 = 'LIE';
UPDATE public.countries SET phone_code = '+370' WHERE iso_alpha3 = 'LTU';
UPDATE public.countries SET phone_code = '+352' WHERE iso_alpha3 = 'LUX';
UPDATE public.countries SET phone_code = '+261' WHERE iso_alpha3 = 'MDG';
UPDATE public.countries SET phone_code = '+60' WHERE iso_alpha3 = 'MYS';
UPDATE public.countries SET phone_code = '+960' WHERE iso_alpha3 = 'MDV';
UPDATE public.countries SET phone_code = '+356' WHERE iso_alpha3 = 'MLT';
UPDATE public.countries SET phone_code = '+52' WHERE iso_alpha3 = 'MEX';
UPDATE public.countries SET phone_code = '+377' WHERE iso_alpha3 = 'MCO';
UPDATE public.countries SET phone_code = '+976' WHERE iso_alpha3 = 'MNG';
UPDATE public.countries SET phone_code = '+212' WHERE iso_alpha3 = 'MAR';
UPDATE public.countries SET phone_code = '+95' WHERE iso_alpha3 = 'MMR';
UPDATE public.countries SET phone_code = '+977' WHERE iso_alpha3 = 'NPL';
UPDATE public.countries SET phone_code = '+31' WHERE iso_alpha3 = 'NLD';
UPDATE public.countries SET phone_code = '+64' WHERE iso_alpha3 = 'NZL';
UPDATE public.countries SET phone_code = '+234' WHERE iso_alpha3 = 'NGA';
UPDATE public.countries SET phone_code = '+850' WHERE iso_alpha3 = 'PRK';
UPDATE public.countries SET phone_code = '+47' WHERE iso_alpha3 = 'NOR';
UPDATE public.countries SET phone_code = '+968' WHERE iso_alpha3 = 'OMN';
UPDATE public.countries SET phone_code = '+92' WHERE iso_alpha3 = 'PAK';
UPDATE public.countries SET phone_code = '+507' WHERE iso_alpha3 = 'PAN';
UPDATE public.countries SET phone_code = '+595' WHERE iso_alpha3 = 'PRY';
UPDATE public.countries SET phone_code = '+51' WHERE iso_alpha3 = 'PER';
UPDATE public.countries SET phone_code = '+63' WHERE iso_alpha3 = 'PHL';
UPDATE public.countries SET phone_code = '+48' WHERE iso_alpha3 = 'POL';
UPDATE public.countries SET phone_code = '+351' WHERE iso_alpha3 = 'PRT';
UPDATE public.countries SET phone_code = '+974' WHERE iso_alpha3 = 'QAT';
UPDATE public.countries SET phone_code = '+40' WHERE iso_alpha3 = 'ROU';
UPDATE public.countries SET phone_code = '+7' WHERE iso_alpha3 = 'RUS';
UPDATE public.countries SET phone_code = '+966' WHERE iso_alpha3 = 'SAU';
UPDATE public.countries SET phone_code = '+65' WHERE iso_alpha3 = 'SGP';
UPDATE public.countries SET phone_code = '+421' WHERE iso_alpha3 = 'SVK';
UPDATE public.countries SET phone_code = '+27' WHERE iso_alpha3 = 'ZAF';
UPDATE public.countries SET phone_code = '+82' WHERE iso_alpha3 = 'KOR';
UPDATE public.countries SET phone_code = '+34' WHERE iso_alpha3 = 'ESP';
UPDATE public.countries SET phone_code = '+94' WHERE iso_alpha3 = 'LKA';
UPDATE public.countries SET phone_code = '+249' WHERE iso_alpha3 = 'SDN';
UPDATE public.countries SET phone_code = '+46' WHERE iso_alpha3 = 'SWE';
UPDATE public.countries SET phone_code = '+41' WHERE iso_alpha3 = 'CHE';
UPDATE public.countries SET phone_code = '+963' WHERE iso_alpha3 = 'SYR';
UPDATE public.countries SET phone_code = '+886' WHERE iso_alpha3 = 'TWN';
UPDATE public.countries SET phone_code = '+992' WHERE iso_alpha3 = 'TJK';
UPDATE public.countries SET phone_code = '+66' WHERE iso_alpha3 = 'THA';
UPDATE public.countries SET phone_code = '+90' WHERE iso_alpha3 = 'TUR';
UPDATE public.countries SET phone_code = '+380' WHERE iso_alpha3 = 'UKR';
UPDATE public.countries SET phone_code = '+971' WHERE iso_alpha3 = 'ARE';
UPDATE public.countries SET phone_code = '+44' WHERE iso_alpha3 = 'GBR';
UPDATE public.countries SET phone_code = '+1' WHERE iso_alpha3 = 'USA';
UPDATE public.countries SET phone_code = '+598' WHERE iso_alpha3 = 'URY';
UPDATE public.countries SET phone_code = '+998' WHERE iso_alpha3 = 'UZB';
UPDATE public.countries SET phone_code = '+58' WHERE iso_alpha3 = 'VEN';
UPDATE public.countries SET phone_code = '+84' WHERE iso_alpha3 = 'VNM';
UPDATE public.countries SET phone_code = '+967' WHERE iso_alpha3 = 'YEM';
UPDATE public.countries SET phone_code = '+260' WHERE iso_alpha3 = 'ZMB';
UPDATE public.countries SET phone_code = '+263' WHERE iso_alpha3 = 'ZWE';

-- 3. Add Structured Phone Fields to student_contact table
ALTER TABLE public.student_contact
    ADD COLUMN IF NOT EXISTS phone_local_country_code VARCHAR(10) DEFAULT NULL,
    ADD COLUMN IF NOT EXISTS phone_local_number VARCHAR(50) DEFAULT NULL,
    ADD COLUMN IF NOT EXISTS phone_home_country_code VARCHAR(10) DEFAULT NULL,
    ADD COLUMN IF NOT EXISTS phone_home_number VARCHAR(50) DEFAULT NULL;

-- 4. Safe Backfill for Existing Phone Numbers
-- For numbers starting with '+', extract country code and local number if unpopulated
UPDATE public.student_contact
SET 
    phone_local_country_code = COALESCE(phone_local_country_code, '+91'),
    phone_local_number = COALESCE(phone_local_number, regexp_replace(phone_local, '^\+91|\s|-', '', 'g'))
WHERE phone_local IS NOT NULL AND phone_local_number IS NULL AND phone_local LIKE '+91%';

UPDATE public.student_contact
SET 
    phone_home_country_code = COALESCE(phone_home_country_code, '+91'),
    phone_home_number = COALESCE(phone_home_number, regexp_replace(phone_home, '^\+91|\s|-', '', 'g'))
WHERE phone_home IS NOT NULL AND phone_home_number IS NULL AND phone_home LIKE '+91%';

-- 5. Documentation
COMMENT ON COLUMN public.countries.phone_code IS 'International telecommunication dial code (e.g. +91, +679, +1).';
COMMENT ON COLUMN public.student_contact.phone_local_country_code IS 'Country calling code for primary local phone (e.g. +91).';
COMMENT ON COLUMN public.student_contact.phone_local_number IS 'National subscriber phone number without country code.';
COMMENT ON COLUMN public.student_contact.phone_home_country_code IS 'Country calling code for international home phone (e.g. +679).';
COMMENT ON COLUMN public.student_contact.phone_home_number IS 'National subscriber phone number without country code.';

COMMIT;
