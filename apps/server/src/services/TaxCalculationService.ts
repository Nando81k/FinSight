import { createLogger } from '../utils/logger';

const logger = createLogger('tax-service');

// 2025 Federal Tax Brackets
export interface TaxBracket {
  min: number;
  max: number | null; // null for highest bracket
  rate: number; // as decimal (e.g., 0.10 for 10%)
}

export interface StateTaxInfo {
  name: string;
  code: string;
  brackets: TaxBracket[];
  standardDeduction: {
    single: number;
    marriedFilingJointly: number;
    marriedFilingSeparately: number;
    headOfHousehold: number;
  };
  hasStateIncomeTax: boolean;
}

export type FilingStatus = 'single' | 'marriedFilingJointly' | 'marriedFilingSeparately' | 'headOfHousehold';

export interface TaxCalculationInput {
  grossIncome: number;
  filingStatus: FilingStatus;
  state: string; // State code (e.g., 'CA', 'TX', 'NY')
  deductions?: {
    type: 'standard' | 'itemized';
    amount?: number; // Required if itemized
    details?: {
      mortgageInterest?: number;
      stateAndLocalTaxes?: number; // SALT - capped at $10,000
      charitableContributions?: number;
      medicalExpenses?: number;
      other?: number;
    };
  };
  exemptions?: {
    personal?: number;
    dependents?: number;
  };
  retirementContributions?: {
    traditional401k?: number;
    traditionalIRA?: number;
    rothIRA?: number; // Post-tax, doesn't reduce taxable income
    hsa?: number;
  };
  payrollDeductions?: {
    healthInsurance?: number;
    dentalVision?: number;
    lifeInsurance?: number;
    fsaDcap?: number; // Flexible Spending Account / Dependent Care
    parkingTransit?: number;
  };
}

export interface TaxCalculationResult {
  grossIncome: number;
  adjustedGrossIncome: number; // After above-the-line deductions
  taxableIncome: number; // After deductions and exemptions
  
  federal: {
    taxableIncome: number;
    tax: number;
    effectiveRate: number;
    marginalRate: number;
    brackets: Array<{
      min: number;
      max: number | null;
      rate: number;
      taxOnBracket: number;
    }>;
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
    additionalMedicareTax: number; // 0.9% on income > threshold
    totalFica: number;
  };
  
  deductions: {
    type: 'standard' | 'itemized';
    federal: number;
    state: number;
    details?: any;
  };
  
  totalTax: number; // Federal + State + FICA
  netIncome: number; // Gross - Total Tax
  effectiveTaxRate: number; // Total Tax / Gross Income
}

// 2025 Federal Tax Brackets (updated for tax year 2025)
const FEDERAL_TAX_BRACKETS_2025: Record<FilingStatus, TaxBracket[]> = {
  single: [
    { min: 0, max: 11600, rate: 0.10 },
    { min: 11600, max: 47150, rate: 0.12 },
    { min: 47150, max: 100525, rate: 0.22 },
    { min: 100525, max: 191650, rate: 0.24 },
    { min: 191650, max: 243725, rate: 0.32 },
    { min: 243725, max: 609350, rate: 0.35 },
    { min: 609350, max: null, rate: 0.37 }
  ],
  marriedFilingJointly: [
    { min: 0, max: 23200, rate: 0.10 },
    { min: 23200, max: 94300, rate: 0.12 },
    { min: 94300, max: 201050, rate: 0.22 },
    { min: 201050, max: 383900, rate: 0.24 },
    { min: 383900, max: 487450, rate: 0.32 },
    { min: 487450, max: 731200, rate: 0.35 },
    { min: 731200, max: null, rate: 0.37 }
  ],
  marriedFilingSeparately: [
    { min: 0, max: 11600, rate: 0.10 },
    { min: 11600, max: 47150, rate: 0.12 },
    { min: 47150, max: 100525, rate: 0.22 },
    { min: 100525, max: 191950, rate: 0.24 },
    { min: 191950, max: 243725, rate: 0.32 },
    { min: 243725, max: 365600, rate: 0.35 },
    { min: 365600, max: null, rate: 0.37 }
  ],
  headOfHousehold: [
    { min: 0, max: 16550, rate: 0.10 },
    { min: 16550, max: 63100, rate: 0.12 },
    { min: 63100, max: 100500, rate: 0.22 },
    { min: 100500, max: 191650, rate: 0.24 },
    { min: 191650, max: 243700, rate: 0.32 },
    { min: 243700, max: 609350, rate: 0.35 },
    { min: 609350, max: null, rate: 0.37 }
  ]
};

