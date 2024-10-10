var telegramData = initTelegramWebApp();
const teleUser = telegramData.user;
if(teleUser !== null) {
	setMainButton('hello ' + teleUser.username);
}
userEl = document.getElementById('usr-info');
userEl.innerHTML = JSON.stringify(teleUser);

var game = new Phaser.Game(320, 505, Phaser.AUTO, 'game'); // Instantiate game
game.States = {}; // Store state objects


game.States.boot = function () {
	this.preload = function () {
		if (!game.device.desktop) { // Adapt to mobile devices
			this.scale.scaleMode = Phaser.ScaleManager.EXACT_FIT;
			this.scale.forcePortrait = true;
			this.scale.refresh();
		}
		game.load.image('loading', 'assets/preloader.gif');
	};
	this.create = function () {
		game.state.start('preload'); // Jump to resource loading page
	};
}

game.States.preload = function () {
	this.preload = function () {
		var preloadSprite = game.add.sprite(35, game.height / 2, 'loading'); // Create sprite to display loading progress
		game.load.setPreloadSprite(preloadSprite);
		// The following are the resources to be loaded
		game.load.image('background', 'assets/background.png'); // Background
		game.load.image('ground', 'assets/ground.png'); // Ground
		game.load.image('title', 'assets/title.png'); // Game title
		game.load.spritesheet('bird', 'assets/bird.png', 34, 24, 3); // Bird
		game.load.image('btn', 'assets/start-button.png');  // Button
		game.load.spritesheet('pipe', 'assets/pipes.png', 54, 320, 2); // Pipe
		game.load.bitmapFont('flappy_font', 'assets/fonts/flappyfont/flappyfont.png', 'assets/fonts/flappyfont/flappyfont.fnt');
		game.load.audio('fly_sound', 'assets/flap.wav'); // Flying sound effect
		game.load.audio('score_sound', 'assets/score.wav'); // Scoring sound effect
		game.load.audio('hit_pipe_sound', 'assets/pipe-hit.wav'); // Pipe collision sound effect
		game.load.audio('hit_ground_sound', 'assets/ouch.wav'); // Ground collision sound effect

		game.load.image('ready_text', 'assets/get-ready.png');
		game.load.image('play_tip', 'assets/instructions.png');
		game.load.image('game_over', 'assets/gameover.png');
		game.load.image('score_board', 'assets/scoreboard.png');
	}
	this.create = function () {
		game.state.start('menu');
	}
}

game.States.menu = function () {
	this.create = function () {
		game.add.tileSprite(0, 0, game.width, game.height, 'background').autoScroll(-10, 0); // Background image
		game.add.tileSprite(0, game.height - 112, game.width, 112, 'ground').autoScroll(-100, 0); // Ground
		var titleGroup = game.add.group(); // Create a group to store the title
		titleGroup.create(0, 0, 'title'); // Title
		var bird = titleGroup.create(190, 10, 'bird'); // Add bird to the group
		bird.animations.add('fly'); // Add animation
		bird.animations.play('fly', 12, true); // Play animation
		titleGroup.x = 35;
		titleGroup.y = 100;
		game.add.tween(titleGroup).to({ y: 120 }, 1000, null, true, 0, Number.MAX_VALUE, true); // Title tween animation
		var btn = game.add.button(game.width / 2, game.height / 2, 'btn', function () { // Start button
			game.state.start('play');
		});
		btn.anchor.setTo(0.5, 0.5);
	}
}

