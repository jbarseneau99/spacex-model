/**
 * ClickSensor - Modular handler for click input detection
 * Detects and processes clicks on UI elements, charts, images, etc.
 */

class ClickSensor {
    constructor() {
        this.clickHandlers = new Map();
        this.enabled = true;
    }

    /**
     * Initialize click sensor
     */
    initialize() {
        if (!this.enabled) {
            return;
        }

        // Set up global click listener
        document.addEventListener('click', (event) => {
            this.handleClick(event);
        }, true); // Use capture phase to catch all clicks

        console.log('[ClickSensor] ✅ Initialized');
    }

    /**
     * Handle click event
     */
    handleClick(event) {
        if (!this.enabled) {
            return;
        }

        // Skip if this click is already being handled by another system
        // Check if event has been marked as handled (prevents duplicate processing)
        if (event._adaHandled) {
            return;
        }

        // CRITICAL: Skip clicks within Ada's own window
        // Ada should not provide commentary on clicks within her window (except for links she provides)
        const target = event.target;
        const adaWindow = document.getElementById('aiAgentWindow');
        if (adaWindow && adaWindow.contains(target)) {
            // Allow clicks on "Learn more" links and other links Ada provides
            const isAdaLink = target.closest('.learn-more-link') || 
                             target.closest('.agent-commentary-link') ||
                             target.closest('a[href]') ||
                             target.tagName === 'A';
            if (!isAdaLink) {
                console.log('[ClickSensor] ⏭️ Skipping click within Ada window (no commentary on Ada window clicks, except links)');
                return;
            }
            // If it's a link, allow it to proceed (links have their own handlers)
            console.log('[ClickSensor] ✅ Allowing click on Ada-provided link');
        }

        const clickContext = this.extractClickContext(event);
        
        // Skip if no meaningful context
        if (!clickContext.isRelevant) {
            return;
        }

        // Skip chart clicks - they're handled by AgentIntegrationLayer
        if (clickContext.category === 'chart') {
            console.log('[ClickSensor] ⏭️ Skipping chart click (handled by AgentIntegrationLayer)');
            return;
        }

        console.log('[ClickSensor] 🖱️ Click detected:', clickContext);

        // Mark event as handled to prevent duplicate processing
        event._adaHandled = true;

        // Emit click event for handlers
        this.emitClickEvent(clickContext);
    }

    /**
     * Extract context from click event
     */
    extractClickContext(event) {
        const target = event.target;
        
        // CRITICAL: Skip chart clicks - they're handled by AgentIntegrationLayer.generateChartClickResponse()
        // Chart.js uses canvas elements, so check if click is on a canvas
        if (target.tagName === 'CANVAS' || target.closest('canvas')) {
            // This is a chart click - skip to avoid duplicate responses
            console.log('[ClickSensor] ⏭️ Skipping chart canvas click (handled by AgentIntegrationLayer)');
            return {
                type: 'click',
                timestamp: Date.now(),
                element: target,
                isRelevant: false, // Mark as not relevant to skip processing
                data: {}
            };
        }
        
        const context = {
            type: 'click',
            timestamp: Date.now(),
            element: target,
            tagName: target.tagName,
            id: target.id,
            className: target.className,
            coordinates: {
                x: event.clientX,
                y: event.clientY,
                pageX: event.pageX,
                pageY: event.pageY
            },
            isRelevant: false,
            data: {}
        };

        // Check for chart clicks (but we already skipped canvas above)
        const chartContext = this.extractChartContext(target, event);
        if (chartContext) {
            // Chart clicks are handled by AgentIntegrationLayer - skip to avoid duplicates
            console.log('[ClickSensor] ⏭️ Skipping chart click (handled by AgentIntegrationLayer)');
            context.isRelevant = false; // Mark as not relevant
            return context;
        }

        // Check for UI element clicks
        const uiContext = this.extractUIContext(target, event);
        if (uiContext) {
            context.isRelevant = true;
            context.data = uiContext;
            context.category = 'ui';
            return context;
        }

        // Check for image clicks
        const imageContext = this.extractImageContext(target, event);
        if (imageContext) {
            context.isRelevant = true;
            context.data = imageContext;
            context.category = 'image';
            return context;
        }

        // Check for text selection clicks
        const textContext = this.extractTextContext(target, event);
        if (textContext) {
            context.isRelevant = true;
            context.data = textContext;
            context.category = 'text';
            return context;
        }

        return context;
    }