// 2025 Federal Standard Deductions
const FEDERAL_STANDARD_DEDUCTIONS_2025: Record<FilingStatus, number> = {
  single: 15000,
  marriedFilingJointly: 30000,
  marriedFilingSeparately: 15000,
  headOfHousehold: 22500
};

// FICA Tax Rates and Thresholds for 2025
const FICA_RATES_2025 = {
  socialSecurity: {
    rate: 0.062, // 6.2%
    wageBase: 168600 // Maximum taxable wage base
  },
  medicare: {
    rate: 0.0145, // 1.45%
    additionalRate: 0.009, // Additional 0.9% on high earners
    additionalThreshold: {
      single: 200000,
      marriedFilingJointly: 250000,
      marriedFilingSeparately: 125000,
      headOfHousehold: 200000
    }
  }
};

// Major state tax information (sample of key states)
const STATE_TAX_INFO: Record<string, StateTaxInfo> = {
  // No state income tax states
  TX: {
    name: 'Texas',
    code: 'TX',
    brackets: [],
    standardDeduction: { single: 0, marriedFilingJointly: 0, marriedFilingSeparately: 0, headOfHousehold: 0 },
    hasStateIncomeTax: false
  },
  FL: {
    name: 'Florida',
    code: 'FL',
    brackets: [],
    standardDeduction: { single: 0, marriedFilingJointly: 0, marriedFilingSeparately: 0, headOfHousehold: 0 },
    hasStateIncomeTax: false
  },
  WA: {
    name: 'Washington',
    code: 'WA',
    brackets: [],
    standardDeduction: { single: 0, marriedFilingJointly: 0, marriedFilingSeparately: 0, headOfHousehold: 0 },
    hasStateIncomeTax: false
  },
  
  // High-tax states
  CA: {
    name: 'California',
    code: 'CA',
    brackets: [
      { min: 0, max: 10099, rate: 0.01 },
      { min: 10099, max: 23942, rate: 0.02 },
      { min: 23942, max: 37788, rate: 0.04 },
      { min: 37788, max: 52455, rate: 0.06 },
      { min: 52455, max: 66295, rate: 0.08 },
      { min: 66295, max: 338639, rate: 0.093 },
      { min: 338639, max: 406364, rate: 0.103 },
      { min: 406364, max: 677278, rate: 0.113 },
      { min: 677278, max: null, rate: 0.123 }
    ],
    standardDeduction: { single: 5202, marriedFilingJointly: 10404, marriedFilingSeparately: 5202, headOfHousehold: 10404 },
    hasStateIncomeTax: true
  },
  NY: {
    name: 'New York',
    code: 'NY',
    brackets: [
      { min: 0, max: 8500, rate: 0.04 },
      { min: 8500, max: 11700, rate: 0.045 },
      { min: 11700, max: 13900, rate: 0.0525 },
      { min: 13900, max: 80650, rate: 0.055 },
      { min: 80650, max: 215400, rate: 0.06 },
      { min: 215400, max: 1077550, rate: 0.0685 },
      { min: 1077550, max: 5000000, rate: 0.0965 },
      { min: 5000000, max: 25000000, rate: 0.103 },
      { min: 25000000, max: null, rate: 0.109 }
    ],
    standardDeduction: { single: 8000, marriedFilingJointly: 16050, marriedFilingSeparately: 8000, headOfHousehold: 11200 },
    hasStateIncomeTax: true
  },
  
  // Flat tax states
  IL: {
    name: 'Illinois',
    code: 'IL',
    brackets: [{ min: 0, max: null, rate: 0.0495 }], // 4.95% flat tax
    standardDeduction: { single: 2425, marriedFilingJointly: 4850, marriedFilingSeparately: 2425, headOfHousehold: 2425 },
    hasStateIncomeTax: true
  }
};

