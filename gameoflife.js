
function next_iteration(matrix) {
    // Filling the next matrix with numbers
    let next_matrix = [];
    for (let i = 0; i < board_height; i++)
    {
	next_matrix.push(new Array(board_width).fill(0));
    }
    
    matrix.forEach(function (row, row_nr, mat) {
	let number_of_cols = row.length; 
	let number_of_rows = mat.length;
	let top_edge = row_nr === 0;
	let bottom_edge = row_nr === number_of_rows - 1;
	row.forEach(function (col, col_nr, columns) {
	    // Are we on the bottom edge
	    let left_edge = col_nr === 0;
	    let right_edge = col_nr === number_of_cols - 1;

	    let neighbors = 0;

	    // Definitely not repetitive at all, but it gets done eventually
	    if (!top_edge) {
		if (!left_edge) {
		    if (mat[row_nr - 1][col_nr - 1] === 1)
			++neighbors;
		}
		if (mat[row_nr - 1][col_nr] === 1)
		    ++neighbors;
		if (!right_edge) {
		    if (mat[row_nr - 1][col_nr + 1] === 1)
			++neighbors;
		}
	    }
	    if (!left_edge) {
		if (mat[row_nr][col_nr - 1] === 1)
		    ++neighbors;
	    }
	    if (!right_edge) {
		if (mat[row_nr][col_nr + 1] === 1)
		    ++neighbors;
	    }
	    if (!bottom_edge) {
		if (!left_edge) {
		    if (mat[row_nr + 1][col_nr - 1] === 1)
			++neighbors;
		}
		if (mat[row_nr + 1][col_nr] === 1)
		    ++neighbors;
		if (!right_edge) {
		    if (mat[row_nr + 1][col_nr + 1] === 1)
			++neighbors;
		}
	    }
	    
	    // if (neighbors != 0)
	    //   console.log(`row: ${row_nr}, col: ${col_nr}, neighbors ${neighbors}`);
	    
	    // Game rules go here
	    if (neighbors > 3 || neighbors < 2)
		next_matrix[row_nr][col_nr] = 0; // Overpopulated or underpopulated
	    else if (mat[row_nr][col_nr] === 0 && neighbors === 3) 
		next_matrix[row_nr][col_nr] = 1; // Newly populated cell
	    else if (mat[row_nr][col_nr] === 1)
		next_matrix[row_nr][col_nr] = 1; // Surviving cell
	    else
		next_matrix[row_nr][col_nr] = 0; // Does not meet the requirements
	    
			     
	});
    });

    return next_matrix;
}

// Fitting two two-dimensional arrays together, reversing the second one's rows
function board_fit_together(board1, board2) {
    let new_board = [];

    board1.forEach(function (row) {
	// Damn... what gives...
	new_board.push([...row]);
    });

    board2.forEach(function (row, row_nr) {
	let other_side = [...row].reverse();

	new_board[row_nr] = new_board[row_nr].concat(other_side);
    });

    return new_board;
}
// Yes, this does modify the board
function calculate_score_delta(board) {
    let player = 0;
    let opponent = 0;

    board.forEach(function (row) {
	if (row[0] === 1) {
	    ++opponent;
	    row[0] = 0;
	}
	if (row[row.length - 1] === 1) {
	    ++player;
	    row[row.length - 1] = 0;
	}
    });

    return {
	player,
	opponent
    };
}
