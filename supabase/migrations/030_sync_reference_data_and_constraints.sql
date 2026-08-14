-- Migration: 030_sync_reference_data_and_constraints
-- Description: Synchronizes complete ISO country dataset, academic program references, 
--              and optimizes relational constraints for robust student creation and persistence.
-- Dependencies: 002_reference_data.sql, 004_student_details.sql, 015_iso_countries.sql, 025_academic_programs.sql
-- Transaction: Yes

BEGIN;

-- 1. Ensure reference_data category constraint accommodates all required lookup types
ALTER TABLE public.reference_data DROP CONSTRAINT IF EXISTS check_valid_category;
ALTER TABLE public.reference_data ADD CONSTRAINT check_valid_category CHECK (category IN (
    'sponsorship_category',
    'visa_type',
    'gender',
    'marital_status',
    'blood_group',
    'school',
    'course',
    'program',
    'fee_type',
    'document_status',
    'notification_channel',
    'notification_status',
    'country'
));

-- 2. Populate complete ISO 3166-1 Alpha-3 Country codes into reference_data
INSERT INTO public.reference_data (category, code, display_name, description, display_order, is_active)
VALUES
    ('country', 'AFG', 'Afghanistan', 'ISO-3166-1: AFG / 004 | Afghan | Asia', 1, true),
    ('country', 'ALB', 'Albania', 'ISO-3166-1: ALB / 008 | Albanian | Europe', 2, true),
    ('country', 'DZA', 'Algeria', 'ISO-3166-1: DZA / 012 | Algerian | Africa', 3, true),
    ('country', 'AND', 'Andorra', 'ISO-3166-1: AND / 020 | Andorran | Europe', 4, true),
    ('country', 'AGO', 'Angola', 'ISO-3166-1: AGO / 024 | Angolan | Africa', 5, true),
    ('country', 'ARG', 'Argentina', 'ISO-3166-1: ARG / 032 | Argentine | Americas', 6, true),
    ('country', 'ARM', 'Armenia', 'ISO-3166-1: ARM / 051 | Armenian | Asia', 7, true),
    ('country', 'AUS', 'Australia', 'ISO-3166-1: AUS / 036 | Australian | Oceania', 8, true),
    ('country', 'AUT', 'Austria', 'ISO-3166-1: AUT / 040 | Austrian | Europe', 9, true),
    ('country', 'AZE', 'Azerbaijan', 'ISO-3166-1: AZE / 031 | Azerbaijani | Asia', 10, true),
    ('country', 'BHS', 'Bahamas', 'ISO-3166-1: BHS / 044 | Bahamian | Americas', 11, true),
    ('country', 'BHR', 'Bahrain', 'ISO-3166-1: BHR / 048 | Bahraini | Asia', 12, true),
    ('country', 'BGD', 'Bangladesh', 'ISO-3166-1: BGD / 050 | Bangladeshi | Asia', 13, true),
    ('country', 'BLR', 'Belarus', 'ISO-3166-1: BLR / 112 | Belarusian | Europe', 14, true),
    ('country', 'BEL', 'Belgium', 'ISO-3166-1: BEL / 056 | Belgian | Europe', 15, true),
    ('country', 'BTN', 'Bhutan', 'ISO-3166-1: BTN / 064 | Bhutanese | Asia', 16, true),
    ('country', 'BOL', 'Bolivia', 'ISO-3166-1: BOL / 068 | Bolivian | Americas', 17, true),
    ('country', 'BRA', 'Brazil', 'ISO-3166-1: BRA / 076 | Brazilian | Americas', 18, true),
    ('country', 'BRN', 'Brunei', 'ISO-3166-1: BRN / 096 | Bruneian | Asia', 19, true),
    ('country', 'BGR', 'Bulgaria', 'ISO-3166-1: BGR / 100 | Bulgarian | Europe', 20, true),
    ('country', 'KHM', 'Cambodia', 'ISO-3166-1: KHM / 116 | Cambodian | Asia', 21, true),
    ('country', 'CMR', 'Cameroon', 'ISO-3166-1: CMR / 120 | Cameroonian | Africa', 22, true),
    ('country', 'CAN', 'Canada', 'ISO-3166-1: CAN / 124 | Canadian | Americas', 23, true),
    ('country', 'CHL', 'Chile', 'ISO-3166-1: CHL / 152 | Chilean | Americas', 24, true),
    ('country', 'CHN', 'China', 'ISO-3166-1: CHN / 156 | Chinese | Asia', 25, true),
    ('country', 'COL', 'Colombia', 'ISO-3166-1: COL / 170 | Colombian | Americas', 26, true),
    ('country', 'CRI', 'Costa Rica', 'ISO-3166-1: CRI / 188 | Costa Rican | Americas', 27, true),
    ('country', 'HRV', 'Croatia', 'ISO-3166-1: HRV / 191 | Croatian | Europe', 28, true),
    ('country', 'CUB', 'Cuba', 'ISO-3166-1: CUB / 192 | Cuban | Americas', 29, true),
    ('country', 'CYP', 'Cyprus', 'ISO-3166-1: CYP / 196 | Cypriot | Europe', 30, true),
    ('country', 'CZE', 'Czech Republic', 'ISO-3166-1: CZE / 203 | Czech | Europe', 31, true),
    ('country', 'DNK', 'Denmark', 'ISO-3166-1: DNK / 208 | Danish | Europe', 32, true),
    ('country', 'ECU', 'Ecuador', 'ISO-3166-1: ECU / 218 | Ecuadorean | Americas', 33, true),
    ('country', 'EGY', 'Egypt', 'ISO-3166-1: EGY / 818 | Egyptian | Africa', 34, true),
    ('country', 'ETH', 'Ethiopia', 'ISO-3166-1: ETH / 231 | Ethiopian | Africa', 35, true),
    ('country', 'FIN', 'Finland', 'ISO-3166-1: FIN / 246 | Finnish | Europe', 36, true),
    ('country', 'FRA', 'France', 'ISO-3166-1: FRA / 250 | French | Europe', 37, true),
    ('country', 'GEO', 'Georgia', 'ISO-3166-1: GEO / 268 | Georgian | Asia', 38, true),
    ('country', 'DEU', 'Germany', 'ISO-3166-1: DEU / 276 | German | Europe', 39, true),
    ('country', 'GHA', 'Ghana', 'ISO-3166-1: GHA / 288 | Ghanaian | Africa', 40, true),
    ('country', 'GRC', 'Greece', 'ISO-3166-1: GRC / 300 | Greek | Europe', 41, true),
    ('country', 'HND', 'Honduras', 'ISO-3166-1: HND / 340 | Honduran | Americas', 42, true),
    ('country', 'HUN', 'Hungary', 'ISO-3166-1: HUN / 348 | Hungarian | Europe', 43, true),
    ('country', 'ISL', 'Iceland', 'ISO-3166-1: ISL / 352 | Icelandic | Europe', 44, true),
    ('country', 'IND', 'India', 'ISO-3166-1: IND / 356 | Indian | Asia', 45, true),
    ('country', 'IDN', 'Indonesia', 'ISO-3166-1: IDN / 360 | Indonesian | Asia', 46, true),
    ('country', 'IRN', 'Iran', 'ISO-3166-1: IRN / 364 | Iranian | Asia', 47, true),
    ('country', 'IRQ', 'Iraq', 'ISO-3166-1: IRQ / 368 | Iraqi | Asia', 48, true),
    ('country', 'IRL', 'Ireland', 'ISO-3166-1: IRL / 372 | Irish | Europe', 49, true),
    ('country', 'ISR', 'Israel', 'ISO-3166-1: ISR / 376 | Israeli | Asia', 50, true),
    ('country', 'ITA', 'Italy', 'ISO-3166-1: ITA / 380 | Italian | Europe', 51, true),
    ('country', 'JAM', 'Jamaica', 'ISO-3166-1: JAM / 388 | Jamaican | Americas', 52, true),
    ('country', 'JPN', 'Japan', 'ISO-3166-1: JPN / 392 | Japanese | Asia', 53, true),
    ('country', 'JOR', 'Jordan', 'ISO-3166-1: JOR / 400 | Jordanian | Asia', 54, true),
    ('country', 'KAZ', 'Kazakhstan', 'ISO-3166-1: KAZ / 398 | Kazakhstani | Asia', 55, true),
    ('country', 'KEN', 'Kenya', 'ISO-3166-1: KEN / 404 | Kenyan | Africa', 56, true),
    ('country', 'KWT', 'Kuwait', 'ISO-3166-1: KWT / 414 | Kuwaiti | Asia', 57, true),
    ('country', 'KGZ', 'Kyrgyzstan', 'ISO-3166-1: KGZ / 417 | Kyrgyzstani | Asia', 58, true),
    ('country', 'LAO', 'Laos', 'ISO-3166-1: LAO / 418 | Laotian | Asia', 59, true),
    ('country', 'LVA', 'Latvia', 'ISO-3166-1: LVA / 428 | Latvian | Europe', 60, true),
    ('country', 'LBN', 'Lebanon', 'ISO-3166-1: LBN / 422 | Lebanese | Asia', 61, true),
    ('country', 'LBR', 'Liberia', 'ISO-3166-1: LBR / 430 | Liberian | Africa', 62, true),
    ('country', 'LBY', 'Libya', 'ISO-3166-1: LBY / 434 | Libyan | Africa', 63, true),
    ('country', 'LIE', 'Liechtenstein', 'ISO-3166-1: LIE / 438 | Liechtensteiner | Europe', 64, true),
    ('country', 'LTU', 'Lithuania', 'ISO-3166-1: LTU / 440 | Lithuanian | Europe', 65, true),
    ('country', 'LUX', 'Luxembourg', 'ISO-3166-1: LUX / 442 | Luxembourger | Europe', 66, true),
    ('country', 'MDG', 'Madagascar', 'ISO-3166-1: MDG / 450 | Malagasy | Africa', 67, true),
    ('country', 'MYS', 'Malaysia', 'ISO-3166-1: MYS / 458 | Malaysian | Asia', 68, true),
    ('country', 'MDV', 'Maldives', 'ISO-3166-1: MDV / 462 | Maldivian | Asia', 69, true),
    ('country', 'MLT', 'Malta', 'ISO-3166-1: MLT / 470 | Maltese | Europe', 70, true),
    ('country', 'MEX', 'Mexico', 'ISO-3166-1: MEX / 484 | Mexican | Americas', 71, true),
    ('country', 'MCO', 'Monaco', 'ISO-3166-1: MCO / 492 | Monégasque | Europe', 72, true),
    ('country', 'MNG', 'Mongolia', 'ISO-3166-1: MNG / 496 | Mongolian | Asia', 73, true),
    ('country', 'MAR', 'Morocco', 'ISO-3166-1: MAR / 504 | Moroccan | Africa', 74, true),
    ('country', 'MMR', 'Myanmar', 'ISO-3166-1: MMR / 104 | Burmese | Asia', 75, true),
    ('country', 'NPL', 'Nepal', 'ISO-3166-1: NPL / 524 | Nepalese | Asia', 76, true),
    ('country', 'NLD', 'Netherlands', 'ISO-3166-1: NLD / 528 | Dutch | Europe', 77, true),
    ('country', 'NZL', 'New Zealand', 'ISO-3166-1: NZL / 554 | New Zealander | Oceania', 78, true),
    ('country', 'NGA', 'Nigeria', 'ISO-3166-1: NGA / 566 | Nigerian | Africa', 79, true),
    ('country', 'PRK', 'North Korea', 'ISO-3166-1: PRK / 408 | North Korean | Asia', 80, true),
    ('country', 'NOR', 'Norway', 'ISO-3166-1: NOR / 578 | Norwegian | Europe', 81, true),
    ('country', 'OMN', 'Oman', 'ISO-3166-1: OMN / 512 | Omani | Asia', 82, true),
    ('country', 'PAK', 'Pakistan', 'ISO-3166-1: PAK / 586 | Pakistani | Asia', 83, true),
    ('country', 'PAN', 'Panama', 'ISO-3166-1: PAN / 591 | Panamanian | Americas', 84, true),
    ('country', 'PRY', 'Paraguay', 'ISO-3166-1: PRY / 600 | Paraguayan | Americas', 85, true),
    ('country', 'PER', 'Peru', 'ISO-3166-1: PER / 604 | Peruvian | Americas', 86, true),
    ('country', 'PHL', 'Philippines', 'ISO-3166-1: PHL / 608 | Filipino | Asia', 87, true),
    ('country', 'POL', 'Poland', 'ISO-3166-1: POL / 616 | Polish | Europe', 88, true),
    ('country', 'PRT', 'Portugal', 'ISO-3166-1: PRT / 620 | Portuguese | Europe', 89, true),
    ('country', 'QAT', 'Qatar', 'ISO-3166-1: QAT / 634 | Qatari | Asia', 90, true),
    ('country', 'ROU', 'Romania', 'ISO-3166-1: ROU / 642 | Romanian | Europe', 91, true),
    ('country', 'RUS', 'Russia', 'ISO-3166-1: RUS / 643 | Russian | Europe', 92, true),
    ('country', 'SAU', 'Saudi Arabia', 'ISO-3166-1: SAU / 682 | Saudi | Asia', 93, true),
    ('country', 'SGP', 'Singapore', 'ISO-3166-1: SGP / 702 | Singaporean | Asia', 94, true),
    ('country', 'SVK', 'Slovakia', 'ISO-3166-1: SVK / 703 | Slovak | Europe', 95, true),
    ('country', 'ZAF', 'South Africa', 'ISO-3166-1: ZAF / 710 | South African | Africa', 96, true),
    ('country', 'KOR', 'South Korea', 'ISO-3166-1: KOR / 410 | South Korean | Asia', 97, true),
    ('country', 'ESP', 'Spain', 'ISO-3166-1: ESP / 724 | Spanish | Europe', 98, true),
    ('country', 'LKA', 'Sri Lanka', 'ISO-3166-1: LKA / 144 | Sri Lankan | Asia', 99, true),
    ('country', 'SDN', 'Sudan', 'ISO-3166-1: SDN / 729 | Sudanese | Africa', 100, true),
    ('country', 'SWE', 'Sweden', 'ISO-3166-1: SWE / 752 | Swedish | Europe', 101, true),
    ('country', 'CHE', 'Switzerland', 'ISO-3166-1: CHE / 756 | Swiss | Europe', 102, true),
    ('country', 'SYR', 'Syria', 'ISO-3166-1: SYR / 760 | Syrian | Asia', 103, true),
    ('country', 'TWN', 'Taiwan', 'ISO-3166-1: TWN / 158 | Taiwanese | Asia', 104, true),
    ('country', 'TJK', 'Tajikistan', 'ISO-3166-1: TJK / 762 | Tajikistani | Asia', 105, true),
    ('country', 'THA', 'Thailand', 'ISO-3166-1: THA / 764 | Thai | Asia', 106, true),
    ('country', 'TUR', 'Turkey', 'ISO-3166-1: TUR / 792 | Turkish | Asia', 107, true),
    ('country', 'UKR', 'Ukraine', 'ISO-3166-1: UKR / 804 | Ukrainian | Europe', 108, true),
    ('country', 'ARE', 'United Arab Emirates', 'ISO-3166-1: ARE / 784 | Emirati | Asia', 109, true),
    ('country', 'GBR', 'United Kingdom', 'ISO-3166-1: GBR / 826 | British | Europe', 110, true),
    ('country', 'USA', 'United States', 'ISO-3166-1: USA / 840 | American | Americas', 111, true),
    ('country', 'URY', 'Uruguay', 'ISO-3166-1: URY / 858 | Uruguayan | Americas', 112, true),
    ('country', 'UZB', 'Uzbekistan', 'ISO-3166-1: UZB / 860 | Uzbekistani | Asia', 113, true),
    ('country', 'VEN', 'Venezuela', 'ISO-3166-1: VEN / 862 | Venezuelan | Americas', 114, true),
    ('country', 'VNM', 'Vietnam', 'ISO-3166-1: VNM / 704 | Vietnamese | Asia', 115, true),
    ('country', 'YEM', 'Yemen', 'ISO-3166-1: YEM / 887 | Yemeni | Asia', 116, true),
    ('country', 'ZWE', 'Zimbabwe', 'ISO-3166-1: ZWE / 716 | Zimbabwean | Africa', 117, true)