game.States.play = function () {
	this.create = function () {
		this.bg = game.add.tileSprite(0, 0, game.width, game.height, 'background'); // Background image
		this.pipeGroup = game.add.group();
		this.pipeGroup.enableBody = true;
		this.ground = game.add.tileSprite(0, game.height - 112, game.width, 112, 'ground'); // Ground
		this.bird = game.add.sprite(50, 150, 'bird'); // Bird
		this.bird.animations.add('fly');
		this.bird.animations.play('fly', 12, true);
		this.bird.anchor.setTo(0.5, 0.5);
		game.physics.enable(this.bird, Phaser.Physics.ARCADE); // Enable bird physics system
		this.bird.body.gravity.y = 0; // Bird gravity, not moving before the game starts
		game.physics.enable(this.ground, Phaser.Physics.ARCADE); // Ground
		this.ground.body.immovable = true; // Fixed

		this.soundFly = game.add.sound('fly_sound');
		this.soundScore = game.add.sound('score_sound');
		this.soundHitPipe = game.add.sound('hit_pipe_sound');
		this.soundHitGround = game.add.sound('hit_ground_sound');
		this.scoreText = game.add.bitmapText(game.world.centerX - 20, 30, 'flappy_font', '0', 36);

		this.readyText = game.add.image(game.width / 2, 40, 'ready_text'); // Get ready text
		this.playTip = game.add.image(game.width / 2, 300, 'play_tip'); // Click tip
		this.readyText.anchor.setTo(0.5, 0);
		this.playTip.anchor.setTo(0.5, 0);

		this.hasStarted = false; // Whether the game has started
		game.time.events.loop(900, this.generatePipes, this);
		game.time.events.stop(false);
		game.input.onDown.addOnce(this.startGame, this);
	};
	this.update = function () {
		if (!this.hasStarted) return; // Game not started
		game.physics.arcade.collide(this.bird, this.ground, this.hitGround, null, this); // Collision with ground
		game.physics.arcade.overlap(this.bird, this.pipeGroup, this.hitPipe, null, this); // Collision with pipe
		if (this.bird.angle < 90) this.bird.angle += 2.5; // Head down when falling
		this.pipeGroup.forEachExists(this.checkScore, this); // Score check and update
	}

	this.startGame = function () {
		this.gameSpeed = 400; // Game speed
		this.gameIsOver = false;
		this.hasHitGround = false;
		this.hasStarted = true;
		this.score = 0;
		this.bg.autoScroll(-(this.gameSpeed / 10), 0);
		this.ground.autoScroll(-this.gameSpeed, 0);
		this.bird.body.gravity.y = 1150; // Bird gravity
		this.readyText.destroy();
		this.playTip.destroy();
		game.input.onDown.add(this.fly, this);
		game.time.events.start();
	}

	this.stopGame = function () {
		this.bg.stopScroll();
		this.ground.stopScroll();
		this.pipeGroup.forEachExists(function (pipe) {
			pipe.body.velocity.x = 0;
		}, this);
		this.bird.animations.stop('fly', 0);
		game.input.onDown.remove(this.fly, this);
		game.time.events.stop(true);
	}

	this.fly = function () {
		this.bird.body.velocity.y = -350;
		game.add.tween(this.bird).to({ angle: -30 }, 100, null, true, 0, 0, false); // Head up when rising
		this.soundFly.play();
	}

	this.hitPipe = function () {
		if (this.gameIsOver) return;
		this.soundHitPipe.play();
		this.gameOver();
	}
	this.hitGround = function () {
		if (this.hasHitGround) return; // Already hit the ground
		this.hasHitGround = true;
		this.soundHitGround.play();
		this.gameOver(true);
	}
	this.gameOver = function (show_text) {
		this.gameIsOver = true;
		this.stopGame();
		if (show_text) this.showGameOverText();
	};

	this.showGameOverText = function () {
		this.scoreText.destroy();
		game.bestScore = game.bestScore || 0;
		if (this.score > game.bestScore) game.bestScore = this.score; // Best score
		this.gameOverGroup = game.add.group(); // Add a group
		var gameOverText = this.gameOverGroup.create(game.width / 2, 0, 'game_over'); // Game over text image
		var scoreboard = this.gameOverGroup.create(game.width / 2, 70, 'score_board'); // Scoreboard
		var currentScoreText = game.add.bitmapText(game.width / 2 + 60, 105, 'flappy_font', this.score + '', 20, this.gameOverGroup); // Current score
		var bestScoreText = game.add.bitmapText(game.width / 2 + 60, 153, 'flappy_font', game.bestScore + '', 20, this.gameOverGroup); // Best score
		var replayBtn = game.add.button(game.width / 2, 210, 'btn', function () { // Replay button
			game.state.start('play');
		}, this, null, null, null, null, this.gameOverGroup);
		gameOverText.anchor.setTo(0.5, 0);
		scoreboard.anchor.setTo(0.5, 0);
		replayBtn.anchor.setTo(0.5, 0);
		this.gameOverGroup.y = 30;
	}

	this.generatePipes = function (gap) { // Generate pipes
		gap = gap || 100; // Gap width between upper and lower pipes
		var position = (505 - 320 - gap) + Math.floor((505 - 112 - 30 - gap - 505 + 320 + gap) * Math.random());
		var topPipeY = position - 360;
		var bottomPipeY = position + gap;

		if (this.resetPipe(topPipeY, bottomPipeY)) return;

		var topPipe = game.add.sprite(game.width, topPipeY, 'pipe', 0, this.pipeGroup);
		var bottomPipe = game.add.sprite(game.width, bottomPipeY, 'pipe', 1, this.pipeGroup);
		this.pipeGroup.setAll('checkWorldBounds', true);
		this.pipeGroup.setAll('outOfBoundsKill', true);
		this.pipeGroup.setAll('body.velocity.x', -this.gameSpeed);
	}

	this.resetPipe = function (topPipeY, bottomPipeY) { // Reset pipes that are out of bounds for reuse
		var i = 0;
		this.pipeGroup.forEachDead(function (pipe) {
			if (pipe.y <= 0) { // topPipe
				pipe.reset(game.width, topPipeY);
				pipe.hasScored = false; // Reset to not scored
			} else {
				pipe.reset(game.width, bottomPipeY);
			}
			pipe.body.velocity.x = -this.gameSpeed;
			i++;
		}, this);
		return i == 2; // If i==2, it means a set of pipes is out of bounds and can be reused
	}

	this.checkScore = function (pipe) { // Responsible for score checking and updating
		if (!pipe.hasScored && pipe.y <= 0 && pipe.x <= this.bird.x - 17 - 54) {
			pipe.hasScored = true;
			this.scoreText.text = ++this.score;
			this.soundScore.play();
			return true;
		}
		return false;
	}
}

// Add states to the game
game.state.add('boot', game.States.boot);
game.state.add('preload', game.States.preload);
game.state.add('menu', game.States.menu);
game.state.add('play', game.States.play);
game.state.start('boot'); // Start the game
