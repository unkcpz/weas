// I can not use import * as math from "mathjs"
// it report error: Uncaught TypeError: Cannot set properties of undefined (setting 'math')
// import * as math from "mathjs"
import {elementAtomicNumbers} from "./atoms_data.js"
import {convertToMatrixFromABCAlphaBetaGamma, calculateInverseMatrix} from "./utils.js"

class Species {
    constructor(symbol, atomicNumber) {
        this.symbol = symbol;           // Symbol of the species (e.g., 'C', 'C_1' for carbon)
        this.atomicNumber = atomicNumber; // Atomic number of the species
    }
}

class Atom {
    constructor(species, position) {
        this.species = species; // Index of the species in the species array
        this.position = new Float32Array(position); // Position of the atom as a Float32Array
    }
}

class Atoms {
    constructor(data = null) {
        this.species = {};
        this.speciesArray = [];
        this.positions = [];
        this.cell = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
        this.pbc = [true, true, true];
        this.attributes = {"atom": {}, "species": {}};

        if (data) {
            this.initializeFromData(data);
        }
    }

    initializeFromData(data) {
        if (data.cell) {
            this.setCell(data.cell);
        }
        if (data.pbc) {
            this.setPBC(data.pbc);
        }
        if (data.species && typeof data.species === 'object') {
            // Iterate over each key-value pair in the species dictionary
            Object.entries(data.species).forEach(([symbol, data]) => {
                this.addSpecies(symbol, data[1]);
            });
        }
        if (data.speciesArray && data.positions) {
            for (let i = 0; i < data.speciesArray.length; i++) {
                const speciesIndex = data.speciesArray[i];
                const position = data.positions[i];
                this.addAtom(new Atom(speciesIndex, position));
            }
        }
        // Initialize other attributes if needed
    }

    new_attribute(name, values, domain='atom') {
        if (domain === 'atom') {
            // Ensure the length of values matches the number of atoms
            if (values.length !== this.positions.length) {
                throw new Error('The number of values does not match the number of atoms.');
            }
            this.attributes['atom'][name] = values;
        } else if (domain === 'species') {
            // Ensure that values are provided for each species
            for (const key of Object.keys(this.species)) {
                if (!(key in values)) {
                    throw new Error(`Value for species '${key}' is missing.`);
                }
            }
            this.attributes['species'][name] = values;
        } else {
            throw new Error('Invalid domain. Must be either "atom" or "species".');
        }
    }

    setCell(cell) {
        if (cell.length === 9) { // Convert 1x9 array into 3x3 matrix format
            this.cell = [[cell[0], cell[1], cell[2]], [cell[3], cell[4], cell[5]], [cell[6], cell[7], cell[8]]];
        } else if (cell.length === 6) { // 1x6 array [a, b, c, alpha, beta, gamma]
            this.cell = convertToMatrixFromABCAlphaBetaGamma(cell);
        } else if (cell.length === 3) { // 1x3 array [a, b, c], assuming 90-degree angles
            if (cell[0].length === 3) {
                this.cell = cell;
            } else {
                const [a, b, c] = cell;
                this.cell = convertToMatrixFromABCAlphaBetaGamma([a, b, c, 90, 90, 90]);
            }
        } else {
            throw new Error("Invalid cell dimensions provided. Expected 3x3 matrix, 1x6, or 1x3 array.");
        }
    }

    setPBC(pbc) {
        // Set periodic boundary conditions (e.g., [true, true, true])
        this.pbc = pbc;
    }

    addSpecies(symbol, atomicNumber=null) {
        // Create a new Species and add it to the species object
        if (!this.species[symbol]) {
            if (atomicNumber === null) {
                atomicNumber = elementAtomicNumbers[symbol];
            }
            if (atomicNumber === undefined) {
                throw new Error(`Atomic number for species ${symbol} is not defined.`);
            }
            this.species[symbol] = new Species(symbol, atomicNumber);
        }
    }

