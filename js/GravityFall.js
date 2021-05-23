// makes a bit table with one "hollow" opening each row
function generateObstacles(difficulty) {

	const difficulties = [
		{ // easy
			rowsPerScreen: 1,
			columnsPerScreen: 3
		},
		{ // medium
			rowsPerScreen: 2,
			columnsPerScreen: 4
		},
		{ //hard
			rowsPerScreen: 3,
			columnsPerScreen: 5
		}
	]
	const diff = difficulties[difficulty]

	const obstacles = []
	for ( let i = 0; i < diff.rowsPerScreen; i++ ) {
		const row = []
		// add columns to row
		for ( let j = 0; j < diff.columnsPerScreen; j++ ) {
			row.push(false)
		}
		// pick a random column to make hollow
		row[Math.floor(Math.random() * row.length)] = true
		obstacles.push(row)
	}
	return obstacles
}

// turns the obstacle table into an actual table to insert into obstacle containers
function renderObstacles(difficulty) {
	const obstacles = generateObstacles(difficulty)

	// generate html
	let tableHTML = ''
	for ( const row of obstacles ) {
		tableHTML += '<div class="obstacleRow">'
		for ( const column of row ) {
			tableHTML += `<div ${column ? '' : 'class="obstacle"'}></div>`
		}
		tableHTML += '</div>'
	}
	return tableHTML
}

// gets positions of 2 elements on the screen and checks if they overlap (stole from stackOverflow)
function overlaps(a, b) {
	const rect1 = a.getBoundingClientRect();
	const rect2 = b.getBoundingClientRect();
	const isInHoriztonalBounds =
		rect1.x < rect2.x + rect2.width && rect1.x + rect1.width > rect2.x;
	const isInVerticalBounds =
		rect1.y < rect2.y + rect2.height && rect1.y + rect1.height > rect2.y;
	const isOverlapping = isInHoriztonalBounds && isInVerticalBounds;
	return isOverlapping;
}

function detectObstacleCollision() {
	runAnimation((time) => {
		// get all obstacle elements
		const obstacles = document.getElementsByClassName('obstacle')
		// get player
		const player = document.getElementById("player")

		// check if any obstacles collide with the player
		for ( const obstacle of obstacles ) {
			if ( overlaps(obstacle, player) ) {
				// remove obstacle
				obstacle.classList.remove('obstacle')
				obstacle.classList.add('collided')
				// decrease life
				hurtPlayer()
			}
		}
	})
}

// increase score each time a row of obstacles is passed
function detectScoreIncrease() {
	runAnimation((time) => {
		// get all obstacle elements
		const obstaclesRows = document.getElementsByClassName('obstacleRow')
		// get player
		const player = document.getElementById("player")

		// check obstacleRow collides with the player
		for ( const obstacleRow of obstaclesRows ) {
			// only count score increase once
			if ( !obstacleRow.classList.contains('counted') ) {
				if ( overlaps(obstacleRow, player) ) {
					obstacleRow.classList.add('counted')
					increaseScore()
				}
			}
		}
	})
}

// lives of player
let lives = 9
let hurtTimeout = false

function hurtPlayer() {
	// if player can be hurt
	if ( !hurtTimeout ) {
		//set invulnerable
		hurtTimeout = true
		lives -= 1 // decrease lives
		// update text
		document.getElementById("health").innerText = `${lives} ${lives > 1 ? "Lives" : "Life"} remaining`

		if ( lives <= 0 ) {
			endGame()
		}

		// wait 200ms between hurting player (prevents doubledamage from the same row but multiple obstacles at the same time)
		setTimeout(function () {
			hurtTimeout = false
		}, 200);
	}
}

// increase score
let score = 0

function increaseScore() {
	score += 10 // decrease lives
	// update text
	const scoreElements = document.getElementsByClassName("score")
	for ( const scoreElement of scoreElements ) {
		scoreElement.innerText = `${score} Score`
	}

	if ( lives <= 0 ) {
		endGame()
	}
}


let obstacleSpeed = 0.5 //arbitrary number
let obstacleSpeedMultiplier = 0.01 // by how much to increase speed each cycle
let posOffset = 0

function animateObstacles(obstacleContainers, difficulty) {
	// 2 obstacle containers are used for the animation
	// both boxes start moving up
	// [0] ↑
	// [1] ↑
	// once the top box is out of screen, it swaps places with bottom box and is re-filled with new obstacles
	// [0] ↷
	// [1] -
	runAnimation((time) => {
		// reset loop
		if ( posOffset >= 100 ) {
			posOffset = 0
			// increase falling speed
			obstacleSpeed += obstacleSpeedMultiplier
			// make new obstacles
			obstacleContainers.item(0).innerHTML = renderObstacles(difficulty)
			// swap boxes with obstacles
			obstacleContainers.item(1).parentNode.insertBefore(obstacleContainers.item(1), obstacleContainers.item(0).parentNode.firstChild)
			// reset offset
			for ( let obstacleBox of obstacleContainers ) {
				obstacleBox.style.top = 0
			}
		}
		// progress animation
		else {
			for ( let obstacleBox of obstacleContainers ) {
				obstacleBox.style.top = -posOffset + '%'
			}
			posOffset += obstacleSpeed
		}
	})
}

