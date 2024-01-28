import { Atoms } from '../atoms.js';
import {convertToMatrixFromABCAlphaBetaGamma, multiplyMatrixVector} from '../utils.js';

export function parseCIF(cifString) {
    const lines = cifString.trim().split('\n');

    const data = {
        cell: [],
        species: {},
        positions: [],
        speciesArray: []
    };

    let readAtomSite = false;
    let alpha, beta, gamma;

    lines.forEach(line => {
        if (line.startsWith('_cell_length_a')) {
            data.cell[0] = parseFloat(line.split(/\s+/)[1]);
        } else if (line.startsWith('_cell_length_b')) {
            data.cell[1] = parseFloat(line.split(/\s+/)[1]);
        } else if (line.startsWith('_cell_length_c')) {
            data.cell[2] = parseFloat(line.split(/\s+/)[1]);
        } else if (line.startsWith('_cell_angle_alpha')) {
            data.cell[3] = parseFloat(line.split(/\s+/)[1]);
        } else if (line.startsWith('_cell_angle_beta')) {
            data.cell[4] = parseFloat(line.split(/\s+/)[1]);
        } else if (line.startsWith('_cell_angle_gamma')) {
            data.cell[5] = parseFloat(line.split(/\s+/)[1]);
        } else if (line.trim().startsWith('_atom_site_')) {
            readAtomSite = true;
        } else if (readAtomSite && line.trim() !== '') {
            const parts = line.trim().split(/\s+/);
            const element = parts[0];
            const position = parts.slice(3, 6).map(Number);

            if (!data.species[element]) {
                data.species[element] = [element, null]; // Atomic number is not provided in CIF
            }

            data.speciesArray.push(element);
            data.positions.push(position);
        }
    });
    data.cell = convertToMatrixFromABCAlphaBetaGamma(data.cell);
    // transform fractional coordinates to cartesian coordinates
    data.positions = data.positions.map(position => {
        return multiplyMatrixVector(data.cell, position);
    });
    let atoms = new Atoms(data);
    return atoms;
}