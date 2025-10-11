import TaxCalculationService, { FilingStatus } from './TaxCalculationService';
import { createLogger } from '../utils/logger';

const logger = createLogger('paystub-service');

export type PayPeriod = 'weekly' | 'biweekly' | 'semimonthly' | 'monthly';

export interface PaystubInput {
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
    ein?: string; // Employer Identification Number
  };
  payInfo: {
    annualSalary: number;
    payPeriod: PayPeriod;
    filingStatus: FilingStatus;
    state: string;
    payDate: string; // ISO date string
    payPeriodStart: string; // ISO date string
    payPeriodEnd: string; // ISO date string;
  };
  deductions: {
    // Pre-tax deductions
    retirement401k?: number; // Annual amount
    traditionalIRA?: number; // Annual amount
    hsa?: number; // Annual amount
    healthInsurance?: number; // Annual amount
    dentalVision?: number; // Annual amount
    fsaDcap?: number; // Annual amount
    parkingTransit?: number; // Annual amount
    
    // Post-tax deductions
    rothIRA?: number; // Annual amount
    lifeInsurance?: number; // Annual amount
    disabilityInsurance?: number; // Annual amount
    unionDues?: number; // Annual amount
    charitableContributions?: number; // Annual amount
  };
  ytdAmounts?: {
    grossPay: number;
    federalTax: number;
    stateTax: number;
    socialSecurityTax: number;
    medicareTax: number;
    additionalMedicareTax?: number;
    totalPreTaxDeductions: number;
    totalPostTaxDeductions: number;
    netPay: number;
  };
}

export interface PaystubResult {
  payPeriodInfo: {
    payDate: string;
    payPeriodStart: string;
    payPeriodEnd: string;
    payPeriod: PayPeriod;
    periodsPerYear: number;
  };
  employeeInfo: PaystubInput['employeeInfo'];
  employerInfo: PaystubInput['employerInfo'];
  
  // Current pay period amounts
  currentPeriod: {
    grossPay: number;
    
    // Pre-tax deductions
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
    
    // Taxable income after pre-tax deductions
    taxableIncome: number;
    
    // Taxes
    taxes: {
      federalIncomeTax: number;
      stateIncomeTax: number;
      socialSecurityTax: number;
      medicareTax: number;
      additionalMedicareTax: number;
      total: number;
    };
    
    // Post-tax deductions
    postTaxDeductions: {
      rothIRA: number;
      lifeInsurance: number;
      disabilityInsurance: number;
      unionDues: number;
      charitableContributions: number;
      total: number;
    };
    
    // Net pay
    netPay: number;
  };
  
  // Year-to-date amounts
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
  
  // Tax rates and limits info
  taxInfo: {
    federalEffectiveRate: number;
    federalMarginalRate: number;
    stateEffectiveRate: number;
    stateMarginalRate: number;
    socialSecurityRate: number;
    medicareRate: number;
    additionalMedicareRate: number;
    socialSecurityWageBase: number; // 2025 wage base limit
  };
}

export class PaystubGenerator {
  
  /**
   * Get the number of pay periods per year for a given pay frequency
   */
  private static getPeriodsPerYear(payPeriod: PayPeriod): number {
    switch (payPeriod) {
      case 'weekly': return 52;
      case 'biweekly': return 26;
      case 'semimonthly': return 24;
      case 'monthly': return 12;
      default: throw new Error(`Unsupported pay period: ${payPeriod}`);
    }
  }
  
  /**
   * Calculate per-period amount from annual amount
   */
  private static getPerPeriodAmount(annualAmount: number, payPeriod: PayPeriod): number {
    return annualAmount / PaystubGenerator.getPeriodsPerYear(payPeriod);
  }
  
