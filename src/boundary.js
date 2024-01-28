import { Atoms } from "./atoms.js";
import { multiplyMatrixVector } from "./utils.js";

export function getBoundaryAtoms(atoms, boundaryList) {
    // create a new atoms with the boundary atoms
    const boundaryAtoms = new Atoms();
    boundaryAtoms.cell = atoms.cell;
    boundaryAtoms.species = atoms.species;
    const positions = boundaryList.map(offset => {
        // Get original position
        const originalPosition = atoms.positions[offset[0]];
    
        // Calculate matrix-vector product
        const cellOffset = multiplyMatrixVector(atoms.cell, [offset[1][0], offset[1][1], offset[1][2]]);
    
        // Add the original position and the cell offset
        return originalPosition.map((value, index) => value + cellOffset[index]);
    });
    boundaryAtoms.positions = positions;
    // change fractional positions to cartesian positions
    boundaryAtoms.speciesArray = boundaryList.map(offset => atoms.speciesArray[offset[0]]);
    boundaryAtoms.uuid = atoms.uuid;
    return boundaryAtoms;
}

export function searchBoundary(atoms, boundary = [[-0.01, 1.01], [-0.01, 1.01], [-0.01, 1.01]]) {
    const cell = atoms.cell;
    let positions = atoms.positions;
    let species = atoms.species; // Assuming species is a property of atoms

    if (typeof boundary === 'number') {
        boundary = [
            [-boundary, 1 + boundary],
            [-boundary, 1 + boundary],
            [-boundary, 1 + boundary]
        ];
    }

    boundary = boundary.map(pair => pair.map(Number));
    const f = boundary.map(pair => Math.floor(pair[0]));
    const c = boundary.map(pair => Math.ceil(pair[1]));
    const ib = [f, c.map((val, i) => val)];
    const M = ib[0].reduce((acc, val, i) => acc * (ib[1][i] - val), 1);

    // Assuming a function to solve matrix (similar to np.linalg.solve)
    positions = atoms.calculateFractionalCoordinates();
    const n = positions.length;
    let npositions = repeatPositions(positions, M - 1);
    let i0 = 0;

    let offsets = [];
    let speciesExtended = [];

    for (let m0 = ib[0][0]; m0 < ib[1][0]; m0++) {
        for (let m1 = ib[0][1]; m1 < ib[1][1]; m1++) {
            for (let m2 = ib[0][2]; m2 < ib[1][2]; m2++) {
                if (m0 === 0 && m1 === 0 && m2 === 0) {
                    continue;
                }
                let i1 = i0 + n;
                for (let i = i0; i < i1; i++) {
                    npositions[i] = npositions[i].map((val, idx) => val + (idx === 0 ? m0 : (idx === 1 ? m1 : m2)));
                    offsets.push([i % n, [m0, m1, m2]]);
                }
                speciesExtended = speciesExtended.concat(species);
                i0 = i1;
            }
        }
    }

    let ind1 = [];
    for (let i = 0; i < npositions.length; i++) {
        if (npositions[i][0] > boundary[0][0] && npositions[i][0] < boundary[0][1] &&
            npositions[i][1] > boundary[1][0] && npositions[i][1] < boundary[1][1] &&
            npositions[i][2] > boundary[2][0] && npositions[i][2] < boundary[2][1]) {
            ind1.push(i);
        }
    }

    let offsets_b = ind1.map(index => offsets[index]);
    return offsets_b;
}


function repeatPositions(positions, repeats) {
    let result = [];
    for (let i = 0; i < repeats; i++) {
        for (let j = 0; j < positions.length; j++) {
            result.push([...positions[j]]); // Clone the array to avoid modifying the original
        }
    }
    return result;
}
