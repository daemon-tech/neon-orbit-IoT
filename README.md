# NEON ORBIT

> Cyberpunk Real-Time 3D IoT Command Sphere

**"Track the pulse. Own the dark."**

![NEON ORBIT](https://img.shields.io/badge/NEON-ORBIT-00FFEA?style=for-the-badge&logo=react&logoColor=00FFEA)
![Three.js](https://img.shields.io/badge/Three.js-000000?style=for-the-badge&logo=three.js&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)

A production-ready, cyberpunk-themed 3D IoT visualization dashboard that renders a stunning Earth globe with 10,000+ glowing sensor nodes, real-time data streaming, and immersive audio-reactive effects.

## ✨ Features

- 🌍 **3D Earth Globe** with NASA Blue Marble texture
- 💫 **10,000+ Instanced Sensor Nodes** with neon pulse shaders
- 📡 **Real-Time MQTT Data Streaming** (WebSocket)
- 🎨 **Cyberpunk Visual Effects**:
  - Neon bloom post-processing
  - Chromatic aberration
  - Glitch shaders on alerts
  - Particle trails between nodes
  - Scanlines & CRT effects
- 🎵 **Audio-Reactive** ambient synth with alert sounds
- 🔍 **Search & Fly-To** camera navigation
- 📊 **Holographic Data Panels** with 24h charts
- 🎮 **Easter Egg**: Konami code (↑↑↓↓←→←→BA) for VOID MODE
- 📱 **Mobile & Touch Support**
- 🌙 **Dark Mode** (always on, cyberpunk style)

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and npm/yarn/pnpm

### Installation

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

The app will automatically open in your browser at [http://localhost:3000](http://localhost:3000).

### Build for Production

```bash
npm run build
```

The `dist` folder will contain the production build.

## 🎯 Usage

### Search & Navigation

- Type location names: `Tokyo`, `Sahara`, `New York`, `London`, `Sydney`
- Search by sensor ID: `STN-000001`
- Click any sensor node to view details

### Controls

- **Mouse/Trackpad**: Drag to rotate, scroll to zoom
- **Touch**: Pinch to zoom, drag to rotate
- **Keyboard**: Type to search, ESC to close panels

### Easter Egg

Type the **Konami Code**: `↑ ↑ ↓ ↓ ← → ← → B A` to enter **VOID MODE** (all lights off, only data glows).

## 🛠️ Tech Stack

- **Framework**: Vite + React + TypeScript
- **3D Engine**: Three.js + React Three Fiber
- **Post-Processing**: @react-three/postprocessing
- **State Management**: Zustand
- **Styling**: Tailwind CSS + Glassmorphism
- **Animations**: Framer Motion + GSAP
- **Audio**: Tone.js
- **Data**: MQTT.js (WebSocket)

## 📁 Project Structure

```
neon-orbit/
├── src/
│   ├── components/       # React components
│   │   ├── Globe.tsx
│   │   ├── SensorNode.tsx
│   │   ├── DataStreamParticles.tsx
│   │   ├── HolographicPanel.tsx
│   │   ├── SearchBar.tsx
│   │   └── AudioReactor.tsx
│   ├── hooks/            # Custom React hooks
│   │   ├── useMQTT.ts
│   │   └── useGlobeCamera.ts
│   ├── lib/
│   │   └── shaders/      # GLSL shaders
│   ├── store/            # Zustand store
│   └── App.tsx
├── public/
└── package.json
```

## 🎨 Visual Style

Inspired by **Cyberpunk 2077** and **Deus Ex**:

- **Colors**: 
  - Background: `#0B0C10`
  - Cyan: `#00FFEA`
  - Magenta: `#FF00AA`
  - Toxic Green: `#66FF00`
- **Fonts**: Orbitron (headers), Rajdhani (body), Fira Code (code)
- **Effects**: Neon bloom, glitch, scanlines, particle trails

## 📡 MQTT Configuration

The app uses mock MQTT data by default. To connect to a real MQTT broker:

1. Update `src/hooks/useMQTT.ts`
2. Configure broker URL: `wss://your-broker.com:8081`
3. Set topic pattern: `neonorbit/sensors.#`

Message format:
```json
{
  "id": "STN-000001",
  "lat": 35.6762,
  "lng": 139.6503,
  "temp": 25.5,
  "humidity": 60.0,
  "status": "online",
  "alert": false
}
```

## 🚢 Building for Production

The app is a static SPA that can be built and served locally:

```bash
npm run build
```

The `dist` folder will contain the production build. You can serve it with any static file server:

```bash
# Using Python
python -m http.server 8000 --directory dist

# Using Node.js http-server
npx http-server dist -p 8000

# Using serve
npx serve dist
```

## 📝 License

MIT License - see [LICENSE](LICENSE) file

## 🤝 Contributing

Contributions welcome! Please open an issue or submit a PR.

## 🙏 Acknowledgments

- NASA Blue Marble texture
- Three.js community
- Cyberpunk 2077 for visual inspiration

---

**Built with ⚡ by the NEON ORBIT team**