  /**
   * Generate a paystub for the specified pay period
   */
  static generatePaystub(input: PaystubInput): PaystubResult {
    logger.info('Generating paystub', { 
      employee: input.employeeInfo.name,
      payPeriod: input.payInfo.payPeriod,
      salary: input.payInfo.annualSalary 
    });
    
    const periodsPerYear = PaystubGenerator.getPeriodsPerYear(input.payInfo.payPeriod);
    const grossPayPerPeriod = input.payInfo.annualSalary / periodsPerYear;
    
    // Calculate pre-tax deductions for this pay period
    const preTaxDeductions = {
      retirement401k: PaystubGenerator.getPerPeriodAmount(input.deductions.retirement401k || 0, input.payInfo.payPeriod),
      traditionalIRA: PaystubGenerator.getPerPeriodAmount(input.deductions.traditionalIRA || 0, input.payInfo.payPeriod),
      hsa: PaystubGenerator.getPerPeriodAmount(input.deductions.hsa || 0, input.payInfo.payPeriod),
      healthInsurance: PaystubGenerator.getPerPeriodAmount(input.deductions.healthInsurance || 0, input.payInfo.payPeriod),
      dentalVision: PaystubGenerator.getPerPeriodAmount(input.deductions.dentalVision || 0, input.payInfo.payPeriod),
      fsaDcap: PaystubGenerator.getPerPeriodAmount(input.deductions.fsaDcap || 0, input.payInfo.payPeriod),
      parkingTransit: PaystubGenerator.getPerPeriodAmount(input.deductions.parkingTransit || 0, input.payInfo.payPeriod),
      total: 0
    };
    
    preTaxDeductions.total = Object.values(preTaxDeductions).reduce((sum, amount) => 
      typeof amount === 'number' ? sum + amount : sum, 0);
    
    // Calculate taxable income for this pay period
    const taxableIncomePerPeriod = grossPayPerPeriod - preTaxDeductions.total;
    
    // Use the tax service to calculate annual taxes, then pro-rate
    const annualTaxCalculation = TaxCalculationService.calculateTaxes({
      grossIncome: input.payInfo.annualSalary,
      filingStatus: input.payInfo.filingStatus,
      state: input.payInfo.state,
      deductions: { type: 'standard' }, // Simplified for payroll
      retirementContributions: {
        traditional401k: input.deductions.retirement401k || 0,
        traditionalIRA: input.deductions.traditionalIRA || 0,
        hsa: input.deductions.hsa || 0
      },
      payrollDeductions: {
        healthInsurance: input.deductions.healthInsurance || 0,
        dentalVision: input.deductions.dentalVision || 0,
        fsaDcap: input.deductions.fsaDcap || 0
      }
    });
    
    // Calculate per-period taxes
    const taxes = {
      federalIncomeTax: annualTaxCalculation.federal.tax / periodsPerYear,
      stateIncomeTax: annualTaxCalculation.state.tax / periodsPerYear,
      socialSecurityTax: annualTaxCalculation.fica.socialSecurityTax / periodsPerYear,
      medicareTax: annualTaxCalculation.fica.medicareTax / periodsPerYear,
      additionalMedicareTax: annualTaxCalculation.fica.additionalMedicareTax / periodsPerYear,
      total: 0
    };
    
    taxes.total = Object.values(taxes).reduce((sum, amount) => 
      typeof amount === 'number' ? sum + amount : sum, 0);
    
    // Calculate post-tax deductions for this pay period
    const postTaxDeductions = {
      rothIRA: PaystubGenerator.getPerPeriodAmount(input.deductions.rothIRA || 0, input.payInfo.payPeriod),
      lifeInsurance: PaystubGenerator.getPerPeriodAmount(input.deductions.lifeInsurance || 0, input.payInfo.payPeriod),
      disabilityInsurance: PaystubGenerator.getPerPeriodAmount(input.deductions.disabilityInsurance || 0, input.payInfo.payPeriod),
      unionDues: PaystubGenerator.getPerPeriodAmount(input.deductions.unionDues || 0, input.payInfo.payPeriod),
      charitableContributions: PaystubGenerator.getPerPeriodAmount(input.deductions.charitableContributions || 0, input.payInfo.payPeriod),
      total: 0
    };
    
    postTaxDeductions.total = Object.values(postTaxDeductions).reduce((sum, amount) => 
      typeof amount === 'number' ? sum + amount : sum, 0);
    
    // Calculate net pay
    const netPay = grossPayPerPeriod - preTaxDeductions.total - taxes.total - postTaxDeductions.total;
    
    // Calculate or use provided YTD amounts
    const payDate = new Date(input.payInfo.payDate);
    const startOfYear = new Date(payDate.getFullYear(), 0, 1);
    const payPeriodsSoFar = Math.floor((payDate.getTime() - startOfYear.getTime()) / (1000 * 60 * 60 * 24 * 7)) + 1;
    
    let yearToDate;
    if (input.ytdAmounts) {
      // Add current period to provided YTD amounts
      yearToDate = {
        grossPay: input.ytdAmounts.grossPay + grossPayPerPeriod,
        totalPreTaxDeductions: input.ytdAmounts.totalPreTaxDeductions + preTaxDeductions.total,
        taxableIncome: input.ytdAmounts.grossPay + grossPayPerPeriod - (input.ytdAmounts.totalPreTaxDeductions + preTaxDeductions.total),
        federalIncomeTax: input.ytdAmounts.federalTax + taxes.federalIncomeTax,
        stateIncomeTax: input.ytdAmounts.stateTax + taxes.stateIncomeTax,
        socialSecurityTax: input.ytdAmounts.socialSecurityTax + taxes.socialSecurityTax,
        medicareTax: input.ytdAmounts.medicareTax + taxes.medicareTax,
        additionalMedicareTax: (input.ytdAmounts.additionalMedicareTax || 0) + taxes.additionalMedicareTax,
        totalTaxes: input.ytdAmounts.federalTax + input.ytdAmounts.stateTax + input.ytdAmounts.socialSecurityTax + input.ytdAmounts.medicareTax + (input.ytdAmounts.additionalMedicareTax || 0) + taxes.total,
        totalPostTaxDeductions: input.ytdAmounts.totalPostTaxDeductions + postTaxDeductions.total,
        netPay: input.ytdAmounts.netPay + netPay
      };
    } else {
      // Calculate estimated YTD based on current period
      yearToDate = {
        grossPay: grossPayPerPeriod * payPeriodsSoFar,
        totalPreTaxDeductions: preTaxDeductions.total * payPeriodsSoFar,
        taxableIncome: (grossPayPerPeriod - preTaxDeductions.total) * payPeriodsSoFar,
        federalIncomeTax: taxes.federalIncomeTax * payPeriodsSoFar,
        stateIncomeTax: taxes.stateIncomeTax * payPeriodsSoFar,
        socialSecurityTax: taxes.socialSecurityTax * payPeriodsSoFar,
        medicareTax: taxes.medicareTax * payPeriodsSoFar,
        additionalMedicareTax: taxes.additionalMedicareTax * payPeriodsSoFar,
        totalTaxes: taxes.total * payPeriodsSoFar,
        totalPostTaxDeductions: postTaxDeductions.total * payPeriodsSoFar,
        netPay: netPay * payPeriodsSoFar
      };
    }
    
    const result: PaystubResult = {
      payPeriodInfo: {
        payDate: input.payInfo.payDate,
        payPeriodStart: input.payInfo.payPeriodStart,
        payPeriodEnd: input.payInfo.payPeriodEnd,
        payPeriod: input.payInfo.payPeriod,
        periodsPerYear
      },
      employeeInfo: input.employeeInfo,
      employerInfo: input.employerInfo,
      
      currentPeriod: {
        grossPay: grossPayPerPeriod,
        preTaxDeductions,
        taxableIncome: taxableIncomePerPeriod,
        taxes,
        postTaxDeductions,
        netPay
      },
      
      yearToDate,
      
      taxInfo: {
        federalEffectiveRate: annualTaxCalculation.federal.effectiveRate,
        federalMarginalRate: annualTaxCalculation.federal.marginalRate,
        stateEffectiveRate: annualTaxCalculation.state.effectiveRate,
        stateMarginalRate: annualTaxCalculation.state.marginalRate,
        socialSecurityRate: 0.062, // 6.2%
        medicareRate: 0.0145, // 1.45%
        additionalMedicareRate: 0.009, // 0.9%
        socialSecurityWageBase: 176400 // 2025 wage base limit
      }
    };
    
    logger.info('Paystub generated successfully', {
      employee: input.employeeInfo.name,
      grossPay: grossPayPerPeriod,
      netPay,
      effectiveTaxRate: (taxes.total / grossPayPerPeriod) * 100
    });
    
    return result;
  }
  
