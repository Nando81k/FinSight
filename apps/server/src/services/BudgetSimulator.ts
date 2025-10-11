import { createLogger } from '../utils/logger';

const logger = createLogger('budget-simulator');

export type BudgetCategoryType = 'income' | 'expense';
export type BudgetFrequency = 'monthly' | 'annual' | 'weekly' | 'biweekly';

export interface BudgetCategory {
  id: string;
  name: string;
  type: BudgetCategoryType;
  isEssential?: boolean; // For expenses: rent, utilities vs entertainment
  isFixed?: boolean; // Fixed vs variable amount
  description?: string;
}

export interface BudgetItem {
  id: string;
  categoryId: string;
  name: string;
  amount: number;
  frequency: BudgetFrequency;
  description?: string;
  tags?: string[];
}

export interface BudgetScenario {
  id: string;
  name: string;
  description?: string;
  categories: BudgetCategory[];
  items: BudgetItem[];
  savingsGoals?: SavingsGoal[];
  createdAt: string;
  updatedAt: string;
}

export interface SavingsGoal {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  targetDate?: string;
  priority: 'low' | 'medium' | 'high';
  description?: string;
}

export interface BudgetAnalysis {
  totalIncome: {
    monthly: number;
    annual: number;
  };
  totalExpenses: {
    monthly: number;
    annual: number;
    essential: number;
    nonEssential: number;
    fixed: number;
    variable: number;
  };
  netIncome: {
    monthly: number;
    annual: number;
  };
  savingsRate: number; // Percentage
  categoryBreakdown: {
    categoryId: string;
    categoryName: string;
    monthlyTotal: number;
    annualTotal: number;
    percentage: number;
    items: {
      id: string;
      name: string;
      monthlyAmount: number;
      annualAmount: number;
    }[];
  }[];
  savingsGoalsAnalysis: {
    totalGoalAmount: number;
    totalCurrentAmount: number;
    monthlyRequiredSavings: number;
    feasibilityScore: number; // 0-100, how achievable goals are
    goalProgress: {
      goalId: string;
      goalName: string;
      progress: number; // Percentage
      monthlyRequirement: number;
      targetDate?: string;
      onTrack: boolean;
    }[];
  };
  recommendations: BudgetRecommendation[];
}

export interface BudgetRecommendation {
  type: 'reduce_expense' | 'increase_income' | 'adjust_goal' | 'optimize_savings';
  priority: 'low' | 'medium' | 'high';
  title: string;
  description: string;
  potentialSavings?: number;
  categoryId?: string;
  goalId?: string;
}

export interface BudgetComparison {
  scenarios: BudgetScenario[];
  comparison: {
    scenarioId: string;
    scenarioName: string;
    monthlyIncome: number;
    monthlyExpenses: number;
    monthlyNet: number;
    savingsRate: number;
    essentialExpenseRatio: number;
  }[];
  bestScenario: {
    highestSavingsRate: string;
    lowestExpenseRatio: string;
    highestNetIncome: string;
  };
  insights: string[];
}

export class BudgetSimulator {
  
