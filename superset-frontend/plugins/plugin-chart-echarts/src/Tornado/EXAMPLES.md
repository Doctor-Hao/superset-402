# Tornado Chart - Usage Examples

## Basic Configuration

### Simple Tornado Chart
```typescript
const basicConfig = {
  viz_type: 'echarts_tornado',
  left_metric: 'sales_2022',
  right_metric: 'sales_2023',
  category_column: 'product_category',
  y_axis_format: '.1f',
  sort_by_impact: true
};
```

### With Custom Colors
```typescript
const coloredConfig = {
  viz_type: 'echarts_tornado',
  left_metric: 'budget',
  right_metric: 'actual',
  category_column: 'department',
  leftColor: { r: 255, g: 99, b: 132 },  // Pink
  rightColor: { r: 54, g: 162, b: 235 }, // Blue
  showLegend: true,
  showValue: true
};
```

## Advanced Examples

### Financial Analysis
```typescript
const financialTornado = {
  viz_type: 'echarts_tornado',
  left_metric: 'expenses',
  right_metric: 'revenue',
  category_column: 'business_unit',
  currencyFormat: { symbol: '$', symbolPosition: 'prefix' },
  y_axis_format: '$,.0f',
  x_axis_label: 'Financial Impact ($)',
  y_axis_label: 'Business Units',
  category_label: 'Department',
  sort_by_impact: true,
  show_absolute_values: true,
  impact_threshold: 1000,
  showLegend: true
};
```

### Risk Assessment
```typescript
const riskAnalysis = {
  viz_type: 'echarts_tornado',
  left_metric: 'downside_risk',
  right_metric: 'upside_potential',
  category_column: 'risk_factor',
  leftColor: { r: 220, g: 53, b: 69 },   // Danger red
  rightColor: { r: 40, g: 167, b: 69 },  // Success green
  x_axis_label: 'Risk Impact',
  y_axis_label: 'Risk Factors',
  y_axis_format: '.2%',
  sort_by_impact: true,
  impact_threshold: 0.05 // 5% minimum impact
};
```

### Before/After Comparison
```typescript
const beforeAfterConfig = {
  viz_type: 'echarts_tornado',
  left_metric: 'before_implementation',
  right_metric: 'after_implementation',
  category_column: 'metric_name',
  x_axis_label: 'Performance Change',
  category_label: 'Performance Metrics',
  leftColor: { r: 108, g: 117, b: 125 }, // Gray for "before"
  rightColor: { r: 25, g: 135, b: 84 },  // Green for "after"
  show_absolute_values: false,
  sort_by_impact: true
};
```

## Data Format Examples

### Sales Comparison Data
```sql
SELECT 
  product_category,
  SUM(CASE WHEN year = 2022 THEN sales ELSE 0 END) as sales_2022,
  SUM(CASE WHEN year = 2023 THEN sales ELSE 0 END) as sales_2023
FROM sales_data
GROUP BY product_category
ORDER BY product_category;
```

Expected result:
```json
[
  { "product_category": "Electronics", "sales_2022": 150000, "sales_2023": 180000 },
  { "product_category": "Clothing", "sales_2022": 95000, "sales_2023": 110000 },
  { "product_category": "Books", "sales_2022": 35000, "sales_2023": 42000 }
]
```

### Budget vs Actual Analysis
```sql
SELECT 
  department,
  budget_amount,
  actual_spending
FROM financial_data
WHERE fiscal_year = 2023;
```

Expected result:
```json
[
  { "department": "Marketing", "budget_amount": 50000, "actual_spending": 48500 },
  { "department": "IT", "budget_amount": 75000, "actual_spending": 82000 },
  { "department": "HR", "budget_amount": 30000, "actual_spending": 28500 }
]
```

## Configuration Tips

### 1. Metric Selection
- **Left Metric**: Typically represents "before", "baseline", or "negative" values
- **Right Metric**: Typically represents "after", "target", or "positive" values
- Both metrics must be numeric fields

### 2. Color Guidelines
- Use contrasting colors for better visibility
- Red/Green combination for negative/positive comparisons
- Gray/Color for before/after scenarios
- Maintain accessibility standards (color blind friendly)

### 3. Sorting and Filtering
```typescript
{
  sort_by_impact: true,        // Sort by difference between metrics
  impact_threshold: 1000,      // Only show items with impact >= 1000
  show_absolute_values: true   // Display |value| instead of signed values
}
```

### 4. Formatting Options
```typescript
{
  y_axis_format: '.2f',        // Two decimal places
  currencyFormat: {            // Currency formatting
    symbol: '€',
    symbolPosition: 'prefix'
  }
}
```

## Common Use Cases

### 1. Sensitivity Analysis
Show how different factors impact a key metric:
- X-axis: Impact on profit
- Y-axis: Various business factors
- Colors: Negative (red) vs Positive (green) impact

### 2. Performance Comparison
Compare metrics across time periods:
- Left: Previous period performance
- Right: Current period performance
- Sort by improvement (impact)

### 3. Budget Analysis
Compare planned vs actual values:
- Left: Budget allocation
- Right: Actual spending
- Identify over/under spending

### 4. A/B Testing Results
Show test results across different metrics:
- Left: Control group performance
- Right: Test group performance
- Sort by statistical significance

## Troubleshooting

### Issue: Chart shows no data
**Solution**: Verify that:
- Both metrics exist in the dataset
- Category column contains valid values
- Data is not filtered out by impact_threshold

### Issue: Bars are too small to see
**Solution**: 
- Reduce impact_threshold
- Check data scale (consider using percentage format)
- Verify metric calculations are correct

### Issue: Categories are cut off
**Solution**:
- Increase chart height
- Shorten category names in the data
- Adjust chart margins in advanced settings