  /**
   * Generate multiple paystubs for a year
   */
  static generateAnnualPaystubs(input: PaystubInput, year: number = new Date().getFullYear()): PaystubResult[] {
    const paystubs: PaystubResult[] = [];
    const periodsPerYear = PaystubGenerator.getPeriodsPerYear(input.payInfo.payPeriod);
    
    // Calculate pay dates for the year
    let currentDate = new Date(year, 0, 1); // Start of year
    
    // Find first pay date (assuming first pay date is first Friday of the year for simplicity)
    while (currentDate.getDay() !== 5) { // Friday
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    let cumulativeYTD = {
      grossPay: 0,
      federalTax: 0,
      stateTax: 0,
      socialSecurityTax: 0,
      medicareTax: 0,
      additionalMedicareTax: 0,
      totalPreTaxDeductions: 0,
      totalPostTaxDeductions: 0,
      netPay: 0
    };
    
    for (let period = 0; period < periodsPerYear; period++) {
      const payDate = new Date(currentDate);
      
      // Calculate pay period dates
      let periodStart: Date, periodEnd: Date;
      
      switch (input.payInfo.payPeriod) {
        case 'weekly':
          periodEnd = new Date(payDate);
          periodStart = new Date(payDate);
          periodStart.setDate(periodStart.getDate() - 6);
          break;
        case 'biweekly':
          periodEnd = new Date(payDate);
          periodStart = new Date(payDate);
          periodStart.setDate(periodStart.getDate() - 13);
          break;
        case 'semimonthly':
          if (payDate.getDate() <= 15) {
            periodStart = new Date(payDate.getFullYear(), payDate.getMonth(), 1);
            periodEnd = new Date(payDate.getFullYear(), payDate.getMonth(), 15);
          } else {
            periodStart = new Date(payDate.getFullYear(), payDate.getMonth(), 16);
            periodEnd = new Date(payDate.getFullYear(), payDate.getMonth() + 1, 0);
          }
          break;
        case 'monthly':
          periodStart = new Date(payDate.getFullYear(), payDate.getMonth(), 1);
          periodEnd = new Date(payDate.getFullYear(), payDate.getMonth() + 1, 0);
          break;
      }
      
      const periodInput: PaystubInput = {
        ...input,
        payInfo: {
          ...input.payInfo,
          payDate: payDate.toISOString().split('T')[0],
          payPeriodStart: periodStart!.toISOString().split('T')[0],
          payPeriodEnd: periodEnd!.toISOString().split('T')[0]
        },
        ytdAmounts: cumulativeYTD
      };
      
      const paystub = PaystubGenerator.generatePaystub(periodInput);
      paystubs.push(paystub);
      
      // Update cumulative YTD for next period
      cumulativeYTD = {
        grossPay: paystub.yearToDate.grossPay,
        federalTax: paystub.yearToDate.federalIncomeTax,
        stateTax: paystub.yearToDate.stateIncomeTax,
        socialSecurityTax: paystub.yearToDate.socialSecurityTax,
        medicareTax: paystub.yearToDate.medicareTax,
        additionalMedicareTax: paystub.yearToDate.additionalMedicareTax,
        totalPreTaxDeductions: paystub.yearToDate.totalPreTaxDeductions,
        totalPostTaxDeductions: paystub.yearToDate.totalPostTaxDeductions,
        netPay: paystub.yearToDate.netPay
      };
      
      // Move to next pay date
      switch (input.payInfo.payPeriod) {
        case 'weekly':
          currentDate.setDate(currentDate.getDate() + 7);
          break;
        case 'biweekly':
          currentDate.setDate(currentDate.getDate() + 14);
          break;
        case 'semimonthly':
          if (currentDate.getDate() <= 15) {
            currentDate.setDate(currentDate.getDate() + 15);
          } else {
            currentDate.setMonth(currentDate.getMonth() + 1, 1);
          }
          break;
        case 'monthly':
          currentDate.setMonth(currentDate.getMonth() + 1);
          break;
      }
    }
    
    return paystubs;
  }
}

export default PaystubGenerator;