  /**
   * Default budget categories for quick setup
   */
  static getDefaultCategories(): BudgetCategory[] {
    return [
      // Income Categories
      { id: 'income-salary', name: 'Salary', type: 'income' },
      { id: 'income-freelance', name: 'Freelance/Consulting', type: 'income' },
      { id: 'income-investment', name: 'Investment Income', type: 'income' },
      { id: 'income-rental', name: 'Rental Income', type: 'income' },
      { id: 'income-other', name: 'Other Income', type: 'income' },
      
      // Essential Expense Categories
      { id: 'housing-rent', name: 'Rent/Mortgage', type: 'expense', isEssential: true, isFixed: true },
      { id: 'housing-utilities', name: 'Utilities', type: 'expense', isEssential: true, isFixed: false },
      { id: 'housing-insurance', name: 'Home Insurance', type: 'expense', isEssential: true, isFixed: true },
      { id: 'transportation-car', name: 'Car Payment', type: 'expense', isEssential: true, isFixed: true },
      { id: 'transportation-fuel', name: 'Gas/Fuel', type: 'expense', isEssential: true, isFixed: false },
      { id: 'transportation-insurance', name: 'Auto Insurance', type: 'expense', isEssential: true, isFixed: true },
      { id: 'transportation-public', name: 'Public Transit', type: 'expense', isEssential: true, isFixed: false },
      { id: 'food-groceries', name: 'Groceries', type: 'expense', isEssential: true, isFixed: false },
      { id: 'healthcare-insurance', name: 'Health Insurance', type: 'expense', isEssential: true, isFixed: true },
      { id: 'healthcare-medical', name: 'Medical Expenses', type: 'expense', isEssential: true, isFixed: false },
      { id: 'debt-minimum', name: 'Minimum Debt Payments', type: 'expense', isEssential: true, isFixed: true },
      
      // Non-Essential Expense Categories
      { id: 'food-dining', name: 'Dining Out', type: 'expense', isEssential: false, isFixed: false },
      { id: 'entertainment-streaming', name: 'Streaming Services', type: 'expense', isEssential: false, isFixed: true },
      { id: 'entertainment-hobbies', name: 'Hobbies', type: 'expense', isEssential: false, isFixed: false },
      { id: 'shopping-clothing', name: 'Clothing', type: 'expense', isEssential: false, isFixed: false },
      { id: 'shopping-personal', name: 'Personal Care', type: 'expense', isEssential: false, isFixed: false },
      { id: 'travel-vacation', name: 'Travel/Vacation', type: 'expense', isEssential: false, isFixed: false },
      { id: 'fitness-gym', name: 'Gym/Fitness', type: 'expense', isEssential: false, isFixed: true },
      { id: 'education-courses', name: 'Education/Courses', type: 'expense', isEssential: false, isFixed: false },
      { id: 'gifts-charity', name: 'Gifts/Charity', type: 'expense', isEssential: false, isFixed: false },
      
      // Savings/Investment Categories
      { id: 'savings-emergency', name: 'Emergency Fund', type: 'expense', isEssential: true, isFixed: false },
      { id: 'savings-retirement', name: 'Retirement Savings', type: 'expense', isEssential: true, isFixed: false },
      { id: 'savings-investment', name: 'Investment Contributions', type: 'expense', isEssential: false, isFixed: false },
    ];
  }
  
  /**
   * Convert any frequency to monthly amount
   */
  static convertToMonthly(amount: number, frequency: BudgetFrequency): number {
    switch (frequency) {
      case 'weekly': return amount * 52 / 12;
      case 'biweekly': return amount * 26 / 12;
      case 'monthly': return amount;
      case 'annual': return amount / 12;
      default: return amount;
    }
  }
  
  /**
   * Convert monthly amount to any frequency
   */
  static convertFromMonthly(monthlyAmount: number, targetFrequency: BudgetFrequency): number {
    switch (targetFrequency) {
      case 'weekly': return monthlyAmount * 12 / 52;
      case 'biweekly': return monthlyAmount * 12 / 26;
      case 'monthly': return monthlyAmount;
      case 'annual': return monthlyAmount * 12;
      default: return monthlyAmount;
    }
  }
  
