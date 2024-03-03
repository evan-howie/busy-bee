// setup canvas

const canvas = document.querySelector("canvas");
const gc = canvas.getContext("2d");

let pause = false;
let died = false;
let lives = 3;

let width = (canvas.width = window.innerWidth);
let height = (canvas.height = window.innerHeight);
let sf = width / 1920;

let background;
let title = document.getElementById("Title");

let gameFont = 40 * sf + "px Segoe UI";
let boxTitleFont = 50 * sf + "px Segoe UI";
let boxBodyFont = 30 * sf + "px Segoe UI";
let victoryFont = 72 * sf + "px Segoe UI";

// Timers

let timers = [0, 0, 0];
let flowerTimer = 0;
let branchTimer = 1;
let birdTimer = 2;
let pauseStart;

let spawnDelay = 1000;

let deadlyFlowerCount = 0;

// MAP OBJECT CLASSES

class Obj2D {
  constructor(x, y, dx, dy, img, index) {
    this.GRAVITY = 0;
    this.x = x;
    this.y = y;
    this.dx = dx;
    this.dy = dy;
    this.img = document.getElementById(img);
    this.index = index;
    this.height = this.img.height * sf;
    this.width = this.img.width * sf;
  }
  update() {
    this.x += this.dx;
    this.y += this.dy;
    this.dy += this.GRAVITY;

    if (this.y + this.height > height) {
      this.y = height - this.height;
    } else if (this.y < 0) {
      this.y = 0;
    }
  }
  draw() {
    gc.drawImage(this.img, this.x, this.y, this.width, this.height);
  }
}

class GridPlayerObj {
  constructor(x, y, img) {
    this.x = x;
    this.y = y;
    this.img = document.getElementById(img);
  }
  update() {
    if (keys[37]) {
      this.x -= 1;
      keys[37] = !keys[37];
    } else if (keys[38]) {
      this.y -= 1;
      keys[38] = !keys[38];
    } else if (keys[39]) {
      this.x += 1;
      keys[39] = !keys[39];
    } else if (keys[40]) {
      this.y += 1;
      keys[40] = !keys[40];
    }
  }
  draw() {
    gc.drawImage(
      this.img,
      this.x * GridLevel.TILESIZE,
      this.y * GridLevel.TILESIZE
    );
  }
}

// BEE CLASS

class Bee extends Obj2D {
  constructor(x, y, dx, dy, img) {
    super(x, y, dx, dy, img);
    this.GRAVITY = 1.9 * sf;
    this.score = 0;
    this.pest = 0;
  }
  update() {
    super.update();
    if (keys[38]) {
      this.fly();
      keys[38] = false;
    } //up arrow

    //dev cheats
    if (keys[33]) this.dx += 1;
    if (keys[34]) this.dx -= 1;

    for (let flower of flowers) {
      if (intersectRect(this, flower)) {
        flower.pollen();
        flower.remove();
        if (flower.deadly) this.pest += 1;

        if (this.pest >= 3) {
          this.pain(
            "You have collected too many pesticides! Your bee has fallen ill."
          );
          return;
        }
        break;
      }
    }
    for (let branch of branches) {
      if (intersectRect(this, branch)) {
        this.pain("You hit a branch! Your bee has fallen down!");
        return;
      }
    }
    for (let bird of birds) {
      if (intersectRect(this, bird)) {
        this.pain("You were eaten by a bird!");
        return;
      }
    }
  }
  fly() {
    this.dy = -20 * sf;
  }
  pain(message) {
    textBox = new TextBox(
      width / 2 - 300 * sf,
      height / 2 - 300 * sf,
      600 * sf,
      600 * sf,
      message,
      "Oops, BEE Careful! Try Again!"
    );
    lives -= 1;
    died = true;
  }
}

//FLOWER CLASS

