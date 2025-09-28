# Cumulative Analysis Page

This document outlines the design and implementation of the Cumulative Analysis page, which provides users with cumulative spending visualizations to track how expenses accumulate over time periods.

## Overview

The Cumulative Analysis page (`CumulativePage.tsx`) offers users a unique perspective on their financial data by showing cumulative spending patterns. Unlike traditional period-based analysis, cumulative analysis reveals how spending builds up progressively over months and days, helping users understand their spending velocity and financial momentum.

The page features two distinct visualization modes:
1. **Cumulative Monthly Spending by Category** - Shows how spending accumulates across an entire year
2. **Cumulative Daily Spending Analysis** - Shows how spending accumulates throughout a selected month

## Key Components

### Page Structure

**Implementation**: `src/pages/CumulativePage.tsx`

The page is organized into two main sections with clear visual separation:

```
┌─────────────────────────────────────────────────────────────┐
│ Cumulative Spending Analysis                                │
├─────────────────────────────────────────────────────────────┤
│ Cumulative Monthly Spending by Category                     │
│ ┌─────────────────────────────────────────┐  [Year: 2025 ▼] │
│ │                                         │                 │
│ │        Line Chart                       │                 │
│ │     (12-month cumulative view)          │                 │
│ │                                         │                 │
│ └─────────────────────────────────────────┘                 │
├─────────────────────────────────────────────────────────────┤
│ Cumulative Daily Spending Analysis                          │
│ [Month: September ▼]                        [Year: 2025 ▼]  │
│ ┌─────────────────────────────────────────┐                 │
│ │                                         │                 │
│ │        Line Chart                       │                 │
│ │     (Daily cumulative view)             │                 │
│ │                                         │                 │
│ └─────────────────────────────────────────┘                 │
└─────────────────────────────────────────────────────────────┘
```

### State Management

The component manages the following state variables:

```typescript
const [year, setYear] = useState<number>(new Date().getFullYear());
const [month, setMonth] = useState<number>(new Date().getMonth() + 1);
```

### UI Framework

- **Container**: Material-UI `Container` with `maxWidth="lg"`
- **Layout**: Material-UI `Stack` components for responsive layouts
- **Paper Sections**: Material-UI `Paper` components with proper spacing
- **Form Controls**: Material-UI `Select` components for date selection

## Chart Components

### Cumulative Parent Category Line Chart

**Implementation**: `src/components/charts/CumulativeParentCategoryLineChart.tsx`

This component serves dual purposes through different prop configurations:

#### Yearly View Configuration
```typescript
<CumulativeParentCategoryLineChart year={year} />
```

**Features**:
- Displays cumulative spending across 12 months
- Each line represents a different parent category
- Shows running totals from January to December
- Interactive tooltips with monthly and cumulative values

#### Daily View Configuration
```typescript
<CumulativeParentCategoryLineChart 
  year={year} 
  selectedMonth={month} 
  showOnlyDailyChart={true} 
/>
```

**Features**:
- Shows cumulative daily spending for a specific month
- Displays progression from day 1 to end of month
- Handles months with different day counts (28-31 days)
- Provides daily breakdown tooltips

## Data Flow and API Integration

### Backend Integration

The charts consume data from the analysis API endpoints:

**Primary Endpoint**: `/api/analysis/spending`

**API Service**: `src/services/analysisApi.ts`

### Data Processing Logic

#### Cumulative Calculation Algorithm

```typescript
// Pseudocode for cumulative data processing
function calculateCumulativeSpending(transactions, timeframe) {
  // Sort transactions by date
  const sortedTransactions = sortBy(transactions, 'date');
  
  // Group by category and time period
  const categorizedData = groupBy(sortedTransactions, 'parent_category_id');
  
  const cumulativeData = {};
  
  for (const [categoryId, categoryTransactions] of Object.entries(categorizedData)) {
    let runningTotal = 0;
    const cumulativePoints = [];
    
    // For each time period (month/day)
    for (const period of timeframe.periods) {
      // Sum transactions in this period
      const periodTransactions = filterByPeriod(categoryTransactions, period);
      const periodTotal = sumTransactions(periodTransactions);
      
      // Add to running total
      runningTotal += periodTotal;
      
      cumulativePoints.push({
        period: period.label,
        value: runningTotal,
        periodSpending: periodTotal
      });
    }
    
    cumulativeData[categoryId] = cumulativePoints;
  }
  
  return cumulativeData;
}
```

#### Monthly Cumulative Processing

```typescript
// Monthly cumulative calculation
function processMonthlyData(spendingData, year) {
  const months = generateMonthsArray(year);
  const categories = extractCategories(spendingData);
  
  return categories.map(category => {
    let cumulativeAmount = 0;
    const monthlyPoints = months.map((month, index) => {
      const monthlySpending = getMonthlySpending(spendingData, category.id, month);
      cumulativeAmount += monthlySpending;
      
      return {
        x: index + 1, // Month number (1-12)
        y: cumulativeAmount,
        monthlySpending: monthlySpending
      };
    });
    
    return {
      label: category.name,
      data: monthlyPoints,
      borderColor: category.color,
      backgroundColor: category.color
    };
  });
}
```