  /**
   * Analyze a budget scenario
   */
  static analyzeBudget(scenario: BudgetScenario): BudgetAnalysis {
    logger.info('Analyzing budget scenario', { scenarioId: scenario.id, scenarioName: scenario.name });
    
    // Calculate totals
    const incomeItems = scenario.items.filter(item => {
      const category = scenario.categories.find(cat => cat.id === item.categoryId);
      return category?.type === 'income';
    });
    
    const expenseItems = scenario.items.filter(item => {
      const category = scenario.categories.find(cat => cat.id === item.categoryId);
      return category?.type === 'expense';
    });
    
    const totalMonthlyIncome = incomeItems.reduce((sum, item) => 
      sum + BudgetSimulator.convertToMonthly(item.amount, item.frequency), 0);
    
    const totalMonthlyExpenses = expenseItems.reduce((sum, item) => 
      sum + BudgetSimulator.convertToMonthly(item.amount, item.frequency), 0);
    
    const essentialExpenses = expenseItems.filter(item => {
      const category = scenario.categories.find(cat => cat.id === item.categoryId);
      return category?.isEssential;
    }).reduce((sum, item) => 
      sum + BudgetSimulator.convertToMonthly(item.amount, item.frequency), 0);
    
    const fixedExpenses = expenseItems.filter(item => {
      const category = scenario.categories.find(cat => cat.id === item.categoryId);
      return category?.isFixed;
    }).reduce((sum, item) => 
      sum + BudgetSimulator.convertToMonthly(item.amount, item.frequency), 0);
    
    const monthlyNet = totalMonthlyIncome - totalMonthlyExpenses;
    const savingsRate = totalMonthlyIncome > 0 ? (monthlyNet / totalMonthlyIncome) * 100 : 0;
    
    // Category breakdown
    const categoryMap = new Map<string, {
      category: BudgetCategory;
      items: BudgetItem[];
      total: number;
    }>();
    
    scenario.items.forEach(item => {
      const category = scenario.categories.find(cat => cat.id === item.categoryId);
      if (category) {
        if (!categoryMap.has(category.id)) {
          categoryMap.set(category.id, {
            category,
            items: [],
            total: 0
          });
        }
        
        const entry = categoryMap.get(category.id)!;
        entry.items.push(item);
        entry.total += BudgetSimulator.convertToMonthly(item.amount, item.frequency);
      }
    });
    
    const categoryBreakdown = Array.from(categoryMap.values()).map(entry => ({
      categoryId: entry.category.id,
      categoryName: entry.category.name,
      monthlyTotal: entry.total,
      annualTotal: entry.total * 12,
      percentage: totalMonthlyIncome > 0 ? (entry.total / totalMonthlyIncome) * 100 : 0,
      items: entry.items.map(item => ({
        id: item.id,
        name: item.name,
        monthlyAmount: BudgetSimulator.convertToMonthly(item.amount, item.frequency),
        annualAmount: BudgetSimulator.convertToMonthly(item.amount, item.frequency) * 12
      }))
    }));
    
    // Savings goals analysis
    const savingsGoalsAnalysis = BudgetSimulator.analyzeSavingsGoals(
      scenario.savingsGoals || [], 
      monthlyNet
    );
    
    // Generate recommendations
    const recommendations = BudgetSimulator.generateRecommendations(
      totalMonthlyIncome,
      totalMonthlyExpenses,
      essentialExpenses,
      monthlyNet,
      categoryBreakdown,
      scenario.savingsGoals || []
    );
    
    const analysis: BudgetAnalysis = {
      totalIncome: {
        monthly: totalMonthlyIncome,
        annual: totalMonthlyIncome * 12
      },
      totalExpenses: {
        monthly: totalMonthlyExpenses,
        annual: totalMonthlyExpenses * 12,
        essential: essentialExpenses,
        nonEssential: totalMonthlyExpenses - essentialExpenses,
        fixed: fixedExpenses,
        variable: totalMonthlyExpenses - fixedExpenses
      },
      netIncome: {
        monthly: monthlyNet,
        annual: monthlyNet * 12
      },
      savingsRate,
      categoryBreakdown,
      savingsGoalsAnalysis,
      recommendations
    };
    
    logger.info('Budget analysis completed', {
      scenarioId: scenario.id,
      monthlyIncome: totalMonthlyIncome,
      monthlyExpenses: totalMonthlyExpenses,
      savingsRate,
      recommendationCount: recommendations.length
    });
    
    return analysis;
  }
  
