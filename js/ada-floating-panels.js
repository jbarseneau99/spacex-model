/**
 * ADA Floating Panels Manager
 * Displays floating tile panels during ADA's verbal responses
 * Panels can be triggered by ADA via special markers in transcript or API calls
 */

class AdaFloatingPanels {
    constructor() {
        this.activePanels = new Map(); // Map of panelId -> panel data
        this.panelContainer = null;
        this.defaultLingerTime = 8000; // 8 seconds default linger time
        this.panelZIndex = 10000; // High z-index to appear above everything
        this.draggedPanel = null; // Currently dragged panel
        this.dragOffset = { x: 0, y: 0 }; // Drag offset
        this.init();
    }

    /**
     * Initialize the floating panel container
     */
    init() {
        // Create container for floating panels
        this.panelContainer = document.createElement('div');
        this.panelContainer.id = 'ada-floating-panels-container';
        this.panelContainer.className = 'ada-floating-panels-container';
        document.body.appendChild(this.panelContainer);
    }

    /**
     * Show a floating panel with tile content
     * @param {Object} panelData - Panel configuration
     * @param {string} panelData.id - Unique panel ID
     * @param {Object} panelData.tile - Tile data (same format as dashboard tiles)
     * @param {Object} panelData.insight - Optional insight data for the tile
     * @param {number} panelData.lingerTime - Optional linger time in ms (default: 8000)
     * @param {string} panelData.position - Optional position: 'top-right', 'top-left', 'bottom-right', 'bottom-left' (default: 'top-right')
     * @param {number} panelData.width - Optional width in px (default: 300)
     * @param {number} panelData.height - Optional height in px (default: auto)
     */
    showPanel(panelData) {
        try {
            const {
                id,
                tile,
                insight = null,
                lingerTime = this.defaultLingerTime,
                position = 'top-right',
                width = 300,
                height = null
            } = panelData;

            if (!id || !tile) {
                console.error('❌ AdaFloatingPanels: Missing required panel data (id or tile)', { id, tile });
                return;
            }
            
            console.log('🎭 AdaFloatingPanels.showPanel called:', {
                id,
                tileTitle: tile.title,
                hasInsight: !!insight,
                lingerTime,
                position
            });

            // Remove existing panel with same ID if present
            this.removePanel(id);

            // Create panel element
            const panel = document.createElement('div');
            panel.className = 'ada-floating-panel';
            panel.dataset.panelId = id;
            
            // Set size - use provided width/height or CSS defaults (1x1 tile size)
            if (width) {
                panel.style.width = `${width}px`;
            }
            if (height) {
                panel.style.height = `${height}px`;
            }
            // If no size specified, CSS will use 1x1 tile size (25vw x 25vh)

            // Render tile content using the same renderer as dashboard tiles
            // We'll need access to the app instance to use renderDashboardTile
            const app = window.app || window;
            let tileHTML = '';
            
            if (app && typeof app.renderDashboardTile === 'function') {
                // Use the app's tile renderer
                tileHTML = app.renderDashboardTile(tile, insight, false);
            } else {
                // Fallback: simple tile rendering
                tileHTML = this.renderSimpleTile(tile, insight);
            }

            panel.innerHTML = tileHTML;

            // Make panel draggable (grabbable)
            this.makePanelDraggable(panel);

            // Add header buttons (pin and close)
            const headerButtons = document.createElement('div');
            headerButtons.className = 'ada-floating-panel-header-buttons';
            
            // Pin button (unpinned by default)
            const pinBtn = document.createElement('button');
            pinBtn.className = 'ada-floating-panel-pin';
            pinBtn.dataset.pinned = 'false';
            pinBtn.innerHTML = '<i data-lucide="pin-off"></i>';
            pinBtn.title = 'Pin to dashboard';
            pinBtn.onclick = (e) => {
                e.stopPropagation();
                const isPinned = pinBtn.dataset.pinned === 'true';
                if (!isPinned) {
                    // Pin to dashboard
                    this.pinPanelToDashboard(id, tile, insight);
                    pinBtn.dataset.pinned = 'true';
                    pinBtn.innerHTML = '<i data-lucide="pin"></i>';
                    pinBtn.title = 'Unpin from dashboard';
                    pinBtn.classList.add('pinned');
                } else {
                    // Unpin from dashboard
                    this.unpinPanelFromDashboard(id);
                    pinBtn.dataset.pinned = 'false';
                    pinBtn.innerHTML = '<i data-lucide="pin-off"></i>';
                    pinBtn.title = 'Pin to dashboard';
                    pinBtn.classList.remove('pinned');
                }
                if (window.lucide) window.lucide.createIcons();
            };
            headerButtons.appendChild(pinBtn);
            
            // Close button
            const closeBtn = document.createElement('button');
            closeBtn.className = 'ada-floating-panel-close';
            closeBtn.innerHTML = '<i data-lucide="x"></i>';
            closeBtn.title = 'Close panel';
            closeBtn.onclick = (e) => {
                e.stopPropagation();
                this.removePanel(id);
            };
            headerButtons.appendChild(closeBtn);
            
            panel.appendChild(headerButtons);

            // Add to container FIRST (so we can measure it)
            this.panelContainer.appendChild(panel);

            // Position the panel AFTER it's in DOM (smart positioning to avoid agent window)
            this.positionPanel(panel, position || 'center');

            // Initialize Lucide icons
            if (window.lucide) {
                window.lucide.createIcons();
            }

            // Store panel data
            this.activePanels.set(id, {
                element: panel,
                lingerTime,
                position,
                dismissTimer: null,
                tile: tile, // Store tile data for pinning
                insight: insight // Store insight data for pinning
            });

            // Auto-dismiss after linger time (unless pinned)
            const dismissTimer = setTimeout(() => {
                // Check if panel is pinned before dismissing
                const gridContainer = document.getElementById('dashboardGrid');
                const isPinned = gridContainer && gridContainer.querySelector(`[data-pinned-panel-id="${id}"]`);
                if (!isPinned) {
                    this.removePanel(id);
                } else {
                    console.log(`📌 Panel ${id} is pinned - skipping auto-dismiss`);
                }
            }, lingerTime);

            this.activePanels.get(id).dismissTimer = dismissTimer;

            // Animate in
            requestAnimationFrame(() => {
                panel.classList.add('ada-panel-visible');
            });

            console.log(`✅ ADA Floating Panel shown: ${id}`, { tile: tile.title, position, lingerTime });
        } catch (error) {
            console.error('❌ Error in AdaFloatingPanels.showPanel:', error);
            console.error('❌ Panel data:', panelData);
            console.error('❌ Error stack:', error.stack);
        }
    }

