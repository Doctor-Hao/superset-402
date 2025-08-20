# Economic Tornado Chart Plugin

An economic tornado chart (also known as a Tornado diagram or Delta cost analysis chart) visualization plugin for Apache Superset, built using ECharts.

## Overview

The Economic Tornado chart displays delta cost analysis as horizontal bars extending in both directions from a central axis, specifically designed for economic models over calculated time periods (typically 20 years). This visualization is ideal for:

- **Delta cost analysis** by economic parameters
- **Economic sensitivity analysis** for long-term projections
- **Cost impact visualization** across different variables
- **Financial model comparison** over 20-year periods
- **Economic parameter ranking** by impact magnitude

## Features

- **Bidirectional bars**: Display two metrics extending left and right from center
- **Customizable colors**: Configure colors for left and right sides
- **Sorting options**: Sort by impact or keep original order
- **Value formatting**: Support for currency and number formatting
- **Interactive tooltips**: Detailed information on hover
- **Legend support**: Toggle series visibility
- **Impact threshold**: Filter data by minimum impact value
- **Absolute values**: Option to show absolute values in labels

## Configuration Options

### Required Fields
- **Left Metric**: Metric displayed on the left side of the chart
- **Right Metric**: Metric displayed on the right side of the chart
- **Category Column**: Categorical field for y-axis labels

### Display Options
- **Left Color**: Color for left-side bars (default: red)
- **Right Color**: Color for right-side bars (default: green)
- **Show Legend**: Display/hide chart legend
- **Show Values**: Display values on bars
- **Show Absolute Values**: Display absolute values instead of signed values

### Formatting
- **X-Axis Label**: Custom label for x-axis
- **Y-Axis Label**: Custom label for y-axis
- **Category Label**: Custom label for categories
- **Y-Axis Format**: Number/currency formatting pattern
- **Currency Format**: Currency symbol and formatting

### Data Processing
- **Sort by Impact**: Sort categories by impact (difference between metrics)
- **Impact Threshold**: Minimum impact value to include in chart

## File Structure

```
Tornado/
├── README.md                 # This documentation
├── index.ts                  # Plugin registration and metadata
├── types.ts                  # TypeScript type definitions
├── constants.ts              # Chart constants and defaults
├── controlPanel.tsx          # Configuration UI controls
├── buildQuery.ts             # Query building logic
├── transformProps.ts         # Data transformation logic
├── EchartsTornado.tsx        # Main chart component
└── images/
    └── example1.png          # Example chart image
```

## Usage Example

```typescript
// Example data structure
const data = [
  { category: 'Category A', left_value: 100, right_value: 150 },
  { category: 'Category B', left_value: 80, right_value: 120 },
  { category: 'Category C', left_value: 60, right_value: 90 }
];

// Chart configuration
const formData = {
  left_metric: 'left_value',
  right_metric: 'right_value',
  category_column: 'category',
  leftColor: { r: 224, g: 67, b: 85 },
  rightColor: { r: 90, g: 193, b: 137 },
  sort_by_impact: true,
  show_absolute_values: true
};
```

## Implementation Details

### Data Transformation
The chart transforms input data into a format suitable for ECharts:
1. Calculates impact (absolute difference between left and right values)
2. Filters data based on impact threshold
3. Sorts by impact if enabled
4. Creates bidirectional bar data (negative values for left side)

### Error Handling
The plugin includes robust error handling for:
- Undefined or null metrics
- Missing data fields
- Invalid data types
- Empty datasets

### Performance Considerations
- Efficient data transformation using native array methods
- Minimal re-renders through proper React optimization
- Lazy loading of ECharts components

## Development

### Adding New Features
1. Update type definitions in `types.ts`
2. Add control panel options in `controlPanel.tsx`
3. Implement logic in `transformProps.ts`
4. Update this documentation

### Testing
Ensure all changes are tested with:
- Valid data scenarios
- Edge cases (empty data, single values)
- Configuration variations
- Error conditions

## Troubleshooting

### Common Issues
1. **"metric is undefined" error**: Ensure both left_metric and right_metric are properly configured
2. **Empty chart**: Check that data contains the specified metric and category columns
3. **Formatting issues**: Verify y_axis_format pattern is valid
4. **Color not applied**: Ensure color values are in {r, g, b} format

### Debug Mode
Enable debug mode by checking browser console for detailed error messages and data transformation logs.