# Tower Defense with Kittens 🐱🐭

A browser-based tower defense game where adorable kittens defend against waves of mischievous rodents!

## 🎮 How to Play

1. **Build Towers**: Click on grass tiles to place kitten towers (cannot build on paths!)
2. **Choose Your Tower**:
   - 🐱 **Archer Cat** (50g) - Fast shooting, medium range
   - 🐾 **Claw Cat** (75g) - Close range, high damage
   - ✨ **Magic Cat** (100g) - Medium range, rapid fire
3. **Survive Waves**: Rodents will spawn and follow the path - don't let them reach the end!
4. **Earn Gold**: Kill rodents to earn gold for more towers
5. **Win**: Survive as many waves as possible!

## 🛠️ Setup & Development

### Prerequisites
- Node.js 18+ 
- npm or yarn

### Installation

```bash
npm install
```

### Running the Game

```bash
npm run dev           # Start development server at http://localhost:3000
npm run build         # Build for production
npm run preview       # Preview production build
```

### Testing

```bash
npm test              # Run tests in watch mode
npm run test:run      # Run tests once
npm run test:unit     # Run unit tests only
```

### Code Quality

```bash
npm run lint          # Type check and lint
npm run format        # Format code with Prettier
npm run ci            # Full CI pipeline (lint + test + build)
```

## 🏗️ Project Structure

```
src/
├── game/
│   ├── Game.ts          # Main game loop and state
│   ├── Tower.ts         # Tower entity class
│   ├── Enemy.ts         # Enemy entity class
│   ├── WaveManager.ts   # Wave spawning logic
│   ├── PathFinder.ts    # Pathfinding for enemies
│   └── constants.ts     # Game constants and configs
├── types/
│   └── game.ts          # TypeScript interfaces and types
├── assets/
│   └── styles/
│       └── main.css     # Game styles
└── main.ts              # Entry point
```

## 📋 Features

- [x] Multiple tower types with different stats
- [x] Wave-based enemy spawning with increasing difficulty
- [x] Gold and lives system
- [x] Pathfinding for enemy movement
- [x] Range and attack mechanics
- [x] Responsive UI with HUD
- [ ] Tower upgrades
- [ ] Multiple game maps
- [ ] Sound effects and music
- [ ] Save/load game state

## 🎯 Future Enhancements

1. **Tower Upgrades**: Allow upgrading towers for better stats
2. **Special Abilities**: Add skills like slow, freeze, or nuke
3. **Multiple Maps**: Different level designs with unique paths
4. **Achievements**: Track player milestones
5. **Leaderboards**: Compare scores with others
6. **Mobile Support**: Touch controls for tablets/phones

## 📄 License

ISC

## 👨‍💻 Contributing

Feel free to submit issues and enhancement requests!