    /**
     * Position a panel centered but avoiding agent window
     */
    positionPanel(panel, position) {
        // Use requestAnimationFrame to ensure panel is in DOM before calculating position
        requestAnimationFrame(() => {
            // Get agent window position and size
            const agentWindow = document.getElementById('aiAgentWindow');
            let agentRect = null;
            
            if (agentWindow) {
                const computedStyle = window.getComputedStyle(agentWindow);
                const isVisible = agentWindow.style.display !== 'none' && 
                                 computedStyle.display !== 'none' &&
                                 agentWindow.style.display !== '';
                
                if (isVisible) {
                    agentRect = agentWindow.getBoundingClientRect();
                }
            }
            
            // Get panel dimensions (now that it's in DOM)
            const panelRect = panel.getBoundingClientRect();
            const panelWidth = panelRect.width || parseInt(panel.style.width) || 350;
            const panelHeight = panelRect.height || parseInt(panel.style.height) || 350;
            
            // Calculate center position
            const viewportWidth = window.innerWidth;
            const viewportHeight = window.innerHeight;
            const centerX = (viewportWidth - panelWidth) / 2;
            const centerY = (viewportHeight - panelHeight) / 2;
            
            // Default to center
            let left = centerX;
            let top = centerY;
            
            // Check for collision with agent window
            if (agentRect) {
                const agentLeft = agentRect.left;
                const agentRight = agentRect.right;
                const agentTop = agentRect.top;
                const agentBottom = agentRect.bottom;
                
                const panelRight = centerX + panelWidth;
                const panelBottom = centerY + panelHeight;
                
                // Check if panel overlaps with agent window (with padding)
                const padding = 40; // Minimum space between panel and agent
                const overlaps = !(panelRight + padding < agentLeft || 
                                  centerX - padding > agentRight || 
                                  panelBottom + padding < agentTop || 
                                  centerY - padding > agentBottom);
                
                if (overlaps) {
                    // Position panel to avoid agent window
                    // Try positioning to the left or right of agent window
                    const spaceLeft = agentLeft;
                    const spaceRight = viewportWidth - agentRight;
                    const spaceTop = agentTop;
                    const spaceBottom = viewportHeight - agentBottom;
                    
                    // Choose side with more space
                    if (spaceLeft >= spaceRight && spaceLeft >= panelWidth + padding) {
                        // Position to the left of agent
                        left = agentLeft - panelWidth - padding;
                        top = Math.max(20, Math.min(centerY, viewportHeight - panelHeight - 20));
                    } else if (spaceRight >= panelWidth + padding) {
                        // Position to the right of agent
                        left = agentRight + padding;
                        top = Math.max(20, Math.min(centerY, viewportHeight - panelHeight - 20));
                    } else if (spaceTop >= panelHeight + padding) {
                        // Position above agent
                        left = Math.max(20, Math.min(centerX, viewportWidth - panelWidth - 20));
                        top = agentTop - panelHeight - padding;
                    } else if (spaceBottom >= panelHeight + padding) {
                        // Position below agent
                        left = Math.max(20, Math.min(centerX, viewportWidth - panelWidth - 20));
                        top = agentBottom + padding;
                    } else {
                        // Fallback: position in corner with most space
                        const topLeftSpace = Math.min(spaceLeft, spaceTop);
                        const topRightSpace = Math.min(spaceRight, spaceTop);
                        const bottomLeftSpace = Math.min(spaceLeft, spaceBottom);
                        const bottomRightSpace = Math.min(spaceRight, spaceBottom);
                        
                        const maxSpace = Math.max(topLeftSpace, topRightSpace, bottomLeftSpace, bottomRightSpace);
                        
                        if (maxSpace === topLeftSpace) {
                            left = 20;
                            top = 20;
                        } else if (maxSpace === topRightSpace) {
                            left = viewportWidth - panelWidth - 20;
                            top = 20;
                        } else if (maxSpace === bottomLeftSpace) {
                            left = 20;
                            top = viewportHeight - panelHeight - 20;
                        } else {
                            left = viewportWidth - panelWidth - 20;
                            top = viewportHeight - panelHeight - 20;
                        }
                    }
                }
            }
            
            // Ensure panel stays within viewport bounds
            left = Math.max(20, Math.min(left, viewportWidth - panelWidth - 20));
            top = Math.max(20, Math.min(top, viewportHeight - panelHeight - 20));
            
            Object.assign(panel.style, {
                position: 'fixed',
                left: `${left}px`,
                top: `${top}px`,
                right: 'auto',
                bottom: 'auto',
                zIndex: this.panelZIndex++
            });
        });
    }

