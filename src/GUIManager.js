import { GUI } from 'dat.gui';
import { setupCameraGUI } from './camera.js'; // Assuming these are utility functions
import { createViewpointButtons } from './viewpoint.js';
import * as THREE from 'three';
import { covalentRadii } from './atoms_data.js';
import { drawAtomLabels } from './draw_label.js';

class GUIManager {
    constructor(viewer) {
        this.viewer = viewer;
        this.gui = new GUI();
        this.gui.closed = true;  // Set the GUI to be closed by default
        this.initGUI();
    }

    initGUI() {
        this.createGUIContainer();
        this.addAtomsControl();
        this.addColorControl();
        this.addCameraControls();
        this.addFullscreenButton();
    }

    createGUIContainer() {
        const guiContainer = document.createElement('div');
        guiContainer.style.position = 'absolute';
        guiContainer.style.top = '10px';
        guiContainer.style.left = '10px';
        this.viewer.tjs.containerElement.appendChild(guiContainer);
        guiContainer.appendChild(this.gui.domElement);
    }

    addAtomsControl() {
        const MODEL_TYPE_MAP = {
            'Ball': 0,
            'Ball + Stick': 1,
            'Polyhedra': 2,
            'Stick': 3,
        };

        const colorTypes = {
            'CPK': 'CPK',
            'VESTA': 'VESTA',
            'JMOL': 'JMOL'
        };

        const atomsFolder = this.gui.addFolder('Atoms');
        atomsFolder.add({ modelType: this.viewer.modelType }, 'modelType', MODEL_TYPE_MAP)
            .onChange(this.viewer.updateModelType.bind(this.viewer))
            .name("Model Style");
        atomsFolder.add({ colorType: this.viewer.colorType }, 'colorType', colorTypes)
            .onChange(this.viewer.updateColorType.bind(this.viewer))
            .name('Color Type');
        atomsFolder.add(this.viewer, 'labelType', ['None', 'Symbol', 'Index'])
            .onChange(this.updateLabels.bind(this))
            .name('Atom Label');
        atomsFolder.add(this.viewer, 'materialType', ['Standard', 'Phong', 'Basic'])
            .onChange(this.viewer.updateMaterialType.bind(this.viewer))
            .name('Material Type');
        atomsFolder.add(this.viewer, 'atomScale', 0.1, 2.0)
            .onChange(this.updateAtomScale.bind(this))
            .name('Atom Scale');
        // Add boundary field to GUI
        const boundaryFolder = atomsFolder.addFolder('Boundary');
        // Add fields for each boundary value
        boundaryFolder.add({ minX: this.viewer.boundary[0][0] }, 'minX', -10, 10)
            .onChange(newValue => this.updateBoundaryValue(0, 0, newValue))
            .name('Min X');
        boundaryFolder.add({ maxX: this.viewer.boundary[0][1] }, 'maxX', -10, 10)
            .onChange(newValue => this.updateBoundaryValue(0, 1, newValue))
            .name('Max X');
        boundaryFolder.add({ minY: this.viewer.boundary[1][0] }, 'minY', -10, 10)
            .onChange(newValue => this.updateBoundaryValue(1, 0, newValue))
            .name('Min Y');
        boundaryFolder.add({ maxY: this.viewer.boundary[1][1] }, 'maxY', -10, 10)
            .onChange(newValue => this.updateBoundaryValue(1, 1, newValue))
            .name('Max Y');
        boundaryFolder.add({ minZ: this.viewer.boundary[2][0] }, 'minZ', -10, 10)
            .onChange(newValue => this.updateBoundaryValue(2, 0, newValue))
            .name('Min Z');
        boundaryFolder.add({ maxZ: this.viewer.boundary[2][1] }, 'maxZ', -10, 10)
            .onChange(newValue => this.updateBoundaryValue(2, 1, newValue))
            .name('Max Z');
        
        
    }

    addColorControl() {
        const backgroundFolder = this.gui.addFolder('Color');
        backgroundFolder.addColor(this.viewer, 'backgroundColor')
            .onChange(color => {
                this.viewer.tjs.scene.background = new THREE.Color(color);
            })
            .name('Background');
    }

