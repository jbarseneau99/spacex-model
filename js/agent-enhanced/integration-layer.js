/**
 * IntegrationLayer - Optional bridge between enhanced systems and existing agent
 * This layer ONLY activates if feature flags are enabled
 * Does NOT modify existing agent code
 */

class AgentIntegrationLayer {
    constructor() {
        this.initialized = false;
        this.enabled = false;
        this.appInstance = null;
        
        // Listen for feature flag changes
        window.addEventListener('featureFlagChanged', () => {
            this.checkAndInitialize();
        });
    }

    /**
     * Check if integration should be enabled and initialize
     */
    checkAndInitialize() {
        const flags = window.featureFlags;
        if (!flags) return;

        // Only enable if integration flag is ON
        const shouldEnable = flags.isIntegrationEnabled();
        
        if (shouldEnable && !this.initialized) {
            this.initialize();
        } else if (!shouldEnable && this.initialized) {
            this.deinitialize();
        }
    }

    /**
     * Initialize integration (only if flags enabled)
     */
    initialize() {
        if (this.initialized) return;

        const flags = window.featureFlags;
        if (!flags || !flags.isIntegrationEnabled()) {
            console.log('[IntegrationLayer] Integration disabled by feature flag');
            return;
        }

        console.log('[IntegrationLayer] Initializing integration...');
        
        // Wait for app instance
        this.waitForAppInstance().then(() => {
            this.setupIntegration();
            this.initialized = true;
            this.enabled = true;
            console.log('[IntegrationLayer] Integration initialized');
        });
    }

    /**
     * Wait for app instance to be available
     */
    waitForAppInstance() {
        return new Promise((resolve) => {
            if (window.app) {
                this.appInstance = window.app;
                resolve();
            } else {
                const checkInterval = setInterval(() => {
                    if (window.app) {
                        this.appInstance = window.app;
                        clearInterval(checkInterval);
                        resolve();
                    }
                }, 100);
            }
        });
    }

    /**
     * Setup integration hooks (non-invasive)
     */
    setupIntegration() {
        const app = this.appInstance;
        if (!app) return;

        // Setup selection context integration
        this.setupSelectionIntegration(app);
        
        // Setup session awareness integration
        this.setupSessionAwarenessIntegration(app);
        
        // Setup context builder integration
        this.setupContextBuilderIntegration(app);
    }

