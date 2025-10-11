import React, { useState, useEffect } from 'react';
import { CurrencyDollarIcon, CalculatorIcon, DocumentTextIcon } from '@heroicons/react/24/outline';

interface TaxCalculationResult {
  grossIncome: number;
  adjustedGrossIncome: number;
  taxableIncome: number;
  federal: {
    taxableIncome: number;
    tax: number;
    effectiveRate: number;
    marginalRate: number;
  };
  state: {
    taxableIncome: number;
    tax: number;
    effectiveRate: number;
    marginalRate: number;
    name: string;
  };
  fica: {
    socialSecurityTax: number;
    medicareTax: number;
    additionalMedicareTax: number;
    totalFica: number;
  };
  deductions: {
    type: 'standard' | 'itemized';
    federal: number;
    state: number;
  };
  totalTax: number;
  netIncome: number;
  effectiveTaxRate: number;
}

interface StateInfo {
  name: string;
  code: string;
  hasStateIncomeTax: boolean;
}

const TaxCalculator: React.FC = () => {
  const [formData, setFormData] = useState({
    grossIncome: '',
    filingStatus: 'single',
    state: 'CA',
    deductionType: 'standard',
    itemizedAmount: '',
    traditional401k: '',
    traditionalIRA: '',
    hsa: '',
    healthInsurance: '',
    dentalVision: '',
    fsaDcap: '',
  });

  const [result, setResult] = useState<TaxCalculationResult | null>(null);
  const [states, setStates] = useState<StateInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchStates();
  }, []);

  const fetchStates = async () => {
    try {
      const response = await fetch('/api/tax/states');
      if (response.ok) {
        const data = await response.json();
        setStates(data.states);
      }
    } catch (err) {
      console.error('Failed to fetch states:', err);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setError(null);
  };

  const calculateTaxes = async () => {
    if (!formData.grossIncome || parseFloat(formData.grossIncome) <= 0) {
      setError('Please enter a valid gross income');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const payload = {
        grossIncome: parseFloat(formData.grossIncome),
        filingStatus: formData.filingStatus,
        state: formData.state,
        deductions: formData.deductionType === 'itemized' ? {
          type: 'itemized',
          amount: parseFloat(formData.itemizedAmount) || 0
        } : {
          type: 'standard'
        },
        retirementContributions: {
          traditional401k: parseFloat(formData.traditional401k) || 0,
          traditionalIRA: parseFloat(formData.traditionalIRA) || 0,
          hsa: parseFloat(formData.hsa) || 0,
        },
        payrollDeductions: {
          healthInsurance: parseFloat(formData.healthInsurance) || 0,
          dentalVision: parseFloat(formData.dentalVision) || 0,
          fsaDcap: parseFloat(formData.fsaDcap) || 0,
        }
      };

      const response = await fetch('/api/tax/calculate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.details || 'Tax calculation failed');
      }

      const calculationResult = await response.json();
      setResult(calculationResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatPercent = (percent: number): string => {
    return `${(percent * 100).toFixed(2)}%`;
  };

  return (
    <div className="space-y-6">
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex items-center mb-6">
          <CalculatorIcon className="h-8 w-8 text-blue-600 mr-3" />
          <h2 className="text-2xl font-bold text-gray-900">Tax Calculator 2025</h2>
        </div>

        {/* Input Form */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900">Basic Information</h3>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Annual Gross Income
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <CurrencyDollarIcon className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="number"
                  value={formData.grossIncome}
                  onChange={(e) => handleInputChange('grossIncome', e.target.value)}
                  className="pl-10 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  placeholder="100000"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Filing Status
              </label>
              <select
                value={formData.filingStatus}
                onChange={(e) => handleInputChange('filingStatus', e.target.value)}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              >
                <option value="single">Single</option>
                <option value="marriedFilingJointly">Married Filing Jointly</option>
                <option value="marriedFilingSeparately">Married Filing Separately</option>
                <option value="headOfHousehold">Head of Household</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                State
              </label>
              <select
                value={formData.state}
                onChange={(e) => handleInputChange('state', e.target.value)}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              >
                {states.map((state) => (
                  <option key={state.code} value={state.code}>
                    {state.name} {!state.hasStateIncomeTax && '(No State Tax)'}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Deductions and Pre-tax Contributions */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900">Deductions & Pre-tax Contributions</h3>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Deduction Type
              </label>
              <div className="flex space-x-4">
                <label className="flex items-center">
                  <input
                    type="radio"
                    value="standard"
                    checked={formData.deductionType === 'standard'}
                    onChange={(e) => handleInputChange('deductionType', e.target.value)}
                    className="focus:ring-blue-500 h-4 w-4 text-blue-600 border-gray-300"
                  />
                  <span className="ml-2 text-sm text-gray-700">Standard</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    value="itemized"
                    checked={formData.deductionType === 'itemized'}
                    onChange={(e) => handleInputChange('deductionType', e.target.value)}
                    className="focus:ring-blue-500 h-4 w-4 text-blue-600 border-gray-300"
                  />
                  <span className="ml-2 text-sm text-gray-700">Itemized</span>
                </label>
              </div>
            </div>

            {formData.deductionType === 'itemized' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Itemized Deduction Amount
                </label>
                <input
                  type="number"
                  value={formData.itemizedAmount}
                  onChange={(e) => handleInputChange('itemizedAmount', e.target.value)}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  placeholder="25000"
                />
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  401(k) Contribution
                </label>
                <input
                  type="number"
                  value={formData.traditional401k}
                  onChange={(e) => handleInputChange('traditional401k', e.target.value)}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  placeholder="22500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Traditional IRA
                </label>
                <input
                  type="number"
                  value={formData.traditionalIRA}
                  onChange={(e) => handleInputChange('traditionalIRA', e.target.value)}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  placeholder="6500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  HSA Contribution
                </label>
                <input
                  type="number"
                  value={formData.hsa}
                  onChange={(e) => handleInputChange('hsa', e.target.value)}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  placeholder="4300"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Health Insurance
                </label>
                <input
                  type="number"
                  value={formData.healthInsurance}
                  onChange={(e) => handleInputChange('healthInsurance', e.target.value)}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  placeholder="3600"
                />
              </div>
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
            <div className="text-sm text-red-700">{error}</div>
          </div>
        )}

        <button
          onClick={calculateTaxes}
          disabled={loading}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium py-3 px-4 rounded-lg transition-colors"
        >
          {loading ? 'Calculating...' : 'Calculate Taxes'}
        </button>
      </div>

      {/* Results */}
      {result && (
        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex items-center mb-6">
            <DocumentTextIcon className="h-8 w-8 text-green-600 mr-3" />
            <h2 className="text-2xl font-bold text-gray-900">Tax Calculation Results</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {/* Summary Cards */}
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="text-sm font-medium text-blue-600">Gross Income</div>
              <div className="text-2xl font-bold text-blue-900">{formatCurrency(result.grossIncome)}</div>
            </div>

            <div className="bg-red-50 p-4 rounded-lg">
              <div className="text-sm font-medium text-red-600">Total Tax</div>
              <div className="text-2xl font-bold text-red-900">{formatCurrency(result.totalTax)}</div>
              <div className="text-sm text-red-600">{formatPercent(result.effectiveTaxRate)}</div>
            </div>

            <div className="bg-green-50 p-4 rounded-lg">
              <div className="text-sm font-medium text-green-600">Net Income</div>
              <div className="text-2xl font-bold text-green-900">{formatCurrency(result.netIncome)}</div>
            </div>

            <div className="bg-purple-50 p-4 rounded-lg">
              <div className="text-sm font-medium text-purple-600">Effective Rate</div>
              <div className="text-2xl font-bold text-purple-900">{formatPercent(result.effectiveTaxRate)}</div>
            </div>
          </div>

          {/* Detailed Breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Tax Breakdown */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Tax Breakdown</h3>
              <div className="space-y-3">
                <div className="flex justify-between py-2 border-b border-gray-200">
                  <span className="text-gray-600">Federal Income Tax</span>
                  <span className="font-medium">{formatCurrency(result.federal.tax)}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-200">
                  <span className="text-gray-600">State Income Tax ({result.state.name})</span>
                  <span className="font-medium">{formatCurrency(result.state.tax)}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-200">
                  <span className="text-gray-600">Social Security Tax</span>
                  <span className="font-medium">{formatCurrency(result.fica.socialSecurityTax)}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-200">
                  <span className="text-gray-600">Medicare Tax</span>
                  <span className="font-medium">{formatCurrency(result.fica.medicareTax)}</span>
                </div>
                {result.fica.additionalMedicareTax > 0 && (
                  <div className="flex justify-between py-2 border-b border-gray-200">
                    <span className="text-gray-600">Additional Medicare Tax</span>
                    <span className="font-medium">{formatCurrency(result.fica.additionalMedicareTax)}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Income Breakdown */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Income Breakdown</h3>
              <div className="space-y-3">
                <div className="flex justify-between py-2 border-b border-gray-200">
                  <span className="text-gray-600">Gross Income</span>
                  <span className="font-medium">{formatCurrency(result.grossIncome)}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-200">
                  <span className="text-gray-600">Adjusted Gross Income</span>
                  <span className="font-medium">{formatCurrency(result.adjustedGrossIncome)}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-200">
                  <span className="text-gray-600">Deductions ({result.deductions.type})</span>
                  <span className="font-medium">-{formatCurrency(result.deductions.federal)}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-200">
                  <span className="text-gray-600">Taxable Income</span>
                  <span className="font-medium">{formatCurrency(result.taxableIncome)}</span>
                </div>
                <div className="flex justify-between py-2 font-semibold text-lg">
                  <span className="text-gray-900">Net Income</span>
                  <span className="text-green-600">{formatCurrency(result.netIncome)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Tax Rates */}
          <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="font-semibold text-gray-900 mb-2">Federal Tax Rates</h4>
              <div className="text-sm space-y-1">
                <div>Effective Rate: <span className="font-medium">{formatPercent(result.federal.effectiveRate)}</span></div>
                <div>Marginal Rate: <span className="font-medium">{formatPercent(result.federal.marginalRate)}</span></div>
              </div>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="font-semibold text-gray-900 mb-2">State Tax Rates ({result.state.name})</h4>
              <div className="text-sm space-y-1">
                <div>Effective Rate: <span className="font-medium">{formatPercent(result.state.effectiveRate)}</span></div>
                <div>Marginal Rate: <span className="font-medium">{formatPercent(result.state.marginalRate)}</span></div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TaxCalculator;