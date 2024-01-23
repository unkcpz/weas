import { Atoms, BlendJS, AtomsViewer} from '../src/index.js'; // Adjust the path as necessary

const viewerElement = document.getElementById('viewer');    
const data = {'species': {'S': ['S', 16], 'O': ['O', 8], 'C': ['C', 6], 'H': ['H', 1]},
'cell': [5.0, 0.0, 0.0, 0.0, 5.0, 0.0, 0.0, 0.0, 5.0],
'positions': [[2.5000065, 2.8781305, 1.6472655],
       [2.5000245, 4.1470345, 2.4657275],
       [3.8395325, 1.8372705, 2.2666255],
       [1.1604565, 1.8373005, 2.2666265],
       [3.7558395, 1.7499075, 3.3527335],
       [0.2206005, 2.3323685, 2.0172345],
       [3.8044115, 0.8529655, 1.7933195],
       [4.7793995, 2.3323185, 2.0172345],
       [1.1955575, 0.8529945, 1.7933215],
       [1.2441475, 1.7499375, 3.3527345]],
'speciesArray': ['S', 'O', 'C', 'C', 'H', 'H', 'H', 'H', 'H', 'H']}
const atoms = new Atoms(data);
const bjs = new BlendJS(viewerElement);
const avr = new AtomsViewer(bjs, atoms);
bjs.render();
