let player1, player2;                  // 宣告兩個角色變量
let p1Sprites = {};                    // 存儲角色1的所有動畫圖片
let p2Sprites = {};                    // 存儲角色2的所有動畫圖片
let bgImage;                           // 背景圖片變量
let bullets = [];                      // 存儲所有子彈的數組
let explosions = [];                   // 存儲所有爆炸效果的數組
const BULLET_SPEED = 15;               // 子彈移動速度
const EXPLOSION_FRAMES = 5;            // 爆炸動畫的總幀數

// 遊戲基本設置常量
const GROUND_Y = window.innerHeight / 1.25;  // 地面高度
const SCALE_FACTOR = 1.5;                    // 角色縮放比例

// 物理相關常量
const GRAVITY = 0.8;                   // 重力加速度
const JUMP_FORCE = -20;                // 跳躍力度
const MOVE_SPEED = 8;                  // 移動速度

// 遊戲相關常量
const MAX_HP = 100;                    // 最大生命值
const SCREEN_PADDING = 50;             // 螢幕邊界padding

// 角色類別 - 定義遊戲中的角色基本屬性和行為
class Fighter {
  constructor(x, y, sprites, config, isPlayer1) {
    this.x = x;                    // 角色的X座標位置
    this.y = y;                    // 角色的Y座標位置
    this.sprites = sprites;        // 角色的所有動畫圖片
    this.config = config;          // 角色的動畫配置
    this.currentAnimation = 'idle';// 當前播放的動畫名稱
    this.frame = 0;               // 當前動畫幀
    this.frameCounter = 0;        // 動畫幀計數器
    this.direction = 1;           // 角色朝向(1右/-1左)
    this.scale = SCALE_FACTOR;    // 角色縮放比例
    
    // 物理相關屬性
    this.velocityY = 0;           // Y軸速度(用於跳躍)
    this.isJumping = false;       // 是否正在跳躍
    this.moveLeft = false;        // 是否向左移動
    this.moveRight = false;       // 是否向右移動
    this.hp = MAX_HP;            // 角色生命值
    this.isPlayer1 = isPlayer1;   // 是否為玩家1
    this.isAttacking = false;     // 是否正在攻擊
    this.attackBox = {            // 攻擊碰撞箱
      width: 60,
      height: 50
    };
  }

  // 更新角色狀態
  update() {
    // 處理跳躍物理
    if (this.isJumping) {
      this.velocityY += GRAVITY;          // 添加重力效果
      this.y += this.velocityY;           // 更新Y座標

      // 著地檢測
      if (this.y >= GROUND_Y) {
        this.y = GROUND_Y;                // 設置為地面高度
        this.velocityY = 0;               // 重置Y軸速度
        this.isJumping = false;           // 結束跳躍狀態
        if (!this.moveLeft && !this.moveRight) {
          this.currentAnimation = 'idle';  // 回到待機動畫
        }
      }
    }

    // 處理左右移動
    if (this.moveLeft) {
      const nextX = this.x - MOVE_SPEED;
      if (nextX > SCREEN_PADDING) {       // 檢查左邊界
        this.x = nextX;
      }
      this.direction = -1;                // 設置朝向左邊
      if (!this.isJumping) this.currentAnimation = 'idle';
    }
    if (this.moveRight) {
      const nextX = this.x + MOVE_SPEED;
      if (nextX < windowWidth - SCREEN_PADDING) {  // 檢查右邊界
        this.x = nextX;
      }
      this.direction = 1;                 // 設置朝向右邊
      if (!this.isJumping) this.currentAnimation = 'idle';
    }

    // 檢查攻擊碰撞
    if (this.isAttacking) {
      this.checkAttackHit();
    }
  }

