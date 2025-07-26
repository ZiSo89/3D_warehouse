# 3D OSR Warehouse Simulator

A web-based 3D warehouse visualization and simulation tool built with Three.js. This project provides an interactive interface for designing and exploring automated storage and retrieval (OSR) warehouse systems.

## Features

- **3D Warehouse Visualization**: Interactive 3D representation of warehouse racks and infrastructure
- **Dynamic Configuration**: Real-time adjustment of warehouse parameters:
  - Number of aisles (1-8)
  - Levels per aisle (2-12, individually configurable)
  - Modules per aisle (3-15)
  - Locations per module (2-8)
  - Storage depth (1-6)
  - Picking stations (1-8)
- **Container Animation System**: Realistic simulation of container flow from picking stations to storage racks
  - Smooth container movement along conveyor systems
  - Lift and shuttle operations synchronized
  - Automated rack placement with precise positioning
- **Camera Controls**: Multiple predefined camera views (Overview, Front, Side, Top, Aisle)
- **Storage Capacity Calculator**: Real-time calculation of total storage locations
- **Responsive UI**: Clean, modern interface with collapsible control panel
- **Color-Coded Components**: 
  - Racks in green tones
  - Transport systems in red accents
  - Light cream background for optimal contrast

## Project Structure

```
├── index.html              # Main HTML file
├── main.js                 # Application entry point (keyboard/game navigation, Vite entry)
├── package.json            # Project dependencies
└── src/
    ├── animation/          # Animation system components
    │   ├── AnimationManager.js
    │   ├── Container.js
    │   ├── CoordinatedOperations.js
    │   └── DemoOperations.js
    ├── components/         # 3D component creators
    │   ├── createPrezone.js
    │   ├── createRacks.js
    │   └── createTransporters.js
    ├── core/              # Core application logic
    │   ├── constants.js
    │   └── SceneManager.js
    └── ui/                # User interface components
        ├── InteractionManager.js
        └── UIManager.js    # UI panel, info overlay, capacity/missing display
```

## Getting Started



### Prerequisites