    /**
     * Remove a floating panel
     */
    removePanel(id) {
        const panelData = this.activePanels.get(id);
        if (!panelData) return;

        // Check if panel is pinned to dashboard
        const gridContainer = document.getElementById('dashboardGrid');
        if (gridContainer) {
            const pinnedTile = gridContainer.querySelector(`[data-pinned-panel-id="${id}"]`);
            if (pinnedTile) {
                // Panel is pinned - don't remove it, just hide the floating panel
                console.log(`📌 Panel ${id} is pinned to dashboard - keeping dashboard tile`);
            }
        }

        // Clear dismiss timer
        if (panelData.dismissTimer) {
            clearTimeout(panelData.dismissTimer);
        }

        // Animate out (slow fade)
        if (panelData.element) {
            panelData.element.classList.remove('ada-panel-visible');
            panelData.element.classList.add('ada-panel-dismissing');
            
            // Clean up drag listeners
            if (panelData.element._dragCleanup) {
                panelData.element._dragCleanup();
            }
            
            setTimeout(() => {
                if (panelData.element && panelData.element.parentNode) {
                    panelData.element.parentNode.removeChild(panelData.element);
                }
            }, 2000); // Match CSS transition time (2 seconds for slow fade)
        }

        this.activePanels.delete(id);
        console.log(`✅ ADA Floating Panel removed: ${id}`);
    }

    /**
     * Remove all floating panels
     */
    removeAllPanels() {
        const panelIds = Array.from(this.activePanels.keys());
        panelIds.forEach(id => this.removePanel(id));
    }

