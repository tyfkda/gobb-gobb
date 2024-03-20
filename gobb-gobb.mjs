export const kLines = [  // [start row, start column, drow, dcol]
    [0, 0, 1, 0],
    [0, 1, 1, 0],
    [0, 2, 1, 0],
    [0, 0, 0, 1],
    [1, 0, 0, 1],
    [2, 0, 0, 1],
    [0, 0, 1, 1],
    [2, 0, -1, 1],
]

export class Gobblet {
    static WinOpponent = 'win-opponent'

    static cellPlayer(cell) {
        return (cell / 3) | 0
    }

    static cellSize(cell) {
        return cell % 3
    }

    constructor() {
        this.reset()
    }

    reset() {
        this.turn = 0
        this.gameEnded = false
        this.winner = -1
        this.board = [...Array(3)].map(() => [...Array(3)].map(() => []))
        this.freeUnits = [[2, 2, 2], [2, 2, 2]]
        this.winLine = -1
    }

    isGameEndned() {
        return this.gameEnded
    }

    canPut(turn, row, col, size, srcRow, srcCol) {
        if (turn !== this.turn)
            return false
        if ((srcRow < 0 || srcCol < 0) && this.freeUnits[turn][size] <= 0)
            return false
        const cells = this.board[row][col]
        if (cells.length === 0)
            return true

        const last = cells[cells.length - 1]
        return (last % 3) < size
    }

    put(turn, row, col, size, srcRow, srcCol) {
        if (!this.canPut(turn, row, col, size, srcRow, srcCol))
            return false
        if (srcRow >= 0 && srcCol >= 0) {
            const srcCells = this.board[srcRow][srcCol]
            if (srcCells.length === 0 || Gobblet.cellPlayer(srcCells[srcCells.length - 1]) !== turn ||
                Gobblet.cellSize(srcCells[srcCells.length - 1]) !== size)
                return false
            srcCells.pop()
        }
        if (this.checkWin())
            return Gobblet.WinOpponent

        const cells = this.board[row][col]
        cells.push(size + this.turn * 3)
        this.turn = 1 - this.turn
        this.checkWin()
        return true
    }

    checkWin() {
        for (let il = 0; il < kLines.length; ++il) {
            let [row, col, drow, dcol] = kLines[il]
            let c = this.getCell(row, col)
            if (c < 0)
                continue
            const pl = Gobblet.cellPlayer(c)
            let j
            for (j = 1; j < 3; ++j) {
                row += drow
                col += dcol
                c = this.getCell(row, col)
                if (c < 0 || Gobblet.cellPlayer(c) !== pl)
                    break
            }
            if (j >= 3) {
                this.gameEnded = true
                this.winner = pl
                this.winLine = il
                return true
            }
        }
        return false
    }

    getCell(row, col) {
        const cells = this.board[row][col]
        if (cells.length === 0)
            return -1
        return cells[cells.length - 1]
    }
}
