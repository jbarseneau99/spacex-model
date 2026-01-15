# Competitor Floating Panels Feature

## Overview

When a user selects a competitor stock (like Rocket Lab) from the competitors tile, ADA automatically displays a beautiful liquid glass floating panel showing company information. The panel appears during ADA's verbal commentary and dissolves after she finishes speaking.

## Features

- **Liquid Glass Effect**: Beautiful frosted glass styling with backdrop blur
- **Automatic Display**: Panel appears immediately when competitor is clicked
- **Company Information**: Shows market cap, EV/Revenue, P/E ratio, revenue growth, and more
- **Auto-Dissolve**: Panel automatically dissolves 2-3 seconds after voice commentary completes
- **Smart Icons**: Space companies (like Rocket Lab) get rocket icons with orange color
- **Responsive**: Works seamlessly in both free mode and fixed mode

## How It Works

### User Flow

1. User clicks on a competitor in the competitors tile (e.g., "Rocket Lab")
2. **Panel appears immediately** with liquid glass effect showing company info
3. ADA begins speaking about the company
4. Panel remains visible during entire voice response
5. **Panel dissolves** 2-3 seconds after ADA finishes speaking

### Technical Flow

1. **Click Handler** (`attachCompetitorClickHandlers`):
   - Extracts competitor data from clicked row
   - Calls `showCompetitorFloatingPanel()` immediately
   - Sends message to ADA via `sendAgentMessageSilent()`

2. **Panel Display** (`showCompetitorFloatingPanel`):
   - Formats market cap (B/T/M format)
   - Builds insight text with key metrics
   - Determines icon and color (rocket icon for space companies)
   - Creates tile and shows floating panel

3. **Voice Response** (`speakWithGrokVoice`):
   - ADA speaks about the company
   - Panel remains visible during speech

4. **Panel Dissolve** (`checkAudioComplete`):
   - Monitors when ADA finishes speaking
   - Waits 2 seconds after audio completes
   - Removes panel with fade-out animation

## Styling

### Liquid Glass Effect

The panels use a sophisticated liquid glass effect:

```css
background: rgba(26, 26, 26, 0.75);
backdrop-filter: blur(20px) saturate(180%);
border: 1px solid rgba(255, 255, 255, 0.1);
box-shadow: 
    0 8px 32px rgba(0, 0, 0, 0.4),
    inset 0 1px 0 rgba(255, 255, 255, 0.1);
```

### Visual Characteristics

- **Frosted Glass**: Backdrop blur creates depth
- **Semi-Transparent**: Allows background to show through subtly
- **Smooth Animations**: Fade-in and fade-out transitions
- **Enhanced Text**: White text with subtle shadows for readability
- **Hover Effects**: Slightly brighter on hover

## Panel Content

### Displayed Information

- **Company Name**: Full company name as title
- **Market Cap**: Formatted (e.g., "$2.5B", "$120.5B")
- **Ticker Symbol**: Shown as subtitle
- **Key Metrics**: EV/Revenue, P/E Ratio, EV/EBITDA, Revenue Growth

### Example Panel

```
┌─────────────────────────────┐
│ 🚀 Rocket Lab USA Inc.    × │
│                             │
│ $2.5B                       │
│ Ticker: RKLB               │
│                             │
│ EV/Revenue: 4.5x •          │
│ P/E Ratio: 35.0x •          │
│ Revenue Growth: 20%         │
└─────────────────────────────┘
```

## Configuration

### Panel Timing

- **Display**: Immediate on click
- **Linger Time**: 15 seconds for voice responses, 8 seconds for text-only
- **Dissolve Delay**: 2-3 seconds after voice completes

### Panel Position

- **Default**: Top-right corner
- **Width**: 350px
- **Height**: Auto (based on content)

## Code Integration

### Key Functions

1. **`showCompetitorFloatingPanel(competitorData, lingerTime)`**
   - Main function to display competitor panel
   - Located in `js/app.js`
   - Called from competitor click handler

2. **`attachCompetitorClickHandlers(tileElement, tile)`**
   - Attaches click handlers to competitor rows
   - Calls `showCompetitorFloatingPanel()` on click
   - Located in `js/app.js`

3. **`checkAudioComplete()`**
   - Monitors voice response completion
   - Triggers panel dissolve after audio finishes
   - Located in `speakWithGrokVoice()` function

### CSS Classes

- `.ada-floating-panel` - Main panel container with liquid glass
- `.ada-panel-visible` - Visible state (fade-in)
- `.ada-panel-dismissing` - Dismissing state (fade-out)
- `.ada-floating-panel-close` - Close button with glass effect

## Example: Rocket Lab

When user clicks "Rocket Lab" (RKLB):

1. **Panel appears** showing:
   - Title: "Rocket Lab USA Inc."
   - Value: "$2.5B" (market cap)
   - Subtitle: "Ticker: RKLB"
   - Metrics: EV/Revenue, P/E, Revenue Growth
   - Icon: 🚀 (rocket icon, orange color)

2. **ADA speaks**: "Rocket Lab is a leading small satellite launch provider..."

3. **Panel dissolves** 2 seconds after ADA finishes speaking

## Customization

### Changing Linger Time

```javascript
// In competitor click handler
const panelLingerTime = this.agentVoiceOutputEnabled ? 20000 : 10000; // 20s for voice, 10s for text
this.showCompetitorFloatingPanel(competitorData, panelLingerTime);
```

### Changing Panel Position

Modify `showCompetitorFloatingPanel()` to accept position parameter:

```javascript
this.showAdaFloatingPanel({
    id: panelId,
    tile: tile,
    insight: insight,
    lingerTime: lingerTime,
    position: 'top-left', // Change position
    width: 350
});
```

### Adding More Metrics

Extend the insight text in `showCompetitorFloatingPanel()`:

```javascript
if (competitorData.pegRatio && competitorData.pegRatio > 0) {
    insightParts.push(`PEG Ratio: ${competitorData.pegRatio.toFixed(1)}x`);
}
```

## Troubleshooting

### Panel Not Showing

1. Check browser console for errors
2. Verify competitor data is available
3. Check that `window.adaFloatingPanels` is initialized
4. Verify CSS file is loaded

### Panel Not Dissolving

1. Check `checkAudioComplete()` is being called
2. Verify `isSpeaking` flag is being cleared
3. Check audio queue is empty
4. Verify panel ID matches (case-sensitive)

### Styling Issues

1. Verify `backdrop-filter` is supported (Chrome, Safari, Edge)
2. Check CSS file is loaded after main.css
3. Verify liquid glass styles are applied
4. Check for CSS conflicts

## Browser Support

- **Chrome/Edge**: Full support (backdrop-filter)
- **Safari**: Full support (backdrop-filter)
- **Firefox**: Partial support (may need fallback)
- **Mobile**: Full support on iOS Safari, Chrome Android

## Future Enhancements

Potential improvements:
- Panel drag-and-drop repositioning
- Panel persistence option
- Multiple panels for comparison
- Interactive panel (click to expand)
- Panel templates for different company types
- Real-time data updates


