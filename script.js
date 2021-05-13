(function(global) {
	"use strict";

	// Helper utilities
	var util = {
		extend: function(src, props) {
			props = props || {};
			var p;
			for (p in src) {
				if (!props.hasOwnProperty(p)) {
					props[p] = src[p];
				}
			}
			return props;
		},
		each: function(a, b, c) {
			if ("[object Object]" === Object.prototype.toString.call(a)) {
				for (var d in a) {
					if (Object.prototype.hasOwnProperty.call(a, d)) {
						b.call(c, d, a[d], a);
					}
				}
			} else {
				for (var e = 0, f = a.length; e < f; e++) {
					b.call(c, e, a[e], a);
				}
			}
		},
		isNumber: function(n) {
			return !isNaN(parseFloat(n)) && isFinite(n);
		},
		includes: function(a, b) {
			return a.indexOf(b) > -1;
		},
	};

	/**
	 * Default configuration options. These can be overriden
	 * when loading a game instance.
	 * @property {Object}
	 */
	var defaultConfig = {
		// If set to true, the game will validate the numbers
		// as the player inserts them. If it is set to false,
		// validation will only happen at the end.
		validate_on_insert: true,

		// Set the difficult of the game.
		// This governs the amount of visible numbers
		// when starting a new game.
		difficulty: "normal"
	};

	/**
	 * Sudoku singleton engine
	 * @param {Object} config Configuration options
	 */
	function Game(config) {
		this.config = config;

		// Initialize game parameters
		this.cellMatrix = {};
		this.matrix = {};
		this.validation = {};

		this.values = [];

		this.resetValidationMatrices();

		return this;
	}
	/**
	 * Game engine prototype methods
	 * @property {Object}
	 */
	Game.prototype = {
		/**
		 * Build the game GUI
		 * @returns {HTMLTableElement} Table containing 4x4 input matrix
		 */
		buildGUI: function() {
			var td, tr;

			this.table = document.createElement("table");
			this.table.classList.add("sudoku-container");

			for (var i = 0; i < 4; i++) {
				tr = document.createElement("tr");
				this.cellMatrix[i] = {};

				for (var j = 0; j < 4; j++) {
					// Build the input
					this.cellMatrix[i][j] = document.createElement("input");
					this.cellMatrix[i][j].maxLength = 8;

					// Using dataset returns strings which means messing around parsing them later
					// Set custom properties instead
					this.cellMatrix[i][j].row = i;
					this.cellMatrix[i][j].col = j;

					this.cellMatrix[i][j].addEventListener("keyup", this.onKeyUp.bind(this));

					td = document.createElement("td");

					td.appendChild(this.cellMatrix[i][j]);

					// Calculate section ID
					var sectIDi = Math.floor(i / 2);
					var sectIDj = Math.floor(j / 2);
					// Set the design for different sections
					if ((sectIDi + sectIDj) % 2 === 0) {
						td.classList.add("sudoku-section-one");
					} else {
						td.classList.add("sudoku-section-two");
					}
					// Build the row
					tr.appendChild(td);
				}
				// Append to table
				this.table.appendChild(tr);
			}
			
			this.table.addEventListener("mousedown", this.onMouseDown.bind(this));

			// Return the GUI table
			return this.table;
		},

		/**
		 * Handle keyup events.
		 *
		 * @param {Event} e Keyup event
		 */
		onKeyUp: function(e) {
			var sectRow,
				sectCol,
				secIndex,
				val, row, col,
				isValid = true,
				input = e.currentTarget

			val = input.value.trim();
			
			row = input.row;
			col = input.col;

			// Reset board validation class
			this.table.classList.remove("valid-matrix");
			input.classList.remove("invalid");

			//if (!util.isNumber(val)) {
			//	input.value = ""; @TODO wyrazenie regularne
			//	return false;
			//}

			// Validate, but only if validate_on_insert is set to true
			if (this.config.validate_on_insert) {
				isValid = this.validateVector(val, row, col, this.matrix.row[row][col]);
				// Indicate error
				input.classList.toggle("invalid", !isValid);
			}

			//printTEMP
			for (let iter1 = 0; iter1 < 4; iter1++) for (let iter2 = 0; iter2 < 4; iter2++) {
			console.log("element on pos ",[iter1,iter2]," equals ",this.matrix.row[iter1][iter2]," ---- validation: ",this.validation.row[iter1],);
			}
			//printTEMP


			// Calculate section identifiers
			sectRow = Math.floor(row / 2);
			sectCol = Math.floor(col / 2);
			secIndex = row % 2 * 2 + col % 2;

			// Cache value in matrix
			console.log(val);
			console.log(this.parseKet(val));
			this.matrix.row[row][col] = val;
			this.matrix.col[col][row] = val;
			this.matrix.sect[sectRow][sectCol][secIndex] = val;
			// make all elements arrays
			let valPars = this.parseKet(val);
			if(valPars == undefined) valPars = [0,0,0,0];
			this.matrix.row[row][col] = valPars;
			this.matrix.col[col][row] = valPars;
			this.matrix.sect[sectRow][sectCol][secIndex] = valPars;
		},
		
		onMouseDown: function(e) {
			var t = e.target;
			
			if ( t.nodeName === "INPUT" && t.classList.contains("disabled") ) {
				e.preventDefault();
			}
		},

		/**
		 * Reset the board and the game parameters
		 */
		resetGame: function() {
			this.resetValidationMatrices();
			for (var row = 0; row < 4; row++) {
				for (var col = 0; col < 4; col++) {
					// Reset GUI inputs
					this.cellMatrix[row][col].value = "";
				}
			}

			var inputs = this.table.getElementsByTagName("input");

			util.each(inputs, function(i, input) {
				input.classList.remove("disabled");
				input.tabIndex = 1;
			});

			this.table.classList.remove("valid-matrix");
		},

		/**
		 * Reset and rebuild the validation matrices
		 */
		resetValidationMatrices: function() {
			this.matrix = {
				row: {},
				col: {},
				sect: {}
			};
			this.validation = {
				row: {},
				col: {},
				sect: {}
			};

			// Build the row/col matrix and validation arrays
			for (var i = 0; i < 4; i++) {
				this.matrix.row[i] = ["", "", "", ""];
				this.matrix.col[i] = ["", "", "", ""];
				this.validation.row[i] = [];
				this.validation.col[i] = [];
			}

			// Build the section matrix and validation arrays
			for (var row = 0; row < 2; row++) {
				this.matrix.sect[row] = [];
				this.validation.sect[row] = {};
				for (var col = 0; col < 2; col++) {
					this.matrix.sect[row][col] = ["", "", "", ""];
					this.validation.sect[row][col] = [];
				}
			}
		},

		/**
		 * Validate the current number that was inserted.
		 *
		 * @param {String} num The value that is inserted
		 * @param {Number} rowID The row the number belongs to
		 * @param {Number} colID The column the number belongs to
		 * @param {String} oldNum The previous value
		 * @returns {Boolean} Valid or invalid input
		 */
		validateNumber: function(num, rowID, colID, oldNum) {
			var isValid = true,
				// Section
				sectRow = Math.floor(rowID / 2),
				sectCol = Math.floor(colID / 2),
				row = this.validation.row[rowID],
				col = this.validation.col[colID],
				sect = this.validation.sect[sectRow][sectCol];

			// This is given as the matrix component (old value in
			// case of change to the input) in the case of on-insert
			// validation. However, in the solver, validating the
			// old number is unnecessary.
			oldNum = oldNum || "";

			// Remove oldNum from the validation matrices,
			// if it exists in them.
			if (util.includes(row, oldNum)) {
				row.splice(row.indexOf(oldNum), 1);
			}
			if (util.includes(col, oldNum)) {
				col.splice(col.indexOf(oldNum), 1);
			}
			if (util.includes(sect, oldNum)) {
				sect.splice(sect.indexOf(oldNum), 1);
			}
			// Skip if empty value

			if (num !== "") {
				// Validate value
				if (
					// Make sure value is within range
					Number(num) > 0 &&
					Number(num) <= 4
				) {
					// Check if it already exists in validation array
					if (
						util.includes(row, num) ||
						util.includes(col, num) ||
						util.includes(sect, num)
					) {
						isValid = false;
					} else {
						isValid = true;
					}
				}

				// Insert new value into validation array even if it isn't
				// valid. This is on purpose: If there are two numbers in the
				// same row/col/section and one is replaced, the other still
				// exists and should be reflected in the validation.
				// The validation will keep records of duplicates so it can
				// remove them safely when validating later changes.
				row.push(num);
				col.push(num);
				sect.push(num);
			}

			return isValid;
		},

		/**
		 * Validate the current vector that was inserted.
		 *
		 * @param {String} vector The value that is inserted
		 * @param {Number} rowID The row the number belongs to
		 * @param {Number} colID The column the number belongs to
		 * @param {String} oldVector The previous value
		 * @returns {Boolean} Valid or invalid input
		 */
		validateVector: function(vector, rowID, colID, oldVec) {
			var isValid = true,
				// Section
				sectRow = Math.floor(rowID / 2),
				sectCol = Math.floor(colID / 2),
				row = this.validation.row[rowID],
				col = this.validation.col[colID],
				sect = this.validation.sect[sectRow][sectCol];

			// This is given as the matrix component (old value in
			// case of change to the input) in the case of on-insert
			// validation. However, in the solver, validating the
			// old number is unnecessary.
			oldVec = oldVec || "";

			// Remove oldNum from the validation matrices,
			// if it exists in them.
			if (util.includes(row, oldVec)) {
				row.splice(row.indexOf(oldVec), 1);
			}
			if (util.includes(col, oldVec)) {
				col.splice(col.indexOf(oldVec), 1);
			}
			if (util.includes(sect, oldVec)) {
				sect.splice(sect.indexOf(oldVec), 1);
			}
			// Skip if empty value

			if (vector !== "") {
				// Validate value
				if (
					// Make sure value is within range
					true 
					//@TODO regex
				) {
					// Check if it already exists in validation array
					if (
						util.includes(row, vector) ||
						util.includes(col, vector) ||
						util.includes(sect, vector)
					) {
						isValid = false;
					} else {
						isValid = true;
					}
				}

				// Insert new value into validation array even if it isn't
				// valid. This is on purpose: If there are two vectors in the
				// same row/col/section and one is replaced, the other still
				// exists and should be reflected in the validation.
				// The validation will keep records of duplicates so it can
				// remove them safely when validating later changes.
				row.push(vector);
				col.push(vector);
				sect.push(vector);
			}

			return isValid;
		},

		/**
		 * Validate the entire matrix
		 * @returns {Boolean} Valid or invalid matrix
		 */
		validateMatrix: function() {
			var isValid, val, $element, hasError = false;

			// Go over entire board, and compare to the cached
			// validation arrays
			for (var row = 0; row < 4; row++) {
				for (var col = 0; col < 4; col++) {
					val = this.matrix.row[row][col];
					// Validate the value
					isValid = this.validateVector(val, row, col, val);
					this.cellMatrix[row][col].classList.toggle("invalid", !isValid);
					if (!isValid) {
						hasError = true;
					}
				}
			}
			return !hasError;
		},
	
		/**
		 * Finds a section number of a given
		 * element on position (row,col). Sections
		 * are enumerated in a clock-wise manner, 
		 * starting from left upper:
		 * 0,1
		 * 2,3
		 * 
		 * @param {Number} row Number of a row
		 * @param {Number} col Number of a column
		 * @returns {Number} Number of a section
		 */
		 secNumberIndex: function(row, col) {
			var sec;
			if(row < 2)
			{
				if(col < 2) sec = 0;
				else sec = 1;
			}
			else
			{
				if(col < 2) sec = 2;
				else sec = 3;
			}
			return sec;
		},

		/**
		 * Finds the position of an element (row,col)
		 * in its section
		 * @param {Number} row Number of a row
		 * @param {Number} col Number of a column
		 * @returns {Number} Position of the element in the section
		 */
		secPos: function(row, col) {
			var pos;
			if(row == 0 || row == 2)
			{
				if(col == 0 || col == 2) pos = 0; 
				else pos = 1;
			}
			else
			{
				if(col == 0 || col == 2) pos = 2; 
				else pos = 3;
			}
			return pos;
		},

		/**
		 * Validate the SudoQ grid with insertion of
		 * a vector in a position row, col
		 * 
		 * @param {Number} row Number of a row in which we insert
		 * @param {Number} col Number of a column in which we insert
		 * @param {Array} vec Vector which we insert
		 * @returns {Boolean} Valid or invalid input
		 */
		validate: function(row, col, vec) {
			var sec = this.secNumberIndex(row, col);
			// providing list of indices with exclusion of the element
			// we are checking
			const rowIndices = [0, 1, 2, 3];
			var index = rowIndices.indexOf(col); // all in row apart from the same col
			if (index > -1) rowIndices.splice(index, 1);
			const colIndices = [0, 1, 2, 3];
			index = colIndices.indexOf(row); // we need to check all apart from row
			if (index > -1) colIndices.splice(index, 1);
			const secIndices = [0, 1, 2, 3];
			index = secIndices.indexOf(this.secPos(row,col));
			if (index > -1) secIndices.splice(index, 1);
			// iterating over all possible indices and checking orthogonality
			for (var iter1 = 0; iter1 < 3; iter1++)	{
				index = rowIndices[iter1];
				if(!(this.orthogonal(vec,this.matrix.row[row][index]))) return false;
			}
			for (iter1 = 0; iter1 < 3; iter1++)	{
				index = colIndices[iter1];
				if(!(this.orthogonal(vec,this.matrix.col[col][index]))) return false;
			}
			for (iter1 = 0; iter1 < 3; iter1++)	 {
				index = secIndices[iter1];
				if(!(this.orthogonal(vec,this.matrix.sec[sec][index]))) return false;
			}
			return true;
		},

		/**
		 * Parsing expressions that user inserts
		 * @param {String} expression The value that is inserted
		 * @returns {String} output, i.e. vector in form of an array e.g. [0,1,-1,0]
		 */
		parseKet: function(expression) {
			var lexer = new Lexer;

			lexer.addRule(/\s+/, function () {
				/* skip whitespace */
			});

			lexer.addRule(/[1-4]/, function (lexeme) {
				return lexeme; // symbols
			});

			lexer.addRule(/[\(\+\-\*\/\)]/, function (lexeme) {
				return lexeme; // punctuation (i.e. "(", "+", "-", "*", "/", ")")
			});

			var term = {
				precedence: 1,
				associativity: "left"
			};

			var parser = new Parser({
				"+": term,
				"-": term,
			});

			function parse(input) {
				lexer.setInput(input);
				var tokens = [], token;
				while (token = lexer.lex()) {tokens.push(token);				
				}
				return parser.parse(tokens);
			}

			var stack = [];

			var context = {
				"1": [1,0,0,0],
				"2": [0,1,0,0],
				"3": [0,0,1,0],
				"4": [0,0,0,1]
			};

			var self = this;
			

			var operator = {
				"+": function (a, b) { return self.sum(a, b); },
				"-": function (a, b) { return self.subtract(a, b);},
			};
			var c = "";
			
			
			parse(expression).forEach(function (c) {
				switch (c) {
				case "+":
				case "-":
					var b = stack.pop();
					var a = stack.pop();
					stack.push(operator[c](a, b));
					break;
				default:
					stack.push(context[c]);
				}
			});

			var output = stack.pop();
			return output
		},

		/**
		 * Adding vectors
		 * @param {Array} v1 first vector
		 * @param {Array} v2 second vector
		 */
		sum: function(v1, v2) {
			let v = [0,0,0,0];
			if(v1==undefined) v1=[0,0,0,0]; //so that there are no errors when adding without first vec
			if(v2==undefined) v2=[0,0,0,0]; //so that there are no errors when adding without second vec
			v[0] = v1[0] + v2[0];
			v[1] = v1[1] + v2[1];
			v[2] = v1[2] + v2[2];
			v[3] = v1[3] + v2[3];
			return v;
		},
		/**
		 * Subtracting vectors
		 * @param {Array} v1 first vector
		 * @param {Array} v2 second vector
		 */
		subtract: function(v1, v2) {
			let v = [0,0,0,0];
			if(v1==undefined) v1=[0,0,0,0]; //so that there are no errors when adding without first vec
			if(v2==undefined) v2=[0,0,0,0]; //so that there are no errors when adding without second vec
			v[0] = v1[0] - v2[0];
			v[1] = v1[1] - v2[1];
			v[2] = v1[2] - v2[2];
			v[3] = v1[3] - v2[3];
			return v;
		},
		/**
		 * Veryfying whether two vectors are orthogonal
		 * @param {Array} v1 first vector
		 * @param {Array} v2 second vector
		 */
		orthogonal: function(v1,v2) {
			return 0 == v1[0]*v2[0] + v1[1]*v2[1] + v1[2]*v2[2] + v1[3]*v2[3];
		},
		/**
		 * A recursive 'backtrack' solver for the
		 * game. Algorithm is based on the StackOverflow answer
		 * http://stackoverflow.com/questions/18168503/recursively-solving-a-sudoku-puzzle-using-backtracking-theoretically
		 */
		solveGame: function(row, col, string) {
			var cval,
				sqRow,
				sqCol,
				nextSquare,
				legalValues,
				sectRow,
				sectCol,
				secIndex,
				gameResult;

			nextSquare = this.findClosestEmptySquare(row, col);
			if (!nextSquare) {
				// End of board
				return true;
			} else {
				sqRow = nextSquare.row;
				sqCol = nextSquare.col;
				legalValues = this.findLegalValuesForSquare(sqRow, sqCol);

				// Find the segment id
				sectRow = Math.floor(sqRow / 2);
				sectCol = Math.floor(sqCol / 2);
				secIndex = sqRow % 2 * 2 + sqCol % 2;

				// Try out legal values for this cell
				for (var i = 0; i < legalValues.length; i++) {
					cval = legalValues[i];
					// Update value in input
					nextSquare.value = string ? "" : cval;

					// Update in matrices
					this.matrix.row[sqRow][sqCol] = cval;
					this.matrix.col[sqCol][sqRow] = cval;
					this.matrix.sect[sectRow][sectCol][secIndex] = cval;

					// Recursively keep trying
					if (this.solveGame(sqRow, sqCol, string)) {
						return true;
					} else {
						// There was a problem, we should backtrack


						// Remove value from input
						this.cellMatrix[sqRow][sqCol].value = "";
						// Remove value from matrices
						this.matrix.row[sqRow][sqCol] = "";
						this.matrix.col[sqCol][sqRow] = "";
						this.matrix.sect[sectRow][sectCol][secIndex] = "";
					}
				}

				// If there was no success with any of the legal
				// numbers, call backtrack recursively backwards
				return false;
			}
		},

		/**
		 * Find closest empty square relative to the given cell.
		 *
		 * @param {Number} row Row id
		 * @param {Number} col Column id
		 * @returns {jQuery} Input element of the closest empty
		 *  square
		 */
		findClosestEmptySquare: function(row, col) {
			var walkingRow, walkingCol, found = false;
			for (var i = col + 4 * row; i < 16; i++) {
				walkingRow = Math.floor(i / 4);
				walkingCol = i % 4;
				if (this.matrix.row[walkingRow][walkingCol] === "") {
					found = true;
					return this.cellMatrix[walkingRow][walkingCol];
				}
			}
		},

		/**
		 * Find the available legal numbers for the square in the
		 * given row and column.
		 *
		 * @param {Number} row Row id
		 * @param {Number} col Column id
		 * @returns {Array} An array of available numbers
		 */
		findLegalValuesForSquare: function(row, col) {
			var temp,
				legalVals,
				legalNums,
				val,
				i,
				sectRow = Math.floor(row / 2),
				sectCol = Math.floor(col / 2);

			legalNums = [1, 2, 3, 4];

			// Check existing numbers in col
			for (i = 0; i < 4; i++) {
				val = Number(this.matrix.col[col][i]);
				if (val > 0) {
					// Remove from array
					if (util.includes(legalNums, val)) {
						legalNums.splice(legalNums.indexOf(val), 1);
					}
				}
			}

			// Check existing numbers in row
			for (i = 0; i < 4; i++) {
				val = Number(this.matrix.row[row][i]);
				if (val > 0) {
					// Remove from array
					if (util.includes(legalNums, val)) {
						legalNums.splice(legalNums.indexOf(val), 1);
					}
				}
			}

			// Check existing numbers in section
			sectRow = Math.floor(row / 2);
			sectCol = Math.floor(col / 2);
			for (i = 0; i < 4; i++) {
				val = Number(this.matrix.sect[sectRow][sectCol][i]);
				if (val > 0) {
					// Remove from array
					if (util.includes(legalNums, val)) {
						legalNums.splice(legalNums.indexOf(val), 1);
					}
				}
			}

			// Shuffling the resulting 'legalNums' array will
			// make sure the solver produces different answers
			// for the same scenario. Otherwise, 'legalNums'
			// will be chosen in sequence.
			for (i = legalNums.length - 1; i > 0; i--) {
				var rand = getRandomInt(0, i);
				temp = legalNums[i];
				legalNums[i] = legalNums[rand];
				legalNums[rand] = temp;
			}

			return legalNums;
		}
	};

	/**
	 * Get a random integer within a range
	 *
	 * @param {Number} min Minimum number
	 * @param {Number} max Maximum range
	 * @returns {Number} Random number within the range (Inclusive)
	 */
	function getRandomInt(min, max) {
		return Math.floor(Math.random() * (max + 1)) + min;
	}

	/**
	 * Get a number of random array items
	 *
	 * @param {Array} array The array to pick from
	 * @param {Number} count Number of items
	 * @returns {Array} Array of items
	 */
	function getUnique(array, count) {
		// Make a copy of the array
		var tmp = array.slice(array);
		var ret = [];

		for (var i = 0; i < count; i++) {
			var index = Math.floor(Math.random() * tmp.length);
			var removed = tmp.splice(index, 1);

			ret.push(removed[0]);
		}
		return ret;
	}

	function triggerEvent(el, type) {
		if ('createEvent' in document) {
			// modern browsers, IE9+
			var e = document.createEvent('HTMLEvents');
			e.initEvent(type, false, true);
			el.dispatchEvent(e);
		} else {
			// IE 8
			var e = document.createEventObject();
			e.eventType = type;
			el.fireEvent('on' + e.eventType, e);
		}
	}

	var Sudoku = function(container, settings) {
		this.container = container;

		if (typeof container === "string") {
			this.container = document.querySelector(container);
		}

		this.game = new Game(util.extend(defaultConfig, settings));

		this.container.appendChild(this.getGameBoard());
	};

	Sudoku.prototype = {
		/**
		 * Return a visual representation of the board
		 * @returns {jQuery} Game table
		 */
		getGameBoard: function() {
			return this.game.buildGUI();
		},

		newGame: function() {
			var that = this;
			this.reset();

			setTimeout(function() {
				that.start();
			}, 20);
		},

		/**
		 * Start a game.
		 */
		start: function() {
			var arr = [],
				x = 0,
				values,
				rows = this.game.matrix.row,
				inputs = this.game.table.getElementsByTagName("input"),
				difficulties = {
					"easy": 8,
					"normal": 7,
					"hard": 6,
				};

			// Solve the game to get the solution
			this.game.solveGame(0, 0);

			util.each(rows, function(i, row) {
				util.each(row, function(r, val) {
					arr.push({
						index: x,
						value: val
					});
					x++;
				});
			});

			// Get random values for the start of the game
			values = getUnique(arr, difficulties[this.game.config.difficulty]);

			// Reset the game
			this.reset();

			util.each(values, function(i, data) {
				var input = inputs[data.index];
				input.value = data.value;
				input.classList.add("disabled");
				input.tabIndex = -1;
				triggerEvent(input, 'keyup');
			});
		},

		/**
		 * Reset the game board.
		 */
		reset: function() {
			this.game.resetGame();
		},

		/**
		 * Call for a validation of the game board.
		 * @returns {Boolean} Whether the board is valid
		 */
		validate: function() {
			var isValid;

			isValid = this.game.validateMatrix();
			this.game.table.classList.toggle("valid-matrix", isValid);
		},

		/**
		 * Call for the solver routine to solve the current
		 * board.
		 */
		solve: function() {
			var isValid;
			// Make sure the board is valid first
			if (!this.game.validateMatrix()) {
				return false;
			}

			// Solve the game
			isValid = this.game.solveGame(0, 0);

			// Visual indication of whether the game was solved
			this.game.table.classList.toggle("valid-matrix", isValid);

			if (isValid) {
				var inputs = this.game.table.getElementsByTagName("input");

				util.each(inputs, function(i, input) {
					input.classList.add("disabled");
					input.tabIndex = -1;
				});
			}
		}
	};

	global.Sudoku = Sudoku;
})(this);

var game = new Sudoku(".container");

game.start();

// Controls

const container = document.querySelector(".sudoku-container");
const inputs = Array.from(document.querySelectorAll("input"));
container.addEventListener("click", e => {
	const el = e.target.closest("input");
	
	if ( el ) {
		inputs.forEach(input => {
			input.classList.toggle("highlight", input.value && input.value === el.value );
		});
	}
}, false);


document.getElementById("controls").addEventListener("click", function(e) {

	var t = e.target;

	if (t.nodeName.toLowerCase() === "button") {
		game[t.dataset.action]();
	}
});