    /**
     * Extract chart click context
     * 
     * IMPORTANT: Chart clicks are handled by AgentIntegrationLayer.generateChartClickResponse()
     * This sensor should NOT process chart clicks to avoid duplicate responses.
     * Chart clicks are detected and skipped here.
     */
    extractChartContext(element, event) {
        // Check if this is a Chart.js canvas click (charts are handled by old system)
        const canvas = element.closest('canvas');
        if (canvas && (canvas.id?.includes('Chart') || canvas.closest('[data-chart-id]'))) {
            // Chart clicks are handled by AgentIntegrationLayer - skip to avoid duplicates
            console.log('[ClickSensor] ⏭️ Skipping chart click (handled by AgentIntegrationLayer)');
            return null; // Return null to skip processing
        }
        
        // Check for chart data attributes
        const chartId = element.closest('[data-chart-id]')?.getAttribute('data-chart-id');
        const chartName = element.closest('[data-chart-name]')?.getAttribute('data-chart-name');
        const dataLabel = element.getAttribute('data-label') || element.textContent?.trim();
        const dataValue = element.getAttribute('data-value');

        if (chartId || chartName) {
            // Chart clicks are handled by AgentIntegrationLayer - skip to avoid duplicates
            console.log('[ClickSensor] ⏭️ Skipping chart click (handled by AgentIntegrationLayer)');
            return null; // Return null to skip processing
        }

        // Check for stock ticker clicks (these are OK to process)
        const ticker = element.getAttribute('data-ticker') || 
                      element.closest('[data-ticker]')?.getAttribute('data-ticker');
        if (ticker) {
            return {
                ticker,
                type: 'stock',
                element
            };
        }

        return null;
    }

    /**
     * Extract UI element context
     */
    extractUIContext(element, event) {
        // Check for buttons, links, tiles
        if (element.tagName === 'BUTTON' || 
            element.tagName === 'A' || 
            element.classList.contains('tile') ||
            element.classList.contains('card')) {
            return {
                type: element.tagName.toLowerCase(),
                text: element.textContent?.trim(),
                href: element.href,
                action: element.getAttribute('data-action'),
                element
            };
        }

        return null;
    }

    /**
     * Extract image click context
     */
    extractImageContext(element, event) {
        if (element.tagName === 'IMG' || element.querySelector('img')) {
            const img = element.tagName === 'IMG' ? element : element.querySelector('img');
            const rect = img.getBoundingClientRect();
            
            return {
                src: img.src,
                alt: img.alt,
                coordinates: {
                    x: event.clientX - rect.left,
                    y: event.clientY - rect.top,
                    relativeX: (event.clientX - rect.left) / rect.width,
                    relativeY: (event.clientY - rect.top) / rect.height
                },
                dimensions: {
                    width: rect.width,
                    height: rect.height
                },
                element: img
            };
        }

        return null;
    }

    /**
     * Extract text selection context
     */
    extractTextContext(element, event) {
        const selection = window.getSelection();
        const selectedText = selection.toString().trim();

        if (selectedText.length > 0) {
            return {
                text: selectedText,
                range: selection.rangeCount > 0 ? selection.getRangeAt(0) : null,
                element
            };
        }

        return null;
    }

    /**
     * Emit click event to registered handlers
     */
    emitClickEvent(context) {
        // Dispatch custom event
        const clickEvent = new CustomEvent('ada:click', {
            detail: context,
            bubbles: true
        });
        document.dispatchEvent(clickEvent);
    }

    /**
     * Register click handler
     */
    on(type, handler) {
        if (!this.clickHandlers.has(type)) {
            this.clickHandlers.set(type, []);
        }
        this.clickHandlers.get(type).push(handler);
    }

    /**
     * Enable/disable click sensor
     */
    setEnabled(enabled) {
        this.enabled = enabled;
    }
}

// Export for Node.js or browser
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ClickSensor;
} else {
    window.ClickSensor = ClickSensor;
}

