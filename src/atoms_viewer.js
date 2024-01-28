import * as THREE from 'three';
import { CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer.js';
import { drawUnitCell, drawUnitCellVectors } from './cell.js';
import { calculateBonds, drawBonds } from './bond.js';
import { drawAtoms } from './draw_atoms.js';
import { clearObjects, multiplyMatrixVector } from './utils.js';
import { createBondMapping, filterBondMap, drawPolyhedra} from './polyhedra.js';
import { GUIManager } from './GUIManager.js';
import { EventHandlers } from './EventHandlers.js';
import { getBoundaryAtoms, searchBoundary, createBoundaryMapping } from './boundary.js';
import {elementsWithPolyhedra } from './atoms_data.js';

class AtomsViewer {
    constructor(tjs, atoms) {
        this.tjs = tjs;
        this.atoms = atoms;
        this.uuid = THREE.MathUtils.generateUUID();
        this.atoms.uuid = this.uuid;
        this.boundaryList = null;
        this.models = {};
        this.init();
    }

    init() {
        this.atomLabels = [];
        this.modelType = 1; // Default viz type
        this.boundary = [[0., 1.], [0., 1.], [0., 1.]];
        // modelTypes has the same length of the atoms
        this.modelTypes = new Array(this.atoms.getAtomsCount()).fill(this.modelType);
        this.showCell = true; // Default show cell
        this.labelType = 'None'; // Default label type
        this.atomScale = 0.4; // Default atom scale
        this.bondRadius = 0.1; // Default bond radius
        this.colorType = 'CPK'
        this.materialType = 'Standard'
        //
        this.models = {"Ball": {"indices": new Array(this.atoms.getAtomsCount()).fill(1),
                                "scales": new Array(this.atoms.getAtomsCount()).fill(1)},
                       "Stick": {"indices": new Array(this.atoms.getAtomsCount()).fill(1)},
                        "Polyhedra": {"indices": new Array(this.atoms.getAtomsCount()).fill(0)},
                        };
        this.selectedAtoms = new Set(); // Store selected atoms
        this.selectedAtomsMesh = new THREE.Group(); // Create a group for highlighted atoms
        this.tjs.scene.add(this.selectedAtomsMesh); // Add it to the scene
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
        this.updateModelType(this.modelType);
    }

    updateAtoms(atoms) {
        this.atoms = atoms;
        this.atoms.uuid = this.uuid;
        this.modelTypes = new Array(this.atoms.getAtomsCount()).fill(this.modelType);
        this.drawModels();
    }

    updateModelType(modelType) {
        console.log("updateModelType: ", modelType)
        modelType = parseInt(modelType);
        if (this.selectedAtoms.size > 0) {
            if (modelType === 0) {
                console.log("modelType: ", modelType)
                this.selectedAtoms.forEach((atomIndex) => {
                    this.models["Ball"]["indices"][atomIndex] = 1;
                    this.models["Ball"]["scales"][atomIndex] = 1;
                    this.models["Stick"]["indices"][atomIndex] = 0;
                    this.models["Polyhedra"]["indices"][atomIndex] = 0;
                });
            } else if (modelType === 1) {
                this.selectedAtoms.forEach((atomIndex) => {
                    this.models["Ball"]["indices"][atomIndex] = 1;
                    this.models["Ball"]["scales"][atomIndex] = 0.4;
                    this.models["Stick"]["indices"][atomIndex] = 1;
                    this.models["Polyhedra"]["indices"][atomIndex] = 0;
                });
            } else if (modelType === 2) {
                this.selectedAtoms.forEach((atomIndex) => {
                    this.models["Ball"]["indices"][atomIndex] = 1;
                    this.models["Ball"]["scales"][atomIndex] = 0.4;
                    this.models["Stick"]["indices"][atomIndex] = 1;
                    this.models["Polyhedra"]["indices"][atomIndex] = 1;
                });
            } else if (modelType === 3) {
                this.selectedAtoms.forEach((atomIndex) => {
                    this.models["Ball"]["indices"][atomIndex] = 0;
                    this.models["Stick"]["indices"][atomIndex] = 1;
                    this.models["Polyhedra"]["indices"][atomIndex] = 0;
                });
            }
        } else {
            this.modelType = parseInt(modelType);
            // clear this.models
            this.models["Ball"]["indices"] = new Array(this.atoms.getAtomsCount()).fill(0);
            this.models["Stick"]["indices"] = new Array(this.atoms.getAtomsCount()).fill(0);
            this.models["Polyhedra"]["indices"] = new Array(this.atoms.getAtomsCount()).fill(0);
            if (this.modelType === 0) {
                this.models["Ball"]["indices"] = new Array(this.atoms.getAtomsCount()).fill(1);
                this.models["Ball"]["scales"] = new Array(this.atoms.getAtomsCount()).fill(1);
            } else if (this.modelType === 1) {
                this.models["Ball"]["indices"] = new Array(this.atoms.getAtomsCount()).fill(1);
                this.models["Ball"]["scales"] = new Array(this.atoms.getAtomsCount()).fill(0.4);
                this.models["Stick"]["indices"] = new Array(this.atoms.getAtomsCount()).fill(1);
            } else if (this.modelType === 2) {
                this.models["Ball"]["indices"] = new Array(this.atoms.getAtomsCount()).fill(1);
                this.models["Ball"]["scales"] = new Array(this.atoms.getAtomsCount()).fill(0.4);
                this.models["Stick"]["indices"] = new Array(this.atoms.getAtomsCount()).fill(1);
                this.models["Polyhedra"]["indices"] = new Array(this.atoms.getAtomsCount()).fill(1);
            } else if (this.modelType === 3) {
                this.models["Stick"]["indices"] = new Array(this.atoms.getAtomsCount()).fill(1);
            }
        }
        this.drawModels();
    }

    updateColorType(colorType) {
        this.colorType = colorType;
        this.drawModels();
    }

    updateMaterialType(materialType) {
        this.materialType = materialType;
        this.drawModels();
    }

    drawModels() {
        console.log("-----------------drawModels-----------------")
        this.dispose();
        if (this.showCell && this.atoms.cell) {
            drawUnitCell(this.tjs.scene, this.atoms);
            drawUnitCellVectors(this.tjs.scene, this.atoms.cell, this.tjs.camera);
        }
        // find boundary atoms
        this.boundaryList = searchBoundary(this.atoms, this.boundary);
        this.boundaryMap = createBoundaryMapping(this.boundaryList);
        console.log("boundaryList: ", this.boundaryList)
        console.log("boundaryMap: ", this.boundaryMap)
        this.drawBalls();
        this.drawStick();
        this.drawPolyhedra();
    }

    drawBalls() {
        // draw atoms
        this.atomsMesh = drawAtoms(this.tjs.scene, this.atoms, 1, this.models["Ball"], this.colorType, this.materialType);
        // if boundaryList length > 0, draw boundary atoms
        if (this.boundaryList.length > 0) {
            // draw boundary atoms
            const boundaryAtoms = getBoundaryAtoms(this.atoms, this.boundaryList);
            // get the models, the indices and scales should read from this.models["Ball"]
            let models = {"indices": new Array(boundaryAtoms.getAtomsCount()).fill(0),
                          "scales": new Array(boundaryAtoms.getAtomsCount()).fill(1)};
            // update the models indices and scales
            for (let i = 0; i < boundaryAtoms.getAtomsCount(); i++) {
                models["indices"][i] = this.models["Ball"]["indices"][this.boundaryList[i][0]];
                models["scales"][i] = this.models["Ball"]["scales"][this.boundaryList[i][0]];
            }
            this.boundaryAtomsMesh = drawAtoms(this.tjs.scene, boundaryAtoms, 1, models, this.colorType, this.materialType);
            console.log("boundaryAtomsMesh: ", this.boundaryAtomsMesh)
        }
    }

    drawStick() {
        const offsets = [];
        for (let i = 0; i < this.models["Stick"]["indices"].length; i++) {
            if (this.models["Stick"]["indices"][i] !== 0) {
                offsets.push([i, [0, 0, 0]]);
            }
        }
        // add boundary atoms to offsets
        if (this.boundaryList.length > 0) {
            for (let i = 0; i < this.boundaryList.length; i++) {
                offsets.push(this.boundaryList[i]);
            }
        }
        this.bondList = calculateBonds(this.atoms, offsets);
        drawBonds(this.tjs.scene, this.atoms, this.bondList, this.bondRadius, this.colorType, this.materialType);
    }


    drawPolyhedra() {
        this.bondMap = createBondMapping(this.bondList);
        const polyhedras = filterBondMap(this.bondMap, this.atoms.speciesArray, elementsWithPolyhedra, this.models["Polyhedra"]);
        drawPolyhedra(this.tjs.scene, this.atoms, polyhedras, this.colorType, this.materialType);
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
        // this.tjs.scene.remove(this.selectedAtomsMesh);
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
        // Remove highlighted atom meshes from the selectedAtomsMesh group
        while (this.selectedAtomsMesh.children.length > 0) {
            const child = this.selectedAtomsMesh.children[0]; // Get the first child
            this.selectedAtomsMesh.remove(child); // Remove the child from the group
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
        // TODO: add modelTypes to Atoms's attributes
        // delete the properties, e.g. modelTypes, that are associated with the deleted atoms
        this.modelTypes = this.modelTypes.filter((_, index) => !this.selectedAtoms.has(index));
        // Clear the selection
        this.selectedAtoms.clear();

        // Update the visualization
        this.drawModels(); // Reapply the visualization
        this.clearAtomLabel(); // Clear the atom label
        this.clearHighlight();
    }

    resetSelectedAtomsPositions(initialAtomPositions) {
        this.moveSelectedAtoms(initialAtomPositions, new THREE.Vector3(0, 0, 0));
    }

    moveSelectedAtoms(initialAtomPositions, movementVector) {
        // For example, translating a selected atom
        this.boundaryAtomsMesh.instanceMatrix.needsUpdate = true;
        this.selectedAtoms.forEach((atomIndex) => {
            const initialPosition = initialAtomPositions.get(atomIndex);
            const newPosition = initialPosition.clone().add(movementVector);
            
            // Update the atom position
            const matrix = new THREE.Matrix4();
            this.atomsMesh.getMatrixAt(atomIndex, matrix);
            matrix.setPosition(newPosition);
            this.atomsMesh.setMatrixAt(atomIndex, matrix);
            this.atoms.positions[atomIndex] = [newPosition.x, newPosition.y, newPosition.z];
            // update the boundary atoms
            this.updateBoundaryAtomsMesh(atomIndex);
        });
    
        this.atomsMesh.instanceMatrix.needsUpdate = true;
        this.boundaryAtomsMesh.instanceMatrix.needsUpdate = true;
        
    }

    rotateSelectedAtoms(initialAtomPositions, centroid, rotationMatrix) {
        this.selectedAtoms.forEach((atomIndex) => {
            const newPosition = initialAtomPositions.get(atomIndex).clone();
            // Translate to the centroid, apply rotation, then translate back
            const matrix = new THREE.Matrix4();
            this.atomsMesh.getMatrixAt(atomIndex, matrix);
            newPosition.sub(centroid) // Translate to centroid
                .applyMatrix4(rotationMatrix) // Apply rotation
                .add(centroid); // Translate back
            // Update the position
            matrix.setPosition(newPosition);
            this.atomsMesh.setMatrixAt(atomIndex, matrix);
            // Need to update the atoms.positions array
            this.atoms.positions[atomIndex] = [newPosition.x, newPosition.y, newPosition.z];
            // update the boundary atoms
            this.updateBoundaryAtomsMesh(atomIndex);
        });

        this.atomsMesh.instanceMatrix.needsUpdate = true;
        this.boundaryAtomsMesh.instanceMatrix.needsUpdate = true;
    }

    updateBoundaryAtomsMesh(atomIndex) {
        /* When the atom is moved, the boundary atoms should be moved as well.
        */
        console.log("atomIndex: ", atomIndex)
        if (this.boundaryList.length > 0 && this.boundaryMap[atomIndex]) {
            const atomList = this.boundaryMap[atomIndex];
            // loop all atomList and update the boundary atoms
            atomList.forEach((atom) => {
                const boundaryAtomIndex = atom.index;
                console.log("boundaryAtomIndex: ", boundaryAtomIndex)
                const newPosition = this.atoms.positions[atomIndex].map((value, index) => value + multiplyMatrixVector(this.atoms.cell, atom.offset)[index]);
                // Update the atom position
                const matrix = new THREE.Matrix4();
                this.boundaryAtomsMesh.getMatrixAt(boundaryAtomIndex, matrix);
                matrix.setPosition(new THREE.Vector3(...newPosition));
                console.log("newPosition: ", newPosition)
                this.boundaryAtomsMesh.setMatrixAt(boundaryAtomIndex, matrix);
            });
        }
    }
}

export { AtomsViewer };
