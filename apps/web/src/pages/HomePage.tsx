import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Tab } from '@headlessui/react';
import { 
  HomeIcon, 
  UserPlusIcon, 
  UsersIcon,
  ChartBarIcon,
  CurrencyDollarIcon,
  PencilIcon,
  TrashIcon,
  EyeIcon
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
import { Pie, Bar } from 'react-chartjs-2';

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

interface HouseholdMember {
  id: string;
  name: string;
  role: string; // 'head', 'spouse', 'child', 'other'
  age?: number;
  isWorking: boolean;
  financialData?: {
    grossSalary: number;
    netIncome: number;
    monthlyExpenses: number;
    monthlySavings: number;
    yearlySavings?: number;
    savingsRate?: number;
    taxBreakdown?: any;
    budgetData?: any;
    customExpenses?: any[];
    formState?: any;
    savingsProjection?: any[];
    customFunds?: any[];
    lastUpdated?: string;
    hasCompleteData?: boolean;
    isFinalized?: boolean;
    profileCompleted?: boolean;
  };
}

interface HouseholdSummary {
  totalMembers: number;
  workingMembers: number;
  membersWithData: number;
  totalGrossIncome: number;
  totalNetIncome: number;
  totalExpenses: number;
  totalSavings: number;
  savingsRate: number;
  monthlyNetIncome: number;
  monthlyExpenses: number;
  monthlySavings: number;
}

function classNames(...classes: string[]) {
  return classes.filter(Boolean).join(' ');
}

export function HomePage() {
  const [householdMembers, setHouseholdMembers] = useState<HouseholdMember[]>([]);
  const [isAddingMember, setIsAddingMember] = useState(false);
  const [editingMember, setEditingMember] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState(0);
  const [expandedMembers, setExpandedMembers] = useState<Set<string>>(new Set());
  const [isInitialLoaded, setIsInitialLoaded] = useState(false);

  // New member form state
  const [newMember, setNewMember] = useState({
    name: '',
    role: 'other',
    age: '',
    isWorking: false
  });

  // Load data from localStorage on mount
  useEffect(() => {
    console.log('🔄 HomePage: Component mounted, loading data...');
    const savedMembers = localStorage.getItem('householdMembers');
    console.log('💾 HomePage: Raw localStorage data:', savedMembers);
    
    if (savedMembers && savedMembers !== '[]' && savedMembers !== 'null') {
      try {
        const parsedMembers = JSON.parse(savedMembers);
        console.log('✅ HomePage: Successfully parsed members:', parsedMembers);
        if (Array.isArray(parsedMembers) && parsedMembers.length > 0) {
          setHouseholdMembers(parsedMembers);
          console.log('✅ HomePage: Set household members state with', parsedMembers.length, 'members');
        } else {
          console.log('⚠️ HomePage: Parsed data is empty array or invalid');
        }
      } catch (error) {
        console.error('❌ HomePage: Error parsing saved members:', error);
      }
    } else {
      console.log('ℹ️ HomePage: No valid saved members found');
    }
    setIsInitialLoaded(true);
  }, []);

  // Save to localStorage whenever members change (but only after initial load)
  useEffect(() => {
    if (!isInitialLoaded) {
      console.log('⏳ HomePage: Skipping save - waiting for initial load');
      return;
    }
    
    console.log('💾 HomePage: Attempting to save members:', householdMembers.length, 'members');
    console.log('📝 HomePage: Members data:', householdMembers);
    
    try {
      localStorage.setItem('householdMembers', JSON.stringify(householdMembers));
      const verification = localStorage.getItem('householdMembers');
      console.log('✅ HomePage: Save successful, verification:', verification);
    } catch (error) {
      console.error('❌ HomePage: Error saving to localStorage:', error);
    }
  }, [householdMembers, isInitialLoaded]);

  // Listen for financial data updates from Salary page
  useEffect(() => {
    const handleDataUpdate = (event: CustomEvent) => {
      const { memberId, financialData } = event.detail;
      updateMemberFinancials(memberId, financialData);
    };

    // Also listen for storage changes from other tabs/windows
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === 'householdMembers' && event.newValue) {
        try {
          const updatedMembers = JSON.parse(event.newValue);
          setHouseholdMembers(updatedMembers);
        } catch (error) {
          console.error('Error parsing updated household members:', error);
        }
      }
    };

    // Add periodic refresh to ensure data consistency
    const refreshInterval = setInterval(() => {
      const savedMembers = localStorage.getItem('householdMembers');
      if (savedMembers) {
        try {
          const currentMembers = JSON.parse(savedMembers);
          // Only update if there are actual differences to prevent unnecessary re-renders
          if (JSON.stringify(currentMembers) !== JSON.stringify(householdMembers)) {
            setHouseholdMembers(currentMembers);
          }
        } catch (error) {
          console.error('Error refreshing household members:', error);
        }
      }
    }, 2000); // Check every 2 seconds

    window.addEventListener('householdDataUpdated', handleDataUpdate as EventListener);
    window.addEventListener('storage', handleStorageChange);
    
    return () => {
      window.removeEventListener('householdDataUpdated', handleDataUpdate as EventListener);
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(refreshInterval);
    };
  }, [householdMembers]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatPercentage = (rate: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'percent',
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    }).format(rate);
  };

  const addMember = () => {
    console.log('➕ HomePage: addMember called with form data:', newMember);
    
    if (!newMember.name.trim()) {
      console.log('❌ HomePage: addMember aborted - no name provided');
      alert('Please enter a member name');
      return;
    }

    const member: HouseholdMember = {
      id: Date.now().toString(),
      name: newMember.name.trim(),
      role: newMember.role,
      ...(newMember.age && { age: parseInt(newMember.age) }),
      isWorking: newMember.isWorking,
      ...(newMember.isWorking && {
        financialData: {
          grossSalary: 0,
          netIncome: 0,
          monthlyExpenses: 0,
          monthlySavings: 0
        }
      })
    };

    console.log('👤 HomePage: Created new member object:', member);
    console.log('📊 HomePage: Current members before adding:', householdMembers);
    console.log('📊 HomePage: Current members count:', householdMembers.length);
    
    const newMembers = [...householdMembers, member];
    console.log('📋 HomePage: New members array:', newMembers);
    console.log('📋 HomePage: New members count:', newMembers.length);
    
    console.log('🔄 HomePage: Setting household members state...');
    setHouseholdMembers(newMembers);
    
    // Clear form
    setNewMember({ name: '', role: 'other', age: '', isWorking: false });
    setIsAddingMember(false);
    
    console.log('✅ HomePage: Member addition process completed!');
    
    // Add a small delay to check if state was set correctly
    setTimeout(() => {
      console.log('🕐 HomePage: Checking state after timeout...');
      const currentData = localStorage.getItem('householdMembers');
      console.log('🕐 HomePage: localStorage after member addition:', currentData);
    }, 1000);
  };

  const removeMember = (id: string) => {
    setHouseholdMembers(householdMembers.filter(member => member.id !== id));
  };

  // Function to update member financials (will be used when integrating with Salary page)
  const updateMemberFinancials = (memberId: string, financialData: any) => {
    setHouseholdMembers(members => 
      members.map(member => 
        member.id === memberId 
          ? { ...member, financialData }
          : member
      )
    );
  };

  // Expose updateMemberFinancials for future use
  (window as any).updateMemberFinancials = updateMemberFinancials;

  const toggleMemberExpanded = (memberId: string) => {
    setExpandedMembers(prev => {
      const newSet = new Set(prev);
      if (newSet.has(memberId)) {
        newSet.delete(memberId);
      } else {
        newSet.add(memberId);
      }
      return newSet;
    });
  };

  const calculateHouseholdSummary = (): HouseholdSummary => {
    // Get working members with complete financial data
    const workingMembers = householdMembers.filter(m => 
      m.isWorking && m.financialData && m.financialData.hasCompleteData
    );
    
    // Calculate totals from members with complete data
    const totalGrossIncome = workingMembers.reduce((sum, m) => 
      sum + (m.financialData?.grossSalary || 0), 0
    );
    
    const totalNetIncome = workingMembers.reduce((sum, m) => 
      sum + (m.financialData?.netIncome || 0), 0
    );
    
    // Use monthly expenses * 12 to get annual expenses
    const totalExpenses = workingMembers.reduce((sum, m) => 
      sum + (m.financialData?.monthlyExpenses || 0) * 12, 0
    );
    
    // Use yearly savings if available, otherwise calculate from monthly
    const totalSavings = workingMembers.reduce((sum, m) => 
      sum + (m.financialData?.yearlySavings || (m.financialData?.monthlySavings || 0) * 12), 0
    );

    // Calculate household savings rate
    const savingsRate = totalNetIncome > 0 ? (totalSavings / totalNetIncome) * 100 : 0;

    return {
      totalMembers: householdMembers.length,
      workingMembers: workingMembers.length,
      membersWithData: workingMembers.length,
      totalGrossIncome,
      totalNetIncome,
      totalExpenses,
      totalSavings,
      savingsRate,
      monthlyNetIncome: totalNetIncome / 12,
      monthlyExpenses: totalExpenses / 12,
      monthlySavings: totalSavings / 12
    };
  };

  const getIncomeDistributionData = () => {
    const workingMembers = householdMembers.filter(m => m.isWorking && m.financialData);
    
    if (workingMembers.length === 0) return null;

    return {
      labels: workingMembers.map(m => m.name),
      datasets: [{
        data: workingMembers.map(m => m.financialData?.netIncome || 0),
        backgroundColor: [
          '#3b82f6', // blue
          '#ef4444', // red
          '#10b981', // green
          '#f59e0b', // amber
          '#8b5cf6', // purple
          '#06b6d4', // cyan
          '#f97316', // orange
          '#84cc16', // lime
        ],
        borderWidth: 2,
        borderColor: '#ffffff'
      }]
    };
  };

  const getSavingsComparisonData = () => {
    const workingMembers = householdMembers.filter(m => m.isWorking && m.financialData);
    
    if (workingMembers.length === 0) return null;

    return {
      labels: workingMembers.map(m => m.name),
      datasets: [
        {
          label: 'Monthly Income',
          data: workingMembers.map(m => (m.financialData?.netIncome || 0) / 12),
          backgroundColor: '#3b82f6',
        },
        {
          label: 'Monthly Expenses',
          data: workingMembers.map(m => m.financialData?.monthlyExpenses || 0),
          backgroundColor: '#ef4444',
        },
        {
          label: 'Monthly Savings',
          data: workingMembers.map(m => m.financialData?.monthlySavings || 0),
          backgroundColor: '#10b981',
        }
      ]
    };
  };

  const summary = calculateHouseholdSummary();
  const incomeDistribution = getIncomeDistributionData();
  const savingsComparison = getSavingsComparisonData();

  const tabs = ['Household Overview', 'Members Management', 'Financial Summary'];

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <HomeIcon className="h-8 w-8 text-blue-600" />
            <h1 className="text-3xl font-bold text-gray-900">Household Financial Dashboard</h1>
          </div>
          <p className="text-gray-600">
            Manage your household members and track combined financial progress
          </p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center">
              <UsersIcon className="h-8 w-8 text-blue-500" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Members</p>
                <p className="text-2xl font-bold text-gray-900">{summary.totalMembers}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center">
              <CurrencyDollarIcon className="h-8 w-8 text-green-500" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Combined Income</p>
                <p className="text-2xl font-bold text-gray-900">{formatCurrency(summary.totalNetIncome / 12)}</p>
                <p className="text-xs text-gray-500">per month</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center">
              <ChartBarIcon className="h-8 w-8 text-purple-500" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Monthly Savings</p>
                <p className="text-2xl font-bold text-gray-900">{formatCurrency(summary.totalSavings / 12)}</p>
                <p className="text-xs text-gray-500">
                  {formatPercentage(summary.savingsRate)} rate
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center">
              <UserPlusIcon className="h-8 w-8 text-amber-500" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Working Members</p>
                <p className="text-2xl font-bold text-gray-900">{summary.workingMembers}</p>
                <p className="text-xs text-gray-500">of {summary.totalMembers} total</p>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content Tabs */}
        <Tab.Group selectedIndex={activeTab} onChange={setActiveTab}>
          <Tab.List className="flex space-x-1 rounded-xl bg-blue-900/20 p-1 mb-8">
            {tabs.map((tab) => (
              <Tab
                key={tab}
                className={({ selected }) =>
                  classNames(
                    'w-full rounded-lg py-2.5 text-sm font-medium leading-5',
                    'ring-white ring-opacity-60 ring-offset-2 ring-offset-blue-400 focus:outline-none focus:ring-2',
                    selected
                      ? 'bg-white text-blue-700 shadow'
                      : 'text-blue-100 hover:bg-white/[0.12] hover:text-white'
                  )
                }
              >
                {tab}
              </Tab>
            ))}
          </Tab.List>

          <Tab.Panels>
            {/* Household Overview Panel */}
            <Tab.Panel>
              {/* Data Status and Validation Summary */}
              <div className="mb-6 bg-white p-6 rounded-lg shadow-sm border">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Household Data Status</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">{summary.totalMembers}</div>
                    <div className="text-sm text-gray-600">Total Members</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">{summary.membersWithData}</div>
                    <div className="text-sm text-gray-600">Complete Data</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-orange-600">
                      {summary.workingMembers - summary.membersWithData}
                    </div>
                    <div className="text-sm text-gray-600">Needs Setup</div>
                  </div>
                </div>
                
                {summary.workingMembers > summary.membersWithData && (
                  <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <div className="ml-3">
                        <h4 className="text-sm font-medium text-yellow-800">
                          Incomplete Financial Data
                        </h4>
                        <div className="mt-1 text-sm text-yellow-700">
                          {summary.workingMembers - summary.membersWithData} working member(s) need financial setup.
                          <span className="block mt-1 font-medium">
                            Complete their profiles for accurate household calculations.
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {summary.membersWithData > 0 && (
                  <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t">
                    <div className="text-center">
                      <div className="text-lg font-semibold text-gray-900">
                        {formatCurrency(summary.monthlyNetIncome)}
                      </div>
                      <div className="text-xs text-gray-600">Monthly Income</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-semibold text-red-600">
                        {formatCurrency(summary.monthlyExpenses)}
                      </div>
                      <div className="text-xs text-gray-600">Monthly Expenses</div>
                    </div>
                    <div className="text-center">
                      <div className={`text-lg font-semibold ${
                        summary.monthlySavings >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {formatCurrency(summary.monthlySavings)}
                      </div>
                      <div className="text-xs text-gray-600">Monthly Savings</div>
                    </div>
                    <div className="text-center">
                      <div className={`text-lg font-semibold ${
                        summary.savingsRate >= 20 ? 'text-green-600' : 
                        summary.savingsRate >= 10 ? 'text-yellow-600' : 'text-red-600'
                      }`}>
                        {summary.savingsRate.toFixed(1)}%
                      </div>
                      <div className="text-xs text-gray-600">Savings Rate</div>
                    </div>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Income Distribution Chart */}
                <div className="bg-white p-6 rounded-lg shadow-sm border">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Income Distribution</h3>
                  {incomeDistribution ? (
                    <div className="h-64">
                      <Pie 
                        data={incomeDistribution} 
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
                    <div className="h-64 flex items-center justify-center text-gray-500">
                      <div className="text-center">
                        <UsersIcon className="h-12 w-12 mx-auto mb-2 opacity-50" />
                        <p>Add working members to see income distribution</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Financial Comparison Chart */}
                <div className="bg-white p-6 rounded-lg shadow-sm border">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Monthly Financial Comparison</h3>
                  {savingsComparison ? (
                    <div className="h-64">
                      <Bar 
                        data={savingsComparison} 
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
                    <div className="h-64 flex items-center justify-center text-gray-500">
                      <div className="text-center">
                        <ChartBarIcon className="h-12 w-12 mx-auto mb-2 opacity-50" />
                        <p>Add member financial data to see comparison</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Household Members Summary */}
              <div className="mt-6 bg-white p-6 rounded-lg shadow-sm border">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Members Overview</h3>
                {householdMembers.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {householdMembers.map(member => (
                      <div key={member.id} className="border rounded-lg p-5 hover:bg-gray-50 transition-colors">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <h4 className="font-semibold text-gray-900">{member.name}</h4>
                            <p className="text-sm text-gray-500 capitalize">{member.role}</p>
                            {member.age && (
                              <p className="text-sm text-gray-500">Age: {member.age}</p>
                            )}
                          </div>
                          <div className="flex flex-col items-end space-y-2">
                            <span className={`px-2 py-1 text-xs rounded-full ${
                              member.isWorking 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-gray-100 text-gray-600'
                            }`}>
                              {member.isWorking ? 'Working' : 'Non-working'}
                            </span>
                            {member.financialData?.isFinalized ? (
                              <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-800 border border-green-200">
                                🎯 Profile Complete
                              </span>
                            ) : member.financialData?.hasCompleteData ? (
                              <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800">
                                ✓ Data Available
                              </span>
                            ) : null}
                          </div>
                        </div>
                        
                        {member.isWorking && (
                          <div className="space-y-3">
                            {member.financialData?.hasCompleteData ? (
                              <>
                                {/* Financial Summary */}
                                <div className="bg-gray-50 rounded-lg p-3 space-y-2">
                                  <div className="flex justify-between items-center">
                                    <span className="text-sm font-medium text-gray-700">Gross Salary:</span>
                                    <span className="text-sm font-semibold text-gray-900">
                                      {formatCurrency(member.financialData.grossSalary || 0)}
                                    </span>
                                  </div>
                                  <div className="flex justify-between items-center">
                                    <span className="text-sm font-medium text-gray-700">Net Income:</span>
                                    <span className="text-sm font-semibold text-gray-900">
                                      {formatCurrency(member.financialData.netIncome || 0)}
                                    </span>
                                  </div>
                                  <div className="flex justify-between items-center">
                                    <span className="text-sm font-medium text-gray-700">Monthly Take-home:</span>
                                    <span className="text-sm font-semibold text-green-700">
                                      {formatCurrency((member.financialData.netIncome || 0) / 12)}
                                    </span>
                                  </div>
                                  
                                  {/* Tax Information */}
                                  {member.financialData.taxBreakdown && (
                                    <div className="pt-2 border-t border-gray-200">
                                      <div className="flex justify-between items-center">
                                        <span className="text-xs text-gray-600">Federal Tax:</span>
                                        <span className="text-xs font-medium text-gray-800">
                                          {formatCurrency(member.financialData.taxBreakdown.federalTax || 0)}
                                        </span>
                                      </div>
                                      <div className="flex justify-between items-center">
                                        <span className="text-xs text-gray-600">State Tax:</span>
                                        <span className="text-xs font-medium text-gray-800">
                                          {formatCurrency(member.financialData.taxBreakdown.stateTax || 0)}
                                        </span>
                                      </div>
                                      {member.financialData.taxBreakdown.cityTax > 0 && (
                                        <div className="flex justify-between items-center">
                                          <span className="text-xs text-gray-600">City Tax:</span>
                                          <span className="text-xs font-medium text-gray-800">
                                            {formatCurrency(member.financialData.taxBreakdown.cityTax)}
                                          </span>
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>

                                {/* Monthly Budget Overview */}
                                <div className="space-y-2">
                                  <div className="flex justify-between items-center">
                                    <span className="text-sm text-gray-600">Monthly Expenses:</span>
                                    <span className="text-sm font-medium text-red-600">
                                      -{formatCurrency(member.financialData.monthlyExpenses || 0)}
                                    </span>
                                  </div>
                                  <div className="flex justify-between items-center">
                                    <span className="text-sm text-gray-600">Monthly Savings:</span>
                                    <span className={`text-sm font-medium ${
                                      (member.financialData.monthlySavings || 0) >= 0 
                                        ? 'text-green-600' 
                                        : 'text-red-600'
                                    }`}>
                                      {formatCurrency(member.financialData.monthlySavings || 0)}
                                    </span>
                                  </div>
                                  {member.financialData.savingsRate !== undefined && (
                                    <div className="flex justify-between items-center">
                                      <span className="text-sm text-gray-600">Savings Rate:</span>
                                      <span className={`text-sm font-medium ${
                                        (member.financialData.savingsRate || 0) >= 20 
                                          ? 'text-green-600' 
                                          : (member.financialData.savingsRate || 0) >= 10
                                            ? 'text-yellow-600'
                                            : 'text-red-600'
                                      }`}>
                                        {(member.financialData.savingsRate || 0).toFixed(1)}%
                                      </span>
                                    </div>
                                  )}

                                  {/* Fund Allocation Summary */}
                                  {member.financialData.customFunds && member.financialData.customFunds.length > 0 && (
                                    <div className="pt-2 border-t border-gray-200">
                                      <div className="text-xs text-gray-600 mb-1">Investment Allocation:</div>
                                      <div className="space-y-1">
                                        {member.financialData.customFunds.slice(0, 3).map((fund, idx) => (
                                          <div key={idx} className="flex justify-between items-center">
                                            <span className="text-xs text-gray-600 truncate max-w-20">
                                              {fund.name}:
                                            </span>
                                            <span className="text-xs font-medium text-blue-600">
                                              {fund.percentage.toFixed(1)}%
                                            </span>
                                          </div>
                                        ))}
                                        {member.financialData.customFunds.length > 3 && (
                                          <div className="text-xs text-gray-500 text-center">
                                            +{member.financialData.customFunds.length - 3} more funds
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  )}

                                  {/* Budget Categories Summary */}
                                  {member.financialData.budgetData && Object.keys(member.financialData.budgetData).length > 0 && (
                                    <div className="pt-2 border-t border-gray-200">
                                      <div className="text-xs text-gray-600 mb-1">Top Expenses:</div>
                                      <div className="space-y-1">
                                        {Object.entries(member.financialData.budgetData)
                                          .filter(([_, value]) => value && parseFloat(value as string) > 0)
                                          .sort(([,a], [,b]) => parseFloat(b as string) - parseFloat(a as string))
                                          .slice(0, 3)
                                          .map(([category, amount]) => (
                                            <div key={category} className="flex justify-between items-center">
                                              <span className="text-xs text-gray-600 capitalize truncate max-w-20">
                                                {category.replace(/([A-Z])/g, ' $1').toLowerCase()}:
                                              </span>
                                              <span className="text-xs font-medium text-gray-800">
                                                {formatCurrency(parseFloat(amount as string))}
                                              </span>
                                            </div>
                                          ))}
                                      </div>
                                    </div>
                                  )}
                                </div>

                                {/* Action Buttons */}
                                {/* Expandable Detailed View */}
                                {expandedMembers.has(member.id) && (
                                  <div className="pt-3 border-t border-gray-200 space-y-3">
                                    {/* Yearly Projections */}
                                    {member.financialData.yearlySavings && (
                                      <div className="bg-blue-50 rounded-lg p-3">
                                        <div className="text-sm font-medium text-blue-900 mb-2">Annual Projections</div>
                                        <div className="space-y-1">
                                          <div className="flex justify-between items-center">
                                            <span className="text-xs text-blue-700">Yearly Savings:</span>
                                            <span className="text-xs font-semibold text-blue-900">
                                              {formatCurrency(member.financialData.yearlySavings)}
                                            </span>
                                          </div>
                                          <div className="flex justify-between items-center">
                                            <span className="text-xs text-blue-700">Total Expenses:</span>
                                            <span className="text-xs font-semibold text-blue-900">
                                              {formatCurrency((member.financialData.monthlyExpenses || 0) * 12)}
                                            </span>
                                          </div>
                                        </div>
                                      </div>
                                    )}

                                    {/* Complete Budget Breakdown */}
                                    {member.financialData.budgetData && Object.keys(member.financialData.budgetData).length > 0 && (
                                      <div className="bg-gray-50 rounded-lg p-3">
                                        <div className="text-sm font-medium text-gray-900 mb-2">Budget Breakdown</div>
                                        <div className="grid grid-cols-2 gap-2">
                                          {Object.entries(member.financialData.budgetData)
                                            .filter(([_, value]) => value && parseFloat(value as string) > 0)
                                            .map(([category, amount]) => (
                                              <div key={category} className="text-xs">
                                                <div className="text-gray-600 capitalize truncate">
                                                  {category.replace(/([A-Z])/g, ' $1').toLowerCase()}
                                                </div>
                                                <div className="font-medium text-gray-900">
                                                  {formatCurrency(parseFloat(amount as string))}
                                                </div>
                                              </div>
                                            ))}
                                        </div>
                                      </div>
                                    )}

                                    {/* Custom Expenses */}
                                    {member.financialData.customExpenses && member.financialData.customExpenses.length > 0 && (
                                      <div className="bg-orange-50 rounded-lg p-3">
                                        <div className="text-sm font-medium text-orange-900 mb-2">Custom Expenses</div>
                                        <div className="space-y-1">
                                          {member.financialData.customExpenses.map((expense, idx) => (
                                            <div key={idx} className="flex justify-between items-center">
                                              <span className="text-xs text-orange-700 truncate max-w-24">
                                                {expense.name}:
                                              </span>
                                              <span className="text-xs font-medium text-orange-900">
                                                {formatCurrency(parseFloat(expense.value) || 0)}
                                              </span>
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    )}

                                    {/* Complete Fund Allocation */}
                                    {member.financialData.customFunds && member.financialData.customFunds.length > 0 && (
                                      <div className="bg-green-50 rounded-lg p-3">
                                        <div className="text-sm font-medium text-green-900 mb-2">Investment Portfolio</div>
                                        <div className="space-y-1">
                                          {member.financialData.customFunds.map((fund, idx) => (
                                            <div key={idx} className="flex justify-between items-center">
                                              <span className="text-xs text-green-700 truncate max-w-24">
                                                {fund.name}:
                                              </span>
                                              <span className="text-xs font-medium text-green-900">
                                                {fund.percentage.toFixed(1)}%
                                              </span>
                                            </div>
                                          ))}
                                          <div className="pt-1 border-t border-green-200">
                                            <div className="flex justify-between items-center">
                                              <span className="text-xs text-green-700">Total Allocated:</span>
                                              <span className="text-xs font-semibold text-green-900">
                                                {member.financialData.customFunds.reduce((sum, f) => sum + f.percentage, 0).toFixed(1)}%
                                              </span>
                                            </div>
                                          </div>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                )}

                                {/* Action Buttons */}
                                <div className="pt-2 border-t space-y-2">
                                  <div className="flex space-x-2">
                                    <Link
                                      to={`/salary?memberId=${member.id}`}
                                      className={`flex-1 text-sm font-medium py-2 px-3 rounded-md text-center transition-colors ${
                                        member.financialData?.isFinalized
                                          ? 'bg-green-600 text-white hover:bg-green-700'
                                          : 'bg-blue-600 text-white hover:bg-blue-700'
                                      }`}
                                    >
                                      {member.financialData?.isFinalized 
                                        ? '✅ View Profile' 
                                        : '📊 Update Details'
                                      }
                                    </Link>
                                    <button
                                      onClick={() => toggleMemberExpanded(member.id)}
                                      className="px-3 py-2 text-sm bg-gray-100 text-gray-700 hover:bg-gray-200 rounded-md transition-colors"
                                    >
                                      <EyeIcon className="h-4 w-4" />
                                    </button>
                                  </div>
                                  {member.financialData.lastUpdated && (
                                    <p className="text-xs text-gray-500 text-center">
                                      Last updated: {new Date(member.financialData.lastUpdated).toLocaleDateString()}
                                    </p>
                                  )}
                                </div>
                              </>
                            ) : (
                              <div className="text-center py-4">
                                <div className="text-gray-400 mb-2">
                                  <ChartBarIcon className="h-8 w-8 mx-auto" />
                                </div>
                                <p className="text-sm text-gray-500 mb-3">No financial data available</p>
                                <Link
                                  to={`/salary?memberId=${member.id}`}
                                  className="inline-block bg-green-600 text-white text-sm font-medium py-2 px-4 rounded-md hover:bg-green-700 transition-colors"
                                >
                                  💰 Set Up Finances
                                </Link>
                              </div>
                            )}
                          </div>
                        )}

                        {!member.isWorking && (
                          <div className="text-center py-3">
                            <p className="text-sm text-gray-500">Non-working member</p>
                            <p className="text-xs text-gray-400 mt-1">No financial planning needed</p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <UsersIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No household members added yet</p>
                    <button
                      onClick={() => setActiveTab(1)}
                      className="mt-2 text-blue-600 hover:text-blue-700 font-medium"
                    >
                      Add your first member
                    </button>
                  </div>
                )}
              </div>
            </Tab.Panel>

            {/* Members Management Panel */}
            <Tab.Panel>
              <div className="space-y-6">
                {/* Add Member Section */}
                <div className="bg-white p-6 rounded-lg shadow-sm border">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-medium text-gray-900">Household Members</h3>
                    <button
                      onClick={() => setIsAddingMember(true)}
                      className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
                    >
                      <UserPlusIcon className="h-4 w-4" />
                      Add Member
                    </button>
                  </div>

                  {/* Add Member Form */}
                  {isAddingMember && (
                    <div className="bg-gray-50 p-4 rounded-lg mb-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Name
                          </label>
                          <input
                            type="text"
                            value={newMember.name}
                            onChange={(e) => setNewMember({...newMember, name: e.target.value})}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black placeholder-gray-400"
                            placeholder="Enter member name"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Role
                          </label>
                          <select
                            value={newMember.role}
                            onChange={(e) => setNewMember({...newMember, role: e.target.value})}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black"
                          >
                            <option value="head">Head of Household</option>
                            <option value="spouse">Spouse/Partner</option>
                            <option value="child">Child</option>
                            <option value="other">Other</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Age (Optional)
                          </label>
                          <input
                            type="number"
                            value={newMember.age}
                            onChange={(e) => setNewMember({...newMember, age: e.target.value})}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black placeholder-gray-400"
                            placeholder="Age"
                            min="0"
                            max="120"
                          />
                        </div>

                        <div className="flex items-center">
                          <input
                            type="checkbox"
                            id="isWorking"
                            checked={newMember.isWorking}
                            onChange={(e) => setNewMember({...newMember, isWorking: e.target.checked})}
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                          />
                          <label htmlFor="isWorking" className="ml-2 block text-sm text-gray-900">
                            This person has income
                          </label>
                        </div>
                      </div>

                      <div className="flex gap-3 mt-4">
                        <button
                          onClick={addMember}
                          disabled={!newMember.name.trim()}
                          className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                        >
                          Add Member
                        </button>
                        <button
                          onClick={() => {
                            setIsAddingMember(false);
                            setNewMember({ name: '', role: 'other', age: '', isWorking: false });
                          }}
                          className="bg-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-400"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Members List */}
                  <div className="space-y-4">
                    {householdMembers.map(member => (
                      <div key={member.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                        <div className="flex-1">
                          <div className="flex items-center gap-3">
                            <div>
                              <h4 className="font-medium text-gray-900">{member.name}</h4>
                              <div className="flex items-center gap-2 text-sm text-gray-500">
                                <span className="capitalize">{member.role}</span>
                                {member.age && <span>• Age {member.age}</span>}
                                <span className={`px-2 py-1 text-xs rounded-full ${
                                  member.isWorking 
                                    ? 'bg-green-100 text-green-800' 
                                    : 'bg-gray-100 text-gray-600'
                                }`}>
                                  {member.isWorking ? 'Working' : 'Non-working'}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          {member.isWorking && (
                            <a
                              href={`/salary?memberId=${member.id}`}
                              className="flex items-center gap-1 text-blue-600 hover:text-blue-700 px-3 py-1 border border-blue-200 rounded-md hover:bg-blue-50"
                            >
                              <EyeIcon className="h-4 w-4" />
                              Manage Finances
                            </a>
                          )}
                          
                          <button
                            onClick={() => setEditingMember(member.id === editingMember ? null : member.id)}
                            className="text-gray-600 hover:text-gray-700 p-1"
                          >
                            <PencilIcon className="h-4 w-4" />
                          </button>
                          
                          <button
                            onClick={() => removeMember(member.id)}
                            className="text-red-600 hover:text-red-700 p-1"
                          >
                            <TrashIcon className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    ))}

                    {householdMembers.length === 0 && !isAddingMember && (
                      <div className="text-center py-8 text-gray-500">
                        <UsersIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>No household members yet</p>
                        <p className="text-sm">Click "Add Member" to get started</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </Tab.Panel>

            {/* Financial Summary Panel */}
            <Tab.Panel>
              <div className="space-y-6">
                {/* Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-white p-6 rounded-lg shadow-sm border">
                    <h4 className="text-sm font-medium text-gray-600 mb-2">Annual Gross Income</h4>
                    <p className="text-2xl font-bold text-gray-900">{formatCurrency(summary.totalGrossIncome)}</p>
                    <p className="text-sm text-gray-500">{formatCurrency(summary.totalGrossIncome / 12)} per month</p>
                  </div>

                  <div className="bg-white p-6 rounded-lg shadow-sm border">
                    <h4 className="text-sm font-medium text-gray-600 mb-2">Annual Net Income</h4>
                    <p className="text-2xl font-bold text-blue-600">{formatCurrency(summary.totalNetIncome)}</p>
                    <p className="text-sm text-gray-500">{formatCurrency(summary.totalNetIncome / 12)} per month</p>
                  </div>

                  <div className="bg-white p-6 rounded-lg shadow-sm border">
                    <h4 className="text-sm font-medium text-gray-600 mb-2">Annual Expenses</h4>
                    <p className="text-2xl font-bold text-red-600">{formatCurrency(summary.totalExpenses)}</p>
                    <p className="text-sm text-gray-500">{formatCurrency(summary.totalExpenses / 12)} per month</p>
                  </div>

                  <div className="bg-white p-6 rounded-lg shadow-sm border">
                    <h4 className="text-sm font-medium text-gray-600 mb-2">Annual Savings</h4>
                    <p className="text-2xl font-bold text-green-600">{formatCurrency(summary.totalSavings)}</p>
                    <p className="text-sm text-gray-500">{formatCurrency(summary.totalSavings / 12)} per month</p>
                  </div>
                </div>

                {/* Member Details Table */}
                {householdMembers.filter(m => m.isWorking).length > 0 && (
                  <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
                    <div className="px-6 py-4 border-b">
                      <h3 className="text-lg font-medium text-gray-900">Individual Member Breakdown</h3>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Member
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Gross Income
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Net Income
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Monthly Expenses
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Monthly Savings
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Savings Rate
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {householdMembers.filter(m => m.isWorking).map(member => {
                            const data = member.financialData;
                            const savingsRate = data?.netIncome ? (data.monthlySavings * 12) / data.netIncome : 0;
                            
                            return (
                              <tr key={member.id}>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <div>
                                    <div className="text-sm font-medium text-gray-900">{member.name}</div>
                                    <div className="text-sm text-gray-500 capitalize">{member.role}</div>
                                  </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                  {formatCurrency(data?.grossSalary || 0)}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                  {formatCurrency(data?.netIncome || 0)}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                  {formatCurrency(data?.monthlyExpenses || 0)}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600 font-medium">
                                  {formatCurrency(data?.monthlySavings || 0)}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                  {formatPercentage(savingsRate)}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {householdMembers.filter(m => m.isWorking).length === 0 && (
                  <div className="bg-white p-8 rounded-lg shadow-sm border text-center">
                    <ChartBarIcon className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No Financial Data Yet</h3>
                    <p className="text-gray-600 mb-4">
                      Add household members with income and set up their financial profiles to see the summary.
                    </p>
                    <button
                      onClick={() => setActiveTab(1)}
                      className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
                    >
                      Manage Members
                    </button>
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

export default HomePage;