  // 檢查攻擊是否命中
  checkAttackHit() {
    const opponent = this.isPlayer1 ? player2 : player1;  // 獲取對手
    
    // 計算當前角色的碰撞箱
    const myBox = {
      x: this.x - (this.config[this.currentAnimation].width * this.scale) / 2,
      y: this.y - this.config[this.currentAnimation].height * this.scale,
      width: this.config[this.currentAnimation].width * this.scale,
      height: this.config[this.currentAnimation].height * this.scale
    };

    // 計算對手的碰撞箱
    const opponentBox = {
      x: opponent.x - (opponent.config[opponent.currentAnimation].width * opponent.scale) / 2,
      y: opponent.y - opponent.config[opponent.currentAnimation].height * opponent.scale,
      width: opponent.config[opponent.currentAnimation].width * opponent.scale,
      height: opponent.config[opponent.currentAnimation].height * opponent.scale
    };

    // 檢查碰撞
    if (this.checkCollision(myBox, opponentBox)) {
      if (!opponent.isHit && this.isAttacking) {
        opponent.takeDamage(10);           // 造成傷害
        opponent.isHit = true;             // 設置被擊中狀態
        
        // 擊退效果
        const knockbackForce = 20;         // 擊退力度
        const direction = this.direction;   // 擊退方向
        opponent.x += knockbackForce * direction;
        
        // 確保擊退不會超出螢幕邊界
        opponent.x = Math.max(SCREEN_PADDING, Math.min(windowWidth - SCREEN_PADDING, opponent.x));
      }
    }
  }

  // 碰撞檢測輔助方法
  checkCollision(box1, box2) {
    return box1.x < box2.x + box2.width &&    // 檢查水平方向的重疊
           box1.x + box1.width > box2.x &&
           box1.y < box2.y + box2.height &&    // 檢查垂直方向的重疊
           box1.y + box1.height > box2.y;
  }

  // 處理受到傷害
  takeDamage(damage) {
    this.hp = Math.max(0, this.hp - damage);  // 扣除生命值但不低於0
    
    // 受傷閃爍效果
    this.isHit = true;
    setTimeout(() => {
      this.isHit = false;
    }, 200);

    // 如果血量歸零
    if (this.hp <= 0) {
      this.handleDeath();
    }
  }

  // 處理攻擊動作
  attack() {
    if (!this.isAttacking) {
      this.currentAnimation = 'attack';     // 切換到攻擊動畫
      this.isAttacking = true;
      this.frame = 0;
      
      // 計算子彈發射位置
      const bulletY = this.y - 50;          // 子彈Y座標(略高於角色)
      const bulletX = this.x + (this.direction * 30);  // 子彈X座標(根據朝向偏移)
      
      // 發射子彈
      bullets.push(new Bullet(bulletX, bulletY, this.direction, this));
      
      // 攻擊動作結束後重置狀態
      setTimeout(() => {
        this.isAttacking = false;
        if (!this.isJumping) {
          this.currentAnimation = 'idle';
        }
      }, this.isPlayer1 ? 500 : 700);
    }
  }

  // 繪製血條
  drawHP() {
    push();
    const hpBarWidth = 200;                // 血條寬度
    const hpBarHeight = 20;                // 血條高度
    const x = this.isPlayer1 ? 50 : windowWidth - 250;  // 血條X座標
    const y = 30;                          // 血條Y座標
    
    // 繪製血條背景
    fill(100);
    rect(x, y, hpBarWidth, hpBarHeight);
    
    // 繪製當前血量
    const hpWidth = (this.hp / MAX_HP) * hpBarWidth;
    fill(this.hp > 30 ? color(0, 255, 0) : color(255, 0, 0));  // 血量低於30%變紅
    rect(x, y, hpWidth, hpBarHeight);
    
    // 繪製血量數字
    fill(255);
    textAlign(CENTER, CENTER);
    textSize(16);
    text(this.hp, x + hpBarWidth/2, y + hpBarHeight/2);
    pop();
  }

  // 處理跳躍動作
  jump() {
    if (!this.isJumping) {
      this.velocityY = JUMP_FORCE;         // 設置向上的初始速度
      this.isJumping = true;
      this.currentAnimation = 'jump';       // 切換到跳躍動畫
    }
  }

