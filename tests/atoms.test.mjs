import { Species, Atom, Atoms } from '../src/atoms.js';

describe('Species class', () => {
  it('creates a new Species instance correctly', () => {
    const species = new Species('C', 6);
    expect(species.symbol).toBe('C');
    expect(species.atomicNumber).toBe(6);
  });
});

describe('Atom class', () => {
  it('creates a new Atom instance correctly', () => {
    const speciesIndex = 1; // Assuming this refers to an existing species
    const position = [1.0, 2.0, 3.0];
    const atom = new Atom(speciesIndex, position);
    expect(atom.species).toBe(speciesIndex);
    expect(atom.position).toEqual(new Float32Array(position));
  });
});

describe('Atoms class', () => {
  let atoms;

  beforeEach(() => {
    atoms = new Atoms();
  });

  it('initializes an empty Atoms instance', () => {
    expect(atoms.species).toEqual({});
    expect(atoms.speciesArray).toEqual([]);
    expect(atoms.positions).toEqual([]);
    expect(atoms.cell).toBeNull();
    expect(atoms.pbc).toEqual([true, true, true]);
  });

  it('adds a species correctly', () => {
    atoms.addSpecies('H', 1);
    expect(atoms.species).toHaveProperty('H');
    expect(atoms.species['H']).toEqual(new Species('H', 1));
  });

  it('throws an error when adding an atom with an unknown species', () => {
    const speciesIndex = 'Unknown'; // This species does not exist in the atoms instance
    const position = [1.0, 2.0, 3.0];
    expect(() => {
      atoms.addAtom(new Atom(speciesIndex, position));
    }).toThrowError(`Species with index ${speciesIndex} not found.`);
  });

  // Add more tests for other methods like setCell, addAtom, removeAtom, etc.
});