  /**
   * Analyze savings goals feasibility
   */
  private static analyzeSavingsGoals(goals: SavingsGoal[], availableMonthlyNet: number): BudgetAnalysis['savingsGoalsAnalysis'] {
    if (goals.length === 0) {
      return {
        totalGoalAmount: 0,
        totalCurrentAmount: 0,
        monthlyRequiredSavings: 0,
        feasibilityScore: 100,
        goalProgress: []
      };
    }
    
    const totalGoalAmount = goals.reduce((sum, goal) => sum + goal.targetAmount, 0);
    const totalCurrentAmount = goals.reduce((sum, goal) => sum + goal.currentAmount, 0);
    
    let totalMonthlyRequirement = 0;
    const goalProgress = goals.map(goal => {
      const remaining = goal.targetAmount - goal.currentAmount;
      let monthlyRequirement = 0;
      
      if (goal.targetDate && remaining > 0) {
        const targetDate = new Date(goal.targetDate);
        const now = new Date();
        const monthsRemaining = Math.max(1, Math.ceil((targetDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24 * 30)));
        monthlyRequirement = remaining / monthsRemaining;
      } else if (remaining > 0) {
        // Default to 5 years if no target date
        monthlyRequirement = remaining / 60;
      }
      
      totalMonthlyRequirement += monthlyRequirement;
      
      const progress = goal.targetAmount > 0 ? (goal.currentAmount / goal.targetAmount) * 100 : 100;
      const onTrack = monthlyRequirement <= availableMonthlyNet * 0.3; // Conservative 30% allocation
      
      return {
        goalId: goal.id,
        goalName: goal.name,
        progress,
        monthlyRequirement,
        ...(goal.targetDate && { targetDate: goal.targetDate }),
        onTrack
      };
    });
    
    const feasibilityScore = availableMonthlyNet > 0 
      ? Math.min(100, Math.max(0, 100 - ((totalMonthlyRequirement - availableMonthlyNet) / availableMonthlyNet) * 100))
      : 0;
    
    return {
      totalGoalAmount,
      totalCurrentAmount,
      monthlyRequiredSavings: totalMonthlyRequirement,
      feasibilityScore,
      goalProgress
    };
  }
  
  /**
   * Generate budget recommendations
   */
  private static generateRecommendations(
    monthlyIncome: number,
    monthlyExpenses: number,
    essentialExpenses: number,
    monthlyNet: number,
    categoryBreakdown: BudgetAnalysis['categoryBreakdown'],
    savingsGoals: SavingsGoal[]
  ): BudgetRecommendation[] {
    const recommendations: BudgetRecommendation[] = [];
    
    // Savings rate recommendations
    const savingsRate = monthlyIncome > 0 ? (monthlyNet / monthlyIncome) * 100 : 0;
    
    if (savingsRate < 10) {
      recommendations.push({
        type: 'reduce_expense',
        priority: 'high',
        title: 'Increase Savings Rate',
        description: `Your savings rate is ${savingsRate.toFixed(1)}%. Aim for at least 10-20% by reducing non-essential expenses.`,
        potentialSavings: monthlyIncome * 0.15 - monthlyNet
      });
    } else if (savingsRate < 20) {
      recommendations.push({
        type: 'optimize_savings',
        priority: 'medium',
        title: 'Good Savings Progress',
        description: `Your ${savingsRate.toFixed(1)}% savings rate is good. Consider targeting 20% for excellent financial health.`
      });
    }
    
    // Essential expenses ratio
    const essentialRatio = monthlyIncome > 0 ? (essentialExpenses / monthlyIncome) * 100 : 0;
    if (essentialRatio > 70) {
      recommendations.push({
        type: 'reduce_expense',
        priority: 'high',
        title: 'High Essential Expenses',
        description: `Essential expenses are ${essentialRatio.toFixed(1)}% of income. Consider reducing housing or transportation costs.`,
        potentialSavings: essentialExpenses - (monthlyIncome * 0.6)
      });
    }
    
    // Category-specific recommendations
    categoryBreakdown.forEach(category => {
      const categoryPercentage = category.percentage;
      
      if (category.categoryName.toLowerCase().includes('dining') && categoryPercentage > 15) {
        recommendations.push({
          type: 'reduce_expense',
          priority: 'medium',
          title: 'High Dining Expenses',
          description: `Dining out is ${categoryPercentage.toFixed(1)}% of income. Consider cooking more meals at home.`,
          potentialSavings: category.monthlyTotal * 0.3,
          categoryId: category.categoryId
        });
      }
      
      if (category.categoryName.toLowerCase().includes('entertainment') && categoryPercentage > 10) {
        recommendations.push({
          type: 'reduce_expense',
          priority: 'low',
          title: 'Entertainment Spending',
          description: `Entertainment is ${categoryPercentage.toFixed(1)}% of income. Look for free or low-cost alternatives.`,
          potentialSavings: category.monthlyTotal * 0.2,
          categoryId: category.categoryId
        });
      }
    });
    
    // Income recommendations
    if (monthlyNet < 500) {
      recommendations.push({
        type: 'increase_income',
        priority: 'high',
        title: 'Consider Income Increase',
        description: 'Low net income suggests need for additional income sources or major expense reduction.',
      });
    }
    
    // Savings goals recommendations
    savingsGoals.forEach(goal => {
      if (goal.priority === 'high' && goal.currentAmount < goal.targetAmount * 0.1) {
        recommendations.push({
          type: 'adjust_goal',
          priority: 'medium',
          title: `${goal.name} Goal`,
          description: `Consider increasing contributions to your high-priority goal: ${goal.name}.`,
          goalId: goal.id
        });
      }
    });
    
    return recommendations.slice(0, 8); // Limit to most important recommendations
  }
  
