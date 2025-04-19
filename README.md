# 🔬 DermaSim: Real-Time Acne Simulation 🧫

## 🌟 Overview

DermaSim is an interactive 3D visualization tool that simulates the formation, progression, and healing of acne in real-time. This educational tool demonstrates the biological processes involved in acne development, from the initial incubation stage through inflammation, rupture, healing, and resolution.

A live working page of this simulation is available [here](https://cheddarbutler.com/threejs/dermasim/).

![DermaSim Preview](preview.png)

## ✨ Features

- 🔄 **Real-time simulation** of acne progression through multiple stages
- 🧪 **Biologically accurate** representation of acne formation processes
- 🎮 **Interactive controls** to manipulate simulation parameters
- 📊 **Visual effects** including inflammation, pus formation, and rupture animations
- 🩺 **Educational tool** for understanding skin conditions
- 📱 **Responsive design** that works across devices
- 🚀 **High-performance** 3D rendering using Three.js

## 🔄 Acne Progression Stages

DermaSim simulates these key stages of acne development:

1. 🌱 **Incubation**: Initial bacterial growth and sebum accumulation
2. 🔒 **Comedone**: Formation of a microcomedo due to blocked pores
3. 🔴 **Papule**: Inflammation begins as immune system responds
4. 💛 **Pustule**: White blood cells create pus as they fight bacteria
5. 💥 **Rupture**: Follicle wall breaks, releasing contents into dermis
6. 🩹 **Healing**: Repair mechanisms activate to resolve damage
7. ⚠️ **Worsening**: Alternative pathway when rupture doesn't heal properly
8. ✅ **Resolved**: Complete healing and return to normal skin

## 🛠️ Technology Stack

- **3D Rendering**: Three.js
- **Animation**: Tween.js
- **UI Interaction**: P5.js
- **Models**: Custom GLB models created in Blender

## 🚀 Getting Started

### Prerequisites

- Web server for static file hosting
- Modern web browser with WebGL support

### Installation

1. Clone the repository:
```bash
git clone https://github.com/Photon1c/dermasim.git
```

2. Navigate to the project directory:
```bash
cd dermasim
```

3. Serve the files using your preferred web server. For a quick setup, you can use:
```bash
# If you have Node.js installed
npx http-server

# If you have Python installed
python -m http.server
```

4. Open your browser and navigate to `http://localhost:8080` (or whichever port your server uses)

## 🎮 Usage

### Basic Controls

- **Camera Navigation**:
  - 🖱️ **Rotate**: Click and drag
  - 🔍 **Zoom**: Scroll wheel
  - 🤚 **Pan**: Right-click and drag

### Simulation Controls

- **Stage Navigation**:
  - ⏪ **Previous Stage**: Move to the previous stage in the simulation
  - ⏩ **Next Stage**: Advance to the next stage in the simulation
  - 🔄 **Reset**: Reset the simulation to initial conditions
  - ⏸️ **Toggle Rotation**: Start/stop the model's automatic rotation

### Parameter Controls

- 🔍 **Follicle Size**: Adjust the size of the hair follicle
- 🦠 **Bacteria Level**: Control the amount of P. acnes bacteria
- 🔥 **Inflammation**: Adjust the inflammation response
- 💉 **Medication**: Apply virtual treatments to affect healing

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgements

- 👩‍🔬 Dermatology advisors for scientific accuracy
- 👨‍💻 Three.js community for 3D rendering support
- 🎨 Blender Foundation for 3D modeling tools
- 🧬 Medical literature on acne pathophysiology

## 📬 Contact

Questions or feedback? Reach out at youremail@example.com or open an issue in this repository.

---

💻 Happy simulating! 🔬
