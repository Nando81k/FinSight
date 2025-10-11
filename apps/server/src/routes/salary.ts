import { Router } from 'express';

const router = Router();

router.post('/calc', async (req, res, next) => {
  try {
    res.json({ message: 'Salary calculator - to be implemented' });
  } catch (error) {
    next(error);
  }
});

export { router as salaryRouter };