  /**
   * Compare multiple budget scenarios
   */
  static compareScenarios(scenarios: BudgetScenario[]): BudgetComparison {
    logger.info('Comparing budget scenarios', { scenarioCount: scenarios.length });
    
    const comparison = scenarios.map(scenario => {
      const analysis = BudgetSimulator.analyzeBudget(scenario);
      
      return {
        scenarioId: scenario.id,
        scenarioName: scenario.name,
        monthlyIncome: analysis.totalIncome.monthly,
        monthlyExpenses: analysis.totalExpenses.monthly,
        monthlyNet: analysis.netIncome.monthly,
        savingsRate: analysis.savingsRate,
        essentialExpenseRatio: analysis.totalIncome.monthly > 0 
          ? (analysis.totalExpenses.essential / analysis.totalIncome.monthly) * 100 
          : 0
      };
    });
    
    // Find best scenarios
    const bestScenario = {
      highestSavingsRate: comparison.reduce((best, current) => 
        current.savingsRate > best.savingsRate ? current : best).scenarioId,
      lowestExpenseRatio: comparison.reduce((best, current) => 
        current.essentialExpenseRatio < best.essentialExpenseRatio ? current : best).scenarioId,
      highestNetIncome: comparison.reduce((best, current) => 
        current.monthlyNet > best.monthlyNet ? current : best).scenarioId
    };
    
    // Generate insights
    const insights = BudgetSimulator.generateComparisonInsights(comparison);
    
    logger.info('Scenario comparison completed', {
      scenarioCount: scenarios.length,
      bestSavingsRate: comparison.find(c => c.scenarioId === bestScenario.highestSavingsRate)?.savingsRate
    });
    
    return {
      scenarios,
      comparison,
      bestScenario,
      insights
    };
  }
  
