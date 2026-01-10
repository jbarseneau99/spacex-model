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
        this.autoRunningMonteCarlo = false; // Flag to track auto-runs
        this.pendingMonteCarloRun = null; // Store pending run parameters
        this.currentMonteCarloConfig = null; // Store Monte Carlo config from loaded model
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
            bandwidthEconomics: null
        };
        this.init();
    }

    async init() {
        this.setupEventListeners();
        this.loadScenarios();
        
        // Auto-load first model on startup
        await this.autoLoadFirstModel();
        this.loadSavedInputs();
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
        document.getElementById('calculateBtn').addEventListener('click', () => {
            this.calculateValuation(2030); // Default to 2030, but logic works for any year
        });

        // Input save/reset
        document.getElementById('saveInputsBtn').addEventListener('click', () => {
            this.saveInputs();
        });
        document.getElementById('resetInputsBtn').addEventListener('click', () => {
            this.resetInputs();
        });

        // Settings modal
        document.getElementById('settingsBtn').addEventListener('click', () => {
            document.getElementById('settingsModal').classList.add('active');
        });
        document.getElementById('closeSettingsBtn').addEventListener('click', () => {
            document.getElementById('settingsModal').classList.remove('active');
        });

        // Export
        document.getElementById('exportBtn').addEventListener('click', () => {
            this.exportData();
        });

        // AI Insights
        document.getElementById('aiInsightsBtn').addEventListener('click', () => {
            this.toggleAIInsights();
        });
        document.getElementById('refreshInsightsBtn').addEventListener('click', () => {
            this.generateAIInsights();
        });

        // Sensitivity analysis
        document.getElementById('runSensitivityBtn')?.addEventListener('click', () => {
            this.runSensitivityAnalysis();
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
        document.getElementById('runCustomStressBtn').addEventListener('click', () => {
            this.runCustomStressTest();
        });

        // Monte Carlo simulation
        document.getElementById('runMonteCarloBtn').addEventListener('click', () => {
            this.runMonteCarloSimulation();
        });

        // Scenario comparison
        document.getElementById('runScenariosBtn').addEventListener('click', () => {
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
        document.getElementById('saveCurrentModelBtn').addEventListener('click', () => {
            this.openSaveModelModal();
        });

        // Help modal
        document.getElementById('helpBtn').addEventListener('click', () => {
            document.getElementById('helpModal').classList.add('active');
            if (window.lucide) window.lucide.createIcons();
        });

        document.getElementById('closeHelpModal').addEventListener('click', () => {
            document.getElementById('helpModal').classList.remove('active');
        });

        // Close help modal on background click
        document.getElementById('helpModal').addEventListener('click', (e) => {
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
                document.getElementById(`helpTab-${tabName}`).classList.add('active');
                
                // Refresh icons
                if (window.lucide) window.lucide.createIcons();
            });
        });

        // Insights tab switching (works for both Insights and Charts views)
        document.querySelectorAll('.insights-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                const tabName = tab.dataset.tab;
                const viewContainer = tab.closest('.view');
                
                // Remove active class from all tabs in this view only
                viewContainer.querySelectorAll('.insights-tab').forEach(t => t.classList.remove('active'));
                viewContainer.querySelectorAll('.insights-tab-content').forEach(c => c.classList.remove('active'));
                
                // Add active class to clicked tab and corresponding content
                tab.classList.add('active');
                const contentEl = document.getElementById(`insightsTab-${tabName}`);
                if (contentEl) {
                    contentEl.classList.add('active');
                }
                
                // Refresh icons
                if (window.lucide) window.lucide.createIcons();
                
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
        document.getElementById('confirmSaveModelBtn').addEventListener('click', () => {
            this.saveModel();
        });
        document.getElementById('cancelSaveModelBtn').addEventListener('click', () => {
            document.getElementById('saveModelModal').classList.remove('active');
        });
        document.getElementById('closeSaveModelBtn').addEventListener('click', () => {
            document.getElementById('saveModelModal').classList.remove('active');
        });

        // Model list filters
        const modelSearch = document.getElementById('modelSearch');
        const modelSort = document.getElementById('modelSort');
        const showFavoritesOnly = document.getElementById('showFavoritesOnly');
        
        if (modelSearch) modelSearch.addEventListener('input', () => this.loadModels());
        if (modelSort) modelSort.addEventListener('change', () => this.loadModels());
        if (showFavoritesOnly) showFavoritesOnly.addEventListener('change', () => this.loadModels());

        // Input changes trigger recalculation
        document.querySelectorAll('#inputs input').forEach(input => {
            input.addEventListener('change', () => {
                // Auto-save on change
                this.saveInputs();
            });
        });
    }

    switchView(viewName) {
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

        this.currentView = viewName;

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

        // Update charts when switching to charts view
        if (viewName === 'charts') {
            if (this.currentData) {
                this.updateChartsView(this.currentData).catch(err => console.error('Error updating charts:', err));
            }
        }

        // Auto-calculate scenarios when switching to scenarios view
        if (viewName === 'scenarios') {
            this.autoCalculateScenarios();
        }

        // Auto-run sensitivity analysis when switching to sensitivity view
        if (viewName === 'sensitivity') {
            this.autoRunSensitivityAnalysis();
        }

        // Update Earth/Mars/Insights views if data is available
        if (this.currentData) {
            if (viewName === 'earth' && this.currentData.earth) {
                this.updateEarthView(this.currentData);
            }
            if (viewName === 'mars' && this.currentData.mars) {
                this.updateMarsView(this.currentData);
            }
            // Insights and Charts views are handled in switchView
        }

        // Update Monte Carlo config display when switching to Monte Carlo tab
        if (viewName === 'monte-carlo') {
            if (this.currentMonteCarloConfig) {
                this.displayMonteCarloConfig(this.currentMonteCarloConfig, true);
            } else {
                this.displayMonteCarloConfig(null, false);
            }
        }

        // Refresh icons
        lucide.createIcons();
    }

    getInputs() {
        return {
            earth: {
                starlinkPenetration: parseFloat(document.getElementById('starlinkPenetration').value),
                bandwidthPriceDecline: parseFloat(document.getElementById('bandwidthPriceDecline').value),
                launchVolume: parseFloat(document.getElementById('launchVolume').value),
                launchPriceDecline: parseFloat(document.getElementById('launchPriceDecline').value)
            },
            mars: {
                firstColonyYear: parseInt(document.getElementById('firstColonyYear').value),
                transportCostDecline: parseFloat(document.getElementById('transportCostDecline').value),
                populationGrowth: parseFloat(document.getElementById('populationGrowth').value),
                industrialBootstrap: document.getElementById('industrialBootstrap').checked
            },
            financial: {
                discountRate: parseFloat(document.getElementById('discountRate').value),
                dilutionFactor: parseFloat(document.getElementById('dilutionFactor').value),
                terminalGrowth: parseFloat(document.getElementById('terminalGrowth').value)
            }
        };
    }

    async calculateValuation(horizonYear = 2030, modelId = null) {
        const inputs = this.getInputs();
        
        // Show loading indicator (only if button exists)
        const calculateBtn = document.getElementById('calculateBtn');
        let originalText = null;
        if (calculateBtn) {
            originalText = calculateBtn.innerHTML;
            calculateBtn.setAttribute('data-original-text', originalText);
            calculateBtn.disabled = true;
            calculateBtn.innerHTML = '<i data-lucide="loader-2"></i> Calculating...';
            if (window.lucide) window.lucide.createIcons();
        }
        
        try {
            const response = await fetch('/api/calculate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    inputs: inputs,
                    horizonYear: horizonYear,
                    modelId: modelId || this.currentModelId
                })
            });

            const result = await response.json();
            
            if (result.success) {
                this.currentData = result.data;
                
                // Update dashboard title
                this.updateDashboardTitle(this.currentModelName || null);
                
                this.updateDashboard(result.data);
                this.updateCashFlowTable(result.data.earth);
            } else {
                alert('Error: ' + result.error);
            }
        } catch (error) {
            console.error('Calculation error:', error);
            alert('Failed to calculate valuation. Check console for details.');
        } finally {
            // Restore button (only if it exists)
            const calculateBtn = document.getElementById('calculateBtn');
            if (calculateBtn && originalText !== null) {
                calculateBtn.disabled = false;
                calculateBtn.innerHTML = originalText;
                if (window.lucide) window.lucide.createIcons();
            }
        }
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
        if (!data || !data.total) {
            console.error('Invalid data for dashboard update:', data);
            return;
        }

        const formatValue = (value) => {
            if (!value && value !== 0) return 'N/A';
            // Values from calculation engine are in billions
            // If value is >= 1e9, it's in raw dollars, convert to trillions
            // If value >= 1000, it's in billions but >= 1 trillion, show as trillions
            // If value < 1000, it's in billions
            if (value >= 1e9) {
                // Raw dollars - convert to trillions
                return `$${(value / 1e12).toFixed(2)}T`;
            } else if (value >= 1000) {
                // Billions >= 1000 = trillions
                return `$${(value / 1000).toFixed(2)}T`;
            } else if (value >= 1) {
                // Billions (1-999 range)
                return `$${value.toFixed(1)}B`;
            } else if (value >= 0.001) {
                // Less than 1 billion, show as millions
                return `$${(value * 1000).toFixed(1)}M`;
            } else {
                // Very small values
                return `$${(value * 1e6).toFixed(1)}K`;
            }
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

        // Update charts
        try {
            this.updateValuationChart(data);
        } catch (err) {
            console.error('Error updating valuation chart:', err);
        }
        try {
            this.updateCashFlowTimelineChart(data);
        } catch (err) {
            console.error('Error updating cash flow timeline chart:', err);
        }
        try {
            this.updateRevenueBreakdownChart(data);
        } catch (err) {
            console.error('Error updating revenue breakdown chart:', err);
        }

        // Update Earth and Mars views if they're active
        if (this.currentView === 'earth' && data.earth) {
            this.updateEarthView(data);
        }
        if (this.currentView === 'mars' && data.mars) {
            this.updateMarsView(data);
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
                        fill: true
                    },
                    {
                        label: 'Cumulative PV ($B)',
                        data: cumulativePV,
                        borderColor: '#10b981',
                        backgroundColor: 'rgba(16, 185, 129, 0.1)',
                        yAxisID: 'y1',
                        tension: 0.4,
                        fill: false
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
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
        if (scenario.earth) {
            document.getElementById('starlinkPenetration').value = scenario.earth.starlinkPenetration;
            document.getElementById('bandwidthPriceDecline').value = scenario.earth.bandwidthPriceDecline;
            document.getElementById('launchVolume').value = scenario.earth.launchVolume;
            document.getElementById('launchPriceDecline').value = scenario.earth.launchPriceDecline;
        }
        
        if (scenario.mars) {
            document.getElementById('firstColonyYear').value = scenario.mars.firstColonyYear;
            document.getElementById('transportCostDecline').value = scenario.mars.transportCostDecline;
            document.getElementById('populationGrowth').value = scenario.mars.populationGrowth;
            document.getElementById('industrialBootstrap').checked = scenario.mars.industrialBootstrap;
        }
        
        if (scenario.financial) {
            document.getElementById('discountRate').value = scenario.financial.discountRate;
            document.getElementById('dilutionFactor').value = scenario.financial.dilutionFactor;
            document.getElementById('terminalGrowth').value = scenario.financial.terminalGrowth;
        }

        // Switch to inputs view
        this.switchView('inputs');
        this.saveInputs();
        
        // Refresh icons
        lucide.createIcons();
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
                this.renderSensitivityChart(result.data, variable);
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
        if (!ctx) return;
        
        if (!data || data.length === 0) {
            console.error('No sensitivity data to render');
            return;
        }

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

        // Render scenarios
        this.renderMarsScenarios(data.mars.scenarios);

        // Get inputs for charts
        const inputs = this.getInputs();

        // Update charts
        this.updateMarsOptionChart(data.mars);
        this.updateMarsPopulationChart(data.mars);
        this.updateMarsLaunchScalingChart(data.mars, inputs);
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
        const ctx = document.getElementById('starlinkChart');
        if (!ctx) return;

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

        this.charts.starlink = new Chart(ctx, {
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
        const ctx = document.getElementById('launchChart');
        if (!ctx) return;

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

        this.charts.launch = new Chart(ctx, {
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
            const insightsModelEl = document.getElementById('insightsCurrentModel');
            if (insightsModelEl) insightsModelEl.textContent = 'No model loaded';
            return;
        }
        
        // Update model name
        const modelName = this.currentModelName || 'Current Model';
        const insightsModelEl = document.getElementById('insightsCurrentModel');
        if (insightsModelEl) insightsModelEl.textContent = modelName;
        
        // Generate text-based insights (no charts)
        this.generateKeyInsights(data, this.getInputs());
        this.generateValueDrivers(data, this.getInputs());
        this.generateRiskAssessment(data, this.getInputs());
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

        if (earthData.revenue && earthData.cashFlow && earthData.costs) {
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
        // Fallback: use scenario comparison data
        if (!this.currentData) return;

        const scenarios = this.currentData.scenarios;
        if (!scenarios) return;

        const earth2030 = scenarios.earth2030?.earthResults?.enterpriseValueFromEBITDA || scenarios.earth2030?.earthResults?.terminalValue || 0;
        const earthMars2040 = scenarios.earthMars2040?.earthResults?.enterpriseValueFromEBITDA || scenarios.earthMars2040?.earthResults?.terminalValue || 0;
        const mars2040 = scenarios.earthMars2040?.marsResults?.expectedValue || 0;
        const total2040 = earthMars2040 + mars2040;

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

        scenarios.forEach(scenario => {
            const card = document.createElement('div');
            card.className = 'scenario-card';
            card.innerHTML = `
                <h4>${scenario.name}</h4>
                <div class="metric-value-small">${formatBillion(scenario.value)}</div>
                <div class="metric-label-small">Probability: ${(scenario.probability * 100).toFixed(0)}%</div>
            `;
            grid.appendChild(card);
        });
    }

    updateMarsOptionChart(marsData) {
        const ctx = document.getElementById('marsOptionChart');
        if (!ctx) return;

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

        this.charts.marsOption = new Chart(ctx, {
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
        const ctx = document.getElementById('marsPopulationChart');
        if (!ctx) return;

        const inputs = this.getInputs();
        const years = [];
        const population = [];
        const currentYear = new Date().getFullYear();
        const colonyYear = inputs.mars.firstColonyYear;
        const horizonYear = 2040;

        let pop = 1000; // Initial population
        for (let year = colonyYear; year <= horizonYear; year++) {
            years.push(year);
            if (year === colonyYear) {
                population.push(pop);
            } else {
                pop = pop * (1 + inputs.mars.populationGrowth);
                population.push(pop);
            }
        }

        if (this.charts.marsPopulation) {
            this.charts.marsPopulation.destroy();
        }

        this.charts.marsPopulation = new Chart(ctx, {
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
        // Calculate base case
        const baseResponse = await fetch('/api/calculate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(baseInputs)
        }).then(r => r.json());

        if (!baseResponse.success) return;

        const baseValue = baseResponse.data.total.value; // Already in billions
        const stressValue = stressData.total.value; // Already in billions
        const impact = ((stressValue - baseValue) / baseValue) * 100;

        // Format values correctly (already in billions)
        const formatBillion = (value) => {
            if (!value && value !== 0) return 'N/A';
            // Values are already in billions
            // If >= 1000 billion, display as trillions
            if (value >= 1000) {
                return `$${(value / 1000).toFixed(1)}T`;
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

        // Values are already in billions, if >= 1000 convert, otherwise use as-is
        const formatForChart = (value) => {
            if (value >= 1000) return value / 1e9;
            return value;
        };

        this.charts.stress = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: ['Base Case', 'Stress Scenario'],
                datasets: [{
                    label: 'Enterprise Value ($B)',
                    data: [formatForChart(baseValue), formatForChart(stressValue)],
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
                                return `$${context.parsed.y.toFixed(1)}B`;
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        title: { display: true, text: 'Value ($B)' },
                        beginAtZero: true
                    }
                }
            }
        });
    }

    // Helper calculation methods (matching backend logic)
    calculateBandwidthCapacity(year, earth) {
        const baseCapacity = 100; // Tbps
        const growthRate = earth.starlinkPenetration || 0.15;
        return baseCapacity * Math.pow(1 + growthRate, year) * 1000; // Convert to Gbps
    }

    calculateBandwidthPrice(year, earth) {
        const basePrice = 100; // $/Gbps/month
        const declineRate = earth.bandwidthPriceDecline || 0.10;
        return basePrice * Math.pow(1 - declineRate, year);
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
        
        // Clear flags
        if (this.autoRunningMonteCarlo) {
            this.autoRunningMonteCarlo = false;
        }
        this.pendingMonteCarloRun = null;
        
        // Show progress modal
        const progressModal = document.getElementById('monteCarloProgressModal');
        const progressBar = document.getElementById('monteCarloProgressBar');
        const progressText = document.getElementById('monteCarloProgressText');
        
        if (progressModal) {
            progressModal.classList.add('active');
            progressBar.style.width = '10%';
            progressText.textContent = 'Parameters have changed - Monte Carlo is producing new simulations...';
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
                // Store results for display
                this.currentMonteCarloData = result.data;
                this.displayMonteCarloResults(result.data);
                
                // Automatically save simulation if we have a model loaded
                if (this.currentModelId) {
                    await this.autoSaveMonteCarloSimulation(result.data, baseInputs, runs);
                }
            } else {
                alert('Simulation failed: ' + result.error);
            }
        } catch (error) {
            console.error('Monte Carlo error:', error);
            alert('Failed to run Monte Carlo simulation');
        } finally {
            // Hide progress modal
            if (progressModal) {
                progressModal.classList.remove('active');
            }
            clearInterval(progressInterval);
            
            // Restore button
            btn.disabled = false;
            btn.innerHTML = originalText;
            lucide.createIcons();
        }
    }

    displayMonteCarloResults(data) {
        const stats = data.statistics.totalValue;
        const formatBillion = (value) => {
            if (!value && value !== 0) return 'N/A';
            // Values are already in billions
            // If >= 1000 billion, display as trillions
            if (value >= 1000) {
                return `$${(value / 1000).toFixed(2)}T`;
            }
            return `$${value.toFixed(2)}B`;
        };

        // Update statistics
        document.getElementById('mcMean').textContent = formatBillion(stats.mean);
        document.getElementById('mcMedian').textContent = formatBillion(stats.median);
        document.getElementById('mcStdDev').textContent = formatBillion(stats.stdDev);
        document.getElementById('mcMin').textContent = formatBillion(stats.min);
        document.getElementById('mcMax').textContent = formatBillion(stats.max);
        document.getElementById('mcP10').textContent = formatBillion(stats.p10);
        document.getElementById('mcQ1').textContent = formatBillion(stats.q1);
        document.getElementById('mcQ3').textContent = formatBillion(stats.q3);
        document.getElementById('mcP90').textContent = formatBillion(stats.p90);

        // Show results section
        document.getElementById('monteCarloResultsSection').style.display = 'block';

        // Store current simulation data for saving
        this.currentMonteCarloData = data;

        // Update charts
        this.updateMonteCarloDistributionChart(data.statistics.distribution);
        this.updateMonteCarloComparisonChart(data.statistics);
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
        
        // Update source info
        if (configSource) {
            if (fromModel && config) {
                configSource.innerHTML = `<i data-lucide="database"></i> Loaded from model: "${this.currentModelName || 'Current Model'}"`;
            } else {
                configSource.innerHTML = `<i data-lucide="info"></i> Using default configuration`;
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
                // Reload models to update simulation counts
                if (this.currentView === 'models') {
                    this.loadModels();
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

        // Find common x-axis range
        let minX = Infinity;
        let maxX = -Infinity;
        let hasValidData = false;
        
        Object.values(scenarioResults).forEach((result, idx) => {
            if (!result || !result.statistics || !result.statistics.distribution) {
                console.warn(`⚠️ Scenario ${idx} missing statistics or distribution`);
                return;
            }
            const dist = result.statistics.distribution;
            if (dist.min !== undefined && dist.max !== undefined) {
                minX = Math.min(minX, dist.min);
                maxX = Math.max(maxX, dist.max);
                hasValidData = true;
            }
        });

        if (!hasValidData || minX === Infinity || maxX === -Infinity) {
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

            // Map to common x-axis bins
            const mappedHistogram = new Array(bins).fill(0);
            dist.binCenters.forEach((center, idx) => {
                const binIndex = Math.min(Math.floor((center - minX) / binSize), bins - 1);
                if (binIndex >= 0 && binIndex < bins) {
                    mappedHistogram[binIndex] += probabilityDensity[idx];
                }
            });

            console.log(`✅ Added dataset for ${scenario}:`, {
                dataPoints: mappedHistogram.length,
                maxValue: Math.max(...mappedHistogram),
                nonZeroBins: mappedHistogram.filter(v => v > 0).length
            });

            datasets.push({
                label: color.label,
                data: mappedHistogram,
                backgroundColor: color.bg,
                borderColor: color.border,
                borderWidth: 2,
                fill: true,
                tension: 0.4, // Smooth curve
                pointRadius: 0
            });
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
                            beginAtZero: true
                        },
                        x: {
                            title: {
                                display: true,
                                text: 'Enterprise Value ($T)'
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

    // Auto-load first model on startup
    async autoLoadFirstModel() {
        try {
            console.log('📦 Auto-loading first model...');
            const response = await fetch('/api/models?limit=1&sortBy=createdAt&sortOrder=desc');
            const result = await response.json();
            
            if (result.success && result.data && result.data.length > 0) {
                const firstModel = result.data[0];
                console.log('✅ Found first model:', firstModel.name);
                // Load model silently (no notifications)
                await this.loadModel(firstModel._id, true);
            } else {
                console.log('ℹ️ No models found - starting with empty inputs');
            }
        } catch (error) {
            console.error('❌ Failed to auto-load first model:', error);
            // Continue without auto-loading if it fails
        }
    }

    // Model Management
    async loadModels(page = 1) {
        try {
            const search = document.getElementById('modelSearch').value;
            const sort = document.getElementById('modelSort').value.split('-');
            const favoriteOnly = document.getElementById('showFavoritesOnly').checked;

            const params = new URLSearchParams({
                page: page.toString(),
                limit: '12',
                sortBy: sort[0],
                sortOrder: sort[1]
            });

            if (search) params.append('search', search);
            if (favoriteOnly) params.append('favorite', 'true');

            const response = await fetch(`/api/models?${params}`);
            const result = await response.json();

            if (result.success) {
                this.renderModels(result.data);
                this.renderPagination(result.pagination, page);
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

    renderModels(models) {
        const grid = document.getElementById('modelsGrid');
        if (!grid) return;

        grid.innerHTML = '';

        if (models.length === 0) {
            grid.innerHTML = '<div class="empty-state">No models found. Create your first model by calculating a valuation and saving it.</div>';
            return;
        }

        models.forEach(model => {
            const card = document.createElement('div');
            card.className = `model-card ${model.isFavorite ? 'favorite' : ''}`;
            
            const tagsHtml = model.tags && model.tags.length > 0
                ? `<div class="model-tags">${model.tags.map(tag => `<span class="tag">${tag}</span>`).join('')}</div>`
                : '';

            card.innerHTML = `
                <div class="model-header">
                    <div>
                        <div class="model-name">${model.name}</div>
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
                    <button class="btn btn-secondary btn-sm" onclick="app.duplicateModel('${model._id}')">
                        <i data-lucide="copy"></i> Duplicate
                    </button>
                    <button class="btn-icon" onclick="app.deleteModel('${model._id}')" title="Delete">
                        <i data-lucide="trash-2"></i>
                    </button>
                </div>
            `;
            grid.appendChild(card);
        });

        lucide.createIcons();
    }

    renderPagination(pagination, currentPage) {
        const paginationEl = document.getElementById('modelsPagination');
        if (!paginationEl) return;

        if (pagination.pages <= 1) {
            paginationEl.innerHTML = '';
            return;
        }

        let html = '';
        if (currentPage > 1) {
            html += `<button onclick="app.loadModels(${currentPage - 1})">Previous</button>`;
        }

        html += `<span class="page-info">Page ${currentPage} of ${pagination.pages}</span>`;

        if (currentPage < pagination.pages) {
            html += `<button onclick="app.loadModels(${currentPage + 1})">Next</button>`;
        }

        paginationEl.innerHTML = html;
    }

    openSaveModelModal() {
        if (!this.currentData) {
            alert('Please calculate a valuation first');
            return;
        }

        document.getElementById('saveModelName').value = '';
        document.getElementById('saveModelDescription').value = '';
        document.getElementById('saveModelTags').value = '';
        document.getElementById('saveModelFavorite').checked = false;
        document.getElementById('saveModelModal').classList.add('active');
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

        try {
            const response = await fetch('/api/models', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name,
                    description,
                    inputs,
                    tags,
                    isFavorite,
                    monteCarloConfig
                })
            });

            const result = await response.json();
            if (result.success) {
                document.getElementById('saveModelModal').classList.remove('active');
                alert('Model saved successfully!');
                if (this.currentView === 'models') {
                    this.loadModels();
                }
            } else {
                alert('Error: ' + result.error);
            }
        } catch (error) {
            console.error('Save error:', error);
            alert('Failed to save model');
        }
    }

    async loadModel(id, silent = false) {
        const previousModelId = this.currentModelId;
        this.currentModelId = id; // Store current model ID for saving simulations
        
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
                this.currentModelName = model.name;

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
                            } else {
                                console.warn(`⚠️ Model "${model.name}" inputs have changed - existing simulations are outdated`);
                                console.warn('  Differences detected - simulations need rerun');
                                // Clear any cached simulation
                                this.latestSimulation = null;
                                // Store flag that simulations need rerun
                                this.simulationsNeedRerun = true;
                                
                                // Show confirmation modal instead of system confirm
                                setTimeout(() => {
                                    this.showMonteCarloConfirmModal(model.name);
                                }, 1000); // Wait 1 second after model loads
                            }
                        }
                    } catch (error) {
                        console.warn('Could not load simulations:', error);
                        this.simulationsNeedRerun = false;
                        this.latestSimulation = null;
                    }
                } else {
                    console.log(`ℹ️ Model "${model.name}" has no simulations - simulations will need to be run`);
                    this.simulationsNeedRerun = false;
                    this.latestSimulation = null;
                }

                // Automatically recalculate valuation with current inputs
                console.log('Model loaded. Recalculating valuation...');
                await this.calculateValuation(2030, model._id);
                this.updateDashboardTitle(model.name);

                // Switch to dashboard view
                this.switchView('dashboard');

                // Save inputs to local storage
                this.saveInputs();

                // Force UI refresh
                setTimeout(() => {
                    if (window.lucide) window.lucide.createIcons();
                    if (this.currentData) {
                        this.updateDashboard(this.currentData);
                    }
                    
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

    async deleteModel(id) {
        if (!confirm('Are you sure you want to delete this model?')) {
            return;
        }

        try {
            const response = await fetch(`/api/models/${id}`, {
                method: 'DELETE'
            });

            const result = await response.json();
            if (result.success) {
                this.loadModels();
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

        if (!earthData || !earthData.revenue || earthData.revenue.length === 0) {
            console.warn('Margin evolution chart: No earth data available', earthData);
            return;
        }

        try {
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

            const margins = result.data;
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

        if (!earthData || !earthData.revenue || earthData.revenue.length === 0) {
            console.warn('Unit economics chart: No earth data available', earthData);
            return;
        }

        try {
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

            const metrics = result.data;
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

        if (!earthData || !earthData.revenue || earthData.revenue.length === 0) {
            console.warn('Capex efficiency chart: No earth data available', earthData);
            return;
        }

        try {
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

            const metrics = result.data;
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
        const ctx = document.getElementById('utilizationChart');
        if (!ctx) {
            console.warn('Utilization chart canvas not found');
            return;
        }

        if (!earthData || !inputs) {
            console.warn('Utilization chart: Missing earthData or inputs', { earthData: !!earthData, inputs: !!inputs });
            return;
        }

        try {
            console.log('Updating utilization chart with data:', { earthData: !!earthData, inputs: !!inputs });
            const response = await fetch('/api/insights/utilization', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ earthResults: earthData, inputs })
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

            this.charts.utilization = new Chart(ctx, {
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
        }
    }

    async updateTechnologyTransitionChart(earthData) {
        const ctx = document.getElementById('technologyTransitionChart');
        if (!ctx) return;

        try {
            const response = await fetch('/api/insights/technology-transition', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ earthResults: earthData })
            });
            const result = await response.json();
            if (!result.success) return;

            const transition = result.data;
            const years = transition.map(t => t.year);
            const v2Satellites = transition.map(t => t.v2Satellites);
            const v3Satellites = transition.map(t => t.v3Satellites);

            if (this.charts.technologyTransition) {
                this.charts.technologyTransition.destroy();
            }

            this.charts.technologyTransition = new Chart(ctx, {
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
        }
    }

    async updateLaunchCadenceChart(earthData, inputs) {
        const ctx = document.getElementById('launchCadenceChart');
        if (!ctx) return;

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

            this.charts.launchCadence = new Chart(ctx, {
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
        const ctx = document.getElementById('bandwidthEconomicsChart');
        if (!ctx) return;

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

            this.charts.bandwidthEconomics = new Chart(ctx, {
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
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.app = new ValuationApp();
});