class Flower extends Obj2D {
  constructor(x, y, dx, dy, img, index, deadly) {
    super(x, y, dx, dy, img, index);
    this.deadly = deadly;
    if (deadly) this.img = document.getElementById("FlowerDeadly");
    this.width = this.img.width * sf;
    this.height = this.img.height * sf;
  }
  pollen() {
    player.score += 1;
  }
  remove() {
    for (let flower of flowers) {
      if (flower.index > this.index) {
        flower.index--;
      }
    }
    flowers.splice(this.index, 1);
  }
  static spawn(t) {
    if (timers[flowerTimer] <= timestamp && player.x >= spawnDelay) {
      let isDeadly =
        Math.random() * currentLevel.deadlyChance > 1 &&
        t &&
        deadlyFlowerCount < currentLevel.deadlyCap;

      if (isDeadly) deadlyFlowerCount += 1;

      if (timers[flowerTimer] != 0)
        flowers.push(
          new Flower(
            player.x + width,
            Math.random() *
              (height - document.getElementById("Flower").height * sf - 283),
            0,
            0,
            "Flower",
            flowers.length,
            isDeadly
          )
        );
      timers[flowerTimer] =
        timestamp +
        currentLevel.flowerDelay +
        currentLevel.flowerDelay *
          0.2 *
          Math.random() *
          (Math.random() * 2 < 1 ? -1 : 1);
    }
  }
}

// BRANCH CLASS

class Branch extends Obj2D {
  constructor(x, y, dx, dy, img, index, h) {
    super(x, y, dx, dy, img, index);
    this.height = h;
  }
  static spawn() {
    if (timers[branchTimer] <= timestamp && player.x >= spawnDelay) {
      if (timers[branchTimer] != 0) {
        let newHeight =
          (document.getElementById("Branch").height + Math.random() * 200) * sf;
        branches.push(
          new Branch(
            player.x + width,
            height - newHeight,
            0,
            0,
            "Branch",
            branches.length,
            newHeight
          )
        );
      }
      timers[branchTimer] =
        timestamp +
        currentLevel.branchDelay +
        currentLevel.branchDelay *
          0.2 *
          Math.random() *
          (Math.random() * 2 < 1 ? -1 : 1);
    }
  }
}

// BIRD CLASS

class Bird extends Obj2D {
  constructor(x, y, dx, dy, img, index) {
    super(x, y, dx, dy, img);
    this.index = index;
  }
  static spawn() {
    if (timers[birdTimer] <= timestamp && player.x >= spawnDelay) {
      if (timers[birdTimer] != 0) {
        birds.push(
          new Bird(
            player.x + width,
            Math.random() *
              (height - 283 * sf - document.getElementById("Bird").height),
            2,
            0,
            "Bird",
            birds.length
          )
        );
      }
      timers[birdTimer] =
        timestamp +
        currentLevel.birdDelay +
        currentLevel.birdDelay *
          0.2 *
          Math.random() *
          (Math.random() * 2 < 1 ? -1 : 1);
    }
  }
}

// CAMERA CLASS

class Camera {
  constructor() {
    this.x = 0;
    this.y = 0;
  }
  update() {
    if (currentLevel != Menu) {
      if (player.x >= currentLevel.goalX - width / 2) {
        this.x = width - currentLevel.goalX - player.width / 2;
        gc.translate(this.x, 0);
      } else if (player.x + player.width >= width / 2 + player.width / 2) {
        this.x = width / 2 - player.x - player.width / 2;
        gc.translate(this.x, 0);
      }
    }
  }
}

// SCOREBOARD CLASS

class ScoreBoard {
  static MARGIN = 50;
  static LIFEGAP = 10;
  draw() {
    if (player != null) {
      gc.fillStyle = "#ffff00";
      gc.font = gameFont;
      gc.textBaseline = "top";
      gc.textAlign = "left";
      gc.fillText(
        "Pollen Points: " + player.score,
        ScoreBoard.MARGIN,
        ScoreBoard.MARGIN
      );
      if (currentLevel.goalPoints)
        gc.fillText(
          "Goal: " + currentLevel.goalPoints,
          ScoreBoard.MARGIN,
          ScoreBoard.MARGIN * 2
        );
      for (let i = 0; i < lives; i += 1) {
        gc.drawImage(
          player.img,
          ScoreBoard.MARGIN + (player.width + ScoreBoard.LIFEGAP) * i,
          ScoreBoard.MARGIN * 3,
          player.width,
          player.height
        );
      }
    }
  }
}

// TEXTBOX CLASS

class TextBox {
  static MARGIN = 25;

  constructor(x, y, width, height, text, title) {
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
    this.text = text;
    this.title = title;
    this.color = Color.LIGHTGREEN;
    this.subcolor = Color.GREEN;
    this.img = document.getElementById("TextBox");
    pause = true;
  }

  update() {
    if (keys[32]) {
      pause = false;
      if (died) {
        if (lives <= 0) {
          currentLevel = Menu;
        }
        currentLevel.init();
        died = false;
      }
      textBox = null;
    }
  }

