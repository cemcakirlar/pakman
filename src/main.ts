import Phaser from "phaser";

enum TileType {
  Path = 0,
  Wall = 1,
  Dot = 2,
  PowerPellet = 3,
}

enum Direction {
  None = "none",
  Up = "up",
  Down = "down",
  Left = "left",
  Right = "right",
}

interface GridPos {
  x: number;
  y: number;
}

interface PacmanState {
  direction: Direction;
  queuedDirection: Direction;
}

type GhostId = "blinky" | "pinky" | "inky" | "clyde";

interface GhostState {
  id: GhostId;
  direction: Direction;
  speed: number;
  baseColor: number;
  spawn: GridPos;
  /** Vector graphics: drawn each frame in local space, positioned at the actor center. */
  graphics: Phaser.GameObjects.Graphics;
}

interface GameState {
  score: number;
  lives: number;
  dotsRemaining: number;
  frightenedUntil: number;
  ghostCombo: number;
  hasStarted: boolean;
  isPaused: boolean;
  isGameOver: boolean;
  isWin: boolean;
}

const TILE_SIZE = 24;
/** Extra room for D-pad, labels, and safe on-screen control hints (mobile D-pad must clear START row). */
const HUD_HEIGHT = 265;
const TURN_THRESHOLD = 0.25;
const PACMAN_SPEED = 90;
const GHOST_SPEED = 80;
const FRIGHTENED_GHOST_SPEED = 64;
const FRIGHTENED_DURATION_MS = 7000;
const PACMAN_RADIUS = TILE_SIZE * 0.42;
/** One half of the mouth “gap” in radians (animated). */
const PAC_MOUTH_MAX = 0.42;

const DIRECTION_VECTORS: Record<Direction, GridPos> = {
  [Direction.None]: { x: 0, y: 0 },
  [Direction.Up]: { x: 0, y: -1 },
  [Direction.Down]: { x: 0, y: 1 },
  [Direction.Left]: { x: -1, y: 0 },
  [Direction.Right]: { x: 1, y: 0 },
};

const OPPOSITE_DIRECTION: Record<Direction, Direction> = {
  [Direction.None]: Direction.None,
  [Direction.Up]: Direction.Down,
  [Direction.Down]: Direction.Up,
  [Direction.Left]: Direction.Right,
  [Direction.Right]: Direction.Left,
};