export class TaxCalculationService {
  /**
   * Calculate comprehensive tax liability for given income and parameters
   */
  static calculateTaxes(input: TaxCalculationInput): TaxCalculationResult {
    logger.info('Calculating taxes', { 
      grossIncome: input.grossIncome, 
      filingStatus: input.filingStatus, 
      state: input.state 
    });

    // Step 1: Calculate Adjusted Gross Income (AGI)
    const adjustedGrossIncome = this.calculateAGI(input);
    
    // Step 2: Calculate deductions
    const deductions = this.calculateDeductions(input, adjustedGrossIncome);
    
    // Step 3: Calculate taxable income
    const federalTaxableIncome = Math.max(0, adjustedGrossIncome - deductions.federal);
    const stateTaxableIncome = Math.max(0, adjustedGrossIncome - deductions.state);
    
    // Step 4: Calculate federal taxes
    const federalTax = this.calculateFederalTax(federalTaxableIncome, input.filingStatus);
    
    // Step 5: Calculate state taxes
    const stateTax = this.calculateStateTax(stateTaxableIncome, input.state, input.filingStatus);
    
    // Step 6: Calculate FICA taxes
    const ficaTax = this.calculateFICA(input.grossIncome, input.filingStatus);
    
    // Step 7: Calculate totals
    const totalTax = federalTax.tax + stateTax.tax + ficaTax.totalFica;
    const netIncome = input.grossIncome - totalTax;
    const effectiveTaxRate = input.grossIncome > 0 ? totalTax / input.grossIncome : 0;
    
    const result: TaxCalculationResult = {
      grossIncome: input.grossIncome,
      adjustedGrossIncome,
      taxableIncome: federalTaxableIncome,
      federal: federalTax,
      state: stateTax,
      fica: ficaTax,
      deductions,
      totalTax,
      netIncome,
      effectiveTaxRate
    };

    logger.info('Tax calculation completed', {
      grossIncome: input.grossIncome,
      totalTax,
      netIncome,
      effectiveTaxRate: (effectiveTaxRate * 100).toFixed(2) + '%'
    });

    return result;
  }

  /**
   * Calculate Adjusted Gross Income (before deductions)
   */
  private static calculateAGI(input: TaxCalculationInput): number {
    let agi = input.grossIncome;
    
    // Subtract above-the-line deductions
    if (input.retirementContributions?.traditional401k) {
      agi -= Math.min(input.retirementContributions.traditional401k, 23500); // 2025 limit
    }
    
    if (input.retirementContributions?.traditionalIRA) {
      agi -= Math.min(input.retirementContributions.traditionalIRA, 7000); // 2025 limit
    }
    
    if (input.retirementContributions?.hsa) {
      const hsaLimit = input.filingStatus === 'marriedFilingJointly' ? 8550 : 4300; // 2025 limits
      agi -= Math.min(input.retirementContributions.hsa, hsaLimit);
    }
    
    // Payroll deductions (pre-tax)
    if (input.payrollDeductions) {
      const payroll = input.payrollDeductions;
      agi -= (payroll.healthInsurance || 0);
      agi -= (payroll.dentalVision || 0);
      agi -= (payroll.lifeInsurance || 0);
      agi -= Math.min(payroll.fsaDcap || 0, 5000); // FSA/DCAP limit
      agi -= Math.min(payroll.parkingTransit || 0, 3120); // 2025 limit
    }
    
    return Math.max(0, agi);
  }

  /**
   * Calculate federal and state deductions
   */
  private static calculateDeductions(input: TaxCalculationInput, agi: number) {
    const filingStatus = input.filingStatus;
    const federalStandardDeduction = FEDERAL_STANDARD_DEDUCTIONS_2025[filingStatus];
    
    const stateInfo = STATE_TAX_INFO[input.state];
    const stateStandardDeduction = stateInfo?.standardDeduction[filingStatus] || 0;
    
    let federalDeduction = federalStandardDeduction;
    let stateDeduction = stateStandardDeduction;
    let deductionType: 'standard' | 'itemized' = 'standard';
    
    if (input.deductions?.type === 'itemized' && input.deductions.amount) {
      const itemizedAmount = input.deductions.amount;
      
      // Use itemized if it's higher than standard
      if (itemizedAmount > federalStandardDeduction) {
        federalDeduction = itemizedAmount;
        deductionType = 'itemized';
      }
      
      // State may have different itemized vs standard comparison
      if (itemizedAmount > stateStandardDeduction) {
        stateDeduction = itemizedAmount;
      }
    }
    
    return {
      type: deductionType,
      federal: federalDeduction,
      state: stateDeduction,
      details: input.deductions?.details
    };
  }

