/**
 * Performance Monitor UI για παρακολούθηση βελτιστοποιήσεων
 * Real-time performance statistics display
 */

export class PerformanceMonitorUI {
    constructor(sceneManager) {
        this.sceneManager = sceneManager;
        this.isVisible = false;
        this.updateInterval = 1000; // Update every second
        this.intervalId = null;
        
        this.createUI();
        this.bindEvents();
    }

    /**
     * Create performance monitor UI
     */
    createUI() {
        // Create container
        this.container = document.createElement('div');
        this.container.id = 'performance-monitor';
        this.container.style.cssText = `
            position: fixed;
            top: 10px;
            right: 10px;
            width: 320px;
            background: rgba(0, 0, 0, 0.8);
            color: white;
            padding: 15px;
            border-radius: 8px;
            font-family: monospace;
            font-size: 12px;
            z-index: 1000;
            display: none;
            max-height: 500px;
            overflow-y: auto;
        `;

        // Create header
        const header = document.createElement('div');
        header.style.cssText = `
            font-weight: bold;
            margin-bottom: 10px;
            color: #00ff00;
            border-bottom: 1px solid #333;
            padding-bottom: 5px;
        `;
        header.textContent = '⚡ Performance Monitor';
        this.container.appendChild(header);

        // Create content area
        this.contentArea = document.createElement('div');
        this.container.appendChild(this.contentArea);

        // Create controls
        this.createControls();

        // Add to DOM
        document.body.appendChild(this.container);
    }

    /**
     * Create control buttons
     */
    createControls() {
        const controlsContainer = document.createElement('div');
        controlsContainer.style.cssText = `
            margin-top: 15px;
            padding-top: 10px;
            border-top: 1px solid #333;
        `;

        // Toggle instanced rendering button
        const instancedBtn = this.createButton('Toggle Instanced Rendering', () => {
            const current = this.sceneManager.isInstancedRenderingEnabled();
            this.sceneManager.toggleInstancedRendering(!current);
            // Rebuild warehouse to apply changes
            this.rebuildWarehouse();
        });

        // Toggle LOD button
        const lodBtn = this.createButton('Toggle LOD System', () => {
            const current = this.sceneManager.useLOD;
            this.sceneManager.toggleLOD(!current);
        });

        // LOD level buttons
        const lodLevelContainer = document.createElement('div');
        lodLevelContainer.style.marginTop = '10px';
        
        const lodLevels = ['HIGH', 'MEDIUM', 'LOW'];
        lodLevels.forEach(level => {
            const btn = this.createButton(`LOD ${level}`, () => {
                this.sceneManager.setLODLevel(level);
            });
            btn.style.margin = '2px';
            btn.style.padding = '3px 6px';
            btn.style.fontSize = '10px';
            lodLevelContainer.appendChild(btn);
        });

        controlsContainer.appendChild(instancedBtn);
        controlsContainer.appendChild(lodBtn);
        controlsContainer.appendChild(lodLevelContainer);

        this.container.appendChild(controlsContainer);
    }

    /**
     * Create button element
     */
    createButton(text, onClick) {
        const button = document.createElement('button');
        button.textContent = text;
        button.style.cssText = `
            background: #333;
            color: white;
            border: 1px solid #555;
            padding: 5px 10px;
            margin: 5px 0;
            border-radius: 4px;
            cursor: pointer;
            font-size: 11px;
            width: 100%;
        `;
        
        button.addEventListener('mouseenter', () => {
            button.style.background = '#555';
        });
        
        button.addEventListener('mouseleave', () => {
            button.style.background = '#333';
        });

        button.addEventListener('click', onClick);
        return button;
    }

    /**
     * Bind keyboard events
     */
    bindEvents() {
        document.addEventListener('keydown', (e) => {
            // Toggle monitor with 'P' key
            if (e.key.toLowerCase() === 'p' && !e.ctrlKey && !e.altKey) {
                this.toggle();
                e.preventDefault();
            }
        });
    }

    /**
     * Toggle monitor visibility
     */
    toggle() {
        this.isVisible = !this.isVisible;
        this.container.style.display = this.isVisible ? 'block' : 'none';
        
        if (this.isVisible) {
            this.startUpdating();
        } else {
            this.stopUpdating();
        }
    }

    /**
     * Start updating statistics
     */
    startUpdating() {
        this.stopUpdating(); // Clear any existing interval
        
        this.update(); // Initial update
        this.intervalId = setInterval(() => {
            this.update();
        }, this.updateInterval);
    }

    /**
     * Stop updating statistics
     */
    stopUpdating() {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
    }