    /**
     * Setup selection context integration
     */
    setupSelectionIntegration(app) {
        const selectionManager = window.selectionContextManager;
        if (!selectionManager || !selectionManager.enabled) return;

        // Hook into existing handleElementSelection method (non-invasive enhancement)
        const originalHandleSelection = app.handleElementSelection?.bind(app);
        if (originalHandleSelection) {
            app.handleElementSelection = function(selectionInfo) {
                // ALWAYS track selections in enhanced system (regardless of agent window visibility)
                // This happens BEFORE the original handler which may skip if agent window not visible
                if (selectionInfo.type === 'text' && selectionInfo.text) {
                    const context = selectionInfo.context || {};
                    selectionManager.setTextSelection({
                        text: selectionInfo.text,
                        source: this.currentView || 'unknown',
                        elementType: context.elementTag || 'text',
                        elementId: context.elementId || null,
                        surroundingText: null, // Could be enhanced later
                        context: context
                    });
                    
                    if (window.featureFlags?.isEnabled('debugEnhancedAgent')) {
                        console.log('[IntegrationLayer] ✅ Enhanced text selection tracked:', selectionInfo.text.substring(0, 50));
                    }
                    
                    // Emit event if event manager is enabled
                    if (window.unifiedEventManager?.enabled) {
                        window.unifiedEventManager.emit(
                            window.unifiedEventManager.eventTypes.TEXT_SELECTION,
                            {
                                text: selectionInfo.text.substring(0, 100),
                                source: this.currentView
                            },
                            window.unifiedEventManager.priorities.HIGH
                        );
                    }
                } else if (selectionInfo.type === 'chart') {
                    // Enhance chart datapoint tracking - ALWAYS track, not just when agent visible
                    const chartInstance = this.charts?.[selectionInfo.chartId] || 
                                        (window.app?.charts?.[selectionInfo.chartId]);
                    
                    // Try to get more chart data if available
                    let previousValue = null;
                    let nextValue = null;
                    let datasetIndex = 0;
                    
                    if (chartInstance && chartInstance.data) {
                        const dataset = chartInstance.data.datasets?.[datasetIndex];
                        if (dataset && dataset.data) {
                            const index = selectionInfo.index;
                            previousValue = index > 0 ? dataset.data[index - 1] : null;
                            nextValue = index < dataset.data.length - 1 ? dataset.data[index + 1] : null;
                        }
                    }
                    
                    selectionManager.setDatapoint({
                        chartId: selectionInfo.chartId,
                        chartName: selectionInfo.chartName || 'Unknown Chart',
                        chartType: selectionInfo.elementType || 'unknown',
                        label: selectionInfo.label,
                        value: selectionInfo.value,
                        index: selectionInfo.index,
                        datasetIndex: datasetIndex,
                        seriesName: null,
                        xValue: selectionInfo.label,
                        yValue: selectionInfo.value,
                        previousValue: previousValue,
                        nextValue: nextValue,
                        view: this.currentView,
                        tab: this.getCurrentTabInfo?.()?.tab,
                        subTab: this.getCurrentTabInfo?.()?.subTab,
                        chartContext: {
                            elementType: selectionInfo.elementType
                        }
                    });
                    
                    if (window.featureFlags?.isEnabled('debugEnhancedAgent')) {
                        console.log('[IntegrationLayer] ✅ Enhanced chart datapoint tracked:', {
                            chart: selectionInfo.chartName,
                            label: selectionInfo.label,
                            value: selectionInfo.value,
                            index: selectionInfo.index
                        });
                    }
                    
                    // Also emit event if event manager is enabled
                    if (window.unifiedEventManager?.enabled) {
                        window.unifiedEventManager.emit(
                            window.unifiedEventManager.eventTypes.DATAPOINT_CLICK,
                            {
                                chartId: selectionInfo.chartId,
                                chartName: selectionInfo.chartName,
                                label: selectionInfo.label,
                                value: selectionInfo.value
                            },
                            window.unifiedEventManager.priorities.HIGH
                        );
                    }
                    
                    // Automatically generate agent response for chart clicks
                    // Ensure agent window is open and visible
                    this.ensureAgentWindowOpen();
                    
                    // Generate agent response with enhanced context
                    if (this.agentCommentaryEnabled !== false) {
                        this.generateChartClickResponse(selectionInfo);
                    }
                }
                
                // Call original handler AFTER tracking (preserves existing behavior)
                // Original handler may skip if agent window not visible, but we've already tracked it
                originalHandleSelection(selectionInfo);
            };
        } else {
            console.warn('[IntegrationLayer] handleElementSelection not found - selection integration may not work');
        }
        
        // Also hook directly into chart onClick handlers for charts that haven't been created yet
        // This ensures we catch chart clicks even if handleElementSelection isn't called
        this.setupDirectChartClickTracking(app);
    }