- A modern web browser with WebGL support
- [Node.js](https://nodejs.org/) and npm installed

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/ZiSo89/3D_warehouse.git
   cd 3D_warehouse
   ```


2. Install dependencies and start the Vite dev server:

   ```bash
   npm install
   npm run dev
   ```

   This will start the Vite development server. By default, it will be available at `http://localhost:5173` (or the port shown in your terminal).

3. Open your browser and navigate to the provided local address (e.g., `http://localhost:5173`).

## Usage

1. **Warehouse Configuration**: Use the control panel on the right to adjust warehouse parameters
2. **Camera Navigation**: 
   - Use mouse to orbit, zoom, and pan around the 3D scene
   - Use keyboard for game-like navigation:
     - **W/S**: Forward/Back
     - **A/D**: Left/Right
     - **Q/E**: Up/Down
     - **R/F**: Zoom In/Out
   - (A semi-transparent overlay with these controls appears at the top of the screen on desktop)
   - Click camera view buttons for predefined perspectives
3. **Real-time Updates**: Changes to configuration parameters immediately update the 3D visualization
4. **Container Animation**: Click "Start Animation" to watch a container flow through the warehouse system
5. **Capacity Monitoring**: The storage capacity display shows total available locations and the number of missing locations (excluded by config)

## How the UI Works

The 3D OSR Warehouse Simulator features an interactive UI panel on the right side of the screen. This panel allows users to:

- **Adjust Warehouse Parameters:**  
  Use sliders to set the number of aisles, modules per aisle, locations per module, storage depth, and picking stations.  
  For each aisle, you can individually set the number of levels.

- **Rebuild Warehouse:**  
  After changing parameters, click "Rebuild Warehouse" to update the 3D model.

- **Camera Presets:**  
  Use the camera buttons to quickly switch between Overview, Top, Side, Prezone, and Aisle views.

- **Container Animation:**  
  Start or stop container movement animations with the animation button.

- **Configuration Management:**  
  - **Export JSON:** Save the current warehouse configuration as a JSON file.
  - **Import JSON:** Load a warehouse configuration from a JSON file.  
    (Use the file input to select your `.json` file.)

- **Info Panel:**  
  The right panel displays real-time information about storage capacity, missing locations, selected objects, and logs of recent actions.

- **Object Selection:**  
  Click on any warehouse component (rack, lift, shuttle, etc.) in the 3D view to see its details in the info panel.

## Configuring the JSON File

The warehouse configuration JSON file has the following structure:

```json
{
  "metadata": {
    "name": "MyWarehouseConfig",
    "created": "2025-07-26T12:00:00.000Z",
    "version": "1.0.0",
    "description": "Exported warehouse configuration"
  },
  "warehouse_parameters": {
    "aisles": 3,
    "levels_per_aisle": [5, 6, 4],
    "modules_per_aisle": 8,
    "locations_per_module": 4,
    "storage_depth": 2,
    "picking_stations": 3
  },
  "missing_locations": [],
  "location_types": {
    "buffer_locations": [],
    "default_type": "Storage"
  },
  "calculated_metrics": {
    "total_locations": 576,
    "total_modules": 24,
    "total_levels": 15
  }
}
```

- **aisles:** Number of aisles in the warehouse.
- **levels_per_aisle:** Array specifying the number of levels for each aisle.
- **modules_per_aisle:** Number of modules (sections) per aisle.
- **locations_per_module:** Number of storage locations per module.
- **storage_depth:** Depth of storage (number of locations deep).
- **picking_stations:** Number of picking stations in the prezone.
- **missing_locations:** (Optional) List of locations to exclude from storage.
- **location_types:** (Optional) Specify buffer locations and default type.

**To use a custom configuration:**
1. Export a template from the UI or create a JSON file matching the structure above.
2. Click "Import JSON" in the UI and select your file.
3. The warehouse will update to reflect your configuration.

---


## Recent Improvements (2025)

- Switched to Vite dev server for modern development workflow
- Added smooth, game-like keyboard navigation (WASD, Q/E, R/F)
- Added a semi-transparent info overlay for camera controls (desktop only)
- Storage capacity panel now displays both total and missing locations
- UI/UX improvements for clarity and mobile/desktop distinction

## Project Improvement Suggestions

**UI/UX**
- Add tooltips or inline help for each UI control to clarify their effect.
- Provide a visual indicator or animation when the warehouse is rebuilt or a config is imported.
- Allow users to reset the configuration to default with a single button.
- Add error messages or validation for out-of-range or invalid config values.
- Make the UI panel draggable or resizable for better usability on small screens.

**Code/Architecture**
- Refactor repeated logic in UIManager and InteractionManager (e.g., config sync, event binding).
- Move hardcoded color values to a central theme or config file for easier palette changes.
- Add more comments and JSDoc for public methods and configuration structures.
- Consider using a state management pattern for UI config (e.g., Redux or a simple observable).
- Add unit tests for config import/export and UI logic.

**Features**
- Allow saving/loading multiple named configurations.
- Add undo/redo for config changes.
- Support for more complex warehouse layouts (e.g., L-shaped, multi-zone).
- Add keyboard shortcuts for camera presets and common actions.
- Provide a summary of warehouse metrics (e.g., total storage, used/unused, etc.) in the UI.

## Technologies Used

- **Three.js**: 3D graphics and rendering
- **TWEEN.js**: Smooth animations and transitions
- **JavaScript ES6+**: Modern JavaScript features and modules
- **HTML5 & CSS3**: Structure and styling
- **WebGL**: Hardware-accelerated 3D graphics

## Color Palette

The application uses a carefully selected color palette:
- **Light Cream** (#f1faee): Background and panel backgrounds
- **Dark Green** (#1e3231): Primary text and borders
- **Medium Green** (#6e9075): UI elements and rack structures
- **Light Pink** (#e5d1d0): Section backgrounds
- **Red Accent** (#93032e): Highlights and transport systems

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/new-feature`)
3. Commit your changes (`git commit -am 'Add new feature'`)
4. Push to the branch (`git push origin feature/new-feature`)
5. Create a Pull Request

## License

This project is open source and available under the [MIT License](LICENSE).

## Future Enhancements

- Multiple container animations simultaneously
- Warehouse operation simulations with metrics
- Performance analytics and optimization suggestions
- Integration with warehouse management systems
- Real-time collision detection
- Advanced pathfinding algorithms

## Author

Created as part of warehouse modeling and simulation coursework.

---

For questions or support, please open an issue on GitHub.
