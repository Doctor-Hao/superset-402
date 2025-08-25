# Mixed Timeseries Chart

## Overview

The Mixed Timeseries Chart is an advanced time series visualization that allows for plotting multiple queries with different chart types on the same time axis. It supports up to three separate queries (A, B, and C) with independent styling and configuration options.

## Key Features

### Multi-Query Support
- **Query A**: Primary data source with full configuration options
- **Query B**: Secondary data source with independent styling
- **Query C**: Tertiary data source (optional) with flexible configuration

### Chart Types Support
Each query can use different chart types:
- Line chart (default)
- Scatter plot
- Smooth line
- Bar chart
- Step charts (start, middle, end)
- Area charts

### X-Axis Configuration
- **Show All Years on X-Axis**: New feature that displays all year labels on the x-axis instead of auto-selecting intervals
- Time format customization
- Label rotation control
- Bounds configuration
- Categorical or time-based axis types

### Y-Axis Configuration
- Dual Y-axis support (Primary and Secondary)
- Independent formatting for each axis
- Logarithmic scale options
- Bounds configuration
- Custom titles and positioning

## Data Format

The chart expects time series data in the following format:

```
Column Name: [Time Column]    [Metric 1]    [Metric 2]    ...
Row 1:      1980-01-01        0             8.1           ...
Row 2:      1981-01-01        0             14.27         ...
...
```

### Example Data Structure
Based on the provided example data:
```
jp_sales
1980-01-01 00:00:00    0
1981-01-01 00:00:00    0
1982-01-01 00:00:00    0
1983-01-01 00:00:00    8.1
1984-01-01 00:00:00    14.269999999999998
```

## Configuration Options

### General Settings
- **Color Scheme**: Choose from available color palettes
- **Legend**: Position, orientation, and visibility controls
- **Zoom**: Enable/disable data zooming controls
- **Rich Tooltip**: Enhanced tooltip with multiple series information

### Query-Specific Settings

Each query (A, B, C) has independent configuration:

#### Series Configuration
- **Series Type**: Select chart type (line, bar, scatter, etc.)
- **Stack Series**: Enable stacking for cumulative views
- **Area Chart**: Fill area under curves (line types only)
- **Show Values**: Display numerical values on data points
- **Opacity**: Control transparency (0-1)

#### Markers
- **Marker Enabled**: Show/hide data point markers
- **Marker Size**: Adjust marker size (0-100)

#### Y-Axis Assignment
- **Primary Y-Axis**: Left axis with primary formatting
- **Secondary Y-Axis**: Right axis with independent formatting

### Advanced Features

#### Annotations
Support for multiple annotation types:
- Formula annotations
- Interval annotations
- Event annotations
- Time series annotations

#### Analytics
Each query supports:
- Time comparison
- Rolling windows
- Forecasting
- Contribution analysis

## Usage Examples

### Basic Time Series
1. Set up Query A with your primary time series data
2. Select appropriate time column for x-axis
3. Choose metrics for y-axis
4. Configure chart type and styling

### Comparative Analysis
1. Configure Query A for primary dataset
2. Configure Query B for comparison dataset
3. Use different Y-axes or chart types to highlight differences
4. Enable "Show All Years on X-Axis" for detailed year-by-year comparison

### Multi-Metric Dashboard
1. Query A: Primary metric (e.g., sales data)
2. Query B: Secondary metric (e.g., growth rate) on secondary Y-axis
3. Query C: Tertiary metric (e.g., targets or benchmarks)
4. Use different chart types for visual distinction

## New Feature: Show All Years on X-Axis

### Purpose
When enabled, this feature ensures that all year labels are displayed on the x-axis instead of ECharts automatically selecting intervals. This is particularly useful for:
- Annual reports requiring all years to be visible
- Comparative analysis across specific time periods
- Compliance reporting where all time periods must be shown

### How It Works
- **Disabled (Default)**: ECharts automatically selects appropriate intervals based on data density and available space
- **Enabled**: Forces the display of all time labels, overriding automatic interval selection

### Configuration
Located in the "X Axis" section of chart options:
- **Control Name**: "Show all years on X-axis"
- **Type**: Checkbox
- **Default**: Disabled
- **Description**: "Display all year labels on the x-axis instead of auto-selecting intervals"

### Technical Implementation
When enabled, the feature:
1. Sets `interval: 0` in the xAxis configuration
2. Disables `minInterval` calculations for automatic spacing
3. Forces ECharts to display every available time point

## Best Practices

### Performance Considerations
- Limit the number of data points for optimal rendering
- Use row limits and time range filters appropriately
- Consider using Query C sparingly for complex visualizations

### Visual Design
- Use contrasting chart types for different queries (e.g., line + bar)
- Assign related metrics to the same Y-axis
- Use consistent color schemes across related dashboards

### Data Preparation
- Ensure time columns are properly formatted
- Handle missing values appropriately
- Consider data granularity based on visualization needs

## Troubleshooting

### Common Issues
1. **Overlapping Labels**: Use label rotation or "Show All Years" feature selectively
2. **Performance**: Reduce data points or use data sampling
3. **Missing Data**: Check query results and data types
4. **Axis Scaling**: Adjust Y-axis bounds or use logarithmic scaling

### Configuration Validation
- Query A is required (primary data source)
- Query B and C are optional
- At least one metric must be selected for active queries
- Time column must be specified for time-based charts

## API Reference

### Form Data Structure
```typescript
interface EchartsMixedTimeseriesFormData {
  // Shared properties
  annotationLayers: AnnotationLayer[];
  minorSplitLine: boolean;
  minorTicks: boolean;
  logAxis: boolean;
  logAxisSecondary: boolean;
  showAllYearsOnXAxis?: boolean; // New feature
  
  // Query-specific properties (A, B, C)
  area: boolean;
  areaB: boolean;
  areaC: boolean;
  seriesType: EchartsTimeseriesSeriesType;
  seriesTypeB: EchartsTimeseriesSeriesType;
  seriesTypeC: EchartsTimeseriesSeriesType;
  
  // ... additional properties
}
```

### Transform Props
The chart uses ECharts library with the following key configuration:
- `xAxis.interval`: Controls label intervals (set to 0 for all labels)
- `xAxis.minInterval`: Minimum time interval between labels
- `yAxis[]`: Array supporting dual Y-axis configuration
- `series[]`: Combined series from all queries

## Version History

### Recent Updates
- Added support for Query C (tertiary data source)
- Implemented "Show All Years on X-Axis" feature
- Enhanced Y-axis configuration options
- Improved tooltip formatting for multiple queries

### Future Enhancements
- Additional annotation types
- Enhanced forecast visualization
- Improved mobile responsiveness
- Advanced filtering capabilities