    addAtom(atom) {
        // Add an atom to the atoms
        if (!this.species[atom.species]) {
            throw new Error(`Species with index ${atom.species} not found.`);
        }
        this.positions.push(atom.position);
        this.speciesArray.push(atom.species);
    }

    removeAtom(index) {
        // Remove an atom from the atoms by its index
        this.positions.splice(index * 4, 4);
    }

    getSpeciesCount() {
        // Get the number of species in the atoms
        return this.species.length;
    }

    getAtomsCount() {
        // Get the number of atoms in the atoms
        return this.positions.length; // Each atom uses 4 values (species index + x, y, z)
    }

    // Overload the "+" operator to concatenate two Atoms objects
    add(otherAtoms) {
        const result = new Atoms();
        // Concatenate species
        result.species = {...this.species, ...otherAtoms.species};
        // Concatenate positions
        result.positions = [...this.positions, ...otherAtoms.positions];
        // Additional attributes can be handled here if needed
        return result;
    }

    // Overload the "+=" operator to concatenate another Atoms object
    addToSelf(otherAtoms) {
        // Concatenate species
        this.species = {...this.species, ...otherAtoms.species};
        // Concatenate positions
        this.positions = [...this.positions, ...otherAtoms.positions];
        this.speciesArray = [...this.speciesArray, ...otherAtoms.speciesArray];

        // Additional attributes can be handled here if needed
    }

    multiply(mx, my, mz) {
        const newAtoms = new Atoms();
        // Copy species object
        newAtoms.species = JSON.parse(JSON.stringify(this.species));

        // Update unit cell
        if (this.cell) {
            const [[ax, ay, az], [bx, by, bz], [cx, cy, cz]] = this.cell;
            newAtoms.setCell([
                ax * mx, ay * my, az * mz,
                bx * mx, by * my, bz * mz,
                cx * mx, cy * my, cz * mz
            ]);
        }

        // Replicate atoms
        for (let ix = 0; ix < mx; ix++) {
            for (let iy = 0; iy < my; iy++) {
                for (let iz = 0; iz < mz; iz++) {
                    for (let i = 0; i < this.getAtomsCount(); i++) {
                        const species = this.speciesArray[i];
                        const [x, y, z] = this.positions[i];

                        // Calculate new position considering the unit cell dimensions
                        const newX = x + ix * this.cell[0][0];
                        const newY = y + iy * this.cell[1][1];
                        const newZ = z + iz * this.cell[2][2];

                        // Add the new atom to the newAtoms
                        newAtoms.addAtom(new Atom(species, [newX, newY, newZ]));
                    }
                }
            }
        }

        // Return the new Atoms object
        return newAtoms;
    }

    translate(t) {
        for (let i = 0; i < this.positions.length; i++) {
            this.positions[i][0] += t[0]; // Shift x-coordinate
            this.positions[i][1] += t[1]; // Shift y-coordinate
            this.positions[i][2] += t[2]; // Shift z-coordinate
        }
    }

    rotate(axis, angle, rotate_cell = false) {
        const angleRad = (angle * Math.PI) / 180;
        const norm = Math.sqrt(axis[0] * axis[0] + axis[1] * axis[1] + axis[2] * axis[2]);
        const [u, v, w] = [axis[0] / norm, axis[1] / norm, axis[2] / norm]; // Normalized axis components

        // Rodrigues' rotation formula components
        const cosA = Math.cos(angleRad);
        const sinA = Math.sin(angleRad);
        const matrix = [
            cosA + u * u * (1 - cosA),         u * v * (1 - cosA) - w * sinA, u * w * (1 - cosA) + v * sinA,
            v * u * (1 - cosA) + w * sinA,     cosA + v * v * (1 - cosA),     v * w * (1 - cosA) - u * sinA,
            w * u * (1 - cosA) - v * sinA,     w * v * (1 - cosA) + u * sinA, cosA + w * w * (1 - cosA)
        ];

        for (let i = 0; i < this.positions.length; i++) {
            const [x, y, z] = this.positions[i];
            this.positions[i][0] = matrix[0] * x + matrix[1] * y + matrix[2] * z;
            this.positions[i][1] = matrix[3] * x + matrix[4] * y + matrix[5] * z;
            this.positions[i][2] = matrix[6] * x + matrix[7] * y + matrix[8] * z;
        }

        if (rotate_cell && this.cell) {
            const newCell = Array(3).fill(0).map(() => Array(3).fill(0));
            for (let i = 0; i < 3; i++) {
                for (let j = 0; j < 3; j++) {
                    newCell[i][j] = matrix[0 + j] * this.cell[i][0] + matrix[3 + j] * this.cell[i][1] + matrix[6 + j] * this.cell[i][2];
                }
            }
            this.cell = newCell;
        }
    }

