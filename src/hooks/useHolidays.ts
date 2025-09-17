import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/services/supabase';
import type { Holiday } from '@/utils/sandwichLeaveCalculator';

// Fetch all holidays for a specific year or all available holidays
export function useHolidays(year?: number) {
  return useQuery({
    queryKey: ['holidays', year],
    queryFn: async (): Promise<Holiday[]> => {
      let query = supabase
        .from('holidays')
        .select('*')
        .order('date');
      
      if (year) {
        const yearStart = `${year}-01-01`;
        const yearEnd = `${year}-12-31`;
        query = query.gte('date', yearStart).lte('date', yearEnd);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      
      return data?.map(holiday => ({
        date: holiday.date,
        name: holiday.name,
        is_optional: holiday.is_optional || false
      })) || [];
    },
    staleTime: 24 * 60 * 60 * 1000, // 24 hours
  });
}

// Fetch upcoming holidays (convenience hook)
export function useUpcomingHolidays() {
  return useQuery({
    queryKey: ['upcoming-holidays'],
    queryFn: async (): Promise<Holiday[]> => {
      const today = new Date().toISOString().split('T')[0];
      
      const { data, error } = await supabase
        .from('holidays')
        .select('*')
        .gte('date', today)
        .order('date')
        .limit(10);
      
      if (error) throw error;
      
      return data?.map(holiday => ({
        date: holiday.date,
        name: holiday.name,
        is_optional: holiday.is_optional || false
      })) || [];
    },
    staleTime: 24 * 60 * 60 * 1000, // 24 hours
  });
}

