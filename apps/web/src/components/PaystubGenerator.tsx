import React, { useState } from 'react';
import { DocumentIcon, PrinterIcon, CalculatorIcon } from '@heroicons/react/24/outline';

interface PaystubResult {
  payPeriodInfo: {
    payDate: string;
    payPeriodStart: string;
    payPeriodEnd: string;
    payPeriod: string;
    periodsPerYear: number;
  };
  employeeInfo: {
    name: string;
    employeeId?: string;
    address?: {
      street: string;
      city: string;
      state: string;
      zipCode: string;
    };
  };
  employerInfo: {
    name: string;
    address?: {
      street: string;
      city: string;
      state: string;
      zipCode: string;
    };
    ein?: string;
  };
  currentPeriod: {
    grossPay: number;
    preTaxDeductions: {
      retirement401k: number;
      traditionalIRA: number;
      hsa: number;
      healthInsurance: number;
      dentalVision: number;
      fsaDcap: number;
      parkingTransit: number;
      total: number;
    };
    taxableIncome: number;
    taxes: {
      federalIncomeTax: number;
      stateIncomeTax: number;
      socialSecurityTax: number;
      medicareTax: number;
      additionalMedicareTax: number;
      total: number;
    };
    postTaxDeductions: {
      rothIRA: number;
      lifeInsurance: number;
      disabilityInsurance: number;
      unionDues: number;
      charitableContributions: number;
      total: number;
    };
    netPay: number;
  };
  yearToDate: {
    grossPay: number;
    totalPreTaxDeductions: number;
    taxableIncome: number;
    federalIncomeTax: number;
    stateIncomeTax: number;
    socialSecurityTax: number;
    medicareTax: number;
    additionalMedicareTax: number;
    totalTaxes: number;
    totalPostTaxDeductions: number;
    netPay: number;
  };
  taxInfo: {
    federalEffectiveRate: number;
    federalMarginalRate: number;
    stateEffectiveRate: number;
    stateMarginalRate: number;
    socialSecurityRate: number;
    medicareRate: number;
    additionalMedicareRate: number;
    socialSecurityWageBase: number;
  };
}