  /**
   * Calculate federal income tax using progressive brackets
   */
  private static calculateFederalTax(taxableIncome: number, filingStatus: FilingStatus) {
    const brackets = FEDERAL_TAX_BRACKETS_2025[filingStatus];
    let tax = 0;
    let marginalRate = 0;
    const bracketDetails = [];
    
    for (const bracket of brackets) {
      const bracketMin = bracket.min;
      const bracketMax = bracket.max || Infinity;
      
      if (taxableIncome > bracketMin) {
        const taxableInBracket = Math.min(taxableIncome, bracketMax) - bracketMin;
        const taxOnBracket = taxableInBracket * bracket.rate;
        tax += taxOnBracket;
        marginalRate = bracket.rate;
        
        bracketDetails.push({
          min: bracketMin,
          max: bracket.max,
          rate: bracket.rate,
          taxOnBracket
        });
      }
      
      if (taxableIncome <= bracketMax) break;
    }
    
    const effectiveRate = taxableIncome > 0 ? tax / taxableIncome : 0;
    
    return {
      taxableIncome,
      tax,
      effectiveRate,
      marginalRate,
      brackets: bracketDetails
    };
  }

  /**
   * Calculate state income tax
   */
  private static calculateStateTax(taxableIncome: number, stateCode: string, filingStatus: FilingStatus) {
    const stateInfo = STATE_TAX_INFO[stateCode];
    
    if (!stateInfo || !stateInfo.hasStateIncomeTax) {
      return {
        taxableIncome,
        tax: 0,
        effectiveRate: 0,
        marginalRate: 0,
        name: stateInfo?.name || 'Unknown State'
      };
    }
    
    let tax = 0;
    let marginalRate = 0;
    
    // Calculate using state brackets (similar to federal)
    for (const bracket of stateInfo.brackets) {
      const bracketMin = bracket.min;
      const bracketMax = bracket.max || Infinity;
      
      if (taxableIncome > bracketMin) {
        const taxableInBracket = Math.min(taxableIncome, bracketMax) - bracketMin;
        tax += taxableInBracket * bracket.rate;
        marginalRate = bracket.rate;
      }
      
      if (taxableIncome <= bracketMax) break;
    }
    
    const effectiveRate = taxableIncome > 0 ? tax / taxableIncome : 0;
    
    return {
      taxableIncome,
      tax,
      effectiveRate,
      marginalRate,
      name: stateInfo.name
    };
  }

  /**
   * Calculate FICA taxes (Social Security + Medicare)
   */
  private static calculateFICA(grossIncome: number, filingStatus: FilingStatus) {
    const rates = FICA_RATES_2025;
    
    // Social Security tax (capped at wage base)
    const socialSecurityTax = Math.min(grossIncome, rates.socialSecurity.wageBase) * rates.socialSecurity.rate;
    
    // Medicare tax (no cap)
    const medicareTax = grossIncome * rates.medicare.rate;
    
    // Additional Medicare tax for high earners
    const additionalThreshold = rates.medicare.additionalThreshold[filingStatus];
    const additionalMedicareTax = grossIncome > additionalThreshold 
      ? (grossIncome - additionalThreshold) * rates.medicare.additionalRate 
      : 0;
    
    const totalFica = socialSecurityTax + medicareTax + additionalMedicareTax;
    
    return {
      socialSecurityTax,
      medicareTax,
      additionalMedicareTax,
      totalFica
    };
  }

  /**
   * Get available states for tax calculations
   */
  static getAvailableStates(): StateTaxInfo[] {
    return Object.values(STATE_TAX_INFO);
  }

  /**
   * Get tax brackets for a specific filing status
   */
  static getFederalTaxBrackets(filingStatus: FilingStatus): TaxBracket[] {
    return FEDERAL_TAX_BRACKETS_2025[filingStatus];
  }

  /**
   * Get standard deduction amounts
   */
  static getStandardDeductions(filingStatus: FilingStatus) {
    return {
      federal: FEDERAL_STANDARD_DEDUCTIONS_2025[filingStatus],
      state: (stateCode: string) => STATE_TAX_INFO[stateCode]?.standardDeduction[filingStatus] || 0
    };
  }
}

export default TaxCalculationService;