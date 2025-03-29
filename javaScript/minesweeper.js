import { fetchManager } from "./api.js"
import { Game, Cell } from "./game.js"

const CLOSE = 0,
    OPEN = 1,
    MARKED = 2;

class Minesweeper extends Game {

    constructor(name, fetchManager) {
        super(name);
        this.gameOver = false;
        this.initGame(fetchManager, fetchManager.gameTypes.Minesweeper);
    }

    resetGame() {
        super.resetGame();
        this.gameOver = false;
        this.correctCellList = [];
        this.cellList = [];
        this.canvasFather = document.getElementById("playminesweeper");
        this.initGame(fetchManager, fetchManager.gameTypes.Minesweeper);
    }

    initBoard() {
        
        //necesario para procesar las celdas
        this.width = this.data.width;
        this.height = this.data.height;

        //extraer coordenadas de la celda que debe aparecer abierta al inicio del juego.
        let initCoords = this.data.start;
        let index = initCoords.indexOf("-");
        this.startx = parseInt(initCoords.substring(0, index)) - 1; // posicion inicial desde 1 a width, restamos 1 para homogeneizar
        this.starty = parseInt(initCoords.substring(index + 1)) - 1;
        this.mines = this.data.mines;
        this.canvasFather = document.getElementById("playminesweeper");

    }

    generateGame() {
        let cellList = [];
        for (let col = 0; col < this.size; col++) {
            for (let row = 0; row < this.size; row++) {
                cellList.push(new Cell(
                    this.canvas, this.context,
                    this.boxSize, this.offset,
                    this.data.board[col][row],
                    col, row,
                    this.boxColor, this.textColor
                ));
            }
        }
        this.initBoard();
        return cellList;
    }

    getRow() {
        return this.selectedCell[0];
    }

    getCol() {
        return this.selectedCell[1];
    }

    setRow(row) {
        this.selectedCell[0] = row;
    }

    setCol(col) {
        this.selectedCell[1] = col;
    }

    //dibujar tablero completo en su estado actual
    renderGrid(first=true) {

        //si es el primer renderizado abrir la celda inicial
        if(first) {
            this.openCell(this.startx, this.starty);
        }
        
        this.context.font = "25px Arial";
        for (let cell of this.cellList) {

            //si la celda tiene bandera se considera aún cerrada
            if (cell.getState() == MARKED) {
                cell.render("F");
            } else {

                //y si no es bandera se dibuja solo caja si esta cerrada, o caja y contenido si ya abierta
                if (cell.getState() == CLOSE) {
                    cell.renderCell(); // dibujar solo la caja 
                } else {
                    cell.render(); // dibuja caja y contenido de celda
                }
            }

        }
    }

    //procesar pulsaciones de teclas
    updateInput(key) {
        // si el juego esta cargado y activo
        if (this.hasFinishCreatingGame && this.canvasFather.style.visibility != "hidden") {

            //mover cursor si es tecla de movimiento
            this.updateSelectedCell(key);

            //procesar resto de pulsaciones (teclas F y espacio)
            this.processKey(key);
        }
    }


    //mover cursor si es tecla de movimiento
    updateSelectedCell(key) {
        if (!this.gameOver) {
            let x = this.getCol();
            let y = this.getRow();
            this.setCellColor(y, x, this.boxColor);
            switch (key) {
                case "ArrowUp":
                    y--;
                    if (y < 0) {
                        y = this.size - 1;
                    }
                    break;
                case "ArrowDown":
                    y++;
                    if (y >= this.size) {
                        y = 0;
                    }
                    break;
                case "ArrowRight":
                    x++;
                    if (x >= this.size) {
                        x = 0;
                    }
                    break;
                case "ArrowLeft":
                    x--;
                    if (x < 0) {
                        x = this.size - 1;
                    }
                    break;
            }
            this.setCol(x);
            this.setRow(y);
            this.setCellColor(y, x, this.selectBoxColor);
            this.renderGrid(false);
        }
    }