  draw() {
    if (player) gc.translate(-camera.x, 0);
    //gc.fillStyle = this.subcolor;
    //gc.fillRect(0, 0, width, height);
    gc.fillStyle = this.color;
    gc.drawImage(this.img, this.x, this.y, this.width, this.height);
    gc.textAlign = "center";
    gc.textBaseline = "top";
    gc.font = boxBodyFont;
    gc.fillStyle = Color.BLACK;
    gc.fillText(this.title, this.x + this.width / 2, this.y + TextBox.MARGIN);
    gc.textAlign = "left";
    wrapText(
      this.text,
      this.x + TextBox.MARGIN,
      this.y + 60 + TextBox.MARGIN,
      this.width - TextBox.MARGIN,
      10
    );

    gc.textAlign = "right";
    gc.textBaseline = "bottom";
    gc.font = "15px Segoe UI";
    gc.fillStyle = Color.BLACK;
    gc.fillText(
      "Press space to continue...",
      this.x + this.width - 45,
      this.y + this.height - 80
    );
  }
}

// COLOR CLASS

class Color {
  static GREEN = "#00cc66";
  static LIGHTGREEN = "#80ffbf";
  static BLACK = "#0f1214";
  static RED = "#ff0000";
  static WHITE = "#ffffff";
}

// BUTTON CLASS

class Button {
  static MARGIN = 5;
  constructor(x, y, width, height, text, color, onClick) {
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
    this.text = text;
    this.color = color;
    this.onClick = onClick;
    this.img = document.getElementById("Button");
  }
  clicked(x, y) {
    if (
      x >= this.x &&
      x <= this.x + this.width &&
      y >= this.y &&
      y <= this.y + this.height
    ) {
      this.onClick();
    }
  }
  draw() {
    //gc.fillStyle = this.color
    //gc.fillRect(this.x, this.y, this.width, this.height)
    gc.drawImage(
      this.img,
      this.x - Button.MARGIN,
      this.y - Button.MARGIN,
      this.width + Button.MARGIN * 2,
      this.height + Button.MARGIN * 2
    );
    gc.font = boxBodyFont;
    gc.fillStyle = Color.WHITE;
    gc.textAlign = "center";
    gc.textBaseline = "middle";
    gc.fillText(this.text, this.x + this.width / 2, this.y + this.height / 2);
  }
}

// Stages

let player, flowers, sb, camera, timestamp, textBox, buttons, branches, birds;

class Menu {
  static init() {
    background = document.getElementById("Background1");
    buttons = [
      new Button(
        width / 2 - 200 * sf,
        height - (100 + 50) * sf,
        400 * sf,
        100 * sf,
        "Endless",
        Color.RED,
        function () {
          lives = 0;
          currentLevel = Endless;
          currentLevel.init();
        }
      ),
      new Button(
        width / 2 - 200 * sf,
        height - (200 + 100) * sf,
        400 * sf,
        100 * sf,
        "About",
        Color.RED,
        function () {
          currentLevel = About;
          currentLevel.init();
        }
      ),
      new Button(
        width / 2 - 200 * sf,
        height - (300 + 150) * sf,
        400 * sf,
        100 * sf,
        "Play",
        Color.RED,
        function () {
          lives = 3;
          currentLevel = LevelOne;
          //canvas.requestFullscreen();
          currentLevel.init();
        }
      ),
    ];
  }
  static loop(t) {
    draw();
    requestAnimationFrame(currentLevel.loop);
  }
  static draw() {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;

    gc.drawImage(background, 0, 0, width, height);
    gc.drawImage(
      title,
      width / 2 - (title.width / 2) * sf,
      100,
      title.width * sf,
      title.height * sf
    );

    for (let but of buttons) {
      but.draw();
    }
  }
}

class About {
  static init() {
    background = null;
    buttons = [
      new Button(
        width / 2 - 300 * sf,
        height - 100 * sf - 100 * sf,
        600 * sf,
        100 * sf,
        "Return to Menu",
        Color.GREEN,
        function () {
          currentLevel = Menu;
          currentLevel.init();
        }
      ),
    ];
  }
  static loop(t) {
    draw();
    requestAnimationFrame(currentLevel.loop);
  }
  static draw() {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;

    gc.fillStyle = Color.LIGHTGREEN;
    gc.fillRect(0, 0, width, height);

    gc.fillStyle = Color.BLACK;
    gc.textAlign = "center";
    gc.textBaseline = "top";
    gc.font = victoryFont;
    gc.fillText("About", width / 2, 100 * sf);

    gc.fillRect(200 * sf, 172 * sf + 50 * sf, width - 400 * sf, 500 * sf);

    gc.textAlign = "left";
    wrapText(
      "Busy Bee is a fun video game created by me, Evan, a member of the Nature's NEAR team." +
        " I have a strong passion for the environment and would like to encourage others to share this passion with me." +
        " This game was programmed from scratch, using javascript, HTML, and CSS. A good resource that I found was a website called W3Schools, which makes" +
        " coding websites and games easy to learn. I was inspired to start programming because of my love for video games, so I tried to create one myself.",
      200 * sf + 10 * sf,
      172 * sf + 50 * sf,
      width - 400 * sf,
      10,
      Color.WHITE
    );

    for (let but of buttons) {
      but.draw();
    }
  }
}

