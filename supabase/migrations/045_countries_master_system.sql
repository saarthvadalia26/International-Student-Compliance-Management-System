-- Migration: 045_countries_master_system
-- Description: Creates canonical countries master table with complete ISO 3166-1 dataset,
--              Row-Level Security, Realtime publication, and reference synchronization.
-- Dependencies: 002_reference_data.sql, 004_student_details.sql, 015_iso_countries.sql, 030_sync_reference_data_and_constraints.sql
-- Transaction: Yes

BEGIN;

-- 1. Create canonical countries master table
CREATE TABLE IF NOT EXISTS public.countries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(150) NOT NULL UNIQUE,
    iso_alpha2 VARCHAR(2) NOT NULL UNIQUE,
    iso_alpha3 VARCHAR(3) NOT NULL UNIQUE,
    iso_numeric VARCHAR(3) NOT NULL UNIQUE,
    official_name VARCHAR(255),
    nationality VARCHAR(100),
    flag VARCHAR(10),
    region VARCHAR(50),
    subregion VARCHAR(100),
    display_order INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by UUID DEFAULT NULL,

    -- Constraints enforcing clean standard formatting
    CONSTRAINT chk_countries_name_not_empty CHECK (length(trim(name)) > 0),
    CONSTRAINT chk_countries_alpha2_format CHECK (iso_alpha2 ~ '^[A-Z]{2}$'),
    CONSTRAINT chk_countries_alpha3_format CHECK (iso_alpha3 ~ '^[A-Z]{3}$'),
    CONSTRAINT chk_countries_numeric_format CHECK (iso_numeric ~ '^[0-9]{3}$')
);

-- Documentation comments
COMMENT ON TABLE public.countries IS 'Canonical ISO 3166-1 country master table managed by system administrators.';
COMMENT ON COLUMN public.countries.id IS 'UUID primary key generated via gen_random_uuid().';
COMMENT ON COLUMN public.countries.name IS 'Common country name in English.';
COMMENT ON COLUMN public.countries.iso_alpha2 IS 'Two-letter ISO 3166-1 alpha-2 code (e.g., IN, FJ, US).';
COMMENT ON COLUMN public.countries.iso_alpha3 IS 'Three-letter ISO 3166-1 alpha-3 code (e.g., IND, FJI, USA).';
COMMENT ON COLUMN public.countries.iso_numeric IS 'Three-digit ISO 3166-1 numeric code (e.g., 356, 242, 840).';
COMMENT ON COLUMN public.countries.official_name IS 'Full formal sovereign name of the country.';
COMMENT ON COLUMN public.countries.nationality IS 'Standard demonym describing citizens (e.g., Indian, Fijian, American).';
COMMENT ON COLUMN public.countries.flag IS 'Unicode flag emoji representation.';
COMMENT ON COLUMN public.countries.is_active IS 'Soft activation flag. Inactive countries remain preserved for historical records.';

-- 2. Performance Indexes
CREATE INDEX IF NOT EXISTS idx_countries_active ON public.countries (is_active);
CREATE INDEX IF NOT EXISTS idx_countries_alpha3 ON public.countries (iso_alpha3);
CREATE INDEX IF NOT EXISTS idx_countries_alpha2 ON public.countries (iso_alpha2);
CREATE INDEX IF NOT EXISTS idx_countries_name ON public.countries (name);
CREATE INDEX IF NOT EXISTS idx_countries_order ON public.countries (display_order, name);

-- 3. Row-Level Security (RLS) Policies
ALTER TABLE public.countries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "SELECT_countries_Public" ON public.countries;
DROP POLICY IF EXISTS "INSERT_countries_Admin" ON public.countries;
DROP POLICY IF EXISTS "UPDATE_countries_Admin" ON public.countries;
DROP POLICY IF EXISTS "DELETE_countries_Admin" ON public.countries;

CREATE POLICY "SELECT_countries_Public" ON public.countries 
    FOR SELECT USING (true);

CREATE POLICY "INSERT_countries_Admin" ON public.countries 
    FOR INSERT WITH CHECK (public.is_admin());

CREATE POLICY "UPDATE_countries_Admin" ON public.countries 
    FOR UPDATE USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "DELETE_countries_Admin" ON public.countries 
    FOR DELETE USING (public.is_admin());

