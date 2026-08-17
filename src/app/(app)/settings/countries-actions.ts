"use server";

import { CountryService } from "@/domain/countries/country.service";
import { Country, CreateCountryDto, UpdateCountryDto, CountryFilterOptions } from "@/domain/countries/types";
import { getServerSupabase } from "@/lib/supabase/server";

const countryService = new CountryService();

/**
 * Public/Staff action: Fetch active countries for dropdown selectors
 */
export async function getActiveCountriesAction(): Promise<{
  success: boolean;
  countries: Country[];
  error?: string;
}> {
  try {
    const countries = await countryService.getActiveCountries();
    return { success: true, countries };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[COUNTRIES_ACTION_ERROR] Failed fetching active countries:", msg);
    return { success: false, countries: [], error: msg };
  }
}

/**
 * Admin action: Fetch all countries (including inactive) with usage counts for Settings Management
 */
export async function getAllCountriesAction(options?: CountryFilterOptions): Promise<{
  success: boolean;
  countries: Country[];
  error?: string;
}> {
  try {
    const countries = await countryService.getAllCountries(options);
    return { success: true, countries };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, countries: [], error: msg };
  }
}

/**
 * Admin action: Create new country master record
 */
export async function createCountryAction(dto: CreateCountryDto): Promise<{
  success: boolean;
  country?: Country;
  error?: string;
}> {
  try {
    const supabase = await getServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();

    const country = await countryService.createCountry(dto, user?.id);
    return { success: true, country };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, error: msg };
  }
}

/**
 * Admin action: Update country master record
 */
export async function updateCountryAction(
  id: string,
  dto: UpdateCountryDto
): Promise<{
  success: boolean;
  country?: Country;
  error?: string;
}> {
  try {
    const country = await countryService.updateCountry(id, dto);
    return { success: true, country };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, error: msg };
  }
}

/**
 * Admin action: Toggle country activation status (Disable / Enable)
 */
export async function toggleCountryStatusAction(
  id: string,
  isActive: boolean
): Promise<{
  success: boolean;
  country?: Country;
  error?: string;
}> {
  try {
    const supabase = await getServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();

    const country = await countryService.toggleCountryStatus(id, isActive, {
      id: user?.id,
      email: user?.email
    });
    return { success: true, country };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, error: msg };
  }
}

/**
 * Resolve country code or name into standardized country record
 */
export async function resolveCountryAction(codeOrName: string): Promise<{
  success: boolean;
  country?: Country | null;
  error?: string;
}> {
  try {
    const country = await countryService.getCountryByCode(codeOrName);
    return { success: true, country };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, country: null, error: msg };
  }
}
