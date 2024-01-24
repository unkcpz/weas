import * as THREE from 'three';
import { CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer.js';
import { GUI } from 'dat.gui'
import { drawUnitCell, drawUnitCellVectors } from './cell.js';
import { drawBonds } from './bond.js';
import { drawAtoms } from './draw_atoms.js';
import { createViewpointButtons } from './viewpoint.js';
import { setupCameraGUI } from './camera.js';
import { clearObjects, createHighlight, getWorldPositionFromScreen } from './utils.js';
import { drawAtomLabels } from './draw_label.js';
import {drawPolyhedra} from './polyhedra.js';
import { covalentRadii } from './atoms_data.js';

class AtomsViewer {
    constructor(tjs, atoms) {
        this.tjs = tjs
        this.atoms = atoms;
        this.uuid = THREE.MathUtils.generateUUID(); // Generate and assign a UUID
        this.atoms.uuid = this.uuid;
        this.selectedAtoms = new Set(); // Store selected atoms
        this.selectedAtomMesh = new THREE.Group(); // Create a group for highlighted atoms
        this.tjs.scene.add(this.selectedAtomMesh); // Add it to the scene
        this.transformMode = null; // 'move' or 'rotate'
        this.mousePosition = new THREE.Vector2();
        this.initialAtomPositions = new Map(); // To store initial positions of selected atoms
        this.backgroundColor = '#ffffff'; // Default background color (white)
        this.init();
    }

    init() {
        this.atomLabels = [];
        this.VIZ_TYPE_MAP = {
            'Ball': 0,
            'Ball + Stick': 1,
            'Polyhedra': 2,
            'Stick': 3,
        };
        this.vizType = 1; // Default viz type
        // vizTypes has the same length of the atoms
        this.vizTypes = new Array(this.atoms.getAtomsCount()).fill(this.vizType);
        this.showCell = true; // Default show cell
        this.labelType = 'none'; // Default label type
        this.atomScale = 0.6; // Default atom scale
        this.bondRadius = 0.1; // Default bond radius
        // Initialize Three.js scene, camera, and renderer
        // GUI
        // Create a div element for the GUI
        const guiContainer = document.createElement('div');
        guiContainer.style.position = 'absolute';
        guiContainer.style.top = '10px';
        guiContainer.style.left = '10px'; // Adjust the position as needed
        this.tjs.containerElement.appendChild(guiContainer);
        // Apply styles to the GUI container

        // Initialize the GUI inside the div element
        const gui = new GUI(); // Create a new dat.GUI instance
        guiContainer.appendChild(gui.domElement);

        // Append the dat.GUI's DOM element to container
        const atomsFolder = gui.addFolder('Atoms');
		atomsFolder.add( {vizType: this.vizType,}, 'vizType', this.VIZ_TYPE_MAP ).onChange( this.drawModel.bind(this) ).name("Model Style");
        // Add Label Type Controller
        atomsFolder.add(this, 'labelType', ['none', 'symbol', 'index']).onChange(this.updateLabels.bind(this)).name('Atom Label');
        // Add Atom Scale Controller
        atomsFolder.add(this, 'atomScale', 0.1, 2.0).onChange(this.updateAtomScale.bind(this)).name('Atom Scale');
        // Add camera controls
        createViewpointButtons(gui, this.tjs.camera)
        setupCameraGUI(gui, this.tjs.camera, this.tjs.scene)
        // Add background color controller
        const backgroundFolder = gui.addFolder('Background');
        backgroundFolder.addColor(this, 'backgroundColor').onChange(color => {
            this.tjs.scene.background = new THREE.Color(color);
        }).name('Color');
        //
        this.selectedAtomSymbolElement = document.createElement('div');
        this.selectedAtomSymbolElement.id = 'selectedAtomSymbol';
        this.tjs.containerElement.appendChild(this.selectedAtomSymbolElement);
        //
        // Add mouse state tracking
        this.isMouseDown = false;
        this.mouseDownPosition = new THREE.Vector2();
        // Bind event handlers
        this.tjs.containerElement.addEventListener('pointerdown', this.onMouseDown.bind(this), false);
        this.tjs.containerElement.addEventListener('pointerup', this.onMouseUp.bind(this), false);
        this.tjs.containerElement.addEventListener('click', this.onMouseClick.bind(this), false);
        // Add event listeners for keypress events
        this.tjs.containerElement.setAttribute('tabindex', '0'); // '0' means it can be focused
        this.tjs.containerElement.addEventListener('keydown', event => {
            if (event.key === 'Delete') {
                this.deleteSelectedAtoms();
            } else if (event.key === 'g') {
                this.enterTransformMode('move', event);
            } else if (event.key === 'r') {
                this.enterTransformMode('rotate', event);
            } else if (event.key === '1') {
                this.tjs.camera.position.set(0, 0, 100); // Example positions
                this.tjs.camera.lookAt(0, 0, 0);
            } else if (event.key === '2') {
                this.tjs.camera.position.set(-100, 0, 0); // Example positions
                this.tjs.camera.lookAt(0, 0, 0);
            } else if (event.key === '3') {
                this.tjs.camera.position.set(0, 100, 0); // Example positions
                this.tjs.camera.lookAt(0, 0, 0);
            }
        });
        this.tjs.containerElement.addEventListener('mousemove', event => {
            this.mousePosition.set(event.clientX, event.clientY);
            if (this.transformMode === 'move') {
                this.moveSelectedAtoms(event);
            } else if (this.transformMode === 'rotate') {
                this.rotateSelectedAtoms(event);
            }
        });
        

        this.drawModel()

        drawAtomLabels(this.tjs.scene, this.atoms, 'none', this.atomLabels);

        // Set camera position
        this.tjs.camera.position.z = 5;
        // Full screen button
        const fullscreenButton = document.createElement('button');
        fullscreenButton.innerHTML = '<i class="fas fa-expand"></i>'; // Font Awesome expand icon
        fullscreenButton.style.position = 'absolute';
        fullscreenButton.style.right = '10px';
        fullscreenButton.style.top = '10px';
        fullscreenButton.style.zIndex = 1000; // Make sure it's above other elements

        // Append the button to the container
        this.tjs.containerElement.appendChild(fullscreenButton);

        // Event listener for the fullscreen button
        fullscreenButton.addEventListener('click', () => {
            if (!document.fullscreenElement) {
                this.tjs.containerElement.requestFullscreen().catch(err => {
                    alert(`Error attempting to enable full-screen mode: ${err.message} (${err.name})`);
                });
                fullscreenButton.innerHTML = '<i class="fas fa-compress"></i>'; // Change to compress icon
            } else {
                document.exitFullscreen();
                fullscreenButton.innerHTML = '<i class="fas fa-expand"></i>'; // Change back to expand icon
            }
        });

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

    onMouseDown(event) {
        this.isMouseDown = true;
        this.mouseDownPosition.set(event.clientX, event.clientY);
    }

    onMouseUp(event) {
        this.isMouseDown = false;
    }

    onMouseClick(event) {
        // Handle mouse click to exit the current transform mode.
        if (this.transformMode) {
            this.transformMode = null;
            this.initialAtomPositions.clear();
            // TODO: This is a temporary solution to fix the issue of intersection not working after moving atoms
            // after moving the atoms, the intersection does not work anymore
            // redraw the model to make it work
            // this is a temporary solution
            // it can also update the bonds, etc
            this.drawModel();
            this.dispatchAtomsUpdated();
        }
        // Calculate the distance the mouse moved
        const dx = event.clientX - this.mouseDownPosition.x;
        const dy = event.clientY - this.mouseDownPosition.y;
        const distanceMoved = Math.sqrt(dx * dx + dy * dy);

        // Check if the mouse was dragged (customize the threshold as needed)
        if (distanceMoved > 5) {
            return; // Ignore clicks that involve dragging
        }

        const raycaster = new THREE.Raycaster();
        const mouse = new THREE.Vector2();

        // Calculate mouse position in normalized device coordinates
        const viewerRect = this.tjs.containerElement.getBoundingClientRect();
        mouse.x = ((event.clientX - viewerRect.left) / viewerRect.width) * 2 - 1;
        mouse.y = -((event.clientY - viewerRect.top) / viewerRect.height) * 2 + 1;
        // Update the picking ray
        raycaster.setFromCamera(mouse, this.tjs.camera);

        // Check for intersections with atom mesh
        // Update the matrix for the instanced mesh
        this.instancedMesh.instanceMatrix.needsUpdate = true;

        // Optionally, update the matrixWorld if it's been changed
        this.instancedMesh.updateMatrixWorld();

        const intersects = raycaster.intersectObject(this.instancedMesh);
        // Check if there are intersections
        if (intersects.length > 0) {
            // Get the first intersected object (atom)
            const selectedObject = intersects[0].object;

            // Check if the selected object is an atom
            if (selectedObject.userData && selectedObject.userData.type === 'atom') {
                // Get the instance index of the selected atom
                const instanceIndex = intersects[0].instanceId;
                if (this.selectedAtoms.has(instanceIndex)) {
                    // If the atom is already selected, skip
                    return;
                }
                // Add the instance index to the selectedAtoms set
                this.selectedAtoms.add(instanceIndex);

                // Get the position of the selected atom in the 3D space
                const matrix = new THREE.Matrix4();
                selectedObject.getMatrixAt(instanceIndex, matrix);
                const position = new THREE.Vector3();
                const quaternion = new THREE.Quaternion();
                const scale = new THREE.Vector3();
                matrix.decompose(position, quaternion, scale);
                // Display the symbol of the atom on top of it
                this.createAtomLabel(this.atoms.species[this.atoms.speciesArray[instanceIndex]].symbol, position);

                // Create a new mesh for the highlighted atom
                const highlightedAtomMesh = createHighlight(position, scale)
                // Add the highlighted atom mesh to the selectedAtomMesh group
                this.selectedAtomMesh.add(highlightedAtomMesh);
            } else {
                // Clear the HTML element when nothing is selected
                this.clearAtomLabel();
                this.selectedAtoms.clear();
                this.clearHighlight();
            }
        } else {
            // Clear the HTML element when nothing is selected
            this.clearAtomLabel();
            this.selectedAtoms.clear();
            this.clearHighlight();
        }
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


    createAtomLabel(symbol, position) {
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
        this.label.element.style.color = 'white';
        // label.element.style.fontSize = '14px';

        // Add the label to the scene
        this.tjs.scene.add(this.label);
    }

    updateLabels(value) {
        // Handle the logic to draw labels based on the selected option
        if (value === 'none') {
            this.atomLabels = drawAtomLabels(this.tjs.scene, this.atoms, 'none', this.atomLabels);
            // Remove labels
        } else if (value === 'symbol') {
            // Draw labels with symbols
            this.atomLabels = drawAtomLabels(this.tjs.scene, this.atoms, 'symbol', this.atomLabels);
        } else if (value === 'index') {
            // Draw labels with indices
            this.atomLabels = drawAtomLabels(this.tjs.scene, this.atoms, 'index', this.atomLabels);
        }
    }

    drawModel( vizType=null ) {
        this.dispose();
        if ( vizType !== null ) {
            if (this.selectedAtoms.size > 0) {
                this.selectedAtoms.forEach((atomIndex) => {
                    this.vizTypes[atomIndex] = parseInt(vizType);
                });
            } else {
                this.vizType = parseInt(vizType);
                this.vizTypes = new Array(this.atoms.getAtomsCount()).fill(this.vizType);
            }
        }
        if (this.showCell) {
            drawUnitCell(this.tjs.scene, this.atoms);
            drawUnitCellVectors(this.tjs.scene, this.atoms.cell, this.tjs.camera);
        }
        this.instancedMesh = drawAtoms(this.tjs.scene, this.atoms, 1, this.vizTypes);
        if ( this.vizType === 1 ){
            this.instancedMesh = drawAtoms(this.tjs.scene, this.atoms, 1, this.vizTypes);
            drawBonds(this.tjs.scene, this.atoms, this.bondRadius, this.vizTypes);
        }
        else if ( this.vizType === 2 ){
            this.instancedMesh = drawAtoms(this.tjs.scene, this.atoms, 1, this.vizTypes);
            drawBonds(this.tjs.scene, this.atoms, this.bondRadius, this.vizTypes);
            drawPolyhedra(this.tjs.scene, this.atoms);
        }
        else if ( this.vizType === 3 ){
            drawBonds(this.tjs.scene, this.atoms, this.bondRadius, this.vizTypes);
        }

    }

    // Method to update the scale of atoms
    updateAtomScale() {
        const position = new THREE.Vector3();
        const rotation = new THREE.Quaternion();
        const scale = new THREE.Vector3();

        let mesh = this.instancedMesh
        for (let i = 0; i < mesh.count; i++) {
            const instanceMatrix = new THREE.Matrix4();
            const radius = covalentRadii[this.atoms.speciesArray[i]] || 1;
            mesh.getMatrixAt(i, instanceMatrix); // Get the original matrix of the instance
            // Decompose the original matrix into its components
            instanceMatrix.decompose(position, rotation, scale);
            // Set the scale to the new value
            scale.set(radius*this.atomScale, radius*this.atomScale, radius*this.atomScale);
            // Recompose the matrix with the new scale
            instanceMatrix.compose(position, rotation, scale);
            mesh.setMatrixAt(i, instanceMatrix);
        }
        mesh.instanceMatrix.needsUpdate = true;
        // Re-render the scene if necessary
    }

    // Method to delete selected atoms
    deleteSelectedAtoms() {
        // Remove the selected atoms from the scene and data
        this.atoms.deleteAtoms(Array.from(this.selectedAtoms));
        // Clear the selection
        this.selectedAtoms.clear();

        // Update the visualization
        this.drawModel(this.vizType); // Reapply the visualization
        this.clearAtomLabel(); // Clear the atom label
        this.clearHighlight();
        this.dispatchAtomsUpdated();
    }

    enterTransformMode(mode, event) {
        this.transformMode = mode;
        this.initialMousePosition = this.mousePosition.clone();
        this.storeInitialAtomPositions();
    }

    storeInitialAtomPositions() {
        this.selectedAtoms.forEach((atomIndex) => {
            const matrix = new THREE.Matrix4();
            this.instancedMesh.getMatrixAt(atomIndex, matrix);
            const position = new THREE.Vector3();
            matrix.decompose(position, new THREE.Quaternion(), new THREE.Vector3());
            this.initialAtomPositions.set(atomIndex, position.clone());
        });
    }

    moveSelectedAtoms(event) {
        const movementPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
        // Get the camera's forward direction (negative z-axis in world space)
        const cameraDirection = new THREE.Vector3(0, 0, -1);
        cameraDirection.applyQuaternion(this.tjs.camera.quaternion);
        // Update the plane's normal
        movementPlane.normal.copy(cameraDirection);
        const currentWorldPosition = getWorldPositionFromScreen(event.clientX, event.clientY, this.tjs.camera, movementPlane);
        const initialWorldPosition = getWorldPositionFromScreen(this.initialMousePosition.x, this.initialMousePosition.y, this.tjs.camera, movementPlane);

        const movementVector = currentWorldPosition.sub(initialWorldPosition);

        // Apply movementVector to your object
        // For example, translating a selected atom
        this.selectedAtoms.forEach((atomIndex) => {
            const initialPosition = this.initialAtomPositions.get(atomIndex);
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

    rotateSelectedAtoms(event) {
        // Calculate the centroid of the selected atoms
        let centroid = new THREE.Vector3(0, 0, 0);
        this.selectedAtoms.forEach((atomIndex) => {
            centroid.add(this.initialAtomPositions.get(atomIndex));
        });
        centroid.divideScalar(this.selectedAtoms.size);

        // Project the centroid to 2D screen space
        const centroidScreen = centroid.clone().project(this.tjs.camera);

        // Calculate normalized device coordinates of centroid, initial, and new mouse positions
        const centroidNDC = new THREE.Vector2(centroidScreen.x, centroidScreen.y);
        
        const initialNDC = new THREE.Vector2(
            (this.initialMousePosition.x / this.tjs.containerElement.clientWidth) * 2 - 1,
            -(this.initialMousePosition.y / this.tjs.containerElement.clientHeight) * 2 + 1
        );
        const newNDC = new THREE.Vector2(
            (event.clientX / this.tjs.containerElement.clientWidth) * 2 - 1,
            -(event.clientY / this.tjs.containerElement.clientHeight) * 2 + 1
        );
        // Calculate vectors from centroidNDC to initialNDC and newNDC
        const vectorToInitial = new THREE.Vector2().subVectors(initialNDC, centroidNDC);
        const vectorToNew = new THREE.Vector2().subVectors(newNDC, centroidNDC);

        // Normalize the vectors
        vectorToInitial.normalize();
        vectorToNew.normalize();

        // Calculate the angle between the vectors
        let rotationAngle = Math.acos(vectorToInitial.dot(vectorToNew));

        // Determine the direction of rotation (clockwise or counterclockwise)
        // Use the cross product (in 2D space, this is essentially the z-component of the cross product)
        const crossProductZ = vectorToInitial.x * vectorToNew.y - vectorToInitial.y * vectorToNew.x;
        if (crossProductZ < 0) {
            rotationAngle = -rotationAngle; // Rotate in the opposite direction
        }


        // Get the camera's forward direction (negative z-axis in world space)
        const cameraDirection = new THREE.Vector3(0, 0, -1);
        cameraDirection.applyQuaternion(this.tjs.camera.quaternion);
    
        // Create a rotation matrix around the camera direction
        const rotationMatrix = new THREE.Matrix4().makeRotationAxis(cameraDirection, -rotationAngle);
    
        this.selectedAtoms.forEach((atomIndex) => {
            const newPosition = this.initialAtomPositions.get(atomIndex).clone();
            // Translate to the centroid, apply rotation, then translate back
            const matrix = new THREE.Matrix4();
            this.instancedMesh.getMatrixAt(atomIndex, matrix);
            newPosition.sub(centroid) // Translate to centroid
                   .applyMatrix4(rotationMatrix) // Apply rotation
                   .add(centroid); // Translate back
    
            // Update the position
            matrix.setPosition(newPosition);
            this.instancedMesh.setMatrixAt(atomIndex, matrix);
    
            // If you need to update the atoms.positions array
            this.atoms.positions[atomIndex] = [newPosition.x, newPosition.y, newPosition.z];
        });
    
        this.instancedMesh.instanceMatrix.needsUpdate = true;
    }
    
    
    

    // Call this method after updating atoms
    dispatchAtomsUpdated() {
        const event = new CustomEvent('atomsUpdated', { detail: this.atoms });
        this.tjs.containerElement.dispatchEvent(event);
    }
    
}

export {AtomsViewer};