    /**
     * Setup session awareness integration
     */
    setupSessionAwarenessIntegration(app) {
        const sessionAwareness = window.agentSessionAwareness;
        if (!sessionAwareness || !sessionAwareness.enabled) return;

        // Hook into existing switchView
        const originalSwitchView = app.switchView?.bind(app);
        if (originalSwitchView) {
            app.switchView = async function(viewName) {
                const previousView = this.currentView;
                const tabInfo = this.getCurrentTabInfo?.() || {};
                
                // Call original
                await originalSwitchView(viewName);
                
                // Track enhanced navigation
                sessionAwareness.trackNavigation({
                    fromView: previousView,
                    fromTab: tabInfo.tab,
                    fromSubTab: tabInfo.subTab,
                    toView: viewName,
                    toTab: tabInfo.tab,
                    toSubTab: tabInfo.subTab,
                    trigger: 'user-click',
                    modelId: this.currentModelId,
                    modelName: this.currentModelName,
                    hasData: !!this.currentData
                });
            };
        }

        // Hook into existing sendAgentMessage
        const originalSendMessage = app.sendAgentMessage?.bind(app);
        if (originalSendMessage) {
            app.sendAgentMessage = async function(message) {
                // Track conversation
                sessionAwareness.trackConversation({
                    role: 'user',
                    message: message,
                    view: this.currentView,
                    tab: this.getCurrentTabInfo?.()?.tab,
                    subTab: this.getCurrentTabInfo?.()?.subTab,
                    hasActiveSelection: !!window.selectionContextManager?.activeTextSelection,
                    hasActiveDatapoint: !!window.selectionContextManager?.activeDatapoint
                });
                
                // Call original
                return await originalSendMessage(message);
            };
        }
    }

    /**
     * Setup context builder integration
     */
    setupContextBuilderIntegration(app) {
        const contextBuilder = window.contextBuilder;
        if (!contextBuilder || !contextBuilder.enabled) return;

        // Enhance agent chat endpoint calls by intercepting fetch
        const originalFetch = window.fetch;
        window.fetch = async function(url, options) {
            // Only enhance /api/agent/chat calls
            if (typeof url === 'string' && url.includes('/api/agent/chat') && options?.method === 'POST') {
                try {
                    // Parse existing request body
                    const existingBody = JSON.parse(options.body || '{}');
                    
                    // Build enhanced context
                    const enhancedContext = contextBuilder.buildContext({
                        tab: app.getCurrentTabInfo?.()?.tab,
                        subTab: app.getCurrentTabInfo?.()?.subTab,
                        includeData: false
                    });
                    
                    // Add enhanced context to request
                    existingBody.enhancedContext = enhancedContext;
                    existingBody.contextString = contextBuilder.buildContextString(enhancedContext);
                    
                    // Update request body
                    options.body = JSON.stringify(existingBody);
                    
                    if (window.featureFlags?.isEnabled('debugEnhancedAgent')) {
                        console.log('[IntegrationLayer] Enhanced context added to agent chat request');
                    }
                } catch (error) {
                    console.warn('[IntegrationLayer] Error enhancing context:', error);
                    // Continue with original request if enhancement fails
                }
            }
            
            // Call original fetch
            return originalFetch.apply(this, arguments);
        };
    }

    /**
     * Ensure agent window is open and visible
     */
    ensureAgentWindowOpen() {
        const agentWindow = document.getElementById('aiAgentWindow');
        if (!agentWindow) return;
        
        const computedStyle = window.getComputedStyle(agentWindow);
        const isVisible = agentWindow.style.display !== 'none' && 
                         agentWindow.style.display !== '' &&
                         computedStyle.display !== 'none' &&
                         computedStyle.display !== '';
        
        if (!isVisible) {
            // Open agent window
            agentWindow.style.display = 'block';
            // Expand if collapsed
            const agentContent = document.getElementById('agentContent');
            if (agentContent) {
                agentContent.style.display = 'block';
            }
            // Update collapse button icon
            const collapseBtn = document.getElementById('agentCollapseBtn');
            if (collapseBtn) {
                const icon = collapseBtn.querySelector('i');
                if (icon) {
                    icon.setAttribute('data-lucide', 'chevron-down');
                    if (window.lucide) window.lucide.createIcons();
                }
            }
        }
    }

