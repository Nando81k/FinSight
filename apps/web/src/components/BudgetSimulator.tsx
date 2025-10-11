import React, { useState, useEffect } from 'react';
import {
  PlusIcon,
  TrashIcon,
  CalculatorIcon,
  ChartBarIcon,
  ExclamationCircleIcon,
  CheckCircleIcon,
  InformationCircleIcon,
  ArrowTrendingUpIcon,
  BanknotesIcon
} from '@heroicons/react/24/outline';

interface BudgetCategory {
  id: string;
  name: string;
  type: 'income' | 'expense';
  isEssential?: boolean;
  isFixed?: boolean;
}

interface BudgetItem {
  id: string;
  categoryId: string;
  name: string;
  amount: number;
  frequency: 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'annually';
  description?: string;
  tags?: string[];
}

interface BudgetScenario {
  id: string;
  name: string;
  description?: string;
  categories: BudgetCategory[];
  items?: BudgetItem[];
  savingsGoals?: any[];
  createdAt: string;
  updatedAt: string;
}

interface BudgetAnalysis {
  totalIncome: number;
  totalExpenses: number;
  netIncome: number;
  savingsRate: number;
  recommendations: Array<{
    type: 'warning' | 'success' | 'info' | 'suggestion';
    category: string;
    title: string;
    description: string;
    impact?: number;
  }>;
  breakdown: {
    income: { [categoryId: string]: number };
    expenses: { [categoryId: string]: number };
  };
}

