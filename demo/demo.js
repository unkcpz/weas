import { Atoms, BlendJS, AtomsViewer, parseXYZ, parseCIF} from '../src/index.js'; // Adjust the path as necessary

async function fetchFile(filename) {
       const response = await fetch(`datas/${filename}`);
       if (!response.ok) {
           throw new Error(`Failed to load file for structure: ${filename}`);
       }
       return await response.text();
   }

const viewerElement = document.getElementById('viewer');    


document.getElementById('structure-selector').addEventListener('change', async (event) => {
       const filename = event.target.value;
       await drawAtoms(filename);
   });


async function drawAtoms(filename) {
       console.log(filename);
       viewerElement.innerHTML = '';
       const bjs = new BlendJS(viewerElement);
       const structureData = await fetchFile(filename);
       let atoms;
       if (filename.endsWith('.xyz')) {
              atoms = parseXYZ(structureData);
              atoms.cell = [[10, 0, 0], [0, 10, 0], [0, 0, 10]];
       } else if (filename.endsWith('.cif')) {
              atoms = parseCIF(structureData);
       }
       atoms = atoms.multiply(1, 1, 1); // Assuming this is necessary for your setup
       const avr = new AtomsViewer(bjs, atoms);
       avr.boundary = [[-0.05, 1.05], [-0.05, 1.05], [-0.05, 1.05]];
       // avr.boundary = [[-5, 6], [-5, 6], [-5, 6]];

       avr.drawModels();
       bjs.render();
}


drawAtoms("tio2.cif");