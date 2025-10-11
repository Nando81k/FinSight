import { useState, useEffect } from 'react';
import { Tab } from '@headlessui/react';
import { 
  CurrencyDollarIcon, 
  ChartBarIcon,
  ChartPieIcon
} from '@heroicons/react/24/outline';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  LineElement,
  PointElement
} from 'chart.js';
import { Pie, Line } from 'react-chartjs-2';

ChartJS.register(
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  LineElement,
  PointElement
);

// Custom slider styles
const sliderStyles = `
  .slider::-webkit-slider-thumb {
    appearance: none;
    width: 20px;
    height: 20px;
    border-radius: 50%; 
    background: #ffffff;
    border: 2px solid #6366f1;
    cursor: pointer;
    box-shadow: 0 2px 6px rgba(0,0,0,0.2);
    transition: all 0.2s ease-in-out;
  }
  
  .slider::-webkit-slider-thumb:hover {
    transform: scale(1.1);
    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
  }
  
  .slider::-moz-range-thumb {
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background: #ffffff;
    border: 2px solid #6366f1;
    cursor: pointer;
    box-shadow: 0 2px 6px rgba(0,0,0,0.2);
  }
`;

// Inject styles
if (typeof document !== 'undefined') {
  const styleSheet = document.createElement("style");
  styleSheet.innerText = sliderStyles;
  document.head.appendChild(styleSheet);
}

interface TaxBreakdown {
  grossIncome: number;
  federal: {
    tax: number;
    effectiveRate: number;
    marginalRate: number;
  };
  state: {
    tax: number;
    effectiveRate: number;
    name: string;
  };
  fica: {
    socialSecurityTax: number;
    medicareTax: number;
    totalFica: number;
  };
  totalTax: number;
  netIncome: number;
  effectiveTaxRate: number;
}

interface SavingsProjection {
  month: number;
  monthlyIncome: number;
  monthlyExpenses: number;
  monthlySavings: number;
  cumulativeSavings: number;
}

interface CustomFund {
  id: string;
  name: string;
  percentage: number;
  color: string;
}

interface FundProjection {
  month: number;
  fundAllocations: { [fundId: string]: number };
  cumulativeFundAllocations: { [fundId: string]: number };
}

function classNames(...classes: string[]) {
  return classes.filter(Boolean).join(' ');
}

// US States with tax information
const US_STATES = [
  { code: 'AL', name: 'Alabama', hasStateTax: true },
  { code: 'AK', name: 'Alaska', hasStateTax: false },
  { code: 'AZ', name: 'Arizona', hasStateTax: true },
  { code: 'AR', name: 'Arkansas', hasStateTax: true },
  { code: 'CA', name: 'California', hasStateTax: true },
  { code: 'CO', name: 'Colorado', hasStateTax: true },
  { code: 'CT', name: 'Connecticut', hasStateTax: true },
  { code: 'DE', name: 'Delaware', hasStateTax: true },
  { code: 'FL', name: 'Florida', hasStateTax: false },
  { code: 'GA', name: 'Georgia', hasStateTax: true },
  { code: 'HI', name: 'Hawaii', hasStateTax: true },
  { code: 'ID', name: 'Idaho', hasStateTax: true },
  { code: 'IL', name: 'Illinois', hasStateTax: true },
  { code: 'IN', name: 'Indiana', hasStateTax: true },
  { code: 'IA', name: 'Iowa', hasStateTax: true },
  { code: 'KS', name: 'Kansas', hasStateTax: true },
  { code: 'KY', name: 'Kentucky', hasStateTax: true },
  { code: 'LA', name: 'Louisiana', hasStateTax: true },
  { code: 'ME', name: 'Maine', hasStateTax: true },
  { code: 'MD', name: 'Maryland', hasStateTax: true },
  { code: 'MA', name: 'Massachusetts', hasStateTax: true },
  { code: 'MI', name: 'Michigan', hasStateTax: true },
  { code: 'MN', name: 'Minnesota', hasStateTax: true },
  { code: 'MS', name: 'Mississippi', hasStateTax: true },
  { code: 'MO', name: 'Missouri', hasStateTax: true },
  { code: 'MT', name: 'Montana', hasStateTax: true },
  { code: 'NE', name: 'Nebraska', hasStateTax: true },
  { code: 'NV', name: 'Nevada', hasStateTax: false },
  { code: 'NH', name: 'New Hampshire', hasStateTax: false },
  { code: 'NJ', name: 'New Jersey', hasStateTax: true },
  { code: 'NM', name: 'New Mexico', hasStateTax: true },
  { code: 'NY', name: 'New York', hasStateTax: true },
  { code: 'NC', name: 'North Carolina', hasStateTax: true },
  { code: 'ND', name: 'North Dakota', hasStateTax: true },
  { code: 'OH', name: 'Ohio', hasStateTax: true },
  { code: 'OK', name: 'Oklahoma', hasStateTax: true },
  { code: 'OR', name: 'Oregon', hasStateTax: true },
  { code: 'PA', name: 'Pennsylvania', hasStateTax: true },
  { code: 'RI', name: 'Rhode Island', hasStateTax: true },
  { code: 'SC', name: 'South Carolina', hasStateTax: true },
  { code: 'SD', name: 'South Dakota', hasStateTax: false },
  { code: 'TN', name: 'Tennessee', hasStateTax: false },
  { code: 'TX', name: 'Texas', hasStateTax: false },
  { code: 'UT', name: 'Utah', hasStateTax: true },
  { code: 'VT', name: 'Vermont', hasStateTax: true },
  { code: 'VA', name: 'Virginia', hasStateTax: true },
  { code: 'WA', name: 'Washington', hasStateTax: false },
  { code: 'WV', name: 'West Virginia', hasStateTax: true },
  { code: 'WI', name: 'Wisconsin', hasStateTax: true },
  { code: 'WY', name: 'Wyoming', hasStateTax: false },
];

