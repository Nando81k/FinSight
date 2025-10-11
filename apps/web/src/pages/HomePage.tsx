import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Tab } from '@headlessui/react';
import { useAuth } from '../context/AuthContext';
import { 
  HomeIcon, 
  UserPlusIcon, 
  UsersIcon,
  UserIcon,
  ChartBarIcon,
  CurrencyDollarIcon,
  PencilIcon,
  TrashIcon,
  EyeIcon,
  ArrowsPointingOutIcon,
  XMarkIcon
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
import { Pie, Bar, Doughnut, Line } from 'react-chartjs-2';
import AIAssistant from '../components/AIAssistant';
import EnhancedAnalytics from '../components/EnhancedAnalytics';
import GoalTracking from '../components/GoalTracking';
import { addUserGoal } from '../services/goalService';
import { getUserFinancialData, updateUserSpendingCategories } from '../services/financialDataService';

interface CustomFund {
  id: string;
  name: string;
  percentage: number;
  color: string;
  isCompounding?: boolean; // Default to false (non-compounding)
}

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



export function HomePage() {
  const { user } = useAuth();
  const [householdMembers, setHouseholdMembers] = useState<HouseholdMember[]>([]);
  const [isAddingMember, setIsAddingMember] = useState(false);
  const [editingMember, setEditingMember] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState(0);

  const [isInitialLoaded, setIsInitialLoaded] = useState(false);
  const [fullscreenFund, setFullscreenFund] = useState<string | null>(null);
  const [selectedMemberModal, setSelectedMemberModal] = useState<HouseholdMember | null>(null);
  const [toast, setToast] = useState<{message: string, type: 'success' | 'info' | 'error'} | null>(null);

  // Helper function to get user-specific localStorage key
  const getUserStorageKey = (key: string) => {
    if (!user?.id) {
      console.warn('No user ID available, using anonymous key');
      return `anonymous_${key}`;
    }
    return `user_${user.id}_${key}`;
  };

  // Clear any old non-user-specific data when user logs in
  useEffect(() => {
    if (user?.id) {
      // Clear old shared data to ensure fresh start for new users
      const oldData = localStorage.getItem('householdMembers');
      if (oldData && !oldData.includes(`user_${user.id}_`)) {
        localStorage.removeItem('householdMembers');
        console.log('Cleared old shared localStorage data for security');
      }
    }
  }, [user?.id]);

  // New member form state
  const [newMember, setNewMember] = useState({
    name: '',
    role: 'other',
    age: '',
    isWorking: false
  });

  // Load data from localStorage on mount (user-specific)
  useEffect(() => {
    if (!user?.id) {
      console.log('⏳ HomePage: Waiting for user authentication...');
      return;
    }

    console.log('🔄 HomePage: Component mounted, loading user-specific data...');
    const userStorageKey = getUserStorageKey('householdMembers');
    const savedMembers = localStorage.getItem(userStorageKey);
    console.log('[STORAGE] HomePage: Loading from user-specific key:', userStorageKey);
    console.log('[STORAGE] HomePage: Raw localStorage data:', savedMembers);
    
    if (savedMembers && savedMembers !== '[]' && savedMembers !== 'null') {
      try {
        const parsedMembers = JSON.parse(savedMembers);
        console.log('[SUCCESS] HomePage: Successfully parsed members:', parsedMembers);
        if (Array.isArray(parsedMembers) && parsedMembers.length > 0) {
          setHouseholdMembers(parsedMembers);
          console.log('[SUCCESS] HomePage: Set household members state with', parsedMembers.length, 'members');
        } else {
          console.log('[WARNING] HomePage: Parsed data is empty array or invalid');
        }
      } catch (error) {
        console.error('[ERROR] HomePage: Error parsing saved members:', error);
      }
    } else {
      console.log('[INFO] HomePage: No valid saved members found for user');
    }
    setIsInitialLoaded(true);
  }, [user?.id]);

  // Save to localStorage whenever members change (but only after initial load and with user auth)
  useEffect(() => {
    if (!isInitialLoaded || !user?.id) {
      console.log('⏳ HomePage: Skipping save - waiting for initial load and user authentication');
      return;
    }
    
    console.log('[STORAGE] HomePage: Attempting to save members:', householdMembers.length, 'members');
    console.log('[DATA] HomePage: Members data:', householdMembers);
    
    try {
      const userStorageKey = getUserStorageKey('householdMembers');
      localStorage.setItem(userStorageKey, JSON.stringify(householdMembers));
      const verification = localStorage.getItem(userStorageKey);
      console.log('[SUCCESS] HomePage: Save successful to user-specific key:', userStorageKey);
      console.log('[SUCCESS] HomePage: Save verification:', verification);
    } catch (error) {
      console.error('[ERROR] HomePage: Error saving to localStorage:', error);
    }
  }, [householdMembers, isInitialLoaded, user?.id]);

  // Listen for financial data updates from Salary page
  useEffect(() => {
    const handleDataUpdate = (event: CustomEvent) => {
      const { memberId, financialData } = event.detail;
      updateMemberFinancials(memberId, financialData);
    };

    // Also listen for storage changes from other tabs/windows (user-specific)
    const handleStorageChange = (event: StorageEvent) => {
      if (!user?.id) return;
      
      const userStorageKey = getUserStorageKey('householdMembers');
      if (event.key === userStorageKey && event.newValue) {
        try {
          const updatedMembers = JSON.parse(event.newValue);
          setHouseholdMembers(updatedMembers);
        } catch (error) {
          console.error('Error parsing updated household members:', error);
        }
      }
    };

    // Add periodic refresh to ensure data consistency (user-specific)
    const refreshInterval = setInterval(() => {
      if (!user?.id) return;
      
      const userStorageKey = getUserStorageKey('householdMembers');
      const savedMembers = localStorage.getItem(userStorageKey);
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
  }, [householdMembers, user?.id]);

  // AI Event Listeners and Visual Feedback
  useEffect(() => {
    const handleGoalsUpdated = (event: CustomEvent) => {
      showToast('🎯 AI created a new financial goal!', 'success');
      // Force re-render of goal components
      setTimeout(() => {
        window.dispatchEvent(new Event('resize'));
      }, 100);
    };

    const handleFinancialDataUpdated = (event: CustomEvent) => {
      showToast('💰 AI updated your budget allocation!', 'success');
      // Force refresh of financial data
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    };

    const handleHouseholdDataUpdated = (event: CustomEvent) => {
      const { type } = event.detail;
      if (type === 'savings_updated') {
        showToast('💵 AI updated your savings plan!', 'success');
      } else if (type === 'budget_optimized') {
        showToast('📊 AI optimized your budget using the 50/30/20 rule!', 'success');
      } else if (type === 'custom_fund_created') {
        showToast('🎯 AI created a custom savings fund!', 'success');
      } else if (type === 'expense_added') {
        showToast('💳 AI added a new expense to your budget!', 'success');
      } else if (type === 'expense_reduced') {
        showToast('✂️ AI reduced your expenses to save money!', 'success');
      } else if (type === 'profile_updated') {
        showToast('👤 AI updated a member\'s financial profile!', 'success');
      }
      // Refresh the page after a short delay to show updates
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    };

    window.addEventListener('goalsUpdated', handleGoalsUpdated as EventListener);
    window.addEventListener('financialDataUpdated', handleFinancialDataUpdated as EventListener);
    window.addEventListener('householdDataUpdated', handleHouseholdDataUpdated as EventListener);

    return () => {
      window.removeEventListener('goalsUpdated', handleGoalsUpdated as EventListener);
      window.removeEventListener('financialDataUpdated', handleFinancialDataUpdated as EventListener);
      window.removeEventListener('householdDataUpdated', handleHouseholdDataUpdated as EventListener);
    };
  }, []);

  // Toast notification function
  const showToast = (message: string, type: 'success' | 'info' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000); // Auto-hide after 4 seconds
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // AI Assistant Callback Functions
  const handleCreateGoal = (goalData: {
    title: string;
    targetAmount: number;
    currentAmount: number;
    targetDate?: string;
    category: string;
  }) => {
    if (!user?.id) return;
    
    try {
      const newGoal = addUserGoal(user.id, {
        title: goalData.title,
        description: `AI-generated goal: ${goalData.title}`,
        targetAmount: goalData.targetAmount,
        targetDate: goalData.targetDate || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(), // 1 year from now
        category: goalData.category.toLowerCase() as any
      });
      
      // Trigger a refresh of goals data throughout the app
      window.dispatchEvent(new CustomEvent('goalsUpdated', { detail: newGoal }));
    } catch (error) {
      console.error('Failed to create goal:', error);
    }
  };

  const handleAdjustBudget = (adjustments: {
    category: string;
    oldAmount: number;
    newAmount: number;
  }[]) => {
    if (!user?.id) return;
    
    try {
      // Get current financial data
      const currentData = getUserFinancialData(user.id, 5000, 3500, 1500); // Default values, will be overridden by stored data
      
      // Update spending categories based on adjustments
      const updatedCategories = currentData.spendingCategories.map(cat => {
        const adjustment = adjustments.find(adj => adj.category.toLowerCase().includes(cat.name.toLowerCase()));
        if (adjustment) {
          return {
            ...cat,
            amount: adjustment.newAmount,
            percentage: (adjustment.newAmount / currentData.monthlyExpenses) * 100
          };
        }
        return cat;
      });
      
      updateUserSpendingCategories(user.id, updatedCategories);
      
      // Trigger a refresh of financial data throughout the app
      window.dispatchEvent(new CustomEvent('financialDataUpdated', { detail: updatedCategories }));
    } catch (error) {
      console.error('Failed to adjust budget:', error);
    }
  };

  const handleSetSavings = (monthlyAmount: number) => {
    if (!user?.id) return;
    
    // This would typically update a member's savings allocation
    // For now, we'll update the first working member's savings
    const workingMember = householdMembers.find(m => m.isWorking);
    if (workingMember && workingMember.financialData) {
      const updatedMember = {
        ...workingMember,
        financialData: {
          ...workingMember.financialData,
          monthlySavings: monthlyAmount
        }
      };
      
      const updatedMembers = householdMembers.map(m => 
        m.id === workingMember.id ? updatedMember : m
      );
      
      setHouseholdMembers(updatedMembers);
      localStorage.setItem(getUserStorageKey('householdMembers'), JSON.stringify(updatedMembers));
      
      // Dispatch event to notify other components
      window.dispatchEvent(new CustomEvent('householdDataUpdated', {
        detail: { type: 'savings_updated', data: updatedMembers }
      }));
    }
  };

  const handleOptimizeBudget = (allocation: {
    needs: number;
    wants: number;
    savings: number;
  }) => {
    if (!user?.id) return;
    
    // Update the first working member's budget allocation based on 50/30/20 rule
    const workingMember = householdMembers.find(m => m.isWorking);
    if (workingMember && workingMember.financialData) {

      
      const updatedMember = {
        ...workingMember,
        financialData: {
          ...workingMember.financialData,
          monthlyExpenses: allocation.needs + allocation.wants,
          monthlySavings: allocation.savings
        }
      };
      
      const updatedMembers = householdMembers.map(m => 
        m.id === workingMember.id ? updatedMember : m
      );
      
      setHouseholdMembers(updatedMembers);
      localStorage.setItem(getUserStorageKey('householdMembers'), JSON.stringify(updatedMembers));
      
      // Dispatch event to notify other components
      window.dispatchEvent(new CustomEvent('householdDataUpdated', {
        detail: { type: 'budget_optimized', data: updatedMembers }
      }));
    }
  };

  // New AI Assistant Callback Functions for Enhanced Features
  const handleCreateCustomFund = (fund: {
    memberId: string;
    name: string;
    percentage: number;
    description?: string;
    targetAmount?: number;
  }) => {
    if (!user?.id) return;
    
    try {
      // Find the member and add the custom fund
      const member = householdMembers.find(m => m.id === fund.memberId);
      if (!member || !member.financialData) {
        console.error('Member not found or has no financial data');
        return;
      }

      const newFund = {
        id: Date.now().toString(),
        name: fund.name,
        percentage: fund.percentage,
        description: fund.description || `AI-created fund: ${fund.name}`,
        targetAmount: fund.targetAmount,
        monthlyAmount: (member.financialData.monthlySavings * fund.percentage) / 100,
        createdBy: 'AI Assistant',
        createdAt: new Date().toISOString()
      };

      const updatedMember = {
        ...member,
        financialData: {
          ...member.financialData,
          customFunds: [...(member.financialData.customFunds || []), newFund]
        }
      };

      const updatedMembers = householdMembers.map(m => 
        m.id === fund.memberId ? updatedMember : m
      );

      setHouseholdMembers(updatedMembers);
      localStorage.setItem(getUserStorageKey('householdMembers'), JSON.stringify(updatedMembers));

      // Dispatch event to notify other components
      window.dispatchEvent(new CustomEvent('householdDataUpdated', {
        detail: { type: 'custom_fund_created', data: updatedMembers }
      }));
    } catch (error) {
      console.error('Failed to create custom fund:', error);
    }
  };

  const handleAddMemberExpense = (expense: {
    memberId: string;
    category: string;
    amount: number;
    description: string;
    recurring: boolean;
  }) => {
    if (!user?.id) return;
    
    try {
      // Find the member and add the expense
      const member = householdMembers.find(m => m.id === expense.memberId);
      if (!member || !member.financialData) {
        console.error('Member not found or has no financial data');
        return;
      }

      const newExpense = {
        id: Date.now().toString(),
        category: expense.category,
        amount: expense.amount,
        description: expense.description,
        recurring: expense.recurring,
        frequency: expense.recurring ? 'monthly' : 'one-time',
        addedBy: 'AI Assistant',
        addedAt: new Date().toISOString()
      };

      // Update member's monthly expenses
      const monthlyImpact = expense.recurring ? expense.amount : expense.amount / 12; // Spread one-time over year
      
      const updatedMember = {
        ...member,
        financialData: {
          ...member.financialData,
          monthlyExpenses: member.financialData.monthlyExpenses + monthlyImpact,
          customExpenses: [...(member.financialData.customExpenses || []), newExpense]
        }
      };

      const updatedMembers = householdMembers.map(m => 
        m.id === expense.memberId ? updatedMember : m
      );

      setHouseholdMembers(updatedMembers);
      localStorage.setItem(getUserStorageKey('householdMembers'), JSON.stringify(updatedMembers));

      // Dispatch event to notify other components
      window.dispatchEvent(new CustomEvent('householdDataUpdated', {
        detail: { type: 'expense_added', data: updatedMembers }
      }));
    } catch (error) {
      console.error('Failed to add member expense:', error);
    }
  };

  const handleReduceMemberExpense = (expense: {
    memberId: string;
    category: string;
    reductionAmount: number;
    description: string;
  }) => {
    if (!user?.id) return;
    
    try {
      // Find the member and reduce expenses
      const member = householdMembers.find(m => m.id === expense.memberId);
      if (!member || !member.financialData) {
        console.error('Member not found or has no financial data');
        return;
      }

      // Reduce monthly expenses (ensure it doesn't go negative)
      const newMonthlyExpenses = Math.max(0, member.financialData.monthlyExpenses - expense.reductionAmount);
      
      // Add a record of the reduction
      const reductionRecord = {
        id: Date.now().toString(),
        category: expense.category,
        amount: -expense.reductionAmount, // Negative to indicate reduction
        description: expense.description,
        recurring: true,
        frequency: 'monthly',
        addedBy: 'AI Assistant',
        addedAt: new Date().toISOString(),
        type: 'reduction'
      };

      const updatedMember = {
        ...member,
        financialData: {
          ...member.financialData,
          monthlyExpenses: newMonthlyExpenses,
          customExpenses: [...(member.financialData.customExpenses || []), reductionRecord]
        }
      };

      const updatedMembers = householdMembers.map(m => 
        m.id === expense.memberId ? updatedMember : m
      );

      setHouseholdMembers(updatedMembers);
      localStorage.setItem(getUserStorageKey('householdMembers'), JSON.stringify(updatedMembers));

      // Dispatch event to notify other components
      window.dispatchEvent(new CustomEvent('householdDataUpdated', {
        detail: { type: 'expense_reduced', data: updatedMembers }
      }));
    } catch (error) {
      console.error('Failed to reduce member expense:', error);
    }
  };

  const handleUpdateMemberProfile = (update: {
    memberId: string;
    field: 'salary' | 'expenses' | 'savings' | 'profile';
    value: any;
    description: string;
  }) => {
    if (!user?.id) return;
    
    try {
      // Find the member and update the specified field
      const member = householdMembers.find(m => m.id === update.memberId);
      if (!member) {
        console.error('Member not found');
        return;
      }

      let updatedMember = { ...member };

      switch (update.field) {
        case 'salary':
          if (updatedMember.financialData) {
            updatedMember.financialData = {
              ...updatedMember.financialData,
              grossSalary: update.value,
              netIncome: update.value * 0.75, // Rough estimate of net income
              lastUpdated: new Date().toISOString()
            };
          }
          break;
        case 'expenses':
          if (updatedMember.financialData) {
            updatedMember.financialData = {
              ...updatedMember.financialData,
              monthlyExpenses: update.value,
              lastUpdated: new Date().toISOString()
            };
          }
          break;
        case 'savings':
          if (updatedMember.financialData) {
            updatedMember.financialData = {
              ...updatedMember.financialData,
              monthlySavings: update.value,
              lastUpdated: new Date().toISOString()
            };
          }
          break;
        case 'profile':
          updatedMember = { ...updatedMember, ...update.value };
          break;
      }

      const updatedMembers = householdMembers.map(m => 
        m.id === update.memberId ? updatedMember : m
      );

      setHouseholdMembers(updatedMembers);
      localStorage.setItem(getUserStorageKey('householdMembers'), JSON.stringify(updatedMembers));

      // Dispatch event to notify other components
      window.dispatchEvent(new CustomEvent('householdDataUpdated', {
        detail: { type: 'profile_updated', data: updatedMembers }
      }));
    } catch (error) {
      console.error('Failed to update member profile:', error);
    }
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
      console.log('[ERROR] HomePage: addMember aborted - no name provided');
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
    console.log('[DATA] HomePage: Current members before adding:', householdMembers);
    console.log('[DATA] HomePage: Current members count:', householdMembers.length);
    
    const newMembers = [...householdMembers, member];
    console.log('[DATA] HomePage: New members array:', newMembers);
    console.log('[DATA] HomePage: New members count:', newMembers.length);
    
    console.log('🔄 HomePage: Setting household members state...');
    setHouseholdMembers(newMembers);
    
    // Clear form
    setNewMember({ name: '', role: 'other', age: '', isWorking: false });
    setIsAddingMember(false);
    
    console.log('[SUCCESS] HomePage: Member addition process completed!');
    
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

  const getHouseholdFundsData = () => {
    const workingMembers = householdMembers.filter(m => m.isWorking && m.financialData?.customFunds);
    
    if (workingMembers.length === 0) return null;

    // Aggregate all fund allocations with detailed member contributions
    const fundMap = new Map<string, { 
      total: number; 
      color: string; 
      isCompounding: boolean;
      memberContributions: { name: string; amount: number; percentage: number; savingsRate: number }[] 
    }>();
    
    workingMembers.forEach(member => {
      const memberSavings = member.financialData?.monthlySavings || 0;
      
      if (member.financialData?.customFunds && memberSavings > 0) {
        member.financialData.customFunds.forEach(fund => {
          if (fund.percentage > 0) {
            const fundAmount = (memberSavings * fund.percentage) / 100;
            const contributionData = {
              name: member.name,
              amount: fundAmount,
              percentage: fund.percentage,
              savingsRate: memberSavings > 0 ? (fundAmount / memberSavings) * 100 : 0
            };
            
            if (fundMap.has(fund.name)) {
              const existing = fundMap.get(fund.name)!;
              existing.total += fundAmount;
              existing.memberContributions.push(contributionData);
            } else {
              fundMap.set(fund.name, {
                total: fundAmount,
                color: fund.color || '#6366f1',
                isCompounding: fund.isCompounding ?? (fund.name === 'Investment Fund'), // Only "Investment Fund" is compounding by default
                memberContributions: [contributionData]
              });
            }
          }
        });
      }
    });

    if (fundMap.size === 0) return null;

    const sortedFunds = Array.from(fundMap.entries())
      .sort(([,a], [,b]) => b.total - a.total);

    return {
      labels: sortedFunds.map(([name]) => name),
      datasets: [{
        data: sortedFunds.map(([, data]) => data.total),
        backgroundColor: sortedFunds.map(([, data]) => data.color),
        borderWidth: 2,
        borderColor: '#ffffff'
      }],
      fundDetails: Object.fromEntries(sortedFunds)
    };
  };

  const getHouseholdFundsSummary = () => {
    const workingMembers = householdMembers.filter(m => m.isWorking && m.financialData?.customFunds);
    
    if (workingMembers.length === 0) return null;

    let totalMonthlyAllocation = 0;
    let totalHouseholdSavings = 0;
    const fundDetails: { [fundName: string]: { monthlyAmount: number; contributors: string[] } } = {};

    workingMembers.forEach(member => {
      const memberSavings = member.financialData?.monthlySavings || 0;
      totalHouseholdSavings += memberSavings;
      
      if (member.financialData?.customFunds && memberSavings > 0) {
        member.financialData.customFunds.forEach(fund => {
          if (fund.percentage > 0) {
            const fundAmount = (memberSavings * fund.percentage) / 100;
            totalMonthlyAllocation += fundAmount;
            
            if (fundDetails[fund.name]) {
              fundDetails[fund.name]!.monthlyAmount += fundAmount;
              fundDetails[fund.name]!.contributors.push(member.name);
            } else {
              fundDetails[fund.name] = {
                monthlyAmount: fundAmount,
                contributors: [member.name]
              };
            }
          }
        });
      }
    });

    return {
      totalMonthlyAllocation,
      totalHouseholdSavings,
      allocationPercentage: totalHouseholdSavings > 0 ? (totalMonthlyAllocation / totalHouseholdSavings) * 100 : 0,
      fundDetails: Object.entries(fundDetails)
        .sort(([,a], [,b]) => b.monthlyAmount - a.monthlyAmount)
        .slice(0, 5) // Top 5 funds
    };
  };

  const calculateFundGrowthProjection = (monthlyContribution: number, annualReturnRate: number = 0.07, years: number = 20, isCompounding: boolean = false) => {
    const monthlyRate = annualReturnRate / 12;
    const totalMonths = years * 12;
    const labels: string[] = [];
    const values: number[] = [];
    
    let currentBalance = 0;
    
    // Calculate growth for each year
    for (let year = 0; year <= years; year++) {
      labels.push(year === 0 ? 'Now' : `Year ${year}`);
      values.push(currentBalance);
      
      if (isCompounding) {
        // Compound growth: apply returns to both contributions and existing balance
        for (let month = 0; month < 12 && (year * 12 + month) < totalMonths; month++) {
          currentBalance = (currentBalance + monthlyContribution) * (1 + monthlyRate);
        }
      } else {
        // Non-compound: only add contributions, no returns applied
        for (let month = 0; month < 12 && (year * 12 + month) < totalMonths; month++) {
          currentBalance += monthlyContribution;
        }
      }
    }
    
    return { labels, values };
  };

  const getFundGrowthAssumptions = () => {
    return {
      'Conservative': 0.04,    // 4% annual return
      'Moderate': 0.07,        // 7% annual return  
      'Aggressive': 0.10,      // 10% annual return
      'Tech/Growth': 0.12,     // 12% annual return
      'Bond': 0.03,            // 3% annual return
      'Real Estate': 0.08,     // 8% annual return
      'International': 0.06,   // 6% annual return
      'Crypto': 0.15,          // 15% annual return (high volatility)
    };
  };

  const getDefaultFundReturnRate = (fundName: string) => {
    const assumptions = getFundGrowthAssumptions();
    const lowerFundName = fundName.toLowerCase();
    
    // Pattern matching for fund types
    if (lowerFundName.includes('tech') || lowerFundName.includes('growth')) return assumptions['Tech/Growth'];
    if (lowerFundName.includes('bond')) return assumptions['Bond'];
    if (lowerFundName.includes('real estate') || lowerFundName.includes('reit')) return assumptions['Real Estate'];
    if (lowerFundName.includes('international') || lowerFundName.includes('global')) return assumptions['International'];
    if (lowerFundName.includes('crypto') || lowerFundName.includes('bitcoin')) return assumptions['Crypto'];
    if (lowerFundName.includes('conservative')) return assumptions['Conservative'];
    if (lowerFundName.includes('aggressive')) return assumptions['Aggressive'];
    
    // Default to moderate
    return assumptions['Moderate'];
  };

  const summary = calculateHouseholdSummary();
  const incomeDistribution = getIncomeDistributionData();
  const savingsComparison = getSavingsComparisonData();

  const tabs = ['Household Overview', 'Members Management', 'Financial Summary', 'Analytics', 'Goals'];

  return (
    <div className="h-screen w-full bg-gray-50 dark:bg-gray-900 overflow-y-auto overflow-x-hidden transition-colors duration-200">
      <div className="w-full min-h-full px-4 py-4 max-w-none">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-4">
            <HomeIcon className="h-8 w-8 text-blue-600 dark:text-blue-400" />
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Household Financial Dashboard</h1>
          </div>
          <p className="text-gray-600 dark:text-gray-300">
            Manage your household members and track combined financial progress
          </p>
        </div>



        {/* Main Content Tabs */}
        <Tab.Group selectedIndex={activeTab} onChange={setActiveTab}>
          <Tab.List className="flex space-x-1 rounded-xl bg-white dark:bg-gray-800 p-1 mb-8 shadow-sm border border-gray-200 dark:border-gray-600 transition-colors duration-200">
            {tabs.map((tab) => (
              <Tab
                key={tab}
                className={({ selected }) =>
                  `w-full rounded-lg py-4 px-6 text-sm font-medium leading-5 transition-all ring-white dark:ring-gray-800 ring-opacity-60 ring-offset-2 ring-offset-blue-400 focus:outline-none focus:ring-2 ${
                    selected
                      ? 'bg-blue-600 text-white shadow'
                      : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-gray-800 dark:hover:text-white'
                  }`
                }
              >
                {tab}
              </Tab>
            ))}
          </Tab.List>

          <Tab.Panels>
            {/* Household Overview Panel */}
            <Tab.Panel>
              {/* Enhanced Household Data Status */}
              <div className="mb-6 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-600 overflow-hidden transition-colors duration-200">
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 px-6 py-4 border-b border-gray-200 dark:border-gray-600">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                      <ChartBarIcon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                      Household Overview
                    </h3>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-gray-500">
                        {summary.membersWithData}/{summary.workingMembers} Complete
                      </span>
                      <div className="h-2 w-16 bg-gray-200 rounded-full overflow-hidden">
                        <div 
                          className={`h-full transition-all duration-300 ${
                            summary.workingMembers === 0 ? 'bg-gray-300' :
                            summary.membersWithData === summary.workingMembers ? 'bg-green-500' : 'bg-yellow-500'
                          }`}
                          style={{ 
                            width: summary.workingMembers === 0 ? '0%' : `${(summary.membersWithData / summary.workingMembers) * 100}%`
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-4">
                  {/* Compact Status Grid */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                    <div className="bg-blue-50 rounded-lg p-3 text-center">
                      <div className="flex items-center justify-center gap-1 mb-1">
                        <UsersIcon className="h-4 w-4 text-blue-600" />
                        <span className="text-lg font-bold text-blue-700">{summary.totalMembers}</span>
                      </div>
                      <div className="text-xs text-blue-600 font-medium">Total Members</div>
                    </div>
                    
                    <div className="bg-green-50 rounded-lg p-3 text-center">
                      <div className="flex items-center justify-center gap-1 mb-1">
                        <svg className="h-4 w-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span className="text-lg font-bold text-green-700">{summary.membersWithData}</span>
                      </div>
                      <div className="text-xs text-green-600 font-medium">Complete</div>
                    </div>
                    
                    <div className="bg-yellow-50 rounded-lg p-3 text-center">
                      <div className="flex items-center justify-center gap-1 mb-1">
                        <CurrencyDollarIcon className="h-4 w-4 text-yellow-600" />
                        <span className="text-lg font-bold text-yellow-700">{summary.workingMembers}</span>
                      </div>
                      <div className="text-xs text-yellow-600 font-medium">Working</div>
                    </div>
                    
                    <div className="bg-orange-50 rounded-lg p-3 text-center">
                      <div className="flex items-center justify-center gap-1 mb-1">
                        <svg className="h-4 w-4 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                        </svg>
                        <span className="text-lg font-bold text-orange-700">{summary.workingMembers - summary.membersWithData}</span>
                      </div>
                      <div className="text-xs text-orange-600 font-medium">Setup Needed</div>
                    </div>
                  </div>

                  {/* Financial Summary - Only show when there's data */}
                  {summary.membersWithData > 0 ? (
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Monthly Financial Summary</h4>
                        <span className="text-xs bg-white dark:bg-gray-700 px-2 py-1 rounded text-gray-600 dark:text-gray-300 transition-colors duration-200">
                          {summary.membersWithData} member{summary.membersWithData === 1 ? '' : 's'} included
                        </span>
                      </div>
                      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                        <div className="text-center">
                          <div className="text-sm font-bold text-green-700 dark:text-green-400">{formatCurrency(summary.monthlyNetIncome)}</div>
                          <div className="text-xs text-gray-600 dark:text-gray-400">Income</div>
                        </div>
                        <div className="text-center">
                          <div className="text-sm font-bold text-red-600 dark:text-red-400">{formatCurrency(summary.monthlyExpenses)}</div>
                          <div className="text-xs text-gray-600 dark:text-gray-400">Expenses</div>
                        </div>
                        <div className="text-center">
                          <div className={`text-sm font-bold ${summary.monthlySavings >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                            {formatCurrency(summary.monthlySavings)}
                          </div>
                          <div className="text-xs text-gray-600 dark:text-gray-400">Savings</div>
                        </div>
                        <div className="text-center">
                          <div className={`text-sm font-bold ${
                            summary.savingsRate >= 20 ? 'text-green-600 dark:text-green-400' : 
                            summary.savingsRate >= 10 ? 'text-yellow-600 dark:text-yellow-400' : 'text-red-600 dark:text-red-400'
                          }`}>
                            {summary.savingsRate.toFixed(1)}%
                          </div>
                          <div className="text-xs text-gray-600 dark:text-gray-400">Savings Rate</div>
                        </div>
                      </div>
                      
                      {/* Savings Rate Indicator Bar */}
                      <div className="mt-3 flex items-center gap-2">
                        <span className="text-xs text-gray-500 font-medium">Health:</span>
                        <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div 
                            className={`h-full transition-all duration-300 ${
                              summary.savingsRate >= 20 ? 'bg-green-500' :
                              summary.savingsRate >= 10 ? 'bg-yellow-500' :
                              summary.savingsRate >= 5 ? 'bg-orange-500' : 'bg-red-500'
                            }`}
                            style={{ width: `${Math.min(summary.savingsRate, 30)}%` }}
                          />
                        </div>
                        <span className={`text-xs font-semibold ${
                          summary.savingsRate >= 20 ? 'text-green-600' :
                          summary.savingsRate >= 10 ? 'text-yellow-600' : 'text-red-600'
                        }`}>
                          {summary.savingsRate >= 20 ? 'Excellent' :
                           summary.savingsRate >= 10 ? 'Good' :
                           summary.savingsRate >= 5 ? 'Fair' : 'Needs Improvement'}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-gray-50 rounded-lg p-4 text-center">
                      <div className="text-gray-500">
                        <ChartBarIcon className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <p className="text-sm font-medium mb-1">No Financial Data Available</p>
                        <p className="text-xs">Add working members and complete their profiles to see household financials.</p>
                      </div>
                    </div>
                  )}

                  {/* Action Alert - Only show when setup is needed */}
                  {summary.workingMembers > summary.membersWithData && (
                    <div className="mt-3 p-3 bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200 rounded-lg">
                      <div className="flex items-center gap-2">
                        <svg className="h-4 w-4 text-yellow-600 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-yellow-800">
                            {summary.workingMembers - summary.membersWithData} member{(summary.workingMembers - summary.membersWithData) === 1 ? '' : 's'} need{(summary.workingMembers - summary.membersWithData) === 1 ? 's' : ''} financial setup
                          </p>
                          <p className="text-xs text-yellow-700 mt-0.5">Complete profiles for accurate calculations</p>
                        </div>
                        <button
                          onClick={() => setActiveTab(1)}
                          className="text-xs bg-yellow-100 hover:bg-yellow-200 text-yellow-800 px-3 py-1 rounded-md font-medium transition-colors"
                        >
                          Setup Now
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Income Distribution Chart */}
                <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-600 transition-colors duration-200">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Income Distribution</h3>
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
                <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-600 transition-colors duration-200">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Monthly Financial Comparison</h3>
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
              <div className="mt-6 bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-600 transition-colors duration-200">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Members Overview</h3>
                <div className="overflow-x-auto">
                  <div className="flex gap-4 pb-2" style={{ minWidth: 'max-content' }}>
                    {householdMembers.map(member => (
                      <div key={member.id} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors flex-shrink-0 w-64">
                        {/* Compact Member Card Header */}
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex-1 min-w-0">
                            <h4 className="font-semibold text-gray-900 dark:text-white truncate">{member.name}</h4>
                            <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">{member.role}{member.age ? `, ${member.age}` : ''}</p>
                          </div>
                          <span className={`px-2 py-1 text-xs rounded-full flex-shrink-0 ${
                            member.isWorking 
                              ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300' 
                              : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                          }`}>
                            {member.isWorking ? 'Working' : 'Non-working'}
                          </span>
                        </div>

                        {/* Compact Financial Summary */}
                        {member.isWorking && member.financialData?.hasCompleteData ? (
                          <div className="space-y-2 mb-3">
                            <div className="flex justify-between items-center text-sm">
                              <span className="text-gray-600">Monthly Income:</span>
                              <span className="font-semibold text-green-700">
                                {formatCurrency((member.financialData.netIncome || 0) / 12)}
                              </span>
                            </div>
                            <div className="flex justify-between items-center text-sm">
                              <span className="text-gray-600">Monthly Savings:</span>
                              <span className={`font-medium ${
                                (member.financialData.monthlySavings || 0) >= 0 
                                  ? 'text-green-600' 
                                  : 'text-red-600'
                              }`}>
                                {formatCurrency(member.financialData.monthlySavings || 0)}
                              </span>
                            </div>
                            {member.financialData.savingsRate !== undefined && (
                              <div className="text-center">
                                <span className={`text-xs px-2 py-1 rounded-full ${
                                  (member.financialData.savingsRate || 0) >= 20 
                                    ? 'bg-green-100 text-green-800' 
                                    : (member.financialData.savingsRate || 0) >= 10
                                      ? 'bg-yellow-100 text-yellow-800'
                                      : 'bg-red-100 text-red-800'
                                }`}>
                                  {(member.financialData.savingsRate || 0).toFixed(1)}% savings rate
                                </span>
                              </div>
                            )}
                          </div>
                        ) : member.isWorking ? (
                          <div className="text-center py-2 mb-3">
                            <p className="text-xs text-gray-500">No financial data</p>
                          </div>
                        ) : (
                          <div className="text-center py-2 mb-3">
                            <p className="text-xs text-gray-500">Non-working member</p>
                          </div>
                        )}

                        {/* Action Buttons */}
                        <div className="flex space-x-2">
                          <button
                            onClick={() => setSelectedMemberModal(member)}
                            className="flex-1 text-xs font-medium py-2 px-3 rounded-md text-center transition-colors bg-blue-600 text-white hover:bg-blue-700"
                          >
                            View Details
                          </button>
                          {member.isWorking && (
                            <Link
                              to={`/salary?memberId=${member.id}`}
                              className="flex-1 text-xs font-medium py-2 px-3 rounded-md text-center transition-colors bg-green-600 text-white hover:bg-green-700"
                            >
                              {member.financialData?.hasCompleteData ? 'Edit Profile' : 'Set Up'}
                            </Link>
                          )}
                        </div>
                      </div>
                    ))}

                    {/* Add Member Card - Always last */}
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 hover:border-blue-400 hover:bg-blue-50 transition-colors flex-shrink-0 w-64">
                      <div className="flex flex-col items-center justify-center h-full min-h-[200px] text-center">
                        <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center mb-4">
                          <UserPlusIcon className="h-6 w-6 text-blue-600" />
                        </div>
                        <h4 className="font-semibold text-gray-900 mb-2">Add New Member</h4>
                        <p className="text-xs text-gray-500 mb-4">Add a household member to track their finances</p>
                        <button
                          onClick={() => setActiveTab(1)}
                          className="w-full text-sm font-medium py-2 px-4 rounded-md text-center transition-colors bg-blue-600 text-white hover:bg-blue-700"
                        >
                          Add Member
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </Tab.Panel>

            {/* Members Management Panel */}
            <Tab.Panel>
              <div className="space-y-6">
                {/* Add Member Section */}
                <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-600">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white">Household Members</h3>
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
                    <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg mb-6 border border-gray-200 dark:border-gray-600">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Name
                          </label>
                          <input
                            type="text"
                            value={newMember.name}
                            onChange={(e) => setNewMember({...newMember, name: e.target.value})}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
                            placeholder="Enter member name"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Role
                          </label>
                          <select
                            value={newMember.role}
                            onChange={(e) => setNewMember({...newMember, role: e.target.value})}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                          >
                            <option value="head">Head of Household</option>
                            <option value="spouse">Spouse/Partner</option>
                            <option value="child">Child</option>
                            <option value="other">Other</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Age (Optional)
                          </label>
                          <input
                            type="number"
                            value={newMember.age}
                            onChange={(e) => setNewMember({...newMember, age: e.target.value})}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
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
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800"
                          />
                          <label htmlFor="isWorking" className="ml-2 block text-sm text-gray-900 dark:text-white">
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
                          className="bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-300 px-4 py-2 rounded-md hover:bg-gray-400 dark:hover:bg-gray-500"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Members List */}
                  <div className="space-y-4">
                    {householdMembers.map(member => (
                      <div key={member.id} className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700">
                        <div className="flex-1">
                          <div className="flex items-center gap-3">
                            <div>
                              <h4 className="font-medium text-gray-900 dark:text-white">{member.name}</h4>
                              <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                                <span className="capitalize">{member.role}</span>
                                {member.age && <span>• Age {member.age}</span>}
                                <span className={`px-2 py-1 text-xs rounded-full ${
                                  member.isWorking 
                                    ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200' 
                                    : 'bg-gray-100 dark:bg-gray-600 text-gray-600 dark:text-gray-300'
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
                              className="flex items-center gap-1 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 px-3 py-1 border border-blue-200 dark:border-blue-700 rounded-md hover:bg-blue-50 dark:hover:bg-blue-900"
                            >
                              <EyeIcon className="h-4 w-4" />
                              Manage Finances
                            </a>
                          )}
                          
                          <button
                            onClick={() => setEditingMember(member.id === editingMember ? null : member.id)}
                            className="text-gray-600 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 p-1"
                          >
                            <PencilIcon className="h-4 w-4" />
                          </button>
                          
                          <button
                            onClick={() => removeMember(member.id)}
                            className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 p-1"
                          >
                            <TrashIcon className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    ))}

                    {householdMembers.length === 0 && !isAddingMember && (
                      <div className="text-center py-8 text-gray-500 dark:text-gray-400">
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
                  <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-600 transition-colors duration-200">
                    <h4 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">Annual Gross Income</h4>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{formatCurrency(summary.totalGrossIncome)}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{formatCurrency(summary.totalGrossIncome / 12)} per month</p>
                  </div>

                  <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-600 transition-colors duration-200">
                    <h4 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">Annual Net Income</h4>
                    <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{formatCurrency(summary.totalNetIncome)}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{formatCurrency(summary.totalNetIncome / 12)} per month</p>
                  </div>

                  <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-600 transition-colors duration-200">
                    <h4 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">Annual Expenses</h4>
                    <p className="text-2xl font-bold text-red-600 dark:text-red-400">{formatCurrency(summary.totalExpenses)}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{formatCurrency(summary.totalExpenses / 12)} per month</p>
                  </div>

                  <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-600 transition-colors duration-200">
                    <h4 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">Annual Savings</h4>
                    <p className="text-2xl font-bold text-green-600 dark:text-green-400">{formatCurrency(summary.totalSavings)}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{formatCurrency(summary.totalSavings / 12)} per month</p>
                  </div>
                </div>

                {/* Household Funds Allocation Chart */}
                {(() => {
                  const householdFundsData = getHouseholdFundsData();
                  const fundsSummary = getHouseholdFundsSummary();

                  if (!householdFundsData || !fundsSummary) return null;

                  return (
                    <div className="bg-white dark:bg-gray-800 shadow-sm border border-gray-200 dark:border-gray-600 rounded-lg transition-colors duration-200">
                      <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-600">
                        <h3 className="text-lg font-medium text-gray-900 dark:text-white flex items-center">
                          <svg className="w-5 h-5 mr-2 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                          </svg>
                          Household Fund Allocation
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Combined investment strategy across all household members</p>
                      </div>
                      <div className="px-6 py-6">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                          {/* Chart */}
                          <div className="flex justify-center">
                            <div style={{ width: '280px', height: '280px' }}>
                              <Doughnut
                                data={householdFundsData}
                                options={{
                                  responsive: true,
                                  maintainAspectRatio: false,
                                  plugins: {
                                    legend: {
                                      position: 'bottom' as const,
                                      labels: {
                                        usePointStyle: true,
                                        padding: 12,
                                        font: { size: 11 }
                                      }
                                    },
                                    tooltip: {
                                      callbacks: {
                                        title: (context: any) => {
                                          return context[0]?.label || '';
                                        },
                                        label: (context: any) => {
                                          const value = context.parsed || 0;
                                          const total = context.dataset.data.reduce((a: number, b: number) => a + b, 0);
                                          const percentage = ((value / total) * 100).toFixed(1);
                                          return `Total Monthly: $${value.toFixed(2)} (${percentage}%)`;
                                        },
                                        afterLabel: (context: any) => {
                                          const fundName = context.label || '';
                                          const fundData = householdFundsData?.fundDetails?.[fundName];
                                          
                                          if (!fundData?.memberContributions) return [];
                                          
                                          const lines = ['', 'Individual Contributions:'];
                                          fundData.memberContributions
                                            .sort((a, b) => b.amount - a.amount)
                                            .forEach((contrib) => {
                                              const shareOfFund = ((contrib.amount / fundData.total) * 100).toFixed(1);
                                              lines.push(`• ${contrib.name}: $${contrib.amount.toFixed(2)} (${shareOfFund}%)`);
                                            });
                                          
                                          return lines;
                                        }
                                      }
                                    }
                                  }
                                }}
                              />
                            </div>
                          </div>

                          {/* Summary Stats */}
                          <div className="space-y-4">
                            <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700 rounded-lg p-4">
                              <div className="flex items-center">
                                <div className="w-3 h-3 bg-blue-500 rounded-full mr-3"></div>
                                <div>
                                  <p className="text-sm font-medium text-gray-900 dark:text-white">Total Monthly Allocation</p>
                                  <p className="text-xl font-semibold text-blue-600 dark:text-blue-400">
                                    {formatCurrency(fundsSummary.totalMonthlyAllocation)}
                                  </p>
                                </div>
                              </div>
                            </div>

                            <div className="bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-700 rounded-lg p-4">
                              <div className="flex items-center">
                                <div className="w-3 h-3 bg-green-500 rounded-full mr-3"></div>
                                <div>
                                  <p className="text-sm font-medium text-gray-900 dark:text-white">Allocation Rate</p>
                                  <p className="text-xl font-semibold text-green-600 dark:text-green-400">
                                    {fundsSummary.allocationPercentage.toFixed(1)}%
                                  </p>
                                  <p className="text-xs text-gray-500 dark:text-gray-400">of household savings</p>
                                </div>
                              </div>
                            </div>

                            {/* Quick Stats */}
                            {fundsSummary.fundDetails.length > 0 && (
                              <div className="bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg p-4">
                                <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-3">Quick Stats</h4>
                                <div className="space-y-2">
                                  <div className="flex justify-between text-xs">
                                    <span className="text-gray-600 dark:text-gray-400">Active Funds:</span>
                                    <span className="font-medium text-gray-900 dark:text-white">{Object.keys(householdFundsData?.fundDetails || {}).length}</span>
                                  </div>
                                  <div className="flex justify-between text-xs">
                                    <span className="text-gray-600 dark:text-gray-400">Contributing Members:</span>
                                    <span className="font-medium text-gray-900 dark:text-white">{householdMembers.filter(m => m.isWorking && m.financialData?.customFunds?.some(f => f.percentage > 0)).length}</span>
                                  </div>
                                  <div className="flex justify-between text-xs">
                                    <span className="text-gray-600 dark:text-gray-400">Avg. per Fund:</span>
                                    <span className="font-medium text-gray-900 dark:text-white">{formatCurrency(fundsSummary.totalMonthlyAllocation / Math.max(1, Object.keys(householdFundsData?.fundDetails || {}).length))}</span>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Detailed Member Contributions Table */}
                        {householdFundsData?.fundDetails && Object.keys(householdFundsData.fundDetails).length > 0 && (
                          <div className="mt-6">
                            <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-4 flex items-center">
                              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                              </svg>
                              Individual Member Contributions
                            </h4>
                            <div className="overflow-x-auto">
                              <table className="min-w-full border border-gray-200 dark:border-gray-600 rounded-lg overflow-hidden">
                                <thead className="bg-gray-50 dark:bg-gray-700">
                                  <tr>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider border-b border-gray-200 dark:border-gray-600">
                                      Fund Name
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider border-b border-gray-200 dark:border-gray-600">
                                      Total Monthly
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider border-b border-gray-200 dark:border-gray-600">
                                      Member
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider border-b border-gray-200 dark:border-gray-600">
                                      Amount
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider border-b border-gray-200 dark:border-gray-600">
                                      Fund %
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider border-b border-gray-200 dark:border-gray-600">
                                      Share of Fund
                                    </th>
                                  </tr>
                                </thead>
                                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-600">
                                  {Object.entries(householdFundsData.fundDetails)
                                    .sort(([,a], [,b]) => b.total - a.total)
                                    .map(([fundName, fundData]) => (
                                      fundData.memberContributions.map((contribution, index) => (
                                        <tr key={`${fundName}-${contribution.name}`} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                                          {index === 0 && (
                                            <td 
                                              className="px-4 py-3 border-r border-gray-200 dark:border-gray-600 bg-gray-25 dark:bg-gray-600" 
                                              rowSpan={fundData.memberContributions.length}
                                            >
                                              <div className="flex items-center">
                                                <div 
                                                  className="w-3 h-3 rounded-full mr-2" 
                                                  style={{ backgroundColor: fundData.color }}
                                                ></div>
                                                <div>
                                                  <div className="text-sm font-medium text-gray-900 dark:text-white">{fundName}</div>
                                                  <div className="text-xs text-gray-500 dark:text-gray-400">
                                                    {fundData.memberContributions.length} contributor{fundData.memberContributions.length > 1 ? 's' : ''}
                                                  </div>
                                                </div>
                                              </div>
                                            </td>
                                          )}
                                          {index === 0 && (
                                            <td 
                                              className="px-4 py-3 border-r border-gray-200 dark:border-gray-600 bg-gray-25 dark:bg-gray-600" 
                                              rowSpan={fundData.memberContributions.length}
                                            >
                                              <div className="text-sm font-semibold text-gray-900 dark:text-white">
                                                {formatCurrency(fundData.total)}
                                              </div>
                                              <div className="text-xs text-gray-500 dark:text-gray-400">
                                                {((fundData.total / fundsSummary.totalMonthlyAllocation) * 100).toFixed(1)}% of total
                                              </div>
                                            </td>
                                          )}
                                          <td className="px-4 py-3">
                                            <div className="text-sm font-medium text-gray-900 dark:text-white">{contribution.name}</div>
                                          </td>
                                          <td className="px-4 py-3">
                                            <div className="text-sm text-gray-900 dark:text-gray-100">{formatCurrency(contribution.amount)}</div>
                                          </td>
                                          <td className="px-4 py-3">
                                            <div className="text-sm text-gray-900 dark:text-gray-100">{contribution.percentage.toFixed(1)}%</div>
                                            <div className="text-xs text-gray-500 dark:text-gray-400">of their savings</div>
                                          </td>
                                          <td className="px-4 py-3">
                                            <div className="text-sm font-medium text-gray-900 dark:text-white">
                                              {((contribution.amount / fundData.total) * 100).toFixed(1)}%
                                            </div>
                                            <div className="text-xs text-gray-500 dark:text-gray-400">of this fund</div>
                                          </td>
                                        </tr>
                                      ))
                                    ))}
                                </tbody>
                              </table>
                            </div>

                            {/* Individual Fund Growth Projections */}
                            <div className="mt-6">
                              <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-4 flex items-center">
                                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                                </svg>
                                Fund Growth Projections
                              </h4>
                              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                {Object.entries(householdFundsData.fundDetails)
                                  .sort(([,a], [,b]) => b.total - a.total)
                                  .slice(0, 4) // Show top 4 funds to keep it manageable
                                  .map(([fundName, fundData]) => {
                                    const defaultRate = getDefaultFundReturnRate(fundName);
                                    const projection = calculateFundGrowthProjection(fundData.total, defaultRate, 20, fundData.isCompounding);
                                    
                                    const chartData = {
                                      labels: projection.labels,
                                      datasets: [{
                                        label: 'Projected Value',
                                        data: projection.values,
                                        borderColor: fundData.color,
                                        backgroundColor: fundData.color + '20',
                                        fill: true,
                                        tension: 0.4,
                                        pointRadius: 2,
                                        pointHoverRadius: 5
                                      }]
                                    };

                                    const finalValue = projection.values[projection.values.length - 1] || 0;
                                    const totalContributions = fundData.total * 12 * 20;
                                    const totalGrowth = finalValue - totalContributions;

                                    return (
                                      <div key={fundName} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg p-4">
                                        <div className="flex items-center justify-between mb-3">
                                          <div className="flex items-center">
                                            <div 
                                              className="w-3 h-3 rounded-full mr-2" 
                                              style={{ backgroundColor: fundData.color }}
                                            ></div>
                                            <div className="flex flex-col">
                                              <h5 className="text-sm font-semibold text-gray-900 dark:text-white">{fundName}</h5>
                                              <span className={`text-xs px-2 py-0.5 rounded-full flex items-center ${
                                                fundData.isCompounding 
                                                  ? 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300' 
                                                  : 'bg-orange-100 dark:bg-orange-900 text-orange-700 dark:text-orange-300'
                                              }`}>
                                                {fundData.isCompounding ? (
                                                  <>
                                                    <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                                                    </svg>
                                                    Compounding
                                                  </>
                                                ) : (
                                                  <>
                                                    <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                                    </svg>
                                                    Non-compounding
                                                  </>
                                                )}
                                              </span>
                                            </div>
                                          </div>
                                          <button
                                            onClick={() => setFullscreenFund(fundName)}
                                            className="p-1 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                                            title="Expand chart"
                                          >
                                            <ArrowsPointingOutIcon className="h-4 w-4" />
                                          </button>
                                        </div>
                                        
                                        <div style={{ height: '200px' }}>
                                          <Line 
                                            data={chartData}
                                            options={{
                                              responsive: true,
                                              maintainAspectRatio: false,
                                              plugins: {
                                                legend: {
                                                  display: false
                                                },
                                                tooltip: {
                                                  callbacks: {
                                                    label: (context: any) => {
                                                      const year = context.dataIndex;
                                                      const value = context.parsed.y;
                                                      const contributions = fundData.total * 12 * year;
                                                      const growth = value - contributions;
                                                      return [
                                                        `Value: ${formatCurrency(value)}`,
                                                        `Contributions: ${formatCurrency(contributions)}`,
                                                        `Growth: ${formatCurrency(growth)}`
                                                      ];
                                                    }
                                                  }
                                                }
                                              },
                                              scales: {
                                                x: {
                                                  title: {
                                                    display: true,
                                                    text: 'Years',
                                                    font: { size: 10 }
                                                  }
                                                },
                                                y: {
                                                  title: {
                                                    display: true,
                                                    text: 'Value ($)',
                                                    font: { size: 10 }
                                                  },
                                                  ticks: {
                                                    callback: (value: any) => `$${(value / 1000).toFixed(0)}k`
                                                  }
                                                }
                                              }
                                            }}
                                          />
                                        </div>

                                        <div className="mt-3 grid grid-cols-2 gap-3 text-xs">
                                          <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700 rounded p-2">
                                            <div className="text-gray-600 dark:text-gray-400">Monthly Investment</div>
                                            <div className="font-semibold text-blue-600 dark:text-blue-400">{formatCurrency(fundData.total)}</div>
                                          </div>
                                          <div className="bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-700 rounded p-2">
                                            <div className="text-gray-600 dark:text-gray-400">Assumed Return</div>
                                            <div className="font-semibold text-green-600 dark:text-green-400">{(defaultRate * 100).toFixed(1)}% annual</div>
                                          </div>
                                          <div className="bg-purple-50 dark:bg-purple-900/30 border border-purple-200 dark:border-purple-700 rounded p-2">
                                            <div className="text-gray-600 dark:text-gray-400">20-Year Value</div>
                                            <div className="font-semibold text-purple-600 dark:text-purple-400">{formatCurrency(finalValue)}</div>
                                          </div>
                                          <div className="bg-orange-50 dark:bg-orange-900/30 border border-orange-200 dark:border-orange-700 rounded p-2">
                                            <div className="text-gray-600 dark:text-gray-400">Total Growth</div>
                                            <div className="font-semibold text-orange-600 dark:text-orange-400">{formatCurrency(totalGrowth)}</div>
                                          </div>
                                        </div>
                                      </div>
                                    );
                                  })}
                              </div>
                              
                              {Object.keys(householdFundsData.fundDetails).length > 4 && (
                                <div className="mt-4 text-center">
                                  <p className="text-sm text-gray-500 dark:text-gray-400">
                                    Showing top 4 funds by monthly contribution. Total funds: {Object.keys(householdFundsData.fundDetails).length}
                                  </p>
                                </div>
                              )}
                              
                              <div className="mt-4 space-y-3">
                                <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700 rounded-lg p-3">
                                  <div className="flex items-start">
                                    <svg className="w-4 h-4 text-blue-600 dark:text-blue-400 mr-2 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    <div>
                                      <h6 className="text-sm font-medium text-blue-800 dark:text-blue-200">Compounding vs Non-Compounding</h6>
                                      <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                                        <span className="font-medium">Compounding funds</span> apply returns to both contributions and existing balance, growing exponentially. 
                                        <span className="font-medium"> Non-compounding funds</span> only accumulate contributions without applying returns (e.g., savings accounts, some bonds).
                                      </p>
                                    </div>
                                  </div>
                                </div>
                                
                                <div className="bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-700 rounded-lg p-3">
                                  <div className="flex items-start">
                                    <svg className="w-4 h-4 text-yellow-600 dark:text-yellow-400 mr-2 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L4.35 16.5c-.77.833.192 2.5 1.732 2.5z" />
                                    </svg>
                                    <div>
                                      <h6 className="text-sm font-medium text-yellow-800 dark:text-yellow-200">Investment Disclaimer</h6>
                                      <p className="text-xs text-yellow-700 dark:text-yellow-300 mt-1">
                                        These projections are estimates based on assumed returns and compounding settings. Actual returns may vary significantly due to market conditions, fees, and other factors.
                                      </p>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })()}

                {/* Member Details Table */}
                {householdMembers.filter(m => m.isWorking).length > 0 && (
                  <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-600 overflow-hidden transition-colors duration-200">
                    <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-600">
                      <h3 className="text-lg font-medium text-gray-900 dark:text-white">Individual Member Breakdown</h3>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-600">
                        <thead className="bg-gray-50 dark:bg-gray-700">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                              Member
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                              Gross Income
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                              Net Income
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                              Monthly Expenses
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                              Monthly Savings
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                              Savings Rate
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-600">
                          {householdMembers.filter(m => m.isWorking).map(member => {
                            const data = member.financialData;
                            const savingsRate = data?.netIncome ? (data.monthlySavings * 12) / data.netIncome : 0;
                            
                            return (
                              <tr key={member.id}>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <div>
                                    <div className="text-sm font-medium text-gray-900 dark:text-white">{member.name}</div>
                                    <div className="text-sm text-gray-500 dark:text-gray-400 capitalize">{member.role}</div>
                                  </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                                  {formatCurrency(data?.grossSalary || 0)}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                                  {formatCurrency(data?.netIncome || 0)}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                                  {formatCurrency(data?.monthlyExpenses || 0)}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600 dark:text-green-400 font-medium">
                                  {formatCurrency(data?.monthlySavings || 0)}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
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
                  <div className="bg-white dark:bg-gray-800 p-8 rounded-lg shadow-sm border border-gray-200 dark:border-gray-600 text-center transition-colors duration-200">
                    <ChartBarIcon className="h-12 w-12 mx-auto mb-4 text-gray-400 dark:text-gray-500" />
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No Financial Data Yet</h3>
                    <p className="text-gray-600 dark:text-gray-300 mb-4">
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

            {/* Enhanced Analytics Panel */}
            <Tab.Panel>
              <EnhancedAnalytics 
                householdData={{
                  totalMembers: summary.totalMembers,
                  workingMembers: summary.workingMembers,
                  monthlyNetIncome: summary.monthlyNetIncome,
                  monthlyExpenses: summary.monthlyExpenses,
                  monthlySavings: summary.monthlySavings,
                  savingsRate: summary.savingsRate
                }}
              />
            </Tab.Panel>

            {/* Goals Tracking Panel */}
            <Tab.Panel>
              <GoalTracking 
                monthlySavings={summary.monthlySavings}
              />
            </Tab.Panel>
          </Tab.Panels>
        </Tab.Group>
      </div>

      {/* Fullscreen Fund Chart Modal */}
      {fullscreenFund && (() => {
        const householdFundsData = getHouseholdFundsData();
        const fundData = householdFundsData?.fundDetails?.[fullscreenFund];
        
        if (!fundData) return null;

        const defaultRate = getDefaultFundReturnRate(fullscreenFund);
        const projection = calculateFundGrowthProjection(fundData.total, defaultRate, 30, fundData.isCompounding); // 30 years for fullscreen
        
        const chartData = {
          labels: projection.labels,
          datasets: [{
            label: 'Projected Value',
            data: projection.values,
            borderColor: fundData.color,
            backgroundColor: fundData.color + '20',
            fill: true,
            tension: 0.4,
            pointRadius: 3,
            pointHoverRadius: 6,
            borderWidth: 3
          }]
        };

        const finalValue = projection.values[projection.values.length - 1] || 0;
        const totalContributions = fundData.total * 12 * 30;
        const totalGrowth = finalValue - totalContributions;

        return (
          <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg max-w-6xl w-full max-h-full overflow-y-auto">
              <div className="p-6">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center">
                    <div 
                      className="w-4 h-4 rounded-full mr-3" 
                      style={{ backgroundColor: fundData.color }}
                    ></div>
                    <div className="flex flex-col">
                      <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{fullscreenFund}</h2>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-sm text-gray-500 dark:text-gray-400">30-Year Growth Projection</span>
                        <span className={`text-xs px-2 py-1 rounded-full flex items-center ${
                          fundData.isCompounding 
                            ? 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300' 
                            : 'bg-orange-100 dark:bg-orange-900 text-orange-700 dark:text-orange-300'
                        }`}>
                          {fundData.isCompounding ? (
                            <>
                              <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                              </svg>
                              Compounding Growth
                            </>
                          ) : (
                            <>
                              <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                              </svg>
                              Non-compounding (Contributions Only)
                            </>
                          )}
                        </span>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => setFullscreenFund(null)}
                    className="p-2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
                    title="Close"
                  >
                    <XMarkIcon className="h-6 w-6" />
                  </button>
                </div>

                {/* Chart */}
                <div className="mb-6" style={{ height: '400px' }}>
                  <Line 
                    data={chartData}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: {
                        legend: {
                          display: false
                        },
                        tooltip: {
                          callbacks: {
                            title: (context: any) => {
                              const year = context[0]?.dataIndex || 0;
                              return year === 0 ? 'Starting Point' : `Year ${year}`;
                            },
                            label: (context: any) => {
                              const year = context.dataIndex;
                              const value = context.parsed.y;
                              const contributions = fundData.total * 12 * year;
                              const growth = value - contributions;
                              const roi = contributions > 0 ? ((growth / contributions) * 100) : 0;
                              return [
                                `Portfolio Value: ${formatCurrency(value)}`,
                                `Total Contributions: ${formatCurrency(contributions)}`,
                                `Investment Growth: ${formatCurrency(growth)}`,
                                `Return on Investment: ${roi.toFixed(1)}%`
                              ];
                            }
                          }
                        }
                      },
                      scales: {
                        x: {
                          title: {
                            display: true,
                            text: 'Years',
                            font: { size: 14, weight: 'bold' }
                          },
                          grid: {
                            color: '#f3f4f6'
                          }
                        },
                        y: {
                          title: {
                            display: true,
                            text: 'Portfolio Value',
                            font: { size: 14, weight: 'bold' }
                          },
                          ticks: {
                            callback: (value: any) => {
                              if (value >= 1000000) {
                                return `$${(value / 1000000).toFixed(1)}M`;
                              } else if (value >= 1000) {
                                return `$${(value / 1000).toFixed(0)}k`;
                              }
                              return `$${value}`;
                            }
                          },
                          grid: {
                            color: '#f3f4f6'
                          }
                        }
                      }
                    }}
                  />
                </div>

                {/* Detailed Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                  <div className="bg-blue-50 rounded-lg p-4">
                    <div className="text-sm text-blue-600 font-medium">Monthly Investment</div>
                    <div className="text-2xl font-bold text-blue-700">{formatCurrency(fundData.total)}</div>
                    <div className="text-xs text-blue-500">${(fundData.total * 12).toFixed(0)} annually</div>
                  </div>
                  
                  <div className="bg-green-50 rounded-lg p-4">
                    <div className="text-sm text-green-600 font-medium">Assumed Return</div>
                    <div className="text-2xl font-bold text-green-700">{(defaultRate * 100).toFixed(1)}%</div>
                    <div className="text-xs text-green-500">Annual compound growth</div>
                  </div>
                  
                  <div className="bg-purple-50 rounded-lg p-4">
                    <div className="text-sm text-purple-600 font-medium">30-Year Value</div>
                    <div className="text-2xl font-bold text-purple-700">{formatCurrency(finalValue)}</div>
                    <div className="text-xs text-purple-500">Total portfolio value</div>
                  </div>
                  
                  <div className="bg-orange-50 rounded-lg p-4">
                    <div className="text-sm text-orange-600 font-medium">Investment Growth</div>
                    <div className="text-2xl font-bold text-orange-700">{formatCurrency(totalGrowth)}</div>
                    <div className="text-xs text-orange-500">{((totalGrowth / totalContributions) * 100).toFixed(0)}% return</div>
                  </div>
                </div>

                {/* Member Contributions Table */}
                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-600">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Individual Member Contributions</h3>
                  <div className="overflow-x-auto">
                    <table className="min-w-full">
                      <thead>
                        <tr className="border-b border-gray-200 dark:border-gray-600">
                          <th className="text-left py-2 px-3 text-sm font-medium text-gray-600 dark:text-gray-300">Member</th>
                          <th className="text-left py-2 px-3 text-sm font-medium text-gray-600 dark:text-gray-300">Monthly Amount</th>
                          <th className="text-left py-2 px-3 text-sm font-medium text-gray-600 dark:text-gray-300">% of Savings</th>
                          <th className="text-left py-2 px-3 text-sm font-medium text-gray-600 dark:text-gray-300">Share of Fund</th>
                          <th className="text-left py-2 px-3 text-sm font-medium text-gray-600 dark:text-gray-300">30-Year Value</th>
                        </tr>
                      </thead>
                      <tbody>
                        {fundData.memberContributions
                          .sort((a, b) => b.amount - a.amount)
                          .map((contribution) => {
                            const memberProjection = calculateFundGrowthProjection(contribution.amount, defaultRate, 30, fundData.isCompounding);
                            const memberFinalValue = memberProjection.values[memberProjection.values.length - 1] || 0;
                            const shareOfFund = ((contribution.amount / fundData.total) * 100);
                            
                            return (
                              <tr key={contribution.name} className="border-b border-gray-200 dark:border-gray-600 hover:bg-white dark:hover:bg-gray-700">
                                <td className="py-3 px-3 text-sm font-medium text-gray-900 dark:text-white">{contribution.name}</td>
                                <td className="py-3 px-3 text-sm text-gray-900 dark:text-gray-100">{formatCurrency(contribution.amount)}</td>
                                <td className="py-3 px-3 text-sm text-gray-900 dark:text-gray-100">{contribution.percentage.toFixed(1)}%</td>
                                <td className="py-3 px-3 text-sm text-gray-900 dark:text-gray-100">{shareOfFund.toFixed(1)}%</td>
                                <td className="py-3 px-3 text-sm font-semibold text-gray-900 dark:text-white">{formatCurrency(memberFinalValue)}</td>
                              </tr>
                            );
                          })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Member Details Modal */}
      {selectedMemberModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" aria-hidden="true" onClick={() => setSelectedMemberModal(null)}></div>

            {/* Modal Content */}
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full">
              {/* Modal Header */}
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center">
                    <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-blue-100 sm:mx-0 sm:h-10 sm:w-10">
                      <UserIcon className="h-6 w-6 text-blue-600" />
                    </div>
                    <div className="ml-4">
                      <h3 className="text-lg leading-6 font-medium text-gray-900" id="modal-title">
                        {selectedMemberModal.name}
                      </h3>
                      <p className="text-sm text-gray-500 capitalize">
                        {selectedMemberModal.role}{selectedMemberModal.age ? `, Age: ${selectedMemberModal.age}` : ''}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedMemberModal(null)}
                    className="bg-white rounded-md text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    <span className="sr-only">Close</span>
                    <XMarkIcon className="h-6 w-6" />
                  </button>
                </div>

                {/* Member Status */}
                <div className="flex items-center space-x-4 mb-6">
                  <span className={`px-3 py-1 text-sm rounded-full ${
                    selectedMemberModal.isWorking 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-gray-100 text-gray-600'
                  }`}>
                    {selectedMemberModal.isWorking ? 'Working Member' : 'Non-working Member'}
                  </span>
                  {selectedMemberModal.financialData?.isFinalized && (
                    <span className="px-3 py-1 text-sm rounded-full bg-green-100 text-green-800 border border-green-200 flex items-center">
                      <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Profile Complete
                    </span>
                  )}
                </div>

                {/* Financial Details */}
                {selectedMemberModal.isWorking && selectedMemberModal.financialData?.hasCompleteData ? (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Financial Summary */}
                    <div className="space-y-4">
                      <h4 className="font-semibold text-gray-900 text-base">Financial Overview</h4>
                      <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium text-gray-700">Gross Annual Salary:</span>
                          <span className="text-sm font-semibold text-gray-900">
                            {formatCurrency(selectedMemberModal.financialData.grossSalary || 0)}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium text-gray-700">Net Annual Income:</span>
                          <span className="text-sm font-semibold text-gray-900">
                            {formatCurrency(selectedMemberModal.financialData.netIncome || 0)}
                          </span>
                        </div>
                        <div className="flex justify-between items-center border-t pt-2">
                          <span className="text-sm font-medium text-gray-700">Monthly Take-home:</span>
                          <span className="text-lg font-semibold text-green-700">
                            {formatCurrency((selectedMemberModal.financialData.netIncome || 0) / 12)}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium text-gray-700">Monthly Savings:</span>
                          <span className={`text-sm font-semibold ${
                            (selectedMemberModal.financialData.monthlySavings || 0) >= 0 
                              ? 'text-green-600' 
                              : 'text-red-600'
                          }`}>
                            {formatCurrency(selectedMemberModal.financialData.monthlySavings || 0)}
                          </span>
                        </div>
                        {selectedMemberModal.financialData.savingsRate !== undefined && (
                          <div className="flex justify-between items-center">
                            <span className="text-sm font-medium text-gray-700">Savings Rate:</span>
                            <span className={`text-sm font-semibold ${
                              (selectedMemberModal.financialData.savingsRate || 0) >= 20 
                                ? 'text-green-600' 
                                : (selectedMemberModal.financialData.savingsRate || 0) >= 10
                                  ? 'text-yellow-600'
                                  : 'text-red-600'
                            }`}>
                              {(selectedMemberModal.financialData.savingsRate || 0).toFixed(1)}%
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Tax Breakdown */}
                      {selectedMemberModal.financialData.taxBreakdown && (
                        <div className="bg-red-50 rounded-lg p-4">
                          <h5 className="font-medium text-red-900 mb-2">Tax Breakdown</h5>
                          <div className="space-y-2">
                            <div className="flex justify-between items-center">
                              <span className="text-sm text-red-700">Federal Tax:</span>
                              <span className="text-sm font-medium text-red-900">
                                {formatCurrency(selectedMemberModal.financialData.taxBreakdown.federal?.tax || 0)}
                              </span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-sm text-red-700">State Tax ({selectedMemberModal.financialData.taxBreakdown.state?.name || 'N/A'}):</span>
                              <span className="text-sm font-medium text-red-900">
                                {formatCurrency(selectedMemberModal.financialData.taxBreakdown.state?.tax || 0)}
                              </span>
                            </div>
                            {selectedMemberModal.financialData.taxBreakdown.city?.tax > 0 && (
                              <div className="flex justify-between items-center">
                                <span className="text-sm text-red-700">City Tax:</span>
                                <span className="text-sm font-medium text-red-900">
                                  {formatCurrency(selectedMemberModal.financialData.taxBreakdown.city.tax)}
                                </span>
                              </div>
                            )}
                            <div className="flex justify-between items-center">
                              <span className="text-sm text-red-700">FICA (Social Security + Medicare):</span>
                              <span className="text-sm font-medium text-red-900">
                                {formatCurrency(selectedMemberModal.financialData.taxBreakdown.fica?.totalFica || 0)}
                              </span>
                            </div>
                            {selectedMemberModal.financialData.taxBreakdown.retirement?.contribution401k > 0 && (
                              <div className="flex justify-between items-center">
                                <span className="text-sm text-red-700">401(k) Contribution:</span>
                                <span className="text-sm font-medium text-red-900">
                                  {formatCurrency(selectedMemberModal.financialData.taxBreakdown.retirement.contribution401k)}
                                </span>
                              </div>
                            )}
                            <div className="flex justify-between items-center border-t border-red-200 pt-2">
                              <span className="text-sm font-medium text-red-700">Total Taxes & Deductions:</span>
                              <span className="text-sm font-semibold text-red-900">
                                {formatCurrency(selectedMemberModal.financialData.taxBreakdown.totalTax || 0)}
                              </span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Budget & Investments */}
                    <div className="space-y-4">
                      {/* Budget Breakdown */}
                      {selectedMemberModal.financialData.budgetData && Object.keys(selectedMemberModal.financialData.budgetData).length > 0 && (
                        <div>
                          <h4 className="font-semibold text-gray-900 text-base mb-2">Budget Breakdown</h4>
                          <div className="bg-gray-50 rounded-lg p-4">
                            <div className="grid grid-cols-1 gap-2">
                              {Object.entries(selectedMemberModal.financialData.budgetData)
                                .filter(([_, value]) => value && parseFloat(value as string) > 0)
                                .map(([category, amount]) => (
                                  <div key={category} className="flex justify-between items-center">
                                    <span className="text-sm text-gray-600 capitalize">
                                      {category.replace(/([A-Z])/g, ' $1').toLowerCase()}:
                                    </span>
                                    <span className="text-sm font-medium text-gray-900">
                                      {formatCurrency(parseFloat(amount as string))}
                                    </span>
                                  </div>
                                ))}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Investment Portfolio */}
                      {selectedMemberModal.financialData.customFunds && selectedMemberModal.financialData.customFunds.length > 0 && (
                        <div>
                          <h4 className="font-semibold text-gray-900 text-base mb-2">Investment Portfolio</h4>
                          <div className="bg-green-50 rounded-lg p-4">
                            <div className="space-y-2">
                              {selectedMemberModal.financialData.customFunds.map((fund, idx) => (
                                <div key={idx} className="flex justify-between items-center">
                                  <span className="text-sm text-green-700">{fund.name}:</span>
                                  <span className="text-sm font-medium text-green-900">
                                    {fund.percentage.toFixed(1)}%
                                  </span>
                                </div>
                              ))}
                              <div className="pt-2 border-t border-green-200">
                                <div className="flex justify-between items-center">
                                  <span className="text-sm font-medium text-green-700">Total Allocated:</span>
                                  <span className="text-sm font-semibold text-green-900">
                                    {selectedMemberModal.financialData.customFunds.reduce((sum, f) => sum + f.percentage, 0).toFixed(1)}%
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Custom Expenses */}
                      {selectedMemberModal.financialData.customExpenses && selectedMemberModal.financialData.customExpenses.length > 0 && (
                        <div>
                          <h4 className="font-semibold text-gray-900 text-base mb-2">Custom Expenses</h4>
                          <div className="bg-orange-50 rounded-lg p-4">
                            <div className="space-y-2">
                              {selectedMemberModal.financialData.customExpenses.map((expense, idx) => (
                                <div key={idx} className="flex justify-between items-center">
                                  <span className="text-sm text-orange-700">{expense.name}:</span>
                                  <span className="text-sm font-medium text-orange-900">
                                    {formatCurrency(parseFloat(expense.value) || 0)}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ) : selectedMemberModal.isWorking ? (
                  <div className="text-center py-8">
                    <div className="text-gray-400 mb-4">
                      <ChartBarIcon className="h-16 w-16 mx-auto" />
                    </div>
                    <h4 className="text-lg font-medium text-gray-900 mb-2">No Financial Data Available</h4>
                    <p className="text-gray-600 mb-4">This member hasn't set up their financial profile yet.</p>
                    <Link
                      to={`/salary?memberId=${selectedMemberModal.id}`}
                      className="inline-flex items-center bg-green-600 text-white font-medium py-2 px-4 rounded-md hover:bg-green-700 transition-colors"
                      onClick={() => setSelectedMemberModal(null)}
                    >
                      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                      </svg>
                      Set Up Financial Profile
                    </Link>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <div className="text-gray-400 mb-4">
                      <UserIcon className="h-16 w-16 mx-auto" />
                    </div>
                    <h4 className="text-lg font-medium text-gray-900 mb-2">Non-working Member</h4>
                    <p className="text-gray-600">This household member is not currently working and doesn't require financial planning.</p>
                  </div>
                )}

                {/* Last Updated Info */}
                {selectedMemberModal.financialData?.lastUpdated && (
                  <div className="mt-6 pt-4 border-t border-gray-200">
                    <p className="text-sm text-gray-500 text-center">
                      Last updated: {new Date(selectedMemberModal.financialData.lastUpdated).toLocaleDateString()}
                    </p>
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                {selectedMemberModal.isWorking && (
                  <Link
                    to={`/salary?memberId=${selectedMemberModal.id}`}
                    className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm"
                    onClick={() => setSelectedMemberModal(null)}
                  >
                    {selectedMemberModal.financialData?.hasCompleteData ? 'Edit Profile' : 'Set Up Profile'}
                  </Link>
                )}
                <button
                  type="button"
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                  onClick={() => setSelectedMemberModal(null)}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* AI Assistant */}
      <AIAssistant 
        householdData={{
          totalMembers: summary.totalMembers,
          workingMembers: summary.workingMembers,
          monthlyNetIncome: summary.monthlyNetIncome,
          monthlyExpenses: summary.monthlyExpenses,
          monthlySavings: summary.monthlySavings,
          savingsRate: summary.savingsRate,
          members: householdMembers.map(m => ({
            id: m.id,
            name: m.name,
            role: m.role,
            isWorking: m.isWorking
          }))
        }}
        onCreateGoal={handleCreateGoal}
        onAdjustBudget={handleAdjustBudget}
        onSetSavings={handleSetSavings}
        onOptimizeBudget={handleOptimizeBudget}
        onCreateCustomFund={handleCreateCustomFund}
        onAddMemberExpense={handleAddMemberExpense}
        onReduceMemberExpense={handleReduceMemberExpense}
        onUpdateMemberProfile={handleUpdateMemberProfile}
      />

      {/* Toast Notification */}
      {toast && (
        <div className="fixed top-4 right-4 z-50 animate-pulse">
          <div className={`px-6 py-3 rounded-lg shadow-lg text-white font-medium ${
            toast.type === 'success' ? 'bg-green-500' :
            toast.type === 'error' ? 'bg-red-500' : 'bg-blue-500'
          }`}>
            {toast.message}
          </div>
        </div>
      )}
    </div>
  );
}

export default HomePage;