    /**
     * Generate agent response for chart click
     */
    async generateChartClickResponse(selectionInfo) {
        const app = this.appInstance;
        if (!app) return;
        
        // Show thinking message (use addAgentLoadingMessage if available)
        const thinkingId = app.addAgentLoadingMessage?.() || app.addAgentThinkingMessage?.();
        
        try {
            const currentTabInfo = app.getCurrentTabInfo?.() || {};
            const inputs = app.getInputs?.() || {};
            
            // Build enhanced prompt with context builder if available
            let prompt = '';
            const contextBuilder = window.contextBuilder;
            
            // Build datapoint context string
            let datapointContextStr = '';
            if (selectionInfo.datapointContext) {
                const ctx = selectionInfo.datapointContext;
                datapointContextStr = `
DATAPOINT DETAILED CONTEXT:
- Raw Value: ${ctx.rawValue}
- Chart Metric: ${ctx.chartLabel}
- Position: ${ctx.position.index + 1} of ${ctx.position.total} datapoints${ctx.position.isFirst ? ' (First datapoint)' : ctx.position.isLast ? ' (Last datapoint)' : ''}
- Trend: ${ctx.trend}${ctx.previousValue !== null ? ` (Previous: ${ctx.previousLabel} = ${ctx.previousValue})` : ''}${ctx.nextValue !== null ? ` (Next: ${ctx.nextLabel} = ${ctx.nextValue})` : ''}
- Comparison: Min=${ctx.comparison.min}, Max=${ctx.comparison.max.toFixed(2)}, Average=${ctx.comparison.avg.toFixed(2)}
- Percentile: ${ctx.comparison.percentile.toFixed(1)}% (this value is higher than ${ctx.comparison.percentile.toFixed(1)}% of all datapoints)
- Full Data Series: ${ctx.allLabels.map((l, i) => `${l}: ${ctx.allData[i]}`).join(', ')}
`;
            }
            
            if (contextBuilder && contextBuilder.enabled) {
                const enhancedContext = contextBuilder.buildContext({
                    tab: currentTabInfo.tab,
                    subTab: currentTabInfo.subTab,
                    includeData: false
                });
                const contextString = contextBuilder.buildContextString(enhancedContext);
                prompt = `${contextString}USER CLICKED ON CHART DATAPOINT:
- Chart: ${selectionInfo.chartName}
- Datapoint: ${selectionInfo.label}
- Value: ${selectionInfo.value}
- Chart ID: ${selectionInfo.chartId}
- Index: ${selectionInfo.index}
${datapointContextStr}

TASK: Provide insightful analysis about this specific datapoint:
1. Acknowledge what datapoint was clicked
2. Analyze what this datapoint means in context:
   - What does this value represent for ${selectionInfo.chartName}?
   - Why is this datapoint significant? (consider its trend: ${selectionInfo.datapointContext?.trend || 'unknown'}, position, and comparison to other values)
   - What does the ${selectionInfo.datapointContext?.trend || 'trend'} indicate?
   - How does this compare to the average/min/max?
   - What might explain this value or trend?
3. Provide actionable insights or observations about this specific datapoint
4. Suggest related areas they might want to explore (with links if helpful)
5. Use link format: [link text|view:viewName] or [link text|view:viewName:subTab] or [link text|url:https://...]

Be specific and analytical - focus on what this datapoint tells us about the valuation model or SpaceX operations.

Format your response as plain text (2-4 sentences). Use the link format exactly as shown above.`;
            } else {
                // Fallback to basic prompt
                prompt = `You are a Desktop Agent observing user interactions in a SpaceX valuation application.

CURRENT CONTEXT:
- View: ${app.currentView}
- Tab: ${currentTabInfo.tab || 'N/A'}
- Model: ${app.currentModelName || 'No model loaded'}
${app.currentData ? `
CURRENT VALUATION:
- Total: $${((app.currentData.total?.value || 0) / 1000).toFixed(2)}T
- Earth: $${((app.currentData.earth?.adjustedValue || 0) / 1000).toFixed(2)}T
- Mars: $${((app.currentData.mars?.adjustedValue || 0) / 1000).toFixed(2)}T
` : ''}

USER CLICKED ON CHART DATAPOINT:
- Chart: ${selectionInfo.chartName}
- Datapoint: ${selectionInfo.label}
- Value: ${selectionInfo.value}
- Chart ID: ${selectionInfo.chartId}
${datapointContextStr}

TASK: Provide insightful analysis about this specific datapoint:
1. Acknowledge what datapoint was clicked
2. Analyze what this datapoint means in context:
   - What does this value represent for ${selectionInfo.chartName}?
   - Why is this datapoint significant? (consider its trend, position, and comparison to other values)
   - What does the trend indicate?
   - How does this compare to the average/min/max?
   - What might explain this value or trend?
3. Provide actionable insights or observations about this specific datapoint
4. Suggest related areas they might want to explore (with links if helpful)
5. Use link format: [link text|view:viewName] or [link text|view:viewName:subTab] or [link text|url:https://...]

Be specific and analytical - focus on what this datapoint tells us about the valuation model or SpaceX operations.

Format your response as plain text (2-4 sentences). Use the link format exactly as shown above.`;
            }
            
            const systemPrompts = app.agentSystemPrompts || app.getDefaultAgentSystemPrompts?.() || {};
            const systemPromptText = Object.values(systemPrompts)
                .filter(p => p && p.trim())
                .join('\n\n');
            
            const response = await fetch('/api/agent/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-AI-Model': document.getElementById('agentAIModelSelect')?.value || app.aiModel || 'claude-opus-4-1-20250805'
                },
                body: JSON.stringify({
                    message: prompt,
                    systemPrompt: systemPromptText,
                    context: {
                        currentView: app.currentView,
                        currentTab: currentTabInfo.tab,
                        currentSubTab: currentTabInfo.subTab,
                        currentModel: {
                            id: app.currentModelId,
                            name: app.currentModelName,
                            inputs: inputs,
                            valuationData: app.currentData
                        },
                        selectionInfo: selectionInfo,
                        enhancedContext: contextBuilder?.buildContext?.() || null
                    },
                    history: app.getAgentChatHistory?.() || []
                })
            });
            