  // 處理角色動畫
  animate() {
    const currentConfig = this.config[this.currentAnimation];
    this.frameCounter++;
    
    // 更新動畫幀
    if (this.frameCounter >= currentConfig.frameDelay) {
      this.frame = (this.frame + 1) % currentConfig.frames;
      this.frameCounter = 0;
    }

    push();
    translate(this.x, this.y);
    
    // 受傷閃爍效果
    if (this.isHit) {
      tint(255, 0, 0);  // 紅色色調
    }
    
    scale(this.direction * this.scale, this.scale);
    
    // 計算精靈圖的一幀寬度
    const frameWidth = this.sprites[this.currentAnimation].width / currentConfig.frames;
    const offsetY = currentConfig.offsetY || 0;
    
    // 繪製當前動畫幀
    image(
      this.sprites[this.currentAnimation],
      -currentConfig.width/2,
      -currentConfig.height + offsetY,
      currentConfig.width,
      currentConfig.height,
      frameWidth * this.frame,
      0,
      frameWidth,
      this.sprites[this.currentAnimation].height
    );
    pop();
  }

  // 處理角色死亡
  handleDeath() {
    const winner = this.isPlayer1 ? "Player 2" : "Player 1";
    this.showGameOver(winner);
  }

  // 顯示遊戲結束畫面
  showGameOver(winner) {
    push();
    textAlign(CENTER, CENTER);
    textSize(64);
    fill(255);
    text(winner + " Wins!", windowWidth/2, windowHeight/2);
    
    textSize(32);
    text("Press R to restart", windowWidth/2, windowHeight/2 + 50);
    pop();
    
    noLoop();  // 停止遊戲循環
  }
}

// 角色動作配置
const player1Config = {
  idle: {
    frames: 8,          // 動畫幀數
    frameDelay: 8,      // 動畫速度（數字越大越慢）
    width: 59,         // 顯示寬度
    height: 101         // 顯示高度
  },
  attack: {
    frames: 6,
    frameDelay: 4,
    width: 139,
    height: 111
  },
  jump: {
    frames: 5,
    frameDelay: 6,
    width: 105,
    height: 79
  }
};

const player2Config = {
  idle: {
    frames: 4,
    frameDelay: 8,
    width: 47,
    height: 67,
    offsetY: 0
  },
  attack: {
    frames: 14,            // 改為7幀，根據實際精靈圖的幀數
    frameDelay: 4,
    width: 126,
    height: 129,
    offsetY: 25
  },
  jump: {
    frames: 14,
    frameDelay: 6,
    width: 107,
    height: 67,
    offsetY: 0
  }
};

function preload() {
  // 載入背景圖片
  bgImage = loadImage('bg/0.png');
  
  // 載入角色1的圖片
  p1Sprites = {
    idle: loadImage('p1/walk.png'),      // 水平排列的精靈圖
    attack: loadImage('p1/attack.png'),  // 水平排列的精靈圖
    jump: loadImage('p1/jump.png')       // 水平排列的精靈圖
  };
  
  // 載入角色2的圖片
  p2Sprites = {
    idle: loadImage('p2/walk_1.png'),    // 水平排列的精靈圖
    attack: loadImage('p2/attack_1.png'), // 水平排列的精靈圖
    jump: loadImage('p2/jump_1.png')     // 水平排列的精靈圖
  };
}

function setup() {
  createCanvas(windowWidth, windowHeight);
  
  // 創建兩個角色實例，加入 isPlayer1 參數
  player1 = new Fighter(windowWidth * 0.3, GROUND_Y, p1Sprites, player1Config, true);
  player2 = new Fighter(windowWidth * 0.7, GROUND_Y, p2Sprites, player2Config, false);
}

function draw() {
  image(bgImage, 0, 0, windowWidth, windowHeight);
  
  // 更新和繪製子彈
  bullets = bullets.filter(bullet => bullet.active);
  bullets.forEach(bullet => {
    bullet.update();
    bullet.draw();
  });
  
  // 更新和繪製爆炸特效
  explosions = explosions.filter(explosion => explosion.active);
  explosions.forEach(explosion => {
    explosion.update();
    explosion.draw();
  });
  
  // 繪製操作說明
  drawControls();
  
  // 更新和繪製角色
  player1.update();
  player2.update();
  player1.animate();
  player2.animate();
  
  // 繪製血條
  player1.drawHP();
  player2.drawHP();
  
  // 添加常駐字幕
  drawTitle();
}

