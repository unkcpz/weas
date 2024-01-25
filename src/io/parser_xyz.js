import { Atoms } from '../atoms.js';
import {elementAtomicNumbers } from '../atoms_data.js';

function parseXYZ(xyzString) {
    const lines = xyzString.trim().split('\n');

    if (lines.length < 3) {
        throw new Error('Invalid XYZ file format');
    }

    const atomCount = parseInt(lines[0].trim());
    if (isNaN(atomCount) || lines.length - 2 !== atomCount) {
        throw new Error('Invalid atom count in XYZ file');
    }

    // Create a data object to initialize Atoms
    const data = {
        species: {},
        positions: [],
        speciesArray: []
    };

    for (let i = 2; i < lines.length; i++) {
        const parts = lines[i].trim().split(/\s+/);
        if (parts.length !== 4) {
            continue; // Skip lines that don't have exactly 4 parts
        }

        const [element, x, y, z] = parts;

        // Update species data if it's a new element
        if (!data.species[element]) {
            // May need to map element symbols to atomic numbers
            data.species[element] = [element, elementAtomicNumbers[element]]; 
        }

        // Add species and position data
        data.speciesArray.push(element);
        data.positions.push([parseFloat(x), parseFloat(y), parseFloat(z)]);
    }

    if (data.positions.length !== atomCount) {
        throw new Error('Atom count mismatch in XYZ file');
    }

    let atoms = new Atoms(data);
    return atoms;
}

export { parseXYZ };