-- 4. Populate Complete Standardized ISO 3166-1 Dataset (Idempotent)
INSERT INTO public.countries (name, iso_alpha2, iso_alpha3, iso_numeric, official_name, nationality, flag, region, subregion, display_order, is_active)
VALUES
    ('Afghanistan', 'AF', 'AFG', '004', 'Islamic Republic of Afghanistan', 'Afghan', '🇦🇫', 'Asia', 'Southern Asia', 1, true),
    ('Albania', 'AL', 'ALB', '008', 'Republic of Albania', 'Albanian', '🇦🇱', 'Europe', 'Southern Europe', 2, true),
    ('Algeria', 'DZ', 'DZA', '012', 'People''s Democratic Republic of Algeria', 'Algerian', '🇩🇿', 'Africa', 'Northern Africa', 3, true),
    ('Andorra', 'AD', 'AND', '020', 'Principality of Andorra', 'Andorran', '🇦🇩', 'Europe', 'Southern Europe', 4, true),
    ('Angola', 'AO', 'AGO', '024', 'Republic of Angola', 'Angolan', '🇦🇴', 'Africa', 'Middle Africa', 5, true),
    ('Antigua and Barbuda', 'AG', 'ATG', '028', 'Antigua and Barbuda', 'Antiguan, Barbudan', '🇦🇬', 'Americas', 'Caribbean', 6, true),
    ('Argentina', 'AR', 'ARG', '032', 'Argentine Republic', 'Argentine', '🇦🇷', 'Americas', 'South America', 7, true),
    ('Armenia', 'AM', 'ARM', '051', 'Republic of Armenia', 'Armenian', '🇦🇲', 'Asia', 'Western Asia', 8, true),
    ('Australia', 'AU', 'AUS', '036', 'Commonwealth of Australia', 'Australian', '🇦🇺', 'Oceania', 'Australia and New Zealand', 9, true),
    ('Austria', 'AT', 'AUT', '040', 'Republic of Austria', 'Austrian', '🇦🇹', 'Europe', 'Western Europe', 10, true),
    ('Azerbaijan', 'AZ', 'AZE', '031', 'Republic of Azerbaijan', 'Azerbaijani', '🇦🇿', 'Asia', 'Western Asia', 11, true),
    ('Bahamas', 'BS', 'BHS', '044', 'Commonwealth of the Bahamas', 'Bahamian', '🇧🇸', 'Americas', 'Caribbean', 12, true),
    ('Bahrain', 'BH', 'BHR', '048', 'Kingdom of Bahrain', 'Bahraini', '🇧🇭', 'Asia', 'Western Asia', 13, true),
    ('Bangladesh', 'BD', 'BGD', '050', 'People''s Republic of Bangladesh', 'Bangladeshi', '🇧🇩', 'Asia', 'Southern Asia', 14, true),
    ('Barbados', 'BB', 'BRB', '052', 'Barbados', 'Barbadian', '🇧🇧', 'Americas', 'Caribbean', 15, true),
    ('Belarus', 'BY', 'BLR', '112', 'Republic of Belarus', 'Belarusian', '🇧🇾', 'Europe', 'Eastern Europe', 16, true),
    ('Belgium', 'BE', 'BEL', '056', 'Kingdom of Belgium', 'Belgian', '🇧🇪', 'Europe', 'Western Europe', 17, true),
    ('Belize', 'BZ', 'BLZ', '084', 'Belize', 'Belizean', '🇧🇿', 'Americas', 'Central America', 18, true),
    ('Benin', 'BJ', 'BEN', '204', 'Republic of Benin', 'Beninese', '🇧🇯', 'Africa', 'Western Africa', 19, true),
    ('Bhutan', 'BT', 'BTN', '064', 'Kingdom of Bhutan', 'Bhutanese', '🇧🇹', 'Asia', 'Southern Asia', 20, true),
    ('Bolivia', 'BO', 'BOL', '068', 'Plurinational State of Bolivia', 'Bolivian', '🇧🇴', 'Americas', 'South America', 21, true),
    ('Bosnia and Herzegovina', 'BA', 'BIH', '070', 'Bosnia and Herzegovina', 'Bosnian, Herzegovinian', '🇧🇦', 'Europe', 'Southern Europe', 22, true),
    ('Botswana', 'BW', 'BWA', '072', 'Republic of Botswana', 'Motswana', '🇧🇼', 'Africa', 'Southern Africa', 23, true),
    ('Brazil', 'BR', 'BRA', '076', 'Federative Republic of Brazil', 'Brazilian', '🇧🇷', 'Americas', 'South America', 24, true),
    ('Brunei', 'BN', 'BRN', '096', 'Brunei Darussalam', 'Bruneian', '🇧🇳', 'Asia', 'South-Eastern Asia', 25, true),
    ('Bulgaria', 'BG', 'BGR', '100', 'Republic of Bulgaria', 'Bulgarian', '🇧🇬', 'Europe', 'Eastern Europe', 26, true),
    ('Burkina Faso', 'BF', 'BFA', '854', 'Burkina Faso', 'Burkinabé', '🇧🇫', 'Africa', 'Western Africa', 27, true),
    ('Burundi', 'BI', 'BDI', '108', 'Republic of Burundi', 'Burundian', '🇧🇮', 'Africa', 'Eastern Africa', 28, true),
    ('Cabo Verde', 'CV', 'CPV', '132', 'Republic of Cabo Verde', 'Cabo Verdean', '🇨🇻', 'Africa', 'Western Africa', 29, true),
    ('Cambodia', 'KH', 'KHM', '116', 'Kingdom of Cambodia', 'Cambodian', '🇰🇭', 'Asia', 'South-Eastern Asia', 30, true),
    ('Cameroon', 'CM', 'CMR', '120', 'Republic of Cameroon', 'Cameroonian', '🇨🇲', 'Africa', 'Middle Africa', 31, true),
    ('Canada', 'CA', 'CAN', '124', 'Canada', 'Canadian', '🇨🇦', 'Americas', 'Northern America', 32, true),
    ('Central African Republic', 'CF', 'CAF', '140', 'Central African Republic', 'Central African', '🇨🇫', 'Africa', 'Middle Africa', 33, true),
    ('Chad', 'TD', 'TCD', '148', 'Republic of Chad', 'Chadian', '🇹🇩', 'Africa', 'Middle Africa', 34, true),
    ('Chile', 'CL', 'CHL', '152', 'Republic of Chile', 'Chilean', '🇨🇱', 'Americas', 'South America', 35, true),
    ('China', 'CN', 'CHN', '156', 'People''s Republic of China', 'Chinese', '🇨🇳', 'Asia', 'Eastern Asia', 36, true),
    ('Colombia', 'CO', 'COL', '170', 'Republic of Colombia', 'Colombian', '🇨🇴', 'Americas', 'South America', 37, true),
    ('Comoros', 'KM', 'COM', '174', 'Union of the Comoros', 'Comoran', '🇰🇲', 'Africa', 'Eastern Africa', 38, true),
    ('Congo (Congo-Brazzaville)', 'CG', 'COG', '178', 'Republic of the Congo', 'Congolese', '🇨🇬', 'Africa', 'Middle Africa', 39, true),
    ('Congo (Democratic Republic)', 'CD', 'COD', '180', 'Democratic Republic of the Congo', 'Congolese', '🇨🇩', 'Africa', 'Middle Africa', 40, true),
    ('Costa Rica', 'CR', 'CRI', '188', 'Republic of Costa Rica', 'Costa Rican', '🇨🇷', 'Americas', 'Central America', 41, true),
    ('Croatia', 'HR', 'HRV', '191', 'Republic of Croatia', 'Croatian', '🇭🇷', 'Europe', 'Southern Europe', 42, true),
    ('Cuba', 'CU', 'CUB', '192', 'Republic of Cuba', 'Cuban', '🇨🇺', 'Americas', 'Caribbean', 43, true),
    ('Cyprus', 'CY', 'CYP', '196', 'Republic of Cyprus', 'Cypriot', '🇨🇾', 'Europe', 'Southern Europe', 44, true),
    ('Czech Republic', 'CZ', 'CZE', '203', 'Czech Republic', 'Czech', '🇨🇿', 'Europe', 'Eastern Europe', 45, true),
    ('Denmark', 'DK', 'DNK', '208', 'Kingdom of Denmark', 'Danish', '🇩🇰', 'Europe', 'Northern Europe', 46, true),
    ('Djibouti', 'DJ', 'DJI', '262', 'Republic of Djibouti', 'Djiboutian', '🇩🇯', 'Africa', 'Eastern Africa', 47, true),
    ('Dominica', 'DM', 'DMA', '212', 'Commonwealth of Dominica', 'Dominican', '🇩🇲', 'Americas', 'Caribbean', 48, true),
    ('Dominican Republic', 'DO', 'DOM', '214', 'Dominican Republic', 'Dominican', '🇩🇴', 'Americas', 'Caribbean', 49, true),
    ('Ecuador', 'EC', 'ECU', '218', 'Republic of Ecuador', 'Ecuadorean', '🇪🇨', 'Americas', 'South America', 50, true),
    ('Egypt', 'EG', 'EGY', '818', 'Arab Republic of Egypt', 'Egyptian', '🇪🇬', 'Africa', 'Northern Africa', 51, true),
    ('El Salvador', 'SV', 'SLV', '222', 'Republic of El Salvador', 'Salvadoran', '🇸🇻', 'Americas', 'Central America', 52, true),
    ('Equatorial Guinea', 'GQ', 'GNQ', '226', 'Republic of Equatorial Guinea', 'Equatorial Guinean', '🇬🇶', 'Africa', 'Middle Africa', 53, true),
    ('Eritrea', 'ER', 'ERI', '232', 'State of Eritrea', 'Eritrean', '🇪🇷', 'Africa', 'Eastern Africa', 54, true),
    ('Estonia', 'EE', 'EST', '233', 'Republic of Estonia', 'Estonian', '🇪🇪', 'Europe', 'Northern Europe', 55, true),
    ('Eswatini', 'SZ', 'SWZ', '748', 'Kingdom of Eswatini', 'Swazi', '🇸🇿', 'Africa', 'Southern Africa', 56, true),
    ('Ethiopia', 'ET', 'ETH', '231', 'Federal Democratic Republic of Ethiopia', 'Ethiopian', '🇪🇹', 'Africa', 'Eastern Africa', 57, true),
    ('Fiji', 'FJ', 'FJI', '242', 'Republic of Fiji', 'Fijian', '🇫🇯', 'Oceania', 'Melanesia', 58, true),
    ('Finland', 'FI', 'FIN', '246', 'Republic of Finland', 'Finnish', '🇫🇮', 'Europe', 'Northern Europe', 59, true),
    ('France', 'FR', 'FRA', '250', 'French Republic', 'French', '🇫🇷', 'Europe', 'Western Europe', 60, true),
    ('Gabon', 'GA', 'GAB', '266', 'Gabonese Republic', 'Gabonese', '🇬🇦', 'Africa', 'Middle Africa', 61, true),
    ('Gambia', 'GM', 'GMB', '270', 'Republic of the Gambia', 'Gambian', '🇬🇲', 'Africa', 'Western Africa', 62, true),
    ('Georgia', 'GE', 'GEO', '268', 'Georgia', 'Georgian', '🇬🇪', 'Asia', 'Western Asia', 63, true),
    ('Germany', 'DE', 'DEU', '276', 'Federal Republic of Germany', 'German', '🇩🇪', 'Europe', 'Western Europe', 64, true),
    ('Ghana', 'GH', 'GHA', '288', 'Republic of Ghana', 'Ghanaian', '🇬🇭', 'Africa', 'Western Africa', 65, true),
    ('Greece', 'GR', 'GRC', '300', 'Hellenic Republic', 'Greek', '🇬🇷', 'Europe', 'Southern Europe', 66, true),
    ('Grenada', 'GD', 'GRD', '308', 'Grenada', 'Grenadian', '🇬🇩', 'Americas', 'Caribbean', 67, true),
    ('Guatemala', 'GT', 'GTM', '320', 'Republic of Guatemala', 'Guatemalan', '🇬🇹', 'Americas', 'Central America', 68, true),
    ('Guinea', 'GN', 'GIN', '324', 'Republic of Guinea', 'Guinean', '🇬🇳', 'Africa', 'Western Africa', 69, true),
    ('Guinea-Bissau', 'GW', 'GNB', '624', 'Republic of Guinea-Bissau', 'Bissau-Guinean', '🇬🇼', 'Africa', 'Western Africa', 70, true),
    ('Guyana', 'GY', 'GUY', '328', 'Co-operative Republic of Guyana', 'Guyanese', '🇬🇾', 'Americas', 'South America', 71, true),
    ('Haiti', 'HT', 'HTI', '332', 'Republic of Haiti', 'Haitian', '🇭🇹', 'Americas', 'Caribbean', 72, true),
    ('Honduras', 'HN', 'HND', '340', 'Republic of Honduras', 'Honduran', '🇭🇳', 'Americas', 'Central America', 73, true),
    ('Hungary', 'HU', 'HUN', '348', 'Hungary', 'Hungarian', '🇭🇺', 'Europe', 'Eastern Europe', 74, true),
    ('Iceland', 'IS', 'ISL', '352', 'Republic of Iceland', 'Icelandic', '🇮🇸', 'Europe', 'Northern Europe', 75, true),
    ('India', 'IN', 'IND', '356', 'Republic of India', 'Indian', '🇮🇳', 'Asia', 'Southern Asia', 76, true),
    ('Indonesia', 'ID', 'IDN', '360', 'Republic of Indonesia', 'Indonesian', '🇮🇩', 'Asia', 'South-Eastern Asia', 77, true),
    ('Iran', 'IR', 'IRN', '364', 'Islamic Republic of Iran', 'Iranian', '🇮🇷', 'Asia', 'Southern Asia', 78, true),
    ('Iraq', 'IQ', 'IRQ', '368', 'Republic of Iraq', 'Iraqi', '🇮🇶', 'Asia', 'Western Asia', 79, true),
    ('Ireland', 'IE', 'IRL', '372', 'Ireland', 'Irish', '🇮🇪', 'Europe', 'Northern Europe', 80, true),
    ('Israel', 'IL', 'ISR', '376', 'State of Israel', 'Israeli', '🇮🇱', 'Asia', 'Western Asia', 81, true),
    ('Italy', 'IT', 'ITA', '380', 'Italian Republic', 'Italian', '🇮🇹', 'Europe', 'Southern Europe', 82, true),
    ('Jamaica', 'JM', 'JAM', '388', 'Jamaica', 'Jamaican', '🇯🇲', 'Americas', 'Caribbean', 83, true),
    ('Japan', 'JP', 'JPN', '392', 'Japan', 'Japanese', '🇯🇵', 'Asia', 'Eastern Asia', 84, true),
    ('Jordan', 'JO', 'JOR', '400', 'Hashemite Kingdom of Jordan', 'Jordanian', '🇯🇴', 'Asia', 'Western Asia', 85, true),
    ('Kazakhstan', 'KZ', 'KAZ', '398', 'Republic of Kazakhstan', 'Kazakhstani', '🇰🇿', 'Asia', 'Central Asia', 86, true),
    ('Kenya', 'KE', 'KEN', '404', 'Republic of Kenya', 'Kenyan', '🇰🇪', 'Africa', 'Eastern Africa', 87, true),
    ('Kiribati', 'KI', 'KIR', '296', 'Republic of Kiribati', 'I-Kiribati', '🇰🇮', 'Oceania', 'Micronesia', 88, true),
    ('Kuwait', 'KW', 'KWT', '414', 'State of Kuwait', 'Kuwaiti', '🇰🇼', 'Asia', 'Western Asia', 89, true),
    ('Kyrgyzstan', 'KG', 'KGZ', '417', 'Kyrgyz Republic', 'Kyrgyzstani', '🇰🇬', 'Asia', 'Central Asia', 90, true),
    ('Laos', 'LA', 'LAO', '418', 'Lao People''s Democratic Republic', 'Laotian', '🇱🇦', 'Asia', 'South-Eastern Asia', 91, true),
    ('Latvia', 'LV', 'LVA', '428', 'Republic of Latvia', 'Latvian', '🇱🇻', 'Europe', 'Northern Europe', 92, true),
    ('Lebanon', 'LB', 'LBN', '422', 'Lebanese Republic', 'Lebanese', '🇱🇧', 'Asia', 'Western Asia', 93, true),
    ('Lesotho', 'LS', 'LSO', '426', 'Kingdom of Lesotho', 'Basotho', '🇱🇸', 'Africa', 'Southern Africa', 94, true),
    ('Liberia', 'LR', 'LBR', '430', 'Republic of Liberia', 'Liberian', '🇱🇷', 'Africa', 'Western Africa', 95, true),
    ('Libya', 'LY', 'LBY', '434', 'State of Libya', 'Libyan', '🇱🇾', 'Africa', 'Northern Africa', 96, true),
    ('Liechtenstein', 'LI', 'LIE', '438', 'Principality of Liechtenstein', 'Liechtensteiner', '🇱🇮', 'Europe', 'Western Europe', 97, true),
    ('Lithuania', 'LT', 'LTU', '440', 'Republic of Lithuania', 'Lithuanian', '🇱🇹', 'Europe', 'Northern Europe', 98, true),
    ('Luxembourg', 'LU', 'LUX', '442', 'Grand Duchy of Luxembourg', 'Luxembourger', '🇱🇺', 'Europe', 'Western Europe', 99, true),
    ('Madagascar', 'MG', 'MDG', '450', 'Republic of Madagascar', 'Malagasy', '🇲🇬', 'Africa', 'Eastern Africa', 100, true),
    ('Malawi', 'MW', 'MWI', '454', 'Republic of Malawi', 'Malawian', '🇲🇼', 'Africa', 'Eastern Africa', 101, true),
    ('Malaysia', 'MY', 'MYS', '458', 'Malaysia', 'Malaysian', '🇲🇾', 'Asia', 'South-Eastern Asia', 102, true),
    ('Maldives', 'MV', 'MDV', '462', 'Republic of Maldives', 'Maldivian', '🇲🇻', 'Asia', 'Southern Asia', 103, true),
    ('Mali', 'ML', 'MLI', '466', 'Republic of Mali', 'Malian', '🇲🇱', 'Africa', 'Western Africa', 104, true),
    ('Malta', 'MT', 'MLT', '470', 'Republic of Malta', 'Maltese', '🇲🇹', 'Europe', 'Southern Europe', 105, true),
    ('Marshall Islands', 'MH', 'MHL', '584', 'Republic of the Marshall Islands', 'Marshallese', '🇲🇭', 'Oceania', 'Micronesia', 106, true),
    ('Mauritania', 'MR', 'MRT', '478', 'Islamic Republic of Mauritania', 'Mauritanian', '🇲🇷', 'Africa', 'Western Africa', 107, true),
    ('Mauritius', 'MU', 'MUS', '480', 'Republic of Mauritius', 'Mauritian', '🇲🇺', 'Africa', 'Eastern Africa', 108, true),
    ('Mexico', 'MX', 'MEX', '484', 'United Mexican States', 'Mexican', '🇲🇽', 'Americas', 'Central America', 109, true),
    ('Micronesia', 'FM', 'FSM', '583', 'Federated States of Micronesia', 'Micronesian', '🇫🇲', 'Oceania', 'Micronesia', 110, true),
    ('Moldova', 'MD', 'MDA', '498', 'Republic of Moldova', 'Moldovan', '🇲🇩', 'Europe', 'Eastern Europe', 111, true),
    ('Monaco', 'MC', 'MCO', '492', 'Principality of Monaco', 'Monégasque', '🇲🇨', 'Europe', 'Western Europe', 112, true),
    ('Mongolia', 'MN', 'MNG', '496', 'Mongolia', 'Mongolian', '🇲🇳', 'Asia', 'Eastern Asia', 113, true),
    ('Montenegro', 'ME', 'MNE', '499', 'Montenegro', 'Montenegrin', '🇲🇪', 'Europe', 'Southern Europe', 114, true),
    ('Morocco', 'MA', 'MAR', '504', 'Kingdom of Morocco', 'Moroccan', '🇲🇦', 'Africa', 'Northern Africa', 115, true),
    ('Mozambique', 'MZ', 'MOZ', '508', 'Republic of Mozambique', 'Mozambican', '🇲🇿', 'Africa', 'Eastern Africa', 116, true),
    ('Myanmar', 'MM', 'MMR', '104', 'Republic of the Union of Myanmar', 'Burmese', '🇲🇲', 'Asia', 'South-Eastern Asia', 117, true),
    ('Namibia', 'NA', 'NAM', '516', 'Republic of Namibia', 'Namibian', '🇳🇦', 'Africa', 'Southern Africa', 118, true),
    ('Nauru', 'NR', 'NRU', '520', 'Republic of Nauru', 'Nauruan', '🇳🇷', 'Oceania', 'Micronesia', 119, true),
    ('Nepal', 'NP', 'NPL', '524', 'Federal Democratic Republic of Nepal', 'Nepalese', '🇳🇵', 'Asia', 'Southern Asia', 120, true),
    ('Netherlands', 'NL', 'NLD', '528', 'Kingdom of the Netherlands', 'Dutch', '🇳🇱', 'Europe', 'Western Europe', 121, true),
    ('New Zealand', 'NZ', 'NZL', '554', 'New Zealand', 'New Zealander', '🇳🇿', 'Oceania', 'Australia and New Zealand', 122, true),
    ('Nicaragua', 'NI', 'NIC', '558', 'Republic of Nicaragua', 'Nicaraguan', '🇳🇮', 'Americas', 'Central America', 123, true),
    ('Niger', 'NE', 'NER', '562', 'Republic of the Niger', 'Nigerien', '🇳🇪', 'Africa', 'Western Africa', 124, true),
    ('Nigeria', 'NG', 'NGA', '566', 'Federal Republic of Nigeria', 'Nigerian', '🇳🇬', 'Africa', 'Western Africa', 125, true),
    ('North Korea', 'KP', 'PRK', '408', 'Democratic People''s Republic of Korea', 'North Korean', '🇰🇵', 'Asia', 'Eastern Asia', 126, true),
    ('North Macedonia', 'MK', 'MKD', '807', 'Republic of North Macedonia', 'Macedonian', '🇲🇰', 'Europe', 'Southern Europe', 127, true),
    ('Norway', 'NO', 'NOR', '578', 'Kingdom of Norway', 'Norwegian', '🇳🇴', 'Europe', 'Northern Europe', 128, true),
    ('Oman', 'OM', 'OMN', '512', 'Sultanate of Oman', 'Omani', '🇴🇲', 'Asia', 'Western Asia', 129, true),
    ('Pakistan', 'PK', 'PAK', '586', 'Islamic Republic of Pakistan', 'Pakistani', '🇵🇰', 'Asia', 'Southern Asia', 130, true),
    ('Palau', 'PW', 'PLW', '585', 'Republic of Palau', 'Palauan', '🇵🇼', 'Oceania', 'Micronesia', 131, true),
    ('Palestine', 'PS', 'PSE', '275', 'State of Palestine', 'Palestinian', '🇵🇸', 'Asia', 'Western Asia', 132, true),
    ('Panama', 'PA', 'PAN', '591', 'Republic of Panama', 'Panamanian', '🇵🇦', 'Americas', 'Central America', 133, true),
    ('Papua New Guinea', 'PG', 'PNG', '598', 'Independent State of Papua New Guinea', 'Papua New Guinean', '🇵🇬', 'Oceania', 'Melanesia', 134, true),
    ('Paraguay', 'PY', 'PRY', '600', 'Republic of Paraguay', 'Paraguayan', '🇵🇾', 'Americas', 'South America', 135, true),
    ('Peru', 'PE', 'PER', '604', 'Republic of Peru', 'Peruvian', '🇵🇪', 'Americas', 'South America', 136, true),
    ('Philippines', 'PH', 'PHL', '608', 'Republic of the Philippines', 'Filipino', '🇵🇭', 'Asia', 'South-Eastern Asia', 137, true),
    ('Poland', 'PL', 'POL', '616', 'Republic of Poland', 'Polish', '🇵🇱', 'Europe', 'Eastern Europe', 138, true),
    ('Portugal', 'PT', 'PRT', '620', 'Portuguese Republic', 'Portuguese', '🇵🇹', 'Europe', 'Southern Europe', 139, true),
    ('Qatar', 'QA', 'QAT', '634', 'State of Qatar', 'Qatari', '🇶🇦', 'Asia', 'Western Asia', 140, true),
    ('Romania', 'RO', 'ROU', '642', 'Romania', 'Romanian', '🇷🇴', 'Europe', 'Eastern Europe', 141, true),
    ('Russia', 'RU', 'RUS', '643', 'Russian Federation', 'Russian', '🇷🇺', 'Europe', 'Eastern Europe', 142, true),
    ('Rwanda', 'RW', 'RWA', '646', 'Republic of Rwanda', 'Rwandan', '🇷🇼', 'Africa', 'Eastern Africa', 143, true),
    ('Saint Kitts and Nevis', 'KN', 'KNA', '659', 'Federation of Saint Christopher and Nevis', 'Kittitian, Nevisian', '🇰🇳', 'Americas', 'Caribbean', 144, true),
    ('Saint Lucia', 'LC', 'LCA', '662', 'Saint Lucia', 'Saint Lucian', '🇱🇨', 'Americas', 'Caribbean', 145, true),
    ('Saint Vincent and the Grenadines', 'VC', 'VCT', '670', 'Saint Vincent and the Grenadines', 'Vincentian', '🇻🇨', 'Americas', 'Caribbean', 146, true),
    ('Samoa', 'WS', 'WSM', '882', 'Independent State of Samoa', 'Samoan', '🇼🇸', 'Oceania', 'Polynesia', 147, true),
    ('San Marino', 'SM', 'SMR', '674', 'Republic of San Marino', 'Sammarinese', '🇸🇲', 'Europe', 'Southern Europe', 148, true),
    ('Sao Tome and Principe', 'ST', 'STP', '678', 'Democratic Republic of São Tomé and Príncipe', 'São Toméan', '🇸🇹', 'Africa', 'Middle Africa', 149, true),
    ('Saudi Arabia', 'SA', 'SAU', '682', 'Kingdom of Saudi Arabia', 'Saudi', '🇸🇦', 'Asia', 'Western Asia', 150, true),
    ('Senegal', 'SN', 'SEN', '686', 'Republic of Senegal', 'Senegalese', '🇸🇳', 'Africa', 'Western Africa', 151, true),
    ('Serbia', 'RS', 'SRB', '688', 'Republic of Serbia', 'Serbian', '🇷🇸', 'Europe', 'Southern Europe', 152, true),
    ('Seychelles', 'SC', 'SYC', '690', 'Republic of Seychelles', 'Seychellois', '🇸🇨', 'Africa', 'Eastern Africa', 153, true),
    ('Sierra Leone', 'SL', 'SLE', '694', 'Republic of Sierra Leone', 'Sierra Leonean', '🇸🇱', 'Africa', 'Western Africa', 154, true),
    ('Singapore', 'SG', 'SGP', '702', 'Republic of Singapore', 'Singaporean', '🇸🇬', 'Asia', 'South-Eastern Asia', 155, true),
    ('Slovakia', 'SK', 'SVK', '703', 'Slovak Republic', 'Slovak', '🇸🇰', 'Europe', 'Eastern Europe', 156, true),
    ('Slovenia', 'SI', 'SVN', '705', 'Republic of Slovenia', 'Slovene, Slovenian', '🇸🇮', 'Europe', 'Southern Europe', 157, true),
    ('Solomon Islands', 'SB', 'SLB', '090', 'Solomon Islands', 'Solomon Islander', '🇸🇧', 'Oceania', 'Melanesia', 158, true),
    ('Somalia', 'SO', 'SOM', '706', 'Federal Republic of Somalia', 'Somali', '🇸🇴', 'Africa', 'Eastern Africa', 159, true),
    ('South Africa', 'ZA', 'ZAF', '710', 'Republic of South Africa', 'South African', '🇿🇦', 'Africa', 'Southern Africa', 160, true),
    ('South Korea', 'KR', 'KOR', '410', 'Republic of Korea', 'South Korean', '🇰🇷', 'Asia', 'Eastern Asia', 161, true),
    ('South Sudan', 'SS', 'SSD', '728', 'Republic of South Sudan', 'South Sudanese', '🇸🇸', 'Africa', 'Eastern Africa', 162, true),
    ('Spain', 'ES', 'ESP', '724', 'Kingdom of Spain', 'Spanish', '🇪🇸', 'Europe', 'Southern Europe', 163, true),
    ('Sri Lanka', 'LK', 'LKA', '144', 'Democratic Socialist Republic of Sri Lanka', 'Sri Lankan', '🇱🇰', 'Asia', 'Southern Asia', 164, true),
    ('Sudan', 'SD', 'SDN', '729', 'Republic of the Sudan', 'Sudanese', '🇸🇩', 'Africa', 'Northern Africa', 165, true),
    ('Suriname', 'SR', 'SUR', '740', 'Republic of Suriname', 'Surinamese', '🇸🇷', 'Americas', 'South America', 166, true),
    ('Sweden', 'SE', 'SWE', '752', 'Kingdom of Sweden', 'Swedish', '🇸🇪', 'Europe', 'Northern Europe', 167, true),
    ('Switzerland', 'CH', 'CHE', '756', 'Swiss Confederation', 'Swiss', '🇨🇭', 'Europe', 'Western Europe', 168, true),
    ('Syria', 'SY', 'SYR', '760', 'Syrian Arab Republic', 'Syrian', '🇸🇾', 'Asia', 'Western Asia', 169, true),
    ('Taiwan', 'TW', 'TWN', '158', 'Republic of China (Taiwan)', 'Taiwanese', '🇹🇼', 'Asia', 'Eastern Asia', 170, true),
    ('Tajikistan', 'TJ', 'TJK', '762', 'Republic of Tajikistan', 'Tajikistani', '🇹🇯', 'Asia', 'Central Asia', 171, true),
    ('Tanzania', 'TZ', 'TZA', '834', 'United Republic of Tanzania', 'Tanzanian', '🇹🇿', 'Africa', 'Eastern Africa', 172, true),
    ('Thailand', 'TH', 'THA', '764', 'Kingdom of Thailand', 'Thai', '🇹🇭', 'Asia', 'South-Eastern Asia', 173, true),
    ('Timor-Leste', 'TL', 'TLS', '626', 'Democratic Republic of Timor-Leste', 'Timorese', '🇹🇱', 'Asia', 'South-Eastern Asia', 174, true),
    ('Togo', 'TG', 'TGO', '768', 'Togolese Republic', 'Togolese', '🇹🇬', 'Africa', 'Western Africa', 175, true),
    ('Tonga', 'TO', 'TON', '776', 'Kingdom of Tonga', 'Tongan', '🇹🇴', 'Oceania', 'Polynesia', 176, true),
    ('Trinidad and Tobago', 'TT', 'TTO', '780', 'Republic of Trinidad and Tobago', 'Trinidadian, Tobagonian', '🇹🇹', 'Americas', 'Caribbean', 177, true),
    ('Tunisia', 'TN', 'TUN', '788', 'Republic of Tunisia', 'Tunisian', '🇹🇳', 'Africa', 'Northern Africa', 178, true),
    ('Turkey', 'TR', 'TUR', '792', 'Republic of Türkiye', 'Turkish', '🇹🇷', 'Asia', 'Western Asia', 179, true),
    ('Turkmenistan', 'TM', 'TKM', '795', 'Turkmenistan', 'Turkmen', '🇹🇲', 'Asia', 'Central Asia', 180, true),
    ('Tuvalu', 'TV', 'TUV', '798', 'Tuvalu', 'Tuvaluan', '🇹🇻', 'Oceania', 'Polynesia', 181, true),
    ('Uganda', 'UG', 'UGA', '800', 'Republic of Uganda', 'Ugandan', '🇺🇬', 'Africa', 'Eastern Africa', 182, true),
    ('Ukraine', 'UA', 'UKR', '804', 'Ukraine', 'Ukrainian', '🇺🇦', 'Europe', 'Eastern Europe', 183, true),
    ('United Arab Emirates', 'AE', 'ARE', '784', 'United Arab Emirates', 'Emirati', '🇦🇪', 'Asia', 'Western Asia', 184, true),
    ('United Kingdom', 'GB', 'GBR', '826', 'United Kingdom of Great Britain and Northern Ireland', 'British', '🇬🇧', 'Europe', 'Northern Europe', 185, true),
    ('United States', 'US', 'USA', '840', 'United States of America', 'American', '🇺🇸', 'Americas', 'Northern America', 186, true),
    ('Uruguay', 'UY', 'URY', '858', 'Oriental Republic of Uruguay', 'Uruguayan', '🇺🇾', 'Americas', 'South America', 187, true),
    ('Uzbekistan', 'UZ', 'UZB', '860', 'Republic of Uzbekistan', 'Uzbekistani', '🇺🇿', 'Asia', 'Central Asia', 188, true),
    ('Vanuatu', 'VU', 'VUT', '548', 'Republic of Vanuatu', 'Ni-Vanuatu', '🇻🇺', 'Oceania', 'Melanesia', 189, true),
    ('Vatican City', 'VA', 'VAT', '336', 'Vatican City State', 'Vatican', '🇻🇦', 'Europe', 'Southern Europe', 190, true),
    ('Venezuela', 'VE', 'VEN', '862', 'Bolivarian Republic of Venezuela', 'Venezuelan', '🇻🇪', 'Americas', 'South America', 191, true),
    ('Vietnam', 'VN', 'VNM', '704', 'Socialist Republic of Vietnam', 'Vietnamese', '🇻🇳', 'Asia', 'South-Eastern Asia', 192, true),
    ('Yemen', 'YE', 'YEM', '887', 'Republic of Yemen', 'Yemeni', '🇾🇪', 'Asia', 'Western Asia', 193, true),
    ('Zambia', 'ZM', 'ZMB', '894', 'Republic of Zambia', 'Zambian', '🇿🇲', 'Africa', 'Eastern Africa', 194, true),
    ('Zimbabwe', 'ZW', 'ZWE', '716', 'Republic of Zimbabwe', 'Zimbabwean', '🇿🇼', 'Africa', 'Eastern Africa', 195, true)
ON CONFLICT (iso_alpha3) DO UPDATE
SET name = EXCLUDED.name,
    iso_alpha2 = EXCLUDED.iso_alpha2,
    iso_numeric = EXCLUDED.iso_numeric,
    official_name = EXCLUDED.official_name,
    nationality = EXCLUDED.nationality,
    flag = EXCLUDED.flag,
    region = EXCLUDED.region,
    subregion = EXCLUDED.subregion,
    updated_at = now();

-- 5. Synchronize public.reference_data with canonical countries dataset for backward compatibility
INSERT INTO public.reference_data (category, code, display_name, description, display_order, is_active)
SELECT 
    'country', 
    iso_alpha3, 
    name, 
    'ISO-3166-1: ' || iso_alpha2 || ' / ' || iso_numeric || ' | Demonym: ' || coalesce(nationality, name) || ' | Region: ' || coalesce(region, 'Global'),
    display_order,
    is_active
FROM public.countries
ON CONFLICT (code) DO UPDATE
SET display_name = EXCLUDED.display_name,
    description = EXCLUDED.description,
    is_active = EXCLUDED.is_active,
    updated_at = now();

-- 6. Add countries table to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.countries;

COMMIT;
