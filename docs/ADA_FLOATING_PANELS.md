# ADA Floating Panels Feature

## Overview

ADA Floating Panels is a new capability that allows ADA (the Mach33 Assistant) to display floating tile panels during her verbal responses. These panels can show content that may not be on the dashboard, and they automatically disappear after a configurable linger time.

## Features

- **Floating Tile Display**: Shows standard dashboard tiles as floating panels during voice responses
- **Automatic Triggering**: Panels can be triggered via transcript markers or programmatic API
- **Auto-Dismiss**: Panels automatically disappear after a configurable linger time (default: 8 seconds)
- **Manual Dismiss**: Users can close panels manually via close button
- **Multiple Panels**: Supports multiple panels stacking with offset positioning
- **Responsive**: Works in both free mode (floating windows) and fixed mode (GoldenLayout)

## Usage

### Method 1: Transcript Markers (Recommended for ADA)

ADA can trigger panels by including special markers in her verbal responses:

```
[PANEL:id:title:value]
```

or

```
[SHOW:id:title]
```

**Examples:**

- `[PANEL:valuation:Total Enterprise Value:$450B]` - Shows a panel with title "Total Enterprise Value" and value "$450B"
- `[SHOW:starlink:Starlink Revenue]` - Shows a panel with title "Starlink Revenue"

**Full Example Response:**

```
The total enterprise value is $450 billion. [PANEL:valuation:Total Enterprise Value:$450B] 
This includes both Earth and Mars operations. The Starlink segment alone accounts for 
$300 billion. [PANEL:starlink:Starlink Value:$300B]
```

### Method 2: Programmatic API

Panels can be triggered programmatically from JavaScript:

```javascript
// Show a simple panel
window.adaShowPanel({
    id: 'panel1',
    tile: {
        id: 'valuation',
        title: 'Total Enterprise Value',
        value: '$450B',
        icon: 'zap',
        color: '#0066cc'
    },
    lingerTime: 8000, // 8 seconds
    position: 'top-right', // 'top-right', 'top-left', 'bottom-right', 'bottom-left'
    width: 300
});

// Show a panel with insight data
window.adaShowPanel({
    id: 'panel2',
    tile: {
        id: 'starlink',
        title: 'Starlink Revenue',
        value: '$300B',
        icon: 'globe',
        color: '#10b981'
    },
    insight: {
        insight: 'Starlink accounts for 67% of total enterprise value.'
    },
    lingerTime: 10000, // 10 seconds
    position: 'top-left',
    width: 350
});

// Using app instance method
app.showAdaFloatingPanel({
    id: 'panel3',
    tile: {
        id: 'mars',
        title: 'Mars Operations',
        value: '$150B',
        icon: 'rocket',
        color: '#f59e0b'
    }
});
```

### Method 3: From Agent Response Handler

Panels are automatically parsed from agent responses in `sendAgentMessageSilent`:

```javascript
// The response text is automatically scanned for [PANEL:...] markers
// No additional code needed - it's already integrated!
```

## Panel Configuration Options

### Required Parameters

- `id` (string): Unique identifier for the panel
- `tile` (object): Tile data object with:
  - `id` (string): Tile ID
  - `title` (string): Panel title
  - `value` (string, optional): Main value to display
  - `icon` (string, optional): Lucide icon name (default: 'info')
  - `color` (string, optional): Color theme (default: '#0066cc')

### Optional Parameters

- `insight` (object): Insight data with `insight` text property
- `lingerTime` (number): Time in milliseconds before auto-dismiss (default: 8000)
- `position` (string): Panel position - 'top-right', 'top-left', 'bottom-right', 'bottom-left' (default: 'top-right')
- `width` (number): Panel width in pixels (default: 300)
- `height` (number): Panel height in pixels (default: auto)

## Removing Panels

```javascript
// Remove a specific panel
window.adaRemovePanel('panel1');

// Remove all panels
window.adaRemoveAllPanels();

// Using app instance
app.removeAdaFloatingPanel('panel1');
app.removeAllAdaFloatingPanels();
```

## Integration Points