class Level {
  static deadlyChance = 1.5;
  static deadlyCap = 4;

  static init() {
    buttons = [];
    player = new Bee(0, height / 2, 8, 0, "Bee");
    flowers = [];
    deadlyFlowerCount = 0;
    branches = [];
    birds = [];
    died = false;
    sb = new ScoreBoard();
    textBox = null;
    pause = false;
    camera = new Camera();
    background = this.background;
    for (let i = 0; i < timers.length; i++) {
      timers[i] = 3000;
    }
  }

  static loop(t) {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
    timestamp = t;

    if (keys[27]) {
      if (!textBox) {
        pause = !pause;
        if (pause) {
          buttons = [
            new Button(
              width / 2 - 300 * sf,
              height - 100 * sf - 100 * sf,
              600 * sf,
              100 * sf,
              "Play",
              Color.GREEN,
              function () {
                pause = false;
                buttons = [];
              }
            ),
          ];
        } else buttons = [];
      }
      keys[27] = false;
      if (pause) {
        pauseStart = timestamp;
      } else {
        adjustTimers(timestamp - pauseStart);
      }
    }
    if (!pause) {
      //gc.fillStyle = "#ffffff"
      //gc.fillRect(0, 0, canvas.width, canvas.height);
      update();
      draw();
    } else if (textBox) {
      draw();
      textBox.update();
      if (textBox) textBox.draw();
    } else {
      gc.fillStyle = Color.LIGHTGREEN;
      gc.fillRect(0, 0, width, height);

      gc.fillStyle = Color.BLACK;
      gc.textAlign = "center";
      gc.textBaseline = "top";
      gc.font = victoryFont;
      gc.fillText("Paused", width / 2, 100 * sf);

      for (let button of buttons) button.draw();
    }
    requestAnimationFrame(currentLevel.loop);
  }

  static update() {
    player.update();
    for (let bird of birds) bird.update();
    if (player.x >= this.goalX) {
      if (player.score >= this.goalPoints) {
        currentLevel = levels[levels.indexOf(currentLevel) + 1];
        currentLevel.init();
      } else {
        player.pain(
          "You haven't collected enough pollen for your hive! Your bee starved."
        );
      }
    }
  }

  static draw() {
    gc.drawImage(background, (-player.x * 0.25) % width, 0, width, height);
    gc.drawImage(
      background,
      ((-player.x * 0.25) % width) + width,
      0,
      width,
      height
    );

    // scoreboard
    sb.draw();

    camera.update();
    player.draw();

    for (let flower of flowers) flower.draw();
    for (let branch of branches) branch.draw();
    for (let bird of birds) bird.draw();
    for (let button of buttons) button.draw();
  }
}

class LevelOne extends Level {
  static background = document.getElementById("Background1");
  static goalPoints = 7;
  static goalX = 15000;
  static flowerDelay = 2000;
  static branchDelay = 2500;
  static tip1 = false;

  static init() {
    super.init();
    this.tip1 = false;
  }

  static update() {
    super.update();
    if (player.x >= width / 2 - player.width / 2 && !this.tip1) {
      textBox = new TextBox(
        width / 2 - 300,
        height / 2 - 300,
        600,
        600,
        "Collect as much pollen from flowers as you can! Avoid the branches along the way!",
        "Tip:"
      );
      this.tip1 = true;
    }
    Flower.spawn(false);
    Branch.spawn();
  }
}

class LevelTwo extends Level {
  static background = document.getElementById("Background2");
  static goalPoints = 8;
  static goalX = 20000;
  static flowerDelay = 2500;
  static branchDelay = 2000;
  static tip1 = false;

  static init() {
    super.init();
    this.tip1 = false;
  }

