# Robinhood CSV Import Testing

This directory contains sample CSV files for testing the Robinhood import functionality.

## CSV File Formats

### Positions CSV (robinhood_positions_sample.csv)
Expected columns:
- Symbol: Stock ticker (e.g., AAPL, TSLA)
- Instrument Type: Type of instrument (Stock, ETF, etc.)
- Quantity: Number of shares held
- Average Cost: Average cost per share (with $ symbol)
- Total Return: Total return amount (with $ symbol)
- Percent Return: Percentage return
- Today Return: Today's return (with $ symbol)
- Today Percent Return: Today's percentage return
- Market Value: Current market value (with $ symbol)

### Orders CSV (robinhood_orders_sample.csv)
Expected columns:
- Instrument: Stock ticker
- Order Type: Market, Limit, etc.
- Side: Buy or Sell
- Quantity: Number of shares
- Price: Price per share
- Executed At: Date and time of execution
- Order ID: Unique order identifier
- State: Order state (filled, partially_filled, etc.)
- Fees: Any fees associated (optional)

### Dividends CSV (robinhood_dividends_sample.csv)
Expected columns:
- Instrument: Stock ticker
- Received On: Date dividend was received
- Amount: Dividend amount (with $ symbol)
- State: Payment state

## Testing the Import

1. Start the FinSight application
2. Navigate to Portfolio → Import Data
3. Upload one or more of the sample CSV files
4. Check the results and verify the data appears correctly

## FIFO Cost Basis Calculation

The import service calculates cost basis using FIFO (First In, First Out) accounting:

1. Orders are imported first and stored chronologically
2. When positions are imported, the system:
   - Finds all buy transactions for each symbol
   - Finds all sell transactions for each symbol
   - Calculates remaining lots using FIFO accounting
   - Computes weighted average cost basis

This ensures accurate cost basis calculations for tax reporting and P&L analysis.