export function Salary() {
  const [formData, setFormData] = useState({
    grossSalary: '',
    filingStatus: 'single',
    state: 'CA',
    payFrequency: 'biweekly',
  });

  const [taxBreakdown, setTaxBreakdown] = useState<TaxBreakdown | null>(null);
  const [budgetData, setBudgetData] = useState({
    housing: '',
    transportation: '',
    food: '',
    utilities: '',
    insurance: '',
    entertainment: '',
    other: '',
  });

  const [savingsProjection, setSavingsProjection] = useState<SavingsProjection[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const [customFunds, setCustomFunds] = useState<CustomFund[]>([
    { id: '1', name: 'Emergency Fund', percentage: 0, color: '#ef4444' },
    { id: '2', name: 'Travel Fund', percentage: 0, color: '#3b82f6' },
    { id: '3', name: 'Investment Fund', percentage: 0, color: '#10b981' }
  ]);
  const [fundProjections, setFundProjections] = useState<FundProjection[]>([]);

  // Recalculate fund projections whenever custom funds change
  useEffect(() => {
    if (savingsProjection.length > 0) {
      calculateFundProjections(savingsProjection);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customFunds]);

  const calculateTaxes = async () => {
    if (!formData.grossSalary) return;

    setLoading(true);
    try {
      const response = await fetch('http://localhost:4000/api/tax/calculate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          grossIncome: parseFloat(formData.grossSalary),
          filingStatus: formData.filingStatus,
          state: formData.state,
          deductionType: 'standard',
        }),
      });

      const result = await response.json();
      setTaxBreakdown(result);
    } catch (error) {
      console.error('Error calculating taxes:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateSavingsProjection = () => {
    if (!taxBreakdown) return;

    const monthlyIncome = taxBreakdown.netIncome / 12;
    const totalBudgetExpenses = Object.values(budgetData)
      .filter(value => value !== '')
      .reduce((sum, value) => sum + parseFloat(value), 0);

    const monthlySavings = monthlyIncome - totalBudgetExpenses;

    const projection: SavingsProjection[] = [];
    let cumulativeSavings = 0;

    for (let month = 1; month <= 12; month++) {
      cumulativeSavings += monthlySavings;
      projection.push({
        month,
        monthlyIncome,
        monthlyExpenses: totalBudgetExpenses,
        monthlySavings,
        cumulativeSavings,
      });
    }

    setSavingsProjection(projection);
    calculateFundProjections(projection);
    setActiveTab(2); // Switch to Savings Projection tab
  };

  const calculateFundProjections = (savingsData: SavingsProjection[]) => {
    const fundProjectionData: FundProjection[] = [];
    
    const cumulativeFunds: { [fundId: string]: number } = {};
    customFunds.forEach(fund => {
      cumulativeFunds[fund.id] = 0;
    });

    savingsData.forEach((monthData) => {
      const fundAllocations: { [fundId: string]: number } = {};
      const cumulativeFundAllocations: { [fundId: string]: number } = {};

      customFunds.forEach(fund => {
        const monthlyAllocation = (monthData.monthlySavings * fund.percentage) / 100;
        fundAllocations[fund.id] = monthlyAllocation;
        cumulativeFunds[fund.id] = (cumulativeFunds[fund.id] || 0) + monthlyAllocation;
        cumulativeFundAllocations[fund.id] = cumulativeFunds[fund.id] || 0;
      });

      fundProjectionData.push({
        month: monthData.month,
        fundAllocations,
        cumulativeFundAllocations,
      });
    });

    setFundProjections(fundProjectionData);
  };

  const addCustomFund = (name: string) => {
    const newFund: CustomFund = {
      id: Date.now().toString(),
      name,
      percentage: 0,
      color: `#${Math.floor(Math.random()*16777215).toString(16)}`, // Random color
    };
    setCustomFunds([...customFunds, newFund]);
  };

  const removeCustomFund = (id: string) => {
    setCustomFunds(customFunds.filter(fund => fund.id !== id));
    // Recalculate projections after removing fund
    if (savingsProjection.length > 0) {
      calculateFundProjections(savingsProjection);
    }
  };

  const resetAllFunds = () => {
    setCustomFunds(funds => funds.map(fund => ({ ...fund, percentage: 0 })));
  };

  const applyEqualDistribution = () => {
    const equalPercentage = Math.floor(100 / customFunds.length);
    const remainder = 100 % customFunds.length;
    
    setCustomFunds(funds => funds.map((fund, index) => ({
      ...fund,
      percentage: equalPercentage + (index < remainder ? 1 : 0)
    })));
  };

  const apply50_30_20Rule = () => {
    if (customFunds.length >= 3) {
      setCustomFunds(funds => funds.map((fund, index) => ({
        ...fund,
        percentage: index === 0 ? 50 : index === 1 ? 30 : index === 2 ? 20 : 0
      })));
    }
  };

  const updateFundPercentage = (id: string, newPercentage: number) => {
    const updatedFunds = [...customFunds];
    const targetFundIndex = updatedFunds.findIndex(fund => fund.id === id);
    
    if (targetFundIndex === -1) return;

    const targetFund = updatedFunds[targetFundIndex];
    if (!targetFund) return;

    // Update the target fund
    targetFund.percentage = newPercentage;
    
    // Get other funds (not the one being changed)
    const otherFunds = updatedFunds.filter((_, index) => index !== targetFundIndex);
    
    if (otherFunds.length > 0) {
      // Calculate current total of other funds
      const otherTotal = otherFunds.reduce((sum, fund) => sum + fund.percentage, 0);
      
      if (newPercentage >= 100) {
        // If new percentage is 100% or more, set all others to 0
        otherFunds.forEach(fund => fund.percentage = 0);
      } else if (otherTotal > 0) {
        // Distribute the remaining percentage proportionally among other funds
        const remainingPercentage = 100 - newPercentage;
        const scaleFactor = remainingPercentage / otherTotal;
        
        otherFunds.forEach(fund => {
          fund.percentage = Math.round(fund.percentage * scaleFactor);
        });
        
        // Handle rounding errors - ensure total is exactly 100%
        const currentTotal = updatedFunds.reduce((sum, fund) => sum + fund.percentage, 0);
        if (currentTotal !== 100 && otherFunds.length > 0 && otherFunds[0]) {
          const adjustment = 100 - currentTotal;
          // Add/subtract the difference to the first other fund
          otherFunds[0].percentage = Math.max(0, otherFunds[0].percentage + adjustment);
        }
      } else {
        // If all other funds are at 0%, distribute remaining equally
        const remainingPercentage = 100 - newPercentage;
        const equalShare = Math.floor(remainingPercentage / otherFunds.length);
        const remainder = remainingPercentage % otherFunds.length;
        
        otherFunds.forEach((fund, index) => {
          fund.percentage = equalShare + (index < remainder ? 1 : 0);
        });
      }
    }

    setCustomFunds(updatedFunds);
    
    // Recalculate projections with new percentages
    if (savingsProjection.length > 0) {
      calculateFundProjections(savingsProjection);
    }
  };

  // Manual calculations triggered by buttons

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatPercentage = (rate: number) => {
    return `${(rate * 100).toFixed(2)}%`;
  };

  // Chart data
  const taxPieData = taxBreakdown ? {
    labels: ['Federal Tax', 'State Tax', 'FICA', 'Take Home'],
    datasets: [{
      data: [
        taxBreakdown.federal.tax,
        taxBreakdown.state.tax,
        taxBreakdown.fica.totalFica,
        taxBreakdown.netIncome
      ],
      backgroundColor: [
        '#ef4444',
        '#f97316',
        '#eab308',
        '#22c55e'
      ],
      borderWidth: 2,
      borderColor: '#ffffff'
    }]
  } : null;

  const budgetPieData = Object.values(budgetData).some(value => value !== '') ? {
    labels: Object.entries(budgetData)
      .filter(([_, value]) => value !== '')
      .map(([key]) => {
        const labels = {
          housing: 'Housing',
          transportation: 'Transportation',
          food: 'Food & Groceries', 
          utilities: 'Utilities',
          insurance: 'Insurance',
          entertainment: 'Entertainment',
          other: 'Other'
        };
        return labels[key as keyof typeof labels];
      }),
    datasets: [{
      data: Object.entries(budgetData)
        .filter(([_, value]) => value !== '')
        .map(([_, value]) => parseFloat(value)),
      backgroundColor: [
        '#3b82f6', // blue
        '#8b5cf6', // purple  
        '#f59e0b', // amber
        '#10b981', // green
        '#ef4444', // red
        '#f97316', // orange
        '#6366f1'  // indigo
      ],
      borderWidth: 2,
      borderColor: '#ffffff'
    }]
  } : null;

  const savingsLineData = savingsProjection.length > 0 ? {
    labels: savingsProjection.map(p => `Month ${p.month}`),
    datasets: [{
      label: 'Cumulative Savings',
      data: savingsProjection.map(p => p.cumulativeSavings),
      borderColor: '#22c55e',
      backgroundColor: 'rgba(34, 197, 94, 0.1)',
      fill: true,
      tension: 0.4
    }]
  } : null;

  // Fund allocation pie chart
  const fundAllocationData = customFunds.length > 0 && customFunds.some(f => f.percentage > 0) ? {
    labels: customFunds.filter(f => f.percentage > 0).map(fund => fund.name),
    datasets: [{
      data: customFunds.filter(f => f.percentage > 0).map(fund => fund.percentage),
      backgroundColor: customFunds.filter(f => f.percentage > 0).map(fund => fund.color),
      borderColor: '#ffffff'
    }]
  } : null;

  // Individual fund growth charts
  const fundGrowthData = fundProjections.length > 0 && customFunds.length > 0 ? {
    labels: fundProjections.map(p => `Month ${p.month}`),
    datasets: customFunds.map(fund => ({
      label: fund.name,
      data: fundProjections.map(p => p.cumulativeFundAllocations[fund.id] || 0),
      borderColor: fund.color,
      backgroundColor: fund.color + '20', // Add transparency
      fill: false,
      tension: 0.4
    }))
  } : null;

  const selectedState = US_STATES.find(s => s.code === formData.state);

  const tabs = [
    {
      name: 'Salary & Taxes',
      icon: CurrencyDollarIcon,
      description: 'Calculate your take-home pay after taxes'
    },
    {
      name: 'Budget Planning',
      icon: ChartPieIcon,
      description: 'Plan your monthly expenses'
    },
    {
      name: 'Savings Projection',
      icon: ChartBarIcon,
      description: 'Project your savings over time'
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Compact Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">💰 FinSight Dashboard</h1>
              <p className="text-sm text-gray-600">Real-time financial planning and analysis</p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-sm text-gray-500">
                {taxBreakdown && (
                  <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full font-medium">
                    Take-home: {formatCurrency(taxBreakdown.netIncome / 12)}/mo
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Dashboard Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 h-screen">
          
          {/* Left Sidebar - Input Controls */}
          <div className="xl:col-span-3 space-y-6">
            {/* Salary Input Card */}
            <div className="bg-white rounded-xl shadow-sm border p-6">
              <div className="flex items-center space-x-2 mb-4">
                <CurrencyDollarIcon className="h-5 w-5 text-blue-600" />
                <h3 className="text-lg font-semibold text-gray-900">Salary Info</h3>
              </div>

              {/* Salary Input Form */}
              <div className="space-y-4">
                  
                  <div className="space-y-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Annual Gross Salary
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">$</span>
                        <input
                          type="number"
                          value={formData.grossSalary}
                          onChange={(e) => setFormData({...formData, grossSalary: e.target.value})}
                          className="w-full pl-8 pr-4 py-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder-gray-400"
                          placeholder="75,000"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Filing Status
                        </label>
                        <select
                          value={formData.filingStatus}
                          onChange={(e) => setFormData({...formData, filingStatus: e.target.value})}
                          className="w-full px-3 py-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                        >
                          <option value="single">Single</option>
                          <option value="marriedFilingJointly">Married Filing Jointly</option>
                          <option value="marriedFilingSeparately">Married Filing Separately</option>
                          <option value="headOfHousehold">Head of Household</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          State
                        </label>
                        <select
                          value={formData.state}
                          onChange={(e) => setFormData({...formData, state: e.target.value})}
                          className="w-full px-3 py-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                        >
                          {US_STATES.map((state) => (
                            <option key={state.code} value={state.code}>
                              {state.name} {!state.hasStateTax && '(No State Tax)'}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="mt-8">
                      <button
                        onClick={calculateTaxes}
                        disabled={!formData.grossSalary || loading}
                        className="w-full bg-blue-600 text-white py-3 px-4 rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-medium"
                      >
                        {loading ? 'Calculating...' : 'Calculate Taxes'}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Tax Breakdown */}
                <div className="bg-white p-6 rounded-lg shadow-sm border">
                  <h3 className="text-lg font-medium text-gray-900 mb-6">Tax Breakdown</h3>
                  
                  {loading && (
                    <div className="flex items-center justify-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    </div>
                  )}

                  {taxBreakdown && !loading && (
                    <div className="space-y-4">
                      <div className="bg-gray-50 p-4 rounded-md">
                        <div className="flex justify-between items-center mb-2">
                          <span className="font-medium text-gray-900">Gross Annual Income</span>
                          <span className="text-lg font-semibold">{formatCurrency(taxBreakdown.grossIncome)}</span>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-gray-700">Federal Tax</span>
                          <span className="font-medium text-red-600">-{formatCurrency(taxBreakdown.federal.tax)}</span>
                        </div>
                        
                        {selectedState?.hasStateTax && (
                          <div className="flex justify-between items-center">
                            <span className="text-gray-700">{selectedState.name} State Tax</span>
                            <span className="font-medium text-red-600">-{formatCurrency(taxBreakdown.state.tax)}</span>
                          </div>
                        )}
                        
                        <div className="flex justify-between items-center">
                          <span className="text-gray-700">FICA (Social Security & Medicare)</span>
                          <span className="font-medium text-red-600">-{formatCurrency(taxBreakdown.fica.totalFica)}</span>
                        </div>
                        
                        <div className="border-t pt-3">
                          <div className="flex justify-between items-center">
                            <span className="font-medium text-gray-900">Total Taxes</span>
                            <span className="font-semibold text-red-600">-{formatCurrency(taxBreakdown.totalTax)}</span>
                          </div>
                        </div>
                        
                        <div className="bg-green-50 p-4 rounded-md">
                          <div className="flex justify-between items-center">
                            <span className="font-medium text-gray-900">Annual Take-Home Pay</span>
                            <span className="text-xl font-bold text-green-600">{formatCurrency(taxBreakdown.netIncome)}</span>
                          </div>
                          <div className="flex justify-between items-center mt-1">
                            <span className="text-sm text-gray-600">Monthly Take-Home</span>
                            <span className="text-lg font-semibold text-green-600">{formatCurrency(taxBreakdown.netIncome / 12)}</span>
                          </div>
                        </div>
                        
                        <div className="text-sm text-gray-600">
                          <span>Effective Tax Rate: {formatPercentage(taxBreakdown.effectiveTaxRate)}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Tax Visualization */}
                <div className="bg-white p-6 rounded-lg shadow-sm border">
                  <h3 className="text-lg font-medium text-gray-900 mb-6 flex items-center">
                    <ChartPieIcon className="h-5 w-5 mr-2" />
                    Income Distribution
                  </h3>
                  
                  {taxPieData && (
                    <div className="h-64">
                      <Pie 
                        data={taxPieData} 
                        options={{
                          responsive: true,
                          maintainAspectRatio: false,
                          plugins: {
                            legend: {
                              position: 'bottom'
                            }
                          }
                        }}
                      />
                    </div>
                  )}

                  {!taxBreakdown && (
                    <div className="text-center py-12">
                      <ChartPieIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-600">Calculate taxes to see income distribution</p>
                    </div>
                  )}
                </div>
              </div>
            </Tab.Panel>

            {/* Budget Planning Panel */}
            <Tab.Panel>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-lg shadow-sm border">
                  <h3 className="text-lg font-medium text-gray-900 mb-6">Monthly Budget Planning</h3>
                  
                  {taxBreakdown ? (
                    <div className="space-y-6">
                      <div className="bg-blue-50 p-4 rounded-md">
                        <div className="flex justify-between items-center">
                          <span className="font-medium text-gray-900">Monthly Take-Home Pay</span>
                          <span className="text-lg font-semibold text-blue-600">{formatCurrency(taxBreakdown.netIncome / 12)}</span>
                        </div>
                      </div>

                      <div className="space-y-4">
                        {Object.entries({
                          housing: 'Housing (Rent/Mortgage)',
                          transportation: 'Transportation',
                          food: 'Food & Groceries',
                          utilities: 'Utilities',
                          insurance: 'Insurance',
                          entertainment: 'Entertainment',
                          other: 'Other Expenses'
                        }).map(([key, label]) => (
                          <div key={key}>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              {label}
                            </label>
                            <div className="relative">
                              <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">$</span>
                              <input
                                type="number"
                                value={budgetData[key as keyof typeof budgetData]}
                                onChange={(e) => setBudgetData({...budgetData, [key]: e.target.value})}
                                className="w-full pl-8 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder-gray-400"
                                placeholder="0"
                              />
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className="mt-6">
                        <button
                          onClick={calculateSavingsProjection}
                          disabled={!taxBreakdown || !Object.values(budgetData).some(value => value !== '')}
                          className="w-full bg-green-600 text-white py-3 px-4 rounded-md hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-medium"
                        >
                          Calculate Savings Projection
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <CurrencyDollarIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-600">Enter your salary information first to start budget planning</p>
                    </div>
                  )}
                </div>

                <div className="bg-white p-6 rounded-lg shadow-sm border">
                  <h3 className="text-lg font-medium text-gray-900 mb-6">Budget Summary</h3>
                  
                  {taxBreakdown && Object.values(budgetData).some(value => value !== '') && (
                    <div className="space-y-4">
                      {Object.entries(budgetData).map(([key, value]) => {
                        if (!value) return null;
                        const label = {
                          housing: 'Housing',
                          transportation: 'Transportation', 
                          food: 'Food & Groceries',
                          utilities: 'Utilities',
                          insurance: 'Insurance',
                          entertainment: 'Entertainment',
                          other: 'Other'
                        }[key];
                        
                        return (
                          <div key={key} className="flex justify-between items-center">
                            <span className="text-gray-700">{label}</span>
                            <span className="font-medium text-gray-900">{formatCurrency(parseFloat(value))}</span>
                          </div>
                        );
                      })}
                      
                      <div className="border-t pt-3">
                        <div className="flex justify-between items-center">
                          <span className="font-medium text-gray-900">Total Expenses</span>
                          <span className="font-semibold text-red-600">
                            {formatCurrency(
                              Object.values(budgetData)
                                .filter(value => value !== '')
                                .reduce((sum, value) => sum + parseFloat(value), 0)
                            )}
                          </span>
                        </div>
                      </div>
                      
                      <div className="bg-green-50 p-4 rounded-md">
                        <div className="flex justify-between items-center">
                          <span className="font-medium text-gray-900">Monthly Savings</span>
                          <span className="text-lg font-bold text-green-600">
                            {formatCurrency(
                              (taxBreakdown.netIncome / 12) - 
                              Object.values(budgetData)
                                .filter(value => value !== '')
                                .reduce((sum, value) => sum + parseFloat(value), 0)
                            )}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Budget Breakdown Chart */}
                <div className="bg-white p-6 rounded-lg shadow-sm border">
                  <h3 className="text-lg font-medium text-gray-900 mb-6 flex items-center">
                    <ChartPieIcon className="h-5 w-5 mr-2" />
                    Budget Breakdown
                  </h3>
                  
                  {budgetPieData ? (
                    <div className="h-64">
                      <Pie 
                        data={budgetPieData} 
                        options={{
                          responsive: true,
                          maintainAspectRatio: false,
                          plugins: {
                            legend: {
                              position: 'bottom'
                            }
                          }
                        }}
                      />
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <ChartPieIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-600">Add budget items to see breakdown visualization</p>
                    </div>
                  )}
                </div>
              </div>
            </Tab.Panel>

            {/* Savings Projection Panel */}
            <Tab.Panel>
              <div className="bg-white p-6 rounded-lg shadow-sm border">
                <h3 className="text-lg font-medium text-gray-900 mb-6">12-Month Savings Projection</h3>
                
                {savingsProjection.length > 0 && savingsProjection[0] ? (
                  <div className="space-y-6">
                    {/* Key Metrics */}
                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                      <div className="bg-blue-50 p-4 rounded-md">
                        <div className="text-sm text-gray-600">Monthly Income</div>
                        <div className="text-xl font-semibold text-blue-600">
                          {formatCurrency(savingsProjection[0].monthlyIncome)}
                        </div>
                      </div>
                      <div className="bg-red-50 p-4 rounded-md">
                        <div className="text-sm text-gray-600">Monthly Expenses</div>
                        <div className="text-xl font-semibold text-red-600">
                          {formatCurrency(savingsProjection[0].monthlyExpenses)}
                        </div>
                      </div>
                      <div className="bg-green-50 p-4 rounded-md">
                        <div className="text-sm text-gray-600">Monthly Savings</div>
                        <div className="text-xl font-semibold text-green-600">
                          {formatCurrency(savingsProjection[0].monthlySavings)}
                        </div>
                      </div>
                      <div className="bg-green-100 p-4 rounded-md">
                        <div className="text-sm text-gray-600">Total After 12 Months</div>
                        <div className="text-xl font-semibold text-green-700">
                          {formatCurrency(savingsProjection[savingsProjection.length - 1]?.cumulativeSavings || 0)}
                        </div>
                      </div>
                    </div>

                    {/* Visual Growth Chart */}
                    {savingsLineData && (
                      <div className="bg-gray-50 p-6 rounded-lg">
                        <h4 className="text-md font-medium text-gray-900 mb-4">Savings Growth Over Time</h4>
                        <div className="h-64">
                          <Line 
                            data={savingsLineData} 
                            options={{
                              responsive: true,
                              maintainAspectRatio: false,
                              plugins: {
                                legend: {
                                  position: 'top' as const,
                                },
                                title: {
                                  display: false,
                                },
                              },
                              scales: {
                                y: {
                                  beginAtZero: true,
                                  ticks: {
                                    callback: function(value) {
                                      return '$' + Number(value).toLocaleString();
                                    }
                                  }
                                }
                              }
                            }} 
                          />
                        </div>
                      </div>
                    )}

                    {/* Summary Insights */}
                    <div className="bg-gradient-to-r from-green-50 to-blue-50 p-6 rounded-lg">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <h4 className="text-md font-medium text-gray-900 mb-2">Savings Rate</h4>
                          <div className="text-2xl font-bold text-green-600 mb-1">
                            {formatPercentage(savingsProjection[0].monthlySavings / savingsProjection[0].monthlyIncome)}
                          </div>
                          <p className="text-sm text-gray-600">of your monthly income goes to savings</p>
                        </div>
                        <div>
                          <h4 className="text-md font-medium text-gray-900 mb-2">Financial Progress</h4>
                          <div className="text-2xl font-bold text-blue-600 mb-1">
                            {savingsProjection[0].monthlySavings > 0 ? 'On Track' : 'Needs Improvement'}
                          </div>
                          <p className="text-sm text-gray-600">
                            {savingsProjection[0].monthlySavings > 0 
                              ? `Building wealth at ${formatCurrency(savingsProjection[0].monthlySavings)}/month`
                              : 'Consider reducing expenses or increasing income'
                            }
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Custom Fund Allocation */}
                    {savingsProjection[0].monthlySavings > 0 && (
                      <div className="bg-white border-2 border-gray-100 p-6 rounded-lg">
                        <div className="flex items-center justify-between mb-6">
                          <h4 className="text-lg font-medium text-gray-900 flex items-center">
                            <svg className="h-5 w-5 mr-2 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                            </svg>
                            Allocate Your Savings
                          </h4>
                          <button
                            onClick={() => {
                              const name = prompt('Enter fund name:');
                              if (name) addCustomFund(name);
                            }}
                            className="bg-purple-600 text-white px-3 py-1 rounded-md text-sm hover:bg-purple-700 transition-colors"
                          >
                            + Add Fund
                          </button>
                        </div>

                        {/* Quick Preset Buttons */}
                        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                          <div className="flex flex-wrap gap-2">
                            <button
                              onClick={resetAllFunds}
                              className="bg-red-100 text-red-700 px-3 py-1 rounded-md text-sm hover:bg-red-200 transition-colors border border-red-200"
                            >
                              🔄 Reset All (0%)
                            </button>
                            <button
                              onClick={applyEqualDistribution}
                              className="bg-blue-100 text-blue-700 px-3 py-1 rounded-md text-sm hover:bg-blue-200 transition-colors border border-blue-200"
                            >
                              ⚖️ Equal Split
                            </button>
                            {customFunds.length >= 3 && (
                              <button
                                onClick={apply50_30_20Rule}
                                className="bg-green-100 text-green-700 px-3 py-1 rounded-md text-sm hover:bg-green-200 transition-colors border border-green-200"
                              >
                                📊 50/30/20 Rule
                              </button>
                            )}
                          </div>
                          <p className="text-xs text-gray-500 mt-2">
                            Quick presets to help you get started with your allocation
                          </p>
                        </div>

                        {/* Fund Allocation Controls */}
                        <div className="mb-4">
                          <p className="text-sm text-gray-600 bg-blue-50 p-3 rounded-md border-l-4 border-blue-400">
                            💡 <strong>Smart Allocation:</strong> Adjusting one fund automatically redistributes the remaining percentage among other funds to maintain 100% allocation.
                          </p>
                          {customFunds.every(fund => fund.percentage === 0) && (
                            <div className="mt-2 p-3 bg-yellow-50 border-l-4 border-yellow-400 rounded-md">
                              <p className="text-sm text-yellow-700">
                                🎯 <strong>Getting Started:</strong> Use the sliders below to allocate your savings, or try one of the quick presets above!
                              </p>
                            </div>
                          )}
                        </div>
                        <div className="space-y-4 mb-6">
                          {customFunds.map(fund => (
                            <div key={fund.id} className={`p-4 rounded-lg border-2 transition-all ${
                              fund.percentage > 0 
                                ? 'bg-white border-gray-200 shadow-sm' 
                                : 'bg-gray-50 border-gray-100'
                            }`}>
                              <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center space-x-3">
                                  <div 
                                    className="w-5 h-5 rounded-full border-2 border-white shadow-sm"
                                    style={{ backgroundColor: fund.color }}
                                  />
                                  <span className="font-medium text-gray-900">{fund.name}</span>
                                </div>
                                <button
                                  onClick={() => removeCustomFund(fund.id)}
                                  className="text-red-400 hover:text-red-600 text-lg font-bold w-6 h-6 flex items-center justify-center rounded-full hover:bg-red-50 transition-colors"
                                  title="Remove fund"
                                >
                                  ×
                                </button>
                              </div>
                              
                              <div className="space-y-2">
                                <div className="flex items-center space-x-4">
                                  <div className="flex-1">
                                    <input
                                      type="range"
                                      min="0"
                                      max="100"
                                      value={fund.percentage}
                                      onChange={(e) => updateFundPercentage(fund.id, parseInt(e.target.value))}
                                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                                      style={{
                                        background: `linear-gradient(to right, ${fund.color} 0%, ${fund.color} ${fund.percentage}%, #e5e7eb ${fund.percentage}%, #e5e7eb 100%)`
                                      }}
                                    />
                                  </div>
                                  <div className="flex items-center space-x-3">
                                    <div className="w-12 text-center">
                                      <span className="text-lg font-bold text-gray-700">{fund.percentage}%</span>
                                    </div>
                                    <div className="w-24 text-right">
                                      <span className="text-sm font-semibold text-green-600">
                                        {formatCurrency(((savingsProjection[0]?.monthlySavings || 0) * fund.percentage) / 100)}
                                      </span>
                                      <div className="text-xs text-gray-400">per month</div>
                                    </div>
                                  </div>
                                </div>
                                
                                {/* Quick action buttons for individual funds */}
                                <div className="flex space-x-2 text-xs">
                                  {fund.percentage === 0 && (
                                    <>
                                      <button
                                        onClick={() => updateFundPercentage(fund.id, 25)}
                                        className="px-2 py-1 bg-gray-100 text-gray-600 rounded hover:bg-gray-200 transition-colors"
                                      >
                                        25%
                                      </button>
                                      <button
                                        onClick={() => updateFundPercentage(fund.id, 50)}
                                        className="px-2 py-1 bg-gray-100 text-gray-600 rounded hover:bg-gray-200 transition-colors"
                                      >
                                        50%
                                      </button>
                                    </>
                                  )}
                                  <button
                                    onClick={() => updateFundPercentage(fund.id, 100)}
                                    className="px-2 py-1 bg-purple-100 text-purple-600 rounded hover:bg-purple-200 transition-colors"
                                  >
                                    All (100%)
                                  </button>
                                  {fund.percentage > 0 && (
                                    <button
                                      onClick={() => updateFundPercentage(fund.id, 0)}
                                      className="px-2 py-1 bg-red-100 text-red-600 rounded hover:bg-red-200 transition-colors"
                                    >
                                      Clear (0%)
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                          
                          {/* Total Allocation Indicator */}
                          <div className="flex justify-center">
                            <div className="bg-green-100 border border-green-300 px-4 py-2 rounded-lg">
                              <div className="flex items-center space-x-2">
                                <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                </svg>
                                <span className="text-sm font-medium text-green-700">
                                  Total Allocated: {customFunds.reduce((sum, fund) => sum + fund.percentage, 0)}%
                                </span>
                                {customFunds.reduce((sum, fund) => sum + fund.percentage, 0) === 100 && (
                                  <span className="text-xs text-green-600 bg-green-200 px-2 py-1 rounded-full">
                                    ✓ Fully Allocated
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Fund Allocation Charts */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                          {/* Allocation Pie Chart */}
                          <div>
                            <h5 className="text-md font-medium text-gray-900 mb-4">Fund Distribution</h5>
                            {fundAllocationData ? (
                              <div className="h-64">
                                <Pie 
                                  data={fundAllocationData} 
                                  options={{
                                    responsive: true,
                                    maintainAspectRatio: false,
                                    plugins: {
                                      legend: {
                                        position: 'bottom'
                                      }
                                    }
                                  }}
                                />
                              </div>
                            ) : (
                              <div className="h-64 flex items-center justify-center bg-gray-50 rounded-md">
                                <p className="text-gray-500 text-sm">Set fund percentages to see distribution</p>
                              </div>
                            )}
                          </div>

                          {/* Fund Growth Chart */}
                          <div>
                            <h5 className="text-md font-medium text-gray-900 mb-4">Fund Growth Over Time</h5>
                            {fundGrowthData && fundGrowthData.datasets.some(d => d.data.some(v => v > 0)) ? (
                              <div className="h-64">
                                <Line 
                                  data={fundGrowthData} 
                                  options={{
                                    responsive: true,
                                    maintainAspectRatio: false,
                                    plugins: {
                                      legend: {
                                        position: 'bottom'
                                      }
                                    },
                                    scales: {
                                      y: {
                                        beginAtZero: true,
                                        ticks: {
                                          callback: function(value) {
                                            return '$' + Number(value).toLocaleString();
                                          }
                                        }
                                      }
                                    }
                                  }} 
                                />
                              </div>
                            ) : (
                              <div className="h-64 flex items-center justify-center bg-gray-50 rounded-md">
                                <p className="text-gray-500 text-sm">Allocate funds to see growth projections</p>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Fund Summary Cards */}
                        {customFunds.some(f => f.percentage > 0) && (
                          <div className="mt-6">
                            <h5 className="text-md font-medium text-gray-900 mb-4">12-Month Fund Projections</h5>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                              {customFunds.filter(f => f.percentage > 0).map(fund => (
                                <div key={fund.id} className="bg-white border rounded-lg p-4">
                                  <div className="flex items-center space-x-2 mb-2">
                                    <div 
                                      className="w-3 h-3 rounded-full"
                                      style={{ backgroundColor: fund.color }}
                                    />
                                    <span className="font-medium text-gray-900 text-sm">{fund.name}</span>
                                  </div>
                                  <div className="text-lg font-bold" style={{ color: fund.color }}>
                                    {formatCurrency(
                                      fundProjections.length > 0 
                                        ? fundProjections[fundProjections.length - 1]?.cumulativeFundAllocations[fund.id] || 0
                                        : 0
                                    )}
                                  </div>
                                  <div className="text-sm text-gray-600">
                                    {formatCurrency(((savingsProjection[0]?.monthlySavings || 0) * fund.percentage) / 100)}/month
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <ChartBarIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">Complete your salary and budget information to see savings projections</p>
                  </div>
                )}
              </div>
            </Tab.Panel>
          </Tab.Panels>
        </Tab.Group>
      </div>
    </div>
  );
}