### Transcript Callbacks

Panels are automatically triggered from transcript callbacks in:
- `grokVoiceService.onTranscriptCallback` - For WebSocket-based voice
- `grokVoiceService.onTranscript` - For Socket.io-based voice

### Agent Response Handler

Panels are parsed from agent responses in:
- `sendAgentMessageSilent` - Automatically scans response text for panel markers

## Styling

Panels use the same styling as dashboard tiles, ensuring visual consistency. Custom styles are in `css/ada-floating-panels.css`:

- `.ada-floating-panel` - Main panel container
- `.ada-floating-panel-close` - Close button
- `.ada-panel-visible` - Visible state (fade-in animation)
- `.ada-panel-dismissing` - Dismissing state (fade-out animation)

## Technical Details

### Files

- `js/ada-floating-panels.js` - Main floating panel manager service
- `css/ada-floating-panels.css` - Panel styles
- Integrated into `js/app.js` - Transcript callbacks and agent response handler
- Loaded in `public/index.html` - CSS and JS files included

### Architecture

1. **AdaFloatingPanels Class**: Singleton service managing all floating panels
2. **Panel Container**: Fixed-position container for all panels
3. **Transcript Parser**: Parses transcript text for panel markers
4. **Tile Renderer**: Uses app's `renderDashboardTile` method for consistency
5. **Auto-Dismiss Timer**: Configurable timer for automatic panel removal

### Panel Lifecycle

1. **Creation**: Panel created from tile data
2. **Positioning**: Positioned based on `position` parameter
3. **Rendering**: Tile content rendered using dashboard tile renderer
4. **Display**: Fade-in animation (300ms)
5. **Linger**: Panel remains visible for `lingerTime` milliseconds
6. **Dismiss**: Fade-out animation (300ms) then removal

## Best Practices

1. **Use Descriptive IDs**: Use meaningful panel IDs that match the content
2. **Keep Titles Short**: Panel titles should be concise (fits in header)
3. **Reasonable Linger Time**: 5-10 seconds is usually sufficient
4. **Position Strategically**: Use `top-right` for primary info, `top-left` for secondary
5. **Limit Panel Count**: Don't show more than 2-3 panels simultaneously
6. **Clear Markers**: Use clear transcript markers that ADA can easily include

## Examples

### Example 1: Valuation Panel

```javascript
window.adaShowPanel({
    id: 'total-valuation',
    tile: {
        id: 'valuation',
        title: 'Total Enterprise Value',
        value: '$450B',
        icon: 'zap',
        color: '#0066cc'
    },
    insight: {
        insight: 'Based on current model inputs and assumptions.'
    },
    lingerTime: 8000,
    position: 'top-right'
});
```

### Example 2: Starlink Panel

```javascript
window.adaShowPanel({
    id: 'starlink-revenue',
    tile: {
        id: 'starlink',
        title: 'Starlink Revenue',
        value: '$300B',
        subtitle: '67% of total',
        icon: 'globe',
        color: '#10b981'
    },
    lingerTime: 10000,
    position: 'top-left',
    width: 350
});
```

### Example 3: Transcript Marker

```
The total enterprise value is $450 billion. [PANEL:valuation:Total Enterprise Value:$450B] 
This represents a significant increase from our previous estimates.
```

## Troubleshooting

### Panels Not Showing

1. Check browser console for errors
2. Verify `window.adaFloatingPanels` is initialized
3. Check that CSS file is loaded
4. Verify transcript markers are correctly formatted

### Panels Not Dismissing

1. Check `lingerTime` value (should be in milliseconds)
2. Verify timer is not being cleared prematurely
3. Check for JavaScript errors in console

### Styling Issues

1. Verify `ada-floating-panels.css` is loaded
2. Check CSS specificity conflicts
3. Verify tile renderer is working correctly

## Future Enhancements

Potential future improvements:
- Panel drag-and-drop repositioning
- Panel persistence across sessions
- Panel templates for common content types
- Panel animations (slide-in, bounce, etc.)
- Panel grouping and stacking
- Panel interaction (click to expand, etc.)


