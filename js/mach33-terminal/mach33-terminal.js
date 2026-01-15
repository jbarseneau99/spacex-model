/**
 * Mach33 Terminal Module
 * Self-contained terminal module that can be loaded dynamically
 */
class Mach33Terminal {
    constructor(appInstance) {
        this.app = appInstance; // Reference to main app instance
        this.terminalDateTimeInterval = null;
        this.initialized = false;
    }

    /**
     * Initialize the terminal - loads HTML, CSS, and sets up event handlers
     */
    async init() {
        if (this.initialized) return;
        
        // Load CSS
        this.loadCSS();
        
        // Load HTML into the content area
        await this.loadHTML();
        
        // Setup event handlers
        this.setupEventHandlers();
        
        // Initialize date/time
        this.updateTerminalDateTime();
        
        this.initialized = true;
        console.log('✅ Mach33 Terminal initialized');
    }

    /**
     * Load CSS file
     */
    loadCSS() {
        // Check if CSS is already loaded
        const existingLink = document.querySelector('link[href*="mach33-terminal.css"]');
        if (existingLink) return;

        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = '/js/mach33-terminal/mach33-terminal.css';
        document.head.appendChild(link);
    }

    /**
     * Load HTML file and inject into content area
     */
    async loadHTML() {
        const contentArea = document.querySelector('.content-area');
        if (!contentArea) {
            console.error('Content area not found');
            return;
        }

        // Check if terminal view already exists
        let terminalView = document.getElementById('mach33-terminal');
        if (terminalView) {
            console.log('Terminal view already exists');
            return;
        }

        try {
            const response = await fetch('/js/mach33-terminal/mach33-terminal.html');
            const html = await response.text();
            
            // Create a temporary container to parse HTML
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = html;
            
            // Get the terminal view element
            const terminalElement = tempDiv.querySelector('#mach33-terminal');
            if (terminalElement) {
                contentArea.appendChild(terminalElement);
                
                // Initialize Lucide icons
                if (window.lucide) {
                    window.lucide.createIcons();
                }
            }
        } catch (error) {
            console.error('Error loading terminal HTML:', error);
        }
    }

    /**
     * Setup event handlers for terminal controls
     */
    setupEventHandlers() {
        // Refresh Terminal Button
        const refreshTerminalBtn = document.getElementById('refreshTerminalBtn');
        const refreshTerminalIcon = document.getElementById('refreshTerminalIcon');
        if (refreshTerminalBtn) {
            refreshTerminalBtn.addEventListener('click', () => {
                if (refreshTerminalIcon) {
                    refreshTerminalIcon.style.transform = 'rotate(360deg)';
                    setTimeout(() => {
                        refreshTerminalIcon.style.transform = 'rotate(0deg)';
                    }, 300);
                }
                
                // Refresh dashboard if data exists
                if (this.app.currentData) {
                    const inputs = this.app.getInputs();
                    this.app.generateDashboardLayout(this.app.currentData, inputs).catch(err => {
                        console.error('Error refreshing terminal:', err);
                    });
                }
            });
        }

        // Bloomberg Dense Mode Toggle
        const denseToggle = document.getElementById('bloombergDenseToggleTerminal');
        if (denseToggle) {
            denseToggle.addEventListener('change', (e) => {
                const gridContainer = document.getElementById('dashboardGrid');
                if (gridContainer) {
                    if (e.target.checked) {
                        gridContainer.classList.add('bloomberg-dense');
                    } else {
                        gridContainer.classList.remove('bloomberg-dense');
                    }
                }
            });
        }

        // Model Search (placeholder for future functionality)
        const modelSearch = document.getElementById('terminalModelSearch');
        if (modelSearch) {
            // Future: Add search functionality
            modelSearch.addEventListener('focus', () => {
                console.log('Model search focused');
            });
        }

        // Open Terminal in New Window Button
        const openWindowBtn = document.getElementById('openTerminalWindowBtn');
        if (openWindowBtn) {
            openWindowBtn.addEventListener('click', () => {
                this.openTerminalInNewWindow();
            });
        }
    }

    /**
     * Open terminal in its own separate window
     */
    openTerminalInNewWindow() {
        // Create a new window
        const terminalWindow = window.open(
            '',
            'Mach33Terminal',
            'width=1600,height=1000,menubar=no,toolbar=no,location=no,status=no,resizable=yes,scrollbars=yes'
        );

        if (!terminalWindow) {
            alert('Please allow popups for this site to open the terminal in a new window.');
            return;
        }

        // Get current terminal HTML
        const terminalView = document.getElementById('mach33-terminal');
        if (!terminalView) {
            console.error('Terminal view not found');
            return;
        }

        // Clone the terminal HTML
        const terminalClone = terminalView.cloneNode(true);
        
        // Get current dashboard data to pass to new window
        const currentData = this.app.currentData;
        const currentInputs = this.app.getInputs();
        const currentModelName = this.app.currentModelName || 'Current Model';
        
        // Create a complete HTML document for the new window
        const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Mach33 Terminal - ${currentModelName}</title>
    <link rel="stylesheet" href="/css/main.css">
    <link rel="stylesheet" href="/js/mach33-terminal/mach33-terminal.css">
    <script src="https://unpkg.com/lucide@latest"></script>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        body {
            margin: 0;
            padding: 0;
            overflow: hidden;
            background: var(--background);
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
        }
        #mach33-terminal {
            height: 100vh;
            width: 100vw;
            display: flex;
            flex-direction: column;
        }
        #mach33-terminal .section {
            flex: 1;
            display: flex;
            flex-direction: column;
            min-height: 0;
        }
    </style>
