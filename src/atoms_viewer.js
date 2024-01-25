import * as THREE from 'three';
import { CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer.js';
import { drawUnitCell, drawUnitCellVectors } from './cell.js';
import { drawBonds } from './bond.js';
import { drawAtoms } from './draw_atoms.js';
import { clearObjects } from './utils.js';
import {drawPolyhedra} from './polyhedra.js';
import { GUIManager } from './GUIManager.js';
import { EventHandlers } from './EventHandlers.js';

class AtomsViewer {
    constructor(tjs, atoms) {
        this.tjs = tjs;
        this.atoms = atoms;
        this.uuid = THREE.MathUtils.generateUUID();
        this.atoms.uuid = this.uuid;
        this.init();
    }

    init() {
        this.atomLabels = [];
        this.vizType = 1; // Default viz type
        // vizTypes has the same length of the atoms
        this.vizTypes = new Array(this.atoms.getAtomsCount()).fill(this.vizType);
        this.showCell = true; // Default show cell
        this.labelType = 'none'; // Default label type
        this.atomScale = 0.6; // Default atom scale
        this.bondRadius = 0.1; // Default bond radius
        this.colorType = 'CPK'
        //
        this.selectedAtoms = new Set(); // Store selected atoms
        this.selectedAtomMesh = new THREE.Group(); // Create a group for highlighted atoms
        this.tjs.scene.add(this.selectedAtomMesh); // Add it to the scene
        this.backgroundColor = '#ffffff'; // Default background color (white)

        // Initialize Three.js scene, camera, and renderer
        //
        this.selectedAtomSymbolElement = document.createElement('div');
        this.selectedAtomSymbolElement.id = 'selectedAtomSymbol';
        this.tjs.containerElement.appendChild(this.selectedAtomSymbolElement);
        // Initialize components
        this.guiManager = new GUIManager(this);
        this.eventHandlers = new EventHandlers(this);
        // this.visualization = new Visualization(this);
        this.drawModel()
    }

    updateVizType(vizType) {
        if (this.selectedAtoms.size > 0) {
            this.selectedAtoms.forEach((atomIndex) => {
                this.vizTypes[atomIndex] = parseInt(vizType);
            });
        } else {
            this.vizType = parseInt(vizType);
            this.vizTypes = new Array(this.atoms.getAtomsCount()).fill(this.vizType);
        }
        this.drawModel();
    }

    updateColorType(colorType) {
        this.colorType = colorType;
        this.drawModel();
    }

    drawModel() {
        this.dispose();
        if (this.showCell) {
            drawUnitCell(this.tjs.scene, this.atoms);
            drawUnitCellVectors(this.tjs.scene, this.atoms.cell, this.tjs.camera);
        }
        this.instancedMesh = drawAtoms(this.tjs.scene, this.atoms, 1, this.vizTypes, this.colorType);
        if ( this.vizType === 1 ){
            drawBonds(this.tjs.scene, this.atoms, this.bondRadius, this.vizTypes, this.colorType);
        }
        else if ( this.vizType === 2 ){
            drawBonds(this.tjs.scene, this.atoms, this.bondRadius, this.vizTypes, this.colorType);
            drawPolyhedra(this.tjs.scene, this.atoms, this.colorType);
        }
        else if ( this.vizType === 3 ){
            drawBonds(this.tjs.scene, this.atoms, this.bondRadius, this.vizTypes, this.colorType);
        }
    }

    dispose() {
        // Remove event listeners
        this.tjs.containerElement.removeEventListener('pointerdown', this.onMouseDown, false);
        this.tjs.containerElement.removeEventListener('pointerup', this.onMouseUp, false);
        this.tjs.containerElement.removeEventListener('click', this.onMouseClick, false);
        this.tjs.containerElement.removeEventListener('mousemove', this.onMouseMove, false);
        this.tjs.containerElement.removeEventListener('keydown', this.onKeyDown, false);
        // Remove the selected atom symbol element
        // this.tjs.containerElement.removeChild(this.selectedAtomSymbolElement);
        // Remove the selected atom mesh group
        // this.tjs.scene.remove(this.selectedAtomMesh);
        // Remove the atom labels
        this.atomLabels.forEach(label => this.tjs.scene.remove(label));
        // Remove the unit cell
        clearObjects(this.tjs.scene, this.uuid);
    }


    clearAtomLabel() {
        if (this.label) {
            this.label.element.textContent = '';
        }
    }

    clearHighlight() {
        // Remove highlighted atom meshes from the selectedAtomMesh group
        while (this.selectedAtomMesh.children.length > 0) {
            const child = this.selectedAtomMesh.children[0]; // Get the first child
            this.selectedAtomMesh.remove(child); // Remove the child from the group
        }
    }

    createAtomLabel(symbol, position, color = 'black', fontSize = '14px') {
        // Create or update the HTML element for displaying the symbol
        if (!this.selectedAtomSymbolElement) {
            this.selectedAtomSymbolElement = document.createElement('div');
            this.selectedAtomSymbolElement.id = 'selectedAtomSymbol';
            this.selectedAtomSymbolElement.style.position = 'absolute';
            this.selectedAtomSymbolElement.style.color = 'white'; // Customize styles as needed
            this.selectedAtomSymbolElement.style.pointerEvents = 'none'; // Prevent the symbol from blocking mouse interactions
            this.tjs.containerElement.appendChild(this.selectedAtomSymbolElement);
        }
        // Create a new CSS2DObject with the label content
        this.label = new CSS2DObject(this.selectedAtomSymbolElement);
        this.label.position.copy(position);
        this.label.element.textContent = symbol;


        // Optionally, can style the label using CSS
        this.label.element.style.color = color;
        // label.element.style.fontSize = '14px';

        // Add the label to the scene
        this.tjs.scene.add(this.label);
    }

    // Method to delete selected atoms
    deleteSelectedAtoms() {
        // Remove the selected atoms from the scene and data
        this.atoms.deleteAtoms(Array.from(this.selectedAtoms));
        // TODO: add vizTypes to Atoms's attributes
        // delete the properties, e.g. vizTypes, that are associated with the deleted atoms
        this.vizTypes = this.vizTypes.filter((_, index) => !this.selectedAtoms.has(index));
        // Clear the selection
        this.selectedAtoms.clear();

        // Update the visualization
        this.drawModel(this.vizType); // Reapply the visualization
        this.clearAtomLabel(); // Clear the atom label
        this.clearHighlight();
    }

    resetSelectedAtomsPositions(initialAtomPositions) {
        this.moveSelectedAtoms(initialAtomPositions, new THREE.Vector3(0, 0, 0));
    }

    moveSelectedAtoms(initialAtomPositions, movementVector) {
        // For example, translating a selected atom
        this.selectedAtoms.forEach((atomIndex) => {
            const initialPosition = initialAtomPositions.get(atomIndex);
            const newPosition = initialPosition.clone().add(movementVector);
            
            // Update the atom position
            const matrix = new THREE.Matrix4();
            this.instancedMesh.getMatrixAt(atomIndex, matrix);
            matrix.setPosition(newPosition);
            this.instancedMesh.setMatrixAt(atomIndex, matrix);
            this.atoms.positions[atomIndex] = [newPosition.x, newPosition.y, newPosition.z];
        });
    
        this.instancedMesh.instanceMatrix.needsUpdate = true;
    }

    rotateSelectedAtoms(initialAtomPositions, centroid, rotationMatrix) {
        this.selectedAtoms.forEach((atomIndex) => {
            const newPosition = initialAtomPositions.get(atomIndex).clone();
            // Translate to the centroid, apply rotation, then translate back
            const matrix = new THREE.Matrix4();
            this.instancedMesh.getMatrixAt(atomIndex, matrix);
            newPosition.sub(centroid) // Translate to centroid
                .applyMatrix4(rotationMatrix) // Apply rotation
                .add(centroid); // Translate back

            // Update the position
            matrix.setPosition(newPosition);
            this.instancedMesh.setMatrixAt(atomIndex, matrix);

            // Need to update the atoms.positions array
            this.atoms.positions[atomIndex] = [newPosition.x, newPosition.y, newPosition.z];
        });

        this.instancedMesh.instanceMatrix.needsUpdate = true;
    }
}

export { AtomsViewer };