  /**
   * Generate insights from scenario comparison
   */
  private static generateComparisonInsights(comparison: BudgetComparison['comparison']): string[] {
    const insights: string[] = [];
    
    if (comparison.length < 2) return insights;
    
    const avgSavingsRate = comparison.reduce((sum, c) => sum + c.savingsRate, 0) / comparison.length;
    const maxSavingsRate = Math.max(...comparison.map(c => c.savingsRate));
    const minSavingsRate = Math.min(...comparison.map(c => c.savingsRate));
    
    insights.push(`Savings rates range from ${minSavingsRate.toFixed(1)}% to ${maxSavingsRate.toFixed(1)}%, averaging ${avgSavingsRate.toFixed(1)}%.`);
    
    const incomeVariation = Math.max(...comparison.map(c => c.monthlyIncome)) - Math.min(...comparison.map(c => c.monthlyIncome));
    if (incomeVariation > 1000) {
      insights.push(`Significant income variation ($${incomeVariation.toLocaleString()}/month) between scenarios.`);
    }
    
    const avgExpenseRatio = comparison.reduce((sum, c) => sum + c.essentialExpenseRatio, 0) / comparison.length;
    if (avgExpenseRatio > 70) {
      insights.push(`Essential expenses are high across scenarios (${avgExpenseRatio.toFixed(1)}% average). Focus on reducing housing or transportation costs.`);
    }
    
    const bestScenario = comparison.reduce((best, current) => 
      current.savingsRate > best.savingsRate ? current : best);
    insights.push(`"${bestScenario.scenarioName}" offers the best savings rate at ${bestScenario.savingsRate.toFixed(1)}%.`);
    
    return insights;
  }
  
  /**
   * Create a sample budget scenario for demonstration
   */
  static createSampleScenario(): BudgetScenario {
    const categories = BudgetSimulator.getDefaultCategories();
    
    const sampleItems: BudgetItem[] = [
      { id: '1', categoryId: 'income-salary', name: 'Software Engineer Salary', amount: 95000, frequency: 'annual' },
      { id: '2', categoryId: 'housing-rent', name: 'Apartment Rent', amount: 2200, frequency: 'monthly' },
      { id: '3', categoryId: 'housing-utilities', name: 'Electricity & Gas', amount: 150, frequency: 'monthly' },
      { id: '4', categoryId: 'transportation-car', name: 'Car Payment', amount: 380, frequency: 'monthly' },
      { id: '5', categoryId: 'transportation-fuel', name: 'Gas', amount: 200, frequency: 'monthly' },
      { id: '6', categoryId: 'transportation-insurance', name: 'Auto Insurance', amount: 125, frequency: 'monthly' },
      { id: '7', categoryId: 'food-groceries', name: 'Groceries', amount: 450, frequency: 'monthly' },
      { id: '8', categoryId: 'food-dining', name: 'Restaurants', amount: 300, frequency: 'monthly' },
      { id: '9', categoryId: 'healthcare-insurance', name: 'Health Insurance', amount: 280, frequency: 'monthly' },
      { id: '10', categoryId: 'entertainment-streaming', name: 'Netflix & Spotify', amount: 25, frequency: 'monthly' },
      { id: '11', categoryId: 'fitness-gym', name: 'Gym Membership', amount: 60, frequency: 'monthly' },
      { id: '12', categoryId: 'savings-emergency', name: 'Emergency Fund', amount: 500, frequency: 'monthly' },
      { id: '13', categoryId: 'savings-retirement', name: '401k Contribution', amount: 950, frequency: 'monthly' },
    ];
    
    const sampleGoals: SavingsGoal[] = [
      {
        id: 'goal-1',
        name: 'Emergency Fund',
        targetAmount: 25000,
        currentAmount: 8500,
        targetDate: '2026-12-31',
        priority: 'high',
        description: '6 months of expenses'
      },
      {
        id: 'goal-2',
        name: 'House Down Payment',
        targetAmount: 80000,
        currentAmount: 15000,
        targetDate: '2027-06-30',
        priority: 'high',
        description: '20% down payment on $400k home'
      },
      {
        id: 'goal-3',
        name: 'Vacation Fund',
        targetAmount: 8000,
        currentAmount: 1200,
        priority: 'medium',
        description: 'European vacation'
      }
    ];
    
    return {
      id: 'sample-budget-2025',
      name: 'Sample Budget 2025',
      description: 'Realistic budget for a software engineer in a major city',
      categories,
      items: sampleItems,
      savingsGoals: sampleGoals,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
  }
}

export default BudgetSimulator;