    center(vacuum=null, axis=(0, 1, 2), about=null) {
        if (!this.cell) {
            throw new Error("Cell is not defined.");
        }

        // Calculate current center of mass or geometry
        let centerOfMass = [0, 0, 0];
        for (let i = 0; i < this.positions.length; i++) {
            centerOfMass[0] += this.positions[i][0];
            centerOfMass[1] += this.positions[i][1];
            centerOfMass[2] += this.positions[i][2];
        }
        centerOfMass = centerOfMass.map(x => x / this.positions.length);

        // Determine target center point
        let targetCenter = [0, 0, 0];
        if (about) {
            targetCenter = about;
        } else {
            for (let i = 0; i < 3; i++) {
                if (axis.includes(i)) {
                    targetCenter[i] = this.cell[i][i] / 2;
                }
            }
        }

        // Translate atoms to the target center
        const translationVector = targetCenter.map((x, i) => x - centerOfMass[i]);
        this.translate(...translationVector);

        // Adjust cell size if vacuum padding is specified
        if (vacuum !== null) {
            for (let i = 0; i < 3; i++) {
                if (axis.includes(i)) {
                    this.cell[i][i] += 2 * vacuum; // Increase the cell dimension
                }
            }
        }
    }

    deleteAtoms(indices) {
        // Sort the indices in descending order to avoid index shifting
        indices.sort((a, b) => b - a);

        for (const index of indices) {
            if (index >= 0 && index < this.positions.length) {
                this.positions.splice(index, 1); // Remove the atom's position data
                this.speciesArray.splice(index, 1); // Remove the atom's species index
            }
        }
    }
    replaceAtoms(indices, newSpeciesSymbol) {
        for (const index of indices) {
            if (index >= 0 && index < this.speciesArray.length) {
                // Replace the species of the atom at the specified index
                this.speciesArray[index] = this.species[newSpeciesSymbol].atomicNumber;
            }
        }
    }
    to_dict() {
        const dict = {
            species: {},
            positions: [],
            cell: Array.from(this.cell || []),
            pbc: Array.from(this.pbc),
            speciesArray: []
        };

        // Populate species dictionary
        for (const [symbol, specie] of Object.entries(this.species)) {
            dict.species[symbol] = [symbol, specie.atomicNumber];
        }

        // Populate positions and speciesArray
        for (let i = 0; i < this.positions.length; i++) {
            dict.positions.push(Array.from(this.positions[i]));
            dict.speciesArray.push(this.speciesArray[i]);
        }

        return dict;
    }
    // Function to calculate fractional coordinates
    calculateFractionalCoordinates() {
        if (!this.cell) {
            throw new Error("Cell matrix is not defined.");
        }

        const inverseCell = calculateInverseMatrix(this.cell);
        return this.positions.map(position => {
            const fracX = (inverseCell[0][0] * position[0] + inverseCell[0][1] * position[1] + inverseCell[0][2] * position[2]);
            const fracY = (inverseCell[1][0] * position[0] + inverseCell[1][1] * position[1] + inverseCell[1][2] * position[2]);
            const fracZ = (inverseCell[2][0] * position[0] + inverseCell[2][1] * position[1] + inverseCell[2][2] * position[2]);
            return [fracX, fracY, fracZ];
        });
    }
    
}



export { Species, Atom, Atoms };