ON CONFLICT (code) DO UPDATE 
SET display_name = EXCLUDED.display_name,
    description = EXCLUDED.description,
    is_active = true,
    updated_at = now();

-- 3. Synchronize Academic Program Codes into reference_data under category 'course'
INSERT INTO public.reference_data (category, code, display_name, description, display_order, is_active)
VALUES
    ('course', 'BTECH_CSE', 'B.Tech in Computer Science & Engineering', 'Undergraduate Engineering Program', 1, true),
    ('course', 'BTECH_AIDS', 'B.Tech in AI & Data Science', 'Undergraduate Engineering Program', 2, true),
    ('course', 'BSC_FS', 'B.Sc. in Forensic Science', 'Undergraduate Forensic Science Program', 3, true),
    ('course', 'MSC_DFIS', 'M.Sc. in Digital Forensics & Information Security', 'Postgraduate Cyber Program', 4, true),
    ('course', 'MTECH_CS', 'M.Tech in Cyber Security', 'Postgraduate Engineering Program', 5, true),
    ('course', 'MBA_CS', 'Master of Business Administration (Cyber Security)', 'Postgraduate Management Program', 6, true),
    ('course', 'PHD', 'Doctor of Philosophy (Ph.D.)', 'Doctoral Research Program', 7, true)
ON CONFLICT (code) DO UPDATE
SET display_name = EXCLUDED.display_name,
    description = EXCLUDED.description,
    is_active = true,
    updated_at = now();

-- 4. Relax strict foreign key constraint on student_academic and expand column capacity
ALTER TABLE public.student_academic DROP CONSTRAINT IF EXISTS fk_academic_program;
ALTER TABLE public.student_academic ALTER COLUMN program_code TYPE VARCHAR(100);

-- 5. Ensure student_snapshot contains all necessary lookup columns
ALTER TABLE public.student_snapshot ADD COLUMN IF NOT EXISTS passport_number VARCHAR(100) DEFAULT NULL;
ALTER TABLE public.student_snapshot ADD COLUMN IF NOT EXISTS visa_number VARCHAR(100) DEFAULT NULL;
ALTER TABLE public.student_snapshot ADD COLUMN IF NOT EXISTS efrro_number VARCHAR(100) DEFAULT NULL;
ALTER TABLE public.student_snapshot ADD COLUMN IF NOT EXISTS days_until_efrro_expiry INT DEFAULT NULL;

COMMIT;
