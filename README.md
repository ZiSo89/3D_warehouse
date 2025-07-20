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
├── main.js                 # Application entry point
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
        └── UIManager.js
```

## Getting Started

### Prerequisites

- A modern web browser with WebGL support
- A local web server (due to ES6 module requirements)

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/ZiSo89/3D_warehouse.git
   cd 3D_warehouse
   ```

2. Start a local web server. You can use:
   
   **Using Python:**
   ```bash
   # Python 3
   python -m http.server 8000
   
   # Python 2
   python -m SimpleHTTPServer 8000
   ```
   
   **Using Node.js (if you have live-server installed):**
   ```bash
   npx live-server
   ```
   
   **Using VS Code:**
   - Install the "Live Server" extension
   - Right-click on `index.html` and select "Open with Live Server"

3. Open your browser and navigate to `http://localhost:8000`

## Usage

1. **Warehouse Configuration**: Use the control panel on the right to adjust warehouse parameters
2. **Camera Navigation**: 
   - Use mouse to orbit, zoom, and pan around the 3D scene
   - Click camera view buttons for predefined perspectives
3. **Real-time Updates**: Changes to configuration parameters immediately update the 3D visualization
4. **Container Animation**: Click "Start Animation" to watch a container flow through the warehouse system
5. **Capacity Monitoring**: The storage capacity display shows total available locations

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

- ✅ **Container animation system** (Implemented)
- Multiple container animations simultaneously
- Warehouse operation simulations with metrics
- Export/import of warehouse configurations
- Performance analytics and optimization suggestions
- Integration with warehouse management systems
- Real-time collision detection
- Advanced pathfinding algorithms

## Author

Created as part of warehouse modeling and simulation coursework.

---

For questions or support, please open an issue on GitHub.