    /**
     * Pin panel to dashboard
     */
    pinPanelToDashboard(panelId, tile, insight) {
        try {
            console.log('📌 Pinning panel to dashboard:', panelId, { tile: tile.title });
            
            // Get dashboard grid container
            const gridContainer = document.getElementById('dashboardGrid');
            if (!gridContainer) {
                console.error('❌ Dashboard grid container not found');
                return;
            }
            
            // Get app instance
            const app = window.app || window;
            if (!app || typeof app.renderDashboardTile !== 'function') {
                console.error('❌ App instance or renderDashboardTile not available');
                return;
            }
            
            // Render tile using app's renderer
            const tileHTML = app.renderDashboardTile(tile, insight, false);
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = tileHTML.trim();
            const tileElement = tempDiv.firstElementChild;
            
            if (!tileElement) {
                console.error('❌ Failed to create tile element');
                return;
            }
            
            // Add pinned marker
            tileElement.dataset.pinnedPanelId = panelId;
            tileElement.dataset.isPinnedPanel = 'true';
            
            // Add unpin button to pinned tile
            const unpinBtn = document.createElement('button');
            unpinBtn.className = 'dashboard-tile-unpin';
            unpinBtn.innerHTML = '<i data-lucide="pin"></i>';
            unpinBtn.title = 'Unpin from dashboard';
            unpinBtn.onclick = (e) => {
                e.stopPropagation();
                this.unpinPanelFromDashboard(panelId);
                tileElement.remove();
                // Update pin button in floating panel if it still exists
                const panelData = this.activePanels.get(panelId);
                if (panelData && panelData.element) {
                    const pinBtn = panelData.element.querySelector('.ada-floating-panel-pin');
                    if (pinBtn) {
                        pinBtn.dataset.pinned = 'false';
                        pinBtn.innerHTML = '<i data-lucide="pin-off"></i>';
                        pinBtn.title = 'Pin to dashboard';
                        pinBtn.classList.remove('pinned');
                        if (window.lucide) window.lucide.createIcons();
                    }
                }
            };
            
            // Add unpin button to tile header
            const tileHeader = tileElement.querySelector('.tile-header');
            if (tileHeader) {
                tileHeader.style.position = 'relative';
                unpinBtn.style.position = 'absolute';
                unpinBtn.style.top = '4px';
                unpinBtn.style.right = '4px';
                tileHeader.appendChild(unpinBtn);
            } else {
                // If no header, add to top of tile
                tileElement.style.position = 'relative';
                unpinBtn.style.position = 'absolute';
                unpinBtn.style.top = '8px';
                unpinBtn.style.right = '8px';
                unpinBtn.style.zIndex = '10';
                tileElement.appendChild(unpinBtn);
            }
            
            // Find available grid position (try to fit in existing grid)
            const existingTiles = Array.from(gridContainer.querySelectorAll('.dashboard-tile'));
            const gridColumns = 4; // Dashboard uses 4 columns
            const gridRows = 4; // Dashboard uses 4 rows
            
            // Try to find an empty spot or add to end
            let gridColumn = '4 / 5'; // Default to right column
            let gridRow = '4 / 5'; // Default to bottom row
            
            // Simple placement: try to find empty space starting from bottom-right
            const usedPositions = new Set();
            existingTiles.forEach(existingTile => {
                const col = existingTile.style.gridColumn || '';
                const row = existingTile.style.gridRow || '';
                if (col && row) {
                    usedPositions.add(`${col}-${row}`);
                }
            });
            
            // Find first available 1x1 position (check bottom-right first, then work backwards)
            let found = false;
            for (let row = gridRows; row >= 1 && !found; row--) {
                for (let col = gridColumns; col >= 1 && !found; col--) {
                    const colStr = `${col} / ${col + 1}`;
                    const rowStr = `${row} / ${row + 1}`;
                    const pos = `${colStr}-${rowStr}`;
                    if (!usedPositions.has(pos)) {
                        gridColumn = colStr;
                        gridRow = rowStr;
                        found = true;
                    }
                }
            }
            
            // Set grid position
            tileElement.style.gridColumn = gridColumn;
            tileElement.style.gridRow = gridRow;
            
            // Add to grid
            gridContainer.appendChild(tileElement);
            
            // Initialize Lucide icons
            if (window.lucide) {
                window.lucide.createIcons();
            }
            
            // Render chart if insight has chart data
            if (insight && insight.chart && app.renderTileChart) {
                setTimeout(() => {
                    app.renderTileChart(panelId, insight.chart, tile.color);
                }, 100);
            }
            
            console.log('✅ Panel pinned to dashboard:', panelId, { gridColumn, gridRow });
        } catch (error) {
            console.error('❌ Error pinning panel to dashboard:', error);
            console.error('❌ Error stack:', error.stack);
        }
    }

