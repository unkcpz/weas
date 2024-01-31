Atoms
=========
The Atoms object is the primary object used to represent a collection of atoms. It is used to store the positions, species, and other properties of the atoms.


Example:

.. code-block:: javascript

    const myAtoms = new Atoms({
        cell: [[10, 0, 0], [0, 10, 0], [0, 0, 10]], // Defining a cubic unit cell
        pbc: [true, true, true], // Periodic boundary conditions in all directions
        species: {'H': 1, 'O': 8}, // Species dictionary
        speciesArray: ['O', 'H', 'H'], // Array linking atoms to species
        positions: [[5, 5, 5], [6, 5, 5], [4, 5, 5]] // Positions of the atoms
    });

In this example, an Atoms object is created to represent a water molecule within a cubic unit cell with periodic boundaries. The object includes definitions for the species, their positions, and the simulation cell.