const BudgetSimulator: React.FC = () => {
  const [scenarios, setScenarios] = useState<BudgetScenario[]>([]);
  const [currentScenario, setCurrentScenario] = useState<BudgetScenario | null>(null);
  const [categories, setCategories] = useState<BudgetCategory[]>([]);
  const [analysis, setAnalysis] = useState<BudgetAnalysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'manage' | 'analyze' | 'compare'>('manage');

  // New budget item form state
  const [newItem, setNewItem] = useState({
    categoryId: '',
    name: '',
    amount: '',
    frequency: 'monthly' as const,
    description: ''
  });

  useEffect(() => {
    fetchCategories();
    fetchScenarios();
  }, []);

  const fetchCategories = async () => {
    try {
      const response = await fetch('/api/budget/categories');
      if (response.ok) {
        const data = await response.json();
        setCategories(data.categories);
      }
    } catch (err) {
      console.error('Failed to fetch categories:', err);
    }
  };

  const fetchScenarios = async () => {
    try {
      const response = await fetch('/api/budget/scenarios');
      if (response.ok) {
        const data = await response.json();
        // Ensure all scenarios have items array initialized
        const scenariosWithItems = data.scenarios.map((scenario: BudgetScenario) => ({
          ...scenario,
          items: scenario.items || []
        }));
        setScenarios(scenariosWithItems);
        if (scenariosWithItems.length > 0 && !currentScenario) {
          setCurrentScenario(scenariosWithItems[0]);
        }
      }
    } catch (err) {
      console.error('Failed to fetch scenarios:', err);
    }
  };

  const createScenario = async (name: string, description?: string) => {
    try {
      setLoading(true);
      const response = await fetch('/api/budget/scenarios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, description })
      });

      if (response.ok) {
        const newScenario = await response.json();
        // Ensure items array is initialized
        if (!newScenario.items) {
          newScenario.items = [];
        }
        setScenarios([...scenarios, newScenario]);
        setCurrentScenario(newScenario);
        setError(null);
      } else {
        throw new Error('Failed to create scenario');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create scenario');
    } finally {
      setLoading(false);
    }
  };

  const addBudgetItem = async () => {
    if (!currentScenario || !newItem.categoryId || !newItem.name || !newItem.amount) {
      setError('Please fill in all required fields');
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(`/api/budget/scenarios/${currentScenario.id}/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newItem,
          amount: parseFloat(newItem.amount)
        })
      });

      if (response.ok) {
        const updatedScenario = await fetch(`/api/budget/scenarios/${currentScenario.id}`);
        if (updatedScenario.ok) {
          const scenarioData = await updatedScenario.json();
          setCurrentScenario(scenarioData);
        }
        
        // Reset form
        setNewItem({
          categoryId: '',
          name: '',
          amount: '',
          frequency: 'monthly',
          description: ''
        });
        setError(null);
      } else {
        throw new Error('Failed to add budget item');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add budget item');
    } finally {
      setLoading(false);
    }
  };

  const analyzeBudget = async () => {
    if (!currentScenario) return;

    try {
      setLoading(true);
      const response = await fetch(`/api/budget/analyze/${currentScenario.id}`, {
        method: 'POST'
      });

      if (response.ok) {
        const analysisData = await response.json();
        setAnalysis(analysisData);
        setError(null);
      } else {
        throw new Error('Failed to analyze budget');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to analyze budget');
    } finally {
      setLoading(false);
    }
  };

  const getCategoryName = (categoryId: string) => {
    return categories.find(cat => cat.id === categoryId)?.name || 'Unknown Category';
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const getRecommendationIcon = (type: string) => {
    switch (type) {
      case 'warning': return <ExclamationCircleIcon className="w-5 h-5 text-yellow-500" />;
      case 'success': return <CheckCircleIcon className="w-5 h-5 text-green-500" />;
      case 'suggestion': return <ArrowTrendingUpIcon className="w-5 h-5 text-blue-500" />;
      default: return <InformationCircleIcon className="w-5 h-5 text-gray-500" />;
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Budget Simulator</h1>
        <p className="text-gray-600">Create and analyze budget scenarios to optimize your financial planning.</p>
      </div>

      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <ExclamationCircleIcon className="w-5 h-5 text-red-400 mr-2" />
            <p className="text-red-700">{error}</p>
          </div>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="flex space-x-8">
          {[
            { key: 'manage', label: 'Manage Budget', icon: BanknotesIcon },
            { key: 'analyze', label: 'Analysis', icon: ChartBarIcon },
            { key: 'compare', label: 'Compare Scenarios', icon: CalculatorIcon }
          ].map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key as any)}
              className={`flex items-center py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === key
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Icon className="w-5 h-5 mr-2" />
              {label}
            </button>
          ))}
        </nav>
      </div>

      {/* Scenario Selection */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Current Scenario
            </label>
            <select
              value={currentScenario?.id || ''}
              onChange={(e) => {
                const scenario = scenarios.find(s => s.id === e.target.value);
                if (scenario) {
                  // Ensure items array is initialized
                  const safeScenario = { ...scenario, items: scenario.items || [] };
                  setCurrentScenario(safeScenario);
                } else {
                  setCurrentScenario(null);
                }
              }}
              className="block w-64 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Select a scenario</option>
              {scenarios.map(scenario => (
                <option key={scenario.id} value={scenario.id}>
                  {scenario.name}
                </option>
              ))}
            </select>
          </div>
          <button
            onClick={() => {
              const name = prompt('Enter scenario name:');
              if (name) {
                const description = prompt('Enter description (optional):');
                createScenario(name, description || undefined);
              }
            }}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 flex items-center"
          >
            <PlusIcon className="w-4 h-4 mr-2" />
            New Scenario
          </button>
        </div>
      </div>

      {activeTab === 'manage' && currentScenario && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Add Budget Item Form */}
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Add Budget Item</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Category *
                </label>
                <select
                  value={newItem.categoryId}
                  onChange={(e) => setNewItem({ ...newItem, categoryId: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Select a category</option>
                  {categories.map(category => (
                    <option key={category.id} value={category.id}>
                      {category.name} ({category.type})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Item Name *
                </label>
                <input
                  type="text"
                  value={newItem.name}
                  onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="e.g., Salary, Rent, Groceries"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Amount *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={newItem.amount}
                    onChange={(e) => setNewItem({ ...newItem, amount: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    placeholder="0.00"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Frequency
                  </label>
                  <select
                    value={newItem.frequency}
                    onChange={(e) => setNewItem({ ...newItem, frequency: e.target.value as any })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="weekly">Weekly</option>
                    <option value="biweekly">Bi-weekly</option>
                    <option value="monthly">Monthly</option>
                    <option value="quarterly">Quarterly</option>
                    <option value="annually">Annually</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={newItem.description}
                  onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Optional description or notes"
                />
              </div>

              <button
                onClick={addBudgetItem}
                disabled={loading}
                className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center"
              >
                <PlusIcon className="w-4 h-4 mr-2" />
                Add Item
              </button>
            </div>
          </div>

          {/* Current Budget Items */}
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Current Budget Items ({currentScenario.items?.length || 0})
            </h3>
            
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {!currentScenario.items || currentScenario.items.length === 0 ? (
                <p className="text-gray-500 text-center py-4">No budget items yet. Add some items to get started!</p>
              ) : (
                (currentScenario.items || []).map(item => (
                  <div key={item.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900">{item.name}</h4>
                      <p className="text-sm text-gray-600">
                        {getCategoryName(item.categoryId)} • {formatCurrency(item.amount)} ({item.frequency})
                      </p>
                      {item.description && (
                        <p className="text-xs text-gray-500">{item.description}</p>
                      )}
                    </div>
                    <button className="text-red-500 hover:text-red-700 ml-2">
                      <TrashIcon className="w-4 h-4" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'analyze' && currentScenario && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold text-gray-900">Budget Analysis</h3>
            <button
              onClick={analyzeBudget}
              disabled={loading}
              className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 disabled:opacity-50 flex items-center"
            >
              <CalculatorIcon className="w-4 h-4 mr-2" />
              Analyze Budget
            </button>
          </div>

          {analysis && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Summary Cards */}
              <div className="bg-green-50 p-6 rounded-lg">
                <h4 className="font-medium text-green-800">Total Income</h4>
                <p className="text-2xl font-bold text-green-900">{formatCurrency(analysis.totalIncome)}</p>
              </div>

              <div className="bg-red-50 p-6 rounded-lg">
                <h4 className="font-medium text-red-800">Total Expenses</h4>
                <p className="text-2xl font-bold text-red-900">{formatCurrency(analysis.totalExpenses)}</p>
              </div>

              <div className={`p-6 rounded-lg ${analysis.netIncome >= 0 ? 'bg-blue-50' : 'bg-yellow-50'}`}>
                <h4 className={`font-medium ${analysis.netIncome >= 0 ? 'text-blue-800' : 'text-yellow-800'}`}>
                  Net Income
                </h4>
                <p className={`text-2xl font-bold ${analysis.netIncome >= 0 ? 'text-blue-900' : 'text-yellow-900'}`}>
                  {formatCurrency(analysis.netIncome)}
                </p>
                <p className={`text-sm ${analysis.netIncome >= 0 ? 'text-blue-600' : 'text-yellow-600'}`}>
                  Savings Rate: {(analysis.savingsRate * 100).toFixed(1)}%
                </p>
              </div>
            </div>
          )}

          {analysis?.recommendations && analysis.recommendations.length > 0 && (
            <div className="bg-white p-6 rounded-lg shadow-md">
              <h4 className="text-lg font-semibold text-gray-900 mb-4">Recommendations</h4>
              <div className="space-y-3">
                {analysis.recommendations.map((rec, index) => (
                  <div key={index} className="flex items-start p-3 bg-gray-50 rounded-md">
                    <div className="mr-3 mt-0.5">
                      {getRecommendationIcon(rec.type)}
                    </div>
                    <div>
                      <h5 className="font-medium text-gray-900">{rec.title}</h5>
                      <p className="text-sm text-gray-600">{rec.description}</p>
                      {rec.impact && (
                        <p className="text-xs text-blue-600 mt-1">
                          Potential savings: {formatCurrency(rec.impact)}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'compare' && (
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Compare Scenarios</h3>
          <p className="text-gray-600">
            Scenario comparison feature coming soon! This will allow you to compare multiple budget scenarios side by side.
          </p>
        </div>
      )}
    </div>
  );
};

export default BudgetSimulator;