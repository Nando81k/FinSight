import { Router } from 'express';
import { createLogger } from '../utils/logger';
import BudgetSimulator, { 
  BudgetScenario, 
  BudgetCategory, 
  BudgetItem, 
  SavingsGoal,
  BudgetFrequency
} from '../services/BudgetSimulator';

const router = Router();
const logger = createLogger('budget-routes');

// In-memory storage for demonstration (would be replaced with database in production)
let budgetScenarios: BudgetScenario[] = [];
let scenarioIdCounter = 1;

// Initialize with sample data
if (budgetScenarios.length === 0) {
  budgetScenarios.push(BudgetSimulator.createSampleScenario());
}

// GET /api/budget/categories - Get default budget categories
router.get('/categories', async (req, res) => {
  try {
    logger.info('Fetching budget categories');
    
    const categories = BudgetSimulator.getDefaultCategories();
    
    res.json({
      categories,
      totalCategories: categories.length,
      incomeCategories: categories.filter(cat => cat.type === 'income').length,
      expenseCategories: categories.filter(cat => cat.type === 'expense').length
    });
  } catch (error) {
    logger.error('Error fetching budget categories:', error);
    res.status(500).json({
      error: 'Failed to fetch categories',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// GET /api/budget/scenarios - List all budget scenarios
router.get('/scenarios', async (req, res) => {
  try {
    logger.info('Fetching budget scenarios');
    
    const scenarios = budgetScenarios.map(scenario => ({
      id: scenario.id,
      name: scenario.name,
      description: scenario.description,
      itemCount: scenario.items.length,
      goalCount: scenario.savingsGoals?.length || 0,
      createdAt: scenario.createdAt,
      updatedAt: scenario.updatedAt
    }));
    
    res.json({
      scenarios,
      totalScenarios: scenarios.length
    });
  } catch (error) {
    logger.error('Error fetching budget scenarios:', error);
    res.status(500).json({
      error: 'Failed to fetch scenarios',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// GET /api/budget/scenarios/:id - Get specific budget scenario
router.get('/scenarios/:id', async (req, res) => {
  try {
    const { id } = req.params;
    logger.info('Fetching budget scenario', { scenarioId: id });
    
    const scenario = budgetScenarios.find(s => s.id === id);
    if (!scenario) {
      return res.status(404).json({
        error: 'Scenario not found',
        details: `No scenario found with ID: ${id}`
      });
    }
    
    return res.json(scenario);
  } catch (error) {
    logger.error('Error fetching budget scenario:', error);
    return res.status(500).json({
      error: 'Failed to fetch scenario',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// POST /api/budget/scenarios - Create new budget scenario
router.post('/scenarios', async (req, res) => {
  try {
    const { name, description, categories, items, savingsGoals }: {
      name: string;
      description?: string;
      categories?: BudgetCategory[];
      items?: BudgetItem[];
      savingsGoals?: SavingsGoal[];
    } = req.body;
    
    if (!name) {
      return res.status(400).json({
        error: 'Invalid input',
        details: 'Scenario name is required'
      });
    }
    
    logger.info('Creating new budget scenario', { name });
    
    const newScenario: BudgetScenario = {
      id: `scenario-${scenarioIdCounter++}`,
      name,
      ...(description && { description }),
      categories: categories || BudgetSimulator.getDefaultCategories(),
      items: items || [],
      savingsGoals: savingsGoals || [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    budgetScenarios.push(newScenario);
    
    logger.info('Budget scenario created successfully', { scenarioId: newScenario.id });
    return res.status(201).json(newScenario);
  } catch (error) {
    logger.error('Error creating budget scenario:', error);
    return res.status(500).json({
      error: 'Failed to create scenario',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// PUT /api/budget/scenarios/:id - Update budget scenario
router.put('/scenarios/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    logger.info('Updating budget scenario', { scenarioId: id });
    
    const scenarioIndex = budgetScenarios.findIndex(s => s.id === id);
    if (scenarioIndex === -1) {
      return res.status(404).json({
        error: 'Scenario not found',
        details: `No scenario found with ID: ${id}`
      });
    }
    
    const updatedScenario = {
      ...budgetScenarios[scenarioIndex],
      ...updates,
      updatedAt: new Date().toISOString()
    };
    
    budgetScenarios[scenarioIndex] = updatedScenario;
    
    logger.info('Budget scenario updated successfully', { scenarioId: id });
    return res.json(updatedScenario);
  } catch (error) {
    logger.error('Error updating budget scenario:', error);
    return res.status(500).json({
      error: 'Failed to update scenario',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// DELETE /api/budget/scenarios/:id - Delete budget scenario
router.delete('/scenarios/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    logger.info('Deleting budget scenario', { scenarioId: id });
    
    const scenarioIndex = budgetScenarios.findIndex(s => s.id === id);
    if (scenarioIndex === -1) {
      return res.status(404).json({
        error: 'Scenario not found',
        details: `No scenario found with ID: ${id}`
      });
    }
    
    budgetScenarios.splice(scenarioIndex, 1);
    
    logger.info('Budget scenario deleted successfully', { scenarioId: id });
    return res.json({ message: 'Scenario deleted successfully' });
  } catch (error) {
    logger.error('Error deleting budget scenario:', error);
    return res.status(500).json({
      error: 'Failed to delete scenario',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// POST /api/budget/analyze/:id - Analyze budget scenario
router.post('/analyze/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    logger.info('Analyzing budget scenario', { scenarioId: id });
    
    const scenario = budgetScenarios.find(s => s.id === id);
    if (!scenario) {
      return res.status(404).json({
        error: 'Scenario not found',
        details: `No scenario found with ID: ${id}`
      });
    }
    
    const analysis = BudgetSimulator.analyzeBudget(scenario);
    
    logger.info('Budget analysis completed', { 
      scenarioId: id,
      savingsRate: analysis.savingsRate,
      recommendationCount: analysis.recommendations.length
    });
    
    return res.json(analysis);
  } catch (error) {
    logger.error('Error analyzing budget scenario:', error);
    return res.status(500).json({
      error: 'Budget analysis failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// POST /api/budget/compare - Compare multiple budget scenarios
router.post('/compare', async (req, res) => {
  try {
    const { scenarioIds }: { scenarioIds: string[] } = req.body;
    
    if (!scenarioIds || !Array.isArray(scenarioIds) || scenarioIds.length < 2) {
      return res.status(400).json({
        error: 'Invalid input',
        details: 'At least 2 scenario IDs are required for comparison'
      });
    }
    
    logger.info('Comparing budget scenarios', { scenarioIds });
    
    const scenarios = scenarioIds.map(id => {
      const scenario = budgetScenarios.find(s => s.id === id);
      if (!scenario) {
        throw new Error(`Scenario not found: ${id}`);
      }
      return scenario;
    });
    
    const comparison = BudgetSimulator.compareScenarios(scenarios);
    
    logger.info('Budget comparison completed', { 
      scenarioCount: scenarios.length,
      bestSavingsRate: comparison.bestScenario.highestSavingsRate
    });
    
    return res.json(comparison);
  } catch (error) {
    logger.error('Error comparing budget scenarios:', error);
    return res.status(500).json({
      error: 'Budget comparison failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// POST /api/budget/scenarios/:id/items - Add budget item to scenario
router.post('/scenarios/:id/items', async (req, res) => {
  try {
    const { id } = req.params;
    const { categoryId, name, amount, frequency, description, tags }: {
      categoryId: string;
      name: string;
      amount: number;
      frequency: BudgetFrequency;
      description?: string;
      tags?: string[];
    } = req.body;
    
    if (!categoryId || !name || !amount || !frequency) {
      return res.status(400).json({
        error: 'Invalid input',
        details: 'categoryId, name, amount, and frequency are required'
      });
    }
    
    logger.info('Adding budget item', { scenarioId: id, itemName: name });
    
    const scenarioIndex = budgetScenarios.findIndex(s => s.id === id);
    if (scenarioIndex === -1) {
      return res.status(404).json({
        error: 'Scenario not found',
        details: `No scenario found with ID: ${id}`
      });
    }
    
    const scenario = budgetScenarios[scenarioIndex];
    if (!scenario) {
      return res.status(404).json({
        error: 'Scenario not found',
        details: `No scenario found with ID: ${id}`
      });
    }
    
    const newItem: BudgetItem = {
      id: `item-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      categoryId,
      name,
      amount,
      frequency,
      ...(description && { description }),
      ...(tags && { tags })
    };
    
    scenario.items.push(newItem);
    scenario.updatedAt = new Date().toISOString();
    
    logger.info('Budget item added successfully', { scenarioId: id, itemId: newItem.id });
    return res.status(201).json(newItem);
  } catch (error) {
    logger.error('Error adding budget item:', error);
    return res.status(500).json({
      error: 'Failed to add budget item',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Utility endpoint to convert between frequencies
router.post('/convert', async (req, res) => {
  try {
    const { amount, fromFrequency, toFrequency }: {
      amount: number;
      fromFrequency: BudgetFrequency;
      toFrequency: BudgetFrequency;
    } = req.body;
    
    if (!amount || !fromFrequency || !toFrequency) {
      return res.status(400).json({
        error: 'Invalid input',
        details: 'amount, fromFrequency, and toFrequency are required'
      });
    }
    
    const monthlyAmount = BudgetSimulator.convertToMonthly(amount, fromFrequency);
    const convertedAmount = BudgetSimulator.convertFromMonthly(monthlyAmount, toFrequency);
    
    return res.json({
      originalAmount: amount,
      fromFrequency,
      toFrequency,
      convertedAmount,
      monthlyEquivalent: monthlyAmount,
      annualEquivalent: monthlyAmount * 12
    });
  } catch (error) {
    logger.error('Error converting frequency:', error);
    return res.status(500).json({
      error: 'Frequency conversion failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export { router as budgetRouter };