    /**
     * Unpin panel from dashboard
     */
    unpinPanelFromDashboard(panelId) {
        try {
            console.log('📌 Unpinning panel from dashboard:', panelId);
            
            // Find pinned tile in dashboard
            const gridContainer = document.getElementById('dashboardGrid');
            if (!gridContainer) return;
            
            const pinnedTile = gridContainer.querySelector(`[data-pinned-panel-id="${panelId}"]`);
            if (pinnedTile) {
                pinnedTile.remove();
                console.log('✅ Panel unpinned from dashboard:', panelId);
                
                // If floating panel still exists, dissolve it
                const panelData = this.activePanels.get(panelId);
                if (panelData && panelData.element) {
                    console.log('🎭 Dissolving floating panel after unpin:', panelId);
                    setTimeout(() => {
                        this.removePanel(panelId);
                    }, 500); // Small delay then dissolve
                }
            }
        } catch (error) {
            console.error('❌ Error unpinning panel from dashboard:', error);
        }
    }

    /**
     * Make panel draggable (grabbable)
     */
    makePanelDraggable(panel) {
        let isDragging = false;
        let startX = 0;
        let startY = 0;
        let initialLeft = 0;
        let initialTop = 0;

        // Mouse events
        const handleMouseDown = (e) => {
            // Don't start drag if clicking on buttons or interactive elements
            if (e.target.closest('button') || 
                e.target.closest('a') || 
                e.target.closest('input') ||
                e.target.closest('.dashboard-tile')) {
                return;
            }

            isDragging = true;
            panel.classList.add('dragging');
            
            const rect = panel.getBoundingClientRect();
            startX = e.clientX;
            startY = e.clientY;
            initialLeft = rect.left;
            initialTop = rect.top;
            
            e.preventDefault();
        };

        const handleMouseMove = (e) => {
            if (!isDragging) return;
            
            const deltaX = e.clientX - startX;
            const deltaY = e.clientY - startY;
            
            const newLeft = initialLeft + deltaX;
            const newTop = initialTop + deltaY;
            
            // Keep panel within viewport bounds
            const viewportWidth = window.innerWidth;
            const viewportHeight = window.innerHeight;
            const panelWidth = panel.offsetWidth;
            const panelHeight = panel.offsetHeight;
            
            const boundedLeft = Math.max(0, Math.min(newLeft, viewportWidth - panelWidth));
            const boundedTop = Math.max(0, Math.min(newTop, viewportHeight - panelHeight));
            
            panel.style.left = `${boundedLeft}px`;
            panel.style.top = `${boundedTop}px`;
            panel.style.right = 'auto';
            panel.style.bottom = 'auto';
        };

        const handleMouseUp = () => {
            if (isDragging) {
                isDragging = false;
                panel.classList.remove('dragging');
            }
        };

        // Touch events for mobile
        const handleTouchStart = (e) => {
            if (e.target.closest('button') || 
                e.target.closest('a') || 
                e.target.closest('input') ||
                e.target.closest('.dashboard-tile')) {
                return;
            }

            isDragging = true;
            panel.classList.add('dragging');
            
            const touch = e.touches[0];
            const rect = panel.getBoundingClientRect();
            startX = touch.clientX;
            startY = touch.clientY;
            initialLeft = rect.left;
            initialTop = rect.top;
            
            e.preventDefault();
        };

        const handleTouchMove = (e) => {
            if (!isDragging) return;
            
            const touch = e.touches[0];
            const deltaX = touch.clientX - startX;
            const deltaY = touch.clientY - startY;
            
            const newLeft = initialLeft + deltaX;
            const newTop = initialTop + deltaY;
            
            // Keep panel within viewport bounds
            const viewportWidth = window.innerWidth;
            const viewportHeight = window.innerHeight;
            const panelWidth = panel.offsetWidth;
            const panelHeight = panel.offsetHeight;
            
            const boundedLeft = Math.max(0, Math.min(newLeft, viewportWidth - panelWidth));
            const boundedTop = Math.max(0, Math.min(newTop, viewportHeight - panelHeight));
            
            panel.style.left = `${boundedLeft}px`;
            panel.style.top = `${boundedTop}px`;
            panel.style.right = 'auto';
            panel.style.bottom = 'auto';
            
            e.preventDefault();
        };

        const handleTouchEnd = () => {
            if (isDragging) {
                isDragging = false;
                panel.classList.remove('dragging');
            }
        };

        // Add event listeners
        panel.addEventListener('mousedown', handleMouseDown);
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
        
        panel.addEventListener('touchstart', handleTouchStart, { passive: false });
        document.addEventListener('touchmove', handleTouchMove, { passive: false });
        document.addEventListener('touchend', handleTouchEnd);
        
        // Store cleanup function
        panel._dragCleanup = () => {
            panel.removeEventListener('mousedown', handleMouseDown);
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
            panel.removeEventListener('touchstart', handleTouchStart);
            document.removeEventListener('touchmove', handleTouchMove);
            document.removeEventListener('touchend', handleTouchEnd);
        };
    }