    /**
     * Update statistics display
     */
    update() {
        if (!this.isVisible) return;

        try {
            // Get LOD statistics
            const lodStats = this.sceneManager.getLODStats();
            
            // Get instanced racks statistics if available
            let instancedStats = null;
            this.sceneManager.warehouseGroup.traverse((child) => {
                if (child.userData && child.userData.isInstancedRack && child.parent.getStats) {
                    instancedStats = child.parent.getStats();
                }
            });

            // Build HTML content
            let html = this.buildStatsHTML(lodStats, instancedStats);
            
            this.contentArea.innerHTML = html;
        } catch (error) {
            this.contentArea.innerHTML = `<div style="color: red;">Error: ${error.message}</div>`;
        }
    }

    /**
     * Build HTML for statistics
     */
    buildStatsHTML(lodStats, instancedStats) {
        let html = '';

        // System status
        html += `<div style="color: #00ff00; margin-bottom: 10px;">
            <strong>🚀 System Status</strong><br>
            Instanced Rendering: ${this.sceneManager.isInstancedRenderingEnabled() ? '✅' : '❌'}<br>
            LOD System: ${this.sceneManager.useLOD ? '✅' : '❌'}
        </div>`;

        // LOD Statistics
        if (lodStats) {
            const lodData = lodStats.lod || lodStats;
            html += `<div style="margin-bottom: 10px;">
                <strong>📊 LOD Statistics</strong><br>
                Current Level: <span style="color: #ffff00;">${lodData.currentLOD}</span><br>
                Frame Time: ${lodData.averageFrameTime}ms<br>
                FPS: <span style="color: ${lodData.currentFPS > 45 ? '#00ff00' : '#ff0000'};">${lodData.currentFPS}</span><br>
                Visible Objects: ${lodData.visibleObjects}<br>
                Culled Objects: ${lodData.culledObjects}<br>
                Draw Calls: ${lodData.drawCalls}
            </div>`;

            // Frustum Culling Statistics
            if (lodStats.frustumCulling) {
                const fc = lodStats.frustumCulling;
                html += `<div style="margin-bottom: 10px;">
                    <strong>👁️ Frustum Culling</strong><br>
                    Cull Ratio: <span style="color: #00ff00;">${fc.cullRatio}</span><br>
                    Spatial Cells: ${fc.spatialCells}<br>
                    Optimizations: ${fc.spatialOptimizations}<br>
                    Frustum Checks: ${fc.frustumChecks}
                </div>`;
            }
        }

        // Instanced Rendering Statistics
        if (instancedStats) {
            html += `<div style="margin-bottom: 10px;">
                <strong>🔄 Instanced Rendering</strong><br>
                Total Locations: ${instancedStats.totalLocations}<br>
                Instanced Meshes: ${instancedStats.instancedMeshes}<br>
                Materials Used: ${instancedStats.materialsUsed || 'N/A'}<br>
                Draw Calls: ${instancedStats.drawCalls}
            </div>`;

            // Texture Atlas Statistics
            if (instancedStats.textureAtlas) {
                const ta = instancedStats.textureAtlas;
                html += `<div style="margin-bottom: 10px;">
                    <strong>🎨 Texture Atlas</strong><br>
                    Atlases Created: ${ta.atlasesCreated}<br>
                    Textures Atlased: ${ta.texturesAtlased}<br>
                    Materials Cached: ${ta.materialsCached}<br>
                    Memory Used: ${ta.memoryUsed}MB
                </div>`;
            }
        }

        // Performance tips
        html += `<div style="color: #888; font-size: 10px; margin-top: 10px;">
            <strong>💡 Tips:</strong><br>
            • Press 'P' to toggle this monitor<br>
            • Lower LOD improves performance<br>
            • Instanced rendering reduces draw calls<br>
            • Green FPS = Good (>45), Red = Poor (<45)
        </div>`;

        return html;
    }

    /**
     * Rebuild warehouse (helper method)
     */
    rebuildWarehouse() {
        // Get current UI config from scene manager or create default
        const defaultConfig = {
            aisles: 4,
            levels_per_aisle: [5, 6, 5, 4],
            modules_per_aisle: 10,
            locations_per_module: 8,
            storage_depth: 2
        };

        // Rebuild with current configuration
        this.sceneManager.buildWarehouse(defaultConfig);
        
        // Update spatial grid
        if (this.sceneManager.lodManager) {
            this.sceneManager.lodManager.updateSpatialGrid(this.sceneManager.scene);
        }
    }

    /**
     * Show/hide monitor
     */
    show() {
        if (!this.isVisible) {
            this.toggle();
        }
    }

    hide() {
        if (this.isVisible) {
            this.toggle();
        }
    }

    /**
     * Dispose monitor
     */
    dispose() {
        this.stopUpdating();
        if (this.container && this.container.parentNode) {
            this.container.parentNode.removeChild(this.container);
        }
    }
}
