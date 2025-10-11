// Goal tracking utilities for user-specific goal management

interface Goal {
  id: string;
  title: string;
  description: string;
  targetAmount: number;
  currentAmount: number;
  targetDate: string;
  category: 'emergency' | 'vacation' | 'home' | 'retirement' | 'debt' | 'other';
  isCompleted: boolean;
  createdAt: Date;
}

// Get user-specific localStorage key
const getUserStorageKey = (userId: string, key: string): string => {
  return `user_${userId}_${key}`;
};

// Load user's goals from localStorage
export const getUserGoals = (userId: string): Goal[] => {
  const storageKey = getUserStorageKey(userId, 'goals');
  const stored = localStorage.getItem(storageKey);
  
  if (stored) {
    try {
      const goals = JSON.parse(stored);
      // Convert date strings back to Date objects
      return goals.map((goal: any) => ({
        ...goal,
        createdAt: new Date(goal.createdAt),
      }));
    } catch (error) {
      console.warn('Failed to parse stored goals, returning empty array');
      return [];
    }
  }
  
  return [];
};

// Save user's goals to localStorage
export const saveUserGoals = (userId: string, goals: Goal[]): void => {
  const storageKey = getUserStorageKey(userId, 'goals');
  try {
    localStorage.setItem(storageKey, JSON.stringify(goals));
  } catch (error) {
    console.error('Failed to save goals to localStorage', error);
  }
};

// Add a new goal for the user
export const addUserGoal = (userId: string, goalData: Omit<Goal, 'id' | 'currentAmount' | 'isCompleted' | 'createdAt'>): Goal => {
  const goals = getUserGoals(userId);
  
  const newGoal: Goal = {
    ...goalData,
    id: Date.now().toString(),
    currentAmount: 0,
    isCompleted: false,
    createdAt: new Date(),
  };
  
  const updatedGoals = [...goals, newGoal];
  saveUserGoals(userId, updatedGoals);
  
  return newGoal;
};

// Update a specific goal
export const updateUserGoal = (userId: string, goalId: string, updates: Partial<Goal>): Goal | null => {
  const goals = getUserGoals(userId);
  const goalIndex = goals.findIndex(g => g.id === goalId);
  
  if (goalIndex === -1) {
    return null;
  }
  
  const currentGoal = goals[goalIndex];
  if (!currentGoal) {
    return null;
  }
  
  // Determine completion status
  let isCompleted = currentGoal.isCompleted;
  if (updates.currentAmount !== undefined) {
    isCompleted = updates.currentAmount >= currentGoal.targetAmount;
  }
  
  const updatedGoal: Goal = {
    id: currentGoal.id,
    title: updates.title ?? currentGoal.title,
    description: updates.description ?? currentGoal.description,
    targetAmount: updates.targetAmount ?? currentGoal.targetAmount,
    currentAmount: updates.currentAmount ?? currentGoal.currentAmount,
    targetDate: updates.targetDate ?? currentGoal.targetDate,
    category: updates.category ?? currentGoal.category,
    isCompleted,
    createdAt: currentGoal.createdAt,
  };
  
  goals[goalIndex] = updatedGoal;
  saveUserGoals(userId, goals);
  
  return updatedGoal;
};

// Delete a goal
export const deleteUserGoal = (userId: string, goalId: string): boolean => {
  const goals = getUserGoals(userId);
  const filteredGoals = goals.filter(g => g.id !== goalId);
  
  if (filteredGoals.length === goals.length) {
    return false; // Goal not found
  }
  
  saveUserGoals(userId, filteredGoals);
  return true;
};

// Update goal progress (add/subtract amount)
export const updateGoalProgress = (userId: string, goalId: string, amountChange: number): Goal | null => {
  const goals = getUserGoals(userId);
  const goal = goals.find(g => g.id === goalId);
  
  if (!goal) {
    return null;
  }
  
  const newAmount = Math.max(0, goal.currentAmount + amountChange);
  return updateUserGoal(userId, goalId, { currentAmount: newAmount });
};

// Get goal statistics for dashboard
export const getGoalStatistics = (userId: string) => {
  const goals = getUserGoals(userId);
  
  const totalGoals = goals.length;
  const completedGoals = goals.filter(g => g.isCompleted).length;
  const totalTargetAmount = goals.reduce((sum, g) => sum + g.targetAmount, 0);
  const totalCurrentAmount = goals.reduce((sum, g) => sum + g.currentAmount, 0);
  const overallProgress = totalTargetAmount > 0 ? (totalCurrentAmount / totalTargetAmount) * 100 : 0;
  
  return {
    totalGoals,
    completedGoals,
    totalTargetAmount,
    totalCurrentAmount,
    overallProgress,
    activeGoals: totalGoals - completedGoals,
  };
};

// Helper function to format date for HTML date input
const formatDateForInput = (date: Date): string => {
  return date.toISOString().split('T')[0] as string;
};

// Generate smart goal suggestions based on user's financial data
export const generateGoalSuggestions = (monthlyNetIncome: number, monthlyExpenses: number) => {
  const suggestions: Omit<Goal, 'id' | 'currentAmount' | 'isCompleted' | 'createdAt'>[] = [];
  
  // Emergency fund suggestion (3-6 months of expenses)
  const emergencyFundAmount = monthlyExpenses * 6;
  if (emergencyFundAmount > 0) {
    suggestions.push({
      title: 'Emergency Fund',
      description: '6 months of expenses for financial security',
      targetAmount: emergencyFundAmount,
      targetDate: formatDateForInput(new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)), // 1 year from now
      category: 'emergency',
    });
  }
  
  // Vacation fund suggestion (based on income level)
  const vacationAmount = Math.min(monthlyNetIncome * 2, 8000); // 2 months income or max $8000
  if (vacationAmount >= 2000) {
    suggestions.push({
      title: 'Vacation Fund',
      description: 'Well-deserved vacation with family or friends',
      targetAmount: vacationAmount,
      targetDate: formatDateForInput(new Date(Date.now() + 180 * 24 * 60 * 60 * 1000)), // 6 months from now
      category: 'vacation',
    });
  }
  
  // Home down payment (if income allows)
  if (monthlyNetIncome >= 4000) {
    const homeDownPayment = Math.max(monthlyNetIncome * 12, 30000); // 1 year income or min $30k
    suggestions.push({
      title: 'Home Down Payment',
      description: 'Save for your dream home down payment',
      targetAmount: homeDownPayment,
      targetDate: formatDateForInput(new Date(Date.now() + 1095 * 24 * 60 * 60 * 1000)), // 3 years from now
      category: 'home',
    });
  }
  
  // Retirement boost
  const retirementAmount = monthlyNetIncome * 6; // 6 months of income
  if (retirementAmount >= 5000) {
    suggestions.push({
      title: 'Retirement Boost',
      description: 'Extra contribution to secure your future',
      targetAmount: retirementAmount,
      targetDate: formatDateForInput(new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)), // 1 year from now
      category: 'retirement',
    });
  }
  
  return suggestions;
};

export type { Goal };