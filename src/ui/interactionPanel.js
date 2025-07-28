// UI panel creation and DOM logic extracted from InteractionManager
// All functions here are pure or only interact with the DOM, not Three.js

export function createInteractionPanel(uiConfig) {
    // Add loading overlay to body (hidden by default)
    if (!document.getElementById('loading-overlay')) {
        const loadingOverlay = document.createElement('div');
        loadingOverlay.id = 'loading-overlay';
        loadingOverlay.innerHTML = `<div class="loading-spinner"></div>`;
        loadingOverlay.style.display = 'none';
        document.body.appendChild(loadingOverlay);
    }
    if (document.getElementById('interaction-panel')) {
        return document.getElementById('interaction-panel');
    }
    const interactionPanel = document.createElement('div');
    interactionPanel.id = 'interaction-panel';
    interactionPanel.innerHTML = `
        <div class="toggle-sticky-wrapper">
            <button id="interaction-toggle" aria-label="Hide Panel" title="Hide Controls" style="background:#b7b7a4;color:#3d3d2d;border:none;border-radius:4px;font-size:20px;width:36px;height:36px;cursor:pointer;z-index:2000;transition:background 0.3s;display:block;visibility:visible;">☰</button>
        </div>
        <div class="interaction-header">
            <h3>Settings & Actions</h3>
        </div>
        <div class="input-section">
            <div class="ui-section">
                <label for="aisles">Aisles:</label>
                <input type="range" id="aisles" min="1" max="4" value="${uiConfig.aisles}">
                <span id="aisles-value">${uiConfig.aisles}</span>
            </div>
            <div class="ui-section" id="levels-container">
                <h4>Levels per Aisle:</h4>
            </div>
            <div class="ui-section">
                <label for="modules">Modules per Aisle:</label>
                <input type="range" id="modules" min="3" max="8" value="${uiConfig.modules_per_aisle}">
                <span id="modules-value">${uiConfig.modules_per_aisle}</span>
            </div>
            <div class="ui-section">
                <label for="locations">Locations per Module:</label>
                <input type="range" id="locations" min="2" max="4" value="${uiConfig.locations_per_module}">
                <span id="locations-value">${uiConfig.locations_per_module}</span>
            </div>
            <div class="ui-section">
                <label for="depth">Storage Depth:</label>
                <input type="range" id="depth" min="1" max="3" value="${uiConfig.storage_depth}">
                <span id="depth-value">${uiConfig.storage_depth}</span>
            </div>
            <div class="ui-section">
                <label for="stations">Picking Stations:</label>
                <input type="range" id="stations" min="1" max="4" value="${uiConfig.picking_stations}">
                <span id="stations-value">${uiConfig.picking_stations}</span>
            </div>
            <div class="ui-section animation-section">
                <h4>Container Animation:</h4>
                <div class="animation-controls">
                    <button id="toggle-animation-btn" class="animation-btn">Start Animation</button>
                </div>
            </div>
            <div class="ui-section configuration-section">
                <h4>Configuration:</h4>
                <div class="config-controls">
                    <button id="export-config-btn" class="config-btn export-btn">📤 Export JSON</button>
                    <button id="import-config-btn" class="config-btn import-btn">📥 Import JSON</button>
                    <input type="file" id="import-file-input" accept=".json" style="display: none;">
                </div>
            </div>
            <div class="ui-section" style="display: flex; flex-direction: column; align-items: center;">
                <button id="rebuild-btn" class="rebuild-button" style="margin-bottom: 8px;">Rebuild Warehouse</button>
                <button id="reset-default-btn" class="reset-default-button">Reset to Default</button>
            </div>
        </div>
        <div class="camera-buttons">
            <button class="camera-btn" data-preset="overview">📊 Overview</button>
            <button class="camera-btn" data-preset="topView">⬆️ Top View</button>
            <button class="camera-btn" data-preset="sideView">↔️ Side View</button>
            <button class="camera-btn" data-preset="prezoneView">📦 Prezone</button>
        </div>
        <div class="object-info" id="object-info" style="display: none;">
            <h4>Selected Object:</h4>
            <div id="object-details"></div>
        </div>
    `;
    document.body.appendChild(interactionPanel);
    return interactionPanel;
}

export function updatePanelText(panel) {
    panel.querySelector('.interaction-header h3').textContent = 'Settings & Actions';
    panel.querySelector('label[for="aisles"]').textContent = 'Aisles:';
    panel.querySelector('label[for="modules"]').textContent = 'Modules per Aisle:';
    panel.querySelector('label[for="locations"]').textContent = 'Locations per Module:';
    panel.querySelector('label[for="depth"]').textContent = 'Storage Depth:';
    panel.querySelector('label[for="stations"]').textContent = 'Picking Stations:';
    panel.querySelector('.animation-section h4').textContent = 'Container Animation:';
    panel.querySelector('.configuration-section h4').textContent = 'Configuration:';
    panel.querySelector('#rebuild-btn').textContent = 'Rebuild Warehouse';
    panel.querySelector('#export-config-btn').textContent = '📤 Export JSON';
    panel.querySelector('#import-config-btn').textContent = '📥 Import JSON';
    panel.querySelector('#levels-container h4').textContent = 'Levels per Aisle:';
}
