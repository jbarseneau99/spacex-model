/**
 * SpaceX Valuation Platform - Main Application
 */

// Make valuationEngine available globally for scenario comparison
const valuationEngine = null; // Will be loaded dynamically

class ValuationApp {
    constructor() {
        this.currentView = 'dashboard';
        this.currentData = null;
        this.currentModelName = null;
        this.editingModelId = null; // Track which model is being edited
        this.currentGreeksData = null; // Store current Greeks data for micro AI
        this.currentFactorRiskData = null; // Store current factor risk data
        this.combinedRiskChartInstance = null; // Chart.js instance for combined risk
        this.factorRiskChartInstance = null; // Chart.js instance for factor risk chart
        this.factorExposureChartInstance = null; // Chart.js instance for factor exposure chart
        this.autoRunningMonteCarlo = false; // Flag to track auto-runs
        this.pendingMonteCarloRun = null; // Store pending run parameters
        this.currentMonteCarloConfig = null; // Store Monte Carlo config from loaded model
        this.currentMonteCarloSimulations = []; // Store simulation results for table display
        this.simulationsCurrentPage = 1; // Current page for simulations table
        this.monteCarloDebounceTimer = null; // Debounce timer for input changes
        this.isInitializing = true; // Flag to track initialization phase
        this.autoRunningVaR = false; // Flag to track VaR auto-runs
        this.varDebounceTimer = null; // Debounce timer for VaR input changes
        this.autoRunningAttribution = false; // Flag to track Attribution auto-runs
        this.attributionDebounceTimer = null; // Debounce timer for Attribution input changes
        this.currentComparablesData = null; // Store current comparables data for charts
        this.aiModel = localStorage.getItem('aiModel') || 'claude-opus-4-1-20250805'; // Default AI model
        this.financialApiProvider = localStorage.getItem('financialApiProvider') || 'yahoo-finance'; // Default financial API
        this.cachedAIInsights = {}; // Cache AI insights by model ID
        this.generatingAIInsights = false;
        this.loadingTerminalInsights = false; // Flag to prevent concurrent terminal insight loading
        this.terminalInsightsLoadPromise = null; // Store promise to prevent duplicate loads
        this.cachedTerminalInsights = {}; // Cache terminal insights by model ID and tile ID: { [modelId]: { [tileId]: insightData } }
        this.navigationHistory = []; // Track navigation history for context understanding
        this.previousContext = null; // Track previous context for change detection
        this.agentCommentaryEnabled = true; // Enable/disable agent commentary on context changes
        this.agentCommentaryDebounceTimer = null; // Debounce timer for context change commentary
        this.elementSelectionDebounceTimer = null; // Debounce timer for element selection commentary
        this.lastSelectedElement = null; // Track last selected element to avoid duplicate comments
        this.elementSelectionHistory = []; // Track element selections for context // Flag to prevent duplicate generation
        this.agentSystemPrompts = null; // Will be loaded on demand
        this.agentChatHistory = []; // Store chat history for context
        this.alphaVantageApiKey = localStorage.getItem('alphaVantageApiKey') || '';
        this.financialModelingPrepApiKey = localStorage.getItem('financialModelingPrepApiKey') || '';
        this.tamData = null; // Earth Bandwidth TAM lookup table
        this.charts = {
            valuation: null,
            cashFlowTimeline: null,
            revenueBreakdown: null,
            starlink: null,
            launch: null,
            marsOption: null,
            marsPopulation: null,
            sensitivity: null,
            stress: null,
            monteCarloDistribution: null,
            monteCarloComparison: null,
            cashFlywheel: null,
            marsCapital: null,
            enterpriseValueEvolution: null,
            marsLaunchScaling: null,
            starshipCost: null,
            orbitalPower: null,
            marginEvolution: null,
            unitEconomics: null,
            capexEfficiency: null,
            utilization: null,
            technologyTransition: null,
            launchCadence: null,
            bandwidthEconomics: null,
            deltaHeatmap: null,
            earthGreeks: null,
            marsGreeks: null,
            attribution: null,
            var: null,
            varEarth: null,
            varMars: null,
            evRevenue: null,
            evEbitda: null,
            growthValuation: null
        };
        // Cache for aiTips - keyed by chartId and data hash
        this.aiTipCache = {};
        this.init();
    }

    async init() {
        this.setupEventListeners();
        this.setupAttributionListeners();
        this.setupVaRListeners();
        this.setupRatiosListeners();
        this.initSettingsModal();
        this.loadScenarios();
        
        // Load TAM data
        await this.loadTAMData();
        
        // Initialize Monte Carlo empty state
        this.initMonteCarloView();
        
        // Restore last view from application state
        const lastView = await this.getAppState('lastView');
        if (lastView && lastView !== 'dashboard') {
            // Switch to last view after a short delay to ensure DOM is ready
            setTimeout(() => {
                this.switchView(lastView);
            }, 100);
        }
        
        // Auto-load last model on startup
        await this.autoLoadFirstModel();
        this.loadSavedInputs();
        
        // Initialize actions bar visibility for Reference Data view
        this.updateReferenceDataActionsBar();
        
        // Initialize element selection detection for charts and text
        this.setupElementSelectionDetection();
        
        // Initialize ratios dashboard with data
        // Load comparables on startup so ratios dashboard is ready
        // Use setTimeout to ensure DOM is ready
        setTimeout(() => {
            console.log('🚀 Initializing comparables data on startup...');
            this.loadComparables()
                .then(() => {
                    console.log('✅ Comparables initialized successfully on startup');
                })
                .catch(err => {
                    console.error('❌ Error loading comparables on initialization:', err);
                    // Try again after a delay
                    setTimeout(() => {
                        console.log('🔄 Retrying comparables load...');
                        this.loadComparables().catch(retryErr => {
                            console.error('❌ Retry failed:', retryErr);
                        });
                    }, 2000);
                });
        }, 500);
        
        // Run Monte Carlo simulation, VaR, and Attribution calculations on initialization (after model loads)
        // The model load will trigger auto-run, so we don't need to call it here
        this.isInitializing = false;

        // Trigger terminal insights load after initialization (will run when model loads and data is available)
        // This will be called again when model loads, but having it here ensures it runs even if no model auto-loads
        setTimeout(() => {
            if (this.currentData && this.currentModelId) {
                // Check if dashboard tab is active and load insights for active sub-tab
                const dashboardTab = document.querySelector('#insights .insights-tab[data-tab="dashboard"]');
                if (dashboardTab && dashboardTab.classList.contains('active')) {
                    const activeSubTab = document.querySelector('#insightsTab-dashboard .sub-tab.active');
                    const category = activeSubTab ? activeSubTab.dataset.subtab : 'overview';
                    const gridContainer = document.getElementById(`dashboardGrid-${category}`);
                    if (gridContainer) {
                        // Get tiles from current layout or generate fallback
                        this.loadTerminalInsightsAfterModelLoad();
                    }
                }
            }
        }, 2000); // Wait 2 seconds for model to load
    }

    /**
     * Load terminal insights after model change - called from loadModel
     */
    async loadTerminalInsightsAfterModelLoad() {
        // Wait a bit for Monte Carlo to complete and dashboard to update
        setTimeout(async () => {
            if (!this.currentData || !this.currentModelId) {
                console.log('⏸️ Skipping terminal insights load - no data or model');
                return;
            }

            const gridContainer = document.getElementById('dashboardGrid');
            if (!gridContainer) {
                console.log('⏸️ Skipping terminal insights load - dashboard grid not found');
                return;
            }

            // Get all tiles from the grid
            const tileElements = gridContainer.querySelectorAll('[data-tile-id]');
            if (tileElements.length === 0) {
                console.log('⏸️ Skipping terminal insights load - no tiles found');
                return;
            }

            // Extract tile data from elements
            const tiles = Array.from(tileElements).map(el => {
                const tileId = el.getAttribute('data-tile-id');
                const title = el.querySelector('[style*="font-size"]')?.textContent?.trim() || '';
                const value = el.querySelector('[style*="font-weight: 700"]')?.textContent?.trim() || '';
                // Try to determine insight type from tile ID
                let insightType = null;
                if (tileId.includes('valuation') || tileId.includes('overview')) insightType = 'valuation-summary';
                else if (tileId.includes('earth') || tileId.includes('starlink')) insightType = 'starlink-earth';
                else if (tileId.includes('mars')) insightType = 'mars-optionality';
                else if (tileId.includes('x') || tileId.includes('posts')) insightType = 'x-feeds';
                else if (tileId.includes('news')) insightType = 'news';
                else if (tileId.includes('financial') || tileId.includes('revenue') || tileId.includes('margin') || tileId.includes('capex')) insightType = 'financial';
                
                return {
                    id: tileId,
                    title: title,
                    value: value,
                    insightType: insightType,
                    gridColumn: el.style.gridColumn,
                    gridRow: el.style.gridRow
                };
            }).filter(tile => tile.insightType); // Only include tiles that need insights

            if (tiles.length > 0) {
                const inputs = this.getInputs();
                await this.loadTerminalInsightsInParallel(tiles, this.currentData, inputs, gridContainer);
            }
        }, 3000); // Wait 3 seconds for Monte Carlo and dashboard to update
    }
    
    updateReferenceDataActionsBar() {
        // Check if we're in the Reference Data view
        const referenceDataView = document.getElementById('inputs');
        if (!referenceDataView || !referenceDataView.classList.contains('active')) {
            return;
        }
        
        // Find the active tab
        const activeTab = referenceDataView.querySelector('.insights-tab.active');
        if (!activeTab) return;
        
        const tabName = activeTab.dataset.tab;
        const actionsBar = document.getElementById('referenceDataActionsBar');
        if (actionsBar) {
            // Show actions bar only on input tabs (not TAM data or methodology)
            const isInputTab = ['basic-inputs', 'advanced-earth', 'advanced-mars'].includes(tabName);
            actionsBar.style.display = isInputTab ? 'flex' : 'none';
        }
    }
    
    async loadTAMData() {
        try {
            // Load from database API
            const response = await fetch('/api/tam-data?name=Earth Bandwidth TAM');
            if (response.ok) {
                const result = await response.json();
                if (result.success && result.data && result.data.data) {
                    this.tamData = result.data.data;
                    console.log(`✓ Loaded ${this.tamData.length} TAM lookup entries from database`);
                    console.log(`  Version: ${result.data.version}, Updated: ${new Date(result.data.updatedAt).toLocaleDateString()}`);
                    
                    // Populate TAM table if view is already loaded
                    this.updateTAMDataTable();
                } else {
                    throw new Error('Invalid TAM data structure from API');
                }
            } else {
                // Fallback to static file if API fails
                console.warn('API TAM data not available, trying static file fallback...');
                const fallbackResponse = await fetch('/data/earth-bandwidth-tam.json');
                if (fallbackResponse.ok) {
                    const tamData = await fallbackResponse.json();
                    this.tamData = tamData.data || tamData;
                    console.log(`✓ Loaded ${this.tamData.length} TAM lookup entries from static file (fallback)`);
                    this.updateTAMDataTable();
                } else {
                    throw new Error('TAM data not available from API or static file');
                }
            }
        } catch (error) {
            console.warn('Error loading TAM data:', error);
            console.warn('Using fallback calculation (simple exponential decline)');
            this.tamData = null;
        }
    }
    
    updateTAMDataTable() {
        const tbody = document.getElementById('tamDataTableBody');
        if (!tbody) return;
        
        if (!this.tamData || this.tamData.length === 0) {
            tbody.innerHTML = '<tr><td colspan="2" class="empty-state">TAM data not loaded</td></tr>';
            return;
        }
        
        // Clear existing rows
        tbody.innerHTML = '';
        
        // Populate table with TAM data
        this.tamData.forEach((entry, index) => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${entry.key.toLocaleString()}</td>
                <td>${entry.value.toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
            `;
            tbody.appendChild(row);
        });
        
        // Update note with count
        const noteEl = document.getElementById('tamDataNote');
        if (noteEl) {
            noteEl.innerHTML = `<strong>Note:</strong> This table contains ${this.tamData.length.toLocaleString()} entries. The lookup function uses binary search with linear interpolation for values between entries.`;
        }
        
        console.log(`✓ Populated TAM data table with ${this.tamData.length} entries`);
    }

    async regenerateTAMData() {
        // Try to find regenerate button (could be in TAM data tab or methodology tab)
        const btn = document.getElementById('regenerateTAMBtn');
        const status = document.getElementById('tamRegenerateStatus');
        
        if (!btn || !status) {
            console.warn('Regenerate TAM button or status element not found');
            return;
        }

        // Disable button and show loading
        btn.disabled = true;
        btn.innerHTML = '<i data-lucide="loader-2"></i> Regenerating...';
        if (window.lucide) window.lucide.createIcons();
        status.innerHTML = '<span style="color: var(--text-secondary);">Regenerating TAM data using model methodology...</span>';

        try {
            const response = await fetch('/api/tam-data/regenerate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const result = await response.json();
            
            // Reload TAM data
            await this.loadTAMData();
            
            // Update table if on TAM data tab
            const tamDataTab = document.querySelector('[data-tab="tam-data"]');
            if (tamDataTab && tamDataTab.classList.contains('active')) {
                this.updateTAMDataTable();
            }

            status.innerHTML = `<span style="color: var(--success-color);">✓ Successfully regenerated ${result.count.toLocaleString()} TAM entries</span>`;
            
            // Show success notification
            this.showNotification('TAM data regenerated successfully', 'success');
        } catch (error) {
            console.error('Error regenerating TAM data:', error);
            status.innerHTML = `<span style="color: var(--error-color);">✗ Error: ${error.message}</span>`;
            this.showNotification('Failed to regenerate TAM data', 'error');
        } finally {
            btn.disabled = false;
            btn.innerHTML = '<i data-lucide="refresh-cw"></i> Regenerate TAM Data';
            if (window.lucide) window.lucide.createIcons();
        }
    }
    
    /**
     * Lookup TAM multiplier from Earth Bandwidth TAM table
     * Matches Excel formula logic: INDEX/MATCH with linear interpolation
     * @param {number} lookupValue - The value to lookup (I91*(1-I92) equivalent)
     * @returns {number} TAM multiplier value
     */
    lookupTAMMultiplier(lookupValue) {
        if (!this.tamData || this.tamData.length === 0) {
            // Fallback: return 1.0 if TAM data not loaded
            return 1.0;
        }
        
        const minKey = this.tamData[0].key;
        const maxKey = this.tamData[this.tamData.length - 1].key;
        
        // If lookup value is below minimum, return first value (Excel handles this case)
        if (lookupValue < minKey) {
            return this.tamData[0].value;
        }
        
        // If lookup value exceeds max, return last value (Excel: MAX with MATCH(9.999999999999E+307))
        if (lookupValue > maxKey) {
            return this.tamData[this.tamData.length - 1].value;
        }
        
        // Binary search for matching row (MATCH with approximate match, sorted ascending)
        let low = 0;
        let high = this.tamData.length - 1;
        let matchIndex = 0;
        
        while (low <= high) {
            const mid = Math.floor((low + high) / 2);
            if (this.tamData[mid].key <= lookupValue) {
                matchIndex = mid;
                low = mid + 1;
            } else {
                high = mid - 1;
            }
        }
        
        // Check if exact match or need interpolation
        const matchKey = this.tamData[matchIndex].key;
        const matchValue = this.tamData[matchIndex].value;
        
        if (matchKey === lookupValue || matchIndex === this.tamData.length - 1) {
            return matchValue;
        }
        
        // Linear interpolation between matchIndex and matchIndex+1
        const nextKey = this.tamData[matchIndex + 1].key;
        const nextValue = this.tamData[matchIndex + 1].value;
        
        const ratio = (lookupValue - matchKey) / (nextKey - matchKey);
        return matchValue + (nextValue - matchValue) * ratio;
    }
    
    initMonteCarloView() {
        // Show empty state if no results exist
        const resultsSection = document.getElementById('monteCarloResultsSection');
        const emptyState = document.getElementById('monteCarloEmptyState');
        
        if (resultsSection && emptyState) {
            const hasResults = resultsSection.style.display === 'block' && this.currentMonteCarloData;
            if (!hasResults) {
                resultsSection.style.display = 'none';
                emptyState.style.display = 'block';
            } else {
                resultsSection.style.display = 'block';
                emptyState.style.display = 'none';
            }
        }
    }

    setupEventListeners() {
        // Navigation
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const view = item.dataset.view;
                this.switchView(view);
            });
        });

        // Calculate button - uses EBITDA multiple approach (consistent for all scenarios)
        document.getElementById('calculateBtn')?.addEventListener('click', () => {
            this.calculateValuation(2030); // Default to 2030, but logic works for any year
        });

        // Input save/reset
        document.getElementById('saveInputsBtn')?.addEventListener('click', () => {
            this.saveInputs();
        });
        document.getElementById('resetInputsBtn')?.addEventListener('click', () => {
            this.resetInputs();
        });

        // Settings modal
        const settingsBtn = document.getElementById('settingsBtn');
        if (settingsBtn) {
            settingsBtn.addEventListener('click', () => {
                const modal = document.getElementById('settingsModal');
                if (modal) {
                    modal.style.display = 'block';
                    // Reload API keys from localStorage before showing modal
                    this.alphaVantageApiKey = localStorage.getItem('alphaVantageApiKey') || '';
                    this.financialModelingPrepApiKey = localStorage.getItem('financialModelingPrepApiKey') || '';
                    this.financialApiProvider = localStorage.getItem('financialApiProvider') || 'yahoo-finance';
                    this.updateCurrentModelDisplay();
                    this.loadMach33LibSettings();
                    this.loadFinancialApiSettings();
                    if (window.lucide) window.lucide.createIcons();
                }
            });
        }
        document.getElementById('closeSettingsBtn')?.addEventListener('click', () => {
            const modal = document.getElementById('settingsModal');
            if (modal) modal.style.display = 'none';
        });

        // Export
        document.getElementById('exportBtn')?.addEventListener('click', () => {
            this.exportData();
        });

        // AI Insights
        document.getElementById('aiInsightsBtn')?.addEventListener('click', () => {
            this.toggleAIInsights();
        });
        document.getElementById('refreshInsightsBtn')?.addEventListener('click', () => {
            this.generateAIInsights();
        });
        const refreshBtn = document.getElementById('refreshInsightsHeaderBtn');
        const refreshIcon = document.getElementById('refreshInsightsIcon');
        
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => {
                // Add spinning animation
                if (refreshIcon) {
                    refreshIcon.classList.add('spinning');
                }
                refreshBtn.style.opacity = '1';
                
                this.refreshAllInsights().finally(() => {
                    // Remove animation after refresh completes
                    setTimeout(() => {
                        if (refreshIcon) {
                            refreshIcon.classList.remove('spinning');
                        }
                        refreshBtn.style.opacity = '0.6';
                    }, 500);
                });
            });
            
            // Add hover effect
            refreshBtn.addEventListener('mouseenter', function() {
                this.style.opacity = '1';
            });
            refreshBtn.addEventListener('mouseleave', function() {
                if (!refreshIcon || !refreshIcon.classList.contains('spinning')) {
                    this.style.opacity = '0.6';
                }
            });
        }
        

        // Monte Carlo Progress Modal Close Button
        document.getElementById('closeMonteCarloProgressBtn')?.addEventListener('click', () => {
            this.closeMonteCarloProgress();
        });

        // Desktop Agent Window
        document.getElementById('agentCommentaryToggleBtn')?.addEventListener('click', () => {
            this.toggleAgentCommentary();
        });
        document.getElementById('agentSettingsBtn')?.addEventListener('click', () => {
            this.openAgentSettings();
        });
        document.getElementById('agentCollapseBtn')?.addEventListener('click', () => {
            this.toggleAIAgentCollapse();
        });
        document.getElementById('agentCloseBtn')?.addEventListener('click', () => {
            this.closeAIAgent();
        });
        
        // Agent Settings Modal Buttons
        document.getElementById('saveAgentSettingsBtn')?.addEventListener('click', () => {
            this.saveAgentSystemPrompts();
        });
        document.getElementById('resetAgentSettingsBtn')?.addEventListener('click', () => {
            this.resetAgentSystemPrompts();
        });
        document.getElementById('agentSendBtn')?.addEventListener('click', () => {
            const input = document.getElementById('agentChatInput') || document.getElementById('agentInput');
            if (input && input.value.trim()) {
                this.sendAgentMessage(input.value.trim());
                input.value = '';
            }
        });
        const agentInput = document.getElementById('agentChatInput') || document.getElementById('agentInput');
        if (agentInput) {
            agentInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    if (e.target.value.trim()) {
                        this.sendAgentMessage(e.target.value.trim());
                        e.target.value = '';
                    }
                }
            });
        }
        
        // Initialize agent window if AI icon is clicked
        const aiIcon = document.querySelector('[data-view="insights"] .nav-item-icon, .nav-item[data-view="insights"]');
        if (aiIcon) {
            aiIcon.addEventListener('click', () => {
                // Don't toggle on main nav click, only on dedicated AI button
            });
        }
        
        // Check for dedicated Desktop Agent button
        const dedicatedAIBtn = document.getElementById('aiAgentBtn');
        if (dedicatedAIBtn) {
            dedicatedAIBtn.addEventListener('click', () => {
                this.toggleAIAgent();
            });
        }

        // TAM regeneration
        document.getElementById('regenerateTAMBtn')?.addEventListener('click', () => {
            this.regenerateTAMData();
        });

        // Sensitivity analysis
        document.getElementById('runSensitivityBtn')?.addEventListener('click', () => {
            this.runSensitivityAnalysis();
        });
        
        // Sensitivity info button
        document.getElementById('sensitivityInfoBtn')?.addEventListener('click', () => {
            this.openSensitivityInfo();
        });

        // Update sensitivity ranges when variable changes
        document.getElementById('sensitivityVariable')?.addEventListener('change', async () => {
            this.prepopulateSensitivityForm();
            // Auto-run analysis when variable changes
            await this.runSensitivityAnalysis(true);
        });

        // Starlink scenario buttons
        document.querySelectorAll('.scenario-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                // Remove active class from all buttons in same group
                const group = btn.closest('.chart-container') || btn.closest('.section');
                group.querySelectorAll('.scenario-btn').forEach(b => {
                    b.classList.remove('active');
                    b.style.background = '#2a2a2a';
                    b.style.color = '#888';
                    b.style.border = '1px solid #444';
                    b.style.fontWeight = 'normal';
                });
                // Add active class to clicked button
                btn.classList.add('active');
                btn.style.background = 'white';
                btn.style.color = '#0066cc';
                btn.style.border = '1px solid #0066cc';
                btn.style.fontWeight = '500';
                // Update chart
                if (this.currentData && this.currentData.earth) {
                    const inputs = this.getInputs();
                    this.updateStarlinkChart(this.currentData.earth, inputs);
                }
            });
        });

        // Mars launch scaling scenario buttons
        document.querySelectorAll('.mars-scaling-scenario-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const scenario = e.target.dataset.scenario;
                
                // Update button states
                e.target.parentElement.querySelectorAll('.mars-scaling-scenario-btn').forEach(b => {
                    b.classList.remove('active');
                    b.style.background = '#2a2a2a';
                    b.style.color = '#888';
                });
                e.target.classList.add('active');
                e.target.style.background = 'white';
                e.target.style.color = '#0066cc';
                e.target.style.fontWeight = '500';
                
                // Update chart
                if (this.currentData?.mars) {
                    this.updateMarsLaunchScalingChart(this.currentData.mars, this.getInputs(), scenario);
                }
            });
        });

        // Insights scenario buttons
        document.querySelectorAll('.insight-scenario-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const chartType = btn.dataset.chart;
                const scenario = btn.dataset.scenario;
                
                // Remove active class from all buttons in same group
                const group = btn.closest('.section');
                group.querySelectorAll('.insight-scenario-btn').forEach(b => {
                    b.classList.remove('active');
                    b.style.background = '#2a2a2a';
                    b.style.color = '#888';
                    b.style.border = '1px solid #444';
                    b.style.fontWeight = 'normal';
                });
                // Add active class to clicked button
                btn.classList.add('active');
                btn.style.background = 'white';
                btn.style.color = '#0066cc';
                btn.style.border = '1px solid #0066cc';
                btn.style.fontWeight = '500';
                
                // Update appropriate chart
                if (this.currentData) {
                    const inputs = this.getInputs();
                    if (chartType === 'cashFlywheel') {
                        this.updateCashFlywheelChart(this.currentData.earth, inputs, scenario);
                    } else if (chartType === 'marsCapital') {
                        this.updateMarsCapitalChart(this.currentData.mars, inputs, scenario);
                    }
                }
            });
        });

        // Custom stress test
        document.getElementById('runCustomStressBtn')?.addEventListener('click', () => {
            this.runCustomStressTest();
        });
        
        // Stress Testing info button
        document.getElementById('stressInfoBtn')?.addEventListener('click', () => {
            this.openStressInfo();
        });

        // Greeks calculation button
        document.getElementById('calculateGreeksBtn')?.addEventListener('click', () => {
            this.calculateGreeks();
        });

        // Factor Risk handlers
        document.getElementById('calculateFactorRiskBtn')?.addEventListener('click', () => {
            this.calculateFactorRisk();
        });
        document.getElementById('runStressTestBtn')?.addEventListener('click', () => {
            this.runFactorStressTest();
        });
        
        // Auto-calculate when factor model changes
        document.getElementById('factorModelSelect')?.addEventListener('change', () => {
            this.calculateFactorRisk();
        });

        // Close factor risk info panel when clicking outside
        document.addEventListener('click', (e) => {
            const panel = document.getElementById('factorRiskInfoPanel');
            const iconContainer = document.getElementById('factorRiskInfoIconContainer');
            if (panel && panel.style.display !== 'none' && 
                !panel.contains(e.target) && 
                !iconContainer?.contains(e.target)) {
                this.closeFactorRiskInfo();
            }
        });

        // Monte Carlo simulation - always rerun and save
        document.getElementById('runMonteCarloBtn')?.addEventListener('click', () => {
            this.runMonteCarloSimulation(true); // Skip validation - always rerun
        });
        
        // Monte Carlo info button
        document.getElementById('monteCarloInfoBtn')?.addEventListener('click', () => {
            this.openMonteCarloInfo();
        });

        // Scenario comparison
        document.getElementById('runScenariosBtn')?.addEventListener('click', () => {
            this.runScenarioComparison();
        });

        document.getElementById('runScenarioMonteCarloBtn')?.addEventListener('click', () => {
            this.runScenarioMonteCarloComparison();
        });

        // Monte Carlo confirmation modal
        document.getElementById('confirmRerunSimulationBtn')?.addEventListener('click', () => {
            this.confirmRerunSimulation();
        });
        document.getElementById('cancelRerunSimulationBtn')?.addEventListener('click', () => {
            this.cancelRerunSimulation();
        });

        // Save Simulation modal
        document.getElementById('confirmSaveSimulationBtn')?.addEventListener('click', () => {
            this.confirmSaveSimulation();
        });
        document.getElementById('cancelSaveSimulationBtn')?.addEventListener('click', () => {
            this.cancelSaveSimulation();
        });
        document.getElementById('closeSaveSimulationBtn')?.addEventListener('click', () => {
            this.cancelSaveSimulation();
        });

        // Edit Monte Carlo Config modal
        document.getElementById('editMonteCarloConfigBtn')?.addEventListener('click', () => {
            this.openEditMonteCarloConfigModal();
        });
        document.getElementById('closeEditMonteCarloConfigBtn')?.addEventListener('click', () => {
            this.closeEditMonteCarloConfigModal();
        });
        document.getElementById('cancelEditMonteCarloConfigBtn')?.addEventListener('click', () => {
            this.closeEditMonteCarloConfigModal();
        });
        document.getElementById('saveMonteCarloConfigBtn')?.addEventListener('click', () => {
            this.saveMonteCarloConfig();
        });
        document.getElementById('resetMonteCarloConfigBtn')?.addEventListener('click', () => {
            this.resetMonteCarloConfigToDefaults();
        });
        document.getElementById('editUseCustomDistributions')?.addEventListener('change', (e) => {
            document.getElementById('customDistributionsSection').style.display = e.target.checked ? 'block' : 'none';
        });

        // Notification modal
        document.getElementById('confirmNotificationBtn')?.addEventListener('click', () => {
            this.closeNotification();
        });
        document.getElementById('closeNotificationBtn')?.addEventListener('click', () => {
            this.closeNotification();
        });
        
        // Close notification modal when clicking outside
        document.getElementById('notificationModal')?.addEventListener('click', (e) => {
            if (e.target.id === 'notificationModal') {
                this.closeNotification();
            }
        });

        // Model management
        document.getElementById('saveCurrentModelBtn')?.addEventListener('click', () => {
            this.openSaveModelModal('model'); // Always save as model
        });
        
        document.getElementById('addModelBtn')?.addEventListener('click', () => {
            this.openSaveModelModal('model');
        });
        
        document.getElementById('addScenarioBtn')?.addEventListener('click', () => {
            this.openSaveModelModal('scenario');
        });

        // Help modal
        document.getElementById('helpBtn')?.addEventListener('click', () => {
            document.getElementById('helpModal').classList.add('active');
            if (window.lucide) window.lucide.createIcons();
        });

        document.getElementById('closeHelpModal')?.addEventListener('click', () => {
            document.getElementById('helpModal').classList.remove('active');
        });

        // Close help modal on background click
        document.getElementById('helpModal')?.addEventListener('click', (e) => {
            if (e.target.id === 'helpModal') {
                document.getElementById('helpModal').classList.remove('active');
            }
        });

        // Help tab switching
        document.querySelectorAll('.help-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                const tabName = tab.dataset.tab;
                
                // Remove active class from all tabs and contents
                document.querySelectorAll('.help-tab').forEach(t => t.classList.remove('active'));
                document.querySelectorAll('.help-tab-content').forEach(c => c.classList.remove('active'));
                
                // Add active class to clicked tab and corresponding content
                tab.classList.add('active');
                const content = document.getElementById(`helpTab-${tabName}`);
                if (content) content.classList.add('active');
                
                // Refresh icons
                if (window.lucide) window.lucide.createIcons();
            });
        });

        // Insights tab switching (works for both Insights, Charts, Monte Carlo, and Reference Data views)
        document.querySelectorAll('.insights-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                const tabName = tab.dataset.tab;
                const subtabName = tab.dataset.subtab; // Check for sub-tabs
                const viewContainer = tab.closest('.view');
                
                // Main tab switching logic
                // Remove active class from all tabs in this view only
                viewContainer.querySelectorAll('.insights-tab').forEach(t => {
                    // Only remove active from main tabs, not sub-tabs
                    if (!t.dataset.subtab) {
                        t.classList.remove('active');
                    }
                });
                viewContainer.querySelectorAll('.insights-tab-content').forEach(c => {
                    c.classList.remove('active');
                    c.style.display = 'none';
                });
                
                // Add active class to clicked tab and corresponding content
                tab.classList.add('active');
                
                // Try different tab content ID patterns based on view
                let contentEl = document.getElementById(`insightsTab-${tabName}`);
                if (!contentEl) {
                    contentEl = document.getElementById(`referenceTab-${tabName}`);
                }
                if (!contentEl) {
                    contentEl = document.getElementById(`ratiosTab-${tabName}`);
                }
                
                if (contentEl) {
                    contentEl.classList.add('active');
                    contentEl.style.display = 'block';
                }
                
                // Track navigation history for tab change
                const currentTabInfo = this.getCurrentTabInfo();
                this.navigationHistory.push({
                    timestamp: new Date().toISOString(),
                    view: this.currentView,
                    tab: tabName,
                    subTab: null,
                    modelId: this.currentModelId,
                    modelName: this.currentModelName
                });
                if (this.navigationHistory.length > 50) {
                    this.navigationHistory.shift();
                }

                // Detect context change for tab switches
                if (viewContainer.closest('#insights') || viewContainer.closest('#earth') || viewContainer.closest('#mars')) {
                    this.detectAndCommentOnContextChange({
                        type: 'subtab_change',
                        view: this.currentView,
                        previousSubTab: currentTabInfo.subTab,
                        newSubTab: tabName
                    });
                }

                // Refresh icons
                if (window.lucide) window.lucide.createIcons();
                
                // Show/hide actions bar for Reference Data view based on active tab
                this.updateReferenceDataActionsBar();
                
                // If switching to simulations tab, update table
                if (tabName === 'simulations') {
                    this.updateSimulationsTable();
                }
                
                // If switching to TAM data tab, populate table
                if (tabName === 'tam-data') {
                    this.updateTAMDataTable();
                }
                
                // If switching to TAM methodology tab, refresh icons
                if (tabName === 'tam-methodology') {
                    // Icons will be refreshed above
                }
                
                // Handle Insights view tabs
                if (viewContainer.closest('#insights')) {
                    if (tabName === 'dashboard' && this.currentData) {
                        // Terminal tab - generate dashboard layout (will use cached insights if available)
                        this.generateDashboardLayout(this.currentData, this.getInputs()).catch(err => {
                            console.error('Error generating dashboard layout:', err);
                        }).then(() => {
                            // Only load insights if not already cached (they're loaded during renderDashboardGrid)
                            // Don't force reload - let cached insights be used
                        });
                    } else if (tabName === 'real-time') {
                        // Real-Time Data tab - load launch data
                        this.loadLaunchData().catch(err => {
                            console.error('Error loading launch data:', err);
                        });
                    }
                    
                    // Update agent context badge when switching tabs
                    this.updateAgentContextBadge();
                }
                
                // Update chart if switching to a chart tab
                if (this.currentData && ['cashFlywheel', 'marsCapital', 'enterpriseValue', 'starshipCost', 'orbitalPower', 'marginEvolution', 'unitEconomics', 'capexEfficiency'].includes(tabName)) {
                    const inputs = this.getInputs();
                    if (tabName === 'cashFlywheel' && this.currentData.earth) {
                        this.updateCashFlywheelChart(this.currentData.earth, inputs, 'base');
                    } else if (tabName === 'marsCapital' && this.currentData.mars) {
                        this.updateMarsCapitalChart(this.currentData.mars, inputs, 'base');
                    } else if (tabName === 'enterpriseValue') {
                        this.updateEnterpriseValueEvolutionChart();
                    } else if (tabName === 'starshipCost') {
                        this.updateStarshipCostChart();
                    } else if (tabName === 'orbitalPower') {
                        this.updateOrbitalPowerChart();
                    } else if (tabName === 'marginEvolution' && this.currentData.earth) {
                        this.updateMarginEvolutionChart(this.currentData.earth).catch(err => console.error('Margin evolution chart error:', err));
                    } else if (tabName === 'unitEconomics' && this.currentData.earth) {
                        this.updateUnitEconomicsChart(this.currentData.earth).catch(err => console.error('Unit economics chart error:', err));
                    } else if (tabName === 'capexEfficiency' && this.currentData.earth) {
                        this.updateCapexEfficiencyChart(this.currentData.earth).catch(err => console.error('Capex efficiency chart error:', err));
                    }
                }
            });
        });

        // Mars Operations sub-tab switching
        document.querySelectorAll('[data-mars-tab]').forEach(tab => {
            tab.addEventListener('click', () => {
                const marsTabName = tab.dataset.marsTab;
                const viewContainer = tab.closest('.view');
                
                // Remove active class from all Mars tabs in this view
                viewContainer.querySelectorAll('[data-mars-tab]').forEach(t => {
                    t.classList.remove('active');
                });
                
                // Hide all Mars tab content
                viewContainer.querySelectorAll('[id^="marsTab-"]').forEach(c => {
                    c.classList.remove('active');
                    c.style.display = 'none';
                });
                
                // Add active class to clicked tab
                tab.classList.add('active');
                
                // Show corresponding content
                const contentEl = document.getElementById(`marsTab-${marsTabName}`);
                if (contentEl) {
                    contentEl.classList.add('active');
                    contentEl.style.display = 'block';
                    
                    // Track navigation history for sub-tab change
                    const tabInfo = this.getCurrentTabInfo();
                    this.navigationHistory.push({
                        timestamp: new Date().toISOString(),
                        view: this.currentView,
                        tab: tabInfo.tab,
                        subTab: marsTabName,
                        modelId: this.currentModelId,
                        modelName: this.currentModelName
                    });
                    if (this.navigationHistory.length > 50) {
                        this.navigationHistory.shift();
                    }

                    // Detect context change
                    this.detectAndCommentOnContextChange({
                        type: 'subtab_change',
                        view: 'mars',
                        previousSubTab: tabInfo.subTab,
                        newSubTab: marsTabName
                    });

                    // Refresh icons
                    if (window.lucide) window.lucide.createIcons();
                    
                    // If switching to Overview tab, update the charts
                    if (marsTabName === 'overview' && this.currentData && this.currentData.mars) {
                        const inputs = this.getInputs();
                        // Small delay to ensure canvas elements are visible
                        setTimeout(() => {
                            this.updateMarsOptionChart(this.currentData.mars);
                            this.updateMarsPopulationChart(this.currentData.mars);
                        }, 100);
                    }
                    
                    // If switching to Launch Scaling tab, update the chart
                    if (marsTabName === 'launch-scaling' && this.currentData && this.currentData.mars) {
                        const inputs = this.getInputs();
                        setTimeout(() => {
                            this.updateMarsLaunchScalingChart(this.currentData.mars, inputs, 'base');
                        }, 100);
                    }
                    
                    // If switching to Scenarios tab, render detailed scenarios
                    if (marsTabName === 'scenarios' && this.currentData && this.currentData.mars) {
                        setTimeout(() => {
                            this.renderMarsScenariosDetail(this.currentData.mars.scenarios);
                        }, 100);
                    }
                }
            });
        });

        // Earth Operations sub-tab switching
        document.querySelectorAll('[data-earth-tab]').forEach(tab => {
            tab.addEventListener('click', () => {
                const earthTabName = tab.dataset.earthTab;
                const viewContainer = tab.closest('.view');
                
                // Remove active class from all Earth tabs in this view
                viewContainer.querySelectorAll('[data-earth-tab]').forEach(t => {
                    t.classList.remove('active');
                });
                
                // Hide all Earth tab content
                viewContainer.querySelectorAll('[id^="earthTab-"]').forEach(c => {
                    c.classList.remove('active');
                    c.style.display = 'none';
                });
                
                // Add active class to clicked tab
                tab.classList.add('active');
                
                // Show corresponding content
                const contentEl = document.getElementById(`earthTab-${earthTabName}`);
                if (contentEl) {
                    contentEl.classList.add('active');
                    contentEl.style.display = 'block';
                    
                    // Track navigation history for sub-tab change
                    const tabInfo = this.getCurrentTabInfo();
                    this.navigationHistory.push({
                        timestamp: new Date().toISOString(),
                        view: this.currentView,
                        tab: tabInfo.tab,
                        subTab: earthTabName,
                        modelId: this.currentModelId,
                        modelName: this.currentModelName
                    });
                    if (this.navigationHistory.length > 50) {
                        this.navigationHistory.shift();
                    }

                    // Detect context change
                    this.detectAndCommentOnContextChange({
                        type: 'subtab_change',
                        view: 'earth',
                        previousSubTab: tabInfo.subTab,
                        newSubTab: earthTabName
                    });

                    // Refresh icons
                    if (window.lucide) window.lucide.createIcons();
                    
                    // Update charts/data when switching tabs
                    if (this.currentData && this.currentData.earth) {
                        const inputs = this.getInputs();
                        
                        setTimeout(() => {
                            // Update charts based on which tab is active
                            if (earthTabName === 'starlink') {
                                this.updateStarlinkChart(this.currentData.earth, inputs);
                                this.updateBandwidthEconomicsChart(this.currentData.earth).catch(err => console.error('Bandwidth economics chart error:', err));
                            } else if (earthTabName === 'launch') {
                                this.updateLaunchChart(this.currentData.earth, inputs);
                            } else if (earthTabName === 'utilization') {
                                this.updateUtilizationChart(this.currentData.earth, inputs).catch(err => console.error('Utilization chart error:', err));
                            } else if (earthTabName === 'cadence') {
                                this.updateLaunchCadenceChart(this.currentData.earth, inputs).catch(err => console.error('Launch cadence chart error:', err));
                            } else if (earthTabName === 'technology') {
                                this.updateTechnologyTransitionChart(this.currentData.earth).catch(err => console.error('Technology transition chart error:', err));
                            } else if (earthTabName === 'financials') {
                                // Financials tab uses the cash flow table which is already updated
                                this.updateEarthCashFlowTable(this.currentData.earth);
                            }
                        }, 100);
                    }
                }
            });
        });
        document.getElementById('confirmSaveModelBtn')?.addEventListener('click', () => {
            this.saveModel();
        });
        document.getElementById('cancelSaveModelBtn')?.addEventListener('click', () => {
            document.getElementById('saveModelModal').classList.remove('active');
        });
        document.getElementById('closeSaveModelBtn')?.addEventListener('click', () => {
            document.getElementById('saveModelModal').classList.remove('active');
        });
        
        // Edit Model Modal
        document.getElementById('closeEditModelBtn')?.addEventListener('click', () => {
            document.getElementById('editModelModal').classList.remove('active');
        });
        document.getElementById('cancelEditModelBtn')?.addEventListener('click', () => {
            document.getElementById('editModelModal').classList.remove('active');
        });
        document.getElementById('saveEditModelBtn')?.addEventListener('click', () => {
            this.updateModel();
        });
        document.getElementById('deleteModelBtn')?.addEventListener('click', () => {
            const modelId = this.editingModelId;
            if (modelId) {
                this.confirmDeleteModel(modelId);
            }
        });

        // Model list filters
        const modelSearch = document.getElementById('modelSearch');
        const modelSort = document.getElementById('modelSort');
        const showFavoritesOnly = document.getElementById('showFavoritesOnly');
        
        if (modelSearch) modelSearch.addEventListener('input', () => this.loadModels());
        if (modelSort) modelSort.addEventListener('change', () => this.loadModels());
        if (showFavoritesOnly) showFavoritesOnly.addEventListener('change', () => this.loadModels());

        // Scenario tab switching
        const scenarioAnalysisTabBtn = document.getElementById('scenarioAnalysisTabBtn');
        const savedScenariosTabBtn = document.getElementById('savedScenariosTabBtn');
        if (scenarioAnalysisTabBtn) {
            scenarioAnalysisTabBtn.addEventListener('click', () => this.switchScenarioTab('scenario-analysis-tab'));
        }
        if (savedScenariosTabBtn) {
            savedScenariosTabBtn.addEventListener('click', () => this.switchScenarioTab('saved-scenarios-tab'));
        }

        // Scenario search/sort controls
        const scenarioSearch = document.getElementById('scenarioSearch');
        const scenarioSort = document.getElementById('scenarioSort');
        const showFavoritesOnlyScenarios = document.getElementById('showFavoritesOnlyScenarios');
        
        if (scenarioSearch) scenarioSearch.addEventListener('input', () => this.loadScenarios());
        if (scenarioSort) scenarioSort.addEventListener('change', () => this.loadScenarios());
        if (showFavoritesOnlyScenarios) showFavoritesOnlyScenarios.addEventListener('change', () => this.loadScenarios());

        // Simulations table controls
        const simulationsSearch = document.getElementById('simulationsSearch');
        const simulationsPageSize = document.getElementById('simulationsPageSize');
        const exportSimulationsBtn = document.getElementById('exportSimulationsBtn');
        
        if (simulationsSearch) {
            simulationsSearch.addEventListener('input', () => {
                this.simulationsCurrentPage = 1; // Reset to first page on search
                this.updateSimulationsTable();
            });
        }
        if (simulationsPageSize) {
            simulationsPageSize.addEventListener('change', () => {
                this.simulationsCurrentPage = 1; // Reset to first page on page size change
                this.updateSimulationsTable();
            });
        }
        if (exportSimulationsBtn) {
            exportSimulationsBtn.addEventListener('click', () => {
                this.exportSimulationsToCSV();
            });
        }

        // Input changes trigger recalculation and auto-run Monte Carlo and VaR
        document.querySelectorAll('#inputs input').forEach(input => {
            input.addEventListener('change', () => {
                // Auto-save on change
                this.saveInputs();
                // Auto-run Monte Carlo simulation, VaR, and Attribution after input change (debounced)
                if (!this.isInitializing) {
                    this.debouncedAutoRunMonteCarlo('parameter-change');
                    this.debouncedAutoRunVaR('parameter-change');
                    this.debouncedAutoRunAttribution('parameter-change');
                }
            });
        });
        
        // Also listen to checkbox changes
        document.querySelectorAll('#inputs input[type="checkbox"]').forEach(input => {
            input.addEventListener('change', () => {
                this.saveInputs();
                if (!this.isInitializing) {
                    this.debouncedAutoRunMonteCarlo('parameter-change');
                    this.debouncedAutoRunVaR('parameter-change');
                    this.debouncedAutoRunAttribution('parameter-change');
                }
            });
        });
    }

    async switchView(viewName) {
        // Track navigation history
        const tabInfo = this.getCurrentTabInfo();
        const navigationEntry = {
            timestamp: new Date().toISOString(),
            view: this.currentView,
            tab: tabInfo.tab,
            subTab: tabInfo.subTab,
            modelId: this.currentModelId,
            modelName: this.currentModelName
        };
        
        // Add to history (keep last 50 entries)
        this.navigationHistory.push(navigationEntry);
        if (this.navigationHistory.length > 50) {
            this.navigationHistory.shift();
        }

        // Update navigation
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.remove('active');
        });
        const navItem = document.querySelector(`[data-view="${viewName}"]`);
        if (navItem) {
            navItem.classList.add('active');
        }

        // Update views
        document.querySelectorAll('.view').forEach(view => {
            view.classList.remove('active');
        });
        const targetView = document.getElementById(viewName);
        if (targetView) {
            targetView.classList.add('active');
        }

        const previousView = this.currentView;
        this.currentView = viewName;
        
        // Save current view to application state
        await this.saveAppState('lastView', viewName);
        
        // Detect context change and trigger agent commentary
        this.detectAndCommentOnContextChange({
            type: 'view_change',
            previousView: previousView,
            newView: viewName,
            previousTab: tabInfo.tab,
            previousSubTab: tabInfo.subTab
        });
        
        // Update agent context badge if agent window is open
        this.updateAgentContextBadge();

        // Update actions bar visibility for Reference Data view
        if (viewName === 'inputs') {
            this.updateReferenceDataActionsBar();
        } else {
            // Hide actions bar when leaving Reference Data view
            const actionsBar = document.getElementById('referenceDataActionsBar');
            if (actionsBar) {
                actionsBar.style.display = 'none';
            }
        }

        // Load models if switching to models view
        if (viewName === 'models') {
            this.loadModels();
        }

        // Update insights when switching to insights view
        if (viewName === 'insights') {
            if (this.currentData) {
                this.updateInsightsView(this.currentData).catch(err => console.error('Error updating insights:', err));
            }
        }

        // Auto-calculate scenarios when switching to scenarios view
        if (viewName === 'scenarios') {
            // Show Scenario Analysis tab by default
            this.switchScenarioTab('scenario-analysis-tab');
            this.autoCalculateScenarios();
        }

        // Auto-load comparables when switching to ratios view
        if (viewName === 'ratios') {
            // CRITICAL: Ensure we have reference data (currentData) before calculating ratios
            // Ratios NEED actual model data to work properly
            const ensureReferenceData = async () => {
                // If currentData is missing, trigger a calculation first
                if (!this.currentData) {
                    console.log('⚠️ currentData missing - REQUIRED for ratios. Triggering calculation...');
                    try {
                        const inputs = this.getInputs();
                        const response = await fetch('/api/calculate', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify(inputs)
                        });
                        const result = await response.json();
                        if (result.success && result.data) {
                            this.currentData = result.data;
                            this.updateDashboard(result.data);
                            console.log('✅ Loaded currentData for ratios view - reference data ready');
                            return true;
                        } else {
                            console.error('❌ Failed to load currentData:', result.error);
                            return false;
                        }
                    } catch (err) {
                        console.error('❌ Error loading currentData for ratios:', err);
                        return false;
                    }
                } else {
                    console.log('✅ currentData already available for ratios');
                    return true;
                }
            };
            
            // Wait for DOM to be ready, then ensure reference data, then load comparables
            setTimeout(async () => {
                // Ensure dashboard tab is visible and active
                const dashboardTab = document.querySelector('#ratios .insights-tab[data-tab="dashboard"]');
                const dashboardContent = document.getElementById('ratiosTab-dashboard');
                if (dashboardTab && !dashboardTab.classList.contains('active')) {
                    dashboardTab.classList.add('active');
                }
                if (dashboardContent) {
                    dashboardContent.classList.add('active');
                    dashboardContent.style.display = 'block';
                }
                
                // CRITICAL: Wait for reference data to be loaded
                const hasReferenceData = await ensureReferenceData();
                
                if (!hasReferenceData) {
                    console.error('❌ Cannot calculate ratios without reference data');
                    const container = document.getElementById('impliedValuationsContainer');
                    if (container) {
                        container.innerHTML = `
                            <div style="padding: var(--spacing-lg); text-align: center;">
                                <p style="color: var(--error-color); margin-bottom: var(--spacing-md);">
                                    ⚠️ Reference data required for ratios calculation
                                </p>
                                <p style="font-size: 12px; color: var(--text-secondary);">
                                    Please ensure inputs are set and try again.
                                </p>
                            </div>
                        `;
                    }
                    return;
                }
                
                // Now load comparables and calculate ratios with actual reference data
                if (!this.currentComparablesData || this.currentComparablesData.length === 0) {
                    // Load comparables - it will update dashboard automatically
                    this.loadComparables().then(() => {
                        // Ensure dashboard is updated after comparables load
                        if (this.currentComparablesData && this.currentComparablesData.length > 0) {
                            setTimeout(() => {
                                this.updateValuationMultiples(this.currentComparablesData);
                                const sector = document.getElementById('comparableSectorSelect')?.value || 'space';
                                this.updateSectorSummary(this.currentComparablesData, sector);
                                this.calculateImpliedValuations(this.currentComparablesData);
                            }, 50);
                        }
                    }).catch(err => {
                        console.error('Error loading comparables:', err);
                    });
                } else {
                    // Update dashboard with existing comparables data
                    setTimeout(() => {
                        this.updateValuationMultiples(this.currentComparablesData);
                        const sector = document.getElementById('comparableSectorSelect')?.value || 'space';
                        this.updateSectorSummary(this.currentComparablesData, sector);
                        this.calculateImpliedValuations(this.currentComparablesData);
                    }, 50);
                }
            }, 100);
        }

        // Auto-run sensitivity analysis when switching to sensitivity view
        if (viewName === 'sensitivity') {
            this.autoRunSensitivityAnalysis();
        }

        // Auto-calculate Greeks when switching to greeks view
        if (viewName === 'greeks') {
            this.calculateGreeks();
        }

        // Auto-calculate Factor Risk when switching to factor-risk view
        if (viewName === 'factor-risk') {
            this.calculateFactorRisk();
        }

        // Load models for attribution when switching to attribution view
        if (viewName === 'attribution') {
            this.loadModelsForAttribution();
        }

        // Update Earth/Mars/Insights views if data is available
        if (this.currentData) {
            if (viewName === 'earth' && this.currentData.earth) {
                this.updateEarthView(this.currentData);
            }
            if (viewName === 'mars' && this.currentData.mars) {
                this.updateMarsView(this.currentData);
            }
        }

        // Update charts when switching to charts view
        if (viewName === 'charts') {
            if (this.currentData) {
                this.updateChartsView(this.currentData).catch(err => console.error('Error updating charts:', err));
            }
        }
    }

    // Alias for switchView to match onclick handlers in HTML
    showView(viewName) {
        this.switchView(viewName);
    }

    getInputs() {
        // Helper function to safely get input value with default
        const getValue = (id, defaultValue, parseFunc = parseFloat) => {
            const el = document.getElementById(id);
            if (!el) return defaultValue;
            if (el.type === 'checkbox') return el.checked;
            const value = parseFunc(el.value);
            return isNaN(value) ? defaultValue : value;
        };

        return {
            earth: {
                // Basic parameters
                starlinkPenetration: getValue('starlinkPenetration', 0.15),
                bandwidthPriceDecline: getValue('bandwidthPriceDecline', 0.10),
                launchVolume: getValue('launchVolume', 100),
                launchPriceDecline: getValue('launchPriceDecline', 0.05),
                
                // Advanced Earth Operations
                starshipReusabilityYear: getValue('starshipReusabilityYear', 2026, parseInt),
                starshipCommercialViabilityYear: getValue('starshipCommercialViabilityYear', 2025, parseInt),
                starshipPayloadCapacity: getValue('starshipPayloadCapacity', 75000),
                maxRocketProductionIncrease: getValue('maxRocketProductionIncrease', 0.25),
                wrightsLawTurnaroundTime: getValue('wrightsLawTurnaroundTime', 0.05),
                wrightsLawLaunchCost: getValue('wrightsLawLaunchCost', 0.05),
                wrightsLawSatelliteGBPS: getValue('wrightsLawSatelliteGBPS', 0.07),
                realizedBandwidthTAMMultiplier: getValue('realizedBandwidthTAMMultiplier', 0.5),
                starshipLaunchesForStarlink: getValue('starshipLaunchesForStarlink', 0.9),
                nonStarlinkLaunchMarketGrowth: getValue('nonStarlinkLaunchMarketGrowth', 0.01),
                irrThresholdEarthToMars: getValue('irrThresholdEarthToMars', 0),
                cashBufferPercent: getValue('cashBufferPercent', 0.1)
            },
            mars: {
                // Basic parameters
                firstColonyYear: getValue('firstColonyYear', 2030, parseInt),
                transportCostDecline: getValue('transportCostDecline', 0.20),
                populationGrowth: getValue('populationGrowth', 0.50),
                industrialBootstrap: getValue('industrialBootstrap', true),
                
                // Advanced Mars Operations
                optimusCost2026: getValue('optimusCost2026', 50000),
                optimusAnnualCostDecline: getValue('optimusAnnualCostDecline', 0.05),
                optimusProductivityMultiplier: getValue('optimusProductivityMultiplier', 0.25),
                optimusLearningRate: getValue('optimusLearningRate', 0.05),
                marsPayloadOptimusVsTooling: getValue('marsPayloadOptimusVsTooling', 0.01)
            },
            financial: {
                discountRate: getValue('discountRate', 0.12),
                dilutionFactor: getValue('dilutionFactor', 0.15),
                terminalGrowth: getValue('terminalGrowth', 0.03)
            }
        };
    }

    async calculateValuation(horizonYear = 2030, modelId = null) {
        // DETERMINISTIC CALCULATIONS ARE DISABLED
        // Only Monte Carlo simulations are used for valuation
        // This function now triggers Monte Carlo instead
        console.log('🔄 Deterministic calculation disabled - triggering Monte Carlo simulation instead');
        
        // Trigger Monte Carlo simulation (this is the only valuation method)
        await this.runMonteCarloSimulation(false); // false = manual run (not auto)
    }

    updateDashboardTitle(modelName) {
        const dashboardTitle = document.querySelector('#dashboard .view-header h2');
        if (dashboardTitle) {
            if (modelName) {
                dashboardTitle.textContent = modelName;
            } else {
                dashboardTitle.textContent = 'Valuation Dashboard';
            }
        }
    }

    updateDashboard(data) {
        // CRITICAL: Only update dashboard if we have Monte Carlo results OR if explicitly allowed
        // Deterministic calculations are disabled - dashboard should only show Monte Carlo
        const hasMonteCarloResults = this.currentMonteCarloData && 
                                   this.currentMonteCarloData.statistics && 
                                   this.currentMonteCarloData.statistics.totalValue &&
                                   this.currentMonteCarloData.statistics.totalValue.mean > 0;
        
        // If no Monte Carlo results, don't update dashboard with deterministic values
        // Show empty/placeholder instead
        if (!hasMonteCarloResults && !data._allowDeterministic) {
            console.log('⏸️ Skipping dashboard update - waiting for Monte Carlo simulation');
            console.log('   Dashboard will show values only after Monte Carlo runs');
            // Show placeholder or empty state
            const totalEl = document.getElementById('totalValue');
            const earthEl = document.getElementById('earthValue');
            const marsEl = document.getElementById('marsValue');
            if (totalEl) totalEl.textContent = '--';
            if (earthEl) earthEl.textContent = '--';
            if (marsEl) marsEl.textContent = '--';
            return;
        }
        
        if (!data || !data.total) {
            console.error('Invalid data for dashboard update:', data);
            return;
        }

        const formatValue = (value) => {
            if (!value && value !== 0) return 'N/A';
            
            // Values from calculation engine are in billions
            // Format appropriately: T for trillions, B for billions
            
            // Handle very large values (raw dollars - shouldn't happen but safety check)
            if (value >= 1e9) {
                // Raw dollars - convert to trillions
                const trillions = value / 1e12;
                return `$${trillions.toFixed(2)}T`;
            }
            
            // Values >= 1000 billion = trillions
            if (value >= 1000) {
                const trillions = value / 1000;
                return `$${trillions.toFixed(2)}T`;
            }
            
            // Values >= 1 billion but < 1000 billion = billions
            if (value >= 1) {
                return `$${value.toFixed(1)}B`;
            }
            
            // Values < 1 billion but >= 0.001 billion = millions
            if (value >= 0.001) {
                const millions = value * 1000;
                return `$${millions.toFixed(1)}M`;
            }
            
            // Very small values = thousands
            const thousands = value * 1e6;
            return `$${thousands.toFixed(1)}K`;
        };

        // Update metrics
        const totalEl = document.getElementById('totalValue');
        const earthEl = document.getElementById('earthValue');
        const marsEl = document.getElementById('marsValue');
        const marsOptionEl = document.getElementById('marsOptionValue');
        const earthPercentEl = document.getElementById('earthPercent');
        const marsPercentEl = document.getElementById('marsPercent');

        if (totalEl && data.total.value !== undefined) {
            totalEl.textContent = formatValue(data.total.value);
        }
        if (earthEl && data.earth && data.earth.adjustedValue !== undefined) {
            earthEl.textContent = formatValue(data.earth.adjustedValue);
        }
        if (marsEl && data.mars && data.mars.adjustedValue !== undefined) {
            marsEl.textContent = formatValue(data.mars.adjustedValue);
        }
        if (marsOptionEl && data.mars && data.mars.optionValue !== undefined) {
            marsOptionEl.textContent = formatValue(data.mars.optionValue);
        }
        
        if (earthPercentEl && data.total.breakdown && data.total.breakdown.earthPercent !== undefined) {
            earthPercentEl.textContent = `${data.total.breakdown.earthPercent.toFixed(1)}%`;
        }
        if (marsPercentEl && data.total.breakdown && data.total.breakdown.marsPercent !== undefined) {
            marsPercentEl.textContent = `${data.total.breakdown.marsPercent.toFixed(1)}%`;
        }

        // Detect context change before updating currentData
        const previousData = this.currentData;
        const dataChanged = !previousData || 
            JSON.stringify(previousData.total?.value) !== JSON.stringify(data.total?.value) ||
            JSON.stringify(previousData.earth?.adjustedValue) !== JSON.stringify(data.earth?.adjustedValue) ||
            JSON.stringify(previousData.mars?.adjustedValue) !== JSON.stringify(data.mars?.adjustedValue);

        // Store currentData BEFORE updating charts (charts may need it)
        this.currentData = data;

        // Update ratios dashboard calculations if comparables are already loaded
        // This ensures implied valuations update when model data changes
        if (this.currentComparablesData && this.currentComparablesData.length > 0) {
            this.calculateImpliedValuations(this.currentComparablesData);
        }

        // Detect context change if data changed
        if (dataChanged) {
            this.detectAndCommentOnContextChange({
                type: 'data_change',
                previousData: previousData,
                newData: data
            });
        }

        // Update charts (only if data has required structure)
        try {
            this.updateValuationChart(data);
        } catch (err) {
            console.error('Error updating valuation chart:', err);
        }
        // Cash flow timeline chart needs earth.cashFlow array
        if (data.earth && data.earth.cashFlow && Array.isArray(data.earth.cashFlow)) {
            try {
                this.updateCashFlowTimelineChart(data);
            } catch (err) {
                console.error('Error updating cash flow timeline chart:', err);
            }
        } else {
            // Cash flow data not available - skip chart update
            console.log('⏸️ Skipping cash flow timeline chart - cash flow data not available');
        }
        // Revenue breakdown chart needs earth.revenue array
        if (data.earth && data.earth.revenue && Array.isArray(data.earth.revenue)) {
            try {
                this.updateRevenueBreakdownChart(data);
            } catch (err) {
                console.error('Error updating revenue breakdown chart:', err);
            }
        } else {
            // Monte Carlo results don't have revenue breakdown - skip chart update
            console.log('⏸️ Skipping revenue breakdown chart - Monte Carlo results don\'t include revenue timeline data');
        }

        // Update Earth and Mars views if they're active
        if (this.currentView === 'earth' && data.earth) {
            this.updateEarthView(data);
        }
        if (this.currentView === 'mars' && data.mars) {
            this.updateMarsView(data);
        }
        
        // Auto-generate AI insights in background when model is loaded/changed
        if (this.currentModelId && !this.generatingAIInsights) {
            this.generateAndCacheAIInsights(data).catch(err => {
                console.error('Error generating AI insights:', err);
            });
        }
    }

    updateValuationChart(data) {
        const ctx = document.getElementById('valuationChart');
        if (!ctx) {
            console.warn('valuationChart canvas not found');
            return;
        }
        
        if (!data || !data.total || !data.total.breakdown) {
            console.warn('Invalid data for valuationChart:', data);
            return;
        }
        
        // Ensure breakdown has earth and mars values
        if (data.total.breakdown.earth === undefined && data.total.breakdown.earthPercent !== undefined) {
            // Calculate from percentage if needed
            const total = data.total.value || 0;
            data.total.breakdown.earth = (data.total.breakdown.earthPercent / 100) * total;
            data.total.breakdown.mars = (data.total.breakdown.marsPercent / 100) * total;
        }
        
        if (this.charts.valuation) {
            this.charts.valuation.destroy();
        }

        const formatValue = (value) => {
            if (!value && value !== 0) return 'N/A';
            // Values from calculation engine are in billions
            if (value >= 1000) {
                // Raw dollars - convert
                if (value >= 1e9) return `$${(value / 1e9).toFixed(1)}B`;
                if (value >= 1e6) return `$${(value / 1e6).toFixed(1)}M`;
                return `$${(value / 1e3).toFixed(1)}K`;
            } else {
                // Already in billions
                return `$${value.toFixed(1)}B`;
            }
        };

        // Store reference for onClick handler
        const appInstance = this;
        
        this.charts.valuation = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['Earth Operations', 'Mars Operations'],
                datasets: [{
                    data: [
                        data.total.breakdown.earth || 0,
                        data.total.breakdown.mars || 0
                    ],
                    backgroundColor: [
                        '#0066cc',
                        '#10b981'
                    ]
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: {
                    intersect: true,
                    mode: 'point'
                },
                onClick: function(event, elements, chart) {
                    console.log('Valuation chart onClick fired:', { elements: elements?.length || 0, chart: !!chart });
                    if (elements && elements.length > 0) {
                        const element = elements[0];
                        const app = window.app || appInstance;
                        if (app && app.charts && app.charts.valuation) {
                            const chartInstance = app.charts.valuation;
                            const label = chartInstance.data.labels[element.index];
                            const value = chartInstance.data.datasets[0].data[element.index];
                            console.log('Chart element selected:', { label, value, index: element.index });
                            app.handleElementSelection({
                                type: 'chart',
                                chartId: 'valuationChart',
                                chartName: 'Valuation Breakdown',
                                elementType: 'segment',
                                label: label,
                                value: formatValue(value),
                                index: element.index
                            });
                        } else {
                            console.warn('App or chart not available:', { app: !!app, chart: app?.charts?.valuation });
                        }
                    } else {
                        console.log('Chart clicked but no element selected (clicked on empty area or center)');
                    }
                },
                plugins: {
                    legend: {
                        position: 'bottom'
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const value = context.parsed;
                                return `${context.label}: ${formatValue(value)}`;
                            }
                        }
                    }
                }
            }
        });
        
        // Also add canvas-level click handler as fallback
        ctx.addEventListener('click', (e) => {
            console.log('Valuation chart canvas clicked directly');
            // Chart.js onClick should handle this, but this confirms canvas is clickable
        });
    }

    updateRevenueBreakdownChart(data) {
        const ctx = document.getElementById('revenueBreakdownChart');
        if (!ctx) {
            console.warn('revenueBreakdownChart canvas not found');
            return;
        }
        
        if (!data || !data.earth || !data.earth.revenue || data.earth.revenue.length === 0) {
            console.warn('Invalid data for revenueBreakdownChart:', data);
            return;
        }

        // Get year 1 revenue breakdown
        const year1Revenue = data.earth.revenue[0];
        const breakdown = year1Revenue.breakdown || {};
        
        if (!breakdown.starlink && !breakdown.starshield && !breakdown.launch) {
            return; // No breakdown data
        }

        // Show section
        document.getElementById('revenueBreakdownSection').style.display = 'block';

        if (this.charts.revenueBreakdown) {
            this.charts.revenueBreakdown.destroy();
        }

        const formatBillion = (value) => {
            if (value >= 1000) return value / 1e9;
            return value;
        };

        // Store reference for onClick handler
        const appInstance = this;
        
        this.charts.revenueBreakdown = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['Starlink', 'Starshield', 'Launch (Starship)', 'Launch (Falcon 9)'],
                datasets: [{
                    data: [
                        formatBillion(breakdown.starlink || 0),
                        formatBillion(breakdown.starshield || 0),
                        formatBillion(breakdown.starship || 0),
                        formatBillion(breakdown.falcon9 || 0)
                    ],
                    backgroundColor: [
                        '#0066cc',
                        '#4a90e2',
                        '#10b981',
                        '#34d399'
                    ]
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: {
                    intersect: true,
                    mode: 'point'
                },
                onClick: function(event, elements, chart) {
                    console.log('Revenue chart onClick fired:', { elements, chart: !!chart });
                    if (elements && elements.length > 0) {
                        const element = elements[0];
                        const app = window.app || appInstance;
                        if (app && app.charts && app.charts.revenueBreakdown) {
                            const chartInstance = app.charts.revenueBreakdown;
                            const label = chartInstance.data.labels[element.index];
                            const value = chartInstance.data.datasets[0].data[element.index];
                            console.log('Chart element selected:', { label, value, index: element.index });
                            app.handleElementSelection({
                                type: 'chart',
                                chartId: 'revenueBreakdownChart',
                                chartName: 'Revenue Breakdown',
                                elementType: 'segment',
                                label: label,
                                value: `$${value.toFixed(2)}B`,
                                index: element.index
                            });
                        } else {
                            console.warn('App or chart not available:', { app: !!app, chart: app?.charts?.revenueBreakdown });
                        }
                    } else {
                        console.log('Chart clicked but no element selected (clicked on empty area)');
                    }
                },
                plugins: {
                    title: {
                        display: true,
                        text: 'Year 1 Revenue Breakdown'
                    },
                    legend: {
                        position: 'bottom'
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const value = context.parsed;
                                return `${context.label}: $${value.toFixed(2)}B`;
                            }
                        }
                    }
                }
            }
        });
        
        // Also add canvas-level click handler as fallback
        ctx.addEventListener('click', (e) => {
            console.log('Revenue chart canvas clicked directly');
        });
    }

    updateCashFlowTimelineChart(data) {
        const ctx = document.getElementById('cashFlowTimelineChart');
        if (!ctx) {
            console.warn('cashFlowTimelineChart canvas not found');
            return;
        }
        
        if (!data || !data.earth || !data.earth.cashFlow) {
            console.warn('Invalid data for cash flow timeline chart:', data);
            return;
        }
        
        if (!Array.isArray(data.earth.cashFlow)) {
            console.warn('cashFlow is not an array:', typeof data.earth.cashFlow);
            return;
        }
        
        if (this.charts.cashFlowTimeline) {
            this.charts.cashFlowTimeline.destroy();
        }

        const years = [];
        const cashFlows = [];
        const cumulativePV = [];

        data.earth.cashFlow.forEach((item, index) => {
            const year = item.year || index + 1;
            years.push(2024 + index);
            cashFlows.push(item.value); // Already in billions
            if (data.earth.presentValue && data.earth.presentValue[index]) {
                cumulativePV.push(data.earth.presentValue[index].cumulative || 0);
            } else {
                cumulativePV.push(0);
            }
        });

        // Store reference for onClick handler
        const appInstance = this;
        
        this.charts.cashFlowTimeline = new Chart(ctx, {
            type: 'line',
            data: {
                labels: years,
                datasets: [
                    {
                        label: 'Annual Cash Flow ($B)',
                        data: cashFlows,
                        borderColor: '#0066cc',
                        backgroundColor: 'rgba(0, 102, 204, 0.1)',
                        yAxisID: 'y',
                        tension: 0.4,
                        fill: true,
                        pointRadius: 4,
                        pointHoverRadius: 6
                    },
                    {
                        label: 'Cumulative PV ($B)',
                        data: cumulativePV,
                        borderColor: '#10b981',
                        backgroundColor: 'rgba(16, 185, 129, 0.1)',
                        yAxisID: 'y1',
                        tension: 0.4,
                        fill: false,
                        pointRadius: 4,
                        pointHoverRadius: 6
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: {
                    intersect: false,
                    mode: 'index'
                },
                onClick: function(event, elements, chart) {
                    console.log('Cash flow chart onClick fired:', { elements, chart: !!chart });
                    if (elements && elements.length > 0) {
                        const element = elements[0];
                        const app = window.app || appInstance;
                        if (app && app.charts && app.charts.cashFlowTimeline) {
                            const chartInstance = app.charts.cashFlowTimeline;
                            const datasetLabel = chartInstance.data.datasets[element.datasetIndex].label;
                            const year = chartInstance.data.labels[element.index];
                            const value = chartInstance.data.datasets[element.datasetIndex].data[element.index];
                            console.log('Chart element selected:', { datasetLabel, year, value, index: element.index });
                            app.handleElementSelection({
                                type: 'chart',
                                chartId: 'cashFlowTimelineChart',
                                chartName: 'Cash Flow Timeline',
                                elementType: 'dataPoint',
                                label: `${datasetLabel} - ${year}`,
                                value: `$${value.toFixed(2)}B`,
                                index: element.index,
                                datasetIndex: element.datasetIndex
                            });
                        } else {
                            console.warn('App or chart not available:', { app: !!app, chart: app?.charts?.cashFlowTimeline });
                        }
                    } else {
                        console.log('Chart clicked but no element selected (clicked on empty area)');
                    }
                },
                plugins: {
                    legend: {
                        position: 'bottom'
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const value = context.parsed.y;
                                return `${context.dataset.label}: $${value.toFixed(2)}B`;
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        type: 'linear',
                        position: 'left',
                        title: {
                            display: true,
                            text: 'Cash Flow ($B)'
                        },
                        ticks: {
                            callback: function(value) {
                                return '$' + value.toFixed(1) + 'B';
                            }
                        }
                    },
                    y1: {
                        type: 'linear',
                        position: 'right',
                        title: {
                            display: true,
                            text: 'Cumulative PV ($B)'
                        },
                        grid: {
                            drawOnChartArea: false
                        },
                        ticks: {
                            callback: function(value) {
                                return '$' + value.toFixed(1) + 'B';
                            }
                        }
                    },
                    x: {
                        title: {
                            display: true,
                            text: 'Year'
                        }
                    }
                }
            }
        });
    }

    updateCashFlowTable(earthData) {
        const tbody = document.getElementById('cashFlowBody');
        if (!tbody) return;
        
        tbody.innerHTML = '';

        if (!earthData || !earthData.cashFlow || earthData.cashFlow.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" class="empty-state">No cash flow data available</td></tr>';
            return;
        }

        const formatValue = (value) => {
            if (!value && value !== 0) return 'N/A';
            // Values from calculation engine are in billions
            if (value >= 1000) {
                // Raw dollars - convert
                if (value >= 1e9) return `$${(value / 1e9).toFixed(2)}B`;
                if (value >= 1e6) return `$${(value / 1e6).toFixed(2)}M`;
                if (value >= 1e3) return `$${(value / 1e3).toFixed(2)}K`;
                return `$${value.toFixed(2)}`;
            } else {
                // Already in billions
                return `$${value.toFixed(2)}B`;
            }
        };

        // Update detailed metrics section
        this.updateDetailedMetrics(earthData);

        earthData.cashFlow.forEach((item, index) => {
            const row = document.createElement('tr');
            const year = item.year || index + 2024;
            const revenue = item.value + (item.breakdown?.costs || 0) + (item.breakdown?.capex || 0); // Reconstruct revenue
            const costs = item.breakdown?.costs || earthData.costs[index]?.value || 0;
            const capex = item.breakdown?.capex || 0;
            const cashFlow = item.value;
            const pv = earthData.presentValue[index]?.value || 0;
            const cumulativePV = earthData.presentValue[index]?.cumulative || 0;
            
            // Get revenue from revenue array if available
            const revenueItem = earthData.revenue[index];
            const actualRevenue = revenueItem?.value || revenue;
            
            row.innerHTML = `
                <td>${year}</td>
                <td>${formatValue(actualRevenue)}</td>
                <td>${formatValue(costs)}</td>
                <td>${formatValue(capex)}</td>
                <td>${formatValue(cashFlow)}</td>
                <td>${formatValue(pv)}</td>
                <td>${formatValue(cumulativePV)}</td>
            `;
            
            tbody.appendChild(row);
        });
    }
    
    updateDetailedMetrics(earthData) {
        // Show detailed metrics section
        const section = document.getElementById('detailedMetricsSection');
        if (section && earthData.constellation && earthData.constellation.length > 0) {
            section.style.display = 'block';
            
            // Get latest year data
            const latest = earthData.constellation[earthData.constellation.length - 1];
            const latestCapacity = earthData.capacity?.[earthData.capacity.length - 1];
            const latestCapex = earthData.capex?.[earthData.capex.length - 1];
            
            // Update metrics
            const activeSatellitesEl = document.getElementById('activeSatellites');
            const bandwidthEl = document.getElementById('bandwidthCapacity');
            const rocketsEl = document.getElementById('rocketsAvailable');
            const capexEl = document.getElementById('annualCapex');
            
            if (activeSatellitesEl && latest) {
                activeSatellitesEl.textContent = latest.activeSatellites.toLocaleString();
            }
            if (bandwidthEl && latest) {
                bandwidthEl.textContent = `${(latest.bandwidthCapacity / 1000).toFixed(1)} Tbps`;
            }
            if (rocketsEl && latestCapacity) {
                rocketsEl.textContent = Math.floor(latestCapacity.totalAvailable).toLocaleString();
            }
            if (capexEl && latestCapex) {
                capexEl.textContent = `$${latestCapex.total.toFixed(2)}B`;
            }
        }
    }

    async loadScenarios() {
        try {
            const response = await fetch('/api/scenarios');
            const result = await response.json();
            
            if (result.success) {
                this.renderScenarios(result.data);
            }
        } catch (error) {
            console.error('Failed to load scenarios:', error);
        }
    }

    renderScenarios(scenarios) {
        const grid = document.getElementById('scenariosGrid');
        grid.innerHTML = '';

        Object.values(scenarios).forEach(scenario => {
            const card = document.createElement('div');
            card.className = 'scenario-card';
            card.innerHTML = `
                <h3>${scenario.name}</h3>
                <p>Click to load this scenario</p>
            `;
            card.addEventListener('click', () => {
                this.loadScenario(scenario);
            });
            grid.appendChild(card);
        });
    }

    loadScenario(scenario) {
        // Load scenario inputs
        if (scenario.inputs && scenario.inputs.earth) {
            document.getElementById('starlinkPenetration').value = scenario.inputs.earth.starlinkPenetration;
            document.getElementById('bandwidthPriceDecline').value = scenario.inputs.earth.bandwidthPriceDecline;
            document.getElementById('launchVolume').value = scenario.inputs.earth.launchVolume;
            document.getElementById('launchPriceDecline').value = scenario.inputs.earth.launchPriceDecline;
        } else if (scenario.earth) {
            // Backward compatibility: handle old format
            document.getElementById('starlinkPenetration').value = scenario.earth.starlinkPenetration;
            document.getElementById('bandwidthPriceDecline').value = scenario.earth.bandwidthPriceDecline;
            document.getElementById('launchVolume').value = scenario.earth.launchVolume;
            document.getElementById('launchPriceDecline').value = scenario.earth.launchPriceDecline;
        }
        
        if (scenario.inputs && scenario.inputs.mars) {
            document.getElementById('firstColonyYear').value = scenario.inputs.mars.firstColonyYear;
            document.getElementById('transportCostDecline').value = scenario.inputs.mars.transportCostDecline;
            document.getElementById('populationGrowth').value = scenario.inputs.mars.populationGrowth;
            if (scenario.inputs.mars.industrialBootstrap !== undefined) {
                document.getElementById('industrialBootstrap').checked = scenario.inputs.mars.industrialBootstrap;
            }
        } else if (scenario.mars) {
            // Backward compatibility: handle old format
            document.getElementById('firstColonyYear').value = scenario.mars.firstColonyYear;
            document.getElementById('transportCostDecline').value = scenario.mars.transportCostDecline;
            document.getElementById('populationGrowth').value = scenario.mars.populationGrowth;
            if (scenario.mars.industrialBootstrap !== undefined) {
                document.getElementById('industrialBootstrap').checked = scenario.mars.industrialBootstrap;
            }
        }
        
        if (scenario.inputs && scenario.inputs.financial) {
            document.getElementById('discountRate').value = scenario.inputs.financial.discountRate;
            document.getElementById('dilutionFactor').value = scenario.inputs.financial.dilutionFactor;
            document.getElementById('terminalGrowth').value = scenario.inputs.financial.terminalGrowth;
        } else if (scenario.financial) {
            // Backward compatibility: handle old format
            document.getElementById('discountRate').value = scenario.financial.discountRate;
            document.getElementById('dilutionFactor').value = scenario.financial.dilutionFactor;
            document.getElementById('terminalGrowth').value = scenario.financial.terminalGrowth;
        }

        // Save inputs
        this.saveInputs();
        
        // Switch to inputs view
        this.switchView('inputs');
        
        // Refresh icons
        lucide.createIcons();
        
        // Automatically trigger Monte Carlo simulation with new scenario inputs
        // Deterministic calculations are disabled - only Monte Carlo is used
        setTimeout(() => {
            console.log('🔄 Scenario loaded - triggering Monte Carlo simulation');
            this.debouncedAutoRunMonteCarlo('scenario-change');
        }, 100);
    }

    // Get default sensitivity ranges for a variable
    getDefaultSensitivityRange(variable, baseInputs) {
        const currentValue = this.getVariableValue(variable, baseInputs);
        
        const defaults = {
            'earth.starlinkPenetration': { min: Math.max(0.05, currentValue * 0.5), max: Math.min(0.30, currentValue * 2), steps: 20 },
            'earth.bandwidthPriceDecline': { min: Math.max(0, currentValue * 0.5), max: Math.min(0.20, currentValue * 2), steps: 20 },
            'earth.launchVolume': { min: Math.max(10, currentValue * 0.5), max: Math.min(500, currentValue * 2), steps: 20 },
            'earth.launchPriceDecline': { min: Math.max(0, currentValue * 0.5), max: Math.min(0.15, currentValue * 2), steps: 20 },
            'mars.firstColonyYear': { min: Math.max(2025, Math.round(currentValue - 5)), max: Math.min(2040, Math.round(currentValue + 10)), steps: 15 },
            'mars.transportCostDecline': { min: Math.max(0.10, currentValue * 0.5), max: Math.min(0.30, currentValue * 2), steps: 20 },
            'mars.populationGrowth': { min: Math.max(0.20, currentValue * 0.5), max: Math.min(1.0, currentValue * 2), steps: 20 },
            'financial.discountRate': { min: Math.max(0.08, currentValue * 0.7), max: Math.min(0.20, currentValue * 1.5), steps: 20 },
            'financial.dilutionFactor': { min: Math.max(0.05, currentValue * 0.5), max: Math.min(0.30, currentValue * 2), steps: 20 },
            'financial.terminalGrowth': { min: Math.max(0.01, currentValue * 0.5), max: Math.min(0.05, currentValue * 2), steps: 20 }
        };

        return defaults[variable] || { min: currentValue * 0.8, max: currentValue * 1.2, steps: 20 };
    }

    // Get current value of a variable from inputs
    getVariableValue(variable, baseInputs) {
        const parts = variable.split('.');
        let value = baseInputs;
        for (const part of parts) {
            value = value?.[part];
        }
        return value || 0;
    }

    // Prepopulate sensitivity form with defaults
    prepopulateSensitivityForm() {
        const baseInputs = this.getInputs();
        if (!baseInputs) return;

        const variable = document.getElementById('sensitivityVariable').value;
        const range = this.getDefaultSensitivityRange(variable, baseInputs);

        // Format based on variable type
        const minEl = document.getElementById('sensitivityMin');
        const maxEl = document.getElementById('sensitivityMax');
        const stepsEl = document.getElementById('sensitivitySteps');
        
        if (variable === 'mars.firstColonyYear') {
            minEl.value = Math.round(range.min);
            maxEl.value = Math.round(range.max);
            minEl.step = '1';
            maxEl.step = '1';
        } else {
            minEl.value = range.min.toFixed(3);
            maxEl.value = range.max.toFixed(3);
            minEl.step = '0.01';
            maxEl.step = '0.01';
        }
        stepsEl.value = range.steps;
    }

    // Auto-run sensitivity analysis when tab opens
    async autoRunSensitivityAnalysis() {
        const baseInputs = this.getInputs();
        if (!baseInputs) return;

        // Prepopulate form with defaults
        this.prepopulateSensitivityForm();

        // Auto-run analysis
        await this.runSensitivityAnalysis(true);
    }

    async runSensitivityAnalysis(skipButtonUpdate = false) {
        const variable = document.getElementById('sensitivityVariable').value;
        const min = parseFloat(document.getElementById('sensitivityMin').value);
        const max = parseFloat(document.getElementById('sensitivityMax').value);
        const steps = parseInt(document.getElementById('sensitivitySteps').value);

        if (isNaN(min) || isNaN(max) || isNaN(steps) || min >= max || steps < 2) {
            if (!skipButtonUpdate) alert('Please fill in valid range values (min < max, steps >= 2)');
            return;
        }

        const baseInputs = this.getInputs();
        if (!baseInputs) {
            if (!skipButtonUpdate) alert('Please load a model or set inputs first');
            return;
        }

        const btn = document.getElementById('runSensitivityBtn');
        const originalText = btn ? btn.innerHTML : '';
        
        if (!skipButtonUpdate && btn) {
            btn.disabled = true;
            btn.innerHTML = '<i data-lucide="loader"></i> Running...';
            if (window.lucide) window.lucide.createIcons();
        }

        try {
            const response = await fetch('/api/sensitivity/run', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    baseInputs,
                    variable,
                    range: [min, max, steps]
                })
            });

            const result = await response.json();
            
            if (result.success) {
                // API returns data directly as array, not nested in data.results
                const sensitivityData = Array.isArray(result.data) ? result.data : result.data?.results || [];
                if (sensitivityData.length > 0) {
                    this.renderSensitivityChart(sensitivityData, variable);
                } else {
                    console.error('No sensitivity data returned');
                    if (!skipButtonUpdate) alert('No sensitivity data returned');
                }
            } else {
                if (!skipButtonUpdate) alert('Error: ' + result.error);
            }
        } catch (error) {
            console.error('Sensitivity analysis error:', error);
            if (!skipButtonUpdate) alert('Failed to run sensitivity analysis');
        } finally {
            if (!skipButtonUpdate && btn) {
                btn.disabled = false;
                btn.innerHTML = originalText;
                if (window.lucide) window.lucide.createIcons();
            }
        }
    }

    renderSensitivityChart(data, variable) {
        const ctx = document.getElementById('sensitivityChart');
        if (!ctx) {
            console.warn('Sensitivity chart canvas not found');
            return;
        }
        
        if (!data || data.length === 0) {
            console.error('No sensitivity data to render');
            alert('No sensitivity data available');
            return;
        }
        
        console.log('Rendering sensitivity chart with', data.length, 'data points');

        // Sort data by variable value to ensure proper ordering
        const sortedData = [...data].sort((a, b) => a.value - b.value);
        
        // Debug: log first few data points
        console.log('Sensitivity chart data (first 3 points):', sortedData.slice(0, 3).map(d => ({
            value: d.value,
            total: d.totalValue,
            earth: d.earthValue,
            mars: d.marsValue
        })));

        if (this.charts.sensitivity) {
            this.charts.sensitivity.destroy();
        }

        // Values are already in billions, use directly
        // Format labels based on variable type
        const formatLabel = (value) => {
            if (variable === 'mars.firstColonyYear') {
                return Math.round(value).toString();
            }
            if (variable.includes('Penetration') || variable.includes('Rate') || variable.includes('Growth') || variable.includes('Decline') || variable.includes('Factor')) {
                return (value * 100).toFixed(1) + '%';
            }
            return value.toFixed(2);
        };

        // Format Y-axis values
        const formatYValue = (value) => {
            if (value >= 1000) {
                return '$' + (value / 1000).toFixed(1) + 'T';
            }
            return '$' + value.toFixed(1) + 'B';
        };

        // Format tooltip values
        const formatTooltipValue = (value) => {
            if (value >= 1000) {
                return '$' + (value / 1000).toFixed(2) + 'T';
            }
            return '$' + value.toFixed(2) + 'B';
        };

        this.charts.sensitivity = new Chart(ctx, {
            type: 'line',
            data: {
                labels: sortedData.map(d => formatLabel(d.value)),
                datasets: [{
                    label: 'Total Value',
                    data: sortedData.map(d => d.totalValue), // Already in billions
                    borderColor: '#0066cc',
                    backgroundColor: 'rgba(0, 102, 204, 0.1)',
                    tension: 0, // No smoothing - show actual data points
                    pointRadius: 2,
                    pointHoverRadius: 5,
                    borderWidth: 2
                }, {
                    label: 'Earth Value',
                    data: sortedData.map(d => d.earthValue), // Already in billions
                    borderColor: '#10b981',
                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
                    tension: 0, // No smoothing - show actual data points
                    pointRadius: 2,
                    pointHoverRadius: 5,
                    borderWidth: 2
                }, {
                    label: 'Mars Value',
                    data: sortedData.map(d => d.marsValue), // Already in billions
                    borderColor: '#f59e0b',
                    backgroundColor: 'rgba(245, 158, 11, 0.1)',
                    tension: 0, // No smoothing - show actual data points
                    pointRadius: 2,
                    pointHoverRadius: 5,
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'top'
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return `${context.dataset.label}: ${formatTooltipValue(context.parsed.y)}`;
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        title: {
                            display: true,
                            text: 'Enterprise Value'
                        },
                        beginAtZero: false,
                        ticks: {
                            callback: function(value) {
                                return formatYValue(value);
                            }
                        }
                    },
                    x: {
                        title: {
                            display: true,
                            text: this.getVariableLabel(variable)
                        }
                    }
                }
            }
        });
    }

    getVariableLabel(variable) {
        const labels = {
            'earth.starlinkPenetration': 'Starlink Penetration (%)',
            'earth.bandwidthPriceDecline': 'Bandwidth Price Decline (%)',
            'earth.launchVolume': 'Launch Volume (per year)',
            'earth.launchPriceDecline': 'Launch Price Decline (%)',
            'mars.firstColonyYear': 'First Colony Year',
            'mars.transportCostDecline': 'Transport Cost Decline (%)',
            'mars.populationGrowth': 'Population Growth Rate (%)',
            'financial.discountRate': 'Discount Rate (%)',
            'financial.dilutionFactor': 'Dilution Factor (%)',
            'financial.terminalGrowth': 'Terminal Growth Rate (%)'
        };
        return labels[variable] || variable;
    }

    saveInputs() {
        const inputs = this.getInputs();
        localStorage.setItem('spacex_valuation_inputs', JSON.stringify(inputs));
    }

    loadSavedInputs() {
        const saved = localStorage.getItem('spacex_valuation_inputs');
        if (saved) {
            try {
                const inputs = JSON.parse(saved);
                
                if (inputs.earth) {
                    document.getElementById('starlinkPenetration').value = inputs.earth.starlinkPenetration || 0.15;
                    document.getElementById('bandwidthPriceDecline').value = inputs.earth.bandwidthPriceDecline || 0.10;
                    document.getElementById('launchVolume').value = inputs.earth.launchVolume || 100;
                    document.getElementById('launchPriceDecline').value = inputs.earth.launchPriceDecline || 0.05;
                }
                
                if (inputs.mars) {
                    document.getElementById('firstColonyYear').value = inputs.mars.firstColonyYear || 2030;
                    document.getElementById('transportCostDecline').value = inputs.mars.transportCostDecline || 0.20;
                    document.getElementById('populationGrowth').value = inputs.mars.populationGrowth || 0.50;
                    document.getElementById('industrialBootstrap').checked = inputs.mars.industrialBootstrap !== false;
                }
                
                if (inputs.financial) {
                    document.getElementById('discountRate').value = inputs.financial.discountRate || 0.12;
                    document.getElementById('dilutionFactor').value = inputs.financial.dilutionFactor || 0.15;
                    document.getElementById('terminalGrowth').value = inputs.financial.terminalGrowth || 0.03;
                }
            } catch (error) {
                console.error('Failed to load saved inputs:', error);
            }
        }
    }

    resetInputs() {
        localStorage.removeItem('spacex_valuation_inputs');
        location.reload();
    }

    updateEarthView(data) {
        if (!data.earth) return;

        // Ensure default tab (Starlink) is visible
        const earthView = document.getElementById('earth');
        if (earthView) {
            // Hide all Earth tab content
            earthView.querySelectorAll('[id^="earthTab-"]').forEach(c => {
                c.classList.remove('active');
                c.style.display = 'none';
            });
            
            // Show default Starlink tab
            const starlinkTab = earthView.querySelector('[data-earth-tab="starlink"]');
            const starlinkContent = document.getElementById('earthTab-starlink');
            if (starlinkTab && starlinkContent) {
                // Remove active from all tabs
                earthView.querySelectorAll('[data-earth-tab]').forEach(t => {
                    t.classList.remove('active');
                });
                // Activate Starlink tab
                starlinkTab.classList.add('active');
                starlinkContent.classList.add('active');
                starlinkContent.style.display = 'block';
            }
        }

        const formatBillion = (value) => {
            if (!value && value !== 0) return 'N/A';
            // Values are already in billions
            // If >= 1000 billion, display as trillions
            if (value >= 1000) {
                return `$${(value / 1000).toFixed(1)}T`;
            }
            return `$${value.toFixed(1)}B`;
        };
        const formatTbps = (value) => `${(value / 1000).toFixed(1)} Tbps`;
        const formatPrice = (value) => `$${value.toFixed(0)}/Gbps/month`;

        // Use actual results data if available, otherwise calculate
        const inputs = this.getInputs();
        
        // Year 1 metrics from results with revenue breakdown
        if (data.earth.revenue && data.earth.revenue.length > 0) {
            const year1Revenue = data.earth.revenue[0];
            const revenueValue = typeof year1Revenue === 'object' ? year1Revenue.value : year1Revenue;
            const breakdown = year1Revenue.breakdown || {};
            
            // Use breakdown if available, otherwise estimate
            const starlinkRevenue = breakdown.starlink || revenueValue * 0.75;
            const starshieldRevenue = breakdown.starshield || revenueValue * 0.10;
            const launchRevenue = breakdown.launch || revenueValue * 0.15;
            const starshipRevenue = breakdown.starship || launchRevenue * 0.5;
            const falcon9Revenue = breakdown.falcon9 || launchRevenue * 0.5;
            
            // Calculate capacity and price from revenue
            const year0Capacity = this.calculateBandwidthCapacity(0, inputs.earth);
            const year0Price = this.calculateBandwidthPrice(0, inputs.earth);
            
            const starlinkEl = document.getElementById('starlinkRevenue');
            const launchEl = document.getElementById('launchRevenue');
            if (starlinkEl) starlinkEl.textContent = formatBillion(starlinkRevenue);
            if (launchEl) launchEl.textContent = formatBillion(launchRevenue);
            
            // Update revenue breakdown if elements exist
            const starshieldEl = document.getElementById('starshieldRevenue');
            const starshipEl = document.getElementById('starshipRevenue');
            const falcon9El = document.getElementById('falcon9Revenue');
            if (starshieldEl) starshieldEl.textContent = formatBillion(starshieldRevenue);
            if (starshipEl) starshipEl.textContent = formatBillion(starshipRevenue);
            if (falcon9El) falcon9El.textContent = formatBillion(falcon9Revenue);
        } else {
            // Fallback to calculation
            const year0Capacity = this.calculateBandwidthCapacity(0, inputs.earth);
            const year0Price = this.calculateBandwidthPrice(0, inputs.earth);
            const starlinkRevenue = (year0Capacity * 1000 * year0Price * 12) / 1e9; // Convert to billions
            const starshieldRevenue = starlinkRevenue * 0.10;
            
            const launchVolume = inputs.earth.launchVolume;
            const launchPrice = this.calculateLaunchPrice(0, inputs.earth);
            const launchRevenue = (launchVolume * launchPrice) / 1000; // Convert to billions
            const starshipRevenue = launchRevenue * 0.5;
            const falcon9Revenue = launchRevenue * 0.5;
            
            const starlinkEl = document.getElementById('starlinkRevenue');
            const launchEl = document.getElementById('launchRevenue');
            if (starlinkEl) starlinkEl.textContent = formatBillion(starlinkRevenue);
            if (launchEl) launchEl.textContent = formatBillion(launchRevenue);
        }
        
        // Update capacity and price displays
        const year0Capacity = this.calculateBandwidthCapacity(0, inputs.earth);
        const year0Price = this.calculateBandwidthPrice(0, inputs.earth);
        const capacityEl = document.getElementById('starlinkCapacity');
        const priceEl = document.getElementById('starlinkPrice');
        const volumeEl = document.getElementById('launchVolumeDisplay');
        const launchPriceEl = document.getElementById('launchPriceDisplay');
        
        if (capacityEl) capacityEl.textContent = formatTbps(year0Capacity);
        if (priceEl) priceEl.textContent = formatPrice(year0Price);
        if (volumeEl) volumeEl.textContent = `${inputs.earth.launchVolume} launches`;
        if (launchPriceEl) launchPriceEl.textContent = `$${this.calculateLaunchPrice(0, inputs.earth).toFixed(0)}M`;

        // Update cash flow table
        this.updateEarthCashFlowTable(data.earth);

        // Update charts
        try {
            this.updateStarlinkChart(data.earth, inputs);
        } catch (err) {
            console.error('Error updating Starlink chart:', err);
        }
        try {
            this.updateLaunchChart(data.earth, inputs);
        } catch (err) {
            console.error('Error updating Launch chart:', err);
        }
        
        // Update new insight charts
        this.updateUtilizationChart(data.earth, inputs).catch(err => console.error('Utilization chart error:', err));
        this.updateTechnologyTransitionChart(data.earth).catch(err => console.error('Technology transition chart error:', err));
        this.updateLaunchCadenceChart(data.earth, inputs).catch(err => console.error('Launch cadence chart error:', err));
        this.updateBandwidthEconomicsChart(data.earth).catch(err => console.error('Bandwidth economics chart error:', err));
    }

    updateMarsView(data) {
        if (!data.mars) return;

        const formatBillion = (value) => {
            if (!value && value !== 0) return 'N/A';
            // Values are already in billions
            // If >= 1000 billion, display as trillions
            if (value >= 1000) {
                return `$${(value / 1000).toFixed(1)}T`;
            }
            return `$${value.toFixed(1)}B`;
        };

        const optionValueEl = document.getElementById('marsOptionValueDetail');
        const expectedValueEl = document.getElementById('marsExpectedValue');
        const underlyingValueEl = document.getElementById('marsUnderlyingValue');
        const yearsToColonyEl = document.getElementById('marsYearsToColony');
        
        if (optionValueEl) optionValueEl.textContent = formatBillion(data.mars.optionValue);
        if (expectedValueEl) expectedValueEl.textContent = formatBillion(data.mars.expectedValue);
        if (underlyingValueEl) underlyingValueEl.textContent = formatBillion(data.mars.underlyingValue);
        if (yearsToColonyEl) yearsToColonyEl.textContent = `${data.mars.yearsToColony} years`;

        // Render scenarios (compact in Overview tab)
        this.renderMarsScenarios(data.mars.scenarios);
        
        // Render detailed scenarios (in Scenarios tab) if it's visible
        const scenariosTab = document.getElementById('marsTab-scenarios');
        if (scenariosTab && scenariosTab.classList.contains('active')) {
            this.renderMarsScenariosDetail(data.mars.scenarios);
        }

        // Get inputs for charts
        const inputs = this.getInputs();

        // Update charts - use setTimeout to ensure canvas elements are visible
        setTimeout(() => {
            this.updateMarsOptionChart(data.mars);
            this.updateMarsPopulationChart(data.mars);
            this.updateMarsLaunchScalingChart(data.mars, inputs);
        }, 100);
    }

    updateEarthCashFlowTable(earthData) {
        const tbody = document.getElementById('earthCashFlowBody');
        if (!tbody) return;
        
        tbody.innerHTML = '';

        if (!earthData.cashFlow || earthData.cashFlow.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" class="empty-state">No data available</td></tr>';
            return;
        }

        const formatBillion = (value) => {
            if (!value && value !== 0) return 'N/A';
            // Values are already in billions
            // If >= 1000 billion, display as trillions
            if (value >= 1000) {
                return `$${(value / 1000).toFixed(2)}T`;
            }
            return `$${value.toFixed(2)}B`;
        };

        // Use actual results data (already in billions)
        earthData.cashFlow.forEach((item, index) => {
            const year = item.year || index + 1;
            const revenueItem = earthData.revenue && earthData.revenue[index];
            const revenue = revenueItem ? (typeof revenueItem === 'object' ? revenueItem.value : revenueItem) : item.value;
            const breakdown = revenueItem && revenueItem.breakdown ? revenueItem.breakdown : {};
            const costs = earthData.costs && earthData.costs[index] ? earthData.costs[index].value : revenue * 0.6;
            const cashFlow = item.value; // Already in billions
            const pv = earthData.presentValue && earthData.presentValue[index] ? earthData.presentValue[index].value : 0;
            
            // Use breakdown if available, otherwise estimate
            const starlinkRev = breakdown.starlink || revenue * 0.75;
            const starshieldRev = breakdown.starshield || revenue * 0.10;
            const launchRev = breakdown.launch || revenue * 0.15;
            const starshipRev = breakdown.starship || launchRev * 0.5;
            const falcon9Rev = breakdown.falcon9 || launchRev * 0.5;

            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${year}</td>
                <td>${formatBillion(starlinkRev)}</td>
                <td>${formatBillion(starshieldRev)}</td>
                <td>${formatBillion(launchRev)}</td>
                <td>${formatBillion(revenue)}</td>
                <td>${formatBillion(costs)}</td>
                <td>${formatBillion(cashFlow)}</td>
                <td>${formatBillion(pv)}</td>
                <td>${earthData.presentValue && earthData.presentValue[index] ? formatBillion(earthData.presentValue[index].cumulative || 0) : formatBillion(pv)}</td>
            `;
            tbody.appendChild(row);
        });
    }

    updateStarlinkChart(earthData, inputs) {
        const canvas = document.getElementById('starlinkChart');
        if (!canvas) {
            console.warn('Starlink Chart canvas not found');
            return;
        }

        // Ensure the parent tab content is visible
        const tabContent = canvas.closest('.insights-tab-content');
        if (tabContent && tabContent.style.display === 'none') {
            // Tab is hidden, chart will be rendered when tab becomes visible
            return;
        }

        // Get current scenario (default to 'base')
        const activeScenario = document.querySelector('.scenario-btn.active')?.dataset.scenario || 'base';
        
        // Scenario multipliers for bandwidth
        const scenarioMultipliers = {
            bear: 0.7,   // 30% lower
            base: 1.0,   // Base case
            bull: 1.4    // 40% higher
        };
        const multiplier = scenarioMultipliers[activeScenario];

        const currentYear = new Date().getFullYear();
        const years = [];
        const bandwidth = []; // Tbps

        // Calculate bandwidth for 2025-2030 (6 years)
        if (earthData.constellation && earthData.constellation.length > 0) {
            // Use actual constellation data
            earthData.constellation.forEach((item, index) => {
                const year = currentYear + index;
                if (year >= 2025 && year <= 2030) {
                    years.push(year);
                    // Convert Gbps to Tbps and apply scenario multiplier
                    const bandwidthTbps = ((item.bandwidthCapacity || 0) / 1000) * multiplier;
                    bandwidth.push(bandwidthTbps);
                }
            });
        } else {
            // Fallback: calculate from inputs
            for (let year = 2025; year <= 2030; year++) {
                years.push(year);
                const yearIndex = year - currentYear;
                if (yearIndex >= 0) {
                    const cap = this.calculateBandwidthCapacity(yearIndex, inputs.earth);
                    bandwidth.push((cap / 1000) * multiplier); // Convert to Tbps
                } else {
                    bandwidth.push(0);
                }
            }
        }

        if (this.charts.starlink) {
            this.charts.starlink.destroy();
        }

        this.charts.starlink = new Chart(canvas, {
            type: 'line',
            data: {
                labels: years,
                datasets: [{
                    label: 'Bandwidth',
                    data: bandwidth,
                    borderColor: '#10b981',
                    backgroundColor: 'rgba(16, 185, 129, 0.2)',
                    fill: true,
                    tension: 0.4,
                    pointRadius: 3,
                    pointHoverRadius: 5,
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        titleColor: '#fff',
                        bodyColor: '#fff',
                        borderColor: '#10b981',
                        borderWidth: 1,
                        callbacks: {
                            label: function(context) {
                                return `Bandwidth: ${context.parsed.y.toFixed(0)} Tbps`;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        ticks: {
                            color: '#888',
                            font: { size: 11 }
                        },
                        grid: {
                            color: 'rgba(255, 255, 255, 0.1)'
                        },
                        title: {
                            display: true,
                            text: 'Year',
                            color: '#888',
                            font: { size: 12 }
                        }
                    },
                    y: {
                        ticks: {
                            color: '#888',
                            font: { size: 11 },
                            callback: function(value) {
                                if (value >= 1000) {
                                    return (value / 1000).toFixed(0) + 'K';
                                }
                                return value.toFixed(0);
                            }
                        },
                        grid: {
                            color: 'rgba(255, 255, 255, 0.1)'
                        },
                        title: {
                            display: true,
                            text: 'Bandwidth (Tbps)',
                            color: '#888',
                            font: { size: 12 }
                        },
                        beginAtZero: true
                    }
                }
            }
        });
    }

    updateLaunchChart(earthData, inputs) {
        const canvas = document.getElementById('launchChart');
        if (!canvas) {
            console.warn('Launch Chart canvas not found');
            return;
        }

        // Ensure the parent tab content is visible
        const tabContent = canvas.closest('.insights-tab-content');
        if (tabContent && tabContent.style.display === 'none') {
            // Tab is hidden, chart will be rendered when tab becomes visible
            return;
        }

        const years = [];
        const volume = [];
        const revenue = [];

        // Use actual data if available
        if (earthData.revenue && earthData.revenue.length > 0) {
            earthData.revenue.forEach((item, index) => {
                years.push(2024 + index);
                const vol = this.calculateLaunchVolume(index, inputs.earth);
                volume.push(vol);
                revenue.push(item.value * 0.2); // Estimate 20% launch revenue, already in billions
            });
        } else {
            for (let year = 0; year < 20; year++) {
                years.push(2024 + year);
                const vol = this.calculateLaunchVolume(year, inputs.earth);
                const price = this.calculateLaunchPrice(year, inputs.earth);
                volume.push(vol);
                revenue.push((vol * price) / 1000); // Convert to billions
            }
        }

        if (this.charts.launch) {
            this.charts.launch.destroy();
        }

        this.charts.launch = new Chart(canvas, {
            type: 'bar',
            data: {
                labels: years,
                datasets: [{
                    label: 'Volume (launches)',
                    data: volume,
                    backgroundColor: '#0066cc',
                    yAxisID: 'y',
                }, {
                    label: 'Revenue ($B)',
                    data: revenue,
                    type: 'line',
                    borderColor: '#10b981',
                    yAxisID: 'y1',
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        type: 'linear',
                        position: 'left',
                        title: { display: true, text: 'Volume' }
                    },
                    y1: {
                        type: 'linear',
                        position: 'right',
                        title: { display: true, text: 'Revenue ($B)' },
                        grid: { drawOnChartArea: false }
                    }
                }
            }
        });
    }

    async updateInsightsView(data) {
        if (!data) {
            return;
        }
        
        // Check if we have cached insights
        const cached = this.currentModelId && this.cachedAIInsights[this.currentModelId];
        const inputs = this.getInputs();
        
        if (cached) {
            console.log('✅ Using cached insights for display');
        } else {
            console.log('⏳ Generating insights (not yet cached)');
            // Trigger background generation if not already generating
            if (!this.generatingAIInsights) {
                this.generateAndCacheAIInsights(data).catch(err => {
                    console.error('Error generating insights:', err);
                });
            }
        }
        
        // Generate text-based insights (no charts) - will use cached data if available
        this.generateValueDrivers(data, inputs);
        this.generateRiskAssessment(data, inputs);
        
        // Since Terminal is now the default tab, generate dashboard layout if data is available
        const dashboardTab = document.querySelector('#insights .insights-tab[data-tab="dashboard"]');
        if (dashboardTab && dashboardTab.classList.contains('active') && data) {
            this.generateDashboardLayout(data, inputs).catch(err => {
                console.error('Error generating dashboard layout:', err);
            }).then(() => {
                // After layout is generated, trigger parallel insights load
                setTimeout(() => {
                    this.loadTerminalInsightsAfterModelLoad();
                }, 500);
            });
        }
    }

    async updateChartsView(data) {
        if (!data) {
            const chartsModelEl = document.getElementById('chartsCurrentModel');
            if (chartsModelEl) chartsModelEl.textContent = 'No model loaded';
            return;
        }
        
        // Update model name
        const modelName = this.currentModelName || 'Current Model';
        const chartsModelEl = document.getElementById('chartsCurrentModel');
        if (chartsModelEl) chartsModelEl.textContent = modelName;
        
        const inputs = this.getInputs();
        if (!inputs) return;

        // Determine which scenario to use for charts
        let cashFlywheelScenario = 'base';
        let marsCapitalScenario = 'base';
        
        // Update all charts
        try {
            if (data.earth) {
                this.updateCashFlywheelChart(data.earth, inputs, cashFlywheelScenario);
            }
        } catch (err) {
            console.error('Error updating cash flywheel chart:', err);
        }
        try {
            if (data.mars) {
                this.updateMarsCapitalChart(data.mars, inputs, marsCapitalScenario);
            }
        } catch (err) {
            console.error('Error updating Mars capital chart:', err);
        }
        
        // Enterprise Value Evolution uses Monte Carlo data if available
        try {
            await this.updateEnterpriseValueEvolutionChart();
        } catch (err) {
            console.error('Error updating enterprise value evolution chart:', err);
        }
        
        // Starship Cost Economics chart
        try {
            this.updateStarshipCostChart();
        } catch (err) {
            console.error('Error updating Starship cost chart:', err);
        }
        
        // Orbital Power Economics chart
        try {
            this.updateOrbitalPowerChart();
        } catch (err) {
            console.error('Error updating orbital power chart:', err);
        }
        
        // New insight charts - update the active tab's chart
        const activeTab = document.querySelector('.insights-tab.active')?.dataset.tab || 'cashFlywheel';
        if (data.earth) {
            if (activeTab === 'marginEvolution') {
                await this.updateMarginEvolutionChart(data.earth).catch(err => console.error('Margin evolution chart error:', err));
            } else if (activeTab === 'unitEconomics') {
                await this.updateUnitEconomicsChart(data.earth).catch(err => console.error('Unit economics chart error:', err));
            } else if (activeTab === 'capexEfficiency') {
                await this.updateCapexEfficiencyChart(data.earth).catch(err => console.error('Capex efficiency chart error:', err));
            }
        }
        
        console.log('Charts view updated. Active tab:', activeTab, 'Has earth data:', !!data.earth);
    }

    generateKeyInsights(data, inputs) {
        const container = document.getElementById('keyInsightsContent');
        if (!container) return;

        const totalValue = data.total?.value || 0;
        const earthValue = data.earth?.adjustedValue || 0;
        const marsValue = data.mars?.adjustedValue || 0;
        const earthPercent = totalValue > 0 ? (earthValue / totalValue) * 100 : 0;
        const marsPercent = totalValue > 0 ? (marsValue / totalValue) * 100 : 0;

        const formatBillion = (value) => {
            if (value >= 1000) return `$${(value / 1000).toFixed(1)}T`;
            return `$${value.toFixed(1)}B`;
        };

        const insights = [];

        // Valuation insight
        if (totalValue >= 2000) {
            insights.push({
                icon: 'zap',
                title: 'Trillion-Dollar Valuation',
                content: `This model projects a ${formatBillion(totalValue)} enterprise value, positioning SpaceX among the world's most valuable companies.`,
                color: '#0066cc'
            });
        }

        // Earth vs Mars balance
        if (earthPercent > 80) {
            insights.push({
                icon: 'globe',
                title: 'Earth-Dominant Value',
                content: `${earthPercent.toFixed(0)}% of value comes from Earth operations (Starlink + Launch), indicating strong near-term cash generation.`,
                color: '#10b981'
            });
        } else if (marsPercent > 30) {
            insights.push({
                icon: 'rocket',
                title: 'Mars Optionality Significant',
                content: `Mars operations represent ${marsPercent.toFixed(0)}% of total value, showing meaningful long-term optionality.`,
                color: '#f59e0b'
            });
        }

        // Starlink penetration insight
        const penetration = inputs.earth?.starlinkPenetration || 0;
        if (penetration > 0.20) {
            insights.push({
                icon: 'trending-up',
                title: 'Aggressive Penetration',
                content: `${(penetration * 100).toFixed(1)}% Starlink penetration suggests ambitious market capture assumptions.`,
                color: '#10b981'
            });
        } else if (penetration < 0.10) {
            insights.push({
                icon: 'alert-circle',
                title: 'Conservative Penetration',
                content: `${(penetration * 100).toFixed(1)}% penetration reflects conservative market assumptions.`,
                color: '#f59e0b'
            });
        }

        // Mars timing insight
        const firstColonyYear = inputs.mars?.firstColonyYear || 2030;
        const currentYear = new Date().getFullYear();
        const yearsToColony = firstColonyYear - currentYear;
        if (yearsToColony <= 5) {
            insights.push({
                icon: 'calendar',
                title: 'Aggressive Mars Timeline',
                content: `First colony targeted for ${firstColonyYear} (${yearsToColony} years) - an ambitious timeline requiring rapid Starship development.`,
                color: '#f59e0b'
            });
        }

        // Discount rate insight
        const discountRate = inputs.financial?.discountRate || 0.12;
        if (discountRate < 0.10) {
            insights.push({
                icon: 'percent',
                title: 'Low Discount Rate',
                content: `${(discountRate * 100).toFixed(1)}% discount rate suggests high confidence in execution and low perceived risk.`,
                color: '#10b981'
            });
        } else if (discountRate > 0.15) {
            insights.push({
                icon: 'percent',
                title: 'High Discount Rate',
                content: `${(discountRate * 100).toFixed(1)}% discount rate reflects higher risk assumptions or uncertainty.`,
                color: '#ef4444'
            });
        }

        // Render insights
        container.innerHTML = insights.map(insight => `
            <div class="insight-card" style="border-left: 3px solid ${insight.color}; padding: var(--spacing-md); background: var(--surface); border-radius: var(--radius);">
                <div style="display: flex; align-items: start; gap: var(--spacing-sm);">
                    <i data-lucide="${insight.icon}" style="width: 20px; height: 20px; color: ${insight.color}; flex-shrink: 0; margin-top: 2px;"></i>
                    <div style="flex: 1;">
                        <h4 style="margin: 0 0 8px 0; font-size: 14px; font-weight: 600; color: var(--text-primary);">${insight.title}</h4>
                        <p style="margin: 0; font-size: 13px; color: var(--text-secondary); line-height: 1.5;">${insight.content}</p>
                    </div>
                </div>
            </div>
        `).join('');

        if (window.lucide) window.lucide.createIcons();
    }

    generateValueDrivers(data, inputs) {
        const container = document.getElementById('valueDriversContent');
        if (!container) return;

        const drivers = [];

        // Starlink penetration impact
        const penetration = inputs.earth?.starlinkPenetration || 0;
        drivers.push({
            name: 'Starlink Penetration',
            value: `${(penetration * 100).toFixed(1)}%`,
            impact: penetration > 0.15 ? 'High' : penetration > 0.10 ? 'Medium' : 'Low',
            description: 'Market penetration rate for Starlink services'
        });

        // Launch volume
        const launchVolume = inputs.earth?.launchVolume || 0;
        drivers.push({
            name: 'Launch Volume',
            value: `${launchVolume}/year`,
            impact: launchVolume > 150 ? 'High' : launchVolume > 100 ? 'Medium' : 'Low',
            description: 'Annual launch cadence'
        });

        // First colony year
        const firstColonyYear = inputs.mars?.firstColonyYear || 2030;
        drivers.push({
            name: 'Mars Timeline',
            value: `${firstColonyYear}`,
            impact: firstColonyYear <= 2030 ? 'High' : firstColonyYear <= 2035 ? 'Medium' : 'Low',
            description: 'First colony establishment year'
        });

        // Discount rate
        const discountRate = inputs.financial?.discountRate || 0.12;
        drivers.push({
            name: 'Discount Rate',
            value: `${(discountRate * 100).toFixed(1)}%`,
            impact: discountRate < 0.11 ? 'High' : discountRate < 0.13 ? 'Medium' : 'Low',
            description: 'Cost of capital / risk adjustment'
        });

        // Dilution factor
        const dilution = inputs.financial?.dilutionFactor || 0.15;
        drivers.push({
            name: 'Dilution Factor',
            value: `${(dilution * 100).toFixed(1)}%`,
            impact: dilution < 0.12 ? 'High' : dilution < 0.18 ? 'Medium' : 'Low',
            description: 'Expected equity dilution from future raises'
        });

        const impactColors = {
            High: '#10b981',
            Medium: '#f59e0b',
            Low: '#ef4444'
        };

        container.innerHTML = drivers.map(driver => `
            <div class="metric-card-small" style="padding: var(--spacing-md);">
                <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 8px;">
                    <span class="metric-label-small">${driver.name}</span>
                    <span style="padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 600; background: ${impactColors[driver.impact]}20; color: ${impactColors[driver.impact]};">${driver.impact}</span>
                </div>
                <div class="metric-value-small" style="font-size: 20px; margin-bottom: 4px;">${driver.value}</div>
                <div style="font-size: 11px; color: var(--text-secondary);">${driver.description}</div>
            </div>
        `).join('');
    }

    generateRiskAssessment(data, inputs) {
        const container = document.getElementById('riskAssessmentContent');
        if (!container) return;

        const risks = [];

        // Mars timing risk
        const firstColonyYear = inputs.mars?.firstColonyYear || 2030;
        const currentYear = new Date().getFullYear();
        if (firstColonyYear - currentYear < 6) {
            risks.push({
                severity: 'High',
                category: 'Execution',
                title: 'Aggressive Mars Timeline',
                description: `First colony targeted for ${firstColonyYear} leaves limited margin for delays in Starship development and Mars infrastructure.`,
                mitigation: 'Consider scenario with 5-10 year delay buffer'
            });
        }

        // High penetration risk
        const penetration = inputs.earth?.starlinkPenetration || 0;
        if (penetration > 0.25) {
            risks.push({
                severity: 'Medium',
                category: 'Market',
                title: 'High Penetration Assumption',
                description: `${(penetration * 100).toFixed(1)}% penetration may face regulatory or competitive headwinds.`,
                mitigation: 'Monitor competitive landscape and regulatory developments'
            });
        }

        // High discount rate risk
        const discountRate = inputs.financial?.discountRate || 0.12;
        if (discountRate > 0.15) {
            risks.push({
                severity: 'Medium',
                category: 'Financial',
                title: 'High Cost of Capital',
                description: `${(discountRate * 100).toFixed(1)}% discount rate suggests significant execution or market risk.`,
                mitigation: 'Review risk factors and consider stress testing'
            });
        }

        // Low launch volume risk
        const launchVolume = inputs.earth?.launchVolume || 0;
        if (launchVolume < 50) {
            risks.push({
                severity: 'Medium',
                category: 'Operations',
                title: 'Low Launch Cadence',
                description: `${launchVolume} launches/year may limit revenue growth and cost reduction from scale.`,
                mitigation: 'Assess Starship reusability targets and market demand'
            });
        }

        // High dilution risk
        const dilution = inputs.financial?.dilutionFactor || 0.15;
        if (dilution > 0.25) {
            risks.push({
                severity: 'High',
                category: 'Financial',
                title: 'Significant Dilution Expected',
                description: `${(dilution * 100).toFixed(1)}% dilution suggests substantial future capital needs.`,
                mitigation: 'Model alternative financing scenarios (debt, strategic partners)'
            });
        }

        const severityColors = {
            High: '#ef4444',
            Medium: '#f59e0b',
            Low: '#10b981'
        };

        if (risks.length === 0) {
            container.innerHTML = `
                <div style="padding: var(--spacing-md); background: var(--surface); border-radius: var(--radius); text-align: center; color: var(--text-secondary);">
                    <i data-lucide="check-circle" style="width: 32px; height: 32px; color: #10b981; margin-bottom: 8px;"></i>
                    <p style="margin: 0;">No significant risk factors identified for this model's parameters.</p>
                </div>
            `;
        } else {
            container.innerHTML = risks.map(risk => `
                <div class="insight-card" style="border-left: 3px solid ${severityColors[risk.severity]}; padding: var(--spacing-md); background: var(--surface); border-radius: var(--radius); margin-bottom: var(--spacing-sm);">
                    <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 8px;">
                        <div>
                            <span style="padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 600; background: ${severityColors[risk.severity]}20; color: ${severityColors[risk.severity]}; margin-right: 8px;">${risk.severity}</span>
                            <span style="font-size: 11px; color: var(--text-secondary);">${risk.category}</span>
                        </div>
                    </div>
                    <h4 style="margin: 0 0 8px 0; font-size: 14px; font-weight: 600; color: var(--text-primary);">${risk.title}</h4>
                    <p style="margin: 0 0 8px 0; font-size: 13px; color: var(--text-secondary); line-height: 1.5;">${risk.description}</p>
                    <div style="padding-top: 8px; border-top: 1px solid var(--border-color);">
                        <span style="font-size: 12px; color: var(--text-secondary);"><strong>Mitigation:</strong> ${risk.mitigation}</span>
                    </div>
                </div>
            `).join('');
        }

        if (window.lucide) window.lucide.createIcons();
    }

    updateCashFlywheelChart(earthData, inputs, scenario = 'base') {
        const ctx = document.getElementById('cashFlywheelChart');
        if (!ctx) return;

        const scenarioMultipliers = {
            bear: 0.7,
            base: 1.0,
            bull: 1.4
        };
        const multiplier = scenarioMultipliers[scenario] || 1.0;

        const currentYear = new Date().getFullYear();
        const years = [];
        const revenue = [];
        const freeCashFlow = [];
        const costs = [];

        // Check if we have detailed time-series data
        if (earthData.revenue && earthData.cashFlow && earthData.costs && 
            Array.isArray(earthData.revenue) && earthData.revenue.length > 0) {
            // Use actual time-series data
            earthData.revenue.forEach((item, index) => {
                const year = currentYear + index;
                if (year <= 2030) {
                    years.push(year);
                    const revValue = typeof item === 'object' ? item.value : item;
                    revenue.push(revValue * multiplier);
                    
                    const costItem = earthData.costs[index];
                    const costValue = typeof costItem === 'object' ? costItem.value : costItem;
                    costs.push(costValue * multiplier);
                    
                    const cfItem = earthData.cashFlow[index];
                    const cfValue = typeof cfItem === 'object' ? cfItem.value : cfItem;
                    // FCF = Cash Flow - Capex (approximate)
                    const capex = earthData.capex && earthData.capex[index] ? 
                        (typeof earthData.capex[index] === 'object' ? earthData.capex[index].total / 1000 : earthData.capex[index] / 1000) : 0;
                    freeCashFlow.push((cfValue - capex) * multiplier);
                }
            });
        } else {
            // Fallback: Generate synthetic time-series data from summary values or inputs
            // This handles Monte Carlo results which only have summary statistics
            const baseRevenue = earthData.adjustedValue ? earthData.adjustedValue * 1.2 : 150; // Estimate revenue from valuation
            const baseCosts = baseRevenue * 0.07; // ~7% cost ratio
            const baseCashFlow = baseRevenue - baseCosts;
            
            // Generate 7 years of data (2024-2030)
            for (let i = 0; i < 7; i++) {
                const year = currentYear + i;
                if (year <= 2030) {
                    years.push(year);
                    // Growth model: revenue grows, costs decline as percentage
                    const growthFactor = Math.pow(1.15, i); // 15% annual growth
                    const costDeclineFactor = Math.pow(0.95, i); // 5% cost efficiency improvement
                    
                    const yearRevenue = baseRevenue * growthFactor * multiplier;
                    const yearCosts = baseCosts * growthFactor * costDeclineFactor * multiplier;
                    const yearCashFlow = yearRevenue - yearCosts;
                    const yearFCF = yearCashFlow * 0.85; // Assume 15% capex
                    
                    revenue.push(yearRevenue);
                    costs.push(yearCosts);
                    freeCashFlow.push(yearFCF);
                }
            }
        }

        if (this.charts.cashFlywheel) {
            this.charts.cashFlywheel.destroy();
        }

        this.charts.cashFlywheel = new Chart(ctx, {
            type: 'line',
            data: {
                labels: years,
                datasets: [{
                    label: 'Revenue',
                    data: revenue,
                    borderColor: '#0066cc',
                    backgroundColor: 'rgba(0, 102, 204, 0.1)',
                    fill: false,
                    tension: 0.4,
                    borderWidth: 2
                }, {
                    label: 'Free Cash Flow',
                    data: freeCashFlow,
                    borderColor: '#10b981',
                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
                    fill: false,
                    tension: 0.4,
                    borderWidth: 2
                }, {
                    label: 'Costs',
                    data: costs,
                    borderColor: '#ef4444',
                    backgroundColor: 'rgba(239, 68, 68, 0.1)',
                    fill: false,
                    tension: 0.4,
                    borderWidth: 2,
                    borderDash: [5, 5]
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'top'
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const value = context.parsed.y;
                                if (value >= 1000) {
                                    return `${context.dataset.label}: $${(value / 1000).toFixed(2)}T`;
                                }
                                return `${context.dataset.label}: $${value.toFixed(2)}B`;
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        title: {
                            display: true,
                            text: 'Value ($B)'
                        },
                        ticks: {
                            callback: function(value) {
                                if (value >= 1000) {
                                    return '$' + (value / 1000).toFixed(1) + 'T';
                                }
                                return '$' + value.toFixed(0) + 'B';
                            }
                        },
                        beginAtZero: true
                    },
                    x: {
                        title: {
                            display: true,
                            text: 'Year'
                        }
                    }
                }
            }
        });
    }

    updateMarsCapitalChart(marsData, inputs, scenario = 'base') {
        const ctx = document.getElementById('marsCapitalChart');
        if (!ctx) return;

        const scenarioMultipliers = {
            bear: 0.7,
            base: 1.0,
            bull: 1.4
        };
        const multiplier = scenarioMultipliers[scenario] || 1.0;

        const currentYear = new Date().getFullYear();
        const years = [];
        const bookValue = [];
        const optimusFleet = [];

        // Calculate Mars capital accumulation
        // This is a simplified model - in reality this would track cargo and Optimus deployments
        let accumulatedValue = 0;
        let optimusCount = 0;
        
        for (let year = 2025; year <= 2040; year++) {
            years.push(year);
            
            // Simplified: accumulate value based on Mars operations
            // In reality, this would track actual cargo deliveries and Optimus deployments
            const yearIndex = year - currentYear;
            if (yearIndex >= 0 && marsData.underlyingValue) {
                // Approximate accumulation: assume linear growth with some compounding
                const baseValue = (marsData.underlyingValue / 15) * (yearIndex + 1); // Spread over 15 years
                accumulatedValue = baseValue * multiplier;
                bookValue.push(accumulatedValue);
                
                // Optimus fleet: assume deployment rate increases over time
                const optimusRate = Math.max(0, (yearIndex - 5) * 50000); // Start deploying after 5 years
                optimusCount = optimusRate * multiplier;
                optimusFleet.push(optimusCount);
            } else {
                bookValue.push(0);
                optimusFleet.push(0);
            }
        }

        if (this.charts.marsCapital) {
            this.charts.marsCapital.destroy();
        }

        this.charts.marsCapital = new Chart(ctx, {
            type: 'line',
            data: {
                labels: years,
                datasets: [{
                    label: 'Mars Accumulated Book Value',
                    data: bookValue,
                    borderColor: '#10b981',
                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
                    fill: true,
                    tension: 0.4,
                    borderWidth: 2,
                    yAxisID: 'y'
                }, {
                    label: 'Optimus Fleet',
                    data: optimusFleet,
                    borderColor: '#f59e0b',
                    backgroundColor: 'rgba(245, 158, 11, 0.1)',
                    fill: false,
                    tension: 0.4,
                    borderWidth: 2,
                    yAxisID: 'y1'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'top'
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                if (context.datasetIndex === 0) {
                                    const value = context.parsed.y;
                                    if (value >= 1000) {
                                        return `Book Value: $${(value / 1000).toFixed(2)}T`;
                                    }
                                    return `Book Value: $${value.toFixed(2)}B`;
                                } else {
                                    return `Optimus Fleet: ${context.parsed.y.toLocaleString()}`;
                                }
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        type: 'linear',
                        position: 'left',
                        title: {
                            display: true,
                            text: 'Book Value ($B)'
                        },
                        ticks: {
                            callback: function(value) {
                                if (value >= 1000) {
                                    return '$' + (value / 1000).toFixed(1) + 'T';
                                }
                                return '$' + value.toFixed(0) + 'B';
                            }
                        },
                        beginAtZero: true
                    },
                    y1: {
                        type: 'linear',
                        position: 'right',
                        title: {
                            display: true,
                            text: 'Optimus Units'
                        },
                        grid: {
                            drawOnChartArea: false
                        },
                        ticks: {
                            callback: function(value) {
                                if (value >= 1000000) {
                                    return (value / 1000000).toFixed(1) + 'M';
                                }
                                if (value >= 1000) {
                                    return (value / 1000).toFixed(0) + 'K';
                                }
                                return value.toFixed(0);
                            }
                        }
                    },
                    x: {
                        title: {
                            display: true,
                            text: 'Year'
                        }
                    }
                }
            }
        });
    }

    async updateEnterpriseValueEvolutionChart() {
        const ctx = document.getElementById('enterpriseValueEvolutionChart');
        if (!ctx) return;

        if (this.charts.enterpriseValueEvolution) {
            this.charts.enterpriseValueEvolution.destroy();
        }

        // Try to use Monte Carlo distribution data if available
        // This should show the probability distributions for 2030 vs 2040
        const baseInputs = this.getInputs();
        if (!baseInputs) {
            // Show placeholder if no inputs
            this.charts.enterpriseValueEvolution = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: ['2030', '2040'],
                    datasets: [{
                        label: 'Base Case',
                        data: [2500, 12800],
                        borderColor: '#0066cc',
                        backgroundColor: 'rgba(0, 102, 204, 0.1)',
                        fill: false,
                        tension: 0.4,
                        borderWidth: 2
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { position: 'top' },
                        tooltip: {
                            callbacks: {
                                label: function(context) {
                                    return `Enterprise Value: $${(context.parsed.y / 1000).toFixed(2)}T`;
                                }
                            }
                        }
                    },
                    scales: {
                        y: {
                            title: { display: true, text: 'Enterprise Value ($T)' },
                            ticks: {
                                callback: function(value) {
                                    return '$' + (value / 1000).toFixed(1) + 'T';
                                }
                            },
                            beginAtZero: true
                        },
                        x: {
                            title: { display: true, text: 'Year' }
                        }
                    }
                }
            });
            return;
        }

        // Run Monte Carlo for both scenarios to get distributions
        try {
            const distributions = this.currentMonteCarloConfig?.distributions || 
                this.getDefaultMonteCarloDistributions();
            const runs = this.currentMonteCarloConfig?.runs || 5000;

            const response = await fetch('/api/monte-carlo/scenarios', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    baseInputs,
                    distributions,
                    runs,
                    scenarios: ['2030-earth-only', '2040-earth-mars']
                })
            });

            const result = await response.json();
            
            if (result.success && result.data) {
                // Use the distribution data to create probability density curves
                this.renderEnterpriseValueDistributions(ctx, result.data);
            } else {
                // Fallback to scenario comparison if Monte Carlo fails
                this.renderEnterpriseValueFromScenarios(ctx);
            }
        } catch (error) {
            console.error('Error loading Monte Carlo data for EV Evolution:', error);
            // Fallback to scenario comparison
            this.renderEnterpriseValueFromScenarios(ctx);
        }
    }

    renderEnterpriseValueDistributions(ctx, monteCarloData) {
        // Extract distribution data for 2030 and 2040
        const data2030 = monteCarloData['2030-earth-only'];
        const data2040 = monteCarloData['2040-earth-mars'];

        if (!data2030 || !data2040 || !data2030.statistics?.distribution || !data2040.statistics?.distribution) {
            this.renderEnterpriseValueFromScenarios(ctx);
            return;
        }

        const dist2030 = data2030.statistics.distribution;
        const dist2040 = data2040.statistics.distribution;

        // Normalize histograms to probability density (percentage)
        const normalizeHistogram = (histogram) => {
            const sum = histogram.reduce((a, b) => a + b, 0);
            return histogram.map(h => (h / sum) * 100);
        };

        const normalized2030 = normalizeHistogram(dist2030.histogram || []);
        const normalized2040 = normalizeHistogram(dist2040.histogram || []);

        // Use bin centers for x-axis
        const binCenters2030 = dist2030.binCenters || [];
        const binCenters2040 = dist2040.binCenters || [];

        // Convert to trillions for display
        const formatBinCenter = (value) => {
            if (value >= 1000) return (value / 1000).toFixed(1);
            return value.toFixed(0);
        };

        this.charts.enterpriseValueEvolution = new Chart(ctx, {
            type: 'line',
            data: {
                labels: binCenters2030.map(formatBinCenter),
                datasets: [{
                    label: '2030 EV',
                    data: normalized2030,
                    borderColor: '#0066cc',
                    backgroundColor: 'rgba(0, 102, 204, 0.1)',
                    fill: true,
                    tension: 0.4,
                    borderWidth: 2,
                    pointRadius: 0
                }, {
                    label: '2040 EV',
                    data: normalized2040.slice(0, normalized2030.length), // Match length
                    borderColor: '#ef4444',
                    backgroundColor: 'rgba(239, 68, 68, 0.1)',
                    fill: true,
                    tension: 0.4,
                    borderWidth: 2,
                    pointRadius: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'top'
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const binValue = binCenters2030[context.dataIndex];
                                const prob = context.parsed.y;
                                const value = binValue >= 1000 ? `$${(binValue / 1000).toFixed(2)}T` : `$${binValue.toFixed(0)}B`;
                                return `${context.dataset.label}: ${value} (${prob.toFixed(2)}%)`;
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        title: {
                            display: true,
                            text: 'Probability Density (%)'
                        },
                        beginAtZero: true
                    },
                    x: {
                        title: {
                            display: true,
                            text: 'Enterprise Value'
                        },
                        ticks: {
                            callback: function(value, index) {
                                const binValue = binCenters2030[index];
                                if (binValue >= 1000) return `$${(binValue / 1000).toFixed(1)}T`;
                                return `$${binValue.toFixed(0)}B`;
                            }
                        }
                    }
                }
            }
        });
    }

    renderEnterpriseValueFromScenarios(ctx) {
        // Fallback: use scenario comparison data or current data
        if (!this.currentData) {
            // Generate placeholder data if no data available
            this.charts.enterpriseValueEvolution = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: ['2030', '2040'],
                    datasets: [{
                        label: 'Enterprise Value',
                        data: [1.2, 2.5], // Trillions
                        borderColor: '#0066cc',
                        backgroundColor: 'rgba(0, 102, 204, 0.1)',
                        fill: false,
                        tension: 0.4,
                        borderWidth: 2
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { position: 'top' },
                        tooltip: {
                            callbacks: {
                                label: function(context) {
                                    return `Enterprise Value: $${context.parsed.y.toFixed(2)}T`;
                                }
                            }
                        }
                    },
                    scales: {
                        y: {
                            title: { display: true, text: 'Enterprise Value ($T)' },
                            beginAtZero: true
                        },
                        x: { title: { display: true, text: 'Year' } }
                    }
                }
            });
            return;
        }

        const scenarios = this.currentData.scenarios;
        
        // Try scenarios first, then fall back to current data
        let earth2030 = 0;
        let total2040 = 0;
        
        if (scenarios) {
            earth2030 = scenarios.earth2030?.earthResults?.enterpriseValueFromEBITDA || scenarios.earth2030?.earthResults?.terminalValue || 0;
            const earthMars2040 = scenarios.earthMars2040?.earthResults?.enterpriseValueFromEBITDA || scenarios.earthMars2040?.earthResults?.terminalValue || 0;
            const mars2040 = scenarios.earthMars2040?.marsResults?.expectedValue || 0;
            total2040 = earthMars2040 + mars2040;
        } else {
            // Use current data values
            earth2030 = this.currentData.earth?.adjustedValue || this.currentData.total?.value * 0.95 || 0;
            total2040 = this.currentData.total?.value || earth2030 * 2 || 0;
        }
        
        // Convert to trillions if needed
        if (earth2030 > 0 && earth2030 < 1000) earth2030 = earth2030; // Already in billions
        else if (earth2030 >= 1000) earth2030 = earth2030 / 1000; // Convert to trillions
        
        if (total2040 > 0 && total2040 < 1000) total2040 = total2040; // Already in billions
        else if (total2040 >= 1000) total2040 = total2040 / 1000; // Convert to trillions

        this.charts.enterpriseValueEvolution = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: ['2030', '2040'],
                datasets: [{
                    label: 'Enterprise Value',
                    data: [earth2030 / 1000, total2040 / 1000], // Convert to trillions
                    backgroundColor: ['#0066cc', '#ef4444'],
                    borderColor: ['#0052a3', '#dc2626'],
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return `Enterprise Value: $${context.parsed.y.toFixed(2)}T`;
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        title: {
                            display: true,
                            text: 'Enterprise Value ($T)'
                        },
                        beginAtZero: true
                    },
                    x: {
                        title: {
                            display: true,
                            text: 'Year'
                        }
                    }
                }
            }
        });
    }

    renderMarsScenarios(scenarios) {
        const grid = document.getElementById('marsScenariosGrid');
        if (!grid) return;

        grid.innerHTML = '';

        const formatBillion = (value) => {
            if (!value && value !== 0) return 'N/A';
            // Values are already in billions
            // If >= 1000 billion, display as trillions
            if (value >= 1000) {
                return `$${(value / 1000).toFixed(1)}T`;
            }
            return `$${value.toFixed(1)}B`;
        };

        // Handle both array and object formats
        const scenariosArray = Array.isArray(scenarios) ? scenarios : Object.values(scenarios || {});

        scenariosArray.forEach(scenario => {
            if (!scenario) return;
            const card = document.createElement('div');
            card.className = 'scenario-card';
            card.innerHTML = `
                <h4>${scenario.name || 'Unknown Scenario'}</h4>
                <div class="metric-value-small">${formatBillion(scenario.value || scenario.optionValue || 0)}</div>
                <div class="metric-label-small">Probability: ${((scenario.probability || 0.33) * 100).toFixed(0)}%</div>
            `;
            grid.appendChild(card);
        });
    }

    renderMarsScenariosDetail(scenarios) {
        const grid = document.getElementById('marsScenariosGridDetail');
        if (!grid) return;

        grid.innerHTML = '';

        const formatBillion = (value) => {
            if (!value && value !== 0) return 'N/A';
            // Values are already in billions
            // If >= 1000 billion, display as trillions
            if (value >= 1000) {
                return `$${(value / 1000).toFixed(1)}T`;
            }
            return `$${value.toFixed(1)}B`;
        };

        // Handle both array and object formats
        let scenariosArray = [];
        
        if (Array.isArray(scenarios)) {
            scenariosArray = scenarios;
        } else if (scenarios && typeof scenarios === 'object') {
            // Convert object with keys (bear, base, bull) to array
            scenariosArray = Object.keys(scenarios).map(key => {
                const scenario = scenarios[key];
                return {
                    key: key,
                    name: scenario.name || key.charAt(0).toUpperCase() + key.slice(1) + ' Case',
                    ...scenario
                };
            });
        }

        // Generate default scenarios if none provided or empty
        if (scenariosArray.length === 0) {
            const marsData = this.currentData?.mars;
            const baseValue = marsData?.optionValue || marsData?.expectedValue || marsData?.adjustedValue || 0;
            
            scenariosArray = [
                { 
                    name: 'Bear Case', 
                    value: baseValue * 0.6, 
                    probability: 0.2, 
                    description: 'Conservative assumptions',
                    inputs: {
                        mars: {
                            firstColonyYear: 2035,
                            transportCostDecline: 0.15,
                            populationGrowth: 0.30
                        }
                    }
                },
                { 
                    name: 'Base Case', 
                    value: baseValue, 
                    probability: 0.5, 
                    description: 'Moderate assumptions',
                    inputs: {
                        mars: {
                            firstColonyYear: 2030,
                            transportCostDecline: 0.20,
                            populationGrowth: 0.50
                        }
                    }
                },
                { 
                    name: 'Bull Case', 
                    value: baseValue * 1.5, 
                    probability: 0.3, 
                    description: 'Optimistic assumptions',
                    inputs: {
                        mars: {
                            firstColonyYear: 2028,
                            transportCostDecline: 0.30,
                            populationGrowth: 0.70
                        }
                    }
                }
            ];
        }

        scenariosArray.forEach(scenario => {
            if (!scenario) return;
            const card = document.createElement('div');
            card.className = 'scenario-card';
            
            // Build detailed card content
            let cardContent = `
                <h4>${scenario.name || 'Unknown Scenario'}</h4>
                <div class="metric-value-small">${formatBillion(scenario.value || scenario.optionValue || scenario.expectedValue || 0)}</div>
                <div class="metric-label-small" style="margin-top: 8px;">Probability: ${((scenario.probability || 0.33) * 100).toFixed(0)}%</div>
            `;

            // Add description if available
            if (scenario.description) {
                cardContent += `<div class="metric-label-small" style="margin-top: 4px; color: var(--text-secondary); font-size: 12px;">${scenario.description}</div>`;
            }

            // Add Mars-specific inputs if available
            if (scenario.inputs && scenario.inputs.mars) {
                const mars = scenario.inputs.mars;
                cardContent += `
                    <div style="margin-top: 12px; padding-top: 12px; border-top: 1px solid var(--border-color);">
                        <div class="metric-label-small" style="font-size: 11px; color: var(--text-secondary);">
                            <div>Colony Year: ${mars.firstColonyYear || 'N/A'}</div>
                            <div>Transport Cost Decline: ${mars.transportCostDecline ? (mars.transportCostDecline * 100).toFixed(1) + '%' : 'N/A'}</div>
                            <div>Population Growth: ${mars.populationGrowth ? (mars.populationGrowth * 100).toFixed(1) + '%' : 'N/A'}</div>
                        </div>
                    </div>
                `;
            }

            card.innerHTML = cardContent;
            grid.appendChild(card);
        });
    }

    updateMarsOptionChart(marsData) {
        const canvas = document.getElementById('marsOptionChart');
        if (!canvas) {
            console.warn('Mars Option Chart canvas not found');
            return;
        }

        // Ensure the parent tab content is visible
        const tabContent = canvas.closest('.insights-tab-content');
        if (tabContent && tabContent.style.display === 'none') {
            // Tab is hidden, chart will be rendered when tab becomes visible
            return;
        }

        // Simulate option payoff curve
        const underlyingValues = [];
        const payoffs = [];
        const strike = marsData.strikePrice || 500;

        for (let i = 0; i <= 2000; i += 50) {
            underlyingValues.push(i);
            payoffs.push(Math.max(i - strike, 0));
        }

        if (this.charts.marsOption) {
            this.charts.marsOption.destroy();
        }

        this.charts.marsOption = new Chart(canvas, {
            type: 'line',
            data: {
                labels: underlyingValues,
                datasets: [{
                    label: 'Option Payoff',
                    data: payoffs,
                    borderColor: '#10b981',
                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: true }
                },
                scales: {
                    y: { title: { display: true, text: 'Payoff ($B)' } },
                    x: { title: { display: true, text: 'Underlying Value ($B)' } }
                }
            }
        });
    }

    updateOrbitalPowerChart() {
        const ctx = document.getElementById('orbitalPowerChart');
        if (!ctx) return;

        if (this.charts.orbitalPower) {
            this.charts.orbitalPower.destroy();
        }

        // Launch cost per kg (x-axis) - decreasing from 2000 to 50
        const launchCosts = [2000, 1850, 1700, 1550, 1400, 1250, 1100, 950, 800, 650, 500, 350, 200, 50];
        
        // Cost per watt ($/W) for different technologies
        // Starlink (HEO) - gray
        const starlinkHEO = [25.5, 24.2, 22.9, 21.6, 20.3, 19.0, 17.7, 16.4, 15.1, 13.8, 12.5, 11.2, 10.3, 9.5];
        
        // Compute-Optimized Starlink (HEO) - green
        const computeOptimized = [18.5, 17.3, 16.1, 14.9, 13.7, 12.5, 11.3, 10.1, 8.9, 7.7, 6.5, 6.0, 5.7, 5.5];
        
        // Thin-PV (HEO) - pink/red
        const thinPV = [17.5, 16.4, 15.3, 14.2, 13.1, 12.0, 10.9, 9.8, 9.2, 9.0, 8.8, 8.7, 8.6, 8.5];
        
        // Terrestrial Solar + Grid + DC M&E - blue (flat)
        const terrestrialSolar = Array(14).fill(11.5);

        this.charts.orbitalPower = new Chart(ctx, {
            type: 'line',
            data: {
                labels: launchCosts.map(c => `$${c.toLocaleString()}/kg`),
                datasets: [{
                    label: 'Starlink (HEO)',
                    data: starlinkHEO,
                    borderColor: '#9ca3af',
                    backgroundColor: 'rgba(156, 163, 175, 0.1)',
                    borderWidth: 2,
                    pointRadius: 4,
                    pointHoverRadius: 6,
                    fill: false,
                    tension: 0.3
                }, {
                    label: 'Compute-Optimized Starlink (HEO)',
                    data: computeOptimized,
                    borderColor: '#10b981',
                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
                    borderWidth: 2,
                    pointRadius: 4,
                    pointHoverRadius: 6,
                    fill: false,
                    tension: 0.3
                }, {
                    label: 'Thin-PV (HEO)',
                    data: thinPV,
                    borderColor: '#ec4899',
                    backgroundColor: 'rgba(236, 72, 153, 0.1)',
                    borderWidth: 2,
                    pointRadius: 4,
                    pointHoverRadius: 6,
                    fill: false,
                    tension: 0.3
                }, {
                    label: 'Terrestrial Solar + Grid + DC M&E',
                    data: terrestrialSolar,
                    borderColor: '#0066cc',
                    backgroundColor: 'rgba(0, 102, 204, 0.1)',
                    borderWidth: 2,
                    pointRadius: 4,
                    pointHoverRadius: 6,
                    fill: false,
                    tension: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: {
                    mode: 'index',
                    intersect: false
                },
                plugins: {
                    legend: {
                        position: 'top'
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return `${context.dataset.label}: $${context.parsed.y.toFixed(1)}/W`;
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        title: {
                            display: true,
                            text: '$/W'
                        },
                        beginAtZero: true,
                        ticks: {
                            callback: function(value) {
                                return '$' + value.toFixed(0) + '/W';
                            }
                        }
                    },
                    x: {
                        title: {
                            display: true,
                            text: 'Launch Cost ($/kg)'
                        },
                        reverse: true, // Reverse x-axis to show decreasing cost from left to right
                        ticks: {
                            maxRotation: 45,
                            minRotation: 45,
                            callback: function(value, index) {
                                // Show every other label to avoid crowding
                                if (index % 2 === 0) {
                                    return '$' + launchCosts[index].toLocaleString();
                                }
                                return '';
                            }
                        }
                    }
                }
            }
        });
    }

    updateStarshipCostChart() {
        const ctx = document.getElementById('starshipCostChart');
        if (!ctx) return;

        if (this.charts.starshipCost) {
            this.charts.starshipCost.destroy();
        }

        // Flights per Starship (x-axis)
        const flightsPerStarship = ['Expendable', 10, 20, 30];
        
        // Cost per kg for different production scenarios
        // Using Wright's Law: cost declines with cumulative production
        const costToday = [670, 150, 120, 110]; // $/kg at current production
        const cost1kPerYear = [150, 50, 30, 25]; // $/kg at 1k/yr production
        const cost10kPerYear = [50, 15, 10, 8]; // $/kg at 10k/yr production

        this.charts.starshipCost = new Chart(ctx, {
            type: 'line',
            data: {
                labels: flightsPerStarship.map(f => f === 'Expendable' ? 'Expendable Flights' : `${f} Flights`),
                datasets: [{
                    label: '$/kg (today)',
                    data: costToday,
                    borderColor: '#ef4444',
                    backgroundColor: 'rgba(239, 68, 68, 0.1)',
                    borderWidth: 2,
                    pointRadius: 5,
                    pointHoverRadius: 7,
                    fill: false,
                    tension: 0.3
                }, {
                    label: '$/kg (1k/yr Production)',
                    data: cost1kPerYear,
                    borderColor: '#0066cc',
                    backgroundColor: 'rgba(0, 102, 204, 0.1)',
                    borderWidth: 2,
                    pointRadius: 5,
                    pointHoverRadius: 7,
                    fill: false,
                    tension: 0.3
                }, {
                    label: '$/kg (10k/yr Production)',
                    data: cost10kPerYear,
                    borderColor: '#10b981',
                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
                    borderWidth: 2,
                    pointRadius: 5,
                    pointHoverRadius: 7,
                    fill: false,
                    tension: 0.3
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'top'
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return `$${context.parsed.y.toFixed(0)}/kg`;
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        title: {
                            display: true,
                            text: '$/kg'
                        },
                        beginAtZero: true,
                        ticks: {
                            callback: function(value) {
                                return '$' + value.toFixed(0) + '/kg';
                            }
                        }
                    },
                    x: {
                        title: {
                            display: true,
                            text: 'Flights per Starship'
                        }
                    }
                }
            }
        });
    }

    updateMarsPopulationChart(marsData) {
        const canvas = document.getElementById('marsPopulationChart');
        if (!canvas) {
            console.warn('Mars Population Chart canvas not found');
            return;
        }

        // Ensure the parent tab content is visible
        const tabContent = canvas.closest('.insights-tab-content');
        if (tabContent && tabContent.style.display === 'none') {
            // Tab is hidden, chart will be rendered when tab becomes visible
            return;
        }

        const inputs = this.getInputs();
        if (!inputs || !inputs.mars) {
            console.warn('Mars inputs not available for population chart');
            return;
        }

        const years = [];
        const population = [];
        const currentYear = new Date().getFullYear();
        const colonyYear = inputs.mars.firstColonyYear || 2030;
        const horizonYear = 2040;

        let pop = 1000; // Initial population
        for (let year = colonyYear; year <= horizonYear; year++) {
            years.push(year);
            if (year === colonyYear) {
                population.push(pop);
            } else {
                pop = pop * (1 + (inputs.mars.populationGrowth || 0.1));
                population.push(pop);
            }
        }

        if (this.charts.marsPopulation) {
            this.charts.marsPopulation.destroy();
        }

        this.charts.marsPopulation = new Chart(canvas, {
            type: 'line',
            data: {
                labels: years,
                datasets: [{
                    label: 'Population',
                    data: population,
                    borderColor: '#f59e0b',
                    backgroundColor: 'rgba(245, 158, 11, 0.1)',
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: true }
                },
                scales: {
                    y: { 
                        title: { display: true, text: 'Population' },
                        beginAtZero: true
                    },
                    x: { title: { display: true, text: 'Year' } }
                }
            }
        });
    }

    updateMarsLaunchScalingChart(marsData, inputs, scenario = 'base') {
        const ctx = document.getElementById('marsLaunchScalingChart');
        if (!ctx) return;

        if (!inputs || !inputs.mars) {
            console.warn('updateMarsLaunchScalingChart: inputs.mars is undefined', inputs);
            return;
        }

        const currentYear = new Date().getFullYear();
        const colonyYear = inputs.mars.firstColonyYear || 2030;
        const horizonYear = 2040;
        
        // Scenario multipliers for transport cost decline
        const scenarioMultipliers = {
            bear: 0.7,   // Slower cost decline
            base: 1.0,   // Base case
            bull: 1.4    // Faster cost decline
        };
        const multiplier = scenarioMultipliers[scenario] || 1.0;

        const years = [];
        const transportCosts = []; // $/kg to Mars
        const starshipFlights = []; // Number of flights per year
        
        // Base transport cost starts high and declines
        let baseCost = 2000; // $/kg initial cost
        const declineRate = inputs.mars.transportCostDecline * multiplier;
        
        // Calculate transport costs and flight spikes
        for (let year = colonyYear; year <= horizonYear; year++) {
            years.push(year);
            
            // Transport cost declines exponentially
            const yearsFromColony = year - colonyYear;
            const cost = baseCost * Math.pow(1 - declineRate, yearsFromColony);
            transportCosts.push(cost);
            
            // Flight spikes occur roughly every 2 years when costs drop significantly
            // More flights as costs decrease
            const spikeFactor = Math.floor(yearsFromColony / 2) % 2 === 0 ? 1.5 : 0.8;
            const baseFlights = Math.max(10, 50 - (cost / 50)); // More flights as cost decreases
            const flights = Math.floor(baseFlights * spikeFactor * multiplier);
            starshipFlights.push(flights);
        }

        if (this.charts.marsLaunchScaling) {
            this.charts.marsLaunchScaling.destroy();
        }

        this.charts.marsLaunchScaling = new Chart(ctx, {
            type: 'line',
            data: {
                labels: years,
                datasets: [{
                    label: 'Transport Cost ($/kg)',
                    data: transportCosts,
                    borderColor: '#ef4444',
                    backgroundColor: 'rgba(239, 68, 68, 0.1)',
                    yAxisID: 'y',
                    tension: 0.3,
                    borderWidth: 2
                }, {
                    label: 'Starship Flights',
                    data: starshipFlights,
                    borderColor: '#0066cc',
                    backgroundColor: 'rgba(0, 102, 204, 0.1)',
                    yAxisID: 'y1',
                    tension: 0.1,
                    borderWidth: 2,
                    pointRadius: 3,
                    pointHoverRadius: 5
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'top'
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                if (context.datasetIndex === 0) {
                                    return `Transport Cost: $${context.parsed.y.toFixed(0)}/kg`;
                                } else {
                                    return `Starship Flights: ${context.parsed.y.toFixed(0)}`;
                                }
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        type: 'linear',
                        position: 'left',
                        title: {
                            display: true,
                            text: 'Transport Cost ($/kg)'
                        },
                        beginAtZero: false,
                        ticks: {
                            callback: function(value) {
                                return '$' + value.toFixed(0);
                            }
                        }
                    },
                    y1: {
                        type: 'linear',
                        position: 'right',
                        title: {
                            display: true,
                            text: 'Starship Flights per Year'
                        },
                        beginAtZero: true,
                        grid: {
                            drawOnChartArea: false
                        }
                    }
                }
            }
        });
    }

    async runStressScenario(scenarioName) {
        const baseInputs = this.getInputs();
        let modifications = {};

        switch(scenarioName) {
            case 'mars-delay':
                modifications = {
                    mars: { firstColonyYear: 2060 }
                };
                break;
            case 'competition':
                modifications = {
                    earth: { starlinkPenetration: baseInputs.earth.starlinkPenetration * 0.5 }
                };
                break;
            case 'mars-failure':
                modifications = {
                    mars: { populationGrowth: 0, industrialBootstrap: false }
                };
                break;
            case 'high-discount':
                modifications = {
                    financial: { discountRate: 0.20 }
                };
                break;
        }

        const testInputs = { ...baseInputs, ...modifications };
        
        try {
            const response = await fetch('/api/calculate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(testInputs)
            });

            const result = await response.json();
            if (result.success) {
                this.displayStressResults(baseInputs, testInputs, result.data);
            }
        } catch (error) {
            console.error('Stress test error:', error);
            alert('Failed to run stress test');
        }
    }

    async displayStressResults(baseInputs, stressInputs, stressData) {
        console.log('📊 Displaying stress results:', { baseInputs, stressInputs, stressData });
        
        // Calculate base case
        const baseResponse = await fetch('/api/calculate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(baseInputs)
        }).then(r => r.json());

        console.log('📊 Base response:', baseResponse);

        if (!baseResponse.success) {
            console.error('Base calculation failed:', baseResponse.error);
            alert('Failed to calculate base case: ' + (baseResponse.error || 'Unknown error'));
            return;
        }

        // Get values from response (already in billions)
        const baseValue = baseResponse.data?.total?.value || 0;
        const stressValue = stressData?.total?.value || 0;
        
        console.log('📊 Values:', { baseValue, stressValue });
        
        if (!baseValue || baseValue === 0) {
            console.error('Base value is zero or missing');
            alert('Base calculation returned zero value. Please ensure a model is loaded.');
            return;
        }
        
        const impact = ((stressValue - baseValue) / baseValue) * 100;

        // Format values correctly (already in billions)
        // Shows T for trillions (>= 1000B), B for billions (< 1000B)
        const formatBillion = (value) => {
            if (!value && value !== 0) return 'N/A';
            // Values are already in billions
            // >= 1000 billion = trillions (show T)
            // < 1000 billion = billions (show B)
            if (value >= 1000) {
                return `$${(value / 1000).toFixed(2)}T`;
            }
            return `$${value.toFixed(1)}B`;
        };

        document.getElementById('stressBaseValue').textContent = formatBillion(baseValue);
        document.getElementById('stressScenarioValue').textContent = formatBillion(stressValue);
        document.getElementById('stressImpact').textContent = `${impact.toFixed(1)}%`;
        document.getElementById('stressImpact').style.color = impact < 0 ? 'var(--error-color)' : 'var(--success-color)';

        document.getElementById('stressResultsSection').style.display = 'block';

        // Update stress chart (values already in billions)
        this.updateStressChart(baseValue, stressValue);
    }

    async runCustomStressTest() {
        const baseInputs = this.getInputs();
        const name = document.getElementById('customStressName').value || 'Custom Stress Test';
        
        const modifications = {
            earth: {
                starlinkPenetration: baseInputs.earth.starlinkPenetration * 
                    parseFloat(document.getElementById('stressStarlinkMult').value),
                launchVolume: baseInputs.earth.launchVolume * 
                    parseFloat(document.getElementById('stressLaunchMult').value)
            },
            mars: {
                firstColonyYear: baseInputs.mars.firstColonyYear + 
                    parseInt(document.getElementById('stressColonyOffset').value),
                populationGrowth: baseInputs.mars.populationGrowth * 
                    parseFloat(document.getElementById('stressPopGrowthMult').value)
            },
            financial: {
                discountRate: baseInputs.financial.discountRate + 
                    parseFloat(document.getElementById('stressDiscountAdj').value),
                dilutionFactor: baseInputs.financial.dilutionFactor + 
                    parseFloat(document.getElementById('stressDilutionAdj').value)
            }
        };

        const testInputs = {
            earth: { ...baseInputs.earth, ...modifications.earth },
            mars: { ...baseInputs.mars, ...modifications.mars },
            financial: { ...baseInputs.financial, ...modifications.financial }
        };

        try {
            const response = await fetch('/api/calculate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(testInputs)
            });

            const result = await response.json();
            if (result.success) {
                this.displayStressResults(baseInputs, testInputs, result.data);
            }
        } catch (error) {
            console.error('Custom stress test error:', error);
            alert('Failed to run custom stress test');
        }
    }

    updateStressChart(baseValue, stressValue) {
        const ctx = document.getElementById('stressChart');
        if (!ctx) return;

        if (this.charts.stress) {
            this.charts.stress.destroy();
        }

        // Values are already in billions, use directly
        // Format tooltip values
        const formatTooltipValue = (value) => {
            if (value >= 1000) {
                return '$' + (value / 1000).toFixed(2) + 'T';
            }
            return '$' + value.toFixed(1) + 'B';
        };
        
        // Format Y-axis values
        const formatYValue = (value) => {
            if (value >= 1000) {
                return '$' + (value / 1000).toFixed(1) + 'T';
            }
            return '$' + value.toFixed(0) + 'B';
        };

        console.log('📊 Creating stress chart:', { baseValue, stressValue });

        this.charts.stress = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: ['Base Case', 'Stress Scenario'],
                datasets: [{
                    label: 'Enterprise Value',
                    data: [baseValue || 0, stressValue || 0],
                    backgroundColor: ['#0066cc', '#f59e0b']
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return formatTooltipValue(context.parsed.y);
                            }
                        }
                    },
                    title: {
                        display: true,
                        text: 'Stress Test Comparison'
                    }
                },
                scales: {
                    y: {
                        title: {
                            display: true,
                            text: 'Enterprise Value'
                        },
                        beginAtZero: true,
                        ticks: {
                            callback: function(value) {
                                return formatYValue(value);
                            }
                        }
                    }
                }
            }
        });
        
        console.log('✅ Stress chart updated successfully');
    }

    // Financial Greeks
    async calculateGreeks() {
        const btn = document.getElementById('calculateGreeksBtn');
        const originalText = btn ? btn.innerHTML : '';
        
        if (btn) {
            btn.disabled = true;
            btn.innerHTML = '<i data-lucide="loader"></i> Calculating...';
            if (window.lucide) window.lucide.createIcons();
        }

        try {
            const baseInputs = this.getInputs();
            const modelId = this.currentModelId || null;
            
            const response = await fetch('/api/greeks', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    modelId: modelId,
                    baseInputs: baseInputs
                })
            });

            const result = await response.json();
            
            if (result.success) {
                this.displayGreeks(result.data);
            } else {
                alert('Error calculating Greeks: ' + result.error);
            }
        } catch (error) {
            console.error('Greeks calculation error:', error);
            alert('Failed to calculate Greeks');
        } finally {
            if (btn) {
                btn.disabled = false;
                btn.innerHTML = originalText;
                if (window.lucide) window.lucide.createIcons();
            }
        }
    }

    displayGreeks(data) {
        const { greeks, summary, baseValues, method } = data;
        
        // Store data for micro AI
        this.currentGreeksData = data;
        
        // Show dashboard
        document.getElementById('greeksDashboard').style.display = 'block';
        
        // Update summary cards
        const formatGreek = (value) => {
            if (Math.abs(value) >= 1000) {
                return `$${(value / 1000).toFixed(2)}T`;
            }
            return `$${value.toFixed(1)}B`;
        };
        
        document.getElementById('totalDelta').textContent = formatGreek(summary.totalDelta);
        document.getElementById('totalGamma').textContent = formatGreek(summary.totalGamma);
        document.getElementById('totalVega').textContent = formatGreek(summary.totalVega);
        document.getElementById('totalTheta').textContent = formatGreek(summary.totalTheta);
        document.getElementById('totalRho').textContent = formatGreek(summary.totalRho);
        
        // Update tables
        this.updateGreeksTable('earth', greeks.earth);
        this.updateGreeksTable('mars', greeks.mars);
        
        // Update charts
        this.updateDeltaHeatmap(greeks);
        this.updateComponentGreeksCharts(greeks);
        
        // Log method used for debugging
        if (method) {
            console.log(`[Greeks Dashboard] Calculated using: ${method}`);
            
            // Update method indicator
            const methodIndicator = document.getElementById('greeksMethodIndicator');
            const methodDisplay = document.getElementById('greeksMethodDisplay');
            if (methodIndicator && methodDisplay) {
                const methodNames = {
                    'mach33lib-finite-difference': 'Finite Difference',
                    'mach33lib-central-difference': 'Central Difference',
                    'mach33lib-monte-carlo': 'Monte Carlo'
                };
                methodDisplay.textContent = methodNames[method] || method;
                methodIndicator.style.display = 'block';
            }
        }
        
        // Check if we have factor risk data and update combined view
        this.updateCombinedRiskView();
        
        // Initialize AI explanation icons
        if (window.lucide) window.lucide.createIcons();
        
        // Note: AI commentary is now triggered via icon click, not auto-generated
    }

    // Legacy function - kept for compatibility but AI is now triggered via icon
    async generateGreeksCommentary(data) {
        // AI commentary is now triggered via the icon click handler
        // This function is kept for backward compatibility but does nothing
        return;
    }

    // Factor Risk Analysis
    async calculateFactorRisk() {
        const modelId = document.getElementById('factorModelSelect')?.value || 'barra-style';
        const currentValuation = this.currentResults?.total || this.currentData?.total || 800; // Fallback to $800B

        try {
            const response = await fetch('/api/factor-models/calculate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    modelId,
                    valuationData: { valuation: currentValuation },
                    marketData: null
                })
            });

            const result = await response.json();
            if (!result.success) {
                throw new Error(result.error || 'Failed to calculate factor risk');
            }

            this.displayFactorRisk(result.data);
        } catch (error) {
            console.error('Factor risk calculation error:', error);
            alert(`Error calculating factor risk: ${error.message}`);
        }
    }

    displayFactorRisk(data) {
        const dashboard = document.getElementById('factorRiskDashboard');
        if (!dashboard) return;

        dashboard.style.display = 'block';

        // Store factor risk data for combined view
        this.currentFactorRiskData = data;

        // Update model info
        const modelSelect = document.getElementById('factorModelSelect');
        const selectedOption = modelSelect?.options[modelSelect.selectedIndex];
        document.getElementById('factorModelName').textContent = selectedOption?.text || '--';
        document.getElementById('factorModelDescription').textContent = selectedOption?.title || '--';
        
        const totalRisk = (data.totalFactorRisk * 100).toFixed(1);
        document.getElementById('totalFactorRisk').textContent = `${totalRisk}%`;

        // Update exposures table
        this.updateFactorExposuresTable(data);

        // Update charts
        this.updateFactorRiskCharts(data);

        // Update stress test factor dropdown
        this.updateStressTestFactors(data.exposures);

        // Update combined risk view if Greeks are also calculated
        this.updateCombinedRiskView();

        if (window.lucide) window.lucide.createIcons();
    }

    updateCombinedRiskView() {
        const combinedView = document.getElementById('combinedRiskView');
        const placeholder = document.getElementById('combinedRiskPlaceholder');
        
        if (!combinedView || !placeholder) return;

        const greeksData = this.currentGreeksData;
        const factorData = this.currentFactorRiskData;

        // Only show if both are available
        if (!greeksData || !factorData) {
            combinedView.style.display = 'none';
            placeholder.style.display = 'block';
            return;
        }

        combinedView.style.display = 'block';
        placeholder.style.display = 'none';

        // Calculate Greeks risk (simplified: sum of absolute Greeks)
        const greeksRisk = this.calculateGreeksRisk(greeksData);
        const factorRisk = factorData.totalFactorRisk * 100; // Convert to percentage
        
        // Total risk (simplified: geometric mean assuming low correlation)
        const totalRisk = Math.sqrt(greeksRisk * greeksRisk + factorRisk * factorRisk);

        document.getElementById('greeksRiskTotal').textContent = `${greeksRisk.toFixed(1)}%`;
        document.getElementById('factorRiskTotal').textContent = `${factorRisk.toFixed(1)}%`;
        document.getElementById('totalCombinedRisk').textContent = `${totalRisk.toFixed(1)}%`;

        // Update combined risk chart
        this.updateCombinedRiskChart(greeksRisk, factorRisk, totalRisk);
    }

    calculateGreeksRisk(greeksData) {
        // Simplified Greeks risk calculation
        // In practice, this would use variance-covariance matrix
        const summary = greeksData.summary || {};
        const greeks = [
            Math.abs(summary.totalDelta || 0),
            Math.abs(summary.totalGamma || 0),
            Math.abs(summary.totalVega || 0),
            Math.abs(summary.totalTheta || 0),
            Math.abs(summary.totalRho || 0)
        ];
        
        // Normalize to percentage (assuming base valuation ~$800B)
        const baseValuation = greeksData.baseValues?.total || 800;
        const totalGreeks = greeks.reduce((sum, g) => sum + g, 0);
        
        // Convert to risk percentage (simplified)
        return (totalGreeks / baseValuation) * 100;
    }

    updateCombinedRiskChart(greeksRisk, factorRisk, totalRisk) {
        const ctx = document.getElementById('combinedRiskChart');
        if (!ctx || !window.Chart) return;

        // Destroy existing chart if it exists
        if (this.combinedRiskChartInstance) {
            this.combinedRiskChartInstance.destroy();
        }

        this.combinedRiskChartInstance = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['Greeks Risk', 'Factor Risk', 'Idiosyncratic Risk'],
                datasets: [{
                    data: [
                        greeksRisk,
                        factorRisk,
                        Math.max(0, totalRisk - greeksRisk - factorRisk)
                    ],
                    backgroundColor: [
                        'rgba(0, 102, 204, 0.6)',
                        'rgba(16, 185, 129, 0.6)',
                        'rgba(156, 163, 175, 0.6)'
                    ]
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        position: 'bottom'
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return `${context.label}: ${context.parsed.toFixed(1)}%`;
                            }
                        }
                    }
                }
            }
        });
    }

    updateFactorExposuresTable(data) {
        // Update factor tiles instead of table
        this.updateFactorTiles(data);
    }

    updateFactorTiles(data) {
        const container = document.getElementById('factorTilesContainer');
        if (!container) return;

        container.innerHTML = '';

        const exposures = data.exposures || {};
        const contributions = data.contributions || {};

        // Group factors by type if available
        const styleFactors = [];
        const industryFactors = [];
        const countryFactors = [];
        const otherFactors = [];

        const styleFactorNames = ['Growth', 'Size', 'Value', 'Momentum', 'Volatility', 'Leverage'];
        const industryFactorNames = ['Tech', 'Aerospace', 'Telecommunications'];
        const countryFactorNames = ['US Market', 'Market'];

        for (const [factor, exposure] of Object.entries(exposures)) {
            const contrib = contributions[factor] || {};
            const riskContrib = (contrib.riskContribution || contrib.contribution || 0) * 100;
            const exposureValue = exposure;
            const exposureColor = exposureValue >= 0 ? 'var(--success-color)' : 'var(--error-color)';
            const exposureBg = exposureValue >= 0 ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)';

            const tile = document.createElement('div');
            tile.className = 'metric-card-small';
            tile.style.cursor = 'pointer';
            tile.style.padding = 'var(--spacing-sm)';
            tile.style.minHeight = 'auto';
            tile.onclick = () => this.stressTestFactor(factor);
            
            tile.innerHTML = `
                <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 4px;">
                    <div style="font-size: 11px; font-weight: 600; line-height: 1.2; color: var(--text-primary);">${factor}</div>
                    <button class="btn btn-xs btn-secondary" onclick="event.stopPropagation(); app.stressTestFactor('${factor}')" title="Stress Test" style="padding: 2px 4px; min-width: auto;">
                        <i data-lucide="zap" style="width: 12px; height: 12px;"></i>
                    </button>
                </div>
                <div style="font-size: 16px; font-weight: 600; color: ${exposureColor}; margin-bottom: 2px; line-height: 1;">
                    ${exposureValue >= 0 ? '+' : ''}${exposureValue.toFixed(2)}
                </div>
                <div style="font-size: 9px; color: var(--text-secondary); margin-bottom: 3px;">
                    Beta
                </div>
                <div style="padding: 2px 6px; background: ${exposureBg}; border-radius: 3px; font-size: 9px; color: ${exposureColor}; font-weight: 600; display: inline-block;">
                    ${riskContrib.toFixed(1)}%
                </div>
            `;

            // Categorize factors
            if (styleFactorNames.includes(factor)) {
                styleFactors.push({ factor, exposure, contrib, riskContrib, tile });
            } else if (industryFactorNames.includes(factor)) {
                industryFactors.push({ factor, exposure, contrib, riskContrib, tile });
            } else if (countryFactorNames.includes(factor)) {
                countryFactors.push({ factor, exposure, contrib, riskContrib, tile });
            } else {
                otherFactors.push({ factor, exposure, contrib, riskContrib, tile });
            }
        }

        // Add grouped sections if we have categories
        if (styleFactors.length > 0 || industryFactors.length > 0 || countryFactors.length > 0) {
            if (styleFactors.length > 0) {
                const section = document.createElement('div');
                section.style.gridColumn = '1 / -1';
                section.style.marginTop = 'var(--spacing-sm)';
                section.innerHTML = `<h5 style="margin: 0 0 6px 0; color: var(--text-secondary); font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px;">Style Factors</h5>`;
                container.appendChild(section);
                styleFactors.forEach(item => container.appendChild(item.tile));
            }

            if (industryFactors.length > 0) {
                const section = document.createElement('div');
                section.style.gridColumn = '1 / -1';
                section.style.marginTop = 'var(--spacing-sm)';
                section.innerHTML = `<h5 style="margin: 0 0 6px 0; color: var(--text-secondary); font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px;">Industry Factors</h5>`;
                container.appendChild(section);
                industryFactors.forEach(item => container.appendChild(item.tile));
            }

            if (countryFactors.length > 0) {
                const section = document.createElement('div');
                section.style.gridColumn = '1 / -1';
                section.style.marginTop = 'var(--spacing-sm)';
                section.innerHTML = `<h5 style="margin: 0 0 6px 0; color: var(--text-secondary); font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px;">Country Factors</h5>`;
                container.appendChild(section);
                countryFactors.forEach(item => container.appendChild(item.tile));
            }

            if (otherFactors.length > 0) {
                otherFactors.forEach(item => container.appendChild(item.tile));
            }
        } else {
            // No categories, just add all tiles
            for (const [factor, exposure] of Object.entries(exposures)) {
                const contrib = contributions[factor] || {};
                const riskContrib = (contrib.riskContribution || contrib.contribution || 0) * 100;
                const exposureValue = exposure;
                const exposureColor = exposureValue >= 0 ? 'var(--success-color)' : 'var(--error-color)';
                const exposureBg = exposureValue >= 0 ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)';

                const tile = document.createElement('div');
                tile.className = 'metric-card-small';
                tile.style.cursor = 'pointer';
                tile.style.padding = 'var(--spacing-sm)';
                tile.style.minHeight = 'auto';
                tile.onclick = () => this.stressTestFactor(factor);
                
                tile.innerHTML = `
                    <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 4px;">
                        <div style="font-size: 11px; font-weight: 600; line-height: 1.2; color: var(--text-primary);">${factor}</div>
                        <button class="btn btn-xs btn-secondary" onclick="event.stopPropagation(); app.stressTestFactor('${factor}')" title="Stress Test" style="padding: 2px 4px; min-width: auto;">
                            <i data-lucide="zap" style="width: 12px; height: 12px;"></i>
                        </button>
                    </div>
                    <div style="font-size: 16px; font-weight: 600; color: ${exposureColor}; margin-bottom: 2px; line-height: 1;">
                        ${exposureValue >= 0 ? '+' : ''}${exposureValue.toFixed(2)}
                    </div>
                    <div style="font-size: 9px; color: var(--text-secondary); margin-bottom: 3px;">
                        Beta
                    </div>
                    <div style="padding: 2px 6px; background: ${exposureBg}; border-radius: 3px; font-size: 9px; color: ${exposureColor}; font-weight: 600; display: inline-block;">
                        ${riskContrib.toFixed(1)}%
                    </div>
                `;
                container.appendChild(tile);
            }
        }

        // Show chart button
        const chartsBtn = document.getElementById('showChartsBtn');
        if (chartsBtn) chartsBtn.style.display = 'inline-flex';

        if (window.lucide) window.lucide.createIcons();
    }

    showFactorChart(chartType) {
        const modal = document.getElementById('factorChartsModal');
        if (!modal) return;

        modal.classList.add('active');
        
        // Ensure charts are rendered
        if (this.currentFactorRiskData) {
            // Small delay to ensure modal is visible before rendering charts
            setTimeout(() => {
                this.updateFactorRiskCharts(this.currentFactorRiskData);
            }, 100);
        }

        if (window.lucide) window.lucide.createIcons();
    }

    closeFactorChartsModal() {
        const modal = document.getElementById('factorChartsModal');
        if (modal) {
            modal.classList.remove('active');
            modal.style.display = 'none';
        }
    }

    showFactorRiskInfo(event) {
        const panel = document.getElementById('factorRiskInfoPanel');
        const iconContainer = document.getElementById('factorRiskInfoIconContainer');
        if (!panel || !iconContainer) return;

        // Position panel relative to icon
        const iconRect = iconContainer.getBoundingClientRect();
        panel.style.display = 'block';
        panel.style.position = 'fixed';
        panel.style.top = `${iconRect.bottom + 10}px`;
        panel.style.left = `${iconRect.left}px`;
        
        // Adjust if panel would go off screen
        setTimeout(() => {
            const panelRect = panel.getBoundingClientRect();
            if (panelRect.right > window.innerWidth) {
                panel.style.left = `${window.innerWidth - panelRect.width - 20}px`;
            }
            if (panelRect.bottom > window.innerHeight) {
                panel.style.top = `${iconRect.top - panelRect.height - 10}px`;
            }
        }, 0);

        if (window.lucide) window.lucide.createIcons();
        
        // Prevent event bubbling
        if (event) event.stopPropagation();
    }

    closeFactorRiskInfo() {
        const panel = document.getElementById('factorRiskInfoPanel');
        if (panel) {
            panel.style.display = 'none';
        }
    }

    updateFactorRiskCharts(data) {
        // Factor Risk Contribution Chart
        const riskCtx = document.getElementById('factorRiskChart');
        if (riskCtx && window.Chart) {
            // Destroy existing chart if it exists
            if (this.factorRiskChartInstance) {
                this.factorRiskChartInstance.destroy();
                this.factorRiskChartInstance = null;
            }

            const exposures = data.exposures || {};
            const contributions = data.contributions || {};

            const factors = Object.keys(exposures);
            const riskContribs = factors.map(f => {
                const contrib = contributions[f] || {};
                return Math.abs(contrib.riskContribution || contrib.contribution || 0) * 100;
            });

            this.factorRiskChartInstance = new Chart(riskCtx, {
                type: 'bar',
                data: {
                    labels: factors,
                    datasets: [{
                        label: 'Risk Contribution (%)',
                        data: riskContribs,
                        backgroundColor: 'rgba(0, 102, 204, 0.6)'
                    }]
                },
                options: {
                    responsive: true,
                    scales: {
                        y: { beginAtZero: true }
                    }
                }
            });
        }

        // Factor Exposure Comparison Chart
        const expCtx = document.getElementById('factorExposureChart');
        if (expCtx && window.Chart) {
            // Destroy existing chart if it exists
            if (this.factorExposureChartInstance) {
                this.factorExposureChartInstance.destroy();
                this.factorExposureChartInstance = null;
            }

            const exposures = data.exposures || {};
            const factors = Object.keys(exposures);
            const values = factors.map(f => exposures[f]);

            this.factorExposureChartInstance = new Chart(expCtx, {
                type: 'bar',
                data: {
                    labels: factors,
                    datasets: [{
                        label: 'Exposure (Beta)',
                        data: values,
                        backgroundColor: values.map(v => v >= 0 ? 'rgba(16, 185, 129, 0.6)' : 'rgba(239, 68, 68, 0.6)')
                    }]
                },
                options: {
                    responsive: true,
                    scales: {
                        y: { beginAtZero: false }
                    }
                }
            });
        }
    }

    updateStressTestFactors(exposures) {
        const select = document.getElementById('stressTestFactor');
        if (!select) return;

        select.innerHTML = '<option value="">Select factor...</option>';
        for (const factor of Object.keys(exposures || {})) {
            const option = document.createElement('option');
            option.value = factor;
            option.textContent = factor;
            select.appendChild(option);
        }
    }

    async runFactorStressTest() {
        const modelId = document.getElementById('factorModelSelect')?.value || 'fama-french-3';
        const factorName = document.getElementById('stressTestFactor')?.value;
        const shock = parseFloat(document.getElementById('stressTestShock')?.value);
        const baseValuation = this.currentResults?.total || 800;

        if (!factorName || isNaN(shock)) {
            alert('Please select a factor and enter a shock value');
            return;
        }

        try {
            const response = await fetch('/api/factor-models/stress-test', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    modelId,
                    factorName,
                    shock,
                    baseValuation
                })
            });

            const result = await response.json();
            if (!result.success) {
                throw new Error(result.error || 'Failed to run stress test');
            }

            this.displayStressTestResults(result.data);
        } catch (error) {
            console.error('Stress test error:', error);
            alert(`Error running stress test: ${error.message}`);
        }
    }

    stressTestFactor(factorName) {
        document.getElementById('stressTestFactor').value = factorName;
        this.runFactorStressTest();
    }

    displayStressTestResults(data) {
        const resultsDiv = document.getElementById('stressTestResults');
        if (!resultsDiv) return;

        const impact = data.impact || 0;
        const impactPct = ((impact / data.baseValuation) * 100).toFixed(1);
        const impactColor = impact < 0 ? 'var(--error-color)' : 'var(--success-color)';

        resultsDiv.innerHTML = `
            <div class="insight-card" style="border-left: 3px solid ${impactColor}; padding: var(--spacing-md);">
                <h4 style="margin: 0 0 var(--spacing-sm) 0;">Stress Test Results: ${data.factor}</h4>
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: var(--spacing-md);">
                    <div>
                        <div style="font-size: 12px; color: var(--text-secondary);">Factor Exposure</div>
                        <div style="font-size: 20px; font-weight: 600;">${data.exposure.toFixed(2)}</div>
                    </div>
                    <div>
                        <div style="font-size: 12px; color: var(--text-secondary);">Shock</div>
                        <div style="font-size: 20px; font-weight: 600;">${(data.shock * 100).toFixed(1)}%</div>
                    </div>
                    <div>
                        <div style="font-size: 12px; color: var(--text-secondary);">Impact</div>
                        <div style="font-size: 20px; font-weight: 600; color: ${impactColor};">
                            ${impact >= 0 ? '+' : ''}$${Math.abs(impact).toFixed(1)}B (${impactPct}%)
                        </div>
                    </div>
                    <div>
                        <div style="font-size: 12px; color: var(--text-secondary);">New Valuation</div>
                        <div style="font-size: 20px; font-weight: 600;">$${data.newValuation.toFixed(1)}B</div>
                    </div>
                </div>
            </div>
        `;
        resultsDiv.style.display = 'block';
    }

    // Standardized AI Explanation Handler - for individual Greeks
    async showMicroAI(greekName, event) {
        if (event) event.stopPropagation();
        
        const popup = document.getElementById(`microAI-${greekName}`);
        const content = document.getElementById(`microAI-${greekName}-content`);
        
        if (!popup || !content) return;
        
        // Toggle popup visibility
        const isVisible = popup.style.display !== 'none';
        
        // Close all other popups first
        document.querySelectorAll('.ai-explanation-popup').forEach(p => {
            p.style.display = 'none';
        });
        
        if (isVisible) {
            popup.style.display = 'none';
            return;
        }
        
        // Show popup
        popup.style.display = 'block';
        content.innerHTML = '<i data-lucide="loader" class="spinning"></i> Generating explanation...';
        if (window.lucide) window.lucide.createIcons();
        
        // Get current Greeks data
        const greeksData = this.currentGreeksData;
        if (!greeksData || !greeksData.summary) {
            content.innerHTML = '<p style="margin: 0; color: var(--text-secondary);">Please calculate Greeks first.</p>';
            if (window.lucide) window.lucide.createIcons();
            return;
        }
        
        try {
            const greekKey = `total${greekName.charAt(0).toUpperCase() + greekName.slice(1)}`;
            const greekValue = greeksData.summary[greekKey] || 0;
            
            const response = await fetch('/api/ai/greeks/micro', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-AI-Model': this.getAIModel()
                },
                body: JSON.stringify({
                    greek: greekName,
                    value: greekValue,
                    greeks: greeksData.greeks
                })
            });
            
            const result = await response.json();
            
            if (result.success && result.data.commentary) {
                // Format commentary with paragraph breaks
                const formattedCommentary = result.data.commentary
                    .split('\n')
                    .filter(line => line.trim().length > 0)
                    .map(line => `<p style="margin: 0 0 var(--spacing-sm) 0;">${line.trim()}</p>`)
                    .join('');
                content.innerHTML = formattedCommentary || `<p style="margin: 0;">${result.data.commentary}</p>`;
            } else {
                content.innerHTML = '<p style="margin: 0; color: var(--text-secondary);">Unable to generate explanation.</p>';
            }
        } catch (error) {
            console.error('Error generating micro AI:', error);
            content.innerHTML = '<p style="margin: 0; color: var(--text-secondary);">Unable to generate explanation.</p>';
        } finally {
            if (window.lucide) window.lucide.createIcons();
        }
    }

    // Standardized AI Explanation Handler - for dashboard sections (floating panel)
    async showAIExplanation(sectionId, event) {
        if (event) event.stopPropagation();
        
        const panel = document.getElementById(`aiExplanation-${sectionId}`);
        const content = document.getElementById(`aiExplanation-${sectionId}-content`);
        
        if (!panel || !content) return;
        
        // Toggle panel visibility
        const isVisible = panel.style.display !== 'none';
        
        // Close all other floating panels and popups first
        document.querySelectorAll('.ai-explanation-floating-panel').forEach(p => {
            p.style.display = 'none';
        });
        document.querySelectorAll('.ai-explanation-popup').forEach(p => {
            p.style.display = 'none';
        });
        
        // Remove backdrop if closing
        const backdrop = document.getElementById('aiExplanationBackdrop');
        if (isVisible) {
            panel.style.display = 'none';
            if (backdrop) backdrop.style.display = 'none';
            return;
        }
        
        // Show backdrop
        if (!backdrop) {
            const newBackdrop = document.createElement('div');
            newBackdrop.id = 'aiExplanationBackdrop';
            newBackdrop.className = 'ai-explanation-backdrop';
            newBackdrop.onclick = () => this.closeFloatingAIExplanation(sectionId);
            document.body.appendChild(newBackdrop);
        }
        if (backdrop) backdrop.style.display = 'block';
        
        // Show panel
        panel.style.display = 'flex';
        content.innerHTML = '<i data-lucide="loader" class="spinning"></i> Generating insights...';
        if (window.lucide) window.lucide.createIcons();
        
        try {
            let response;
            
            if (sectionId === 'greeksDashboard') {
                // Use existing Greeks commentary endpoint
                if (!this.currentGreeksData) {
                    content.innerHTML = '<p style="margin: 0; color: var(--text-secondary);">Please calculate Greeks first.</p>';
                    if (window.lucide) window.lucide.createIcons();
                    return;
                }
                response = await fetch('/api/ai/greeks/commentary', {
                    method: 'POST',
                    headers: { 
                        'Content-Type': 'application/json',
                        'X-AI-Model': this.getAIModel()
                    },
                    body: JSON.stringify(this.currentGreeksData)
                });
            } else if (sectionId === 'attributionResults') {
                // Use existing Attribution commentary endpoint
                if (!this.currentAttributionData) {
                    content.innerHTML = '<p style="margin: 0; color: var(--text-secondary);">Please calculate Attribution first.</p>';
                    if (window.lucide) window.lucide.createIcons();
                    return;
                }
                response = await fetch('/api/ai/attribution/commentary', {
                    method: 'POST',
                    headers: { 
                        'Content-Type': 'application/json',
                        'X-AI-Model': this.getAIModel()
                    },
                    body: JSON.stringify(this.currentAttributionData)
                });
            } else if (sectionId === 'varResults') {
                // VaR commentary endpoint
                if (!this.currentVaRData) {
                    content.innerHTML = '<p style="margin: 0; color: var(--text-secondary);">Please calculate VaR first.</p>';
                    if (window.lucide) window.lucide.createIcons();
                    return;
                }
                response = await fetch('/api/ai/var/commentary', {
                    method: 'POST',
                    headers: { 
                        'Content-Type': 'application/json',
                        'X-AI-Model': this.getAIModel()
                    },
                    body: JSON.stringify(this.currentVaRData)
                });
            } else {
                content.innerHTML = '<p style="margin: 0; color: var(--text-secondary);">AI explanation not available.</p>';
                if (window.lucide) window.lucide.createIcons();
                return;
            }
            
            const result = await response.json();
            
            if (result.success && result.data.commentary) {
                // Format commentary with paragraph breaks
                const formattedCommentary = result.data.commentary
                    .split('\n')
                    .filter(line => line.trim().length > 0)
                    .map(line => `<p style="margin: 0 0 var(--spacing-md) 0;">${line.trim()}</p>`)
                    .join('');
                content.innerHTML = formattedCommentary || `<p style="margin: 0;">${result.data.commentary}</p>`;
            } else {
                content.innerHTML = '<p style="margin: 0; color: var(--text-secondary);">Unable to generate insights.</p>';
            }
        } catch (error) {
            console.error('Error generating AI explanation:', error);
            content.innerHTML = '<p style="margin: 0; color: var(--text-secondary);">Unable to generate insights.</p>';
        } finally {
            if (window.lucide) window.lucide.createIcons();
        }
    }

    // Close floating AI explanation panel
    closeFloatingAIExplanation(sectionId) {
        const panel = document.getElementById(`aiExplanation-${sectionId}`);
        const backdrop = document.getElementById('aiExplanationBackdrop');
        
        if (panel) panel.style.display = 'none';
        if (backdrop) backdrop.style.display = 'none';
    }

    // Standardized AI Explanation Handler - for charts
    async showChartAIExplanation(chartId, event) {
        if (event) event.stopPropagation();
        
        const popup = document.getElementById(`aiExplanation-${chartId}`);
        const content = document.getElementById(`aiExplanation-${chartId}-content`);
        
        if (!popup || !content) return;
        
        // Toggle popup visibility
        const isVisible = popup.style.display !== 'none';
        
        // Close all other popups first
        document.querySelectorAll('.ai-explanation-popup').forEach(p => {
            p.style.display = 'none';
        });
        
        if (isVisible) {
            popup.style.display = 'none';
            return;
        }
        
        // Show popup
        popup.style.display = 'block';
        content.innerHTML = '<i data-lucide="loader" class="spinning"></i> Generating chart insights...';
        if (window.lucide) window.lucide.createIcons();
        
        // For now, provide a generic explanation
        // This can be enhanced with specific chart analysis endpoints later
        setTimeout(() => {
            const chartExplanations = {
                deltaHeatmap: 'The Delta Heatmap visualizes first-order sensitivity across all inputs. Darker colors indicate higher sensitivity. Focus risk management on inputs with the highest Delta values.',
                earthGreeks: 'Earth Greeks show sensitivity metrics for Earth-based operations. Monitor Delta for revenue drivers, Gamma for convexity effects, and Vega for volatility exposure.',
                marsGreeks: 'Mars Greeks show sensitivity metrics for Mars colonization. Theta indicates time decay, while Delta and Gamma reveal sensitivity to key Mars mission parameters.'
            };
            
            const explanation = chartExplanations[chartId] || 'This chart visualizes key metrics. Use the data to identify trends and patterns.';
            content.innerHTML = `<p style="margin: 0;">${explanation}</p>`;
            if (window.lucide) window.lucide.createIcons();
        }, 500);
    }

    updateGreeksTable(component, componentGreeks) {
        const tbody = document.getElementById(`${component}GreeksTableBody`);
        if (!tbody) return;
        
        tbody.innerHTML = '';
        
        // Get all inputs that have Delta values (these are the main inputs)
        const inputs = Object.keys(componentGreeks.delta || {});
        
        inputs.forEach(input => {
            const row = document.createElement('tr');
            
            const delta = componentGreeks.delta[input];
            const gamma = componentGreeks.gamma[input];
            const vega = componentGreeks.vega[input];
            const theta = componentGreeks.theta?.[input];
            const rho = componentGreeks.rho[input];
            
            row.innerHTML = `
                <td><strong>${input}</strong></td>
                <td>${delta ? `${delta.value.toFixed(1)} ${delta.unit}` : '--'}</td>
                <td>${gamma ? `${gamma.value.toFixed(1)} ${gamma.unit}` : '--'}</td>
                <td>${vega ? `${vega.value.toFixed(1)} ${vega.unit}` : '--'}</td>
                ${component === 'mars' ? `<td>${theta ? `${theta.value.toFixed(1)} ${theta.unit}` : '--'}</td>` : ''}
                <td>${rho ? `${rho.value.toFixed(1)} ${rho.unit}` : '--'}</td>
            `;
            
            tbody.appendChild(row);
        });
        
        // Add separate rows for Vega, Theta, Rho if they exist but aren't tied to specific inputs
        const overallVega = componentGreeks.vega?.['Overall Volatility'];
        const timeDecay = componentGreeks.theta?.['Time Decay'];
        const discountRate = componentGreeks.rho?.['Discount Rate'];
        
        // Add Vega row if it exists and hasn't been added yet
        if (overallVega && !inputs.includes('Overall Volatility')) {
            const row = document.createElement('tr');
            row.style.backgroundColor = 'rgba(0, 102, 204, 0.05)';
            row.innerHTML = `
                <td><strong>Overall Volatility</strong></td>
                <td>--</td>
                <td>--</td>
                <td>${overallVega.value.toFixed(1)} ${overallVega.unit}</td>
                ${component === 'mars' ? '<td>--</td>' : ''}
                <td>--</td>
            `;
            tbody.appendChild(row);
        }
        
        // Add Theta row (only for Mars)
        if (component === 'mars' && timeDecay && !inputs.includes('Time Decay')) {
            const row = document.createElement('tr');
            row.style.backgroundColor = 'rgba(0, 102, 204, 0.05)';
            row.innerHTML = `
                <td><strong>Time Decay</strong></td>
                <td>--</td>
                <td>--</td>
                <td>--</td>
                <td>${timeDecay.value.toFixed(1)} ${timeDecay.unit}</td>
                <td>--</td>
            `;
            tbody.appendChild(row);
        }
        
        // Add Rho row if it exists and hasn't been added yet
        if (discountRate && !inputs.includes('Discount Rate')) {
            const row = document.createElement('tr');
            row.style.backgroundColor = 'rgba(0, 102, 204, 0.05)';
            row.innerHTML = `
                <td><strong>Discount Rate</strong></td>
                <td>--</td>
                <td>--</td>
                <td>--</td>
                ${component === 'mars' ? '<td>--</td>' : ''}
                <td>${discountRate.value.toFixed(1)} ${discountRate.unit}</td>
            `;
            tbody.appendChild(row);
        }
    }

    updateDeltaHeatmap(greeks) {
        const ctx = document.getElementById('deltaHeatmapChart');
        if (!ctx) return;
        
        if (this.charts.deltaHeatmap) {
            this.charts.deltaHeatmap.destroy();
        }
        
        const inputs = Object.keys(greeks.total.delta);
        const deltaValues = inputs.map(input => greeks.total.delta[input]?.value || 0);
        
        // Create heatmap using bar chart with color gradient
        const maxAbs = Math.max(...deltaValues.map(Math.abs));
        const colors = deltaValues.map(val => {
            const intensity = Math.abs(val) / maxAbs;
            const hue = val >= 0 ? 200 : 0; // Blue for positive, red for negative
            return `hsla(${hue}, 70%, 50%, ${0.3 + intensity * 0.7})`;
        });
        
        this.charts.deltaHeatmap = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: inputs,
                datasets: [{
                    label: 'Delta ($B/unit)',
                    data: deltaValues,
                    backgroundColor: colors,
                    borderColor: colors.map(c => c.replace('0.3', '1')),
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const input = inputs[context.dataIndex];
                                const unit = greeks.total.delta[input]?.unit || '';
                                return `Delta: ${context.parsed.y.toFixed(1)} ${unit}`;
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        title: {
                            display: true,
                            text: 'Delta ($B/unit)'
                        },
                        beginAtZero: false
                    },
                    x: {
                        title: {
                            display: true,
                            text: 'Input Variable'
                        }
                    }
                }
            }
        });

        // Generate aiTips for notable features (highest and lowest delta values)
        const maxDeltaIndex = deltaValues.indexOf(Math.max(...deltaValues));
        const minDeltaIndex = deltaValues.indexOf(Math.min(...deltaValues));
        
        // Tip for highest delta
        if (maxDeltaIndex >= 0) {
            const maxInput = inputs[maxDeltaIndex];
            const maxValue = deltaValues[maxDeltaIndex];
            // Store chart reference for positioning
            this.charts['deltaHeatmap'] = this.charts.deltaHeatmap;
            setTimeout(() => {
                this.createAITip(
                    'deltaHeatmapChart',
                    'bar',
                    deltaValues,
                    `Highest Delta: ${maxInput}`,
                    { index: maxDeltaIndex, value: maxValue }
                );
            }, 1000);
        }
        
        // Tip for lowest delta (if different from highest)
        if (minDeltaIndex >= 0 && minDeltaIndex !== maxDeltaIndex && Math.abs(deltaValues[minDeltaIndex]) > 10) {
            const minInput = inputs[minDeltaIndex];
            const minValue = deltaValues[minDeltaIndex];
            setTimeout(() => {
                this.createAITip(
                    'deltaHeatmapChart',
                    'bar',
                    deltaValues,
                    `Lowest Delta: ${minInput}`,
                    { index: minDeltaIndex, value: minValue }
                );
            }, 1200); // Slightly delayed to avoid race condition
        }
    }

    updateComponentGreeksCharts(greeks) {
        // Earth Greeks chart
        const earthCtx = document.getElementById('earthGreeksChart');
        if (earthCtx) {
            if (this.charts.earthGreeks) {
                this.charts.earthGreeks.destroy();
            }
            
            const inputs = Object.keys(greeks.earth.delta);
            const deltas = inputs.map(i => greeks.earth.delta[i]?.value || 0);
            const gammas = inputs.map(i => greeks.earth.gamma[i]?.value || 0);
            const vegas = inputs.map(i => greeks.earth.vega[i]?.value || 0);
            
            // Add Vega "Overall Volatility" if it exists
            const overallVega = greeks.earth.vega?.['Overall Volatility'];
            const overallRho = greeks.earth.rho?.['Discount Rate'];
            
            // Add datasets for overall Greeks
            const datasets = [
                {
                    label: 'Delta',
                    data: deltas,
                    backgroundColor: 'rgba(0, 102, 204, 0.6)'
                },
                {
                    label: 'Gamma',
                    data: gammas,
                    backgroundColor: 'rgba(16, 185, 129, 0.6)'
                }
            ];
            
            // Add Vega bars (from inputs + overall)
            if (overallVega) {
                const vegaData = [...vegas];
                // Add overall vega as a separate bar if not already in inputs
                if (!inputs.includes('Overall Volatility')) {
                    inputs.push('Overall Volatility');
                    vegaData.push(overallVega.value);
                    deltas.push(0);
                    gammas.push(0);
                }
                datasets.push({
                    label: 'Vega',
                    data: vegaData,
                    backgroundColor: 'rgba(245, 158, 11, 0.6)'
                });
            } else if (vegas.some(v => v !== 0)) {
                datasets.push({
                    label: 'Vega',
                    data: vegas,
                    backgroundColor: 'rgba(245, 158, 11, 0.6)'
                });
            }
            
            // Add Rho if it exists
            if (overallRho) {
                const rhoData = new Array(inputs.length).fill(0);
                if (!inputs.includes('Discount Rate')) {
                    inputs.push('Discount Rate');
                    deltas.push(0);
                    gammas.push(0);
                    if (datasets.length > 2 && datasets[2].label === 'Vega') {
                        datasets[2].data.push(0);
                    }
                    rhoData.push(overallRho.value);
                } else {
                    const rhoIndex = inputs.indexOf('Discount Rate');
                    rhoData[rhoIndex] = overallRho.value;
                }
                datasets.push({
                    label: 'Rho',
                    data: rhoData,
                    backgroundColor: 'rgba(139, 92, 246, 0.6)'
                });
            }
            
            this.charts.earthGreeks = new Chart(earthCtx, {
                type: 'bar',
                data: {
                    labels: inputs,
                    datasets: datasets
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { position: 'top' }
                    },
                    scales: {
                        y: {
                            title: { display: true, text: 'Greek Value ($B)' },
                            beginAtZero: false
                        }
                    }
                }
            });
        }
        
        // Mars Greeks chart
        const marsCtx = document.getElementById('marsGreeksChart');
        if (marsCtx) {
            if (this.charts.marsGreeks) {
                this.charts.marsGreeks.destroy();
            }
            
            const inputs = Object.keys(greeks.mars.delta);
            const deltas = inputs.map(i => greeks.mars.delta[i]?.value || 0);
            const gammas = inputs.map(i => greeks.mars.gamma[i]?.value || 0);
            const vegas = inputs.map(i => greeks.mars.vega[i]?.value || 0);
            const thetas = inputs.map(i => greeks.mars.theta?.[i]?.value || 0);
            
            // Add overall Greeks if they exist
            const overallVega = greeks.mars.vega?.['Overall Volatility'];
            const timeDecay = greeks.mars.theta?.['Time Decay'];
            const overallRho = greeks.mars.rho?.['Discount Rate'];
            
            // Build datasets array
            const datasets = [
                {
                    label: 'Delta',
                    data: deltas,
                    backgroundColor: 'rgba(0, 102, 204, 0.6)'
                },
                {
                    label: 'Gamma',
                    data: gammas,
                    backgroundColor: 'rgba(16, 185, 129, 0.6)'
                }
            ];
            
            // Add Vega (from inputs + overall)
            if (overallVega) {
                const vegaData = [...vegas];
                if (!inputs.includes('Overall Volatility')) {
                    inputs.push('Overall Volatility');
                    deltas.push(0);
                    gammas.push(0);
                    thetas.push(0);
                    vegaData.push(overallVega.value);
                }
                datasets.push({
                    label: 'Vega',
                    data: vegaData,
                    backgroundColor: 'rgba(245, 158, 11, 0.6)'
                });
            } else if (vegas.some(v => v !== 0)) {
                datasets.push({
                    label: 'Vega',
                    data: vegas,
                    backgroundColor: 'rgba(245, 158, 11, 0.6)'
                });
            }
            
            // Add Theta (from inputs + overall)
            if (timeDecay) {
                const thetaData = [...thetas];
                if (!inputs.includes('Time Decay')) {
                    inputs.push('Time Decay');
                    deltas.push(0);
                    gammas.push(0);
                    if (datasets.length > 2 && datasets[2].label === 'Vega') {
                        datasets[2].data.push(0);
                    }
                    thetaData.push(timeDecay.value);
                }
                datasets.push({
                    label: 'Theta',
                    data: thetaData,
                    backgroundColor: 'rgba(239, 68, 68, 0.6)'
                });
            } else if (thetas.some(t => t !== 0)) {
                datasets.push({
                    label: 'Theta',
                    data: thetas,
                    backgroundColor: 'rgba(239, 68, 68, 0.6)'
                });
            }
            
            // Add Rho if it exists
            if (overallRho) {
                const rhoData = new Array(inputs.length).fill(0);
                if (!inputs.includes('Discount Rate')) {
                    inputs.push('Discount Rate');
                    deltas.push(0);
                    gammas.push(0);
                    if (datasets.length > 2 && datasets[2].label === 'Vega') {
                        datasets[2].data.push(0);
                    }
                    if (datasets.length > 3 && datasets[3].label === 'Theta') {
                        datasets[3].data.push(0);
                    }
                    rhoData.push(overallRho.value);
                } else {
                    const rhoIndex = inputs.indexOf('Discount Rate');
                    rhoData[rhoIndex] = overallRho.value;
                }
                datasets.push({
                    label: 'Rho',
                    data: rhoData,
                    backgroundColor: 'rgba(139, 92, 246, 0.6)'
                });
            }
            
            this.charts.marsGreeks = new Chart(marsCtx, {
                type: 'bar',
                data: {
                    labels: inputs,
                    datasets: datasets
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { position: 'top' }
                    },
                    scales: {
                        y: {
                            title: { display: true, text: 'Greek Value ($B)' },
                            beginAtZero: false
                        }
                    }
                }
            });
        }
    }

    // PnL Attribution - Event listener setup
    setupAttributionListeners() {
        document.getElementById('calculateAttributionBtn')?.addEventListener('click', () => {
            this.calculateAttribution();
        });
        
        // PnL Attribution info button
        document.getElementById('attributionInfoBtn')?.addEventListener('click', () => {
            this.openAttributionInfo();
        });
    }

    setupVaRListeners() {
        document.getElementById('calculateVaRBtn')?.addEventListener('click', () => {
            this.calculateVaR();
        });
        
        // VaR info button
        document.getElementById('varInfoBtn')?.addEventListener('click', () => {
            this.openVaRInfo();
        });
        
        // Chart axis controls
        const minInput = document.getElementById('varChartMin');
        const maxInput = document.getElementById('varChartMax');
        const resetBtn = document.getElementById('varChartReset');
        
        const updateChartAxis = () => {
            if (this.currentVaRData && this.charts.var) {
                const minVal = parseFloat(minInput?.value) || null;
                const maxVal = parseFloat(maxInput?.value) || null;
                this.updateVaRChart(this.currentVaRData, minVal, maxVal);
            }
        };
        
        minInput?.addEventListener('change', updateChartAxis);
        minInput?.addEventListener('blur', updateChartAxis);
        maxInput?.addEventListener('change', updateChartAxis);
        maxInput?.addEventListener('blur', updateChartAxis);
        
        resetBtn?.addEventListener('click', () => {
            if (minInput) minInput.value = '';
            if (maxInput) maxInput.value = '';
            if (this.currentVaRData && this.charts.var) {
                // Reset zoom/pan if Chart.js zoom plugin is available
                try {
                    const chart = this.charts.var;
                    // Try to reset zoom using Chart.js zoom plugin
                    if (chart.resetZoom && typeof chart.resetZoom === 'function') {
                        chart.resetZoom();
                    } else if (chart.zoomScale && typeof chart.zoomScale === 'function') {
                        chart.zoomScale('x', { min: null, max: null });
                    } else {
                        // Fallback: recreate chart with default range
                        this.updateVaRChart(this.currentVaRData);
                    }
                } catch (e) {
                    console.warn('Could not reset zoom, recreating chart:', e);
                    // Fallback: recreate chart with default range
                    this.updateVaRChart(this.currentVaRData);
                }
            }
        });
    }

    // AI Callout Toggle Functions
    toggleAICallout(calloutId) {
        const callout = document.getElementById(calloutId);
        const collapsed = document.getElementById(calloutId + 'Collapsed');
        
        if (callout && collapsed) {
            callout.classList.add('collapsed');
            callout.style.display = 'none';
            collapsed.style.display = 'flex';
            
            // Update icon
            const toggleBtn = callout.querySelector('.ai-callout-toggle');
            if (toggleBtn && window.lucide) {
                window.lucide.createIcons();
            }
        }
    }

    expandAICallout(calloutId) {
        const callout = document.getElementById(calloutId);
        const collapsed = document.getElementById(calloutId + 'Collapsed');
        
        if (callout && collapsed) {
            callout.classList.remove('collapsed');
            callout.style.display = 'block';
            collapsed.style.display = 'none';
            
            // Update icon
            const toggleBtn = callout.querySelector('.ai-callout-toggle');
            if (toggleBtn && window.lucide) {
                window.lucide.createIcons();
            }
        }
    }

    async loadModelsForAttribution() {
        try {
            const response = await fetch('/api/models?limit=20&sortBy=createdAt&sortOrder=desc');
            const result = await response.json();
            
            if (result.success) {
                const baseSelect = document.getElementById('attributionBaseModel');
                const compareSelect = document.getElementById('attributionCompareModel');
                
                if (baseSelect && compareSelect) {
                    // Clear existing options (except first)
                    baseSelect.innerHTML = '<option value="">Current Model</option>';
                    compareSelect.innerHTML = '<option value="">Select model...</option>';
                    
                    result.data.forEach(model => {
                        const option1 = document.createElement('option');
                        option1.value = model._id;
                        option1.textContent = model.name || `Model ${model._id}`;
                        baseSelect.appendChild(option1);
                        
                        const option2 = document.createElement('option');
                        option2.value = model._id;
                        option2.textContent = model.name || `Model ${model._id}`;
                        compareSelect.appendChild(option2);
                    });
                }
            }
        } catch (error) {
            console.error('Error loading models for attribution:', error);
        }
    }

    async calculateAttribution(silent = false) {
        const btn = document.getElementById('calculateAttributionBtn');
        const originalText = btn ? btn.innerHTML : '';
        
        if (btn && !silent) {
            btn.disabled = true;
            btn.innerHTML = '<i data-lucide="loader"></i> Calculating...';
            if (window.lucide) window.lucide.createIcons();
        }

        try {
            const baseModelId = document.getElementById('attributionBaseModel')?.value;
            let compareModelId = document.getElementById('attributionCompareModel')?.value;
            
            // For auto-run, try to find a default comparison model if none selected
            if (!compareModelId && silent) {
                try {
                    const modelsResponse = await fetch('/api/models?limit=2&sortBy=createdAt&sortOrder=desc');
                    const modelsResult = await modelsResponse.json();
                    if (modelsResult.success && modelsResult.data.length > 1) {
                        // Use the second most recent model as comparison (first is current)
                        compareModelId = modelsResult.data[1]._id;
                    } else if (modelsResult.success && modelsResult.data.length === 1 && this.currentModelId) {
                        // Only one model exists, skip attribution (need at least 2 models)
                        console.log('⏸️ Skipping Attribution - need at least 2 models for comparison');
                        return;
                    }
                } catch (error) {
                    console.warn('Could not find comparison model for attribution:', error);
                    return;
                }
            }
            
            if (!compareModelId) {
                if (!silent) {
                    alert('Please select a comparison model');
                }
                return;
            }

            // Get base inputs (current or selected model)
            const baseInputs = baseModelId ? null : this.getInputs();
            
            const response = await fetch('/api/attribution', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    baseModelId: baseModelId || null,
                    compareModelId: compareModelId,
                    baseInputs: baseInputs
                })
            });

            const result = await response.json();
            
            if (result.success) {
                this.displayAttribution(result.data);
            } else {
                if (!silent) {
                    alert('Error calculating attribution: ' + result.error);
                }
            }
        } catch (error) {
            console.error('Attribution calculation error:', error);
            if (!silent) {
                alert('Failed to calculate attribution');
            }
        } finally {
            if (btn && !silent) {
                btn.disabled = false;
                btn.innerHTML = originalText;
                if (window.lucide) window.lucide.createIcons();
            }
        }
    }

    displayAttribution(data) {
        const { attribution, totalChange, baseValue, compareValue } = data;
        
        // Store data for AI explanation
        this.currentAttributionData = { attribution, totalChange, baseValue, compareValue };
        
        // Show results
        document.getElementById('attributionResults').style.display = 'block';
        
        // Format values
        const formatValue = (value) => {
            if (Math.abs(value) >= 1000) {
                return `$${(value / 1000).toFixed(2)}T`;
            }
            return `$${value.toFixed(1)}B`;
        };
        
        // Update summary cards
        document.getElementById('attributionTotalChange').textContent = formatValue(totalChange);
        document.getElementById('attributionDeltaPnL').textContent = formatValue(attribution.deltaPnL || 0);
        document.getElementById('attributionGammaPnL').textContent = formatValue(attribution.gammaPnL || 0);
        document.getElementById('attributionVegaPnL').textContent = formatValue(attribution.vegaPnL || 0);
        document.getElementById('attributionThetaPnL').textContent = formatValue(attribution.thetaPnL || 0);
        document.getElementById('attributionRhoPnL').textContent = formatValue(attribution.rhoPnL || 0);
        
        // Update chart
        this.updateAttributionChart(attribution, totalChange);
        
        // Update table
        this.updateAttributionTable(attribution, totalChange);
        
        // Initialize AI explanation icons
        if (window.lucide) window.lucide.createIcons();
        
        // Note: AI commentary is now triggered via icon click, not auto-generated
    }

    // Legacy function - kept for compatibility but AI is now triggered via icon
    async generateAttributionCommentary(data) {
        // AI commentary is now triggered via the icon click handler
        // This function is kept for backward compatibility but does nothing
        return;
    }

    updateAttributionChart(attribution, totalChange) {
        const ctx = document.getElementById('attributionChart');
        if (!ctx) return;
        
        if (this.charts.attribution) {
            this.charts.attribution.destroy();
        }
        
        const categories = ['Delta', 'Gamma', 'Vega', 'Theta', 'Rho'];
        const values = [
            attribution.deltaPnL || 0,
            attribution.gammaPnL || 0,
            attribution.vegaPnL || 0,
            attribution.thetaPnL || 0,
            attribution.rhoPnL || 0
        ];
        
        // Color positive green, negative red
        const colors = values.map(v => v >= 0 ? 'rgba(16, 185, 129, 0.6)' : 'rgba(239, 68, 68, 0.6)');
        
        this.charts.attribution = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: categories,
                datasets: [{
                    label: 'PnL Attribution ($B)',
                    data: values,
                    backgroundColor: colors,
                    borderColor: colors.map(c => c.replace('0.6', '1')),
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const value = context.parsed.y;
                                const pct = totalChange !== 0 ? ((value / totalChange) * 100).toFixed(1) : 0;
                                return `${value >= 0 ? '+' : ''}${value.toFixed(1)}B (${pct >= 0 ? '+' : ''}${pct}%)`;
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        title: {
                            display: true,
                            text: 'PnL Contribution ($B)'
                        },
                        beginAtZero: false
                    }
                }
            }
        });
    }

    updateAttributionTable(attribution, totalChange) {
        const tbody = document.getElementById('attributionTableBody');
        if (!tbody) return;
        
        tbody.innerHTML = '';
        
        if (attribution.details && attribution.details.length > 0) {
            attribution.details.forEach(detail => {
                const row = document.createElement('tr');
                const pct = totalChange !== 0 ? ((detail.totalContribution / totalChange) * 100).toFixed(1) : 0;
                
                row.innerHTML = `
                    <td><strong>${detail.input}</strong></td>
                    <td>${detail.change || '--'}</td>
                    <td>${detail.deltaPnL ? detail.deltaPnL.toFixed(1) : '--'}</td>
                    <td>${detail.gammaPnL ? detail.gammaPnL.toFixed(1) : '--'}</td>
                    <td>${detail.vegaPnL ? detail.vegaPnL.toFixed(1) : '--'}</td>
                    <td><strong>${detail.totalContribution.toFixed(1)}</strong></td>
                    <td>${pct >= 0 ? '+' : ''}${pct}%</td>
                `;
                
                tbody.appendChild(row);
            });
        }
    }

    async calculateVaR(silent = false) {
        const btn = document.getElementById('calculateVaRBtn');
        const originalText = btn ? btn.innerHTML : '';
        
        if (btn && !silent) {
            btn.disabled = true;
            btn.innerHTML = '<i data-lucide="loader"></i> Calculating...';
            if (window.lucide) window.lucide.createIcons();
        }

        try {
            const method = document.getElementById('varMethodSelect')?.value || 'combined';
            const confidence = parseFloat(document.getElementById('varConfidenceSelect')?.value || 0.99);
            const timeHorizon = parseInt(document.getElementById('varTimeHorizonSelect')?.value || 10);

            const response = await fetch('/api/var', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    method,
                    confidence,
                    timeHorizon
                })
            });

            const result = await response.json();
            
            if (result.success) {
                this.displayVaR(result.data);
            } else {
                if (!silent) {
                    alert('Error calculating VaR: ' + result.error);
                }
            }
        } catch (error) {
            console.error('VaR calculation error:', error);
            if (!silent) {
                alert('Failed to calculate VaR');
            }
        } finally {
            if (btn && !silent) {
                btn.disabled = false;
                btn.innerHTML = originalText;
                if (window.lucide) window.lucide.createIcons();
            }
        }
    }

    displayVaR(data) {
        // Store data for AI explanation
        this.currentVaRData = data;
        
        // Show results
        document.getElementById('varResults').style.display = 'block';
        
        // Format values
        const formatValue = (value) => {
            if (Math.abs(value) >= 1000) {
                return `$${(value / 1000).toFixed(2)}T`;
            }
            return `$${value.toFixed(1)}B`;
        };
        
        // Update summary cards
        document.getElementById('varValue').textContent = formatValue(data.varValue || 0);
        document.getElementById('varCurrentValuation').textContent = formatValue(data.currentValuation || 0);
        document.getElementById('varPercent').textContent = `${(data.varPercent || 0).toFixed(2)}%`;
        document.getElementById('varExpectedShortfall').textContent = formatValue(data.expectedShortfall || 0);
        
        // Update charts
        this.updateVaRChart(data);
        this.updateVaRComponentCharts(data);
        
        // Update table
        this.updateVaRTable(data);
        
        // Initialize AI explanation icons
        if (window.lucide) window.lucide.createIcons();
    }

    updateVaRChart(data, customMin = null, customMax = null) {
        const ctx = document.getElementById('varChart');
        if (!ctx) {
            console.error('VaR chart canvas not found');
            return;
        }
        
        // Check if Chart.js is available
        if (typeof Chart === 'undefined') {
            console.error('Chart.js is not loaded');
            return;
        }
        
        // Register zoom plugin if available
        if (typeof zoomPlugin !== 'undefined' && Chart.register) {
            try {
                Chart.register(zoomPlugin);
            } catch (e) {
                console.warn('Zoom plugin already registered or not available:', e);
            }
        }
        
        if (this.charts.var) {
            this.charts.var.destroy();
        }
        
        // Ensure we have valid data
        if (!data || !data.currentValuation || !data.varValue || data.varValue === 0) {
            console.warn('Invalid VaR data for chart:', data);
            return;
        }
        
        // Create distribution chart showing VaR threshold
        const bins = 200; // More bins for smoother curve
        
        // Calculate standard deviation for better default range
        // VaR = z-score * stdDev * sqrt(time)
        // So stdDev = VaR / (z-score * sqrt(time))
        const zScore = 2.326; // 99% confidence
        const timeFactor = Math.sqrt(10 / 252); // 10 days, 252 trading days per year
        const stdDev = data.varValue / (zScore * timeFactor);
        
        // Better default range: show 3 standard deviations on each side of mean
        // This captures ~99.7% of the distribution
        // Ensure the range is centered on current valuation
        const defaultMin = Math.max(0, data.currentValuation - stdDev * 3);
        const defaultMax = data.currentValuation + stdDev * 3;
        
        // Debug: Log the calculation
        console.log('VaR Chart Range Calculation:', {
            currentValuation: data.currentValuation,
            varValue: data.varValue,
            zScore,
            timeFactor,
            stdDev,
            defaultMin,
            defaultMax,
            range: defaultMax - defaultMin
        });
        
        // Use custom min/max if provided, otherwise use default calculation
        const minVal = customMin !== null ? Math.max(0, customMin) : defaultMin;
        const maxVal = customMax !== null ? Math.max(minVal + 100, customMax) : defaultMax;
        
        // Update input fields with current values
        const minInput = document.getElementById('varChartMin');
        const maxInput = document.getElementById('varChartMax');
        if (minInput && !minInput.value) {
            minInput.value = Math.round(defaultMin);
            minInput.placeholder = `Min: $${Math.round(defaultMin)}B`;
        }
        if (maxInput && !maxInput.value) {
            maxInput.value = Math.round(defaultMax);
            maxInput.placeholder = `Max: $${Math.round(defaultMax)}B`;
        }
        const binSize = (maxVal - minVal) / bins;
        
        const labels = [];
        const values = [];
        const varThreshold = data.currentValuation - data.varValue;
        
        const formatValue = (value) => {
            if (Math.abs(value) >= 1000) {
                return `$${(value / 1000).toFixed(2)}T`;
            }
            return `$${value.toFixed(1)}B`;
        };
        
        // Normalize distribution so peak is at current valuation
        let maxDensity = 0;
        const dataPoints = [];
        
        // Calculate distribution values
        for (let i = 0; i < bins; i++) {
            const binCenter = minVal + (i + 0.5) * binSize;
            const distance = binCenter - data.currentValuation;
            // Normal distribution: f(x) = (1/(σ√(2π))) * exp(-0.5 * ((x-μ)/σ)²)
            // Using stdDev calculated from VaR
            const density = Math.exp(-0.5 * Math.pow(distance / stdDev, 2));
            values.push(density);
            if (density > maxDensity) maxDensity = density;
            
            // Create labels for all points
            labels.push(formatValue(binCenter));
        }
        
        // Normalize values to 0-1 range for better visualization
        const normalizedValues = values.map(v => maxDensity > 0 ? v / maxDensity : 0);
        
        // Create data points as {x, y} objects for linear scale
        // Ensure x values match exactly with bin centers
        const probabilityData = [];
        const varThresholdData = [];
        
        for (let i = 0; i < bins; i++) {
            const binCenter = minVal + (i + 0.5) * binSize;
            const yValue = normalizedValues[i];
            
            // Use exact bin center value (no clamping needed for proper alignment)
            probabilityData.push({ x: binCenter, y: yValue });
            
            // VaR threshold line - show the curve below threshold
            if (binCenter <= varThreshold) {
                varThresholdData.push({ x: binCenter, y: yValue });
            } else {
                varThresholdData.push({ x: binCenter, y: null });
            }
        }
        
        // Add boundary points to ensure curve extends to edges and connects properly
        probabilityData.unshift({ x: minVal, y: 0 });
        probabilityData.push({ x: maxVal, y: 0 });
        
        // Debug: Verify peak is at current valuation
        const maxY = Math.max(...normalizedValues);
        const peakIndex = normalizedValues.indexOf(maxY);
        const peakX = minVal + (peakIndex + 0.5) * binSize;
        const expectedPeak = data.currentValuation;
        const peakError = Math.abs(peakX - expectedPeak);
        
        console.log('Distribution peak check:', {
            expectedPeak: expectedPeak,
            actualPeak: peakX,
            difference: peakError,
            peakIndex,
            bins,
            binSize,
            stdDev,
            minVal,
            maxVal
        });
        
        // If peak is significantly off, warn
        if (peakError > (maxVal - minVal) * 0.05) {
            console.warn('Peak is not centered on current valuation!', {
                expected: expectedPeak,
                actual: peakX,
                error: peakError
            });
        }
        
        try {
            // Verify data alignment before creating chart
            const firstX = probabilityData[0]?.x;
            const lastX = probabilityData[probabilityData.length - 1]?.x;
            const peakDataPoint = probabilityData.find(p => p.y === Math.max(...probabilityData.map(d => d.y)));
            
            console.log('Chart data verification:', {
                dataPoints: probabilityData.length,
                firstX,
                lastX,
                peakX: peakDataPoint?.x,
                expectedPeak: data.currentValuation,
                minVal,
                maxVal
            });
            
            this.charts.var = new Chart(ctx, {
                type: 'line',
                data: {
                    datasets: [{
                        label: 'Probability Density',
                        data: probabilityData,
                        borderColor: 'rgba(59, 130, 246, 0.8)',
                        backgroundColor: 'rgba(59, 130, 246, 0.1)',
                        fill: true,
                        tension: 0.4,
                        pointRadius: 0,
                        borderWidth: 2,
                        parsing: false // Tell Chart.js to use x/y directly, don't parse
                    }, {
                        label: 'VaR Threshold (' + formatValue(varThreshold) + ')',
                        data: varThresholdData,
                        borderColor: 'rgba(239, 68, 68, 1)',
                        backgroundColor: 'rgba(239, 68, 68, 0.3)',
                        fill: true,
                        pointRadius: 0,
                        borderWidth: 2,
                        borderDash: [5, 5],
                        parsing: false // Tell Chart.js to use x/y directly
                    }]
                },
                options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: {
                    mode: 'index',
                    intersect: false,
                },
                plugins: {
                    legend: { 
                        display: true,
                        position: 'top'
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const label = context.dataset.label || '';
                                const value = context.parsed.y;
                                const xValue = formatValue(context.parsed.x);
                                if (value === null) return '';
                                return `${label}: ${value.toFixed(4)} at ${xValue}`;
                            }
                        }
                    },
                    zoom: {
                        zoom: {
                            wheel: {
                                enabled: true,
                                speed: 0.05
                            },
                            pinch: {
                                enabled: true
                            },
                            mode: 'x',
                            limits: {
                                x: {
                                    min: 0,
                                    max: data.currentValuation * 3
                                }
                            }
                        },
                        pan: {
                            enabled: true,
                            mode: 'x',
                            limits: {
                                x: {
                                    min: 0,
                                    max: data.currentValuation * 3
                                }
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        title: { display: true, text: 'Probability Density' },
                        beginAtZero: true,
                        max: 1.1
                    },
                    x: {
                        type: 'linear',
                        title: { display: true, text: 'Valuation ($B)' },
                        min: minVal,
                        max: maxVal,
                        position: 'bottom',
                        ticks: {
                            maxTicksLimit: 12,
                            callback: function(value) {
                                return formatValue(value);
                            },
                            maxRotation: 45,
                            minRotation: 45,
                            stepSize: (maxVal - minVal) / 10
                        },
                        grid: {
                            display: true,
                            color: 'rgba(255, 255, 255, 0.1)'
                        },
                        afterFit: function(scale) {
                            // Ensure scale is properly fitted
                            scale.min = minVal;
                            scale.max = maxVal;
                        }
                    }
                }
            }
        });
            
            // Store reset function for zoom plugin
            if (this.charts.var && typeof this.charts.var.resetZoom === 'function') {
                // Zoom plugin provides resetZoom method
                console.log('Zoom plugin loaded successfully');
            } else {
                console.log('Zoom plugin not available, chart created without zoom');
            }
            
            console.log('VaR chart created successfully', {
                dataPoints: probabilityData.length,
                minVal,
                maxVal,
                currentValuation: data.currentValuation,
                varValue: data.varValue,
                xRange: `${minVal.toFixed(0)} - ${maxVal.toFixed(0)}`
            });
        } catch (error) {
            console.error('Error creating VaR chart:', error);
            console.error('Chart data:', {
                bins,
                minVal,
                maxVal,
                probabilityDataLength: probabilityData?.length,
                varThresholdDataLength: varThresholdData?.length
            });
        }
    }

    updateVaRComponentCharts(data) {
        // Earth component chart
        const earthCtx = document.getElementById('varEarthChart');
        if (earthCtx) {
            if (this.charts.varEarth) {
                this.charts.varEarth.destroy();
            }
            
            this.charts.varEarth = new Chart(earthCtx, {
                type: 'doughnut',
                data: {
                    labels: ['Greeks Risk', 'Monte Carlo Risk'],
                    datasets: [{
                        data: [
                            data.components.earth.greeksRisk || 0,
                            data.components.earth.monteCarloRisk || 0
                        ],
                        backgroundColor: ['rgba(59, 130, 246, 0.6)', 'rgba(16, 185, 129, 0.6)']
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { position: 'bottom' },
                        tooltip: {
                            callbacks: {
                                label: function(context) {
                                    return `${context.label}: $${context.parsed.toFixed(1)}B`;
                                }
                            }
                        }
                    }
                }
            });
        }
        
        // Mars component chart
        const marsCtx = document.getElementById('varMarsChart');
        if (marsCtx) {
            if (this.charts.varMars) {
                this.charts.varMars.destroy();
            }
            
            this.charts.varMars = new Chart(marsCtx, {
                type: 'doughnut',
                data: {
                    labels: ['Greeks Risk', 'Monte Carlo Risk'],
                    datasets: [{
                        data: [
                            data.components.mars.greeksRisk || 0,
                            data.components.mars.monteCarloRisk || 0
                        ],
                        backgroundColor: ['rgba(59, 130, 246, 0.6)', 'rgba(16, 185, 129, 0.6)']
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { position: 'bottom' },
                        tooltip: {
                            callbacks: {
                                label: function(context) {
                                    return `${context.label}: $${context.parsed.toFixed(1)}B`;
                                }
                            }
                        }
                    }
                }
            });
        }
    }

    updateVaRTable(data) {
        const tbody = document.getElementById('varTableBody');
        if (!tbody) return;
        
        tbody.innerHTML = '';
        
        // Safely extract component data with null checks
        const earthComp = data.components?.earth || {};
        const marsComp = data.components?.mars || {};
        
        const components = [
            {
                name: 'Earth',
                varContribution: earthComp.varContribution ?? null,
                greeksRisk: earthComp.greeksRisk ?? null,
                monteCarloRisk: earthComp.monteCarloRisk ?? null
            },
            {
                name: 'Mars',
                varContribution: marsComp.varContribution ?? null,
                greeksRisk: marsComp.greeksRisk ?? null,
                monteCarloRisk: marsComp.monteCarloRisk ?? null
            }
        ];
        
        components.forEach(comp => {
            const row = document.createElement('tr');
            // Ensure all values are numbers, defaulting to 0 if null/undefined
            const varContribution = (comp.varContribution != null && !isNaN(comp.varContribution)) ? Number(comp.varContribution) : 0;
            const greeksRisk = (comp.greeksRisk != null && !isNaN(comp.greeksRisk)) ? Number(comp.greeksRisk) : 0;
            const monteCarloRisk = (comp.monteCarloRisk != null && !isNaN(comp.monteCarloRisk)) ? Number(comp.monteCarloRisk) : 0;
            const varValue = (data.varValue != null && !isNaN(data.varValue)) ? Number(data.varValue) : 0;
            const pct = varValue !== 0 ? ((varContribution / varValue) * 100).toFixed(1) : '0.0';
            
            row.innerHTML = `
                <td><strong>${comp.name}</strong></td>
                <td>$${varContribution.toFixed(1)}B</td>
                <td>${pct}%</td>
                <td>$${greeksRisk.toFixed(1)}B</td>
                <td>$${monteCarloRisk.toFixed(1)}B</td>
            `;
            
            tbody.appendChild(row);
        });
    }

    // Helper calculation methods (matching backend logic)
    calculateBandwidthCapacity(year, earth) {
        const baseCapacity = 100; // Tbps
        const growthRate = earth.starlinkPenetration || 0.15;
        return baseCapacity * Math.pow(1 + growthRate, year) * 1000; // Convert to Gbps
    }

    calculateBandwidthPrice(year, earth) {
        // Base price and growth factors (matching Excel: $B$95*(((1+$B$94)*(1+$B$96))^(year-year0))
        const basePrice = 100; // $/Gbps/month (equivalent to $B$95)
        const growthFactor1 = 1.0; // (1+$B$94) - could be inflation or other growth
        const growthFactor2 = 1.0; // (1+$B$96) - could be market growth
        const year0 = 0; // Base year
        
        // Calculate base price with growth factors
        const basePriceWithGrowth = basePrice * Math.pow(growthFactor1 * growthFactor2, year - year0);
        
        // If TAM data not available, use simple exponential decline
        if (!this.tamData || this.tamData.length === 0) {
            const declineRate = earth.bandwidthPriceDecline || 0.10;
            return basePriceWithGrowth * Math.pow(1 - declineRate, year);
        }
        
        // Calculate lookup value: I91*(1-I92)
        // Based on TAM key range (100,000 to 1,000,000,000), I91 likely represents total capacity
        // TAM keys start at 100,000, and year 0 capacity is 100,000 Gbps
        // The (1-I92) adjustment might be for market dynamics, but we need lookup to be >= 100,000
        const capacity = this.calculateBandwidthCapacity(year, earth);
        const declineRate = earth.bandwidthPriceDecline || 0.10;
        
        // I91 equivalent: total capacity (in Gbps)
        // Year 0 capacity is 100,000 Gbps which matches TAM key minimum of 100,000
        const i91 = capacity;
        // I92 equivalent: bandwidth price decline
        const i92 = declineRate;
        
        // Lookup value: I91*(1-I92)
        // This represents capacity adjusted by price decline for market dynamics
        const lookupValue = i91 * (1 - i92);
        
        // Get TAM value from lookup table
        const tamValue = this.lookupTAMMultiplier(lookupValue);
        
        // Get base TAM value for normalization (year 0)
        const year0Capacity = this.calculateBandwidthCapacity(0, earth);
        const year0Penetration = earth.starlinkPenetration || 0.15;
        const year0Decline = earth.bandwidthPriceDecline || 0.10;
        const year0Lookup = (year0Capacity * year0Penetration) * (1 - year0Decline);
        const year0TAMValue = this.lookupTAMMultiplier(year0Lookup);
        
        // Normalize TAM value to get multiplier (ratio of current TAM to base TAM)
        // This gives us a multiplier that reflects market dynamics
        const tamMultiplier = year0TAMValue > 0 ? tamValue / year0TAMValue : 1.0;
        
        // Final price = base × growth factors × TAM multiplier
        return basePriceWithGrowth * tamMultiplier;
    }

    calculateLaunchVolume(year, earth) {
        const baseVolume = earth.launchVolume || 100;
        const growthRate = 0.20;
        return baseVolume * Math.pow(1 + growthRate, year);
    }

    calculateLaunchPrice(year, earth) {
        const basePrice = 50; // $M per launch
        const declineRate = earth.launchPriceDecline || 0.05;
        return basePrice * Math.pow(1 - declineRate, year);
    }

    exportData() {
        if (!this.currentData) {
            alert('Please calculate a valuation first');
            return;
        }

        const dataStr = JSON.stringify(this.currentData, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `spacex_valuation_${new Date().toISOString().split('T')[0]}.json`;
        link.click();
        URL.revokeObjectURL(url);
    }

    // Show Monte Carlo confirmation modal
    showMonteCarloConfirmModal(modelName) {
        const confirmModal = document.getElementById('monteCarloConfirmModal');
        const messageEl = document.getElementById('monteCarloConfirmMessage');
        
        if (confirmModal && messageEl) {
            messageEl.textContent = `Model "${modelName}" has simulations, but the parameters have changed. The existing simulations are based on different inputs. Would you like to run new Monte Carlo simulations with the current parameters?`;
            confirmModal.classList.add('active');
            if (window.lucide) window.lucide.createIcons();
        }
    }

    // Confirm rerun simulation
    confirmRerunSimulation() {
        const confirmModal = document.getElementById('monteCarloConfirmModal');
        if (confirmModal) {
            confirmModal.classList.remove('active');
        }
        
        // Set flag to skip duplicate prompt
        this.autoRunningMonteCarlo = true;
        
        // Switch to Monte Carlo tab and run simulation
        // Use saved Monte Carlo config from model if available
        this.switchView('monteCarlo');
        setTimeout(() => {
            // Update form with saved config if available
            if (this.currentMonteCarloConfig) {
                const runsInput = document.getElementById('monteCarloRuns');
                const useCustomInput = document.getElementById('useCustomDistributions');
                if (runsInput && this.currentMonteCarloConfig.runs) {
                    runsInput.value = this.currentMonteCarloConfig.runs;
                }
                if (useCustomInput && this.currentMonteCarloConfig.useCustomDistributions !== undefined) {
                    useCustomInput.checked = this.currentMonteCarloConfig.useCustomDistributions;
                }
            }
            // Run with skipValidation flag
            this.runMonteCarloSimulation(true);
        }, 300);
    }

    // Cancel rerun simulation
    cancelRerunSimulation() {
        const confirmModal = document.getElementById('monteCarloConfirmModal');
        if (confirmModal) {
            confirmModal.classList.remove('active');
        }
        console.log('User cancelled simulation rerun');
    }

    // Show save simulation modal
    showSaveSimulationModal() {
        const modal = document.getElementById('saveSimulationModal');
        const nameInput = document.getElementById('saveSimulationName');
        if (modal && nameInput) {
            nameInput.value = `Monte Carlo - ${this.currentModelName || 'Model'} - ${new Date().toLocaleDateString()}`;
            document.getElementById('saveSimulationDescription').value = '';
            modal.classList.add('active');
            if (window.lucide) window.lucide.createIcons();
        }
    }

    // Confirm save simulation
    async confirmSaveSimulation() {
        const name = document.getElementById('saveSimulationName').value.trim();
        if (!name) {
            alert('Please enter a simulation name');
            return;
        }

        const description = document.getElementById('saveSimulationDescription').value.trim();

        const modal = document.getElementById('saveSimulationModal');
        if (modal) {
            modal.classList.remove('active');
        }

        try {
            const sampleResults = this.currentMonteCarloData.results.slice(0, 100).map(r => ({
                run: r.run,
                totalValue: r.results.totalValue,
                earthValue: r.results.earthValue,
                marsValue: r.results.marsValue
            }));

            const response = await fetch('/api/monte-carlo', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name,
                    description: description || '',
                    baseInputs: this.getInputs(),
                    distributions: null,
                    runs: this.currentMonteCarloData.runs,
                    valuationModelId: this.currentModelId,
                    statistics: this.currentMonteCarloData.statistics,
                    sampleResults: sampleResults,
                    elapsedSeconds: this.currentMonteCarloData.elapsedSeconds
                })
            });

            const result = await response.json();
            
            if (result.success) {
                alert('Simulation saved successfully!');
                if (this.currentView === 'models') {
                    this.loadModels();
                }
            } else {
                alert('Failed to save simulation: ' + result.error);
            }
        } catch (error) {
            console.error('Save error:', error);
            alert('Failed to save simulation');
        }
    }

    // Cancel save simulation
    cancelSaveSimulation() {
        const modal = document.getElementById('saveSimulationModal');
        if (modal) {
            modal.classList.remove('active');
        }
    }

    // Show notification modal (replaces alert)
    showNotification(title, message, type = 'success') {
        const modal = document.getElementById('notificationModal');
        const titleEl = document.getElementById('notificationTitle');
        const messageEl = document.getElementById('notificationMessage');
        const iconEl = document.getElementById('notificationIcon');
        
        if (modal && titleEl && messageEl && iconEl) {
            // Set title
            titleEl.innerHTML = `<i data-lucide="${type === 'error' ? 'alert-circle' : 'check-circle'}"></i> ${title}`;
            
            // Set message - preserve line breaks
            messageEl.innerHTML = message.replace(/\n/g, '<br>');
            
            // Set icon based on type
            iconEl.setAttribute('data-lucide', type === 'error' ? 'alert-circle' : 'check-circle');
            iconEl.style.color = type === 'error' ? 'var(--error-color)' : 'var(--success-color)';
            
            // Show modal
            console.log('📢 Showing notification modal:', title, message);
            modal.classList.add('active');
            if (window.lucide) window.lucide.createIcons();
        } else {
            console.error('❌ Notification modal elements not found!', { modal, titleEl, messageEl, iconEl });
        }
    }

    // Close notification modal
    closeNotification() {
        const modal = document.getElementById('notificationModal');
        if (modal) {
            modal.classList.remove('active');
        }
    }

    // Helper function to compare inputs (matches backend logic)
    inputsMatch(inputs1, inputs2, tolerance = 0.0001) {
        if (!inputs1 || !inputs2) return false;
        
        // Compare Earth inputs
        const earth1 = inputs1.earth || {};
        const earth2 = inputs2.earth || {};
        if (Math.abs((earth1.starlinkPenetration || 0) - (earth2.starlinkPenetration || 0)) > tolerance) return false;
        if (Math.abs((earth1.bandwidthPriceDecline || 0) - (earth2.bandwidthPriceDecline || 0)) > tolerance) return false;
        if (Math.abs((earth1.launchVolume || 0) - (earth2.launchVolume || 0)) > tolerance) return false;
        if (Math.abs((earth1.launchPriceDecline || 0) - (earth2.launchPriceDecline || 0)) > tolerance) return false;
        
        // Compare Mars inputs
        const mars1 = inputs1.mars || {};
        const mars2 = inputs2.mars || {};
        if (Math.abs((mars1.firstColonyYear || 0) - (mars2.firstColonyYear || 0)) > 0.5) return false;
        if (Math.abs((mars1.transportCostDecline || 0) - (mars2.transportCostDecline || 0)) > tolerance) return false;
        if (Math.abs((mars1.populationGrowth || 0) - (mars2.populationGrowth || 0)) > tolerance) return false;
        if ((mars1.industrialBootstrap || false) !== (mars2.industrialBootstrap || false)) return false;
        
        // Compare Financial inputs
        const financial1 = inputs1.financial || {};
        const financial2 = inputs2.financial || {};
        if (Math.abs((financial1.discountRate || 0) - (financial2.discountRate || 0)) > tolerance) return false;
        if (Math.abs((financial1.dilutionFactor || 0) - (financial2.dilutionFactor || 0)) > tolerance) return false;
        if (Math.abs((financial1.terminalGrowth || 0) - (financial2.terminalGrowth || 0)) > tolerance) return false;
        
        return true;
    }

    // Monte Carlo Simulation
    async runMonteCarloSimulation(skipValidation = false) {
        // Use saved config if available, otherwise use defaults
        const runs = this.currentMonteCarloConfig?.runs || 5000;
        const useCustom = this.currentMonteCarloConfig?.useCustomDistributions || false;
        
        // Update config display before running
        const currentConfig = {
            runs: runs,
            useCustomDistributions: useCustom,
            distributions: this.currentMonteCarloConfig?.distributions || null
        };
        this.displayMonteCarloConfig(currentConfig, !!this.currentMonteCarloConfig);
        
        const baseInputs = this.getInputs();
        
        // Check if we have a loaded model and if simulations are still valid
        // (Skip validation if auto-running from confirmation modal)
        if (this.currentModelId && !skipValidation && !this.autoRunningMonteCarlo) {
            try {
                const simResponse = await fetch(`/api/monte-carlo?valuationModelId=${this.currentModelId}&limit=1`);
                const simResult = await simResponse.json();
                
                if (simResult.success && simResult.data.length > 0) {
                    const latestSim = simResult.data[0];
                    
                    // Compare current form inputs with simulation's baseInputs
                    const inputsMatch = this.inputsMatch(baseInputs, latestSim.baseInputs);
                    
                    if (!inputsMatch) {
                        console.log('⚠️ Current inputs:', baseInputs);
                        console.log('⚠️ Simulation inputs:', latestSim.baseInputs);
                        // Show confirmation modal instead of system confirm
                        this.showMonteCarloConfirmModal(this.currentModelName || 'Current Model');
                        // Store that we're waiting for confirmation
                        this.pendingMonteCarloRun = { runs, useCustom, baseInputs };
                        // Wait for user confirmation before proceeding
                        return;
                    } else {
                        console.log('✅ Simulations match current inputs - running new simulation');
                    }
                }
            } catch (error) {
                console.warn('Could not check simulation validity:', error);
            }
        }
        
        // Set auto-run flag BEFORE running (so displayMonteCarloResults knows)
        const isAutoRun = skipValidation && this.autoRunningMonteCarlo;
        
        // Clear flags
        this.pendingMonteCarloRun = null;
        
        // Show progress modal
        const progressModal = document.getElementById('monteCarloProgressModal');
        const progressBar = document.getElementById('monteCarloProgressBar');
        const progressText = document.getElementById('monteCarloProgressText');
        
        if (progressModal) {
            progressModal.classList.add('active');
            progressBar.style.width = '10%';
            // Different message if auto-running vs manual
            const isAutoRun = skipValidation && this.autoRunningMonteCarlo;
            progressText.textContent = isAutoRun 
                ? 'Running Monte Carlo simulation automatically...'
                : 'Parameters have changed - Monte Carlo is producing new simulations...';
            if (window.lucide) window.lucide.createIcons();
        }
        
        // Show loading on button
        const btn = document.getElementById('runMonteCarloBtn');
        const originalText = btn.innerHTML;
        btn.disabled = true;
        btn.innerHTML = '<i data-lucide="loader"></i> Running...';
        lucide.createIcons();

        // Simulate progress updates (since we can't get real-time progress from API)
        let progressPercent = 10;
        const progressInterval = setInterval(() => {
            progressPercent = Math.min(progressPercent + Math.random() * 15, 90);
            if (progressBar) {
                progressBar.style.width = progressPercent + '%';
            }
            if (progressText) {
                const runsCompleted = Math.floor((progressPercent / 100) * runs);
                progressText.textContent = `Running ${runsCompleted.toLocaleString()} of ${runs.toLocaleString()} simulations...`;
            }
        }, 500);

        try {
            const response = await fetch('/api/monte-carlo/run', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    baseInputs,
                    distributions: useCustom ? null : null, // Use defaults for now
                    runs
                })
            });

            const result = await response.json();
            
            // Complete progress
            clearInterval(progressInterval);
            if (progressBar) progressBar.style.width = '100%';
            if (progressText) progressText.textContent = 'Simulation complete! Processing results...';
            
            // Small delay to show completion
            await new Promise(resolve => setTimeout(resolve, 500));
            
            if (result.success) {
                // Store results for display FIRST (before displayMonteCarloResults)
                // This ensures deterministic calculation checks see Monte Carlo data exists
                this.currentMonteCarloData = result.data;
                // Pass auto-run flag to prevent double dashboard updates
                this.displayMonteCarloResults(result.data, isAutoRun);
                
                // Always save simulation if we have a model loaded (for both auto and manual runs)
                // BUT: Don't overwrite baseline models - they are reference points
                if (this.currentModelId) {
                    // Check if this is a baseline model
                    try {
                        const modelResponse = await fetch(`/api/models/${this.currentModelId}`);
                        const modelResult = await modelResponse.json();
                        if (modelResult.success && modelResult.data.isBaseline) {
                            console.warn('⚠️ Baseline model detected - skipping auto-save to preserve reference values');
                            console.warn('   Baseline models should not have simulations run on them.');
                            console.warn('   They are reference points from the spreadsheet.');
                            // Show notification to user
                            const notification = document.createElement('div');
                            notification.style.cssText = `
                                position: fixed;
                                top: 100px;
                                right: 20px;
                                background: var(--warning-color);
                                color: white;
                                padding: 12px 20px;
                                border-radius: 8px;
                                box-shadow: var(--shadow-lg);
                                z-index: 10000;
                                display: flex;
                                align-items: center;
                                gap: 8px;
                                font-size: 14px;
                                max-width: 400px;
                            `;
                            notification.innerHTML = `
                                <i data-lucide="alert-triangle"></i>
                                <span>Baseline model: Simulation not saved to preserve spreadsheet reference values</span>
                            `;
                            document.body.appendChild(notification);
                            if (window.lucide) window.lucide.createIcons();
                            setTimeout(() => {
                                notification.style.transition = 'opacity 0.3s';
                                notification.style.opacity = '0';
                                setTimeout(() => notification.remove(), 300);
                            }, 5000);
                        } else {
                            await this.autoSaveMonteCarloSimulation(result.data, baseInputs, runs);
                            console.log('✅ Simulation saved successfully');
                        }
                    } catch (error) {
                        console.warn('⚠️ Could not check if baseline model:', error);
                        // Proceed with save if check fails
                        await this.autoSaveMonteCarloSimulation(result.data, baseInputs, runs);
                        console.log('✅ Simulation saved successfully');
                    }
                } else {
                    console.warn('⚠️ No model loaded - simulation not saved. Please load a model to save simulations.');
                }
                
                // Show completion UI - user must dismiss manually
                this.showMonteCarloProgressComplete(false, runs);
            } else {
                // Show error and allow dismissal
                if (progressText) {
                    progressText.textContent = 'Simulation failed: ' + result.error;
                    progressText.style.color = 'var(--error-color)';
                }
                this.showMonteCarloProgressComplete(true);
            }
        } catch (error) {
            console.error('Monte Carlo error:', error);
            // Show error and allow dismissal
            if (progressText) {
                progressText.textContent = 'Failed to run Monte Carlo simulation: ' + error.message;
                progressText.style.color = 'var(--error-color)';
            }
            this.showMonteCarloProgressComplete(true);
        } finally {
            // Clear auto-run flag AFTER results are displayed
            if (this.autoRunningMonteCarlo) {
                this.autoRunningMonteCarlo = false;
            }
            
            // DON'T automatically close modal - user must dismiss it
            // Modal will remain open until user clicks close button
            
            clearInterval(progressInterval);
            
            // Restore button
            btn.disabled = false;
            btn.innerHTML = originalText;
            lucide.createIcons();
        }
    }

    showMonteCarloProgressComplete(isError = false, numSimulations = null) {
        const progressModal = document.getElementById('monteCarloProgressModal');
        const spinner = document.getElementById('monteCarloProgressSpinner');
        const title = document.getElementById('monteCarloProgressTitle');
        const description = document.getElementById('monteCarloProgressDescription');
        const progressText = document.getElementById('monteCarloProgressText');
        const completeDiv = document.getElementById('monteCarloProgressComplete');
        const closeBtn = document.getElementById('closeMonteCarloProgressBtn');
        
        if (spinner) spinner.style.display = 'none';
        if (title) {
            title.textContent = isError ? 'Simulation Failed' : 'Simulation Complete!';
            title.style.color = isError ? 'var(--error-color)' : 'var(--success-color)';
        }
        
        // Build description with simulation count and Greeks info
        if (description) {
            if (isError) {
                description.textContent = 'The simulation encountered an error. Please check the error message above and try again.';
            } else {
                let descText = 'The Monte Carlo simulation has completed successfully. Results have been updated.';
                
                // Add simulation count if available
                if (numSimulations !== null && numSimulations > 0) {
                    descText += `\n\n📊 Simulations Run: ${numSimulations.toLocaleString()}`;
                }
                
                // Check if Greeks dashboard is visible - if so, suggest recalculation
                const greeksDashboard = document.getElementById('greeksDashboard');
                if (greeksDashboard && greeksDashboard.style.display !== 'none') {
                    descText += '\n\n⚠️ Note: Greeks may need to be recalculated to reflect the new simulation results.';
                }
                
                description.textContent = descText;
                description.style.whiteSpace = 'pre-line'; // Allow line breaks
            }
        }
        
        if (completeDiv) completeDiv.style.display = 'block';
        if (closeBtn) closeBtn.style.display = 'block';
        
        // Add success icon
        if (!isError && spinner) {
            spinner.innerHTML = '<i data-lucide="check-circle" style="width: 48px; height: 48px; color: var(--success-color);"></i>';
            if (window.lucide) window.lucide.createIcons();
        } else if (isError && spinner) {
            spinner.innerHTML = '<i data-lucide="x-circle" style="width: 48px; height: 48px; color: var(--error-color);"></i>';
            if (window.lucide) window.lucide.createIcons();
        }
    }

    closeMonteCarloProgress() {
        const progressModal = document.getElementById('monteCarloProgressModal');
        const progressBar = document.getElementById('monteCarloProgressBar');
        const progressText = document.getElementById('monteCarloProgressText');
        const spinner = document.getElementById('monteCarloProgressSpinner');
        const title = document.getElementById('monteCarloProgressTitle');
        const description = document.getElementById('monteCarloProgressDescription');
        const completeDiv = document.getElementById('monteCarloProgressComplete');
        const closeBtn = document.getElementById('closeMonteCarloProgressBtn');
        
        if (progressModal) {
            progressModal.classList.remove('active');
        }
        
        // Reset UI for next run
        if (progressBar) progressBar.style.width = '0%';
        if (progressText) {
            progressText.textContent = 'Initializing simulation...';
            progressText.style.color = 'var(--text-secondary)';
        }
        if (spinner) {
            spinner.innerHTML = '<i data-lucide="loader-2" style="width: 48px; height: 48px; animation: spin 1s linear infinite;"></i>';
            spinner.style.display = 'block';
        }
        if (title) {
            title.textContent = 'Parameters Have Changed';
            title.style.color = 'var(--text-primary)';
        }
        if (description) {
            description.textContent = 'Monte Carlo is calculating new simulations based on the updated parameters.\nThis may take a few moments...';
            description.style.whiteSpace = 'pre-line'; // Reset to allow line breaks
        }
        if (completeDiv) completeDiv.style.display = 'none';
        if (closeBtn) closeBtn.style.display = 'none';
        
        if (window.lucide) window.lucide.createIcons();
    }

    displayMonteCarloResults(data, isAutoRun = false) {
        // Store simulation results for table display
        this.currentMonteCarloSimulations = data.results || [];
        
        // Handle different data structures - check if statistics exists
        if (!data || !data.statistics) {
            console.error('Monte Carlo data missing statistics:', data);
            // Try to calculate statistics from results if available
            if (this.currentMonteCarloSimulations.length > 0) {
                const values = this.currentMonteCarloSimulations
                    .map(sim => sim.results?.totalValue || sim.totalValue || 0)
                    .filter(v => typeof v === 'number' && !isNaN(v));
                
                if (values.length > 0) {
                    values.sort((a, b) => a - b);
                    const mean = values.reduce((a, b) => a + b, 0) / values.length;
                    const median = values[Math.floor(values.length / 2)];
                    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
                    const stdDev = Math.sqrt(variance);
                    
                    data.statistics = {
                        totalValue: {
                            mean,
                            median,
                            stdDev,
                            min: values[0],
                            max: values[values.length - 1],
                            p10: values[Math.floor(values.length * 0.1)],
                            q1: values[Math.floor(values.length * 0.25)],
                            q3: values[Math.floor(values.length * 0.75)],
                            p90: values[Math.floor(values.length * 0.9)]
                        }
                    };
                } else {
                    alert('Simulation completed but no valid results found.');
                    return;
                }
            } else {
                alert('Simulation completed but statistics are missing. Please check the results.');
                return;
            }
        }
        
        // Extract statistics - handle different data structures
        const stats = data.statistics.totalValue || data.statistics || {};
        
        const formatBillion = (value) => {
            if (value == null || value === undefined || (value !== 0 && !value)) return 'N/A';
            // Values are already in billions
            // If >= 1000 billion, display as trillions
            if (value >= 1000) {
                return `$${(value / 1000).toFixed(2)}T`;
            }
            return `$${value.toFixed(2)}B`;
        };

        // Update statistics with safe access
        document.getElementById('mcMean').textContent = formatBillion(stats.mean);
        document.getElementById('mcMedian').textContent = formatBillion(stats.median);
        document.getElementById('mcStdDev').textContent = formatBillion(stats.stdDev);
        document.getElementById('mcMin').textContent = formatBillion(stats.min);
        document.getElementById('mcMax').textContent = formatBillion(stats.max);
        document.getElementById('mcP10').textContent = formatBillion(stats.p10);
        document.getElementById('mcQ1').textContent = formatBillion(stats.q1);
        document.getElementById('mcQ3').textContent = formatBillion(stats.q3);
        document.getElementById('mcP90').textContent = formatBillion(stats.p90);

        // Show results section and hide empty state
        const resultsSection = document.getElementById('monteCarloResultsSection');
        const emptyState = document.getElementById('monteCarloEmptyState');
        if (resultsSection) resultsSection.style.display = 'block';
        if (emptyState) emptyState.style.display = 'none';

        // Store current simulation data for saving
        this.currentMonteCarloData = data;

        // Update charts - handle missing distribution data
        if (data.statistics && data.statistics.distribution) {
            this.updateMonteCarloDistributionChart(data.statistics.distribution);
        } else if (this.currentMonteCarloSimulations && this.currentMonteCarloSimulations.length > 0) {
            // Generate distribution from results if not provided
            const values = this.currentMonteCarloSimulations
                .map(sim => sim.results?.totalValue || sim.totalValue || 0)
                .filter(v => typeof v === 'number' && !isNaN(v));
            
            if (values.length > 0) {
                const min = Math.min(...values);
                const max = Math.max(...values);
                const bins = 50;
                const binSize = (max - min) / bins;
                const histogram = new Array(bins).fill(0);
                
                values.forEach(val => {
                    const binIndex = Math.min(Math.floor((val - min) / binSize), bins - 1);
                    histogram[binIndex]++;
                });
                
                // Normalize histogram
                const maxCount = Math.max(...histogram);
                const normalizedHistogram = histogram.map(count => (count / maxCount) * 100);
                
                this.updateMonteCarloDistributionChart({
                    min,
                    max,
                    bins,
                    binSize,
                    histogram: normalizedHistogram,
                    binCenters: Array.from({ length: bins }, (_, i) => min + (i + 0.5) * binSize)
                });
            }
        }
        
        if (data.statistics) {
            this.updateMonteCarloComparisonChart(data.statistics);
        }
        
        // Update simulations table
        this.updateSimulationsTable();
        
        // Update dashboard with Monte Carlo mean values
        // Monte Carlo simulations ARE the valuation calculations - they should drive the dashboard
        // Always update dashboard with Monte Carlo mean (both manual and auto runs)
        if (data.statistics && data.statistics.totalValue) {
            const mcStats = data.statistics;
            const dashboardData = {
                total: {
                    value: mcStats.totalValue.mean || 0,
                    breakdown: {
                        earth: mcStats.earthValue?.mean || 0,
                        mars: mcStats.marsValue?.mean || 0,
                        earthPercent: mcStats.totalValue.mean > 0 
                            ? ((mcStats.earthValue?.mean || 0) / mcStats.totalValue.mean) * 100 
                            : 0,
                        marsPercent: mcStats.totalValue.mean > 0 
                            ? ((mcStats.marsValue?.mean || 0) / mcStats.totalValue.mean) * 100 
                            : 0
                    }
                },
                earth: {
                    adjustedValue: mcStats.earthValue?.mean || 0,
                    terminalValue: mcStats.earthValue?.mean || 0,
                    // Include cash flow timeline from Monte Carlo results
                    cashFlow: data.earth?.cashFlow || null,
                    presentValue: data.earth?.presentValue || null
                },
                mars: {
                    adjustedValue: mcStats.marsValue?.mean || 0,
                    optionValue: mcStats.marsValue?.mean || 0
                }
            };
            
            // Update dashboard with Monte Carlo mean values
            // Mark as allowed since this is Monte Carlo data
            dashboardData._allowDeterministic = false; // This is Monte Carlo, not deterministic
            this.updateDashboard(dashboardData);
            
            // Update ratios dashboard if comparables are loaded
            if (this.currentComparablesData && this.currentComparablesData.length > 0) {
                this.calculateImpliedValuations(this.currentComparablesData);
            }
            
            console.log('✅ Dashboard updated with Monte Carlo mean values (primary valuation):', {
                total: mcStats.totalValue.mean,
                earth: mcStats.earthValue?.mean,
                mars: mcStats.marsValue?.mean
            });
        }
    }
    
    updateSimulationsTable() {
        if (!this.currentMonteCarloSimulations || this.currentMonteCarloSimulations.length === 0) {
            return;
        }
        
        const tbody = document.getElementById('simulationsTableBody');
        if (!tbody) return;
        
        // Get pagination settings
        const pageSize = parseInt(document.getElementById('simulationsPageSize')?.value || 100);
        const currentPage = this.simulationsCurrentPage || 1;
        const searchTerm = document.getElementById('simulationsSearch')?.value.toLowerCase() || '';
        
        // Filter simulations if search term exists
        let filteredSimulations = this.currentMonteCarloSimulations;
        if (searchTerm) {
            filteredSimulations = this.currentMonteCarloSimulations.filter(sim => {
                const iteration = sim.run || sim.iteration || '';
                const earth = sim.results?.earthValue || sim.earthValue || 0;
                const mars = sim.results?.marsValue || sim.marsValue || 0;
                const total = sim.results?.totalValue || sim.totalValue || 0;
                return iteration.toString().includes(searchTerm) ||
                       earth.toString().includes(searchTerm) ||
                       mars.toString().includes(searchTerm) ||
                       total.toString().includes(searchTerm);
            });
        }
        
        // Calculate pagination
        const totalPages = Math.ceil(filteredSimulations.length / pageSize);
        const startIndex = (currentPage - 1) * pageSize;
        const endIndex = Math.min(startIndex + pageSize, filteredSimulations.length);
        const pageSimulations = filteredSimulations.slice(startIndex, endIndex);
        
        // Clear table
        tbody.innerHTML = '';
        
        if (pageSimulations.length === 0) {
            tbody.innerHTML = '<tr><td colspan="13" style="text-align: center; padding: var(--spacing-lg); color: var(--text-secondary);">No simulation results found.</td></tr>';
            return;
        }
        
        const formatValue = (val) => {
            if (val == null || val === undefined) return '--';
            // Values are in billions
            // >= 1000 billion = trillions (show T)
            // < 1000 billion = billions (show B)
            if (val >= 1000) {
                return `$${(val / 1000).toFixed(2)}T`;
            }
            return `$${val.toFixed(1)}B`;
        };
        
        const formatPercent = (val) => {
            if (val == null || val === undefined) return '--';
            return `${(val * 100).toFixed(2)}%`;
        };
        
        const formatNumber = (val, decimals = 0) => {
            if (val == null || val === undefined) return '--';
            return val.toFixed(decimals);
        };
        
        // Populate table with essential columns only
        pageSimulations.forEach((sim, index) => {
            const iteration = sim.run || sim.iteration || (startIndex + index + 1);
            const inputs = sim.inputs || {};
            const results = sim.results || {};
            
            // Key input parameters (most impactful)
            const starlinkPenetration = inputs.earth?.starlinkPenetration;
            const launchVolume = inputs.earth?.launchVolume;
            const firstColonyYear = inputs.mars?.firstColonyYear;
            const discountRate = inputs.financial?.discountRate;
            
            // Final valuations
            const earthValue = results.earthValue || sim.earthValue || 0;
            const marsValue = results.marsValue || sim.marsValue || 0;
            const totalValue = results.totalValue || sim.totalValue || (earthValue + marsValue);
            const dilutionFactor = inputs.financial?.dilutionFactor || 0.15;
            const dilutedValue = results.dilutedValue || sim.dilutedValue || (totalValue * (1 - dilutionFactor));
            
            // Percentages
            const earthPercent = totalValue > 0 ? ((earthValue / totalValue) * 100).toFixed(2) : '0.00';
            const marsPercent = totalValue > 0 ? ((marsValue / totalValue) * 100).toFixed(2) : '0.00';
            
            const row = document.createElement('tr');
            row.dataset.simulationIndex = startIndex + index;
            row.innerHTML = `
                <td style="text-align: center;">
                    <button class="icon-button btn-sm" onclick="app.showSimulationDetails(${startIndex + index})" title="View details">
                        <i data-lucide="chevron-right"></i>
                    </button>
                </td>
                <td style="font-weight: 600;">${iteration}</td>
                <td>${starlinkPenetration != null ? formatPercent(starlinkPenetration) : '--'}</td>
                <td>${launchVolume != null ? formatNumber(launchVolume, 0) : '--'}</td>
                <td>${firstColonyYear || '--'}</td>
                <td>${discountRate != null ? formatPercent(discountRate) : '--'}</td>
                <td><strong>${formatValue(earthValue)}</strong></td>
                <td><strong>${formatValue(marsValue)}</strong></td>
                <td><strong style="color: var(--primary-color);">${formatValue(totalValue)}</strong></td>
                <td>${formatValue(dilutedValue)}</td>
                <td>${earthPercent}%</td>
                <td>${marsPercent}%</td>
                <td>
                    <button class="btn btn-secondary btn-sm" onclick="app.showSimulationDetails(${startIndex + index})">
                        <i data-lucide="eye"></i> View
                    </button>
                </td>
            `;
            tbody.appendChild(row);
        });
        
        if (window.lucide) window.lucide.createIcons();
        
        // Update pagination
        this.updateSimulationsPagination(currentPage, totalPages, filteredSimulations.length);
    }
    
    updateSimulationsPagination(currentPage, totalPages, totalResults) {
        const pagination = document.getElementById('simulationsPagination');
        if (!pagination) return;
        
        pagination.innerHTML = '';
        
        if (totalPages <= 1) return;
        
        // Previous button
        const prevBtn = document.createElement('button');
        prevBtn.className = 'btn btn-secondary btn-sm';
        prevBtn.disabled = currentPage === 1;
        prevBtn.innerHTML = '<i data-lucide="chevron-left"></i> Previous';
        prevBtn.onclick = () => {
            if (currentPage > 1) {
                this.simulationsCurrentPage = currentPage - 1;
                this.updateSimulationsTable();
            }
        };
        pagination.appendChild(prevBtn);
        
        // Page info
        const pageInfo = document.createElement('span');
        pageInfo.style.padding = '0 var(--spacing-md)';
        pageInfo.textContent = `Page ${currentPage} of ${totalPages} (${totalResults.toLocaleString()} results)`;
        pagination.appendChild(pageInfo);
        
        // Next button
        const nextBtn = document.createElement('button');
        nextBtn.className = 'btn btn-secondary btn-sm';
        nextBtn.disabled = currentPage === totalPages;
        nextBtn.innerHTML = 'Next <i data-lucide="chevron-right"></i>';
        nextBtn.onclick = () => {
            if (currentPage < totalPages) {
                this.simulationsCurrentPage = currentPage + 1;
                this.updateSimulationsTable();
            }
        };
        pagination.appendChild(nextBtn);
        
        if (window.lucide) window.lucide.createIcons();
    }
    
    showSimulationDetails(index) {
        if (!this.currentMonteCarloSimulations || index < 0 || index >= this.currentMonteCarloSimulations.length) {
            return;
        }
        
        const sim = this.currentMonteCarloSimulations[index];
        const modal = document.getElementById('simulationDetailModal');
        const iterationEl = document.getElementById('detailIteration');
        const contentEl = document.getElementById('simulationDetailContent');
        
        if (!modal || !iterationEl || !contentEl) return;
        
        const iteration = sim.run || sim.iteration || index + 1;
        iterationEl.textContent = iteration;
        
        const inputs = sim.inputs || {};
        const results = sim.results || {};
        const earthResults = sim.earthResults || results.earthResults || {};
        const marsResults = sim.marsResults || results.marsResults || {};
        
        const formatValue = (val) => {
            if (val == null || val === undefined) return 'N/A';
            if (val >= 1000) return `$${(val / 1000).toFixed(2)}T`;
            return `$${val.toFixed(2)}B`;
        };
        
        const formatPercent = (val) => {
            if (val == null || val === undefined) return 'N/A';
            return `${(val * 100).toFixed(2)}%`;
        };
        
        // Build detailed content
        contentEl.innerHTML = `
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: var(--spacing-lg);">
                <!-- Input Parameters -->
                <div class="section">
                    <h3 style="margin-top: 0;"><i data-lucide="sliders"></i> Input Parameters</h3>
                    <div style="display: grid; gap: var(--spacing-sm);">
                        <div><strong>Starlink Penetration:</strong> ${formatPercent(inputs.earth?.starlinkPenetration)}</div>
                        <div><strong>Launch Volume:</strong> ${inputs.earth?.launchVolume || 'N/A'}</div>
                        <div><strong>Bandwidth Price Decline:</strong> ${formatPercent(inputs.earth?.bandwidthPriceDecline)}</div>
                        <div><strong>First Colony Year:</strong> ${inputs.mars?.firstColonyYear || 'N/A'}</div>
                        <div><strong>Population Growth:</strong> ${formatPercent(inputs.mars?.populationGrowth)}</div>
                        <div><strong>Discount Rate:</strong> ${formatPercent(inputs.financial?.discountRate)}</div>
                        <div><strong>Dilution Factor:</strong> ${formatPercent(inputs.financial?.dilutionFactor || 0.15)}</div>
                    </div>
                </div>
                
                <!-- Earth Results -->
                <div class="section">
                    <h3 style="margin-top: 0;"><i data-lucide="globe"></i> Earth Component</h3>
                    <div style="display: grid; gap: var(--spacing-sm);">
                        <div><strong>Earth Value:</strong> ${formatValue(results.earthValue || earthResults.adjustedValue)}</div>
                        <div><strong>Terminal Value:</strong> ${formatValue(earthResults.terminalValue)}</div>
                        <div><strong>Revenue (O119):</strong> ${formatValue(earthResults.o119 || earthResults.O119)}</div>
                        <div><strong>Final Value (O153):</strong> ${formatValue(earthResults.o153 || earthResults.O153)}</div>
                    </div>
                </div>
                
                <!-- Mars Results -->
                <div class="section">
                    <h3 style="margin-top: 0;"><i data-lucide="globe"></i> Mars Component</h3>
                    <div style="display: grid; gap: var(--spacing-sm);">
                        <div><strong>Mars Value:</strong> ${formatValue(results.marsValue || marsResults.adjustedValue)}</div>
                        <div><strong>Option Value:</strong> ${formatValue(marsResults.optionValue)}</div>
                        <div><strong>Cumulative Value (K54):</strong> ${formatValue(marsResults.k54 || marsResults.K54)}</div>
                        <div><strong>Cumulative Revenue (K8):</strong> ${formatValue(marsResults.k8 || marsResults.K8)}</div>
                        <div><strong>Cumulative Costs (K27):</strong> ${formatValue(marsResults.k27 || marsResults.K27)}</div>
                    </div>
                </div>
                
                <!-- Summary -->
                <div class="section">
                    <h3 style="margin-top: 0;"><i data-lucide="bar-chart"></i> Summary</h3>
                    <div style="display: grid; gap: var(--spacing-sm);">
                        <div><strong>Total Value:</strong> <span style="color: var(--primary-color); font-size: 1.2em;">${formatValue(results.totalValue || (results.earthValue + results.marsValue))}</span></div>
                        <div><strong>Diluted Value:</strong> ${formatValue(results.dilutedValue)}</div>
                        <div><strong>Earth %:</strong> ${results.totalValue > 0 ? (((results.earthValue || 0) / results.totalValue) * 100).toFixed(2) : '0.00'}%</div>
                        <div><strong>Mars %:</strong> ${results.totalValue > 0 ? (((results.marsValue || 0) / results.totalValue) * 100).toFixed(2) : '0.00'}%</div>
                    </div>
                </div>
            </div>
        `;
        
        modal.style.display = 'block';
        if (window.lucide) window.lucide.createIcons();
    }
    
    closeSimulationDetails() {
        const modal = document.getElementById('simulationDetailModal');
        if (modal) {
            modal.style.display = 'none';
        }
    }
    
    openMonteCarloInfo() {
        const modal = document.getElementById('monteCarloInfoModal');
        if (modal) {
            modal.style.display = 'flex';
            if (window.lucide) window.lucide.createIcons();
        }
    }
    
    closeMonteCarloInfo() {
        const modal = document.getElementById('monteCarloInfoModal');
        if (modal) {
            modal.style.display = 'none';
        }
    }
    
    openVaRInfo() {
        const modal = document.getElementById('varInfoModal');
        if (modal) {
            modal.style.display = 'flex';
            if (window.lucide) window.lucide.createIcons();
        }
    }
    
    closeVaRInfo() {
        const modal = document.getElementById('varInfoModal');
        if (modal) {
            modal.style.display = 'none';
        }
    }
    
    openSensitivityInfo() {
        const modal = document.getElementById('sensitivityInfoModal');
        if (modal) {
            modal.style.display = 'flex';
            if (window.lucide) window.lucide.createIcons();
        }
    }
    
    closeSensitivityInfo() {
        const modal = document.getElementById('sensitivityInfoModal');
        if (modal) {
            modal.style.display = 'none';
        }
    }
    
    openStressInfo() {
        const modal = document.getElementById('stressInfoModal');
        if (modal) {
            modal.style.display = 'flex';
            if (window.lucide) window.lucide.createIcons();
        }
    }
    
    closeStressInfo() {
        const modal = document.getElementById('stressInfoModal');
        if (modal) {
            modal.style.display = 'none';
        }
    }
    
    openAttributionInfo() {
        const modal = document.getElementById('attributionInfoModal');
        if (modal) {
            modal.style.display = 'flex';
            if (window.lucide) window.lucide.createIcons();
        }
    }
    
    closeAttributionInfo() {
        const modal = document.getElementById('attributionInfoModal');
        if (modal) {
            modal.style.display = 'none';
        }
    }
    
    openRatiosInfo() {
        const modal = document.getElementById('ratiosInfoModal');
        if (modal) {
            modal.style.display = 'flex';
            if (window.lucide) window.lucide.createIcons();
        }
    }
    
    closeRatiosInfo() {
        const modal = document.getElementById('ratiosInfoModal');
        if (modal) {
            modal.style.display = 'none';
        }
    }
    
    setupRatiosListeners() {
        // Ratios info button
        document.getElementById('ratiosInfoBtn')?.addEventListener('click', () => {
            this.openRatiosInfo();
        });
        
        // Refresh comparables button - force refresh from API
        const refreshBtn = document.getElementById('refreshComparablesBtn');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', (e) => {
                e.preventDefault();
                console.log('🔄 Refresh button clicked - forcing API refresh');
                this.loadComparables(true); // Pass true to force refresh
            });
            console.log('✅ Refresh comparables button listener attached');
        } else {
            console.warn('⚠️ Refresh comparables button not found');
        }
        
        // Sector select change - use cached data, don't force refresh
        document.getElementById('comparableSectorSelect')?.addEventListener('change', () => {
            this.loadComparables(false); // Don't force refresh on sector change
        });
        
        // Ratios tab switching
        const ratiosView = document.getElementById('ratios');
        if (ratiosView) {
            ratiosView.querySelectorAll('.insights-tab').forEach(tab => {
                tab.addEventListener('click', () => {
                    const tabName = tab.dataset.tab;
                    
                    // Remove active class from all tabs in ratios view only
                    ratiosView.querySelectorAll('.insights-tab').forEach(t => t.classList.remove('active'));
                    ratiosView.querySelectorAll('.insights-tab-content').forEach(c => {
                        c.classList.remove('active');
                        c.style.display = 'none';
                    });
                    
                    // Add active class to clicked tab and corresponding content
                    tab.classList.add('active');
                    const contentEl = document.getElementById(`ratiosTab-${tabName}`);
                    if (contentEl) {
                        contentEl.classList.add('active');
                        contentEl.style.display = 'block';
                        
                        // Load comparables if switching to comparables tab
                        if (tabName === 'comparables') {
                            this.loadComparables();
                        }
                        // Update charts if switching to analysis tab
                        if (tabName === 'analysis') {
                            if (this.currentComparablesData && this.currentComparablesData.length > 0) {
                                this.updateRatiosCharts(this.currentComparablesData);
                            } else {
                                // Load comparables data first
                                this.loadComparables();
                            }
                        }
                        // Ensure dashboard calculations are updated when switching to dashboard tab
                        if (tabName === 'dashboard') {
                            if (this.currentComparablesData && this.currentComparablesData.length > 0) {
                                // Re-run all dashboard calculations to ensure they're visible
                                this.updateValuationMultiples(this.currentComparablesData);
                                const sector = document.getElementById('comparableSectorSelect')?.value || 'space';
                                this.updateSectorSummary(this.currentComparablesData, sector);
                                this.calculateImpliedValuations(this.currentComparablesData);
                            } else {
                                // Load comparables if not loaded yet
                                this.loadComparables();
                            }
                        }
                    }
                    
                    // Refresh icons
                    if (window.lucide) window.lucide.createIcons();
                });
            });
            
            // Load comparables on view switch
            const observer = new MutationObserver((mutations) => {
                mutations.forEach((mutation) => {
                    if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
                        if (ratiosView.classList.contains('active')) {
                            // Check which tab is active
                            const activeTab = ratiosView.querySelector('.insights-tab.active')?.dataset.tab || 'dashboard';
                            if (activeTab === 'comparables' || activeTab === 'analysis') {
                                this.loadComparables();
                            }
                        }
                    }
                });
            });
            observer.observe(ratiosView, { attributes: true });
        }
        
        // Initial load - ensure it runs after DOM is ready
        setTimeout(() => {
            this.loadComparables().catch(err => {
                console.error('Error loading comparables in setupRatiosListeners:', err);
            });
        }, 300);
    }
    
    updateSectorSummary(companies, sector) {
        if (!companies || companies.length === 0) {
            console.warn('updateSectorSummary: No companies data provided');
            return;
        }
        
        const dashboardContent = document.getElementById('ratiosTab-dashboard');
        if (!dashboardContent) {
            console.warn('updateSectorSummary: ratiosTab-dashboard not found');
            return;
        }
        
        const summaryEl = dashboardContent.querySelector('#ratiosSectorSummary') || document.getElementById('ratiosSectorSummary');
        if (!summaryEl) {
            console.warn('updateSectorSummary: ratiosSectorSummary not found');
            return;
        }
        
        const count = companies.length;
        const validEvRevenue = companies.filter(c => c.evRevenue).map(c => c.evRevenue);
        const validEvEbitda = companies.filter(c => c.evEbitda).map(c => c.evEbitda);
        const validPeRatio = companies.filter(c => c.peRatio).map(c => c.peRatio);
        const avgGrowth = companies.filter(c => c.revenueGrowth).map(c => c.revenueGrowth);
        
        const avgEvRevenue = validEvRevenue.length > 0 
            ? (validEvRevenue.reduce((a, b) => a + b, 0) / validEvRevenue.length).toFixed(2)
            : 'N/A';
        const avgEvEbitda = validEvEbitda.length > 0
            ? (validEvEbitda.reduce((a, b) => a + b, 0) / validEvEbitda.length).toFixed(2)
            : 'N/A';
        const avgPeRatio = validPeRatio.length > 0
            ? (validPeRatio.reduce((a, b) => a + b, 0) / validPeRatio.length).toFixed(2)
            : 'N/A';
        const avgGrowthRate = avgGrowth.length > 0
            ? (avgGrowth.reduce((a, b) => a + b, 0) / avgGrowth.length * 100).toFixed(1)
            : 'N/A';
        
        const sectorNames = {
            space: 'Space Companies',
            tech: 'Tech Companies',
            telecom: 'Telecom',
            aerospace: 'Aerospace & Defense'
        };
        
        summaryEl.innerHTML = `
            <h4 style="margin: 0 0 var(--spacing-md) 0;">${sectorNames[sector] || sector}</h4>
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: var(--spacing-md);">
                <div>
                    <div style="font-size: 12px; color: var(--text-secondary); margin-bottom: 4px;">Companies</div>
                    <div style="font-size: 20px; font-weight: 600;">${count}</div>
                </div>
                <div>
                    <div style="font-size: 12px; color: var(--text-secondary); margin-bottom: 4px;">Avg EV/Revenue</div>
                    <div style="font-size: 20px; font-weight: 600;">${avgEvRevenue}${avgEvRevenue !== 'N/A' ? 'x' : ''}</div>
                </div>
                <div>
                    <div style="font-size: 12px; color: var(--text-secondary); margin-bottom: 4px;">Avg EV/EBITDA</div>
                    <div style="font-size: 20px; font-weight: 600;">${avgEvEbitda}${avgEvEbitda !== 'N/A' ? 'x' : ''}</div>
                </div>
                <div>
                    <div style="font-size: 12px; color: var(--text-secondary); margin-bottom: 4px;">Avg P/E Ratio</div>
                    <div style="font-size: 20px; font-weight: 600;">${avgPeRatio}${avgPeRatio !== 'N/A' ? 'x' : ''}</div>
                </div>
                <div>
                    <div style="font-size: 12px; color: var(--text-secondary); margin-bottom: 4px;">Avg Growth</div>
                    <div style="font-size: 20px; font-weight: 600;">${avgGrowthRate}${avgGrowthRate !== 'N/A' ? '%' : ''}</div>
                </div>
            </div>
        `;
    }
    
    updateRatiosCharts(companies) {
        if (!companies || companies.length === 0) return;
        
        // EV/Revenue Chart
        const evRevenueCtx = document.getElementById('evRevenueChart');
        if (evRevenueCtx) {
            const evRevenueData = companies
                .filter(c => c.evRevenue)
                .sort((a, b) => b.evRevenue - a.evRevenue)
                .slice(0, 10); // Top 10
            
            if (this.charts.evRevenue) {
                this.charts.evRevenue.destroy();
            }
            
            // Color SpaceX differently to highlight it
            const colors = evRevenueData.map(c => c.name === 'SpaceX' ? 'rgba(255, 193, 7, 0.8)' : 'rgba(0, 102, 204, 0.6)');
            
            this.charts.evRevenue = new Chart(evRevenueCtx, {
                type: 'bar',
                data: {
                    labels: evRevenueData.map(c => c.name),
                    datasets: [{
                        label: 'EV/Revenue',
                        data: evRevenueData.map(c => c.evRevenue),
                        backgroundColor: colors,
                        borderColor: evRevenueData.map(c => c.name === 'SpaceX' ? 'rgba(255, 193, 7, 1)' : 'rgba(0, 102, 204, 1)'),
                        borderWidth: evRevenueData.map(c => c.name === 'SpaceX' ? 2 : 1)
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { display: false },
                        tooltip: {
                            callbacks: {
                                footer: (items) => {
                                    const item = items[0];
                                    if (item.label === 'SpaceX') {
                                        return 'Estimated/Projected data';
                                    }
                                    return '';
                                }
                            }
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            title: { display: true, text: 'EV/Revenue Multiple' }
                        }
                    }
                }
            });
        }
        
        // EV/EBITDA Chart
        let evEbitdaCtx = document.getElementById('evEbitdaChart');
        const evEbitdaContainer = document.querySelector('#ratiosTab-analysis .chart-container-half:nth-child(2)');
        
        // Restore canvas if it was replaced by "no data" message
        if (!evEbitdaCtx && evEbitdaContainer) {
            evEbitdaContainer.innerHTML = `
                <h4>EV/EBITDA Comparison</h4>
                <canvas id="evEbitdaChart"></canvas>
            `;
            evEbitdaCtx = document.getElementById('evEbitdaChart');
        }
        
        if (evEbitdaCtx) {
            const evEbitdaData = companies
                .filter(c => c.evEbitda !== null && c.evEbitda !== undefined)
                .sort((a, b) => b.evEbitda - a.evEbitda)
                .slice(0, 10);
            
            if (this.charts.evEbitda) {
                this.charts.evEbitda.destroy();
            }
            
            if (evEbitdaData.length > 0) {
                // Color SpaceX differently to highlight it
                const colors = evEbitdaData.map(c => c.name === 'SpaceX' ? 'rgba(255, 193, 7, 0.8)' : 'rgba(34, 197, 94, 0.6)');
                
                this.charts.evEbitda = new Chart(evEbitdaCtx, {
                    type: 'bar',
                    data: {
                        labels: evEbitdaData.map(c => c.name),
                        datasets: [{
                            label: 'EV/EBITDA',
                            data: evEbitdaData.map(c => c.evEbitda),
                            backgroundColor: colors,
                            borderColor: evEbitdaData.map(c => c.name === 'SpaceX' ? 'rgba(255, 193, 7, 1)' : 'rgba(34, 197, 94, 1)'),
                            borderWidth: evEbitdaData.map(c => c.name === 'SpaceX' ? 2 : 1)
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            legend: { display: false },
                            tooltip: {
                                callbacks: {
                                    footer: (items) => {
                                        const item = items[0];
                                        if (item.label === 'SpaceX') {
                                            return 'Estimated/Projected data';
                                        }
                                        return '';
                                    }
                                }
                            }
                        },
                        scales: {
                            y: {
                                beginAtZero: true,
                                title: { display: true, text: 'EV/EBITDA Multiple' }
                            }
                        }
                    }
                });
            } else {
                // Show message when no EV/EBITDA data available
                if (evEbitdaContainer) {
                    evEbitdaContainer.innerHTML = `
                        <h4>EV/EBITDA Comparison</h4>
                        <div style="display: flex; align-items: center; justify-content: center; height: 300px; color: var(--text-secondary);">
                            <div style="text-align: center;">
                                <i data-lucide="info" style="width: 48px; height: 48px; margin-bottom: var(--spacing-md);"></i>
                                <p style="margin: 0;">No EV/EBITDA data available for this sector.<br>Many companies may not be profitable yet.</p>
                            </div>
                        </div>
                    `;
                    if (window.lucide) window.lucide.createIcons();
                }
            }
        }
        
        // Growth vs Valuation Chart
        const growthValuationCtx = document.getElementById('growthValuationChart');
        if (growthValuationCtx) {
            const scatterData = companies
                .filter(c => c.revenueGrowth && c.evRevenue)
                .map(c => ({
                    x: c.revenueGrowth * 100,
                    y: c.evRevenue,
                    label: c.name
                }));
            
            if (this.charts.growthValuation) {
                this.charts.growthValuation.destroy();
            }
            
            // Color SpaceX point differently
            const pointColors = scatterData.map(p => p.label === 'SpaceX' ? 'rgba(255, 193, 7, 0.8)' : 'rgba(0, 102, 204, 0.6)');
            const pointBorders = scatterData.map(p => p.label === 'SpaceX' ? 'rgba(255, 193, 7, 1)' : 'rgba(0, 102, 204, 1)');
            
            this.charts.growthValuation = new Chart(growthValuationCtx, {
                type: 'scatter',
                data: {
                    datasets: [{
                        label: 'Companies',
                        data: scatterData,
                        backgroundColor: pointColors,
                        borderColor: pointBorders,
                        pointRadius: scatterData.map(p => p.label === 'SpaceX' ? 8 : 6),
                        pointHoverRadius: scatterData.map(p => p.label === 'SpaceX' ? 10 : 8),
                        borderWidth: scatterData.map(p => p.label === 'SpaceX' ? 2 : 1)
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { display: false },
                        tooltip: {
                            callbacks: {
                                label: (context) => {
                                    const point = scatterData[context.dataIndex];
                                    return `${point.label}: ${point.y.toFixed(2)}x EV/Revenue, ${point.x.toFixed(1)}% Growth`;
                                }
                            }
                        }
                    },
                    scales: {
                        x: {
                            title: { 
                                display: true, 
                                text: 'Revenue Growth (%)',
                                font: { size: 14, weight: 'bold' }
                            },
                            beginAtZero: true,
                            ticks: {
                                callback: function(value) {
                                    return value + '%';
                                }
                            }
                        },
                        y: {
                            title: { 
                                display: true, 
                                text: 'EV/Revenue Multiple',
                                font: { size: 14, weight: 'bold' }
                            },
                            beginAtZero: true,
                            ticks: {
                                callback: function(value) {
                                    return value + 'x';
                                }
                            }
                        }
                    }
                }
            });
        }
    }
    
    updateComparablesTimestamp(fetchedAt, isCached) {
        const timestampEl = document.getElementById('comparablesTimestamp');
        if (!timestampEl) return;
        
        if (fetchedAt) {
            const dateStr = fetchedAt.toLocaleString();
            const source = isCached ? 'Cached' : 'API';
            timestampEl.innerHTML = `
                <i data-lucide="${isCached ? 'database' : 'cloud'}"></i>
                <span>${source}: ${dateStr}</span>
            `;
            if (window.lucide) window.lucide.createIcons();
        } else {
            timestampEl.innerHTML = `
                <i data-lucide="clock"></i>
                <span>No data loaded</span>
            `;
            if (window.lucide) window.lucide.createIcons();
        }
    }
    
    async loadComparables(forceRefresh = false) {
        const action = forceRefresh ? '🔄 Refreshing' : '📊 Loading';
        console.log(`${action} comparable companies... (forceRefresh=${forceRefresh})`);
        const sector = document.getElementById('comparableSectorSelect')?.value || 'space';
        const tbody = document.getElementById('comparablesTableBody');
        
        // Update timestamp to show refreshing
        if (forceRefresh) {
            const timestampEl = document.getElementById('comparablesTimestamp');
            if (timestampEl) {
                timestampEl.innerHTML = `
                    <i data-lucide="loader" class="spinning"></i>
                    <span>Refreshing from API...</span>
                `;
                if (window.lucide) window.lucide.createIcons();
            }
        }
        
        // Show loading state only if table body exists (ratios view might not be visible)
        if (tbody) {
            const loadingText = forceRefresh ? 'Refreshing from API...' : 'Loading comparable companies...';
            tbody.innerHTML = `
                <tr>
                    <td colspan="8" style="text-align: center; padding: var(--spacing-lg); color: var(--text-secondary);">
                        <i data-lucide="loader" class="spinning"></i> ${loadingText}
                    </td>
                </tr>
            `;
            if (window.lucide) window.lucide.createIcons();
        }
        
        try {
            // Reload API keys from localStorage in case they were updated
            this.alphaVantageApiKey = localStorage.getItem('alphaVantageApiKey') || '';
            this.financialModelingPrepApiKey = localStorage.getItem('financialModelingPrepApiKey') || '';
            this.financialApiProvider = localStorage.getItem('financialApiProvider') || 'yahoo-finance';
            
            // Include API provider and keys in request
            // Add forceRefresh=true only when refresh button is clicked
            const params = new URLSearchParams({
                sector: sector,
                apiProvider: this.financialApiProvider || 'yahoo-finance',
                alphaVantageKey: this.alphaVantageApiKey || '',
                fmpKey: this.financialModelingPrepApiKey || '',
                forceRefresh: forceRefresh ? 'true' : 'false'
            });
            
            const apiUrl = `/api/comparables?${params.toString()}`;
            console.log('📡 Fetching comparables from API:', apiUrl);
            console.log('   forceRefresh:', forceRefresh);
            console.log('   sector:', sector);
            console.log('   apiProvider:', this.financialApiProvider);
            console.log('   hasAlphaVantageKey:', !!this.alphaVantageApiKey);
            console.log('   alphaVantageKey (first 8 chars):', this.alphaVantageApiKey ? this.alphaVantageApiKey.substring(0, 8) + '...' : 'NOT SET');
            
            const response = await fetch(apiUrl);
            
            if (!response.ok) {
                const errorText = await response.text();
                let errorData;
                try {
                    errorData = JSON.parse(errorText);
                } catch (e) {
                    errorData = { error: errorText };
                }
                
                // Log error with helpful context
                if (response.status === 400 && errorData.needsConfiguration) {
                    console.warn('⚠️ API configuration needed:', errorData.message);
                } else {
                    console.error('❌ API error:', response.status, errorData);
                }
                
                // Return error result - backend has already checked cache
                return {
                    success: false,
                    error: errorData.error || errorData.message || `HTTP error! status: ${response.status}`,
                    message: errorData.message,
                    helpUrl: errorData.helpUrl,
                    needsConfiguration: errorData.needsConfiguration || false,
                    data: [],
                    cached: false
                };
            }
            
            const result = await response.json();
            console.log('✅ Comparables API response:', result);
            console.log('   success:', result.success);
            console.log('   cached:', result.cached);
            console.log('   fetchedAt:', result.fetchedAt);
            
            if (!result.success) {
                // Backend already checked for cached data - if success=false, there's no data available
                if (result.needsConfiguration) {
                    console.warn('⚠️ API configuration needed:', result.message);
                } else {
                    console.warn('⚠️ No comparables data available:', result.error);
                }
                
                this.currentComparablesData = null;
                this.updateComparablesTimestamp(null, false);
                
                // Show user-friendly error message
                if (tbody) {
                    const errorMsg = result.message || result.error || 'No comparables data available';
                    const hasNoApiKey = result.needsConfiguration || (!this.alphaVantageApiKey && !this.financialModelingPrepApiKey);
                    
                    // Quick setup instructions if no API key
                    const quickSetup = hasNoApiKey ? `
                        <div style="background: #f0f9ff; border: 1px solid #0066cc; border-radius: 8px; padding: 15px; margin-top: 15px; text-align: left;">
                            <strong style="color: #0066cc;">⚡ Quick Setup (Browser Console):</strong>
                            <div style="margin-top: 10px; font-family: monospace; font-size: 11px; background: #fff; padding: 10px; border-radius: 4px; overflow-x: auto;">
                                localStorage.setItem('alphaVantageApiKey', 'M2JTUA325Y4E94IY');<br>
                                localStorage.setItem('financialApiProvider', 'alpha-vantage');<br>
                                location.reload();
                            </div>
                            <div style="margin-top: 10px; font-size: 12px; color: #666;">
                                Copy the code above, press F12 → Console, paste and press Enter
                            </div>
                        </div>
                    ` : '';
                    
                    const apiKeyMessage = hasNoApiKey 
                        ? `<div style="font-size: 12px; color: #999; margin-top: 15px;">
                            <strong>Or configure via Settings:</strong><br>
                            • Get a <strong>free Alpha Vantage API key</strong> (25 requests/day): <a href="https://www.alphavantage.co/support/#api-key" target="_blank" style="color: #0066cc;">https://www.alphavantage.co/support/#api-key</a><br>
                            • Or get a <strong>premium Alpha Vantage key</strong>: <a href="https://www.alphavantage.co/premium/" target="_blank" style="color: #0066cc;">https://www.alphavantage.co/premium/</a><br>
                            • Then enter your API key in <strong>Settings → Financial API Settings</strong>
                        </div>`
                        : `<div style="font-size: 12px; color: #999; margin-top: 15px;">
                            API keys are configured. The error may be due to:<br>
                            • API rate limits exceeded<br>
                            • Invalid API key<br>
                            • Network issues<br>
                            Check Settings to verify your API keys are correct.
                        </div>`;
                    
                    tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: #888; padding: 30px;">
                        <div style="margin-bottom: 10px; font-size: 16px; color: #f59e0b;">⚠️ No Comparables Data Available</div>
                        <div style="font-size: 13px; color: #666; margin-bottom: 15px;">${errorMsg}</div>
                        ${quickSetup}
                        ${apiKeyMessage}
                    </td></tr>`;
                }
                
                // Don't throw error - just return gracefully
                return;
            }
            
            if (result.data && result.data.length > 0) {
                const isCached = result.cached === true;
                const fetchedAt = result.fetchedAt ? new Date(result.fetchedAt) : null;
                const dataSource = isCached ? 'cached' : 'API';
                
                console.log(`✅ Loaded ${result.data.length} comparable companies (${dataSource})`);
                if (fetchedAt) {
                    console.log(`   Fetched at: ${fetchedAt.toLocaleString()}`);
                }
                
                // Store current comparables data for charts
                this.currentComparablesData = result.data;
                
                // Update timestamp display
                this.updateComparablesTimestamp(fetchedAt, isCached);
                
                // Update table if comparables tab is visible
                if (tbody) {
                    tbody.innerHTML = result.data.map(company => {
                        // Ensure we have valid data
                        if (!company || !company.name) {
                            console.warn('⚠️ Invalid company data:', company);
                            return '';
                        }
                        
                        return `
                        <tr>
                            <td><strong>${company.name}</strong></td>
                            <td>${company.ticker || '--'}</td>
                            <td>${company.marketCap ? this.formatCurrency(company.marketCap) : '--'}</td>
                            <td>${company.evRevenue ? company.evRevenue.toFixed(2) + 'x' : '--'}</td>
                            <td>${company.evEbitda ? company.evEbitda.toFixed(2) + 'x' : '--'}</td>
                            <td>${company.peRatio ? company.peRatio.toFixed(2) + 'x' : '--'}</td>
                            <td>${company.pegRatio ? company.pegRatio.toFixed(2) : '--'}</td>
                            <td>${company.revenueGrowth ? (company.revenueGrowth * 100).toFixed(1) + '%' : '--'}</td>
                        </tr>
                    `;
                    }).filter(row => row !== '').join('');
                    
                    console.log(`✅ Updated comparables table with ${result.data.length} companies`);
                }
                
                // Always update dashboard sections, even if ratios view is not currently visible
                // This ensures data is ready when user navigates to ratios view
                this.updateValuationMultiples(result.data);
                this.updateSectorSummary(result.data, sector);
                
                // Calculate and display implied valuations - always update when comparables load
                // This will update SpaceX current valuation, revenue, EBITDA if currentData exists
                this.calculateImpliedValuations(result.data);
                
                // Update charts and ensure dashboard is visible if ratios view is active
                const ratiosView = document.getElementById('ratios');
                if (ratiosView && ratiosView.classList.contains('active')) {
                    const activeTab = ratiosView.querySelector('.insights-tab.active')?.dataset.tab || 'dashboard';
                    
                    // Update charts if on analysis tab
                    if (activeTab === 'analysis') {
                        this.updateRatiosCharts(result.data);
                    }
                    
                    // Ensure dashboard tab is visible and calculations run
                    // This fixes the issue where calculations don't show until comparables tab is viewed
                    if (!activeTab || activeTab === 'dashboard') {
                        // Make sure dashboard tab and content are visible
                        const dashboardTab = ratiosView.querySelector('.insights-tab[data-tab="dashboard"]');
                        const dashboardContent = document.getElementById('ratiosTab-dashboard');
                        if (dashboardTab && !dashboardTab.classList.contains('active')) {
                            ratiosView.querySelectorAll('.insights-tab').forEach(t => t.classList.remove('active'));
                            ratiosView.querySelectorAll('.insights-tab-content').forEach(c => {
                                c.classList.remove('active');
                                c.style.display = 'none';
                            });
                            dashboardTab.classList.add('active');
                            if (dashboardContent) {
                                dashboardContent.classList.add('active');
                                dashboardContent.style.display = 'block';
                            }
                        }
                        
                        // Force a re-render of dashboard elements to ensure they're visible
                        setTimeout(() => {
                            console.log('🔄 Re-running dashboard calculations after comparables load');
                            this.updateValuationMultiples(result.data);
                            this.updateSectorSummary(result.data, sector);
                            this.calculateImpliedValuations(result.data);
                        }, 150);
                    }
                }
            } else {
                console.warn('⚠️ No comparable companies data in response:', result);
                if (tbody) {
                    const errorMsg = result.error || `No data available for ${sector} sector`;
                    const errors = result.errors ? `<br><small style="color: var(--text-secondary);">${result.errors.join('; ')}</small>` : '';
                    tbody.innerHTML = `
                        <tr>
                            <td colspan="8" style="text-align: center; padding: var(--spacing-lg); color: var(--error-color);">
                                ${errorMsg}${errors}
                                <br><br>
                                <button class="btn btn-secondary" onclick="app.loadComparables(true)" style="margin-top: var(--spacing-sm);">
                                    <i data-lucide="refresh-cw"></i> Refresh from API
                                </button>
                            </td>
                        </tr>
                    `;
                    if (window.lucide) window.lucide.createIcons();
                }
                // Clear stale data
                this.currentComparablesData = [];
                return; // Don't update dashboard with empty data
            }
        } catch (error) {
            console.error('❌ Error loading comparables:', error);
            if (tbody) {
                tbody.innerHTML = `
                    <tr>
                        <td colspan="8" style="text-align: center; padding: var(--spacing-lg); color: var(--error-color);">
                            Error loading comparable companies: ${error.message}<br>
                            <button class="btn btn-secondary" onclick="app.loadComparables()" style="margin-top: var(--spacing-sm);">
                                <i data-lucide="refresh-cw"></i> Retry
                            </button>
                        </td>
                    </tr>
                `;
                if (window.lucide) window.lucide.createIcons();
            }
            // Don't throw - allow initialization to continue
            this.currentComparablesData = [];
        }
        
        if (window.lucide) window.lucide.createIcons();
        console.log('✅ loadComparables completed. Data stored:', !!this.currentComparablesData, 'Count:', this.currentComparablesData?.length || 0);
    }
    
    formatCurrency(value) {
        if (!value && value !== 0) return '--';
        if (value >= 1e12) return `$${(value / 1e12).toFixed(2)}T`;
        if (value >= 1e9) return `$${(value / 1e9).toFixed(2)}B`;
        if (value >= 1e6) return `$${(value / 1e6).toFixed(2)}M`;
        if (value >= 1e3) return `$${(value / 1e3).toFixed(2)}K`;
        return `$${value.toFixed(2)}`;
    }
    
    calculateImpliedValuations(companies) {
        if (!companies || companies.length === 0) {
            console.warn('calculateImpliedValuations: No companies data provided');
            return;
        }
        
        // Check if dashboard elements exist
        const dashboardContent = document.getElementById('ratiosTab-dashboard');
        if (!dashboardContent) {
            console.warn('calculateImpliedValuations: ratiosTab-dashboard not found');
            return;
        }
        
        // Get SpaceX's current revenue and EBITDA from model
        // Estimate revenue from current model data
        let spacexRevenue = 0;
        let spacexEbitda = 0;
        let currentValuation = 0;
        
        // Get current model valuation (already in billions from Monte Carlo or calculation)
        if (this.currentData && this.currentData.total) {
            // Monte Carlo stores values in billions already
            currentValuation = this.currentData.total.value || 0;
            // If it's very small (< 1), it might be in trillions, convert
            if (currentValuation > 0 && currentValuation < 1) {
                currentValuation = currentValuation * 1000; // Convert trillions to billions
            }
        }
        
        // Try to get revenue from Earth data
        if (this.currentData && this.currentData.earth) {
            const earthData = this.currentData.earth;
            
            // Check if revenue is an array (from detailed calculation)
            if (earthData.revenue && Array.isArray(earthData.revenue) && earthData.revenue.length > 0) {
                const latestRevenue = earthData.revenue[earthData.revenue.length - 1];
                if (latestRevenue && latestRevenue.total) {
                    spacexRevenue = latestRevenue.total / 1e9; // Convert to billions
                    console.log('✅ Got revenue from currentData.earth.revenue:', spacexRevenue, 'B');
                }
            }
            
            // If no revenue array, try to calculate from inputs
            if (spacexRevenue === 0) {
                try {
                    const inputs = this.getInputs();
                    if (inputs && inputs.earth) {
                        // Try to estimate revenue from Starlink penetration and capacity
                        // This is a rough estimate based on typical Starlink revenue model
                        const starlinkPenetration = inputs.earth.starlinkPenetration || 0.15;
                        const launchVolume = inputs.earth.launchVolume || 100;
                        
                        // Rough estimate: Starlink revenue ~$10B/year at 15% penetration
                        // Scale by penetration ratio
                        const baseStarlinkRevenue = 10; // $10B base
                        const penetrationMultiplier = starlinkPenetration / 0.15;
                        
                        // Launch revenue estimate: ~$100M per launch * volume
                        const launchRevenue = (launchVolume * 0.1); // $100M per launch in billions
                        
                        // Total revenue estimate
                        spacexRevenue = (baseStarlinkRevenue * penetrationMultiplier) + launchRevenue;
                        console.log('✅ Estimated revenue from inputs:', spacexRevenue, 'B');
                    }
                } catch (err) {
                    console.warn('⚠️ Could not get revenue from inputs:', err);
                }
            }
            
            // If still no revenue, estimate from valuation
            if (spacexRevenue === 0 && currentValuation > 0) {
                // Estimate revenue from valuation using a reasonable multiple
                // For SpaceX, EV/Revenue might be around 10-15x
                spacexRevenue = currentValuation / 12; // Use 12x as estimate
                console.log('⚠️ Estimated revenue from valuation (fallback):', spacexRevenue, 'B');
            }
            
            // Estimate EBITDA (simplified: assume 20% margin)
            spacexEbitda = spacexRevenue * 0.20;
        } else {
            // No currentData - try to get from inputs or estimate from valuation
            console.warn('⚠️ currentData not available, trying to estimate from inputs');
            
            if (currentValuation > 0) {
                // Fallback: estimate revenue from valuation if no Earth data
                spacexRevenue = currentValuation / 12; // Use 12x EV/Revenue as estimate
                spacexEbitda = spacexRevenue * 0.20;
                console.log('⚠️ Estimated revenue from valuation (no currentData):', spacexRevenue, 'B');
            } else {
                // Try to get from inputs as last resort
                try {
                    const inputs = this.getInputs();
                    if (inputs && inputs.earth) {
                        const starlinkPenetration = inputs.earth.starlinkPenetration || 0.15;
                        const launchVolume = inputs.earth.launchVolume || 100;
                        const baseStarlinkRevenue = 10;
                        const penetrationMultiplier = starlinkPenetration / 0.15;
                        const launchRevenue = (launchVolume * 0.1);
                        spacexRevenue = (baseStarlinkRevenue * penetrationMultiplier) + launchRevenue;
                        spacexEbitda = spacexRevenue * 0.20;
                        console.log('✅ Estimated revenue from inputs (no currentData):', spacexRevenue, 'B');
                    }
                } catch (err) {
                    console.warn('⚠️ Could not estimate revenue:', err);
                }
            }
        }
        
        // CRITICAL: Ratios REQUIRE reference data - do not use estimates!
        // If we don't have revenue from actual calculations, show error instead of estimating
        if (spacexRevenue === 0) {
            console.error('❌ CRITICAL: Cannot calculate ratios without reference data revenue!');
            console.error('   currentData:', this.currentData);
            console.error('   Please ensure model is calculated before viewing ratios');
            
            // Show error message instead of using estimates
            const container = dashboardContent.querySelector('#impliedValuationsContainer') || document.getElementById('impliedValuationsContainer');
            if (container) {
                container.innerHTML = `
                    <div style="padding: var(--spacing-lg); text-align: center;">
                        <p style="color: var(--error-color); margin-bottom: var(--spacing-md); font-weight: 600;">
                            ⚠️ Reference Data Required
                        </p>
                        <p style="color: var(--text-secondary); margin-bottom: var(--spacing-md);">
                            Ratios calculation requires actual model revenue data.
                        </p>
                        <p style="font-size: 12px; color: var(--text-secondary);">
                            Please calculate the model first, then return to ratios view.
                        </p>
                    </div>
                `;
            }
            return; // Don't proceed with calculations without real data
        }
        
        // Log final values for debugging
        console.log('📊 Ratios calculation values:', {
            currentValuation: currentValuation,
            spacexRevenue: spacexRevenue,
            spacexEbitda: spacexEbitda,
            hasCurrentData: !!this.currentData,
            hasEarthData: !!(this.currentData && this.currentData.earth),
            hasRevenueArray: !!(this.currentData && this.currentData.earth && Array.isArray(this.currentData.earth.revenue))
        });
        
        // Update current valuation display
        const valuationEl = dashboardContent.querySelector('#spacexCurrentValuation') || document.getElementById('spacexCurrentValuation');
        const revenueEl = dashboardContent.querySelector('#spacexRevenue') || document.getElementById('spacexRevenue');
        const ebitdaEl = dashboardContent.querySelector('#spacexEbitda') || document.getElementById('spacexEbitda');
        
        if (valuationEl) {
            // Use calculated valuation from model (NEVER read from spreadsheet)
            // Spreadsheet is only used as test reference point
            // If baseline model is loaded, use its Monte Carlo base value
            let displayValuation = currentValuation;
            
            // Check if current model is baseline and has Monte Carlo results
            if (this.currentData && this.currentData.monteCarlo && this.currentData.monteCarlo.base) {
                displayValuation = this.currentData.monteCarlo.base;
                console.log('✅ Using baseline model Monte Carlo base value:', displayValuation);
            } else if (this.currentData && this.currentData.results && this.currentData.results.monteCarlo && this.currentData.results.monteCarlo.base) {
                displayValuation = this.currentData.results.monteCarlo.base;
                console.log('✅ Using model Monte Carlo base value:', displayValuation);
            }
            
            if (displayValuation > 0) {
                valuationEl.textContent = this.formatCurrency(displayValuation * 1e9);
                valuationEl.style.color = '';
                console.log('✅ Updated SpaceX Current Valuation:', valuationEl.textContent);
            } else {
                valuationEl.textContent = '--';
                console.warn('⚠️ No valuation data available - load a model to see valuation');
            }
        } else {
            console.warn('⚠️ valuationEl (spacexCurrentValuation) not found');
        }
        if (revenueEl) {
            // spacexRevenue is already in billions
            revenueEl.textContent = spacexRevenue > 0 ? this.formatCurrency(spacexRevenue * 1e9) : '--';
            revenueEl.style.color = '';
            console.log('✅ Updated SpaceX Revenue:', revenueEl.textContent);
        } else {
            console.warn('⚠️ revenueEl (spacexRevenue) not found');
        }
        if (ebitdaEl) {
            // spacexEbitda is already in billions
            ebitdaEl.textContent = spacexEbitda > 0 ? this.formatCurrency(spacexEbitda * 1e9) : '--';
            ebitdaEl.style.color = '';
            console.log('✅ Updated SpaceX EBITDA:', ebitdaEl.textContent);
        } else {
            console.warn('⚠️ ebitdaEl (spacexEbitda) not found');
        }
        
        // Calculate implied valuations using each comparable's multiples
        const impliedValuations = [];
        
        console.log('🔍 Calculating implied valuations:', {
            companiesCount: companies.length,
            spacexRevenue: spacexRevenue,
            spacexEbitda: spacexEbitda,
            companiesWithEvRevenue: companies.filter(c => c.evRevenue && c.name !== 'SpaceX').length,
            companiesWithEvEbitda: companies.filter(c => c.evEbitda && c.name !== 'SpaceX').length
        });
        
        companies.forEach(company => {
            if (company.name === 'SpaceX') return; // Skip SpaceX itself
            
            const valuations = {};
            
            // EV/Revenue multiple
            if (company.evRevenue && spacexRevenue > 0) {
                const impliedEV = spacexRevenue * company.evRevenue; // In billions
                valuations.evRevenue = {
                    multiple: company.evRevenue,
                    impliedValue: impliedEV,
                    company: company.name
                };
                console.log(`✅ ${company.name}: EV/Revenue ${company.evRevenue}x → Implied ${impliedEV.toFixed(2)}B`);
            } else {
                if (company.evRevenue) {
                    console.log(`⚠️ ${company.name}: Has EV/Revenue ${company.evRevenue}x but SpaceX revenue is ${spacexRevenue}`);
                }
            }
            
            // EV/EBITDA multiple
            if (company.evEbitda && spacexEbitda > 0) {
                const impliedEV = spacexEbitda * company.evEbitda; // In billions
                valuations.evEbitda = {
                    multiple: company.evEbitda,
                    impliedValue: impliedEV,
                    company: company.name
                };
                console.log(`✅ ${company.name}: EV/EBITDA ${company.evEbitda}x → Implied ${impliedEV.toFixed(2)}B`);
            }
            
            if (Object.keys(valuations).length > 0) {
                impliedValuations.push({
                    company: company.name,
                    ticker: company.ticker,
                    valuations: valuations
                });
            }
        });
        
        console.log(`📊 Total implied valuations calculated: ${impliedValuations.length}`);
        
        // Display implied valuations
        const container = dashboardContent.querySelector('#impliedValuationsContainer') || document.getElementById('impliedValuationsContainer');
        if (!container) {
            console.warn('calculateImpliedValuations: impliedValuationsContainer not found');
            return;
        }
        
        // Always show something, even if we don't have perfect data
        if (impliedValuations.length === 0) {
            container.innerHTML = `
                <div style="padding: var(--spacing-lg); text-align: center;">
                    <p style="color: var(--text-secondary); margin-bottom: var(--spacing-md);">
                        No comparable multiples available for implied valuation calculation.
                    </p>
                    <p style="font-size: 12px; color: var(--text-secondary);">
                        ${spacexRevenue > 0 
                            ? `Using estimated revenue: ${this.formatCurrency(spacexRevenue * 1e9)}` 
                            : 'Please load a model or ensure inputs are set to calculate implied valuations.'}
                    </p>
                </div>
            `;
            return;
        }
        
        // If revenue is 0, we shouldn't get here (should have been caught above), but just in case
        if (spacexRevenue === 0) {
            console.warn('⚠️ Revenue is 0 but implied valuations exist - this should not happen');
        }
        
        // Calculate averages
        const evRevenueVals = impliedValuations
            .filter(iv => iv.valuations.evRevenue)
            .map(iv => iv.valuations.evRevenue.impliedValue);
        const evEbitdaVals = impliedValuations
            .filter(iv => iv.valuations.evEbitda)
            .map(iv => iv.valuations.evEbitda.impliedValue);
        
        const avgEvRevenue = evRevenueVals.length > 0 
            ? evRevenueVals.reduce((a, b) => a + b, 0) / evRevenueVals.length 
            : null;
        const avgEvEbitda = evEbitdaVals.length > 0
            ? evEbitdaVals.reduce((a, b) => a + b, 0) / evEbitdaVals.length
            : null;
        
        const minEvRevenue = evRevenueVals.length > 0 ? Math.min(...evRevenueVals) : null;
        const maxEvRevenue = evRevenueVals.length > 0 ? Math.max(...evRevenueVals) : null;
        const minEvEbitda = evEbitdaVals.length > 0 ? Math.min(...evEbitdaVals) : null;
        const maxEvEbitda = evEbitdaVals.length > 0 ? Math.max(...evEbitdaVals) : null;
        
        container.innerHTML = `
            <div style="display: grid; gap: var(--spacing-md);">
                <!-- Summary Cards -->
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: var(--spacing-md); margin-bottom: var(--spacing-lg);">
                    ${avgEvRevenue ? `
                        <div style="padding: var(--spacing-md); background: var(--surface); border-radius: var(--radius); border: 1px solid var(--border-color);">
                            <div style="font-size: 12px; color: var(--text-secondary); margin-bottom: 4px;">Avg Implied (EV/Rev)</div>
                            <div style="font-size: 24px; font-weight: 600;">${this.formatCurrency(avgEvRevenue * 1e9)}</div>
                            <div style="font-size: 11px; color: var(--text-secondary); margin-top: 4px;">
                                Range: ${this.formatCurrency(minEvRevenue * 1e9)} - ${this.formatCurrency(maxEvRevenue * 1e9)}
                            </div>
                        </div>
                    ` : ''}
                    ${avgEvEbitda ? `
                        <div style="padding: var(--spacing-md); background: var(--surface); border-radius: var(--radius); border: 1px solid var(--border-color);">
                            <div style="font-size: 12px; color: var(--text-secondary); margin-bottom: 4px;">Avg Implied (EV/EBITDA)</div>
                            <div style="font-size: 24px; font-weight: 600;">${this.formatCurrency(avgEvEbitda * 1e9)}</div>
                            <div style="font-size: 11px; color: var(--text-secondary); margin-top: 4px;">
                                Range: ${this.formatCurrency(minEvEbitda * 1e9)} - ${this.formatCurrency(maxEvEbitda * 1e9)}
                            </div>
                        </div>
                    ` : ''}
                    ${currentValuation > 0 ? `
                        <div style="padding: var(--spacing-md); background: rgba(0, 102, 204, 0.1); border-radius: var(--radius); border: 2px solid var(--primary-color);">
                            <div style="font-size: 12px; color: var(--text-secondary); margin-bottom: 4px;">Model Valuation</div>
                            <div style="font-size: 24px; font-weight: 600; color: var(--primary-color);">${this.formatCurrency(currentValuation * 1e9)}</div>
                            <div style="font-size: 11px; color: var(--text-secondary); margin-top: 4px;">DCF-based</div>
                        </div>
                    ` : ''}
                </div>
                
                <!-- Detailed Table -->
                <div class="table-container">
                    <table class="data-table">
                        <thead>
                            <tr>
                                <th>Company</th>
                                <th>Ticker</th>
                                <th>Multiple</th>
                                <th>Implied Valuation</th>
                                <th>vs. Model</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${impliedValuations.map(iv => {
                                const rows = [];
                                if (iv.valuations.evRevenue) {
                                    const diff = currentValuation > 0 
                                        ? ((iv.valuations.evRevenue.impliedValue - currentValuation) / currentValuation * 100).toFixed(1)
                                        : '--';
                                    const diffColor = currentValuation > 0 && parseFloat(diff) > 0 ? 'var(--success-color)' : 
                                                     currentValuation > 0 && parseFloat(diff) < 0 ? 'var(--error-color)' : 'var(--text-secondary)';
                                    rows.push(`
                                        <tr>
                                            <td><strong>${iv.company}</strong></td>
                                            <td>${iv.ticker || '--'}</td>
                                            <td>EV/Revenue: ${iv.valuations.evRevenue.multiple.toFixed(2)}x</td>
                                            <td><strong>${this.formatCurrency(iv.valuations.evRevenue.impliedValue * 1e9)}</strong></td>
                                            <td style="color: ${diffColor};">${diff !== '--' ? (parseFloat(diff) > 0 ? '+' : '') + diff + '%' : '--'}</td>
                                        </tr>
                                    `);
                                }
                                if (iv.valuations.evEbitda) {
                                    const diff = currentValuation > 0 
                                        ? ((iv.valuations.evEbitda.impliedValue - currentValuation) / currentValuation * 100).toFixed(1)
                                        : '--';
                                    const diffColor = currentValuation > 0 && parseFloat(diff) > 0 ? 'var(--success-color)' : 
                                                     currentValuation > 0 && parseFloat(diff) < 0 ? 'var(--error-color)' : 'var(--text-secondary)';
                                    rows.push(`
                                        <tr>
                                            <td><strong>${iv.company}</strong></td>
                                            <td>${iv.ticker || '--'}</td>
                                            <td>EV/EBITDA: ${iv.valuations.evEbitda.multiple.toFixed(2)}x</td>
                                            <td><strong>${this.formatCurrency(iv.valuations.evEbitda.impliedValue * 1e9)}</strong></td>
                                            <td style="color: ${diffColor};">${diff !== '--' ? (parseFloat(diff) > 0 ? '+' : '') + diff + '%' : '--'}</td>
                                        </tr>
                                    `);
                                }
                                return rows.join('');
                            }).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    }
    
    updateValuationMultiples(companies) {
        if (!companies || companies.length === 0) {
            console.warn('updateValuationMultiples: No companies data provided');
            return;
        }
        
        // Calculate averages
        const validEvRevenue = companies.filter(c => c.evRevenue).map(c => c.evRevenue);
        const validEvEbitda = companies.filter(c => c.evEbitda).map(c => c.evEbitda);
        const validPeRatio = companies.filter(c => c.peRatio).map(c => c.peRatio);
        const validPegRatio = companies.filter(c => c.pegRatio).map(c => c.pegRatio);
        
        const avgEvRevenue = validEvRevenue.length > 0 
            ? (validEvRevenue.reduce((a, b) => a + b, 0) / validEvRevenue.length).toFixed(2)
            : '--';
        const avgEvEbitda = validEvEbitda.length > 0
            ? (validEvEbitda.reduce((a, b) => a + b, 0) / validEvEbitda.length).toFixed(2)
            : '--';
        const avgPeRatio = validPeRatio.length > 0
            ? (validPeRatio.reduce((a, b) => a + b, 0) / validPeRatio.length).toFixed(2)
            : '--';
        const avgPegRatio = validPegRatio.length > 0
            ? (validPegRatio.reduce((a, b) => a + b, 0) / validPegRatio.length).toFixed(2)
            : '--';
        
        // Update the metrics cards (if they exist)
        // The metrics are in the "Peer Multiples Summary" section within ratiosTab-dashboard
        const dashboardContent = document.getElementById('ratiosTab-dashboard');
        if (!dashboardContent) {
            console.warn('updateValuationMultiples: ratiosTab-dashboard not found');
            return;
        }
        
        // Find the Peer Multiples Summary section (second metrics-grid in dashboard)
        const sections = dashboardContent.querySelectorAll('.section');
        let metricsGrid = null;
        for (const section of sections) {
            const heading = section.querySelector('h3');
            if (heading && heading.textContent.includes('Peer Multiples Summary')) {
                metricsGrid = section.querySelector('.metrics-grid');
                break;
            }
        }
        
        if (!metricsGrid) {
            console.warn('updateValuationMultiples: Peer Multiples Summary metrics-grid not found');
            return;
        }
        
        const metricCards = metricsGrid.querySelectorAll('.metric-card-small');
        const evRevenueEl = metricCards.length > 0 ? metricCards[0].querySelector('.metric-value-small') : null;
        const evEbitdaEl = metricCards.length > 1 ? metricCards[1].querySelector('.metric-value-small') : null;
        const peRatioEl = metricCards.length > 2 ? metricCards[2].querySelector('.metric-value-small') : null;
        const pegRatioEl = metricCards.length > 3 ? metricCards[3].querySelector('.metric-value-small') : null;
        
        if (evRevenueEl) {
            evRevenueEl.textContent = avgEvRevenue !== '--' ? avgEvRevenue + 'x' : '--';
            evRevenueEl.style.color = '';
            console.log('✅ Updated Avg EV/Revenue:', avgEvRevenue + 'x');
        } else {
            console.warn('⚠️ evRevenueEl not found');
        }
        if (evEbitdaEl) {
            evEbitdaEl.textContent = avgEvEbitda !== '--' ? avgEvEbitda + 'x' : '--';
            evEbitdaEl.style.color = '';
            console.log('✅ Updated Avg EV/EBITDA:', avgEvEbitda + 'x');
        } else {
            console.warn('⚠️ evEbitdaEl not found');
        }
        if (peRatioEl) {
            peRatioEl.textContent = avgPeRatio !== '--' ? avgPeRatio + 'x' : '--';
            peRatioEl.style.color = '';
            console.log('✅ Updated Avg P/E Ratio:', avgPeRatio + 'x');
        } else {
            console.warn('⚠️ peRatioEl not found');
        }
        if (pegRatioEl) {
            pegRatioEl.textContent = avgPegRatio !== '--' ? avgPegRatio : '--';
            pegRatioEl.style.color = '';
            console.log('✅ Updated Avg PEG Ratio:', avgPegRatio);
        } else {
            console.warn('⚠️ pegRatioEl not found');
        }
        
        // Update helper text
        const helpers = metricsGrid.querySelectorAll('.metric-card-small div[style*="font-size: 11px"]');
        helpers.forEach(el => {
            if (el.textContent.includes('Requires public data') || el.textContent.includes('Peer average')) {
                el.textContent = 'Peer average';
            }
        });
    }
    
    // Debounced auto-run Monte Carlo for input changes
    debouncedAutoRunMonteCarlo(reason = 'parameter-change') {
        // Clear existing timer
        if (this.monteCarloDebounceTimer) {
            clearTimeout(this.monteCarloDebounceTimer);
        }
        
        // Set new timer (wait 2 seconds after last input change)
        this.monteCarloDebounceTimer = setTimeout(() => {
            this.autoRunMonteCarloIfNeeded(reason);
        }, 2000);
    }
    
    // Debounced auto-run VaR for input changes
    debouncedAutoRunVaR(reason = 'parameter-change') {
        // Clear existing timer
        if (this.varDebounceTimer) {
            clearTimeout(this.varDebounceTimer);
        }
        
        // Set new timer (wait 2 seconds after last input change)
        this.varDebounceTimer = setTimeout(() => {
            this.autoRunVaRIfNeeded(reason);
        }, 2000);
    }
    
    // Debounced auto-run Attribution for input changes
    debouncedAutoRunAttribution(reason = 'parameter-change') {
        // Clear existing timer
        if (this.attributionDebounceTimer) {
            clearTimeout(this.attributionDebounceTimer);
        }
        
        // Set new timer (wait 2 seconds after last input change)
        this.attributionDebounceTimer = setTimeout(() => {
            this.autoRunAttributionIfNeeded(reason);
        }, 2000);
    }
    
    // Auto-run Monte Carlo simulation if needed
    async autoRunMonteCarloIfNeeded(reason = 'auto') {
        // Don't run if already running
        if (this.autoRunningMonteCarlo) {
            console.log('⏸️ Monte Carlo already running, skipping auto-run');
            return;
        }
        
        // Don't run if there's a pending run waiting for confirmation
        if (this.pendingMonteCarloRun) {
            console.log('⏸️ Monte Carlo pending confirmation, skipping auto-run');
            return;
        }
        
        // Don't run if no model is loaded (for initialization, wait for model)
        if (!this.currentModelId && reason !== 'initialization') {
            console.log('⏸️ No model loaded, skipping auto-run');
            return;
        }
        
        console.log(`🎲 Auto-running Monte Carlo simulation (reason: ${reason})`);
        
        try {
            // Set flag to prevent duplicate runs
            this.autoRunningMonteCarlo = true;
            
            // Run simulation (skip validation since we're auto-running)
            // Progress modal will still show so user knows simulation is running
            await this.runMonteCarloSimulation(true);
            
            console.log(`✅ Auto Monte Carlo simulation completed (reason: ${reason})`);
        } catch (error) {
            console.error(`❌ Auto Monte Carlo simulation failed (reason: ${reason}):`, error);
            // Don't show error to user for auto-runs, just log it
        } finally {
            // Reset flag after a short delay
            setTimeout(() => {
                this.autoRunningMonteCarlo = false;
            }, 1000);
        }
    }
    
    // Auto-run VaR calculation if needed
    async autoRunVaRIfNeeded(reason = 'auto') {
        // Don't run if already running
        if (this.autoRunningVaR) {
            console.log('⏸️ VaR already running, skipping auto-run');
            return;
        }
        
        // Don't run if no model is loaded (for initialization, wait for model)
        if (!this.currentModelId && reason !== 'initialization') {
            console.log('⏸️ No model loaded, skipping VaR auto-run');
            return;
        }
        
        console.log(`📊 Auto-running VaR calculation (reason: ${reason})`);
        
        try {
            // Set flag to prevent duplicate runs
            this.autoRunningVaR = true;
            
            // Run VaR calculation silently (no button updates for auto-runs)
            await this.calculateVaR(true);
            
            console.log(`✅ Auto VaR calculation completed (reason: ${reason})`);
        } catch (error) {
            console.error(`❌ Auto VaR calculation failed (reason: ${reason}):`, error);
            // Don't show error to user for auto-runs, just log it
        } finally {
            // Reset flag after a short delay
            setTimeout(() => {
                this.autoRunningVaR = false;
            }, 1000);
        }
    }
    
    // Auto-run Attribution calculation if needed
    async autoRunAttributionIfNeeded(reason = 'auto') {
        // Don't run if already running
        if (this.autoRunningAttribution) {
            console.log('⏸️ Attribution already running, skipping auto-run');
            return;
        }
        
        // Don't run if no model is loaded (for initialization, wait for model)
        if (!this.currentModelId && reason !== 'initialization') {
            console.log('⏸️ No model loaded, skipping Attribution auto-run');
            return;
        }
        
        // Attribution requires at least 2 models for comparison
        // Skip if we don't have comparison models available
        try {
            const modelsResponse = await fetch('/api/models?limit=2&sortBy=createdAt&sortOrder=desc');
            const modelsResult = await modelsResponse.json();
            if (!modelsResult.success || modelsResult.data.length < 2) {
                console.log('⏸️ Skipping Attribution - need at least 2 models for comparison');
                return;
            }
        } catch (error) {
            console.warn('Could not check models for attribution:', error);
            return;
        }
        
        console.log(`📊 Auto-running Attribution calculation (reason: ${reason})`);
        
        try {
            // Set flag to prevent duplicate runs
            this.autoRunningAttribution = true;
            
            // Run Attribution calculation silently (no button updates for auto-runs)
            await this.calculateAttribution(true);
            
            console.log(`✅ Auto Attribution calculation completed (reason: ${reason})`);
        } catch (error) {
            console.error(`❌ Auto Attribution calculation failed (reason: ${reason}):`, error);
            // Don't show error to user for auto-runs, just log it
        } finally {
            // Reset flag after a short delay
            setTimeout(() => {
                this.autoRunningAttribution = false;
            }, 1000);
        }
    }
    
    exportSimulationsToCSV() {
        if (!this.currentMonteCarloSimulations || this.currentMonteCarloSimulations.length === 0) {
            alert('No simulation data to export');
            return;
        }
        
        // Create CSV header with essential columns + all available data
        const headers = [
            'Iteration',
            'Starlink Penetration', 'Launch Volume', 'First Colony Year', 'Discount Rate',
            'Earth Value ($B)', 'Mars Value ($B)', 'Total Value ($B)', 'Diluted Value ($B)',
            'Earth %', 'Mars %'
        ];
        const rows = [headers.join(',')];
        
        // Add data rows
        this.currentMonteCarloSimulations.forEach(sim => {
            const iteration = sim.run || sim.iteration || '';
            const inputs = sim.inputs || {};
            const results = sim.results || {};
            
            const starlinkPenetration = inputs.earth?.starlinkPenetration || '';
            const launchVolume = inputs.earth?.launchVolume || '';
            const firstColonyYear = inputs.mars?.firstColonyYear || '';
            const discountRate = inputs.financial?.discountRate || '';
            
            const earthValue = results.earthValue || sim.earthValue || 0;
            const marsValue = results.marsValue || sim.marsValue || 0;
            const totalValue = results.totalValue || sim.totalValue || (earthValue + marsValue);
            const dilutionFactor = inputs.financial?.dilutionFactor || 0.15;
            const dilutedValue = results.dilutedValue || sim.dilutedValue || (totalValue * (1 - dilutionFactor));
            const earthPercent = totalValue > 0 ? ((earthValue / totalValue) * 100).toFixed(2) : '0.00';
            const marsPercent = totalValue > 0 ? ((marsValue / totalValue) * 100).toFixed(2) : '0.00';
            
            const formatCSV = (val) => {
                if (val === null || val === undefined || val === '') return '';
                if (typeof val === 'number') return val.toFixed(2);
                return val.toString();
            };
            
            rows.push([
                iteration,
                formatCSV(starlinkPenetration), formatCSV(launchVolume), formatCSV(firstColonyYear), formatCSV(discountRate),
                formatCSV(earthValue), formatCSV(marsValue), formatCSV(totalValue), formatCSV(dilutedValue),
                earthPercent, marsPercent
            ].join(','));
        });
        
        // Create and download CSV
        const csvContent = rows.join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `monte-carlo-simulations-${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    // Display Monte Carlo configuration parameters
    displayMonteCarloConfig(config, fromModel) {
        const configSection = document.getElementById('monteCarloConfigSection');
        const configRuns = document.getElementById('configRuns');
        const configDistributionType = document.getElementById('configDistributionType');
        const configSource = document.getElementById('configSource');
        const parametersDisplay = document.getElementById('monteCarloParametersDisplay');
        
        if (!configSection) return;

        // Get current runs from config or defaults
        const runs = config?.runs || this.currentMonteCarloConfig?.runs || 5000;
        const useCustom = config?.useCustomDistributions !== undefined 
            ? config.useCustomDistributions 
            : (this.currentMonteCarloConfig?.useCustomDistributions || false);
        
        // Update basic info
        if (configRuns) configRuns.textContent = runs.toLocaleString();
        if (configDistributionType) {
            configDistributionType.textContent = useCustom ? 'Custom' : 'Default';
        }
        
        // Update estimated time based on runs
        const estimatedTimeEl = document.getElementById('configEstimatedTime');
        if (estimatedTimeEl) {
            // Rough estimate: ~1-2ms per run, but can vary
            const estimatedSeconds = Math.max(1, Math.ceil(runs / 1000));
            if (estimatedSeconds < 60) {
                estimatedTimeEl.textContent = `~${estimatedSeconds}-${estimatedSeconds * 2} sec`;
            } else {
                const minutes = Math.floor(estimatedSeconds / 60);
                estimatedTimeEl.textContent = `~${minutes}-${minutes * 2} min`;
            }
        }
        
        // Update source info
        if (configSource) {
            if (fromModel && config) {
                configSource.innerHTML = `<i data-lucide="database"></i> Loaded from model: "${this.currentModelName || 'Current Model'}"`;
            } else {
                configSource.innerHTML = `<i data-lucide="info"></i> Using default configuration. Click "Edit" to customize parameters.`;
            }
            if (window.lucide) window.lucide.createIcons();
        }

        // Always display distribution parameters (defaults or custom)
        const distributions = (config?.distributions && useCustom) 
            ? config.distributions 
            : this.getDefaultMonteCarloDistributions();
        this.displayDistributionParameters(distributions);
        if (parametersDisplay) parametersDisplay.style.display = 'block';
    }

    // Display distribution parameters
    displayDistributionParameters(distributions) {
        // Earth parameters
        if (distributions.earth) {
            if (distributions.earth.starlinkPenetration) {
                const param = distributions.earth.starlinkPenetration;
                document.getElementById('paramEarthPenetrationStdDev').textContent = param.stdDev || '0.05';
                document.getElementById('paramEarthPenetrationRange').textContent = `[${param.min || '0.05'}, ${param.max || '0.30'}]`;
            }
            if (distributions.earth.launchVolume) {
                const param = distributions.earth.launchVolume;
                document.getElementById('paramEarthLaunchStdDev').textContent = param.stdDev || '30';
                document.getElementById('paramEarthLaunchRange').textContent = `[${param.min || '10'}, ${param.max || '500'}]`;
            }
            if (distributions.earth.bandwidthPriceDecline) {
                const param = distributions.earth.bandwidthPriceDecline;
                document.getElementById('paramEarthBandwidthStdDev').textContent = param.stdDev || '0.02';
                document.getElementById('paramEarthBandwidthRange').textContent = `[${param.min || '0'}, ${param.max || '0.20'}]`;
            }
        }

        // Mars parameters
        if (distributions.mars) {
            if (distributions.mars.firstColonyYear) {
                const param = distributions.mars.firstColonyYear;
                document.getElementById('paramMarsColonyStdDev').textContent = param.stdDev || '5';
                document.getElementById('paramMarsColonyRange').textContent = `[${param.min || '2025'}, ${param.max || '2060'}]`;
            }
            if (distributions.mars.populationGrowth) {
                const param = distributions.mars.populationGrowth;
                document.getElementById('paramMarsPopStdDev').textContent = param.stdDev || '0.15';
                document.getElementById('paramMarsPopRange').textContent = `[${param.min || '0.1'}, ${param.max || '1.0'}]`;
            }
        }

        // Financial parameters
        if (distributions.financial) {
            if (distributions.financial.discountRate) {
                const param = distributions.financial.discountRate;
                document.getElementById('paramFinancialDiscountStdDev').textContent = param.stdDev || '0.03';
                document.getElementById('paramFinancialDiscountRange').textContent = `[${param.min || '0.08'}, ${param.max || '0.25'}]`;
            }
            if (distributions.financial.dilutionFactor) {
                const param = distributions.financial.dilutionFactor;
                document.getElementById('paramFinancialDilutionStdDev').textContent = param.stdDev || '0.05';
                document.getElementById('paramFinancialDilutionRange').textContent = `[${param.min || '0.05'}, ${param.max || '0.30'}]`;
            }
        }
    }

    // Get default Monte Carlo distributions (matching backend defaults)
    getDefaultMonteCarloDistributions() {
        return {
            earth: {
                starlinkPenetration: {
                    stdDev: 0.05,
                    min: 0.05,
                    max: 0.30
                },
                launchVolume: {
                    stdDev: 30,
                    min: 10,
                    max: 500
                },
                bandwidthPriceDecline: {
                    stdDev: 0.02,
                    min: 0,
                    max: 0.20
                }
            },
            mars: {
                firstColonyYear: {
                    stdDev: 5,
                    min: 2025,
                    max: 2060
                },
                populationGrowth: {
                    stdDev: 0.15,
                    min: 0.1,
                    max: 1.0
                }
            },
            financial: {
                discountRate: {
                    stdDev: 0.03,
                    min: 0.08,
                    max: 0.25
                },
                dilutionFactor: {
                    stdDev: 0.05,
                    min: 0.05,
                    max: 0.30
                }
            }
        };
    }

    // Open edit Monte Carlo config modal
    openEditMonteCarloConfigModal() {
        const modal = document.getElementById('editMonteCarloConfigModal');
        if (!modal) return;

        // Load current config into form
        const config = this.currentMonteCarloConfig || {
            runs: 5000,
            useCustomDistributions: false,
            distributions: null
        };

        // Set basic settings
        document.getElementById('editMonteCarloRuns').value = config.runs || 5000;
        document.getElementById('editUseCustomDistributions').checked = config.useCustomDistributions || false;
        document.getElementById('customDistributionsSection').style.display = config.useCustomDistributions ? 'block' : 'none';

        // Load distribution parameters if available
        const distributions = config.distributions || this.getDefaultMonteCarloDistributions();
        
        // Earth parameters
        if (distributions.earth) {
            if (distributions.earth.starlinkPenetration) {
                document.getElementById('editEarthPenetrationStdDev').value = distributions.earth.starlinkPenetration.stdDev || 0.05;
                document.getElementById('editEarthPenetrationMin').value = distributions.earth.starlinkPenetration.min || 0.05;
                document.getElementById('editEarthPenetrationMax').value = distributions.earth.starlinkPenetration.max || 0.30;
            }
            if (distributions.earth.launchVolume) {
                document.getElementById('editEarthLaunchStdDev').value = distributions.earth.launchVolume.stdDev || 30;
                document.getElementById('editEarthLaunchMin').value = distributions.earth.launchVolume.min || 10;
                document.getElementById('editEarthLaunchMax').value = distributions.earth.launchVolume.max || 500;
            }
            if (distributions.earth.bandwidthPriceDecline) {
                document.getElementById('editEarthBandwidthStdDev').value = distributions.earth.bandwidthPriceDecline.stdDev || 0.02;
                document.getElementById('editEarthBandwidthMin').value = distributions.earth.bandwidthPriceDecline.min || 0;
                document.getElementById('editEarthBandwidthMax').value = distributions.earth.bandwidthPriceDecline.max || 0.20;
            }
        }

        // Mars parameters
        if (distributions.mars) {
            if (distributions.mars.firstColonyYear) {
                document.getElementById('editMarsColonyStdDev').value = distributions.mars.firstColonyYear.stdDev || 5;
                document.getElementById('editMarsColonyMin').value = distributions.mars.firstColonyYear.min || 2025;
                document.getElementById('editMarsColonyMax').value = distributions.mars.firstColonyYear.max || 2060;
            }
            if (distributions.mars.populationGrowth) {
                document.getElementById('editMarsPopStdDev').value = distributions.mars.populationGrowth.stdDev || 0.15;
                document.getElementById('editMarsPopMin').value = distributions.mars.populationGrowth.min || 0.1;
                document.getElementById('editMarsPopMax').value = distributions.mars.populationGrowth.max || 1.0;
            }
        }

        // Financial parameters
        if (distributions.financial) {
            if (distributions.financial.discountRate) {
                document.getElementById('editFinancialDiscountStdDev').value = distributions.financial.discountRate.stdDev || 0.03;
                document.getElementById('editFinancialDiscountMin').value = distributions.financial.discountRate.min || 0.08;
                document.getElementById('editFinancialDiscountMax').value = distributions.financial.discountRate.max || 0.25;
            }
            if (distributions.financial.dilutionFactor) {
                document.getElementById('editFinancialDilutionStdDev').value = distributions.financial.dilutionFactor.stdDev || 0.05;
                document.getElementById('editFinancialDilutionMin').value = distributions.financial.dilutionFactor.min || 0.05;
                document.getElementById('editFinancialDilutionMax').value = distributions.financial.dilutionFactor.max || 0.30;
            }
        }

        modal.classList.add('active');
        if (window.lucide) window.lucide.createIcons();
    }

    // Close edit Monte Carlo config modal
    closeEditMonteCarloConfigModal() {
        const modal = document.getElementById('editMonteCarloConfigModal');
        if (modal) {
            modal.classList.remove('active');
        }
    }

    // Save Monte Carlo configuration
    async saveMonteCarloConfig() {
        const runs = parseInt(document.getElementById('editMonteCarloRuns').value) || 5000;
        const useCustom = document.getElementById('editUseCustomDistributions').checked;

        const config = {
            runs: runs,
            useCustomDistributions: useCustom,
            distributions: useCustom ? {
                earth: {
                    starlinkPenetration: {
                        stdDev: parseFloat(document.getElementById('editEarthPenetrationStdDev').value) || 0.05,
                        min: parseFloat(document.getElementById('editEarthPenetrationMin').value) || 0.05,
                        max: parseFloat(document.getElementById('editEarthPenetrationMax').value) || 0.30
                    },
                    launchVolume: {
                        stdDev: parseFloat(document.getElementById('editEarthLaunchStdDev').value) || 30,
                        min: parseFloat(document.getElementById('editEarthLaunchMin').value) || 10,
                        max: parseFloat(document.getElementById('editEarthLaunchMax').value) || 500
                    },
                    bandwidthPriceDecline: {
                        stdDev: parseFloat(document.getElementById('editEarthBandwidthStdDev').value) || 0.02,
                        min: parseFloat(document.getElementById('editEarthBandwidthMin').value) || 0,
                        max: parseFloat(document.getElementById('editEarthBandwidthMax').value) || 0.20
                    }
                },
                mars: {
                    firstColonyYear: {
                        stdDev: parseFloat(document.getElementById('editMarsColonyStdDev').value) || 5,
                        min: parseFloat(document.getElementById('editMarsColonyMin').value) || 2025,
                        max: parseFloat(document.getElementById('editMarsColonyMax').value) || 2060
                    },
                    populationGrowth: {
                        stdDev: parseFloat(document.getElementById('editMarsPopStdDev').value) || 0.15,
                        min: parseFloat(document.getElementById('editMarsPopMin').value) || 0.1,
                        max: parseFloat(document.getElementById('editMarsPopMax').value) || 1.0
                    }
                },
                financial: {
                    discountRate: {
                        stdDev: parseFloat(document.getElementById('editFinancialDiscountStdDev').value) || 0.03,
                        min: parseFloat(document.getElementById('editFinancialDiscountMin').value) || 0.08,
                        max: parseFloat(document.getElementById('editFinancialDiscountMax').value) || 0.25
                    },
                    dilutionFactor: {
                        stdDev: parseFloat(document.getElementById('editFinancialDilutionStdDev').value) || 0.05,
                        min: parseFloat(document.getElementById('editFinancialDilutionMin').value) || 0.05,
                        max: parseFloat(document.getElementById('editFinancialDilutionMax').value) || 0.30
                    }
                }
            } : null
        };

        // Store config (no need to update form inputs - they're removed)
        this.currentMonteCarloConfig = config;

        // Update display
        this.displayMonteCarloConfig(config, false);

        // Save to model if model is loaded
        if (this.currentModelId) {
            try {
                const response = await fetch(`/api/models/${this.currentModelId}/monte-carlo-config`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ monteCarloConfig: config })
                });

                const result = await response.json();
                if (result.success) {
                    console.log('✅ Monte Carlo config saved to model');
                    this.showNotification('Success', 'Monte Carlo configuration saved!', 'success');
                } else {
                    console.warn('Failed to save config:', result.error);
                    this.showNotification('Error', 'Failed to save configuration: ' + result.error, 'error');
                }
            } catch (error) {
                console.error('Save config error:', error);
                this.showNotification('Error', 'Failed to save configuration', 'error');
            }
        } else {
            this.showNotification('Success', 'Configuration updated! (Save model to persist)', 'success');
        }

        this.closeEditMonteCarloConfigModal();
    }

    // Reset Monte Carlo config to defaults
    resetMonteCarloConfigToDefaults() {
        const defaults = this.getDefaultMonteCarloDistributions();
        
        // Set runs to default
        document.getElementById('editMonteCarloRuns').value = 5000;
        document.getElementById('editUseCustomDistributions').checked = false;
        document.getElementById('customDistributionsSection').style.display = 'none';

        // Reset Earth parameters
        document.getElementById('editEarthPenetrationStdDev').value = defaults.earth.starlinkPenetration.stdDev;
        document.getElementById('editEarthPenetrationMin').value = defaults.earth.starlinkPenetration.min;
        document.getElementById('editEarthPenetrationMax').value = defaults.earth.starlinkPenetration.max;
        document.getElementById('editEarthLaunchStdDev').value = defaults.earth.launchVolume.stdDev;
        document.getElementById('editEarthLaunchMin').value = defaults.earth.launchVolume.min;
        document.getElementById('editEarthLaunchMax').value = defaults.earth.launchVolume.max;
        document.getElementById('editEarthBandwidthStdDev').value = defaults.earth.bandwidthPriceDecline.stdDev;
        document.getElementById('editEarthBandwidthMin').value = defaults.earth.bandwidthPriceDecline.min;
        document.getElementById('editEarthBandwidthMax').value = defaults.earth.bandwidthPriceDecline.max;

        // Reset Mars parameters
        document.getElementById('editMarsColonyStdDev').value = defaults.mars.firstColonyYear.stdDev;
        document.getElementById('editMarsColonyMin').value = defaults.mars.firstColonyYear.min;
        document.getElementById('editMarsColonyMax').value = defaults.mars.firstColonyYear.max;
        document.getElementById('editMarsPopStdDev').value = defaults.mars.populationGrowth.stdDev;
        document.getElementById('editMarsPopMin').value = defaults.mars.populationGrowth.min;
        document.getElementById('editMarsPopMax').value = defaults.mars.populationGrowth.max;

        // Reset Financial parameters
        document.getElementById('editFinancialDiscountStdDev').value = defaults.financial.discountRate.stdDev;
        document.getElementById('editFinancialDiscountMin').value = defaults.financial.discountRate.min;
        document.getElementById('editFinancialDiscountMax').value = defaults.financial.discountRate.max;
        document.getElementById('editFinancialDilutionStdDev').value = defaults.financial.dilutionFactor.stdDev;
        document.getElementById('editFinancialDilutionMin').value = defaults.financial.dilutionFactor.min;
        document.getElementById('editFinancialDilutionMax').value = defaults.financial.dilutionFactor.max;
    }

    // Auto-save simulation after running
    async autoSaveMonteCarloSimulation(data, baseInputs, runs) {
        if (!this.currentModelId) return;
        
        const name = `Monte Carlo - ${this.currentModelName || 'Model'} - ${new Date().toLocaleDateString()}`;
        const description = `Auto-saved simulation with ${runs.toLocaleString()} runs`;
        
        try {
            // Extract sample results (first 100 runs)
            const sampleResults = data.sampleResults || (data.results ? data.results.slice(0, 100).map(r => ({
                run: r.run,
                totalValue: r.results.totalValue,
                earthValue: r.results.earthValue,
                marsValue: r.results.marsValue
            })) : []);

            const response = await fetch('/api/monte-carlo', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name,
                    description: description || '',
                    baseInputs: baseInputs,
                    distributions: null, // Use defaults
                    runs: data.runs || runs,
                    valuationModelId: this.currentModelId,
                    statistics: data.statistics,
                    sampleResults: sampleResults,
                    elapsedSeconds: data.elapsedSeconds
                })
            });

            const result = await response.json();
            
            if (result.success) {
                console.log('✅ Simulation auto-saved successfully');
                
                // Update model's results field with Monte Carlo statistics
                if (this.currentModelId && data.statistics) {
                    // Extract mean value from statistics - check multiple possible structures
                    const meanValue = data.statistics.totalValue?.mean || 
                                    data.statistics?.totalValue?.mean ||
                                    data.statistics?.mean || 
                                    null;
                    
                    if (meanValue !== null && meanValue > 0) {
                        try {
                            console.log('📊 Updating model results with Monte Carlo statistics:', {
                                meanValue,
                                totalStats: data.statistics.totalValue,
                                earthStats: data.statistics.earthValue,
                                marsStats: data.statistics.marsValue
                            });
                            
                            // Update model with Monte Carlo results
                            const updateResponse = await fetch(`/api/models/${this.currentModelId}`, {
                                method: 'PUT',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                    results: {
                                        total: {
                                            value: meanValue, // Monte Carlo mean value (in billions)
                                            breakdown: {
                                                earth: data.statistics.earthValue?.mean || data.statistics?.earthValue?.mean || null,
                                                mars: data.statistics.marsValue?.mean || data.statistics?.marsValue?.mean || null
                                            }
                                        },
                                        monteCarlo: {
                                            bear: data.statistics.totalValue?.p25 || data.statistics.totalValue?.min || data.statistics?.p25 || null,
                                            base: meanValue,
                                            optimistic: data.statistics.totalValue?.p75 || data.statistics.totalValue?.max || data.statistics?.p75 || null,
                                            statistics: data.statistics,
                                            runs: data.runs || runs
                                        },
                                        updatedAt: new Date().toISOString()
                                    },
                                })
                            });
                            
                            const updateResult = await updateResponse.json();
                            if (updateResponse.ok && updateResult.success) {
                                console.log('✅ Updated model results with Monte Carlo statistics');
                            } else {
                                console.warn('⚠️ Failed to update model results:', updateResult.error || await updateResponse.text());
                            }
                        } catch (updateError) {
                            console.warn('⚠️ Error updating model results:', updateError);
                        }
                    } else {
                        console.warn('⚠️ Cannot update model: meanValue is null or invalid:', meanValue);
                    }
                }
                
                // Show brief notification that simulation was saved
                const notification = document.createElement('div');
                notification.style.cssText = `
                    position: fixed;
                    top: 100px;
                    right: 20px;
                    background: var(--success-color);
                    color: white;
                    padding: 12px 20px;
                    border-radius: 8px;
                    box-shadow: var(--shadow-lg);
                    z-index: 10000;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    font-size: 14px;
                `;
                notification.innerHTML = `
                    <i data-lucide="check-circle"></i>
                    <span>Simulation saved successfully</span>
                `;
                document.body.appendChild(notification);
                if (window.lucide) window.lucide.createIcons();
                
                // Remove notification after 3 seconds
                setTimeout(() => {
                    notification.style.transition = 'opacity 0.3s';
                    notification.style.opacity = '0';
                    setTimeout(() => notification.remove(), 300);
                }, 3000);
                
                // Reload models to update cards with new data
                if (this.currentView === 'models') {
                    this.loadModels();
                } else {
                    // Even if not on models view, refresh in background so cards update when user navigates
                    setTimeout(() => {
                        this.loadModels();
                    }, 1000);
                }
            } else {
                console.warn('Failed to auto-save simulation:', result.error);
            }
        } catch (error) {
            console.error('Auto-save error:', error);
        }
    }

    async saveMonteCarloSimulation() {
        if (!this.currentMonteCarloData || !this.currentModelId) {
            alert('Please load a model and run a simulation first');
            return;
        }

        // Show Mach33 modal for name input instead of prompt()
        this.showSaveSimulationModal();

        try {
            // Extract sample results (first 100 runs)
            const sampleResults = this.currentMonteCarloData.results.slice(0, 100).map(r => ({
                run: r.run,
                totalValue: r.results.totalValue,
                earthValue: r.results.earthValue,
                marsValue: r.results.marsValue
            }));

            const response = await fetch('/api/monte-carlo', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name,
                    description: description || '',
                    baseInputs: this.getInputs(),
                    distributions: null, // Use defaults
                    runs: this.currentMonteCarloData.runs,
                    valuationModelId: this.currentModelId,
                    // Include pre-calculated results to avoid re-running
                    statistics: this.currentMonteCarloData.statistics,
                    sampleResults: sampleResults,
                    elapsedSeconds: this.currentMonteCarloData.elapsedSeconds
                })
            });

            const result = await response.json();
            
            if (result.success) {
                alert('Simulation saved successfully!');
                // Reload models to update simulation counts
                this.loadModels();
            } else {
                alert('Failed to save simulation: ' + result.error);
            }
        } catch (error) {
            console.error('Save simulation error:', error);
            alert('Failed to save simulation');
        }
    }

    updateMonteCarloDistributionChart(distribution) {
        const ctx = document.getElementById('monteCarloDistributionChart');
        if (!ctx) return;

        if (this.charts.monteCarloDistribution) {
            this.charts.monteCarloDistribution.destroy();
        }

        this.charts.monteCarloDistribution = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: distribution.binCenters.map(v => `$${v.toFixed(1)}B`),
                datasets: [{
                    label: 'Frequency',
                    data: distribution.histogram,
                    backgroundColor: 'rgba(0, 102, 204, 0.6)',
                    borderColor: '#0066cc',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: 'Valuation Distribution'
                    },
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        title: {
                            display: true,
                            text: 'Frequency'
                        },
                        beginAtZero: true
                    },
                    x: {
                        title: {
                            display: true,
                            text: 'Enterprise Value ($B)'
                        }
                    }
                }
            }
        });
    }

    updateMonteCarloComparisonChart(statistics) {
        const ctx = document.getElementById('monteCarloComparisonChart');
        if (!ctx) return;

        if (this.charts.monteCarloComparison) {
            this.charts.monteCarloComparison.destroy();
        }

        const formatBillion = (value) => {
            if (value >= 1000) return value / 1e9;
            return value;
        };

        this.charts.monteCarloComparison = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: ['Total Value', 'Earth Value', 'Mars Value'],
                datasets: [
                    {
                        label: 'Mean',
                        data: [
                            formatBillion(statistics.totalValue.mean),
                            formatBillion(statistics.earthValue.mean),
                            formatBillion(statistics.marsValue.mean)
                        ],
                        backgroundColor: '#0066cc'
                    },
                    {
                        label: 'Q1',
                        data: [
                            formatBillion(statistics.totalValue.q1),
                            formatBillion(statistics.earthValue.q1),
                            formatBillion(statistics.marsValue.q1)
                        ],
                        backgroundColor: '#10b981'
                    },
                    {
                        label: 'Q3',
                        data: [
                            formatBillion(statistics.totalValue.q3),
                            formatBillion(statistics.earthValue.q3),
                            formatBillion(statistics.marsValue.q3)
                        ],
                        backgroundColor: '#f59e0b'
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: 'Statistical Comparison'
                    },
                    legend: {
                        position: 'bottom'
                    }
                },
                scales: {
                    y: {
                        title: {
                            display: true,
                            text: 'Value ($B)'
                        },
                        ticks: {
                            callback: function(value) {
                                return '$' + value.toFixed(1) + 'B';
                            }
                        }
                    }
                }
            }
        });
    }

    // Auto-calculate scenarios when tab is opened
    async autoCalculateScenarios() {
        const baseInputs = this.getInputs();
        if (!baseInputs) return;

        // Auto-run scenario comparison
        await this.runScenarioComparison(true);
        
        // Auto-run Monte Carlo comparison after a short delay
        setTimeout(() => {
            this.runScenarioMonteCarloComparison(true);
        }, 500);
    }

    // Scenario Comparison
    async runScenarioComparison(skipButtonUpdate = false) {
        const baseInputs = this.getInputs();
        if (!baseInputs) {
            if (!skipButtonUpdate) alert('Please load a model or set inputs first');
            return;
        }
        
        const btn = document.getElementById('runScenariosBtn');
        if (!btn) return;
        
        const originalText = btn.innerHTML;
        if (!skipButtonUpdate) {
            btn.disabled = true;
            btn.innerHTML = '<i data-lucide="loader"></i> Calculating...';
            if (window.lucide) window.lucide.createIcons();
        }

        try {
            // Call API to calculate scenarios
            const response = await fetch('/api/scenarios/calculate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ inputs: baseInputs })
            });

            const result = await response.json();
            
            console.log('📊 Scenario calculation result:', result);
            
            if (result.success) {
                // Debug: Log scenario data structure
                Object.entries(result.data || {}).forEach(([key, scenario]) => {
                    const earthData = scenario.results || scenario.earthResults;
                    console.log(`📊 ${key}:`, {
                        name: scenario.name,
                        earthResults: earthData,
                        earthValue: earthData?.enterpriseValueFromEBITDA || earthData?.terminalValue || earthData?.enterpriseValue,
                        marsResults: scenario.marsResults,
                        marsValue: scenario.marsResults?.expectedValue || scenario.marsResults?.adjustedValue
                    });
                });
                this.displayScenarioComparison(result.data);
            } else {
                if (!skipButtonUpdate) alert('Failed to calculate scenarios: ' + result.error);
            }
        } catch (error) {
            console.error('Scenario comparison error:', error);
            if (!skipButtonUpdate) alert('Failed to calculate scenarios');
        } finally {
            if (!skipButtonUpdate && btn) {
                btn.disabled = false;
                btn.innerHTML = originalText;
                if (window.lucide) window.lucide.createIcons();
            }
        }
    }

    displayScenarioComparison(scenarios) {
        const grid = document.getElementById('scenariosComparisonGrid');
        if (!grid) return;

        const formatBillion = (value) => {
            if (value === null || value === undefined) return 'N/A';
            if (value === 0) return '$0.00B';
            // Values are already in billions
            // If >= 1000 billion, display as trillions
            if (value >= 1000) {
                return `$${(value / 1000).toFixed(2)}T`;
            }
            // Otherwise display as billions
            return `$${value.toFixed(2)}B`;
        };

        grid.innerHTML = '';

        // 2030 Earth Only
        if (scenarios.earth2030) {
            const card = document.createElement('div');
            card.className = 'scenario-comparison-card';
            const results = scenarios.earth2030.results;
            // Use enterpriseValueFromEBITDA or terminalValue (EBITDA multiple approach)
            // Values are already in billions
            // Note: calculateEarthValueForScenario returns enterpriseValueFromEBITDA
            const earthValue = results.enterpriseValueFromEBITDA || results.terminalValue || results.enterpriseValue || 0;
            console.log('📊 2030 Earth Only:', {
                earthValue,
                enterpriseValueFromEBITDA: results.enterpriseValueFromEBITDA,
                terminalValue: results.terminalValue,
                enterpriseValue: results.enterpriseValue,
                allKeys: Object.keys(results)
            });
            card.innerHTML = `
                <h4>${scenarios.earth2030.name}</h4>
                <div class="comparison-value">${formatBillion(earthValue)}</div>
                <div class="stat-row">
                    <span>Enterprise Value:</span>
                    <span>${formatBillion(earthValue)}</span>
                </div>
                <div class="stat-row">
                    <span>EBITDA Multiple:</span>
                    <span>18x</span>
                </div>
            `;
            grid.appendChild(card);
        }

        // 2030 Earth & Mars
        if (scenarios.earthMars2030) {
            const card = document.createElement('div');
            card.className = 'scenario-comparison-card';
            const earthResults = scenarios.earthMars2030.earthResults;
            const marsResults = scenarios.earthMars2030.marsResults;
            // Use enterpriseValueFromEBITDA or terminalValue (EBITDA multiple approach)
            // Values are already in billions
            const earthValue = earthResults?.enterpriseValueFromEBITDA || earthResults?.terminalValue || earthResults?.enterpriseValue || 0;
            const marsValue = marsResults?.expectedValue || marsResults?.adjustedValue || 0;
            const total = (earthValue || 0) + (marsValue || 0);
            console.log('📊 2030 Earth & Mars:', {
                earthValue,
                marsValue,
                total,
                earthKeys: earthResults ? Object.keys(earthResults) : 'no earthResults',
                marsKeys: marsResults ? Object.keys(marsResults) : 'no marsResults',
                earthEnterpriseValueFromEBITDA: earthResults?.enterpriseValueFromEBITDA,
                earthTerminalValue: earthResults?.terminalValue,
                marsExpectedValue: marsResults?.expectedValue,
                marsAdjustedValue: marsResults?.adjustedValue
            });
            card.innerHTML = `
                <h4>${scenarios.earthMars2030.name}</h4>
                <div class="comparison-value">${formatBillion(total)}</div>
                <div class="stat-row">
                    <span>Earth Value:</span>
                    <span>${formatBillion(earthValue)}</span>
                </div>
                <div class="stat-row">
                    <span>Mars Value:</span>
                    <span>${formatBillion(marsValue)}</span>
                </div>
            `;
            grid.appendChild(card);
        }

        // 2040 Earth & Mars
        if (scenarios.earthMars2040) {
            const card = document.createElement('div');
            card.className = 'scenario-comparison-card';
            const earthResults = scenarios.earthMars2040.earthResults;
            const marsResults = scenarios.earthMars2040.marsResults;
            // Use enterpriseValueFromEBITDA or terminalValue (EBITDA multiple approach)
            // Values are already in billions
            const earthValue = earthResults?.enterpriseValueFromEBITDA || earthResults?.terminalValue || earthResults?.enterpriseValue || 0;
            const marsValue = marsResults?.expectedValue || marsResults?.adjustedValue || 0;
            const total = (earthValue || 0) + (marsValue || 0);
            console.log('📊 2040 Earth & Mars:', {
                earthValue,
                marsValue,
                total,
                earthKeys: earthResults ? Object.keys(earthResults) : 'no earthResults',
                marsKeys: marsResults ? Object.keys(marsResults) : 'no marsResults',
                earthEnterpriseValueFromEBITDA: earthResults?.enterpriseValueFromEBITDA,
                earthTerminalValue: earthResults?.terminalValue,
                marsExpectedValue: marsResults?.expectedValue,
                marsAdjustedValue: marsResults?.adjustedValue
            });
            card.innerHTML = `
                <h4>${scenarios.earthMars2040.name}</h4>
                <div class="comparison-value">${formatBillion(total)}</div>
                <div class="stat-row">
                    <span>Earth Value:</span>
                    <span>${formatBillion(earthValue)}</span>
                </div>
                <div class="stat-row">
                    <span>Mars Value:</span>
                    <span>${formatBillion(marsValue)}</span>
                </div>
            `;
            grid.appendChild(card);
        }
    }

    // Run Monte Carlo for scenario comparison
    async runScenarioMonteCarloComparison(skipButtonUpdate = false) {
        console.log('🎲 Starting scenario Monte Carlo comparison...');
        
        const btn = document.getElementById('runScenarioMonteCarloBtn');
        if (!btn) {
            console.error('❌ Button not found: runScenarioMonteCarloBtn');
            return;
        }

        const baseInputs = this.getInputs();
        if (!baseInputs) {
            console.error('❌ No inputs available');
            if (!skipButtonUpdate) alert('Please load a model or set inputs first');
            return;
        }

        console.log('✅ Inputs retrieved:', baseInputs);

        const originalText = btn.innerHTML;
        if (!skipButtonUpdate) {
            btn.disabled = true;
            btn.innerHTML = '<i data-lucide="loader"></i> Running...';
            if (window.lucide) window.lucide.createIcons();
        }

        // Show progress modal
        const progressModal = document.getElementById('monteCarloProgressModal');
        if (progressModal && !skipButtonUpdate) {
            const progressText = progressModal.querySelector('.progress-text');
            if (progressText) {
                progressText.textContent = 'Running Monte Carlo for scenario comparison...';
            }
            progressModal.classList.add('active');
        }

        try {
            // Get Monte Carlo config
            const config = this.currentMonteCarloConfig || {
                runs: 5000,
                useCustomDistributions: false,
                distributions: null
            };

            const distributions = config.useCustomDistributions && config.distributions
                ? config.distributions
                : null; // Will use defaults on backend

            console.log('📤 Sending API request:', {
                runs: config.runs || 5000,
                scenarios: ['2030-earth-only', '2040-earth-mars'],
                hasDistributions: !!distributions
            });

            // Run Monte Carlo for scenarios
            const response = await fetch('/api/monte-carlo/scenarios', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    baseInputs: baseInputs,
                    distributions: distributions,
                    runs: config.runs || 5000,
                    scenarios: ['2030-earth-only', '2040-earth-mars']
                })
            });

            console.log('📥 API Response status:', response.status);

            if (!response.ok) {
                const errorText = await response.text();
                console.error('❌ API error response:', errorText);
                throw new Error(`API error: ${response.status} - ${errorText}`);
            }

            const result = await response.json();
            
            console.log('📡 API Response:', result);
            
            if (result.success) {
                console.log('✅ API call successful, displaying chart...');
                console.log('📊 Scenario results keys:', Object.keys(result.data || {}));
                
                // Debug: Log actual values from each scenario
                Object.entries(result.data || {}).forEach(([scenario, data]) => {
                    if (data && data.statistics) {
                        console.log(`📊 ${scenario} statistics:`, {
                            mean: data.statistics.totalValue?.mean,
                            min: data.statistics.totalValue?.min,
                            max: data.statistics.totalValue?.max,
                            distribution: {
                                min: data.statistics.distribution?.min,
                                max: data.statistics.distribution?.max,
                                histogramLength: data.statistics.distribution?.histogram?.length
                            }
                        });
                    }
                });
                
                // Hide progress modal
                const progressModal = document.getElementById('monteCarloProgressModal');
                if (progressModal) {
                    progressModal.classList.remove('active');
                }
                this.displayScenarioDistributionChart(result.data);
            } else {
                console.error('❌ API error:', result.error);
                // Hide progress modal
                const progressModal = document.getElementById('monteCarloProgressModal');
                if (progressModal) {
                    progressModal.classList.remove('active');
                }
                if (!skipButtonUpdate) alert('Failed to run scenario Monte Carlo: ' + result.error);
            }
        } catch (error) {
            console.error('❌ Scenario Monte Carlo error:', error);
            // Hide progress modal
            const progressModal = document.getElementById('monteCarloProgressModal');
            if (progressModal) {
                progressModal.classList.remove('active');
            }
            if (!skipButtonUpdate) alert('Failed to run scenario Monte Carlo comparison: ' + error.message);
        } finally {
            if (!skipButtonUpdate && btn) {
                btn.disabled = false;
                btn.innerHTML = originalText;
                if (window.lucide) window.lucide.createIcons();
            }
        }
    }

    // Display scenario distribution comparison chart
    displayScenarioDistributionChart(scenarioResults) {
        console.log('📊 Displaying scenario distribution chart:', scenarioResults);
        
        const ctx = document.getElementById('scenarioDistributionChart');
        if (!ctx) {
            console.error('❌ Chart canvas not found: scenarioDistributionChart');
            alert('Chart canvas not found. Please refresh the page.');
            return;
        }

        // Validate data
        if (!scenarioResults || Object.keys(scenarioResults).length === 0) {
            console.error('❌ No scenario results provided');
            alert('No scenario results to display');
            return;
        }

        // Destroy existing chart if it exists
        if (this.charts.scenarioDistribution) {
            this.charts.scenarioDistribution.destroy();
        }

        const formatTrillion = (value) => {
            // Value is already in trillions from the API
            return value.toFixed(1);
        };

        // Prepare data for each scenario
        const datasets = [];
        const colors = {
            '2030-earth-only': { bg: 'rgba(0, 102, 204, 0.6)', border: '#0066cc', label: '2030 EV (Earth)' },
            '2040-earth-mars': { bg: 'rgba(239, 68, 68, 0.6)', border: '#ef4444', label: '2040 EV (Earth & Mars)' }
        };

        // Find common x-axis range - show full range from 0 to 30T to see both curves
        let minX = 0;
        let maxX = 30;
        let hasValidData = false;
        
        Object.values(scenarioResults).forEach((result, idx) => {
            if (!result || !result.statistics || !result.statistics.distribution) {
                console.warn(`⚠️ Scenario ${idx} missing statistics or distribution`);
                return;
            }
            const dist = result.statistics.distribution;
            if (dist.min !== undefined && dist.max !== undefined) {
                hasValidData = true;
            }
        });

        // Use full range 0-30T to show both distributions properly
        minX = 0;
        maxX = 30;

        if (!hasValidData) {
            console.error('❌ Invalid data range:', { minX, maxX, hasValidData });
            alert('Invalid data range. Please check the simulation results.');
            return;
        }

        console.log(`📈 Data range: ${minX} to ${maxX}`);

        // Create normalized bins for comparison (use more bins for smoother curves)
        const bins = 100;
        const binSize = (maxX - minX) / bins;
        const binCenters = Array.from({ length: bins }, (_, i) => minX + (i + 0.5) * binSize);

        // Process each scenario
        Object.entries(scenarioResults).forEach(([scenario, result]) => {
            if (!result || !result.statistics || !result.statistics.distribution) {
                console.warn(`⚠️ Skipping scenario ${scenario}: missing data`);
                return;
            }

            const dist = result.statistics.distribution;
            const color = colors[scenario];
            
            if (!color) {
                console.warn(`⚠️ Unknown scenario: ${scenario}`);
                return;
            }

            if (!dist.histogram || !dist.binCenters) {
                console.warn(`⚠️ Scenario ${scenario} missing histogram or binCenters`);
                return;
            }

            // Histogram is already in probability density percentage from API
            const probabilityDensity = dist.histogram;

            // Map to common x-axis bins - use interpolation for smoother curves
            const mappedHistogram = new Array(bins).fill(0);
            dist.binCenters.forEach((center, idx) => {
                // Find which bin(s) this center falls into
                const binIndex = (center - minX) / binSize;
                const lowerBin = Math.floor(binIndex);
                const upperBin = Math.ceil(binIndex);
                const fraction = binIndex - lowerBin;
                
                // Distribute value across bins for smoother interpolation
                if (lowerBin >= 0 && lowerBin < bins) {
                    mappedHistogram[lowerBin] += probabilityDensity[idx] * (1 - fraction);
                }
                if (upperBin >= 0 && upperBin < bins && upperBin !== lowerBin) {
                    mappedHistogram[upperBin] += probabilityDensity[idx] * fraction;
                }
            });


            // Only add if there's actual data
            const maxValue = Math.max(...mappedHistogram);
            if (maxValue > 0) {
                datasets.push({
                    label: color.label,
                    data: mappedHistogram,
                    backgroundColor: color.bg,
                    borderColor: color.border,
                    borderWidth: 2,
                    fill: true,
                    tension: 0.4, // Smooth curve
                    pointRadius: 0,
                    yAxisID: 'y' // Use same y-axis
                });
                
                console.log(`✅ Added dataset for ${scenario}:`, {
                    label: color.label,
                    maxValue: maxValue,
                    nonZeroBins: mappedHistogram.filter(v => v > 0).length,
                    color: color.border
                });
            } else {
                console.warn(`⚠️ Skipping ${scenario}: no data points above zero`);
            }
        });

        if (datasets.length === 0) {
            console.error('❌ No valid datasets created');
            alert('No valid data to display. Please check the simulation results.');
            return;
        }

        console.log(`📊 Creating chart with ${datasets.length} datasets`);

        try {
            this.charts.scenarioDistribution = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: binCenters.map(v => `$${formatTrillion(v)}T`),
                    datasets: datasets
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        title: {
                            display: true,
                            text: 'Monte Carlo Distribution Comparison: 2030 vs 2040'
                        },
                        legend: {
                            display: true,
                            position: 'bottom'
                        },
                        tooltip: {
                            callbacks: {
                                label: function(context) {
                                    return `${context.dataset.label}: ${context.parsed.y.toFixed(2)}%`;
                                }
                            }
                        }
                    },
                    scales: {
                        y: {
                            title: {
                                display: true,
                                text: 'Probability Density (%)'
                            },
                            beginAtZero: true,
                            max: 20,
                            ticks: {
                                stepSize: 5,
                                callback: function(value) {
                                    return value + '%';
                                }
                            },
                            grid: {
                                color: 'rgba(255, 255, 255, 0.1)'
                            }
                        },
                        x: {
                            title: {
                                display: true,
                                text: 'Enterprise Value ($T)'
                            },
                            min: 0,
                            max: 30, // Show 0-30T range to see full 2040 tail
                            ticks: {
                                stepSize: 5,
                                callback: function(value) {
                                    return '$' + value.toFixed(1) + 'T';
                                }
                            }
                        }
                    }
                }
            });
            console.log('✅ Chart created successfully');
        } catch (error) {
            console.error('❌ Chart creation error:', error);
            alert('Failed to create chart: ' + error.message);
        }
    }

    // Auto-load last model on startup
    async autoLoadFirstModel() {
        try {
            console.log('📦 Loading last loaded model from application state...');
            
            // Get last loaded model ID from application state
            const stateResponse = await fetch('/api/app-state/lastModelId');
            const stateResult = await stateResponse.json();
            
            if (stateResult.success && stateResult.data) {
                const lastModelId = stateResult.data;
                console.log('✅ Found last loaded model ID:', lastModelId);
                
                // Try to load the last model
                try {
                    await this.loadModel(lastModelId, true);
                    console.log('✅ Loaded last model successfully');
                    return;
                } catch (loadError) {
                    console.warn('⚠️ Failed to load last model, trying to find it:', loadError);
                    // Model might have been deleted, fall through to find another
                }
            }
            
            // Fallback: Load baseline model if no last model found
            console.log('📦 No last model found, loading baseline model...');
            try {
                const baselineResponse = await fetch('/api/models/baseline');
                const baselineResult = await baselineResponse.json();
                
                if (baselineResult.success && baselineResult.data) {
                    console.log('✅ Found baseline model:', baselineResult.data.name);
                    await this.loadModel(baselineResult.data._id, true);
                    return;
                } else {
                    console.log('⚠️ Baseline model not found:', baselineResult.error || 'Unknown error');
                }
            } catch (baselineError) {
                console.warn('⚠️ Failed to fetch baseline model:', baselineError);
            }
            
            // If baseline fetch failed, try loading first available model
            {
                // Last fallback: Load first available model
                console.log('📦 No baseline found, loading first available model...');
                const response = await fetch('/api/models?limit=1&sortBy=createdAt&sortOrder=desc');
                const result = await response.json();
                
                if (result.success && result.data && result.data.length > 0) {
                    const firstModel = result.data[0];
                    console.log('✅ Found first model:', firstModel.name);
                    await this.loadModel(firstModel._id, true);
                } else {
                    console.log('ℹ️ No models found - starting with empty inputs');
                }
            }
        } catch (error) {
            console.error('❌ Failed to auto-load model:', error);
            // Continue without auto-loading if it fails
        }
    }
    
    // Save application state
    async saveAppState(key, value) {
        try {
            await fetch(`/api/app-state/${key}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ value })
            });
            console.log(`✅ Saved app state: ${key}`);
        } catch (error) {
            console.warn(`⚠️ Failed to save app state ${key}:`, error);
        }
    }
    
    // Get application state
    async getAppState(key) {
        try {
            const response = await fetch(`/api/app-state/${key}`);
            const result = await response.json();
            if (result.success) {
                return result.data;
            }
        } catch (error) {
            console.warn(`⚠️ Failed to get app state ${key}:`, error);
        }
        return null;
    }

    // Model Management
    async loadModels(page = 1) {
        try {
            const search = document.getElementById('modelSearch')?.value || '';
            const sort = document.getElementById('modelSort')?.value.split('-') || ['createdAt', 'desc'];
            const favoriteOnly = document.getElementById('showFavoritesOnly')?.checked || false;

            const params = new URLSearchParams({
                page: page.toString(),
                limit: '12',
                sortBy: sort[0],
                sortOrder: sort[1],
                type: 'model' // Only load models, not scenarios
                // Note: Removed isBaseline filter - we want to show ALL models, not just baseline ones
            });

            if (search) params.append('search', search);
            if (favoriteOnly) params.append('favorite', 'true');

            const url = `/api/models?${params}`;
            console.log('📊 Loading models with filter:', url);
            const response = await fetch(url);
            const result = await response.json();

            if (result.success) {
                this.renderModels(result.data);
                this.renderPagination(result.pagination || { pages: 1, total: 0 }, page);
            } else {
                console.error('API error:', result.error);
                const grid = document.getElementById('modelsGrid');
                if (grid) {
                    grid.innerHTML = `<div class="empty-state">Error loading models: ${result.error || 'Unknown error'}</div>`;
                }
            }
        } catch (error) {
            console.error('Failed to load models:', error);
            const grid = document.getElementById('modelsGrid');
            if (grid) {
                grid.innerHTML = `<div class="empty-state">Failed to load models. Check console for details.<br>Error: ${error.message}</div>`;
            }
        }
    }

    switchScenarioTab(tabName) {
        // Hide all tab contents
        document.querySelectorAll('.models-tab-content').forEach(tab => {
            tab.classList.remove('active');
        });
        
        // Remove active class from all tabs
        document.querySelectorAll('.models-tab').forEach(tab => {
            tab.classList.remove('active');
        });
        
        // Show selected tab content
        const tabContent = document.getElementById(tabName);
        if (tabContent) {
            tabContent.classList.add('active');
        }
        
        // Add active class to clicked tab
        const tabBtn = document.querySelector(`[data-tab="${tabName}"]`);
        if (tabBtn) {
            tabBtn.classList.add('active');
        }
        
        // Load scenarios if switching to saved scenarios tab
        if (tabName === 'saved-scenarios-tab') {
            this.loadScenarios();
        }
        
        // Refresh icons
        if (window.lucide) window.lucide.createIcons();
    }

    async loadScenarios(page = 1) {
        try {
            const search = document.getElementById('scenarioSearch')?.value || '';
            const sort = document.getElementById('scenarioSort')?.value.split('-') || ['createdAt', 'desc'];
            const favoriteOnly = document.getElementById('showFavoritesOnlyScenarios')?.checked || false;

            const params = new URLSearchParams({
                page: page.toString(),
                limit: '12',
                sortBy: sort[0],
                sortOrder: sort[1],
                type: 'scenario' // Only load scenarios
            });

            if (search) params.append('search', search);
            if (favoriteOnly) params.append('favorite', 'true');

            const response = await fetch(`/api/models?${params}`);
            const result = await response.json();

            if (result.success) {
                this.renderModels(result.data, 'savedScenariosGrid');
                this.renderPagination(result.pagination || { pages: 1, total: 0 }, page, 'scenariosPagination');
            } else {
                console.error('API error:', result.error);
                const grid = document.getElementById('savedScenariosGrid');
                if (grid) {
                    grid.innerHTML = `<div class="empty-state">Error loading scenarios: ${result.error || 'Unknown error'}</div>`;
                }
            }
        } catch (error) {
            console.error('Failed to load scenarios:', error);
            const grid = document.getElementById('savedScenariosGrid');
            if (grid) {
                grid.innerHTML = `<div class="empty-state">Failed to load scenarios. Check console for details.<br>Error: ${error.message}</div>`;
            }
        }
    }

    renderModels(models, gridId = 'modelsGrid') {
        const grid = document.getElementById(gridId);
        if (!grid) return;

        grid.innerHTML = '';

        if (models.length === 0) {
            const isScenariosGrid = gridId === 'savedScenariosGrid';
            const message = isScenariosGrid 
                ? 'No scenarios found. Create your first scenario by calculating a valuation and saving it as a scenario.'
                : 'No models found. Create your first model by calculating a valuation and saving it.';
            grid.innerHTML = `<div class="empty-state">${message}</div>`;
            return;
        }

        models.forEach(model => {
            const isActive = model._id === this.currentModelId;
            const card = document.createElement('div');
            card.className = `model-card ${model.isFavorite ? 'favorite' : ''} ${isActive ? 'active' : ''}`;
            
            const tagsHtml = model.tags && model.tags.length > 0
                ? `<div class="model-tags">${model.tags.map(tag => `<span class="tag">${tag}</span>`).join('')}</div>`
                : '';

            card.innerHTML = `
                <div class="model-header">
                    <div>
                        <div class="model-name">
                            ${model.name}
                            ${isActive ? '<span class="current-model-badge">Current</span>' : ''}
                        </div>
                        <div class="model-description">${model.description || 'No description'}</div>
                    </div>
                    <button class="btn-icon favorite-btn ${model.isFavorite ? 'active' : ''}" 
                            onclick="app.toggleFavorite('${model._id}', ${!model.isFavorite})" 
                            title="${model.isFavorite ? 'Remove from favorites' : 'Add to favorites'}">
                        <i data-lucide="star"></i>
                    </button>
                </div>
                ${tagsHtml}
                <div class="model-value">${(() => {
                    // Check if model has results, if not or if value seems outdated (too low), show "Recalculate"
                    const value = model.results?.total?.value;
                    if (!value && value !== 0) return '<span style="color: #888;">N/A</span>';
                    
                    // If value is less than $500B, it's likely from old calculation logic
                    // Show it but indicate it may need recalculation
                    if (value < 500) {
                        return '<span style="color: #f59e0b;" title="Value may need recalculation">$' + value.toFixed(1) + 'B</span>';
                    }
                    
                    // Values are stored in billions
                    // If value >= 1000, it means >= 1000 billions = 1 trillion
                    if (value >= 1000) {
                        // Convert billions to trillions (divide by 1000)
                        return '$' + (value / 1000).toFixed(1) + 'T';
                    } else {
                        // Already in billions
                        return '$' + value.toFixed(1) + 'B';
                    }
                })()}</div>
                <div class="model-meta">
                    <span><i data-lucide="calendar"></i> ${new Date(model.createdAt).toLocaleDateString()}</span>
                    <span><i data-lucide="refresh-cw"></i> v${model.version}</span>
                    ${model.simulationCount > 0 ? `<span><i data-lucide="dice-6"></i> ${model.simulationCount} simulation${model.simulationCount !== 1 ? 's' : ''}</span>` : ''}
                </div>
                <div class="model-actions">
                    <button class="btn btn-primary btn-sm" onclick="app.loadModel('${model._id}')">
                        <i data-lucide="folder-open"></i> Load
                    </button>
                    <button class="btn btn-secondary btn-sm" onclick="app.editModel('${model._id}')">
                        <i data-lucide="edit"></i> Edit
                    </button>
                    <button class="btn btn-secondary btn-sm" onclick="app.duplicateModel('${model._id}')">
                        <i data-lucide="copy"></i> Duplicate
                    </button>
                </div>
            `;
            grid.appendChild(card);
        });

        lucide.createIcons();
    }

    renderPagination(pagination, currentPage, paginationId = 'modelsPagination') {
        const paginationEl = document.getElementById(paginationId);
        if (!paginationEl) return;

        if (pagination.pages <= 1) {
            paginationEl.innerHTML = '';
            return;
        }

        let html = '';
        const isScenarios = paginationId === 'scenariosPagination';
        const loadFunction = isScenarios ? 'loadScenarios' : 'loadModels';
        
        if (currentPage > 1) {
            html += `<button onclick="app.${loadFunction}(${currentPage - 1})">Previous</button>`;
        }

        html += `<span class="page-info">Page ${currentPage} of ${pagination.pages || pagination.totalPages || 1}</span>`;

        if (currentPage < (pagination.pages || pagination.totalPages || 1)) {
            html += `<button onclick="app.${loadFunction}(${currentPage + 1})">Next</button>`;
        }

        paginationEl.innerHTML = html;
    }

    openSaveModelModal(modelType = 'model') {
        // Store the model type for when saving
        this.pendingModelType = modelType;
        
        // Clear form fields
        const nameField = document.getElementById('saveModelName');
        const descField = document.getElementById('saveModelDescription');
        const tagsField = document.getElementById('saveModelTags');
        const favoriteField = document.getElementById('saveModelFavorite');
        
        if (nameField) nameField.value = '';
        if (descField) descField.value = '';
        if (tagsField) tagsField.value = '';
        if (favoriteField) favoriteField.checked = false;
        
        // Show modal
        const modal = document.getElementById('saveModelModal');
        if (modal) {
            modal.classList.add('active');
            if (window.lucide) window.lucide.createIcons();
        } else {
            console.error('Save model modal not found in DOM');
            alert('Error: Save model modal not found. Please refresh the page.');
        }
    }

    async saveModel(updateResults = true) {
        const name = document.getElementById('saveModelName').value.trim();
        if (!name) {
            alert('Please enter a model name');
            return;
        }

        const description = document.getElementById('saveModelDescription').value.trim();
        const tags = document.getElementById('saveModelTags').value.split(',').map(t => t.trim()).filter(t => t);
        const isFavorite = document.getElementById('saveModelFavorite').checked;

        const inputs = this.getInputs();
        
        // Get Monte Carlo configuration from current config (or defaults)
        const monteCarloConfig = this.currentMonteCarloConfig || {
            runs: 5000,
            useCustomDistributions: false,
            distributions: null
        };

        // Use pendingModelType if set (from Add Model/Add Scenario button), otherwise default to 'model'
        const modelType = this.pendingModelType || 'model';
        
        // Clear pending type
        this.pendingModelType = null;

        // Build request body - include results if available
        const requestBody = {
            name,
            description,
            inputs,
            tags,
            favorite: isFavorite, // Note: API expects 'favorite' not 'isFavorite'
            monteCarloConfig,
            type: modelType
        };
        
        // Include results if available (valuation has been calculated)
        if (this.currentData) {
            requestBody.results = this.currentData;
        }

        try {
            const response = await fetch('/api/models', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(requestBody)
            });

            const result = await response.json();
            if (result.success) {
                const modal = document.getElementById('saveModelModal');
                if (modal) modal.classList.remove('active');
                
                // Show success message with context
                const hasResults = !!this.currentData;
                const successMsg = modelType === 'scenario' 
                    ? 'Scenario saved successfully!' 
                    : hasResults 
                        ? 'Model saved successfully with current inputs and valuation results!'
                        : 'Model saved successfully with current inputs! Run a valuation to add results.';
                
                alert(successMsg);
                
                // Reload models list if in models view
                if (this.currentView === 'models') {
                    this.loadModels();
                } else if (this.currentView === 'scenarios') {
                    // If we're in scenarios view and saved a scenario, reload scenarios
                    const activeTab = document.querySelector('.models-tab-content.active')?.id;
                    if (activeTab === 'saved-scenarios-tab') {
                        this.loadScenarios();
                    }
                }
                
                // If we saved a new model and have results, optionally load it
                if (result.data && result.data._id && hasResults) {
                    // Optionally auto-load the newly saved model
                    // Uncomment if desired: await this.loadModel(result.data._id, true);
                }
            } else {
                alert('Error: ' + (result.error || 'Failed to save model'));
            }
        } catch (error) {
            console.error('Save error:', error);
            alert('Failed to save model');
        }
    }

    async loadModel(id, silent = false) {
        const previousModelId = this.currentModelId;
        this.currentModelId = id; // Store current model ID for saving simulations
        
        // Save last loaded model ID to application state
        await this.saveAppState('lastModelId', id);
        
        try {
            const response = await fetch(`/api/models/${id}`);
            const result = await response.json();

            if (result.success) {
                const model = result.data;

                // Load inputs into form
                if (model.inputs.earth) {
                    document.getElementById('starlinkPenetration').value = model.inputs.earth.starlinkPenetration;
                    document.getElementById('bandwidthPriceDecline').value = model.inputs.earth.bandwidthPriceDecline;
                    document.getElementById('launchVolume').value = model.inputs.earth.launchVolume;
                    document.getElementById('launchPriceDecline').value = model.inputs.earth.launchPriceDecline;
                }

                if (model.inputs.mars) {
                    document.getElementById('firstColonyYear').value = model.inputs.mars.firstColonyYear;
                    document.getElementById('transportCostDecline').value = model.inputs.mars.transportCostDecline;
                    document.getElementById('populationGrowth').value = model.inputs.mars.populationGrowth;
                    document.getElementById('industrialBootstrap').checked = model.inputs.mars.industrialBootstrap;
                }

                if (model.inputs.financial) {
                    document.getElementById('discountRate').value = model.inputs.financial.discountRate;
                    document.getElementById('dilutionFactor').value = model.inputs.financial.dilutionFactor;
                    document.getElementById('terminalGrowth').value = model.inputs.financial.terminalGrowth;
                }

                // Load Monte Carlo configuration if it exists
                if (model.monteCarloConfig) {
                    // Store config for use in auto-simulations
                    this.currentMonteCarloConfig = model.monteCarloConfig;
                    // Display configuration
                    this.displayMonteCarloConfig(model.monteCarloConfig, true);
                } else {
                    // Use defaults if no config saved
                    this.currentMonteCarloConfig = {
                        runs: 5000,
                        useCustomDistributions: false,
                        distributions: null
                    };
                    // Display default configuration
                    this.displayMonteCarloConfig(null, false);
                }

                // Store model name for dashboard title
                const previousModelName = this.currentModelName;
                this.currentModelName = model.name;

                // Detect model change
                if (previousModelId && previousModelId !== id) {
                    this.detectAndCommentOnContextChange({
                        type: 'model_change',
                        previousModelId: previousModelId,
                        previousModelName: previousModelName,
                        newModelId: id,
                        newModelName: model.name
                    });
                }

                // Clear cached AI insights when switching models
                if (previousModelId && previousModelId !== id) {
                    console.log('🔄 Switched models - clearing cached AI insights');
                    delete this.cachedAIInsights[previousModelId];
                    delete this.cachedTerminalInsights[previousModelId];
                }
                // Clear insights cache for current model to force regeneration
                delete this.cachedAIInsights[id];
                // Clear terminal insights cache for current model
                delete this.cachedTerminalInsights[id];
                
                // Insights will be refreshed when model loads and data is available
                // This happens in loadTerminalInsightsAfterModelLoad() which is called after Monte Carlo

                // Clear any previous model's simulations when switching models
                if (previousModelId && previousModelId !== id) {
                    console.log('🔄 Switched models - clearing previous model simulations');
                    this.latestSimulation = null;
                    this.simulationsNeedRerun = false;
                }

                // Load simulations if they exist and are valid FOR THIS MODEL
                // IMPORTANT: Compare AFTER form inputs are loaded (getInputs() reads from form)
                if (model.simulationCount > 0) {
                    try {
                        const simResponse = await fetch(`/api/monte-carlo?valuationModelId=${id}&limit=1`);
                        const simResult = await simResponse.json();
                        
                        if (simResult.success && simResult.data.length > 0) {
                            const latestSim = simResult.data[0];
                            
                            // Get CURRENT form inputs (after they've been loaded into form above)
                            const currentFormInputs = this.getInputs();
                            
                            // Compare CURRENT form inputs with simulation's baseInputs
                            const inputsMatch = this.inputsMatch(currentFormInputs, latestSim.baseInputs);
                            
                            console.log('🔍 Comparing inputs:');
                            console.log('  Current form inputs:', currentFormInputs);
                            console.log('  Simulation baseInputs:', latestSim.baseInputs);
                            console.log('  Match:', inputsMatch);
                            
                            if (inputsMatch) {
                                console.log(`✅ Model "${model.name}" has ${model.simulationCount} valid simulation(s)`);
                                // Store latest simulation for potential display
                                this.latestSimulation = latestSim;
                                this.simulationsNeedRerun = false;
                                
                                // Auto-run simulation if inputs match (to ensure fresh results)
                                setTimeout(() => {
                                    this.autoRunMonteCarloIfNeeded('model-load');
                                    this.autoRunVaRIfNeeded('model-load');
                                    this.autoRunAttributionIfNeeded('model-load');
                                }, 500);
                            } else {
                                console.warn(`⚠️ Model "${model.name}" inputs have changed - existing simulations are outdated`);
                                console.warn('  Differences detected - simulations need rerun');
                                // Clear any cached simulation
                                this.latestSimulation = null;
                                // Store flag that simulations need rerun
                                this.simulationsNeedRerun = true;
                                
                                // Auto-run simulation with new inputs
                                setTimeout(() => {
                                    this.autoRunMonteCarloIfNeeded('model-change');
                                    this.autoRunVaRIfNeeded('model-change');
                                    this.autoRunAttributionIfNeeded('model-change');
                                }, 1000);
                            }
                        }
                    } catch (error) {
                        console.warn('Could not load simulations:', error);
                        this.simulationsNeedRerun = false;
                        this.latestSimulation = null;
                        
                        // If no simulations exist, auto-run
                        setTimeout(() => {
                            this.autoRunMonteCarloIfNeeded('model-load-no-sims');
                            this.autoRunVaRIfNeeded('model-load-no-sims');
                            this.autoRunAttributionIfNeeded('model-load-no-sims');
                        }, 500);
                    }
                } else {
                    console.log(`ℹ️ Model "${model.name}" has no simulations - auto-running simulation`);
                    this.simulationsNeedRerun = false;
                    this.latestSimulation = null;
                    
                    // Auto-run simulation for new model
                    setTimeout(() => {
                        this.autoRunMonteCarloIfNeeded('model-load-no-sims');
                        this.autoRunVaRIfNeeded('model-load-no-sims');
                        this.autoRunAttributionIfNeeded('model-load-no-sims');
                    }, 1000);
                }

                // Automatically trigger Monte Carlo simulation (deterministic is disabled)
                console.log('Model loaded. Triggering Monte Carlo simulation...');
                // Don't call calculateValuation - it will trigger Monte Carlo automatically
                // But we need to wait for Monte Carlo to complete before updating dashboard
                this.updateDashboardTitle(model.name);

                // Switch to dashboard view
                this.switchView('dashboard');

                // Save inputs to local storage
                this.saveInputs();

                // Trigger terminal insights load after model change
                this.loadTerminalInsightsAfterModelLoad();

                // Force UI refresh
                setTimeout(() => {
                    if (window.lucide) window.lucide.createIcons();
                    // Don't update dashboard with currentData - wait for Monte Carlo
                    // Dashboard will show "--" until Monte Carlo completes
                    console.log('⏸️ Dashboard will update after Monte Carlo simulation completes');
                    
                    // Show success notification modal AFTER UI refresh (unless silent)
                    if (!silent) {
                        // Check flag again to ensure it's set correctly
                        let notificationMessage = `Model "${model.name}" loaded successfully!`;
                        if (this.simulationsNeedRerun) {
                            notificationMessage += '\n\n⚠️ Parameters have changed. New Monte Carlo simulations are recommended.';
                            console.log('🔔 Showing notification with Monte Carlo note - simulationsNeedRerun:', this.simulationsNeedRerun);
                        } else {
                            console.log('✅ Showing notification without Monte Carlo note - simulationsNeedRerun:', this.simulationsNeedRerun);
                        }
                        this.showNotification('Success', notificationMessage, 'success');
                    } else {
                        console.log('✅ Model loaded silently:', model.name);
                    }
                }, 500); // Increased delay to ensure comparison completes
            } else {
                this.showNotification('Error', result.error, 'error');
            }
        } catch (error) {
            console.error('Load error:', error);
            this.showNotification('Error', 'Failed to load model', 'error');
        }
    }

    async toggleFavorite(id, isFavorite) {
        try {
            const response = await fetch(`/api/models/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ isFavorite })
            });

            if (response.ok) {
                this.loadModels();
            }
        } catch (error) {
            console.error('Toggle favorite error:', error);
        }
    }

    async duplicateModel(id) {
        try {
            const response = await fetch(`/api/models/${id}/duplicate`, {
                method: 'POST'
            });

            const result = await response.json();
            if (result.success) {
                alert('Model duplicated successfully!');
                this.loadModels();
            }
        } catch (error) {
            console.error('Duplicate error:', error);
            alert('Failed to duplicate model');
        }
    }

    async editModel(id) {
        try {
            // Fetch model data
            const response = await fetch(`/api/models/${id}`);
            const result = await response.json();
            
            if (!result.success) {
                alert('Error loading model: ' + result.error);
                return;
            }
            
            const model = result.data;
            this.editingModelId = id;
            
            // Populate form fields
            document.getElementById('editModelName').value = model.name || '';
            document.getElementById('editModelDescription').value = model.description || '';
            document.getElementById('editModelTags').value = model.tags && model.tags.length > 0 ? model.tags.join(', ') : '';
            document.getElementById('editModelFavorite').checked = model.favorite || false;
            document.getElementById('editModelBaseline').checked = model.isBaseline || false;
            
            // Show baseline checkbox only for models (not scenarios)
            const baselineGroup = document.getElementById('editModelBaselineGroup');
            if (baselineGroup) {
                baselineGroup.style.display = model.type === 'model' ? 'block' : 'none';
            }
            
            // Show modal
            const modal = document.getElementById('editModelModal');
            if (modal) {
                modal.classList.add('active');
                if (window.lucide) window.lucide.createIcons();
            }
        } catch (error) {
            console.error('Error loading model for edit:', error);
            alert('Failed to load model for editing');
        }
    }
    
    async updateModel() {
        const id = this.editingModelId;
        if (!id) {
            alert('No model selected for editing');
            return;
        }
        
        const name = document.getElementById('editModelName').value.trim();
        if (!name) {
            alert('Please enter a model name');
            return;
        }
        
        const description = document.getElementById('editModelDescription').value.trim();
        const tags = document.getElementById('editModelTags').value.split(',').map(t => t.trim()).filter(t => t);
        const favorite = document.getElementById('editModelFavorite').checked;
        const isBaseline = document.getElementById('editModelBaseline').checked;
        
        try {
            const response = await fetch(`/api/models/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name,
                    description,
                    tags,
                    favorite,
                    isBaseline
                })
            });
            
            const result = await response.json();
            if (result.success) {
                const modal = document.getElementById('editModelModal');
                if (modal) modal.classList.remove('active');
                this.editingModelId = null;
                
                // Show success message
                alert('Model updated successfully!');
                
                // Reload models list
                if (this.currentView === 'models') {
                    this.loadModels();
                }
                
                // Update current model name if this is the active model
                if (id === this.currentModelId) {
                    this.currentModelName = name;
                }
            } else {
                alert('Error: ' + (result.error || 'Failed to update model'));
            }
        } catch (error) {
            console.error('Update error:', error);
            alert('Failed to update model');
        }
    }
    
    confirmDeleteModel(id) {
        const modelName = document.getElementById('editModelName').value || 'this model';
        if (!confirm(`Are you sure you want to delete "${modelName}"?\n\nThis action cannot be undone.`)) {
            return;
        }
        
        // Close edit modal first
        const modal = document.getElementById('editModelModal');
        if (modal) modal.classList.remove('active');
        this.editingModelId = null;
        
        // Delete the model
        this.deleteModel(id);
    }
    
    async deleteModel(id) {
        try {
            const response = await fetch(`/api/models/${id}`, {
                method: 'DELETE'
            });

            const result = await response.json();
            if (result.success) {
                // If we deleted the currently loaded model, clear it
                if (id === this.currentModelId) {
                    this.currentModelId = null;
                    this.currentModelName = null;
                    this.currentData = null;
                }
                
                // Reload models list
                this.loadModels();
                alert('Model deleted successfully');
            } else {
                alert('Error: ' + result.error);
            }
        } catch (error) {
            console.error('Delete error:', error);
            alert('Failed to delete model');
        }
    }

    // AI Features
    async toggleAIInsights() {
        const section = document.getElementById('aiInsightsSection');
        if (section.style.display === 'none') {
            section.style.display = 'block';
            if (!this.aiInsightsGenerated) {
                await this.generateAIInsights();
            }
        } else {
            section.style.display = 'none';
        }
    }

    async generateAndCacheAIInsights(data) {
        if (!this.currentModelId || !data) return;
        
        // Check if already cached
        if (this.cachedAIInsights[this.currentModelId]) {
            console.log('✅ Using cached AI insights for model:', this.currentModelName);
            return;
        }

        // Prevent duplicate generation
        if (this.generatingAIInsights) {
            console.log('⏸️ AI insights generation already in progress');
            return;
        }

        this.generatingAIInsights = true;
        console.log('🤖 Generating AI insights in background for model:', this.currentModelName);

        try {
            const inputs = this.getInputs();
            
            // Cache the data structure (insights are generated on-demand when views are displayed)
            this.cachedAIInsights[this.currentModelId] = {
                data,
                inputs,
                timestamp: Date.now()
            };

            console.log('✅ AI insights data cached successfully for model:', this.currentModelName);
        } catch (error) {
            console.error('Error generating and caching AI insights:', error);
        } finally {
            this.generatingAIInsights = false;
        }
    }

    async generateAIInsights() {
        if (!this.currentData) {
            alert('Please calculate a valuation first');
            return;
        }

        const insightsContent = document.getElementById('aiInsightsContent');
        insightsContent.innerHTML = '<div class="loading-state">Generating AI insights...</div>';

        const inputs = this.getInputs();

        try {
            // Generate multiple insights in parallel
            const [analysis, summary] = await Promise.all([
                fetch('/api/ai/analyze', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ valuationData: this.currentData, inputs })
                }).then(r => r.json()),
                fetch('/api/ai/summary', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ valuationData: this.currentData, inputs })
                }).then(r => r.json())
            ]);

            let html = '';

            if (summary.success) {
                html += `
                    <div class="ai-insight-card">
                        <h5><i data-lucide="file-text"></i> Executive Summary</h5>
                        <p>${summary.data.summary.replace(/\n/g, '<br>')}</p>
                    </div>
                `;
            }

            if (analysis.success) {
                html += `
                    <div class="ai-insight-card">
                        <h5><i data-lucide="brain"></i> Detailed Analysis</h5>
                        <div class="ai-content">${analysis.data.analysis.replace(/\n/g, '<br>')}</div>
                    </div>
                `;
            }

            insightsContent.innerHTML = html || '<div class="empty-state">Failed to generate insights</div>';
            this.aiInsightsGenerated = true;
            lucide.createIcons();
        } catch (error) {
            console.error('AI insights error:', error);
            insightsContent.innerHTML = '<div class="empty-state">Error generating insights. Please check your AI API configuration.</div>';
        }
    }

    async generateScenarioRecommendations() {
        if (!this.currentData) {
            alert('Please calculate a valuation first');
            return;
        }

        const inputs = this.getInputs();

        try {
            const response = await fetch('/api/ai/scenarios/recommend', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    currentInputs: inputs,
                    valuationResults: this.currentData
                })
            });

            const result = await response.json();
            if (result.success) {
                // Parse and display recommendations
                const recommendations = result.data.recommendations;
                console.log('AI Scenario Recommendations:', recommendations);
                // Could integrate this into the scenarios view
                return recommendations;
            }
        } catch (error) {
            console.error('Scenario recommendations error:', error);
        }
    }

    async updateMarginEvolutionChart(earthData) {
        const ctx = document.getElementById('marginEvolutionChart');
        if (!ctx) {
            console.warn('Margin evolution chart canvas not found');
            return;
        }

        // Check if we have detailed revenue data (from full calculation)
        // Monte Carlo results only have summary values, not detailed arrays
        let useSyntheticData = false;
        if (!earthData || !earthData.revenue || !Array.isArray(earthData.revenue) || earthData.revenue.length === 0) {
            // If we only have summary data (Monte Carlo), generate synthetic data
            if (earthData && (earthData.adjustedValue || earthData.terminalValue)) {
                console.info('Margin evolution chart: Generating synthetic data from summary values');
                useSyntheticData = true;
            } else {
                console.warn('Margin evolution chart: No earth data available', earthData);
                return;
            }
        }

        try {
            let margins;
            
            if (useSyntheticData) {
                // Generate synthetic margin data from summary values
                const baseRevenue = earthData.adjustedValue ? earthData.adjustedValue * 1.2 : 150;
                const currentYear = new Date().getFullYear();
                margins = [];
                
                for (let i = 0; i < 7; i++) {
                    const year = currentYear + i;
                    if (year <= 2030) {
                        const growthFactor = Math.pow(1.15, i);
                        const yearRevenue = baseRevenue * growthFactor;
                        const yearCosts = yearRevenue * 0.07 * Math.pow(0.95, i); // Costs decline as % of revenue
                        const yearEBITDA = yearRevenue - yearCosts;
                        const yearFCF = yearEBITDA * 0.85; // Assume 15% capex
                        
                        margins.push({
                            year: year,
                            ebitdaMargin: (yearEBITDA / yearRevenue) * 100,
                            fcfMargin: (yearFCF / yearRevenue) * 100
                        });
                    }
                }
            } else {
                console.log('Updating margin evolution chart with data:', earthData);
                const response = await fetch('/api/insights/margin-evolution', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ earthResults: earthData })
                });
                const result = await response.json();
                if (!result.success) {
                    console.error('Margin evolution API error:', result.error);
                    return;
                }
                margins = result.data;
            }

            const years = margins.map(m => m.year);
            const ebitdaMargins = margins.map(m => m.ebitdaMargin);
            const fcfMargins = margins.map(m => m.fcfMargin);

            if (this.charts.marginEvolution) {
                this.charts.marginEvolution.destroy();
            }

            this.charts.marginEvolution = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: years,
                    datasets: [{
                        label: 'EBITDA Margin (%)',
                        data: ebitdaMargins,
                        borderColor: '#0066cc',
                        backgroundColor: 'rgba(0, 102, 204, 0.1)',
                        tension: 0.1
                    }, {
                        label: 'FCF Margin (%)',
                        data: fcfMargins,
                        borderColor: '#10b981',
                        backgroundColor: 'rgba(16, 185, 129, 0.1)',
                        tension: 0.1
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        y: {
                            beginAtZero: true,
                            title: { display: true, text: 'Margin (%)' }
                        }
                    }
                }
            });
        } catch (error) {
            console.error('Margin evolution chart error:', error);
        }
    }

    async updateUnitEconomicsChart(earthData) {
        const ctx = document.getElementById('unitEconomicsChart');
        if (!ctx) {
            console.warn('Unit economics chart canvas not found');
            return;
        }

        // Check if we have detailed revenue data (from full calculation)
        // Monte Carlo results only have summary values, not detailed arrays
        let useSyntheticData = false;
        if (!earthData || !earthData.revenue || !Array.isArray(earthData.revenue) || earthData.revenue.length === 0) {
            // If we only have summary data (Monte Carlo), generate synthetic data
            if (earthData && (earthData.adjustedValue || earthData.terminalValue)) {
                console.info('Unit economics chart: Generating synthetic data from summary values');
                useSyntheticData = true;
            } else {
                console.warn('Unit economics chart: No earth data available', earthData);
                return;
            }
        }

        try {
            let metrics;
            
            if (useSyntheticData) {
                // Generate synthetic unit economics data from summary values
                const baseRevenue = earthData.adjustedValue ? earthData.adjustedValue * 1.2 : 150;
                const inputs = this.getInputs();
                const currentYear = new Date().getFullYear();
                metrics = [];
                
                for (let i = 0; i < 7; i++) {
                    const year = currentYear + i;
                    if (year <= 2030) {
                        const growthFactor = Math.pow(1.15, i);
                        const yearRevenue = baseRevenue * growthFactor;
                        const satellites = 10000 + (i * 2000); // Growing satellite count
                        const bandwidth = this.calculateBandwidthCapacity(i, inputs.earth);
                        const launches = this.calculateLaunchVolume(i, inputs.earth);
                        
                        metrics.push({
                            year: year,
                            revenuePerSatellite: (yearRevenue * 1000) / satellites, // Convert to millions
                            revenuePerGbps: (yearRevenue * 1000) / bandwidth, // Convert to millions
                            costPerLaunch: this.calculateLaunchPrice(i, inputs.earth) // Already in millions
                        });
                    }
                }
            } else {
                console.log('Updating unit economics chart with data:', earthData);
                const response = await fetch('/api/insights/unit-economics', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ earthResults: earthData })
                });
                const result = await response.json();
                if (!result.success) {
                    console.error('Unit economics API error:', result.error);
                    return;
                }
                metrics = result.data;
            }

            const years = metrics.map(m => m.year);
            const revenuePerSat = metrics.map(m => m.revenuePerSatellite);
            const revenuePerGbps = metrics.map(m => m.revenuePerGbps);
            const costPerLaunch = metrics.map(m => m.costPerLaunch);

            if (this.charts.unitEconomics) {
                this.charts.unitEconomics.destroy();
            }

            this.charts.unitEconomics = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: years,
                    datasets: [{
                        label: 'Revenue per Satellite ($M)',
                        data: revenuePerSat,
                        borderColor: '#0066cc',
                        backgroundColor: 'rgba(0, 102, 204, 0.1)',
                        yAxisID: 'y',
                        tension: 0.1
                    }, {
                        label: 'Revenue per Gbps ($M)',
                        data: revenuePerGbps,
                        borderColor: '#10b981',
                        backgroundColor: 'rgba(16, 185, 129, 0.1)',
                        yAxisID: 'y',
                        tension: 0.1
                    }, {
                        label: 'Cost per Launch ($M)',
                        data: costPerLaunch,
                        borderColor: '#ef4444',
                        backgroundColor: 'rgba(239, 68, 68, 0.1)',
                        yAxisID: 'y1',
                        tension: 0.1
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        y: {
                            type: 'linear',
                            position: 'left',
                            title: { display: true, text: 'Revenue Metrics ($M)' }
                        },
                        y1: {
                            type: 'linear',
                            position: 'right',
                            title: { display: true, text: 'Cost per Launch ($M)' },
                            grid: { drawOnChartArea: false }
                        }
                    }
                }
            });
        } catch (error) {
            console.error('Unit economics chart error:', error);
        }
    }

    async updateCapexEfficiencyChart(earthData) {
        const ctx = document.getElementById('capexEfficiencyChart');
        if (!ctx) {
            console.warn('Capex efficiency chart canvas not found');
            return;
        }

        // Check if we have detailed revenue data (from full calculation)
        // Monte Carlo results only have summary values, not detailed arrays
        let useSyntheticData = false;
        if (!earthData || !earthData.revenue || !Array.isArray(earthData.revenue) || earthData.revenue.length === 0) {
            // If we only have summary data (Monte Carlo), generate synthetic data
            if (earthData && (earthData.adjustedValue || earthData.terminalValue)) {
                console.info('Capex efficiency chart: Generating synthetic data from summary values');
                useSyntheticData = true;
            } else {
                console.warn('Capex efficiency chart: No earth data available', earthData);
                return;
            }
        }

        try {
            let metrics;
            
            if (useSyntheticData) {
                // Generate synthetic capex efficiency data from summary values
                const baseRevenue = earthData.adjustedValue ? earthData.adjustedValue * 1.2 : 150;
                const currentYear = new Date().getFullYear();
                metrics = [];
                
                for (let i = 0; i < 7; i++) {
                    const year = currentYear + i;
                    if (year <= 2030) {
                        const growthFactor = Math.pow(1.15, i);
                        const yearRevenue = baseRevenue * growthFactor;
                        const yearCapex = yearRevenue * 0.15 * Math.pow(0.90, i); // Capex declines as % of revenue over time
                        const yearEBITDA = yearRevenue * 0.93; // Assume 7% cost ratio
                        
                        metrics.push({
                            year: year,
                            capexToRevenue: (yearCapex / yearRevenue) * 100,
                            reinvestmentRate: (yearCapex / yearEBITDA) * 100
                        });
                    }
                }
            } else {
                console.log('Updating capex efficiency chart with data:', earthData);
                const response = await fetch('/api/insights/capex-efficiency', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ earthResults: earthData })
                });
                const result = await response.json();
                if (!result.success) {
                    console.error('Capex efficiency API error:', result.error);
                    return;
                }
                metrics = result.data;
            }

            const years = metrics.map(m => m.year);
            const capexToRevenue = metrics.map(m => m.capexToRevenue);
            const reinvestmentRate = metrics.map(m => m.reinvestmentRate);

            if (this.charts.capexEfficiency) {
                this.charts.capexEfficiency.destroy();
            }

            this.charts.capexEfficiency = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: years,
                    datasets: [{
                        label: 'Capex / Revenue (%)',
                        data: capexToRevenue,
                        borderColor: '#0066cc',
                        backgroundColor: 'rgba(0, 102, 204, 0.1)',
                        tension: 0.1
                    }, {
                        label: 'Reinvestment Rate (%)',
                        data: reinvestmentRate,
                        borderColor: '#10b981',
                        backgroundColor: 'rgba(16, 185, 129, 0.1)',
                        tension: 0.1
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        y: {
                            beginAtZero: true,
                            title: { display: true, text: 'Percentage (%)' }
                        }
                    }
                }
            });
        } catch (error) {
            console.error('Capex efficiency chart error:', error);
        }
    }

    async updateUtilizationChart(earthData, inputs) {
        const canvas = document.getElementById('utilizationChart');
        if (!canvas) {
            console.warn('Utilization chart canvas not found');
            return;
        }

        // Ensure the parent tab content is visible
        const tabContent = canvas.closest('.insights-tab-content');
        if (tabContent && tabContent.style.display === 'none') {
            // Tab is hidden, chart will be rendered when tab becomes visible
            return;
        }

        if (!earthData || !inputs) {
            console.warn('Utilization chart: Missing earthData or inputs', { earthData: !!earthData, inputs: !!inputs });
            return;
        }

        try {
            // Generate synthetic constellation/capacity data if missing
            let earthResultsForAPI = { ...earthData };
            if (!earthResultsForAPI.constellation || !earthResultsForAPI.capacity) {
                console.log('Generating synthetic utilization data from summary values');
                const currentYear = new Date().getFullYear();
                const launchVolume = inputs.earth?.launchVolume || 100;
                const baseSatellites = 5000;
                const baseCapacity = 100; // Tbps
                
                earthResultsForAPI.constellation = [];
                earthResultsForAPI.capacity = [];
                
                for (let i = 0; i < 7; i++) {
                    const year = currentYear + i;
                    const satellites = baseSatellites + (i * 2000);
                    const capacity = baseCapacity * Math.pow(1.2, i);
                    
                    earthResultsForAPI.constellation.push({
                        year: year,
                        total: satellites,
                        gen1: satellites * 0.1,
                        gen2: satellites * 0.9
                    });
                    
                    earthResultsForAPI.capacity.push({
                        year: year,
                        total: capacity
                    });
                }
            }

            console.log('Updating utilization chart with data:', { earthData: !!earthData, inputs: !!inputs });
            const response = await fetch('/api/insights/utilization', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ earthResults: earthResultsForAPI, inputs })
            });
            const result = await response.json();
            if (!result.success) {
                console.error('Utilization API error:', result.error);
                return;
            }

            if (!result.data || result.data.length === 0) {
                console.warn('Utilization API returned no data');
                return;
            }

            const utilization = result.data;
            const years = utilization.map(u => u.year);
            const falcon9Util = utilization.map(u => u.falcon9Utilization);
            const starshipUtil = utilization.map(u => u.starshipUtilization);
            const totalUtil = utilization.map(u => u.rocketUtilization);

            // Update metric cards
            const latest = utilization[utilization.length - 1];
            const rocketUtilEl = document.getElementById('rocketUtilization');
            const capacityUtilEl = document.getElementById('capacityUtilization');
            const falcon9UtilEl = document.getElementById('falcon9Utilization');
            const starshipUtilEl = document.getElementById('starshipUtilization');
            
            if (rocketUtilEl) rocketUtilEl.textContent = `${latest.rocketUtilization.toFixed(1)}%`;
            if (capacityUtilEl) capacityUtilEl.textContent = `${latest.rocketUtilization.toFixed(1)}%`;
            if (falcon9UtilEl) falcon9UtilEl.textContent = `${latest.falcon9Utilization.toFixed(1)}%`;
            if (starshipUtilEl) starshipUtilEl.textContent = `${latest.starshipUtilization.toFixed(1)}%`;

            if (this.charts.utilization) {
                this.charts.utilization.destroy();
            }

            this.charts.utilization = new Chart(canvas, {
                type: 'line',
                data: {
                    labels: years,
                    datasets: [{
                        label: 'Falcon 9 Utilization (%)',
                        data: falcon9Util,
                        borderColor: '#0066cc',
                        backgroundColor: 'rgba(0, 102, 204, 0.1)',
                        tension: 0.1
                    }, {
                        label: 'Starship Utilization (%)',
                        data: starshipUtil,
                        borderColor: '#10b981',
                        backgroundColor: 'rgba(16, 185, 129, 0.1)',
                        tension: 0.1
                    }, {
                        label: 'Total Utilization (%)',
                        data: totalUtil,
                        borderColor: '#f59e0b',
                        backgroundColor: 'rgba(245, 158, 11, 0.1)',
                        tension: 0.1,
                        borderWidth: 2
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        y: {
                            beginAtZero: true,
                            max: 100,
                            title: { display: true, text: 'Utilization (%)' }
                        }
                    }
                }
            });
        } catch (error) {
            console.error('Utilization chart error:', error);
            // Try to render with fallback data if API fails
            try {
                const currentYear = new Date().getFullYear();
                const launchVolume = inputs?.earth?.launchVolume || 100;
                const falcon9Utilization = Math.min(95, 60 + (launchVolume / 10));
                const starshipUtilization = Math.min(90, 50 + (launchVolume / 15));
                const rocketUtilization = (falcon9Utilization + starshipUtilization) / 2;
                
                const years = [];
                const falcon9Util = [];
                const starshipUtil = [];
                const totalUtil = [];
                
                for (let i = 0; i < 7; i++) {
                    years.push(currentYear + i);
                    falcon9Util.push(falcon9Utilization);
                    starshipUtil.push(starshipUtilization);
                    totalUtil.push(rocketUtilization);
                }
                
                // Update metric cards
                const rocketUtilEl = document.getElementById('rocketUtilization');
                const capacityUtilEl = document.getElementById('capacityUtilization');
                const falcon9UtilEl = document.getElementById('falcon9Utilization');
                const starshipUtilEl = document.getElementById('starshipUtilization');
                
                if (rocketUtilEl) rocketUtilEl.textContent = `${rocketUtilization.toFixed(1)}%`;
                if (capacityUtilEl) capacityUtilEl.textContent = `${rocketUtilization.toFixed(1)}%`;
                if (falcon9UtilEl) falcon9UtilEl.textContent = `${falcon9Utilization.toFixed(1)}%`;
                if (starshipUtilEl) starshipUtilEl.textContent = `${starshipUtilization.toFixed(1)}%`;
                
                if (this.charts.utilization) {
                    this.charts.utilization.destroy();
                }
                
                this.charts.utilization = new Chart(canvas, {
                    type: 'line',
                    data: {
                        labels: years,
                        datasets: [{
                            label: 'Falcon 9 Utilization (%)',
                            data: falcon9Util,
                            borderColor: '#0066cc',
                            backgroundColor: 'rgba(0, 102, 204, 0.1)',
                            tension: 0.1
                        }, {
                            label: 'Starship Utilization (%)',
                            data: starshipUtil,
                            borderColor: '#10b981',
                            backgroundColor: 'rgba(16, 185, 129, 0.1)',
                            tension: 0.1
                        }, {
                            label: 'Total Utilization (%)',
                            data: totalUtil,
                            borderColor: '#f59e0b',
                            backgroundColor: 'rgba(245, 158, 11, 0.1)',
                            tension: 0.1,
                            borderWidth: 2
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        scales: {
                            y: {
                                beginAtZero: true,
                                max: 100,
                                title: { display: true, text: 'Utilization (%)' }
                            }
                        }
                    }
                });
            } catch (fallbackError) {
                console.error('Failed to render utilization chart with fallback data:', fallbackError);
            }
        }
    }

    async updateTechnologyTransitionChart(earthData) {
        const canvas = document.getElementById('technologyTransitionChart');
        if (!canvas) {
            console.warn('Technology Transition Chart canvas not found');
            return;
        }

        // Ensure the parent tab content is visible
        const tabContent = canvas.closest('.insights-tab-content');
        if (tabContent && tabContent.style.display === 'none') {
            // Tab is hidden, chart will be rendered when tab becomes visible
            return;
        }

        try {
            // Generate synthetic constellation data if missing
            let earthResultsForAPI = { ...earthData };
            if (!earthResultsForAPI.constellation) {
                console.log('Generating synthetic technology transition data from summary values');
                const currentYear = new Date().getFullYear();
                const baseSatellites = 5000;
                
                earthResultsForAPI.constellation = [];
                
                for (let i = 0; i < 7; i++) {
                    const year = currentYear + i;
                    const satellites = baseSatellites + (i * 2000);
                    
                    earthResultsForAPI.constellation.push({
                        year: year,
                        total: satellites,
                        gen1: satellites * 0.1,
                        gen2: satellites * 0.9
                    });
                }
            }

            const response = await fetch('/api/insights/technology-transition', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ earthResults: earthResultsForAPI })
            });
            const result = await response.json();
            if (!result.success) {
                console.error('Technology transition API error:', result.error);
                return;
            }

            if (!result.data || result.data.length === 0) {
                console.warn('Technology transition API returned no data');
                return;
            }

            const transition = result.data;
            const years = transition.map(t => t.year);
            const v2Satellites = transition.map(t => t.v2Satellites);
            const v3Satellites = transition.map(t => t.v3Satellites);

            if (this.charts.technologyTransition) {
                this.charts.technologyTransition.destroy();
            }

            this.charts.technologyTransition = new Chart(canvas, {
                type: 'line',
                data: {
                    labels: years,
                    datasets: [{
                        label: 'V2 Satellites',
                        data: v2Satellites,
                        borderColor: '#6b7280',
                        backgroundColor: 'rgba(107, 114, 128, 0.1)',
                        tension: 0.1
                    }, {
                        label: 'V3 Satellites',
                        data: v3Satellites,
                        borderColor: '#10b981',
                        backgroundColor: 'rgba(16, 185, 129, 0.1)',
                        tension: 0.1
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        y: {
                            beginAtZero: true,
                            title: { display: true, text: 'Active Satellites' }
                        }
                    }
                }
            });
        } catch (error) {
            console.error('Technology transition chart error:', error);
            // Try to render with fallback data if API fails
            try {
                const currentYear = new Date().getFullYear();
                const baseSatellites = 5000;
                
                const years = [];
                const v2Satellites = [];
                const v3Satellites = [];
                
                for (let i = 0; i < 7; i++) {
                    const year = currentYear + i;
                    const satellites = baseSatellites + (i * 2000);
                    // V2 satellites decline over time, V3 increase
                    const v2Ratio = Math.max(0.1, 1 - (i * 0.15));
                    const v3Ratio = 1 - v2Ratio;
                    
                    years.push(year);
                    v2Satellites.push(satellites * v2Ratio);
                    v3Satellites.push(satellites * v3Ratio);
                }
                
                if (this.charts.technologyTransition) {
                    this.charts.technologyTransition.destroy();
                }
                
                this.charts.technologyTransition = new Chart(canvas, {
                    type: 'line',
                    data: {
                        labels: years,
                        datasets: [{
                            label: 'V2 Satellites',
                            data: v2Satellites,
                            borderColor: '#6b7280',
                            backgroundColor: 'rgba(107, 114, 128, 0.1)',
                            tension: 0.1
                        }, {
                            label: 'V3 Satellites',
                            data: v3Satellites,
                            borderColor: '#10b981',
                            backgroundColor: 'rgba(16, 185, 129, 0.1)',
                            tension: 0.1
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        scales: {
                            y: {
                                beginAtZero: true,
                                title: { display: true, text: 'Number of Satellites' }
                            }
                        }
                    }
                });
            } catch (fallbackError) {
                console.error('Failed to render technology transition chart with fallback data:', fallbackError);
            }
        }
    }

    async updateLaunchCadenceChart(earthData, inputs) {
        const canvas = document.getElementById('launchCadenceChart');
        if (!canvas) {
            console.warn('Launch Cadence Chart canvas not found');
            return;
        }

        // Ensure the parent tab content is visible
        const tabContent = canvas.closest('.insights-tab-content');
        if (tabContent && tabContent.style.display === 'none') {
            // Tab is hidden, chart will be rendered when tab becomes visible
            return;
        }

        try {
            const response = await fetch('/api/insights/launch-cadence', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ earthResults: earthData, inputs })
            });
            const result = await response.json();
            if (!result.success) return;

            const cadence = result.data;
            const years = cadence.map(c => c.year);
            const falcon9LaunchesPerRocket = cadence.map(c => c.falcon9LaunchesPerRocket);
            const starshipLaunchesPerRocket = cadence.map(c => c.starshipLaunchesPerRocket);

            if (this.charts.launchCadence) {
                this.charts.launchCadence.destroy();
            }

            this.charts.launchCadence = new Chart(canvas, {
                type: 'line',
                data: {
                    labels: years,
                    datasets: [{
                        label: 'Falcon 9 Launches/Rocket',
                        data: falcon9LaunchesPerRocket,
                        borderColor: '#0066cc',
                        backgroundColor: 'rgba(0, 102, 204, 0.1)',
                        tension: 0.1
                    }, {
                        label: 'Starship Launches/Rocket',
                        data: starshipLaunchesPerRocket,
                        borderColor: '#10b981',
                        backgroundColor: 'rgba(16, 185, 129, 0.1)',
                        tension: 0.1
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        y: {
                            beginAtZero: true,
                            title: { display: true, text: 'Launches per Rocket per Year' }
                        }
                    }
                }
            });
        } catch (error) {
            console.error('Launch cadence chart error:', error);
        }
    }

    async updateBandwidthEconomicsChart(earthData) {
        const canvas = document.getElementById('bandwidthEconomicsChart');
        if (!canvas) {
            console.warn('Bandwidth Economics Chart canvas not found');
            return;
        }

        // Ensure the parent tab content is visible
        const tabContent = canvas.closest('.insights-tab-content');
        if (tabContent && tabContent.style.display === 'none') {
            // Tab is hidden, chart will be rendered when tab becomes visible
            return;
        }

        try {
            const response = await fetch('/api/insights/bandwidth-economics', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ earthResults: earthData })
            });
            const result = await response.json();
            if (!result.success) return;

            const bandwidth = result.data;
            const years = bandwidth.map(b => b.year);
            const revenuePerGbps = bandwidth.map(b => b.revenuePerGbps);
            const bandwidthUtilization = bandwidth.map(b => b.bandwidthUtilization);

            // Update metric cards
            const latest = bandwidth[bandwidth.length - 1];
            const revenuePerGbpsEl = document.getElementById('revenuePerGbps');
            const bandwidthUtilEl = document.getElementById('bandwidthUtilization');
            
            if (revenuePerGbpsEl) revenuePerGbpsEl.textContent = `$${latest.revenuePerGbps.toFixed(2)}M/Gbps`;
            if (bandwidthUtilEl) bandwidthUtilEl.textContent = `$${latest.bandwidthUtilization.toFixed(2)}M/Gbps`;

            if (this.charts.bandwidthEconomics) {
                this.charts.bandwidthEconomics.destroy();
            }

            this.charts.bandwidthEconomics = new Chart(canvas, {
                type: 'line',
                data: {
                    labels: years,
                    datasets: [{
                        label: 'Revenue per Gbps ($M)',
                        data: revenuePerGbps,
                        borderColor: '#0066cc',
                        backgroundColor: 'rgba(0, 102, 204, 0.1)',
                        yAxisID: 'y',
                        tension: 0.1
                    }, {
                        label: 'Bandwidth Utilization ($M/Gbps)',
                        data: bandwidthUtilization,
                        borderColor: '#10b981',
                        backgroundColor: 'rgba(16, 185, 129, 0.1)',
                        yAxisID: 'y',
                        tension: 0.1
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        y: {
                            beginAtZero: true,
                            title: { display: true, text: 'Revenue/Utilization ($M per Gbps)' }
                        }
                    }
                }
            });
        } catch (error) {
            console.error('Bandwidth economics chart error:', error);
        }
    }

    // Initialize Settings Modal
    initSettingsModal() {
        // Settings tab switching
        document.querySelectorAll('#settingsModal .help-tabs button[data-tab]').forEach(tab => {
            tab.addEventListener('click', () => {
                const tabName = tab.dataset.tab;
                
                // Update active tab
                tab.closest('.help-tabs').querySelectorAll('.help-tab').forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                
                // Update active content
                document.querySelectorAll('#settingsModal .help-tab-content').forEach(content => {
                    content.classList.remove('active');
                });
                const content = document.getElementById(`settingsTab-${tabName}`);
                if (content) content.classList.add('active');
            });
        });
        
        // Load current AI model setting
        const modelSelect = document.getElementById('aiModelSelect');
        if (modelSelect) {
            modelSelect.value = this.aiModel;
            this.updateCurrentModelDisplay();
        }
        
        // Mach33Lib dropdown change handler - update display immediately
        const greeksLibrarySelect = document.getElementById('greeksLibrarySelect');
        if (greeksLibrarySelect) {
            greeksLibrarySelect.addEventListener('change', () => {
                this.updateMach33LibDisplay();
            });
        }
        
        // Load Mach33Lib settings when modal opens
        this.loadMach33LibSettings();
        
        // Load Financial API settings when modal opens
        this.loadFinancialApiSettings();
        
        // Show/hide API key fields based on selected provider
        const financialApiSelect = document.getElementById('financialApiSelect');
        if (financialApiSelect) {
            financialApiSelect.addEventListener('change', () => {
                this.updateFinancialApiKeyFields();
            });
        }
    }

    // Update current model display
    updateCurrentModelDisplay() {
        const currentDisplay = document.getElementById('currentModelDisplay');
        if (currentDisplay) {
            const modelNames = {
                'claude-opus-4-1-20250805': 'Claude Opus 4.1',
                'claude-3-opus-20240229': 'Claude 3 Opus',
                'claude-3-5-sonnet-20241022': 'Claude 3.5 Sonnet',
                'claude-3-5-haiku-20241022': 'Claude 3.5 Haiku',
                'claude-3-sonnet-20240229': 'Claude 3 Sonnet',
                'openai:gpt-4o': 'GPT-4o',
                'openai:gpt-4-turbo': 'GPT-4 Turbo',
                'openai:gpt-4': 'GPT-4',
                'openai:gpt-3.5-turbo': 'GPT-3.5 Turbo',
                'grok:grok-2': 'Grok-2',
                'grok:grok-beta': 'Grok Beta'
            };
            currentDisplay.textContent = modelNames[this.aiModel] || this.aiModel;
        }
    }

    // Save AI Model Settings
    saveAIModelSettings() {
        const modelSelect = document.getElementById('aiModelSelect');
        if (modelSelect) {
            this.aiModel = modelSelect.value;
            localStorage.setItem('aiModel', this.aiModel);
            this.updateCurrentModelDisplay();
            
            // Show success message
            const btn = event.target;
            const originalText = btn.innerHTML;
            btn.innerHTML = '<i data-lucide="check"></i> Saved!';
            btn.disabled = true;
            if (window.lucide) window.lucide.createIcons();
            
            setTimeout(() => {
                btn.innerHTML = originalText;
                btn.disabled = false;
                if (window.lucide) window.lucide.createIcons();
            }, 2000);
        }
    }

    // Load Financial API Settings
    loadFinancialApiSettings() {
        const apiSelect = document.getElementById('financialApiSelect');
        const alphaVantageKey = document.getElementById('alphaVantageApiKey');
        const fmpKey = document.getElementById('financialModelingPrepApiKey');
        
        if (apiSelect) {
            apiSelect.value = this.financialApiProvider;
            this.updateFinancialApiKeyFields();
        }
        
        if (alphaVantageKey) {
            alphaVantageKey.value = this.alphaVantageApiKey;
        }
        
        if (fmpKey) {
            fmpKey.value = this.financialModelingPrepApiKey;
        }
        
        this.updateCurrentFinancialApiDisplay();
    }
    
    // Update Financial API key fields visibility
    updateFinancialApiKeyFields() {
        const apiSelect = document.getElementById('financialApiSelect');
        const alphaVantageGroup = document.getElementById('alphaVantageApiKeyGroup');
        const fmpGroup = document.getElementById('financialModelingPrepApiKeyGroup');
        const yahooInfoGroup = document.getElementById('yahooFinanceInfoGroup');
        const alphaVantageFaqGroup = document.getElementById('alphaVantageFaqGroup');
        
        if (!apiSelect) return;
        
        const selectedApi = apiSelect.value;
        
        if (alphaVantageGroup) {
            alphaVantageGroup.style.display = selectedApi === 'alpha-vantage' ? 'block' : 'none';
        }
        
        if (fmpGroup) {
            fmpGroup.style.display = selectedApi === 'financial-modeling-prep' ? 'block' : 'none';
        }
        
        if (yahooInfoGroup) {
            yahooInfoGroup.style.display = selectedApi === 'yahoo-finance' ? 'block' : 'none';
        }
        
        if (alphaVantageFaqGroup) {
            alphaVantageFaqGroup.style.display = selectedApi === 'alpha-vantage' ? 'block' : 'none';
        }
    }
    
    // Update current Financial API display
    updateCurrentFinancialApiDisplay() {
        const currentDisplay = document.getElementById('currentFinancialApiDisplay');
        if (currentDisplay) {
            const apiNames = {
                'yahoo-finance': 'Yahoo Finance',
                'alpha-vantage': 'Alpha Vantage',
                'financial-modeling-prep': 'Financial Modeling Prep',
                'sample-data': 'Sample Data'
            };
            currentDisplay.textContent = apiNames[this.financialApiProvider] || 'Yahoo Finance';
        }
    }
    
    // Save Financial API Settings
    saveFinancialApiSettings() {
        const apiSelect = document.getElementById('financialApiSelect');
        const alphaVantageKey = document.getElementById('alphaVantageApiKey');
        const fmpKey = document.getElementById('financialModelingPrepApiKey');
        
        if (apiSelect) {
            this.financialApiProvider = apiSelect.value;
            localStorage.setItem('financialApiProvider', this.financialApiProvider);
            console.log('✅ Saved API provider:', this.financialApiProvider);
        }
        
        if (alphaVantageKey) {
            this.alphaVantageApiKey = alphaVantageKey.value.trim();
            if (this.alphaVantageApiKey) {
                localStorage.setItem('alphaVantageApiKey', this.alphaVantageApiKey);
                console.log('✅ Saved Alpha Vantage API key:', this.alphaVantageApiKey.substring(0, 8) + '...');
            } else {
                localStorage.removeItem('alphaVantageApiKey');
                console.log('⚠️ Alpha Vantage API key cleared');
            }
        }
        
        if (fmpKey) {
            this.financialModelingPrepApiKey = fmpKey.value.trim();
            if (this.financialModelingPrepApiKey) {
                localStorage.setItem('financialModelingPrepApiKey', this.financialModelingPrepApiKey);
                console.log('✅ Saved Financial Modeling Prep API key:', this.financialModelingPrepApiKey.substring(0, 8) + '...');
            } else {
                localStorage.removeItem('financialModelingPrepApiKey');
                console.log('⚠️ Financial Modeling Prep API key cleared');
            }
        }
        
        this.updateCurrentFinancialApiDisplay();
        
        // Show success message
        const btn = event.target;
        const originalText = btn.innerHTML;
        btn.innerHTML = '<i data-lucide="check"></i> Saved!';
        btn.disabled = true;
        if (window.lucide) window.lucide.createIcons();
        
        setTimeout(() => {
            btn.innerHTML = originalText;
            btn.disabled = false;
            if (window.lucide) window.lucide.createIcons();
        }, 2000);
        
        // Reload comparables with new API settings
        if (this.currentView === 'ratios' || this.currentComparablesData) {
            this.loadComparables();
        }
    }

    // Update Mach33Lib display (helper function)
    updateMach33LibDisplay() {
        const librarySelect = document.getElementById('greeksLibrarySelect');
        const currentDisplay = document.getElementById('currentLibraryDisplay');
        
        if (librarySelect && currentDisplay) {
            const libraryNames = {
                'mach33lib-finite-difference': 'Finite Difference',
                'mach33lib-central-difference': 'Central Difference',
                'mach33lib-monte-carlo': 'Monte Carlo Based',
                'custom': 'Custom Library'
            };
            const selectedValue = librarySelect.value;
            currentDisplay.textContent = libraryNames[selectedValue] || 'Finite Difference';
        }
    }

    // Load Mach33Lib Settings
    async loadMach33LibSettings() {
        try {
            const response = await fetch('/api/settings/mach33lib');
            if (!response.ok) {
                console.warn('Mach33Lib settings endpoint not available, using defaults');
                this.updateMach33LibDisplay(); // Update with defaults
                return;
            }
            const result = await response.json();
            if (result.success && result.settings) {
                const settings = result.settings;
                
                // Update UI
                const librarySelect = document.getElementById('greeksLibrarySelect');
                if (librarySelect) {
                    librarySelect.value = settings.library || 'mach33lib-finite-difference';
                }
                
                const bumpPercentage = document.getElementById('bumpPercentage');
                const bumpAbsolute = document.getElementById('bumpAbsolute');
                const bumpTime = document.getElementById('bumpTime');
                const bumpVolatility = document.getElementById('bumpVolatility');
                const bumpRate = document.getElementById('bumpRate');
                
                if (bumpPercentage) bumpPercentage.value = settings.bumpSizes?.percentage || 0.01;
                if (bumpAbsolute) bumpAbsolute.value = settings.bumpSizes?.absolute || 1;
                if (bumpTime) bumpTime.value = settings.bumpSizes?.time || 1;
                if (bumpVolatility) bumpVolatility.value = settings.bumpSizes?.volatility || 0.01;
                if (bumpRate) bumpRate.value = settings.bumpSizes?.rate || 0.001;
                
                // Update display
                this.updateMach33LibDisplay();
            }
        } catch (error) {
            console.error('Error loading Mach33Lib settings:', error);
            // Update with defaults even on error
            this.updateMach33LibDisplay();
        }
    }

    // Save Mach33Lib settings (CREATE/UPDATE)
    async saveMach33LibSettings(event) {
        try {
            const library = document.getElementById('greeksLibrarySelect').value;
            const bumpPercentage = parseFloat(document.getElementById('bumpPercentage').value);
            const bumpAbsolute = parseFloat(document.getElementById('bumpAbsolute').value);
            const bumpTime = parseFloat(document.getElementById('bumpTime').value);
            const bumpVolatility = parseFloat(document.getElementById('bumpVolatility').value);
            const bumpRate = parseFloat(document.getElementById('bumpRate').value);
            
            const response = await fetch('/api/settings/mach33lib', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    library,
                    bumpPercentage,
                    bumpAbsolute,
                    bumpTime,
                    bumpVolatility,
                    bumpRate
                })
            });
            
            const result = await response.json();
            if (result.success) {
                // Show success message - find button by ID or use event target
                const btn = event?.target || document.getElementById('saveMach33LibBtn');
                if (btn) {
                    const originalText = btn.innerHTML;
                    btn.innerHTML = '<i data-lucide="check"></i> Saved!';
                    btn.disabled = true;
                    if (window.lucide) window.lucide.createIcons();
                    
                    setTimeout(() => {
                        btn.innerHTML = originalText;
                        btn.disabled = false;
                        if (window.lucide) window.lucide.createIcons();
                    }, 2000);
                }
                
                // Update display
                this.updateMach33LibDisplay();
                
                // Show notification that Greeks need to be recalculated
                const greeksDashboard = document.getElementById('greeksDashboard');
                if (greeksDashboard && greeksDashboard.style.display !== 'none') {
                    // Dashboard is visible - show notification
                    const notification = document.createElement('div');
                    notification.style.cssText = 'position: fixed; top: 20px; right: 20px; background: #f59e0b; color: white; padding: 12px 20px; border-radius: 4px; box-shadow: 0 4px 12px rgba(0,0,0,0.15); z-index: 10000; font-size: 14px; max-width: 300px;';
                    notification.innerHTML = '<strong>⚠️ Settings Changed</strong><br>Click "Calculate Greeks" to see updated values';
                    document.body.appendChild(notification);
                    
                    setTimeout(() => {
                        notification.style.opacity = '0';
                        notification.style.transition = 'opacity 0.3s';
                        setTimeout(() => notification.remove(), 300);
                    }, 5000);
                }
            } else {
                alert('Failed to save settings: ' + (result.error || 'Unknown error'));
            }
        } catch (error) {
            console.error('Error saving Mach33Lib settings:', error);
            alert('Failed to save settings: ' + error.message);
        }
    }

    // Reset Mach33Lib settings to defaults (DELETE)
    async resetMach33LibSettings(event) {
        if (!confirm('Reset Mach33Lib settings to default values?')) {
            return;
        }
        
        try {
            const response = await fetch('/api/settings/mach33lib', {
                method: 'DELETE'
            });
            
            const result = await response.json();
            if (result.success) {
                // Reload settings to update UI
                await this.loadMach33LibSettings();
                
                // Show success message - find button by ID or use event target
                const btn = event?.target || document.getElementById('resetMach33LibBtn');
                if (btn) {
                    const originalText = btn.innerHTML;
                    btn.innerHTML = '<i data-lucide="check"></i> Reset!';
                    btn.disabled = true;
                    if (window.lucide) window.lucide.createIcons();
                    
                    setTimeout(() => {
                        btn.innerHTML = originalText;
                        btn.disabled = false;
                        if (window.lucide) window.lucide.createIcons();
                    }, 2000);
                }
            } else {
                alert('Failed to reset settings: ' + (result.error || 'Unknown error'));
            }
        } catch (error) {
            console.error('Error resetting Mach33Lib settings:', error);
            alert('Failed to reset settings: ' + error.message);
        }
    }

    // Get AI Model for API calls
    getAIModel() {
        return this.aiModel || 'claude-opus-4-1-20250805';
    }

    // Toggle Info Panel (floating panel)
    toggleInfoPanel(panelId) {
        const panel = document.getElementById(`infoPanel-${panelId}`);
        if (!panel) return;
        
        // Find the button that triggered this
        const button = event?.target?.closest('.info-icon-button') || 
                      event?.target?.parentElement?.closest('.info-icon-button');
        
        const isVisible = panel.style.display !== 'none';
        
        // Close all floating panels and popups first
        document.querySelectorAll('.ai-explanation-floating-panel').forEach(p => {
            p.style.display = 'none';
        });
        document.querySelectorAll('.ai-explanation-popup').forEach(p => {
            p.style.display = 'none';
        });
        
        // Remove backdrop if closing
        const backdrop = document.getElementById('aiExplanationBackdrop');
        if (isVisible) {
            panel.style.display = 'none';
            if (backdrop) backdrop.style.display = 'none';
            if (button) button.classList.remove('active');
            return;
        }
        
        // Show backdrop
        if (!backdrop) {
            const newBackdrop = document.createElement('div');
            newBackdrop.id = 'aiExplanationBackdrop';
            newBackdrop.className = 'ai-explanation-backdrop';
            newBackdrop.onclick = () => this.closeInfoPanel(panelId);
            document.body.appendChild(newBackdrop);
        }
        if (backdrop) backdrop.style.display = 'block';
        
        // Show panel
        panel.style.display = 'flex';
        if (button) button.classList.add('active');
        
        // Update icons
        if (window.lucide) window.lucide.createIcons();
    }

    // Close Info Panel
    closeInfoPanel(panelId) {
        const panel = document.getElementById(`infoPanel-${panelId}`);
        const backdrop = document.getElementById('aiExplanationBackdrop');
        const button = document.querySelector(`[onclick*="toggleInfoPanel('${panelId}')"]`);
        
        if (panel) panel.style.display = 'none';
        if (backdrop) backdrop.style.display = 'none';
        if (button) button.classList.remove('active');
        
        if (window.lucide) window.lucide.createIcons();
    }

    // Generate data hash for caching aiTips
    generateDataHash(data) {
        const str = JSON.stringify(data);
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32bit integer
        }
        return hash.toString();
    }

    // Generate aiTip for a chart feature
    async generateAITip(chartId, chartType, chartData, feature, position) {
        // Check cache first
        const dataHash = this.generateDataHash(chartData);
        const cacheKey = `${chartId}_${feature}_${dataHash}`;
        
        if (this.aiTipCache[cacheKey]) {
            return this.aiTipCache[cacheKey];
        }

        try {
            const response = await fetch('/api/ai/chart-tip', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-AI-Model': this.getAIModel()
                },
                body: JSON.stringify({
                    chartId,
                    chartType,
                    chartData,
                    feature,
                    position
                })
            });

            const result = await response.json();
            if (result.success && result.data) {
                // Cache the tip
                this.aiTipCache[cacheKey] = result.data;
                return result.data;
            }
        } catch (error) {
            console.error('Error generating aiTip:', error);
        }

        // Fallback tip
        return {
            tip: 'This chart feature shows important trends in the valuation model.',
            chartId,
            feature,
            position
        };
    }

    // Create and position aiTip overlay on chart
    async createAITip(chartId, chartType, chartData, feature, position = null, pointerDirection = null) {
        const chartContainer = document.querySelector(`#${chartId}`)?.closest('.chart-container, .chart-container-half');
        if (!chartContainer) return;

        // Remove existing tip and arrow for this feature
        const existingTip = chartContainer.querySelector(`.ai-tip[data-feature="${feature}"]`);
        if (existingTip) {
            const arrowId = existingTip.getAttribute('data-arrow-svg');
            if (arrowId) {
                const arrow = document.getElementById(arrowId) || chartContainer.querySelector(`svg[data-tip="${feature}"]`);
                if (arrow) arrow.remove();
            }
            existingTip.remove();
        }

        // Generate tip
        const tipData = await this.generateAITip(chartId, chartType, chartData, feature, position);

        // Clean up tip content - aggressively remove all labels and formatting
        let cleanTip = tipData.tip || '';
        
        // Remove all label patterns (Context, Insight, Analysis, Note, etc.)
        cleanTip = cleanTip.replace(/(Context|Insight|Analysis|Note|Summary|Explanation):\s*/gi, '');
        
        // Remove any markdown-style formatting
        cleanTip = cleanTip.replace(/\*\*/g, '');
        cleanTip = cleanTip.replace(/\*/g, '');
        
        // Split by newlines and take first meaningful line
        const lines = cleanTip.split(/\n+/).map(l => l.trim()).filter(l => l.length > 0);
        if (lines.length > 0) {
            cleanTip = lines[0];
        }
        
        // Remove any remaining label patterns that might be in the middle
        cleanTip = cleanTip.replace(/^(Context|Insight|Analysis|Note|Summary|Explanation):\s*/gi, '');
        
        // Clean up extra whitespace
        cleanTip = cleanTip.replace(/\s+/g, ' ').trim();
        
        // Limit to one sentence (take first sentence only)
        const sentences = cleanTip.split(/[.!?]+/).filter(s => s.trim().length > 10);
        if (sentences.length > 0) {
            cleanTip = sentences[0].trim();
            if (!cleanTip.match(/[.!?]$/)) {
                cleanTip += '.';
            }
        }
        
        // If still too long, truncate
        if (cleanTip.length > 150) {
            cleanTip = cleanTip.substring(0, 147) + '...';
        }

        // Create tip element with AI icon
        const tip = document.createElement('div');
        tip.setAttribute('data-feature', feature);
        tip.setAttribute('data-chart-id', chartId);
        tip.innerHTML = `
            <i data-lucide="sparkles" class="ai-tip-icon"></i>
            <div class="ai-tip-content">${cleanTip}</div>
        `;

        // Smart positioning: find the chart element and position tip relative to it
        const canvas = document.getElementById(chartId);
        // Try different chart key formats
        let chart = this.charts[chartId];
        if (!chart) {
            const chartKey = chartId.replace('Chart', '').replace('chart', '');
            chart = this.charts[chartKey] || this.charts[chartKey.toLowerCase()];
        }
        
        if (canvas && chart) {
            const containerRect = chartContainer.getBoundingClientRect();
            const canvasRect = canvas.getBoundingClientRect();
            
            // Try to find the element position using Chart.js
            // For bar charts, find the bar with the highest value
            let elementX = null;
            let elementY = null;
            let pointerDirection = 'right'; // Default: point right (tip on left)
            
            try {
                if (chartType === 'bar' && chart.data && chart.data.datasets && chart.data.datasets[0]) {
                    // Find the index - use position.index if provided, otherwise search labels
                    const labels = chart.data.labels || [];
                    let featureIndex = -1;
                    
                    if (position && typeof position === 'object' && position.index !== undefined) {
                        featureIndex = position.index;
                    } else {
                        featureIndex = labels.findIndex(label => 
                            feature.toLowerCase().includes(label.toLowerCase()) || 
                            label.toLowerCase().includes(feature.toLowerCase().split(':')[0].trim())
                        );
                    }
                    
                    if (featureIndex >= 0 && featureIndex < labels.length) {
                        // Get the bar element position using Chart.js
                        const meta = chart.getDatasetMeta(0);
                        if (meta && meta.data[featureIndex]) {
                            const barElement = meta.data[featureIndex];
                            elementX = barElement.x;
                            elementY = barElement.y;
                            
                            // Position tip CLOSE to bar but NOT overlapping - to the LEFT of bars
                            const tipWidth = 180;
                            const tipHeight = 60;
                            const spacing = 35; // Space for arrow line
                            
                            const barHeight = Math.abs(barElement.height || 40);
                            const barTop = elementY - (barHeight / 2);
                            const barBottom = elementY + (barHeight / 2);
                            
                            // Position tip to LEFT of bar (bars are on right side)
                            let tipX = elementX - tipWidth - spacing;
                            let tipY = elementY - (tipHeight / 2); // Vertically centered on bar
                            
                            // If tip would go off left edge, put it on right side
                            if (tipX < 10) {
                                tipX = elementX + spacing;
                                pointerDirection = 'left';
                            } else {
                                pointerDirection = 'right';
                            }
                            
                            // Adjust Y to avoid overlapping bar vertically
                            if (tipY + tipHeight > barBottom + 5) {
                                tipY = barBottom + 5;
                            }
                            if (tipY < barTop - 5) {
                                tipY = barTop - tipHeight - 5;
                            }
                            
                            // Ensure within bounds
                            if (tipY < 10) tipY = 10;
                            if (tipY + tipHeight > canvasRect.height - 10) {
                                tipY = canvasRect.height - tipHeight - 10;
                            }
                            
                            // Check for overlap with other tips and adjust
                            const existingTips = chartContainer.querySelectorAll('.ai-tip');
                            let adjustedY = tipY;
                            for (const existingTip of existingTips) {
                                const existingRect = existingTip.getBoundingClientRect();
                                const containerRect = chartContainer.getBoundingClientRect();
                                const existingY = existingRect.top - containerRect.top;
                                const existingHeight = existingRect.height;
                                
                                if (Math.abs(tipX - (existingRect.left - containerRect.left)) < tipWidth + 30) {
                                    if (adjustedY >= existingY && adjustedY < existingY + existingHeight + 10) {
                                        adjustedY = existingY + existingHeight + 15;
                                    } else if (adjustedY + tipHeight > existingY && adjustedY < existingY) {
                                        adjustedY = existingY - tipHeight - 15;
                                    }
                                }
                            }
                            tipY = adjustedY;
                            
                            tip.style.position = 'absolute';
                            tip.style.left = `${tipX}px`;
                            tip.style.top = `${tipY}px`;
                            tip.style.right = 'auto';
                            tip.style.bottom = 'auto';
                            tip.style.maxWidth = '180px';
                            tip.className = `ai-tip`;
                            
                            // Create SVG arrow line from tip edge to bar edge
                            const tipCenterY = tipY + tipHeight / 2;
                            const barCenterY = elementY;
                            
                            // Arrow start/end points
                            let arrowStartX, arrowStartY, arrowEndX, arrowEndY;
                            
                            if (pointerDirection === 'right') {
                                // Tip on left, arrow extends right to bar
                                arrowStartX = tipX + tipWidth;
                                arrowStartY = tipCenterY;
                                arrowEndX = elementX - 3; // Stop just before bar
                                arrowEndY = barCenterY;
                            } else {
                                // Tip on right, arrow extends left to bar
                                arrowStartX = tipX;
                                arrowStartY = tipCenterY;
                                arrowEndX = elementX + 3; // Stop just before bar
                                arrowEndY = barCenterY;
                            }
                            
                            // Create SVG container for arrow
                            let svg = chartContainer.querySelector(`svg.ai-tip-arrow-container`);
                            if (!svg) {
                                svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
                                svg.className = 'ai-tip-arrow-container';
                                svg.style.position = 'absolute';
                                svg.style.left = '0';
                                svg.style.top = '0';
                                svg.style.width = '100%';
                                svg.style.height = '100%';
                                svg.style.pointerEvents = 'none';
                                svg.style.zIndex = '999';
                                svg.setAttribute('viewBox', `0 0 ${canvasRect.width} ${canvasRect.height}`);
                                chartContainer.appendChild(svg);
                            }
                            
                            // Create arrow line
                            const lineId = `arrow-${chartId}-${featureIndex}`;
                            const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
                            line.setAttribute('id', lineId);
                            line.setAttribute('x1', arrowStartX);
                            line.setAttribute('y1', arrowStartY);
                            line.setAttribute('x2', arrowEndX);
                            line.setAttribute('y2', arrowEndY);
                            line.setAttribute('stroke', 'var(--primary-color)');
                            line.setAttribute('stroke-width', '1.5');
                            line.setAttribute('opacity', '0.6');
                            line.setAttribute('marker-end', `url(#arrowhead-${chartId})`);
                            
                            // Create arrowhead marker if it doesn't exist
                            let defs = svg.querySelector('defs');
                            if (!defs) {
                                defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
                                svg.appendChild(defs);
                            }
                            
                            let marker = defs.querySelector(`#arrowhead-${chartId}`);
                            if (!marker) {
                                marker = document.createElementNS('http://www.w3.org/2000/svg', 'marker');
                                marker.setAttribute('id', `arrowhead-${chartId}`);
                                marker.setAttribute('markerWidth', '8');
                                marker.setAttribute('markerHeight', '8');
                                marker.setAttribute('refX', '7');
                                marker.setAttribute('refY', '3');
                                marker.setAttribute('orient', 'auto');
                                
                                const polygon = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
                                polygon.setAttribute('points', '0 0, 8 3, 0 6');
                                polygon.setAttribute('fill', 'var(--primary-color)');
                                polygon.setAttribute('opacity', '0.8');
                                
                                marker.appendChild(polygon);
                                defs.appendChild(marker);
                            }
                            
                            svg.appendChild(line);
                            tip.setAttribute('data-arrow-line', lineId);
                        }
                    }
                }
            } catch (e) {
                console.log('Could not calculate precise position:', e);
            }
            
            // Fallback: if we couldn't calculate position, use left side of chart
            if (tip.style.left === '' && tip.style.top === '') {
                tip.style.position = 'absolute';
                tip.style.left = '10px';
                tip.style.top = '50%';
                tip.style.transform = 'translateY(-50%)';
                tip.style.right = 'auto';
                tip.style.bottom = 'auto';
                tip.style.maxWidth = '180px';
                tip.className = `ai-tip pointer-right`; // Point right toward chart
            }
        } else {
            // Fallback positioning - left side
            tip.style.position = 'absolute';
            tip.style.left = '10px';
            tip.style.top = '50%';
            tip.style.transform = 'translateY(-50%)';
            tip.style.right = 'auto';
            tip.style.bottom = 'auto';
            tip.style.maxWidth = '180px';
            tip.className = `ai-tip pointer-right`;
        }

        chartContainer.appendChild(tip);

        // Initialize Lucide icons for the sparkles icon
        if (window.lucide) {
            window.lucide.createIcons();
        }

        // Show tip with animation
        setTimeout(() => {
            tip.classList.add('visible');
        }, 100);
    }

    // Remove aiTip
    removeAITip(chartId, feature) {
        const chartContainer = document.querySelector(`#${chartId}`)?.closest('.chart-container, .chart-container-half');
        if (!chartContainer) return;

        const tip = chartContainer.querySelector(`.ai-tip[data-feature="${feature}"]`);
        if (tip) {
            // Remove associated arrow line
            const arrowLineId = tip.getAttribute('data-arrow-line');
            if (arrowLineId) {
                const arrowLine = document.getElementById(arrowLineId);
                if (arrowLine) arrowLine.remove();
            }
            
            tip.classList.remove('visible');
            setTimeout(() => tip.remove(), 200);
        }
    }

    // Clear all aiTips for a chart
    clearAITips(chartId) {
        const chartContainer = document.querySelector(`#${chartId}`)?.closest('.chart-container, .chart-container-half');
        if (!chartContainer) return;

        const tips = chartContainer.querySelectorAll('.ai-tip');
        tips.forEach(tip => {
            // Remove associated arrow line
            const arrowLineId = tip.getAttribute('data-arrow-line');
            if (arrowLineId) {
                const arrowLine = document.getElementById(arrowLineId);
                if (arrowLine) arrowLine.remove();
            }
            
            tip.classList.remove('visible');
            setTimeout(() => tip.remove(), 200);
        });
        
        // Remove SVG container if empty
        const svg = chartContainer.querySelector('svg.ai-tip-arrow-container');
        if (svg && svg.querySelectorAll('line').length === 0) {
            svg.remove();
        }
    }

    // ==================== TERMINAL DASHBOARD ====================

    async generateDashboardLayout(data, inputs) {
        const gridContainer = document.getElementById('dashboardGrid');
        if (!gridContainer) return;

        gridContainer.innerHTML = '<div style="grid-column: 1 / -1; display: flex; align-items: center; justify-content: center; color: var(--text-secondary); padding: var(--spacing-xl);"><div style="text-align: center;"><i data-lucide="loader" class="spinning" style="width: 32px; height: 32px; margin: 0 auto 16px; display: block;"></i><p>Generating terminal layout...</p></div></div>';
        if (window.lucide) window.lucide.createIcons();

        try {
            const response = await fetch('/api/insights/dashboard-layout', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ data, inputs, gridColumns: 4 })
            });
            const result = await response.json();
            
            if (result.success && result.layout) {
                await this.renderDashboardGrid(result.layout.tiles, data, inputs, gridContainer);
            } else {
                await this.generateDashboardLayoutFallback(data, inputs, gridContainer);
            }
        } catch (error) {
            console.error('Error generating dashboard layout:', error);
            console.error('Error details:', error.message, error.stack);
            // Fallback to default layout
            await this.generateDashboardLayoutFallback(data, inputs, gridContainer);
        }
    }

    async generateDashboardLayoutFallback(data, inputs, gridContainer) {
        const totalValue = data.total?.value || 0;
        const earthValue = data.earth?.adjustedValue || 0;
        const marsValue = data.mars?.adjustedValue || 0;
        const earthPercent = totalValue > 0 ? (earthValue / totalValue) * 100 : 0;
        const marsPercent = totalValue > 0 ? (marsValue / totalValue) * 100 : 0;

        const formatBillion = (value) => {
            if (value >= 1000) return `$${(value / 1000).toFixed(1)}T`;
            return `$${value.toFixed(1)}B`;
        };

        // Define all tiles (no categories - single view)
        // IMPORTANT: mars-operations MUST come before news in this array so it's placed first
        const allTiles = [
            { id: 'total-valuation', icon: 'zap', title: 'Total Enterprise Value', value: formatBillion(totalValue), color: '#0066cc', size: 'horizontal', insightType: 'valuation', data: { totalValue, earthValue, marsValue } },
            { id: 'comprehensive-overview', icon: 'layout-dashboard', title: 'Comprehensive Overview', value: 'Summary', color: '#0066cc', size: 'large', insightType: 'valuation-summary', data: { totalValue, earthValue, marsValue } },
            { id: 'mars-timeline', icon: 'calendar', title: 'Mars Timeline', value: `${inputs?.mars?.firstColonyYear || 2030}`, color: '#f59e0b', size: 'square', insightType: 'mars', data: { firstColonyYear: inputs?.mars?.firstColonyYear || 2030 } },
            { id: 'x-posts', icon: 'message-square', title: 'Key X Posts', value: 'Recent', color: '#1da1f2', size: 'vertical', insightType: 'x-feeds', data: {}, isSpecialTile: true, preferredPosition: { below: 'mars-timeline' } },
            { id: 'earth-operations', icon: 'globe', title: 'Earth Operations', value: `${earthPercent.toFixed(1)}%`, subtitle: formatBillion(earthValue), color: '#10b981', size: 'square', insightType: 'starlink-earth', data: { earthValue, earthPercent } },
            { id: 'mars-operations', icon: 'rocket', title: 'Mars Operations', value: `${marsPercent.toFixed(1)}%`, subtitle: formatBillion(marsValue), color: '#f59e0b', size: 'square', insightType: 'mars-optionality', data: { marsValue, marsPercent } },
            { id: 'revenue-growth', icon: 'trending-up', title: 'Revenue Growth', value: '25.0%', color: '#10b981', size: 'square', insightType: 'financial', data: {} },
            { id: 'margin-expansion', icon: 'arrow-up', title: 'Margin Expansion', value: '15.0%', color: '#10b981', size: 'square', insightType: 'financial', data: {} },
            { id: 'capex-efficiency', icon: 'zap', title: 'Capex Efficiency', value: '85.0%', color: '#0066cc', size: 'square', insightType: 'financial', data: {} },
            { id: 'discount-rate', icon: 'percent', title: 'Discount Rate', value: `${((inputs?.financial?.discountRate || 0.12) * 100).toFixed(1)}%`, color: inputs?.financial?.discountRate < 0.10 ? '#10b981' : inputs?.financial?.discountRate > 0.15 ? '#ef4444' : '#f59e0b', size: 'vertical', insightType: 'risk', data: { discountRate: inputs?.financial?.discountRate || 0.12 } },
            { id: 'news', icon: 'newspaper', title: 'Recent News', value: 'Latest', color: '#ef4444', size: 'square', insightType: 'news', data: {}, isSpecialTile: true, preferredPosition: { below: 'discount-rate' } }
        ];

        const tiles = this.packGridTiles(allTiles, 4);
        await this.renderDashboardGrid(tiles, data, inputs, gridContainer);
    }

    async renderDashboardGrid(tiles, data, inputs, gridContainer) {
        gridContainer.innerHTML = '';
        gridContainer.style.display = 'grid';
        gridContainer.style.gridTemplateColumns = 'repeat(4, 1fr)';
        gridContainer.style.gridTemplateRows = 'repeat(4, 1fr)';
        gridContainer.style.gap = 'var(--spacing-sm)';
        
        // Apply dense mode if enabled
        const denseToggle = document.getElementById('bloombergDenseToggle');
        if (denseToggle && denseToggle.checked) {
            gridContainer.classList.add('bloomberg-dense');
        }
        
        // Calculate height to fill available viewport space
        // Find the insights tab content container
        const insightsTabContent = gridContainer.closest('.insights-tab-content');
        const insightsView = gridContainer.closest('#insights');
        
        let availableHeight = 600; // Default fallback
        
        if (insightsTabContent && insightsView) {
            // Get viewport height
            const viewportHeight = window.innerHeight;
            
            // Get heights of elements above the grid
            const insightsTabs = insightsView.querySelector('.insights-tabs');
            const tabsHeight = insightsTabs ? insightsTabs.getBoundingClientRect().height : 50;
            
            // Get section padding/margins
            const section = gridContainer.closest('.section');
            const sectionRect = section ? section.getBoundingClientRect() : null;
            const sectionTop = sectionRect ? sectionRect.top : 0;
            
            // Calculate available height: viewport - tabs - section top offset - bottom padding
            const topOffset = sectionTop - (insightsTabs ? insightsTabs.getBoundingClientRect().bottom : 0);
            const bottomPadding = 32; // Reserve space for bottom padding/margins
            
            availableHeight = viewportHeight - tabsHeight - topOffset - bottomPadding;
            
            // Ensure minimum height
            availableHeight = Math.max(availableHeight, 600);
            
            console.log(`📏 Grid height calculation: viewport=${viewportHeight}px, tabs=${tabsHeight}px, topOffset=${topOffset}px, available=${availableHeight}px`);
        } else {
            // Fallback: use container or calculate from viewport
            const container = gridContainer.closest('.section') || gridContainer.parentElement;
            if (container) {
                const containerRect = container.getBoundingClientRect();
                availableHeight = containerRect.height || window.innerHeight - 200;
            } else {
                availableHeight = window.innerHeight - 200;
            }
        }
        
        // Set fixed height to ensure 4x4 grid constraint
        gridContainer.style.height = `${availableHeight}px`;
        gridContainer.style.minHeight = `${availableHeight}px`;
        gridContainer.style.maxHeight = `${availableHeight}px`;
        gridContainer.style.overflow = 'hidden';
        
        // Store grid dimensions for character calculations
        this.gridContainerHeight = availableHeight;
        
        // Wait for next frame to get accurate width after height is set
        requestAnimationFrame(() => {
            const rect = gridContainer.getBoundingClientRect();
            this.gridContainerWidth = rect.width || 1400;
            console.log(`📐 Grid dimensions: ${this.gridContainerWidth}px × ${this.gridContainerHeight}px`);
        });

        // Check for cached insights
        const modelCache = this.currentModelId && this.cachedTerminalInsights[this.currentModelId] ? this.cachedTerminalInsights[this.currentModelId] : {};
        
        // Check if we have cached insights for all tiles
        const tilesNeedingInsights = tiles.filter(tile => tile.insightType && data);
        const cachedCount = tilesNeedingInsights.filter(tile => {
            const cacheKey = `${tile.id}-${tile.insightType}`;
            return modelCache[cacheKey];
        }).length;
        const allTilesCached = tilesNeedingInsights.length > 0 && cachedCount === tilesNeedingInsights.length;
        
        console.log(`📋 Rendering dashboard: ${cachedCount}/${tilesNeedingInsights.length} tiles have cached insights (Model: ${this.currentModelId})`);
        
        // Store tiles for toggle re-rendering
        this.currentTiles = tiles;
        
        // Render tiles first, using cached insights if available
        for (const tile of tiles) {
            const cacheKey = `${tile.id}-${tile.insightType}`;
            let cachedInsight = modelCache[cacheKey] || null;
            
            // Coordinate cached insights - add charts if missing
            if (cachedInsight && (!cachedInsight.chart && !cachedInsight.image)) {
                const isNewsOrPost = tile.title.toLowerCase().includes('news') || 
                                   tile.title.toLowerCase().includes('post') ||
                                   tile.title.toLowerCase().includes('x post');
                if (!isNewsOrPost) {
                    const baseValue = parseFloat((tile.value || '0').replace(/[^0-9.]/g, '')) || 100;
                    cachedInsight = {
                        ...cachedInsight,
                        chart: {
                            type: 'line',
                            labels: ['2024', '2025', '2026', '2027', '2028'],
                            data: [
                                baseValue * 0.8,
                                baseValue * 0.9,
                                baseValue,
                                baseValue * 1.1,
                                baseValue * 1.2
                            ],
                            label: tile.title,
                            sparkline: false, // Show axes and interactivity
                            fill: false
                        }
                    };
                    // Update cache with coordinated data
                    modelCache[cacheKey] = cachedInsight;
                    console.log(`[Cache Coordination] ✅ Generated chart for cached tile ${tile.id}`);
                }
            }
            
            const tileHTML = this.renderDashboardTile(tile, cachedInsight, !cachedInsight);
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = tileHTML.trim();
            const tileElement = tempDiv.firstElementChild;
            if (tileElement) {
                gridContainer.appendChild(tileElement);
                
                // Render chart if present (for cached insights with charts)
                if (cachedInsight && cachedInsight.chart) {
                    requestAnimationFrame(() => {
                        setTimeout(() => {
                            const rendered = this.renderTileChart(tile.id, cachedInsight.chart, tile.color);
                            console.log(`[Initial Render] ${tile.id}: Chart render result:`, rendered ? 'SUCCESS' : 'FAILED');
                        }, 150);
                    });
                }
            }
        }
        if (window.lucide) window.lucide.createIcons();
        
        // Setup link click handlers for insight links
        this.setupInsightLinks();

        // Only load insights if not all tiles are cached
        // If all tiles have cached insights, skip the API call
        if (data && inputs && !allTilesCached) {
            console.log(`📊 ${tilesNeedingInsights.length - cachedCount} tiles missing cached insights, loading from API...`);
            // Wait a frame for tiles to be rendered and measured
            requestAnimationFrame(() => {
                this.loadTerminalInsightsInParallel(tiles, data, inputs, gridContainer).catch(err => {
                    console.error('Error loading terminal insights:', err);
                });
            });
        } else if (allTilesCached) {
            console.log('✅ All tiles have cached insights, using buffer - no API call needed');
        }
    }

    /**
     * Load all terminal insights in parallel - ensures only one process runs at a time
     * Called automatically on app init and model change
     */
    async loadTerminalInsightsInParallel(tiles, data, inputs, gridContainer) {
        // Prevent concurrent execution - if already loading, return existing promise
        if (this.loadingTerminalInsights) {
            console.log('⏸️ Terminal insights already loading - skipping duplicate request');
            return this.terminalInsightsLoadPromise;
        }

        // Check if we have required data
        if (!data || !inputs || !tiles || tiles.length === 0) {
            console.log('⏸️ Skipping terminal insights load - missing data or tiles');
            return;
        }

        // Initialize cache for this model if it doesn't exist
        if (!this.cachedTerminalInsights[this.currentModelId]) {
            this.cachedTerminalInsights[this.currentModelId] = {};
        }
        const modelCache = this.cachedTerminalInsights[this.currentModelId];

        // Filter tiles that need insights
        const tilesNeedingInsights = tiles.filter(tile => tile.insightType && data);

        if (tilesNeedingInsights.length === 0) {
            console.log('ℹ️ No tiles need insights');
            return;
        }

        // Check if all tiles already have cached insights
        const allTilesCached = tilesNeedingInsights.every(tile => {
            const cacheKey = `${tile.id}-${tile.insightType}`;
            return modelCache[cacheKey];
        });

        if (allTilesCached) {
            console.log('✅ All tiles already have cached insights, skipping API call');
            return;
        }

        // Set loading flag
        this.loadingTerminalInsights = true;
        console.log('🚀 Starting parallel terminal insights load...');

        // Create promise for this load operation
        this.terminalInsightsLoadPromise = (async () => {
            try {
                console.log(`📊 Loading insights for ${tilesNeedingInsights.length} tiles in batched parallel...`);

                // Batch parallel loading to avoid overwhelming rate limiter
                // Process 4 tiles at a time with small delays between batches
                // This balances speed with rate limit compliance
                const BATCH_SIZE = 4; // Process 4 tiles per batch
                const BATCH_DELAY_MS = 500; // 500ms delay between batches
                
                // Helper function to load insight for a single tile
                const loadTileInsight = async (tile) => {
                    // Check cache first
                    const cacheKey = `${tile.id}-${tile.insightType}`;
                    if (modelCache[cacheKey]) {
                        let cachedInsight = modelCache[cacheKey];
                        
                        // Coordinate cached insights - add charts if missing
                        if (!cachedInsight.chart && !cachedInsight.image) {
                            const isNewsOrPost = tile.title.toLowerCase().includes('news') || 
                                               tile.title.toLowerCase().includes('post') ||
                                               tile.title.toLowerCase().includes('x post');
                            if (!isNewsOrPost) {
                                const baseValue = parseFloat((tile.value || '0').replace(/[^0-9.]/g, '')) || 100;
                                cachedInsight = {
                                    ...cachedInsight,
                                    chart: {
                                        type: 'line',
                                        labels: ['2024', '2025', '2026', '2027', '2028'],
                                        data: [
                                            baseValue * 0.8,
                                            baseValue * 0.9,
                                            baseValue,
                                            baseValue * 1.1,
                                            baseValue * 1.2
                                        ],
                                        label: tile.title,
                                        sparkline: false,
                                        fill: false
                                    }
                                };
                                modelCache[cacheKey] = cachedInsight;
                                console.log(`[Cache Coordination] ✅ Added chart to cached tile ${tile.id}`);
                            }
                        }
                        
                        console.log(`✅ Using cached insight for tile ${tile.id} (Chart: ${cachedInsight.chart ? 'YES' : 'NO'})`);
                        
                        return {
                            tileId: tile.id,
                            insightData: cachedInsight,
                            error: null,
                            fromCache: true
                        };
                    }

                    try {
                        // Show loading spinner for this tile
                        const tileElement = gridContainer.querySelector(`[data-tile-id="${tile.id}"]`);
                        if (tileElement) {
                            const contentArea = tileElement.querySelector('.tile-content-dual, .tile-prose');
                            if (contentArea && !contentArea.querySelector('.tile-loading')) {
                                contentArea.innerHTML = `
                                    <div class="tile-loading" style="
                                        display: flex;
                                        align-items: center;
                                        justify-content: center;
                                        height: 100%;
                                        flex-direction: column;
                                        gap: 8px;
                                    ">
                                        <i data-lucide="loader" class="spinning" style="width: 20px; height: 20px; color: ${tile.color || '#0066cc'};"></i>
                                        <div style="font-size: 9px; color: var(--text-secondary);">Loading...</div>
                                    </div>
                                `;
                                if (window.lucide) window.lucide.createIcons();
                            }
                        }
                        
                        const contentLimits = this.getTileContentLimits(tile.size, tileElement);
                        console.log(`📏 Tile ${tile.id} (${tile.size}): ${contentLimits.chars} chars, ${contentLimits.words} words`);
                        
                        const response = await fetch('/api/insights/enhanced', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                valuationData: data,
                                inputs: inputs,
                                tileId: tile.id,
                                tileTitle: tile.title,
                                tileValue: tile.value,
                                tileSize: tile.size,
                                contentLimits: contentLimits,
                                context: {
                                    metric: tile.title,
                                    value: tile.value,
                                    subtitle: tile.subtitle,
                                    tileType: tile.insightType
                                }
                            })
                        });
                        const result = await response.json();
                        const insightData = result.success ? result.data : null;
                        
                        if (insightData) {
                            modelCache[cacheKey] = insightData;
                            console.log(`💾 Cached insight for tile ${tile.id}`);
                        }
                        
                        return {
                            tileId: tile.id,
                            insightData: insightData,
                            error: result.success ? null : result.error,
                            fromCache: false
                        };
                    } catch (error) {
                        console.error(`Error fetching insight for tile ${tile.id}:`, error);
                        return {
                            tileId: tile.id,
                            insightData: null,
                            error: error.message,
                            fromCache: false
                        };
                    }
                };
                
                // Process tiles in batches
                const insightPromises = [];
                for (let i = 0; i < tilesNeedingInsights.length; i += BATCH_SIZE) {
                    const batch = tilesNeedingInsights.slice(i, i + BATCH_SIZE);
                    const batchIndex = Math.floor(i / BATCH_SIZE) + 1;
                    const totalBatches = Math.ceil(tilesNeedingInsights.length / BATCH_SIZE);
                    
                    // Add delay before this batch (except first batch)
                    if (i > 0) {
                        console.log(`📦 Processing batch ${batchIndex}/${totalBatches} (${batch.length} tiles)...`);
                        await new Promise(resolve => setTimeout(resolve, BATCH_DELAY_MS));
                    }
                    
                    // Create promises for this batch (they'll execute in parallel within the batch)
                    batch.forEach(tile => {
                        insightPromises.push(loadTileInsight(tile));
                    });
                }

                // Progressive rendering: Update tiles as they load instead of waiting for all
                // This makes the UI feel much faster - tiles appear as soon as their data arrives
                const updateTile = ({ tileId, insightData, error, fromCache }) => {
                    const tileElement = gridContainer.querySelector(`[data-tile-id="${tileId}"]`);
                    if (!tileElement) return;
                    
                    // Find the tile definition
                    const tile = tiles.find(t => t.id === tileId);
                    if (!tile) return;
                    
                    if (insightData) {
                            // Coordinate insight data if it doesn't have chart/image
                            if (!insightData.chart && !insightData.image) {
                                const isNewsOrPost = tile.title.toLowerCase().includes('news') || 
                                                   tile.title.toLowerCase().includes('post') ||
                                                   tile.title.toLowerCase().includes('x post');
                                if (!isNewsOrPost) {
                                    // Extract numeric value from tile.value (handles formats like "$1.8T", "15.0%", "100/year")
                                    let baseValue = 100; // default
                                    const valueStr = (tile.value || '0').toString();
                                    const numMatch = valueStr.match(/[\d.]+/);
                                    if (numMatch) {
                                        baseValue = parseFloat(numMatch[0]);
                                        // Adjust for T (trillions) or B (billions)
                                        if (valueStr.includes('T')) baseValue *= 1000;
                                        // For percentages, use as-is
                                        if (valueStr.includes('%')) baseValue = baseValue;
                                        // For "100/year", use as-is
                                    }
                                    
                                    insightData = {
                                        ...insightData,
                                        chart: {
                                            type: 'line',
                                            labels: ['2024', '2025', '2026', '2027', '2028'],
                                            data: [
                                                baseValue * 0.8,
                                                baseValue * 0.9,
                                                baseValue,
                                                baseValue * 1.1,
                                                baseValue * 1.2
                                            ],
                                            label: tile.title,
                                            sparkline: false, // Show axes and interactivity
                                            fill: false
                                        }
                                    };
                                    // Update cache
                                    const cacheKey = `${tileId}-${tile.insightType}`;
                                    if (this.cachedTerminalInsights[this.currentModelId]) {
                                        this.cachedTerminalInsights[this.currentModelId][cacheKey] = insightData;
                                    }
                                    console.log(`[Tile Update Coordination] ✅ Added chart to ${tileId} (baseValue: ${baseValue}, valueStr: "${tile.value}")`);
                                }
                            }
                            
                            // Log what we're about to render
                            console.log(`[Tile Update] ${tileId}: Chart=${insightData?.chart ? 'YES' : 'NO'}, Image=${insightData?.image ? 'YES' : 'NO'}, News=${insightData?.news ? `YES (${insightData.news.length} items)` : 'NO'}, XFeeds=${insightData?.xFeeds ? `YES (${insightData.xFeeds.length} items)` : 'NO'}`);
                            
                            // Update tile content with insight data
                            const updatedHTML = this.renderDashboardTile(tile, insightData, false);
                            const tempDiv = document.createElement('div');
                            tempDiv.innerHTML = updatedHTML.trim();
                            const updatedElement = tempDiv.firstElementChild;
                            if (updatedElement) {
                                // Preserve grid position
                                updatedElement.style.gridColumn = tileElement.style.gridColumn;
                                updatedElement.style.gridRow = tileElement.style.gridRow;
                                tileElement.replaceWith(updatedElement);
                                
                                // Render chart if present (after DOM update)
                                if (insightData && insightData.chart) {
                                    console.log(`[Tile Update] ${tileId}: Rendering chart with data:`, insightData.chart);
                                    // Use multiple frames to ensure DOM is fully ready
                                    requestAnimationFrame(() => {
                                        requestAnimationFrame(() => {
                                            setTimeout(() => {
                                                const rendered = this.renderTileChart(tileId, insightData.chart, tile.color);
                                                console.log(`[Tile Update] ${tileId}: Chart render result:`, rendered ? 'SUCCESS' : 'FAILED');
                                                
                                                // Double-check chart is visible
                                                if (rendered) {
                                                    const canvas = updatedElement.querySelector('.tile-mini-chart');
                                                    if (canvas && canvas.chartInstance) {
                                                        setTimeout(() => {
                                                            canvas.chartInstance.update('none');
                                                            console.log(`[Tile Update] ${tileId}: Chart force-updated`);
                                                        }, 100);
                                                    }
                                                }
                                            }, 200);
                                        });
                                    });
                                } else {
                                    console.log(`[Tile Update] ${tileId}: No chart data to render`);
                                }
                            }
                        }
                };

                // Process insights as they complete (progressive rendering)
                // Each tile updates immediately when its data arrives, not waiting for others
                let completedCount = 0;
                const totalTiles = insightPromises.length;
                
                // Update tiles as each promise resolves (progressive rendering)
                insightPromises.forEach(async (promise) => {
                    try {
                        const result = await promise;
                        updateTile(result);
                        completedCount++;
                        
                        // Refresh icons after each update (progressive)
                        if (window.lucide) window.lucide.createIcons();
                        
                        if (completedCount === totalTiles) {
                            console.log(`✅ All terminal insights loaded: ${completedCount}/${totalTiles} tiles`);
                        }
                    } catch (error) {
                        console.error(`❌ Failed to load insight:`, error);
                        completedCount++;
                    }
                });

                // Also wait for all to complete for final status
                await Promise.allSettled(insightPromises);
                console.log(`✅ Terminal insights loading complete: ${completedCount}/${totalTiles} tiles`);
            } catch (error) {
                console.error('❌ Error loading terminal insights in parallel:', error);
            } finally {
                // Clear loading flag
                this.loadingTerminalInsights = false;
                this.terminalInsightsLoadPromise = null;
            }
        })();

        // Return promise (but don't await - let it run in background)
        return this.terminalInsightsLoadPromise;
    }

    packGridTiles(tiles, gridColumns) {
        const maxRows = 4; // Fixed 4x4 grid (16 cells total)
        const maxCells = 16; // Hard constraint: 4 columns × 4 rows
        const occupied = new Set();
        let totalCellsUsed = 0;
        const maxIterations = tiles.length * 2; // Prevent infinite loops
        let iteration = 0;
        
        const isAvailable = (col, row, width, height) => {
            // Check if tile fits within grid bounds (4 columns x 4 rows)
            if (col + width > gridColumns || row + height > maxRows) {
                return false;
            }
            // Check if adding this tile would exceed 16 cell limit
            const cellsNeeded = width * height;
            if (totalCellsUsed + cellsNeeded > maxCells) {
                return false;
            }
            // Check if cells are already occupied
            for (let r = row; r < row + height; r++) {
                for (let c = col; c < col + width; c++) {
                    if (c >= gridColumns || r >= maxRows || occupied.has(`${c},${r}`)) {
                        return false;
                    }
                }
            }
            return true;
        };
        
        const markOccupied = (col, row, width, height) => {
            for (let r = row; r < row + height; r++) {
                for (let c = col; c < col + width; c++) {
                    occupied.add(`${c},${r}`);
                }
            }
            totalCellsUsed += width * height;
        };

        // Priority: larger tiles first (they're harder to place)
        // Also prioritize tiles that other tiles depend on (like mars-operations before news)
        const tilePriority = { 
            'large': 0, 
            '2x2': 0, 
            'vertical': 1, 
            '1x2': 1, 
            'horizontal': 2, 
            '2x1': 2, 
            'square': 3 
        };
        
        // Sort tiles by size priority only - no hardcoded ordering
        const sortedTiles = [...tiles].sort((a, b) => {
            const priorityA = tilePriority[a.size] || 3;
            const priorityB = tilePriority[b.size] || 3;
            
            // If same priority and one depends on the other, ensure dependency is placed first
            if (priorityA === priorityB) {
                // If 'a' wants to be below 'b', place 'b' first
                if (a.preferredPosition?.below === b.id) {
                    return 1; // 'a' comes after 'b'
                }
                // If 'b' wants to be below 'a', place 'a' first
                if (b.preferredPosition?.below === a.id) {
                    return -1; // 'a' comes before 'b'
                }
            }
            
            return priorityA - priorityB;
        });

        const placedTiles = [];
        const tilePositions = new Map(); // Track positions for preferred placement
        const unplacedTiles = [...sortedTiles]; // Tiles waiting to be placed
        
        // Place tiles - may need multiple passes for tiles with preferred positions
        while (unplacedTiles.length > 0 && iteration < maxIterations) {
            iteration++;
            const tilesToPlace = [...unplacedTiles];
            unplacedTiles.length = 0; // Clear for this iteration
            
            for (const tile of tilesToPlace) {
                let placed = false;
                let width = 1;
                let height = 1;
            
                // Map tile size to grid cells
                if (tile.size === 'horizontal' || tile.size === '2x1') {
                    width = 2;
                    height = 1;
                } else if (tile.size === 'vertical' || tile.size === '1x2') {
                    width = 1;
                    height = 2;
                } else if (tile.size === 'large' || tile.size === '2x2') {
                    width = 2;
                    height = 2;
                }
                // else: square = 1x1 (default)

                // Check for preferred position (e.g., below another tile)
                if (tile.preferredPosition?.below && !placed) {
                    const belowTileId = tile.preferredPosition.below;
                    const belowTile = placedTiles.find(t => t.id === belowTileId);
                    
                    if (!belowTile) {
                        // Target tile not placed yet - skip preferred position for now, will try again in next iteration
                        // But we need to ensure the target tile is placed first, so defer this tile
                        console.log(`⏳ Deferring ${tile.id} - waiting for ${belowTileId} to be placed first`);
                    } else if (belowTile.gridColumn && belowTile.gridRow) {
                        // Extract column and row from gridColumn/gridRow (e.g., "2 / 3" -> col 1, row 1)
                        const colMatch = belowTile.gridColumn.match(/(\d+)\s*\/\s*\d+/);
                        const rowMatch = belowTile.gridRow.match(/(\d+)\s*\/\s*\d+/);
                        
                        if (colMatch && rowMatch) {
                            const belowTileStartCol = parseInt(colMatch[1]) - 1; // Convert to 0-based
                            const belowTileStartRow = parseInt(rowMatch[1]) - 1; // Convert to 0-based
                            
                            // Calculate tile height from its size
                            let belowTileHeight = 1;
                            if (belowTile.size === 'large' || belowTile.size === '2x2') {
                                belowTileHeight = 2;
                            } else if (belowTile.size === 'vertical' || belowTile.size === '1x2') {
                                belowTileHeight = 2;
                            }
                            
                            // Calculate preferred position: same column, row directly below
                            const preferredCol = belowTileStartCol;
                            const preferredRow = belowTileStartRow + belowTileHeight;
                            
                            // Try to place in preferred position first
                            if (preferredRow < maxRows && preferredCol + width <= gridColumns) {
                                if (isAvailable(preferredCol, preferredRow, width, height)) {
                                    tile.gridColumn = `${preferredCol + 1} / ${preferredCol + width + 1}`;
                                    tile.gridRow = `${preferredRow + 1} / ${preferredRow + height + 1}`;
                                    markOccupied(preferredCol, preferredRow, width, height);
                                    placedTiles.push(tile);
                                    tilePositions.set(tile.id, { col: preferredCol, row: preferredRow, width, height });
                                    placed = true;
                                    console.log(`✅ Placed ${tile.id} below ${belowTileId} at col ${preferredCol + 1}, row ${preferredRow + 1}`);
                                }
                            }
                        }
                    }
                }

                // If not placed in preferred position, try normal placement (top-to-bottom, left-to-right)
                if (!placed) {
                    for (let row = 0; row < maxRows && !placed; row++) {
                        for (let col = 0; col <= gridColumns - width && !placed; col++) {
                            // Check if tile fits within the 4-row limit
                            if (row + height > maxRows) {
                                continue; // Skip if tile would exceed row limit
                            }
                            if (isAvailable(col, row, width, height)) {
                                tile.gridColumn = `${col + 1} / ${col + width + 1}`;
                                tile.gridRow = `${row + 1} / ${row + height + 1}`;
                                markOccupied(col, row, width, height);
                                placedTiles.push(tile);
                                tilePositions.set(tile.id, { col, row, width, height });
                                placed = true;
                            }
                        }
                    }
                }

                // If tile couldn't be placed, add it back to unplaced list
                if (!placed) {
                    // If it has a preferred position and target isn't placed yet, defer it
                    if (tile.preferredPosition?.below) {
                        const targetTile = placedTiles.find(t => t.id === tile.preferredPosition.below);
                        if (!targetTile) {
                            unplacedTiles.push(tile); // Try again next iteration
                            continue;
                        }
                    }
                    // Otherwise, try normal placement failed - add back to try again
                    unplacedTiles.push(tile);
                }
            }
        }
        
        // Warn about any tiles that still couldn't be placed
        if (unplacedTiles.length > 0) {
            console.warn(`⚠️ Could not place ${unplacedTiles.length} tiles: ${unplacedTiles.map(t => t.id).join(', ')}. Cells used: ${totalCellsUsed}/16`);
        }
        
        console.log(`📊 Grid packing complete: ${placedTiles.length}/${tiles.length} tiles placed, ${totalCellsUsed}/16 cells used`);
        return placedTiles;
    }

    // Calculate character and word limits dynamically based on 4x4 grid cell dimensions
    getTileContentLimits(tileSize, tileElement = null) {
        // Standardized font: 12px, line-height 1.4
        // Average character width: ~7px (monospace approximation)
        // Average word length: ~5 chars
        // Header takes ~40px height, padding ~8px total, border ~2px
        
        const gridContainer = document.getElementById('dashboardGrid');
        if (!gridContainer) {
            // Fallback if grid not found
            const limits = {
                'square': { chars: 400, words: 80 },
                'horizontal': { chars: 800, words: 160 },
                '2x1': { chars: 800, words: 160 },
                'vertical': { chars: 900, words: 180 },
                '1x2': { chars: 900, words: 180 },
                'large': { chars: 1800, words: 360 },
                '2x2': { chars: 1800, words: 360 }
            };
            return limits[tileSize] || limits.square;
        }
        
        // Get actual grid container dimensions
        const containerRect = gridContainer.getBoundingClientRect();
        const gridWidth = containerRect.width || this.gridContainerWidth || 1400;
        const gridHeight = containerRect.height || this.gridContainerHeight || 600;
        const gap = 8; // var(--spacing-sm) = 8px
        
        // Calculate single cell dimensions (accounting for gaps)
        const cellWidth = (gridWidth - (gap * 3)) / 4; // 3 gaps between 4 columns
        const cellHeight = (gridHeight - (gap * 3)) / 4; // 3 gaps between 4 rows
        
        // Calculate tile dimensions based on size (in grid cells)
        let tileWidth, tileHeight;
        if (tileSize === 'square') {
            tileWidth = cellWidth;
            tileHeight = cellHeight;
        } else if (tileSize === 'horizontal' || tileSize === '2x1') {
            tileWidth = (cellWidth * 2) + gap; // 2 cells + 1 gap
            tileHeight = cellHeight;
        } else if (tileSize === 'vertical' || tileSize === '1x2') {
            tileWidth = cellWidth;
            tileHeight = (cellHeight * 2) + gap; // 2 cells + 1 gap
        } else if (tileSize === 'large' || tileSize === '2x2') {
            tileWidth = (cellWidth * 2) + gap; // 2 cells + 1 gap
            tileHeight = (cellHeight * 2) + gap; // 2 cells + 1 gap
        } else {
            tileWidth = cellWidth;
            tileHeight = cellHeight;
        }
        
        // If we have the actual rendered tile element, use its dimensions (more accurate)
        if (tileElement) {
            const rect = tileElement.getBoundingClientRect();
            tileWidth = rect.width;
            tileHeight = rect.height;
        }
        
        // Calculate available text area (subtract header, padding, border)
        const headerHeight = 40;
        const padding = 8; // Total padding (2px on all sides)
        const border = 2; // Border top for insight section
        const availableHeight = tileHeight - headerHeight - padding - border;
        const availableWidth = tileWidth - padding;
        
        // Calculate characters per line and lines
        const charsPerLine = Math.floor(availableWidth / 7); // ~7px per char
        const lines = Math.floor(availableHeight / (12 * 1.4)); // 12px font, 1.4 line-height
        const totalChars = Math.floor(charsPerLine * lines * 0.85); // 85% to account for word wrapping
        const totalWords = Math.floor(totalChars / 5); // ~5 chars per word
        
        return {
            chars: Math.max(100, totalChars), // Minimum 100 chars
            words: Math.max(20, totalWords)    // Minimum 20 words
        };
    }

    renderDashboardTile(tile, aiData, isLoading = false) {
        const tileStyles = {
            square: { gridColumn: tile.gridColumn || 'auto', gridRow: tile.gridRow || 'auto' },
            horizontal: { gridColumn: tile.gridColumn || 'span 2', gridRow: tile.gridRow || 'auto' },
            '2x1': { gridColumn: tile.gridColumn || 'span 2', gridRow: tile.gridRow || 'auto' },
            vertical: { gridColumn: tile.gridColumn || 'auto', gridRow: tile.gridRow || 'span 2' },
            '1x2': { gridColumn: tile.gridColumn || 'auto', gridRow: tile.gridRow || 'span 2' },
            large: { gridColumn: tile.gridColumn || 'span 2', gridRow: tile.gridRow || 'span 2' },
            '2x2': { gridColumn: tile.gridColumn || 'span 2', gridRow: tile.gridRow || 'span 2' }
        };

        const style = tileStyles[tile.size] || tileStyles.square;
        const hasAI = aiData && aiData.insight;
        const isLarge = tile.size === 'large' || tile.size === '2x2';
        const isVertical = tile.size === 'vertical' || tile.size === '1x2';
        const isHorizontal = tile.size === 'horizontal' || tile.size === '2x1';
        
        // Standardized font sizes across all tiles
        const titleSize = '7px';
        const valueSize = '14px';
        const subtitleSize = '9px';
        const insightSize = '12px'; // Standard font size for all insight text
        const iconSize = '10px';
        const iconContainerSize = '16px';

        const isSpecialTile = tile.isSpecialTile;
        const specialContent = isSpecialTile && aiData ? this.renderSpecialTileContent(tile, aiData) : '';
        
        // For special tiles, ignore visualizations - only render special content
        // Check for visualizations (chart or image) - but skip for special tiles
        const hasChart = !isSpecialTile && aiData && aiData.chart && aiData.chart.data && Array.isArray(aiData.chart.data);
        const hasImage = !isSpecialTile && aiData && aiData.image && (aiData.image.url || typeof aiData.image === 'string');
        const hasVisualization = hasChart || hasImage;
        const visualization = hasChart ? aiData.chart : (hasImage ? aiData.image : null);
        const visualizationType = hasChart ? 'chart' : (hasImage ? 'image' : null);
        
        // Determine layout: prose + visualization (Bloomberg style)
        const useDualLayout = !isSpecialTile && hasAI && hasVisualization;
        
        return `
            <div class="dashboard-tile" data-tile-id="${tile.id}" style="
                grid-column: ${style.gridColumn};
                grid-row: ${style.gridRow};
                background: var(--surface);
                border: 1px solid var(--border-color);
                border-radius: var(--radius);
                padding: ${isLarge ? '4px' : (isVertical ? '3px' : '2px')};
                display: flex;
                flex-direction: column;
                transition: all 0.2s;
                cursor: pointer;
                min-height: 0;
                position: relative;
                justify-content: flex-start;
                gap: 0;
                overflow: hidden;
                height: 100%;
            " onmouseover="this.style.boxShadow='0 4px 12px rgba(0,0,0,0.1)'; this.style.borderColor='${tile.color}'; this.style.transform='translateY(-2px)'" onmouseout="this.style.boxShadow='none'; this.style.borderColor='var(--border-color)'; this.style.transform='none'">
                <div class="tile-header" style="display: flex; align-items: start; gap: 2px; margin-bottom: ${hasAI && !isSpecialTile ? '1px' : '2px'}; flex-shrink: 0; min-height: fit-content;">
                    <div class="tile-icon-container" style="
                        width: ${iconContainerSize};
                        height: ${iconContainerSize};
                        min-width: ${iconContainerSize};
                        min-height: ${iconContainerSize};
                        max-width: ${iconContainerSize};
                        max-height: ${iconContainerSize};
                        border-radius: 2px;
                        background: ${tile.color}08;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        flex-shrink: 0;
                    ">
                        <i data-lucide="${tile.icon}" class="tile-icon" style="width: ${iconSize}; height: ${iconSize}; max-width: ${iconSize}; max-height: ${iconSize}; color: ${tile.color};"></i>
                    </div>
                    <div style="flex: 1; min-width: 0; overflow: hidden; max-width: calc(100% - ${iconContainerSize} - 4px);">
                        <div class="tile-title" style="font-size: ${titleSize}; color: var(--text-secondary); margin-bottom: 0px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.2px; line-height: 1.0;">${tile.title}</div>
                        <div class="tile-value" style="font-size: ${valueSize}; font-weight: 700; color: var(--text-primary); line-height: 1.0;">
                            ${tile.value}
                            ${tile.subtitle ? `<div class="tile-subtitle" style="font-size: ${subtitleSize}; font-weight: 500; color: var(--text-secondary); margin-top: 0px;">${tile.subtitle}</div>` : ''}
                        </div>
                    </div>
                </div>
                ${isSpecialTile ? specialContent : (isLoading ? `
                    <!-- Loading state with spinner -->
                    <div class="tile-loading" style="
                        margin-top: 2px;
                        padding-top: 2px;
                        border-top: 1px solid var(--border-color);
                        flex: 1 1 auto;
                        min-height: 0;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        height: 100%;
                        flex-direction: column;
                        gap: 8px;
                    ">
                        <i data-lucide="loader" class="spinning" style="width: 20px; height: 20px; color: ${tile.color};"></i>
                        <div style="font-size: 9px; color: var(--text-secondary);">Loading insights...</div>
                    </div>
                ` : (hasAI ? `
                    <div class="tile-content-dual" style="
                        margin-top: 2px;
                        padding-top: 2px;
                        border-top: 1px solid var(--border-color);
                        flex: 1 1 auto;
                        min-height: 0;
                        display: ${useDualLayout ? 'grid' : 'flex'};
                        ${useDualLayout ? 'grid-template-columns: 1fr; grid-template-rows: auto 1fr; gap: 4px;' : 'flex-direction: column;'}
                        height: 100%;
                        overflow: hidden;
                    ">
                        ${useDualLayout ? `
                            <!-- Bloomberg-style: Visualization first (top) -->
                            <div class="tile-visualization" style="
                                width: 100%;
                                height: ${isLarge ? '80px' : (isVertical ? '60px' : '50px')};
                                min-height: ${isLarge ? '80px' : (isVertical ? '60px' : '50px')};
                                flex-shrink: 0;
                                background: var(--background);
                                border: 0.5px solid var(--border-color);
                                border-radius: 2px;
                                padding: 2px;
                                display: flex;
                                align-items: center;
                                justify-content: center;
                                overflow: hidden;
                            ">
                                ${visualizationType === 'chart' ? `
                                    <canvas class="tile-mini-chart" data-tile-id="${tile.id}" style="width: 100%; height: 100%;"></canvas>
                                ` : visualizationType === 'image' ? `
                                    <img src="${visualization.url || visualization}" alt="${visualization.alt || tile.title}" style="
                                        width: 100%;
                                        height: 100%;
                                        object-fit: cover;
                                        border-radius: 1px;
                                    " onerror="this.style.display='none'; this.parentElement.innerHTML='<div style=\\'color: var(--text-secondary); font-size: 8px;\\'>Image unavailable</div>';">
                                ` : ''}
                            </div>
                            <!-- Prose below visualization -->
                            <div class="tile-prose" style="
                                font-size: ${insightSize};
                                color: var(--text-secondary);
                                line-height: 1.2;
                                overflow-y: auto;
                                word-wrap: break-word;
                                overflow-wrap: break-word;
                                flex: 1;
                                min-height: 0;
                            ">
                                ${this.processInsightLinks(aiData.insight || '')}
                            </div>
                        ` : `
                            <!-- Text-only layout -->
                            <div class="tile-prose" style="
                                font-size: ${insightSize};
                                color: var(--text-secondary);
                                line-height: 1.2;
                                flex: 1 1 auto;
                                overflow-y: auto;
                                word-wrap: break-word;
                                overflow-wrap: break-word;
                                min-height: 0;
                                height: 100%;
                            ">
                                ${this.processInsightLinks(aiData.insight || '')}
                            </div>
                        `}
                    </div>
                ` : '<div style="flex: 1;"></div>'))}
            </div>
        `;
    }

    toggleBloombergDenseMode(enabled) {
        const gridContainer = document.getElementById('dashboardGrid');
        const insightsView = document.getElementById('insights');
        
        if (enabled) {
            gridContainer?.classList.add('bloomberg-dense');
            insightsView?.classList.add('bloomberg-dense');
        } else {
            gridContainer?.classList.remove('bloomberg-dense');
            insightsView?.classList.remove('bloomberg-dense');
        }
        
        // Re-render tiles to apply new styles
        if (gridContainer && this.currentData) {
            const tiles = Array.from(gridContainer.querySelectorAll('[data-tile-id]')).map(el => {
                const tileId = el.getAttribute('data-tile-id');
                const tile = this.currentTiles?.find(t => t.id === tileId);
                if (tile) {
                    const cacheKey = `${tile.id}-${tile.insightType}`;
                    const modelCache = this.currentModelId && this.cachedTerminalInsights[this.currentModelId] ? this.cachedTerminalInsights[this.currentModelId] : {};
                    const cachedInsight = modelCache[cacheKey] || null;
                    return { tile, insight: cachedInsight };
                }
                return null;
            }).filter(Boolean);
            
            // Re-render tiles with updated styles
            tiles.forEach(({ tile, insight }) => {
                const tileElement = gridContainer.querySelector(`[data-tile-id="${tile.id}"]`);
                if (tileElement) {
                    const newHTML = this.renderDashboardTile(tile, insight);
                    const tempDiv = document.createElement('div');
                    tempDiv.innerHTML = newHTML.trim();
                    const newElement = tempDiv.firstElementChild;
                    if (newElement) {
                        newElement.style.gridColumn = tileElement.style.gridColumn;
                        newElement.style.gridRow = tileElement.style.gridRow;
                        tileElement.replaceWith(newElement);
                    }
                }
            });
            
            if (window.lucide) window.lucide.createIcons();
            this.setupInsightLinks();
        }
    }

    setupInsightLinks() {
        // Handle view links (internal navigation)
        document.querySelectorAll('.insight-link[data-view-link]').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const viewPath = link.getAttribute('data-view-link');
                const [view, tab, subTab] = viewPath.split(':');
                if (view) {
                    this.switchView(view);
                    if (tab) {
                        setTimeout(() => {
                            const tabButton = document.querySelector(`[data-tab="${tab}"]`);
                            tabButton?.click();
                            if (subTab) {
                                setTimeout(() => {
                                    const subTabButton = document.querySelector(`[data-sub-tab="${subTab}"]`);
                                    subTabButton?.click();
                                }, 100);
                            }
                        }, 100);
                    }
                }
            });
        });
    }

    /**
     * Render a chart for a specific tile
     */
    renderTileChart(tileId, chartData, tileColor) {
        const tileElement = document.querySelector(`[data-tile-id="${tileId}"]`);
        if (!tileElement) {
            console.warn(`[Chart Render] Tile element not found: ${tileId}`);
            return null;
        }
        
        const chartCanvas = tileElement.querySelector('.tile-mini-chart');
        if (!chartCanvas) {
            console.warn(`[Chart Render] Chart canvas not found for tile: ${tileId}`);
            return null;
        }
        
        if (!chartData || !chartData.data || !Array.isArray(chartData.data)) {
            console.warn(`[Chart Render] Invalid chart data for tile: ${tileId}`, chartData);
            return null;
        }
        
        if (!window.Chart) {
            console.error(`[Chart Render] Chart.js not loaded!`);
            return null;
        }
        
        // Destroy existing chart if present
        if (chartCanvas.chartInstance) {
            chartCanvas.chartInstance.destroy();
        }
        
        // Assign a consistent point style based on tileId hash for variety
        if (!chartData.pointStyle) {
            const pointStyles = ['circle', 'triangle', 'rect', 'rectRot', 'star', 'cross', 'crossRot', 'dash'];
            // Use tileId to deterministically assign a style
            let hash = 0;
            for (let i = 0; i < tileId.length; i++) {
                hash = ((hash << 5) - hash) + tileId.charCodeAt(i);
                hash = hash & hash; // Convert to 32-bit integer
            }
            chartData.pointStyle = pointStyles[Math.abs(hash) % pointStyles.length];
        }
        
        console.log(`[Chart Render] Creating chart for ${tileId} with ${chartData.data.length} data points`);
        
        // Create new chart
        const chartInstance = this.createMiniChart(chartCanvas, chartData, tileColor);
        if (chartInstance) {
            chartCanvas.chartInstance = chartInstance;
            console.log(`[Chart Render] ✅ Chart created successfully for ${tileId}`);
            return chartInstance;
        } else {
            console.error(`[Chart Render] ❌ Failed to create chart for ${tileId}`);
            return null;
        }
    }

    /**
     * Create a mini Bloomberg-style chart for a tile
     */
    createMiniChart(canvasElement, chartData, tileColor) {
        if (!canvasElement) {
            console.error('[createMiniChart] No canvas element provided');
            return null;
        }
        if (!chartData) {
            console.error('[createMiniChart] No chart data provided');
            return null;
        }
        if (!window.Chart) {
            console.error('[createMiniChart] Chart.js not loaded');
            return null;
        }
        
        // Get context after setting dimensions (will be re-gotten after scaling)
        let ctx = canvasElement.getContext('2d');
        if (!ctx) {
            console.error('[createMiniChart] Could not get 2d context');
            return null;
        }
        
        const chartType = chartData.type || 'line';
        // Default to showing axes and interactivity (sparkline only if explicitly requested)
        const isSparkline = chartData.sparkline === true; // Only sparkline if explicitly set to true
        
        // Ensure data arrays exist and match
        const labels = chartData.labels || ['2024', '2025', '2026', '2027', '2028'];
        let data = chartData.data || [];
        
        // Ensure data matches labels length
        while (data.length < labels.length) {
            const lastValue = data[data.length - 1] || 100;
            data.push(lastValue * 1.1);
        }
        while (data.length > labels.length) {
            data.pop();
        }
        
        // Convert hex to rgba for background with opacity (helper function)
        const hexToRgba = (hex, alpha) => {
            if (!hex || !hex.startsWith('#')) return `rgba(0, 102, 204, ${alpha})`;
            const r = parseInt(hex.slice(1, 3), 16);
            const g = parseInt(hex.slice(3, 5), 16);
            const b = parseInt(hex.slice(5, 7), 16);
            return `rgba(${r}, ${g}, ${b}, ${alpha})`;
        };
        
        // Normalize tile color - ensure it's a valid hex color
        let normalizedColor = tileColor || '#0066cc';
        if (normalizedColor && !normalizedColor.startsWith('#')) {
            // Convert CSS color names or rgb() to hex if needed
            normalizedColor = '#0066cc'; // Fallback
        }
        if (!normalizedColor.match(/^#[0-9A-Fa-f]{6}$/)) {
            normalizedColor = '#0066cc'; // Ensure valid hex
        }
        
        console.log(`[createMiniChart] Creating ${chartType} chart with ${data.length} data points, color: ${normalizedColor}`);
        
        // Ensure canvas has explicit dimensions (Chart.js needs this)
        // Wait for container to be fully rendered before measuring
        const container = canvasElement.parentElement;
        let containerWidth = 100;
        let containerHeight = 50;
        
        if (container) {
            // Force a reflow to ensure dimensions are accurate
            const rect = container.getBoundingClientRect();
            containerWidth = rect.width || container.clientWidth || container.offsetWidth || 100;
            containerHeight = rect.height || container.clientHeight || container.offsetHeight || 50;
            
            // Ensure minimum dimensions
            if (containerWidth < 50) containerWidth = 100;
            if (containerHeight < 30) containerHeight = 50;
            
            // Set canvas size attributes (not CSS) for proper rendering
            // Chart.js needs these to be set before creating the chart
            // Chart.js will handle devicePixelRatio automatically via options
            canvasElement.width = containerWidth;
            canvasElement.height = containerHeight;
            canvasElement.setAttribute('width', containerWidth);
            canvasElement.setAttribute('height', containerHeight);
            canvasElement.style.width = containerWidth + 'px';
            canvasElement.style.height = containerHeight + 'px';
            canvasElement.style.display = 'block';
            
            console.log(`[createMiniChart] Canvas dimensions set to ${containerWidth}x${containerHeight}`);
        } else {
            // Fallback dimensions if container not found
            canvasElement.width = 100;
            canvasElement.height = 50;
            canvasElement.setAttribute('width', '100');
            canvasElement.setAttribute('height', '50');
            canvasElement.style.width = '100px';
            canvasElement.style.height = '50px';
            console.warn(`[createMiniChart] Container not found, using fallback dimensions`);
        }
        
        const config = {
            type: chartType,
            data: {
                labels: labels,
                datasets: [{
                    label: chartData.label || '',
                    data: data,
                    borderColor: normalizedColor,
                    backgroundColor: chartData.fill ? hexToRgba(normalizedColor, 0.15) : 'transparent',
                    borderWidth: isSparkline ? 1.5 : 1.5, // Thinner lines
                    fill: chartData.fill || false,
                    tension: chartData.tension !== undefined ? chartData.tension : 0.4,
                    pointRadius: isSparkline ? 0 : 2.5, // Finer marks
                    pointHoverRadius: isSparkline ? 0 : 4,
                    pointHitRadius: isSparkline ? 0 : 8,
                    pointBackgroundColor: normalizedColor,
                    pointBorderColor: '#ffffff',
                    pointBorderWidth: 0.5, // Thinner border
                    pointHoverBackgroundColor: normalizedColor,
                    pointHoverBorderColor: '#ffffff',
                    pointHoverBorderWidth: 1,
                    // Different point styles for variety (assigned in renderTileChart)
                    pointStyle: chartData.pointStyle || 'circle',
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                devicePixelRatio: window.devicePixelRatio || 2, // Use device pixel ratio for crisp rendering
                layout: {
                    padding: {
                        left: isSparkline ? 2 : 4, // Reduced padding for more compact charts
                        right: isSparkline ? 2 : 4,
                        top: isSparkline ? 2 : 4, // Removed extra padding for legend
                        bottom: isSparkline ? 2 : 4
                    }
                },
                plugins: {
                    legend: {
                        display: false // Disable legend to save space and avoid layout issues
                    },
                    tooltip: {
                        enabled: true,
                        backgroundColor: 'rgba(0, 0, 0, 0.9)',
                        titleFont: { size: 12, weight: '600' },
                        bodyFont: { size: 11 },
                        padding: 10,
                        cornerRadius: 6,
                        borderColor: normalizedColor,
                        borderWidth: 2,
                        displayColors: true,
                        position: 'nearest',
                        callbacks: {
                            title: function(context) {
                                return context[0].label || '';
                            },
                            label: function(context) {
                                const value = context.parsed.y;
                                const label = context.dataset.label || '';
                                // Format numbers nicely
                                let formattedValue = value;
                                if (typeof value === 'number') {
                                    if (Math.abs(value) >= 1000000) {
                                        formattedValue = (value / 1000000).toFixed(2) + 'M';
                                    } else if (Math.abs(value) >= 1000) {
                                        formattedValue = (value / 1000).toFixed(2) + 'K';
                                    } else {
                                        formattedValue = value.toFixed(2);
                                    }
                                }
                                return label ? `${label}: ${formattedValue}` : formattedValue.toString();
                            }
                        }
                    }
                },
                scales: isSparkline ? {
                    x: {
                        display: false // No axes for sparklines
                    },
                    y: {
                        display: false
                    }
                } : {
                    x: {
                        display: true,
                        grid: {
                            display: true,
                            color: 'rgba(0, 0, 0, 0.06)', // Subtle grid lines
                            drawBorder: true,
                            borderColor: 'rgba(0, 0, 0, 0.12)',
                            lineWidth: 0.5 // Thinner grid lines
                        },
                        ticks: {
                            font: { size: 7, weight: '400' }, // Even smaller font
                            color: 'rgba(0, 0, 0, 0.5)',
                            padding: 2,
                            maxTicksLimit: 5 // Limit number of ticks
                        }
                    },
                    y: {
                        display: true,
                        grid: {
                            display: true,
                            color: 'rgba(0, 0, 0, 0.06)', // Subtle grid lines
                            drawBorder: true,
                            borderColor: 'rgba(0, 0, 0, 0.12)',
                            lineWidth: 0.5 // Thinner grid lines
                        },
                        ticks: {
                            font: { size: 7, weight: '400' }, // Even smaller font
                            color: 'rgba(0, 0, 0, 0.5)',
                            padding: 2,
                            maxTicksLimit: 5, // Limit number of ticks for cleaner look
                            callback: function(value) {
                                // Format large numbers
                                if (value >= 1000000) return (value / 1000000).toFixed(1) + 'M';
                                if (value >= 1000) return (value / 1000).toFixed(1) + 'K';
                                return value.toFixed(0);
                            }
                        },
                        // Ensure proper scaling to show variation
                        beginAtZero: false, // Don't force zero, show actual data range
                        grace: '5%' // Add small padding to show variation better
                    }
                },
                animation: {
                    duration: 300, // Smooth animation
                    easing: 'easeOutQuart'
                },
                interaction: {
                    intersect: false,
                    mode: 'index',
                    includeInvisible: false
                },
                onHover: (event, activeElements) => {
                    // Change cursor to pointer when hovering over chart
                    event.native.target.style.cursor = activeElements.length > 0 ? 'pointer' : 'default';
                },
                onClick: (event, activeElements) => {
                    // Handle click events for interactivity
                    if (activeElements.length > 0) {
                        const element = activeElements[0];
                        const datasetIndex = element.datasetIndex;
                        const index = element.index;
                        const value = element.parsed.y;
                        const label = element.label;
                        console.log(`[Chart Click] ${label}: ${value}`);
                    }
                }
            }
        };
        
        try {
            const chartInstance = new Chart(ctx, config);
            console.log(`[createMiniChart] ✅ Chart instance created successfully`);
            
            // Force chart to update and render
            setTimeout(() => {
                if (chartInstance && typeof chartInstance.update === 'function') {
                    chartInstance.update('none'); // Update without animation
                    console.log(`[createMiniChart] Chart updated/rendered`);
                }
            }, 50);
            
            return chartInstance;
        } catch (error) {
            console.error(`[createMiniChart] ❌ Error creating chart:`, error);
            return null;
        }
    }

    processInsightLinks(text) {
        if (!text) return text;
        
        // Convert URLs to clickable links with Bloomberg orange
        const urlRegex = /(https?:\/\/[^\s\)]+)/g;
        // Updated regex to handle nested brackets: [text|view:path] or [text|url:http://...]
        const linkRegex = /\[([^\|]+)\|(view|url):([^\]]+)\]/g;
        
        let processed = text;
        
        // Process [text|view:path] or [text|url:http://...] links FIRST
        processed = processed.replace(linkRegex, (match, linkText, type, path) => {
            const trimmedText = linkText.trim();
            const trimmedPath = path.trim();
            if (type === 'view') {
                return `<a href="#" class="insight-link" data-view-link="${trimmedPath}" style="color: #FF6600 !important; text-decoration: underline; cursor: pointer; font-weight: 500;">${trimmedText}</a>`;
            } else if (type === 'url') {
                return `<a href="${trimmedPath}" target="_blank" class="insight-link" style="color: #FF6600 !important; text-decoration: underline; cursor: pointer; font-weight: 500;">${trimmedText}</a>`;
            }
            return match;
        });
        
        // Process plain URLs (but avoid double-processing)
        processed = processed.replace(urlRegex, (url) => {
            // Skip if already inside an <a> tag
            if (url.includes('<a') || url.includes('</a>')) return url;
            return `<a href="${url}" target="_blank" class="insight-link" style="color: #FF6600 !important; text-decoration: underline; cursor: pointer;">${url}</a>`;
        });
        
        return processed;
    }

    renderSpecialTileContent(tile, aiData) {
        console.log(`[renderSpecialTileContent] Rendering for tile: ${tile.id}, hasNews: ${!!aiData?.news}, hasXFeeds: ${!!aiData?.xFeeds}, newsCount: ${aiData?.news?.length || 0}, xFeedsCount: ${aiData?.xFeeds?.length || 0}`);
        
        // Standardized font sizes for special tiles
        const fontSize = '12px';
        const accountNameSize = '11px';
        
        // Character limits per post/item based on tile size
        const charLimits = {
            'square': 120,
            'horizontal': 200,
            '2x1': 200,
            'vertical': 150,
            '1x2': 150,
            'large': 300,
            '2x2': 300
        };
        
        const charLimit = charLimits[tile.size] || charLimits.square;
        
        // Item counts based on tile size
        const itemCounts = {
            'square': 3,
            'horizontal': 5,
            '2x1': 5,
            'vertical': 4,
            '1x2': 4,
            'large': 8,
            '2x2': 8
        };
        
        const itemCount = itemCounts[tile.size] || itemCounts.square;
        
        if (tile.id === 'x-posts' && aiData.xFeeds && Array.isArray(aiData.xFeeds) && aiData.xFeeds.length > 0) {
            
            return `
                <div class="special-content" style="margin-top: 2px; padding-top: 2px; border-top: 1px solid var(--border-color); display: flex; flex-direction: column; gap: 4px; flex: 1; overflow-y: auto; min-height: 0;">
                    ${aiData.xFeeds.slice(0, itemCount).map(post => `
                        <div class="special-item" style="font-size: ${fontSize}; line-height: 1.4; padding: 4px 0; border-bottom: 1px solid rgba(0,0,0,0.05);">
                            <div class="special-item-title" style="font-weight: 600; color: ${post.isKeyAccount ? tile.color : 'var(--text-secondary)'}; margin-bottom: 2px; font-size: ${accountNameSize};">
                                ${post.accountName || post.account}
                            </div>
                            <div style="color: var(--text-primary); word-wrap: break-word; line-height: 1.4;">
                                ${this.processInsightLinks((post.content || '').substring(0, charLimit))}${(post.content || '').length > charLimit ? '...' : ''}
                            </div>
                        </div>
                    `).join('')}
                </div>
            `;
        } else if (tile.id === 'news' && aiData.news && Array.isArray(aiData.news) && aiData.news.length > 0) {
            console.log(`[renderSpecialTileContent] ✅ Rendering ${aiData.news.length} news items for tile: ${tile.id}`);
            return `
                <div class="special-content" style="margin-top: 2px; padding-top: 2px; border-top: 1px solid var(--border-color); display: flex; flex-direction: column; gap: 4px; flex: 1; overflow-y: auto; min-height: 0;">
                    ${aiData.news.slice(0, itemCount).map(item => `
                        <div class="special-item" style="font-size: ${fontSize}; line-height: 1.4; padding: 4px 0; border-bottom: 1px solid rgba(0,0,0,0.05);">
                            <div class="special-item-title" style="font-weight: 600; color: ${tile.color}; margin-bottom: 2px; font-size: ${accountNameSize};">
                                ${item.title || item.source || 'News'}
                            </div>
                            <div style="color: var(--text-primary); word-wrap: break-word; line-height: 1.4;">
                                ${this.processInsightLinks((item.summary || item.content || '').substring(0, charLimit))}${(item.summary || item.content || '').length > charLimit ? '...' : ''}
                            </div>
                        </div>
                    `).join('')}
                </div>
            `;
        } else if (tile.id === 'news') {
            console.warn(`[renderSpecialTileContent] ⚠️ News tile has no news data. aiData:`, aiData);
        }
        return '';
    }

    async refreshDashboardInsights() {
        if (!this.currentData) {
            alert('Please calculate a valuation first');
            return;
        }
        
        const gridContainer = document.getElementById('dashboardGrid');
        if (!gridContainer) return;
        
        // Clear cached insights by regenerating layout
        if (this.currentModelId) {
            if (this.cachedAIInsights[this.currentModelId]) {
                delete this.cachedAIInsights[this.currentModelId];
            }
            if (this.cachedTerminalInsights[this.currentModelId]) {
                delete this.cachedTerminalInsights[this.currentModelId];
            }
        }
        await this.generateDashboardLayout(this.currentData, this.getInputs());
    }

    async refreshAllInsights() {
        if (!this.currentData) {
            alert('Please calculate a valuation first');
            return;
        }

        // Clear all cached insights for current model
        if (this.currentModelId) {
            if (this.cachedAIInsights[this.currentModelId]) {
                delete this.cachedAIInsights[this.currentModelId];
            }
            if (this.cachedTerminalInsights[this.currentModelId]) {
                delete this.cachedTerminalInsights[this.currentModelId];
            }
        }

        // Refresh terminal dashboard insights
        const gridContainer = document.getElementById('dashboardGrid');
        if (gridContainer) {
            await this.generateDashboardLayout(this.currentData, this.getInputs());
        }

        // Refresh other insights views if they're active
        const activeTab = document.querySelector('#insights .insights-tab.active')?.dataset.tab;
        if (activeTab === 'dashboard') {
            // Terminal tab - already handled above
        } else {
            // Refresh other tab insights
            this.updateInsightsView(this.currentData).catch(err => {
                console.error('Error refreshing insights view:', err);
            });
        }
    }

    // ==================== DESKTOP AGENT WINDOW ====================

    async toggleAIAgent() {
        const agentWindow = document.getElementById('aiAgentWindow');
        if (!agentWindow) {
            console.error('Desktop Agent window not found in DOM');
            return;
        }
        
        const computedStyle = window.getComputedStyle(agentWindow);
        const isHidden = agentWindow.style.display === 'none' || 
                         !agentWindow.style.display || 
                         computedStyle.display === 'none';
        
        if (isHidden) {
            this.initializeAgentWindow();
            agentWindow.style.display = 'flex';
            agentWindow.style.position = 'fixed';
            agentWindow.style.zIndex = '10000';
            // Restore position from application state
            const agentPosition = await this.getAppState('agentPosition');
            if (agentPosition) {
                agentWindow.style.left = agentPosition.left || '100px';
                agentWindow.style.top = agentPosition.top || '100px';
                agentWindow.style.width = agentPosition.width || '500px';
                agentWindow.style.height = agentPosition.height || '600px';
            } else {
                // Set initial position if not already set
                if (!agentWindow.style.left && !agentWindow.style.top) {
                    agentWindow.style.left = '100px';
                    agentWindow.style.top = '100px';
                    agentWindow.style.width = '500px';
                    agentWindow.style.height = '600px';
                }
            }
            console.log('✅ Desktop Agent window opened at:', {
                left: agentWindow.style.left,
                top: agentWindow.style.top,
                display: agentWindow.style.display,
                position: agentWindow.style.position
            });
        } else {
            this.closeAIAgent();
        }
    }

    initializeAgentWindow() {
        const window = document.getElementById('aiAgentWindow');
        
        // Load commentary preference
        const savedPreference = localStorage.getItem('agentCommentaryEnabled');
        if (savedPreference !== null) {
            this.agentCommentaryEnabled = savedPreference === 'true';
        }
        
        // Update commentary toggle button state
        const toggleBtn = document.getElementById('agentCommentaryToggleBtn');
        const icon = toggleBtn?.querySelector('i');
        if (toggleBtn && icon) {
            if (this.agentCommentaryEnabled) {
                icon.setAttribute('data-lucide', 'message-square');
                toggleBtn.title = 'Disable Context Commentary';
                toggleBtn.style.opacity = '1';
                toggleBtn.style.color = 'var(--primary-color)';
            } else {
                icon.setAttribute('data-lucide', 'message-square');
                toggleBtn.title = 'Enable Context Commentary';
                toggleBtn.style.opacity = '0.4';
                toggleBtn.style.color = 'var(--text-secondary)';
            }
            if (window.lucide) window.lucide.createIcons();
        }
        
        // Initialize context tracking when agent window opens
        if (!this.previousContext) {
            const currentTabInfo = this.getCurrentTabInfo();
            this.previousContext = {
                view: this.currentView,
                tab: currentTabInfo.tab,
                subTab: currentTabInfo.subTab,
                modelId: this.currentModelId,
                modelName: this.currentModelName,
                data: this.currentData ? {
                    totalValue: this.currentData.total?.value,
                    earthValue: this.currentData.earth?.adjustedValue,
                    marsValue: this.currentData.mars?.adjustedValue
                } : null
            };
            console.log('📝 Initialized agent context tracking:', this.previousContext);
        }
        if (!window) return;

        // Load system prompts
        this.loadAgentSystemPrompts();

        // Initialize draggable functionality
        this.setupAgentDraggable();

        // Initialize resizable functionality
        this.setupAgentResizable();

        // Update context badge
        this.updateAgentContextBadge();

        // Refresh icons
        if (window.lucide) window.lucide.createIcons();
    }

    updateAgentContextBadge() {
        const badge = document.getElementById('agentContextBadge');
        if (!badge) return;

        const tabInfo = this.getCurrentTabInfo();
        let contextText = '';
        
        // Format context text based on current view
        const viewNames = {
            'dashboard': 'Dashboard',
            'insights': 'Insights',
            'earth': 'Earth Operations',
            'mars': 'Mars Operations',
            'charts': 'Charts',
            'models': 'Models',
            'scenarios': 'Scenarios',
            'sensitivity': 'Sensitivity',
            'stress': 'Stress Testing',
            'greeks': 'Greeks',
            'factor-risk': 'Factor Risk',
            'attribution': 'Attribution',
            'ratios': 'Ratios',
            'inputs': 'Reference Data'
        };

        contextText = viewNames[tabInfo.tab] || tabInfo.tab || 'Dashboard';
        
        if (tabInfo.subTab) {
            // Format sub-tab names
            const subTabNames = {
                'insights': 'Key Insights',
                'drivers': 'Value Drivers',
                'risks': 'Risk Assessment',
                'real-time': 'Real-Time Data',
                'dashboard': 'Terminal',
                'starlink': 'Starlink',
                'launch': 'Launch Services',
                'utilization': 'Utilization',
                'cadence': 'Launch Cadence',
                'technology': 'Technology',
                'financials': 'Financials'
            };
            const subTabName = subTabNames[tabInfo.subTab] || tabInfo.subTab;
            contextText += ` > ${subTabName}`;
        }

        badge.textContent = contextText;
    }

    switchAgentSettingsTab(tabName) {
        // Update tab buttons
        document.querySelectorAll('[data-agent-tab]').forEach(btn => {
            btn.classList.remove('active');
        });
        const activeBtn = document.querySelector(`[data-agent-tab="${tabName}"]`);
        if (activeBtn) activeBtn.classList.add('active');

        // Update tab content
        document.querySelectorAll('.agent-settings-tab-content').forEach(content => {
            content.style.display = 'none';
        });
        const activeContent = document.getElementById(`agentSettingsTab-${tabName}`);
        if (activeContent) {
            activeContent.style.display = 'block';
        }

        if (window.lucide) window.lucide.createIcons();
    }

    setupAgentDraggable() {
        const window = document.getElementById('aiAgentWindow');
        const header = document.getElementById('agentHeader');
        if (!window || !header) return;

        let isDragging = false;
        let startX, startY, startLeft, startTop;

        header.addEventListener('mousedown', (e) => {
            if (e.target.closest('.agent-header-btn')) return; // Don't drag when clicking buttons
            isDragging = true;
            startX = e.clientX;
            startY = e.clientY;
            startLeft = parseInt(window.style.left) || 100;
            startTop = parseInt(window.style.top) || 100;
            header.style.cursor = 'grabbing';
            e.preventDefault();
        });

        document.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            const deltaX = e.clientX - startX;
            const deltaY = e.clientY - startY;
            window.style.left = `${startLeft + deltaX}px`;
            window.style.top = `${startTop + deltaY}px`;
        });

        document.addEventListener('mouseup', () => {
            if (isDragging) {
                isDragging = false;
                header.style.cursor = 'grab';
                // Save agent position to application state (fire and forget)
                const agentPosition = {
                    left: window.style.left,
                    top: window.style.top,
                    width: window.style.width,
                    height: window.style.height
                };
                this.saveAppState('agentPosition', agentPosition).catch(err => {
                    console.warn('Failed to save agent position:', err);
                });
            }
        });
    }

    setupAgentResizable() {
        const window = document.getElementById('aiAgentWindow');
        const resizeHandle = window?.querySelector('.agent-resize-handle');
        if (!window || !resizeHandle) return;

        let isResizing = false;
        let startX, startY, startWidth, startHeight;

        resizeHandle.addEventListener('mousedown', (e) => {
            isResizing = true;
            startX = e.clientX;
            startY = e.clientY;
            startWidth = parseInt(window.style.width) || 500;
            startHeight = parseInt(window.style.height) || 600;
            e.preventDefault();
        });

        document.addEventListener('mousemove', (e) => {
            if (!isResizing) return;
            const deltaX = e.clientX - startX;
            const deltaY = e.clientY - startY;
            window.style.width = `${Math.max(400, startWidth + deltaX)}px`;
            window.style.height = `${Math.max(300, startHeight + deltaY)}px`;
        });

        document.addEventListener('mouseup', () => {
            if (isResizing) {
                isResizing = false;
                // Save agent position and size to application state (fire and forget)
                const agentPosition = {
                    left: window.style.left,
                    top: window.style.top,
                    width: window.style.width,
                    height: window.style.height
                };
                this.saveAppState('agentPosition', agentPosition).catch(err => {
                    console.warn('Failed to save agent position:', err);
                });
            }
        });
    }

    toggleAIAgentCollapse() {
        const content = document.getElementById('agentContent');
        const collapseBtn = document.getElementById('agentCollapseBtn');
        if (!content || !collapseBtn) return;

        const isCollapsed = content.style.display === 'none';
        content.style.display = isCollapsed ? 'block' : 'none';
        
        const icon = collapseBtn.querySelector('i');
        if (icon) {
            icon.setAttribute('data-lucide', isCollapsed ? 'chevron-down' : 'chevron-up');
            if (window.lucide) window.lucide.createIcons();
        }
    }

    closeAIAgent() {
        const agentWindow = document.getElementById('aiAgentWindow');
        if (agentWindow) {
            agentWindow.style.display = 'none';
            console.log('✅ Desktop Agent window closed');
        }
    }

    openAgentSettings() {
        const modal = document.getElementById('agentSettingsModal');
        if (modal) {
            modal.style.display = 'block';
            this.loadAgentSystemPrompts(); // Ensure prompts are loaded
            this.updateAgentSystemPromptDisplay();
            
            // Load saved AI model selection
            const modelSelect = document.getElementById('agentAIModelSelect');
            if (modelSelect) {
                const savedModel = localStorage.getItem('agentAIModel') || 'grok:grok-3';
                modelSelect.value = savedModel;
            }
            
            if (window.lucide) window.lucide.createIcons();
        }
    }

    closeAgentSettings() {
        const modal = document.getElementById('agentSettingsModal');
        if (modal) {
            modal.style.display = 'none';
        }
    }

    loadAgentSystemPrompts() {
        const stored = localStorage.getItem('agentSystemPrompts');
        if (stored) {
            try {
                this.agentSystemPrompts = JSON.parse(stored);
            } catch (e) {
                this.agentSystemPrompts = this.getDefaultAgentSystemPrompts();
            }
        } else {
            this.agentSystemPrompts = this.getDefaultAgentSystemPrompts();
        }
        this.updateAgentSystemPromptDisplay();
    }

    getDefaultAgentSystemPrompts() {
        return {
            level1: 'You are an AI assistant specialized in analyzing SpaceX valuation models and financial data.',
            level2: 'You have deep expertise in space industry economics, satellite communications, launch services, and Mars colonization economics.',
            level3: 'You understand valuation methodologies including DCF, real options theory, and Monte Carlo simulations.',
            level4: 'You can analyze financial metrics, cash flows, revenue projections, and risk factors.',
            level5: 'You provide clear, actionable insights and recommendations based on data analysis.',
            level6: 'You consider both near-term Earth operations (Starlink, Launch Services) and long-term Mars optionality.',
            level7: 'You understand the relationship between technical milestones, market dynamics, and valuation outcomes.',
            level8: 'You can compare scenarios, identify key value drivers, and assess risk factors.',
            level9: 'You provide context-aware responses based on the current model, inputs, and valuation results.',
            level10: 'You maintain a professional, analytical tone while being accessible and helpful.'
        };
    }

    updateAgentSystemPromptDisplay() {
        const container = document.getElementById('agentSystemPromptInputs');
        if (!container) {
            console.warn('agentSystemPromptInputs container not found');
            return;
        }

        // Ensure prompts are loaded
        if (!this.agentSystemPrompts) {
            this.loadAgentSystemPrompts();
        }

        container.innerHTML = '';
        for (let i = 1; i <= 10; i++) {
            const level = `level${i}`;
            const promptValue = this.agentSystemPrompts[level] || '';
            const div = document.createElement('div');
            div.className = 'form-group';
            div.style.marginBottom = 'var(--spacing-md)';
            div.innerHTML = `
                <label for="agentPrompt${i}" style="display: block; margin-bottom: var(--spacing-xs); font-weight: 600; color: var(--text-primary);">
                    Level ${i} ${i === 1 ? '(Most General)' : i === 10 ? '(Most Specific)' : ''}
                </label>
                <textarea 
                    id="agentPrompt${i}" 
                    class="input-full" 
                    rows="${i <= 3 ? 2 : i <= 6 ? 3 : 4}" 
                    placeholder="Enter Level ${i} system prompt..."
                    style="width: 100%; padding: var(--spacing-sm); border: 1px solid var(--border-color); border-radius: var(--radius); font-family: inherit; font-size: 14px; resize: vertical;"
                >${promptValue}</textarea>
                <div style="display: flex; justify-content: space-between; margin-top: 4px;">
                    <span class="input-hint" style="font-size: 12px; color: var(--text-secondary);">
                        ${promptValue.length} characters
                    </span>
                    <button class="btn btn-sm btn-secondary" onclick="app.clearAgentPrompt(${i})" style="padding: 2px 8px; font-size: 12px;">
                        <i data-lucide="x"></i> Clear
                    </button>
                </div>
            `;
            container.appendChild(div);
            
            // Add character counter update
            const textarea = div.querySelector(`#agentPrompt${i}`);
            const counter = div.querySelector('.input-hint');
            if (textarea && counter) {
                textarea.addEventListener('input', () => {
                    counter.textContent = `${textarea.value.length} characters`;
                });
            }
        }
        
        if (window.lucide) window.lucide.createIcons();
    }

    clearAgentPrompt(level) {
        const input = document.getElementById(`agentPrompt${level}`);
        if (input) {
            input.value = '';
            const counter = input.parentElement.querySelector('.input-hint');
            if (counter) counter.textContent = '0 characters';
        }
    }

    saveAgentSystemPrompts() {
        const prompts = {};
        for (let i = 1; i <= 10; i++) {
            const input = document.getElementById(`agentPrompt${i}`);
            if (input) {
                prompts[`level${i}`] = input.value.trim();
            }
        }
        this.agentSystemPrompts = prompts;
        localStorage.setItem('agentSystemPrompts', JSON.stringify(prompts));
        
        // Save AI model selection
        const modelSelect = document.getElementById('agentAIModelSelect');
        if (modelSelect) {
            localStorage.setItem('agentAIModel', modelSelect.value);
            this.aiModel = modelSelect.value;
        }
        
        this.closeAgentSettings();
        console.log('✅ Agent system prompts and settings saved');
        
        // Show confirmation
        const notification = document.createElement('div');
        notification.style.cssText = 'position: fixed; top: 100px; right: 20px; background: var(--success-color); color: white; padding: 12px 20px; border-radius: 8px; box-shadow: var(--shadow-lg); z-index: 10001;';
        notification.textContent = '✅ Agent settings saved';
        document.body.appendChild(notification);
        setTimeout(() => notification.remove(), 3000);
    }

    resetAgentSystemPrompts() {
        this.agentSystemPrompts = this.getDefaultAgentSystemPrompts();
        localStorage.removeItem('agentSystemPrompts');
        this.updateAgentSystemPromptDisplay();
    }

    async sendAgentMessage(message) {
        if (!message.trim()) return;

        // Add user message
        this.addAgentMessage(message, 'user');

        // Show loading
        const loadingId = this.addAgentLoadingMessage();

        try {
            const inputs = this.getInputs();
            
            // Get current tab and sub-tab information
            const activeTab = this.getCurrentTabInfo();
            
            // Get all models data
            const allModels = await this.getAllModelsData();
            
            // Get Monte Carlo simulations
            const monteCarloData = this.currentMonteCarloData ? {
                statistics: this.currentMonteCarloData.statistics,
                runs: this.currentMonteCarloData.runs,
                sampleResults: this.currentMonteCarloData.sampleResults?.slice(0, 10) || [] // First 10 samples
            } : null;
            
            // Build comprehensive context
            const context = {
                currentView: this.currentView,
                currentTab: activeTab.tab,
                currentSubTab: activeTab.subTab,
                currentModel: {
                    id: this.currentModelId,
                    name: this.currentModelName,
                    inputs: inputs,
                    valuationData: this.currentData
                },
                allModels: allModels,
                monteCarloSimulations: monteCarloData,
                parameters: {
                    earth: inputs.earth || {},
                    mars: inputs.mars || {},
                    financial: inputs.financial || {}
                },
                navigationHistory: this.navigationHistory.slice(-10) // Include recent navigation history
            };
            
            // Build system prompts from 10-level hierarchy
            const systemPrompts = this.agentSystemPrompts || this.getDefaultAgentSystemPrompts();
            const systemPromptText = Object.values(systemPrompts)
                .filter(p => p && p.trim())
                .join('\n\n');
            
            const response = await fetch('/api/agent/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-AI-Model': document.getElementById('agentAIModelSelect')?.value || this.aiModel || 'grok:grok-3'
                },
                body: JSON.stringify({
                    message: message,
                    systemPrompt: systemPromptText,
                    context: context,
                    history: this.getAgentChatHistory()
                })
            });

            const result = await response.json();
            this.removeAgentMessage(loadingId);

            if (result.success) {
                this.addAgentMessage(result.response, 'assistant');
            } else {
                this.addAgentMessage('Sorry, I encountered an error: ' + (result.error || 'Unknown error'), 'assistant');
            }
        } catch (error) {
            console.error('Agent chat error:', error);
            this.removeAgentMessage(loadingId);
            this.addAgentMessage('Sorry, I encountered an error. Please check your connection and try again.', 'assistant');
        }
    }

    getCurrentTabInfo() {
        let tab = this.currentView || 'dashboard';
        let subTab = null;
        
        // Check for sub-tabs in different views
        if (this.currentView === 'insights') {
            const activeTab = document.querySelector('#insights .insights-tab.active');
            subTab = activeTab?.dataset.tab || null;
        } else if (this.currentView === 'earth') {
            const activeTab = document.querySelector('#earth .insights-tab.active');
            subTab = activeTab?.dataset.earthTab || null;
        } else if (this.currentView === 'mars') {
            const activeTab = document.querySelector('#mars .insights-tab.active');
            subTab = activeTab?.dataset.marsTab || null;
        } else if (this.currentView === 'models') {
            const activeTab = document.querySelector('#models .insights-tab.active');
            subTab = activeTab?.dataset.tab || null;
        }
        
        return { tab, subTab };
    }

    /**
     * Detect context changes and generate agent commentary if relevant
     * Considers navigation history to understand user intent
     */
    async detectAndCommentOnContextChange(changeInfo) {
        // Skip if agent commentary is disabled
        if (!this.agentCommentaryEnabled) {
            console.log('🔇 Agent commentary disabled');
            return;
        }
        
        // Check if agent window is open (check both style.display and computed style)
        const agentWindow = document.getElementById('aiAgentWindow');
        if (!agentWindow) {
            console.log('🔇 Agent window not found');
            return;
        }
        
        const computedStyle = window.getComputedStyle(agentWindow);
        const isVisible = agentWindow.style.display !== 'none' && 
                         agentWindow.style.display !== '' &&
                         computedStyle.display !== 'none' &&
                         computedStyle.display !== '' &&
                         !agentWindow.classList.contains('hidden');
        
        if (!isVisible) {
            console.log('🔇 Agent window not visible (display:', agentWindow.style.display, 'computed:', computedStyle.display, ')');
            return; // Agent window not open, don't generate commentary
        }

        console.log('🔍 Context change detected:', changeInfo.type, changeInfo);

        // Debounce rapid context changes
        if (this.agentCommentaryDebounceTimer) {
            clearTimeout(this.agentCommentaryDebounceTimer);
        }

        this.agentCommentaryDebounceTimer = setTimeout(async () => {
            try {
                // Get current context
                const currentTabInfo = this.getCurrentTabInfo();
                const currentContext = {
                    view: this.currentView,
                    tab: currentTabInfo.tab,
                    subTab: currentTabInfo.subTab,
                    modelId: this.currentModelId,
                    modelName: this.currentModelName,
                    data: this.currentData ? {
                        totalValue: this.currentData.total?.value,
                        earthValue: this.currentData.earth?.adjustedValue,
                        marsValue: this.currentData.mars?.adjustedValue
                    } : null
                };

                console.log('📊 Current context:', currentContext);
                console.log('📜 Previous context:', this.previousContext);

                // Check if context actually changed
                if (this.previousContext && 
                    JSON.stringify(this.previousContext) === JSON.stringify(currentContext)) {
                    console.log('⏭️ No actual context change detected');
                    return; // No actual change
                }

                // Determine if change is relevant based on navigation history
                const isRelevant = this.isContextChangeRelevant(changeInfo, currentContext);
                console.log('🎯 Change relevance:', isRelevant);
                
                if (!isRelevant) {
                    console.log('⏭️ Change not relevant, skipping commentary');
                    this.previousContext = currentContext;
                    return; // Change not relevant to user's current focus
                }

                console.log('💬 Generating agent commentary...');
                
                // Show thinking animation immediately when context change is detected
                const thinkingId = this.addAgentThinkingMessage();
                
                try {
                    // Generate agent commentary on the context change (pass thinkingId to remove it)
                    await this.generateContextChangeCommentary(changeInfo, currentContext, thinkingId);
                } catch (error) {
                    // Ensure thinking message is removed even if there's an error
                    this.removeAgentMessage(thinkingId);
                    throw error;
                }

                // Update previous context
                this.previousContext = currentContext;
            } catch (error) {
                console.error('❌ Error detecting context change:', error);
            }
        }, 1000); // Debounce 1 second
    }

    /**
     * Determine if a context change is relevant based on navigation history
     */
    isContextChangeRelevant(changeInfo, currentContext) {
        // Model changes are always relevant
        if (changeInfo.type === 'model_change') {
            console.log('✅ Model change is always relevant');
            return true;
        }

        // Data changes are relevant if user is viewing related content
        if (changeInfo.type === 'data_change') {
            // Relevant if user is on dashboard, insights, or operations views
            const relevantViews = ['dashboard', 'insights', 'earth', 'mars', 'charts', 'scenarios', 'monteCarlo'];
            const isRelevant = relevantViews.includes(currentContext.view);
            console.log(`📊 Data change relevance: ${isRelevant} (current view: ${currentContext.view})`);
            return isRelevant;
        }

        // View changes are always relevant (user is actively navigating)
        if (changeInfo.type === 'view_change') {
            // Always comment on view changes - user is actively exploring
            console.log('✅ View change is relevant');
            return true;
        }

        // Sub-tab changes are relevant if user is exploring within a view
        if (changeInfo.type === 'subtab_change') {
            // Always comment on sub-tab changes - shows user is exploring details
            console.log('✅ Sub-tab change is relevant');
            return true;
        }

        console.log('❓ Unknown change type:', changeInfo.type);
        return false; // Unknown change type, be conservative
    }

    /**
     * Generate agent commentary on context changes
     */
    async generateContextChangeCommentary(changeInfo, currentContext, thinkingMessageId = null) {
        try {
            // Get navigation history summary (last 10 entries)
            const historySummary = this.navigationHistory.slice(-10).map((entry, index) => {
                const timeAgo = index === this.navigationHistory.length - 1 ? 'just now' : 
                               `${this.navigationHistory.length - index - 1} steps ago`;
                return `${timeAgo}: ${entry.view}${entry.subTab ? ` > ${entry.subTab}` : ''}`;
            }).join('\n');

            // Build prompt for agent commentary
            let prompt = `You are an AI assistant observing context changes in a SpaceX valuation application. 

NAVIGATION HISTORY (most recent first):
${historySummary}

CURRENT CONTEXT:
- View: ${currentContext.view}
- Tab: ${currentContext.tab || 'N/A'}
- Sub-Tab: ${currentContext.subTab || 'N/A'}
- Model: ${currentContext.modelName || 'No model loaded'}
${currentContext.data ? `
CURRENT VALUATION:
- Total: $${(currentContext.data.totalValue / 1000).toFixed(2)}T
- Earth: $${(currentContext.data.earthValue / 1000).toFixed(2)}T
- Mars: $${(currentContext.data.marsValue / 1000).toFixed(2)}T
` : ''}

CONTEXT CHANGE DETECTED:
`;

            if (changeInfo.type === 'model_change') {
                prompt += `Model changed from "${changeInfo.previousModelName || 'Unknown'}" to "${changeInfo.newModelName}".`;
            } else if (changeInfo.type === 'data_change') {
                const prevTotal = changeInfo.previousData?.total?.value || 0;
                const newTotal = changeInfo.newData?.total?.value || 0;
                const change = newTotal - prevTotal;
                prompt += `Valuation data changed. Total value ${change >= 0 ? 'increased' : 'decreased'} from $${(prevTotal / 1000).toFixed(2)}T to $${(newTotal / 1000).toFixed(2)}T (${change >= 0 ? '+' : ''}$${(change / 1000).toFixed(2)}T).`;
            } else if (changeInfo.type === 'view_change') {
                prompt += `User navigated from "${changeInfo.previousView}" to "${changeInfo.newView}".`;
            } else if (changeInfo.type === 'subtab_change') {
                prompt += `User switched sub-tabs within ${changeInfo.view} view: from "${changeInfo.previousSubTab || 'none'}" to "${changeInfo.newSubTab}".`;
            }

            prompt += `

AVAILABLE APPLICATION VIEWS FOR INTERNAL LINKS:
- dashboard: Main dashboard view
- insights: Strategic insights (with sub-tabs: insights, drivers, risks, real-time, dashboard)
- earth: Earth Operations (with sub-tabs: starlink, launch, utilization, cadence, technology, financials)
- mars: Mars Operations (with sub-tabs: overview, launch-scaling, scenarios)
- charts: Charts view
- models: Models management
- scenarios: Scenarios view
- sensitivity: Sensitivity analysis
- greeks: Greeks analysis
- attribution: Attribution analysis
- ratios: Valuation ratios
- monteCarlo: Monte Carlo simulations

TASK: Analyze this context change and provide a brief, insightful comment (1-2 sentences max) that:
1. Acknowledges what changed
2. Relates it to the user's navigation pattern if relevant
3. Provides helpful context or suggests what the user might be exploring
4. Be conversational and helpful - the user is actively exploring the application
5. Include clickable links where helpful:
   - For internal navigation: Use format [link text|view:viewName] or [link text|view:viewName:subTab]
   - For external articles/news: Use format [link text|url:https://example.com]
   - You can include 1-3 links per comment

EXAMPLES:
- "You're exploring Earth Operations. Check out the [Starlink metrics|view:earth:starlink] or read about recent [Starlink developments|url:https://www.spacex.com/starlink]"
- "The valuation increased significantly. You might want to review the [sensitivity analysis|view:sensitivity] to see which inputs drive this change"
- "Switching to Mars Operations. Explore the [scenarios|view:mars:scenarios] to see different colonization timelines, or check out [recent Mars news|url:https://www.spacex.com/mars]"

IMPORTANT: Only respond with "SKIP" if the change is completely trivial (like clicking the same tab twice). 
For most navigation and data changes, provide a helpful comment with relevant links.

Format your response as plain text. Use the link format exactly as shown above.`;

            const inputs = this.getInputs();
            const systemPrompts = this.agentSystemPrompts || this.getDefaultAgentSystemPrompts();
            const systemPromptText = Object.values(systemPrompts)
                .filter(p => p && p.trim())
                .join('\n\n');

            const response = await fetch('/api/agent/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-AI-Model': document.getElementById('agentAIModelSelect')?.value || this.aiModel || 'grok:grok-3'
                },
                body: JSON.stringify({
                    message: prompt,
                    systemPrompt: systemPromptText,
                    context: {
                        currentView: currentContext.view,
                        currentTab: currentContext.tab,
                        currentSubTab: currentContext.subTab,
                        currentModel: {
                            id: currentContext.modelId,
                            name: currentContext.modelName,
                            inputs: inputs,
                            valuationData: this.currentData
                        },
                        navigationHistory: this.navigationHistory.slice(-10)
                    },
                    history: [] // Don't include chat history for context change commentary
                })
            });

            const result = await response.json();
            
            // Remove thinking message if it exists
            if (thinkingMessageId) {
                this.removeAgentMessage(thinkingMessageId);
            }
            
            if (result.success && result.response && 
                !result.response.toUpperCase().includes('SKIP') && 
                result.response.trim().length > 10) {
                // Parse and render commentary with clickable links
                const commentaryWithLinks = this.parseCommentaryLinks(result.response.trim());
                this.addAgentMessage(`💡 ${commentaryWithLinks}`, 'system');
            } else if (result.success && result.response && result.response.toUpperCase().includes('SKIP')) {
                // AI decided to skip - remove thinking message silently
                console.log('⏭️ AI skipped commentary for this context change');
            }
        } catch (error) {
            console.error('Error generating context change commentary:', error);
            // Remove thinking message on error
            if (thinkingMessageId) {
                this.removeAgentMessage(thinkingMessageId);
            }
        }
    }

    async getAllModelsData() {
        try {
            const response = await fetch('/api/models?limit=50');
            const result = await response.json();
            if (result.success && result.data) {
                // Return summary of all models (names, IDs, simulation counts)
                return result.data.map(model => ({
                    id: model._id,
                    name: model.name,
                    createdAt: model.createdAt,
                    simulationCount: model.simulationCount || 0,
                    hasInputs: !!model.inputs
                }));
            }
        } catch (error) {
            console.error('Error fetching all models:', error);
        }
        return [];
    }

    getAgentChatHistory() {
        const messagesArea = document.getElementById('agentChatMessages');
        if (!messagesArea) return [];
        
        const messages = [];
        const messageElements = messagesArea.querySelectorAll('.agent-message');
        
        messageElements.forEach(msgEl => {
            const content = msgEl.querySelector('.message-content p')?.textContent || '';
            if (content && !content.includes('Thinking...')) {
                if (msgEl.classList.contains('agent-message-user')) {
                    messages.push({ role: 'user', content: content });
                } else if (msgEl.classList.contains('agent-message-assistant')) {
                    messages.push({ role: 'assistant', content: content });
                }
            }
        });
        
        // Return last 10 messages for context
        return messages.slice(-10);
    }

    addAgentMessage(content, sender = 'user') {
        const messagesArea = document.getElementById('agentChatMessages');
        if (!messagesArea) return null;

        const messageId = `msg-${Date.now()}-${Math.random()}`;
        const messageDiv = document.createElement('div');
        
        // Style system messages differently (context change commentary)
        if (sender === 'system') {
            messageDiv.className = 'agent-message agent-message-system';
            messageDiv.style.cssText = `
                background: var(--surface);
                border-left: 3px solid var(--primary-color);
                padding: 8px 12px;
                margin: 8px 0;
                border-radius: 4px;
                font-size: 12px;
                color: var(--text-secondary);
                font-style: italic;
            `;
        } else {
            messageDiv.className = `agent-message agent-message-${sender}`;
        }
        
        messageDiv.id = messageId;
        // Content may already contain HTML from parseCommentaryLinks
        messageDiv.innerHTML = `
            <div class="message-content">
                <p>${content.replace(/\n/g, '<br>')}</p>
            </div>
        `;
        messagesArea.appendChild(messageDiv);
        
        // Attach click handlers to internal navigation links
        messageDiv.querySelectorAll('.agent-commentary-link[data-view]').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const viewName = link.getAttribute('data-view');
                const subTab = link.getAttribute('data-subtab') || null;
                this.navigateToView(viewName, subTab);
            });
        });
        
        // Auto-scroll to bottom smoothly
        setTimeout(() => {
            messagesArea.scrollTo({
                top: messagesArea.scrollHeight,
                behavior: 'smooth'
            });
        }, 10);

        return messageId;
    }

    /**
     * Parse commentary text and convert link markers to clickable links
     * Format: [link text|view:viewName] or [link text|view:viewName:subTab] or [link text|url:https://...]
     */
    parseCommentaryLinks(text) {
        // Pattern to match [text|type:value] or [text|type:value:subValue]
        const linkPattern = /\[([^\]]+)\|(view|url):([^\]]+)\]/g;
        
        return text.replace(linkPattern, (match, linkText, linkType, linkValue) => {
            // Escape HTML in link text to prevent XSS
            const escapedText = linkText.replace(/</g, '&lt;').replace(/>/g, '&gt;');
            
            if (linkType === 'view') {
                // Internal navigation link - format: view:viewName or view:viewName:subTab
                const parts = linkValue.split(':');
                const viewName = parts[0];
                const subTab = parts[1] || null;
                
                // Return HTML for internal navigation link
                return `<span class="agent-commentary-link" data-view="${viewName}" data-subtab="${subTab || ''}" style="color: var(--primary-color); text-decoration: underline; cursor: pointer; font-weight: 500;">${escapedText}</span>`;
            } else if (linkType === 'url') {
                // External URL link - escape URL
                const escapedUrl = linkValue.replace(/"/g, '&quot;');
                return `<a href="${escapedUrl}" target="_blank" rel="noopener noreferrer" class="agent-commentary-link" style="color: var(--primary-color); text-decoration: underline; cursor: pointer; font-weight: 500;">${escapedText}</a>`;
            }
            return match; // Return original if pattern doesn't match expected format
        });
    }

    /**
     * Navigate to a specific view and optionally a sub-tab
     */
    navigateToView(viewName, subTab = null) {
        // Switch to the view
        this.switchView(viewName);
        
        // If sub-tab is specified, switch to it after a short delay
        if (subTab) {
            setTimeout(() => {
                // Find and click the appropriate sub-tab button
                let tabButton = null;
                
                if (viewName === 'insights') {
                    tabButton = document.querySelector(`#insights .insights-tab[data-tab="${subTab}"]`);
                } else if (viewName === 'earth') {
                    tabButton = document.querySelector(`#earth .insights-tab[data-earth-tab="${subTab}"]`);
                } else if (viewName === 'mars') {
                    tabButton = document.querySelector(`#mars .insights-tab[data-mars-tab="${subTab}"]`);
                }
                
                if (tabButton) {
                    tabButton.click();
                }
            }, 300);
        }
    }

    /**
     * Setup element selection detection for charts and text
     */
    setupElementSelectionDetection() {
        // Store reference to app instance for chart onClick handlers
        if (!window.app) {
            window.app = this;
        }
        // Detect text selection in center panel
        document.addEventListener('mouseup', () => {
            const selection = window.getSelection();
            if (selection && selection.toString().trim().length > 0) {
                // Check if selection is in a relevant area (dashboard, charts, insights)
                const activeView = this.currentView;
                const relevantViews = ['dashboard', 'charts', 'insights', 'earth', 'mars'];
                
                if (relevantViews.includes(activeView)) {
                    const selectedText = selection.toString().trim();
                    const range = selection.getRangeAt(0);
                    const container = range.commonAncestorContainer;
                    
                    // Only comment on meaningful selections (more than 3 words or contains numbers/metrics)
                    if (selectedText.split(/\s+/).length >= 3 || /\$|%|B|T|M|K|\d+/.test(selectedText)) {
                        this.handleElementSelection({
                            type: 'text',
                            text: selectedText,
                            context: this.getTextSelectionContext(container)
                        });
                    }
                }
            }
        });
    }

    /**
     * Get context for text selection
     */
    getTextSelectionContext(container) {
        // Find the nearest section or chart container
        let element = container.nodeType === Node.TEXT_NODE ? container.parentElement : container;
        while (element && element !== document.body) {
            if (element.classList.contains('section') || 
                element.classList.contains('chart-container') ||
                element.classList.contains('metric-card') ||
                element.id) {
                return {
                    section: element.classList.contains('section') ? 'section' : null,
                    chartContainer: element.classList.contains('chart-container') ? true : false,
                    elementId: element.id || null,
                    elementTag: element.tagName.toLowerCase()
                };
            }
            element = element.parentElement;
        }
        return null;
    }

    /**
     * Handle element selection (chart or text) and generate commentary
     */
    handleElementSelection(selectionInfo) {
        console.log('handleElementSelection called:', selectionInfo);
        
        // Skip if commentary disabled or agent window not open
        if (!this.agentCommentaryEnabled) {
            console.log('Commentary disabled, skipping');
            return;
        }
        
        const agentWindow = document.getElementById('aiAgentWindow');
        if (!agentWindow) {
            console.log('Agent window not found');
            return;
        }
        
        const computedStyle = window.getComputedStyle(agentWindow);
        const isVisible = agentWindow.style.display !== 'none' && 
                         agentWindow.style.display !== '' &&
                         computedStyle.display !== 'none' &&
                         computedStyle.display !== '' &&
                         !agentWindow.classList.contains('hidden');
        
        if (!isVisible) {
            console.log('Agent window not visible');
            return;
        }

        console.log('Processing element selection...');

        // Debounce rapid selections
        if (this.elementSelectionDebounceTimer) {
            clearTimeout(this.elementSelectionDebounceTimer);
        }

        this.elementSelectionDebounceTimer = setTimeout(async () => {
            // Check if this is a duplicate selection
            const selectionKey = selectionInfo.type === 'chart' 
                ? `${selectionInfo.chartId}-${selectionInfo.index}`
                : selectionInfo.text.substring(0, 50);
            
            if (this.lastSelectedElement === selectionKey) {
                return; // Same element selected, skip
            }

            this.lastSelectedElement = selectionKey;
            
            // Add to selection history
            this.elementSelectionHistory.push({
                timestamp: new Date().toISOString(),
                ...selectionInfo
            });
            if (this.elementSelectionHistory.length > 20) {
                this.elementSelectionHistory.shift();
            }

            // Determine if selection warrants commentary
            const shouldComment = this.shouldCommentOnSelection(selectionInfo);
            
            if (shouldComment) {
                // Show thinking animation
                const thinkingId = this.addAgentThinkingMessage();
                
                try {
                    await this.generateElementSelectionCommentary(selectionInfo, thinkingId);
                } catch (error) {
                    console.error('Error generating element selection commentary:', error);
                    this.removeAgentMessage(thinkingId);
                }
            }
        }, 500); // Debounce 500ms
    }

    /**
     * Determine if a selection warrants commentary
     */
    shouldCommentOnSelection(selectionInfo) {
        // Always comment on chart element selections
        if (selectionInfo.type === 'chart') {
            return true;
        }

        // Comment on text selections if they contain metrics, values, or are substantial
        if (selectionInfo.type === 'text') {
            const text = selectionInfo.text;
            // Comment if contains financial/metric data
            if (/\$[\d.,]+[BMKT]?|[\d.,]+%|\d+\.\d+/.test(text)) {
                return true;
            }
            // Comment if substantial text (more than 10 words)
            if (text.split(/\s+/).length >= 10) {
                return true;
            }
        }

        return false;
    }

    /**
     * Generate commentary on element selection
     */
    async generateElementSelectionCommentary(selectionInfo, thinkingMessageId) {
        try {
            const currentTabInfo = this.getCurrentTabInfo();
            const inputs = this.getInputs();
            
            let prompt = `You are a Desktop Agent observing user interactions in a SpaceX valuation application.

CURRENT CONTEXT:
- View: ${this.currentView}
- Tab: ${currentTabInfo.tab || 'N/A'}
- Sub-Tab: ${currentTabInfo.subTab || 'N/A'}
- Model: ${this.currentModelName || 'No model loaded'}
${this.currentData ? `
CURRENT VALUATION:
- Total: $${((this.currentData.total?.value || 0) / 1000).toFixed(2)}T
- Earth: $${((this.currentData.earth?.adjustedValue || 0) / 1000).toFixed(2)}T
- Mars: $${((this.currentData.mars?.adjustedValue || 0) / 1000).toFixed(2)}T
` : ''}

USER SELECTED:
`;

            if (selectionInfo.type === 'chart') {
                prompt += `Chart Element Selection:
- Chart: ${selectionInfo.chartName}
- Element: ${selectionInfo.label}
- Value: ${selectionInfo.value}
- Chart ID: ${selectionInfo.chartId}
`;
            } else if (selectionInfo.type === 'text') {
                prompt += `Text Selection:
- Selected Text: "${selectionInfo.text}"
${selectionInfo.context ? `
- Context: ${JSON.stringify(selectionInfo.context)}
` : ''}
`;
            }

            prompt += `

TASK: Provide a brief, helpful comment (1-2 sentences max) about what the user selected:
1. Acknowledge what they selected
2. Provide context or insight about that element
3. Suggest related areas they might want to explore (with links if helpful)
4. Use link format: [link text|view:viewName] or [link text|view:viewName:subTab] or [link text|url:https://...]

Only respond with "SKIP" if the selection is completely trivial or uninteresting.

Format your response as plain text. Use the link format exactly as shown above.`;

            const systemPrompts = this.agentSystemPrompts || this.getDefaultAgentSystemPrompts();
            const systemPromptText = Object.values(systemPrompts)
                .filter(p => p && p.trim())
                .join('\n\n');

            const response = await fetch('/api/agent/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-AI-Model': document.getElementById('agentAIModelSelect')?.value || this.aiModel || 'grok:grok-3'
                },
                body: JSON.stringify({
                    message: prompt,
                    systemPrompt: systemPromptText,
                    context: {
                        currentView: this.currentView,
                        currentTab: currentTabInfo.tab,
                        currentSubTab: currentTabInfo.subTab,
                        currentModel: {
                            id: this.currentModelId,
                            name: this.currentModelName,
                            inputs: inputs,
                            valuationData: this.currentData
                        },
                        selectionInfo: selectionInfo
                    },
                    history: []
                })
            });

            const result = await response.json();
            
            // Remove thinking message
            if (thinkingMessageId) {
                this.removeAgentMessage(thinkingMessageId);
            }
            
            if (result.success && result.response && 
                !result.response.toUpperCase().includes('SKIP') && 
                result.response.trim().length > 10) {
                // Parse and render commentary with clickable links
                const commentaryWithLinks = this.parseCommentaryLinks(result.response.trim());
                this.addAgentMessage(`👆 ${commentaryWithLinks}`, 'system');
            }
        } catch (error) {
            console.error('Error generating element selection commentary:', error);
            if (thinkingMessageId) {
                this.removeAgentMessage(thinkingMessageId);
            }
        }
    }

    /**
     * Toggle agent commentary on/off
     */
    toggleAgentCommentary() {
        this.agentCommentaryEnabled = !this.agentCommentaryEnabled;
        const toggleBtn = document.getElementById('agentCommentaryToggleBtn');
        const icon = toggleBtn?.querySelector('i');
        
        if (toggleBtn && icon) {
            if (this.agentCommentaryEnabled) {
                icon.setAttribute('data-lucide', 'message-square');
                toggleBtn.title = 'Disable Context Commentary';
                toggleBtn.style.opacity = '1';
                toggleBtn.style.color = 'var(--primary-color)';
            } else {
                icon.setAttribute('data-lucide', 'message-square');
                toggleBtn.title = 'Enable Context Commentary';
                toggleBtn.style.opacity = '0.4';
                toggleBtn.style.color = 'var(--text-secondary)';
            }
            if (window.lucide) window.lucide.createIcons();
        }
        
        // Save preference
        localStorage.setItem('agentCommentaryEnabled', this.agentCommentaryEnabled.toString());
        console.log(`💬 Agent commentary ${this.agentCommentaryEnabled ? 'enabled' : 'disabled'}`);
    }

    addAgentLoadingMessage() {
        const messagesArea = document.getElementById('agentChatMessages');
        if (!messagesArea) return null;

        const messageId = `loading-${Date.now()}`;
        const messageDiv = document.createElement('div');
        messageDiv.className = 'agent-message agent-message-assistant agent-loading-message';
        messageDiv.id = messageId;
        messageDiv.innerHTML = `
            <div class="message-content">
                <p><i data-lucide="loader" class="spinning"></i> Thinking...</p>
            </div>
        `;
        messagesArea.appendChild(messageDiv);
        // Auto-scroll to bottom smoothly
        setTimeout(() => {
            messagesArea.scrollTo({
                top: messagesArea.scrollHeight,
                behavior: 'smooth'
            });
        }, 10);
        if (window.lucide) window.lucide.createIcons();

        return messageId;
    }

    /**
     * Add a thinking animation message for context change detection
     * Very subtle - just a spinning icon, no framing or boxes
     */
    addAgentThinkingMessage() {
        const messagesArea = document.getElementById('agentChatMessages');
        if (!messagesArea) return null;

        const messageId = `thinking-${Date.now()}`;
        const messageDiv = document.createElement('div');
        messageDiv.className = 'agent-thinking-message';
        messageDiv.id = messageId;
        messageDiv.style.cssText = `
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 4px 0;
            margin: 4px 0;
            background: transparent;
            border: none;
        `;
        const iconElement = document.createElement('i');
        iconElement.setAttribute('data-lucide', 'loader');
        iconElement.className = 'spinning';
        iconElement.style.cssText = `
            width: 16px;
            height: 16px;
            color: var(--text-secondary);
            opacity: 0.6;
            display: inline-block;
            animation: spin 1s linear infinite;
        `;
        messageDiv.appendChild(iconElement);
        messagesArea.appendChild(messageDiv);
        // Auto-scroll to bottom smoothly
        setTimeout(() => {
            messagesArea.scrollTo({
                top: messagesArea.scrollHeight,
                behavior: 'smooth'
            });
        }, 10);
        if (window.lucide) window.lucide.createIcons();

        return messageId;
    }

    removeAgentMessage(messageId) {
        const message = document.getElementById(messageId);
        if (message) {
            message.remove();
        }
    }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    // Configure Alpha Vantage API key
    const alphaVantageKey = '75RXWZSDFJIGLFBZ';
    localStorage.setItem('alphaVantageApiKey', alphaVantageKey);
    console.log('✅ Alpha Vantage API key configured:', alphaVantageKey.substring(0, 8) + '...');
    
    window.app = new ValuationApp();
});