// get which keys are pressed
function trackKeys(keys) {
	let down = Object.create(null);

	function track(event) {
		// rename space key to Space
		let key = event.key
		if ( event.key == ' ' )
			key = 'Space'

		if ( keys.includes(key) ) {
			down[key] = event.type == "keydown";
			event.preventDefault();
		}
	}

	window.addEventListener("keydown", track);
	window.addEventListener("keyup", track);
	return down;
}

const playerCenter = 45
const playerSpeed = 20
const dashActiveSpeed = 2
let playerCenterOffset = 0
let playerFacing = false // [left/right(true)], used for dash

// update player each frame
function animatePlayer(keys, player) {

	runAnimation((time) => {
		// dash movement
		let dashSpeed = 1
		if ( keys?.Space ) {
			dashSpeed = dashActiveSpeed
		}

		// move left
		if ( keys?.ArrowLeft ) {
			playerFacing = false
			// move player left
			playerCenterOffset -= .1 * playerSpeed * dashSpeed
			// peg into bounds
			if ( playerCenterOffset <= -44 ) {
				playerCenterOffset = -44
			}
		}

		//move right
		if ( keys?.ArrowRight ) {
			playerFacing = true
			// move player left
			playerCenterOffset += .1 * playerSpeed * dashSpeed
			if ( playerCenterOffset >= 44 ) {
				playerCenterOffset = 44
			}
		}

		// position the player
		player.style.left = playerCenter + playerCenterOffset + '%'

		// apply facing direction
		if ( (playerFacing && !player.classList.contains('direction')) || !playerFacing && player.classList.contains('direction') ) {
			player.classList.toggle('direction')
		}
	})
}

function startGame(difficulty) {
	// The game loop

	// move background (obstacles)
	const obstacleContainers = document.getElementsByClassName("obstacles")
	animateObstacles(obstacleContainers, difficulty)

	// move player on button press
	const player = document.getElementById("player")
	const keys = trackKeys(["ArrowLeft", "ArrowRight", "Space"]);
	animatePlayer(keys, player)

	// counting score
	detectScoreIncrease()

	// game over detection
	detectObstacleCollision()
}

// animation loop thingy from the book
let gameIsNotOver = true

function runAnimation(frameFunc) {
	let lastTime = null;

	function frame(time) {
		if ( lastTime != null ) {
			let timeStep = Math.min(time - lastTime, 100) / 1000;
			if ( frameFunc(timeStep) === false ) return;
		}
		lastTime = time;
		if ( gameIsNotOver ) {
			requestAnimationFrame(frame)
		}
	}

	requestAnimationFrame(frame);
}

// show game over screen when lives reach 0
function endGame() {

	// stop animations
	gameIsNotOver = false

	// hide game interface
	const gameInterface = document.getElementById('gameInterface')
	gameInterface.classList.add('hidden')

	// show game over screen
	const endGameScreen = document.getElementById('endGameScreen')
	endGameScreen.classList.remove('hidden')
}

// choose difficulty from url or default to medium
const queryString = window.location.search;
const urlParams = new URLSearchParams(queryString);
const difficulty = urlParams.get('difficulty')

function restartGame() {
	lives = 9
	score = 0
	gameIsNotOver = true

	// reset game over screen
	const endGameScreen = document.getElementById('endGameScreen')
	endGameScreen.classList.add('hidden')

	// show game interface
	const gameInterface = document.getElementById('gameInterface')
	gameInterface.classList.remove('hidden')

	// empty obstacles
	const obstacleContainers = document.getElementsByClassName("obstacles")
	for ( const obstacleContainer of obstacleContainers ) {
		obstacleContainer.innerHTML = ""
	}

	// update score text
	const scoreElements = document.getElementsByClassName("score")
	for ( const scoreElement of scoreElements ) {
		scoreElement.innerText = `${score} Score`
	}

	// update lives text
	document.getElementById("health").innerText = `9 Lives`

	// start the game
	startGame(difficulty ? difficulty : 1)
}

function game() {
	// start game on button click
	const startButton = document.getElementById("startGame")
	startButton.addEventListener("click", () => {
		playGame()
	})


	const restartButton = document.getElementById("restartGame")
	restartButton.addEventListener("click", () => {
		restartGame()
	})


	// launches the game
	function playGame() {
		// hide start game screen
		const startGameScreen = document.getElementById('startGameScreen')
		startGameScreen.classList.add('hidden')

		// show game interface
		const gameInterface = document.getElementById('gameInterface')
		gameInterface.classList.remove('hidden')


		// start the game
		startGame(difficulty ? difficulty : 1)
	}
}

// wait for the DOM to load
document.addEventListener("DOMContentLoaded", function () {
	game()
})