    addCameraControls() {
        createViewpointButtons(this.gui, this.viewer.tjs.camera);
        setupCameraGUI(this.gui, this.viewer.tjs.camera, this.viewer.tjs.scene);
    }

    addFullscreenButton() {
        const fullscreenButton = document.createElement('button');
        fullscreenButton.innerHTML = '<i class="fas fa-expand"></i>';
        fullscreenButton.style.position = 'absolute';
        fullscreenButton.style.right = '10px';
        fullscreenButton.style.top = '10px';
        fullscreenButton.style.zIndex = '1000';

        this.viewer.tjs.containerElement.appendChild(fullscreenButton);

        fullscreenButton.addEventListener('click', () => {
            if (!document.fullscreenElement) {
                this.viewer.tjs.containerElement.requestFullscreen().catch(err => {
                    alert(`Error attempting to enable full-screen mode: ${err.message} (${err.name})`);
                });
                fullscreenButton.innerHTML = '<i class="fas fa-compress"></i>';
            } else {
                document.exitFullscreen();
                fullscreenButton.innerHTML = '<i class="fas fa-expand"></i>';
            }
        });
    }

    // Method to update the scale of atoms
    updateAtomScale() {
        const position = new THREE.Vector3();
        const rotation = new THREE.Quaternion();
        const scale = new THREE.Vector3();

        let mesh = this.viewer.atomsMesh
        for (let i = 0; i < mesh.count; i++) {
            const instanceMatrix = new THREE.Matrix4();
            const radius = covalentRadii[this.viewer.atoms.speciesArray[i]] || 1;
            mesh.getMatrixAt(i, instanceMatrix); // Get the original matrix of the instance
            // Decompose the original matrix into its components
            instanceMatrix.decompose(position, rotation, scale);
            // Set the scale to the new value
            scale.set(radius*this.viewer.atomScale, radius*this.viewer.atomScale, radius*this.viewer.atomScale);
            // Recompose the matrix with the new scale
            instanceMatrix.compose(position, rotation, scale);
            mesh.setMatrixAt(i, instanceMatrix);
        }
        mesh.instanceMatrix.needsUpdate = true;
        // update the boundary atoms
        mesh = this.viewer.boundaryAtomsMesh
        for (let i = 0; i < mesh.count; i++) {
            const instanceMatrix = new THREE.Matrix4();
            const atomIndex = this.viewer.boundaryList[i][0];
            const radius = covalentRadii[this.viewer.atoms.speciesArray[atomIndex]] || 1;
            mesh.getMatrixAt(i, instanceMatrix); // Get the original matrix of the instance
            // Decompose the original matrix into its components
            instanceMatrix.decompose(position, rotation, scale);
            // Set the scale to the new value
            scale.set(radius*this.viewer.atomScale, radius*this.viewer.atomScale, radius*this.viewer.atomScale);
            // Recompose the matrix with the new scale
            instanceMatrix.compose(position, rotation, scale);
            mesh.setMatrixAt(i, instanceMatrix);
        }
        mesh.instanceMatrix.needsUpdate = true;
    }

    updateLabels(value) {
        // Handle the logic to draw labels based on the selected option
        if (value === 'None') {
            this.viewer.atomLabels = drawAtomLabels(this.viewer.tjs.scene, this.viewer.atoms, value, this.viewer.atomLabels);
            // Remove labels
        } else if (value === 'Symbol') {
            // Draw labels with symbols
            this.viewer.atomLabels = drawAtomLabels(this.viewer.tjs.scene, this.viewer.atoms, value, this.viewer.atomLabels);
        } else if (value === 'Index') {
            // Draw labels with indices
            this.viewer.atomLabels = drawAtomLabels(this.viewer.tjs.scene, this.viewer.atoms, value, this.viewer.atomLabels);
        }
    }
    // Function to update boundary values
    updateBoundaryValue (dimension, index, value) {
        this.viewer.boundary[dimension][index] = parseFloat(value);
        this.viewer.drawModels();
    };
}

export { GUIManager };