            const result = await response.json();
            
            // Remove thinking message
            if (thinkingId && app.removeAgentMessage) {
                app.removeAgentMessage(thinkingId);
            }
            
            if (result.success && result.response && 
                !result.response.toUpperCase().includes('SKIP') && 
                result.response.trim().length > 10) {
                // Parse and render commentary with clickable links
                const commentaryWithLinks = app.parseCommentaryLinks?.(result.response.trim()) || result.response.trim();
                app.addAgentMessage?.(`📊 ${commentaryWithLinks}`, 'system');
            }
        } catch (error) {
            console.error('[IntegrationLayer] Error generating chart click response:', error);
            if (thinkingId && app.removeAgentMessage) {
                app.removeAgentMessage(thinkingId);
            }
        }
    }

    /**
     * Deinitialize integration
     */
    deinitialize() {
        if (!this.initialized) return;
        
        console.log('[IntegrationLayer] Deinitializing integration...');
        // Remove hooks (if needed)
        this.initialized = false;
        this.enabled = false;
    }

    /**
     * Setup direct chart click tracking (backup method)
     */
    setupDirectChartClickTracking(app) {
        const selectionManager = window.selectionContextManager;
        if (!selectionManager || !selectionManager.enabled) return;
        
        // Listen for chart clicks at the document level
        // This catches clicks even if handleElementSelection isn't called
        document.addEventListener('click', (event) => {
            // Check if click is on a chart canvas
            const canvas = event.target.closest('canvas');
            if (!canvas) return;
            
            // Check if canvas has a Chart.js instance
            const chartInstance = Chart.getChart(canvas);
            if (!chartInstance) return;
            
            // Get click position
            const rect = canvas.getBoundingClientRect();
            const x = event.clientX - rect.left;
            const y = event.clientY - rect.top;
            
            // Get elements at click position
            const elements = chartInstance.getElementsAtEventForMode(event, 'nearest', { intersect: true }, true);
            
            if (elements && elements.length > 0) {
                const element = elements[0];
                const label = chartInstance.data.labels?.[element.index];
                const dataset = chartInstance.data.datasets?.[element.datasetIndex || 0];
                const value = dataset?.data?.[element.index];
                
                if (label !== undefined && value !== undefined) {
                    // Try to find chart ID from canvas ID or parent
                    const chartId = canvas.id || canvas.closest('[id]')?.id || 'unknown';
                    
                    // Only track if not already tracked by handleElementSelection
                    // (We'll use a small delay to avoid double-tracking)
                    setTimeout(() => {
                        const activeContext = selectionManager.getActiveContext();
                        const isAlreadyTracked = activeContext?.datapoint?.chartId === chartId && 
                                                 activeContext?.datapoint?.index === element.index;
                        
                        if (!isAlreadyTracked) {
                            selectionManager.setDatapoint({
                                chartId: chartId,
                                chartName: chartId.replace('Chart', '').replace(/([A-Z])/g, ' $1').trim() || 'Chart',
                                chartType: chartInstance.config?.type || 'unknown',
                                label: label,
                                value: value,
                                index: element.index,
                                datasetIndex: element.datasetIndex || 0,
                                seriesName: dataset?.label || null,
                                xValue: label,
                                yValue: value,
                                previousValue: element.index > 0 ? dataset?.data?.[element.index - 1] : null,
                                nextValue: element.index < dataset.data.length - 1 ? dataset?.data?.[element.index + 1] : null,
                                view: app.currentView,
                                tab: app.getCurrentTabInfo?.()?.tab,
                                subTab: app.getCurrentTabInfo?.()?.subTab
                            });
                            
                            if (window.featureFlags?.isEnabled('debugEnhancedAgent')) {
                                console.log('[IntegrationLayer] ✅ Direct chart click tracked:', {
                                    chartId: chartId,
                                    label: label,
                                    value: value
                                });
                            }
                        }
                    }, 100);
                }
            }
        }, true); // Use capture phase to catch before other handlers
    }

    /**
     * Enhance chart onClick handler
     */
    enhanceChartOnClick(chartId, chartName, chartType, onClickHandler) {
        const selectionManager = window.selectionContextManager;
        if (!selectionManager || !selectionManager.enabled) return onClickHandler;

        return function(event, elements, chart) {
            // Call original handler
            if (onClickHandler) {
                onClickHandler.call(this, event, elements, chart);
            }

            // Add enhanced tracking
            if (elements && elements.length > 0) {
                const element = elements[0];
                const app = window.app;
                
                if (app && chart) {
                    const label = chart.data.labels?.[element.index];
                    const dataset = chart.data.datasets?.[element.datasetIndex || 0];
                    const value = dataset?.data?.[element.index];
                    
                    // Get previous/next values for trend
                    const previousValue = element.index > 0 ? dataset?.data?.[element.index - 1] : null;
                    const nextValue = element.index < dataset.data.length - 1 ? dataset?.data?.[element.index + 1] : null;
                    
                    selectionManager.setDatapoint({
                        chartId: chartId,
                        chartName: chartName,
                        chartType: chartType,
                        label: label,
                        value: value,
                        index: element.index,
                        datasetIndex: element.datasetIndex || 0,
                        seriesName: dataset?.label || null,
                        xValue: label,
                        yValue: value,
                        previousValue: previousValue,
                        nextValue: nextValue,
                        view: app.currentView,
                        tab: app.getCurrentTabInfo?.()?.tab,
                        subTab: app.getCurrentTabInfo?.()?.subTab
                    });
                }
            }
        };
    }
}

// Export singleton instance
window.agentIntegrationLayer = window.agentIntegrationLayer || new AgentIntegrationLayer();

// Auto-initialize if flags are enabled
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.agentIntegrationLayer.checkAndInitialize();
    });
} else {
    window.agentIntegrationLayer.checkAndInitialize();
}

