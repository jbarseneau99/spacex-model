# Mach33 Terminal Module

A self-contained, modular terminal component for the SpaceX Valuation Platform.

## Structure

```
js/mach33-terminal/
├── mach33-terminal.html    # Terminal HTML structure
├── mach33-terminal.css      # Terminal-specific styles
├── mach33-terminal.js       # Terminal JavaScript logic
└── README.md               # This file
```

## How It Works

The Mach33 Terminal is loaded dynamically when the user switches to the "Mach33 Terminal" view:

1. **HTML Loading**: The terminal HTML is fetched and injected into the content area
2. **CSS Loading**: Terminal-specific CSS is loaded into the document head
3. **JS Initialization**: The `Mach33Terminal` class is instantiated and initialized
4. **Event Handlers**: Terminal-specific event handlers are set up (refresh, dense mode toggle, etc.)

## Integration

The main app (`app.js`) calls `initializeMach33Terminal()` when switching to the terminal view:

```javascript
if (viewName === 'mach33-terminal') {
    if (!this.mach33Terminal) {
        this.initializeMach33Terminal();
    } else {
        this.mach33Terminal.startDateTimeInterval();
    }
}
```

## Features

- **Dynamic Loading**: HTML, CSS, and JS are loaded on-demand
- **Self-Contained**: All terminal-specific code is in this folder
- **Main App Integration**: Accesses main app instance for dashboard functions
- **Date/Time Display**: Updates every second
- **Bloomberg Dense Mode**: Toggle for compact display
- **Refresh Button**: Reloads dashboard layout

## Dependencies

- Main app instance (`app.js`) - for `generateDashboardLayout()` and other functions
- Lucide icons - for UI icons
- CSS variables - uses app's CSS variables for theming

## Files

### mach33-terminal.html
Contains the terminal view HTML structure:
- Terminal header with title, search box, date/time, controls
- 4x4 dashboard grid container

### mach33-terminal.css
Terminal-specific styles:
- Dashboard grid layout
- Tile styling
- Bloomberg dense mode styles
- Toggle switch styles

### mach33-terminal.js
Terminal JavaScript logic:
- `Mach33Terminal` class
- HTML/CSS loading
- Event handler setup
- Date/time updates
- Integration with main app