#### Daily Cumulative Processing

```typescript
// Daily cumulative calculation
function processDailyData(spendingData, year, month) {
  const daysInMonth = getDaysInMonth(year, month);
  const categories = extractCategories(spendingData);
  
  return categories.map(category => {
    let cumulativeAmount = 0;
    const dailyPoints = [];
    
    for (let day = 1; day <= daysInMonth; day++) {
      const dailySpending = getDailySpending(spendingData, category.id, year, month, day);
      cumulativeAmount += dailySpending;
      
      dailyPoints.push({
        x: day,
        y: cumulativeAmount,
        dailySpending: dailySpending
      });
    }
    
    return {
      label: category.name,
      data: dailyPoints,
      borderColor: category.color,
      backgroundColor: category.color
    };
  });
}
```

## User Interface Design

### Responsive Layout

The page uses Material-UI's responsive system:

```typescript
<Stack 
  direction={{ xs: 'column', md: 'row' }} 
  spacing={3} 
  alignItems={{ xs: 'stretch', md: 'center' }}
>
```

- **Mobile (xs)**: Stacked vertically with full-width elements
- **Desktop (md+)**: Horizontal layout with form controls aligned right

### Spacing and Layout

**Resolved Spacing Configuration**:
- Container: `sx={{ mt: 4, mb: 12 }}` - Top and bottom margins
- First Paper: `sx={{ p: 3, mb: 4 }}` - Standard padding and bottom margin
- Last Paper: `sx={{ p: 3, pb: 10 }}` - Standard padding with extra bottom padding
- Chart Cards: `sx={{ overflow: 'visible' }}` - Allows tooltips to extend beyond bounds

### Visual Hierarchy

1. **Primary Header**: "Cumulative Spending Analysis" (h4)
2. **Section Headers**: "Cumulative Monthly..." / "Cumulative Daily..." (h6)
3. **Form Controls**: Right-aligned selectors for date filtering
4. **Descriptive Text**: Helper text explaining each chart's purpose

## Chart Configuration

### Chart.js Integration

The charts use Chart.js through react-chartjs-2 with the following key configurations:

#### Tooltip Configuration
```typescript
tooltip: {
  callbacks: {
    label: function(context) {
      const datasetLabel = context.dataset.label;
      const cumulativeValue = formatCurrency(context.parsed.y);
      const periodValue = getPeriodValue(context); // Daily or monthly spending
      
      return [
        `${datasetLabel}: ${cumulativeValue}`,
        `Period Spending: ${formatCurrency(periodValue)}`
      ];
    }
  }
}
```

#### Scale Configuration
```typescript
scales: {
  x: {
    title: {
      display: true,
      text: isMonthlyView ? 'Month' : 'Day'
    }
  },
  y: {
    title: {
      display: true,
      text: 'Cumulative Amount (€)'
    },
    ticks: {
      callback: function(value) {
        return formatCurrency(value);
      }
    }
  }
}
```

## Backend Implementation

### Controller Methods

**File**: `server/src/controllers/analysisController.ts`

Key methods supporting cumulative analysis:

```typescript
// Get cumulative spending data
async getCumulativeSpending(req: Request, res: Response) {
  const { year, month, selectedMonth } = req.query;
  
  try {
    if (selectedMonth) {
      // Daily cumulative data for specific month
      const dailyData = await this.calculateDailyCumulative(year, selectedMonth);
      res.json(dailyData);
    } else {
      // Monthly cumulative data for year
      const monthlyData = await this.calculateMonthlyCumulative(year);
      res.json(monthlyData);
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
```

### Database Queries

#### Monthly Cumulative Query
```sql
WITH monthly_spending AS (
  SELECT 
    c.parent_category_id,
    pc.name as parent_category_name,
    EXTRACT(MONTH FROM t.date) as month,
    SUM(ABS(t.amount)) as monthly_total
  FROM transactions t
  JOIN categories c ON t.category_id = c.id
  JOIN parent_categories pc ON c.parent_category_id = pc.id
  WHERE EXTRACT(YEAR FROM t.date) = ?
    AND t.amount < 0  -- Only expenses
  GROUP BY c.parent_category_id, pc.name, EXTRACT(MONTH FROM t.date)
  ORDER BY month
),
cumulative_spending AS (
  SELECT 
    parent_category_id,
    parent_category_name,
    month,
    monthly_total,
    SUM(monthly_total) OVER (
      PARTITION BY parent_category_id 
      ORDER BY month 
      ROWS UNBOUNDED PRECEDING
    ) as cumulative_total
  FROM monthly_spending
)
SELECT * FROM cumulative_spending;
```

