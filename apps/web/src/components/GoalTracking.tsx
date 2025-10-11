import { useState, useEffect } from 'react';
import { PlusIcon, TrashIcon, CheckIcon, FlagIcon, CalendarIcon } from '@heroicons/react/24/outline';
import { useAuth } from '../context/AuthContext';
import { 
  getUserGoals, 
  addUserGoal, 
  deleteUserGoal, 
  updateGoalProgress, 
  getGoalStatistics,
  generateGoalSuggestions,
  type Goal 
} from '../services/goalService';
import { getUserFinancialData } from '../services/financialDataService';

interface GoalTrackingProps {
  monthlySavings: number;
}

const goalCategories = [
  { value: 'emergency', label: 'Emergency Fund', icon: '🛡️' },
  { value: 'vacation', label: 'Vacation', icon: '🏖️' },
  { value: 'home', label: 'Home/Property', icon: '🏠' },
  { value: 'retirement', label: 'Retirement', icon: '💰' },
  { value: 'debt', label: 'Debt Payoff', icon: '💳' },
  { value: 'other', label: 'Other', icon: '🎯' },
];

export default function GoalTracking({ monthlySavings }: GoalTrackingProps) {
  const { user } = useAuth();
  const userId = user?.id?.toString() || 'user123'; // Use auth context with fallback
  const [goals, setGoals] = useState<Goal[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState<Omit<Goal, 'id' | 'currentAmount' | 'isCompleted' | 'createdAt'>[]>([]);

  // Load user's goals on component mount
  useEffect(() => {
    const userGoals = getUserGoals(userId);
    setGoals(userGoals);

    // Generate suggestions if user has no goals
    if (userGoals.length === 0) {
      const financialData = getUserFinancialData(userId, 5000, 3000, 2000); // Default financial data
      const goalSuggestions = generateGoalSuggestions(
        financialData.monthlyIncome,
        financialData.monthlyExpenses
      );
      setSuggestions(goalSuggestions);
      setShowSuggestions(true);
    }
  }, [userId]);

  const [showAddForm, setShowAddForm] = useState(false);
  const [newGoal, setNewGoal] = useState({
    title: '',
    description: '',
    targetAmount: '',
    targetDate: '',
    category: 'other' as Goal['category'],
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const calculateProgress = (current: number, target: number) => {
    return Math.min((current / target) * 100, 100);
  };

  const calculateMonthsToGoal = (current: number, target: number, monthlySavings: number) => {
    if (monthlySavings <= 0) return 'N/A';
    const remaining = target - current;
    if (remaining <= 0) return 'Completed';
    return Math.ceil(remaining / monthlySavings);
  };

  const getCategoryIcon = (category: Goal['category']) => {
    return goalCategories.find(cat => cat.value === category)?.icon || '🎯';
  };

  const getProgressColor = (progress: number) => {
    if (progress >= 100) return 'bg-green-500';
    if (progress >= 75) return 'bg-blue-500';
    if (progress >= 50) return 'bg-yellow-500';
    if (progress >= 25) return 'bg-orange-500';
    return 'bg-red-500';
  };

  const handleAddGoal = () => {
    if (!newGoal.title || !newGoal.targetAmount || !newGoal.targetDate) {
      return;
    }

    const goalData = {
      title: newGoal.title,
      description: newGoal.description,
      targetAmount: parseFloat(newGoal.targetAmount),
      targetDate: newGoal.targetDate,
      category: newGoal.category,
    };

    const createdGoal = addUserGoal(userId, goalData);
    setGoals([...goals, createdGoal]);
    setNewGoal({
      title: '',
      description: '',
      targetAmount: '',
      targetDate: '',
      category: 'other',
    });
    setShowAddForm(false);
    setShowSuggestions(false);
  };

  const handleAddSuggestion = (suggestion: Omit<Goal, 'id' | 'currentAmount' | 'isCompleted' | 'createdAt'>) => {
    const createdGoal = addUserGoal(userId, suggestion);
    setGoals([...goals, createdGoal]);
    setSuggestions(suggestions.filter(s => s.title !== suggestion.title));
    if (suggestions.length <= 1) {
      setShowSuggestions(false);
    }
  };

  const handleUpdateProgress = (goalId: string, amount: number) => {
    const updatedGoal = updateGoalProgress(userId, goalId, amount);
    if (updatedGoal) {
      setGoals(goals.map(goal => 
        goal.id === goalId ? updatedGoal : goal
      ));
    }
  };

  const handleDeleteGoal = (goalId: string) => {
    const success = deleteUserGoal(userId, goalId);
    if (success) {
      setGoals(goals.filter(goal => goal.id !== goalId));
    }
  };

  // Calculate statistics using service
  const statistics = getGoalStatistics(userId);
  const { totalGoals, completedGoals, totalTargetAmount, totalCurrentAmount, overallProgress } = statistics;

  return (
    <div className="space-y-6">
      {/* Goals Overview */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-600 transition-colors duration-200">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <FlagIcon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            Financial Goals Overview
          </h3>
          <button
            onClick={() => setShowAddForm(true)}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
          >
            <PlusIcon className="h-4 w-4" />
            Add Goal
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-blue-50 p-4 rounded-lg text-center">
            <div className="text-2xl font-bold text-blue-700">{totalGoals}</div>
            <div className="text-sm text-blue-600">Total Goals</div>
          </div>
          <div className="bg-green-50 p-4 rounded-lg text-center">
            <div className="text-2xl font-bold text-green-700">
              {completedGoals}
            </div>
            <div className="text-sm text-green-600">Completed</div>
          </div>
          <div className="bg-purple-50 p-4 rounded-lg text-center">
            <div className="text-2xl font-bold text-purple-700">
              {formatCurrency(totalCurrentAmount)}
            </div>
            <div className="text-sm text-purple-600">Total Saved</div>
          </div>
          <div className="bg-orange-50 p-4 rounded-lg text-center">
            <div className="text-2xl font-bold text-orange-700">
              {overallProgress.toFixed(1)}%
            </div>
            <div className="text-sm text-orange-600">Overall Progress</div>
          </div>
        </div>

        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 transition-colors duration-200">
          <div
            className={`h-3 rounded-full transition-all duration-300 ${getProgressColor(overallProgress)}`}
            style={{ width: `${overallProgress}%` }}
          />
        </div>
      </div>

      {/* Goal Suggestions */}
      {showSuggestions && suggestions.length > 0 && (
        <div className="bg-blue-50 dark:bg-blue-900/20 p-6 rounded-lg border border-blue-200 dark:border-blue-800 transition-colors duration-200">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-lg font-semibold text-blue-900 dark:text-blue-100">Suggested Goals for You</h4>
            <button
              onClick={() => setShowSuggestions(false)}
              className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200 text-sm transition-colors duration-200"
            >
              Dismiss
            </button>
          </div>
          <p className="text-blue-700 dark:text-blue-300 mb-4 text-sm">
            Based on your financial profile, here are some goals that might help you build wealth:
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {suggestions.map((suggestion, index) => (
              <div key={index} className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-blue-100 dark:border-blue-800 transition-colors duration-200">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h5 className="font-semibold text-gray-900 dark:text-white">{suggestion.title}</h5>
                    <p className="text-sm text-gray-600 dark:text-gray-300">{suggestion.description}</p>
                  </div>
                  <span className="text-xl">{getCategoryIcon(suggestion.category)}</span>
                </div>
                <div className="flex justify-between items-center mb-3">
                  <span className="text-lg font-bold text-green-600">
                    {formatCurrency(suggestion.targetAmount)}
                  </span>
                  <span className="text-sm text-gray-500">
                    by {new Date(suggestion.targetDate).toLocaleDateString()}
                  </span>
                </div>
                <button
                  onClick={() => handleAddSuggestion(suggestion)}
                  className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors text-sm"
                >
                  Add This Goal
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add Goal Form */}
      {showAddForm && (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-600 transition-colors duration-200">
          <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Add New Goal</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Goal Title</label>
              <input
                type="text"
                value={newGoal.title}
                onChange={(e) => setNewGoal({ ...newGoal, title: e.target.value })}
                className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors duration-200"
                placeholder="e.g., Emergency Fund"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Category</label>
              <select
                value={newGoal.category}
                onChange={(e) => setNewGoal({ ...newGoal, category: e.target.value as Goal['category'] })}
                className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors duration-200"
              >
                {goalCategories.map(category => (
                  <option key={category.value} value={category.value}>
                    {category.icon} {category.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Target Amount</label>
              <input
                type="number"
                value={newGoal.targetAmount}
                onChange={(e) => setNewGoal({ ...newGoal, targetAmount: e.target.value })}
                className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors duration-200"
                placeholder="10000"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Target Date</label>
              <input
                type="date"
                value={newGoal.targetDate}
                onChange={(e) => setNewGoal({ ...newGoal, targetDate: e.target.value })}
                className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors duration-200"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description (Optional)</label>
              <input
                type="text"
                value={newGoal.description}
                onChange={(e) => setNewGoal({ ...newGoal, description: e.target.value })}
                className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors duration-200"
                placeholder="Brief description of your goal"
              />
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <button
              onClick={handleAddGoal}
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
            >
              Add Goal
            </button>
            <button
              onClick={() => setShowAddForm(false)}
              className="bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-300 px-4 py-2 rounded-md hover:bg-gray-400 dark:hover:bg-gray-500 transition-colors duration-200"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Goals List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {goals.map((goal) => {
          const progress = calculateProgress(goal.currentAmount, goal.targetAmount);
          const monthsToGoal = calculateMonthsToGoal(goal.currentAmount, goal.targetAmount, monthlySavings);
          const daysUntilTarget = Math.ceil((new Date(goal.targetDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
          
          return (
            <div key={goal.id} className={`bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-600 transition-colors duration-200 ${goal.isCompleted ? 'ring-2 ring-green-500 dark:ring-green-400' : ''}`}>
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{getCategoryIcon(goal.category)}</span>
                  <div>
                    <h4 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                      {goal.title}
                      {goal.isCompleted && <CheckIcon className="h-5 w-5 text-green-500 dark:text-green-400" />}
                    </h4>
                    {goal.description && (
                      <p className="text-sm text-gray-600 dark:text-gray-300">{goal.description}</p>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => handleDeleteGoal(goal.id)}
                  className="text-gray-400 hover:text-red-500 transition-colors"
                >
                  <TrashIcon className="h-4 w-4" />
                </button>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between text-sm text-gray-900 dark:text-white">
                  <span>Progress</span>
                  <span className="font-medium">{progress.toFixed(1)}%</span>
                </div>
                
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 transition-colors duration-200">
                  <div
                    className={`h-2 rounded-full transition-all duration-300 ${getProgressColor(progress)}`}
                    style={{ width: `${progress}%` }}
                  />
                </div>

                <div className="flex justify-between text-sm text-gray-600 dark:text-gray-300">
                  <span>{formatCurrency(goal.currentAmount)}</span>
                  <span>{formatCurrency(goal.targetAmount)}</span>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-3 border-t border-gray-200 dark:border-gray-600">
                  <div className="text-center">
                    <CalendarIcon className="h-4 w-4 text-gray-400 dark:text-gray-500 mx-auto mb-1" />
                    <div className="text-xs text-gray-500 dark:text-gray-400">Target Date</div>
                    <div className="text-sm font-medium text-gray-900 dark:text-white">
                      {new Date(goal.targetDate).toLocaleDateString()}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {daysUntilTarget > 0 ? `${daysUntilTarget} days left` : 'Overdue'}
                    </div>
                  </div>
                  <div className="text-center">
                    <FlagIcon className="h-4 w-4 text-gray-400 mx-auto mb-1" />
                    <div className="text-xs text-gray-500">Months to Goal</div>
                    <div className="text-sm font-medium">
                      {typeof monthsToGoal === 'number' ? `${monthsToGoal} months` : monthsToGoal}
                    </div>
                  </div>
                </div>

                <div className="flex gap-2 pt-3">
                  <button
                    onClick={() => handleUpdateProgress(goal.id, 100)}
                    className="flex-1 text-xs bg-green-600 text-white py-2 px-3 rounded hover:bg-green-700 transition-colors"
                  >
                    +$100
                  </button>
                  <button
                    onClick={() => handleUpdateProgress(goal.id, 500)}
                    className="flex-1 text-xs bg-blue-600 text-white py-2 px-3 rounded hover:bg-blue-700 transition-colors"
                  >
                    +$500
                  </button>
                  <button
                    onClick={() => handleUpdateProgress(goal.id, -100)}
                    className="flex-1 text-xs bg-red-600 text-white py-2 px-3 rounded hover:bg-red-700 transition-colors"
                  >
                    -$100
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {goals.length === 0 && !showAddForm && (
        <div className="bg-white dark:bg-gray-800 p-12 rounded-lg shadow-sm border border-gray-200 dark:border-gray-600 text-center transition-colors duration-200">
          <FlagIcon className="h-12 w-12 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No Goals Yet</h3>
          <p className="text-gray-600 dark:text-gray-300 mb-4">
            Start your financial journey by setting your first goal.
          </p>
          <button
            onClick={() => setShowAddForm(true)}
            className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 transition-colors"
          >
            Create Your First Goal
          </button>
        </div>
      )}
    </div>
  );
}