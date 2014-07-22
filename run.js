var dgram = require('dgram');

var width = 3; //Width of map
var height = 3; //Height of map
var map = new Array(width); //Map
for (var i = 0; i < width; i++) { //Map (cont)
	map[i] = new Array(height);
	for (var j = 0; j < height; j++) {
		map[i][j] = 0;
	}
}

var playerx = 1; //Player x and y coordinates mapped to world, not map
var playery = 1;
var playerdir = 0; //Player direction
var topleftx = 0; //Reference to the x and y coordinates of the top-left of the display on the map
var toplefty = 0;

/*
 * Carve the passages in the map, making it a maze using recursive backtracking algorithm
 *
 * Having a 1, 2, 4, or 8 represents the available directions (West, East, North, South respectively)
 */
function carve_passages(cx, cy, grid) {
	var dir = [];
	for (var i = Math.floor(Math.random() * 4); dir.length < 4; i = Math.floor(Math.random() * 4)) {
		while (dir.indexOf(Math.pow(2, i)) > -1) {
			i++
			if (i >= 4) {
				i = 0;
			}
		}
		dir.push(Math.pow(2, i));
	}
	for (var i = 0; i < 4; i++) {
		var nx = 0;
		var ny = 0;
		if (dir[i] <= 2) {
			nx = (dir[i] < 2) ? -1 : 1;
		} else {
			ny = (dir[i] < 8) ? -1 : 1;
		}
		if ((!((cx + nx < 0) || (cx + nx > grid.length - 1) || (cy + ny < 0) || (cy + ny > grid[0].length - 1))) && grid[cx + nx][cy + ny] == 0) {
			grid[cx][cy] = grid[cx][cy] | dir[i]
			if (nx != 0) {
				grid[cx + nx][cy + ny] = grid[cx + nx][cy + ny] | (nx < 0) ? 2 : 1;
			} else {
				grid[cx + nx][cy + ny] = grid[cx + nx][cy + ny] | (ny < 0) ? 8 : 4;
			}
			carve_passages(cx + nx, cy + ny, grid);
		}
	}
}

carve_passages(0, 0, map);

var world = new Array(width * 2 + 1); //World which uses map, false representing wall, true representing available space
for (var i = 0; i < width * 2 + 1; i++) {
	world[i] = new Array(height * 2 + 1);
}

for (var i = 0; i < width; i++) {
	for (var j = 0; j < height; j++) {
		world[i * 2 + 1][j * 2 + 1] = true;
		if ((map[i][j] & 1) == 1) {
			world[i * 2][j * 2 + 1] = true;
		}
		if ((map[i][j] & 2) == 2) {
			world[i * 2 + 2][j * 2 + 1] = true;
		}
		if ((map[i][j] & 4) == 4) {
			world[i * 2 + 1][j * 2] = true;
		}
		if ((map[i][j] & 8) == 8) {
			world[i * 2 + 1][j * 2 + 2] = true;
		}
	}
}

/*
 * Display the current view on the Holiday lights.
 *
 * tlx = top-left-x coordinate of display
 * tly = top-left-y coordinate of display
 */
function send_to_holiday(tlx, tly, world) {
	var buf = new Buffer(160); //Buffer for data pertaining to Holiday lights, 160 bytes long
	for (var i = 0; i < 10; i++) { //First 10 bytes are ignored, useless
		buf.writeUInt8(0, i);
	}
	
	var x = 10; //Skipping first ten bytes of packet/buffer
	for (var i = tlx; i < tlx + 7; i++) { //Set the lights white if wall, blank if passageway for the visible area
		if ((i % 2 == 0) && (tly % 2 == 0)) {
			for (var j = tly; j < tly + 7; j++) {
				if (!world[i][j]) {
					buf.writeUInt8(255, x++);
					buf.writeUInt8(255, x++);
					buf.writeUInt8(255, x++);
				} else if ((i == playerx) && (j == playery)) {
					buf.writeUInt8(0, x++);
					buf.writeUInt8(255, x++);
					buf.writeUInt8(0, x++);
				} else {
					buf.writeUInt8(0, x++);
					buf.writeUInt8(0, x++);
					buf.writeUInt8(0, x++);
				}
			}	
		} else {
			for (var j = tly + 6; j >= tly; j--) {
				if (!world[i][j]) {
					buf.writeUInt8(255, x++);
					buf.writeUInt8(255, x++);
					buf.writeUInt8(255, x++);
				} else if ((i == playerx) && (j == playery)) {
					buf.writeUInt8(0, x++);
					buf.writeUInt8(255, x++);
					buf.writeUInt8(0, x++);
				} else {
					buf.writeUInt8(0, x++);
					buf.writeUInt8(0, x++);
					buf.writeUInt8(0, x++);
				}
			}
		}
	}
	
	var s = dgram.createSocket('udp4'); //Create UDP socket to send data over
	s.send(buf, 0, buf.length, 9988, "192.168.0.115", function(err, bytes) { //Send data about lights over UDP socket and then close
	  s.close();
	});
}

