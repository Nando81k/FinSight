// Financial data utilities for realistic data generation and user storage

interface HistoricalDataPoint {
  month: string;
  income: number;
  expenses: number;
  savings: number;
  date: Date;
}

interface SpendingCategory {
  name: string;
  percentage: number;
  amount: number;
  color: string;
}

interface UserFinancialData {
  monthlyIncome: number;
  monthlyExpenses: number;
  monthlySavings: number;
  spendingCategories: SpendingCategory[];
  historicalData: HistoricalDataPoint[];
  lastUpdated: Date;
}

// Get user-specific localStorage key
export const getUserStorageKey = (userId: string, key: string): string => {
  return `user_${userId}_${key}`;
};

// Default spending categories based on financial best practices
export const getDefaultSpendingCategories = (monthlyExpenses: number): SpendingCategory[] => {
  return [
    { name: 'Housing', percentage: 35, amount: monthlyExpenses * 0.35, color: '#3B82F6' },
    { name: 'Food', percentage: 15, amount: monthlyExpenses * 0.15, color: '#10B981' },
    { name: 'Transportation', percentage: 15, amount: monthlyExpenses * 0.15, color: '#F59E0B' },
    { name: 'Utilities', percentage: 10, amount: monthlyExpenses * 0.10, color: '#EF4444' },
    { name: 'Healthcare', percentage: 8, amount: monthlyExpenses * 0.08, color: '#8B5CF6' },
    { name: 'Entertainment', percentage: 7, amount: monthlyExpenses * 0.07, color: '#EC4899' },
    { name: 'Personal Care', percentage: 5, amount: monthlyExpenses * 0.05, color: '#06B6D4' },
    { name: 'Other', percentage: 5, amount: monthlyExpenses * 0.05, color: '#6B7280' },
  ];
};

// Generate realistic historical data based on current financial situation
export const generateRealisticHistoricalData = (
  currentIncome: number,
  currentExpenses: number,
  months: number = 6
): HistoricalDataPoint[] => {
  const data: HistoricalDataPoint[] = [];
  const today = new Date();
  
  // Create seasonal and trend variations
  const seasonalFactors = [0.95, 0.92, 1.0, 1.05, 1.08, 1.12]; // Jan-Jun
  const trendFactor = 0.02; // 2% monthly growth trend
  
  for (let i = months - 1; i >= 0; i--) {
    const monthDate = new Date(today.getFullYear(), today.getMonth() - i, 1);
    const monthIndex = monthDate.getMonth();
    const seasonalMultiplier = seasonalFactors[monthIndex % 6] || 1.0;
    const trendMultiplier = 1 + (trendFactor * (months - i - 1));
    
    // Add realistic variation (±5-15% month to month)
    const incomeVariation = 1 + (Math.random() - 0.5) * 0.1;
    const expenseVariation = 1 + (Math.random() - 0.5) * 0.15;
    
    const income = currentIncome * seasonalMultiplier * trendMultiplier * incomeVariation;
    const expenses = currentExpenses * seasonalMultiplier * expenseVariation;
    const savings = income - expenses;
    
    data.push({
      month: monthDate.toLocaleDateString('en-US', { month: 'short' }),
      income: Math.round(income),
      expenses: Math.round(expenses),
      savings: Math.round(savings),
      date: monthDate,
    });
  }
  
  return data;
};