const PaystubGenerator: React.FC = () => {
  const [formData, setFormData] = useState({
    // Employee Information
    employeeName: '',
    employeeId: '',
    employeeStreet: '',
    employeeCity: '',
    employeeState: '',
    employeeZip: '',
    
    // Employer Information
    employerName: '',
    employerStreet: '',
    employerCity: '',
    employerState: '',
    employerZip: '',
    employerEin: '',
    
    // Pay Information
    annualSalary: '',
    payPeriod: 'biweekly',
    filingStatus: 'single',
    state: 'CA',
    payDate: new Date().toISOString().split('T')[0],
    
    // Deductions
    retirement401k: '',
    traditionalIRA: '',
    hsa: '',
    healthInsurance: '',
    dentalVision: '',
    fsaDcap: '',
    parkingTransit: '',
    rothIRA: '',
    lifeInsurance: '',
    disabilityInsurance: '',
    unionDues: '',
    charitableContributions: '',
  });

  const [paystub, setPaystub] = useState<PaystubResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setError(null);
  };

  const generatePaystub = async () => {
    if (!formData.employeeName || !formData.employerName || !formData.annualSalary) {
      setError('Please fill in all required fields');
      return;
    }

    if (parseFloat(formData.annualSalary) <= 0) {
      setError('Annual salary must be a positive number');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const payDate = new Date(formData.payDate || new Date());
      const payPeriodEnd = new Date(payDate);
      
      // Calculate pay period start based on pay frequency
      const payPeriodStart = new Date(payDate);
      switch (formData.payPeriod) {
        case 'weekly':
          payPeriodStart.setDate(payPeriodStart.getDate() - 6);
          break;
        case 'biweekly':
          payPeriodStart.setDate(payPeriodStart.getDate() - 13);
          break;
        case 'semimonthly':
          if (payDate.getDate() <= 15) {
            payPeriodStart.setDate(1);
          } else {
            payPeriodStart.setDate(16);
          }
          break;
        case 'monthly':
          payPeriodStart.setDate(1);
          break;
      }

      const payload = {
        employeeInfo: {
          name: formData.employeeName,
          employeeId: formData.employeeId || undefined,
          address: formData.employeeStreet ? {
            street: formData.employeeStreet,
            city: formData.employeeCity,
            state: formData.employeeState,
            zipCode: formData.employeeZip,
          } : undefined,
        },
        employerInfo: {
          name: formData.employerName,
          ein: formData.employerEin || undefined,
          address: formData.employerStreet ? {
            street: formData.employerStreet,
            city: formData.employerCity,
            state: formData.employerState,
            zipCode: formData.employerZip,
          } : undefined,
        },
        payInfo: {
          annualSalary: parseFloat(formData.annualSalary),
          payPeriod: formData.payPeriod,
          filingStatus: formData.filingStatus,
          state: formData.state,
          payDate: formData.payDate,
          payPeriodStart: payPeriodStart.toISOString().split('T')[0],
          payPeriodEnd: payPeriodEnd.toISOString().split('T')[0],
        },
        deductions: {
          retirement401k: parseFloat(formData.retirement401k) || 0,
          traditionalIRA: parseFloat(formData.traditionalIRA) || 0,
          hsa: parseFloat(formData.hsa) || 0,
          healthInsurance: parseFloat(formData.healthInsurance) || 0,
          dentalVision: parseFloat(formData.dentalVision) || 0,
          fsaDcap: parseFloat(formData.fsaDcap) || 0,
          parkingTransit: parseFloat(formData.parkingTransit) || 0,
          rothIRA: parseFloat(formData.rothIRA) || 0,
          lifeInsurance: parseFloat(formData.lifeInsurance) || 0,
          disabilityInsurance: parseFloat(formData.disabilityInsurance) || 0,
          unionDues: parseFloat(formData.unionDues) || 0,
          charitableContributions: parseFloat(formData.charitableContributions) || 0,
        },
      };

      const response = await fetch('/api/tax/paystub', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.details || 'Paystub generation failed');
      }

      const result = await response.json();
      setPaystub(result);
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

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  };

  const printPaystub = () => {
    if (paystub) {
      window.print();
    }
  };

  return (
    <div className="space-y-6">
      {/* Input Form */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex items-center mb-6">
          <CalculatorIcon className="h-8 w-8 text-blue-600 mr-3" />
          <h2 className="text-2xl font-bold text-gray-900">Paystub Generator</h2>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Employee Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900">Employee Information</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  value={formData.employeeName}
                  onChange={(e) => handleInputChange('employeeName', e.target.value)}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  placeholder="John Smith"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Employee ID
                </label>
                <input
                  type="text"
                  value={formData.employeeId}
                  onChange={(e) => handleInputChange('employeeId', e.target.value)}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  placeholder="EMP001"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Address
              </label>
              <div className="space-y-2">
                <input
                  type="text"
                  value={formData.employeeStreet}
                  onChange={(e) => handleInputChange('employeeStreet', e.target.value)}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  placeholder="Street Address"
                />
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  <input
                    type="text"
                    value={formData.employeeCity}
                    onChange={(e) => handleInputChange('employeeCity', e.target.value)}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    placeholder="City"
                  />
                  <select
                    value={formData.employeeState}
                    onChange={(e) => handleInputChange('employeeState', e.target.value)}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  >
                    <option value="">State</option>
                    <option value="CA">CA</option>
                    <option value="NY">NY</option>
                    <option value="TX">TX</option>
                    <option value="FL">FL</option>
                    <option value="WA">WA</option>
                    <option value="IL">IL</option>
                  </select>
                  <input
                    type="text"
                    value={formData.employeeZip}
                    onChange={(e) => handleInputChange('employeeZip', e.target.value)}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    placeholder="ZIP"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Employer Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900">Employer Information</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Company Name *
                </label>
                <input
                  type="text"
                  value={formData.employerName}
                  onChange={(e) => handleInputChange('employerName', e.target.value)}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  placeholder="Acme Corporation"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  EIN
                </label>
                <input
                  type="text"
                  value={formData.employerEin}
                  onChange={(e) => handleInputChange('employerEin', e.target.value)}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  placeholder="12-3456789"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Pay Information */}
        <div className="mt-8 space-y-4">
          <h3 className="text-lg font-medium text-gray-900">Pay Information</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Annual Salary *
              </label>
              <input
                type="number"
                value={formData.annualSalary}
                onChange={(e) => handleInputChange('annualSalary', e.target.value)}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                placeholder="75000"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Pay Period
              </label>
              <select
                value={formData.payPeriod}
                onChange={(e) => handleInputChange('payPeriod', e.target.value)}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              >
                <option value="weekly">Weekly</option>
                <option value="biweekly">Bi-weekly</option>
                <option value="semimonthly">Semi-monthly</option>
                <option value="monthly">Monthly</option>
              </select>
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
                <option value="CA">California</option>
                <option value="NY">New York</option>
                <option value="TX">Texas</option>
                <option value="FL">Florida</option>
                <option value="WA">Washington</option>
                <option value="IL">Illinois</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Pay Date
              </label>
              <input
                type="date"
                value={formData.payDate}
                onChange={(e) => handleInputChange('payDate', e.target.value)}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Deductions */}
        <div className="mt-8 space-y-4">
          <h3 className="text-lg font-medium text-gray-900">Annual Deductions</h3>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                401(k)
              </label>
              <input
                type="number"
                value={formData.retirement401k}
                onChange={(e) => handleInputChange('retirement401k', e.target.value)}
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
                HSA
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

        {error && (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-md">
            <div className="text-sm text-red-700">{error}</div>
          </div>
        )}

        <div className="mt-6">
          <button
            onClick={generatePaystub}
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium py-3 px-4 rounded-lg transition-colors"
          >
            {loading ? 'Generating...' : 'Generate Paystub'}
          </button>
        </div>
      </div>

      {/* Paystub Display */}
      {paystub && (
        <div className="bg-white shadow rounded-lg p-8 print:shadow-none print:rounded-none">
          <div className="flex items-center justify-between mb-6 print:mb-4">
            <div className="flex items-center">
              <DocumentIcon className="h-8 w-8 text-green-600 mr-3 print:hidden" />
              <h2 className="text-2xl font-bold text-gray-900">Paystub</h2>
            </div>
            <button
              onClick={printPaystub}
              className="flex items-center px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors print:hidden"
            >
              <PrinterIcon className="h-5 w-5 mr-2" />
              Print
            </button>
          </div>

          {/* Header Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8 print:mb-6">
            {/* Employee Info */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Employee</h3>
              <div className="text-sm text-gray-700 space-y-1">
                <div className="font-medium">{paystub.employeeInfo.name}</div>
                {paystub.employeeInfo.employeeId && (
                  <div>ID: {paystub.employeeInfo.employeeId}</div>
                )}
                {paystub.employeeInfo.address && (
                  <div className="mt-2">
                    <div>{paystub.employeeInfo.address.street}</div>
                    <div>
                      {paystub.employeeInfo.address.city}, {paystub.employeeInfo.address.state} {paystub.employeeInfo.address.zipCode}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Employer Info */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Employer</h3>
              <div className="text-sm text-gray-700 space-y-1">
                <div className="font-medium">{paystub.employerInfo.name}</div>
                {paystub.employerInfo.ein && (
                  <div>EIN: {paystub.employerInfo.ein}</div>
                )}
                {paystub.employerInfo.address && (
                  <div className="mt-2">
                    <div>{paystub.employerInfo.address.street}</div>
                    <div>
                      {paystub.employerInfo.address.city}, {paystub.employerInfo.address.state} {paystub.employerInfo.address.zipCode}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Pay Period Info */}
          <div className="bg-gray-50 p-4 rounded-lg mb-6 print:bg-gray-100">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <div className="font-medium text-gray-700">Pay Date</div>
                <div className="text-gray-900">{formatDate(paystub.payPeriodInfo.payDate)}</div>
              </div>
              <div>
                <div className="font-medium text-gray-700">Pay Period</div>
                <div className="text-gray-900">
                  {formatDate(paystub.payPeriodInfo.payPeriodStart)} - {formatDate(paystub.payPeriodInfo.payPeriodEnd)}
                </div>
              </div>
              <div>
                <div className="font-medium text-gray-700">Pay Frequency</div>
                <div className="text-gray-900 capitalize">{paystub.payPeriodInfo.payPeriod}</div>
              </div>
              <div>
                <div className="font-medium text-gray-700">Periods/Year</div>
                <div className="text-gray-900">{paystub.payPeriodInfo.periodsPerYear}</div>
              </div>
            </div>
          </div>

          {/* Earnings and Deductions */}
          <div className="overflow-x-auto">
            <table className="w-full border-collapse border border-gray-300">
              <thead>
                <tr className="bg-gray-50">
                  <th className="border border-gray-300 px-4 py-2 text-left text-sm font-medium text-gray-900">
                    Description
                  </th>
                  <th className="border border-gray-300 px-4 py-2 text-right text-sm font-medium text-gray-900">
                    Current
                  </th>
                  <th className="border border-gray-300 px-4 py-2 text-right text-sm font-medium text-gray-900">
                    Year to Date
                  </th>
                </tr>
              </thead>
              <tbody>
                {/* Gross Pay */}
                <tr>
                  <td className="border border-gray-300 px-4 py-2 font-medium">Gross Pay</td>
                  <td className="border border-gray-300 px-4 py-2 text-right">{formatCurrency(paystub.currentPeriod.grossPay)}</td>
                  <td className="border border-gray-300 px-4 py-2 text-right">{formatCurrency(paystub.yearToDate.grossPay)}</td>
                </tr>

                {/* Pre-tax Deductions */}
                {paystub.currentPeriod.preTaxDeductions.total > 0 && (
                  <>
                    <tr className="bg-blue-50">
                      <td colSpan={3} className="border border-gray-300 px-4 py-2 font-medium text-blue-900">
                        Pre-Tax Deductions
                      </td>
                    </tr>
                    {paystub.currentPeriod.preTaxDeductions.retirement401k > 0 && (
                      <tr>
                        <td className="border border-gray-300 px-4 py-2 pl-8">401(k)</td>
                        <td className="border border-gray-300 px-4 py-2 text-right">-{formatCurrency(paystub.currentPeriod.preTaxDeductions.retirement401k)}</td>
                        <td className="border border-gray-300 px-4 py-2 text-right">-{formatCurrency(paystub.currentPeriod.preTaxDeductions.retirement401k * paystub.payPeriodInfo.periodsPerYear)}</td>
                      </tr>
                    )}
                    {paystub.currentPeriod.preTaxDeductions.healthInsurance > 0 && (
                      <tr>
                        <td className="border border-gray-300 px-4 py-2 pl-8">Health Insurance</td>
                        <td className="border border-gray-300 px-4 py-2 text-right">-{formatCurrency(paystub.currentPeriod.preTaxDeductions.healthInsurance)}</td>
                        <td className="border border-gray-300 px-4 py-2 text-right">-{formatCurrency(paystub.currentPeriod.preTaxDeductions.healthInsurance * paystub.payPeriodInfo.periodsPerYear)}</td>
                      </tr>
                    )}
                  </>
                )}

                {/* Taxes */}
                <tr className="bg-red-50">
                  <td colSpan={3} className="border border-gray-300 px-4 py-2 font-medium text-red-900">
                    Taxes
                  </td>
                </tr>
                <tr>
                  <td className="border border-gray-300 px-4 py-2 pl-8">Federal Income Tax</td>
                  <td className="border border-gray-300 px-4 py-2 text-right">-{formatCurrency(paystub.currentPeriod.taxes.federalIncomeTax)}</td>
                  <td className="border border-gray-300 px-4 py-2 text-right">-{formatCurrency(paystub.yearToDate.federalIncomeTax)}</td>
                </tr>
                <tr>
                  <td className="border border-gray-300 px-4 py-2 pl-8">State Income Tax</td>
                  <td className="border border-gray-300 px-4 py-2 text-right">-{formatCurrency(paystub.currentPeriod.taxes.stateIncomeTax)}</td>
                  <td className="border border-gray-300 px-4 py-2 text-right">-{formatCurrency(paystub.yearToDate.stateIncomeTax)}</td>
                </tr>
                <tr>
                  <td className="border border-gray-300 px-4 py-2 pl-8">Social Security Tax</td>
                  <td className="border border-gray-300 px-4 py-2 text-right">-{formatCurrency(paystub.currentPeriod.taxes.socialSecurityTax)}</td>
                  <td className="border border-gray-300 px-4 py-2 text-right">-{formatCurrency(paystub.yearToDate.socialSecurityTax)}</td>
                </tr>
                <tr>
                  <td className="border border-gray-300 px-4 py-2 pl-8">Medicare Tax</td>
                  <td className="border border-gray-300 px-4 py-2 text-right">-{formatCurrency(paystub.currentPeriod.taxes.medicareTax)}</td>
                  <td className="border border-gray-300 px-4 py-2 text-right">-{formatCurrency(paystub.yearToDate.medicareTax)}</td>
                </tr>

                {/* Net Pay */}
                <tr className="bg-green-50 font-bold">
                  <td className="border border-gray-300 px-4 py-2 text-green-900">NET PAY</td>
                  <td className="border border-gray-300 px-4 py-2 text-right text-green-900">{formatCurrency(paystub.currentPeriod.netPay)}</td>
                  <td className="border border-gray-300 px-4 py-2 text-right text-green-900">{formatCurrency(paystub.yearToDate.netPay)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Tax Rate Information */}
          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
            <div className="bg-gray-50 p-4 rounded">
              <h4 className="font-semibold text-gray-900 mb-2">Tax Rates</h4>
              <div className="space-y-1">
                <div className="flex justify-between">
                  <span>Federal Effective:</span>
                  <span>{(paystub.taxInfo.federalEffectiveRate * 100).toFixed(2)}%</span>
                </div>
                <div className="flex justify-between">
                  <span>State Effective:</span>
                  <span>{(paystub.taxInfo.stateEffectiveRate * 100).toFixed(2)}%</span>
                </div>
                <div className="flex justify-between">
                  <span>Social Security:</span>
                  <span>{(paystub.taxInfo.socialSecurityRate * 100).toFixed(2)}%</span>
                </div>
                <div className="flex justify-between">
                  <span>Medicare:</span>
                  <span>{(paystub.taxInfo.medicareRate * 100).toFixed(2)}%</span>
                </div>
              </div>
            </div>
            
            <div className="bg-gray-50 p-4 rounded">
              <h4 className="font-semibold text-gray-900 mb-2">Pay Summary</h4>
              <div className="space-y-1">
                <div className="flex justify-between">
                  <span>Gross Pay:</span>
                  <span>{formatCurrency(paystub.currentPeriod.grossPay)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Total Deductions:</span>
                  <span>-{formatCurrency(paystub.currentPeriod.preTaxDeductions.total + paystub.currentPeriod.taxes.total)}</span>
                </div>
                <div className="flex justify-between font-semibold border-t pt-1 mt-1">
                  <span>Net Pay:</span>
                  <span className="text-green-600">{formatCurrency(paystub.currentPeriod.netPay)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PaystubGenerator;