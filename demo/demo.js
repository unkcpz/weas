import { Atoms, BlendJS, AtomsViewer} from '../src/index.js'; // Adjust the path as necessary

const viewerElement = document.getElementById('viewer');    
const data = {
    species: {"O":["O", 6], "H": ["H", 1]},
    cell: [10, 0, 0, 0, 10, 0, 0, 0, 10],
    positions: [[0, 0, 0], [0, 0, 1.0], [0, 1.0, 0]],
    speciesArray: ["O", "H", "H"],
};
const atoms = new Atoms(data);
const bjs = new BlendJS(viewerElement);
const avr = new AtomsViewer(bjs, atoms);
bjs.render();