    /**
     * Simple tile renderer fallback
     */
    renderSimpleTile(tile, insight) {
        return `
            <div class="dashboard-tile" style="
                background: var(--surface);
                border: 1px solid var(--border-color);
                border-radius: var(--radius);
                padding: 8px;
                height: 100%;
            ">
                <div class="tile-header" style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
                    <div class="tile-icon-container" style="
                        width: 24px;
                        height: 24px;
                        background: ${tile.color || '#0066cc'}08;
                        border-radius: 4px;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                    ">
                        <i data-lucide="${tile.icon || 'circle'}" style="width: 16px; height: 16px; color: ${tile.color || '#0066cc'};"></i>
                    </div>
                    <div class="tile-title" style="font-size: 12px; color: var(--text-secondary); font-weight: 500; text-transform: uppercase;">
                        ${tile.title || 'Panel'}
                    </div>
                </div>
                <div class="tile-value" style="font-size: 18px; font-weight: 700; color: var(--text-primary); margin-bottom: 8px;">
                    ${tile.value || ''}
                </div>
                ${insight && insight.insight ? `
                    <div class="tile-insight" style="font-size: 12px; color: var(--text-secondary); line-height: 1.4;">
                        ${insight.insight}
                    </div>
                ` : ''}
            </div>
        `;
    }

    /**
     * Parse transcript for panel triggers
     * Looks for patterns like [PANEL:title:value] or [SHOW:title]
     */
    parseTranscriptForPanels(transcript) {
        // Pattern: [PANEL:id:title:value] or [SHOW:id:title]
        const panelPattern = /\[(?:PANEL|SHOW):([^:]+):([^:]+)(?::([^\]]+))?\]/g;
        const matches = [];
        let match;

        while ((match = panelPattern.exec(transcript)) !== null) {
            matches.push({
                id: match[1].trim(),
                title: match[2].trim(),
                value: match[3] ? match[3].trim() : '',
                fullMatch: match[0]
            });
        }

        return matches;
    }

    /**
     * Show panel from transcript marker
     */
    showPanelFromTranscript(transcript) {
        const panels = this.parseTranscriptForPanels(transcript);
        
        panels.forEach(panelInfo => {
            const tile = {
                id: panelInfo.id,
                title: panelInfo.title,
                value: panelInfo.value,
                icon: 'info',
                color: '#0066cc'
            };

            this.showPanel({
                id: panelInfo.id,
                tile,
                lingerTime: this.defaultLingerTime
            });
        });
    }
}

// Create singleton instance
window.adaFloatingPanels = window.adaFloatingPanels || new AdaFloatingPanels();

/**
 * Global API for showing floating panels
 * Can be called from anywhere: adaShowPanel({ id: 'panel1', tile: {...}, insight: {...} })
 */
window.adaShowPanel = function(panelData) {
    if (window.adaFloatingPanels) {
        window.adaFloatingPanels.showPanel(panelData);
    } else {
        console.error('AdaFloatingPanels not initialized');
    }
};

/**
 * Global API for removing floating panels
 */
window.adaRemovePanel = function(panelId) {
    if (window.adaFloatingPanels) {
        window.adaFloatingPanels.removePanel(panelId);
    }
};

/**
 * Global API for removing all floating panels
 */
window.adaRemoveAllPanels = function() {
    if (window.adaFloatingPanels) {
        window.adaFloatingPanels.removeAllPanels();
    }
};