// Get user's financial data from localStorage or generate defaults
export const getUserFinancialData = (
  userId: string,
  currentIncome: number,
  currentExpenses: number,
  currentSavings: number
): UserFinancialData => {
  const storageKey = getUserStorageKey(userId, 'financial_data');
  const stored = localStorage.getItem(storageKey);
  
  if (stored) {
    try {
      const parsed = JSON.parse(stored);
      // Validate and update if current data has changed significantly
      const incomeChanged = Math.abs(parsed.monthlyIncome - currentIncome) > currentIncome * 0.1;
      const expensesChanged = Math.abs(parsed.monthlyExpenses - currentExpenses) > currentExpenses * 0.1;
      
      if (incomeChanged || expensesChanged) {
        // Regenerate historical data with new baseline
        const updatedData = {
          ...parsed,
          monthlyIncome: currentIncome,
          monthlyExpenses: currentExpenses,
          monthlySavings: currentSavings,
          historicalData: generateRealisticHistoricalData(currentIncome, currentExpenses),
          spendingCategories: getDefaultSpendingCategories(currentExpenses),
          lastUpdated: new Date(),
        };
        
        localStorage.setItem(storageKey, JSON.stringify(updatedData));
        return updatedData;
      }
      
      return parsed;
    } catch (error) {
      console.warn('Failed to parse stored financial data, generating new data');
    }
  }
  
  // Generate new data
  const newData: UserFinancialData = {
    monthlyIncome: currentIncome,
    monthlyExpenses: currentExpenses,
    monthlySavings: currentSavings,
    spendingCategories: getDefaultSpendingCategories(currentExpenses),
    historicalData: generateRealisticHistoricalData(currentIncome, currentExpenses),
    lastUpdated: new Date(),
  };
  
  localStorage.setItem(storageKey, JSON.stringify(newData));
  return newData;
};

// Update user's spending categories
export const updateUserSpendingCategories = (
  userId: string,
  categories: SpendingCategory[]
): void => {
  const storageKey = getUserStorageKey(userId, 'financial_data');
  const stored = localStorage.getItem(storageKey);
  
  if (stored) {
    try {
      const data = JSON.parse(stored);
      data.spendingCategories = categories;
      data.lastUpdated = new Date();
      localStorage.setItem(storageKey, JSON.stringify(data));
    } catch (error) {
      console.error('Failed to update spending categories', error);
    }
  }
};

// Add new historical data point (for when user updates their financial info)
export const addHistoricalDataPoint = (
  userId: string,
  income: number,
  expenses: number,
  savings: number
): void => {
  const storageKey = getUserStorageKey(userId, 'financial_data');
  const stored = localStorage.getItem(storageKey);
  
  if (stored) {
    try {
      const data = JSON.parse(stored);
      const newPoint: HistoricalDataPoint = {
        month: new Date().toLocaleDateString('en-US', { month: 'short' }),
        income,
        expenses,
        savings,
        date: new Date(),
      };
      
      // Keep only last 12 months
      data.historicalData.push(newPoint);
      if (data.historicalData.length > 12) {
        data.historicalData = data.historicalData.slice(-12);
      }
      
      data.lastUpdated = new Date();
      localStorage.setItem(storageKey, JSON.stringify(data));
    } catch (error) {
      console.error('Failed to add historical data point', error);
    }
  }
};

// Calculate financial health score based on multiple factors
export const calculateFinancialHealthScore = (
  savingsRate: number,
  incomeExpenseRatio: number,
  workingMembersRatio: number,
  historicalConsistency: number = 85
): number => {
  let score = 0;
  
  // Savings Rate (40 points max)
  if (savingsRate >= 20) score += 40;
  else if (savingsRate >= 15) score += 30;
  else if (savingsRate >= 10) score += 20;
  else if (savingsRate >= 5) score += 10;
  else if (savingsRate > 0) score += 5;
  
  // Income vs Expenses ratio (30 points max)
  if (incomeExpenseRatio >= 1.5) score += 30;
  else if (incomeExpenseRatio >= 1.3) score += 25;
  else if (incomeExpenseRatio >= 1.2) score += 20;
  else if (incomeExpenseRatio >= 1.1) score += 15;
  else if (incomeExpenseRatio >= 1.0) score += 10;
  
  // Working members contribution (20 points max)
  if (workingMembersRatio >= 0.5) score += 20;
  else if (workingMembersRatio >= 0.33) score += 15;
  else if (workingMembersRatio >= 0.25) score += 10;
  else score += 5;
  
  // Historical consistency (10 points max)
  score += Math.round(historicalConsistency / 10);
  
  return Math.min(score, 100);
};

export type { HistoricalDataPoint, SpendingCategory, UserFinancialData };