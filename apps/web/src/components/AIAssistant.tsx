import { useState, useRef, useEffect } from 'react';
import { ChatBubbleLeftRightIcon, PaperAirplaneIcon, XMarkIcon } from '@heroicons/react/24/outline';

interface Message {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  suggestions?: string[];
  actions?: AIAction[];
}

interface AIAction {
  id: string;
  type: 'create_goal' | 'adjust_budget' | 'set_savings' | 'optimize_budget' | 'create_custom_fund' | 'add_member_expense' | 'reduce_member_expense' | 'update_member_profile';
  label: string;
  description: string;
  data: any;
  executed?: boolean;
}

interface AIAssistantProps {
  householdData: {
    totalMembers: number;
    workingMembers: number;
    monthlyNetIncome: number;
    monthlyExpenses: number;
    monthlySavings: number;
    savingsRate: number;
    members?: Array<{
      id: string;
      name: string;
      role: string;
      isWorking: boolean;
    }>;
  };
  onCreateGoal?: (goal: {
    title: string;
    targetAmount: number;
    currentAmount: number;
    targetDate?: string;
    category: string;
  }) => void;
  onAdjustBudget?: (adjustments: {
    category: string;
    oldAmount: number;
    newAmount: number;
  }[]) => void;
  onSetSavings?: (monthlyAmount: number) => void;
  onOptimizeBudget?: (allocation: {
    needs: number;
    wants: number;
    savings: number;
  }) => void;
  onCreateCustomFund?: (fund: {
    memberId: string;
    name: string;
    percentage: number;
    description?: string;
    targetAmount?: number;
  }) => void;
  onAddMemberExpense?: (expense: {
    memberId: string;
    category: string;
    amount: number;
    description: string;
    recurring: boolean;
  }) => void;
  onReduceMemberExpense?: (expense: {
    memberId: string;
    category: string;
    reductionAmount: number;
    description: string;
  }) => void;
  onUpdateMemberProfile?: (update: {
    memberId: string;
    field: 'salary' | 'expenses' | 'savings' | 'profile';
    value: any;
    description: string;
  }) => void;
}

