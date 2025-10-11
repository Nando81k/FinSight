import { useState, useEffect } from 'react';
import { ChartBarIcon, ArrowTrendingUpIcon, ArrowTrendingDownIcon, CurrencyDollarIcon, BanknotesIcon, ChartPieIcon, UserGroupIcon, SparklesIcon, HandThumbUpIcon, ExclamationTriangleIcon, FireIcon } from '@heroicons/react/24/outline';
import { useAuth } from '../context/AuthContext';
import { 
  getUserFinancialData, 
  calculateFinancialHealthScore,
  type HistoricalDataPoint,
  type SpendingCategory 
} from '../services/financialDataService';
import { getUserGoals } from '../services/goalService';
import { Line, Doughnut, Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  BarElement,
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  BarElement
);

interface AnalyticsData {
  totalMembers: number;
  workingMembers: number;
  monthlyNetIncome: number;
  monthlyExpenses: number;
  monthlySavings: number;
  savingsRate: number;
}

interface EnhancedAnalyticsProps {
  householdData: AnalyticsData;
}

// Helper function to get recommended budget percentages based on 50/30/20 rule and best practices
const getRecommendedBudgetPercentage = (categoryName: string): number => {
  const recommendations: Record<string, number> = {
    'Housing': 25,        // Rent/mortgage, utilities
    'Food & Dining': 12,  // Groceries and dining out
    'Transportation': 10, // Car payments, gas, maintenance
    'Utilities': 8,       // Phone, internet, electricity
    'Healthcare': 8,      // Insurance, medical expenses
    'Entertainment': 6,   // Movies, hobbies, subscriptions
    'Shopping': 5,        // Clothing, personal items
    'Insurance': 4,       // Life, auto, home insurance
    'Education': 3,       // Courses, books, training
    'Other': 19          // Miscellaneous expenses
  };
  
  return recommendations[categoryName] || 5; // Default 5% for unknown categories
};

