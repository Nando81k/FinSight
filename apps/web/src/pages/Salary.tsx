import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Tab } from '@headlessui/react';
import { 
  CurrencyDollarIcon, 
  ChartBarIcon,
  ChartPieIcon,
  HomeIcon,
  SunIcon,
  NewspaperIcon
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
  city: {
    tax: number;
    rate: number;
  };
  fica: {
    socialSecurityTax: number;
    medicareTax: number;
    totalFica: number;
  };
  retirement: {
    contribution401k: number;
    contributionType: string;
  };
  totalTax: number;
  totalDeductions: number;
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
  // Get member ID from URL parameters
  const urlParams = new URLSearchParams(window.location.search);
  const memberId = urlParams.get('memberId');
  const [currentMember, setCurrentMember] = useState<any>(null);

  const [formData, setFormData] = useState({
    grossSalary: '',
    filingStatus: '',
    state: '',
    payFrequency: '',
    cityTaxRate: '',
    contribution401k: '',
    contribution401kType: 'percentage', // 'percentage' or 'dollar'
  });

  const [taxBreakdown, setTaxBreakdown] = useState<TaxBreakdown | null>(null);
  const [budgetData, setBudgetData] = useState({
    housing: '',
    transportation: '',
    food: '',
    utilities: '',
    insurance: '',
    entertainment: '',
  });

  const [customExpenses, setCustomExpenses] = useState<{ id: string; name: string; value: string }[]>([]);
  const [newExpenseName, setNewExpenseName] = useState('');
  const [newExpenseValue, setNewExpenseValue] = useState('');

  const [savingsProjection, setSavingsProjection] = useState<SavingsProjection[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const [customFunds, setCustomFunds] = useState<CustomFund[]>([
    { id: '1', name: 'Emergency Fund', percentage: 0, color: '#ef4444' },
    { id: '2', name: 'Travel Fund', percentage: 0, color: '#3b82f6' },
    { id: '3', name: 'Investment Fund', percentage: 0, color: '#10b981' }
  ]);
  const [fundProjections, setFundProjections] = useState<FundProjection[]>([]);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');

  // Load household member data if memberId is provided
  useEffect(() => {
    if (memberId) {
      const savedMembers = localStorage.getItem('householdMembers');
      if (savedMembers) {
        const members = JSON.parse(savedMembers);
        const member = members.find((m: any) => m.id === memberId);
        if (member) {
          setCurrentMember(member);
          
          // If member has saved financial data, restore form state for editing
          if (member.financialData?.formState) {
            setFormData(member.financialData.formState);
            
            // Restore tax breakdown if available
            if (member.financialData.taxBreakdown) {
              setTaxBreakdown(member.financialData.taxBreakdown);
            }
            
            // Restore budget data if available
            if (member.financialData.budgetData) {
              setBudgetData(member.financialData.budgetData);
            }
            
            // Restore custom expenses if available
            if (member.financialData.customExpenses) {
              setCustomExpenses(member.financialData.customExpenses);
            }
            
            // Restore savings projections if available
            if (member.financialData.savingsProjection && member.financialData.savingsProjection.length > 0) {
              setSavingsProjection(member.financialData.savingsProjection);
            }
            
            // Restore custom funds if available
            if (member.financialData.customFunds && member.financialData.customFunds.length > 0) {
              setCustomFunds(member.financialData.customFunds);
            }
            
            // Restore fund projections if available
            if (member.financialData.fundProjections && member.financialData.fundProjections.length > 0) {
              setFundProjections(member.financialData.fundProjections);
            }
          }
        }
      }
    }
  }, [memberId]);

  // Save comprehensive financial data back to household when it changes (only when there's meaningful progress)
  useEffect(() => {
    if (memberId && currentMember) {
      // Check if member already has complete/finalized data - don't overwrite with incomplete data
      const savedMembers = localStorage.getItem('householdMembers');
      if (savedMembers) {
        const members = JSON.parse(savedMembers);
        const existingMember = members.find((m: any) => m.id === memberId);
        
        // If member has finalized profile, don't overwrite with auto-save unless we have meaningful new data
        if (existingMember?.financialData?.isFinalized) {
          // Only auto-save if we have new meaningful calculations (taxes calculated or substantial form data)
          const hasSubstantialData = !!(
            taxBreakdown || 
            (formData.grossSalary && parseFloat(formData.grossSalary) > 0) ||
            Object.values(budgetData).some(value => value !== '') ||
            customExpenses.length > 0 ||
            savingsProjection.length > 0
          );
          
          if (!hasSubstantialData) {
            return; // Don't auto-save empty data over complete profile
          }
        }
      }

      const monthlyIncome = taxBreakdown ? taxBreakdown.netIncome / 12 : 0;
      const totalBudgetExpenses = Object.values(budgetData)
        .filter(value => value !== '')
        .reduce((sum, value) => sum + parseFloat(value), 0) +
        customExpenses.reduce((sum, expense) => sum + (parseFloat(expense.value) || 0), 0);
      
      const monthlySavings = monthlyIncome - totalBudgetExpenses;
      
      // Calculate yearly projections
      const yearlySavings = monthlySavings * 12;
      const savingsRate = monthlyIncome > 0 ? (monthlySavings / monthlyIncome) * 100 : 0;

      const financialData = {
        // Basic salary info
        grossSalary: parseFloat(formData.grossSalary) || 0,
        netIncome: taxBreakdown?.netIncome || 0,
        
        // Tax information
        taxBreakdown: taxBreakdown || null,
        
        // Budget and expenses
        budgetData,
        customExpenses,
        monthlyExpenses: totalBudgetExpenses,
        
        // Savings calculations  
        monthlySavings,
        yearlySavings,
        savingsRate,
        
        // Form state for restoration
        formState: {
          ...formData,
        },
        
        // Investment projections
        savingsProjection: savingsProjection.length > 0 ? savingsProjection : [],
        customFunds: customFunds.length > 0 ? customFunds : [],
        
        // Timestamp for data freshness
        lastUpdated: new Date().toISOString(),
        
        // Status flags - preserve finalization status and complete data flag from existing data
        hasCompleteData: !!(taxBreakdown && parseFloat(formData.grossSalary) > 0),
        // Don't overwrite finalization status in auto-save
        ...(savedMembers && (() => {
          const members = JSON.parse(savedMembers);
          const existingMember = members.find((m: any) => m.id === memberId);
          return {
            isFinalized: existingMember?.financialData?.isFinalized || false,
            profileCompleted: existingMember?.financialData?.profileCompleted || false
          };
        })())
      };

      // Only update if there's meaningful data or we're building upon existing complete data
      const shouldSave = !!(
        taxBreakdown || 
        (formData.grossSalary && parseFloat(formData.grossSalary) > 0) ||
        Object.values(budgetData).some(value => value !== '') ||
        customExpenses.length > 0 ||
        savingsProjection.length > 0
      );

      if (shouldSave && savedMembers) {
        const members = JSON.parse(savedMembers);
        const updatedMembers = members.map((m: any) => 
          m.id === memberId 
            ? { ...m, financialData }
            : m
        );
        localStorage.setItem('householdMembers', JSON.stringify(updatedMembers));
        
        // Trigger a custom event to notify HomePage of data changes
        window.dispatchEvent(new CustomEvent('householdDataUpdated', { 
          detail: { memberId, financialData } 
        }));
      }
    }
  }, [
    memberId, 
    currentMember, 
    taxBreakdown, 
    budgetData, 
    customExpenses, 
    formData, 
    savingsProjection, 
    customFunds
  ]);

  // Recalculate fund projections whenever custom funds change
  useEffect(() => {
    if (savingsProjection.length > 0) {
      calculateFundProjections(savingsProjection);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customFunds]);

  // Validate that all required data is complete
  const validateCompleteProfile = () => {
    const requiredFields = {
      salary: formData.grossSalary && parseFloat(formData.grossSalary) > 0,
      filingStatus: formData.filingStatus !== '',
      state: formData.state !== '',
      taxCalculated: taxBreakdown !== null,
      savingsCalculated: savingsProjection.length > 0,
      budgetPlanned: Object.values(budgetData).some(value => value !== '')
    };

    const missing = Object.entries(requiredFields)
      .filter(([, isComplete]) => !isComplete)
      .map(([field]) => field);

    return { isComplete: missing.length === 0, missing };
  };

  // Comprehensive save function for financial profile
  const handleSaveFinancialProfile = async () => {
    setSaveStatus('saving');

    try {
      const validation = validateCompleteProfile();
      
      if (!validation.isComplete) {
        alert(`Please complete the following sections first:\n${validation.missing.join(', ')}`);
        setSaveStatus('error');
        return;
      }

      // Calculate comprehensive financial summary
      const monthlyIncome = taxBreakdown ? taxBreakdown.netIncome / 12 : 0;
      const totalBudgetExpenses = Object.values(budgetData)
        .filter(value => value !== '')
        .reduce((sum, value) => sum + parseFloat(value), 0) +
        customExpenses.reduce((sum, expense) => sum + (parseFloat(expense.value) || 0), 0);
      
      const monthlySavings = monthlyIncome - totalBudgetExpenses;
      const yearlySavings = monthlySavings * 12;
      const savingsRate = monthlyIncome > 0 ? (monthlySavings / monthlyIncome) * 100 : 0;

      const completeFinancialData = {
        // Basic financial info
        grossSalary: parseFloat(formData.grossSalary) || 0,
        netIncome: taxBreakdown?.netIncome || 0,
        monthlyExpenses: totalBudgetExpenses,
        monthlySavings,
        yearlySavings,
        savingsRate,
        
        // Complete tax information
        taxBreakdown: taxBreakdown,
        
        // Budget details
        budgetData,
        customExpenses: customExpenses.filter(exp => exp.name && exp.value),
        
        // Form state for future editing
        formState: { ...formData },
        
        // Investment and savings data
        savingsProjection: savingsProjection,
        customFunds: customFunds.filter(fund => fund.percentage > 0),
        fundProjections: fundProjections,
        
        // Metadata
        lastUpdated: new Date().toISOString(),
        hasCompleteData: true,
        isFinalized: true, // Mark as finalized profile
        
        // Summary statistics
        summary: {
          monthlyTakeHome: monthlyIncome,
          monthlyExpenses: totalBudgetExpenses,
          monthlySavings: monthlySavings,
          yearlyProjection: yearlySavings,
          savingsRate: savingsRate,
          fundsAllocated: customFunds.filter(f => f.percentage > 0).length,
          totalFundAllocation: customFunds.reduce((sum, f) => sum + f.percentage, 0)
        }
      };

      if (memberId) {
        // Save to household member
        const savedMembers = localStorage.getItem('householdMembers');
        if (savedMembers) {
          const members = JSON.parse(savedMembers);
          const updatedMembers = members.map((m: any) => 
            m.id === memberId 
              ? { 
                  ...m, 
                  financialData: completeFinancialData,
                  profileCompleted: true,
                  lastUpdated: new Date().toISOString()
                }
              : m
          );
          localStorage.setItem('householdMembers', JSON.stringify(updatedMembers));
          
          // Trigger update event
          window.dispatchEvent(new CustomEvent('householdDataUpdated', { 
            detail: { memberId, financialData: completeFinancialData } 
          }));
        }
      } else {
        // Save as standalone profile
        const profileKey = `financialProfile_${Date.now()}`;
        localStorage.setItem(profileKey, JSON.stringify(completeFinancialData));
        localStorage.setItem('lastSavedProfile', profileKey);
      }

      setSaveStatus('success');
      
      // Show success message
      setTimeout(() => {
        if (currentMember) {
          alert(`✅ Complete financial profile saved for ${currentMember.name}!\n\nAll data has been saved to your household management system. You can now view the updated summary on your household overview page.`);
        } else {
          alert(`✅ Complete financial profile saved successfully!\n\nAll your financial planning data has been saved and can be accessed anytime.`);
        }
        setSaveStatus('idle');
      }, 500);

    } catch (error) {
      console.error('Error saving profile:', error);
      setSaveStatus('error');
      alert('❌ Error saving profile. Please try again.');
      setTimeout(() => setSaveStatus('idle'), 2000);
    }
  };

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
          cityTaxRate: formData.cityTaxRate ? parseFloat(formData.cityTaxRate) : 0,
          contribution401k: formData.contribution401k ? parseFloat(formData.contribution401k) : 0,
          contribution401kType: formData.contribution401kType,
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



  const updateFundPercentage = (id: string, newPercentage: number) => {
    // Clamp percentage between 0 and 100
    const clampedPercentage = Math.max(0, Math.min(100, newPercentage));
    
    setCustomFunds(funds => funds.map(fund => 
      fund.id === id 
        ? { ...fund, percentage: clampedPercentage }
        : fund
    ));
    
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
      name: 'Salary & Tax',
      icon: CurrencyDollarIcon,
      description: 'Calculate your take-home pay after taxes'
    },
    {
      name: 'Budget Planning',
      icon: ChartPieIcon,
      description: 'Plan your monthly expenses and budget'
    },
    {
      name: 'Savings Projection',
      icon: ChartBarIcon,
      description: 'Project your savings over time'
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Financial Planning Dashboard</h1>
          <p className="text-gray-600 mt-2">
            Comprehensive salary analysis, tax calculations, budget planning, and savings projections with interactive visualizations
          </p>
          {currentMember && (
            <div className="mt-4 flex items-center space-x-3">
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                📊 Editing for: {currentMember.name}
              </span>
              <Link 
                to="/" 
                className="text-blue-600 hover:text-blue-800 text-sm font-medium underline"
              >
                ← Back to Household Overview
              </Link>
            </div>
          )}
        </div>

        <Tab.Group selectedIndex={activeTab} onChange={setActiveTab}>
          <Tab.List className="flex space-x-1 rounded-xl bg-white p-1 mb-8 shadow-sm border">
            {tabs.map((tab) => (
              <Tab
                key={tab.name}
                className={({ selected }) =>
                  classNames(
                    'w-full rounded-lg py-4 px-6 text-sm font-medium leading-5 transition-all',
                    'ring-white ring-opacity-60 ring-offset-2 ring-offset-blue-400 focus:outline-none focus:ring-2',
                    selected
                      ? 'bg-blue-600 text-white shadow'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-800'
                  )
                }
              >
                <div className="flex items-center justify-center space-x-2">
                  <tab.icon className="h-5 w-5" />
                  <span>{tab.name}</span>
                </div>
              </Tab>
            ))}
          </Tab.List>

          <Tab.Panels>
            {/* Salary & Taxes Panel */}
            <Tab.Panel>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Input Form */}
                <div className="bg-white p-6 rounded-lg shadow-sm border">
                  <h3 className="text-lg font-medium text-gray-900 mb-6">Salary Information</h3>
                  
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
                          className="w-full pl-8 pr-4 py-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black placeholder-gray-400"
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
                          className="w-full px-3 py-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black placeholder-gray-400"
                        >
                          <option value="">Select Filing Status</option>
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
                          className="w-full px-3 py-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black placeholder-gray-400"
                        >
                          <option value="">Select State</option>
                          {US_STATES.map((state) => (
                            <option key={state.code} value={state.code}>
                              {state.name} {!state.hasStateTax && '(No State Tax)'}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* City Tax and 401k Section */}
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          City Tax Rate (Optional)
                        </label>
                        <div className="relative">
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            max="15"
                            value={formData.cityTaxRate}
                            onChange={(e) => setFormData({...formData, cityTaxRate: e.target.value})}
                            className="w-full px-3 py-3 pr-8 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black placeholder-gray-400"
                            placeholder="1.5"
                          />
                          <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500">%</span>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">Some cities like NYC, SF have local income taxes</p>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          401(k) Contribution
                        </label>
                        <div className="flex gap-2">
                          <div className="flex-1">
                            <div className="relative">
                              <input
                                type="number"
                                step={formData.contribution401kType === 'percentage' ? '0.5' : '100'}
                                min="0"
                                max={formData.contribution401kType === 'percentage' ? '100' : undefined}
                                value={formData.contribution401k}
                                onChange={(e) => setFormData({...formData, contribution401k: e.target.value})}
                                className="w-full px-3 py-3 pr-8 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black placeholder-gray-400"
                                placeholder={formData.contribution401kType === 'percentage' ? '10' : '5000'}
                              />
                              <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500">
                                {formData.contribution401kType === 'percentage' ? '%' : '$'}
                              </span>
                            </div>
                          </div>
                          <select
                            value={formData.contribution401kType}
                            onChange={(e) => setFormData({...formData, contribution401kType: e.target.value})}
                            className="px-3 py-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black placeholder-gray-400"
                          >
                            <option value="percentage">%</option>
                            <option value="dollar">$</option>
                          </select>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">Pre-tax retirement contribution (reduces taxable income)</p>
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
                        
                        {taxBreakdown.city && taxBreakdown.city.tax > 0 && (
                          <div className="flex justify-between items-center">
                            <span className="text-gray-700">City Tax ({taxBreakdown.city.rate}%)</span>
                            <span className="font-medium text-red-600">-{formatCurrency(taxBreakdown.city.tax)}</span>
                          </div>
                        )}
                        
                        <div className="flex justify-between items-center">
                          <span className="text-gray-700">FICA (Social Security & Medicare)</span>
                          <span className="font-medium text-red-600">-{formatCurrency(taxBreakdown.fica.totalFica)}</span>
                        </div>
                        
                        {taxBreakdown.retirement && taxBreakdown.retirement.contribution401k > 0 && (
                          <div className="flex justify-between items-center">
                            <span className="text-gray-700">401(k) Contribution</span>
                            <span className="font-medium text-blue-600">-{formatCurrency(taxBreakdown.retirement.contribution401k)}</span>
                          </div>
                        )}
                        
                        <div className="border-t pt-3">
                          <div className="flex justify-between items-center">
                            <span className="font-medium text-gray-900">Total Taxes</span>
                            <span className="font-semibold text-red-600">-{formatCurrency(taxBreakdown.totalTax)}</span>
                          </div>
                          {taxBreakdown.totalDeductions && taxBreakdown.totalDeductions !== taxBreakdown.totalTax && (
                            <div className="flex justify-between items-center mt-1">
                              <span className="font-medium text-gray-900">Total Deductions</span>
                              <span className="font-semibold text-gray-700">-{formatCurrency(taxBreakdown.totalDeductions)}</span>
                            </div>
                          )}
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

                      {/* Scrollable Expense Cards Container */}
                      <div className="max-h-96 overflow-y-auto space-y-3 pr-2">
                        {/* Default Expense Cards */}
                        {Object.entries({
                          housing: 'Housing (Rent/Mortgage)',
                          transportation: 'Transportation',
                          food: 'Food & Groceries',
                          utilities: 'Utilities',
                          insurance: 'Insurance',
                          entertainment: 'Entertainment',
                        }).map(([key, label]) => (
                          <div key={key} className="bg-white p-3 rounded-lg border border-gray-200 hover:border-blue-300 hover:shadow-sm transition-all duration-200 flex items-center justify-between">
                            <div className="flex-1 min-w-0">
                              <label className="block text-sm font-medium text-gray-700 mb-1 truncate">
                                {label}
                              </label>
                            </div>
                            <div className="relative w-32 ml-3">
                              <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-sm">$</span>
                              <input
                                type="number"
                                value={budgetData[key as keyof typeof budgetData]}
                                onChange={(e) => setBudgetData({...budgetData, [key]: e.target.value})}
                                className="w-full pl-7 pr-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black placeholder-gray-400"
                                placeholder="0"
                              />
                            </div>
                          </div>
                        ))}

                        {/* Custom Expense Cards */}
                        {customExpenses.map(exp => (
                          <div key={exp.id} className="bg-blue-50 p-3 rounded-lg border border-blue-200 hover:border-blue-300 hover:shadow-sm transition-all duration-200 flex items-center justify-between">
                            <div className="flex-1 min-w-0">
                              <label className="block text-sm font-medium text-blue-800 mb-1 truncate pr-2">
                                {exp.name}
                              </label>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="relative w-32">
                                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-sm">$</span>
                                <input
                                  type="number"
                                  value={exp.value}
                                  onChange={e => {
                                    setCustomExpenses(customExpenses.map(c => c.id === exp.id ? { ...c, value: e.target.value } : c));
                                  }}
                                  className="w-full pl-7 pr-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black placeholder-gray-400"
                                  placeholder="0"
                                />
                              </div>
                              <button
                                type="button"
                                className="text-red-500 hover:text-red-700 hover:bg-red-50 p-1 rounded transition-colors"
                                onClick={() => setCustomExpenses(customExpenses.filter(c => c.id !== exp.id))}
                                title="Remove expense"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              </button>
                            </div>
                          </div>
                        ))}

                        {/* Add Custom Expense Card */}
                        <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-3 rounded-lg border border-green-200 hover:border-green-300 transition-all duration-200">
                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              value={newExpenseName}
                              onChange={e => setNewExpenseName(e.target.value)}
                              className="flex-1 min-w-0 px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-transparent text-black placeholder-gray-400"
                              placeholder="Expense Name"
                            />
                            <div className="relative w-24">
                              <span className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400 text-sm">$</span>
                              <input
                                type="number"
                                value={newExpenseValue}
                                onChange={e => setNewExpenseValue(e.target.value)}
                                className="w-full pl-6 pr-2 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-transparent text-black placeholder-gray-400"
                                placeholder="0"
                              />
                            </div>
                            <button
                              type="button"
                              className="bg-green-600 text-white p-2 rounded-md hover:bg-green-700 disabled:bg-gray-400 transition-colors flex items-center justify-center flex-shrink-0"
                              disabled={!newExpenseName || !newExpenseValue}
                              onClick={() => {
                                setCustomExpenses([...customExpenses, { id: Date.now().toString(), name: newExpenseName, value: newExpenseValue }]);
                                setNewExpenseName('');
                                setNewExpenseValue('');
                              }}
                              title="Add expense"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                              </svg>
                            </button>
                          </div>
                        </div>
                      </div>

                      <div className="mt-6">
                        <button
                          onClick={calculateSavingsProjection}
                          disabled={!taxBreakdown || (!Object.values(budgetData).some(value => value !== '') && customExpenses.length === 0)}
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
                  
                  {taxBreakdown && (Object.values(budgetData).some(value => value !== '') || customExpenses.length > 0) && (
                    <div className="space-y-4">
                      {/* Default Expenses */}
                      {Object.entries(budgetData).map(([key, value]) => {
                        if (!value) return null;
                        const label = {
                          housing: 'Housing',
                          transportation: 'Transportation', 
                          food: 'Food & Groceries',
                          utilities: 'Utilities',
                          insurance: 'Insurance',
                          entertainment: 'Entertainment',
                        }[key];
                        return (
                          <div key={key} className="flex justify-between items-center">
                            <span className="text-gray-700">{label}</span>
                            <span className="font-medium text-gray-900">{formatCurrency(parseFloat(value))}</span>
                          </div>
                        );
                      })}
                      {/* Custom Expenses */}
                      {customExpenses.map(exp => (
                        exp.value ? (
                          <div key={exp.id} className="flex justify-between items-center">
                            <span className="text-gray-700">{exp.name}</span>
                            <span className="font-medium text-gray-900">{formatCurrency(parseFloat(exp.value))}</span>
                          </div>
                        ) : null
                      ))}
                      <div className="border-t pt-3">
                        <div className="flex justify-between items-center">
                          <span className="font-medium text-gray-900">Total Expenses</span>
                          <span className="font-semibold text-red-600">
                            {formatCurrency(
                              Object.values(budgetData)
                                .filter(value => value !== '')
                                .reduce((sum, value) => sum + parseFloat(value), 0)
                              + customExpenses.filter(exp => exp.value).reduce((sum, exp) => sum + parseFloat(exp.value), 0)
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
                              (Object.values(budgetData)
                                .filter(value => value !== '')
                                .reduce((sum, value) => sum + parseFloat(value), 0)
                              + customExpenses.filter(exp => exp.value).reduce((sum, exp) => sum + parseFloat(exp.value), 0))
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
                  
                  {/* Budget Pie Chart: Combine default and custom expenses */}
                  {(taxBreakdown && (Object.values(budgetData).some(value => value !== '') || customExpenses.length > 0)) ? (
                    <div className="h-64">
                      <Pie 
                        data={{
                          labels: [
                            ...Object.entries(budgetData)
                              .filter(([_, value]) => value !== '')
                              .map(([key]) => {
                                const labels = {
                                  housing: 'Housing',
                                  transportation: 'Transportation',
                                  food: 'Food & Groceries', 
                                  utilities: 'Utilities',
                                  insurance: 'Insurance',
                                  entertainment: 'Entertainment',
                                };
                                return labels[key as keyof typeof labels];
                              }),
                            ...customExpenses.filter(exp => exp.value).map(exp => exp.name)
                          ],
                          datasets: [{
                            data: [
                              ...Object.entries(budgetData)
                                .filter(([_, value]) => value !== '')
                                .map(([_, value]) => parseFloat(value)),
                              ...customExpenses.filter(exp => exp.value).map(exp => parseFloat(exp.value))
                            ],
                            backgroundColor: [
                              '#3b82f6', // blue
                              '#8b5cf6', // purple  
                              '#f59e0b', // amber
                              '#10b981', // green
                              '#ef4444', // red
                              '#f97316', // orange
                              '#6366f1', // indigo
                              ...customExpenses.map((_, i) => `hsl(${(i * 60) % 360}, 70%, 70%)`)
                            ],
                            borderWidth: 2,
                            borderColor: '#ffffff'
                          }]
                        }}
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

                    {/* Streamlined Fund Allocation */}
                    {savingsProjection[0].monthlySavings > 0 && (
                      <div className="bg-white border border-gray-200 p-4 rounded-lg">
                        <div className="flex items-center justify-between mb-4">
                          <h4 className="text-md font-medium text-gray-900 flex items-center">
                            <svg className="h-4 w-4 mr-2 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                            </svg>
                            Allocate Your Savings
                          </h4>
                          <button
                            onClick={() => {
                              const name = prompt('Enter fund name:');
                              if (name) addCustomFund(name);
                            }}
                            className="bg-purple-600 text-white px-2 py-1 rounded text-xs hover:bg-purple-700 transition-colors"
                          >
                            + Add Fund
                          </button>
                        </div>

                        {/* Enhanced Fund List with Black Text */}
                        <div className="space-y-2 max-h-48 overflow-y-auto">
                          {customFunds.map(fund => (
                            <div key={fund.id} className="flex items-center gap-3 p-3 bg-white rounded-lg border-2 border-gray-200 hover:border-purple-200 hover:bg-purple-50 transition-all duration-200 shadow-sm">
                              <div className="flex items-center gap-3 flex-1 min-w-0">
                                <div 
                                  className="w-4 h-4 rounded-full flex-shrink-0 border border-white shadow-sm"
                                  style={{ backgroundColor: fund.color }}
                                />
                                <span className="text-sm font-semibold text-black truncate">{fund.name}</span>
                              </div>
                              
                              <div className="flex items-center gap-3">
                                <input
                                  type="number"
                                  min="0"
                                  max="100"
                                  value={fund.percentage}
                                  onChange={(e) => updateFundPercentage(fund.id, parseInt(e.target.value) || 0)}
                                  onWheel={(e) => e.currentTarget.blur()}
                                  onFocus={(e) => e.target.addEventListener('wheel', (event) => event.preventDefault())}
                                  onBlur={(e) => e.target.removeEventListener('wheel', (event) => event.preventDefault())}
                                  className="w-16 px-2 py-1.5 text-sm font-medium text-black border border-gray-300 rounded-md text-center focus:ring-2 focus:ring-purple-500 focus:border-purple-500 bg-white"
                                />
                                <span className="text-sm font-medium text-black w-4">%</span>
                                <div className="text-sm text-black font-semibold w-20 text-right bg-green-50 px-2 py-1 rounded">
                                  {formatCurrency(((savingsProjection[0]?.monthlySavings || 0) * fund.percentage) / 100)}
                                </div>
                                <button
                                  onClick={() => removeCustomFund(fund.id)}
                                  className="text-red-500 hover:text-red-700 hover:bg-red-100 text-lg w-6 h-6 flex items-center justify-center rounded-full transition-colors font-bold"
                                  title="Remove fund"
                                >
                                  ×
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* Enhanced Total Allocation Display */}
                        <div className="mt-3 pt-3 border-t border-gray-200">
                          {(() => {
                            const total = customFunds.reduce((sum, fund) => sum + fund.percentage, 0);
                            const remaining = 100 - total;
                            const progressPercentage = Math.min(total, 100);
                            
                            return (
                              <>
                                {/* Progress Bar */}
                                <div className="mb-3">
                                  <div className="flex items-center justify-between text-sm mb-2">
                                    <span className="text-gray-600">Allocation Progress</span>
                                    <span className="font-medium text-gray-900">{total}% / 100%</span>
                                  </div>
                                  <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                                    <div 
                                      className={`h-2 rounded-full transition-all duration-300 ${
                                        total === 100 ? 'bg-green-500' :
                                        total > 100 ? 'bg-red-500' :
                                        'bg-blue-500'
                                      }`}
                                      style={{ width: `${progressPercentage}%` }}
                                    />
                                    {total > 100 && (
                                      <div className="w-full bg-red-200 h-2 relative">
                                        <div className="absolute inset-0 bg-red-500 opacity-30" />
                                      </div>
                                    )}
                                  </div>
                                </div>

                                {/* Status and Remaining */}
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    {total === 100 ? (
                                      <span className="text-xs text-green-600 bg-green-100 px-2 py-1 rounded-full flex items-center gap-1">
                                        ✓ Perfect Allocation
                                      </span>
                                    ) : remaining > 0 ? (
                                      <span className="text-xs text-blue-600 bg-blue-100 px-2 py-1 rounded-full flex items-center gap-1">
                                        📊 {remaining}% Available
                                      </span>
                                    ) : (
                                      <span className="text-xs text-red-600 bg-red-100 px-2 py-1 rounded-full flex items-center gap-1">
                                        ⚠ {Math.abs(remaining)}% Over Limit
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-right">
                                    <div className="text-xs text-gray-500">
                                      {total === 100 ? 'All funds allocated!' :
                                       remaining > 0 ? `You have ${remaining}% left to allocate` :
                                       `Reduce allocation by ${Math.abs(remaining)}%`}
                                    </div>
                                  </div>
                                </div>
                              </>
                            );
                          })()}
                        </div>
                      </div>
                    )}

                    {/* Fund Allocation Charts & Summary */}
                    {savingsProjection.length > 0 && savingsProjection[0]?.monthlySavings > 0 && (
                      <div className="space-y-6">
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
                      </div>
                    )}

                    {/* Fund Summary Cards */}
                    {customFunds.some(f => f.percentage > 0) && savingsProjection.length > 0 && (
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

                    {/* Financial Profile Save Section */}
                    <div className="mt-8 bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-lg p-6">
                      <div className="text-center">
                        <div className="flex items-center justify-center mb-4">
                          <svg className="h-8 w-8 text-blue-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <h4 className="text-xl font-semibold text-gray-900">Complete Financial Profile</h4>
                        </div>
                        
                        <p className="text-gray-600 mb-6 max-w-2xl mx-auto">
                          {currentMember ? (
                            <>You've completed the comprehensive financial planning for <strong>{currentMember.name}</strong>. 
                            Save this complete profile to your household management system.</>
                          ) : (
                            "You've completed your comprehensive financial planning. Save this profile to continue building your financial future."
                          )}
                        </p>

                        {/* Data Completeness Summary */}
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                          <div className="bg-white rounded-lg p-4 border border-blue-200">
                            <div className="text-lg font-bold text-green-600">✓</div>
                            <div className="text-sm text-gray-600">Salary & Taxes</div>
                          </div>
                          <div className="bg-white rounded-lg p-4 border border-blue-200">
                            <div className="text-lg font-bold text-green-600">✓</div>
                            <div className="text-sm text-gray-600">Budget Planning</div>
                          </div>
                          <div className="bg-white rounded-lg p-4 border border-blue-200">
                            <div className="text-lg font-bold text-green-600">✓</div>
                            <div className="text-sm text-gray-600">Savings Analysis</div>
                          </div>
                          <div className="bg-white rounded-lg p-4 border border-blue-200">
                            <div className="text-lg font-bold text-green-600">✓</div>
                            <div className="text-sm text-gray-600">Fund Allocation</div>
                          </div>
                        </div>

                        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                          <button
                            onClick={handleSaveFinancialProfile}
                            disabled={saveStatus === 'saving'}
                            className={`px-8 py-3 rounded-lg font-semibold text-lg transform transition-all duration-200 shadow-lg hover:shadow-xl flex items-center ${
                              saveStatus === 'saving' 
                                ? 'bg-gray-400 cursor-not-allowed' 
                                : saveStatus === 'success'
                                  ? 'bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700'
                                  : saveStatus === 'error'
                                    ? 'bg-gradient-to-r from-red-600 to-red-600 hover:from-red-700 hover:to-red-700'
                                    : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 hover:scale-105'
                            } text-white`}
                          >
                            {saveStatus === 'saving' ? (
                              <>
                                <svg className="animate-spin h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Saving Profile...
                              </>
                            ) : saveStatus === 'success' ? (
                              <>
                                <svg className="h-5 w-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                                Profile Saved Successfully!
                              </>
                            ) : saveStatus === 'error' ? (
                              <>
                                <svg className="h-5 w-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                                Save Failed - Try Again
                              </>
                            ) : (
                              <>
                                <svg className="h-5 w-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3-3m0 0l-3 3m3-3v12" />
                                </svg>
                                Save Complete Financial Profile
                              </>
                            )}
                          </button>
                          
                          {currentMember && (
                            <Link
                              to="/"
                              className="text-blue-600 hover:text-blue-800 font-medium underline flex items-center"
                            >
                              <svg className="h-4 w-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                              </svg>
                              Return to Household Overview
                            </Link>
                          )}
                        </div>
                      </div>
                    </div>
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

export default Salary;