    //procesar resto de pulsaciones (teclas F y espacio)   
    processKey(key) {
        if (!this.gameOver) {
            let x = this.getCol();
            let y = this.getRow();

            if (key == " ") {
                this.openCell(x, y);

            }

            if (key == "f" || key == "F") {
                this.switchCellMark(x, y);
                this.renderGrid(false);
            }
            this.calcWinGame();
        }
    }

    openCell(x, y) {
        let state = this.getCellState(y, x);
        let content = this.getCellText(y, x);

        //si la celda esta abierta, salir sin hacer nada
        if (state != OPEN) {

            //si la celda esta cerrada, comprobarla
            if (state == CLOSE) {

                //si no contiene mina, comprobarla
                if (content != "x") { 

                    //si contiene numero, abrir esa celda y salir
                    if (content != "o") { 
                        this.setCellState(y, x, this.OPEN); 
                    } else {

                        //si está vacia, revelar celdas adyacentes vacias
                        this.revealNeightborCells(x, y); 
                    }
                } else {

                    // si contiene mina, declarar juego acabado y revelar todas las minas
                    this.revealAllMines();
                    alert('¡Game Over! Has pisado una mina.');
                    this.gameOver = true;
                }
                this.renderGrid(false);
            }
        }
    }
    switchCellMark(x, y) {
        const state = this.getCellState(y, x);
        if (state == MARKED) {
            this.setCellState(y, x, CLOSE);
        } else {
            this.setCellState(y, x, MARKED);
        }
    }

    calcWinGame() {
        let totalOpen = 0;
        for (let x = 0; x < this.width; x++) {
            for (let y = 0; y < this.height; y++) {
                if (this.getCellState(x, y) == this.OPEN) {
                    totalOpen++;
                }
            }
        }
        if (this.mines + totalOpen == this.width * this.height) {
            this.gameOver = true;
            alert('¡You Win! Has abierto todas las celdas!.');
            this.revealAllMines();
        }
    }

    // Contar minas alrededor de una celda
    countMinesAround(col, row) {
        let mineCount = 0;

        //recorrer la cuadricula alrededor de row,col, incluida row,col
        for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {

                //calcula la fila y columna de la celda actual
                const y = row + dy;
                const x = col + dx;

                //comprobamos que no nos salimos del tablero y si es mina la contamos
                if (y >= 0 && y < this.height && x >= 0 && x < this.width && this.getCellText(y, x) == "x") {
                    mineCount++;
                }
            }
        }
        return mineCount;
    }

    revealAllMines() {
        for (let x = 0; x < this.width; x++) {
            for (let y = 0; y < this.height; y++) {
                if (this.getCellText(x, y) == "x") {
                    this.setCellState(x, y, this.OPEN);
                }
            }
        }
        this.renderGrid(false);
    }

    // Revelar celdas vacías o con numeros adyacentes a row,col
    // Ojo: row,col ya se ha mirado antes de llamar a esta funcion y ya sabemos que no tiene mina.
    revealNeightborCells(col, row) {
        for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {

                //calcula la fila y columna de la celda
                const y = row + dy;
                const x = col + dx;

                //Si celda esta fuera del tablero no la comprueba
                if (y >= 0 && y < this.height && x >= 0 && x < this.width) {
                    //mirar estado de la celda
                    const state = this.getCellState(y, x);

                    //si ya está abierta no la procesa
                    if (state === CLOSE) {

                        //sino, la abre 
                        this.setCellState(y, x, this.OPEN);

                        //Al ser abierta mirar si su cuadricula tiene alguna mina
                        //si la tiene no hace nada ya que el proposito de esta funcion es solo revelar las vacias
                        if (this.countMinesAround(x, y) === 0) {

                            //si la cuadricula no tiene mina, abrir recursivamente cada celda alrededor de ella 
                            this.revealNeightborCells(x, y);
                        }
                    }
                }
            }
        }
    }



}

let minesweeper = new Minesweeper("minesweeperCanvas", fetchManager);
document.addEventListener("keydown",
    function (kd) {
        minesweeper.updateInput(kd.key); //procesar pulsaciones de teclas
    });

export { minesweeper }