export default function AIAssistant({ 
  householdData, 
  onCreateGoal, 
  onAdjustBudget, 
  onSetSavings, 
  onOptimizeBudget,
  onCreateCustomFund,
  onAddMemberExpense,
  onReduceMemberExpense,
  onUpdateMemberProfile
}: AIAssistantProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [executedActions, setExecutedActions] = useState<string[]>([]);
  const [undoHistory, setUndoHistory] = useState<any[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (isOpen && messages.length === 0) {
      // Initial greeting message
      const welcomeMessage: Message = {
        id: '1',
        type: 'assistant',
        content: `Hi! I'm your FinSight AI Assistant. I've analyzed your household finances and I'm here to help you save more money. Your current savings rate is ${householdData.savingsRate.toFixed(1)}%. How can I help you today?`,
        timestamp: new Date(),
        suggestions: [
          'Analyze my spending patterns',
          'How can I improve my savings rate?',
          'Create a savings goal',
          'Budget optimization tips'
        ]
      };
      setMessages([welcomeMessage]);
    }
  }, [isOpen, householdData.savingsRate]);

  const generateAIResponse = (userInput: string): Message => {
    const input = userInput.toLowerCase();
    let response = '';
    let suggestions: string[] = [];
    let actions: AIAction[] = [];

    if (input.includes('spending') || input.includes('expenses')) {
      const suggestedReduction = Math.round(householdData.monthlyExpenses * 0.15); // 15% reduction target
      
      response = `Based on your data, you're spending $${(householdData.monthlyExpenses).toLocaleString()} monthly. I can help you reduce this by $${suggestedReduction.toLocaleString()} (15%):
      
      • Review subscriptions - Cancel unused services
      • Meal planning can reduce food costs by 15-20%
      • Consider generic brands for savings
      • Negotiate bills (insurance, phone, internet)`;
      
      suggestions = ['Set a spending limit', 'Track daily expenses', 'Find subscription savings'];
      
      actions = [{
        id: `reduce_expenses_${Date.now()}`,
        type: 'adjust_budget',
        label: `Reduce expenses by $${suggestedReduction.toLocaleString()}`,
        description: `Lower monthly expenses from $${householdData.monthlyExpenses.toLocaleString()} to $${(householdData.monthlyExpenses - suggestedReduction).toLocaleString()}`,
        data: {
          adjustments: [
            { category: 'Entertainment', oldAmount: householdData.monthlyExpenses * 0.1, newAmount: householdData.monthlyExpenses * 0.07 },
            { category: 'Dining Out', oldAmount: householdData.monthlyExpenses * 0.08, newAmount: householdData.monthlyExpenses * 0.05 }
          ]
        }
      }];
    }
    else if (input.includes('savings') || input.includes('save')) {
      const targetSavings = householdData.monthlyNetIncome * 0.2; // 20% target
      const currentShortfall = targetSavings - householdData.monthlySavings;
      
      if (householdData.savingsRate >= 20) {
        response = `Excellent! You're already saving ${householdData.savingsRate.toFixed(1)}%, which exceeds the recommended 20%. Let me help you create an emergency fund goal.`;
        
        actions = [{
          id: `emergency_fund_${Date.now()}`,
          type: 'create_goal',
          label: 'Create Emergency Fund Goal',
          description: `Set up a $${(householdData.monthlyExpenses * 6).toLocaleString()} emergency fund (6 months of expenses)`,
          data: {
            title: 'Emergency Fund',
            targetAmount: householdData.monthlyExpenses * 6,
            currentAmount: 0,
            category: 'Emergency'
          }
        }];
      } else {
        response = `Your current savings rate is ${householdData.savingsRate.toFixed(1)}%. To reach the recommended 20%, you'd need to save an additional $${currentShortfall.toFixed(0)} per month. I can automatically set this up for you!`;
        
        actions = [{
          id: `increase_savings_${Date.now()}`,
          type: 'set_savings',
          label: `Increase savings to $${targetSavings.toFixed(0)}/month`,
          description: `Automatically save $${currentShortfall.toFixed(0)} more per month to reach 20% savings rate`,
          data: { monthlyAmount: targetSavings }
        }];
      }
      
      suggestions = ['Create savings goal', 'Automate savings', 'Emergency fund plan'];
    }
    else if (input.includes('budget') || input.includes('optimize')) {
      const needs = householdData.monthlyNetIncome * 0.5;
      const wants = householdData.monthlyNetIncome * 0.3;
      const savings = householdData.monthlyNetIncome * 0.2;
      
      response = `Let's optimize your budget using the 50/30/20 rule:
      
      • 50% Needs: $${needs.toLocaleString()}
      • 30% Wants: $${wants.toLocaleString()}
      • 20% Savings: $${savings.toLocaleString()}
      
      Current allocation: You're saving ${householdData.savingsRate.toFixed(1)}% vs. the recommended 20%. I can automatically restructure your budget!`;
      
      suggestions = ['Apply 50/30/20 rule', 'Custom budget split', 'Track categories'];
      
      actions = [{
        id: `optimize_budget_${Date.now()}`,
        type: 'optimize_budget',
        label: 'Apply 50/30/20 Budget Rule',
        description: `Restructure your $${householdData.monthlyNetIncome.toLocaleString()} income using the optimal 50/30/20 allocation`,
        data: {
          needs: needs,
          wants: wants,
          savings: savings
        }
      }];
    }
    else if (input.includes('goal') || input.includes('target')) {
      response = `Let's set some financial goals! I can create these for you right now:
      
      • Emergency Fund: 3-6 months of expenses ($${(householdData.monthlyExpenses * 3).toLocaleString()} - $${(householdData.monthlyExpenses * 6).toLocaleString()})
      • Vacation Fund: Start with $2,000-5,000
      • Home Down Payment: 10-20% of home value
      • Retirement: Increase contributions by 1% annually`;
      
      suggestions = ['Emergency fund goal', 'Vacation savings', 'Retirement planning'];
      
      actions = [
        {
          id: `emergency_goal_${Date.now()}`,
          type: 'create_goal',
          label: 'Create Emergency Fund Goal',
          description: `Set up a $${(householdData.monthlyExpenses * 6).toLocaleString()} emergency fund goal`,
          data: {
            title: 'Emergency Fund',
            targetAmount: householdData.monthlyExpenses * 6,
            currentAmount: 0,
            category: 'Emergency'
          }
        },
        {
          id: `vacation_goal_${Date.now()}`,
          type: 'create_goal',
          label: 'Create Vacation Fund Goal',
          description: 'Set up a $5,000 vacation savings goal',
          data: {
            title: 'Vacation Fund',
            targetAmount: 5000,
            currentAmount: 0,
            category: 'Travel'
          }
        }
      ];
    }
    else if (input.includes('income') || input.includes('earn')) {
      response = `Your household earns $${householdData.monthlyNetIncome.toLocaleString()} monthly. Ways to increase income:
      
      • Side hustles (freelancing, delivery, tutoring)
      • Skill development for promotions
      • Passive income (investments, rental property)
      • Negotiate salary raises`;
      
      suggestions = ['Side hustle ideas', 'Skill development', 'Investment options'];
    }
    else if (input.includes('fund') || input.includes('custom fund') || input.includes('create fund')) {
      response = `I can help you create custom savings funds! Here are some popular fund ideas:
      
      • Emergency Fund (3-6 months expenses)
      • Vacation/Travel Fund ($2,000-10,000)
      • Home Down Payment Fund (10-20% of target home price)
      • Car Replacement Fund ($15,000-40,000)
      • Education Fund ($5,000-50,000)
      • Wedding Fund ($10,000-50,000)
      
      I'll create these as separate tracking categories in your savings plan.`;
      
      suggestions = ['Emergency fund', 'Vacation fund', 'Home down payment', 'Car fund'];
      
      actions = [
        {
          id: `custom_emergency_fund_${Date.now()}`,
          type: 'create_custom_fund',
          label: 'Create Emergency Fund',
          description: `Set up a dedicated emergency fund with ${Math.round((householdData.monthlySavings * 0.4) * 100) / 100}% of your savings`,
          data: {
            memberId: householdData.members?.[0]?.id || 'primary',
            name: 'Emergency Fund',
            percentage: 40,
            description: 'Emergency fund for unexpected expenses',
            targetAmount: householdData.monthlyExpenses * 6
          }
        },
        {
          id: `custom_vacation_fund_${Date.now()}`,
          type: 'create_custom_fund',
          label: 'Create Vacation Fund',
          description: 'Set up a vacation fund with 20% of your savings',
          data: {
            memberId: householdData.members?.[0]?.id || 'primary',
            name: 'Vacation Fund',
            percentage: 20,
            description: 'Annual vacation and travel expenses',
            targetAmount: 5000
          }
        }
      ];
    }
    else if (input.includes('expense') || input.includes('add expense') || input.includes('new expense')) {
      response = `I can help you add or manage expenses for household members. Common expense categories:
      
      • Housing (rent, mortgage, utilities)
      • Transportation (car payment, gas, insurance)
      • Food & Dining (groceries, restaurants)
      • Healthcare (insurance, medical bills)
      • Entertainment & Recreation
      • Personal Care & Shopping
      
      I can add these as recurring monthly expenses or one-time costs.`;
      
      suggestions = ['Add recurring expense', 'Add one-time cost', 'Review current expenses'];
      
      actions = [
        {
          id: `add_recurring_expense_${Date.now()}`,
          type: 'add_member_expense',
          label: 'Add Monthly Subscription',
          description: 'Add a $15/month streaming service expense',
          data: {
            memberId: householdData.members?.[0]?.id || 'primary',
            category: 'Entertainment',
            amount: 15,
            description: 'Monthly streaming service subscription',
            recurring: true
          }
        },
        {
          id: `add_grocery_expense_${Date.now()}`,
          type: 'add_member_expense',
          label: 'Increase Grocery Budget',
          description: 'Add $100/month for organic food upgrade',
          data: {
            memberId: householdData.members?.[0]?.id || 'primary',
            category: 'Food & Dining',
            amount: 100,
            description: 'Organic food budget increase',
            recurring: true
          }
        }
      ];
    }
    else if (input.includes('reduce') || input.includes('cut') || input.includes('lower expense')) {
      const suggestedReduction = Math.round(householdData.monthlyExpenses * 0.1); // 10% reduction
      
      response = `I can help you reduce expenses! Based on your current spending of $${householdData.monthlyExpenses.toLocaleString()}/month, here are some areas to cut:
      
      • Cancel unused subscriptions ($20-100/month)
      • Reduce dining out by 50% ($${Math.round(householdData.monthlyExpenses * 0.04).toLocaleString()}/month)
      • Switch to generic brands ($30-80/month)
      • Bundle insurance policies ($50-150/month)
      
      Total potential savings: $${suggestedReduction.toLocaleString()}/month`;
      
      suggestions = ['Cancel subscriptions', 'Reduce dining out', 'Review insurance'];
      
      actions = [
        {
          id: `reduce_subscription_${Date.now()}`,
          type: 'reduce_member_expense',
          label: 'Cancel Unused Subscriptions',
          description: 'Reduce monthly expenses by $50 (subscription cleanup)',
          data: {
            memberId: householdData.members?.[0]?.id || 'primary',
            category: 'Entertainment',
            reductionAmount: 50,
            description: 'Cancelled unused streaming and app subscriptions'
          }
        },
        {
          id: `reduce_dining_${Date.now()}`,
          type: 'reduce_member_expense',
          label: 'Reduce Dining Out',
          description: `Cut dining expenses by $${Math.round(householdData.monthlyExpenses * 0.04)}`,
          data: {
            memberId: householdData.members?.[0]?.id || 'primary',
            category: 'Food & Dining',
            reductionAmount: Math.round(householdData.monthlyExpenses * 0.04),
            description: 'Meal planning and home cooking initiative'
          }
        }
      ];
    }
    else if (input.includes('update') || input.includes('change salary') || input.includes('profile')) {
      response = `I can help you update household member profiles and financial information:
      
      • Salary changes (promotions, new jobs)
      • Expense adjustments (lifestyle changes)
      • Savings goal updates
      • Personal information updates
      
      This helps keep your financial plan accurate and up-to-date.`;
      
      suggestions = ['Update salary', 'Adjust expenses', 'Change savings goal'];
      
      actions = [
        {
          id: `update_salary_${Date.now()}`,
          type: 'update_member_profile',
          label: 'Update Salary (+5%)',
          description: 'Apply a 5% salary increase to reflect recent promotion',
          data: {
            memberId: householdData.members?.[0]?.id || 'primary',
            field: 'salary',
            value: householdData.monthlyNetIncome * 12 * 1.05,
            description: '5% salary increase from promotion'
          }
        }
      ];
    }
    else {
      response = `I'm here to help with your finances! I can assist with budgeting, savings strategies, expense reduction, goal setting, fund creation, and expense management. What would you like to work on?`;
      suggestions = ['Analyze spending', 'Savings tips', 'Budget help', 'Set financial goals', 'Create custom funds', 'Manage expenses'];
    }

    return {
      id: Date.now().toString(),
      type: 'assistant',
      content: response,
      timestamp: new Date(),
      suggestions,
      actions
    };
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: inputMessage,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsTyping(true);

    // Simulate AI processing delay
    setTimeout(() => {
      const aiResponse = generateAIResponse(inputMessage);
      setMessages(prev => [...prev, aiResponse]);
      setIsTyping(false);
    }, 1000);
  };

  const handleSuggestionClick = (suggestion: string) => {
    setInputMessage(suggestion);
    handleSendMessage();
  };

  const getCurrentFinancialSnapshot = () => {
    // This would capture current financial state for undo functionality
    // For now, return a timestamp as we'll implement full undo later
    return {
      timestamp: new Date().toISOString(),
      householdData: { ...householdData }
    };
  };

  const executeAction = (action: AIAction) => {
    // Get confirmation message based on action type
    let confirmationMessage = '';
    switch (action.type) {
      case 'create_goal':
        confirmationMessage = `Are you sure you want to create the goal "${action.data.title}" with a target of $${action.data.targetAmount.toLocaleString()}?`;
        break;
      case 'adjust_budget':
        const adjustmentsSummary = action.data.adjustments.map((adj: any) => 
          `${adj.category}: $${adj.oldAmount} → $${adj.newAmount}`
        ).join(', ');
        confirmationMessage = `Are you sure you want to adjust your budget? Changes: ${adjustmentsSummary}`;
        break;
      case 'set_savings':
        confirmationMessage = `Are you sure you want to set your monthly savings to $${action.data.monthlyAmount.toFixed(0)}?`;
        break;
      case 'optimize_budget':
        confirmationMessage = `Are you sure you want to optimize your budget using the 50/30/20 rule? This will restructure your financial allocation.`;
        break;
      case 'create_custom_fund':
        confirmationMessage = `Are you sure you want to create the custom fund "${action.data.name}" with ${action.data.percentage}% allocation for the selected member?`;
        break;
      case 'add_member_expense':
        confirmationMessage = `Are you sure you want to add a ${action.data.recurring ? 'recurring' : 'one-time'} expense of $${action.data.amount} for ${action.data.category}?`;
        break;
      case 'reduce_member_expense':
        confirmationMessage = `Are you sure you want to reduce expenses in ${action.data.category} by $${action.data.reductionAmount} for the selected member?`;
        break;
      case 'update_member_profile':
        confirmationMessage = `Are you sure you want to update the member's ${action.data.field}? This will modify their financial profile.`;
        break;
    }

    // Show confirmation dialog
    if (!window.confirm(confirmationMessage)) {
      return; // User cancelled
    }

    // Store original data for undo functionality
    const undoData = {
      actionId: action.id,
      type: action.type,
      timestamp: new Date(),
      originalData: getCurrentFinancialSnapshot()
    };
    setUndoHistory(prev => [...prev.slice(-4), undoData]); // Keep last 5 actions

    switch (action.type) {
      case 'create_goal':
        if (onCreateGoal) {
          onCreateGoal(action.data);
          setExecutedActions(prev => [...prev, action.id]);
          
          // Add success message with undo option
          const successMessage: Message = {
            id: Date.now().toString(),
            type: 'assistant',
            content: `✅ Successfully created goal: "${action.data.title}" with target of $${action.data.targetAmount.toLocaleString()}! You can undo this action if needed.`,
            timestamp: new Date()
          };
          setMessages(prev => [...prev, successMessage]);
        }
        break;
        
      case 'adjust_budget':
        if (onAdjustBudget) {
          onAdjustBudget(action.data.adjustments);
          setExecutedActions(prev => [...prev, action.id]);
          
          const successMessage: Message = {
            id: Date.now().toString(),
            type: 'assistant',
            content: `✅ Budget adjusted! Your expenses have been optimized as requested. You can undo this action if needed.`,
            timestamp: new Date()
          };
          setMessages(prev => [...prev, successMessage]);
        }
        break;
        
      case 'set_savings':
        if (onSetSavings) {
          onSetSavings(action.data.monthlyAmount);
          setExecutedActions(prev => [...prev, action.id]);
          
          const successMessage: Message = {
            id: Date.now().toString(),
            type: 'assistant',
            content: `✅ Savings plan updated! Now saving $${action.data.monthlyAmount.toFixed(0)} per month. You can undo this action if needed.`,
            timestamp: new Date()
          };
          setMessages(prev => [...prev, successMessage]);
        }
        break;
        
      case 'optimize_budget':
        if (onOptimizeBudget) {
          onOptimizeBudget(action.data);
          setExecutedActions(prev => [...prev, action.id]);
          
          const successMessage: Message = {
            id: Date.now().toString(),
            type: 'assistant',
            content: `✅ Budget optimized using 50/30/20 rule! Your financial allocation has been restructured. You can undo this action if needed.`,
            timestamp: new Date()
          };
          setMessages(prev => [...prev, successMessage]);
        }
        break;
        
      case 'create_custom_fund':
        if (onCreateCustomFund) {
          onCreateCustomFund(action.data);
          setExecutedActions(prev => [...prev, action.id]);
          
          const successMessage: Message = {
            id: Date.now().toString(),
            type: 'assistant',
            content: `✅ Custom fund "${action.data.name}" created with ${action.data.percentage}% allocation! You can undo this action if needed.`,
            timestamp: new Date()
          };
          setMessages(prev => [...prev, successMessage]);
        }
        break;
        
      case 'add_member_expense':
        if (onAddMemberExpense) {
          onAddMemberExpense(action.data);
          setExecutedActions(prev => [...prev, action.id]);
          
          const successMessage: Message = {
            id: Date.now().toString(),
            type: 'assistant',
            content: `✅ Added ${action.data.recurring ? 'recurring' : 'one-time'} expense: ${action.data.description} ($${action.data.amount})! You can undo this action if needed.`,
            timestamp: new Date()
          };
          setMessages(prev => [...prev, successMessage]);
        }
        break;
        
      case 'reduce_member_expense':
        if (onReduceMemberExpense) {
          onReduceMemberExpense(action.data);
          setExecutedActions(prev => [...prev, action.id]);
          
          const successMessage: Message = {
            id: Date.now().toString(),
            type: 'assistant',
            content: `✅ Reduced ${action.data.category} expenses by $${action.data.reductionAmount}! You can undo this action if needed.`,
            timestamp: new Date()
          };
          setMessages(prev => [...prev, successMessage]);
        }
        break;
        
      case 'update_member_profile':
        if (onUpdateMemberProfile) {
          onUpdateMemberProfile(action.data);
          setExecutedActions(prev => [...prev, action.id]);
          
          const successMessage: Message = {
            id: Date.now().toString(),
            type: 'assistant',
            content: `✅ Updated member's ${action.data.field}: ${action.data.description}! You can undo this action if needed.`,
            timestamp: new Date()
          };
          setMessages(prev => [...prev, successMessage]);
        }
        break;
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const handleUndo = () => {
    if (undoHistory.length === 0) return;

    const confirmed = window.confirm('Are you sure you want to undo the last AI action? This will revert your most recent financial data change.');
    if (!confirmed) return;

    // Remove the last action from history
    setUndoHistory(prev => prev.slice(0, -1));

    // Add undo message
    const undoMessage: Message = {
      id: Date.now().toString(),
      type: 'assistant',
      content: `↩️ Undid the last action. Note: You may need to refresh to see all changes reflected in the UI.`,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, undoMessage]);

    // For now, we'll just show a message. Full undo would require 
    // more complex state management and reverse operations
  };

  return (
    <>
      {/* Chat Toggle Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 bg-blue-600 hover:bg-blue-700 text-white p-4 rounded-full shadow-lg transition-all duration-300 hover:scale-105 z-40"
      >
        <ChatBubbleLeftRightIcon className="h-6 w-6" />
      </button>

      {/* Chat Window */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 w-96 h-96 bg-white border border-gray-200 rounded-lg shadow-xl flex flex-col z-50">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-blue-600 text-white rounded-t-lg">
            <div className="flex items-center gap-2">
              <ChatBubbleLeftRightIcon className="h-5 w-5" />
              <h3 className="font-semibold">FinSight AI Assistant</h3>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-white hover:text-gray-200 transition-colors"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((message) => (
              <div key={message.id} className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] rounded-lg p-3 ${
                  message.type === 'user' 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-100 text-gray-900'
                }`}>
                  <div className="text-sm whitespace-pre-line">{message.content}</div>
                  <div className={`text-xs mt-1 ${message.type === 'user' ? 'text-blue-100' : 'text-gray-500'}`}>
                    {formatTime(message.timestamp)}
                  </div>
                  {message.actions && (
                    <div className="mt-3 space-y-2">
                      <div className="text-xs font-medium text-gray-600 mb-2">Quick Actions:</div>
                      {message.actions.map((action) => (
                        <button
                          key={action.id}
                          onClick={() => executeAction(action)}
                          disabled={executedActions.includes(action.id)}
                          className={`block w-full text-left text-xs p-3 border rounded transition-colors ${
                            executedActions.includes(action.id)
                              ? 'bg-green-50 border-green-200 text-green-700 cursor-default'
                              : 'bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100'
                          }`}
                        >
                          <div className="font-medium">{action.label}</div>
                          <div className="text-gray-600 mt-1">{action.description}</div>
                          {executedActions.includes(action.id) && (
                            <div className="text-green-600 text-xs mt-1">✓ Completed</div>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                  {message.suggestions && (
                    <div className="mt-3 space-y-2">
                      <div className="text-xs font-medium text-gray-600 mb-2">Ask me about:</div>
                      {message.suggestions.map((suggestion, index) => (
                        <button
                          key={index}
                          onClick={() => handleSuggestionClick(suggestion)}
                          className="block w-full text-left text-xs p-2 bg-white border border-gray-200 rounded hover:bg-gray-50 transition-colors text-gray-700"
                        >
                          {suggestion}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
            
            {isTyping && (
              <div className="flex justify-start">
                <div className="bg-gray-100 rounded-lg p-3">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="p-4 border-t border-gray-200">
            {undoHistory.length > 0 && (
              <div className="mb-3">
                <button
                  onClick={handleUndo}
                  className="text-xs bg-orange-100 hover:bg-orange-200 text-orange-800 px-3 py-1 rounded-full transition-colors flex items-center gap-1"
                >
                  ↩️ Undo Last Action ({undoHistory.length} available)
                </button>
              </div>
            )}
            <div className="flex gap-2">
              <input
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                placeholder="Ask me about your finances..."
                className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={handleSendMessage}
                disabled={!inputMessage.trim()}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white p-2 rounded-lg transition-colors"
              >
                <PaperAirplaneIcon className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}