send_to_holiday(topleftx, toplefty, world)

setInterval(function() {
	if ((playerx == width * 2 - 1) && (playery == height * 2 - 1)) {
		playerx = 1;
		playery = 1;
		topleftx = 0;
		toplefty = 0;
		
		map = new Array(width); //Map
		for (var i = 0; i < width; i++) { //Map (cont)
			map[i] = new Array(height);
			for (var j = 0; j < height; j++) {
				map[i][j] = 0;
			}
		}
		carve_passages(0, 0, map);
		
		world = new Array(width * 2 + 1); //World which uses map, false representing wall, true representing available space
		for (var i = 0; i < width * 2 + 1; i++) {
			world[i] = new Array(height * 2 + 1);
		}
		
		for (var i = 0; i < width; i++) {
			for (var j = 0; j < height; j++) {
				world[i * 2 + 1][j * 2 + 1] = true;
				if ((map[i][j] & 1) == 1) {
					world[i * 2][j * 2 + 1] = true;
				}
				if ((map[i][j] & 2) == 2) {
					world[i * 2 + 2][j * 2 + 1] = true;
				}
				if ((map[i][j] & 4) == 4) {
					world[i * 2 + 1][j * 2] = true;
				}
				if ((map[i][j] & 8) == 8) {
					world[i * 2 + 1][j * 2 + 2] = true;
				}
			}
		}
	} else {
		var dir = [];
		if (world[playerx + 1][playery] == true) {
			dir.push(2);
		}
		if (world[playerx][playery + 1] == true) {
			dir.push(8);
		}
		if (world[playerx - 1][playery] == true) {
			dir.push(1);
		}
		if (world[playerx][playery - 1] == true) {
			dir.push(4);
		}
		if (playerdir == 0) {
			switch (dir[0]) {
				case 1:
					playerx--;
					playerdir = 1;
					break;
				case 2:
					playerx++;
					playerdir = 2;
					break;
				case 4:
					playery--;
					playerdir = 4;
					break;
				case 8:
					playery++;
					playerdir = 8;
					break;
			}
		} else {
			switch (playerdir) {
				case 1:
					if (dir.indexOf(4) > -1) {
						playery--
						playerdir = 4;
					} else if (dir.indexOf(1) > -1) {
						playerx--
						playerdir = 1;
					} else if (dir.indexOf(8) > -1) {
						playery++
						playerdir = 8;
					} else {
						playerx++;
						playerdir = 2;
					}
					break;
				case 2:
					if (dir.indexOf(8) > -1) {
						playery++
						playerdir = 8;
					} else if (dir.indexOf(2) > -1) {
						playerx++
						playerdir = 2;
					} else if (dir.indexOf(4) > -1) {
						playery--
						playerdir = 4;
					} else {
						playerx--;
						playerdir = 1;
					}
					break;
				case 4:
					if (dir.indexOf(2) > -1) {
						playerx++
						playerdir = 2;
					} else if (dir.indexOf(4) > -1) {
						playery--
						playerdir = 4;
					} else if (dir.indexOf(1) > -1) {
						playerx--
						playerdir = 1;
					} else {
						playery++;
						playerdir = 8;
					}
					break;
				case 8:
					if (dir.indexOf(1) > -1) {
						playerx--
						playerdir = 1;
					} else if (dir.indexOf(8) > -1) {
						playery++
						playerdir = 8;
					} else if (dir.indexOf(2) > -1) {
						playerx++
						playerdir = 2;
					} else {
						playery--;
						playerdir = 4;
					}
					break;
			}
		}
		
		topleftx = ((playerx < 3) || (playerx > width * 2 - 3)) ? topleftx : playerx - 3;
		toplefty = ((playery < 3) || (playery > height * 2 - 3)) ? toplefty : playery - 3;
	}
	send_to_holiday(topleftx, toplefty, world)
}, 1500);