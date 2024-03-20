'use strict'

const kSizeTable = ['S', 'M', 'L']
const kInvSizeTable = {'S': 0, 'M': 1, 'L': 2}

const kLines = [  // [start row, start column, drow, dcol]
    [0, 0, 1, 0],
    [0, 1, 1, 0],
    [0, 2, 1, 0],
    [0, 0, 0, 1],
    [1, 0, 0, 1],
    [2, 0, 0, 1],
    [0, 0, 1, 1],
    [2, 0, -1, 1],
]

class Gobblet {
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
        this.winLine = -1
    }

    isGameEndned() {
        return this.gameEnded
    }

    canPut(turn, row, col, size) {
        if (turn !== this.turn)
            return false
        const cells = this.board[row][col]
        if (cells.length === 0)
            return true

        const last = cells[cells.length - 1]
        return (last % 3) < size
    }

    put(turn, row, col, size, srcRow, srcCol) {
        if (!this.canPut(turn, row, col, size))
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

const gridIds = [...Array(9)].map((_, i) => `grid${(i / 3) | 0}${i % 3}`)

function bindGridEvents(func) {
    function mouseEnterGrid(event) {
        func.call(this, event, true)
    }
    function mouseLeaveGrid(event) {
        func.call(this, event, false)
    }

    for (const gridId of gridIds) {
        const grid = document.getElementById(gridId)
        grid.addEventListener('mouseenter', mouseEnterGrid)
        grid.addEventListener('mouseleave', mouseLeaveGrid)
    }

    return () => {
        for (const gridId of gridIds) {
            const grid = document.getElementById(gridId)
            grid.removeEventListener('mouseenter', mouseEnterGrid)
            grid.removeEventListener('mouseleave', mouseLeaveGrid)
        }
    }
}

function findGrid(x, y) {
    for (const gridId of gridIds) {
        const grid = document.getElementById(gridId)
        const rect = grid.getBoundingClientRect()
        if (rect.left <= x && x < rect.right && rect.top <= y && y < rect.bottom)
            return grid
    }
    return null
}


function setUnitEventListeners(div, callbacks) {
    if (div.listeners != null) {
        for (const [type, listener] of div.listeners)
            div.removeEventListener(type, listener)
        div.listeners.length = 0
    }

    const mousedown = (event) => {
        switch (event.type) {
        case 'mousedown':
            if (event.button !== 0)
                return
            break
        case 'touchstart':
            if (event.touches.length !== 1)
                return
            break
        }
        if (!callbacks.canPick(div))
            return
        event.preventDefault()

        div.style.opacity = '0.5'
        callbacks.onDragStart()

        let target = null
        const cleanUp = bindGridEvents(function(_event, enter) {
            target = enter ? this : null
        })

        const mouseup = (event) => {
            document.removeEventListener('mouseup', mouseup)
            document.removeEventListener('touchend', mouseup)
            div.style.opacity = ''
            cleanUp()

            if (event.type === 'touchend') {
                if (event.changedTouches.length === 1) {
                    const touch = event.changedTouches[0]
                    target = findGrid(touch.pageX, touch.pageY)
                }
            }

            callbacks.onDropped(div, target)
        }
        document.addEventListener('mouseup', mouseup)
        document.addEventListener('touchend', mouseup)
    }
    div.addEventListener('mousedown', mousedown)
    div.addEventListener('touchstart', mousedown)
    if (div.listeners == null)
        div.listeners = []
    div.listeners.push(['mousedown', mousedown])
    div.listeners.push(['touchstart', mousedown])
}

class Grid {
    constructor(row, col, elem, div) {
        this.row = row
        this.col = col
        this.elem = elem
        this.div = div
        elem.dataset.row = row
        elem.dataset.col = col
        div.dataset.row = row
        div.dataset.col = col
    }

    setUnit(player, size, callbacks) {
        this.div.className = `cell p${player} unit${kSizeTable[size]}`
        this.div.dataset.player = player
        this.div.dataset.size = size
        this.div.dataset.row = this.row
        this.div.dataset.col = this.col
        setUnitEventListeners(this.div, callbacks)
    }

    clearUnit() {
        this.div.className = ''
        this.div.dataset.player = null
        this.div.dataset.size = null
    }
}

class DomApp {
    dragging = false

    constructor() {
        this.gg = new Gobblet()

        this.unitCallbacks = {
            canPick: (div) => {
                const player = parseInt(div.dataset.player)
                return !this.dragging && !this.gg.isGameEndned() && this.gg.turn === player
            },
            onDragStart: () => this.dragging = true,
            onDropped: this.onUnitDropped.bind(this),
        }

        window.addEventListener('touchstart', (event) => {
            event.preventDefault();
        }, {passive: false})

        this.initGrids()
    }

    setCallback(appCallbacks) {
        this.appCallbacks = appCallbacks
    }

    get turn() { return this.gg.turn }

    initGrids() {
        this.grids = []
        for (let i = 0; i < gridIds.length; ++i) {
            const elem = document.getElementById(gridIds[i])
            const div = document.createElement('div')
            elem.appendChild(div)

            const grid = new Grid((i / 3) | 0, i % 3, elem, div)
            this.grids.push(grid)
        }

        for (let player = 0; player < 2; ++player)
            this.createUnits(player)
    }

    createUnits(player) {
        const parent = document.getElementById(`p${player}units`)
        const sizeTable = ['40px', '60px', '80px']
        for (let i = 0; i < 3; ++i) {
            for (let j = 0; j < 2; ++j) {
                const div = this.createCellElement(player, i)
                const px = sizeTable[i]
                div.style.width = px
                div.style.height = px
                div.style.margin = '2px'
                div.style.display = 'inline-block'
                parent.appendChild(div)
            }
        }
    }

    createCellElement(player, size) {
        const div = document.createElement('div')
        div.className = `cell p${player}`
        div.dataset.player = player
        div.dataset.size = size
        div.dataset.free = true
        setUnitEventListeners(div, this.unitCallbacks)
        return div
    }

    onUnitDropped(div, target) {
        this.dragging = false
        if (target == null)
            return

        const dstRow = parseInt(target.dataset.row)
        const dstCol = parseInt(target.dataset.col)
        let srcRow = -1
        let srcCol = -1
        if (div.dataset.free !== 'true') {
            srcRow = parseInt(div.dataset.row)
            srcCol = parseInt(div.dataset.col)
            if (srcRow === dstRow && srcCol === dstCol) {
                // 元の位置に戻した場合
                return
            }
        }
        const player = parseInt(div.dataset.player)
        const size = parseInt(div.dataset.size)

        if (this.gg.canPut(player, dstRow, dstCol, size)) {
            if (this.gg.put(player, dstRow, dstCol, size, srcRow, srcCol) !== Gobblet.WinOpponent) {
                const dstGrid = this.grids[dstRow * 3 + dstCol]
                dstGrid.setUnit(player, size, this.unitCallbacks)
            }

            if (div.dataset.free === 'true') {
                // 手持ちのユニットを動かした場合：
                div.style.visibility = 'hidden'
            } else {
                // すでに盤面に置かれたユニットを動かした場合：
                const cell = this.gg.getCell(srcRow, srcCol)
                const srcGrid = this.grids[srcRow * 3 + srcCol]
                if (cell < 0) {
                    srcGrid.clearUnit()
                } else {
                    const pl = Gobblet.cellPlayer(cell)
                    const sz = Gobblet.cellSize(cell)
                    srcGrid.setUnit(pl, sz, this.unitCallbacks)
                }
            }
        } else {

        }
        if (this.gg.isGameEndned()) {
            this.appCallbacks.onGameEnded(this.gg.winner)
            this.#showWinLine()
        } else {
            this.appCallbacks.onMoved()
        }
    }

    #showWinLine() {
        let [row, col, drow, dcol] = kLines[this.gg.winLine]
        for (let i = 0; i < 3; ++i) {
            const grid = this.grids[row * 3 + col]
            grid.elem.classList.add('win')
            row += drow
            col += dcol
        }
    }
}

window.addEventListener('load', () => {
    function showTurn(turn) {
        const span = document.getElementById('turn')
        span.textContent = `${turn + 1}`
    }

    const app = new DomApp()
    app.setCallback({
        onMoved: () => {
            showTurn(app.turn)
        },
        onGameEnded: (winner) => {
            const div = document.getElementById('result')
            if (winner >= 0) {
                div.textContent = `プレイヤー ${winner + 1} の勝ち！`
            } else {
                div.textContent = '引き分け！'
            }
        },
    })
    showTurn(app.turn)
})