// 添加繪製標題的函數
function drawTitle() {
  push();
  // 設定文字樣式
  textAlign(CENTER, TOP);
  textSize(24);
  textStyle(BOLD);
  
  // 添加文字陰影效果
  fill(0, 150);
  text('淡江教育科技', windowWidth/2 + 2, 12);
  
  // 主要文字
  fill(255);
  text('淡江教育科技', windowWidth/2, 10);
  pop();
}

// 新增繪製操作說明的函數
function drawControls() {
  push();
  fill(255);
  textSize(16);
  textAlign(LEFT);
  
  // P1控制說明
  text('Player 1 Controls:', 50, 70);
  text('A/D - Move', 50, 90);
  text('W - Jump', 50, 110);
  text('F - Attack', 50, 130);
  
  // P2控制說明
  textAlign(RIGHT);
  text('Player 2 Controls:', windowWidth - 50, 70);
  text('←/→ - Move', windowWidth - 50, 90);
  text('↑ - Jump', windowWidth - 50, 110);
  text('/ - Attack', windowWidth - 50, 130);
  pop();
}

// 修改按鍵控制
function keyPressed() {
  // 角色1控制
  switch (keyCode) {
    case 65: // A
      player1.moveLeft = true;
      break;
    case 68: // D
      player1.moveRight = true;
      break;
    case 87: // W
      player1.jump();
      break;
    case 70: // F
      player1.attack();
      break;
  }
  
  // 角色2控制
  switch (keyCode) {
    case LEFT_ARROW:
      player2.moveLeft = true;
      break;
    case RIGHT_ARROW:
      player2.moveRight = true;
      break;
    case UP_ARROW:
      player2.jump();
      break;
    case 191: // /
      player2.attack();
      break;
  }

  // 重新開始遊戲
  if (keyCode === 82) { // R鍵
    resetGame();
  }
}

function keyReleased() {
  // 角色1控制
  switch (keyCode) {
    case 65: // A
      player1.moveLeft = false;
      if (!player1.moveRight && !player1.isJumping) player1.currentAnimation = 'idle';
      break;
    case 68: // D
      player1.moveRight = false;
      if (!player1.moveLeft && !player1.isJumping) player1.currentAnimation = 'idle';
      break;
    case 70: // F
      if (!player1.isJumping) player1.currentAnimation = 'idle';
      break;
  }
  
  // 角色2控制
  switch (keyCode) {
    case LEFT_ARROW:
      player2.moveLeft = false;
      if (!player2.moveRight && !player2.isJumping) player2.currentAnimation = 'idle';
      break;
    case RIGHT_ARROW:
      player2.moveRight = false;
      if (!player2.moveLeft && !player2.isJumping) player2.currentAnimation = 'idle';
      break;
    case 191: // /
      if (!player2.isJumping) player2.currentAnimation = 'idle';
      break;
  }
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  // 更新地面高度
  GROUND_Y = window.innerHeight / 1;
  // 更新角色位置
  player1.y = GROUND_Y;
  player2.y = GROUND_Y;
}

// 添加子彈類
class Bullet {
    constructor(x, y, direction, shooter) {
        this.x = x;                  // 子彈的X座標
        this.y = y;                  // 子彈的Y座標
        this.direction = direction;  // 子彈的方向（1或-1）
        this.shooter = shooter;      // 發射子彈的角色
        this.width = 25;            // 子彈的寬度
        this.height = 15;           // 子彈的高度
        this.active = true;         // 子彈是否有效
        // 根據發射者設置不同的顏色
        this.color = this.shooter.isPlayer1 ? color(0, 255, 255) : color(255, 0, 255);
        this.glowColor = this.shooter.isPlayer1 ? color(0, 150, 255) : color(255, 0, 150);
    }

