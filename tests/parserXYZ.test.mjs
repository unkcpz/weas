import { parseXYZ } from '../src/io/parser_xyz.js';
import { Species } from '../src/atoms.js';

describe('parseXYZ', () => {
    it('parses valid XYZ data correctly', () => {
        const xyzString = `3
H2O molecule
O 0.000000 0.000000 0.000000
H 0.000000 0.000000 0.957200
H 0.000000 0.757160 0.482080
`;

        const atoms = parseXYZ(xyzString);

        expect(atoms).toBeDefined();
        expect(atoms.species).toHaveProperty('H');
        expect(atoms.species).toHaveProperty('O');
        expect(atoms.species['H']).toEqual(new Species('H', 1));
        expect(atoms.species['O']).toEqual(new Species('O', 8));
        expect(atoms.positions.length).toBe(3);
        expect(atoms.speciesArray).toEqual(['O', 'H', 'H']);
        console.log(atoms.positions);
        expect(atoms.positions[0]).toEqual(new Float32Array([0, 0, 0]));
        expect(atoms.positions[1]).toEqual(new Float32Array([0, 0, 0.957200]));
    });

    it('throws error for invalid XYZ format', () => {
        const invalidXYZString = `Not a valid XYZ file`;

        expect(() => {
            parseXYZ(invalidXYZString);
        }).toThrow('Invalid XYZ file format');
    });

});

