import { Router } from 'express';
import { createLogger } from '../utils/logger';
import TaxCalculationService, { TaxCalculationInput, FilingStatus } from '../services/TaxCalculationService';
import PaystubGenerator, { PaystubInput, PayPeriod } from '../services/PaystubGenerator';

const router = Router();
const logger = createLogger('tax-routes');

// POST /api/tax/calculate - Calculate taxes for given income and parameters
router.post('/calculate', async (req, res) => {
  try {
    const input: TaxCalculationInput = req.body;

    // Validate required fields
    if (!input.grossIncome || input.grossIncome <= 0) {
      return res.status(400).json({ 
        error: 'Invalid gross income',
        details: 'Gross income must be a positive number'
      });
    }

    if (!input.filingStatus) {
      return res.status(400).json({ 
        error: 'Missing filing status',
        details: 'Filing status is required'
      });
    }

    if (!input.state) {
      return res.status(400).json({ 
        error: 'Missing state',
        details: 'State code is required'
      });
    }

    logger.info('Tax calculation request', {
      grossIncome: input.grossIncome,
      filingStatus: input.filingStatus,
      state: input.state
    });

    // Perform tax calculation
    const result = TaxCalculationService.calculateTaxes(input);

    res.json(result);

  } catch (error) {
    logger.error('Tax calculation error:', error);
    res.status(500).json({
      error: 'Tax calculation failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// GET /api/tax/brackets/:filingStatus - Get federal tax brackets for filing status
router.get('/brackets/:filingStatus', async (req, res) => {
  try {
    const filingStatus = req.params.filingStatus as FilingStatus;

    if (!['single', 'marriedFilingJointly', 'marriedFilingSeparately', 'headOfHousehold'].includes(filingStatus)) {
      return res.status(400).json({
        error: 'Invalid filing status',
        details: 'Filing status must be one of: single, marriedFilingJointly, marriedFilingSeparately, headOfHousehold'
      });
    }

    const brackets = TaxCalculationService.getFederalTaxBrackets(filingStatus);
    const standardDeductions = TaxCalculationService.getStandardDeductions(filingStatus);

    res.json({
      filingStatus,
      brackets,
      standardDeduction: standardDeductions.federal,
      year: 2025
    });

  } catch (error) {
    logger.error('Error fetching tax brackets:', error);
    res.status(500).json({
      error: 'Failed to fetch tax brackets',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// GET /api/tax/states - Get available states for tax calculations
router.get('/states', async (req, res) => {
  try {
    const states = TaxCalculationService.getAvailableStates();
    
    res.json({
      states: states.map(state => ({
        name: state.name,
        code: state.code,
        hasStateIncomeTax: state.hasStateIncomeTax,
        standardDeduction: state.standardDeduction
      }))
    });

  } catch (error) {
    logger.error('Error fetching states:', error);
    res.status(500).json({
      error: 'Failed to fetch states',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// GET /api/tax/deductions/:filingStatus - Get standard deduction amounts
router.get('/deductions/:filingStatus', async (req, res) => {
  try {
    const filingStatus = req.params.filingStatus as FilingStatus;

    if (!['single', 'marriedFilingJointly', 'marriedFilingSeparately', 'headOfHousehold'].includes(filingStatus)) {
      return res.status(400).json({
        error: 'Invalid filing status',
        details: 'Filing status must be one of: single, marriedFilingJointly, marriedFilingSeparately, headOfHousehold'
      });
    }

    const standardDeductions = TaxCalculationService.getStandardDeductions(filingStatus);
    const states = TaxCalculationService.getAvailableStates();

    const stateDeductions = states.reduce((acc, state) => {
      acc[state.code] = state.standardDeduction[filingStatus];
      return acc;
    }, {} as Record<string, number>);

    res.json({
      filingStatus,
      federal: standardDeductions.federal,
      states: stateDeductions,
      year: 2025
    });

  } catch (error) {
    logger.error('Error fetching deductions:', error);
    res.status(500).json({
      error: 'Failed to fetch deductions',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// POST /api/tax/payroll - Calculate payroll taxes and net pay
router.post('/payroll', async (req, res) => {
  try {
    const {
      grossPay,
      filingStatus,
      state,
      payPeriod = 'biweekly', // weekly, biweekly, semimonthly, monthly
      allowances = 0,
      additionalWithholding = 0,
      preTaxDeductions = {}
    } = req.body;

    if (!grossPay || grossPay <= 0) {
      return res.status(400).json({
        error: 'Invalid gross pay',
        details: 'Gross pay must be a positive number'
      });
    }

    // Calculate annualized income for tax calculation
    const payPeriodsPerYear = {
      weekly: 52,
      biweekly: 26,
      semimonthly: 24,
      monthly: 12
    };

    const annualGross = grossPay * (payPeriodsPerYear[payPeriod as keyof typeof payPeriodsPerYear] || 26);

    // Calculate annual taxes
    const taxInput: TaxCalculationInput = {
      grossIncome: annualGross,
      filingStatus: filingStatus as FilingStatus,
      state,
      payrollDeductions: preTaxDeductions
    };

    const annualTaxResult = TaxCalculationService.calculateTaxes(taxInput);

    // Convert to per-paycheck amounts
    const payPeriods = payPeriodsPerYear[payPeriod as keyof typeof payPeriodsPerYear] || 26;
    
    const federalWithholding = annualTaxResult.federal.tax / payPeriods;
    const stateWithholding = annualTaxResult.state.tax / payPeriods;
    const ficaWithholding = annualTaxResult.fica.totalFica / payPeriods;
    
    // Calculate pre-tax deduction amounts per paycheck
    const preTaxAmount = Object.values(preTaxDeductions).reduce((sum: number, amount: any) => sum + (Number(amount) || 0), 0) / payPeriods;
    
    const totalWithholdings = federalWithholding + stateWithholding + ficaWithholding + additionalWithholding;
    const netPay = grossPay - preTaxAmount - totalWithholdings;

    const result = {
      payPeriod,
      grossPay,
      preTaxDeductions: preTaxAmount,
      taxableGross: grossPay - preTaxAmount,
      
      withholdings: {
        federal: federalWithholding,
        state: stateWithholding,
        socialSecurity: annualTaxResult.fica.socialSecurityTax / payPeriods,
        medicare: annualTaxResult.fica.medicareTax / payPeriods,
        additionalMedicare: annualTaxResult.fica.additionalMedicareTax / payPeriods,
        additional: additionalWithholding,
        total: totalWithholdings
      },
      
      netPay,
      
      // Annual projections
      annual: {
        grossIncome: annualGross,
        netIncome: annualTaxResult.netIncome,
        totalTax: annualTaxResult.totalTax,
        effectiveTaxRate: annualTaxResult.effectiveTaxRate
      }
    };

    res.json(result);

  } catch (error) {
    logger.error('Payroll calculation error:', error);
    res.status(500).json({
      error: 'Payroll calculation failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// POST /api/tax/paystub - Generate a paystub
router.post('/paystub', async (req, res) => {
  try {
    const input: PaystubInput = req.body;

    // Validate required fields
    if (!input.employeeInfo?.name) {
      return res.status(400).json({ 
        error: 'Invalid employee info',
        details: 'Employee name is required'
      });
    }

    if (!input.employerInfo?.name) {
      return res.status(400).json({ 
        error: 'Invalid employer info',
        details: 'Employer name is required'
      });
    }

    if (!input.payInfo?.annualSalary || input.payInfo.annualSalary <= 0) {
      return res.status(400).json({ 
        error: 'Invalid salary',
        details: 'Annual salary must be a positive number'
      });
    }

    if (!input.payInfo?.payPeriod) {
      return res.status(400).json({ 
        error: 'Invalid pay period',
        details: 'Pay period is required'
      });
    }

    if (!input.payInfo?.filingStatus) {
      return res.status(400).json({ 
        error: 'Invalid filing status',
        details: 'Filing status is required'
      });
    }

    if (!input.payInfo?.state) {
      return res.status(400).json({ 
        error: 'Invalid state',
        details: 'State is required'
      });
    }

    logger.info('Generating paystub', { 
      employee: input.employeeInfo.name,
      salary: input.payInfo.annualSalary,
      payPeriod: input.payInfo.payPeriod
    });

    const paystub = PaystubGenerator.generatePaystub(input);

    logger.info('Paystub generated successfully', {
      employee: input.employeeInfo.name,
      netPay: paystub.currentPeriod.netPay
    });

    res.json(paystub);
  } catch (error) {
    logger.error('Error generating paystub:', error);
    res.status(500).json({
      error: 'Paystub generation failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// POST /api/tax/paystubs/annual - Generate annual paystubs
router.post('/paystubs/annual', async (req, res) => {
  try {
    const { input, year }: { input: PaystubInput, year?: number } = req.body;

    // Validate required fields (same as single paystub)
    if (!input?.employeeInfo?.name) {
      return res.status(400).json({ 
        error: 'Invalid employee info',
        details: 'Employee name is required'
      });
    }

    if (!input.payInfo?.annualSalary || input.payInfo.annualSalary <= 0) {
      return res.status(400).json({ 
        error: 'Invalid salary',
        details: 'Annual salary must be a positive number'
      });
    }

    const targetYear = year || new Date().getFullYear();

    logger.info('Generating annual paystubs', { 
      employee: input.employeeInfo.name,
      salary: input.payInfo.annualSalary,
      year: targetYear
    });

    const paystubs = PaystubGenerator.generateAnnualPaystubs(input, targetYear);

    logger.info('Annual paystubs generated successfully', {
      employee: input.employeeInfo.name,
      count: paystubs.length,
      totalNetPay: paystubs.reduce((sum, p) => sum + p.currentPeriod.netPay, 0)
    });

    res.json({
      year: targetYear,
      payPeriod: input.payInfo.payPeriod,
      employee: input.employeeInfo.name,
      paystubs,
      summary: {
        totalPaystubs: paystubs.length,
        totalGrossPay: paystubs.reduce((sum, p) => sum + p.currentPeriod.grossPay, 0),
        totalNetPay: paystubs.reduce((sum, p) => sum + p.currentPeriod.netPay, 0),
        totalTaxes: paystubs.reduce((sum, p) => sum + p.currentPeriod.taxes.total, 0),
        averageNetPay: paystubs.reduce((sum, p) => sum + p.currentPeriod.netPay, 0) / paystubs.length
      }
    });
  } catch (error) {
    logger.error('Error generating annual paystubs:', error);
    res.status(500).json({
      error: 'Annual paystub generation failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export { router as taxRouter };