export default function EnhancedAnalytics({ householdData }: EnhancedAnalyticsProps) {
  const [selectedTimeframe, setSelectedTimeframe] = useState('6months');
  const { user } = useAuth();
  const [financialData, setFinancialData] = useState<{
    historicalData: HistoricalDataPoint[];
    spendingCategories: SpendingCategory[];
  } | null>(null);

  useEffect(() => {
    if (user?.id) {
      const userData = getUserFinancialData(
        user.id.toString(),
        householdData.monthlyNetIncome,
        householdData.monthlyExpenses,
        householdData.monthlySavings
      );
      setFinancialData({
        historicalData: userData.historicalData,
        spendingCategories: userData.spendingCategories
      });
    }
  }, [user?.id, householdData.monthlyNetIncome, householdData.monthlyExpenses, householdData.monthlySavings]);

  // Fallback to basic data if user data not loaded yet
  const historicalData = financialData?.historicalData || [];
  const chartData = {
    labels: historicalData.map(d => d.month),
    income: historicalData.map(d => d.income),
    expenses: historicalData.map(d => d.expenses),
    savings: historicalData.map(d => d.savings)
  };

  // Financial Health Score calculation using service
  const incomeExpenseRatio = householdData.monthlyNetIncome / householdData.monthlyExpenses;
  const workingRatio = householdData.workingMembers / householdData.totalMembers;
  const financialHealthScore = calculateFinancialHealthScore(
    householdData.savingsRate,
    incomeExpenseRatio,
    workingRatio
  );

  const getHealthScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    if (score >= 40) return 'text-orange-600';
    return 'text-red-600';
  };

  const getHealthScoreBg = (score: number) => {
    if (score >= 80) return 'bg-green-500';
    if (score >= 60) return 'bg-yellow-500';
    if (score >= 40) return 'bg-orange-500';
    return 'bg-red-500';
  };

  // Spending trends chart data
  const trendData = {
    labels: chartData.labels,
    datasets: [
      {
        label: 'Income',
        data: chartData.income,
        borderColor: 'rgb(34, 197, 94)',
        backgroundColor: 'rgba(34, 197, 94, 0.1)',
        tension: 0.4,
      },
      {
        label: 'Expenses',
        data: chartData.expenses,
        borderColor: 'rgb(239, 68, 68)',
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        tension: 0.4,
      },
      {
        label: 'Savings',
        data: chartData.savings,
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        tension: 0.4,
      },
    ],
  };

  // Category breakdown using user data or defaults
  const spendingCategories = financialData?.spendingCategories || [];
  const categoryData = {
    labels: spendingCategories.map(cat => cat.name),
    datasets: [
      {
        data: spendingCategories.map(cat => cat.percentage),
        backgroundColor: spendingCategories.map(cat => cat.color),
        borderWidth: 0,
      },
    ],
  };

  // Savings goal progress using real goal data
  const userGoals = user?.id ? getUserGoals(user.id.toString()) : [];
  const savingsGoalData = {
    labels: userGoals.length > 0 ? userGoals.map(goal => goal.title) : ['No Goals Set'],
    datasets: [
      {
        label: 'Progress (%)',
        data: userGoals.length > 0 
          ? userGoals.map(goal => Math.min((goal.currentAmount / goal.targetAmount) * 100, 100))
          : [0],
        backgroundColor: 'rgba(59, 130, 246, 0.6)',
        borderColor: 'rgb(59, 130, 246)',
        borderWidth: 1,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom' as const,
      },
    },
  };

  return (
    <div className="space-y-6">
      {/* Financial Health Score */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-600 transition-colors duration-200">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2 mb-1">
              <ChartBarIcon className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              Financial Health Score
            </h3>
            <p className="text-sm text-gray-600">
              Comprehensive assessment of your household's financial wellness
            </p>
          </div>
          <div className="text-right">
            <div className={`text-4xl font-bold ${getHealthScoreColor(financialHealthScore)} mb-1`}>
              {financialHealthScore}/100
            </div>
            <div className={`text-sm font-medium px-3 py-1 rounded-full flex items-center gap-1 ${
              financialHealthScore >= 80 ? 'bg-green-100 text-green-700' :
              financialHealthScore >= 60 ? 'bg-yellow-100 text-yellow-700' :
              financialHealthScore >= 40 ? 'bg-orange-100 text-orange-700' :
              'bg-red-100 text-red-700'
            }`}>
              {financialHealthScore >= 80 ? (
                <><SparklesIcon className="h-4 w-4" /> Excellent</>
              ) : financialHealthScore >= 60 ? (
                <><HandThumbUpIcon className="h-4 w-4" /> Good</>
              ) : financialHealthScore >= 40 ? (
                <><ExclamationTriangleIcon className="h-4 w-4" /> Fair</>
              ) : (
                <><FireIcon className="h-4 w-4" /> Needs Attention</>
              )}
            </div>
          </div>
        </div>
        
        <div className="w-full bg-gray-200 rounded-full h-4 mb-6 shadow-inner">
          <div
            className={`h-4 rounded-full transition-all duration-500 shadow-sm ${getHealthScoreBg(financialHealthScore)}`}
            style={{ width: `${financialHealthScore}%` }}
          />
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl border border-blue-200">
            <div className="text-sm font-medium text-blue-700 mb-1 flex items-center justify-center gap-1">
              <BanknotesIcon className="h-4 w-4" /> Savings Rate
            </div>
            <div className={`text-2xl font-bold mb-1 ${
              householdData.savingsRate >= 20 ? 'text-green-600' :
              householdData.savingsRate >= 10 ? 'text-yellow-600' :
              householdData.savingsRate >= 5 ? 'text-orange-600' : 'text-red-600'
            }`}>
              {householdData.savingsRate.toFixed(1)}%
            </div>
            <div className="text-xs text-blue-600 font-medium">
              {householdData.savingsRate >= 20 ? 'Excellent savings!' :
               householdData.savingsRate >= 10 ? 'Good progress' :
               householdData.savingsRate >= 5 ? 'Room to improve' : 'Build emergency fund'}
            </div>
          </div>
          <div className="text-center p-4 bg-gradient-to-br from-green-50 to-green-100 rounded-xl border border-green-200">
            <div className="text-sm font-medium text-green-700 mb-1 flex items-center justify-center gap-1">
              <ChartPieIcon className="h-4 w-4" /> Income Coverage
            </div>
            <div className={`text-2xl font-bold mb-1 ${
              (householdData.monthlyNetIncome / householdData.monthlyExpenses) >= 1.5 ? 'text-green-600' :
              (householdData.monthlyNetIncome / householdData.monthlyExpenses) >= 1.2 ? 'text-yellow-600' :
              (householdData.monthlyNetIncome / householdData.monthlyExpenses) >= 1.0 ? 'text-orange-600' : 'text-red-600'
            }`}>
              {(householdData.monthlyNetIncome / householdData.monthlyExpenses).toFixed(1)}x
            </div>
            <div className="text-xs text-green-600 font-medium">
              {(householdData.monthlyNetIncome / householdData.monthlyExpenses) >= 1.5 ? 'Strong buffer' :
               (householdData.monthlyNetIncome / householdData.monthlyExpenses) >= 1.2 ? 'Good cushion' :
               (householdData.monthlyNetIncome / householdData.monthlyExpenses) >= 1.0 ? 'Tight budget' : 'Overspending'}
            </div>
          </div>
          <div className="text-center p-4 bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl border border-purple-200">
            <div className="text-sm font-medium text-purple-700 mb-1 flex items-center justify-center gap-1">
              <UserGroupIcon className="h-4 w-4" /> Workforce
            </div>
            <div className={`text-2xl font-bold mb-1 ${
              (householdData.workingMembers / householdData.totalMembers) >= 0.5 ? 'text-green-600' :
              (householdData.workingMembers / householdData.totalMembers) >= 0.33 ? 'text-yellow-600' :
              'text-orange-600'
            }`}>
              {householdData.workingMembers}/{householdData.totalMembers}
            </div>
            <div className="text-xs text-purple-600 font-medium">
              {(householdData.workingMembers / householdData.totalMembers) >= 0.5 ? 'Strong contribution' :
               (householdData.workingMembers / householdData.totalMembers) >= 0.33 ? 'Moderate support' :
               'Limited earners'}
            </div>
          </div>
        </div>
      </div>

      {/* Spending Trends */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-600 transition-colors duration-200">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Spending Trends Simulation</h3>
          <select
            value={selectedTimeframe}
            onChange={(e) => setSelectedTimeframe(e.target.value)}
            className="border border-gray-300 dark:border-gray-600 rounded-md px-3 py-1 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white transition-colors duration-200"
          >
            <option value="3months">Last 3 months</option>
            <option value="6months">Last 6 months</option>
            <option value="12months">Last 12 months</option>
          </select>
        </div>
        
        <div className="h-64">
          <Line data={trendData} options={chartOptions} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Enhanced Category Breakdown */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-600 transition-colors duration-200">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Expense Advisory Analysis</h3>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Chart */}
            <div className="h-64">
              <Doughnut 
                data={categoryData} 
                options={{
                  ...chartOptions,
                  plugins: {
                    ...chartOptions.plugins,
                    legend: {
                      display: false, // We'll create custom legend
                    },
                    tooltip: {
                      callbacks: {
                        label: function(context: any) {
                          const category = spendingCategories[context.dataIndex];
                          if (!category) return '';
                          const amount = Math.round((category.percentage / 100) * householdData.monthlyExpenses);
                          return `${category.name}: $${amount.toLocaleString()} (${category.percentage}%)`;
                        }
                      }
                    }
                  },
                }} 
              />
            </div>

            {/* Detailed Category List */}
            <div className="space-y-3 h-64 overflow-y-auto pr-2">
              {spendingCategories.map((category, index) => {
                const actualAmount = Math.round((category.percentage / 100) * householdData.monthlyExpenses);
                const recommendedPercentage = getRecommendedBudgetPercentage(category.name);
                const recommendedAmount = Math.round((recommendedPercentage / 100) * householdData.monthlyExpenses);
                const isOverBudget = category.percentage > recommendedPercentage;
                const variance = actualAmount - recommendedAmount;
                
                return (
                  <div key={index} className={`relative overflow-hidden p-4 rounded-xl border transition-all duration-200 hover:shadow-md ${
                    isOverBudget 
                      ? 'bg-gradient-to-r from-red-50 to-red-25 border-red-200 hover:border-red-300' 
                      : 'bg-gradient-to-r from-green-50 to-green-25 border-green-200 hover:border-green-300'
                  }`}>
                    {/* Status indicator strip */}
                    <div className={`absolute left-0 top-0 w-1 h-full ${
                      isOverBudget ? 'bg-red-400' : 'bg-green-400'
                    }`} />
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div 
                          className="w-3 h-3 rounded-full shadow-sm"
                          style={{ backgroundColor: category.color }}
                        />
                        <div>
                          <div className="flex items-center gap-2">
                            <span className={`font-semibold text-base ${
                              isOverBudget ? 'text-red-900' : 'text-green-900'
                            }`}>
                              {category.name}
                            </span>
                            {isOverBudget && (
                              <span className="px-2 py-0.5 text-xs font-bold text-red-600 bg-red-100 rounded-full">
                                OVER BUDGET
                              </span>
                            )}
                          </div>
                          <div className="text-sm text-gray-600 mt-1">
                            <span className="text-gray-500">Target:</span> 
                            <span className="font-medium text-gray-700 ml-1">
                              ${recommendedAmount.toLocaleString()} ({recommendedPercentage}%)
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="text-right">
                        <div className={`font-bold text-xl tracking-tight ${
                          isOverBudget ? 'text-red-700' : 'text-green-700'
                        }`}>
                          ${actualAmount.toLocaleString()}
                        </div>
                        <div className="text-sm space-y-0.5">
                          <div className="text-gray-500">{category.percentage}% of total</div>
                          <div className={`font-medium px-2 py-0.5 rounded-md text-xs ${
                            isOverBudget 
                              ? 'text-red-700 bg-red-100' 
                              : 'text-green-700 bg-green-100'
                          }`}>
                            {isOverBudget ? `+$${Math.abs(variance).toLocaleString()}` : `-$${Math.abs(variance).toLocaleString()}`}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
              
              {/* Budget Health Summary */}
              <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                <div className="text-sm font-medium text-blue-900 mb-2">Budget Health Summary</div>
                <div className="text-xs text-blue-700 space-y-1">
                  {(() => {
                    const overBudgetCategories = spendingCategories.filter(cat => 
                      cat.percentage > getRecommendedBudgetPercentage(cat.name)
                    );
                    const totalOverspend = overBudgetCategories.reduce((sum, cat) => {
                      const actual = (cat.percentage / 100) * householdData.monthlyExpenses;
                      const recommended = (getRecommendedBudgetPercentage(cat.name) / 100) * householdData.monthlyExpenses;
                      return sum + (actual - recommended);
                    }, 0);
                    
                    if (overBudgetCategories.length === 0) {
                      return <div>✅ All categories within recommended budgets!</div>;
                    } else {
                      return (
                        <>
                          <div>⚠️ {overBudgetCategories.length} categories over budget</div>
                          <div>Total overspend: ${Math.round(totalOverspend).toLocaleString()}/month</div>
                        </>
                      );
                    }
                  })()}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Savings Goals Progress */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-600 transition-colors duration-200">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Savings Goals Progress</h3>
          <div className="h-64">
            <Bar 
              data={savingsGoalData} 
              options={{
                ...chartOptions,
                scales: {
                  y: {
                    beginAtZero: true,
                    max: 100,
                    ticks: {
                      callback: function(value) {
                        return value + '%';
                      }
                    }
                  }
                }
              }} 
            />
          </div>
        </div>
      </div>

      {/* Key Insights */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-600 transition-colors duration-200">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Key Insights (Targets)</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="flex items-center p-4 bg-green-50 rounded-lg">
            <ArrowTrendingUpIcon className="h-8 w-8 text-green-600 mr-3" />
            <div>
              <div className="text-sm font-medium text-green-800">Best Month</div>
              <div className="text-lg font-bold text-green-900">
                ${chartData.savings.length > 0 ? Math.max(...chartData.savings).toFixed(0) : '0'} saved
              </div>
            </div>
          </div>
          
          <div className="flex items-center p-4 bg-blue-50 rounded-lg">
            <CurrencyDollarIcon className="h-8 w-8 text-blue-600 mr-3" />
            <div>
              <div className="text-sm font-medium text-blue-800">Avg Monthly Savings</div>
              <div className="text-lg font-bold text-blue-900">
                ${chartData.savings.length > 0 ? (chartData.savings.reduce((a: number, b: number) => a + b) / chartData.savings.length).toFixed(0) : '0'}
              </div>
            </div>
          </div>
          
          <div className="flex items-center p-4 bg-purple-50 rounded-lg">
            <ChartBarIcon className="h-8 w-8 text-purple-600 mr-3" />
            <div>
              <div className="text-sm font-medium text-purple-800">Savings Consistency</div>
              <div className="text-lg font-bold text-purple-900">
                {(() => {
                  if (chartData.savings.length < 2 || householdData.monthlySavings === 0) return '0';
                  const variance = chartData.savings.reduce((acc, curr, idx) => {
                    if (idx === 0) return acc;
                    const prev = chartData.savings[idx - 1];
                    return acc + Math.abs(curr - (prev || 0));
                  }, 0);
                  const consistencyScore = Math.max(0, Math.min(100, Math.round(
                    100 - (variance / (chartData.savings.length - 1) / householdData.monthlySavings * 100)
                  )));
                  return consistencyScore;
                })()}%
              </div>
            </div>
          </div>
          
          <div className="flex items-center p-4 bg-yellow-50 rounded-lg">
            <ArrowTrendingDownIcon className="h-8 w-8 text-yellow-600 mr-3" />
            <div>
              <div className="text-sm font-medium text-yellow-800">Expense Trend</div>
              <div className="text-lg font-bold text-yellow-900">
                {(() => {
                  if (chartData.expenses.length < 2) return '0.0';
                  const current = chartData.expenses[chartData.expenses.length - 1];
                  const previous = chartData.expenses[chartData.expenses.length - 2];
                  if (!current || !previous || previous === 0) return '0.0';
                  return ((current - previous) / previous * 100).toFixed(1);
                })()}% vs last month
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}