</head>
<body>
    ${terminalClone.outerHTML}
    <script>
        // Store reference to parent window's app instance
        const parentApp = window.opener && window.opener.app ? window.opener.app : null;
        
        // Initialize Lucide icons
        if (window.lucide) {
            window.lucide.createIcons();
        }

        // Setup date/time updates
        let terminalDateTimeInterval = null;
        function updateTerminalDateTime() {
            const dateTimeElement = document.getElementById('terminalDateTime');
            if (!dateTimeElement) return;
            
            const now = new Date();
            const options = { 
                month: 'short', 
                day: 'numeric', 
                hour: '2-digit', 
                minute: '2-digit',
                hour12: true
            };
            const formatted = now.toLocaleString('en-US', options);
            dateTimeElement.textContent = formatted;
        }

        updateTerminalDateTime();
        terminalDateTimeInterval = setInterval(updateTerminalDateTime, 1000);

        // Function to refresh dashboard from parent window
        async function refreshDashboard() {
            const gridContainer = document.getElementById('dashboardGrid');
            if (!gridContainer) return;
            
            if (parentApp && parentApp.currentData) {
                gridContainer.innerHTML = '<div style="grid-column: 1 / -1; display: flex; align-items: center; justify-content: center; color: var(--text-secondary); padding: var(--spacing-xl);"><div style="text-align: center;"><i data-lucide="loader" class="spinning" style="width: 32px; height: 32px; margin: 0 auto 16px; display: block;"></i><p>Refreshing dashboard...</p></div></div>';
                if (window.lucide) window.lucide.createIcons();
                
                try {
                    const inputs = parentApp.getInputs();
                    await parentApp.generateDashboardLayout(parentApp.currentData, inputs);
                    
                    // Copy the updated grid content from parent window
                    const parentGrid = window.opener.document.getElementById('dashboardGrid');
                    if (parentGrid) {
                        gridContainer.innerHTML = parentGrid.innerHTML;
                        if (window.lucide) window.lucide.createIcons();
                    }
                } catch (error) {
                    console.error('Error refreshing dashboard:', error);
                    gridContainer.innerHTML = '<div style="grid-column: 1 / -1; display: flex; align-items: center; justify-content: center; color: var(--error-color); padding: var(--spacing-xl);"><p>Error refreshing dashboard. Please refresh the main window.</p></div>';
                }
            } else {
                console.warn('Cannot refresh: Parent app not available');
            }
        }

        // Setup refresh button
        const refreshBtn = document.getElementById('refreshTerminalBtn');
        const refreshIcon = document.getElementById('refreshTerminalIcon');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => {
                if (refreshIcon) {
                    refreshIcon.style.transform = 'rotate(360deg)';
                    setTimeout(() => {
                        refreshIcon.style.transform = 'rotate(0deg)';
                    }, 300);
                }
                refreshDashboard();
            });
        }

        // Setup dense mode toggle
        const denseToggle = document.getElementById('bloombergDenseToggleTerminal');
        if (denseToggle) {
            denseToggle.addEventListener('change', (e) => {
                const gridContainer = document.getElementById('dashboardGrid');
                if (gridContainer) {
                    if (e.target.checked) {
                        gridContainer.classList.add('bloomberg-dense');
                    } else {
                        gridContainer.classList.remove('bloomberg-dense');
                    }
                }
            });
        }

        // Load dashboard data from parent window on initial load
        if (parentApp && parentApp.currentData) {
            refreshDashboard();
        } else {
            // Show message if parent app not available
            const gridContainer = document.getElementById('dashboardGrid');
            if (gridContainer) {
                gridContainer.innerHTML = '<div style="grid-column: 1 / -1; display: flex; align-items: center; justify-content: center; color: var(--text-secondary); padding: var(--spacing-xl);"><div style="text-align: center;"><p>Loading dashboard from main window...</p><p style="font-size: 11px; margin-top: 8px; opacity: 0.7;">If this message persists, please refresh the main window first.</p></div></div>';
            }
        }

        // Listen for messages from parent window to refresh
        window.addEventListener('message', (event) => {
            if (event.data && event.data.type === 'terminal-refresh') {
                refreshDashboard();
            }
        });

        // Cleanup on window close
        window.addEventListener('beforeunload', () => {
            if (terminalDateTimeInterval) {
                clearInterval(terminalDateTimeInterval);
            }
        });
    </script>
</body>
</html>
        `;

        // Write content to new window
        terminalWindow.document.write(htmlContent);
        terminalWindow.document.close();

        // Focus the new window
        terminalWindow.focus();
        
        console.log('✅ Terminal opened in new window');
    }

    /**
     * Update terminal date/time display
     */
    updateTerminalDateTime() {
        const dateTimeElement = document.getElementById('terminalDateTime');
        if (!dateTimeElement) return;
        
        const now = new Date();
        const options = { 
            month: 'short', 
            day: 'numeric', 
            hour: '2-digit', 
            minute: '2-digit',
            hour12: true
        };
        const formatted = now.toLocaleString('en-US', options);
        dateTimeElement.textContent = formatted;
    }

    /**
     * Start date/time update interval
     */
    startDateTimeInterval() {
        if (this.terminalDateTimeInterval) return;
        
        this.updateTerminalDateTime();
        this.terminalDateTimeInterval = setInterval(() => {
            this.updateTerminalDateTime();
        }, 1000);
    }

    /**
     * Stop date/time update interval
     */
    stopDateTimeInterval() {
        if (this.terminalDateTimeInterval) {
            clearInterval(this.terminalDateTimeInterval);
            this.terminalDateTimeInterval = null;
        }
    }

    /**
     * Cleanup when terminal view is closed
     */
    cleanup() {
        this.stopDateTimeInterval();
    }
}

// Export for use in main app
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Mach33Terminal;
}