    update() {
        this.x += this.direction * BULLET_SPEED;  // 更新子彈位置
        
        // 檢查子彈是否超出螢幕範圍
        if (this.x < 0 || this.x > windowWidth) {
            this.active = false;
            return;
        }
        
        // 檢查子彈是否擊中目標
        const target = this.shooter.isPlayer1 ? player2 : player1;
        if (this.checkCollision(target) && target.hp > 0) {
            this.active = false;                     // 使子彈失效
            target.takeDamage(10);                  // 造成傷害
            explosions.push(new Explosion(this.x, this.y, this.color));  // 創建爆炸效果
        }
    }

    checkCollision(target) {
        const targetBox = {
            x: target.x - (target.config[target.currentAnimation].width * target.scale) / 2,
            y: target.y - target.config[target.currentAnimation].height * target.scale,
            width: target.config[target.currentAnimation].width * target.scale,
            height: target.config[target.currentAnimation].height * target.scale
        };

        return this.x + this.width/2 > targetBox.x &&
               this.x - this.width/2 < targetBox.x + targetBox.width &&
               this.y + this.height/2 > targetBox.y &&
               this.y - this.height/2 < targetBox.y + targetBox.height;
    }

    draw() {
        push();  // 保存當前繪圖狀態
        drawingContext.shadowBlur = 15;             // 設置發光模糊程度
        drawingContext.shadowColor = this.color;    // 設置發光顏色
        
        translate(this.x, this.y);                  // 移動到子彈位置
        scale(this.direction, 1);                   // 根據方向縮放
        
        // 繪製子彈外發光效果
        fill(this.glowColor);
        noStroke();
        ellipse(0, 0, this.width + 10, this.height + 10);
        
        // 繪製子彈主體
        fill(this.color);
        beginShape();
        vertex(-this.width/2, 0);
        vertex(this.width/2, 0);
        vertex(this.width/2 + 10, -this.height/2);
        vertex(-this.width/2, -this.height/2);
        vertex(-this.width/2, this.height/2);
        endShape(CLOSE);
        
        // 添加內部高光效果
        fill(255, 200);
        ellipse(-this.width/4, 0, this.width/3, this.height/3);
        pop();  // 恢復繪圖狀態
    }
}

// 修改爆炸特效類
class Explosion {
    constructor(x, y, color) {
        this.x = x;              // 爆炸效果的X座標
        this.y = y;              // 爆炸效果的Y座標
        this.frame = 0;          // 當前動畫幀
        this.active = true;      // 爆炸效果是否有效
        this.size = 50;          // 爆炸效果的基礎大小
        this.color = color;      // 爆炸效果的顏色
    }

    update() {
        this.frame++;                           // 更新動畫幀
        if (this.frame >= EXPLOSION_FRAMES) {   // 檢查動畫是否結束
            this.active = false;                // 結束時將效果設為無效
        }
    }

    draw() {
        push();                                 // 保存繪圖狀態
        blendMode(ADD);                         // 設置為疊加混合模式
        noStroke();                             // 不繪製邊框
        
        // 計算當前幀的透明度和大小
        const alpha = 255 * (1 - this.frame/EXPLOSION_FRAMES);
        const size = this.size * (1 + this.frame/2);
        
        // 繪製主要爆炸圓
        fill(red(this.color), green(this.color), blue(this.color), alpha);
        ellipse(this.x, this.y, size);
        
        // 繪製內圈（更亮的部分）
        fill(255, alpha * 0.7);
        ellipse(this.x, this.y, size * 0.6);
        
        // 繪製外圈光暈
        fill(red(this.color), green(this.color), blue(this.color), alpha * 0.3);
        ellipse(this.x, this.y, size * 1.3);
        
        pop();                                  // 恢復繪圖狀態
    }
}

// 添加重置遊戲函數
function resetGame() {
  player1 = new Fighter(windowWidth * 0.3, GROUND_Y, p1Sprites, player1Config, true);
  player2 = new Fighter(windowWidth * 0.7, GROUND_Y, p2Sprites, player2Config, false);
  bullets = [];
  explosions = [];
  loop();
}