  static update() {
    super.update();
    if (player.x >= width / 2 - player.width / 2 && !this.tip1) {
      textBox = new TextBox(
        width / 2 - 300,
        height / 2 - 300,
        600,
        600,
        "Try to avoid collecting the red flowers with pesticides on them.",
        "Tip:"
      );
      this.tip1 = true;
    }
    Flower.spawn(true);
  }
}

class LevelThree extends Level {
  static background = document.getElementById("Background2");
  static goalPoints = 9;
  static goalX = 20000;
  static flowerDelay = 2500;
  static branchDelay = 1500;
  static birdDelay = 6000;
  static tip1 = false;
  static deadlyChance = 1.25;

  static init() {
    super.init();
    this.tip1 = false;
  }

  static update() {
    super.update();

    if (player.x >= width / 2 - player.width / 2 && !this.tip1) {
      textBox = new TextBox(
        width / 2 - 300,
        height / 2 - 300,
        600,
        600,
        "Try to avoid being eaten by the birds!",
        "Tip:"
      );
      this.tip1 = true;
    }

    Flower.spawn(true);
    Branch.spawn();
    Bird.spawn();
  }
}

class Endless extends Level {
  static background = document.getElementById("Background1");
  static goalPoints = null; //7
  static goalX = Number.MAX_SAFE_INTEGER; //15000
  static flowerDelay = 2000;
  static branchDelay = 2500;
  static birdDelay = 5000;

  static init() {
    super.init();
  }

  static update() {
    super.update();

    player.dx += 0.001;

    Flower.spawn(true);
    Branch.spawn();
    Bird.spawn();
  }
}

class Victory {
  static init() {
    background = null;
    buttons = [
      new Button(
        width / 2 - 300 * sf,
        height - 100 * sf - 100 * sf,
        600 * sf,
        100 * sf,
        "Return to Menu",
        Color.GREEN,
        function () {
          currentLevel = Menu;
          currentLevel.init();
        }
      ),
    ];
  }
  static loop(t) {
    draw();
    requestAnimationFrame(currentLevel.loop);
  }
  static draw() {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;

    gc.fillStyle = Color.LIGHTGREEN;
    gc.fillRect(0, 0, width, height);

    gc.fillStyle = Color.BLACK;
    gc.textAlign = "center";
    gc.textBaseline = "top";
    gc.font = victoryFont;
    gc.fillText("Congratulations, you win!", width / 2, 100 * sf);

    for (let but of buttons) {
      but.draw();
    }
  }
}

let levels = [LevelOne, LevelTwo, LevelThree, Victory];

// functions

function intersectRect(r1, r2) {
  return !(
    r2.x > r1.x + r1.width ||
    r2.x + r2.width < r1.x ||
    r2.y > r1.y + r1.height ||
    r2.y + r2.height < r1.y
  );
}

function wrapText(text, x, y, maxWidth, lineGap, color) {
  var words = text.split(" ");
  var line = "";
  var lineNum = 0;

  gc.font = gameFont;
  gc.fillStyle = color;
  gc.textBaseline = "top";

  x += TextBox.MARGIN;
  y += TextBox.MARGIN;
  maxWidth -= 2 * TextBox.MARGIN;

  for (var n = 0; n < words.length; n++) {
    var testLine = line + words[n] + " ";
    var metrics = gc.measureText(testLine);
    var testWidth = metrics.width;
    if (testWidth > maxWidth && n > 0) {
      gc.fillText(
        line,
        x,
        y + lineNum++ * (lineGap + gc.measureText("M").width)
      );
      line = words[n] + " ";
    } else {
      line = testLine;
    }
  }
  gc.fillText(line, x, y + lineNum * (lineGap + gc.measureText("M").width));
}

function adjustTimers(diff) {
  for (timer of timers) {
    timer += diff;
  }
}

// EventListener
keys = [];
window.addEventListener("keydown", function (e) {
  if (
    ["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].indexOf(
      e.code
    ) > -1
  ) {
    e.preventDefault();
  }
  keys[e.keyCode] = true;
});
window.addEventListener("keyup", function (e) {
  keys[e.keyCode] = false;
});
window.addEventListener("click", function (e) {
  for (let but of buttons) {
    but.clicked(e.x, e.y);
  }
});

// update functions

let currentLevel = Menu;

function update() {
  currentLevel.update();
}

// draw function
function draw() {
  sf = width / 1920;

  currentLevel.draw();
}

// start

function init() {
  currentLevel.init();
  currentLevel.loop();
}

init();