const MAZE_TEMPLATE: number[][] = [
  [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
  [1, 3, 2, 2, 2, 2, 2, 2, 1, 2, 1, 2, 2, 2, 2, 2, 2, 3, 1],
  [1, 2, 1, 1, 2, 1, 1, 2, 1, 2, 1, 2, 1, 1, 2, 1, 1, 2, 1],
  [1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1],
  [1, 2, 1, 1, 2, 1, 2, 1, 1, 1, 1, 1, 2, 1, 2, 1, 1, 2, 1],
  [1, 2, 2, 2, 2, 1, 2, 2, 2, 1, 2, 2, 2, 1, 2, 2, 2, 2, 1],
  [1, 1, 1, 1, 2, 1, 1, 1, 0, 0, 0, 1, 1, 1, 2, 1, 1, 1, 1],
  [0, 0, 0, 1, 2, 1, 0, 0, 0, 0, 0, 0, 0, 1, 2, 1, 0, 0, 0],
  [1, 1, 1, 1, 2, 1, 0, 1, 1, 0, 1, 1, 0, 1, 2, 1, 1, 1, 1],
  [0, 0, 0, 0, 2, 0, 0, 1, 0, 0, 0, 1, 0, 0, 2, 0, 0, 0, 0],
  [1, 1, 1, 1, 2, 1, 0, 1, 1, 1, 1, 1, 0, 1, 2, 1, 1, 1, 1],
  [0, 0, 0, 1, 2, 1, 0, 0, 0, 0, 0, 0, 0, 1, 2, 1, 0, 0, 0],
  [1, 1, 1, 1, 2, 1, 0, 1, 1, 0, 1, 1, 0, 1, 2, 1, 1, 1, 1],
  [0, 0, 0, 1, 2, 1, 0, 0, 0, 0, 0, 0, 0, 1, 2, 1, 0, 0, 0],
  [1, 1, 1, 1, 2, 1, 1, 1, 0, 0, 0, 1, 1, 1, 2, 1, 1, 1, 1],
  [1, 2, 2, 2, 2, 2, 2, 2, 2, 1, 2, 2, 2, 2, 2, 2, 2, 2, 1],
  [1, 2, 1, 1, 2, 1, 1, 2, 1, 2, 1, 2, 1, 1, 2, 1, 1, 2, 1],
  [1, 3, 2, 1, 2, 2, 2, 2, 2, 0, 2, 2, 2, 2, 2, 1, 2, 3, 1],
  [1, 1, 2, 1, 2, 1, 2, 1, 1, 1, 1, 1, 2, 1, 2, 1, 2, 1, 1],
  [1, 2, 2, 2, 2, 1, 2, 2, 2, 1, 2, 2, 2, 1, 2, 2, 2, 2, 1],
  [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
];

const MAP_WIDTH = MAZE_TEMPLATE[0].length;
const MAP_HEIGHT = MAZE_TEMPLATE.length;

/** Phone / tablet: primary input is touch; typical desktop is hover + fine pointer. */
function shouldShowMobileTouchDpad(): boolean {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return false;
  return window.matchMedia("(hover: none) and (pointer: coarse)").matches;
}

class PacmanScene extends Phaser.Scene {
  private maze: number[][] = [];
  private wallsGraphics!: Phaser.GameObjects.Graphics;
  private pelletsGraphics!: Phaser.GameObjects.Graphics;
  private pacmanGfx!: Phaser.GameObjects.Graphics;
  private pacMouthPhase = 0;
  private pacman: PacmanState = { direction: Direction.Left, queuedDirection: Direction.Left };

  private ghosts: GhostState[] = [];
  private readonly pacmanSpawn: GridPos = { x: 9, y: 17 };
  /**
   * Classic layout: Blinky on the door tile (two cells below the top alcove);
   * Pinky center, Inky left, Clyde right on the row inside the pen (y=9).
   */
  private readonly ghostSpawns: Record<GhostId, GridPos> = {
    blinky: { x: 9, y: 8 },
    pinky: { x: 9, y: 9 },
    inky: { x: 8, y: 9 },
    clyde: { x: 10, y: 9 },
  };
  /** Bottom-left “scatter” target for Clyde when he’s close to Pac-Man. */
  private readonly clydeScatterTile: GridPos = { x: 1, y: 16 };

  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd!: {
    W: Phaser.Input.Keyboard.Key;
    A: Phaser.Input.Keyboard.Key;
    S: Phaser.Input.Keyboard.Key;
    D: Phaser.Input.Keyboard.Key;
  };

  private uiText!: Phaser.GameObjects.Text;
  private controlsText!: Phaser.GameObjects.Text;
  private resultText!: Phaser.GameObjects.Text;
  private showTouchDpad = false;

  private gameState: GameState = {
    score: 0,
    lives: 3,
    dotsRemaining: 0,
    frightenedUntil: 0,
    ghostCombo: 0,
    hasStarted: false,
    isPaused: false,
    isGameOver: false,
    isWin: false,
  };

  constructor() {
    super("PacmanScene");
  }

  create(): void {
    this.cameras.main.setBackgroundColor("#000000");
    this.maze = MAZE_TEMPLATE.map((r) => [...r]);
    this.gameState.dotsRemaining = this.countDots();

    this.wallsGraphics = this.add.graphics();
    this.pelletsGraphics = this.add.graphics();

    this.drawWallsAndColliders();
    this.drawPellets();
    this.createPacman();
    this.createGhosts();
    this.createUI();
    this.setupInput();

    this.resultText.setText("PRESS START");
    this.pacMouthPhase = 0;
    this.drawEntitySprites();
    this.refreshUi();
  }

  update(_: number, delta: number): void {
    this.captureDirectionInput();
    if (!this.gameState.hasStarted || this.gameState.isPaused || this.gameState.isGameOver || this.gameState.isWin) {
      this.advanceMouthAnim(delta);
      this.drawEntitySprites();
      this.refreshUi();
      return;
    }
    const dt = delta / 1000;
    this.advanceMouthAnim(delta);
    this.updatePacman(dt);
    this.updateGhosts(dt);
    this.consumeDotIfPresent();
    this.checkGhostVsPacman();
    this.applyTunnelWrap();
    this.drawEntitySprites();
    this.refreshUi();
  }

  private setupInput(): void {
    this.cursors = this.input.keyboard?.createCursorKeys() as Phaser.Types.Input.Keyboard.CursorKeys;
    this.wasd = this.input.keyboard?.addKeys("W,A,S,D") as {
      W: Phaser.Input.Keyboard.Key;
      A: Phaser.Input.Keyboard.Key;
      S: Phaser.Input.Keyboard.Key;
      D: Phaser.Input.Keyboard.Key;
    };

    this.input.keyboard?.addCapture([
      Phaser.Input.Keyboard.KeyCodes.LEFT,
      Phaser.Input.Keyboard.KeyCodes.RIGHT,
      Phaser.Input.Keyboard.KeyCodes.UP,
      Phaser.Input.Keyboard.KeyCodes.DOWN,
      Phaser.Input.Keyboard.KeyCodes.W,
      Phaser.Input.Keyboard.KeyCodes.A,
      Phaser.Input.Keyboard.KeyCodes.S,
      Phaser.Input.Keyboard.KeyCodes.D,
    ]);
    this.input.keyboard?.on("keydown-ENTER", () => this.startGame());
    this.input.keyboard?.on("keydown-P", () => this.togglePause());
    this.input.keyboard?.on("keydown-R", () => this.resetGame());
  }

  private createPacman(): void {
    const spawn = this.tileToWorld(this.pacmanSpawn);
    this.pacmanGfx = this.add.graphics();
    this.pacmanGfx.setDepth(4);
    this.pacmanGfx.setPosition(spawn.x, spawn.y);
  }

  private createGhosts(): void {
    const defs: Array<{ id: GhostId; color: number; spawn: GridPos; dir: Direction }> = [
      { id: "blinky", color: 0xff0000, spawn: this.ghostSpawns.blinky, dir: Direction.Down },
      { id: "pinky", color: 0xff77ff, spawn: this.ghostSpawns.pinky, dir: Direction.Up },
      { id: "inky", color: 0x00d7ff, spawn: this.ghostSpawns.inky, dir: Direction.Right },
      { id: "clyde", color: 0xff9c30, spawn: this.ghostSpawns.clyde, dir: Direction.Left },
    ];

    this.ghosts = defs.map((def) => {
      const p = this.tileToWorld(def.spawn);
      const graphics = this.add.graphics();
      graphics.setDepth(4);
      graphics.setPosition(p.x, p.y);
      return {
        id: def.id,
        direction: def.dir,
        speed: GHOST_SPEED,
        baseColor: def.color,
        spawn: { ...def.spawn },
        graphics,
      };
    });
  }

  private advanceMouthAnim(delta: number): void {
    const chomp =
      this.gameState.hasStarted && !this.gameState.isPaused && !this.gameState.isGameOver && !this.gameState.isWin;
    this.pacMouthPhase += delta * (chomp ? 0.022 : 0.005);
  }

  private getPacmanFacingForSprite(): Direction {
    if (this.pacman.direction !== Direction.None) return this.pacman.direction;
    return this.pacman.queuedDirection;
  }

  private directionToAngle(d: Direction): number {
    switch (d) {
      case Direction.Up:
        return -Math.PI / 2;
      case Direction.Down:
        return Math.PI / 2;
      case Direction.Left:
        return Math.PI;
      case Direction.Right:
        return 0;
      case Direction.None:
        return Math.PI;
    }
  }

  private drawEntitySprites(): void {
    this.drawPacmanShape();
    this.ghosts.forEach((ghost) => this.drawGhostShape(ghost));
  }

  private drawPacmanShape(): void {
    const g = this.pacmanGfx;
    g.clear();
    g.setRotation(this.directionToAngle(this.getPacmanFacingForSprite()));
    const mouth = 0.12 + (PAC_MOUTH_MAX - 0.12) * (0.5 + 0.5 * Math.sin(this.pacMouthPhase));
    g.fillStyle(0xffea00, 1);
    /** `false` = fill the big sector (body); `true` inverts to the small wedge (looked like yellow mouth, black body). */
    g.slice(0, 0, PACMAN_RADIUS, mouth, Phaser.Math.PI2 - mouth, false);
    g.fillPath();
  }

  private drawGhostShape(ghost: GhostState): void {
    const g = ghost.graphics;
    g.clear();
    g.setRotation(0);
    const frightened = this.isFrightened();
    const body = frightened ? 0x2121ff : ghost.baseColor;
    g.fillStyle(body, 1);
    const w = 16;
    const h = 11;
    g.fillRoundedRect(-w / 2, -7, w, h, { tl: 7, tr: 7, bl: 0, br: 0 });
    g.fillStyle(body, 1);
    g.fillCircle(-4, 3.2, 2.4);
    g.fillCircle(0, 3.2, 2.4);
    g.fillCircle(4, 3.2, 2.4);
    if (frightened) {
      g.fillStyle(0xffffff, 1);
      g.fillRect(-5, -5, 2.5, 2.5);
      g.fillRect(2.5, -5, 2.5, 2.5);
      g.fillRect(-4, 0, 8, 1.2);
    } else {
      g.fillStyle(0xffffff, 1);
      g.fillCircle(-3.5, -2.2, 2.7);
      g.fillCircle(3.5, -2.2, 2.7);
      g.fillStyle(0x1a3bc9, 1);
      const v = DIRECTION_VECTORS[ghost.direction];
      const off = 1.0;
      g.fillCircle(-3.5 + v.x * off, -2.2 + v.y * off, 1.35);
      g.fillCircle(3.5 + v.x * off, -2.2 + v.y * off, 1.35);
    }
  }

  private drawWallsAndColliders(): void {
    this.wallsGraphics.clear();
    this.wallsGraphics.fillStyle(0x2a47ff, 1);

    for (let y = 0; y < MAP_HEIGHT; y += 1) {
      for (let x = 0; x < MAP_WIDTH; x += 1) {
        if (this.maze[y][x] !== TileType.Wall) continue;
        this.wallsGraphics.fillRect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
      }
    }
  }

  private drawPellets(): void {
    this.pelletsGraphics.clear();
    for (let y = 0; y < MAP_HEIGHT; y += 1) {
      for (let x = 0; x < MAP_WIDTH; x += 1) {
        const t = this.maze[y][x];
        if (t !== TileType.Dot && t !== TileType.PowerPellet) continue;
        const w = this.tileToWorld({ x, y });
        if (t === TileType.Dot) {
          this.pelletsGraphics.fillStyle(0xfff7cf, 1);
          this.pelletsGraphics.fillCircle(w.x, w.y, 3);
        } else {
          this.pelletsGraphics.fillStyle(0xffffff, 1);
          this.pelletsGraphics.fillCircle(w.x, w.y, 6);
        }
      }
    }
  }

  private createUI(): void {
    const centerX = MAP_WIDTH * TILE_SIZE * 0.5;
    const mazeBottom = MAP_HEIGHT * TILE_SIZE;
    this.showTouchDpad = shouldShowMobileTouchDpad();
    /** Desktop: clear maze bottom. Mobile: clear D-pad (▼ was overlapping PAUSE). */
    const yButtons = this.showTouchDpad ? mazeBottom + 140 : mazeBottom + 32;
    const yScore = this.showTouchDpad ? mazeBottom + 186 : mazeBottom + 66;
    const yHelp = this.showTouchDpad ? mazeBottom + 232 : mazeBottom + 110;
    const makeButton = (x: number, label: string, cb: () => void): void => {
      this.add
        .text(x, yButtons, label, {
          color: "#ffffff",
          backgroundColor: "#1b2a4b",
          fontFamily: "monospace",
          fontSize: "16px",
          padding: { left: 10, right: 10, top: 8, bottom: 8 },
        })
        .setOrigin(0, 0.5)
        .setInteractive({ useHandCursor: true })
        .on("pointerdown", cb);
    };
    const placeDpad = (x: number, y: number, symbol: string, dir: Direction): void => {
      this.add
        .text(x, y, symbol, {
          color: "#e8f4ff",
          backgroundColor: "#1c3459",
          fontFamily: "system-ui, -apple-system, sans-serif",
          fontSize: "22px",
          padding: { left: 16, right: 16, top: 12, bottom: 12 },
        })
        .setOrigin(0.5)
        .setDepth(5)
        .setInteractive({ useHandCursor: true })
        .on("pointerdown", () => {
          this.pacman.queuedDirection = dir;
          if (!this.gameState.hasStarted) this.startGame();
        });
    };
    if (this.showTouchDpad) {
      const padY = mazeBottom + 44;
      placeDpad(centerX, padY - 34, "▲", Direction.Up);
      placeDpad(centerX, padY + 34, "▼", Direction.Down);
      placeDpad(centerX - 48, padY, "◀", Direction.Left);
      placeDpad(centerX + 48, padY, "▶", Direction.Right);
    }

    makeButton(centerX - 130, "START", () => this.startGame());
    makeButton(centerX - 34, "PAUSE", () => this.togglePause());
    makeButton(centerX + 62, "RESET", () => this.resetGame());

    this.uiText = this.add
      .text(centerX, yScore, "", {
        color: "#ffffff",
        fontFamily: "monospace",
        fontSize: "16px",
      })
      .setDepth(5)
      .setOrigin(0.5, 0);
    this.controlsText = this.add
      .text(centerX, yHelp, "", {
        color: "#8fd3ff",
        fontFamily: "monospace",
        fontSize: "12px",
        wordWrap: { width: MAP_WIDTH * TILE_SIZE - 16 },
        align: "center",
      })
      .setDepth(5)
      .setOrigin(0.5);
    this.resultText = this.add
      .text(centerX, MAP_HEIGHT * TILE_SIZE * 0.5, "", {
        color: "#ffe86b",
        fontFamily: "monospace",
        fontSize: "28px",
      })
      .setDepth(10)
      .setOrigin(0.5);
  }

  private captureDirectionInput(): void {
    const left = this.cursors.left.isDown || this.wasd.A.isDown;
    const right = this.cursors.right.isDown || this.wasd.D.isDown;
    const up = this.cursors.up.isDown || this.wasd.W.isDown;
    const down = this.cursors.down.isDown || this.wasd.S.isDown;

    if (!this.gameState.hasStarted && (left || right || up || down)) {
      this.startGame();
    }
    if (left) this.pacman.queuedDirection = Direction.Left;
    else if (right) this.pacman.queuedDirection = Direction.Right;
    else if (up) this.pacman.queuedDirection = Direction.Up;
    else if (down) this.pacman.queuedDirection = Direction.Down;
  }

  private updatePacman(dt: number): void {
    const tile = this.worldToTile(this.pacmanGfx.x, this.pacmanGfx.y);
    const center = this.tileToWorld(tile);
    const queuedIsReverse = this.pacman.queuedDirection === OPPOSITE_DIRECTION[this.pacman.direction];

    if (queuedIsReverse && this.canMove(tile, this.pacman.queuedDirection)) {
      this.pacman.direction = this.pacman.queuedDirection;
    }

    if (this.isNearCenter(this.pacmanGfx, center)) {
      this.pacmanGfx.setPosition(center.x, center.y);
      if (this.canMove(tile, this.pacman.queuedDirection)) {
        this.pacman.direction = this.pacman.queuedDirection;
      } else if (!this.canMove(tile, this.pacman.direction)) {
        this.pacman.direction = Direction.None;
      }
    }
    this.stepEntity(this.pacmanGfx, this.pacman.direction, PACMAN_SPEED, dt);
    this.lockToCorridorAxis(this.pacmanGfx, this.pacman.direction);
  }

  private updateGhosts(dt: number): void {
    this.ghosts.forEach((ghost) => {
      const tile = this.worldToTile(ghost.graphics.x, ghost.graphics.y);
      const center = this.tileToWorld(tile);
      ghost.speed = this.isFrightened() ? FRIGHTENED_GHOST_SPEED : GHOST_SPEED;

      // If current direction is blocked, re-pick immediately instead of waiting
      // until the sprite drifts back to center over several frames.
      if (ghost.direction !== Direction.None && !this.canMove(tile, ghost.direction)) {
        ghost.direction = this.pickGhostDirection(ghost, tile);
      }

      if (this.isNearCenter(ghost.graphics, center)) {
        ghost.graphics.setPosition(center.x, center.y);
        ghost.direction = this.pickGhostDirection(ghost, tile);
      }
      this.stepEntity(ghost.graphics, ghost.direction, ghost.speed, dt);
      this.lockToCorridorAxis(ghost.graphics, ghost.direction);
    });
  }

  private pickGhostDirection(ghost: GhostState, tile: GridPos): Direction {
    const valid = this.getValidDirections(tile);
    if (valid.length === 0) return Direction.None;

    let choices = valid.filter((d) => d !== OPPOSITE_DIRECTION[ghost.direction]);
    if (choices.length === 0) choices = valid;

    if (this.isFrightened()) return Phaser.Utils.Array.GetRandom(choices);

    const target = this.getChaseTargetTile(ghost, tile);

    let best = choices[0];
    let bestDistance = Number.POSITIVE_INFINITY;
    choices.forEach((dir) => {
      const next = this.getNextTile(tile, dir);
      if (!next) return;
      const dist = Math.abs(target.x - next.x) + Math.abs(target.y - next.y);
      if (dist < bestDistance) {
        bestDistance = dist;
        best = dir;
      }
    });
    return best;
  }

  /** When idle, use queued next direction (classic: last intent). */
  private getPacmanFacingForGhosts(): Direction {
    return this.getPacmanFacingForSprite();
  }

  /**
   * Chase targets (Blinky, Pinky, Inky, Clyde) match the arcade patterns:
   * Pinky: 4 tiles ahead of Pac-Man; Inky: double vector from Blinky to 2-tile “ambush” point;
   * Clyde: scatter when within 8 tiles, else chase.
   */
  private getChaseTargetTile(ghost: GhostState, ghostTile: GridPos): GridPos {
    const pacTile = this.worldToTile(this.pacmanGfx.x, this.pacmanGfx.y);
    const vec = DIRECTION_VECTORS[this.getPacmanFacingForGhosts()];

    if (ghost.id === "blinky") return pacTile;

    if (ghost.id === "pinky") {
      return {
        x: Phaser.Math.Clamp(pacTile.x + vec.x * 4, 0, MAP_WIDTH - 1),
        y: Phaser.Math.Clamp(pacTile.y + vec.y * 4, 0, MAP_HEIGHT - 1),
      };
    }

    if (ghost.id === "inky") {
      const twoAhead: GridPos = {
        x: Phaser.Math.Clamp(pacTile.x + vec.x * 2, 0, MAP_WIDTH - 1),
        y: Phaser.Math.Clamp(pacTile.y + vec.y * 2, 0, MAP_HEIGHT - 1),
      };
      const blinky = this.ghosts.find((g) => g.id === "blinky");
      const blinkyTile = blinky ? this.worldToTile(blinky.graphics.x, blinky.graphics.y) : twoAhead;
      return {
        x: Phaser.Math.Clamp(2 * twoAhead.x - blinkyTile.x, 0, MAP_WIDTH - 1),
        y: Phaser.Math.Clamp(2 * twoAhead.y - blinkyTile.y, 0, MAP_HEIGHT - 1),
      };
    }

    // clyde
    const manhattan = Math.abs(ghostTile.x - pacTile.x) + Math.abs(ghostTile.y - pacTile.y);
    if (manhattan > 8) return pacTile;
    return this.clydeScatterTile;
  }

  private consumeDotIfPresent(): void {
    const tile = this.worldToTile(this.pacmanGfx.x, this.pacmanGfx.y);
    const t = this.maze[tile.y][tile.x];
    if (t === TileType.Dot) {
      this.maze[tile.y][tile.x] = TileType.Path;
      this.gameState.score += 10;
      this.gameState.dotsRemaining -= 1;
      this.drawPellets();
    } else if (t === TileType.PowerPellet) {
      this.maze[tile.y][tile.x] = TileType.Path;
      this.gameState.score += 50;
      this.gameState.dotsRemaining -= 1;
      this.gameState.ghostCombo = 0;
      this.gameState.frightenedUntil = this.time.now + FRIGHTENED_DURATION_MS;
      this.drawPellets();
    }

    if (this.gameState.dotsRemaining <= 0 && !this.gameState.isWin) {
      this.gameState.isWin = true;
      this.resultText.setText("YOU WIN");
      this.stopAll();
    }
  }

  private checkGhostVsPacman(): void {
    this.ghosts.forEach((ghost) => {
      const d = Phaser.Math.Distance.Between(this.pacmanGfx.x, this.pacmanGfx.y, ghost.graphics.x, ghost.graphics.y);
      if (d > TILE_SIZE * 0.58) return;

      if (this.isFrightened()) {
        this.gameState.ghostCombo += 1;
        this.gameState.score += 200 * this.gameState.ghostCombo;
        this.resetGhost(ghost);
      } else {
        this.gameState.lives -= 1;
        if (this.gameState.lives <= 0) {
          this.gameState.isGameOver = true;
          this.resultText.setText("GAME OVER");
          this.stopAll();
        } else {
          this.resetRound();
        }
      }
    });
  }

  private applyTunnelWrap(): void {
    const width = MAP_WIDTH * TILE_SIZE;
    const wrap = (go: Phaser.GameObjects.GameObject & { x: number }) => {
      if (go.x < -TILE_SIZE / 2) go.x = width + TILE_SIZE / 2;
      else if (go.x > width + TILE_SIZE / 2) go.x = -TILE_SIZE / 2;
    };
    wrap(this.pacmanGfx);
    this.ghosts.forEach((g) => wrap(g.graphics));
  }

  private startGame(): void {
    if (this.gameState.isGameOver || this.gameState.isWin) return;
    this.gameState.hasStarted = true;
    this.gameState.isPaused = false;
    this.physics.world.isPaused = false;
    this.resultText.setText("");
    this.refreshUi();
  }

  private togglePause(): void {
    if (!this.gameState.hasStarted || this.gameState.isGameOver || this.gameState.isWin) return;
    this.gameState.isPaused = !this.gameState.isPaused;
    this.physics.world.isPaused = this.gameState.isPaused;
    this.resultText.setText(this.gameState.isPaused ? "PAUSED" : "");
    this.refreshUi();
  }

  private resetGame(): void {
    this.maze = MAZE_TEMPLATE.map((r) => [...r]);
    this.gameState = {
      score: 0,
      lives: 3,
      dotsRemaining: this.countDots(),
      frightenedUntil: 0,
      ghostCombo: 0,
      hasStarted: false,
      isPaused: false,
      isGameOver: false,
      isWin: false,
    };
    this.pacman = { direction: Direction.Left, queuedDirection: Direction.Left };
    this.physics.world.isPaused = false;
    this.drawWallsAndColliders();
    this.drawPellets();
    this.resetRound();
    this.resultText.setText("PRESS START");
    this.refreshUi();
  }

  private resetRound(): void {
    const p = this.tileToWorld(this.pacmanSpawn);
    this.pacmanGfx.setPosition(p.x, p.y);
    this.pacman.direction = Direction.Left;
    this.pacman.queuedDirection = Direction.Left;

    this.ghosts.forEach((g) => this.resetGhost(g));
    this.gameState.frightenedUntil = 0;
    this.gameState.ghostCombo = 0;
  }

  private resetGhost(ghost: GhostState): void {
    const p = this.tileToWorld(ghost.spawn);
    ghost.graphics.setPosition(p.x, p.y);
    const startDir: Record<GhostId, Direction> = {
      blinky: Direction.Down,
      pinky: Direction.Up,
      inky: Direction.Right,
      clyde: Direction.Left,
    };
    ghost.direction = startDir[ghost.id];
  }

  private stopAll(): void {}

  private refreshUi(): void {
    const state = this.gameState.isGameOver
      ? "GAME OVER"
      : this.gameState.isWin
        ? "WIN"
        : this.gameState.isPaused
          ? "PAUSED"
          : this.gameState.hasStarted
            ? "RUNNING"
            : "READY";
    this.uiText.setText(`SCORE ${this.gameState.score}   LIVES ${this.gameState.lives}   STATE ${state}`);
    this.controlsText.setText(
      this.showTouchDpad
        ? "D-PAD  ·  ARROWS / WASD  ·  START  ·  P PAUSE  ·  R RESET"
        : "ARROWS / WASD  ·  START ENTER  ·  P PAUSE  ·  R RESET",
    );
  }

  private isFrightened(): boolean {
    return this.time.now < this.gameState.frightenedUntil;
  }

  /**
   * True when moving to the "wrapped" side tunnel tile (0 ↔ MAP_WIDTH-1).
   * In this case the next tile's world position is on the other screen edge, so
   * we must walk past the boundary in X and let `applyTunnelWrap` teleport — not
   * lerp world-space toward the far tile (which would move the wrong way on screen).
   */
  private isHorizontalTunnelWrap(tile: GridPos, nextTile: GridPos, direction: Direction): boolean {
    if (direction === Direction.Left && tile.x === 0 && nextTile.x === MAP_WIDTH - 1) return true;
    if (direction === Direction.Right && tile.x === MAP_WIDTH - 1 && nextTile.x === 0) return true;
    return false;
  }

  private stepEntity(
    go: Phaser.GameObjects.GameObject & { x: number; y: number },
    direction: Direction,
    speed: number,
    dt: number,
  ): void {
    if (direction === Direction.None) {
      return;
    }

    const tile = this.worldToTile(go.x, go.y);
    const nextTile = this.getNextTile(tile, direction);

    if (!nextTile || this.maze[nextTile.y][nextTile.x] === TileType.Wall) {
      // Move back to current tile center so direction decision can be recalculated.
      const currentCenter = this.tileToWorld(tile);
      const cx = currentCenter.x - go.x;
      const cy = currentCenter.y - go.y;
      const centerDistance = Math.hypot(cx, cy);
      if (centerDistance > 0.0001) {
        const centerTravel = Math.min(speed * dt, centerDistance);
        go.x += (cx / centerDistance) * centerTravel;
        go.y += (cy / centerDistance) * centerTravel;
      } else {
        go.x = currentCenter.x;
        go.y = currentCenter.y;
      }
      return;
    }

    if (this.isHorizontalTunnelWrap(tile, nextTile, direction)) {
      if (direction === Direction.Left) go.x -= speed * dt;
      else if (direction === Direction.Right) go.x += speed * dt;
      return;
    }

    const nextCenter = this.tileToWorld(nextTile);
    const dx = nextCenter.x - go.x;
    const dy = nextCenter.y - go.y;
    const distance = Math.hypot(dx, dy);
    if (distance <= 0.0001) {
      go.x = nextCenter.x;
      go.y = nextCenter.y;
      return;
    }

    const travel = Math.min(speed * dt, distance);
    go.x += (dx / distance) * travel;
    go.y += (dy / distance) * travel;
    if (travel === distance) {
      go.x = nextCenter.x;
      go.y = nextCenter.y;
    }
  }

  private lockToCorridorAxis(go: Phaser.GameObjects.GameObject & { x: number; y: number }, direction: Direction): void {
    const tile = this.worldToTile(go.x, go.y);
    const center = this.tileToWorld(tile);
    if (direction === Direction.Left || direction === Direction.Right) {
      go.y = center.y;
    } else if (direction === Direction.Up || direction === Direction.Down) {
      go.x = center.x;
    }
  }

  private isNearCenter(go: { x: number; y: number }, center: GridPos): boolean {
    return Math.abs(go.x - center.x) <= TURN_THRESHOLD && Math.abs(go.y - center.y) <= TURN_THRESHOLD;
  }

  private getValidDirections(tile: GridPos): Direction[] {
    return [Direction.Up, Direction.Left, Direction.Down, Direction.Right].filter((dir) => this.canMove(tile, dir));
  }

  private canMove(tile: GridPos, dir: Direction): boolean {
    const next = this.getNextTile(tile, dir);
    return !!next && this.maze[next.y][next.x] !== TileType.Wall;
  }

  private getNextTile(tile: GridPos, dir: Direction): GridPos | null {
    if (dir === Direction.None) return null;
    const v = DIRECTION_VECTORS[dir];
    let nx = tile.x + v.x;
    const ny = tile.y + v.y;
    if (nx < 0) nx = MAP_WIDTH - 1;
    if (nx >= MAP_WIDTH) nx = 0;
    if (ny < 0 || ny >= MAP_HEIGHT) return null;
    return { x: nx, y: ny };
  }

  private tileToWorld(tile: GridPos): GridPos {
    return { x: tile.x * TILE_SIZE + TILE_SIZE / 2, y: tile.y * TILE_SIZE + TILE_SIZE / 2 };
  }

  private worldToTile(x: number, y: number): GridPos {
    // Use floor-based lookup so entities are not considered in the next tile
    // before actually crossing the tile boundary.
    const tx = Math.floor(x / TILE_SIZE);
    const ty = Math.floor(y / TILE_SIZE);
    return {
      x: Phaser.Math.Clamp(tx, 0, MAP_WIDTH - 1),
      y: Phaser.Math.Clamp(ty, 0, MAP_HEIGHT - 1),
    };
  }

  private countDots(): number {
    let c = 0;
    this.maze.forEach((row) => row.forEach((t) => (t === TileType.Dot || t === TileType.PowerPellet ? (c += 1) : c)));
    return c;
  }
}

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: MAP_WIDTH * TILE_SIZE,
  height: MAP_HEIGHT * TILE_SIZE + HUD_HEIGHT,
  backgroundColor: "#000000",
  parent: "game-container",
  scale: {
    mode: Phaser.Scale.FIT,
    parent: "game-container",
    autoCenter: Phaser.Scale.CENTER_BOTH,
    /** Prevents Phaser from rewriting html/body height; avoids broken scale on window resize. */
    expandParent: false,
    autoRound: true,
    /** Reduces extra internal resize polling (we also refresh on window / visualViewport). */
    resizeInterval: 200,
  },
  render: {
    /** Smooth vector strokes for Pac-Man / ghost shapes; maze stays blocky. */
    pixelArt: false,
    antialias: true,
  },
  physics: {
    default: "arcade",
    arcade: {
      gravity: { x: 0, y: 0 },
      debug: false,
    },
  },
  scene: [PacmanScene],
};

const game = new Phaser.Game(config);

let scaleDebounce: ReturnType<typeof setTimeout> | undefined;
const refreshScale = (): void => {
  if (scaleDebounce !== undefined) {
    clearTimeout(scaleDebounce);
  }
  scaleDebounce = setTimeout(() => {
    scaleDebounce = undefined;
    requestAnimationFrame(() => {
      if (game.scale) {
        game.scale.refresh();
      }
    });
  }, 100);
};

/** Window resize; no ResizeObserver (canvas updates can re-trigger the box and “drift” scale). */
window.addEventListener("resize", refreshScale);
if (typeof window !== "undefined" && window.visualViewport) {
  window.visualViewport.addEventListener("resize", refreshScale);
}
/** Two rAF: layout from CSS has settled. */
requestAnimationFrame(() => {
  requestAnimationFrame(() => {
    if (game.scale) game.scale.refresh();
  });
});