#### Daily Cumulative Query
```sql
WITH daily_spending AS (
  SELECT 
    c.parent_category_id,
    pc.name as parent_category_name,
    EXTRACT(DAY FROM t.date) as day,
    SUM(ABS(t.amount)) as daily_total
  FROM transactions t
  JOIN categories c ON t.category_id = c.id
  JOIN parent_categories pc ON c.parent_category_id = pc.id
  WHERE EXTRACT(YEAR FROM t.date) = ?
    AND EXTRACT(MONTH FROM t.date) = ?
    AND t.amount < 0  -- Only expenses
  GROUP BY c.parent_category_id, pc.name, EXTRACT(DAY FROM t.date)
  ORDER BY day
),
cumulative_daily AS (
  SELECT 
    parent_category_id,
    parent_category_name,
    day,
    daily_total,
    SUM(daily_total) OVER (
      PARTITION BY parent_category_id 
      ORDER BY day 
      ROWS UNBOUNDED PRECEDING
    ) as cumulative_total
  FROM daily_spending
)
SELECT * FROM cumulative_daily;
```

## Technical Considerations

### Performance Optimizations

1. **Data Caching**: Backend caches cumulative calculations for frequently requested periods
2. **Incremental Updates**: Only recalculates cumulative totals when new transactions are added
3. **Efficient Queries**: Uses window functions for optimal cumulative calculations
4. **Chart Optimization**: Uses Chart.js performance optimizations for large datasets

### Error Handling

```typescript
// Handle missing data gracefully
if (!spendingData.categories || spendingData.categories.length === 0) {
  return (
    <Box sx={{ p: 3, textAlign: 'center' }}>
      <Typography>No daily spending data available for {monthNames[month - 1]} {year}.</Typography>
    </Box>
  );
}
```

### Data Validation

- Validates year range (current year and 4 previous years)
- Validates month range (1-12)
- Handles leap years for February calculations
- Manages timezone considerations for date boundaries

## User Experience Features

### Interactive Elements

1. **Year Selector**: Dropdown with last 5 years
2. **Month Selector**: Full month names for clarity
3. **Responsive Design**: Adapts to mobile and desktop screens
4. **Loading States**: Shows loading indicators during data fetching
5. **Empty States**: Informative messages when no data is available

### Accessibility

- Semantic HTML structure with proper headings
- ARIA labels for form controls
- Keyboard navigation support
- High contrast color schemes for chart elements
- Screen reader compatible chart descriptions

### Visual Design

- **Color Palette**: Consistent with application theme
- **Typography**: Clear hierarchy with Material-UI typography system
- **Spacing**: Logical spacing using Material-UI's spacing system
- **Cards**: Elevated cards to separate chart sections
- **Dividers**: Visual separation between major sections

## Future Enhancements

### 1. Comparison Mode

Add ability to compare cumulative spending across different time periods:

```typescript
// Proposed feature: Year-over-year comparison
<CumulativeParentCategoryLineChart 
  year={year}
  comparisonYear={year - 1}
  showComparison={true}
/>
```

### 2. Goal Tracking

Integrate budget goals with cumulative visualization:

- Show goal lines on cumulative charts
- Highlight when cumulative spending exceeds budgets
- Progress indicators for staying within budget

### 3. Forecast Integration

Add predictive elements to cumulative charts:

- Project end-of-period totals based on current trends
- Show confidence intervals for predictions
- Seasonal adjustment factors

### 4. Export Capabilities

Enhanced data export options:

- CSV export of cumulative data
- PDF report generation with charts
- Scheduled report delivery
- Custom date range selections

### 5. Interactive Annotations

Add interactive elements to charts:

- Click to add notes to specific dates
- Highlight unusual spending patterns
- Mark significant financial events

## Integration with Other Features

### Relationship to Analysis Page

The Cumulative page complements the main Analysis page by providing:

- **Different Perspective**: Shows accumulation vs. period-based analysis
- **Shared Components**: Uses same chart components with different configurations
- **Consistent Styling**: Maintains visual consistency across pages
- **Data Compatibility**: Uses same backend APIs and data structures

### Navigation Flow

Users can navigate between analysis views:

```
Transactions → Analysis → Cumulative → Settings
     ↑             ↓           ↓
     └─────────────┴───────────┘
```

## Conclusion

The Cumulative Analysis page provides users with valuable insights into how their spending builds up over time. By showing cumulative rather than period-based data, users can better understand their spending velocity, identify acceleration patterns, and make more informed decisions about their financial habits. The page's dual-chart approach (monthly and daily views) offers both macro and micro perspectives on cumulative spending behavior.

The implementation leverages modern React patterns, Material-UI components, and efficient database queries to deliver a responsive, accessible, and performant user experience. The modular design allows for future enhancements while maintaining code maintainability and user experience consistency.
